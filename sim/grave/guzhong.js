'use strict';
/* E2 古塚趟：戰鬥走 sim/lib/game.js fight()（決策器不改）；掉落從 E1 的 victory() 實抽樣本裡按層抽；古物槽、u、盜洞照 SPEC-GRAVE G7。 */
const { U, g, CIV, CLEAN, writeCsv, r2, H, PRICE, M_FERRY, POT } = require('./common');
const T = require('../lib/time');
const E1 = require('./e1');
const R_WILD = 1.042; // sim/civ/b1.js 的 R_WILD_
const X_DEATH = 100;  // 死亡計為損失整趟＋X：X＝重置制式裝備 82 兩（players.js 註解：短刃＋皮甲＋木盾）＋藥水 2×9
function ensureU(u) {
  const D = g.data();
  ['golem', 'tomblord'].forEach((id) => {
    const k = id + '_u' + u; if (D.ENEMIES[k]) return;
    const E = D.ENEMIES[id]; const hm = 1 + 0.15 * u, dm = 1 + 0.10 * u;
    g.addEnemy(k, Object.assign({}, E, { hp: Math.round(E.hp * hm), dmg: E.dmg.map((x) => Math.round(x * dm)), heavy: E.heavy ? E.heavy.map((x) => Math.round(x * dm)) : undefined }));
  });
}
const floorsU = (u) => (ensureU(u), [['golem_u' + u], ['golem_u' + u, 'golem_u' + u], ['tomblord_u' + u]]);
/* 路上遇險（沿用 sim/lib/time.js riskNew＋walkStats；地點→古塚是多段野徑 base 0.30；R_wild 沿用 B1 的 1.042）。
 * 遇險內容：沿用 B1「事件五選一」（data.js:466-477）：1/5 劫匪→fight(['bandit'])；1/5 異獸蹤跡→繞路 +1h；其餘 3/5 無代價。劫匪掉的銀兩不計入收入。 */
function walkEncounter(r, seed, t, hours, base) {
  const st = T.walkStats(seed, t, hours); const p = T.riskNew({ base, R: R_WILD, meanW: st.meanW, wxRisk: st.wxRisk }).risk;
  if (r() >= p) return { enc: 0, delay: 0, fight: null };
  const u = r(); if (u < 0.2) { const f = g.fight(['bandit']); return { enc: 1, delay: 0.5, fight: f }; }
  if (u < 0.4) return { enc: 1, delay: 1, fight: null };
  return { enc: 1, delay: 0, fight: null };
}
function drinkTo(G, S, frac) { // 層間（戰鬥外）喝藥：生命 ≤ frac×上限且還有藥就喝（game.js useItem；金創藥水 +30）
  let n = 0; while (S.hp <= G.maxHp() * frac && G.countItem('pot_hp') > 0) { const i = S.pack.findIndex((it) => it && it.k === 'pot_hp'); G.useItem(i); n++; } return n;
}
/* 一趟。st：跨日狀態 {slots:{niche,pit,main}（可取的日），u, lastGreedy}；o：{door, take, pots, policy:'careful'|'hard', walk, day, seed} */
function trip(r, st, o) {
  const { G } = g.inst(); const S = G.state; const samp = E1.samples();
  const res = { dead: false, abort: false, reached: 0, silver: 0, eqNet: 0, antique: 0, antiqueN: 0, pots: 0, fee: 0, hours: 0, hpLost: 0, corrupt: 0, enc: 0, floorWin: [null, null, null], trap: false, greedy: 0, bought: 0 };
  const t0 = (o.day - 1) * 1440 + 480; let t = t0;
  const pots0 = G.countItem('pot_hp'); const hpMax0 = G.maxHp();
  const dead = () => { if (S.dead) { res.dead = true; return true; } return false; };
  // 去程 3h（灰窯→腐骨沼→古塚）
  if (o.walk) { const w = walkEncounter(r, o.seed, t, 3, 0.30); res.enc += w.enc; t += w.delay * 60; res.hours += w.delay; if (w.fight && dead()) { res.hours += 3; return fin(); } }
  t += 180; res.hours += 3;
  let f0 = 0;
  if (o.door === 'tunnel') {
    f0 = 1; res.fee = 10;
    if (r() < 0.15) { res.trap = true; S.hp -= Math.round(0.2 * G.maxHp()); G._debug.addCorrupt(1); res.corrupt += 1; if (S.hp <= 0) { S.hp = 0; S.dead = { cause: 'trap' }; res.dead = true; return fin(); } }
  }
  const FL = floorsU(st.u);
  for (let f = f0; f < 3; f++) {
    res.hours += 1; t += 60; S.fat = Math.min(100, S.fat + 3); S.hp = Math.min(G.maxHp(), S.hp + 1); // dungeonDelve：passTime(1,{fat:3})
    if (o.policy === 'rest') { S.hp = G.maxHp(); S.fat = 0; const have = G.countItem('pot_hp'); if (have < o.pots) { G._debug.addItem({ k: 'pot_hp', n: o.pots - have }); res.bought += o.pots - have; } }
    if (o.policy === 'careful') { drinkTo(G, S, 0.5); if (S.hp < G.maxHp() * 0.5 && G.countItem('pot_hp') === 0) { res.abort = true; break; } }
    const fr = g.fight(FL[f]);
    res.floorWin[f] = fr.win;
    if (fr.dead || !fr.win) { res.dead = !!fr.dead; if (!fr.dead) res.abort = true; break; }
    res.reached = f + 1;
    const s = samp[Math.floor(r() * samp.length)][f]; res.silver += s.silver; s.items.forEach((it) => (res.eqNet += it.net));
    // 古物槽
    if (f === 0 && st.slots.niche <= o.day) { res.antique += PRICE.lo; res.antiqueN++; st.slots.niche = o.day + 7; }
    if (f === 1 && st.slots.pit <= o.day) { res.antique += r() < 0.5 ? PRICE.lo : PRICE.mid; res.antiqueN++; st.slots.pit = o.day + 7; }
    if (f === 2 && st.slots.main <= o.day && o.take > 0) {
      for (let k = 1; k <= o.take; k++) { res.antique += r() < 0.7 ? PRICE.mid : PRICE.hi; res.antiqueN++; if (k >= 3) { G._debug.addCorrupt(1); res.corrupt += 1; st.u = Math.min(3, st.u + 1); res.greedy++; } }
      if (o.take >= 3) st.lastGreedy = o.day;
      st.slots.main = o.day + 7;
    }
  }
  if (res.dead) return fin();
  if (o.walk) { const w = walkEncounter(r, o.seed, t, 3, 0.30); res.enc += w.enc; res.hours += w.delay; if (w.fight && dead()) { res.hours += 3; return fin(); } }
  res.hours += 3;
  return fin();
  function fin() {
    res.pots = pots0 + res.bought - G.countItem('pot_hp'); res.hpLost = Math.max(0, hpMax0 - Math.max(0, S.hp));
    res.value = res.dead ? 0 : res.silver + res.eqNet + res.antique * M_FERRY - res.fee - res.pots * POT;
    res.valueNoPot = res.dead ? 0 : res.silver + res.eqNet + res.antique * M_FERRY - res.fee;
    return res;
  }
}
const newState = (u) => ({ slots: { niche: 1, pit: 1, main: 1 }, u: u || 0, lastGreedy: -99 });
function prepDay(G, _S, pots, first, tpl, cseed) {
  if (first) g.setupPlayer(cseed, tpl);
  const S = G.state; // setupPlayer → G.restart 會換掉整個 state 物件，一律重新取
  S.dead = null; S.scene = 'wild'; S.combat = null;
  if (!first) S.corrupt = Math.max(0, S.corrupt - 10); // 老窯客棧歇息：生命回滿、疲累清零、侵蝕 −10（game.js:813）
  S.hp = G.maxHp(); S.fat = 0;
  const have = G.countItem('pot_hp'); if (have < pots) G._debug.addItem({ k: 'pot_hp', n: pots - have });
  else if (have > pots) { /* 多的留著 */ }
}
/* 單趟統計：N 趟，戰鬥種子 50000+1000×k+j（沿用前輪 50000+項次×1000+j 的規則；k 依設定序號） */
function single(tpl, o, n, kk) {
  const { G } = g.inst(); const S = G.state;
  const acc = { n, dead: 0, abort: 0, full: 0, value: 0, valueNoPot: 0, pots: 0, hpLost: 0, hours: 0, enc: 0, trap: 0, corrupt: 0, fl: [[0, 0], [0, 0], [0, 0]], hoursDeathEnd: 0 };
  for (let j = 0; j < n; j++) {
    const cseed = 50000 + 1000 * kk + j; const r = U.prng(j, 'E2:' + kk);
    prepDay(G, S, o.pots, true, tpl, cseed);
    const st = newState(o.u);
    const x = trip(r, st, Object.assign({ day: 1 + (j % 120), seed: j % 200 }, o));
    acc.dead += x.dead ? 1 : 0; acc.abort += x.abort && !x.dead ? 1 : 0; acc.full += x.reached === 3 ? 1 : 0;
    acc.value += x.value; acc.valueNoPot += x.valueNoPot; acc.pots += x.pots; acc.hpLost += x.hpLost; acc.hours += x.hours; acc.enc += x.enc; acc.trap += x.trap ? 1 : 0; acc.corrupt += x.corrupt;
    x.floorWin.forEach((w, f) => { if (w !== null) { acc.fl[f][1]++; if (w) acc.fl[f][0]++; } });
  }
  const pl = (o.door === 'tunnel' ? 8 : 9); // 規格的計畫時數（不含遇險耽擱）
  acc.mean = { value: acc.value / n, pots: acc.pots / n, hpLost: acc.hpLost / n, hours: acc.hours / n, dead: acc.dead / n, abort: acc.abort / n, full: acc.full / n, enc: acc.enc / n, trap: acc.trap / n, corrupt: acc.corrupt / n };
  acc.mean.perH_end = acc.value / n / pl; // 死亡即結束：死亡那趟 0
  acc.mean.perH_loss = (acc.value - acc.dead * X_DEATH) / n / pl; // 死亡＝損失整趟＋X
  acc.mean.restH = acc.hpLost / n; // 自然回復 1 生命/小時（game.js passTime，飽食≥30）
  return acc;
}
/* 7 天連跑（第 1 天正門取 2，之後古物槽在冷卻）：200 seeds（seed＝0..199），每天一趟、晚上回灰窯客棧歇息（8 兩，生命回滿、侵蝕 −10）。 */
function weekly(tpl, o, kk) {
  const { G } = g.inst(); const S = G.state; const out = { end: [], loss: [], deaths: 0, seedsDead: 0, pots: 0, hours: 0, value: 0, tripN: 0, inn: 0, byDay: Array(7).fill(0) };
  for (let seed = 0; seed < 200; seed++) {
    const r = U.prng(seed, 'E2w:' + kk); const st = newState(0); let alive = true, sumEnd = 0, sumLoss = 0, deaths = 0;
    for (let d = 1; d <= 7; d++) {
      prepDay(G, S, o.pots, d === 1, tpl, 50000 + 1000 * kk + seed);
      if (d > 1) out.inn += 8;
      const x = trip(r, st, Object.assign({ day: d, seed }, o, { take: d === 1 ? o.take1 : o.take }));
      out.pots += x.pots; out.hours += x.hours; out.tripN++;
      if (x.dead) { deaths++; sumLoss -= X_DEATH; if (alive) { alive = false; } G.state.dead = null; G.state.corrupt = 0; }
      else { sumLoss += x.value; if (alive) sumEnd += x.value; out.byDay[d - 1] += x.value; }
    }
    out.end.push(sumEnd); out.loss.push(sumLoss); out.deaths += deaths; if (deaths) out.seedsDead++;
  }
  const hrs = 7 * (o.door === 'tunnel' ? 8 : 9);
  out.perH_end = U.mean(out.end) / hrs; out.perH_loss = U.mean(out.loss) / hrs; out.hrs = hrs;
  return out;
}
const NAMES = { rest: '層間回滿（上界：每層開打前生命回滿、藥水補到 2，休養時間不計）', careful: '量力（層前生命<50% 且無藥就回頭；層間生命≤50% 先喝藥）', hard: '硬闖（不回頭、層間不喝藥，只在戰鬥中由決策器喝）' };
function run() {
  const lines = [], csv = [];
  const players = [CIV, CLEAN()];
  const cfgs = [];
  let kk = 20;
  players.forEach((p) => ['front', 'tunnel'].forEach((door) => [0, 1, 2, 3].forEach((u) => cfgs.push({ p, o: { door, u, take: 2, pots: 2, policy: 'careful', walk: true }, kk: kk++ }))));
  [0, 1, 2, 3].forEach((u) => cfgs.push({ p: CLEAN(), o: { door: 'front', u, take: 2, pots: 4, policy: 'careful', walk: true }, kk: kk++ }));
  players.forEach((p) => cfgs.push({ p, o: { door: 'front', u: 0, take: 2, pots: 2, policy: 'hard', walk: true }, kk: kk++ }));
  players.forEach((p) => cfgs.push({ p, o: { door: 'front', u: 0, take: 2, pots: 2, policy: 'careful', walk: false }, kk: kk++ }));
  [3, 4].forEach((take) => cfgs.push({ p: CLEAN(), o: { door: 'front', u: 0, take, pots: 2, policy: 'careful', walk: true }, kk: kk++ }));
  // 上界：層間回滿（每層開打前生命、疲累回滿、藥水補到 2；休養時間不計）
  [0, 1, 2, 3].forEach((u) => cfgs.push({ p: CLEAN(), o: { door: 'front', u, take: 2, pots: 2, policy: 'rest', walk: true }, kk: kk++ }));
  [0, 1, 2, 3].forEach((u) => cfgs.push({ p: CLEAN(), o: { door: 'tunnel', u, take: 2, pots: 2, policy: 'rest', walk: true }, kk: kk++ }));
  [2, 4].forEach((take) => cfgs.push({ p: CLEAN(), o: { door: 'front', u: 0, take, pots: 2, policy: 'rest', walk: false }, kk: kk++ }));
  cfgs.push({ p: CLEAN(), o: { door: 'tunnel', u: 0, take: 2, pots: 2, policy: 'rest', walk: false }, kk: kk++ });
  const N = 1000; const R = [];
  cfgs.forEach((c) => { const a = single(c.p, c.o, N, c.kk); R.push({ c, a }); });
  lines.push('單趟：每組 ' + N + ' 趟，戰鬥種子 50000+1000×k+j（k＝組號 ' + cfgs[0].kk + '–' + cfgs[cfgs.length - 1].kk + '、j=0..' + (N - 1) + '；沿用前輪「50000＋項次×1000＋j」規則），玩家亂數 prng(j,"E2:"+k)；路上天候用 seed＝j mod 200、第 1+(j mod 120) 日 08:00 出發。決策器 sim/lib/game.js fight() 不改。主室取 2（正門另含壁龕、俑坑各 1）。', '');
  lines.push('| 玩家 | 入口 | u | 藥水 | 趟內策略 | 路上遇險 | 墓道勝率 | 俑坑勝率 | 主室勝率 | 打完全程 | 回頭 | 死亡率 | 喝藥／趟 | 失血（休養 h） | 淨值／趟 | 計畫時數 | 死亡即結束 兩/h（×H） | 死亡＝損失整趟＋' + X_DEATH + ' 兩/h（×H） |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  R.forEach(({ c, a }) => {
    const m = a.mean; const fw = a.fl.map(([w, n]) => (n ? U.r3(w / n * 100) + '%（' + w + '/' + n + '）' : '—'));
    lines.push('| ' + [c.p.name, c.o.door === 'front' ? '正門' : '盜洞', c.o.u, c.o.pots, ({ careful: '量力', hard: '硬闖', rest: '層間回滿（上界）' })[c.o.policy], c.o.walk ? '含' : '不含', fw[0], fw[1], fw[2], U.r3(m.full * 100) + '%', U.r3(m.abort * 100) + '%', U.r3(m.dead * 100) + '%', U.r3(m.pots), r2(m.hpLost) + '（' + r2(m.restH) + '）', r2(m.value) + (c.o.take !== 2 ? '（取 ' + c.o.take + '）' : ''), c.o.door === 'tunnel' ? 8 : 9, r2(m.perH_end) + '（' + U.r3(m.perH_end / H) + '）', r2(m.perH_loss) + '（' + U.r3(m.perH_loss / H) + '）'].join(' | ') + ' |');
    csv.push(['single', c.p.name, c.o.door, c.o.u, c.o.pots, c.o.policy, c.o.walk ? 1 : 0, c.o.take, N, a.fl[0][0], a.fl[0][1], a.fl[1][0], a.fl[1][1], a.fl[2][0], a.fl[2][1], m.full, m.abort, m.dead, m.pots, m.hpLost, m.value, m.perH_end, m.perH_loss, m.enc, m.trap]);
  });
  lines.push('', '表中「淨值／趟」＝銀兩＋裝備（鑑定後賣價−鑑定費）＋古物×渡口 0.65 −盜洞入洞費 −喝掉的藥水×9；死亡那趟記 0。「失血」＝出發時生命上限−回到家時生命；「休養 h」＝靠自然回復（1/h）補滿要的小時數（住客棧一晚則直接回滿，8 兩）。');
  // 週跑
  const W = [];
  let wk = 60;
  [[CIV, 'front', 'careful'], [CLEAN(), 'front', 'careful'], [CLEAN(), 'tunnel', 'careful'], [CLEAN(), 'front', 'rest'], [CLEAN(), 'tunnel', 'rest']].forEach(([p, door, policy]) => [true, false].forEach((walk) => { const o = { door, u: 0, take1: 2, take: 2, pots: 2, policy, walk }; W.push({ p, o, w: weekly(p, o, wk++) }); }));
  lines.push('', '7 天連跑：200 seeds（seed＝0..199），戰鬥種子 50000+1000×k+seed（k＝' + 60 + '–' + (wk - 1) + '）。第 1 天主室取 2（加壁龕、俑坑），第 2–7 天古物槽都在 7 天冷卻（G7），只有原本的掉落。每晚灰窯客棧（8 兩，另列不扣）。藥水每天補到 2 瓶（9 兩／瓶，已扣）。', '',
    '| 玩家 | 入口 | 趟內策略 | 路上遇險 | 週總時數 | 死亡次數／200 seeds | 至少死一次的 seed | 喝藥／趟 | 死亡即結束：週均 兩/h（×H） | 死亡＝損失整趟＋' + X_DEATH + '：週均 兩/h（×H） | 判準 ≤1.3H（23.4） |', '|---|---|---|---|---|---|---|---|---|---|---|');
  W.forEach(({ p, o, w }) => {
    const ok = w.perH_end <= 1.3 * H && w.perH_loss <= 1.3 * H;
    lines.push('| ' + [p.name, o.door === 'front' ? '正門' : '盜洞', o.policy === 'rest' ? '層間回滿（上界）' : '量力', o.walk ? '含' : '不含', w.hrs, w.deaths, w.seedsDead, U.r3(w.pots / w.tripN), r2(w.perH_end) + '（' + U.r3(w.perH_end / H) + '）', r2(w.perH_loss) + '（' + U.r3(w.perH_loss / H) + '）', ok ? '通過' : '**未通過**'].join(' | ') + ' |');
    csv.push(['weekly', p.name, o.door, 0, o.pots, o.policy, o.walk ? 1 : 0, 2, 200, '', '', '', '', '', '', '', '', w.deaths / 1400, w.pots / w.tripN, '', U.mean(w.end), w.perH_end, w.perH_loss, '', '']);
  });
  writeCsv('E2-guzhong', ['kind', 'player', 'door', 'u', 'pots', 'policy', 'walk_risk', 'take_main', 'n', 'f1_win', 'f1_n', 'f2_win', 'f2_n', 'f3_win', 'f3_n', 'p_full', 'p_abort', 'p_dead', 'pots_per_trip', 'hp_lost', 'value_per_trip', 'perH_death_end', 'perH_death_loss', 'enc_per_trip', 'p_trap'], csv);
  return { lines, R, W, X_DEATH, NAMES };
}
module.exports = { run, trip, newState, prepDay, single, weekly, ensureU, walkEncounter, X_DEATH, R_WILD };
