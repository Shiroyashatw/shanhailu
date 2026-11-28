/* 《山海錄》DEV-02 兩鎮循環 — 新增驗收（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e-dev02.js [--shots]
 *   --shots  另存 1280×720 實機截圖至 docs/evidence/shots-shanhailu-dev02-1128/（可用環境變數 SHOTS_DIR 覆寫）
 * 依據：docs/design/batch1/specs/SPEC-01.md v0.4（§3、§4、§5.1–5.3、5.5、§7.6、§9 E4、§10 AC-A／AC-J）、
 *       docs/design/batch1/specs/SPEC-TIME.md v0.4（§11 B1、§12 E11、§14 第 12 條）、rollout-plan-v0.1.md 第 113 行。
 * 既有 tests/e2e.js 不動斷言；本檔只放 DEV-02 的新斷言。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS_DIR ? path.resolve(ROOT, process.env.SHOTS_DIR) : path.join(ROOT, 'docs/evidence/shots-shanhailu-dev02-1128');
const WANT_SHOTS = process.argv.includes('--shots');
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean); // 例：ONLY=sleep 只跑睡眠段
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
async function shot(page, name) {
  // 截圖前做版面稽核：1280×720 單屏無捲動、三欄 240／796／220
  const lay = await page.evaluate(() => { const w = (id) => document.getElementById(id).getBoundingClientRect().width; return { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, c: [w('col-left'), w('col-center'), w('col-right')] }; });
  check('[' + name + '] 1280×720 單屏無捲動、三欄 240/796/220', lay.sw <= 1280 && lay.sh <= 720 && lay.c.join('/') === '240/796/220', lay);
  if (!WANT_SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('SHOT  ' + path.relative(ROOT, path.join(SHOTS, name)));
}
const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.005 : eps);
async function fresh(page, base, q) {
  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter' + (q || '&fx=0'));
  await page.waitForSelector('[data-testid=town]');
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

  // ===== S. sleepToMorning（SPEC-TIME §11 B1、§12 E11；Q-T7 乙：13 小時上限） =====
  if (want('sleep')) {
    await fresh(page, base);
    // 入口：rest（客棧，灰窯「老窯客棧」）、bunk（營帳通鋪，破曉營「傷兵帳」）
    const sleepAt = (entry, dayIdx, hh, mm) => page.evaluate(([entry, dayIdx, hh, mm]) => {
      const G = window.SHL; const S = G.state;
      S.dead = null; S.combat = null; S.event = null; S.hp = G.maxHp(); S.food = 100; S.fat = 50; S.silver = 999;
      S.scene = 'town';
      if (entry === 'rest') { S.loc = 'huiyao'; S.townTab = 'hy_inn'; } else { S.loc = 'poxiao'; S.townTab = 'px_medic'; }
      S.t = dayIdx * 1440 + hh * 60 + mm;
      const t0 = S.t; G.service(entry);
      return { t0, t1: S.t, slept: (S.t - t0) / 60, wake: G.fmtTime(S.t), from: G.fmtTime(t0) };
    }, [entry, dayIdx, hh, mm]);
    const cases = [
      // [標籤, 日序(0 起), 時, 分, 預期睡眠小時, 預期起床]
      ['20:00 → 次日 08:00（12 小時）', 4, 20, 0, 12, '第 6 日 08:00'],
      ['03:00 → 09:00（6 小時）', 4, 3, 0, 6, '第 5 日 09:00'],
      ['00:00 → 08:00（8 小時，不是 32 小時）', 4, 0, 0, 8, '第 5 日 08:00'],
      ['08:10 → 21:10（13 小時上限，不是 23.8 小時）', 4, 8, 10, 13, '第 5 日 21:10'],
      // 假設：「下一個 08:00」含當下（與 sim/lib/time.js wakeNew 的 n8 < now 才加一天一致），恰 08:00 就寢＝max(14:00, 08:00)＝14:00
      ['邊界：恰 08:00 → 14:00（6 小時；「下一個 08:00」含當下）', 4, 8, 0, 6, '第 5 日 14:00'],
      ['邊界：恰 07:00 → 13:00（6 小時）', 4, 7, 0, 6, '第 5 日 13:00'],
    ];
    for (const entry of ['rest', 'bunk']) {
      for (const [label, d, hh, mm, h, wake] of cases) {
        const r = await sleepAt(entry, d, hh, mm);
        check('[sleep/' + entry + '] ' + label, r.slept === h && r.wake === wake, r.from + ' → ' + r.wake + '（' + r.slept + ' 小時）');
      }
    }
    // 掃描一整天（每 10 分鐘）：睡眠恆在 6–13 小時、不超過舊規則
    const sweep = await page.evaluate(() => {
      const G = window.SHL; let lo = 99, hi = 0, bad = [];
      for (let m = 0; m < 1440; m += 10) {
        const now = 10 * 1440 + m; const h = (G.wakeTime(now) - now) / 60;
        const old = ((Math.floor(now / 1440) + 1) * 1440 + 480 - now) / 60; // 舊式 dayOf(now)*1440+480
        lo = Math.min(lo, h); hi = Math.max(hi, h); if (h > old + 1e-9) bad.push(m);
      }
      return { lo, hi, bad };
    });
    check('[sleep] 一日 144 個就寢時刻：睡眠 6–13 小時、皆不長於舊規則', sweep.lo === 6 && sweep.hi === 13 && !sweep.bad.length, sweep);
    // 疲累語意不變（fat 0、noRegen）：客棧睡完疲累 0、生命回滿；飽食改 1.25×睡眠時數（SPEC-TIME §6.2）：22:00→08:00 共 10 小時 −12.5
    const keep = await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'huiyao'; S.townTab = 'hy_inn'; S.scene = 'town'; S.t = 20 * 1440 + 22 * 60; S.food = 80; S.fat = 60; S.hp = 10; G.service('rest'); return { food: S.food, fat: S.fat, hp: S.hp, max: G.maxHp() }; });
    check('[sleep] 客棧歇息 10 小時：飽食 80 → 67.5（整數存值 68）、疲累清零、生命回滿', Math.abs(keep.food - (80 - 12.5)) <= 0.5 && keep.fat === 0 && keep.hp === keep.max, keep);

    // ---- SPEC-TIME §6.2：睡眠飽食扣減 = 1.25 × 睡眠時數（取代固定 10；起床公式不變） ----
    // S.food 依現況每次 passTime 後取整數，故實際狀態容許 ±0.5；純函式 sleepFoodCost 要恰等於 1.25×小時
    const pure = await page.evaluate(() => { const G = window.SHL; return [13, 6, 9.5, 12, 8].map((h) => ({ h, cost: G._debug.sleepFoodCost ? G._debug.sleepFoodCost(h) : null })); });
    check('[sleep/飽食] sleepFoodCost(h) 恰為 1.25×h（13→16.25、6→7.5、9.5→11.875、12→15、8→10）', pure.every((r) => r.cost !== null && Math.abs(r.cost - 1.25 * r.h) < 1e-9), pure);
    const foodCases = [
      // [標籤, 日序, 時, 分, 睡眠小時]（春季，無冬季 ×1.25）
      ['08:10 就寢 13 小時（上限）', 4, 8, 10, 13],
      ['03:00 就寢 6 小時（下限）', 4, 3, 0, 6],
      ['22:30 就寢 9.5 小時（中間）', 4, 22, 30, 9.5],
      ['20:00 就寢 12 小時', 4, 20, 0, 12],
    ];
    for (const entry of ['rest', 'bunk']) {
      for (const [label, d, hh, mm, h] of foodCases) {
        const r = await sleepAt(entry, d, hh, mm);
        const food = await page.evaluate(() => window.SHL.state.food);
        const want = 100 - 1.25 * h;
        check('[sleep/飽食/' + entry + '] ' + label + '：飽食 100 → ' + want + '（1.25×' + h + '）', r.slept === h && Math.abs(food - want) <= 0.5, { slept: r.slept, food, want });
      }
    }
    // 冬季現況乘數照舊（SPEC-TIME §6.2「冬季 以上全部 ×1.25」）：第 95 日 22:00 → 08:00，10 小時 × 1.25 × 1.25 = 15.625
    const wint = await sleepAt('rest', 94, 22, 0);
    const wfood = await page.evaluate(() => window.SHL.state.food);
    check('[sleep/飽食/rest] 冬季 10 小時：飽食 100 → 84.375（1.25×10×冬季 1.25）', wint.slept === 10 && Math.abs(wfood - (100 - 15.625)) <= 0.5, { slept: wint.slept, food: wfood });

    // ---- SPEC-TIME Q7／§6.5：客棧 rest、營帳 bunk 睡覺時生存扣血 hp 最低留 1（露宿、茶攤小憩不在此保護） ----
    const starve = (entry) => page.evaluate((entry) => {
      const G = window.SHL; const S = G.state;
      S.dead = null; S.combat = null; S.event = null; S.food = 0; S.fat = 50; S.hp = 10; S.silver = 999; S.scene = 'town';
      if (entry === 'rest') { S.loc = 'huiyao'; S.townTab = 'hy_inn'; } else { S.loc = 'poxiao'; S.townTab = 'px_medic'; }
      S.t = 6 * 1440 + 22 * 60; const t0 = S.t; G.service(entry);
      return { dead: !!S.dead, hp: S.hp, max: G.maxHp(), slept: (S.t - t0) / 60 };
    }, entry);
    const sr = await starve('rest');
    check('[sleep/Q7/rest] 飽食 0、hp 10 在客棧睡 10 小時（扣血 30）不會死，醒來生命回滿', !sr.dead && sr.slept === 10 && sr.hp === sr.max, sr);
    const sb = await starve('bunk');
    check('[sleep/Q7/bunk] 飽食 0、hp 10 在營帳通鋪睡 10 小時不會死，醒來 hp = 1 + 30 = 31', !sb.dead && sb.slept === 10 && sb.hp === 31, sb);
    // 對照：保護只給 rest／bunk；一般 passTime（露宿、等待）同樣條件仍會餓死
    const ctl = await page.evaluate(() => { const G = window.SHL; const S = G.state; S.dead = null; S.food = 0; S.fat = 50; S.hp = 10; G._debug.passTime(10); return { dead: !!S.dead, hp: S.hp }; });
    check('[sleep/Q7 對照] 不經 rest／bunk 的 10 小時（飽食 0、hp 10）仍會死：保護只限客棧與營帳', ctl.dead, ctl);
  }

  // ===== A. 單日結算（SPEC-01 §10 AC-A；NOISE=0） =====
  if (want('town')) {
    await fresh(page, base);
    const st0 = await page.evaluate(() => { const S = window.SHL.state; return { towns: JSON.parse(JSON.stringify(S.world.towns)), region: S.world.region, reserved: { wanted: S.wanted, hostility: S.hostility, jurisdiction: S.jurisdiction, influence: S.influence }, heavyOps: S.world.heavyOps, refugee: S.world.refugee }; });
    const h0 = st0.towns.huiyao, d0 = st0.towns.duyin;
    check('§3 起手值：灰窯 P50／T200／O55／Gnom1／Geff1、渡陰 P45／T300／O60／Gnom2／Geff2；F、Lpat、debt、rescueCd、taxCut 皆 0',
      h0.P === 50 && h0.T === 200 && h0.O === 55 && h0.Gnom === 1 && h0.Geff === 1 && d0.P === 45 && d0.T === 300 && d0.O === 60 && d0.Gnom === 2 && d0.Geff === 2 &&
      [h0, d0].every((t) => t.F === 0 && t.Lpat === 0 && t.debt === 0 && t.rescueCd === 0 && t.taxCut === 0), { h0, d0 });
    check('§3.2 區域起手：B 30、crew 4、crewCtr 0、crewWiped false；heavyOps {0,0}；refugee camp 60',
      st0.region.B === 30 && st0.region.crew === 4 && st0.region.crewCtr === 0 && st0.region.crewWiped === false && st0.heavyOps.season === 0 && st0.heavyOps.n === 0 && st0.refugee.camp === 60, { region: st0.region, heavyOps: st0.heavyOps, refugee: st0.refugee });
    check('§1 預留欄位：S.wanted {}、S.hostility {}、S.jurisdiction null、S.influence {}', JSON.stringify(st0.reserved) === '{"wanted":{},"hostility":{},"jurisdiction":null,"influence":{}}', st0.reserved);
    // AC-A1／A7：起手第 1 天無事件結算（走真的 passTime 跨 00:00 → newDay(2)）
    const a1 = await page.evaluate(() => { const G = window.SHL; G._debug.setNoise(false); G._debug.passTime(16); const S = G.state; return { t: G.fmtTime(S.t), h: S.world.towns.huiyao, d: S.world.towns.duyin, B: S.world.region.B }; });
    check('AC-A1 灰窯第 1 天結算：T = 207.96、P／O 不變', a1.h.T === 207.96 && a1.h.P === 50 && a1.h.O === 55 && a1.B === 30, { T: a1.h.T, P: a1.h.P, O: a1.h.O, B: a1.B, at: a1.t });
    check('AC-A1 渡陰第 1 天結算：T = 314.81、P／O 不變', a1.d.T === 314.81 && a1.d.P === 45 && a1.d.O === 60, { T: a1.d.T, P: a1.d.P, O: a1.d.O });
    const b = a1.h.brief;
    check('AC-A7 灰窯第 1 天 brief：Inc 22.96、treasuryIn 23、Out 15、Net +8、tier ok、trend flat、whyCode null（已與最新 SPEC-01 AC-A7 一致；16:46 裁決第 4 項）',
      b.Inc === 22.96 && b.treasuryIn === 23 && b.treasuryOut === 15 && b.treasuryNet === 8 && b.treasuryTier === 'ok' && b.trend === 'flat' && b.whyCode === null && b.dT === 7.96 && b.Geff === 1 && b.day === 2, b);
    check('§7.6 brief 欄位齊全', ['dP', 'dO', 'trend', 'whyCode', 'T', 'dT', 'treasuryIn', 'treasuryOut', 'treasuryNet', 'Inc', 'tax', 'fines', 'rescueAmt', 'upkeepPaid', 'bountyPaid', 'overflow', 'treasuryTier', 'Geff', 'debtToday', 'debtDays', 'aidToday', 'aidDaysLeft', 'aidFund', 'rescueToday', 'taxCutDays', 'taxCutAmt'].every((k) => k in b), Object.keys(b).length);
    // AC-A7：同日玩家在灰窯賣 100 兩 → treasuryIn 28、Net +13（§7.2）
    await fresh(page, base);
    const a5 = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; G._debug.setNoise(false);
      S.scene = 'town'; S.loc = 'huiyao'; S.townTab = 'hy_market';
      // 造一件行情價剛好整數的貨：以天星分號收購價 p 的倍數湊 100／19／39
      const k = Object.keys(window.SHL_DATA.ITEMS).find((x) => window.SHL_DATA.ITEMS[x].type !== 'quest' && G.sellPrice({ k: x, n: 1 }) === 1);
      const out = { k };
      const sellN = (n) => {
        S.pack = S.pack.map(() => null); S.pack[0] = { k, n };
        const s0 = S.silver, T0 = S.world.towns.huiyao.T, p0 = G.sellPrice({ k, n: 1 });
        G.sell(0, n);
        return { got: S.silver - s0, dT: Math.round((S.world.towns.huiyao.T - T0) * 100) / 100, p1: G.sellPrice({ k, n: 1 }), p0, log: S.log[S.log.length - 1].text };
      };
      out.s100 = sellN(100); out.s19 = sellN(19); out.s39 = sellN(39);
      out.accTax = S.world.towns.huiyao.acc.tax;
      G._debug.passTime(16);
      out.brief = S.world.towns.huiyao.brief;
      return out;
    });
    check('AC-A5 賣 100 兩 → 玩家得 95、灰窯 T +5、日誌附「（交易稅 5 兩）」', !!a5.k && a5.s100.got === 95 && a5.s100.dT === 5 && a5.s100.log.includes('（交易稅 5 兩）'), a5.s100);
    check('AC-A5 賣 19 兩 → 稅 0（得 19）；賣 39 兩 → 稅 1（得 38）', a5.s19.got === 19 && a5.s19.dT === 0 && !a5.s19.log.includes('交易稅') && a5.s39.got === 38 && a5.s39.dT === 1, { s19: a5.s19, s39: a5.s39 });
    check('AC-J1 交易稅不改 sellPrice 顯示的行情價', a5.s100.p0 === a5.s100.p1 && a5.s39.p0 === a5.s39.p1, { before: a5.s100.p0, after: a5.s100.p1 });
    check('AC-A7（§7.2）同日賣 100＋19＋39 兩：當日交易稅 6 進 brief.tax，treasuryIn = round(22.96+6) = 29、Net +14', a5.brief.tax === 6 && a5.brief.treasuryIn === 29 && a5.brief.treasuryNet === 14, { tax: a5.brief.tax, In: a5.brief.treasuryIn, Net: a5.brief.treasuryNet });
    const tradeOnlyInTowns = await page.evaluate(() => { const G = window.SHL; const S = G.state; const T0 = JSON.stringify(S.world.towns); S.loc = 'poxiao'; const x = G._debug.tradeTax(100); return { x, same: T0 === JSON.stringify(S.world.towns) }; });
    check('假設：破曉營（非兩鎮）賣出不課交易稅', tradeOnlyInTowns.x === 0 && tradeOnlyInTowns.same, tradeOnlyInTowns);

    // AC-A4：欠餉與求援（灰窯 T=10、Inc 設 0）＋ AC-A7 的求援 brief
    await fresh(page, base);
    const a4 = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; G._debug.setNoise(false); G._debug.HOOKS.taxMult.huiyao = 0;
      const t = S.world.towns.huiyao; t.T = 10; const rows = [];
      for (let d = 2; d <= 5; d++) { G._debug.townTick(d); rows.push({ d, Geff: t.Geff, T: t.T, debt: t.debt, taxCut: t.taxCut, rescueCd: t.rescueCd, b: { rescueToday: t.brief.rescueToday, rescueAmt: t.brief.rescueAmt, taxCutDays: t.brief.taxCutDays, debtDays: t.brief.debtDays, tier: t.brief.treasuryTier, debtToday: t.brief.debtToday } }); }
      delete G._debug.HOOKS.taxMult.huiyao;
      return rows;
    });
    check('AC-A4 日 1、2：Geff 0、T 維持 10、debt 1、2', a4[0].Geff === 0 && a4[0].T === 10 && a4[0].debt === 1 && a4[1].Geff === 0 && a4[1].T === 10 && a4[1].debt === 2 && a4[0].b.tier === 'debt', a4.slice(0, 2));
    check('AC-A4 日 3：debt 3 觸發求援，T = 100、taxCut 10、rescueCd 20', a4[2].T === 100 && a4[2].taxCut === 10 && a4[2].rescueCd === 20 && a4[2].debt === 0, a4[2]);
    check('AC-A7 求援日 brief：rescueToday、rescueAmt 90、taxCutDays 10、debtDays 0', a4[2].b.rescueToday === true && a4[2].b.rescueAmt === 90 && a4[2].b.taxCutDays === 10 && a4[2].b.debtDays === 0, a4[2].b);
    check('AC-A4 日 4 起付得起：Geff 回 1、T 85', a4[3].Geff === 1 && a4[3].T === 85 && a4[3].b.taxCutDays === 9, a4[3]);

    // AC-A6：S_pub
    const a6 = await page.evaluate(() => { const G = window.SHL; G.restart(20261127, 'drifter'); const S = G.state; const h = G.sPub('huiyao'), d = G.sPub('duyin'); const t = S.world.towns.huiyao; const o = t.O, g = t.Geff; t.O = 30; t.Geff = 0; const low = G.sPub('huiyao'); t.O = o; t.Geff = g; return { h, d, low }; });
    check('AC-A6 S_pub：灰窯起手 1.00、渡陰起手 1.21、O=30／Geff=0 時 0.65', near(a6.h, 1.0, 1e-9) && Math.round(a6.d * 100) / 100 === 1.21 && Math.round(a6.low * 100) / 100 === 0.65, a6);

    // AC-A7 資助加派 aidDaysLeft、AC-A2（機制部分：直接把 F 設 100，不經資助行動；資助按鈕屬 DEV-04）
    const a2 = await page.evaluate(() => {
      const G = window.SHL; G.restart(20261127, 'drifter'); const S = G.state; G._debug.setNoise(false);
      const t = S.world.towns.huiyao; t.F = 100; const rows = [];
      for (let d = 2; d <= 6; d++) { G._debug.townTick(d); rows.push({ d, O: t.O, P: t.P, F: t.F, Geff: t.Geff, left: t.brief.aidDaysLeft, aid: t.brief.aidToday, why: t.brief.whyCode }); }
      return rows;
    });
    check('AC-A7 資助 100 兩（F=100）aidDaysLeft 日 1–5 為 4／3／2／1／0', a2.map((r) => r.left).join('/') === '4/3/2/1/0' && a2.slice(0, 4).every((r) => r.Geff === 2) && a2[4].Geff === 1, a2.map((r) => r.left + '@G' + r.Geff));
    check('AC-A2（機制部分，F 直接設值）灰窯逐日 O：56.00、56.90、57.71（±0.01）；F 日 4 後 = 0', near(a2[0].O, 56.0, 0.01) && near(a2[1].O, 56.9, 0.01) && near(a2[2].O, 57.71, 0.01) && a2[3].F === 0, a2.slice(0, 4).map((r) => r.O + '／F' + r.F));

    // 駐軍四檔顯示名（SPEC-01 §7.1／§7.6；完成標準 6）
    const gn = await page.evaluate(() => { const G = window.SHL; G.restart(20261127, 'drifter'); const S = G.state; G._debug.setNoise(false); S.world.towns.duyin.F = 100; G._debug.townTick(2); const b = S.world.towns.duyin.brief; return { names: [0, 1, 2, 3].map(G.garrisonName), table: window.SHL_DATA.WORLD.GARRISON_NAMES, Geff: b.Geff, name: G.garrisonName(b.Geff) }; });
    check('駐軍第 3 檔顯示名為「守備」（四檔：無／自衛隊／巡邏隊／守備，data.js 單一表）', gn.names.join('／') === '無／自衛隊／巡邏隊／守備' && gn.table[3] === '守備' && gn.names[3] === '守備', gn.names);
    check('渡陰資助加派到第 3 檔：brief.Geff = 3 → 「守備」', gn.Geff === 3 && gn.name === '守備', gn);

    // 兩鎮每天會變；e2e 走過一天結算（雜訊開啟，經客棧歇息跨日）
    await fresh(page, base);
    const day = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const rows = [];
      const snap = () => ({ day: G.dayOf(S.t), h: Object.assign({}, S.world.towns.huiyao, { brief: undefined, acc: undefined }), d: Object.assign({}, S.world.towns.duyin, { brief: undefined, acc: undefined }), hb: S.world.towns.huiyao.brief, db: S.world.towns.duyin.brief });
      rows.push(snap());
      for (let i = 0; i < 6; i++) {
        G._debug.passTime(Math.max(0, (22 * 60 - (S.t % 1440)) / 60)); // 走到當日 22:00
        S.scene = 'town'; S.loc = 'huiyao'; S.townTab = 'hy_inn'; S.silver = 999; S.dead = null; S.hp = G.maxHp(); S.food = 100;
        G.service('rest'); rows.push(snap());
      }
      return { rows, log: S.log.filter((l) => /新的一天|歇了一夜/.test(l.text)).slice(-4).map((l) => G.fmtTime(l.t) + ' ' + l.text) };
    });
    const r = day.rows;
    const tChanges = r.slice(1).every((x, i) => x.h.T !== r[i].h.T && x.d.T !== r[i].d.T);
    const pChanged = r.slice(1).some((x, i) => x.h.P !== r[i].h.P) && r.slice(1).some((x, i) => x.d.P !== r[i].d.P);
    check('兩鎮每天會變：6 個日結，兩鎮財庫每天都變、繁榮都有起伏', tChanges && pChanged, r.map((x) => 'D' + x.day + ' 灰' + x.h.P + '/' + x.h.T + ' 渡' + x.d.P + '/' + x.d.T).join('；'));
    check('e2e 走過一天結算：客棧 22:00 歇息 → 次日 08:00，日結 brief.day 逐日遞增', r.slice(1).every((x, i) => x.day === r[i].day + 1 && x.hb.day === x.day && x.db.day === x.day), r.map((x) => x.day + ':' + (x.hb.day || '-')));
    check('日誌時間 24 小時制（新的一天在 00:00，起床 08:00）', day.log.some((l) => /^第 \d+ 日 00:00 第 \d+ 日 00:00，新的一天/.test(l)) && day.log.every((l) => /^第 \d+ 日 ([01]\d|2[0-3]):[0-5]\d /.test(l)) && !day.log.join('').match(/[子丑寅卯辰巳午未申酉戌亥]時/), day.log);

    // 一次 passTime 跨 ≥2 個日界：逐日補算，與逐日推進的結果完全一致（SPEC-01 §2）
    const multi = await page.evaluate(() => {
      const G = window.SHL; const pick = (S) => JSON.stringify({ towns: S.world.towns, region: S.world.region, tide: S.world.tide, next: S.world.next, hurt: S.world.hurt });
      G.restart(777, 'drifter'); G._debug.passTime(64); const a = pick(G.state); const n1 = G.state.log.filter((l) => l.text.includes('新的一天')).length;
      G.restart(777, 'drifter'); for (let i = 0; i < 8; i++) G._debug.passTime(8); const b = pick(G.state);
      return { same: a === b, n1, day: G.dayOf(G.state.t), bday: G.state.world.towns.huiyao.brief.day };
    });
    check('一次 passTime 跨 3 個日界：逐日補算 3 次，結果與 8 小時 ×8 逐段推進完全一致', multi.same && multi.n1 === 3 && multi.bday === 4, multi);

    // 防失控：上下限（P 15–80、O 0–100、每日 ±3、T ≥ 0 且 ≤ T_CAP）
    const clampT = await page.evaluate(() => {
      const G = window.SHL; G.restart(99, 'drifter'); const S = G.state;
      const W = S.world, h = W.towns.huiyao, d = W.towns.duyin;
      h.P = 79.9; h.O = 100; h.T = 99999; d.P = 15.2; d.O = 0.5; d.T = 0; d.Gnom = 2;
      let worst = 0, viol = [], remitLogs = 0;
      const nLog0 = S.log.length;
      for (let day = 2; day <= 121; day++) {
        const y = { hP: h.P, hO: h.O, dP: d.P, dO: d.O };
        G._debug.townTick(day);
        worst = Math.max(worst, Math.abs(h.P - y.hP), Math.abs(h.O - y.hO), Math.abs(d.P - y.dP), Math.abs(d.O - y.dO));
        [h, d].forEach((t, i) => { const cap = 90 * [0, 15, 40, 90][t.Gnom]; if (t.P < 15 || t.P > 80 || t.O < 0 || t.O > 100 || t.T < 0 || t.T > cap + 1e-9) viol.push(day + ':' + i); });
      }
      remitLogs = S.log.slice(nLog0).filter((l) => l.text.includes('上繳鎮西將軍府')).length;
      return { worst: Math.round(worst * 100) / 100, viol: viol.slice(0, 5), remitLogs, hT: h.T };
    });
    check('防失控：極端起點跑 120 天，P 15–80、O 0–100、T 0–T_CAP、每日變動 ≤ 3', !clampT.viol.length && clampT.worst <= 3 + 1e-9, clampT);
    check('§5.5 上繳：灰窯 T 灌到 99999 → 夾回 T_CAP 1350；「上繳」日誌 120 天 ≤ 12 次（每 10 天最多一次）', clampT.hT <= 1350 && clampT.remitLogs >= 1 && clampT.remitLogs <= 12, clampT);
  }

  // ===== R. 遇險率的治安修正 R 與封頂 0.85（SPEC-01 §4.8「套用」列；rollout-plan DEV-02「只乘治安修正」） =====
  if (want('risk')) {
    await fresh(page, base);
    const rk = await page.evaluate(() => {
      const G = window.SHL; const S = G.state; const W = S.world;
      const out = { road0: G.riskR(false), wild0: G.riskR(true) };
      S.loc = 'huiyao'; S.scene = 'map';
      out.prevWild = G.travelPreview('chakou');
      W.region.B = 45; W.towns.huiyao.O = 50; W.towns.duyin.O = 50; out.wildE3 = G.riskR(true);
      // 最壞組合：B 100、O 0（R_wild 1.8 上限）、夜、超載、獸潮、多段野徑
      W.region.B = 100; W.towns.huiyao.O = 0; W.towns.duyin.O = 0; out.wildMax = G.riskR(true);
      S.t = 22 * 60; W.tide = { town: 'huiyao', start: 1, end: 2, kills: 0, need: 4 };
      const far = Object.keys(window.SHL_DATA.NODES).map((id) => ({ id, p: G.travelPreview(id) })).filter((x) => x.p.edges.length > 1 && x.p.wild);
      out.cap = far.length ? far[0].p.risk : null; out.capId = far.length ? far[0].id : null;
      out.allCap = Object.keys(window.SHL_DATA.NODES).every((id) => G.travelPreview(id).risk <= 0.85 + 1e-12);
      return out;
    });
    check('起手 R_road = R_wild = 1（遇險率與現況相同）', rk.road0 === 1 && rk.wild0 === 1 && near(rk.prevWild.risk, 0.22, 1e-12), { road: rk.road0, wild: rk.wild0, risk: rk.prevWild.risk });
    check('R_wild：B=45、Ō=50 → 1.255（AC-E3 的 R 部分）', near(rk.wildE3, 1.255, 1e-9), rk.wildE3);
    check('遇險封頂 0.85 在所有乘項之後（最壞組合 R_wild=1.8、夜、獸潮、多段野徑 → 0.85）', rk.wildMax === 1.8 && rk.cap === 0.85 && rk.allCap, rk);
  }

  // ===== J. 相容與存檔（SPEC-01 §10 AC-J） =====
  if (want('save')) {
    await fresh(page, base);
    const before = await page.evaluate(() => { const G = window.SHL; const S = G.state; S.world.towns.huiyao.F = 77; S.world.towns.duyin.Lpat = 2; S.wanted = { huiyao: { k: 1 } }; S.influence = { dawn: 3 }; S.jurisdiction = 'huiyao'; S.hostility = { x: 1 }; G._debug.passTime(16); S.world.towns.duyin.debt = 1; G.save(); return JSON.stringify({ towns: S.world.towns, region: S.world.region, heavyOps: S.world.heavyOps, refugee: S.world.refugee, wanted: S.wanted, hostility: S.hostility, jurisdiction: S.jurisdiction, influence: S.influence }); });
    await page.goto(base + 'index.html?fx=0'); await page.waitForSelector('[data-testid=town]');
    const after = await page.evaluate(() => { const S = window.SHL.state; return JSON.stringify({ towns: S.world.towns, region: S.world.region, heavyOps: S.world.heavyOps, refugee: S.world.refugee, wanted: S.wanted, hostility: S.hostility, jurisdiction: S.jurisdiction, influence: S.influence }); });
    check('AC-J2 日結後存檔、讀檔：world.towns、region、F（77 兩，日結加派後餘 52）、Lpat、debt、預留欄位完全一致', before === after && after.includes('"F":52') && after.includes('"Lpat":2'), before === after ? after.length + ' 字元' : { before, after });
    // AC-J5：沒有 world.towns 的存檔 → 以起手值補、不丟錯
    const errs0 = consoleErrors.length;
    await page.evaluate(() => { const w = window.SHL.readRaw(); delete w.state.world.towns; delete w.state.world.region; delete w.state.world.heavyOps; delete w.state.world.refugee; delete w.state.wanted; delete w.state.hostility; delete w.state.jurisdiction; delete w.state.influence; localStorage.setItem(window.SHL.SAVE_KEY, JSON.stringify(w)); });
    await page.goto(base + 'index.html?fx=0'); await page.waitForSelector('[data-testid=town]');
    const j5 = await page.evaluate(() => { const G = window.SHL; const S = G.state; const ok1 = S.world.towns.huiyao.T === 200 && S.world.towns.duyin.P === 45 && S.world.region.B === 30 && S.jurisdiction === null && JSON.stringify(S.wanted) === '{}'; G._debug.passTime(24); return { ok1, t: G.fmtTime(S.t), T: S.world.towns.huiyao.T, day: S.world.towns.huiyao.brief.day }; });
    check('AC-J5 讀到沒有 world.towns 的存檔：以起手值補、可照常日結、不丟錯', j5.ok1 && j5.day >= 2 && consoleErrors.length === errs0, j5);
  }

  // ===== J3／J4：同 seed 同操作重現、wrnd 不消耗 S.rng =====
  if (want('repro')) {
    const script = async () => page.evaluate(() => {
      const G = window.SHL; const S = G.state;
      G.setTab('hy_market');
      const bi = S.pack.findIndex((x) => x && x.k === 'bread'); if (bi >= 0) G.sell(bi, 1);
      G.setTab('hy_inn'); G._debug.passTime(13); G.service('rest');
      G.toMap(); G.selectDest('chakou'); G.travel();
      for (let i = 0; i < 3; i++) G._debug.passTime(20);
      const c = JSON.parse(JSON.stringify(S)); delete c.meta; return JSON.stringify(c);
    });
    await fresh(page, base); const run1 = await script();
    await fresh(page, base); const run2 = await script();
    check('AC-J3 同 seed 同操作兩次：整份狀態 100% 相同（含世界擲骰）', run1 === run2 && run1.length > 1000, run1.length + ' 字元');
    const j4 = await page.evaluate(() => {
      const G = window.SHL; const D = window.SHL_DATA;
      const runOnce = (burn) => {
        G.restart(424242, 'drifter'); const S = G.state; const tides = [];
        for (let d = 0; d < 40; d++) { for (let k = 0; k < burn; k++) G._debug.rnd(); G._debug.passTime(24); if (S.world.tide && !tides.some((x) => x.start === S.world.tide.start)) tides.push(Object.assign({}, S.world.tide, { kills: 0 })); S.hp = G.maxHp(); S.food = 100; S.fat = 0; S.dead = null; }
        return { tides: JSON.stringify(tides.map((t) => [t.start, t.end, t.town])), pn: JSON.stringify([S.world.towns.huiyao.P, S.world.towns.duyin.P]) };
      };
      const a = runOnce(0), b = runOnce(37);
      // 世界函式本身不動 S.rng
      G.restart(5, 'drifter'); const S = G.state; S.world.next = 2; const r0 = S.rng; G._debug.worldTick(2); G._debug.townTick(2); G._debug.worldTick(4); G._debug.townTick(3); const r1 = S.rng;
      return { a, b, rngSame: r0 === r1, n: JSON.parse(a.tides).length, w: G._debug.wrnd('tide-town', 9, 0) === G._debug.wrnd('tide-town', 9, 0) };
    });
    check('AC-J4（wrnd 隔離部分）worldTick／townTick 不消耗 S.rng；wrnd 同參數同值', j4.rngSame && j4.w, j4.rngSame);
    check('AC-J4（wrnd 隔離部分）每天多耗 37 次 S.rng：40 天內獸潮開始日、結束日、目標鎮與 PNOISE 結果完全相同（有無資助的完整比較待 DEV-04）', j4.a.tides === j4.b.tides && j4.a.pn === j4.b.pn && j4.n >= 3, j4.a.tides);
  }

  // ===== C. 戰鬥 cflash 預算（完成標準 4＋17:26 裁決／FX-LIST X12：每秒 ≤3 次、間隔 ≥400ms；最壞情況：4 隻最快的敵人、敵我連續行動、持續傷害） =====
  if (want('cflash')) {
    const cflashLog = [];
    for (const mode of ['natural', 'mash200', 'mash250', 'mash300', 'mash350', 'mash400']) {
      await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&origin=drifter'); // 演出開啟
      await page.waitForSelector('[data-testid=town]');
      await page.evaluate(() => {
        // 以 CSS 動畫實際開播（animationstart, animationName = cflash）計次，這是玩家真的看到的閃光
        window.__flash = [];
        document.addEventListener('animationstart', (ev) => { if (ev.animationName === 'cflash') window.__flash.push(performance.now()); }, true);
        const G = window.SHL; const S = G.state;
        S.attr.shen = 1; // 壓低閃避，讓敵方幾乎每下都命中（最壞情況）
        G._debug.startCombat(['bug', 'bug', 'bug', 'bug'], { type: 'wild', node: 'chakou' }, {});
        S.combat.bleed = 99; S.combat.poison = 99; // 持續傷害每回合都跳
        S.combat.enemies.forEach((e) => (e.hp = e.max = 99999));
        G.save(); G.setProfTab(S.profTab); // 觸發重繪
      });
      await page.waitForSelector('[data-testid=combat]');
      const t0 = Date.now();
      while (Date.now() - t0 < (mode === 'natural' ? 17000 : 8000)) {
        await page.evaluate(() => { const S = window.SHL.state; S.hp = 99999; S.fat = 0; if (S.combat) S.combat.enemies.forEach((e) => { const hv = Math.random() < 0.5; e.intent = { k: hv ? 'heavy' : 'atk', range: hv ? [8, 12] : [3, 6] }; e.stag = 0; e.charged = false; }); });
        if (mode === 'natural') {
          await page.click('[data-testid=act-wait]').catch(() => {});
          await page.waitForTimeout(4200); // 等整串演出播完（4 敵 e_act＋e_hit、持續傷害）再出手
        } else {
          await page.keyboard.press('1'); // 1 號鍵＝第一個行動（普攻）；鍵盤會先 flushFx 再出手
          await page.waitForTimeout(+mode.slice(4) - 15);
        }
      }
      const ts = await page.evaluate(() => window.__flash.slice());
      let max = 0, at = 0;
      for (let i = 0; i < ts.length; i++) { let j = i; while (j < ts.length && ts[j] - ts[i] < 1000) j++; if (j - i > max) { max = j - i; at = i; } }
      const gaps = ts.slice(1).map((x, i) => Math.round(x - ts[i]));
      const minGap = gaps.length ? Math.min(...gaps) : null;
      const lbl = '[cflash/' + (mode === 'natural' ? '等演出播完再出手' : '連按鍵盤（每 ' + mode.slice(4) + 'ms）') + '] ';
      const info = { total: ts.length, maxPerSec: max, minGapMs: minGap, sampleGaps: gaps.slice(at, at + 6) };
      cflashLog.push(Object.assign({ mode }, info));
      check(lbl + '任意 1 秒滑動視窗內 cflash ≤ 3 次（X12）', max <= 3 && (mode !== 'natural' || ts.length > 5), info);
      // 量測的是玩家真正看到的 CSS 動畫開播（animationstart）時間戳，門檻不留容差：≥ 400ms
      check(lbl + '相鄰兩次 cflash 間隔 ≥ 400ms（17:26 裁決，由 350ms 改）', ts.length < 2 || minGap >= 400, info);
    }
    if (WANT_SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, 'cflash-measure.json'), JSON.stringify(cflashLog, null, 1)); }
    console.log('CFLASH ' + JSON.stringify(cflashLog.map((c) => ({ mode: c.mode, total: c.total, maxPerSec: c.maxPerSec, minGapMs: c.minGapMs }))));
  }

  // ===== T. 險級四檔與等長官道優先（SPEC-TIME 7.1b、第 14 節 AC 20；fix3） =====
  if (want('tier')) {
    await fresh(page, base);
    const tv = await page.evaluate(() => {
      const G = window.SHL; const D = window.SHL_DATA;
      const pts = [0.149, 0.150, 0.349, 0.350, 0.599, 0.600, 0.85, 0.1495, 0.3495, 0.5995, 0.9, 1.5];
      return { cuts: D.TIME.RISK_CUTS, tiers: pts.map((r) => [r, G.riskTier(r)]) };
    });
    const T = Object.fromEntries(tv.tiers.map(([r, t]) => [String(r), t]));
    check('D.TIME.RISK_CUTS = [0.15, 0.35, 0.60]', JSON.stringify(tv.cuts) === '[0.15,0.35,0.6]', tv.cuts);
    check('AC 20 測點 0.149／0.150／0.349／0.350／0.599／0.600／0.85 → 低／中／中／高／高／極高／極高',
      ['0.149', '0.15', '0.349', '0.35', '0.599', '0.6', '0.85'].map((k) => T[k]).join('／') === '低／中／中／高／高／極高／極高', tv.tiers.slice(0, 7));
    check('取三位 half-up：0.1495 → 中、0.3495 → 高、0.5995 → 極高', T['0.1495'] === '中' && T['0.3495'] === '高' && T['0.5995'] === '極高', tv.tiers.slice(7, 10));
    check('超過 0.85 先封頂：0.9、1.5 → 極高', T['0.9'] === '極高' && T['1.5'] === '極高', tv.tiers.slice(10));
    // 等長路線：灰窯→渡陰 官道 2+2＝4 vs 經岔口 1+1+2＝4（含野徑）；灰窯→破曉營 官道 6 vs 經岔口、青梧、古窯 1+1+2+2＝6（全野徑）
    const rt = await page.evaluate(() => {
      const G = window.SHL; const D = window.SHL_DATA; const S = G.state;
      S.loc = 'huiyao'; S.scene = 'map'; S.t = 12 * 60;
      const pairs = [['huiyao', 'duyin'], ['duyin', 'huiyao'], ['huiyao', 'poxiao'], ['poxiao', 'huiyao']];
      const run = () => pairs.map(([a, b]) => { const e = G.route(a, b); return { a, b, h: e.reduce((x, y) => x + y.h, 0), allRoad: e.length > 0 && e.every((y) => y.road), n: e.length }; });
      // 等長確認：拿掉 灰窯–驛站 這段官道後，同一對地點仍有等長、但含野徑的路線（經岔口）
      const keep = D.EDGES.slice(); const cut = keep.findIndex((e) => e.road && [e.a, e.b].sort().join() === 'huiyao,yizhan');
      D.EDGES.splice(cut, 1);
      const wildOnly = pairs.map(([a, b]) => { const e = G.route(a, b); return { h: e.reduce((x, y) => x + y.h, 0), wild: e.some((y) => !y.road) }; });
      D.EDGES.length = 0; keep.forEach((e) => D.EDGES.push(e));
      const normal = run();
      const prevN = G.travelPreview('duyin');
      D.EDGES.reverse(); const reversed = run(); const prevR = G.travelPreview('duyin');
      // 再把 NODES 鍵的順序也反轉（同一物件，刪掉再依反序加回）
      const ks = Object.keys(D.NODES), vs = ks.map((k) => D.NODES[k]); ks.forEach((k) => delete D.NODES[k]); ks.slice().reverse().forEach((k, i) => (D.NODES[k] = vs[ks.length - 1 - i]));
      const bothRev = run();
      ks.forEach((k) => delete D.NODES[k]); ks.forEach((k, i) => (D.NODES[k] = vs[i])); D.EDGES.reverse();
      const restored = D.EDGES.every((e, i) => e === keep[i]) && Object.keys(D.NODES).join() === ks.join();
      return { wildOnly, normal, reversed, bothRev, restored, prevN: { wild: prevN.wild, risk: prevN.risk, tier: prevN.riskName }, prevR: { wild: prevR.wild, risk: prevR.risk, tier: prevR.riskName } };
    });
    const allRoad = (arr) => arr.every((x) => x.allRoad) && arr.map((x) => x.h).join() === '4,4,6,6';
    check('等長情境成立：拿掉灰窯–驛站官道後，灰窯↔渡陰仍 4 小時、灰窯↔破曉營仍 6 小時，且改走含野徑路線', rt.wildOnly.map((x) => x.h).join() === '4,4,6,6' && rt.wildOnly.every((x) => x.wild), rt.wildOnly);
    check('AC 20 等長官道優先（正常 EDGES）：灰窯↔渡陰、灰窯↔破曉營四個方向全走官道', allRoad(rt.normal), rt.normal);
    check('AC 20 等長官道優先（EDGES 反轉）：四個方向仍全走官道', allRoad(rt.reversed), rt.reversed);
    check('AC 20 等長官道優先（EDGES 與 NODES 皆反轉）：四個方向仍全走官道', allRoad(rt.bothRev), rt.bothRev);
    check('送貨路程 travelPreview(渡陰) 白天官道 0.040「低」，EDGES 反轉後不變', !rt.prevN.wild && near(rt.prevN.risk, 0.04, 1e-12) && rt.prevN.tier === '低' && JSON.stringify(rt.prevN) === JSON.stringify(rt.prevR), { normal: rt.prevN, reversed: rt.prevR });
    check('測後 EDGES／NODES 順序已還原', rt.restored);
    // 自造等長情境（舊 route() 的嚴格小於在這裡會隨順序改走野徑，用來確認 tie-break 是明寫的，不是碰巧）：
    //  甲：平行兩條 灰窯–渡陰 各 2 小時（官道一條、野徑一條）→ 舊版取 EDGES 中先出現者
    //  乙：灰窯–驛站–渡陰 官道 1+1 vs 灰窯–岔口–渡陰 野徑 1+1 → 舊版取 NODES 中先彈出的中繼點
    const syn = await page.evaluate(() => {
      const G = window.SHL; const D = window.SHL_DATA;
      const cases = {
        甲: [{ a: 'huiyao', b: 'duyin', h: 2, road: true }, { a: 'huiyao', b: 'duyin', h: 2 }],
        乙: [{ a: 'huiyao', b: 'yizhan', h: 1, road: true }, { a: 'yizhan', b: 'duyin', h: 1, road: true }, { a: 'huiyao', b: 'chakou', h: 1 }, { a: 'chakou', b: 'duyin', h: 1 }],
      };
      const keep = D.EDGES.slice(); const ks = Object.keys(D.NODES), vs = ks.map((k) => D.NODES[k]);
      const setN = (rev) => { ks.forEach((k) => delete D.NODES[k]); (rev ? ks.slice().reverse() : ks).forEach((k) => (D.NODES[k] = vs[ks.indexOf(k)])); };
      const out = {};
      Object.keys(cases).forEach((c) => [0, 1].forEach((er) => [0, 1].forEach((nr) => [0, 1].forEach((sw) => {
        D.EDGES.length = 0;
        let list = er ? cases[c].slice().reverse() : cases[c].slice();
        if (sw) list = list.map((e) => Object.assign({}, e, { a: e.b, b: e.a })); // 端點對調
        list.forEach((e) => D.EDGES.push(e)); setN(nr);
        const go = G.route('huiyao', 'duyin'), back = G.route('duyin', 'huiyao');
        out[c + (er ? '・EDGES 反轉' : '・EDGES 正常') + (nr ? '・NODES 反轉' : '') + (sw ? '・端點對調' : '')] = go.length > 0 && back.length > 0 && go.concat(back).every((e) => e.road) && go.reduce((x, y) => x + y.h, 0) === 2;
      }))));
      D.EDGES.length = 0; keep.forEach((e) => D.EDGES.push(e)); setN(0);
      out.restored = D.EDGES.every((e, i) => e === keep[i]) && Object.keys(D.NODES).join() === ks.join();
      return out;
    });
    const synKeys = Object.keys(syn).filter((k) => k !== 'restored');
    check('AC 20 自造等長情境（平行官道／野徑、雙段官道／野徑）× EDGES 正常與反轉 × NODES 正常與反轉 × 端點對調：一律走官道', synKeys.length === 16 && synKeys.every((k) => syn[k]), syn);
    check('自造情境測後 EDGES／NODES 已還原', syn.restored);
  }

  // ===== U. fix4：「中高」改「高」（數值 18:14 裁定、SPEC-TIME AC 21）；route() 第三、四層 tie-break =====
  if (want('fix4')) {
    await fresh(page, base);
    const ids = await page.evaluate(() => { const D = window.SHL_DATA; return { wilds: Object.keys(D.WILDS), dgs: Object.keys(D.DUNGEONS), data: JSON.stringify({ w: D.WILDS, d: D.DUNGEONS, n: D.NODES, t: D.TIME }) }; });
    check('[AC 21] 資料 WILDS／DUNGEONS／NODES／TIME 不含「中高」', !ids.data.includes('中高'));
    const seen = {};
    for (const id of ids.wilds.concat(ids.dgs)) {
      await page.evaluate((id) => { const G = window.SHL; const S = G.state; S.known[id] = true; S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.loc = id; G.enterHere(); }, id);
      await page.waitForSelector(ids.wilds.includes(id) ? '[data-testid=wild]' : '[data-testid=dungeon]');
      seen[id] = await page.evaluate(() => ({ body: document.body.innerText, pill: [...document.querySelectorAll('.stagehead .pill')].map((e) => e.textContent).find((t) => t.startsWith('險 ')) }));
    }
    const bad = Object.keys(seen).filter((k) => seen[k].body.includes('中高'));
    check('[AC 21] 逐一進入全部荒野 ' + ids.wilds.length + ' 處、地城 ' + ids.dgs.length + ' 處，畫面不出現「中高」', bad.length === 0 && Object.keys(seen).length === ids.wilds.length + ids.dgs.length, { bad, pills: Object.fromEntries(Object.keys(seen).map((k) => [k, seen[k].pill])) });
    check('[AC 21] 原「中高」的腐骨沼（荒野）、沉淵祭窟（地城）現顯示「險 高」', seen.fuzhao.pill === '險 高' && seen.jiku.pill === '險 高', { fuzhao: seen.fuzhao.pill, jiku: seen.jiku.pill });
    if (WANT_SHOTS) {
      await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'jiku'; G.enterHere(); });
      await page.waitForSelector('[data-testid=dungeon]');
      const dirFix4 = path.join(ROOT, 'docs/evidence/shots-shanhailu-dev02-fix4-1128');
      fs.mkdirSync(dirFix4, { recursive: true });
      await page.screenshot({ path: path.join(dirFix4, 'fix4-jiku-risk-high.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
      console.log('SHOT  ' + path.relative(ROOT, path.join(dirFix4, 'fix4-jiku-risk-high.png')));
    }
    // 一段日誌：灰窯出發走到腐骨沼、露宿、再進沉淵祭窟，打開日誌掃字
    const lg = await page.evaluate(() => {
      const G = window.SHL; const S = G.state;
      S.loc = 'huiyao'; G.enterHere(); S.hp = G.maxHp(); S.food = 100; S.fat = 0;
      G.toMap(); G.selectDest('fuzhao'); G.travel();
      S.combat = null; S.event = null; S.dead = null; S.loc = 'fuzhao'; G.enterHere(); G.camp();
      S.combat = null; S.event = null; S.dead = null; S.loc = 'jiku'; G.enterHere();
      S.overlay = null; G.setOverlay('log');
      return { n: S.log.length, text: S.log.map((l) => l.text).join('\n') };
    });
    await page.waitForSelector('[data-testid=overlay-log]');
    const logScr = await page.evaluate(() => document.body.innerText);
    check('[AC 21] 日誌（含趕路、露宿、進地城共 ' + lg.n + ' 行）與日誌畫面不出現「中高」', lg.n > 0 && !lg.text.includes('中高') && !logScr.includes('中高'), lg.text.split('\n').slice(-6));
    await page.evaluate(() => window.SHL.setOverlay('log'));

    // route() 第三層（險值）、第四層（節點 id 序列）tie-break；每案 × EDGES 正常／反轉 × NODES 正常／反轉 × 端點對調
    const rk = await page.evaluate(() => {
      const G = window.SHL; const D = window.SHL_DATA; const S = G.state;
      S.loc = 'huiyao'; S.scene = 'map'; S.t = Math.floor(S.t / 1440) * 1440 + 12 * 60; S.combat = null; S.event = null;
      const cases = {
        // 丙：直達野徑 2h（1 段野徑、單段 0.22×R）vs 經岔口 野徑 1h＋官道 1h（1 段野徑、多段 0.30×R）；節點序列字典序反而偏向經岔口 → 須由險值決定
        丙: { edges: [{ a: 'huiyao', b: 'duyin', h: 2 }, { a: 'huiyao', b: 'chakou', h: 1 }, { a: 'chakou', b: 'duyin', h: 1, road: true }], go: 'huiyao,duyin', back: 'duyin,huiyao' },
        // 丁：經驛站 野徑 1h＋官道 1h vs 經岔口 野徑 1h＋官道 1h：時數、野徑段數、險值都相同 → 節點 id 字典序小者（chakou < yizhan）
        丁: { edges: [{ a: 'huiyao', b: 'yizhan', h: 1 }, { a: 'yizhan', b: 'duyin', h: 1, road: true }, { a: 'huiyao', b: 'chakou', h: 1 }, { a: 'chakou', b: 'duyin', h: 1, road: true }], go: 'huiyao,chakou,duyin', back: 'duyin,chakou,huiyao' },
      };
      // 丁的回程為 duyin→chakou(官道)→huiyao(野徑)，與 duyin→yizhan→huiyao 同樣三項相同
      const keep = D.EDGES.slice(); const ks = Object.keys(D.NODES), vs = ks.map((k) => D.NODES[k]);
      const setN = (rev) => { ks.forEach((k) => delete D.NODES[k]); (rev ? ks.slice().reverse() : ks).forEach((k) => (D.NODES[k] = vs[ks.indexOf(k)])); };
      const seq = (from, e) => [from].concat(e.stops).join();
      const out = {}, info = {};
      Object.keys(cases).forEach((c) => [0, 1].forEach((er) => [0, 1].forEach((nr) => [0, 1].forEach((sw) => {
        D.EDGES.length = 0;
        let list = er ? cases[c].edges.slice().reverse() : cases[c].edges.slice();
        if (sw) list = list.map((e) => Object.assign({}, e, { a: e.b, b: e.a }));
        list.forEach((e) => D.EDGES.push(e)); setN(nr);
        const go = G.route('huiyao', 'duyin'), back = G.route('duyin', 'huiyao');
        const k = c + (er ? '・EDGES 反轉' : '・EDGES 正常') + (nr ? '・NODES 反轉' : '') + (sw ? '・端點對調' : '');
        out[k] = seq('huiyao', go) === cases[c].go && seq('duyin', back) === cases[c].back;
        if (!er && !nr && !sw) {
          // 對照：兩條候選的（時數, 野徑段數, 險值三位）
          const cand = c === '丙' ? [[list[0]], [list[1], list[2]]] : [[list[0], list[1]], [list[2], list[3]]];
          info[c] = { go: seq('huiyao', go), back: seq('duyin', back), cand: cand.map((p) => [p.reduce((x, y) => x + y.h, 0), p.filter((y) => !y.road).length, Math.floor(G.routeRisk(p, G.state.t) * 1000 + 0.5 + 1e-9)]) };
        } else if (!out[k]) info[k] = { go: seq('huiyao', go), back: seq('duyin', back) };
      }))));
      D.EDGES.length = 0; keep.forEach((e) => D.EDGES.push(e)); setN(0);
      out.restored = D.EDGES.every((e, i) => e === keep[i]) && Object.keys(D.NODES).join() === ks.join();
      return { out, info };
    });
    const ok = (c) => Object.keys(rk.out).filter((k) => k.startsWith(c));
    const ci = rk.info.丙, di = rk.info.丁;
    check('自造情境丙成立：兩條候選時數、野徑段數相同（2h、1 段），險值不同', ci && ci.cand[0][0] === ci.cand[1][0] && ci.cand[0][1] === ci.cand[1][1] && ci.cand[0][2] !== ci.cand[1][2], ci);
    check('route() 第三層：時數、野徑段數相同 → 選險值低的（直達野徑）；× EDGES 正常／反轉 × NODES 正常／反轉 × 端點對調，來回 8 組全同', ok('丙').length === 8 && ok('丙').every((k) => rk.out[k]), rk.info);
    check('自造情境丁成立：兩條候選時數、野徑段數、險值三位全同', di && JSON.stringify(di.cand[0]) === JSON.stringify(di.cand[1]), di);
    check('route() 第四層：三項全同 → 選節點 id 序列字典序小的（經 chakou）；× EDGES 正常／反轉 × NODES 正常／反轉 × 端點對調，來回 8 組全同', ok('丁').length === 8 && ok('丁').every((k) => rk.out[k]), rk.info);
    check('fix4 自造情境測後 EDGES／NODES 已還原', rk.out.restored);
  }

  // ===== V. fix5：四檔險級共用一張色表（SPEC-TIME 7.1b、AC 21；數值 18:25 裁定）；hot 只在高、極高 =====
  if (want('fix5')) {
    await fresh(page, base);
    const TIERS = ['低', '中', '高', '極高'];
    const look = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return { text: e.textContent, color: cs.color, border: cs.borderTopColor, hot: e.classList.contains('hot'), cls: e.className }; }, sel);
    // 荒野、地城標頭：逐一進入全部荒野與地城
    const ids = await page.evaluate(() => { const D = window.SHL_DATA; return Object.keys(D.WILDS).map((k) => [k, 'wild', D.WILDS[k].risk]).concat(Object.keys(D.DUNGEONS).map((k) => [k, 'dungeon', D.DUNGEONS[k].risk])); });
    const head = {};
    for (const [id, kind, tier] of ids) {
      await page.evaluate((id) => { const G = window.SHL; const S = G.state; S.known[id] = true; S.combat = null; S.event = null; S.dead = null; S.overlay = null; S.loc = id; G.enterHere(); }, id);
      await page.waitForSelector('[data-testid=' + kind + ']');
      head[id] = Object.assign({ tier, kind }, await look('[data-testid=head-risk]'));
      if (WANT_SHOTS && ['jiku', 'liekou', 'chakou'].includes(id)) {
        const dir5 = path.join(ROOT, 'docs/evidence/shots-shanhailu-dev02-fix5-1128');
        fs.mkdirSync(dir5, { recursive: true });
        const f = path.join(dir5, 'fix5-head-' + { jiku: '2-high-jiku', liekou: '3-extreme-liekou', chakou: '0-low-chakou' }[id] + '.png');
        await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 1280, height: 720 } });
        console.log('SHOT  ' + path.relative(ROOT, f));
      }
    }
    // 路程 travelPreview：在地圖上找出四檔各一條路線（白天／黑夜 × 各目的地），讀出發條「險」格
    const route = {};
    for (const hh of [12, 23]) for (const to of ['yizhan', 'chakou', 'qingwu', 'jiku', 'fuzhao']) {
      const name = await page.evaluate(([hh, to]) => {
        const G = window.SHL; const S = G.state; S.combat = null; S.event = null; S.dead = null; S.overlay = null;
        S.loc = 'huiyao'; G.enterHere(); S.t = Math.floor(S.t / 1440) * 1440 + hh * 60; S.known[to] = true;
        G.toMap(); G.selectDest(to); return G.travelPreview(to).riskName;
      }, [hh, to]);
      if (route[name]) continue;
      const el = await look('[data-testid=route-risk]');
      route[name] = Object.assign({ at: hh + ':00・' + to }, el);
    }
    const sample = TIERS.map((t) => [t, Object.keys(head).find((k) => head[k].tier === t)]);
    check('[AC 21] 荒野／地城四檔各有一處（低／中／高／極高）', sample.every(([, k]) => k), Object.fromEntries(sample));
    check('[AC 21] travelPreview 四檔各找到一條路線', TIERS.every((t) => route[t]), Object.fromEntries(TIERS.map((t) => [t, route[t] && route[t].at])));
    const colors = TIERS.map((t) => route[t] && route[t].color);
    check('[AC 21] 四檔顏色互不相同', new Set(colors).size === 4, Object.fromEntries(TIERS.map((t, i) => [t, colors[i]])));
    TIERS.forEach((t, i) => {
      const bad = Object.keys(head).filter((k) => head[k].tier === t && head[k].color !== colors[i]);
      check('[AC 21] 「' + t + '」：所有荒野、地城標頭顏色與 travelPreview 同檔一致（' + colors[i] + '）', route[t] && !bad.length, { route: route[t], heads: Object.fromEntries(Object.keys(head).filter((k) => head[k].tier === t).map((k) => [k, head[k].color])) });
    });
    const hotBad = Object.keys(head).filter((k) => head[k].hot !== (head[k].tier === '高' || head[k].tier === '極高'));
    check('hot 只在「高」「極高」：荒野、地城標頭 ' + Object.keys(head).length + ' 處', !hotBad.length, Object.fromEntries(Object.keys(head).map((k) => [k, head[k].tier + (head[k].hot ? '・hot' : '')])));
    check('hot 只在「高」「極高」：travelPreview 四檔', TIERS.every((t) => route[t] && route[t].hot === (t === '高' || t === '極高')), Object.fromEntries(TIERS.map((t) => [t, route[t] && route[t].hot])));
    check('腐骨沼（荒野）、沉淵祭窟（地城）標頭為「高」色且 hot', ['fuzhao', 'jiku'].every((k) => head[k].text === '險 高' && head[k].color === colors[2] && head[k].hot), { fuzhao: head.fuzhao, jiku: head.jiku });
  }

  // ===== 截圖（1280×720；本包無對應 UI 草稿） =====
  if (want('shots')) {
    await fresh(page, base);
    await page.evaluate(() => { const G = window.SHL; const S = G.state; G._debug.passTime(14); G.setTab('hy_inn'); G.service('rest'); G.setOverlay('log'); });
    await page.waitForSelector('[data-testid=overlay-log]');
    await shot(page, 'dev02-01-inn-rest-log.png');
    await page.evaluate(() => { const G = window.SHL; G.setOverlay('log'); G.setTab(null); });
    await shot(page, 'dev02-02-next-day-town.png');
    await page.evaluate(() => { const G = window.SHL; G._debug.startCombat(['bug', 'wolf'], { type: 'wild', node: 'chakou' }, {}); G.save(); G.setProfTab(G.state.profTab); });
    await page.waitForSelector('[data-testid=combat]');
    await page.click('[data-testid=act-attack]'); await page.waitForTimeout(200);
    await shot(page, 'dev02-03-combat.png');
  }

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
