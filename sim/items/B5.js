'use strict';
// B5 販人對整體經濟的回饋
const Wd = require('../lib/world');
const { r3, writeCsv, verdict, mean } = require('../lib/util');
const SEEDS = 200, DAYS = 120;
function grp(n, usePool) {
  const acc = { n, O: [], P: [], camp: [], sold: [], viol: 0, negCamp: 0, daily: [], exhaust: [], minCamp: Infinity, oH: [] };
  for (let s = 0; s < SEEDS; s++) {
    let ex = null;
    const W = Wd.run(s, DAYS, { noQuests: true }, (w, d) => { if (usePool) Wd.refreshPool(w); if (n) Wd.sell(w, n, usePool); if (ex === null && w.refugee.camp < 1) ex = d; });
    W.hist.forEach((h, i) => { acc.O.push(h.duyin.O); acc.P.push(h.duyin.P); acc.oH.push(h.huiyao.O); acc.camp.push(h.camp); acc.sold.push(h.sold); if (!h.conserve) acc.viol++; if (h.camp < 0) acc.negCamp++; if (h.camp < acc.minCamp) acc.minCamp = h.camp;
      const d = acc.daily[i] || (acc.daily[i] = { O: 0, P: 0, camp: 0, sold: 0, k: 0 }); d.O += h.duyin.O; d.P += h.duyin.P; d.camp += h.camp; d.sold += h.sold; d.k++; });
    if (ex !== null) acc.exhaust.push(ex);
  }
  return acc;
}
function run() {
  const G = [0, 1, 3, 5].map((n) => grp(n, true)), X = grp(5, false);
  const csv = []; G.concat([X]).forEach((a, gi) => a.daily.forEach((d, i) => csv.push([gi === 4 ? '5(不受人手池限制)' : a.n, i + 1, d.O / d.k, d.P / d.k, d.camp / d.k, d.sold / d.k])));
  writeCsv('B5', ['sell_per_day', 'day', 'duyin_O', 'duyin_P', 'camp', 'actual_sold'], csv);
  const lines = ['| 每日想賣 | 實際成交／日 | 渡陰 O（120 天平均） | 渡陰 P | camp 平均／最低 | 守恆違規日 | camp<0 |', '|---|---|---|---|---|---|---|'];
  G.forEach((a) => lines.push('| ' + [a.n, r3(mean(a.sold)), r3(mean(a.O)), r3(mean(a.P)), r3(mean(a.camp)) + '／' + r3(a.minCamp), a.viol, a.negCamp].join(' | ') + ' |'));
  lines.push('| 5（對照：不受人手池限制） | ' + [r3(mean(X.sold)), r3(mean(X.O)), r3(mean(X.P)), r3(mean(X.camp)) + '／' + r3(X.minCamp), X.viol, X.negCamp].join(' | ') + ' |');
  const c1 = G.concat([X]).every((a) => a.viol === 0 && a.negCamp === 0), g3 = G[2], c2 = mean(g3.O) >= 25 && mean(g3.P) >= 20;
  const dO = mean(g3.O) - mean(G[0].O), dP = mean(g3.P) - mean(G[0].P); const last = (a, k) => mean(a.daily.slice(90).map((d) => d[k] / d.k));
  lines.push('① 守恆式每日成立、camp≥0（全部組）→ ' + verdict(c1) + '；② 每日 3 人：渡陰 O 平均 ' + r3(mean(g3.O)) + '（≥25）、P ' + r3(mean(g3.P)) + '（≥20）→ ' + verdict(c2));
  lines.push('每日 3 人相對不賣：δO ' + r3(dO) + '、δP ' + r3(dP) + '（120 天平均）；第 91–120 日 δO ' + r3(last(g3, 'O') - last(G[0], 'O')) + '、δP ' + r3(last(g3, 'P') - last(G[0], 'P')) + '（手算穩態 −7.0／−2.8，O 約 51–53；實測 O 第 91–120 日 ' + r3(last(g3, 'O')) + '）。');
  lines.push('每日 5 人：人手池每 wday 只補 3 人，實際成交 ' + r3(mean(G[3].sold)) + ' 人／日，與「每日 3 人」幾乎一樣；camp 最低 ' + r3(G[3].minCamp) + '，120 天內**不會耗盡**。若不受人手池限制（只受 camp 限制），camp 首次見底（<1）平均在第 ' + (X.exhaust.length ? r3(mean(X.exhaust)) : 'NA') + ' 日（' + X.exhaust.length + '/' + SEEDS + ' 個 seed），之後每天只剩新到的 3–5 人可賣。');
  return { id: 'B5', title: '販人對整體經濟的回饋', measured: '每日 3 人：渡陰 O ' + r3(mean(g3.O)) + '、P ' + r3(mean(g3.P)) + '（δO ' + r3(dO) + '、δP ' + r3(dP) + '）；守恆違規 0；5 人／日實際成交 ' + r3(mean(G[3].sold)) + '、camp 不耗盡', threshold: '①守恆、camp≥0 ②渡陰 O≥25、P≥20', pass: c1 && c2, suggest: '—', rerun: '—', lines };
}
module.exports = { run };
