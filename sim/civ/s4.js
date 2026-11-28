'use strict';
// S4 剿匪委託報酬（平民單一起手）。questRate／evalGroup 逐行照抄 sim/items/S4.js，只把「劫匪每頭掉落平均」改成參數（原檔的 BANDIT_LOOT 是模組私有變數，外面設不到）。
const { P, U, CIV, civCleaner, writeCsv } = require('./common');
const { data } = require('../lib/game');
const { hours } = require('../items/T5');
const { r3, mean, verdict } = U;
const N = 150, R_WILD = 1.042;
const WHERE = { wolf: 'kugu', boar: 'kugu', bug: 'qingwu', leech: 'fuzhao', deserter: 'chakou', bogcorpse: 'fuzhao', bandit: 'chakou' };
function lootValue(id, bl) {
  if (id === 'bandit' && bl !== null && bl !== undefined) return bl;
  const D = data(), E = D.ENEMIES[id], pr = D.PRICES.huiyao; let v = 0; const av = (r) => (r[0] + r[1]) / 2;
  if (E.silver) v += av(E.silver);
  if (E.beast) { v += av(E.skin) * pr.hide + av(E.meat) * pr.meat; if (E.extra) v += pr[E.extra]; }
  if (E.drop) v += E.drop[1] * pr[E.drop[0]];
  return v;
}
function questRate(tpl, enemy, need, reward, cache, bl) {
  const D = data(); const key = tpl.name + '|' + enemy; const f = cache[key] || (cache[key] = P.duel(tpl, [enemy], N, 100));
  const fb = cache[tpl.name + '|bandit'] || (cache[tpl.name + '|bandit'] = P.duel(tpl, ['bandit'], N, 100));
  const node = WHERE[enemy], rh = hours('huiyao', node), base = rh > 1 ? 0.30 : 0.22, risk = Math.min(0.85, base * R_WILD);
  let h = 2 * rh + need, extra = 0;
  if (enemy === 'bug') { const gathers = need / D.WILDS.qingwu.ambush.p; h = 2 * rh + gathers; extra = gathers * 1.5 * D.PRICES.huiyao.herb_zx; }
  const enc = 2 * risk;
  h += enc * 0.2 * 1;
  const pWin = Math.pow(f.win, need) * Math.pow(fb.win, enc * 0.2);
  const heal = (need * f.hpCost + enc * 0.2 * fb.hpCost) * P.HP_SILVER;
  const income = pWin * (reward + need * lootValue(enemy, bl) + extra) + enc * 0.2 * fb.win * lootValue('bandit', bl) - heal;
  return { enemy, need, reward, hours: h, income, rate: income / h, pWin, heal, loot: need * lootValue(enemy, bl) + extra, win1: f.win, hpCost1: f.hpCost };
}
function evalGroup(tpls, rw2, rw4, cache, bl) {
  const D = data(); const rows = []; const ex = [], b2 = [], b4 = [];
  tpls.forEach((t) => {
    D.QUEST_GEN.kill.pool.forEach(([e, n, rw]) => { const q = questRate(t, e, n, rw, cache, bl); q.who = t.name; q.kind = '現有'; rows.push(q); ex.push(q); });
    [[2, rw2], [4, rw4]].forEach(([n, rw]) => { const q = questRate(t, 'bandit', n, rw, cache, bl); q.who = t.name; q.kind = '劫匪'; rows.push(q); (n === 2 ? b2 : b4).push(q); });
  });
  const tw = (a) => a.reduce((s, q) => s + q.income, 0) / a.reduce((s, q) => s + q.hours, 0);
  const exRate = tw(ex), bRate = tw(b2.concat(b4));
  return { rows, exRate, b2: tw(b2), b4: tw(b4), bRate, ratio: bRate / exRate, ratio2: tw(b2) / exRate, ratio4: tw(b4) / exRate };
}
const inband = (x) => x >= 0.8 && x <= 1.25;
/* 回歸：六種出身合併的兩組，規格值與前一輪建議值，應重現前一輪結果檔的數字。 */
function regression(cache) {
  const gs = [P.starters(), P.cleaners()];
  const a = gs.map((ts) => evalGroup(ts, 36, 76, cache, null)), b = gs.map((ts) => evalGroup(ts, 23, 33, cache, 5));
  const got = [a[0].exRate, a[0].ratio2, a[0].ratio4, a[1].exRate, a[1].ratio2, a[1].ratio4, b[0].ratio2, b[0].ratio4, b[1].ratio2, b[1].ratio4].map(r3).join('／');
  const exp = '5.603／2.264／3.138／6.776／2.253／3.096／0.897／0.819／1.127／1.184';
  return { rows: [['S4 六出身合併（前一輪口徑）：規格值 起手 現有兩/時／×2／×4、清理級 同；建議值 起手 ×2／×4、清理級 ×2／×4', exp, got, got === exp]], ok: got === exp };
}
function run(cache) {
  cache = cache || {};
  const groups = [['出身起手＝起手・平民', [CIV]], ['古窯清理級＝古窯清理級・平民', [civCleaner()]]];
  const csv = [], lines = [], rounds = [], searchCsv = [];
  const doRound = (tag, lootTxt, bl, rw2, rw4) => {
    const res = groups.map(([gn, ts]) => { const r = evalGroup(ts, rw2, rw4, cache, bl); r.name = gn; r.rows.forEach((q) => csv.push([tag, gn, q.who, q.kind, q.enemy, q.need, q.reward, q.hours, q.loot, q.heal, q.pWin, q.income, q.rate])); return r; });
    const ok = res.every((r) => inband(r.ratio2) && inband(r.ratio4));
    const o = { tag, lootTxt, bl, rw2, rw4, res, ok }; rounds.push(o); return o;
  };
  const spec = doRound('規格值', '8–20', null, 36, 76);
  const prev = doRound('前一輪建議值', '3–7', 5, 23, 33);
  let neo = null, searchNote = '';
  if (!prev.ok) {
    // 只動賞金與掉落：掉落平均 L（範圍 L−2..L+2）從前一輪的 5 起、由近到遠試；每個 L 下 ×2、×4 賞金各自取整數、使兩組比值的 max|ln 比值| 最小。第一個四個比值都進區間的 L 就採用。
    const dev = (rs, k) => Math.max(...rs.map((r) => Math.abs(Math.log(Math.max(1e-9, r[k])))));
    const best = (L, n) => { let b = null; for (let rw = 0; rw <= 200; rw++) { const rs = groups.map(([, ts]) => evalGroup(ts, n === 2 ? rw : 0, n === 4 ? rw : 0, cache, L)); const k = n === 2 ? 'ratio2' : 'ratio4'; const d = dev(rs, k); if (!b || d < b.d) b = { rw, d, v: rs.map((r) => r[k]) }; } return b; };
    const tried = []; const out = (v) => Math.max(0, ...v.map((x) => (x < 0.8 ? Math.log(0.8 / Math.max(1e-9, x)) : x > 1.25 ? Math.log(x / 1.25) : 0)));
    const rangeOf = (L) => { const lo = Math.max(0, Math.floor(L - 2)); return lo + '–' + (2 * L - lo); };
    const Ls = []; for (let i = 0; i <= 28; i++) Ls.push(i / 2); Ls.sort((x, y) => Math.abs(x - 5) - Math.abs(y - 5) || x - y);
    for (const L of Ls) {
      const x2 = best(L, 2), x4 = best(L, 4); const ok = x2.v.every(inband) && x4.v.every(inband); const viol = Math.max(out(x2.v), out(x4.v)); tried.push({ L, x2, x4, ok, viol });
      searchCsv.push([L, rangeOf(L), x2.rw, x2.v[0], x2.v[1], x4.rw, x4.v[0], x4.v[1], ok ? 'yes' : 'no']);
    }
    const feas = tried.filter((t) => t.ok);
    const least = tried.slice().sort((x, y) => x.viol - y.viol || Math.abs(x.L - 5) - Math.abs(y.L - 5))[0];
    const pickT = feas[0] || tried.find((t) => t.L === 5); // 沒有可行解時：掉落維持前一輪的 3–7（改動最小），只重解賞金
    neo = doRound('平民專用建議值', rangeOf(pickT.L), pickT.L, pickT.x2.rw, pickT.x4.rw);
    const show = (t) => '掉落平均 ' + t.L + '（' + rangeOf(t.L) + '）：×2 賞 ' + t.x2.rw + ' → ' + t.x2.v.map(r3).join('／') + '；×4 賞 ' + t.x4.rw + ' → ' + t.x4.v.map(r3).join('／') + '（' + (t.ok ? '可行' : '不可行') + '）';
    searchNote = '搜尋方式（只動賞金與掉落，只做這一輪）：掉落平均 L 取 0–14、每 0.5 一格共 ' + tried.length + ' 個；每個 L 下 ×2、×4 賞金各取 0–200 的整數、使兩組比值離 1 最近（max|ln 比值| 最小）。四個比值都進 0.8–1.25 的 L 有 **' + feas.length + ' 個**' + (feas.length ? '，取離前一輪掉落（平均 5）最近的一個。' : '；因此建議值取「掉落維持前一輪的 3–7、只重解賞金」重跑，結果如上表第三列，**仍未通過**（29 個 L 之中超出區間最少的是 ' + show(least) + '，同樣不可行，而且差別只在小數第三位，不值得為此把掉落改回去）。') + ' 離前一輪掉落最近的五個 L：' + tried.slice(0, 5).map(show).join('；') + '。完整搜尋表見 `evidence/csv-civ/S4-search.csv`（欄位依序為 起手・平民／古窯清理級・平民 的比值）。';
    if (!feas.length) { const t = pickT; searchNote += ' 原因：同一張賞金下兩組的比值之比 ×4 為 ' + r3(t.x4.v[1] / t.x4.v[0]) + '、×2 為 ' + r3(t.x2.v[1] / t.x2.v[0]) + '，而區間寬度只有 1.25/0.8＝1.5625；起手・平民每頭劫匪的失血成本是清理級的數倍（見下方單挑），×4 把這個差距放大到超過區間寬度。'; }
  }
  lines.push('| 列 | 劫匪掉落（兩／頭） | 賞金 ×2／×4 | 玩家 | 現有 kill 委託（兩/時，時間加權） | 劫匪×2（兩/時） | 劫匪×4（兩/時） | ×2 比值 | ×4 比值 | 合計比值 | 門檻 | 通過與否 |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  rounds.forEach((o) => o.res.forEach((r) => lines.push('| ' + [o.tag, o.lootTxt, o.rw2 + '／' + o.rw4, r.name, r3(r.exRate), r3(r.b2), r3(r.b4), r3(r.ratio2), r3(r.ratio4), r3(r.ratio), '四個比值皆 0.8–1.25', verdict(inband(r.ratio2) && inband(r.ratio4)) + '（整列：' + verdict(o.ok) + '）'].join(' | ') + ' |')));
  lines.push('');
  rounds.forEach((o) => lines.push('- ' + o.tag + '（掉落 ' + o.lootTxt + '、賞金 ' + o.rw2 + '／' + o.rw4 + '）：' + o.res.map((r) => r.name.split('＝')[1] + ' ×2 ' + r3(r.ratio2) + '、×4 ' + r3(r.ratio4)).join('；') + ' → **' + verdict(o.ok) + '**'));
  if (searchNote) lines.push('', searchNote);
  // 單挑明細
  const duelRow = (t) => ['wolf', 'boar', 'bug', 'leech', 'deserter', 'bogcorpse', 'bandit'].map((e) => { const f = cache[t.name + '|' + e]; return data().ENEMIES[e].name + ' 勝率 ' + r3(f.win) + '／失血成本 ' + r3(f.hpCost); }).join('；');
  lines.push('', '單挑（每種敵人 ' + N + ' 場、種子 100+i，與前一輪相同；失血成本＝淨失血＋喝掉的藥×30，單位：生命點）：', '- ' + CIV.name + '：' + duelRow(CIV), '- ' + civCleaner().name + '：' + duelRow(civCleaner()));
  const ex = spec.res.map((r) => r.rows.filter((q) => q.kind === '現有'));
  lines.push('', '現有 kill 委託逐張（規格值列；兩/時〔時數／成功率〕）：', '', '| 委託 | 起手・平民 | 古窯清理級・平民 |', '|---|---|---|');
  ex[0].forEach((q, i) => lines.push('| ' + [data().ENEMIES[q.enemy].name + '×' + q.need + '（賞 ' + q.reward + '）', r3(q.rate) + '〔' + r3(q.hours) + 'h／' + r3(q.pWin) + '〕', r3(ex[1][i].rate) + '〔' + r3(ex[1][i].hours) + 'h／' + r3(ex[1][i].pWin) + '〕'].join(' | ') + ' |'));
  if (searchCsv.length) writeCsv('S4-search', ['loot_mean', 'loot_range', 'best_reward_x2', 'x2_ratio_starter_civ', 'x2_ratio_cleaner_civ', 'best_reward_x4', 'x4_ratio_starter_civ', 'x4_ratio_cleaner_civ', 'all_four_in_band'], searchCsv);
  writeCsv('S4', ['round', 'group', 'player', 'kind', 'enemy', 'need', 'reward', 'hours', 'loot_value', 'heal_cost', 'p_success', 'income', 'silver_per_hour'], csv);
  return { lines, spec, prev, neo, rounds, searchNote };
}
module.exports = { run, regression, questRate, evalGroup };
