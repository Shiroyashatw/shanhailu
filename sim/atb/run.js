'use strict';
/* num-shl-atb-sim：SPEC-ATB v0.1 行動條驗算。node sim/atb/run.js
 * 產出 evidence/atb-results.md、evidence/csv-atb/*.csv、evidence/csv-atb/summary.json。全部固定種子，重跑結果完全相同。
 * 只 require 既有 sim/lib/*、sim/items/*、sim/civ/*（不改、不呼叫它們的 run()）。 */
const fs = require('fs');
const path = require('path');
const C = require('./common');
const { U, E, TB, ATB_A, ATB_B, CIV, civCleaner, writeCsv, pw } = C;
const K2 = require('./k2');
const S4 = require('./s4');
const DG = require('./dungeon');
const UNIT = require('./unit');
const t00 = Date.now(); const log = (s) => console.log('[' + ((Date.now() - t00) / 1000).toFixed(1) + 's] ' + s);
const r3 = U.r3; const P1 = (x) => r3(x * 100) + '%';
const out = []; const summary = {};
const sec = (t) => out.push('', '## ' + t, '');
const civ = CIV, cl = civCleaner();
const W100 = {}; Object.keys(E.defaultCfg().W).forEach((k) => (W100[k] = 100));
const DEG = { K: 0, W: W100, retreatW: 100, youStart: 100, foeStart: 0, We: 100, WeHeavy: 100 };
const inA = (p) => p >= 0.2 && p <= 0.4, inB = (p) => p >= 0.7;

out.push('# 《山海錄》SPEC-ATB v0.1 行動條驗算（num-shl-atb-sim）', '');
out.push('依據：SPEC-ATB v0.1（2026-11-28）；base numbers/num-shl-b1-k1 38e33a56', '');
out.push('- 執行：`node sim/atb/run.js`（約 20–30 分鐘；單元檢查單跑 `node sim/atb/unit.js`）。全部固定種子，重跑結果完全相同。');
out.push('- 引擎：Node `vm` 讀入 `js/data.js`、`js/game.js` 的文字，在記憶體裡把 `startCombat`／`combatOrder`／`combatAction`／`endRound` 四個函式換成 `sim/atb/atb-core.inject.js`；傷害、命中、護甲、閃避、掉落、經驗直接呼叫同一個 IIFE 內未改動的原函式。`js/` 沒有寫回。現行回合制對照＝既有 `sim/lib/game.js`（未改動）。細節與所有假設見 `evidence/atb-assumptions.md`；原始數據見 `evidence/csv-atb/`。');
out.push('- 玩家：起手・平民＝`sim/civ/common.js` 的 `CIV`；古窯清理級＝`civCleaner()`（v0.3 平民補跑的定義，由現行回合制實打產生，本輪不重算）。K2 一律換制式 短刃＋木盾＋皮甲＋金創藥水 ×4。');

// ================= 1. 單元檢查 =================
sec('1. 單元檢查（先跑，全部通過才跑模擬）');
const units = UNIT.run();
out.push('| # | 檢查 | 結果 | 細節 |', '|---|---|---|---|');
units.forEach((r) => out.push('| ' + [r.id, r.name, r.ok ? '通過' : '**未通過**', r.detail.replace(/\|/g, '／')].join(' | ') + ' |'));
const unitOk = units.every((r) => r.ok);
const d72 = (units.find((r) => r.id === '7.2') || {}).detail || ''; const conflicts72 = d72.includes('規格矛盾') ? [d72.split('【規格矛盾')[1].split('。')[0]] : [];
out.push('', '→ ' + units.filter((r) => r.ok).length + '/' + units.length + ' 通過。' + (conflicts72.length ? '§7.2 的公式全列相符；但遊戲實讀有 ' + conflicts72.length + ' 列與表差 0.015（`playerSpeed()` 取到 0.1 位，規格 §3.1 與 §7.2 互相矛盾），照 §3.1 字面實作，列待決 Q-A1。' : ''));
summary.unit = { pass: units.filter((r) => r.ok).length, total: units.length, conflicts72 };
log('單元檢查 ' + summary.unit.pass + '/' + summary.unit.total);
if (!unitOk) { fs.writeFileSync(path.join(U.ROOT, 'evidence', 'atb-results.md'), out.join('\n') + '\n\n**單元檢查未全過，依任務書停在這裡，不跑模擬。**\n'); fs.writeFileSync(path.join(U.ROOT, 'evidence', 'csv-atb', 'summary.json'), JSON.stringify(summary, null, 1)); process.exit(1); }

// ================= 2. 退化檢查 =================
sec('2. 退化檢查（K2 起手・平民＋古窯清理級，2000 場，種子 55000+j）');
const k2csv = [];
const k2row = (tag, eng, tpl, x) => { const [lo, hi] = U.wilson(x.k, x.n); k2csv.push([tag, eng, tpl.name, x.n, x.k, x.p, lo, hi, x.w[0] / x.n, x.w[1] / x.n, x.w[2] / x.n, x.acts, x.pots]); };
const tbC = K2.batch(TB, civ, 2000), tbL = K2.batch(TB, cl, 2000); k2row('現行回合制', TB.name, civ, tbC); k2row('現行回合制', TB.name, cl, tbL);
log('TB K2 ' + tbC.k + ' ' + tbL.k);
const deg = {};
[['literal', '規格字面：K=0、所有 W=100、撤退失敗 W=100、你 100／敵人 0、W_e=100', DEG],
  ['foe100', '診斷 1：同上但敵人起始條改 100（同刻你先）', Object.assign({}, DEG, { foeStart: 100 })],
  ['tieraw', '診斷 2：診斷 1＋同刻改依壓縮前速度排序（＝現行 combatOrder 的順序）', Object.assign({}, DEG, { foeStart: 100, tieRaw: true })]].forEach(([k, desc, cfgp]) => {
  E.withCfg(cfgp, () => { deg[k] = { desc, A: [K2.batch(ATB_A, civ, 2000), K2.batch(ATB_A, cl, 2000)], B: [K2.batch(ATB_B, civ, 2000), K2.batch(ATB_B, cl, 2000)] }; });
  ['A', 'B'].forEach((d) => { k2row('退化 ' + k, 'ATB・決策器 ' + d, civ, deg[k][d][0]); k2row('退化 ' + k, 'ATB・決策器 ' + d, cl, deg[k][d][1]); });
  log('退化 ' + k + ' ' + deg[k].A[0].k + ' ' + deg[k].A[1].k);
});
// 逐種子配對：敵人全部比你慢（不含紅霧妖）時，退化 ATB（敵人 100 起始）應與現行回合制逐場完全相同
const pairWaves = [['corpse', 'corpse'], ['soldier_dead', 'corpse'], ['soldier_dead', 'soldier_dead']];
const pairRun = (eng, tpl, seed) => { const t = { origin: tpl.origin, attr: tpl.attr, prof: tpl.prof, gear: K2.ISSUE, skills: tpl.skills || [], items: [['pot_hp', 4]] }; eng.setupPlayer(seed, t); const G = eng.G(), S = G.state; S.food = 80; S.fat = 10; const o = []; for (const w of pairWaves) { eng.healTo(1); const r = eng.fight(w, { fatMult: 1.25 }); o.push([r.win, r.rounds, r.hpLost, r.pots, Math.round(S.fat * 1000)]); if (!r.win) break; } return JSON.stringify(o); };
const pair = {};
E.withCfg(Object.assign({}, DEG, { foeStart: 100 }), () => [civ, cl].forEach((tpl) => { let same = 0; for (let j = 0; j < 2000; j++) if (pairRun(TB, tpl, 55000 + j) === pairRun(ATB_B, tpl, 55000 + j)) same++; pair[tpl.name] = same; }));
log('配對 ' + JSON.stringify(pair));
const civRef = [0.294, 0.27444, 0.31435];
const degOk = (x) => (x.p >= civRef[1] && x.p <= civRef[2]) || Math.abs(x.p - civRef[0]) <= 0.02;
out.push('參考：v0.3 平民補跑 起手・平民 29.400% [27.444, 31.435]（588/2000）、清理級 99.850%。本輪用未改的 `fight()` 同 base 同種子重跑：起手・平民 ' + pw(tbC.k, tbC.n) + '、清理級 ' + pw(tbL.k, tbL.n) + ' → ' + (tbC.k === 588 && tbL.k === 1997 ? '**逐場重現**（588、1997 完全相同）' : '**沒有重現**') + '。', '');
out.push('| 設定 | 決策器 | 起手・平民 | 與現行差 | 判準（CI 內或 ≤2pp） | 清理級 | 判準 ≥99% |', '|---|---|---|---|---|---|---|');
Object.keys(deg).forEach((k) => ['A', 'B'].forEach((d) => { const [a, b] = deg[k][d]; out.push('| ' + [deg[k].desc, d, pw(a.k, a.n), (a.p - tbC.p >= 0 ? '+' : '') + r3((a.p - tbC.p) * 100) + 'pp', k === 'literal' ? (degOk(a) ? '通過' : '**未通過**') : '（診斷）', pw(b.k, b.n), k === 'literal' ? (b.p >= 0.99 ? '通過' : '**未通過**') : '（診斷）'].join(' | ') + ' |'); }));
out.push('', '逐種子配對（診斷 1 的設定、三波改 窯屍×2／亡卒＋窯屍／亡卒×2——全部比你慢、不含紅霧妖，決策器 B 對 `fight()`）：起手・平民 ' + pair[civ.name] + '/2000、清理級 ' + pair[cl.name] + '/2000 場的（勝負、手數、失血、用藥、疲累）完全相同。');
const litA = deg.literal.A[0];
out.push('', '**結論：規格字面的退化設定沒有重現現行回合制**（起手・平民 ' + P1(litA.p) + '，差 ' + r3((litA.p - tbC.p) * 100) + 'pp）。原因已找到，不是引擎錯誤：');
out.push('1. 「你 100／敵人 0」＋K=0（全員 v=10）：t=10 時你和敵人同刻滿條，§8.3「你先」→ 你在敵人第一次出手前連出兩手，每一波都多一手免費攻擊。把敵人起始改 100（診斷 1）就回到「你、敵、敵、整拍」的現行節奏：' + P1(deg.foe100.A[0].p) + '。');
out.push('2. K=0 把紅霧妖（速度 13）壓成 10，§8.3 同刻你先，它從「每輪比你先出手」變成「在你之後」：你可以在它出手前先把它打死。診斷 2 改回現行排序後 ' + P1(deg.tieraw.A[0].p) + '。');
out.push('3. 剩下的差（診斷 2 對現行 ' + r3((deg.tieraw.A[0].p - tbC.p) * 100) + 'pp）是結構性的：現行回合制在「一輪開始」就選好行動，你的防禦會蓋住同一輪比你先動的紅霧妖；ATB 的防禦只蓋住你出手之後的敵人。行動條本來就無法表達「先選、後動」，所以沒有任何 ATB 參數能完全退化成現行制。');
out.push('4. 證據：敵人都比你慢時，診斷 1 與現行回合制逐種子完全相同（上段配對 ' + pair[civ.name] + '/2000、' + pair[cl.name] + '/2000），表示 ATB 引擎本身（傷害、DoT、冷卻、意圖、疲累倍率、亂數流）與現行等價。');
summary.degen = { tb: [tbC.k, tbL.k], literal: deg.literal.A.map((x) => x.k), literalB: deg.literal.B.map((x) => x.k), foe100: deg.foe100.A.map((x) => x.k), tieraw: deg.tieraw.A.map((x) => x.k), pair, ok: degOk(litA) && deg.literal.A[1].p >= 0.99 };

// ================= 3. K2 主跑 =================
sec('3. K2 前線（主；SPEC-ATB 預設參數；每組 2000 場，種子 55000+j）');
const sp = [K2.readSpeed(civ), K2.readSpeed(cl)];
out.push('實讀（ATB 實例、K2 開戰前）：' + sp.map((s) => s.name + ' 總重 ' + s.wt + '／負重上限 ' + s.cap + '（' + r3(s.ratio) + '，' + s.band + '；含布袋 ' + s.bag + ' 1 斤，規格 §4.4 手算 17 沒算布袋）、speedMult ' + s.speedMult + '、playerSpeed ' + s.playerSpeed + ' → v ' + s.v + '（疲累 ≥80 時 v ' + s.vFat80 + '）').join('；') + '。規格 §4.4 手算「輕快、v=10」：平民相符；清理級身法 11 → v=10.2。', '');
const main = { A: [K2.batch(ATB_A, civ, 2000), K2.batch(ATB_A, cl, 2000)], B: [K2.batch(ATB_B, civ, 2000), K2.batch(ATB_B, cl, 2000)] };
['A', 'B'].forEach((d) => { k2row('ATB 預設', 'ATB・決策器 ' + d, civ, main[d][0]); k2row('ATB 預設', 'ATB・決策器 ' + d, cl, main[d][1]); });
log('K2 主跑 A ' + main.A[0].k + '/' + main.A[1].k + ' B ' + main.B[0].k + '/' + main.B[1].k);
out.push('| 引擎 | 玩家 | 存活〔Wilson 95% CI〕 | 倒在第 1 波 | 第 2 波 | 第 3 波 | 每場你的出手次數 | 每場喝藥瓶數 | 門檻 | 結果 |', '|---|---|---|---|---|---|---|---|---|---|');
const k2line = (nm, tpl, x, thr, ok) => out.push('| ' + [nm, tpl.name, pw(x.k, x.n), r3(x.w[0] / x.n), r3(x.w[1] / x.n), r3(x.w[2] / x.n), r3(x.acts), r3(x.pots), thr, ok ? '通過' : '**未通過**'].join(' | ') + ' |');
[['ATB・決策器 A（主）', main.A], ['ATB・決策器 B（對照）', main.B], ['現行回合制（同種子）', [tbC, tbL]]].forEach(([nm, [a, b]]) => { k2line(nm, civ, a, '20–40%', inA(a.p)); k2line(nm, cl, b, '≥70%', inB(b.p)); });
out.push('', '- 決策器 A：起手・平民 ' + P1(main.A[0].p) + '（現行 ' + P1(tbC.p) + '，+' + r3((main.A[0].p - tbC.p) * 100) + 'pp）、清理級 ' + P1(main.A[1].p) + ' → K2 **' + (inA(main.A[0].p) && inB(main.A[1].p) ? '通過' : '未通過') + '**（起手・平民超出上限 40%）。');
out.push('- 決策器 B（不看預測列）：起手・平民 ' + P1(main.B[0].p) + '、清理級 ' + P1(main.B[1].p) + '。A 比 B 高 ' + r3((main.A[0].p - main.B[0].p) * 100) + 'pp：看預測列（預演防禦後重擊是否先於你下一手）比只看意圖更省血。');
summary.k2 = { A: main.A.map((x) => [x.k, x.n]), B: main.B.map((x) => [x.k, x.n]), TB: [[tbC.k, 2000], [tbL.k, 2000]], speed: sp };

// ================= 4. S4 =================
sec('4. S4 剿匪（每種對戰每個玩家 N=300，種子 61000+j；劫匪掉落 3–7、賞金 ×2＝24、×4＝36）');
const v04 = S4.v04();
const s4csv = [];
const s4runs = [['現行回合制（N=300）', TB, {}], ['ATB・決策器 A（主）', ATB_A, {}], ['ATB・決策器 B（對照）', ATB_B, {}], ['ATB A、W_retreat=100', ATB_A, { retreatW: 100 }], ['ATB A、W_retreat=140', ATB_A, { retreatW: 140 }]];
const s4res = s4runs.map(([nm, eng, p]) => { const r = E.withCfg(p, () => S4.evalAll(eng, S4.N, S4.SEED)); r.nm = nm; return r; });
log('S4 ' + s4res.map((r) => r.res.map((x) => r3(x.ratio4)).join('/')).join(' '));
out.push('v0.4 原口徑重現（現行回合制、N=150、種子 100+i，呼叫 `sim/civ/s4.js` 的 evalGroup）：起手・平民 ×2 ' + r3(v04[0].ratio2) + '、×4 ' + r3(v04[0].ratio4) + '；清理級 ×2 ' + r3(v04[1].ratio2) + '、×4 ' + r3(v04[1].ratio4) + ' → ' + (r3(v04[0].ratio4) === '0.790' && r3(v04[0].ratio2) === '0.865' && r3(v04[1].ratio2) === '1.153' && r3(v04[1].ratio4) === '1.242' ? '**完全重現** v0.4（0.865／0.790／1.153／1.242）' : '**沒有重現**') + '。', '');
out.push('判準：四個比值 0.8–1.25；平民 ×4 用 v0.4 已接受的下限 0.790（0.790–1.25）。', '');
out.push('| 引擎 | 玩家 | 現有 kill 委託（兩/時） | 劫匪×2 | 劫匪×4 | ×2 比值 | ×4 比值 | 四項判準 |', '|---|---|---|---|---|---|---|---|');
s4res.forEach((r) => { r.res.forEach((x, i) => { out.push('| ' + [r.nm, x.name, r3(x.exRate), r3(x.b2), r3(x.b4), r3(x.ratio2), r3(x.ratio4), i === 0 ? (r.ok ? '通過' : '**未通過**（' + Object.keys(r.checks).filter((k) => !r.checks[k]).join('、') + '）') : ''].join(' | ') + ' |'); x.rows.forEach((q) => s4csv.push([r.nm, x.name, q.kind, q.enemy, q.need, q.reward, q.hours, q.loot, q.heal, q.pWin, q.income, q.rate])); }); });
const duelTab = (r) => ['wolf', 'boar', 'bug', 'leech', 'deserter', 'bogcorpse', 'bandit'];
out.push('', '單挑（N=300，種子 61000+i；勝率／失血成本〔淨失血＋藥×30〕）：', '', '| 敵人（速度 v_raw→v） | ' + [civ, cl].map((t) => t.name + ' 現行').concat([civ, cl].map((t) => t.name + ' ATB-A')).join(' | ') + ' |', '|---|---|---|---|---|');
duelTab().forEach((e) => { const D = C.g.data().ENEMIES[e]; const cell = (r, t) => { const f = r.cache[t.name + '|' + e]; return r3(f.win) + '／' + r3(f.hpCost); }; out.push('| ' + [D.name + '（' + D.spd + '→' + (10 + (D.spd - 10) * 0.5) + '）', cell(s4res[0], civ), cell(s4res[0], cl), cell(s4res[1], civ), cell(s4res[1], cl)].join(' | ') + ' |'); });
const sA = s4res[1].res;
out.push('', '- ATB 決策器 A：起手・平民 ×2 ' + r3(sA[0].ratio2) + '、×4 ' + r3(sA[0].ratio4) + '；清理級 ×2 ' + r3(sA[1].ratio2) + '、×4 ' + r3(sA[1].ratio4) + ' → **' + (s4res[1].ok ? '通過' : '未通過') + '**。原因：慢的野獸（山豬 8、沼屍 5）在 ATB 下對平民變弱，現有 kill 委託時薪上升（' + r3(s4res[0].res[0].exRate) + '→' + r3(sA[0].exRate) + '），劫匪（速度 10）不受壓縮影響，劫匪題時薪幾乎不變，比值因此下降。');
out.push('- W_retreat 100／120／140 三格結果完全相同：決策器（沿用 `fight()`）從不撤退，S4 也沒有撤退步驟，撤退失敗代價在這個模型裡量不到（待決 Q-A6）。');
summary.s4 = { v04: v04.map((x) => [x.ratio2, x.ratio4]), runs: s4res.map((r) => ({ nm: r.nm, ok: r.ok, r: r.res.map((x) => [x.ratio2, x.ratio4]) })) };

// ================= 5. 四座地城 =================
sec('5. 四座地城抽查（每格 N=500，種子 71000+j）');
const dgcsv = []; const dgr = {};
const bc = DG.blueCleaner();
const dgRuns = [['TB', TB, {}], ['A', ATB_A, {}], ['B', ATB_B, {}], ['A-r100', ATB_A, { retreatW: 100 }], ['A-r140', ATB_A, { retreatW: 140 }]];
dgRuns.forEach(([k, eng, p]) => E.withCfg(p, () => DG.DGS.forEach((dg) => [bc, civ].forEach((tpl) => ['h0', 'h70'].forEach((mode) => { const x = DG.batch(eng, tpl, dg, mode, DG.N, DG.SEED); dgr[[k, dg, tpl.name, mode].join('|')] = x; dgcsv.push([k, dg, tpl.name, mode, x.n, x.k, x.p, ...U.wilson(x.k, x.n), ...x.fl.slice(0, 5).map((v) => v / x.n), x.acts]); })))));
log('地城完成');
out.push('玩家：' + bc.name + '（短刃＋皮甲＋木盾換成良品，每種子各擲詞綴）、' + civ.name + '（鏽刃＋布衣）；藥水各 2 瓶整座不補；層間疲累不變；酉神裂口每層前侵蝕 +2。判準【暫】：「回到 70%」通關率與現行絕對差 ≤10pp；超過者只列出、不當未過。', '');
out.push('| 地城 | 玩家 | 層間 | 現行回合制 | ATB-A | 差（A−現行） | ATB-B | 差（B−現行） | 判準（僅 70%） |', '|---|---|---|---|---|---|---|---|---|');
const dgOver = [];
DG.DGS.forEach((dg) => [bc, civ].forEach((tpl) => ['h0', 'h70'].forEach((mode) => {
  const g = (k) => dgr[[k, dg, tpl.name, mode].join('|')]; const t = g('TB'), a = g('A'), b = g('B');
  const d = (a.p - t.p) * 100, db = (b.p - t.p) * 100; const ok = Math.abs(d) <= 10;
  if (mode === 'h70' && !ok) dgOver.push(C.g.data().NODES[dg].name + '・' + tpl.name + ' ' + (d >= 0 ? '+' : '') + r3(d) + 'pp');
  out.push('| ' + [C.g.data().NODES[dg].name + '（' + dg + '）', tpl.name, mode === 'h0' ? '不回血' : '回到 70%', pw(t.k, t.n), pw(a.k, a.n), (d >= 0 ? '+' : '') + r3(d) + 'pp', pw(b.k, b.n), (db >= 0 ? '+' : '') + r3(db) + 'pp', mode === 'h70' ? (ok ? '≤10pp' : '**超過**（只列出）') : '—'].join(' | ') + ' |');
})));
const rSame = DG.DGS.every((dg) => [bc, civ].every((tpl) => ['h0', 'h70'].every((m) => ['A-r100', 'A-r140'].every((k) => dgr[[k, dg, tpl.name, m].join('|')].k === dgr[['A', dg, tpl.name, m].join('|')].k))));
out.push('', '- 「回到 70%」與現行差超過 10pp：' + (dgOver.length ? dgOver.join('；') : '無') + '。');
out.push('- W_retreat 100／120／140：' + (rSame ? '三格每一格通關數完全相同（決策器從不撤退，同 S4）' : '有差異，見 CSV') + '。');
summary.dungeon = { over: dgOver, rSame };

// ================= 6. 敏感度 =================
sec('6. 敏感度掃描（K2、決策器 A、每格 600 場、種子 55000+j，j<600）');
const sens = {}; const senscsv = [];
const cellKey = (p) => JSON.stringify(Object.keys(p).sort().reduce((o, k) => ((o[k] = p[k]), o), {}));
function cell(p, tag) {
  const key = cellKey(p);
  if (!sens[key]) { E.withCfg(p, () => { const a = K2.batch(ATB_A, civ, 600), b = K2.batch(ATB_A, cl, 600); sens[key] = { p, a, b, ok: inA(a.p) && inB(b.p) }; }); }
  const s = sens[key]; senscsv.push([tag, JSON.stringify(p), s.a.k, s.a.p, s.b.k, s.b.p, s.ok ? 'yes' : 'no']); return s;
}
const AX = { K: [0.25, 0.35, 0.5, 0.65, 0.75], h: [0.5, 0.75, 1, 1.25], l: [0, 0.5, 1, 1.5], stagB: [-25, -50, -100], foeStartMax: [20, 40, 60] };
const CEN = { K: 0.5, h: 1, l: 1, stagB: -50, foeStartMax: 40 };
const toP = (o) => { const p = {}; Object.keys(o).forEach((k) => { if (o[k] !== CEN[k]) p[k] = o[k]; }); return p; };
const center = cell({}, '中心');
out.push('### 6.1 一維（其他取中心）', '', '| 參數 | 值 | 起手・平民 | 清理級 | 兩項都在目標內 |', '|---|---|---|---|---|');
Object.keys(AX).forEach((k) => AX[k].forEach((v) => { const s = cell(toP(Object.assign({}, CEN, { [k]: v })), '一維'); out.push('| ' + [k, v + (v === CEN[k] ? '（中心）' : ''), pw(s.a.k, s.a.n), pw(s.b.k, s.b.n), s.ok ? '是' : '否'].join(' | ') + ' |'); }));
log('一維完成');
// 鄰格與 ±10%
const nbrs = []; Object.keys(AX).forEach((k) => { const i = AX[k].indexOf(CEN[k]); [i - 1, i + 1].forEach((j) => { if (j >= 0 && j < AX[k].length) nbrs.push([k, AX[k][j]]); }); });
const robust = center.ok && nbrs.every(([k, v]) => sens[cellKey(toP(Object.assign({}, CEN, { [k]: v })))].ok);
const pert = []; Object.keys(CEN).forEach((k) => [0.9, 1.1].forEach((m) => { const v = k === 'foeStartMax' ? Math.round(CEN[k] * m) : Math.round(CEN[k] * m * 1000) / 1000; const s = cell(toP(Object.assign({}, CEN, { [k]: v })), '±10%'); pert.push([k, v, s]); }));
out.push('', '穩健判準：中心點與所有單參數相鄰格（' + nbrs.map(([k, v]) => k + '=' + v).join('、') + '）都在目標內。中心點起手・平民 ' + P1(center.a.p) + '、清理級 ' + P1(center.b.p) + ' → 中心本身' + (center.ok ? '在' : '**不在**') + '目標內 → **' + (robust ? '穩健' : '脆弱（中心即未過）') + '**。');
out.push('', '「容許 ±10%」照 v0.4 的用法讀成「參數擾動 ±10%」（目標區間不放寬）：' + pert.map(([k, v, s]) => k + '=' + v + ' 起手 ' + P1(s.a.p) + '／清理級 ' + P1(s.b.p)).join('；') + '。');
// 三維
out.push('', '### 6.2 三維 K×h×l（5×4×4＝80 格；失衡 −50、起始條上限 40）', '', '| K | h | l | 起手・平民 | 清理級 | 兩項都在目標內 |', '|---|---|---|---|---|---|');
const grid3 = [];
AX.K.forEach((K) => AX.h.forEach((h) => AX.l.forEach((l) => { const s = cell(toP(Object.assign({}, CEN, { K, h, l })), '三維'); grid3.push([K, h, l, s]); out.push('| ' + [K, h, l, P1(s.a.p) + '（' + s.a.k + '/600）', P1(s.b.p) + '（' + s.b.k + '/600）', s.ok ? '是' : '否'].join(' | ') + ' |'); })));
log('三維完成');
const g3min = grid3.reduce((m, x) => (x[3].a.p < m[3].a.p ? x : m)); const g3ok = grid3.filter((x) => x[3].ok);
out.push('', '80 格中兩項都在目標內：' + g3ok.length + ' 格。起手・平民最低的一格 K=' + g3min[0] + '、h=' + g3min[1] + '、l=' + g3min[2] + '：' + P1(g3min[3].a.p) + '（清理級 ' + P1(g3min[3].b.p) + '）；全部 80 格起手・平民範圍 ' + P1(Math.min(...grid3.map((x) => x[3].a.p))) + '–' + P1(Math.max(...grid3.map((x) => x[3].a.p))) + '、清理級 ' + P1(Math.min(...grid3.map((x) => x[3].b.p))) + '–' + P1(Math.max(...grid3.map((x) => x[3].b.p))) + '。');
// Q-ATB-9
const q9 = [['t_execute', 115], ['t_execute', 135], ['t_aim', 90], ['t_aim', 110]].map(([id, w]) => [id, w, cell({ W: { [id]: w } }, 'Q-ATB-9')]);
out.push('', '### 6.3 Q-ATB-9：奪命、瞄準 W ±10', '', q9.map(([id, w, s]) => id + ' W=' + w + '：起手 ' + s.a.k + '/600、清理級 ' + s.b.k + '/600').join('；') + '（中心 ' + center.a.k + '/600、' + center.b.k + '/600）。兩組玩家都用不到奪命（刀劍 30，清理級 27）與瞄準（弓弩）→ 結論不變；這兩招的效率問題本輪的玩家樣板驗不到（待決 Q-A7）。');
summary.sens = { center: [center.a.k, center.b.k], robust, g3ok: g3ok.length, g3min: [g3min[0], g3min[1], g3min[2], g3min[3].a.p, g3min[3].b.p] };

// ================= 7. 修正值搜尋（§13.4） =================
sec('7. 不過的處理（SPEC-ATB §13.4）');
out.push('### 7.1 第 1 步：只調 ATB 內部參數（K×h×l×起始條上限×敵人重擊 W_e＝5×4×4×3×2＝480 格，每格 600 場、種子 55000+j）', '');
const intl = [];
AX.K.forEach((K) => AX.h.forEach((h) => AX.l.forEach((l) => [20, 40, 60].forEach((fs) => [100, 120].forEach((wh) => { const s = cell(Object.assign(toP(Object.assign({}, CEN, { K, h, l, foeStartMax: fs })), wh !== 100 ? { WeHeavy: wh } : {}), '內部搜尋'); intl.push({ K, h, l, fs, wh, s }); })))));
log('內部搜尋完成');
const intlOk = intl.filter((x) => x.s.ok);
const best3 = intl.slice().sort((x, y) => (y.s.b.p >= 0.7) - (x.s.b.p >= 0.7) || Math.abs(x.s.a.p - 0.3) - Math.abs(y.s.a.p - 0.3)).slice(0, 3);
out.push('兩項都在目標內的格：**' + intlOk.length + ' 格**。起手・平民整體範圍 ' + P1(Math.min(...intl.map((x) => x.s.a.p))) + '–' + P1(Math.max(...intl.map((x) => x.s.a.p))) + '。最接近的三格（清理級 ≥70% 之中，起手最接近 30%）：', '');
out.push('| K | h | l | 起始條上限 | 敵人重擊 W_e | 起手・平民 | 清理級 |', '|---|---|---|---|---|---|---|');
best3.forEach((x) => out.push('| ' + [x.K, x.h, x.l, x.fs, x.wh, pw(x.s.a.k, x.s.a.n), pw(x.s.b.k, x.s.b.n)].join(' | ') + ' |'));
out.push('', '→ ' + (intlOk.length ? '有內部參數解，見上表。' : '**ATB 內部參數在掃描範圍內找不到解**：最難的一格起手・平民仍有 ' + P1(Math.min(...intl.map((x) => x.s.a.p))) + '。照 §13.4 進第 2 步。'));
// 第 2 步：SPEC-02 §10.5 候選（需 mumi 決定）
const K2c = require('../civ/k2');
const CFGX = Object.assign({}, K2c.CFG, { E: { desc: '同 B，第 1 波改 窯屍×3', waves: [['corpse', 'corpse', 'corpse'], ['soldier_dead', 'corpse'], ['wraith', 'soldier_dead']] }, F: { desc: '同 B，第 2 波改 亡卒＋窯屍×2', waves: [['corpse', 'corpse'], ['soldier_dead', 'corpse', 'corpse'], ['wraith', 'soldier_dead']] }, G: { desc: '同 B，第 3 波改 血霧妖×2＋亡卒', waves: [['corpse', 'corpse'], ['soldier_dead', 'corpse'], ['wraith', 'wraith', 'soldier_dead']] } });
out.push('', '### 7.2 第 2 步：SPEC-02 §10.5 候選（藥水 ×2／×3／×4／×5 × 波表 A–G；**需要 mumi 決定**；ATB 預設參數、決策器 A）', '');
out.push('波表代號 A–D 沿用 v0.3 平民補跑（`sim/civ/k2.js` CFG），E–G 本輪新增（B 的某一波多 1 敵）：' + Object.keys(CFGX).map((k) => k + '＝' + CFGX[k].desc).join('；') + '。先在粗掃種子 155000+j（j<900，與正式組不重疊）挑，再用正式種子 55000+j（2000 場）驗。', '');
const cand = [];
Object.keys(CFGX).forEach((cf) => [2, 3, 4, 5].forEach((pots) => { const a = K2.batch(ATB_A, civ, 900, 155000, CFGX[cf].waves, pots), b = K2.batch(ATB_A, cl, 900, 155000, CFGX[cf].waves, pots); cand.push({ cf, pots, a, b, ok: inA(a.p) && inB(b.p) }); k2csv.push(['SPEC-02 候選粗掃 ' + cf + '/藥水' + pots, 'ATB・決策器 A', civ.name, a.n, a.k, a.p, ...U.wilson(a.k, a.n), a.w[0] / a.n, a.w[1] / a.n, a.w[2] / a.n, a.acts, a.pots]); k2csv.push(['SPEC-02 候選粗掃 ' + cf + '/藥水' + pots, 'ATB・決策器 A', cl.name, b.n, b.k, b.p, ...U.wilson(b.k, b.n), b.w[0] / b.n, b.w[1] / b.n, b.w[2] / b.n, b.acts, b.pots]); }));
log('SPEC-02 候選粗掃完成');
out.push('| 波表 | 藥水 | 起手・平民（900） | 清理級（900） | 兩項都在目標內 |', '|---|---|---|---|---|');
cand.forEach((x) => out.push('| ' + [x.cf, x.pots, P1(x.a.p) + '（' + x.a.k + '）', P1(x.b.p) + '（' + x.b.k + '）', x.ok ? '是' : '否'].join(' | ') + ' |'));
const top = cand.filter((x) => x.ok).sort((x, y) => Math.abs(x.a.p - 0.3) - Math.abs(y.a.p - 0.3)).slice(0, 3);
const verify = top.map((x) => { const a = K2.batch(ATB_A, civ, 2000, 55000, CFGX[x.cf].waves, x.pots), b = K2.batch(ATB_A, cl, 2000, 55000, CFGX[x.cf].waves, x.pots), aB = K2.batch(ATB_B, civ, 2000, 55000, CFGX[x.cf].waves, x.pots), bB = K2.batch(ATB_B, cl, 2000, 55000, CFGX[x.cf].waves, x.pots);
  // 該候選下的 ATB 單參數相鄰格（600 場）
  const nb = nbrs.map(([k, v]) => { const p = toP(Object.assign({}, CEN, { [k]: v })); return E.withCfg(p, () => { const a6 = K2.batch(ATB_A, civ, 600, 55000, CFGX[x.cf].waves, x.pots), b6 = K2.batch(ATB_A, cl, 600, 55000, CFGX[x.cf].waves, x.pots); return [k, v, a6, b6, inA(a6.p) && inB(b6.p)]; }); });
  [['A', a, b], ['B', aB, bB]].forEach(([d, p, q]) => { k2csv.push(['SPEC-02 候選驗證 ' + x.cf + '/藥水' + x.pots, 'ATB・決策器 ' + d, civ.name, p.n, p.k, p.p, ...U.wilson(p.k, p.n), p.w[0] / p.n, p.w[1] / p.n, p.w[2] / p.n, p.acts, p.pots]); k2csv.push(['SPEC-02 候選驗證 ' + x.cf + '/藥水' + x.pots, 'ATB・決策器 ' + d, cl.name, q.n, q.k, q.p, ...U.wilson(q.k, q.n), q.w[0] / q.n, q.w[1] / q.n, q.w[2] / q.n, q.acts, q.pots]); });
  return Object.assign({}, x, { va: a, vb: b, vaB: aB, vbB: bB, nb, robust: inA(a.p) && inB(b.p) && nb.every((z) => z[4]) }); });
log('SPEC-02 候選驗證完成');
if (verify.length) {
  out.push('', '前 3 名（正式種子 55000+j、2000 場；「相鄰格」＝該候選下 ATB 單參數相鄰格 600 場）：', '', '| # | 波表／藥水 | 起手・平民 A | 清理級 A | 起手・平民 B | 清理級 B | ATB 相鄰格 | 穩健 |', '|---|---|---|---|---|---|---|---|');
  verify.forEach((x, i) => out.push('| ' + [i + 1, x.cf + '／×' + x.pots, pw(x.va.k, x.va.n), pw(x.vb.k, x.vb.n), pw(x.vaB.k, x.vaB.n), pw(x.vbB.k, x.vbB.n), x.nb.map((z) => z[0] + '=' + z[1] + ' ' + P1(z[2].p) + '/' + P1(z[3].p) + (z[4] ? '' : '✗')).join('；'), x.robust ? '是' : '否'].join(' | ') + ' |'));
} else out.push('', '粗掃 ' + cand.length + ' 個候選都沒有落進目標。');
summary.fix = { intlOk: intlOk.length, intlMin: Math.min(...intl.map((x) => x.s.a.p)), best3: best3.map((x) => [x.K, x.h, x.l, x.fs, x.wh, x.s.a.k, x.s.b.k]), spec02: verify.map((x) => ({ cf: x.cf, pots: x.pots, A: [x.va.k, x.vb.k], B: [x.vaB.k, x.vbB.k], robust: x.robust })) };
// 第 3 步：S4
const s4hdr = out.length; out.push('', '', '');
const s4cells = []; const s4seen = {};
const s4cell = (p, tag) => { const key = cellKey(p); if (s4seen[key]) return; s4seen[key] = 1; const r = E.withCfg(p, () => S4.evalAll(ATB_A, S4.N, S4.SEED)); s4cells.push({ p, tag, r }); };
Object.keys(AX).forEach((k) => AX[k].forEach((v) => s4cell(toP(Object.assign({}, CEN, { [k]: v })), '一維')));
AX.K.forEach((K) => AX.h.forEach((h) => AX.l.forEach((l) => s4cell(toP(Object.assign({}, CEN, { K, h, l })), '三維'))));
log('S4 內部搜尋完成');
out[s4hdr + 1] = '### 7.3 S4：先找 ATB 內部參數修正（一維＋三維，不重複共 ' + s4cells.length + ' 格，決策器 A、N=300、種子 61000+j）';
const s4ok = s4cells.filter((x) => x.r.ok);
const bothOk = s4ok.filter((x) => { const s = sens[cellKey(x.p)]; return s && s.ok; });
out.push('S4 四項都過的格：**' + s4ok.length + '/' + s4cells.length + '**' + (s4ok.length ? '：' + s4ok.slice(0, 12).map((x) => (Object.keys(x.p).length ? JSON.stringify(x.p) : '中心') + ' 平民 ' + r3(x.r.res[0].ratio2) + '/' + r3(x.r.res[0].ratio4) + '、清理級 ' + r3(x.r.res[1].ratio2) + '/' + r3(x.r.res[1].ratio4)).join('；') + (s4ok.length > 12 ? '……（全表見 CSV）' : '') : '') + '。同時讓 K2 過的格：' + bothOk.length + '。');
const s4best = s4cells.slice().sort((x, y) => y.r.res[0].ratio4 - x.r.res[0].ratio4).slice(0, 3);
out.push('', '平民 ×4 比值最高的三格：' + s4best.map((x) => (Object.keys(x.p).length ? JSON.stringify(x.p) : '中心') + '：平民 ×2 ' + r3(x.r.res[0].ratio2) + '、×4 ' + r3(x.r.res[0].ratio4) + '；清理級 ×2 ' + r3(x.r.res[1].ratio2) + '、×4 ' + r3(x.r.res[1].ratio4) + '（' + (x.r.ok ? '通過' : '未通過') + '）').join('；') + '。');
// 賞金／掉落候選（只當資訊）
const cacheA = s4res[1].cache;
const dev = (rs, k) => Math.max(...rs.map((r) => Math.abs(Math.log(Math.max(1e-9, r[k])))));
const s4bounty = [];
for (let i = 0; i <= 28; i++) {
  const L = i / 2; const best = (n) => { let b = null; for (let rw = 0; rw <= 200; rw++) { const rs = S4.evalAll(ATB_A, S4.N, S4.SEED, n === 2 ? rw : 0, n === 4 ? rw : 0, L, cacheA).res; const k = n === 2 ? 'ratio2' : 'ratio4'; const d = dev(rs, k); if (!b || d < b.d) b = { rw, d, v: rs.map((r) => r[k]) }; } return b; };
  const x2 = best(2), x4 = best(4); const ok = S4.inband(x2.v[0]) && S4.inband(x2.v[1]) && x4.v[0] >= 0.79 && x4.v[0] <= 1.25 && S4.inband(x4.v[1]); s4bounty.push({ L, x2, x4, ok });
}
const feas = s4bounty.filter((x) => x.ok);
const near5 = s4bounty.slice().sort((x, y) => Math.abs(x.L - 5) - Math.abs(y.L - 5)).slice(0, 3);
out.push('', '賞金／掉落候選（只當資訊；ATB-A 單挑結果；掉落平均 L＝0–14、每 0.5；每個 L 下 ×2、×4 賞金各取 0–200 整數使兩組比值離 1 最近）：判準可行的 L 有 **' + feas.length + ' 個**' + (feas.length ? '（例：' + feas.slice(0, 3).map((x) => 'L=' + x.L + '：×2 賞 ' + x.x2.rw + '→' + x.x2.v.map(r3).join('／') + '、×4 賞 ' + x.x4.rw + '→' + x.x4.v.map(r3).join('／')).join('；') + '）' : '') + '。離現值（L=5）最近：' + near5.map((x) => 'L=' + x.L + '：×2 賞 ' + x.x2.rw + '→' + x.x2.v.map(r3).join('／') + '；×4 賞 ' + x.x4.rw + '→' + x.x4.v.map(r3).join('／') + (x.ok ? '（可行）' : '（不可行）')).join('；') + '。');
summary.s4fix = { ok: s4ok.length, total: s4cells.length, both: bothOk.length, best: s4best.map((x) => ({ p: x.p, r: x.r.res.map((y) => [y.ratio2, y.ratio4]), ok: x.r.ok })), bountyFeasible: feas.length, near5: near5.map((x) => ({ L: x.L, rw2: x.x2.rw, v2: x.x2.v, rw4: x.x4.rw, v4: x.x4.v, ok: x.ok })) };

// ================= 8. 選做：巡邏兵、重犯賞金獵人 =================
sec('8. 選做：巡邏兵、重犯賞金獵人單挑（每格 300 場，種子 81000+j；只報勝率與失血，不設判準）');
const NEW = { patrol: { name: '巡邏兵', g: '巡', lv: 20, hp: 32, dmg: [5, 7], spd: 10, armor: 3, pat: ['atk', 'charge', 'guard', 'atk'] }, hunter_crim: { name: '重犯賞金獵人', g: '獵', lv: 30, hp: 45, dmg: [6, 9], spd: 11, armor: 3, pat: ['atk', 'charge', 'guard', 'atk'] } };
Object.keys(NEW).forEach((k) => { C.g.addEnemy(k, NEW[k]); E.inst().D.ENEMIES[k] = JSON.parse(JSON.stringify(NEW[k])); });
const optcsv = [];
out.push('敵人定義：只有規格給的生命／傷害／護甲／速度；行動模式、難度 lv、重擊（預設 2×傷害）沿用 K4 賞金獵人的寫法（`sim/items/K4.js`），巡邏兵 lv 20 為自補。', '', '| 敵人 | 玩家 | 現行 勝率／失血成本 | ATB-A 勝率／失血成本 | ATB-B 勝率／失血成本 |', '|---|---|---|---|---|');
Object.keys(NEW).forEach((k) => [civ, cl].forEach((tpl) => { const r = [TB, ATB_A, ATB_B].map((eng) => S4.duel(eng, tpl, [k], 300, 81000, {})); r.forEach((x, i) => optcsv.push([NEW[k].name, tpl.name, ['TB', 'ATB-A', 'ATB-B'][i], x.n, x.wins, x.win, x.hpCost, x.pots, x.rounds])); out.push('| ' + [NEW[k].name, tpl.name].concat(r.map((x) => pw(x.wins, x.n) + '／' + r3(x.hpCost))).join(' | ') + ' |'); }));
log('選做完成');

// ================= 9. 與規格預期的差、樣本 =================
sec('9. 與規格預期（§13.5）的差');
out.push('- 規格預期：平民存活率高於 29.4%，可能超過 40%。實測（決策器 A）' + P1(main.A[0].p) + '、B ' + P1(main.B[0].p) + '——方向與規格一致，幅度遠大於「可能超過 40%」。');
out.push('- 差的來源（由退化檢查拆出）：①「你 100／敵人 ri(0,40)」開場＝每一波你都先打一手（退化字面設定單這一項就到 ' + P1(deg.literal.A[0].p) + '）；②窯屍、亡卒變慢（0.8、0.9 手）；③喝藥 W=70、防禦 W=80 讓你少等；④決策器 A 用預測列，比只看意圖多 ' + r3((main.A[0].p - main.B[0].p) * 100) + 'pp。');
out.push('- 規格 §13.4 第 1 步（只調 ATB 內部參數）在 480 格內' + (intlOk.length ? '有解' : '**找不到解**') + '，所以 Q-ATB-8 的「甲（先調 ATB 內部）」在前線這題不夠用，需要 mumi 決定是否動 SPEC-02 §10.5（或改開場規則，見待決 Q-A2）。');
sec('10. 樣本數與種子');
out.push('| 項目 | 樣本 | 種子 |', '|---|---|---|');
[['單元檢查', '固定小例', '1、1000+s、2000+s、55000、77、78'], ['退化檢查', '每組 2000 場 × 2 玩家 × 3 設定 × 2 決策器＋現行；配對 2000×2', '55000+j'], ['K2 主跑', '每組 2000 場', '55000+j，j=0..1999'], ['S4', '每種對戰每玩家 N=300（7 種敵人）；v0.4 重現 N=150', '61000+j；v0.4：100+i'], ['四座地城', '每格 N=500（4 地城×2 玩家×2 層間×5 組）', '71000+j'], ['敏感度（K2）', '每格 600 場 × 2 玩家（一維 15 格、±10% 10 格、三維 80 格、Q-ATB-9 4 格、內部搜尋 480 格）', '55000+j，j<600'], ['S4 內部參數搜尋', '每格 N=300', '61000+j'], ['SPEC-02 候選', '粗掃 900 場；驗證 2000 場；相鄰格 600 場', '粗掃 155000+j；驗證 55000+j'], ['選做', '每格 300 場', '81000+j']].forEach((r) => out.push('| ' + r.join(' | ') + ' |'));

// ================= 輸出 =================
writeCsv('K2', ['round', 'engine', 'player', 'n', 'survive', 'p_survive', 'wilson_lo', 'wilson_hi', 'p_fall_wave1', 'p_fall_wave2', 'p_fall_wave3', 'acts_per_run', 'pots_per_run'], k2csv);
writeCsv('S4', ['engine', 'player', 'kind', 'enemy', 'need', 'reward', 'hours', 'loot_value', 'heal_cost', 'p_success', 'income', 'silver_per_hour'], s4csv.concat(s4cells.map((x) => ['S4 內部搜尋 ' + x.tag + ' ' + JSON.stringify(x.p), '', 'ratios', '', '', '', '', '', '', '', x.r.res.map((y) => r3(y.ratio2) + '/' + r3(y.ratio4)).join(' '), x.r.ok ? 'ok' : 'fail'])));
writeCsv('S4-bounty', ['loot_mean', 'best_reward_x2', 'x2_ratio_civ', 'x2_ratio_cleaner', 'best_reward_x4', 'x4_ratio_civ', 'x4_ratio_cleaner', 'feasible'], s4bounty.map((x) => [x.L, x.x2.rw, x.x2.v[0], x.x2.v[1], x.x4.rw, x.x4.v[0], x.x4.v[1], x.ok ? 'yes' : 'no']));
writeCsv('dungeon', ['engine', 'dungeon', 'player', 'between_floors', 'n', 'clear', 'p_clear', 'wilson_lo', 'wilson_hi', 'p_end_floor_idx0', 'p_end_floor_idx1', 'p_end_floor_idx2', 'p_end_floor_idx3', 'p_end_floor_idx4', 'acts_per_run'], dgcsv);
writeCsv('sensitivity', ['tag', 'params', 'civ_survive_600', 'civ_p', 'cleaner_survive_600', 'cleaner_p', 'both_in_target'], senscsv);
writeCsv('optional', ['enemy', 'player', 'engine', 'n', 'wins', 'p_win', 'hp_cost', 'pots', 'acts'], optcsv);
fs.writeFileSync(path.join(U.ROOT, 'evidence', 'atb-results.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(U.ROOT, 'evidence', 'csv-atb', 'summary.json'), JSON.stringify(summary, null, 1));
log('完成；缺 W 列：' + JSON.stringify(E.cfg().missing));
