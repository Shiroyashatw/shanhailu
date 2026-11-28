// 獨立驗證腳本（shanhailu-check11-1128）：不改遊戲程式，只透過頁面讀寫狀態與點畫面
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = process.argv[2];
const OUT = process.argv[3];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const out = [];
const say = (k, v) => { const s = k + ' ' + JSON.stringify(v); out.push(s); console.log(s); };
async function layout(page, tag) {
  const l = await page.evaluate(() => {
    const w = (id) => Math.round(document.getElementById(id).getBoundingClientRect().width);
    // 文字重疊粗檢：可見的葉節點文字框兩兩交疊（同一欄內）
    const els = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.textContent.trim() && e.offsetParent !== null);
    const rs = els.map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0 && x.r.height > 0 && getComputedStyle(x.e).visibility !== 'hidden' && +getComputedStyle(x.e).opacity > 0.05).filter((x) => { const t = document.elementFromPoint(x.r.left + x.r.width / 2, x.r.top + x.r.height / 2); return t && (t === x.e || x.e.contains(t) || t.contains(x.e)); });
    let ov = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i].r, b = rs[j].r; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 3 && iy > 3 && !rs[i].e.contains(rs[j].e) && !rs[j].e.contains(rs[i].e)) ov.push(rs[i].e.textContent.trim().slice(0, 12) + '｜' + rs[j].e.textContent.trim().slice(0, 12));
    }
    return { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, cols: [w('col-left'), w('col-center'), w('col-right')], overlaps: ov.length, sample: ov.slice(0, 6) };
  });
  say('LAYOUT ' + tag, l);
  return l;
}
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html?seed=20261127&fresh=1&origin=drifter';
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));

  // ---- 1) 00:00 就寢：用畫面點客棧「歇息」按鈕（不用 service 直呼）
  await page.goto(base + '&fx=0'); await page.waitForSelector('[data-testid=town]');
  const pre = await page.evaluate(() => { const G = window.SHL, S = G.state; const adv = (G, S, target) => { while (S.t < target) { S.food = 90; S.fat = 5; S.hp = G.maxHp(); G._debug.passTime(Math.min(4, (target - S.t) / 60)); } S.food = 100; S.fat = 20; S.hp = G.maxHp(); }; adv(G, S, 1440 * 2); S.hp = G.maxHp(); S.food = 100; S.silver = 500; G.setTab(null); return { t: G.fmtTime(S.t), raw: S.t, loc: S.loc, scene: S.scene, ev: !!S.event, tab: S.townTab, ov: S.overlay }; });
  say('PRE00', pre);
  await page.click('[data-testid=bld-hy_inn]'); await page.waitForSelector('[data-testid=inn-rest]', { timeout: 5000 });
  const btns = await page.$eval('[data-testid=inn-rest]', (b) => b.textContent.trim());
  say('INN_BUTTONS', btns);
  const before = await page.evaluate(() => window.SHL.state.t);
  await page.waitForSelector('[data-testid=inn-rest]', { timeout: 5000 }); await page.click('[data-testid=inn-rest]');
  const a00 = await page.evaluate((b) => { const G = window.SHL, S = G.state; return { from: G.fmtTime(b), to: G.fmtTime(S.t), hours: (S.t - b) / 60, lastLogs: S.log.slice(0, 6).map((x) => x.t || x.msg || x) }; }, before);
  say('SLEEP00', a00);
  await page.evaluate(() => window.SHL.setOverlay('log')); await page.waitForTimeout(150);
  await layout(page, '01-log');
  await page.screenshot({ path: path.join(OUT, '01-sleep-0000-to-0800-log.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await page.evaluate(() => window.SHL.setOverlay('log'));

  // ---- 2) 08:10 就寢 → 21:10（13h 上限），同樣點按鈕
  await page.evaluate(() => { const G = window.SHL, S = G.state; const d = Math.floor(S.t / 1440); const adv = (G, S, target) => { while (S.t < target) { S.food = 90; S.fat = 5; S.hp = G.maxHp(); G._debug.passTime(Math.min(4, (target - S.t) / 60)); } S.food = 100; S.fat = 20; S.hp = G.maxHp(); }; adv(G, S, d * 1440 + 8 * 60 + 10); S.hp = G.maxHp(); S.food = 100; G.setTab(null); });
  await page.click('[data-testid=bld-hy_inn]');
  const b2 = await page.evaluate(() => window.SHL.state.t);
  await page.waitForSelector('[data-testid=inn-rest]', { timeout: 5000 }); await page.click('[data-testid=inn-rest]');
  const a13 = await page.evaluate((b) => { const G = window.SHL, S = G.state; return { from: G.fmtTime(b), to: G.fmtTime(S.t), hours: (S.t - b) / 60 }; }, b2);
  say('SLEEP0810', a13);
  await page.evaluate(() => window.SHL.setOverlay('log')); await page.waitForTimeout(150);
  await layout(page, '02-log');
  await page.screenshot({ path: path.join(OUT, '02-sleep-0810-to-2110-13h-log.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await page.evaluate(() => window.SHL.setOverlay('log'));
  // wakeTime 純函式掃描（舊規則對照）＋規格 4 例
  const sweep = await page.evaluate(() => { const G = window.SHL; const r = {}; for (const [h, m] of [[20, 0], [3, 0], [0, 0], [8, 10], [23, 59], [12, 0]]) { const n = 7 * 1440 + h * 60 + m; r[h + ':' + m] = (G.wakeTime(n) - n) / 60; } let mx = 0, mn = 99; for (let m = 0; m < 1440; m++) { const n = 7 * 1440 + m; const h = (G.wakeTime(n) - n) / 60; mx = Math.max(mx, h); mn = Math.min(mn, h); } r.min = mn; r.max = mx; return r; });
  say('WAKE_SWEEP_1min', sweep);

  // ---- 3) 一天結算：新局灰窯，未做任何事，跨過第 1 個 00:00（NOISE 不影響財庫）
  await page.goto(base + '&fx=0'); await page.waitForSelector('[data-testid=town]');
  const d1 = await page.evaluate(() => { const G = window.SHL, S = G.state; const t0 = G.fmtTime(S.t); const T0 = JSON.parse(JSON.stringify(S.world.towns)); G._debug.passTime((1440 - S.t) / 60 + 0.5); const h = S.world.towns.huiyao, du = S.world.towns.duyin;
    return { start: t0, now: G.fmtTime(S.t), huiyao0: { P: T0.huiyao.P, O: T0.huiyao.O, T: T0.huiyao.T }, huiyao: { P: h.P, O: h.O, T: h.T, In: h.brief.treasuryIn, Out: h.brief.treasuryOut, Net: h.brief.treasuryNet, tier: h.brief.treasuryTier, trend: h.brief.trend, why: h.brief.whyCode, Geff: h.brief.Geff, Gname: G.garrisonName(h.brief.Geff) }, duyin: { P: du.P, O: du.O, T: du.T, In: du.brief.treasuryIn, Out: du.brief.treasuryOut, Net: du.brief.treasuryNet }, g3: G.garrisonName(3) }; });
  say('DAY1', d1);
  // 多天：兩鎮每天會變
  const days = await page.evaluate(() => { const G = window.SHL, S = G.state; const r = []; for (let i = 0; i < 6; i++) { S.food = 90; S.fat = 5; S.hp = G.maxHp(); for (let k = 0; k < 6; k++) { G._debug.passTime(4); S.food = 90; S.fat = 5; S.hp = G.maxHp(); } const h = S.world.towns.huiyao, d = S.world.towns.duyin; r.push([G.dayOf(S.t), h.P, h.O, h.T, d.P, d.O, d.T]); } return r; });
  say('DAYS_P_O_T', days);
  await page.evaluate(() => { window.SHL.setTab(null); }); await page.waitForTimeout(150);
  await layout(page, '03-town');
  await page.screenshot({ path: path.join(OUT, '03-next-day-town.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  // 第 1 天結算的獨立截圖：重開新局只過一天，開日誌
  await page.goto(base + '&fx=0'); await page.waitForSelector('[data-testid=town]');
  await page.evaluate(() => { const G = window.SHL, S = G.state; const adv = (G, S, target) => { while (S.t < target) { S.food = 90; S.fat = 5; S.hp = G.maxHp(); G._debug.passTime(Math.min(4, (target - S.t) / 60)); } S.food = 100; S.fat = 20; S.hp = G.maxHp(); }; adv(G, S, 1440 + 8 * 60); G.setTab(null); });
  await page.waitForTimeout(150);
  await layout(page, '04-day2-town');
  await page.screenshot({ path: path.join(OUT, '04-day2-town-after-first-settlement.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  const t4 = await page.evaluate(() => { const G = window.SHL, h = G.state.world.towns.huiyao; return { now: G.fmtTime(G.state.t), In: h.brief.treasuryIn, Out: h.brief.treasuryOut, Net: h.brief.treasuryNet, T: h.T }; });
  say('SHOT04_STATE', t4);
  // 24h 制：畫面上不得出現十二時辰字樣
  const txt = await page.evaluate(() => document.body.innerText);
  say('NO_SHICHEN', { hits: (txt.match(/[子丑寅卯辰巳午未申酉戌亥]時/g) || []), hasHHMM: /\d{2}:\d{2}/.test(txt) });

  // ---- 4) cflash 獨立計數：MutationObserver 看 .cflash 的 class 'on' 被加上（不同於 e2e 的 animationstart），另以 animationstart 交叉
  await page.addInitScript(() => { const o = DOMTokenList.prototype.add; window.__add = []; DOMTokenList.prototype.add = function (...a) { try { if (a.includes('on') && this.contains('cflash')) window.__add.push(performance.now()); } catch (e) {} return o.apply(this, a); }; });
  for (const mode of ['natural', 'mash150', 'mash200', 'mash300']) {
    await page.goto(base); await page.waitForSelector('[data-testid=town]');
    await page.evaluate(() => {
      window.__on = []; window.__anim = [];
      document.addEventListener('animationstart', (ev) => { if (ev.animationName === 'cflash') window.__anim.push(performance.now()); }, true);
      const G = window.SHL, S = G.state; S.attr.shen = 1;
      G._debug.startCombat(['bug', 'bug', 'bug', 'bug'], { type: 'wild', node: 'chakou' }, {});
      S.combat.enemies.forEach((e) => (e.hp = e.max = 99999)); G.save(); G.setProfTab(S.profTab);
    });
    await page.waitForSelector('[data-testid=combat]');
    await page.evaluate(() => { const mo = new MutationObserver((ms) => ms.forEach((m) => { const el = m.target; if (el.classList && el.classList.contains('cflash') && el.classList.contains('on') && !(m.oldValue || '').split(' ').includes('on')) window.__on.push(performance.now()); })); mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true }); });
    const t0 = Date.now();
    while (Date.now() - t0 < 10000) {
      await page.evaluate(() => { const S = window.SHL.state; S.hp = 99999; S.fat = 0; if (S.combat) S.combat.enemies.forEach((e) => { e.intent = { k: 'atk', range: [3, 6] }; e.stag = 0; }); });
      if (mode === 'natural') { await page.click('[data-testid=act-wait]').catch(() => {}); await page.waitForTimeout(3500); }
      else { await page.click('[data-testid=combat]', { position: { x: 5, y: 5 } }).catch(() => {}); await page.keyboard.press('1'); await page.waitForTimeout(+mode.slice(4)); }
    }
    const r = await page.evaluate(() => ({ on: window.__add.slice(), anim: window.__anim.slice() }));
    const win = (ts) => { let mx = 0; for (let i = 0; i < ts.length; i++) { let j = i; while (j < ts.length && ts[j] - ts[i] < 1000) j++; mx = Math.max(mx, j - i); } return mx; };
    const gap = (ts) => ts.length > 1 ? Math.round(Math.min(...ts.slice(1).map((x, i) => x - ts[i]))) : null;
    say('CFLASH ' + mode, { classOn: r.on.length, maxPerSec_classOn: win(r.on), anim: r.anim.length, maxPerSec_anim: win(r.anim), minGapMs: gap(r.anim) });
  }
  say('CONSOLE_ERRORS', errs);
  fs.writeFileSync(path.join(OUT, '..', 'verify-out.txt'), out.join('\n') + '\n');
  await br.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(2); });
