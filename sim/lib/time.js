'use strict';
/* SPEC-TIME v0.2：時間、時段、天候、遇險、生存。公式全部照任務書「共通公式」。 */
const { mulberry32, clamp } = require('./util');

const DAY_START = 480; // 第 1 日 08:00（game.js:8）
const minOfDay = (t) => ((t % 1440) + 1440) % 1440;
function phaseOf(t) { const m = minOfDay(t); return m >= 300 && m < 480 ? 'dawn' : m >= 480 && m < 1020 ? 'day' : m >= 1020 && m < 1200 ? 'dusk' : 'night'; }
const dayOf = (t) => Math.floor(t / 1440) + 1;
const seasonOf = (t) => Math.floor((dayOf(t) - 1) / 30) % 4;
const dayOfSeason = (t) => ((dayOf(t) - 1) % 30) + 1;
const wdayOf = (t) => Math.floor((t - 300) / 1440);
const W_NIGHT = { dawn: 0.25, day: 0, dusk: 0.5, night: 1.0 };
const WX = ['sun', 'rain', 'fog', 'snow'];
const WX_WEIGHT = [[50, 35, 15, 0], [65, 30, 5, 0], [55, 20, 25, 0], [45, 0, 15, 40]];
const WX_RISK = { sun: 1.0, rain: 1.1, fog: 1.2, snow: 1.15 };
// 當日抽到的天候（不看時刻）
function weatherOfWday(seed, wday) {
  if (wday === 0) return 'sun';
  const u = mulberry32(((seed >>> 0) ^ Math.imul(wday, 0x9e3779b1)) >>> 0)();
  const w = WX_WEIGHT[((Math.floor(wday / 30) % 4) + 4) % 4];
  let r = u * 100;
  for (let i = 0; i < 4; i++) { r -= w[i]; if (r < 0) return WX[i]; }
  return 'sun';
}
// 某一刻實際的天候：霧只在 05:00–10:00 回傳霧，其餘回晴
function weatherAt(seed, t, forced) {
  const wx = forced || weatherOfWday(seed, wdayOf(t));
  if (wx === 'fog') { const m = minOfDay(t); return m >= 300 && m < 600 ? 'fog' : 'sun'; }
  return wx;
}
// 逐整點切片：回傳 [{t0,t1}]（分鐘），切在整點
function slices(t0, t1) {
  const out = []; let t = t0;
  while (t < t1) { const n = Math.min(t1, (Math.floor(t / 60) + 1) * 60); out.push({ t0: t, t1: n }); t = n; }
  return out;
}
// 行走期間 mean(w)（切片分鐘加權）與最大天候倍率
function walkStats(seed, t0, hours, forcedWx) {
  let sw = 0, tot = 0, wx = 1;
  for (const s of slices(t0, t0 + Math.round(hours * 60))) {
    const d = s.t1 - s.t0; sw += W_NIGHT[phaseOf(s.t0)] * d; tot += d;
    wx = Math.max(wx, WX_RISK[weatherAt(seed, s.t0, forcedWx)]);
  }
  return { meanW: tot ? sw / tot : 0, wxRisk: wx };
}
const R_road = (Obar) => clamp(1 - 0.015 * (Obar - 57.5), 0.5, 1.5);
const R_wild = (B, Obar) => clamp(1 + 0.012 * (B - 30) - 0.010 * (Obar - 57.5), 0.5, 1.8);
/* 新規則遇險（全批唯一封頂 0.85）。o: {base,R,meanW,wxRisk,over,jiao,tide} */
function riskNew(o) {
  const raw = o.base * (o.R === undefined ? 1 : o.R) * (1 + o.meanW) * (o.wxRisk || 1) * (o.over ? 1.4 : 1) * (o.jiao ? 0.8 : 1) * (o.tide ? 1.5 : 1);
  return { raw, risk: Math.min(0.85, raw) };
}
// 舊規則（game.js:644-649）：出發當下黑夜（hour>=20 或 <5，game.js:40）×2，不封頂；無 R、無天候
function isNightOld(t) { const h = Math.floor(minOfDay(t) / 60); return h >= 20 || h < 5; }
function riskOld(o) { return o.base * (isNightOld(o.t0) ? 2 : 1) * (o.over ? 1.4 : 1) * (o.jiao ? 0.8 : 1) * (o.tide ? 1.5 : 1); }
// 路線 base：官道 0.04、野徑單段 0.22、多段野徑 0.30（game.js:644）
function baseRisk(edges) { const wild = edges.some((e) => !e.road); return wild ? (edges.length > 1 ? 0.3 : 0.22) : 0.04; }
// 速度與時數（game.js:637：整條路線 base 加總後取 ceil）
function snowMult(edge, wx) { return wx === 'snow' ? (edge.road ? 0.925 : 0.85) : 1; }
function routeHours(edges, speed, wx, half) {
  let need = 0; edges.forEach((e) => (need += e.h / (speed * snowMult(e, wx))));
  need = Math.round(need * 1e9) / 1e9;
  return half ? Math.max(0.5, Math.ceil(2 * need) / 2) : Math.max(1, Math.ceil(need));
}
// 歇息起床
function wakeNew(now) { let n8 = Math.floor(now / 1440) * 1440 + 480; if (n8 < now) n8 += 1440; return Math.max(now + 360, n8); }
function wakeOld(now) { return dayOf(now) * 1440 + 480; } // game.js:799（第 800 行的「不足 6h 再加一天」在此式下永遠不成立）
// 營業（分鐘）；close 可覆寫 market/apoth/smith 的關門時刻
const SHOP_HOURS = { market: [420, 1140], apoth: [420, 1140], smith: [420, 1140], tea: [300, 1200], drill: [300, 1200], board: [480, 1020] };
function shopOpen(type, t, closeOverride) {
  const h = SHOP_HOURS[type]; if (!h) return true;
  const m = minOfDay(t); const close = closeOverride && (type === 'market' || type === 'apoth' || type === 'smith') ? closeOverride : h[1];
  return m >= h[0] && m < close;
}

/* ---------------- 生存（SPEC-TIME 6） ----------------
 * 以 1 分鐘為步長積分（與「逐整點切片」等價：每小時速率由該分鐘所在整點的時段／天候決定；
 * 階段門檻逐分鐘判定，才能重現手算的 04:34／12:45）。 */
const S_BASE = [0, -2, 1, 3], P_COLD = { dawn: 1, day: -1, dusk: 0, night: 2 }, W_COLD = { sun: 0, rain: 1, fog: 0, snow: 2 };
function seasonCold(t) {
  const s = seasonOf(t), d = dayOfSeason(t);
  if (d >= 26) return Math.floor((S_BASE[s] + S_BASE[(s + 1) % 4]) / 2 + 0.5);
  return S_BASE[s];
}
function newBody(o) { return Object.assign({ food: 80, fat: 10, cold: 0, hp: 80, maxHp: 80, warm: 0, coldOffset: 0, dead: false, cause: '', onlyCold: false, tFirst: {}, minFood: 80, maxCold: 0, maxFat: 10, minHp: 80 }, o || {}); }
/* 推進 mins 分鐘。ctx: {seed, place:'wild'|'street'|'indoor'|'fire', act:'awake'|'inn'|'camp', fatRate(每小時，預設 2), forcedWx, sleepGuard} */
function advance(b, t, mins, ctx) {
  for (let i = 0; i < mins && !b.dead; i++, t++) {
    const dt = 1 / 60, winter = seasonOf(t) === 3 ? 1.25 : 1;
    const wx = weatherAt(ctx.seed, t, ctx.forcedWx), ph = phaseOf(t);
    // 寒意
    let dc;
    if (ctx.act === 'inn' || ctx.place === 'indoor') dc = -6;
    else if (ctx.place === 'street') dc = -3;
    else if (ctx.place === 'fire') dc = wx === 'rain' || wx === 'snow' ? -2 : -4;
    else dc = Math.max(0, seasonCold(t) + P_COLD[ph] + W_COLD[wx] + b.coldOffset - Math.min(4, b.warm));
    const coldPrev = b.cold;
    b.cold = clamp(b.cold + dc * dt, 0, 100);
    if (!b.onlyCold) {
      const fr = ctx.act === 'inn' ? 1.25 : ctx.act === 'camp' ? 2 : 4;
      b.food = clamp(b.food - fr * winter * dt, 0, 100);
      if (ctx.act === 'awake') { const f = ctx.fatRate === undefined ? 2 : ctx.fatRate; b.fat = clamp(b.fat + (f > 0 && b.cold >= 30 ? f * 1.2 : f) * dt, 0, 100); }
    }
    // 扣血（合計上限 6/h）與自然回復
    let loss = 0;
    if (!b.onlyCold && b.food <= 0) loss += 3;
    if (!b.onlyCold && b.fat >= 100) loss += 2;
    if (b.cold >= 100) loss += 3; else if (b.cold >= 90) loss += 1;
    loss = Math.min(6, loss);
    if (loss > 0) { b.hp -= loss * dt; if (ctx.sleepGuard && b.hp < 1) b.hp = 1; }
    else if ((b.onlyCold || b.food >= 30) && b.cold < 60) b.hp = Math.min(b.maxHp, b.hp + 1 * dt);
    // 紀錄
    const mark = (k, c) => { if (c && b.tFirst[k] === undefined) b.tFirst[k] = t + 1; };
    // 寒意門檻：線性內插出跨越時刻後取整分鐘（向下）
    const markC = (k, thr) => { if (b.tFirst[k] === undefined && b.cold >= thr - 1e-9) { const f = b.cold > coldPrev ? (thr - coldPrev) / (b.cold - coldPrev) : 1; b.tFirst[k] = f >= 1 - 1e-6 ? t + 1 : t; } };
    markC('cold30', 30); markC('cold60', 60); markC('cold90', 90); markC('cold100', 100);
    mark('food30', b.food < 30); mark('food20', b.food < 20); mark('food0', b.food <= 0); mark('fat80', b.fat >= 80);
    if (b.food < b.minFood) b.minFood = b.food; if (b.cold > b.maxCold) b.maxCold = b.cold; if (b.fat > b.maxFat) b.maxFat = b.fat; if (b.hp < b.minHp) b.minHp = b.hp;
    if (b.hp <= 1e-9) { b.dead = true; b.hp = 0; b.tFirst.dead = t + 1; b.cause = b.cold >= 90 ? '凍死' : b.food <= 0 ? '餓死' : '力竭'; }
  }
  return t;
}
function eat(b, n) { b.food = clamp(b.food + n, 0, 100); }
function innWake(b) { b.fat = 0; b.cold = 0; }
const fmtClock = (t) => { const m = minOfDay(t); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const fmtT = (t) => '第' + dayOf(t) + '日 ' + fmtClock(t);

module.exports = { DAY_START, minOfDay, phaseOf, dayOf, seasonOf, dayOfSeason, wdayOf, W_NIGHT, WX, WX_WEIGHT, WX_RISK, weatherOfWday, weatherAt, slices, walkStats, R_road, R_wild, riskNew, riskOld, isNightOld, baseRisk, snowMult, routeHours, wakeNew, wakeOld, SHOP_HOURS, shopOpen, seasonCold, newBody, advance, eat, innWake, fmtClock, fmtT };
