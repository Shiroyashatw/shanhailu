'use strict';
// B1 跑商（補充；跑商玩家改成平民）。loadOf／legs／expEnc／encCost 等逐行照抄 sim/items/B1.js，只把負重上限（原檔寫死 76）改成參數。
const { g, P, U, CIV, civCleaner, writeCsv } = require('./common');
const T = require('../lib/time');
const { r3, mean, verdict } = U;
const R_ROAD = 1.033, R_WILD_ = 1.042, H = 18, SN = ['春', '夏', '秋', '冬'];
function loadOf(n, cap) { const w = 6 + 2 * n, r = w / cap; return r <= 0.4 ? { sp: 1, over: false, band: '輕裝' } : r <= 0.75 ? { sp: 0.82, over: false, band: '常態重負' } : r <= 1 ? { sp: 0.6, over: true, band: '超載' } : { sp: 0.4, over: true, band: '超載（過量）' }; }
function legs(route) { const D = g.data(); const E = (a, c) => D.EDGES.find((e) => (e.a === a && e.b === c) || (e.a === c && e.b === a)); return route === 'road' ? [[E('huiyao', 'yizhan')], [E('yizhan', 'duyin')]] : [[E('huiyao', 'chakou')], [{ a: 'chakou', b: 'alley', h: 3 }]]; }
function expEnc(route, n, season, depart, cap) {
  const L = loadOf(n, cap); let sum = 0, cnt = 0, hrs = 0;
  for (let seed = 0; seed < 200; seed += 4) for (let d = 0; d < 30; d += 3) {
    let t = (season * 30 + d) * 1440 + depart, e = 0;
    legs(route).forEach((es) => { const wx = T.weatherAt(seed, t); const h = T.routeHours(es, L.sp, wx); const st = T.walkStats(seed, t, h); e += T.riskNew({ base: T.baseRisk(es), R: route === 'road' ? R_ROAD : R_WILD_, meanW: st.meanW, wxRisk: st.wxRisk, over: L.over }).risk; t += h * 60; });
    sum += e; cnt++; hrs += (t - ((season * 30 + d) * 1440 + depart)) / 60;
  }
  return { enc: sum / cnt, hours: hrs / cnt };
}
const encCost = (f, n, mode) => { const fight = f.hpCost * P.HP_SILVER + (1 - f.win) * n * 4; return mode === 'fight' ? fight + 0.5 * H : 0.2 * fight + 0.2 * 1 * H; };
const pchk = (n, sp) => { const q = Math.max(0, n - 16); return q ? Math.min(0.75, (0.10 + 0.04 * q) * sp) : 0; };
const toll = (n, all) => Math.ceil(0.5 * (all ? n : Math.max(0, n - 16)));
function capOf(tpl) { g.setupPlayer(1, tpl); const G = g.inst().G; return { cap: G.carryCap(), ti: G.attrVal('ti'), fuz: G.profLv('fuz'), wt: G.totalWt() }; }
function evalPlayer(pn, f, cap, csv) {
  const res = {};
  [['白天 08:00', 480], ['黑夜 20:00', 1200]].forEach(([dn, dep]) => [0, 1, 2, 3].forEach((s) => [14, 20, 30].forEach((n) => {
    const r = expEnc('road', n, s, dep, cap), d = expEnc('dark', n, s, dep, cap);
    [1.21, 1.0].forEach((sp) => ['fight', 'mix'].forEach((mode) => [false, true].forEach((tollAll) => {
      const c = encCost(f, n, mode), pc = pchk(n, sp);
      const evR = (1 - pc) * n * 5 - pc * n * 4 - r.enc * c, evD = n * 5 - toll(n, tollAll) - d.enc * c;
      csv.push([pn, cap, dn, SN[s], n, loadOf(n, cap).band, sp, mode, tollAll ? 'all' : 'excess', r.enc, d.enc, r.enc * c, d.enc * c, pc, toll(n, tollAll), evR, evD]);
      res[[dn, s, n, sp, mode, tollAll].join('|')] = { evR, evD, rEnc: r.enc, dEnc: d.enc, rCost: r.enc * c, dCost: d.enc * c, pc };
    })));
  })));
  return res;
}
function run() {
  const csv = [], lines = [];
  const cCiv = capOf(CIV), cPed = capOf(P.starters()[4]);
  const players = [
    ['起手・平民', P.duel(CIV, ['bandit'], 300, 31), cCiv.cap],
    ['古窯清理級・平民', P.duel(civCleaner(), ['bandit'], 300, 31), capOf(civCleaner()).cap],
    ['前一輪：起手・行商', P.duel(P.starters()[4], ['bandit'], 300, 31), 76],
  ];
  const R = {}; players.forEach(([pn, f, cap]) => (R[pn] = evalPlayer(pn, f, cap, csv)));
  const avg = (pn, dn, n, k, sp) => mean([0, 1, 2, 3].map((s) => R[pn][[dn, s, n, sp || 1.21, 'fight', false].join('|')][k]));
  lines.push('平民負重上限：`carryCap()`（game.js:157-160）＝round((40＋體魄 ' + cCiv.ti + '×4)×(1＋負重熟練 ' + cCiv.fuz + '×0.005))＝**' + cCiv.cap + '**（前一輪行商：體魄 ' + cPed.ti + ' → ' + cPed.cap + '）。身上裝備重量沿用前一輪的 6（鏽刃＋布衣，與行商起手同一套），鹽每件 2 重：' + [14, 20, 30].map((n) => n + ' 件＝' + (6 + 2 * n) + '/' + cCiv.cap + '＝' + r3((6 + 2 * n) / cCiv.cap) + '→' + loadOf(n, cCiv.cap).band).join('；') + '（檔位與行商上限 76 時相同：' + [14, 20, 30].map((n) => loadOf(n, 76).band).join('／') + '）。');
  lines.push('每次遇敵的期望損失（主模型：每次都是劫匪戰；300 場、種子 31+i，與前一輪相同）：' + players.map(([pn, f]) => pn + ' ' + r3(encCost(f, 20, 'fight')) + ' 兩（失血成本 ' + r3(f.hpCost) + '×0.3＋耽擱 9＋戰敗率 ' + r3(1 - f.win) + '×本錢）').join('；') + '。', '');
  lines.push('| 時段 | 件數 | 玩家 | 官道期望遇敵 | 暗路期望遇敵 | 官道遇險損失（兩） | 暗路遇險損失（兩） | 被查率(S_pub 1.21) | 官道期望利潤 | 暗路期望利潤 |', '|---|---|---|---|---|---|---|---|---|---|');
  ['白天 08:00', '黑夜 20:00'].forEach((dn) => [14, 20, 30].forEach((n) => players.forEach(([pn]) => lines.push('| ' + [dn, n, pn, r3(avg(pn, dn, n, 'rEnc')), r3(avg(pn, dn, n, 'dEnc')), r3(avg(pn, dn, n, 'rCost')), r3(avg(pn, dn, n, 'dCost')), r3(avg(pn, dn, n, 'pc')), r3(avg(pn, dn, n, 'evR')), r3(avg(pn, dn, n, 'evD'))].join(' | ') + ' |'))));
  lines.push('', '（四季平均；主模型＝每次遇險都是劫匪戰、過路費只收超量、S_pub=1.21。逐季、S_pub=1.0、事件五選一、過路費每件都收等組合見 csv。）');
  const verdicts = {};
  ['起手・平民', '古窯清理級・平民'].forEach((pn) => {
    const all = Object.keys(R[pn]).map((k) => ({ k: k.split('|'), v: R[pn][k] })); const prim = (x) => x.k[4] === 'fight' && x.k[5] === 'false' && x.k[3] === '1.21';
    const c1 = all.filter((x) => prim(x) && x.k[2] === '14').every((x) => x.v.evR >= x.v.evD), c2 = all.filter((x) => prim(x) && x.k[2] === '20').every((x) => x.v.evD > x.v.evR);
    const n1 = all.filter((x) => x.k[2] === '14'), n2 = all.filter((x) => x.k[2] === '20');
    verdicts[pn] = { c1, c2 };
    lines.push('- ' + pn + '：① 14 件 官道 ≥ 暗路（白天／黑夜 × 四季）→ **' + verdict(c1) + '**（全部組合成立 ' + n1.filter((x) => x.v.evR >= x.v.evD).length + '/' + n1.length + '）；② 20 件 暗路 > 官道 → **' + verdict(c2) + '**（全部組合成立 ' + n2.filter((x) => x.v.evD > x.v.evR).length + '/' + n2.length + '）。');
  });
  writeCsv('B1', ['player', 'carry_cap', 'time', 'season', 'salt', 'load_band', 'S_pub', 'encounter_model', 'toll_on', 'road_exp_encounters', 'dark_exp_encounters', 'road_enc_cost', 'dark_enc_cost', 'p_checked', 'toll', 'EV_road', 'EV_dark'], csv);
  const pp = '前一輪：起手・行商'; const got = [avg(pp, '白天 08:00', 14, 'evR'), avg(pp, '白天 08:00', 14, 'evD'), avg(pp, '白天 08:00', 20, 'evR'), avg(pp, '白天 08:00', 20, 'evD'), avg(pp, '白天 08:00', 30, 'evR'), avg(pp, '白天 08:00', 30, 'evD')].map(r3).join('／'), exp = '68.335／60.765／41.707／88.765／-54.831／130.070';
  return { lines, verdicts, cap: cCiv.cap, avg, players, reg: ['B1 起手・行商（前一輪口徑）白天四季平均：14 件官道／暗路、20 件官道／暗路、30 件官道／暗路 EV', exp, got, got === exp] };
}
module.exports = { run };
