/* 《山海錄》灰盒 v0.1 — 自動化互動驗證（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e.js [--shots]
 *   --shots  另存 1280×720 實機截圖至 docs/evidence/shots-v01/
 * 驗證：1280×720 單屏無捲動／無溢出／無文字重疊、三欄 240/796/220、24 小時制、
 *       地圖移動、城鎮（買賣／客棧／賞金／買大包）、荒野採集＋營火 3 配方、
 *       第一人稱戰鬥（意圖預告／攻擊／棄物撤退）、死亡墓誌銘＋一鍵重開、console 0 error。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'docs/evidence/shots-v01');
const WANT_SHOTS = process.argv.includes('--shots');
const SEED = 20261127;

// ---------- 靜態伺服器（模擬 GitHub Pages 根目錄） ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { resp.writeHead(404); return resp.end('404'); }
      resp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// ---------- 斷言紀錄 ----------
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined && detail !== '' ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
}

// ---------- 版面稽核（在頁面內執行） ----------
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const out = { scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, bodyScrollW: document.body.scrollWidth, bodyScrollH: document.body.scrollHeight, cols: {}, overlaps: [], escapes: [], clipped: [] };
    ['col-left', 'col-center', 'col-right'].forEach((id) => { const r = document.getElementById(id).getBoundingClientRect(); out.cols[id] = { x: r.left, w: r.width, h: r.height }; });
    const skipSel = '#tip, #shoptip, .overlay';
    const tip = document.getElementById('tip');
    const tipR = tip && tip.style.display !== 'none' ? tip.getBoundingClientRect() : null;
    const ov = document.querySelector('.overlay');
    const ovR = ov ? ov.getBoundingClientRect() : null;
    const inside = (r, R) => r.left >= R.left - 0.5 && r.right <= R.right + 0.5 && r.top >= R.top - 0.5 && r.bottom <= R.bottom + 0.5;
    const hits = (r, R) => R && r.left < R.right && r.right > R.left && r.top < R.bottom && r.bottom > R.top;
    const texts = [];
    const walker = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[style*="display:none"], [style*="display: none"]')) continue;
      if (el.closest('svg')) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rects = Array.from(rg.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
      const col = el.closest('.col');
      const colR = col ? col.getBoundingClientRect() : null;
      const covered = !!el.closest(skipSel);
      rects.forEach((r) => {
        // 文字不得超出所屬欄（被裁切）
        if (colR && !inside(r, colR) && !covered) out.escapes.push({ text: n.nodeValue.trim().slice(0, 20), r: [r.left, r.top, r.right, r.bottom].map(Math.round) });
        if (!covered && !hits(r, tipR) && !hits(r, ovR)) texts.push({ el, text: n.nodeValue.trim().slice(0, 16), r });
      });
      // 文字被自身容器裁切（overflow 隱藏且內容超寬／超高）
      if (!covered && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) && cs.overflow === 'hidden' && el.clientWidth > 0) {
        if (!el.classList.contains('logbox')) out.clipped.push({ text: el.textContent.trim().slice(0, 24), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight });
      }
    }
    // 兩兩比對文字矩形是否重疊（面積 > 4px²）
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], b = texts[j];
        if (a.el === b.el) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 2 && w * h > 4) out.overlaps.push([a.text, b.text, Math.round(w), Math.round(h)]);
      }
    }
    out.textCount = texts.length;
    return out;
  });
  const noScroll = r.scrollW <= 1280 && r.scrollH <= 720 && r.bodyScrollW <= 1280 && r.bodyScrollH <= 720;
  check('[' + label + '] 1280×720 單屏無全頁捲動／無橫向捲軸', noScroll, 'scroll=' + r.scrollW + '×' + r.scrollH);
  const c = r.cols;
  check('[' + label + '] 三欄寬 240/796/220', c['col-left'].w === 240 && c['col-center'].w === 796 && c['col-right'].w === 220, c['col-left'].w + '/' + c['col-center'].w + '/' + c['col-right'].w + '（x=' + c['col-left'].x + '/' + c['col-center'].x + '/' + c['col-right'].x + '，高 ' + c['col-left'].h + '）');
  check('[' + label + '] 文字無重疊（' + r.textCount + ' 段文字兩兩比對）', r.overlaps.length === 0, r.overlaps.slice(0, 5));
  check('[' + label + '] 文字無溢出欄外', r.escapes.length === 0, r.escapes.slice(0, 5));
  check('[' + label + '] 文字無被容器裁切', r.clipped.length === 0, r.clipped.slice(0, 5));
  await check24h(page, label);
}
const DIZHI = /[子丑寅卯辰巳午未申酉戌亥]時|時辰|更天|[0-9]+更/;
async function check24h(page, label) {
  const { clock, body } = await page.evaluate(() => ({ clock: (document.querySelector('[data-testid=clock]') || {}).textContent || '', body: document.body.innerText }));
  check('[' + label + '] 24 小時制時間', /^第 \d+ 日 ([01]\d|2[0-3]):[0-5]\d$/.test(clock), clock);
  check('[' + label + '] 無十二地支時辰', !DIZHI.test(body), (body.match(DIZHI) || [''])[0]);
}

async function shot(page, name) {
  if (!WANT_SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('SHOT  docs/evidence/shots-v01/' + name);
}

// ---------- 遊戲操作小工具 ----------
const st = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.SHL.state)));
const click = (page, tid) => page.click('[data-testid="' + tid + '"]');
async function packIndexOf(page, k) { return page.evaluate((k) => window.SHL.state.pack.findIndex((x) => x && x.k === k), k); }
async function shopIndexOf(page, pred) {
  return page.evaluate((src) => { const f = new Function('row', 'return ' + src); return window.SHL.state.shops[window.SHL.state.loc].findIndex((row) => f(row)); }, pred);
}

// 戰鬥：攻擊直到結束（血量低就喝藥），回傳結果
async function fight(page, opts) {
  opts = opts || {};
  for (let i = 0; i < 80; i++) {
    const s = await st(page);
    if (s.scene !== 'combat') return s.scene;
    const mh = await page.evaluate(() => window.SHL.maxHp());
    const pots = s.pack.filter((x) => x && x.k === 'pot_hp').reduce((a, x) => a + x.n, 0);
    if (!opts.noHeal && s.hp < mh * 0.35 && pots > 0) await click(page, 'act-potion');
    else if (s.skills.includes('beng') && s.combat.cd === 0) await click(page, 'act-skill');
    else await click(page, 'act-attack');
  }
  return (await st(page)).scene;
}
// 抵達後處理旅途事件／遇襲
async function settle(page) {
  for (let i = 0; i < 6; i++) {
    const s = await st(page);
    if (s.scene === 'event') {
      const ev = s.event;
      if (ev.result) { await click(page, 'btn-ev-done'); continue; }
      const prefer = ['leave', 'detour', 'study', 'pay', 'pick', 'dig', 'drop', 'fight', 'hunt'];
      const has = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^=ev-]')).map((e) => e.getAttribute('data-testid').slice(3)));
      const k = prefer.find((p) => has.includes(p));
      await click(page, 'ev-' + k);
      continue;
    }
    if (s.scene === 'combat') { await fight(page); continue; }
    if (s.scene === 'loot') { await click(page, 'btn-loot-done'); continue; }
    return s.scene;
  }
  return (await st(page)).scene;
}
async function travelTo(page, node) {
  let s = await st(page);
  if (s.scene !== 'map') { await click(page, 'btn-leave'); }
  await click(page, 'node-' + node);
  await click(page, 'btn-travel');
  const scene = await settle(page);
  s = await st(page);
  return { scene, loc: s.loc };
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => consoleErrors.push('requestfailed: ' + r.url()));

  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1');
  await page.waitForSelector('[data-testid=town]');
  let s = await st(page);

  // ===== 1. 開局：城鎮 =====
  check('開局位於灰窯鎮城鎮情境', s.scene === 'town' && s.loc === 'huiyao', s.scene + '/' + s.loc);
  check('開局時間 第 1 日 08:00', (await page.textContent('[data-testid=clock]')) === '第 1 日 08:00');
  check('開局賞金：灰髯狼 ×3 已追蹤', (await page.textContent('[data-testid=bounty]')).includes('灰髯狼 0/3'), await page.textContent('[data-testid=bounty]'));
  check('左欄 10 部位＋背包槽＋鎖定馬車槽', (await page.$$('[data-testid^=slot-]')).length === 11 && !!(await page.$('.slot-cart.locked')));
  check('初始粗布小包 6 格、24 格上限（18 格鎖定）', (await page.$$('.packgrid .cell.locked')).length === 18);
  check('右欄 5 類熟練度', (await page.$$('[data-testid^=prof-]')).length === 5);
  await audit(page, '城鎮・市集');
  const save0 = await page.evaluate(() => JSON.parse(localStorage.getItem('shanhailu.save')));
  check('存檔 schema 預留永久死亡／城鎮檢查點雙模式', save0 && save0.schema === 1 && save0.saveMode === 'permadeath' && 'checkpoint' in save0, { schema: save0.schema, saveMode: save0.saveMode, hasCheckpointField: 'checkpoint' in save0 });

  // 買大包（行旅皮囊 10 格）
  const bagIdx = await shopIndexOf(page, "row.it.k==='eq' && row.it.eq.base==='bag_travel'");
  await click(page, 'shop-' + bagIdx);
  await page.hover('[data-testid=shop-' + bagIdx + ']');
  check('中欄商品提示卡錨定在交易欄（不蓋貨架）', await page.evaluate(() => { const b = document.getElementById('shoptip'); const t = document.querySelector('[data-testid=trade]').getBoundingClientRect(); const r = b.getBoundingClientRect(); return b.style.display === 'block' && Math.abs(r.left - t.left) < 1 && Math.abs(r.top - t.top) < 1; }));
  const silverBeforeBag = s.silver;
  await click(page, 'btn-buy');
  s = await st(page);
  check('城鎮買大包：行旅皮囊換上、行囊 10 格、舊包落入行囊', s.equip.bag.base === 'bag_travel' && s.pack.length === 10 && s.pack.some((x) => x && x.k === 'eq' && x.eq.base === 'bag_cloth') && s.silver === silverBeforeBag - 48, { bag: s.equip.bag.name, cap: s.pack.length, silver: silverBeforeBag + '→' + s.silver });
  check('行囊鎖定格減為 14', (await page.$$('.packgrid .cell.locked')).length === 14);

  // 賣：右鍵直接賣出舊包
  const oldBag = s.pack.findIndex((x) => x && x.k === 'eq' && x.eq.base === 'bag_cloth');
  await page.click('[data-testid=pack-' + oldBag + ']', { button: 'right' });
  let s2 = await st(page);
  check('市集賣出（行囊右鍵直接賣）', s2.silver > s.silver && !s2.pack.some((x) => x && x.k === 'eq' && x.eq.base === 'bag_cloth'), s.silver + '→' + s2.silver);
  // 買金創藥水 ×1（選取→數量→買）
  const potIdx = await shopIndexOf(page, "row.it.k==='pot_hp'");
  await click(page, 'shop-' + potIdx);
  await click(page, 'btn-buy');
  s = await st(page);
  check('市集買入金創藥水', s.pack.filter((x) => x && x.k === 'pot_hp').reduce((a, x) => a + x.n, 0) === 3, 'pot=3, silver=' + s.silver);
  // 選取賣出（點你的貨→賣出所選）
  const breadIdx = await packIndexOf(page, 'bread');
  await click(page, 'buyback-' + breadIdx);
  await click(page, 'btn-sell');
  s2 = await st(page);
  check('市集「收購」選取後賣出所選', s2.silver === s.silver + 2 && !s2.pack.some((x) => x && x.k === 'bread'), s.silver + '→' + s2.silver);
  await shot(page, '03-town-market.png');

  // 客棧
  await click(page, 'tab-inn');
  await audit(page, '城鎮・客棧');
  s = await st(page);
  await click(page, 'inn-soup');
  s2 = await st(page);
  check('客棧熱湯：銀 −3、飽食上升', s2.silver === s.silver - 3 && s2.food > s.food, 'food ' + s.food + '→' + s2.food);
  // 賞金
  await click(page, 'tab-bounty');
  await audit(page, '城鎮・賞金');
  await click(page, 'bounty-b_guyao');
  s = await st(page);
  check('賞金板揭榜：古窯清理', s.bounties.find((b) => b.id === 'b_guyao').status === 'active');

  // ===== 2. 地圖移動 =====
  await click(page, 'btn-leave');
  await click(page, 'node-qingwu');
  const tipTxt = await page.textContent('[data-testid=route-tip]');
  check('地圖：選目的地出現預告泡泡（耗時／食／疲／險）', /\d+ 小時・食 −\d+・疲 \+\d+・險 [低中高]/.test(tipTxt), tipTxt);
  check('出發條顯示 5 個數值膠囊＋前往', (await page.$$('.departbar .vpill')).length === 5 && !!(await page.$('[data-testid=btn-travel]')));
  await audit(page, '世界地圖');
  await shot(page, '01-worldmap.png');
  const t0 = (await st(page)).t;
  await click(page, 'btn-travel');
  let scene = await settle(page);
  s = await st(page);
  check('地圖移動：抵達青霧藥林、時間推進', s.loc === 'qingwu' && s.t > t0 && scene === 'wild', (await page.textContent('[data-testid=clock]')) + '・' + scene);

  // ===== 3. 荒野採集＋營火 3 配方 =====
  await audit(page, '荒野・青霧藥林');
  s = await st(page);
  const cai0 = s.prof.cai;
  await click(page, 'act-herb'); await settle(page);
  await click(page, 'gpt-h1'); await settle(page);
  s = await st(page);
  check('荒野採藥（按鈕與場景採集點）', s.pack.filter((x) => x && x.k === 'herb_zx').reduce((a, x) => a + x.n, 0) >= 2 && s.prof.cai > cai0, 'herb=' + s.pack.filter((x) => x && x.k === 'herb_zx').reduce((a, x) => a + x.n, 0) + ' 採集xp ' + cai0 + '→' + s.prof.cai);
  await click(page, 'gpt-h2'); await settle(page);
  if ((await st(page)).pack.filter((x) => x && x.k === 'leaf_qx').reduce((a, x) => a + x.n, 0) < 2) { await click(page, 'gpt-h2'); await settle(page); }
  // 挖礦
  await click(page, 'act-ore'); await settle(page);
  s = await st(page);
  check('荒野挖礦', s.pack.some((x) => x && x.k === 'ore_fe'), 'ore_fe=' + s.pack.filter((x) => x && x.k === 'ore_fe').reduce((a, x) => a + x.n, 0));
  check('營火未生時配方不可製', await page.$eval('[data-testid=craft-r_hp]', (b) => b.disabled));
  await click(page, 'act-camp');
  s = await st(page);
  check('紮營生火', s.fire === true);
  const potBefore = s.pack.filter((x) => x && x.k === 'pot_hp').reduce((a, x) => a + x.n, 0);
  await click(page, 'craft-r_hp');
  s = await st(page);
  check('營火配方 1：金創藥水（止血草 ×2）', s.pack.filter((x) => x && x.k === 'pot_hp').reduce((a, x) => a + x.n, 0) === potBefore + 1);
  await click(page, 'craft-r_ft');
  s = await st(page);
  check('營火配方 2：提神湯藥（清心葉 ×2）', s.pack.some((x) => x && x.k === 'pot_ft'));
  await shot(page, '04-wild-campfire.png');
  // 狩獵：追蹤 → 第一人稱戰鬥
  await click(page, 'act-track');
  s = await st(page);
  check('追蹤獸跡進入第一人稱戰鬥', s.scene === 'combat' && s.combat.ctx.type === 'hunt', s.scene);
  await audit(page, '戰鬥・狩獵');
  const intentTxt = await page.textContent('[data-testid=intent-0]');
  check('敵頭頂意圖預告', /攻擊|重擊|流血|蓄力|防禦/.test(intentTxt), intentTxt.trim());
  check('戰鬥只畫敵人（無我方角色），頭頂血條＋行動順序', (await page.$$('.enemy')).length === s.combat.enemies.length && !(await page.$('.player, .ally')) && (await page.$$('.enemy .ehp')).length > 0 && (await page.textContent('[data-testid=order]')).includes('你'));
  const ehp0 = s.combat.enemies[0].hp;
  let attacked = false;
  for (let i = 0; i < 4 && !attacked; i++) { await click(page, 'act-attack'); const s3 = await st(page); attacked = !s3.combat || s3.combat.enemies[0].hp < ehp0; }
  check('攻擊命中敵人扣血', attacked);
  const wolfBounty0 = s.bounties.find((b) => b.id === 'b_wolf').prog;
  scene = await fight(page);
  s = await st(page);
  check('狩獵勝利 → 剝皮取肉結算', scene === 'loot' && s.pack.some((x) => x && x.k === 'hide') && s.pack.some((x) => x && x.k === 'meat'), scene);
  check('賞金進度：灰髯狼 +1', s.bounties.find((b) => b.id === 'b_wolf').prog === wolfBounty0 + 1, (await page.textContent('[data-testid=bounty]')));
  await click(page, 'btn-loot-done');
  await click(page, 'craft-r_ra');
  s = await st(page);
  check('營火配方 3：烤肉乾糧（生肉 ×1，需營火）', s.pack.some((x) => x && x.k === 'ration') && s.stats.crafts >= 3, 'crafts=' + s.stats.crafts);
  // 使用消耗品
  const fat0 = s.fat;
  await click(page, 'pack-' + (await packIndexOf(page, 'pot_ft')));
  s = await st(page);
  check('左欄點擊行囊使用提神湯藥（疲累下降）', s.fat < fat0, fat0 + '→' + s.fat);

  // ===== 4. 棄物撤退 =====
  let retreatOk = false, sawRateUp = false, groundOk = false;
  for (let tries = 0; tries < 6 && !retreatOk; tries++) {
    s = await st(page);
    if (s.scene !== 'combat') {
      // 到枯骨獸徑追蹤狼／豬來測撤退
      if (s.loc !== 'kugu') { await travelTo(page, 'kugu'); }
      s = await st(page);
      if (s.scene !== 'wild') continue;
      const tk = await page.evaluate(() => { const ns = window.SHL.nodeState('kugu'); return ['t1', 't2', 't3'].find((k) => ns.pts[k] > 0); });
      if (!tk) { await page.evaluate(() => window.SHL._debug.passTime(24)); continue; }
      await click(page, 'gpt-' + tk);
      s = await st(page);
      if (s.scene !== 'combat') { await settle(page); continue; }
    }
    await click(page, 'act-retreat');
    await page.waitForSelector('[data-testid=retreat-bar]');
    if (tries === 0) await audit(page, '戰鬥・棄物撤退確認條');
    const r0 = await page.textContent('[data-testid=retreat-rate]');
    // 勾選最重的兩格貨
    const heavy = await page.evaluate(() => window.SHL.state.pack.map((x, i) => [x ? window.SHL.itemWt(x) : 0, i, x && x.k]).filter((a) => a[0] > 0 && a[2] !== 'pot_hp').sort((a, b) => b[0] - a[0]).slice(0, 2).map((a) => a[1]));
    for (const i of heavy) await click(page, 'drop-' + i);
    const r1 = await page.textContent('[data-testid=retreat-rate]');
    const m = r1.match(/(\d+)% → (\d+)%/);
    if (m && +m[2] > +m[1]) sawRateUp = true;
    if (tries === 0) await shot(page, '06-combat-retreat.png');
    await click(page, 'btn-retreat-confirm');
    s = await st(page);
    if (s.scene !== 'combat' && !s.dead) {
      retreatOk = true;
      check('棄物撤退成功、丟下的貨落在左欄地面', s.ground.items.length > 0, r0 + ' ⇒ ' + r1 + '；地面 ' + s.ground.items.length + ' 格');
      const before = s.pack.filter(Boolean).length;
      await click(page, 'ground-0');
      const s3 = await st(page);
      groundOk = s3.pack.filter(Boolean).length > before;
    } else if (s.scene === 'combat') {
      await fight(page); await settle(page);
    }
  }
  check('棄物撤退：勾選物品後撤退率上升', sawRateUp);
  check('棄物撤退成功脫離戰鬥', retreatOk);
  check('地面暫放格點擊撿回行囊', groundOk);

  // ===== 5. 地城＋戰鬥 Hover 提示卡＋死亡 =====
  await travelTo(page, 'guyao');
  s = await st(page);
  check('抵達地城亂葬古窯', s.scene === 'dungeon' && s.loc === 'guyao', s.scene);
  await audit(page, '地城・亂葬古窯');
  await click(page, 'btn-delve');
  s = await st(page);
  check('深入地城進入戰鬥', s.scene === 'combat' && s.combat.ctx.type === 'dungeon');
  // 裝備 Hover 提示卡：錨定在左欄、不跨進中欄
  await page.hover('[data-testid=slot-chest]');
  const tipBox = await page.evaluate(() => { const t = document.getElementById('tip'); const r = t.getBoundingClientRect(); return { shown: t.style.display === 'block', left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: t.innerText.split('\n')[0] }; });
  check('裝備 Hover 提示卡顯示且只在左欄（x 10–242，不跨進中欄 x≥252）', tipBox.shown && tipBox.left >= 10 && tipBox.right <= 242 && tipBox.bottom <= 720, tipBox);
  await audit(page, '戰鬥＋提示卡');
  await shot(page, '02-combat-tooltip.png');
  await page.mouse.move(640, 300);

  // 持續深入直到永久死亡（不喝藥）
  let guard = 0;
  while (guard++ < 40) {
    s = await st(page);
    if (s.scene === 'dead') break;
    if (s.scene === 'combat') { await fight(page, { noHeal: true }); continue; }
    if (s.scene === 'loot') { await click(page, 'btn-loot-done'); continue; }
    if (s.scene === 'dungeon') {
      if (await page.$('[data-testid=btn-delve]')) { await click(page, 'btn-delve'); continue; }
      await travelTo(page, 'jiku'); continue;
    }
    await settle(page);
    s = await st(page);
    if (s.scene === 'wild' || s.scene === 'town' || s.scene === 'map') await travelTo(page, 'jiku');
  }
  s = await st(page);
  check('戰至永久死亡 → 墓誌銘', s.scene === 'dead' && !!(await page.$('[data-testid=epitaph]')), s.dead && s.dead.cause);
  const epi = await page.textContent('[data-testid=epitaph]');
  check('墓誌銘含死因、24 小時制卒時與生平', /死因/.test(epi) && /卒於第 \d+ 日 \d{2}:\d{2}/.test(epi), epi.replace(/\s+/g, ' ').slice(0, 90));
  check('純永久死亡：存檔已刪除', (await page.evaluate(() => localStorage.getItem('shanhailu.save'))) === null);
  await audit(page, '死亡墓誌銘');
  await shot(page, '05-death-epitaph.png');
  await click(page, 'btn-restart');
  s = await st(page);
  check('一鍵重開：回到灰窯鎮 第 1 日 08:00、滿血、新存檔', s.scene === 'town' && s.loc === 'huiyao' && s.t === 480 && s.hp === 80 && !s.dead && (await page.evaluate(() => !!localStorage.getItem('shanhailu.save'))));

  // ===== 6. 覆蓋層與重新載入 =====
  await click(page, 'sys-log');
  check('右欄系統鈕：日誌', !!(await page.$('[data-testid=overlay-log]')));
  await click(page, 'sys-log');
  await page.reload();
  await page.waitForSelector('[data-testid=town]');
  check('重新載入後讀回存檔（同局）', (await st(page)).loc === 'huiyao');

  // 夜間時間顯示仍為 24 小時制
  await page.evaluate(() => { window.SHL._debug.passTime(14); window.SHL.save(); });
  await page.evaluate(() => window.SHL.toMap());
  await check24h(page, '夜間 22:00');

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));

  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
