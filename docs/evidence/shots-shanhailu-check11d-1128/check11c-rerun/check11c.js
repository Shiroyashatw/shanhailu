/* shanhailu-check11c-1128 獨立驗收腳本（一次性，不屬於正式測試）
 * 用法：node docs/evidence/shots-shanhailu-check11c-1128/check11c.js [OLD_ROOT_4bb6f26] [OLD_ROOT_3fc260f]
 *   OLD_ROOT_* 為 `git archive <sha> | tar -x` 解出的舊版樹（露宿行為同 seed 比對用）；不給則略過該段。
 * 期望值皆依 SPEC-TIME 7.1／7.1b／AC 20／AC 21、SPEC-01 §4.8（R_road／R_wild）自行推導；不呼叫被驗程式算期望值。
 *   - 路線險值（自寫）：基礎 官道 0.04／野徑單段 0.22／野徑多段 0.30；黑夜 ×2；超載 ×1.4；野徑且腳程 25 ×0.8；野徑且獸潮 ×1.5；×R；封頂 0.85。
 *   - 取三位（自寫）：十進位字串 half-up，不靠浮點乘法。
 *   - route（自寫）：DFS 窮舉所有簡單路徑，四層比較 (1) 總時數 (2) 野徑段數 (3) 險值三位 (4) 節點 id 序列字典序。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../../..');
const OUT = __dirname;
const SEED = 20261127;
const OLD = process.argv.slice(2);
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
}
function note(s) { console.log('NOTE  ' + s); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
function serve(root) {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root) || !fs.existsSync(f)) { resp.writeHead(404); return resp.end('404'); }
      resp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
async function open(browser, root) {
  const srv = await serve(root);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');
  return { srv, ctx, page, errs };
}

// 露宿同 seed 情境：各荒野 × 白天／黑夜 × 40 個 rng 起點，記錄是否夜警與疲累
async function campVector(page) {
  return page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state;
    const out = [];
    Object.keys(D.WILDS).forEach((id) => [12, 22].forEach((hh) => { for (let k = 0; k < 40; k++) {
      S.combat = null; S.event = null; S.dead = null; S.overlay = null;
      S.known[id] = true; S.loc = id; G.enterHere();
      S.t = 3 * 1440 + hh * 60; S.hp = G.maxHp(); S.food = 100; S.fat = 60; S.fire = true; S.rng = (1000003 * (k + 1)) >>> 0;
      G.camp();
      out.push(id + '@' + hh + '#' + k + ':' + (S.combat ? 'W' : '-') + ':' + Math.round(S.fat));
      S.combat = null;
    } }));
    return { v: out, risk: Object.fromEntries(Object.keys(D.WILDS).map((k) => [k, D.WILDS[k].risk])) };
  });
}

(async () => {
  // ---------- 0. 源碼／資料靜態掃描 ----------
  const srcHits = [];
  ['index.html', 'js', 'css'].forEach((p) => {
    const walk = (f) => { const st = fs.statSync(f); if (st.isDirectory()) fs.readdirSync(f).forEach((x) => walk(path.join(f, x))); else { fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (l.includes('中高')) srcHits.push(path.relative(ROOT, f) + ':' + (i + 1)); }); } };
    walk(path.join(ROOT, p));
  });
  check('[AC 21 源碼] index.html／js／css 全部檔案不含「中高」', srcHits.length === 0, srcHits);

  const browser = await chromium.launch();
  const cur = await open(browser, ROOT);
  const page = cur.page;

  // ---------- 1. 露宿：同 seed 比對（先做，避免其他操作影響） ----------
  const campNow = await campVector(page);
  for (const old of OLD) {
    const o = await open(browser, path.resolve(old));
    const v = await campVector(o.page);
    const diff = v.v.filter((x, i) => x !== campNow.v[i]);
    const nW = (arr, id, hh) => arr.filter((x) => x.startsWith(id + '@' + hh + '#') && x.split(':')[1] === 'W').length;
    check('[AC 21 露宿] ' + path.basename(old) + ' 與 57a5b83 同 seed：' + campNow.v.length + ' 次露宿的夜警與疲累結果完全一致', diff.length === 0 && v.v.length === campNow.v.length,
      { oldRisk: v.risk, diffN: diff.length, sample: diff.slice(0, 4), 夜警次數_fuzhao_白天_黑夜: [nW(v.v, 'fuzhao', 12), nW(v.v, 'fuzhao', 22)] });
    o.srv.close(); await o.ctx.close();
  }
  note('57a5b83 荒野險級：' + JSON.stringify(campNow.risk));

  // ---------- 2. AC 21：遍歷全部地點／建築／荒野／地城／地圖／覆蓋層 ----------
  await page.goto(page.url()); await page.waitForSelector('[data-testid=town]');
  const ids = await page.evaluate(() => { const D = window.SHL_DATA; return { nodes: Object.keys(D.NODES).map((k) => [k, D.NODES[k].kind]), blds: Object.keys(D.BUILDINGS).map((b) => [b, D.BUILDINGS[b].place]), dataHas: JSON.stringify(D).includes('中高') }; });
  check('[AC 21 資料] SHL_DATA 整份序列化不含「中高」', !ids.dataHas);
  const scan = {}; const pills = {};
  const grab = async (key) => { const t = await page.evaluate(() => document.body.innerText + '\n' + document.body.innerHTML); scan[key] = t.includes('中高'); return t; };
  for (const [id, kind] of ids.nodes) {
    await page.evaluate((id) => { const G = window.SHL, S = G.state; S.known[id] = true; S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.loc = id; G.enterHere(); }, id);
    await page.waitForTimeout(30);
    await grab('node:' + id);
    if (kind !== 'town') pills[id] = await page.evaluate(() => { const p = [...document.querySelectorAll('.stagehead .pill')].find((e) => e.textContent.startsWith('險 ')); return p ? [p.textContent, p.classList.contains('hot')] : null; });
    if (kind === 'town') for (const [b, pl] of ids.blds) if (pl === id) { await page.evaluate((b) => window.SHL.setTab(b), b); await page.waitForTimeout(20); await grab('bld:' + b); await page.evaluate(() => window.SHL.setTab(null)); }
  }
  // 地圖：區域／全圖兩種視圖 × 每個目的地的預覽
  await page.evaluate(() => { const G = window.SHL, S = G.state; S.loc = 'huiyao'; G.enterHere(); G.toMap(); });
  for (const v of ['region', 'world']) {
    await page.evaluate((v) => window.SHL.setMapView(v), v);
    for (const [id] of ids.nodes) { await page.evaluate((id) => window.SHL.selectDest(id), id); await page.waitForTimeout(10); await grab('map:' + v + ':' + id); }
  }
  // 日誌：趕路到腐骨沼 → 生火 → 露宿 → 去沉淵祭窟 → 下一層；再開覆蓋層
  const lg = await page.evaluate(() => {
    const G = window.SHL, S = G.state; S.overlay = null; S.combat = null; S.event = null;
    S.loc = 'huiyao'; G.enterHere(); S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.t = Math.floor(S.t / 1440) * 1440 + 1440 + 10 * 60;
    G.toMap(); G.selectDest('fuzhao'); G.travel(); S.combat = null; S.event = null; S.loc = 'fuzhao'; G.enterHere();
    G.camp(); G.camp(); const camped = S.log.some((l) => l.text.startsWith('露宿 8 小時'));
    S.combat = null; S.event = null; G.toMap(); G.selectDest('jiku'); G.travel(); S.combat = null; S.event = null; S.loc = 'jiku'; G.enterHere();
    return { camped, n: S.log.length, text: S.log.map((l) => l.text).join('\n') };
  });
  for (const o of ['log', 'journal', 'char', 'faction', 'help']) { await page.evaluate((o) => { const S = window.SHL.state; S.overlay = null; window.SHL.setOverlay(o); }, o); await page.waitForTimeout(30); await grab('overlay:' + o); }
  await page.evaluate(() => { window.SHL.state.overlay = null; });
  const badScr = Object.keys(scan).filter((k) => scan[k]);
  check('[AC 21 畫面] 遍歷 ' + Object.keys(scan).length + ' 個畫面（全部節點 ' + ids.nodes.length + '、城內建築、地圖兩視圖×各目的地、5 種覆蓋層）innerText＋innerHTML 皆無「中高」', badScr.length === 0, badScr);
  check('[AC 21 日誌] 含露宿的日誌（' + lg.n + ' 行，露宿=' + lg.camped + '）不含「中高」', lg.camped && !lg.text.includes('中高'), lg.text.split('\n').slice(-5));
  check('[AC 21] 腐骨沼、沉淵祭窟顯示「險 高」', pills.fuzhao && pills.fuzhao[0] === '險 高' && pills.jiku && pills.jiku[0] === '險 高', { fuzhao: pills.fuzhao, jiku: pills.jiku });
  note('各荒野／地城險級 pill [文字, hot]：' + JSON.stringify(pills));

  // ---------- 3. AC 20 測點 ----------
  const pts = [[0.149, '低'], [0.150, '中'], [0.349, '中'], [0.350, '高'], [0.599, '高'], [0.600, '極高'], [0.85, '極高'], [0.1495, '中'], [0.9, '極高'], [0.3495, '高'], [0.5995, '極高'], [0.1494, '低']];
  const got = await page.evaluate((pts) => pts.map(([r]) => window.SHL.riskTier(r)), pts);
  check('[AC 20] 0.149／0.150／0.349／0.350／0.599／0.600／0.85／0.1495／0.9（＋0.3495／0.5995／0.1494）→ 低／中／中／高／高／極高／極高／中／極高（＋高／極高／低）', got.every((g, i) => g === pts[i][1]), pts.map((p, i) => p[0] + '→' + got[i]));

  // ---------- 4. route() 四層 vs 自寫暴力窮舉；routeRisk／travelPreview 一致 ----------
  const rt = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state;
    // ---- 自寫參考實作 ----
    const k3 = (x) => { const r = Math.min(0.85, x); const s = r.toFixed(12); const [i, f] = s.split('.'); return Number(i) * 1000 + Number(f.slice(0, 3)) + (Number(f[3]) >= 5 ? 1 : 0); };
    const tier = (x) => { const k = k3(x); return k < 150 ? '低' : k < 350 ? '中' : k < 600 ? '高' : '極高'; };
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const Rof = (wild) => { const W = S.world; if (!W.towns) return 1; const Ob = (W.towns.huiyao.O + W.towns.duyin.O) / 2, B = W.region.B; return wild ? clamp(1 + 0.012 * (B - 30) - 0.010 * (Ob - 57.5), 0.5, 1.8) : clamp(1 - 0.015 * (Ob - 57.5), 0.5, 1.5); };
    const hr = (t) => Math.floor((t % 1440) / 60);
    const cond = () => ({ night: hr(S.t) >= 20 || hr(S.t) < 5, heavy: false, jiao: (S.prof.jiao ? S.prof.jiao.lv : 0) >= 25, tide: !!(S.world.tide && Math.floor(S.t / 1440) + 1 >= S.world.tide.start && Math.floor(S.t / 1440) + 1 <= S.world.tide.end), heavyOverride: null });
    let C = null;
    const myRisk = (edges) => {
      const wild = edges.some((e) => !e.road); let r = wild ? (edges.length > 1 ? 0.30 : 0.22) : 0.04;
      if (C.night) r *= 2; if (C.heavy) r *= 1.4; if (wild && C.jiao) r *= 0.8; if (wild && C.tide) r *= 1.5;
      return Math.min(0.85, r * Rof(wild));
    };
    const lex = (x, y) => { for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return x.length - y.length; };
    const brute = (from, to) => {
      const adj = {}; D.EDGES.forEach((e) => { if (!G.known(e.a) || !G.known(e.b)) return; (adj[e.a] = adj[e.a] || []).push([e.b, e]); (adj[e.b] = adj[e.b] || []).push([e.a, e]); });
      const all = [];
      const dfs = (u, seen, nodes, edges) => { if (u === to) { all.push({ nodes: nodes.slice(), edges: edges.slice() }); return; } (adj[u] || []).forEach(([v, e]) => { if (seen.has(v)) return; seen.add(v); nodes.push(v); edges.push(e); dfs(v, seen, nodes, edges); nodes.pop(); edges.pop(); seen.delete(v); }); };
      if (from !== to) dfs(from, new Set([from]), [from], []);
      all.forEach((p) => { p.h = p.edges.reduce((s, e) => s + e.h, 0); p.w = p.edges.filter((e) => !e.road).length; p.r = k3(myRisk(p.edges)); });
      all.sort((x, y) => x.h - y.h || x.w - y.w || x.r - y.r || lex(x.nodes, y.nodes));
      if (!all.length) return { best: null, layer: 0 };
      const b = all[0], c = all[1]; let layer = 0;
      if (c) layer = c.h !== b.h ? 1 : c.w !== b.w ? 2 : c.r !== b.r ? 3 : 4;
      return { best: b, layer, n: all.length };
    };
    const keepE = D.EDGES.slice(); const ks = Object.keys(D.NODES), vs = ks.map((k) => D.NODES[k]);
    const setN = (rev) => { ks.forEach((k) => delete D.NODES[k]); (rev ? ks.slice().reverse() : ks).forEach((k) => (D.NODES[k] = vs[ks.indexOf(k)])); };
    const setE = (list) => { D.EDGES.length = 0; list.forEach((e) => D.EDGES.push(e)); };
    const variants = (list) => [['正常', list, 0], ['EDGES反轉', list.slice().reverse(), 0], ['NODES反轉', list, 1], ['兩者反轉', list.slice().reverse(), 1], ['端點對調', list.map((e) => Object.assign({}, e, { a: e.b, b: e.a })), 0], ['端點對調＋兩者反轉', list.map((e) => Object.assign({}, e, { a: e.b, b: e.a })).reverse(), 1]];
    const S0 = { t: S.t, loc: S.loc, known: Object.assign({}, S.known), world: JSON.parse(JSON.stringify(S.world)) };

    // 情境：時段 × 獸潮 × R（改 B／O）× 隱藏點；各情境下全部起訖對
    const scen = [];
    const day = Math.floor(S.t / 1440);
    [[12, '白天'], [22, '黑夜']].forEach(([hh, tn]) => [0, 1].forEach((tide) => [[null, 'R起手'], [{ B: 70, O: 30 }, 'R高(B70,O30)'], [{ B: 5, O: 90 }, 'R低(B5,O90)']].forEach(([bo, rn]) => [0, 1].forEach((hid) => scen.push({ hh, tn, tide, bo, rn, hid })))));
    const summary = []; const mism = []; const layerHits = { 1: 0, 2: 0, 3: 0, 4: 0 }; const l3pairs = []; const l4pairs = []; let pairsTotal = 0;
    const riskMism = []; let riskChecks = 0;
    scen.forEach((sc) => {
      S.t = day * 1440 + sc.hh * 60; S.world = JSON.parse(JSON.stringify(S0.world));
      S.world.tide = sc.tide ? { start: day + 1, end: day + 1 } : null;
      if (sc.bo && S.world.towns) { S.world.region.B = sc.bo.B; S.world.towns.huiyao.O = sc.bo.O; S.world.towns.duyin.O = sc.bo.O; }
      S.known = Object.assign({}, S0.known); if (sc.hid) ks.forEach((k) => { if (D.NODES[k].hidden) S.known[k] = true; });
      C = cond(); C.heavy = ['heavy', 'over'].includes(G.loadBand().id);
      const label = sc.tn + (sc.tide ? '・獸潮' : '') + '・' + sc.rn + (sc.hid ? '・隱藏點全知' : '');
      const known = ks.filter((k) => G.known(k));
      // 期望（原圖）
      const want = {};
      known.forEach((a) => known.forEach((b) => { if (a !== b) { const B = brute(a, b); want[a + '>' + b] = B; } }));
      let bad = 0;
      variants(keepE).forEach(([vn, list, nr]) => {
        setE(list); setN(nr);
        known.forEach((a) => known.forEach((b) => {
          if (a === b) return; pairsTotal++;
          const e = G.route(a, b); const seq = [a].concat(e.stops || []).join('>');
          const W = want[a + '>' + b]; const ws = W.best ? W.best.nodes.join('>') : '';
          const wh = W.best ? W.best.h : 0, ww = W.best ? W.best.w : 0;
          const gh = e.reduce((s, x) => s + x.h, 0), gw = e.filter((x) => !x.road).length;
          if (seq !== ws || gh !== wh || gw !== ww) { bad++; if (mism.length < 10) mism.push({ label, vn, a, b, got: seq, want: ws }); }
          if (vn === '正常') {
            layerHits[W.layer] = (layerHits[W.layer] || 0) + 1;
            if (W.layer === 3) l3pairs.push(label + '：' + ws);
            if (W.layer === 4) l4pairs.push(label + '：' + ws);
            // routeRisk 與自寫險值、travelPreview 險級
            if (e.length) {
              riskChecks++;
              const rr = G.routeRisk(e), mine = myRisk(e);
              if (Math.abs(rr - mine) > 1e-12 || G.riskTier(rr) !== tier(mine)) riskMism.push({ label, a, b, rr, mine });
              if (a === S0.loc || a === 'huiyao') {
                const sl = S.loc; S.loc = a; const p = G.travelPreview(b); S.loc = sl;
                if (Math.abs(p.risk - mine) > 1e-12 || p.riskName !== tier(mine) || p.riskName !== G.riskTier(G.routeRisk(G.route(a, b)))) riskMism.push({ label, a, b, prev: [p.risk, p.riskName], mine: [mine, tier(mine)] });
              }
            }
          }
        }));
      });
      setE(keepE); setN(0);
      summary.push(label + ' 錯 ' + bad);
    });
    S.t = S0.t; S.loc = S0.loc; S.known = S0.known; S.world = S0.world;

    // ---- 自造決勝案例（期望值手寫，另以暴力窮舉複核；兩方向 × 6 種排列） ----
    C = { night: false, heavy: false, jiao: false, tide: false };
    const syn = [
      // L3：直達野徑 3h（單段 0.22）vs 經岔口 官道 2h＋野徑 1h（多段 0.30）；節點序 huiyao>chakou>yizhan 字典序較小，若只看第 4 層會選錯
      { name: 'L3 險值決勝（白天）', edges: [{ a: 'huiyao', b: 'yizhan', h: 3 }, { a: 'huiyao', b: 'chakou', h: 2, road: true }, { a: 'chakou', b: 'yizhan', h: 1 }], from: 'huiyao', to: 'yizhan', want: 'huiyao>yizhan', layer: 3, t: 12 },
      // 同圖，黑夜＋獸潮：0.22×2×1.5=0.66 vs 0.30×2×1.5=0.90→0.85，仍由第 3 層決（660 < 850）
      { name: 'L3 險值決勝（黑夜獸潮，一條封頂）', edges: null, from: 'huiyao', to: 'yizhan', want: 'huiyao>yizhan', layer: 3, t: 22, tide: 1 },
      // 同圖，黑夜＋獸潮＋R_wild 高（B=70、Ō=30 → R_wild=1+0.48+0.275=1.755）：0.22×2×1.5×1.755=1.158、0.30×…=1.580，兩條都封頂 850 → 第 3 層平手 → 第 4 層選 huiyao>chakou>yizhan
      { name: 'L3 封頂平手→L4（黑夜獸潮 R_wild 1.755）', edges: null, from: 'huiyao', to: 'yizhan', want: 'huiyao>chakou>yizhan', layer: 4, t: 22, tide: 1, bo: { B: 70, O: 30 } },
      // L4：經 guyao（野 1＋官 1）vs 經 poxiao（官 1＋野 1），三項全同 → guyao < poxiao
      { name: 'L4 字典序（同長）', edges: [{ a: 'huiyao', b: 'poxiao', h: 1, road: true }, { a: 'poxiao', b: 'duyin', h: 1 }, { a: 'huiyao', b: 'guyao', h: 1 }, { a: 'guyao', b: 'duyin', h: 1, road: true }], from: 'huiyao', to: 'duyin', want: 'huiyao>guyao>duyin', layer: 4, t: 12 },
      // L4：不同節點數：huiyao>chakou>kugu>duyin（官1 官1 野1）vs huiyao>yizhan>duyin（野2 官1），時數 3、野 1、多段 0.30 全同 → chakou < yizhan
      { name: 'L4 字典序（不同段數）', edges: [{ a: 'huiyao', b: 'yizhan', h: 2 }, { a: 'yizhan', b: 'duyin', h: 1, road: true }, { a: 'huiyao', b: 'chakou', h: 1, road: true }, { a: 'chakou', b: 'kugu', h: 1, road: true }, { a: 'kugu', b: 'duyin', h: 1 }], from: 'huiyao', to: 'duyin', want: 'huiyao>chakou>kugu>duyin', layer: 4, t: 12 },
    ];
    syn[1].edges = syn[0].edges; syn[2].edges = syn[0].edges;
    const sres = [];
    const kn = Object.assign({}, S.known); ks.forEach((k) => (S.known[k] = true));
    const w0 = JSON.parse(JSON.stringify(S.world));
    const bag = S.pack ? S.pack.slice() : null;
    syn.forEach((c) => {
      S.t = day * 1440 + c.t * 60; S.world.tide = c.tide ? { start: day + 1, end: day + 1 } : null;
      const bo = c.bo || { B: 30, O: 57.5 }; // 預設 R=1
      if (S.world.towns) { S.world.region.B = bo.B; S.world.towns.huiyao.O = bo.O; S.world.towns.duyin.O = bo.O; }
      C = { night: c.t >= 20 || c.t < 5, heavy: false, jiao: false, tide: !!c.tide };
      const heavyOK = G.loadBand().id === 'light'; // 自造案例皆輕裝，C.heavy=false 須與遊戲狀態相符
      const fails = []; let brOK = true; let n = 0;
      variants(c.edges).forEach(([vn, list, nr]) => {
        setE(list); setN(nr);
        [[c.from, c.to, c.want], [c.to, c.from, c.want.split('>').reverse().join('>')]].forEach(([a, b, wexp]) => {
          n++;
          const B = brute(a, b);
          // 反方向的期望以暴力為準（第 4 層字典序依起點不同可能不同），正方向同時比手寫期望
          const exp = a === c.from ? wexp : B.best.nodes.join('>');
          if (a === c.from && (B.best.nodes.join('>') !== wexp || B.layer !== c.layer)) brOK = false;
          const e = G.route(a, b); const got = [a].concat(e.stops).join('>');
          if (got !== exp) fails.push(vn + ' ' + a + '→' + b + ' got ' + got + ' want ' + exp);
        });
      });
      setE(keepE); setN(0);
      sres.push({ name: c.name, n, fails, bruteAgreesWithHand: brOK, heavyOK });
    });
    S.known = kn; S.world = w0; S.t = S0.t;
    const restored = D.EDGES.length === keepE.length && D.EDGES.every((e, i) => e === keepE[i]) && Object.keys(D.NODES).join() === ks.join();
    return { summary, mism, layerHits, l3pairs: [...new Set(l3pairs)], l4pairs: [...new Set(l4pairs)], pairsTotal, riskMism: riskMism.slice(0, 10), nRiskMism: riskMism.length, riskChecks, sres, restored, nScen: scen.length };
  });
  check('[route] 真實地圖 ' + rt.nScen + ' 種情境（白天／黑夜 × 獸潮有無 × R 三種 × 隱藏點）× 6 種排列（正常、EDGES 反轉、NODES 反轉、兩者反轉、端點對調、端點對調＋兩者反轉）共 ' + rt.pairsTotal + ' 次 route()，與自寫四層暴力窮舉的節點序列完全一致', rt.mism.length === 0, rt.mism.length ? rt.mism : undefined);
  note('各情境錯誤數：' + rt.summary.join('；'));
  note('真實地圖（正常排列）決勝層分布 {層:對數}：' + JSON.stringify(rt.layerHits) + '（0＝唯一路徑）');
  note('真實地圖第 3 層決勝的路線：' + (rt.l3pairs.length ? rt.l3pairs.join('、') : '無'));
  note('真實地圖第 4 層決勝的路線：' + (rt.l4pairs.length ? rt.l4pairs.join('、') : '無'));
  check('[routeRisk] ' + rt.riskChecks + ' 條路線：routeRisk() = 自寫險值、riskTier(routeRisk) = 自寫分檔；自灰窯出發的 travelPreview risk／riskName 與兩者一致', rt.nRiskMism === 0, rt.nRiskMism ? rt.riskMism : undefined);
  rt.sres.forEach((s) => check('[route 自造] ' + s.name + '：暴力窮舉與手寫期望一致，且 route() ' + s.n + ' 次（2 方向 × 6 排列）全對', s.fails.length === 0 && s.bruteAgreesWithHand && s.heavyOK, s.fails.length ? s.fails : undefined));
  check('[route] 測後 EDGES／NODES 還原', rt.restored);

  // ---------- 5. 截圖 ----------
  await page.evaluate(() => { const G = window.SHL, S = G.state; S.combat = null; S.event = null; S.overlay = null; S.loc = 'jiku'; G.enterHere(); });
  await page.waitForSelector('[data-testid=dungeon]');
  const jp = await page.evaluate(() => [...document.querySelectorAll('.stagehead .pill')].map((e) => e.textContent).find((t) => t.startsWith('險 ')));
  await page.screenshot({ path: path.join(OUT, 'jiku-risk-gao.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await page.evaluate(() => { const G = window.SHL, S = G.state; S.loc = 'fuzhao'; G.enterHere(); });
  await page.waitForSelector('[data-testid=wild]');
  const fp = await page.evaluate(() => [...document.querySelectorAll('.stagehead .pill')].map((e) => e.textContent).find((t) => t.startsWith('險 ')));
  await page.screenshot({ path: path.join(OUT, 'fuzhao-risk-gao.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  check('[截圖] jiku-risk-gao.png「' + jp + '」、fuzhao-risk-gao.png「' + fp + '」', jp === '險 高' && fp === '險 高');
  if (!rt.l3pairs.length) note('真實地圖沒有第 3 層決勝的路線（全部情境、含隱藏點），第 3 層路線預覽截圖不適用；改以自造 L3 圖截一張地圖預覽 synthetic-l3-preview.png（僅示意，非真實地圖）');
  {
    const info = await page.evaluate(() => {
      const G = window.SHL, D = window.SHL_DATA, S = G.state;
      window.__keepE = D.EDGES.slice(); D.EDGES.length = 0;
      [{ a: 'huiyao', b: 'yizhan', h: 3 }, { a: 'huiyao', b: 'chakou', h: 2, road: true }, { a: 'chakou', b: 'yizhan', h: 1 }].forEach((e) => D.EDGES.push(e));
      S.loc = 'huiyao'; S.t = Math.floor(S.t / 1440) * 1440 + 12 * 60; G.enterHere(); G.toMap(); G.selectDest('yizhan');
      const p = G.travelPreview('yizhan'); return { via: p.via, risk: p.risk, tier: p.riskName, hours: p.hours, n: p.edges.length };
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, 'synthetic-l3-preview.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
    await page.evaluate(() => { const D = window.SHL_DATA; D.EDGES.length = 0; window.__keepE.forEach((e) => D.EDGES.push(e)); });
    check('[截圖 synthetic-l3-preview.png] 自造 L3 圖：灰窯→官道驛站 3h 直達野徑（單段），預覽經「野徑」、risk 0.22×R', info.via === '野徑' && info.n === 1 && info.hours >= 3, info);
  }

  check('console 0 error', cur.errs.length === 0, cur.errs.slice(0, 5));
  await browser.close(); cur.srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS');
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
