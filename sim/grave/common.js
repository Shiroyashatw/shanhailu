'use strict';
/* num-shl-grave-econ 共用：SPEC-GRAVE v0.1 常數、csv 輸出（evidence/csv-grave/）。
 * 只 require 既有的 sim/lib/*、sim/civ/common.js，不改動、不呼叫它們的 run()。 */
const fs = require('fs');
const path = require('path');
const U = require('../lib/util');
const g = require('../lib/game');
const P = require('../lib/players');
const CIVM = require('../civ/common');
const CSV_DIR = path.join(U.ROOT, 'evidence', 'csv-grave');
function writeCsv(id, header, rows) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6)) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(CSV_DIR, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
const H = 18;
// G2 行情
const PRICE = { lo: 12, mid: 24, hi: 48, tag: 10 };
const M_FERRY = 0.65;
// 玩家樣板（沿用前輪：sim/civ/common.js）
const CIV = CIVM.CIV;
const CLEAN = () => CIVM.civCleaner();
const POT = P.POT_PRICE; // 9（data.js 回春藥鋪金創藥水）
const pw = CIVM.pw;
const r2 = (x) => (x === null || x === undefined || Number.isNaN(x) ? 'NA' : (Math.round(x * 100) / 100).toFixed(2));
module.exports = { U, g, P, CIV, CLEAN, writeCsv, H, PRICE, M_FERRY, POT, pw, r2, CSV_DIR };
