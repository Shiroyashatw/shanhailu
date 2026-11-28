/* 《山海錄》DEV-04 量測（非驗收）：劫匪實際出現的地點與每頭搜尋時間（SPEC-01 v0.4 §15 Q-S4「開發時量實際地點與搜尋時間」）
 * 用法：node tests/measure-dev04-bandit.js
 * 只量現況程式（起手狀態 B 30、Ō 57.5 → R_wild 1；不含獸潮），不跑 S4 報酬比模擬（S4 重跑需數值設計師的 sim 環境）。
 * TODO：S4／AC-E8 劫匪地點與每頭搜尋時間待數值結論，本輪不動（v0.5 18:19：剿匪單延後到第 4 期匪窩，第一批不驗）。
 * 劫匪在程式裡只有三個來源（grep 'bandit'）：野徑趕路的「劫匪攔路」事件（1 名）、傳聞「有人盤踞」（2 名）、傳聞「根本是餌」（2 名）。
 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript; charset=utf-8' : p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); });
  await new Promise((res) => srv.listen(0, '127.0.0.1', res));
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html?seed=20261127&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');
  const out = await page.evaluate(() => {
    const G = window.SHL; const S = G.state; const D = window.SHL_DATA;
    const res = {};
    // 1) 野徑來回：從城鎮出發的每條單段野徑，起手狀態下的遇險率、每趟時數與每頭劫匪的期望搜尋時數（解析）
    const evShare = D.EVENTS.filter((e) => e.id === 'bandit').length / D.EVENTS.length;
    res.evShare = evShare;
    res.routes = [];
    ['huiyao', 'duyin'].forEach((from) => {
      Object.keys(D.NODES).forEach((to) => {
        if (to === from) return; S.loc = from; S.t = 8 * 60;
        const p = G.travelPreview(to); if (!p.edges.length || p.edges.length > 1 || !p.wild) return;
        S.t = 22 * 60; const pn = G.travelPreview(to);
        res.routes.push({ from, to: D.NODES[to].name, h: p.hours, riskDay: +p.risk.toFixed(4), riskNight: +pn.risk.toFixed(4), hPerBanditDay: +(p.hours / (p.risk * evShare)).toFixed(1), hPerBanditNight: +(pn.hours / (pn.risk * evShare)).toFixed(1) });
      });
    });
    // 2) 實測：灰窯⇄野徑岔口來回 4000 趟（真的呼叫 travel，晝夜照時間自然輪替；遇事件即中止、不入戰）
    S.world.tide = null; S.world.next = 1e9;
    let hours = 0, bandits = 0, trips = 0, ev = 0, nightTrips = 0, nightEv = 0;
    for (let k = 0; k < 4000; k++) {
      S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.dead = null; S.combat = null; S.event = null; S.scene = 'map';
      const to = S.loc === 'huiyao' ? 'chakou' : 'huiyao';
      const before = S.t; const night = G.isNight(S.t); G.selectDest(to); G.travel(); hours += (S.t - before) / 60; trips++; if (night) { nightTrips++; if (S.event) nightEv++; }
      if (S.event) { ev++; if (S.event.id === 'bandit') bandits++; S.event = null; S.scene = 'map'; S.loc = to; }
      S.world.region.B = 30; S.world.region.crew = 4; // 量測只看起手狀態
      ['huiyao', 'duyin'].forEach((t) => { S.world.towns[t].O = D.WORLD.START[t].O; S.world.towns[t].P = D.WORLD.START[t].P; });
    }
    res.sim = { trips, hours, events: ev, nightTrips, nightEv, bandits, hPerBandit: +(hours / bandits).toFixed(2), banditsPerHour: +(bandits / hours).toFixed(4) };
    // 3) 傳聞：客棧打聽時「有人盤踞」與「根本是餌」的機率（起手 crew 4，盤踞權重 25）
    const w = D.RUMOR.truth; const tot = Object.values(w).reduce((a, b) => a + b, 0);
    res.rumor = { guard: w.guard / tot, bait: w.bait / tot, banditsPerRumor: 2 * (w.guard + w.bait) / tot, cost: D.RUMOR.cost, freePerDayPerInn: 1, investigateH: 1, hearH: 0.5, nodes: { cache: D.RUMOR.kinds.cache.nodes, vein: D.RUMOR.kinds.vein.nodes, beast: D.RUMOR.kinds.beast.nodes } };
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(2); });
