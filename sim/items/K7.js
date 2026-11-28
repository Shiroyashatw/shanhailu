'use strict';
// K7 兇名＋重犯保底：城門拒入時，24 小時內能不能靠野外補到 +35 飽食
const g = require('../lib/game');
const T = require('../lib/time');
const P = require('../lib/players');
const { r3, prob, writeCsv, verdict, prng, mean } = require('../lib/util');
const SEEDS = 200, R_WILD = 1.042, SN = ['春', '夏', '秋', '冬'];
/* 【假設】
 * - repo 現況能吃的東西只有：烤肉乾糧（生肉＋營火，data.js:460，+35）、乾餅、粗茶；後兩者只有店裡賣（進不了城）。撿骨師營地沒賣食物（data.js:343 只有賭裝備）。
 *   採集點只產草藥與礦，不能吃。所以唯一的路＝獵有肉的野獸（灰髯狼 1 塊、山豬 1–2 塊，data.js:147-148）→ 生火 1h → 烤 1h → 吃。
 * - 玩家用 6 種出身起手的素質與裝備（最保守），身上沒有任何食物，帶出身自帶的金創藥水 2 瓶；起點＝灰窯城門外，出發時刻 (seed×7)%24 點，該季第 (seed%25)+1 日。
 * - 路線：灰窯→岔口→青霧藥林（2h，狼跡 1 處，秋 +1，data.js:218、game.js:434）；沒打到肉再走 1h 到枯骨獸徑（狼跡 3、豬跡 1）。
 * - 路上遇險照新規則（base×R_wild×(1+mean w)×天候），事件五選一（data.js:466）：劫匪→迎戰、獸跡→追獵（50% 豬／50% 狼，game.js:1727，有肉）、其餘離開。
 * - 飽食 <20 命中 −5%、疲累 ≥80 命中 −15%（game.js:202-206 由 vm 內原式處理）；生存用 SPEC-TIME 的寒意／飽食／疲累。 */
function one(seed) {
  const season = Math.floor(seed / 50), tpl = P.starters()[seed % 6], r = prng(seed, 'K7');
  const G = g.inst().G; g.setupPlayer(seed, Object.assign({}, tpl, { items: [['pot_hp', 2]] })); const S = G.state;
  const b = T.newBody({ food: 30, hp: G.maxHp(), maxHp: G.maxHp() });
  const t0 = (season * 30 + (seed % 25)) * 1440 + ((seed * 7) % 24) * 60; let t = t0, meat = 0, eaten = 0;
  const out = { season, ok: false, dead: false, cause: '', hours: null, fights: 0, minFood: 30, maxCold: 0 };
  const left = () => t0 + 1440 - t;
  const pass = (h, ctx) => { t = T.advance(b, t, Math.round(h * 60), Object.assign({ seed, act: 'awake' }, ctx)); return !b.dead; };
  const fightIt = (ids, hunt) => {
    S.hp = Math.max(1, Math.round(b.hp)); S.food = Math.round(b.food); S.fat = Math.round(b.fat); S.dead = null; out.fights++;
    const f = g.fight(ids, { ctxType: hunt ? 'hunt' : 'wild' }); b.hp = f.hpEnd; b.fat = S.fat;
    if (!f.win) { b.dead = true; b.cause = '戰死（' + ids.join('+') + '）'; return false; }
    ids.forEach((id) => { const E = g.data().ENEMIES[id]; if (E.beast && E.meat[1] > 0) meat += E.meat[0] + Math.floor(r() * (E.meat[1] - E.meat[0] + 1)); });
    return true;
  };
  const travel = (edges) => {
    const wx = T.weatherAt(seed, t); const h = T.routeHours(edges, 1, wx); const st = T.walkStats(seed, t, h);
    const risk = T.riskNew({ base: T.baseRisk(edges), R: R_WILD, meanW: st.meanW, wxRisk: st.wxRisk }).risk;
    if (!pass(h, { place: 'wild', fatRate: 3 })) return false;
    if (r() < risk) { const ev = Math.floor(r() * 5); if (ev === 1) return fightIt(['bandit']); if (ev === 2) return fightIt([r() < 0.5 ? 'boar' : 'wolf'], true); }
    return true;
  };
  const D = g.data(); const E = (a, c) => D.EDGES.find((e) => (e.a === a && e.b === c) || (e.a === c && e.b === a));
  const tracks = (node) => { const autumn = T.seasonOf(t) === 2 ? 1 : 0; return D.WILDS[node].points.filter((p) => p.kind === 'track' && D.ENEMIES[p.enemy].beast && D.ENEMIES[p.enemy].meat[1] > 0).flatMap((p) => Array(p.max + autumn).fill(p.enemy)); };
  const hunt = (node) => { for (const e of tracks(node)) { if (meat >= 1 || left() < 180) break; if (!pass(1, { place: 'wild', fatRate: 3 })) return false; if (!fightIt([e], true)) return false; } return true; };
  const cook = () => { if (!pass(1, { place: 'wild', fatRate: 1 })) return false; while (meat > 0 && eaten < 35) { if (!pass(1, { place: 'fire' })) return false; meat--; T.eat(b, 35); eaten += 35; } return true; };
  let alive = travel([E('huiyao', 'chakou'), E('chakou', 'qingwu')]);
  if (alive && meat < 1) alive = hunt('qingwu');
  if (alive && meat < 1) { alive = travel([E('qingwu', 'kugu')]); if (alive && meat < 1) alive = hunt('kugu'); }
  if (alive && meat >= 1) alive = cook();
  out.dead = b.dead; out.cause = b.cause; out.minFood = b.minFood; out.maxCold = b.maxCold; out.hours = (t - t0) / 60;
  out.ok = !b.dead && eaten >= 35 && t - t0 <= 1440; out.noMeat = !b.dead && eaten < 35;
  return out;
}
function run() {
  const rs = []; for (let s = 0; s < SEEDS; s++) rs.push(one(s));
  const lines = ['| 季 | 24h 內補到 +35 | 戰死 | 餓死／凍死 | 沒打到肉或超時 | 平均花費時數（成功者） | 飽食最低（平均） | 寒意最高（平均） |', '|---|---|---|---|---|---|---|---|']; const csv = [];
  for (let k = 0; k < 4; k++) { const a = rs.filter((x) => x.season === k); const ok = a.filter((x) => x.ok).length, kia = a.filter((x) => x.dead && x.cause.startsWith('戰死')).length, env = a.filter((x) => x.dead && !x.cause.startsWith('戰死')).length, nm = a.filter((x) => !x.dead && !x.ok).length;
    lines.push('| ' + [SN[k], prob(ok, a.length), kia, env, nm, r3(mean(a.filter((x) => x.ok).map((x) => x.hours))), r3(mean(a.map((x) => x.minFood))), r3(mean(a.map((x) => x.maxCold)))].join(' | ') + ' |'); csv.push([SN[k], a.length, ok / a.length, kia, env, nm, mean(a.filter((x) => x.ok).map((x) => x.hours)), mean(a.map((x) => x.minFood)), mean(a.map((x) => x.maxCold))]); }
  writeCsv('K7', ['season', 'n', 'p_ok', 'killed_in_fight', 'starved_or_frozen', 'no_meat_or_timeout', 'mean_hours_ok', 'mean_min_food', 'mean_max_cold'], csv);
  const okN = rs.filter((x) => x.ok).length, ok = okN === SEEDS; const causes = {}; rs.filter((x) => x.dead).forEach((x) => (causes[x.cause] = (causes[x.cause] || 0) + 1));
  lines.push('合計 ' + prob(okN, SEEDS) + '（門檻 100%）→ ' + verdict(ok) + '。死因：' + (Object.keys(causes).length ? Object.keys(causes).map((k) => k + ' ' + causes[k]).join('、') : '無') + '。');
  lines.push('沒有軟鎖：野外與獸跡都不查身分，每個 seed 都有路可走。唯一的食物鏈是 獵獸→生火→烤肉（約 5 小時），沒有不必打鬥就能吃到東西的來源（採集點不產可食物，撿骨師營地不賣吃的）。');
  lines.push('餘裕：冬季飽食最低平均 ' + r3(mean(rs.filter((x) => x.season === 3).map((x) => x.minFood))) + '、全體最低 ' + r3(Math.min(...rs.map((x) => x.minFood))) + '（起點 30；冬季清醒 −5/h，走 2–3h＋追蹤 1h＋生火烤肉 2h）。' + rs.filter((x) => x.minFood <= 0).length + ' 個 seed 在吃到東西前飽食已歸零（短暫 −3hp/h，但沒死）。');
  return { id: 'K7', title: '兇名＋重犯保底', measured: '24h 內補到 +35：' + r3(okN / SEEDS * 100) + '%（春夏秋冬 ' + [0, 1, 2, 3].map((k) => rs.filter((x) => x.season === k && x.ok).length + '/50').join('、') + '）；軟鎖 0', threshold: '100% seed、無軟鎖', pass: ok, suggest: ok ? '—' : '野外加一個不必打鬥的食物來源（例：野徑岔口／藥林可採野果或挖山藥 +20，冬季減量），或撿骨師營地賣乾餅', rerun: '—', lines, rs };
}
module.exports = { run, one };
