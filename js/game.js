/* 《山海錄》灰盒 v0.1 — 遊戲邏輯（狀態、存檔、時間、背包、戰鬥、事件） */
'use strict';

window.SHL = (function () {
  const D = window.SHL_DATA;
  const SAVE_KEY = 'shanhailu.save';
  const SCHEMA = 1;
  const DAY_START = 8 * 60; // 第 1 日 08:00
  const BASE_HP = 80;
  const BASE_CAP = 80;

  let S = null; // 目前狀態
  let listeners = [];

  // ================= 亂數（可指定種子，方便自動化驗證） =================
  function rnd() {
    let t = (S.rng = (S.rng + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  function pickW(w) {
    const ks = Object.keys(w);
    let tot = 0; ks.forEach((k) => (tot += w[k]));
    let r = rnd() * tot;
    for (const k of ks) { r -= w[k]; if (r <= 0) return k; }
    return ks[ks.length - 1];
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ================= 時間：一律 24 小時制 =================
  function fmtClock(t) {
    const m = ((t % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function fmtTime(t) { return '第 ' + (Math.floor(t / 1440) + 1) + ' 日 ' + fmtClock(t); }
  function dayOf(t) { return Math.floor(t / 1440) + 1; }
  function hourOf(t) { return Math.floor((t % 1440) / 60); }
  function isNight(t) { const h = hourOf(t); return h >= 20 || h < 5; }

  // ================= 物品工具 =================
  function newEq(baseId, rarity) {
    const b = D.BASES[baseId];
    rarity = rarity || 'white';
    const eq = { uid: ++S.uid, base: baseId, rarity, name: b.name, affixes: [], unique: null };
    if (b.slot !== 'bag') {
      const [lo, hi] = D.RARITY[rarity].affix;
      const n = ri(lo, hi);
      const pool = Object.keys(D.AFFIXES).filter((k) => !(k === 'dmg' && !b.dmg && b.slot !== 'ring' && b.slot !== 'amulet' && b.slot !== 'gloves'));
      for (let i = 0; i < n && pool.length; i++) {
        const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        const r = D.AFFIXES[k].r;
        eq.affixes.push({ id: k, v: ri(r[0], r[1]) });
      }
      if (rarity === 'legend') {
        const L = D.LEGENDS[b.slot] || D.LEGENDS.amulet;
        eq.unique = D.LEGENDS[b.slot] ? L.unique : 'sure_retreat';
        eq.name = D.LEGENDS[b.slot] ? L.name : '遺物・' + b.name;
      } else if (rarity === 'rare') {
        eq.name = pick(['霧紋', '赤石', '枯骨', '淵紋']) + b.name;
      }
    }
    return { k: 'eq', eq };
  }
  function eqBase(eq) { return D.BASES[eq.base]; }
  function eqValue(eq) { return Math.round(eqBase(eq).val * D.RARITY[eq.rarity].mult); }
  function itemWt(it) {
    if (!it) return 0;
    if (it.k === 'eq') return eqBase(it.eq).wt;
    return D.ITEMS[it.k].wt * it.n;
  }
  function itemName(it) { return it.k === 'eq' ? it.eq.name : D.ITEMS[it.k].name; }
  function itemGlyph(it) { return it.k === 'eq' ? eqBase(it.eq).g : D.ITEMS[it.k].g; }

  // ================= 衍生數值 =================
  function allEquipped() {
    const out = [];
    D.EQ_SLOTS.forEach((s) => { if (S.equip[s]) out.push(S.equip[s]); });
    return out;
  }
  function affixSum(id) {
    let v = 0;
    allEquipped().forEach((eq) => eq.affixes.forEach((a) => { if (a.id === id) v += a.v; }));
    return v;
  }
  function hasUnique(u) { return allEquipped().some((eq) => eq.unique === u); }
  function maxHp() { return BASE_HP + affixSum('hp'); }
  function bagCap() { return S.equip.bag ? eqBase(S.equip.bag).bag : 0; }
  function carryCap() {
    const belt = S.equip.belt ? eqBase(S.equip.belt).cap || 0 : 0;
    return BASE_CAP + belt + affixSum('cap');
  }
  function totalWt() {
    let w = 0;
    allEquipped().forEach((eq) => (w += eqBase(eq).wt));
    if (S.equip.bag) w += eqBase(S.equip.bag).wt;
    S.pack.forEach((it) => (w += itemWt(it)));
    return w;
  }
  function loadBand(w) {
    const r = (w === undefined ? totalWt() : w) / carryCap();
    if (r <= 0.4) return { id: 'light', name: '輕裝', mult: 1, fat: 1 };
    if (r <= 0.75) return { id: 'normal', name: '常態重負', mult: 0.82, fat: 1.2 };
    if (r <= 1) return { id: 'heavy', name: '超載', mult: 0.6, fat: 1.5 };
    return { id: 'over', name: '超載（過量）', mult: 0.4, fat: 2 };
  }
  function speedMult() {
    let m = loadBand().mult * (1 + affixSum('spd') / 100);
    if (S.fat >= 80) m *= 0.85;
    return m;
  }
  function armor() {
    let a = 0;
    allEquipped().forEach((eq) => (a += eqBase(eq).armor || 0));
    return a + affixSum('armor');
  }
  function weaponDmg() {
    const m = S.equip.main ? eqBase(S.equip.main).dmg : [1, 3];
    const o = S.equip.off && eqBase(S.equip.off).dmg ? eqBase(S.equip.off).dmg : [0, 0];
    const flat = affixSum('dmg') + (profLv('zhan') - 1);
    const pct = 1 + affixSum('dmgp') / 100;
    return [Math.round((m[0] + o[0] + flat) * pct), Math.round((m[1] + o[1] + flat) * pct)];
  }
  function hitChance() {
    let h = 0.88 + affixSum('acc') / 100 + (profLv('zhan') - 1) * 0.02;
    if (S.fat >= 80) h -= 0.15;
    if (S.food < 20) h -= 0.05;
    return clamp(h, 0.3, 0.98);
  }
  function profLv(id) {
    const xp = S.prof[id];
    let lv = 1;
    for (let i = 0; i < D.PROF_XP.length; i++) if (xp >= D.PROF_XP[i]) lv = i + 1;
    return lv;
  }
  function profProgress(id) {
    const lv = profLv(id); const xp = S.prof[id];
    if (lv >= D.PROF_XP.length) return 1;
    const a = D.PROF_XP[lv - 1], b = D.PROF_XP[lv];
    return (xp - a) / (b - a);
  }
  function gainProf(id, n) {
    const before = profLv(id);
    S.prof[id] += n;
    const after = profLv(id);
    if (after > before) log(D.PROFS.find((p) => p.id === id).name + '熟練度提升至 ' + after, 'good');
  }

  // ================= 紀錄 =================
  function log(text, cls) {
    S.log.push({ t: S.t, text, cls: cls || '' });
    if (S.log.length > 200) S.log.shift();
  }

  // ================= 新局／存檔（永久死亡＋城鎮檢查點雙模式預留） =================
  function newGame(seed) {
    S = {
      schema: SCHEMA,
      seed: seed >>> 0, rng: seed >>> 0, uid: 0,
      meta: { saveMode: 'permadeath', createdAt: Date.now() },
      name: '沈衡',
      t: DAY_START, loc: 'huiyao', scene: 'town', overlay: null,
      hp: BASE_HP, food: 80, fat: 10, silver: 60,
      prof: { zhan: 0, cai: 0, lie: 0, yao: 0, xing: 0 },
      skills: [],
      equip: { main: null, off: null, head: null, chest: null, gloves: null, boots: null, amulet: null, ring1: null, ring2: null, belt: null, bag: null, cart: null, cartLocked: true },
      pack: [], ground: { node: 'huiyao', items: [] },
      nodes: {}, fire: false,
      bounties: [], dungeon: null, combat: null, event: null, loot: null,
      townTab: 'market', trade: null, dest: null, retreatSel: [],
      log: [], stats: { kills: 0, gathers: 0, crafts: 0, hours: 0, maxSilver: 60, bounties: 0, cause: '' },
      shops: {}, dead: null,
    };
    S.equip.main = newEq('blade_rust').eq;
    S.equip.chest = newEq('robe').eq;
    S.equip.bag = newEq('bag_cloth').eq;
    S.pack = [{ k: 'pot_hp', n: 2 }, { k: 'bread', n: 2 }];
    padPack();
    restockShops();
    D.BOUNTIES.forEach((b) => S.bounties.push({ id: b.id, prog: 0, status: b.start ? 'active' : 'open' }));
    log('沈衡在灰窯鎮醒來。賞金板上的「灰髯狼 ×3」已揭下。');
    log('枯骨獸徑多狼；青霧藥林可採藥。');
    save();
    emit();
  }
  function restockShops() {
    Object.keys(D.TOWNS).forEach((tid) => {
      S.shops[tid] = D.TOWNS[tid].stock.map((row) => {
        const [k, price, extra] = row;
        if (D.BASES[k]) return { it: newEq(k, typeof extra === 'string' ? extra : 'white'), price, stock: 1 };
        return { it: { k, n: 1 }, price, stock: extra || 5 };
      });
    });
    S.shopDay = dayOf(S.t);
  }
  function save() {
    if (!S) return;
    // 純永久死亡：死後不再寫回存檔
    if (S.dead && S.meta.saveMode === 'permadeath') { wipeSave(); return; }
    try {
      const wrap = { schema: SCHEMA, saveMode: S.meta.saveMode, state: S, checkpoint: null };
      const prev = readRaw();
      if (prev && prev.checkpoint) wrap.checkpoint = prev.checkpoint;
      localStorage.setItem(SAVE_KEY, JSON.stringify(wrap));
    } catch (e) { /* 無痕或停用儲存時忽略 */ }
  }
  function readRaw() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  // 城鎮檢查點快照：僅 saveMode === 'checkpoint' 時寫入（MVP 介面只跑純永久死亡）
  function checkpointSnapshot() {
    if (S.meta.saveMode !== 'checkpoint') return;
    try {
      const wrap = readRaw() || { schema: SCHEMA };
      wrap.checkpoint = JSON.parse(JSON.stringify(S));
      localStorage.setItem(SAVE_KEY, JSON.stringify(wrap));
    } catch (e) { /* ignore */ }
  }
  function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
  function load() {
    const w = readRaw();
    if (!w || w.schema !== SCHEMA || !w.state || w.state.dead) return false;
    S = w.state;
    return true;
  }

  // ================= 背包 =================
  function padPack() {
    const cap = bagCap();
    while (S.pack.length < cap) S.pack.push(null);
    // 容量變小時：多出的物品落到地面
    while (S.pack.length > cap) {
      const it = S.pack.pop();
      if (it) dropToGround(it);
    }
  }
  function countItem(k) { let n = 0; S.pack.forEach((it) => { if (it && it.k === k) n += it.n; }); return n; }
  function canAdd(it) {
    if (it.k === 'eq') return S.pack.some((x) => !x);
    let left = it.n; const st = D.ITEMS[it.k].stack;
    S.pack.forEach((x) => { if (!x) left -= st; else if (x.k === it.k) left -= st - x.n; });
    return left <= 0;
  }
  // 加入行囊；放不下的部分落到地面，回傳落地數量
  function addItem(it) {
    if (it.k === 'eq') {
      const i = S.pack.findIndex((x) => !x);
      if (i >= 0) { S.pack[i] = it; return 0; }
      return dropToGround(it) ? 1 : 1;
    }
    const st = D.ITEMS[it.k].stack;
    let left = it.n;
    S.pack.forEach((x) => { if (left > 0 && x && x.k === it.k && x.n < st) { const m = Math.min(st - x.n, left); x.n += m; left -= m; } });
    for (let i = 0; i < S.pack.length && left > 0; i++) {
      if (!S.pack[i]) { const m = Math.min(st, left); S.pack[i] = { k: it.k, n: m }; left -= m; }
    }
    if (left > 0) dropToGround({ k: it.k, n: left });
    return left;
  }
  function removeItem(k, n) {
    for (let i = S.pack.length - 1; i >= 0 && n > 0; i--) {
      const x = S.pack[i];
      if (x && x.k === k) { const m = Math.min(x.n, n); x.n -= m; n -= m; if (x.n <= 0) S.pack[i] = null; }
    }
  }
  function ensureGround() { if (S.ground.node !== S.loc) { S.ground = { node: S.loc, items: [] }; } }
  function dropToGround(it) {
    ensureGround();
    if (it.k !== 'eq') {
      const same = S.ground.items.find((x) => x.k === it.k);
      if (same) { same.n += it.n; return true; }
    }
    if (S.ground.items.length >= 10) { log(itemName(it) + ' 散落遺失（地面已滿）', 'bad'); return false; }
    S.ground.items.push(it);
    return true;
  }
  function pickupGround(i) {
    ensureGround();
    const it = S.ground.items[i];
    if (!it) return;
    if (it.k === 'eq') {
      if (!canAdd(it)) { log('行囊已滿，撿不起來。', 'bad'); return emit(); }
      S.ground.items.splice(i, 1); addItem(it);
    } else {
      // 盡量撿：能放多少放多少
      const st = D.ITEMS[it.k].stack; let room = 0;
      S.pack.forEach((x) => { if (!x) room += st; else if (x.k === it.k) room += st - x.n; });
      const m = Math.min(room, it.n);
      if (m <= 0) { log('行囊已滿，撿不起來。', 'bad'); return emit(); }
      addItem({ k: it.k, n: m }); it.n -= m;
      if (it.n <= 0) S.ground.items.splice(i, 1);
    }
    log('撿起 ' + itemName(it));
    commit();
  }

  // ================= 時間流逝與生存 =================
  function passTime(hours, opts) {
    opts = opts || {};
    const mins = Math.round(hours * 60);
    const startDay = dayOf(S.t);
    S.t += mins;
    S.stats.hours += hours;
    const fatMult = (opts.fatMult || 1) * (1 - affixSum('fatred') / 100);
    S.food = clamp(S.food - (opts.food !== undefined ? opts.food : 4 * hours), 0, 100);
    S.fat = clamp(S.fat + (opts.fat !== undefined ? opts.fat : 2 * hours) * fatMult, 0, 100);
    // 生命：飽食過低回復停滯、斷糧扣血；過度疲累扣血
    if (S.food <= 0) { S.hp -= 3 * hours; S.stats.cause = '餓死荒野'; }
    else if (S.food >= 30 && !opts.noRegen) S.hp = Math.min(maxHp(), S.hp + 1 * hours);
    if (S.fat >= 100) { S.hp -= 2 * hours; S.stats.cause = '力竭倒地'; }
    S.food = Math.round(S.food); S.fat = Math.round(S.fat); S.hp = Math.round(S.hp);
    if (dayOf(S.t) !== startDay) newDay();
    checkDeath();
  }
  function newDay() {
    S.nodes = {}; // 採集點每日回復
    restockShops();
    if (S.dungeon) S.dungeon.clearedDay = null;
    log(fmtTime(S.t) + '，新的一天：採集點與貨架已回補。');
  }
  function nodeState(id) {
    if (!S.nodes[id]) {
      const W = D.WILDS[id]; const pts = {};
      if (W) W.points.forEach((p) => (pts[p.id] = p.max));
      S.nodes[id] = { pts };
    }
    return S.nodes[id];
  }

  function checkDeath(cause) {
    if (S.hp > 0 || S.dead) return false;
    S.hp = 0;
    die(cause || S.stats.cause || '不明');
    return true;
  }
  function die(cause) {
    const N = D.NODES[S.loc];
    S.dead = {
      cause, where: N.name, when: fmtTime(S.t),
      days: dayOf(S.t), hours: Math.round(S.stats.hours),
      profs: D.PROFS.map((p) => p.name + ' ' + profLv(p.id)).join('・'),
      kills: S.stats.kills, gathers: S.stats.gathers, crafts: S.stats.crafts, maxSilver: S.stats.maxSilver,
      bounties: S.stats.bounties, skills: S.skills.map((k) => D.SKILLS[k].name),
    };
    S.combat = null; S.event = null; S.loot = null; S.overlay = null;
    S.scene = 'dead';
    log('沈衡死於' + N.name + '：' + cause, 'bad');
    // 純永久死亡：刪檔（檢查點模式則保留 checkpoint 快照，MVP 介面不開放）
    if (S.meta.saveMode === 'permadeath') wipeSave();
  }

  // ================= 物品使用／裝備 =================
  function useItem(i, inCombat) {
    const it = S.pack[i];
    if (!it) return false;
    if (it.k === 'eq') {
      if (inCombat) { log('戰鬥中不能換裝。', 'bad'); return false; }
      equip(i); return true;
    }
    const I = D.ITEMS[it.k];
    if (I.type === 'scroll') {
      if (S.skills.includes(I.skill)) { log('已習得「' + D.SKILLS[I.skill].name + '」。'); return false; }
      S.skills.push(I.skill); S.pack[i] = null;
      log('研讀殘卷，習得「' + D.SKILLS[I.skill].name + '」', 'good');
      return true;
    }
    if (I.type !== 'use') { log(I.name + '：' + I.desc); return false; }
    const u = I.use;
    if (u.hp) { const heal = u.hp + (profLv('yao') - 1) * 4; S.hp = Math.min(maxHp(), S.hp + heal); log('飲下' + I.name + '，生命 +' + heal); }
    if (u.fat) { S.fat = clamp(S.fat + u.fat, 0, 100); log('飲下' + I.name + '，疲累 ' + u.fat); }
    if (u.food) { S.food = clamp(S.food + u.food, 0, 100); log('吃下' + I.name + '，飽食 +' + u.food); }
    it.n -= 1; if (it.n <= 0) S.pack[i] = null;
    return true;
  }
  function slotFor(eq) {
    const s = eqBase(eq).slot;
    if (s === 'ring') return !S.equip.ring1 ? 'ring1' : !S.equip.ring2 ? 'ring2' : 'ring1';
    return s;
  }
  function equip(i) {
    const it = S.pack[i];
    const eq = it.eq; const B = eqBase(eq);
    const slot = slotFor(eq);
    S.pack[i] = null;
    const back = [];
    if (S.equip[slot]) back.push(S.equip[slot]);
    if (slot === 'main' && B.twoHanded && S.equip.off) { back.push(S.equip.off); S.equip.off = null; }
    if (slot === 'off' && S.equip.main && eqBase(S.equip.main).twoHanded) { back.push(S.equip.main); S.equip.main = null; }
    S.equip[slot] = eq;
    if (slot === 'bag') padPack();
    back.forEach((e) => addItem({ k: 'eq', eq: e }));
    log('裝備' + eq.name);
    commit();
  }
  function unequip(slot) {
    const eq = S.equip[slot];
    if (!eq || slot === 'bag' || S.combat) return;
    if (!S.pack.some((x) => !x)) { log('行囊已滿，無法卸下。', 'bad'); return emit(); }
    S.equip[slot] = null; addItem({ k: 'eq', eq });
    log('卸下' + eq.name);
    commit();
  }
  function clickPack(i) {
    if (S.dead) return;
    const it = S.pack[i]; if (!it) return;
    if (S.scene === 'town' && S.townTab === 'market') { S.trade = { mode: 'sell', slot: i, qty: it.k === 'eq' ? 1 : it.n }; return emit(); }
    if (S.combat) return combatAction('item', i);
    useItem(i, false); commit();
  }

  // ================= 地圖與移動 =================
  function neighbors(id) {
    const out = [];
    D.EDGES.forEach((e) => { if (e.a === id) out.push([e.b, e]); else if (e.b === id) out.push([e.a, e]); });
    return out;
  }
  function route(from, to) {
    // Dijkstra：以基礎時數為權重
    const dist = {}, prev = {}, Q = Object.keys(D.NODES);
    Q.forEach((k) => (dist[k] = Infinity)); dist[from] = 0;
    const left = new Set(Q);
    while (left.size) {
      let u = null; left.forEach((k) => { if (u === null || dist[k] < dist[u]) u = k; });
      left.delete(u);
      neighbors(u).forEach(([v, e]) => { if (dist[u] + e.h < dist[v]) { dist[v] = dist[u] + e.h; prev[v] = [u, e]; } });
    }
    const edges = []; let c = to;
    while (c !== from && prev[c]) { edges.unshift(prev[c][1]); c = prev[c][0]; }
    return edges;
  }
  function travelPreview(to) {
    const edges = route(S.loc, to);
    const base = edges.reduce((a, e) => a + e.h, 0);
    const sm = speedMult();
    const hours = Math.max(1, Math.ceil(base / sm));
    const band = loadBand();
    const xingRed = 1 - (profLv('xing') - 1) * 0.05 - (S.skills.includes('jixing') ? 0.1 : 0);
    const fat = Math.round(3 * hours * band.fat * xingRed * (1 - affixSum('fatred') / 100));
    const food = 4 * hours;
    const wild = edges.some((e) => !e.road);
    let risk = wild ? (edges.length > 1 ? 0.3 : 0.22) : 0.04;
    if (isNight(S.t)) risk *= 2;
    if (band.id === 'heavy' || band.id === 'over') risk *= 1.4;
    const riskName = risk < 0.15 ? '低' : risk < 0.35 ? '中' : '高';
    const via = edges.length > 1 ? D.NODES[edges[0].a === S.loc ? edges[0].b : edges[0].a].name : (edges[0] && edges[0].road ? '官道' : '野徑');
    return { edges, hours, fat, food, risk, riskName, mult: sm, via, wild };
  }
  function selectDest(id) {
    if (S.dead) return;
    const N = D.NODES[id];
    if (!N || N.kind === 'way') return;
    S.dest = id === S.loc ? null : id;
    emit();
  }
  function travel() {
    const to = S.dest;
    if (!to || S.combat || S.dead) return;
    if (totalWt() > carryCap() * 1.25) { log('背得太重寸步難行，先丟掉些東西。', 'bad'); return emit(); }
    const p = travelPreview(to);
    const fromName = D.NODES[S.loc].name;
    if (S.ground.items.length && S.ground.node === S.loc) log('留在' + fromName + '地面的東西沒帶走。');
    S.fire = false;
    S.dest = null;
    S.loc = to; S.ground = { node: to, items: [] };
    passTime(p.hours, { fat: p.fat / ((1 - affixSum('fatred') / 100) || 1), food: p.food });
    gainProf('xing', 1);
    log('自' + fromName + '出發，經' + p.via + '，' + p.hours + ' 小時後抵達' + D.NODES[to].name + '。');
    if (S.dead) return commit();
    if (rnd() < p.risk) { startEvent(to); return commit(); }
    enterNode(to);
    commit();
  }
  function enterNode(id) {
    S.loc = id;
    const N = D.NODES[id];
    S.event = null; S.loot = null; S.combat = null;
    if (N.kind === 'town') { S.scene = 'town'; S.townTab = S.townTab || 'market'; S.trade = null; checkpointSnapshot(); }
    else if (N.kind === 'wild') { S.scene = 'wild'; nodeState(id); }
    else if (N.kind === 'dungeon') {
      S.scene = 'dungeon';
      if (!S.dungeon || S.dungeon.id !== id) S.dungeon = { id, floor: 0, clearedDay: null };
    }
  }
  function toMap() { if (S.combat || S.dead) return; S.scene = 'map'; S.event = null; S.loot = null; emit(); }
  function enterHere() { if (S.combat || S.dead) return; enterNode(S.loc); commit(); }

  // ================= 城鎮 =================
  function townPrice(k, town) { return (D.TOWNS[town || S.loc].buy || {})[k]; }
  function avgPrice(k) { const a = D.TOWNS.huiyao.buy[k], b = D.TOWNS.duyin.buy[k]; return (a + b) / 2; }
  function sellPrice(it) {
    const bonus = 1 + (profLv('xing') - 1) * 0.03;
    if (it.k === 'eq') return Math.max(1, Math.floor(eqValue(it.eq) * 0.6 * bonus));
    const p = townPrice(it.k);
    return p ? Math.max(1, Math.floor(p * bonus)) : 0;
  }
  function setTab(t) { S.townTab = t; S.trade = null; emit(); }
  function selectShop(i) { const row = S.shops[S.loc][i]; if (!row) return; S.trade = { mode: 'buy', idx: i, qty: 1 }; emit(); }
  function setQty(d) {
    if (!S.trade) return;
    let max = 1;
    if (S.trade.mode === 'buy') { const row = S.shops[S.loc][S.trade.idx]; max = row ? row.stock : 1; }
    else { const it = S.pack[S.trade.slot]; max = it ? (it.k === 'eq' ? 1 : it.n) : 1; }
    S.trade.qty = clamp(S.trade.qty + d, 1, Math.max(1, max));
    emit();
  }
  function buy() {
    const tr = S.trade; if (!tr || tr.mode !== 'buy') return;
    const row = S.shops[S.loc][tr.idx]; if (!row || row.stock <= 0) return;
    const qty = row.it.k === 'eq' ? 1 : Math.min(tr.qty, row.stock);
    const cost = row.price * qty;
    if (S.silver < cost) { log('銀兩不足。', 'bad'); return emit(); }
    if (row.it.k === 'eq') {
      const eq = row.it.eq;
      if (eqBase(eq).slot === 'bag') {
        // 背包商品化：買下即換上，舊包落入行囊／地面
        const old = S.equip.bag;
        S.equip.bag = eq; padPack();
        if (old) addItem({ k: 'eq', eq: old });
        log('買下並換上' + eq.name + '（' + eqBase(eq).bag + ' 格），舊包收進行囊。', 'good');
      } else {
        if (!canAdd(row.it)) { log('行囊已滿。', 'bad'); return emit(); }
        addItem(row.it); log('買下' + eq.name);
      }
      S.silver -= cost; row.stock = 0;
      S.shops[S.loc].splice(tr.idx, 1); S.trade = null;
    } else {
      const it = { k: row.it.k, n: qty };
      if (!canAdd(it)) { log('行囊放不下。', 'bad'); return emit(); }
      addItem(it); S.silver -= cost; row.stock -= qty;
      log('買下' + D.ITEMS[it.k].name + ' ×' + qty + '，' + cost + ' 兩');
      if (row.stock <= 0) { S.shops[S.loc].splice(tr.idx, 1); S.trade = null; } else tr.qty = 1;
    }
    commit();
  }
  function sell(slot, qty) {
    if (slot === undefined && S.trade && S.trade.mode === 'sell') { slot = S.trade.slot; qty = S.trade.qty; }
    const it = S.pack[slot]; if (!it) return;
    const p = sellPrice(it);
    if (!p) { log('此地不收' + itemName(it) + '。', 'bad'); return emit(); }
    if (it.k === 'eq') { S.pack[slot] = null; S.silver += p; log('賣出' + it.eq.name + '，得銀 ' + p + ' 兩'); }
    else {
      const n = Math.min(qty || it.n, it.n);
      it.n -= n; if (it.n <= 0) S.pack[slot] = null;
      S.silver += p * n; log('賣出' + D.ITEMS[it.k].name + ' ×' + n + '，得銀 ' + p * n + ' 兩');
    }
    gainProf('xing', 1);
    S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver);
    S.trade = null;
    commit();
  }
  function innRest() {
    if (S.silver < 8) { log('銀兩不足。', 'bad'); return emit(); }
    S.silver -= 8;
    // 歇一夜：睡到隔日 08:00
    const now = S.t; let next = (dayOf(now)) * 1440 + 8 * 60;
    if (next - now < 6 * 60) next += 1440;
    passTime((next - now) / 60, { food: 10, fat: 0, noRegen: true });
    S.hp = maxHp(); S.fat = 0;
    log('客棧歇一夜，疲累清零、生命回滿。', 'good');
    commit();
  }
  function innSoup() {
    if (S.silver < 3) { log('銀兩不足。', 'bad'); return emit(); }
    S.silver -= 3; S.food = clamp(S.food + 30, 0, 100);
    passTime(0.5, { food: 0, fat: 0 });
    log('喝了碗熱湯，飽食 +30');
    commit();
  }
  function claimBounty(id) {
    const b = S.bounties.find((x) => x.id === id); const B = D.BOUNTIES.find((x) => x.id === id);
    if (!b) return;
    if (b.status === 'open') { b.status = 'active'; log('揭下賞金：' + B.title); return commit(); }
    if (b.status === 'done') {
      b.status = 'claimed'; S.silver += B.reward; S.stats.bounties++;
      S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver);
      log('交付賞金「' + B.title + '」，得銀 ' + B.reward + ' 兩', 'good');
      return commit();
    }
  }
  function bountyProgress(kind, key) {
    S.bounties.forEach((b) => {
      const B = D.BOUNTIES.find((x) => x.id === b.id);
      if (b.status !== 'active') return;
      if ((kind === 'kill' && B.kind === 'kill' && B.enemy === key) || (kind === 'clear' && B.kind === 'clear' && B.dungeon === key)) {
        b.prog = Math.min(B.need, b.prog + 1);
        if (b.prog >= B.need) { b.status = 'done'; log('賞金「' + B.title + '」已達成，回城鎮賞金板交付。', 'good'); }
      }
    });
  }
  function trackedBounty() {
    const b = S.bounties.find((x) => x.status === 'active' || x.status === 'done');
    return b ? { b, B: D.BOUNTIES.find((x) => x.id === b.id) } : null;
  }

  // ================= 製作（營火／藥爐） =================
  function canCraftHere(R) {
    const town = D.NODES[S.loc].kind === 'town';
    if (R.fireOnly) return S.scene === 'wild' && S.fire;
    return (S.scene === 'wild' && S.fire) || town;
  }
  function craft(rid) {
    const R = D.RECIPES.find((r) => r.id === rid);
    if (!R || !canCraftHere(R)) { log(R && R.fireOnly ? '需要先生起營火。' : '需要營火或城鎮藥爐。', 'bad'); return emit(); }
    if (countItem(R.mat) < R.n) { log('材料不足：' + D.ITEMS[R.mat].name + ' ' + countItem(R.mat) + '/' + R.n, 'bad'); return emit(); }
    const saved = profLv('yao') >= 3 && R.n > 1 && rnd() < 0.3;
    removeItem(R.mat, saved ? R.n - 1 : R.n);
    passTime(R.h, { fat: 1 });
    if (S.dead) return commit();
    addItem({ k: R.out, n: 1 });
    gainProf('yao', 1); S.stats.crafts++;
    log('製成' + R.name + (saved ? '（省下 1 份材料）' : ''), 'good');
    commit();
  }

  // ================= 荒野採集 =================
  function gather(kind, pid) {
    if (S.scene !== 'wild' || S.dead) return;
    const W = D.WILDS[S.loc]; const ns = nodeState(S.loc);
    let p = pid ? W.points.find((x) => x.id === pid) : W.points.find((x) => x.kind === kind && ns.pts[x.id] > 0);
    if (!p) { log(kind === 'herb' ? '附近已無藥叢可採。' : kind === 'ore' ? '附近已無礦脈。' : '附近已無獸跡。', 'bad'); return emit(); }
    if (ns.pts[p.id] <= 0) { log(p.label + '已採盡。', 'bad'); return emit(); }
    kind = p.kind;
    if (kind === 'track') return track(p);
    const caiLv = profLv('cai');
    const hours = kind === 'herb' ? 1 : 2;
    const fat = (kind === 'herb' ? 4 : 10) * (1 - (caiLv - 1) * 0.06);
    passTime(hours, { fat });
    if (S.dead) return commit();
    ns.pts[p.id] -= 1;
    let n = kind === 'herb' ? ri(1, 2) : 1;
    if (caiLv >= 3 && rnd() < 0.4) n += 1;
    if (rnd() < affixSum('gather') / 100) n += 1;
    const lost = addItem({ k: p.item, n });
    gainProf('cai', 1); S.stats.gathers++;
    log((kind === 'herb' ? '採得' : '挖得') + D.ITEMS[p.item].name + ' ×' + n + '（採集 +1）' + (lost ? '，行囊滿，' + lost + ' 份落在地面' : ''));
    // 偶發：毒蟲遇襲／崩塌
    const A = W.ambush;
    if (A && A.on === kind && rnd() < A.p) {
      if (A.enemy) { log('驚動了' + D.ENEMIES[A.enemy].name + '！', 'bad'); startCombat([A.enemy], { type: 'wild', node: S.loc }); }
      else { const d = ri(5, 9); S.hp -= d; log('坑道落石，生命 −' + d, 'bad'); checkDeath('礦坑崩塌'); }
    }
    commit();
  }
  function track(p) {
    const ns = nodeState(S.loc);
    passTime(1, { fat: 3 });
    if (S.dead) return commit();
    ns.pts[p.id] -= 1;
    gainProf('lie', 1);
    log('循著' + p.label + '追蹤，找到了' + D.ENEMIES[p.enemy].name + '。');
    startCombat([p.enemy], { type: 'hunt', node: S.loc });
    commit();
  }
  function camp() {
    if (S.scene !== 'wild' || S.dead) return;
    if (!S.fire) {
      passTime(1, { fat: 1 });
      if (S.dead) return commit();
      S.fire = true; log('生起營火。可調和藥水、烤製乾糧，或露宿到天亮。');
      return commit();
    }
    // 露宿：睡 8 小時，夜警風險
    const night = isNight(S.t) || isNight(S.t + 8 * 60);
    const risk = (night ? 0.25 : 0.12) * (D.WILDS[S.loc].risk === '低' ? 0.6 : 1);
    const rec = 50 * (S.skills.includes('xi') ? 1.25 : 1);
    passTime(8, { food: 16, fat: -rec });
    if (S.dead) return commit();
    log('露宿 8 小時，疲累 −' + Math.round(rec) + '。');
    if (rnd() < risk) {
      log('夜警！營火外有東西逼近。', 'bad');
      startCombat([D.NODES[S.loc].name === '枯骨獸徑' ? 'boar' : 'wolf'], { type: 'wild', node: S.loc });
    }
    commit();
  }

  // ================= 地城 =================
  function dungeonDelve() {
    if (S.scene !== 'dungeon' || S.dead) return;
    const DG = D.DUNGEONS[S.loc]; const st = S.dungeon;
    if (st.clearedDay === dayOf(S.t)) { log('此窟今日已清空，明日再來。'); return emit(); }
    passTime(1, { fat: 3 });
    if (S.dead) return commit();
    const f = st.floor;
    log('深入' + D.NODES[S.loc].name + '・' + DG.floorNames[f] + '。');
    startCombat(DG.floors[f], { type: 'dungeon', node: S.loc, floor: f });
    commit();
  }

  // ================= 回合戰鬥（第一人稱、意圖預告、棄物撤退） =================
  function mkEnemy(id, idx) {
    const E = D.ENEMIES[id];
    const e = { id, idx, name: E.name, g: E.g, hp: E.hp, max: E.hp, spd: E.spd, armor: E.armor || 0, pi: ri(0, E.pat.length - 1), intent: null, guard: 0, charged: false, bleed: 0, hitOnce: false };
    return e;
  }
  function rollIntent(e) {
    const E = D.ENEMIES[e.id];
    let k;
    if (e.charged) { k = 'heavy'; e.charged = false; }
    else { k = E.pat[e.pi % E.pat.length]; e.pi++; if (k === 'heavy' && !E.heavy) k = 'atk'; }
    let range = null;
    if (k === 'atk' || k === 'bleed') range = E.dmg;
    if (k === 'heavy') range = E.heavy || [E.dmg[0] * 2, E.dmg[1] * 2];
    e.intent = { k, range };
  }
  function startCombat(ids, ctx) {
    const enemies = ids.map((id, i) => mkEnemy(id, i));
    enemies.forEach(rollIntent);
    S.combat = { enemies, round: 1, target: 0, ctx, bleed: 0, cd: 0, defend: false, retreatOpen: false, flash: null };
    S.retreatSel = [];
    S.scene = 'combat';
    S.stats.cause = '';
  }
  function playerSpeed() {
    let s = 10 * speedMult();
    if (S.combat && S.combat.ctx.type === 'hunt') s += profLv('lie') - 1;
    return Math.round(s * 10) / 10;
  }
  function combatOrder() {
    const c = S.combat; if (!c) return [];
    const list = [{ who: 'you', spd: playerSpeed() }];
    c.enemies.forEach((e, i) => { if (e.hp > 0) list.push({ who: i, spd: e.spd }); });
    list.sort((a, b) => b.spd - a.spd || (a.who === 'you' ? -1 : 1));
    return list;
  }
  function retreatChance(dropWt) {
    const after = totalWt() - (dropWt || 0);
    const band = loadBand(after);
    let p = { light: 0.6, normal: 0.4, heavy: 0.18, over: 0.05 }[band.id];
    p += (profLv('xing') - 1) * 0.03 + (profLv('lie') - 1) * 0.02;
    if (S.skills.includes('jixing')) p += 0.1;
    if (hasUnique('sure_retreat')) p += 0.25;
    if (dropWt) p += (dropWt / carryCap()) * 0.8;
    if (S.combat && S.combat.enemies.some((e) => e.hp > 0 && D.ENEMIES[e.id].boss)) p -= 0.15;
    return clamp(p, 0.02, 0.95);
  }
  function selWt() { let w = 0; S.retreatSel.forEach((i) => (w += itemWt(S.pack[i]))); return w; }
  function toggleRetreat(open) { if (!S.combat) return; S.combat.retreatOpen = open; if (!open) S.retreatSel = []; emit(); }
  function toggleDrop(i) {
    if (!S.combat || !S.pack[i]) return;
    const j = S.retreatSel.indexOf(i);
    if (j >= 0) S.retreatSel.splice(j, 1); else S.retreatSel.push(i);
    emit();
  }
  function setTarget(i) { if (S.combat && S.combat.enemies[i] && S.combat.enemies[i].hp > 0) { S.combat.target = i; emit(); } }

  function dealToEnemy(e, mult, ignoreGuard, label) {
    if (rnd() > hitChance()) { log('你的' + label + '落空了。'); return 0; }
    const [a, b] = weaponDmg();
    let d = ri(a, b) * mult;
    if (hasUnique('crit_heavy') && e.intent && e.intent.k === 'heavy' && !e.hitOnce) { d *= 1.8; log('鎮淵古刃：重擊破綻，暴擊！', 'good'); }
    e.hitOnce = true;
    d -= e.armor / 2;
    if (e.guard && !ignoreGuard) d *= 0.5;
    d = Math.max(1, Math.round(d));
    e.hp -= d;
    S.combat.flash = { i: e.idx, d };
    log('你以' + label + '擊中' + e.name + '，造成 ' + d + ' 傷害');
    if (e.hp <= 0) {
      e.hp = 0; S.stats.kills++; gainProf('zhan', 1);
      log(e.name + '倒下了。', 'good');
      bountyProgress('kill', e.id);
      if (hasUnique('kill_heal')) S.hp = Math.min(maxHp(), S.hp + 8);
    }
    return d;
  }
  function enemyAct(e) {
    const c = S.combat; const it = e.intent; e.guard = 0;
    if (!it) return;
    if (it.k === 'guard') { e.guard = 6; log(e.name + '架起防禦 +6'); return; }
    if (it.k === 'charge') { e.charged = true; log(e.name + ' 蓄力：下回合重擊', 'bad'); return; }
    if (rnd() > 0.88) { log(e.name + '撲空了。'); return; }
    let d = ri(it.range[0], it.range[1]);
    const ar = armor();
    d = d * (1 - ar / (ar + 30));
    if (c.defend) d *= 0.4;
    d = Math.max(1, Math.round(d));
    S.hp -= d;
    log(e.name + (it.k === 'heavy' ? '重擊' : it.k === 'bleed' ? '撕咬' : '攻擊') + '，你受到 ' + d + ' 傷害', it.k === 'heavy' ? 'bad' : '');
    if (it.k === 'bleed' && !c.defend) {
      const res = affixSum('bleedres');
      if (rnd() * 100 >= res) { c.bleed = 3; log('你開始流血（3 回合）', 'bad'); }
    }
    if (S.hp <= 0) { S.stats.cause = e.name + (it.k === 'heavy' ? '的重擊' : '的攻擊'); }
  }
  function combatAction(kind, arg) {
    const c = S.combat; if (!c || S.dead) return;
    const alive = c.enemies.filter((e) => e.hp > 0);
    if (!alive.length) return;
    if (!c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = alive[0].idx;
    // 先驗證行動
    if (kind === 'skill' && (!S.skills.includes('beng') || c.cd > 0)) return;
    if (kind === 'potion') { const i = S.pack.findIndex((x) => x && x.k === 'pot_hp'); if (i < 0) { log('身上沒有金創藥水。', 'bad'); return emit(); } arg = i; kind = 'item'; }
    if (kind === 'item') { const it = S.pack[arg]; if (!it || it.k === 'eq' || D.ITEMS[it.k].type !== 'use') return; }
    if (kind === 'retreat') {
      const dropWt = selWt();
      const p = retreatChance(dropWt);
      // 丟下勾選物品（落在地面）
      S.retreatSel.slice().sort((a, b) => b - a).forEach((i) => { const it = S.pack[i]; if (it) { S.pack[i] = null; dropToGround(it); } });
      const dropped = S.retreatSel.length; S.retreatSel = []; c.retreatOpen = false;
      if (rnd() < p) {
        log('棄物撤退成功' + (dropped ? '（丟下 ' + dropped + ' 格，落在地面）' : '') + '。', 'good');
        gainProf('xing', 1);
        endCombat('retreat');
        return commit();
      }
      log('撤退失敗！敵人趁隙追擊。', 'bad');
      c.defend = false;
      alive.forEach((e) => { if (!S.dead && S.hp > 0) enemyAct(e); });
      return endRound();
    }
    c.defend = kind === 'defend';
    c.flash = null;
    const order = combatOrder();
    for (const o of order) {
      if (S.hp <= 0) break;
      if (o.who === 'you') {
        const tgt = c.enemies[c.target].hp > 0 ? c.enemies[c.target] : c.enemies.find((e) => e.hp > 0);
        if (kind === 'attack') dealToEnemy(tgt, 1, false, '普攻');
        else if (kind === 'skill') { dealToEnemy(tgt, 1.7, true, '崩岩擊'); c.cd = D.SKILLS.beng.cd + 1; }
        else if (kind === 'item') useItem(arg, true);
        else if (kind === 'defend') log('你舉起兵器防禦。');
        else if (kind === 'wait') { S.fat = clamp(S.fat - 4, 0, 100); log('你調勻呼吸，疲累 −4'); }
      } else {
        const e = c.enemies[o.who];
        if (e.hp > 0) enemyAct(e);
      }
    }
    endRound();
  }
  function endRound() {
    const c = S.combat;
    if (c.bleed > 0 && S.hp > 0) { S.hp -= 2; c.bleed--; log('流血 −2'); if (S.hp <= 0) S.stats.cause = '流血不止'; }
    if (S.skills.includes('xi') && S.hp > 0) S.hp = Math.min(maxHp(), S.hp + 2);
    if (c.cd > 0) c.cd--;
    if (checkDeath()) return commit();
    if (c.enemies.every((e) => e.hp <= 0)) { victory(); return commit(); }
    c.enemies.forEach((e) => { if (e.hp > 0) rollIntent(e); });
    if (!c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = c.enemies.find((e) => e.hp > 0).idx;
    c.round++;
    commit();
  }
  function rollRarity(w) { return pickW(w); }
  function victory() {
    const c = S.combat; const ctx = c.ctx;
    const gains = []; let silver = 0;
    S.fat = clamp(S.fat + 3, 0, 100);
    c.enemies.forEach((e) => {
      const E = D.ENEMIES[e.id];
      if (E.beast) {
        let sk = ri(E.skin[0], E.skin[1]); let mt = ri(E.meat[0], E.meat[1]);
        if (sk && profLv('lie') >= 3) sk += 1;
        if (sk && rnd() < affixSum('skin') / 100) sk += 1;
        if (sk) gains.push({ k: 'hide', n: sk });
        if (mt) gains.push({ k: 'meat', n: mt });
        if (E.extra) gains.push({ k: E.extra, n: 1 });
        if (sk || mt) gainProf('lie', 2);
      }
      if (E.silver) silver += ri(E.silver[0], E.silver[1]);
    });
    if (ctx.type === 'dungeon') {
      const DG = D.DUNGEONS[ctx.node]; const last = ctx.floor === DG.floors.length - 1;
      if (last) {
        silver += ri(DG.boss.silver[0], DG.boss.silver[1]);
        const scroll = DG.boss.scroll;
        const sk = D.ITEMS[scroll].skill;
        if (!S.skills.includes(sk) && countItem(scroll) === 0) gains.push({ k: scroll, n: 1 });
        gains.push(lootEq(rollRarity(DG.boss.loot)));
        if (DG.boss.extra) gains.push({ k: DG.boss.extra[0], n: DG.boss.extra[1] });
        S.dungeon.floor = 0; S.dungeon.clearedDay = dayOf(S.t);
        bountyProgress('clear', ctx.node);
      } else {
        silver += ri(DG.silver[0], DG.silver[1]);
        if (rnd() < 0.6) gains.push(lootEq(rollRarity(DG.loot)));
        S.dungeon.floor = ctx.floor + 1;
      }
    }
    S.silver += silver; S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver);
    const names = [];
    let grounded = 0;
    gains.forEach((g) => { names.push(itemName(g) + (g.k === 'eq' ? '' : ' ×' + g.n)); const before = S.ground.items.length; addItem(g); if (S.ground.items.length > before) grounded++; });
    S.loot = { title: ctx.type === 'hunt' || c.enemies.some((e) => D.ENEMIES[e.id].beast) ? '狩獵剝皮' : '戰果', items: names, silver, grounded, ctx };
    log('戰鬥勝利' + (silver ? '，得銀 ' + silver + ' 兩' : '') + (names.length ? '；' + names.join('、') : ''), 'good');
    S.combat = null; S.retreatSel = [];
    S.scene = 'loot';
  }
  function lootEq(rarity) {
    const pool = Object.keys(D.BASES).filter((k) => D.BASES[k].slot !== 'bag' && k !== 'blade_rust' && k !== 'robe');
    let base = pick(pool);
    if (rarity === 'legend') base = pick(['blade_short', 'saber', 'leather', 'mail', 'amulet']);
    return newEq(base, rarity);
  }
  function endCombat(how) {
    const ctx = S.combat.ctx;
    S.combat = null; S.retreatSel = [];
    if (ctx.type === 'event' && ctx.then) return enterNode(ctx.then);
    enterNode(ctx.node);
  }
  function lootDone() {
    const ctx = S.loot && S.loot.ctx; S.loot = null;
    if (ctx && ctx.type === 'event' && ctx.then) enterNode(ctx.then); else enterNode(S.loc);
    commit();
  }

  // ================= 旅途事件 =================
  function startEvent(dest) {
    const ev = pick(D.EVENTS);
    S.event = { id: ev.id, dest, result: null };
    S.scene = 'event';
  }
  function eventChoose(k) {
    const ev = S.event; if (!ev || ev.result) return;
    const cai = profLv('cai');
    const res = (t, cls) => { ev.result = t; log(t, cls); };
    switch (k) {
      case 'pick':
        if (rnd() < 0.45 + cai * 0.1) { addItem({ k: 'herb_zx', n: 2 }); addItem({ k: 'leaf_qx', n: 1 }); gainProf('cai', 1); res('採得止血草 ×2、清心葉 ×1（採集 +1）', 'good'); }
        else { S.hp -= 6; res('腳下一滑，生命 −6', 'bad'); checkDeath('墜崖'); }
        break;
      case 'dig':
        if (rnd() < 0.4 + cai * 0.1) { const g = rnd() < 0.3 ? 'ore_xs' : 'ore_cu'; addItem({ k: g, n: 1 }); gainProf('cai', 1); res('搜刮到' + D.ITEMS[g].name + ' ×1', 'good'); }
        else { S.hp -= 8; res('礦口再度崩塌，生命 −8', 'bad'); checkDeath('礦坑崩塌'); }
        break;
      case 'pay':
        if (S.silver < 15) { res('銀兩不夠，劫匪拔刀了！', 'bad'); startCombat(['bandit'], { type: 'event', node: ev.dest, then: ev.dest }); S.event = null; return commit(); }
        S.silver -= 15; res('交出 15 兩，劫匪放行。');
        break;
      case 'fight': S.event = null; startCombat(['bandit'], { type: 'event', node: ev.dest, then: ev.dest }); return commit();
      case 'hunt': S.event = null; gainProf('lie', 1); startCombat([rnd() < 0.5 ? 'boar' : 'wolf'], { type: 'event', node: ev.dest, then: ev.dest }); return commit();
      case 'drop': {
        let bi = -1, bw = -1; S.pack.forEach((it, i) => { if (it && itemWt(it) > bw) { bw = itemWt(it); bi = i; } });
        if (bi >= 0) { const nm = itemName(S.pack[bi]); S.pack[bi] = null; res('丟下' + nm + '，趁亂逃脫。'); } else res('身無長物，劫匪啐了一口放你走。');
        break;
      }
      case 'detour': passTime(1); res('繞路多走了 1 小時。'); break;
      case 'study':
        passTime(1); gainProf('xing', 3);
        if (profLv('xing') >= 2 && !S.skills.includes('jixing')) { S.skills.push('jixing'); res('參悟口訣，習得「疾行」（行腳 +3）', 'good'); }
        else res('參悟口訣，行腳 +3');
        break;
      default: res('你離開了。');
    }
    commit();
  }
  function eventDone() { const d = S.event && S.event.dest; S.event = null; enterNode(d || S.loc); commit(); }

  // ================= 介面雜項 =================
  function setOverlay(o) { S.overlay = S.overlay === o ? null : o; emit(); }
  function sysCamp() {
    if (S.scene === 'wild') return camp();
    log('紮營只能在荒野採集區。', 'bad'); emit();
  }

  // ================= 更新通知 =================
  function commit() { save(); emit(); }
  function emit() { listeners.forEach((f) => f(S)); }
  function on(f) { listeners.push(f); }
  function restart(seed) { wipeSave(); newGame(seed === undefined ? (Date.now() & 0xffffffff) : seed); }
  function init(opts) {
    opts = opts || {};
    if (opts.fresh || !load()) newGame(opts.seed !== undefined ? opts.seed : (Date.now() & 0xffffffff));
    else emit();
  }

  return {
    get state() { return S; },
    init, on, restart, save, wipeSave, readRaw, SAVE_KEY,
    fmtTime, fmtClock, dayOf, isNight,
    maxHp, carryCap, totalWt, loadBand, speedMult, armor, weaponDmg, hitChance, profLv, profProgress, bagCap,
    eqBase, eqValue, itemWt, itemName, itemGlyph, countItem, affixSum,
    clickPack, unequip, useItem, pickupGround,
    selectDest, travel, travelPreview, toMap, enterHere, route,
    setTab, selectShop, setQty, buy, sell, sellPrice, townPrice, avgPrice, innRest, innSoup, claimBounty, trackedBounty,
    craft, canCraftHere, gather, camp, nodeState, dungeonDelve,
    combatAction, combatOrder, toggleRetreat, toggleDrop, retreatChance, selWt, setTarget, playerSpeed, lootDone,
    eventChoose, eventDone, setOverlay, sysCamp,
    _debug: { passTime, addItem, die, startCombat, newEq },
  };
})();
