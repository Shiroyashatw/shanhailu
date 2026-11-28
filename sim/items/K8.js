'use strict';
// K8 通緝擴散
const C = require('../lib/crime');
const { r3, prob, writeCsv, verdict, mean } = require('../lib/util');
const SEEDS = 200;
function run() {
  const cases = [['惡（同 K6，被捕即止）', 'evil', {}], ['惡（保守：永不被捕，擴散一路累積）', 'evil', { noArrest: true }], ['灰色（同 K6）', 'gray', {}], ['灰色（保守：永不被捕）', 'gray', { noArrest: true }]];
  const lines = ['| 玩法 | 軍規 W 進通緝（≥20） | 軍規 W 進重犯（≥50） | 軍規 W 最高（平均／最大） |', '|---|---|---|---|']; const csv = []; let worst = 0;
  cases.forEach(([n, st, o]) => { const a = []; for (let s = 0; s < SEEDS; s++) a.push(C.simulate(s, st, o)); const k20 = a.filter((x) => x.mil20).length, k50 = a.filter((x) => x.mil50).length; worst = Math.max(worst, k50 / SEEDS);
    lines.push('| ' + [n, prob(k20, SEEDS), prob(k50, SEEDS), r3(mean(a.map((x) => x.maxWm))) + '／' + r3(Math.max(...a.map((x) => x.maxWm)))].join(' | ') + ' |'); csv.push([n, SEEDS, k20 / SEEDS, k50 / SEEDS, mean(a.map((x) => x.maxWm)), Math.max(...a.map((x) => x.maxWm))]); });
  writeCsv('K8', ['style', 'seeds', 'p_mil_wanted20', 'p_mil_felon50', 'mean_max_Wm', 'max_Wm'], csv);
  const ok = worst <= 0.10;
  lines.push('只因擴散進到軍規重犯檔的 seed：最壞情境 ' + r3(worst * 100) + '%（門檻 ≤10%）→ ' + verdict(ok));
  lines.push('說明：殺良每次只擴散 +20（40×0.5），軍規那邊每 wday −1.0（已取最慢），15 天一次的殺良每輪只淨增約 5（還要每次都被看見，機率 0.57）；傷人擴散 +7.5，到不了通緝。玩家本人從不進破曉營，軍規 W 全部來自擴散。');
  return { id: 'K8', title: '通緝擴散', measured: '只因擴散進軍規重犯：最壞 ' + r3(worst * 100) + '%', threshold: '≤10% seed', pass: ok, suggest: '—', rerun: '—', lines };
}
module.exports = { run };
