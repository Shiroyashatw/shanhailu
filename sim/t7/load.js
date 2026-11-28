'use strict';
/* T7 重驗（DEV-02）：以 Node vm 唯讀載入被驗分支的 js/data.js 與 js/game.js（不修改檔案），
 * 每次呼叫 load() 都是一個全新的獨立環境（可在記憶體中改 D.SLEEP.maxH 做敏感度，不動檔案）。
 * 另提供「逐字複製」版：用正則從 js/game.js 原文抽出 function wakeTime(now){...} 本體，在只含 D 的沙盒內求值。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = { data: path.join(ROOT, 'js/data.js'), game: path.join(ROOT, 'js/game.js') };
function load() {
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, console, Date, Math, JSON };
  vm.createContext(ctx);
  for (const f of ['data', 'game']) vm.runInContext(fs.readFileSync(SRC[f], 'utf8'), ctx, { filename: 'js/' + f + '.js' });
  return { D: ctx.window.SHL_DATA, G: ctx.window.SHL, ctx };
}
function verbatimWake(D) {
  const src = fs.readFileSync(SRC.game, 'utf8');
  const m = src.match(/function wakeTime\(now\) \{[\s\S]*?\n  \}/);
  if (!m) throw new Error('js/game.js 找不到 function wakeTime(now)');
  const box = { D }; vm.createContext(box);
  vm.runInContext(m[0] + '\nthis.wakeTime = wakeTime;', box);
  return { fn: box.wakeTime, text: m[0] };
}
// 回傳 [行號, 原文] 供報告引用
function grepLines(file, re) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n'); const out = [];
  lines.forEach((l, i) => { if (re.test(l)) out.push([i + 1, l.trim()]); });
  return out;
}
module.exports = { load, verbatimWake, grepLines, ROOT };
