'use strict';
/* num-shl-atb-sim 共用：兩種引擎（現行回合制＝既有 sim/lib/game.js、ATB＝sim/atb/engine.js）、玩家樣板、CSV。
 * CSV 一律寫到 evidence/csv-atb/，不碰前幾輪的 evidence/csv*。 */
const fs = require('fs');
const path = require('path');
const g = require('../lib/game');
const P = require('../lib/players');
const U = require('../lib/util');
const E = require('./engine');
const { CIV, civCleaner } = require('../civ/common');
const CSV_DIR = path.join(U.ROOT, 'evidence', 'csv-atb');
function writeCsv(id, header, rows) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : (Math.round(v * 1e6) / 1e6).toString()) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(CSV_DIR, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
/* 引擎介面：{ key, name, setupPlayer, fight, healTo, G() } */
const TB = { key: 'TB', name: '現行回合制', setupPlayer: (s, t) => g.setupPlayer(s, t), fight: (ids, o) => g.fight(ids, o), healTo: (f) => g.healTo(f), G: () => g.inst().G };
function ATB(decider) { return { key: 'ATB-' + decider, name: 'ATB・決策器 ' + decider, setupPlayer: (s, t) => E.setupPlayer(s, t), fight: (ids, o) => E.fight(ids, Object.assign({}, o, { decider })), healTo: (f) => E.healTo(f), G: () => E.inst().G }; }
const ATB_A = ATB('A'), ATB_B = ATB('B');
const pw = (k, n) => { const [a, b] = U.wilson(k, n); return U.r3(k / n * 100) + '% [' + U.r3(a * 100) + ', ' + U.r3(b * 100) + ']（' + k + '/' + n + '）'; };
const ci = (k, n) => { const [a, b] = U.wilson(k, n); return [k / n, a, b]; };
module.exports = { g, P, U, E, CIV, civCleaner, writeCsv, TB, ATB, ATB_A, ATB_B, pw, ci };
