'use strict';
/* num-shl-npc-gen：SPEC-NPC v0.1（待驗算，2026-11-28）人事與生成分布模擬器。
 * 規則來源：任務書抄錄的 SPEC-NPC v0.1；名庫只照 LOC-NPC v0.1 的「規模」合成佔位（實際字不在 repo）。
 * 【自補】標記的部分是本輪自己的建模選擇，全部列在 evidence/npc-gen-assumptions.md。
 * 只 require sim/lib/util.js 的亂數（mulberry32、hashStr），不改任何既有檔。 */
const { mulberry32, hashStr } = require('../lib/util');

// ---------- 名庫規模（LOC-NPC v0.1） ----------
const N_SUR = 188, N_SUR_COMPOUND = 13; // 單姓 175、複姓 13；【自補】索引 175..187 為複姓
const FLAV = ['獵戶', '藥童', '礦工', '逃兵', '行商', '流民'];
const NAME_COUNTS = [[72, 36, 13], [32, 28, 47], [52, 17, 48], [60, 21, 45], [53, 42, 19], [46, 52, 44]]; // 男向／女向／中性
const N_FORBID = 43;
const TAGS = [['一身藥味', 3], ['冷臉', 3], ['嘴上功夫', 3], ['大嗓', 3], ['山野氣', 4], ['愛笑', 3], ['手上獸腥', 3], ['手腳俐落', 4], ['斷指', 4], ['沉默', 3], ['準頭好', 1], ['煤灰滿身', 4], ['獨眼', 3], ['疤臉', 3], ['瘦', 3], ['白髮', 3], ['眼耳靈', 3], ['矮', 2], ['禿頭', 3], ['精於算計', 3], ['缺耳', 3], ['胖', 3], ['膽大', 3], ['膽小', 3], ['跛腳', 3], ['酒糟鼻', 3], ['駝背', 3], ['高', 3]];
// 名字池：index → {flav, ori(0 男向／1 女向／2 中性)}
const GIVEN = []; const POOL = FLAV.map(() => [[], []]); // POOL[flav][pres 0=m,1=f] = 可用名 index
NAME_COUNTS.forEach((c, f) => c.forEach((n, o) => { for (let i = 0; i < n; i++) { const g = GIVEN.length; GIVEN.push({ flav: f, ori: o }); if (o === 0 || o === 2) POOL[f][0].push(g); if (o === 1 || o === 2) POOL[f][1].push(g); } }));
const WORDS = []; const TAG_WORDS = TAGS.map(([, n], t) => { const a = []; for (let i = 0; i < n; i++) { a.push(WORDS.length); WORDS.push(t); } return a; });

// ---------- 地點、職位 ----------
const TOWNS = [
  { id: 'huiyao', name: '灰窯鎮', cap: 300, dist: [5, 10, 35, 10, 15, 25], grave: true },
  { id: 'duyin', name: '渡陰關', cap: 250, dist: [5, 10, 5, 30, 30, 20], grave: false },
  { id: 'poxiao', name: '破曉營', cap: 150, dist: [10, 5, 5, 60, 0, 20], grave: true },
  { id: 'yizhan', name: '官道驛站', cap: 60, dist: [10, 5, 5, 20, 40, 20], grave: true },
  { id: 'other', name: '其他', cap: 40, dist: [15, 10, 15, 20, 10, 30], grave: true },
];
const PLAYER_TOWN = 0; // 玩家所在鎮＝灰窯鎮（每日結算）
const F = (n) => FLAV.indexOf(n);
// 【自補】20 個現場位的職位味、世襲與否；鴉首放灰窯、勢力味取流民；街頭 6 全在灰窯、無職位味
const SLOTS = [
  ['F01', '天星分號掌櫃', 0, 'field', '行商', false], ['F02', '灰窯現場位2', 0, 'field', '礦工', true], ['F03', '灰窯現場位3', 0, 'field', '礦工', false],
  ['F04', '灰窯現場位4', 0, 'field', '藥童', false], ['F05', '灰窯現場位5', 0, 'field', '獵戶', false], ['F06', '灰窯現場位6', 0, 'field', '流民', false], ['F07', '灰窯現場位7', 0, 'field', '逃兵', false],
  ['F08', '渡陰現場位1', 1, 'field', '逃兵', false], ['F09', '渡陰現場位2', 1, 'field', '逃兵', false], ['F10', '渡陰現場位3', 1, 'field', '行商', false], ['F11', '渡陰現場位4', 1, 'field', '行商', false],
  ['F12', '渡陰現場位5', 1, 'field', '流民', false], ['F13', '渡陰現場位6', 1, 'field', '藥童', false], ['F14', '渡陰現場位7', 1, 'field', '獵戶', false],
  ['F15', '破曉現場位1', 2, 'field', '逃兵', true], ['F16', '破曉現場位2', 2, 'field', '逃兵', false], ['F17', '破曉現場位3', 2, 'field', '逃兵', false], ['F18', '破曉現場位4', 2, 'field', '獵戶', false], ['F19', '破曉現場位5', 2, 'field', '流民', false],
  ['F20', '驛站現場位1', 3, 'field', '行商', false],
  ['M01', '鴉首', 0, 'mid', '流民', false],
  ['S01', '街頭1', 0, 'street', null, false], ['S02', '街頭2', 0, 'street', null, false], ['S03', '街頭3', 0, 'street', null, false], ['S04', '街頭4', 0, 'street', null, false], ['S05', '街頭5', 0, 'street', null, false], ['S06', '街頭6', 0, 'street', null, false],
].map(([id, name, town, tier, flav, hered]) => ({ id, name, town, tier, flav: flav === null ? -1 : F(flav), hered }));

// ---------- 換人、居民 ----------
const YEAR = 120;
const RATE = { field: 0.18, mid: 0.09, street: 0.10 };
const H = {}; Object.keys(RATE).forEach((k) => (H[k] = 1 - Math.pow(1 - RATE[k], 1 / YEAR)));
const CAUSES = ['death', 'migrate', 'replaced', 'promoted']; const CAUSE_P = [0.40, 0.35, 0.10, 0.15];
const VAC = { field: { death: [3, 10], migrate: [1, 5] }, mid: { death: [5, 15], migrate: [3, 10] } };
VAC.street = VAC.field; // 【自補】街頭空缺沿用 field
const AGE_RANGE = { field: [25, 60], mid: [30, 60] };
const resDeathQ = (age) => (age < 50 ? 0.01 : age < 60 ? 0.04 : 0.10);
const RES_MIG = 0.05;
const dailyH = (q) => 1 - Math.pow(1 - q, 1 / YEAR);
const ageMult = (age) => (age < 40 ? 0.5 : age < 60 ? 1 : 2);

const DEFAULTS = { days: 1200, refugeePerDay: 1, scenesPerDay: 3, metP: 0.15, coarse: 30, strongUnique: true };

function run(seed, opt) {
  opt = Object.assign({}, DEFAULTS, opt || {});
  const r = mulberry32(hashStr('npc-gen:' + seed) ^ (opt.salt || 0));
  const ri = (n) => Math.floor(r() * n);
  const pick = (a) => a[ri(a.length)];
  const drawW = (w) => { const s = w.reduce((a, b) => a + b, 0); let x = r() * s; for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; } return w.length - 1; };
  const poisson = (lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  const tri = (a, b) => { const c = (a + b) / 2, u = r(), fc = (c - a) / (b - a); return u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c)); };
  const resAge = () => { const b = drawW([20, 55, 15, 10]); return [[16, 26], [26, 50], [50, 60], [60, 71]][b].reduce((lo, hi) => lo + r() * (hi - lo)); };

  // 禁組合與玩家全名
  const forbid = new Set(); while (forbid.size < N_FORBID) forbid.add(ri(N_SUR) * 1000 + ri(GIVEN.length));
  const playerKey = ri(N_SUR) * 1000 + ri(GIVEN.length);

  const S = { // 統計
    seed, turn: { field: [0, 0], mid: [0, 0], street: [0, 0] }, // [事件數, 在任日數]
    causes: { field: [0, 0, 0, 0], mid: [0, 0, 0, 0], street: [0, 0, 0, 0] }, vac: [], vacBad: 0,
    deathsRes: 0, deathsHold: 0, deathsByTown: [0, 0, 0, 0, 0], grave: 0, graveRes: 0, migOut: 0, immig: 0, hereditary: 0, poolFallback: 0, promoSkip: 0,
    popTraj: [], age50: null, ageBands: null, popEnd: null, popMinLate: null, dailyDeaths: [],
    name: { draws: 0, forbidHit: 0, playerHit: 0, strictRe: 0, retiredRe: 0, townRe: 0, reservedRe: 0, fail: 0, metRename: 0, strictColl: 0, strictCollWeak: 0, reuse240: 0, sceneSameSur: 0, sceneSkip: 0, scenes: 0, sceneN: 0, metEvents: 0 },
    flavHold: [], flavRes: TOWNS.map(() => [0, 0, 0, 0, 0, 0]), flavHoldEnd: [], f01: [0, 0],
    nick: { cat: { hold: [0, 0], res: [0, 0], street: [0, 0] }, form: [0, 0, 0], changed: 0, giveup: 0, tries: 0, coll: 0 },
  };
  const P = []; // 全部人物
  const alive = TOWNS.map(() => []); // 在鎮人物（含在任者）
  const gName = new Map(), tName = TOWNS.map(() => new Map()), strictN = new Map(), tNick = TOWNS.map(() => new Set());
  const retired = new Map();
  const inc = (m, k, v) => { const n = (m.get(k) || 0) + v; if (n) m.set(k, n); else m.delete(k); };
  const keyOf = (p) => p.sur * 1000 + p.given;
  const isStrict = (p) => p.tier === 'field' || p.tier === 'mid' || p.met >= 1;
  const regName = (p, v) => { const k = keyOf(p); inc(gName, k, v); inc(tName[p.town], k, v); if (isStrict(p)) inc(strictN, k, v); };
  const regNick = (p, on) => { if (p.nickKey) { if (on) tNick[p.town].add(p.nickKey); else tNick[p.town].delete(p.nickKey); } };
  let day = 0;

  // 抽名：sur/given；strict＝嚴格唯一（洗牌依序發放＝不放回抽，等價於拒絕重抽）
  function drawName(p, strict, fixedSur) {
    for (let a = 0; a < 5000; a++) {
      S.name.draws++;
      const flav = p.hered ? p.pf : (r() < 0.8 ? p.pf : drawW(TOWNS[p.town].dist));
      const sur = fixedSur !== undefined ? fixedSur : ri(N_SUR);
      const given = pick(POOL[flav][p.pres]);
      const k = sur * 1000 + given;
      if (forbid.has(k)) { S.name.forbidHit++; continue; }
      if (k === playerKey) { S.name.playerHit++; continue; }
      const rt = retired.get(k); if (rt !== undefined && day - rt < 240) { S.name.retiredRe++; continue; }
      if (strict) { if (opt.strongUnique ? gName.has(k) : strictN.has(k)) { S.name.strictRe++; continue; } }
      else {
        if (strictN.has(k) && opt.strongUnique) { S.name.reservedRe++; continue; }
        if (tName[p.town].has(k)) { S.name.townRe++; continue; }
      }
      p.sur = sur; p.given = given; p.nflav = flav; return true;
    }
    S.name.fail++; return false;
  }
  function giveNick(p, cat) {
    const prob = cat === 'hold' ? 0.6 : cat === 'res' ? 0.3 : 0;
    S.nick.cat[cat][1]++;
    if (!(r() < prob)) return;
    S.nick.tries++;
    const tag = pick(p.traits), words = TAG_WORDS[tag]; let wi = ri(words.length);
    const compound = p.sur >= N_SUR - N_SUR_COMPOUND;
    let form = drawW([40, 40, 20]); if (compound && form !== 0) form = 0;
    const str = (f, w) => (f === 0 ? 'b:' + words[w] : f === 1 ? 'w:' + words[w] + ':' + p.sur : 'o:' + p.sur + ':' + p.rank);
    const seq = [[form, wi]]; // 撞了依序：bare → 詞＋姓 → 同標籤下一詞（各再試 bare、詞＋姓）→ 放棄
    [0, 1].forEach((f) => { if (f !== form && !(f === 1 && compound)) seq.push([f, wi]); });
    for (let j = 1; j < words.length; j++) { const w = (wi + j) % words.length; seq.push([0, w]); if (!compound) seq.push([1, w]); }
    for (let i = 0; i < seq.length; i++) {
      const s = str(seq[i][0], seq[i][1]);
      if (!tNick[p.town].has(s)) { p.nickKey = s; p.nickForm = seq[i][0]; S.nick.cat[cat][0]++; S.nick.form[seq[i][0]]++; if (i > 0) S.nick.changed++; tNick[p.town].add(s); return; }
      if (i === 0) S.nick.coll++;
    }
    S.nick.giveup++;
  }
  // 生成一人。slot=null 為居民
  function genPerson(town, slot, opts) {
    opts = opts || {};
    const tier = slot ? slot.tier : 'res';
    const p = { pid: P.length, town, tier, slot: slot ? slot.id : null, pres: r() < 0.5 ? 0 : 1, met: 0, status: 'alive', hered: !!(slot && slot.hered && opts.heir), rank: 1 + ri(6), face: ri(64), nickKey: null, nickForm: -1 };
    p.pf = slot && slot.flav >= 0 ? slot.flav : drawW(TOWNS[town].dist); // 主氣味抽一次
    const nt = r() < 0.6 ? 2 : 3; const tr = []; while (tr.length < nt) { const t = ri(TAGS.length); if (!tr.includes(t)) tr.push(t); } p.traits = tr;
    const age = slot && (tier === 'field' || tier === 'mid') ? tri(AGE_RANGE[tier][0], AGE_RANGE[tier][1]) : resAge();
    p.born = day - age * YEAR;
    const strict = tier === 'field' || tier === 'mid';
    if (!drawName(p, strict, opts.heirSur)) { p.sur = ri(N_SUR); p.given = pick(POOL[p.pf][p.pres]); p.nflav = p.pf; }
    giveNick(p, tier === 'res' ? 'res' : tier === 'street' ? 'street' : 'hold');
    P.push(p); alive[town].push(p); regName(p, 1); regNick(p, true);
    if (strict) { S.flavHold.push([slot.id, day, p.nflav, slot.flav]); if (slot.id === 'F01' && day === 0) { S.f01[1]++; if (p.nflav === slot.flav) S.f01[0]++; } }
    if (tier === 'res' && day === 0) S.flavRes[town][p.nflav]++;
    return p;
  }
  const removeAlive = (p) => { const a = alive[p.town]; const i = a.indexOf(p); if (i >= 0) { a[i] = a[a.length - 1]; a.pop(); } regName(p, -1); regNick(p, false); };
  const ageOf = (p) => (day - p.born) / YEAR;

  // ---------- 開局 ----------
  const slotState = SLOTS.map((s) => ({ s, holder: null, vacUntil: -1, lastRoll: 0, vacCause: null, vacStart: 0 }));
  slotState.forEach((st) => { st.holder = genPerson(st.s.town, st.s); });
  TOWNS.forEach((t, ti) => { while (alive[ti].length < t.cap) genPerson(ti, null); });
  // 死亡年齡倍率正規化：以開局在任者年齡分布的平均倍率（【自補】數值積分）
  const EM = {};
  ['field', 'mid'].forEach((tier) => { let s = 0; const n = 200000; const rr = mulberry32(12345); for (let i = 0; i < n; i++) { const [a, b] = AGE_RANGE[tier]; const c = (a + b) / 2, u = rr(), fc = (c - a) / (b - a); const x = u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c)); s += ageMult(x); } EM[tier] = s / n; });
  { let s = 0; const w = [[16, 26, 0.2], [26, 50, 0.55], [50, 60, 0.15], [60, 71, 0.10]]; w.forEach(([a, b, q]) => { for (let i = 0; i < 1000; i++) s += q / 1000 * ageMult(a + (b - a) * (i + 0.5) / 1000); }); EM.street = s; }
  S.EM = EM;

  function fillSlot(st) {
    const s = st.s; const town = s.town; let p = null;
    if (s.hered && st.lastSur !== undefined) { // 依繼任（世襲）：同姓、名 100% 職位味
      p = genPerson(town, s, { heir: true, heirSur: st.lastSur }); S.hereditary++;
    } else { // 居民池：同鎮、年齡合格、未遇見過；取得職位後成為嚴格唯一者
      const [lo, hi] = AGE_RANGE[s.tier] || [16, 200];
      let cand = alive[town].filter((x) => x.tier === 'res' && ageOf(x) >= lo && ageOf(x) <= hi);
      if (!cand.length) { cand = alive[town].filter((x) => x.tier === 'res'); S.poolFallback++; }
      for (let tries = 0; tries < 200 && cand.length; tries++) {
        const c = pick(cand);
        if (s.tier !== 'street') { const k = keyOf(c); const rt = retired.get(k); const clash = (opt.strongUnique ? gName.get(k) > 1 : strictN.has(k)) || (rt !== undefined && day - rt < 240); if (clash) { S.promoSkip++; continue; } }
        p = c; break;
      }
      if (!p) { p = genPerson(town, s); S.poolFallback++; }
      else { regName(p, -1); p.tier = s.tier; p.slot = s.id; regName(p, 1); }
    }
    if (s.tier !== 'street') { const rt = retired.get(keyOf(p)); if (rt !== undefined && day - rt < 240) S.name.reuse240++; } // 驗證：240 日內不重用
    st.holder = p; st.lastRoll = day; st.vacUntil = -1;
  }
  function vacate(st, cause) {
    const p = st.holder; const tier = st.s.tier; const ci = CAUSES.indexOf(cause);
    S.causes[tier][ci]++; S.turn[tier][0]++;
    if (tier !== 'street') retired.set(keyOf(p), day);
    st.lastSur = p.sur; st.holder = null;
    if (cause === 'death') { removeAlive(p); p.status = 'dead'; S.deathsHold++; S.deathsByTown[p.town]++; if (TOWNS[p.town].grave) S.grave++; }
    else if (cause === 'migrate') { removeAlive(p); p.status = 'moved'; }
    else if (cause === 'promoted') { removeAlive(p); p.status = 'promoted'; }
    else { regName(p, -1); p.tier = 'res'; p.slot = null; regName(p, 1); } // 被取代：留鎮當居民
    const v = VAC[tier][cause];
    const len = v ? v[0] + ri(v[1] - v[0] + 1) : 0;
    S.vac.push([tier, cause, len]); if (v && (len < v[0] || len > v[1])) S.vacBad++;
    if (len === 0) fillSlot(st); else { st.vacUntil = day + len; st.vacCause = cause; }
  }
  function rollSlots(ti) {
    slotState.forEach((st) => {
      if (st.s.town !== ti || !st.holder) return;
      const k = day - st.lastRoll; if (k <= 0) return; st.lastRoll = day;
      const tier = st.s.tier; S.turn[tier][1] += k;
      if (r() < 1 - Math.pow(1 - H[tier], k)) {
        const pd = Math.min(1, CAUSE_P[0] * ageMult(ageOf(st.holder)) / EM[tier]);
        let cause; if (r() < pd) cause = 'death'; else cause = CAUSES[1 + drawW([35, 10, 15])];
        vacate(st, cause);
      }
    });
  }
  function rollResidents(ti, k) {
    const t = TOWNS[ti]; const list = alive[ti].filter((x) => x.tier === 'res');
    list.forEach((p) => {
      const q = 1 - Math.pow(1 - dailyH(resDeathQ(ageOf(p))), k);
      if (r() < q) { removeAlive(p); p.status = 'dead'; S.deathsRes++; S.deathsByTown[ti]++; if (t.grave) { S.grave++; S.graveRes++; } return; }
      if (r() < 1 - Math.pow(1 - dailyH(RES_MIG), k)) { removeAlive(p); p.status = 'moved'; S.migOut++; }
    });
    const deficit = t.cap - alive[ti].length;
    if (deficit > 0) { const add = Math.min(deficit, poisson(0.05 * t.cap / YEAR * k) + opt.refugeePerDay * k); for (let i = 0; i < add; i++) { genPerson(ti, null); S.immig++; } }
  }
  function scene() {
    const a = alive[PLAYER_TOWN]; const n = 1 + ri(10); const sc = []; const surs = new Set();
    for (let t = 0; t < 60 && sc.length < n; t++) { const p = pick(a); if (sc.includes(p)) continue; if (surs.has(p.sur)) { S.name.sceneSkip++; continue; } sc.push(p); surs.add(p.sur); }
    if (new Set(sc.map((p) => p.sur)).size !== sc.length) S.name.sceneSameSur++;
    S.name.scenes++; S.name.sceneN += sc.length;
    sc.forEach((p) => {
      if (!(r() < opt.metP)) return;
      if (p.met === 0) { // 0→1：成為嚴格唯一者；撞名就在見面前改名（玩家還沒看過這名字）
        const k = keyOf(p); const rt = retired.get(k);
        const clash = (opt.strongUnique ? gName.get(k) > 1 : strictN.has(k)) || (rt !== undefined && day - rt < 240);
        if (clash && !(p.tier === 'field' || p.tier === 'mid')) { regName(p, -1); regNick(p, false); drawName(p, true); regName(p, 1); regNick(p, true); S.name.metRename++; }
        regName(p, -1); p.met = 1; regName(p, 1); S.name.metEvents++;
      } else p.met++;
    });
  }
  function verify() {
    const seen = new Map();
    for (let ti = 0; ti < TOWNS.length; ti++) for (const p of alive[ti]) { const k = keyOf(p); seen.set(k, (seen.get(k) || 0) + 1); }
    const strictSeen = new Map();
    for (let ti = 0; ti < TOWNS.length; ti++) for (const p of alive[ti]) if (isStrict(p)) { const k = keyOf(p); strictSeen.set(k, (strictSeen.get(k) || 0) + 1); if (seen.get(k) > 1) S.name.strictColl++; }
    strictSeen.forEach((c) => { if (c > 1) S.name.strictCollWeak += c - 1; });
    // 同鎮路人不重名
    for (let ti = 0; ti < TOWNS.length; ti++) { const m = new Set(); for (const p of alive[ti]) { const k = keyOf(p); if (m.has(k)) S.name.townColl = (S.name.townColl || 0) + 1; m.add(k); } }
  }

  // ---------- 主迴圈 ----------
  for (day = 1; day <= opt.days; day++) {
    const d0 = S.deathsRes + S.deathsHold, g0 = S.grave, dr0 = S.deathsRes, gr0 = S.graveRes, dh0 = S.deathsByTown[0];
    for (let ti = 0; ti < TOWNS.length; ti++) {
      const daily = ti === PLAYER_TOWN;
      if (daily || day % opt.coarse === 0) { rollSlots(ti); rollResidents(ti, daily ? 1 : opt.coarse); }
    }
    slotState.forEach((st) => { if (!st.holder && st.vacUntil === day) fillSlot(st); });
    for (let i = 0; i < opt.scenesPerDay; i++) scene();
    verify();
    S.dailyDeaths.push([S.deathsRes + S.deathsHold - d0, S.grave - g0, S.deathsRes - dr0, S.graveRes - gr0, S.deathsByTown[0] - dh0]);
    if (day % 30 === 0) { const ag = [].concat(...alive).map(ageOf); S.popTraj.push([day].concat(alive.map((a) => a.length), [ag.filter((x) => x >= 50).length / ag.length])); }
  }
  day = opt.days;
  // 終局：人口、年齡
  S.popEnd = alive.map((a) => a.length);
  const all = [].concat(...alive); const ages = all.map(ageOf);
  S.age50 = ages.filter((a) => a >= 50).length / ages.length;
  S.ageBands = [[16, 26], [26, 50], [50, 60], [60, 71], [71, 999]].map(([a, b]) => ages.filter((x) => x >= a && x < b).length / ages.length);
  S.ageUnder16 = ages.filter((x) => x < 16).length;
  S.townAge50 = alive.map((a) => a.filter((p) => ageOf(p) >= 50).length / a.length);
  slotState.forEach((st) => { if (st.holder && st.s.tier !== 'street') S.flavHoldEnd.push([st.s.id, st.holder.nflav, st.s.flav]); });
  S.persons = P; S.alive = alive; S.slots = slotState; S.ageOf = ageOf;
  return S;
}
module.exports = { run, TOWNS, FLAV, POOL, GIVEN, TAGS, TAG_WORDS, SLOTS, H, N_SUR, N_SUR_COMPOUND, NAME_COUNTS, YEAR, VAC, CAUSES, mulberry32, hashStr };
