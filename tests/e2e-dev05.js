/* 《山海錄》DEV-05 城況簡報接入（含用詞）— 新增驗收（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e-dev05.js [--shots]
 *   --shots  另存 1280×720 實機截圖（deviceScaleFactor 2）至 docs/evidence/shots-shanhailu-dev05-1128/（可用 SHOTS_DIR 覆寫）
 * 依據：docs/design/batch1/specs/SPEC-01.md v0.4 §7、§13；UI-02/README.md 與 UI-02-01／02／03／05／06；
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
const SPEED_HINT = '負重、裝備與疲累會影響趕路速度'; // mumi 原句（16:29 拍板；16:46 裁決第 1 項）

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
  const src = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8').replace(/^\s*\/\/.*$/gm, ''); // 去掉整行註解
  const hard = ['今日收入', '今日支出', '今日淨額', '稅收抽成', '已求援', '與昨日持平', '腳程', '路程', '危險 ', '逾期則撕榜', '逾期押金沒收', '失敗罰則未定', '危險 未定', SPEED_HINT, '自衛隊', '巡邏隊', '守備'];
  check('城況／腳程／地圖用詞／委託風險句沒有寫死在 ui.js（集中在 data.js TEXT 與 WORLD.GARRISON_NAMES）', hard.every((w) => !src.includes(w)), hard.filter((w) => src.includes(w)));

  // ===== 1. 第一次日結前：brief 為空，不自行補算 =====
  await fresh(page, base);
  await gotoTown(page, 'huiyao');
  const pre = await page.evaluate(() => ({ day: window.SHL.dayOf(window.SHL.state.t), b: JSON.stringify(window.SHL.state.world.towns.huiyao.brief) }));
  await expand(page, true);
  const d0 = await cityDom(page);
  check('第一次日結前（brief 為空）：財庫顯示「待日結」，展開只寫一句說明、不出收支數字', pre.b === '{}' && d0.tr === '待日結' && d0.money.length === 0 && /第一次日結/.test(d0.why), { pre, tr: d0.tr, why: d0.why });
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
    p: (() => { const p = window.SHL.travelPreview('qingwu'); return { hours: p.hours, food: p.food, fat: p.fat, riskName: p.riskName, mult: p.mult }; })(),
  }));
  check('趕路底列五格用完整名詞：路程／飽食／疲累／危險／腳程', mp.labels.join('／') === '路程／飽食／疲累／危險／腳程', mp.labels);
  check('底列「腳程 ×M」取代「負 ×M」（值仍是 speedMult()）', mp.vals[4] === '×' + mp.p.mult.toFixed(2) && !/負/.test(mp.bar), { v: mp.vals[4], mult: mp.p.mult });
  check('底列數值與 travelPreview 一致', mp.vals[0] === mp.p.hours + ' 小時' && mp.vals[1] === '−' + mp.p.food && mp.vals[2] === '+' + mp.p.fat && mp.vals[3] === mp.p.riskName, mp.vals);
  check('地點詳情（圖上氣泡）不再用「2小時・食-8」縮寫：路程 N 小時・飽食 −N／疲累 +N・危險 X', /^路程 \d+ 小時・飽食 −\d+疲累 \+\d+・危險 [低中高]$/.test(mp.tip) && !/(^|[^飽])食 ?[−-]|(^|[^疲])疲 ?\+|(^|[^危])險 /.test(mp.tip), mp.tip);
  await page.hover('[data-testid=vp-speed]');
  const hs = await txt(page, 'hint-text');
  check('滑過「腳程」：懸浮文案為 mumi 原句「' + SPEED_HINT + '」', hs === SPEED_HINT, hs);
  await audit(page, '地圖趕路＋腳程懸浮', '.departbar, [data-testid=route-tip], [data-testid=hintbox]');
  await shot(page, 'dev05-05-map-move.png');
  const others = [];
  for (const k of ['hours', 'food', 'fat', 'risk']) { await page.hover('[data-testid=vp-' + k + ']'); others.push(await txt(page, 'hint-text')); }
  check('路程／飽食／疲累／危險也有懸浮說明（wording-map §1 擬案）', others.every((s) => s && s.length > 6) && others.every((s) => !/時辰/.test(s)), others);
  // 左欄負重底條的 ×M 也改「腳程」並有同一句懸浮
  const lb = await txt(page, 'speed');
  await page.hover('[data-testid=speed]');
  const lh = await txt(page, 'speed-hint');
  check('左欄負重條的速度倍率改「腳程 ×M」，滑過顯示同一句原句', /^腳程 ×\d\.\d\d$/.test(lb) && lh === SPEED_HINT, { lb, lh });
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
  check('有險級、長期（無 due）獵殺：「危險 中」＋「失敗罰則未定」（不編造罰則）', rFixed && rFixed.t === '風險危險 中失敗罰則未定', { q: fixedKill, r: rFixed });
  const rLeech = await risk('tq_leech');
  check('有期限獵殺（腐骨沼）：「危險 中高」紅框＋「逾期則撕榜」', rLeech && rLeech.t === '風險危險 中高逾期則撕榜' && rLeech.high, rLeech);
  const rDes = await risk('tq_des');
  check('有期限獵殺（野徑岔口）：「危險 低」＋「逾期則撕榜」', rDes && rDes.t === '風險危險 低逾期則撕榜' && !rDes.high, rDes);
  const rCol = await risk('tq_col'); const rDlv = await risk('tq_dlv');
  check('收集（無險級資料）：「危險 未定」＋「逾期則撕榜」', rCol && rCol.t === '風險危險 未定逾期則撕榜', rCol);
  check('送貨（無險級資料、有押金）：「危險 未定」＋「逾期押金沒收」；報酬列「報酬24 兩・押金 10 兩」', rDlv && rDlv.t === '風險危險 未定逾期押金沒收' && /報酬24 兩・押金 10 兩/.test(await txt(page, 'qsheet-tq_dlv')), rDlv);
  check('時限剩 ≤ 1 天紅字（urgent）；長期顯示「長期」', !!(await page.$('[data-testid=qdue-tq_leech].urgent')) && (fixedKill ? (await txt(page, 'qdue-' + fixedKill.id)) === '時限長期' : false), await txt(page, 'qdue-tq_leech'));
  check('每張單都有目標／報酬／時限／風險四塊與揭榜鈕（風險寫在單上，不另開確認窗）', await page.evaluate(() => Array.from(document.querySelectorAll('.qsheet')).every((s) => s.querySelector('.qtar') && s.querySelectorAll('.qrow').length === 2 && s.querySelector('.qrisk') && s.querySelector('.qbtn'))));
  await audit(page, '委託單', '[data-testid=quest-grid]');
  await shot(page, 'dev05-06-commission.png');
  // 揭榜仍直接接下（不另開確認窗）
  await page.click('[data-testid=bounty-tq_des]');
  const took = await page.evaluate(() => ({ st: window.SHL.state.quests.find((q) => q.id === 'tq_des').status, dlg: !!document.querySelector('.overlay, [data-testid=confirm]') }));
  check('揭榜一按即接下（active），沒有確認窗', took.st === 'active' && !took.dlg, took);

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
