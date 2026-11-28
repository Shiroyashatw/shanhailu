'use strict';
// K5 銀兩曲線與財庫
const Wd = require('../lib/world');
const P = require('../lib/players');
const S4 = require('./S4');
const { data } = require('../lib/game');
const { hours } = require('./T5');
const { r3, prob, writeCsv, verdict, prng, median, quantile, mean } = require('../lib/util');
const { maxRun } = require('../lib/beval');
const SEEDS = 200, DAYS = 120;
/* 標準玩法收入模型【假設】（以灰窯為根據地）：
 * - 每天委託板 3 張（data.js:417），種類權重 45/35/20、內容照 data.js:419-422 隨機；玩家當天目標 1 或 2 張（各半），
 *   從板上「14 小時內做得完」的委託裡隨機挑；做不完的不接。每天的板子重抽（不模擬隔日殘留）。
 * - collect：到最近產地採／獵（時數＝來回＋採集；藥草 1h 得 1.5、礦 2h 得 1，game.js:1244-1250；獸皮／生肉／蛭腺靠追蹤獵殺），獎勵 round(灰窯價×數量×1.8)+6（game.js:899）。
 * - kill：時數、掉落、藥錢、成功率沿用 S4 的模型。deliver：24 兩（押金退還），送渡陰 4h 或破曉營 6h，當天折返（來回時數）。
 * - 生活費：客棧 8 兩＋熱湯 3 兩×2＝14 兩／日（game.js:804）。不買裝備、不賣採集物、不跑商。 */
const SRC = { herb_zx: ['qingwu', 1, 1.5], leaf_qx: ['qingwu', 1, 1.5], vine_du: ['fuzhao', 1, 1.5], ore_fe: ['chishi', 2, 1], ore_cu: ['chishi', 2, 1], bog_iron: ['fuzhao', 2, 1], hide: ['kugu', 'wolf', 1.5], meat: ['kugu', 'wolf', 1], leech_gland: ['fuzhao', 'leech', 1] };
function questTable(tpls, cache) {
  const D = data(), G = D.QUEST_GEN, pr = D.PRICES.huiyao; const t = { collect: [], kill: [], deliver: [] };
  const avg = (f) => mean(tpls.map(f));
  G.collect.pool.forEach(([item, cnt]) => {
    const [node, per, yieldEach] = SRC[item]; const reward = Math.round(pr[item] * cnt * 1.8) + 6; const acts = Math.ceil(cnt / yieldEach);
    let h = 2 * hours('huiyao', node), cost = 0, pWin = 1;
    if (typeof per === 'number') h += acts * per; else { h += acts; cost = avg((tp) => { const k = tp.name + '|' + per; const f = cache[k] || (cache[k] = P.duel(tp, [per], 150, 100)); return acts * f.hpCost * P.HP_SILVER; }); pWin = avg((tp) => Math.pow(cache[tp.name + '|' + per].win, acts)); }
    t.collect.push({ name: '收購' + D.ITEMS[item].name + '×' + cnt, hours: h, income: pWin * reward - cost });
  });
  G.kill.pool.forEach(([e, n, rw]) => t.kill.push({ name: '獵殺' + D.ENEMIES[e].name + '×' + n, hours: avg((tp) => S4.questRate(tp, e, n, rw, cache).hours), income: avg((tp) => S4.questRate(tp, e, n, rw, cache).income) }));
  ['duyin', 'poxiao'].forEach((to) => t.deliver.push({ name: '送貨至' + D.NODES[to].name, hours: 2 * hours('huiyao', to), income: G.deliver.reward }));
  return t;
}
function incomeSim(tab, seeds, goal) {
  goal = goal || 400;
  const D = data(); const days400 = []; const daily = Array(DAYS).fill(0); let reach = 0, sumInc = 0, nq = 0;
  for (let s = 0; s < seeds; s++) {
    const r = prng(s, 'K5'); let silver = D.ORIGINS[s % D.ORIGINS.length].silver, hit = null;
    for (let d = 1; d <= DAYS; d++) {
      const board = [0, 1, 2].map(() => { const u = r() * 100; const k = u < 45 ? 'collect' : u < 80 ? 'kill' : 'deliver'; return tab[k][Math.floor(r() * tab[k].length)]; });
      const want = r() < 0.5 ? 1 : 2; let used = 0, done = 0;
      while (done < want) { const c = board.filter((q) => !q._t && used + q.hours <= 14); if (!c.length) break; const q = c[Math.floor(r() * c.length)]; board[board.indexOf(q)] = Object.assign({}, q, { _t: 1 }); used += q.hours; silver += q.income; sumInc += q.income; nq++; done++; }
      silver -= 14;
      if (hit === null && silver >= goal) hit = d;
      daily[d - 1] += silver;
    }
    if (hit !== null) { reach++; days400.push(hit); }
  }
  return { days400, reach, daily: daily.map((x) => x / seeds), perDay: sumInc / (seeds * DAYS), questsPerDay: nq / (seeds * DAYS) };
}
function treasury(payDay) {
  const out = { day30debt: 0, negT: 0, backOk: 0, maxDebtRun: 0, rescues: 0, paid: [], anomalies: 0, debtDays: 0 };
  for (let s = 0; s < SEEDS; s++) {
    const W = Wd.run(s, DAYS, { noQuests: true }, (w, n) => { if (n === payDay) out.paid.push(Wd.payBounty(w, 'huiyao', 640)); });
    const h = W.hist.map((x) => x.huiyao); if (h.some((x) => x.T < -1e-9)) out.negT++;
    const win = h.slice(payDay - 1, payDay + 29); const run = maxRun(win, (x) => x.debtToday); out.maxDebtRun = Math.max(out.maxDebtRun, run); out.debtDays += win.filter((x) => x.debtToday).length;
    out.rescues += win.filter((x) => x.rescue).length;
    const back = win.slice(1).some((x) => x.tier !== 'debt'); if (back) out.backOk++; if (win[win.length - 1].tier === 'debt') out.day30debt++;
    if (run > 3 || win.some((x) => x.P <= 16 || x.T > W.towns.huiyao.T_CAP + 1e-9)) out.anomalies++;
  }
  return out;
}
function run() {
  const cache = {}; const csv = [];
  const tabS = questTable(P.starters(), cache), tabC = questTable(P.cleaners(), cache);
  const a = incomeSim(tabS, SEEDS), b = incomeSim(tabC, SEEDS);
  a.daily.forEach((v, i) => csv.push(['silver_curve', i + 1, v, b.daily[i]]));
  Object.keys(tabS).forEach((k) => tabS[k].forEach((q, i) => csv.push(['quest:' + q.name, r3(q.hours) + 'h', q.income, tabC[k][i].income])));
  const med = median(a.days400), medC = median(b.days400); const c3 = med >= 30 && med <= 120 && a.reach >= SEEDS / 2;
  const t60 = treasury(60), t10 = treasury(10), t100 = treasury(90);
  [['pay_day60', t60], ['pay_day10', t10], ['pay_day90', t100]].forEach(([n, t]) => csv.push([n, 'paid=' + r3(mean(t.paid)), t.rescues / SEEDS, t.maxDebtRun]));
  writeCsv('K5', ['row', 'day_or_hours', 'starter_silver_or_income', 'cleaner_silver_or_income'], csv);
  const c1 = [t60, t10, t100].every((t) => t.negT === 0), c2 = [t60, t10, t100].every((t) => t.backOk === SEEDS && t.anomalies === 0);
  const lines = ['| 玩家 | 每日淨收入（兩） | 每日完成張數 | 400 兩達成率 | 天數 中位／P10／P90 |', '|---|---|---|---|---|',
    '| 出身起手 | ' + r3(a.perDay - 14) + '（委託 ' + r3(a.perDay) + ' − 生活 14） | ' + r3(a.questsPerDay) + ' | ' + prob(a.reach, SEEDS) + ' | ' + r3(med) + '／' + r3(quantile(a.days400, 0.1)) + '／' + r3(quantile(a.days400, 0.9)) + ' |',
    '| 古窯清理級（對照） | ' + r3(b.perDay - 14) + ' | ' + r3(b.questsPerDay) + ' | ' + prob(b.reach, SEEDS) + ' | ' + r3(medC) + '／' + r3(quantile(b.days400, 0.1)) + '／' + r3(quantile(b.days400, 0.9)) + ' |',
    '③ 起手玩家攢到 400 兩（贖罪 W=60）中位 ' + r3(med) + ' 天（門檻 30–120）→ ' + verdict(c3),
    '| 灰窯賞金實付日 | 實付（min(640,T)）平均 | T<0 的 seed | 30 天內欠餉日／seed | 最長連續欠餉 | 求援次數／seed | 第 30 天 tier≠debt | 其他異常 seed |', '|---|---|---|---|---|---|---|---|'];
  [['第 60 日', t60], ['第 10 日', t10], ['第 90 日', t100]].forEach(([n, t]) => lines.push('| ' + [n, r3(mean(t.paid)), t.negT, r3(t.debtDays / SEEDS), t.maxDebtRun, r3(t.rescues / SEEDS), prob(t.backOk, SEEDS) + '（' + t.day30debt + '）', t.anomalies].join(' | ') + ' |'));
  lines.push('① T 恆 ≥0 → ' + verdict(c1) + '；② 實付後 30 天內回到 tier≠debt、除「連續 ≤3 天欠餉（第 3 天求援）」外無異常 → ' + verdict(c2));
  lines.push('註：灰窯財庫 120 天內從 200 兩慢慢長到約 340 兩，640 兩的賞金永遠付不滿（實付＝當時全部庫銀）；付完之後靠當日稅收（≈16–18）勉強夠付軍費 15，P 被獸潮壓低的日子會零星欠餉 1 天，沒有連續 3 天、沒有觸發求援。');
  let sug = '—', rer = '—';
  if (!c3) {
    const goal = 700; const a2 = incomeSim(tabS, SEEDS, goal), b2 = incomeSim(tabC, SEEDS, goal); const m2 = median(a2.days400), ok2 = m2 >= 30 && m2 <= 120;
    lines.push('', '重跑（建議值：W=60 的贖罪金 400→' + goal + ' 兩）：起手中位 ' + r3(m2) + ' 天（P10 ' + r3(quantile(a2.days400, 0.1)) + '、P90 ' + r3(quantile(a2.days400, 0.9)) + '）、古窯清理級中位 ' + r3(median(b2.days400)) + ' 天 → ' + verdict(ok2),
      '提醒：這個收入模型不買裝備、不買藥以外的東西，也不算跑商與賣採集物；真實玩家前兩週會把 100–300 兩花在裝備上，400 兩實際會比 ' + r3(med) + ' 天晚。門檻要不要照「淨存款」算，列為待決 Q-K5。');
    sug = 'W=60 贖罪金 400→' + goal + ' 兩（或確認 400 兩是「扣掉裝備支出後」的口徑）'; rer = '贖罪金 ' + goal + '：起手中位 ' + r3(m2) + ' 天（' + verdict(ok2) + '）';
  }
  return { id: 'K5', title: '銀兩曲線與財庫', measured: '400 兩中位 ' + r3(med) + ' 天（清理級 ' + r3(medC) + '）；實付後 T≥0：' + (c1 ? '是' : '否') + '；30 天內最長連續欠餉 ' + Math.max(t60.maxDebtRun, t10.maxDebtRun, t100.maxDebtRun) + ' 天、求援 ' + r3(t60.rescues / SEEDS) + ' 次／seed', threshold: '①T≥0 ②30 天內回到 tier≠debt、無異常 ③中位 30–120 天', pass: c1 && c2 && c3, passNote: c1 && c2 && !c3 ? '①②通過；③未通過' : '', suggest: sug, rerun: rer, lines };
}
module.exports = { run };
