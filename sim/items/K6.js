'use strict';
// K6 死刑比例
const C = require('../lib/crime');
const { r3, prob, writeCsv, verdict, mean } = require('../lib/util');
const SEEDS = 200;
function grp(style, o) { const a = []; for (let s = 0; s < SEEDS; s++) a.push(C.simulate(s, style, o)); return { death: a.filter((x) => x.sentence === 'death').length, front: a.filter((x) => x.sentence === 'front').length, K: mean(a.map((x) => x.K)), maxWk: mean(a.map((x) => x.maxWk)), day: mean(a.filter((x) => x.arrested).map((x) => x.day)), fines: mean(a.map((x) => x.fines)), a }; }
function run() {
  const good = grp('good'), gray = grp('gray'), grayC = grp('gray', { hurtIsFelony: true }), evil = grp('evil');
  const rows = [['善良（每 10 天偷竊 1 次）', good], ['灰色（每 10 天劫道、20% 傷人）— 主讀法', gray], ['灰色 — 保守讀法（傷人算重罪）', grayC], ['惡（每 15 天殺良 1 次）', evil]];
  const lines = ['| 玩法 | 判死刑 | 押前線 | 平均被捕日 | 期末善惡 K | 王法 W 最高（平均） | 罰錢次數 |', '|---|---|---|---|---|---|---|'];
  rows.forEach(([n, x]) => lines.push('| ' + [n, prob(x.death, SEEDS), r3(x.front / SEEDS), r3(x.day), r3(x.K), r3(x.maxWk), r3(x.fines)].join(' | ') + ' |'));
  writeCsv('K6', ['style', 'seeds', 'p_death', 'p_frontline', 'mean_arrest_day', 'mean_final_K', 'mean_max_W'], rows.map(([n, x]) => [n, SEEDS, x.death / SEEDS, x.front / SEEDS, x.day, x.K, x.maxWk]));
  const okMain = good.death / SEEDS <= 0.02 && gray.death / SEEDS <= 0.02, okCons = grayC.death / SEEDS <= 0.02;
  lines.push('善良 ' + r3(good.death / SEEDS * 100) + '%、灰色（主讀法）' + r3(gray.death / SEEDS * 100) + '%（門檻 ≤2%）→ ' + verdict(okMain) + '；灰色（保守讀法）' + r3(grayC.death / SEEDS * 100) + '% → ' + verdict(okCons) + '；惡玩法死刑 ' + r3(evil.death / SEEDS * 100) + '%、前線 ' + r3(evil.front / SEEDS * 100) + '%（量測）。');
  lines.push('說明：主讀法下善良與灰色玩法沒有重罪，走不到判決式，死刑必為 0。保守讀法把「傷人」當重罪：灰色玩家被捕時多半是惡名（Jk=0）→ J＝0＋0＋2＝2 → 前線；只有拖到期末掉進兇名（K≤−100，Jk=+3）才會 J=5 判死。「傷人／劫道算不算重罪」列為待決 Q-K6。');
  lines.push('惡玩法：第 1 次被看見的殺良 W=40（通緝），兩三次後進死罪檔即被捕；被捕時 K 多在 −100 以下，J＝3＋nKill＋2 ≥5。');
  return { id: 'K6', title: '死刑比例', measured: '善良 ' + r3(good.death / SEEDS * 100) + '%；灰色 ' + r3(gray.death / SEEDS * 100) + '%（保守讀法 ' + r3(grayC.death / SEEDS * 100) + '%）；惡 ' + r3(evil.death / SEEDS * 100) + '%', threshold: '善良、灰色 ≤2%；惡玩法報告', pass: okMain && okCons, passNote: okMain && !okCons ? '主讀法通過；保守讀法（傷人算重罪）未通過' : '', suggest: okMain && okCons ? '—' : '明訂「傷人」不列重罪（或 J 式對只有傷人者 −2）', rerun: okMain && okCons ? '—' : '傷人不算重罪：灰色死刑 ' + r3(gray.death / SEEDS * 100) + '%（' + verdict(okMain) + '）', lines };
}
module.exports = { run };
