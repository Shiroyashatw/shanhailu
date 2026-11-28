'use strict';
/* SPEC-01 v0.2 世界模型（S1–S5、B5、K1、K5 共用）。完全照任務書虛擬碼。
 * tick() ＝ 一次 00:00 日結：第 n 次 tick 結算第 n 日、開啟第 n+1 日（對應 game.js:418 newDay(day=n+1)）。
 * 玩家白天的介入（donate／killBandits／sell／payBounty／tradeTax）在兩次 tick 之間呼叫。 */
const { wrnd, clamp } = require('./util');
const { data } = require('./game');

const DEFAULTS = {
  K_REG: 0.10, K_TAX: { huiyao: 0.45, duyin: 1.15 }, UPKEEP: [0, 15, 40, 90], PATROL: [0, 5, 9, 12], P_DEF: [0, 0.30, 0.55, 0.80],
  PNOISE: 1, CREW_PERIOD: 5, CREW_CAP: [4, 6], // [Ō>=40 時, 否則]
  START: { huiyao: { P: 50, T: 200, O: 55, Gnom: 1 }, duyin: { P: 45, T: 300, O: 60, Gnom: 2 } },
};
const TOWNS = ['huiyao', 'duyin'];
const seasonAbs = (day) => Math.floor((day - 1) / 30);
const dayOfSeason = (day) => ((day - 1) % 30) + 1;

function newWorld(seed, opts) {
  opts = opts || {};
  const PR = Object.assign({}, DEFAULTS, opts.params || {});
  const TIDE = data().TIDE; // data.js:454
  const W = { seed, PR, n: 0, day: 1, towns: {}, B: 30, crew: 4, crewCtr: 0, crewWiped: false, wipedEvents: 0, wipedBad: 0,
    tide: null, tideNext: 0, tideLog: [], hurtLeft: { huiyao: 0, duyin: 0 }, repelToday: {}, heavyOps: {}, tideStarts: [],
    refugee: { camp: 60, inTotal: 0, settledTotal: 0, soldTotal: 0, soldToday: 0, soldYday: 0 }, pool: 0,
    rescue: [], quests: [], qid: 0, questRolls: 0, playerTideKills: 0, hist: [], noQuests: !!opts.noQuests, pnoiseOff: !!opts.pnoiseOff };
  TOWNS.forEach((id) => {
    const s = PR.START[id];
    W.towns[id] = { id, P: s.P, T: s.T, O: s.O, Gnom: s.Gnom, Geff: s.Gnom, F: 0, Lpat: 0, debt: 0, rescueCd: 0, taxCut: 0,
      P_base: s.P, O_base: s.O, G0: s.Gnom, T_CAP: 90 * PR.UPKEEP[s.Gnom], incOverride: null,
      day: { tradeTax: 0, fines: 0, bountyPaid: 0 }, remitLogs: 0, lastRemitLog: -99, rescues: 0, brief: null, aidDaysLeft: 0 };
  });
  W.tideNext = TIDE.first[0] + Math.floor(wrnd(seed, 'tide-first', 0, 0) * (TIDE.first[1] - TIDE.first[0] + 1)); // game.js:245 改用 wrnd
  if (!W.noQuests) genQuests(W, 1);
  return W;
}
// ---- 玩家介入 ----
function donate(W, town, amt) { W.towns[town].F = Math.min(500, W.towns[town].F + amt); }
function killBandits(W, n) {
  for (let i = 0; i < n; i++) {
    const before = W.crew;
    W.B = Math.max(0, W.B - 2.5); W.crew = Math.max(0, W.crew - 0.5);
    if (before > 0 && W.crew === 0) { if (W.crewWiped) W.wipedBad++; else { W.crewWiped = true; W.wipedEvents++; } }
  }
}
function refreshPool(W) { const R = W.refugee; W.pool = Math.min(24, W.pool + 3, R.camp); if (R.camp < W.pool) W.pool = R.camp; }
function sell(W, want, usePool) {
  const R = W.refugee; const n = Math.max(0, Math.min(want, Math.floor(R.camp), usePool === false ? Infinity : Math.floor(W.pool)));
  R.camp -= n; R.soldTotal += n; R.soldToday += n; if (usePool !== false) W.pool -= n;
  return n;
}
function payBounty(W, town, amt) { const t = W.towns[town]; const pay = Math.min(amt, t.T); t.T -= pay; t.day.bountyPaid += pay; return pay; }
function tradeTax(W, town, sale) { const x = Math.floor(sale * 0.05); W.towns[town].T += x; W.towns[town].day.tradeTax += x; return x; }

// ---- 委託板（game.js:888-926 的每日生成；擲骰改用 wrnd；劫匪題與 deliver 權重照 SPEC-01）----
function qr(W, day) { return wrnd(W.seed, 'quest', day, W.questRolls++); }
function genQuests(W, day) {
  const G = data().QUEST_GEN; const boards = ['huiyao', 'duyin', 'poxiao'];
  W.quests = W.quests.filter((q) => day <= q.due); // 無玩家：開著的到期就撕（game.js:916）
  boards.forEach((town) => {
    let n = W.quests.filter((q) => q.town === town).length, guard = 0;
    while (n < G.perTown && guard++ < 16) {
      let w = Object.assign({}, G.kinds[town] || { kill: 100 });
      if (w.deliver && W.towns[town]) w.deliver = 20 * clamp(W.towns[town].P / 50, 0.4, 1.6);
      const ks = Object.keys(w); let tot = 0; ks.forEach((k) => (tot += w[k])); let r = qr(W, day) * tot, kind = ks[ks.length - 1];
      for (const k of ks) { r -= w[k]; if (r <= 0) { kind = k; break; } }
      const q = { id: ++W.qid, town, kind, day };
      if (kind === 'collect') {
        const [item] = G.collect.pool[Math.floor(qr(W, day) * G.collect.pool.length)];
        if (W.quests.some((x) => x.town === town && x.kind === 'collect' && x.item === item)) continue;
        q.item = item; q.due = day + G.collect.days;
      } else if (kind === 'kill') {
        const p = clamp((W.B - 20) / 80, 0, 0.5);
        if (qr(W, day) < p) { q.enemy = 'bandit'; q.need = qr(W, day) < 0.5 ? 2 : 4; q.reward = q.need === 2 ? 36 : 76; }
        else { const e = G.kill.pool[Math.floor(qr(W, day) * G.kill.pool.length)]; q.enemy = e[0]; q.need = e[1]; q.reward = e[2]; }
        if (W.dedupKill !== false && W.quests.some((x) => x.kind === 'kill' && x.enemy === q.enemy)) continue; // game.js:900
        q.due = day + G.kill.days;
      } else {
        if (W.quests.some((x) => x.town === town && x.kind === 'deliver')) continue;
        q.due = day + G.deliver.days;
      }
      W.quests.push(q); n++;
    }
  });
}

// ---- 每日日結 ----
function tick(W) {
  const PR = W.PR, TIDE = data().TIDE, seed = W.seed;
  const n = ++W.n, day = n + 1; W.day = day;
  const snap = { huiyao: { P: W.towns.huiyao.P, O: W.towns.huiyao.O, Geff: W.towns.huiyao.Geff }, duyin: { P: W.towns.duyin.P, O: W.towns.duyin.O, Geff: W.towns.duyin.Geff }, B: W.B };
  const ev = { tideStart: null, tideEnd: null };
  W.repelToday = {};
  // 1 worldTick（獸潮；game.js:1127-1148，排程與目標改 wrnd）
  if (W.tide && day > W.tide.end) {
    const td = W.tide; const gy = snap[td.town].Geff;
    const byPlayer = W.playerTideKills >= TIDE.need; const u = wrnd(seed, 'tide-def', day, 0);
    const repel = byPlayer || u < PR.P_DEF[gy];
    if (repel) W.repelToday[td.town] = true; else W.hurtLeft[td.town] = gy >= 2 ? 1 : 2;
    W.tideLog.push({ town: td.town, start: td.start, end: td.end, resolveDay: day, repel, byPlayer, self: !byPlayer && repel, Geff: gy });
    ev.tideEnd = { town: td.town, repel, byPlayer };
    W.tide = null; W.playerTideKills = 0;
    W.tideNext = day + TIDE.gap[0] + Math.floor(wrnd(seed, 'tide-gap', day, 0) * (TIDE.gap[1] - TIDE.gap[0] + 1));
  }
  if (!W.tide && day >= W.tideNext) {
    const wh = 1 + Math.max(0, snap.huiyao.O - 80) / 20, wd = 1 + Math.max(0, snap.duyin.O - 80) / 20;
    const town = wrnd(seed, 'tide-town', day, 0) * (wh + wd) < wh ? 'huiyao' : 'duyin';
    W.tide = { town, start: day, end: day + TIDE.days - 1 };
    W.tideStarts.push(day); W.heavyOps[seasonAbs(day)] = (W.heavyOps[seasonAbs(day)] || 0) + 1;
    ev.tideStart = { town, day };
  }
  // 2 townTick
  let hurtTowns = 0; const rows = {};
  TOWNS.forEach((id) => {
    const t = W.towns[id]; const y = snap[id];
    const incBase = t.incOverride !== null ? t.incOverride : PR.K_TAX[id] * y.P * (0.6 + 0.004 * y.O);
    const Inc = incBase * (t.taxCut > 0 ? 0.8 : 1);
    t.T += Inc;
    t.rescueCd = Math.max(t.rescueCd - 1, 0); t.taxCut = Math.max(t.taxCut - 1, 0);
    const need = PR.UPKEEP[t.Gnom]; let paid = 0, debtToday = false, aidToday = false, rescue = 0;
    if (t.T >= need) {
      t.T -= need; paid = need; t.Geff = t.Gnom; t.debt = 0;
      const d = PR.UPKEEP[Math.min(t.Gnom + 1, 3)] - need;
      if (t.Gnom < 3 && t.F >= d) { t.F -= d; t.Geff = t.Gnom + 1; aidToday = true; }
      t.aidDaysLeft = aidToday ? 1 + Math.floor(t.F / d) : 0;
    } else {
      t.Geff = Math.max(t.Gnom - 1, 0); paid = Math.min(t.T, PR.UPKEEP[t.Geff]); t.T -= paid; t.debt += 1; debtToday = true; t.aidDaysLeft = 0;
    }
    if (t.debt >= 3 && t.rescueCd === 0) { rescue = 6 * PR.UPKEEP[t.Gnom]; t.T += rescue; t.debt = 0; t.taxCut = 10; t.rescueCd = 20; t.rescues++; }
    const Pstar = t.P_base + 0.40 * (y.O - t.O_base);
    const Ostar = t.O_base + 0.20 * (y.P - t.P_base) - 0.20 * (snap.B - 30) + 10 * (t.Geff - t.G0) + PR.PATROL[t.Lpat];
    let tideP = 0, tideO = 0, hurt = false;
    if (W.tide && W.tide.town === id) { tideP -= 2; tideO -= 1; }
    if (W.hurtLeft[id] > 0) { tideP -= 2; tideO -= 1; W.hurtLeft[id]--; hurt = true; hurtTowns++; }
    if (W.repelToday[id]) { tideP += 3; tideO += 2; }
    let eps = 0;
    if (!W.pnoiseOff) { const u = wrnd(seed, 'pnoise-' + id, day, 0); eps = (u < 1 / 3 ? -1 : u < 2 / 3 ? 0 : 1) * PR.PNOISE; }
    let dP = PR.K_REG * (Pstar - y.P) + eps + tideP;
    let dO = PR.K_REG * (Ostar - y.O) + tideO - (id === 'duyin' ? 0.2 * W.refugee.soldToday : 0);
    dP = clamp(dP, -3, 3); dO = clamp(dO, -3, 3);
    if (y.P > 70 && dP > 0) dP *= 0.5;
    const P0 = t.P; t.P = clamp(y.P + dP, 15, 80); t.O = clamp(y.O + dO, 0, 100);
    let remit = 0, remitLog = false;
    if (t.T > t.T_CAP) { remit = t.T - t.T_CAP; t.T = t.T_CAP; if (n - t.lastRemitLog >= 10) { t.lastRemitLog = n; t.remitLogs++; remitLog = true; } }
    const In = Math.round(Inc + t.day.tradeTax + t.day.fines + rescue), Out = Math.round(paid + t.day.bountyPaid + remit);
    const tier = debtToday ? 'debt' : t.T >= t.T_CAP ? 'full' : t.T < 3 * PR.UPKEEP[t.Gnom] ? 'tight' : 'ok';
    t.brief = { treasuryIn: In, treasuryOut: Out, treasuryNet: In - Out, treasuryTier: tier, aidDaysLeft: t.aidDaysLeft };
    rows[id] = { P: t.P, O: t.O, T: t.T, Geff: t.Geff, dP: t.P - P0, Inc, debtToday, rescue: rescue > 0, remit, remitLog, hurt, tier, F: t.F, aidToday };
    t.day = { tradeTax: 0, fines: 0, bountyPaid: 0 };
  });
  // 3 regionTick
  const Obar = (snap.huiyao.O + snap.duyin.O) / 2, Pbar = (snap.huiyao.P + snap.duyin.P) / 2;
  const Bstar = clamp(30 - 0.5 * (Obar - 57.5) - 0.2 * (Pbar - 47.5) + 0.5 * Math.max(0, Obar - 80) + 5 * (W.crew - 4), 0, 100);
  W.B = clamp(W.B + clamp(PR.K_REG * (Bstar - W.B), -3, 3), 0, 100);
  W.crewCtr += 1;
  if (W.crewCtr >= PR.CREW_PERIOD) { W.crewCtr = 0; const cap = Obar >= 40 ? PR.CREW_CAP[0] : PR.CREW_CAP[1]; if (W.crew < cap) W.crew = Math.min(cap, W.crew + 1); else if (W.crew > cap) W.crew -= 1; }
  if (W.crew >= 1) W.crewWiped = false;
  // 4 委託＋救援委託排程
  const s = seasonAbs(day), dos = dayOfSeason(day);
  const d1 = 3 + Math.floor(10 * wrnd(seed, 'rescue', s, 0)); const first = wrnd(seed, 'rescue', s, 1) < 0.5 ? 'huiyao' : 'duyin';
  W.rescue = W.rescue.filter((r) => day < r.day + 6);
  if (dos === d1 || dos === d1 + 12) {
    const town = dos === d1 ? first : first === 'huiyao' ? 'duyin' : 'huiyao';
    W.rescue.push({ town, day, season: s }); W.heavyOps[s] = (W.heavyOps[s] || 0) + 1; ev.rescue = { town, day };
  }
  if (!W.noQuests) genQuests(W, day);
  // 4b 難民
  const R = W.refugee; const arrive = 3 + hurtTowns, settle = Math.floor(R.camp / 20);
  R.camp += arrive - settle; R.inTotal += arrive; R.settledTotal += settle; const sold = R.soldToday; R.soldYday = R.soldToday; R.soldToday = 0;
  // 5 brief／紀錄
  const rec = { n, day, huiyao: rows.huiyao, duyin: rows.duyin, B: W.B, crew: W.crew, camp: R.camp, pool: W.pool, sold, conserve: Math.abs(R.camp + R.settledTotal + R.soldTotal - (60 + R.inTotal)) < 1e-9,
    Obar: (W.towns.huiyao.O + W.towns.duyin.O) / 2, tide: W.tide ? W.tide.town : '', ev,
    banditShare: W.noQuests ? 0 : (W.quests.length ? W.quests.filter((q) => q.enemy === 'bandit').length / W.quests.length : 0), nQuests: W.quests.length };
  W.hist.push(rec);
  return rec;
}
/* 跑 days 天。hook(W, n) 在第 n 日白天（第 n 次 tick 之前）呼叫，n 從 1 起。 */
function run(seed, days, opts, hook) {
  const W = newWorld(seed, opts);
  if (opts && opts.init) opts.init(W);
  for (let n = 1; n <= days; n++) { if (hook) hook(W, n); tick(W); }
  return W;
}
module.exports = { DEFAULTS, TOWNS, newWorld, tick, run, donate, killBandits, sell, refreshPool, payBounty, tradeTax, seasonAbs, dayOfSeason, genQuests };
