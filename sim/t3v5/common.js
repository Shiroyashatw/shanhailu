'use strict';
/* num-shl-b1-t3v5 共用：v0.5 規則 R1（腳程）／R2（險級）／R3（長期委託期限）的實作，與 csv 輸出。
 * 只 require 既有的 sim/lib/*，不改動它們；csv 一律寫到 evidence/csv-t3v5/。
 * 所有「取兩位／取三位」都用 BigInt 整數運算做 half-up，避免浮點誤差。 */
const fs = require('fs');
const path = require('path');
const U = require('../lib/util');
const CSV_DIR = path.join(U.ROOT, 'evidence', 'csv-t3v5');
function writeCsv(id, header, rows) {
  fs.mkdirSync(CSV_DIR, { recursive: true });
  const esc = (v) => { const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6)) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  fs.writeFileSync(path.join(CSV_DIR, id + '.csv'), [header.join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\n') + '\n');
}
/* ---------- 十進位精確運算 ----------
 * 因子一律以「千分點」整數表示（1.000→1000、0.925→925、0.82→820、+8%→1080）。 */
const pm = (x) => { const n = Math.round(x * 1000); if (Math.abs(n - x * 1000) > 1e-6) throw new Error('因子不是千分點整數：' + x); return n; };
// 連乘後 half-up 取到 10^-digits，回傳整數（單位 10^-digits）
function mulRound(factorsPm, digits) {
  let num = 1n, den = 1n;
  factorsPm.forEach((f) => { num *= BigInt(f); den *= 1000n; });
  const scale = 10n ** BigInt(digits);
  return Number((num * scale * 2n + den) / (den * 2n)); // floor(x*scale + 0.5)，num≥0
}
// 浮點版（只用來找浮點邊界案例）
function mulRoundFloat(factorsPm, digits) { let x = 1; factorsPm.forEach((f) => (x *= f / 1000)); const s = Math.pow(10, digits); return Math.round(x * s); }

/* ---------- R1 腳程 ---------- */
// 負重檔倍率（千分點）；與 game.js:169-175 loadBand 對照見 assumptions
const LOAD = { light: 1000, normal: 820, normal25: 910, heavy: 600, heavy50: 700, over: 400 };
const LOAD_NAME = { light: '輕裝', normal: '常態重負', normal25: '常態重負（熟練 25）', heavy: '超載', heavy50: '超載（熟練 50）', over: '過量' };
/* s: {load, spd(速度詞綴%), tired, cold:'shiver'|'frozen'|null, snow:'wild'|'road'|null} → 因子陣列（千分點） */
function factors(s) {
  const f = [LOAD[s.load || 'light']];
  if (s.spd) f.push(1000 + 10 * s.spd);
  if (s.tired) f.push(850);
  if (s.cold === 'shiver') f.push(900); else if (s.cold === 'frozen') f.push(800);
  if (s.snow === 'wild') f.push(850); else if (s.snow === 'road') f.push(925);
  return f;
}
const M100 = (s) => mulRound(factors(s), 2); // M（單位 0.01）
// 變體：每項先取兩位（千分點 → 百分點 half-up）再連乘，最後再取兩位
const M100each = (s) => mulRound(factors(s).map((f) => Math.floor((f + 5) / 10) * 10), 2);
function band(m100) { return m100 >= 100 ? '輕快' : m100 >= 67 ? '平常' : m100 >= 50 ? '沉重' : '蹣跚'; }
/* 行走時間 T = ceil(2·Σ(h_i ÷ M_i)) ÷ 2，至少 0.5。legs: [[h, m100]]。精確有理數。回傳小時（0.5 的倍數）。 */
function walkHours(legs) {
  // Σ h·100/m  → 通分
  let num = 0n, den = 1n;
  legs.forEach(([h, m]) => { const hn = BigInt(Math.round(h * 2)), hd = 2n; // h 可為 0.5 的倍數
    const n2 = hn * 100n, d2 = hd * BigInt(m); num = num * d2 + n2 * den; den = den * d2; });
  const twice = num * 2n; let c = twice / den; if (c * den < twice) c += 1n; // ceil
  return Math.max(0.5, Number(c) / 2);
}
/* ---------- R2 險級 ---------- */
const TIER = ['低', '中', '高', '極高'];
const SITE_MAP = { '低': '低', '中': '中', '中高': '高', '極高': '極高' }; // 地點舊稱改名
const tierIdx = (t) => TIER.indexOf(t);
// risk 取三位（整數，單位 0.001）後分檔
function tierOf1000(r) { return r < 150 ? '低' : r < 350 ? '中' : r < 600 ? '高' : '極高'; }
const PHASE = { dawn: ['清晨', 1250], day: ['白天', 1000], dusk: ['黃昏', 1500], night: ['黑夜', 2000] };
const WXF = { sun: ['晴', 1000], rain: ['雨', 1100], fog: ['霧', 1200], snow: ['雪', 1150] };
const BASE = { road: ['官道', 40], wild1: ['野徑單段', 220], wildN: ['野徑多段', 300] };
// 精確：factors 千分點 → raw risk（單位 0.001，half-up）；封頂 850
function riskExact(factorsPm) { const raw = mulRound(factorsPm, 3); return { raw, risk: Math.min(850, raw) }; }
// 浮點 risk（R 來自世界模型時）→ 先取三位（half-up，加 1e-9 吸收浮點誤差）
function r1000(x) { return Math.floor(x * 1000 + 0.5 + 1e-9); }
/* ---------- R3 長期委託 ---------- */
const deadlineDays = (reward) => (reward < 100 ? 30 : 60);
const repFloor = (rep) => (rep >= 20 ? 20 : rep >= 10 ? 10 : 0);
function overdue(p) { // p: {rep, silver, evil, wanted}
  return { rep: Math.max(p.rep - 1, repFloor(p.rep)), silver: p.silver, evil: p.evil, wanted: p.wanted, torn: true };
}
const pctCI = (k, n) => { const [a, b] = U.wilson(k, n); return U.r3(k / n * 100) + '% [' + U.r3(a * 100) + ', ' + U.r3(b * 100) + ']'; };
module.exports = { U, writeCsv, pm, mulRound, mulRoundFloat, LOAD, LOAD_NAME, factors, M100, M100each, band, walkHours, TIER, SITE_MAP, tierIdx, tierOf1000, PHASE, WXF, BASE, riskExact, r1000, deadlineDays, repFloor, overdue, pctCI };
