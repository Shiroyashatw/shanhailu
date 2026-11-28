'use strict';
/* num-shl-b1-t3v5：v0.5 規則驗算。node sim/t3v5/run.js
 * 產出 evidence/b1-t3v5-results.md 與 evidence/csv-t3v5/*.csv。全部固定 seed，重跑結果相同。
 * 只 require 既有的 sim/lib/*、sim/civ/common.js，不改動、不呼叫它們的 run()（那會覆寫既有 evidence/csv*）。 */
const fs = require('fs');
const path = require('path');
const C = require('./common');
const { r3, verdict } = C.U;
const t00 = Date.now(); const log = (s) => console.log('[' + ((Date.now() - t00) / 1000).toFixed(1) + 's] ' + s);
const out = [];
const section = (title, lines) => { out.push('## ' + title, ''); let inT = false; lines.forEach((l) => { const isT = l.startsWith('|'); if (isT && !inT && out[out.length - 1] !== '') out.push(''); if (!isT && inT && l !== '') out.push(''); inT = isT; out.push(l); }); out.push(''); };
const finish = () => { fs.writeFileSync(path.join(C.U.ROOT, 'evidence', 'b1-t3v5-results.md'), out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'); };
out.push('# 《山海錄》第一批 v0.5 驗算（num-shl-b1-t3v5）', '');
out.push('依據：mumi 17:27 拍板的 v0.5 規則（SPEC-TIME／01／02 v0.5）；base numbers/num-shl-b1-k1 38e33a56。', '');
out.push('- 執行：`node sim/t3v5/run.js`（約 1 分鐘）。只新增 `sim/t3v5/`；`sim/lib/*`、`sim/items/*`、`sim/civ/*` 與 `js/`、`index.html`、`tests/`、`docs/` 都沒有改動。所有假設與建模選擇、待決問題見 `evidence/b1-t3v5-assumptions.md`；原始數據見 `evidence/csv-t3v5/`。');
out.push('- 數字一律是本輪實際跑出來的，或實際讀 `js/data.js`／`js/game.js`（以 Node vm 唯讀載入，`sim/lib/game.js`）得到的。', '');
// A
const A = require('./a_t3').run(); log('A ' + (A.regOk ? '回歸 OK' : '回歸 FAIL'));
if (!A.regOk) { section('A. T3 — 回歸檢查：**重現失敗，已停止**', A.lines); finish(); console.error('回歸失敗'); process.exit(2); }
section('A. T3 行走取整（新切點）', ['樣本：查表（10 種狀態 × 19 條邊＋2 條路線 × 晴／雪），無亂數、無種子。', ''].concat(A.lines));
const B = require('./b_t3b').run(); log('B');
section('B. T3b 切點查表', ['樣本：查表，無亂數、無種子。', ''].concat(B.lines));
const CT = require('./c_tier'); const c1 = CT.c1(), c3 = CT.c3(), c2 = CT.c2(); log('C');
section('C. 委託險級（四檔）', c1.lines.concat([''], c2.lines, [''], c3.lines));
const D = require('./d_long').run(); log('D');
section('D. 長期委託期限（30／60 日）', ['樣本與種子：單次挑戰每組 2000 場（種子 55000+j，j=0..1999，沿用 K2）；長期追單每組 200 seeds（seed＝0..199；起點季節 floor(seed/50)，即春夏秋冬各 50）。玩家：起手・平民、古窯清理級・平民（`sim/civ/common.js`，K2／S4 用過的同一組），戰鬥決策器 `sim/lib/game.js` fight() 不改。', ''].concat(D.lines));
// 總表
const cut = (c) => D.verdicts[c];
const dRow = (c) => { const v = cut(c); return '打得了 ' + v.yes.length + ' 組逾期率最高 ' + r3(Math.max(...v.yes.map((x) => x.late / x.n)) * 100) + '%；打不了 ' + v.no.length + ' 組'; };
const S = [
  ['A 回歸（v0.3/v0.4 T3 重現）', '輕裝 +1.000h／+25.000%；疊乘最壞 +2.000h／+25.000%', A.regGot, A.regOk],
  ['A T3 新規則（輕裝基準）', '雪使任一單邊 ≤ +1h、兩路線 ≤ +25%', A.summary, A.basePass],
  ['B 切點兩側時間差', '1.00/0.99、0.67/0.66、0.50/0.49 × h=1–7 皆 ≥0.5h', '21 格最小 ' + B.minDiff + 'h', B.cutOk],
  ['B 常見狀態表', '14 列 M 與檔位全符', (B.nExpect - B.bad.length) + '/' + B.nExpect + ' 符', B.bad.length === 0],
  ['B 檔位改變但時間沒變（資訊）', '只列', B.same.length + ' 處', null],
  ['B 取整順序（資訊）', '只列', B.nStates + ' 種狀態中檔位不同 ' + B.bandDiff.length + ' 種', null],
  ['C1 risk ≤ 0.85', '全部 ≤0.85', '336 格最大 ' + (c1.maxRisk / 1000).toFixed(3) + '；最壞組合封頂 0.850', c1.maxRisk <= 850],
  ['C1 邊界值', '0.1499／0.15／0.3499／0.35／0.5999／0.60／0.85 → 低／中／中／高／高／極高／極高', c1.bndOk ? '7/7 符' : '先取三位：4/7 符（0.1499、0.3499、0.5999 進位到上一檔；規則矛盾，見待決）；不取三位：7/7', c1.bndOk],
  ['C1 R2 手算預期', '11 個手算值', c1.handOk ? '全符' : '有不符', c1.handOk],
  ['C2 灰窯收集單抽樣（V1 主讀法）', '中 66.7%／高 33.3%（±3pp）、低／極高 0', c2.A.draw.n + ' 張：中 ' + r3(c2.A.draw['中'] / c2.A.draw.n * 100) + '%、高 ' + r3(c2.A.draw['高'] / c2.A.draw.n * 100) + '%、低 ' + c2.A.draw['低'] + '、極高 ' + c2.A.draw['極高'], c2.ok],
  ['C3 送貨走官道', 'route() 保留官道', c3.allRoad ? '6/6 方向走官道' : '有方向走野徑', c3.allRoad],
  ['D 逾期率（切法 <5%）', '打得了的單 ≤10%', dRow(0.05), cut(0.05).okAll],
  ['D 逾期率（切法 <10%）', '打得了的單 ≤10%', dRow(0.10), cut(0.10).okAll],
  ['D 逾期率（切法 <25%）', '打得了的單 ≤10%', dRow(0.25), cut(0.25).okAll],
  ['D 聲望下限', '6 例＋rep 0–25 全掃', D.exOk.every((x) => x[1] === x[2]) && D.sweepOk ? '全符' : '有不符', D.exOk.every((x) => x[1] === x[2]) && D.sweepOk],
  ['D 逾期不扣銀／不加惡／不寫通緝', '斷言', '失敗 ' + D.assertBad.length + ' 筆', D.assertBad.length === 0],
];
section('總表', ['| 項目 | 判準 | 結果 | 過不過 |', '|---|---|---|---|'].concat(S.map((r) => '| ' + [r[0], r[1], r[2], r[3] === null ? '資訊' : r[3] ? '通過' : '**未通過**'].join(' | ') + ' |')));
C.writeCsv('summary', ['item', 'criterion', 'result', 'verdict'], S.map((r) => [r[0], r[1], r[2], r[3] === null ? 'info' : r[3] ? 'pass' : 'FAIL']));
finish(); log('寫出 evidence/b1-t3v5-results.md');
