/* 《山海錄》灰盒 v0.3 — 遊戲邏輯（狀態、存檔、時間、背包、戰鬥、事件） */
'use strict';

window.SHL = (function () {
  const D = window.SHL_DATA;
  const SAVE_KEY = 'shanhailu.save';
  const SCHEMA = 3;
  const DAY_START = 8 * 60; // 第 1 日 08:00
  const START_AGE = 20;

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
  const r2 = (x) => Math.round(x * 100) / 100; // SPEC-01 §3：浮點值存兩位小數
  // 世界擲骰（SPEC-01 §9 E4）：以 S.seed、標籤、日期、序號混合出 [0,1)，不消耗 S.rng。
  // 假設：對齊 sim/lib/world.js（numbers/num-shl-b1-sim 的 sim/lib/util.js wrnd：FNV-1a 標籤雜湊＋混合後取 mulberry32 第一個輸出；Q-0 定案照驗算程式）。
  function hashStr(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function wrnd(tag, day, i) {
    let h = (S.seed >>> 0) ^ hashStr(tag);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = (h ^ Math.imul((day | 0) + 0x632be5ab, 0x9e3779b1)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    h = (h ^ Math.imul((i | 0) + 0x1b873593, 0x27d4eb2f)) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    let t = (h + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const wri = (tag, day, i, a, b) => a + Math.floor(wrnd(tag, day, i) * (b - a + 1));

  // ================= 時間：一律 24 小時制 =================
  function fmtClock(t) {
    const m = ((t % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function fmtTime(t) { return '第 ' + (Math.floor(t / 1440) + 1) + ' 日 ' + fmtClock(t); }
  function dayOf(t) { return Math.floor(t / 1440) + 1; }
  function hourOf(t) { return Math.floor((t % 1440) / 60); }
  function isNight(t) { const h = hourOf(t); return h >= 20 || h < 5; }
  // 曆法：一季 30 天、一年 120 天；開局元年春第 1 日、20 歲
  function seasonOf(t) { return Math.floor((dayOf(t) - 1) / 30) % 4; }
  function yearOf(t) { return Math.floor((dayOf(t) - 1) / 120); }
  function ageOf(t) { return START_AGE + yearOf(t); }
  function fmtDate(t) { return (D.YEAR_NAMES[yearOf(t)] || (yearOf(t) + 1)) + '年' + D.SEASONS[seasonOf(t)]; }

  // ================= 物品工具 =================
  function newEq(baseId, rarity, unid) {
    const b = D.BASES[baseId];
    rarity = rarity || 'white';
    const eq = { uid: ++S.uid, base: baseId, rarity, name: b.name, affixes: [], unique: null, unid: !!unid && rarity !== 'white' };
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
  function eqValue(eq) { return Math.round(eqBase(eq).val * D.RARITY[eq.rarity].mult * (eq.unid ? 0.4 : 1)); }
  function itemWt(it) {
    if (!it) return 0;
    if (it.k === 'eq') return eqBase(it.eq).wt;
    return D.ITEMS[it.k].wt * it.n;
  }
  function itemName(it) { return it.k === 'eq' ? (it.eq.unid ? '未鑑定的' + eqBase(it.eq).name : it.eq.name) : D.ITEMS[it.k].name; }
  function itemIcon(it) { return it.k === 'eq' ? eqBase(it.eq).ic : (D.ITEMS[it.k].ic || it.k); }
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

  // ---------- 素質與熟練度 ----------
  function attrVal(id) { return S.attr[id] + affixSum('a_' + id); }
  function attrNeed(id) { return Math.max(20, 50 + (S.attr[id] - 10) * 12); }
  function attrProgress(id) { return clamp(S.attrXp[id] / attrNeed(id), 0, 1); }
  const PROF = {}; D.PROFS.forEach((p) => (PROF[p.id] = p));
  function profLv(id) { return S.prof[id] ? S.prof[id].lv : 0; }
  function profNeed(lv) { return 4 + lv * 0.6; }
  function profProgress(id) { const p = S.prof[id]; return p.lv >= 100 ? 1 : clamp(p.xp / profNeed(p.lv), 0, 1); }
  function perk(id, th) { return profLv(id) >= th; }
  // 行為累積：base＝這次行為的基礎經驗；dl＝難度（熟練度高出 15 以上開始遞減，高出 40 歸零）
  function gainProf(id, base, dl) {
    const P = PROF[id]; const st = S.prof[id];
    if (!P || P.locked || st.lv >= 100) return 0;
    let f = 1;
    if (dl !== undefined) { const over = st.lv - dl; f = over <= 15 ? 1 : over >= 40 ? 0 : 1 - (over - 15) / 25; }
    const mult = 1 + (attrVal(P.attr) - 10) * 0.03 + (attrVal('wu') - 10) * 0.03;
    const xp = base * f * Math.max(0.4, mult);
    if (xp <= 0) return 0;
    st.xp += xp;
    while (st.lv < 100 && st.xp >= profNeed(st.lv)) {
      st.xp -= profNeed(st.lv); st.lv++;
      const pk = P.perks[st.lv];
      if (pk) { log(P.name + ' ' + st.lv + '：領悟「' + pk + '」', 'good'); S.attr[P.attr]++; log(attrName(P.attr) + ' +1（' + S.attr[P.attr] + '）', 'good'); }
      else if (st.lv % 25 === 0) { S.attr[P.attr]++; log(P.name + ' ' + st.lv + '，' + attrName(P.attr) + ' +1（' + S.attr[P.attr] + '）', 'good'); }
      else if (st.lv % 5 === 0) log(P.name + '熟練度 ' + st.lv, 'good');
    }
    // 練熟練度順便練素質（20%）
    S.attrXp[P.attr] += xp * 0.2;
    while (S.attrXp[P.attr] >= attrNeed(P.attr)) { S.attrXp[P.attr] -= attrNeed(P.attr); S.attr[P.attr]++; log(attrName(P.attr) + '增長至 ' + S.attr[P.attr], 'good'); }
    return xp;
  }
  function attrName(id) { return D.ATTRS.find((a) => a.id === id).name; }

  function maxHp() { return Math.max(10, 50 + attrVal('ti') * 3 + affixSum('hp') - (S.corrupt || 0)); }
  // ---------- 地點、建築、世界觀文本 ----------
  function LORE() { return window.SHL_LORE || { CODEX: {}, NPC: {}, EXPLORE: {}, VISIT: {}, MISS: ['一無所獲。'] }; }
  function place() { return D.PLACES[S.loc] || null; }
  function bld() { return S.townTab ? D.BUILDINGS[S.townTab] || null : null; }
  function inBld(type) { const b = bld(); return !!(b && S.scene === 'town' && b.place === S.loc && b.type === type); }
  function priceTable() { const P = place(); return D.PRICES[P ? P.price : 'duyin']; }
  function known(id) { const N = D.NODES[id]; return !!N && (!N.hidden || !!S.known[id]); }
  function repOf(f) { return S.rep[f] || 0; }
  function repOk(f, th) { return repOf(f) >= th; }
  // 已知的勢力：沒有 reveal 的一開始就知道；有 reveal 的要讀到那條見聞
  function knownFactions() { return Object.keys(D.FACTIONS).filter((f) => !D.FACTIONS[f].reveal || S.codex.includes(D.FACTIONS[f].reveal)); }
  function addRep(f, n) {
    const before = repOf(f); S.rep[f] = Math.round((before + n) * 100) / 100;
    D.FACTIONS[f].perks.forEach(([th, txt]) => { if (before < th && S.rep[f] >= th) log(D.FACTIONS[f].name + '聲望 ' + th + '：' + txt, 'good'); });
  }
  function addCodex(id, how) {
    if (!id || S.codex.includes(id)) return false;
    S.codex.push(id);
    const L = LORE().CODEX[id];
    log('見聞錄新增「' + (L ? L.title : id) + '」' + (how ? '（' + how + '）' : ''), 'good');
    Object.keys(D.FACTIONS).forEach((f) => { if (D.FACTIONS[f].reveal === id) log('你知道了一個勢力：' + D.FACTIONS[f].name + '。', 'good'); });
    return true;
  }
  function addCorrupt(n) {
    const before = S.corrupt; S.corrupt = clamp(S.corrupt + n, 0, 30);
    if (S.corrupt > before) { log('血霧侵蝕 +' + (S.corrupt - before) + '（生命上限 −' + S.corrupt + '）', 'bad'); S.hp = Math.min(S.hp, maxHp()); }
  }
  function bagCap() { return S.equip.bag ? eqBase(S.equip.bag).bag : 0; }
  function carryCap() {
    const belt = S.equip.belt ? eqBase(S.equip.belt).cap || 0 : 0;
    return Math.round((40 + attrVal('ti') * 4) * (1 + profLv('fuz') * 0.005)) + belt + affixSum('cap');
  }
  function eqWt(eq) { const B = eqBase(eq); return B.ac === 'light' && perk('qing', 25) ? B.wt / 2 : B.wt; }
  function totalWt() {
    let w = 0;
    allEquipped().forEach((eq) => (w += eqWt(eq)));
    if (S.equip.bag) w += eqBase(S.equip.bag).wt;
    S.pack.forEach((it) => (w += itemWt(it)));
    return w;
  }
  function loadBand(w) {
    const r = (w === undefined ? totalWt() : w) / carryCap();
    if (r <= 0.4) return { id: 'light', name: '輕裝', mult: 1, fat: 1 };
    if (r <= 0.75) return { id: 'normal', name: '常態重負', mult: perk('fuz', 25) ? 0.91 : 0.82, fat: 1.2 };
    if (r <= 1) return { id: 'heavy', name: '超載', mult: perk('fuz', 50) ? 0.7 : 0.6, fat: 1.5 };
    return { id: 'over', name: '超載（過量）', mult: 0.4, fat: 2 };
  }
  function speedMult() {
    let m = loadBand().mult * (1 + affixSum('spd') / 100);
    if (S.fat >= 80) m *= 0.85;
    return m;
  }
  function armor() {
    let a = 0;
    allEquipped().forEach((eq) => {
      const B = eqBase(eq); let v = B.armor || 0;
      if (B.ac === 'light') v *= 1 + profLv('qing') / 200;
      if (B.ac === 'heavy') v *= 1 + profLv('zhong') / 200;
      a += v;
    });
    return Math.round(a + affixSum('armor'));
  }
  // 目前武器對應的熟練度：無主手＝拳腳
  function weaponType() { return S.equip.main ? eqBase(S.equip.main).wtype || 'dao' : 'quan'; }
  function weaponDmg() {
    const wt = weaponType(); const lv = profLv(wt);
    const m = S.equip.main ? eqBase(S.equip.main).dmg : [1 + Math.floor(lv / 8), 3 + Math.floor(lv / 6)];
    const o = S.equip.off && eqBase(S.equip.off).dmg ? eqBase(S.equip.off).dmg : [0, 0];
    const src = wt === 'gong' ? 'shen' : 'li';
    const flat = affixSum('dmg') + Math.floor((attrVal(src) - 10) / 2) + Math.floor(lv / 12);
    const pct = 1 + affixSum('dmgp') / 100;
    return [Math.max(1, Math.round((m[0] + o[0] + flat) * pct)), Math.max(1, Math.round((m[1] + o[1] + flat) * pct))];
  }
  function hitChance() {
    let h = 0.86 + affixSum('acc') / 100 + profLv(weaponType()) * 0.0015 + (attrVal('shen') - 10) * 0.005;
    if (S.fat >= 80) h -= 0.15;
    if (S.food < 20) h -= 0.05;
    return clamp(h, 0.3, 0.98);
  }
  function dodgeChance() { return clamp(0.1 + profLv('shan') * 0.002 + (attrVal('shen') - 10) * 0.01, 0.02, 0.45); }
  function priceBonus() { return clamp(1 + profLv('yi') * 0.0015 + (attrVal('kou') - 10) * 0.01, 0.7, 1.4); }
  function tideOn() { return !!(S.world.tide && dayOf(S.t) >= S.world.tide.start && dayOf(S.t) <= S.world.tide.end); }

  // ================= 紀錄 =================
  function log(text, cls) {
    S.log.push({ t: S.t, text, cls: cls || '' });
    if (S.log.length > 200) S.log.shift();
  }

  // ================= 新局／存檔（永久死亡＋城鎮檢查點雙模式預留） =================
  function newGame(seed, originId) {
    const attr = {}, attrXp = {}, prof = {};
    D.ATTRS.forEach((a) => { attr[a.id] = 10; attrXp[a.id] = 0; });
    D.PROFS.forEach((p) => (prof[p.id] = { lv: 0, xp: 0 }));
    S = {
      schema: SCHEMA,
      seed: seed >>> 0, rng: seed >>> 0, uid: 0,
      meta: { saveMode: 'permadeath', createdAt: Date.now() },
      name: null, origin: null, // name 由取名頁確定後寫入 { sur, given }（UI-01 §1）
      t: DAY_START, loc: 'huiyao', scene: 'origin', overlay: null,
      hp: 80, food: 80, fat: 10, silver: 60, corrupt: 0,
      attr, attrXp, prof, profTab: 'ye',
      skills: [],
      equip: { main: null, off: null, head: null, chest: null, gloves: null, boots: null, amulet: null, ring1: null, ring2: null, belt: null, bag: null, cart: null, cartLocked: true },
      pack: [], ground: { node: 'huiyao', items: [] },
      nodes: {}, fire: false,
      quests: [], rumors: [], freeRumor: {},
      world: { tide: null, next: 0, hurt: {} },
      // SPEC-01 §1／§3.3 預留欄位（只存、不做介面；內容由 SPEC-02 定）
      wanted: {}, hostility: {}, jurisdiction: null, influence: {},
      known: {}, found: {}, visited: {}, codex: [], reported: [], rep: { dawn: 0, star: 0, crow: 0 },
      talk: {}, say: null, street: null, journalTab: 'quest', mapView: 'region',
      dungeon: null, combat: null, event: null, loot: null,
      townTab: null, trade: null, dest: null, retreatSel: [],
      log: [], stats: { kills: 0, gathers: 0, crafts: 0, hours: 0, maxSilver: 60, bounties: 0, rumors: 0, finds: 0, cause: '' },
      shops: {}, dead: null,
    };
    initTownWorld(S);
    // 獸潮首次日程改用世界擲骰（SPEC-01 E4；對齊 sim/lib/world.js 的 'tide-first'）
    S.world.next = wri('tide-first', 0, 0, D.TIDE.first[0], D.TIDE.first[1]);
    S.equip.bag = newEq('bag_cloth').eq;
    padPack();
    if (originId) applyOrigin(originId, D.NAME_DEFAULT); // 開局捷徑（?origin=…）：跳過標題與取名頁，用預設名
    else emit();
  }
  // ================= 取名（DEV-01／UI-01） =================
  // 硬規則（UI-01 §4）：姓 1–2 字、名 1–2 字，合計 2–4 個中文字；只收 CJK 統一漢字；不收空白、符號、英數。
  // 不做「不得與命名 NPC 同名」檢查；禁字表這批不做（製作人 16:46 裁決第 3 項），預設「沈衡」維持合法。
  const CJK = /^[\u3400-\u4DBF\u4E00-\u9FFF\u{20000}-\u{2A6DF}\u{2A700}-\u{2EBEF}\u{30000}-\u{3134F}]$/u;
  function nameErrors(sur, given) {
    const a = Array.from(String(sur == null ? '' : sur)), b = Array.from(String(given == null ? '' : given));
    const errs = [];
    if (!a.concat(b).every((ch) => CJK.test(ch))) errs.push('chars');
    if (a.length < 1 || a.length > 2 || b.length < 1 || b.length > 2) errs.push('length');
    return errs;
  }
  // 全名：S.name = { sur, given }
  function fullName(n) { n = n === undefined ? (S && S.name) : n; return n && n.sur && n.given ? n.sur + n.given : ''; }
  // 身分：開局一律「平民」；找不到對應卡（例如舊存檔的已移除出身）時也顯示平民（假設）
  function identity() { return (D.ORIGINS.find((o) => o.id === S.origin) || D.ORIGINS[0]).name; }
  // 懸賞令只預留名字欄（UI-01 §2／§4；通緝令畫面不在本包）。告示榜、判決書、獵令之後一律從這裡讀 S.name。
  function wantedPoster(silver) { return { name: fullName(), text: '緝拿 ' + fullName() + '，賞銀 ' + silver + ' 兩，死活不論' }; }
  // 隨機鈕：整池 60 組抽一組，不依身分、性別或風格篩選。
  // 假設：UI 層的隨機不使用 S.rng（避免改動遊戲內亂數序列），用 Math.random。
  function randomName() { const p = D.NAME_POOL[Math.floor(Math.random() * D.NAME_POOL.length)]; return { sur: p[0], given: p[1] }; }
  // 舊存檔後備名：固定「沈衡」（製作人 16:46 裁決第 2 項；living-world v0.2 §6、UI-01）。名池只給新開局「隨機」鈕用。
  function fallbackName() { return { sur: D.NAME_DEFAULT.sur, given: D.NAME_DEFAULT.given }; }
  function hasNameStruct(n) { return !!(n && typeof n === 'object' && typeof n.sur === 'string' && typeof n.given === 'string' && n.sur && n.given); }
  // 標題頁點「平民」卡 → 中欄取名頁
  function chooseOrigin(id) {
    if (S.scene !== 'origin') return;
    S.origin = (D.ORIGINS.find((o) => o.id === id) || D.ORIGINS[0]).id;
    S.scene = 'naming';
    emit();
  }
  // 返回標題：不寫入名字
  function backToTitle() {
    if (S.scene !== 'naming') return;
    S.origin = null; S.scene = 'origin';
    emit();
  }
  function confirmName(sur, given) {
    if (S.scene !== 'naming' || nameErrors(sur, given).length) return false;
    applyOrigin(S.origin, { sur, given });
    return true;
  }
  function applyOrigin(id, name) {
    S.name = { sur: name.sur, given: name.given };
    const O = D.ORIGINS.find((o) => o.id === id) || D.ORIGINS[0];
    S.origin = O.id;
    Object.keys(O.attr).forEach((k) => (S.attr[k] = O.attr[k]));
    Object.keys(O.prof).forEach((k) => (S.prof[k].lv = O.prof[k]));
    O.gear.forEach((b) => { const eq = newEq(b).eq; const slot = eqBase(eq).slot; S.equip[slot] = eq; });
    S.silver = O.silver; S.stats.maxSilver = O.silver;
    S.pack = [{ k: 'pot_hp', n: 2 }, { k: 'bread', n: 2 }];
    padPack();
    (O.items || []).forEach(([k, n]) => addItem({ k, n }));
    S.hp = maxHp();
    S.scene = 'town'; S.townTab = null; S.visited.huiyao = true;
    restockShops();
    D.BOUNTIES.forEach((b) => S.quests.push({ id: b.id, town: b.town, g: b.g, ic: b.enemy || b.item || D.NODES[b.dungeon].ic, title: b.title, kind: b.kind, enemy: b.enemy, item: b.item, dungeon: b.dungeon, need: b.need, reward: b.reward, due: null, fixed: true, giver: b.giver || null, prog: 0, status: b.giver ? 'hidden' : b.start ? 'active' : 'open' }));
    genQuests();
    log(fullName() + '（' + O.name + '）在灰窯鎮醒來。鎮公所的「灰髯狼 ×3」已揭下。');
    log('點建築進去辦事，點路人交談。離鎮後每個地點都能探查。');
    save();
    emit();
  }
  // 貨架：每棟有貨的建築各自補貨；行商每天換貨；撿骨師賣未鑑定的撿來裝備
  function stockRow(row) {
    const [k, price, extra, rep] = row;
    if (D.BASES[k]) return { it: newEq(k, typeof extra === 'string' ? extra : 'white'), price, stock: 1, rep: rep || null };
    return { it: { k, n: 1 }, price, stock: extra || 5, rep: rep || null };
  }
  function restockShops() {
    Object.keys(D.BUILDINGS).forEach((bid) => {
      const B = D.BUILDINGS[bid];
      if (B.stock) {
        // 獸潮沒擊退：城鎮受創，貨架剩一半
        const hurt = townHurt(B.place);
        S.shops[bid] = B.stock.filter((row, i) => !hurt || i % 2 === 0).map(stockRow);
      } else if (B.pool) {
        const pool = B.pool.slice(); const out = []; const n = B.rotate + (repOk('star', 10) ? 2 : 0);
        while (out.length < n && pool.length) out.push(stockRow(pool.splice(Math.floor(rnd() * pool.length), 1)[0]));
        S.shops[bid] = out;
      } else if (B.gamble) {
        S.shops[bid] = [];
        for (let i = 0; i < B.gamble; i++) { const it = lootEq(pickW({ blue: 60, rare: 35, legend: 5 })); S.shops[bid].push({ it, price: Math.round(eqBase(it.eq).val * 0.9 + 12), stock: 1, rep: null }); }
      }
    });
    S.shopDay = dayOf(S.t);
  }
  function townHurt(tid) { return (S.world.hurt[tid] || 0) >= dayOf(S.t); }
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
    // SPEC-01 AC-J5／§2：讀到沒有 world.towns 的存檔，以起手值補、不回補過去（DEV-02 完成標準明文要求的唯一初始化例外，不是舊檔遷移）
    if (!S.world.towns) initTownWorld(S);
    // DEV-01 舊存檔後備名（本批唯一的舊檔例外）：沒有姓名結構時，寫入固定「沈衡」並寫回
    if (!hasNameStruct(S.name)) { S.name = fallbackName(); save(); }
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
  function pickupGround(i, toIdx) {
    ensureGround();
    const it = S.ground.items[i];
    if (!it) return;
    if (it.k === 'eq') {
      if (!canAdd(it)) { log('行囊已滿，撿不起來。', 'bad'); return emit(); }
      S.ground.items.splice(i, 1);
      if (toIdx !== undefined && S.pack[toIdx] === null) S.pack[toIdx] = it; else addItem(it);
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
    const fatMult = (opts.fatMult || 1) * (1 - affixSum('fatred') / 100) * clamp(1 - (attrVal('xin') - 10) * 0.02, 0.6, 1.3);
    const foodMult = seasonOf(S.t) === 3 ? 1.25 : 1; // 冬季飽食消耗 +25%
    S.food = clamp(S.food - (opts.food !== undefined ? opts.food : 4 * hours) * foodMult, 0, 100);
    const df = opts.fat !== undefined ? opts.fat : 2 * hours;
    S.fat = clamp(S.fat + (df > 0 ? df * fatMult : df), 0, 100);
    // 生命：飽食過低回復停滯、斷糧扣血；過度疲累扣血
    if (S.food <= 0) { S.hp -= 3 * hours; S.stats.cause = '餓死荒野'; }
    else if (S.food >= 30 && !opts.noRegen) S.hp = Math.min(maxHp(), S.hp + 1 * hours);
    if (S.fat >= 100) { S.hp -= 2 * hours; S.stats.cause = '力竭倒地'; }
    S.food = Math.round(S.food); S.fat = Math.round(S.fat); S.hp = Math.round(S.hp);
    // SPEC-01 §2：一次 passTime 跨 ≥2 個日界時逐日補算；每次日結看到的 S.t 是該日 00:00（SPEC-TIME B2）
    const endT = S.t, endDay = dayOf(endT);
    for (let d = startDay + 1; d <= endDay; d++) { S.t = (d - 1) * 1440; newDay(d); }
    S.t = endT;
    checkDeath();
  }
  function newDay(day) {
    if (day === undefined) day = dayOf(S.t);
    S.nodes = {}; // 採集點每日回復
    if (S.dungeon) S.dungeon.clearedDay = null;
    log(fmtTime(S.t) + '，新的一天：採集點與貨架已回補。');
    worldTick(day);
    townTick(day);
    regionTick(day);
    restockShops();
    questTick(day);
    rumorTick(day);
  }
  function nodeState(id) {
    if (!S.nodes[id]) {
      const W = D.WILDS[id]; const pts = {};
      const se = seasonOf(S.t); const tide = tideOn();
      if (W) W.points.concat(extraPoints(id)).forEach((p) => {
        let m = p.max;
        if (p.kind === 'herb') m += se === 0 ? 1 : se === 3 ? -1 : 0; // 春多冬少
        if (p.kind === 'track') m += (se === 2 ? 1 : 0) + (tide ? 1 : 0); // 秋與獸潮獸跡多
        pts[p.id] = Math.max(0, m);
      });
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
      name: fullName(), origin: identity(), age: ageOf(S.t), date: fmtDate(S.t),
      // SPEC-02 §12.2 墓誌銘接口：本包只寫 name（玩家自取名字）；善惡、所屬、終局等欄位屬之後的包
      epitaph: { name: fullName(), cause },
      attrs: D.ATTRS.map((a) => a.name + ' ' + S.attr[a.id]).join('・'),
      profs: D.PROFS.filter((p) => profLv(p.id) > 0).sort((a, b) => profLv(b.id) - profLv(a.id)).slice(0, 5).map((p) => p.name + ' ' + profLv(p.id)).join('・') || '一事無成',
      rumors: S.stats.rumors, finds: S.stats.finds, codex: S.codex.length,
      rep: Object.keys(D.FACTIONS).filter((f) => S.rep[f] >= 1).map((f) => D.FACTIONS[f].name + ' ' + Math.floor(S.rep[f])).join('・'),
      kills: S.stats.kills, gathers: S.stats.gathers, crafts: S.stats.crafts, maxSilver: S.stats.maxSilver,
      bounties: S.stats.bounties, skills: S.skills.map((k) => D.SKILLS[k].name),
    };
    S.combat = null; S.event = null; S.loot = null; S.overlay = null;
    S.scene = 'dead';
    log(fullName() + '死於' + N.name + '：' + cause, 'bad');
    // 純永久死亡：刪檔（檢查點模式則保留 checkpoint 快照，本版介面不開放）
    if (S.meta.saveMode === 'permadeath') wipeSave();
  }

  // ================= 物品使用／裝備 =================
  function useItem(i, inCombat) {
    const it = S.pack[i];
    if (!it) return false;
    if (it.k === 'eq') {
      if (it.eq.unid) { identify(i, false); return false; }
      if (inCombat) { log('戰鬥中不能換裝。', 'bad'); return false; }
      return equipTo(i, slotFor(it.eq));
    }
    const I = D.ITEMS[it.k];
    if (I.type === 'scroll') {
      if (S.skills.includes(I.skill)) { log('已習得「' + D.SKILLS[I.skill].name + '」。'); return false; }
      S.skills.push(I.skill); S.pack[i] = null;
      log('研讀殘卷，習得「' + D.SKILLS[I.skill].name + '」', 'good');
      return true;
    }
    if (I.type !== 'use') { log(I.name + '：' + I.desc); return false; }
    const u = I.use; const c = S.combat;
    if (u.oil) {
      if (!inCombat || !c) { log('淬毒油要在戰鬥中塗上武器。'); return false; }
      if (c.oil) { log('刀上已經有毒了。'); return false; }
      c.oil = true; log('你把毒油抹上兵刃。', 'good'); fx({ t: 'p_text', text: '淬毒' });
    }
    if (u.cure) {
      if (!c || !c.poison) { log('你沒有中毒。'); return false; }
      c.poison = 0; log('吞下解毒丸，毒解了。', 'good'); fx({ t: 'p_text', text: '解毒' });
    }
    if (u.hp) { const heal = u.hp + Math.round(profLv('yao') * 0.3); S.hp = Math.min(maxHp(), S.hp + heal); log('飲下' + I.name + '，生命 +' + heal); if (inCombat) fx({ t: 'p_heal', d: heal, php: S.hp }); }
    if (u.fat) { S.fat = clamp(S.fat + u.fat, 0, 100); log('服下' + I.name + '，疲累 ' + u.fat); if (inCombat && !u.hp) fx({ t: 'p_text', text: '疲累 ' + u.fat }); }
    if (u.food) { const f = u.food + (it.k === 'ration' ? Math.round(profLv('peng') * 0.2) : 0); S.food = clamp(S.food + f, 0, 100); log('吃下' + I.name + '，飽食 +' + f); if (inCombat && !u.fat) fx({ t: 'p_text', text: '飽食 +' + f }); }
    it.n -= 1; if (it.n <= 0) S.pack[i] = null;
    return true;
  }
  // ---------- 鑑定：鑑物夠高自己來，否則城鎮付費 ----------
  const ID_NEED = { blue: 0, rare: 25, legend: 50 };
  const ID_FEE = { blue: 4, rare: 12, legend: 30 };
  function identifyFee(eq) { return Math.ceil((ID_FEE[eq.rarity] || 0) * (repOk('star', 25) ? 0.5 : 1)); }
  function identify(i, pay) {
    const it = S.pack[i]; if (!it || it.k !== 'eq' || !it.eq.unid) return false;
    const eq = it.eq; const need = ID_NEED[eq.rarity] || 0;
    if (pay) {
      const B = bld(); if (!B || !B.identify || S.scene !== 'town') return false;
      const fee = identifyFee(eq);
      if (S.silver < fee) { log('銀兩不足，鑑定要 ' + fee + ' 兩。', 'bad'); emit(); return false; }
      S.silver -= fee; addRep('star', fee / 50);
    } else if (profLv('jian') < need) {
      log('看不出門道（需鑑物 ' + need + '）。可到天星商號付 ' + identifyFee(eq) + ' 兩鑑定。', 'bad'); emit(); return false;
    } else gainProf('jian', 8, need);
    eq.unid = false;
    log('鑑定出' + D.RARITY[eq.rarity].name + '「' + eq.name + '」' + (eq.affixes.length ? '：' + eq.affixes.map((a) => D.AFFIXES[a.id].t.replace('{v}', a.v)).join('、') : ''), 'good');
    if (S.trade && S.trade.mode === 'sell' && S.trade.slot === i) S.trade = null;
    commit(); return true;
  }
  function slotFor(eq) {
    const s = eqBase(eq).slot;
    if (s === 'ring') return !S.equip.ring1 ? 'ring1' : !S.equip.ring2 ? 'ring2' : 'ring1';
    return s;
  }
  function slotFits(eq, slot) { const s = eqBase(eq).slot; return s === 'ring' ? slot === 'ring1' || slot === 'ring2' : s === slot; }
  function reqUnmet(eq) {
    const rq = eqBase(eq).req; if (!rq) return null;
    const k = Object.keys(rq).find((a) => attrVal(a) < rq[a]);
    return k ? attrName(k) + ' ' + rq[k] : null;
  }
  function equipTo(i, slot) {
    const it = S.pack[i]; if (!it || it.k !== 'eq') return false;
    const eq = it.eq; const B = eqBase(eq);
    if (S.combat) { log('戰鬥中不能換裝。', 'bad'); emit(); return false; }
    if (eq.unid) { log('未鑑定的裝備不能穿。', 'bad'); emit(); return false; }
    if (!slotFits(eq, slot)) { log(eq.name + '不能放在' + D.SLOT_NAMES[slot] + '。', 'bad'); emit(); return false; }
    const miss = reqUnmet(eq);
    if (miss) { log('穿不上' + eq.name + '：需要' + miss + '。', 'bad'); emit(); return false; }
    S.pack[i] = null;
    const back = [];
    if (S.equip[slot]) back.push(S.equip[slot]);
    if (slot === 'main' && B.twoHanded && S.equip.off) { back.push(S.equip.off); S.equip.off = null; }
    if (slot === 'off' && S.equip.main && eqBase(S.equip.main).twoHanded) { back.push(S.equip.main); S.equip.main = null; }
    S.equip[slot] = eq;
    if (slot === 'bag') padPack();
    back.forEach((e, n) => { if (n === 0 && !S.pack[i] && i < S.pack.length) S.pack[i] = { k: 'eq', eq: e }; else addItem({ k: 'eq', eq: e }); });
    S.hp = Math.min(S.hp, maxHp());
    log('裝備' + eq.name);
    commit(); return true;
  }
  function unequip(slot, toIdx) {
    const eq = S.equip[slot];
    if (!eq || slot === 'bag' || S.combat) return false;
    if (toIdx !== undefined && S.pack[toIdx] === null) { S.equip[slot] = null; S.pack[toIdx] = { k: 'eq', eq }; }
    else {
      if (!S.pack.some((x) => !x)) { log('行囊已滿，無法卸下。', 'bad'); emit(); return false; }
      S.equip[slot] = null; addItem({ k: 'eq', eq });
    }
    S.hp = Math.min(S.hp, maxHp());
    log('卸下' + eq.name);
    commit(); return true;
  }
  // ---------- 拖拉：from／to 形如 pack:3、slot:main、ground:0、ground、shop:2、sell ----------
  function drag(from, to) {
    if (S.dead || S.scene === 'origin' || S.scene === 'naming' || from === to) return false;
    const [fz, fv] = from.split(':'); const [tz, tv] = to.split(':');
    const inShop = S.scene === 'town' && !!S.shops[S.townTab]; const inMarket = S.scene === 'town' && !!(bld() && bld().buys);
    if (fz === 'pack') {
      const i = +fv; const it = S.pack[i]; if (!it) return false;
      if (tz === 'pack') {
        const j = +tv; if (j >= S.pack.length) return false;
        const o = S.pack[j];
        if (o && o.k !== 'eq' && o.k === it.k && o.n < D.ITEMS[o.k].stack) {
          const m = Math.min(D.ITEMS[o.k].stack - o.n, it.n); o.n += m; it.n -= m; if (it.n <= 0) S.pack[i] = null;
        } else { S.pack[i] = o; S.pack[j] = it; }
        S.trade = null; S.retreatSel = [];
        commit(); return true;
      }
      if (S.combat) { log('戰鬥中只能整理行囊。', 'bad'); emit(); return false; }
      if (tz === 'slot') return it.k === 'eq' ? equipTo(i, slotFits(it.eq, tv) ? tv : slotFor(it.eq)) : false;
      if (tz === 'ground') { S.pack[i] = null; S.trade = null; dropToGround(it); log('放下' + itemName(it) + '。'); commit(); return true; }
      if (tz === 'sell' && inMarket) { sell(i, it.k === 'eq' ? 1 : it.n); return true; }
      return false;
    }
    if (S.combat) return false;
    if (fz === 'slot') {
      if (tz === 'pack') {
        const j = +tv; const o = S.pack[j]; const eq = S.equip[fv];
        if (o && o.k === 'eq' && eq && slotFits(o.eq, fv)) return equipTo(j, fv);
        return unequip(fv, o === null ? j : undefined);
      }
      if (tz === 'ground') {
        const eq = S.equip[fv]; if (!eq || fv === 'bag') return false;
        S.equip[fv] = null; dropToGround({ k: 'eq', eq }); S.hp = Math.min(S.hp, maxHp());
        log('放下' + eq.name + '。'); commit(); return true;
      }
      return false;
    }
    if (fz === 'ground') { if (tz === 'pack' || tz === 'slot') { pickupGround(+fv, tz === 'pack' ? +tv : undefined); return true; } return false; }
    if (fz === 'shop' && inShop && (tz === 'pack' || tz === 'slot')) { S.trade = { mode: 'buy', idx: +fv, qty: 1 }; buy(); return true; }
    return false;
  }
  function clickPack(i) {
    if (S.dead) return;
    const it = S.pack[i]; if (!it) return;
    if (S.scene === 'town' && bld() && bld().buys) { S.trade = { mode: 'sell', slot: i, qty: it.k === 'eq' ? 1 : it.n }; return emit(); }
    if (S.combat) return combatAction('item', i);
    useItem(i, false); commit();
  }

  // ================= 地圖與移動：每個地點都能走、都能探查 =================
  function neighbors(id) {
    const out = [];
    D.EDGES.forEach((e) => { if (!known(e.a) || !known(e.b)) return; if (e.a === id) out.push([e.b, e]); else if (e.b === id) out.push([e.a, e]); });
    return out;
  }
  function route(from, to) {
    // Dijkstra：以基礎時數為權重，只走已知的地點
    const dist = {}, prev = {}, Q = Object.keys(D.NODES).filter(known);
    Q.forEach((k) => (dist[k] = Infinity)); dist[from] = 0;
    const left = new Set(Q);
    while (left.size) {
      let u = null; left.forEach((k) => { if (u === null || dist[k] < dist[u]) u = k; });
      left.delete(u);
      neighbors(u).forEach(([v, e]) => { if (dist[u] + e.h < dist[v]) { dist[v] = dist[u] + e.h; prev[v] = [u, e]; } });
    }
    const edges = []; const stops = []; let c = to;
    while (c !== from && prev[c]) { edges.unshift(prev[c][1]); stops.unshift(c); c = prev[c][0]; }
    edges.stops = stops;
    return edges;
  }
  function travelPreview(to) {
    const edges = route(S.loc, to);
    const base = edges.reduce((a, e) => a + e.h, 0);
    const sm = speedMult();
    const hours = Math.max(1, Math.ceil(base / sm));
    const band = loadBand();
    const xingRed = clamp(1 - profLv('jiao') * 0.003 - (S.skills.includes('jixing') ? 0.1 : 0), 0.4, 1);
    const fat = Math.round(3 * hours * band.fat * xingRed * (1 - affixSum('fatred') / 100));
    const food = 4 * hours;
    const wild = edges.some((e) => !e.road);
    let risk = wild ? (edges.length > 1 ? 0.3 : 0.22) : 0.04;
    if (isNight(S.t)) risk *= 2;
    if (band.id === 'heavy' || band.id === 'over') risk *= 1.4;
    if (wild && perk('jiao', 25)) risk *= 0.8;
    if (wild && tideOn()) risk *= 1.5;
    // SPEC-01 §4.8「套用」：多乘治安／匪勢修正 R，封頂 0.85 在所有乘項之後做一次（夜間仍用現況 isNight；SPEC-TIME 7.1 屬 DEV-TIME）
    const R = riskR(wild);
    risk = Math.min(D.WORLD.RISK_CAP, risk * R);
    const riskName = risk < 0.15 ? '低' : risk < 0.35 ? '中' : '高';
    const via = edges.length > 1 ? D.NODES[edges.stops[0]].name : (edges[0] && edges[0].road ? '官道' : '野徑');
    return { edges, hours, fat, food, risk, riskName, mult: sm, via, wild, R };
  }
  function selectDest(id) {
    if (S.dead || !known(id)) return;
    S.dest = id === S.loc ? null : id;
    emit();
  }
  function travel() {
    const to = S.dest;
    if (!to || S.combat || S.dead || !known(to)) return;
    if (totalWt() > carryCap() * 1.25) { log('背得太重寸步難行，先丟掉些東西。', 'bad'); return emit(); }
    const p = travelPreview(to);
    if (!p.edges.length) return;
    const fromName = D.NODES[S.loc].name;
    if (S.ground.items.length && S.ground.node === S.loc) log('留在' + fromName + '地面的東西沒帶走。');
    S.fire = false;
    S.dest = null;
    S.loc = to; S.ground = { node: to, items: [] };
    const bandId = loadBand().id;
    passTime(p.hours, { fat: p.fat / ((1 - affixSum('fatred') / 100) || 1), food: p.food });
    gainProf('jiao', 3 * p.hours);
    // 負重訓練：常態重負以上趕路才會漲
    if (bandId !== 'light') gainProf('fuz', (bandId === 'normal' ? 4 : 6) * p.hours);
    log('自' + fromName + '出發，經' + p.via + '，' + p.hours + ' 小時後抵達' + D.NODES[to].name + '。');
    if (S.dead) return commit();
    if (rnd() < p.risk) { startEvent(to); return commit(); }
    enterNode(to);
    commit();
  }
  function enterNode(id) {
    S.loc = id;
    const N = D.NODES[id];
    S.event = null; S.loot = null; S.combat = null; S.say = null; S.street = null;
    if (!S.visited[id]) { S.visited[id] = true; const v = LORE().VISIT[id]; if (v) log(v); }
    if (N.kind === 'town') { S.scene = 'town'; S.townTab = null; S.trade = null; checkpointSnapshot(); }
    else if (N.kind === 'wild') { S.scene = 'wild'; nodeState(id); }
    else if (N.kind === 'dungeon') {
      S.scene = 'dungeon';
      if (!S.dungeon || S.dungeon.id !== id) S.dungeon = { id, floor: 0, clearedDay: null };
    }
  }
  function toMap() { if (S.combat || S.dead) return; S.scene = 'map'; S.mapView = 'region'; S.event = null; S.loot = null; S.townTab = null; S.say = null; S.street = null; emit(); }
  function enterHere() { if (S.combat || S.dead) return; enterNode(S.loc); commit(); }
  function setMapView(v) { S.mapView = v; emit(); }

  // ================= 城鎮：點建築進去，每棟各有老闆與服務 =================
  function townPrice(k) { return priceTable()[k]; }
  function avgPrice(k) { return (D.PRICES.huiyao[k] + D.PRICES.duyin[k]) / 2; }
  function isPotion(k) { return k === 'pot_hp' || k === 'pot_ft'; }
  // 這棟建築收不收這樣東西：回傳價格倍率，0＝不收
  function buysHere(it) {
    const B = bld(); if (!B || !B.buys || S.scene !== 'town') return 0;
    if (it.k !== 'eq' && D.ITEMS[it.k].type === 'quest') return 0;
    if (B.buys === 'all') return B.buyMult || 1;
    if (it.k === 'eq') return B.buys.includes('eq') ? 1 : 0;
    return B.buys.includes(D.ITEM_CLASS[it.k]) ? 1.15 : 0;
  }
  // 在店裡＝這家店的收購價（不收則 0）；不在店裡＝照本地行情的估價
  function sellPrice(it) {
    const B = bld(); const inShop = S.scene === 'town' && B && B.buys;
    const m = inShop ? buysHere(it) : 1; if (!m) return 0;
    const bonus = priceBonus();
    if (it.k === 'eq') return Math.max(1, Math.floor(eqValue(it.eq) * 0.6 * bonus * m));
    const p = priceTable()[it.k];
    return p ? Math.max(1, Math.floor(p * bonus * m * (isPotion(it.k) && tideOn() ? D.TIDE.potMult : 1))) : 0;
  }
  // 買價：議價與口才打折；天星聲望 10 再九五折；獸潮期間藥水漲價
  function buyPrice(row) {
    const B = bld();
    let p = row.price / priceBonus();
    if (B && B.faction === 'star' && repOk('star', 10)) p *= 0.95;
    if (row.it.k !== 'eq' && isPotion(row.it.k) && tideOn()) p *= D.TIDE.potMult;
    return Math.max(1, Math.round(p));
  }
  function rowLocked(row) { return !!row.rep && Object.keys(row.rep).some((f) => !repOk(f, row.rep[f])); }
  // 台詞模板：{sur}＝玩家姓（S.name.sur；MVP 稱呼「{姓}客官」，製作人 17:04 (6)）
  function fillLine(t) { return t ? String(t).replace(/\{sur\}/g, (S && S.name && S.name.sur) || '') : t; }
  function npcLine(npc, kind) { const L = LORE().NPC[npc]; if (!L) return ''; const a = L[kind]; return fillLine(Array.isArray(a) ? (a.length ? pick(a) : '') : a || ''); }
  // 進建築（null＝回到街上）
  function setTab(t) {
    if (S.scene !== 'town' || S.combat) return;
    if (t && (!D.BUILDINGS[t] || D.BUILDINGS[t].place !== S.loc)) return;
    S.townTab = t || null; S.trade = null; S.street = null;
    S.say = t ? { npc: D.BUILDINGS[t].npc, text: npcLine(D.BUILDINGS[t].npc, 'greet') } : null;
    emit();
  }
  function shopRows() { return S.shops[S.townTab] || []; }
  function selectShop(i) { const row = shopRows()[i]; if (!row) return; S.trade = { mode: 'buy', idx: i, qty: 1 }; emit(); }
  function setQty(d) {
    if (!S.trade) return;
    let max = 1;
    if (S.trade.mode === 'buy') { const row = shopRows()[S.trade.idx]; max = row ? row.stock : 1; }
    else { const it = S.pack[S.trade.slot]; max = it ? (it.k === 'eq' ? 1 : it.n) : 1; }
    S.trade.qty = clamp(S.trade.qty + d, 1, Math.max(1, max));
    emit();
  }
  function tradeRep(v) { const B = bld(); if (B && B.faction === 'star') addRep('star', v / 50); }
  function buy() {
    const tr = S.trade; if (!tr || tr.mode !== 'buy') return;
    const rows = shopRows(); const row = rows[tr.idx]; if (!row || row.stock <= 0) return;
    if (rowLocked(row)) { log('這件貨不賣生客：' + Object.keys(row.rep).map((f) => D.FACTIONS[f].name + '聲望 ' + row.rep[f]).join('、') + '。', 'bad'); return emit(); }
    const qty = row.it.k === 'eq' ? 1 : Math.min(tr.qty, row.stock);
    const cost = buyPrice(row) * qty;
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
        addItem(row.it); log('買下' + itemName(row.it));
      }
      S.silver -= cost; row.stock = 0;
      rows.splice(tr.idx, 1); S.trade = null;
    } else {
      const it = { k: row.it.k, n: qty };
      if (!canAdd(it)) { log('行囊放不下。', 'bad'); return emit(); }
      addItem(it); S.silver -= cost; row.stock -= qty;
      log('買下' + D.ITEMS[it.k].name + ' ×' + qty + '，' + cost + ' 兩');
      if (row.stock <= 0) { rows.splice(tr.idx, 1); S.trade = null; } else tr.qty = 1;
    }
    gainProf('yi', clamp(1 + cost / 12, 1, 6)); tradeRep(cost);
    commit();
  }
  function sell(slot, qty) {
    if (slot === undefined && S.trade && S.trade.mode === 'sell') { slot = S.trade.slot; qty = S.trade.qty; }
    const it = S.pack[slot]; if (!it) return;
    const B = bld();
    if (!B || !B.buys || S.scene !== 'town') { log('要進店裡才能賣。', 'bad'); return emit(); }
    const p = sellPrice(it); let got = p;
    if (!p) { log(B.name + '不收' + itemName(it) + '。', 'bad'); return emit(); }
    // 交易稅 5%（SPEC-01 §5.7）：在 sell() 內扣，日誌附「（交易稅 X 兩）」；熟練與聲望仍以行情所得計（沿用現況）
    const taxNote = (x) => (x > 0 ? '（交易稅 ' + x + ' 兩）' : '');
    if (it.k === 'eq') { S.pack[slot] = null; const x = tradeTax(p); S.silver += p - x; log('賣出' + itemName(it) + '，得銀 ' + (p - x) + ' 兩' + taxNote(x)); }
    else {
      const n = Math.min(qty || it.n, it.n);
      it.n -= n; if (it.n <= 0) S.pack[slot] = null;
      got = p * n;
      const x = tradeTax(got);
      S.silver += got - x; log('賣出' + D.ITEMS[it.k].name + ' ×' + n + '，得銀 ' + (got - x) + ' 兩' + taxNote(x));
      if (it.k === 'dogtag' && B.faction === 'dawn') addRep('dawn', n);
    }
    gainProf('yi', clamp(1 + got / 12, 1, 6)); tradeRep(got);
    S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver);
    S.trade = null;
    commit();
  }
  function pay(n) { if (S.silver < n) { log('銀兩不足。', 'bad'); emit(); return false; } S.silver -= n; return true; }
  // 歇息起床時刻（SPEC-TIME v0.4 §11 B1、§12 E11；Q-T7 乙）：wake = min(max(now+6h, 下一個 08:00), now+13h)
  // 舊式 dayOf(now)*1440+480 的 dayOf 從 1 起算，永遠是「次日」08:00（00:00 就寢睡 32 小時）。
  // 假設：「下一個 08:00」含當下（恰 08:00 就寢＝08:00 本身），對齊 sim/lib/time.js 的 wakeNew（n8 < now 才加一天）。
  // 13 小時上限為建議值、未經模擬（SPEC-TIME §17 T7 待重驗）。純函式，不改 S。
  function wakeTime(now) {
    let n8 = Math.floor(now / 1440) * 1440 + D.SLEEP.wakeMin;
    if (n8 < now) n8 += 1440;
    return Math.min(Math.max(now + D.SLEEP.minH * 60, n8), now + D.SLEEP.maxH * 60);
  }
  function sleepToMorning() {
    const now = S.t;
    passTime((wakeTime(now) - now) / 60, { food: 10, fat: 0, noRegen: true });
  }
  function innCost() {
    const m = townHurt(S.loc) ? 2 : 1;
    return { rest: 8 * m, soup: 3 * m, rumor: perk('tan', 50) ? Math.ceil(D.RUMOR.cost / 2) : D.RUMOR.cost, tea: 2, nap: 2, heal: 6, cleanse: 15, bunk: repOk('dawn', 5) ? 0 : 4, drill: 15, pozhen: 30, judge: 8, yaying: 40, report: 8 };
  }
  // 建築服務：一律先檢查人在不在那種建築裡
  function service(k, arg) {
    if (S.scene !== 'town' || S.dead) return;
    const c = innCost();
    switch (k) {
      case 'rest': if (!inBld('inn') || !pay(c.rest)) return;
        sleepToMorning(); S.hp = maxHp(); S.fat = 0; if (S.corrupt) { S.corrupt = Math.max(0, S.corrupt - 10); S.hp = maxHp(); }
        log('歇了一夜，疲累清零、生命回滿。', 'good'); break;
      case 'soup': if (!inBld('inn') || !pay(c.soup)) return;
        S.food = clamp(S.food + 30, 0, 100); passTime(0.5, { food: 0, fat: 0 }); log('喝了碗熱湯，飽食 +30'); break;
      case 'tea': if (!inBld('tea') || !pay(c.tea)) return;
        S.fat = clamp(S.fat - 10, 0, 100); S.food = clamp(S.food + 10, 0, 100); passTime(0.5, { food: 0, fat: 0 }); log('喝了碗粗茶，疲累 −10、飽食 +10'); break;
      case 'nap': if (!inBld('tea') || !pay(c.nap)) return;
        passTime(2, { fat: -20 }); log('在茶攤的長凳上歇了兩個小時，疲累 −20'); break;
      case 'heal': if (!inBld('medic')) return; if (S.hp >= maxHp()) { log('溫姑看了你一眼：「沒傷。」'); return emit(); } if (!pay(c.heal)) return;
        passTime(1, { fat: 0 }); S.hp = maxHp(); log('傷口重新包過，生命回滿。', 'good'); break;
      case 'cleanse': if (!inBld('medic')) return; if (!S.corrupt) { log('你身上沒有侵蝕。'); return emit(); } if (!pay(c.cleanse)) return;
        passTime(2, { fat: 5 }); S.corrupt = 0; log('放血、敷藥、灌湯。侵蝕退了。', 'good'); break;
      case 'bunk': if (!inBld('medic') || !pay(c.bunk)) return;
        sleepToMorning(); S.fat = 0; S.hp = Math.min(maxHp(), S.hp + 30); log('在營帳的通鋪睡了一夜，疲累清零、生命 +30。', 'good'); break;
      case 'drill': {
        const P = PROF[arg]; if (!inBld('drill') || !P || P.grp !== 'wu') return; if (!pay(c.drill)) return;
        passTime(4, { fat: 20 }); if (S.dead) return commit();
        gainProf(arg, 30); addRep('dawn', 0.5); log('在校場操練' + P.name + ' 4 小時。', 'good'); break;
      }
      case 'pozhen': if (!inBld('drill') || S.skills.includes('pozhen')) return;
        if (!repOk('dawn', 10)) { log('霍青：「先替軍團辦幾件事再說。」（破曉軍團聲望 10）', 'bad'); return emit(); } if (!pay(c.pozhen)) return;
        passTime(4, { fat: 15 }); S.skills.push('pozhen'); log('霍青傳你〈破陣〉。', 'good'); break;
      case 'offer': if (!inBld('shrine')) return;
        if (countItem('incense') < 1) { log('身上沒有線香。天星分號有賣。', 'bad'); return emit(); }
        removeItem('incense', 1); passTime(0.5, { fat: 0 });
        log('你把線香插進冷灰裡，點了三次。香點不著。'); addCodex('c_question', '上香'); break;
      case 'look': {
        if (!inBld('tower')) return; passTime(0.5, { fat: 1 });
        const d = S.world.next - dayOf(S.t);
        log(tideOn() ? '登樓遠望：獸群就在山腳下，黑壓壓一片。' : d <= 1 ? '登樓遠望：山裡的鳥全飛起來了。獸潮就在這一兩天。' : '登樓遠望：山裡還算安靜，看樣子獸潮還有 ' + d + ' 天。', tideOn() || d <= 1 ? 'bad' : '');
        break;
      }
      case 'report': {
        if (!inBld('crow')) return;
        const fresh = S.codex.filter((x) => !S.reported.includes(x));
        if (!fresh.length) { log('赤鴉：「沒有新的，就別佔我的火。」'); return emit(); }
        fresh.forEach((x) => S.reported.push(x));
        const got = fresh.length * c.report; S.silver += got; S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver);
        addRep('crow', fresh.length * 2); log('向赤鴉回報 ' + fresh.length + ' 條見聞，得銀 ' + got + ' 兩。', 'good'); break;
      }
      case 'judge': {
        const r = S.rumors.find((x) => x.id === arg); if (!inBld('crow') || !r) return;
        if (!repOk('crow', 6)) { log('赤鴉：「我不替生人看路。」（鴉衛聲望 6）', 'bad'); return emit(); } if (!pay(c.judge)) return;
        r.hint = D.RUMOR.hint[r.truth]; r.traced = true; r.judged = true;
        log('赤鴉看了一眼：「' + D.RUMOR.trace[r.truth] + '」', 'good'); break;
      }
      case 'yaying': if (!inBld('crow') || S.skills.includes('yaying')) return;
        if (!repOk('crow', 14)) { log('赤鴉沒有回答。（鴉衛聲望 14）', 'bad'); return emit(); } if (!pay(c.yaying)) return;
        passTime(3, { fat: 10 }); S.skills.push('yaying'); log('赤鴉教了你怎麼把自己藏進影子裡。習得〈鴉影〉。', 'good'); break;
      default: return;
    }
    commit();
  }
  function innRest() { service('rest'); }
  function innSoup() { service('soup'); }
  // 交談：閒談依序講，講到有見聞的那句就記進見聞錄
  function talk(npc) {
    const N = D.NPCS[npc]; const L = LORE().NPC[npc]; if (!N || S.scene !== 'town') return;
    const chat = (L && L.chat) || []; const i = S.talk[npc] || 0;
    S.say = { npc, text: chat.length ? chat[i % chat.length] : '……' };
    S.talk[npc] = i + 1;
    if (i < chat.length) gainProf('tan', 2);
    if (N.codex && i < N.codex.length) addCodex(N.codex[i], N.name);
    commit();
  }
  function streetTalk(npc) {
    const N = D.NPCS[npc]; const P = place(); if (!N || !P || !P.street.includes(npc) || S.townTab) return;
    S.street = npc; S.say = { npc, text: npcLine(npc, 'greet') };
    emit();
  }
  function streetClose() { S.street = null; S.say = null; emit(); }

  // ================= 委託（任務板） =================
  function questReward(q) { return Math.round(q.reward * (perk('yi', 25) ? 1.1 : 1) * (repOk('dawn', 20) ? 1.15 : 1)); }
  function boardTowns() { return Object.keys(D.PLACES).filter((p) => D.PLACES[p].board); }
  function genQuests() {
    const day = dayOf(S.t); const G = D.QUEST_GEN;
    boardTowns().forEach((town) => {
      let n = S.quests.filter((q) => q.town === town && !q.fixed && q.status === 'open').length;
      let guard = 0;
      while (n < G.perTown && guard++ < 16) {
        const kind = pickW(G.kinds[town] || { kill: 100 });
        const q = { id: 'q' + (++S.uid), town, kind, fixed: false, prog: 0, status: 'open' };
        if (kind === 'collect') {
          const [item, cnt] = pick(G.collect.pool);
          if (S.quests.some((x) => x.town === town && x.kind === 'collect' && x.item === item && x.status !== 'claimed')) continue;
          Object.assign(q, { item, need: cnt, g: D.ITEMS[item].g, ic: item, title: '收購' + D.ITEMS[item].name + ' ×' + cnt, reward: Math.round(D.PRICES[D.PLACES[town].price][item] * cnt * 1.8) + 6, due: day + G.collect.days });
        } else if (kind === 'kill') {
          const [enemy, cnt, reward] = pick(G.kill.pool);
          if (S.quests.some((x) => x.kind === 'kill' && x.enemy === enemy && (x.status === 'open' || x.status === 'active'))) continue;
          Object.assign(q, { enemy, need: cnt, g: D.ENEMIES[enemy].g, ic: D.ENEMIES[enemy].ic || enemy, title: '獵殺' + D.ENEMIES[enemy].name + ' ×' + cnt, reward, due: day + G.kill.days });
        } else {
          if (S.quests.some((x) => x.town === town && x.kind === 'deliver' && x.status !== 'claimed')) continue;
          const to = pick(boardTowns().filter((t) => t !== town));
          Object.assign(q, { to, need: 1, g: '包', ic: 'parcel', title: '送貨至' + D.NODES[to].name, reward: G.deliver.reward, deposit: G.deliver.deposit, due: day + G.deliver.days });
        }
        S.quests.push(q); n++;
      }
    });
  }
  function questTick(day) {
    S.quests = S.quests.filter((q) => {
      if (q.status === 'claimed' && !q.fixed) return false;
      if (q.due && day > q.due && (q.status === 'open' || q.status === 'active')) {
        if (q.status === 'active') {
          log('委託「' + q.title + '」逾期' + (q.kind === 'deliver' ? '，押金沒收。' : '，已被撕榜。'), 'bad');
          if (q.kind === 'deliver') removeItem('parcel', 1);
        }
        return false;
      }
      return true;
    });
    genQuests();
  }
  // 委託板在此地列出的委託：本地發的＋要送到這裡的（路人給的私人委託不上板）
  function questsHere() { return S.quests.filter((q) => !q.giver && (q.town === S.loc || (q.kind === 'deliver' && q.to === S.loc && q.status === 'active'))); }
  function questReady(q) {
    if (q.status === 'done') return q.town === S.loc;
    if (q.status !== 'active') return false;
    if (q.kind === 'collect') return q.town === S.loc && countItem(q.item) >= q.need;
    if (q.kind === 'deliver') return q.to === S.loc && countItem('parcel') > 0;
    return false;
  }
  function questAct(id) {
    const q = S.quests.find((x) => x.id === id); if (!q || S.scene !== 'town') return;
    if (q.giver ? S.street !== q.giver : !inBld('board')) return;
    if (q.status === 'open' || q.status === 'hidden') {
      if (q.kind === 'deliver') {
        if (S.silver < q.deposit) { log('押金不足（' + q.deposit + ' 兩）。', 'bad'); return emit(); }
        if (!canAdd({ k: 'parcel', n: 1 })) { log('行囊沒有空格放包裹。', 'bad'); return emit(); }
        S.silver -= q.deposit; addItem({ k: 'parcel', n: 1 });
      }
      q.status = 'active';
      log('接下委託：' + q.title + (q.due ? '（第 ' + q.due + ' 日前）' : '') + (q.kind === 'deliver' ? '，押金 ' + q.deposit + ' 兩' : ''));
      return commit();
    }
    if (!questReady(q)) return;
    if (q.kind === 'collect') removeItem(q.item, q.need);
    if (q.kind === 'deliver') removeItem('parcel', 1);
    const r = questReward(q) + (q.deposit || 0);
    q.status = 'claimed'; S.silver += r; S.stats.bounties++;
    S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver);
    gainProf('yi', 4);
    if (!q.giver) addRep('dawn', q.kind === 'clear' ? 4 : q.kind === 'tide' ? 5 : 2);
    if (q.kind === 'deliver') addRep('star', 2);
    log('交付委託「' + q.title + '」，得銀 ' + r + ' 兩' + (q.deposit ? '（含退還押金）' : ''), 'good');
    commit();
  }
  function questProgress(kind, key) {
    S.quests.forEach((q) => {
      if (q.status !== 'active') return;
      const hit = (kind === 'kill' && q.kind === 'kill' && q.enemy === key) || (kind === 'clear' && q.kind === 'clear' && q.dungeon === key) || (kind === 'beast' && q.kind === 'tide');
      if (!hit) return;
      q.prog = Math.min(q.need, q.prog + 1);
      if (q.prog >= q.need && q.kind !== 'tide') { q.status = 'done'; q.due = null; log('委託「' + q.title + '」已達成，回' + D.NODES[q.town].name + '交付。', 'good'); }
    });
  }
  function trackedQuest() { return S.quests.find((x) => x.status === 'done') || S.quests.find((x) => x.status === 'active') || null; }
  function activeQuests() { return S.quests.filter((x) => x.status === 'active' || x.status === 'done'); }
  function questWhere(q) {
    if (q.kind === 'kill') return D.QUEST_GEN.where[q.enemy] || '荒野';
    if (q.kind === 'clear') return D.NODES[q.dungeon].name;
    if (q.kind === 'deliver') return '送到' + D.NODES[q.to].name;
    if (q.kind === 'tide') return '期間獵殺任何野獸';
    return '帶回' + D.NODES[q.town].name;
  }

  // ================= 傳聞 =================
  function addRumor(kind, node, truth, free) {
    const K = D.RUMOR.kinds[kind];
    const r = { id: 'r' + (++S.uid), kind, node, truth, day: dayOf(S.t), text: pick(K.text).replace('{n}', D.NODES[node].name), hint: null, traced: false };
    if (perk('tan', 25)) r.hint = D.RUMOR.hint[truth];
    S.rumors.push(r);
    return r;
  }
  function newRumor(weights) {
    const kind = pickW({ cache: 40, vein: 30, beast: 30 });
    const K = D.RUMOR.kinds[kind];
    const free2 = K.nodes.filter((n) => !S.rumors.some((r) => r.node === n && r.kind === kind));
    const node = pick(free2.length ? free2 : K.nodes);
    return addRumor(kind, node, pickW(weights));
  }
  function hearRumor() {
    if (!inBld('inn') && !inBld('tea')) return;
    const day = dayOf(S.t); const free = S.freeRumor[S.loc] !== day; const cost = free ? 0 : innCost().rumor;
    if (S.rumors.length >= D.RUMOR.max) { log('傳聞記得太多了，先去查證幾則再說。', 'bad'); return emit(); }
    if (S.silver < cost) { log('銀兩不足，請不起酒。', 'bad'); return emit(); }
    S.silver -= cost; S.freeRumor[S.loc] = day;
    const r = newRumor(D.RUMOR.truth);
    passTime(0.5, { food: 0, fat: 0 });
    gainProf('tan', 6);
    log((cost ? '請了一輪酒（' + cost + ' 兩）。' : '') + '聽來一則' + D.RUMOR.kinds[r.kind].name + '傳聞：' + r.text);
    if (r.hint) log('（探聞）' + r.hint, 'good');
    S.say = { npc: bld().npc, text: r.text };
    commit();
  }
  // 街上的乞兒：一文錢一則，但多半是別人講剩的
  function cheapRumor() {
    if (S.scene !== 'town' || !S.street || D.NPCS[S.street].act !== 'rumor') return;
    if (S.rumors.length >= D.RUMOR.max) { log('傳聞記得太多了，先去查證幾則再說。', 'bad'); return emit(); }
    if (!pay(1)) return;
    const r = newRumor({ true: 20, guard: 20, strong: 10, gone: 35, bait: 15 });
    gainProf('tan', 3);
    log('給了一文錢。' + D.NPCS[S.street].name + '說：' + r.text);
    if (r.hint) log('（探聞）' + r.hint, 'good');
    S.say = { npc: S.street, text: r.text };
    commit();
  }
  function rumorTick(day) {
    S.rumors = S.rumors.filter((r) => {
      if (day - r.day >= D.RUMOR.days) { log('「' + D.NODES[r.node].name + '的' + D.RUMOR.kinds[r.kind].name + '」已無人再提。'); return false; }
      // 時間會改變真相：屬實與有人盤踞的，每天 20% 被人取走
      if ((r.truth === 'true' || r.truth === 'guard') && rnd() < D.RUMOR.decay) r.truth = 'gone';
      return true;
    });
  }
  function rumorsHere() { return S.rumors.filter((r) => r.node === S.loc); }
  function traceRumor(id) {
    const r = S.rumors.find((x) => x.id === id); if (!r || r.node !== S.loc || r.traced || !perk('zong', 25)) return;
    passTime(0.5, { fat: 1 }); if (S.dead) return commit();
    r.traced = true; gainProf('zong', 5, 30);
    log('（辨痕）' + D.RUMOR.trace[r.truth], 'good');
    commit();
  }
  function rumorReward(r, tier) {
    const gains = []; let silver = 0;
    if (r.kind === 'cache') {
      silver = ri(20, 40) * tier;
      gains.push(lootEq(tier > 1 ? pickW({ rare: 60, legend: 40 }) : pickW({ blue: 30, rare: 70 })));
    } else if (r.kind === 'vein') {
      if (r.node === 'chishi') { gains.push({ k: 'ore_xs', n: 2 * tier }, { k: 'ore_cu', n: 2 }); }
      else { gains.push({ k: 'vine_du', n: 3 * tier }, { k: 'leaf_qx', n: 3 }, { k: 'herb_zx', n: 3 }); }
    } else { gains.push({ k: 'beast_core', n: tier }, { k: 'hide_fine', n: 2 }); }
    return { gains, silver };
  }
  function grantRumor(r, tier) {
    const rw = rumorReward(r, tier); const names = [];
    rw.gains.forEach((g) => { names.push(itemName(g) + (g.k === 'eq' ? '' : ' ×' + g.n)); addItem(g); });
    S.silver += rw.silver; S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver); S.stats.rumors++;
    S.rumors = S.rumors.filter((x) => x.id !== r.id);
    addRep('crow', 1);
    return (rw.silver ? '銀兩 +' + rw.silver + '；' : '') + names.join('、');
  }
  function investigate(id) {
    const r = S.rumors.find((x) => x.id === id); if (!r || r.node !== S.loc || S.combat || S.dead) return;
    passTime(1, { fat: 3 }); if (S.dead) return commit();
    const K = D.RUMOR.kinds[r.kind];
    const ev = { id: 'rumor', rid: r.id, dest: S.loc, result: null, dyn: { title: '查探傳聞・' + K.name, text: '', opts: [] } };
    S.event = ev; S.scene = 'event';
    const done = (t, cls) => { ev.result = t; log(t, cls); };
    if (r.truth === 'true') {
      if (r.kind === 'beast') {
        ev.dyn.text = '循著血跡找到了那頭異獸，牠身上帶著舊傷，正伏在石後喘息。';
        ev.dyn.opts = [{ k: 'r_hunt', label: '趁牠帶傷動手', note: '入戰・敵方半血' }, { k: 'r_leave', label: '放過牠', note: '傳聞保留' }];
      } else { ev.dyn.text = '傳聞是真的，東西就在那裡，四下無人。'; done('到手：' + grantRumor(r, 1), 'good'); }
    } else if (r.truth === 'gone') {
      ev.dyn.text = '來晚了。地上只剩翻開的土和一口空箱。';
      S.rumors = S.rumors.filter((x) => x.id !== r.id);
      if (rnd() < 0.3 && S.rumors.length < D.RUMOR.max) {
        const k2 = pick(Object.keys(D.RUMOR.kinds)); const n2 = pick(D.RUMOR.kinds[k2].nodes.filter((n) => n !== r.node));
        const r2 = addRumor(k2, n2, 'true');
        done('箱底壓著半張字條：' + r2.text, 'good');
      } else done('一無所獲。');
    } else if (r.truth === 'guard') {
      ev.dyn.text = '已經有人先到了：兩個劫匪守在那裡，還沒把東西搬走。';
      ev.dyn.opts = [{ k: 'r_fight', label: '動手搶', note: '入戰・劫匪 ×2' }, { k: 'r_talk', label: '開口談分帳', note: '說服檢定・成則付 10 兩' }, { k: 'r_leave', label: '退走', note: '傳聞保留' }];
    } else if (r.truth === 'strong') {
      ev.dyn.text = '洞口蹲著一頭山魈，正啃著上一個來查探的人。牠還沒發現你。';
      ev.dyn.opts = [{ k: 'r_boss', label: '硬闖', note: '入戰・山魈' }, { k: 'r_sneak', label: '悄悄退走', note: '身法檢定' }];
    } else {
      // 根本是餌：靈覺與追蹤決定能不能先察覺
      const p = clamp(0.15 + (attrVal('ling') - 10) * 0.05 + profLv('zong') * 0.004 + (r.traced ? 0.5 : 0), 0.05, 0.95);
      if (rnd() < p) {
        ev.dyn.text = '你察覺兩側草叢裡有人蹲伏。這則傳聞是個餌。';
        ev.dyn.opts = [{ k: 'r_strike', label: '先下手', note: '入戰・首回合敵人不動' }, { k: 'r_leave2', label: '不動聲色退走', note: '傳聞作廢' }];
      } else {
        S.rumors = S.rumors.filter((x) => x.id !== r.id);
        S.event = null;
        log('中計了！放消息的人就是劫匪，兩側殺出人來。', 'bad');
        startCombat(['bandit', 'bandit'], { type: 'wild', node: S.loc }, { ambush: true });
      }
    }
    commit();
  }
  function rumorChoose(k) {
    const ev = S.event; const r = S.rumors.find((x) => x.id === ev.rid);
    const res = (t, cls) => { ev.result = t; ev.dyn.opts = []; log(t, cls); };
    if (!r) { res('這裡已經沒什麼可查的了。'); return commit(); }
    const node = S.loc;
    switch (k) {
      case 'r_leave': res('你退了出去，這則傳聞還記著。'); break;
      case 'r_leave2': S.rumors = S.rumors.filter((x) => x.id !== r.id); res('你裝作路過，慢慢退開。'); break;
      case 'r_hunt': S.event = null; startCombat(['redboar'], { type: 'rumor', node, rid: r.id, tier: 1 }, { hpMult: 0.5 }); break;
      case 'r_fight': S.event = null; startCombat(['bandit', 'bandit'], { type: 'rumor', node, rid: r.id, tier: 1 }); break;
      case 'r_boss': S.event = null; startCombat(['xiao'], { type: 'rumor', node, rid: r.id, tier: 2 }); break;
      case 'r_strike': S.rumors = S.rumors.filter((x) => x.id !== r.id); S.event = null; startCombat(['bandit', 'bandit'], { type: 'wild', node }, { stun: 1 }); break;
      case 'r_talk': {
        const p = clamp(0.25 + profLv('shuo') * 0.007 + (attrVal('kou') - 10) * 0.05, 0.05, 0.92);
        gainProf('shuo', 8, 20);
        if (rnd() < p && S.silver >= 10) { S.silver -= 10; res('你說動了他們，付 10 兩分了一份：' + grantRumor(r, 1), 'good'); }
        else { S.event = null; log('話不投機，劫匪拔刀了。', 'bad'); startCombat(['bandit', 'bandit'], { type: 'rumor', node, rid: r.id, tier: 1 }); }
        break;
      }
      case 'r_sneak': {
        const p = clamp(0.5 + (attrVal('shen') - 10) * 0.06 + profLv('shan') * 0.004, 0.1, 0.95);
        if (rnd() < p) res('你屏住呼吸退了出來。山魈還在那裡，這則傳聞還記著。');
        else { S.event = null; log('腳下踩斷了枯枝，山魈轉過頭來。', 'bad'); startCombat(['xiao'], { type: 'rumor', node, rid: r.id, tier: 2 }); }
        break;
      }
    }
    commit();
  }

  // ================= 世界事件：獸潮 =================
  function worldTick(day) {
    const W = S.world; const T = D.TIDE;
    if (W.tide && day > W.tide.end) {
      const td = W.tide; const q = S.quests.find((x) => x.kind === 'tide');
      if (td.kills >= td.need) {
        if (q) { q.status = 'done'; q.due = null; }
        repelToday = td.town;
        log('獸潮退了。' + D.NODES[td.town].name + '守住了，委託板可領「擊退獸潮」的賞。', 'good');
      } else {
        S.quests = S.quests.filter((x) => x.kind !== 'tide');
        W.hurt[td.town] = day + T.hurtDays - 1;
        log('獸潮沖進了' + D.NODES[td.town].name + '。城鎮受創 ' + T.hurtDays + ' 天：貨架剩一半、客棧漲價。', 'bad');
      }
      W.tide = null; W.next = day + wri('tide-gap', day, 0, T.gap[0], T.gap[1]); // E4：不吃 S.rng
    }
    if (!W.tide && day === W.next - 1) log('山裡的獸群躁動不安，城裡人說明天怕有獸潮。', 'bad');
    if (!W.tide && day >= W.next) {
      // E4：目標鎮改用 wrnd；權重維持現況各 1/2（§4.7 的 O>80 權重屬 DEV-04，接口：權重恆 1）
      const town = D.TIDE.towns[Math.floor(wrnd('tide-town', day, 0) * D.TIDE.towns.length)];
      W.tide = { town, start: day, end: day + T.days - 1, kills: 0, need: T.need };
      S.quests.push({ id: 'tide' + day, town, kind: 'tide', g: '潮', ic: 'wolf', title: '擊退獸潮', need: T.need, reward: T.reward, due: W.tide.end, fixed: false, prog: 0, status: 'active' });
      log('獸潮來了，直撲' + D.NODES[town].name + '！為期 ' + T.days + ' 天：獸跡變多、野徑更險、藥水漲價。殺滿 ' + T.need + ' 頭野獸可領賞。', 'bad');
    }
  }
  // ================= 兩鎮循環（SPEC-01 v0.4 §3、§5.1–5.3、5.5、§7.6；DEV-02） =================
  // 雜訊旗標：測試用 NOISE=0（_debug.setNoise(false)）關閉 PNOISE；不存檔。
  let NOISE = true;
  // SPEC-SEASON 鉤子（SPEC-01 §9 E17），預設全中性；本包不填值。taxMult 也供 AC-A4「Inc 設 0」測試使用。
  const HOOKS = { pTargetOffset: {}, taxMult: {} };
  // 本次 newDay 中玩家擊退獸潮的鎮（只給 whyCode 判斷，不存檔）；擊退對 P／O 的加成屬 §5.4（DEV-04），本包維持 0。
  let repelToday = null;
  function newTown(tid) {
    const st = D.WORLD.START[tid];
    return { P: st.P, T: st.T, O: st.O, Gnom: st.Gnom, Geff: st.Gnom, F: 0, Lpat: 0, debt: 0, rescueCd: 0, taxCut: 0, brief: {},
      // 假設：acc＝上次日結以來直接進出 T 的即時款（交易稅；罰金與賞金實付留給 SPEC-02），給 brief 的「今日」收支用（§7.2）
      acc: { tax: 0, fines: 0, bountyPaid: 0 },
      // 假設：上一次「上繳」日誌的日期（§4.3「日誌最多每 10 天提示一次」需要記住；規格 §3 未列此欄）
      remitLogDay: -99 };
  }
  // 建立本包的世界欄位（新局，或讀到沒有 world.towns 的存檔時）。§5.8–5.10 無人認領：heavyOps、refugee 只放預設值。
  function initTownWorld(st) {
    const W = st.world;
    W.towns = {}; D.WORLD.TOWNS.forEach((tid) => (W.towns[tid] = newTown(tid)));
    W.region = Object.assign({}, D.WORLD.REGION0);
    W.heavyOps = { season: 0, n: 0 };
    W.refugee = Object.assign({}, D.WORLD.REFUGEE0);
    if (st.wanted === undefined) st.wanted = {};
    if (st.hostility === undefined) st.hostility = {};
    if (st.jurisdiction === undefined) st.jurisdiction = null;
    if (st.influence === undefined) st.influence = {};
  }
  function townOf(id) { return S.world.towns ? S.world.towns[id] || null : null; }
  function garrisonName(g) { return D.WORLD.GARRISON_NAMES[clamp(g | 0, 0, 3)]; }
  // §4.10 治安修正（給 SPEC-02／03）：用最近一次日結後的 O、Geff
  function sPub(tid) {
    const t = townOf(tid); if (!t) return 1;
    const C = D.WORLD.S_PUB;
    return clamp(C.a + C.kO * t.O + C.kG * t.Geff, C.lo, C.hi) / C.norm;
  }
  // §4.8「套用」列的 R（rollout-plan DEV-02「只乘治安修正」）：路線全官道用 R_road，含野徑用 R_wild
  function riskR(wild) {
    const W = S.world, Wd = D.WORLD; if (!W.towns) return 1;
    const Obar = (W.towns.huiyao.O + W.towns.duyin.O) / 2, B = W.region.B;
    if (wild) return clamp(1 + Wd.R_WILD.kB * (B - Wd.B_REF) - Wd.R_WILD.kO * (Obar - Wd.O_MEAN), Wd.R_WILD.lo, Wd.R_WILD.hi);
    return clamp(1 - Wd.R_ROAD.kO * (Obar - Wd.O_MEAN), Wd.R_ROAD.lo, Wd.R_ROAD.hi);
  }
  // 獸潮對 P／O 的日結變動（§4.7、§5.4）屬 DEV-04：只留接口，DEV-04 之前恆為 0
  function tideDelta(/* tid, day */) { return { p: 0, o: 0 }; }
  function inTide(tid, day) { const td = S.world.tide; return !!(td && td.town === tid && day >= td.start && day <= td.end); }
  // §5 第 2 步：每鎮依序 5.1 稅 → 5.2 軍費與實際駐軍 → 5.3 目標與更新 → 5.5 上繳；全部用「昨日結束時」的 P、O、B（同步更新）
  function townTick(day) {
    const W = S.world, Wd = D.WORLD; if (!W.towns) return;
    const snap = {}; Wd.TOWNS.forEach((tid) => (snap[tid] = { P: W.towns[tid].P, O: W.towns[tid].O }));
    const B = W.region.B;
    Wd.TOWNS.forEach((tid) => {
      const t = W.towns[tid], y = snap[tid], bs = Wd.BASE[tid];
      const prevBrief = t.brief || {};
      // 5.1 稅（用目前 taxCut 算 Inc，之後才遞減計數器）
      const mult = HOOKS.taxMult[tid] === undefined ? 1 : HOOKS.taxMult[tid];
      const incFull = Wd.K_TAX[tid] * y.P * (Wd.TAX_O0 + Wd.TAX_O1 * y.O) * mult;
      const cut = t.taxCut > 0;
      const Inc = incFull * (cut ? Wd.TAX_CUT_MULT : 1);
      t.T += Inc;
      // 5.2 軍費與實際駐軍
      t.rescueCd = Math.max(t.rescueCd - 1, 0); t.taxCut = Math.max(t.taxCut - 1, 0);
      const need = Wd.UPKEEP[t.Gnom]; let paid = 0, debtToday = false, aidToday = false, rescueAmt = 0, d = 0;
      if (t.T >= need) {
        t.T -= need; paid = need; t.Geff = t.Gnom; t.debt = 0;
        d = Wd.UPKEEP[Math.min(t.Gnom + 1, 3)] - need;
        if (t.Gnom < 3 && t.F >= d) { t.F -= d; t.Geff = t.Gnom + 1; aidToday = true; }
      } else {
        t.Geff = Math.max(t.Gnom - 1, 0);
        paid = Math.min(t.T, Wd.UPKEEP[t.Geff]); t.T -= paid;
        t.debt += 1; debtToday = true; // F 不動（E2）
      }
      if (t.debt >= Wd.RESCUE_DEBT && t.rescueCd === 0) {
        rescueAmt = Wd.RESCUE_UPKEEP_DAYS * Wd.UPKEEP[t.Gnom];
        t.T += rescueAmt; t.debt = 0; t.taxCut = Wd.RESCUE_TAX_CUT; t.rescueCd = Wd.RESCUE_CD;
      }
      // 5.3 繁榮與治安（獸潮項 tideDelta 待 DEV-04；販人回饋 −0.2×soldToday 屬 §5.10，無人認領，恆 0）
      const Pcap = Wd.P_CAP;
      const Pstar = bs.P_base + Wd.P_OF_O * (y.O - bs.O_base) + (HOOKS.pTargetOffset[tid] || 0);
      const Ostar = bs.O_base + Wd.O_OF_P * (y.P - bs.P_base) - Wd.O_OF_B * (B - Wd.B_REF) + Wd.O_PER_G * (t.Geff - bs.G0) + Wd.PATROL[t.Lpat];
      const td = tideDelta(tid, day);
      let eps = 0;
      if (NOISE) { const u = wrnd('pnoise-' + tid, day, 0); eps = (u < 1 / 3 ? -1 : u < 2 / 3 ? 0 : 1) * Wd.PNOISE; }
      let dP = Wd.K_REG * (Pstar - y.P) + eps + td.p;
      let dO = Wd.K_REG * (Ostar - y.O) + td.o;
      dP = clamp(dP, -Wd.DAY_CAP, Wd.DAY_CAP); dO = clamp(dO, -Wd.DAY_CAP, Wd.DAY_CAP);
      if (dP > 0 && y.P > Wd.P_HIGH) dP *= Wd.P_HIGH_MULT;
      t.P = r2(clamp(y.P + dP, Wd.P_MIN, Pcap)); t.O = r2(clamp(y.O + dO, 0, 100));
      // 5.5 財庫上繳
      const TCAP = Wd.T_CAP_DAYS * need; let overflow = 0;
      if (t.T > TCAP) {
        overflow = t.T - TCAP; t.T = TCAP;
        if (day - t.remitLogDay >= Wd.REMIT_LOG_GAP) { t.remitLogDay = day; log(D.NODES[tid].name + '財庫滿了，多出的 ' + Math.round(overflow) + ' 兩上繳鎮西將軍府。'); }
      }
      t.T = r2(Math.max(0, t.T)); t.F = r2(t.F);
      if (debtToday) log(D.NODES[tid].name + '欠餉，駐軍降一檔。', 'bad');
      if (rescueAmt) log(D.NODES[tid].name + '求援：撥銀 ' + rescueAmt + ' 兩，往後 ' + Wd.RESCUE_TAX_CUT + ' 天稅收抽成。', 'bad');
      // §7 brief（每次日結覆寫；UI 只讀不算，畫面屬 DEV-05）
      const a = t.acc;
      const inSum = Inc + a.tax + a.fines + rescueAmt, outSum = paid + a.bountyPaid + overflow;
      const tIn = Math.round(inSum), tOut = Math.round(outSum);
      const realdP = r2(t.P - y.P), realdO = r2(t.O - y.O);
      const trend = Math.abs(realdP) < Wd.TREND_EPS ? 'flat' : realdP > 0 ? 'up' : 'down';
      const aidDaysLeft = aidToday ? 1 + Math.floor(t.F / d) : 0;
      let whyCode = null;
      if (trend !== 'flat') {
        const sgn = trend === 'up' ? 1 : -1;
        const pdO = prevBrief.dO || 0;
        const R = W.refugee || {};
        const rules = [
          [inTide(tid, day), -1, 'WHY_TIDE'], [townHurt(tid), -1, 'WHY_HURT'], [repelToday === tid, 1, 'WHY_REPEL'],
          [debtToday, -1, 'WHY_DEBT'], [B >= Wd.WHY_BANDIT_B, -1, 'WHY_BANDIT'], [tid === 'duyin' && (R.soldYday || 0) > 0, -1, 'WHY_RENLU'],
          [aidToday, 1, 'WHY_AID'], [pdO >= 1, 1, 'WHY_ORDER_UP'], [pdO <= -1, -1, 'WHY_ORDER_DOWN'],
        ];
        const hit = rules.find((r) => r[0] && r[1] === sgn);
        whyCode = hit ? hit[2] : (Math.sign(realdP) === Math.sign(Pstar - y.P) ? 'WHY_REVERT' : 'WHY_NONE');
      }
      t.brief = {
        day, dP: realdP, dO: realdO, trend, whyCode, T: t.T, dT: r2(inSum - outSum),
        treasuryIn: tIn, treasuryOut: tOut, treasuryNet: tIn - tOut,
        Inc: r2(Inc), tax: r2(a.tax), fines: r2(a.fines), rescueAmt: r2(rescueAmt), upkeepPaid: r2(paid), bountyPaid: r2(a.bountyPaid), overflow: r2(overflow),
        treasuryTier: debtToday ? 'debt' : need === 0 ? 'ok' : t.T >= TCAP ? 'full' : t.T < Wd.TIGHT_DAYS * need ? 'tight' : 'ok',
        Geff: t.Geff, debtToday, debtDays: t.debt, aidToday, aidDaysLeft, aidFund: t.F,
        rescueToday: rescueAmt > 0, taxCutDays: t.taxCut, taxCutAmt: r2(cut ? incFull - Inc : 0),
      };
      t.acc = { tax: 0, fines: 0, bountyPaid: 0 };
    });
    repelToday = null;
  }
  // §5 第 3 步 regionTick（§5.6 匪勢與人手）：只留接口。SPEC-01 §13 歸 DEV-04，任務書寫「匪勢 B 在 DEV-04 之前維持起手值」，
  // 劫匪、crew、據點被端留給 DEV-04（製作人 16:46 裁決第 6 項：DEV-02 只做 R 乘項與 0.85 封頂）；本包不更新 B、crew（維持起手 30／4）。
  function regionTick(/* day */) { /* 待 DEV-04 */ }
  // 交易稅（§4.3、§5.7，Q1 乙）：只在賣出時扣，floor(得銀 × 5%) 進該鎮 T；買價與 sellPrice 顯示值不變
  function tradeTax(got) {
    const t = townOf(S.loc); if (!t) return 0; // 假設：只有兩鎮（灰窯、渡陰）課稅；破曉營等非鎮地點不課
    const x = Math.floor(got * D.WORLD.TRADE_TAX);
    if (x > 0) { t.T = r2(t.T + x); t.acc.tax += x; }
    return x;
  }
  function tideInfo() {
    const td = S.world.tide; if (!td || !tideOn()) return null;
    return { town: td.town, kills: td.kills, need: td.need, left: td.end - dayOf(S.t) + 1 };
  }

  // ================= 探查：每個地點固定幾樣發現，依序找到 =================
  function exploreInfo(id) { id = id || S.loc; return { found: S.found[id] || 0, total: (D.EXPLORE[id] || []).length }; }
  function extraPoints(id) { return (D.EXPLORE[id] || []).slice(0, S.found[id] || 0).filter((e) => e.kind === 'point').map((e) => e.point); }
  function wildPoints(id) { return D.WILDS[id].points.concat(extraPoints(id)); }
  function localBeast(id) {
    if (D.DUNGEONS[id]) return D.DUNGEONS[id].floors[0][0];
    const W = D.WILDS[id]; const t = W && W.points.filter((x) => x.kind === 'track' && D.ENEMIES[x.enemy].beast);
    return t && t.length ? pick(t).enemy : 'wolf';
  }
  function exploreChance(id) {
    id = id || S.loc; const n = S.found[id] || 0;
    if (n >= (D.EXPLORE[id] || []).length) return clamp(0.1 + (attrVal('ling') - 10) * 0.01, 0.05, 0.2);
    return clamp(0.55 + (attrVal('ling') - 10) * 0.04 + profLv('tanyou') * 0.006 - n * 0.08, 0.15, 0.95);
  }
  function explore() {
    if (S.combat || S.dead || S.scene === 'origin' || S.scene === 'naming' || S.scene === 'event' || S.scene === 'loot') return;
    const id = S.loc; const list = D.EXPLORE[id] || []; const n = S.found[id] || 0;
    const hours = perk('tanyou', 50) ? 0.5 : 1;
    const p = exploreChance(id);
    passTime(hours, { fat: 3 * hours }); if (S.dead) return commit();
    gainProf('tanyou', 7, n * 15);
    if (n >= list.length || rnd() >= p) {
      log('探查' + D.NODES[id].name + '：' + pick(LORE().MISS));
      if (D.NODES[id].kind !== 'town' && !perk('tanyou', 25) && rnd() < 0.15) {
        const en = localBeast(id);
        log('動靜太大，驚動了' + D.ENEMIES[en].name + '。', 'bad');
        startCombat([en], { type: 'wild', node: id });
      }
      return commit();
    }
    const e = list[n]; S.found[id] = n + 1; S.stats.finds++;
    const T = LORE().EXPLORE[e.id] || { title: '有所發現', text: '' };
    const ev = { id: 'explore', dest: id, result: null, dyn: { title: '探查・' + T.title, text: T.text, opts: [] } };
    log('探查' + D.NODES[id].name + '：發現「' + T.title + '」', 'good');
    if (e.kind === 'fight') {
      log(T.text);
      startCombat(e.enemy, { type: 'wild', node: id, bonus: e.items || [] });
      return commit();
    }
    if (e.kind === 'lore') { addCodex(e.codex, '探查'); const L = LORE().CODEX[e.codex]; ev.result = '記入見聞錄：' + (L ? L.title : e.codex); }
    else if (e.kind === 'cache') {
      const names = [];
      (e.items || []).forEach(([k, c]) => { addItem({ k, n: c }); names.push(D.ITEMS[k].name + ' ×' + c); });
      if (e.eq) { const it = lootEq(e.eq); addItem(it); names.push(itemName(it)); }
      if (e.silver) { S.silver += e.silver; S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver); names.unshift('銀兩 +' + e.silver); }
      ev.result = '到手：' + names.join('、');
    } else if (e.kind === 'point') {
      if (S.nodes[id]) S.nodes[id].pts[e.point.id] = e.point.max;
      ev.result = '這裡從此多了一處「' + e.point.label + '」。';
    } else if (e.kind === 'node') {
      S.known[e.node] = true;
      ev.result = '地圖上多了一個地方：' + D.NODES[e.node].name + '。';
    }
    log(ev.result, 'good');
    S.event = ev; S.scene = 'event'; S.townTab = null; S.say = null; S.street = null; S.trade = null;
    commit();
  }

  // ================= 製作（營火／藥爐） =================
  function canCraftHere(R) {
    if (S.scene === 'wild' && S.fire) return true;
    return !R.fireOnly && inBld('apoth');
  }
  function craft(rid) {
    const R = D.RECIPES.find((r) => r.id === rid);
    if (!R || !canCraftHere(R)) { log(R && R.fireOnly ? '需要先生起營火。' : '需要營火或城鎮藥爐。', 'bad'); return emit(); }
    if (countItem(R.mat) < R.n) { log('材料不足：' + D.ITEMS[R.mat].name + ' ' + countItem(R.mat) + '/' + R.n, 'bad'); return emit(); }
    const food = R.out === 'ration'; const sk = food ? 'peng' : 'yao';
    const saved = !food && perk('yao', 25) && R.n > 1 && rnd() < 0.3;
    const dbl = food ? perk('peng', 25) && rnd() < 0.3 : perk('yao', 50) && rnd() < 0.25;
    removeItem(R.mat, saved ? R.n - 1 : R.n);
    passTime(R.h, { fat: 1 });
    if (S.dead) return commit();
    addItem({ k: R.out, n: dbl ? 2 : 1 });
    gainProf(sk, 6); S.stats.crafts++;
    log('製成' + R.name + (dbl ? ' ×2' : '') + (saved ? '（省下 1 份材料）' : ''), 'good');
    commit();
  }

  // ================= 荒野採集 =================
  function gather(kind, pid) {
    if (S.scene !== 'wild' || S.dead) return;
    const W = D.WILDS[S.loc]; const ns = nodeState(S.loc);
    const pts = wildPoints(S.loc);
    let p = pid ? pts.find((x) => x.id === pid) : pts.find((x) => x.kind === kind && ns.pts[x.id] > 0);
    if (!p) { log(kind === 'herb' ? '附近已無藥叢可採。' : kind === 'ore' ? '附近已無礦脈。' : '附近已無獸跡。', 'bad'); return emit(); }
    if (ns.pts[p.id] <= 0) { log(p.label + '已採盡。', 'bad'); return emit(); }
    kind = p.kind;
    if (kind === 'track') return track(p);
    const herb = kind === 'herb'; const sk = herb ? 'cai' : 'kuang';
    const hours = herb ? 1 : 2;
    const fat = gatherFat(kind);
    passTime(hours, { fat });
    if (S.dead) return commit();
    ns.pts[p.id] -= 1;
    let n = herb ? ri(1, 2) : 1;
    const notes = [];
    if (herb && perk('cai', 50) && rnd() < 0.4) { n *= 2; notes.push('雙份'); }
    if (!herb && perk('kuang', 50) && rnd() < 0.35) { n += 1; notes.push('多挖一塊'); }
    if (rnd() < (attrVal('ling') - 10) * 0.02) { n += 1; notes.push('靈覺'); }
    if (rnd() < affixSum('gather') / 100) n += 1;
    let lost = addItem({ k: p.item, n });
    if (herb && perk('cai', 25) && rnd() < 0.25) { lost += addItem({ k: 'vine_du', n: 1 }); notes.push('辨出毒藤 ×1'); }
    gainProf(sk, herb ? 6 : 7, D.ITEMS[p.item].dl); S.stats.gathers++;
    log((herb ? '採得' : '挖得') + D.ITEMS[p.item].name + ' ×' + n + (notes.length ? '（' + notes.join('、') + '）' : '') + (lost ? '，行囊滿，' + lost + ' 份落在地面' : ''));
    // 偶發：毒蟲遇襲／崩塌
    const A = W.ambush;
    if (A && A.on === kind && rnd() < A.p && !(A.enemy && perk('cai', 75))) {
      if (A.enemy) { log('驚動了' + D.ENEMIES[A.enemy].name + '！', 'bad'); startCombat([A.enemy], { type: 'wild', node: S.loc }); }
      else { const d = Math.ceil(ri(5, 9) * (perk('kuang', 25) ? 0.5 : 1)); S.hp -= d; log('坑道落石，生命 −' + d, 'bad'); checkDeath('礦坑崩塌'); }
    }
    commit();
  }
  function gatherFat(kind) { return kind === 'herb' ? 4 * (1 - profLv('cai') * 0.004) : 10 * (1 - profLv('kuang') * 0.004); }
  function track(p) {
    const ns = nodeState(S.loc);
    passTime(1, { fat: 3 });
    if (S.dead) return commit();
    ns.pts[p.id] -= 1;
    gainProf('zong', 5, D.ENEMIES[p.enemy].lv);
    log('循著' + p.label + '追蹤，找到了' + D.ENEMIES[p.enemy].name + '。');
    startCombat([p.enemy], { type: 'hunt', node: S.loc }, { stun: perk('zong', 50) ? 1 : 0 });
    commit();
  }
  function camp() {
    if (S.scene !== 'wild' || S.dead) return;
    if (!S.fire) {
      passTime(1, { fat: 1 });
      if (S.dead) return commit();
      S.fire = true; gainProf('ying', 4); log('生起營火。可調和藥水、烤製乾糧，或露宿到天亮。');
      return commit();
    }
    // 露宿：睡 8 小時，夜警風險
    const night = isNight(S.t) || isNight(S.t + 8 * 60);
    const risk = (night ? 0.25 : 0.12) * (D.WILDS[S.loc].risk === '低' ? 0.6 : 1) * (perk('ying', 25) ? 0.6 : 1) * (tideOn() ? 1.5 : 1);
    const rec = 50 * (S.skills.includes('xi') ? 1.25 : 1) * (perk('ying', 50) ? 1.25 : 1);
    passTime(8, { food: 16, fat: -rec });
    if (S.dead) return commit();
    gainProf('ying', 8);
    log('露宿 8 小時，疲累 −' + Math.round(rec) + '。');
    if (rnd() < risk) {
      log('夜警！營火外有東西逼近。', 'bad');
      startCombat([localBeast(S.loc)], { type: 'wild', node: S.loc });
    }
    commit();
  }

  // ================= 地城 =================
  function dungeonDelve() {
    if (S.scene !== 'dungeon' || S.dead) return;
    const DG = D.DUNGEONS[S.loc]; const st = S.dungeon;
    if (st.clearedDay === dayOf(S.t)) { log('此地今日已清空，明日再來。'); return emit(); }
    passTime(1, { fat: 3 });
    if (S.dead) return commit();
    const f = st.floor;
    log('深入' + D.NODES[S.loc].name + '・' + DG.floorNames[f] + '。');
    if (DG.mist) addCorrupt(DG.mist);
    startCombat(DG.floors[f], { type: 'dungeon', node: S.loc, floor: f });
    commit();
  }

  // ================= 回合戰鬥（第一人稱、意圖預告、行動列、演出佇列、棄物撤退） =================
  // 演出佇列：規則層每做一件看得見的事就記一筆，介面依序演出（不進存檔）
  let FX = [];
  function fx(o) { FX.push(o); }
  function takeFx() { const q = FX; FX = []; return q; }

  function mkEnemy(id, idx) {
    const E = D.ENEMIES[id];
    return { id, idx, name: E.name, g: E.g, hp: E.hp, max: E.hp, spd: E.spd, armor: E.armor || 0, pi: ri(0, E.pat.length - 1), intent: null, guard: 0, charged: false, bleed: 0, poison: 0, brk: 0, stag: 0, raged: false, hitOnce: false };
  }
  // 意圖：atk 攻擊、heavy 重擊、bleed 流血、poison 下毒、drain 吸血、corrupt 侵蝕、charge 蓄力、guard 防禦
  function rollIntent(e) {
    const E = D.ENEMIES[e.id];
    let k;
    if (e.charged) { k = 'heavy'; e.charged = false; }
    else { k = E.pat[e.pi % E.pat.length]; e.pi++; if (k === 'heavy' && !E.heavy) k = 'atk'; }
    const m = e.raged ? 1.3 : 1; let range = null;
    if (k === 'heavy') { const h = E.heavy || [E.dmg[0] * 2, E.dmg[1] * 2]; range = [Math.round(h[0] * m), Math.round(h[1] * m)]; }
    else if (k !== 'guard' && k !== 'charge') range = [Math.round(E.dmg[0] * m), Math.round(E.dmg[1] * m)];
    e.intent = { k, range };
  }
  function startCombat(ids, ctx, opts) {
    opts = opts || {};
    const enemies = ids.map((id, i) => mkEnemy(id, i));
    if (opts.hpMult) enemies.forEach((e) => (e.hp = Math.max(1, Math.round(e.hp * opts.hpMult))));
    enemies.forEach(rollIntent);
    S.combat = { enemies, round: 1, target: 0, ctx, bleed: 0, poison: 0, cds: {}, defend: false, evade: 0, next: 1, shadow: false, oil: false, retreatBonus: 0, drops: [], retreatOpen: false, stun: opts.stun || 0 };
    S.retreatSel = [];
    S.scene = 'combat'; S.townTab = null; S.say = null; S.street = null;
    S.stats.cause = '';
    FX = [];
    const c = S.combat;
    if (c.stun) log('你搶得先機，對方措手不及。', 'good');
    // 弓弩 25：開戰前免費射一箭
    if (weaponType() === 'gong' && perk('gong', 25)) { log('先射！'); strike(enemies[0], { mult: 1, label: '先射' }); }
    // 遇伏：敵人先動一輪
    if (opts.ambush) {
      enemies.forEach((e) => { if (e.hp > 0 && S.hp > 0) enemyAct(e); });
      if (checkDeath()) return;
      enemies.forEach((e) => { if (e.hp > 0) rollIntent(e); });
    }
    if (enemies.every((e) => e.hp <= 0)) victory();
  }
  function playerSpeed() {
    let s = 10 * speedMult() + (attrVal('shen') - 10) * 0.4;
    if (S.combat && S.combat.ctx.type === 'hunt') s += profLv('zong') * 0.05;
    return Math.round(s * 10) / 10;
  }
  function combatOrder() {
    const c = S.combat; if (!c) return [];
    const first = c.round === 1 && weaponType() === 'qiang' && perk('qiang', 25); // 長兵 25：先制
    const list = [{ who: 'you', spd: first ? 999 : playerSpeed() }];
    c.enemies.forEach((e, i) => { if (e.hp > 0) list.push({ who: i, spd: e.spd }); });
    list.sort((a, b) => b.spd - a.spd || (a.who === 'you' ? -1 : 1));
    return list;
  }
  function critChance(extra) { return clamp(0.05 + (attrVal('shen') - 10) * 0.01 + (extra || 0), 0, 0.6); }
  function retreatChance(dropWt) {
    const after = totalWt() - (dropWt || 0);
    const band = loadBand(after);
    let p = { light: 0.6, normal: 0.4, heavy: 0.18, over: 0.05 }[band.id];
    p += profLv('jiao') * 0.003 + (attrVal('shen') - 10) * 0.02 + (perk('shan', 25) ? 0.08 : 0);
    if (S.skills.includes('jixing')) p += 0.1;
    if (hasUnique('sure_retreat')) p += 0.25;
    if (S.combat) p += S.combat.retreatBonus || 0;
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
  function chestAc() { return S.equip.chest ? eqBase(S.equip.chest).ac : null; }
  function hasShield() { return !!(S.equip.off && eqBase(S.equip.off).shield); }

  // ---------- 行動列：武器、招式、技能、防禦、道具放在一起 ----------
  function techList() {
    const wt = weaponType();
    return D.TECHS.filter((T) => T.prof === wt || (T.prof === 'dun' && hasShield()) || T.prof === 'shan');
  }
  function combatActions() {
    const c = S.combat; if (!c) return [];
    const wt = weaponType(); const A = [];
    A.push({ id: 'attack', kind: 'attack', name: wt === 'quan' ? '拳腳' : D.WTYPE_NAMES[wt], ic: S.equip.main ? eqBase(S.equip.main).ic : 'a_attack', g: '攻', desc: '普通攻擊。傷害 ' + weaponDmg().join('–') + '，命中 ' + Math.round(hitChance() * 100) + '%。' });
    techList().forEach((T) => {
      const ok = profLv(T.prof) >= T.lv; const cd = c.cds[T.id] || 0;
      A.push({ id: T.id, kind: 'tech', name: T.name, ic: T.id, g: T.g, cd, cost: T.cost, locked: !ok, lockText: PROF[T.prof].name + ' ' + T.lv, disabled: !ok || cd > 0, desc: T.desc + '（疲累 +' + T.cost + '、冷卻 ' + T.cd + '）' });
    });
    S.skills.forEach((k) => {
      const K = D.SKILLS[k]; if (!K.active) return; const cd = c.cds[k] || 0;
      A.push({ id: k, kind: 'skill', name: K.name, ic: K.ic, g: K.g, cd, cost: K.cost, disabled: cd > 0, desc: K.desc + '（疲累 +' + K.cost + '、冷卻 ' + K.cd + '）' });
    });
    A.push({ id: 'defend', kind: 'defend', name: '防禦', ic: hasShield() ? eqBase(S.equip.off).ic : 'a_defend', g: '防', desc: hasShield() ? '舉盾：本回合受傷大減，不會流血、中毒。' : '架開：本回合受傷減半以上，不會流血、中毒。' });
    const seen = {};
    S.pack.forEach((it) => {
      if (!it || it.k === 'eq' || seen[it.k]) return; const I = D.ITEMS[it.k];
      if (I.type !== 'use' || !(I.use.hp || I.use.fat || I.use.oil || I.use.cure)) return;
      seen[it.k] = 1;
      A.push({ id: 'item:' + it.k, kind: 'item', item: it.k, name: I.name, ic: I.ic || it.k, g: I.g, n: countItem(it.k), disabled: !!((I.use.oil && c.oil) || (I.use.cure && !c.poison)), desc: I.desc });
    });
    A.push({ id: 'wait', kind: 'wait', name: '待機', ic: 'a_wait', g: '等', desc: '調勻呼吸，疲累 −4。' });
    return A;
  }
  function spend(id, cost, cd) { S.fat = clamp(S.fat + cost, 0, 100); S.combat.cds[id] = cd + 1; }

  function killEnemy(e) {
    e.hp = 0; S.stats.kills++;
    const E = D.ENEMIES[e.id];
    log(e.name + '倒下了。', 'good');
    fx({ t: 'kill', i: e.idx });
    questProgress('kill', e.id);
    if (E.beast) { questProgress('beast'); if (S.world.tide && tideOn()) S.world.tide.kills++; }
    if (E.drop && rnd() < E.drop[1]) S.combat.drops.push({ k: E.drop[0], n: 1 });
    if (hasUnique('kill_heal')) S.hp = Math.min(maxHp(), S.hp + 8);
  }
  // 出手一次。o: mult 倍率、label 名稱、pierce 無視防禦、noArmor 無視護甲、hit 命中修正、sure 必中、crit 會心加成
  function strike(e, o) {
    const c = S.combat; const wt = weaponType(); const lv = D.ENEMIES[e.id].lv;
    if (!o.sure && rnd() > clamp(hitChance() + (o.hit || 0), 0.2, 0.99)) { log('你的' + o.label + '落空了。'); gainProf(wt, 1, lv); fx({ t: 'p_miss', i: e.idx }); return 0; }
    const [a, b] = weaponDmg();
    let d = ri(a, b) * o.mult * (c.next || 1);
    let crit = rnd() < critChance(o.crit);
    if (hasUnique('crit_heavy') && e.intent && e.intent.k === 'heavy' && !e.hitOnce) { crit = true; log('鎮淵古刃：重擊破綻！', 'good'); }
    if (crit) d *= 1.6;
    e.hitOnce = true;
    if (!(o.noArmor || e.brk > 0 || (wt === 'fu' && perk('fu', 25)))) d -= e.armor / 2;
    if (e.guard && !o.pierce) d *= 0.5;
    d = Math.max(1, Math.round(d));
    e.hp -= d;
    log('你以' + o.label + (crit ? '會心一擊，' : '') + '擊中' + e.name + '，造成 ' + d + ' 傷害', crit ? 'good' : '');
    gainProf(wt, 3, lv);
    fx({ t: 'p_hit', i: e.idx, d, crit, hp: Math.max(0, e.hp), kind: wt });
    if (e.hp > 0 && wt === 'dao' && perk('dao', 25) && rnd() < 0.2) { e.bleed = 3; log(e.name + '被劃開一道口子，開始流血。', 'good'); fx({ t: 'e_text', i: e.idx, text: '流血' }); }
    if (e.hp > 0 && c.oil && rnd() < 0.5) { e.poison = 3; log(e.name + '中毒了。', 'good'); fx({ t: 'e_text', i: e.idx, text: '中毒' }); }
    if (e.hp <= 0) { gainProf(wt, 4, lv); killEnemy(e); }
    return d;
  }
  function useTech(T, tgt) {
    const c = S.combat; spend(T.id, T.cost, T.cd);
    if (T.evade) { c.next = 1.3; log('你腳下一錯，身形游走。'); fx({ t: 'p_text', text: '遊身' }); gainProf('shan', 4); return; }
    if (T.shield) {
      const B = eqBase(S.equip.off);
      let d = Math.round((B.armor || 3) * 1.2 + (attrVal('li') - 10) + profLv('dun') / 10);
      d = Math.max(1, d - (tgt.brk > 0 ? 0 : Math.floor(tgt.armor / 2)));
      tgt.hp -= d; log('盾擊' + tgt.name + '，造成 ' + d + ' 傷害');
      fx({ t: 'p_hit', i: tgt.idx, d, hp: Math.max(0, tgt.hp), kind: 'fu' });
      gainProf('dun', 5, D.ENEMIES[tgt.id].lv);
      if (tgt.hp <= 0) return killEnemy(tgt);
      if (tgt.charged || (tgt.intent && tgt.intent.k === 'charge')) { tgt.charged = false; tgt.stag = 1; log(tgt.name + '的蓄力被打斷。', 'good'); fx({ t: 'e_text', i: tgt.idx, text: '打斷' }); }
      return;
    }
    const times = T.times || 1;
    for (let n = 0; n < times; n++) {
      const targets = T.all ? c.enemies.filter((e) => e.hp > 0) : [tgt.hp > 0 ? tgt : c.enemies.find((e) => e.hp > 0)];
      targets.forEach((e) => {
        if (!e || e.hp <= 0) return;
        const d = strike(e, { mult: T.vsBleed && e.bleed > 0 ? T.vsBleed : T.mult, label: T.name, pierce: T.pierce, noArmor: T.noArmor, hit: T.hit, sure: T.sure, crit: T.crit });
        if (d <= 0 || e.hp <= 0) return;
        if (T.brk) { e.brk = T.brk; fx({ t: 'e_text', i: e.idx, text: '破甲' }); }
        if (T.stagger) {
          if (T.sureStagger || !D.ENEMIES[e.id].boss || rnd() < 0.5) { e.stag = 1; e.charged = false; log(e.name + '失去平衡。', 'good'); fx({ t: 'e_text', i: e.idx, text: '失衡' }); }
          else log(e.name + '穩住了。');
        }
      });
    }
    c.next = 1;
  }
  function useSkill(k, tgt) {
    const c = S.combat; const K = D.SKILLS[k]; spend(k, K.cost, K.cd);
    if (k === 'beng') { strike(tgt, { mult: 1.7, label: '崩岩擊', pierce: true }); c.next = 1; }
    else if (k === 'pozhen') {
      c.enemies.filter((e) => e.hp > 0).forEach((e) => {
        strike(e, { mult: 0.9, label: '破陣' });
        if (e.hp > 0 && (e.charged || (e.intent && e.intent.k === 'charge'))) { e.charged = false; e.stag = 1; fx({ t: 'e_text', i: e.idx, text: '打斷' }); }
      });
      c.next = 1;
    } else if (k === 'yaying') { log('你退進影子裡。', 'good'); fx({ t: 'p_text', text: '鴉影' }); }
  }
  function enemyAct(e) {
    const c = S.combat; const it = e.intent; e.guard = 0;
    const lv = D.ENEMIES[e.id].lv;
    if (!it) return;
    if (it.k === 'guard') { e.guard = 6; log(e.name + '架起防禦 +6'); fx({ t: 'e_text', i: e.idx, text: '防禦' }); return; }
    if (it.k === 'charge') { e.charged = true; log(e.name + ' 蓄力：下回合重擊', 'bad'); fx({ t: 'e_text', i: e.idx, text: '蓄力', bad: true }); return; }
    gainProf('shan', 2, lv);
    fx({ t: 'e_act', i: e.idx });
    if (c.shadow || rnd() < clamp(dodgeChance() + (c.evade || 0), 0, 0.95)) { log('你閃過了' + e.name + '的攻擊。'); fx({ t: 'e_miss', i: e.idx }); return; }
    let d = ri(it.range[0], it.range[1]);
    const ar = armor(); const ac = chestAc();
    d = d * (1 - ar / (ar + 30));
    if (c.defend) {
      d *= hasShield() ? clamp(0.4 - profLv('dun') * 0.002, 0.2, 0.4) : 0.45;
      if (hasShield()) gainProf('dun', 4, lv);
    }
    if (it.k === 'heavy' && ac === 'heavy' && perk('zhong', 25)) d *= 0.85;
    if (!S.equip.main && perk('quan', 25)) d *= 0.85;
    d = Math.max(1, Math.round(d));
    S.hp -= d;
    if (ac === 'light') gainProf('qing', 2, lv); else if (ac === 'heavy') gainProf('zhong', 2, lv);
    const verb = { heavy: '重擊', bleed: '撕咬', poison: '毒咬', drain: '吸血', corrupt: '血霧撲面' }[it.k] || '攻擊';
    log(e.name + verb + '，你受到 ' + d + ' 傷害', it.k === 'heavy' ? 'bad' : '');
    fx({ t: 'e_hit', i: e.idx, d, heavy: it.k === 'heavy', php: Math.max(0, S.hp) });
    if (S.hp <= 0) { S.stats.cause = e.name + (it.k === 'heavy' ? '的重擊' : '的攻擊'); return; }
    if (it.k === 'bleed' && !c.defend) {
      const res = affixSum('bleedres') + (attrVal('xin') - 10) * 3;
      if (rnd() * 100 >= res) { c.bleed = 3; log('你開始流血（3 回合）', 'bad'); fx({ t: 'p_text', text: '流血', bad: true }); }
    }
    if (it.k === 'poison' && !c.defend) { c.poison = 3; log('你中毒了（3 回合）', 'bad'); fx({ t: 'p_text', text: '中毒', bad: true }); }
    if (it.k === 'drain') { const h = Math.ceil(d / 2); e.hp = Math.min(e.max, e.hp + h); log(e.name + '吸了你的血，回復 ' + h); fx({ t: 'e_heal', i: e.idx, d: h, hp: e.hp }); }
    if (it.k === 'corrupt') { addCorrupt(c.defend ? 1 : 3); fx({ t: 'p_text', text: '侵蝕', bad: true }); }
    if (c.defend && hasShield() && perk('dun', 25) && e.hp > 0) { const rf = ri(2, 4); e.hp -= rf; log('盾面反震，' + e.name + '受到 ' + rf + ' 傷害'); fx({ t: 'p_hit', i: e.idx, d: rf, hp: Math.max(0, e.hp), kind: 'fu' }); if (e.hp <= 0) killEnemy(e); }
  }
  // kind: attack／tech／skill／defend／item／wait／retreat／potion（舊鍵）／do（行動列 id）
  function combatAction(kind, arg) {
    const c = S.combat; if (!c || S.dead) return;
    const alive = c.enemies.filter((e) => e.hp > 0);
    if (!alive.length) return;
    if (!c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = alive[0].idx;
    if (kind === 'do') {
      const a = combatActions().find((x) => x.id === arg); if (!a || a.disabled) return;
      kind = a.kind; arg = a.kind === 'item' ? S.pack.findIndex((x) => x && x.k === a.item) : a.id;
    }
    if (kind === 'potion') { const i = S.pack.findIndex((x) => x && x.k === 'pot_hp'); if (i < 0) { log('身上沒有金創藥水。', 'bad'); return emit(); } arg = i; kind = 'item'; }
    let T = null;
    if (kind === 'tech') { T = techList().find((x) => x.id === arg); if (!T || profLv(T.prof) < T.lv || (c.cds[T.id] || 0) > 0) return; }
    if (kind === 'skill') { arg = arg || 'beng'; const K = D.SKILLS[arg]; if (!K || !K.active || !S.skills.includes(arg) || (c.cds[arg] || 0) > 0) return; }
    if (kind === 'item') {
      const it = S.pack[arg]; if (!it || it.k === 'eq' || D.ITEMS[it.k].type !== 'use') return;
      const u = D.ITEMS[it.k].use; if ((u.oil && c.oil) || (u.cure && !c.poison)) { useItem(arg, true); return emit(); }
    }
    FX = [];
    if (kind === 'retreat') {
      const dropWt = selWt();
      const p = retreatChance(dropWt);
      // 丟下勾選物品（落在地面）
      S.retreatSel.slice().sort((a, b) => b - a).forEach((i) => { const it = S.pack[i]; if (it) { S.pack[i] = null; dropToGround(it); } });
      const dropped = S.retreatSel.length; S.retreatSel = []; c.retreatOpen = false;
      if (rnd() < p) {
        log('棄物撤退成功' + (dropped ? '（丟下 ' + dropped + ' 格，落在地面）' : '') + '。', 'good');
        gainProf('jiao', 4);
        endCombat('retreat');
        return commit();
      }
      log('撤退失敗！敵人趁隙追擊。', 'bad');
      fx({ t: 'p_text', text: '撤退失敗', bad: true });
      c.defend = false; c.evade = 0; c.shadow = false;
      alive.forEach((e) => { if (!S.dead && S.hp > 0) enemyAct(e); });
      return endRound();
    }
    c.defend = kind === 'defend';
    c.evade = T && T.evade ? 0.6 : 0;
    c.shadow = kind === 'skill' && arg === 'yaying';
    if (c.shadow) c.retreatBonus += 0.3;
    const order = combatOrder();
    for (const o of order) {
      if (S.hp <= 0 || !S.combat) break;
      if (o.who === 'you') {
        const tgt = c.enemies[c.target].hp > 0 ? c.enemies[c.target] : c.enemies.find((e) => e.hp > 0);
        if (!tgt) continue;
        if (kind === 'attack') { strike(tgt, { mult: 1, label: '普攻' }); c.next = 1; }
        else if (kind === 'tech') useTech(T, tgt);
        else if (kind === 'skill') useSkill(arg, tgt);
        else if (kind === 'item') useItem(arg, true);
        else if (kind === 'defend') { log(hasShield() ? '你舉起盾。' : '你架起兵器防禦。'); fx({ t: 'p_text', text: '防禦' }); }
        else if (kind === 'wait') { S.fat = clamp(S.fat - 4, 0, 100); log('你調勻呼吸，疲累 −4'); fx({ t: 'p_text', text: '調息' }); }
      } else {
        const e = c.enemies[o.who];
        if (e.hp <= 0 || c.stun) continue;
        if (e.stag > 0) { e.stag--; log(e.name + '還沒站穩。'); fx({ t: 'e_text', i: e.idx, text: '失衡' }); continue; }
        enemyAct(e);
      }
    }
    endRound();
  }
  function endRound() {
    const c = S.combat;
    if (c.bleed > 0 && S.hp > 0) { S.hp -= 2; c.bleed--; log('流血 −2'); fx({ t: 'p_dot', d: 2, php: Math.max(0, S.hp) }); if (S.hp <= 0) S.stats.cause = '流血不止'; }
    if (c.poison > 0 && S.hp > 0) { S.hp -= 3; c.poison--; log('毒發 −3'); fx({ t: 'p_dot', d: 3, php: Math.max(0, S.hp) }); if (S.hp <= 0) S.stats.cause = '毒發身亡'; }
    c.enemies.forEach((e) => {
      if (e.hp <= 0) return;
      let d = 0; if (e.bleed > 0) { d += 2; e.bleed--; } if (e.poison > 0) { d += 3; e.poison--; }
      if (e.brk > 0) e.brk--;
      if (d) { e.hp -= d; fx({ t: 'e_dot', i: e.idx, d, hp: Math.max(0, e.hp) }); if (e.hp <= 0) killEnemy(e); }
    });
    if (S.skills.includes('xi') && S.hp > 0) S.hp = Math.min(maxHp(), S.hp + 2);
    Object.keys(c.cds).forEach((k) => { if (c.cds[k] > 0) c.cds[k]--; });
    if (c.stun > 0) c.stun--;
    if (checkDeath()) return commit();
    if (c.enemies.every((e) => e.hp <= 0)) { victory(); return commit(); }
    c.enemies.forEach((e) => {
      if (e.hp <= 0) return;
      // 首領半血狂怒一次
      if (D.ENEMIES[e.id].boss && !e.raged && e.hp <= e.max / 2) { e.raged = true; log(e.name + '狂怒了！', 'bad'); fx({ t: 'e_text', i: e.idx, text: '狂怒', bad: true }); }
      rollIntent(e);
    });
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
        let sk = ri(E.skin[0], E.skin[1]); const mt = ri(E.meat[0], E.meat[1]);
        if (sk && perk('bo', 25) && rnd() < 0.5) sk += 1;
        if (sk && rnd() < affixSum('skin') / 100) sk += 1;
        // 剝皮 50：有機會剝出完整獸皮（異獸必出）
        let fine = 0;
        if (sk && perk('bo', 50) && (E.rare || rnd() < 0.5)) { fine = E.rare ? sk : 1; sk -= fine; }
        if (sk) gains.push({ k: 'hide', n: sk });
        if (fine) gains.push({ k: 'hide_fine', n: fine });
        if (mt) gains.push({ k: 'meat', n: mt });
        if (E.extra) gains.push({ k: E.extra, n: 1 });
        if (perk('bo', 75) && (E.rare || rnd() < 0.15)) gains.push({ k: 'beast_core', n: 1 });
        if (sk || fine || mt || E.extra) gainProf('bo', 6, E.lv);
      }
      if (E.silver) silver += ri(E.silver[0], E.silver[1]);
    });
    c.drops.forEach((g) => gains.push(g));
    (ctx.bonus || []).forEach(([k, n]) => gains.push({ k, n }));
    if (ctx.type === 'dungeon') {
      const DG = D.DUNGEONS[ctx.node]; const last = ctx.floor === DG.floors.length - 1;
      if (last) {
        silver += ri(DG.boss.silver[0], DG.boss.silver[1]);
        const scroll = DG.boss.scroll;
        if (scroll && !S.skills.includes(D.ITEMS[scroll].skill) && countItem(scroll) === 0) gains.push({ k: scroll, n: 1 });
        gains.push(lootEq(rollRarity(DG.boss.loot)));
        if (DG.boss.extra) gains.push({ k: DG.boss.extra[0], n: DG.boss.extra[1] });
        if (DG.boss.codex) addCodex(DG.boss.codex, D.NODES[ctx.node].name);
        S.dungeon.floor = 0; S.dungeon.clearedDay = dayOf(S.t);
        questProgress('clear', ctx.node);
      } else {
        silver += ri(DG.silver[0], DG.silver[1]);
        if (rnd() < 0.6) gains.push(lootEq(rollRarity(DG.loot)));
        S.dungeon.floor = ctx.floor + 1;
      }
    }
    let title = ctx.type === 'hunt' || c.enemies.some((e) => D.ENEMIES[e.id].beast) ? '狩獵剝皮' : '戰果';
    if (ctx.type === 'rumor') {
      const r = S.rumors.find((x) => x.id === ctx.rid);
      if (r) { const rw = rumorReward(r, ctx.tier || 1); rw.gains.forEach((g) => gains.push(g)); silver += rw.silver; S.stats.rumors++; S.rumors = S.rumors.filter((x) => x.id !== r.id); addRep('crow', 1); title = '傳聞到手'; }
    }
    S.silver += silver; S.stats.maxSilver = Math.max(S.stats.maxSilver, S.silver);
    const names = [];
    let grounded = 0;
    gains.forEach((g) => { names.push(itemName(g) + (g.k === 'eq' ? '' : ' ×' + g.n)); const before = S.ground.items.length; addItem(g); if (S.ground.items.length > before) grounded++; });
    S.loot = { title, items: names, silver, grounded, ctx };
    log('戰鬥勝利' + (silver ? '，得銀 ' + silver + ' 兩' : '') + (names.length ? '；' + names.join('、') : ''), 'good');
    S.combat = null; S.retreatSel = [];
    S.scene = 'loot';
  }
  // 掉寶：良品以上未鑑定
  function lootEq(rarity) {
    const pool = Object.keys(D.BASES).filter((k) => D.BASES[k].slot !== 'bag' && k !== 'blade_rust' && k !== 'robe');
    let base = pick(pool);
    if (rarity === 'legend') base = pick(['blade_short', 'saber', 'leather', 'mail', 'amulet']);
    return newEq(base, rarity, true);
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
    const ev = tideOn() && rnd() < 0.6 ? D.EVENTS.find((e) => e.id === 'tracks') : pick(D.EVENTS);
    S.event = { id: ev.id, dest, result: null };
    S.scene = 'event';
  }
  function eventChoose(k) {
    const ev = S.event; if (!ev || ev.result) return;
    if (ev.id === 'rumor') return rumorChoose(k);
    const payFee = perk('shuo', 25) ? 8 : 15;
    const res = (t, cls) => { ev.result = t; log(t, cls); };
    switch (k) {
      case 'pick':
        if (rnd() < 0.45 + profLv('cai') * 0.01) { addItem({ k: 'herb_zx', n: 2 }); addItem({ k: 'leaf_qx', n: 1 }); gainProf('cai', 8, 15); res('採得止血草 ×2、清心葉 ×1', 'good'); }
        else { S.hp -= 6; res('腳下一滑，生命 −6', 'bad'); checkDeath('墜崖'); }
        break;
      case 'dig':
        if (rnd() < 0.4 + profLv('kuang') * 0.01) { const g = rnd() < 0.3 ? 'ore_xs' : 'ore_cu'; addItem({ k: g, n: 1 }); gainProf('kuang', 8, 20); res('搜刮到' + D.ITEMS[g].name + ' ×1', 'good'); }
        else { S.hp -= 8; res('礦口再度崩塌，生命 −8', 'bad'); checkDeath('礦坑崩塌'); }
        break;
      case 'pay':
        if (S.silver < payFee) { res('銀兩不夠，劫匪拔刀了！', 'bad'); startCombat(['bandit'], { type: 'event', node: ev.dest, then: ev.dest }); S.event = null; return commit(); }
        S.silver -= payFee; res('交出 ' + payFee + ' 兩，劫匪放行。');
        break;
      case 'talk': {
        const p = clamp(0.3 + profLv('shuo') * 0.008 + (attrVal('kou') - 10) * 0.05, 0.05, 0.95);
        gainProf('shuo', 8, 15);
        if (rnd() < p) { res('你幾句話說得劫匪心裡發毛，他啐了一口，讓開了路。', 'good'); break; }
        S.event = null; log('話不投機，劫匪拔刀了。', 'bad'); startCombat(['bandit'], { type: 'event', node: ev.dest, then: ev.dest }); return commit();
      }
      case 'fight': S.event = null; startCombat(['bandit'], { type: 'event', node: ev.dest, then: ev.dest }); return commit();
      case 'hunt': S.event = null; gainProf('zong', 5, 10); startCombat([rnd() < 0.5 ? 'boar' : 'wolf'], { type: 'event', node: ev.dest, then: ev.dest }); return commit();
      case 'drop': {
        let bi = -1, bw = -1; S.pack.forEach((it, i) => { if (it && itemWt(it) > bw) { bw = itemWt(it); bi = i; } });
        if (bi >= 0) { const nm = itemName(S.pack[bi]); S.pack[bi] = null; res('丟下' + nm + '，趁亂逃脫。'); } else res('身無長物，劫匪啐了一口放你走。');
        break;
      }
      case 'detour': passTime(1); res('繞路多走了 1 小時。'); break;
      case 'study':
        passTime(1); gainProf('jiao', 12);
        if (!S.skills.includes('jixing')) { S.skills.push('jixing'); res('參悟口訣，習得「疾行」，腳力有所長進。', 'good'); }
        else res('參悟口訣，腳力有所長進。');
        break;
      default: res('你離開了。');
    }
    commit();
  }
  function eventDone() { const d = S.event && S.event.dest; S.event = null; enterNode(d || S.loc); commit(); }

  // ================= 介面雜項 =================
  function setOverlay(o) { S.overlay = S.overlay === o ? null : o; emit(); }
  function setProfTab(t) { S.profTab = t; emit(); }
  function setJournalTab(t) { S.journalTab = t; emit(); }
  function sysCamp() {
    if (S.scene === 'wild') return camp();
    log('紮營只能在荒野採集區。', 'bad'); emit();
  }

  // ================= 更新通知 =================
  function commit() { save(); emit(); }
  function emit() { listeners.forEach((f) => f(S)); }
  function on(f) { listeners.push(f); }
  function restart(seed, origin) { wipeSave(); newGame(seed === undefined ? (Date.now() & 0xffffffff) : seed, origin); }
  function init(opts) {
    opts = opts || {};
    if (opts.fresh || !load()) newGame(opts.seed !== undefined ? opts.seed : (Date.now() & 0xffffffff), opts.origin);
    else emit();
  }

  return {
    get state() { return S; },
    init, on, restart, save, wipeSave, readRaw, SAVE_KEY,
    fmtTime, fmtClock, fmtDate, dayOf, isNight, seasonOf, ageOf, wakeTime, garrisonName, sPub, riskR,
    maxHp, carryCap, totalWt, loadBand, speedMult, armor, weaponDmg, weaponType, hitChance, dodgeChance, critChance, bagCap,
    attrVal, attrProgress, profLv, profProgress, perk,
    eqBase, eqValue, itemWt, itemName, itemGlyph, itemIcon, countItem, affixSum, reqUnmet, slotFits,
    clickPack, unequip, useItem, pickupGround, drag, identify, identifyFee, chooseOrigin,
    backToTitle, confirmName, nameErrors, fullName, identity, randomName, fallbackName, wantedPoster,
    place, bld, inBld, known, repOk, repOf, knownFactions, LORE,
    selectDest, travel, travelPreview, toMap, enterHere, route, setMapView,
    explore, exploreInfo, exploreChance, wildPoints,
    setTab, selectShop, setQty, buy, sell, sellPrice, buyPrice, buysHere, rowLocked, shopRows, townPrice, avgPrice, innRest, innSoup, innCost, townHurt, service,
    talk, streetTalk, streetClose, cheapRumor,
    questAct, questsHere, questReady, questReward, questWhere, trackedQuest, activeQuests,
    hearRumor, rumorsHere, traceRumor, investigate, tideInfo,
    craft, canCraftHere, gather, gatherFat, camp, nodeState, dungeonDelve,
    combatAction, combatActions, combatOrder, takeFx, toggleRetreat, toggleDrop, retreatChance, selWt, setTarget, playerSpeed, lootDone,
    eventChoose, eventDone, setOverlay, setProfTab, setJournalTab, sysCamp,
    _debug: { passTime, addItem, die, startCombat, newEq, gainProf, addRumor, worldTick, lootEq, addRep, addCodex, addCorrupt,
      townTick, newDay, wrnd, tradeTax, HOOKS, setNoise: (on) => { NOISE = !!on; }, rnd },
  };
})();
