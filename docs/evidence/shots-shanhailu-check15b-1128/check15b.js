/* shanhailu-check15b-1128 一次性獨立驗收腳本（不改遊戲程式、不改既有測試）
 * 用法：node docs/evidence/shots-shanhailu-check15b-1128/check15b.js
 * 1) preview risk == travel() 遇襲判定 risk，並與本腳本「獨立重算」的公式值比對（逐 30 分鐘掃一整天）
 * 2) 輕功（腳力 25「野徑遇險 −20%」）：委託單 questTier／baseRouteTier 不變；preview＝無輕功×0.8；roll 同值
 * 3) 對照值（灰窯、R=1、晴、無獸潮）briefDanger：清晨 0.375 高／白天 0.300 中／黃昏 0.450 高／黑夜 0.600 極高（含畫面）
 * 4) DEV-04／DEV-03 並存：劫匪攔路、無剿匪單／鈕、獸潮 ×1.5、路人／巡邏在走
 * 5) 1280×720 截圖
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const OUT = __dirname;
const SEED = 20261127;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const srvP = new Promise((res) => {
  const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }); s.listen(0, '127.0.0.1', () => res(s));
});
let fails = 0;
function check(n, ok, d) { if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d === undefined ? '' : '  — ' + JSON.stringify(d))); }
const shot = async (page, n) => { await page.screenshot({ path: path.join(OUT, n), clip: { x: 0, y: 0, width: 1280, height: 720 } }); console.log('SHOT  ' + n); };

// 每個 evaluate 前的共用重置：R=1、無獸潮、灰窯、輕裝
const RESET = `(() => { const G = window.SHL, D = window.SHL_DATA, S = G.state, W = S.world;
  W.tide = null; W.next = G.dayOf(S.t) + 999; W.region.B = D.WORLD.B_REF; Object.keys(W.towns).forEach((k) => (W.towns[k].O = D.WORLD.O_MEAN));
  S.loc = 'huiyao'; S.scene = 'map'; S.combat = null; S.event = null; S.dead = null; S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.prof.jiao.lv = 0; })`; // 腳力歸零：連續趕路會累積到 25 級觸發輕功（首跑時 23:30 那趟因此 0.48）

(async () => {
  const srv = await srvP; const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  const fresh = async () => { await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter&fx=0'); await page.waitForSelector('[data-testid=town]'); };
  await fresh();

  // ===== 1. preview == roll == 獨立重算（逐 30 分掃 24h，含清晨、黃昏、黃昏→黑夜、黑夜→清晨、清晨→白天） =====
  const sweep = await page.evaluate((RESET) => {
    const G = window.SHL, D = window.SHL_DATA, S = G.state; const reset = eval(RESET);
    // 獨立實作 w（不呼叫遊戲的 phaseOf／walkMult）
    const w = (t) => { const m = ((t % 1440) + 1440) % 1440; return m >= 300 && m < 480 ? 0.25 : m >= 480 && m < 1020 ? 0 : m >= 1020 && m < 1200 ? 0.5 : 1.0; };
    const d0 = Math.floor(S.t / 1440) * 1440 + 1440; const rows = [];
    for (let k = 0; k < 48; k++) {
      reset(); S.t = d0 + k * 30;
      const p = G.travelPreview('qingwu');
      let sw = 0; for (let m = 0; m < p.hours * 60; m++) sw += w(S.t + m); const meanW = sw / (p.hours * 60);
      const base = p.edges.some((e) => !e.road) ? (p.edges.length > 1 ? 0.3 : 0.22) : 0.04;
      const expect = Math.min(0.85, base * (1 + meanW) * 1 /*晴*/ * p.R);
      G._debug.HOOKS.lastEncRisk = null; S.dest = 'qingwu'; G.travel();
      rows.push({ hhmm: String(Math.floor(k / 2)).padStart(2, '0') + ':' + (k % 2 ? '30' : '00'), hours: p.hours, R: p.R, meanW, preview: p.risk, roll: G._debug.HOOKS.lastEncRisk, expect, tier: p.riskName });
    }
    return rows;
  }, RESET);
  sweep.forEach((r) => console.log('      ' + JSON.stringify(r)));
  check('[preview==roll] 24h×每 30 分（48 趟灰窯→青霧）：preview.risk 與 travel() 遇襲判定 risk 完全相等', sweep.every((r) => r.roll === r.preview));
  const bad = sweep.filter((r) => !(Math.abs(r.preview - r.expect) < 1e-9 && r.R === 1));
  check('[preview==獨立重算] 48 趟皆等於 risk_base×(1+逐分鐘平均 w)×wxRisk×R（誤差 <1e-9）', sweep.every((r) => Math.abs(r.preview - r.expect) < 1e-9 && r.R === 1), bad);
  const at = (h) => sweep.find((r) => r.hhmm === h);
  check('[清晨出發 06:00] 0.375 高、preview==roll', at('06:00').roll === at('06:00').preview && Math.abs(at('06:00').preview - 0.375) < 1e-9 && at('06:00').tier === '高', at('06:00'));
  check('[黃昏出發 17:00] 0.45 高、preview==roll', at('17:00').roll === at('17:00').preview && Math.abs(at('17:00').preview - 0.45) < 1e-9 && at('17:00').tier === '高', at('17:00'));
  check('[黃昏→黑夜 19:00] mean(w)=0.75 → 0.525、preview==roll', at('19:00').roll === at('19:00').preview && Math.abs(at('19:00').preview - 0.525) < 1e-9, at('19:00'));
  check('[黃昏→黑夜 19:30] mean(w)=0.875 → 0.5625、preview==roll', at('19:30').roll === at('19:30').preview && Math.abs(at('19:30').preview - 0.5625) < 1e-9, at('19:30'));
  check('[黑夜→清晨 04:00] mean(w)=0.625 → 0.4875（不再是出發當下 isNight×2=0.60）', Math.abs(at('04:00').preview - 0.4875) < 1e-9 && at('04:00').roll === at('04:00').preview, at('04:00'));
  check('[白天→黃昏 16:00] mean(w)=0.25 → 0.375（不再是出發當下 isNight 白天 ×1=0.30）', Math.abs(at('16:00').preview - 0.375) < 1e-9, at('16:00'));
  check('[非 isNight×2] 黃昏 18:00 出發 roll=0.45（舊 isNight 判定會是 0.30）', Math.abs(at('18:00').roll - 0.45) < 1e-9, at('18:00'));

  // 單段野徑（0.22）與官道（0.04）也走同一函式
  const other = await page.evaluate((RESET) => {
    const G = window.SHL, S = G.state; const reset = eval(RESET); const out = [];
    const d0 = Math.floor(S.t / 1440) * 1440 + 1440;
    Object.keys(window.SHL_DATA.NODES).filter((id) => id !== 'huiyao' && G.route('huiyao', id).length).forEach((id) => [6, 18, 19, 23].forEach((h) => {
      reset(); S.t = d0 + h * 60; const p = G.travelPreview(id); G._debug.HOOKS.lastEncRisk = null; S.dest = id; G.travel();
      out.push({ id, h, preview: p.risk, roll: G._debug.HOOKS.lastEncRisk });
    }));
    return out;
  }, RESET);
  check('[preview==roll] 灰窯出發到所有可達已知地點 × 06/18/19/23 時：皆相等（' + other.length + ' 趟）', other.length > 0 && other.every((r) => r.roll === r.preview), other.filter((r) => r.roll !== r.preview));

  // ===== 2. 輕功（腳力 25：野徑遇險 −20%） =====
  await fresh();
  const qg = await page.evaluate((RESET) => {
    const G = window.SHL, S = G.state; const reset = eval(RESET); const day = G.dayOf(S.t);
    S.quests.push({ id: 'cq_leech', town: 'huiyao', kind: 'kill', enemy: 'leech', need: 2, g: '蛭', ic: 'leech', title: 'x', reward: 1, due: day + 1, fixed: false, prog: 0, status: 'open' });
    S.quests.push({ id: 'cq_col', town: 'huiyao', kind: 'collect', item: 'herb_zx', need: 4, g: '草', ic: 'herb_zx', title: 'x', reward: 1, due: day + 1, fixed: false, prog: 0, status: 'open' });
    S.quests.push({ id: 'cq_dlv', town: 'huiyao', kind: 'deliver', to: 'duyin', need: 1, g: '包', ic: 'parcel', title: 'x', reward: 1, deposit: 1, due: day + 2, fixed: false, prog: 0, status: 'open' });
    S.quests.push({ id: 'cq_des', town: 'huiyao', kind: 'kill', enemy: 'deserter', need: 1, g: '兵', ic: 'deserter', title: 'x', reward: 1, due: day + 4, fixed: false, prog: 0, status: 'open' });
    const qs = S.quests.filter((q) => q.status !== 'hidden');
    const d0 = Math.floor(S.t / 1440) * 1440 + 1440;
    const snap = () => ({
      tiers: qs.map((q) => [q.id, G.questTier(q)]),
      qrisk: qs.map((q) => [q.id, G.questRisk(q).level]),
    });
    const trip = (lv, h, id) => { reset(); S.prof.jiao.lv = lv; S.t = d0 + h * 60; const p = G.travelPreview(id); G._debug.HOOKS.lastEncRisk = null; S.dest = id; G.travel(); return { risk: p.risk, roll: G._debug.HOOKS.lastEncRisk, wild: p.wild, hours: p.hours, pace: p.mult }; };
    reset(); S.prof.jiao.lv = 0; const s0 = snap();
    reset(); S.prof.jiao.lv = 25; const s1 = snap(); const perkOn = G.perk ? G.perk('jiao', 25) : null;
    const dests = Object.keys(window.SHL_DATA.NODES).filter((id) => id !== 'huiyao' && G.route('huiyao', id).length);
    const trips = [];
    dests.forEach((id) => [6, 12, 18, 19, 22].forEach((h) => { const a = trip(0, h, id), b = trip(25, h, id); trips.push({ id, h, no: a, yes: b }); }));
    return { s0, s1, perkOn, trips, hasBRT: true };
  }, RESET).catch((e) => ({ err: String(e) }));
  if (qg.err || !qg.hasBRT) {
    // baseRouteTier 若未匯出，改從 questTier 單獨驗
    check('[輕功] 讀取 questTier／baseRouteTier', false, qg);
  } else {
    check('[輕功] 委託單 questTier：腳力 25 與 0 完全相同（' + qg.s0.tiers.length + ' 張）', JSON.stringify(qg.s0.tiers) === JSON.stringify(qg.s1.tiers) && qg.s0.tiers.length >= 4, { no: qg.s0.tiers, yes: qg.s1.tiers });
    check('[輕功] 委託單風險塊 questRisk().level（baseRouteTier 未匯出，經 questTier 間接驗；原始碼 baseRouteTier 不含 perk）：腳力 25 與 0 相同、perk 確實生效', qg.perkOn === true && JSON.stringify(qg.s0.qrisk) === JSON.stringify(qg.s1.qrisk), { perk: qg.perkOn, no: qg.s0.qrisk, yes: qg.s1.qrisk });
    const wildT = qg.trips.filter((t) => t.no.wild), roadT = qg.trips.filter((t) => !t.no.wild);
    check('[輕功] 時數不受腳力影響（同一趟 hours 相同）', qg.trips.every((t) => t.no.hours === t.yes.hours));
    check('[輕功] 野徑路線 preview risk ＝ 無輕功 ×0.8（未封頂，' + wildT.length + ' 趟）', wildT.length > 0 && wildT.every((t) => t.no.risk < 0.85 && Math.abs(t.yes.risk - t.no.risk * 0.8) < 1e-12), wildT.map((t) => [t.id, t.h, t.no.risk, t.yes.risk]));
    check('[輕功] 官道路線不打折（只限野徑，' + roadT.length + ' 趟）', roadT.every((t) => t.yes.risk === t.no.risk), roadT.map((t) => [t.id, t.h, t.no.risk, t.yes.risk]));
    check('[輕功] 有／無輕功遇襲判定 roll 皆＝各自 preview', qg.trips.every((t) => t.no.roll === t.no.risk && t.yes.roll === t.yes.risk));
    const q = qg.trips.find((t) => t.id === 'qingwu' && t.h === 12);
    check('[輕功] 範例 灰窯→青霧 白天：0.30 → 0.24', q && Math.abs(q.no.risk - 0.3) < 1e-9 && Math.abs(q.yes.risk - 0.24) < 1e-9, q);
  }

  // ===== 3. 對照值 briefDanger（灰窯、R=1、晴、無獸潮）＋畫面 =====
  await fresh();
  await page.evaluate(() => { const G = window.SHL, S = G.state; G._debug.setNoise(false); G._debug.passTime((1440 - (S.t % 1440)) / 60 + 0.5); });
  const ref = [];
  for (const [h, v, tier] of [[6, 0.375, '高'], [12, 0.3, '中'], [18, 0.45, '高'], [22, 0.6, '極高']]) {
    const r = await page.evaluate(([RESET, h]) => {
      const G = window.SHL, S = G.state; eval(RESET)(); S.t = Math.floor(S.t / 1440) * 1440 + h * 60; S.scene = 'town'; S.townTab = null; S.street = null; G.setProfTab(S.profTab);
      const b = G.briefDanger('huiyao'); return { risk: b.risk, tier: b.tier, R: G.riskR(true), tide: !!S.world.tide };
    }, [RESET, h]);
    await page.waitForSelector('[data-testid=citybar]');
    if (!(await page.$('[data-testid=city-detail]'))) await page.click('[data-testid=city-toggle]');
    r.dom = await page.evaluate(() => { const e = document.querySelector('[data-testid=city-danger]'); return e && e.textContent.trim(); });
    ref.push([h, r]);
    check('[對照] ' + h + ':00 出城路險 ' + v.toFixed(3) + ' ' + tier + '（R=1、晴、無獸潮；畫面同）', r.R === 1 && !r.tide && Math.abs(r.risk - v) < 1e-9 && r.tier === tier && r.dom === '出城路險 ' + tier, r);
    if (h === 6) await shot(page, 'c15b-03-city-brief-dawn.png');
  }

  // ===== 4. DEV-04／DEV-03 並存 =====
  const d4 = await page.evaluate((RESET) => {
    const G = window.SHL, S = G.state, W = S.world; eval(RESET)();
    // 獸潮 ×1.5 仍在 routeRisk 與 briefDanger
    S.t = Math.floor(S.t / 1440) * 1440 + 12 * 60;
    const a = G.travelPreview('qingwu').risk; const day = G.dayOf(S.t);
    W.tide = { town: 'huiyao', start: day, end: day + 1, kills: 0, need: 99 };
    const b = G.travelPreview('qingwu').risk; const bd = G.briefDanger('huiyao').risk; const ti = G.tideInfo ? G.tideInfo() : 'n/a';
    eval(RESET)();
    const fns = Object.keys(G._debug).filter((k) => /bandit|tide|region/i.test(k));
    return { a, b, bd, ti: !!ti, fns, banditSrc: /bandit/.test(String(G._debug.startCombat)) };
  }, RESET);
  check('[DEV-04 獸潮] 野徑 preview ×1.5（0.30→0.45）、briefDanger 同步 0.45、tideInfo 有值', Math.abs(d4.a - 0.3) < 1e-9 && Math.abs(d4.b - 0.45) < 1e-9 && Math.abs(d4.bd - 0.45) < 1e-9 && d4.ti, d4);
  // 劫匪攔路：遇襲 → 事件選「應戰」→ 戰鬥敵人含 bandit（反覆找一個會遇襲的種子狀態）
  const amb = await page.evaluate((RESET) => {
    const G = window.SHL, S = G.state;
    for (let i = 0; i < 400; i++) {
      eval(RESET)(); S.t = Math.floor(S.t / 1440) * 1440 + 22 * 60; S.dest = 'qingwu'; G.travel();
      if (S.event) {
        if (S.event.id === 'bandit') { const id = S.event.id; G.eventChoose('fight'); const c = S.combat; const en = c && JSON.stringify(c.enemies || c.foes || c).match(/"bandit"/g); const out = { i, ev: id, combat: !!c, banditInCombat: !!en }; S.combat = null; S.scene = 'map'; return out; }
        S.event = null;
      }
      if (S.combat) S.combat = null;
    }
    return null;
  }, RESET);
  check('[DEV-04 劫匪] 夜行野徑可觸發「劫匪攔路」事件，應戰後入戰且敵人為 bandit', !!amb && amb.combat && amb.banditInCombat, amb);
  await fresh();
  await page.evaluate(() => { const G = window.SHL, S = G.state; S.scene = 'town'; S.loc = 'huiyao'; G.setTab('hy_board'); });
  await page.waitForSelector('[data-testid=quest-grid]');
  const nb = await page.evaluate(() => ({ txt: document.body.textContent, kinds: window.SHL.state.quests.map((q) => q.kind), btn: Array.from(document.querySelectorAll('button')).filter((b) => /剿匪/.test(b.textContent)).length }));
  check('[DEV-04] 委託板無剿匪單、畫面無「剿匪」鈕', !/剿匪/.test(nb.txt) && nb.btn === 0 && !nb.kinds.includes('bandit'), { kinds: nb.kinds });
  await shot(page, 'c15b-04-board-risk.png');

  // DEV-03 路人／巡邏在走 ＋ 城況簡報同屏
  await page.evaluate(() => { const G = window.SHL, S = G.state; G._debug.setNoise(false); G._debug.passTime((1440 - (S.t % 1440)) / 60 + 0.5); S.hp = G.maxHp(); S.food = 100; S.fat = 0;
    S.scene = 'town'; S.loc = 'huiyao'; S.street = null; S.world.towns.huiyao.P = 70; S.world.towns.huiyao.Geff = 2; G.setTab(null); });
  await page.waitForSelector('[data-testid=citybar]'); await page.waitForTimeout(800);
  const pos = () => page.evaluate(() => Array.from(document.querySelectorAll('.walker')).map((e) => { const r = e.getBoundingClientRect(); return [e.classList.contains('patrol') ? 'patrol' : 'anon', Math.round(r.left), Math.round(r.top)]; }));
  const p1 = await pos(); await shot(page, 'c15b-05-town-walkers-citybrief.png'); await page.waitForTimeout(1500); const p2 = await pos();
  const moved = p1.filter((x, i) => p2[i] && (x[1] !== p2[i][1] || x[2] !== p2[i][2]));
  const cb = await page.$('[data-testid=citybar]');
  check('[DEV-03] 城鎮畫面有路人與巡邏且 1.5 秒內有移動，城況簡報同屏', p1.some((x) => x[0] === 'patrol') && p1.some((x) => x[0] === 'anon') && moved.some((x) => x[0] === 'patrol') && moved.some((x) => x[0] === 'anon') && !!cb, { p1, p2 });

  // ===== 5. 地圖 travelPreview 清晨／黃昏截圖 =====
  for (const [h, n] of [[6, 'c15b-01-map-preview-dawn.png'], [18, 'c15b-02-map-preview-dusk.png']]) {
    const v = await page.evaluate(([RESET, h]) => { const G = window.SHL, S = G.state; eval(RESET)(); S.t = Math.floor(S.t / 1440) * 1440 + h * 60; G.toMap(); G.selectDest('qingwu'); const p = G.travelPreview('qingwu'); return { risk: p.risk, tier: p.riskName }; }, [RESET, h]);
    await page.waitForSelector('[data-testid=route-risk]');
    const t = (await page.textContent('[data-testid=route-risk]')).replace(/^危險/, '');
    check('[截圖] 地圖 ' + h + ':00 出發條險級「' + t.trim() + '」＝travelPreview ' + v.tier + '（' + v.risk + '）', t.trim() === v.tier, v);
    await shot(page, n);
  }

  check('無頁面錯誤', errs.length === 0, errs);
  console.log(fails ? 'RESULT FAIL ' + fails : 'RESULT ALL PASS');
  await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
