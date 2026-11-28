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
    // 飽食／疲累語意不變（food 10、fat 0、noRegen）：客棧睡完疲累 0、生命回滿
    const keep = await page.evaluate(() => { const G = window.SHL; const S = G.state; S.loc = 'huiyao'; S.townTab = 'hy_inn'; S.scene = 'town'; S.t = 20 * 1440 + 22 * 60; S.food = 80; S.fat = 60; S.hp = 10; G.service('rest'); return { food: S.food, fat: S.fat, hp: S.hp, max: G.maxHp() }; });
    check('[sleep] 客棧歇息：飽食 −10、疲累清零、生命回滿（沿用現況）', keep.food === 70 && keep.fat === 0 && keep.hp === keep.max, keep);
  }

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
