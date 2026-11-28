'use strict';
/* num-shl-npc-gen2：SPEC-NPC v0.1（18:56 追加）第二輪人事與生成分布驗算。node sim/npc/run2.js
 * 產出 evidence/npc-gen2-results.md 與 evidence/csv-npc2/*.csv。固定 seed（0..199；N5／N6 開局另跑 100000..109999），重跑結果完全相同。
 * 第一輪（node sim/npc/run.js、model.js）不動。 */
const fs = require('fs');
const path = require('path');
const M = require('./model2');
const { mean, quantile, wilson, ROOT } = require('../lib/util');
const t00 = Date.now(); const log = (s) => console.log('[' + ((Date.now() - t00) / 1000).toFixed(1) + 's] ' + s);
const SEEDS = 200, DAYS = 1200, Y = M.YEAR;
const CSV_DIR = path.join(ROOT, 'evidence', 'csv-npc2');
function csv(id, header, rows) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : (Math.round(v * 1e6) / 1e6).toString()) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(CSV_DIR, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
const pc = (x, d) => (x * 100).toFixed(d === undefined ? 2 : d) + '%';
const f = (x, d) => (Number.isFinite(x) ? x.toFixed(d === undefined ? 3 : d) : 'NA');
const ci = (k, n) => { const [a, b] = wilson(k, n); return '[' + pc(a) + ', ' + pc(b) + ']'; };
const sum = (a) => a.reduce((s, x) => s + x, 0);
const v = (ok) => (ok ? '過' : '**不過**');
const vb = (ok) => (ok ? '過' : '不過');
const TN = M.TOWNS.map((t) => t.name);

// ---------- 主跑：200 seeds × 1,200 日 ----------
function runAll(opt, keep) {
  const out = [];
  for (let s = 0; s < SEEDS; s++) { const S = M.run(s, Object.assign({ days: DAYS }, opt)); if (!keep || !keep.includes(s)) { delete S.persons; delete S.alive; delete S.slots; } out.push(S); }
  return out;
}
const R = runAll({}, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); log('主跑 200 seeds 完成');
const R0 = runAll({ refugeePerDay: 0 }); log('敏感度：難民 0 完成');
const G0 = []; for (let s = 0; s < 10000; s++) { const S = M.run(100000 + s, { days: 0 }); G0.push({ flavHold: S.flavHold, flavRes: S.flavRes, f01: S.f01, nick: S.nick }); } log('開局生成 10,000 seeds 完成');

const res = [];
const sec = (t, lines) => { res.push('## ' + t, ''); lines.forEach((l) => res.push(l)); res.push(''); };
const summary = [];
const EXTRA = {}; // 給 issue 用

// ---------- N1 ----------
{
  const lines = []; const rows = [];
  const exp = { field: 0.18, mid: 0.09, street: 0.10 }; const tol = { field: 0.03, mid: 0.02, street: null };
  lines.push('| tier | 事件數 | 在任日數 | 每日 ĥ | 規則 h | 年率 1−(1−ĥ)^120 | 95% CI | 判準 | 結論 |', '|---|---|---|---|---|---|---|---|---|');
  const N1 = {};
  ['field', 'mid', 'street'].forEach((tier) => {
    const k = sum(R.map((S) => S.turn[tier][0])), n = sum(R.map((S) => S.turn[tier][1]));
    const h = k / n, [a, b] = wilson(k, n); const ann = (x) => 1 - Math.pow(1 - x, Y);
    const ok = tol[tier] === null ? null : Math.abs(ann(h) - exp[tier]) <= tol[tier];
    N1[tier] = { k, n, h, ann: ann(h), lo: ann(a), hi: ann(b), ok };
    lines.push('| ' + [tier, k, n, f(h, 6), f(M.H[tier], 6), pc(ann(h)), '[' + pc(ann(a)) + ', ' + pc(ann(b)) + ']', tol[tier] === null ? '（無判準）' : pc(exp[tier], 0) + '±' + pc(tol[tier], 0), ok === null ? '—' : v(ok)].join(' | ') + ' |');
    rows.push([tier, k, n, h, M.H[tier], ann(h), ann(a), ann(b)]);
  });
  csv('N1-turnover', ['tier', 'events', 'holder_days', 'h_hat', 'h_spec', 'annual_rate', 'ci_lo', 'ci_hi'], rows);
  csv('N1-turnover-per-seed', ['seed', 'field_events', 'field_days', 'mid_events', 'mid_days', 'street_events', 'street_days', 'field_deaths', 'mid_deaths', 'street_deaths'], R.map((S) => [S.seed, S.turn.field[0], S.turn.field[1], S.turn.mid[0], S.turn.mid[1], S.turn.street[0], S.turn.street[1], S.causes.field[0], S.causes.mid[0], S.causes.street[0]]));
  const perSeed = R.map((S) => 1 - Math.pow(1 - S.turn.field[0] / S.turn.field[1], Y));
  lines.push('', '- field 單一 seed 年率分布：P5 ' + pc(quantile(perSeed, 0.05)) + '、中位 ' + pc(quantile(perSeed, 0.5)) + '、P95 ' + pc(quantile(perSeed, 0.95)) + '。mid 只有 1 位（鴉首），200 seeds × 10 年 ≈ 2,000 在任年，所以 CI 寬。');
  // 原因
  lines.push('', '換人原因占比（規格 40／35／10／15）：', '', '| tier | 死亡 | 遷徙 | 被取代 | 升遷 | 死亡占比 95% CI | 平均 E[倍率]（當下在任者） |', '|---|---|---|---|---|---|---|');
  const dshare = {};
  ['field', 'mid', 'street'].forEach((tier) => {
    const c = [0, 1, 2, 3].map((i) => sum(R.map((S) => S.causes[tier][i]))); const t = sum(c); dshare[tier] = c[0] / t;
    const em = sum(R.map((S) => S.emLog[tier][0])) / sum(R.map((S) => S.emLog[tier][1]));
    lines.push('| ' + tier + ' | ' + c.map((x) => pc(x / t, 1) + '（' + x + '）').join(' | ') + ' | ' + ci(c[0], t) + ' | ' + f(em, 3) + ' |');
  });
  const capped = sum(R.map((S) => S.pdCapped));
  lines.push('', '死亡判定：`P(死亡｜換人)=0.40×倍率(年齡)÷E[倍率]`，E[倍率] 每個結算日用當下該 tier 全部在任者重算（第一輪用開局分布，field 死亡占比 43.4%、mid 50.5%）。P 超過 1 而截斷的次數：' + capped + '。mid 只有 1 人，E[倍率]＝他自己的倍率，所以 P(死亡)＝0.40 恆成立。');
  // 空缺
  const vac = {}; R.forEach((S) => S.vac.forEach(([tier, cause, len]) => { const k = tier + '|' + cause; (vac[k] = vac[k] || []).push(len); }));
  const vrows = []; lines.push('', '空缺日數（均勻整數日）：', '', '| tier | 原因 | 規則範圍 | 樣本 | 最小 | 平均 | 最大 | 範圍外 |', '|---|---|---|---|---|---|---|---|');
  let vacOk = true;
  Object.keys(vac).sort().forEach((k) => { const [tier, cause] = k.split('|'); const a = vac[k]; const rg = M.VAC[tier][cause]; const bad = rg ? a.filter((x) => x < rg[0] || x > rg[1]).length : a.filter((x) => x !== 0).length; if (bad) vacOk = false;
    lines.push('| ' + [tier, cause, rg ? rg[0] + '–' + rg[1] : '0（立即補位，【自補】沿用第一輪）', a.length, Math.min(...a), f(mean(a), 2), Math.max(...a), bad].join(' | ') + ' |');
    const hist = {}; a.forEach((x) => (hist[x] = (hist[x] || 0) + 1)); Object.keys(hist).forEach((d) => vrows.push([tier, cause, +d, hist[d]])); });
  csv('N1-vacancy-hist', ['tier', 'cause', 'days', 'count'], vrows);
  const ok = N1.field.ok && N1.mid.ok && vacOk;
  lines.push('', '**N1 ' + vb(ok) + '**：field 年率 ' + pc(N1.field.ann) + '（判準 15–21%）、mid ' + pc(N1.mid.ann) + ' CI [' + pc(N1.mid.lo) + ', ' + pc(N1.mid.hi) + ']（判準 7–11%）；空缺日數全在規則範圍：' + (vacOk ? '是' : '否') + '。死亡占換人：field ' + pc(dshare.field, 1) + '、mid ' + pc(dshare.mid, 1) + '、street ' + pc(dshare.street, 1) + '（目標約 40%）。');
  sec('N1 換人率、空缺日數、原因（回歸）', lines);
  summary.push(['N1', 'field 18%±3、mid 9%±2、空缺在範圍', 'field ' + pc(N1.field.ann) + '、mid ' + pc(N1.mid.ann) + '（CI ' + pc(N1.mid.lo) + '–' + pc(N1.mid.hi) + '）；死亡占換人 field ' + pc(dshare.field, 1) + '／mid ' + pc(dshare.mid, 1) + '／street ' + pc(dshare.street, 1), ok]);
  EXTRA.N1 = { N1, dshare, vacOk };
}

// ---------- N2 ----------
{
  const lines = [];
  const pass2 = (RR) => { const ratio = M.TOWNS.map((t, ti) => RR.map((S) => S.popEnd[ti] / t.cap)); return { ratio, allOk: RR.filter((S) => S.popEnd.every((p, ti) => p >= 0.9 * M.TOWNS[ti].cap)).length }; };
  const p = pass2(R), p0 = pass2(R0);
  lines.push('第 1,200 日（10 年）各鎮人口／上限（人口含在任者與街頭）：', '', '| 鎮 | 上限 | 平均 | 最小 | ≥90% 的 seed | 敏感度 難民 0：平均 | 難民 0 最小 | 難民 0 ≥90% |', '|---|---|---|---|---|---|---|---|');
  M.TOWNS.forEach((t, ti) => { const a = p.ratio[ti], b = p0.ratio[ti]; lines.push('| ' + [t.name, t.cap, pc(mean(a), 1), pc(Math.min(...a), 1), a.filter((x) => x >= 0.9).length + '/' + SEEDS, pc(mean(b), 1), pc(Math.min(...b), 1), b.filter((x) => x >= 0.9).length + '/' + SEEDS].join(' | ') + ' |'); });
  // 難民去向
  const refT = M.TOWNS.map((t, ti) => mean(R.map((S) => S.refugeeByTown[ti])));
  lines.push('', '難民安頓（全域每日 1 人，10 年 1,200 名額）：平均每 seed 安頓 ' + f(mean(R.map((S) => S.refugee)), 1) + ' 人、當日無缺額而未安頓 ' + f(mean(R.map((S) => S.refugeeUnplaced)), 1) + ' 名額；分到 ' + M.TOWNS.map((t, ti) => t.name + ' ' + f(refT[ti], 1)).join('、') + '。外來 Poisson 平均每 seed ' + f(mean(R.map((S) => S.immig)), 1) + ' 人（難民 0 時 ' + f(mean(R0.map((S) => S.immig)), 1) + '）。');
  const traj = []; R[0].popTraj.forEach((row, i) => { const m = row.map((_, j) => mean(R.map((S) => S.popTraj[i][j]))); const m0 = row.map((_, j) => mean(R0.map((S) => S.popTraj[i][j]))); traj.push([row[0]].concat(m.slice(1), m0.slice(1))); });
  csv('N2-pop-trajectory', ['day'].concat(M.TOWNS.map((t) => t.id), ['age50_share'], M.TOWNS.map((t) => t.id + '_refugee0'), ['age50_share_refugee0']), traj);
  // 50+ 軌跡
  const YRS = [0, 1, 2, 3, 5, 7, 10];
  lines.push('', '50 歲以上占比軌跡（全部在鎮者，含在任者；200 seeds 平均，P5–P95 為單 seed 分布）：', '', '| 年 | 日 | 50+ 平均 | P5 | P95 | 只算居民 | 難民 0 |', '|---|---|---|---|---|---|---|');
  const trajRows = [];
  YRS.forEach((y) => { const a = R.map((S) => S.ageSnap[y].a50); const b = R.map((S) => S.ageSnap[y].resA50); const c = R0.map((S) => S.ageSnap[y].a50);
    lines.push('| ' + [y === 0 ? '開局' : y, y * Y, pc(mean(a), 1), pc(quantile(a, 0.05), 1), pc(quantile(a, 0.95), 1), pc(mean(b), 1), pc(mean(c), 1)].join(' | ') + ' |'); trajRows.push([y, y * Y, mean(a), quantile(a, 0.05), quantile(a, 0.95), mean(b), mean(c)]); });
  const allY = []; for (let y = 0; y <= 10; y++) { const a = R.map((S) => S.ageSnap[y].a50); allY.push([y, y * Y, mean(a), quantile(a, 0.05), quantile(a, 0.95), mean(R.map((S) => S.ageSnap[y].resA50)), mean(R0.map((S) => S.ageSnap[y].a50))]); }
  csv('N2-age50-by-year', ['year', 'day', 'age50_mean', 'p5', 'p95', 'age50_residents_only', 'age50_refugee0'], allY);
  // 第 10 年各段
  const BN = ['16–25', '26–49', '50–59', '60–70', '71+'];
  lines.push('', '第 10 年（第 1,200 日）各年齡段（全部在鎮者；開局為 20／55／15／10／0）：', '', '| 段 | 平均 | P5 | P95 | 難民 0 平均 |', '|---|---|---|---|---|');
  const bandRows = [];
  BN.forEach((n, i) => { const a = R.map((S) => S.ageBands[i]); const b = R0.map((S) => S.ageBands[i]); lines.push('| ' + [n, pc(mean(a), 1), pc(quantile(a, 0.05), 1), pc(quantile(a, 0.95), 1), pc(mean(b), 1)].join(' | ') + ' |'); bandRows.push([n, mean(a), quantile(a, 0.05), quantile(a, 0.95), mean(b)]); });
  const a50 = R.map((S) => S.age50);
  lines.push('| **50 歲以上** | **' + pc(mean(a50), 1) + '** | ' + pc(quantile(a50, 0.05), 1) + ' | ' + pc(quantile(a50, 0.95), 1) + ' | ' + pc(mean(R0.map((S) => S.age50)), 1) + ' |');
  csv('N2-age-bands-y10', ['band', 'mean', 'p5', 'p95', 'refugee0_mean'], bandRows);
  csv('N2-age-end-per-seed', ['seed', 'b16_25', 'b26_49', 'b50_59', 'b60_70', 'b71p', 'age50'].concat(M.TOWNS.map((t) => 'pop_' + t.id)), R.map((S) => [S.seed].concat(S.ageBands, [S.age50], S.popEnd)));
  lines.push('', '各鎮 50+（第 1,200 日）：' + M.TOWNS.map((t, ti) => t.name + ' ' + pc(mean(R.map((S) => S.townAge50[ti])), 1)).join('、') + '。16 歲以下：' + sum(R.map((S) => S.ageUnder16)) + ' 人（應為 0）。');
  const okAge = mean(a50) >= 0.20 && mean(a50) <= 0.30; const okPop = p.allOk === SEEDS;
  const ok = okPop && okAge;
  lines.push('', '**N2 ' + vb(ok) + '**：人口 ' + (okPop ? '200/200 seed 各鎮 ≥90%' : '僅 ' + p.allOk + '/200 seed 各鎮 ≥90%') + '（難民 0：' + p0.allOk + '/200）；第 10 年 50 歲以上 ' + pc(mean(a50), 1) + '（判準 20–30%；手算估 25–28%）' + (okAge ? '，距上界 ' + f((0.30 - mean(a50)) * 100, 1) + ' 個百分點。' : '，超出 ' + f((mean(a50) - 0.30) * 100, 1) + ' 個百分點。'));
  const p95 = quantile(a50, 0.95), frac = a50.filter((x) => x > 0.30).length;
  lines.push('', '注意：平均在判準內，但單 seed 有 ' + frac + '/200 超過 30%（P95 ' + pc(p95, 1) + '）。判準是對平均下的，本輪照判；若之後要求「每個 seed 都在 20–30%」，建議照任務書的下一步：移入 16–25 提到 45%，或 71+ 死亡提到 30%（本輪沒改規則、沒跑這兩個變體）。');
  sec('N2 人口軌跡與年齡分布（主項）', lines);
  summary.push(['N2', '10 年後各鎮 ≥90%、50+ 20–30%', (okPop ? '人口 200/200' : '人口 ' + p.allOk + '/200') + '（難民 0：' + p0.allOk + '/200）；50+ ' + YRS.slice(1).map((y) => 'Y' + y + ' ' + pc(mean(R.map((S) => S.ageSnap[y].a50)), 1)).join('、'), ok]);
  EXTRA.N2 = { okPop, okAge, allOk: p.allOk, allOk0: p0.allOk, traj: YRS.slice(1).map((y) => [y, mean(R.map((S) => S.ageSnap[y].a50))]), bands: bandRows, a50: mean(a50), p5: quantile(a50, 0.05), p95, frac, pop0: M.TOWNS.map((t, ti) => [t.name, mean(p0.ratio[ti]), Math.min(...p0.ratio[ti])]) };
}

// ---------- N3 ----------
{
  const lines = [];
  const win = (S, a, b, j) => { let s = 0; for (let d = a; d < b; d++) s += S.dailyDeaths[d][j]; return s / (b - a); };
  const W = (a, b, j) => mean(R.map((S) => win(S, a, b, j)));
  const cols = [['死亡（含在任者）', 0], ['進墳場（含在任者）', 1], ['敏感度：死亡（只居民）', 2], ['敏感度：進墳場（只居民）', 3], ['敏感度：在任者死亡', 4]];
  lines.push('口徑：全域（5 鎮合計）、含在任者（現場、中層、街頭）。進墳場＝死在灰窯、驛站、破曉、其他（渡陰除外），沿用第一輪。200 seeds 平均。', '');
  lines.push('| 指標 | 第 1 年（1–120 日） | 10 年平均（1–1,200 日） | 第 10 年（1,081–1,200 日） |', '|---|---|---|---|');
  const vals = {};
  cols.forEach(([n, j]) => { const a = W(0, Y, j), b = W(0, DAYS, j), c = W(DAYS - Y, DAYS, j); vals[j] = [a, b, c]; lines.push('| ' + [n, f(a, 4), f(b, 4), f(c, 4)].join(' | ') + ' |'); });
  const tgt = { 0: 0.174, 1: 0.120 };
  const chk = (x, t) => Math.abs(x / t - 1) <= 0.10;
  const okD1 = chk(vals[0][0], tgt[0]), okG1 = chk(vals[1][0], tgt[1]), okD10 = chk(vals[0][1], tgt[0]), okG10 = chk(vals[1][1], tgt[1]);
  lines.push('', '| 判準（±10%） | 目標 | 允許範圍 | 第 1 年 | 偏差 | 判 | 10 年平均 | 偏差 | 判 |', '|---|---|---|---|---|---|---|---|---|');
  [['死亡／日', 0, okD1, okD10], ['進墳場／日', 1, okG1, okG10]].forEach(([n, j, o1, o10]) => lines.push('| ' + [n, tgt[j], f(tgt[j] * 0.9, 3) + '–' + f(tgt[j] * 1.1, 3), f(vals[j][0], 4), pc(vals[j][0] / tgt[j] - 1, 1), v(o1), f(vals[j][1], 4), pc(vals[j][1] / tgt[j] - 1, 1), v(o10)].join(' | ') + ' |'));
  // 分年
  lines.push('', '分年軌跡（每年 120 日平均／日）：', '', '| 年 | 日 | 死亡（含在任者） | 進墳場（含在任者） | 死亡（只居民） | 進墳場（只居民） | 在任者死亡 |', '|---|---|---|---|---|---|---|');
  const yrRows = [];
  for (let y = 1; y <= 10; y++) { const a = (y - 1) * Y, b = y * Y; const row = [0, 1, 2, 3, 4].map((j) => W(a, b, j)); yrRows.push([y, a + 1, b].concat(row)); lines.push('| ' + [y, (a + 1) + '–' + b].concat(row.map((x) => f(x, 4))).join(' | ') + ' |'); }
  csv('N3-deaths-by-year', ['year', 'day_from', 'day_to', 'deaths_all', 'grave_all', 'deaths_res', 'grave_res', 'deaths_holders'], yrRows);
  // 每 seed 分布
  const perD = R.map((S) => win(S, 0, DAYS, 0)), perG = R.map((S) => win(S, 0, DAYS, 1));
  lines.push('', '10 年平均的單 seed 分布：死亡 P5 ' + f(quantile(perD, 0.05), 4) + '–P95 ' + f(quantile(perD, 0.95), 4) + '；進墳場 P5 ' + f(quantile(perG, 0.05), 4) + '–P95 ' + f(quantile(perG, 0.95), 4) + '。');
  csv('N3-deaths-per-seed', ['seed', 'y1_deaths_all', 'y1_grave_all', 'avg_deaths_all', 'avg_grave_all', 'y1_deaths_res', 'y1_grave_res', 'avg_deaths_res', 'avg_grave_res', 'avg_deaths_holders'], R.map((S) => [S.seed, win(S, 0, Y, 0), win(S, 0, Y, 1), win(S, 0, DAYS, 0), win(S, 0, DAYS, 1), win(S, 0, Y, 2), win(S, 0, Y, 3), win(S, 0, DAYS, 2), win(S, 0, DAYS, 3), win(S, 0, DAYS, 4)]));
  const dd = []; for (let d = 0; d < DAYS; d++) dd.push([d + 1].concat([0, 1, 2, 3, 4].map((j) => mean(R.map((S) => S.dailyDeaths[d][j])))));
  csv('N3-deaths-daily-mean', ['day', 'deaths_all', 'grave_all', 'deaths_res', 'grave_res', 'deaths_holders'], dd);
  lines.push('', '只算居民的敏感度對照手算：第 1 年 死亡 ' + f(vals[2][0], 4) + '（手算 0.157，偏差 ' + pc(vals[2][0] / 0.157 - 1, 1) + '）、進墳場 ' + f(vals[3][0], 4) + '（手算 0.108，偏差 ' + pc(vals[3][0] / 0.108 - 1, 1) + '）。不當判準。');
  lines.push('', '註：非灰窯鎮每 30 日結算一次，所以每日序列在第 30k 日有尖峰；1–120 日與 1–1,200 日都是 30 的倍數，平均不受影響。');
  const ok = okD1 && okG1 && okD10 && okG10;
  lines.push('', '**N3 ' + vb(ok) + '**：含在任者 第 1 年 死亡 ' + f(vals[0][0], 4) + '（' + vb(okD1) + '）、進墳場 ' + f(vals[1][0], 4) + '（' + vb(okG1) + '）；10 年平均 死亡 ' + f(vals[0][1], 4) + '（' + vb(okD10) + '）、進墳場 ' + f(vals[1][1], 4) + '（' + vb(okG10) + '）。');
  sec('N3 每日死亡與進墳場（主項）', lines);
  summary.push(['N3', '含在任者：死亡 0.174、進墳場 0.120（±10%；第 1 年與 10 年平均）', 'Y1 ' + f(vals[0][0], 4) + '／' + f(vals[1][0], 4) + '；10 年 ' + f(vals[0][1], 4) + '／' + f(vals[1][1], 4), ok]);
  EXTRA.N3 = { vals, okD1, okG1, okD10, okG10 };
}

// ---------- N4 ----------
{
  const lines = []; const keys = ['draws', 'forbidHit', 'playerHit', 'strictRe', 'reservedRe', 'townRe', 'retiredRe', 'metRename', 'metEvents', 'strictColl', 'strictCollWeak', 'townColl', 'reuse240', 'sceneSameSur', 'sceneSkip', 'scenes', 'sceneN', 'fail'];
  const tot = (RR, k) => sum(RR.map((S) => S.name[k] || 0));
  const lab = { draws: '抽名次數（含重抽）', forbidHit: '禁組合命中→重抽', playerHit: '與玩家全名相同→重抽', strictRe: '嚴格唯一者抽到任何在世者全名→重抽', reservedRe: '路人抽到嚴格唯一者全名→重抽', townRe: '路人抽到同鎮在世同名→重抽', retiredRe: '抽到 240 日內退任者全名→重抽', metRename: '**路人首次 met 時全名與在世者相撞→見面前改名**', metEvents: 'met 0→1 次數', strictColl: '**驗證：嚴格唯一者與任何在世者撞名（強口徑）**', strictCollWeak: '驗證：嚴格唯一者之間撞名', townColl: '驗證：同鎮在世同名', reuse240: '驗證：新任者用了 240 日內退任全名', sceneSameSur: '**驗證：同場景同姓**', sceneSkip: '抽場景時因同姓跳過', scenes: '場景數', sceneN: '場景人次', fail: '5,000 次重抽仍失敗' };
  lines.push('強唯一口徑（與任何在世者不可撞全名）；200 seeds 合計，每日逐一檢查全部在世者：', '', '| 項目 | 200 seeds 合計 | 每 seed 平均 |', '|---|---|---|');
  keys.forEach((k) => lines.push('| ' + [lab[k], tot(R, k), f(tot(R, k) / SEEDS, 2)].join(' | ') + ' |'));
  csv('N4-names-per-seed', ['seed'].concat(keys), R.map((S) => [S.seed].concat(keys.map((k) => S.name[k] || 0))));
  const ok = tot(R, 'strictColl') === 0 && tot(R, 'sceneSameSur') === 0;
  const extraOk = tot(R, 'strictCollWeak') === 0 && tot(R, 'reuse240') === 0 && tot(R, 'townColl') === 0;
  lines.push('', '居民池補位沿用原名（Q-N4 暫行）：抽到的居民全名若與其他在世者相撞或屬於 240 日內退任全名，就換一位候選人（' + sum(R.map((S) => S.promoSkip)) + ' 次），所以不必改名；居民池沒有合格者而改新生成 ' + sum(R.map((S) => S.poolFallback)) + ' 次。');
  lines.push('', '**N4 ' + vb(ok) + '**：嚴格唯一撞名 ' + tot(R, 'strictColl') + '、同場景同姓 ' + tot(R, 'sceneSameSur') + '；禁組合重抽 ' + tot(R, 'forbidHit') + '、玩家同名重抽 ' + tot(R, 'playerHit') + '、路人見面前改名 ' + tot(R, 'metRename') + ' 次（' + f(tot(R, 'metRename') / SEEDS, 2) + '／seed，佔 met 0→1 的 ' + pc(tot(R, 'metRename') / tot(R, 'metEvents'), 2) + '）。其他驗證（同鎮同名、240 日重用）' + (extraOk ? '皆 0' : '有非 0') + '。');
  sec('N4 名字唯一性（回歸）', lines);
  summary.push(['N4', '嚴格唯一撞名 0、同場景同姓 0', '撞名 ' + tot(R, 'strictColl') + '、同姓 ' + tot(R, 'sceneSameSur') + '、禁組合重抽 ' + tot(R, 'forbidHit') + '、玩家同名重抽 ' + tot(R, 'playerHit') + '、見面前改名 ' + tot(R, 'metRename'), ok]);
  EXTRA.N4 = { coll: tot(R, 'strictColl'), sur: tot(R, 'sceneSameSur'), forbid: tot(R, 'forbidHit'), player: tot(R, 'playerHit'), rename: tot(R, 'metRename') };
}

// ---------- N5 ----------
{
  const lines = []; const FL = M.FLAV;
  lines.push('pres 過濾後各氣味可用名數（m＝男向＋中性、f＝女向＋中性；名庫沿用第一輪合成佔位）：', '', '| 氣味 | 男向 | 女向 | 中性 | m 可用 | f 可用 |', '|---|---|---|---|---|---|');
  const prow = [];
  FL.forEach((n, i) => { const c = M.NAME_COUNTS[i]; lines.push('| ' + [n, c[0], c[1], c[2], M.POOL[i][0].length, M.POOL[i][1].length].join(' | ') + ' |'); prow.push([n, c[0], c[1], c[2], M.POOL[i][0].length, M.POOL[i][1].length]); });
  csv('N5-pool-sizes', ['flavor', 'male', 'female', 'neutral', 'avail_m', 'avail_f'], prow);
  const holdAll = [].concat(...R.map((S) => S.flavHold.filter((x) => x[1] === 0)), ...G0.map((g) => g.flavHold));
  const slots = M.SLOTS.filter((s) => s.tier !== 'street');
  lines.push('', '有職位者名字氣味＝職位味（開局；主跑 200＋補充 10,000 seeds 的 day 0，每位 ' + (SEEDS + 10000) + ' 樣本）：', '', '| 位 | 鎮 | 職位味 | 手算 0.8+0.2×鎮占比 | 實測 | 差（百分點） | 判 |', '|---|---|---|---|---|---|---|');
  let okH = true; const hrows = [];
  slots.forEach((s) => { const a = holdAll.filter((x) => x[0] === s.id); const k = a.filter((x) => x[2] === s.flav).length; const e = 0.8 + 0.2 * M.TOWNS[s.town].dist[s.flav] / 100; const d = (k / a.length - e) * 100; const ok = Math.abs(d) <= 2; if (!ok) okH = false;
    lines.push('| ' + [s.id + ' ' + s.name + (s.hered ? '（世襲）' : ''), TN[s.town], FL[s.flav], f(e, 3), f(k / a.length, 4), f(d, 2), v(ok)].join(' | ') + ' |'); hrows.push([s.id, s.name, s.town, FL[s.flav], e, k / a.length, a.length]); });
  csv('N5-holder-flavor', ['slot', 'name', 'town', 'post_flavor', 'expected', 'observed', 'n'], hrows);
  lines.push('', '開局在任者一律照 80／20 生成（世襲位的「名 100% 職位味」只適用於運行中依繼任新生成者）。');
  const holdLater = [].concat(...R.map((S) => S.flavHold.filter((x) => x[1] > 0)));
  const her = holdLater.filter((x) => x[4] === 1);
  lines.push('', '運行中世襲接任者（F02 鐵匠、F03 客棧老闆、F06 茶攤主）：' + her.length + ' 人，名字為職位味 ' + (her.length ? pc(her.filter((x) => x[2] === x[3]).length / her.length, 1) : 'NA') + '（規則 100%）。其他運行中新生成的在任者（居民池無合格者時）：' + holdLater.filter((x) => x[4] === 0).length + ' 人。');
  // 第 10 年在任者
  const end = [].concat(...R.map((S) => S.flavHoldEnd)); const endOwn = end.filter((x) => x[1] === x[2]).length;
  const endH = end.filter((x) => M.SLOTS.find((s) => s.id === x[0]).hered), endNH = end.filter((x) => !M.SLOTS.find((s) => s.id === x[0]).hered);
  const startOwn = holdAll.filter((x) => x[2] === M.SLOTS.find((s) => s.id === x[0]).flav).length / holdAll.length;
  lines.push('', '**第 10 年（第 1,200 日）在任者（現場＋中層，不含空缺位）名字＝職位味：' + pc(endOwn / end.length, 1) + '**（' + endOwn + '/' + end.length + '；開局 ' + pc(startOwn, 1) + '；第一輪 開局 85.4%、第 10 年 39.0%）。其中世襲 3 位 ' + pc(endH.filter((x) => x[1] === x[2]).length / endH.length, 1) + '、非世襲 18 位 ' + pc(endNH.filter((x) => x[1] === x[2]).length / endNH.length, 1) + '。原因：居民池補位（Q-N4 暫行）沿用原名，名字氣味來自鎮分布。');
  csv('N5-holder-flavor-y10', ['slot', 'n_held', 'own_flavor'], slots.map((s) => { const a = end.filter((x) => x[0] === s.id); return [s.id, a.length, a.filter((x) => x[1] === x[2]).length]; }));
  lines.push('', '各鎮居民名字氣味（開局 day 0；主跑 200＋補充 10,000 seeds）：', '', '| 鎮 | 樣本 | ' + FL.join(' | ') + ' | 最大偏差（百分點） | 判 |', '|---|---|' + FL.map(() => '---').join('|') + '|---|---|');
  let okR = true; const rrows = [];
  M.TOWNS.forEach((t, ti) => { const c = FL.map((_, j) => sum(R.map((S) => S.flavRes[ti][j])) + sum(G0.map((g) => g.flavRes[ti][j]))); const n = sum(c); const dev = Math.max(...c.map((x, j) => Math.abs(x / n * 100 - t.dist[j]))); const ok = dev <= 2; if (!ok) okR = false;
    lines.push('| ' + [t.name, n].concat(c.map((x, j) => f(x / n * 100, 2) + '（' + t.dist[j] + '）'), [f(dev, 2), v(ok)]).join(' | ') + ' |'); rrows.push([t.id, n].concat(c.map((x) => x / n), t.dist.map((x) => x / 100))); });
  csv('N5-resident-flavor', ['town', 'n'].concat(FL.map((x, i) => 'obs_' + i), FL.map((x, i) => 'exp_' + i)), rrows);
  const ok = okH && okR;
  const f01 = holdAll.filter((x) => x[0] === 'F01'); const f01v = f01.filter((x) => x[2] === 4).length / f01.length;
  lines.push('', '**N5 ' + vb(ok) + '**：21 個有職位位置、5 鎮居民的開局名字氣味全部在手算 ±2 百分點內：' + (ok ? '是' : '否') + '；天星分號掌櫃 ' + f(f01v, 4) + '（手算 0.83）。第 10 年在任者職位味 ' + pc(endOwn / end.length, 1) + '（不判）。');
  sec('N5 氣味分布與可用名數（回歸）', lines);
  summary.push(['N5', '開局氣味 ±2 百分點', '天星分號掌櫃 ' + f(f01v, 4) + '（0.83）；第 10 年在任者職位味 ' + pc(endOwn / end.length, 1) + '（開局 ' + pc(startOwn, 1) + '）', ok]);
  EXTRA.N5 = { f01v, endShare: endOwn / end.length, startOwn };
}

// ---------- N6 ----------
{
  const lines = [];
  const agg = (RR) => { const o = { cat: { hold: [0, 0], res: [0, 0], street: [0, 0] }, form: [0, 0, 0], changed: 0, giveup: 0, tries: 0, coll: 0 }; RR.forEach((S) => { ['hold', 'res', 'street'].forEach((c) => { o.cat[c][0] += S.nick.cat[c][0]; o.cat[c][1] += S.nick.cat[c][1]; }); [0, 1, 2].forEach((i) => (o.form[i] += S.nick.form[i])); o.changed += S.nick.changed; o.giveup += S.nick.giveup; o.tries += S.nick.tries; o.coll += S.nick.coll; }); return o; };
  const A = agg(R), B = agg(G0);
  const row = (n, o) => { const got = sum(o.form); return '| ' + [n, pc(o.cat.hold[0] / o.cat.hold[1], 1) + '（' + o.cat.hold[1] + '）', pc(o.cat.res[0] / o.cat.res[1], 1) + '（' + o.cat.res[1] + '）', pc(o.cat.street[0] / Math.max(1, o.cat.street[1]), 1) + '（' + o.cat.street[1] + '）', pc(o.form[0] / got, 1), pc(o.form[1] / got, 1), pc(o.form[2] / got, 1), pc(o.coll / o.tries, 1), pc(o.changed / o.tries, 1), pc(o.giveup / o.tries, 2) + '（' + o.giveup + '/' + o.tries + '）'].join(' | ') + ' |'; };
  lines.push('| 範圍 | 有職位者有綽號 | 居民有綽號 | 街頭 | bare | 詞＋姓 | 姓＋老＋排行 | 首選撞名 | 撞名後改字形／改詞 | 放棄率 |', '|---|---|---|---|---|---|---|---|---|---|');
  lines.push(row('主跑 200 seeds × 1,200 日（含移入者、難民、世襲）', A), row('補充：10,000 seeds 開局', B));
  lines.push('', '規則值：有職位 60%、居民 30%、街頭 0%（生成當下的身分；居民池升任者沿用原綽號，不重抽）。');
  csv('N6-nickname', ['scope', 'hold_with', 'hold_n', 'res_with', 'res_n', 'street_with', 'street_n', 'bare', 'word_sur', 'sur_lao_rank', 'first_collision', 'changed', 'giveup', 'tries'], [['main', A], ['day0_10000', B]].map(([n, o]) => [n, o.cat.hold[0], o.cat.hold[1], o.cat.res[0], o.cat.res[1], o.cat.street[0], o.cat.street[1], o.form[0], o.form[1], o.form[2], o.coll, o.changed, o.giveup, o.tries]));
  const g = A.giveup / A.tries; const ok = g <= 0.10;
  lines.push('', '**N6 ' + vb(ok) + '**：放棄率 ' + pc(g, 2) + '（判準 ≤10%）；撞名後改字形／改詞 ' + pc(A.changed / A.tries, 1) + '；有職位者有綽號 ' + pc(A.cat.hold[0] / A.cat.hold[1], 1) + '、居民 ' + pc(A.cat.res[0] / A.cat.res[1], 1) + '、街頭 ' + pc(A.cat.street[0] / Math.max(1, A.cat.street[1]), 1) + '。');
  sec('N6 綽號（回歸）', lines);
  summary.push(['N6', '綽號放棄率 ≤10%', '放棄 ' + pc(g, 2) + '、改字形 ' + pc(A.changed / A.tries, 1) + '、有職位 ' + pc(A.cat.hold[0] / A.cat.hold[1], 1) + '、居民 ' + pc(A.cat.res[0] / A.cat.res[1], 1), ok]);
  EXTRA.N6 = { g, changed: A.changed / A.tries, hold: A.cat.hold[0] / A.cat.hold[1], resn: A.cat.res[0] / A.cat.res[1] };
}

// ---------- N7 ----------
{
  const lines = [];
  const CJK = (i) => String.fromCharCode(0x4e00 + (i % 20000));
  const surStr = (s) => (s >= M.N_SUR - M.N_SUR_COMPOUND ? CJK(s) + CJK(s + 500) : CJK(s));
  const givenStr = (g) => CJK(1000 + g) + CJK(3000 + g); // 名一律 2 字（保守上限，同第一輪）
  const SI = { alive: 0, dead: 1, moved: 2, promoted: 3 };
  const nickStr = (p) => (p.nickKey ? (p.nickForm === 0 ? CJK(5000) + CJK(5001) : p.nickForm === 1 ? CJK(5000) + CJK(5001) + surStr(p.sur) : surStr(p.sur) + '老' + '一二三四五六'[p.rank - 1]) : null);
  const sd = (seed, pid) => (Math.imul(seed * 100000 + pid + 1, 2654435761) >>> 0);
  // 【規則 第二輪】精簡編碼：短鍵名、索引值、null／空陣列不寫出、簡歷最近 5 筆 [day, evCode, townIndex]
  const full = (p, seed, pid, padBio) => {
    let bio = p.bio.map((b) => [Math.round(b[0]), b[1], b[2]]);
    if (padBio) while (bio.length < 5) bio = [[Math.round(p.born) + 1000 * bio.length, 0, p.town]].concat(bio);
    const o = { pid, sd: sd(seed, pid), sur: surStr(p.sur), gv: givenStr(p.given) };
    const nk = nickStr(p); if (nk !== null) o.nk = nk;
    Object.assign(o, { rk: p.rank, sm: p.nflav, pr: p.pres, fc: p.face, tr: p.traits.slice(), bn: Math.round(p.born), tw: p.town });
    // fa（勢力）本輪不建模＝null → 不寫出
    if (p.slot) o.se = p.slot;
    o.st = SI[p.status];
    if (bio.length) o.bio = bio;
    o.mt = p.met; o.tie = 0; // tie 本輪不建模，佔位 0（非 null，照規則寫出）
    // kn（親屬）本輪不建模＝空陣列 → 不寫出；gvz（墓）null → 不寫出
    if (p.grave !== undefined && p.grave !== null) o.gvz = p.grave;
    return o;
  };
  const light = (p, seed, pid) => ({ pid, sd: sd(seed, pid), tw: p.town, st: SI[p.status], mt: p.met });
  const mk = (seeds) => { const ps = []; seeds.forEach((s) => R[s].alive.forEach((a) => a.forEach((p) => ps.push([p, s])))); return ps; };
  const p800 = mk([0]);
  const s800 = JSON.stringify(p800.map(([p, s], i) => full(p, s, i)));
  const s800pad = JSON.stringify(p800.map(([p, s], i) => full(p, s, i, true)));
  const pAll = mk([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); const p8k = pAll.slice(0, 8000);
  const half = Math.floor(p8k.length / 2);
  const arrL = p8k.slice(0, half).map(([p, s], i) => light(p, s, i)), arrF = p8k.slice(half).map(([p, s], i) => full(p, s, half + i));
  const arrFpad = p8k.slice(half).map(([p, s], i) => full(p, s, half + i, true));
  const s8k = JSON.stringify(arrL.concat(arrF)), s8kPad = JSON.stringify(arrL.concat(arrFpad));
  const s8kFull = JSON.stringify(p8k.map(([p, s], i) => full(p, s, i)));
  const bytes = (s) => Buffer.byteLength(s, 'utf8');
  const avgL = JSON.stringify(arrL).length / arrL.length, avgF = JSON.stringify(arrF).length / arrF.length;
  const bioLen = mean(arrF.map((o) => (o.bio ? o.bio.length : 0)));
  const seedsUsed = []; { let n = 0; for (let s = 0; s <= 10 && n < 8000; s++) { seedsUsed.push(s); n += sum(R[s].alive.map((a) => a.length)); } }
  lines.push('編碼（任務書 N7）：完整 `pid,sd,sur,gv,nk,rk,sm,pr,fc,tr,bn,tw,fa,se,st,bio,mt,tie,kn,gvz`；輕 `pid,sd,tw,st,mt`。鎮、氣味、特徵、狀態、簡歷事件碼為整數索引；臉、出生日為整數；null／空陣列不寫出；簡歷最近 5 筆 `[day, evCode, townIndex]`。人物取自本輪主跑 seed ' + seedsUsed[0] + '..' + seedsUsed[seedsUsed.length - 1] + ' 第 1,200 日在世者，依序取 ' + p8k.length + ' 人，前一半輕、後一半完整。', '');
  lines.push('簡歷內容：本輪模擬實際記錄的事件（出生、遷入、難民安頓、就任、卸任、初見），最多保留最近 5 筆；完整記錄平均 ' + f(bioLen, 2) + ' 筆。另列「簡歷補滿 5 筆」的保守上限（第一輪建議 B 一律 5 筆）。', '');
  lines.push('| 情境 | 人數 | JSON.stringify 字元數 | UTF-8 位元組 | 判準 |', '|---|---|---|---|---|');
  lines.push('| 800 人全完整（seed 0） | ' + p800.length + ' | ' + s800.length.toLocaleString() + ' | ' + bytes(s800).toLocaleString() + ' | — |');
  lines.push('| **8,000 人半輕半完整** | ' + p8k.length + ' | **' + s8k.length.toLocaleString() + '** | ' + bytes(s8k).toLocaleString() + ' | ≤1,500,000：' + v(s8k.length <= 1500000) + ' |');
  lines.push('| 保守上限：800 人全完整、簡歷補滿 5 筆 | ' + p800.length + ' | ' + s800pad.length.toLocaleString() + ' | ' + bytes(s800pad).toLocaleString() + ' | — |');
  lines.push('| 保守上限：8,000 人半輕半完整、簡歷補滿 5 筆 | ' + p8k.length + ' | ' + s8kPad.length.toLocaleString() + ' | ' + bytes(s8kPad).toLocaleString() + ' | ' + (s8kPad.length <= 1500000 ? '≤150 萬' : '超過 150 萬') + ' |');
  lines.push('| 參考：8,000 人全完整 | ' + p8k.length + ' | ' + s8kFull.length.toLocaleString() + ' | ' + bytes(s8kFull).toLocaleString() + ' | — |');
  lines.push('| 對照：第一輪建議 B（8,000 半輕半完整） | 8000 | 842,187 | — | — |');
  lines.push('', '平均每筆：輕 ' + f(avgL, 1) + ' 字元、完整 ' + f(avgF, 1) + ' 字元。與第一輪建議 B 的差異：鍵名不同（`sur`＋`gv` 分開、`gvz` 等）、輕記錄照規則寫出 `mt:0`、`tie:0` 照寫、不再有複姓旗標、簡歷為實際事件筆數。');
  lines.push('', '範例（完整）：`' + JSON.stringify(arrF[0]) + '`', '', '範例（輕）：`' + JSON.stringify(arrL[0]) + '`');
  csv('N7-save-size', ['case', 'n', 'chars', 'utf8_bytes'], [['800_full', p800.length, s800.length, bytes(s800)], ['8000_half', p8k.length, s8k.length, bytes(s8k)], ['800_full_bio5', p800.length, s800pad.length, bytes(s800pad)], ['8000_half_bio5', p8k.length, s8kPad.length, bytes(s8kPad)], ['8000_full', p8k.length, s8kFull.length, bytes(s8kFull)], ['round1_B_8000_half', 8000, 842187, '']]);
  const ok = s8k.length <= 1500000;
  lines.push('', '**N7 ' + vb(ok) + '**：8,000 人半輕半完整 ' + s8k.length.toLocaleString() + ' 字元／' + bytes(s8k).toLocaleString() + ' 位元組（判準 ≤1,500,000 字元；第一輪建議 B 842,187）；簡歷補滿 5 筆的保守上限 ' + s8kPad.length.toLocaleString() + ' 字元；800 人全完整 ' + s800.length.toLocaleString() + ' 字元。');
  sec('N7 存檔大小（複驗精簡編碼）', lines);
  summary.push(['N7', '8,000 人半輕半完整 ≤150 萬字元', s8k.length.toLocaleString() + ' 字元（補滿 5 筆簡歷 ' + s8kPad.length.toLocaleString() + '；800 全完整 ' + s800.length.toLocaleString() + '；第一輪 B 842,187）', ok]);
  EXTRA.N7 = { s8k: s8k.length, b8k: bytes(s8k), pad: s8kPad.length, s800: s800.length, b800: bytes(s800) };
}

// ---------- 輸出 ----------
const head = ['# 《山海錄》SPEC-NPC 第二輪人事與生成分布驗算（num-shl-npc-gen2）', '',
  '依據：SPEC-NPC v0.1 18:56 追加；base numbers/num-shl-npc-gen 2fe096b；名庫為合成佔位、只驗規模。', '',
  '- 重現：`node sim/npc/run2.js`（約 ' + Math.round((Date.now() - t00) / 1000) + ' 秒；模擬器 `sim/npc/model2.js`）。主跑 seed＝0..199，每 seed 1,200 日；N5／N6 開局另跑 seed 100000..109999 的 day 0。全部固定 seed，重跑結果相同。第一輪 `node sim/npc/run.js` 未改動、仍可重現。',
  '- 敏感度：難民安頓＝0（只留外來 Poisson）。',
  '- 只新增 `sim/npc/model2.js`、`sim/npc/run2.js`、`evidence/npc-gen2-*.md`、`evidence/csv-npc2/`；沒有改 `js/`、`index.html`、`tests/`、`docs/` 或任何既有檔。建模選擇與待決問題見 `evidence/npc-gen2-assumptions.md`。沒有為了過判準改任何規則。', '',
  '## 總表', '', '| 項 | 判準 | 主要數字 | 結論 |', '|---|---|---|---|'].concat(summary.map((s) => '| ' + [s[0], s[1], s[2], s[3] ? '過' : '**不過**'].join(' | ') + ' |'), ['']);
fs.mkdirSync(path.join(ROOT, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'evidence', 'npc-gen2-results.md'), head.concat(res).join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
fs.writeFileSync(path.join(CSV_DIR, 'summary.json'), JSON.stringify({ summary: summary.map((s) => ({ id: s[0], criterion: s[1], numbers: s[2], pass: s[3] })), extra: EXTRA }, null, 1) + '\n');
log('完成：' + summary.map((s) => s[0] + (s[3] ? '過' : '不過')).join(' '));
