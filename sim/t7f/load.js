'use strict';
/* T7 最終複驗（num-shl-t7-final，複製自 sim/t7/load.js）：load(root) 可指定另一個 js/ 根目錄（用來載入上一輪被驗 d0989ba 的實作做前後對照）。
 * 原註：T7 重驗（DEV-02）：以 Node vm 唯讀載入被驗分支的 js/data.js 與 js/game.js（不修改檔案），
 * 每次呼叫 load() 都是一個全新的獨立環境（可在記憶體中改 D.SLEEP.maxH 做敏感度，不動檔案）。
 * 另提供「逐字複製」版：用正則從 js/game.js 原文抽出 function wakeTime(now){...} 本體，在只含 D 的沙盒內求值。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = { data: path.join(ROOT, 'js/data.js'), game: path.join(ROOT, 'js/game.js') };
function load(root) {
  const src = root ? { data: path.join(root, 'js/data.js'), game: path.join(root, 'js/game.js') } : SRC;
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, console, Date, Math, JSON };
  vm.createContext(ctx);
  for (const f of ['data', 'game']) vm.runInContext(fs.readFileSync(src[f], 'utf8'), ctx, { filename: 'js/' + f + '.js' });
  return { D: ctx.window.SHL_DATA, G: ctx.window.SHL, ctx };
}
// 逐字抽出 game.js 中某個 function 的原文（以「function name(」開頭、到下一個兩格縮排的「}」為止）
function verbatimFn(name) {
  const src = fs.readFileSync(SRC.game, 'utf8');
  const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}');
  const m = src.match(re); if (!m) throw new Error('js/game.js 找不到 function ' + name);
  return m[0];
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
module.exports = { load, verbatimWake, verbatimFn, grepLines, ROOT };
