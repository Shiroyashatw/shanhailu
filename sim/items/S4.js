'use strict';
// S4 剿匪委託報酬
const P = require('../lib/players');
const T = require('../lib/time');
const { data } = require('../lib/game');
const { hours } = require('./T5');
const { r3, writeCsv, verdict, mean } = require('../lib/util');
const N = 150, R_WILD = 1.042; // 不介入時 120 天平均 R_wild（S3 實測 22.916%/22%）
/* 【假設】
 * - 每頭目標都要 1 小時搜尋（比照 game.js:1268 track 1h），一次遇 1 頭、1 對 1；每場開打前喝藥回滿（藥錢照算）。
 * - 地點取離灰窯最近、當日獸跡夠數的點（data.js:211-261）：狼／豬→枯骨獸徑(3h)、蛭／沼屍→腐骨沼(2h)、逃兵→野徑岔口(1h)、
 *   毒蟲→青霧藥林採藥時 12% 驚動（data.js:220，每頭平均採 1/0.12 次、每次 1h，採到的止血草照灰窯價計入收入）；劫匪→野徑岔口(1h)。
 * - 去、回各擲一次白天遇險：base×R_wild（單邊 0.22、多邊 0.30）。遇險事件照 data.js:466-477 五選一：劫匪（迎戰）、獸跡（繞路 +1h）、其餘離開。
 * - 失血成本＝(失血＋喝掉的藥×30)×(9 兩/30)；戰死＝該張委託收入 0、時數照算。掉落物照灰窯行情（data.js:300）賣。 */
const WHERE = { wolf: 'kugu', boar: 'kugu', bug: 'qingwu', leech: 'fuzhao', deserter: 'chakou', bogcorpse: 'fuzhao', bandit: 'chakou' };
let BANDIT_LOOT = null; // 重跑時覆寫劫匪每頭掉落平均
function lootValue(id) {
  if (id === 'bandit' && BANDIT_LOOT !== null) return BANDIT_LOOT;
  const D = data(), E = D.ENEMIES[id], pr = D.PRICES.huiyao; let v = 0; const av = (r) => (r[0] + r[1]) / 2;
  if (E.silver) v += av(E.silver);
  if (E.beast) { v += av(E.skin) * pr.hide + av(E.meat) * pr.meat; if (E.extra) v += pr[E.extra]; }
  if (E.drop) v += E.drop[1] * pr[E.drop[0]];
  return v;
}
function questRate(tpl, enemy, need, reward, cache) {
  const D = data(); const key = tpl.name + '|' + enemy; const f = cache[key] || (cache[key] = P.duel(tpl, [enemy], N, 100));
  const fb = cache[tpl.name + '|bandit'] || (cache[tpl.name + '|bandit'] = P.duel(tpl, ['bandit'], N, 100));
  const node = WHERE[enemy], rh = hours('huiyao', node), base = rh > 1 ? 0.30 : 0.22, risk = Math.min(0.85, base * R_WILD);
  let h = 2 * rh + need, extra = 0;
  if (enemy === 'bug') { const gathers = need / D.WILDS.qingwu.ambush.p; h = 2 * rh + gathers; extra = gathers * 1.5 * D.PRICES.huiyao.herb_zx; }
  const enc = 2 * risk; // 期望遇險次數
  h += enc * 0.2 * 1; // 獸跡事件繞路 1h
  const pWin = Math.pow(f.win, need) * Math.pow(fb.win, enc * 0.2);
  const heal = (need * f.hpCost + enc * 0.2 * fb.hpCost) * P.HP_SILVER;
  const income = pWin * (reward + need * lootValue(enemy) + extra) + enc * 0.2 * fb.win * lootValue('bandit') - heal;
  return { enemy, need, reward, hours: h, income, rate: income / h, pWin, heal, loot: need * lootValue(enemy) + extra };
}
function evalGroup(tpls, rw2, rw4, cache) {
  const D = data(); const rows = []; const ex = [], b2 = [], b4 = [];
  tpls.forEach((t) => {
    D.QUEST_GEN.kill.pool.forEach(([e, n, rw]) => { const q = questRate(t, e, n, rw, cache); q.who = t.name; q.kind = '現有'; rows.push(q); ex.push(q); });
    [[2, rw2], [4, rw4]].forEach(([n, rw]) => { const q = questRate(t, 'bandit', n, rw, cache); q.who = t.name; q.kind = '劫匪'; rows.push(q); (n === 2 ? b2 : b4).push(q); });
  });
  const tw = (a) => a.reduce((s, q) => s + q.income, 0) / a.reduce((s, q) => s + q.hours, 0);
  const exRate = tw(ex), bRate = tw(b2.concat(b4));
  return { rows, exRate, exMeanOfRates: mean(ex.map((q) => q.rate)), b2: tw(b2), b4: tw(b4), bRate, ratio: bRate / exRate, ratio2: tw(b2) / exRate, ratio4: tw(b4) / exRate, heal2: mean(b2.map((q) => q.heal)), heal4: mean(b4.map((q) => q.heal)) };
}
function run() {
  const cache = {}; const groups = [['出身起手', P.starters()], ['古窯清理級', P.cleaners()]];
  const csv = [], lines = ['| 玩家 | 現有 kill 委託（兩/時，時間加權） | 劫匪×2 賞 36 | 劫匪×4 賞 76 | 劫匪題合計 | 比值（合計） | ×2 比值 | ×4 比值 |', '|---|---|---|---|---|---|---|---|'];
  const res = groups.map(([gn, ts]) => { const r = evalGroup(ts, 36, 76, cache); r.name = gn; r.rows.forEach((q) => csv.push(['原值', gn, q.who, q.kind, q.enemy, q.need, q.reward, q.hours, q.loot, q.heal, q.pWin, q.income, q.rate])); lines.push('| ' + [gn, r3(r.exRate), r3(r.b2), r3(r.b4), r3(r.bRate), r3(r.ratio), r3(r.ratio2), r3(r.ratio4)].join(' | ') + ' |'); return r; });
  const inband = (x) => x >= 0.8 && x <= 1.25; const ok = res.every((r) => inband(r.ratio2) && inband(r.ratio4));
  lines.push('通過條件 0.8–1.25（×2、×4 與兩種玩家都要落在區間內）→ ' + verdict(ok));
  const ex = res[0].rows.filter((q) => q.kind === '現有'); const byE = {};
  ex.forEach((q) => { const k = q.enemy + '×' + q.need; (byE[k] = byE[k] || []).push(q); });
  lines.push('現有 kill 委託明細（起手 6 出身平均）：' + Object.keys(byE).map((k) => k + ' ' + r3(mean(byE[k].map((q) => q.rate))) + ' 兩/時（' + r3(mean(byE[k].map((q) => q.hours))) + 'h）').join('；'));
  lines.push('劫匪每頭掉落平均 ' + r3(lootValue('bandit')) + ' 兩、每頭 1h：光掉落就 ' + r3(lootValue('bandit')) + ' 兩/時，已高於現有委託的整體時薪；現有委託的目標多在 2–3h 外（枯骨獸徑、腐骨沼），劫匪題在 1h 外的野徑岔口。');
  let sug = '—', rer = '—';
  if (!ok) {
    // 先看「只動賞金」有沒有解：讓兩組玩家比值的平均＝1
    const solve = (n) => { let lo = -200, hi = 400; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; const r = groups.map(([, ts]) => evalGroup(ts, n === 2 ? mid : 0, n === 4 ? mid : 0, cache)); const k = n === 2 ? 'ratio2' : 'ratio4'; const am = (r[0][k] + r[1][k]) / 2; if (am >= 1) hi = mid; else lo = mid; } return Math.round((lo + hi) / 2); };
    const a2 = solve(2), a4 = solve(4);
    lines.push('只動賞金的解（掉落維持 8–20）：×2≈' + a2 + ' 兩、×4≈' + a4 + ' 兩才會持平——賞金幾乎歸零，表示問題不在賞金，而在「每頭 14 兩掉落＋目標就在 1h 外」。');
    // 建議：掉落 8–20 → 3–7（平均 5），賞金重解
    BANDIT_LOOT = 5;     const n2 = solve(2), n4 = solve(4);
    lines.push('', '重跑（建議值：劫匪掉落 3–7 兩／頭、賞金 ×2＝' + n2 + ' 兩、×4＝' + n4 + ' 兩）：', '| 玩家 | 現有 | 劫匪×2 | 劫匪×4 | ×2 比值 | ×4 比值 |', '|---|---|---|---|---|---|');
    const res2 = groups.map(([gn, ts]) => { const r = evalGroup(ts, n2, n4, cache); r.rows.filter((q) => q.kind === '劫匪').forEach((q) => csv.push(['建議值', gn, q.who, q.kind, q.enemy, q.need, q.reward, q.hours, q.loot, q.heal, q.pWin, q.income, q.rate])); lines.push('| ' + [gn, r3(r.exRate), r3(r.b2), r3(r.b4), r3(r.ratio2), r3(r.ratio4)].join(' | ') + ' |'); return r; });
    BANDIT_LOOT = null;
    const ok2 = res2.every((r) => inband(r.ratio2) && inband(r.ratio4));
    lines.push('→ ' + verdict(ok2) + (ok2 ? '' : '（起手每場失血約為古窯清理級的 4–5 倍，同一張賞金對兩組的時薪差超過區間寬度）'));
    lines.push('註：本項結果對「劫匪在哪、每頭要找多久」很敏感，這兩點規格沒給，見待決 Q-S4。');
    sug = '劫匪掉落 8–20→3–7 兩／頭，賞金 ×2：36→' + n2 + '、×4：76→' + n4 + '（只動賞金要降到 ' + a2 + '／' + a4 + ' 才持平）'; rer = res2.map((r, i) => groups[i][0] + ' ×2 ' + r3(r.ratio2) + '、×4 ' + r3(r.ratio4)).join('；') + '（' + verdict(ok2) + '）';
  }
  writeCsv('S4', ['round', 'group', 'player', 'kind', 'enemy', 'need', 'reward', 'hours', 'loot_value', 'heal_cost', 'p_success', 'income', 'silver_per_hour'], csv);
  return { id: 'S4', title: '剿匪委託報酬', measured: res.map((r) => r.name + '：×2 比值 ' + r3(r.ratio2) + '、×4 比值 ' + r3(r.ratio4) + '（現有 ' + r3(r.exRate) + ' 兩/時）').join('；'), threshold: '比值 0.8–1.25', pass: ok, suggest: sug, rerun: rer, lines, cache };
}
module.exports = { run, lootValue, questRate };
