'use strict';
// T5 營業衝擊
const T = require('../lib/time');
const { data, inst } = require('../lib/game');
const { r3, prob, writeCsv, verdict, prng } = require('../lib/util');
const SEEDS = 200, DAYS = 30;
let HRS = null;
function hours(a, b) { // 最短路時數（data.js EDGES；全圖已知）
  if (!HRS) { const D = data(); HRS = {}; const ns = Object.keys(D.NODES); ns.forEach((x) => { HRS[x] = {}; ns.forEach((y) => (HRS[x][y] = x === y ? 0 : Infinity)); }); D.EDGES.forEach((e) => { HRS[e.a][e.b] = HRS[e.b][e.a] = e.h; }); ns.forEach((k) => ns.forEach((i) => ns.forEach((j) => { if (HRS[i][k] + HRS[k][j] < HRS[i][j]) HRS[i][j] = HRS[i][k] + HRS[k][j]; }))); }
  return HRS[a][b];
}
const WILD = ['chakou', 'qingwu', 'chishi', 'kugu', 'fuzhao'];
function simulate(policy, closeAt) {
  let tries = 0, closed = 0; const byHour = Array(24).fill(0), closedByHour = Array(24).fill(0);
  for (let seed = 0; seed < SEEDS; seed++) {
    const r = prng(seed, 'T5'); let t = T.DAY_START, town = 'huiyao';
    while (T.dayOf(t) <= DAYS) {
      const m = T.minOfDay(t);
      if (m >= 22 * 60 || m < 8 * 60) { t = T.wakeNew(t); continue; }
      // 抽任務：採集／委託（去野外再回同一鎮）／往返兩鎮
      const k = Math.floor(r() * 3); let dur, dest = town;
      if (k === 2) { dest = town === 'huiyao' ? 'duyin' : 'huiyao'; dur = hours(town, dest); }
      else { const cand = WILD.filter((w) => hours(town, w) <= 4); const w = cand[Math.floor(r() * cand.length)]; dur = 2 * hours(town, w) + (k === 0 ? 1 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2)); }
      const end = t + dur * 60;
      if (policy === 'fit' && end > (T.dayOf(t) - 1) * 1440 + 22 * 60) { t = (T.dayOf(t) - 1) * 1440 + 22 * 60; continue; } // 來不及 22:00 前回城就收工
      t = end; town = dest;
      const type = ['market', 'apoth', 'smith'][Math.floor(r() * 3)];
      tries++; const h = Math.floor(T.minOfDay(t) / 60); byHour[h]++;
      if (!T.shopOpen(type, t, closeAt)) { closed++; closedByHour[h]++; }
    }
  }
  return { tries, closed, byHour, closedByHour };
}
function run() {
  const a = simulate('fit'), b = simulate('any'), a20 = simulate('fit', 1200), b20 = simulate('any', 1200);
  writeCsv('T5', ['policy', 'close_at', 'arrive_hour', 'arrivals', 'closed'], [['fit', 19, a], ['any', 19, b], ['fit', 20, a20], ['any', 20, b20]].flatMap(([p, c, x]) => x.byHour.map((n, h) => [p, c, h, n, x.closedByHour[h]])));
  const pa = a.closed / a.tries, pb = b.closed / b.tries; const ok = pa <= 0.30; const okB = pb <= 0.30;
  const lines = ['主腳本（來不及在 22:00 前回城就不出發）：遇打烊 ' + prob(a.closed, a.tries) + ' → ' + verdict(ok),
    '對照腳本（22:00 前都照樣出發，可能半夜才回城）：遇打烊 ' + prob(b.closed, b.tries) + ' → ' + verdict(okB),
    '退路（關門改 20:00）：主腳本 ' + prob(a20.closed, a20.tries) + '；對照腳本 ' + prob(b20.closed, b20.tries) + '。',
    '抵達時刻分布見 csv；任務時數全取自 data.js:187-206 EDGES 最短路。'];
  return { id: 'T5', title: '營業衝擊', measured: '遇打烊 ' + r3(pa * 100) + '%（對照腳本 ' + r3(pb * 100) + '%）', threshold: '≤30%', pass: ok, passNote: ok && !okB ? '主腳本通過；「不看時間照樣出發」的對照腳本 >30%' : '',
    suggest: ok && okB ? '—' : '關門退到 20:00（mumi 已定退路）', rerun: ok && okB ? '—' : '20:00 關門：主腳本 ' + r3(a20.closed / a20.tries * 100) + '%（' + verdict(a20.closed / a20.tries <= 0.3) + '）、對照 ' + r3(b20.closed / b20.tries * 100) + '%（' + verdict(b20.closed / b20.tries <= 0.3) + '）', lines };
}
module.exports = { run, hours };
