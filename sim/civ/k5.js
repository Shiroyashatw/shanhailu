'use strict';
// K5 銀兩曲線與財庫（補充；平民單一起手）。questTable／incomeSim／treasury 逐行照抄 sim/items/K5.js；唯一差別：起始銀兩固定 60（不再 seed%6 輪出身）。
const { P, U, CIV, civCleaner, writeCsv, pw } = require('./common');
const Wd = require('../lib/world');
const S4 = require('../items/S4');
const { data } = require('../lib/game');
const { hours } = require('../items/T5');
const { maxRun } = require('../lib/beval');
const { r3, prng, median, quantile, mean, verdict } = U;
const SEEDS = 200, DAYS = 120;
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
function incomeSim(tab, seeds, goal, startSilver) {
  const days400 = []; const daily = Array(DAYS).fill(0); let reach = 0, sumInc = 0, nq = 0;
  for (let s = 0; s < seeds; s++) {
    const r = prng(s, 'K5'); let silver = startSilver, hit = null;
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
function run(cache) {
  cache = cache || {}; const csv = []; const START = data().ORIGINS.find((o) => o.id === 'drifter').silver;
  const tabS = questTable([CIV], cache), tabC = questTable([civCleaner()], cache);
  const lines = ['起始銀兩 ' + START + '（data.js:529 drifter；兩組都用 ' + START + '）。200 seed × 120 天，亂數 prng(seed,\'K5\')（與前一輪相同）。', '', '| 贖罪金 | 玩家 | 每日淨收入（兩） | 每日完成張數 | 達成率 | 天數 中位／P10／P90 | 門檻（中位 30–120 天） | 通過與否 |', '|---|---|---|---|---|---|---|---|'];
  const out = {};
  [400, 700].forEach((goal) => {
    const a = incomeSim(tabS, SEEDS, goal, START), b = incomeSim(tabC, SEEDS, goal, START);
    [[CIV.name, a, true], [civCleaner().name + '（對照）', b, false]].forEach(([n, x, judged]) => {
      const med = median(x.days400); const ok = med >= 30 && med <= 120 && x.reach >= SEEDS / 2;
      lines.push('| ' + [goal + ' 兩', n, r3(x.perDay - 14) + '（委託 ' + r3(x.perDay) + ' − 生活 14）', r3(x.questsPerDay), pw(x.reach, SEEDS), r3(med) + '／' + r3(quantile(x.days400, 0.1)) + '／' + r3(quantile(x.days400, 0.9)), judged ? '30–120' : '—', judged ? verdict(ok) : '（對照，不判）'].join(' | ') + ' |');
      csv.push(['goal_' + goal, n, x.perDay - 14, x.questsPerDay, x.reach / SEEDS, med, quantile(x.days400, 0.1), quantile(x.days400, 0.9)]);
      if (judged) out['g' + goal] = { med, ok, p10: quantile(x.days400, 0.1), p90: quantile(x.days400, 0.9), perDay: x.perDay - 14 }; else out['c' + goal] = { med };
    });
    if (goal === 400) a.daily.forEach((v, i) => csv.push(['silver_curve_day', i + 1, v, b.daily[i], '', '', '', '']));
  });
  Object.keys(tabS).forEach((k) => tabS[k].forEach((q, i) => csv.push(['quest:' + q.name, r3(q.hours) + 'h', q.income, tabC[k][i].income, '', '', '', ''])));
  const t60 = treasury(60), t10 = treasury(10), t90 = treasury(90);
  const c1 = [t60, t10, t90].every((t) => t.negT === 0), c2 = [t60, t10, t90].every((t) => t.backOk === SEEDS && t.anomalies === 0);
  lines.push('', '| 灰窯賞金實付日 | 實付（min(640,T)）平均 | T<0 的 seed | 30 天內欠餉日／seed | 最長連續欠餉 | 求援次數／seed | 30 天內回到 tier≠debt | 其他異常 seed |', '|---|---|---|---|---|---|---|---|');
  [['第 60 日', t60], ['第 10 日', t10], ['第 90 日', t90]].forEach(([n, t]) => { lines.push('| ' + [n, r3(mean(t.paid)), t.negT, r3(t.debtDays / SEEDS), t.maxDebtRun, r3(t.rescues / SEEDS), pw(t.backOk, SEEDS), t.anomalies].join(' | ') + ' |'); csv.push(['treasury_' + n, 'paid=' + r3(mean(t.paid)), t.negT, t.debtDays / SEEDS, t.maxDebtRun, t.rescues / SEEDS, t.backOk / SEEDS, t.anomalies]); });
  lines.push('', '① T 恆 ≥0 → **' + verdict(c1) + '**；② 實付後 30 天內回到 tier≠debt、除「連續 ≤3 天欠餉」外無異常 → **' + verdict(c2) + '**（財庫模型不含玩家，這兩項與出身無關，本輪重跑只為確認數字與前一輪一致：前一輪實付平均 300.977／224.877／341.256）。');
  lines.push('③ 起手・平民：400 兩中位 ' + r3(out.g400.med) + ' 天 → **' + verdict(out.g400.ok) + '**；700 兩中位 ' + r3(out.g700.med) + ' 天 → **' + verdict(out.g700.ok) + '**（門檻 30–120 天）。');
  writeCsv('K5', ['row', 'a', 'b', 'c', 'd', 'e', 'f', 'g'], csv);
  return { lines, out, c1, c2, START, t60 };
}
module.exports = { run };
