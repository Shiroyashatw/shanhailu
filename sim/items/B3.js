'use strict';
// B3 黑水聲望升檔速度
const g = require('../lib/game');
const { r3, writeCsv, verdict, prng, median, quantile } = require('../lib/util');
const SEEDS = 1000, MAXN = 200;
/* 【假設】典型夜間出貨（規格只給方向；「劫道照 SPEC-02 掉落」那張表我讀不到，以下用 data.js 現有物價代替，見待決 Q-B3）
 * - 每晚做一件事：偷竊或劫道各半。
 *   偷竊：一半拿到銀兩 5–15（銀兩不是貨，鬼市成交原價 0）；一半拿到一件雜物，原價取天星分號／關市的非背包貨價（data.js:318,327）隨機一件。
 *   劫道：搶到行商的跑商貨 2–6 件（鹽 4／生鐵 5／山藥 5／燻皮 6，data.js:318,327 的店價）＋銀兩 8–20（銀兩不計）。
 * - 模型 A：當晚拿到什麼就當晚賣。模型 B：攢到原價合計 ≥40 才去賣一次（聰明的賣法）。rep += min(3, floor(當日成交原價/divisor))，divisor 規格值 40。 */
function nightly(r) {
  const D = g.data();
  if (r() < 0.5) { if (r() < 0.5) return 0; const pool = D.BUILDINGS.hy_market.stock.concat(D.BUILDINGS.dy_market.stock).filter((x) => !(D.BASES[x[0]] && D.BASES[x[0]].slot === 'bag')); return pool[Math.floor(r() * pool.length)][1]; }
  const goods = [4, 5, 5, 6]; const k = 2 + Math.floor(r() * 5); let v = 0; for (let i = 0; i < k; i++) v += goods[Math.floor(r() * 4)]; return v;
}
function sim(divisor, batch) {
  const n10 = [], n20 = []; let sumV = 0, nights = 0;
  for (let s = 0; s < SEEDS; s++) {
    const r = prng(s, 'B3'); let rep = 0, stock = 0, a = null, b = null;
    for (let n = 1; n <= MAXN && b === null; n++) {
      const v = nightly(r); sumV += v; nights++; stock += v;
      if (!batch || stock >= divisor) { rep += Math.min(3, Math.floor(stock / divisor)); stock = 0; }
      if (a === null && rep >= 10) a = n; if (rep >= 20) b = n;
    }
    n10.push(a === null ? MAXN + 1 : a); n20.push(b === null ? MAXN + 1 : b);
  }
  return { n10, n20, meanV: sumV / nights };
}
const show = (a) => { const m = median(a); return (m > MAXN ? '>' + MAXN : r3(m)) + '（P10 ' + r3(quantile(a, 0.1)) + '、P90 ' + (quantile(a, 0.9) > MAXN ? '>' + MAXN : r3(quantile(a, 0.9))) + '）'; };
function run() {
  const A = sim(40, false), B = sim(40, true); const csv = [];
  const ok = (x) => median(x.n10) >= 7 && median(x.n10) <= 14 && median(x.n20) >= 14 && median(x.n20) <= 28;
  const lines = ['每晚到手貨物的原價平均 ' + r3(A.meanV) + ' 兩（偷竊拿到銀兩的夜晚是 0）。', '| 模型 | divisor | 到 rep 10 的夜數（中位） | 到 rep 20 的夜數（中位） | 結果 |', '|---|---|---|---|---|',
    '| A 當晚賣 | 40 | ' + show(A.n10) + ' | ' + show(A.n20) + ' | ' + verdict(ok(A)) + ' |', '| B 攢到 ≥40 再賣 | 40 | ' + show(B.n10) + ' | ' + show(B.n20) + ' | ' + verdict(ok(B)) + ' |'];
  csv.push(['A', 40, median(A.n10), median(A.n20)], ['B', 40, median(B.n10), median(B.n20)]);
  lines.push('門檻：中位 rep10 在 7–14 夜、rep20 在 14–28 夜（目標約 10／20 夜）。每晚只有十幾兩的貨，÷40 取整多半是 0；就算攢著賣，也只有每晚 ' + r3(A.meanV / 40) + ' 點。');
  // divisor 掃描（批次賣）
  const scan = [40, 30, 25, 20, 15, 12, 10, 8].map((d) => { const x = sim(d, true); csv.push(['B-scan', d, median(x.n10), median(x.n20)]); return [d, median(x.n10), median(x.n20), ok(x)]; });
  lines.push('divisor 掃描（模型 B）：' + scan.map(([d, a, b, k]) => d + '→' + (a > MAXN ? '>' + MAXN : r3(a)) + '／' + (b > MAXN ? '>' + MAXN : r3(b)) + (k ? '✓' : '')).join('；') + '。');
  let sug = '—', rer = '—'; const pass = ok(A) && ok(B);
  if (!pass) {
    const best = scan.filter((x) => x[3]).sort((p, q) => Math.abs(p[1] - 10) - Math.abs(q[1] - 10))[0];
    if (best) { const d = best[0]; const A2 = sim(d, false), B2 = sim(d, true);
      lines.push('', '重跑（建議值：floor(當日成交原價/' + d + ')）：模型 A rep10 ' + show(A2.n10) + '、rep20 ' + show(A2.n20) + ' → ' + verdict(ok(A2)) + '；模型 B rep10 ' + show(B2.n10) + '、rep20 ' + show(B2.n20) + ' → ' + verdict(ok(B2)));
      csv.push(['A-rerun', d, median(A2.n10), median(A2.n20)], ['B-rerun', d, median(B2.n10), median(B2.n20)]);
      sug = 'rep 公式的除數 40→' + d + '（或等效：夜間贓貨原價平均要到 ' + r3(40 * A.meanV / d) + ' 兩／夜）'; rer = '除數 ' + d + '：當晚賣 ' + r3(median(A2.n10)) + '／' + r3(median(A2.n20)) + ' 夜（' + verdict(ok(A2)) + '）、攢著賣 ' + r3(median(B2.n10)) + '／' + r3(median(B2.n20)) + ' 夜（' + verdict(ok(B2)) + '）'; }
  }
  writeCsv('B3', ['model', 'divisor', 'median_nights_rep10', 'median_nights_rep20'], csv);
  const f = (x) => (x > MAXN ? '>' + MAXN : r3(x));
  return { id: 'B3', title: '黑水聲望升檔速度', measured: '當晚賣：rep10 ' + f(median(A.n10)) + ' 夜、rep20 ' + f(median(A.n20)) + ' 夜；攢著賣：' + f(median(B.n10)) + '／' + f(median(B.n20)) + ' 夜（每晚貨值平均 ' + r3(A.meanV) + ' 兩）', threshold: 'rep10 中位 7–14 夜；rep20 中位 14–28 夜', pass, suggest: sug, rerun: rer, lines };
}
module.exports = { run };
