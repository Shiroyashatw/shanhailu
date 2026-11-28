#!/usr/bin/env node
/* 《山海錄》像素圖示結構檢查（不需要瀏覽器）
 * 用法：node .claude/skills/shanhai-pixel-art/scripts/check.js [id 或 id 前綴 ...]
 *   不給參數＝檢查全部。例：check.js np_ pl_      check.js w_saber t_slash
 * 檢查：每列長度＝列數、尺寸為 16 或 24、每個字元都在調色盤裡、id 不重複、
 *       基礎圖示沒有被後載入的檔案弄丟。
 */
'use strict';
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../../..');
// 與 index.html 相同的載入順序：後面的檔案包住前面的登記表
const FILES = ['js/icons.js', 'js/icons_npc.js', 'js/icons_more.js'].filter((f) => fs.existsSync(path.join(ROOT, f)));

global.window = undefined; // 圖示檔在沒有 window 時改掛在 globalThis，且不畫圖
const counts = [];
for (const f of FILES) {
  require(path.join(ROOT, f));
  counts.push([f, globalThis.SHL_ICONS.list().length]);
}
const I = globalThis.SHL_ICONS;
if (!I) { console.error('找不到 SHL_ICONS：圖示檔沒有正確登記。'); process.exit(2); }

const all = I.list();
const want = process.argv.slice(2);
const ids = want.length ? all.filter((id) => want.some((w) => id === w || id.startsWith(w))) : all;
const fails = [];

const none = want.filter((w) => !all.some((id) => id === w || id.startsWith(w)));
if (none.length) fails.push('找不到符合的圖示：' + none.join(' '));
const dup = all.filter((id, i) => all.indexOf(id) !== i);
if (dup.length) fails.push('重複的 id：' + [...new Set(dup)].join(', '));
for (let k = 1; k < counts.length; k++) {
  if (counts[k][1] < counts[k - 1][1]) fails.push(counts[k][0] + ' 載入後圖示變少了（' + counts[k - 1][1] + ' → ' + counts[k][1] + '），登記表被覆蓋而不是擴充。');
}

for (const id of ids) {
  const r = I.raw(id);
  if (!r) { fails.push(id + '：raw() 取不到資料'); continue; }
  const n = r.rows.length;
  if (n !== 16 && n !== 24) fails.push(id + '：尺寸 ' + n + '（只能是 16 或 24）');
  if (I.size(id) !== n) fails.push(id + '：size() 回報 ' + I.size(id) + '，實際 ' + n + ' 列');
  r.rows.forEach((row, y) => {
    if (row.length !== n) fails.push(id + '：第 ' + y + ' 列長度 ' + row.length + '，應為 ' + n + '　' + JSON.stringify(row));
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.' && !r.palette[ch]) fails.push(id + '：第 ' + y + ' 列第 ' + x + ' 格的字元「' + ch + '」不在調色盤裡');
    }
  });
  const used = new Set(r.rows.join('').replace(/\./g, ''));
  if (used.size === 0) fails.push(id + '：整張是空的');
}

const by = {};
ids.forEach((id) => { const s = I.size(id); by[s] = (by[s] || 0) + 1; });
console.log('載入：' + counts.map((c) => c[0] + '（累計 ' + c[1] + '）').join('、'));
console.log('檢查 ' + ids.length + ' 張：' + Object.keys(by).map((s) => s + '×' + s + ' ' + by[s] + ' 張').join('、'));
if (fails.length) {
  console.log('\n失敗 ' + fails.length + ' 項：');
  fails.slice(0, 60).forEach((f) => console.log('  ' + f));
  if (fails.length > 60) console.log('  …另有 ' + (fails.length - 60) + ' 項');
  process.exit(1);
}
console.log('全部通過。');
