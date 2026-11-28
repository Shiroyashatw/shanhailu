'use strict';
/* num-shl-b1-civ：開局只剩「平民」一張路線卡的補跑。node sim/civ/run.js
 * 產出 evidence/b1-civ-results.md 與 evidence/csv-civ/*.csv。全部固定 seed，重跑結果完全相同。
 * 只 require 前一輪（num-shl-b1-sim e76bf931）的 sim/lib/*、sim/items/*，不改動、不呼叫它們的 run()（那會覆寫 evidence/csv/）。 */
const fs = require('fs');
const path = require('path');
const { U, P, CIV, civCleaner } = require('./common');
const t00 = Date.now(); const log = (s) => console.log('[' + ((Date.now() - t00) / 1000).toFixed(1) + 's] ' + s);
const K2 = require('./k2'), S4 = require('./s4');
const out = [];
out.push('# 《山海錄》第一批驗算補跑：開局只剩「平民」一張路線卡（num-shl-b1-civ）', '');
out.push('依據：num-shl-b1-sim e76bf931 的 sim/ 與 evidence/；起手＝平民（素質全 10、熟練度 0、數值沿用流民）。', '');
out.push('- 執行：`node sim/civ/run.js`。戰鬥決策器、亂數、場數、地點、失血換算一律沿用前一輪（`sim/lib/*`、`sim/items/*` 沒有改動；本輪只新增 `sim/civ/`）。');
out.push('- 起手・平民＝`data.js:529` 的 `drifter`（`attr:{}`、`prof:{}`、鏽刃＋布衣、60 兩；行囊 金創藥水×2、乾餅×2），與前一輪 `P.starters()[5]`（起手・流民）是同一個樣板。古窯清理級・平民＝前一輪 `P.cleaners()[5]`，直接取用。');
out.push('- 只重跑 K2、S4（必跑）與 K4、K5、K7、B1（補充）；其餘項目照前一輪，不重跑。所有【假設】與本輪的建模選擇、待決問題見 `evidence/b1-civ-assumptions.md`；原始數據見 `evidence/csv-civ/`。', '');
const section = (title, lines) => { out.push('## ' + title, ''); let inT = false; lines.forEach((l) => { const isT = l.startsWith('|'); if (isT && !inT && out[out.length - 1] !== '') out.push(''); if (!isT && inT && l !== '') out.push(''); inT = isT; out.push(l); }); out.push(''); };

// ---------- 回歸檢查 ----------
const cache = {};
const regK2 = K2.regression(); log('K2 回歸 ' + (regK2.ok ? 'OK' : 'FAIL'));
const regS4 = S4.regression(cache); log('S4 回歸 ' + (regS4.ok ? 'OK' : 'FAIL'));
const reg = regK2.rows.concat(regS4.rows);
const regTable = () => ['| 檢查 | 前一輪的值 | 本輪重算 | 重現 |', '|---|---|---|---|'].concat(reg.map((r) => '| ' + [r[0], r[1], r[2], r[3] ? '是' : '**否**'].join(' | ') + ' |'));
const finish = () => { fs.mkdirSync(path.join(U.ROOT, 'evidence'), { recursive: true }); fs.writeFileSync(path.join(U.ROOT, 'evidence', 'b1-civ-results.md'), out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'); };
if (!(regK2.ok && regS4.ok)) {
  section('回歸檢查：**重現失敗，已停止**', regTable().concat(['', '必做的回歸檢查沒有重現前一輪的數字，後面的項目沒有跑。']));
  finish(); console.error('回歸檢查失敗，停止。'); process.exit(2);
}
// ---------- 各項 ----------
const k2 = K2.run(); log('K2 完成');
const s4 = S4.run(cache); log('S4 完成');
const k4 = require('./k4').run(); log('K4 完成');
const k5 = require('./k5').run(cache); log('K5 完成');
const k7 = require('./k7').run(); log('K7 完成');
const b1 = require('./b1').run(); log('B1 完成');
reg.push(k7.reg, b1.reg, ['K5 財庫（與玩家無關）第 60 日實付平均', '300.977', U.r3(U.mean(k5.t60.paid)), U.r3(U.mean(k5.t60.paid)) === '300.977']);
const regAll = reg.every((r) => r[3]);
section('回歸檢查：' + (regAll ? '全部重現' : '**有項目未重現**'), regTable().concat(['', '前三列是任務書指定的必做檢查（同種子 55000+j、j=0..499、同場數 500）；其餘是順手加的：用本輪照抄的函式、前一輪的口徑（六種出身／行商）重算，確認照抄沒有走樣。']));
const d = [CIV, civCleaner()].map((t) => P.describe(t));
section('兩個平民樣板的面板（各自原本的裝備）', ['| 樣板 | 素質（體 膂 身 靈 心 悟 口） | 熟練度 | 生命 | 傷害 | 護甲 | 命中 | 閃避 | 裝備 | 招式 |', '|---|---|---|---|---|---|---|---|---|---|'].concat(d.map((x) => '| ' + [x.name, x.attr.replace(/[^\d ]/g, ''), x.prof || '—', x.hp, x.dmg, x.armor, x.hit + '%', x.dodge + '%', x.gear, x.skills || '—'].join(' | ') + ' |')));
const v = U.verdict;
const pc = (x) => U.r3(x * 100) + '%';
section('K2 前線三波勝率（必跑）', ['SPEC-02 門檻：起手（＝平民）三波存活 20–40%（目標約 30%）；古窯清理級 ≥70%。', ''].concat(k2.lines));
section('S4 剿匪委託報酬（必跑）', ['通過條件不變：×2、×4 各對兩組，四個比值都在 0.8–1.25。條件沿用前一輪（每頭 1h 搜尋、地點表、R_wild=1.042、藥錢照算、現有 kill 委託 8 張時間加權平均作分母）。兩組都是平民單一。', ''].concat(s4.lines));
section('K4 賞金獵人（補充，不計入原 25 項通過數）', k4.lines);
section('K5 銀兩曲線與財庫（補充，不計入原 25 項通過數）', k5.lines);
section('K7 城門外出發的食物餘裕（補充，不計入原 25 項通過數）', ['玩家一律平民起手素質與裝備（鏽刃＋布衣、金創藥水×2、身上沒有食物），200 seed、每季 50。', ''].concat(k7.lines));
section('B1 跑商（補充，不計入原 25 項通過數）', b1.lines);
section('依賴出身素質／出身起手的項目清單（`rg` 檢查 `sim/` 全部 25 項）', [
  '檢查指令（在 repo 根目錄）：`rg -n "starters\\(|cleaners\\(|ORIGINS|origin|P\\.duel|setupPlayer|attrVal|profLv|players" sim/items sim/lib`，再逐項看命中處。',
  '',
  '| 項目 | 依賴方式 | 本輪處理 |', '|---|---|---|',
  '| K2 | `P.starters()`／`P.cleaners()` 六出身各 500 場合併 | 已用平民重跑（必跑） |',
  '| S4 | `P.starters()`／`P.cleaners()` 六出身的單挑結果取時間加權 | 已用平民重跑（必跑） |',
  '| K4 | `ts[i % 6]` 六出身輪替；談判用口才／說服 | 已用平民重跑（補充） |',
  '| K5 | 委託收入表對六出身取平均；起始銀兩 `ORIGINS[seed % 6].silver` | 已用平民重跑（補充） |',
  '| K7 | `P.starters()[seed % 6]` 六出身輪替 | 已用平民重跑（補充） |',
  '| B1 | `P.starters()[4]`／`P.cleaners()[4]`（行商）；負重上限寫死 76（行商體魄 9） | 已用平民重跑（補充） |',
  '',
  '**上述六項之外：沒有。** 其餘 19 項（T1–T7、S1–S3、S5、K1、K3、K6、K8、B2–B5）都沒有取用 `players.js`、`setupPlayer` 或任何出身資料。其中有幾項把玩家數值寫死成常數，寫死的值本來就等於平民，不需要重跑：',
  '- K3：身法 10、偷竊 0（另報身法 14／偷竊 25 的對照組）。',
  '- K6／K8（`sim/lib/crime.js`）：口才 10、說服 0、身法 10、閃躲 0。',
  '- B2：盤查說服率以「起手口才 10、說服 0」代入。',
  '- T1、T6、T7（`sim/lib/time.js` `newBody`）：生命上限 80＝體魄 10 的 `maxHp()`。',
  '- `sim/items/T5.js`、`B3.js`、`B4.js`、`T3.js`、`T4.js` 只從 `lib/game` 讀地圖／物價資料表（`data()`），不建立玩家。',
]);
// 總結（放在最前面）
const sum = [];
sum.push('| 項目 | 列 | 起手・平民 | 古窯清理級・平民 | 門檻 | 通過與否 |', '|---|---|---|---|---|---|');
[k2.r1, k2.r2].concat(k2.r3 ? [k2.r3] : []).forEach((r) => sum.push('| ' + ['K2', r.tag + '（' + r.cfg + '／藥水×' + r.pots + '／波間 ' + r.heal * 100 + '%）', pc(r.a.p), pc(r.b.p), '起手 20–40%；清理級 ≥70%', v(r.ok)].join(' | ') + ' |'));
if (!k2.r3) sum.push('| K2 | 平民專用建議值 | — | — | — | ' + (k2.sweep.length ? '找不到' : '不需要') + ' |');
s4.rounds.forEach((o) => sum.push('| ' + ['S4', o.tag + '（掉落 ' + o.lootTxt + '、賞金 ' + o.rw2 + '／' + o.rw4 + '）', '×2 ' + U.r3(o.res[0].ratio2) + '、×4 ' + U.r3(o.res[0].ratio4), '×2 ' + U.r3(o.res[1].ratio2) + '、×4 ' + U.r3(o.res[1].ratio4), '四個比值皆 0.8–1.25', v(o.ok)].join(' | ') + ' |'));
sum.push('| K4（補充） | W=50、64 最低離境率 | ' + pc(k4.worstS) + '（無門檻） | ' + pc(k4.worst) + ' | 清理級 ≥90% | ' + v(k4.ok) + ' |');
sum.push('| K5（補充） | 贖罪金 400 兩：中位天數 | ' + U.r3(k5.out.g400.med) + ' | ' + U.r3(k5.out.c400.med) + '（對照） | 起手 30–120 天 | ' + v(k5.out.g400.ok) + ' |');
sum.push('| K5（補充） | 贖罪金 700 兩：中位天數 | ' + U.r3(k5.out.g700.med) + ' | ' + U.r3(k5.out.c700.med) + '（對照） | 起手 30–120 天 | ' + v(k5.out.g700.ok) + ' |');
sum.push('| K5（補充） | ①T≥0／②30 天內回到 tier≠debt | — | — | 與玩家無關 | ' + v(k5.c1) + '／' + v(k5.c2) + ' |');
sum.push('| K7（補充） | 24h 內補到 +35 的通過率／飽食最低平均 | ' + pc(k7.A.okN / 200) + '／' + U.r3(k7.A.minFoodAll) + ' | — | 100% | ' + v(k7.ok) + ' |');
sum.push('| B1（補充） | 白天四季平均期望利潤（官道／暗路）14 件；20 件；30 件 | ' + [14, 20, 30].map((n) => U.r3(b1.avg('起手・平民', '白天 08:00', n, 'evR')) + '／' + U.r3(b1.avg('起手・平民', '白天 08:00', n, 'evD'))).join('；') + ' | ' + [14, 20, 30].map((n) => U.r3(b1.avg('古窯清理級・平民', '白天 08:00', n, 'evR')) + '／' + U.r3(b1.avg('古窯清理級・平民', '白天 08:00', n, 'evD'))).join('；') + ' | ①14 件官道≥暗路 ②20 件暗路>官道 | ' + v(b1.verdicts['起手・平民'].c1 && b1.verdicts['起手・平民'].c2) + ' |');
const idx = out.indexOf('## 回歸檢查：' + (regAll ? '全部重現' : '**有項目未重現**'));
out.splice(idx, 0, '## 總結', '', '回歸檢查：' + (regAll ? '全部重現（K2 起手・流民建議值組 42/500＝0.084、原值組 0；古窯清理級・流民建議值組 0.994）。' : '**有項目未重現**，見下。'), '', ...sum, '');
finish();
fs.writeFileSync(path.join(U.ROOT, 'evidence', 'csv-civ', 'summary.csv'), sum.slice(2).map((l) => l.split('|').slice(1, -1).map((c) => '"' + c.trim().replace(/"/g, '""') + '"').join(',')).join('\n').replace(/^/, 'item,row,starter_civ,cleaner_civ,threshold,verdict\n') + '\n');
log('已寫入 evidence/b1-civ-results.md、evidence/csv-civ/*.csv');
console.log(sum.join('\n'));
