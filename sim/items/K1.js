'use strict';
// K1 善惡速度
const Wd = require('../lib/world');
const { r3, prob, writeCsv, verdict, prng, median, quantile, clamp } = require('../lib/util');
const SEEDS = 200, DAYS = 360;
const capOf = (K) => (K < 0 ? 0.25 : K < 30 ? 1.2 : K < 100 ? 0.5 : 0.25);
const heavyMult = (K) => (K < 0 ? 0.5 : K < 30 ? 1 : K < 100 ? 0.75 : 0.5);
/* 善良玩法【假設】：每 wday 輕善 2 件（各 +0.25）、中善機率 0.5（+1.5），都有人看見；救援委託完成率 0.7（貼出後 6 天內隨機一天完成）；
 * 每次獸潮在場出力率 0.5（結算日記一件重善 hold_tide）。重善每「重善季」只計 2 件；rule.gap15＝同季第 2 件須與第 1 件相隔 ≥15 個 wday（建議值）。 */
function sim(seed, K0, rule) {
  const W = Wd.run(seed, DAYS, { noQuests: true }); const r = prng(seed, 'K1:' + K0);
  const heavyDays = {}; let supply = 0;
  W.hist.forEach((h) => { if (h.ev.rescue && r() < 0.7) { const d = h.day + Math.floor(r() * 6); (heavyDays[d] = heavyDays[d] || []).push('rescue'); supply++; } });
  W.tideLog.forEach((t) => { if (r() < 0.5) { (heavyDays[t.resolveDay] = heavyDays[t.resolveDay] || []).push('tide'); supply++; } });
  let K = K0; const first = {}; const cnt = {}, lastHeavy = {}; let counted = 0, wasted = 0; const traj = [];
  const mark = () => { [0, 30, 100].forEach((th) => { if (first[th] === undefined && K >= th) first[th] = day; }); };
  let day;
  for (day = 1; day <= DAYS; day++) {
    const wday = day - 1, hs = Math.floor(wday / 30); let got = 0;
    const deed = (v) => { const room = capOf(K) - got; if (room <= 1e-9) return; const a = Math.min(v, room); got += a; K = clamp(K + a, -200, 150); };
    deed(0.25); deed(0.25); if (r() < 0.5) deed(1.5);
    (heavyDays[day] || []).forEach(() => {
      const c = cnt[hs] || 0; const ok = c < 2 && !(rule && rule.gap15 && c === 1 && wday - lastHeavy[hs] < 15);
      if (ok) { K = clamp(K + 12 * heavyMult(K), -200, 150); cnt[hs] = c + 1; lastHeavy[hs] = wday; counted++; } else wasted++;
    });
    mark(); traj.push(K);
  }
  return { first, supply, counted, wasted, traj };
}
function evalRule(rule, bounds, csv, tag) {
  const out = { d0_30: [], d30_100: [], d0_100: [], dm_0: [], dm_100: [], reach100: 0, viol: { a: 0, b: 0, c: 0, d: 0 }, supply: 0, counted: 0, wasted: 0, seasonsShort: 0, seasons: 0 };
  const daily0 = Array(DAYS).fill(0), dailyM = Array(DAYS).fill(0);
  for (let s = 0; s < SEEDS; s++) {
    const a = sim(s, 0, rule), b = sim(s, -100, rule);
    a.traj.forEach((k, i) => (daily0[i] += k)); b.traj.forEach((k, i) => (dailyM[i] += k));
    out.supply += a.supply; out.counted += a.counted; out.wasted += a.wasted;
    if (a.first[30] !== undefined) { out.d0_30.push(a.first[30]); if (a.first[30] < bounds.b) out.viol.b++; }
    if (a.first[100] !== undefined) { out.reach100++; out.d0_100.push(a.first[100]); const d = a.first[100] - a.first[30]; out.d30_100.push(d); if (d < bounds.c) out.viol.c++; }
    if (b.first[0] !== undefined) { out.dm_0.push(b.first[0]); if (b.first[0] < bounds.a) out.viol.a++; }
    if (b.first[100] !== undefined) { out.dm_100.push(b.first[100]); if (b.first[100] < bounds.d) out.viol.d++; }
  }
  for (let i = 0; i < DAYS; i += 5) csv.push([tag, i + 1, daily0[i] / SEEDS, dailyM[i] / SEEDS]);
  return out;
}
const dist = (a, n) => (a.length ? '中位 ' + r3(median(a)) + '、P10 ' + r3(quantile(a, 0.1)) + '、P90 ' + r3(quantile(a, 0.9)) + '、最快 ' + Math.min(...a) + '（達成 ' + a.length + '/' + n + '）' : '360 天內無人達成');
function run() {
  const csv = []; const B0 = { a: 154, b: 15, c: 63.6, d: 233 };
  const o = evalRule(null, B0, csv, '原規則');
  const ok = o.viol.a + o.viol.b + o.viol.c + o.viol.d === 0;
  const lines = ['| 區間 | 天數分布（200 seed） | 手算下限 | 比下限快的 seed | 結果 |', '|---|---|---|---|---|',
    '| −100→0（兇名回到 0） | ' + dist(o.dm_0, SEEDS) + ' | ≥154 | ' + o.viol.a + ' | ' + verdict(!o.viol.a) + ' |',
    '| 0→30（良善） | ' + dist(o.d0_30, SEEDS) + ' | ≥15 | ' + o.viol.b + ' | ' + verdict(!o.viol.b) + ' |',
    '| 30→100（良善到義名） | ' + dist(o.d30_100, SEEDS) + ' | ≥63.6 | ' + o.viol.c + ' | ' + verdict(!o.viol.c) + ' |',
    '| −100→100（兇名到義名） | ' + dist(o.dm_100, SEEDS) + ' | ≥233 | ' + o.viol.d + ' | ' + verdict(!o.viol.d) + ' |',
    '從 0 出發 360 天內到義名：' + prob(o.reach100, SEEDS) + '；到義名天數 ' + dist(o.d0_100, SEEDS) + (o.reach100 / SEEDS < 0.5 ? ' → **警示：重善供給不足**' : ' → 重善供給足夠（每 seed 360 天平均出現 ' + r3(o.supply / SEEDS) + ' 件重善機會、計入 ' + r3(o.counted / SEEDS) + ' 件、被「每季 2 件」擋掉 ' + r3(o.wasted / SEEDS) + ' 件）'),
    '原因：手算下限是「一季的平均速率」（例 0→30：36＋24＝60／季 → 15 天）。實際上兩件重善可以擠在季初（獸潮第 3–4 日就來、救援委託第 3–12 日貼出），0→30 最快只要 (30−24)/1.2＝5 天；長區間同理可以早一個「季初重善」的量。'];
  let sug = '—', rer = '—';
  if (!ok) {
    const p = evalRule({ gap15: true }, B0, csv, '建議值');
    const ok2 = p.viol.a + p.viol.b + p.viol.c + p.viol.d === 0;
    const medOk = median(p.dm_0) >= 154 && median(p.d0_30) >= 15 && median(p.d30_100) >= 63.6 && median(p.dm_100) >= 233;
    lines.push('', '重跑（建議值：同一重善季的第 2 件重善須與第 1 件相隔 ≥15 個 wday；下限不變）：',
      '| 區間 | 天數分布 | 下限 | 比下限快的 seed | 結果 |', '|---|---|---|---|---|',
      '| −100→0 | ' + dist(p.dm_0, SEEDS) + ' | ≥154 | ' + p.viol.a + ' | ' + verdict(!p.viol.a) + ' |', '| 0→30 | ' + dist(p.d0_30, SEEDS) + ' | ≥15 | ' + p.viol.b + ' | ' + verdict(!p.viol.b) + ' |',
      '| 30→100 | ' + dist(p.d30_100, SEEDS) + ' | ≥63.6 | ' + p.viol.c + ' | ' + verdict(!p.viol.c) + ' |', '| −100→100 | ' + dist(p.dm_100, SEEDS) + ' | ≥233 | ' + p.viol.d + ' | ' + verdict(!p.viol.d) + ' |',
      '從 0 出發 360 天內到義名：' + prob(p.reach100, SEEDS) + ' → 整體 ' + verdict(ok2) + '；四個區間的中位數都不快於手算下限：' + (medOk ? '是' : '否'),
      '剩下的超前來自兩處，光靠間隔規則擋不掉：(a) 跨段那一件重善用的是低段倍率（29.9 時 +12，一腳踩到 41.9）；(b) 季末第 2 件與下一季第 1 件可以連著拿（第 29、30 個 wday）。若要「任何 seed 都不快於下限」，下限得再放寬（30→100 理論最快約 46 天），或把手算值當中位數看。列為待決 Q-K1。');
    sug = '同季第 2 件重善須隔 ≥15 wday（0→30 最快由 7 天拉回 ≥15 天）；長區間的手算值改當中位數門檻'; rer = '比下限快的 seed：' + [p.viol.a, p.viol.b, p.viol.c, p.viol.d].join('／') + '（原 ' + [o.viol.a, o.viol.b, o.viol.c, o.viol.d].join('／') + '）；中位數皆 ≥ 下限：' + (medOk ? '是' : '否') + '（' + verdict(ok2) + '）';
  }
  writeCsv('K1', ['rule', 'day', 'mean_K_from_0', 'mean_K_from_-100'], csv);
  return { id: 'K1', title: '善惡速度', measured: '最快：−100→0 ' + (o.dm_0.length ? Math.min(...o.dm_0) : 'NA') + ' 天、0→30 ' + Math.min(...o.d0_30) + ' 天、30→100 ' + Math.min(...o.d30_100) + ' 天、−100→100 ' + (o.dm_100.length ? Math.min(...o.dm_100) : '未達成') + '；比下限快的 seed ' + [o.viol.a, o.viol.b, o.viol.c, o.viol.d].join('／') + '；0→義名 360 天內達成 ' + r3(o.reach100 / SEEDS * 100) + '%', threshold: '無 seed 快於 154／15／63.6／233 天；0→義名達成率報告（<50% 警示）', pass: ok, suggest: sug, rerun: rer, lines };
}
module.exports = { run };
