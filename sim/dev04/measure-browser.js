'use strict';
/* 瀏覽器版事件實測：與 tests/measure-dev04-bandit.js 第 2 段相同迴圈（不改原檔），只多了 ?seed 參數與逐趟紀錄（晝夜、時數、事件 id）。
 * 用法：node sim/dev04/measure-browser.js 20261127 20261128 → 印 JSON。需要 playwright（雲端已預裝）。 */
const http = require('http'); const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript; charset=utf-8' : p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); });
  await new Promise((res) => srv.listen(0, '127.0.0.1', res));
  const browser = await chromium.launch(); const outAll = [];
  for (const seed of process.argv.slice(2).map(Number)) {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html?seed=' + seed + '&fresh=1&origin=drifter&fx=0');
    await page.waitForSelector('[data-testid=town]');
    const out = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const D = window.SHL_DATA;
      S.world.tide = null; S.world.next = 1e9;
      let hours = 0, bandits = 0, ev = 0, nightTrips = 0, nightEv = 0, nightBandits = 0, nightHours = 0; const evIds = {}; const long = [];
      for (let k = 0; k < 4000; k++) {
        S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.dead = null; S.combat = null; S.event = null; S.scene = 'map';
        const to = S.loc === 'huiyao' ? 'chakou' : 'huiyao';
        const before = S.t; const night = G.isNight(S.t); G.selectDest(to); G.travel(); const dh = (S.t - before) / 60; hours += dh;
        if (dh !== 1 && long.length < 10) long.push({ k, dh, from: S.loc, to, t: before });
        if (night) { nightTrips++; nightHours += dh; if (S.event) nightEv++; }
        if (S.event) { ev++; evIds[S.event.id] = (evIds[S.event.id] || 0) + 1; if (S.event.id === 'bandit') { bandits++; if (night) nightBandits++; } S.event = null; S.scene = 'map'; S.loc = to; }
        S.world.region.B = 30; S.world.region.crew = 4;
        ['huiyao', 'duyin'].forEach((t) => { S.world.towns[t].O = D.WORLD.START[t].O; S.world.towns[t].P = D.WORLD.START[t].P; });
      }
      return { trips: 4000, hours, events: ev, evIds, bandits, nightTrips, nightHours, nightEv, nightBandits, long, hPerBandit: hours / bandits };
    });
    out.seed = seed; outAll.push(out); await page.close();
  }
  console.log(JSON.stringify(outAll)); await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(2); });
