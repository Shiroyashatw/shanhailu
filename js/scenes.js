/* 山海錄 v0.2.5 — 場景背景。
 * 全部在載入時以程式繪成低解析度像素畫（整數座標矩形填色、無漸層、無外部圖檔），
 * 轉成 data URL 後注入一張 <style>：.sc-<id>{background-image:…}，以 2× pixelated 顯示。
 * window.SHL_SCENES = { has(id), list(), buildings:{town_huiyao:{…}, town_duyin:{…}} }
 * buildings 的值為 [x, y, w, h]（顯示像素＝原生座標 ×2），由繪製函式回傳的外框換算而來。 */
(function () {
'use strict';
var T0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
var W = 0, H = 0, D = null, CC = {}, URLS = {}, SIZES = {}, BLD = {};
var fl = Math.floor, rd = Math.round, sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs;

/* ---------- 調色盤 ---------- */
var K0 = '#0f0e0c', K1 = '#1a1815', KK = '#0a0908',
    A0 = '#2e2c29', A1 = '#3d3a36', A2 = '#4f4b45', A3 = '#66615a', A4 = '#857f75',
    I3 = '#2a3643',
    WD0 = '#1f1610', WD1 = '#2b1f16', WD2 = '#3b2a1c', WD3 = '#4d3724', WD4 = '#634a30', WD5 = '#7d6040',
    RED = '#b5382c', RD1 = '#8c2c22', RD2 = '#5e1f19',
    GOLD = '#c9a24a', GD1 = '#8a6c2e', GD2 = '#5c4a22',
    JADE = '#5f9a7a', JD1 = '#3f6d57', JD2 = '#2a4a3c', JD3 = '#1a2e26',
    PAR = '#d8cfbd', PA1 = '#a59c88', PA2 = '#7b735f',
    BZ0 = '#2e2616', BZ1 = '#4a3d22', BZ2 = '#6b5a30', BZ3 = '#93803f',
    EMB = '#e0863a', EMH = '#f2c46a', LIT = '#7a5a24', LIH = '#a37c34',
    PL0 = '#2a2620', PL1 = '#39332a',
    BN0 = '#4e493d', BN1 = '#6f6858', BN2 = '#8f8672', BN3 = '#aea48f',
    SL = ['#14181c', '#222930', '#323b44', '#46515a'],
    ST = ['#1c1b1a', '#32302d', '#434039'];

/* ---------- 基礎繪圖（自管像素緩衝，等同整數 fillRect） ---------- */
function rgb(c) { var v = CC[c]; if (!v) { var n = parseInt(c.slice(1), 16); v = CC[c] = [n >> 16 & 255, n >> 8 & 255, n & 255]; } return v; }
function R(x, y, w, h, c, a) {
  x = rd(x); y = rd(y); w = rd(w); h = rd(h);
  var x1 = x + w, y1 = y + h; if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > W) x1 = W; if (y1 > H) y1 = H;
  if (x1 <= x || y1 <= y) return;
  var v = rgb(c), r = v[0], g = v[1], b = v[2], i, xx, yy;
  if (a === undefined || a >= 1) {
    for (yy = y; yy < y1; yy++) { i = (yy * W + x) * 4; for (xx = x; xx < x1; xx++) { D[i] = r; D[i + 1] = g; D[i + 2] = b; i += 4; } }
  } else {
    var ia = 1 - a; r *= a; g *= a; b *= a;
    for (yy = y; yy < y1; yy++) { i = (yy * W + x) * 4; for (xx = x; xx < x1; xx++) { D[i] = D[i] * ia + r; D[i + 1] = D[i + 1] * ia + g; D[i + 2] = D[i + 2] * ia + b; i += 4; } }
  }
}
function P(x, y, c, a) { R(x, y, 1, 1, c, a); }
function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* 網點：m=1 25%、m=2 50%、m=3 75% */
function Dz(x, y, w, h, c, m, a) {
  x = rd(x); y = rd(y); w = rd(w); h = rd(h);
  for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) {
    var q = (j & 1) ? ((i & 3) === 2) : ((i & 3) === 0);
    if (m === 2 ? ((i + j) & 1) === 0 : m === 1 ? q : !q) R(i, j, 1, 1, c, a);
  }
}
function bands(x, y, w, h, cols) {
  var n = cols.length, bh = h / n;
  for (var k = 0; k < n; k++) {
    var y0 = rd(y + k * bh), y1 = rd(y + (k + 1) * bh);
    R(x, y0, w, y1 - y0, cols[k]);
    if (k > 0) { Dz(x, y0 - 2, w, 1, cols[k], 1); Dz(x, y0 - 1, w, 1, cols[k], 2); Dz(x, y0, w, 1, cols[k - 1], 1); }
  }
}
function E(cx, cy, rx, ry, c, a, m) {
  cx = rd(cx); cy = rd(cy); rx = rd(rx); ry = rd(ry);
  for (var dy = -ry; dy <= ry; dy++) {
    var hw = fl(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))) + 0.5);
    if (m) Dz(cx - hw, cy + dy, 2 * hw + 1, 1, c, m, a); else R(cx - hw, cy + dy, 2 * hw + 1, 1, c, a);
  }
}
function L(x0, y0, x1, y1, c, t, a) {
  x0 = rd(x0); y0 = rd(y0); x1 = rd(x1); y1 = rd(y1); t = t || 1;
  var dx = abs(x1 - x0), dy = abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx - dy, e2;
  for (;;) { R(x0, y0, t, t, c, a); if (x0 === x1 && y0 === y1) break; e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } }
}
/* 梯形：列 y0..y1，左緣 l0→l1，右緣 r0→r1（右緣不含） */
function T(y0, y1, l0, r0, l1, r1, c, a, m) {
  var n = y1 - y0;
  for (var j = 0; j <= n; j++) {
    var t = n ? j / n : 0, l = rd(l0 + (l1 - l0) * t), r = rd(r0 + (r1 - r0) * t);
    if (m) Dz(l, y0 + j, r - l, 1, c, m, a); else R(l, y0 + j, r - l, 1, c, a);
  }
}
function S(x, y, rows, pal) { for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) { var c = pal[rows[j][i]]; if (c) P(x + i, y + j, c); } }
function prof(r, n, base, amp, rough) {
  var a = [], p1 = r() * 7, p2 = r() * 7, p3 = r() * 7, w = 0;
  for (var i = 0; i < n; i++) { w = (w + (r() - 0.5) * rough) * 0.9; a.push(rd(base + sin(i / 37 + p1) * amp + sin(i / 13 + p2) * amp * 0.4 + sin(i / 5 + p3) * amp * 0.12 + w)); }
  return a;
}
function hill(pf, yb, c, edge) { for (var x = 0; x < W; x++) { R(x, pf[x], 1, yb - pf[x], c); if (edge) P(x, pf[x], edge); } }
function glow(cx, cy, r, c, a) { E(cx, cy, r, rd(r * 0.8), c, a); E(cx, cy, rd(r * 0.62), rd(r * 0.5), c, a); E(cx, cy, rd(r * 0.3), rd(r * 0.25), c, a * 1.5); }
function mist(r, y, h, c, a, x0, x1) {
  x0 = x0 || 0; x1 = x1 || W;
  for (var j = 0; j < h; j++) {
    var d = abs(j - (h - 1) / 2) / (h / 2), al = a * (d < 0.45 ? 0.55 : 0.28), x = x0 - fl(r() * 30);
    while (x < x1) { var len = 24 + fl(r() * 80), xs = Math.max(x, x0); R(xs, y + j, Math.min(x + len, x1) - xs, 1, c, al); x += len + fl(r() * 30 * (d + 0.2)); }
  }
}
function smoke(r, x, y, n, drift, c, a) {      // n 團漸大漸淡的煙
  var px = x, py = y;
  for (var i = 0; i < n; i++) {
    var t = i / n, rad = 1 + t * 4.5, al = a * (1 - t * 0.8);
    px += drift * (1 + t * 3) + (r() - 0.5) * 2; py -= 1.5 + rad * 0.9;
    E(px, py, rad, rad * 0.75, c, al); E(px - rad * 0.3, py - rad * 0.3, rad * 0.5, rad * 0.4, c, al * 0.5);
  }
}
function rock(cx, yb, w, h, pal) {            // 平頂稜角岩：頂面受光、右面背光
  cx = rd(cx); yb = rd(yb); w = Math.max(2, rd(w)); h = Math.max(1, rd(h));
  for (var j = 0; j < h; j++) {
    var t = (j + 1) / h, hw = Math.max(1, rd(w / 2 * Math.min(1, 0.32 + 0.75 * Math.pow(t, 0.7)))), l = cx - hw - rd((1 - t) * w * 0.1), y = yb - h + j;
    var bx = rd(l + hw * 1.35 + (j - h / 2) * 0.35);
    R(l, y, 2 * hw, 1, pal[1]);
    if (bx < l + 2 * hw) R(bx, y, l + 2 * hw - bx, 1, pal[0]);
    if (j < h * 0.3) R(l, y, Math.max(1, Math.min(bx, l + 2 * hw) - l), 1, pal[2]); else P(l, y, pal[2]);
  }
}
function stone(x, y, w, h, r, pal, bh, bw) {
  pal = pal || ST; bh = bh || 4; bw = bw || 7;
  function B(ax, ay, aw, ah, c) { var x0 = Math.max(ax, x), y0 = Math.max(ay, y), x1 = Math.min(ax + aw, x + w), y1 = Math.min(ay + ah, y + h); if (x1 > x0 && y1 > y0) R(x0, y0, x1 - x0, y1 - y0, c); }
  R(x, y, w, h, pal[1]);
  for (var j = 0; j * bh < h; j++) {
    var yy = y + j * bh, off = (j % 2) * fl(bw / 2);
    B(x, yy + bh - 1, w, 1, pal[0]);
    for (var i = x - off; i < x + w; i += bw) {
      B(i + bw - 1, yy, 1, bh - 1, pal[0]);
      var q = r(); if (q < 0.2) B(i, yy, bw - 1, bh - 1, pal[2]); else if (q < 0.45) B(i, yy, bw - 1, 1, pal[2]);
    }
  }
}

/* ---------- 建築零件 ---------- */
function roof(x, y, w, h, ins, pal) {     // 簷口橫跨 x..x+w-1（列 y+h-1），屋脊在列 y
  pal = pal || SL; var c, i;
  for (i = 0; i < h; i++) {
    var t = (h - 1 - i) / (h - 1 || 1), n = rd(ins * Math.pow(t, 0.6)), l = x + n, rr = x + w - n;
    R(l, y + i, rr - l, 1, pal[1]);
    for (c = x + Math.ceil(n / 3) * 3; c < rr; c += 3) P(c, y + i, pal[0]);
    if (i % 2 === 0) for (c = x + Math.ceil(n / 3) * 3 + 1; c < l + (rr - l) * 0.5; c += 3) P(c, y + i, pal[2]);
  }
  R(x + ins - 1, y - 1, w - 2 * ins + 2, 2, pal[2]); R(x + ins - 1, y - 1, fl((w - 2 * ins) / 2), 1, pal[3]);
  P(x + ins - 2, y - 2, pal[2]); P(x + ins - 2, y - 1, pal[2]); P(x + w - ins + 1, y - 2, pal[1]); P(x + w - ins + 1, y - 1, pal[1]);
  var ey = y + h - 1; R(x - 1, ey, w + 2, 1, pal[2]);
  for (c = x - 1; c < x + w * 0.6; c += 2) P(c, ey, pal[3]);
  P(x - 2, ey - 1, pal[2]); P(x - 3, ey - 2, pal[3]); P(x + w + 1, ey - 1, pal[1]); P(x + w + 2, ey - 2, pal[1]);
  R(x + 1, ey + 1, w - 2, 1, KK);
}
function twall(x, y, w, h, posts) {
  R(x, y, w, h, PL1); R(x + fl(w * 0.62), y, w - fl(w * 0.62), h, PL0, 0.6);
  R(x, y, w, 1, WD1); R(x, y + h - 1, w, 1, WD0);
  for (var i = 0; i < posts.length; i++) { R(x + posts[i], y, 2, h, WD1); R(x + posts[i], y, 1, h, WD3); }
}
function win(x, y, w, h, lit) {
  R(x - 1, y - 1, w + 2, h + 2, WD1); R(x, y, w, h, lit ? LIT : '#14110e'); if (lit) R(x, y, w, 2, LIH);
  for (var i = x + 2; i < x + w; i += 3) R(i, y, 1, h, lit ? WD1 : '#241c14');
  R(x, y + fl(h / 2), w, 1, lit ? WD1 : '#241c14');
}
function lantern(x, y, r) {
  glow(x, y + 4, r || 8, RED, 0.07);
  P(x, y, KK); R(x - 1, y + 1, 3, 1, GD1); R(x - 1, y + 2, 3, 1, RED); R(x - 2, y + 3, 5, 3, RED); R(x - 1, y + 6, 3, 1, RD1);
  R(x + 2, y + 3, 1, 3, RD1); P(x - 1, y + 3, '#d9705c'); P(x, y + 7, GD1); P(x, y + 8, GD2);
}
function brazier(x, y) {                  // x 中心、y 腳底
  glow(x, y - 9, 11, EMB, 0.07);
  P(x - 2, y - 1, A0); P(x + 2, y - 1, A0); R(x - 1, y - 4, 1, 3, A0); R(x + 1, y - 4, 1, 3, A0);
  R(x - 3, y - 6, 7, 2, A1); R(x - 3, y - 6, 3, 1, A3); R(x - 2, y - 8, 5, 2, RD1); R(x - 1, y - 9, 3, 2, RED);
  P(x, y - 8, EMB); P(x - 1, y - 10, EMB); P(x, y - 11, EMH); P(x + 1, y - 9, EMB); P(x, y - 13, RD1);
}
function barrel(x, y, w, h) { R(x, y, w, h, WD2); R(x, y, 1, h, WD3); R(x + w - 1, y, 1, h, WD0); R(x, y + 2, w, 1, A0); R(x, y + h - 3, w, 1, A0); R(x + 1, y, w - 2, 1, WD4); }
function crate(x, y, w, h) { R(x, y, w, h, WD2); R(x, y, w, 1, WD4); R(x, y, 1, h, WD3); R(x + w - 1, y, 1, h, WD0); R(x, y + h - 1, w, 1, WD0); L(x + 1, y + 1, x + w - 2, y + h - 2, WD1); }
function sack(x, y, w, h) { E(x + w / 2, y + h / 2, w / 2, h / 2, '#4a4334'); R(x + 1, y + h - 2, w - 1, 2, '#4a4334'); P(x + fl(w / 2), y - 1, '#5c5443'); P(x + 2, y + 2, '#6a614d'); }
function jar(x, y) { R(x + 1, y, 3, 1, A1); R(x, y + 1, 5, 4, '#2c2622'); R(x + 1, y + 5, 3, 1, '#2c2622'); P(x + 1, y + 2, A2); }
function hang(x, y, k) {
  P(x, y, WD0); P(x, y + 1, WD0);
  if (k === 'g') { P(x, y + 2, GD1); R(x - 1, y + 3, 3, 3, GD1); P(x - 1, y + 3, GOLD); P(x, y + 6, GD2); }
  else if (k === 'f') { R(x, y + 2, 2, 5, A3); P(x, y + 2, A4); P(x - 1, y + 7, A2); P(x + 2, y + 7, A2); P(x + 1, y + 4, A1); }
  else if (k === 'h') { R(x - 1, y + 2, 3, 4, JD1); P(x - 1, y + 5, JADE); P(x + 1, y + 3, JADE); P(x, y + 6, JD2); }
  else if (k === 'c') { for (var i = 0; i < 6; i++) P(x + (i % 2 ? 0 : (i % 4 ? 1 : -1)), y + 2 + i, i % 2 ? RED : RD1); }
  else if (k === 'm') { R(x, y + 2, 2, 6, RD2); P(x, y + 3, RD1); P(x + 1, y + 6, '#3d1512'); }
  else if (k === 'p') { R(x - 1, y + 2, 4, 6, A2); R(x - 1, y + 2, 1, 5, A3); P(x - 1, y + 8, A2); P(x + 2, y + 8, A2); }
  else if (k === 'b') { R(x - 1, y + 2, 3, 8, I3); R(x - 1, y + 2, 1, 8, '#3a4a5a'); }
}
function paper(x, y, w, h, o) {
  o = o || {}; R(x, y, w, h, PA1); R(x, y, w, 1, '#c2b8a2'); R(x + w - 1, y + 1, 1, h - 1, PA2);
  for (var j = y + 2; j < y + h - 1; j += 2) R(x + 1, j, w - 2 - ((j * 7) % 3), 1, '#5a5448');
  if (o.face) { R(x + 2, y + 2, w - 4, 5, '#8c8370'); R(x + 3, y + 2, w - 6, 3, '#4a4338'); P(x + fl(w / 2), y + 5, '#4a4338'); }
  if (o.seal) { R(x + w - 4, y + h - 4, 3, 3, RED); P(x + w - 3, y + h - 3, RD1); }
  P(x + fl(w / 2), y, A0);
}
function awning(x, y, w, h, c1, c2, sw) {
  for (var i = 0; i < w; i++) R(x + i, y, 1, h + ((i % 4 === 1 || i % 4 === 2) ? 1 : 0), (fl(i / sw) % 2) ? c1 : c2);
  R(x, y + h - 2, w, 2, KK, 0.3); R(x + fl(w * 0.55), y, w - fl(w * 0.55), h, KK, 0.2);
}
function glyph(x, y, c, k) {              // 仿字的小金紋（非文字）
  var g = [['111', '101', '111', '010'], ['010', '111', '010', '101'], ['110', '011', '110', '111'], ['101', '111', '010', '111']][k % 4];
  for (var j = 0; j < 4; j++) for (var i = 0; i < 3; i++) if (g[j][i] === '1') P(x + i, y + j, c);
}

/* ---------- 灰窯鎮建築 ---------- */
function marketA(x, by) {
  R(x + 1, by, 88, 2, KK, 0.6);
  /* 攤一：紅條布篷 */
  R(x + 4, by - 40, 26, 26, '#15120f');
  R(x + 3, by - 41, 2, 41, WD2); R(x + 3, by - 41, 1, 41, WD4); R(x + 29, by - 41, 2, 41, WD2);
  R(x + 1, by - 47, 32, 1, WD4); awning(x + 1, by - 46, 32, 7, RD1, PA2, 4);
  hang(x + 8, by - 38, 'g'); hang(x + 13, by - 38, 'c'); hang(x + 18, by - 38, 'f'); hang(x + 23, by - 38, 'h'); hang(x + 26, by - 38, 'c');
  R(x + 2, by - 16, 30, 2, WD4); R(x + 2, by - 16, 30, 1, WD5); R(x + 3, by - 14, 28, 14, WD2);
  for (var i = 0; i < 5; i++) R(x + 8 + i * 6, by - 14, 1, 14, WD1);
  R(x + 5, by - 20, 8, 4, WD3); R(x + 5, by - 20, 8, 1, WD5); P(x + 6, by - 21, RD1); P(x + 8, by - 21, RED); P(x + 10, by - 21, RD1); P(x + 7, by - 22, RD1); P(x + 9, by - 22, RED);
  jar(x + 15, by - 22); jar(x + 21, by - 22); R(x + 27, by - 19, 3, 3, GD1); P(x + 27, by - 19, GOLD);
  /* 攤二：靛青尖頂帳 */
  R(x + 35, by - 44, 24, 30, '#13110e');
  R(x + 34, by - 46, 2, 46, WD2); R(x + 34, by - 46, 1, 46, WD4); R(x + 58, by - 46, 2, 46, WD2);
  T(by - 57, by - 48, x + 46, x + 48, x + 32, x + 62, I3); T(by - 57, by - 48, x + 46, x + 47, x + 32, x + 40, '#3a4a5a');
  T(by - 55, by - 48, x + 47, x + 48, x + 50, x + 62, '#1e2833'); R(x + 46, by - 60, 1, 4, WD4); R(x + 47, by - 60, 3, 2, RD1);
  awning(x + 32, by - 47, 30, 4, I3, PA2, 3);
  L(x + 40, by - 40, x + 54, by - 40, WD5); R(x + 47, by - 42, 1, 3, WD4); R(x + 40, by - 39, 1, 4, A1); R(x + 54, by - 39, 1, 4, A1);
  R(x + 38, by - 35, 5, 1, BZ3); R(x + 39, by - 34, 3, 1, BZ1); R(x + 52, by - 35, 5, 1, BZ3); R(x + 53, by - 34, 3, 1, BZ1);
  R(x + 35, by - 18, 24, 2, WD4); R(x + 35, by - 18, 24, 1, WD5); R(x + 36, by - 16, 22, 16, WD1);
  crate(x + 37, by - 11, 10, 11); crate(x + 48, by - 9, 9, 9); crate(x + 40, by - 26, 8, 8);
  R(x + 50, by - 23, 7, 5, WD3); R(x + 50, by - 23, 7, 1, WD5); P(x + 51, by - 24, JD1); P(x + 53, by - 24, JADE); P(x + 55, by - 24, JD1); P(x + 52, by - 25, JD1); P(x + 54, by - 25, JD1);
  /* 攤三：草蓆斜棚 */
  R(x + 63, by - 36, 24, 22, '#14110e');
  R(x + 62, by - 45, 2, 45, WD2); R(x + 62, by - 45, 1, 45, WD4); R(x + 86, by - 38, 2, 38, WD2);
  for (i = 0; i < 29; i++) { var yy = by - 46 + fl(i * 7 / 28); R(x + 61 + i, yy, 1, 5, (i % 3) ? GD2 : '#4a3a1c'); P(x + 61 + i, yy, '#77613a'); P(x + 61 + i, yy + 5, KK); }
  hang(x + 68, by - 38, 'f'); hang(x + 72, by - 37, 'f'); hang(x + 77, by - 36, 'p'); hang(x + 82, by - 35, 'b');
  barrel(x + 64, by - 13, 9, 13); barrel(x + 74, by - 11, 8, 11); sack(x + 82, by - 8, 7, 8); sack(x + 78, by - 17, 7, 7);
  R(x + 65, by - 15, 7, 2, WD5); P(x + 67, by - 16, PA2);
  return [x, by - 61, x + 90, by + 1];
}
function innA(x, by) {
  var lx = x + 10, lw = 64, ly = by - 28, ux = x + 16, uw = 52, uy = ly - 30, dx = lx + 24, px = x + 85, i;
  R(x + 6, by, 78, 2, KK, 0.6);
  R(lx - 2, by - 2, lw + 4, 2, A1); R(lx - 2, by - 2, lw + 4, 1, A2);
  twall(lx, ly, lw, 26, [0, 20, 42, 62]);
  R(dx - 1, ly + 5, 18, 21, WD1); R(dx, ly + 6, 16, 20, KK); R(dx, ly + 19, 16, 7, '#2e2013'); Dz(dx, ly + 15, 16, 4, '#2e2013', 2);
  R(dx, ly + 6, 16, 7, '#1e2833'); R(dx, ly + 6, 16, 1, I3); R(dx + 7, ly + 7, 1, 6, KK);
  for (i = 0; i < 16; i += 2) P(dx + i, ly + 13, '#1e2833');
  R(dx + 2, ly + 8, 3, 3, GD2); R(dx + 11, ly + 8, 3, 3, GD2);
  win(lx + 5, ly + 8, 11, 10, true); win(lx + 48, ly + 8, 11, 10, true);
  jar(lx + 17, by - 8); jar(lx + 43, by - 8); R(lx + 3, by - 6, 13, 1, WD4); R(lx + 4, by - 5, 1, 3, WD2); R(lx + 14, by - 5, 1, 3, WD2);
  roof(x + 4, ly - 8, 76, 8, 5);
  twall(ux, uy, uw, 22, [0, 16, 34, 50]);
  win(ux + 4, uy + 4, 9, 9, true); win(ux + 21, uy + 4, 10, 9, false); win(ux + 39, uy + 4, 9, 9, true);
  R(ux - 2, uy + 15, uw + 4, 1, WD4); for (i = ux - 2; i < ux + uw + 2; i += 3) R(i, uy + 16, 1, 5, WD3); R(ux - 2, uy + 20, uw + 4, 1, WD2);
  roof(x + 8, uy - 14, 68, 14, 10);
  R(dx + 1, ly - 6, 14, 7, WD0); R(dx + 2, ly - 5, 12, 5, WD2); R(dx + 1, ly - 6, 14, 1, GD2); glyph(dx + 3, ly - 5, GD1, 0); glyph(dx + 9, ly - 5, GD1, 1);
  lantern(dx - 5, ly, 9); lantern(dx + 20, ly, 9); lantern(x + 9, uy, 7); lantern(x + 75, uy, 7);
  R(px, by - 58, 2, 58, WD2); R(px, by - 58, 1, 58, WD4); R(px - 1, by - 3, 4, 3, A1); P(px, by - 59, GD1);
  R(px - 1, by - 55, 9, 1, WD4);
  R(px + 2, by - 54, 6, 22, RD1); R(px + 2, by - 54, 1, 22, RED); R(px + 7, by - 54, 1, 22, RD2); R(px + 4, by - 32, 2, 1, RD1); P(px + 2, by - 32, RD1); P(px + 7, by - 32, RD2);
  glyph(px + 3, by - 52, GOLD, 2); glyph(px + 3, by - 46, GOLD, 3); glyph(px + 3, by - 40, GOLD, 0);
  return [x, uy - 17, x + 94, by + 1];
}
function cauldron(cx, by, r) {
  glow(cx, by - 3, 15, RED, 0.09);
  R(cx - 10, by - 9, 3, 9, BZ0); R(cx + 8, by - 9, 3, 9, BZ0); R(cx - 1, by - 7, 3, 7, BZ0); R(cx - 10, by - 9, 1, 9, BZ2); R(cx + 8, by - 9, 1, 9, BZ1); R(cx - 1, by - 7, 1, 7, BZ1); R(cx - 11, by - 1, 5, 1, BZ1); R(cx + 7, by - 1, 5, 1, BZ0);
  R(cx - 6, by - 3, 13, 3, RD2); R(cx - 4, by - 4, 9, 2, RD1); P(cx - 3, by - 4, EMB); P(cx + 2, by - 5, EMB); P(cx, by - 5, EMH); P(cx + 4, by - 3, EMB); P(cx - 5, by - 2, RED); R(cx - 7, by - 1, 15, 1, WD0);
  E(cx, by - 18, 13, 11, BZ0); E(cx - 1, by - 19, 12, 10, BZ1); E(cx - 4, by - 22, 6, 5, BZ2); P(cx - 7, by - 25, BZ3); P(cx - 6, by - 26, BZ3); P(cx - 8, by - 24, BZ3); P(cx - 5, by - 26, BZ3);
  R(cx - 13, by - 18, 27, 1, BZ0); for (var i = 0; i < 6; i++) P(cx - 10 + i * 4, by - 17, i < 3 ? BZ3 : BZ2);
  R(cx - 10, by - 29, 21, 2, BZ2); R(cx - 10, by - 29, 10, 1, BZ3); R(cx - 10, by - 27, 21, 1, BZ0);
  T(by - 34, by - 30, cx - 4, cx + 5, cx - 9, cx + 10, BZ1); T(by - 34, by - 30, cx - 4, cx - 1, cx - 9, cx - 3, BZ2);
  R(cx - 1, by - 37, 3, 3, BZ2); P(cx - 1, by - 37, BZ3); P(cx - 4, by - 32, EMB); P(cx + 1, by - 32, EMB); P(cx + 5, by - 31, RD1);
  R(cx - 15, by - 28, 2, 7, BZ1); P(cx - 15, by - 28, BZ3); R(cx - 14, by - 22, 2, 1, BZ1); R(cx + 14, by - 28, 2, 7, BZ0); R(cx + 13, by - 22, 2, 1, BZ0);
  smoke(r, cx, by - 37, 5, 0.5, A4, 0.5);
}
function herbRack(rx, by) {
  R(rx, by - 38, 1, 38, WD4); R(rx + 12, by - 38, 1, 38, WD3); R(rx - 1, by - 39, 15, 1, WD4);
  hang(rx + 3, by - 38, 'h'); hang(rx + 6, by - 38, 'h'); hang(rx + 10, by - 38, 'h');
  for (var k = 0; k < 3; k++) { var y = by - 24 + k * 9; R(rx - 1, y, 15, 2, WD4); R(rx - 1, y, 15, 1, WD5); Dz(rx, y - 1, 13, 1, JD1, 3); P(rx + 2 + k * 3, y - 1, JADE); P(rx + 8 - k, y - 2, JD1); }
}
function furnaceA(x, by) {
  var r = rng(33), sx = x + 5, sw = 44, sy = by - 32, cx = sx + 31, cy = sy + 14;
  R(x + 2, by, 92, 2, KK, 0.6);
  R(sx - 2, by - 2, sw + 4, 2, A1); R(sx - 2, by - 2, sw + 4, 1, A2);
  twall(sx, sy, sw, 30, [0, 20, 42]);
  R(sx + 4, sy + 7, 13, 23, WD1); R(sx + 5, sy + 8, 11, 22, KK); R(sx + 5, sy + 23, 11, 7, '#2a1d12');
  R(sx + 5, sy + 8, 11, 7, JD2); R(sx + 5, sy + 8, 11, 1, JD1); R(sx + 10, sy + 9, 1, 6, KK); P(sx + 7, sy + 11, GD1); P(sx + 13, sy + 11, GD1);
  E(cx, cy, 8, 8, WD1); E(cx, cy, 6, 6, LIT); R(cx - 6, cy, 13, 1, WD1); R(cx - 2, cy - 6, 1, 13, WD1); R(cx + 2, cy - 6, 1, 13, WD1); R(cx - 4, cy - 5, 9, 1, LIH);
  roof(x + 1, by - 44, 52, 12, 8);
  R(x + 40, by - 52, 5, 9, A0); R(x + 40, by - 52, 2, 9, A1); R(x + 39, by - 53, 7, 1, A2); smoke(r, x + 42, by - 53, 3, 0.6, A3, 0.4);
  /* 葫蘆幌子 */
  P(x + 3, by - 31, WD0); P(x + 3, by - 30, WD0); R(x + 2, by - 29, 3, 3, GD1); P(x + 2, by - 29, GOLD); R(x + 3, by - 26, 1, 1, RED); R(x + 1, by - 25, 5, 5, GD1); R(x + 2, by - 20, 3, 1, GD2); P(x + 1, by - 25, GD2); P(x + 5, by - 25, GD2); P(x + 2, by - 24, GOLD); P(x + 2, by - 23, GOLD); P(x + 3, by - 19, RD1); P(x + 3, by - 18, RD1);
  herbRack(x + 80, by);
  cauldron(x + 64, by, r);
  return [x, by - 62, x + 95, by + 1];
}
function bountyA(x, by) {
  var i;
  R(x + 3, by, 52, 2, KK, 0.6);
  R(x + 6, by - 47, 3, 47, WD2); R(x + 6, by - 47, 1, 47, WD4); R(x + 48, by - 47, 3, 47, WD2); R(x + 50, by - 47, 1, 47, WD0);
  L(x + 9, by - 11, x + 47, by - 4, WD1); L(x + 9, by - 4, x + 47, by - 11, WD2);
  R(x + 4, by - 3, 7, 3, A1); R(x + 4, by - 3, 7, 1, A2); R(x + 46, by - 3, 7, 3, A1); R(x + 46, by - 3, 7, 1, A2);
  R(x + 9, by - 45, 39, 32, WD1); R(x + 10, by - 44, 37, 30, WD3); for (i = 0; i < 6; i++) R(x + 15 + i * 6, by - 44, 1, 30, WD2);
  R(x + 34, by - 44, 13, 30, WD2, 0.45); R(x + 10, by - 44, 37, 2, WD1);
  paper(x + 12, by - 41, 9, 13, { face: 1 }); paper(x + 23, by - 40, 9, 11, { seal: 1 }); paper(x + 34, by - 41, 11, 8);
  paper(x + 14, by - 26, 8, 9); paper(x + 25, by - 27, 7, 10); paper(x + 35, by - 30, 10, 13, { face: 1, seal: 1 });
  P(x + 21, by - 18, WD3); P(x + 20, by - 18, WD3); P(x + 21, by - 19, WD3);
  roof(x + 3, by - 56, 51, 9, 6);
  return [x, by - 59, x + 57, by + 1];
}

/* ---------- 渡陰關建築 ---------- */
function innB(x, by) {
  var r = rng(41), gx = x + 6, gw = 66, cx = x + 39, ux = x + 11, uy = by - 55, i;
  R(x + 3, by, 74, 2, KK, 0.6);
  stone(gx, by - 30, gw, 30, r, ST, 5, 9); R(gx + 44, by - 30, gw - 44, 30, K0, 0.28);
  E(cx, by - 17, 10, 8, A2); R(cx - 10, by - 17, 21, 17, A2); E(cx, by - 17, 8, 6, A0); P(cx, by - 26, A3);
  E(cx, by - 16, 7, 6, KK); R(cx - 7, by - 16, 15, 16, KK); R(cx - 6, by - 6, 13, 6, '#2e2013'); Dz(cx - 6, by - 9, 13, 3, '#2e2013', 2); R(cx - 7, by - 1, 15, 1, A1);
  for (i = 0; i < 2; i++) { var wx = gx + 7 + i * 44; R(wx - 1, by - 23, 9, 9, K0); R(wx, by - 22, 7, 7, LIT); R(wx, by - 22, 7, 1, LIH); R(wx + 2, by - 22, 1, 7, K0); R(wx + 4, by - 22, 1, 7, K0); R(wx - 1, by - 14, 9, 1, A2); }
  roof(x + 3, by - 36, 72, 6, 3);
  R(ux, uy, 56, 19, WD2); for (i = ux + 3; i < ux + 56; i += 4) R(i, uy, 1, 19, WD1); R(ux + 36, uy, 20, 19, WD0, 0.45); R(ux, uy, 2, 19, WD3); R(ux + 54, uy, 2, 19, WD1);
  win(ux + 5, uy + 5, 9, 8, true); win(ux + 23, uy + 5, 10, 8, true); R(ux + 42, uy + 4, 11, 10, WD0); R(ux + 43, uy + 5, 9, 8, WD1); R(ux + 47, uy + 5, 1, 8, GD1); R(ux + 43, uy + 9, 9, 1, WD0);
  roof(x + 4, uy - 14, 70, 14, 9);
  R(cx - 8, by - 34, 17, 6, WD0); R(cx - 7, by - 33, 15, 4, RD2); glyph(cx - 5, by - 33, GD1, 2); glyph(cx + 2, by - 33, GD1, 1);
  lantern(gx + 15, by - 30, 8); lantern(gx + 50, by - 30, 8); lantern(x + 6, by - 30, 7); lantern(x + 72, by - 30, 7);
  R(x + 66, uy - 26, 1, 24, WD4); P(x + 66, uy - 27, GD1);
  T(uy - 25, uy - 21, x + 52, x + 66, x + 58, x + 66, RD1); T(uy - 20, uy - 17, x + 59, x + 66, x + 63, x + 66, RD1); R(x + 55, uy - 25, 11, 1, RED); R(x + 60, uy - 22, 3, 2, GOLD);
  return [x, uy - 28, x + 78, by + 1];
}
function danFurnace(cx, by, r) {          // 三層丹爐
  glow(cx, by - 14, 16, EMB, 0.06);
  R(cx - 13, by - 3, 27, 3, A1); R(cx - 13, by - 3, 27, 1, A2); R(cx - 13, by - 1, 27, 1, A0);
  R(cx - 9, by - 8, 3, 5, BZ0); R(cx + 7, by - 8, 3, 5, BZ0); R(cx - 1, by - 7, 3, 4, BZ0);
  E(cx, by - 14, 11, 7, BZ0); E(cx - 1, by - 15, 10, 6, BZ1); E(cx - 5, by - 17, 4, 3, BZ2); P(cx - 7, by - 18, BZ3); P(cx - 6, by - 19, BZ3);
  R(cx - 3, by - 16, 7, 6, '#2a0d0c'); R(cx - 2, by - 17, 5, 1, '#2a0d0c'); R(cx - 2, by - 13, 5, 3, RD1); P(cx - 1, by - 13, EMB); P(cx + 1, by - 12, EMH); P(cx, by - 14, EMB); P(cx + 2, by - 13, RED);
  R(cx - 12, by - 16, 2, 4, BZ1); R(cx + 11, by - 16, 2, 4, BZ0);
  R(cx - 7, by - 24, 15, 3, BZ1); R(cx - 7, by - 24, 6, 1, BZ3); R(cx - 9, by - 21, 19, 1, BZ0);
  R(cx - 8, by - 32, 17, 8, BZ1); R(cx - 8, by - 32, 2, 8, BZ2); R(cx + 7, by - 32, 2, 8, BZ0);
  R(cx - 5, by - 30, 2, 4, '#c06a2c'); R(cx - 1, by - 30, 2, 4, EMB); R(cx + 3, by - 30, 2, 4, '#a04e22'); P(cx - 1, by - 30, EMH);
  R(cx - 11, by - 34, 23, 2, BZ2); R(cx - 11, by - 34, 10, 1, BZ3); P(cx - 12, by - 35, BZ3); P(cx + 12, by - 35, BZ1);
  R(cx - 7, by - 36, 15, 2, BZ1); R(cx - 7, by - 36, 5, 1, BZ2); R(cx - 4, by - 38, 9, 2, BZ1); R(cx - 4, by - 38, 3, 1, BZ2);
  R(cx - 1, by - 41, 3, 3, BZ2); P(cx, by - 42, BZ3);
  smoke(r, cx, by - 42, 5, 0.5, A4, 0.5);
}
function furnaceB(x, by) {
  var r = rng(43), hx = x + 36, hw = 42, i;
  R(x + 1, by, 82, 2, KK, 0.6);
  stone(hx, by - 28, hw, 28, r, ST, 4, 8); R(hx + 28, by - 28, hw - 28, 28, K0, 0.28);
  R(hx + 3, by - 22, 13, 22, A2); R(hx + 4, by - 21, 11, 21, KK); R(hx + 4, by - 6, 11, 6, '#2a1d12'); R(hx + 2, by - 23, 15, 2, WD3);
  R(hx + 4, by - 21, 11, 6, JD2); R(hx + 4, by - 21, 11, 1, JD1); R(hx + 9, by - 20, 1, 5, KK);
  R(hx + 23, by - 14, 9, 8, K0); R(hx + 24, by - 13, 7, 6, LIT); R(hx + 24, by - 13, 7, 1, LIH); R(hx + 27, by - 13, 1, 6, K0); R(hx + 23, by - 6, 9, 1, A2);
  roof(x + 33, by - 39, 48, 10, 6);
  R(hx + 18, by - 27, 22, 1, WD4); for (i = 0; i < 5; i++) hang(hx + 20 + i * 4, by - 27, i % 3 === 1 ? 'c' : 'h');
  R(x + 70, by - 50, 6, 13, A0); R(x + 70, by - 50, 2, 13, A1); R(x + 69, by - 51, 8, 2, A2); smoke(r, x + 73, by - 52, 3, 0.6, A3, 0.4);
  /* 藥幌：木牌上畫玉色葫蘆 */
  R(hx + 17, by - 19, 5, 10, WD1); R(hx + 18, by - 18, 3, 8, WD3); P(hx + 19, by - 17, JADE); R(hx + 18, by - 15, 3, 3, JADE); P(hx + 19, by - 12, JD1);
  /* 曬藥竹匾 */
  E(hx + 36, by - 5, 4, 4, WD4); E(hx + 36, by - 5, 3, 3, JD2); P(hx + 35, by - 6, JADE); P(hx + 37, by - 4, JD1);
  danFurnace(x + 16, by, r);
  return [x, by - 66, x + 84, by + 1];
}
function bountyB(x, by) {
  var r = rng(44), i;
  R(x + 1, by, 55, 2, KK, 0.6);
  stone(x + 3, by - 43, 8, 43, r, ST, 4, 5); stone(x + 45, by - 43, 8, 43, r, ST, 4, 5); R(x + 49, by - 43, 4, 43, K0, 0.3);
  R(x + 2, by - 2, 10, 2, A2); R(x + 44, by - 2, 10, 2, A1);
  stone(x + 11, by - 9, 34, 9, r, ['#161514', '#262422', '#32302c'], 3, 6);
  R(x + 11, by - 41, 34, 31, WD0); R(x + 12, by - 40, 32, 29, WD2); for (i = 0; i < 5; i++) R(x + 12, by - 35 + i * 6, 32, 1, WD1);
  P(x + 13, by - 39, A3); P(x + 42, by - 39, A3); P(x + 13, by - 13, A3); P(x + 42, by - 13, A3);
  paper(x + 14, by - 38, 12, 16, { face: 1, seal: 1 }); paper(x + 28, by - 38, 8, 10); paper(x + 37, by - 37, 6, 12, { seal: 1 });
  paper(x + 15, by - 20, 9, 8); paper(x + 27, by - 26, 9, 13, { face: 1 });
  roof(x + 3, by - 53, 50, 9, 5);
  glow(x + 7, by - 34, 9, EMB, 0.07); glow(x + 49, by - 34, 9, EMB, 0.07);
  for (i = 0; i < 2; i++) { var tx = x + 6 + i * 42; R(tx, by - 31, 3, 1, A3); R(tx + 1, by - 30, 1, 3, A1); R(tx, by - 33, 3, 2, RD1); P(tx + 1, by - 34, EMB); P(tx + 1, by - 35, EMH); P(tx + 1, by - 33, EMB); }
  return [x, by - 56, x + 57, by + 1];
}
function marketB(x, by) {
  var r = rng(45), i;
  R(x + 1, by, 70, 2, KK, 0.6);
  R(x + 6, by - 41, 38, 30, '#13110f');
  stone(x + 2, by - 9, 6, 9, r, ST, 3, 4); stone(x + 42, by - 9, 6, 9, r, ST, 3, 4);
  R(x + 3, by - 42, 4, 33, WD2); R(x + 3, by - 42, 1, 33, WD4); R(x + 43, by - 42, 4, 33, WD2); R(x + 46, by - 42, 1, 33, WD0);
  roof(x + 3, by - 51, 44, 9, 4);
  R(x + 6, by - 41, 38, 2, WD3);
  hang(x + 10, by - 39, 'm'); hang(x + 14, by - 39, 'm'); hang(x + 19, by - 39, 'p'); hang(x + 25, by - 39, 'c'); hang(x + 29, by - 39, 'f'); hang(x + 34, by - 39, 'p'); hang(x + 39, by - 39, 'm');
  R(x + 6, by - 16, 38, 3, WD3); R(x + 6, by - 16, 38, 1, WD5);
  barrel(x + 8, by - 13, 8, 13); barrel(x + 17, by - 13, 8, 13); crate(x + 26, by - 12, 9, 12); sack(x + 35, by - 9, 7, 9);
  R(x + 9, by - 20, 5, 4, A2); R(x + 9, by - 20, 5, 1, A4); P(x + 11, by - 21, A3);     /* 兜鍪 */
  R(x + 17, by - 19, 8, 3, '#4a4334'); R(x + 17, by - 19, 8, 1, '#665d4a'); jar(x + 28, by - 22);
  glow(x + 38, by - 20, 8, EMB, 0.07); R(x + 37, by - 18, 3, 2, BZ1); P(x + 38, by - 19, EMB); P(x + 38, by - 20, EMH);
  /* 兵器架 */
  R(x + 50, by - 22, 1, 22, WD3); R(x + 68, by - 22, 1, 22, WD2); R(x + 49, by - 21, 21, 1, WD4); R(x + 49, by - 9, 21, 1, WD3);
  for (i = 0; i < 4; i++) { var sx = x + 53 + i * 4, top = by - 55 + (i % 2) * 4 + (i === 3 ? 2 : 0); R(sx, top + 3, 1, by - 2 - top - 3, WD4); R(sx, top, 1, 3, A4); P(sx, top - 1, PA1); P(sx - 1, top + 2, A3); P(sx + 1, top + 2, A3); P(sx, top + 4, RED); P(sx - 1, top + 5, RD1); P(sx + 1, top + 5, RD1); }
  E(x + 64, by - 7, 5, 6, WD1); E(x + 64, by - 7, 4, 5, WD3); E(x + 63, by - 8, 2, 3, WD4); P(x + 64, by - 7, GD1); P(x + 63, by - 8, GOLD);
  return [x, by - 58, x + 71, by + 1];
}

/* ---------- 城鎮 ---------- */
function setB(id, o) { var out = {}; for (var k in o) { var b = o[k]; out[k] = [b[0] * 2, b[1] * 2, (b[2] - b[0]) * 2, (b[3] - b[1]) * 2]; } BLD[id] = out; }
function mound(r, cx, yb, rx, ry) {
  var ph = r() * 6;
  for (var dx = -rx; dx <= rx; dx++) { var hh = rd(ry * Math.sqrt(1 - (dx * dx) / (rx * rx + 1)) * (0.82 + 0.18 * sin(dx * 0.7 + ph))); R(cx + dx, yb - hh, 1, hh, '#1d1c1a'); P(cx + dx, yb - hh, dx < rx * 0.3 ? '#34312c' : '#262422'); if (dx < 0 && hh > 3) Dz(cx + dx, yb - hh + 1, 1, rd(hh * 0.5), '#2a2825', 1); }
}
function kiln(cx, yb, rx, ry, r) {
  var j, hw;
  for (j = 0; j <= ry; j++) {
    hw = fl(rx * Math.sqrt(Math.max(0, 1 - (j * j) / ((ry + 0.5) * (ry + 0.5)))) + 0.5);
    R(cx - hw, yb - 3 - j, 2 * hw + 1, 1, j % 3 === 0 ? WD0 : WD1);
    if (j % 3) { Dz(cx - hw + 1, yb - 3 - j, rd(hw * 0.8), 1, WD2, 2); P(cx - hw, yb - 3 - j, WD3); }
  }
  R(cx - rx, yb - 2, 2 * rx + 1, 2, WD0); R(cx - rx, yb - 2, rx, 1, WD2);
  R(cx - 1, yb - 5 - ry, 3, 3, WD0); P(cx - 1, yb - 5 - ry, WD2);
  glow(cx, yb - 3, 7, RED, 0.1);
  R(cx - 2, yb - 6, 5, 6, KK); P(cx - 2, yb - 6, WD0); P(cx + 2, yb - 6, WD0); R(cx - 1, yb - 3, 3, 3, RD1); P(cx, yb - 2, EMB); P(cx - 1, yb - 1, RED);
}
function hut(r, x, yb, w, h) {
  R(x + 2, yb - h + 5, w - 4, h - 5, '#141210'); T(yb - h, yb - h + 5, x + 5, x + w - 5, x, x + w, '#1c2025');
  R(x + 5, yb - h, w - 10, 1, '#2c323a'); R(x, yb - h + 5, w, 1, '#0f1113');
  if (r() < 0.55) R(x + 5 + fl(r() * (w - 12)), yb - h + 9, 2, 2, GD2);
}
function townHuiyao() {
  var r = rng(11), by = 143, i, x;
  bands(0, 0, W, 62, ['#0c0b0a', '#0f0e0c', '#141210', '#1a1714', '#221c17', '#2b231a']);
  R(0, 62, W, 70, '#1c1916');
  hill(prof(r, W, 42, 7, 1.5), 80, '#191a1f');
  mist(r, 51, 6, A2, 0.3);
  hill(prof(r, W, 60, 5, 1.2), 112, '#151412', '#22201c');
  mound(r, 58, 64, 30, 12); mound(r, 236, 62, 38, 16); mound(r, 360, 66, 28, 11); mound(r, 138, 66, 18, 7);
  /* 井架 */
  L(22, 76, 30, 44, '#2a231a'); L(42, 76, 34, 44, '#1f1912'); L(24, 66, 40, 58, '#1f1912'); L(40, 66, 25, 56, '#2a231a'); R(28, 42, 9, 2, '#2a231a'); E(32, 40, 3, 3, '#2a231a'); E(32, 40, 1, 1, '#131210'); L(32, 43, 32, 74, '#131210');
  /* 窯場臺地、饅頭窯與煙 */
  var tp = prof(r, W, 82, 2, 1); hill(tp, 112, '#1b1916', '#2c2822');
  for (i = 0; i < 40; i++) { x = fl(r() * W); R(x, tp[x] + 2 + fl(r() * 12), 2 + fl(r() * 6), 1, r() < 0.5 ? '#131210' : '#24211d'); }
  var ks = [[104, 12, 11, 8, A1], [174, 15, 14, 9, A2], [282, 13, 12, 8, A1], [326, 8, 8, 6, A1]];
  for (i = 0; i < 4; i++) { var kq = ks[i], ky = tp[kq[0]] + 2; smoke(r, kq[0], ky - kq[2] - 6, kq[3], 0.5, kq[4], 0.5); R(kq[0] - kq[1] - 3, ky, kq[1] * 2 + 7, 1, '#0f0e0c'); kiln(kq[0], ky, kq[1], kq[2], r); R(kq[0] - kq[1] - 8, ky - 2, 6, 2, '#24211d'); R(kq[0] - kq[1] - 7, ky - 3, 3, 1, '#2e2a25'); }
  /* 中景矮屋 */
  mist(r, 90, 7, A2, 0.2);
  for (x = -6; x < W; ) { var w = 20 + fl(r() * 14); hut(r, x, 132, w, 20 + fl(r() * 14)); x += w - 2 + fl(r() * 6); }
  mist(r, 112, 9, A2, 0.12);
  /* 街面 */
  bands(0, 128, W, 37, ['#231f1a', '#1e1b17', '#181613', '#131110', '#100f0d']);
  for (i = 0; i < 70; i++) { x = fl(r() * W); var y = 130 + fl(r() * 18); R(x, y, 2 + fl(r() * 6), 1, r() < 0.5 ? '#2b2721' : '#151310'); }
  for (i = 0; i < 30; i++) P(fl(r() * W), 148 + fl(r() * 16), '#1a1815');
  setB('town_huiyao', { market: marketA(6, by), bounty: bountyA(112, by), inn: innA(180, by), furnace: furnaceA(292, by) });
  /* 飄灰 */
  for (i = 0; i < 40; i++) P(120 + fl(r() * 220), 6 + fl(r() * 50), A1, 0.6);
}
function townDuyin() {
  var r = rng(12), by = 143, i, x, y, xe, wv;
  bands(0, 0, W, 60, ['#0b0c0f', '#0e1014', '#12151a', '#161a21', '#1b2029']);
  hill(prof(r, W, 30, 9, 2), 70, '#101319');
  mist(r, 36, 6, I3, 0.3);
  /* 關牆 */
  stone(0, 48, W, 84, r, ['#15161a', '#1f2126', '#282b31'], 6, 13);
  R(0, 48, W, 1, '#353941'); R(0, 49, W, 2, '#111215');
  for (x = 1; x < W; x += 8) { R(x, 43, 5, 5, '#1f2126'); R(x, 43, 5, 1, '#353941'); R(x, 43, 1, 5, '#2b2e35'); }
  R(0, 88, W, 14, '#0f1013', 0.25); R(0, 102, W, 30, '#0f1013', 0.45);
  /* 甕城與關門 */
  stone(166, 44, 68, 88, r, ['#17181c', '#24262c', '#30333a'], 6, 11); R(166, 44, 68, 1, '#3a3e46'); R(166, 44, 1, 88, '#30333a'); R(233, 44, 1, 88, '#111215');
  for (x = 166; x < 234; x += 8) { R(x, 39, 5, 5, '#24262c'); R(x, 39, 5, 1, '#3a3e46'); }
  E(200, 100, 18, 16, A1); R(182, 100, 37, 32, A1); E(200, 100, 16, 14, '#25262a');
  E(200, 101, 14, 12, KK); R(186, 101, 29, 31, KK);
  R(187, 96, 12, 36, WD0); R(202, 96, 12, 36, WD0); E(200, 101, 14, 12, KK, 0.0);
  for (y = 100; y < 130; y += 5) for (x = 189; x < 213; x += 4) if (x !== 201) P(x, y, GD2);
  R(187, 112, 27, 1, A0); R(199, 92, 3, 40, KK);
  R(189, 72, 23, 9, WD0); R(190, 73, 21, 7, '#2a1512'); R(189, 72, 23, 1, GD2); glyph(192, 75, GD1, 0); glyph(199, 75, GD1, 3); glyph(206, 75, GD1, 2);
  /* 城樓 */
  R(172, 28, 56, 16, '#17110e'); for (x = 172; x < 228; x += 9) { R(x, 28, 2, 16, RD2); P(x, 28, RD1); }
  for (x = 177; x < 222; x += 9) { R(x, 32, 5, 7, x === 195 || x === 204 ? LIT : '#0e0c0b'); R(x + 2, 32, 1, 7, '#17110e'); }
  R(170, 42, 60, 2, '#30333a');
  roof(160, 19, 80, 9, 5);
  R(182, 9, 36, 10, '#17110e'); for (x = 182; x < 218; x += 8) R(x, 9, 2, 10, RD2); R(191, 12, 4, 5, LIT); R(205, 12, 4, 5, '#0e0c0b');
  roof(172, 0, 56, 9, 6);
  /* 旌旗、烽火、守卒 */
  var fx = [92, 142, 258, 308];
  for (i = 0; i < 4; i++) { x = fx[i]; R(x, 20, 1, 24, '#3b2a1c'); R(x + 1, 21, 7, 13, RD1); R(x + 1, 21, 7, 1, RED); R(x + 6, 22, 2, 12, RD2); R(x + 3, 25, 2, 3, GD1); P(x + 1, 34, RD1); P(x + 3, 34, RD1); P(x + 5, 34, RD2); P(x + 7, 34, RD2); }
  brazier(120, 47); brazier(280, 47);
  for (i = 0; i < 3; i++) { x = [70, 246, 332][i]; R(x, 39, 3, 5, '#0e0d0c'); P(x + 1, 38, '#0e0d0c'); R(x + 4, 32, 1, 12, '#0e0d0c'); P(x + 4, 31, A2); }
  /* 兩側山崖 */
  wv = 0;
  for (y = 0; y < 134; y++) { wv = (wv + (r() - 0.5) * 3) * 0.86; xe = rd(50 - y * 0.2 + wv + sin(y / 9) * 3); R(0, y, xe, 1, '#121110'); P(xe - 1, y, '#191715'); if (r() < 0.3) R(fl(r() * xe), y, 3 + fl(r() * 8), 1, '#181614'); }
  wv = 0;
  for (y = 0; y < 134; y++) { wv = (wv + (r() - 0.5) * 3) * 0.86; xe = rd(346 + y * 0.18 + wv + sin(y / 7 + 2) * 3); R(xe, y, W - xe, 1, '#131211'); P(xe, y, '#24211d'); P(xe + 1, y, '#1b1917'); if (r() < 0.3) R(xe + fl(r() * (W - xe)), y, 3 + fl(r() * 8), 1, '#1a1816'); }
  mist(r, 116, 10, '#3a3e46', 0.25);
  /* 石板地 */
  bands(0, 130, W, 35, ['#201f1e', '#1b1a19', '#151514', '#111110', '#0f0e0d']);
  for (y = 134; y < 150; y += 5) { R(0, y, W, 1, '#141312'); for (x = ((y / 5) & 1) * 9 + fl(r() * 4); x < W; x += 18 + fl(r() * 5)) R(x, y - 4, 1, 4, '#141312'); }
  for (i = 0; i < 40; i++) { x = fl(r() * W); R(x, 131 + fl(r() * 16), 3 + fl(r() * 6), 1, '#282725'); }
  brazier(174, 137); brazier(226, 137);
  setB('town_duyin', { furnace: furnaceB(4, by), bounty: bountyB(102, by), inn: innB(238, by), market: marketB(324, by) });
}

/* ---------- 荒野 ---------- */
function calmOf(pts) { return function (x, y, pad) { pad = pad || 0; for (var i = 0; i < pts.length; i++) if (abs(x - pts[i][0]) < 22 + pad && y > pts[i][1] - 15 - pad && y < pts[i][1] + 24 + pad) return true; return false; }; }
function trunk(r, x, w, y0, y1, c, hl, flare, near) {
  R(x, y0, w, y1 - y0, c); R(x, y0, 1, y1 - y0, hl);
  if (near) {                              // 近景：樹皮縱紋、左緣受光、苔
    for (var q = 0; q < (y1 - y0) * w / 9; q++) { var bx = x + 1 + fl(r() * (w - 2)), by = y0 + fl(r() * (y1 - y0 - 8)); R(bx, by, 1, 4 + fl(r() * 10), bx < x + w * 0.45 ? near : KK, bx < x + w * 0.45 ? 0.8 : 0.5); }
    for (q = y0; q < y1; q += 2) if (r() < 0.6) P(x + 1, q, near);
    for (q = 0; q < 5; q++) { var my = y0 + 20 + fl(r() * (y1 - y0 - 30)); E(x + 2 + fl(r() * (w * 0.4)), my, 2 + r() * 2, 2 + r() * 3, JD3, 1, 2); P(x + 2 + fl(r() * 3), my, JD2); }
    R(x + w - 2, y0, 2, y1 - y0, KK, 0.5);
  }
  for (var k = 0; k < (y1 - y0) * w / 14; k++) R(x + 1 + fl(r() * (w - 1)), y0 + fl(r() * (y1 - y0 - 4)), 1, 2 + fl(r() * 5), r() < 0.4 ? hl : KK, 0.6);
  if (flare) { R(x - 1, y1 - 4, w + 2, 4, c); R(x - 2, y1 - 2, w + 4, 2, c); R(x - 3 - fl(w / 6), y1 - 1, w + 6 + fl(w / 3), 1, c); P(x - 1, y1 - 4, hl); P(x - 2, y1 - 2, hl); }
}
function fern(r, x, y, s, c, c2) { for (var k = -2; k <= 2; k++) { var dx = k * s * 0.5 + (r() - 0.5), dy = s - abs(k) * s * 0.3; L(x, y, x + dx, y - dy, c); P(rd(x + dx), rd(y - dy), c2); } }
function bush(r, x, y, w, h, c, c2) { E(x, y - h / 2, w / 2, h / 2, c, 1, 3); E(x - 1, y - h / 2 + 1, w / 2 - 1, h / 2 - 1, c); for (var k = 0; k < w * 0.6; k++) P(x - w / 2 + r() * w * 0.7, y - h + 1 + r() * h * 0.6, c2); }
function herb(x, y, c) { P(x, y, JD1); P(x, y - 1, JD1); P(x - 1, y - 2, JADE); P(x + 1, y - 1, JADE); P(x, y - 3, c || JADE); }
function wildQingwu() {
  var r = rng(101), i, x, y, calm = calmOf([[60, 125], [135, 145], [247, 90], [312, 145], [183, 160]]);
  bands(0, 0, W, 78, ['#090d0c', '#0b1210', '#0e1815', '#111f1a', '#152620', '#192d26']);
  for (i = 0; i < 40; i++) { x = fl(r() * W); R(x, 0, 1 + fl(r() * 3), 64 + fl(r() * 14), '#122019'); }
  mist(r, 54, 16, JD1, 0.42); mist(r, 60, 5, JADE, 0.16);
  bands(0, 74, W, 128, ['#14251d', '#12201a', '#101c16', '#0e1813', '#0c1410', '#0a100d']);
  for (i = 0; i < 700; i++) { x = fl(r() * W); y = 76 + fl(r() * 126); P(x, y, r() < 0.5 ? '#1a3026' : '#0a110e'); }
  for (x = 0; x < W; x += 4 + fl(r() * 5)) E(x, 75, 3 + r() * 4, 2 + r() * 2, '#0e1a15', 1, 3);
  /* 林間空地（不規則） */
  var cl = [[183, 160, 58, 16], [150, 165, 34, 10], [216, 155, 38, 12], [196, 170, 44, 9], [164, 152, 30, 8]];
  for (i = 0; i < cl.length; i++) E(cl[i][0], cl[i][1], cl[i][2] + 8, cl[i][3] + 4, '#16271e', 1, 2);
  for (i = 0; i < cl.length; i++) E(cl[i][0], cl[i][1], cl[i][2], cl[i][3], '#17291f');
  E(176, 161, 34, 8, '#1b2e23', 1, 2); E(204, 158, 18, 5, '#1b2e23', 1, 1);
  for (i = 0; i < 60; i++) { x = 130 + fl(r() * 110); y = 148 + fl(r() * 26); P(x, y, r() < 0.5 ? '#203528' : '#12201a'); }
  var gl = [[247, 92, 22, 6], [60, 127, 22, 7], [135, 147, 20, 6], [312, 147, 22, 7]];
  for (i = 0; i < 4; i++) { E(gl[i][0] - 5, gl[i][1], gl[i][2], gl[i][3], '#16271e', 1, 2); E(gl[i][0] + 7, gl[i][1] + 3, gl[i][2] - 6, gl[i][3] - 2, '#16271e', 1, 2); E(gl[i][0], gl[i][1] + 1, gl[i][2] - 9, gl[i][3] - 3, '#182a20', 1, 1); }
  /* 中景樹幹 */
  var mids = [[30, 5, 98], [74, 4, 84], [118, 6, 106], [160, 5, 90], [198, 4, 84], [218, 3, 80], [274, 4, 82], [302, 6, 96], [336, 5, 104], [366, 6, 114]];
  for (i = 0; i < mids.length; i++) trunk(r, mids[i][0], mids[i][1], 0, mids[i][2], '#0d1613', '#172922', true);
  mist(r, 92, 8, JADE, 0.14);
  /* 灌叢與蕨 */
  for (i = 0; i < 130; i++) {
    x = fl(r() * W); y = 84 + fl(r() * 118); if (calm(x, y, 2)) continue;
    var s = 0.6 + (y - 84) / 118;
    if (r() < 0.5) bush(r, x, y, 7 * s + r() * 6, 4 * s + r() * 3, '#0c1612', JD3); else fern(r, x, y, 3 + 3 * s, JD2, r() < 0.3 ? JD1 : JD2);
  }
  /* 近景樹幹 */
  trunk(r, -5, 22, 0, H, '#080c0a', '#1b2f26', false, '#12201a'); trunk(r, 88, 15, 0, 118, '#090e0c', '#1b2f26', true, '#13221b');
  trunk(r, 276, 17, 0, 126, '#090e0c', '#1b2f26', true, '#13221b'); trunk(r, 380, 24, 0, H, '#080c0a', '#1b2f26', false, '#12201a'); trunk(r, 346, 9, 0, 78, '#0b120f', '#172922', true);
  L(88, 112, 78, 120, '#090e0c', 2); L(102, 114, 112, 121, '#090e0c', 2); L(276, 120, 266, 128, '#090e0c', 2); L(292, 122, 303, 129, '#090e0c', 2); P(80, 118, PA2); P(81, 117, PA2); P(300, 127, PA2); P(268, 126, '#8fb5a0');
  /* 樹冠 */
  for (i = 0; i < 46; i++) { x = fl(r() * W); E(x, r() * 9, 10 + r() * 16, 5 + r() * 9, '#070b09', 1, 3); }
  for (i = 0; i < 24; i++) { x = fl(r() * W); E(x, r() * 4, 9 + r() * 12, 4 + r() * 5, '#070b09'); }
  for (i = 0; i < 90; i++) P(fl(r() * W), fl(r() * 22), JD3);
  for (i = 0; i < 12; i++) { x = 20 + fl(r() * 360); L(x, 6, x + rd((r() - 0.5) * 3), 16 + fl(r() * 26), '#0a110e'); }
  /* 藥草、倒木、石 */
  var hp = [[60, 127], [135, 147], [247, 92], [312, 147]];
  for (i = 0; i < 4; i++) { herb(hp[i][0] - 5, hp[i][1] + 2); herb(hp[i][0] + 3, hp[i][1] + 4, i % 2 ? GD1 : JADE); herb(hp[i][0] + 8, hp[i][1], JADE); herb(hp[i][0] - 1, hp[i][1] - 2, i === 2 ? RD1 : JADE); }
  for (i = 0; i < 26; i++) { x = 16 + fl(r() * 366); y = 90 + fl(r() * 105); if (!calm(x, y, -6)) herb(x, y, r() < 0.2 ? GD1 : JD1); }
  R(232, 176, 44, 5, '#0b100d'); R(232, 176, 44, 1, '#1a2c24'); E(232, 178, 2, 3, '#15231c'); P(240, 175, JADE); P(252, 175, PA2); P(253, 174, PA2); P(262, 175, JD1); R(246, 172, 1, 4, '#0b100d');
  rock(118, 176, 14, 7, ['#0c1210', '#16211c', '#22332b']); rock(300, 182, 10, 5, ['#0c1210', '#16211c', '#22332b']);
  mist(r, 124, 7, JADE, 0.11); mist(r, 104, 4, '#8fb5a0', 0.07);
  /* 近景暗葉 */
  for (i = 0; i < 26; i++) { x = fl(r() * W); if (x > 120 && x < 250) continue; bush(r, x, H + 3, 18 + r() * 14, 9 + r() * 8, '#070b09', JD3); }
}
function adit(cx, yb, w, h, boards) {
  var l = cx - fl(w / 2);
  R(l, yb - h, w, h, '#060505'); R(l + 3, yb - h + 4, w - 6, h - 4, '#030303');
  R(l + 4, yb - h + 6, 2, h - 6, WD0); R(l + w - 6, yb - h + 6, 2, h - 6, WD0); R(l + 3, yb - h + 5, w - 6, 2, WD0);
  R(l - 1, yb - h, 3, h, WD2); R(l - 1, yb - h, 1, h, WD4); R(l + w - 2, yb - h, 3, h, WD1); R(l + w - 2, yb - h, 1, h, WD3);
  R(l - 3, yb - h - 3, w + 6, 3, WD2); R(l - 3, yb - h - 3, w + 6, 1, WD4); R(l - 3, yb - h, w + 6, 1, KK);
  if (boards) { L(l + 1, yb - h * 0.62, l + w - 2, yb - h * 0.4, WD3, 2); L(l + 2, yb - h * 0.2, l + w - 6, yb - h * 0.34, WD2, 2); }
}
function wildChishi() {
  var r = rng(202), i, x, y, t;
  var RK = ['#1a100e', '#231411', '#2b1814', '#331c16', '#3c2119', '#48281d'];
  bands(0, 0, W, 44, ['#0d0b0a', '#110e0c', '#16110e', '#1c1511']);
  hill(prof(r, W, 24, 5, 2.5), 60, '#160f0d');
  /* 赤岩崖壁：層理 */
  var pf = prof(r, W, 30, 7, 4), strata = [], k = 0, c = 2, ph = r() * 6;
  for (y = 0; y < 160; y++) { if (k-- <= 0) { k = 2 + fl(r() * 6); c = 1 + fl(r() * 4); } strata.push(c); }
  for (x = 0; x < W; x++) {
    var top = fl(pf[x] / 3) * 3 + (x < 60 ? 6 : 0) - (x > 300 ? 6 : 0), base = rd(104 + sin(x / 50 + 1) * 6);
    var wob = rd(sin(x / 44 + ph) * 3 + sin(x / 9) * 0.8);
    for (y = top; y < base; y++) P(x, y, RK[strata[y + wob + 8]]);
    P(x, top, RK[5]); P(x, top + 1, RK[4]);
  }
  for (i = 0; i < 46; i++) { x = fl(r() * W); y = 30 + fl(r() * 50); var len = 8 + fl(r() * 30); R(x, y, 1, len, RK[0]); if (r() < 0.6) R(x - 1, y + 2, 1, len - 4, RK[4], 0.5); }
  for (i = 0; i < 9; i++) { x = fl(r() * W); var w = 8 + fl(r() * 14); Dz(x, 34, w, 74, '#150d0b', 2); R(x + w, 40, 1, 60, RK[4], 0.4); }
  mist(r, 98, 8, '#643626', 0.2);
  /* 礦場地面 */
  for (x = 0; x < W; x++) { var b2 = rd(104 + sin(x / 50 + 1) * 6); R(x, b2, 1, H - b2, '#1e1411'); P(x, b2, '#120c0a'); }
  Dz(0, 126, W, 3, '#18100e', 2); R(0, 129, W, 30, '#18100e'); Dz(0, 157, W, 3, '#130d0b', 2); R(0, 160, W, 42, '#130d0b');
  for (i = 0; i < 420; i++) { x = fl(r() * W); y = 110 + fl(r() * 92); P(x, y, r() < 0.5 ? '#2b1814' : '#0e0908'); }
  for (x = 0; x < W; x += 5 + fl(r() * 9)) { t = 104 + sin(x / 50 + 1) * 6; rock(x, t + 3 + r() * 3, 5 + r() * 7, 2 + r() * 4, [RK[0], RK[2], RK[4]]); }
  /* 軌道 */
  var path = [[165, 80], [176, 100], [204, 122], [246, 140], [290, 150]], seg, n, s, px, py, hw;
  for (seg = 0; seg < path.length - 1; seg++) {
    n = 14;
    for (s = 0; s < n; s++) {
      t = s / n; px = path[seg][0] + (path[seg + 1][0] - path[seg][0]) * t; py = path[seg][1] + (path[seg + 1][1] - path[seg][1]) * t; hw = 2 + (py - 80) / 22;
      if ((seg === 2 && s > 8) || (seg === 3 && s < 3)) continue;
      if (s % 3 === 0) R(px - hw - 1, py, hw * 2 + 3, 1, WD1);
      R(px - hw, py, 1, 2, A2); R(px + hw, py, 1, 2, A1);
    }
  }
  L(262, 134, 272, 131, A1); L(256, 139, 262, 143, A2); R(250, 137, 7, 1, WD1);
  for (s = 0; s < 12; s++) { t = s / 12; px = 280 + 6 * t; py = 90 + 40 * t; hw = 2 + (py - 80) / 24; if (s % 3 === 0) R(px - hw - 1, py, hw * 2 + 3, 1, WD1); R(px - hw, py, 1, 3, A1); R(px + hw, py, 1, 3, A0); }
  /* 坑口 */
  adit(165, 79, 28, 30, false); adit(280, 89, 24, 26, true);
  adit(66, 96, 22, 18, false);
  for (i = 0; i < 9; i++) rock(54 + i * 3 + r() * 3, 100 - (i > 2 && i < 7 ? 6 : 0) + r() * 3, 6 + r() * 6, 4 + r() * 5, [RK[0], RK[2], RK[4]]);
  L(58, 80, 78, 96, WD2, 2); P(63, 99, GD1); P(71, 95, GD2); P(60, 96, A3);
  for (i = 0; i < 5; i++) rock(152 + i * 6 + r() * 2, 84 + r() * 2, 4 + r() * 3, 2 + r() * 2, [RK[0], RK[2], RK[4]]);
  /* 翻覆礦車與礦堆 */
  var cxp = 296, cyp = 156;
  for (i = 0; i < 9; i++) { R(cxp - 9 + fl(i / 3), cyp - 12 + i, 18, 1, i === 0 ? WD4 : WD2); P(cxp - 9 + fl(i / 3), cyp - 12 + i, WD4); P(cxp + 8 + fl(i / 3), cyp - 12 + i, WD0); }
  R(cxp - 8, cyp - 9, 18, 1, A0); R(cxp - 7, cyp - 5, 18, 1, A0); E(cxp - 3, cyp - 1, 3, 3, K0); E(cxp + 8, cyp - 2, 3, 3, K0); P(cxp - 3, cyp - 1, A3); P(cxp + 8, cyp - 2, A3);
  for (i = 0; i < 7; i++) rock(316 + i * 4 - (i > 3 ? 12 : 0), 156 - (i > 3 ? 4 : 0) + r() * 2, 6 + r() * 4, 3 + r() * 3, [RK[0], RK[3], RK[5]]);
  P(320, 151, GD1); P(327, 153, GOLD); P(333, 152, GD2); P(323, 148, GD2); P(330, 149, A3);
  /* 井架殘骸、木料、梯 */
  L(356, 108, 366, 42, WD1, 2); L(390, 110, 372, 42, WD0, 2); L(360, 84, 384, 76, WD1); L(384, 92, 362, 66, WD0); R(362, 40, 14, 2, WD2); E(369, 36, 4, 4, WD1); E(369, 36, 2, 2, '#16110e'); L(369, 40, 367, 70, K0);
  for (i = 0; i < 4; i++) { R(22 + i * 2, 150 + i * 3, 40, 2, i % 2 ? WD1 : WD2); P(22 + i * 2, 150 + i * 3, WD4); }
  L(118, 104, 124, 58, WD1); L(124, 104, 130, 58, WD1); for (i = 0; i < 9; i++) if (i !== 4 && i !== 5) L(119 + i * 0.7, 100 - i * 5, 125 + i * 0.7, 100 - i * 5, WD2);
  /* 前景岩塊 */
  rock(14, H + 4, 46, 26, ['#0b0706', '#170e0c', '#231411']); rock(382, H + 4, 50, 30, ['#0b0706', '#170e0c', '#231411']); rock(96, H + 3, 26, 12, ['#0b0706', '#170e0c', '#231411']);
  mist(r, 118, 6, '#7d4630', 0.07);
  for (i = 0; i < 5; i++) Dz(0, i * 2, W, 2, '#0a0807', 2, 0.5 - i * 0.1);
}
function deadTree(r, x, y, len, ang, th, c, depth) {
  var x2 = x + cos(ang) * len, y2 = y + sin(ang) * len; L(x, y, x2, y2, c, th);
  if (depth > 0) { var n = 2 + (r() < 0.3 ? 1 : 0); for (var i = 0; i < n; i++) deadTree(r, x + (x2 - x) * (0.6 + r() * 0.4), y + (y2 - y) * (0.6 + r() * 0.4), len * (0.55 + r() * 0.25), ang + (r() - 0.5) * 1.5, Math.max(1, th - 1), c, depth - 1); }
}
function bigDead(r, x, yb, yt, lean, c, hl) {
  var y, cx, hw, pts = [];
  for (y = yb; y >= yt; y--) {
    var t = (yb - y) / (yb - yt); cx = x + lean * (yb - y) + sin(y / 15) * 2.5; hw = 2 + (1 - t) * 6 + (t < 0.08 ? (0.08 - t) * 60 : 0);
    R(cx - hw, y, hw * 2, 1, c); if (y % 3) P(rd(cx - hw), y, hl); if (hw > 4 && y % 5 === 0) R(cx - hw * 0.3, y, 1, 3, hl, 0.5);
    pts.push([cx, y, t]);
  }
  for (var i = 0; i < pts.length; i += 1) { var p = pts[i]; if (p[2] > 0.3 && r() < 0.085) { var sd = r() < 0.5 ? -1 : 1; deadTree(r, p[0], p[1], 14 + r() * 16, -PI / 2 + sd * (0.6 + r() * 0.5), p[2] < 0.7 ? 3 : 2, c, 3); } }
  var tp = pts[pts.length - 1]; deadTree(r, tp[0], tp[1], 12, -PI / 2 - 0.5, 2, c, 2); deadTree(r, tp[0], tp[1], 9, -PI / 2 + 0.6, 2, c, 2);
  E(x + lean * 40, yb - 46, 2, 3, KK);
}
function claw(x, y, len, dir) { for (var k = 0; k < 3; k++) { var x0 = x + k * 5 * dir, y0 = y + k * 2, l = len - abs(k - 1) * 3; L(x0, y0, x0 + l * 0.45 * dir, y0 + l, '#0b0908', 1); L(x0 + 1, y0, x0 + 1 + l * 0.45 * dir, y0 + l - 2, '#332b20', 1); L(x0 + 1 * dir, y0 + 2, x0 + (l * 0.45 - 1) * dir, y0 + l - 2, '#0b0908', 2); } }
function bone(x, y, len, ang) { var x2 = x + cos(ang) * len, y2 = y + sin(ang) * len; L(x, y, x2, y2, BN1); P(x, y - 1, BN2); P(rd(x2), rd(y2) + 1, BN1); P(x - 1, y, BN2); P(rd(x2) + 1, rd(y2), BN2); }
function wildKugu() {
  var r = rng(303), i, x, y, t, cx, hw;
  bands(0, 0, W, 66, ['#0f0e0c', '#131210', '#181613', '#1e1a15', '#262019', '#2f271d']);
  E(292, 50, 9, 9, '#372c20'); E(292, 50, 6, 6, '#42352a');
  hill(prof(r, W, 57, 5, 1.5), 70, '#1a1713');
  for (i = 0; i < 18; i++) { x = fl(r() * W); deadTree(r, x, 66, 5 + r() * 8, -PI / 2 + (r() - 0.5) * 0.4, 1, '#14120f', 2); }
  mist(r, 58, 8, '#5a4f3e', 0.22);
  bands(0, 66, W, 136, ['#221d17', '#1f1a15', '#1b1712', '#171410', '#13110d', '#100e0b']);
  for (i = 0; i < 600; i++) { x = fl(r() * W); y = 68 + fl(r() * 134); P(x, y, r() < 0.5 ? '#2c251c' : '#0f0d0a'); }
  /* 獸徑 */
  function tc(y) { var t = (y - 64) / 138; return 228 - 40 * t + 26 * sin(t * 4.2) * (1 - t * 0.3); }
  for (y = 66; y < H; y++) {
    t = (y - 64) / 138; cx = rd(tc(y)); hw = rd(2 + 78 * Math.pow(t, 1.4));
    R(cx - hw, y, hw * 2, 1, '#29231a'); Dz(cx - hw - 4, y, 4, 1, '#29231a', 2); Dz(cx + hw, y, 4, 1, '#29231a', 2);
    if (hw > 6) { Dz(cx - rd(hw * 0.4) - 1, y, 2 + fl(hw / 20), 1, '#1d1812', (y & 3) ? 3 : 1); Dz(cx + rd(hw * 0.35), y, 2 + fl(hw / 20), 1, '#1d1812', (y & 2) ? 3 : 1); }
    if (r() < 0.5) R(cx - hw + fl(r() * hw * 2), y, 2 + fl(r() * 5), 1, r() < 0.5 ? '#302a20' : '#221d16');
  }
  /* 爪痕 */
  claw(150, 112, 14, 1); claw(262, 122, 16, -1); claw(84, 172, 18, 1); claw(214, 186, 12, 1); claw(300, 96, 9, -1);
  /* 枯樹 */
  var trees = [[112, 84, 14, 1], [154, 78, 10, 1], [268, 80, 12, 1], [292, 74, 9, 1], [348, 88, 16, 2], [30, 92, 15, 2]];
  for (i = 0; i < trees.length; i++) { var q = trees[i]; L(q[0], q[1], q[0], q[1] - q[2], '#110f0c', q[3]); deadTree(r, q[0], q[1] - q[2] * 0.6, q[2] * 0.7, -PI / 2 - 0.6, 1, '#110f0c', 2); deadTree(r, q[0], q[1] - q[2], q[2] * 0.7, -PI / 2 + 0.4, 1, '#110f0c', 2); }
  /* 左、右大枯樹 */
  bigDead(r, 30, 134, 14, 0.07, '#0d0b09', '#211c16'); bigDead(r, 372, 152, 10, -0.05, '#0c0a08', '#1e1a14');
  L(25, 86, 30, 99, BN0); L(28, 85, 33, 98, BN0); L(31, 84, 36, 96, BN0);
  /* 巨獸肋骨（右下） */
  var sx0 = 262, sy0 = 150;
  for (i = 0; i < 9; i++) {               // 遠側肋
    var bx = sx0 + 6 + i * 10, hh = 22 + sin(i / 8 * PI) * 16, k;
    for (k = 0; k <= 14; k++) { t = k / 14; P(bx + 4 + sin(t * PI) * 5 + t * 3, sy0 + 4 + t * hh * 0.8, BN0); }
  }
  for (i = 0; i < 10; i++) { x = sx0 + i * 10; y = sy0 + rd(sin(i / 9 * PI) * -3) + (i > 7 ? (i - 7) * 5 : 0); R(x, y, 7, 3, BN1); R(x, y, 6, 1, BN3); P(x + 3, y - 1, BN2); P(x + 7, y + 1, BN0); }
  for (i = 0; i < 9; i++) {               // 近側肋
    bx = sx0 + 2 + i * 10; hh = 26 + sin(i / 8 * PI) * 18; var by0 = sy0 + rd(sin(i / 9 * PI) * -3) + 2;
    for (k = 0; k <= 22; k++) { t = k / 22; x = bx - sin(t * PI) * (7 + hh * 0.12) + t * 4; y = by0 + t * hh; R(x, y, t < 0.7 ? 2 : 1, 1, t < 0.5 ? BN2 : BN1); if (t < 0.4) P(x, y, BN3); }
  }
  /* 巨獸顱骨（左下） */
  E(52, 180, 17, 11, BN0); E(50, 178, 16, 10, BN1); E(46, 175, 10, 6, BN2); T(178, 190, 22, 40, 16, 44, BN1); T(178, 183, 22, 36, 18, 36, BN2);
  E(56, 179, 4, 4, '#0d0b09'); P(55, 177, BN0); R(24, 184, 4, 2, '#0d0b09'); for (i = 0; i < 6; i++) { R(19 + i * 4, 191, 2, 3, BN2); P(19 + i * 4, 193, BN1); }
  for (i = 0; i <= 18; i++) { t = i / 18; R(60 + t * 22, 170 - sin(t * PI * 0.6) * 20, 3 - rd(t * 2), 3 - rd(t * 2), i % 4 ? BN1 : BN0); }
  L(40, 182, 47, 186, BN0); L(60, 186, 66, 189, BN0);
  /* 散骨 */
  var bs = [[196, 128, 7, 0.3], [238, 106, 5, 2.6], [176, 100, 4, 0.2], [108, 136, 8, 2.8], [232, 186, 9, 0.5], [142, 190, 7, 2.9], [338, 128, 6, 0.4], [210, 92, 3, 0.1], [92, 116, 5, 0.6]];
  for (i = 0; i < bs.length; i++) bone(bs[i][0], bs[i][1], bs[i][2], bs[i][3]);
  S(246, 158, ['.lll.', 'lllll', 'ldldl', 'lllll', '.lml.', '.m.m.'], { l: BN2, d: '#0d0b09', m: BN0 });
  S(120, 108, ['.ll.', 'llll', 'ldld', '.lm.'], { l: BN1, d: '#0d0b09', m: BN0 });
  /* 枯草 */
  for (i = 0; i < 80; i++) { x = fl(r() * W); y = 80 + fl(r() * 120); t = (y - 64) / 138; if (abs(x - tc(y)) < 2 + 78 * Math.pow(t, 1.4)) continue; L(x, y, x - 1, y - 3 - t * 3, '#3a3024'); L(x + 1, y, x + 2, y - 2 - t * 3, '#2c251c'); L(x + 2, y, x + 4, y - 2 - t * 2, '#3a3024'); }
  mist(r, 82, 7, '#6b5d48', 0.12); mist(r, 126, 6, '#6b5d48', 0.07);
  for (i = 0; i < 5; i++) Dz(0, i * 2, W, 2, '#0a0908', 2, 0.5 - i * 0.1);
}

/* ---------- 戰鬥背景 ---------- */
function hsh(a, b) { var h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0; return (h % 97) / 97; }
function brickC(x, y, pal, bh, bw) {
  var row = fl(y / bh), off = (row & 1) * fl(bw / 2), col = fl((x + off) / bw);
  if (y % bh === bh - 1 || (x + off) % bw === bw - 1) return pal[0];
  var q = hsh(col, row); return q < 0.18 ? pal[3] : q > 0.8 ? pal[2] : pal[1];
}
function niche(x, y, w, h, kind) {
  R(x - 1, y + 2, w + 2, h - 1, '#3a251c'); E(x + fl(w / 2), y + 4, fl(w / 2) + 1, 5, '#3a251c');
  R(x, y + 3, w, h - 3, '#070605'); E(x + fl(w / 2), y + 4, fl(w / 2), 4, '#070605'); R(x - 2, y + h, w + 4, 2, '#4a3024'); R(x - 2, y + h, w + 4, 1, '#5a3c2c');
  var cx = x + fl(w / 2);
  if (kind === 0) S(cx - 3, y + h - 7, ['.lll.', 'lllll', 'ldldl', 'lllll', '.lml.', '.m.m.', '.....'], { l: BN1, d: '#0d0b09', m: BN0 });
  else if (kind === 1) { R(cx - 2, y + h - 9, 5, 1, A1); R(cx - 3, y + h - 8, 7, 6, '#2c2622'); R(cx - 2, y + h - 2, 5, 2, '#2c2622'); P(cx - 2, y + h - 7, A2); P(cx - 2, y + h - 6, A1); }
  else { L(cx - 4, y + h - 2, cx + 3, y + h - 4, BN1); L(cx - 3, y + h - 5, cx + 4, y + h - 1, BN0); P(cx, y + h - 6, BN1); P(cx + 1, y + h - 6, BN1); }
}
function dgGuyao() {
  var r = rng(404), x, y, i, dx, dy, d, c;
  var FR = ['#100b09', '#2a1a14', '#34211a', '#20140f'], MD = ['#0c0807', '#1b120f', '#211612', '#150e0b'], BK = ['#090706', '#130e0c', '#17110e', '#0f0b09'];
  var fy = 158;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    dx = (x - 199) / 141; dy = (y - 128) / 112; d = y <= 128 ? Math.sqrt(dx * dx + dy * dy) : abs(dx);
    if (d >= 1) {                                       // 前景磚牆與拱券
      if (d < 1.08 && y <= 128) { var an = Math.atan2(-dy, dx), q = an * 38 / PI, f = q - fl(q); c = (d < 1.012 || d > 1.07) ? '#120c0a' : f < 0.12 ? '#150e0b' : (fl(q) & 1) ? '#3f291f' : '#38241b'; }
      else c = brickC(x, y, FR, 5, 11);
    } else {
      var xl = 103 - (y - fy) * 0.49, xr = 295 + (y - fy) * 0.49;
      if (y >= fy && x > xl && x < xr) {                // 灰燼地面
        var t = (y - fy) / (H - fy), e = Math.min(x - xl, xr - x) / 100;
        c = t < 0.25 ? '#151311' : t < 0.6 ? '#191715' : '#1d1b18';
        if (e < 0.3 && ((x + y) & 1)) c = '#211f1c'; if (((x * 3 + y * 7) % 11 === 0) && hsh(x, y) > 0.6) c = '#262320';
      } else {
        var dx2 = (x - 199) / 104, dy2 = (y - 138) / 84, d2 = y <= 138 ? Math.sqrt(dx2 * dx2 + dy2 * dy2) : abs(dx2);
        if (y >= fy && (x <= xl || x >= xr)) c = brickC(x + fl(y / 3), y, MD, 6, 13);
        else if (d2 >= 1) c = brickC(x, y + fl(abs(x - 199) / 9), MD, 5, 10);
        else if (d2 > 0.92) c = (y % 6 === 0) ? '#0e0908' : '#261812';
        else c = brickC(x, y, BK, 4, 9);
      }
    }
    P(x, y, c);
  }
  /* 深處拱洞與餘燼 */
  E(199, 122, 30, 30, '#0c0908'); R(169, 122, 61, 36, '#0c0908'); E(199, 124, 26, 26, '#060505'); R(173, 124, 53, 34, '#060505');
  E(199, 156, 24, 8, '#3a1210', 0.25); E(199, 157, 14, 4, '#6e231c', 0.25); P(193, 156, RD2); P(204, 157, RD1); P(199, 155, RD2);
  niche(126, 104, 13, 20, 0); niche(259, 104, 13, 20, 1);
  Dz(104, 60, 190, 98, '#060505', 1, 0.6);
  /* 前景壁龕 */
  niche(14, 62, 17, 30, 1); niche(36, 118, 15, 26, 0); niche(8, 150, 17, 30, 2); niche(366, 66, 17, 30, 0); niche(346, 122, 15, 26, 2); niche(372, 152, 17, 30, 1);
  /* 穹頂破口（右上）與垂根 */
  for (i = 0; i < 16; i++) E(292 + (r() - 0.5) * 34, 16 + (r() - 0.5) * 14, 6 + r() * 7, 4 + r() * 5, '#070605');
  for (i = 0; i < 9; i++) E(292 + (r() - 0.5) * 22, 13 + (r() - 0.5) * 8, 4 + r() * 5, 3 + r() * 3, '#121820');
  P(286, 11, PA2); P(297, 15, A3); P(291, 9, A2);
  for (i = 0; i < 7; i++) { x = 270 + fl(r() * 46); L(x, 22, x + rd((r() - 0.5) * 6), 34 + fl(r() * 24), '#0d0a08'); }
  T(24, 150, 280, 300, 296, 344, '#2a3643', 0.05);
  /* 塌磚堆與斜樑（右下）、骨堆（左下） */
  for (i = 0; i < 26; i++) { x = 300 + r() * 80; y = 250 - r() * (x - 290) * 0.5; R(x, y, 6 + fl(r() * 4), 3, r() < 0.5 ? '#2a1a14' : '#34211a'); R(x, y, 6, 1, '#422a1f'); }
  L(300, 246, 372, 196, WD1, 4); L(300, 246, 372, 196, WD3, 1); L(304, 249, 376, 199, WD0, 1);
  for (i = 0; i < 12; i++) bone(20 + r() * 80, 226 + r() * 22, 5 + r() * 7, r() * PI);
  S(44, 228, ['.lllll.', 'lllllll', 'ldllldl', 'ldllldl', 'lllllll', '.lmlml.', '.l.l.l.'], { l: BN1, d: '#0d0b09', m: BN0 });
  S(72, 238, ['.lll.', 'lllll', 'ldldl', 'lllll', '.lml.'], { l: BN0, d: '#0d0b09', m: '#3a362d' });
  E(60, 249, 54, 9, '#211f1c', 1, 2); E(340, 250, 50, 7, '#211f1c', 1, 2);
  /* 餘燼裂隙 */
  var em = [[84, 208], [96, 214], [108, 206], [318, 186], [326, 192], [76, 196]];
  glow(94, 210, 22, RED, 0.06); glow(322, 189, 14, RED, 0.06);
  for (i = 0; i < em.length; i++) { R(em[i][0], em[i][1], 3 + (i % 2), 1, RD1); P(em[i][0] + 1, em[i][1], i % 2 ? EMB : RED); }
  for (i = 0; i < 20; i++) P(70 + r() * 60, 150 + r() * 60, RD1, 0.5);
  /* 四緣壓暗 */
  for (i = 0; i < 4; i++) { Dz(0, H - 8 + i * 2, W, 2, KK, 2, 0.2 + i * 0.12); Dz(0, 6 - i * 2, W, 2, KK, 2, 0.2 + i * 0.12); }
}
function stal(x, y, w, len, pal, up) {
  for (var j = 0; j < len; j++) {
    var hw = (w / 2) * Math.pow(1 - j / len, 0.75), yy = up ? y - j : y + j, l = rd(x - hw), ww = Math.max(1, rd(hw * 2));
    R(l, yy, ww, 1, pal[1]); if (ww > 2) { P(l, yy, pal[2]); R(l + fl(ww * 0.65), yy, ww - fl(ww * 0.65), 1, pal[0]); }
  }
}
function dgJiku() {
  var r = rng(505), i, x, y, RKc = ['#09080a', '#131116', '#1e1a22'], wy = 132;
  R(0, 0, W, H, '#0a090b');
  /* 血光 */
  E(199, 118, 170, 62, '#150a0b'); E(199, 118, 128, 46, '#1f0b0b'); E(199, 118, 88, 32, '#2b0d0c'); E(199, 118, 52, 20, '#3a100e'); E(199, 119, 26, 10, '#4c1410');
  /* 遠壁 */
  var pf = prof(r, W, 112, 6, 3);
  for (x = 0; x < W; x++) { var d = abs(x - 199); if (d > 46) { var top = wy - rd(Math.min(112, Math.pow(d - 46, 1.12) * 0.62) + (pf[x] - 112) * Math.min(1, (d - 46) / 30)); R(x, top, 1, wy - top, '#0d0c0f'); P(x, top, '#171419'); } }
  var cols = [[104, 9], [128, 5], [286, 6], [262, 4]];
  for (i = 0; i < cols.length; i++) { for (y = 20; y < wy; y++) { var cw = cols[i][1] * (0.55 + 0.45 * Math.pow(abs((y - 76) / 56), 1.6)); R(cols[i][0] - cw, y, cw * 2, 1, '#0b0a0d'); P(rd(cols[i][0] - cw), y, '#151218'); } }
  /* 祭壇剪影 */
  R(168, 126, 62, 6, '#080708'); R(174, 121, 50, 5, '#080708'); R(180, 116, 38, 5, '#080708'); R(188, 108, 22, 8, '#080708'); R(185, 106, 28, 2, '#080708');
  R(176, 96, 3, 25, '#080708'); R(220, 96, 3, 25, '#080708'); P(177, 94, '#080708'); P(221, 94, '#080708'); R(175, 95, 5, 1, '#080708'); R(219, 95, 5, 1, '#080708');
  T(98, 105, 197, 201, 193, 205, '#080708'); R(198, 94, 2, 5, '#080708');
  P(177, 93, EMB); P(221, 93, EMB); P(177, 92, RED); P(221, 92, RED); R(192, 116, 1, 10, RD2); R(205, 116, 1, 14, RD2); R(199, 108, 1, 6, RD2); P(193, 106, RD1); P(204, 106, RD1);
  /* 黑水 */
  R(0, wy, W, H - wy, '#070609'); R(0, wy, W, 1, '#16131a');
  for (y = wy + 2; y < 196; y += 2) { var sp = (y - wy) * 0.55, a = 0.55 - (y - wy) / 120; for (i = 0; i < 9; i++) { x = 199 + (r() - 0.5) * (50 + sp * 2); R(x - 3 - r() * 6, y, 5 + r() * 12, 1, (abs(x - 199) < 14 + sp * 0.3) ? '#4c1410' : '#2b0d0c', Math.max(0.1, a)); } }
  for (i = 0; i < 70; i++) { x = fl(r() * W); y = wy + 4 + fl(r() * (H - wy - 6)); R(x, y, 6 + fl(r() * 22), 1, '#121015'); }
  /* 石筍與倒影 */
  var sg = [[22, 44, 70], [50, 22, 44], [72, 12, 26], [96, 8, 16], [372, 46, 76], [344, 24, 48], [320, 12, 28], [300, 7, 14]];
  for (i = 0; i < sg.length; i++) { stal(sg[i][0], wy + 6 + sg[i][1] * 0.3, sg[i][1], sg[i][2], RKc, true); Dz(sg[i][0] - sg[i][1] / 2, wy + 7 + sg[i][1] * 0.3, sg[i][1], sg[i][2] * 0.4, '#0b0a0d', 2); }
  /* 洞頂與鐘乳石 */
  var cp = prof(r, W, 16, 5, 3);
  for (x = 0; x < W; x++) { var cd = cp[x] + rd(Math.pow(abs(x - 199) / 199, 2) * 34); R(x, 0, 1, cd, '#0c0b0e'); P(x, cd, '#18151b'); }
  for (i = 0; i < 46; i++) { x = fl(r() * W); var e = abs(x - 199) / 199, w = 4 + r() * 6 + e * 8, len = 8 + r() * 14 + e * e * 78 * (0.4 + r() * 0.6); stal(x, cp[x] + rd(e * e * 34) - 2, w, len, RKc, false); }
  /* 鐵鍊與吊籠 */
  for (i = 0; i < 4; i++) { x = [52, 118, 290, 350][i]; var ln = [70, 40, 46, 64][i]; for (y = 20; y < 20 + ln; y++) P(x + ((y >> 1) & 1), y, (y & 1) ? '#2a262e' : '#16131a'); if (i % 3 === 0) { R(x - 4, 20 + ln, 10, 1, '#2a262e'); for (var k = 0; k < 4; k++) R(x - 4 + k * 3, 20 + ln, 1, 13, '#221f26'); R(x - 4, 33 + ln, 10, 1, '#16131a'); P(x, 28 + ln, BN0); P(x + 1, 29 + ln, BN0); } else { P(x - 1, 20 + ln, '#2a262e'); P(x - 1, 21 + ln, '#2a262e'); P(x, 22 + ln, '#2a262e'); } }
  /* 前景岩岸 */
  rock(20, H + 8, 90, 40, ['#060507', '#0c0b0e', '#17141a']); rock(380, H + 8, 96, 44, ['#060507', '#0c0b0e', '#17141a']);
  S(40, 222, ['.lll.', 'lllll', 'ldldl', 'lllll', '.lml.'], { l: BN0, d: '#0a0809', m: '#34302a' }); S(352, 220, ['.lll.', 'lllll', 'ldldl', 'lllll', '.lml.'], { l: BN0, d: '#0a0809', m: '#34302a' });
  P(48, 226, RD2); R(30, 228, 6, 1, BN0);
  mist(r, wy - 4, 7, '#6e1c16', 0.12, 40, 358);
}
function pine(r, x, yb, h) {
  var i, c = '#0b0d0b';
  for (i = 0; i < h; i++) R(x + rd(sin(i / 9) * 3) - fl(i / (h / 3)) + 2, yb - i, 4 - fl(i / (h / 2.5)), 1, c);
  var pads = [[-14, 0.55, 20, 4], [10, 0.68, 22, 4], [-10, 0.82, 18, 4], [8, 0.93, 16, 3], [-2, 1.02, 14, 3]];
  for (i = 0; i < pads.length; i++) { var px = x + pads[i][0], py = yb - h * pads[i][1]; L(x + 1, py + 5, px, py, c); E(px, py, pads[i][2] / 2, pads[i][3], c); E(px - 2, py - 2, pads[i][2] / 3, 2, c); for (var k = 0; k < 8; k++) P(px - pads[i][2] / 2 + r() * pads[i][2], py - pads[i][3] + r() * 3, '#16201a'); }
}
function road() {
  var r = rng(606), i, x, y, t, cx, hw;
  bands(0, 0, W, 104, ['#0d0f14', '#11141a', '#161920', '#1c1c22', '#231e20', '#2b211e', '#33261e']);
  for (i = 0; i < 5; i++) { x = 40 + fl(r() * 300); y = 30 + fl(r() * 40); R(x, y, 24 + fl(r() * 40), 1, '#1d1e25'); R(x + 6, y + 1, 14 + fl(r() * 20), 1, '#1d1e25'); }
  hill(prof(r, W, 70, 12, 2), 112, '#1a212b'); mist(r, 84, 6, '#2f3a47', 0.4);
  hill(prof(r, W, 86, 9, 2), 116, '#141a22', '#1b232d'); mist(r, 97, 6, '#2a3440', 0.4);
  hill(prof(r, W, 100, 5, 1.5), 124, '#0f141a');
  /* 地面 */
  bands(0, 108, W, 142, ['#161512', '#151411', '#131210', '#11100e', '#0f0e0c', '#0d0c0b']);
  for (i = 0; i < 500; i++) { x = fl(r() * W); y = 110 + fl(r() * 140); P(x, y, r() < 0.5 ? '#1e1c18' : '#0b0a09'); }
  /* 山徑 */
  function tc(y) { var t = (y - 110) / 140; return 214 - 18 * t - 22 * sin(t * 3.4) * (1 - t * 0.5); }
  for (y = 110; y < H; y++) {
    t = (y - 110) / 140; cx = rd(tc(y)); hw = rd(3 + 92 * Math.pow(t, 1.5));
    R(cx - hw, y, hw * 2, 1, t < 0.3 ? '#22201b' : '#1f1d19'); Dz(cx - hw - 5, y, 5, 1, '#1f1d19', 2); Dz(cx + hw, y, 5, 1, '#1f1d19', 2);
    if (hw > 8) { Dz(cx - rd(hw * 0.42), y, 2 + fl(hw / 24), 1, '#171512', (y & 3) ? 3 : 1); Dz(cx + rd(hw * 0.36), y, 2 + fl(hw / 24), 1, '#171512', (y & 2) ? 3 : 1); }
    if (r() < 0.35) R(cx - hw + fl(r() * hw * 2), y, 2 + fl(r() * 6), 1, r() < 0.5 ? '#262420' : '#1a1815');
  }
  /* 左側山壁與松 */
  var wv = 0, xe;
  for (y = 40; y < H; y++) { wv = (wv + (r() - 0.5) * 3) * 0.88; xe = rd(18 + (y - 40) * 0.36 + wv + sin(y / 13) * 5 - Math.max(0, y - 190) * 0.5); R(0, y, xe, 1, '#0f0e0d'); P(xe - 1, y, '#191816'); if (r() < 0.25) R(fl(r() * xe), y, 3 + fl(r() * 9), 1, '#171614'); }
  pine(r, 30, 96, 62);
  /* 右側巨岩與界碑 */
  rock(372, 190, 70, 64, ['#0b0b0c', '#131314', '#1d1d1f']); rock(340, 204, 34, 22, ['#0b0b0c', '#151516', '#202022']); rock(392, 252, 60, 40, ['#080808', '#0f0f10', '#18181a']);
  R(326, 164, 13, 34, '#201f1e'); R(326, 164, 2, 34, '#2e2c29'); R(336, 164, 3, 34, '#151413'); R(324, 161, 17, 3, '#2a2826'); R(324, 161, 17, 1, '#3d3a36'); R(323, 196, 19, 4, '#1a1918'); R(323, 196, 19, 1, '#2e2c29');
  glyph(330, 169, '#3d3a36', 0); glyph(330, 176, '#3d3a36', 3); glyph(330, 183, '#3d3a36', 1); R(329, 190, 5, 4, RD2); P(330, 191, RD1);
  /* 枯草與碎石 */
  for (i = 0; i < 110; i++) { x = fl(r() * W); y = 122 + fl(r() * 128); t = (y - 110) / 140; if (abs(x - tc(y)) < 6 + 92 * Math.pow(t, 1.5)) continue; var s = 2 + t * 4; L(x, y, x - 1, y - s, '#2a271f'); L(x + 1, y, x + 2, y - s + 1, '#1f1d18'); L(x + 2, y, x + 4, y - s + 1, '#2a271f'); }
  for (i = 0; i < 14; i++) { x = fl(r() * W); y = 150 + fl(r() * 100); t = (y - 110) / 140; if (abs(x - tc(y)) < 3 + 92 * Math.pow(t, 1.5) && x > 150 && x < 250) continue; rock(x, y, 4 + r() * 6 * (0.5 + t), 2 + r() * 3 * (0.5 + t), ['#0c0c0c', '#191816', '#262420']); }
  rock(60, 232, 30, 14, ['#0a0a0a', '#141312', '#1f1e1c']); rock(36, 254, 60, 24, ['#080808', '#0f0f0e', '#191817']);
  mist(r, 112, 7, '#3a424c', 0.22); mist(r, 138, 5, '#3a424c', 0.07);
  for (i = 0; i < 4; i++) Dz(0, H - 8 + i * 2, W, 2, KK, 2, 0.2 + i * 0.12);
}

/* ---------- 產出 ---------- */
function scene(id, w, h, fn) {
  var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  var ctx = cv.getContext('2d'), img = ctx.createImageData(w, h);
  W = w; H = h; D = img.data;
  for (var i = 3; i < D.length; i += 4) D[i] = 255;
  R(0, 0, w, h, K0); fn();
  ctx.putImageData(img, 0, 0);
  URLS[id] = cv.toDataURL('image/png'); SIZES[id] = [w * 2, h * 2];
  D = null;
}
scene('town_huiyao', 398, 165, townHuiyao);
scene('town_duyin', 398, 165, townDuyin);
scene('wild_qingwu', 398, 202, wildQingwu);
scene('wild_chishi', 398, 202, wildChishi);
scene('wild_kugu', 398, 202, wildKugu);
scene('dg_guyao', 398, 250, dgGuyao);
scene('dg_jiku', 398, 250, dgJiku);
scene('road', 398, 250, road);

var css = '', ids = Object.keys(URLS);
for (var n = 0; n < ids.length; n++) css += '.sc-' + ids[n] + '{background-image:url(' + URLS[ids[n]] + ');background-size:100% 100%;image-rendering:pixelated}\n';
var st = document.createElement('style'); st.id = 'shl-scenes'; st.textContent = css;
(document.head || document.documentElement).appendChild(st);

window.SHL_SCENES = {
  has: function (id) { return Object.prototype.hasOwnProperty.call(URLS, id); },
  list: function () { return ids.slice(); },
  size: function (id) { return SIZES[id] ? SIZES[id].slice() : null; },   // 顯示尺寸 [w, h]
  buildings: BLD,
  renderMs: ((typeof performance !== 'undefined') ? performance.now() : Date.now()) - T0
};
})();
