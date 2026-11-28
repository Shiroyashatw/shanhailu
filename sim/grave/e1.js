'use strict';
/* E1 古塚掉落回歸：走 game.js 原本的 victory()（game.js:1621-1676；地城分支 1645-1660）與 lootEq()／newEq()／eqValue()／identifyFee()。
 * 做法：setupPlayer 後，對每一層 startCombat(DUNGEONS.guzhong.floors[f], {type:'dungeon', node:'guzhong', floor:f}, {hpMult:1e-6})
 * （敵人生命變 1），玩家無敵（生命設 9999）普攻到勝利，victory() 產生的銀兩與裝備就是遊戲實際的掉落。
 * 裝備價值＝鑑定後賣價 floor(eqValue×0.6×priceBonus)（game.js:713；平民 口才 10、議價 0 → priceBonus＝1）減鑑定費 identifyFee（game.js:505）。 */
const { U, g, writeCsv, r2 } = require('./common');
const N = 20000;
let _samples = null;
function priceBonus(G) { return U.clamp(1 + G.profLv('yi') * 0.0015 + (G.attrVal('kou') - 10) * 0.01, 0.7, 1.4); } // game.js:209 照抄
function sampleTrips(n) {
  const { G, D } = g.inst();
  const out = [];
  g.setupPlayer(77000, { origin: 'drifter' });
  const S = G.state; const pb = priceBonus(G);
  for (let i = 0; i < n; i++) {
    S.rng = U.hashStr('e1-trip:' + i) >>> 0; // 每趟一條固定亂數序列（seed＝i）
    const floors = [];
    for (let f = 0; f < 3; f++) {
      S.pack = S.pack.map(() => null); S.ground = { items: [] }; S.dead = null; S.hp = 9999;
      S.dungeon = { id: 'guzhong', floor: f, clearedDay: null }; S.loc = 'guzhong';
      G._debug.startCombat(D.DUNGEONS.guzhong.floors[f], { type: 'dungeon', node: 'guzhong', floor: f }, { hpMult: 1e-6 });
      let k = 0; while (S.combat && k++ < 100) { S.hp = 9999; G.combatAction('do', 'attack'); }
      const loot = S.loot; if (!loot) throw new Error('E1：victory() 沒有產生戰果');
      const eqs = S.pack.concat(S.ground.items || []).filter((it) => it && it.k === 'eq').map((it) => it.eq);
      const items = eqs.map((eq) => { const fee = G.identifyFee(eq); const id = Object.assign({}, eq, { unid: false }); const sale = Math.max(1, Math.floor(G.eqValue(id) * 0.6 * pb)); const saleUnid = Math.max(1, Math.floor(G.eqValue(eq) * 0.6 * pb)); return { rarity: eq.rarity, base: eq.base, sale, fee, net: sale - fee, saleUnid, contNet: D.BASES[eq.base].val * D.RARITY[eq.rarity].mult * 0.6 - fee }; });
      floors.push({ silver: loot.silver, items });
      S.loot = null; S.scene = 'wild';
    }
    out.push(floors);
  }
  return out;
}
function samples() { return _samples || (_samples = sampleTrips(N)); }
function run() {
  const T = samples(); const D = g.data();
  const sum = { silver: [0, 0, 0], eqNet: [0, 0, 0], eqCont: [0, 0, 0], eqUnid: [0, 0, 0], nEq: [0, 0, 0], rar: {} };
  const tripNet = [];
  T.forEach((fl) => { let v = 0; fl.forEach((f, i) => { sum.silver[i] += f.silver; v += f.silver; f.items.forEach((it) => { sum.eqNet[i] += it.net; sum.eqCont[i] += it.contNet; sum.eqUnid[i] += it.saleUnid; sum.nEq[i]++; v += it.net; const k = i + ':' + it.rarity; sum.rar[k] = (sum.rar[k] || 0) + 1; }); }); tripNet.push(v); });
  const m = (a) => a / N; const tot = U.mean(tripNet);
  const sd = Math.sqrt(U.mean(tripNet.map((x) => (x - tot) * (x - tot))));
  const contTot = m(sum.silver[0] + sum.silver[1] + sum.silver[2] + sum.eqCont[0] + sum.eqCont[1] + sum.eqCont[2]);
  const HAND = 172.60; const diff = (tot - HAND) / HAND; const ok = Math.abs(diff) <= 0.02;
  const rows = [];
  const lines = ['樣本：' + N + ' 趟（每趟 3 層；第 i 趟亂數種子 `S.rng = FNV1a("e1-trip:"+i)`，i=0..' + (N - 1) + '）。掉落一律由 game.js `victory()` 實際產生（見 assumptions「E1」）。', '',
    '| 層 | 銀兩平均 | 掉裝備件數／趟 | 裝備淨值（鑑定後賣價−鑑定費）平均 | 同上但不取整（手算口徑） | 不鑑定直接賣平均 | 稀有度分布 |', '|---|---|---|---|---|---|---|'];
  ['墓道', '俑坑', '主室（墓主）'].forEach((n, i) => {
    const rr = ['blue', 'rare', 'legend'].map((r) => D.RARITY[r].name + ' ' + (sum.rar[i + ':' + r] || 0)).join('、');
    lines.push('| ' + [n, r2(m(sum.silver[i])), U.r3(m(sum.nEq[i])), r2(m(sum.eqNet[i])), r2(m(sum.eqCont[i])), r2(m(sum.eqUnid[i])), rr].join(' | ') + ' |');
    rows.push([n, m(sum.silver[i]), m(sum.nEq[i]), m(sum.eqNet[i]), m(sum.eqCont[i]), m(sum.eqUnid[i]), sum.rar[i + ':blue'] || 0, sum.rar[i + ':rare'] || 0, sum.rar[i + ':legend'] || 0]);
  });
  const layerEq = m(sum.eqNet[0] + sum.eqNet[1]), bossEq = m(sum.eqNet[2]), silv = m(sum.silver[0] + sum.silver[1] + sum.silver[2]);
  lines.push('', '| 項目 | 手算（G7） | 實抽 | 差 |', '|---|---|---|---|',
    '| 銀兩 | 111.00 | ' + r2(silv) + ' | ' + r2(silv - 111) + ' |',
    '| 層裝備（墓道＋俑坑） | 28.50 | ' + r2(layerEq) + ' | ' + r2(layerEq - 28.5) + ' |',
    '| 首領裝備 | 33.10 | ' + r2(bossEq) + ' | ' + r2(bossEq - 33.1) + ' |',
    '| **一趟期望淨值** | **172.60** | **' + r2(tot) + '**（標準差 ' + r2(sd) + '） | ' + r2(tot - HAND) + '（' + U.r3(diff * 100) + '%） |',
    '| 同上，賣價不取整（手算口徑） | 172.60 | ' + r2(contTot) + ' | ' + r2(contTot - HAND) + ' |');
  lines.push('', '判準：與 172.60 差 ≤2% → 實抽 ' + r2(tot) + '，差 ' + U.r3(diff * 100) + '% → **' + U.verdict(ok) + '**。差額來自 game.js:713 的賣價 `Math.floor`（每件平均少約 0.5 兩）；不取整時重現手算。');
  rows.push(['trip_total', tot, sd, contTot, HAND, diff]);
  writeCsv('E1-guzhong-loot', ['floor', 'silver_mean', 'eq_per_trip', 'eq_net_mean', 'eq_net_nofloor_mean', 'eq_unid_sale_mean', 'n_blue', 'n_rare', 'n_legend'], rows);
  return { lines, tot, ok, diff, sd, contTot, N };
}
module.exports = { run, samples, N };
