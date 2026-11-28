/* 《山海錄》DEV-01b 取名規則＋腳程字串 — 自動化驗證（Node + Playwright，headless Chromium）
 * 用法：node tests/e2e-dev01b.js [--shots]
 *   --shots  另存 1280×720 取名畫面截圖至 docs/evidence/shots-shanhailu-dev01b-names-1128/（SHL_SHOTS_DIR 可改寫）
 * 依據：取名禁字規則定稿 v1.0（2026-11-28 17:52 mumi 拍板，製作人轉達）；dev-string-replace-batch1 v0.1 第 4 節。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS_REL = process.env.SHL_SHOTS_DIR || 'docs/evidence/shots-shanhailu-dev01b-names-1128';
const SHOTS = path.join(ROOT, SHOTS_REL);
const WANT_SHOTS = process.argv.includes('--shots');
const SEED = 20261128;

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
  results.push({ name, ok: !!ok });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined && detail !== '' ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
}
async function shot(page, name) {
  if (!WANT_SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('SHOT  ' + SHOTS_REL.replace(/\/$/, '') + '/' + name);
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

  await page.goto(base + 'index.html?seed=' + SEED + '&fresh=1&fx=0');
  await page.waitForSelector('[data-testid^=origin-]');
  const errsOf = (sur, given) => page.evaluate(([a, b]) => window.SHL.nameErrors(a, b), [sur, given]);

  // ---------- 1. nameErrors 規則 ----------
  const cases = [
    // chars
    ['ab', '衡', ['chars']], ['沈', '1', ['chars']], ['沈', 'A衡', ['chars']], ['沈 ', '衡', ['chars']], ['沈', '衡!', ['chars']], ['沈', '　衡', ['chars']],
    // length
    ['沈', '', ['length']], ['', '衡', ['length']], ['歐陽', '明月月', ['length']], ['歐陽司', '衡', ['length']], ['司', '馬明月衡', ['length']],
    // taken：整名完全相同
    ['虞', '九淵', ['taken']], ['明', '夷', ['taken']], ['鴉', '首', ['taken']], ['紅', '霧', ['taken']], ['腳', '程', ['taken']], ['撿骨', '師', ['taken']], ['破', '曉', ['taken']], ['掌', '櫃', ['taken']],
    // 不攔
    ['沈', '衡', []], ['張', '三', []], ['李', '滿', []], ['王', '衡', []], ['釋', '明', []], ['悟', '空', []], ['李', '九淵', []], ['虞', '九', []], ['明', '夷光', []], ['紅', '霧生', []],
    ['沈', '七', []], ['李', '九', []], ['萬', '十', []], ['翁', '娘', []], ['趙', '鴉', []], ['錢', '嫂', []],
  ];
  for (const [su, gi, want] of cases) {
    const got = await errsOf(su, gi);
    check('nameErrors「' + su + '｜' + gi + '」→ ' + (want.length ? want.join('＋') : '不攔'), got.join() === want.join(), got);
  }
  check('1 字（只有姓或只有名）→ length', (await errsOf('沈', '')).includes('length') && (await errsOf('', '衡')).includes('length'));
  check('5 字 → length', (await errsOf('歐陽', '明月衡')).join() === 'length' && (await errsOf('司馬', '明月衡')).join() === 'length');
  check('英數、空白 → chars', (await errsOf('沈', 'a')).join() === 'chars' && (await errsOf('沈', '9')).join() === 'chars' && (await errsOf('沈', ' 衡')).join() === 'chars');
  const listed = await page.evaluate(() => window.SHL_DATA.NAME_TAKEN.every((w) => { const a = Array.from(w), k = a.length === 4 ? 2 : 1; return window.SHL.nameErrors(a.slice(0, k).join(''), a.slice(k).join('')).join() === 'taken'; }));
  check('NAME_TAKEN 每一項整名輸入都回 taken', listed, (await page.evaluate(() => window.SHL_DATA.NAME_TAKEN.length)) + ' 項');
  const final = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  check('NAME_TAKEN 含固定角色全名、定稿第 5 節起始表（12 稱謂詞＋20 遊戲名詞）與 8 項勢力全名', await page.evaluate(() => {
    const T = window.SHL_DATA.NAME_TAKEN;
    const need = ['虞九淵', '明夷', '撿骨師', '傀母', '蠱母', '里正', '鴉首', '路人', '兇煞', '良民', '平民', '掌櫃', '先生', '客官', '守備', '紅霧', '腳程', '輕快', '平常', '沉重', '蹣跚', '鎮衙', '祭祀', '侵蝕', '破曉', '天星', '鴉衛', '拜裂', '九幽', '飲霧', '四象', '黑水', '天工', '萬神'];
    const factions = ['四象軍', '破曉軍團', '天星商會', '拜裂教', '黑水盟', '天工盟', '萬神教', '九幽殿'];
    return need.concat(factions).every((w) => T.includes(w)) && T.length === need.length + factions.length;
  }) && /const NAME_TAKEN = \[/.test(final));
  // 本地化 18:09 裁定：九大勢力全名收入（鴉衛已在），共 42 項、無重複
  const takenLen = await page.evaluate(() => [window.SHL_DATA.NAME_TAKEN.length, new Set(window.SHL_DATA.NAME_TAKEN).size]);
  check('NAME_TAKEN 共 42 項、無重複', takenLen[0] === 42 && takenLen[1] === 42, takenLen);
  for (const [su, gi] of [['四', '象軍'], ['破曉', '軍團'], ['天星', '商會'], ['拜', '裂教'], ['黑', '水盟'], ['天', '工盟'], ['萬', '神教'], ['九', '幽殿'], ['鴉', '衛']]) {
    const got = await errsOf(su, gi);
    check('勢力全名「' + su + '｜' + gi + '」→ taken', got.join() === 'taken', got);
  }
  // 非完全相同不因勢力全名被攔（「四象」「九幽」本身是遊戲名詞，照原規則仍 taken）
  for (const [su, gi, want] of [['四', '象', ['taken']], ['九', '幽', ['taken']], ['四', '象兵', []], ['四象', '軍團', []], ['九幽', '殿主', []], ['李', '九幽', []], ['破', '曉軍', []], ['天', '星會', []], ['黑', '水幫', []], ['萬', '神殿', []], ['拜', '裂', ['taken']], ['拜裂', '教主', []], ['趙', '天工', []]]) {
    const got = await errsOf(su, gi);
    check('非全名「' + su + '｜' + gi + '」→ ' + (want.length ? want.join('＋') + '（原規則）' : '不攔'), got.join() === want.join(), got);
  }

  // ---------- 2. 開局池 ----------
  const pool = await page.evaluate(() => window.SHL_DATA.NAME_POOL);
  const poolBad = await page.evaluate(() => window.SHL_DATA.NAME_POOL.filter((p) => window.SHL.nameErrors(p[0], p[1]).length).map((p) => p.join('')));
  check('NAME_POOL 60 組全部通過 nameErrors', pool.length === 60 && poolBad.length === 0, poolBad);
  const csvRows = fs.readFileSync(path.join(ROOT, 'docs/loc/name-pool-v0.1.csv'), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  check('NAME_POOL 與 name-pool-v0.1.csv 逐組一致', csvRows.length === 60 && csvRows.every((r, i) => pool[i][0] === r[2] && pool[i][1] === r[3] && r[2] + r[3] === r[4]));
  check('開局池：倪桃兒、甘菜頭在池內（第 56、57 組），倪招弟、甘細妹不在', pool[55].join('') === '倪桃兒' && pool[56].join('') === '甘菜頭' && !pool.some((p) => ['倪招弟', '甘細妹'].includes(p.join(''))) && csvRows[55][4] === '倪桃兒' && csvRows[56][4] === '甘菜頭');

  // ---------- 3. 取名畫面：taken 提示 ----------
  await page.click('[data-testid=origin-drifter]');
  await page.waitForSelector('[data-testid=naming]');
  const typeName = async (sur, given) => {
    await page.fill('[data-testid=name-sur]', sur); await page.fill('[data-testid=name-given]', given);
    return page.evaluate(() => ({ ok: !document.querySelector('[data-testid=btn-name-confirm]').disabled, rule: document.querySelector('[data-testid=name-rule]').textContent, errs: Array.from(document.querySelectorAll('[data-testid^=name-err-]')).map((e) => e.getAttribute('data-testid').slice(9)) }));
  };
  let nv = await typeName('沈', 'a');
  check('畫面 chars 提示「不可使用英數、空白或符號」（句尾無句號）', !nv.ok && nv.rule === '不可使用英數、空白或符號', nv);
  nv = await typeName('沈', '衡衡衡');
  check('畫面 length 提示「合計須為 2–4 個中文字」（句尾無句號）', !nv.ok && nv.rule === '合計須為 2–4 個中文字', nv);
  nv = await typeName('李', '九淵');
  check('畫面「李九淵」不攔、確定可按', nv.ok && !nv.errs.length, nv);
  nv = await typeName('虞', '九淵');
  check('畫面 taken 提示「這個名字已經有人用了」、確定熄滅', !nv.ok && nv.errs.join() === 'taken' && nv.rule === '這個名字已經有人用了', nv);
  check('taken 時點確定不會開局', (await page.evaluate(() => { window.SHL.confirmName('虞', '九淵'); return window.SHL.state.scene; })) === 'naming');
  await shot(page, '01-naming-taken.png');
  nv = await typeName('沈', '衡');
  check('畫面預設「沈衡」合法', nv.ok && !nv.errs.length, nv);
  await page.click('[data-testid=btn-name-confirm]');
  await page.waitForSelector('[data-testid=town]');

  // ---------- 4. 腳程三條：實機文字 ----------
  // (a) 詞綴 spd：裝備帶 +5% 腳程的鞋，hover 看 tooltip
  await page.evaluate(() => { const G = window.SHL; const e = G._debug.newEq('boots').eq; e.affixes = [{ id: 'spd', v: 5 }]; G.state.equip.boots = e; G.setProfTab(G.state.profTab); });
  await page.hover('[data-testid=slot-boots]'); await page.waitForTimeout(150);
  const tipTxt = await page.evaluate(() => document.getElementById('tip').textContent);
  check('實機：裝備 tooltip 顯示「+5% 腳程」、無「行動速度」', tipTxt.includes('+5% 腳程') && !tipTxt.includes('行動速度'), tipTxt.slice(0, 80));
  // (b) 疲累 ≥80 狀態提示
  await page.evaluate(() => { const G = window.SHL; G.state.fat = 90; G.setProfTab(G.state.profTab); });
  const stTitles = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid=statuses] .stc')).map((e) => e.getAttribute('title')));
  check('實機：疲累 90 狀態提示「力竭：命中與腳程下降」', stTitles.includes('力竭：命中與腳程下降') && !stTitles.includes('力竭：命中與速度下降'), stTitles);
  // (c) 負重 25 級 perk：人物頁與右欄熟練度提示
  await page.evaluate(() => { const G = window.SHL; G.setOverlay('char'); });
  await page.waitForTimeout(100);
  const charTxt = await page.evaluate(() => document.body.innerText);
  check('實機：人物頁負重門檻顯示「常態重負的腳程懲罰減半」', charTxt.includes('常態重負的腳程懲罰減半') && !charTxt.includes('常態重負的速度懲罰減半'));
  check('實機：人物頁仍有技能「腳力」', /腳力/.test(charTxt));
  await page.evaluate(() => window.SHL.setOverlay(null));
  const html = await page.content();
  check('實機頁面不再出現三條舊字串', !['行動速度', '命中與速度下降', '常態重負的速度懲罰減半'].some((t) => html.includes(t) || charTxt.includes(t) || tipTxt.includes(t)));

  // ---------- 5. 原始碼：舊字串清除、腳力與出手速度保留 ----------
  const src = ['js/data.js', 'js/game.js', 'js/ui.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  check('js/ 不再有「+{v}% 行動速度」「力竭：命中與速度下降」「常態重負的速度懲罰減半」', !src.includes('行動速度') && !src.includes('命中與速度下降') && !src.includes('常態重負的速度懲罰減半'));
  check('js/ 有三條新字串', src.includes("'+{v}% 腳程'") && src.includes('力竭：命中與腳程下降') && src.includes('常態重負的腳程懲罰減半'));
  const D = await page.evaluate(() => ({ jiao: window.SHL_DATA.PROFS.find((p) => p.id === 'jiao').name, shen: window.SHL_DATA.ATTRS.find((a) => a.id === 'shen').desc, spd: window.SHL_DATA.AFFIXES.spd.t }));
  check('技能「腳力」維持原名；身法說明「出手速度」與帶動列「腳力」不動', D.jiao === '腳力' && D.shen === '出手速度、閃避。帶動：閃躲、輕甲、弓弩、腳力。' && D.spd === '+{v}% 腳程' && src.includes('腳力有所長進') && src.includes("note: '耗時 1 小時・腳力'"), D);

  check('console 0 error', consoleErrors.length === 0, consoleErrors.slice(0, 5));
  await browser.close(); srv.close();
  const pass = results.filter((r) => r.ok).length;
  console.log('\n結果：' + pass + '/' + results.length + ' PASS' + (pass === results.length ? '' : '，' + (results.length - pass) + ' FAIL'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
