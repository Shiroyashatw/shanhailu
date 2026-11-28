'use strict';
/* T7 最終複驗（num-shl-t7-final）。一行重現：node sim/t7f/run.js
 * 複製自 sim/t7/run.js（numbers/num-shl-t7-dev02@bedd6855），樣本組、種子、情境、掃描點完全相同。
 * 判準：mumi 17:44 Q-T7b 甲＋17:53 裁定（交辦單轉述；被驗 commit 內 SPEC-TIME.md 仍是 v0.4，見 evidence/t7-final-assumptions.md）。
 *   期限／過期類逐情境 新 ≤ v0.3（違反 0）；延誤類比全樣本平均（只算有完成件數）；0 完成情境數 新 ≤ 舊；逐情境延誤違反只當資訊。
 * 另驗 59d4f8b 的兩項修正：睡眠飽食 1.25×時數、rest／bunk hp 最低 1；露宿／茶攤小憩不保護。
 * 只讀 js/，不改；所有輸出寫在 evidence/csv-t7f/ 與 stdout。 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const L = require('./load');
const { simulate } = require('./core');
const T = require('../lib/time');
const U = require('../lib/util');
const os = require('os');
const vm = require('vm');

const OUT = path.join(L.ROOT, 'evidence', 'csv-t7f');
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
  const food0 = S.food;
  // S.log 上限 200 條（game.js:236 會 shift），先換成空陣列再計數，避免切片錯位
  S.t = t; S.log = []; const silver0 = S.silver;
  G2.service(kind);
  const logs = S.log.slice();
  const days = logs.filter((x) => /新的一天/.test(x.text));
  return { wake: S.t, paid: silver0 - S.silver, food: S.food, food0, hp: S.hp, dead: !!S.dead, newDays: days.length, midnightOk: days.every((x) => x.t % 1440 === 0), logs };
}

// ================= 條件 1：全時段掃描 =================
const SWEEP_DAYS = [1, 5, 30, 31, 90, 120, 121, 240];
const pts = [];
SWEEP_DAYS.forEach((d) => { for (let m = 0; m < 1440; m += 30) pts.push({ src: 'grid30', t: (d - 1) * 1440 + m }); [479, 481, 490, 1439].forEach((m) => pts.push({ src: 'edge', t: (d - 1) * 1440 + m })); });
const rng = U.mulberry32(20261128);
for (let i = 0; i < 10000; i++) pts.push({ src: 'random', t: Math.floor(rng() * 240 * 1440) });
// 睡眠飽食期望值（獨立公式）：扣 1.25×h，冬季（以起床時刻 seasonOf 判，與 passTime 現況相同）×1.25，下限 0，再照 passTime 的 Math.round 取整
const expFood = (food0, t, w) => { const h = (w - t) / 60; const mult = T.seasonOf(w) === 3 ? 1.25 : 1; return Math.round(Math.min(100, Math.max(0, food0 - 1.25 * h * mult))); };
let foodBad = 0, foodN = 0;
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
  const ef = expFood(80, p.t, w); foodN++; if (fr.food !== ef) foodBad++; if (fb) { foodN++; if (fb.food !== ef) foodBad++; }
  if (fr.newDays !== expDays || !fr.midnightOk) fpDayBad++;
  mn = Math.min(mn, h); mx = Math.max(mx, h); if (h < 6 || h > 13) outside++;
  sweepRows.push([p.src, dayOf(p.t), p.t, clock(p.t), w, dayOf(w), clock(w), h, wv === w ? 1 : 0, ws === w ? 1 : 0, fr.wake === w ? 1 : 0, fb ? (fb.wake === w ? 1 : 0) : '', fr.newDays, expDays, (v03(p.t) - p.t) / 60, (mainBug(p.t) - p.t) / 60, 80 - fr.food, fb ? 80 - fb.food : '', 80 - ef, 1.25 * h * (T.seasonOf(w) === 3 ? 1.25 : 1), fr.hp, fb ? fb.hp : '']);
});
csv('sweep.csv', ['source', 'bed_day', 'bed_abs_min', 'bed_clock', 'wake_abs_min', 'wake_day', 'wake_clock', 'sleep_h_v04_impl', 'verbatim_eq', 'simrewrite_eq', 'fullpath_rest_eq', 'fullpath_bunk_eq', 'fullpath_newDay_calls', 'expected_day_crossings', 'sleep_h_v03', 'sleep_h_main', 'rest_food_deduct', 'bunk_food_deduct', 'expected_food_deduct_rounded', 'spec_food_deduct_exact', 'rest_hp_after', 'bunk_hp_after'], sweepRows);
P('# T7 最終複驗（num-shl-t7-final）  ' + head);
P('## 條件 1 全時段掃描');
P('格點數 ' + pts.length + '（grid30 ' + pts.filter((p) => p.src === 'grid30').length + '、edge ' + pts.filter((p) => p.src === 'edge').length + '、random ' + pts.filter((p) => p.src === 'random').length + '；就寢日 ' + SWEEP_DAYS.join('／') + ' + 隨機 1–240 日，seed 20261128）');
P('睡眠時長 min ' + r3(mn) + ' h、max ' + r3(mx) + ' h、超出 [6,13] 個數 ' + outside);
P('實作 vs 逐字複製 vs sim 重寫 不一致：' + mism + '；完整路徑（rest 全部 ' + fpN + ' 點、bunk 非隨機點）與 wakeTime 不一致：' + fpMism + '；完整路徑死亡：' + fpDead + '；newDay 次數或 00:00 時刻不符：' + fpDayBad);
P('完整路徑飽食（food0=80）與獨立公式 round(80−1.25h×冬1.25) 不符：' + foodBad + '／' + foodN);
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

// ================= 條件 2：期限／過期類 與 延誤類（新判準） =================
P('## 條件 2 期限／過期類（逐情境 新 ≤ v0.3，違反 0）與延誤類（全樣本平均，只算有完成件數；0 完成情境數 新 ≤ 舊）');
const SEEDS = 200;
const RULES = { v04: impl, v03, main: mainBug };
function runSet(scen, rules, ref) {
  const res = {};
  Object.keys(rules).forEach((k) => { res[k] = scen.map((s) => ({ A: simulate(s.seed, rules[k], ref, false, s.mode, s.arg), B: simulate(s.seed, rules[k], ref, true, s.mode, s.arg) })); });
  return res;
}
const amax = (a) => Math.max(...a);
// 一個規則在一組樣本上的彙總
function summ(rs) {
  const g = (f) => rs.map(f);
  const doneN = g((x) => x.B.delayN).reduce((a, b) => a + b, 0), delayS = g((x) => x.B.delaySum).reduce((a, b) => a + b, 0);
  const tideN = g((x) => x.B.tideN).reduce((a, b) => a + b, 0), tideS = g((x) => x.B.tideFinish).reduce((a, b) => a + b, 0);
  const perScen = rs.filter((x) => x.B.delayN).map((x) => x.B.delaySum / x.B.delayN);
  const o = {};
  [['A_overslept', (x) => x.A.overslept], ['B_expired', (x) => x.B.expired], ['B_overslept', (x) => x.B.overslept], ['A_expAsleep', (x) => x.A.expAsleep], ['B_expAsleep', (x) => x.B.expAsleep], ['B_done', (x) => x.B.done], ['B_sleepH', (x) => x.B.sleepH], ['B_maxSleep', (x) => x.B.maxSleep], ['B_minSleep', (x) => x.B.minSleep], ['B_long13', (x) => x.B.longSleeps]].forEach(([k, f]) => { const v = g(f); o[k] = { mean: U.mean(v), max: amax(v) }; });
  o.doneN = doneN; o.delayPooled = doneN ? delayS / doneN : NaN; o.delayMaxScen = perScen.length ? amax(perScen) : NaN; o.delayScenMean = perScen.length ? U.mean(perScen) : NaN;
  o.zeroDone = rs.filter((x) => x.B.done === 0).length; o.tidePooled = tideN ? tideS / tideN : NaN; o.tideN = tideN;
  o.tideMaxScen = amax(rs.map((x) => (x.B.tideN ? x.B.tideFinish / x.B.tideN : 0)));
  return o;
}
// 逐情境違反：期限類（判準）＋延誤類（資訊；沿用上一輪定義：0 完成記 +∞）
function viol(nw, od) {
  const dly = (x) => (x.B.delayN ? x.B.delaySum / x.B.delayN : Infinity);
  const c = { dl: 0, A_overslept: 0, B_expired: 0, B_overslept: 0, dly: 0, dlyBothDone: 0, tdly: 0, done: 0 };
  nw.forEach((n, i) => { const o = od[i];
    const a = n.A.overslept > o.A.overslept, b = n.B.expired > o.B.expired, bo = n.B.overslept > o.B.overslept;
    if (a) c.A_overslept++; if (b) c.B_expired++; if (bo) c.B_overslept++; if (a || b || bo) c.dl++;
    if (dly(n) > dly(o) + 1e-9) c.dly++;
    if (n.B.delayN && o.B.delayN && dly(n) > dly(o) + 1e-9) c.dlyBothDone++;
    if (n.B.tideFinish > o.B.tideFinish + 1e-9) c.tdly++;
    if (n.B.done < o.B.done) c.done++; });
  return c;
}
const SETS = {
  orig: { label: '原情境（T7.js：就寢 22:00±3h，seed 0–199）', scen: [...Array(SEEDS).keys()].map((s) => ({ seed: s, mode: 'orig' })) },
  allday_grid: { label: '全天格點（每天固定同一就寢分鐘，0:00–23:30 每 30 分 48 格 × seed 0–49）', scen: [].concat(...[...Array(48).keys()].map((k) => [...Array(50).keys()].map((s) => ({ seed: s, mode: 'slot', arg: k * 30 })))) },
  allday_rand: { label: '全天隨機（每次就寢在 0:00–23:59 均勻抽分鐘，seed 0–199）', scen: [...Array(SEEDS).keys()].map((s) => ({ seed: s, mode: 'rand' })) },
};
const RES = {}; const sumRows = []; const verdict = { deadline: [], delay: [], zero: [], tide: [] };
function judge(sk, nwRes, odRes, label, rowsOut, tag) {
  const a = summ(nwRes), b = summ(odRes), v = viol(nwRes, odRes);
  const okDl = v.dl === 0, okDelay = a.delayPooled <= b.delayPooled + 1e-12, okZero = a.zeroDone <= b.zeroDone, okTide = a.tidePooled <= b.tidePooled + 1e-12;
  rowsOut.push([tag, sk, SETS[sk].scen.length, a.A_overslept.mean, a.A_overslept.max, b.A_overslept.mean, b.A_overslept.max, v.A_overslept, a.B_expired.mean, a.B_expired.max, b.B_expired.mean, b.B_expired.max, v.B_expired, a.B_overslept.mean, a.B_overslept.max, b.B_overslept.mean, b.B_overslept.max, v.B_overslept, v.dl, a.delayPooled, b.delayPooled, a.delayMaxScen, b.delayMaxScen, a.doneN, b.doneN, a.zeroDone, b.zeroDone, a.B_done.mean, b.B_done.mean, a.tidePooled, b.tidePooled, a.tideMaxScen, b.tideMaxScen, v.dly, v.dlyBothDone, v.tdly, v.done, okDl && okDelay && okZero && okTide ? 'pass' : 'fail']);
  return { a, b, v, okDl, okDelay, okZero, okTide };
}
const judgeRows = [];
const HDR = ['compare', 'set', 'n_scen', 'A_overslept_new_mean', 'A_overslept_new_max', 'A_overslept_old_mean', 'A_overslept_old_max', 'viol_A_overslept', 'B_expired_new_mean', 'B_expired_new_max', 'B_expired_old_mean', 'B_expired_old_max', 'viol_B_expired', 'B_overslept_new_mean', 'B_overslept_new_max', 'B_overslept_old_mean', 'B_overslept_old_max', 'viol_B_overslept', 'viol_deadline_any', 'delay_pooled_new_h', 'delay_pooled_old_h', 'delay_max_scen_new_h', 'delay_max_scen_old_h', 'done_items_new', 'done_items_old', 'zero_done_scen_new', 'zero_done_scen_old', 'done_mean_new', 'done_mean_old', 'tide_delay_pooled_new_h', 'tide_delay_pooled_old_h', 'tide_delay_max_scen_new_h', 'tide_delay_max_scen_old_h', 'info_viol_delay_perscen_inf', 'info_viol_delay_perscen_both_done', 'info_viol_tide_perscen', 'info_fewer_done', 'verdict'];
Object.keys(SETS).forEach((sk) => {
  const S0 = SETS[sk]; const res = runSet(S0.scen, RULES, impl); RES[sk] = res;
  const j = judge(sk, res.v04, res.v03, S0.label, judgeRows, 'new_vs_v03');
  const jm = judge(sk, res.v04, res.main, S0.label, judgeRows, 'info_new_vs_main');
  judge(sk, res.v03, res.main, S0.label, judgeRows, 'info_v03_vs_main');
  verdict.deadline.push([sk, j.okDl]); verdict.delay.push([sk, j.okDelay]); verdict.zero.push([sk, j.okZero]); verdict.tide.push([sk, j.okTide]);
  const f = (x) => r3(x);
  P('### ' + S0.label + '（情境數 ' + S0.scen.length + '；「睡過頭」參考＝新規則實作）');
  P('| 指標 | 新（實作） 平均／最大 | v0.3 舊 平均／最大 | 違反（逐情境 新>舊） | main 缺陷 平均／最大（資訊） | 新對 main 違反（資訊） |'); P('|---|---|---|---|---|---|');
  const m = summ(res.main);
  [['A_overslept', 'A 不處理：期限落在睡過頭時段', 'A_overslept'], ['B_expired', 'B 有處理：過期件數', 'B_expired'], ['B_overslept', 'B 其中因睡過頭', 'B_overslept']].forEach(([k, n, vk]) => P('| ' + n + ' | ' + f(j.a[k].mean) + '／' + f(j.a[k].max) + ' | ' + f(j.b[k].mean) + '／' + f(j.b[k].max) + ' | ' + j.v[vk] + ' | ' + f(m[k].mean) + '／' + f(m[k].max) + ' | ' + jm.v[vk] + ' |'));
  P('期限／過期類違反合計（任一項）：新對 v0.3 **' + j.v.dl + '**；新對 main（資訊）' + jm.v.dl);
  P('| 延誤類（全樣本） | 新 | v0.3 舊 | 判定 | main（資訊） |'); P('|---|---|---|---|---|');
  P('| B 完成件 出現→完成 全樣本平均 h（只算有完成件數） | ' + f(j.a.delayPooled) + ' | ' + f(j.b.delayPooled) + ' | ' + (j.okDelay ? '新≤舊 過' : '新>舊 不過') + ' | ' + f(m.delayPooled) + ' |');
  P('| 單一情境最大的情境平均延誤 h | ' + f(j.a.delayMaxScen) + ' | ' + f(j.b.delayMaxScen) + ' | 資訊 | ' + f(m.delayMaxScen) + ' |');
  P('| 有完成件數（全組合計） | ' + j.a.doneN + ' | ' + j.b.doneN + ' | 資訊 | ' + m.doneN + ' |');
  P('| 0 完成情境數 | ' + j.a.zeroDone + ' | ' + j.b.zeroDone + ' | ' + (j.okZero ? '新≤舊 過' : '新>舊 不過') + ' | ' + m.zeroDone + ' |');
  P('| 完成件數 每情境平均 | ' + f(j.a.B_done.mean) + ' | ' + f(j.b.B_done.mean) + ' | 資訊 | ' + f(m.B_done.mean) + ' |');
  P('| 配對獸潮延誤 全樣本平均 h（每件獸潮；未完成記到期） | ' + f(j.a.tidePooled) + ' | ' + f(j.b.tidePooled) + ' | ' + (j.okTide ? '新≤舊 過' : '新>舊 不過') + ' | ' + f(m.tidePooled) + ' |');
  P('| 配對獸潮延誤 單一情境最大 h | ' + f(j.a.tideMaxScen) + ' | ' + f(j.b.tideMaxScen) + ' | 資訊 | ' + f(m.tideMaxScen) + ' |');
  P('逐情境延誤違反（資訊，不列門檻）：新對 v0.3 完成件延誤 ' + j.v.dly + '／' + S0.scen.length + '（上一輪定義，0 完成記 +∞）、其中雙方都有完成 ' + j.v.dlyBothDone + '；配對獸潮 ' + j.v.tdly + '；完成件數較少 ' + j.v.done);
  P('其他（資訊）：睡眠時長 新 單次 min／max ' + f(j.a.B_minSleep.mean) + '（最小 ' + f(Math.min(...res.v04.map((x) => x.B.minSleep))) + '）／' + f(j.a.B_maxSleep.max) + '；>13h 次數 新 ' + f(j.a.B_long13.max) + '、v0.3 平均 ' + f(j.b.B_long13.mean));
  sumRows.push([sk, 'B_sleepH_mean', j.a.B_sleepH.mean, j.b.B_sleepH.mean, m.B_sleepH.mean], [sk, 'A_expAsleep_mean', j.a.A_expAsleep.mean, j.b.A_expAsleep.mean, m.A_expAsleep.mean], [sk, 'B_expAsleep_mean', j.a.B_expAsleep.mean, j.b.B_expAsleep.mean, m.B_expAsleep.mean], [sk, 'delay_scen_mean_of_means_h', j.a.delayScenMean, j.b.delayScenMean, m.delayScenMean]);
});
csv('deadline-delay-judgement.csv', HDR, judgeRows);
csv('deadline-info-extra.csv', ['set', 'metric', 'new', 'v03', 'main'], sumRows);
const slotRows = [];
for (let k = 0; k < 48; k++) {
  const idx = SETS.allday_grid.scen.map((s, i) => (s.arg === k * 30 ? i : -1)).filter((i) => i >= 0);
  const pick = (rule) => summ(idx.map((i) => RES.allday_grid[rule][i]));
  const a = pick('v04'), b = pick('v03'), c = pick('main');
  slotRows.push([clock(k * 30), (impl(4 * 1440 + k * 30) - (4 * 1440 + k * 30)) / 60, a.B_expired.mean, b.B_expired.mean, c.B_expired.mean, a.B_done.mean, b.B_done.mean, c.B_done.mean, a.delayPooled, b.delayPooled, c.delayPooled, a.zeroDone, b.zeroDone, c.zeroDone]);
}
csv('deadline-allday-by-slot.csv', ['bed_clock', 'sleep_h_new', 'B_expired_new', 'B_expired_v03', 'B_expired_main', 'B_done_new', 'B_done_v03', 'B_done_main', 'delay_pooled_new', 'delay_pooled_v03', 'delay_pooled_main', 'zero_done_new', 'zero_done_v03', 'zero_done_main'], slotRows);

// ================= 敏感度 maxH 11–14（資訊） =================
P('## 敏感度 maxH ∈ {11,12,13,14}（vm 實例內改 D.SLEEP.maxH；對 v0.3 比；資訊）');
P('| maxH | 情境組 | 期限類違反 | 延誤全樣本平均 新／v0.3 | 0 完成情境 新／v0.3 | 配對獸潮全樣本 新／v0.3 | 逐情境延誤違反（資訊） | 新判準 | 20:00→h | 08:10→h | 全時段 h |'); P('|---|---|---|---|---|---|---|---|---|---|---|');
const sensRows = [];
[11, 12, 13, 14].forEach((h) => {
  const f = implMax[h];
  let lo = Infinity, hi = -Infinity; for (let m = 0; m < 1440; m++) { const x = (f(4 * 1440 + m) - (4 * 1440 + m)) / 60; lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const p20 = (f(4 * 1440 + 1200) - (4 * 1440 + 1200)) / 60, p810 = (f(4 * 1440 + 490) - (4 * 1440 + 490)) / 60;
  Object.keys(SETS).forEach((sk) => {
    const res = SETS[sk].scen.map((s) => ({ A: simulate(s.seed, f, f, false, s.mode, s.arg), B: simulate(s.seed, f, f, true, s.mode, s.arg) }));
    const rows = []; const j = judge(sk, res, RES[sk].v03, '', rows, 'maxH' + h);
    const ok = j.okDl && j.okDelay && j.okZero && j.okTide;
    P('| ' + h + ' | ' + sk + ' | ' + j.v.dl + ' | ' + r3(j.a.delayPooled) + '／' + r3(j.b.delayPooled) + ' | ' + j.a.zeroDone + '／' + j.b.zeroDone + ' | ' + r3(j.a.tidePooled) + '／' + r3(j.b.tidePooled) + ' | ' + j.v.dly + ' | ' + (ok ? '過' : '不過') + ' | ' + r3(p20) + ' | ' + r3(p810) + ' | ' + r3(lo) + '–' + r3(hi) + ' |');
    sensRows.push([h, ...rows[0].slice(1), p20, p810, lo, hi]);
  });
});
csv('sensitivity-maxH.csv', ['maxH', ...HDR.slice(1), 'spec_20_00_h', 'bed_08_10_h', 'sweep_min_h', 'sweep_max_h'], sensRows);

// ================= 條件 4：wrnd =================
P('## 條件 4 wrnd 對齊');
const W = L.load(); const wSeeds = [0, 1, 42, 12345, 20261128, 0xffffffff]; const wTags = ['tide-first', 'tide-gap', 'tide-town', 'pnoise-huiyao', 'pnoise-duyin', 'quest', 'tide-def', 'rescue'];
const wRows = []; let wDiff = 0, wN = 0;
wSeeds.forEach((seed) => { W.G.restart(seed, 'drifter'); const s2 = W.G.state.seed;
  wTags.forEach((tag) => { for (let n = 0; n < 24; n++) { const day = n, i = n % 3; const g = W.G._debug.wrnd(tag, day, i), s = U.wrnd(seed, tag, day, i); wN++; if (g !== s) wDiff++; wRows.push([seed, s2, tag, day, i, g, s, g === s ? 1 : 0]); } }); });
csv('wrnd-compare.csv', ['seed_arg', 'S.seed', 'tag', 'day', 'i', 'game_wrnd', 'sim_util_wrnd', 'bit_equal'], wRows.map((r) => r.map((x) => (typeof x === 'number' && !Number.isInteger(x) ? x.toPrecision(17) : x))));
P('種子 ' + wSeeds.length + ' 組 × 標籤 ' + wTags.length + ' × 每組 24 個 (day,i)：比對 ' + wN + ' 個輸出，逐位不同 ' + wDiff + ' 個');

// ================= anyhour 複算 =================
P('## 開發 anyhour 腳本複算（重建版，見 sim/t7f/anyhour_repro.js）');
const AH = require('./anyhour_repro');
const ah = AH.run(impl);
ah.lines.forEach(P);
csv('anyhour-repro.csv', ['mode', 'metric', 'new', 'old', 'dev_reported_new', 'dev_reported_old', 'match'], ah.rows);

// ================= 條件 5：兩項修正與露宿（直接呼叫實作） =================
P('## 條件 5 兩項修正（59d4f8b）與露宿無保護：直接呼叫實作');
// 上一輪被驗 d0989ba 的實作：用 git show 抽到暫存目錄，vm 載入做前後對照（不寫進 repo）
let OLD = null; const OLD_SHA = 'd0989ba447ff9c9ab9337841db398b9d82173a9a';
try {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't7f-old-')); fs.mkdirSync(path.join(dir, 'js'));
  ['data', 'game'].forEach((f) => fs.writeFileSync(path.join(dir, 'js', f + '.js'), execSync('git show ' + OLD_SHA + ':js/' + f + '.js', { cwd: L.ROOT, maxBuffer: 64 << 20 })));
  OLD = dir;
} catch (e) { P('（無法取出 ' + OLD_SHA + ' 的 js/：' + e.message + '）'); }
// 函式原文前後對照：上一輪 d0989ba、修正前 72fc23d、被驗 HEAD
const FN_LIST = ['passTime', 'newDay', 'wakeTime', 'sleepToMorning', 'service', 'camp', 'wrnd', 'worldTick', 'townTick', 'regionTick', 'questTick', 'rumorTick', 'checkDeath', 'maxHp', 'isNight', 'seasonOf', 'innCost', 'restockShops'];
function fnText(src, name) { const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[^\\n]*\\}|function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}'); const m = src.match(re); return m ? m[0] : null; }
const curSrc = fs.readFileSync(path.join(L.ROOT, 'js/game.js'), 'utf8');
const fnRows = [];
['d0989ba', '72fc23d'].forEach((c) => { let o = ''; try { o = execSync('git show ' + c + ':js/game.js', { cwd: L.ROOT, maxBuffer: 64 << 20 }).toString(); } catch (e) { return; }
  FN_LIST.forEach((n) => { const a = fnText(o, n), b = fnText(curSrc, n); fnRows.push([c, n, a ? 1 : 0, b ? 1 : 0, a === b ? 'same' : 'changed']); }); });
csv('fn-diff.csv', ['vs_commit', 'function', 'found_old', 'found_head', 'status'], fnRows);
P('函式原文對照（HEAD 對 d0989ba／72fc23d）有改動的：' + fnRows.filter((r) => r[4] !== 'same').map((r) => r[0] + ':' + r[1]).join('、'));

function mkInst(root) { const x = L.load(root); x.G.restart(20261128, 'drifter'); return x; }
function setTown(G2, kind) { const S = G2.state; S.dead = null; S.scene = 'town'; S.combat = null; S.event = null; S.trade = null; S.overlay = null;
  if (kind === 'rest') { S.loc = 'huiyao'; S.townTab = 'hy_inn'; } else if (kind === 'bunk') { S.loc = 'poxiao'; S.townTab = 'px_medic'; } else { S.loc = 'yizhan'; S.townTab = 'yz_tea'; } }
function runSvc(root, kind, t, st) {
  const x = mkInst(root), G2 = x.G, S = G2.state; setTown(G2, kind);
  S.silver = 1000; S.corrupt = st.corrupt || 0; S.hp = st.hp; S.food = st.food; S.fat = st.fat; S.t = t; S.log = [];
  const mh0 = G2.maxHp();
  G2.service(kind);
  return { wake: S.t, h: (S.t - t) / 60, hp: S.hp, food: S.food, fat: S.fat, corrupt: S.corrupt, dead: !!S.dead, cause: S.dead ? S.dead.cause : '', paid: 1000 - S.silver, maxHp0: mh0, maxHp1: G2.maxHp(), newDays: S.log.filter((l) => /新的一天/.test(l.text)).length };
}
// ---- 5a 飽食：實作傳給 passTime 的值（逐字抽出 sleepFoodCost／sleepToMorning，passTime 換成記錄器）----
const sfcText = (curSrc.match(/function sleepFoodCost\(hours\) \{[^\n]*\}/) || [''])[0];
const stmText = L.verbatimFn('sleepToMorning');
function captureSleep(t, opts) { const box = { S: { t }, wakeTime: (n) => G.wakeTime(n), cap: null }; vm.createContext(box);
  vm.runInContext('function passTime(h, o) { cap = { h, o }; }\n' + sfcText + '\n' + stmText + '\nsleepToMorning(' + JSON.stringify(opts || null) + ');', box); return box.cap; }
const FOOD_NAMED = [['20:00→12h', 4 * 1440 + 1200], ['03:00→6h', 4 * 1440 + 180], ['00:00→8h', 4 * 1440], ['08:10→13h', 4 * 1440 + 490], ['08:00→6h', 4 * 1440 + 480], ['08:01→13h', 4 * 1440 + 481],
  ['冬 20:00→12h（第 95 日）', 94 * 1440 + 1200], ['冬 03:00→6h', 94 * 1440 + 180], ['冬 00:00→8h', 94 * 1440], ['冬 08:10→13h', 94 * 1440 + 490], ['秋末 第 90 日 20:00→第 91 日（冬）08:00', 89 * 1440 + 1200], ['冬末 第 120 日 20:00→第 121 日（春）08:00', 119 * 1440 + 1200]];
const foodRows = []; let foodFail = 0, argFail = 0, dblFail = 0, floorFail = 0, foodCases = 0;
function foodCase(name, t, food0, src) {
  ['rest', 'bunk'].forEach((k) => {
    const r = runSvc(null, k, t, { hp: 80, food: food0, fat: 10 }); const cap = captureSleep(t, { hpFloor: 1 });
    const h = r.h, mult = T.seasonOf(r.wake) === 3 ? 1.25 : 1, exact = 1.25 * h * mult;
    const expRounded = Math.round(Math.min(100, Math.max(0, food0 - exact)));
    const argOk = Math.abs(cap.o.food - 1.25 * h) < 1e-12 && cap.o.hpFloor === 1 && cap.o.noRegen === true && cap.o.fat === 0 && Math.abs(G._debug.sleepFoodCost(h) - 1.25 * h) < 1e-12;
    const ok = r.food === expRounded; const dbl = r.food === Math.round(Math.max(0, food0 - (exact + 10 * mult))) && Math.abs(exact - 0) > 0 && !ok;
    foodCases++; if (!ok) foodFail++; if (!argOk) argFail++; if (dbl) dblFail++; if (r.food < 0) floorFail++;
    foodRows.push([src, name, k, T.fmtT(t), T.fmtT(r.wake), h, mult, food0, cap.o.food, exact, food0 - r.food, food0 - expRounded, r.food, ok ? 1 : 0, argOk ? 1 : 0, r.dead ? 1 : 0, r.paid]);
  });
}
FOOD_NAMED.forEach(([n, t]) => foodCase(n, t, 80, 'named'));
FOOD_NAMED.slice(0, 6).forEach(([n, t]) => foodCase(n + '（飽食 5，下限 0）', t, 5, 'floor0'));
[4, 94].forEach((d) => { for (let m = 0; m < 1440; m += 30) foodCase('格點 第 ' + (d + 1) + ' 日 ' + clock(m), d * 1440 + m, 80, 'grid30_day' + (d + 1)); });
csv('food-cases.csv', ['source', 'case', 'kind', 'bed', 'wake', 'sleep_h', 'winter_mult', 'food_before', 'impl_arg_food_to_passTime', 'spec_exact_deduct', 'measured_deduct', 'expected_deduct_after_round', 'food_after', 'match_rounded', 'arg_is_1.25h_and_hpFloor1', 'dead', 'paid'], foodRows);
P('### 5a 睡眠飽食 1.25×時數');
L.grepLines('js/game.js', /function sleepFoodCost|passTime\(hours, Object.assign|const foodMult = seasonOf|S\.food = clamp\(S\.food - |S\.food = Math\.round/).forEach(([n, l]) => P('- `js/game.js:' + n + '` ' + l.slice(0, 170)));
P('| 案例 | 種類 | 睡 h | 冬倍率 | 實作傳入 passTime 的 food | 規格扣量 1.25h×冬 | 實測扣量（取整後） | 期望扣量（同取整） | 結果 |'); P('|---|---|---|---|---|---|---|---|---|');
foodRows.filter((r) => r[0] !== 'grid30_day5' && r[0] !== 'grid30_day95').forEach((r) => P('| ' + r[1] + ' | ' + r[2] + ' | ' + r3(r[5]) + ' | ' + r[6] + ' | ' + r3(r[8]) + ' | ' + r3(r[9]) + ' | ' + r[10] + ' | ' + r[11] + ' | ' + (r[13] && r[14] ? '符合' : '不符') + ' |'));
P('飽食案例 ' + foodCases + '（具名 ' + FOOD_NAMED.length * 2 + '、下限 12、每 30 分格點 第 5 日＋第 95 日 × rest／bunk 192）：實測與期望不符 ' + foodFail + '；傳入值不是 1.25h 或缺 hpFloor 1 ' + argFail + '；看得出重複扣（1.25h＋舊固定 10） ' + dblFail + '；飽食 <0 ' + floorFail);

// ---- 5b hp 最低 1（rest／bunk） ----
P('### 5b rest／bunk hp 最低 1');
L.grepLines('js/game.js', /if \(opts\.hpFloor !== undefined|S\.food <= 0\) \{ S\.hp -= 3|S\.fat >= 100\) \{ S\.hp -= 2|case 'rest': \{?|sleepToMorning\(\{ hpFloor: 1 \}\)|function checkDeath/).forEach(([n, l]) => P('- `js/game.js:' + n + '` ' + l.slice(0, 200)));
const HP_STATES = [['飽食 0、hp 10', 0, 10, 10, 0], ['飽食 0、hp 1', 0, 1, 10, 0], ['飽食 0、hp 100', 0, 100, 10, 0], ['飽食 5、hp 10（睡眠中途歸零）', 5, 10, 10, 0], ['飽食 5、hp 1', 5, 1, 10, 0], ['飽食 80、hp 10', 80, 10, 10, 0], ['飽食 80、hp 80', 80, 80, 10, 0], ['飽食 0、hp 10、疲累 100（斷糧＋力竭）', 0, 10, 100, 0], ['飽食 0、hp 10、侵蝕 20', 0, 10, 10, 20], ['飽食 80、hp 30、侵蝕 20', 80, 30, 10, 20]];
const HP_BEDS = [['08:10→13h', 490], ['20:00→12h', 1200], ['00:00→8h', 0], ['03:00→6h', 180]];
const hpRows = []; let hpDead = 0, hpLow = 0, hpOver = 0, hpModel = 0, hpOldDiff = 0, hpN = 0, oldDead = 0;
['rest', 'bunk'].forEach((k) => [[4, '春 第 5 日'], [94, '冬 第 95 日']].forEach(([d, dn]) => HP_BEDS.forEach(([bn, bm]) => HP_STATES.forEach(([sn, f0, h0, fa0, c0]) => {
  const t = d * 1440 + bm; const st = { food: f0, hp: h0, fat: fa0, corrupt: c0 };
  const r = runSvc(null, k, t, st); const o = OLD ? runSvc(OLD, k, t, st) : null;
  // 獨立模型（照 passTime 單一切片現況 + Q7 下限 + 醒後回復）
  const h = r.h, mult = T.seasonOf(r.wake) === 3 ? 1.25 : 1; const fr = Math.max(0, f0 - 1.25 * h * mult);
  const dmg = (fr <= 0 ? 3 * h : 0) + (fa0 >= 100 ? 2 * h : 0); const hS = Math.round(Math.max(1, h0 - dmg));
  const c1 = k === 'rest' && c0 ? Math.max(0, c0 - 10) : c0; const mh1 = r.maxHp1;
  const model = k === 'rest' ? mh1 : Math.min(mh1, hS + 30); const bound = k === 'rest' ? mh1 : Math.min(mh1, h0 + 30);
  hpN++; if (r.dead) hpDead++; if (r.hp < 1) hpLow++; if (r.hp > bound) hpOver++; if (r.hp !== model || r.corrupt !== c1) hpModel++;
  let oldNote = ''; if (o) { if (o.dead) { oldDead++; oldNote = 'd0989ba 死亡（' + o.cause + '）'; } else if (o.hp !== r.hp || o.fat !== r.fat || o.corrupt !== r.corrupt) { hpOldDiff++; oldNote = 'd0989ba hp ' + o.hp + ' fat ' + o.fat + ' corrupt ' + o.corrupt + '（與 HEAD 不同）'; } else oldNote = 'd0989ba 同 hp／fat／corrupt'; }
  hpRows.push([k, dn, bn, sn, T.fmtT(t), T.fmtT(r.wake), h, h0, f0, fa0, c0, r.hp, r.food, r.fat, r.corrupt, r.dead ? 1 : 0, r.cause, r.paid, dmg, hS, model, bound, r.hp === model ? 1 : 0, o ? o.hp : '', o ? o.food : '', o ? (o.dead ? 1 : 0) : '', oldNote]);
}))));
csv('hp-floor-cases.csv', ['kind', 'season_day', 'bed', 'state', 'bed_time', 'wake_time', 'sleep_h', 'hp_before', 'food_before', 'fat_before', 'corrupt_before', 'hp_after', 'food_after', 'fat_after', 'corrupt_after', 'dead', 'cause', 'paid', 'model_survival_dmg', 'model_hp_after_sleep_floor1', 'model_hp_after_service', 'upper_bound_hp_before_plus_spec_recovery', 'match_model', 'd0989ba_hp_after', 'd0989ba_food_after', 'd0989ba_dead', 'd0989ba_note'], hpRows);
P('| 種類 | 季 | 就寢 | 狀態 | 睡前 hp／飽食 | 睡後 hp／飽食 | dead | 起床 | 花費 | d0989ba（上一輪）|'); P('|---|---|---|---|---|---|---|---|---|---|');
hpRows.filter((r) => r[2] === '08:10→13h' || (r[2] === '03:00→6h' && r[1].startsWith('春'))).forEach((r) => P('| ' + r[0] + ' | ' + r[1] + ' | ' + r[2] + ' | ' + r[3] + ' | ' + r[7] + '／' + r[8] + ' | ' + r[11] + '／' + r[12] + ' | ' + (r[15] ? '是' : '否') + ' | ' + r[5] + ' | ' + r[17] + ' | ' + r[26] + ' |'));
P('hp 案例 ' + hpN + '（rest／bunk × 春／冬 × 4 個就寢 × ' + HP_STATES.length + ' 種狀態）：dead ' + hpDead + '；睡後 hp<1 ' + hpLow + '；睡後 hp 高於「睡前 hp＋規格回復量」 ' + hpOver + '；與獨立模型（hp、侵蝕）不符 ' + hpModel + '；d0989ba 在同案例死亡 ' + oldDead + '；d0989ba 沒死但 hp／疲累／侵蝕與 HEAD 不同 ' + hpOldDiff);
P('寒冷狀態：實作沒有寒意欄位（js/game.js 無 S.cold／寒意累積），無法設定，未測。');

// ---- 5c 露宿與其他路徑沒有保護 ----
P('### 5c 露宿、茶攤小憩、一般等待：不保護');
L.grepLines('js/game.js', /function camp\(\)|const night = isNight\(S\.t\)|const risk = \(night|passTime\(8, \{ food: 16|case 'nap':|passTime\(2, \{ fat: -20 \}\)/).forEach(([n, l]) => P('- `js/game.js:' + n + '` ' + l.slice(0, 200)));
function runCamp(root, t, st) { const x = mkInst(root), G2 = x.G, S = G2.state; S.dead = null; S.scene = 'wild'; S.loc = 'chishi'; S.fire = true; S.combat = null; S.world.tide = null;
  S.hp = st.hp; S.food = st.food; S.fat = st.fat; S.corrupt = 0; S.t = t; S.log = []; G2.camp();
  return { wake: S.t, hp: S.hp, food: S.food, fat: S.fat, dead: !!S.dead, cause: S.dead ? S.dead.cause : '', combat: !!S.combat }; }
const campRows = []; let campProt = 0, campFoodBad = 0, campDeadExp = 0, campDeadGot = 0, campN = 0;
[[4, '春 第 5 日'], [94, '冬 第 95 日']].forEach(([d, dn]) => [['20:00', 1200], ['12:00', 720]].forEach(([bn, bm]) => [['飽食 0、hp 10', 0, 10], ['飽食 0、hp 100', 0, 100], ['飽食 0、hp 1', 0, 1], ['飽食 5、hp 10', 5, 10], ['飽食 80、hp 80（一般）', 80, 80], ['飽食 80、hp 10（一般）', 80, 10]].forEach(([sn, f0, h0]) => {
  const t = d * 1440 + bm; const r = runCamp(null, t, { food: f0, hp: h0, fat: 50 }); const o = OLD ? runCamp(OLD, t, { food: f0, hp: h0, fat: 50 }) : null;
  const mult = T.seasonOf(t + 480) === 3 ? 1.25 : 1; const fr = Math.max(0, f0 - 16 * mult); const expFoodC = Math.round(fr);
  const hRaw = h0 - (fr <= 0 ? 24 : 0); const hReg = fr >= 30 ? Math.min(80, hRaw + 8) : hRaw; const expDead = hReg <= 0;
  campN++; if (r.food !== expFoodC) campFoodBad++; if (expDead) campDeadExp++; if (r.dead) campDeadGot++; if (expDead && !r.dead) campProt++;
  campRows.push(['camp', dn, bn, sn, T.fmtT(t), T.fmtT(r.wake), (r.wake - t) / 60, h0, f0, r.hp, r.food, f0 - r.food, f0 - expFoodC, 16 * mult, r.dead ? 1 : 0, r.cause, expDead ? 1 : 0, r.combat ? 1 : 0, o ? o.hp : '', o ? o.food : '', o ? (o.dead ? 1 : 0) : '']);
})));
// 茶攤小憩、一般等待（_debug.passTime）
function runNap(root, st) { const x = mkInst(root), G2 = x.G, S = G2.state; setTown(G2, 'nap'); S.silver = 100; S.hp = st.hp; S.food = st.food; S.fat = 50; S.corrupt = 0; S.t = 4 * 1440 + 600; S.log = []; G2.service('nap'); return { wake: S.t, hp: S.hp, food: S.food, dead: !!S.dead, cause: S.dead ? S.dead.cause : '', paid: 100 - S.silver }; }
function runWait(root, st) { const x = mkInst(root), G2 = x.G, S = G2.state; setTown(G2, 'rest'); S.hp = st.hp; S.food = st.food; S.fat = 50; S.t = 4 * 1440 + 600; S.log = []; G2._debug.passTime(8, {}); return { wake: S.t, hp: S.hp, food: S.food, dead: !!S.dead, cause: S.dead ? S.dead.cause : '' }; }
[['飽食 0、hp 5', 0, 5, true], ['飽食 0、hp 10', 0, 10, false], ['飽食 80、hp 50', 80, 50, false]].forEach(([sn, f0, h0, ed]) => { const r = runNap(null, { food: f0, hp: h0 }); campN++; if (ed) campDeadExp++; if (r.dead) campDeadGot++; if (ed && !r.dead) campProt++;
  campRows.push(['nap', '春 第 5 日', '10:00', sn, T.fmtT(4 * 1440 + 600), T.fmtT(r.wake), (r.wake - (4 * 1440 + 600)) / 60, h0, f0, r.hp, r.food, f0 - r.food, '', 8, r.dead ? 1 : 0, r.cause, ed ? 1 : 0, '', '', '', '']); });
[['飽食 0、hp 10', 0, 10, true], ['飽食 0、hp 100', 0, 100, false]].forEach(([sn, f0, h0, ed]) => { const r = runWait(null, { food: f0, hp: h0 }); campN++; if (ed) campDeadExp++; if (r.dead) campDeadGot++; if (ed && !r.dead) campProt++;
  campRows.push(['passTime(8,{})', '春 第 5 日', '10:00', sn, T.fmtT(4 * 1440 + 600), T.fmtT(r.wake), 8, h0, f0, r.hp, r.food, f0 - r.food, '', 32, r.dead ? 1 : 0, r.cause, ed ? 1 : 0, '', '', '', '']); });
csv('camp-nap-cases.csv', ['path', 'season_day', 'bed', 'state', 'bed_time', 'wake_time', 'sleep_h', 'hp_before', 'food_before', 'hp_after', 'food_after', 'measured_food_deduct', 'expected_food_deduct_rounded', 'spec_food_deduct', 'dead', 'cause', 'model_expect_dead_no_protection', 'night_watch_combat', 'd0989ba_hp_after', 'd0989ba_food_after', 'd0989ba_dead'], campRows);
P('| 路徑 | 季 | 就寢 | 狀態 | 睡前 hp／飽食 | 睡後 hp／飽食 | 飽食扣量 | dead | 無保護時應死 | d0989ba hp／dead |'); P('|---|---|---|---|---|---|---|---|---|---|');
campRows.forEach((r) => P('| ' + r[0] + ' | ' + r[1] + ' | ' + r[2] + ' | ' + r[3] + ' | ' + r[7] + '／' + r[8] + ' | ' + r[9] + '／' + r[10] + ' | ' + r[11] + ' | ' + (r[14] ? '是' : '否') + ' | ' + (r[16] ? '是' : '否') + ' | ' + (r[18] === '' ? '—' : r[18] + '／' + (r[20] ? '死' : '活')) + ' |'));
P('露宿／小憩／等待 案例 ' + campN + '：模型應死 ' + campDeadExp + '、實作死亡 ' + campDeadGot + '、應死卻被保護 ' + campProt + '；露宿飽食與 16×冬倍率（取整）不符 ' + campFoodBad);
// 露宿遇險率：蒙地卡羅（chishi 風險「中」、無獸潮、營 0 級、無 xi 技能），每格 20000 次，每次換 S.rng
P('#### 露宿遇險率（實作，蒙地卡羅）');
const riskRows = [];
[[OLD, 'd0989ba'], [null, 'HEAD']].forEach(([root, nm]) => { if (root === undefined) return; if (nm === 'd0989ba' && !OLD) return;
  // 每 200 次換一個全新 vm 實例（避免世界狀態跨試次累積使存檔序列化越來越慢；每次試驗都重設地點、時刻、營造等級與 S.rng）
  let x = null, G2 = null, S = null, prof0 = null, skills0 = null;
  const fresh = () => { x = mkInst(root); G2 = x.G; S = G2.state; prof0 = JSON.stringify(S.prof); skills0 = S.skills.slice(); };
  [['20:00 睡 8h', 4 * 1440 + 1200, 0.25], ['12:00 睡 8h（至 20:00）', 4 * 1440 + 720, 0.12], ['09:00 睡 8h（至 17:00）', 4 * 1440 + 540, null], ['17:00 睡 8h（至 01:00）', 4 * 1440 + 1020, 0.2256]].forEach(([n, t, spec]) => {
    let hit = 0; const N = 20000;
    for (let i = 0; i < N; i++) { if (i % 200 === 0) fresh(); S.dead = null; S.scene = 'wild'; S.loc = 'chishi'; S.fire = true; S.combat = null; S.event = null; S.world.tide = null; S.prof = JSON.parse(prof0); S.skills = skills0.slice(); S.hp = 80; S.food = 80; S.fat = 50; S.t = t; S.log = []; S.rng = (Math.imul(i + 1, 2654435761) ^ 0x5bd1e995) >>> 0; G2.camp(); if (S.combat) hit++; }
    const p = hit / N, se = Math.sqrt(p * (1 - p) / N);
    riskRows.push([nm, n, clock(t), N, hit, p, se, spec === null ? '' : spec]);
  }); });
csv('camp-risk-mc.csv', ['impl', 'case', 'bed', 'trials', 'night_watch', 'rate', 'stderr', 'spec_E10'], riskRows);
P('| 實作 | 案例 | 次數 | 遇險 | 比率 ± 標準誤 | 規格 E10 |'); P('|---|---|---|---|---|---|');
riskRows.forEach((r) => P('| ' + r[0] + ' | ' + r[1] + ' | ' + r[3] + ' | ' + r[4] + ' | ' + r[5].toFixed(4) + ' ± ' + r[6].toFixed(4) + ' | ' + (r[7] === '' ? '—' : r[7]) + ' |'));

// ================= 結論總表（自動） =================
P('## 結論（自動判定）');
const allOk = (a) => a.every((x) => x[1]);
P('- 睡眠時長 6–13h：min ' + r3(mn) + '、max ' + r3(mx) + '、超出 ' + outside + ' → ' + (outside === 0 ? '過' : '不過'));
P('- 期限／過期類 新對 v0.3 違反 0：' + verdict.deadline.map((x) => x[0] + (x[1] ? ' 過' : ' 不過')).join('、'));
P('- 延誤類 全樣本平均（有完成件數）新 ≤ 舊：' + verdict.delay.map((x) => x[0] + (x[1] ? ' 過' : ' 不過')).join('、') + '；配對獸潮全樣本平均：' + verdict.tide.map((x) => x[0] + (x[1] ? ' 過' : ' 不過')).join('、'));
P('- 0 完成情境數 新 ≤ 舊：' + verdict.zero.map((x) => x[0] + (x[1] ? ' 過' : ' 不過')).join('、'));
P('- 飽食 1.25×：' + (foodFail === 0 && argFail === 0 && dblFail === 0 && floorFail === 0 ? '過' : '不過') + '；hp 下限 1：' + (hpDead === 0 && hpLow === 0 && hpOver === 0 && hpModel === 0 ? '過' : '不過') + '；露宿等不保護：' + (campProt === 0 && campFoodBad === 0 ? '過' : '不過'));
P('- 掃描路徑：三方不一致 ' + mism + '、完整路徑起床不一致 ' + fpMism + '、死亡 ' + fpDead + '、newDay 不符 ' + fpDayBad + '、飽食不符 ' + foodBad + '；wrnd 逐位不同 ' + wDiff);
fs.writeFileSync(path.join(OUT, 'run-stdout.txt'), out.join('\n') + '\n');
