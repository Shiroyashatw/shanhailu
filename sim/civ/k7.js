'use strict';
// K7 城門外出發的食物餘裕（補充；平民單一起手）。one() 逐行照抄 sim/items/K7.js，只把「P.starters()[seed % 6]」改成參數 tpl。
const { g, P, U, CIV, writeCsv, pw } = require('./common');
const T = require('../lib/time');
const { r3, prng, mean, verdict } = U;
const SEEDS = 200, R_WILD = 1.042, SN = ['春', '夏', '秋', '冬'];
function one(seed, tpl) {
  const season = Math.floor(seed / 50), r = prng(seed, 'K7');
  const G = g.inst().G; g.setupPlayer(seed, Object.assign({}, tpl, { items: [['pot_hp', 2]] })); const S = G.state;
  const b = T.newBody({ food: 30, hp: G.maxHp(), maxHp: G.maxHp() });
  const t0 = (season * 30 + (seed % 25)) * 1440 + ((seed * 7) % 24) * 60; let t = t0, meat = 0, eaten = 0;
  const out = { season, ok: false, dead: false, cause: '', hours: null, fights: 0, minFood: 30, maxCold: 0 };
  const left = () => t0 + 1440 - t;
  const pass = (h, ctx) => { t = T.advance(b, t, Math.round(h * 60), Object.assign({ seed, act: 'awake' }, ctx)); return !b.dead; };
  const fightIt = (ids, hunt) => {
    S.hp = Math.max(1, Math.round(b.hp)); S.food = Math.round(b.food); S.fat = Math.round(b.fat); S.dead = null; out.fights++;
    const f = g.fight(ids, { ctxType: hunt ? 'hunt' : 'wild' }); b.hp = f.hpEnd; b.fat = S.fat;
    if (!f.win) { b.dead = true; b.cause = '戰死（' + ids.join('+') + '）'; return false; }
    ids.forEach((id) => { const E = g.data().ENEMIES[id]; if (E.beast && E.meat[1] > 0) meat += E.meat[0] + Math.floor(r() * (E.meat[1] - E.meat[0] + 1)); });
    return true;
  };
  const travel = (edges) => {
    const wx = T.weatherAt(seed, t); const h = T.routeHours(edges, 1, wx); const st = T.walkStats(seed, t, h);
    const risk = T.riskNew({ base: T.baseRisk(edges), R: R_WILD, meanW: st.meanW, wxRisk: st.wxRisk }).risk;
    if (!pass(h, { place: 'wild', fatRate: 3 })) return false;
    if (r() < risk) { const ev = Math.floor(r() * 5); if (ev === 1) return fightIt(['bandit']); if (ev === 2) return fightIt([r() < 0.5 ? 'boar' : 'wolf'], true); }
    return true;
  };
  const D = g.data(); const E = (a, c) => D.EDGES.find((e) => (e.a === a && e.b === c) || (e.a === c && e.b === a));
  const tracks = (node) => { const autumn = T.seasonOf(t) === 2 ? 1 : 0; return D.WILDS[node].points.filter((p) => p.kind === 'track' && D.ENEMIES[p.enemy].beast && D.ENEMIES[p.enemy].meat[1] > 0).flatMap((p) => Array(p.max + autumn).fill(p.enemy)); };
  const hunt = (node) => { for (const e of tracks(node)) { if (meat >= 1 || left() < 180) break; if (!pass(1, { place: 'wild', fatRate: 3 })) return false; if (!fightIt([e], true)) return false; } return true; };
  const cook = () => { if (!pass(1, { place: 'wild', fatRate: 1 })) return false; while (meat > 0 && eaten < 35) { if (!pass(1, { place: 'fire' })) return false; meat--; T.eat(b, 35); eaten += 35; } return true; };
  let alive = travel([E('huiyao', 'chakou'), E('chakou', 'qingwu')]);
  if (alive && meat < 1) alive = hunt('qingwu');
  if (alive && meat < 1) { alive = travel([E('qingwu', 'kugu')]); if (alive && meat < 1) alive = hunt('kugu'); }
  if (alive && meat >= 1) alive = cook();
  out.dead = b.dead; out.cause = b.cause; out.minFood = b.minFood; out.maxCold = b.maxCold; out.hours = (t - t0) / 60; out.minHp = b.minHp;
  out.ok = !b.dead && eaten >= 35 && t - t0 <= 1440;
  return out;
}
function summarize(rs) {
  const rows = [];
  for (let k = 0; k < 4; k++) { const a = rs.filter((x) => x.season === k); rows.push({ k, n: a.length, ok: a.filter((x) => x.ok).length, kia: a.filter((x) => x.dead && x.cause.startsWith('戰死')).length, env: a.filter((x) => x.dead && !x.cause.startsWith('戰死')).length, nm: a.filter((x) => !x.dead && !x.ok).length, hrs: mean(a.filter((x) => x.ok).map((x) => x.hours)), minFood: mean(a.map((x) => x.minFood)), maxCold: mean(a.map((x) => x.maxCold)) }); }
  return { rows, okN: rs.filter((x) => x.ok).length, minFoodAll: mean(rs.map((x) => x.minFood)), minFoodMin: Math.min(...rs.map((x) => x.minFood)), zero: rs.filter((x) => x.minFood <= 0).length };
}
function run() {
  const rs = []; for (let s = 0; s < SEEDS; s++) rs.push(one(s, CIV));
  // 回歸：六種出身輪替（前一輪口徑）應重現 200/200 與各季飽食最低平均 10.160／10.960／10.160／4.200
  const old = []; for (let s = 0; s < SEEDS; s++) old.push(one(s, P.starters()[s % 6]));
  const A = summarize(rs), O = summarize(old); const csv = [];
  const lines = ['| 季 | 24h 內補到 +35〔Wilson 95% CI〕 | 戰死 | 餓死／凍死 | 沒打到肉或超時 | 平均花費時數（成功者） | 飽食最低（平均） | 寒意最高（平均） | 前一輪（六出身輪替）飽食最低平均 |', '|---|---|---|---|---|---|---|---|---|'];
  A.rows.forEach((x, i) => { lines.push('| ' + [SN[x.k], pw(x.ok, x.n), x.kia, x.env, x.nm, r3(x.hrs), r3(x.minFood), r3(x.maxCold), r3(O.rows[i].minFood)].join(' | ') + ' |'); csv.push(['平民', SN[x.k], x.n, x.ok / x.n, x.kia, x.env, x.nm, x.hrs, x.minFood, x.maxCold]); });
  O.rows.forEach((x) => csv.push(['前一輪口徑（六出身輪替）重算', SN[x.k], x.n, x.ok / x.n, x.kia, x.env, x.nm, x.hrs, x.minFood, x.maxCold]));
  const ok = A.okN === SEEDS; const causes = {}; rs.filter((x) => x.dead).forEach((x) => (causes[x.cause] = (causes[x.cause] || 0) + 1));
  lines.push('', '合計通過率 ' + pw(A.okN, SEEDS) + '（門檻 100%）→ **' + verdict(ok) + '**。死因：' + (Object.keys(causes).length ? Object.keys(causes).map((k) => k + ' ' + causes[k]).join('、') : '無') + '。');
  lines.push('飽食最低：全體平均 ' + r3(A.minFoodAll) + '（前一輪口徑重算 ' + r3(O.minFoodAll) + '）、全體最低 ' + A.minFoodMin.toFixed(6) + '；' + A.zero + ' 個 seed 在吃到東西前飽食已歸零。起點飽食 30。');
  writeCsv('K7', ['group', 'season', 'n', 'p_ok', 'killed_in_fight', 'starved_or_frozen', 'no_meat_or_timeout', 'mean_hours_ok', 'mean_min_food', 'mean_max_cold'], csv);
  const regGot = O.okN + '/200；' + O.rows.map((x) => r3(x.minFood)).join('／'), regExp = '200/200；10.160／10.960／10.160／4.200';
  return { lines, ok, A, O, reg: ['K7 六出身輪替（前一輪口徑）：通過數；春夏秋冬飽食最低平均', regExp, regGot, regGot === regExp] };
}
module.exports = { run };
