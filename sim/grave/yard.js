'use strict';
/* E3／E5／E6 亂墳 Monte Carlo：破曉營為據點，窯外墳場（亂葬古窯子場景）。規則照 SPEC-GRAVE v0.1 G1–G6；建模選擇見 evidence/grave-econ-assumptions.md。
 * 世界（墳、陪葬、新墳、夜巡窗）一律用 wrnd(seed, tag, …)（不吃玩家亂數）；玩家亂數 prng(seed, 'grave:'+策略)；戰鬥用 game.js 的 S.rng（setupPlayer 種子 50000+1000×k+seed）。
 * 所有時間都是 30 分鐘的倍數，λ 以 30 分鐘切片累乘（與逐整點切片等價：λ 只在整點變）。 */
const { U, g, writeCsv, r2, PRICE, M_FERRY, POT } = require('./common');
const T = require('../lib/time');
const GZ = require('./guzhong');
const { wrnd, prng, clamp } = U;
const R_WILD = GZ.R_WILD;
const CAPK = (K) => (K < 0 ? 0.25 : K < 30 ? 1.2 : K < 100 ? 0.5 : 0.25); // 日常善上限（sim/items/K1.js capOf）
/* ---------- 墳 ---------- */
const TYPES = { N: { name: '無名碑', T: 1.0, slots: 3, mark: 'tomb', kin: false, nameless: true, tab: 'N' }, Hw: { name: '手寫碑', T: 1.0, slots: 3, mark: 'tomb', kin: false, tab: 'Hw' }, K: { name: '手寫碑遺屬在世', T: 1.5, slots: 3, mark: 'family', kin: true, tab: 'Hw' }, C: { name: '孩童墓', T: 2.0, slots: 2, mark: 'tomb', kin: false, tab: 'C' }, New: { name: '新墳', T: 1.5, slots: 3, mark: 'family', kin: true, tab: 'Hw' } };
function rollSlot(tab, u, u2) {
  if (tab === 'N') return u < 0.40 ? { k: 'coin', v: 4 + Math.floor(u2 * 7) } : u < 0.90 ? { k: 'lo' } : { k: 'tag' };
  if (tab === 'Hw') return u < 0.35 ? { k: 'coin', v: 5 + Math.floor(u2 * 9) } : u < 0.70 ? { k: 'lo' } : u < 0.95 ? { k: 'mid' } : { k: 'tag' };
  return u < 0.60 ? { k: 'coin', v: 1 + Math.floor(u2 * 3) } : { k: 'lo' }; // C
}
function mkGrave(seed, id, type, created) {
  const ty = TYPES[type]; const slots = [];
  for (let s = 0; s < ty.slots; s++) slots.push(rollSlot(ty.tab, wrnd(seed, 'grave-slot', id, s), wrnd(seed, 'grave-coin', id, s)));
  return { id, type, created, slots, opened: 0, kinLater: type === 'New' ? wrnd(seed, 'newgrave-kin', id, 0) < 0.6 : false };
}
function initGraves(seed) {
  const L = []; let id = 0;
  [['N', 10], ['Hw', 2], ['K', 2], ['C', 2]].forEach(([t, n]) => { for (let i = 0; i < n; i++) L.push(mkGrave(seed, id++, t, 0)); });
  return L;
}
function graveAttr(gr, day) { // 回傳 {T, mark, kinLam, nameless, maxTake}
  if (gr.type !== 'New') { const ty = TYPES[gr.type]; return { T: ty.T, mark: ty.mark, kinLam: ty.kin, nameless: !!ty.nameless, maxTake: ty.slots === 2 ? 2 : 3 }; }
  const age = day - gr.created; if (age <= 10 || gr.kinLater) return { T: 1.5, mark: 'family', kinLam: true, nameless: false, maxTake: 3 };
  return { T: 1.0, mark: 'tomb', kinLam: false, nameless: false, maxTake: 3 };
}
// 挖墳先後（假設）：手寫碑 → 無名碑 → 孩童墓 → 遺屬墳 → 新墳（先舊後新）
const ORDER = { Hw: 0, N: 1, C: 2, K: 3, New: 4 };
/* ---------- 夜巡窗與 λ ---------- */
function windows(seed, nightDay) { // 第 nightDay 日 20:00 起的那一夜；回傳絕對分鐘區間
  const base = (nightDay - 1) * 1440;
  const w1 = wrnd(seed, 'patrol', nightDay, 0) < 0.5 ? 21 : 22, w2 = wrnd(seed, 'patrol', nightDay, 1) < 0.5 ? 25 : 26;
  return [[base + w1 * 60, base + w1 * 60 + 60], [base + w2 * 60, base + w2 * 60 + 60]];
}
function nightDayOf(t) { const m = T.minOfDay(t); const d = T.dayOf(t); return m < 300 ? d - 1 : d; } // 05:00 前屬前一夜
function inWin(seed, t) { const w = windows(seed, nightDayOf(t)); return w.some(([a, b]) => t >= a && t < b); }
function baseLam(seed, t, kinLam, bribed) {
  const h = Math.floor(T.minOfDay(t) / 60);
  if (h >= 8 && h < 17) return 0.18;
  if ((h >= 5 && h < 8) || (h >= 17 && h < 20)) return 0.12 + (kinLam ? 0.10 : 0);
  if (inWin(seed, t)) return bribed ? 0.01 : 0.26;
  return 0.01;
}
const WXL = { rain: 0.8, fog: 0.7, sun: 1, snow: 1 };
/* segs: [{t0, t1, mult}]；回傳 P＝1−Π(1−λ)^h；o.noWx 給回歸用 */
function witnessP(seed, segs, kinLam, alert, o) {
  o = o || {}; let logS = 0;
  segs.forEach((s) => { for (let t = s.t0; t < s.t1; t += 30) {
    let lam = baseLam(seed, t, kinLam, o.bribed) * s.mult * (alert ? 1.5 : 1);
    if (!o.noWx) lam *= WXL[T.weatherAt(seed, t, o.forcedWx)] || 1;
    lam = Math.min(1, lam); logS += Math.log(1 - lam) * 0.5; } });
  return 1 - Math.exp(logS);
}
/* ---------- 策略 ---------- */
const STRATS = {
  night_probe: { name: '黑夜探過避窗', bs: 20 * 60, be: 29 * 60, probe: true },
  night_blind: { name: '黑夜不探', bs: 20 * 60, be: 29 * 60, probe: false },
  day: { name: '白天', bs: 8 * 60, be: 17 * 60, probe: false, spill: 30 },
  dusk: { name: '黃昏', bs: 17 * 60, be: 20 * 60, probe: false, spill: 30 },
};
const HAND = { night_probe: 0.030, night_blind: 0.214, day: 0.449, dayQuick: 0.480, dusk: 0.319, duskKin: 0.525 };
function digH(seed, t, kuang, tool) {
  const season = T.seasonOf(t) === 3 ? 1.5 : 1; const w = T.weatherAt(seed, t); const wx = w === 'rain' ? 1.2 : 1;
  const raw = 2.0 * tool * season * wx * (1 - 0.004 * kuang); return Math.max(1.0, Math.ceil(raw * 2 - 1e-9) / 2);
}
/* ---------- 一個 seed ---------- */
function runSeed(seed, sk, method, take, tpl, kk, days, opts) {
  opts = opts || {};
  const ST = STRATS[sk]; const r = prng(seed, 'grave:' + sk + ':' + method + ':' + take);
  g.setupPlayer(50000 + 1000 * kk + seed, tpl); const { G } = g.inst(); const S = G.state;
  S.silver = 60; // 平民起始 60（data.js drifter）
  const graves = initGraves(seed); let nextId = 100;
  const tool = 1; S.silver -= 20; // 開局買鏟（20 兩），TOOL＝1.0
  const st = { K: 0, Kret: 0, W1: 0, W2: 0, pendW: {}, minK: 0, maxW1: 0, maxW2: 0, firstW20_1: null, firstW20_2: null, firstW20_alt: null, kinFeud: 0, feudRet: 0, k30: null, k100: null, k30ret: null, opened: 0, origLeft: 16, exhaustDay: null, retDayGain: {}, deaths: null };
  const inv = []; // {v (行情，已含損壞), mark}
  const log = { graves: [], outings: [], days: Array(days + 1).fill(null), corruptGain: 0, cleanse: 0, corpseFights: 0, corpseWins: 0, corpseDeaths: 0, walkFights: 0, heal: 0, potsBought: 0, onsiteH: 0, walkH: 0, sellH: 0, serviceH: 0, sales: 0, saleTx: 0, coin: 0, idleDays: 0, newGraves: 0, sellTrips: 0, value65: 0, valueByDay: Array(days + 2).fill(0), costByDay: Array(days + 2).fill(0), traj: [], sells: [] };
  let t = T.DAY_START; let dayDone = 1; // 已處理到第 dayDone 日的 00:00
  const spend = (x, d) => { S.silver -= x; log.costByDay[Math.min(days + 1, d || T.dayOf(t))] += x; };
  function midnight(d) { // 第 d 日 00:00
    snap(d);
    st.W1 = Math.max(0, st.W1 - 1.5); st.W2 = Math.max(0, st.W2 - 0.75);
    const add = st.pendW[d] || 0; st.W1 = Math.min(49, st.W1 + add); st.W2 = Math.min(49, st.W2 + add);
    if (st.W1 > st.maxW1) st.maxW1 = st.W1; if (st.W2 > st.maxW2) st.maxW2 = st.W2;
    if (st.W1 >= 20 && st.firstW20_1 === null) st.firstW20_1 = d; if (st.W2 >= 20 && st.firstW20_2 === null) st.firstW20_2 = d;
    const openNew = graves.filter((x) => x.type === 'New' && x.slots.length).length;
    if (wrnd(seed, 'newgrave', d, 0) < 0.15 && openNew < 4) { graves.push(mkGrave(seed, nextId++, 'New', d)); log.newGraves++; }
    // 生活費：通鋪 4（無破曉聲望）＋乾糧 2×3（假設）
    spend(10, d);
  }
  function snap(d) { log.traj[d] = { silver: S.silver, inv: inv.reduce((a, x) => a + x.v, 0), K: st.K, Kret: st.Kret, corrupt: log.corruptGain, value65: log.value65, W1: st.W1, W2: st.W2, opened: st.opened }; }
  function advance(to) { while (T.dayOf(to) > dayDone) { dayDone++; if (dayDone <= days) midnight(dayDone); else if (!log.traj[dayDone]) snap(dayDone); } t = to; }
  const fat = (h, rate) => { S.fat = Math.min(100, S.fat + h * rate); };
  function walk(hours, base) {
    const w = GZ.walkEncounter(r, seed, t, hours, base); fat(hours, 3); let h = hours + w.delay; if (w.fight) { log.walkFights++; }
    advance(t + Math.round(h * 60)); return { h, dead: !!S.dead };
  }
  const avail = (day) => graves.filter((x) => x.slots.length).sort((a, b) => ORDER[a.type] - ORDER[b.type] || a.id - b.id);
  function itemVal(it) { return it.k === 'coin' ? it.v : PRICE[it.k] * M_FERRY; }
  function doGrave(gr, s0) {
    const day = T.dayOf(s0); const A = graveAttr(gr, day);
    const dh = digH(seed, s0, 0, tool); const oh = method === 'quick' ? 0.5 : 1.0; const exp = dh + oh + 0.5;
    const t1 = s0 + dh * 60, t2 = t1 + oh * 60, t3 = t2 + 30;
    const segs = [{ t0: s0, t1, mult: 1 }, { t0: t1, t1: t2, mult: method === 'quick' ? 1.5 : 0.7 }, { t0: t2, t1: t3, mult: 1 }];
    const P = witnessP(seed, segs, A.kinLam, false); const seen = r() < P;
    // 疲累：挖 20×TOOL（熟練 0）＋清醒 2/h
    S.fat = Math.min(100, S.fat + 20 * tool + 2 * exp);
    log.onsiteH += exp;
    // 開棺：ΔK、侵蝕
    const dK = -8 * A.T * (seen ? 1 : 0.5); st.K += dK; st.Kret += dK; st.opened++;
    const cg = method === 'quick' ? 2 : 1; const cb = S.corrupt; G._debug.addCorrupt(cg); log.corruptGain += S.corrupt - cb;
    // 取件：先取最值錢的（銅錢按面額、物品按渡口價）
    const kmax = Math.min(take, A.maxTake, gr.slots.length);
    gr.slots.sort((a, b) => itemVal(b) - itemVal(a)); const got = gr.slots.splice(0, kmax);
    let v65 = 0, coin = 0; const items = [];
    got.forEach((it) => { if (it.k === 'coin') { coin += it.v; v65 += it.v; } else { let v = PRICE[it.k]; if (method === 'quick' && (it.k === 'lo' || it.k === 'mid') && r() < 0.25) v *= 0.5; items.push({ v, mark: A.mark, T: A.T }); v65 += v * M_FERRY; } });
    S.silver += coin; log.coin += coin; log.valueByDay[Math.min(days + 1, day)] += v65; log.value65 += v65;
    items.forEach((x) => inv.push(x));
    // 歸還軌（E6）：當天把拿到的每件都歸還（含銅錢），+0.5T／件，受日常善上限
    const dd = T.dayOf(t3); const room = CAPK(st.Kret) - (st.retDayGain[dd] || 0); const gain = Math.max(0, Math.min(0.5 * A.T * got.length, room)); st.Kret += gain; st.retDayGain[dd] = (st.retDayGain[dd] || 0) + gain;
    if (gain > 0 || got.length) st.feudRet++;
    if (seen) { const wd = T.dayOf(t3) + 1; st.pendW[wd] = (st.pendW[wd] || 0) + 10; if (inWin(seed, t1) || inWin(seed, s0) || (A.kinLam && Math.floor(T.minOfDay(s0) / 60) >= 17)) st.kinFeud++; }
    if (st.K <= -30 && st.k30 === null) { st.k30 = st.opened; st.k30day = day; } if (st.K <= -100 && st.k100 === null) { st.k100 = st.opened; st.k100day = day; } if (st.Kret <= -30 && st.k30ret === null) st.k30ret = st.opened;
    if (st.K < st.minK) st.minK = st.K;
    advance(t3);
    // 屍變
    const pr = clamp(0.08 + (method === 'quick' ? 0.05 : -0.03) + 0.10 * (got.length - 1) + (A.nameless ? 0.05 : 0) + (T.seasonOf(s0) === 1 ? 0.03 : 0), 0.02, 0.60);
    let fightRes = null;
    if (got.length && r() < pr) {
      const cb2 = S.corrupt; G._debug.addCorrupt(1); log.corruptGain += S.corrupt - cb2;
      fightRes = g.fight(got.length >= 3 ? ['corpse', 'corpse'] : ['corpse']); log.corpseFights++; if (fightRes.win) log.corpseWins++; if (fightRes.dead) log.corpseDeaths++;
    }
    if (st.origLeft > 0 && gr.type !== 'New' && !gr.slots.length) { st.origLeft--; if (st.origLeft === 0) st.exhaustDay = T.dayOf(t3); }
    log.graves.push({ day, type: gr.type, kin: A.kinLam, P, seen, exp, v65, taken: got.length, start: T.minOfDay(s0), rise: !!fightRes, riseWin: fightRes ? fightRes.win : null, riseDead: fightRes ? fightRes.dead : null, A });
    return { exp, end: t3, v65 };
  }
  function outing() {
    // 出發與到場時間
    const wake = t; const d0 = T.dayOf(wake);
    let found = null;
    for (let d = d0; d <= d0 + 1 && !found; d++) {
      const bs = (d - 1) * 1440 + ST.bs, be = (d - 1) * 1440 + ST.be; const arr = Math.max(wake + 120, bs);
      if (arr + 120 <= be) found = { bs, be, arr }; // 至少要容得下 1h 挖＋0.5 開棺＋0.5 回填
    }
    advance(found.arr - 120); fat((found.arr - 120 - wake) / 60, 2);
    const w1 = walk(2, 0.22); log.walkH += w1.h; if (w1.dead) return 'dead';
    if (t < found.bs) { fat((found.bs - t) / 60, 2); advance(found.bs); }
    let tt = t; const out = { v65: 0, graves: 0, onsite: 0 };
    if (ST.probe) { tt += 30; log.onsiteH += 0.5; out.onsite += 0.5; fat(0.5, 2); advance(tt); }
    for (;;) {
      if (S.dead) return 'dead';
      if (S.hp < G.maxHp() * 0.5) { while (S.hp < G.maxHp() * 0.5 && G.countItem('pot_hp') > 0) G.useItem(S.pack.findIndex((it) => it && it.k === 'pot_hp')); if (S.hp < G.maxHp() * 0.5) break; }
      const L = avail(T.dayOf(tt)); if (!L.length) break;
      const gr = L[0]; let s0 = tt; const dh = digH(seed, s0, 0, tool); const exp = dh + (method === 'quick' ? 0.5 : 1) + 0.5;
      if (ST.probe) { const wins = windows(seed, nightDayOf(Math.max(found.bs, s0))).concat(windows(seed, nightDayOf(Math.max(found.bs, s0)) + 1));
        let guard = 0; while (guard++ < 40 && wins.some(([a, b]) => s0 < b && s0 + exp * 60 > a)) s0 += 30; }
      if (s0 + exp * 60 > found.be + (ST.spill || 0)) break;
      if (S.fat + 2 * (s0 - tt) / 60 + 20 + 2 * exp > 80) break;
      if (s0 > tt) { fat((s0 - tt) / 60, 2); advance(s0); }
      const x = doGrave(gr, s0); out.v65 += x.v65; out.graves++; out.onsite += x.exp; tt = x.end;
    }
    if (S.dead) return 'dead';
    const w2 = walk(2, 0.22); log.walkH += w2.h; if (w2.dead) return 'dead';
    log.outings.push({ day: d0, v65: out.v65, graves: out.graves, onsite: out.onsite, walk: w1.h + w2.h });
    return 'ok';
  }
  function services() { // 回到破曉營：傷兵帳（治傷 6、去侵蝕 15）、補藥到 2、通鋪睡到天亮
    if (S.corrupt >= 10) { spend(15); advance(t + 120); log.serviceH += 2; S.corrupt = 0; log.cleanse++; }
    if (S.hp < G.maxHp()) { spend(6); advance(t + 60); log.serviceH += 1; S.hp = G.maxHp(); log.heal++; }
    const have = G.countItem('pot_hp'); if (have < 2) { G._debug.addItem({ k: 'pot_hp', n: 2 - have }); spend(POT * (2 - have)); log.potsBought += 2 - have; }
    advance(T.wakeNew(t)); S.fat = 0; S.hp = Math.min(G.maxHp(), S.hp + 30);
  }
  function sellTrip() { // 破曉營→（官道 6h：渡陰關、驛站、灰窯）→腐骨沼 2h；沼地渡口 17:00–08:00、每日收貨上限行情 100
    const t0 = t; fat(0, 2);
    let w = GZ.walkEncounter(r, seed, t, 6, 0.04); advance(t + (6 + w.delay) * 60); fat(6, 3); if (S.dead) return 'dead';
    w = GZ.walkEncounter(r, seed, t, 2, 0.22); advance(t + (2 + w.delay) * 60); fat(2, 3); if (S.dead) return 'dead';
    const m = T.minOfDay(t); if (m >= 480 && m < 1020) advance(t + (1020 - m)); // 等開門
    inv.sort((a, b) => b.v - a.v); let cap = 100, sold = 0;
    for (let i = 0; i < inv.length;) { if (inv[i].v <= cap + 1e-9) { const x = inv.splice(i, 1)[0]; cap -= x.v; sold += x.v * M_FERRY; st.K += x.mark === 'family' ? -4 : -1; log.saleTx++; } else i++; }
    S.silver += sold; log.sales += sold; advance(t + 30);
    if (st.K < st.minK) st.minK = st.K;
    w = GZ.walkEncounter(r, seed, t, 2, 0.22); advance(t + (2 + w.delay) * 60); fat(2, 3); if (S.dead) return 'dead';
    w = GZ.walkEncounter(r, seed, t, 6, 0.04); advance(t + (6 + w.delay) * 60); fat(6, 3); if (S.dead) return 'dead';
    log.sellH += (t - t0) / 60; log.sellTrips++; log.sells.push({ day: T.dayOf(t0), hours: (t - t0) / 60, sold });
    return 'ok';
  }
  const endT = days * 1440; let status = 'ok';
  while (t < endT) {
    const d = T.dayOf(t);
    if (!log.days[d]) log.days[d] = 1;
    const invV = inv.reduce((a, x) => a + x.v, 0);
    let res;
    if (invV >= 100) res = sellTrip();
    else if (avail(d).length) res = outing();
    else { log.idleDays++; advance((d) * 1440 + 480 > t ? d * 1440 + 480 : t + 1440); continue; }
    if (res === 'dead') { status = 'dead'; st.deaths = T.dayOf(t); break; }
    services();
  }
  for (let d = 2; d <= days + 1; d++) if (!log.traj[d]) snap(d); // 死亡後（或最後一晚之後）的日子沿用最後狀態
  return { seed, status, st, log, inv, silverEnd: S.silver, invValue: inv.reduce((a, x) => a + x.v, 0) };
}
/* P 公式回歸：照 G4 手算條件（曝光 3h、無天候、快撬段先不乘）重算 8 個手算值 */
function regression() {
  const rows = [];
  const P = (segs, kin, o) => witnessP(0, segs, kin, false, Object.assign({ noWx: true }, o || {}));
  const at = (h) => (5 - 1) * 1440 + h * 60; // 第 5 日某時（第 5 夜）
  const seg = (h0, h1, m) => ({ t0: at(h0), t1: at(h1), mult: m || 1 });
  // 夜巡窗：枚舉四種組合各 1/4
  const night = (h0, h1) => { const save = windows; let s = 0; [[21, 25], [21, 26], [22, 25], [22, 26]].forEach(([a, b]) => { const lam = (t) => { const h = Math.floor((t - (5 - 1) * 1440) / 60); return h === a || h === b ? 0.26 : 0.01; }; let ls = 0; for (let t = at(h0); t < at(h1); t += 30) ls += Math.log(1 - lam(t)) * 0.5; s += (1 - Math.exp(ls)) / 4; }); return s; };
  rows.push(['白天 08–11', 0.449, P([seg(8, 11)], false)]);
  rows.push(['黃昏 17–20', 0.319, P([seg(17, 20)], false)]);
  rows.push(['遺屬墳黃昏 17–20', 0.525, P([seg(17, 20)], true)]);
  rows.push(['黑夜探過避窗（3h 全在窗外）', 0.030, 1 - Math.pow(0.99, 3)]);
  rows.push(['黑夜不探 20:00–23:00', 0.275, night(20, 23)]);
  rows.push(['黑夜不探 23:00–02:00', 0.152, night(23, 26)]);
  rows.push(['黑夜不探 平均', 0.214, (night(20, 23) + night(23, 26)) / 2]);
  rows.push(['白天含快撬段（挖 2h＋開棺 0.5h×1.5＋回填 0.5h）', 0.480, P([seg(8, 10), { t0: at(10), t1: at(10.5), mult: 1.5 }, seg(10.5, 11)], false)]);
  const ok = rows.every(([, h, v]) => Math.abs(v - h) <= 0.001); // 手算值是取到 0.1 個百分點的數，容差 0.1pp
  // 補充（不判）：同樣條件但開棺段乘快撬 1.5（挖 2h＋開棺 0.5h＋回填 0.5h）
  const night15 = (h0) => { let s = 0; [[21, 25], [21, 26], [22, 25], [22, 26]].forEach(([a, b]) => { const lam = (t) => { const h = Math.floor((t - (5 - 1) * 1440) / 60); return h === a || h === b ? 0.26 : 0.01; }; let ls = 0; for (let t = at(h0); t < at(h0 + 3); t += 30) { const m = t >= at(h0 + 2) && t < at(h0 + 2.5) ? 1.5 : 1; ls += Math.log(1 - lam(t) * m) * 0.5; } s += (1 - Math.exp(ls)) / 4; }); return s; };
  const extra = [['黃昏 17–20（含快撬段）', P([seg(17, 19), { t0: at(19), t1: at(19.5), mult: 1.5 }, seg(19.5, 20)], false)], ['黑夜不探 20:00–23:00（含快撬段）', night15(20)], ['黑夜不探 23:00–02:00（含快撬段）', night15(23)], ['黑夜不探 平均（含快撬段）', (night15(20) + night15(23)) / 2]];
  return { rows, ok, extra };
}
module.exports = { runSeed, STRATS, HAND, regression, witnessP, windows, initGraves, graveAttr, TYPES };
