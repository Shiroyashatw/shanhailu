/* 《山海錄》DEV-03 路人與巡邏走動 — 新增驗收（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e-dev03.js [--shots]
 *   --shots  另存 1280×720 實機截圖至 docs/evidence/shots-shanhailu-dev03-fix1-1128/（可用環境變數 SHOTS_DIR 覆寫）
 * 依據：docs/specs/SPEC-01.md v0.5（§6、AC-D2、AC-J6 與 v0.4 同）（§6 路人與巡邏人數、§10 AC-D2、AC-J6、§13 DEV-03 列）、
 *       docs/plan/rollout-plan-v0.1.md 第 114 行（DEV-03）與 5.1 DEV-03 列。
 * 既有 tests/e2e.js、tests/e2e-dev02.js 不動；本檔只放 DEV-03 的新斷言。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS_DIR ? path.resolve(ROOT, process.env.SHOTS_DIR) : path.join(ROOT, 'docs/evidence/shots-shanhailu-dev03-fix1-1128');
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
async function layout(page, name) {
  const lay = await page.evaluate(() => {
    const w = (id) => document.getElementById(id).getBoundingClientRect().width;
    // 文字重疊稽核：街上標籤（建築名、有職位者名）兩兩不相交
    const boxes = Array.from(document.querySelectorAll('.plan .bld > span, .plan .fig > span')).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
    let overlap = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap++;
    }
    return { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, c: [w('col-left'), w('col-center'), w('col-right')], overlap };
  });
  check('[' + name + '] 1280×720 單屏無捲動、三欄 240/796/220、街上標籤無重疊', lay.sw <= 1280 && lay.sh <= 720 && lay.c.join('/') === '240/796/220' && lay.overlap === 0, lay);
}
async function shot(page, name) {
  await layout(page, name);
  if (!WANT_SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('SHOT  ' + path.relative(ROOT, path.join(SHOTS, name)));
}
async function fresh(page, base, q) {
  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0' + (q || ''));
  await page.waitForSelector('[data-testid=town]');
}
// 把玩家放到某鎮街上，設定 P、Geff（只為測試；不經日結），重繪後回報 crowd() 與畫面人數
async function setTown(page, loc, P, Geff) {
  return page.evaluate(([loc, P, Geff]) => {
    const G = window.SHL; const S = G.state;
    S.scene = 'town'; S.loc = loc; S.street = null;
    if (P !== null) S.world.towns[loc].P = P;
    if (Geff !== null) S.world.towns[loc].Geff = Geff;
    G.save(); G.setTab(null);
    const plan = document.querySelector('.plan');
    return {
      crowd: G.crowd(loc),
      anon: plan.querySelectorAll('[data-testid=walker-anon]').length,
      patrol: plan.querySelectorAll('[data-testid=walker-patrol]').length,
      named: plan.querySelectorAll('.fig').length,
      onScreen: plan.querySelectorAll('.fig, .walker').length,
    };
  }, [loc, P, Geff]);
}
const MIN_PATH = 30;
// 每 100ms 取一次 .walker 左上角，共 31 點；回傳每人 { kind, path: 相鄰點距離總和(px), distinct: 出現過的不同座標數 }
const walkPaths = (page) => page.evaluate(() => new Promise((res) => {
  const els = Array.from(document.querySelectorAll('.walker'));
  const tr = els.map(() => []);
  let n = 0;
  const tick = () => {
    els.forEach((e, i) => { const r = e.getBoundingClientRect(); tr[i].push([Math.round(r.left), Math.round(r.top)]); });
    if (++n < 31) return setTimeout(tick, 100);
    res(tr.map((t, i) => {
      let path = 0; for (let k = 1; k < t.length; k++) path += Math.hypot(t[k][0] - t[k - 1][0], t[k][1] - t[k - 1][1]);
      return { kind: els[i].classList.contains('patrol') ? 'patrol' : 'anon', path: Math.round(path), distinct: new Set(t.map((p) => p.join(','))).size };
    }));
  };
  tick();
}));

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

  await fresh(page, base);

  // ===== §6 手算例（AC-D2） =====
  const cases = [
    // [鎮, P, Geff, 預期 Nnamed, 預期 Nanon]（SPEC-01 §6 手算）
    ['huiyao', 80, 1, 3, 6], ['huiyao', 20, 1, 3, 2],
    ['huiyao', 80, 2, 3, 5], ['huiyao', 20, 2, 3, 2],
    ['duyin', 80, 3, 1, 6], ['duyin', 20, 3, 1, 2],
  ];
  const got = {};
  for (const [loc, P, Geff, named, anon] of cases) {
    const r = await setTown(page, loc, P, Geff);
    got[loc + P + '_' + Geff] = r;
    check('[§6] ' + loc + ' P=' + P + ' Geff=' + Geff + '：crowd() Nnamed=' + named + '、Npatrol=' + Geff + '、Nanon=' + anon,
      r.crowd.named === named && r.crowd.patrol === Geff && r.crowd.anon === anon, r.crowd);
    check('[§6] ' + loc + ' P=' + P + ' Geff=' + Geff + '：街上畫出匿名路人 ' + anon + '、巡邏 ' + Geff + '、有職位者 ' + named + '，同屏活動 NPC ≤ 10',
      r.anon === anon && r.patrol === Geff && r.named === named && r.onScreen <= 10 && r.onScreen === named + Geff + anon, r);
  }
  const ratio = (a, b) => got[a].anon / got[b].anon;
  check('[AC-D2] 灰窯 Geff=1：P=20 與 P=80 路人 2 vs 6（比 3 倍，≥ 2）', got.huiyao20_1.anon === 2 && got.huiyao80_1.anon === 6 && ratio('huiyao80_1', 'huiyao20_1') >= 2, { lo: got.huiyao20_1.anon, hi: got.huiyao80_1.anon, ratio: ratio('huiyao80_1', 'huiyao20_1') });
  check('[AC-D2] 灰窯 Geff=2：2 vs 5（比 2.5 倍，仍 ≥ 2）', ratio('huiyao80_2', 'huiyao20_2') === 2.5, ratio('huiyao80_2', 'huiyao20_2'));
  check('[AC-D2] 渡陰 Geff=3、Nnamed=1：2 vs 6（3 倍）', ratio('duyin80_3', 'duyin20_3') === 3, ratio('duyin80_3', 'duyin20_3'));

  // ===== 掃全域：P 0–100、Geff 0–3，兩鎮同屏活動 NPC 恆 ≤ 10、巡邏人數＝Geff =====
  const sweep = await page.evaluate(() => {
    const G = window.SHL; const S = G.state; const bad = []; let n = 0;
    ['huiyao', 'duyin'].forEach((loc) => {
      S.scene = 'town'; S.loc = loc; S.street = null;
      for (let P = 0; P <= 100; P++) for (let g = 0; g <= 3; g++) {
        S.world.towns[loc].P = P; S.world.towns[loc].Geff = g; G.setTab(null); n++;
        const plan = document.querySelector('.plan'); const c = G.crowd(loc);
        const all = plan.querySelectorAll('.fig, .walker').length; const pat = plan.querySelectorAll('.walker.patrol').length;
        const want = Math.min(Math.round(P / 10), 10 - c.named - g);
        if (all > 10 || pat !== g || c.anon !== Math.max(0, want)) bad.push({ loc, P, g, all, pat, anon: c.anon });
      }
    });
    return { n, bad: bad.slice(0, 5) };
  });
  check('[§6 掃描] 兩鎮 P=0..100（步 1）× Geff=0..3 共 ' + sweep.n + ' 組：同屏 ≤ 10、巡邏＝Geff、Nanon 照公式', sweep.bad.length === 0, sweep);

  // ===== crowd() 唯讀：不改世界欄位、不改存檔 =====
  const ro = await page.evaluate(() => {
    const G = window.SHL; const S = G.state;
    const before = JSON.stringify(S.world); G.save(); const raw0 = JSON.stringify(G.readRaw());
    for (let i = 0; i < 20; i++) { G.crowd('huiyao'); G.crowd('duyin'); G.setTab(null); }
    G.save();
    return { same: JSON.stringify(S.world) === before, raw: JSON.stringify(G.readRaw()) === raw0, other: G.crowd('poxiao') };
  });
  check('[§6] crowd() 與街景重繪不改 world、不改存檔；非兩鎮（破曉營）回 null', ro.same && ro.raw && ro.other === null, ro);

  // ===== 巡邏在街上走、路人也在走；重繪不讓人跳回起點 =====
  await setTown(page, 'huiyao', 80, 1);
  // 取樣 3 秒（每 100ms 一點，共 31 點），每人算累計路程；來回走折返、經過起點都不會讓路程變小。
  // 最慢走動者 16px/s → 3 秒約 48px；只有步伐上下 1px 抖動時累計 ≤ 約 12px；門檻 30px 介於兩者之間。
  const walks = await walkPaths(page);
  check('[走動] 灰窯巡邏 3 秒內累計路程 > ' + MIN_PATH + 'px（不是靜止立繪）', walks.length && walks[0].kind === 'patrol' && walks[0].path > MIN_PATH, walks[0]);
  check('[走動] 灰窯 7 個走動者 3 秒內每人累計路程都 > ' + MIN_PATH + 'px', walks.length === 7 && walks.every((w) => w.path > MIN_PATH), walks.map((w) => w.path + 'px/' + w.distinct + '點'));
  // 負向檢查：另開一頁，只在測試頁把第 4 個走動者的路線屬性改壞（walkerStyle 回空 → 原地不動），同一斷言必須抓到它且只抓到它
  {
    const neg = await ctx.newPage();
    await fresh(neg, base); await setTown(neg, 'huiyao', 80, 1);
    await neg.evaluate(() => document.querySelectorAll('.walker')[3].setAttribute('data-plan', 'frozen'));
    await neg.waitForTimeout(200); // 等 rAF 套用凍結後的位置，再開始取樣
    const nw = await walkPaths(neg);
    const caught = nw.map((w, i) => (w.path > MIN_PATH ? -1 : i)).filter((i) => i >= 0);
    check('[走動・負向] 測試頁凍結第 4 個走動者，3 秒累計路程斷言只抓到它（其餘 6 人照走）', nw.length === 7 && caught.length === 1 && caught[0] === 3, nw.map((w) => w.path));
    await neg.close();
  }
  const inPlan = await page.evaluate(() => {
    const pr = document.querySelector('.plan').getBoundingClientRect();
    return Array.from(document.querySelectorAll('.walker')).every((e) => { const r = e.getBoundingClientRect(); return r.left >= pr.left - 1 && r.right <= pr.right + 1 && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1; });
  });
  check('[走動] 走動者都在街景平面圖範圍內', inPlan);
  const cont = await page.evaluate(() => new Promise((res) => {
    const a = Array.from(document.querySelectorAll('.walker')).map((e) => e.getBoundingClientRect().left);
    window.SHL.setTab(null); // 整個中欄 innerHTML 重繪
    requestAnimationFrame(() => { const b = Array.from(document.querySelectorAll('.walker')).map((e) => e.getBoundingClientRect().left); res(a.map((x, i) => Math.abs(x - b[i]))); });
  }));
  check('[走動] 重繪中欄後走動者位置連續（每人跳動 ≤ 4px）', cont.every((d) => d <= 4), cont.map((d) => Math.round(d)));

  // ===== 不擋點擊：有職位者、建築仍可點；建築內與非兩鎮沒有走動者 =====
  const clickable = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.plan .fig, .plan .bld').forEach((e) => {
      const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      out[e.getAttribute('data-testid')] = !!hit && !hit.closest('.walker') && !!hit.closest('[data-testid="' + e.getAttribute('data-testid') + '"]');
    });
    return out;
  });
  check('[不擋點擊] 走動者 pointer-events:none，有職位者與建築中心點都點得到', Object.values(clickable).every(Boolean), clickable);
  await page.click('[data-testid=npc-np_aman]');
  await page.waitForSelector('[data-testid=street-dialog]');
  check('[不擋點擊] 點阿滿開對話框；走動者照樣在（對話框蓋在上面）', await page.evaluate(() => document.querySelectorAll('.walker').length === 7 && getComputedStyle(document.querySelector('.sdlg')).zIndex > getComputedStyle(document.querySelector('.walkers')).zIndex));
  await page.click('[data-testid=btn-street-close]');
  const inside = await page.evaluate(() => { const G = window.SHL; G.setTab('hy_inn'); const n = document.querySelectorAll('.walker').length; G.setTab(null); return n; });
  check('[範圍] 進建築內沒有走動者', inside === 0, inside);
  const px = await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'poxiao'; G.setTab(null); const n = document.querySelectorAll('.walker').length; S.loc = 'huiyao'; G.setTab(null); return n; });
  check('[範圍] 破曉營（非兩鎮，§6 只給兩鎮）沒有新增走動者，維持現況', px === 0, px);

  // ===== 過一天：P 由日結更新後，路人數跟著最新 P、Geff =====
  const day = await page.evaluate(() => {
    const G = window.SHL; const S = G.state; S.world.towns.huiyao.P = 50; S.world.towns.huiyao.Geff = S.world.towns.huiyao.Gnom;
    G._debug.passTime(24); S.scene = 'town'; S.loc = 'huiyao'; S.dead = null; G.setTab(null);
    const t = S.world.towns.huiyao; const c = G.crowd('huiyao');
    return { P: t.P, Geff: t.Geff, c, dom: document.querySelectorAll('.walker.anon').length, pat: document.querySelectorAll('.walker.patrol').length };
  });
  check('[日結] 過一天後街上路人＝min(round(P/10), 10−3−Geff)、巡邏＝Geff（用日結後的值）',
    day.dom === Math.min(Math.round(day.P / 10), 10 - 3 - day.Geff) && day.pat === day.Geff, day);

  // ===== AC-J6：十個活動 NPC 同屏影格不低於現況 =====
  const fps = async (q) => {
    await fresh(page, base, q);
    await setTown(page, 'huiyao', 80, 1);
    await page.waitForTimeout(300);
    return page.evaluate(() => new Promise((res) => {
      const ts = []; const t0 = performance.now();
      const f = (t) => { ts.push(t); if (t - t0 < 3000) requestAnimationFrame(f); else {
        const d = ts.slice(1).map((x, i) => x - ts[i]); d.sort((a, b) => a - b);
        res({ frames: ts.length, fps: Math.round((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000) * 10) / 10, p95ms: Math.round(d[Math.floor(d.length * 0.95)] * 10) / 10, long: d.filter((x) => x > 50).length, onScreen: document.querySelectorAll('.plan .fig, .plan .walker').length });
      } };
      requestAnimationFrame(f);
    }));
  };
  const fBase = await fps('&walk=0'); // 現況：DEV-03 前，只有 3 名有職位者
  const fNew = await fps('');         // 本包：3 有職位者 + 1 巡邏 + 6 路人 = 10
  check('[AC-J6] 十個活動 NPC 同屏（灰窯 P=80、Geff=1）影格不低於現況（容差 5%，無 >50ms 長幀）',
    fNew.onScreen === 10 && fBase.onScreen === 3 && fNew.fps >= fBase.fps * 0.95 && fNew.long === 0, { base: fBase, dev03: fNew });

  // ===== 截圖（1280×720；本包無對應 UI 草稿，對照現況三欄殼） =====
  await fresh(page, base);
  await setTown(page, 'huiyao', 80, 1); await page.waitForTimeout(1200);
  await shot(page, 'dev03-01-huiyao-high-P80.png');
  await setTown(page, 'huiyao', 20, 1); await page.waitForTimeout(1200);
  await shot(page, 'dev03-02-huiyao-low-P20.png');
  await setTown(page, 'huiyao', 50, 2); await page.waitForTimeout(600);
  await shot(page, 'dev03-03-huiyao-patrol-a.png');
  await page.waitForTimeout(1500);
  await shot(page, 'dev03-04-huiyao-patrol-b-1500ms.png');
  await setTown(page, 'duyin', 80, 3); await page.waitForTimeout(1200);
  await shot(page, 'dev03-05-duyin-high-P80-G3.png');
  await setTown(page, 'duyin', 20, 3); await page.waitForTimeout(1200);
  await shot(page, 'dev03-06-duyin-low-P20-G3.png');

  // ===== 合併 DEV-02／DEV-01b 後：名字與險級標頭照舊（只看，不改它們） =====
  await setTown(page, 'huiyao', 80, 1);
  const merged = await page.evaluate(() => {
    const G = window.SHL; const S = G.state; const D = window.SHL_DATA;
    const pn = document.querySelector('[data-testid=pname]');
    const town = { name: S.name && (S.name.sur + S.name.given), shown: pn && pn.textContent, walkers: document.querySelectorAll('.walker').length };
    S.known.chakou = true; S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.loc = 'chakou'; G.enterHere();
    const hr = document.querySelector('[data-testid=head-risk]'); const tier = D.WILDS.chakou.risk;
    return { town, tier, head: hr && hr.textContent, rk: hr && hr.classList.contains('rk' + D.TIME.RISK_TIERS.indexOf(tier)), walkers: document.querySelectorAll('.walker').length };
  });
  check('[合併後] 街景右欄名字（DEV-01b）＝S.name，走動者照樣在', merged.town.name && merged.town.shown === merged.town.name && merged.town.walkers === 7, merged.town);
  check('[合併後] 出鎮到荒野：標頭險級（DEV-02 四檔色 rk0–rk3）與 riskTier 一致，荒野無走動者', merged.head === '險 ' + merged.tier && merged.rk && merged.walkers === 0, merged);
  await shot(page, 'dev03-07-wild-head-risk-chakou.png');

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
