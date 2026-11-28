'use strict';
/* C. 委託險級（R2）：C1 查表、C2 抽樣（世界模型 R 與天候＋QUEST_GEN）、C3 送貨路線（game.js route()）。 */
const g = require('../lib/game');
const T = require('../lib/time');
const Wd = require('../lib/world');
const C = require('./common');
const { r3, wilson, wrnd, clamp } = C.U;
const RS = [500, 750, 1000, 1095, 1255, 1500, 1800]; // R（千分點）
/* ---------- C1 查表 ---------- */
function c1() {
  const rows = []; let maxRisk = 0, nOver = 0;
  Object.keys(C.BASE).forEach((bk) => Object.keys(C.PHASE).forEach((pk) => Object.keys(C.WXF).forEach((wk) => RS.forEach((R) => {
    const f = [C.BASE[bk][1], R, C.PHASE[pk][1], C.WXF[wk][1]]; const x = C.riskExact(f);
    maxRisk = Math.max(maxRisk, x.risk); if (x.risk > 850) nOver++;
    rows.push([C.BASE[bk][0], C.PHASE[pk][0], C.WXF[wk][0], R / 1000, x.raw / 1000, x.risk / 1000, C.tierOf1000(x.risk)]);
  }))));
  // 邊界值
  const BND = [[0.1499, '低'], [0.15, '中'], [0.3499, '中'], [0.35, '高'], [0.5999, '高'], [0.60, '極高'], [0.85, '極高']];
  const rawTier = (v) => (v < 0.15 ? '低' : v < 0.35 ? '中' : v < 0.60 ? '高' : '極高');
  const bnd = BND.map(([v, e]) => { const t = C.tierOf1000(C.r1000(v)); return [v, C.r1000(v) / 1000, e, t, t === e, rawTier(v)]; });
  // 手算預期
  const HAND = [['官道 R=1 白天', [40, 1000, 1000, 1000], 0.040, '低'], ['野徑單段 R=1 白天', [220, 1000, 1000, 1000], 0.220, '中'], ['野徑多段 R=1 白天', [300, 1000, 1000, 1000], 0.300, '中'],
    ['野徑單段 R=1 黑夜', [220, 1000, 2000, 1000], 0.440, '高'], ['野徑多段 R=1 黑夜', [300, 1000, 2000, 1000], 0.600, '極高'],
    ['野徑單段 R=1.255 白天', [220, 1255, 1000, 1000], 0.276, '中'], ['野徑單段 R=1.255 黑夜', [220, 1255, 2000, 1000], 0.552, '高'],
    ['野徑多段 R=1.255 白天', [300, 1255, 1000, 1000], 0.377, '高'], ['野徑多段 R=1.255 黑夜', [300, 1255, 2000, 1000], 0.753, '極高'],
    ['送貨官道 R=1 白天', [40, 1000, 1000, 1000], 0.040, '低'], ['送貨官道 R=1 黑夜', [40, 1000, 2000, 1000], 0.080, '低']];
  const hand = HAND.map(([nm, f, ev, et]) => { const x = C.riskExact(f); const t = C.tierOf1000(x.risk); return [nm, ev, et, x.risk / 1000, t, Math.abs(x.risk / 1000 - ev) < 1e-9 && t === et]; });
  // 最壞組合：疊超載 ×1.4、獸潮 ×1.5
  const worst = []; Object.keys(C.BASE).forEach((bk) => { const f = [C.BASE[bk][1], 1800, 2000, 1200, 1400, 1500]; const x = C.riskExact(f); worst.push([C.BASE[bk][0] + '・R=1.8・黑夜・霧・超載・獸潮', x.raw / 1000, x.risk / 1000, C.tierOf1000(x.risk)]); });
  // 不封頂就會超過 0.85 的格數
  const rawOver = rows.filter((r) => r[4] > 0.85).length;
  C.writeCsv('tier-table', ['base', 'phase', 'weather', 'R', 'risk_raw', 'risk_capped', 'tier'], rows);
  const pass = maxRisk <= 850 && bnd.every((b) => b[4]) && hand.every((h) => h[5]);
  const lines = ['**C1. 查表**（不需模擬）：基礎 3 種 × 時段 4 × 天候 4 × R 7 值（0.50、0.75、1.00、1.095、1.255、1.50、1.80）＝ ' + rows.length + ' 格，全文見 `evidence/csv-t3v5/tier-table.csv`。精確十進位運算（BigInt），封頂後取三位 half-up。', '',
    '- 判準「全部 risk ≤ 0.85」：封頂後最大 ' + (maxRisk / 1000).toFixed(3) + '，超過 0.85 的格 ' + nOver + ' 格 → **' + C.U.verdict(maxRisk <= 850) + '**（未封頂時超過 0.85 的有 ' + rawOver + ' 格，全由 0.85 封頂壓住）。', ''];
  // 四檔分布摘要：每個 R 下每個基礎
  lines.push('| 基礎 | 時段 | ' + RS.map((R) => 'R=' + (R / 1000)).join(' | ') + ' |', '|---|---|' + RS.map(() => '---').join('|') + '|');
  Object.keys(C.BASE).forEach((bk) => Object.keys(C.PHASE).forEach((pk) => {
    lines.push('| ' + C.BASE[bk][0] + ' | ' + C.PHASE[pk][0] + '（晴／雨／霧／雪） | ' + RS.map((R) => Object.keys(C.WXF).map((wk) => { const x = C.riskExact([C.BASE[bk][1], R, C.PHASE[pk][1], C.WXF[wk][1]]); return (x.risk / 1000).toFixed(3) + C.tierOf1000(x.risk); }).join('／')).join(' | ') + ' |');
  }));
  lines.push('', '邊界值（先取三位再分檔）：', '', '| risk | 取三位 | 預期 | 實得（照規則先取三位） | 符合 | 參考：不取三位直接比 |', '|---|---|---|---|---|---|');
  bnd.forEach((b) => lines.push('| ' + [b[0], b[1].toFixed(3), b[2], b[3], b[4] ? '是' : '**否**', b[5] + (b[5] === b[2] ? '（符合）' : '（不符）')].join(' | ') + ' |'));
  if (!bnd.every((b) => b[4])) lines.push('', '**規則內部矛盾**：R2 規定「比較前 risk 先四捨五入到小數 3 位」，0.1499／0.3499／0.5999 取三位後就是 0.150／0.350／0.600，必然落入上一檔；但 R2 又要求它們命中 低／中／高。兩句不能同時成立。本輪不自行取捨，照規則字面（先取三位）判這 3 個邊界值未通過，另列「不取三位」的結果（7 個全符）；列為待決問題。實際遊戲中的 risk 由 0.04／0.22／0.30 乘上 R 與倍率得出，這個矛盾只影響剛好落在 [0.1495, 0.15)、[0.3495, 0.35)、[0.5995, 0.60) 的值。');
  lines.push('', 'R2 手算預期：', '', '| 情境 | 預期 risk | 預期檔 | 實算 | 實得檔 | 符合 |', '|---|---|---|---|---|---|');
  hand.forEach((h) => lines.push('| ' + [h[0], h[1].toFixed(3), h[2], h[3].toFixed(3), h[4], h[5] ? '是' : '**否**'].join(' | ') + ' |'));
  lines.push('', '最壞組合（R=1.8、黑夜 ×2、霧 ×1.2、超載 ×1.4、獸潮 ×1.5）：' + worst.map((w) => w[0] + ' 未封頂 ' + w[1].toFixed(3) + ' → 封頂 ' + w[2].toFixed(3) + '（' + w[3] + '）').join('；') + '。全部 ≤ 0.85（靠封頂）。');
  return { pass, maxRisk, nOver, rawOver, bndOk: bnd.every((b) => b[4]), handOk: hand.every((h) => h[5]), worst, lines, n: rows.length };
}
/* ---------- 來源表 ---------- */
function sources(variant) {
  const D = g.data(); const item = {}, enemy = {};
  const add = (m, k, node, why) => { m[k] = m[k] || []; if (!m[k].some((x) => x.node === node)) m[k].push({ node, why }); };
  const drops = (eid) => { const E = D.ENEMIES[eid]; const out = []; if (E.beast) { if (E.skin && E.skin[1] > 0) out.push('hide'); if (E.meat && E.meat[1] > 0) out.push('meat'); if (E.extra) out.push(E.extra); } if (E.drop) out.push(E.drop[0]); return out; };
  Object.keys(D.WILDS).forEach((nd) => {
    const W = D.WILDS[nd];
    W.points.forEach((p) => {
      if (p.item) add(item, p.item, nd, '採集點 ' + p.label);
      if (p.enemy) { add(enemy, p.enemy, nd, '獸跡 ' + p.label); drops(p.enemy).forEach((it) => add(item, it, nd, p.enemy + ' 掉落（獸跡）')); }
    });
    if (variant === 'V2' && W.ambush && W.ambush.enemy) { add(enemy, W.ambush.enemy, nd, '遇襲'); drops(W.ambush.enemy).forEach((it) => add(item, it, nd, W.ambush.enemy + ' 掉落（採集遇襲）')); }
  });
  // QUEST_GEN.where（委託板上寫的地點）
  const byName = {}; Object.keys(D.NODES).forEach((k) => (byName[D.NODES[k].name] = k));
  Object.keys(D.QUEST_GEN.where).forEach((e) => D.QUEST_GEN.where[e].split('・').forEach((nm) => { if (byName[nm] && !(enemy[e] || []).some((s) => s.node === byName[nm])) add(enemy, e, byName[nm], 'QUEST_GEN.where'); }));
  if (variant === 'V2') Object.keys(D.DUNGEONS).forEach((nd) => D.DUNGEONS[nd].floors.forEach((fl, i) => fl.forEach((e) => { if (!(enemy[e] || []).some((s) => s.node === nd)) add(enemy, e, nd, '地城第 ' + (i + 1) + ' 層'); drops(e).forEach((it) => { if (!(item[it] || []).some((s) => s.node === nd)) add(item, it, nd, e + ' 掉落（地城）'); }); })));
  return { item, enemy };
}
function siteTier(node) { const D = g.data(); const r = (D.WILDS[node] || D.DUNGEONS[node] || {}).risk; return C.SITE_MAP[r] || null; }
let _routes = null;
function routeOf(from, to) { // game.js route()（不改檔，直接呼叫；全新遊戲狀態，隱藏地點未知）
  if (!_routes) { _routes = {}; g.setupPlayer(1, { origin: 'drifter' }); }
  const k = from + '>' + to; if (_routes[k]) return _routes[k];
  const es = g.inst().G.route(from, to); const base = es.length === 0 ? null : es.some((e) => !e.road) ? (es.length > 1 ? 300 : 220) : 40;
  return (_routes[k] = { edges: es.map((e) => ({ a: e.a, b: e.b, h: e.h, road: !!e.road })), stops: es.stops.slice(), base, wild: es.some((e) => !e.road), hours: es.reduce((a, e) => a + e.h, 0) });
}
// 基準條件：白天、不超載、無獸潮、天候取當日、R 取現值
function baseTier(town, node, R, wx) {
  const rt = routeOf(town, node); const Rv = rt.wild ? R.wild : R.road;
  const raw = (rt.base / 1000) * Rv * T.WX_RISK[wx]; const r = C.r1000(Math.min(0.85, raw));
  return { route: C.tierOf1000(r), r };
}
function questTier(town, srcs, R, wx) {
  let best = null;
  (srcs || []).forEach((s) => { const b = baseTier(town, s.node, R, wx); const st = siteTier(s.node); const t = C.TIER[Math.max(C.tierIdx(b.route), C.tierIdx(st))]; if (!best || C.tierIdx(t) < C.tierIdx(best.t)) best = { t, node: s.node, r: b.r, st }; });
  return best;
}
/* ---------- C2 抽樣 ---------- */
const SEEDS = 200, DAYS = 60, K = 10;
function c2() {
  const D = g.data(); const V1 = sources('V1'), V2 = sources('V2');
  const pool = D.QUEST_GEN.collect.pool.map((x) => x[0]);
  const cnt = () => ({ '低': 0, '中': 0, '高': 0, '極高': 0, n: 0 });
  const A = { drawSun: cnt(), draw: cnt(), board: cnt(), drawV2: cnt(), boardV2: cnt(), kill: cnt(), killV2: cnt(), deliver: cnt() };
  const perItem = {}; pool.forEach((it) => (perItem[it] = { V1: cnt(), V2: cnt() }));
  const killPer = {}; const csvS = []; let Rmin = Infinity, Rmax = -Infinity, wxCount = { sun: 0, rain: 0, fog: 0, snow: 0 };
  const bump = (c, t) => { c[t]++; c.n++; };
  for (let seed = 0; seed < SEEDS; seed++) {
    const W = Wd.newWorld(seed);
    for (let i = 0; i < DAYS; i++) {
      if (i > 0) Wd.tick(W); // 第 i 次日結後 → 遊戲第 i+1 日
      const Obar = (W.towns.huiyao.O + W.towns.duyin.O) / 2; const R = { wild: T.R_wild(W.B, Obar), road: T.R_road(Obar) };
      Rmin = Math.min(Rmin, R.wild, R.road); Rmax = Math.max(Rmax, R.wild, R.road);
      const wx = T.weatherOfWday(seed, i); wxCount[wx]++;
      const dayTiers = {};
      // (a) 抽樣：每 seed・每日從 QUEST_GEN.collect.pool 等機率抽 K 張（同 game.js pick(G.collect.pool)；不做同物去重）
      for (let k = 0; k < K; k++) {
        const it = pool[Math.floor(wrnd(seed, 't3v5-collect', i, k) * pool.length)];
        const q1 = questTier('huiyao', V1.item[it], R, wx), q2 = questTier('huiyao', V2.item[it], R, wx);
        bump(A.draw, q1.t); bump(A.drawV2, q2.t); bump(A.drawSun, questTier('huiyao', V1.item[it], R, 'sun').t); bump(perItem[it].V1, q1.t); bump(perItem[it].V2, q2.t);
      }
      // (b) 世界模型委託板當日新生成的單（sim/lib/world.js genQuests，含去重）
      W.quests.filter((q) => q.day === W.day).forEach((q) => {
        if (q.kind === 'collect' && q.town === 'huiyao') { bump(A.board, questTier('huiyao', V1.item[q.item], R, wx).t); bump(A.boardV2, questTier('huiyao', V2.item[q.item], R, wx).t); }
        if (q.kind === 'kill') {
          const s1 = V1.enemy[q.enemy]; const k1 = s1 ? questTier(q.town, s1, R, wx) : null;
          const key = q.town + ':' + q.enemy; const kp = killPer[key] || (killPer[key] = cnt());
          if (k1) { bump(A.kill, k1.t); bump(kp, k1.t); const k2 = questTier(q.town, V2.enemy[q.enemy] || s1, R, wx); bump(A.killV2, k2.t); }
          else { const b = baseTier(q.town, 'chakou', R, wx); kp.none = (kp.none || 0) + 1; kp.n++; kp.noneTier = b.route; }
        }
        if (q.kind === 'deliver') { const to = q.town === 'huiyao' ? 'duyin' : 'huiyao'; /* world.js 不記 to；兩個方向都算，取較高者 */
          const tiers = ['duyin', 'poxiao', 'huiyao'].filter((x) => x !== q.town).map((x) => baseTier(q.town, x, R, wx).route); bump(A.deliver, C.TIER[Math.max(...tiers.map(C.tierIdx))]); void to; }
      });
      csvS.push([seed, i, W.day, R.wild, R.road, wx]);
    }
  }
  const tb = (c) => C.TIER.map((t) => t + ' ' + c[t] + '（' + (c.n ? C.pctCI(c[t], c.n) : 'NA') + '）').join('；');
  const ok = (c) => Math.abs(c['中'] / c.n - 6 / 9) <= 0.03 && Math.abs(c['高'] / c.n - 3 / 9) <= 0.03 && c['低'] === 0 && c['極高'] === 0;
  // 來源差異
  const srcTxt = (S) => pool.map((it) => D.ITEMS[it].name + '：' + (S.item[it] || []).map((s) => D.NODES[s.node].name + '〔' + siteTier(s.node) + '〕').join('、')).join('；');
  const lines = ['**C2. 抽樣**：世界模型 `sim/lib/world.js`（seed＝0..' + (SEEDS - 1) + '，每 seed 第 0..' + (DAYS - 1) + ' 日＝遊戲第 1..' + DAYS + ' 日，無玩家介入）取當日 R（野徑 `R_wild(B,Ō)`、官道 `R_road(Ō)`）與天候（`weatherOfWday(seed, 第 i 日)`）。本範圍 R 實際 ' + r3(Rmin) + '–' + r3(Rmax) + '；天候日數 晴 ' + wxCount.sun + '、雨 ' + wxCount.rain + '、霧 ' + wxCount.fog + '、雪 ' + wxCount.snow + '（第 1–60 日是春夏，沒有雪）。', '',
    '委託池：`data.js` QUEST_GEN.collect.pool ＝ ' + pool.map((it) => D.ITEMS[it].name).join('、') + '（' + pool.length + ' 項，與 R2 所列相同）。', '',
    '來源（V1＝採集點＋獸跡＋QUEST_GEN.where，主讀法）：' + srcTxt(V1) + '。', '',
    '來源（V2＝V1 再加採集遇襲敵人與地城各層敵人的掉落）：' + srcTxt(V2) + '。', '',
    '| 樣本 | 張數 | 四檔（Wilson 95% CI） | 判準 中 66.7%／高 33.3%（±3pp）、低／極高 0 |', '|---|---|---|---|',
    '| 抽樣 V1（主）：每 seed 每日抽 ' + K + ' 張 | ' + A.draw.n + ' | ' + tb(A.draw) + ' | **' + C.U.verdict(ok(A.draw)) + '** |',
    '| 抽樣 V2 | ' + A.drawV2.n + ' | ' + tb(A.drawV2) + ' | ' + C.U.verdict(ok(A.drawV2)) + '（資訊） |',
    '| 診斷：同一批抽樣 V1，但天候一律當晴（×1） | ' + A.drawSun.n + ' | ' + tb(A.drawSun) + ' | ' + C.U.verdict(ok(A.drawSun)) + '（診斷，不是規則） |',
    '| 世界模型委託板當日新單 V1（含去重）  | ' + A.board.n + ' | ' + tb(A.board) + ' | ' + C.U.verdict(ok(A.board)) + '（資訊，張數 <20000） |',
    '| 世界模型委託板當日新單 V2 | ' + A.boardV2.n + ' | ' + tb(A.boardV2) + ' | 資訊 |', ''];
  lines.push('未通過原因（V1）：「高」多出來的部分全來自雨／霧天。野徑多段基礎 0.30 × R × 天候：雨 ×1.1 時 R ≥ 1.0591、霧 ×1.2 時 R ≥ 0.9709（含取三位進位）就取到 0.350 →「高」；本範圍 R 為 ' + r3(Rmin) + '–' + r3(Rmax) + '，所以經岔口兩段以上的 5 項（清心葉、獸皮、生肉、粗鐵、赤銅）在霧天全部變「高」（R 最低 ' + r3(Rmin) + ' > 0.9709）、雨天在 R 偏高時變「高」。R2 的預期（中 6/9、高 3/9）等於沒有算天候倍率；天候一律當晴的診斷列落在判準內（見上表）。', '');
  lines.push('各物品（抽樣 V1／V2）：', '', '| 物品 | 張數 | V1 低／中／高／極高 | V2 低／中／高／極高 |', '|---|---|---|---|');
  pool.forEach((it) => { const a = perItem[it].V1, b = perItem[it].V2; lines.push('| ' + [D.ITEMS[it].name, a.n, C.TIER.map((t) => a[t]).join('／'), C.TIER.map((t) => b[t]).join('／')].join(' | ') + ' |'); });
  lines.push('', '（資訊）獵殺單（世界模型委託板當日新單，三個委託板）V1：' + A.kill.n + ' 張，' + tb(A.kill) + '；V2：' + tb(A.killV2) + '。', '');
  lines.push('| 委託板:敵人 | 張數 | 低／中／高／極高 | 無地點 |', '|---|---|---|---|');
  Object.keys(killPer).sort().forEach((k) => { const c = killPer[k]; lines.push('| ' + [k, c.n, C.TIER.map((t) => c[t]).join('／'), c.none ? c.none + '（劫匪沒有固定地點，不計入上面的分布）' : '0'].join(' | ') + ' |'); });
  lines.push('', '（資訊）送貨單（世界模型委託板當日新單）：' + A.deliver.n + ' 張，' + tb(A.deliver) + '（world.js 不記目的地，取兩個可能目的地中較高的險級）。');
  C.writeCsv('tier-sample-days', ['seed', 'day_index', 'game_day', 'R_wild', 'R_road', 'weather'], csvS);
  const sumRows = [];
  [['draw-V1', A.draw], ['draw-V2', A.drawV2], ['board-V1', A.board], ['board-V2', A.boardV2], ['kill-V1', A.kill], ['kill-V2', A.killV2], ['deliver', A.deliver]].forEach(([k, c]) => C.TIER.forEach((t) => { const [lo, hi] = c.n ? wilson(c[t], c.n) : [NaN, NaN]; sumRows.push([k, t, c[t], c.n, c.n ? c[t] / c.n : NaN, lo, hi]); }));
  pool.forEach((it) => ['V1', 'V2'].forEach((v) => C.TIER.forEach((t) => sumRows.push(['item-' + v + ':' + it, t, perItem[it][v][t], perItem[it][v].n, perItem[it][v][t] / perItem[it][v].n, '', '']))));
  C.writeCsv('tier-sample', ['sample', 'tier', 'count', 'n', 'p', 'wilson_lo', 'wilson_hi'], sumRows);
  return { A, ok: ok(A.draw), lines, Rmin, Rmax, perItem };
}
/* ---------- C3 送貨走官道 ---------- */
function c3() {
  const D = g.data(); const lines = ['**C3. 送貨路線**（`game.js` 的 `route()` 直接呼叫，全新遊戲狀態；Dijkstra 以基礎時數為權重，`dist[u]+e.h < dist[v]` 嚴格小於才換路）：', '', '| 起 → 迄 | route() 實際走的邊 | 基礎時數 | 全官道？ | 等長的野徑路線 | R=1 白天／黑夜 risk | 險級 |', '|---|---|---|---|---|---|---|'];
  // 列舉所有簡單路徑找等長替代
  const adj = {}; D.EDGES.forEach((e) => { if (D.NODES[e.a].hidden || D.NODES[e.b].hidden) return; (adj[e.a] = adj[e.a] || []).push([e.b, e]); (adj[e.b] = adj[e.b] || []).push([e.a, e]); });
  function allPaths(a, b, maxH) { const out = []; const dfs = (u, vis, es, h) => { if (h > maxH) return; if (u === b) { out.push(es.slice()); return; } (adj[u] || []).forEach(([v, e]) => { if (vis.has(v)) return; vis.add(v); es.push(e); dfs(v, vis, es, h + e.h); es.pop(); vis.delete(v); }); }; dfs(a, new Set([a]), [], 0); return out; }
  const pairs = [['huiyao', 'duyin'], ['duyin', 'huiyao'], ['huiyao', 'poxiao'], ['poxiao', 'huiyao'], ['duyin', 'poxiao'], ['poxiao', 'duyin']];
  let allRoad = true; const csv = [];
  pairs.forEach(([a, b]) => {
    const rt = routeOf(a, b); const road = !rt.wild; if (!road) allRoad = false;
    const alts = allPaths(a, b, rt.hours).filter((p) => p.reduce((s, e) => s + e.h, 0) === rt.hours && p.some((e) => !e.road));
    const d = C.riskExact([rt.base, 1000, 1000, 1000]), n = C.riskExact([rt.base, 1000, 2000, 1000]);
    const path = [a].concat(rt.stops).map((k) => D.NODES[k].name).join('→');
    lines.push('| ' + [D.NODES[a].name + ' → ' + D.NODES[b].name, path, rt.hours, road ? '是' : '**否（走野徑）**', alts.length ? alts.map((p) => { let c = a; return [a].concat(p.map((e) => (c = e.a === c ? e.b : e.a))).map((k) => D.NODES[k].name).join('→'); }).join('；') : '無', (d.risk / 1000).toFixed(3) + '／' + (n.risk / 1000).toFixed(3), C.tierOf1000(d.risk) + '／' + C.tierOf1000(n.risk)].join(' | ') + ' |');
    csv.push([a, b, path, rt.hours, road ? 'road' : 'wild', alts.length, d.risk / 1000, n.risk / 1000]);
  });
  C.writeCsv('deliver-routes', ['from', 'to', 'route', 'base_h', 'kind', 'equal_length_wild_alternatives', 'risk_day_R1', 'risk_night_R1'], csv);
  // R 全範圍下官道送貨仍為「低」？
  const worstRoad = C.riskExact([40, 1500, 2000, 1200]);
  lines.push('', '→ ' + (allRoad ? '六個方向 route() **全部走官道**' : '**有方向走野徑**') + '。灰窯↔渡陰、灰窯↔破曉營都有一條等長的野徑（經野徑岔口；灰窯↔破曉營另經青霧藥林、亂葬古窯），route() 因嚴格小於、且官道邊在 `EDGES` 與節點順序上先被鬆弛，保留官道。官道 R_road 上限 1.5 × 黑夜 × 霧 ＝ ' + (worstRoad.risk / 1000).toFixed(3) + '（' + C.tierOf1000(worstRoad.risk) + '），送貨單在任何 R／時段／天候下都是「低」。');
  lines.push('', '註：tie-break 依賴 Dijkstra 取最小 dist 時「先出現者優先」（`Object.keys(D.NODES)` 順序：渡陰關在亂葬古窯之前、官道驛站在野徑岔口之前）。若之後改了 NODES／EDGES 順序，等長時可能改走野徑；規格沒有寫 tie-break，列為待決問題。');
  return { allRoad, lines };
}
module.exports = { c1, c2, c3, sources, routeOf, siteTier };
