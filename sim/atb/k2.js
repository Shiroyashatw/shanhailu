'use strict';
/* K2 前線三波（SPEC-ATB §13.1）。frontline() 依 sim/civ/k2.js 的 frontline()（v0.3 平民補跑）逐行照抄，只把引擎改成參數：
 *   制式 短刃＋木盾＋皮甲、金創藥水 ×4、三波＝窯屍×2／遠征亡卒＋窯屍／血霧妖（紅霧妖）＋遠征亡卒、每波前回滿、不可撤退、疲累 ×1.25、飽食 80、疲累起始 10。 */
const { U, E, CIV, civCleaner } = require('./common');
const ISSUE = ['blade_short', 'buckler', 'leather'];
const WAVES = [['corpse', 'corpse'], ['soldier_dead', 'corpse'], ['wraith', 'soldier_dead']];
const SEED0 = 55000;
function frontline(eng, tpl, seed, waves, potN) {
  waves = waves || WAVES;
  const t = { origin: tpl.origin, attr: tpl.attr, prof: tpl.prof, gear: ISSUE, skills: tpl.skills || [], items: [['pot_hp', potN === undefined ? 4 : potN]] };
  eng.setupPlayer(seed, t); const G = eng.G(), S = G.state;
  S.hp = Math.round(G.maxHp() * 1); S.food = 80; S.fat = 10;
  let cleared = 0, acts = 0, pots = 0;
  for (let w = 0; w < 3; w++) {
    eng.healTo(1);
    const r = eng.fight(waves[w], { fatMult: 1.25 });
    acts += r.rounds; pots += r.pots;
    if (!r.win) return { survive: false, cleared, acts, pots };
    cleared++;
  }
  return { survive: true, cleared, acts, pots };
}
function batch(eng, tpl, n, seed0, waves, potN) {
  let k = 0, acts = 0, pots = 0; const w = [0, 0, 0, 0];
  for (let j = 0; j < n; j++) { const r = frontline(eng, tpl, (seed0 === undefined ? SEED0 : seed0) + j, waves, potN); if (r.survive) k++; w[r.cleared]++; acts += r.acts; pots += r.pots; }
  return { k, n, p: k / n, w, acts: acts / n, pots: pots / n };
}
// 平民實際的負重檔、speedMult、playerSpeed、壓縮後 v（ATB 實例讀）
function readSpeed(tpl) {
  const t = { origin: tpl.origin, attr: tpl.attr, prof: tpl.prof, gear: ISSUE, skills: tpl.skills || [], items: [['pot_hp', 4]] };
  E.setupPlayer(SEED0, t); const G = E.inst().G; const S = G.state;
  const raw = G.playerSpeed(); const C = E.cfg();
  return { name: tpl.name, wt: G.totalWt(), cap: G.carryCap(), band: G.loadBand().name + '（' + G.loadBand().id + '）', ratio: G.totalWt() / G.carryCap(), speedMult: G.speedMult(), playerSpeed: raw, v: Math.min(C.MAX, Math.max(C.MIN, 10 + (raw - 10) * C.K)), vFat80: (() => { S.fat = 80; const r = G.playerSpeed(); return Math.min(C.MAX, Math.max(C.MIN, 10 + (r - 10) * C.K)); })(), bag: S.equip.bag ? S.equip.bag.base : null };
}
const players = () => [CIV, civCleaner()];
module.exports = { frontline, batch, readSpeed, players, WAVES, ISSUE, SEED0 };
