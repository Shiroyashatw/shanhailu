'use strict';
/* B. T3b 查表：切點兩側時間差、檔位改變但時間沒變的掃描、R1 預期常見狀態表、兩種取整順序。 */
const C = require('./common');
const { STATES } = require('./a_t3');
const T1 = (h, m) => C.walkHours([[h, m]]);
// R1 的預期常見狀態表（照任務書逐列抄）
const EXPECT = [
  ['輕裝', {}, 100, '輕快'], ['輕裝＋速度詞綴 +8%', { spd: 8 }, 108, '輕快'], ['輕裝＋疲憊', { tired: 1 }, 85, '平常'], ['輕裝＋雪天野徑', { snow: 'wild' }, 85, '平常'],
  ['常態重負', { load: 'normal' }, 82, '平常'], ['常態重負（熟練 25）', { load: 'normal25' }, 91, '平常'], ['常態重負＋疲憊', { load: 'normal', tired: 1 }, 70, '平常'],
  ['超載（熟練 50）', { load: 'heavy50' }, 70, '平常'], ['超載', { load: 'heavy' }, 60, '沉重'], ['常態重負＋疲憊＋雪天野徑', { load: 'normal', tired: 1, snow: 'wild' }, 59, '沉重'],
  ['超載＋疲憊', { load: 'heavy', tired: 1 }, 51, '沉重'], ['超載＋疲憊＋雪天野徑', { load: 'heavy', tired: 1, snow: 'wild' }, 43, '蹣跚'], ['過量', { load: 'over' }, 40, '蹣跚'],
  ['雪天官道（輕裝）', { snow: 'road' }, 93, '平常']];
function run() {
  const lines = []; const csvCut = [], csvScan = [], csvState = [];
  // 1. 切點兩側
  const CUTS = [[100, 99], [67, 66], [50, 49]]; let cutOk = true; let minDiff = Infinity;
  lines.push('**1. 切點兩側時間差**（判準：皆 ≥ 0.5 小時；單邊，h＝基礎時數）', '', '| h | M=1.00 | 0.99 | 差 | M=0.67 | 0.66 | 差 | M=0.50 | 0.49 | 差 |', '|---|---|---|---|---|---|---|---|---|---|');
  for (let h = 1; h <= 7; h++) {
    const cells = [h];
    CUTS.forEach(([a, b]) => { const ta = T1(h, a), tb = T1(h, b), d = tb - ta; cells.push(ta, tb, d); csvCut.push([h, a / 100, C.band(a), ta, b / 100, C.band(b), tb, d, d >= 0.5 ? 'pass' : 'FAIL']); if (d < 0.5) cutOk = false; minDiff = Math.min(minDiff, d); });
    lines.push('| ' + cells.join(' | ') + ' |');
  }
  lines.push('', '→ 21 格最小差 ' + minDiff + 'h，**' + C.U.verdict(cutOk) + '**。', '');
  // 2. 掃描 h=1..12、M=0.30..1.30
  const same = []; let changes = 0;
  for (let h = 1; h <= 12; h++) for (let m = 31; m <= 130; m++) {
    const b0 = C.band(m - 1), b1 = C.band(m); const t0 = T1(h, m - 1), t1 = T1(h, m);
    csvScan.push([h, m / 100, b1, t1]);
    if (b0 !== b1) { changes++; if (t0 === t1) same.push([h, (m - 1) / 100, m / 100, b0, b1, t1]); }
  }
  lines.push('**2. 掃描 h＝1–12、M＝0.30–1.30（步長 0.01，共 ' + 12 * 101 + ' 格）**：相鄰兩格檔位改變共 ' + changes + ' 處（每個 h 各 3 處，就是上面三個切點）；其中「檔位改變但時間沒變」' + (same.length ? same.length + ' 處：' + same.map((s) => 'h=' + s[0] + ' ' + s[1] + '→' + s[2]).join('、') : '**0 處**') + '（資訊）。', '');
  // 3. 常見狀態表
  let bad = [];
  lines.push('**3. R1 預期常見狀態表**', '', '| 狀態 | 預期 M | 預期檔 | 實算 M（連乘後取兩位） | 實算檔 | 符合 | 浮點連乘取兩位 | 每項先取兩位 |', '|---|---|---|---|---|---|---|---|');
  EXPECT.forEach(([nm, st, em, eb]) => {
    const m = C.M100(st), b = C.band(m), mf = C.mulRoundFloat(C.factors(st), 2), me = C.M100each(st); const ok = m === em && b === eb;
    if (!ok) bad.push(nm);
    csvState.push(['expected-table', nm, C.factors(st).join('*'), em / 100, eb, m / 100, b, ok ? 'yes' : 'NO', mf / 100, me / 100, C.band(me)]);
    lines.push('| ' + [nm, (em / 100).toFixed(2), eb, (m / 100).toFixed(2), b, ok ? '是' : '**否**', (mf / 100).toFixed(2), (me / 100).toFixed(2)].join(' | ') + ' |');
  });
  lines.push('', '→ ' + EXPECT.length + ' 列 ' + (bad.length ? '不符 ' + bad.length + ' 列：' + bad.join('、') : '**全部相符**') + '。', '');
  // 4. 兩種取整順序 & 浮點邊界：所有組合（負重 6 × 速度詞綴 0/+4/+8/+12 × 疲憊 2 × 寒冷 3 × 雪 3）
  const loads = Object.keys(C.LOAD), spds = [0, 4, 8, 12], colds = [null, 'shiver', 'frozen'], snows = [null, 'wild', 'road'];
  let n = 0; const orderDiff = [], bandDiff = [], floatDiff = [];
  loads.forEach((l) => spds.forEach((s) => [0, 1].forEach((tr) => colds.forEach((c) => snows.forEach((sn) => {
    const st = { load: l, spd: s, tired: tr, cold: c, snow: sn }; n++;
    const m = C.M100(st), me = C.M100each(st), mf = C.mulRoundFloat(C.factors(st), 2);
    const nm = [C.LOAD_NAME[l], s ? '速度+' + s + '%' : '', tr ? '疲憊' : '', c === 'shiver' ? '寒顫' : c === 'frozen' ? '凍僵' : '', sn === 'wild' ? '雪野徑' : sn === 'road' ? '雪官道' : ''].filter(Boolean).join('＋');
    if (me !== m) orderDiff.push([nm, m, me]);
    if (C.band(me) !== C.band(m)) bandDiff.push([nm, m, me, C.band(m), C.band(me)]);
    if (mf !== m) floatDiff.push([nm, m, mf]);
    csvState.push(['all-combos', nm, C.factors(st).join('*'), '', '', m / 100, C.band(m), '', mf / 100, me / 100, C.band(me)]);
  })))));
  lines.push('**4. 兩種取整順序（資訊）**：列舉負重 6 檔 × 速度詞綴 {0,+4,+8,+12}% × 疲憊 {無,有} × {無,寒顫,凍僵} × 雪 {無,野徑,官道} 共 ' + n + ' 種狀態。「全部相乘後再取兩位」（規則）與「每項先取兩位再相乘（再取兩位）」：M 值不同 ' + orderDiff.length + ' 種（其中含雪天官道 0.925 的 ' + orderDiff.filter((x) => x[0].includes('雪官道')).length + ' 種）；**檔位不同 ' + bandDiff.length + ' 種**' + (bandDiff.length ? '：' + bandDiff.map((x) => x[0] + '（' + (x[1] / 100).toFixed(2) + ' ' + x[3] + ' vs ' + (x[2] / 100).toFixed(2) + ' ' + x[4] + '）').join('；') : '') + '。', '');
  lines.push('**5. 實作與浮點邊界**：因子以千分點整數（1000、820、910、600、700、400、1000+10×詞綴%、850、900、800、850、925）用 BigInt 連乘，再以 floor(x·100＋0.5) 做 half-up（精確）。同一批 ' + n + ' 種狀態改用 JS 浮點連乘＋Math.round，與精確值不同的有 ' + floatDiff.length + ' 種' + (floatDiff.length ? '：' + floatDiff.map((x) => x[0] + '（精確 ' + (x[1] / 100).toFixed(2) + '、浮點 ' + (x[2] / 100).toFixed(2) + '）').join('；') : '') + '。' + (floatDiff.length ? '（這些就是浮點邊界案例：精確值剛好落在 0.xx5，浮點連乘後略小於 .5 被捨去；遊戲實作若用浮點須注意。）' : ''));
  C.writeCsv('T3b-cuts', ['h', 'M_hi', 'band_hi', 'T_hi', 'M_lo', 'band_lo', 'T_lo', 'diff_h', 'verdict'], csvCut);
  C.writeCsv('T3b-scan', ['h', 'M', 'band', 'T_h'], csvScan);
  C.writeCsv('T3b-states', ['set', 'state', 'factors_permille', 'expected_M', 'expected_band', 'M', 'band', 'match', 'M_float', 'M_each_round2', 'band_each_round2'], csvState);
  return { cutOk, minDiff, same, bad, orderDiff, bandDiff, floatDiff, nStates: n, nExpect: EXPECT.length, lines };
}
module.exports = { run };
