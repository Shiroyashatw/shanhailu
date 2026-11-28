'use strict';
// K4 賞金獵人（補充；平民單一起手）。trip() 逐行照抄 sim/items/K4.js。
const { g, P, U, CIV, civCleaner, writeCsv, pw } = require('./common');
const { hours } = require('../items/T5');
const { setupHunters } = require('../items/K4');
const { r3, prng, clamp, verdict } = U;
const N = 500;
function trip(tpl, seed, W, segs) {
  const r = prng(seed, 'K4'); g.setupPlayer(seed, tpl); const G = g.inst().G;
  const bounty = W * W / 10, rate = clamp(bounty / 800, 0.10, 0.60) * 0.5, bribe = Math.ceil(0.25 * bounty);
  const pool = W >= 80 ? ['hunter', 'hunter', 'hunter', 'hunter', 'hunter_elite'] : ['hunter', 'hunter', 'hunter'];
  let silver = 250, enc = 0, fights = 0; const pTalk = clamp(0.3 + 0.008 * G.profLv('shuo') + 0.05 * (G.attrVal('kou') - 10) - 0.005 * W, 0.05, 0.90);
  for (let s = 0; s < segs; s++) {
    if (!pool.length || r() >= rate) continue;
    enc++; const h = pool.splice(Math.floor(r() * pool.length), 1)[0];
    if (silver >= bribe) { silver -= bribe; if (r() < 0.85) continue; }
    if (r() < pTalk) continue;
    fights++; const f = g.fight([h], { surrenderAt: 0.25 });
    if (f.dead) return { out: 'dead', enc, spent: 250 - silver, fights };
    if (!f.win) return { out: 'caught', enc, spent: 250 - silver, fights };
  }
  return { out: 'escape', enc, spent: 250 - silver, fights, pTalk };
}
function run() {
  setupHunters();
  const groups = [CIV, civCleaner()]; const dests = [['野徑岔口', hours('huiyao', 'chakou')], ['撿骨師營地', hours('huiyao', 'shigu')]];
  const csv = [], res = {}; const lines = ['| 玩家 | W（賞金／收買價） | 目的地（段數） | 離境〔Wilson 95% CI〕 | 被捕 | 死亡 | 平均遭遇 | 平均花費 | 平均開打 |', '|---|---|---|---|---|---|---|---|---|'];
  groups.forEach((t) => [50, 64].forEach((W) => dests.forEach(([dn, segs]) => {
    const c = { escape: 0, caught: 0, dead: 0 }; let enc = 0, spent = 0, fights = 0;
    for (let i = 0; i < N; i++) { const o = trip(t, 90000 + W * 1000 + i, W, segs); c[o.out]++; enc += o.enc; spent += o.spent; fights += o.fights; }
    res[t.name + W + dn] = c; csv.push([t.name, W, W * W / 10, dn, segs, N, c.escape / N, c.caught / N, c.dead / N, enc / N, spent / N, fights / N]);
    lines.push('| ' + [t.name, W + '（' + r3(W * W / 10) + '／' + Math.ceil(0.25 * W * W / 10) + '）', dn + '（' + segs + '）', pw(c.escape, N), r3(c.caught / N), r3(c.dead / N), r3(enc / N), r3(spent / N), r3(fights / N)].join(' | ') + ' |');
  })));
  const cl = civCleaner().name; const worst = Math.min(...[50, 64].flatMap((W) => dests.map(([dn]) => res[cl + W + dn].escape / N))); const ok = worst >= 0.9;
  const worstS = Math.min(...[50, 64].flatMap((W) => dests.map(([dn]) => res[CIV.name + W + dn].escape / N)));
  const d = { sh: P.duel(CIV, ['hunter'], 200, 5), se: P.duel(CIV, ['hunter_elite'], 200, 5), ch: P.duel(civCleaner(), ['hunter'], 200, 5), ce: P.duel(civCleaner(), ['hunter_elite'], 200, 5) };
  [['起手・平民', 'hunter', d.sh], ['起手・平民', 'hunter_elite', d.se], [cl, 'hunter', d.ch], [cl, 'hunter_elite', d.ce]].forEach(([n, e, f]) => csv.push(['duel:' + n, '', '', e, '', f.n, f.win, '', f.dead, '', f.hpCost, f.pots]));
  lines.push('', '古窯清理級・平民在 W=50、64 的離境率：最低 ' + r3(worst * 100) + '%（門檻 ≥90%，兩個目的地都算）→ **' + verdict(ok) + '**。起手・平民（無門檻，參考）最低 ' + r3(worstS * 100) + '%。');
  lines.push('單挑（滿血、2 瓶藥、不投降，各 200 場、種子 5+i，與前一輪相同）：起手・平民 對獵人 勝率 ' + r3(d.sh.win) + '（平均失血成本 ' + r3(d.sh.hpCost) + '、喝藥 ' + r3(d.sh.pots) + ' 瓶）、對精銳獵人 勝率 ' + r3(d.se.win) + '（失血成本 ' + r3(d.se.hpCost) + '、喝藥 ' + r3(d.se.pots) + ' 瓶）；古窯清理級・平民 對獵人 ' + r3(d.ch.win) + '、對精銳 ' + r3(d.ce.win) + '。');
  lines.push('平民口才 10、說服 0：談判成功率 W=50 為 ' + r3(clamp(0.3 - 0.005 * 50, 0.05, 0.9)) + '、W=64 為 ' + r3(clamp(0.3 - 0.005 * 64, 0.05, 0.9)) + '（下限 0.05）。');
  writeCsv('K4', ['player', 'W', 'bounty', 'dest_or_enemy', 'segments', 'n', 'p_escape_or_win', 'p_caught', 'p_dead', 'mean_encounters', 'mean_spent_or_hpcost', 'mean_fights_or_pots'], csv);
  return { lines, ok, worst, worstS, d, res };
}
module.exports = { run };
