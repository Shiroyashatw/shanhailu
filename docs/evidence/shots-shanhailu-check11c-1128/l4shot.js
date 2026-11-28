/* shanhailu-check11c-1128：真實地圖第 4 層決勝路線預覽截圖（青霧藥林→赤石廢礦）
 * 候選（自行手算）：qingwu>chakou>chishi（野 1h＋野 2h）與 qingwu>kugu>chishi（野 1h＋野 2h）：時數 3、野徑 2 段、險值同為多段 0.30×R → 第 4 層 chakou < kugu，應經「野徑岔口」。
 * 用法：node docs/evidence/shots-shanhailu-check11c-1128/l4shot.js */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
  await pg.goto('http://127.0.0.1:' + srv.address().port + '/index.html?seed=20261127&fresh=1&origin=drifter&fx=0'); await pg.waitForSelector('[data-testid=town]');
  const res = [];
  for (const [n, rev] of [['正常', 0], ['EDGES 反轉', 1]]) {
    res.push(await pg.evaluate(([rev]) => { const G = window.SHL, D = window.SHL_DATA, S = G.state; const keep = D.EDGES.slice(); if (rev) { D.EDGES.reverse(); }
      S.loc = 'qingwu'; S.t = Math.floor(S.t / 1440) * 1440 + 1440 + 12 * 60; G.enterHere(); G.toMap(); G.selectDest('chishi');
      const p = G.travelPreview('chishi'); const out = { via: p.via, stops: p.edges.stops, hours: p.hours, risk: p.risk, tier: p.riskName };
      if (rev) { D.EDGES.length = 0; keep.forEach((e) => D.EDGES.push(e)); G.selectDest('chishi'); } return out; }, [rev]));
  }
  await pg.waitForTimeout(150);
  const tip = await pg.evaluate(() => { const t = document.querySelector('[data-testid=route-tip]'); const bar = document.querySelector('[data-testid=departbar]'); return { tip: t && t.textContent, bar: bar && bar.innerText }; });
  await pg.screenshot({ path: path.join(__dirname, 'real-l4-preview-qingwu-chishi.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  const ok = res.every((r) => r.via === '野徑岔口' && r.stops.join() === 'chakou,chishi' && r.hours === 3);
  console.log((ok ? 'PASS' : 'FAIL') + '  真實地圖第 4 層：青霧藥林→赤石廢礦 經野徑岔口（正常／EDGES 反轉皆同） — ' + JSON.stringify({ res, tip }));
  await b.close(); srv.close(); process.exit(ok ? 0 : 1);
})();
