'use strict';
/* A. T3 重跑：先回歸（v0.3/v0.4，無兩位取整，直接用 sim/lib/time.js 的 routeHours(…, half=true)），
 * 再用 R1（M 取兩位）重跑。狀態集、邊集、兩條路線逐項照抄 sim/items/T3.js。 */
const T = require('../lib/time');
const { data } = require('../lib/game');
const C = require('./common');
const { r3 } = C.U;
const YANLU = { a: 'chakou', b: 'duyin_alley', h: 3 }; // sim/items/T3.js 的新邊（SPEC-03，非官道）
// 照抄 sim/items/T3.js 的 STATES（浮點乘數）並對應到 R1 的因子
const STATES = [
  ['輕裝', 1, {}], ['疲憊', 0.85, { tired: 1 }], ['寒顫', 0.9, { cold: 'shiver' }], ['常態重負', 0.82, { load: 'normal' }], ['超載', 0.6, { load: 'heavy' }], ['超載過量', 0.4, { load: 'over' }],
  ['疲憊+寒顫', 0.85 * 0.9, { tired: 1, cold: 'shiver' }], ['常態重負+疲憊+寒顫', 0.82 * 0.85 * 0.9, { load: 'normal', tired: 1, cold: 'shiver' }],
  ['超載+疲憊+寒顫', 0.6 * 0.85 * 0.9, { load: 'heavy', tired: 1, cold: 'shiver' }], ['超載過量+疲憊+寒顫', 0.4 * 0.85 * 0.9, { load: 'over', tired: 1, cold: 'shiver' }]];
function setup() {
  const D = data(); const E = (a, b) => D.EDGES.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const edges = D.EDGES.concat([YANLU]);
  const routes = { '官道 灰窯→驛站→渡陰': [E('huiyao', 'yizhan'), E('yizhan', 'duyin')], '私鹽道 灰窯→岔口→後巷': [E('huiyao', 'chakou'), YANLU] };
  return { edges, routes };
}
const ename = (e) => e.a + '-' + e.b + (e.road ? '(官道)' : '');
// 舊（v0.3/v0.4）：time.js routeHours half=true
const oldHours = (es, sp, wx) => T.routeHours(es, sp, wx, true);
// 新（v0.5 R1）：每邊 M_i = round2(狀態因子 × 該邊雪因子)
const newHours = (es, st, wx) => C.walkHours(es.map((e) => [e.h, C.M100(Object.assign({}, st, { snow: wx === 'snow' ? (e.road ? 'road' : 'wild') : null }))]));
function evalAll(hfn, key) {
  const { edges, routes } = setup(); const rows = [];
  let baseEdgeMax = 0, allEdgeMax = 0, baseRouteMax = 0, allRouteMax = 0;
  STATES.forEach(([sn, sp, st]) => {
    const arg = key === 'old' ? sp : st;
    edges.forEach((e) => {
      const sun = hfn([e], arg, 'sun'), snow = hfn([e], arg, 'snow'), d = snow - sun;
      rows.push([key, sn, 'edge', ename(e), e.h, sun, snow, d, sun ? d / sun * 100 : 0]);
      if (sn === '輕裝') baseEdgeMax = Math.max(baseEdgeMax, d); allEdgeMax = Math.max(allEdgeMax, d);
    });
    Object.keys(routes).forEach((rn) => {
      const es = routes[rn]; const sun = hfn(es, arg, 'sun'), snow = hfn(es, arg, 'snow'), inc = (snow - sun) / sun;
      rows.push([key, sn, 'route', rn, es.reduce((a, e) => a + e.h, 0), sun, snow, snow - sun, inc * 100]);
      if (sn === '輕裝') baseRouteMax = Math.max(baseRouteMax, inc); allRouteMax = Math.max(allRouteMax, inc);
    });
  });
  return { rows, baseEdgeMax, allEdgeMax, baseRouteMax, allRouteMax };
}
function run() {
  const o = evalAll(oldHours, 'old'), n = evalAll(newHours, 'new');
  const lines = [];
  // 回歸
  const regExp = '輕裝：單邊 +1.000h、路線 +25.000%；疊乘最壞：單邊 +2.000h、路線 +25.000%';
  const regGot = '輕裝：單邊 +' + r3(o.baseEdgeMax) + 'h、路線 +' + r3(o.baseRouteMax * 100) + '%；疊乘最壞：單邊 +' + r3(o.allEdgeMax) + 'h、路線 +' + r3(o.allRouteMax * 100) + '%';
  const regOk = regGot === regExp;
  // 新舊逐列比對
  const diffs = [];
  o.rows.forEach((r, i) => { const m = n.rows[i]; if (r[5] !== m[5] || r[6] !== m[6]) diffs.push([r[1], r[2], r[3], r[5], r[6], m[5], m[6]]); });
  // 雪天官道 0.925→0.93：對每個狀態列 M（未取整 vs 取兩位）與官道邊的時間
  const { edges } = setup(); const roadRows = [];
  STATES.forEach(([sn, sp, st]) => {
    const exact = sp * 0.925, m = C.M100(Object.assign({}, st, { snow: 'road' }));
    edges.filter((e) => e.road).forEach((e) => { const a = oldHours([e], sp, 'snow'), b = newHours([e], st, 'snow'); roadRows.push([sn, ename(e), e.h, exact, m / 100, a, b, a === b ? '同' : '不同']); });
  });
  const basePass = n.baseEdgeMax <= 1 && n.baseRouteMax <= 0.25 + 1e-12;
  C.writeCsv('T3', ['rule', 'state', 'kind', 'edge_or_route', 'base_h', 'sun_h', 'snow_h', 'diff_h', 'diff_pct'], o.rows.concat(n.rows));
  C.writeCsv('T3-snow-road', ['state', 'edge', 'base_h', 'M_exact', 'M_round2', 'snow_h_old', 'snow_h_new', 'same'], roadRows);
  lines.push('回歸（v0.3／v0.4 規則：`sim/lib/time.js` 的 `routeHours(…, half=true)`，無兩位取整；狀態 10 種、邊 ' + edges.length + ' 條（data.js EDGES 18 條＋私鹽道新邊）、路線 2 條，照抄 `sim/items/T3.js`）：', '',
    '| 檢查 | 前一輪 `evidence/b1-sim-results.md` | 本輪重算 | 重現 |', '|---|---|---|---|', '| T3 0.5h 進位 | ' + regExp + ' | ' + regGot + ' | ' + (regOk ? '是' : '**否**') + ' |', '');
  lines.push('| 規則 | 輕裝 單邊最多增加 | 輕裝 兩路線最多增加 | 疊乘最壞 單邊 | 疊乘最壞 路線 |', '|---|---|---|---|---|',
    '| 舊（不取兩位） | +' + r3(o.baseEdgeMax) + 'h | +' + r3(o.baseRouteMax * 100) + '% | +' + r3(o.allEdgeMax) + 'h | +' + r3(o.allRouteMax * 100) + '% |',
    '| 新（R1，M 取兩位） | +' + r3(n.baseEdgeMax) + 'h | +' + r3(n.baseRouteMax * 100) + '% | +' + r3(n.allEdgeMax) + 'h | +' + r3(n.allRouteMax * 100) + '% |', '');
  lines.push('判準（v0.4 Q-T3a 甲，只對輕裝基準）：雪使任一單邊 ≤ +1 小時、兩條路線 ≤ +25% → 新規則 **' + C.U.verdict(basePass) + '**（單邊 +' + r3(n.baseEdgeMax) + 'h、路線 +' + r3(n.baseRouteMax * 100) + '%）。疊乘狀態只報數字。', '');
  const route2 = n.rows.filter((r) => r[2] === 'route' && r[1] === '輕裝');
  lines.push('輕裝兩條路線（新）：' + route2.map((r) => r[3] + ' 晴 ' + r[5] + 'h → 雪 ' + r[6] + 'h（+' + r3(r[8]) + '%）').join('；') + '。', '');
  lines.push('新舊規則時間不同的列（全部 ' + o.rows.length + ' 列中 ' + diffs.length + ' 列）：' + (diffs.length ? '' : '無。'));
  if (diffs.length) { lines.push('', '| 狀態 | 類型 | 邊／路線 | 舊 晴 | 舊 雪 | 新 晴 | 新 雪 |', '|---|---|---|---|---|---|---|'); diffs.forEach((d) => lines.push('| ' + d.join(' | ') + ' |')); }
  const roadDiff = roadRows.filter((r) => r[7] === '不同');
  lines.push('', '雪天官道 ×0.925 → 取兩位：各狀態的官道邊（3 條，各 2h）雪天時間，舊（M 不取整）與新（M 取兩位）' + (roadDiff.length ? '有 ' + roadDiff.length + ' 列不同：' + roadDiff.map((r) => r[0] + ' ' + r[1] + ' ' + r[5] + 'h→' + r[6] + 'h').join('；') : '**單邊全部相同**（' + roadRows.length + ' 列，見 csv-t3v5/T3-snow-road.csv）') + '。整條路線層級（兩段官道加總後才進位）的差異已列在上表：' + (diffs.filter((d) => d[2].startsWith('官道') && d[4] !== d[6]).map((d) => d[0] + ' 官道路線 雪 ' + d[4] + 'h→' + d[6] + 'h').join('；') || '無') + '（這是多因子連乘取兩位造成，不是 0.925→0.93 本身）。', '');
  lines.push('| 狀態 | 雪天官道 M（不取整） | M（取兩位） | 2h 官道邊 舊 | 新 |', '|---|---|---|---|---|');
  const seen = new Set(); roadRows.forEach((r) => { if (seen.has(r[0])) return; seen.add(r[0]); lines.push('| ' + [r[0], r[3].toFixed(6), r[4].toFixed(2), r[5] + 'h', r[6] + 'h'].join(' | ') + ' |'); });
  return { regOk, regExp, regGot, o, n, basePass, diffs, roadDiff, lines, summary: '輕裝：單邊 +' + r3(n.baseEdgeMax) + 'h、路線 +' + r3(n.baseRouteMax * 100) + '%（舊 +' + r3(o.baseEdgeMax) + 'h／+' + r3(o.baseRouteMax * 100) + '%）；疊乘最壞 單邊 +' + r3(n.allEdgeMax) + 'h、路線 +' + r3(n.allRouteMax * 100) + '%；新舊時間不同 ' + diffs.length + ' 列' };
}
module.exports = { run, STATES };
