'use strict';
// T4 遇險率變化（新舊規則）
const T = require('../lib/time');
const { data } = require('../lib/game');
const { r3, prob, writeCsv, verdict, prng } = require('../lib/util');
const H = (h, m) => h * 60 + (m || 0);
function leg(name, t0, hours, base, o) {
  o = o || {}; const st = T.walkStats(0, t0, hours, o.wx || 'sun');
  const n = T.riskNew({ base, R: o.R === undefined ? 1 : o.R, meanW: o.meanW === undefined ? st.meanW : o.meanW, wxRisk: o.wxRisk === undefined ? st.wxRisk : o.wxRisk, over: o.over, tide: o.tide });
  const old = T.riskOld({ base, t0, over: o.over, tide: o.tide });
  return { name, depart: T.fmtClock(t0), hours, base, meanW: o.meanW === undefined ? st.meanW : o.meanW, raw: n.raw, risk: n.risk, old };
}
function run() {
  const D = data(); const E = (a, b) => D.EDGES.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const ck = E('huiyao', 'chakou').h, qw = E('chakou', 'qingwu').h, fz = E('huiyao', 'fuzhao').h;
  const legs = [];
  // A 典型夜行任務（主讀法）：20:00 灰窯→野徑岔口（逃兵委託點，data.js:421），辦事 1h，回城；去、回各 1 段野徑單段
  const A = [leg('A 去 灰窯→岔口', H(20), ck, 0.22), leg('A 回 岔口→灰窯', H(20) + ck * 60 + 60, ck, 0.22)];
  // B 另一讀法：去青霧藥林（狼／蟲委託點），一次走完 2 邊（多段野徑 0.30）
  const B = [leg('B 去 灰窯→岔口→藥林（一次走完）', H(20), ck + qw, 0.30), leg('B 回', H(20) + (ck + qw) * 60 + 60, ck + qw, 0.30)];
  // C 同 B 但逐邊停（4 段野徑單段）
  const C = [0, 1, 2, 3].map((i) => leg('C 逐邊停 第' + (i + 1) + '段', H(20) + i * 60 + (i >= 2 ? 60 : 0), 1, 0.22));
  const others = [
    leg('整段黑夜 野徑單段 1h（20:00）', H(20), 1, 0.22),
    leg('19:00 出發 野徑單段 2h 灰窯→腐骨沼（跨黃昏→黑夜）', H(19), fz, 0.22),
    leg('19:00 出發 野徑單段 1h（全在黃昏）', H(19), 1, 0.22),
    leg('霧晨 06:00 野徑單段 1h', H(6), 1, 0.22, { wx: 'fog' }),
    leg('獸潮期 白天 野徑單段 1h', H(10), 1, 0.22, { tide: true }),
    leg('獸潮期 黑夜 野徑單段 1h', H(21), 1, 0.22, { tide: true }),
    leg('最壞組合：超載＋獸潮＋霧＋多段野徑＋R=1.8＋整段黑夜', H(21), 2, 0.30, { over: true, tide: true, R: 1.8, wxRisk: 1.2, meanW: 1 }),
  ];
  const all = A.concat(B, C, others);
  const pAny = (ls, k) => 1 - ls.reduce((a, l) => a * (1 - Math.min(1, l[k])), 1), exp = (ls, k) => ls.reduce((a, l) => a + Math.min(1, l[k]), 0);
  // 蒙地卡羅覆核（主讀法 A）
  let hit = 0; const N = 20000;
  for (let s = 0; s < N; s++) { const r = prng(s, 'T4'); if (A.some((l) => r() < l.risk)) hit++; }
  writeCsv('T4', ['case', 'depart', 'hours', 'base', 'mean_w', 'new_uncapped', 'new_risk', 'old_risk'], all.map((l) => [l.name, l.depart, l.hours, l.base, l.meanW, l.raw, l.risk, l.old])
    .concat([['A 全程至少一次', '', '', '', '', '', pAny(A, 'risk'), pAny(A, 'old')], ['A 全程期望遇敵數', '', '', '', '', '', exp(A, 'risk'), exp(A, 'old')], ['B 全程至少一次', '', '', '', '', '', pAny(B, 'risk'), pAny(B, 'old')], ['C 全程至少一次', '', '', '', '', '', pAny(C, 'risk'), pAny(C, 'old')]]));
  const c1 = all.every((l) => l.risk <= 0.85 + 1e-12);
  const c2 = pAny(A, 'risk') <= 0.85 && A.every((l) => l.risk <= 0.85);
  const c3 = Math.abs(others[0].risk - 0.44) < 1e-9 && Math.abs(others[0].old - 0.44) < 1e-9;
  const worst = others[6], x19 = others[1];
  const lines = ['| 情境 | 出發 | 時數 | mean(w) | 新（未封頂） | 新 | 舊 |', '|---|---|---|---|---|---|---|'].concat(all.map((l) => '| ' + [l.name, l.depart, l.hours, r3(l.meanW), r3(l.raw), r3(l.risk), r3(l.old)].join(' | ') + ' |'));
  lines.push('① 所有組合 risk ≤0.85：最大 ' + r3(Math.max(...all.map((l) => l.risk))) + '（最壞組合未封頂 ' + r3(worst.raw) + '，手算 2.72）→ ' + verdict(c1));
  lines.push('② 典型夜行任務（主讀法 A：去回各一段）：每段 新 ' + r3(A[0].risk) + '／舊 ' + r3(A[0].old) + '；全程期望遇敵 新 ' + r3(exp(A, 'risk')) + '／舊 ' + r3(exp(A, 'old')) + '；至少一次 新 ' + r3(pAny(A, 'risk')) + '（蒙地卡羅 ' + prob(hit, N) + '）→ ' + verdict(c2));
  lines.push('　 另一讀法 B（去 2 邊外的青霧藥林、一次走完）：每段 ' + r3(B[0].risk) + '、至少一次 ' + r3(pAny(B, 'risk')) + '（' + verdict(pAny(B, 'risk') <= 0.85) + '）；讀法 C（同路線逐邊停、4 段）：每段 ' + r3(C[0].risk) + '、至少一次 **' + r3(pAny(C, 'risk')) + '**（' + verdict(pAny(C, 'risk') <= 0.85) + '）。見待決 Q-T4。');
  lines.push('③ 整段黑夜野徑單段：新 ' + r3(others[0].risk) + '、舊 ' + r3(others[0].old) + ' → ' + verdict(c3));
  lines.push('19:00 出發走 2h：新 ' + r3(x19.risk) + '（手算 0.385）、舊 ' + r3(x19.old) + '（手算 0.22）。');
  lines.push('註：「霧」只在 05:00–10:00 出現，該時段 w 最多 0.25，所以最壞組合的 2.72 是純公式上界，實際組不出來；實際可達的上界是 0.30×1.8×2×1.15（雪）×1.4×1.5＝' + r3(0.30 * 1.8 * 2 * 1.15 * 1.4 * 1.5) + '，同樣被 0.85 封頂。');
  const ok = c1 && c2 && c3;
  return { id: 'T4', title: '遇險率變化', measured: '最大 risk ' + r3(Math.max(...all.map((l) => l.risk))) + '；夜行任務每段 ' + r3(A[0].risk) + '、至少一次 ' + r3(pAny(A, 'risk')) + '；整段黑夜 新 ' + r3(others[0].risk) + '＝舊 ' + r3(others[0].old), threshold: '①≤0.85 ②至少一次 ≤0.85、每段 ≤0.85 ③新＝舊＝0.44', pass: ok,
    passNote: pAny(C, 'risk') > 0.85 ? '主讀法通過；若任務點在 2 邊外且玩家逐邊停，至少一次 ' + r3(pAny(C, 'risk')) + ' >0.85' : '', suggest: '—', rerun: '—', lines };
}
module.exports = { run };
