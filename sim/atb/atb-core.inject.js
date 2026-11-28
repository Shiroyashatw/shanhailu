  // ================= SPEC-ATB v0.1 行動條（sim/atb 於記憶體中注入；不寫回 js/game.js） =================
  // 本段文字由 sim/atb/engine.js 讀入，取代 js/game.js 的 startCombat／combatOrder／combatAction／endRound，
  // 放在同一個 IIFE 內，所以傷害、命中、護甲、閃避、掉落、經驗全部直接呼叫原函式
  // strike／useTech／useSkill／enemyAct／useItem／killEnemy／victory／rollIntent（未改動）。
  // 參數一律由外部 __ATB_CFG 提供（sim/atb/engine.js 的 DEFAULT_CFG）。
  const ATB_EPS = 1e-9, ATB_BEAT = 10, ATB_FULL = 100;
  const ATB_RT = { fat1: null };
  function atbCfg() { return __ATB_CFG; }
  // §3.1 速度壓縮
  function atbV(raw) { const C = atbCfg(); return clamp(10 + (raw - 10) * C.K, C.MIN, C.MAX); }
  // §9.1 W 表＋§13.3 h／l 掃描倍率。缺列＝100，並記錄（AC-ATB-12）
  function atbW(id) {
    const C = atbCfg(); let W = C.W[id];
    if (W === undefined) { W = 100; C.missing[id] = (C.missing[id] || 0) + 1; }
    if (W > 100) W = 100 + (W - 100) * C.h; else if (W < 100) W = 100 - (100 - W) * C.l;
    return W;
  }
  // 敵人 W_e：預設一律 100；§13.4 允許把重擊另設（WeHeavy）
  function atbWe(k) { const C = atbCfg(); return k === 'heavy' ? C.WeHeavy : C.We; }
  function atbAlive(u) { return u.side === 'you' ? S.hp > 0 : S.combat.enemies[u.ref].hp > 0; }
  function atbSpeeds() {
    const A = S.combat.atb;
    A.units.forEach((u) => { u.v = u.side === 'you' ? atbV(playerSpeed()) : atbV(S.combat.enemies[u.ref].spd); });
  }
  // §8.3 平手：你先 → 有效速度高者先 → 編號小者先
  function atbBefore(a, b) {
    // 診斷用（不是規格）：tieRaw＝同刻時先比壓縮前速度、同速你先（＝現行 combatOrder 的排序），只給退化檢查找原因
    if (atbCfg().tieRaw) { const ra = atbRawOf(a), rb = atbRawOf(b); if (ra > rb + ATB_EPS) return true; if (ra < rb - ATB_EPS) return false; }
    if (a.side === 'you') return true; if (b.side === 'you') return false;
    if (a.v > b.v + ATB_EPS) return true; if (a.v < b.v - ATB_EPS) return false;
    return a.ref < b.ref;
  }
  function atbRawOf(u) { return u.side === 'you' ? playerSpeed() : S.combat.enemies[u.ref].spd; }
  function atbPick(units) {
    let best = null, bt = Infinity;
    units.forEach((u) => {
      const t = Math.max(0, (ATB_FULL - u.b) / u.v);
      if (best === null || t < bt - ATB_EPS || (Math.abs(t - bt) <= ATB_EPS && atbBefore(u, best))) { best = u; bt = t; }
    });
    return { u: best, t: bt };
  }
  // 抽意圖（row 12）：記錄這個 heavy 是否由蓄力產生（row 10 用）
  function atbRoll(e) { const fc = !!e.charged; rollIntent(e); e.fromCharge = fc && e.intent && e.intent.k === 'heavy'; }
  // row 11 狂怒：受傷當下觸發；目前意圖的範圍立刻 ×1.3（種類不變；以資料原值 ×1.3 取整，與 rollIntent 同算法）
  function atbRage() {
    const c = S.combat; if (!c) return;
    c.enemies.forEach((e) => {
      if (e.hp <= 0 || e.raged || !D.ENEMIES[e.id].boss || e.hp > e.max / 2) return;
      e.raged = true; log(e.name + '狂怒了！', 'bad'); fx({ t: 'e_text', i: e.idx, text: '狂怒', bad: true });
      const E = D.ENEMIES[e.id]; const it = e.intent;
      if (it && it.range) {
        if (it.k === 'heavy') { const h = E.heavy || [E.dmg[0] * 2, E.dmg[1] * 2]; it.range = [Math.round(h[0] * 1.3), Math.round(h[1] * 1.3)]; }
        else it.range = [Math.round(E.dmg[0] * 1.3), Math.round(E.dmg[1] * 1.3)];
      }
    });
  }
  function startCombat(ids, ctx, opts) {
    opts = opts || {}; const C = atbCfg();
    const enemies = ids.map((id, i) => mkEnemy(id, i));
    // §4.2：起始條在 mkEnemy 之後依編號依序抽（走戰鬥亂數流）
    const fb = enemies.map(() => (C.foeStart === 'rand' ? ri(0, C.foeStartMax) : C.foeStart));
    if (opts.hpMult) enemies.forEach((e) => (e.hp = Math.max(1, Math.round(e.hp * opts.hpMult))));
    enemies.forEach(atbRoll);
    S.combat = { enemies, round: 1, target: 0, ctx, bleed: 0, poison: 0, cds: {}, defend: false, evade: 0, next: 1, shadow: false, oil: false, retreatBonus: 0, drops: [], retreatOpen: false, stun: 0 };
    S.retreatSel = [];
    S.scene = 'combat'; S.townTab = null; S.say = null; S.street = null;
    S.stats.cause = '';
    FX = [];
    const c = S.combat;
    c.atb = { T: 0, beatT: 0, acts: 0, units: [{ side: 'you', ref: 'you', b: C.youStart, v: 10 }].concat(enemies.map((e, i) => ({ side: 'foe', ref: i, b: fb[i], v: 10 }))), log: [] };
    const A = c.atb;
    const stun = opts.stun || 0;
    // §4.3 伏擊／stun：敵人起始條 −100×stun，你 100
    if (stun) { log('你搶得先機，對方措手不及。', 'good'); A.units.forEach((u) => { if (u.side === 'foe') u.b = -100 * stun; else u.b = 100; }); }
    // 弓弩 25：開戰前免費射一箭（不耗條）
    if (weaponType() === 'gong' && perk('gong', 25)) { log('先射！'); strike(enemies[0], { mult: 1, label: '先射' }); atbRage(); }
    // §4.3 遇伏：敵人條 100、你 0；依有效速度高→低（同速依編號）各出手一次，條歸 100−W_e
    if (opts.ambush) {
      atbSpeeds();
      A.units[0].b = 0;
      const foes = A.units.filter((u) => u.side === 'foe'); foes.forEach((u) => (u.b = 100));
      foes.slice().sort((a, b) => b.v - a.v || a.ref - b.ref).forEach((u) => {
        const e = enemies[u.ref]; if (e.hp <= 0 || S.hp <= 0) return;
        const k = e.intent && e.intent.k; A.log.push({ who: e.idx, T: A.T, k }); enemyAct(e); u.b = 100 - atbWe(k);
        if (e.hp > 0) atbRoll(e);
      });
      if (checkDeath()) return;
    }
    if (enemies.every((e) => e.hp <= 0)) { victory(); return; }
    atbAdvance();
  }
  // §5.3 row 16：整拍結算（順序沿用原 endRound：你的流血→你的中毒→各敵人流血／中毒→破甲倒數→調息）
  function atbBeat() {
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
    c.atb.log.push({ who: 'beat', T: c.atb.T });
    atbRage();
    if (checkDeath()) return;
    if (c.enemies.every((e) => e.hp <= 0)) { victory(); return; }
    if (!c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = c.enemies.find((e) => e.hp > 0).idx;
  }
  // §6.1 step 6：推進到「你的條最先滿」或戰鬥結束
  function atbAdvance() {
    const c = S.combat; if (!c) return; const A = c.atb; let guard = 0;
    while (S.combat === c && !S.dead) {
      if (++guard > 200000) throw new Error('ATB advance runaway');
      atbSpeeds();
      const live = A.units.filter(atbAlive);
      const p = atbPick(live);
      const nb = (A.beatT + 1) * ATB_BEAT;
      if (nb <= A.T + p.t + ATB_EPS) { // 整拍邊界先於同刻出手
        const dt = Math.max(0, nb - A.T); live.forEach((u) => (u.b += u.v * dt)); A.T = nb; A.beatT++;
        atbBeat(); continue;
      }
      live.forEach((u) => (u.b += u.v * p.t)); A.T += p.t;
      live.forEach((u) => { if (Math.abs(u.b - ATB_FULL) < 1e-7) u.b = ATB_FULL; });
      p.u.b = ATB_FULL;
      if (p.u.side === 'you') return; // 等待輸入：所有條停住
      const e = c.enemies[p.u.ref]; const k = e.intent && e.intent.k;
      A.log.push({ who: e.idx, T: A.T, k });
      enemyAct(e);
      p.u.b = ATB_FULL - atbWe(k); e.stag = 0; e.atbStag = 0;
      if (e.hp > 0) atbRoll(e);
      atbRage();
      if (checkDeath()) return;
      if (c.enemies.every((x) => x.hp <= 0)) { victory(); return; }
      if (!c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = c.enemies.find((x) => x.hp > 0).idx;
    }
  }
  // §6.1 step 4–6：你的一手結束
  function atbEndHand(W) {
    const c = S.combat; const A = c.atb;
    A.units[0].b = ATB_FULL - W;
    Object.keys(c.cds).forEach((k) => { if (c.cds[k] > 0) c.cds[k]--; });
    A.acts++; c.round = A.acts + 1;
    atbRage();
    if (checkDeath()) return;
    if (c.enemies.every((e) => e.hp <= 0)) { victory(); return; }
    if (!c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = c.enemies.find((e) => e.hp > 0).idx;
    if (!atbCfg().noAdvance) atbAdvance(); // noAdvance 只給單元檢查用
  }
  function atbActionId(kind, arg, T) {
    if (kind === 'attack') return 'attack'; if (kind === 'tech') return T.id; if (kind === 'skill') return arg;
    if (kind === 'item') return 'item'; return kind; // defend／wait
  }
  // §6.1 一手的處理流程
  function combatAction(kind, arg) {
    const c = S.combat; if (!c || S.dead) return;
    const C = atbCfg(); const A = c.atb;
    const alive = c.enemies.filter((e) => e.hp > 0);
    if (!alive.length) return;
    if (!c.enemies[c.target] || c.enemies[c.target].hp <= 0) c.target = alive[0].idx;
    if (kind === 'do') {
      const a = combatActions().find((x) => x.id === arg); if (!a || a.disabled) return;
      kind = a.kind; arg = a.kind === 'item' ? S.pack.findIndex((x) => x && x.k === a.item) : a.id;
    }
    if (kind === 'potion') { const i = S.pack.findIndex((x) => x && x.k === 'pot_hp'); if (i < 0) { log('身上沒有金創藥水。', 'bad'); return; } arg = i; kind = 'item'; }
    let T = null;
    if (kind === 'tech') { T = techList().find((x) => x.id === arg); if (!T || profLv(T.prof) < T.lv || (c.cds[T.id] || 0) > 0) return; }
    if (kind === 'skill') { arg = arg || 'beng'; const K = D.SKILLS[arg]; if (!K || !K.active || !S.skills.includes(arg) || (c.cds[arg] || 0) > 0) return; }
    if (kind === 'item') {
      const it = S.pack[arg]; if (!it || it.k === 'eq' || D.ITEMS[it.k].type !== 'use') return;
      const u = D.ITEMS[it.k].use; if ((u.oil && c.oil) || (u.cure && !c.poison)) { useItem(arg, true); return; }
    }
    FX = [];
    const fat0 = S.fat;
    if (kind === 'retreat') {
      const dropWt = selWt();
      const p = retreatChance(dropWt);
      S.retreatSel.slice().sort((a, b) => b - a).forEach((i) => { const it = S.pack[i]; if (it) { S.pack[i] = null; dropToGround(it); } });
      const dropped = S.retreatSel.length; S.retreatSel = []; c.retreatOpen = false;
      A.log.push({ who: 'you', T: A.T, act: 'retreat' });
      if (rnd() < p) {
        log('棄物撤退成功' + (dropped ? '（丟下 ' + dropped + ' 格，落在地面）' : '') + '。', 'good');
        gainProf('jiao', 4);
        endCombat('retreat');
        return;
      }
      log('撤退失敗！', 'bad');
      fx({ t: 'p_text', text: '撤退失敗', bad: true });
      c.defend = false; c.evade = 0; c.shadow = false;
      A.units.forEach((u) => { if (u.side === 'foe') u.b += C.retreatFoeBonus; });
      ATB_RT.fat1 = S.fat;
      return atbEndHand(C.retreatW);
    }
    // step 2：清除上一手的 defend／evade／shadow，再依本次行動設定
    c.defend = kind === 'defend';
    c.evade = T && T.evade ? 0.6 : 0;
    c.shadow = kind === 'skill' && arg === 'yaying';
    if (c.shadow) c.retreatBonus += 0.3;
    const wid = atbActionId(kind, arg, T);
    // 失衡／打斷偵測：先把狀態旗標存起來，出手後看誰被設了 stag
    const pre = c.enemies.map((e) => ({ st: e.atbStag || 0, k: e.intent && e.intent.k, fc: !!e.fromCharge, hp: e.hp }));
    c.enemies.forEach((e) => (e.stag = 0));
    A.log.push({ who: 'you', T: A.T, act: wid });
    // step 3：出手效果（公式沿用原函式）
    const tgt = c.enemies[c.target].hp > 0 ? c.enemies[c.target] : c.enemies.find((e) => e.hp > 0);
    if (kind === 'attack') { strike(tgt, { mult: 1, label: '普攻' }); c.next = 1; }
    else if (kind === 'tech') useTech(T, tgt);
    else if (kind === 'skill') useSkill(arg, tgt);
    else if (kind === 'item') useItem(arg, true);
    else if (kind === 'defend') { log(hasShield() ? '你舉起盾。' : '你架起兵器防禦。'); fx({ t: 'p_text', text: '防禦' }); }
    else if (kind === 'wait') { S.fat = clamp(S.fat - 4, 0, 100); log('你調勻呼吸，疲累 −4'); fx({ t: 'p_text', text: '調息' }); }
    // K2 前線疲累 ×1.25（決策器原本在 combatAction 之後套用；ATB 下推進會用到速度，所以移到推進之前）
    if (C.fatMult && S.fat > fat0) S.fat = Math.min(100, fat0 + (S.fat - fat0) * C.fatMult);
    ATB_RT.fat1 = S.fat;
    // row 9／10：失衡與打斷改成條的位置
    const interrupter = wid === 't_grapple' || wid === 't_bash' || wid === 'pozhen';
    c.enemies.forEach((e, i) => {
      if (e.hp <= 0) return;
      const charging = pre[i].k === 'charge' || (pre[i].k === 'heavy' && pre[i].fc);
      // row 10 字面：由蓄力產生的 heavy 也算可打斷（原 useTech／useSkill 只認 charged／charge；盾擊必中、破陣不看命中，照原函式條件延伸）
      const extra = (wid === 't_bash' && e === tgt) || wid === 'pozhen';
      const hit = e.stag > 0 || (extra && pre[i].k === 'heavy' && pre[i].fc);
      const u = A.units[i + 1];
      if (hit) {
        if (interrupter && charging) { e.charged = false; atbRoll(e); }
        else e.charged = false;
        u.b = Math.min(u.b, C.stagB); e.atbStag = 1;
      }
      e.stag = e.atbStag ? 1 : 0;
    });
    // step 4：條 = 100 − W；長兵 25 先制＝第 1 手 W −25（最低 50）
    let W = atbW(wid);
    if (A.acts === 0 && weaponType() === 'qiang' && perk('qiang', 25)) W = Math.max(50, W - 25);
    atbEndHand(W);
  }
  // 舊 endRound 已由 atbBeat（整拍）＋atbEndHand（每手）取代；保留同名函式供其他呼叫點（無）
  function endRound() { throw new Error('endRound 不應在 ATB 模式被呼叫'); }
  // §8.1 推演：接下來 n 次出手；youW＝你這一手的假設 W（預設普攻 100）
  function atbStrip(youW, n) {
    const c = S.combat; if (!c) return [];
    const A = c.atb; atbSpeeds();
    const st = A.units.filter(atbAlive).map((u) => ({ side: u.side, ref: u.ref, b: u.b, v: u.v }));
    const seen = {}; let t = 0, yours = 0; const out = [];
    while (out.length < (n || 8)) {
      const p = atbPick(st);
      st.forEach((u) => (u.b += u.v * p.t)); t += p.t; p.u.b = ATB_FULL;
      const who = p.u.side === 'you' ? 'you' : p.u.ref;
      let intent = null, W;
      if (p.u.side === 'you') { yours++; W = yours === 1 && youW !== undefined ? youW : 100; }
      else {
        const e = c.enemies[p.u.ref];
        if (!seen[who]) { seen[who] = 1; intent = e.intent ? { k: e.intent.k, range: e.intent.range ? e.intent.range.slice() : null } : null; W = atbWe(intent && intent.k); }
        else W = atbCfg().We;
      }
      out.push({ who, spd: Math.round(p.u.v * 100) / 100, t: Math.round(t * 1e6) / 1e6, b: Math.round(p.u.b * 1e6) / 1e6, intent });
      p.u.b = ATB_FULL - W;
    }
    return out;
  }
  function atbPeekW(id) {
    let W = atbW(id); const c = S.combat;
    if (c && c.atb.acts === 0 && weaponType() === 'qiang' && perk('qiang', 25)) W = Math.max(50, W - 25);
    return W;
  }
  function combatOrder() { return atbStrip(100, 8); }
  // §12 決策器介面（唯讀快照）
  function combatView() {
    const c = S.combat; if (!c) return null; const A = c.atb; atbSpeeds();
    const snap = JSON.parse(JSON.stringify({
      you: { hp: S.hp, max: maxHp(), fat: S.fat, b: A.units[0].b, v: A.units[0].v, cds: c.cds, speedMult: speedMult() },
      foes: c.enemies.filter((e) => e.hp > 0).map((e) => ({ idx: e.idx, hp: e.hp, max: e.max, b: A.units[e.idx + 1].b, v: A.units[e.idx + 1].v, intent: e.intent ? { k: e.intent.k, range: e.intent.range } : null, charged: e.charged, guard: e.guard, stag: e.stag, bleed: e.bleed, poison: e.poison, brk: e.brk, raged: e.raged })),
      order: atbStrip(100, 8), acts: combatActions(), T: A.T, round: c.round,
    }));
    snap.peek = (id) => atbStrip(id === 'retreat' ? atbCfg().retreatW : atbPeekW(String(id).startsWith('item:') ? 'item' : id), 8);
    return Object.freeze(snap);
  }
  function combatDecide(decider, opts) {
    opts = opts || {}; const max = opts.maxActs || 200; let n = 0;
    while (S.combat && !S.dead && n < max) {
      const d = decider(combatView()); n++;
      if (d.target !== undefined) setTarget(d.target);
      combatAction(d.kind, d.arg);
    }
    return { acts: n, ended: !S.combat, dead: !!S.dead };
  }
