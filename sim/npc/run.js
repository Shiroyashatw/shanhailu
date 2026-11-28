'use strict';
/* num-shl-npc-gen：SPEC-NPC v0.1 人事與生成分布驗算。node sim/npc/run.js
 * 產出 evidence/npc-gen-results.md 與 evidence/csv-npc/*.csv。固定 seed（0..199），重跑結果完全相同。 */
const fs = require('fs');
const path = require('path');
const M = require('./model');
const { r3, mean, quantile, wilson, ROOT } = require('../lib/util');
const t00 = Date.now(); const log = (s) => console.log('[' + ((Date.now() - t00) / 1000).toFixed(1) + 's] ' + s);
const SEEDS = 200, DAYS = 1200;
const CSV_DIR = path.join(ROOT, 'evidence', 'csv-npc');
function csv(id, header, rows) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : (Math.round(v * 1e6) / 1e6).toString()) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(CSV_DIR, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
const pc = (x, d) => (x * 100).toFixed(d === undefined ? 2 : d) + '%';
const f = (x, d) => (Number.isFinite(x) ? x.toFixed(d === undefined ? 3 : d) : 'NA');
const ci = (k, n) => { const [a, b] = wilson(k, n); return '[' + pc(a) + ', ' + pc(b) + ']'; };
const sum = (a) => a.reduce((s, x) => s + x, 0);
const PASS = '過', FAIL = '**不過**';
const v = (ok) => (ok ? PASS : FAIL);
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
const RW = runAll({ strongUnique: false }); log('敏感度：弱唯一 完成');
// 生成分布補充：10,000 個 seed 只跑開局（day 0）
const G0 = []; for (let s = 0; s < 10000; s++) { const S = M.run(100000 + s, { days: 0 }); G0.push({ flavHold: S.flavHold, flavRes: S.flavRes, f01: S.f01, nick: S.nick }); } log('開局生成 10,000 seeds 完成');

const res = [];
const sec = (t, lines) => { res.push('## ' + t, ''); lines.forEach((l) => res.push(l)); res.push(''); };
const summary = [];

// ---------- N1 ----------
{
  const lines = []; const rows = [];
  const exp = { field: 0.18, mid: 0.09, street: 0.10 }; const tol = { field: 0.03, mid: 0.02, street: null };
  lines.push('| tier | 事件數 | 在任日數 | 每日 ĥ | 手算 h | 年率 1−(1−ĥ)^120 | 95% CI | 每在任年事件數 | 判準 | 結論 |', '|---|---|---|---|---|---|---|---|---|---|');
  const N1 = {};
  ['field', 'mid', 'street'].forEach((tier) => {
    const k = sum(R.map((S) => S.turn[tier][0])), n = sum(R.map((S) => S.turn[tier][1]));
    const h = k / n, [a, b] = wilson(k, n); const ann = (x) => 1 - Math.pow(1 - x, 120);
    const ok = tol[tier] === null ? null : Math.abs(ann(h) - exp[tier]) <= tol[tier];
    N1[tier] = { k, n, h, ann: ann(h), lo: ann(a), hi: ann(b), ok };
    lines.push('| ' + [tier, k, n, f(h, 6), f(M.H[tier], 6), pc(ann(h)), '[' + pc(ann(a)) + ', ' + pc(ann(b)) + ']', f(h * 120, 4), tol[tier] === null ? '（無判準）' : pc(exp[tier], 0) + '±' + pc(tol[tier], 0), ok === null ? '—' : v(ok)].join(' | ') + ' |');
    rows.push([tier, k, n, h, M.H[tier], ann(h), ann(a), ann(b)]);
  });
  csv('N1-turnover', ['tier', 'events', 'holder_days', 'h_hat', 'h_spec', 'annual_rate', 'ci_lo', 'ci_hi'], rows);
  // 每 seed 年率分布（field）
  const perSeed = R.map((S) => 1 - Math.pow(1 - S.turn.field[0] / S.turn.field[1], 120));
  csv('N1-turnover-per-seed', ['seed', 'field_events', 'field_days', 'mid_events', 'mid_days', 'street_events', 'street_days'], R.map((S) => [S.seed, S.turn.field[0], S.turn.field[1], S.turn.mid[0], S.turn.mid[1], S.turn.street[0], S.turn.street[1]]));
  // 每 30 日 20 現場位換人數
  const per30 = sum(R.map((S) => S.turn.field[0])) / (SEEDS * DAYS / 30);
  lines.push('', '- 20 個現場位每 30 日換人 ' + f(per30, 3) + ' 人（手算 0.99；差異來自空缺期間不計換人：現場位平均在任比例 ' + pc(N1.field.n / (SEEDS * DAYS * 20)) + '）。');
  lines.push('- field 單一 seed 的年率分布（每 seed 約 200 在任年）：P5 ' + pc(quantile(perSeed, 0.05)) + '、中位 ' + pc(quantile(perSeed, 0.5)) + '、P95 ' + pc(quantile(perSeed, 0.95)) + '。');
  // 原因
  lines.push('', '| tier | 死亡 | 遷徙 | 被取代 | 升遷 |', '|---|---|---|---|---|');
  ['field', 'mid', 'street'].forEach((tier) => { const c = [0, 1, 2, 3].map((i) => sum(R.map((S) => S.causes[tier][i]))); const t = sum(c); lines.push('| ' + tier + ' | ' + c.map((x) => pc(x / t, 1) + '（' + x + '）').join(' | ') + ' |'); });
  lines.push('', '原因規格比例 40／35／10／15；死亡因年齡倍率會偏離 40%（倍率以開局在任者年齡分布正規化，在任者老化後死亡占比上升）。');
  // 空缺日數
  const vac = {}; R.forEach((S) => S.vac.forEach(([tier, cause, len]) => { const k = tier + '|' + cause; (vac[k] = vac[k] || []).push(len); }));
  const vrows = []; lines.push('', '空缺日數（均勻整數日）：', '', '| tier | 原因 | 規則範圍 | 樣本 | 最小 | 平均 | 最大 | 範圍外 |', '|---|---|---|---|---|---|---|---|');
  let vacOk = true;
  Object.keys(vac).sort().forEach((k) => { const [tier, cause] = k.split('|'); const a = vac[k]; const rg = M.VAC[tier][cause]; const bad = rg ? a.filter((x) => x < rg[0] || x > rg[1]).length : a.filter((x) => x !== 0).length; if (bad) vacOk = false;
    lines.push('| ' + [tier, cause, rg ? rg[0] + '–' + rg[1] : '0（立即補位，【自補】）', a.length, Math.min(...a), f(mean(a), 2), Math.max(...a), bad].join(' | ') + ' |');
    const hist = {}; a.forEach((x) => (hist[x] = (hist[x] || 0) + 1)); Object.keys(hist).forEach((d) => vrows.push([tier, cause, +d, hist[d]])); });
  csv('N1-vacancy-hist', ['tier', 'cause', 'days', 'count'], vrows);
  const ok = N1.field.ok && N1.mid.ok && vacOk;
  lines.push('', '**N1 ' + vb(ok) + '**：field 年率 ' + pc(N1.field.ann) + '（判準 15–21%）、mid ' + pc(N1.mid.ann) + ' CI ' + '[' + pc(N1.mid.lo) + ', ' + pc(N1.mid.hi) + ']（判準 7–11%）；空缺日數全在規則範圍：' + (vacOk ? '是' : '否') + '。');
  sec('N1 換人率與空缺日數', lines);
  summary.push(['N1', '年換人率 field／mid、空缺日數', 'field ' + pc(N1.field.ann) + '、mid ' + pc(N1.mid.ann) + '（CI ' + pc(N1.mid.lo) + '–' + pc(N1.mid.hi) + '）、空缺範圍外 ' + (vacOk ? 0 : '>0'), ok]);
}

// ---------- N2 ----------
{
  const lines = [];
  const pass2 = (RR) => { const ratio = M.TOWNS.map((t, ti) => RR.map((S) => S.popEnd[ti] / t.cap)); return { ratio, allOk: RR.filter((S) => S.popEnd.every((p, ti) => p >= 0.9 * M.TOWNS[ti].cap)).length }; };
  const p = pass2(R), p0 = pass2(R0);
  lines.push('第 1,200 日（10 年）各鎮人口／上限：', '', '| 鎮 | 上限 | 平均 | 最小 | ≥90% 的 seed | 敏感度：難民 0 平均 | 難民 0 最小 | 難民 0 ≥90% |', '|---|---|---|---|---|---|---|---|');
  M.TOWNS.forEach((t, ti) => { const a = p.ratio[ti], b = p0.ratio[ti]; lines.push('| ' + [t.name, t.cap, pc(mean(a), 1), pc(Math.min(...a), 1), a.filter((x) => x >= 0.9).length + '/' + SEEDS, pc(mean(b), 1), pc(Math.min(...b), 1), b.filter((x) => x >= 0.9).length + '/' + SEEDS].join(' | ') + ' |'); });
  // 軌跡
  const traj = []; R[0].popTraj.forEach((row, i) => { const m = row.map((_, j) => mean(R.map((S) => S.popTraj[i][j]))); const m0 = row.map((_, j) => mean(R0.map((S) => S.popTraj[i][j]))); traj.push([row[0]].concat(m.slice(1), m0.slice(1))); });
  csv('N2-pop-trajectory', ['day'].concat(M.TOWNS.map((t) => t.id), ['age50_share'], M.TOWNS.map((t) => t.id + '_refugee0'), ['age50_share_refugee0']), traj);
  const a50 = R.map((S) => S.age50); const okAge = Math.abs(mean(a50) - 0.25) <= 0.05; const okPop = p.allOk === SEEDS;
  const bands = [0, 1, 2, 3, 4].map((i) => mean(R.map((S) => S.ageBands[i])));
  lines.push('', '年齡分布（全部在鎮者，第 1,200 日，200 seeds 平均；開局為 20／55／15／10／0）：', '', '| 16–25 | 26–49 | 50–59 | 60–70 | 71+ | 50 歲以上 | 50+ 單 seed P5–P95 |', '|---|---|---|---|---|---|---|');
  lines.push('| ' + bands.map((x) => pc(x, 1)).join(' | ') + ' | ' + pc(mean(a50), 1) + ' | ' + pc(quantile(a50, 0.05), 1) + '–' + pc(quantile(a50, 0.95), 1) + ' |');
  const yr = [120, 240, 360, 600, 840, 1200].map((d) => [d, mean(R.map((S) => S.popTraj[d / 30 - 1][6]))]);
  lines.push('', '50 歲以上占比隨時間：' + yr.map(([d, x]) => '第 ' + d + ' 日 ' + pc(x, 1)).join('、') + '。');
  lines.push('', '各鎮 50+（第 1,200 日）：' + M.TOWNS.map((t, ti) => t.name + ' ' + pc(mean(R.map((S) => S.townAge50[ti])), 1)).join('、') + '。');
  csv('N2-age-end', ['seed', 'b16_25', 'b26_49', 'b50_59', 'b60_70', 'b71p', 'age50'].concat(M.TOWNS.map((t) => 'pop_' + t.id)), R.map((S) => [S.seed].concat(S.ageBands, [S.age50], S.popEnd)));
  const ok = okPop && okAge;
  lines.push('', '**N2 ' + vb(ok) + '**：人口 ' + (okPop ? '200/200 seed 各鎮 ≥90%' : '僅 ' + p.allOk + '/200 seed 各鎮 ≥90%') + '；50 歲以上 ' + pc(mean(a50), 1) + '（判準 20–30%）' + (okAge ? '' : '，超出 ' + pc(mean(a50) - 0.30, 1)) + '。');
  if (!okAge) lines.push('', '原因：居民年齡只會往上走，新進者（移入、難民）照開局分布抽，但遷出（5%／年）與死亡不分年齡外流，留下的人逐年變老；60+ 年死亡 10% 不足以把 50+ 拉回 25%。修正建議（擇一，需重驗）：① 移入者改抽偏年輕的分布（例：16–25 40%／26–49 50%／50+ 10%）；② 遷出改依年齡（年輕人遷出多）；③ 70 歲以上加一段高死亡率（例：71+ 25%／年）；④ 判準改成「穩態 50+ 占比」並由規格給目標。');
  sec('N2 人口軌跡與年齡分布', lines);
  summary.push(['N2', '10 年後各鎮 ≥90%、50+ 25%±5', (okPop ? '人口 200/200' : '人口 ' + p.allOk + '/200') + '；50+ ' + pc(mean(a50), 1), ok]);
}

// ---------- N3 ----------
{
  const lines = [];
  const win = (S, a, b, j) => { let s = 0; for (let d = a; d < b; d++) s += S.dailyDeaths[d][j]; return s / (b - a); };
  const cols = [['全域死亡（居民＋在任者）', 0], ['全域死亡（只居民）', 2], ['進墳場（居民＋在任者）', 1], ['進墳場（只居民）', 3], ['灰窯鎮本地死亡', 4]];
  lines.push('| 指標 | 第 1–120 日 | 第 1–1,200 日 | 第 1,081–1,200 日 |', '|---|---|---|---|');
  const vals = {};
  cols.forEach(([n, j]) => { const a = mean(R.map((S) => win(S, 0, 120, j))), b = mean(R.map((S) => win(S, 0, DAYS, j))), c = mean(R.map((S) => win(S, 1080, 1200, j))); vals[j] = [a, b, c]; lines.push('| ' + [n, f(a, 4), f(b, 4), f(c, 4)].join(' | ') + ' |'); });
  csv('N3-deaths-per-seed', ['seed', 'deaths_all', 'deaths_res', 'grave_all', 'grave_res', 'deaths_huiyao', 'd1_120_all', 'd1_120_grave'], R.map((S) => [S.seed, win(S, 0, DAYS, 0), win(S, 0, DAYS, 2), win(S, 0, DAYS, 1), win(S, 0, DAYS, 3), win(S, 0, DAYS, 4), win(S, 0, 120, 0), win(S, 0, 120, 1)]));
  const dd = []; for (let d = 0; d < DAYS; d++) dd.push([d + 1].concat([0, 1, 2, 3, 4].map((j) => mean(R.map((S) => S.dailyDeaths[d][j])))));
  csv('N3-deaths-daily-mean', ['day', 'deaths_all', 'grave_all', 'deaths_res', 'grave_res', 'deaths_huiyao'], dd);
  const D = vals[0][1], G = vals[1][1];
  const okD = Math.abs(D / 0.157 - 1) <= 0.10, okG = Math.abs(G / 0.108 - 1) <= 0.10;
  lines.push('', '口徑：手算 0.157＝800×2.35%÷120（全域 800 人、只算居民年死亡）、0.108＝550×2.35%÷120（灰窯＋驛站＋破曉＋其他 550 人）。任務書寫「灰窯原每日死亡」，但 0.157 只能由全域 800 人算出（灰窯 300 人只有 0.059），本輪以全域口徑判，並列出灰窯本地值；口徑列為待決問題。判定用「居民＋在任者、1–1,200 日」。');
  lines.push('', '**N3 ' + vb(okD && okG) + '**：每日死亡 ' + f(D, 4) + '（0.157±10% → 0.141–0.173，偏差 ' + pc(D / 0.157 - 1, 1) + '）、進墳場 ' + f(G, 4) + '（0.108±10% → 0.097–0.119，偏差 ' + pc(G / 0.108 - 1, 1) + '）。第 1–120 日：' + f(vals[0][0], 4) + '／' + f(vals[1][0], 4) + '。');
  lines.push('', '只看第 1–120 日、只算居民（與手算同口徑）：每日死亡 ' + f(vals[2][0], 4) + '（偏差 ' + pc(vals[2][0] / 0.157 - 1, 1) + '）、進墳場 ' + f(vals[3][0], 4) + '（偏差 ' + pc(vals[3][0] / 0.108 - 1, 1) + '）——開局年齡分布下手算成立；偏離來自之後的老化，以及在任者死亡（每日約 ' + f(vals[0][1] - vals[2][1], 4) + '）是否計入。');
  if (!(okD && okG)) lines.push('', '原因：N2 的人口老化讓居民加權死亡率逐年上升（開局 2.35%，後期 50+ 占比升高）。修正方向同 N2；或手算改用穩態年齡分布重算。');
  sec('N3 每日死亡與進墳場', lines);
  summary.push(['N3', '每日死亡 0.157、進墳場 0.108 ±10%', f(D, 4) + '／' + f(G, 4) + '（1–120 日 ' + f(vals[0][0], 4) + '／' + f(vals[1][0], 4) + '）', okD && okG]);
}

// ---------- N4 ----------
{
  const lines = []; const keys = ['draws', 'forbidHit', 'playerHit', 'strictRe', 'reservedRe', 'townRe', 'retiredRe', 'metRename', 'metEvents', 'strictColl', 'strictCollWeak', 'townColl', 'reuse240', 'sceneSameSur', 'sceneSkip', 'scenes', 'sceneN', 'fail'];
  const tot = (RR, k) => sum(RR.map((S) => S.name[k] || 0));
  const lab = { draws: '抽名次數（含重抽）', forbidHit: '禁組合命中→重抽', playerHit: '與玩家全名相同→重抽', strictRe: '嚴格唯一者抽到在世已用全名→重抽', reservedRe: '路人抽到嚴格唯一者全名→重抽', townRe: '路人抽到同鎮在世同名→重抽', retiredRe: '抽到 240 日內退任者全名→重抽', metRename: '路人首次 met 時全名已被他人使用→見面前改名', metEvents: 'met 0→1 次數', strictColl: '**驗證：嚴格唯一者在世撞名（強口徑：與任何在世者）**', strictCollWeak: '驗證：嚴格唯一者之間在世撞名（弱口徑）', townColl: '驗證：同鎮在世同名', reuse240: '驗證：新任者用了 240 日內退任全名', sceneSameSur: '**驗證：同場景同姓**', sceneSkip: '抽場景時因同姓跳過', scenes: '場景數', sceneN: '場景人次', fail: '5,000 次重抽仍失敗' };
  lines.push('200 seeds 合計（每日逐日檢查一次全部在世者）：', '', '| 項目 | 主跑（強唯一） | 每 seed 平均 | 敏感度：弱唯一 |', '|---|---|---|---|');
  keys.forEach((k) => lines.push('| ' + [lab[k], tot(R, k), f(tot(R, k) / SEEDS, 2), tot(RW, k)].join(' | ') + ' |'));
  csv('N4-names-per-seed', ['seed'].concat(keys), R.map((S) => [S.seed].concat(keys.map((k) => S.name[k] || 0))));
  const ok = tot(R, 'strictColl') === 0 && tot(R, 'strictCollWeak') === 0 && tot(R, 'sceneSameSur') === 0 && tot(R, 'reuse240') === 0 && tot(R, 'townColl') === 0;
  lines.push('', '弱唯一敏感度：只要求嚴格唯一者之間不撞，路人可以與嚴格唯一者同名（所以強口徑驗證數字很大，這是口徑差異，不是錯）；弱口徑下 met 改名只檢查嚴格唯一集合，因此會產生同鎮同名（' + tot(RW, 'townColl') + ' 次）——實作時改名必須同時檢查同鎮。');
  lines.push('', '每次抽名命中禁組合的機率約 ' + f(tot(R, 'forbidHit') / tot(R, 'draws') * 1e4, 2) + '‱（43／136,676 ≈ 3.15‱，抽樣池受氣味與 pres 限縮，所以會偏離）。');
  lines.push('', '**N4 ' + vb(ok) + '**：嚴格唯一撞名 ' + tot(R, 'strictColl') + '（弱口徑 ' + tot(R, 'strictCollWeak') + '）、同場景同姓 ' + tot(R, 'sceneSameSur') + '、禁組合重抽 ' + tot(R, 'forbidHit') + '、玩家同名重抽 ' + tot(R, 'playerHit') + '（' + SEEDS + ' seeds × ' + DAYS + ' 日，場景 ' + tot(R, 'scenes') + ' 次）。注意：撞名 0 是由「發放時拒絕重抽＋首次 met 前改名」保證的，這兩個機制的觸發次數見上表。');
  sec('N4 名字唯一性', lines);
  summary.push(['N4', '嚴格唯一撞名 0、同場景同姓 0', '撞名 ' + tot(R, 'strictColl') + '、同姓 ' + tot(R, 'sceneSameSur') + '、禁組合重抽 ' + tot(R, 'forbidHit') + '、玩家同名重抽 ' + tot(R, 'playerHit') + '、met 前改名 ' + tot(R, 'metRename'), ok]);
}

// ---------- N5 ----------
{
  const lines = []; const FL = M.FLAV;
  lines.push('pres 過濾後各氣味可用名數（m＝男向＋中性、f＝女向＋中性）：', '', '| 氣味 | 男向 | 女向 | 中性 | m 可用 | f 可用 | m 全名組合（×188 姓） | f 全名組合 |', '|---|---|---|---|---|---|---|---|');
  const prow = [];
  FL.forEach((n, i) => { const c = M.NAME_COUNTS[i]; lines.push('| ' + [n, c[0], c[1], c[2], M.POOL[i][0].length, M.POOL[i][1].length, M.POOL[i][0].length * 188, M.POOL[i][1].length * 188].join(' | ') + ' |'); prow.push([n, c[0], c[1], c[2], M.POOL[i][0].length, M.POOL[i][1].length]); });
  csv('N5-pool-sizes', ['flavor', 'male', 'female', 'neutral', 'avail_m', 'avail_f'], prow);
  // 有職位者：開局生成（主跑 200 + 補充 10,000 seeds）
  const holdAll = [].concat(...R.map((S) => S.flavHold.filter((x) => x[1] === 0)), ...G0.map((g) => g.flavHold));
  const holdLater = [].concat(...R.map((S) => S.flavHold.filter((x) => x[1] > 0)));
  const slots = M.SLOTS.filter((s) => s.tier !== 'street');
  lines.push('', '有職位者名字氣味＝職位味的比例（開局生成；200 主跑 seeds＋10,000 補充 seeds 的 day 0，共 ' + (SEEDS + 10000) + ' 份樣本／位）：', '', '| 位 | 鎮 | 職位味 | 手算 0.8+0.2×鎮占比 | 實測 | 差（百分點） | 判 |', '|---|---|---|---|---|---|---|');
  let okH = true; const hrows = [];
  slots.forEach((s) => { const a = holdAll.filter((x) => x[0] === s.id); const k = a.filter((x) => x[2] === s.flav).length; const e = 0.8 + 0.2 * M.TOWNS[s.town].dist[s.flav] / 100; const d = (k / a.length - e) * 100; const ok = Math.abs(d) <= 2; if (!ok) okH = false;
    lines.push('| ' + [s.id + (s.id === 'F01' ? ' 天星分號掌櫃' : s.id === 'M01' ? ' 鴉首' : ''), TN[s.town], FL[s.flav], f(e, 3), f(k / a.length, 4), f(d, 2), v(ok)].join(' | ') + ' |'); hrows.push([s.id, s.town, FL[s.flav], e, k / a.length, a.length]); });
  csv('N5-holder-flavor', ['slot', 'town', 'post_flavor', 'expected', 'observed', 'n'], hrows);
  const f01 = R.reduce((a, S) => [a[0] + S.f01[0], a[1] + S.f01[1]], [0, 0]);
  lines.push('', '天星分號掌櫃只看主跑 200 seeds：' + f(f01[0] / f01[1], 3) + ' ' + ci(f01[0], f01[1]) + '（n=200 的 95% CI 寬約 ±5 百分點，不足以判 ±2，所以補 10,000 seeds）。');
  // 世襲接任
  const her = holdLater.filter((x) => M.SLOTS.find((s) => s.id === x[0]).hered);
  if (her.length) lines.push('', '世襲接任者（F02、F15，運行中新生成）：' + her.length + ' 人，名字為職位味 ' + pc(her.filter((x) => x[2] === x[3]).length / her.length, 1) + '（規則 100%）。');
  // 第 1,200 日在任者
  const end = [].concat(...R.map((S) => S.flavHoldEnd)); const endOwn = end.filter((x) => x[1] === x[2]).length;
  const startOwn = holdAll.filter((x) => x[2] === M.SLOTS.find((s) => s.id === x[0]).flav).length / holdAll.length;
  lines.push('', '參考（不判）：第 1,200 日在任者名字＝職位味只剩 ' + pc(endOwn / end.length, 1) + '（開局 ' + pc(startOwn, 1) + '）。原因：補位走「居民池」時沿用該居民原本的名字（名字氣味＝鎮分布），只有世襲才重新生成。若規格希望在任者長期保持職位味，需要規定「居民池補位時是否改名／以職位味重新生成」——列為待決問題。');
  // 各鎮居民
  lines.push('', '各鎮居民名字氣味（開局 day 0；主跑 200＋補充 10,000 seeds）：', '', '| 鎮 | 樣本 | ' + FL.join(' | ') + ' | 最大偏差（百分點） | 判 |', '|---|---|' + FL.map(() => '---').join('|') + '|---|---|');
  let okR = true; const rrows = [];
  M.TOWNS.forEach((t, ti) => { const c = FL.map((_, j) => sum(R.map((S) => S.flavRes[ti][j])) + sum(G0.map((g) => g.flavRes[ti][j]))); const n = sum(c); const dev = Math.max(...c.map((x, j) => Math.abs(x / n * 100 - t.dist[j]))); const ok = dev <= 2; if (!ok) okR = false;
    lines.push('| ' + [t.name, n].concat(c.map((x, j) => f(x / n * 100, 2) + '（' + t.dist[j] + '）'), [f(dev, 2), v(ok)]).join(' | ') + ' |'); rrows.push([t.id, n].concat(c.map((x) => x / n), t.dist.map((x) => x / 100))); });
  csv('N5-resident-flavor', ['town', 'n'].concat(FL.map((x, i) => 'obs_' + i), FL.map((x, i) => 'exp_' + i)), rrows);
  lines.push('', '居民沒有職位味也沒有勢力味（【自補】本輪不建模勢力），主氣味與 20% 重抽都來自鎮分布，所以手算＝鎮分布本身。');
  const ok = okH && okR;
  lines.push('', '**N5 ' + vb(ok) + '**：21 個有職位者位置、5 鎮居民的名字氣味全部在手算 ±2 百分點內：' + (ok ? '是' : '否') + '；天星分號掌櫃 ' + f(holdAll.filter((x) => x[0] === 'F01' && x[2] === 4).length / holdAll.filter((x) => x[0] === 'F01').length, 4) + '（手算 0.83）。');
  sec('N5 氣味分布與可用名數', lines);
  summary.push(['N5', '氣味分布 ±2 百分點', '天星分號掌櫃 ' + f(holdAll.filter((x) => x[0] === 'F01' && x[2] === 4).length / holdAll.filter((x) => x[0] === 'F01').length, 4) + '（0.83）；最小可用名 ' + Math.min(...M.POOL.map((p) => Math.min(p[0].length, p[1].length))), ok]);
}

// ---------- N6 ----------
{
  const lines = [];
  const agg = (RR) => { const o = { cat: { hold: [0, 0], res: [0, 0], street: [0, 0] }, form: [0, 0, 0], changed: 0, giveup: 0, tries: 0, coll: 0 }; RR.forEach((S) => { ['hold', 'res', 'street'].forEach((c) => { o.cat[c][0] += S.nick.cat[c][0]; o.cat[c][1] += S.nick.cat[c][1]; }); [0, 1, 2].forEach((i) => (o.form[i] += S.nick.form[i])); o.changed += S.nick.changed; o.giveup += S.nick.giveup; o.tries += S.nick.tries; o.coll += S.nick.coll; }); return o; };
  const A = agg(R), B = agg(G0);
  const row = (n, o) => { const got = sum(o.form); return '| ' + [n, pc(o.cat.hold[0] / o.cat.hold[1], 1) + '（' + o.cat.hold[1] + '）', pc(o.cat.res[0] / o.cat.res[1], 1) + '（' + o.cat.res[1] + '）', pc(o.cat.street[0] / Math.max(1, o.cat.street[1]), 1), pc(o.form[0] / got, 1), pc(o.form[1] / got, 1), pc(o.form[2] / got, 1), pc(o.coll / o.tries, 1), pc(o.changed / o.tries, 1), pc(o.giveup / o.tries, 2) + '（' + o.giveup + '/' + o.tries + '）'].join(' | ') + ' |'; };
  lines.push('| 範圍 | 有職位者有綽號 | 居民有綽號 | 街頭 | bare | 詞＋姓 | 姓＋老＋排行 | 首選撞名 | 撞名後改字形／改詞 | 放棄率 |', '|---|---|---|---|---|---|---|---|---|---|');
  lines.push(row('主跑 200 seeds × 1,200 日（含移入者）', A), row('補充：10,000 seeds 開局', B));
  lines.push('', '規則值：有職位 60%、居民 30%（實測是「拿到綽號」的比例，已扣掉放棄）；字形首選期望 bare 44.15%（含複姓改 bare：0.4＋0.6×13/188）、詞＋姓 37.23%、姓＋老＋排行 18.62%；上表是撞名處理後的最終字形。');
  csv('N6-nickname', ['scope', 'hold_with', 'hold_n', 'res_with', 'res_n', 'street_with', 'street_n', 'bare', 'word_sur', 'sur_lao_rank', 'first_collision', 'changed', 'giveup', 'tries'], [['main', A], ['day0_10000', B]].map(([n, o]) => [n, o.cat.hold[0], o.cat.hold[1], o.cat.res[0], o.cat.res[1], o.cat.street[0], o.cat.street[1], o.form[0], o.form[1], o.form[2], o.coll, o.changed, o.giveup, o.tries]));
  const g = A.giveup / A.tries; const ok = g <= 0.10;
  lines.push('', '**N6 ' + vb(ok) + '**：放棄率 ' + pc(g, 2) + '（判準 ≤10%）；撞名後改字形／改詞 ' + pc(A.changed / A.tries, 1) + '。');
  sec('N6 綽號', lines);
  summary.push(['N6', '綽號放棄率 ≤10%', '放棄 ' + pc(g, 2) + '、改字形 ' + pc(A.changed / A.tries, 1) + '、有職位有綽號 ' + pc(A.cat.hold[0] / A.cat.hold[1], 1) + '、居民 ' + pc(A.cat.res[0] / A.cat.res[1], 1), ok]);
}

// ---------- N7 ----------
{
  const lines = [];
  const CJK = (i) => String.fromCharCode(0x4e00 + (i % 20000));
  const surStr = (s) => (s >= M.N_SUR - M.N_SUR_COMPOUND ? CJK(s) + CJK(s + 500) : CJK(s)); // 複姓 2 字、單姓 1 字
  const givenStr = (g) => CJK(1000 + g) + CJK(3000 + g); // 【自補】名一律 2 字（保守上限）
  const STAT = { alive: '在世', dead: '亡故', moved: '遷出', promoted: '升遷' };
  const EV = ['出生', '遷入', '就任', '卸任', '受傷'];
  const light = (p, seed, pid) => ({ pid, seed: (Math.imul(seed + 1, 2654435761) >>> 0), town: M.TOWNS[p.town].id, status: p.status, met: p.met });
  const full = (p, seed, pid) => {
    const nick = p.nickKey ? (p.nickForm === 0 ? CJK(5000) + CJK(5001) : p.nickForm === 1 ? CJK(5000) + CJK(5001) + surStr(p.sur) : surStr(p.sur) + '老' + '一二三四五六'[p.rank - 1]) : null;
    return { pid, seed: (Math.imul(seed + 1, 2654435761) >>> 0), sur: surStr(p.sur), given: givenStr(p.given), nick, rank: p.rank, flavor: M.FLAV[p.nflav], pres: p.pres ? 'f' : 'm', face: p.face, traits: p.traits.map((t) => M.TAGS[t][0]), born: Math.round(p.born), town: M.TOWNS[p.town].id, faction: null, post: p.slot, status: p.status,
      history: [0, 1, 2, 3, 4].map((i) => ({ d: Math.round(p.born) + 1000 * i, e: EV[i], t: M.TOWNS[p.town].id })), met: p.met, tie: 0, kin: [], grave: p.status === 'dead' && M.TOWNS[p.town].grave ? 1199 : null };
  };
  const mk = (seeds) => { const ps = []; seeds.forEach((s) => R[s].alive.forEach((a) => a.forEach((p) => ps.push([p, s])))); return ps; };
  const p800 = mk([0]); const s800 = JSON.stringify(p800.map(([p, s], i) => full(p, s, i)));
  const p8k = mk([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 8000);
  const half = Math.floor(p8k.length / 2);
  const arrL = p8k.slice(0, half).map(([p, s], i) => light(p, s, i)), arrF = p8k.slice(half).map(([p, s], i) => full(p, s, half + i));
  const s8k = JSON.stringify(arrL.concat(arrF));
  const s8kFull = JSON.stringify(p8k.map(([p, s], i) => full(p, s, i)));
  const avgL = JSON.stringify(arrL).length / arrL.length, avgF = JSON.stringify(arrF).length / arrF.length;
  // 敏感度：kin 2 人、tie 有值、faction 有值、每筆簡歷帶 20 字說明
  const fullHeavy = (p, s, pid) => { const o = full(p, s, pid); o.kin = [pid + 1, pid + 2]; o.tie = 37; o.faction = 'faction_x'; o.history.forEach((h) => (h.note = CJK(7000).repeat(20))); return o; };
  const s8kHeavy = JSON.stringify(arrL.concat(p8k.slice(half).map(([p, s], i) => fullHeavy(p, s, half + i))));
  const bytes = (s) => Buffer.byteLength(s, 'utf8');
  // 修正建議用：精簡編碼（短鍵名、鎮／氣味／特徵／狀態用索引、簡歷用 [日, 事件碼, 鎮] 陣列、空欄省略）
  const TI = {}; M.TOWNS.forEach((t, i) => (TI[t.id] = i)); const SI = { alive: 0, dead: 1, moved: 2, promoted: 3 };
  const compact = (o) => { const c = { i: o.pid, s: o.seed, n: o.sur + o.given, r: o.rank, f: M.FLAV.indexOf(o.flavor), p: o.pres === 'f' ? 1 : 0, c: o.face, t: o.traits.map((x) => M.TAGS.findIndex((y) => y[0] === x)), b: o.born, w: TI[o.town], st: SI[o.status], h: o.history.map((h, k) => [h.d, k, TI[h.t]]), m: o.met };
    if (o.nick) c.k = o.nick; if (o.post) c.j = o.post; if (o.faction) c.g = o.faction; if (o.tie) c.ti = o.tie; if (o.kin.length) c.kn = o.kin; if (o.grave !== null) c.gr = o.grave; if (o.sur.length === 2) c.cs = 1; return c; };
  const compactL = (o) => { const c = { i: o.pid, s: o.seed, w: TI[o.town], st: SI[o.status] }; if (o.met) c.m = o.met; return c; };
  const s8kCompact = JSON.stringify(arrL.map(compactL).concat(arrF.map(compact)));
  const s8kMid = JSON.stringify(arrL.concat(arrF.map((o) => Object.assign({}, o, { history: o.history.map((h, k) => [h.d, k, TI[h.t]]) }))));
  lines.push('記錄欄位照任務書：輕＝{pid, seed, town, status, met}；完整＝3.1 全欄（姓、名、綽號、排行、氣味、pres、臉、特徵、出生、鎮、勢力、職位、狀態、簡歷 5 筆、met、tie、kin、grave），英文鍵名、中文值（佔位 CJK 字）。人物取自主跑 seed 0..9 第 1,200 日在世者，依序取滿 ' + p8k.length + ' 人（seed 0..9 只有 7,999 人，用 seed 10 補 1 人）。', '');
  lines.push('| 情境 | 人數 | JSON.stringify 字元數 | UTF-8 位元組 | 判準 |', '|---|---|---|---|---|');
  lines.push('| 800 人全完整（seed 0） | ' + p800.length + ' | ' + s800.length.toLocaleString() + ' | ' + bytes(s800).toLocaleString() + ' | — |');
  lines.push('| 8,000 人半輕半完整 | ' + p8k.length + ' | ' + s8k.length.toLocaleString() + ' | ' + bytes(s8k).toLocaleString() + ' | ≤1,500,000 字元：' + v(s8k.length <= 1500000) + ' |');
  lines.push('| 參考：8,000 人全完整 | ' + p8k.length + ' | ' + s8kFull.length.toLocaleString() + ' | ' + bytes(s8kFull).toLocaleString() + ' | — |');
  lines.push('| 敏感度：半輕半完整、完整記錄加 kin 2 人／tie／勢力／每筆簡歷 20 字說明 | ' + p8k.length + ' | ' + s8kHeavy.length.toLocaleString() + ' | ' + bytes(s8kHeavy).toLocaleString() + ' | ' + (s8kHeavy.length <= 1500000 ? '仍 ≤150 萬' : '超過 150 萬') + ' |');
  lines.push('| 修正建議 A：同上鍵名，只把簡歷 5 筆改成 [日, 事件碼, 鎮索引] 陣列 | ' + p8k.length + ' | ' + s8kMid.length.toLocaleString() + ' | ' + bytes(s8kMid).toLocaleString() + ' | ' + (s8kMid.length <= 1500000 ? '≤150 萬' : '超過 150 萬') + ' |');
  lines.push('| 修正建議 B：精簡編碼（短鍵名、索引值、空欄省略、簡歷陣列） | ' + p8k.length + ' | ' + s8kCompact.length.toLocaleString() + ' | ' + bytes(s8kCompact).toLocaleString() + ' | ' + (s8kCompact.length <= 1500000 ? '≤150 萬' : '超過 150 萬') + ' |');
  lines.push('', '平均每筆：輕 ' + f(avgL, 1) + ' 字元、完整 ' + f(avgF, 1) + ' 字元。手算 110 萬 ≈ 4,000×(輕+完整)，本輪 ' + (s8k.length / 1e4).toFixed(1) + ' 萬。');
  lines.push('', '範例（完整）：`' + JSON.stringify(arrF[0]) + '`', '', '範例（輕）：`' + JSON.stringify(arrL[0]) + '`');
  csv('N7-save-size', ['case', 'n', 'chars', 'utf8_bytes'], [['800_full', p800.length, s800.length, bytes(s800)], ['8000_half', p8k.length, s8k.length, bytes(s8k)], ['8000_full', p8k.length, s8kFull.length, bytes(s8kFull)], ['8000_half_heavy', p8k.length, s8kHeavy.length, bytes(s8kHeavy)]]);
  const ok = s8k.length <= 1500000;
  if (!ok) lines.push('', '原因：主口徑每筆完整記錄 ' + f(avgF, 0) + ' 字元，其中簡歷 5 筆物件約 ' + f(JSON.stringify(arrF[0].history).length, 0) + ' 字元、英文鍵名約 ' + f(JSON.stringify(arrF[0]).match(/"[a-z]+":/g).join('').length, 0) + ' 字元；手算 110 萬隱含每筆完整約 ' + f(1100000 / 4000 - avgL, 0) + ' 字元。規則（欄位清單）本身不必改，改存檔編碼即可：建議 A／B 見上表。若規格要求簡歷帶文字說明（敏感度列），則需另訂上限或只對 met≥1 的人存簡歷。');
  csv('N7-save-size-variants', ['case', 'chars'], [['8000_half_historyArray', s8kMid.length], ['8000_half_compact', s8kCompact.length]]);
  lines.push('', '**N7 ' + vb(ok) + '**：8,000 人半輕半完整 ' + s8k.length.toLocaleString() + ' 字元（判準 ≤1,500,000；手算約 110 萬）；800 人全完整 ' + s800.length.toLocaleString() + ' 字元。');
  sec('N7 存檔大小', lines);
  summary.push(['N7', '8,000 人半輕半完整 ≤150 萬字元', s8k.length.toLocaleString() + ' 字元（800 全完整 ' + s800.length.toLocaleString() + '）', ok]);
}

// ---------- 輸出 ----------
const head = ['# 《山海錄》SPEC-NPC v0.1 人事與生成分布驗算（num-shl-npc-gen）', '',
  '依據：SPEC-NPC v0.1（待驗算，2026-11-28）；base numbers/num-shl-b1-t3v5 7106871；名庫為合成佔位、只驗規模。', '',
  '- 執行：`node sim/npc/run.js`（約 ' + Math.round((Date.now() - t00) / 1000) + ' 秒）。主跑 seed＝0..199，每 seed 1,200 日；全部固定 seed，重跑結果相同。',
  '- 補充：N5／N6 的生成分布另跑 seed 100000..109999 的開局（day 0），因為 200 個樣本不夠判 ±2 個百分點。敏感度：難民安頓 0（N2）、弱唯一口徑（N4）。',
  '- 只新增 `sim/npc/`、`evidence/npc-gen-*.md`、`evidence/csv-npc/`；沒有改任何既有檔。建模選擇與待決問題見 `evidence/npc-gen-assumptions.md`。', '',
  '## 總表', '', '| 項 | 判準 | 主要數字 | 結論 |', '|---|---|---|---|'].concat(summary.map((s) => '| ' + [s[0], s[1], s[2], s[3] ? '過' : '**不過**'].join(' | ') + ' |'), ['']);
fs.mkdirSync(path.join(ROOT, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'evidence', 'npc-gen-results.md'), head.concat(res).join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
fs.writeFileSync(path.join(CSV_DIR, 'summary.json'), JSON.stringify(summary.map((s) => ({ id: s[0], criterion: s[1], numbers: s[2], pass: s[3] })), null, 1) + '\n');
log('完成：' + summary.map((s) => s[0] + (s[3] ? '過' : '不過')).join(' '));
