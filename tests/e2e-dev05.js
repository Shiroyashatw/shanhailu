/* 《山海錄》DEV-05 城況簡報接入（含用詞）— 新增驗收（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e-dev05.js [--shots]
 *   --shots  另存 1280×720 實機截圖（deviceScaleFactor 2）至 docs/evidence/shots-shanhailu-dev05-1128/（可用 SHOTS_DIR 覆寫）
 * fix1（1128）：依 SPEC-TIME v0.5 §7.1b／§7.2／B1、SPEC-01 v0.5 §4.9／§7、SPEC-02 驗收 34、decisions-producer-1128-1727、dev05-strings-v0.1。
 * 依據（初版）：docs/design/batch1/specs/SPEC-01.md v0.4 §7、§13；UI-02/README.md 與 UI-02-01／02／03／05／06；
 *       UI-02/wording-map-commission.md；city-status-copy-v0.1.csv；decisions-producer-1128-1646.md 第 1 項；rollout-plan-v0.1.md 第 116 行。
 * 既有 tests/e2e.js、tests/e2e-dev02.js 不在此重複；本檔只放 DEV-05 的新斷言。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS_DIR ? path.resolve(ROOT, process.env.SHOTS_DIR) : path.join(ROOT, 'docs/evidence/shots-shanhailu-dev05-1128');
const WANT_SHOTS = process.argv.includes('--shots');
const SEED = 20261127;
const SPEED_HINT = '趕路速度受負重、裝備與疲累影響'; // 1727 第 1 項定稿（取代 16:29 舊句）

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
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined && detail !== '' ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
}
// 版面稽核：1280×720 無捲動、三欄 240／796／220；新塊（城況、底列、委託單）在中欄內、文字不被裁切、塊內文字不互相重疊
async function audit(page, label, sel) {
  const r = await page.evaluate((sel) => {
    const w = (id) => document.getElementById(id).getBoundingClientRect();
    const C = w('col-center');
    const out = { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, c: [w('col-left').width, C.width, w('col-right').width], outside: [], clipped: [], overlaps: [], n: 0 };
    const boxes = Array.from(document.querySelectorAll(sel));
    const texts = [];
    boxes.forEach((box) => {
      const b = box.getBoundingClientRect();
      if (b.left < C.left - 0.5 || b.right > C.right + 0.5 || b.top < C.top - 0.5 || b.bottom > C.bottom + 0.5) out.outside.push(box.className);
      const tw = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = tw.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        const el = n.parentElement; const cs = getComputedStyle(el);
        if (cs.display === 'none' || el.closest('[style*="display:none"]')) continue;
        if (el.scrollWidth > el.clientWidth + 1 && cs.overflow === 'hidden') out.clipped.push(el.textContent.trim().slice(0, 24));
        const rg = document.createRange(); rg.selectNodeContents(n);
        Array.from(rg.getClientRects()).filter((x) => x.width > 0.5).forEach((x) => {
          // 委託格可捲動：只看可見部分
          const sc = el.closest('.qgrid'); if (sc) { const g = sc.getBoundingClientRect(); if (x.bottom <= g.top || x.top >= g.bottom) return; }
          if (x.left < C.left - 0.5 || x.right > C.right + 0.5) out.outside.push(n.nodeValue.trim().slice(0, 16));
          texts.push({ el, t: n.nodeValue.trim().slice(0, 16), r: x });
        });
      }
    });
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j]; if (a.el === b.el) continue;
      const ww = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), hh = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ww > 2 && hh > 2) out.overlaps.push([a.t, b.t]);
    }
    out.n = texts.length;
    return out;
  }, sel);
  check('[' + label + '] 1280×720 無捲動、三欄 240/796/220', r.sw <= 1280 && r.sh <= 720 && r.c.join('/') === '240/796/220', { sw: r.sw, sh: r.sh, c: r.c });
  check('[' + label + '] 新塊在中欄內、文字無裁切、無重疊（' + r.n + ' 段）', r.n > 0 && !r.outside.length && !r.clipped.length && !r.overlaps.length, { outside: r.outside.slice(0, 3), clipped: r.clipped.slice(0, 3), overlaps: r.overlaps.slice(0, 3) });
}
async function shot(page, name) {
  if (!WANT_SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('SHOT  ' + path.relative(ROOT, path.join(SHOTS, name)));
}
async function fresh(page, base) {
  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');
}
const txt = (page, id) => page.textContent('[data-testid=' + id + ']').then((s) => (s || '').trim()).catch(() => null);
// 重繪（ui.js 只在 emit 時重畫）：用 setProfTab 觸發
const redraw = (page) => page.evaluate(() => { const G = window.SHL; G.setProfTab(G.state.profTab); });
async function expand(page, open) {
  const isOpen = !!(await page.$('[data-testid=city-detail]'));
  if (isOpen !== open) await page.click('[data-testid=city-toggle]');
}
// 畫面上的城況（讀 DOM）
async function cityDom(page) {
  return page.evaluate(() => {
    const t = (id) => { const e = document.querySelector('[data-testid=' + id + ']'); return e ? e.textContent.trim() : null; };
    const tile = (k) => { const e = document.querySelector('[data-testid=city-' + k + '] .cv'); return e ? e.textContent.trim() : null; };
    const money = Array.from(document.querySelectorAll('[data-testid=city-money] span')).map((e) => e.textContent.trim());
    return { p: tile('prosperity'), o: tile('order'), tr: tile('treasury'), money, why: t('city-why'), taxcut: t('city-taxcut'), rescue: t('city-rescue'), garrison: t('city-garrison'), bandit: t('city-bandit'),
      pSub: (document.querySelector('[data-testid=city-prosperity] .cs') || {}).textContent || null };
  });
}
// 依 brief 與 TEXT 表推「畫面應該顯示什麼」（測試端的對照，不經 ui.js）
async function cityWant(page, tid) {
  return page.evaluate((tid) => {
    const D = window.SHL_DATA, G = window.SHL, S = G.state, C = D.TEXT.city;
    const t = S.world.towns[tid], b = t.brief;
    const tier = (tab, v) => tab.find((r) => v < r[0])[1];
    const sg = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0');
    const bN = tier(C.bandit, S.world.region.B);
    return {
      brief: { In: b.treasuryIn, Out: b.treasuryOut, Net: b.treasuryNet, T: b.T, tier: b.treasuryTier, trend: b.trend, why: b.whyCode, Geff: b.Geff, taxCutDays: b.taxCutDays, rescueToday: b.rescueToday, rescueAmt: b.rescueAmt, aidToday: b.aidToday, aidDaysLeft: b.aidDaysLeft, debtToday: b.debtToday },
      p: tier(C.prosperity, t.P) + C.arrow[b.trend], o: tier(C.order, t.O), tr: C.treasury[b.treasuryTier],
      money: ['今日收入' + b.treasuryIn + '兩', '今日支出' + b.treasuryOut + '兩', '今日淨額' + sg(b.treasuryNet) + '兩', '現額' + Math.round(b.T) + '兩'],
      why: b.trend === 'flat' ? '與昨日持平' : C.why[b.whyCode].replace('{trend}', C.trend[b.trend]).replace('{bandit}', bN),
      garrisonName: D.WORLD.GARRISON_NAMES[b.Geff],
    };
  }, tid);
}
async function gotoTown(page, tid) {
  await page.evaluate((tid) => { const G = window.SHL; const S = G.state; S.scene = 'town'; S.loc = tid; S.townTab = null; S.street = null; S.combat = null; S.event = null; S.dead = null; G.save(); G.setProfTab(S.profTab); }, tid);
  await page.waitForSelector('[data-testid=citybar]');
}
function sameCity(dom, want) {
  return dom.p === want.p && dom.o === want.o && dom.tr === want.tr && JSON.stringify(dom.money) === JSON.stringify(want.money) && dom.why === want.why && (dom.garrison || '').startsWith('駐軍 ' + want.garrisonName);
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: WANT_SHOTS ? 2 : 1 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => consoleErrors.push('requestfailed: ' + r.url()));

  // ===== 0. 文字集中（假設：檔名待 mumi）：句子在 data.js TEXT，ui.js 不寫死 =====
  // 去掉整行註解；另去掉 main 上 DEV-01b 已落地的狀態提示「力竭：命中與腳程下降」（字串對照表 4.6，非本包文字）
  const src = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace('力竭：命中與腳程下降', '');
  const hard = ['今日收入', '今日支出', '今日淨額', '稅收抽成', '已求援', '與昨日持平', '腳程', '路程', '危險 ', '逾期則撕榜', '逾期押金沒收', '失敗罰則未定', '危險 未定', SPEED_HINT, '自衛隊', '巡邏隊', '守備',
    '尚無消息', '過了午夜', '出城路險', '睡到', '每天補滿', '輕快', '平常', '沉重', '蹣跚'];
  check('城況／腳程／地圖用詞／委託風險句沒有寫死在 ui.js（集中在 data.js TEXT 與 WORLD.GARRISON_NAMES）', hard.every((w) => !src.includes(w)), hard.filter((w) => src.includes(w)));

  // ===== 1. 第一次日結前：brief 為空，不自行補算 =====
  await fresh(page, base);
  await gotoTown(page, 'huiyao');
  const pre = await page.evaluate(() => ({ day: window.SHL.dayOf(window.SHL.state.t), b: JSON.stringify(window.SHL.state.world.towns.huiyao.brief) }));
  await expand(page, true);
  const d0 = await cityDom(page);
  // dev05-strings 1a／1b：「待日結」改「尚無消息」，下方說明「過了午夜才有各鎮消息」（句尾不加句號）
  check('第一次日結前（brief 為空）：財庫顯示「尚無消息」，展開只寫「過了午夜才有各鎮消息」、不出收支數字', pre.b === '{}' && d0.tr === '尚無消息' && d0.money.length === 0 && d0.why === '過了午夜才有各鎮消息', { pre, tr: d0.tr, why: d0.why });
  check('第一次日結前：繁榮／治安仍顯示起手檔位「平常」「尚可」，駐軍「自衛隊」', d0.p === '平常' && d0.o === '尚可' && /^駐軍 自衛隊/.test(d0.garrison), d0);
  await expand(page, false);

  // ===== 2. 起手日（SPEC-01 §7.2、§8.1、AC-A7）：雜訊關閉，跨過第一次 00:00 日結 =====
  await page.evaluate(() => { const G = window.SHL; const S = G.state; G._debug.setNoise(false); G._debug.passTime((1440 - (S.t % 1440)) / 60 + 0.5); S.hp = G.maxHp(); S.food = 100; S.fat = 0; });
  await gotoTown(page, 'huiyao');
  const wantH = await cityWant(page, 'huiyao');
  const domHc = await cityDom(page);
  check('[灰窯起手日・收合] 繁榮「平常」（持平無箭頭）、治安「尚可」、財庫「足餉」', domHc.p === '平常' && domHc.o === '尚可' && domHc.tr === '足餉' && domHc.money.length === 0, domHc);
  await audit(page, '灰窯・收合', '[data-testid=citybar]');
  await shot(page, 'dev05-01-collapsed.png');
  await expand(page, true);
  const domH = await cityDom(page);
  check('[灰窯起手日・展開] brief：In 23、Out 15、Net +8、T 207.96、tier ok、trend flat', wantH.brief.In === 23 && wantH.brief.Out === 15 && wantH.brief.Net === 8 && Math.abs(wantH.brief.T - 207.96) < 0.005 && wantH.brief.tier === 'ok' && wantH.brief.trend === 'flat', wantH.brief);
  check('[灰窯起手日・展開] 畫面：今日收入23兩／今日支出15兩／今日淨額+8兩／現額208兩', JSON.stringify(domH.money) === JSON.stringify(['今日收入23兩', '今日支出15兩', '今日淨額+8兩', '現額208兩']), domH.money);
  check('[灰窯起手日・展開] 持平日只寫「與昨日持平」，不出因果句；繁榮數字行「50　與昨日持平」', domH.why === '與昨日持平' && /^50\s+與昨日持平$/.test(domH.pSub || ''), { why: domH.why, pSub: domH.pSub });
  check('[灰窯起手日・展開] 駐軍「自衛隊」、匪勢「零星 30」、無抽成行、無求援條', domH.garrison === '駐軍 自衛隊' && domH.bandit === '匪勢 零星 30' && domH.taxcut === null && domH.rescue === null, domH);
  check('[灰窯起手日] 畫面與該鎮 brief 逐項一致', sameCity(domH, wantH), { dom: domH, want: wantH });
  await audit(page, '灰窯・展開', '[data-testid=citybar]');
  await shot(page, 'dev05-02-expanded.png');
  await gotoTown(page, 'duyin');
  const wantD = await cityWant(page, 'duyin');
  const domD = await cityDom(page);
  check('[渡陰起手日] brief：In 55、Out 40、Net +15、T 314.81（§8.1；三數取整後相減）', wantD.brief.In === 55 && wantD.brief.Out === 40 && wantD.brief.Net === 15 && Math.abs(wantD.brief.T - 314.81) < 0.005, wantD.brief);
  check('[渡陰起手日] 畫面：今日收入55兩／今日支出40兩／今日淨額+15兩／現額315兩、駐軍「巡邏隊」', JSON.stringify(domD.money) === JSON.stringify(['今日收入55兩', '今日支出40兩', '今日淨額+15兩', '現額315兩']) && domD.garrison === '駐軍 巡邏隊', domD);
  check('[渡陰起手日] 畫面與該鎮 brief 逐項一致（兩鎮各自讀自己的 brief）', sameCity(domD, wantD), { dom: domD, want: wantD });
  await audit(page, '渡陰・展開', '[data-testid=citybar]');

  // ===== 3. 雜訊開啟、連走 12 天：每天兩鎮畫面都與各自的 brief 一致 =====
  const mism = [];
  await page.evaluate(() => window.SHL._debug.setNoise(true));
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => { const G = window.SHL; const S = G.state; G._debug.passTime(24); S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.dead = null; });
    for (const tid of ['huiyao', 'duyin']) {
      await gotoTown(page, tid);
      const w = await cityWant(page, tid), d = await cityDom(page);
      if (!sameCity(d, w)) mism.push({ i, tid, d, w });
    }
  }
  const trends = await page.evaluate(() => [window.SHL.state.world.towns.huiyao.brief.trend, window.SHL.state.world.towns.duyin.brief.trend]);
  check('雜訊開啟連走 12 天 × 兩鎮：畫面檔名、收支、現額、因果句、駐軍皆與 brief 一致', mism.length === 0, mism.slice(0, 2).length ? mism.slice(0, 2) : trends);
  await gotoTown(page, 'huiyao');
  // 非持平日：數字行用 CSV「較昨日+N／−N」、收合有箭頭、因果句方向與 trend 相同
  const moved = await page.evaluate(() => {
    const G = window.SHL; const S = G.state; G._debug.setNoise(false);
    // 合 main（DEV-04）後：世界擲骰的獸潮可能正落在灰窯；此情境驗「無獸潮時市面回穩」，先清掉獸潮再日結（斷言不變）
    S.world.tide = null; S.world.next = G.dayOf(S.t) + 99;
    const t = S.world.towns.huiyao; t.P = 40; t.O = 55; G._debug.townTick(G.dayOf(S.t)); return { trend: t.brief.trend, dP: t.brief.dP, why: t.brief.whyCode };
  });
  await redraw(page);
  const dm = await cityDom(page); const wm = await cityWant(page, 'huiyao');
  check('非持平日（P 40 → 回升）：繁榮「平常↑」、數字行「較昨日+1」、因果句「繁榮較昨日升，因市面回穩」，與 brief 一致', moved.trend === 'up' && dm.p === '平常↑' && /較昨日\+1$/.test(dm.pSub || '') && dm.why === '繁榮較昨日升，因市面回穩' && sameCity(dm, wm), { moved, dm });

  // ===== 4. 駐軍第 3 檔「守備」（列名仍「駐軍」）＋資助加派狀態 =====
  await page.evaluate(() => { const G = window.SHL; const S = G.state; G._debug.setNoise(false); S.world.towns.duyin.F = 100; G._debug.townTick(G.dayOf(S.t) + 1); });
  await gotoTown(page, 'duyin');
  await expand(page, true);
  const g3 = await cityDom(page);
  const g3b = await page.evaluate(() => window.SHL.state.world.towns.duyin.brief);
  check('駐軍第 3 檔畫面字串為「守備」，列名仍「駐軍」；狀態「資助加派中，餘 2 天」（brief.aidDaysLeft）', g3b.Geff === 3 && g3.garrison === '駐軍 守備（資助加派中，餘' + g3b.aidDaysLeft + '天）' && g3b.aidDaysLeft === 2, { garrison: g3.garrison, Geff: g3b.Geff, left: g3b.aidDaysLeft });

  // ===== 5. 受創＋當日求援（UI-02-03）：灰窯 T=10、稅設 0 → 第 3 天自動求援 =====
  await fresh(page, base);
  const rs = await page.evaluate(() => {
    const G = window.SHL; const S = G.state; G._debug.setNoise(false); G._debug.HOOKS.taxMult.huiyao = 0;
    const t = S.world.towns.huiyao; t.T = 10; t.P = 20; t.O = 5; const d0 = G.dayOf(S.t);
    for (let d = 1; d <= 3; d++) G._debug.townTick(d0 + d);
    delete G._debug.HOOKS.taxMult.huiyao;
    S.world.hurt.huiyao = G.dayOf(S.t) + 1; // 受創中（獸潮未擋下的結果；§5.4 屬 DEV-04，此處直接設欄位造狀態）
    return t.brief;
  });
  await gotoTown(page, 'huiyao');
  const dc = await cityDom(page);
  check('[受創求援・收合] 繁榮「荒涼」、治安「混亂」以紅字標示；財庫「欠餉」；頂端警示條', /^荒涼/.test(dc.p) && dc.o === '混亂' && dc.tr === '欠餉' && !!(await page.$('[data-testid=city-prosperity].bad')) && !!(await page.$('[data-testid=city-order].bad')) && /獸潮過後/.test(await txt(page, 'city-warn')), { dc, tier: rs.treasuryTier });
  await expand(page, true);
  const dr = await cityDom(page); const wr = await cityWant(page, 'huiyao');
  check('[受創求援・展開] 求援當日警示條「已求援，得銀90兩」（brief.rescueToday、rescueAmt 90）', rs.rescueToday === true && rs.rescueAmt === 90 && dr.rescue === '已求援，得銀90兩', { rescue: dr.rescue, b: { rescueToday: rs.rescueToday, rescueAmt: rs.rescueAmt } });
  check('[受創求援・展開] 抽成行「稅收抽成，餘10天」（brief.taxCutDays 10）；駐軍「無（欠餉，降一檔）」', rs.taxCutDays === 10 && dr.taxcut === '稅收抽成，餘10天' && dr.garrison === '駐軍 無（欠餉，降一檔）', dr);
  check('[受創求援・展開] 收支與 brief 一致（求援撥款計入今日收入）', sameCity(dr, wr) && rs.treasuryIn === 90, { money: dr.money, In: rs.treasuryIn, Out: rs.treasuryOut });
  await audit(page, '受創求援・展開', '[data-testid=citybar]');
  await shot(page, 'dev05-03-danger.png');
  // 隔天抽成行續顯示、求援條消失；抽成歸 0 後不再顯示
  const nx = await page.evaluate(() => { const G = window.SHL; const S = G.state; G._debug.townTick(G.dayOf(S.t) + 4); return S.world.towns.huiyao.brief.taxCutDays; });
  await redraw(page);
  const dn = await cityDom(page);
  check('求援隔天：警示條不再出現、抽成行「餘9天」', nx === 9 && dn.rescue === null && dn.taxcut === '稅收抽成，餘9天', dn);
  await page.evaluate(() => { const G = window.SHL; const S = G.state; for (let k = 5; k <= 13; k++) G._debug.townTick(G.dayOf(S.t) + k); });
  await redraw(page);
  check('抽成歸 0（taxCutDays 0）後不再顯示抽成行', (await cityDom(page)).taxcut === null);
  await expand(page, false);

  // ===== 6. 地圖趕路：完整用詞＋懸浮（UI-02-05；腳程 16:29 拍板） =====
  await fresh(page, base);
  await page.evaluate(() => { const G = window.SHL; G.toMap(); });
  await page.waitForSelector('[data-testid=worldmap]');
  await page.click('[data-testid=node-qingwu]');
  await page.waitForSelector('[data-testid=route-tip]');
  const mp = await page.evaluate(() => ({
    labels: Array.from(document.querySelectorAll('.departbar .vpill .vl')).map((e) => e.textContent.trim()),
    vals: Array.from(document.querySelectorAll('.departbar .vpill b')).map((e) => e.textContent.trim()),
    bar: document.querySelector('[data-testid=departbar]').textContent, tip: document.querySelector('[data-testid=route-tip]').textContent,
    p: (() => { const p = window.SHL.travelPreview('qingwu'); return { hours: p.hours, food: p.food, fat: p.fat, riskName: p.riskName, mult: p.mult, pace: p.pace, pm: window.SHL.paceMult() }; })(),
  }));
  check('趕路底列五格用完整名詞：路程／飽食／疲累／危險／腳程', mp.labels.join('／') === '路程／飽食／疲累／危險／腳程', mp.labels);
  check('底列「腳程」格寫「檔名 ×M」（輕裝＝輕快 ×1.00；M＝paceMult() 取兩位）', mp.vals[4] === '輕快 ×1.00' && mp.vals[4] === mp.p.pace + ' ×' + mp.p.mult.toFixed(2) && mp.p.mult === mp.p.pm && !/負/.test(mp.bar), { v: mp.vals[4], mult: mp.p.mult });
  check('底列數值與 travelPreview 一致', mp.vals[0] === mp.p.hours + ' 小時' && mp.vals[1] === '−' + mp.p.food && mp.vals[2] === '+' + mp.p.fat && mp.vals[3] === mp.p.riskName, mp.vals);
  check('地點詳情（圖上氣泡）不再用「2小時・食-8」縮寫：路程 N 小時・飽食 −N／疲累 +N・危險 X', /^路程 \d+ 小時・飽食 −\d+疲累 \+\d+・危險 (低|中|高|極高)$/.test(mp.tip) && !/(^|[^飽])食 ?[−-]|(^|[^疲])疲 ?\+|(^|[^危])險 /.test(mp.tip), mp.tip);
  await page.hover('[data-testid=vp-speed]');
  const hs = await txt(page, 'hint-text');
  check('滑過「腳程」：懸浮文案為 1727 定稿「' + SPEED_HINT + '」', hs === SPEED_HINT, hs);
  await audit(page, '地圖趕路＋腳程懸浮', '.departbar, [data-testid=route-tip], [data-testid=hintbox]');
  await shot(page, 'dev05-05-map-move.png');
  const others = [];
  for (const k of ['hours', 'food', 'fat', 'risk']) { await page.hover('[data-testid=' + (k === 'risk' ? 'route-risk' : 'vp-' + k) + ']'); others.push(await txt(page, 'hint-text')); }
  check('路程／飽食／疲累／危險也有懸浮說明（wording-map §1 擬案）', others.every((s) => s && s.length > 6) && others.every((s) => !/時辰/.test(s)), others);
  // 左欄負重底條的 ×M 也改「腳程」並有同一句懸浮
  const lb = await txt(page, 'speed');
  await page.hover('[data-testid=speed]');
  const lh = await txt(page, 'speed-hint');
  check('左欄負重條寫「腳程 檔名 ×M」，滑過顯示同一句定稿', /^腳程 (輕快|平常|沉重|蹣跚) ×\d\.\d\d$/.test(lb) && lh === SPEED_HINT, { lb, lh });
  await page.mouse.move(640, 10);

  // ===== 7. 委託單風險塊（UI-02-06；wording-map §2） =====
  await fresh(page, base);
  const qs = await page.evaluate(() => {
    const G = window.SHL; const S = G.state; const day = G.dayOf(S.t);
    // 造齊四種單：長期獵殺（起手固定單）、有期限獵殺（腐骨沼＝中高）、收集（無險級）、送貨（押金）
    S.quests = S.quests.filter((q) => q.town !== 'huiyao' || q.fixed);
    S.quests.push({ id: 'tq_leech', town: 'huiyao', kind: 'kill', enemy: 'leech', need: 2, g: '蛭', ic: 'leech', title: '獵殺沼蛭 ×2', reward: 34, due: day + 1, fixed: false, prog: 0, status: 'open' });
    S.quests.push({ id: 'tq_col', town: 'huiyao', kind: 'collect', item: 'herb_zx', need: 4, g: '草', ic: 'herb_zx', title: '收購止血草 ×4', reward: 18, due: day + 1, fixed: false, prog: 0, status: 'open' });
    S.quests.push({ id: 'tq_dlv', town: 'huiyao', kind: 'deliver', to: 'duyin', need: 1, g: '包', ic: 'parcel', title: '送貨至渡陰關', reward: 24, deposit: 10, due: day + 2, fixed: false, prog: 0, status: 'open' });
    S.quests.push({ id: 'tq_des', town: 'huiyao', kind: 'kill', enemy: 'deserter', need: 1, g: '兵', ic: 'deserter', title: '獵殺逃兵 ×1', reward: 30, due: day + 4, fixed: false, prog: 0, status: 'open' });
    S.scene = 'town'; S.loc = 'huiyao'; G.setTab('hy_board');
    return S.quests.filter((q) => q.town === 'huiyao').map((q) => ({ id: q.id, kind: q.kind, due: q.due, title: q.title }));
  });
  await page.waitForSelector('[data-testid=quest-grid]');
  const risk = async (id) => page.evaluate((id) => { const e = document.querySelector('[data-testid=qrisk-' + id + ']'); return e ? { t: e.textContent.trim(), high: e.classList.contains('high') } : null; }, id);
  const fixedKill = qs.find((q) => q.kind === 'kill' && !q.due);
  const rFixed = fixedKill ? await risk(fixedKill.id) : null;
  // questTier＝max(路程級, 地點級)：灰髯狼來源取青霧藥林（多段 0.30 中、地點低）→ 中；長期單罰則＝撕榜＋聲望 −1（SPEC-01 4.9）
  check('長期固定懸賞（灰髯狼 ×3）：「危險 中」＋「逾期撕榜，破曉聲望 −1」', rFixed && rFixed.t === '風險危險 中逾期撕榜，破曉聲望 −1', { q: fixedKill, r: rFixed });
  const rLeech = await risk('tq_leech');
  check('有期限獵殺（腐骨沼，地點級高）：「危險 高」紅框＋「逾期則撕榜」（畫面不出現「中高」）', rLeech && rLeech.t === '風險危險 高逾期則撕榜' && rLeech.high && !/中高/.test(await txt(page, 'quest-grid')), rLeech);
  const rDes = await risk('tq_des');
  check('有期限獵殺（野徑岔口）：路程級中（單段 0.22）高於地點級低 → 取較高者「危險 中」', rDes && rDes.t === '風險危險 中逾期則撕榜' && !rDes.high, rDes);
  const rCol = await risk('tq_col'); const rDlv = await risk('tq_dlv');
  check('收集止血草（來源野徑岔口 0.22 中、地點低）：「危險 中」＋「逾期則撕榜」', rCol && rCol.t === '風險危險 中逾期則撕榜', rCol);
  check('送貨（官道 0.04）：「危險 低」＋「逾期押金沒收」；報酬列「報酬24 兩・押金 10 兩」', rDlv && rDlv.t === '風險危險 低逾期押金沒收' && /報酬24 兩・押金 10 兩/.test(await txt(page, 'qsheet-tq_dlv')), rDlv);
  check('時限剩 ≤ 1 天紅字（urgent）；長期單顯示「長期・剩 30 天」（接單第 1 日起 30 日）', !!(await page.$('[data-testid=qdue-tq_leech].urgent')) && (fixedKill ? (await txt(page, 'qdue-' + fixedKill.id)) === '時限長期・剩 30 天' : false), await txt(page, 'qdue-' + (fixedKill && fixedKill.id)));
  check('委託單腳註原文「每天補滿3張，過期撕榜，完成提高破曉聲望」（無空白、無句號）', (await txt(page, 'quest-foot')).startsWith('每天補滿3張，過期撕榜，完成提高破曉聲望') && !/。/.test(await txt(page, 'quest-foot')), await txt(page, 'quest-foot'));
  check('每張單都有目標／報酬／時限／風險四塊與揭榜鈕（風險寫在單上，不另開確認窗）', await page.evaluate(() => Array.from(document.querySelectorAll('.qsheet')).every((s) => s.querySelector('.qtar') && s.querySelectorAll('.qrow').length === 2 && s.querySelector('.qrisk') && s.querySelector('.qbtn'))));
  await audit(page, '委託單', '[data-testid=quest-grid]');
  await shot(page, 'dev05-06-commission.png');
  // 揭榜仍直接接下（不另開確認窗）
  await page.click('[data-testid=bounty-tq_des]');
  const took = await page.evaluate(() => ({ st: window.SHL.state.quests.find((q) => q.id === 'tq_des').status, dlg: !!document.querySelector('.overlay, [data-testid=confirm]') }));
  check('揭榜一按即接下（active），沒有確認窗', took.st === 'active' && !took.dlg, took);

  // ===== 8. 腳程四檔（SPEC-TIME 7.2；PACE_CUTS [1.00, 0.67, 0.50]） =====
  await fresh(page, base);
  const pc = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state;
    const names = [1.08, 1.00, 0.99, 0.67, 0.66, 0.50, 0.49, 0.40].map((m) => [m, G.paceName(m)]);
    const light = { m: G.paceMult(), n: G.paceName() };
    S.fat = 85; const tired = { m: G.paceMult(), n: G.paceName(), raw: G.speedMult() };
    const p = G.travelPreview('jiku'); const base = p.edges.reduce((a, e) => a + e.h, 0);
    S.fat = 10;
    return { cuts: D.TIME.PACE_CUTS, names, light, tired, hoursOk: p.mult === tired.m && p.hours === Math.max(1, Math.ceil(base / p.mult)) };
  });
  check('D.TIME.PACE_CUTS＝[1.00, 0.67, 0.50]', JSON.stringify(pc.cuts) === '[1,0.67,0.5]', pc.cuts);
  check('腳程邊界：1.08 輕快、1.00 輕快、0.99 平常、0.67 平常、0.66 沉重、0.50 沉重、0.49 蹣跚、0.40 蹣跚', pc.names.map((x) => x[1]).join() === '輕快,輕快,平常,平常,沉重,沉重,蹣跚,蹣跚', pc.names);
  check('輕裝 M＝1.00 輕快；疲累 ≥80（×0.85）M＝0.85 平常（取兩位）', pc.light.m === 1 && pc.light.n === '輕快' && pc.tired.m === 0.85 && pc.tired.n === '平常', pc);
  check('判檔與算時間用同一個 M（travelPreview.mult＝paceMult，hours＝ceil(Σh÷M)）', pc.hoursOk, pc);

  // ===== 9. 出城路險 briefDanger（SPEC-TIME 7.1b、AC 22；17:58 定稿；R=1 固定） =====
  await fresh(page, base);
  const bd = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state, W = S.world;
    W.region.B = 30; W.towns.huiyao.O = 57.5; W.towns.duyin.O = 57.5; // 固定 R_road＝R_wild＝1
    const d0 = Math.floor(S.t / 1440) * 1440, at = (h) => d0 + h * 60;
    const R = [G.riskR(false), G.riskR(true)];
    const four = [6, 12, 18, 22].map((h) => { const b = G.briefDanger('huiyao', { t: at(h), tide: false }); return [h, b.risk, b.tier]; });
    const pick = (b, id) => (b.all.find((x) => x.dest === id) || {}).risk;
    const night = G.briefDanger('huiyao', { t: at(22), tide: false });
    const tideDay = G.briefDanger('huiyao', { t: at(12), tide: true });
    const hiddenIds = Object.keys(D.NODES).filter((id) => D.NODES[id].hidden);
    const noHidden = !night.all.some((x) => hiddenIds.includes(x.dest));
    hiddenIds.forEach((id) => (S.known[id] = true));
    const withHidden = G.briefDanger('huiyao', { t: at(22), tide: false }).all.filter((x) => hiddenIds.includes(x.dest)).map((x) => x.dest);
    hiddenIds.forEach((id) => delete S.known[id]);
    const wx = ['rain', 'fog', 'snow'].map((w) => { const b = G.briefDanger('huiyao', { t: at(12), wx: w, tide: false }); return [w, b.risk, b.tier]; });
    // 邊順序反轉：四時段檔位與最險路線不變
    const runAll = () => [6, 12, 18, 22].map((h) => { const b = G.briefDanger('huiyao', { t: at(h), tide: false }); return b.tier + '@' + b.risk + ':' + b.dest; }).join();
    const norm = runAll(); D.EDGES.reverse(); const rev = runAll(); D.EDGES.reverse();
    // 封頂：R_wild 上限 1.8、黑夜、獸潮
    W.region.B = 100; W.towns.huiyao.O = 0; W.towns.duyin.O = 0;
    const cap = G.briefDanger('huiyao', { t: at(22), tide: true });
    W.region.B = 30; W.towns.huiyao.O = 57.5; W.towns.duyin.O = 57.5;
    // 不算玩家狀態：超載不影響
    S.fat = 10; const before = G.briefDanger('huiyao', { t: at(12), tide: false }).risk;
    G._debug.addItem({ k: 'ore_fe', n: 60 }); const heavy = G.loadBand().id; const after = G.briefDanger('huiyao', { t: at(12), tide: false }).risk;
    return { R, four, chakouNight: pick(night, 'chakou'), roadNight: pick(night, 'yizhan'), roadTide: pick(tideDay, 'yizhan'), wildTide: pick(tideDay, 'qingwu'), tideTier: tideDay.tier, noHidden, withHidden, hiddenIds, wx, norm, rev, cap: [cap.risk, cap.tier], heavy, before, after,
      dark: [6, 12, 18, 22].map((h) => G.dangerMult(at(h), 'clear')) };
  });
  check('briefDanger 測試前 R_road＝R_wild＝1（固定 R）', bd.R[0] === 1 && bd.R[1] === 1, bd.R);
  check('(1+w) 倍率：清晨 1.25、白天 1、黃昏 1.5、黑夜 2', bd.dark.join() === '1.25,1,1.5,2', bd.dark);
  check('[AC 22] 灰窯晴、無獸潮：清晨 0.375 高／白天 0.300 中／黃昏 0.450 高／黑夜 0.600 極高', JSON.stringify(bd.four) === JSON.stringify([[6, 0.375, '高'], [12, 0.3, '中'], [18, 0.45, '高'], [22, 0.6, '極高']]), bd.four);
  check('野徑單段（灰窯→野徑岔口）黑夜 0.44（高）；官道（→驛站）黑夜 0.08；取最高那條', bd.chakouNight === 0.44 && bd.roadNight === 0.08 && bd.four[3][1] === 0.6, { chakou: bd.chakouNight, road: bd.roadNight });
  check('獸潮：含野徑路線 ×1.5（白天多段 0.45 高），官道不乘（仍 0.04）', bd.wildTide === 0.45 && bd.roadTide === 0.04 && bd.tideTier === '高', { wild: bd.wildTide, road: bd.roadTide });
  check('未 known 的隱藏目的地不計；設為 known 後才算進來', bd.noHidden && bd.withHidden.length === bd.hiddenIds.length && bd.hiddenIds.length > 0, { hidden: bd.hiddenIds, withHidden: bd.withHidden });
  check('天候 wxRisk（白天多段）：雨 0.330 中、霧 0.360 高、雪 0.345 中', JSON.stringify(bd.wx) === JSON.stringify([['rain', 0.33, '中'], ['fog', 0.36, '高'], ['snow', 0.345, '中']]), bd.wx);
  check('[AC 22] EDGES 反轉後四時段檔位與最險路線不變', bd.norm === bd.rev, { norm: bd.norm, rev: bd.rev });
  check('封頂 0.85（R_wild 1.8、黑夜、獸潮）→ 極高', bd.cap[0] === 0.85 && bd.cap[1] === '極高', bd.cap);
  check('不算玩家狀態：超載前後 briefDanger 相同', bd.heavy !== 'light' && bd.before === bd.after, { band: bd.heavy, before: bd.before, after: bd.after });
  // 畫面：展開列「出城路險 X」、hover 原句、隨時段即時變
  await page.evaluate(() => { const G = window.SHL, S = G.state; S.inv = S.inv; S.pack = S.pack.map((it) => (it && it.k === 'ore_fe' ? null : it)); S.ground.items = []; S.t = Math.floor(S.t / 1440) * 1440 + 12 * 60; });
  await gotoTown(page, 'huiyao');
  await expand(page, true);
  const dz = async () => page.evaluate(() => { const e = document.querySelector('[data-testid=city-danger]'); const b = e && e.querySelector('b'); return e && { t: e.textContent.trim(), title: e.getAttribute('title'), cls: b.className, color: getComputedStyle(b).color, fs: parseFloat(getComputedStyle(b).fontSize), mark: getComputedStyle(b, '::before').content }; });
  const dDay = await dz();
  // 草稿 UI-02-03 示範的「高」可重現：清晨 06:00（0.375）
  await page.evaluate(() => { const G = window.SHL, S = G.state; S.t = Math.floor(S.t / 1440) * 1440 + 6 * 60; G.setProfTab(S.profTab); });
  const dDawn = await dz();
  check('草稿 03 示範「出城路險 高」可重現：清晨 06:00 → 高（! 標記、hot）', dDawn && dDawn.t === '出城路險 高' && /rk2/.test(dDawn.cls) && dDawn.mark === '"! "', dDawn);
  await shot(page, 'fix1-03-brief-danger-dawn-high.png');
  await page.evaluate(() => { const G = window.SHL, S = G.state; S.t = Math.floor(S.t / 1440) * 1440 + 22 * 60; G.setProfTab(S.profTab); });
  const dNight = await dz();
  check('簡報展開列：標籤「出城路險」接險級（白天「出城路險 中」），沒有「官道危險」「官道風險」', dDay && dDay.t === '出城路險 中' && !/官道危險|官道風險/.test(await txt(page, 'citybar')), dDay);
  check('「出城路險」hover：「出城最險那條路的險級，隨時段和天候變」', dDay && dDay.title === '出城最險那條路的險級，隨時段和天候變', dDay && dDay.title);
  check('即時更新：同一天 22:00 變「出城路險 極高」，配色 rk3（極高底框、!!、字級 ≥16px）', dNight && dNight.t === '出城路險 極高' && /rk3/.test(dNight.cls) && /hot/.test(dNight.cls) && dNight.mark === '"!! "' && dNight.fs >= 16, dNight);
  check('險級配色 18:38 定稿：中 #c9a24a △、極高字 #d8cfbd', dDay.color === 'rgb(201, 162, 74)' && dDay.mark === '"△ "' && dNight.color === 'rgb(216, 207, 189)', { day: dDay, night: dNight });
  check('簡報不放「剿匪」「投資巡邏所」「資助巡邏」鈕（DEV-04 未進 main）、不放鎮簡介句', !/剿匪|投資巡邏所|資助巡邏/.test(await txt(page, 'citybar')) && !(await txt(page, 'citybar')).includes(await page.evaluate(() => window.SHL.place().desc)), await txt(page, 'citybar'));
  await audit(page, '城況展開・出城路險', '[data-testid=citybar]');
  await shot(page, 'fix1-04-brief-danger-night.png');
  await expand(page, false);

  // ===== 10. travelPreview 顯示險級＝同一套 (1+w)×wxRisk；遇襲判定仍用 isNight（17:45 第 9 項） =====
  const tp = await page.evaluate(() => {
    const G = window.SHL, S = G.state, d0 = Math.floor(S.t / 1440) * 1440;
    S.loc = 'huiyao'; const out = {};
    [6, 12, 18, 22].forEach((h) => { S.t = d0 + h * 60; const p = G.travelPreview('qingwu'); const b = G.briefDanger('huiyao', { tide: false }).all.find((x) => x.dest === 'qingwu'); out[h] = { shown: Math.round(p.shown * 1000) / 1000, tier: p.riskName, enc: p.risk, brief: b.risk }; });
    return out;
  });
  check('travelPreview 險級與 briefDanger 同值（輕裝、R=1）：清晨 0.375 高、白天 0.3 中、黃昏 0.45 高、黑夜 0.6 極高', [6, 12, 18, 22].every((h) => tp[h].shown === tp[h].brief) && [6, 12, 18, 22].map((h) => tp[h].tier).join() === '高,中,高,極高', tp);
  check('遇襲判定仍用 isNight：清晨、白天、黃昏 0.30，黑夜 0.60', tp[6].enc === 0.3 && tp[12].enc === 0.3 && tp[18].enc === 0.3 && Math.abs(tp[22].enc - 0.6) < 1e-9, tp);
  // 地圖出發條：極高配色＋hot
  await page.evaluate(() => { const G = window.SHL; G.toMap(); G.selectDest('qingwu'); });
  await page.waitForSelector('[data-testid=route-risk]');
  const rr = await page.evaluate(() => { const e = document.querySelector('[data-testid=route-risk]'); const cs = getComputedStyle(e); return { t: e.querySelector('b').textContent, hot: e.classList.contains('hot'), bg: cs.backgroundColor, bd: cs.borderTopColor, bw: cs.borderTopWidth }; });
  check('地圖趕路列「極高」：hot、底 #5a1f1a、2px 邊框 #c8463a', rr.t === '極高' && rr.hot && rr.bg === 'rgb(90, 31, 26)' && rr.bd === 'rgb(200, 70, 58)' && rr.bw === '2px', rr);
  await shot(page, 'fix1-05-map-extreme.png');

  // ===== 11. 委託險級 questTier（SPEC-01 4.9、AC-E9、AC-E11、SPEC-TIME 7.1b） =====
  await fresh(page, base);
  const qt = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state, W = S.world;
    W.region.B = 30; W.towns.huiyao.O = 57.5; W.towns.duyin.O = 57.5; S.t = Math.floor(S.t / 1440) * 1440 + 22 * 60; // 夜裡算單：單上仍用白天基準
    const dist = {}; const per = {};
    D.QUEST_GEN.collect.pool.forEach(([item]) => { const t = G.questTier({ kind: 'collect', town: 'huiyao', item }); per[item] = t; dist[t] = (dist[t] || 0) + 1; });
    // 地點舊稱「中高」：顯示層對應為「高」
    const old = D.WILDS.fuzhao.risk; D.WILDS.fuzhao.risk = '中高';
    const leechOld = G.questTier({ kind: 'kill', town: 'huiyao', enemy: 'leech' }); D.WILDS.fuzhao.risk = old;
    // 送貨只走官道：加一條 1 小時野徑 灰窯–渡陰（比官道 4 小時短）
    const dq = { kind: 'deliver', town: 'huiyao', to: 'duyin' };
    const before = G.questTier(dq);
    D.EDGES.push({ a: 'huiyao', b: 'duyin', h: 1, road: false });
    const plain = G.route('huiyao', 'duyin'), road = G.route('huiyao', 'duyin', true);
    const withShort = G.questTier(dq);
    W.region.B = 100; W.towns.huiyao.O = 57.5; W.towns.duyin.O = 57.5; const withShortHighB = G.questTier(dq); W.region.B = 30;
    D.EDGES.pop();
    const jiku = G.questTier({ kind: 'clear', town: 'duyin', dungeon: 'jiku' });
    return { dist, per, leechOld, before, withShort, withShortHighB, plainWild: plain.some((e) => !e.road), plainH: plain.reduce((a, e) => a + e.h, 0), roadAll: road.every((e) => e.road), roadH: road.reduce((a, e) => a + e.h, 0), jiku };
  });
  check('[AC-E9] 灰窯收集單 9 項（R=1、晴）：中 6／高 3（毒藤、沼鐵、蛭腺為高），低、極高 0', qt.dist['中'] === 6 && qt.dist['高'] === 3 && !qt.dist['低'] && !qt.dist['極高'] && ['vine_du', 'bog_iron', 'leech_gland'].every((k) => qt.per[k] === '高'), qt.per);
  check('地點險級舊稱「中高」在委託單顯示為「高」（max(路程中, 地點高)）', qt.leechOld === '高', qt.leechOld);
  check('[AC-E11] 送貨 灰窯→渡陰：一般路線被 1 小時野徑搶走，但送貨 routeTier 仍按官道（4 小時全官道）→「低」', qt.plainWild && qt.plainH === 1 && qt.roadAll && qt.roadH === 4 && qt.before === '低' && qt.withShort === '低' && qt.withShortHighB === '低', qt);
  check('地城清理（祭窟，地點高）：questTier ≥ 高', qt.jiku === '高' || qt.jiku === '極高', qt.jiku);
  const fz = await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'fuzhao'; G.enterHere(); return document.querySelector('[data-testid=head-risk]').textContent; });
  check('荒野標頭（腐骨沼）四檔：「險 高」（不顯示「中高」）', fz === '險 高', fz);
  // 接單後險級固定
  const fixed = await page.evaluate(() => {
    const G = window.SHL, S = G.state, W = S.world; S.scene = 'town'; S.loc = 'huiyao'; G.enterHere(); G.setTab('hy_board');
    const q = { id: 'tq_fix', town: 'huiyao', kind: 'kill', enemy: 'deserter', need: 1, g: '兵', ic: 'deserter', title: '獵殺逃兵 ×1', reward: 30, due: G.dayOf(S.t) + 4, fixed: false, prog: 0, status: 'open' };
    S.quests.push(q); G.questAct('tq_fix');
    const t0 = q.tier; W.region.B = 100; W.towns.huiyao.O = 0; W.towns.duyin.O = 0; const now = G.questTier(q); const shown = G.questRisk(q).level;
    W.region.B = 30; W.towns.huiyao.O = 55; W.towns.duyin.O = 60;
    return { t0, now, shown };
  });
  check('單上險級接單後固定（R 變大後 questTier 會變，單上仍顯示接單時的檔）', fixed.t0 === '中' && fixed.now !== fixed.t0 && fixed.shown === fixed.t0, fixed);

  // ===== 12. 客棧「睡到 {wake}」（dev05-strings 2a／2b；SPEC-TIME B1／E11） =====
  for (const [hh, mm, want] of [[20, 0, '睡到明日 08:00'], [3, 0, '睡到 09:00'], [8, 0, '睡到 14:00'], [8, 10, '睡到 21:10']]) {
    await fresh(page, base);
    await page.evaluate(([hh, mm]) => { const G = window.SHL, S = G.state; S.silver = 500; S.t = 2 * 1440 + hh * 60 + mm; S.scene = 'town'; S.loc = 'huiyao'; G.enterHere(); G.setTab('hy_inn'); }, [hh, mm]);
    await page.waitForSelector('[data-testid=sleep-to]');
    const lab = await txt(page, 'sleep-to'); const title = await page.getAttribute('[data-testid=sleep-to]', 'title');
    const r = await page.evaluate(() => { const G = window.SHL, S = G.state; const d0 = G.dayOf(S.t); G.service('rest'); return { clock: G.fmtClock(S.t), next: G.dayOf(S.t) > d0 }; });
    const real = (r.next ? '睡到明日 ' : '睡到 ') + r.clock;
    check('客棧 ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ' 就寢：按鈕「' + want + '」，按下後實際醒來一致', lab === want && real === want, { lab, real });
    if (hh === 20) await page.evaluate(() => { const G = window.SHL, S = G.state; S.t = 2 * 1440 + 20 * 60; G.setTab('hy_inn'); });
    if (hh === 20) await shot(page, 'fix1-06-inn-sleep-2000.png');
    if (hh === 20) check('客棧按鈕 hover「睡到早上 08:00，至少 6 小時、最多 13 小時」', title === '睡到早上 08:00，至少 6 小時、最多 13 小時', title);
  }

  // ===== 13. 長期委託軟期限（SPEC-01 4.9／AC-E10、SPEC-02 3.2 longquest_expire／驗收 34） =====
  const lq = async (rep0, reward, giver) => page.evaluate(([rep0, reward, giver]) => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state;
    const evs = []; if (G.onEvent) G.onEvent((id) => evs.push(id)); // 舊版沒有事件介面時不當機，改由斷言判 FAIL
    const d = G.dayOf(S.t);
    const q = S.quests.find((x) => x.fixed && (giver ? x.giver : !x.giver && x.reward === reward));
    S.quests.forEach((x) => { if (x !== q && x.status === 'active') x.status = 'open'; }); // 只留受測這一張在身上
    q.status = 'active'; q.taken = d; q.prog = 0;
    S.rep.dawn = rep0;
    const snap = () => JSON.stringify({ silver: S.silver, karma: S.karma === undefined ? null : S.karma, wanted: S.wanted });
    const s0 = snap();
    const N = reward < 100 ? 30 : 60;
    const tick = (day) => { S.t = (day - 1) * 1440; G._debug.newDay(day); };
    tick(d + N - 1);
    const aliveLast = S.quests.some((x) => x.id === q.id && x.status === 'active');
    const left = G.longLeft ? G.longLeft(q, d + N - 1) : null;
    tick(d + N);
    const gone = !S.quests.some((x) => x.id === q.id);
    tick(d + 200); const goneLater = !S.quests.some((x) => x.id === q.id);
    return { id: q.id, N, aliveLast, left, gone, goneLater, rep: S.rep.dawn, same: snap() === s0, evs, perk: G.questReward({ reward: 100 }) };
  }, [rep0, reward, giver]);
  await fresh(page, base);
  const L1 = await lq(20, 40);
  check('[AC-E10] 報酬 40 兩（<100）→ 30 日：第 d+29 日仍在（剩 1 天），第 d+30 日 00:00 撕榜', L1.N === 30 && L1.aliveLast && L1.left === 1 && L1.gone, L1);
  check('[驗收 34] 逾期發 longquest_expire；聲望 20 → 20（不跌破）；銀兩、善惡、通緝不變', L1.evs.includes('longquest_expire') && L1.rep === 20 && L1.same, L1);
  check('[驗收 34] 報酬 +15%（聲望 ≥20）不因逾期罰暫停', L1.perk === 115, L1.perk);
  for (const [r0, r1] of [[21, 20], [10, 10], [5, 4], [0, 0]]) {
    await fresh(page, base);
    const L = await lq(r0, 60);
    check('[AC-E10] 破曉聲望 ' + r0 + ' 逾期後 ' + r1 + '（rep\'＝max(rep−1, 已達門檻)）', L.gone && L.rep === r1 && L.same, { rep: L.rep, gone: L.gone });
  }
  await fresh(page, base);
  const L2 = await lq(3, 150);
  check('[AC-E10] 報酬 150 兩（≥100）→ 60 日：第 d+59 日仍在、第 d+60 日撕榜，聲望 3 → 2', L2.N === 60 && L2.aliveLast && L2.left === 1 && L2.gone && L2.rep === 2, L2);
  await fresh(page, base);
  const L3 = await page.evaluate(() => {
    const G = window.SHL, S = G.state; const q = S.quests.find((x) => x.giver); S.quests.forEach((x) => { if (x.status === 'active') x.status = 'open'; }); q.status = 'active'; q.taken = 1; S.rep.dawn = 5;
    for (let d = 2; d <= 130; d++) { S.t = (d - 1) * 1440; G._debug.newDay(d); }
    return { still: S.quests.some((x) => x.id === q.id && x.status === 'active'), rep: S.rep.dawn, left: G.longLeft ? G.longLeft(q) : null };
  });
  check('[AC-E10] 私人委託（軍牌）不適用、不逾期（130 日後仍在，聲望不變）', L3.still && L3.rep === 5 && L3.left === null, L3);
  await fresh(page, base);
  const L4 = await page.evaluate(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state; const q = S.quests.find((x) => x.id === 'b_wolf');
    const t0 = q.taken; for (let d = 2; d <= 30; d++) { S.t = (d - 1) * 1440; G._debug.newDay(d); }
    q.status = 'done'; // 第 30 日（d+29）完成擊殺
    S.t = 30 * 1440; G._debug.newDay(31);
    const kept = S.quests.some((x) => x.id === 'b_wolf' && x.status === 'done');
    return { t0, kept, days: [D.QUEST_GEN.collect.days, D.QUEST_GEN.kill.days, D.QUEST_GEN.deliver.days] };
  });
  check('[AC-E10] 起手灰髯狼 ×3 接單日＝第 1 日；第 30 日（d+29）完成者不撕榜', L4.t0 === 1 && L4.kept, L4);
  check('一般單期限不變：收集 3、獵殺 4、送貨 2 日', L4.days.join() === '3,4,2', L4.days);

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
