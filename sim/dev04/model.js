'use strict';
/* DEV-04 S4 重驗：戰鬥取樣、現有 kill 委託（分母）、劫匪題各種搜尋機制（分子）。
 * 分母與 C0 的公式逐行照 numbers/num-shl-b1-civ@0ad0b46f 的 sim/civ/s4.js questRate；
 * 這裡只把「每頭搜尋 1h、1 對 1」換成可替換的搜尋機制 spec，並把 P.duel 換成逐場記錄（為了 bootstrap）。 */
const { refRoot } = require('./ref');
const ROOT = refRoot('new');
const g = require(ROOT + '/sim/lib/game');
const P = require(ROOT + '/sim/lib/players');
const U = require(ROOT + '/sim/lib/util');
const { hours } = require(ROOT + '/sim/items/T5');
const { CIV, civCleaner } = require(ROOT + '/sim/civ/common');
const D = g.data();

const N_DUEL = 2000, SEED_1V1 = 70000, SEED_2V1 = 71000;
const R_WILD = 1.042;                       // 前一輪 S3 實測的不介入平均（沿用）
const WHERE = { wolf: 'kugu', boar: 'kugu', bug: 'qingwu', leech: 'fuzhao', deserter: 'chakou', bogcorpse: 'fuzhao', bandit: 'chakou' };
const ENEMIES_1V1 = ['wolf', 'boar', 'bug', 'leech', 'deserter', 'bogcorpse', 'bandit'];
// 2 對 1 的三種開場：傳聞「有人盤踞」動手搶（r_fight，一般開場）；「根本是餌」沒察覺（ambush:true）／察覺後先下手（r_strike，stun:1）
const COMBOS_2V1 = { bb: {}, bbA: { ambush: true }, bbS: { stun: 1 } };
const HP_SILVER = P.HP_SILVER;              // 9 兩 / 30 生命

function lootValue(id) {
  const E = D.ENEMIES[id], pr = D.PRICES.huiyao; let v = 0; const av = (r) => (r[0] + r[1]) / 2;
  if (E.silver) v += av(E.silver);
  if (E.beast) { v += av(E.skin) * pr.hide + av(E.meat) * pr.meat; if (E.extra) v += pr[E.extra]; }
  if (E.drop) v += E.drop[1] * pr[E.drop[0]];
  return v;
}
const L_BANDIT = lootValue('bandit');       // PR #16 data.js：silver [3,7] → 5

/* 逐場記錄的對打：每場 setupPlayer(seed0+j)（滿血、出身行囊或樣板行囊），打 enemies，記 win、失血成本（淨失血＋喝藥×30）。 */
function duelArr(tpl, enemies, seed0, opts) {
  const win = new Uint8Array(N_DUEL), hp = new Float64Array(N_DUEL); let dead = 0;
  for (let j = 0; j < N_DUEL; j++) {
    g.setupPlayer(seed0 + j, tpl);
    const r = g.fight(enemies, opts); win[j] = r.win ? 1 : 0; hp[j] = r.hpLost + 30 * r.pots; if (r.dead) dead++;
  }
  return { win, hp, dead, n: N_DUEL };
}
function summarize(a, idx) {
  let w = 0, h = 0; const n = idx ? idx.length : a.n;
  for (let i = 0; i < n; i++) { const j = idx ? idx[i] : i; w += a.win[j]; h += a.hp[j]; }
  return { win: w / n, hp: h / n };
}
function baitDetect(tpl) { // game.js rumor 查探「根本是餌」：p = clamp(0.15 + (靈覺−10)×0.05 + 追蹤×0.004 + traced×0.5, 0.05, 0.95)，traced 需追蹤 25
  g.setupPlayer(1, tpl); const G = g.inst().G;
  return U.clamp(0.15 + (G.attrVal('ling') - 10) * 0.05 + G.profLv('zong') * 0.004, 0.05, 0.95);
}
function runDuels(log) {
  const tpls = [CIV, civCleaner()]; const raw = {};
  tpls.forEach((t) => {
    raw[t.name] = {};
    ENEMIES_1V1.forEach((e) => { raw[t.name][e] = duelArr(t, [e], SEED_1V1); });
    Object.entries(COMBOS_2V1).forEach(([k, o]) => { raw[t.name][k] = duelArr(t, ['bandit', 'bandit'], SEED_2V1, o); });
    if (log) log('戰鬥取樣完成：' + t.name);
  });
  return { tpls, raw, detect: Object.fromEntries(tpls.map((t) => [t.name, baitDetect(t)])) };
}
function statsOf(raw, rng) { // rng 給定時做一次 bootstrap 重抽
  const st = {};
  Object.keys(raw).forEach((tn) => { st[tn] = {}; Object.keys(raw[tn]).forEach((c) => {
    const a = raw[tn][c]; let idx = null;
    if (rng) { idx = new Uint32Array(a.n); for (let i = 0; i < a.n; i++) idx[i] = Math.floor(rng() * a.n); }
    st[tn][c] = summarize(a, idx);
  }); });
  return st;
}

/* ---------- 分母：現有 kill 委託（照抄前一輪 questRate，劫匪以外） ---------- */
const TRAVEL = (() => { const rh = hours('huiyao', 'chakou'); const risk = Math.min(0.85, (rh > 1 ? 0.30 : 0.22) * R_WILD); return { rh, risk, enc: 2 * risk }; })();
function exQuest(s, enemy, need, reward) {
  const node = WHERE[enemy], rh = hours('huiyao', node), base = rh > 1 ? 0.30 : 0.22, risk = Math.min(0.85, base * R_WILD);
  let h = 2 * rh + need, extra = 0;
  if (enemy === 'bug') { const gathers = need / D.WILDS.qingwu.ambush.p; h = 2 * rh + gathers; extra = gathers * 1.5 * D.PRICES.huiyao.herb_zx; }
  const enc = 2 * risk; h += enc * 0.2 * 1;
  const pWin = Math.pow(s[enemy].win, need) * Math.pow(s.bandit.win, enc * 0.2);
  const heal = (need * s[enemy].hp + enc * 0.2 * s.bandit.hp) * HP_SILVER;
  const income = pWin * (reward + need * lootValue(enemy) + extra) + enc * 0.2 * s.bandit.win * lootValue('bandit') - heal;
  return { hours: h, income };
}
function exRate(s) { let I = 0, H = 0; D.QUEST_GEN.kill.pool.forEach(([e, n, rw]) => { const q = exQuest(s, e, n, rw); I += q.income; H += q.hours; }); return I / H; }

/* ---------- 分子：劫匪題 ----------
 * spec = { need, hours, fights:{combo:期望場數}, kills:期望擊殺劫匪數（給掉落）, bonus:不算進度的路上劫匪期望數, fees }
 * 收入 = Π win^場數 ×（賞金 + kills×掉落）＋ bonus×win1×掉落 − 失血成本 − 費用（與前一輪同一個期望值近似：成功率用期望場數當指數） */
function banditIncome(s, spec, reward) {
  let pWin = Math.pow(s.bandit.win, spec.bonus || 0), heal = (spec.bonus || 0) * s.bandit.hp;
  Object.entries(spec.fights).forEach(([c, n]) => { const k = c === 'b1' ? 'bandit' : c; pWin *= Math.pow(s[k].win, n); heal += n * s[k].hp; });
  const income = pWin * (reward + spec.kills * L_BANDIT) + (spec.bonus || 0) * s.bandit.win * L_BANDIT - heal * HP_SILVER - (spec.fees || 0);
  return { income, rate: income / spec.hours, pWin };
}
// 前一輪結構：去、回野徑岔口各 1h（各擲一次遇險：劫匪 1/5 迎戰、不算進度；獸跡 1/5 繞路 +1h），在岔口每頭搜尋 hHead 小時、1 對 1
function specAtChakou(need, hHead, perFight) {
  const fights = perFight || { b1: need };
  return { need, hours: 2 * TRAVEL.rh + need * hHead + TRAVEL.enc * 0.2, fights, kills: need, bonus: TRAVEL.enc * 0.2, fees: 0, hHead };
}
// 來回趕路找（IMPL-event、C1）：每頭搜尋 hSearch 小時；同一段路上「獸跡」與「劫匪」的期望比例 tShare/bShare → 每頭繞路 tShare/bShare 小時；
// 最後一頭有一半機率在岔口遇到，要再走 1h 回城 → +0.5h（回程的遇險不再計）
function specShuttle(need, hSearch, tracksPerHead) {
  return { need, hours: need * (hSearch + tracksPerHead) + 0.5, fights: { b1: need }, kills: need, bonus: 0, fees: 0, hHead: hSearch + tracksPerHead };
}

/* ---------- 蒙地卡羅：傳聞路徑與 C2 幾何分布 ---------- */
// 傳聞一輪：灰窯客棧聽 0.5h（付 5 兩）→ 走到傳聞地點 → 查探 1h → 回灰窯。真相權重照 data.js RUMOR.truth（guard 依 crew 縮放，game.js truthW）。
// 'guard' → 動手搶（2 名、一般開場）；'bait' → 以 detect 機率察覺先下手（stun 1），否則中伏（ambush）。其餘真相（屬實／山魈／已取走）不計收益與風險（見假設）。
// mode: 'rumor'＝路上劫匪事件只算掉落不算進度；'mixed'＝路上劫匪事件也算進度（同一條路線，玩家實際會這樣做）。
function mcRumor(need, opt, seed) {
  const rng = U.mulberry32(seed); const M = opt.samples || 20000; const w = D.RUMOR.truth; const evN = D.EVENTS.length;
  const nodes = opt.nodes; // [{node, p, rh, risk}]
  let H = 0, H2 = [], fights = { b1: 0, bb: 0, bbA: 0, bbS: 0 }, kills = 0, bonus = 0, fees = 0, rumors = 0;
  for (let m = 0; m < M; m++) {
    let h = 0, prog = 0, crew = 4;
    const roll = (risk, countProg) => { // 一段野徑趕路的遇險
      if (rng() >= risk) return; const e = Math.floor(rng() * evN); const id = D.EVENTS[e].id;
      if (id === 'bandit') { if (countProg) { fights.b1++; kills++; prog++; } else bonus++; if (opt.crewDyn) crew = Math.max(0, crew - 0.5); }
      else if (id === 'tracks') h += 1;
    };
    while (prog < need) {
      h += 0.5; fees += opt.free ? 0 : D.RUMOR.cost; rumors++;
      let u = rng(), nd = nodes[0]; for (const x of nodes) { if (u < x.p) { nd = x; break; } u -= x.p; }
      h += nd.rh; roll(nd.risk, opt.mode === 'mixed');
      if (prog >= need) { h += nd.rh; roll(nd.risk, false); break; }
      h += 1; // 查探
      const gw = w.guard * Math.min(crew, 4) / 4; const tot = w.true + gw + w.strong + w.gone + w.bait; const t = rng() * tot;
      if (t < gw) { if (crew >= 1) { fights.bb++; kills += 2; prog += 2; if (opt.crewDyn) crew = Math.max(0, crew - 1); } }
      else if (t < gw + w.bait) { if (rng() < opt.detect) fights.bbS++; else fights.bbA++; kills += 2; prog += 2; if (opt.crewDyn) crew = Math.max(0, crew - 1); }
      h += nd.rh; roll(nd.risk, opt.mode === 'mixed' && prog < need);
    }
    H += h; H2.push(h);
  }
  // 掉落：bonus 單獨給（銀兩照算、不算進度）；kills 已含進度內的所有劫匪（超過 need 的也給掉落）
  Object.keys(fights).forEach((k) => (fights[k] /= M));
  return { need, hours: H / M, p90: U.quantile(H2, 0.9), fights, kills: kills / M, bonus: bonus / M, fees: fees / M, rumors: rumors / M, hHead: H / M / need };
}
function mcGeom(p, seed, M) {
  const rng = U.mulberry32(seed); const one = new Float64Array(M);
  for (let m = 0; m < M; m++) { let k = 1; while (rng() >= p) k++; one[m] = k; }
  const per = Array.from(one); const sum = (n) => { const a = []; for (let m = 0; m + n <= M; m += n) { let s = 0; for (let i = 0; i < n; i++) s += one[m + i]; a.push(s); } return a; };
  const s2 = sum(2), s4 = sum(4);
  return { p, mean: U.mean(per), p90: U.quantile(per, 0.9), analyticMean: 1 / p, analyticP90: Math.ceil(Math.log(0.1) / Math.log(1 - p)), x2: { mean: U.mean(s2), p90: U.quantile(s2, 0.9) }, x4: { mean: U.mean(s4), p90: U.quantile(s4, 0.9) } };
}
module.exports = { D, U, g, P, CIV, civCleaner, hours, N_DUEL, SEED_1V1, SEED_2V1, R_WILD, TRAVEL, L_BANDIT, HP_SILVER, lootValue, runDuels, statsOf, exRate, exQuest, banditIncome, specAtChakou, specShuttle, mcRumor, mcGeom };
