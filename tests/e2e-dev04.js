/* 《山海錄》DEV-04 斷路幫與獸潮連動 — 新增驗收（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e-dev04.js [--shots]
 *   --shots  另存 1280×720 實機截圖至 docs/evidence/shots-shanhailu-dev04-1128/（可用環境變數 SHOTS_DIR 覆寫）
 * 依據：docs/design/batch1/specs/SPEC-01.md v0.4（§4.6、§4.7、§4.8、§4.9、§5.4、§5.6、§5.7、§10 AC-E、AC-A2／A3、AC-D1、AC-J2／J4）、
 *       rollout-plan-v0.1.md 第 115 行（DEV-04）、decisions-producer-1128-1646.md 第 5、6 項、specs/CHANGELOG.md（S4、劫匪掉落）。
 * 既有 tests/e2e.js、tests/e2e-dev02.js 不動斷言；本檔只放 DEV-04 的新斷言。
 * 不在本檔：AC-E7（遇險封頂，DEV-02 已測，本包不重做 R／0.85）；AC-E8 與 S4 重跑（需數值模擬環境，待數值設計師）。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS_DIR ? path.resolve(ROOT, process.env.SHOTS_DIR) : path.join(ROOT, 'docs/evidence/shots-shanhailu-dev04-1128');
const WANT_SHOTS = process.argv.includes('--shots');
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const SEED = 20261127;
const want = (k) => !ONLY.length || ONLY.includes(k);

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
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.005 : eps);
// 版面稽核（照抄 tests/e2e.js 的 audit／check24h）
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
  await audit(page, name);
  if (!WANT_SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('SHOT  ' + path.relative(ROOT, path.join(SHOTS, name)));
}
async function fresh(page, base, opts) {
  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0');
  await page.waitForSelector('[data-testid=town]');
  // 隔離：關獸潮排程（W.next 推遠）；需要時關雜訊（SPEC-01 §10 A 組 NOISE=0）
  await page.evaluate((o) => {
    const G = window.SHL; const S = G.state;
    if (!o || !o.keepTide) { S.world.tide = null; S.world.next = 1e9; }
    if (o && o.noise === false) G._debug.setNoise(false);
    // 測試輔助：逐日日結（S.t 設成該日 00:00 再呼叫 newDay，與 passTime 逐日補算相同）
    window.__days = (n, each) => { const out = []; for (let k = 0; k < n; k++) { const d = G.dayOf(S.t) + 1; S.t = (d - 1) * 1440; if (each) each(d); G._debug.newDay(d); out.push(d); } return out; };
  }, opts || {});
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

  // ===== data.js 同步（S4c：掉落 3–7、賞金 24／36；平民專用） =====
  if (want('data')) {
    await fresh(page, base);
    const d = await page.evaluate(() => { const D = window.SHL_DATA; return { silver: D.ENEMIES.bandit.silver, pool: D.QUEST_GEN.bandit.pool, where: D.QUEST_GEN.where.bandit, how: D.FACTIONS.dawn.how }; });
    check('data.js 劫匪每頭掉落 bandit.silver = [3, 7]（原 8–20）', JSON.stringify(d.silver) === '[3,7]', d.silver);
    check('data.js 剿匪委託賞金 ×2 = 24、×4 = 36（v0.2 為 36／76）', JSON.stringify(d.pool) === '[["bandit",2,24],["bandit",4,36]]', d.pool);
    check('data.js 劫匪委託地點「野徑一帶」', d.where === '野徑一帶', d.where);
    check('破曉軍團「如何漲聲望」加上資助巡邏（§11）', d.how.includes('資助巡邏'), d.how);
    // 實戰掉落：打 300 場單一劫匪，戰利品銀兩落在 3–7
    const drop = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; let lo = 99, hi = -1; const seen = {};
      for (let k = 0; k < 300; k++) {
        G._debug.startCombat(['bandit'], { type: 'wild', node: 'chakou' }, {});
        G._debug.killEnemy(S.combat.enemies[0]); G._debug.victory();
        const s = S.loot.silver; lo = Math.min(lo, s); hi = Math.max(hi, s); seen[s] = 1;
        S.loot = null; S.combat = null; S.scene = 'town'; S.hp = G.maxHp(); S.fat = 0;
      }
      return { lo, hi, vals: Object.keys(seen).map(Number).sort((a, b) => a - b) };
    });
    check('實戰：擊敗 1 名劫匪掉銀 3–7 兩（300 場：最小 3、最大 7）', drop.lo === 3 && drop.hi === 7 && drop.vals.join() === '3,4,5,6,7', drop);
  }

  // ===== AC-E1、E2：剿匪降匪勢與人手；之後 10 天匪勢 =====
  if (want('e1')) {
    await fresh(page, base, { noise: false });
    const r = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region;
      const r0 = { B: R.B, crew: R.crew };
      G._debug.startCombat(['bandit', 'bandit', 'bandit', 'bandit'], { type: 'wild', node: 'chakou' }, {});
      S.combat.enemies.forEach((e) => G._debug.killEnemy(e));
      const r1 = { B: R.B, crew: R.crew, risk: G.riskR(true) };
      S.combat = null; S.scene = 'town';
      return { r0, r1 };
    });
    check('起手 B = 30、crew = 4（§3.2）', r.r0.B === 30 && r.r0.crew === 4, r.r0);
    check('AC-E1 起手殺 4 名劫匪：B 30 → 20、crew 4 → 2（立即，不等日結）', r.r1.B === 20 && r.r1.crew === 2, r.r1);
    check('剿匪後 R_wild 隨新 B 變動（DEV-02 的 R 只接輸入，未重做）：B=20、Ō=57.5 → 0.88', near(r.r1.risk, 0.88, 1e-9), r.r1.risk);
    const e3 = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const W = S.world;
      W.region.B = 45; W.towns.huiyao.O = 50; W.towns.duyin.O = 50; S.loc = 'huiyao'; S.t = 22 * 60;
      const p = G.travelPreview('chakou'); return { R: p.R, risk: p.risk };
    });
    check('AC-E3 B=45、Ō=50 時夜間野徑單段 0.22 × 1.255 × 2 = 0.552（R 由 DEV-02 套用，本包只供 B／O）', near(e3.R, 1.255, 1e-9) && near(e3.risk, 0.5522, 1e-9), e3);
    // E2：重開局，逐日記錄 B 與 crew
    await fresh(page, base, { noise: false });
    const ser = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region;
      for (let k = 0; k < 4; k++) G._debug.banditKilled();
      const Bs = [], crews = [];
      for (let k = 0; k < 10; k++) { window.__days(1); Bs.push(R.B); crews.push(R.crew); }
      return { Bs, crews, mean: Bs.reduce((a, b) => a + b, 0) / Bs.length };
    });
    check('AC-E2 其後 10 天（不再殺）B 平均約 21、至少比起手低 3', ser.mean >= 19 && ser.mean <= 23 && ser.mean <= 27, ser);
    check('AC-E2 第 5 天 crew 回補到 3、之後 B 往 B* = 25 爬（每日 ≤ 10%）', ser.crews[3] === 2 && ser.crews[4] === 3 && ser.Bs[9] > ser.Bs[5] && ser.Bs[9] < 25, ser);
  }

  // ===== AC-E4、重生：殺滿 crew、據點被端一次、盤踞傳聞歸零、人手回補與旗標復位 =====
  if (want('wipe')) {
    await fresh(page, base, { noise: false });
    const w = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region; const D = window.SHL_DATA;
      const out = {};
      const rep0 = G.repOf('dawn');
      for (let k = 0; k < 7; k++) G._debug.banditKilled();
      out.before = { crew: R.crew, wiped: R.crewWiped, rep: G.repOf('dawn') - rep0 };
      G._debug.banditKilled();
      out.at0 = { crew: R.crew, wiped: R.crewWiped, rep: G.repOf('dawn') - rep0, B: R.B, log: S.log.some((l) => /斷路幫的據點被端了/.test(l.text)) };
      G._debug.banditKilled(); G._debug.banditKilled();
      out.after = { crew: R.crew, B: R.B, rep: G.repOf('dawn') - rep0 };
      out.guardW0 = G._debug.truthW(D.RUMOR.truth);
      // 已存在的盤踞傳聞，查探視為「已被取走」
      S.rumors = []; const r = G._debug.addRumor('cache', 'chakou', 'guard'); S.loc = 'chakou'; S.scene = 'wild';
      out.live = G._debug.liveTruth(r);
      G.investigate(r.id);
      out.inv = { text: S.event && S.event.dyn.text, left: S.rumors.some((x) => x.id === r.id) };
      S.event = null; S.scene = 'town'; S.loc = 'huiyao';
      // 重生：每 5 天 +1，crew ≥ 1 時旗標復位
      const crews = [], flags = [];
      for (let k = 0; k < 25; k++) { window.__days(1); crews.push(R.crew); flags.push(R.crewWiped); }
      out.crews = crews; out.flags = flags;
      out.guardW4 = G._debug.truthW(D.RUMOR.truth).guard;
      // 復位後再次殺滿：再發一次獎勵
      const rep1 = G.repOf('dawn');
      for (let k = 0; k < 8; k++) G._debug.banditKilled();
      out.again = { crew: R.crew, wiped: R.crewWiped, rep: G.repOf('dawn') - rep1 };
      return out;
    });
    check('殺到 crew 0.5：尚未觸發據點被端', w.before.crew === 0.5 && !w.before.wiped && w.before.rep === 0, w.before);
    check('AC-E4 crew 降到 0：觸發一次「據點被端」、破曉聲望 +2、日誌', w.at0.crew === 0 && w.at0.wiped && w.at0.rep === 2 && w.at0.log === true, w.at0);
    check('AC-C4 前段：crew 0 後再殺不再發獎勵、B／crew 不為負', w.after.crew === 0 && w.after.B >= 0 && w.after.rep === 2, w.after);
    check('AC-E4 crew 0：「有人盤踞」傳聞權重 0，其餘四種權重不變', w.guardW0.guard === 0 && w.guardW0.true === 30 && w.guardW0.strong === 15 && w.guardW0.gone === 15 && w.guardW0.bait === 15, w.guardW0);
    check('AC-E4 crew < 1：已存在的盤踞傳聞查探視為「已被取走」', w.live === 'gone' && /來晚了/.test(w.inv.text || '') && !w.inv.left, w.inv);
    check('重生：人手每 5 天 +1，回補到上限 4 後不再長（Ō ≥ 40）', w.crews[4] === 1 && w.crews[9] === 2 && w.crews[14] === 3 && w.crews[19] === 4 && w.crews[24] === 4 && w.crews[3] === 0, w.crews);
    check('重生：crew 回到 ≥ 1 時 crewWiped 復位', w.flags[3] === true && w.flags[4] === false, w.flags.slice(0, 6));
    check('重生後盤踞傳聞權重回到 25（＝現況）', w.guardW4 === 25, w.guardW4);
    check('復位後再次殺滿：再觸發一次據點被端（+2）', w.again.crew === 0 && w.again.wiped && w.again.rep === 2, w.again);
    // crewCap：昨日 Ō < 40 → 6；超過上限每 5 天 −1
    const cap = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region; const T = S.world.towns;
      R.crew = 4; R.crewCtr = 0; const low = [];
      for (let k = 0; k < 10; k++) { T.huiyao.O = 30; T.duyin.O = 30; window.__days(1); low.push(R.crew); }
      T.huiyao.O = 55; T.duyin.O = 60; const high = [];
      for (let k = 0; k < 10; k++) { window.__days(1); high.push(R.crew); }
      return { low, high };
    });
    check('crewCap：昨日 Ō < 40 時上限 6（5 天 +1）；回到 Ō ≥ 40 後超過上限每 5 天 −1', cap.low[4] === 5 && cap.low[9] === 6 && cap.high[4] === 5 && cap.high[9] === 4, cap);
  }

  // ===== §5.6 匪勢日結：起手固定點、用昨日 Ō／P̄ =====
  if (want('region')) {
    await fresh(page, base, { noise: false });
    const g = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region; const T = S.world.towns;
      window.__days(3); const fix = { B: R.B, crew: R.crew, ctr: R.crewCtr };
      // 治安崩：Ō = 20 → B* = 30 − 0.5×(20 − 57.5) − … ；B 每日最多 +3
      T.huiyao.O = 20; T.duyin.O = 20; const B0 = R.B;
      window.__days(1); const up = R.B - B0;
      // 治安太好：Ō = 100 → 0.5×max(0, Ō − 80) 項把 B* 拉回
      return { fix, up };
    });
    check('起手是固定點：3 天日結後 B 仍 30、crew 4（無事件無雜訊）', g.fix.B === 30 && g.fix.crew === 4 && g.fix.ctr === 3, g.fix);
    check('§5.6 B 每日向 B* 靠攏 10%、上限 ±3（Ō 20 → B* 48.75，B +1.875）', near(g.up, 1.875, 0.011), g.up);
  }

  // ===== §4.9 委託與傳聞權重：AC-E5 =====
  if (want('quest')) {
    await fresh(page, base);
    const q = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region;
      const rate = (B, n) => { R.B = B; let hit = 0, x4 = 0; for (let d = 1; d <= n; d++) { const r = G._debug.banditDraw('huiyao', d, 0); if (r) { hit++; if (r[1] === 4) x4++; } } return { p: hit / n, x4: hit ? x4 / hit : 0, P: G.banditQuestP() }; };
      return { b60: rate(60, 2000), b30: rate(30, 2000), b20: rate(20, 2000), b90: rate(90, 200) };
    });
    check('AC-E5 B = 60：kill 類改劫匪題約 50%（2000 抽，±3pp）', near(q.b60.p, 0.5, 0.03) && q.b60.P === 0.5, q.b60);
    check('AC-E5 B = 30：約 12.5%（2000 抽，±3pp）', near(q.b30.p, 0.125, 0.03) && q.b30.P === 0.125, q.b30);
    check('B ≤ 20 不出劫匪題；B 再高也封頂 50%；×2／×4 各半', q.b20.p === 0 && q.b90.P === 0.5 && near(q.b60.x4, 0.5, 0.05), { b20: q.b20, b90: q.b90.P, x4: q.b60.x4 });
    const k = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const D = window.SHL_DATA; const T = S.world.towns;
      // deliver 權重 20 × clamp(P/50, 0.4, 1.6)：用 genQuests 的實際結果看比例（P 80 vs 20）
      const share = (P) => { T.huiyao.P = P; let del = 0, all = 0; for (let d = 1; d <= 400; d++) { S.quests = S.quests.filter((x) => x.fixed); S.t = (d - 1) * 1440 + 8 * 60; G._debug.genQuests(); S.quests.filter((x) => x.town === 'huiyao' && !x.fixed).forEach((x) => { all++; if (x.kind === 'deliver') del++; }); } return del / all; };
      const hi = share(80), lo = share(20);
      // 板上出現劫匪題：題名、地點、賞金
      S.world.region.B = 60; let bq = null;
      for (let d = 500; d < 700 && !bq; d++) { S.quests = S.quests.filter((x) => x.fixed); S.t = (d - 1) * 1440 + 8 * 60; G._debug.genQuests(); bq = S.quests.find((x) => x.kind === 'kill' && x.enemy === 'bandit' && x.town === 'huiyao'); }
      const out = { hi, lo, bq: bq && { title: bq.title, reward: bq.reward, need: bq.need, where: G.questWhere(bq) } };
      // 接下並剿匪：委託完成、B 降
      if (bq) {
        S.loc = 'huiyao'; S.scene = 'town'; S.townTab = 'hy_board'; G.questAct(bq.id);
        const B0 = S.world.region.B;
        G._debug.startCombat(Array(bq.need).fill('bandit'), { type: 'wild', node: 'chakou' }, {});
        S.combat.enemies.forEach((e) => G._debug.killEnemy(e)); S.combat = null; S.scene = 'town';
        out.done = { status: bq.status, dB: S.world.region.B - B0 };
      }
      return out;
    });
    check('§4.9 委託板 deliver 權重隨繁榮：P 80 的送貨占比高於 P 20', k.hi > k.lo + 0.08, { P80: k.hi, P20: k.lo });
    check('委託板出現「獵殺劫匪」題：地點「野徑一帶」，×2 賞 24、×4 賞 36', !!k.bq && /^獵殺劫匪 ×[24]$/.test(k.bq.title) && k.bq.where === '野徑一帶' && ((k.bq.need === 2 && k.bq.reward === 24) || (k.bq.need === 4 && k.bq.reward === 36)), k.bq);
    check('接下劫匪題並剿匪：委託達成、每殺 1 名 B −2.5', !!k.done && k.done.status === 'done' && near(k.done.dB, -2.5 * k.bq.need, 1e-9), k.done);
    const rw = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region; const D = window.SHL_DATA;
      const w = (c) => { R.crew = c; return G._debug.truthW(D.RUMOR.truth).guard; };
      const res = { c4: w(4), c2: w(2), c6: w(6), c0: w(0) };
      // 實際聽傳聞：crew 0 時 300 則沒有「有人盤踞」，crew 4 時有
      const listen = (c) => { let g = 0; for (let k = 0; k < 300; k++) { R.crew = c; S.rumors = []; S.freeRumor = {}; S.loc = 'huiyao'; S.scene = 'town'; S.townTab = 'hy_inn'; S.silver = 999; S.hp = G.maxHp(); S.food = 100; S.fat = 0; G.hearRumor(); const r = S.rumors[S.rumors.length - 1]; if (r && r.truth === 'guard') g++; } return g; };
      res.l0 = listen(0); res.l4 = listen(4);
      return res;
    });
    check('§4.9 盤踞傳聞權重 25 × min(crew, 4)/4：crew 4 → 25（＝現況）、2 → 12.5、6 → 25、0 → 0', rw.c4 === 25 && rw.c2 === 12.5 && rw.c6 === 25 && rw.c0 === 0, rw);
    check('實際打聽 300 則：crew 0 沒有盤踞傳聞、crew 4 有（能發現）', rw.l0 === 0 && rw.l4 > 30, { crew0: rw.l0, crew4: rw.l4 });
  }

  // ===== §5.4 獸潮連動：AC-A3、受創、擊退、AC-E6、目標鎮權重 =====
  if (want('tide')) {
    await fresh(page, base, { noise: false });
    const a3 = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const W = S.world; const T = W.towns;
      W.tide = { town: 'huiyao', start: 2, end: 3, kills: 0, need: 4 }; W.next = 1e9;
      window.__days(1); const d1 = { P: T.huiyao.P, O: T.huiyao.O, why: T.huiyao.brief.whyCode, Pd: T.duyin.P };
      window.__days(1); const d2 = { P: T.huiyao.P, O: T.huiyao.O };
      return { d1, d2 };
    });
    check('AC-A3 灰窯獸潮開始日、次日：P 48.00 → 46.16；O 54.00 → 53.06（因果 WHY_TIDE）', near(a3.d1.P, 48) && near(a3.d2.P, 46.16) && near(a3.d1.O, 54) && near(a3.d2.O, 53.06) && a3.d1.why === 'WHY_TIDE' && a3.d1.Pd === 45, a3);
    const rs = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const W = S.world; const T = W.towns;
      const out = {};
      // 玩家殺滿 → 擊退：當日 +3／+2
      W.tide = { town: 'huiyao', start: 10, end: 11, kills: 4, need: 4 }; W.hurt = {}; S.quests.push({ id: 'tide10', town: 'huiyao', kind: 'tide', need: 4, prog: 4, status: 'active', title: '擊退獸潮', reward: 50 });
      S.t = 11 * 1440; G._debug.worldTick(12); out.repel = G._debug.tideDelta('huiyao', 12); out.repelQ = (S.quests.find((x) => x.id === 'tide10') || {}).status;
      G._debug.townTick(12); out.repelWhy = T.huiyao.brief.whyCode; out.after = G._debug.tideDelta('huiyao', 12);
      // 沒殺滿、沒擋下 → 受創：灰窯（Geff 1）2 天，渡陰（Geff 2）1 天
      const fail = (town, g) => { for (let d = 100; d < 400; d++) { W.tide = { town, start: d - 2, end: d - 1, kills: 0, need: 4 }; W.hurt = {}; W.next = 1e9; T[town].Geff = g; S.quests = S.quests.filter((x) => x.kind !== 'tide'); S.t = (d - 1) * 1440; G._debug.worldTick(d); if (W.hurt[town]) return { d, days: W.hurt[town] - d + 1, td: G._debug.tideDelta(town, d) }; } return null; };
      out.hy = fail('huiyao', 1); out.dy = fail('duyin', 2);
      // AC-E6：自衛擊退比例（wrnd，不吃 S.rng）
      const rate = (town, g, n) => { let rep = 0; const rng0 = S.rng; for (let d = 1000; d < 1000 + n; d++) { W.tide = { town, start: d - 2, end: d - 1, kills: 0, need: 4 }; W.hurt = {}; W.next = 1e9; T[town].Geff = g; S.quests = S.quests.filter((x) => x.kind !== 'tide'); S.t = (d - 1) * 1440; G._debug.worldTick(d); if (!W.hurt[town]) rep++; } return rep / n; };
      const r0 = G._debug.rnd();
      out.e6 = { hy1: rate('huiyao', 1, 400), dy2: rate('duyin', 2, 400), g0: rate('huiyao', 0, 200), g3: rate('duyin', 3, 400) };
      T.huiyao.Geff = 1; T.duyin.Geff = 2;
      // 目標鎮權重：w = 1 + max(0, O − 80)/20
      const share = (Oh, Od) => { T.huiyao.O = Oh; T.duyin.O = Od; let h = 0; for (let d = 1; d <= 1200; d++) if (G._debug.tideTarget(d) === 'huiyao') h++; return h / 1200; };
      out.tw = { eq: share(55, 60), hi: share(100, 60), both: share(100, 100) };
      return out;
    });
    check('§5.4 玩家殺滿：擊退當日該鎮 ΔP +3、ΔO +2、委託可領、因果 WHY_REPEL', rs.repel.p === 3 && rs.repel.o === 2 && rs.repelQ === 'done' && rs.repelWhy === 'WHY_REPEL' && rs.after.p === 0, rs);
    check('§4.7 受創天數：灰窯（Geff 1）2 天、渡陰（Geff 2）1 天；受創日 ΔP −2、ΔO −1', rs.hy && rs.hy.days === 2 && rs.dy && rs.dy.days === 1 && rs.hy.td.p === -2 && rs.hy.td.o === -1 && rs.dy.td.p === -2 && rs.dy.td.o === -1, { hy: rs.hy, dy: rs.dy });
    check('AC-E6 灰窯 Geff 1 不殺獸：自衛擊退約 30%（400 次，±8pp）', near(rs.e6.hy1, 0.30, 0.08), rs.e6);
    check('P_DEF：渡陰 Geff 2 約 55%、Geff 3 約 80%、Geff 0 為 0（±8pp）', near(rs.e6.dy2, 0.55, 0.08) && near(rs.e6.g3, 0.80, 0.08) && rs.e6.g0 === 0, rs.e6);
    check('§4.7 目標鎮權重：兩鎮 O ≤ 80 各半；灰窯 O 100 → 約 2/3；兩鎮皆 100 → 各半（±5pp）', near(rs.tw.eq, 0.5, 0.05) && near(rs.tw.hi, 2 / 3, 0.05) && near(rs.tw.both, 0.5, 0.05), rs.tw);
  }

  // ===== §4.6／§5.7 資助巡邏：AC-A2、聲望上限、Fcap、E3、只在委託板 =====
  if (want('aid')) {
    await fresh(page, base, { noise: false });
    await page.click('[data-testid=bld-hy_board]');
    await page.waitForSelector('[data-testid=aid-card]');
    const s0 = await page.evaluate(() => ({ silver: window.SHL.state.silver, rep: window.SHL.repOf('dawn') }));
    await page.click('[data-testid=aid-50]'); // 開局 60 兩：先捐 50
    const s1 = await page.evaluate(() => { const S = window.SHL.state; return { silver: S.silver, F: S.world.towns.huiyao.F, rep: window.SHL.repOf('dawn'), sub: document.querySelector('[data-testid=aid-sub]').textContent, dis100: document.querySelector('[data-testid=aid-100]').disabled }; });
    check('委託板「資助巡邏」：點 50 兩 → 銀兩 −50、F +50、破曉聲望 +0.5（即時，不等日結）', s1.silver === s0.silver - 50 && s1.F === 50 && near(s1.rep - s0.rep, 0.5, 1e-9) && /指定軍費 50／500/.test(s1.sub), s1);
    check('銀兩不夠時 100 兩鈕灰掉', s1.dis100 === true, s1);
    await shot(page, 'dev04-03-aid-patrol.png');
    // AC-A2（重開，捐 100）
    await fresh(page, base, { noise: false });
    const a2 = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const T = S.world.towns;
      S.silver = 500; G.setTab('hy_board'); G.aidPatrol(100);
      const F0 = T.huiyao.F; const Os = [], Fs = [], left = [], Geff = [];
      for (let k = 0; k < 5; k++) { window.__days(1); Os.push(T.huiyao.O); Fs.push(T.huiyao.F); left.push(T.huiyao.brief.aidDaysLeft); Geff.push(T.huiyao.Geff); }
      return { F0, Os, Fs, left, Geff, silver: S.silver };
    });
    check('AC-A2 灰窯資助 100 兩後逐日 O：56.00、56.90、57.71（±0.01）', near(a2.Os[0], 56, 0.01) && near(a2.Os[1], 56.9, 0.01) && near(a2.Os[2], 57.71, 0.01), a2.Os);
    check('AC-A2 F 日 4 後 = 0；加派 4 天（Geff 2）後回 1', a2.F0 === 100 && a2.Fs[3] === 0 && a2.Geff.join() === '2,2,2,2,1', { Fs: a2.Fs, Geff: a2.Geff });
    check('AC-A7（資助段）brief.aidDaysLeft 日 1–5 為 4／3／2／1／0', a2.left.join() === '4,3,2,1,0', a2.left);
    const cap = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const T = S.world.towns;
      S.silver = 5000; S.loc = 'huiyao'; S.scene = 'town'; G.setTab('hy_board'); T.huiyao.F = 0; S.world.aidRep = null;
      const rep = () => G.repOf('dawn'); const r0 = rep(); const out = {};
      G.aidPatrol(200); out.a = rep() - r0; G.aidPatrol(200); out.b = rep() - r0; G.aidPatrol(50); out.c = rep() - r0;
      out.F = T.huiyao.F; const s0 = S.silver; G.aidPatrol(100); out.took = s0 - S.silver; out.F2 = T.huiyao.F;
      const s1 = S.silver; G.aidPatrol(50); out.full = s1 - S.silver;
      G.aidPatrol(77); out.odd = T.huiyao.F;
      window.__days(1); S.loc = 'huiyao'; S.scene = 'town'; G.setTab('hy_board'); T.huiyao.F = 0;
      const r1 = rep(); G.aidPatrol(100); out.next = rep() - r1;
      // E3：Gnom = 3 → 收不下
      T.huiyao.Gnom = 3; const s2 = S.silver; G.aidPatrol(100); out.e3 = { paid: s2 - S.silver, can: G.aidInfo().can }; T.huiyao.Gnom = 1;
      // 渡陰的委託板（破曉募兵處）也能資助；破曉營沒有鎮財庫，不出現
      S.loc = 'duyin'; G.setTab('dy_board'); const fd = T.duyin.F; G.aidPatrol(50); out.dy = T.duyin.F - fd;
      S.loc = 'poxiao'; G.setTab('px_board'); out.px = G.aidInfo();
      S.loc = 'huiyao'; G.setTab('hy_market'); out.mk = G.aidInfo();
      return out;
    });
    check('§4.6 資助聲望 +N/100、每日合計 ≤ 3：200→+2、再 200→+3、再 50→仍 +3；隔天重算', cap.a === 2 && cap.b === 3 && cap.c === 3 && cap.next === 1, cap);
    check('§5.7 Fcap 500：F 450 時捐 100 只收 50；滿了再捐不收', cap.F === 450 && cap.took === 50 && cap.F2 === 500 && cap.full === 0, cap);
    check('只收 50／100／200 兩三種單位', cap.odd === 500, cap.odd);
    check('E3 駐軍已最高一檔（Gnom 3）：資助收不下、不扣錢', cap.e3.paid === 0 && cap.e3.can === false, cap.e3);
    check('渡陰破曉募兵處可資助；破曉營與非委託板建築沒有資助', cap.dy === 50 && cap.px === null && cap.mk === null, { dy: cap.dy, px: cap.px, mk: cap.mk });
    check('投資巡邏所（Lpat）不在第一批：資助不動 Lpat', await page.evaluate(() => window.SHL.state.world.towns.huiyao.Lpat === 0 && window.SHL.state.world.towns.duyin.Lpat === 0));
  }

  // ===== AC-D1、AC-J4（完整：有／無資助的獸潮日程）、AC-J2 =====
  if (want('ab')) {
    const run = async (aid) => {
      await fresh(page, base, { keepTide: true });
      return page.evaluate((aid) => {
        const G = window.SHL; const S = G.state; const T = S.world.towns;
        S.silver = 99999;
        const tides = []; let O3 = null;
        for (let d = 0; d < 40; d++) {
          if (aid && d % 10 === 0) { S.loc = 'huiyao'; S.scene = 'town'; G.setTab('hy_board'); G.aidPatrol(100); S.loc = 'duyin'; G.setTab('dy_board'); G.aidPatrol(100); S.loc = 'huiyao'; G.setTab(null); }
          G._debug.passTime(24);
          if (d === 2) O3 = T.huiyao.O;
          if (S.world.tide && !tides.some((x) => x[0] === S.world.tide.start)) tides.push([S.world.tide.start, S.world.tide.end, S.world.tide.town]);
          S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.dead = null;
        }
        return { tides, O3, hurt: Object.assign({}, S.world.hurt) };
      }, aid);
    };
    const A = await run(false), B = await run(true);
    check('AC-D1 同 seed 同日：資助 100 兩 vs 無資助，第 3 天日結後灰窯治安差 ≥ +2', B.O3 - A.O3 >= 2, { no: A.O3, aid: B.O3, diff: Math.round((B.O3 - A.O3) * 100) / 100 });
    check('AC-J4 同 seed 有／無資助：40 天內獸潮開始日、結束日、目標鎮完全相同', A.tides.length >= 4 && JSON.stringify(A.tides) === JSON.stringify(B.tides), { no: A.tides, aid: B.tides });
    await fresh(page, base);
    const j2 = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const R = S.world.region;
      for (let k = 0; k < 3; k++) G._debug.banditKilled();
      S.silver = 999; G.setTab('hy_board'); G.aidPatrol(100);
      window.__days(2);
      const before = JSON.stringify({ region: S.world.region, aidRep: S.world.aidRep, towns: S.world.towns });
      G.save(); const raw = G.readRaw().state;
      return { same: JSON.stringify({ region: raw.world.region, aidRep: raw.world.aidRep, towns: raw.world.towns }) === before, region: raw.world.region };
    });
    check('AC-J2 存檔：region（B、crew、crewCtr、crewWiped）與資助聲望計數存檔一致', j2.same && j2.region.crew === 2.5, j2.region);
    await page.goto(base + 'index.html?seed=' + SEED + '&fx=0');
    await page.waitForSelector('[data-testid=town], [data-testid=wild], [data-testid=map]', { timeout: 5000 }).catch(() => {});
    const j2b = await page.evaluate(() => window.SHL.state.world.region);
    check('AC-J2 讀檔：region 讀回不變', JSON.stringify(j2b) === JSON.stringify(j2.region), j2b);
  }

  // ===== 截圖（1280×720）：發現（盤踞傳聞查探）、遭遇／剿匪、資助巡邏（已在 aid 段） =====
  if (want('shots')) {
    await fresh(page, base);
    await page.evaluate(() => {
      const G = window.SHL; const S = G.state;
      S.rumors = []; G._debug.addRumor('cache', 'chakou', 'guard');
      S.loc = 'chakou'; S.scene = 'map'; G.enterHere();
    });
    await page.waitForSelector('[data-testid=rumor-here]');
    await shot(page, 'dev04-00-rumor-at-site.png');
    await page.click('[data-testid=btn-investigate]');
    await page.waitForSelector('[data-testid=ev-r_fight]');
    await shot(page, 'dev04-01-discover-guard.png');
    await page.click('[data-testid=ev-r_fight]');
    await page.waitForSelector('[data-testid=combat]');
    const n = await page.evaluate(() => window.SHL.state.combat.enemies.filter((e) => e.id === 'bandit').length);
    check('查探盤踞傳聞「動手搶」→ 與 2 名劫匪開戰', n === 2, n);
    await page.click('[data-testid=act-attack]'); await page.waitForTimeout(300);
    await shot(page, 'dev04-02-bandit-combat.png');
    const k = await page.evaluate(() => { const G = window.SHL; const S = G.state; const B0 = S.world.region.B; S.combat.enemies.forEach((e) => { if (e.hp > 0) G._debug.killEnemy(e); }); G._debug.victory(); G.save(); G.setProfTab(S.profTab); return { dB: S.world.region.B - B0, crew: S.world.region.crew, silver: S.loot && S.loot.silver }; });
    check('剿滅傳聞現場的 2 名劫匪：B −5、crew −1', near(k.dB, -5, 1e-9) && k.crew === 3, k);
    await page.waitForTimeout(200);
    await shot(page, 'dev04-04-loot.png');
  }

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
