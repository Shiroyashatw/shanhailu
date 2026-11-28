#!/usr/bin/env node
/* 《山海錄》像素圖示總覽圖：把指定的圖放大排在遊戲底色上，輸出一張 PNG 供親眼檢查。
 * 用法：node .claude/skills/shanhai-pixel-art/scripts/sheet.js [選項] [id 或 id 前綴 ...]
 *   --out 路徑        輸出 PNG（預設 ./pixel-sheet.png；請放在 scratchpad，不要放進 repo）
 *   --scale N         放大倍數（預設 6；8 看細節、2 看遊戲裡的實際感覺）
 *   --with 前綴       另外排一列同類的既有圖示當比較（可重複）
 *   --cols N          每列幾張（預設依寬度自動）
 * 不給 id＝全部圖示。每張圖下面附 1 倍原尺寸與 id。
 * 需要 Node 與 playwright（Chromium）。
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../../..');
const FILES = ['js/icons.js', 'js/icons_npc.js', 'js/icons_more.js'].filter((f) => fs.existsSync(path.join(ROOT, f)));

const args = process.argv.slice(2);
let out = path.resolve('pixel-sheet.png'), scale = 6, cols = 0; const want = [], withs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') out = path.resolve(args[++i]);
  else if (a === '--scale') scale = Math.max(1, parseInt(args[++i], 10) || 6);
  else if (a === '--cols') cols = parseInt(args[++i], 10) || 0;
  else if (a === '--with') withs.push(args[++i]);
  else want.push(a);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
  for (const f of FILES) await page.addScriptTag({ path: path.join(ROOT, f) });
  const info = await page.evaluate(({ want, withs, scale, cols }) => {
    const I = window.SHL_ICONS; const all = I.list();
    const match = (list) => all.filter((id) => list.some((w) => id === w || id.startsWith(w)));
    const ids = want.length ? match(want) : all;
    const cmp = withs.length ? match(withs).filter((id) => !ids.includes(id)) : [];
    const css = 'body{margin:0;padding:14px;background:#0b0a08;color:#d8cfbd;font:12px monospace}'
      + 'h3{margin:10px 0 6px;font:bold 13px sans-serif;color:#c9a24a}'
      + '.g{display:flex;flex-wrap:wrap;gap:8px}.c{background:#1d1a16;border:1px solid #332e26;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px}'
      + '.px{display:block;background-size:100% 100%;image-rendering:pixelated}.one{display:flex;gap:6px;align-items:center}';
    const cell = (id) => { const s = I.size(id) || 16; const big = s * scale;
      return '<div class="c"><i class="px ic-' + id + '" style="width:' + big + 'px;height:' + big + 'px"></i><div class="one"><i class="px ic-' + id + '" style="width:' + s + 'px;height:' + s + 'px"></i><i class="px ic-' + id + '" style="width:' + s * 2 + 'px;height:' + s * 2 + 'px"></i><span>' + id + '</span></div></div>'; };
    const grid = (list) => '<div class="g"' + (cols ? ' style="max-width:' + cols * (24 * scale + 26) + 'px"' : '') + '>' + list.map(cell).join('') + '</div>';
    let h = '<style>' + css + '</style><h3>檢查中（' + ids.length + '）・放大 ' + scale + ' 倍，下方為 1 倍與 2 倍</h3>' + grid(ids);
    if (cmp.length) h += '<h3>比較用的既有圖示（' + cmp.length + '）</h3>' + grid(cmp);
    document.body.innerHTML = h;
    const missing = want.length ? want.filter((w) => !all.some((id) => id === w || id.startsWith(w))) : [];
    return { n: ids.length, cmp: cmp.length, missing };
  }, { want, withs, scale, cols });
  await page.waitForTimeout(100);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log('輸出 ' + out + '：' + info.n + ' 張' + (info.cmp ? '，另附比較 ' + info.cmp + ' 張' : '') + '。');
  if (info.missing.length) console.log('找不到：' + info.missing.join(', '));
  if (errs.length) { console.log('頁面錯誤：' + errs.join(' | ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(2); });
