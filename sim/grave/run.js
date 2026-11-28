'use strict';
/* num-shl-grave-econ：SPEC-GRAVE v0.1 盜墓經濟驗算。node sim/grave/run.js（約 5 分鐘）
 * 產出 evidence/grave-econ-results.md 與 evidence/csv-grave/*.csv。全部固定 seed，重跑結果相同。
 * 只 require 既有 sim/lib/*、sim/civ/common.js，不改動、不呼叫它們的 run()（那會覆寫既有 evidence/csv*）。 */
const fs = require('fs');
const path = require('path');
const { U, writeCsv, r2, H } = require('./common');
const t00 = Date.now(); const log = (s) => console.log('[' + ((Date.now() - t00) / 1000).toFixed(1) + 's] ' + s);
const out = [];
const section = (title, lines) => { out.push('## ' + title, ''); let inT = false; lines.forEach((l) => { const isT = l.startsWith('|'); if (isT && !inT && out[out.length - 1] !== '') out.push(''); if (!isT && inT && l !== '') out.push(''); inT = isT; out.push(l); }); out.push(''); };
const finish = () => { fs.writeFileSync(path.join(U.ROOT, 'evidence', 'grave-econ-results.md'), out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'); };
out.push('# 《山海錄》SPEC-GRAVE v0.1 盜墓經濟驗算（num-shl-grave-econ）', '');
out.push('依據：SPEC-GRAVE v0.1（待驗算，2026-11-28）；base numbers/num-shl-b1-t3v5 7106871；遊戲數值 main 8c8beb6。', '');
out.push('- 執行：`node sim/grave/run.js`（約 5 分鐘）。只新增 `sim/grave/`、本檔、`evidence/grave-econ-assumptions.md`、`evidence/csv-grave/`；`js/`、`index.html`、`tests/`、`docs/`、既有 `sim/*` 與 `evidence/*` 都沒有改動。',
  '- 遊戲數值：sim 以 Node vm 唯讀載入 base 分支的 `js/data.js`、`js/game.js`（`sim/lib/game.js`）。base 與 main 8c8beb6 的 data.js／game.js 差異只在取名（NAME_POOL、取名頁）與出身清單（main 只剩「平民」一張卡，數值＝base 的 drifter：素質全 10、熟練 0、鏽刃＋布衣、60 兩）；本輪用到的 ENEMIES、DUNGEONS、EDGES、BASES、RARITY、戰鬥、掉落、鑑定、賣價、客棧／傷兵帳服務兩邊逐字相同（見 assumptions「版本」）。',
  '- 玩家：前輪的「起手・平民」「古窯清理級・平民」（`sim/civ/common.js`），戰鬥決策器 `sim/lib/game.js` fight() 不改。H＝18 兩/時。',
  '- 數字一律是本輪實際跑出來，或實際讀程式得到的。所有假設、建模選擇與待決問題見 `evidence/grave-econ-assumptions.md`；原始數據見 `evidence/csv-grave/`。', '');
const S = [];
// E1
const E1 = require('./e1').run(); log('E1');
section('E1 古塚掉落回歸', E1.lines);
S.push(['E1 古塚掉落回歸', '一趟期望淨值與 172.60 差 ≤2%', '實抽 ' + r2(E1.tot) + '（' + U.r3(E1.diff * 100) + '%）；' + E1.N + ' 趟', E1.ok]);
// E2
const E2 = require('./guzhong').run(); log('E2');
const wk = (pi, door, pol, walk) => E2.W.find((x) => x.p.name === pi && x.o.door === door && x.o.policy === pol && x.o.walk === walk).w;
const one = (pn, door, u, pol, take, walk) => E2.R.find(({ c }) => c.p.name === pn && c.o.door === door && c.o.u === u && c.o.policy === pol && c.o.take === take && c.o.pots === 2 && c.o.walk === walk).a.mean;
const CL = '古窯清理級・平民', ST = '起手・平民';
const e2ok = E2.W.every(({ w }) => w.perH_end <= 1.3 * H && w.perH_loss <= 1.3 * H);
const a2 = one(CL, 'front', 0, 'careful', 2, true), b2 = one(CL, 'front', 0, 'rest', 2, true), c2 = one(CL, 'front', 0, 'rest', 4, false), d2 = one(CL, 'tunnel', 0, 'rest', 2, true);
const w1 = wk(CL, 'front', 'careful', true), w2 = wk(CL, 'front', 'rest', true);
section('E2 古塚戰鬥風險', E2.lines.concat(['',
  '死亡的兩種算法：「死亡即結束」＝死亡那趟與之後的趟都記 0、分母仍是計畫時數（9h／趟，盜洞 8h；週 63h／56h），沿用前輪 B2 的風險調整時薪口徑；「死亡＝損失整趟＋X」＝死亡那趟記 −' + E2.X_DEATH + ' 兩（X＝制式裝備 82＋藥水 18）、之後換一個同級角色照跑。',
  '判準：7 天週均風險調整後 ≤1.3H（23.4 兩/h）→ 表中 ' + E2.W.length + ' 組全部 ' + (e2ok ? '≤1.3H → **通過**' : '有組 >1.3H → **未通過**') + '。最高的是 古窯清理級・正門・層間回滿（上界）' + r2(w2.perH_end) + ' 兩/h（' + U.r3(w2.perH_end / H) + 'H，手算 7 天連跑 20.13＝1.12H，差額是藥水錢與路上遇險）；照實打（量力）只有 ' + r2(w1.perH_end) + ' 兩/h，因為週內 ' + w1.seedsDead + '/200 個 seed 至少死一次。',
  '古物趟單趟另報：古窯清理級・正門取 2 量力 ' + r2(a2.value) + ' 兩／趟（死亡 ' + U.r3(a2.dead * 100) + '%）、層間回滿上界 ' + r2(b2.value) + ' 兩／趟＝' + r2(b2.perH_end) + ' 兩/h（' + U.r3(b2.perH_end / H) + 'H；手算 232.66／25.85＝1.44H）；取 4 上界（不含路上遇險）' + r2(c2.value) + ' 兩＝' + r2(c2.perH_end) + ' 兩/h（' + U.r3(c2.perH_end / H) + 'H；手算 30.36）；盜洞取 2 上界 ' + r2(d2.value) + ' 兩＝' + r2(d2.perH_end) + ' 兩/h（' + U.r3(d2.perH_end / H) + 'H；手算 22.83）。',
  '起手・平民打不了古塚：守墓俑護甲 9（data.js ENEMIES.golem），起手鏽刃 4–7；墓道勝率 ' + (() => { const a = E2.R.find(({ c }) => c.p.name === ST && c.o.door === 'front' && c.o.u === 0 && c.o.policy === 'careful' && c.o.walk).a; return U.r3(a.fl[0][0] / a.fl[0][1] * 100) + '%（' + a.fl[0][0] + '/' + a.fl[0][1] + '）'; })() + '。古窯清理級・平民一口氣打完三層（藥水 2、量力）時主室勝率 ' + (() => { const a = E2.R.find(({ c }) => c.p.name === CL && c.o.door === 'front' && c.o.u === 0 && c.o.policy === 'careful' && c.o.pots === 2 && c.o.take === 2 && c.o.walk).a; return U.r3(a.fl[2][0] / a.fl[2][1] * 100) + '%（' + a.fl[2][0] + '/' + a.fl[2][1] + '）'; })() + '；只有在層間回滿時才接近手算。']));
S.push(['E2 古塚 7 天週均（風險調整）', '≤1.3H（23.4 兩/h）', '最高 ' + r2(Math.max(...E2.W.map(({ w }) => w.perH_end))) + ' 兩/h（' + U.r3(Math.max(...E2.W.map(({ w }) => w.perH_end)) / H) + 'H，層間回滿上界）；照實打 ' + r2(w1.perH_end) + '（' + w1.seedsDead + '/200 seed 週內死亡）', e2ok]);
S.push(['E2 古物趟單趟（資訊）', '另報', '正門取 2 上界 ' + r2(b2.perH_end) + ' 兩/h（' + U.r3(b2.perH_end / H) + 'H）；取 4 上界 ' + r2(c2.perH_end) + '（' + U.r3(c2.perH_end / H) + 'H）；盜洞取 2 上界 ' + r2(d2.perH_end) + '（' + U.r3(d2.perH_end / H) + 'H）', null]);
// E3/E5/E6
const E3 = require('./e3').run((s) => log(s));
section('E3 亂墳 Monte Carlo', E3.lines3);
const fj = E3.judged.filter((j) => !j.ok);
S.push(['E3 P 公式回歸', 'G4 八個手算值重現', E3.reg.ok ? '8/8 重現（容差 0.1pp）' : '有不符', E3.reg.ok]);
S.push(['E3 單座目擊率', '快撬組在 G4 手算 ±3pp', (E3.judged.length - fj.length) + '/' + E3.judged.length + ' 組在內；不過：黑夜不探 ' + fj.map((j) => U.r3(j.cmp * 100) + '%').join('／') + ' 對 21.4%（開棺段 ×1.5 落在夜巡窗；含快撬段解析值 ' + U.r3(E3.reg.extra[3][1] * 100) + '%）', E3.judged.every((j) => j.ok)]);
section('E5 通緝路徑', E3.lines5);
S.push(['E5 黑夜探過避窗 60 天內到通緝', '<5%', '最高 ' + U.r3(Math.max(...E3.e5.filter((x) => x.G.sk === 'night_probe').map((x) => x.a)) * 100) + '%（−1.5/日）；−0.75/日 最高 ' + U.r3(Math.max(...E3.e5.filter((x) => x.G.sk === 'night_probe').map((x) => x.b)) * 100) + '%', E3.wOk]);
S.push(['E5 W 封頂', 'W 從不超過 49', E3.w49 ? '全部 ≤49' : '有超過', E3.w49]);
section('E6 善惡', E3.lines6);
S.push(['E6 挖＋全部歸還', '所有 seed 淨 ΔK<0', E3.kOk ? '32 組 × 200 seeds 全部 <0' : '有 ≥0', E3.kOk]);
// E4
const E4 = require('./e4').run(E3, log); log('E4');
section('E4 經濟不失控', ['樣本：亂墳曲線＝E3 的 32 組（200 seeds × 120 天）；古塚與混合曲線 200 seeds（seed＝0..199）× 120 天，戰鬥種子 50000+1000×k+seed（k＝110–113）。累積淨收入＝現銀−起始 60 兩（已扣生活費、鏟子、藥水、治傷、去侵蝕、入洞費）；「含庫存」再加上手上未出手的墓中物 ×0.65。合法曲線沿用 evidence/ 既有結果（出處見下），同一玩家樣板。'].concat(E4.lines, ['',
  '判準①任何盜墓策略 60 天累積 ≤1.3×合法最佳 → **' + U.verdict(E4.ok1) + '**' + (E4.ok1 ? '' : '（超過：' + E4.fails.join('；') + '）') + '；②亂墳庫存挖完後日收入 ≤4.5 → 照字面（挖空當天起算）**' + U.verdict(E4.ok2) + '**；扣掉挖空時已經排著的新墳（上限 4 座，見底 10 天後起算）' + (E4.okS ? '全部 ≤4.5' : '仍有 >4.5') + '。解析值：新墳每日 0.15 座×3 槽×（3.15＋10.7×0.65）＝4.547 兩/日（細取、取滿、不損壞）；快撬每件古物 25% 減半 → 4.17。細取的理論值本身就比 4.5 高 0.047。',
  '「庫存見底後日收入」＝16 座初始墳全部取空那天之後到第 120 日，每天從新墳拿到的東西（銅錢＋物品×0.65）平均，只算活著且在 120 天內挖空的 seed。逐日曲線見 `evidence/csv-grave/E4-curves.csv`。']));
// E4 建議值（只當建議）
const ubC = E4.curves.find((c) => c.pi === 1 && c.kind === '古塚' && /上界/.test(c.name)); const bestC = Math.max(E4.L.car.c.best[60], E4.L.quest.c[60]) - 60;
const gross = (ubC.cur[60] - 60) / 60 + 14, allow = 1.3 * bestC / 60 + 14; const nReset = Math.ceil(gross / allow);
const SUG = ['E4①：超過的兩組都是「層間回滿（上界）」——每層開打前回滿、休養時間不算；照實打（量力）的古塚與混合曲線都 ≤0.13 倍。超出的主體是**既有**的古塚掉落（E1：171.95 兩／趟，古物只在冷卻好的那天多 60 上下）。上界每日毛收入 ' + r2(gross) + ' 兩，要壓到 1.3×合法最佳（每日 ' + r2(allow) + ' 兩含生活費）需要 ×' + U.r3(allow / gross) + '；例如「古塚清空後 ' + nReset + ' 天才重置」（現為每日，game.js newDay 清 clearedDay），或首領銀兩 60–90、層銀 12–24 等比例下修。是否以「上界」判 E4，列待決。',
  'E4②：新墳每日 0.15 × 3 槽的理論日收入就是 4.547（細取），想要 ≤4.5 可把新墳生成率 0.15→0.14（解析 4.24）或把門檻寫成 4.55；挖空當天起算的實測值還包含挖空時已排著的 ≤4 座新墳，會再高 0.3–0.8。',
  'E3：黑夜不探的快撬組比手算高 3.8–4.7pp，原因是 G4 手算「快撬段先不乘」，而開棺段（×1.5）很常落在夜巡窗；含快撬段的解析值 24.8%。不是規則錯，建議把手算對照改成含快撬段的值（24.8%），或判準只對細取。'];
const postMax = Math.max(...E4.curves.filter((c) => c.post !== null && c.post !== undefined).map((c) => c.post));
S.push(['E4 60 天累積', '任何盜墓策略 ≤1.3×合法最佳', E4.ok1 ? '全部 ≤1.3' : '超過：' + E4.fails.join('；'), E4.ok1]);
const stMax = Math.max(...E4.curves.filter((c) => c.steady !== null && c.steady !== undefined).map((c) => c.steady));
S.push(['E4 庫存挖完後日收入', '≤4.5 兩', '挖空當天起算最高 ' + r2(postMax) + ' 兩/日；見底 10 天後起算最高 ' + r2(stMax) + '；解析 細取 4.547／快撬 4.17', E4.ok2]);
// E7
const E7 = require('./e7').run(); log('E7');
section('E7 渠道（只報數）', E7.lines);
S.push(['E7 渠道（資訊）', '只報數', '取 4 古物 ' + r2(E7.take4.mean) + ' 行情，渡口第一晚收 ' + r2(E7.take4.night1) + '、平均 ' + U.r3(E7.take4.nights) + ' 夜賣完；每 100 行情實得 渡口 65、鬼市 57.4–63.5（期望）、黑攤 50、洗貨 72.5', null]);
section('驗不過的項目：差多少與修正值建議（只當建議，未改規則重跑）', SUG.map((x) => '- ' + x));
section('總表', ['| 項目 | 判準 | 結果 | 過不過 |', '|---|---|---|---|'].concat(S.map((r) => '| ' + [r[0], r[1], r[2], r[3] === null ? '資訊' : r[3] ? '通過' : '**未通過**'].join(' | ') + ' |')));
writeCsv('summary', ['item', 'criterion', 'result', 'verdict'], S.map((r) => [r[0], r[1], r[2], r[3] === null ? 'info' : r[3] ? 'pass' : 'FAIL']));
finish(); log('寫出 evidence/grave-econ-results.md');
module.exports = { S };
