/* shanhailu-check18-1128：PR #18（DEV-01b）獨立驗收腳本（一次性）
 * 用法（repo 根目錄）：NODE_PATH=$(npm root -g) node docs/evidence/shots-shanhailu-check18-1128/check18.js
 * 期望值一律取自規格（同目錄 spec-naming-banned-chars-final-v1.0.md，為 docs/batch1-specs 分支定稿原文副本）
 * 與本地化 18:09 裁定，不取自被驗程式碼。截圖存同目錄。
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const HERE = __dirname;
const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const res = [];
const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  — ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); };

// ---- 期望值：從定稿第 2、3、5 節解析 ----
const spec = fs.readFileSync(path.join(HERE, 'spec-naming-banned-chars-final-v1.0.md'), 'utf8');
const sec = (n) => spec.split(/^## /m).find((s) => s.startsWith(n + '.'));
const s5 = sec(5);
const listAfter = (label) => s5.match(new RegExp('^' + label + '：(.+)$', 'm'))[1].split('、').map((x) => x.trim());
const TITLES = listAfter('稱謂詞'), NOUNS = listAfter('遊戲名詞');
const FACTIONS = s5.match(/9 個：(.+?)。/)[1].split('、');
const FIXED = Array.from(sec(3).match(/固定角色全名：(.+)/)[1].matchAll(/`([^`]+)`/g)).map((m) => m[1]);
const msgRow = (key) => (sec(2) + sec(3)).match(new RegExp('\\| `' + key + '` \\| (.+?) \\|'))[1];
const WANT_MSG = { chars: msgRow('chars'), length: msgRow('length'), taken: msgRow('taken') };
const EXPECT = Array.from(new Set(FIXED.concat(TITLES, NOUNS, FACTIONS)));
console.log('INFO  規格解析：固定角色 ' + FIXED.length + '、稱謂詞 ' + TITLES.length + '、遊戲名詞 ' + NOUNS.length + '、勢力全名 ' + FACTIONS.length + '（去重後共 ' + EXPECT.length + '）');
console.log('INFO  規格提示句：' + JSON.stringify(WANT_MSG));

function serve() {
  return new Promise((ok) => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } const t = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream'; r.writeHead(200, { 'Content-Type': t }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => ok(s)); });
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await chromium.launch();
  const page = await (await br.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();
  const cerr = []; page.on('console', (m) => m.type() === 'error' && cerr.push(m.text())); page.on('pageerror', (e) => cerr.push(e.message));
  await page.goto(base + 'index.html?seed=11281128&fresh=1&fx=0');
  await page.waitForSelector('[data-testid^=origin-]');
  const NE = (a, b) => page.evaluate(([x, y]) => window.SHL.nameErrors(x, y), [a, b]);

  // ===== A. NAME_TAKEN =====
  const T = await page.evaluate(() => window.SHL_DATA.NAME_TAKEN.slice());
  check('NAME_TAKEN 共 42 項', T.length === 42, T.length);
  check('NAME_TAKEN 無重複', new Set(T).size === T.length);
  check('規格期望（第 5 節起始表＋固定角色＋九大勢力全名）去重後 42 項', EXPECT.length === 42, EXPECT.length);
  const missing = EXPECT.filter((w) => !T.includes(w)), extra = T.filter((w) => !EXPECT.includes(w));
  check('NAME_TAKEN 與規格逐項一致（無缺、無多）', !missing.length && !extra.length, { missing, extra });
  // 每項整名、所有合法切法（姓 1–2、名 1–2）都回 taken；不合法切法只報 length
  const badSplit = [];
  for (const w of T) {
    const a = Array.from(w);
    for (let k = 1; k < a.length; k++) {
      const su = a.slice(0, k).join(''), gi = a.slice(k).join('');
      const legal = k <= 2 && a.length - k <= 2;
      const got = (await NE(su, gi)).join();
      if (got !== (legal ? 'taken' : 'length')) badSplit.push(su + '｜' + gi + '→' + got);
    }
  }
  check('每項整名（所有合法姓名切法）回 taken；切法超長只報 length', !badSplit.length, badSplit);
  for (const w of ['平民', '先生', '客官', '路人']) check('整名「' + w + '」→ taken', (await NE(w[0], w[1])).join() === 'taken');
  // 同時犯 chars 只報 chars（不再報 taken）
  check('「鴉 ｜首」（含空白）只報 chars', (await NE('鴉 ', '首')).join() === 'chars');
  check('「破曉軍｜團」只報 length（不報 taken）', (await NE('破曉軍', '團')).join() === 'length');

  // ===== B. 不攔 =====
  for (const n of ['沈衡', '張三', '萬十', '李滿', '王衡', '釋明', '悟空', '李九淵']) {
    const a = Array.from(n), su = a[0], gi = a.slice(1).join('');
    const got = await NE(su, gi);
    check('「' + su + '｜' + gi + '」不攔', got.length === 0, got);
  }

  // ===== C. chars／length =====
  for (const [su, gi, want, why] of [['Li', '衡', 'chars', '英文'], ['沈', '9', 'chars', '數字'], ['沈', '衡 ', 'chars', '半形空白'], ['沈', '　衡', 'chars', '全形空白'], ['沈', '', 'length', '1 字'], ['', '衡', 'length', '1 字（無姓）'], ['歐陽', '明月衡', 'length', '5 字'], ['司馬明', '月衡', 'length', '5 字（姓 3）']]) {
    const got = await NE(su, gi);
    check(why + '「' + su + '｜' + gi + '」→ ' + want, got.join() === want, got);
  }

  // ===== D. NAME_MSG =====
  const ui = R('js/ui.js');
  const m = ui.match(/const NAME_MSG = \{ chars: '([^']*)', length: '([^']*)', taken: '([^']*)' \};/);
  check('ui.js NAME_MSG 三句與定稿字面一致', !!m && m[1] === WANT_MSG.chars && m[2] === WANT_MSG.length && m[3] === WANT_MSG.taken, m && m.slice(1));
  check('三句句尾皆無句號', !!m && m.slice(1).every((s) => !/[。.]$/.test(s)));

  // ===== E. NAME_POOL =====
  const pool = await page.evaluate(() => window.SHL_DATA.NAME_POOL);
  const csv = R('docs/design/batch1/name-pool-v0.1.csv').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  const diffs = [];
  csv.forEach((r, i) => { if (!pool[i] || pool[i][0] !== r[2] || pool[i][1] !== r[3] || r[2] + r[3] !== r[4]) diffs.push(i + 1); });
  check('NAME_POOL 60 組、CSV 60 列、逐組一致', pool.length === 60 && csv.length === 60 && !diffs.length, diffs);
  const full = pool.map((p) => p.join(''));
  check('含倪桃兒、甘菜頭；不含倪招弟、甘細妹', full.includes('倪桃兒') && full.includes('甘菜頭') && !full.includes('倪招弟') && !full.includes('甘細妹'));
  const poolBad = [];
  for (const p of pool) { const e = await NE(p[0], p[1]); if (e.length) poolBad.push(p.join('') + ':' + e); }
  check('NAME_POOL 全部通過 nameErrors', !poolBad.length, poolBad);

  // ===== F. 腳程字串／腳力／出手速度 =====
  const src = ['js/data.js', 'js/game.js', 'js/ui.js'].map(R).join('\n');
  check('新字串存在：+{v}% 腳程／力竭：命中與腳程下降／常態重負的腳程懲罰減半', src.includes("'+{v}% 腳程'") && src.includes('力竭：命中與腳程下降') && src.includes('常態重負的腳程懲罰減半'));
  check('舊字串不存在：+{v}% 行動速度／力竭：命中與速度下降／常態重負的速度懲罰減半', !src.includes('行動速度') && !src.includes('命中與速度下降') && !src.includes('常態重負的速度懲罰減半'));
  const D = await page.evaluate(() => ({ jiao: window.SHL_DATA.PROFS.find((p) => p.id === 'jiao'), shen: window.SHL_DATA.ATTRS.find((a) => a.id === 'shen').desc, fuz50: window.SHL_DATA.PROFS.find((p) => p.id === 'fuz').perks[50] }));
  check('技能「腳力」未改（name、how、perk）', D.jiao.name === '腳力' && D.jiao.how === '趕路' && D.jiao.perks[25] === '野徑遇險 −20%', D.jiao);
  check('身法說明「出手速度、閃避。帶動：閃躲、輕甲、弓弩、腳力。」未改', D.shen === '出手速度、閃避。帶動：閃躲、輕甲、弓弩、腳力。', D.shen);
  check('負重 50 級「超載懲罰減輕」未動', D.fuz50 === '超載懲罰減輕', D.fuz50);

  // ===== G. 畫面截圖 =====
  await page.click('[data-testid=origin-drifter]');
  await page.waitForSelector('[data-testid=naming]');
  const typeName = async (su, gi) => { await page.fill('[data-testid=name-sur]', su); await page.fill('[data-testid=name-given]', gi); await page.waitForTimeout(150); return page.evaluate(() => ({ ok: !document.querySelector('[data-testid=btn-name-confirm]').disabled, rule: document.querySelector('[data-testid=name-rule]').textContent })); };
  let v = await typeName('四', '象軍');
  check('畫面「四象軍」：確定熄滅，提示「' + WANT_MSG.taken + '」', !v.ok && v.rule === WANT_MSG.taken, v);
  await page.screenshot({ path: path.join(HERE, '01-naming-sixiangjun-taken.png') });
  v = await typeName('張', '三');
  check('畫面「張三」：確定可按、無錯誤提示', v.ok && !v.rule.includes(WANT_MSG.taken), v);
  await page.screenshot({ path: path.join(HERE, '02-naming-zhangsan-ok.png') });
  const size = await page.evaluate(() => [innerWidth, innerHeight]);
  check('截圖 viewport 1280×720', size[0] === 1280 && size[1] === 720, size);
  check('console 0 error', !cerr.length, cerr.slice(0, 5));

  await br.close(); srv.close();
  const p = res.filter(Boolean).length;
  console.log('\n結果：' + p + '/' + res.length + ' PASS' + (p === res.length ? '' : '，' + (res.length - p) + ' FAIL'));
  process.exit(p === res.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
