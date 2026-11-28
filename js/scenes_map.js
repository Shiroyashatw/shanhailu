/* 山海錄 v0.3 — 世界地圖與新增場景背景（須於 js/scenes.js 之後載入；本檔自足，不相依其內部）。
 * 作法同 scenes.js：載入時以程式繪成低解析度像素畫（整數矩形填色、種子亂數、色階網點，無漸層、無外部圖檔），
 * 轉成 data URL 後注入一張 <style id="shl-scenes-map">：.sc-<id>{background-image:…}，以 2× pixelated 顯示。
 *   map_region    398×280  區域行旅圖「西山東麓・灰窯原」
 *   map_continent 340×270  山海大陸全圖
 *   wild_fuzhao / wild_chakou  398×202  荒野背景
 *   dg_liekou / dg_guzhong     398×250  戰鬥背景
 * 並擴充 window.SHL_SCENES：保留既有全部屬性，has()/list()/size() 涵蓋新舊場景，
 * 另加 regions（大陸全圖的標籤錨點與「此處」金框，顯示像素 680×540）。 */
(function () {
'use strict';
if (typeof document === 'undefined') return;          // 非瀏覽器環境直接略過
var now = function () { return (typeof performance !== 'undefined') ? performance.now() : Date.now(); };
var T0 = now();
var W = 0, H = 0, D = null, CC = {}, URLS = {}, SIZES = {}, M = null;
var fl = Math.floor, rd = Math.round, sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs, sqrt = Math.sqrt, min = Math.min, max = Math.max;

/* ---------- 調色盤（與 scenes.js 同系） ---------- */
var K0 = '#0f0e0c', KK = '#0a0908',
    A0 = '#2e2c29', A1 = '#3d3a36', A2 = '#4f4b45', A3 = '#66615a', A4 = '#857f75',
    WD0 = '#1f1610', WD1 = '#2b1f16', WD2 = '#3b2a1c', WD3 = '#4d3724', WD4 = '#634a30', WD5 = '#7d6040',
    RED = '#b5382c', RD1 = '#8c2c22', RD2 = '#5e1f19',
    GOLD = '#c9a24a', GD1 = '#8a6c2e', GD2 = '#5c4a22',
    JADE = '#5f9a7a', JD1 = '#3f6d57', JD2 = '#2a4a3c', JD3 = '#1a2e26',
    PAR = '#d8cfbd', PA1 = '#a59c88', PA2 = '#7b735f',
    BZ0 = '#2e2616', BZ1 = '#4a3d22', BZ2 = '#6b5a30', BZ3 = '#93803f',
    EMB = '#e0863a', EMH = '#f2c46a',
    BN0 = '#4e493d', BN1 = '#6f6858', BN2 = '#8f8672', BN3 = '#aea48f',
    SL = ['#14181c', '#222930', '#323b44', '#46515a'];

/* ---------- 基礎繪圖 ---------- */
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
function Dz(x, y, w, h, c, m, a) {               // 網點：m=1 25%、m=2 50%、m=3 75%
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
    var hw = fl(rx * sqrt(max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))) + 0.5);
    if (m) Dz(cx - hw, cy + dy, 2 * hw + 1, 1, c, m, a); else R(cx - hw, cy + dy, 2 * hw + 1, 1, c, a);
  }
}
function L(x0, y0, x1, y1, c, t, a) {
  x0 = rd(x0); y0 = rd(y0); x1 = rd(x1); y1 = rd(y1); t = t || 1;
  var dx = abs(x1 - x0), dy = abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx - dy, e2;
  for (;;) { R(x0, y0, t, t, c, a); if (x0 === x1 && y0 === y1) break; e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; } }
}
function T(y0, y1, l0, r0, l1, r1, c, a, m) {     // 梯形：列 y0..y1，左緣 l0→l1，右緣 r0→r1（右緣不含）
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
    while (x < x1) { var len = 24 + fl(r() * 80), xs = max(x, x0); R(xs, y + j, min(x + len, x1) - xs, 1, c, al); x += len + fl(r() * 30 * (d + 0.2)); }
  }
}
function rock(cx, yb, w, h, pal) {               // 平頂稜角岩：頂面受光、右面背光
  cx = rd(cx); yb = rd(yb); w = max(2, rd(w)); h = max(1, rd(h));
  for (var j = 0; j < h; j++) {
    var t = (j + 1) / h, hw = max(1, rd(w / 2 * min(1, 0.32 + 0.75 * Math.pow(t, 0.7)))), l = cx - hw - rd((1 - t) * w * 0.1), y = yb - h + j;
    var bx = rd(l + hw * 1.35 + (j - h / 2) * 0.35);
    R(l, y, 2 * hw, 1, pal[1]);
    if (bx < l + 2 * hw) R(bx, y, l + 2 * hw - bx, 1, pal[0]);
    if (j < h * 0.3) R(l, y, max(1, min(bx, l + 2 * hw) - l), 1, pal[2]); else P(l, y, pal[2]);
  }
}
function crag(r, cx, yb, w, h, pal) {             // 大塊稜岩：折線輪廓，左斜面受光、右斜面背光
  var n = 3 + fl(r() * 3 + w / 40), pts = [[0, 0.1]], i, k = 0;
  for (i = 1; i < n; i++) pts.push([i / n + (r() - 0.5) * 0.5 / n, 0.5 + r() * 0.5]);
  pts.push([1, 0.08]); w = rd(w);
  for (var x = 0; x < w; x++) {
    var u = x / (w - 1); while (k < pts.length - 2 && u > pts[k + 1][0]) k++;
    var a = pts[k], b = pts[k + 1], hh = rd(h * (a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]))), up = b[1] > a[1], X = rd(cx - w / 2) + x, top = rd(yb) - hh;
    if (hh < 1) continue;
    R(X, top, 1, hh, pal[1]);
    if (up) { R(X, top, 1, max(1, rd(hh * 0.28)), pal[2]); if ((X + top) & 1) P(X, top + rd(hh * 0.28), pal[2]); }
    else { R(X, top + 1, 1, rd(hh * 0.7), pal[0]); P(X, top, pal[1]); }
    if (x > 0 && rd((w - 1) * a[0]) === x) R(X, top + 1, 1, rd(hh * 0.8), pal[0]);
    R(X, rd(yb) - min(hh, 2), 1, 2, pal[0]);
  }
}
function hsh(a, b) { var h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0; return (h % 97) / 97; }
function dtree(r, x, y, len, ang, th, c, depth, ends) {     // 遞迴枯枝；ends 收集梢點
  var x2 = x + cos(ang) * len, y2 = y + sin(ang) * len; L(x, y, x2, y2, c, th);
  if (depth > 0) { var n = 2 + (r() < 0.3 ? 1 : 0); for (var i = 0; i < n; i++) dtree(r, x + (x2 - x) * (0.6 + r() * 0.4), y + (y2 - y) * (0.6 + r() * 0.4), len * (0.55 + r() * 0.25), ang + (r() - 0.5) * 1.5, max(1, th - 1), c, depth - 1, ends); }
  else if (ends) ends.push([x2, y2]);
}
function bone(x, y, len, ang) { var x2 = x + cos(ang) * len, y2 = y + sin(ang) * len; L(x, y, x2, y2, BN1); P(x, y - 1, BN2); P(rd(x2), rd(y2) + 1, BN1); P(x - 1, y, BN2); P(rd(x2) + 1, rd(y2), BN2); }
function calmOf(pts) { return function (x, y, pad) { pad = pad || 0; for (var i = 0; i < pts.length; i++) if (abs(x - pts[i][0]) < 22 + pad && y > pts[i][1] - 15 - pad && y < pts[i][1] + 24 + pad) return true; return false; }; }

/* ---------- 雜訊、網點矩陣、地貌遮罩 ---------- */
var NG = (function () { var r = rng(977), g = new Float32Array(4096); for (var i = 0; i < 4096; i++) g[i] = r(); return g; })();
function vn(x, y) {
  var xi = fl(x), yi = fl(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  var x0 = xi & 63, x1 = (xi + 1) & 63, y0 = (yi & 63) << 6, y1 = ((yi + 1) & 63) << 6, a = NG[x0 + y0], b = NG[x1 + y0], c = NG[x0 + y1], d = NG[x1 + y1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function vnp(x, y, per) {                         // 週期為 per 格的值雜訊
  var xi = fl(x), yi = fl(y), fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  var x0 = (xi % per) & 63, x1 = ((xi + 1) % per) & 63, y0 = ((yi % per) & 63) << 6, y1 = (((yi + 1) % per) & 63) << 6, a = NG[x0 + y0], b = NG[x1 + y0], c = NG[x0 + y1], d = NG[x1 + y1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
var FT = (function () {                           // 256×256 可接續的三層雜訊圖（基準尺度 16 px），供 fbm 內插取樣
  var t = new Float32Array(65536), x, y;
  for (y = 0; y < 256; y++) for (x = 0; x < 256; x++) t[(y << 8) + x] = vnp(x / 16, y / 16, 16) * 0.55 + vnp(x / 8 + 17.3, y / 8 + 5.7, 32) * 0.3 + vnp(x / 4 + 41.1, y / 4 + 29.9, 64) * 0.15;
  return t;
})();
function fbm(x, y, s) {
  x = x * 16 / s; y = y * 16 / s;
  var xi = fl(x), yi = fl(y), fx = x - xi, fy = y - yi, x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) << 8, y1 = ((yi + 1) & 255) << 8, a = FT[x0 + y0], b = FT[x1 + y0], c = FT[x0 + y1], d = FT[x1 + y1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bay(x, y) { return (BAY[(x & 3) + ((y & 3) << 2)] + 0.5) / 16; }
function mE(cx, cy, rx, ry, b) {                 // 在遮罩 M 上塗橢圓
  for (var dy = -ry; dy <= ry; dy++) {
    var y = rd(cy + dy); if (y < 0 || y >= H) continue;
    var hw = rx * sqrt(max(0, 1 - (dy * dy) / (ry * ry + 0.01))), x0 = max(0, rd(cx - hw)), x1 = min(W - 1, rd(cx + hw));
    for (var x = x0; x <= x1; x++) M[y * W + x] = b;
  }
}
function mLn(pts, t, b) { for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], c = pts[i], n = max(abs(c[0] - a[0]), abs(c[1] - a[1])); for (var k = 0; k <= n; k++) mE(a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n, t, t * 0.8, b); } }
function lerpP(pts, x) { for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return pts[pts.length - 1][1]; }
function pals(list) { return list.map(function (p) { return p.map(rgb); }); }
function scatter(r, x0, y0, x1, y1, step, fn) {     // 抖動格點，依 y 由遠而近呼叫
  var pts = [], x, y;
  for (y = y0; y < y1; y += step) for (x = x0; x < x1; x += step) pts.push([x + fl(r() * step), y + fl(r() * step), r()]);
  pts.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  for (var i = 0; i < pts.length; i++) fn(pts[i][0], pts[i][1], pts[i][2]);
}
function vignette(dp, st) {                        // 四緣網點壓暗
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    var d = min(x, W - 1 - x, y, H - 1 - y); if (d >= dp) continue;
    var q = min(4, fl((1 - d / dp) * 4 + bay(x, y))); if (q <= 0) continue;
    var m = 1 - q * st / 4, i = (y * W + x) * 4; D[i] *= m; D[i + 1] *= m; D[i + 2] *= m;
  }
}

/* ---------- 地圖記號 ---------- */
function mtn(cx, yb, h, pal, wob) {              // 山形：左坡受光、右坡背光，[暗, 中, 亮, 峰]
  cx = rd(cx); yb = rd(yb); h = max(2, rd(h));
  for (var j = 0; j < h; j++) {
    var y = yb - h + j, l = rd((j + 1) * 0.95), rr = rd((j + 1) * 0.8), s = ((j * 5 + wob) % 7 === 3) ? 1 : 0;
    R(cx - l, y, l + s, 1, j < h * 0.34 ? pal[3] : pal[2]);
    R(cx + s, y, rr + 1 - s, 1, pal[0]);
    if (j > 1 && (j + wob) % 3 === 0) P(cx - fl(l * 0.55), y, pal[1]);
    if (j > 2 && (j + wob) % 4 === 1) P(cx - l, y, pal[1]);
  }
}
function peak(r, cx, yb, h, pal) {               // 大峰：不規則輪廓、偏移稜線、坡面皴紋
  cx = rd(cx); yb = rd(yb); h = max(3, rd(h));
  var l = 0, rr = 0, rg = 0;
  for (var j = 0; j < h; j++) {
    var y = yb - h + j, q = r();
    l += q < 0.72 ? 1 : q < 0.86 ? 0 : 2; q = r(); rr += q < 0.66 ? 1 : q < 0.84 ? 0 : 2;
    if (j > 1) { q = r(); rg += q < 0.28 ? -1 : q < 0.5 ? 1 : 0; } rg = max(1 - l, min(rr - 1, rg)); if (j < 2) rg = 0;
    R(cx - l, y, l + rg, 1, (j < h * 0.3 || (j < h * 0.3 + 2 && ((cx + y) & 1))) ? pal[3] : pal[2]);
    R(cx + rg, y, rr - rg + 1, 1, pal[0]);
    if (j > 2 && r() < 0.6) { var sx = cx - l + 1 + fl(r() * max(1, l + rg - 1)); P(sx, y, pal[1]); if (r() < 0.5) P(sx + 1, y + 1, pal[1]); }
    if (j > 3 && r() < 0.3) P(cx + rg + 1 + fl(r() * max(1, rr - rg - 1)), y, pal[1]);
  }
}
function tree(x, y, pal, big) {                  // 樹冠：[暗, 中, 亮, 幹]
  if (big) { R(x - 1, y - 5, 3, 1, pal[1]); R(x - 2, y - 4, 5, 3, pal[1]); R(x - 1, y - 1, 3, 1, pal[0]); R(x + 1, y - 4, 2, 3, pal[0]); P(x - 1, y - 5, pal[2]); P(x - 2, y - 4, pal[2]); P(x - 1, y - 4, pal[2]); P(x - 2, y - 3, pal[2]); P(x, y, pal[3]); }
  else { R(x - 1, y - 3, 3, 1, pal[1]); R(x - 2, y - 2, 4, 2, pal[1]); P(x + 1, y - 2, pal[0]); P(x + 1, y - 1, pal[0]); P(x, y - 1, pal[0]); P(x - 1, y - 3, pal[2]); P(x - 2, y - 2, pal[2]); P(x - 1, y, pal[3]); }
}
function snag(r, x, y, h, c, c2) {               // 枯木記號
  R(x, y - h, 1, h, c); P(x, y - 1, c2);
  var k = fl(r() * 2); P(x - 1, y - h + 1 + k, c); P(x - 2, y - h + k, c); P(x + 1, y - h + 2 - k, c); P(x + 2, y - h + 1 - k, c);
  if (h > 4) { P(x - 1, y - h - 1, c); P(x + 1, y - h + 4, c2); }
}
function mound(x, y, w, h, pal) {                // 圓丘：[暗, 中, 亮]
  for (var j = 0; j < h; j++) { var hw = rd(w / 2 * sqrt(1 - Math.pow((h - 1 - j) / h, 2))); R(x - hw, y - h + j + 1, hw * 2 + 1, 1, pal[1]); R(x + fl(hw * 0.4), y - h + j + 1, hw - fl(hw * 0.4) + 1, 1, pal[0]); if (j < h - 1) P(x - hw, y - h + j + 1, pal[2]); }
  R(x - fl(w / 4), y - h + 1, max(1, fl(w / 3)), 1, pal[2]);
}
function hillock(x, y, w, pal) {                 // 矮丘弧線
  for (var i = -w; i <= w; i++) { var hh = rd(sqrt(1 - (i / (w + 0.5)) * (i / (w + 0.5))) * w * 0.5); if (hh < 1) continue; R(x + i, y - hh + 1, 1, hh, i > w * 0.3 ? pal[0] : pal[1]); P(x + i, y - hh, i < w * 0.2 ? pal[2] : pal[1]); }
}
function mesa(x, yb, w, h, pal) {                // 赤岩臺地：[暗, 面, 頂, 亮]
  for (var j = 0; j < h; j++) { var o = j > h * 0.5 ? 1 : 0, y = yb - h + j, sp = x + fl(w * 0.6) + (j & 1); R(x - o, y, w + 2 * o, 1, pal[1]); R(sp, y, x + w + o - sp, 1, pal[0]); }
  R(x, yb - h - 1, w, 1, pal[2]); R(x, yb - h - 1, fl(w * 0.55), 1, pal[3]); R(x + 1, yb - h, w - 1, 1, pal[2]);
  if (h > 3) R(x, yb - fl(h / 2), fl(w * 0.6), 1, pal[0]);
  R(x - 1, yb, w + 3, 1, KK, 0.45);
}
function reed(x, y, c, c2) { P(x, y, c); P(x, y - 1, c); P(x, y - 2, c2); P(x - 1, y, c); P(x + 2, y, c); P(x + 2, y - 1, c2); }
function jag(r, pts, step, amp) {                // 折線加鋸齒（中點位移）
  var out = [pts[0]];
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], len = sqrt(dx * dx + dy * dy), n = max(1, rd(len / step));
    for (var k = 1; k <= n; k++) { var t = k / n, o = k < n ? (r() - 0.5) * 2 * amp : 0; out.push([rd(a[0] + dx * t - dy / len * o), rd(a[1] + dy * t + dx / len * o)]); }
  }
  return out;
}
function crack(pts, cols) {                      // 折線（裂隙），cols=[色, 透明度, 粗細] 由外而內
  for (var k = 0; k < cols.length; k++) for (var i = 1; i < pts.length; i++) {
    var th = cols[k][2] || 1, o = fl(th / 2);
    L(pts[i - 1][0] - o, pts[i - 1][1] - o, pts[i][0] - o, pts[i][1] - o, cols[k][0], th, cols[k][1]);
  }
}

/* ================= 區域行旅圖：西山東麓・灰窯原 ================= */
function mapRegion() {
  var r = rng(1101), x, y, i, k, b, n, t;
  var PL = 0, GR = 1, RG = 2, AS = 3, FO = 4, MA = 5, WA = 6, RR = 7, DE = 8, SC = 9, SK = 10, PT = 11, RA = 12, BU = 13, BG = 14, PS = 15;
  var PAL = pals([
    ['#15130e', '#191610', '#1d1a13'],   // 荒原
    ['#141910', '#181e12', '#1c2415'],   // 草原
    ['#0f1113', '#131619', '#181b1f'],   // 山體
    ['#181716', '#1e1d1c', '#262523'],   // 窯灰
    ['#0b1410', '#0e1914', '#111f19'],   // 林地
    ['#0a100b', '#0e160e', '#121c12'],   // 沼澤
    ['#06090c', '#080d12', '#0b1218'],   // 水
    ['#1e110e', '#271410', '#311913'],   // 赤石
    ['#1a1814', '#201d18', '#26231d'],   // 枯骨地
    ['#18160f', '#1d1a12', '#232015'],   // 灌叢丘陵
    ['#040405', '#040405', '#060607'],   // 沉淵
    ['#24211b', '#2a2720', '#312d25'],   // 臺地
    ['#191312', '#201716', '#281b19'],   // 霧緣焦土
    ['#191918', '#1f1f1e', '#272726'],   // 亂葬崗
    ['#1c1a14', '#211e17', '#27231b'],   // 裸地
    ['#1b1914', '#201e17', '#26231b']    // 關道
  ]);
  var foot = [[0, 56], [60, 53], [120, 47], [200, 45], [226, 47], [254, 46], [290, 37], [397, 35]];
  var B = new Uint8Array(W * H); M = new Uint8Array(W * H);
  /*@r0*//* 地貌遮罩（後塗者蓋前） */
  mLn([[59, 165], [104, 134], [150, 102], [196, 76], [240, 52]], 12, GR);
  mE(150, 102, 34, 17, GR); mE(198, 86, 26, 13, GR); mE(66, 116, 26, 20, GR); mE(120, 76, 30, 12, GR); mE(330, 82, 40, 10, GR);
  mE(159, 176, 30, 17, SC); mE(186, 191, 18, 10, SC); mE(138, 190, 15, 8, SC); mE(386, 158, 20, 44, SC); mE(182, 122, 12, 7, SC);
  mE(59, 165, 32, 21, AS); mE(80, 180, 17, 10, AS); mE(44, 149, 16, 10, AS);
  mE(107, 121, 13, 9, BG);
  mE(252, 150, 44, 29, FO); mE(226, 139, 22, 16, FO); mE(283, 160, 23, 19, FO); mE(256, 174, 30, 11, FO); mE(272, 128, 26, 12, FO);
  mE(345, 114, 32, 19, BU); mE(321, 122, 13, 9, BU); mE(367, 104, 16, 10, BU);
  mE(305, 200, 34, 19, DE); mE(279, 212, 18, 10, DE); mE(333, 189, 18, 12, DE);
  mE(203, 240, 36, 19, RR); mE(236, 254, 22, 11, RR); mE(184, 226, 15, 9, RR); mE(208, 263, 30, 10, RR);
  mE(107, 235, 44, 23, MA); mE(80, 224, 26, 15, MA); mE(126, 250, 26, 14, MA); mE(64, 247, 22, 14, MA); mE(38, 229, 22, 16, MA);
  var pools = [[88, 231, 7, 3], [125, 228, 8, 3], [100, 251, 9, 3], [133, 246, 6, 2], [70, 242, 6, 3], [111, 219, 5, 2], [60, 258, 7, 2], [140, 232, 4, 2], [92, 216, 4, 2]];
  for (i = 0; i < pools.length; i++) mE(pools[i][0], pools[i][1], pools[i][2], pools[i][3], WA);
  mE(150, 256, 10, 6, GR);
  mE(310, 252, 27, 14, RA); mE(386, 252, 60, 54, RA);
  for (x = 0; x < W; x++) { t = lerpP(foot, x); for (y = 0; y < t; y++) M[y * W + x] = RG; }
  mLn([[36, 34], [26, 62], [24, 84], [31, 106], [22, 130], [27, 158], [38, 186], [55, 203], [72, 216], [86, 226]], 1.7, WA);
  mE(34, 228, 14, 10, SK);
  mE(345, 50, 27, 11, PT); mE(329, 53, 15, 8, PT); mE(362, 47, 17, 9, PT);
  /*@r1*//* 上色：雜訊扭曲取樣 → 三階色帶 → 赤霧染色 */
  var MC = rgb('#5e1611');
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var n1 = fbm(x + 300, y, 22), n2 = fbm(x, y + 500, 22), hq = hsh(x, y);
    var wx = min(W - 1, max(0, x + rd((n1 - 0.5) * 16 + (fbm(x + 77, y + 140, 6) - 0.5) * 9 + (hq - 0.5) * 1.5))), wy = min(H - 1, max(0, y + rd((n2 - 0.5) * 13 + (fbm(x + 190, y + 33, 6) - 0.5) * 8 + (hsh(y, x) - 0.5) * 1.5)));
    b = M[wy * W + wx];
    if (y < 58 && b !== PT && abs(x - 240 - sin(y / 7) * 1.5) < 5.5 + (y > 40 ? (y - 40) * 0.35 : 0) + (hq - 0.5)) b = PS;
    B[y * W + x] = b;
    n = fbm(x, y, 15); var p = PAL[b][min(2, max(0, fl(n * 3.6 - 0.3 + (bay(x, y) - 0.5) * 0.28)))], q = (y * W + x) * 4;
    var f = ((x - 268) / 130 + (y - 168) / 112 - 0.88) * 1.9 + (n1 - 0.5) * 0.7, lv = f <= 0 ? 0 : min(5, fl(f * 5 + bay(x, y) * 0.95)), a = lv * 0.135;
    D[q] = p[0] + (MC[0] - p[0]) * a; D[q + 1] = p[1] + (MC[1] - p[1]) * a; D[q + 2] = p[2] + (MC[2] - p[2]) * a;
  }
  function at(px, py) { px = rd(px); py = rd(py); return (px < 0 || py < 0 || px >= W || py >= H) ? -1 : B[py * W + px]; }
  /*@r2*//* 墨線：水岸、臺地崖、沉淵緣 */
  for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
    b = B[y * W + x]; var up = B[(y - 1) * W + x], lf = B[y * W + x - 1];
    if (b === WA && up !== WA && up !== SK) P(x, y, '#030405');
    else if (b !== WA && b !== SK && up === WA) P(x, y, '#1c221c', 0.7);
    else if (b === WA && hsh(x >> 1, y) > 0.9) P(x, y, '#16222a');
    if (b === PT && up !== PT) P(x, y, '#3d382e');
    if (b === PT && lf !== PT) P(x, y, '#38342a');
    if (b !== PT && up === PT) { R(x, y, 1, 3, '#0d0c0a'); if (x % 3 === 0) R(x, y + 3, 1, 2, '#0d0c0a', 0.7); }
    if (b !== PT && lf === PT) R(x, y, 2, 1, '#100f0c');
    if (b === SK && (up !== SK || lf !== SK)) P(x, y, '#000000');
    if (b !== SK && (up === SK || lf === SK)) P(x, y, '#1a211a');
  }
  /*@r3*//* 山脊：由遠而近疊山形 */
  var MP = ['#0c0e10', '#1b1f23', '#272c31', '#363d42'], MPb = ['#0b0c0e', '#13161a', '#1a1e22', '#20252a'], MPd = ['#0b0c0e', '#0f1113', '#121416', '#14171a'];
  function nearPass(px, hw) { return at(px - hw, 30) === PS || at(px + hw, 30) === PS || at(px, 30) === PS || at(px - hw, 12) === PS || at(px + hw, 12) === PS; }
  scatter(r, -4, 2, W + 4, 60, 5, function (px, py, q) {           // 嶺後遠峰與嶺前小丘
    if (at(px, py) !== RG || nearPass(px, 4)) return;
    var cr = lerpP(foot, px) - 17, dim = (px < 146 && py < 23) || py < 9;
    if (py < cr - 3) { if (q < 0.62) mtn(px, py, 4 + q * 6, dim ? MPd : MPb, fl(q * 97)); }
    else if (py > cr + 5 && q < 0.5) mtn(px, py, 3 + q * 7, MP, fl(q * 97));
  });
  for (x = -3; x < W + 6; x += 6 + fl(r() * 5)) {                  // 主嶺大峰
    y = rd(lerpP(foot, x) - 13 + (r() - 0.5) * 7); var hh = 10 + r() * 7;
    if (nearPass(x, 7)) continue;
    peak(r, x, y, hh, MP); if (hh > 14) { P(x - 1, y - rd(hh), '#4a5257'); P(x - 1, y - rd(hh) + 1, '#4a5257'); }
  }
  peak(r, 227, 50, 17, MP); peak(r, 255, 49, 16, MP); mtn(221, 45, 9, MP, 1); mtn(262, 44, 9, MP, 4); mtn(229, 27, 8, MPb, 3); mtn(252, 25, 8, MPb, 6);
  scatter(r, -4, 30, W + 4, 62, 6, function (px, py, q) {           // 山腳碎丘
    var ft = lerpP(foot, px); if (py < ft - 7 || py > ft + 3 || q > 0.55 || nearPass(px, 5)) return;
    var bb = at(px, py); if (bb === PT || bb === WA || bb === PS) return;
    mtn(px, py, 3 + q * 5, MP, fl(q * 97));
  });
  for (i = 0; i < 26; i++) { x = fl(r() * W); y = rd(lerpP(foot, x)) + 1 + fl(r() * 4); if (at(x, y) !== PS && at(x, y) !== PT && at(x, y) !== WA) tree(x, y, ['#0a0f0d', '#111a16', '#182620', '#0a0908']); }
  /*@r4*//* 草原：稀疏草點 */
  for (i = 0; i < 900; i++) { x = fl(r() * W); y = fl(r() * H); b = at(x, y); if (b === GR) P(x, y, r() < 0.5 ? '#232c19' : '#11150d'); else if (b === PL) { if (r() < 0.4) P(x, y, r() < 0.5 ? '#221f16' : '#110f0b'); } else if (b === PS) P(x, y, '#2c2920'); }
  /* 灌叢丘陵與散石 */
  var HP = ['#100e0a', '#242015', '#3a3522'], RP = ['#0f0e0c', '#24221d', '#35322a'];
  scatter(r, 0, 60, W, H, 9, function (px, py, q) {
    if (at(px, py) !== SC || at(px - 4, py) !== SC) return;
    if (q < 0.5) hillock(px, py, 3 + fl(q * 8), HP);
    else if (q < 0.72) rock(px, py, 3 + q * 3, 2 + fl(q * 2), RP);
    else { P(px, py, '#1c2415'); P(px + 1, py, '#141a0f'); P(px, py - 1, '#26301b'); }
  });
  /* 灰窯原：煤煙、渣堆、煙縷 */
  var SLG = ['#0f0e0d', '#2a2927', '#3b3936'];
  for (i = 0; i < 16; i++) { x = 59 + (r() - 0.5) * 62; y = 165 + (r() - 0.5) * 40; if (at(x, y) === AS) E(x, y, 2 + r() * 4, 1 + r() * 1.5, '#0c0b0a', 0.55); }
  var sm = [[40, 152], [78, 158], [70, 181], [45, 176], [84, 172], [36, 165], [62, 148], [90, 186], [52, 185]];
  for (i = 0; i < sm.length; i++) { mound(sm[i][0], sm[i][1], 5 + (i % 3), 2 + (i % 2), SLG); if (i % 3 === 0) P(sm[i][0], sm[i][1] - 1, RD2); }
  var wk = [[41, 148], [79, 154], [63, 144], [85, 168]];
  for (i = 0; i < wk.length; i++) for (k = 0; k < 9; k++) { x = wk[i][0] + k * 0.9 + sin(k * 0.9 + i) * 1.2; y = wk[i][1] - k * 1.6; R(x, y, k > 5 ? 2 : 1, 1, A3, 0.42 - k * 0.035); if (k > 6) P(x + 1, y - 1, A3, 0.12); }
  /* 枯樹孤立（隱地） */
  E(108, 127, 7, 2, KK, 0.45);
  S(101, 114, ['....a...a....', '.a..a..a...a.', '..a.a.a...a..', '..a.aaa..a...', 'a..a.ba.a..a.', '.a..abaa..a..', '..aaabaaaa...', '.....ba......', '.....ba......', '.....bba.....', '....bbaa.....', '...b.ba.a....'], { a: '#4d4638', b: '#2b271f' });
  P(118, 124, '#2e2a22'); P(97, 126, '#2e2a22'); P(113, 129, '#141210'); P(100, 120, '#141210');
  /* 青霧藥林 */
  var FP = ['#070d0a', '#10201a', '#1b3528', '#0a0908'], FP2 = ['#070d0a', '#132720', '#234534', '#0a0908'];
  scatter(r, 196, 108, 312, 192, 4, function (px, py, q) {
    if (at(px, py) !== FO) return;
    var edge = at(px - 5, py) !== FO || at(px + 5, py) !== FO || at(px, py + 4) !== FO;
    if (edge && q < 0.35) return;
    tree(px, py, q > 0.82 ? FP2 : FP, q > 0.55 && !edge);
  });
  for (k = 0; k < 4; k++) { y = [132, 146, 159, 171][k]; for (var j = 0; j < 3; j++) { x = 204; while (x < 304) { var len = 8 + fl(r() * 26); if (at(x, y + j) === FO && at(x + len, y + j) === FO) R(x, y + j, len, 1, '#6fa58a', j === 1 ? 0.2 : 0.1); x += len + 3 + fl(r() * 14); } } }
  /* 亂葬古窯：墳丘、殘窯 */
  var GP = ['#111110', '#2b2a28', '#403e3a'];
  scatter(r, 306, 92, 384, 136, 9, function (px, py, q) {
    if (at(px, py) !== BU) return;
    if (q < 0.6) { mound(px, py, 5 + fl(q * 5), 3, GP); if (q < 0.25) P(px, py - 4, '#55524b'); }
    else if (q < 0.82) { R(px - 3, py - 3, 7, 4, '#2a2420'); R(px - 3, py - 3, 3, 1, '#40362e'); R(px - 1, py - 2, 3, 3, '#070605'); P(px + 3, py - 3, '#111110'); P(px + 2, py - 4, '#2a2420'); P(px - 3, py - 4, '#2a2420'); R(px - 3, py + 1, 8, 1, KK, 0.5); }
    else { P(px, py, '#494640'); P(px, py - 1, '#494640'); P(px + 1, py, '#111110'); }
  });
  /* 枯骨獸徑：枯林漸疏、碎骨 */
  scatter(r, 262, 174, 352, 228, 5, function (px, py, q) {
    if (at(px, py) !== DE) return;
    var d = sqrt(Math.pow((px - 303) / 40, 2) + Math.pow((py - 199) / 24, 2));
    if (q > 1.05 - d * 0.75) { if (q > 0.93) { P(px, py, BN1); P(px + 1, py, BN0); } return; }
    snag(r, px, py, 4 + fl(q * 9) % 4, '#3b362b', '#15130f');
  });
  var bs = [[292, 214], [318, 208], [300, 190], [326, 221], [283, 201], [338, 200], [311, 226], [296, 232], [330, 236], [288, 244]];
  for (i = 0; i < bs.length; i++) { P(bs[i][0], bs[i][1], BN2); P(bs[i][0] + 1, bs[i][1] + (i % 2), BN1); if (i % 3 === 0) P(bs[i][0] - 1, bs[i][1] - 1, BN0); }
  /* 赤石廢礦：臺地與層理 */
  var RKP = ['#170d0b', '#3a1f17', '#4b281c', '#5f3422'];
  scatter(r, 160, 214, 262, 276, 10, function (px, py, q) {
    if (at(px, py) !== RR || at(px + 6, py) !== RR) return;
    if (q < 0.62) mesa(px - 2, py, 5 + fl(q * 12), 3 + fl(q * 5) % 3, RKP);
    else { R(px, py, 4 + fl(q * 5), 1, '#3a1f17'); R(px + 2, py + 2, 3, 1, '#170d0b'); }
  });
  /* 腐骨沼：蘆葦、水窪亮線 */
  scatter(r, 14, 204, 160, 270, 6, function (px, py, q) {
    if (at(px, py) !== MA) return;
    if (q < 0.55) reed(px, py, '#2b3620', q < 0.2 ? '#5d5a36' : '#3f4a2b'); else if (q > 0.9) { P(px, py, '#1d2a1c'); P(px + 1, py, '#1d2a1c'); }
  });
  for (i = 0; i < pools.length; i++) R(pools[i][0] - 2, pools[i][1], 3, 1, '#18242a');
  /* 沉淵祭窟：黑潭與一線紅光 */
  E(34, 228, 4, 2, RD2, 0.3); R(32, 228, 4, 1, RD2); P(33, 228, RD1); P(22, 229, RD2, 0.6); P(23, 229, RD2, 0.8); P(41, 222, '#2a1512');
  /* 沼東草塚（隱地） */
  mound(150, 258, 11, 4, ['#0f140c', '#1c2515', '#2a361d']); P(148, 253, '#32401f'); P(151, 254, '#32401f'); P(153, 255, '#26301b'); P(150, 252, '#4a4636');
  /* 破曉營臺地：伐盡的樹樁 */
  for (i = 0; i < 9; i++) { x = 322 + fl(r() * 50); y = 43 + fl(r() * 14); if (at(x, y) === PT) { P(x, y, '#17150f'); P(x, y - 1, '#3d382e'); } }
  /* 撿骨師營地：灰地 */
  for (i = 0; i < 60; i++) { x = 286 + fl(r() * 50); y = 240 + fl(r() * 26); if (at(x, y) === RA) P(x, y, r() < 0.5 ? '#36292a' : '#120d0c'); }
  /* 酉神裂口：赤霧與發光地裂 */
  for (y = 176; y < H; y += 1) { var st = 300 + (H - y) * 0.35; x = st + r() * 30; while (x < W) { var ln = 10 + fl(r() * 40); if (r() < 0.45) R(x, y, ln, 1, RD1, 0.1 + 0.12 * min(1, (x - 300) / 90)); x += ln + fl(r() * 26); } }
  for (i = 0; i < 14; i++) E(350 + r() * 50, 215 + r() * 60, 8 + r() * 14, 3 + r() * 5, RD2, 0.22, 2);
  var fz = jag(r, [[330, 271], [343, 258], [352, 246], [362, 240], [368, 231], [379, 224], [384, 212], [397, 203]], 4, 2.6);
  var fbs = [jag(r, [[362, 240], [372, 249], [384, 252], [392, 260]], 4, 2), jag(r, [[368, 231], [362, 221], [356, 208], [347, 203]], 4, 2), jag(r, [[343, 258], [345, 268], [351, 279]], 4, 1.6), jag(r, [[379, 224], [388, 228], [397, 226]], 3, 1.5), jag(r, [[352, 246], [343, 243], [337, 236]], 3, 1.5)];
  for (i = 0; i < fz.length; i += 2) E(fz[i][0], fz[i][1], 16, 11, RD1, 0.07);
  for (i = 0; i < fz.length; i += 2) E(fz[i][0], fz[i][1], 8, 5, RED, 0.09);
  for (i = 0; i < fbs.length; i++) crack(fbs[i], [['#160605', 0.8, 3], [i < 2 ? RED : RD1, 1, 1]]);
  crack(fz, [['#120403', 0.85, 5], [RD1, 1, 3], [RED, 1, 1]]);
  k = fz.length; crack(fz.slice(fl(k * 0.18), fl(k * 0.86)), [[RED, 1, 2], [EMB, 1, 1]]);
  for (i = fl(k * 0.3); i < fl(k * 0.74); i++) { P(fz[i][0], fz[i][1], EMH); if (i % 3 === 0) P(fz[i][0] + 1, fz[i][1], EMH); }
  P(fbs[0][2][0], fbs[0][2][1], EMB); P(fbs[1][2][0], fbs[1][2][1], EMB);
  for (i = 0; i < 40; i++) { x = 330 + r() * 66; y = 200 + r() * 78; P(x, y, r() < 0.3 ? RED : RD1, 0.7); }
  /*@r5*//* 圖框 */
  vignette(12, 0.62);/*@r6*/
  R(3, 3, W - 6, 1, '#2a2416', 0.5); R(3, H - 4, W - 6, 1, '#2a2416', 0.5); R(3, 3, 1, H - 6, '#2a2416', 0.5); R(W - 4, 3, 1, H - 6, '#2a2416', 0.5);
}

/* ================= 山海大陸全圖 ================= */
var REG = {};
function mapContinent() {
  var r = rng(1202), x, y, i, k, b, cx = 170, cy = 135;
  var SEA = 0, DH = 1, RI = 2, ZH = 3, NA = 4, BE = 5, XI = 6, DO = 7, IS = 8;
  var PAL = pals([
    ['#070a0f', '#090d13', '#0b1118'],   // 海
    ['#060507', '#08070a', '#0a090c'],   // 大荒
    ['#15120f', '#1a1612', '#201b15'],   // 裂隙環帶
    ['#100f13', '#151319', '#1b1820'],   // 中山
    ['#170d0b', '#1f100d', '#2a1410'],   // 南山
    ['#2a333b', '#38434c', '#48545e'],   // 北山
    ['#0c120d', '#101810', '#162013'],   // 西山
    ['#0d1813', '#112019', '#162a20'],   // 東山
    ['#1a1814', '#221f19', '#2b271f']    // 海外諸島
  ]);
  /* 標籤錨點（原生座標）：其下保持平靜 */
  var CH = { zhong: [170, 160], nan: [170, 206], bei: [170, 66], xi: [88, 108], dong: [252, 112], haiwai: [64, 208], dahuang: [50, 20] }, HERE = [102, 124, 26, 20];
  var chips = Object.keys(CH).map(function (q) { return CH[q]; });
  function calm(px, py, pad) { for (var q = 0; q < chips.length; q++) if (abs(px - chips[q][0]) < 18 + pad && abs(py - chips[q][1]) < 6 + pad) return true; return false; }
  for (k in CH) REG[k] = [CH[k][0] * 2, CH[k][1] * 2];
  REG.here = [HERE[0] * 2, HERE[1] * 2, HERE[2] * 2, HERE[3] * 2];
  /*@c0*//* 海外諸島遮罩 */
  var isl = [[48, 96, 6, 4], [38, 150, 5, 4], [60, 58, 7, 4], [112, 36, 6, 3], [170, 33, 4, 2], [183, 38, 2, 1], [232, 38, 7, 4], [285, 70, 6, 4], [305, 128, 4, 6], [297, 181, 8, 5], [262, 226, 6, 3], [200, 238, 5, 3], [120, 232, 7, 4],
             [30, 122, 2, 1], [78, 44, 2, 1], [140, 28, 2, 1], [262, 50, 3, 2], [300, 98, 2, 2], [312, 158, 2, 1], [282, 206, 3, 2], [232, 240, 2, 1], [160, 242, 3, 1], [92, 226, 2, 2], [44, 178, 3, 2], [208, 28, 2, 1], [298, 150, 2, 1]];
  M = new Uint8Array(W * H); var B = new Uint8Array(W * H);
  for (i = 0; i < isl.length; i++) mE(isl[i][0], isl[i][1], isl[i][2], isl[i][3], 1);
  mE(38, 150, 2, 1, 0);                                               // 環礁中空
  var LV = rgb(RD2), LV1 = rgb(RD1), LV2 = rgb(EMB), PO = rgb('#06090a'), SN = rgb('#66747e');
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var n1 = fbm(x + 90, y, 26), n2 = fbm(x, y + 70, 26), nn = fbm(x, y, 11);
    var X = x + (n1 - 0.5) * 24, Y = y + (n2 - 0.5) * 24, dx = (X - cx) / 112, dy = (Y - cy) / 84, rr = sqrt(dx * dx + dy * dy), coast = 0.95 + (nn - 0.5) * 0.22;
    if (rr > 0.7 && rr < 1.25) { var an = Math.atan2(dy, dx); coast += 0.06 * sin(3 * an + 0.7) + 0.05 * sin(5 * an + 2.1); }
    if (abs(x - CH.haiwai[0]) < 21 && abs(y - CH.haiwai[1]) < 9) coast -= 0.2;
    if (rr < coast) b = rr < 0.21 ? ZH : rr < 0.5 + (nn - 0.5) * 0.14 ? RI : abs(dy) > abs(dx) ? (dy < 0 ? BE : NA) : (dx < 0 ? XI : DO);
    else {
      var sx = (x - cx) / 168, sy = (y - cy) / 133, se = sx * sx * sx * sx + sy * sy * sy * sy + (n1 - 0.5) * 0.22;
      b = se > 0.5 ? DH : M[min(H - 1, max(0, rd(y + (n2 - 0.5) * 6))) * W + min(W - 1, max(0, rd(x + (n1 - 0.5) * 6)))] ? IS : SEA;
    }
    B[y * W + x] = b;
    var p = PAL[b][min(2, max(0, fl(nn * 3.6 - 0.3 + (bay(x, y) - 0.5) * 0.3)))], q = (y * W + x) * 4;
    if (b === NA && rr > 0.56) { var lv = abs(fbm(x + 33, y + 71, 9) - 0.5); if (lv < 0.008) p = LV2; else if (lv < 0.02) p = LV1; else if (lv < 0.035) p = LV; }
    else if (b === XI && vn(x / 4 + 3, y / 3 + 50) < 0.27) p = PO;
    else if (b === BE && hsh(x, y) > 0.93) p = SN;
    D[q] = p[0]; D[q + 1] = p[1]; D[q + 2] = p[2];
  }
  /*@c1*/function at(px, py) { px = rd(px); py = rd(py); return (px < 0 || py < 0 || px >= W || py >= H) ? -1 : B[py * W + px]; }
  function land(v) { return v >= 2; }
  /* 海岸線、淺灘、波紋 */
  for (y = 2; y < H - 2; y++) for (x = 2; x < W - 2; x++) {
    b = B[y * W + x]; var lu = B[(y - 1) * W + x], ll = B[y * W + x - 1], ld = B[(y + 1) * W + x], lr = B[y * W + x + 1];
    if (land(b)) { if (!land(lu) || !land(ll)) P(x, y, b === BE ? '#7d8b94' : '#3b392f'); else if (!land(ld) || !land(lr)) P(x, y, '#050505'); }
    else if (b === SEA) {
      if (land(lu) || land(ll) || land(ld) || land(lr)) P(x, y, '#18252f');
      else if (land(B[(y - 2) * W + x]) || land(B[y * W + x - 2]) || land(B[(y + 2) * W + x]) || land(B[y * W + x + 2])) { if ((x + y) & 1) P(x, y, '#111b24'); }
      else if ((y % 3) === 0 && hsh(x >> 2, y) > 0.72) P(x, y, '#111a23');
    }
  }
  /*@c2*//* 北山：冰峰雪原 */
  var IP = ['#1c242c', '#55626c', '#78868f', '#a9b5b9'];
  scatter(r, 90, 46, 254, 100, 8, function (px, py, q) { if (at(px, py) !== BE || at(px, py - 3) !== BE || calm(px, py, 4)) return; if (q < 0.3) peak(r, px, py, 7 + q * 16, IP); else if (q < 0.55) mtn(px, py, 3 + q * 5, IP, fl(q * 97)); else if (q > 0.8) { R(px, py, 3, 1, '#66747e'); P(px + 1, py - 1, '#8997a0'); } });
  /* 南山：火山與熔流 */
  var VP = ['#0c0706', '#2c1510', '#3d1d14', '#4d2618'], vol = [[150, 196, 10], [193, 197, 11], [171, 191, 9], [130, 187, 7], [211, 188, 8], [158, 182, 6], [186, 183, 6]];
  scatter(r, 100, 170, 242, 226, 8, function (px, py, q) { if (at(px, py) !== NA || calm(px, py, 3)) return; if (q < 0.35) mtn(px, py, 3 + q * 8, VP, fl(q * 97)); else if (q > 0.85) { P(px, py, RD1); P(px + 1, py, RD2); } });
  for (i = 0; i < vol.length; i++) {
    var v = vol[i], ty = v[1] - v[2]; mtn(v[0], v[1], v[2], VP, i);
    E(v[0], ty, 5, 4, RD1, 0.16); R(v[0] - 1, ty, 3, 1, RED); P(v[0], ty, EMH); P(v[0] - 1, ty + 1, EMB); P(v[0] - 2, ty + 2, RD1); P(v[0] - 2, ty + 3, RD1); P(v[0] - 3, ty + 4, RD2);
    for (k = 0; k < 5; k++) P(v[0] + 1 + k, ty - 2 - k - (k > 2 ? 1 : 0), '#3a302c', 0.7 - k * 0.1);
  }
  /* 西山：毒沼與塚 */
  var TP = ['#0a0b09', '#33322b', '#58564a'];
  scatter(r, 52, 76, 130, 198, 8, function (px, py, q) {
    if (at(px, py) !== XI || at(px + 3, py) !== XI || calm(px, py, 4)) return;
    if (px > HERE[0] - 4 && px < HERE[0] + HERE[2] + 4 && py > HERE[1] - 2 && py < HERE[1] + HERE[3] + 4 && q > 0.25) return;
    if (q < 0.5) { mound(px, py, 4 + fl(q * 6), 2 + fl(q * 4) % 2, TP); if (q < 0.2) P(px, py - 3, '#5e5b4e'); }
    else if (q < 0.8) reed(px, py, '#2b3a1f', '#4f5e2c'); else { P(px, py, '#3d5a2c'); P(px + 2, py + 1, '#2b3a1f'); }
  });
  /* 東山：林丘與殘寺 */
  var FP = ['#070d0a', '#12241c', '#1f3b2c', '#0a0908'], HP = ['#0a120e', '#1a2c22', '#27402f'];
  scatter(r, 210, 76, 296, 198, 4, function (px, py, q) { if (at(px, py) !== DO || calm(px, py, 3)) return; if (q < 0.5) tree(px, py, FP, q < 0.16); else if (q > 0.93) hillock(px, py, 4, HP); });
  function temple(tx, ty, broken) {
    R(tx - 4, ty, 9, 1, '#2e2c29'); R(tx - 3, ty - 3, 7, 3, '#0a0908');
    P(tx - 3, ty - 1, RD2); P(tx - 3, ty - 2, RD2); P(tx, ty - 1, RD2); P(tx, ty - 2, RD2); if (!broken) { P(tx + 3, ty - 1, RD2); P(tx + 3, ty - 2, RD2); }
    var w = broken ? 6 : 11; R(tx - 5, ty - 4, w, 1, SL[2]); R(tx - 4, ty - 5, w - 2, 1, SL[2]); R(tx - 3, ty - 6, max(2, w - 5), 1, SL[3]); P(tx - 6, ty - 5, SL[2]); if (!broken) P(tx + 6, ty - 5, SL[1]); else { P(tx + 2, ty - 3, SL[1]); P(tx + 4, ty - 1, SL[1]); P(tx + 5, ty, RD2); }
    P(tx - 4, ty - 4, SL[3]); P(tx - 3, ty - 5, SL[3]);
  }
  var tps = [[238, 131, 0], [263, 145, 1], [247, 166, 0], [270, 127, 1], [234, 153, 1], [256, 98, 0], [262, 176, 0]];
  for (i = 0; i < tps.length; i++) if (at(tps[i][0], tps[i][1]) === DO) temple(tps[i][0], tps[i][1], tps[i][2]);
  /* 裂隙環帶：焦痕 */
  for (i = 0; i < 160; i++) { x = cx + (r() - 0.5) * 140; y = cy + (r() - 0.5) * 106; if (at(x, y) === RI && !calm(x, y, 1)) { if (r() < 0.3) R(x, y, 2 + fl(r() * 3), 1, '#0c0a08'); else P(x, y, r() < 0.5 ? '#2a241b' : '#0c0a08'); } }
  /* 中山：群峰、天裂、山腳幽光 */
  var ZP = ['#08070a', '#1a1720', '#28242f', '#3a3442'];
  var zm = [[149, 143, 9], [192, 144, 10], [159, 141, 14], [182, 142, 15], [170, 139, 17], [154, 149, 11], [187, 149, 12], [170, 150, 21], [161, 151, 8], [180, 151, 7]];
  for (i = 0; i < zm.length; i++) peak(r, zm[i][0], zm[i][1], zm[i][2], ZP);
  P(169, 130, '#4a4354'); P(169, 131, '#4a4354');
  E(170, 152, 9, 2, RD1, 0.22); R(166, 152, 9, 1, '#6e231c', 0.8); P(170, 152, RD1); P(169, 151, RD2); P(171, 151, RD2);
  var sc = jag(r, [[149, 116], [160, 111], [167, 104], [176, 103], [183, 96], [193, 93]], 3, 1.8);
  for (i = 0; i < sc.length; i += 2) E(sc[i][0], sc[i][1], 9, 6, RD2, 0.16);
  for (i = 0; i < sc.length; i += 2) E(sc[i][0], sc[i][1], 4, 3, RD1, 0.16);
  crack(sc, [['#1a0605', 0.7, 3], [RED, 1, 1]]); crack(sc.slice(2, sc.length - 2), [[EMB, 1, 1]]);
  for (i = 4; i < sc.length - 4; i++) P(sc[i][0], sc[i][1], EMH);
  crack(jag(r, [[167, 104], [164, 98], [166, 92]], 3, 1), [[RD1, 1, 1]]); crack(jag(r, [[176, 103], [181, 108], [180, 113]], 3, 1), [[RD1, 1, 1]]); crack(jag(r, [[183, 96], [181, 90]], 3, 1), [[RD1, 1, 1]]);
  for (i = 2; i < sc.length - 1; i += 2) { x = sc[i][0] + fl(r() * 2); k = 4 + fl(r() * 9); for (y = sc[i][1] + 3; y < sc[i][1] + 3 + k; y += 2) P(x, y, RD1, 0.5 - (y - sc[i][1]) * 0.03); }   // 落下的血雨
  /* 十二神裂口 */
  for (k = 0; k < 12; k++) {
    var a = (174 + k * 30 + (k ? (r() - 0.5) * 9 : 0)) * PI / 180, jr = k ? 1 + (r() - 0.5) * 0.14 : 1, rx = rd(cx + cos(a) * 47 * jr), ry = rd(cy + sin(a) * 38 * jr), d = r() < 0.5 ? 1 : -1;
    E(rx, ry, 5, 4, RD2, 0.3); E(rx, ry, 3, 2, RD1, 0.3);
    var rp = [[rx - 2 * d, ry + 3], [rx - d, ry + 1], [rx + d, ry], [rx, ry - 2], [rx + 2 * d, ry - 3]];
    crack(rp, [['#140504', 0.8, 3], [RED, 1, 1]]); P(rx - d, ry + 1, EMB); P(rx + d, ry, EMH); P(rx, ry - 2, EMB);
  }
  /* 海外異島的特徵 */
  var IR = ['#0c0b09', '#26231e', '#34302a', '#4b463c'];
  R(48, 88, 1, 7, '#34302a'); P(47, 91, '#4b463c'); P(47, 93, '#4b463c'); R(49, 91, 1, 4, '#0c0b09');                 // 孤柱
  dtree(r, 60, 56, 4, -PI / 2, 1, '#2c3a24', 1); P(60, 51, '#3f5230'); P(59, 52, '#3f5230'); P(61, 52, '#2c3a24');       // 巨木
  mtn(110, 36, 5, IR, 1); mtn(115, 37, 4, IR, 2);                                                                      // 雙峰
  R(230, 35, 5, 4, BN1); R(231, 34, 3, 1, BN2); P(231, 36, '#0c0b09'); P(233, 36, '#0c0b09'); P(231, 39, BN0); P(233, 39, BN0);   // 顱岩
  mtn(285, 70, 6, VP, 2); P(285, 64, EMB); P(286, 62, '#3a302c'); P(287, 61, '#3a302c', 0.6);                         // 火島
  R(304, 124, 1, 5, '#34302a'); R(306, 126, 1, 4, '#34302a'); R(303, 129, 1, 3, '#4b463c');                            // 石林
  E(297, 181, 5, 3, '#1c2a22'); R(294, 180, 6, 1, '#2a4033'); P(303, 181, '#2b271f'); P(304, 180, '#2b271f'); P(291, 181, '#2b271f'); P(293, 185, '#2b271f'); P(300, 185, '#2b271f'); P(293, 177, '#2b271f'); P(300, 177, '#2b271f');   // 鼇背
  E(120, 232, 2, 1, '#06090a'); P(120, 232, '#2a4a3c');                                                                // 眼湖
  R(200, 233, 1, 5, '#34302a'); P(199, 235, '#4b463c');
  /*@c3*//* 大荒：半隱的巨影 */
  var DC = '#15121b', DC2 = '#1d1925', DE = '#2b2534', s, px, py, rad;
  for (i = 0; i <= 300; i++) {                                         // 盤龍（右上）
    s = i / 300;
    if (s < 0.55) { var u = s / 0.55; px = 196 + u * 101; py = 12 + sin(u * 9.4) * 5 * (0.4 + u * 0.6) + u * 4; }
    else { var w2 = (s - 0.55) / 0.45, a2 = -PI * 0.75 + w2 * PI * 2.6; rad = 19 - w2 * 11; px = 313 + cos(a2) * rad * 1.15; py = 30 + sin(a2) * rad; }
    rad = s < 0.6 ? 0.6 + s * 4.4 : 3.2 - (s - 0.6) * 1.6;
    E(px, py, rad, rad, DC); if (i % 7 === 0 && s > 0.12) P(px, py - rad - 1, DC2); if (i % 5 === 0 && s > 0.3) P(px, py, DC2);
  }
  E(px - 2, py + 1, 4, 3, DC); R(px - 9, py + 1, 6, 2, DC); R(px - 9, py + 4, 5, 1, DC); L(px + 1, py - 2, px + 6, py - 6, DC); L(px - 1, py - 2, px + 2, py - 7, DC); L(px - 8, py + 1, px - 13, py - 2, DC); L(px - 8, py + 3, px - 14, py + 5, DC); P(px - 3, py, DE);
  L(260, 22, 256, 30, DC, 2); L(256, 30, 252, 32, DC); L(256, 30, 255, 34, DC); L(256, 30, 259, 33, DC); L(300, 46, 296, 52, DC, 2); L(296, 52, 292, 53, DC); L(296, 52, 296, 56, DC);
  E(21, 253, 15, 12, DC);                                              // 百足之物（左下）
  for (k = 0; k < 11; k++) {
    var la = -PI * 0.97 + k * PI * 1.06 / 10, ll2 = 60 - 24 * Math.pow(cos(la + PI / 4), 2) + (k % 3) * 4, ph = k * 1.7;
    for (i = 0; i <= 40; i++) { var t = i / 40, bd = sin(t * PI * 1.4 + ph) * 7 * t; px = 21 + cos(la) * t * ll2 - sin(la) * bd; py = 253 + sin(la) * t * ll2 + cos(la) * bd; rad = 2.6 * (1 - t) + 0.5; E(px, py, rad, rad, DC); if (i % 6 === 3 && t < 0.8) P(px, py, DC2); }
    P(px + 1, py - 1, DC); P(px + 2, py - 1, DC);
  }
  P(17, 248, DE); P(22, 246, DE); P(26, 250, DE); P(20, 252, DE); P(14, 253, DE); P(24, 255, DE);
  E(284, 281, 46, 24, DC); T(244, 258, 286, 287, 274, 290, DC); E(322, 266, 12, 5, DC);        // 巨鯤（右下）
  for (i = 0; i <= 30; i++) { var tt = i / 30; E(326 + tt * 8, 262 - tt * 24 + sin(tt * 3) * 2, 3.5 - tt * 2.4, 3.5 - tt * 2.4, DC); }
  T(232, 240, 327, 329, 322, 336, DC); T(230, 238, 337, 338, 334, 339, DC); L(334, 238, 326, 231, DC, 2); L(335, 238, 339, 230, DC, 2);
  for (i = 0; i < 9; i++) { x = 252 + i * 8; y = 262 + abs(i - 4) * 1.5; P(x, y, DC2); P(x + 1, y + 1, DC2); P(x + 2, y, DC2); } P(250, 266, DE);
  for (i = 0; i < 120; i++) {                                           // 海與大荒之界：金點虛線
    var ta = i / 120 * PI * 2, ct = cos(ta), sn = sin(ta); x = cx + 168 * 0.841 * (ct < 0 ? -1 : 1) * sqrt(abs(ct)); y = cy + 133 * 0.841 * (sn < 0 ? -1 : 1) * sqrt(abs(sn));
    if (!calm(x, y, 2)) P(x, y, GD2, 0.4);
  }
  /* 「此處」金框 */
  x = HERE[0]; y = HERE[1]; var fw = HERE[2], fh = HERE[3];
  R(x - 1, y - 1, fw + 2, 1, KK, 0.6); R(x - 1, y + fh, fw + 2, 1, KK, 0.6); R(x - 1, y, 1, fh, KK, 0.6); R(x + fw, y, 1, fh, KK, 0.6);
  R(x, y, fw, 1, GOLD); R(x, y + fh - 1, fw, 1, GD1); R(x, y, 1, fh, GOLD); R(x + fw - 1, y, 1, fh, GD1);
  R(x, y, 3, 1, EMH); R(x, y, 1, 3, EMH); P(x + fw - 1, y, GOLD); P(x, y + fh - 1, GOLD); R(x + fw - 3, y + fh - 1, 3, 1, GOLD); R(x + fw - 1, y + fh - 3, 1, 3, GOLD);
  /*@c4*/vignette(10, 0.6);/*@c5*/
}

/* ================= 荒野：腐骨沼 ================= */
function mangrove(r, x, yb, h, lean, c, hl, nroot, spr, moss) {     // 扭幹枯樹：支柱根、垂蘚
  var crown = yb - h * 0.24, top = yb - h, i, k, t, y, cx = x, hw, sd, th = h > 90 ? 2 : 1, ph = r() * 6, ends = [];
  for (i = 0; i < nroot; i++) {
    sd = (i % 2) ? 1 : -1; var sp = (3 + (i >> 1) * spr + r() * 3) * sd, sy = crown + (i >> 1) * h * 0.03 + r() * 3, px0 = null, py0 = 0;
    for (k = 0; k <= 16; k++) { t = k / 16; var px = x + sp * sin(t * PI / 2), py = sy + (yb + abs(sp) * 0.1 - sy) * (1 - cos(t * PI / 2)); if (px0 !== null) L(px0, py0, px, py, c, th); px0 = px; py0 = py; }
    if (hl && sd < 0) { P(x + sp * 0.7, sy + (yb - sy) * 0.28, hl); P(x + sp * 0.9, sy + (yb - sy) * 0.55, hl); }
  }
  for (y = rd(crown + h * 0.06); y >= top; y--) {
    t = (crown - y) / (crown - top); cx = x + lean * (crown - y) + sin(y / (5 + h * 0.07) + ph) * h * 0.035; hw = max(0.6, h * 0.05 * (1 - t * 0.75));
    R(cx - hw, y, hw * 2 + 1, 1, c); if (hl && y % 3) P(rd(cx - hw), y, hl); if (hl && hw > 4 && y % 6 === 0) R(cx - hw * 0.2, y, 1, 4, hl, 0.5);
    if (t > 0.3 && r() < (h > 90 ? 0.07 : 0.16)) { sd = r() < 0.5 ? -1 : 1; dtree(r, cx, y, h * (0.16 + r() * 0.14), -PI / 2 + sd * (0.7 + r() * 0.7), th + (t < 0.6 ? 1 : 0), c, h > 60 ? 3 : 2, ends); }
  }
  dtree(r, cx, top, h * 0.14, -PI / 2 - 0.6, th, c, 2, ends); dtree(r, cx, top, h * 0.12, -PI / 2 + 0.7, th, c, 2, ends);
  if (moss) for (i = 0; i < ends.length; i++) if (r() < 0.55) { k = 3 + fl(r() * h * 0.09); for (y = 0; y < k; y++) if (y % 3 !== 2) P(ends[i][0], ends[i][1] + y, moss); }
}
function wisp(x, y, s) {                          // 磷火
  glow(x, y, 5 + s * 3, '#6fbf96', 0.07); P(x, y, '#d6f2dd'); P(x, y - 1, '#9fdcb8'); P(x - 1, y, '#7fc9a0', 0.8); P(x + 1, y, '#7fc9a0', 0.8); P(x, y + 1, '#7fc9a0', 0.6); if (s) { P(x, y - 2, '#7fc9a0', 0.7); P(x + 1, y - 3, '#5fa884', 0.5); }
}
function wildFuzhao() {
  var r = rng(1303), i, x, y, t, k, n, q, pts = [[75, 115], [165, 135], [260, 105], [320, 145], [183, 160]], calm = calmOf(pts);
  bands(0, 0, W, 64, ['#080a09', '#0b0e0b', '#0f130e', '#151a11', '#1d2213', '#282a15', '#343117']);
  E(128, 60, 17, 5, '#403b1a'); E(128, 61, 9, 3, '#51491f');
  for (i = 0; i < 8; i++) { x = fl(r() * W); y = 10 + fl(r() * 40); k = 30 + fl(r() * 70); R(x, y, k, 1, '#0a0d0a'); R(x + 7, y + 1, k - 12, 1, '#0a0d0a'); if (y > 36) R(x + 4, y + 2, k * 0.5, 1, '#3a3518', 0.5); }
  hill(prof(r, W, 59, 3, 1.5), 66, '#0b0f0b');
  for (i = 0; i < 28; i++) { x = fl(r() * W); k = 5 + r() * 12; L(x, 64, x + (r() - 0.5) * 3, 64 - k, '#0a0d0a'); dtree(r, x, 64 - k * 0.6, k * 0.6, -PI / 2 + (r() - 0.5) * 1.4, 1, '#0a0d0a', 2); }
  mist(r, 54, 9, '#56703a', 0.2);
  /* 泥灘與黑水：透視雜訊分水陸，標記處保留泥洲 */
  var WT = new Uint8Array(W * H), MUD = ['#161a10', '#13170e', '#10140c', '#0d110a', '#0b0e09', '#090b08'].map(rgb), WAT = rgb('#05080a'), WR = rgb('#171b10'), WR2 = rgb('#0e130f');
  for (y = 64; y < H; y++) {
    t = (y - 64) / 138;
    for (x = 0; x < W; x++) {
      n = fbm((x - 199) / (0.3 + t * 1.1) + 500, 96 / (t + 0.15), 26);
      for (k = 0; k < 5; k++) { var ddx = (x - pts[k][0]) / (k === 4 ? 38 : 30), ddy = (y - pts[k][1] - 3) / (k === 4 ? 14 : 11), d2 = ddx * ddx + ddy * ddy; if (d2 < 1) n += 0.34 * (1 - d2); }
      ddx = (x - 258) / 46; ddy = (y - 185) / 12; d2 = ddx * ddx + ddy * ddy; if (d2 < 1) n -= 0.4 * (1 - d2);
      ddx = (x - 98) / 26; ddy = (y - 186) / 9; d2 = ddx * ddx + ddy * ddy; if (d2 < 1) n -= 0.4 * (1 - d2);
      var wet = n < 0.5 - (t < 0.05 ? 0.1 : 0); WT[y * W + x] = wet ? 1 : 0; q = (y * W + x) * 4;
      var p = wet ? ((t < 0.2 && ((y & 1) || hsh(x >> 2, y) > 0.5) && n < 0.44) ? WR : (hsh(x >> 3, y) > 0.9 && (y & 1)) ? WR2 : WAT) : MUD[min(5, max(0, fl(t * 6 + (n - 0.5) * 2 + (bay(x, y) - 0.5) * 0.4)))];
      D[q] = p[0]; D[q + 1] = p[1]; D[q + 2] = p[2];
    }
  }
  function wt(px, py) { px = rd(px); py = rd(py); return px < 0 || px >= W || py < 64 || py >= H ? 0 : WT[py * W + px]; }
  for (y = 65; y < H - 1; y++) for (x = 0; x < W; x++) {
    var me = WT[y * W + x], up = WT[(y - 1) * W + x], dn = WT[(y + 1) * W + x];
    if (!me && up) P(x, y, '#232a1a'); else if (!me && dn) P(x, y, '#060806'); else if (me && !up) P(x, y, '#020303');
    else if (!me && hsh(x, y) > 0.9) P(x, y, hsh(y, x) > 0.5 ? '#1c2214' : '#080a07');
  }
  for (k = 0; k < 5; k++) E(pts[k][0], pts[k][1] + 2, k === 4 ? 22 : 16, k === 4 ? 6 : 4, '#191e12', 0.6, 2);
  /* 遠處小樹與殘骨 */
  mangrove(r, 18, 90, 34, 0.05, '#090c09', null, 6, 3, '#121a10'); mangrove(r, 122, 96, 48, 0.1, '#080b08', null, 6, 3.4, '#121a10'); mangrove(r, 186, 80, 22, -0.05, '#0a0d0a', null, 4, 2, null);
  mangrove(r, 228, 86, 36, -0.08, '#090c09', null, 6, 2.6, '#121a10'); mangrove(r, 304, 94, 44, 0.06, '#080b08', null, 6, 3, '#121a10'); mangrove(r, 354, 84, 28, -0.04, '#0a0d0a', null, 4, 2.4, '#121a10');
  for (i = 0; i < 5; i++) { x = 204 + i * 4; for (k = 0; k <= 8; k++) { t = PI - k / 8 * PI * 0.8; P(x + 2 + cos(t) * 2, 95 - sin(t) * (4 + (i === 2 ? 2 : i % 2)), k < 5 ? BN1 : BN0); } } R(203, 95, 22, 1, '#3d4435');
  mist(r, 70, 8, '#56703a', 0.17); mist(r, 96, 5, '#6f8a48', 0.08);
  /* 蘆葦 */
  scatter(r, 0, 70, W, H + 6, 5, function (px, py, qq) {
    if (py >= H || wt(px, py) || calm(px, py, -5) || qq > 0.62) return;
    if (!(wt(px - 5, py) || wt(px + 5, py) || wt(px, py + 3) || wt(px, py - 3))) { if (qq > 0.12) return; }
    var tt = (py - 64) / 138, nn = 2 + fl(tt * 3 + qq * 2);
    for (var j = 0; j < nn; j++) { var x0 = px + j * 2 - nn + fl(r() * 2), hg = 3 + tt * 13 * (0.6 + r() * 0.7), ln = (r() - 0.5) * 3; L(x0, py, x0 + ln, py - hg, r() < 0.3 ? '#34401f' : '#1f2916'); if (r() < 0.35) R(x0 + ln, py - hg - 1, 1, 2 + tt * 2, '#4d3c22'); }
  });
  /* 半沉的巨獸肋骨（右前） */
  var wl = 187;
  for (k = 0; k < 2; k++) for (i = 0; i < 8; i++) {
    var bx = 226 + i * 8.5 + (k ? 0 : 4), hh = (15 + sin(i / 7 * PI) * 13) * (k ? 1 : 0.82), by = wl - (k ? 0 : 2);
    for (var a = 0; a <= 26; a++) { t = PI - a / 26 * PI * 0.84; x = bx + 5.5 + cos(t) * 5.5; y = by - sin(t) * hh; R(x, y, (k && a < 9) ? 2 : 1, 1, !k ? BN0 : a < 5 ? '#4a4f3c' : a < 16 ? BN2 : BN1); if (k && a > 8 && a < 14) P(x, y, BN3); }
    if (k) for (a = 1; a < 7; a += 2) P(bx + (a > 3 ? 1 : 0), wl + a, '#2c3027');
  }
  for (i = 0; i < 9; i++) { R(224 + i * 8.5, wl - 1, 5, 2, BN0); P(225 + i * 8.5, wl - 2, BN1); }
  R(220, wl + 1, 78, 1, '#1a2019'); for (i = 0; i < 14; i++) R(218 + r() * 80, wl + 2 + fl(r() * 6), 3 + r() * 8, 1, '#12181a');
  /* 半沉的獸顱（左前） */
  E(96, 181, 13, 8, BN0); E(95, 180, 12, 7, BN1); E(92, 178, 7, 4, BN2); T(180, 186, 76, 90, 72, 92, BN1); T(180, 183, 76, 88, 74, 88, BN2);
  E(100, 181, 3, 3, '#0a0c09'); P(99, 179, BN0); R(77, 184, 3, 1, '#0a0c09');
  for (i = 0; i <= 14; i++) { t = i / 14; R(106 + t * 15, 176 - sin(t * PI * 0.62) * 17, 3 - rd(t * 2), 3 - rd(t * 2), i % 4 ? BN1 : BN0); }
  R(70, 186, 46, 4, '#05080a'); for (i = 0; i < 6; i++) R(70 + i * 8 + (i % 2) * 3, 186 + (i % 3), 5, 1, i % 2 ? '#2c3027' : '#171d1a'); for (i = 0; i < 5; i++) P(74 + i * 4, 185, BN2);
  /* 散顱與碎骨 */
  S(300, 170, ['.lll.', 'lllll', 'ldldl', 'lllll', '.lml.'], { l: BN1, d: '#0a0c09', m: BN0 }); S(40, 142, ['.ll.', 'llll', 'ldld'], { l: BN1, d: '#0a0c09' }); R(39, 145, 6, 1, '#05080a');
  S(214, 128, ['.ll.', 'llll', 'ldld', '.lm.'], { l: BN0, d: '#0a0c09', m: '#3a362d' }); S(352, 126, ['.ll.', 'llll', 'ldld'], { l: BN0, d: '#0a0c09' });
  var bsn = [[128, 150, 6, 0.3], [226, 150, 5, 2.7], [286, 132, 5, 0.4], [118, 112, 4, 0.2], [346, 176, 7, 2.9], [150, 186, 6, 0.5], [206, 108, 3, 0.1]];
  for (i = 0; i < bsn.length; i++) if (!wt(bsn[i][0], bsn[i][1])) bone(bsn[i][0], bsn[i][1], bsn[i][2], bsn[i][3]);
  /* 前景兩側的大樹 */
  mangrove(r, 28, 184, 196, 0.03, '#060906', '#172018', 8, 9, '#101810'); mangrove(r, 376, 192, 204, -0.03, '#060906', '#172018', 8, 9, '#101810');
  /* 磷火與瘴霧 */
  var ws = [[140, 84, 0], [214, 112, 1], [286, 126, 1], [52, 152, 1], [340, 104, 0], [108, 132, 1], [246, 72, 0], [16, 118, 0], [384, 140, 1]];
  for (i = 0; i < ws.length; i++) { wisp(ws[i][0], ws[i][1], ws[i][2]); for (k = 2; k < 12; k += 2) if (wt(ws[i][0], ws[i][1] + 8 + k)) P(ws[i][0], ws[i][1] + 8 + k, '#3f6d57', 0.5); }
  mist(r, 124, 7, '#6f8a48', 0.07); mist(r, 150, 6, '#56703a', 0.06);
  /* 前景葦叢剪影 */
  for (x = -2; x < W; x += 2 + fl(r() * 3)) { if (x > 126 && x < 246) continue; var e2 = min(1, min(abs(x - 126), abs(x - 246)) / 40), hg2 = (6 + r() * 16) * (0.4 + 0.6 * e2); L(x, H, x + (r() - 0.5) * 5, H - hg2, '#050705'); if (r() < 0.3) R(x, H - hg2 - 2, 1, 3, '#1c1810'); }
  for (i = 0; i < 5; i++) Dz(0, i * 2, W, 2, '#070908', 2, 0.5 - i * 0.1);
}

/* ================= 荒野：野徑岔口 ================= */
function crow(x, y, f) { S(x - 2, y - 3, f ? ['.kk..', 'bkkk.', '.kkkk', '..k..'] : ['..kk.', '.kkkb', 'kkkk.', '..k..'], { k: '#060606', b: '#2e2c29' }); }
function wildChakou() {
  var r = rng(1404), i, x, y, t, k, q, calm = calmOf([[80, 130], [300, 120], [183, 160]]);
  bands(0, 0, W, 72, ['#0b0c10', '#0e0f14', '#121319', '#18171b', '#201b1b', '#2a201b', '#35271c', '#402e1d']);
  for (i = 0; i < 10; i++) { x = fl(r() * W) - 20; y = 8 + fl(r() * 46); k = 30 + fl(r() * 70); R(x, y, k, 1, '#0f1015'); R(x + 8, y + 1, k - 14, 1, '#0f1015'); if (y > 34) R(x + 4, y + 2, k * 0.5, 1, '#4a3220', 0.5); }
  hill(prof(r, W, 42, 11, 2), 78, '#1a1d24'); mist(r, 55, 6, '#3a3f48', 0.4);
  hill(prof(r, W, 59, 6, 2), 78, '#14171c', '#1d2026'); mist(r, 66, 5, '#343841', 0.35);
  var gl = [], wv = 0;
  for (x = 0; x < W; x++) { wv = (wv + (r() - 0.5) * 1.6) * 0.88; gl[x] = rd(75 - 15 * Math.exp(-Math.pow((x - 34) / 58, 2)) - 7 * Math.exp(-Math.pow((x - 372) / 46, 2)) + wv); R(x, gl[x], 1, 80 - gl[x], '#12110f'); P(x, gl[x], '#25221d'); if (x & 1) P(x, gl[x] + 1, '#1a1815'); }
  bands(0, 77, W, 125, ['#1c1a14', '#191712', '#161410', '#13120e', '#100f0c', '#0e0d0b']);
  for (x = 0; x < W; x++) if (gl[x] < 77) { R(x, gl[x] + 2, 1, 77 - gl[x], '#17150f'); if (hsh(x, 5) > 0.6) P(x, gl[x] + 3 + fl(hsh(x, 8) * 8), '#221f17'); }
  for (i = 0; i < 520; i++) { x = fl(r() * W); y = 79 + fl(r() * 123); P(x, y, r() < 0.5 ? '#26221a' : '#0c0b09'); }
  /* 山徑：自前景而上，於中左分岔 */
  M = new Uint8Array(W * H);
  function path(pts, w0, w1) { var tot = 0, i, a, b, n, kk, acc = 0; for (i = 1; i < pts.length; i++) tot += abs(pts[i][0] - pts[i - 1][0]) + abs(pts[i][1] - pts[i - 1][1]); for (i = 1; i < pts.length; i++) { a = pts[i - 1]; b = pts[i]; n = abs(b[0] - a[0]) + abs(b[1] - a[1]); for (kk = 0; kk <= n; kk++) { var hw = w0 + (w1 - w0) * Math.pow((acc + kk) / tot, 0.75); mE(a[0] + (b[0] - a[0]) * kk / n, a[1] + (b[1] - a[1]) * kk / n, hw, max(1, hw * 0.3), 1); } acc += n; } }
  path([[198, 214], [190, 176], [174, 140], [160, 117]], 66, 9); path([[160, 117], [136, 103], [104, 91], [78, 81], [58, 72]], 9, 2); path([[160, 117], [198, 105], [242, 94], [292, 84], [336, 77], [364, 74]], 9, 2);
  for (y = 70; y < H; y++) for (x = 0; x < W; x++) if (M[y * W + x]) {
    var edge = !M[(y - 1) * W + x] || !M[min(H - 1, y + 1) * W + x] || !M[y * W + max(0, x - 2)] || !M[y * W + min(W - 1, x + 2)];
    if (edge) { if ((x + y) & 1) P(x, y, '#231f18'); } else P(x, y, y < 110 ? '#2b271d' : y < 150 ? '#28241b' : '#252119');
    if (!edge && hsh(x >> 2, y) > 0.86) P(x, y, hsh(x, y) > 0.5 ? '#322d22' : '#1b1813');
  }
  for (y = 120; y < H; y++) { t = (y - 117) / 85; var c0 = 160 + (198 - 160) * Math.pow(t, 1.25), hw2 = 9 + 57 * Math.pow(t, 1.3); Dz(c0 - hw2 * 0.42, y, 2 + hw2 / 22, 1, '#1a1712', (y & 3) ? 3 : 1); Dz(c0 + hw2 * 0.34, y, 2 + hw2 / 22, 1, '#1a1712', (y & 2) ? 3 : 1); }
  /* 左丘上的大枯樹與群鴉 */
  var ends = [], tb = gl[32] + 2, cx = 32;
  for (y = tb; y >= 22; y--) { t = (tb - y) / (tb - 22); cx = 32 + (tb - y) * 0.09 + sin(y / 8) * 1.5; var hw3 = 0.8 + (1 - t) * 3.4 + (t < 0.1 ? (0.1 - t) * 30 : 0); R(cx - hw3, y, hw3 * 2, 1, '#0b0a09'); if (y % 3) P(rd(cx - hw3), y, '#1f1b16'); if (t > 0.28 && r() < 0.16) { var sd = r() < 0.5 ? -1 : 1; dtree(r, cx, y, 9 + r() * 10, -PI / 2 + sd * (0.7 + r() * 0.6), t < 0.6 ? 2 : 1, '#0b0a09', 3, ends); } }
  dtree(r, cx, 22, 10, -PI / 2 - 0.5, 2, '#0b0a09', 2, ends); dtree(r, cx, 22, 9, -PI / 2 + 0.5, 2, '#0b0a09', 2, ends);
  ends.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  for (i = 0, k = 0; i < ends.length && k < 4; i += 5) if (ends[i][0] > 6 && ends[i][1] > 6) { crow(ends[i][0], ends[i][1], k % 2); k++; }
  var fc = [[72, 26], [86, 38], [58, 14], [104, 30]]; for (i = 0; i < fc.length; i++) { x = fc[i][0]; y = fc[i][1]; P(x - 2, y, '#060606'); P(x - 1, y - 1, '#060606'); P(x, y, '#060606'); P(x + 1, y - 1, '#060606'); P(x + 2, y, '#060606'); if (i % 2) P(x, y + 1, '#060606'); }
  /* 灌叢、石、枯草 */
  var RP = ['#0c0b0a', '#201e1a', '#34312a'];
  function scrub(px, py, w, h) { E(px, py - h / 2, w / 2, h / 2, '#11130d', 1, 3); E(px - 1, py - h / 2 + 1, w / 2 - 1, h / 2 - 1, '#12140e'); for (var j = 0; j < w * 0.7; j++) P(px - w / 2 + r() * w * 0.75, py - h + 1 + r() * h * 0.6, r() < 0.3 ? '#2c3220' : '#1e2317'); R(px - w / 2 + 1, py, w - 1, 1, KK, 0.4); }
  for (x = 0; x < W; x += 5 + fl(r() * 9)) if (r() < 0.6) scrub(x, gl[x] + 2, 5 + r() * 6, 3 + r() * 3);
  scatter(r, 0, 82, W, H, 13, function (px, py, qq) {
    if (calm(px, py, 2) || M[py * W + px] || M[py * W + min(W - 1, px + 8)] || M[py * W + max(0, px - 8)]) return;
    var s = 0.5 + (py - 78) / 124;
    if (qq < 0.34) scrub(px, py, (8 + qq * 20) * s, (4 + qq * 9) * s); else if (qq < 0.55) rock(px, py, (5 + qq * 12) * s, (3 + qq * 6) * s, RP);
    else if (qq < 0.9) { var g = 2 + s * 4; L(px, py, px - 1, py - g, '#2f2b20'); L(px + 1, py, px + 2, py - g + 1, '#211e17'); L(px + 2, py, px + 4, py - g + 1, '#2f2b20'); }
  });
  /* 路標 */
  E(166, 111, 9, 2, KK, 0.4);
  for (y = 110; y >= 76; y--) { x = 164 + rd((110 - y) * 0.06); R(x, y, 3, 1, WD1); P(x, y, WD3); if (y % 5 === 0) P(x + 1, y, WD0); } P(166, 75, WD3); P(167, 75, WD1);
  T(80, 84, 149, 166, 149, 166, WD2); R(149, 80, 17, 1, WD4); R(149, 84, 17, 1, WD0); P(148, 81, WD2); P(148, 82, WD2); P(148, 83, WD2); P(147, 82, WD3); P(146, 82, WD2); R(153, 82, 2, 1, WD0); R(157, 81, 1, 3, WD0); R(160, 82, 3, 1, WD0); P(163, 81, WD0);
  R(168, 87, 9, 5, WD1); R(177, 86, 9, 5, WD1); R(168, 87, 9, 1, WD3); R(177, 86, 9, 1, WD3); R(168, 91, 9, 1, WD0); R(177, 90, 9, 1, WD0); P(186, 87, WD1); P(186, 88, WD1); P(186, 89, WD1); P(187, 88, WD2); P(188, 88, WD1); R(171, 89, 3, 1, WD0); R(176, 88, 1, 2, WD0); R(180, 88, 3, 1, WD0);
  L(165, 95, 159, 103, WD0, 2); L(165, 95, 160, 102, WD2); P(166, 94, A2);
  R(167, 96, 1, 6, RD2); P(168, 99, RD2); P(167, 96, RD1);
  rock(160, 112, 7, 3, RP); rock(169, 113, 6, 4, RP); rock(165, 110, 4, 2, RP); L(172, 111, 174, 106, '#2f2b20'); L(157, 111, 155, 107, '#2f2b20');
  crow(165, 75, 1);
  /* 路旁殘祠與獸首石像 */
  var sx = 258, sy = 119;
  E(sx, sy + 1, 20, 3, KK, 0.4);
  R(sx - 16, sy - 6, 32, 6, '#262422'); R(sx - 16, sy - 6, 32, 1, '#403d38'); R(sx - 14, sy - 8, 28, 2, '#2e2c29'); R(sx - 14, sy - 8, 28, 1, '#45423d'); R(sx + 6, sy - 6, 10, 6, '#1a1917');
  for (i = 0; i < 5; i++) P(sx - 14 + i * 6 + (i % 2), sy - 3 + (i % 3), '#151412');
  R(sx - 10, sy - 30, 20, 22, '#090807'); R(sx - 12, sy - 30, 3, 22, '#35322e'); P(sx - 12, sy - 30, '#4f4b45'); R(sx - 12, sy - 30, 1, 22, '#45423d'); R(sx + 9, sy - 26, 3, 18, '#211f1d'); R(sx + 9, sy - 26, 1, 18, '#2e2c29');
  for (i = 0; i < 9; i++) { var rl = sx - 17 + i * 2, rr2 = sx + 17 - i * 2 - (i < 5 ? (5 - i) * 3 : 0); if (rr2 > rl) { R(rl, sy - 31 - i, rr2 - rl, 1, SL[1]); for (x = rl + (i % 2); x < rr2; x += 3) P(x, sy - 31 - i, SL[0]); P(rl, sy - 31 - i, SL[3]); if (i % 2 === 0) for (x = rl + 1; x < rl + (rr2 - rl) * 0.5; x += 3) P(x, sy - 31 - i, SL[2]); } }
  R(sx - 18, sy - 30, 30, 1, SL[2]); P(sx - 19, sy - 31, SL[2]); P(sx - 20, sy - 32, SL[3]); R(sx - 1, sy - 41, 3, 2, SL[2]);
  L(sx + 13, sy - 28, sx + 19, sy - 9, SL[1], 2); L(sx + 13, sy - 28, sx + 19, sy - 9, SL[2]); R(sx + 15, sy - 4, 5, 2, SL[1]); P(sx + 22, sy - 1, SL[0]); R(sx + 20, sy - 1, 4, 1, SL[1]);
  R(sx - 5, sy - 19, 10, 11, A1); R(sx - 6, sy - 19, 12, 3, A1); R(sx - 6, sy - 19, 3, 11, A2); R(sx + 3, sy - 18, 3, 10, A0); R(sx - 3, sy - 12, 6, 1, A0); R(sx - 6, sy - 9, 12, 1, A2);      // 坐像身
  R(sx - 3, sy - 26, 6, 7, A1); R(sx - 3, sy - 26, 2, 7, A2); R(sx - 6, sy - 23, 3, 2, A2); P(sx - 7, sy - 22, A1); P(sx - 1, sy - 24, '#090807');                                        // 禽首與喙
  P(sx - 2, sy - 27, RD2); P(sx - 1, sy - 28, RD2); P(sx, sy - 27, RD2); P(sx - 4, sy - 20, RD2);                                                                                  // 殘冠與垂肉
  R(sx + 1, sy - 27, 3, 4, '#090807'); P(sx, sy - 24, '#090807'); P(sx + 1, sy - 23, '#090807'); P(sx + 2, sy - 22, '#090807'); L(sx - 2, sy - 18, sx + 3, sy - 13, '#151412');           // 崩裂
  R(sx + 11, sy - 11, 4, 3, A1); P(sx + 11, sy - 11, A2); P(sx + 14, sy - 12, A1);                                                                                                // 落地的殘首
  R(sx - 13, sy - 24, 1, 7, RD1); P(sx - 14, sy - 18, RD2); P(sx - 13, sy - 17, RD2); R(sx - 9, sy - 10, 4, 1, BZ2); R(sx - 8, sy - 9, 2, 1, BZ1); P(sx - 7, sy - 12, RD1); P(sx - 7, sy - 11, A2);
  P(sx - 15, sy - 9, JD2); P(sx - 14, sy - 10, JD3); P(sx + 12, sy - 7, JD3); P(sx - 2, sy - 33, JD3); P(sx - 8, sy - 32, JD2);
  L(sx - 18, sy, sx - 20, sy - 5, '#2f2b20'); L(sx - 17, sy, sx - 16, sy - 4, '#211e17'); L(sx + 17, sy, sx + 19, sy - 4, '#2f2b20');
  /* 前景岩與暗叢 */
  crag(r, 16, H + 2, 86, 40, ['#090908', '#151412', '#23211d']); crag(r, 386, H + 2, 74, 36, ['#090908', '#141312', '#211f1c']); crag(r, 74, H + 2, 30, 13, ['#090908', '#161514', '#24221e']);
  for (i = 0; i < 10; i++) { x = i < 5 ? fl(r() * 110) : 300 + fl(r() * 98); E(x, H + 2, 9 + r() * 8, 5 + r() * 6, '#080907', 1, 3); E(x, H + 3, 8 + r() * 6, 4 + r() * 4, '#080907'); }
  mist(r, 80, 6, '#4a4238', 0.14); mist(r, 112, 5, '#4a4238', 0.06);
  for (i = 0; i < 5; i++) Dz(0, i * 2, W, 2, '#0a0908', 2, 0.5 - i * 0.1);
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
  D = null; M = null;
}
scene('map_region', 398, 280, mapRegion);
scene('map_continent', 340, 270, mapContinent);
scene('wild_fuzhao', 398, 202, wildFuzhao);
scene('wild_chakou', 398, 202, wildChakou);

var css = '', ids = Object.keys(URLS);
for (var n = 0; n < ids.length; n++) css += '.sc-' + ids[n] + '{background-image:url(' + URLS[ids[n]] + ');background-size:100% 100%;image-rendering:pixelated}\n';
var st = document.createElement('style'); st.id = 'shl-scenes-map'; st.textContent = css;
(document.head || document.documentElement).appendChild(st);

/* ---------- 擴充登錄表（不改動其他檔案） ---------- */
var base = window.SHL_SCENES || {}, own = Object.prototype.hasOwnProperty, out = {}, key;
for (key in base) if (own.call(base, key)) out[key] = base[key];
if (!out.buildings) out.buildings = {};
out.has = function (id) { return own.call(URLS, id) || (typeof base.has === 'function' ? !!base.has(id) : false); };
out.list = function () { var a = (typeof base.list === 'function') ? base.list().slice() : []; for (var i = 0; i < ids.length; i++) if (a.indexOf(ids[i]) < 0) a.push(ids[i]); return a; };
out.size = function (id) { return SIZES[id] ? SIZES[id].slice() : (typeof base.size === 'function' ? base.size(id) : null); };   // 顯示尺寸 [w, h]
out.regions = REG;
out.mapRenderMs = now() - T0;
window.SHL_SCENES = out;
})();
