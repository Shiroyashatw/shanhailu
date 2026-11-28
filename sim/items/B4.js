'use strict';
// B4 稅卡查驗率與鹽鐵進貨曲線
const g = require('../lib/game');
const { r3, prob, writeCsv, verdict, prng, mean } = require('../lib/util');
const SEEDS = 200, DAYS = 60;
/* 【假設】跑商玩家：每天在灰窯天星分號進貨 鹽 8＋生鐵 6（data.js:318 的每日庫存；買價 鹽 4、生鐵 5），走官道到渡陰賣（鹽 9（任務書）、生鐵 10（data.js:301）），當天往返（各 4h）。
 * 市價固定（SPEC-SEASON 未定，不納入季節價差）；不算議價加成、交易稅、遇險；n_mark=0。稅卡 P=min(cap,(0.10+slope·q_excess)×S_pub)，被查＝整批沒收（失本錢）。
 * 策略：不囤＝每天帶 14；囤兩日＝每 2 天帶一趟、件數在 20–28 均勻（先帶鹽）；囤三日＝每 3 天帶 42。 */
function trip(n) { const days = Math.ceil(n / 14); const salt = Math.min(n, 8 * days), iron = n - salt; return { n, cost: salt * 4 + iron * 5, profit: salt * 5 + iron * 5, q: Math.max(0, n - 16) }; }
function sim(strategy, sp, slope, cap) {
  const checks = [], perDay = [], evs = []; let zero = 0;
  for (let s = 0; s < SEEDS; s++) {
    const r = prng(s, 'B4' + strategy); let chk = 0, money = 0, trips = 0; const period = strategy === 'none' ? 1 : strategy === 'two' ? 2 : 3;
    for (let d = period; d <= DAYS; d += period) {
      const n = strategy === 'none' ? 14 : strategy === 'two' ? 20 + Math.floor(r() * 9) : 42; const t = trip(n); trips++;
      const p = t.q ? Math.min(cap, (0.10 + slope * t.q) * sp) : 0; evs.push((1 - p) * t.profit - p * t.cost);
      if (r() < p) { chk++; money -= t.cost; } else money += t.profit;
    }
    checks.push(chk); perDay.push(money / DAYS); if (chk === 0) zero++;
  }
  return { checks: mean(checks), zero, perDay: mean(perDay), ev: mean(evs), evPos: evs.filter((x) => x > 0).length / evs.length };
}
function table(sp, slope, cap, tag, csv) {
  const out = {}; ['none', 'two', 'three'].forEach((st) => { out[st] = sim(st, sp, slope, cap); const x = out[st]; csv.push([tag, st, sp, slope, cap, x.checks, x.zero / SEEDS, x.perDay, x.ev]); });
  return out;
}
const NM = { none: '不囤（14／趟）', two: '囤兩日（20–28／趟）', three: '囤三日（42／趟）' };
function run() {
  const csv = []; const A = table(1.21, 0.04, 0.75, '原值', csv), B = table(1.0, 0.04, 0.75, '原值', csv);
  const lines = ['| 策略 | 60 天被查次數（S_pub=1.21） | 全程 0 次被查的 seed | 每日利潤（兩） | 每趟 EV | S_pub=1.0：每趟 EV／每日利潤 |', '|---|---|---|---|---|---|'];
  ['none', 'two', 'three'].forEach((k) => lines.push('| ' + [NM[k], r3(A[k].checks), prob(A[k].zero, SEEDS), r3(A[k].perDay), r3(A[k].ev), r3(B[k].ev) + '／' + r3(B[k].perDay)].join(' | ') + ' |'));
  const c1 = A.none.zero === SEEDS && A.none.checks === 0, c2 = A.two.ev > 0 && A.three.ev > 0;
  lines.push('① 不囤策略被查 0 次（100% seed）→ ' + verdict(c1) + '；② 囤貨走官道 EV>0（S_pub=1.21）：囤兩日 ' + r3(A.two.ev) + '、囤三日 ' + r3(A.three.ev) + ' → ' + verdict(c2));
  const pt = (n, sp, sl, cp) => { const t = trip(n); const p = t.q ? Math.min(cp, (0.10 + sl * t.q) * sp) : 0; return n + ' 件 P=' + r3(p) + '、EV ' + r3((1 - p) * t.profit - p * t.cost); };
  lines.push('逐件數（S_pub=1.21）：' + [16, 18, 20, 22, 24, 25, 26, 28, 42].map((n) => pt(n, 1.21, 0.04, 0.75)).join('；') + '。損益兩平在 24–25 件；囤滿兩日（28 件）與三日（42 件）都是負的。');
  let sug = '—', rer = '—';
  if (!(c1 && c2)) {
    const sl = 0.02, cp = 0.50; const A2 = table(1.21, sl, cp, '建議值', csv); const ok2 = A2.none.zero === SEEDS && A2.two.ev > 0 && A2.three.ev > 0;
    lines.push('', '重跑（建議值：斜率 0.04→' + sl + '、封頂 0.75→' + cp + '；S_pub=1.21）：', '| 策略 | 被查次數 | 每日利潤 | 每趟 EV |', '|---|---|---|---|');
    ['none', 'two', 'three'].forEach((k) => lines.push('| ' + [NM[k], r3(A2[k].checks), r3(A2[k].perDay), r3(A2[k].ev)].join(' | ') + ' |'));
    lines.push('→ ' + verdict(ok2) + '。逐件數：' + [20, 28, 42].map((n) => pt(n, 1.21, sl, cp)).join('；') + '。此時每日利潤 不囤 ' + r3(A2.none.perDay) + ' > 囤兩日 ' + r3(A2.two.perDay) + ' > 囤三日 ' + r3(A2.three.perDay) + '，囤貨仍不划算但不至於虧本。');
    sug = '稅卡斜率 0.04→' + sl + '、封頂 0.75→' + cp + '（現值下損益兩平在 24–25 件）'; rer = '囤兩日 EV ' + r3(A2.two.ev) + '、囤三日 EV ' + r3(A2.three.ev) + '、不囤被查 ' + r3(A2.none.checks) + ' 次（' + verdict(ok2) + '）';
  }
  writeCsv('B4', ['round', 'strategy', 'S_pub', 'slope', 'cap', 'mean_checks_60d', 'p_zero_checks', 'profit_per_day', 'EV_per_trip'], csv);
  return { id: 'B4', title: '稅卡查驗率與鹽鐵進貨', measured: '不囤被查 ' + r3(A.none.checks) + ' 次（' + r3(A.none.zero / SEEDS * 100) + '% seed 為 0）；每趟 EV 囤兩日 ' + r3(A.two.ev) + '、囤三日 ' + r3(A.three.ev) + '；每日利潤 ' + r3(A.none.perDay) + '／' + r3(A.two.perDay) + '／' + r3(A.three.perDay), threshold: '①不囤 0 次 ②囤貨官道 EV>0', pass: c1 && c2, passNote: c1 && !c2 ? '①通過；②未通過' : '', suggest: sug, rerun: rer, lines };
}
module.exports = { run };
