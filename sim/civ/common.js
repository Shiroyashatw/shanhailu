'use strict';
/* num-shl-b1-civ 共用：平民樣板、csv 輸出（寫到 evidence/csv-civ/，不碰前一輪的 evidence/csv/）。
 * 只 require 前一輪的 sim/lib/*、sim/items/*，不改動它們。 */
const fs = require('fs');
const path = require('path');
const g = require('../lib/game');
const P = require('../lib/players');
const U = require('../lib/util');
const CSV_DIR = path.join(U.ROOT, 'evidence', 'csv-civ');
function writeCsv(id, header, rows) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : U.r3(v)) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(CSV_DIR, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
/* 起手・平民＝data.js:529 的 drifter（attr:{}、prof:{}、blade_rust＋robe、60 兩；game.js:221 起手素質全 10）。
 * 不給 gear／items → setupPlayer 沿用出身預設裝備與 game.js:258 的行囊（金創藥水×2、乾餅×2），與前一輪 P.starters()[5] 完全相同，只有名字不同。 */
const CIV = { name: '起手・平民', origin: 'drifter', attr: {}, prof: {} };
/* 古窯清理級・平民＝前一輪 P.cleaners()[5]（古窯清理級・流民），直接取用、不重寫。 */
function civCleaner() { const c = P.cleaners()[5]; return Object.assign({}, c, { name: '古窯清理級・平民' }); }
const pw = (k, n) => { const [a, b] = U.wilson(k, n); return U.r3(k / n * 100) + '% [' + U.r3(a * 100) + ', ' + U.r3(b * 100) + ']（' + k + '/' + n + '）'; };
module.exports = { g, P, U, CIV, civCleaner, writeCsv, pw };
