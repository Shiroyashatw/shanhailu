'use strict';
// B1 暗路 vs 官道遇險成本
const g = require('../lib/game');
const T = require('../lib/time');
const P = require('../lib/players');
const { r3, writeCsv, verdict, mean } = require('../lib/util');
const R_ROAD = 1.033, R_WILD_ = 1.042, H = 18, SN = ['春', '夏', '秋', '冬']; // R 取 S3 不介入 120 天平均（4.131%/4%、22.916%/22%）
/* 【假設】
 * - 跑商玩家＝行商出身起手（體魄 9 → 負重上限 76，game.js:157-160；身上裝備 6 重）；鹽每件 2 重（data.js:25）→ 14／20 件「常態重負」（速度 0.82）、30 件「超載」（速度 0.6、遇險 ×1.4，game.js:169-175,647）。
 * - 官道 2 段各擲一次（base 0.04×R_road）；私鹽道 2 段各擲一次（非官道單段 base 0.22×R_wild；game.js:644）。稅卡在第 2 段（驛站↔渡陰關）。
 * - 每次遇險＝一場劫匪戰（S4 的戰鬥模擬）：損失＝失血×(9/30) 兩＋耽擱 0.5h×H＋戰敗機率×整批本錢。對照：照 data.js:466 五選一事件（只有 1/5 是劫匪、1/5 繞路 1h）。
 * - 過路費只對超量部分（鹽＋生鐵 −16）收 0.5 兩／件（ceil）；對照：每件都收。被查＝失去整批本錢（買價 4）。利潤 5 兩／件。 */
function loadOf(n) { const cap = 76, w = 6 + 2 * n, r = w / cap; return r <= 0.4 ? { sp: 1, over: false } : r <= 0.75 ? { sp: 0.82, over: false } : r <= 1 ? { sp: 0.6, over: true } : { sp: 0.4, over: true }; }
function legs(route) { const D = g.data(); const E = (a, c) => D.EDGES.find((e) => (e.a === a && e.b === c) || (e.a === c && e.b === a)); return route === 'road' ? [[E('huiyao', 'yizhan')], [E('yizhan', 'duyin')]] : [[E('huiyao', 'chakou')], [{ a: 'chakou', b: 'alley', h: 3 }]]; }
function expEnc(route, n, season, depart) { // 期望遇敵數（對該季 200 seed×30 天的天候取平均）
  const L = loadOf(n); let sum = 0, cnt = 0, hrs = 0;
  for (let seed = 0; seed < 200; seed += 4) for (let d = 0; d < 30; d += 3) {
    let t = (season * 30 + d) * 1440 + depart, e = 0;
    legs(route).forEach((es) => { const wx = T.weatherAt(seed, t); const h = T.routeHours(es, L.sp, wx); const st = T.walkStats(seed, t, h); e += T.riskNew({ base: T.baseRisk(es), R: route === 'road' ? R_ROAD : R_WILD_, meanW: st.meanW, wxRisk: st.wxRisk, over: L.over }).risk; t += h * 60; });
    sum += e; cnt++; hrs += (t - ((season * 30 + d) * 1440 + depart)) / 60;
  }
  return { enc: sum / cnt, hours: hrs / cnt };
}
function run() {
  const st = P.starters()[4], cl = P.cleaners()[4]; // 行商
  const fS = P.duel(st, ['bandit'], 300, 31), fC = P.duel(cl, ['bandit'], 300, 31);
  const encCost = (f, n, mode) => { const fight = f.hpCost * P.HP_SILVER + (1 - f.win) * n * 4; return mode === 'fight' ? fight + 0.5 * H : 0.2 * fight + 0.2 * 1 * H; };
  const csv = [], lines = []; const res = {};
  const pchk = (n, sp) => { const q = Math.max(0, n - 16); return q ? Math.min(0.75, (0.10 + 0.04 * q) * sp) : 0; };
  const toll = (n, all) => Math.ceil(0.5 * (all ? n : Math.max(0, n - 16)));
  [['白天 08:00', 480], ['黑夜 20:00', 1200]].forEach(([dn, dep]) => [0, 1, 2, 3].forEach((s) => {
    [14, 20, 30].forEach((n) => {
      const r = expEnc('road', n, s, dep), d = expEnc('dark', n, s, dep);
      [1.21, 1.0].forEach((sp) => [['起手行商', fS], ['古窯清理級行商', fC]].forEach(([pn, f]) => ['fight', 'mix'].forEach((mode) => [false, true].forEach((tollAll) => {
        const c = encCost(f, n, mode), pc = pchk(n, sp);
        const evR = (1 - pc) * n * 5 - pc * n * 4 - r.enc * c, evD = n * 5 - toll(n, tollAll) - d.enc * c;
        csv.push([dn, SN[s], n, sp, pn, mode, tollAll ? 'all' : 'excess', r.enc, d.enc, r.enc * c, d.enc * c, pc, toll(n, tollAll), evR, evD]);
        res[[dn, s, n, sp, pn, mode, tollAll].join('|')] = { evR, evD, rEnc: r.enc, dEnc: d.enc, rCost: r.enc * c, dCost: d.enc * c, pc };
      }))));
    });
  }));
  writeCsv('B1', ['time', 'season', 'salt', 'S_pub', 'player', 'encounter_model', 'toll_on', 'road_exp_encounters', 'dark_exp_encounters', 'road_enc_cost', 'dark_enc_cost', 'p_checked', 'toll', 'EV_road', 'EV_dark'], csv);
  const sel = (dn, n, sp, pn, mode, tollAll) => [0, 1, 2, 3].map((s) => res[[dn, s, n, sp, pn, mode, tollAll].join('|')]);
  const avg = (a, k) => mean(a.map((x) => x[k]));
  lines.push('每次遇敵的期望損失（主模型：每次都是劫匪戰）：起手行商 ' + r3(encCost(fS, 20, 'fight')) + ' 兩（失血 ' + r3(fS.hpCost) + '×0.3＋耽擱 9＋戰敗率 ' + r3(1 - fS.win) + '×本錢）；古窯清理級行商 ' + r3(encCost(fC, 20, 'fight')) + ' 兩。');
  lines.push('| 時段 | 件數 | 官道期望遇敵 | 暗路期望遇敵 | 官道遇險成本 | 暗路遇險成本 | 被查率(1.21) | 官道 EV(1.21) | 暗路 EV | 官道 EV(S_pub=1.0) |', '|---|---|---|---|---|---|---|---|---|---|');
  ['白天 08:00', '黑夜 20:00'].forEach((dn) => [14, 20, 30].forEach((n) => { const a = sel(dn, n, 1.21, '起手行商', 'fight', false), b = sel(dn, n, 1.0, '起手行商', 'fight', false);
    lines.push('| ' + [dn, n, r3(avg(a, 'rEnc')), r3(avg(a, 'dEnc')), r3(avg(a, 'rCost')), r3(avg(a, 'dCost')), r3(avg(a, 'pc')), r3(avg(a, 'evR')), r3(avg(a, 'evD')), r3(avg(b, 'evR'))].join(' | ') + ' |'); }));
  lines.push('（上表為起手行商、四季平均；逐季、古窯清理級、事件五選一模型、過路費每件都收等組合見 csv。）');
  const all = Object.keys(res).map((k) => ({ k: k.split('|'), v: res[k] }));
  const chk = (f, cond) => all.filter(f).every(cond), cnt = (f, cond) => { const a = all.filter(f); return a.filter(cond).length + '/' + a.length; };
  const prim = (x) => x.k[4] === '起手行商' && x.k[5] === 'fight' && x.k[6] === 'false';
  const c1 = chk((x) => prim(x) && x.k[2] === '14' && x.k[3] === '1.21', (x) => x.v.evR >= x.v.evD), c2 = chk((x) => prim(x) && x.k[2] === '20' && x.k[3] === '1.21', (x) => x.v.evD > x.v.evR);
  const c2b = chk((x) => prim(x) && x.k[2] === '20' && x.k[3] === '1', (x) => x.v.evD > x.v.evR);
  lines.push('① 14 件：官道 EV ≥ 暗路 EV（S_pub=1.21；白天／黑夜 × 四季）→ ' + verdict(c1) + '；全部組合（含對照模型）成立 ' + cnt((x) => x.k[2] === '14', (x) => x.v.evR >= x.v.evD) + '。');
  lines.push('② 20 件：暗路 EV > 官道 EV（S_pub=1.21）→ ' + verdict(c2) + '；S_pub=1.0 對照 → ' + verdict(c2b) + '；全部組合成立 ' + cnt((x) => x.k[2] === '20', (x) => x.v.evD > x.v.evR) + '。');
  const a30 = sel('白天 08:00', 30, 1.21, '起手行商', 'fight', false);
  lines.push('30 件（超載，遇險 ×1.4）：官道 EV ' + r3(avg(a30, 'evR')) + '（被查率封頂 0.75）、暗路 EV ' + r3(avg(a30, 'evD')) + '。');
  const a14 = sel('白天 08:00', 14, 1.21, '起手行商', 'fight', false), a20 = sel('白天 08:00', 20, 1.21, '起手行商', 'fight', false);
  return { id: 'B1', title: '暗路 vs 官道遇險成本', measured: '白天四季平均：14 件 官道 ' + r3(avg(a14, 'evR')) + '／暗路 ' + r3(avg(a14, 'evD')) + '；20 件 官道 ' + r3(avg(a20, 'evR')) + '／暗路 ' + r3(avg(a20, 'evD')) + '；期望遇敵 官道 ' + r3(avg(a20, 'rEnc')) + '、暗路 ' + r3(avg(a20, 'dEnc')), threshold: '①≤14 件 官道 ≥ 暗路 ②20 件 暗路 > 官道', pass: c1 && c2, suggest: '—', rerun: '—', lines };
}
module.exports = { run };
