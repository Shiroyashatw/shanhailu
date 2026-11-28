/* 《山海錄》DEV-TIME 時間骨幹 — 新增驗收（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e-devtime.js [--shots]
 *   --shots  另存 1280×720 實機截圖至 docs/evidence/shots-devtime-1129/（可用環境變數 SHOTS_DIR 覆寫）
 * 依據：docs/specs/SPEC-TIME.md v0.5 第 2–11 節、第 12 節手算（E1–E12）、第 14 節 AC 1–24（含 AC 23、AC 24）；
 *       docs/plan/polish-list.md P-02（AC 23）、P-03（AC 24）、P-04（寒冷狀態的 hp 下限）。
 * 測試要固定天候時用 _debug.forceWeather（只給測試、不存檔）；其餘一律走真的 weatherAt。
 * AC 18–22 的既有斷言在 tests/e2e-dev05.js（腳程檔、險級、出城路險），本檔只補 0.5 小時進位、雪天腳程與全組合封頂。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS_DIR ? path.resolve(ROOT, process.env.SHOTS_DIR) : path.join(ROOT, 'docs/evidence/shots-devtime-1129');
const WANT_SHOTS = process.argv.includes('--shots');
const SEED = 20261127;

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
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);

// 版面稽核（照抄 tests/e2e-dev04.js 的 audit）
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const out = { scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, cols: {}, overlaps: [], escapes: [], clipped: [] };
    ['col-left', 'col-center', 'col-right'].forEach((id) => { const r = document.getElementById(id).getBoundingClientRect(); out.cols[id] = { x: r.left, w: r.width }; });
    const skipSel = '#tip, #shoptip, .overlay';
    const inside = (r, R) => r.left >= R.left - 0.5 && r.right <= R.right + 0.5 && r.top >= R.top - 0.5 && r.bottom <= R.bottom + 0.5;
    const texts = [];
    const walker = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      const el = n.parentElement; const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[style*="display:none"], [style*="display: none"]') || el.closest('svg')) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rects = Array.from(rg.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
      const col = el.closest('.col'); const colR = col ? col.getBoundingClientRect() : null; const covered = !!el.closest(skipSel);
      rects.forEach((r) => {
        if (colR && !inside(r, colR) && !covered) out.escapes.push({ text: n.nodeValue.trim().slice(0, 20), r: [r.left, r.top, r.right, r.bottom].map(Math.round) });
        if (!covered) texts.push({ el, text: n.nodeValue.trim().slice(0, 16), r });
      });
      if (!covered && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) && cs.overflow === 'hidden' && el.clientWidth > 0 && !el.classList.contains('logbox')) out.clipped.push({ text: el.textContent.trim().slice(0, 24), sw: el.scrollWidth, cw: el.clientWidth });
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j]; if (a.el === b.el) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 2 && h > 2 && w * h > 4) out.overlaps.push([a.text, b.text, Math.round(w), Math.round(h)]);
    }
    out.textCount = texts.length;
    return out;
  });
  check('[' + label + '] 1280×720 單屏無全頁捲動', r.scrollW <= 1280 && r.scrollH <= 720, r.scrollW + '×' + r.scrollH);
  check('[' + label + '] 三欄寬 240/796/220', r.cols['col-left'].w === 240 && r.cols['col-center'].w === 796 && r.cols['col-right'].w === 220, r.cols);
  check('[' + label + '] 文字無重疊（' + r.textCount + ' 段）', r.overlaps.length === 0, r.overlaps.slice(0, 5));
  check('[' + label + '] 文字無溢出欄外', r.escapes.length === 0, r.escapes.slice(0, 5));
  check('[' + label + '] 文字無被容器裁切', r.clipped.length === 0, r.clipped.slice(0, 5));
  const clock = await page.evaluate(() => (document.querySelector('[data-testid=clock]') || {}).textContent || '');
  check('[' + label + '] 右欄時間「第 N 日・時段 HH:MM 天候」', /^第 \d+ 日・(清晨|白天|黃昏|黑夜) ([01]\d|2[0-3]):[0-5]\d (晴|雨|霧|雪)$/.test(clock), clock);
}
async function shot(page, name) {
  await page.waitForTimeout(120);
  await audit(page, name);
  if (!WANT_SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('SHOT  ' + path.relative(ROOT, path.join(SHOTS, name)));
}
// 每段從乾淨狀態開始：關獸潮排程、關雜訊、R 固定為 1、天候不固定
const RESET = `(() => { const G = window.SHL; G.restart(${SEED}, 'drifter'); const S = G.state, W = S.world;
  S.world.tide = null; S.world.next = 1e9; G._debug.setNoise(false); G._debug.forceWeather(null);
  W.region.B = 30; W.towns.huiyao.O = 57.5; W.towns.duyin.O = 57.5; return true; })()`;
// 第 d 日 hh:mm 的分鐘數
const at = (d, hh, mm) => (d - 1) * 1440 + hh * 60 + (mm || 0);

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');
  const run = async (fn, arg) => { await page.evaluate(RESET); return page.evaluate(fn, arg); };

  // ===== AC 1／E1：時段與 isNight =====
  const ac1 = await run(() => {
    const G = window.SHL;
    const pts = [[4, 59, 'night'], [5, 0, 'dawn'], [7, 59, 'dawn'], [8, 0, 'day'], [16, 59, 'day'], [17, 0, 'dusk'], [19, 59, 'dusk'], [20, 0, 'night'], [0, 0, 'night'], [23, 59, 'night'], [12, 0, 'day'], [6, 30, 'dawn']];
    const bad = pts.filter(([h, m, p]) => G.phaseOf(1440 * 3 + h * 60 + m) !== p);
    let diff = 0, mins = { dawn: 0, day: 0, dusk: 0, night: 0 };
    for (let m = 0; m < 1440; m++) { const h = Math.floor(m / 60); if (G.isNight(1440 * 5 + m) !== (h >= 20 || h < 5)) diff++; mins[G.phaseOf(m)]++; }
    return { bad, diff, mins };
  });
  check('AC 1／E1：12 個邊界時刻 phaseOf 全部命中表 2.2', ac1.bad.length === 0, ac1.bad);
  check('AC 1：isNight 對一天 1440 分鐘與舊判定 h≥20||h<5 完全一致', ac1.diff === 0, ac1.diff);
  check('E1：四時段分鐘數 180／540／180／540（3+9+3+9=24 小時）', ac1.mins.dawn === 180 && ac1.mins.day === 540 && ac1.mins.dusk === 180 && ac1.mins.night === 540, ac1.mins);

  // ===== AC 2：time.phase 單向循環，各發一次；B2：事件按時間先後、處理器看到的 S.t 為邊界 =====
  const ac2 = await run(() => {
    const G = window.SHL, S = G.state, T = G.Time; const seen = [];
    const f1 = T.on('time.phase', (e) => seen.push([e.from, e.to, G.fmtClock(S.t), e.t === S.t]));
    const nd = []; const f2 = T.on('time.newDay', (e) => nd.push([e.day, G.fmtClock(S.t)]));
    S.t = (2 - 1) * 1440 + 4 * 60; G._debug.passTime(24, { food: 0, fat: 0 });
    T.off('time.phase', f1); T.off('time.newDay', f2);
    return { seen, nd };
  });
  check('AC 2：04:00 起過 24 小時，time.phase 依序 night→dawn→day→dusk→night 各一次，S.t 即邊界', JSON.stringify(ac2.seen.map((x) => x.slice(0, 3))) === JSON.stringify([['night', 'dawn', '05:00'], ['dawn', 'day', '08:00'], ['day', 'dusk', '17:00'], ['dusk', 'night', '20:00']]) && ac2.seen.every((x) => x[3]), ac2.seen);
  check('AC 6／B2：跨 00:00 時 time.newDay 恰好一次，處理器看到的 S.t 為 00:00', ac2.nd.length === 1 && ac2.nd[0][1] === '00:00' && ac2.nd[0][0] === 3, ac2.nd);

  // ===== AC 3／E2：曆法與換季寒意基準 =====
  const ac3 = await run(() => {
    const G = window.SHL, D = window.SHL_DATA, TM = G.Time;
    const d = (n) => (n - 1) * 1440 + 600;
    const cal = [30, 31, 120, 121].map((n) => [n, G.seasonOf(d(n)), G.yearOf(d(n)), G.dayOfSeason(d(n)), G.dayOfYear(d(n)), G.fmtDate(d(n))]);
    const se = [25, 26, 30, 31, 56, 61, 85, 86, 90, 91, 115, 116, 121].map((n) => [n, TM.sEff(d(n))]);
    return { cal, se };
  });
  check('AC 3／E2：第 30／31／120／121 日：季 0／1／3／0、年 0／0／0／1、dayOfSeason 30／1／30／1', JSON.stringify(ac3.cal.map((x) => x.slice(0, 4))) === JSON.stringify([[30, 0, 0, 30], [31, 1, 0, 1], [120, 3, 0, 30], [121, 0, 1, 1]]) && ac3.cal[3][5] === '二年春', ac3.cal);
  const se = Object.fromEntries(ac3.se);
  check('AC 3／第 4 節：換季前 5 天 S_eff：春 0→第 26 日 −1、夏→秋 0、秋第 25 日 1→第 26 日 2（E2）、冬→春 2', se[25] === 0 && se[26] === -1 && se[30] === -1 && se[31] === -2 && se[56] === 0 && se[61] === 1 && se[85] === 1 && se[86] === 2 && se[90] === 2 && se[91] === 3 && se[115] === 3 && se[116] === 2 && se[121] === 0, se);

  // ===== AC 4／AC 15／B8：weatherAt 純函式 =====
  const ac4 = await run(() => {
    const G = window.SHL, S = G.state, TM = G.Time;
    const rng0 = S.rng, snap = JSON.stringify(S);
    const a = [], b = [];
    for (let t = 0; t < 1440 * 130; t += 97) { a.push(G.weatherAt(t)); b.push(G.weatherAt(t)); }
    let fogDay = -1; for (let w = 1; w < 400 && fogDay < 0; w++) if (TM.weatherBase(S.seed, w) === 'fog') fogDay = w;
    const t5 = fogDay * 1440 + 300; // 該天候日 05:00
    const fog = [G.weatherAt(t5), G.weatherAt(t5 + 299), G.weatherAt(t5 + 300), G.weatherAt(t5 + 600), G.weatherAt(t5 + 1439)];
    const day1 = [G.weatherAt(480), G.weatherAt(1439), G.weatherAt(1440 + 299)];
    const v = G.previewSurvival(30); const o = G.isOpen('hy_market', 23 * 60);
    return { same: JSON.stringify(a) === JSON.stringify(b), rng: S.rng === rng0, state: JSON.stringify(S) === snap, fogDay, fog, day1, v: !!v, o };
  });
  check('AC 4：同種子同時刻必回同值', ac4.same);
  check('AC 4／AC 15／B12：weatherAt、previewSurvival、isOpen 呼叫前後 S.rng 與整個 S 不變', ac4.rng && ac4.state, ac4);
  check('AC 4／B8：開局天候日（wday=0，第 1 日 05:00–第 2 日 05:00）固定晴', ac4.day1.every((w) => w === 'clear'), ac4.day1);
  check('AC 4：霧只在 05:00–10:00，10:00 起回傳晴（找到的霧日 wday=' + ac4.fogDay + '）', ac4.fogDay > 0 && JSON.stringify(ac4.fog) === JSON.stringify(['fog', 'fog', 'clear', 'clear', 'clear']), ac4.fog);

  // ===== AC 5／E12：季節與天候 =====
  const ac5 = await run(() => {
    const D = window.SHL_DATA, TM = window.SHL.Time;
    const cnt = [0, 1, 2, 3].map(() => ({ clear: 0, rain: 0, fog: 0, snow: 0 }));
    for (let seed = 1; seed <= 1000; seed++) for (let w = 1; w <= 120; w++) cnt[Math.floor(w / 30) % 4][TM.weatherBase(seed * 7919 + 13, w)]++;
    const sums = D.TIME.WX_WEIGHT.map((r) => r.reduce((a, b) => a + b, 0));
    // 期望日數（每季 30 天 × 1000 種子；春季少第 0 日，按實際樣本數算）
    const dev = cnt.map((c, s) => { const n = Object.values(c).reduce((a, b) => a + b, 0); return D.TIME.WX_ORDER.map((k, i) => { const e = (D.TIME.WX_WEIGHT[s][i] / 100) * n; return e ? Math.abs(c[k] - e) / e : c[k]; }); });
    return { cnt, sums, maxDev: Math.max.apply(null, dev.flat()) };
  });
  check('AC 5：春夏秋 1000 種子×30 天沒有雪；冬季沒有雨', ac5.cnt[0].snow === 0 && ac5.cnt[1].snow === 0 && ac5.cnt[2].snow === 0 && ac5.cnt[3].rain === 0, ac5.cnt);
  check('E12：天候權重每列和 = 100', ac5.sums.every((x) => x === 100), ac5.sums);
  check('15 節「天候頻率」：1000 種子×120 天，各季各天候天數落在期望 ±15% 內（最大偏差 ' + (ac5.maxDev * 100).toFixed(2) + '%）', ac5.maxDev <= 0.15, ac5.maxDev);

  // ===== AC 6：切片＝逐小時呼叫；B3、B10 =====
  const ac6 = await run(() => {
    const G = window.SHL, S = G.state;
    const setup = () => { G.restart(4242, 'drifter'); const S = G.state; S.world.tide = null; S.world.next = 1e9; S.t = (95 - 1) * 1440 + 8 * 60 + 20; S.loc = 'qingwu'; G.enterHere(); S.food = 70; S.fat = 40; S.cold = 20; S.hp = 60; G._debug.forceWeather('snow'); return S; };
    const pick = (S) => ({ t: S.t, food: S.food, fat: S.fat, cold: S.cold, hp: S.hp });
    // 不取整比較（_debug.simulate 在副本上結算）：一次 7.5 小時 vs 第一段到整點（40 分）＋逐小時 ×6＋最後 50 分（B3）
    let A = setup(); const raw1 = G._debug.simulate([7.5]), raw2 = G._debug.simulate([40 / 60, 1, 1, 1, 1, 1, 1, 50 / 60]);
    const rawSame = ['t', 'food', 'fat', 'cold', 'hp'].every((k) => Math.abs(raw1[k] - raw2[k]) < 1e-9);
    G._debug.passTime(7.5); const a = pick(A);
    const live = ['food', 'fat', 'cold', 'hp'].every((k) => a[k] === Math.round(raw1[k]));
    A = setup(); G._debug.passTime(40 / 60); for (let i = 0; i < 6; i++) G._debug.passTime(1); G._debug.passTime(50 / 60); const b = pick(A);
    // B10：0 小時不發事件、負數不回溯
    let n = 0; const f = G.Time.on('time.slice', () => n++); const t0 = A.t; G._debug.passTime(0); G._debug.passTime(-2); G.Time.off('time.slice', f);
    G._debug.forceWeather(null);
    return { a, b, rawSame, live, raw1, raw2, zero: n === 0 && A.t === t0 };
  });
  check('AC 6／B3：冬雪野外 8:20 起 7.5 小時一次結算，與「40 分＋逐小時＋50 分」逐段結算（不取整）在 1e-9 內一致', ac6.rawSame, { raw1: ac6.raw1, raw2: ac6.raw2 });
  check('AC 6：實際 passTime 結果＝不取整結算四捨五入（6.2：每段 passTime 結束才取整）', ac6.live && ac6.a.t === ac6.b.t, ac6);
  check('AC 6（資訊）：逐段呼叫每次都取整，與一次結算的差只來自取整（各項 ≤ 段數×0.5）', ['food', 'fat', 'cold', 'hp'].every((k) => Math.abs(ac6.a[k] - ac6.b[k]) <= 4), { a: ac6.a, b: ac6.b });
  check('B10：passTime(0) 不發事件；負數視為錯誤、不回溯時間', ac6.zero);

  // ===== AC 7：食、疲速率；冬季 ×1.25；客棧睡眠 1.25／小時 =====
  const ac7 = await run(() => {
    const G = window.SHL, S = G.state; const out = {};
    S.t = at(10, 9); S.food = 80; S.fat = 10; G._debug.passTime(5); out.spring = [S.food, S.fat];
    S.t = at(100, 9); S.food = 80; S.fat = 10; S.cold = 0; G._debug.passTime(4); out.winter = S.food;
    S.t = at(12, 22); S.loc = 'huiyao'; G.enterHere(); G.setTab('hy_inn'); S.food = 80; S.silver = 99; G.service('rest'); out.inn = [S.food, G.fmtClock(S.t)];
    return out;
    function at(d, h) { return (d - 1) * 1440 + h * 60; }
  });
  check('AC 7：清醒 5 小時：飽食 −4／小時（80→60）、疲累 +2／小時（10→20）', ac7.spring[0] === 60 && ac7.spring[1] === 20, ac7.spring);
  check('AC 7：冬季 4 小時飽食 ×1.25（80→60）', ac7.winter === 60, ac7.winter);
  check('AC 7／6.2：客棧 22:00 睡 10 小時，飽食 −12.5（80→67.5，整數存值 ±0.5）', Math.abs(ac7.inn[0] - 67.5) <= 0.5 && ac7.inn[1] === '08:00', ac7.inn);

  // ===== AC 8：寒意速率表（6.4 逐格）、緩解、客棧睡一夜歸 0 =====
  const ac8 = await run(() => {
    const G = window.SHL, S = G.state, cr = G._debug.coldRate;
    const mid = [10, 40, 70, 100]; const ph = { dawn: 6, day: 12, dusk: 18, night: 22 };
    const cell = (s, wx, p) => cr('outdoor', (mid[s] - 1) * 1440 + ph[p] * 60, wx, 'qingwu');
    const rows = [[0, 'clear'], [0, 'fog'], [0, 'rain'], [1, 'clear'], [1, 'fog'], [1, 'rain'], [2, 'clear'], [2, 'fog'], [2, 'rain'], [3, 'clear'], [3, 'fog'], [3, 'snow']].map(([s, wx]) => [s + wx, ['dawn', 'day', 'dusk', 'night'].map((p) => cell(s, wx, p))]);
    const relief = { town: cr('town', 0, 'clear', 'huiyao'), indoor: cr('indoor', 0, 'clear', 'huiyao'), campClear: cr('camp', 0, 'clear', 'qingwu'), campFog: cr('camp', 0, 'fog', 'qingwu'), campRain: cr('camp', 0, 'rain', 'qingwu'), campSnow: cr('camp', 0, 'snow', 'qingwu'), dungeon: cr('dungeon', 0, 'snow', 'jiku') };
    // 實際推進：城鎮街上 −3／h、建築內 −6／h、客棧睡一夜歸 0
    S.t = (100 - 1) * 1440 + 9 * 60; S.loc = 'huiyao'; G.enterHere(); S.cold = 50; G._debug.passTime(2); const town = S.cold;
    G.setTab('hy_inn'); G._debug.passTime(2); const indoor = S.cold;
    S.cold = 70; S.t = (100 - 1) * 1440 + 22 * 60; S.silver = 99; G.service('rest'); const inn = S.cold;
    return { rows: Object.fromEntries(rows), relief, town, indoor, inn };
  });
  const T64 = { '0clear': [1, 0, 0, 2], '0fog': [1, 0, 0, 2], '0rain': [2, 0, 1, 3], '1clear': [0, 0, 0, 0], '1fog': [0, 0, 0, 0], '1rain': [0, 0, 0, 1], '2clear': [2, 0, 1, 3], '2fog': [2, 0, 1, 3], '2rain': [3, 1, 2, 4], '3clear': [4, 2, 3, 5], '3fog': [4, 2, 3, 5], '3snow': [6, 4, 5, 7] };
  check('AC 8：6.4 野外累積速率表 12 列 × 4 時段逐格相符（季中、無禦寒）', Object.keys(T64).every((k) => JSON.stringify(ac8.rows[k]) === JSON.stringify(T64[k])), ac8.rows);
  check('AC 8：緩解 town −3、indoor −6、camp 晴霧 −4／雨雪 −2；地城只吃 coldOffset（預設 0）', ac8.relief.town === -3 && ac8.relief.indoor === -6 && ac8.relief.campClear === -4 && ac8.relief.campFog === -4 && ac8.relief.campRain === -2 && ac8.relief.campSnow === -2 && ac8.relief.dungeon === 0, ac8.relief);
  check('AC 8：實際推進：街上 2 小時 50→44、客棧內 2 小時 44→32、客棧睡一夜寒意歸 0', ac8.town === 44 && ac8.indoor === 32 && ac8.inn === 0, ac8);

  // ===== AC 9：跨階事件與階效果 =====
  const ac9 = await run(() => {
    const G = window.SHL, S = G.state, T = G.Time; const ev = [];
    const f = T.on('survival.stage', (e) => ev.push(e.stat + ':' + e.from + '>' + e.to));
    S.t = (100 - 1) * 1440 + 9 * 60; S.loc = 'qingwu'; G.enterHere(); G._debug.forceWeather('snow');
    S.food = 31; S.fat = 59; S.cold = 29; G._debug.passTime(1); // 冬雪白天野外 +4：寒意 33；飽食 −5；疲累 +2
    T.off('survival.stage', f);
    const fx = {};
    S.cold = 0; S.fat = 10; S.food = 80; const sp0 = G.speedMult(), h0 = G.hitChance();
    S.cold = 60; fx.shiver = [+(G.speedMult() / sp0).toFixed(4), +(G.hitChance() - h0).toFixed(4)];
    S.cold = 90; fx.numb = [+(G.speedMult() / sp0).toFixed(4), +(G.hitChance() - h0).toFixed(4)];
    S.cold = 30; fx.chilly = [+(G.speedMult() / sp0).toFixed(4), +(G.hitChance() - h0).toFixed(4)];
    // 回復：寒意 <60 才回；≥60 停
    S.t = (10 - 1) * 1440 + 9 * 60; S.loc = 'huiyao'; G.enterHere(); G._debug.forceWeather(null);
    S.hp = 50; S.cold = 0; S.food = 80; G._debug.passTime(2); const regenOk = S.hp;
    S.hp = 50; S.cold = 100; S.food = 80; G.setTab('hy_inn'); G._debug.passTime(1); const regenStop = S.hp; // 寒意 100→94 全程 ≥60：不回；90–99 段扣 1
    // 疲累 ×1.2（寒意 ≥30）：春季街上 1 小時疲累 +2 → 寒意 40 時 +2.4
    S.cold = 40; S.fat = 10; G.setTab(null); G._debug.passTime(1, { food: 0 }); const fat12 = S.fat;
    return { ev, fx, regenOk, regenStop, fat12, stages: Object.fromEntries(['food', 'fat', 'cold'].map((k) => [k, window.SHL_DATA.SURVIVAL_STAGES[k].map((x) => x.name)])) };
  });
  check('AC 9：一次 passTime 內飽食、疲累、寒意各跨一階，各發一次 survival.stage', JSON.stringify(ac9.ev.sort()) === JSON.stringify(['cold:warm>chilly', 'fat:awake>tired', 'food:full>hungry']), ac9.ev);
  check('AC 9／6.1：寒顫 速度 ×0.9、命中 −10%；凍僵 ×0.8、−15%；發冷不改速度命中', JSON.stringify(ac9.fx.shiver) === '[0.9,-0.1]' && JSON.stringify(ac9.fx.numb) === '[0.8,-0.15]' && JSON.stringify(ac9.fx.chilly) === '[1,0]', ac9.fx);
  check('6.5：飽食 ≥30 且寒意 <60 每小時回 1（50→52）；寒意 ≥60 不回（客棧內寒意 100→94 這 1 小時不回、凍僵扣 1：50→49）', ac9.regenOk === 52 && ac9.regenStop === 49, ac9);
  check('6.3：寒意 ≥30 時疲累累積 ×1.2（1 小時 +2.4，整數存值 10→12）', ac9.fat12 === 12, ac9.fat12);
  check('6.1／13 節：階名表（D.SURVIVAL_STAGES）', JSON.stringify(ac9.stages) === JSON.stringify({ food: ['充足', '餓了', '飢餓', '斷糧'], fat: ['清醒', '累了', '疲憊', '力竭'], cold: ['暖和', '發冷', '寒顫', '凍僵', '凍斃'] }), ac9.stages);

  // ===== AC 10：扣血上限、死因；E3、E7 =====
  const ac10 = await run(() => {
    const G = window.SHL, S = G.state; const out = {};
    S.t = (100 - 1) * 1440 + 22 * 60; S.loc = 'qingwu'; G.enterHere(); G._debug.forceWeather('snow');
    S.food = 0; S.fat = 100; S.cold = 100; S.hp = 80; G._debug.passTime(1, { food: 0, fat: 0 }); out.cap = S.hp;
    S.food = 0; S.fat = 100; S.cold = 100; S.hp = 5; G._debug.passTime(2, { food: 0, fat: 0 }); out.cause = S.dead && S.dead.cause;
    return out;
  });
  check('AC 10／6.5：斷糧 3＋力竭 2＋凍斃 3＝8，合計上限 6／小時（80→74）', ac10.cap === 74, ac10.cap);
  check('AC 10／6.5：三項同時、凍與餓同為 3 時死因取「凍死荒野」（凍 > 餓 > 力竭）', ac10.cause === '凍死荒野', ac10.cause);
  const e3 = await run(() => {
    const G = window.SHL, S = G.state; const out = {};
    const f = (day, hp) => { S.t = (day - 1) * 1440 + 8 * 60; S.loc = 'huiyao'; G.enterHere(); S.food = 80; S.hp = hp; S.fat = 10; S.cold = 0; const o = { fat: 0, noRegen: true }; const p = G.previewSurvival(80, o); let warn = null; for (let h = 0.25; h < 30 && warn === null; h += 0.25) if (G.previewSurvival(h, o).food < 30) warn = h; return { dieIn: p.deathIn, warn, cause: p.cause }; };
    out.summer = f(31, 80); out.winter = f(91, 80); out.summer40 = f(31, 40); out.winter40 = f(91, 40);
    return out;
  });
  check('E3：夏 滿血不進食，死亡約 46.67 小時（±1）、首個警示 12.5 小時、警示到死 ≥30 小時，死因「餓死荒野」', near(e3.summer.dieIn, 46.67, 1) && near(e3.summer.warn, 12.75, 0.26) && e3.summer.dieIn - 12.5 >= 30 && e3.summer.cause === '餓死荒野', e3.summer);
  check('E3：冬 滿血死亡約 42.67 小時（±1）、警示到死 ≥30 小時', near(e3.winter.dieIn, 42.67, 1) && e3.winter.dieIn - 10 >= 30, e3.winter);
  check('E3／6.6：hp 40 警示到死：夏 ≥18（手算 20.8）、冬 ≥18（手算 19.3）', e3.summer40.dieIn - 12.5 >= 18 && e3.winter40.dieIn - 10 >= 18 && near(e3.summer40.dieIn, 33.3, 1) && near(e3.winter40.dieIn, 29.3, 1), { s: e3.summer40, w: e3.winter40 });
  const e7 = await run(() => {
    const G = window.SHL, S = G.state;
    S.t = (92 - 1) * 1440 + 20 * 60; S.loc = 'qingwu'; G.enterHere(); G._debug.forceWeather('snow'); S.food = 80; S.fat = 10; S.cold = 0; S.hp = 80;
    const o = { exposure: 'outdoor', food: 0, fat: 0 };
    const c = [8, 9, 12, 14.25, 16.75].map((h) => G.previewSurvival(h, o).cold);
    let shiver = null; for (let h = 0.25; h < 12 && shiver === null; h += 0.05) if (G.previewSurvival(h, o).cold >= 60) shiver = h;
    const p = G.previewSurvival(60, o);
    return { c, shiver, dieIn: p.deathIn, cause: p.cause };
  });
  check('E7：冬雪 20:00 起野外：05:00 寒意 63、08:00 為 81、10:15 為 90、12:45 為 100（整數）', e7.c[1] === 63 && e7.c[2] === 81 && e7.c[3] === 90 && e7.c[4] === 100 && e7.c[0] === 56, e7.c);
  check('AC 10／E7：凍死時間與手算（自 20:00 起 16.75＋25.83＝42.58 小時）誤差 ≤1 小時；寒顫到凍死 ≥30 小時；死因凍死荒野', near(e7.dieIn, 42.58, 1) && e7.dieIn - e7.shiver >= 30 && e7.cause === '凍死荒野', e7);

  // ===== AC 11／12／23／P-04：睡眠保護、起床、逐切片扣血 =====
  const ac11 = await run(() => {
    const G = window.SHL, S = G.state; const out = {};
    const inn = (bid, loc, d, hh, mm) => { S.dead = null; S.t = (d - 1) * 1440 + hh * 60 + mm; S.loc = loc; G.enterHere(); G.setTab(bid); S.silver = 99; };
    // P-04：寒冷狀態（凍斃 100）＋斷糧、hp 2 在客棧與營帳睡：不會死
    inn('hy_inn', 'huiyao', 100, 22, 0); S.food = 0; S.cold = 100; S.hp = 2; G.service('rest'); out.rest = { dead: !!S.dead, hp: S.hp, cold: S.cold };
    inn('px_medic', 'poxiao', 100, 22, 0); S.food = 0; S.cold = 100; S.hp = 2; G.service('bunk'); out.bunk = { dead: !!S.dead, hp: S.hp, cold: S.cold };
    // 露宿無保護：同條件會死（第一次按只警告，第二次才睡）
    S.dead = null; S.t = (100 - 1) * 1440 + 22 * 60; S.loc = 'qingwu'; G.enterHere(); S.fire = true; S.fireUntil = S.t + 480; S.food = 80; S.cold = 100; S.hp = 2;
    G.camp(); out.warn = { dead: !!S.dead, t: S.t, log: S.log[S.log.length - 1].text }; G.camp(); out.camp = { dead: !!S.dead, cause: S.dead && S.dead.cause };
    // AC 12／E11：07:59／08:00／08:01 → 13:59／14:00／21:01
    out.wake = [[7, 59], [8, 0], [8, 1], [20, 0], [3, 0], [0, 0], [8, 10]].map(([h, m]) => { inn('hy_inn', 'huiyao', 3, h, m); S.food = 90; S.cold = 0; S.hp = 80; const d0 = G.dayOf(S.t); G.service('rest'); return G.fmtClock(S.t) + (G.dayOf(S.t) > d0 ? '+' : ''); });
    return out;
  });
  check('AC 11／P-04：凍斃（寒意 100）＋斷糧、hp 2 在客棧歇息不死，醒來回滿、寒意歸 0', !ac11.rest.dead && ac11.rest.hp > 2 && ac11.rest.cold === 0, ac11.rest);
  check('AC 11／P-04：同條件在破曉營傷兵帳睡通鋪不死（hp 最低 1，醒來 +30＝31）、寒意歸 0', !ac11.bunk.dead && ac11.bunk.hp === 31 && ac11.bunk.cold === 0, ac11.bunk);
  check('B15：露宿預測會死時第一次只警告（不推進時間）', !ac11.warn.dead && /小時內會死/.test(ac11.warn.log), ac11.warn);
  check('AC 11／B13：露宿沒有睡眠保護：同條件第二次按下去會凍死', ac11.camp.dead && ac11.camp.cause === '凍死荒野', ac11.camp);
  check('AC 12／E11：起床 07:59→13:59、08:00→14:00、08:01→21:01、20:00→次日 08:00、03:00→09:00、00:00→08:00、08:10→21:10', JSON.stringify(ac11.wake) === JSON.stringify(['13:59', '14:00', '21:01', '08:00+', '09:00', '08:00', '21:10']), ac11.wake);

  const ac23 = await run(() => {
    const G = window.SHL, S = G.state, T = G.Time; const out = {};
    let drain = 0; const f = T.on('survival.settle', (e) => (drain += e.drain.food));
    const go = (bid, loc, hh, mm, hp) => { drain = 0; S.dead = null; S.t = (5 - 1) * 1440 + hh * 60 + mm; S.loc = loc; G.enterHere(); G.setTab(bid); S.silver = 99; S.food = 5; S.cold = 0; S.hp = hp; const t0 = S.t; G.service(bid === 'hy_inn' ? 'rest' : 'bunk'); return { slept: (S.t - t0) / 60, drain: +drain.toFixed(6), hp: S.hp, food: S.food }; };
    out.rest12 = go('hy_inn', 'huiyao', 12, 0, 80);
    out.rest0801 = go('hy_inn', 'huiyao', 8, 1, 80);
    out.bunk12 = go('px_medic', 'poxiao', 12, 0, 50);
    out.bunkLow = go('px_medic', 'poxiao', 12, 0, 20); // 20−27 → 最低 1，醒來 +30
    // 露宿、茶攤小憩、行走同樣逐切片：飽食 5、露宿 2／h → 2.5 小時歸零，其後 5.5 小時 ×3＝16.5
    drain = 0; S.t = (5 - 1) * 1440 + 12 * 60; S.loc = 'qingwu'; G.enterHere(); S.fire = true; S.fireUntil = S.t + 600; S.food = 5; S.hp = 80; G._debug.passTime(8, { food: 16, fat: -50 }); out.camp = +drain.toFixed(6);
    drain = 0; S.t = (5 - 1) * 1440 + 12 * 60; S.loc = 'yizhan'; G.enterHere(); G.setTab('yz_tea'); S.food = 2; S.hp = 80; G.service('nap'); out.nap = +drain.toFixed(6);
    T.off('survival.settle', f);
    return out;
  });
  check('AC 23：飽食 5 在客棧 12:00 睡 13 小時：第 4.0 小時歸零，其後 9 小時斷糧扣 3×9＝27（舊式整段 39 不合格）', ac23.rest12.slept === 13 && near(ac23.rest12.drain, 27, 1e-6), ac23.rest12);
  check('AC 23：就寢不在整點（08:01 睡到 21:01）也一樣是 27', ac23.rest0801.slept === 13 && near(ac23.rest0801.drain, 27, 1e-6), ac23.rest0801);
  check('AC 23：傷兵帳通鋪同條件 hp 50 → 50−27＝23，醒來 +30＝53', ac23.bunk12.hp === 53 && near(ac23.bunk12.drain, 27, 1e-6), ac23.bunk12);
  check('AC 23／Q7：通鋪 hp 20（20−27 會死）→ 最低留 1，醒來 31', ac23.bunkLow.hp === 31, ac23.bunkLow);
  check('AC 23：露宿也逐切片：飽食 5、每小時 2，第 2.5 小時歸零，其後 5.5 小時 ×3＝16.5', near(ac23.camp, 16.5, 1e-6), ac23.camp);
  check('AC 23：茶攤小憩 2 小時（飽食 2、4／h）：第 0.5 小時歸零，其後 1.5 小時 ×3＝4.5', near(ac23.nap, 4.5, 1e-6), ac23.nap);
  const walk = await run(() => {
    const G = window.SHL, S = G.state, T = G.Time; let drain = 0; const f = T.on('survival.settle', (e) => (drain += e.drain.food));
    S.t = (5 - 1) * 1440 + 9 * 60; S.loc = 'huiyao'; S.scene = 'map'; S.known.yizhan = true; S.food = 2; S.hp = 80; G.selectDest('yizhan'); const p = G.travelPreview('yizhan'); G.travel();
    T.off('survival.settle', f);
    return { hours: p.hours, drain: +drain.toFixed(6), hp: S.hp, loc: S.loc };
  });
  check('AC 23：行走也逐切片：飽食 2 走官道 2 小時，第 0.5 小時歸零，其後 1.5 小時 ×3＝4.5', walk.hours === 2 && near(walk.drain, 4.5, 1e-6) && walk.loc === 'yizhan', walk);

  // ===== AC 13：營業時間 =====
  const ac13 = await run(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state; const out = {};
    const all = (bid) => { for (let m = 0; m < 1440; m++) if (!G.isOpen(bid, m)) return false; return true; };
    out.h24 = ['hy_inn', 'dy_inn', 'px_medic', 'hy_shrine', 'dy_tower'].map((b) => [b, all(b)]);
    out.shops = Object.keys(D.BUILDINGS).filter((b) => ['market', 'apoth', 'smith'].includes(D.BUILDINGS[b].type)).map((b) => { let bad = 0; for (let m = 0; m < 1440; m++) { const o = G.isOpen(b, m); if (o !== (m >= 420 && m < 1200)) bad++; } return [b, bad]; });
    out.edge = ['hy_market', 'yz_tea', 'hy_board', 'px_drill'].map((b) => [b, [299, 300, 419, 420, 479, 480, 1019, 1020, 1199, 1200].map((m) => (G.isOpen(b, m) ? 1 : 0)).join('')]);
    // 打烊時買不到、開門時買得到；做到一半不中斷；不踢人
    S.t = (2 - 1) * 1440 + 20 * 60; S.loc = 'huiyao'; G.enterHere(); G.setTab('hy_market'); S.silver = 500;
    G.selectShop(0); const s0 = S.silver; G.buy(); out.closedBuy = { spent: s0 - S.silver, log: S.log[S.log.length - 1].text, still: S.townTab };
    S.t = (2 - 1) * 1440 + 19 * 60 + 59; G.selectShop(0); const s1 = S.silver; G.buy(); out.openBuy = s1 - S.silver;
    // 茶攤 19:45 打聽（0.5 小時，跨過 20:00）照樣做完；20:10 再打聽被擋
    S.t = (2 - 1) * 1440 + 19 * 60 + 45; S.loc = 'yizhan'; G.enterHere(); G.setTab('yz_tea'); S.rumors = []; S.freeRumor = {}; G.hearRumor(); out.cross = { n: S.rumors.length, clock: G.fmtClock(S.t), tab: S.townTab };
    S.freeRumor = {}; G.hearRumor(); out.after = S.rumors.length;
    // 委託板 17:00 打烊
    S.t = (2 - 1) * 1440 + 17 * 60; S.loc = 'huiyao'; G.enterHere(); G.setTab('hy_board');
    const q = { id: 'tq_shut', town: 'huiyao', kind: 'kill', enemy: 'wolf', need: 1, g: '狼', ic: 'wolf', title: '獵殺灰髯狼 ×1', reward: 20, due: 9, fixed: false, prog: 0, status: 'open' };
    S.quests.push(q); G.questAct('tq_shut'); out.board = q.status; S.t -= 1; G.questAct('tq_shut'); out.board1659 = q.status;
    return out;
  });
  check('AC 13：客棧、傷兵帳、神廟、關樓 24 小時開', ac13.h24.every((x) => x[1]), ac13.h24);
  check('AC 13：所有 market／apoth／smith 在 07:00–20:00 開、20:00–07:00 關（1440 分鐘逐一）', ac13.shops.every((x) => x[1] === 0), ac13.shops);
  check('8.1：邊界 04:59/05:00/06:59/07:00/07:59/08:00/16:59/17:00/19:59/20:00：商店 0001111110、茶攤 0111111110、委託板 0000011000、校場 0111111110', JSON.stringify(ac13.edge) === JSON.stringify([['hy_market', '0001111110'], ['yz_tea', '0111111110'], ['hy_board', '0000011000'], ['px_drill', '0111111110']]), ac13.edge);
  check('AC 13／8.1：20:00 打烊買不到（銀不變、日誌「打烊了」、人仍在店內 B7）；19:59 買得到', ac13.closedBuy.spent === 0 && /打烊了，07:00 開門/.test(ac13.closedBuy.log) && ac13.closedBuy.still === 'hy_market' && ac13.openBuy > 0, ac13);
  check('AC 13：只在行動開始時檢查：19:45 打聽 0.5 小時跨過 20:00 照樣完成；之後再打聽被擋', ac13.cross.n === 1 && ac13.cross.clock === '20:15' && ac13.after === 1, ac13);
  check('8.1：委託板 17:00 打烊揭不了榜；16:59 可以', ac13.board === 'open' && ac13.board1659 === 'active', ac13);

  // shop 事件：關前 30 分預警、S.t 即該時刻；日誌一行「X 快打烊了」
  const shopEv = await run(() => {
    const G = window.SHL, S = G.state, T = G.Time; const ev = [];
    const f = T.on('shop.close', (e) => { if (e.bid === 'hy_market') ev.push([G.fmtClock(S.t), e.soon]); });
    const g = T.on('shop.open', (e) => { if (e.bid === 'hy_market') ev.push([G.fmtClock(S.t), 'open']); });
    S.t = (2 - 1) * 1440 + 18 * 60; S.loc = 'huiyao'; G.enterHere(); G._debug.passTime(14, { food: 0, fat: 0 });
    T.off('shop.close', f); T.off('shop.open', g);
    return { ev, log: S.log.filter((l) => /快打烊了/.test(l.text)).map((l) => G.fmtClock(l.t) + ' ' + l.text) };
  });
  check('8.1／9.1：shop.close 在 19:30（soon）與 20:00 各一次、shop.open 在 07:00，處理器看到的 S.t 就是該時刻', JSON.stringify(shopEv.ev) === JSON.stringify([['19:30', true], ['20:00', false], ['07:00', 'open']]), shopEv.ev);
  check('8.1：關前 30 分日誌一行「天星分號、回春藥鋪、石記鐵鋪快打烊了。」', shopEv.log.length === 1 && shopEv.log[0] === '19:30 天星分號、回春藥鋪、石記鐵鋪快打烊了。', shopEv.log);

  // ===== AC 14／E9：行走遇險 =====
  const ac14 = await run(() => {
    const G = window.SHL, S = G.state, D = window.SHL_DATA; const out = {};
    S.loc = 'huiyao'; S.scene = 'map';
    const r = (d, hh, wx, to) => { S.t = (d - 1) * 1440 + hh * 60; G._debug.forceWeather(wx); const p = G.travelPreview(to); return { risk: +p.risk.toFixed(6), hours: p.hours, R: p.R }; };
    out.night = r(3, 22, 'clear', 'fuzhao'); out.dusk19 = r(3, 19, 'clear', 'fuzhao'); out.day = r(3, 10, 'clear', 'fuzhao'); out.rain = r(3, 10, 'rain', 'fuzhao'); out.fog = r(3, 5, 'fog', 'fuzhao');
    // 全組合 ≤ 0.85：所有已知目的地 × 4 時段 × 4 天候 × 超載＋獸潮
    for (let i = 0; i < 12; i++) G._debug.addItem({ k: 'ore_xs', n: 3 });
    S.world.tide = { town: 'huiyao', start: 1, end: 999, kills: 0, need: 4 };
    let mx = 0; Object.keys(D.NODES).forEach((to) => { if (to === 'huiyao') return; S.known[to] = true; [6, 12, 18, 22].forEach((hh) => ['clear', 'rain', 'fog', 'snow'].forEach((wx) => { S.t = (95 - 1) * 1440 + hh * 60; G._debug.forceWeather(wx); const p = G.travelPreview(to); if (p.edges.length) mx = Math.max(mx, p.risk); })); });
    out.max = mx;
    return out;
  });
  check('AC 14／E9：野徑單段（灰窯→腐骨沼 2 小時，R=1）黑夜 0.44、19:00 出發（黃昏 1＋黑夜 1）0.385、白天 0.22、雨天白天 0.242、清晨霧 0.33', ac14.night.R === 1 && near(ac14.night.risk, 0.44) && near(ac14.dusk19.risk, 0.385) && near(ac14.day.risk, 0.22) && near(ac14.rain.risk, 0.242) && near(ac14.fog.risk, 0.33) && ac14.night.hours === 2, ac14);
  check('AC 14／AC 20：全部路線×時段×天候（加超載與獸潮）risk ≤ 0.85，且有組合被封頂到 0.85', ac14.max <= 0.85 && near(ac14.max, 0.85), ac14.max);

  // ===== AC 24／E10：露宿遇險漸進倍率 =====
  const ac24 = await run(() => {
    const G = window.SHL, S = G.state; G._debug.forceWeather('clear');
    const b = (hh) => +G.campRisk((5 - 1) * 1440 + hh * 60, { bare: true }).toFixed(6);
    S.loc = 'qingwu'; G.enterHere(); // 青霧藥林為低險地 ×0.6
    const real12 = +G.campRisk((5 - 1) * 1440 + 12 * 60).toFixed(6);
    G._debug.forceWeather('fog'); const fog20 = +G.campRisk((5 - 1) * 1440 + 20 * 60).toFixed(6);
    return { d8: b(8), d12: b(12), d17: b(17), d20: b(20), real12, fog20 };
  });
  check('AC 24／E10：08:00 睡到 16:00（全白天）0.12', near(ac24.d8, 0.12), ac24.d8);
  check('AC 24／E10：12:00 睡到 20:00（白天 5＋黃昏 3）0.144375（舊式「終點是黑夜」0.25 已拿掉）', near(ac24.d12, 0.144375), ac24.d12);
  check('AC 24／E10：17:00 睡到 01:00 0.225625；20:00 睡 8 小時 0.25', near(ac24.d17, 0.225625) && near(ac24.d20, 0.25), ac24);
  check('7.1：實際露宿再乘低險地 ×0.6（12:00：0.086625）、wxRisk（霧 ×1.2：20:00 低險地 0.18）', near(ac24.real12, 0.086625) && near(ac24.fog20, 0.18), ac24);

  // ===== AC 18／7.2：0.5 小時進位、雪天腳程 =====
  const ac18 = await run(() => {
    const G = window.SHL, S = G.state, D = window.SHL_DATA;
    const tab = [[1, 0.99], [0.67, 0.66], [0.5, 0.49]].map(([a, b]) => [1, 2, 3, 4, 5, 6, 7].map((h) => [G.walkHoursOf([[h, a]]), G.walkHoursOf([[h, b]])]));
    const six = G.walkHoursOf([[6, 0.6]]);
    // 雪天：輕裝野徑 0.85、官道 0.93；超載＋疲憊＋雪天野徑 0.43 蹣跚（AC 19 最後一列）
    S.t = (100 - 1) * 1440 + 10 * 60; G._debug.forceWeather('snow');
    const wild = D.EDGES.find((e) => !e.road), road = D.EDGES.find((e) => e.road);
    const light = [G.edgeMult(wild), G.edgeMult(road), G.paceMult()];
    for (let i = 0; i < 60 && G.loadBand().id !== 'heavy'; i++) G._debug.addItem({ k: 'ore_xs', n: 1 });
    S.fat = 85; const heavy = [G.loadBand().id, G.edgeMult(wild), G.paceName(G.edgeMult(wild))];
    S.fat = 10; S.pack = S.pack.map((it) => (it && it.k === 'ore_xs' ? null : it)); S.ground.items = [];
    // 雪天地圖趕路：灰窯→青霧藥林（野徑 1＋1）晴 2 小時 → 雪 2.5 小時（輕裝 ≤+1 小時、≤+25%）
    S.loc = 'huiyao'; S.scene = 'map'; G._debug.forceWeather('clear'); const clr = G.travelPreview('qingwu'); G._debug.forceWeather('snow'); const snw = G.travelPreview('qingwu');
    return { tab, six, light, heavy, clr: [clr.hours, clr.mult, clr.pace], snw: [snw.hours, snw.mult, snw.pace] };
  });
  const want18 = [[[1, 1.5], [2, 2.5], [3, 3.5], [4, 4.5]], [[1.5, 2], [3, 3.5], [4.5, 5], [6, 6.5]], [[2, 2.5], [4, 4.5], [6, 6.5], [8, 8.5]]];
  check('AC 18／7.2 腳程檔第 3 條：切點兩側（h＝1–4）時間與手算表相符', want18.every((row, i) => row.every((p, h) => ac18.tab[i][h][0] === p[0] && ac18.tab[i][h][1] === p[1])), ac18.tab);
  check('AC 18：h＝1–7、三個切點兩側時間差皆 ≥0.5 小時', ac18.tab.every((row) => row.every(([a, b]) => b - a >= 0.5)), ac18.tab);
  check('7.2：整數百分點運算，6÷0.60＝10.0 小時（不因浮點多進 0.5）', ac18.six === 10, ac18.six);
  check('3.1／AC 19：雪天輕裝 野徑 M 0.85、官道 0.93（0.925 half-up）；左欄 M 不含天候仍 1.00', JSON.stringify(ac18.light) === '[0.85,0.93,1]', ac18.light);
  check('AC 19：超載＋疲憊＋雪天野徑 M＝0.43「蹣跚」', ac18.heavy[0] === 'heavy' && ac18.heavy[1] === 0.43 && ac18.heavy[2] === '蹣跚', ac18.heavy);
  check('3.1／T3：灰窯→青霧藥林 晴 2 小時（輕快 ×1.00）→ 雪 2.5 小時（平常 ×0.85），+0.5 小時、+25%', JSON.stringify(ac18.clr) === '[2,1,"輕快"]' && JSON.stringify(ac18.snw) === '[2.5,0.85,"平常"]', ac18);

  // ===== E4／E5：兩餐、三餐（取整後 ±1） =====
  const e45 = await run(() => {
    const G = window.SHL, S = G.state;
    const day = (d0, meals, x0) => { S.t = (d0 - 1) * 1440 + 8 * 60; S.loc = 'huiyao'; G.enterHere(); S.food = x0; S.cold = 0; let low = 999;
      const eat = () => { S.food = Math.min(100, S.food + 35); };
      eat(); G._debug.passTime(10); low = Math.min(low, S.food); eat(); if (meals === 3) { G._debug.passTime(2); eat(); G._debug.passTime(2); } else G._debug.passTime(4);
      G.setTab('hy_inn'); S.silver = 99; G.service('rest'); G.setTab(null); return { end: S.food, low }; };
    return { spring: day(5, 2, 50), winter2: day(95, 2, 60), winter3: day(96, 3, 60) };
  });
  check('E4：春季標準日兩餐（x0＝50）：傍晚餐前最低點 45 ≥30、日終 51.5（±1）', e45.spring.low === 45 && Math.abs(e45.spring.end - 51.5) <= 1, e45.spring);
  check('E5：冬季兩餐每日約 −15.6（60 → 44.4，±1）；三餐日終高於起點（飽食封頂 100 前 +19.4）', Math.abs(e45.winter2.end - 44.4) <= 1 && e45.winter3.end > 60, e45);

  // ===== E6／E8：冬季寒意 =====
  const e6 = await run(() => {
    const G = window.SHL, D = window.SHL_DATA, cr = G._debug.coldRate;
    const sum = (wx) => { let s = 0; for (let h = 0; h < 24; h++) s += cr('outdoor', (100 - 1) * 1440 + h * 60, wx, 'qingwu'); return s; };
    const out = { clear: sum('clear'), snow: sum('snow') };
    // 禦寒點數（裝備 warm，數值歸 SPEC-SEASON）：暫時給布衣 warm 2／4 驗機制，驗完還原
    const S = G.state; const robe = S.equip.chest; const B = robe && D.BASES[robe.base]; const old = B && B.warm;
    if (B) { B.warm = 2; out.w2 = [sum('clear'), sum('snow')]; B.warm = 9; out.w4 = [sum('clear'), sum('snow')]; if (old === undefined) delete B.warm; else B.warm = old; }
    let day9 = 0; for (let h = 8; h < 17; h++) day9 += cr('outdoor', (100 - 1) * 1440 + h * 60, 'clear', 'qingwu');
    return Object.assign(out, { day9, chest: robe && robe.base });
  });
  check('E6：冬季野外一整天（無禦寒）晴 84、雪 132；白天 08–17 晴 18（<30 不進警示）', e6.clear === 84 && e6.snow === 132 && e6.day9 === 18, e6);
  check('E6：禦寒 warm＝2 晴 36／雪 84；warm 上限 4（給 9 也只算 4）晴 9／雪 36', JSON.stringify(e6.w2) === '[36,84]' && JSON.stringify(e6.w4) === '[9,36]', e6);
  const e8 = await run(() => {
    const G = window.SHL, S = G.state; const out = {};
    const night = (wx, season) => { G.restart(4242, 'drifter'); const S = G.state; S.world.tide = null; S.world.next = 1e9; G._debug.forceWeather(wx);
      S.t = (season - 1) * 1440 + 20 * 60; S.loc = 'qingwu'; G.enterHere(); S.cold = 0; S.food = 90; S.fat = 10; S.hp = 80;
      G.camp(); const fu = S.fireUntil - S.t; const c1 = S.cold; G._debug.passTime(8, { food: 16, fat: -50 }); return { fireH: fu / 60, afterLight: c1, wake: S.cold, fire: S.fire, out: S.log.some((l) => l.text === '營火熄了。'), clock: G.fmtClock(S.t) }; };
    out.clear = night('clear', 100); out.snow = night('snow', 100);
    return out;
  });
  check('E8：冬晴 20:00 點火（+5）、火 8 小時、到 05:00 寒意 0', e8.clear.fireH === 8 && e8.clear.afterLight === 5 && e8.clear.wake === 0 && e8.clear.clock === '05:00', e8.clear);
  check('E8：冬雪 20:00 點火（+7）、火 4 小時到 01:00 熄（日誌「營火熄了」）、01:00–05:00 +28：起床寒意 28', e8.snow.fireH === 4 && e8.snow.afterLight === 7 && e8.snow.wake === 28 && !e8.snow.fire && e8.snow.out, e8.snow);
  const b4 = await run(() => {
    const G = window.SHL, S = G.state; G._debug.forceWeather('snow');
    S.t = (100 - 1) * 1440 + 20 * 60 + 30; S.loc = 'qingwu'; G.enterHere(); S.cold = 0; S.food = 90; G.camp(); // 21:30 點好，火到 01:30
    const cuts = []; const f = G.Time.on('time.slice', (e) => cuts.push(G.fmtClock(e.t1))); G._debug.passTime(5, { food: 0, fat: 0 }); G.Time.off('time.slice', f);
    return { until: G.fmtClock(S.fireUntil), cuts, cold: S.cold };
  });
  check('B4／5.1：營火在切片中途（01:30）熄滅，01:30 成為切片邊界，之後視為 outdoor', b4.until === '01:30' && b4.cuts.includes('01:30') && b4.cuts.includes('02:00'), b4);

  // ===== AC 17／B9／B16：過日、過季、過年、過冬 =====
  const ac17 = await run(() => {
    const G = window.SHL, S = G.state, T = G.Time; const ev = [];
    const names = ['time.newDay', 'time.season', 'time.seasonEve', 'time.year', 'time.weather'];
    const fs = names.map((n) => T.on(n, (e) => { if (n !== 'time.weather') ev.push(n.slice(5) + '@' + G.dayOf(S.t) + ' ' + G.fmtClock(S.t)); else ev.push('weather@' + G.fmtClock(S.t)); }));
    S.loc = 'huiyao'; G.enterHere();
    const seg = (d0, h) => { ev.length = 0; S.t = (d0 - 1) * 1440 + 20 * 60; G._debug.passTime(h, { food: 0, fat: 0 }); return ev.slice(); };
    const out = { d25: seg(25, 12), d30: seg(30, 12), d85: seg(85, 12), d90: seg(90, 12), d120: seg(120, 12) };
    names.forEach((n, i) => T.off(n, fs[i]));
    const logs = S.log.filter((l) => /再過五天/.test(l.text)).map((l) => l.text);
    out.age = [G.ageOf((120 - 1) * 1440), G.ageOf(120 * 1440)];
    out.logs = logs;
    return out;
  });
  const noWx = (a) => a.filter((x) => !x.startsWith('weather@'));
  check('9.1：每季第 26 日 00:00 發 time.seasonEve（第 26 日）', JSON.stringify(noWx(ac17.d25)) === JSON.stringify(['newDay@26 00:00', 'seasonEve@26 00:00']), ac17.d25);
  check('AC 17：過季（第 30→31 日）：newDay → season，S.t 為 00:00', JSON.stringify(noWx(ac17.d30)) === JSON.stringify(['newDay@31 00:00', 'season@31 00:00']), ac17.d30);
  check('AC 17：入冬（第 90→91 日）', JSON.stringify(noWx(ac17.d90)) === JSON.stringify(['newDay@91 00:00', 'season@91 00:00']), ac17.d90);
  check('AC 17／B9：過年（第 120→121 日）：newDay → season → year 同時發、順序 season→year；年齡 +1', JSON.stringify(noWx(ac17.d120)) === JSON.stringify(['newDay@121 00:00', 'season@121 00:00', 'year@121 00:00']) && ac17.age[1] === ac17.age[0] + 1, ac17);
  check('B16：天候只在 05:00（或霧散的 10:00）換，00:00 補貨時不換', [ac17.d25, ac17.d30, ac17.d85, ac17.d90, ac17.d120].every((a) => a.filter((x) => x.startsWith('weather@')).every((x) => x === 'weather@05:00' || x === 'weather@10:00')), ac17);
  check('13 節：入冬前預告句寫進日誌', ac17.logs.some((t) => /入冬/.test(t)), ac17.logs);

  // ===== 9.2／9.3：修正器與曆法事件空殼 =====
  const mods = await run(() => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state, T = G.Time; const out = {};
    out.cal = D.CAL_EVENTS.map((e) => [e.id, e.season, e.name, e.gods.join(','), e.dayOfSeason, e.startMin, e.durationH]);
    let n = 0; const f = T.on('cal.event', () => n++); S.t = 480; G._debug.passTime(24 * 3, { food: 0, fat: 0 }); T.off('cal.event', f); out.calFired = n;
    // shopHours 覆寫：後註冊者優先
    const m1 = T.mod('shopHours', (c) => (c.bid === 'hy_market' ? true : undefined)); out.night = G.isOpen('hy_market', 23 * 60);
    const m2 = T.mod('shopHours', (c) => (c.bid === 'hy_market' ? false : undefined)); out.later = G.isOpen('hy_market', 12 * 60);
    T.unmod('shopHours', m1); T.unmod('shopHours', m2); out.back = G.isOpen('hy_market', 12 * 60);
    // foodMult、riskMul（乘法）、coldGainAdd（加法）
    S.t = (10 - 1) * 1440 + 9 * 60; S.loc = 'huiyao'; G.enterHere(); S.food = 80; const m3 = T.mod('foodMult', () => 0.5); G._debug.passTime(2); T.unmod('foodMult', m3); out.food = S.food;
    const m4 = T.mod('coldGainAdd', () => -10); out.cold = G._debug.coldRate('outdoor', (100 - 1) * 1440 + 22 * 60, 'snow', 'qingwu'); T.unmod('coldGainAdd', m4);
    return out;
  });
  check('9.3：D.CAL_EVENTS 十二神祭 4 筆空殼（神位已填，日期／開始／時長為 null）', JSON.stringify(mods.cal) === JSON.stringify([['fest_12_spring', 0, '十二神祭・春', 'yin,mao,chen', null, null, null], ['fest_12_summer', 1, '十二神祭・夏', 'si,wu,wei', null, null, null], ['fest_12_autumn', 2, '十二神祭・秋', 'shen,you,xu', null, null, null], ['fest_12_winter', 3, '十二神祭・冬', 'hai,zi,chou', null, null, null]]), mods.cal);
  check('9.3：空殼不觸發 cal.event', mods.calFired === 0, mods.calFired);
  check('9.2：Time.mod("shopHours") 覆寫營業（後註冊者優先），移除後恢復', mods.night === true && mods.later === false && mods.back === true, mods);
  check('9.2：foodMult ×0.5（2 小時 80→76）、coldGainAdd −10（冬雪黑夜 7−10 → max(0, …)＝0）', mods.food === 76 && mods.cold === 0, mods);

  // ===== B6：行走途中死亡 =====
  const b6 = await run(() => {
    const G = window.SHL, S = G.state;
    S.t = (5 - 1) * 1440 + 9 * 60; S.loc = 'huiyao'; S.scene = 'map'; S.known.yizhan = true; S.food = 0; S.hp = 2; G.selectDest('yizhan');
    G.travel(); const first = { dead: !!S.dead, loc: S.loc, t: S.t, warn: S.log[S.log.length - 1].text };
    G.travel(); return { first, dead: S.dead && { where: S.dead.where, cause: S.dead.cause } };
  });
  check('6.5：預測會死的趕路，第一次按只警告（不出發、不推進時間）', !b6.first.dead && b6.first.loc === 'huiyao' && /小時內會死/.test(b6.first.warn), b6.first);
  check('B6：再按一次出發，途中餓死：死亡地點「灰窯鎮往官道驛站的途中」', b6.dead && b6.dead.where === '灰窯鎮往官道驛站的途中' && b6.dead.cause === '餓死荒野', b6.dead);

  // ===== waitUntil（7.2 等待） =====
  const wt = await run(() => {
    const G = window.SHL, S = G.state; const out = {};
    S.t = (3 - 1) * 1440 + 21 * 60; S.loc = 'huiyao'; G.enterHere(); G.waitUntil('open:hy_market'); out.open = G.fmtClock(S.t);
    S.t = (3 - 1) * 1440 + 16 * 60 + 50; G.waitUntil('phase'); out.phase = G.fmtClock(S.t);
    return out;
  });
  check('7.2 waitUntil：21:00 等到天星分號開門 → 07:00（10 小時）；16:50 等下一時段 → 最短 30 分（17:20）', wt.open === '07:00' && wt.phase === '17:20', wt);

  // ===== 熱湯（Q3、10.2） =====
  const soup = await run(() => {
    const G = window.SHL, S = G.state; S.t = (3 - 1) * 1440 + 12 * 60; S.loc = 'huiyao'; G.enterHere(); G.setTab('hy_inn'); S.food = 40; S.cold = 40; S.silver = 50; G.service('soup');
    return { food: S.food, cold: S.cold, silver: S.silver };
  });
  check('Q3／10.2：熱湯 3 兩、飽食 +35（40→75）、寒意 −15（再坐 0.5 小時室內 −3：40→22）', soup.food === 75 && soup.silver === 47 && soup.cold === 22, soup);

  // ===== 畫面：右欄時間、寒意條、打烊、冬季雪天野外（AC 16） =====
  const ui = async (fn, arg) => { await page.evaluate(RESET); await page.evaluate(fn, arg); await page.evaluate(() => window.SHL.setProfTab(window.SHL.state.profTab)); await page.waitForTimeout(150); };
  await ui(() => { const G = window.SHL, S = G.state; S.t = (12 - 1) * 1440 + 14 * 60 + 30; S.loc = 'huiyao'; G.enterHere(); });
  const r1 = await page.evaluate(() => ({ clock: document.querySelector('[data-testid=clock]').textContent, phaseW: getComputedStyle(document.querySelector('[data-testid=phase]')).fontWeight, cold: !!document.querySelector('[data-testid=cold]'), body: document.body.innerText, title: document.querySelector('[data-testid=clock]').title, date: document.querySelector('[data-testid=date]').textContent }));
  check('AC 16：右欄時間以時段名為主（粗體），鐘點次級；格式「第 12 日・白天 14:30 天候」，日期框「元年春」', /^第 12 日・白天 14:30 (晴|雨|霧)$/.test(r1.clock) && +r1.phaseW >= 700 && r1.date === '元年春' && r1.title.startsWith('元年春・第 12 日・白天 14:30・天候 '), r1);
  check('AC 16：畫面全程不出現「時辰」', !/時辰/.test(r1.body));
  check('Q2：春季寒意 0 時不顯示寒意條', !r1.cold);
  await shot(page, 'devtime-01-clock-spring.png');

  await ui(() => { const G = window.SHL, S = G.state; G._debug.forceWeather('snow'); S.t = (103 - 1) * 1440 + 18 * 60 + 10; S.loc = 'huiyao'; G.enterHere(); S.cold = 64; S.fat = 62; S.food = 26; });
  const r2 = await page.evaluate(() => ({ cold: (document.querySelector('[data-testid=cold]') || {}).textContent, chip: (document.querySelector('[data-testid=st-cold]') || {}).title, clock: document.querySelector('[data-testid=clock]').textContent }));
  check('Q2／10.2：冬季寒意 64：右欄出現寒意條「64/100」與狀態牌「寒意：寒顫」', r2.cold === '寒64/100' && r2.chip === '寒意：寒顫' && r2.clock === '第 103 日・黃昏 18:10 雪', r2);
  await shot(page, 'devtime-02-cold-bar-winter.png');

  await ui(() => { const G = window.SHL, S = G.state; S.t = (4 - 1) * 1440 + 21 * 60; S.loc = 'huiyao'; G.enterHere(); });
  const r3 = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^=shut-]')).map((e) => e.getAttribute('data-testid').slice(5)).sort());
  check('8.1：21:00 灰窯街上，天星分號、回春藥鋪、石記鐵鋪、鎮衙標「打烊」；客棧、窯神廟不標', JSON.stringify(r3) === JSON.stringify(['hy_apoth', 'hy_board', 'hy_market', 'hy_smith']), r3);
  await shot(page, 'devtime-03-town-closed-night.png');
  await ui(() => { const G = window.SHL, S = G.state; S.t = (4 - 1) * 1440 + 21 * 60; S.loc = 'huiyao'; G.enterHere(); G.setTab('hy_market'); });
  const r4 = await page.evaluate(() => ({ tag: (document.querySelector('[data-testid=shop-shut]') || {}).textContent, shut: !!document.querySelector('.tpanel.shut'), talk: !!document.querySelector('[data-testid=btn-talk]') }));
  check('8.1／B7：打烊的店內標「打烊・07:00 開門」、服務停用、閒談與回到街上照常', r4.tag === '打烊・07:00 開門' && r4.shut && r4.talk, r4);
  await shot(page, 'devtime-04-shop-closed.png');

  await ui(() => { const G = window.SHL, S = G.state; G._debug.forceWeather('snow'); S.t = (104 - 1) * 1440 + 22 * 60; S.loc = 'qingwu'; G.enterHere(); S.cold = 47; });
  const r5 = await page.evaluate(() => ({ cap: document.querySelector('[data-testid=wild-cap]').textContent, cold: (document.querySelector('[data-testid=cold]') || {}).textContent }));
  check('10.2：野外說明改為「時段・天候」並註明遇險上升（冬雪黑夜）', /黑夜・雪，遇險上升。$/.test(r5.cap) && r5.cold === '寒47/100', r5);
  await shot(page, 'devtime-05-winter-snow-wild.png');
  await ui(() => { const G = window.SHL, S = G.state; G._debug.forceWeather('clear'); S.t = (40 - 1) * 1440 + 12 * 60; S.loc = 'qingwu'; G.enterHere(); });
  const r6 = await page.evaluate(() => document.querySelector('[data-testid=wild-cap]').textContent);
  check('10.2：夏季晴天白天野外說明「白天・晴。」不寫遇險上升', /白天・晴。$/.test(r6), r6);
  // 右欄極端值：第 120 日、5 位數銀兩、4 字名
  await ui(() => { const G = window.SHL, S = G.state; G._debug.forceWeather('snow'); S.t = (120 - 1) * 1440 + 23 * 60 + 59; S.silver = 99999; S.cold = 100; S.hp = 3; S.food = 0; S.fat = 100; S.loc = 'huiyao'; G.enterHere(); });
  await shot(page, 'devtime-06-right-column-extremes.png');

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
