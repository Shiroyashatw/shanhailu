'use strict';
/* 以 Node vm 唯讀載入 repo 的 js/data.js 與 js/game.js（不修改檔案）。
 * 戰鬥一律走 game.js 原本的 startCombat／combatAction／enemyAct（game.js:1336-1618），
 * 這裡只補一個「腳本玩家」決策器。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./util');

function loadGame() {
  const store = {};
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, console, Date, Math, JSON };
  vm.createContext(ctx);
  for (const f of ['js/data.js', 'js/game.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return { D: ctx.window.SHL_DATA, G: ctx.window.SHL, ctx, store };
}
let _inst = null;
function inst() { return _inst || (_inst = loadGame()); }
function data() { return inst().D; }

/* 玩家樣板：{ origin, attr:{}, prof:{}, gear:[baseId…], skills:[], items:[[k,n]] } */
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
function snapshot() {
  const S = inst().G.state; const prof = {};
  Object.keys(S.prof).forEach((k) => { if (S.prof[k].lv) prof[k] = S.prof[k].lv; });
  return { origin: S.origin, attr: Object.assign({}, S.attr), prof, skills: S.skills.slice() };
}

/* 腳本玩家（【假設】，見 evidence/b1-sim-assumptions.md「戰鬥決策器」）：
 * 1) 有敵人本回合要重擊（蓄力後）→ 防禦；
 * 2) 生命 ≤ 40% 且有金創藥水 → 喝藥；
 * 3) 目標正在蓄力且會〈盾擊〉可用 → 盾擊打斷；
 * 4) 存活敵人 ≥2 且〈橫斬〉／〈震地〉／〈破陣〉可用 → 範圍技；
 * 5) 其餘可用的單體招式（倍率最高者）／〈崩岩擊〉；否則普攻。目標＝剩餘生命最少者。
 * opts.fatMult：戰鬥中疲累增加量的倍率（K2 前線 ×1.25）；opts.surrenderAt：生命比例低於此值即投降（回傳 surrendered）。 */
function fight(enemyIds, opts) {
  opts = opts || {};
  const { G, D } = inst(); const S = G.state;
  const hp0 = S.hp; const pots0 = G.countItem('pot_hp'); const silver0 = S.silver;
  S.dead = null; S.scene = 'wild'; S.loot = null; S.event = null;
  G._debug.startCombat(enemyIds, { type: opts.ctxType || 'wild', node: 'chakou' }, { ambush: !!opts.ambush, stun: opts.stun || 0 });
  let rounds = 0, surrendered = false;
  while (S.combat && !S.dead && rounds < 200) {
    const c = S.combat; rounds++;
    const alive = c.enemies.filter((e) => e.hp > 0);
    if (opts.surrenderAt && S.hp <= G.maxHp() * opts.surrenderAt && !G.countItem('pot_hp')) { surrendered = true; break; }
    const tgt = alive.slice().sort((a, b) => a.hp - b.hp)[0];
    G.setTarget(tgt.idx);
    const acts = G.combatActions().filter((a) => !a.disabled && !a.locked);
    const has = (id) => acts.find((a) => a.id === id);
    const heavyIncoming = alive.some((e) => e.intent && e.intent.k === 'heavy' && !(e.stag > 0)) && !c.stun;
    const fat0 = S.fat;
    let act;
    if (heavyIncoming) act = 'defend';
    else if (S.hp <= G.maxHp() * 0.4 && has('item:pot_hp')) act = 'item:pot_hp';
    else if (tgt.intent && tgt.intent.k === 'charge' && has('t_bash')) act = 't_bash';
    else if (alive.length >= 2 && has('t_slash')) act = 't_slash';
    else if (alive.length >= 2 && has('t_quake')) act = 't_quake';
    else if (alive.length >= 2 && has('pozhen')) act = 'pozhen';
    else if (S.fat >= 76) act = 'attack'; // 快到疲憊門檻（80：命中 −15%）就不再用耗疲累的招式
    else if (has('beng')) act = 'beng';
    else if (has('t_execute')) act = 't_execute';
    else if (has('t_inner')) act = 't_inner';
    else if (has('t_aim')) act = 't_aim';
    else if (has('t_thrust')) act = 't_thrust';
    else if (has('t_cleave') && !(tgt.guard > 0)) act = 't_cleave';
    else if (has('t_volley')) act = 't_volley';
    else act = 'attack';
    G.combatAction('do', act);
    if (opts.fatMult && S.fat > fat0) S.fat = Math.min(100, fat0 + (S.fat - fat0) * opts.fatMult);
  }
  const win = !S.combat && !S.dead && !surrendered;
  const out = { win, dead: !!S.dead, surrendered, rounds, hpStart: hp0, hpEnd: Math.max(0, S.hp), hpLost: hp0 - Math.max(0, S.hp), pots: pots0 - G.countItem('pot_hp'), silver: S.silver - silver0, maxHp: G.maxHp(), loot: S.loot };
  if (S.combat) { S.combat = null; }
  S.loot = null; if (!S.dead) S.scene = 'wild';
  return out;
}
function healTo(frac) { const { G } = inst(); const S = G.state; S.hp = Math.max(S.hp, Math.round(G.maxHp() * frac)); }
function addEnemy(id, def) { inst().D.ENEMIES[id] = def; } // 只改記憶體裡的資料表（K4 賞金獵人），不寫檔

module.exports = { inst, data, setupPlayer, snapshot, fight, healTo, addEnemy };
