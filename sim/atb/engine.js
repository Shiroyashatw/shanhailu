'use strict';
/* SPEC-ATB v0.1 行動條引擎（num-shl-atb-sim）。
 * 做法：以 Node vm 讀入 js/data.js 與 js/game.js 的「文字」，在記憶體中把 game.js IIFE 內的
 *   startCombat／combatOrder／combatAction／endRound 四個函式整段換成 sim/atb/atb-core.inject.js 的 ATB 版本，
 *   並在 _debug 加一個 ATB 物件把推演、快照、決策器介面暴露出來。js/ 下任何檔案都不寫回。
 * 傷害、命中、護甲、閃避、掉落、經驗：注入段直接呼叫同一個 IIFE 內未改動的 strike／useTech／useSkill／enemyAct／useItem／victory。
 * 被換掉的四個函式原文的 sha256 記在 ORIG_SHA，載入時比對（game.js 改了就會報錯停下）。
 * 現行回合制對照：直接用既有 sim/lib/game.js（未改動的另一個 vm 實例）。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { ROOT } = require('../lib/util');

const REPLACED = ['startCombat', 'combatOrder', 'combatAction', 'endRound'];
// 找出 `  function NAME(` 起、到對應右大括號止的整段（略過字串與註解內的括號）
function fnRange(src, name) {
  const sig = '\n  function ' + name + '(';
  const i = src.indexOf(sig); if (i < 0) throw new Error('找不到 function ' + name);
  if (src.indexOf(sig, i + 1) >= 0) throw new Error('function ' + name + ' 出現不只一次');
  let j = src.indexOf('{', i); let depth = 0; let q = null;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return [i + 1, j + 1]; }
  }
  throw new Error('function ' + name + ' 括號不平衡');
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
function patchedSource() {
  let src = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
  const orig = {};
  REPLACED.forEach((n) => { const [a, b] = fnRange(src, n); orig[n] = { text: src.slice(a, b), sha: sha(src.slice(a, b)) }; });
  // 依位置由後往前刪，最後把注入段放在原 startCombat 的位置
  const ranges = REPLACED.map((n) => [n].concat(fnRange(src, n))).sort((x, y) => y[1] - x[1]);
  let insertAt = null;
  ranges.forEach(([n, a, b]) => { src = src.slice(0, a) + (n === 'startCombat' ? '/*@@ATB@@*/' : '/* ' + n + '：由 ATB 注入段取代 */') + src.slice(b); });
  insertAt = src.indexOf('/*@@ATB@@*/');
  const inject = fs.readFileSync(path.join(__dirname, 'atb-core.inject.js'), 'utf8');
  src = src.slice(0, insertAt) + inject + src.slice(insertAt + '/*@@ATB@@*/'.length);
  const hook = '_debug: { passTime,';
  if (src.split(hook).length !== 2) throw new Error('找不到 _debug 掛點');
  src = src.replace(hook, '_debug: { ATB: { strip: atbStrip, view: combatView, decide: combatDecide, rt: ATB_RT, speeds: atbSpeeds, V: atbV, W: atbW, We: atbWe, peekW: atbPeekW, advance: atbAdvance, beat: atbBeat, strike, useTech, enemyAct, rollIntent: atbRoll, rage: atbRage, killEnemy }, passTime,');
  return { src, orig };
}

/* SPEC-ATB 預設參數（§3.1、§4.2、§6.2、§9.1、§5.3 row 9） */
function defaultCfg() {
  return {
    K: 0.5, MIN: 6, MAX: 16,
    W: { attack: 100, wait: 60, item: 70, defend: 80, t_evade: 70, yaying: 70, t_grapple: 80, t_bash: 90,
      t_thrust: 100, t_slash: 100, t_sweep: 100, t_aim: 100, t_quake: 115, t_inner: 115, pozhen: 120, t_volley: 120,
      t_execute: 125, t_cleave: 130, beng: 140 },
    h: 1, l: 1, retreatW: 120, retreatFoeBonus: 0, stagB: -50,
    youStart: 100, foeStart: 'rand', foeStartMax: 40, We: 100, WeHeavy: 100,
    fatMult: 0, missing: {}, tieRaw: false, noAdvance: false,
  };
}
let _inst = null;
function load() {
  const { src, orig } = patchedSource();
  const cfg = defaultCfg();
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, console, Date, Math, JSON, __ATB_CFG: cfg };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), ctx, { filename: 'js/data.js' });
  vm.runInContext(src, ctx, { filename: 'js/game.js(ATB patched)' });
  return { D: ctx.window.SHL_DATA, G: ctx.window.SHL, ctx, orig };
}
function inst() { return _inst || (_inst = load()); }
function cfg() { return inst().ctx.__ATB_CFG; }
// 以 patch 物件覆寫參數；回傳還原函式
function setCfg(patch) {
  const C = cfg(); const save = JSON.parse(JSON.stringify(C));
  Object.keys(patch || {}).forEach((k) => { if (k === 'W') Object.assign(C.W, patch.W); else C[k] = patch[k]; });
  return () => { Object.keys(C).forEach((k) => delete C[k]); Object.assign(C, save); };
}
function withCfg(patch, f) { const undo = setCfg(patch); try { return f(); } finally { undo(); } }

/* setupPlayer：逐行照抄 sim/lib/game.js 的 setupPlayer，只把實例換成 ATB 實例 */
function setupPlayer(seed, tpl) {
  const { G, D } = inst();
  G.restart(seed >>> 0, tpl.origin || 'drifter');
  const S = G.state;
  if (tpl.attr) Object.keys(tpl.attr).forEach((k) => (S.attr[k] = tpl.attr[k]));
  if (tpl.prof) Object.keys(tpl.prof).forEach((k) => (S.prof[k] = { lv: tpl.prof[k], xp: 0 }));
  if (tpl.gear) {
    ['main', 'off', 'head', 'chest', 'gloves', 'boots', 'amulet', 'ring1', 'ring2', 'belt'].forEach((s) => (S.equip[s] = null));
    tpl.gear.forEach((b) => { const eq = G._debug.newEq(b).eq; const slot = D.BASES[b].slot === 'ring' ? 'ring1' : D.BASES[b].slot; S.equip[slot] = eq; });
  }
  if (tpl.skills) S.skills = tpl.skills.slice();
  if (tpl.items) { S.pack = S.pack.map(() => null); tpl.items.forEach(([k, n]) => G._debug.addItem({ k, n })); }
  S.hp = G.maxHp(); S.food = 80; S.fat = tpl.fat === undefined ? 10 : tpl.fat; S.corrupt = 0;
  S.scene = 'wild'; S.loc = 'chakou';
  return S;
}
function healTo(frac) { const { G } = inst(); const S = G.state; S.hp = Math.max(S.hp, Math.round(G.maxHp() * frac)); }

/* 決策器（SPEC-ATB §13.2）。B＝逐行照抄 sim/lib/game.js fight() 的判斷；A＝只把 heavyIncoming 換成預演。
 * opts 與 fight() 相同（fatMult、surrenderAt、ctxType、ambush、stun），另加 decider：'A'｜'B'。 */
function heavyByPeek(G) {
  const ord = G._debug.ATB.view().peek('defend');
  let k = 1; while (k < ord.length && ord[k].who !== 'you') k++;
  return ord.slice(1, k).some((o) => o.who !== 'you' && o.intent && o.intent.k === 'heavy');
}
function fight(enemyIds, opts) {
  opts = opts || {};
  const { G } = inst(); const S = G.state; const C = cfg();
  const hp0 = S.hp; const pots0 = G.countItem('pot_hp'); const silver0 = S.silver;
  S.dead = null; S.scene = 'wild'; S.loot = null; S.event = null;
  const fm0 = C.fatMult; C.fatMult = opts.fatMult || 0;
  G._debug.startCombat(enemyIds, { type: opts.ctxType || 'wild', node: 'chakou' }, { ambush: !!opts.ambush, stun: opts.stun || 0 });
  let rounds = 0, surrendered = false;
  const useA = (opts.decider || 'A') === 'A';
  while (S.combat && !S.dead && rounds < 200) {
    const c = S.combat; rounds++;
    const alive = c.enemies.filter((e) => e.hp > 0);
    if (opts.surrenderAt && S.hp <= G.maxHp() * opts.surrenderAt && !G.countItem('pot_hp')) { surrendered = true; break; }
    const tgt = alive.slice().sort((a, b) => a.hp - b.hp)[0];
    G.setTarget(tgt.idx);
    const acts = G.combatActions().filter((a) => !a.disabled && !a.locked);
    const has = (id) => acts.find((a) => a.id === id);
    const heavyIncoming = useA ? heavyByPeek(G) : alive.some((e) => e.intent && e.intent.k === 'heavy' && !(e.stag > 0)) && !c.stun;
    let act;
    if (heavyIncoming) act = 'defend';
    else if (S.hp <= G.maxHp() * 0.4 && has('item:pot_hp')) act = 'item:pot_hp';
    else if (tgt.intent && tgt.intent.k === 'charge' && has('t_bash')) act = 't_bash';
    else if (alive.length >= 2 && has('t_slash')) act = 't_slash';
    else if (alive.length >= 2 && has('t_quake')) act = 't_quake';
    else if (alive.length >= 2 && has('pozhen')) act = 'pozhen';
    else if (S.fat >= 76) act = 'attack';
    else if (has('beng')) act = 'beng';
    else if (has('t_execute')) act = 't_execute';
    else if (has('t_inner')) act = 't_inner';
    else if (has('t_aim')) act = 't_aim';
    else if (has('t_thrust')) act = 't_thrust';
    else if (has('t_cleave') && !(tgt.guard > 0)) act = 't_cleave';
    else if (has('t_volley')) act = 't_volley';
    else act = 'attack';
    G._debug.ATB.rt.fat1 = null;
    G.combatAction('do', act);
    // 勝利時 victory() 的疲累 +3 也照 fight() 乘 fatMult（fight() 是對整手的疲累增量乘倍率）
    const f1 = G._debug.ATB.rt.fat1;
    if (C.fatMult && !S.combat && !S.dead && f1 !== null && S.fat > f1) S.fat = Math.min(100, f1 + (S.fat - f1) * C.fatMult);
  }
  C.fatMult = fm0;
  const win = !S.combat && !S.dead && !surrendered;
  const out = { win, dead: !!S.dead, surrendered, rounds, hpStart: hp0, hpEnd: Math.max(0, S.hp), hpLost: hp0 - Math.max(0, S.hp), pots: pots0 - G.countItem('pot_hp'), silver: S.silver - silver0, maxHp: G.maxHp(), loot: S.loot };
  if (S.combat) { S.combat = null; }
  S.loot = null; if (!S.dead) S.scene = 'wild';
  return out;
}
module.exports = { inst, cfg, setCfg, withCfg, defaultCfg, setupPlayer, healTo, fight, patchedSource, fnRange, REPLACED };
