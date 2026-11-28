'use strict';
/* 事件實測（Node vm 載入 PR #16 的 js/data.js、js/game.js，直接呼叫 window.SHL 的 travelPreview／selectDest／travel）。
 * 迴圈內容逐行照 tests/measure-dev04-bandit.js 第 2 段（灰窯⇄野徑岔口來回、遇事件即中止不入戰、每趟後把 B／crew／O／P 重設回起手），
 * 另外逐趟記下晝夜與事件 id，以便分開報白天／夜間。開局用 G.init({seed, fresh:true, origin:'drifter'})，與網頁 ?seed=…&fresh=1&origin=drifter 相同。 */
const { refRoot } = require('./ref');
function load() { return require(refRoot('new') + '/sim/lib/game').inst(); }
function routes() {
  const { G, D } = load(); G.init({ seed: 1, fresh: true, origin: 'drifter' }); const S = G.state;
  const out = []; const seen = {};
  D.EDGES.filter((e) => !e.road).forEach((e) => [[e.a, e.b], [e.b, e.a]].forEach(([a, b]) => {
    const key = [a, b].sort().join('-'); if (seen[key]) return; seen[key] = 1;
    S.loc = a; S.t = 8 * 60; const p = G.travelPreview(b); S.t = 22 * 60; const pn = G.travelPreview(b);
    out.push({ a, b, an: D.NODES[a].name, bn: D.NODES[b].name, h: p.hours, edges: p.edges.length, riskDay: p.risk, riskNight: pn.risk, R: p.R });
  }));
  return out;
}
function trips(seed, n, opts) {
  opts = opts || {};
  const { G, D } = load(); G.init({ seed, fresh: true, origin: 'drifter' }); const S = G.state;
  S.world.tide = null; S.world.next = 1e9;
  let hours = 0, bandits = 0, ev = 0, nightTrips = 0, nightEv = 0, nightBandits = 0, nightHours = 0; const evIds = {}; let perkTrips = 0, firstPerk = null;
  for (let k = 0; k < n; k++) {
    if (opts.resetJiao) S.prof.jiao = { lv: 0, xp: 0 }; // 對照組：每趟把〈腳力〉歸零（不吃「腳力 25：野徑遇險 −20%」）
    if (G.profLv ? G.profLv('jiao') >= 25 : (S.prof.jiao && S.prof.jiao.lv >= 25)) { perkTrips++; if (firstPerk === null) firstPerk = k; }
    S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.dead = null; S.combat = null; S.event = null; S.scene = 'map';
    const to = S.loc === 'huiyao' ? 'chakou' : 'huiyao';
    const before = S.t; const night = G.isNight(S.t); G.selectDest(to); G.travel(); const dh = (S.t - before) / 60; hours += dh;
    if (night) { nightTrips++; nightHours += dh; if (S.event) nightEv++; }
    if (S.event) { ev++; evIds[S.event.id] = (evIds[S.event.id] || 0) + 1; if (S.event.id === 'bandit') { bandits++; if (night) nightBandits++; } S.event = null; S.scene = 'map'; S.loc = to; }
    S.world.region.B = 30; S.world.region.crew = 4;
    ['huiyao', 'duyin'].forEach((t) => { S.world.towns[t].O = D.WORLD.START[t].O; S.world.towns[t].P = D.WORLD.START[t].P; });
  }
  return { seed, resetJiao: !!opts.resetJiao, perkTrips, firstPerk, jiaoEnd: S.prof.jiao && S.prof.jiao.lv, trips: n, hours, events: ev, evIds, bandits, nightTrips, nightHours, nightEv, nightBandits, dayTrips: n - nightTrips, dayHours: hours - nightHours, dayEv: ev - nightEv, dayBandits: bandits - nightBandits, hPerBandit: hours / bandits };
}
function staticInfo() {
  const { D } = load();
  const evShare = D.EVENTS.filter((e) => e.id === 'bandit').length / D.EVENTS.length;
  const w = D.RUMOR.truth, tot = Object.values(w).reduce((a, b) => a + b, 0);
  return { evIds: D.EVENTS.map((e) => e.id), evShare, truth: w, truthTot: tot, rumorCost: D.RUMOR.cost, kinds: Object.fromEntries(Object.entries(D.RUMOR.kinds).map(([k, v]) => [k, v.nodes])), questBandit: D.QUEST_GEN.bandit, where: D.QUEST_GEN.where.bandit, killPool: D.QUEST_GEN.kill.pool, banditSilver: D.ENEMIES.bandit.silver, WORLD: { KILL_B: D.WORLD.KILL_B, KILL_CREW: D.WORLD.KILL_CREW, GUARD_CREW_FULL: D.WORLD.GUARD_CREW_FULL, R_WILD: D.WORLD.R_WILD, B_REF: D.WORLD.B_REF } };
}
module.exports = { routes, trips, staticInfo };
if (require.main === module) { console.log(JSON.stringify({ routes: routes(), s1: trips(20261127, 4000), s2: trips(20261128, 4000), s1n: trips(20261127, 4000, { resetJiao: true }), s2n: trips(20261128, 4000, { resetJiao: true }) }, null, 1)); }
