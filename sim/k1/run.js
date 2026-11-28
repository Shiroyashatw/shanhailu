'use strict';
/* K1 善惡速度複驗（num-shl-b1-k1）。依據：SPEC-02 v0.4（2026-11-28 定案）。
 * 用法：node sim/k1/run.js
 * - 原 sim()：直接從 sim/items/K1.js 原始碼編譯取出（不改該檔、不呼叫其 run()，以免覆寫 evidence/csv/K1.csv）。
 * - simTrace()：sim() 的逐行複本，只多記每件「計入的重善」（wday、季、前後 K），供成因分類；每個 seed 都與原 sim() 比對 first[]／traj，不一致即中止。 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const Wd = require('../lib/world');
const { r3, prng, median, quantile, clamp, wilson, ROOT } = require('../lib/util');

const K1_PATH = path.join(ROOT, 'sim', 'items', 'K1.js');
function loadOrigSim() {
  const src = fs.readFileSync(K1_PATH, 'utf8') + '\nmodule.exports.__sim = sim;\n';
  const m = new Module(K1_PATH, module); m.filename = K1_PATH; m.paths = Module._nodeModulePaths(path.dirname(K1_PATH));
  m._compile(src, K1_PATH);
  return m.exports.__sim;
}
const origSim = loadOrigSim();

const SEEDS = 200, DAYS = 360;
const capOf = (K) => (K < 0 ? 0.25 : K < 30 ? 1.2 : K < 100 ? 0.5 : 0.25);
const heavyMult = (K) => (K < 0 ? 0.5 : K < 30 ? 1 : K < 100 ? 0.75 : 0.5);
function simTrace(seed, K0, rule) {
  const W = Wd.run(seed, DAYS, { noQuests: true }); const r = prng(seed, 'K1:' + K0);
  const heavyDays = {}; let supply = 0;
  W.hist.forEach((h) => { if (h.ev.rescue && r() < 0.7) { const d = h.day + Math.floor(r() * 6); (heavyDays[d] = heavyDays[d] || []).push('rescue'); supply++; } });
  W.tideLog.forEach((t) => { if (r() < 0.5) { (heavyDays[t.resolveDay] = heavyDays[t.resolveDay] || []).push('tide'); supply++; } });
  let K = K0; const first = {}; const cnt = {}, lastHeavy = {}; let counted = 0, wasted = 0; const traj = []; const heavies = [];
  const mark = () => { [0, 30, 100].forEach((th) => { if (first[th] === undefined && K >= th) first[th] = day; }); };
  let day;
  for (day = 1; day <= DAYS; day++) {
    const wday = day - 1, hs = Math.floor(wday / 30); let got = 0;
    const deed = (v) => { const room = capOf(K) - got; if (room <= 1e-9) return; const a = Math.min(v, room); got += a; K = clamp(K + a, -200, 150); };
    deed(0.25); deed(0.25); if (r() < 0.5) deed(1.5);
    (heavyDays[day] || []).forEach((kind) => {
      const c = cnt[hs] || 0; const ok = c < 2 && !(rule && rule.gap15 && c === 1 && wday - lastHeavy[hs] < 15);
      if (ok) { const kb = K; K = clamp(K + 12 * heavyMult(K), -200, 150); heavies.push({ day, wday, hs, kind, kb, ka: K }); cnt[hs] = c + 1; lastHeavy[hs] = wday; counted++; } else wasted++;
    });
    mark(); traj.push(K);
  }
  return { first, supply, counted, wasted, traj, heavies };
}
function checkSame(a, b, tag) {
  const ok = JSON.stringify(a.first) === JSON.stringify(b.first) && a.traj.length === b.traj.length && a.traj.every((k, i) => k === b.traj[i])
    && a.supply === b.supply && a.counted === b.counted && a.wasted === b.wasted;
  if (!ok) throw new Error('simTrace 與 K1.js sim() 不一致：' + tag);
}

const B = { m0: 154, z30: 15, t100: 63.6, m100: 233 };
const IV = [
  { key: 'm0', name: '−100→0', bound: B.m0 },
  { key: 'z30', name: '0→30', bound: B.z30 },
  { key: 't100', name: '30→100', bound: B.t100 },
  { key: 'm100', name: '−100→100', bound: B.m100 },
];
// 各區間的「起點日、終點日」：天數＝第 1 次達到 K 值的日數差（沿用 K1.js：從 K0 出發者起點日記 0）
function spans(a, b) {
  return {
    m0: b.first[0] !== undefined ? { s: 0, e: b.first[0], run: b } : null,
    z30: a.first[30] !== undefined ? { s: 0, e: a.first[30], run: a } : null,
    t100: a.first[100] !== undefined ? { s: a.first[30], e: a.first[100], run: a } : null,
    m100: b.first[100] !== undefined ? { s: 0, e: b.first[100], run: b } : null,
  };
}
// 成因分類（只用於比下限快的 seed）
//  A 跨段低倍率：區間內（含起點日）有一件計入的重善從 K<30 跨到 K≥30，用了 0≤K<30 段的 ×1 而不是 30–100 段的 ×0.75
//  B 季末＋下季初連拿：區間內有兩件相鄰的計入重善分屬相鄰兩季、相隔 <15 wday（gap15 只管同季）
function classify(sp) {
  const hv = sp.run.heavies.filter((h) => h.day >= Math.max(1, sp.s) && h.day <= sp.e);
  const crossA = hv.filter((h) => h.kb < 30 && h.ka >= 30);
  const pairsB = [];
  for (let i = 1; i < hv.length; i++) if (hv[i].hs === hv[i - 1].hs + 1 && hv[i].wday - hv[i - 1].wday < 15) pairsB.push([hv[i - 1].wday, hv[i].wday]);
  return { A: crossA.length > 0, B: pairsB.length > 0, nHeavy: hv.length, crossA, pairsB, overshoot: crossA.length ? crossA[0].ka - 30 : null };
}

function evalRule(rule) {
  const res = {}; IV.forEach((iv) => (res[iv.key] = { days: [], fast: [] }));
  const reach = []; const perSeed = []; const traj0 = Array(DAYS).fill(0), trajM = Array(DAYS).fill(0);
  let supply = 0, counted = 0, wasted = 0;
  for (let s = 0; s < SEEDS; s++) {
    const a = simTrace(s, 0, rule), b = simTrace(s, -100, rule);
    checkSame(a, origSim(s, 0, rule), 'seed ' + s + ' K0=0'); checkSame(b, origSim(s, -100, rule), 'seed ' + s + ' K0=-100');
    a.traj.forEach((k, i) => (traj0[i] += k)); b.traj.forEach((k, i) => (trajM[i] += k));
    supply += a.supply; counted += a.counted; wasted += a.wasted;
    if (a.first[100] !== undefined) reach.push(a.first[100]);
    const sp = spans(a, b); const row = { seed: s, z100: a.first[100] !== undefined ? a.first[100] : '' };
    IV.forEach((iv) => {
      const x = sp[iv.key]; row[iv.key] = x ? x.e - x.s : '';
      if (!x) return; const d = x.e - x.s; res[iv.key].days.push(d); const c = classify(x);
      res[iv.key].all = res[iv.key].all || { A: 0, B: 0, any: 0, n: 0 }; const T = res[iv.key].all;
      T.n++; if (c.A) T.A++; if (c.B) T.B++; if (c.A || c.B) T.any++;
      if (d < iv.bound) res[iv.key].fast.push({ seed: s, d, c });
    });
    perSeed.push(row);
  }
  IV.forEach((iv) => {
    const d = res[iv.key].days; const R = res[iv.key];
    R.n = d.length; R.min = d.length ? Math.min(...d) : NaN; R.p10 = quantile(d, 0.1); R.med = median(d); R.p90 = quantile(d, 0.9);
    R.pass = d.length === SEEDS && R.med >= iv.bound; // 中位數判準；有 seed 未達成時中位數不完整，判未通過（本輪實際皆 200/200）
  });
  return { res, reach, perSeed, traj0, trajM, supply, counted, wasted };
}

// ---------- 執行 ----------
const O = evalRule(null), P = evalRule({ gap15: true });
const L = []; const f = (x) => (Number.isNaN(x) ? 'NA' : Number.isInteger(x) ? String(x) : r3(x));
const okS = (b) => (b ? '通過' : '**未通過**');

// 回歸檢查：前一輪 evidence/b1-sim-results.md（K1 段）印出的數字
const PREV = {
  orig: { m0: { med: 160, p10: 153, p90: 163, min: 151, fast: 29 }, z30: { med: 14, p10: 8, p90: 23, min: 7, fast: 110 }, t100: { med: 63, p10: 50, p90: 75, min: 46, fast: 103 }, m100: { med: 241, p10: 233, p90: 251, min: 225, fast: 17 } },
  gap: { m0: { med: 178.5, p10: 160, p90: 189.1, min: 152, fast: 3 }, z30: { med: 21, p10: 20, p90: 24, min: 18, fast: 0 }, t100: { med: 68, p10: 62, p90: 78.1, min: 53, fast: 34 }, m100: { med: 269, p10: 249, p90: 289, min: 232, fast: 1 } },
  origReach: 200, origReachDays: { med: 77, p10: 71, p90: 89, min: 65 }, gapReach: 200, supply: 39.68, counted: 23.205, wasted: 16.395,
};
let regOK = true; const regRows = [];
const near = (x, y) => Math.abs(x - y) < 5e-4;
[['原規則', O, PREV.orig], ['gap15（前一輪「建議值」）', P, PREV.gap]].forEach(([nm, R, pv]) => {
  IV.forEach((iv) => {
    const r = R.res[iv.key], p = pv[iv.key];
    const m = near(r.med, p.med) && near(r.p10, p.p10) && near(r.p90, p.p90) && r.min === p.min && r.fast.length === p.fast && r.n === 200;
    regOK = regOK && m;
    regRows.push('| ' + nm + ' | ' + iv.name + ' | ' + [p.min, f(p.p10), f(p.med), f(p.p90), p.fast].join('／') + ' | ' + [r.min, f(r.p10), f(r.med), f(r.p90), r.fast.length].join('／') + '（n=' + r.n + '） | ' + (m ? '一致' : '**不一致**') + ' |');
  });
});
const rd = O.reach; const rdOK = rd.length === PREV.origReach && near(median(rd), 77) && near(quantile(rd, 0.1), 71) && near(quantile(rd, 0.9), 89) && Math.min(...rd) === 65 && P.reach.length === PREV.gapReach;
const supOK = near(O.supply / SEEDS, PREV.supply) && near(O.counted / SEEDS, PREV.counted) && near(O.wasted / SEEDS, PREV.wasted);
regOK = regOK && rdOK && supOK;
regRows.push('| 原規則 | 0→義名 | 200/200；65／71／77／89 | ' + rd.length + '/200；' + [Math.min(...rd), f(quantile(rd, 0.1)), f(median(rd)), f(quantile(rd, 0.9))].join('／') + ' | ' + (rdOK ? '一致' : '**不一致**') + ' |');
regRows.push('| 原規則 | 重善機會／計入／浪費（每 seed 平均） | 39.680／23.205／16.395 | ' + [O.supply, O.counted, O.wasted].map((x) => r3(x / SEEDS)).join('／') + ' | ' + (supOK ? '一致' : '**不一致**') + ' |');

L.push('# K1 善惡速度複驗（num-shl-b1-k1）', '', '依據：SPEC-02 v0.4；base numbers/num-shl-b1-civ 0ad0b46f', '',
  '重現：`node sim/k1/run.js`（會重寫本檔與 `evidence/csv-k1/K1.csv`）。200 seeds（0..199）、360 天、`Wd.run(seed, 360, { noQuests: true })`、`prng(seed, \'K1:\' + K0)`、K0＝0 與 −100。善良玩法假設全部沿用 `sim/items/K1.js`。', '',
  '模擬程式：`sim/items/K1.js` 的 `sim()` 直接由其原始碼編譯取用（未改檔）；成因分類用的追蹤版 `simTrace()` 與原 `sim()` 每個 seed、兩種 K0、兩套規則逐日比對 K 軌跡與 first[]／重善件數，全部一致（不一致時程式會中止）。', '',
  '## 0. 回歸檢查', '', '欄位：最快／P10／中位／P90／比下限快的 seed 數。前一輪數字取自 `evidence/b1-sim-results.md` K1 段。', '',
  '| 規則 | 區間 | 前一輪 | 本輪重現 | 判定 |', '|---|---|---|---|---|', ...regRows, '',
  '回歸檢查結果：' + (regOK ? '**全部重現**（原規則與 gap15 兩組的 min／P10／中位／P90／比下限快 seed 數、0→義名、重善供給皆與前一輪相同）。' : '**有不一致，見上表；以下數字不可採信。**'), '');

// 1. 區間表
L.push('## 1. 四個區間（原規則 vs v0.4 規則）', '', 'v0.4 規則＝每重善季計 2 件＋Q-K1b（甲）同季第 2 件須與第 1 件相隔 ≥15 wday（即 `rule.gap15`）；判準＝各區間天數中位數 ≥ 手算值，四區間都要過。「原規則」欄的通過與否也用中位數判準，僅供對照。', '',
  '| 區間 | 手算值 | 規則 | 最小值 | P10 | 中位數 | P90 | 達成 n/200 | 比下限快的 seed | 中位數判定 | 中位數−手算值 |', '|---|---|---|---|---|---|---|---|---|---|---|');
IV.forEach((iv) => {
  [['原規則', O], ['v0.4', P]].forEach(([nm, R]) => {
    const r = R.res[iv.key];
    L.push('| ' + iv.name + ' | ≥' + iv.bound + ' | ' + nm + ' | ' + f(r.min) + ' | ' + f(r.p10) + ' | ' + f(r.med) + ' | ' + f(r.p90) + ' | ' + r.n + '/200 | ' + r.fast.length + ' | ' + okS(r.pass) + ' | ' + (r.med - iv.bound >= 0 ? '+' : '') + r3(r.med - iv.bound) + ' |');
  });
});
L.push('', '天數定義沿用 `K1.js`：−100→0、−100→100 從 K0＝−100 的那條跑出；0→30 從 K0＝0 跑出；30→100＝（K0＝0 那條第 1 次 K≥100 的日）−（第 1 次 K≥30 的日）。P10／P90 為線性內插分位數（`sim/lib/util.js` quantile）。', '');

// 2. 義名達成率
const pr = (R) => { const k = R.reach.length; const [lo, hi] = wilson(k, SEEDS); return { k, p: k / SEEDS, lo, hi, d: R.reach }; };
L.push('## 2. 0→義名（K=100）360 天內達成率', '', '| 規則 | 達成 | 達成率 | Wilson 95% CI | 到義名天數 min | P10 | 中位數 | P90 | 警示（<50%） |', '|---|---|---|---|---|---|---|---|---|');
[['原規則', O], ['v0.4', P]].forEach(([nm, R]) => {
  const x = pr(R);
  L.push('| ' + nm + ' | ' + x.k + '/200 | ' + r3(x.p) + ' | [' + r3(x.lo) + ', ' + r3(x.hi) + '] | ' + (x.d.length ? [Math.min(...x.d), f(quantile(x.d, 0.1)), f(median(x.d)), f(quantile(x.d, 0.9))].join(' | ') : 'NA | NA | NA | NA') + ' | ' + (x.p < 0.5 ? '**警示：重善供給不足**' : '無') + ' |');
});
L.push('', 'v0.4 規則下每 seed（K0＝0 那條）360 天平均：重善機會 ' + r3(P.supply / SEEDS) + ' 件、計入 ' + r3(P.counted / SEEDS) + ' 件、被擋（每季 2 件或 gap15）' + r3(P.wasted / SEEDS) + ' 件；原規則為 ' + [O.supply, O.counted, O.wasted].map((x) => r3(x / SEEDS)).join('／') + '。', '');

// 3. 結論
const allPass = IV.every((iv) => P.res[iv.key].pass);
const failList = IV.filter((iv) => !P.res[iv.key].pass).map((iv) => iv.name + ' 中位 ' + f(P.res[iv.key].med) + '（手算 ' + iv.bound + '，差 ' + r3(P.res[iv.key].med - iv.bound) + ' 天）');
const origFail = IV.filter((iv) => !O.res[iv.key].pass).map((iv) => iv.name + ' 中位 ' + f(O.res[iv.key].med) + ' < ' + iv.bound + '（差 ' + r3(O.res[iv.key].med - iv.bound) + '）');
L.push('## 3. 結論', '', '| 規則 | −100→0 | 0→30 | 30→100 | −100→100 | 四區間全過 |', '|---|---|---|---|---|---|');
[['原規則', O], ['v0.4', P]].forEach(([nm, R]) => L.push('| ' + nm + ' | ' + IV.map((iv) => f(R.res[iv.key].med) + ' ' + okS(R.res[iv.key].pass)).join(' | ') + ' | ' + okS(IV.every((iv) => R.res[iv.key].pass)) + ' |'));
L.push('', '**v0.4 規則（gap15＋中位數判準）下，四個區間' + (allPass ? '全部通過' : '未全部通過：' + failList.join('；')) + '。**' + (origFail.length ? '（對照：原規則以中位數判有 ' + origFail.length + ' 個區間不過：' + origFail.join('；') + '。）' : ''), '');

// 4. 成因分類
L.push('## 4. v0.4 規則下仍比下限快的 seed：成因分類（只報告）', '',
  '分類定義（沿用前一輪說法，這次用逐件重善紀錄驗證）：', '',
  '- **A 跨段低倍率**：區間內（含起點那天）有一件計入的重善在 K<30 時發生、加完後 K≥30，用的是 0≤K<30 段的 ×1（+12）而非 30–100 段的 ×0.75（+9）。',
  '- **B 季末＋下季初連拿**：區間內有兩件相鄰的計入重善分屬相鄰兩季、相隔 <15 wday（gap15 只約束同季）。',
  '- **皆非**：兩者都沒有。', '',
  '| 區間 | 比下限快 | 只有 A | 只有 B | A＋B | 皆非 | 快 seed 的天數 |', '|---|---|---|---|---|---|---|');
const detail = [];
IV.forEach((iv) => {
  const fs_ = P.res[iv.key].fast; const c = { A: 0, B: 0, AB: 0, N: 0 };
  fs_.forEach((x) => { const k = x.c.A && x.c.B ? 'AB' : x.c.A ? 'A' : x.c.B ? 'B' : 'N'; c[k]++; });
  L.push('| ' + iv.name + ' | ' + fs_.length + ' | ' + c.A + ' | ' + c.B + ' | ' + c.AB + ' | ' + c.N + ' | ' + (fs_.length ? fs_.map((x) => x.d).sort((a, b) => a - b).join('、') : '—') + ' |');
  fs_.forEach((x) => detail.push('| ' + iv.name + ' | ' + x.seed + ' | ' + x.d + ' | ' + (x.c.A ? '是（跨 30 後 K＝' + r3(x.c.crossA[0].ka) + '，超出 ' + r3(x.c.overshoot) + '）' : '否') + ' | ' + (x.c.B ? x.c.pairsB.map((p) => 'wday ' + p[0] + '→' + p[1]).join('、') : '否') + ' | ' + x.c.nHeavy + ' |'));
});
L.push('', '基準率（v0.4 規則，所有達成的 seed，不限比下限快者）：同樣的 A／B 定義套到每個 seed 的該區間，看這兩種情形本來有多常見。', '',
  '| 區間 | 達成 seed | 有 A | 有 B | 有 A 或 B | 比下限快者中有 A 或 B |', '|---|---|---|---|---|---|');
IV.forEach((iv) => { const T = P.res[iv.key].all, F = P.res[iv.key].fast; L.push('| ' + iv.name + ' | ' + T.n + ' | ' + T.A + ' | ' + T.B + ' | ' + T.any + ' | ' + F.filter((x) => x.c.A || x.c.B).length + '/' + F.length + ' |'); });
L.push('', '解讀：比下限快的 seed 全都至少有 A 或 B 之一（「皆非」為 0），與前一輪的說法一致；但 A、B 在一般 seed 裡也常見（尤其 B），所以它們說明了快的來源，卻不能單獨決定哪個 seed 會快——快的 seed 是 A／B 再加上重善落點剛好密集。0→30 欄的 A 是區間終點那件重善，本來就該用 ×1，不算異常，列出只為完整。', '');
L.push('', '逐 seed 明細：', '', '| 區間 | seed | 天數 | A 跨段低倍率 | B 跨季連拿（wday） | 區間內計入重善件數 |', '|---|---|---|---|---|---|', ...detail, '');
const nFast = IV.map((iv) => P.res[iv.key].fast.length);
L.push('v0.4 規則下比下限快的 seed 數（−100→0／0→30／30→100／−100→100）：' + nFast.join('／') + '；原規則：' + IV.map((iv) => O.res[iv.key].fast.length).join('／') + '。依 v0.4，這些只作資訊報告，不影響判定。', '');

fs.writeFileSync(path.join(ROOT, 'evidence', 'b1-k1-results.md'), L.join('\n') + '\n');

// CSV：每 seed 每區間天數（兩套規則）
const dir = path.join(ROOT, 'evidence', 'csv-k1'); fs.mkdirSync(dir, { recursive: true });
const rows = ['rule,seed,d_m100_to_0,d_0_to_30,d_30_to_100,d_m100_to_100,d_0_to_100'];
[['orig', O], ['v0.4_gap15', P]].forEach(([nm, R]) => R.perSeed.forEach((r) => rows.push([nm, r.seed, r.m0, r.z30, r.t100, r.m100, r.z100].join(','))));
fs.writeFileSync(path.join(dir, 'K1.csv'), rows.join('\n') + '\n');

console.log(L.join('\n'));
console.log('\n[回歸] ' + (regOK ? '重現' : '不一致'));
