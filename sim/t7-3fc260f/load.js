'use strict';
/* num-shl-t7-3fc260f：複製自 sim/t7/load.js 後擴充。以 Node vm 唯讀載入 js/data.js 與 js/game.js（不修改檔案）。
 * 擴充（只在記憶體中）：
 *   load({ rev })        ：rev 為 git commit 時，用 `git show <rev>:js/...` 取原文載入（對照上一輪 d0989ba 用）；
 *   load({ mutateData }) ：data.js 跑完、game.js 跑之前，先對 window.SHL_DATA 動手（例如把 EDGES、NODES 順序反過來、加測試節點）。
 * 每次呼叫 load() 都是全新的獨立環境。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = { data: path.join(ROOT, 'js/data.js'), game: path.join(ROOT, 'js/game.js') };
function src(f, rev) { return rev ? execSync('git show ' + rev + ':js/' + f + '.js', { cwd: ROOT, maxBuffer: 64 << 20 }).toString() : fs.readFileSync(SRC[f], 'utf8'); }
function load(opt) {
  opt = opt || {};
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, console, Date, Math, JSON };
  vm.createContext(ctx);
  vm.runInContext(src('data', opt.rev), ctx, { filename: 'js/data.js' });
  if (opt.mutateData) opt.mutateData(ctx.window.SHL_DATA);
  vm.runInContext(src('game', opt.rev), ctx, { filename: 'js/game.js' });
  return { D: ctx.window.SHL_DATA, G: ctx.window.SHL, ctx };
}
function extractFn(name, rev) {
  const s = src('game', rev);
  const m = s.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}'));
  if (!m) throw new Error('js/game.js 找不到 function ' + name);
  return m[0];
}
function verbatimWake(D) {
  const text = extractFn('wakeTime');
  const box = { D }; vm.createContext(box);
  vm.runInContext(text + '\nthis.wakeTime = wakeTime;', box);
  return { fn: box.wakeTime, text };
}
// 回傳 [行號, 原文] 供報告引用
function grepLines(file, re) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n'); const out = [];
  lines.forEach((l, i) => { if (re.test(l)) out.push([i + 1, l.trim()]); });
  return out;
}
function lineOf(file, re) { const g = grepLines(file, re); return g.length ? g[0][0] : null; }
module.exports = { load, verbatimWake, extractFn, grepLines, lineOf, ROOT, src };
