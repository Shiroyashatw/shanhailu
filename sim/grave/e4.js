'use strict';
/* E4 經濟不失控：盜墓各策略（亂墳、古塚、亂墳＋古塚混合）60／120 天累積淨收入，對照第一批委託與商隊曲線。
 * 合法曲線一律沿用 evidence/ 既有結果（不重算）：
 *   委託＝evidence/csv-civ/K5.csv 的 silver_curve_day（sim/civ/k5.js：QUEST_GEN 一般單，起始 60 兩，每日生活 14 兩）；
 *   商隊＝evidence/csv-civ/B1.csv（sim/civ/b1.js：14 件，白天 08:00 出發，主模型 fight／過路費只收超量／S_pub 1.21）每趟期望利潤，一天一趟、扣生活 14。 */
const fs = require('fs');
const path = require('path');
const { U, g, CIV, CLEAN, writeCsv, r2 } = require('./common');
const GZ = require('./guzhong');
const Y = require('./yard');
const DAYS = 120, SEEDS = 200;
function readCsv(rel) { const t = fs.readFileSync(path.join(U.ROOT, rel), 'utf8').trim().split('\n'); const h = t[0].split(','); return t.slice(1).map((l) => { const c = l.split(','); const o = {}; h.forEach((k, i) => (o[k] = c[i])); return o; }); }
function legal() {
  const k5 = readCsv('evidence/csv-civ/K5.csv').filter((r) => r.row === 'silver_curve_day');
  const quest = { s: Array(DAYS + 1).fill(null), c: Array(DAYS + 1).fill(null) };
  k5.forEach((r) => { const d = +r.a; quest.s[d] = +r.b; quest.c[d] = +r.c; });
  const b1 = readCsv('evidence/csv-civ/B1.csv').filter((r) => r.time === '白天 08:00' && r.salt === '14' && r.S_pub === '1.210' && r.encounter_model === 'fight' && r.toll_on === 'excess');
  const SN = ['春', '夏', '秋', '冬']; const ev = {};
  b1.forEach((r) => { ev[r.player + '|' + r.season] = { road: +r.EV_road, dark: +r.EV_dark }; });
  const car = (pn, k) => { const a = Array(DAYS + 1).fill(null); let s = 60; for (let d = 1; d <= DAYS; d++) { const e = ev[pn + '|' + SN[Math.floor((d - 1) / 30) % 4]]; s += (k === 'best' ? Math.max(e.road, e.dark) : e[k]) - 14; a[d] = s; } return a; };
  return { quest, car: { s: { road: car('起手・平民', 'road'), dark: car('起手・平民', 'dark'), best: car('起手・平民', 'best') }, c: { road: car('古窯清理級・平民', 'road'), dark: car('古窯清理級・平民', 'dark'), best: car('古窯清理級・平民', 'best') } }, ev };
}
/* 古塚每日一趟（灰窯出發；主室冷卻好的那天取 2，其餘日子只有原本掉落）；每晚老窯客棧 8＋熱湯 3×2＝14 兩；死亡即結束（之後曲線持平）。 */
function guzDays(seed, tpl, d0, d1, policy, kk, silver0, take) {
  const { G } = g.inst(); const r = U.prng(seed, 'E4gz:' + kk); const st = GZ.newState(0); const cur = []; let silver = silver0, dead = null;
  for (let d = d0; d <= d1; d++) {
    if (dead === null) {
      GZ.prepDay(G, null, 2, d === d0, tpl, 50000 + 1000 * kk + seed);
      const x = GZ.trip(r, st, { door: 'front', take: take || 2, pots: 2, policy, walk: true, day: d, seed });
      silver -= 14; if (x.dead) dead = d; else silver += x.value;
    }
    cur[d] = silver;
  }
  return { cur, dead };
}
function run(E3, log) {
  const L = legal(); const lines = [], csv = [];
  const curves = []; // {name, player, arr[d] 平均現銀, inv}
  const mean = (arrs, d) => U.mean(arrs.map((a) => a[d]));
  // 亂墳（E3 的結果）
  E3.R.forEach(({ G, A }) => { const arr = A.curve.slice(); const arrI = A.curveInv.slice(); curves.push({ kind: '亂墳', name: Y.STRATS[G.sk].name + '・' + (G.mt === 'quick' ? '快撬' : '細取') + '・取' + G.tk, pi: G.pi, cur: arr, curI: arrI, post: A.postIncome.length ? U.mean(A.postIncome) : null, postN: A.postIncome.length, steady: A.postSteady.length ? U.mean(A.postSteady) : null, exh: U.median(A.exhaust.filter((x) => x !== null)) }); });
  // 古塚 120 天
  let kk = 110;
  [[CIV, 0], [CLEAN(), 1]].forEach(([tpl, pi]) => ['careful', 'rest'].forEach((pol) => {
    if (pi === 0 && pol === 'rest') return;
    const runs = []; let deaths = 0; for (let s = 0; s < SEEDS; s++) { const x = guzDays(s, tpl, 1, DAYS, pol, kk, 60); runs.push(x.cur); if (x.dead) deaths++; }
    const arr = Array(DAYS + 1).fill(null); for (let d = 1; d <= DAYS; d++) arr[d] = mean(runs, d);
    curves.push({ kind: '古塚', name: '古塚每日正門（' + (pol === 'rest' ? '層間回滿・上界' : '量力') + '）', pi, cur: arr, curI: arr, deaths }); kk++; if (log) log('E4 古塚 ' + tpl.name + ' ' + pol);
  }));
  // 混合：亂墳黑夜探過避窗・快撬・取 3 挖到庫存見底（exhaustDay；沒挖完就第 60 日）→ 庫存按 0.65 折現 → 轉古塚每日
  [[CIV, 0], [CLEAN(), 1]].forEach(([tpl, pi]) => ['careful', 'rest'].forEach((pol) => {
    if (pi === 0 && pol === 'rest') return;
    const grp = E3.R.find(({ G }) => G.pi === pi && G.sk === 'night_probe' && G.mt === 'quick' && G.tk === 3);
    const runs = []; let deaths = 0;
    grp.G.runs.forEach((x, s) => {
      const D = x.status === 'dead' ? DAYS : Math.min(60, x.st.exhaustDay || 60); const cur = [];
      for (let d = 1; d <= D; d++) cur[d] = x.log.traj[d + 1].silver;
      if (D < DAYS) { const s0 = x.log.traj[D + 1].silver + x.log.traj[D + 1].inv * 0.65; const z = guzDays(s, tpl, D + 1, DAYS, pol, kk, s0); for (let d = D + 1; d <= DAYS; d++) cur[d] = z.cur[d]; if (z.dead) deaths++; }
      runs.push(cur);
    });
    const arr = Array(DAYS + 1).fill(null); for (let d = 1; d <= DAYS; d++) arr[d] = mean(runs, d);
    curves.push({ kind: '混合', name: '亂墳（黑夜探過避窗・快撬・取3）挖完→古塚每日（' + (pol === 'rest' ? '層間回滿・上界' : '量力') + '）', pi, cur: arr, curI: arr, deaths }); kk++; if (log) log('E4 混合 ' + tpl.name + ' ' + pol);
  }));
  const PN = ['起手・平民', '古窯清理級・平民']; const key = ['s', 'c'];
  let ok1 = true, ok2 = true, okS = true; const fails = [];
  [0, 1].forEach((pi) => {
    const q = L.quest[key[pi]], cr = L.car[key[pi]];
    const best60 = Math.max(q[60], cr.road[60], cr.dark[60], cr.best[60]) - 60, best120 = Math.max(q[120], cr.best[120]) - 60;
    lines.push('', '### ' + PN[pi], '', '合法曲線（累積淨收入＝現銀−起始 60 兩）：委託 第 60 日 ' + r2(q[60] - 60) + '、第 120 日 ' + r2(q[120] - 60) + '（出處 evidence/csv-civ/K5.csv）；商隊 14 件 官道 ' + r2(cr.road[60] - 60) + '／' + r2(cr.road[120] - 60) + '、暗路 ' + r2(cr.dark[60] - 60) + '／' + r2(cr.dark[120] - 60) + '、每季取較好的一條 ' + r2(cr.best[60] - 60) + '／' + r2(cr.best[120] - 60) + '（出處 evidence/csv-civ/B1.csv）。合法最佳 60 天 ' + r2(best60) + ' → 1.3 倍＝' + r2(1.3 * best60) + '。', '',
      '| 類別 | 策略 | 第 60 日累積淨收入 | 含庫存（×0.65） | ÷合法最佳 | ≤1.3 | 第 120 日 | 挖空日（中位） | 庫存見底後日收入（判 ≤4.5） | 見底 10 天後起算 | 死亡 |', '|---|---|---|---|---|---|---|---|---|---|---|');
    curves.filter((c) => c.pi === pi).forEach((c) => {
      const v60 = c.cur[60] - 60, v60i = c.curI[60] - 60, ratio = v60i / best60; const ok = ratio <= 1.3; if (!ok) { ok1 = false; fails.push(PN[pi] + '・' + c.name + ' ' + U.r3(ratio)); }
      let postTxt = '—'; if (c.post !== null && c.post !== undefined) { const okp = c.post <= 4.5; if (!okp) ok2 = false; postTxt = r2(c.post) + '（' + c.postN + ' seeds）' + (okp ? '' : ' **>4.5**'); }
      const stTxt = c.steady !== null && c.steady !== undefined ? r2(c.steady) + (c.steady <= 4.5 ? '' : ' **>4.5**') : '—'; if (c.steady !== null && c.steady !== undefined && c.steady > 4.5) okS = false;
      lines.push('| ' + [c.kind, c.name, r2(v60), r2(v60i), U.r3(ratio), ok ? '是' : '**否**', r2(c.cur[120] - 60), c.exh !== undefined && c.exh !== null && !Number.isNaN(c.exh) ? r2(c.exh) : '—', postTxt, stTxt, c.deaths !== undefined ? c.deaths + '/200' : '見 E3'].join(' | ') + ' |');
    });
    for (let d = 1; d <= DAYS; d++) { csv.push([PN[pi], '合法', '委託(K5)', d, q[d] - 60]); csv.push([PN[pi], '合法', '商隊官道14件(B1)', d, cr.road[d] - 60]); csv.push([PN[pi], '合法', '商隊暗路14件(B1)', d, cr.dark[d] - 60]); curves.filter((c) => c.pi === pi).forEach((c) => csv.push([PN[pi], c.kind, c.name, d, c.cur[d] - 60, c.curI[d] - 60])); }
  });
  writeCsv('E4-curves', ['player', 'kind', 'strategy', 'day', 'cum_net_silver', 'cum_net_with_inventory065'], csv);
  return { lines, ok1, ok2, okS, fails, curves, L };
}
module.exports = { run, legal, guzDays };
