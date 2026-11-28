'use strict';
// S5 委託板可讀性
const Wd = require('../lib/world');
const { r3, prob, writeCsv, verdict, wrnd, clamp, wilson } = require('../lib/util');
function sample(B, n) { let k = 0; const p = clamp((B - 20) / 80, 0, 0.5); for (let i = 0; i < n; i++) if (wrnd(12345, 'S5-kill-B' + B, 0, i) < p) k++; return k; }
function boards(dedup) {
  let mx = 0, sum = 0, n = 0, over = 0, seedsOver = 0; const hist = {};
  for (let s = 0; s < 200; s++) { const W = Wd.newWorld(s, {}); W.dedupKill = dedup; let so = false; for (let d = 1; d <= 120; d++) { const h = Wd.tick(W); sum += h.banditShare; n++; if (h.banditShare > mx) mx = h.banditShare; if (h.banditShare > 0.2 + 1e-9) { over++; so = true; } const k = Math.round(h.banditShare * h.nQuests); hist[k] = (hist[k] || 0) + 1; } if (so) seedsOver++; }
  return { mx, mean: sum / n, over, n, seedsOver, hist };
}
function run() {
  const N = 20000, k60 = sample(60, N), k30 = sample(30, N), k60a = sample(60, 1000), k30a = sample(30, 1000);
  const c1 = Math.abs(k60 / N - 0.5) <= 0.03 && Math.abs(k30 / N - 0.125) <= 0.03 && Math.abs(k60a / 1000 - 0.5) <= 0.03 && Math.abs(k30a / 1000 - 0.125) <= 0.03;
  const a = boards(true), b = boards(false);
  const c2 = a.mx <= 0.2 + 1e-9;
  writeCsv('S5', ['metric', 'value', 'extra'], [['kill 抽樣 B=60 劫匪題占比 (n=20000)', k60 / N, wilson(k60, N).map(r3).join('–')], ['kill 抽樣 B=30 劫匪題占比 (n=20000)', k30 / N, wilson(k30, N).map(r3).join('–')], ['B=60 (n=1000)', k60a / 1000, ''], ['B=30 (n=1000)', k30a / 1000, ''],
    ['B 組 委託板劫匪題占比 最大日值（同種敵人不重複）', a.mx, '平均 ' + r3(a.mean)], ['B 組 最大日值（劫匪題不套去重）', b.mx, '平均 ' + r3(b.mean) + '；超過 20% 的板日 ' + b.over + '/' + b.n]].concat(Object.keys(b.hist).map((k) => ['不去重：同日劫匪題張數=' + k, b.hist[k], ''])));
  const lines = ['kill 類抽樣：B=60 劫匪題 ' + prob(k60, N) + '（門檻 50%±3pp；前 1000 張 ' + r3(k60a / 10) + '%）；B=30 ' + prob(k30, N) + '（門檻 12.5%±3pp；前 1000 張 ' + r3(k30a / 10) + '%）→ ' + verdict(c1),
    'B 組（200 seed×120 天，三塊委託板各補到 3 張，game.js:888-911）全部每日生成委託裡劫匪題占比：最大日值 ' + r3(a.mx * 100) + '%、平均 ' + r3(a.mean * 100) + '%（門檻 ≤20%）→ ' + verdict(c2),
    '　上面沿用現況「同一種敵人的獵殺委託不重複貼」（game.js:900），所以全區同時最多 1 張劫匪題（1/9）。',
    '　若劫匪題不套這條去重：最大日值 **' + r3(b.mx * 100) + '%**、平均 ' + r3(b.mean * 100) + '%，超過 20% 的板日 ' + r3(b.over / b.n * 100) + '%、涉及 ' + b.seedsOver + '/200 個 seed（' + verdict(b.mx <= 0.2) + '）。見待決 Q-S5。',
    '　分母只算每日生成的委託（不含固定懸賞、救援委託、獸潮委託）；破曉營委託板全是 kill 類，也照同一機率出劫匪題。'];
  return { id: 'S5', title: '委託板可讀性', measured: 'B=60：' + r3(k60 / N * 100) + '%；B=30：' + r3(k30 / N * 100) + '%；B 組最大日值 ' + r3(a.mx * 100) + '%（不去重 ' + r3(b.mx * 100) + '%）', threshold: '50%±3pp；12.5%±3pp；最大日值 ≤20%', pass: c1 && c2, passNote: b.mx > 0.2 ? '沿用現況去重才通過；不去重最大 ' + r3(b.mx * 100) + '%' : '', suggest: '—', rerun: '—', lines };
}
module.exports = { run };
