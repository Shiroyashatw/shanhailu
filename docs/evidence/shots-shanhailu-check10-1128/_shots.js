const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const PR = '/home/user/shanhailu', MAIN = '/home/user/sh-main';
const OUT = path.join(PR, 'docs/evidence/shots-shanhailu-check10-1128');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const serve = (ROOT) => new Promise((r) => {
  const s = http.createServer((q, res) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => r(s));
});
const res = {};
const measure = (page) => page.evaluate(() => {
  const r = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), text: e.textContent }; };
  const cols = {}; ['col-left', 'col-center', 'col-right'].forEach((id) => { const b = document.getElementById(id).getBoundingClientRect(); cols[id] = Math.round(b.width); });
  const o = { pname: r('[data-testid=pname]'), age: r('[data-testid=age]'), loc: r('[data-testid=loc]'), date: r('[data-testid=date]'), silver: r('.silver'), clock: r('[data-testid=clock]'), hp: r('[data-testid=hp]'), cols, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, bsw: document.body.scrollWidth, bsh: document.body.scrollHeight };
  const ov = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const hits = []; for (const k of ['pname', 'age']) for (const x of ['loc', 'date', 'silver', 'clock', 'hp']) if (ov(o[k], o[x])) hits.push(k + 'x' + x);
  if (ov(o.pname, o.age)) hits.push('pname x age');
  o.hits = hits; return o;
});
(async () => {
  const sp = await serve(PR), sm = await serve(MAIN);
  const bp = 'http://127.0.0.1:' + sp.address().port + '/', bm = 'http://127.0.0.1:' + sm.address().port + '/';
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(String(e)));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n), clip: { x: 0, y: 0, width: 1280, height: 720 } });

  await page.goto(bp + 'index.html?seed=11281128&fresh=1&fx=0'); await page.waitForSelector('[data-testid=origin]');
  res.title = { cards: (await page.$$('[data-testid^=origin-]')).length, text: (await page.textContent('[data-testid=origin]')).replace(/\s+/g, ' ') };
  await shot('00-title-one-card.png');
  await page.click('[data-testid=origin-drifter]'); await page.waitForSelector('[data-testid=naming]');
  res.namingDefault = { sur: await page.inputValue('[data-testid=name-sur]'), given: await page.inputValue('[data-testid=name-given]'), right: await page.textContent('[data-testid=pname]'), age: await page.textContent('[data-testid=age]') };
  await page.fill('[data-testid=name-sur]', '端木'); await page.fill('[data-testid=name-given]', '青');
  res.naming = await measure(page); res.naming.preview = await page.textContent('[data-testid=name-preview]');
  await shot('01-naming-preview-twoline.png');
  const pool = await page.evaluate(() => window.SHL_DATA.NAME_POOL.map((p) => p[0] + p[1]));
  const seen = [];
  for (let i = 0; i < 20; i++) { await page.click('[data-testid=btn-name-random]'); seen.push((await page.inputValue('[data-testid=name-sur]')) + (await page.inputValue('[data-testid=name-given]'))); }
  res.random = { allInPool: seen.every((x) => pool.includes(x)), sample: seen.slice(0, 8) };
  await page.fill('[data-testid=name-sur]', '端木'); await page.fill('[data-testid=name-given]', '青');
  await page.click('[data-testid=btn-name-confirm]'); await page.waitForSelector('[data-testid=town]'); await page.waitForTimeout(300);
  res.wake = await measure(page); res.wake.log = (await page.textContent('[data-testid=log]')).slice(0, 80);
  res.wake.state = await page.evaluate(() => { const S = window.SHL.state; return { name: S.name, origin: S.origin, silver: S.silver, attr: Object.values(S.attr), profNonZero: Object.values(S.prof).map((p) => p.lv).filter((x) => x), main: S.equip.main && S.equip.main.base, chest: S.equip.chest && S.equip.chest.base }; });
  await shot('02-wake-right-twoline.png');

  await page.click('[data-testid=npc-np_story]'); await page.waitForTimeout(300);
  res.story = { say: await page.textContent('[data-testid=say]'), who: await page.textContent('[data-testid=street-dialog] .sname b'), m: await measure(page) };
  await shot('04-storyteller-duanmu.png');

  // real old save produced by main @ de91435 (name is the string '沈衡', origin hunter)
  const p2 = await ctx.newPage(); await p2.goto(bm + 'index.html?seed=777&fresh=1&origin=hunter&fx=0'); await p2.waitForSelector('[data-testid=town]');
  const oldSave = await p2.evaluate(() => localStorage.getItem('shanhailu.save')); await p2.close();
  res.oldSaveMain = { name: JSON.parse(oldSave).state.name, origin: JSON.parse(oldSave).state.origin, schema: JSON.parse(oldSave).schema };
  await page.evaluate((s) => localStorage.setItem('shanhailu.save', s), oldSave);
  await page.goto(bp + 'index.html?fx=0'); await page.waitForSelector('[data-testid=town]'); await page.waitForTimeout(300);
  res.oldA = { state: await page.evaluate(() => window.SHL.state.name), saved: await page.evaluate(() => JSON.parse(localStorage.getItem('shanhailu.save')).state.name), right: await page.textContent('[data-testid=pname]') };
  const B = [];
  for (const sd of [1, 42, 99999]) {
    const w = JSON.parse(oldSave); delete w.state.name; w.state.seed = sd;
    await page.evaluate((s) => localStorage.setItem('shanhailu.save', s), JSON.stringify(w));
    await page.goto(bp + 'index.html?fx=0'); await page.waitForSelector('[data-testid=town]');
    B.push(await page.evaluate(() => window.SHL.state.name));
  }
  res.oldB = B; await page.waitForTimeout(300);
  res.oldB_m = await measure(page);
  await shot('03-oldsave-fallback-shenheng.png');
  await page.click('[data-testid=sys-log]'); await page.waitForTimeout(200);
  res.oldB_logOverlay = (await page.textContent('[data-testid=overlay-log]')).replace(/\s+/g, ' ').slice(0, 200);
  await shot('03b-oldsave-log-overlay.png');
  res.consoleErrors = errs;
  fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  await br.close(); sp.close(); sm.close();
})();
