/* 《山海錄》灰盒 v0.3 — 自動化互動驗證（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e.js [--shots]
 *   --shots  另存 1280×720 實機截圖至 docs/evidence/shots-v03/
 * 驗證：1280×720 單屏無捲動／無溢出／無文字重疊、三欄 240/796/220、24 小時制；
 *       城鎮平面圖（建築、路人、老闆、各種服務）、每個地點可走可探查、隱藏地點、大陸圖、見聞錄、勢力聲望；
 *       戰鬥行動列（武器／招式／技能／道具）、點人形武器出手、狀態、演出佇列、棄物撤退；
 *       委託、傳聞、鑑定、獸潮、拖拉、視窗等比縮放、永久死亡與重開、console 0 error。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'docs/evidence/shots-v03');
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
  console.log('SHOT  docs/evidence/shots-v03/' + name);
}


// ---------- 遊戲操作小工具 ----------
const st = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.SHL.state)));
const click = (page, tid) => page.click('[data-testid="' + tid + '"]');
const has = async (page, tid) => !!(await page.$('[data-testid="' + tid + '"]'));
const cnt = (s, k) => s.pack.filter((x) => x && x.k === k).reduce((a, x) => a + x.n, 0);
async function packIndexOf(page, k) { return page.evaluate((k) => window.SHL.state.pack.findIndex((x) => x && x.k === k), k); }
async function shopIndexOf(page, pred) {
  return page.evaluate((src) => { const f = new Function('row', 'return ' + src); return window.SHL.shopRows().findIndex((row) => f(row)); }, pred);
}
// 進建築（必要時先回街上）
async function enter(page, bid) {
  const s = await st(page);
  if (s.townTab === bid) return;
  if (s.townTab) await click(page, 'btn-street');
  await click(page, 'bld-' + bid);
}
// 讓角色不會在長流程裡餓死累死
const refresh = (page) => page.evaluate(() => { const S = window.SHL.state; S.food = 90; S.fat = 5; S.hp = window.SHL.maxHp(); });

// 戰鬥：攻擊直到結束（血量低就喝藥），回傳結果
async function fight(page, opts) {
  opts = opts || {};
  for (let i = 0; i < 90; i++) {
    const s = await st(page);
    if (s.scene !== 'combat') return s.scene;
    const mh = await page.evaluate(() => window.SHL.maxHp());
    if (!opts.noHeal && s.hp < mh * 0.35 && cnt(s, 'pot_hp') > 0) await click(page, 'act-item-pot_hp');
    else await click(page, 'act-attack');
  }
  return (await st(page)).scene;
}
// 抵達後處理旅途事件／遇襲
async function settle(page) {
  for (let i = 0; i < 8; i++) {
    const s = await st(page);
    if (s.scene === 'event') {
      const ev = s.event;
      if (ev.result) { await click(page, 'btn-ev-done'); continue; }
      const prefer = ['leave', 'detour', 'study', 'pay', 'pick', 'dig', 'drop', 'fight', 'hunt', 'talk', 'r_leave', 'r_leave2', 'r_sneak', 'r_fight', 'r_boss', 'r_hunt', 'r_strike'];
      const opts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^=ev-]')).map((e) => e.getAttribute('data-testid').slice(3)));
      await click(page, 'ev-' + prefer.find((p) => opts.includes(p)));
      continue;
    }
    if (s.scene === 'combat') { await fight(page); continue; }
    if (s.scene === 'loot') { await click(page, 'btn-loot-done'); continue; }
    return s.scene;
  }
  return (await st(page)).scene;
}
async function travelTo(page, node) {
  await page.evaluate(() => window.SHL.toMap());
  await click(page, 'node-' + node);
  await click(page, 'btn-travel');
  const scene = await settle(page);
  return { scene, loc: (await st(page)).loc };
}
// 反覆探查直到找到下一樣（探查有機率落空）
async function exploreUntil(page, pred, max) {
  for (let i = 0; i < (max || 25); i++) {
    await refresh(page);
    let s = await st(page);
    if (s.scene === 'event' || s.scene === 'combat' || s.scene === 'loot') { await settle(page); s = await st(page); }
    if (await page.evaluate(pred)) return true;
    await page.evaluate(() => window.SHL.explore());
  }
  await settle(page);
  return page.evaluate(pred);
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

  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');
  let s = await st(page), s2;

  // ===== 1. 開局：城鎮平面圖（街上） =====
  check('開局位於灰窯鎮街上（沒有進任何建築）', s.scene === 'town' && s.loc === 'huiyao' && s.townTab === null, s.scene + '/' + s.loc);
  check('開局時間 第 1 日 08:00', (await page.textContent('[data-testid=clock]')) === '第 1 日 08:00');
  check('城鎮平面圖：6 棟建築＋出口都可點', (await page.$$('.plan .bld')).length === 7 && (await has(page, 'bld-gate')));
  check('建築的點擊範圍來自平面圖場景（不是後備排版）', await page.evaluate(() => { const b = window.SHL_SCENES.buildings.plan_huiyao; return !!b && ['hy_market', 'hy_inn', 'hy_apoth', 'hy_smith', 'hy_board', 'hy_shrine', 'gate'].every((k) => Array.isArray(b[k]) && b[k].length === 4); }));
  check('街上有 3 個路人', (await page.$$('.plan .fig')).length === 3);
  check('#5 城鎮沒有分頁列', !(await page.$('.tabs')));
  check('#1 左下小地圖已移除，改為三大勢力聲望', !(await page.$('.minimap')) && (await page.$$('[data-testid^=rep-]')).length === 3);
  check('#8 右欄不再有技能格', !(await page.$('.skillgrid')));
  check('開局委託：灰髯狼 ×3 已追蹤（兩行大字）', (await page.textContent('[data-testid=bounty]')).includes('灰髯狼 0/3') && await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.jent .jt b')).fontSize) >= 12), await page.textContent('[data-testid=bounty]'));
  check('左欄 10 部位＋背包槽＋鎖定馬車槽', (await page.$$('[data-testid^=slot-]')).length === 11 && !!(await page.$('.slot-cart.locked')));
  check('右欄 7 項素質', (await page.$$('[data-testid^=attr-]')).length === 7);
  let profCount = 0;
  for (const g of ['wu', 'ye', 'gong', 'xing']) { await click(page, 'ptab-' + g); profCount += (await page.$$('[data-testid^=prof-]')).length; }
  check('右欄熟練度四大類共 24 項（含探幽）', profCount === 24 && Object.keys(s.prof).length === 24 && 'tanyou' in s.prof, profCount);
  await click(page, 'ptab-wu');
  await audit(page, '街上・武藝分頁');
  await click(page, 'ptab-ye');
  await audit(page, '城鎮・街上');
  await shot(page, '01-town-street.png');
  const save0 = await page.evaluate(() => JSON.parse(localStorage.getItem('shanhailu.save')));
  check('存檔 schema 3，預留永久死亡／城鎮檢查點雙模式', save0 && save0.schema === 3 && save0.saveMode === 'permadeath' && 'checkpoint' in save0);

  // ===== 2. 路人 =====
  await click(page, 'npc-np_story');
  check('#6 點路人出現對話框（頭像、名字、招呼）', (await has(page, 'street-dialog')) && (await page.textContent('[data-testid=say]')).length > 2);
  await click(page, 'btn-talk');
  s = await st(page);
  check('路人閒談：台詞換了、見聞錄 +1', s.codex.includes('c_geo') && (await page.textContent('[data-testid=say]')).length > 10, s.codex);
  await audit(page, '街上・路人對話');
  await shot(page, '02-street-npc.png');
  await click(page, 'btn-street-close');
  await click(page, 'npc-np_aman');
  await click(page, 'btn-cheap-rumor');
  s2 = await st(page);
  check('乞兒：一文錢一則傳聞', s2.silver === s.silver - 1 && s2.rumors.length === 1, s2.rumors[0] && s2.rumors[0].text);
  await click(page, 'btn-street-close');

  // ===== 3. 建築：天星分號（市集） =====
  await click(page, 'bld-hy_market');
  s = await st(page);
  check('#3 #6 點建築進去：老闆頭像、名字、招呼', s.townTab === 'hy_market' && (await page.textContent('[data-testid=bld-name]')) === '天星分號' && !!(await page.$('.bface .px')) && (await page.textContent('[data-testid=say]')).length > 2);
  await audit(page, '建築・天星分號');
  const bagIdx = await shopIndexOf(page, "row.it.k==='eq' && row.it.eq.base==='bag_travel'");
  await click(page, 'shop-' + bagIdx);
  await page.hover('[data-testid=shop-' + bagIdx + ']');
  check('商品提示卡錨定在交易欄（不蓋貨架）', await page.evaluate(() => { const b = document.getElementById('shoptip'); const t = document.querySelector('[data-testid=trade]').getBoundingClientRect(); const r = b.getBoundingClientRect(); return b.style.display === 'block' && Math.abs(r.left - t.left) < 1 && Math.abs(r.top - t.top) < 1; }));
  const silverBeforeBag = s.silver;
  await click(page, 'btn-buy');
  s = await st(page);
  check('買大包：行旅皮囊換上、行囊 10 格、舊包落入行囊', s.equip.bag.base === 'bag_travel' && s.pack.length === 10 && s.pack.some((x) => x && x.k === 'eq' && x.eq.base === 'bag_cloth') && s.silver === silverBeforeBag - 48, { silver: silverBeforeBag + '→' + s.silver });
  check('在天星商號買賣會漲天星商會聲望', s.rep.star > 0, s.rep.star);
  const oldBag = s.pack.findIndex((x) => x && x.k === 'eq' && x.eq.base === 'bag_cloth');
  await page.click('[data-testid=pack-' + oldBag + ']', { button: 'right' });
  s2 = await st(page);
  check('行囊右鍵直接賣', s2.silver > s.silver && !s2.pack.some((x) => x && x.k === 'eq' && x.eq.base === 'bag_cloth'));
  await click(page, 'shop-' + (await shopIndexOf(page, "row.it.k==='incense'")));
  await click(page, 'btn-buy');
  check('天星分號不賣武器（武器在鐵鋪）', await page.evaluate(() => !window.SHL.shopRows().some((r) => r.it.k === 'eq' && window.SHL.eqBase(r.it.eq).dmg)));
  await shot(page, '03-building-market.png');

  // ===== 4. 專門店：鐵鋪、藥鋪 =====
  await page.evaluate(() => { window.SHL._debug.addItem({ k: 'ore_xs', n: 1 }); window.SHL._debug.addItem({ k: 'herb_zx', n: 2 }); window.SHL.save(); });
  const pXsMarket = await page.evaluate(() => window.SHL.sellPrice({ k: 'ore_xs', n: 1 }));
  await enter(page, 'hy_smith');
  const pr = await page.evaluate(() => ({ ore: window.SHL.sellPrice({ k: 'ore_xs', n: 1 }), herb: window.SHL.sellPrice({ k: 'herb_zx', n: 1 }), weapons: window.SHL.shopRows().filter((r) => r.it.k === 'eq' && window.SHL.eqBase(r.it.eq).dmg).length }));
  check('鐵鋪：賣武器、礦石加價 15%、不收藥草', pr.weapons >= 3 && pr.ore > pXsMarket && pr.herb === 0, { market: pXsMarket, smith: pr.ore, herb: pr.herb });
  await audit(page, '建築・石記鐵鋪');
  await enter(page, 'hy_apoth');
  check('藥鋪：5 張配方卡（含淬毒油、解毒丸）', (await page.$$('[data-testid^=recipe-]')).length === 5 && (await has(page, 'recipe-r_oil')) && (await has(page, 'recipe-r_anti')));
  s = await st(page);
  await click(page, 'craft-r_hp');
  s2 = await st(page);
  check('藥鋪藥爐製藥：止血草 ×2 → 金創藥水', cnt(s2, 'pot_hp') === cnt(s, 'pot_hp') + 1 && cnt(s2, 'herb_zx') === 0);
  check('烤肉乾糧在藥爐不能做（需營火）', await page.$eval('[data-testid=craft-r_ra]', (b) => b.disabled));
  await audit(page, '建築・回春藥鋪');
  await shot(page, '04-building-apoth.png');

  // ===== 5. 客棧、委託板、窯神廟 =====
  await enter(page, 'hy_inn');
  s = await st(page);
  await click(page, 'inn-soup');
  s2 = await st(page);
  check('客棧熱湯：銀 −3、飽食上升', s2.silver === s.silver - 3 && s2.food > s.food);
  await click(page, 'inn-rumor');
  s = await st(page);
  check('客棧打聽：每日第一則免費', s.rumors.length === 2 && s.silver === s2.silver);
  await click(page, 'inn-rumor');
  s2 = await st(page);
  check('客棧打聽：第二則請酒 5 兩', s2.rumors.length === 3 && s2.silver === s.silver - 5);
  check('#2 右欄傳聞每則兩行', (await page.$$('.jent.rum')).length === 3 && await page.evaluate(() => document.querySelector('.jent.rum .js').textContent.length > 3));
  check('傳聞真相不外露於畫面', !(await page.evaluate(() => document.body.innerText)).match(/\b(true|guard|strong|gone|bait)\b/));
  await audit(page, '建築・老窯客棧');
  await shot(page, '05-building-inn.png');
  await enter(page, 'hy_board');
  await click(page, 'bounty-b_guyao');
  s = await st(page);
  check('委託板揭榜：古窯清理', s.quests.find((b) => b.id === 'b_guyao').status === 'active');
  check('委託板每日生成 3 張（含期限）；三個有板的地點都有', ['huiyao', 'duyin', 'poxiao'].every((t) => s.quests.filter((q) => q.town === t && !q.fixed && q.due).length === 3));
  check('路人的私人委託不上板', !(await has(page, 'bounty-b_refugee')));
  await audit(page, '建築・鎮公所委託板');
  await shot(page, '06-building-board.png');
  await enter(page, 'hy_shrine');
  await click(page, 'svc-offer');
  s = await st(page);
  check('窯神廟上香：香點不著，見聞錄記下那個問題', s.codex.includes('c_question') && cnt(s, 'incense') === 0 && s.log.some((l) => l.text.includes('香點不著')));
  await audit(page, '建築・窯神廟');
  await click(page, 'btn-street');
  check('「回到街上」回平面圖', (await st(page)).townTab === null && !!(await page.$('.plan')));

  // ===== 6. 記事面板 =====
  await page.click('.jhead');
  check('#2 點右欄委託開啟記事面板', await has(page, 'overlay-journal'));
  await click(page, 'jtab-rumor');
  check('記事・傳聞：全文', (await page.$$('.overlay .jrow')).length === 3);
  await click(page, 'jtab-codex');
  const cx = await page.evaluate(() => ({ known: document.querySelectorAll('.cx:not(.unk)').length, unk: document.querySelectorAll('.cx.unk').length }));
  check('記事・見聞錄：25 條，已知的顯示全文、未知的是 ？？？', cx.known === 2 && cx.unk === 23, cx);
  await shot(page, '07-journal-codex.png');
  await click(page, 'sys-journal');

  // ===== 7. 探查（城鎮也能探查） =====
  await exploreUntil(page, () => window.SHL.state.found.huiyao >= 1);
  s = await st(page);
  check('#4 城鎮也能探查：找到第一樣（見聞）', s.found.huiyao >= 1 && s.codex.includes('c_night') && s.stats.finds >= 1, s.found);
  await settle(page);

  // ===== 8. 世界地圖 =====
  await click(page, 'bld-gate');
  s = await st(page);
  check('點平面圖上的出口＝離鎮到地圖', s.scene === 'map');
  check('地圖：13 個地點可見、2 個隱藏地點不在圖上', (await page.$$('.mnode')).length === 13 && !(await has(page, 'node-yachao')) && !(await has(page, 'node-guzhong')));
  check('地圖底圖已載入', await page.evaluate(() => window.SHL_SCENES.has('map_region') && getComputedStyle(document.querySelector('.map')).backgroundImage.startsWith('url')));
  check('地圖上每個地點都標了探查進度', (await page.$$('.exd')).length === 13 && (await page.$$('.exd i.on')).length >= 1);
  await click(page, 'btn-continent');
  check('大陸圖：中山、四山、海外、大荒與此地', (await has(page, 'continent')) && (await page.$$('.cchip')).length === 7 && !!(await page.$('.chere')));
  await audit(page, '大陸圖');
  await shot(page, '09-continent.png');
  await click(page, 'btn-region');
  await click(page, 'node-yizhan');
  const tipTxt = await page.textContent('[data-testid=route-tip]');
  check('#4 原本的路口（官道驛站）現在可以當目的地', (await st(page)).dest === 'yizhan' && /\d+ 小時・食 −\d+・疲 \+\d+・險 [低中高]/.test(tipTxt), tipTxt);
  check('出發條顯示 5 個數值膠囊＋前往', (await page.$$('.departbar .vpill')).length === 5 && (await has(page, 'btn-travel')));
  await audit(page, '世界地圖');
  await shot(page, '08-worldmap.png');
  await click(page, 'btn-travel');
  let scene = await settle(page);
  s = await st(page);
  check('抵達官道驛站：是個有茶攤和行商的地點', s.loc === 'yizhan' && scene === 'town' && (await page.$$('.plan .bld')).length === 3, scene);
  check('第一次抵達會有一段描述', s.visited.yizhan && s.log.some((l) => l.text.length > 30));
  await enter(page, 'yz_tea');
  s = await st(page);
  await click(page, 'svc-tea');
  s2 = await st(page);
  check('茶攤：粗茶 2 兩', s2.silver === s.silver - 2);
  await enter(page, 'yz_peddler');
  check('行商：每天 5 樣貨', await page.evaluate(() => window.SHL.shopRows().length === 5));
  await audit(page, '驛站・天星行商');

  // 野徑岔口：探查出隱藏地點
  await refresh(page);
  await travelTo(page, 'chakou');
  s = await st(page);
  check('野徑岔口是可進入的荒野', s.loc === 'chakou' && s.scene === 'wild');
  await audit(page, '荒野・野徑岔口');
  check('探查找出隱藏地點「鴉巢」', await exploreUntil(page, () => !!window.SHL.state.known.yachao, 40));
  await settle(page);
  await page.evaluate(() => window.SHL.toMap());
  check('鴉巢出現在地圖上，而且走得到', (await has(page, 'node-yachao')) && await page.evaluate(() => window.SHL.route('chakou', 'yachao').length === 1));
  await refresh(page);
  await travelTo(page, 'yachao');
  await enter(page, 'yc_nest');
  s = await st(page);
  const fresh = s.codex.length;
  await click(page, 'svc-report');
  s2 = await st(page);
  check('鴉巢：向赤鴉回報見聞換銀兩與鴉衛聲望', s2.silver === s.silver + fresh * 8 && s2.rep.crow >= fresh * 2 && s2.reported.length === fresh, { fresh, crow: s2.rep.crow });
  await page.evaluate(() => { window.SHL._debug.addRep('crow', 6); window.SHL.state.silver += 20; window.SHL.setTab('yc_nest'); });
  await click(page, 'btn-judge-0');
  s = await st(page);
  check('鴉衛聲望 6：赤鴉替你辨傳聞', s.rumors[0].judged && s.rumors[0].traced && !!s.rumors[0].hint);
  await audit(page, '鴉巢・赤鴉');
  await shot(page, '10-crow-nest.png');

  // ===== 9. 荒野採集＋營火 =====
  await refresh(page);
  await travelTo(page, 'qingwu');
  await audit(page, '荒野・青霧藥林');
  s = await st(page);
  const cai0 = s.prof.cai.lv * 100 + s.prof.cai.xp;
  await click(page, 'act-herb'); await settle(page);
  await click(page, 'gpt-h1'); await settle(page);
  s = await st(page);
  check('荒野採藥（按鈕與場景採集點）', cnt(s, 'herb_zx') >= 2 && s.prof.cai.lv * 100 + s.prof.cai.xp > cai0);
  await click(page, 'gpt-h2'); await settle(page);
  if (cnt(await st(page), 'leaf_qx') < 2) { await click(page, 'gpt-h2'); await settle(page); }
  await click(page, 'act-ore'); await settle(page);
  check('荒野挖礦', cnt(await st(page), 'ore_fe') >= 1);
  check('營火未生時配方不可製', await page.$eval('[data-testid=craft-r_hp]', (b) => b.disabled));
  await click(page, 'act-camp');
  check('紮營生火', (await st(page)).fire === true);
  s = await st(page);
  await click(page, 'craft-r_hp');
  await click(page, 'craft-r_ft');
  s2 = await st(page);
  check('營火製藥：金創藥水、提神湯藥', cnt(s2, 'pot_hp') === cnt(s, 'pot_hp') + 1 && cnt(s2, 'pot_ft') >= 1);
  check('荒野有 5 個行動（含探查）與 5 張配方卡', (await page.$$('.gbtn')).length === 5 && (await page.$$('.recipes .rcard')).length === 5);
  await shot(page, '11-wild-campfire.png');

  // ===== 10. 戰鬥：行動列、點武器出手、招式、狀態 =====
  await refresh(page);
  await click(page, 'act-track');
  s = await st(page);
  check('追蹤獸跡進入第一人稱戰鬥', s.scene === 'combat' && s.combat.ctx.type === 'hunt');
  await audit(page, '戰鬥・狩獵');
  check('敵頭頂意圖預告', /攻擊|重擊|流血|蓄力|防禦/.test(await page.textContent('[data-testid=intent-0]')));
  check('戰鬥只畫敵人；自己的狀態牌在舞台上', (await page.$$('.enemy')).length === s.combat.enemies.length && (await has(page, 'plate')) && (await page.textContent('[data-testid=order]')).includes('你'));
  const acts = await page.evaluate(() => window.SHL.combatActions().map((a) => a.kind + ':' + a.id));
  check('#8 行動列把武器、招式、防禦、道具、待機放在一起', acts[0] === 'attack:attack' && acts.some((a) => a.startsWith('tech:')) && acts.includes('defend:defend') && acts.includes('item:item:pot_hp') && acts.includes('wait:wait') && (await page.$$('.abar .act')).length === acts.length + 1, acts);
  check('沒練到的招式顯示門檻、不能按', await page.$eval('[data-testid=act-t_slash]', (b) => b.disabled && b.textContent.includes('刀劍 10')));
  await page.hover('[data-testid=act-attack]');
  check('滑過行動顯示說明', (await page.textContent('[data-testid=adesc]')).includes('普通攻擊'));
  let ehp0 = s.combat.enemies[0].hp, attacked = false;
  for (let i = 0; i < 5 && !attacked; i++) { await click(page, 'slot-main'); const s3 = await st(page); attacked = !s3.combat || s3.combat.enemies[0].hp < ehp0 || s3.combat.round > 1; }
  check('#8 直接點人形上的主手武器＝出手', attacked && !!(await st(page)).equip.main);
  // 招式：刀劍 10 → 橫斬，耗疲累、進冷卻
  if ((await st(page)).scene !== 'combat') { await settle(page); await page.evaluate(() => window.SHL._debug.startCombat(['wolf', 'bug'], { type: 'hunt', node: 'qingwu' })); }
  await page.evaluate(() => { const S = window.SHL.state; S.prof.dao.lv = 30; S.fat = 10; S.hp = window.SHL.maxHp(); window.SHL.setTarget(S.combat.enemies.findIndex((e) => e.hp > 0)); });
  s = await st(page);
  await click(page, 'act-t_slash');
  s2 = await st(page);
  check('招式〈橫斬〉：增加疲累、進入冷卻', s2.fat >= s.fat + 4 && (!s2.combat || s2.combat.cds.t_slash > 0), { fat: s.fat + '→' + s2.fat, cd: s2.combat && s2.combat.cds.t_slash });
  if (s2.combat) check('冷卻中的招式不能再按，並顯示回合數', await page.$eval('[data-testid=act-t_slash]', (b) => b.disabled && !!b.querySelector('.cd')));
  await audit(page, '戰鬥・招式冷卻');
  await shot(page, '12-combat-actionbar.png');
  const wolfQ0 = (await st(page)).quests.find((b) => b.id === 'b_wolf').prog;
  scene = await fight(page);
  s = await st(page);
  check('戰鬥勝利 → 剝皮取肉結算', scene === 'loot' && (cnt(s, 'hide') + cnt(s, 'meat')) > 0, scene);
  check('委託進度：灰髯狼 +1', s.quests.find((b) => b.id === 'b_wolf').prog >= wolfQ0 + 1);
  await click(page, 'btn-loot-done');
  // 狀態：中毒、淬毒油、解毒丸、侵蝕
  await page.evaluate(() => { const G = window.SHL; G.state.pack = G.state.pack.map((x) => (x && x.k === 'pot_hp' ? x : null)); G._debug.addItem({ k: 'poison_oil', n: 1 }); G._debug.addItem({ k: 'antidote', n: 1 }); G.state.hp = G.maxHp(); G._debug.startCombat(['golem'], { type: 'wild', node: 'qingwu' }); G.state.combat.poison = 3; G.save(); G.setOverlay(null); });
  await click(page, 'act-item-poison_oil');
  s = await st(page);
  check('淬毒油：塗上兵刃（本場有效）', s.combat.oil === true && cnt(s, 'poison_oil') === 0);
  if (s.combat.poison > 0) { await click(page, 'act-item-antidote'); check('解毒丸：解除中毒', (await st(page)).combat.poison === 0); }
  await page.evaluate(() => { window.SHL._debug.addCorrupt(5); window.SHL.setOverlay(null); });
  s = await st(page);
  check('侵蝕：生命上限下降', s.corrupt === 5 && await page.evaluate(() => window.SHL.maxHp() === 50 + window.SHL.attrVal('ti') * 3 - 5));
  await audit(page, '戰鬥・守墓俑與狀態');
  await page.evaluate(() => { const G = window.SHL; G.state.combat = null; G.state.corrupt = 0; G.enterHere(); G.save(); });

  // ===== 11. 戰鬥演出（開啟動畫） =====
  await page.goto(base + 'index.html');
  await page.waitForSelector('[data-testid=wild]');
  await page.evaluate(() => { const G = window.SHL; G.state.hp = G.maxHp(); G._debug.startCombat(['corpse'], { type: 'wild', node: 'qingwu' }); G.setOverlay(null); });
  await page.waitForSelector('[data-testid=combat]');
  const hpBefore = await page.textContent('.enemy .ehpn');
  await click(page, 'act-attack');
  await page.waitForTimeout(140);
  const mid = await page.evaluate(() => ({ nums: document.querySelectorAll('.fnum').length, round: window.SHL.state.combat ? window.SHL.state.combat.round : 0, domRound: document.querySelector('[data-testid=round]').textContent }));
  check('#7 出手後先演出（傷害數字跳出），畫面還停在上一回合', mid.nums >= 1 && mid.domRound === '第 1 回合', mid);
  await shot(page, '13-combat-fx.png');
  await page.waitForTimeout(2200);
  const aft = await page.evaluate(() => ({ nums: document.querySelectorAll('.fnum').length, domRound: document.querySelector('[data-testid=round]') ? document.querySelector('[data-testid=round]').textContent : 'x', round: window.SHL.state.combat ? window.SHL.state.combat.round : 0 }));
  check('演出結束後畫面換成新狀態', aft.nums === 0 && (aft.round === 0 || aft.domRound === '第 ' + aft.round + ' 回合'), aft);
  if (aft.round) {
    await click(page, 'act-attack'); await click(page, 'act-attack');
    const fast = await page.evaluate(() => window.SHL.state.combat ? window.SHL.state.combat.round : 99);
    check('演出中再按：立刻收尾並執行下一步（不吃按鍵）', fast >= aft.round + 2 || fast === 99, { before: aft.round, after: fast });
  }
  await page.evaluate(() => { const G = window.SHL; G.state.combat = null; G.enterHere(); G.save(); });
  await page.goto(base + 'index.html?fx=0');
  await page.waitForSelector('[data-testid=wild]');
  check('重新載入後讀回存檔（同局、同地點）', (await st(page)).loc === 'qingwu');

  // ===== 12. 棄物撤退 =====
  let retreatOk = false, sawRateUp = false, groundOk = false;
  for (let tries = 0; tries < 8 && !retreatOk; tries++) {
    await page.evaluate(() => { const G = window.SHL; const S = G.state; S.hp = G.maxHp(); S.fat = 5; S.food = 90; if (!S.combat) { if (S.scene !== 'wild') G.enterHere(); G._debug.addItem({ k: 'ore_fe', n: 2 }); G._debug.startCombat(['wolf'], { type: 'hunt', node: S.loc }); } G.setOverlay(null); });
    await click(page, 'act-retreat');
    await page.waitForSelector('[data-testid=retreat-bar]');
    if (tries === 0) await audit(page, '戰鬥・棄物撤退確認條');
    const r0 = await page.textContent('[data-testid=retreat-rate]');
    const heavy = await page.evaluate(() => window.SHL.state.pack.map((x, i) => [x ? window.SHL.itemWt(x) : 0, i, x && x.k]).filter((a) => a[0] > 0 && a[2] !== 'pot_hp').sort((a, b) => b[0] - a[0]).slice(0, 2).map((a) => a[1]));
    for (const i of heavy) await click(page, 'drop-' + i);
    const r1 = await page.textContent('[data-testid=retreat-rate]');
    const m = r1.match(/(\d+)% → (\d+)%/);
    if (m && +m[2] > +m[1]) sawRateUp = true;
    if (tries === 0) await shot(page, '14-combat-retreat.png');
    await click(page, 'btn-retreat-confirm');
    s = await st(page);
    if (s.scene !== 'combat' && !s.dead) {
      retreatOk = true;
      check('棄物撤退成功、丟下的貨落在左欄地面', s.ground.items.length > 0, r0 + ' ⇒ ' + r1);
      const before = s.pack.filter(Boolean).length;
      await click(page, 'ground-0');
      groundOk = (await st(page)).pack.filter(Boolean).length > before;
    } else if (s.scene === 'combat') { await fight(page); await settle(page); }
  }
  check('棄物撤退：勾選物品後撤退率上升', sawRateUp);
  check('棄物撤退成功脫離戰鬥', retreatOk);
  check('地面暫放格點擊撿回行囊', groundOk);

  // ===== 13. 傳聞現場、未鑑定 =====
  await page.evaluate(() => { const G = window.SHL; G.state.rumors = []; G._debug.addRumor('cache', 'qingwu', 'true'); G.state.prof.zong.lv = 20; G.enterHere(); G.save(); });
  check('荒野出現傳聞現場；追蹤不到 25 不能看痕跡', (await has(page, 'btn-investigate')) && !(await has(page, 'btn-trace')));
  s = await st(page);
  await click(page, 'btn-investigate');
  s2 = await st(page);
  check('查探屬實的秘寶：到手未鑑定裝備與銀兩，鴉衛聲望 +1', s2.scene === 'event' && !!s2.event.result && s2.silver > s.silver && s2.pack.some((x) => x && x.k === 'eq' && x.eq.unid) && s2.rumors.length === 0 && s2.rep.crow > s.rep.crow);
  await audit(page, '傳聞結果');
  await click(page, 'btn-ev-done');
  s = await st(page);
  const ui = s.pack.findIndex((x) => x && x.k === 'eq' && x.eq.unid);
  await page.hover('[data-testid=pack-' + ui + ']');
  check('未鑑定裝備提示卡不顯示詞綴', (await page.evaluate(() => document.getElementById('tip').innerText)).includes('？？？'));
  check('提示卡只在左欄（不跨進中欄）', await page.evaluate(() => { const r = document.getElementById('tip').getBoundingClientRect(); return r.left >= 10 && r.right <= 242 && r.bottom <= 720; }));
  await page.mouse.move(640, 300);
  await page.evaluate(() => { const G = window.SHL; G.state.prof.zong.lv = 25; G._debug.addRumor('vein', 'qingwu', 'guard'); G.enterHere(); });
  await click(page, 'btn-trace');
  check('追蹤 25 辨痕：到現場可先看痕跡', (await st(page)).log.some((l) => l.text.includes('好幾個人的腳印')));
  await click(page, 'btn-investigate');
  check('有人盤踞：可打、可談、可走', (await page.$$('[data-testid^=ev-r_]')).length === 3);
  await audit(page, '傳聞・有人盤踞');
  await shot(page, '15-rumor-guard.png');
  await click(page, 'ev-r_leave'); await click(page, 'btn-ev-done');
  await page.evaluate(() => { const G = window.SHL; G.state.rumors = []; G._debug.addRumor('beast', 'qingwu', 'strong'); G.enterHere(); });
  await click(page, 'btn-investigate'); await click(page, 'ev-r_boss');
  s = await st(page);
  check('強敵鎮守：硬闖對上山魈', s.scene === 'combat' && s.combat.enemies[0].id === 'xiao');
  await page.evaluate(() => { const G = window.SHL; G.state.combat = null; G.state.rumors = []; G.enterHere(); G.save(); });

  // ===== 14. 渡陰關、破曉營 =====
  await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'duyin'; S.silver = 300; S.visited.duyin = true; G.enterHere(); G.save(); });
  check('渡陰關平面圖：6 棟建築＋關門、1 個路人', (await page.$$('.plan .bld')).length === 7 && (await page.$$('.plan .fig')).length === 1);
  await audit(page, '渡陰關・街上');
  await shot(page, '16-duyin-street.png');
  await click(page, 'npc-np_refugee');
  await click(page, 'bounty-b_refugee');
  s = await st(page);
  check('路人的私人委託：難民婦人託你找軍牌', s.quests.find((q) => q.id === 'b_refugee').status === 'active');
  await page.evaluate(() => { window.SHL._debug.addItem({ k: 'dogtag', n: 1 }); window.SHL.streetTalk('np_refugee'); });
  await click(page, 'bounty-b_refugee');
  s2 = await st(page);
  check('把軍牌交給她：得報酬，不算軍團聲望', s2.quests.find((q) => q.id === 'b_refugee').status === 'claimed' && s2.silver === s.silver + 20 && s2.rep.dawn === s.rep.dawn);
  await click(page, 'btn-street-close');
  await enter(page, 'dy_market');
  const li = await page.evaluate(() => { const G = window.SHL; const S = G.state; const i = S.pack.findIndex((x) => !x); S.pack[i] = G._debug.lootEq('legend'); G.setTab('dy_market'); return i; });
  s = await st(page);
  await click(page, 'buyback-' + li);
  await click(page, 'btn-identify');
  s2 = await st(page);
  check('天星關市付費鑑定傳奇：扣 30 兩、詞綴現形', s2.silver === s.silver - 30 && s2.pack[li].eq.unid === false && !!s2.pack[li].eq.unique);
  const fineIdx = await shopIndexOf(page, "row.it.k==='eq' && row.it.eq.base==='bag_fine'");
  await click(page, 'shop-' + fineIdx);
  check('精工大囊要天星商會聲望 25 才買得到', await page.$eval('[data-testid=btn-buy]', (b) => b.disabled) && (await page.textContent('[data-testid=trade]')).includes('天星商會聲望 25'));
  await enter(page, 'dy_tower');
  await click(page, 'svc-look');
  check('關樓登樓遠望：看得出獸潮還有幾天', (await st(page)).log.some((l) => /登樓遠望/.test(l.text)));
  await enter(page, 'dy_inn');
  await audit(page, '渡陰關・酒肆');
  // 委託交付 → 破曉軍團聲望
  await page.evaluate(() => { const G = window.SHL; const S = G.state; const q = S.quests.find((x) => x.id === 'b_jiku'); q.status = 'done'; G.setTab('dy_board'); });
  s = await st(page);
  await click(page, 'bounty-b_jiku');
  s2 = await st(page);
  check('交付委託：得報酬、破曉軍團聲望上升', s2.silver === s.silver + 150 && s2.rep.dawn === s.rep.dawn + 4);
  // 破曉營
  await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'poxiao'; S.visited.poxiao = true; G.enterHere(); G.save(); });
  check('破曉營平面圖：4 棟建築＋出口、2 個路人', (await page.$$('.plan .bld')).length === 5 && (await page.$$('.plan .fig')).length === 2);
  await audit(page, '破曉營・街上');
  await enter(page, 'px_drill');
  s = await st(page);
  await click(page, 'drill-qiang');
  s2 = await st(page);
  check('校場操練：付 15 兩、4 小時，長兵大幅成長', s2.silver === s.silver - 15 && s2.t === s.t + 240 && s2.prof.qiang.lv >= s.prof.qiang.lv + 5, s.prof.qiang.lv + '→' + s2.prof.qiang.lv);
  await click(page, 'svc-pozhen');
  check('〈破陣〉要破曉軍團聲望 10', !(await st(page)).skills.includes('pozhen'));
  await page.evaluate(() => { window.SHL._debug.addRep('dawn', 10); window.SHL.setTab('px_drill'); });
  await click(page, 'svc-pozhen');
  check('聲望夠了：學會〈破陣〉，戰鬥行動列多一格', (await st(page)).skills.includes('pozhen') && await page.evaluate(() => { const G = window.SHL; G._debug.startCombat(['wolf'], { type: 'wild', node: 'qingwu' }); const ok = G.combatActions().some((a) => a.id === 'pozhen' && a.kind === 'skill'); G.state.combat = null; G.enterHere(); return ok; }));
  await enter(page, 'px_drill');
  await audit(page, '破曉營・校場');
  await shot(page, '17-drill.png');
  await page.evaluate(() => { window.SHL._debug.addCorrupt(8); window.SHL.state.hp = 20; window.SHL.setTab('px_medic'); });
  await click(page, 'svc-cleanse'); await click(page, 'svc-heal');
  s = await st(page);
  check('傷兵帳：清除侵蝕、治傷', s.corrupt === 0 && s.hp === await page.evaluate(() => window.SHL.maxHp()));
  await audit(page, '破曉營・傷兵帳');

  // ===== 15. 獸潮 =====
  await page.evaluate(() => { const G = window.SHL; const S = G.state; S.world.next = G.dayOf(S.t); G._debug.worldTick(G.dayOf(S.t)); G.save(); G.setTab(null); });
  s = await st(page);
  check('獸潮開始：自動掛上「擊退獸潮」、右欄日期變成警示', !!s.world.tide && s.quests.some((q) => q.kind === 'tide' && q.status === 'active') && (await page.textContent('[data-testid=date]')) === '獸潮');
  await audit(page, '獸潮期間');
  await page.evaluate(() => { const G = window.SHL; const S = G.state; G._debug.worldTick(S.world.tide.end + 1); G.save(); G.enterHere(); });
  s = await st(page);
  check('獸潮沒擊退：城鎮受創', !s.world.tide && Object.keys(s.world.hurt).length === 1 && !s.quests.some((q) => q.kind === 'tide'));
  await page.evaluate(() => { window.SHL.state.world.hurt = {}; window.SHL.save(); });

  // ===== 16. 人物面板 =====
  await click(page, 'sys-char');
  check('人物面板：7 素質、24 熟練度、招式與技能清單', (await has(page, 'overlay-char')) && (await page.$$('.cattr')).length === 7 && (await page.$$('.cprof')).length === 24 && (await page.$$('.ctech')).length >= 13);
  await shot(page, '18-character.png');
  await click(page, 'sys-char');

  // ===== 17. 新地城：無名古塚（探查腐骨沼找到）與酉神裂口的血霧 =====
  await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'fuzhao'; S.visited.fuzhao = true; S.found.fuzhao = 1; G.enterHere(); });
  await audit(page, '荒野・腐骨沼');
  check('探查腐骨沼找出隱藏地城「無名古塚」', await exploreUntil(page, () => !!window.SHL.state.known.guzhong, 40));
  await settle(page);
  await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'liekou'; S.visited.liekou = true; S.corrupt = 0; S.hp = G.maxHp(); G.enterHere(); G.save(); });
  check('酉神裂口：4 層、標示血霧', (await page.$$('.floor')).length === 4 && (await page.textContent('.stagehead')).includes('血霧'));
  await audit(page, '地城・酉神裂口');
  await shot(page, '19-rift.png');
  await click(page, 'btn-delve');
  s = await st(page);
  check('深入裂口：血霧侵蝕 +2、進入戰鬥', s.corrupt === 2 && s.scene === 'combat' && s.combat.ctx.type === 'dungeon');
  await audit(page, '戰鬥・酉神裂口');

  // ===== 18. 戰至永久死亡 =====
  let guard = 0;
  while (guard++ < 60) {
    s = await st(page);
    if (s.scene === 'dead') break;
    if (s.scene === 'combat') { await fight(page, { noHeal: true }); continue; }
    if (s.scene === 'loot') { await click(page, 'btn-loot-done'); continue; }
    if (s.scene === 'dungeon') { if (await has(page, 'btn-delve')) { await click(page, 'btn-delve'); continue; } await page.evaluate(() => window.SHL._debug.passTime(24)); continue; }
    await settle(page);
    await page.evaluate(() => { const G = window.SHL; G.state.loc = 'liekou'; G.enterHere(); });
  }
  s = await st(page);
  check('戰至永久死亡 → 墓誌銘', s.scene === 'dead' && (await has(page, 'epitaph')), s.dead && s.dead.cause);
  const epi = await page.textContent('[data-testid=epitaph]');
  check('墓誌銘含死因、卒時、出身、享年、素質、探得與見聞', /死因/.test(epi) && /卒於第 \d+ 日 \d{2}:\d{2}/.test(epi) && /流民・享年 \d+/.test(epi) && /體魄 \d+/.test(epi) && /見聞 \d+\/25/.test(epi), epi.replace(/\s+/g, ' ').slice(0, 100));
  check('純永久死亡：存檔已刪除', (await page.evaluate(() => localStorage.getItem('shanhailu.save'))) === null);
  await audit(page, '死亡墓誌銘');
  await shot(page, '20-death-epitaph.png');
  await click(page, 'btn-restart');
  s = await st(page);
  check('一鍵重開：先選出身（6 種，各有頭像）', s.scene === 'origin' && (await page.$$('[data-testid^=origin-]')).length === 6 && (await page.$$('.oface .px')).length === 6);
  await audit(page, '出身選擇');
  await shot(page, '00-origin.png');
  await click(page, 'origin-hunter');
  s = await st(page);
  check('選獵戶：回到灰窯鎮街上 第 1 日 08:00、滿血、新存檔', s.scene === 'town' && s.loc === 'huiyao' && s.t === 480 && s.hp === 80 && !s.dead && (await page.evaluate(() => !!localStorage.getItem('shanhailu.save'))));
  check('獵戶起手：靈覺 12、追蹤 20、剝皮 16、獵弓', s.attr.ling === 12 && s.prof.zong.lv === 20 && s.prof.bo.lv === 16 && s.equip.main.base === 'bow');

  // ===== 19. 拖拉道具 =====
  const center = async (sel) => { const b = await (await page.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const dragTo = async (from, to) => { const [x1, y1] = await center(from); const [x2, y2] = await center(to); await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 4 }); await page.mouse.move(x2, y2, { steps: 4 }); await page.mouse.up(); };
  await dragTo('[data-testid=pack-0]', '[data-drop="pack:4"]');
  s = await st(page);
  check('拖拉：行囊格之間搬移', s.pack[0] === null && s.pack[4] && s.pack[4].k === 'pot_hp');
  await dragTo('[data-testid=pack-4]', '[data-testid=pack-1]');
  s = await st(page);
  check('拖拉：行囊格互換', s.pack[1].k === 'pot_hp' && s.pack[4].k === 'bread');
  await dragTo('[data-testid=slot-chest]', '[data-drop="pack:0"]');
  s = await st(page);
  check('拖拉：人形槽→行囊＝卸下', s.equip.chest === null && s.pack[0] && s.pack[0].k === 'eq' && s.pack[0].eq.base === 'robe');
  await dragTo('[data-testid=pack-0]', '[data-testid=slot-chest]');
  s = await st(page);
  check('拖拉：行囊→人形槽＝裝備', s.equip.chest && s.equip.chest.base === 'robe' && s.pack[0] === null);
  await dragTo('[data-testid=pack-4]', '[data-testid=ground]');
  s = await st(page);
  check('拖拉：行囊→地面＝丟下', s.pack[4] === null && s.ground.items.length === 1 && s.ground.items[0].k === 'bread');
  await dragTo('[data-testid=ground-0]', '[data-drop="pack:2"]');
  s = await st(page);
  check('拖拉：地面→行囊＝撿起', s.ground.items.length === 0 && s.pack.some((x) => x && x.k === 'bread'));
  await click(page, 'slot-chest');
  s = await st(page);
  check('點擊行為不變：街上點人形槽卸下、點行囊裝備', s.equip.chest === null);
  await click(page, 'pack-' + s.pack.findIndex((x) => x && x.k === 'eq' && x.eq.base === 'robe'));
  check('點行囊裝備穿回', (await st(page)).equip.chest.base === 'robe');
  await enter(page, 'hy_market');
  s = await st(page);
  const breadShop = await shopIndexOf(page, "row.it.k==='bread'");
  await dragTo('[data-testid=shop-' + breadShop + ']', '[data-drop="pack:5"]');
  s2 = await st(page);
  check('拖拉：貨架→行囊＝買一個', s2.silver < s.silver && cnt(s2, 'bread') === cnt(s, 'bread') + 1);
  const breadI = await packIndexOf(page, 'bread');
  await dragTo('[data-testid=pack-' + breadI + ']', '[data-testid=trade]');
  s = await st(page);
  check('拖拉：行囊→交易欄＝賣出', s.silver > s2.silver && cnt(s, 'bread') < cnt(s2, 'bread'));
  check('拖拉結束後沒有殘留的拖影', (await page.$$('.ghost, .dropok, .dragsrc')).length === 0);
  await audit(page, '市集（獵戶）');

  // ===== 20. 視窗等比縮放 =====
  for (const [vw, vh] of [[1280, 600], [1024, 576], [1600, 900], [900, 800]]) {
    await page.setViewportSize({ width: vw, height: vh }); await page.waitForTimeout(120);
    const r = await page.evaluate(() => { const b = document.getElementById('app').getBoundingClientRect(); const sys = document.querySelector('.sysbtns').getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, sysB: sys.bottom, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }; });
    check('視窗 ' + vw + '×' + vh + '：整個畫面縮放後完整可見、底部按鈕不被截掉', r.l >= -0.5 && r.t >= -0.5 && r.r <= vw + 0.5 && r.b <= vh + 0.5 && r.sysB <= vh && r.sw <= vw && r.sh <= vh, { app: [r.l, r.t, r.r, r.b].map((v) => Math.round(v)) });
  }
  await page.setViewportSize({ width: 1024, height: 576 }); await page.waitForTimeout(120);
  await dragTo('[data-testid=pack-1]', '[data-drop="pack:3"]');
  s = await st(page);
  check('縮放後拖拉仍準確', s.pack[3] && s.pack[3].k === 'pot_hp' && s.pack[1] === null);
  await page.hover('[data-testid=slot-main]');
  check('縮放後提示卡仍在左欄內', await page.evaluate(() => { const t = document.getElementById('tip').getBoundingClientRect(); const c = document.getElementById('col-left').getBoundingClientRect(); return t.left >= c.left && t.right <= c.right && t.bottom <= c.bottom; }));
  await page.mouse.move(600, 300);
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(120);

  // ===== 21. 覆蓋層、夜間時間 =====
  await click(page, 'sys-log');
  check('系統鈕：日誌', await has(page, 'overlay-log'));
  await click(page, 'sys-log');
  await page.evaluate(() => { window.SHL._debug.passTime(14); window.SHL.save(); window.SHL.toMap(); });
  await check24h(page, '夜間 22:00');

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));

  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
