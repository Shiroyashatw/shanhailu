/* check16：PR #16 合併 main 後的獨立截圖與畫面檢查（1280×720）
 * 用法：node docs/evidence/shots-shanhailu-check16-1128/check16.js
 * 只讀遊戲狀態與 DOM，不改遊戲程式。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
let fails = 0;
function check(name, ok, detail) {
  if (!ok) fails++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail === undefined ? '' : '  — ' + JSON.stringify(detail)));
}
const BAD = /獵殺劫匪|野徑一帶|剿匪/;

(async () => {
  const srv = http.createServer((req, resp) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { resp.writeHead(404); return resp.end('404'); }
    resp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(resp);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n), clip: { x: 0, y: 0, width: 1280, height: 720 } }).then(() => console.log('SHOT  ' + n));

  await page.goto(base + 'index.html?seed=20261128&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');

  // 1) 鎮上主畫面：駐軍 2 檔 → 2 名巡邏走動；同時匪勢拉高（B 90），確認沒有「剿匪」鈕
  await page.evaluate(() => { const S = window.SHL.state; S.world.tide = null; S.world.next = 1e9; S.world.region.B = 90; const t = S.world.towns.huiyao; t.P = 60; t.Geff = 2; t.Gnom = 2; S.loc = 'huiyao'; window.SHL.setTab(null); });
  await page.waitForTimeout(800);
  const a = await page.evaluate(() => ({ patrol: document.querySelectorAll('.walker.patrol').length, anon: document.querySelectorAll('.walker.anon').length,
    pos: Array.from(document.querySelectorAll('.walker')).map((e) => Math.round(e.getBoundingClientRect().left)), body: document.querySelector('#app').innerText,
    btns: Array.from(document.querySelectorAll('#app button')).map((b) => b.textContent).filter((t) => /剿匪/.test(t)) }));
  await shot('c16-01-town-walkers-patrol-a.png');
  await page.waitForTimeout(1500);
  const b = await page.evaluate(() => Array.from(document.querySelectorAll('.walker')).map((e) => Math.round(e.getBoundingClientRect().left)));
  await shot('c16-02-town-walkers-patrol-b-1500ms.png');
  check('DEV-03 並存：灰窯 Geff 2 有 2 名巡邏與路人走動者', a.patrol === 2 && a.anon > 0, { patrol: a.patrol, anon: a.anon });
  check('DEV-03 並存：1.5 秒後走動者位置有變', b.some((x, i) => x !== a.pos[i]), { a: a.pos, b });
  check('AC-E12 鎮上主畫面無「剿匪」鈕／字樣（B 90）', a.btns.length === 0 && !BAD.test(a.body), a.btns);

  // 2) 委託板：B 90 下連跑 20 天刷新，最後開兩鎮委託板截圖，資料與畫面都不得有剿匪單
  const q = await page.evaluate(() => {
    const G = window.SHL, S = G.state, D = window.SHL_DATA; const bad = []; let kills = 0;
    for (let k = 0; k < 20; k++) { S.world.region.B = 90; const d = G.dayOf(S.t) + 1; S.t = (d - 1) * 1440; G._debug.newDay(d);
      S.quests.forEach((x) => { if (x.kind === 'kill' && !x.fixed) { kills++; if (x.enemy === 'bandit' || /劫匪|野徑一帶/.test(x.title)) bad.push(x.title); } }); }
    return { bad, kills, pool: D.QUEST_GEN.kill.pool.length, where: D.QUEST_GEN.where.bandit, bq: D.QUEST_GEN.bandit, kinds: D.QUEST_GEN.kinds };
  });
  check('資料：kill 類只來自既有 8 張模板，無劫匪題／野徑一帶', q.bad.length === 0 && q.pool === 8 && q.where === undefined && q.bq === undefined && q.kills > 0, q);
  check('資料：兩鎮委託種類基礎權重 collect 45／kill 35／deliver 20', ['huiyao', 'duyin'].every((t) => JSON.stringify(q.kinds[t]) === '{"collect":45,"kill":35,"deliver":20}'), q.kinds);
  for (const [town, n] of [['huiyao', 'c16-03-board-huiyao.png'], ['duyin', 'c16-04-board-duyin.png']]) {
    const tab = await page.evaluate((town) => { const G = window.SHL, S = G.state; S.loc = town; S.scene = 'town'; const id = window.SHL_DATA.PLACES[town].board; G.setTab(id); return id; }, town);
    await page.waitForFunction((id) => window.SHL.state.townTab === id, tab);
    await page.waitForTimeout(300);
    const txt = await page.evaluate(() => ({ body: document.querySelector('#app').innerText, btn: Array.from(document.querySelectorAll('#app button')).map((b) => b.textContent).filter((t) => /剿匪/.test(t)) }));
    await shot(n);
    check('AC-E12 ' + town + ' 委託板畫面（' + tab + '）無「獵殺劫匪」「野徑一帶」「剿匪」', /過期撕榜/.test(txt.body) && !BAD.test(txt.body) && txt.btn.length === 0, { tab });
  }

  // 3) 野徑「劫匪攔路」：事件畫面 → 入戰 → 擊殺 → 掉落
  await page.evaluate(() => { const G = window.SHL, S = G.state; G.setTab(null); S.loc = 'chakou'; S.event = { id: 'bandit', dest: 'chakou', result: null }; S.scene = 'event'; });
  await page.evaluate(() => window.SHL.setProfTab(window.SHL.state.profTab)); // 觸發重繪
  await page.waitForTimeout(300);
  const evTxt = await page.evaluate(() => document.querySelector('#app').innerText);
  await shot('c16-05-bandit-ambush-event.png');
  check('野徑「劫匪攔路」事件畫面出現', /劫匪攔路/.test(evTxt));
  await page.evaluate(() => window.SHL.eventChoose('fight'));
  await page.waitForTimeout(300);
  const ids = await page.evaluate(() => window.SHL.state.combat ? window.SHL.state.combat.enemies.map((e) => e.id) : null);
  await shot('c16-06-bandit-combat.png');
  const loot = await page.evaluate(() => { const G = window.SHL, S = G.state; const B0 = S.world.region.B;
    S.combat.enemies.forEach((e) => G._debug.killEnemy(e)); G._debug.victory(); G.setProfTab(S.profTab); return { silver: S.loot && S.loot.silver, dB: S.world.region.B - B0 }; });
  await page.waitForTimeout(300);
  await shot('c16-07-bandit-loot.png');
  check('劫匪攔路入戰（敵人＝劫匪）', JSON.stringify(ids) === '["bandit"]', ids);
  check('擊殺劫匪掉落 3–7 兩、匪勢 B −2.5', loot.silver >= 3 && loot.silver <= 7 && Math.abs(loot.dB + 2.5) < 1e-9, loot);

  // 4) 掉落抽樣：同一路徑 200 次，掉落全在 3–7
  const samp = await page.evaluate(() => { const G = window.SHL, S = G.state; const v = new Set(); let bad = 0;
    for (let i = 0; i < 200; i++) { S.loot = null; S.combat = null; S.loc = 'chakou'; S.event = { id: 'bandit', dest: 'chakou', result: null }; S.scene = 'event'; G.eventChoose('fight');
      if (!S.combat) { bad++; continue; } S.combat.enemies.forEach((e) => G._debug.killEnemy(e)); G._debug.victory(); const s = S.loot && S.loot.silver; v.add(s); if (!(s >= 3 && s <= 7)) bad++; }
    return { bad, seen: Array.from(v).sort() }; });
  check('劫匪攔路 200 次擊殺掉落全在 3–7 兩', samp.bad === 0, samp);
  check('無頁面錯誤', errs.length === 0, errs.slice(0, 3));
  console.log(fails ? 'RESULT FAIL ' + fails : 'RESULT ALL PASS');
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})();
