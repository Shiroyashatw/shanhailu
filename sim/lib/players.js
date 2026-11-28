'use strict';
/* 玩家樣板：6 種出身起手（data.js:523-530）與「古窯清理級」。
 * 古窯清理級【假設】：每種出身各自用 game.js 的成長規則（gainProf，game.js:105-125）實打一輪後的素質與熟練度——
 *   開局懸賞 灰髯狼×3（data.js:409）→ 每日委託獵殺 6 張（data.js:420 依序：狼×2、豬×1、逃兵×1、狼×3、毒蟲×2、豬×2）
 *   → 亂葬古窯三層（data.js:267：窯屍／窯屍＋狼／窯屍王）。每場開打前回滿血；途中戰死視為回城重來（只累計熟練度）。
 *   裝備：打完開局懸賞後在石記鐵鋪買短刃（原本拿鏽刃者）、皮甲、木盾（非雙手武器者）（data.js:322-323，共 82 兩）。
 *   打完古窯讀〈崩岩擊〉殘卷（data.js:270）。 */
const g = require('./game');
const ORIGINS = ['hunter', 'herbalist', 'miner', 'deserter', 'peddler', 'drifter'];
let _clean = null;
function starters() { return ORIGINS.map((o) => ({ name: '起手・' + g.data().ORIGINS.find((x) => x.id === o).name, origin: o })); }
function cleanerGear(origin) {
  const O = g.data().ORIGINS.find((x) => x.id === origin); const B = g.data().BASES;
  let main = O.gear.find((b) => B[b].slot === 'main'); if (main === 'blade_rust') main = 'blade_short';
  const gear = [main, 'leather']; if (!B[main].twoHanded) gear.push('buckler');
  return gear;
}
function cleaners() {
  if (_clean) return _clean;
  _clean = ORIGINS.map((o, i) => {
    const G = g.inst().G; g.setupPlayer(7000 + i, { origin: o }); const S = G.state;
    const bout = (ids) => { S.dead = null; S.hp = G.maxHp(); S.fat = 10; S.corrupt = 0; if (!G.countItem('pot_hp')) G._debug.addItem({ k: 'pot_hp', n: 2 }); g.fight(ids); if (S.dead) { S.dead = null; S.scene = 'wild'; } };
    ['wolf', 'wolf', 'wolf'].forEach((e) => bout([e]));
    const gear = cleanerGear(o);
    ['main', 'off', 'chest'].forEach((s) => (S.equip[s] = null));
    gear.forEach((b) => { const eq = G._debug.newEq(b).eq; S.equip[g.data().BASES[b].slot] = eq; });
    ['wolf', 'wolf', 'boar', 'deserter', 'wolf', 'wolf', 'wolf', 'bug', 'bug', 'boar', 'boar'].forEach((e) => bout([e]));
    g.data().DUNGEONS.guyao.floors.forEach((f) => bout(f));
    const snap = g.snapshot();
    return { name: '古窯清理級・' + g.data().ORIGINS.find((x) => x.id === o).name, origin: o, attr: snap.attr, prof: snap.prof, gear, skills: ['beng'], items: [['pot_hp', 2]] };
  });
  return _clean;
}
function describe(t) {
  const D = g.data(); g.setupPlayer(1, t); const G = g.inst().G; const S = G.state;
  const attr = D.ATTRS.map((a) => a.g + S.attr[a.id]).join(' ');
  const prof = Object.keys(S.prof).filter((k) => S.prof[k].lv > 0).map((k) => D.PROFS.find((p) => p.id === k).name + S.prof[k].lv).join(' ');
  return { name: t.name, attr, prof, hp: G.maxHp(), dmg: G.weaponDmg().join('–'), armor: G.armor(), hit: Math.round(G.hitChance() * 100), dodge: Math.round(G.dodgeChance() * 100), gear: Object.keys(S.equip).filter((k) => S.equip[k] && k !== 'bag' && S.equip[k].base).map((k) => D.BASES[S.equip[k].base].name).join('、'), skills: S.skills.join(',') };
}
/* 對一組敵人打 n 場（每場滿血、藥水補到 2 瓶），回傳平均。 */
function duel(tpl, enemies, n, seed0, opts) {
  let win = 0, dead = 0, hp = 0, pots = 0, rounds = 0, silver = 0;
  for (let i = 0; i < n; i++) {
    g.setupPlayer((seed0 || 0) + i, tpl); if (!tpl.items) { /* 起手：出身自帶的行囊（金創藥水×2、乾餅×2；藥童再 +2） */ }
    const r = g.fight(enemies, opts); win += r.win ? 1 : 0; dead += r.dead ? 1 : 0; hp += r.hpLost + 30 * r.pots; pots += r.pots; rounds += r.rounds; silver += r.silver;
  }
  return { n, win: win / n, dead: dead / n, hpCost: hp / n, pots: pots / n, rounds: rounds / n, silver: silver / n };
}
const POT_PRICE = 9, POT_HEAL = 30; // data.js:321 回春藥鋪金創藥水 9 兩；data.js:21 回復 30
const HP_SILVER = POT_PRICE / POT_HEAL;
module.exports = { ORIGINS, starters, cleaners, cleanerGear, describe, duel, HP_SILVER, POT_PRICE };
