'use strict';
/* 四座地城抽查（SPEC-ATB §13.1）。每層連續打；層間「不回血」或「回到 70％最大生命」；層間不補藥、不重置疲累。
 * 每層開打前照 game.js dungeonDelve() 先加侵蝕（酉神裂口 mist=2），但不套 dungeonDelve 的 passTime（疲累 +3、時間）——
 * 任務書：「疲累沿用戰鬥內累積，層間不變」。戰鬥 ctx 用 'wild'（與既有 fight() 相同），所以不算地城掉寶。
 * 古窯清理級（藍裝）：古窯清理級・平民的素質、熟練度、崩岩擊，裝備換成良品（blue）短刃＋皮甲＋木盾（每個種子各自擲詞綴，兩種引擎同種子同詞綴）。
 * 平民起手：起手・平民（鏽刃＋布衣、金創藥水×2、乾餅×2）。藥水：各自樣板帶的 2 瓶，整座地城不補。 */
const { CIV, civCleaner, U } = require('./common');
const { data } = require('../lib/game');
const DGS = ['guyao', 'jiku', 'guzhong', 'liekou'];
const N = 500, SEED = 71000;
function blueCleaner() { const c = civCleaner(); return Object.assign({}, c, { name: '古窯清理級・平民（藍裝）', blue: true }); }
function delve(eng, tpl, dg, seed, mode) {
  const DG = data().DUNGEONS[dg];
  eng.setupPlayer(seed, tpl); const G = eng.G(); const S = G.state;
  if (tpl.blue) tpl.gear.forEach((b) => { const eq = G._debug.newEq(b, 'blue').eq; S.equip[data().BASES[b].slot] = eq; });
  S.hp = G.maxHp(); S.food = 80; S.fat = 10;
  let acts = 0;
  for (let f = 0; f < DG.floors.length; f++) {
    if (f > 0 && mode === 'h70') eng.healTo(0.7);
    if (DG.mist) G._debug.addCorrupt(DG.mist);
    const r = eng.fight(DG.floors[f], {}); acts += r.rounds;
    if (!r.win) return { clear: false, floor: f, acts };
  }
  return { clear: true, floor: DG.floors.length, acts, hpEnd: S.hp / G.maxHp() };
}
function batch(eng, tpl, dg, mode, n, seed0) {
  let k = 0; const fl = Array(5).fill(0); let acts = 0;
  for (let j = 0; j < n; j++) { const r = delve(eng, tpl, dg, seed0 + j, mode); if (r.clear) k++; fl[r.floor]++; acts += r.acts; }
  return { k, n, p: k / n, fl, acts: acts / n };
}
module.exports = { DGS, N, SEED, blueCleaner, delve, batch };
