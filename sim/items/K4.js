'use strict';
// K4 賞金獵人
const g = require('../lib/game');
const P = require('../lib/players');
const { hours } = require('./T5');
const { r3, prob, writeCsv, verdict, prng, clamp } = require('../lib/util');
const N = 500;
/* 【假設】
 * - 獵人行動模式規格沒給：比照劫匪 pat ['atk','charge','guard','atk']（data.js:151），重擊＝傷害×2（game.js:1332 的預設）；精銳速度同 11。
 * - 路線：灰窯→野徑岔口（1 段，最近的野外）與 灰窯→岔口→藥林→獸徑→撿骨師營地（4 段），全是野徑 → 遭遇率 ×0.5。逐段判定，先判獵人。
 * - 策略：身上銀兩夠就收買（不論成敗都付錢）；收買失敗或錢不夠 → 談判；談判失敗 → 迎戰；生命 ≤25% 且沒藥 → 投降（被捕）。
 * - 成功擺脫的獵人離開 7 天＝本趟不再出現；獵人數 重犯 3、死罪 4＋1 精銳。途中不補血。未計一般野徑遇險。 */
function setupHunters() {
  g.addEnemy('hunter', { name: '賞金獵人', g: '獵', lv: 30, hp: 45, dmg: [6, 9], spd: 11, armor: 3, pat: ['atk', 'charge', 'guard', 'atk'] });
  g.addEnemy('hunter_elite', { name: '賞金獵人・精銳', g: '銳', lv: 45, hp: 70, dmg: [8, 11], spd: 11, armor: 5, pat: ['atk', 'charge', 'guard', 'atk'] });
}
function trip(tpl, seed, W, segs) {
  const r = prng(seed, 'K4'); g.setupPlayer(seed, tpl); const G = g.inst().G, S = G.state;
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
  return { out: 'escape', enc, spent: 250 - silver, fights };
}
function run() {
  setupHunters();
  const groups = [['出身起手', P.starters()], ['古窯清理級', P.cleaners()]]; const dests = [['野徑岔口', hours('huiyao', 'chakou')], ['撿骨師營地', hours('huiyao', 'shigu')]];
  const csv = [], res = {}; const lines = ['| 玩家 | W（賞金／收買價） | 目的地（段數） | 離境 | 被捕 | 死亡 | 平均遭遇 | 平均花費 | 平均開打 |', '|---|---|---|---|---|---|---|---|---|'];
  groups.forEach(([gn, ts]) => [50, 64, 80].forEach((W) => dests.forEach(([dn, segs]) => {
    const c = { escape: 0, caught: 0, dead: 0 }; let enc = 0, spent = 0, fights = 0;
    for (let i = 0; i < N; i++) { const o = trip(ts[i % ts.length], 90000 + W * 1000 + i, W, segs); c[o.out]++; enc += o.enc; spent += o.spent; fights += o.fights; }
    res[gn + W + dn] = c.escape / N; csv.push([gn, W, W * W / 10, dn, segs, N, c.escape / N, c.caught / N, c.dead / N, enc / N, spent / N, fights / N]);
    lines.push('| ' + [gn, W + '（' + r3(W * W / 10) + '／' + Math.ceil(0.25 * W * W / 10) + '）', dn + '（' + segs + '）', prob(c.escape, N), r3(c.caught / N), r3(c.dead / N), r3(enc / N), r3(spent / N), r3(fights / N)].join(' | ') + ' |');
  })));
  writeCsv('K4', ['group', 'W', 'bounty', 'dest', 'segments', 'n', 'p_escape', 'p_caught', 'p_dead', 'mean_encounters', 'mean_spent', 'mean_fights'], csv);
  const keys = ['古窯清理級50野徑岔口', '古窯清理級50撿骨師營地', '古窯清理級64野徑岔口', '古窯清理級64撿骨師營地']; const worst = Math.min(...keys.map((k) => res[k])); const ok = worst >= 0.9;
  const d = { h: P.duel(P.cleaners()[5], ['hunter'], 200, 5), e: P.duel(P.cleaners()[5], ['hunter_elite'], 200, 5), s: P.duel(P.starters()[5], ['hunter'], 200, 5) };
  lines.push('古窯清理級在 W=50、64 的離境率：最低 ' + r3(worst * 100) + '%（門檻 ≥90%，兩個目的地都算）→ ' + verdict(ok));
  lines.push('單挑勝率（滿血、2 瓶藥）：古窯清理級・流民 對獵人 ' + r3(d.h.win) + '、對精銳 ' + r3(d.e.win) + '；起手・流民 對獵人 ' + r3(d.s.win) + '。起手玩家談判成功率在 W=50 只剩下限 0.05（0.3−0.005×50）。');
  return { id: 'K4', title: '賞金獵人', measured: '古窯清理級離境率 W=50：' + r3(res[keys[0]] * 100) + '%／' + r3(res[keys[1]] * 100) + '%；W=64：' + r3(res[keys[2]] * 100) + '%／' + r3(res[keys[3]] * 100) + '%（岔口／撿骨師營地）', threshold: 'W=50、64 古窯清理級離境 ≥90%', pass: ok, suggest: '—', rerun: '—', lines };
}
module.exports = { run, setupHunters };
