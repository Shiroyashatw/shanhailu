/* 《山海錄》時間骨幹（DEV-TIME；依據 docs/specs/SPEC-TIME.md v0.5 第 2–4、8、9 節）
 * 這裡只放「不碰遊戲狀態」的純函式、事件匯流排與修正器：
 *   曆法（minOfDay／phaseOf／dayOf／seasonOf／dayOfSeason／dayOfYear／yearOf）、
 *   天候（weatherAt，種子由呼叫端傳入，不吃 S.rng）、換季寒意基準 sEff、營業時段判定、
 *   Time.on(event, fn)／Time.emit、Time.mod(kind, fn)。
 * 切片結算（passTime）要改 S，放在 game.js；game.js 一律呼叫這裡，不另寫第二份鐘點或天氣邏輯。
 */
'use strict';

window.SHL_TIME = (function () {
  const D = window.SHL_DATA;
  const T = D.TIME;

  // ================= 曆法（2.2、2.3） =================
  function minOfDay(t) { return ((t % 1440) + 1440) % 1440; }
  function phaseOf(t) {
    const m = minOfDay(t);
    return m >= 300 && m < 480 ? 'dawn' : m >= 480 && m < 1020 ? 'day' : m >= 1020 && m < 1200 ? 'dusk' : 'night';
  }
  function dayOf(t) { return Math.floor(t / 1440) + 1; }
  function seasonOf(t) { return Math.floor((dayOf(t) - 1) / T.SEASON_DAYS) % 4; }
  function dayOfSeason(t) { return ((dayOf(t) - 1) % T.SEASON_DAYS) + 1; }
  function dayOfYear(t) { return ((dayOf(t) - 1) % T.YEAR_DAYS) + 1; }
  function yearOf(t) { return Math.floor((dayOf(t) - 1) / T.YEAR_DAYS); }

  // 4 換季過渡：每季第 26–30 日 S_eff = floor((S_cur + S_next)/2 + 0.5)；其餘 S_cur
  function sEff(t) {
    const s = seasonOf(t), cur = T.SEASON_COLD[s];
    if (dayOfSeason(t) < T.EVE_DAY) return cur;
    return Math.floor((cur + T.SEASON_COLD[(s + 1) % 4]) / 2 + 0.5);
  }

  // ================= 天候（3.2） =================
  // 天候日從 05:00 起算（向負無限取整）：00:00–05:00 仍屬前一個天候日
  function wdayOf(t) { return Math.floor((t - T.WX_DAY_START) / 1440); }
  // mulberry32(seed ⊕ imul(wday, 0x9E3779B1)) 的第一個輸出 ÷ 2^32；與 S.rng 完全無關
  function hash01(seed, wday) {
    let a = ((seed >>> 0) ^ Math.imul(wday | 0, 0x9e3779b1)) >>> 0;
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // 該天候日的「基底天候」（霧日在 10:00 後由 weatherAt 回傳晴）
  function weatherBase(seed, wday) {
    if (wday === 0) return 'clear'; // B8：開局那一天固定晴
    const season = (((Math.floor(wday / T.SEASON_DAYS)) % 4) + 4) % 4;
    const ctx = { wday, season };
    const w = T.WX_WEIGHT[season].map((x, i) => x * modMul('wxWeight', Object.assign({ wx: T.WX_ORDER[i] }, ctx)));
    const tot = w.reduce((a, b) => a + b, 0);
    const u = hash01(seed, wday) * tot;
    let acc = 0;
    for (let i = 0; i < w.length; i++) { acc += w[i]; if (u < acc) return T.WX_ORDER[i]; }
    // 只有浮點誤差會走到這裡：取最後一個權重 > 0 的天候
    for (let i = w.length - 1; i >= 0; i--) if (w[i] > 0) return T.WX_ORDER[i];
    return 'clear';
  }
  // 純函式：同種子、同時刻必回同值；不存檔、不改任何狀態
  function weatherAt(seed, t) {
    const base = weatherBase(seed, wdayOf(t));
    if (base !== 'fog') return base;
    const m = minOfDay(t);
    return m >= T.WX_DAY_START && m < T.FOG_END ? 'fog' : 'clear';
  }

  // ================= 營業（8.1） =================
  // 回傳 [開, 關]（分鐘）；24 小時營業回傳 null
  function hoursOf(B) { if (!B) return null; return B.hours || T.HOURS[B.type] || null; }
  // 基本判定：minOfDay 落在 [開, 關)；跨午夜用 m ≥ 開 || m < 關
  function inHours(h, t) {
    if (!h) return true;
    const m = minOfDay(t), o = h[0], c = h[1];
    return o <= c ? m >= o && m < c : m >= o || m < c;
  }

  // ================= 事件（9.1） =================
  const subs = {};
  function on(ev, fn) { (subs[ev] = subs[ev] || []).push(fn); return fn; }
  function off(ev, fn) { if (subs[ev]) subs[ev] = subs[ev].filter((f) => f !== fn); }
  // 同一事件按註冊順序呼叫；v0.1 處理器不得中斷 passTime（例外只記在主控台，不往外丟）
  function emit(ev, data) {
    (subs[ev] || []).slice().forEach((f) => { try { f(data, ev); } catch (e) { console.error('[Time.on ' + ev + ']', e); } });
  }

  // ================= 修正器（9.2） =================
  // 純函式，回傳值疊加：加法類相加、乘法類相乘；shopHours 為覆寫類（後註冊者優先，回傳 undefined 表示不覆寫）
  const mods = {};
  function mod(kind, fn) { (mods[kind] = mods[kind] || []).push(fn); return fn; }
  function unmod(kind, fn) { if (mods[kind]) mods[kind] = mods[kind].filter((f) => f !== fn); }
  function modMul(kind, ctx) { let v = 1; (mods[kind] || []).forEach((f) => { const r = f(ctx); if (typeof r === 'number') v *= r; }); return v; }
  function modAdd(kind, ctx) { let v = 0; (mods[kind] || []).forEach((f) => { const r = f(ctx); if (typeof r === 'number') v += r; }); return v; }
  function modOverride(kind, ctx) { let v; (mods[kind] || []).forEach((f) => { const r = f(ctx); if (r !== undefined) v = r; }); return v; }
  function hasMods(kind) { return !!(mods[kind] && mods[kind].length); }

  return { minOfDay, phaseOf, dayOf, seasonOf, dayOfSeason, dayOfYear, yearOf, sEff, wdayOf, hash01, weatherBase, weatherAt, hoursOf, inHours,
    on, off, emit, mod, unmod, modMul, modAdd, modOverride, hasMods };
})();
