'use strict';
// T6 禦寒點數（量測＋健全檢查）
const T = require('../lib/time');
const { data } = require('../lib/game');
const { r3, writeCsv, verdict } = require('../lib/util');
const SEEDS = 200, WIN0 = 90 * 1440;
function walk(seed, warm, route, forcedWx) {
  // 起點日：冬季第 1–30 日輪流（seed%30）；固定雪天用冬季第 1 日
  const day0 = WIN0 + (forcedWx ? 0 : (seed % 30) * 1440);
  const b = T.newBody({ onlyCold: true, warm }); let t; const t00 = () => t;
  const wxNow = () => T.weatherAt(seed, t, forcedWx);
  const hrs = (edges) => T.routeHours(edges, b.cold >= 90 ? 0.8 : b.cold >= 60 ? 0.9 : 1, wxNow()); // 出發時定時數（game.js:637）＋寒顫／凍僵減速
  const D = data(); const E = (a, c) => D.EDGES.find((e) => (e.a === a && e.b === c) || (e.a === c && e.b === a));
  if (route === 'road') { t = day0 + 480; t = T.advance(b, t, hrs([E('huiyao', 'yizhan'), E('yizhan', 'duyin')]) * 60, { seed, place: 'wild', act: 'awake', forcedWx }); }
  else if (route === 'night') { t = day0 + 1200; t = T.advance(b, t, hrs([E('huiyao', 'chakou')]) * 60, { seed, place: 'wild', act: 'awake', forcedWx }); t = T.advance(b, t, hrs([E('huiyao', 'chakou')]) * 60, { seed, place: 'wild', act: 'awake', forcedWx }); }
  else { t = day0 + 1200; t = T.advance(b, t, (route === 'walk72' ? 72 : 24) * 60, { seed, place: 'wild', act: 'awake', forcedWx }); }
  const start = route === 'road' ? day0 + 480 : day0 + 1200;
  return { b, start, hours: (t - start) / 60 };
}
function run() {
  const routes = [['road', '灰窯→渡陰官道 白天 08:00'], ['night', '灰窯↔野徑岔口 黑夜 20:00 往返'], ['walk24', '20:00 起連續野外行走 24h']];
  const csv = [], lines = ['| 路線 | 天候 | warm | 發冷≥30 | 寒顫≥60 | 凍僵≥90 | 寒意100 | 凍死 | 終點寒意(平均) | 首次寒顫(平均,出發後h) |', '|---|---|---|---|---|---|---|---|---|---|'];
  routes.forEach(([rk, rn]) => [null, 'snow'].forEach((fw) => [0, 1, 2, 3, 4].forEach((warm) => {
    const n = fw ? 1 : SEEDS; const c = { c30: 0, c60: 0, c90: 0, c100: 0, dead: 0 }; let end = 0; const t60 = [], t30 = [], t90 = [];
    for (let s = 0; s < n; s++) { const o = walk(s, warm, rk, fw); const f = o.b.tFirst; if (f.cold30 !== undefined) { c.c30++; t30.push((f.cold30 - o.start) / 60); } if (f.cold60 !== undefined) { c.c60++; t60.push((f.cold60 - o.start) / 60); } if (f.cold90 !== undefined) { c.c90++; t90.push((f.cold90 - o.start) / 60); } if (f.cold100 !== undefined) c.c100++; if (o.b.dead) c.dead++; end += o.b.cold; }
    const av = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
    csv.push([rn, fw ? '固定雪' : '真抽樣', warm, n, c.c30 / n, c.c60 / n, c.c90 / n, c.c100 / n, c.dead / n, end / n, av(t30), av(t60), av(t90)]);
    lines.push('| ' + [rn, fw ? '固定雪' : '真抽樣×' + n, warm, r3(c.c30 / n), r3(c.c60 / n), r3(c.c90 / n), r3(c.c100 / n), r3(c.dead / n), r3(end / n), r3(av(t60))].join(' | ') + ' |');
  })));
  writeCsv('T6', ['route', 'weather', 'warm', 'n', 'p_cold30', 'p_cold60', 'p_cold90', 'p_cold100', 'p_dead', 'mean_end_cold', 'mean_h_to_30', 'mean_h_to_60', 'mean_h_to_90'], csv);
  // 健全檢查 ①：warm=0、20:00 起冬雪連續行走、只算寒冷、滿血 80
  const o = walk(0, 0, 'walk72', 'snow'); const f = o.b.tFirst;
  const tShiver = T.fmtClock(f.cold60), t100 = T.fmtClock(f.cold100), dH = (f.dead - f.cold60) / 60;
  const s1 = tShiver === '04:34' && t100 === '12:45' && Math.abs(dH - 34.0) <= 1;
  // 健全檢查 ②：warm=4 冬晴白天全程 0 寒顫（08:00–17:00 野外，冬季 30 天逐日）
  let shiver = 0, maxC = 0;
  for (let d = 0; d < 30; d++) { const b = T.newBody({ onlyCold: true, warm: 4 }); T.advance(b, WIN0 + d * 1440 + 480, 540, { seed: 0, place: 'wild', act: 'awake', forcedWx: 'sun' }); if (b.tFirst.cold60 !== undefined) shiver++; maxC = Math.max(maxC, b.maxCold); }
  const s2 = shiver === 0;
  lines.push('健全檢查 ①（warm=0、20:00 起冬雪、只算寒冷、滿血 80）：' + tShiver + ' 進寒顫（手算 04:34）、' + t100 + ' 到 100（手算 12:45）、自寒顫起 ' + r3(dH) + ' 小時凍死（手算 34.0，誤差 ≤1h）→ ' + verdict(s1));
  lines.push('健全檢查 ②（warm=4、冬晴、08:00–17:00 野外，冬季 30 天逐日）：寒顫 ' + shiver + ' 次、寒意最高 ' + r3(maxC) + ' → ' + verdict(s2));
  lines.push('註：本項只算寒冷（飽食、疲累不扣），24h 內沒有任何組合凍死；真抽樣的起點日為冬季第 (seed%30)+1 日，含換季日（S_eff=2）。');
  const ok = s1 && s2;
  return { id: 'T6', title: '禦寒點數（量測）', measured: '健全①：' + tShiver + '／' + t100 + '／' + r3(dH) + 'h；健全②：寒顫 ' + shiver + ' 次', threshold: '量測；健全①04:34／12:45／34.0h(±1h)；②0 寒顫', pass: ok, suggest: '—', rerun: '—', lines };
}
module.exports = { run };
