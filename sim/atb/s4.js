'use strict';
/* S4 剿匪（SPEC-ATB §13.1）。questRate／evalGroup 逐行照抄 sim/civ/s4.js（v0.4 平民補跑；那份又照抄 sim/items/S4.js），
 * 唯一的改動：單挑 duel 換成可指定「引擎、場數、種子」的版本（原本固定 P.duel＝現行回合制、N=150、種子 100+i）。
 * 搜尋時間、遇險、R_wild、地點、失血換算、掉落行情全部不變。劫匪掉落 3–7（平均 5）、賞金 ×2＝24、×4＝36（v0.4 已接受值）。 */
const { P, U, CIV, civCleaner } = require('./common');
const { data } = require('../lib/game');
const { hours } = require('../items/T5');
const R_WILD = 1.042;
const WHERE = { wolf: 'kugu', boar: 'kugu', bug: 'qingwu', leech: 'fuzhao', deserter: 'chakou', bogcorpse: 'fuzhao', bandit: 'chakou' };
const BL = 5, RW2 = 24, RW4 = 36;
function lootValue(id, bl) {
  if (id === 'bandit' && bl !== null && bl !== undefined) return bl;
  const D = data(), E = D.ENEMIES[id], pr = D.PRICES.huiyao; let v = 0; const av = (r) => (r[0] + r[1]) / 2;
  if (E.silver) v += av(E.silver);
  if (E.beast) { v += av(E.skin) * pr.hide + av(E.meat) * pr.meat; if (E.extra) v += pr[E.extra]; }
  if (E.drop) v += E.drop[1] * pr[E.drop[0]];
  return v;
}
// P.duel 照抄，引擎換成參數
function duel(eng, tpl, enemies, n, seed0, opts) {
  let win = 0, dead = 0, hp = 0, pots = 0, rounds = 0, silver = 0;
  for (let i = 0; i < n; i++) {
    eng.setupPlayer((seed0 || 0) + i, tpl);
    const r = eng.fight(enemies, opts); win += r.win ? 1 : 0; dead += r.dead ? 1 : 0; hp += r.hpLost + 30 * r.pots; pots += r.pots; rounds += r.rounds; silver += r.silver;
  }
  return { n, win: win / n, dead: dead / n, hpCost: hp / n, pots: pots / n, rounds: rounds / n, silver: silver / n, wins: win };
}
function questRate(tpl, enemy, need, reward, cache, bl, duelFn) {
  const D = data(); const key = tpl.name + '|' + enemy; const f = cache[key] || (cache[key] = duelFn(tpl, [enemy]));
  const fb = cache[tpl.name + '|bandit'] || (cache[tpl.name + '|bandit'] = duelFn(tpl, ['bandit']));
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
function evalGroup(tpls, rw2, rw4, cache, bl, duelFn) {
  const D = data(); const rows = []; const ex = [], b2 = [], b4 = [];
  tpls.forEach((t) => {
    D.QUEST_GEN.kill.pool.forEach(([e, n, rw]) => { const q = questRate(t, e, n, rw, cache, bl, duelFn); q.who = t.name; q.kind = '現有'; rows.push(q); ex.push(q); });
    [[2, rw2], [4, rw4]].forEach(([n, rw]) => { const q = questRate(t, 'bandit', n, rw, cache, bl, duelFn); q.who = t.name; q.kind = '劫匪'; rows.push(q); (n === 2 ? b2 : b4).push(q); });
  });
  const tw = (a) => a.reduce((s, q) => s + q.income, 0) / a.reduce((s, q) => s + q.hours, 0);
  const exRate = tw(ex);
  return { rows, exRate, b2: tw(b2), b4: tw(b4), ratio2: tw(b2) / exRate, ratio4: tw(b4) / exRate };
}
const inband = (x) => x >= 0.8 && x <= 1.25;
const N = 300, SEED = 61000;
// 一組（引擎＋場數＋種子）→ 兩組玩家的四個比值
function evalAll(eng, n, seed, rw2, rw4, bl, cache) {
  cache = cache || {}; const duelFn = (tpl, en) => duel(eng, tpl, en, n, seed, {});
  const players = [CIV, civCleaner()];
  const res = players.map((t) => { const r = evalGroup([t], rw2 === undefined ? RW2 : rw2, rw4 === undefined ? RW4 : rw4, cache, bl === undefined ? BL : bl, duelFn); r.name = t.name; return r; });
  // 判準：四個比值 0.8–1.25；唯平民 ×4 用 v0.4 已接受的下限 0.790（0.790–1.25）
  const checks = { civ2: inband(res[0].ratio2), civ4: res[0].ratio4 >= 0.790 - 1e-12 && res[0].ratio4 <= 1.25, cl2: inband(res[1].ratio2), cl4: inband(res[1].ratio4) };
  const ok = checks.civ2 && checks.civ4 && checks.cl2 && checks.cl4;
  return { res, ok, checks, cache, players };
}
// v0.4 原口徑重現（現行回合制、N=150、種子 100+i）：直接呼叫 sim/civ/s4.js 的 evalGroup（它用 P.duel）
function v04() {
  const S4c = require('../civ/s4'); const cache = {};
  return [CIV, civCleaner()].map((t) => { const r = S4c.evalGroup([t], RW2, RW4, cache, BL); r.name = t.name; return r; });
}
module.exports = { evalAll, v04, duel, questRate, evalGroup, inband, lootValue, N, SEED, BL, RW2, RW4 };
