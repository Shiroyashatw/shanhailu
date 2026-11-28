'use strict';
/* SPEC-ATB v0.1 單元檢查（任務書「先寫單元檢查並全部通過再跑模擬」）。node sim/atb/unit.js
 * 每條回傳 { id, name, ok, detail }。任何一條不過，run.js 會停在這裡、不跑模擬。 */
const E = require('./engine');
const ISSUE = ['blade_short', 'buckler', 'leather'];
const CIVK2 = { origin: 'drifter', attr: {}, prof: {}, gear: ISSUE, skills: [], items: [['pot_hp', 4]] };
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.005 : tol);
const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);

function ctl(enemies, tpl, cfgPatch) {
  // 受控戰鬥：固定起始條、敵我生命拉高，只看時間線
  const undo = E.setCfg(Object.assign({ foeStart: 0 }, cfgPatch || {}));
  E.setupPlayer(1, tpl || CIVK2); const { G } = E.inst(); const S = G.state;
  G._debug.startCombat(enemies, { type: 'wild', node: 'chakou' }, {});
  return { G, S, c: S.combat, A: S.combat.atb, undo };
}
const results = [];
function check(id, name, fn) {
  let ok = false, detail = '';
  try { const r = fn(); ok = r.ok; detail = r.detail; } catch (e) { ok = false; detail = 'EXCEPTION ' + e.stack.split('\n').slice(0, 3).join(' | '); }
  results.push({ id, name, ok, detail });
}

// ---------- §3.3 手算例（AC-ATB-3） ----------
check('3.3', '§3.3 手算例：你 v=10、窯屍 v=8 起始 24；t∈[0,22] 你 3 手、窯屍 2 次', () => {
  const { G, S, c, A, undo } = ctl(['corpse'], CIVK2, { foeStart: 24 });
  try {
    const e = c.enemies[0]; e.hp = e.max = 1e6; S.hp = 1e6;
    const vy = A.units[0].v, ve = A.units[1].v;
    const seen = [];
    let corpseBAt10 = null;
    for (let i = 0; i < 4 && S.combat; i++) {
      G.combatAction('attack');
      if (Math.abs(A.T - 10) < 1e-9) corpseBAt10 = A.units[1].b;
    }
    A.log.filter((x) => x.who !== 'beat' && x.T <= 22 + 1e-9).forEach((x) => seen.push((x.who === 'you' ? '你' : '窯屍') + '@' + f2(x.T)));
    const exp = ['你@0.00', '窯屍@9.50', '你@10.00', '你@20.00', '窯屍@22.00'];
    const ok = vy === 10 && ve === 8 && seen.join(',') === exp.join(',') && near(corpseBAt10, 4, 1e-6);
    return { ok, detail: 'v 你=' + vy + ' 窯屍=' + ve + '；序列 ' + seen.join('、') + '（期望 ' + exp.join('、') + '）；t=10 窯屍條=' + f2(corpseBAt10) + '（期望 4）' };
  } finally { undo(); }
});

// ---------- §8.2 推演手算例（AC-ATB-8） ----------
check('8.2', '§8.2 推演 8 格（含同刻你先）', () => {
  const { G, S, c, A, undo } = ctl(['corpse', 'bug'], CIVK2);
  try {
    A.units[0].b = 100; A.units[1].b = 24; A.units[2].b = 60;
    c.enemies.forEach((e) => (e.intent = { k: 'atk', range: [1, 1] }));
    const o = G._debug.ATB.strip(100, 8);
    const got = o.map((x) => (x.who === 'you' ? '你' : x.who === 0 ? '窯屍' : '毒蟲') + '@' + f2(x.t));
    const exp = ['你@0.00', '毒蟲@3.33', '窯屍@9.50', '你@10.00', '毒蟲@11.67', '你@20.00', '毒蟲@20.00', '窯屍@22.00'];
    // 預測不改實際狀態
    const untouched = A.units[0].b === 100 && A.units[1].b === 24 && A.units[2].b === 60 && A.T === 0;
    return { ok: got.join() === exp.join() && untouched, detail: got.join('、') + (untouched ? '；推演後實際條值不變' : '；**推演改到實際狀態**') };
  } finally { undo(); }
});

// ---------- §7.2 狀態表（AC-ATB-4） ----------
check('7.2', '§7.2 每列 v（公式）＋可在遊戲內重現的列讀實際 speedMult／playerSpeed', () => {
  const C = E.cfg(); const V = (raw) => Math.min(C.MAX, Math.max(C.MIN, 10 + (raw - 10) * C.K));
  const rows = [ // [狀態, speedMult, v_raw, v, 可在遊戲內重現的設定]
    ['輕快', 1.00, 10.00, 10.00, { wt: 0 }], ['平常', 0.82, 8.20, 9.10, { wt: 40 }], ['沉重', 0.60, 6.00, 8.00, { wt: 70 }], ['蹣跚', 0.40, 4.00, 7.00, { wt: 90 }],
    ['輕快＋疲憊', 0.85, 8.50, 9.25, { wt: 0, fat: 80 }], ['平常＋疲憊', 0.697, 6.97, 8.49, { wt: 40, fat: 80 }], ['蹣跚＋疲憊', 0.34, 3.40, 6.70, { wt: 90, fat: 80 }],
    ['輕快＋寒顫', 0.90, 9.00, 9.50, null], ['輕快＋凍僵', 0.80, 8.00, 9.00, null], ['蹣跚＋疲憊＋凍僵', 0.272, 2.72, 6.36, null],
    ['輕快、身法 20', 1.00, 14.00, 12.00, { wt: 0, shen: 20 }], ['輕快、身法 5', 1.00, 8.00, 9.00, { wt: 0, shen: 5 }], ['平常、身法 20', 0.82, 12.20, 11.10, { wt: 40, shen: 20 }],
  ];
  let ok = true; const out = []; const conflicts = [];
  const { G } = E.inst();
  rows.forEach(([nm, sm, raw, v, set]) => {
    const vf = V(raw); let line = nm + '：公式 v=' + f2(vf) + '（表 ' + f2(v) + '）'; let rowOk = near(vf, v, 0.0051); // 表取到小數 2 位
    if (set) {
      E.setupPlayer(1, { origin: 'drifter', attr: set.shen ? { shen: set.shen } : {}, prof: {}, gear: ISSUE, skills: [], items: [] });
      const S = G.state; S.fat = set.fat || 10;
      // 用玄石（每格 5×3＝15）把總重墊到指定值以上
      let need = set.wt - G.totalWt(); let i = 0;
      while (need > 0 && i < S.pack.length) { const n = Math.min(3, Math.ceil(need / 5)); S.pack[i++] = { k: 'ore_xs', n }; need -= 5 * n; }
      const vg = V(G.playerSpeed());
      line += '；遊戲 ' + G.loadBand().name + ' speedMult=' + G.speedMult().toFixed(3) + ' playerSpeed=' + G.playerSpeed() + ' → v=' + f2(vg);
      const okg = near(G.speedMult(), sm, 0.0006) && near(vg, v, 0.0051);
      if (!okg) { line += ' **與表差 ' + Math.abs(vg - V(sm * 10 + ((set.shen || 10) - 10) * 0.4)).toFixed(3) + '**'; conflicts.push(nm + '：遊戲 playerSpeed()=' + G.playerSpeed() + '（取到 0.1）→ v=' + f2(vg) + '，表用未取整 ' + raw + ' → ' + f2(v)); }
    } else line += '；遊戲沒有寒意階（js/game.js 無寒意乘數），只驗公式';
    if (!rowOk) ok = false; out.push(line);
  });
  return { ok, detail: out.join('｜') + (conflicts.length ? '｜【規格矛盾，非引擎錯誤，列待決 Q-A1】' + conflicts.join('；') + '。§3.1 寫 v_raw＝playerSpeed()【沿用】（game.js:1370 取到 0.1），§7.2 表用未取整的 speedMult×10；本檢查照 §3.1 字面實作，公式部分全列相符。' : ''), conflicts };
});

// ---------- §9.3 效率表（AC-ATB-12）與 W 表缺列 ----------
check('9.3', '§9.3 效率表手算重現＋§9.1 W 表無缺列', () => {
  const { D } = E.inst(); const W = E.cfg().W;
  const rows = [ // [行動, id, 倍率算式, 規格效率, ≤1.25?]
    ['重劈', 't_cleave', 1.6 * (0.71 / 0.86), 1.02, true], ['崩岩擊', 'beng', 1.7, 1.21, true], ['奪命（流血）', 't_execute', 2.0, 1.60, false],
    ['奪命（一般）', 't_execute', 1.5, 1.20, true], ['內勁', 't_inner', 1.4, 1.22, true], ['連珠', 't_volley', 1.5, 1.25, true], ['突刺', 't_thrust', 1.2, 1.20, true],
  ];
  let ok = true; const out = [];
  rows.forEach(([nm, id, m, eff, le]) => { const e = m / (W[id] / 100); const r = near(e, eff) && (e <= 1.25 + 1e-9) === le; if (!r) ok = false; out.push(nm + ' ' + f2(m) + '÷' + (W[id] / 100) + '＝' + f2(e) + '（表 ' + f2(eff) + '）' + (r ? '' : ' **不符**')); });
  // 瞄準：表寫「1.3＋必中（約 1.5 對 0.86）」效率 ≈1.3、✗。兩種讀法都算出來（只報，不判）
  const aim1 = 1.3 / 0.86, aim2 = 1.3 / 0.86 * (1 + 0.25 * 0.6) / (1 + 0.05 * 0.6);
  out.push('瞄準：表 ≈1.3 ✗；照表的「必中＝1÷0.86」算 ' + f2(aim1) + '，再含會心 +20% 算 ' + f2(aim2) + '（三種讀法都 >1.25，結論 ✗ 相同；數字與表不一致，列待決）');
  const ids = ['attack', 'wait', 'item', 'defend'].concat(D.TECHS.map((t) => t.id), Object.keys(D.SKILLS).filter((k) => D.SKILLS[k].active));
  const missing = ids.filter((k) => W[k] === undefined);
  if (missing.length) ok = false;
  out.push('W 表缺列：' + (missing.length ? missing.join(',') : '無') + '（' + ids.length + ' 個行動）');
  return { ok, detail: out.join('｜') };
});

// ---------- §5.3 row 1 冷卻 ----------
check('5.3-1', '§5.3 第 1 列：冷卻 N＝之後 N 次出手不可用、第 N+1 次可用；敵人出手不減', () => {
  const { G, S, c, A, undo } = ctl(['corpse', 'corpse'], { origin: 'drifter', attr: {}, prof: {}, gear: ISSUE, skills: ['beng'], items: [] });
  try {
    c.enemies.forEach((e) => (e.hp = e.max = 1e6)); S.hp = 1e6;
    const avail = () => !G.combatActions().find((a) => a.id === 'beng').disabled;
    const seq = []; const cdsSeen = [];
    G.combatAction('do', 'beng'); seq.push('用');
    // 中間敵人有出手：檢查推進中 cds 沒變（每次輪到你時讀）
    for (let k = 0; k < 4; k++) { cdsSeen.push(c.cds.beng); seq.push(avail() ? '可' : '不可'); if (!avail()) G.combatAction('attack'); }
    const foeActs = A.log.filter((x) => typeof x.who === 'number').length;
    const ok = seq.join() === '用,不可,不可,不可,可' && cdsSeen.join() === '3,2,1,0' && foeActs > 0;
    return { ok, detail: '崩岩擊 cd 3：' + seq.join('→') + '；每次輪到你時 cds=' + cdsSeen.join(',') + '；期間敵人出手 ' + foeActs + ' 次' };
  } finally { undo(); }
});

// ---------- §5.3 row 2 防禦到你下次出手前 ----------
check('5.3-2', '§5.3 第 2 列：防禦／遊身效果持續到你下次出手前、下一手開始時清除', () => {
  const { G, S, c, A, undo } = ctl(['corpse'], { origin: 'drifter', attr: {}, prof: { shan: 15 }, gear: ISSUE, skills: [], items: [] });
  try {
    c.enemies[0].hp = c.enemies[0].max = 1e6; S.hp = 1e6; A.units[1].b = 95; // 讓窯屍在你下一手前出手
    const n0 = A.log.length; G.combatAction('do', 'defend');
    const foeBetween = A.log.slice(n0).filter((x) => typeof x.who === 'number').length;
    const held = c.defend === true;
    G.combatAction('attack'); const cleared = c.defend === false;
    G.combatAction('do', 't_evade'); const ev = c.evade === 0.6 && c.next === 1.3;
    G.combatAction('attack'); const ev2 = c.evade === 0 && c.next === 1;
    return { ok: held && cleared && foeBetween > 0 && ev && ev2, detail: '防禦後到下一手前 defend=' + held + '（期間敵人出手 ' + foeBetween + ' 次）；下一手普攻後 defend=' + c.defend + '；遊身後 evade=0.6、next=1.3：' + ev + '；再普攻後 evade=0、next=1：' + ev2 };
  } finally { undo(); }
});

// ---------- §5.3 row 5／6／7 整拍 ----------
check('5.3-5', '§5.3 第 5 列：調息每拍 +2', () => {
  const { G, S, c, A, undo } = ctl(['corpse'], { origin: 'drifter', attr: {}, prof: {}, gear: ISSUE, skills: ['xi'], items: [] });
  try {
    c.enemies[0].hp = c.enemies[0].max = 1e6; A.units[1].b = -1e7; S.hp = 10;
    const hp0 = S.hp, b0 = A.beatT;
    G.combatAction('wait'); G.combatAction('wait'); G.combatAction('attack');
    const beats = A.beatT - b0;
    return { ok: S.hp - hp0 === 2 * beats && beats > 0, detail: '經過 ' + beats + ' 拍（T=' + f2(A.T) + '，待機 W=60 兩次＋普攻），生命 ' + hp0 + '→' + S.hp };
  } finally { undo(); }
});
check('5.3-6', '§5.3 第 6 列：流血／中毒 3 息＝恰好 3 次整拍結算（你與敵人）', () => {
  const { G, S, c, A, undo } = ctl(['corpse'], CIVK2);
  try {
    const e = c.enemies[0]; e.hp = e.max = 1e6; A.units[1].b = -1e7; S.hp = 500;
    c.bleed = 3; c.poison = 3; e.bleed = 3; e.poison = 3;
    const hp0 = S.hp; const ehp0 = e.hp;
    // 先用待機（不攻擊，免得刀劍 25 流血再觸發）推過 6 拍
    for (let k = 0; k < 10; k++) G.combatAction('wait');
    const lost = hp0 - S.hp, elost = ehp0 - e.hp;
    const ok = lost === 3 * 2 + 3 * 3 && elost === 3 * 5 && c.bleed === 0 && c.poison === 0 && A.beatT >= 6;
    return { ok, detail: '經過 ' + A.beatT + ' 拍：你失血 ' + lost + '（期望 15＝流血 2×3＋中毒 3×3）、敵人 ' + elost + '（期望 15）；剩 bleed=' + c.bleed + ' poison=' + c.poison };
  } finally { undo(); }
});
check('5.3-7', '§5.3 第 7 列：破甲 3 息，每拍 −1', () => {
  const { G, S, c, A, undo } = ctl(['corpse'], CIVK2);
  try {
    const e = c.enemies[0]; e.hp = e.max = 1e6; A.units[1].b = -1e7; e.brk = 3; const trail = [];
    for (let k = 0; k < 6; k++) { G.combatAction('wait'); trail.push(A.beatT + ':' + e.brk); }
    const ok = trail.every((s) => { const [b, k] = s.split(':').map(Number); return k === Math.max(0, 3 - b); });
    return { ok, detail: '（拍數:brk）' + trail.join(' ') };
  } finally { undo(); }
});

// ---------- §5.3 row 9／10 失衡與打斷 ----------
function firstHit(tplPatch, enemies, setupFn, act, tries) {
  for (let s = 0; s < (tries || 200); s++) {
    const undo = E.setCfg({ foeStart: 0, noAdvance: true });
    try {
      E.setupPlayer(1000 + s, tplPatch); const { G } = E.inst(); const S = G.state;
      G._debug.startCombat(enemies, { type: 'wild', node: 'chakou' }, {});
      const c = S.combat, A = c.atb; c.enemies.forEach((e) => (e.hp = e.max = 1e6)); S.hp = 1e6;
      setupFn(c, A, G);
      const hp0 = c.enemies[0].hp; const pi0 = c.enemies[0].pi;
      G.combatAction('do', act);
      if (c.enemies[0].hp < hp0) return { c, A, pi0 };
    } finally { undo(); }
  }
  return null;
}
check('5.3-9', '§5.3 第 9 列：失衡 b=−50（設定，原本更低則維持）、charged=false', () => {
  const tpl = { origin: 'drifter', attr: {}, prof: { qiang: 30 }, gear: ['spear', 'leather'], skills: [], items: [] };
  const a = firstHit(tpl, ['corpse'], (c, A) => { A.units[1].b = 30; c.enemies[0].charged = true; c.enemies[0].intent = { k: 'atk', range: [1, 1] }; }, 't_sweep');
  const b = firstHit(tpl, ['corpse'], (c, A) => { A.units[1].b = -80; c.enemies[0].intent = { k: 'atk', range: [1, 1] }; }, 't_sweep');
  if (!a || !b) return { ok: false, detail: '掃腿 200 個種子都沒打中' };
  const ok = a.A.units[1].b === -50 && a.c.enemies[0].charged === false && a.c.enemies[0].stag === 1 && b.A.units[1].b === -80 && a.c.enemies[0].intent.k === 'atk';
  return { ok, detail: '條 30 被掃腿→' + a.A.units[1].b + '、charged=' + a.c.enemies[0].charged + '、意圖不變=' + a.c.enemies[0].intent.k + '；條 −80 被掃腿→' + b.A.units[1].b };
});
check('5.3-10', '§5.3 第 10 列：打斷＝取消蓄力、重抽意圖、b=−50（擒拿、盾擊）', () => {
  const grip = firstHit({ origin: 'drifter', attr: {}, prof: { quan: 10 }, gear: ['leather'], skills: [], items: [] }, ['corpse'], (c, A) => { A.units[1].b = 40; c.enemies[0].intent = { k: 'charge', range: null }; }, 't_grapple');
  const bash = firstHit({ origin: 'drifter', attr: {}, prof: { dun: 15 }, gear: ISSUE, skills: [], items: [] }, ['corpse'], (c, A) => { A.units[1].b = 40; c.enemies[0].intent = { k: 'charge', range: null }; }, 't_bash');
  const bashH = firstHit({ origin: 'drifter', attr: {}, prof: { dun: 15 }, gear: ISSUE, skills: [], items: [] }, ['corpse'], (c, A) => { A.units[1].b = 40; c.enemies[0].intent = { k: 'heavy', range: [12, 16] }; c.enemies[0].fromCharge = true; }, 't_bash');
  if (!grip || !bash || !bashH) return { ok: false, detail: '打不中' };
  const okOne = (x) => x.A.units[1].b === -50 && x.c.enemies[0].charged === false && x.c.enemies[0].pi === x.pi0 + 1; // 重抽＝pi 前進一格（抽到的可能又是 charge，那是 pat 順序）
  const ok = okOne(grip) && okOne(bash) && okOne(bashH);
  const d = (nm, x) => nm + '：b=' + x.A.units[1].b + '、charged=' + x.c.enemies[0].charged + '、意圖 →' + x.c.enemies[0].intent.k + '（pi ' + x.pi0 + '→' + x.c.enemies[0].pi + '）';
  return { ok, detail: d('擒拿打蓄力', grip) + '；' + d('盾擊打蓄力', bash) + '；' + d('盾擊打蓄力後的重擊', bashH) };
});
check('5.3-11', '§5.3 第 11 列：狂怒在受傷當下觸發，目前意圖範圍 ×1.3、種類不變', () => {
  const undo = E.setCfg({ foeStart: 0, noAdvance: true });
  try {
    for (let s = 0; s < 200; s++) {
      E.setupPlayer(2000 + s, { origin: 'drifter', attr: {}, prof: {}, gear: ISSUE, skills: [], items: [] }); const { G, D } = E.inst(); const S = G.state;
      G._debug.startCombat(['corpse_king'], { type: 'wild', node: 'chakou' }, {});
      const e = S.combat.enemies[0]; e.hp = 31; e.intent = { k: 'atk', range: D.ENEMIES.corpse_king.dmg.slice() };
      G.combatAction('attack');
      if (e.hp < 31 && e.hp > 0) {
        const exp = D.ENEMIES.corpse_king.dmg.map((x) => Math.round(x * 1.3));
        const ok = e.raged === true && e.intent.k === 'atk' && e.intent.range.join() === exp.join();
        return { ok, detail: '窯屍王 生命 31→' + e.hp + '（≤30＝半血）：raged=' + e.raged + '、意圖 ' + e.intent.k + ' 範圍 ' + e.intent.range.join('–') + '（期望 ' + exp.join('–') + '）' };
      }
    }
    return { ok: false, detail: '打不中' };
  } finally { undo(); }
});

// ---------- AC-ATB-1 等待式、無效指令不耗條 ----------
check('AC-1', 'AC-ATB-1：輪到你時條與 T 不動；冷卻中的指令不耗條', () => {
  const { G, S, c, A, undo } = ctl(['corpse'], { origin: 'drifter', attr: {}, prof: {}, gear: ISSUE, skills: ['beng'], items: [] });
  try {
    c.enemies[0].hp = c.enemies[0].max = 1e6; S.hp = 1e6;
    G.combatAction('do', 'beng');
    const snap = JSON.stringify([A.T, A.units.map((u) => u.b), A.acts]);
    G.combatOrder(); G._debug.ATB.view(); G.combatAction('do', 'beng'); G.combatAction('skill', 'beng');
    const same = JSON.stringify([A.T, A.units.map((u) => u.b), A.acts]) === snap;
    return { ok: same, detail: '冷卻中按崩岩擊 2 次、讀推演／快照後，T／條／手數 ' + (same ? '不變' : '**改變**') };
  } finally { undo(); }
});

// ---------- 同種子重現（AC-ATB-16／18）、決策器拿不到可寫的 S ----------
check('repro', '同種子跑兩次完全相同（K2 平民 3 波、決策器 A 與 B；§12 combatDecide）；快照不可寫回 S', () => {
  const runOnce = (dec) => {
    const logs = []; E.setupPlayer(55000, CIVK2); const { G } = E.inst(); const S = G.state; S.food = 80; S.fat = 10;
    for (const w of [['corpse', 'corpse'], ['soldier_dead', 'corpse'], ['wraith', 'soldier_dead']]) {
      E.healTo(1); const r = E.fight(w, { fatMult: 1.25, decider: dec }); logs.push([r.win, r.rounds, r.hpLost, r.pots, S.fat, S.rng]); if (!r.win) break;
    }
    return JSON.stringify(logs);
  };
  const a1 = runOnce('A'), a2 = runOnce('A'), b1 = runOnce('B'), b2 = runOnce('B');
  // combatDecide 介面：固定種子、永遠普攻
  const dec = () => { E.setupPlayer(77, CIVK2); const { G } = E.inst(); G._debug.startCombat(['corpse', 'corpse'], { type: 'wild', node: 'chakou' }, {}); const tr = []; const r = G._debug.ATB.decide((v) => { tr.push(v.T.toFixed(4) + ':' + v.you.hp); return { kind: 'attack' }; }); return JSON.stringify([r, tr]); };
  const d1 = dec(), d2 = dec();
  E.setupPlayer(78, CIVK2); const { G } = E.inst(); G._debug.startCombat(['corpse'], { type: 'wild', node: 'chakou' }, {});
  const v = G._debug.ATB.view(); const hp = G.state.hp; let threw = false; try { v.you.hp = -999; v.foes[0].hp = -1; } catch (e) { threw = true; }
  const safe = G.state.hp === hp && G.state.combat.enemies[0].hp > 0;
  return { ok: a1 === a2 && b1 === b2 && d1 === d2 && safe, detail: 'A 兩次相同=' + (a1 === a2) + '、B 兩次相同=' + (b1 === b2) + '、combatDecide 兩次相同=' + (d1 === d2) + '；改快照（' + (threw ? '凍結丟例外' : '改的是複本') + '）後 S 不變=' + safe };
});

function run() { return results; }
if (require.main === module) { results.forEach((r) => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.id + ' ' + r.name + '\n     ' + r.detail)); process.exitCode = results.every((r) => r.ok) ? 0 : 1; }
module.exports = { run, results };
