'use strict';
/* 共用工具：亂數、統計、CSV。依據：任務書「共通要求」。 */
const fs = require('fs');
const path = require('path');

// mulberry32（與 js/game.js:15-20 的 rnd() 同一演算法）
function mulberry32(a) {
  a >>>= 0;
  return function () {
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 字串雜湊（FNV-1a 32 bit）
function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
// 世界擲骰：seed、標籤雜湊、日、序號混合後 mulberry32 第一個輸出；不與玩家亂數共用
function wrnd(seed, tag, day, i) {
  let h = (seed >>> 0) ^ hashStr(tag);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = (h ^ Math.imul((day | 0) + 0x632be5ab, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ Math.imul((i | 0) + 0x1b873593, 0x27d4eb2f)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return mulberry32(h)();
}
// 玩家亂數：每項、每 seed 一條獨立序列
function prng(seed, tag) { return mulberry32(((seed >>> 0) ^ hashStr('player:' + tag)) >>> 0); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r3 = (x) => (x === null || x === undefined || Number.isNaN(x) ? 'NA' : (Math.round(x * 1000) / 1000).toFixed(3));
const pct = (x) => r3(x * 100) + '%';
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN; }
function quantile(a, q) {
  if (!a.length) return NaN;
  const s = a.slice().sort((x, y) => x - y); const p = (s.length - 1) * q; const lo = Math.floor(p), hi = Math.ceil(p);
  return s[lo] + (s[hi] - s[lo]) * (p - lo);
}
const median = (a) => quantile(a, 0.5);
// Wilson 95% 信賴區間
function wilson(k, n) {
  if (!n) return [NaN, NaN];
  const z = 1.959964, p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
function prob(k, n) { const [a, b] = wilson(k, n); return r3(k / n) + ' [' + r3(a) + ', ' + r3(b) + ']（' + k + '/' + n + '）'; }
const ROOT = path.resolve(__dirname, '..', '..');
function writeCsv(id, header, rows) {
  const dir = path.join(ROOT, 'evidence', 'csv'); fs.mkdirSync(dir, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : r3(v)) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(dir, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
const PASS = '通過', FAIL = '未通過';
const verdict = (ok) => (ok ? PASS : FAIL);
module.exports = { mulberry32, hashStr, wrnd, prng, clamp, r3, pct, mean, median, quantile, wilson, prob, writeCsv, ROOT, PASS, FAIL, verdict };
