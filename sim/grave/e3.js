'use strict';
/* E3／E5／E6（與 E4 的盜墓曲線）：跑 yard.runSeed，200 seeds（seed＝0..199）× 120 天；E3／E5／E6 只取前 60 天。 */
const { U, CIV, CLEAN, writeCsv, r2, H } = require('./common');
const Y = require('./yard');
const SK = ['night_probe', 'night_blind', 'day', 'dusk'], MT = ['quick', 'fine'], TK = [1, 3];
const MTN = { quick: '快撬', fine: '細取' };
const SEEDS = 200, DAYS = 120, D60 = 60;
function runAll(log) {
  const out = []; let kk = 70;
  [CIV, CLEAN()].forEach((tpl, pi) => SK.forEach((sk) => MT.forEach((mt) => TK.forEach((tk) => {
    const runs = []; for (let s = 0; s < SEEDS; s++) runs.push(Y.runSeed(s, sk, mt, tk, tpl, kk, DAYS));
    out.push({ tpl, pi, sk, mt, tk, kk, runs }); kk++; if (log) log('E3 ' + tpl.name + ' ' + sk + ' ' + mt + ' ' + tk);
  }))));
  return out;
}
function agg(G) {
  const A = { nGr: 0, sumP: 0, seen: 0, nNK: 0, pNK: 0, seenNK: 0, nKin: 0, pKin: 0, seenKin: 0, v65: 0, onsite: 0, walk: 0, sellH: 0, outings: 0, outV: 0, K60: [], minK60: [], W1max: 0, W2max: 0, W1max120: 0, W2max120: 0, w20_1: [], w20_2: [], corrupt60: [], rise: 0, riseWin: 0, riseDead: 0, dead60: 0, k30: [], k100: [], kret60: [], kret60max: -Infinity, silver60: [], inv60: [], silver120: [], inv120: [], exhaust: [], postIncome: [], postSteady: [], cleanse60: [], gr60: [], curve: Array(DAYS + 1).fill(0), curveInv: Array(DAYS + 1).fill(0), Kcurve: Array(DAYS + 1).fill(0), Kretcurve: Array(DAYS + 1).fill(0), feud: 0 };
  G.runs.forEach((x) => {
    const L = x.log; const gr = L.graves.filter((g) => g.day <= D60);
    A.gr60.push(gr.length);
    gr.forEach((g) => { A.nGr++; A.sumP += g.P; A.seen += g.seen ? 1 : 0; if (g.A.kinLam) { A.nKin++; A.pKin += g.P; A.seenKin += g.seen ? 1 : 0; } else { A.nNK++; A.pNK += g.P; A.seenNK += g.seen ? 1 : 0; } A.v65 += g.v65; if (g.rise) { A.rise++; if (g.riseWin) A.riseWin++; if (g.riseDead) A.riseDead++; } });
    L.outings.filter((o) => o.day <= D60).forEach((o) => { A.onsite += o.onsite; A.walk += o.walk; A.outings++; A.outV += o.v65; });
    L.sells.filter((o) => o.day <= D60).forEach((o) => (A.sellH += o.hours));
    const t61 = L.traj[D60 + 1], t121 = L.traj[DAYS + 1];
    A.K60.push(t61.K); A.kret60.push(t61.Kret); if (t61.Kret > A.kret60max) A.kret60max = t61.Kret;
    let m1 = 0, m2 = 0, m1b = 0, m2b = 0, f1 = null, f2 = null, mk = 0;
    for (let d = 2; d <= DAYS + 1; d++) { const tr = L.traj[d]; if (d <= D60 + 1) { m1 = Math.max(m1, tr.W1); m2 = Math.max(m2, tr.W2); mk = Math.min(mk, tr.K); } m1b = Math.max(m1b, tr.W1); m2b = Math.max(m2b, tr.W2); if (f1 === null && tr.W1 >= 20) f1 = d; if (f2 === null && tr.W2 >= 20) f2 = d; }
    A.minK60.push(mk); A.W1max = Math.max(A.W1max, m1); A.W2max = Math.max(A.W2max, m2); A.W1max120 = Math.max(A.W1max120, m1b); A.W2max120 = Math.max(A.W2max120, m2b);
    A.w20_1.push(f1); A.w20_2.push(f2);
    A.corrupt60.push(t61.corrupt);
    if (x.status === 'dead' && x.st.deaths <= D60) A.dead60++;
    A.k30.push(x.st.k30day !== undefined && x.st.k30day <= D60 ? x.st.k30 : null); A.k100.push(x.st.k100day !== undefined && x.st.k100day <= D60 ? x.st.k100 : null);
    A.silver60.push(t61.silver); A.inv60.push(t61.inv); A.silver120.push(t121.silver); A.inv120.push(t121.inv);
    A.exhaust.push(x.st.exhaustDay);
    if (x.st.exhaustDay !== null && x.st.exhaustDay < DAYS && x.status !== 'dead') { const d0 = x.st.exhaustDay; const v = L.traj[DAYS + 1].value65 - L.traj[d0 + 1].value65; A.postIncome.push(v / (DAYS - d0)); if (d0 + 10 < DAYS) { A.postSteady.push((L.traj[DAYS + 1].value65 - L.traj[d0 + 11].value65) / (DAYS - d0 - 10)); } }
    for (let d = 1; d <= DAYS; d++) { const tr = L.traj[d + 1]; A.curve[d] += tr.silver / SEEDS; A.curveInv[d] += (tr.silver + tr.inv * 0.65) / SEEDS; A.Kcurve[d] += tr.K / SEEDS; A.Kretcurve[d] += tr.Kret / SEEDS; }
    A.feud += x.st.kinFeud;
  });
  return A;
}
const pc = (x) => U.r3(x * 100) + '%';
function run(log) {
  const all = runAll(log); const R = all.map((G) => ({ G, A: agg(G) }));
  const reg = Y.regression();
  const lines3 = [], lines5 = [], lines6 = [], csv = [], csvCurve = [];
  // ---- E3 ----
  lines3.push('樣本：每組 200 seeds（seed＝0..199）× 120 天跑一次，E3 只取前 60 天；2 種玩家 × 4 時段 × 2 開棺法 × 2 取件數＝32 組。戰鬥種子 50000+1000×k+seed（k＝組號 70–101），玩家亂數 prng(seed,"grave:策略:開棺:取件")，世界（墳、陪葬、新墳、夜巡窗、天候）只看 seed。', '');
  lines3.push('**P 公式回歸**（G4 手算條件：曝光 3h、無天候、快撬段不乘，夜巡窗四種組合各 1/4 平均）：', '', '| 情境 | 手算 | 重算 | 差 |', '|---|---|---|---|');
  reg.rows.forEach(([n, h, v]) => lines3.push('| ' + [n, pc(h), pc(v), U.r3((v - h) * 100) + 'pp'].join(' | ') + ' |'));
  lines3.push('', '回歸 → **' + (reg.ok ? '全部重現（容差 0.1pp）' : '有不符') + '**。', '', '補充（不判，同條件但開棺段乘快撬 1.5）：' + reg.extra.map(([n, v]) => n + ' ' + pc(v)).join('；') + '。黑夜不探時開棺段常落在夜巡窗（λ 0.26×1.5＝0.39），所以快撬組會比手算 21.4% 高約 3pp 以上。', '');
  lines3.push('| 玩家 | 時段 | 開棺 | 取件 | 60 天開墳數／seed | 單座目擊率（模型期望 P 平均） | 實際被看見比例 | 非遺屬墳 P | 遺屬／新墳 P | 手算對照 | 差 | ±3pp | 每趟（夜）收入 | 現場時薪 | 含路程（含出手）時薪 | 第 60 日 K 平均 | W 最高（−1.5／−0.75） | 60 天侵蝕累計 | 屍變戰（勝率） | 60 天內死亡 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const judged = [];
  R.forEach(({ G, A }) => {
    const pNK = A.nNK ? A.pNK / A.nNK : NaN, pK = A.nKin ? A.pKin / A.nKin : NaN, pAll = A.sumP / A.nGr;
    const ref = G.sk === 'day' ? (G.mt === 'quick' ? Y.HAND.dayQuick : Y.HAND.day) : Y.HAND[G.sk];
    const cmp = pNK; const diff = cmp - ref; const ok = Math.abs(diff) <= 0.03;
    if (G.mt === 'quick') judged.push({ G, ok, diff, cmp, ref });
    const onsite = A.v65 / A.onsite, total = A.v65 / (A.onsite + A.walk + A.sellH);
    lines3.push('| ' + [G.tpl.name, Y.STRATS[G.sk].name, MTN[G.mt], G.tk, r2(U.mean(A.gr60)), pc(pAll), pc(A.seen / A.nGr), pc(pNK) + '（' + A.nNK + '）', A.nKin ? pc(pK) + '（' + A.nKin + '）' : '—', pc(ref), U.r3(diff * 100) + 'pp', G.mt === 'quick' ? (ok ? '過' : '**不過**') : '（細取不判）', r2(A.outV / A.outings), r2(onsite) + '（' + U.r3(onsite / H) + 'H）', r2(total) + '（' + U.r3(total / H) + 'H）', r2(U.mean(A.K60)), r2(A.W1max) + '／' + r2(A.W2max), r2(U.mean(A.corrupt60)), A.rise ? A.rise + '（' + pc(A.riseWin / A.rise) + '）' : '0', A.dead60 + '/200'].join(' | ') + ' |');
    csv.push([G.tpl.name, G.sk, G.mt, G.tk, SEEDS, U.mean(A.gr60), pAll, A.seen / A.nGr, pNK, A.nNK, pK, A.nKin, ref, diff, A.outV / A.outings, onsite, total, U.mean(A.K60), A.W1max, A.W2max, U.mean(A.corrupt60), A.rise, A.riseWin, A.riseDead, A.dead60, U.mean(A.silver60), U.mean(A.inv60), U.mean(A.silver120), U.mean(A.inv120), A.postIncome.length ? U.mean(A.postIncome) : '', A.postSteady.length ? U.mean(A.postSteady) : '', U.median(A.exhaust.filter((x) => x !== null))]);
  });
  const e3ok = reg.ok && judged.every((j) => j.ok);
  lines3.push('', '「手算對照」：白天快撬用「白天含快撬段 48.0%」，白天細取用 44.9%，黃昏 31.9%，黑夜探過避窗 3.0%，黑夜不探 21.4%（平均）。比的是非遺屬墳的模型期望 P（遺屬／新墳另列；黃昏遺屬墳手算 52.5%）。模型含天候倍率（雨 0.8、霧 0.7）與開棺段倍率（快撬 1.5、細取 0.7），所以和手算不會完全一樣；判準只對快撬組判（細取的曝光是 3.5h，手算沒有對應值）。',
    '每趟收入＝該趟從墳裡拿到的東西：銅錢面額＋物品×渡口 0.65（快撬損壞已扣）。現場時薪＝收入÷現場時數（探＋挖＋開棺＋回填）；含路程時薪＝收入÷（現場＋破曉營往返古窯＋到沼地渡口出手的來回）。',
    '判準：單座目擊率在 G4 手算 ±3pp 且 P 公式回歸 → 快撬 16 組中 ' + judged.filter((j) => j.ok).length + ' 組在 ±3pp 內 → **' + U.verdict(e3ok) + '**' + (e3ok ? '' : '（不過的組：' + judged.filter((j) => !j.ok).map((j) => j.G.tpl.name + '・' + Y.STRATS[j.G.sk].name + '・取' + j.G.tk + ' ' + pc(j.cmp) + ' 對 ' + pc(j.ref)).join('；') + '）') + '。');
  writeCsv('E3-yard', ['player', 'strategy', 'open', 'take', 'seeds', 'graves60_per_seed', 'P_mean', 'seen_rate', 'P_nonkin', 'n_nonkin', 'P_kin', 'n_kin', 'hand_ref', 'diff', 'income_per_outing', 'perH_onsite', 'perH_total', 'K_day60_mean', 'W_max_decay1.5', 'W_max_decay0.75', 'corrupt60_mean', 'rise_fights', 'rise_wins', 'rise_deaths', 'dead60', 'silver_day60_mean', 'inv_day60_mean', 'silver_day120_mean', 'inv_day120_mean', 'post_exhaust_income_per_day', 'post_exhaust_plus10_income_per_day', 'exhaust_day_median'], csv);
  // ---- E5 ----
  lines5.push('樣本同 E3（200 seeds × 60 天；另列 120 天）。W 起點 0；目擊＝次日 00:00 +10、封頂 49；消退 −1.5/日（主讀法：破曉營、古窯在王法管轄外）與 −0.75/日（在管轄內）兩條同時記。', '',
    '| 玩家 | 時段 | 開棺 | 取件 | 60 天內到 W≥20（−1.5）| 中位天數（到的 seed） | 60 天內到 W≥20（−0.75） | 中位天數 | 120 天內到（−1.5／−0.75） | W 最高（60／120 天） | W>49 |', '|---|---|---|---|---|---|---|---|---|---|---|');
  let wOk = true, w49 = true; const e5 = [];
  R.forEach(({ G, A }) => {
    const in60a = A.w20_1.filter((d) => d !== null && d <= D60 + 1), in60b = A.w20_2.filter((d) => d !== null && d <= D60 + 1);
    const in120a = A.w20_1.filter((d) => d !== null), in120b = A.w20_2.filter((d) => d !== null);
    if (A.W1max120 > 49 || A.W2max120 > 49) w49 = false;
    if (G.sk === 'night_probe' && in60a.length / SEEDS >= 0.05) wOk = false;
    e5.push({ G, a: in60a.length / SEEDS, b: in60b.length / SEEDS });
    lines5.push('| ' + [G.tpl.name, Y.STRATS[G.sk].name, MTN[G.mt], G.tk, U.pw ? '' : '', '', '', '', '', '', ''].slice(0, 4).concat([pc(in60a.length / SEEDS) + '（' + in60a.length + '/200）', in60a.length ? r2(U.median(in60a.map((d) => d - 1))) : '—', pc(in60b.length / SEEDS) + '（' + in60b.length + '/200）', in60b.length ? r2(U.median(in60b.map((d) => d - 1))) : '—', in120a.length + '／' + in120b.length, r2(Math.max(A.W1max, A.W2max)) + '／' + r2(Math.max(A.W1max120, A.W2max120)), A.W1max120 > 49 || A.W2max120 > 49 ? '有' : '無']).join(' | ') + ' |');
  });
  const probe = e5.filter((x) => x.G.sk === 'night_probe');
  lines5.push('', '天數＝第幾日 00:00 結算後 W 第一次 ≥20，記為「第 d−1 日結束」。判準①黑夜探過避窗 60 天內到通緝 <5%：' + probe.map((x) => x.G.tpl.name + '・' + MTN[x.G.mt] + '・取' + x.G.tk + ' ' + pc(x.a)).join('；') + ' → **' + U.verdict(wOk) + '**；② W 從不超過 49 → **' + U.verdict(w49) + '**。');
  // ---- E6 ----
  lines6.push('樣本同 E3（200 seeds × 60 天）。K 起點 0；ΔK＝−8×T×V（開棺時一件）；出手每件 −1（tomb）／−4（family）。「挖＋全部歸還」是同一條挖墳軌跡的平行帳：拿到的每件（含銅錢）當天送回義莊，+0.5×T／件，受日常善單日上限（K<0 時 0.25，sim/items/K1.js capOf），不出手。', '',
    '| 玩家 | 時段 | 開棺 | 取件 | 第 60 日 K 平均（最低） | 到惡名 −30 的開墳數 中位（60 天內到的 seed） | 到兇名 −100 的開墳數 中位 | 挖＋全部歸還：第 60 日 K 平均 | 歸還軌 K 最高的 seed | 所有 seed 淨 ΔK<0 |', '|---|---|---|---|---|---|---|---|---|---|');
  let kOk = true;
  R.forEach(({ G, A }) => {
    const k30 = A.k30.filter((x) => x !== null), k100 = A.k100.filter((x) => x !== null);
    const ok = A.kret60max < 0 || A.gr60.every((n, i) => n === 0 ? true : A.kret60[i] < 0);
    const allNeg = A.kret60.every((k, i) => A.gr60[i] === 0 || k < 0);
    if (!allNeg) kOk = false;
    lines6.push('| ' + [G.tpl.name, Y.STRATS[G.sk].name, MTN[G.mt], G.tk, r2(U.mean(A.K60)) + '（' + r2(Math.min(...A.minK60)) + '）', k30.length ? r2(U.median(k30)) + '（' + k30.length + '/200）' : '—', k100.length ? r2(U.median(k100)) + '（' + k100.length + '/200）' : '—', r2(U.mean(A.kret60)), r2(A.kret60max), allNeg ? '是' : '**否**'].join(' | ') + ' |');
  });
  // K 軌跡 csv
  R.forEach(({ G, A }) => { for (let d = 1; d <= DAYS; d++) csvCurve.push([G.tpl.name, G.sk, G.mt, G.tk, d, A.curve[d], A.curveInv[d], A.Kcurve[d], A.Kretcurve[d]]); });
  writeCsv('E3-E6-daily-curves', ['player', 'strategy', 'open', 'take', 'day', 'silver_end_of_day_mean', 'silver_plus_inventory065_mean', 'K_mean', 'K_return_track_mean'], csvCurve);
  lines6.push('', '手算對照（一座墳的淨 ΔK，含歸還）：無名碑 被看見 −8＋min(3×0.5, 0.25)＝−7.75、沒被看見 −4＋0.25＝−3.75；孩童墓 −16＋0.25／−8＋0.25；歸還的善行在 K<0 時一天最多 +0.25，永遠補不回一座墳的 −4 起跳。',
    '判準：所有 seed 淨 ΔK（含歸還）<0 → **' + U.verdict(kOk) + '**。K 逐日平均軌跡見 `evidence/csv-grave/E3-E6-daily-curves.csv`。');
  return { R, reg, lines3, lines5, lines6, e3ok, wOk, w49, kOk, judged, e5 };
}
module.exports = { run, SK, MT, TK, MTN, SEEDS, DAYS };
