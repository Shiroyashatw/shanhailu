/* shanhailu-check11b-1128 獨立驗收腳本（一次性，不屬於正式測試）
 * 用法：node docs/evidence/shots-shanhailu-check11b-1128/check11b.js
 * 驗：AC 20 險級測點、riskTier 對照參考實作全掃、route() 對照暴力窮舉（字典序 (時數, 野徑段數)）
 *     於正常／EDGES 反轉／NODES 反轉／兩者皆反轉、自造等長情境、源碼殘留三檔判斷、地圖預覽截圖（中／高／極高）。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = __dirname;
const SEED = 20261127;
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { resp.writeHead(404); return resp.end('404'); }
      resp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  // ---------- 1. 源碼靜態檢查：沒有殘留三檔路程險級判斷 ----------
  const game = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
  const ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
  const oldTri = /risk\s*<\s*0\.15\s*\?|risk\s*<\s*0\.35|<\s*0\.35\s*\?\s*'中'/;
  check('[源碼] game.js／ui.js 無舊三檔判斷（risk < 0.15 ? … < 0.35 ? …）', !oldTri.test(game) && !oldTri.test(ui));
  const tierAssign = (game.match(/riskName\s*=/g) || []).length;
  check('[源碼] game.js 中 riskName 只有一處賦值，且來自 riskTier()', tierAssign === 1 && /const riskName = riskTier\(risk\);/.test(game), { count: tierAssign });
  const uiRisk = ui.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /riskName|p\.risk\b/.test(l)).map(([n]) => n);
  check('[源碼] ui.js 路程險級只讀 p.riskName（無自行用 p.risk 分檔）', !/p\.risk\s*[<>]/.test(ui), { lines: uiRisk });
  check('[源碼] ui.js 出發條「高」「極高」都上 hot 樣式', /p\.riskName === '高' \|\| p\.riskName === '極高' \? ' hot'/.test(ui));

  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');

  // ---------- 2. riskTier 測點與全掃 ----------
  const tv = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA;
    const pts = [0.149, 0.150, 0.349, 0.350, 0.599, 0.600, 0.85, 0.1495, 0.1494, 0.3495, 0.3494, 0.5995, 0.5994, 0.9, 0];
    const pt = pts.map((r) => [r, G.riskTier(r)]);
    // 參考實作：用十進位字串做精確 half-up 取三位（不靠浮點乘法），封頂 0.85
    const ref = (risk) => {
      const r = Math.min(0.85, risk);
      const s = r.toFixed(12); const [i, f] = s.split('.');
      let k = Number(i) * 1000 + Number(f.slice(0, 3)) + (Number(f[3]) >= 5 ? 1 : 0);
      return k < 150 ? '低' : k < 350 ? '中' : k < 600 ? '高' : '極高';
    };
    const bad = [];
    for (let n = 0; n <= 100000; n++) { const r = n / 100000; if (G.riskTier(r) !== ref(r)) bad.push(r); }
    // 實際乘法產生的值（浮點誤差情境）：基礎 × 時段 × 負重 × R
    const prods = []; [0.04, 0.22, 0.3].forEach((b) => [1, 2].forEach((n) => [1, 1.4].forEach((l) => [0.8, 1].forEach((j) => { for (let R = 0.5; R <= 2.0001; R += 0.0001) prods.push(b * n * l * j * R); }))));
    const badP = prods.filter((r) => G.riskTier(r) !== ref(r));
    return { cuts: D.TIME.RISK_CUTS, tiers: D.TIME.RISK_TIERS, cap: D.WORLD.RISK_CAP, pt, bad: bad.slice(0, 10), nbad: bad.length, nprod: prods.length, badP: badP.slice(0, 10) };
  });
  const T = Object.fromEntries(tv.pt.map(([r, t]) => [String(r), t]));
  check('D.TIME.RISK_CUTS=[0.15,0.35,0.6]、四檔 低／中／高／極高、RISK_CAP=0.85', JSON.stringify(tv.cuts) === '[0.15,0.35,0.6]' && tv.tiers.join() === '低,中,高,極高' && tv.cap === 0.85, { cuts: tv.cuts, tiers: tv.tiers, cap: tv.cap });
  check('AC 20：0.149／0.150／0.349／0.350／0.599／0.600／0.85 → 低／中／中／高／高／極高／極高',
    ['0.149', '0.15', '0.349', '0.35', '0.599', '0.6', '0.85'].map((k) => T[k]).join('／') === '低／中／中／高／高／極高／極高', tv.pt.slice(0, 7));
  check('half-up：0.1495→中、0.1494→低、0.3495→高、0.3494→中、0.5995→極高、0.5994→高',
    T['0.1495'] === '中' && T['0.1494'] === '低' && T['0.3495'] === '高' && T['0.3494'] === '中' && T['0.5995'] === '極高' && T['0.5994'] === '高', tv.pt.slice(7, 13));
  check('0.9 先封頂 0.85 再分檔 → 極高；0 → 低', T['0.9'] === '極高' && T['0'] === '低', tv.pt.slice(13));
  check('riskTier 對照十進位參考實作：0～1 每 0.00001 共 100001 點全一致', tv.nbad === 0, { nbad: tv.nbad, sample: tv.bad });
  check('riskTier 對照參考實作：實際乘積組合 ' + tv.nprod + ' 個值全一致', tv.badP.length === 0, tv.badP);

  // ---------- 3. route()：暴力窮舉對照 ----------
  const rt = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA;
    const keepE = D.EDGES.slice(); const ks = Object.keys(D.NODES), vs = ks.map((k) => D.NODES[k]);
    const setN = (rev) => { ks.forEach((k) => delete D.NODES[k]); (rev ? ks.slice().reverse() : ks).forEach((k) => (D.NODES[k] = vs[ks.indexOf(k)])); };
    const setE = (list) => { D.EDGES.length = 0; list.forEach((e) => D.EDGES.push(e)); };
    // 暴力：所有簡單路徑，取 (時數, 野徑段數) 最小值
    const brute = (from, to) => {
      const adj = {}; D.EDGES.forEach((e) => { if (!G.known(e.a) || !G.known(e.b)) return; (adj[e.a] = adj[e.a] || []).push([e.b, e]); (adj[e.b] = adj[e.b] || []).push([e.a, e]); });
      let best = null; const ties = [];
      const dfs = (u, seen, h, w, path) => {
        if (best && h > best[0]) return;
        if (u === to) { if (!best || h < best[0] || (h === best[0] && w < best[1])) best = [h, w]; ties.push([h, w, path.slice()]); return; }
        (adj[u] || []).forEach(([v, e]) => { if (seen.has(v)) return; seen.add(v); path.push(e); dfs(v, seen, h + e.h, w + (e.road ? 0 : 1), path); path.pop(); seen.delete(v); });
      };
      dfs(from, new Set([from]), 0, 0, []);
      const sameH = best ? ties.filter((t) => t[0] === best[0]) : [];
      const roadAll = sameH.some((t) => t[1] === 0); const wildAlt = sameH.some((t) => t[1] > 0);
      return { best, tie: roadAll && wildAlt };
    };
    const ids = ks.filter((k) => G.known(k));
    const sweep = (label) => {
      const mism = []; let n = 0; const tiePairs = [];
      ids.forEach((a) => ids.forEach((b) => {
        if (a === b) return; n++;
        const e = G.route(a, b); const h = e.reduce((x, y) => x + y.h, 0), w = e.filter((y) => !y.road).length;
        const B = brute(a, b);
        if (!B.best || h !== B.best[0] || w !== B.best[1]) mism.push({ a, b, got: [h, w], want: B.best });
        if (B.tie) tiePairs.push({ a, b, h, allRoad: w === 0 });
      }));
      return { label, n, mism: mism.slice(0, 5), nm: mism.length, tiePairs };
    };
    const out = [];
    out.push(sweep('正常'));
    setE(keepE.slice().reverse()); out.push(sweep('EDGES 反轉'));
    setN(1); out.push(sweep('EDGES＋NODES 反轉'));
    setE(keepE); out.push(sweep('NODES 反轉'));
    setN(0);
    // 隱藏點全知（S.known 全開）再掃一次
    const S = G.state; const kk = Object.assign({}, S.known); ks.forEach((k) => { if (D.NODES[k].hidden) S.known[k] = true; });
    const ids2 = ks.filter((k) => G.known(k)); ids.length = 0; ids2.forEach((x) => ids.push(x));
    out.push(sweep('隱藏點全知'));
    setE(keepE.slice().reverse()); setN(1); out.push(sweep('隱藏點全知＋EDGES＋NODES 反轉'));
    setE(keepE); setN(0); S.known = kk;
    // 自造等長：三條平行 A→B（官道 3、野徑 3、野徑 1+2），及官道多一段但等長 vs 野徑少段
    const syn = {
      丙_平行三路: [{ a: 'huiyao', b: 'duyin', h: 3 }, { a: 'huiyao', b: 'chakou', h: 1 }, { a: 'chakou', b: 'duyin', h: 2 }, { a: 'huiyao', b: 'duyin', h: 3, road: true }],
      丁_官道三段對野徑一段: [{ a: 'huiyao', b: 'duyin', h: 3 }, { a: 'huiyao', b: 'yizhan', h: 1, road: true }, { a: 'yizhan', b: 'poxiao', h: 1, road: true }, { a: 'poxiao', b: 'duyin', h: 1, road: true }],
      戊_混合1野對2野: [{ a: 'huiyao', b: 'chakou', h: 1 }, { a: 'chakou', b: 'duyin', h: 1 }, { a: 'huiyao', b: 'yizhan', h: 1, road: true }, { a: 'yizhan', b: 'duyin', h: 1 }],
    };
    const sres = {};
    Object.keys(syn).forEach((c) => [0, 1].forEach((er) => [0, 1].forEach((nr) => {
      setE(er ? syn[c].slice().reverse() : syn[c]); setN(nr);
      const go = G.route('huiyao', 'duyin'), back = G.route('duyin', 'huiyao');
      const w = (x) => x.filter((e) => !e.road).length, h = (x) => x.reduce((s, e) => s + e.h, 0);
      sres[c + (er ? '・E反' : '') + (nr ? '・N反' : '')] = [h(go), w(go), h(back), w(back)];
    })));
    setE(keepE); setN(0);
    const restored = D.EDGES.every((e, i) => e === keepE[i]) && D.EDGES.length === keepE.length && Object.keys(D.NODES).join() === ks.join();
    return { out, sres, restored };
  });
  rt.out.forEach((s) => check('[route] ' + s.label + '：全部 ' + s.n + ' 對地點的 (時數, 野徑段數) 與暴力窮舉最小值一致', s.nm === 0, s.nm ? s.mism : undefined));
  const ties = rt.out[0].tiePairs;
  check('[route] 真實地圖等長情境（同時數下有全官道與含野徑兩種走法）全部選全官道：' + ties.map((t) => t.a + '→' + t.b + '(' + t.h + 'h)').join('、'),
    ties.length > 0 && rt.out.every((s) => s.tiePairs.every((t) => t.allRoad)), { count: ties.length });
  const sOk = Object.entries(rt.sres).every(([k, v]) => {
    if (k.startsWith('丙')) return v.join() === '3,0,3,0';
    if (k.startsWith('丁')) return v.join() === '3,0,3,0';
    if (k.startsWith('戊')) return v.join() === '2,1,2,1';
    return false;
  });
  check('[route] 自造等長（丙 平行三路、丁 官道三段 vs 野徑一段、戊 1 段野徑 vs 2 段野徑）× EDGES／NODES 反轉：皆取野徑段數最少者', sOk, rt.sres);
  check('[route] 測後 EDGES／NODES 還原', rt.restored);

  // ---------- 4. 截圖：地圖路程預覽 中／高／極高 ----------
  const cases = [
    ['map-preview-zhong.png', 'chakou', 12, '中'],   // 白天 野徑單段 0.22
    ['map-preview-gao.png', 'chakou', 22, '高'],     // 黑夜 野徑單段 0.44
    ['map-preview-jigao.png', 'qingwu', 22, '極高'], // 黑夜 野徑多段 0.60
    ['map-preview-di.png', 'duyin', 12, '低'],       // 對照：白天 官道
  ];
  for (const [name, dest, hh, want] of cases) {
    const info = await page.evaluate(([dest, hh]) => {
      const G = window.SHL, D = window.SHL_DATA, S = G.state;
      S.loc = 'huiyao'; S.t = 2 * 1440 + hh * 60; G.toMap(); G.selectDest(dest);
      const p = G.travelPreview(dest);
      return { dest: D.NODES[dest] ? D.NODES[dest].name : dest, risk: p.risk, R: p.R, tier: p.riskName, wild: p.wild, n: p.edges.length, clock: G.fmtTime(S.t) };
    }, [dest, hh]);
    await page.waitForTimeout(150);
    const dom = await page.evaluate(() => {
      const pill = [...document.querySelectorAll('[data-testid=departbar] .vpill')].find((x) => x.textContent.startsWith('險'));
      const tip = document.querySelector('[data-testid=route-tip]');
      return { pill: pill ? pill.textContent : null, hot: pill ? pill.classList.contains('hot') : null, tip: tip ? tip.textContent : null, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight };
    });
    const ok = info.tier === want && dom.pill === '險' + want && (dom.tip || '').endsWith('險 ' + want) && dom.hot === (want === '高' || want === '極高') && dom.sw <= 1280 && dom.sh <= 720;
    check('[截圖 ' + name + '] 灰窯→' + info.dest + ' ' + info.clock + ' risk=' + info.risk.toFixed(4) + '（R=' + info.R.toFixed(4) + '）→「' + want + '」，出發條與氣泡一致、hot=' + dom.hot, ok, Object.assign({}, info, dom));
    await page.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  }

  check('console 0 error', errs.length === 0, errs.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS');
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
