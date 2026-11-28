'use strict';
// T3 行走取整
const T = require('../lib/time');
const { data } = require('../lib/game');
const { r3, writeCsv, verdict } = require('../lib/util');
const YANLU = { a: 'chakou', b: 'duyin_alley', h: 3 }; // 新邊（SPEC-03），非官道
// 現況乘數：game.js:169-175 loadBand、game.js:178 疲憊 ×0.85；寒顫 ×0.9（SPEC-TIME）
const STATES = [['輕裝', 1], ['疲憊', 0.85], ['寒顫', 0.9], ['常態重負', 0.82], ['超載', 0.6], ['超載過量', 0.4], ['疲憊+寒顫', 0.85 * 0.9], ['常態重負+疲憊+寒顫', 0.82 * 0.85 * 0.9], ['超載+疲憊+寒顫', 0.6 * 0.85 * 0.9], ['超載過量+疲憊+寒顫', 0.4 * 0.85 * 0.9]];
function evalAll(half) {
  const D = data(); const edges = D.EDGES.concat([YANLU]); const rows = [];
  const E = (a, b) => D.EDGES.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const routes = { '官道 灰窯→驛站→渡陰': [E('huiyao', 'yizhan'), E('yizhan', 'duyin')], '私鹽道 灰窯→岔口→後巷': [E('huiyao', 'chakou'), YANLU] };
  let baseEdgeMax = 0, allEdgeMax = 0, baseRouteMax = 0, allRouteMax = 0, legRouteMax = 0;
  STATES.forEach(([sn, sp]) => {
    edges.forEach((e) => {
      const sun = T.routeHours([e], sp, 'sun', half), snow = T.routeHours([e], sp, 'snow', half), d = snow - sun;
      rows.push([half ? 'half' : 'ceil', sn, 'edge', e.a + '-' + e.b + (e.road ? '(官道)' : ''), e.h, sun, snow, d, sun ? d / sun * 100 : 0]);
      if (sn === '輕裝') baseEdgeMax = Math.max(baseEdgeMax, d); allEdgeMax = Math.max(allEdgeMax, d);
    });
    Object.keys(routes).forEach((rn) => {
      const es = routes[rn]; const sun = T.routeHours(es, sp, 'sun', half), snow = T.routeHours(es, sp, 'snow', half), inc = (snow - sun) / sun;
      rows.push([half ? 'half' : 'ceil', sn, 'route', rn, es.reduce((a, e) => a + e.h, 0), sun, snow, snow - sun, inc * 100]);
      if (sn === '輕裝') baseRouteMax = Math.max(baseRouteMax, inc); allRouteMax = Math.max(allRouteMax, inc);
      if (sn === '輕裝') { const ls = es.reduce((a, e) => a + T.routeHours([e], sp, 'sun', half), 0), lw = es.reduce((a, e) => a + T.routeHours([e], sp, 'snow', half), 0); legRouteMax = Math.max(legRouteMax, (lw - ls) / ls); rows.push([half ? 'half' : 'ceil', sn, 'route-逐段停', rn, es.reduce((a, e) => a + e.h, 0), ls, lw, lw - ls, (lw - ls) / ls * 100]); }
    });
  });
  return { rows, baseEdgeMax, allEdgeMax, baseRouteMax, allRouteMax, legRouteMax };
}
function run() {
  const a = evalAll(false), b = evalAll(true);
  writeCsv('T3', ['rounding', 'state', 'kind', 'edge_or_route', 'base_h', 'sun_h', 'snow_h', 'diff_h', 'diff_pct'], a.rows.concat(b.rows));
  const basePass = a.baseEdgeMax <= 1 && a.baseRouteMax <= 0.25 + 1e-9, allPass = a.allEdgeMax <= 1 && a.allRouteMax <= 0.25 + 1e-9;
  const bBase = b.baseEdgeMax <= 1 && b.baseRouteMax <= 0.25 + 1e-9, bAll = b.allEdgeMax <= 1 && b.allRouteMax <= 0.25 + 1e-9;
  const f = (x) => 'ceil 整數時：輕裝 單邊最多 +' + r3(x.baseEdgeMax) + 'h、兩路線最多 +' + r3(x.baseRouteMax * 100) + '%；含疊乘（疲憊／寒顫／重負／超載）單邊最多 +' + r3(x.allEdgeMax) + 'h、路線最多 +' + r3(x.allRouteMax * 100) + '%；輕裝但逐段停（每邊各自取整）路線最多 +' + r3(x.legRouteMax * 100) + '%';
  const lines = ['整數進位（現況 game.js:637，整條路線加總後 ceil）— ' + f(a).replace('ceil 整數時：', ''), '　→ 輕裝基準：' + verdict(basePass) + '；含疊乘全部組合（最保守讀法）：' + verdict(allPass),
    '0.5 小時進位（重跑）— ' + f(b).replace('ceil 整數時：', ''), '　→ 輕裝基準：' + verdict(bBase) + '；含疊乘全部組合：' + verdict(bAll),
    '說明：雪把速度乘 0.85，慢速狀態下基礎時數已被放大數倍，雪多出的 17.6% 必然超過 1 小時（例：超載過量+疲憊+寒顫走 3h 的私鹽道新邊，晴 ' + T.routeHours([YANLU], 0.4 * 0.85 * 0.9, 'sun') + 'h → 雪 ' + T.routeHours([YANLU], 0.4 * 0.85 * 0.9, 'snow') + 'h），與取整方式無關。門檻是否只對輕裝基準成立，列為待決 Q-T3a。'];
  return { id: 'T3', title: '行走取整', measured: '輕裝：單邊 +' + r3(a.baseEdgeMax) + 'h、路線 +' + r3(a.baseRouteMax * 100) + '%；疊乘最壞：單邊 +' + r3(a.allEdgeMax) + 'h、路線 +' + r3(a.allRouteMax * 100) + '%', threshold: '單邊 ≤+1h；兩路線 ≤+25%',
    pass: allPass, passNote: basePass && !allPass ? '輕裝基準通過；疊乘組合未通過（保守讀法判未通過）' : '', suggest: allPass ? '—' : '改 0.5 小時進位，且門檻限定「輕裝基準」', rerun: allPass ? '—' : '0.5h 進位：輕裝 單邊 +' + r3(b.baseEdgeMax) + 'h、路線 +' + r3(b.baseRouteMax * 100) + '%（' + verdict(bBase) + '）；疊乘最壞 單邊 +' + r3(b.allEdgeMax) + 'h、路線 +' + r3(b.allRouteMax * 100) + '%（' + verdict(bAll) + '）', lines };
}
module.exports = { run };
