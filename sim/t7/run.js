'use strict';
/* T7 重驗（DEV-02，num-shl-t7-dev02）。一行重現：node sim/t7/run.js
 * 依據：被驗分支 docs/design/batch1/specs/SPEC-TIME.md v0.4（B1、E11、AC 12、§6 歇息列、§15 T7 列、§17 Q-T7）。
 * 只讀 js/，不改；所有輸出寫在 evidence/csv-t7/ 與 stdout。 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const L = require('./load');
const { simulate } = require('./core');
const T = require('../lib/time');
const U = require('../lib/util');

const OUT = path.join(L.ROOT, 'evidence', 'csv-t7');
fs.mkdirSync(OUT, { recursive: true });
const r3 = U.r3;
function csv(name, header, rows) {
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : r3(v)) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(OUT, name), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
const clock = T.fmtClock;
const dayOf = T.dayOf;
const out = []; const P = (s) => { out.push(s); console.log(s); };
let head = 'unknown';
try { head = '被驗（最後一個動到 js/docs/tests/index.html 的 commit）' + execSync('git log -1 --format=%H -- js docs tests index.html', { cwd: L.ROOT }).toString().trim() + '；checkout ' + execSync('git rev-parse HEAD', { cwd: L.ROOT }).toString().trim(); } catch (e) { /* ignore */ }

// ---------------- 規則 ----------------
const inst = L.load(); const G = inst.G, D = inst.D;
const impl = (t) => G.wakeTime(t);                       // DEV-02 實作（vm 載入，真的呼叫 js/game.js 的 wakeTime）
const verb = L.verbatimWake(D).fn;                       // 逐字複製 js/game.js 的 function wakeTime 本體
const simV04 = (t) => { let n8 = Math.floor(t / 1440) * 1440 + 480; if (n8 < t) n8 += 1440; return Math.min(Math.max(t + 360, n8), t + 780); }; // 本輪 sim 重寫（照規格文字）
const v03 = T.wakeNew;                                   // 舊規則 v0.3：sim/lib/time.js:66（num-shl-b1-sim@e76bf93）
const mainBug = T.wakeOld;                               // main 現況缺陷：sim/lib/time.js:67
const implMax = {};                                      // 敏感度：每個 maxH 一個獨立 vm 實例（只改記憶體中的 D.SLEEP.maxH）
[11, 12, 13, 14].forEach((h) => { const x = L.load(); x.D.SLEEP.maxH = h; implMax[h] = (t) => x.G.wakeTime(t); });

// 完整路徑：真的走 G.service('rest')（客棧）／G.service('bunk')（傷兵帳）→ sleepToMorning → passTime → 逐日 newDay
const FP = L.load(); FP.G.restart(20261128, 'drifter');
function fullPath(kind, t, opt) {
  const G2 = FP.G, S = G2.state; opt = opt || {};
  S.dead = null; S.scene = 'town'; S.combat = null; S.event = null; S.trade = null;
  if (kind === 'rest') { S.loc = 'huiyao'; S.townTab = 'hy_inn'; } else { S.loc = 'poxiao'; S.townTab = 'px_medic'; }
  S.silver = 1e6; S.hp = opt.hp !== undefined ? opt.hp : G2.maxHp(); S.food = opt.food !== undefined ? opt.food : 80; S.fat = opt.fat !== undefined ? opt.fat : 10; S.corrupt = 0;
  // S.log 上限 200 條（game.js:236 會 shift），先換成空陣列再計數，避免切片錯位
  S.t = t; S.log = []; const silver0 = S.silver;
  G2.service(kind);
  const logs = S.log.slice();
  const days = logs.filter((x) => /新的一天/.test(x.text));
  return { wake: S.t, paid: silver0 - S.silver, food: S.food, hp: S.hp, dead: !!S.dead, newDays: days.length, midnightOk: days.every((x) => x.t % 1440 === 0), logs };
}

// ================= 條件 1：全時段掃描 =================
const SWEEP_DAYS = [1, 5, 30, 31, 90, 120, 121, 240];
const pts = [];
SWEEP_DAYS.forEach((d) => { for (let m = 0; m < 1440; m += 30) pts.push({ src: 'grid30', t: (d - 1) * 1440 + m }); [479, 481, 490, 1439].forEach((m) => pts.push({ src: 'edge', t: (d - 1) * 1440 + m })); });
const rng = U.mulberry32(20261128);
for (let i = 0; i < 10000; i++) pts.push({ src: 'random', t: Math.floor(rng() * 240 * 1440) });
const sweepRows = []; let mn = Infinity, mx = -Infinity, outside = 0, mism = 0, fpMism = 0, fpDead = 0, fpDayBad = 0, fpN = 0, fpPayBad = 0;
pts.forEach((p) => {
  const w = impl(p.t), h = (w - p.t) / 60;
  const wv = verb(p.t), ws = simV04(p.t);
  const fr = fullPath('rest', p.t); fpN++;
  const fb = p.src === 'random' ? null : fullPath('bunk', p.t);
  const ok = w === wv && w === ws; if (!ok) mism++;
  if (fr.wake !== w || (fb && fb.wake !== w)) fpMism++;
  if (fr.dead || (fb && fb.dead)) fpDead++;
  const expDays = dayOf(w) - dayOf(p.t);
  if (fr.newDays !== expDays || !fr.midnightOk) fpDayBad++;
  mn = Math.min(mn, h); mx = Math.max(mx, h); if (h < 6 || h > 13) outside++;
  sweepRows.push([p.src, dayOf(p.t), p.t, clock(p.t), w, dayOf(w), clock(w), h, wv === w ? 1 : 0, ws === w ? 1 : 0, fr.wake === w ? 1 : 0, fb ? (fb.wake === w ? 1 : 0) : '', fr.newDays, expDays, (v03(p.t) - p.t) / 60, (mainBug(p.t) - p.t) / 60]);
});
csv('sweep.csv', ['source', 'bed_day', 'bed_abs_min', 'bed_clock', 'wake_abs_min', 'wake_day', 'wake_clock', 'sleep_h_v04_impl', 'verbatim_eq', 'simrewrite_eq', 'fullpath_rest_eq', 'fullpath_bunk_eq', 'fullpath_newDay_calls', 'expected_day_crossings', 'sleep_h_v03', 'sleep_h_main'], sweepRows);
P('# T7 重驗（DEV-02）  HEAD=' + head);
P('## 條件 1 全時段掃描');
P('格點數 ' + pts.length + '（grid30 ' + pts.filter((p) => p.src === 'grid30').length + '、edge ' + pts.filter((p) => p.src === 'edge').length + '、random ' + pts.filter((p) => p.src === 'random').length + '；就寢日 ' + SWEEP_DAYS.join('／') + ' + 隨機 1–240 日，seed 20261128）');
P('睡眠時長 min ' + r3(mn) + ' h、max ' + r3(mx) + ' h、超出 [6,13] 個數 ' + outside);
P('實作 vs 逐字複製 vs sim 重寫 不一致：' + mism + '；完整路徑（rest 全部 ' + fpN + ' 點、bunk 非隨機點）與 wakeTime 不一致：' + fpMism + '；完整路徑死亡：' + fpDead + '；newDay 次數或 00:00 時刻不符：' + fpDayBad);
// 每小時桶的分佈
const bucket = {}; sweepRows.forEach((r) => { const b = Math.floor((r[2] % 1440) / 60); (bucket[b] = bucket[b] || []).push(r[7]); });
const distRows = Object.keys(bucket).map((b) => [String(b).padStart(2, '0') + ':00–' + String(b).padStart(2, '0') + ':59', bucket[b].length, Math.min(...bucket[b]), Math.max(...bucket[b]), U.mean(bucket[b])]);
csv('sweep-by-hour.csv', ['bed_hour', 'n', 'min_h', 'max_h', 'mean_h'], distRows);
// 規格對照點
const SPEC_PTS = [['20:00（day 5）', 4 * 1440 + 1200, 5 * 1440 + 480, 12], ['03:00', 4 * 1440 + 180, 4 * 1440 + 540, 6], ['07:00', 4 * 1440 + 420, 4 * 1440 + 780, 6], ['08:10', 4 * 1440 + 490, 4 * 1440 + 1270, 13], ['00:00', 4 * 1440, 4 * 1440 + 480, 8]];
const specRows = SPEC_PTS.map(([n, t, ew, eh]) => { const w = impl(t), fr = fullPath('rest', t), fb = fullPath('bunk', t); return [n, T.fmtT(t), T.fmtT(ew), eh, T.fmtT(w), (w - t) / 60, T.fmtT(fr.wake), T.fmtT(fb.wake), w === ew && fr.wake === ew && fb.wake === ew ? '過' : '不過']; });
csv('spec-points.csv', ['point', 'bed', 'spec_wake', 'spec_h', 'impl_wake', 'impl_h', 'fullpath_rest_wake', 'fullpath_bunk_wake', 'verdict'], specRows);
P('| 規格點 | 就寢 | 規格起床 | 規格時數 | 實作起床 | 實作時數 | rest 完整路徑 | bunk 完整路徑 | 結論 |'); P('|---|---|---|---|---|---|---|---|---|');
specRows.forEach((r) => P('| ' + r.map((x) => (typeof x === 'number' ? r3(x).replace(/\.000$/, '') : x)).join(' | ') + ' |'));

// ================= 條件 3：假設 (a) 邊界 =================
P('## 條件 3 假設 (a) 邊界');
const exclusive = (t) => { let n8 = Math.floor(t / 1440) * 1440 + 480; if (n8 <= t) n8 += 1440; return Math.min(Math.max(t + 360, n8), t + 780); };
const aRows = [['07:59', 4 * 1440 + 479], ['08:00', 4 * 1440 + 480], ['08:01', 4 * 1440 + 481], ['第 1 日 08:00（開局）', 480], ['跨日 00:00（第 5 日）', 4 * 1440], ['23:59（第 4 日）', 3 * 1440 + 1439], ['02:00', 4 * 1440 + 120], ['02:01', 4 * 1440 + 121], ['19:00', 4 * 1440 + 1140], ['19:01', 4 * 1440 + 1141]].map(([n, t]) => {
  const w = impl(t), fr = fullPath('rest', t);
  return [n, T.fmtT(t), T.fmtT(w), (w - t) / 60, T.fmtT(fr.wake), T.fmtT(exclusive(t)), (exclusive(t) - t) / 60, T.fmtT(v03(t)), (v03(t) - t) / 60];
});
csv('assumption-a.csv', ['case', 'bed', 'impl_wake', 'impl_h', 'fullpath_rest_wake', 'if_exclusive_wake', 'if_exclusive_h', 'v03_wake', 'v03_h'], aRows);
P('| 情況 | 就寢 | 實作起床 | 時數 | rest 完整路徑 | 若「不含當下」 | 時數 | v0.3 起床 | 時數 |'); P('|---|---|---|---|---|---|---|---|---|');
aRows.forEach((r) => P('| ' + r.map((x) => (typeof x === 'number' ? r3(x) : x)).join(' | ') + ' |'));

// ================= 條件 2：期限 =================
P('## 條件 2 睡過頭期限');
const SEEDS = 200;
const RULES = { v04: impl, v03, main: mainBug };
function agg(list) { const k = Object.keys(list[0]); const o = {}; k.forEach((x) => { const v = list.map((y) => y[x]); const w = v.filter((y) => !Number.isNaN(y)); o[x] = { mean: U.mean(w), max: w.length ? Math.max(...w) : NaN, min: w.length ? Math.min(...w) : NaN }; }); return o; }
// 一組情境：scen = [{seed, mode, arg}]；回傳每規則每情境的 A（不處理）與 B（有處理）結果
function runSet(scen, rules, ref) {
  const res = {};
  Object.keys(rules).forEach((k) => { res[k] = scen.map((s) => ({ A: simulate(s.seed, rules[k], ref, false, s.mode, s.arg), B: simulate(s.seed, rules[k], ref, true, s.mode, s.arg) })); });
  return res;
}
function flat(rs) { return rs.map((x) => ({ A_overslept: x.A.overslept, A_expAsleep: x.A.expAsleep, A_expired: x.A.expired, B_expired: x.B.expired, B_overslept: x.B.overslept, B_expAsleep: x.B.expAsleep, B_done: x.B.done, B_delay: x.B.delayN ? x.B.delaySum / x.B.delayN : NaN, B_zeroDone: x.B.done === 0 ? 1 : 0, B_tideDelay: x.B.tideN ? x.B.tideFinish / x.B.tideN : NaN, B_missedHear: x.B.missedHear, B_sleepH: x.B.sleepH, B_long13: x.B.longSleeps, B_maxSleep: x.B.maxSleep, B_minSleep: x.B.minSleep })); }
/* 違反判定（逐情境，新 vs 舊，同 seed 同就寢設定）：
 *  期限類（T7 原指標）：A 睡過頭時段期限、B 過期、B 因睡過頭 任一項 新 > 舊；
 *  延誤類：B 完成件 出現→完成 平均小時 新 > 舊（完成 0 件記為 +∞，即最差）；
 *  另報（資訊，不列判準）：A／B 睡著時過期 新 > 舊、完成件數 新 < 舊。 */
function viol(nw, od) {
  const dly = (x) => (x.B.delayN ? x.B.delaySum / x.B.delayN : Infinity);
  const c = { dl: 0, A_overslept: 0, B_expired: 0, B_overslept: 0, dly: 0, tdly: 0, expAsleep: 0, done: 0 };
  nw.forEach((n, i) => { const o = od[i];
    const a = n.A.overslept > o.A.overslept, b = n.B.expired > o.B.expired, bo = n.B.overslept > o.B.overslept;
    if (a) c.A_overslept++; if (b) c.B_expired++; if (bo) c.B_overslept++; if (a || b || bo) c.dl++;
    if (dly(n) > dly(o) + 1e-9) c.dly++;
    if (n.B.tideFinish > o.B.tideFinish + 1e-9) c.tdly++;
    if (n.A.expAsleep > o.A.expAsleep || n.B.expAsleep > o.B.expAsleep) c.expAsleep++;
    if (n.B.done < o.B.done) c.done++; });
  return c;
}
const SETS = {
  orig: { label: '原情境（T7.js：就寢 22:00±3h，seed 0–199）', scen: [...Array(SEEDS).keys()].map((s) => ({ seed: s, mode: 'orig' })) },
  allday_grid: { label: '全天格點（每天固定同一就寢分鐘，0:00–23:30 每 30 分 48 格 × seed 0–49）', scen: [].concat(...[...Array(48).keys()].map((k) => [...Array(50).keys()].map((s) => ({ seed: s, mode: 'slot', arg: k * 30 })))) },
  allday_rand: { label: '全天隨機（每次就寢在 0:00–23:59 均勻抽分鐘，seed 0–199）', scen: [...Array(SEEDS).keys()].map((s) => ({ seed: s, mode: 'rand' })) },
};
const sumRows = []; const violRows = []; const RES = {};
Object.keys(SETS).forEach((sk) => {
  const S0 = SETS[sk]; const res = runSet(S0.scen, RULES, impl); RES[sk] = res;
  const A = {}; Object.keys(RULES).forEach((k) => (A[k] = agg(flat(res[k]))));
  P('### ' + S0.label + '（情境數 ' + S0.scen.length + '；「睡過頭」參考＝v0.4 實作）');
  P('| 指標（每情境 60 天） | v0.4 新（DEV-02 實作） 平均／最大 | v0.3 舊 平均／最大 | main 缺陷 平均／最大 |'); P('|---|---|---|---|');
  const MET = [['A_overslept', 'A 不處理：期限落在睡過頭時段'], ['A_expAsleep', 'A 不處理：期限落在任何睡眠中'], ['A_expired', 'A 不處理：期限總數'], ['B_expired', 'B 有處理：過期件數'], ['B_overslept', 'B 其中因睡過頭'], ['B_expAsleep', 'B 其中睡著時過期'], ['B_done', 'B 完成件數'], ['B_delay', 'B 完成件 出現→完成 平均小時（只計有完成的情境）'], ['B_zeroDone', 'B 完成 0 件的情境比例'], ['B_tideDelay', 'B 配對延誤：每件獸潮 出現→完成 小時（未完成記到期）'], ['B_missedHear', 'B 睡著錯過傳聞'], ['B_sleepH', 'B 總睡眠時數'], ['B_long13', 'B 睡 >13h 次數'], ['B_maxSleep', 'B 單次最長睡眠 h'], ['B_minSleep', 'B 單次最短睡眠 h']];
  MET.forEach(([m, n]) => { P('| ' + n + ' | ' + r3(A.v04[m].mean) + '／' + r3(A.v04[m].max) + ' | ' + r3(A.v03[m].mean) + '／' + r3(A.v03[m].max) + ' | ' + r3(A.main[m].mean) + '／' + r3(A.main[m].max) + ' |'); sumRows.push([sk, m, A.v04[m].mean, A.v04[m].max, A.v03[m].mean, A.v03[m].max, A.main[m].mean, A.main[m].max]); });
  const v1 = viol(res.v04, res.v03), v2 = viol(res.v04, res.main);
  const vs = (v) => '期限類 ' + v.dl + '（A 睡過頭 ' + v.A_overslept + '、B 過期 ' + v.B_expired + '、B 因睡過頭 ' + v.B_overslept + '）、延誤類 ' + v.dly + '（配對獸潮延誤 ' + v.tdly + '）；資訊：睡著時過期較多 ' + v.expAsleep + '、完成件數較少 ' + v.done;
  P('違反次數（新 v0.4 比舊更差的情境數）：對 v0.3 ' + vs(v1) + '；對 main ' + vs(v2));
  const v3 = viol(res.v03, res.main); P('參考（不是本輪判準）：v0.3 對 main 同一判定 ' + vs(v3));
  violRows.push([sk, S0.scen.length, 'ref_v03_vs_main', v3.dl, v3.A_overslept, v3.B_expired, v3.B_overslept, v3.dly, v3.tdly, v3.expAsleep, v3.done]);
  violRows.push([sk, S0.scen.length, 'v04_vs_v03', v1.dl, v1.A_overslept, v1.B_expired, v1.B_overslept, v1.dly, v1.tdly, v1.expAsleep, v1.done], [sk, S0.scen.length, 'v04_vs_main', v2.dl, v2.A_overslept, v2.B_expired, v2.B_overslept, v2.dly, v2.tdly, v2.expAsleep, v2.done]);
});
csv('deadline-summary.csv', ['set', 'metric', 'v04_mean', 'v04_max', 'v03_mean', 'v03_max', 'main_mean', 'main_max'], sumRows);
csv('deadline-violations.csv', ['set', 'n_scenarios', 'compare', 'viol_deadline_any', 'viol_A_overslept', 'viol_B_expired', 'viol_B_overslept', 'viol_delay', 'viol_matched_tide_delay', 'info_more_expired_while_asleep', 'info_fewer_done'], violRows);
// 全天格點：逐就寢格的新舊比較
const slotRows = [];
for (let k = 0; k < 48; k++) {
  const idx = SETS.allday_grid.scen.map((s, i) => (s.arg === k * 30 ? i : -1)).filter((i) => i >= 0);
  const pick = (rule) => agg(flat(idx.map((i) => RES.allday_grid[rule][i])));
  const a = pick('v04'), b = pick('v03'), c = pick('main');
  slotRows.push([clock(k * 30), (impl(4 * 1440 + k * 30) - (4 * 1440 + k * 30)) / 60, a.B_expired.mean, b.B_expired.mean, c.B_expired.mean, a.A_expAsleep.mean, b.A_expAsleep.mean, c.A_expAsleep.mean, a.B_done.mean, b.B_done.mean, c.B_done.mean, a.B_delay.mean, b.B_delay.mean, c.B_delay.mean]);
}
csv('deadline-allday-by-slot.csv', ['bed_clock', 'sleep_h_v04', 'B_expired_v04', 'B_expired_v03', 'B_expired_main', 'A_expAsleep_v04', 'A_expAsleep_v03', 'A_expAsleep_main', 'B_done_v04', 'B_done_v03', 'B_done_main', 'B_delay_v04', 'B_delay_v03', 'B_delay_main'], slotRows);

// ================= 敏感度 maxH 11–14 =================
P('## 敏感度 maxH ∈ {11,12,13,14}（vm 實例內改 D.SLEEP.maxH；對 v0.3 比）');
P('| maxH | 情境組 | 違反 對 v0.3（期限類／延誤類／配對獸潮延誤／資訊:完成較少） | B 過期 平均／最大 | A 睡著時過期 平均／最大 | B 完成件數 平均 | 規格點 20:00→12h | 08:10 起睡 h | 全時段 min–max h |'); P('|---|---|---|---|---|---|---|---|---|');
const sensRows = []; const distByMax = [];
const v03res = { orig: RES.orig.v03, allday_grid: RES.allday_grid.v03, allday_rand: RES.allday_rand.v03 };
[11, 12, 13, 14].forEach((h) => {
  const f = implMax[h];
  let lo = Infinity, hi = -Infinity; for (let m = 0; m < 1440; m++) { const x = (f(4 * 1440 + m) - (4 * 1440 + m)) / 60; lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const p20 = (f(4 * 1440 + 1200) - (4 * 1440 + 1200)) / 60, p810 = (f(4 * 1440 + 490) - (4 * 1440 + 490)) / 60;
  for (let b = 0; b < 24; b++) { const v = []; for (let m = b * 60; m < b * 60 + 60; m++) v.push((f(4 * 1440 + m) - (4 * 1440 + m)) / 60); distByMax.push([h, String(b).padStart(2, '0') + ':00', Math.min(...v), Math.max(...v), U.mean(v)]); }
  Object.keys(SETS).forEach((sk) => {
    const res = SETS[sk].scen.map((s) => ({ A: simulate(s.seed, f, f, false, s.mode, s.arg), B: simulate(s.seed, f, f, true, s.mode, s.arg) }));
    const a = agg(flat(res)); const v = viol(res, v03res[sk]);
    P('| ' + h + ' | ' + sk + ' | ' + v.dl + '／' + v.dly + '／' + v.tdly + '／' + v.done + ' | ' + r3(a.B_expired.mean) + '／' + r3(a.B_expired.max) + ' | ' + r3(a.A_expAsleep.mean) + '／' + r3(a.A_expAsleep.max) + ' | ' + r3(a.B_done.mean) + ' | ' + r3(p20) + ' | ' + r3(p810) + ' | ' + r3(lo) + '–' + r3(hi) + ' |');
    sensRows.push([h, sk, SETS[sk].scen.length, v.dl, v.dly, v.tdly, v.done, a.B_expired.mean, a.B_expired.max, a.A_expAsleep.mean, a.A_expAsleep.max, a.B_done.mean, a.B_delay.mean, a.B_sleepH.mean, p20, p810, lo, hi]);
  });
});
csv('sensitivity-maxH.csv', ['maxH', 'set', 'n', 'viol_deadline_vs_v03', 'viol_delay_vs_v03', 'viol_matched_tide_delay_vs_v03', 'fewer_done_vs_v03', 'B_expired_mean', 'B_expired_max', 'A_expAsleep_mean', 'A_expAsleep_max', 'B_done_mean', 'B_delay_mean_h', 'B_sleepH_mean', 'spec_20_00_h', 'bed_08_10_h', 'sweep_min_h', 'sweep_max_h'], sensRows);
csv('sensitivity-sleep-by-hour.csv', ['maxH', 'bed_hour', 'min_h', 'max_h', 'mean_h'], distByMax);

// ================= 條件 4：wrnd =================
P('## 條件 4 wrnd 對齊');
const W = L.load(); const wSeeds = [0, 1, 42, 12345, 20261128, 0xffffffff]; const wTags = ['tide-first', 'tide-gap', 'tide-town', 'pnoise-huiyao', 'pnoise-duyin', 'quest', 'tide-def', 'rescue'];
const wRows = []; let wDiff = 0, wN = 0;
wSeeds.forEach((seed) => { W.G.restart(seed, 'drifter'); const s2 = W.G.state.seed;
  wTags.forEach((tag) => { for (let n = 0; n < 24; n++) { const day = n, i = n % 3; const g = W.G._debug.wrnd(tag, day, i), s = U.wrnd(seed, tag, day, i); wN++; if (g !== s) wDiff++; wRows.push([seed, s2, tag, day, i, g, s, g === s ? 1 : 0]); } }); });
csv('wrnd-compare.csv', ['seed_arg', 'S.seed', 'tag', 'day', 'i', 'game_wrnd', 'sim_util_wrnd', 'bit_equal'], wRows.map((r) => r.map((x) => (typeof x === 'number' && !Number.isInteger(x) ? x.toPrecision(17) : x))));
P('種子 ' + wSeeds.length + ' 組 × 標籤 ' + wTags.length + ' × 每組 24 個 (day,i)：比對 ' + wN + ' 個輸出，逐位不同 ' + wDiff + ' 個');

// ================= anyhour 複算 =================
P('## 開發 anyhour 腳本複算（重建版，見 sim/t7/anyhour_repro.js）');
const AH = require('./anyhour_repro');
const ah = AH.run(impl);
ah.lines.forEach(P);
csv('anyhour-repro.csv', ['mode', 'metric', 'new', 'old', 'dev_reported_new', 'dev_reported_old', 'match'], ah.rows);

// ================= 條件 5：其他路徑 =================
P('## 條件 5 實作路徑抽查');
const g5 = [['js/data.js', /const SLEEP =/], ['js/game.js', /function wakeTime|function sleepToMorning|passTime\(\(wakeTime|sleepToMorning\(\)|passTime\(8, \{ food: 16/]];
g5.forEach(([f, re]) => L.grepLines(f, re).forEach(([n, l]) => P('- `' + f + ':' + n + '` ' + l.slice(0, 160))));
// 食物、睡眠保護
const food = [['rest 6h（03:00，春）', 'rest', 4 * 1440 + 180], ['rest 13h（08:10，春）', 'rest', 4 * 1440 + 490], ['rest 12h（20:00，春）', 'rest', 4 * 1440 + 1200], ['rest 13h（08:10，冬 第 95 日）', 'rest', 94 * 1440 + 490], ['bunk 13h（08:10，春）', 'bunk', 4 * 1440 + 490]].map(([n, k, t]) => { const r = fullPath(k, t, { food: 80 }); const h = (r.wake - t) / 60; const winter = T.seasonOf(r.wake) === 3 ? 1.25 : 1; return [n, h, 80 - r.food, h * 1.25 * winter]; });
P('| 情況 | 睡眠 h | 實作飽食消耗 | SPEC-TIME §6.2 1.25／h（冬 ×1.25） |'); P('|---|---|---|---|'); food.forEach((r) => P('| ' + r[0] + ' | ' + r3(r[1]) + ' | ' + r3(r[2]) + ' | ' + r3(r[3]) + ' |'));
const prot = [['rest 13h 飽食 0、hp 10', 'rest', 4 * 1440 + 490], ['bunk 13h 飽食 0、hp 10', 'bunk', 4 * 1440 + 490], ['rest 6h 飽食 0、hp 10', 'rest', 4 * 1440 + 180]].map(([n, k, t]) => { const r = fullPath(k, t, { food: 0, hp: 10 }); return [n, r.dead ? '死亡' : '存活', r.hp, (r.logs.find((x) => /死|倒/.test(x.text)) || {}).text || '']; });
P('| 睡眠保護（SPEC-TIME §6.5 Q7：rest／bunk hp 最低 1） | 結果 | hp | 日誌 |'); P('|---|---|---|---|'); prot.forEach((r) => P('| ' + r.join(' | ') + ' |'));
csv('path-checks.csv', ['check', 'a', 'b', 'c'], food.map((r) => ['food:' + r[0], r[1], r[2], r[3]]).concat(prot.map((r) => ['protect:' + r[0], r[1], r[2], r[3]])));

fs.writeFileSync(path.join(OUT, 'run-stdout.txt'), out.join('\n') + '\n');
