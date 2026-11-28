'use strict';
/* 一次跑完 25 項：node sim/run-all.js
 * 產出 evidence/b1-sim-results.md（總表＋明細）與 evidence/csv/<編號>.csv。全部固定 seed，重跑結果完全相同。 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ROOT } = require('./lib/util');
const IDS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'S1', 'S2', 'S3', 'S4', 'S5', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'B1', 'B2', 'B3', 'B4', 'B5'];
const MEASURE = { T6: 1, T7: 1, S3: 1 };
const SPEC = { T: 'SPEC-TIME', S: 'SPEC-01', K: 'SPEC-02', B: 'SPEC-03' };
let sha = 'unknown';
try { sha = execSync('git merge-base HEAD origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { try { sha = execSync('git rev-parse origin/main', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e2) { /* 無 git */ } }
const res = []; const t00 = Date.now();
IDS.forEach((id) => { const t0 = Date.now(); const r = require('./items/' + id + '.js').run(); r.ms = Date.now() - t0; res.push(r); console.log((r.pass ? 'PASS' : 'FAIL') + '  ' + id + '  ' + r.title + '  (' + (r.ms / 1000).toFixed(1) + 's)  ' + r.measured); });
const cell = (s) => String(s).replace(/\|/g, '／').replace(/\n/g, ' ');
const vd = (r) => (MEASURE[r.id] ? (r.pass ? '量測（健全檢查通過）' : '量測（健全檢查**未通過**）') : r.pass ? '通過' : '**未通過**') + (r.passNote ? '<br>' + r.passNote : '');
const nPass = res.filter((r) => r.pass).length, fails = res.filter((r) => !r.pass);
const out = [];
out.push('# 《山海錄》第一批規格雲端驗算結果（num-shl-b1-sim）', '');
out.push('依據：SPEC-TIME／01／02／03 v0.2（2026-11-28）；base main@' + sha, '');
out.push('- 執行：`node sim/run-all.js`（單項 `node sim/run.js T1`）。Node 標準庫、無外部套件；亂數 mulberry32、固定 seed（0..N−1），世界擲骰走 `wrnd(seed, tag, day, i)`，同參數重跑結果完全相同。');
out.push('- 遊戲現況數值以 Node `vm` 唯讀載入 `js/data.js`、`js/game.js`；戰鬥直接跑 `game.js` 的 `startCombat／combatAction`（game.js:1336-1618），沒有另寫戰鬥公式。沒有修改任何既有檔案。');
out.push('- 25 項：**通過 ' + nPass + ' 項、未通過 ' + fails.length + ' 項**（' + (fails.map((r) => r.id).join('、') || '無') + '）。量測項（T6、T7、S3）只判健全檢查。');
out.push('- 任務書有兩種讀法、結果又不同的項目，「通過與否」欄兩種結果都寫。T3、K6 文中沒有依據可選，照最保守的讀法判未通過；T4、S5 的另一種讀法與任務書其他字句（「最近的」委託點、委託生成「照 game.js 現況」）不合，照主讀法判通過並加註。全部列入待決問題。');
out.push('- 所有【假設】、建模選擇、repo 行號對照、待決問題：見 `evidence/b1-sim-assumptions.md`。原始彙總數據：`evidence/csv/<編號>.csv`。', '');
out.push('## 總表', '', '| 項目編號 | 實測 | 門檻 | 通過與否 | 建議值 | 重跑結果 |', '|---|---|---|---|---|---|');
res.forEach((r) => out.push('| ' + [r.id + ' ' + r.title, cell(r.measured), cell(r.threshold), vd(r), cell(r.suggest), cell(r.rerun)].join(' | ') + ' |'));
out.push('', '## 各項明細', '');
let cur = '';
res.forEach((r) => {
  const sp = SPEC[r.id[0]]; if (sp !== cur) { cur = sp; out.push('### ' + sp, ''); }
  out.push('#### ' + r.id + ' ' + r.title + ' — ' + vd(r).replace('<br>', '；'), '');
  let inTable = false;
  (r.lines || []).forEach((l) => { const isT = l.startsWith('|'); if (isT && !inTable) out.push(''); if (!isT && inTable) out.push(''); inTable = isT; out.push(isT ? l : l === '' ? '' : l + '  '); });
  out.push('');
});
fs.mkdirSync(path.join(ROOT, 'evidence'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'evidence', 'b1-sim-results.md'), out.join('\n') + '\n');
fs.writeFileSync(path.join(ROOT, 'evidence', 'csv', 'summary.csv'), ['id,title,pass,measured,threshold,suggest,rerun'].concat(res.map((r) => [r.id, r.title, r.pass ? 'pass' : 'FAIL', r.measured, r.threshold, r.suggest, r.rerun].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','))).join('\n') + '\n');
console.log('\n通過 ' + nPass + '/25；未通過：' + (fails.map((r) => r.id).join('、') || '無') + '；耗時 ' + ((Date.now() - t00) / 1000).toFixed(1) + 's');
console.log('已寫入 evidence/b1-sim-results.md、evidence/csv/*.csv');
