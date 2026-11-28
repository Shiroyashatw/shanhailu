'use strict';
/* T7 重跑（num-shl-t7-3fc260f）。一行重現：node sim/t7-3fc260f/run.js
 * 複製自 sim/t7/run.js（numbers/num-shl-t7-dev02@bedd6855），樣本組、種子、情境不變；改動：
 *   - 輸出改寫到 evidence/csv-t7-3fc260f/；
 *   - 延誤類判準改 Q-T7b 甲（全樣本平均，只算有完成件數；另比 0 完成情境數），逐情境延誤違反只當資訊；
 *   - 新增：睡眠飽食 1.25×、hp 下限 1、露宿／茶攤小憩無保護、對上一輪 d0989ba 的行為回歸、AC 20／route()、「中高」字串掃描。
 * 只讀 js/，不改；所有輸出寫在 evidence/csv-t7-3fc260f/ 與 stdout。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');
const L = require('./load');
const { simulate } = require('./core');
const T = require('../lib/time');
const U = require('../lib/util');

const TARGET = '3fc260f8a38a84b791b5260bad8f19f18ec8d321';
const PREV = 'd0989ba447ff9c9ab9337841db398b9d82173a9a'; // 上一輪（num-shl-t7-dev02）驗的 commit
const OUT = path.join(L.ROOT, 'evidence', 'csv-t7-3fc260f');
fs.mkdirSync(OUT, { recursive: true });
const r3 = U.r3;
const fx = (v) => (typeof v === 'number' ? (Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : r3(v)) : String(v)) : String(v));
function csv(name, header, rows) {
  const esc = (v) => { const s = fx(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(OUT, name), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
const clock = T.fmtClock;
const dayOf = T.dayOf;
const out = []; const P = (s) => { out.push(s); console.log(s); };
const tbl = (head, rows) => { P('| ' + head.join(' | ') + ' |'); P('|' + head.map(() => '---').join('|') + '|'); rows.forEach((r) => P('| ' + r.map(fx).join(' | ') + ' |')); };
const git = (c) => execSync('git ' + c, { cwd: L.ROOT, maxBuffer: 64 << 20 }).toString().trim();
const VERDICT = {};

// ================= 0. 被驗 commit 與 diff 摘要 =================
const jsSha = (() => { try { return git('rev-parse HEAD'); } catch (e) { return 'unknown'; } })();
const jsClean = (() => { try { return git('diff --quiet ' + TARGET + ' -- js index.html tests docs') === '' ? '相同' : '不同'; } catch (e) { return '不同'; } })();
P('# T7 重跑（num-shl-t7-3fc260f）');
P('被驗 commit ' + TARGET + '；工作樹 HEAD ' + jsSha + '；工作樹 js/ index.html tests/ docs/ 對被驗 commit：' + jsClean);
P('## 0. diff 摘要');
P('### git diff 4bb6f26 ' + TARGET.slice(0, 7) + ' --stat -- js');
P('```'); P(git('diff --stat 4bb6f26 ' + TARGET + ' -- js')); P('```');
P('### git diff d0989ba ' + TARGET.slice(0, 7) + ' --stat -- js data tests（repo 沒有 data/ 目錄）');
P('```'); P(git('diff --stat ' + PREV + ' ' + TARGET + ' -- js data tests')); P('```');
const hunks = git('diff -U0 ' + PREV + ' ' + TARGET + ' -- js/game.js js/data.js').split('\n').filter((l) => /^@@/.test(l)).map((l) => l.replace(/^@@ [^@]+@@ ?/, '').slice(0, 100));
P('d0989ba→' + TARGET.slice(0, 7) + ' js/game.js、js/data.js 的 hunk 所在函式（git 的 hunk 標頭）：' + hunks.join('｜'));
const hunks2 = git('diff -U0 4bb6f26 ' + TARGET + ' -- js').split('\n').filter((l) => /^@@/.test(l)).map((l) => l.replace(/^@@ [^@]+@@ ?/, '').slice(0, 100));
P('4bb6f26→' + TARGET.slice(0, 7) + ' js/ 的 hunk 所在函式：' + hunks2.join('｜'));
// 睡眠相關函式原文逐字比對：d0989ba、4bb6f26、3fc260f
const FNS = ['wakeTime', 'sleepToMorning', 'passTime', 'newDay', 'camp', 'service', 'checkDeath', 'maxHp', 'wrnd', 'route', 'travelPreview'];
const fnRows = FNS.map((f) => {
  const get = (rev) => { try { return L.extractFn(f, rev); } catch (e) { return null; } };
  const a = get(PREV), b = get('4bb6f26'), c = get(TARGET);
  return [f, a === c ? '同' : '異', b === c ? '同' : '異', c ? c.split('\n').length : 'n/a'];
});
P('函式原文逐字比對（被驗 commit 對 d0989ba／對 4bb6f26）：');
tbl(['函式', '對 d0989ba', '對 4bb6f26', '行數'], fnRows);
csv('diff-functions.csv', ['function', 'vs_d0989ba', 'vs_4bb6f26', 'lines'], fnRows);

// ---------------- 規則 ----------------
const inst = L.load(); const G = inst.G, D = inst.D;
const impl = (t) => G.wakeTime(t);
const verb = L.verbatimWake(D).fn;
const simV05 = (t) => { let n8 = Math.floor(t / 1440) * 1440 + 480; if (n8 < t) n8 += 1440; return Math.min(Math.max(t + 360, n8), t + 780); };
const v03 = T.wakeNew; const mainBug = T.wakeOld;
const implMax = {};
[11, 12, 13, 14].forEach((h) => { const x = L.load(); x.D.SLEEP.maxH = h; implMax[h] = (t) => x.G.wakeTime(t); });

// 完整路徑：G.service('rest'|'bunk') → sleepToMorning → passTime → 逐日 newDay
function setTown(G2, kind) {
  const S = G2.state; S.dead = null; S.scene = 'town'; S.combat = null; S.event = null; S.trade = null;
  if (kind === 'rest') { S.loc = 'huiyao'; S.townTab = 'hy_inn'; } else if (kind === 'bunk') { S.loc = 'poxiao'; S.townTab = 'px_medic'; } else if (kind === 'nap') { S.loc = 'yizhan'; S.townTab = 'yz_tea'; }
}
const FP = L.load(); FP.G.restart(20261128, 'drifter');
function fullPath(kind, t, opt, inst2) {
  const G2 = (inst2 || FP).G, S = G2.state; opt = opt || {};
  setTown(G2, kind);
  S.silver = 1e6; S.corrupt = opt.corrupt || 0; if (opt.ti !== undefined) S.attr.ti = opt.ti;
  S.hp = opt.hp !== undefined ? opt.hp : G2.maxHp(); S.food = opt.food !== undefined ? opt.food : 80; S.fat = opt.fat !== undefined ? opt.fat : 10;
  S.t = t; S.log = []; const silver0 = S.silver; const pre = { hp: S.hp, food: S.food, fat: S.fat, corrupt: S.corrupt, maxHp: G2.maxHp() };
  G2.service(kind);
  const logs = S.log.slice();
  const days = logs.filter((x) => /新的一天/.test(x.text));
  return { pre, wake: S.t, paid: silver0 - S.silver, food: S.food, fat: S.fat, hp: S.hp, corrupt: S.corrupt, maxHp: G2.maxHp(), dead: !!S.dead, cause: S.dead ? S.dead.cause : '', newDays: days.length, midnightOk: days.every((x) => x.t % 1440 === 0), logs };
}

// ================= 1. 條件 1 全時段掃描（上一輪條件 1 回歸） =================
const SWEEP_DAYS = [1, 5, 30, 31, 90, 120, 121, 240];
const pts = [];
SWEEP_DAYS.forEach((d) => { for (let m = 0; m < 1440; m += 30) pts.push({ src: 'grid30', t: (d - 1) * 1440 + m }); [479, 481, 490, 1439].forEach((m) => pts.push({ src: 'edge', t: (d - 1) * 1440 + m })); });
const rng = U.mulberry32(20261128);
for (let i = 0; i < 10000; i++) pts.push({ src: 'random', t: Math.floor(rng() * 240 * 1440) });
const sweepRows = []; let mn = Infinity, mx = -Infinity, outside = 0, mism = 0, fpMism = 0, fpDead = 0, fpDayBad = 0, fpN = 0, fpFoodBad = 0;
pts.forEach((p) => {
  const w = impl(p.t), h = (w - p.t) / 60;
  const wv = verb(p.t), ws = simV05(p.t);
  const fr = fullPath('rest', p.t); fpN++;
  const fb = p.src === 'random' ? null : fullPath('bunk', p.t);
  if (!(w === wv && w === ws)) mism++;
  if (fr.wake !== w || (fb && fb.wake !== w)) fpMism++;
  if (fr.dead || (fb && fb.dead)) fpDead++;
  const expDays = dayOf(w) - dayOf(p.t);
  if (fr.newDays !== expDays || !fr.midnightOk || (fb && (fb.newDays !== expDays || !fb.midnightOk))) fpDayBad++;
  // 飽食：起始 80（整數），規格扣 1.25×h×(冬 1.25，passTime 以起床時刻判冬)，實作最後 Math.round
  const wm = T.seasonOf(w) === 3 ? 1.25 : 1; const expFood = Math.round(80 - 1.25 * h * wm);
  if (fr.food !== expFood || (fb && fb.food !== expFood)) fpFoodBad++;
  mn = Math.min(mn, h); mx = Math.max(mx, h); if (h < 6 || h > 13) outside++;
  sweepRows.push([p.src, dayOf(p.t), p.t, clock(p.t), w, dayOf(w), clock(w), h, wv === w ? 1 : 0, ws === w ? 1 : 0, fr.wake === w ? 1 : 0, fb ? (fb.wake === w ? 1 : 0) : '', fr.newDays, fb ? fb.newDays : '', expDays, 80 - fr.food, fb ? 80 - fb.food : '', 1.25 * h * wm, (v03(p.t) - p.t) / 60, (mainBug(p.t) - p.t) / 60]);
});
csv('sweep.csv', ['source', 'bed_day', 'bed_abs_min', 'bed_clock', 'wake_abs_min', 'wake_day', 'wake_clock', 'sleep_h_impl', 'verbatim_eq', 'simrewrite_eq', 'fullpath_rest_eq', 'fullpath_bunk_eq', 'rest_newDay_calls', 'bunk_newDay_calls', 'expected_day_crossings', 'rest_food_drop_int', 'bunk_food_drop_int', 'spec_food_1_25xh', 'sleep_h_v03', 'sleep_h_main'], sweepRows);
P('## 1. 條件 1 全時段掃描（回歸）');
P('就寢時刻 ' + pts.length + '（grid30 ' + pts.filter((p) => p.src === 'grid30').length + '、edge ' + pts.filter((p) => p.src === 'edge').length + '、random ' + pts.filter((p) => p.src === 'random').length + '；就寢日 ' + SWEEP_DAYS.join('／') + ' + 隨機 1–240 日，seed 20261128）');
P('睡眠時長 min ' + r3(mn) + ' h、max ' + r3(mx) + ' h、超出 [6,13] 個數 ' + outside);
P('實作 vs 逐字複製 vs sim 重寫 不一致：' + mism + '；完整路徑（rest ' + fpN + ' 點、bunk 非隨機 ' + pts.filter((p) => p.src !== 'random').length + ' 點）起床與 wakeTime 不一致：' + fpMism + '；死亡：' + fpDead + '；newDay 次數或 00:00 時刻不符：' + fpDayBad + '；飽食（起始 80）與 round(80−1.25×h×冬) 不符：' + fpFoodBad);
VERDICT.duration = outside === 0 && mism === 0 && fpMism === 0;
VERDICT.path = fpDead === 0 && fpDayBad === 0;
const bucket = {}; sweepRows.forEach((r) => { const b = Math.floor((r[2] % 1440) / 60); (bucket[b] = bucket[b] || []).push(r[7]); });
csv('sweep-by-hour.csv', ['bed_hour', 'n', 'min_h', 'max_h', 'mean_h'], Object.keys(bucket).map((b) => [String(b).padStart(2, '0') + ':00–' + String(b).padStart(2, '0') + ':59', bucket[b].length, Math.min(...bucket[b]), Math.max(...bucket[b]), U.mean(bucket[b])]));
const SPEC_PTS = [['20:00（第 5 日）', 4 * 1440 + 1200, 5 * 1440 + 480, 12], ['03:00', 4 * 1440 + 180, 4 * 1440 + 540, 6], ['07:00', 4 * 1440 + 420, 4 * 1440 + 780, 6], ['08:10', 4 * 1440 + 490, 4 * 1440 + 1270, 13], ['00:00', 4 * 1440, 4 * 1440 + 480, 8]];
const specRows = SPEC_PTS.map(([n, t, ew, eh]) => { const w = impl(t), fr = fullPath('rest', t), fb = fullPath('bunk', t); return [n, T.fmtT(t), T.fmtT(ew), eh, T.fmtT(w), (w - t) / 60, T.fmtT(fr.wake), T.fmtT(fb.wake), w === ew && fr.wake === ew && fb.wake === ew ? '過' : '不過']; });
csv('spec-points.csv', ['point', 'bed', 'spec_wake', 'spec_h', 'impl_wake', 'impl_h', 'fullpath_rest_wake', 'fullpath_bunk_wake', 'verdict'], specRows);
tbl(['規格點', '就寢', '規格起床', '規格時數', '實作起床', '實作時數', 'rest 完整路徑', 'bunk 完整路徑', '結論'], specRows);
VERDICT.specPts = specRows.every((r) => r[8] === '過');

// ================= 2. 條件 3 邊界（含當下） =================
P('## 2. 條件 3：08:00 含當下與 07:59／08:01 邊界（回歸）');
const SPEC_A = { '07:59': [4 * 1440 + 479, 4 * 1440 + 839], '08:00': [4 * 1440 + 480, 4 * 1440 + 840], '08:01': [4 * 1440 + 481, 4 * 1440 + 1261] };
const aCases = [['07:59', 4 * 1440 + 479], ['08:00', 4 * 1440 + 480], ['08:01', 4 * 1440 + 481], ['第 1 日 08:00（開局）', 480], ['跨日 00:00（第 5 日）', 4 * 1440], ['23:59（第 4 日）', 3 * 1440 + 1439], ['02:00', 4 * 1440 + 120], ['02:01', 4 * 1440 + 121], ['19:00', 4 * 1440 + 1140], ['19:01', 4 * 1440 + 1141]];
const aRows = aCases.map(([n, t]) => { const w = impl(t), fr = fullPath('rest', t), fb = fullPath('bunk', t); const s = SPEC_A[n]; const ok = s ? (w === s[1] && fr.wake === s[1] && fb.wake === s[1] ? '過' : '不過') : '（無規格點）'; return [n, T.fmtT(t), s ? T.fmtT(s[1]) : '', T.fmtT(w), (w - t) / 60, T.fmtT(fr.wake), T.fmtT(fb.wake), ok]; });
csv('assumption-a.csv', ['case', 'bed', 'spec_wake_v05', 'impl_wake', 'impl_h', 'fullpath_rest_wake', 'fullpath_bunk_wake', 'verdict'], aRows);
tbl(['情況', '就寢', '規格 v0.5 起床', '實作起床', '時數', 'rest 完整路徑', 'bunk 完整路徑', '結論'], aRows);
VERDICT.cond3 = aRows.filter((r) => r[7] !== '（無規格點）').every((r) => r[7] === '過');

// ================= 3. 期限／過期類、延誤類（Q-T7b 甲） =================
P('## 3. 期限／過期類與延誤類（Q-T7b 甲）');
const SEEDS = 200;
const RULES = { v05: impl, v03, main: mainBug };
function runSet(scen, rules, ref) { const res = {}; Object.keys(rules).forEach((k) => { res[k] = scen.map((s) => ({ A: simulate(s.seed, rules[k], ref, false, s.mode, s.arg), B: simulate(s.seed, rules[k], ref, true, s.mode, s.arg) })); }); return res; }
const stat = (v) => { const w = v.filter((y) => Number.isFinite(y)); return { mean: U.mean(w), max: w.length ? Math.max(...w) : NaN, min: w.length ? Math.min(...w) : NaN, n: w.length }; };
function aggSet(rs) {
  const g = (f) => stat(rs.map(f));
  const sum = (f) => rs.reduce((a, x) => a + f(x), 0);
  return {
    A_overslept: g((x) => x.A.overslept), A_expAsleep: g((x) => x.A.expAsleep), A_expired: g((x) => x.A.expired),
    B_expired: g((x) => x.B.expired), B_overslept: g((x) => x.B.overslept), B_expAsleep: g((x) => x.B.expAsleep),
    B_done: g((x) => x.B.done), B_missedHear: g((x) => x.B.missedHear), B_sleepH: g((x) => x.B.sleepH), B_maxSleep: g((x) => x.B.maxSleep), B_minSleep: g((x) => x.B.minSleep),
    // 延誤（只算有完成的件數）
    delayPooled: sum((x) => x.B.delaySum) / sum((x) => x.B.delayN), delayItems: sum((x) => x.B.delayN),
    delayScenMean: g((x) => (x.B.delayN ? x.B.delaySum / x.B.delayN : NaN)),
    zeroDone: rs.filter((x) => x.B.done === 0).length,
    tideDonePooled: sum((x) => x.B.tideDoneSum) / sum((x) => x.B.tideDoneN), tideDoneItems: sum((x) => x.B.tideDoneN), tideItems: sum((x) => x.B.tideN),
    tideCapped: g((x) => (x.B.tideN ? x.B.tideFinish / x.B.tideN : NaN)),
    delayScenMax: g((x) => (x.B.delayN ? x.B.delaySum / x.B.delayN : NaN)).max,
  };
}
function viol(nw, od) {
  const dly = (x) => (x.B.delayN ? x.B.delaySum / x.B.delayN : NaN);
  const c = { dl: 0, A_overslept: 0, B_expired: 0, B_overslept: 0, dly: 0, dlyBothDone: 0, tdly: 0, expAsleep: 0, done: 0, zeroNewOnly: 0, zeroOldOnly: 0 };
  nw.forEach((n, i) => { const o = od[i];
    const a = n.A.overslept > o.A.overslept, b = n.B.expired > o.B.expired, bo = n.B.overslept > o.B.overslept;
    if (a) c.A_overslept++; if (b) c.B_expired++; if (bo) c.B_overslept++; if (a || b || bo) c.dl++;
    const dn = dly(n), dd = dly(o);
    // 資訊：逐情境延誤（上一輪記法：0 完成記 +∞）
    const inf = (x) => (Number.isFinite(x) ? x : Infinity);
    if (inf(dn) > inf(dd) + 1e-9) c.dly++;
    if (Number.isFinite(dn) && Number.isFinite(dd) && dn > dd + 1e-9) c.dlyBothDone++;
    if (n.B.tideFinish > o.B.tideFinish + 1e-9) c.tdly++;
    if (n.A.expAsleep > o.A.expAsleep || n.B.expAsleep > o.B.expAsleep) c.expAsleep++;
    if (n.B.done < o.B.done) c.done++;
    if (n.B.done === 0 && o.B.done > 0) c.zeroNewOnly++; if (o.B.done === 0 && n.B.done > 0) c.zeroOldOnly++; });
  return c;
}
const SETS = {
  orig: { label: '原情境（就寢 22:00±3h，seed 0–199）', scen: [...Array(SEEDS).keys()].map((s) => ({ seed: s, mode: 'orig' })) },
  allday_grid: { label: '全天格點（每天固定同一就寢分鐘，0:00–23:30 每 30 分 48 格 × seed 0–49）', scen: [].concat(...[...Array(48).keys()].map((k) => [...Array(50).keys()].map((s) => ({ seed: s, mode: 'slot', arg: k * 30 })))) },
  allday_rand: { label: '全天隨機（每次就寢在 0:00–23:59 均勻抽分鐘，seed 0–199）', scen: [...Array(SEEDS).keys()].map((s) => ({ seed: s, mode: 'rand' })) },
};
const sumRows = []; const violRows = []; const gateRows = []; const RES = {};
let gateDeadline = true, gateDelay = true, gateZero = true;
Object.keys(SETS).forEach((sk) => {
  const S0 = SETS[sk]; const res = runSet(S0.scen, RULES, impl); RES[sk] = res;
  const A = {}; Object.keys(RULES).forEach((k) => (A[k] = aggSet(res[k])));
  P('### ' + S0.label + '（情境數 ' + S0.scen.length + '；「睡過頭」參考＝被驗實作）');
  const MET = [['A_overslept', 'A 不處理：期限落在睡過頭時段'], ['A_expAsleep', 'A 不處理：期限落在任何睡眠中'], ['A_expired', 'A 不處理：期限總數'], ['B_expired', 'B 有處理：過期件數'], ['B_overslept', 'B 其中因睡過頭'], ['B_expAsleep', 'B 其中睡著時過期'], ['B_done', 'B 完成件數（每情境）'], ['delayScenMean', 'B 完成件延誤：各情境平均的平均（只計有完成的情境）'], ['tideCapped', '資訊：配對獸潮延誤（未完成記到期，上一輪口徑）'], ['B_missedHear', 'B 睡著錯過傳聞'], ['B_sleepH', 'B 總睡眠時數'], ['B_maxSleep', 'B 單次最長睡眠 h'], ['B_minSleep', 'B 單次最短睡眠 h']];
  tbl(['指標（每情境 60 天）', '新 v0.5（被驗實作） 平均／最大', '舊 v0.3 平均／最大', 'main 缺陷 平均／最大'], MET.map(([m, n]) => [n, r3(A.v05[m].mean) + '／' + r3(A.v05[m].max), r3(A.v03[m].mean) + '／' + r3(A.v03[m].max), r3(A.main[m].mean) + '／' + r3(A.main[m].max)]));
  MET.forEach(([m]) => sumRows.push([sk, m, A.v05[m].mean, A.v05[m].max, A.v03[m].mean, A.v03[m].max, A.main[m].mean, A.main[m].max]));
  [['delayPooled', 'B 完成件延誤 全樣本平均 h（Σ延誤/Σ完成件）'], ['delayItems', 'B 有完成件數（全組合計）'], ['zeroDone', 'B 0 完成情境數'], ['tideDonePooled', '配對獸潮延誤 全樣本平均 h（只算完成的獸潮）'], ['tideDoneItems', '完成的獸潮件數（全組合計）'], ['tideItems', '獸潮件數（全組合計）']].forEach(([m, n]) => { sumRows.push([sk, m, A.v05[m], '', A.v03[m], '', A.main[m], '']); });
  tbl(['延誤類（全樣本、只算有完成件數）', '新 v0.5', '舊 v0.3', 'main 缺陷'], [
    ['B 完成件「出現→完成」全樣本平均 h', A.v05.delayPooled, A.v03.delayPooled, A.main.delayPooled],
    ['B 有完成件數（全組合計）', A.v05.delayItems, A.v03.delayItems, A.main.delayItems],
    ['B 完成件數平均（每情境）', A.v05.B_done.mean, A.v03.B_done.mean, A.main.B_done.mean],
    ['B 0 完成情境數', A.v05.zeroDone, A.v03.zeroDone, A.main.zeroDone],
    ['配對獸潮延誤 全樣本平均 h（只算完成）', A.v05.tideDonePooled, A.v03.tideDonePooled, A.main.tideDonePooled],
    ['完成的獸潮件數／獸潮總件數', A.v05.tideDoneItems + '／' + A.v05.tideItems, A.v03.tideDoneItems + '／' + A.v03.tideItems, A.main.tideDoneItems + '／' + A.main.tideItems]]);
  const v1 = viol(res.v05, res.v03), v2 = viol(res.v05, res.main), v3 = viol(res.v03, res.main);
  const vs = (v) => '期限類 ' + v.dl + '（A 睡過頭 ' + v.A_overslept + '、B 過期 ' + v.B_expired + '、B 因睡過頭 ' + v.B_overslept + '）；資訊：逐情境延誤 ' + v.dly + '（0 完成記 +∞，上一輪口徑）／' + v.dlyBothDone + '（兩邊都有完成才比）、配對獸潮延誤 ' + v.tdly + '、睡著時過期較多 ' + v.expAsleep + '、完成件數較少 ' + v.done + '、只有新 0 完成 ' + v.zeroNewOnly + '、只有舊 0 完成 ' + v.zeroOldOnly;
  P('違反（新比舊更差的情境數）：對 v0.3 ' + vs(v1));
  P('資訊：對 main 現況缺陷 ' + vs(v2));
  P('參考：v0.3 對 main ' + vs(v3));
  [['v05_vs_v03', v1], ['v05_vs_main', v2], ['ref_v03_vs_main', v3]].forEach(([n, v]) => violRows.push([sk, S0.scen.length, n, v.dl, v.A_overslept, v.B_expired, v.B_overslept, v.dly, v.dlyBothDone, v.tdly, v.expAsleep, v.done, v.zeroNewOnly, v.zeroOldOnly]));
  const g1 = v1.dl === 0, g2 = A.v05.delayPooled <= A.v03.delayPooled + 1e-12, g2b = A.v05.tideDonePooled <= A.v03.tideDonePooled + 1e-12, g3 = A.v05.zeroDone <= A.v03.zeroDone;
  gateDeadline = gateDeadline && g1; gateDelay = gateDelay && g2 && g2b; gateZero = gateZero && g3;
  gateRows.push([sk, S0.scen.length, v1.dl, g1 ? '過' : '不過', A.v05.delayPooled, A.v03.delayPooled, g2 ? '過' : '不過', A.v05.tideDonePooled, A.v03.tideDonePooled, g2b ? '過' : '不過', A.v05.zeroDone, A.v03.zeroDone, g3 ? '過' : '不過', A.v05.delayItems, A.v03.delayItems, A.v05.B_done.mean, A.v03.B_done.mean, v1.dly, v1.dlyBothDone, v1.tdly]);
});
csv('deadline-summary.csv', ['set', 'metric', 'v05_mean_or_value', 'v05_max', 'v03_mean_or_value', 'v03_max', 'main_mean_or_value', 'main_max'], sumRows);
csv('deadline-violations.csv', ['set', 'n_scenarios', 'compare', 'viol_deadline_any', 'viol_A_overslept', 'viol_B_expired', 'viol_B_overslept', 'info_delay_per_scen_inf', 'info_delay_per_scen_both_done', 'info_matched_tide_capped', 'info_more_expired_while_asleep', 'info_fewer_done', 'info_zero_done_new_only', 'info_zero_done_old_only'], violRows);
csv('gate-q-t7b.csv', ['set', 'n', 'deadline_viol_vs_v03', 'deadline_verdict', 'delay_pooled_new', 'delay_pooled_v03', 'delay_verdict', 'tide_done_pooled_new', 'tide_done_pooled_v03', 'tide_verdict', 'zero_done_new', 'zero_done_v03', 'zero_verdict', 'done_items_new', 'done_items_v03', 'done_mean_new', 'done_mean_v03', 'info_per_scen_delay_viol_inf', 'info_per_scen_delay_viol_both_done', 'info_tide_capped_viol'], gateRows);
P('### 門檻總表（對 v0.3）');
tbl(['組', '情境', '期限類違反', '判', 'B 延誤平均 新', '舊', '判', '獸潮延誤平均(完成) 新', '舊', '判', '0 完成 新', '舊', '判', '有完成件 新', '舊', '完成件平均 新', '舊', '資訊:逐情境延誤違反(+∞口徑)', '資訊:(兩邊有完成)', '資訊:配對獸潮(到期口徑)'], gateRows);
VERDICT.deadline = gateDeadline; VERDICT.delay = gateDelay; VERDICT.zero = gateZero;
const slotRows = [];
for (let k = 0; k < 48; k++) {
  const idx = SETS.allday_grid.scen.map((s, i) => (s.arg === k * 30 ? i : -1)).filter((i) => i >= 0);
  const pick = (rule) => aggSet(idx.map((i) => RES.allday_grid[rule][i]));
  const a = pick('v05'), b = pick('v03'), c = pick('main');
  slotRows.push([clock(k * 30), (impl(4 * 1440 + k * 30) - (4 * 1440 + k * 30)) / 60, a.B_expired.mean, b.B_expired.mean, c.B_expired.mean, a.A_expAsleep.mean, b.A_expAsleep.mean, c.A_expAsleep.mean, a.B_done.mean, b.B_done.mean, c.B_done.mean, a.delayPooled, b.delayPooled, c.delayPooled, a.zeroDone, b.zeroDone, c.zeroDone]);
}
csv('deadline-allday-by-slot.csv', ['bed_clock', 'sleep_h_v05', 'B_expired_v05', 'B_expired_v03', 'B_expired_main', 'A_expAsleep_v05', 'A_expAsleep_v03', 'A_expAsleep_main', 'B_done_v05', 'B_done_v03', 'B_done_main', 'B_delay_pooled_v05', 'B_delay_pooled_v03', 'B_delay_pooled_main', 'zero_done_v05', 'zero_done_v03', 'zero_done_main'], slotRows);

// ================= 4. 敏感度 maxH =================
P('## 4. 敏感度 maxH ∈ {11,12,13,14}（資訊；vm 實例內改 D.SLEEP.maxH；對 v0.3 比）');
const sensRows = [];
[11, 12, 13, 14].forEach((h) => {
  const f = implMax[h];
  let lo = Infinity, hi = -Infinity; for (let m = 0; m < 1440; m++) { const x = (f(4 * 1440 + m) - (4 * 1440 + m)) / 60; lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const p20 = (f(4 * 1440 + 1200) - (4 * 1440 + 1200)) / 60, p810 = (f(4 * 1440 + 490) - (4 * 1440 + 490)) / 60;
  Object.keys(SETS).forEach((sk) => {
    const res = SETS[sk].scen.map((s) => ({ A: simulate(s.seed, f, f, false, s.mode, s.arg), B: simulate(s.seed, f, f, true, s.mode, s.arg) }));
    const a = aggSet(res), o = aggSet(RES[sk].v03); const v = viol(res, RES[sk].v03);
    sensRows.push([h, sk, SETS[sk].scen.length, v.dl, a.B_expired.mean, a.B_expired.max, a.delayPooled, o.delayPooled, a.delayPooled <= o.delayPooled + 1e-12 ? '新≤舊' : '新>舊', a.tideDonePooled, o.tideDonePooled, a.zeroDone, o.zeroDone, a.B_done.mean, o.B_done.mean, v.dly, p20, p810, lo + '–' + hi]);
  });
});
csv('sensitivity-maxH.csv', ['maxH', 'set', 'n', 'deadline_viol_vs_v03', 'B_expired_mean', 'B_expired_max', 'delay_pooled', 'delay_pooled_v03', 'delay_cmp', 'tide_done_pooled', 'tide_done_pooled_v03', 'zero_done', 'zero_done_v03', 'done_mean', 'done_mean_v03', 'info_per_scen_delay_viol_inf', 'spec_20_00_h', 'bed_08_10_h', 'sweep_min_max_h'], sensRows);
tbl(['maxH', '組', 'n', '期限類違反', 'B 過期 平均', '最大', '延誤平均 新', 'v0.3', '比', '獸潮延誤(完成) 新', 'v0.3', '0 完成 新', 'v0.3', '完成件平均 新', 'v0.3', '資訊:逐情境延誤違反', '20:00 睡 h', '08:10 睡 h', '全時段 h'], sensRows);

// ================= 5. 條件 4 wrnd（回歸） =================
P('## 5. 條件 4 wrnd 對齊（回歸）');
const W = L.load(); const wSeeds = [0, 1, 42, 12345, 20261128, 0xffffffff]; const wTags = ['tide-first', 'tide-gap', 'tide-town', 'pnoise-huiyao', 'pnoise-duyin', 'quest', 'tide-def', 'rescue'];
const wRows = []; let wDiff = 0, wN = 0;
wSeeds.forEach((seed) => { W.G.restart(seed, 'drifter'); const s2 = W.G.state.seed;
  wTags.forEach((tag) => { for (let n = 0; n < 24; n++) { const day = n, i = n % 3; const g = W.G._debug.wrnd(tag, day, i), s = U.wrnd(seed, tag, day, i); wN++; if (g !== s) wDiff++; wRows.push([seed, s2, tag, day, i, g.toPrecision(17), s.toPrecision(17), g === s ? 1 : 0]); } }); });
csv('wrnd-compare.csv', ['seed_arg', 'S.seed', 'tag', 'day', 'i', 'game_wrnd', 'sim_util_wrnd', 'bit_equal'], wRows);
P('種子 ' + wSeeds.length + ' 組 × 標籤 ' + wTags.length + ' × 每組 24 個 (day,i)：比對 ' + wN + ' 個輸出，逐位不同 ' + wDiff + ' 個');
VERDICT.wrnd = wDiff === 0;

// ================= 6. anyhour 複算（資訊） =================
P('## 6. 開發 anyhour 腳本複算（資訊，重建版）');
const AH = require('./anyhour_repro');
const ah = AH.run(impl); ah.lines.forEach(P);
csv('anyhour-repro.csv', ['mode', 'metric', 'new', 'old', 'dev_reported_new', 'dev_reported_old', 'match'], ah.rows);

// ================= 7. 實作引用 =================
P('## 7. 實作引用（被驗 commit 行號與原文）');
const CITE = [['js/data.js', /const SLEEP =|const TIME =|RISK_CAP/], ['js/game.js', /function wakeTime|function sleepFoodCost|function sleepToMorning|passTime\(hours, Object\.assign|hpFloor|case 'rest'|case 'bunk'|case 'nap'|function camp|passTime\(8, \{ food: 16|const risk = \(night|const foodMult|S\.food = clamp\(S\.food -|S\.hp -= 3 \* hours|function riskTier|const better =|function route\(|const riskName = riskTier|function neighbors|function isNight|function checkDeath/]];
const citeRows = [];
CITE.forEach(([f, re]) => L.grepLines(f, re).forEach(([n, l]) => { citeRows.push([f + ':' + n, l]); P('- `' + f + ':' + n + '` ' + l.slice(0, 200)); }));
csv('impl-cite.csv', ['file_line', 'text'], citeRows);
const hpFloorUses = L.grepLines('js/game.js', /hpFloor/);
P('hpFloor 在 js/game.js 出現 ' + hpFloorUses.length + ' 次：' + hpFloorUses.map((x) => x[0]).join('、'));
const coldHits = L.grepLines('js/game.js', /cold|寒意|寒顫|S\.cold/);
P('寒冷狀態（cold／寒意／寒顫／S.cold）在 js/game.js 出現 ' + coldHits.length + ' 次' + (coldHits.length ? '：' + coldHits.map((x) => x[0]).join('、') : '（實作沒有寒冷狀態，無法設定）'));

// ================= 8. 睡眠飽食 1.25× =================
P('## 8. 睡眠飽食 = 1.25 × 睡眠實際小時（冬 ×1.25）— 走 G.service 完整路徑');
// 實測未取整扣減量：起始飽食 x∈[50,51) 二分找 Math.round 翻轉點，c = x* − (r_hi − 0.5)
function exactDrop(runAt) {
  const r = (x) => runAt(x);
  let lo = 50.123, hi = 51.123; const r0 = r(lo); // 區間起點避開 .0／.5，任何 c 在區間內恰有一個翻轉點
  if (r(hi - 1e-9) === r0) return { c: NaN, note: 'no flip' };
  for (let i = 0; i < 45; i++) { const mid = (lo + hi) / 2; if (r(mid) === r0) lo = mid; else hi = mid; }
  return { c: hi - (r(hi) - 0.5) };
}
const FC = L.load(); FC.G.restart(20261128, 'drifter');
function sleepCase(kind, t, opt) { return fullPath(kind, t, opt, FC); }
const foodCases = [];
const NAMED = [['20:00→12h', 4 * 1440 + 1200, 12], ['03:00→6h', 4 * 1440 + 180, 6], ['00:00→8h', 4 * 1440, 8], ['08:10→13h', 4 * 1440 + 490, 13], ['08:00→6h', 4 * 1440 + 480, 6], ['08:01→13h', 4 * 1440 + 481, 13]];
const SEASON_DAYS = [['春 第 5 日', 4], ['冬 第 95 日', 94]];
const foodRows = []; let foodBad = 0, foodN = 0;
function foodCheck(kind, label, season, t, expH) {
  const f80 = sleepCase(kind, t, { food: 80, hp: 50 });
  const h = (f80.wake - t) / 60; const wm = T.seasonOf(f80.wake) === 3 ? 1.25 : 1; const spec = 1.25 * h * wm;
  const ex = exactDrop((x) => sleepCase(kind, t, { food: x, hp: 50 }).food).c;
  const ok = Math.abs(ex - spec) < 1e-6 && (expH === undefined || Math.abs(h - expH) < 1e-9) && f80.food === Math.round(80 - spec);
  foodN++; if (!ok) foodBad++;
  // 下限 0：起始飽食 3
  const f3 = sleepCase(kind, t, { food: 3, hp: 50 });
  return [kind, label, season, T.fmtT(t), T.fmtT(f80.wake), h, expH === undefined ? '' : expH, wm, spec, ex, 80 - f80.food, f80.food, f3.food, f80.paid, ok ? '過' : '不過'];
}
SEASON_DAYS.forEach(([sn, d0]) => NAMED.forEach(([n, t, eh]) => ['rest', 'bunk'].forEach((k) => foodRows.push(foodCheck(k, n, sn, t - 4 * 1440 + d0 * 1440, eh)))));
// 季節交界：秋第 90 日 20:00 睡到冬第 91 日；冬第 120 日 20:00 睡到春第 121 日
[['秋→冬 第 90 日 20:00', 89 * 1440 + 1200], ['冬→春 第 120 日 20:00', 119 * 1440 + 1200]].forEach(([n, t]) => ['rest', 'bunk'].forEach((k) => foodRows.push(foodCheck(k, n, '交界', t))));
P('具名案例（rest、bunk × 春、冬）：');
tbl(['路徑', '案例', '季節', '就寢', '起床', '睡 h', '預期 h', '冬倍率', '規格扣 1.25×h×冬', '實測未取整扣減', '起始 80 的整數扣減', '睡後飽食', '起始 3 睡後(下限 0)', '花費', '結論'], foodRows);
// 每 30 分全掃描（春第 5 日、冬第 95 日；rest、bunk）
const scanRows = [];
SEASON_DAYS.forEach(([sn, d0]) => { for (let m = 0; m < 1440; m += 30) ['rest', 'bunk'].forEach((k) => scanRows.push(foodCheck(k, clock(m), sn, d0 * 1440 + m))); });
const scanBad = scanRows.filter((r) => r[14] !== '過').length;
P('每 30 分一格全掃描（春第 5 日、冬第 95 日 × rest、bunk）：' + scanRows.length + ' 個案例，實測未取整扣減 ≠ 1.25×h×冬 或 整數結果 ≠ round(80−規格) 的個數 ' + scanBad + '；具名案例不符 ' + foodRows.filter((r) => r[14] !== '過').length);
const lowBad = foodRows.concat(scanRows).filter((r) => r[12] !== 0).length;
P('下限：起始飽食 3 睡後飽食不為 0 的個數 ' + lowBad + '（' + (foodRows.length + scanRows.length) + ' 案例）');
// 重複扣檢查：實測扣減若含舊固定 10，則 ex = spec + 10；也看 sleepToMorning 原文是否還有 food: 10
const stmText = L.extractFn('sleepToMorning');
P('sleepToMorning 原文含「food: 10」：' + (/food: 10\b/.test(stmText) ? '是' : '否') + '；實測扣減 = 規格 +10 的案例數 ' + foodRows.concat(scanRows).filter((r) => Math.abs(r[9] - r[8] - 10) < 1e-6).length);
P('sleepFoodCost(h)（_debug 匯出）：6→' + G._debug.sleepFoodCost(6) + '、8→' + G._debug.sleepFoodCost(8) + '、12→' + G._debug.sleepFoodCost(12) + '、13→' + G._debug.sleepFoodCost(13));
csv('food-cases.csv', ['path', 'case', 'season', 'bed', 'wake', 'sleep_h', 'expected_h', 'winter_mult', 'spec_drop', 'impl_exact_drop', 'impl_int_drop_from_80', 'food_after_from_80', 'food_after_from_3', 'paid', 'verdict'], foodRows.concat(scanRows.map((r) => r.slice(0, 1).concat(['scan30:' + r[1]], r.slice(2)))));
VERDICT.food = scanBad === 0 && foodRows.every((r) => r[14] === '過') && lowBad === 0;

// ================= 9. hp 下限 1（rest／bunk） =================
P('## 9. hp 下限 1（rest／bunk 完整路徑）＋ 對 d0989ba 回歸');
const PV = L.load({ rev: PREV }); PV.G.restart(20261128, 'drifter');
const HC = L.load(); HC.G.restart(20261128, 'drifter');
const hpCases = [
  ['飽食 0、hp 10、20:00 睡 12h（春）', 4 * 1440 + 1200, { food: 0, hp: 10 }],
  ['飽食 0、hp 1、20:00（春）', 4 * 1440 + 1200, { food: 0, hp: 1 }],
  ['飽食 0、hp 100（體 20，maxHp 110）、20:00（春）', 4 * 1440 + 1200, { food: 0, hp: 100, ti: 20 }],
  ['飽食 5、hp 10、08:10 睡 13h（中途歸零）', 4 * 1440 + 490, { food: 5, hp: 10 }],
  ['飽食 0、hp 10、08:10 睡 13h（春）', 4 * 1440 + 490, { food: 0, hp: 10 }],
  ['飽食 0、hp 10、03:00 睡 6h（春）', 4 * 1440 + 180, { food: 0, hp: 10 }],
  ['飽食 0、hp 10、20:00（冬 第 95 日）', 94 * 1440 + 1200, { food: 0, hp: 10 }],
  ['飽食 5、hp 10、08:10 睡 13h（冬 第 95 日）', 94 * 1440 + 490, { food: 5, hp: 10 }],
  ['飽食 0、hp 10、疲累 100（斷糧＋力竭）、20:00', 4 * 1440 + 1200, { food: 0, hp: 10, fat: 100 }],
  ['飽食 80、hp 10（不扣血，對照）、20:00', 4 * 1440 + 1200, { food: 80, hp: 10 }],
  ['飽食 80、hp 1（不扣血，對照）、20:00', 4 * 1440 + 1200, { food: 80, hp: 1 }],
  ['侵蝕 20、飽食 0、hp 10、20:00', 4 * 1440 + 1200, { food: 0, hp: 10, corrupt: 20 }],
  ['侵蝕 5、飽食 80、hp 30、20:00', 4 * 1440 + 1200, { food: 80, hp: 30, corrupt: 5 }],
];
const hpRows = []; let hpBad = 0, hpDead = 0, hpChanged = 0;
hpCases.forEach(([n, t, o]) => ['rest', 'bunk'].forEach((k) => {
  const r = fullPath(k, t, Object.assign({ ti: 10 }, o), HC); const p = fullPath(k, t, Object.assign({ ti: 10 }, o), PV);
  const h = (r.wake - t) / 60;
  // 規格模型：passTime 整段一次結算（food 扣完 ≤0 則斷糧 3×h；疲累 ≥100 則 2×h），rest/bunk 下限 1；rest 醒來 hp=maxHp（侵蝕 −10 後）、bunk min(maxHp, hp+30)
  const wm = T.seasonOf(r.wake) === 3 ? 1.25 : 1; const foodEnd = Math.max(0, r.pre.food - 1.25 * h * wm);
  let hpRaw = r.pre.hp - (foodEnd <= 0 ? 3 * h : 0) - (r.pre.fat >= 100 ? 2 * h : 0); const hpSleep = Math.round(Math.max(1, hpRaw));
  const corrAfter = k === 'rest' && r.pre.corrupt ? Math.max(0, r.pre.corrupt - 10) : r.pre.corrupt;
  const maxAfter = r.maxHp; // 以實作 maxHp（含侵蝕）為準
  const expHp = k === 'rest' ? maxAfter : Math.min(maxAfter, hpSleep + 30);
  const bound = k === 'rest' ? maxAfter : Math.min(maxAfter, r.pre.hp + 30);
  const ok = !r.dead && r.hp >= 1 && r.hp === expHp && r.hp <= bound && r.fat === 0 && r.corrupt === corrAfter && r.food === Math.round(foodEnd);
  if (!ok) hpBad++; if (r.dead) hpDead++;
  // 對 d0989ba：只看非死亡情況的 hp/fat/corrupt 是否相同（飽食本來就不同）
  const same = p.dead ? '舊版死亡' : (p.hp === r.hp && p.fat === r.fat && p.corrupt === r.corrupt ? '同' : '異');
  if (same === '異') hpChanged++;
  hpRows.push([k, n, T.fmtT(t), T.fmtT(r.wake), h, r.pre.hp, r.pre.food, r.pre.fat, r.pre.corrupt, r.pre.maxHp, r.hp, r.food, r.fat, r.corrupt, r.maxHp, r.dead ? '死' : '活', r.paid, expHp, bound, ok ? '過' : '不過', p.dead ? '死（' + p.cause + '）' : '活', p.hp, p.food, same]);
}));
tbl(['路徑', '案例', '就寢', '起床', '睡 h', '睡前 hp', '睡前飽食', '睡前疲累', '睡前侵蝕', '睡前 maxHp', '睡後 hp', '睡後飽食', '睡後疲累', '睡後侵蝕', '睡後 maxHp', '死活', '花費', '規格預期 hp', 'hp 上界', '結論', 'd0989ba 死活', 'd0989ba hp', 'd0989ba 飽食', 'hp/疲/侵蝕 對 d0989ba'], hpRows);
P('hp 下限案例 ' + hpRows.length + '：不符 ' + hpBad + '、死亡 ' + hpDead + '；非死亡案例 hp/疲累/侵蝕 與 d0989ba 不同 ' + hpChanged);
csv('hp-floor-cases.csv', ['path', 'case', 'bed', 'wake', 'sleep_h', 'hp_before', 'food_before', 'fat_before', 'corrupt_before', 'maxhp_before', 'hp_after', 'food_after', 'fat_after', 'corrupt_after', 'maxhp_after', 'dead', 'paid', 'spec_expected_hp', 'hp_upper_bound', 'verdict', 'd0989ba_dead', 'd0989ba_hp', 'd0989ba_food', 'hp_fat_corrupt_vs_d0989ba'], hpRows);
VERDICT.hp = hpBad === 0 && hpDead === 0 && hpChanged === 0;
// rest／bunk 原本回復量對 d0989ba（不扣血的一般情況，多時刻）
let regBad = 0, regN = 0; const regRows = [];
for (let m = 0; m < 1440; m += 60) ['rest', 'bunk'].forEach((k) => [10, 40, 79].forEach((hp0) => { const t = 4 * 1440 + m; const o = { food: 80, hp: hp0, fat: 50, ti: 10 }; const a = fullPath(k, t, o, HC), b = fullPath(k, t, o, PV); regN++; const same = a.hp === b.hp && a.fat === b.fat && a.wake === b.wake && a.paid === b.paid && a.dead === b.dead; if (!same) regBad++; regRows.push([k, clock(m), hp0, a.hp, b.hp, a.fat, b.fat, a.wake === b.wake ? 1 : 0, a.paid, b.paid, a.food, b.food, same ? '同' : '異']); }));
csv('rest-bunk-regression-vs-d0989ba.csv', ['path', 'bed_clock', 'hp_before', 'hp_after_3fc260f', 'hp_after_d0989ba', 'fat_after_3fc260f', 'fat_after_d0989ba', 'wake_equal', 'paid_3fc260f', 'paid_d0989ba', 'food_after_3fc260f', 'food_after_d0989ba', 'hp_fat_wake_paid_equal'], regRows);
P('rest／bunk 回復量回歸（飽食 80、疲累 50、hp 10／40／79 × 每小時 24 格 × 2 路徑 = ' + regN + '）：hp、疲累、起床、花費、死活 與 d0989ba 不同 ' + regBad + '（飽食本來就該不同，不列入）');
VERDICT.recov = regBad === 0;

// ================= 10. 露宿與茶攤小憩：沒有保護 =================
P('## 10. 露宿（camp）與茶攤小憩（nap）：不得有 hp 下限 1 保護');
function campRun(inst2, t, o) {
  const G2 = inst2.G, S = G2.state; o = o || {};
  S.dead = null; S.combat = null; S.event = null; S.loot = null; S.trade = null; S.scene = 'wild'; S.loc = o.loc || 'chishi'; S.fire = true;
  if (o.ti !== undefined) S.attr.ti = o.ti; S.corrupt = 0;
  S.hp = o.hp; S.food = o.food; S.fat = o.fat !== undefined ? o.fat : 60; S.t = t; if (o.rng !== undefined) S.rng = o.rng >>> 0; S.log = [];
  const pre = { hp: S.hp, food: S.food, fat: S.fat, maxHp: G2.maxHp() };
  G2.camp();
  return { pre, t1: S.t, hp: S.dead ? 0 : S.hp, hpRaw: S.hp, food: S.food, fat: S.fat, dead: !!S.dead, cause: S.dead ? S.dead.cause : '', combat: !!S.combat };
}
const CA = L.load(); CA.G.restart(20261128, 'drifter'); const CB = L.load({ rev: PREV }); CB.G.restart(20261128, 'drifter');
const snapA = JSON.stringify(CA.G.state), snapB = JSON.stringify(CB.G.state);
const restore = (inst2, snap) => { const S = inst2.G.state; const o = JSON.parse(snap); Object.keys(S).forEach((k) => { if (!(k in o)) delete S[k]; }); Object.assign(S, o); };
const campCases = [
  ['飽食 0、hp 10、20:00 露宿 8h（春 第 1 日）', 1200, { food: 0, hp: 10 }],
  ['飽食 0、hp 24、20:00（扣 24 剛好歸零）', 1200, { food: 0, hp: 24 }],
  ['飽食 0、hp 25、20:00', 1200, { food: 0, hp: 25 }],
  ['飽食 0、hp 100（體 20，maxHp 110）、20:00', 1200, { food: 0, hp: 100, ti: 20 }],
  ['一般：飽食 80、hp 50、20:00', 1200, { food: 80, hp: 50 }],
  ['一般：飽食 80、hp 50、12:00', 720, { food: 80, hp: 50 }],
  ['飽食 0、hp 10、20:00（冬 第 95 日）', 94 * 1440 + 1200, { food: 0, hp: 10 }],
  ['一般：飽食 80、hp 50、20:00（冬 第 95 日）', 94 * 1440 + 1200, { food: 80, hp: 50 }],
  ['飽食 0、hp 10、疲累 100、20:00', 1200, { food: 0, hp: 10, fat: 100 }],
];
const campRows = []; let campBad = 0, campDiff = 0;
campCases.forEach(([n, t, o]) => {
  restore(CA, snapA); restore(CB, snapB);
  const a = campRun(CA, t, Object.assign({ ti: 10, rng: 12345 }, o)), b = campRun(CB, t, Object.assign({ ti: 10, rng: 12345 }, o));
  const wm = T.seasonOf(t + 480) === 3 ? 1.25 : 1; const foodEnd = Math.max(0, o.food - 16 * wm);
  let hpE = o.hp - (foodEnd <= 0 ? 24 : 0) - ((o.fat || 60) >= 100 && false ? 16 : 0);
  // 疲累：camp 先減 rec 再判 ≥100，fat 100 − 50 = 50 → 不扣
  if (foodEnd >= 30) hpE = Math.min(a.pre.maxHp, hpE + 8);
  const expDead = hpE <= 0;
  const ok = a.dead === expDead && (expDead || a.hpRaw === Math.round(hpE)) && a.food === Math.round(foodEnd) && a.t1 === t + 480;
  if (!ok) campBad++;
  const same = a.dead === b.dead && a.hpRaw === b.hpRaw && a.food === b.food && a.fat === b.fat && a.t1 === b.t1 && a.combat === b.combat;
  if (!same) campDiff++;
  campRows.push(['camp', n, T.fmtT(t), T.fmtT(a.t1), a.pre.hp, a.pre.food, a.pre.fat, a.pre.maxHp, a.hpRaw, a.food, a.fat, a.dead ? '死（' + a.cause + '）' : '活', a.combat ? '是' : '否', expDead ? '死' : '活 hp ' + Math.round(hpE), 16 * wm, o.food - a.food, ok ? '過' : '不過', b.dead ? '死' : '活', b.hpRaw, b.food, same ? '同' : '異']);
});
// 茶攤小憩：passTime(2, { fat: -20 })，不得有下限
const napCases = [['飽食 0、hp 5、10:00 小憩 2h', 4 * 1440 + 600, { food: 0, hp: 5 }], ['飽食 0、hp 6、10:00（扣 6 剛好歸零）', 4 * 1440 + 600, { food: 0, hp: 6 }], ['飽食 0、hp 10、10:00', 4 * 1440 + 600, { food: 0, hp: 10 }], ['一般：飽食 80、hp 50、10:00', 4 * 1440 + 600, { food: 80, hp: 50 }]];
const NA = L.load(); NA.G.restart(20261128, 'drifter'); const NB = L.load({ rev: PREV }); NB.G.restart(20261128, 'drifter');
napCases.forEach(([n, t, o]) => {
  const a = fullPath('nap', t, Object.assign({ ti: 10, fat: 60 }, o), NA), b = fullPath('nap', t, Object.assign({ ti: 10, fat: 60 }, o), NB);
  const foodEnd = Math.max(0, o.food - 8); let hpE = o.hp - (foodEnd <= 0 ? 6 : 0); if (foodEnd >= 30) hpE = Math.min(a.pre.maxHp, hpE + 2);
  const expDead = hpE <= 0; const ok = a.dead === expDead && (expDead || a.hp === Math.round(hpE)) && a.food === Math.round(foodEnd);
  if (!ok) campBad++;
  const same = a.dead === b.dead && a.hp === b.hp && a.food === b.food && a.fat === b.fat && a.wake === b.wake; if (!same) campDiff++;
  campRows.push(['nap', n, T.fmtT(t), T.fmtT(a.wake), a.pre.hp, a.pre.food, a.pre.fat, a.pre.maxHp, a.dead ? 0 : a.hp, a.food, a.fat, a.dead ? '死（' + a.cause + '）' : '活', '', expDead ? '死' : '活 hp ' + Math.round(hpE), 8, o.food - a.food, ok ? '過' : '不過', b.dead ? '死' : '活', b.dead ? 0 : b.hp, b.food, same ? '同' : '異']);
});
tbl(['路徑', '案例', '開始', '結束', '前 hp', '前飽食', '前疲累', 'maxHp', '後 hp', '後飽食', '後疲累', '死活', '夜警開戰', '規格預期（無保護）', '規格飽食扣', '實測飽食扣', '結論', 'd0989ba 死活', 'd0989ba hp', 'd0989ba 飽食', '對 d0989ba'], campRows);
csv('camp-nap-cases.csv', ['path', 'case', 'start', 'end', 'hp_before', 'food_before', 'fat_before', 'maxhp', 'hp_after', 'food_after', 'fat_after', 'dead', 'night_combat', 'spec_expected_no_protection', 'spec_food_drop', 'impl_food_drop', 'verdict', 'd0989ba_dead', 'd0989ba_hp', 'd0989ba_food', 'vs_d0989ba'], campRows);
P('露宿／小憩案例 ' + campRows.length + '：與「無保護」規格模型不符 ' + campBad + '；與 d0989ba 不同 ' + campDiff);
// 露宿飽食未取整扣減（春、冬）
const campExact = [['春 第 1 日 20:00', 1200], ['冬 第 95 日 20:00', 94 * 1440 + 1200]].map(([n, t]) => [n, exactDrop((x) => { restore(CA, snapA); return campRun(CA, t, { food: x, hp: 50, ti: 10, rng: 1 }).food; }).c]);
P('露宿飽食未取整扣減：' + campExact.map((x) => x[0] + ' ' + r3(x[1])).join('；') + '（規格 6.2：2／h×8＝16，冬 ×1.25＝20）');
// 遇險率：抽出 camp 原文的 risk 式，以實作函式求值；另以 4000 次實跑（隨機 S.rng）估夜警頻率
const campText = L.extractFn('camp'); const riskLine = (campText.match(/const night = [^\n]+\n\s+const risk = [^\n]+/) || [''])[0];
function riskEval(inst2, t, loc) { const S = inst2.G.state; S.t = t; S.loc = loc; const box = { isNight: inst2.G.isNight, perk: inst2.G.perk, tideOn: () => !!(S.world.tide && inst2.G.dayOf(S.t) >= S.world.tide.start && inst2.G.dayOf(S.t) <= S.world.tide.end), D: inst2.D, S }; vm.createContext(box); return vm.runInContext(riskLine + '\nrisk;', box); }
const E10 = [['20:00 睡 8h（赤石，中）', 1200, 'chishi', 0.25], ['12:00 睡 8h（赤石，中）', 720, 'chishi', 0.12], ['17:00 睡 8h（赤石，中）', 1020, 'chishi', 0.2256], ['20:00 睡 8h（青霧，低 ×0.6）', 1200, 'qingwu', 0.15]];
const riskRows = E10.map(([n, t, loc, spec]) => {
  restore(CA, snapA); const ra = riskEval(CA, t, loc); restore(CB, snapB); const rb = riskEval(CB, t, loc);
  const rr = U.mulberry32(777 + t); let hitA = 0, hitB = 0; const N = 4000;
  for (let i = 0; i < N; i++) { const s = Math.floor(rr() * 4294967296); restore(CA, snapA); if (campRun(CA, t, { loc, food: 80, hp: 80, ti: 10, rng: s }).combat) hitA++; restore(CB, snapB); if (campRun(CB, t, { loc, food: 80, hp: 80, ti: 10, rng: s }).combat) hitB++; }
  return [n, spec, ra, rb, hitA / N, hitB / N, hitA === hitB ? '同' : '異', Math.abs(ra - spec) < 1e-9 ? '符合' : '不符'];
});
tbl(['露宿案例', 'E10／7.1 規格', '3fc260f 實作式', 'd0989ba 實作式', '3fc260f 實跑 4000 次夜警率', 'd0989ba 實跑夜警率', '逐次結果對 d0989ba', '實作對規格'], riskRows);
csv('camp-risk.csv', ['case', 'spec_E10', 'impl_3fc260f', 'impl_d0989ba', 'empirical_3fc260f_n4000', 'empirical_d0989ba_n4000', 'per_trial_vs_d0989ba', 'impl_vs_spec'], riskRows);
P('camp 遇險式原文：`' + riskLine.replace(/\s+/g, ' ') + '`');
VERDICT.camp = campBad === 0 && campDiff === 0 && riskRows.every((r) => r[6] === '同' && Math.abs(r[2] - r[3]) < 1e-12);

// ================= 11. AC 20／route() =================
P('## 11. AC 20／route()（直接呼叫 G.riskTier、G.route、G.travelPreview）');
const RT = L.load(); RT.G.restart(20261128, 'drifter');
const AC20 = [[0.149, '低'], [0.150, '中'], [0.349, '中'], [0.350, '高'], [0.599, '高'], [0.600, '極高'], [0.85, '極高'], [0.1495, '中'], [0.3495, '高'], [0.5995, '極高'], [0.1499, '中'], [0.14949, '低'], [0.9, '極高'], [0.04, '低'], [0.08, '低']];
const acRows = AC20.map(([x, e]) => { const k = Math.floor(Math.min(RT.D.WORLD.RISK_CAP, x) * 1000 + 0.5 + 1e-9) / 1000; const g = RT.G.riskTier(x); return [String(x), k.toFixed(3), e, g, g === e ? '過' : '不過']; });
tbl(['輸入 risk', '取位後（封頂 0.85、half-up 三位）', '預期檔', '實作 riskTier', '結論'], acRows);
csv('ac20-points.csv', ['risk_in', 'rounded_3dp', 'expected', 'impl', 'verdict'], acRows);
P('RISK_CAP=' + RT.D.WORLD.RISK_CAP + '；RISK_CUTS=' + JSON.stringify(RT.D.TIME.RISK_CUTS) + '；RISK_TIERS=' + JSON.stringify(RT.D.TIME.RISK_TIERS));
VERDICT.ac20pts = acRows.slice(0, 10).every((r) => r[4] === '過');
// 邊順序反轉
const revNodes = (Dd) => { const ks = Object.keys(Dd.NODES).reverse(); const o = {}; ks.forEach((k) => (o[k] = Dd.NODES[k])); Object.keys(Dd.NODES).forEach((k) => delete Dd.NODES[k]); ks.forEach((k) => (Dd.NODES[k] = o[k])); };
const revEdges = (Dd) => { Dd.EDGES.reverse(); Dd.EDGES.forEach((e) => { const a = e.a; e.a = e.b; e.b = a; }); };
const shuffleBoth = (seed) => (Dd) => { const r = U.mulberry32(seed); for (let i = Dd.EDGES.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [Dd.EDGES[i], Dd.EDGES[j]] = [Dd.EDGES[j], Dd.EDGES[i]]; } const ks = Object.keys(Dd.NODES); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; } const o = {}; ks.forEach((k) => (o[k] = Dd.NODES[k])); Object.keys(Dd.NODES).forEach((k) => delete Dd.NODES[k]); ks.forEach((k) => (Dd.NODES[k] = o[k])); };
const shuffleEdges = (seed) => (Dd) => { const r = U.mulberry32(seed); for (let i = Dd.EDGES.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [Dd.EDGES[i], Dd.EDGES[j]] = [Dd.EDGES[j], Dd.EDGES[i]]; } Dd.EDGES.forEach((e) => { if (r() < 0.5) { const a = e.a; e.a = e.b; e.b = a; } }); };
const VARIANTS = [['原圖', null, 'base'], ['EDGES 反轉（含端點對調）', revEdges, 'edges'], ['NODES 反轉', revNodes, 'nodes'], ['EDGES＋NODES 都反轉', (Dd) => { revEdges(Dd); revNodes(Dd); }, 'both']]
  .concat([...Array(50).keys()].map((i) => ['EDGES 隨機打亂 #' + i, shuffleEdges(2000 + i), 'shufE']))
  .concat([...Array(50).keys()].map((i) => ['EDGES＋NODES 隨機打亂 #' + i, shuffleBoth(1000 + i), 'shufB']));
function routeTable(inst2, knowAll) {
  const S = inst2.G.state; S.known = Object.assign({}, S.known); if (knowAll) Object.keys(inst2.D.NODES).forEach((k) => { if (inst2.D.NODES[k].hidden) S.known[k] = true; });
  const ids = Object.keys(inst2.D.NODES).filter((k) => inst2.G.known(k)).sort(); const m = {};
  ids.forEach((a) => ids.forEach((b) => { if (a === b) return; const e = inst2.G.route(a, b); m[a + '>' + b] = [a].concat(e.stops).join('-'); }));
  return m;
}
const routeVarRows = []; let base = {}; const VSTAT = {};
[false, true].forEach((knowAll) => {
  const agg2 = {};
  VARIANTS.forEach(([vn, mut, cls], vi) => {
    const x = L.load(mut ? { mutateData: mut } : {}); x.G.restart(20261128, 'drifter');
    const m = routeTable(x, knowAll); if (vi === 0) base[knowAll] = m;
    const diff = Object.keys(base[knowAll]).filter((k) => base[knowAll][k] !== m[k]);
    VSTAT[cls] = (VSTAT[cls] || 0) + diff.length;
    if (cls === 'shufE' || cls === 'shufB') { const a = (agg2[cls] = agg2[cls] || { n: 0, withDiff: 0, pairs: new Set(), pairsN: Object.keys(m).length }); a.n++; if (diff.length) a.withDiff++; diff.forEach((k) => a.pairs.add(k + ':' + base[knowAll][k] + '→' + m[k])); }
    else routeVarRows.push([knowAll ? '含隱藏節點' : '預設已知', vn, Object.keys(m).length, diff.length, diff.map((k) => k + ':' + base[knowAll][k] + '→' + m[k]).join(' ; ')]);
  });
  Object.keys(agg2).forEach((cls) => { const a = agg2[cls]; routeVarRows.push([knowAll ? '含隱藏節點' : '預設已知', (cls === 'shufE' ? 'EDGES 隨機打亂（含端點隨機對調）' : 'EDGES＋NODES 隨機打亂') + ' ' + a.n + ' 種：有差異 ' + a.withDiff + ' 種', a.pairsN, a.pairs.size ? '見右（聯集）' : 0, [...a.pairs].join(' ; ')]); });
});
tbl(['已知節點', '圖的排列', '路線對數', '與原圖不同', '差異（前 6）'], routeVarRows);
csv('route-order-variants.csv', ['known', 'variant', 'pairs', 'diff_vs_original', 'diff_examples'], routeVarRows);
// 列舉所有簡單路徑：找出 (時數, 野徑段數) 平手的路線對，檢查第 3、4 層
function allPaths(Dd, known, a, b) { const adj = {}; Dd.EDGES.forEach((e) => { if (!known(e.a) || !known(e.b)) return; (adj[e.a] = adj[e.a] || []).push([e.b, e]); (adj[e.b] = adj[e.b] || []).push([e.a, e]); }); const res = []; const walk = (u, seen, nodes, edges) => { if (u === b) { res.push({ nodes: nodes.slice(), edges: edges.slice() }); return; } (adj[u] || []).forEach(([v, e]) => { if (seen.has(v)) return; seen.add(v); nodes.push(v); edges.push(e); walk(v, seen, nodes, edges); nodes.pop(); edges.pop(); seen.delete(v); }); }; walk(a, new Set([a]), [a], []); return res; }
const baseRisk = (edges) => { const w = edges.some((e) => !e.road); return w ? (edges.length > 1 ? 0.3 : 0.22) : 0.04; };
const tieRows = [];
{ const x = L.load(); x.G.restart(20261128, 'drifter'); const S = x.G.state; Object.keys(x.D.NODES).forEach((k) => { if (x.D.NODES[k].hidden) S.known[k] = true; });
  const ids = Object.keys(x.D.NODES).filter((k) => x.G.known(k)).sort();
  ids.forEach((a) => ids.forEach((b) => { if (a >= b && false) return; if (a === b) return;
    const ps = allPaths(x.D, x.G.known, a, b).map((p) => ({ ...p, h: p.edges.reduce((s, e) => s + e.h, 0), w: p.edges.filter((e) => !e.road).length, r: baseRisk(p.edges) }));
    if (!ps.length) return; ps.sort((p, q) => p.h - q.h || p.w - q.w || p.r - q.r || (p.nodes.join('-') < q.nodes.join('-') ? -1 : 1));
    const best = ps[0]; const tied = ps.filter((p) => p.h === best.h && p.w === best.w);
    const tiedH = ps.filter((p) => p.h === best.h);
    const impl2 = [a].concat(x.G.route(a, b).stops).join('-');
    if (tiedH.length > 1) tieRows.push([a + '→' + b, best.h, tiedH.length, tied.length, tied.map((p) => p.nodes.join('-') + '(w' + p.w + ',r' + p.r + ')').join(' / '), best.nodes.join('-'), impl2, impl2 === best.nodes.join('-') ? '同' : '異', new Set(tied.map((p) => p.r)).size > 1 ? '第 3 層會分出' : (tied.length > 1 ? '第 4 層才分出' : '第 2 層已分出')]);
  })); }
P('時數平手的路線對（含隱藏節點；列舉全部簡單路徑，四層排序的最佳 vs 實作）：' + tieRows.length + ' 對；其中 (時數, 野徑段數) 仍平手 ' + tieRows.filter((r) => r[3] > 1).length + ' 對；實作與四層最佳不同 ' + tieRows.filter((r) => r[7] === '異').length + ' 對');
tbl(['路線', '最短時數', '同時數路線數', '同時數同野徑數', '同時數同野徑數的路線', '四層最佳', '實作 route()', '同異', '分出的層'], tieRows);
csv('route-ties.csv', ['pair', 'best_h', 'n_same_h', 'n_same_h_w', 'tied_routes', 'best_4layer', 'impl_route', 'impl_eq_best', 'decided_at'], tieRows);
// 送貨六方向 travelPreview（白天 12:00、黑夜 22:00）
const tpRows = [];
[['huiyao', 'duyin'], ['duyin', 'huiyao'], ['huiyao', 'poxiao'], ['poxiao', 'huiyao'], ['duyin', 'poxiao'], ['poxiao', 'duyin']].forEach(([a, b]) => VARIANTS.slice(0, 4).forEach(([vn, mut]) => { const x = L.load(mut ? { mutateData: mut } : {}); x.G.restart(20261128, 'drifter'); const S = x.G.state; S.loc = a; [[720, '白天'], [1320, '黑夜']].forEach(([t, tn]) => { S.t = 4 * 1440 + t; const p = x.G.travelPreview(b); tpRows.push([a + '→' + b, vn, tn, [a].concat(p.edges.stops).join('-'), p.edges.every((e) => e.road) ? '全官道' : '含野徑', p.edges.reduce((s, e) => s + e.h, 0), p.via, p.risk, p.riskName]); }); }));
const tpBad = tpRows.filter((r) => r[4] !== '全官道' || r[8] !== '低').length;
P('送貨六方向 × 4 種排列 × 白天／黑夜 travelPreview：' + tpRows.length + ' 筆，非全官道或險級不是「低」的 ' + tpBad);
tbl(['方向', '排列', '時段', '路線', '類', '基礎時數', 'via', 'risk', 'riskName'], tpRows.filter((r) => r[1] === '原圖' || r[1] === 'EDGES＋NODES 都反轉'));
csv('route-delivery-preview.csv', ['dir', 'variant', 'phase', 'route', 'type', 'base_h', 'via', 'risk', 'riskName'], tpRows);
VERDICT.tieDelivery = tpBad === 0; VERDICT.edgeOrder = (VSTAT.edges || 0) + (VSTAT.shufE || 0) === 0; VERDICT.nodeOrder = (VSTAT.nodes || 0) + (VSTAT.both || 0) + (VSTAT.shufB || 0) === 0;
P('排列造成的路線差異（兩種已知集合合計路線對次數）：' + JSON.stringify(VSTAT));
// 第 3、4 層：合成例（記憶體中加測試節點，與原圖不連通）
function synth(order) { return (Dd) => {
  (/N$/.test(order) ? ['zz_s', 'zz_r', 'zz_b', 'zz_a', 'zz_x', 'zz_q', 'zz_p'] : ['zz_p', 'zz_q', 'zz_x', 'zz_a', 'zz_b', 'zz_r', 'zz_s']).forEach((k) => (Dd.NODES[k] = { name: k, g: '測', ic: 'n_cross', kind: 'wild', x: 0, y: 0 }));
  let E = [
    { a: 'zz_p', b: 'zz_q', h: 4 },                 // L3 例：單段野徑 4h（base 0.22）
    { a: 'zz_p', b: 'zz_x', h: 2, road: true },     //        官道 2h ＋ 野徑 2h（多段，base 0.30）
    { a: 'zz_x', b: 'zz_q', h: 2 },
    { a: 'zz_r', b: 'zz_a', h: 1, road: true },     // L4 例：r-a-s 與 r-b-s 皆 官道 1h＋野徑 1h（同時數、同野徑數、同 base 0.30）
    { a: 'zz_a', b: 'zz_s', h: 1 },
    { a: 'zz_r', b: 'zz_b', h: 1, road: true },
    { a: 'zz_b', b: 'zz_s', h: 1 },
  ];
  if (/^rev/.test(order)) E = E.reverse().map((e) => ({ ...e, a: e.b, b: e.a }));
  if (order === 'L3first') E = [E[1], E[2], E[0]].concat(E.slice(3));
  if (order === 'L4b') E = E.slice(0, 3).concat([E[5], E[6], E[3], E[4]]);
  E.forEach((e) => Dd.EDGES.push(e));
}; }
const synRows = [];
[['原順序', 'orig'], ['EDGES 全反轉', 'rev'], ['L3：多段路線的邊放前面', 'L3first'], ['L4：經 b 的邊放前面', 'L4b'], ['NODES 反轉（zz_b 在 zz_a 前）', 'origN'], ['EDGES＋NODES 都反轉', 'revN']].forEach(([n, o]) => { const x = L.load({ mutateData: synth(o) }); x.G.restart(1, 'drifter');
  const q = x.G.route('zz_p', 'zz_q'), s = x.G.route('zz_r', 'zz_s'), q2 = x.G.route('zz_q', 'zz_p'), s2 = x.G.route('zz_s', 'zz_r');
  synRows.push([n, ['zz_p'].concat(q.stops).join('-'), baseRisk(q), ['zz_q'].concat(q2.stops).join('-'), ['zz_r'].concat(s.stops).join('-'), ['zz_s'].concat(s2.stops).join('-')]); });
P('第 3、4 層合成例（四層規則預期：p→q 取 zz_p-zz_q（險 0.22 < 0.30）；r→s 取 zz_r-zz_a-zz_s（字典序小）；s→r 取 zz_s-zz_a-zz_r）：');
tbl(['邊的排列', 'p→q 路線', 'p→q base', 'q→p 路線', 'r→s 路線', 's→r 路線'], synRows);
csv('route-layer34-synthetic.csv', ['edge_order', 'p_to_q', 'p_to_q_base', 'q_to_p', 'r_to_s', 's_to_r'], synRows);
const l3ok = synRows.every((r) => r[1] === 'zz_p-zz_q' && r[3] === 'zz_q-zz_p'), l4ok = synRows.every((r) => r[4] === 'zz_r-zz_a-zz_s' && r[5] === 'zz_s-zz_a-zz_r');
const l3stable = new Set(synRows.map((r) => r[1] + r[3])).size === 1, l4stable = new Set(synRows.map((r) => r[4] + r[5])).size === 1;
P('第 3 層（險值）：各排列皆符合 ' + (l3ok ? '是' : '否') + '，隨排列改變 ' + (l3stable ? '否' : '是') + '；第 4 層（字典序）：皆符合 ' + (l4ok ? '是' : '否') + '，隨排列改變 ' + (l4stable ? '否' : '是'));
VERDICT.l3 = l3ok; VERDICT.l4 = l4ok;
const routeText = L.extractFn('route');
P('route() 原文（js/game.js:' + L.lineOf('js/game.js', /function route\(/) + '）比較鍵：含總時數 dist ' + (/dist\[/.test(routeText) ? '是' : '否') + '、含野徑段數 wild ' + (/wild\[/.test(routeText) ? '是' : '否') + '、含險值（risk／riskTier／baseRisk） ' + (/risk/i.test(routeText.replace(/\/\/[^\n]*/g, '')) ? '是' : '否') + '、含節點序列字典序（localeCompare／join 比較） ' + (/localeCompare|join\(/.test(routeText) ? '是' : '否'));
// briefDanger（AC 22）：被驗 commit 有沒有實作
const bdHits = []; ['js/game.js', 'js/ui.js', 'js/data.js', 'index.html'].forEach((f) => { try { L.grepLines(f, /briefDanger|出城危險/).forEach(([n, l]) => bdHits.push(f + ':' + n)); } catch (e) { /* */ } });
P('briefDanger／「出城危險」在 js/、index.html 出現：' + (bdHits.length ? bdHits.join('、') : '0 次（被驗 commit 沒有實作 AC 22，無法直接呼叫）'));
// 依 7.1b 公式以實作 route()/known()/riskTier 重建（標為 sim 重建，非實作）
const W_NOW = [['清晨', 0.25], ['白天', 0], ['黃昏', 0.5], ['黑夜', 1]];
const bdRows = [];
VARIANTS.slice(0, 4).forEach(([vn, mut]) => { const x = L.load(mut ? { mutateData: mut } : {}); x.G.restart(20261128, 'drifter');
  const dests = Object.keys(x.D.NODES).filter((k) => k !== 'huiyao' && x.G.known(k)).sort();
  W_NOW.forEach(([pn, w]) => { let best = -1, arg = ''; dests.forEach((d) => { const e = x.G.route('huiyao', d); if (!e.length) return; const r = Math.min(0.85, baseRisk(e) * 1 * (1 + w)); if (r > best + 1e-12) { best = r; arg = ['huiyao'].concat(e.stops).join('-'); } }); bdRows.push([vn, pn, best, x.G.riskTier(best), arg]); }); });
tbl(['排列', '時段', 'briefDanger（sim 重建）', '檔', '最險出城路線（第一個達到最大值者）'], bdRows);
csv('briefdanger-reconstruct.csv', ['variant', 'phase', 'brief_danger_sim', 'tier', 'worst_route_first'], bdRows);
const bdStable = W_NOW.every(([pn]) => new Set(bdRows.filter((r) => r[1] === pn).map((r) => r[2] + r[3])).size === 1);
P('sim 重建 briefDanger 的檔位在 4 種排列下不變：' + (bdStable ? '是' : '否') + '（「最險路線」欄只列第一個達到最大值的路線；最大值有多條路線並列時，這欄跟著列舉順序走）');

// ================= 12. 「中高」殘留（資訊） =================
P('## 12. 「中高」字串殘留（資訊）');
const zgRows = [];
const files = execSync('git ls-files js index.html', { cwd: L.ROOT }).toString().trim().split('\n').filter(Boolean);
files.forEach((f) => L.grepLines(f, /中高/).forEach(([n, l]) => zgRows.push([f + ':' + n, (l.match(/中高/g) || []).length, l.slice(0, 120)])));
tbl(['位置', '次數', '原文'], zgRows);
P('合計 ' + zgRows.reduce((a, r) => a + r[1], 0) + ' 次、' + zgRows.length + ' 行（掃描 ' + files.join('、') + '）');
csv('zhonggao-scan.csv', ['file_line', 'count', 'text'], zgRows);

// ================= 結論 =================
P('## 結論旗標');
P('```'); P(JSON.stringify(VERDICT)); P('```');
// 交辦只准在 evidence/csv-t7-3fc260f/ 新增 *.csv：stdout 以單欄 csv（每列一行）保存
csv('run-stdout.csv', ['line'], out.map((l) => [l]));
