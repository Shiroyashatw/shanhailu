'use strict';
// S1 第 10 節 B、C 組門檻＋新增條目
const Wd = require('../lib/world');
const { evalB, maxRun } = require('../lib/beval');
const { r3, writeCsv, verdict, mean } = require('../lib/util');
const SEEDS = 200, CS = 50, DAYS = 120;
function run() {
  const lines = [], csv = []; const fails = [];
  const add = (id, txt, th, pass) => { lines.push('| ' + id + ' | ' + txt + ' | ' + th + ' | ' + verdict(pass) + ' |'); csv.push([id, txt, th, pass ? 'pass' : 'FAIL']); if (!pass) fails.push(id); };
  lines.push('| 條目 | 實測 | 門檻 | 結果 |', '|---|---|---|---|');
  const B = evalB({}, SEEDS, DAYS);
  Object.keys(B.C).forEach((k) => add(k, B.C[k].txt, B.C[k].th, B.C[k].pass));
  B.M.daily.forEach((d, i) => csv.push(['B-daily', i + 1, d.hP / d.n, d.dP / d.n, d.hO / d.n, d.dO / d.n, d.hT / d.n, d.dT / d.n, d.B / d.n, d.crew / d.n, d.camp / d.n]));
  // ---- C 組 ----
  const scen = (opts, hook, f) => { const out = []; for (let s = 0; s < CS; s++) out.push(f(Wd.run(s, DAYS, opts, hook))); return out; };
  const allH = (W, id, k) => W.hist.map((h) => h[id][k]);
  // C1 每 10 天各鎮資助 100 兩
  { const base = scen({}, null, (W) => ({ h: mean(allH(W, 'huiyao', 'O')), d: mean(allH(W, 'duyin', 'O')) }));
    const r = scen({}, (W, n) => { if ((n - 1) % 10 === 0) { Wd.donate(W, 'huiyao', 100); Wd.donate(W, 'duyin', 100); } }, (W) => ({ h: mean(allH(W, 'huiyao', 'O')), d: mean(allH(W, 'duyin', 'O')), bad: Wd.TOWNS.some((id) => allH(W, id, 'T').some((t) => t < -1e-9 || t > W.towns[id].T_CAP + 1e-9) || allH(W, id, 'P').some((p) => p < 15 || p > 80) || allH(W, id, 'O').some((o) => o <= 2 || o >= 98)) }));
    const dh = mean(r.map((x) => x.h)) - mean(base.map((x) => x.h)), dd = mean(r.map((x) => x.d)) - mean(base.map((x) => x.d)), bad = r.filter((x) => x.bad).length;
    add('C1', 'ΔO 灰窯 +' + r3(dh) + '（手算 +4.6）、渡陰 +' + r3(dd) + '（手算 +2.3）；T／P／O 越界 seed ' + bad, '灰窯 ≥+3、渡陰 ≥+1.5；無越界', dh >= 3 && dd >= 1.5 && bad === 0); }
  // C2 兩鎮巡邏所 Lv3
  { const r = scen({ init: (W) => { W.towns.huiyao.Lpat = 3; W.towns.duyin.Lpat = 3; } }, null, (W) => ({ o: mean(allH(W, 'huiyao', 'O').concat(allH(W, 'duyin', 'O'))), oh: mean(allH(W, 'huiyao', 'O')), od: mean(allH(W, 'duyin', 'O')), stuck: Wd.TOWNS.some((id) => maxRun(allH(W, id, 'O'), (o) => o >= 98) >= 30), neg: Wd.TOWNS.some((id) => allH(W, id, 'T').some((t) => t < -1e-9)) }));
    const o = mean(r.map((x) => x.o)), oh = mean(r.map((x) => x.oh)), od = mean(r.map((x) => x.od)); const stuck = r.filter((x) => x.stuck).length, neg = r.filter((x) => x.neg).length;
    add('C2', 'O 平均 ' + r3(o) + '（灰窯 ' + r3(oh) + '、渡陰 ' + r3(od) + '）；30 天卡在 O≥98 的 seed ' + stuck + '；T<0 的 seed ' + neg, 'O 65–90；0；T≥0', oh >= 65 && oh <= 90 && od >= 65 && od <= 90 && stuck === 0 && neg === 0); }
  // C3 P_DEF 全 0、玩家不殺獸
  { const r = scen({ params: { P_DEF: [0, 0, 0, 0] } }, null, (W) => ({ low: Wd.TOWNS.some((id) => maxRun(allH(W, id, 'P'), (p) => p <= 16) >= 30), debt: Wd.TOWNS.reduce((a, id) => a + W.hist.filter((h) => h[id].debtToday).length, 0), noUp: Wd.TOWNS.some((id) => maxRun(allH(W, id, 'dP'), (d) => d < 1) >= 60), minP: Math.min(...allH(W, 'huiyao', 'P'), ...allH(W, 'duyin', 'P')) }));
    const low = r.filter((x) => x.low).length, debt = r.reduce((a, x) => a + x.debt, 0) / (CS * 2 * DAYS), noUp = r.filter((x) => x.noUp).length;
    add('C3', '30 天連續 P≤16 的 seed ' + low + '（P 最低 ' + r3(Math.min(...r.map((x) => x.minP))) + '）；欠餉日 ' + r3(debt * 100) + '%；連續 60 天無 ΔP≥+1 的 seed ' + noUp, '0；≤25%；0', low === 0 && debt <= 0.25 && noUp === 0); }
  // C4 每 2 天殺 4 名劫匪
  { const r = scen({}, (W, n) => { if (n % 2 === 0) Wd.killBandits(W, 4); }, (W) => ({ neg: W.hist.some((h) => h.B < 0 || h.crew < 0), lock: maxRun(W.hist.map((h) => h.crew), (c) => c === 0), bad: W.wipedBad, ev: W.wipedEvents, B: mean(W.hist.map((h) => h.B)) }));
    const neg = r.filter((x) => x.neg).length, lock = Math.max(...r.map((x) => x.lock)), bad = r.reduce((a, x) => a + x.bad, 0);
    add('C4', 'B／crew 為負的 seed ' + neg + '；crew=0 最長連續 ' + lock + ' 天；未回到 ≥1 就重複觸發「據點被端」' + bad + ' 次（每 seed 觸發 ' + r3(mean(r.map((x) => x.ev))) + ' 次，B 平均 ' + r3(mean(r.map((x) => x.B))) + '）', '0；≤10 天；0', neg === 0 && lock <= 10 && bad === 0); }
  // C5 開局 T=T_CAP
  { const r = scen({ init: (W) => Wd.TOWNS.forEach((id) => (W.towns[id].T = W.towns[id].T_CAP)) }, null, (W) => ({ over: Wd.TOWNS.some((id) => allH(W, id, 'T').some((t) => t > W.towns[id].T_CAP + 1e-9 || t < 0)), logs: Math.max(W.towns.huiyao.remitLogs, W.towns.duyin.remitLogs), remitDays: Wd.TOWNS.reduce((a, id) => a + W.hist.filter((h) => h[id].remit > 0).length, 0), tiers: W.hist.filter((h) => h.huiyao.tier === 'full').length }));
    const over = r.filter((x) => x.over).length, logs = Math.max(...r.map((x) => x.logs));
    add('C5', 'T 越界 seed ' + over + '；上繳日 ' + r3(mean(r.map((x) => x.remitDays)) / 2) + ' 天／鎮；上繳日誌最多 ' + logs + ' 則／鎮／120 天', 'T≤T_CAP；日誌 ≤12（每 10 天最多 1 次）', over === 0 && logs <= 12); }
  // ---- 另驗 ----
  { let minD = Infinity; const ds = [];
    for (let s = 0; s < SEEDS; s++) { const a = Wd.run(s, 3, {}), b = Wd.run(s, 3, { init: (W) => Wd.donate(W, 'huiyao', 100) }); const d = b.towns.huiyao.O - a.towns.huiyao.O; ds.push(d); if (d < minD) minD = d; }
    add('D1', '第 3 日日結後灰窯 O 差：平均 +' + r3(mean(ds)) + '、最小 +' + r3(minD) + '（手算 +2.71）', '≥+2', minD >= 2); }
  { let diff = 0;
    for (let s = 0; s < SEEDS; s++) { const a = Wd.run(s, DAYS, {}), b = Wd.run(s, DAYS, {}, (W, n) => { if ((n - 1) % 10 === 0) Wd.donate(W, 'huiyao', 100); }); const k = (W) => W.tideLog.map((t) => t.start + t.town + t.end).join('|') + '#' + W.tideStarts.join(','); if (k(a) !== k(b)) diff++; }
    add('J4', '有／無資助時獸潮開始日、目標鎮、結束日不同的 seed：' + diff + '/' + SEEDS, '0', diff === 0); }
  { const W = Wd.run(0, 1, { pnoiseOff: true }); const h = W.towns.huiyao, d = W.towns.duyin;
    add('A1', '第 1 日（NOISE=0）灰窯 T=' + r3(h.T) + '、渡陰 T=' + r3(d.T) + '；P ' + h.P + '/' + d.P + '、O ' + h.O + '/' + d.O + '、B ' + W.B, '203.45／303.47；P/O/B 不變', Math.abs(h.T - 203.45) < 1e-6 && Math.abs(d.T - 303.47) < 1e-6 && h.P === 50 && d.P === 45 && h.O === 55 && d.O === 60 && W.B === 30);
    const b = h.brief; add('A7', '灰窯第 1 日 brief：In ' + b.treasuryIn + '、Out ' + b.treasuryOut + '、Net ' + (b.treasuryNet >= 0 ? '+' : '') + b.treasuryNet + '、Tier ' + b.treasuryTier, '18／15／+3／ok', b.treasuryIn === 18 && b.treasuryOut === 15 && b.treasuryNet === 3 && b.treasuryTier === 'ok'); }
  { const W = Wd.newWorld(0, { pnoiseOff: true }); W.towns.huiyao.T = 10; W.towns.huiyao.incOverride = 0; let t3 = null, cut = null, resc = null; const tr = [];
    for (let n = 1; n <= 3; n++) { const h = Wd.tick(W); tr.push(r3(h.huiyao.T)); if (n === 3) { t3 = W.towns.huiyao.T; cut = W.towns.huiyao.taxCut; resc = h.huiyao.rescue; } }
    add('A-欠餉', '灰窯 T=10、Inc=0：日 1–3 T=' + tr.join('→') + '；日 3 求援=' + resc + '、taxCut=' + cut, '日 3 T=100、taxCut 10', t3 === 100 && cut === 10 && resc === true); }
  { const W = Wd.newWorld(0, {}); Wd.donate(W, 'huiyao', 100); const l = []; for (let n = 1; n <= 5; n++) { Wd.tick(W); l.push(W.towns.huiyao.aidDaysLeft); }
    add('A-資助', '資助 100 兩 aidDaysLeft 日 1–5＝' + l.join('/'), '4/3/2/1/0', l.join('/') === '4/3/2/1/0'); }
  // B11 細節與建議門檻
  let sug = '—', rer = '—';
  if (!B.C.B11.pass) {
    let over = 0, mx = 0, firstDay = [];
    for (let sd = 0; sd < SEEDS; sd++) { const W = Wd.run(sd, DAYS, { noQuests: true }); const i = W.hist.findIndex((h) => h.camp > 79); if (i >= 0) { over++; firstDay.push(i + 1); } mx = Math.max(mx, ...W.hist.map((h) => h.camp)); }
    let mx360 = 0; for (let sd = 0; sd < SEEDS; sd++) { const W = Wd.run(sd, 360, { noQuests: true }); mx360 = Math.max(mx360, ...W.hist.map((h) => h.camp)); }
    const ok2 = B.M.conserveBad === 0 && B.M.campMin >= 60 && mx360 <= 82;
    lines.push('B11 細節：camp 超過 79 的 seed ' + over + '/' + SEEDS + '（最早第 ' + Math.min(...firstDay) + ' 日，120 天內最大 ' + mx + '；跑到 360 天最大 ' + mx360 + '）。原因：受創日 arrive=4–5 > settle=3，camp 每個受創鎮日 +1，要到 80 才 settle=4。守恆式與 camp≥0 都成立。');
    sug = 'B11 的 camp 上界改 82（理論上界：79+5−3=81；80–82 時 settle=4、arrive≤5，再多 1）'; rer = '同一批資料以 60–82 判定（含 360 天延伸，最大 ' + mx360 + '）：' + verdict(ok2);
    lines.push('重跑（建議值 camp 60–82）：' + verdict(ok2));
  }
  writeCsv('S1', ['id_or_Bdaily', 'measured_or_day', 'threshold_or_huiyaoP', 'pass_or_duyinP', 'huiyaoO', 'duyinO', 'huiyaoT', 'duyinT', 'B', 'crew', 'camp'], csv);
  const total = csv.filter((c) => c[0] !== 'B-daily').length;
  return { id: 'S1', title: 'B、C 組門檻＋新增條目', measured: (total - fails.length) + '/' + total + ' 條通過' + (fails.length ? '；未通過：' + fails.join('、') : '') + '（P 平均 灰窯 ' + r3(B.avgP.huiyao) + '、渡陰 ' + r3(B.avgP.duyin) + '；B 平均 ' + r3(B.avgB) + '）', threshold: 'B1–B11、C1–C5、D1、J4、A1、A7、欠餉、資助 全過', pass: fails.length === 0, fails, suggest: sug, rerun: rer, lines, B };
}
module.exports = { run };
