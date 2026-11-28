/* 山海錄 v0.3 — 城鎮平面圖場景（3/4 俯視）。
 * 接在 js/scenes.js 之後載入；作法相同：載入時以程式繪成 398×260 的低解析度像素畫
 * （整數矩形填色、手刻小圖、帶種子亂數、分階明暗；無漸層、無外部圖檔），
 * 轉成 data URL 後注入 <style id="shl-scenes-town">：.sc-<id>{background-image:…}，以 2× pixelated 顯示（796×520）。
 * 會擴充 window.SHL_SCENES：has / list 併入本檔場景，buildings 併入各場景可點建築外框，
 * 另加 spots[<id>] = [[x, y], …]（NPC 立足點，腳底中心）。座標皆為顯示像素（原生 ×2）。 */
(function () {
'use strict';
if (typeof document === 'undefined') return;          // 非瀏覽器環境直接略過
function now() { return (typeof performance !== 'undefined') ? performance.now() : Date.now(); }
var T0 = now();
var NW = 398, NH = 260;
var W = 0, H = 0, D = null, CC = {}, URLS = {}, BLD = {}, SPOTS = {};
var fl = Math.floor, rd = Math.round, sin = Math.sin, cos = Math.cos, PI = Math.PI, abs = Math.abs, max = Math.max, min = Math.min;

/* ---------- 調色盤（與 scenes.js 同族） ---------- */
var K0 = '#0f0e0c', KK = '#0a0908',
    A0 = '#2e2c29', A1 = '#3d3a36', A2 = '#4f4b45', A3 = '#66615a', A4 = '#857f75',
    I3 = '#2a3643', I4 = '#3a4a5a',
    WD0 = '#1f1610', WD1 = '#2b1f16', WD2 = '#3b2a1c', WD3 = '#4d3724', WD4 = '#634a30', WD5 = '#7d6040',
    RED = '#b5382c', RD1 = '#8c2c22', RD2 = '#5e1f19', RD3 = '#3d1512',
    GOLD = '#c9a24a', GD1 = '#8a6c2e', GD2 = '#5c4a22',
    JADE = '#5f9a7a', JD1 = '#3f6d57', JD2 = '#2a4a3c', JD3 = '#1a2e26',
    PAR = '#d8cfbd', PA1 = '#a59c88', PA2 = '#7b735f', PA3 = '#5a5448',
    BZ0 = '#2e2616', BZ1 = '#4a3d22', BZ2 = '#6b5a30', BZ3 = '#93803f',
    EMB = '#e0863a', EMH = '#f2c46a', LIT = '#7a5a24', LIH = '#a37c34',
    PL0 = '#2a2620', PL1 = '#39332a', PL2 = '#464034',
    BN0 = '#4e493d', BN1 = '#6f6858', BN2 = '#8f8672', BN3 = '#aea48f',
    ST = ['#1c1b1a', '#32302d', '#434039'];
/* 屋面五階：[最暗, 背光, 正面, 受光, 高光] */
var SLT = ['#12161a', '#1b2127', '#283038', '#38434c', '#4f5c66'],
    CLY = ['#170e0b', '#26160f', '#392117', '#4e2e20', '#67402c'],
    THA = ['#1b150a', '#2e230f', '#43341a', '#5a4722', '#77613a'],
    PLK = [WD0, WD1, WD2, WD3, WD4],
    CNV = ['#1c1a15', '#2b2720', '#3d372c', '#514939', '#685f4b'],
    PLE = ['#2e2b24', '#48433a', '#676151', '#878069', '#a59c88'],
    HID = ['#1a120c', '#2a1d13', '#3c2a1b', '#503824', '#664a30'],
    GRN = ['#0d1512', '#15231d', '#1f352b', '#2c4a3c', '#3f6d57'],
    RDC = ['#200c0a', '#35130f', '#521b16', '#72251d', '#8c2c22'];

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
function E(cx, cy, rx, ry, c, a, m) {
  cx = rd(cx); cy = rd(cy); rx = rd(rx); ry = rd(ry);
  for (var dy = -ry; dy <= ry; dy++) {
    var hw = fl(rx * Math.sqrt(max(0, 1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))) + 0.5);
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
function S(x, y, rows, pal, flip) { for (var j = 0; j < rows.length; j++) for (var n = rows[j].length, i = 0; i < n; i++) { var c = pal[rows[j][flip ? n - 1 - i : i]]; if (c) P(x + i, y + j, c); } }
function glow(cx, cy, r, c, a) { E(cx, cy, r, rd(r * 0.8), c, a); E(cx, cy, rd(r * 0.62), rd(r * 0.5), c, a); E(cx, cy, rd(r * 0.3), rd(r * 0.25), c, a * 1.5); }
function mist(r, y, h, c, a, x0, x1) {
  x0 = x0 || 0; x1 = x1 || W;
  for (var j = 0; j < h; j++) {
    var d = abs(j - (h - 1) / 2) / (h / 2), al = a * (d < 0.45 ? 0.55 : 0.28), x = x0 - fl(r() * 30);
    while (x < x1) { var len = 24 + fl(r() * 80), xs = max(x, x0); R(xs, y + j, min(x + len, x1) - xs, 1, c, al); x += len + fl(r() * 30 * (d + 0.2)); }
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
function stone(x, y, w, h, r, pal, bh, bw) {   // 石砌／鋪石：錯縫
  pal = pal || ST; bh = bh || 4; bw = bw || 7;
  function B(ax, ay, aw, ah, c) { var x0 = max(ax, x), y0 = max(ay, y), x1 = min(ax + aw, x + w), y1 = min(ay + ah, y + h); if (x1 > x0 && y1 > y0) R(x0, y0, x1 - x0, y1 - y0, c); }
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

/* ---------- 地面 ---------- */
function mottle(r, x, y, w, h, cols, n, a) {  // 雜斑：短橫條
  for (var i = 0; i < n; i++) { var px = x + fl(r() * w), py = y + fl(r() * h), pw = 2 + fl(r() * 9); R(px, py, min(pw, x + w - px), 1 + (r() < 0.2 ? 1 : 0), cols[fl(r() * cols.length)], a || 0.7); }
}
function blob(r, cx, cy, rx, ry, c, a) {      // 毛邊橢圓地塊
  for (var dy = -ry; dy <= ry; dy++) { var hw = rx * Math.sqrt(max(0, 1 - dy * dy / (ry * ry + 1))) + (r() - 0.5) * 4; if (hw > 0.5) R(cx - hw + (r() - 0.5) * 3, cy + dy, hw * 2, 1, c, a); }
}
function trail(r, pts, w, c, edge) {          // 踩實的路：沿折線蓋方塊；edge 為外圈過渡色
  for (var pass = edge ? 0 : 1; pass < 2; pass++) for (var s = 0; s < pts.length - 1; s++) {
    var a0 = pts[s], a1 = pts[s + 1], n = max(abs(a1[0] - a0[0]), abs(a1[1] - a0[1])) || 1;
    for (var i = 0; i <= n; i += 2) { var t = i / n, ww = w + (pass ? 0 : 5) + (r() - 0.5) * 3; R(a0[0] + (a1[0] - a0[0]) * t - ww / 2, a0[1] + (a1[1] - a0[1]) * t - ww * 0.4, ww, ww * 0.8, pass ? c : edge); }
  }
}
function ruts(r, pts, off, c) {               // 車轍：兩道斷續細線
  for (var s = 0; s < pts.length - 1; s++) {
    var a0 = pts[s], a1 = pts[s + 1], n = max(abs(a1[0] - a0[0]), abs(a1[1] - a0[1])) || 1, hz = abs(a1[0] - a0[0]) > abs(a1[1] - a0[1]);
    for (var i = 0; i <= n; i++) { if (((i >> 2) % 4) === 3 || r() < 0.08) continue; var t = i / n, x = a0[0] + (a1[0] - a0[0]) * t, y = a0[1] + (a1[1] - a0[1]) * t; if (hz) { P(x, y - off * 0.6, c); P(x, y + off * 0.6, c); } else { P(x - off, y, c); P(x + off, y, c); } }
  }
}
function tuft(x, y, c1, c2) { P(x, y, c1); P(x - 1, y - 1, c1); P(x + 1, y - 2, c2); P(x + 2, y, c2); P(x + 1, y - 1, c1); }
function pebble(x, y, w, pal) { R(x, y, w, 2, pal[1]); R(x, y, max(1, w - 1), 1, pal[2]); R(x + 1, y + 2, w, 1, KK, 0.4); }
function rockO(cx, cy, w, h, pal) {           // 俯視稜石：頂面受光、前面背光
  cx = rd(cx); cy = rd(cy); var x = cx - fl(w / 2), t = max(2, fl(h * 0.55));
  R(x + 2, cy, w, 2, KK, 0.4);
  R(x + 1, cy - h, w - 2, 1, pal[2]); R(x, cy - h + 1, w, t - 1, pal[2]); R(x, cy - h + t, w, h - t, pal[1]); R(x + 1, cy, w - 2, 1, pal[0]);
  R(x + fl(w * 0.6), cy - h + 1, w - fl(w * 0.6), t - 1, pal[1]); R(x + fl(w * 0.6), cy - h + t, w - fl(w * 0.6), h - t, pal[0]);
  P(x + 1, cy - h + 1, pal[3] || pal[2]);
}
function heap(r, cx, cy, rx, ry, pal) {       // 渣堆／土堆
  E(cx + 2, cy + 1, rx, ry, KK, 0.35); E(cx, cy, rx, ry, pal[0]); E(cx - rx * 0.2, cy - ry * 0.25, rx * 0.7, ry * 0.6, pal[1]); E(cx - rx * 0.35, cy - ry * 0.45, rx * 0.4, ry * 0.3, pal[2], 1, 2);
  for (var i = 0; i < rx; i++) P(cx - rx + fl(r() * rx * 2), cy - ry * 0.6 + fl(r() * ry * 1.2), r() < 0.5 ? pal[2] : pal[0]);
}

/* ---------- 建築零件（俯視：屋頂＋正面牆） ---------- */
/* 四坡頂：外框 x,y,w,h；正脊在第 rb 列、兩端內縮 ins（ins=0 即兩坡懸山）。左坡受光、右坡背光。 */
function hip(x0, y, w0, h, ins, rb, pal, tex, sl) {   // sl：兩側上收（帳篷）
  var j, yy, t, xl, xr, c, k, q, x, w, xo, band;
  for (j = 0; j < h; j++) {
    xo = sl ? rd(sl * (h - 1 - j) / max(1, h - 1)) : 0; x = x0 + xo; w = w0 - 2 * xo;
    yy = y + j; t = j < rb ? j / rb : (h - 1 - j) / max(1, h - 1 - rb);
    xl = max(x, x0 + rd(ins * t)); xr = min(x + w, x0 + w0 - rd(ins * t)); band = tex === 'tile' ? j % 3 === 2 : (tex !== 'cloth' && j % 4 === 3);
    if (j < rb) {
      R(xl, yy, xr - xl, 1, pal[1]);
      if (tex === 'tile') for (c = x + 2; c < xr; c += 3) if (c >= xl) P(c, yy, pal[0]);
    } else {
      R(xl, yy, xr - xl, 1, pal[2]); k = j - rb;
      if (tex === 'tile') { for (c = x + 2; c < xr; c += 3) if (c >= xl) { P(c, yy, pal[1]); if (k % 3 === 1 && c + 1 < xr && c < x + w * 0.62) P(c + 1, yy, pal[3]); } }
      else if (tex === 'thatch') { for (c = xl; c < xr; c++) { q = (c * 7 + k * 13 + ((c * k) % 3)) % 6; if (q === 0) P(c, yy, pal[1]); else if (q === 3 && c < x + w * 0.62) P(c, yy, pal[3]); } if (k % 5 === 4) Dz(xl, yy, xr - xl, 1, pal[1], 2); }
      else if (tex === 'plank') { for (c = x + 3; c < xr; c += 4) if (c >= xl) P(c, yy, pal[1]); if (k % 6 === 5) Dz(xl, yy, xr - xl, 1, pal[1], 1); }
      else { q = xl + fl((xr - xl) * 0.64); R(q, yy, xr - q, 1, pal[1], 0.55); if (k % 4 === 3) Dz(xl, yy, xr - xl, 1, pal[1], 1); }
    }
    if (xl > x) { R(x, yy, xl - x, 1, pal[3]); if (band) R(x, yy, xl - x, 1, pal[2]); if (j >= rb) P(xl - 1, yy, pal[4]); }
    if (xr < x + w) { R(xr, yy, x + w - xr, 1, pal[0]); if (band) R(xr, yy, x + w - xr, 1, pal[1]); if (j >= rb) P(xr, yy, pal[1]); }
  }
  x = x0; w = w0;
  if (w - 2 * ins > 0) { R(x + ins - 1, y + rb - 1, w - 2 * ins + 2, 2, pal[3]); R(x + ins - 1, y + rb - 1, fl((w - 2 * ins) * 0.6), 1, pal[4]); R(x + ins, y + rb + 1, w - 2 * ins, 1, pal[0]); }
  R(x, y + h - 1, w, 1, pal[3]); for (c = x; c < x + w * 0.6; c += 2) P(c, y + h - 1, pal[4]);
  R(x + w - fl(w * 0.22), y + h - 1, fl(w * 0.22), 1, pal[2]);
}
function wallF(x, y, w, h, kind, r) {         // 正面牆：pl 灰泥、wd 木板、st 石砌、dk 暗（敞口）
  if (kind === 'st') stone(x, y, w, h, r, ['#1a1a1b', '#2a2a2b', '#39383a'], 4, 7);
  else if (kind === 'wd') { R(x, y, w, h, WD2); for (var i = x + 3; i < x + w; i += 4) R(i, y, 1, h, WD1); }
  else if (kind === 'dk') R(x, y, w, h, '#0d0b09');
  else { R(x, y, w, h, PL1); R(x, y + h - 3, w, 3, PL0); }
  R(x + fl(w * 0.66), y, w - fl(w * 0.66), h, KK, 0.25);
  R(x, y, w, 2, KK, 0.55); R(x, y + h - 1, w, 1, KK, 0.5);
}
function post(x, y, h, c1, c2) { R(x, y, 2, h, c1); R(x, y, 1, h, c2); }
/* 房：屋頂 x,y,w,rh ＋ 牆高 wh；回傳牆面 [x, y, w, h] */
function house(x, y, w, rh, wh, o) {
  o = o || {}; var wx = x + 2, ww = w - 4, wy = y + rh;
  R(wx + 3, wy + wh, ww + 1, 2, KK, 0.4); T(wy + 3, wy + wh + 1, x + w - 2, x + w + 1, x + w - 2, x + w + 3, KK, 0.4);
  wallF(wx, wy, ww, wh, o.wall || 'pl', o.r);
  hip(x, y, w, rh, o.ins == null ? 8 : o.ins, o.rb == null ? 5 : o.rb, o.pal || SLT, o.tex || 'tile');
  return [wx, wy, ww, wh];
}
function door(x, y, w, h, cur, lit) {
  R(x - 1, y - 1, w + 2, h + 1, WD1); R(x, y, w, h, lit ? '#2a1d10' : KK);
  if (lit) { R(x + 1, y + fl(h * 0.5), w - 2, h - fl(h * 0.5), LIT, 0.55); }
  if (cur) { var ch = fl(h * 0.45); R(x, y, w, ch, cur[0]); R(x, y, w, 1, cur[1]); R(x + fl(w / 2), y + 1, 1, ch - 1, KK); for (var i = x; i < x + w; i += 2) P(i, y + ch, cur[0]); }
  R(x - 1, y + h, w + 2, 1, A2);
}
function gateDoor(x, y, w, h) {               // 關閉的厚門：鐵箍、門釘
  R(x, y, w, h, WD1); R(x, y, fl(w / 2), h, WD2); for (var i = x + 2; i < x + w; i += 3) R(i, y, 1, h, WD0);
  R(x + fl(w / 2), y, 1, h, KK); R(x, y + 3, w, 1, A0); R(x, y + h - 4, w, 1, A0);
  for (var j = y + 1; j < y + h - 1; j += 4) for (i = x + 1; i < x + w; i += 3) P(i, j, GD2);
  P(x + fl(w / 2) - 2, y + fl(h / 2), GD1); P(x + fl(w / 2) + 2, y + fl(h / 2), GD1);
}
function win(x, y, w, h, lit) {
  R(x - 1, y - 1, w + 2, h + 2, WD1); R(x, y, w, h, lit ? LIT : '#14110e'); if (lit) R(x, y, w, 1, LIH);
  for (var i = x + 2; i < x + w; i += 3) R(i, y, 1, h, lit ? WD1 : '#241c14');
  if (h > 4) R(x, y + fl(h / 2), w, 1, lit ? WD1 : '#241c14');
}
function lantern(x, y, r) {
  glow(x, y + 4, r || 8, RED, 0.07);
  P(x, y, KK); R(x - 1, y + 1, 3, 1, GD1); R(x - 1, y + 2, 3, 1, RED); R(x - 2, y + 3, 5, 3, RED); R(x - 1, y + 6, 3, 1, RD1);
  R(x + 2, y + 3, 1, 3, RD1); P(x - 1, y + 3, '#d9705c'); P(x, y + 7, GD1);
}
function brazier(x, y) {                      // x 中心、y 腳底
  glow(x, y - 7, 12, EMB, 0.07); E(x + 2, y, 4, 1, KK, 0.4);
  P(x - 2, y - 1, A0); P(x + 2, y - 1, A0); R(x - 1, y - 4, 1, 3, A0); R(x + 1, y - 4, 1, 3, A0);
  R(x - 3, y - 6, 7, 2, A1); R(x - 3, y - 6, 3, 1, A3); R(x - 2, y - 8, 5, 2, RD1); R(x - 1, y - 9, 3, 2, RED);
  P(x, y - 8, EMB); P(x - 1, y - 10, EMB); P(x, y - 11, EMH); P(x + 1, y - 9, EMB); P(x, y - 13, RD1);
}
function fire(x, y, s) {                      // 營火：x 中心、y 底；s 大小 1..3
  glow(x, y - 3, 8 + s * 5, EMB, 0.07); E(x + 1, y, 3 + s, 1 + (s > 1 ? 1 : 0), '#14110e');
  L(x - 3 - s, y, x + 2 + s, y - 2, WD1); L(x - 2 - s, y - 2, x + 3 + s, y, WD2);
  R(x - s, y - 2 - s, s * 2 + 1, s + 1, RD1); R(x - s + 1, y - 3 - s, max(1, s * 2 - 1), s + 1, RED); R(x - fl(s / 2), y - 3 - s * 2, max(1, s), s + 1, EMB);
  P(x, y - 4 - s * 2, EMH); P(x, y - 2 - s, EMH); P(x - s, y - 3 - s, EMB); P(x + s, y - 2 - s, EMB); P(x + 1, y - 6 - s * 2, RD1);
}
function crate(x, y, w, h) {                  // 頂面＋正面
  var t = max(2, fl(h * 0.36)); R(x + 1, y + h, w, 1, KK, 0.4);
  R(x, y, w, t, WD4); R(x, y, w, 1, WD5); R(x + fl(w / 2), y + 1, 1, t - 1, WD3);
  R(x, y + t, w, h - t, WD2); R(x + w - 1, y + t, 1, h - t, WD0); R(x, y + h - 1, w, 1, WD0); R(x, y + t, 1, h - t, WD3); L(x + 1, y + t + 1, x + w - 2, y + h - 2, WD1);
}
function barrel(x, y, w, h) {
  R(x + 1, y + h, w, 1, KK, 0.4); R(x, y + 2, w, h - 2, WD2); R(x, y + 2, 1, h - 2, WD3); R(x + w - 1, y + 2, 1, h - 2, WD0);
  R(x + 1, y, w - 2, 1, WD4); R(x, y + 1, w, 2, WD4); R(x + 1, y + 1, w - 2, 1, WD1); R(x, y + 4, w, 1, A0); R(x, y + h - 2, w, 1, A0);
}
function sack(x, y, w, h) { R(x + 1, y + h, w, 1, KK, 0.4); E(x + w / 2, y + h / 2, w / 2, h / 2, '#4a4334'); R(x + 1, y + h - 2, w - 1, 2, '#3b3529'); P(x + fl(w / 2), y - 1, '#5c5443'); P(x + 2, y + 2, '#6a614d'); }
function jar(x, y, c) { c = c || '#2c2622'; R(x + 1, y + 6, 5, 1, KK, 0.4); R(x + 1, y, 3, 1, A2); R(x, y + 1, 5, 4, c); R(x + 1, y + 5, 3, 1, c); P(x + 1, y + 2, A3); P(x + 2, y, KK); }
function wjar(x, y) {                         // 大酒罈：紅紙封口
  R(x + 1, y + 9, 7, 1, KK, 0.4); E(x + 3, y + 5, 3, 3, '#2f231b'); R(x + 1, y + 8, 5, 1, '#1d1511'); R(x, y + 4, 1, 3, '#4a372a'); P(x + 1, y + 3, '#5c4636');
  R(x + 1, y, 5, 2, RD1); R(x + 1, y, 3, 1, RED); R(x + 5, y + 4, 2, 4, '#1d1511');
}
function tray(cx, cy, rx, c1, c2) { E(cx, cy, rx, max(1, fl(rx * 0.5)), WD4); E(cx, cy, rx - 1, max(1, fl(rx * 0.5) - 1), c1); P(cx - 1, cy - 1, c2); P(cx + 1, cy, c2); P(cx - 2, cy, c2); }
function paper(x, y, w, h, seal) {
  R(x, y, w, h, PA1); R(x, y, w, 1, '#c2b8a2'); R(x + w - 1, y + 1, 1, h - 1, PA2);
  for (var j = y + 2; j < y + h - 1; j += 2) R(x + 1, j, w - 2 - ((j * 7) % 2), 1, PA3);
  if (seal) { R(x + w - 3, y + h - 3, 2, 2, RED); }
}
function nboard(x, y, w, h, n) {              // 獨立告示板：兩柱、小簷、紙張與一枚紅印
  var i, px;
  R(x + 2, y + h, w, 2, KK, 0.4);
  post(x + 1, y + 2, h - 2, WD2, WD4); post(x + w - 3, y + 2, h - 2, WD1, WD3);
  R(x + 3, y + 4, w - 6, h - 9, WD1); R(x + 4, y + 5, w - 8, h - 11, WD3); R(x + 4 + fl((w - 8) * 0.66), y + 5, w - 8 - fl((w - 8) * 0.66), h - 11, WD2);
  R(x - 1, y, w + 2, 3, SLT[2]); R(x - 1, y, w + 2, 1, SLT[4]); R(x - 1, y + 3, w + 2, 1, KK); for (i = x + 1; i < x + w; i += 3) P(i, y + 1, SLT[1]);
  n = n || 3; px = x + 5;
  for (i = 0; i < n; i++) { var pw = 4 + ((i * 3) % 3), ph = h - 14 - (i % 2) * 2; paper(px, y + 6 + (i % 2), pw, ph, i === 1); px += pw + 1; }
}
function pole(x, y, h) { R(x, y, 1, h, WD4); R(x + 1, y + 1, 1, h - 1, WD1); P(x, y - 1, GD1); R(x - 1, y + h - 1, 3, 1, A1); R(x + 1, y + h, 3, 1, KK, 0.4); }
var STAR = ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'];
var SUN = ['#...#...#', '.#..#..#.', '.........', '...###...', '..#####..', '.#######.', '#########'];
function banner(x, y, h, cloth, emb, embc) {  // 桿＋直幅：桿頂 (x,y)，幅在桿右
  pole(x, y, h); R(x, y + 1, 12, 1, WD4);
  var bw = emb ? emb[0].length + 2 : 9, bh = emb ? emb.length + 9 : 16;
  R(x + 2, y + 2, bw, bh, cloth[1]); R(x + 2, y + 2, 1, bh, cloth[2]); R(x + 1 + bw, y + 2, 1, bh, cloth[0]); R(x + 2, y + 2, bw, 1, cloth[2]);
  R(x + 2, y + 2 + bh, 3, 2, cloth[1]); R(x + bw - 1, y + 2 + bh, 3, 2, cloth[0]); P(x + 2, y + 4 + bh, cloth[1]);
  if (emb) S(x + 3, y + 5, emb, { '#': embc || GOLD });
  R(x + 2, y + bh - 1, bw, 1, cloth[0]);
}
function flagS(x, y, h, c1, c2) {             // 小三角旗
  R(x, y, 1, h, WD4); P(x, y - 1, GD1); R(x + 1, y + h, 2, 1, KK, 0.4);
  T(y + 1, y + 5, x + 1, x + 9, x + 1, x + 2, c1); R(x + 1, y + 1, 7, 1, c2);
}
function wrack(x, y, w, n, kind) {            // 兵器架：橫架＋直插的槍／刀
  var i, sx;
  R(x + 2, y + 15, w, 2, KK, 0.4);
  post(x, y + 5, 10, WD2, WD4); post(x + w - 2, y + 5, 10, WD1, WD3); R(x, y + 6, w, 1, WD4); R(x, y + 12, w, 1, WD3);
  for (i = 0; i < n; i++) {
    sx = x + 3 + rd(i * (w - 7) / max(1, n - 1));
    if (kind === 'sw' && i % 2) { R(sx, y + 3, 1, 9, A3); P(sx, y + 2, A4); R(sx - 1, y + 11, 3, 1, GD1); R(sx, y + 12, 1, 2, WD1); }
    else { R(sx, y + 1, 1, 14, WD4); R(sx, y - 2, 1, 3, A4); P(sx, y - 3, PA1); P(sx - 1, y, A3); P(sx + 1, y, A3); P(sx, y + 2, RED); P(sx + 1, y + 3, RD1); }
  }
}
function shield(cx, cy) { E(cx + 1, cy + 1, 3, 3, KK, 0.4); E(cx, cy, 3, 3, WD1); E(cx, cy, 2, 2, WD3); P(cx - 1, cy - 1, WD4); P(cx, cy, GD1); R(cx - 3, cy, 1, 1, A2); }
function anvil(x, y) {                        // 木墩上的鐵砧
  R(x + 2, y + 9, 9, 2, KK, 0.4); R(x + 2, y + 5, 6, 4, WD2); R(x + 2, y + 5, 6, 1, WD4); R(x + 7, y + 6, 1, 3, WD0);
  S(x, y, ['.########', '#########', '..#####..', '..#####..', '.#######.'], { '#': '#2f3338' }); R(x + 1, y, 8, 1, '#59616a'); P(x, y + 1, '#59616a'); R(x + 6, y + 2, 1, 2, '#1c1f23');
}
function table(x, y, w, h) { R(x + 2, y + h + 3, w, 1, KK, 0.4); R(x, y, w, h, WD4); R(x, y, w, 1, WD5); R(x + fl(w * 0.6), y + 1, w - fl(w * 0.6), h - 1, WD3); R(x, y + h, w, 2, WD2); R(x, y + h + 2, 1, 2, WD1); R(x + w - 1, y + h + 2, 1, 2, WD1); }
function bench(x, y, w) { R(x + 1, y + 4, w, 1, KK, 0.4); R(x, y, w, 2, WD3); R(x, y, w, 1, WD5); R(x + 1, y + 2, 1, 2, WD1); R(x + w - 2, y + 2, 1, 2, WD1); }
function fenceH(x0, x1, y, c) {               // 矮柵（正面）
  c = c || [WD1, WD3, WD4]; R(x0 + 1, y + 6, x1 - x0, 1, KK, 0.35);
  R(x0, y + 2, x1 - x0, 1, c[1]); R(x0, y + 4, x1 - x0, 1, c[0]);
  for (var x = x0; x < x1; x += 5) { R(x, y, 2, 6, c[1]); R(x, y, 1, 6, c[2]); P(x + 1, y + 5, c[0]); }
}
function fenceV(x, y0, y1, c) {               // 矮柵（側向，只見樁頂與橫條）
  c = c || [WD1, WD3, WD4]; R(x + 2, y0 + 2, 2, y1 - y0, KK, 0.3); R(x, y0, 1, y1 - y0, c[0]);
  for (var y = y0; y < y1; y += 5) { R(x - 1, y, 2, 4, c[1]); R(x - 1, y, 2, 1, c[2]); }
}
function palH(x0, x1, y, h) {                 // 尖木樁橫列（正面）
  R(x0 + 1, y + h, x1 - x0, 2, KK, 0.4);
  for (var x = x0; x < x1; x += 3) {
    var d = ((x * 7) % 5 === 0) ? 1 : 0, ww = min(3, x1 - x);
    R(x, y + 1 + d, ww, h - 1 - d, WD1); R(x, y + 1 + d, 1, h - 1 - d, WD3); if (ww > 1) P(x + 1, y + d, WD4); if (ww > 2) P(x + 2, y + 2 + d, WD0);
  }
  R(x0, y + 4, x1 - x0, 1, WD0); R(x0, y + h - 2, x1 - x0, 1, WD0, 0.6);
}
function palV(x, y0, y1) {                    // 尖木樁縱列（由上而下層疊）
  R(x + 4, y0 + 2, 3, y1 - y0 + 4, KK, 0.35);
  for (var y = y0; y < y1; y += 3) { R(x, y, 4, 7, WD1); R(x, y, 1, 7, WD2); R(x, y, 4, 1, WD3); P(x + 1, y, WD4); P(x + 3, y + 1, WD0); }
}
function well(cx, cy) {                       // 石井：井圈、井架、吊桶
  E(cx + 3, cy + 5, 10, 4, KK, 0.4);
  E(cx, cy + 4, 9, 5, '#232221'); E(cx, cy + 3, 9, 5, '#2f2d2b'); for (var i = -8; i <= 8; i += 4) R(cx + i, cy + 5, 1, 3, '#1c1b1a');
  E(cx, cy, 9, 5, A2); E(cx - 1, cy - 1, 7, 3, A3, 1, 1); E(cx, cy, 6, 3, '#0a0c0e'); P(cx - 2, cy + 1, I3); P(cx + 1, cy + 2, I3);
  post(cx - 11, cy - 14, 18, WD2, WD4); post(cx + 10, cy - 14, 18, WD1, WD3);
  R(cx - 12, cy - 15, 25, 2, WD3); R(cx - 12, cy - 15, 25, 1, WD5);
  hip(cx - 14, cy - 23, 29, 8, 4, 2, PLK, 'plank');
  R(cx, cy - 13, 1, 8, PA2); R(cx - 2, cy - 5, 5, 4, WD3); R(cx - 2, cy - 5, 5, 1, WD5); P(cx + 2, cy - 3, WD1);
}
function cart(x, y, load) {                   // 板車：車板 22×7、兩輪、轅
  R(x + 3, y + 12, 26, 2, KK, 0.4);
  L(x + 22, y + 5, x + 33, y + 10, WD3); L(x + 22, y + 7, x + 33, y + 11, WD1);
  R(x, y, 23, 5, WD3); R(x, y, 23, 1, WD5); for (var i = x + 4; i < x + 23; i += 5) R(i, y + 1, 1, 4, WD2); R(x, y + 5, 23, 3, WD2); R(x, y + 7, 23, 1, WD0);
  E(x + 5, y + 9, 4, 4, WD0); E(x + 5, y + 9, 3, 3, WD3); E(x + 5, y + 9, 2, 2, '#15110d'); P(x + 5, y + 9, WD4); P(x + 3, y + 7, WD4);
  E(x + 18, y + 9, 4, 4, WD0); E(x + 18, y + 9, 3, 3, WD2); E(x + 18, y + 9, 2, 2, '#15110d'); P(x + 18, y + 9, WD4);
  if (load === 'ore') { E(x + 11, y - 1, 9, 3, '#201d1b'); E(x + 9, y - 2, 6, 2, '#2e2a27'); P(x + 7, y - 3, A2); P(x + 12, y - 2, A1); P(x + 15, y - 1, '#3a211a'); }
  else if (load === 'box') { crate(x + 2, y - 6, 8, 7); crate(x + 11, y - 5, 9, 6); sack(x + 12, y - 10, 7, 6); }
  else if (load === 'bone') { E(x + 11, y - 1, 9, 3, BN0); for (i = 0; i < 9; i++) R(x + 3 + ((i * 5) % 16), y - 3 + (i % 3), 3, 1, i % 2 ? BN2 : BN1); P(x + 8, y - 4, BN3); P(x + 14, y - 3, BN3); }
}
var HORSE = ['..a.a...........', '.aaa............', 'aaaa.bbbbbbbbb..', '.aabbbbbbbbbbb.c', '..bbbbbbbbbbbb.c', '..bbbbbbbbbbbb..', '..bb.b....b.bb..', '..c..c....c..c..', '..c..c....c..c..'];
function horse(x, y, c, flip) { R(x + 3, y + 9, 13, 1, KK, 0.4); S(x, y, HORSE, c || { a: '#4a3524', b: '#3d2b1c', c: '#1f1610' }, flip); P(flip ? x + 14 : x + 1, y + 2, KK); R(x + 6, y + 2, 4, 1, (c && c.h) || '#59402a'); }
function tree(r, cx, by, s, pal) {            // 樹：by 樹腳；s 樹冠半徑
  pal = pal || ['#0c110e', '#141d17', '#1d2a21', '#28392c'];
  E(cx + s * 0.6, by, s, max(2, s * 0.35), KK, 0.35);
  R(cx - 1, by - 5, 3, 5, WD1); R(cx - 1, by - 5, 1, 5, WD2);
  var cy = by - 4 - s * 0.75;
  E(cx, cy, s, s * 0.8, pal[0]); E(cx - 1, cy - 1, s - 1, s * 0.7, pal[1]); E(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.45, pal[2]); E(cx - s * 0.4, cy - s * 0.4, s * 0.4, s * 0.3, pal[3], 1, 1);
  for (var i = 0; i < s * 2; i++) P(cx - s + fl(r() * s * 2), cy - s * 0.5 + fl(r() * s * 1.1), r() < 0.5 ? pal[0] : pal[2]);
}
function deadTree(r, cx, by, h, c) {          // 枯樹：連地上的斜影
  c = c || ['#15120f', '#2a231c', '#3d342a']; var i, y, a, len;
  L(cx + 1, by, cx + h * 0.7, by + 2, KK, 1, 0.35); L(cx + h * 0.35, by + 1, cx + h * 0.6, by - 2, KK, 1, 0.3);
  R(cx - 1, by - h * 0.5, 3, h * 0.5, c[1]); R(cx, by - h, 2, h * 0.55, c[1]); R(cx - 1, by - h * 0.5, 1, h * 0.5, c[2]); R(cx + 1, by - h * 0.5, 1, h * 0.5, c[0]); P(cx - 2, by - 1, c[1]); P(cx + 2, by - 1, c[0]);
  for (i = 0; i < 5; i++) { y = by - h * (0.45 + i * 0.12); a = (i % 2 ? -1 : 1); len = h * (0.42 - i * 0.05); L(cx, y, cx + a * len, y - len * 0.7, i % 2 ? c[2] : c[1]); L(cx + a * len * 0.6, y - len * 0.42, cx + a * len * 0.75, y - len * 0.95, c[1]); }
}
function bush(cx, cy, rx, pal) { pal = pal || ['#0c110e', '#141d17', '#1d2a21']; E(cx + 1, cy + 1, rx, max(1, rx * 0.5), KK, 0.35); E(cx, cy, rx, rx * 0.6, pal[0]); E(cx - 1, cy - 1, rx - 1, rx * 0.5, pal[1]); E(cx - rx * 0.35, cy - rx * 0.3, rx * 0.45, rx * 0.25, pal[2], 1, 2); }
function kilnO(r, cx, cy, rx, ry, lit) {      // 饅頭窯（俯視的磚丘，窯口朝前）
  E(cx + 3, cy + ry, rx + 1, 3, KK, 0.4);
  E(cx, cy, rx, ry, '#24170f'); for (var j = -ry + 1; j < ry; j += 2) { var hw = fl(rx * Math.sqrt(max(0, 1 - j * j / ((ry + 0.5) * (ry + 0.5))))); Dz(cx - hw, cy + j, hw * 2, 1, '#33211a', 2); }
  E(cx - rx * 0.3, cy - ry * 0.35, rx * 0.55, ry * 0.45, '#3f2a1f', 1, 2); E(cx - rx * 0.4, cy - ry * 0.5, rx * 0.3, ry * 0.22, '#523729', 1, 1);
  R(cx - 1, cy - ry - 1, 3, 2, WD0); P(cx - 1, cy - ry - 1, '#3f2a1f');
  R(cx - 3, cy + ry - 6, 7, 7, '#1a110c'); R(cx - 2, cy + ry - 5, 5, 6, KK); P(cx - 3, cy + ry - 6, '#3f2a1f');
  if (lit) { glow(cx, cy + ry, 8, EMB, 0.08); R(cx - 1, cy + ry - 3, 3, 4, RD1); P(cx, cy + ry - 2, EMB); P(cx - 1, cy + ry - 1, RED); P(cx, cy + ry - 1, EMH); }
  smoke(r, cx, cy - ry - 1, lit ? 4 : 2, 0.5, A1, 0.5);
}

/* ---------- 收尾：保留 UI 區壓暗、四周暗角 ---------- */
function fin(q) {
  q = q == null ? 0.38 : q;
  R(0, 0, 106, 17, KK, q); Dz(0, 17, 106, 2, KK, 2, q); Dz(106, 0, 2, 19, KK, 2, q);
  R(314, 0, 84, 17, KK, q); Dz(314, 17, 84, 2, KK, 2, q); Dz(312, 0, 2, 19, KK, 2, q);
  Dz(0, 0, W, 3, KK, 2, 0.4); Dz(0, H - 4, W, 4, KK, 2, 0.35); Dz(0, 0, 3, H, KK, 2, 0.35); Dz(W - 3, 0, 3, H, KK, 2, 0.35);
}
function box(B, k, x, y, w, h) { B[k] = [x * 2, y * 2, w * 2, h * 2]; }

/* ==================== 一、灰窯鎮 ==================== */
function hyMarket(x, y, r) {                  // 天星分號 82×58
  var i, w = house(x + 2, y, 60, 24, 16, { ins: 9, rb: 5, pal: SLT });
  for (i = 0; i < 4; i++) post(w[0] + rd(i * (w[2] - 2) / 3), w[1], w[3], WD1, WD3);
  door(x + 10, y + 28, 9, 12, null, true);
  R(x + 25, y + 29, 34, 11, '#120f0c');                                   // 櫃面開口
  for (i = 0; i < 5; i++) { jar(x + 27 + i * 6, y + 31, i % 2 ? '#3a2b20' : '#2c2622'); }
  T(y + 25, y + 33, x + 24, x + 60, x + 21, x + 63, PA2);                 // 條紋布篷
  for (i = 0; i < 9; i++) T(y + 25, y + 33, x + 24 + i * 4, x + 26 + i * 4, x + 21 + rd(i * 4.66), x + 23 + rd(i * 4.66), RD1);
  R(x + 21, y + 33, 42, 1, RD2); R(x + 21, y + 34, 42, 1, KK, 0.5); T(y + 25, y + 33, x + 48, x + 60, x + 49, x + 63, KK, 0.25);
  R(x + 23, y + 40, 38, 2, WD4); R(x + 23, y + 40, 38, 1, WD5); R(x + 23, y + 42, 38, 3, WD2);   // 櫃檯
  P(x + 30, y + 39, GOLD); P(x + 36, y + 39, JADE); P(x + 43, y + 39, RED); R(x + 50, y + 38, 4, 2, PA1);
  crate(x + 2, y + 44, 10, 9); crate(x + 13, y + 46, 8, 8); crate(x + 5, y + 38, 8, 7);
  jar(x + 24, y + 50); jar(x + 30, y + 51, '#3a2b20'); jar(x + 36, y + 50);
  banner(x + 67, y + 6, 46, ['#141b22', '#1f2a35', '#2f3f4e'], STAR, GOLD);
  crate(x + 64, y + 46, 9, 9); barrel(x + 74, y + 45, 7, 10); sack(x + 46, y + 49, 8, 6);
}
function hyInn(x, y, r) {                     // 老窯客棧 94×72
  var i;
  /* 馬棚 */
  R(x + 68, y + 66, 27, 2, KK, 0.4); R(x + 66, y + 44, 27, 21, '#0e0c0a');
  R(x + 80, y + 57, 11, 8, THA[2]); Dz(x + 80, y + 57, 11, 8, THA[4], 1); R(x + 80, y + 57, 11, 1, THA[3]);
  horse(x + 68, y + 53);
  post(x + 91, y + 44, 22, WD1, WD3); R(x + 66, y + 60, 26, 1, WD3);
  T(y + 28, y + 45, x + 65, x + 91, x + 65, x + 95, WD2); for (i = 0; i < 7; i++) L(x + 68 + i * 4, y + 28, x + 68 + rd(i * 4.5), y + 45, WD1);
  R(x + 65, y + 28, 26, 1, WD4); R(x + 65, y + 45, 30, 1, WD4); R(x + 65, y + 46, 30, 1, KK, 0.6);
  /* 一樓 */
  R(x + 6, y + 66, 62, 2, KK, 0.4);
  wallF(x + 3, y + 47, 62, 17, 'pl'); for (i = 0; i < 4; i++) post(x + 3 + i * 20, y + 47, 17, WD1, WD3);
  door(x + 27, y + 50, 14, 14, [I3, I4], true); R(x + 24, y + 64, 20, 2, A1); R(x + 24, y + 64, 20, 1, A3);
  win(x + 9, y + 52, 10, 7, true); win(x + 49, y + 52, 10, 7, true);
  hip(x, y + 37, 68, 11, 6, 0, SLT, 'tile');
  /* 二樓 */
  wallF(x + 9, y + 25, 50, 13, 'wd'); win(x + 14, y + 28, 8, 5, true); win(x + 30, y + 28, 8, 5, false); win(x + 46, y + 28, 8, 5, true);
  R(x + 8, y + 34, 52, 1, WD5); for (i = x + 8; i < x + 60; i += 3) R(i, y + 35, 1, 2, WD3);
  hip(x + 4, y, 60, 26, 12, 6, SLT, 'tile');
  R(x + 44, y + 9, 5, 7, A0); R(x + 44, y + 9, 2, 7, A1); R(x + 43, y + 8, 7, 1, A3); smoke(r, x + 46, y + 7, 4, 0.7, A2, 0.45);
  R(x + 28, y + 45, 12, 4, WD0); R(x + 29, y + 46, 10, 2, RD2); P(x + 31, y + 46, GD1); P(x + 34, y + 47, GD1); P(x + 36, y + 46, GD1);
  lantern(x + 22, y + 48, 8); lantern(x + 46, y + 48, 8); lantern(x + 6, y + 26, 6); lantern(x + 62, y + 26, 6);
  jar(x + 4, y + 61); jar(x + 10, y + 62, '#3a2b20'); bench(x + 47, y + 66, 14);
}
function hyApoth(x, y, r) {                   // 回春藥鋪 76×58
  var i, w = house(x, y, 44, 21, 15, { ins: 8, rb: 5, pal: GRN });
  post(w[0], w[1], w[3], WD1, WD3); post(w[0] + w[2] - 2, w[1], w[3], WD1, WD3);
  door(x + 8, y + 24, 9, 12, [JD2, JD1], true);
  E(x + 30, y + 28, 5, 5, WD1); E(x + 30, y + 28, 4, 4, LIT); R(x + 26, y + 28, 9, 1, WD1); R(x + 30, y + 24, 1, 9, WD1);
  /* 葫蘆幌子 */
  P(x + 21, y + 22, WD0); R(x + 20, y + 23, 3, 2, GD1); R(x + 19, y + 25, 5, 4, GD1); P(x + 20, y + 25, GOLD); P(x + 21, y + 29, RD1);
  /* 院子：曬藥架、丹爐 */
  fenceH(x + 44, x + 76, y + 3); fenceV(x + 75, y + 6, y + 52);
  for (i = 0; i < 2; i++) { var ry = y + 12 + i * 10; R(x + 48, ry + 3, 24, 1, WD3); post(x + 48, ry - 1, 8, WD2, WD4); post(x + 70, ry - 1, 8, WD1, WD3); tray(x + 54, ry, 4, JD2, JADE); tray(x + 65, ry, 4, i ? '#3a3320' : JD3, i ? GD1 : JD1); }
  /* 青銅丹爐 */
  var cx = x + 59, by = y + 52;
  glow(cx, by - 4, 11, EMB, 0.08); E(cx + 2, by, 8, 2, KK, 0.4);
  R(cx - 6, by - 4, 2, 4, BZ0); R(cx + 5, by - 4, 2, 4, BZ0); R(cx - 1, by - 3, 2, 3, BZ0);
  R(cx - 3, by - 3, 7, 2, RD1); P(cx - 1, by - 3, EMB); P(cx + 1, by - 2, EMH); P(cx + 2, by - 3, EMB);
  E(cx, by - 9, 7, 5, BZ0); E(cx - 1, by - 10, 6, 4, BZ1); E(cx - 2, by - 11, 3, 2, BZ2); P(cx - 4, by - 12, BZ3); R(cx - 7, by - 9, 15, 1, BZ0);
  R(cx - 5, by - 15, 11, 2, BZ2); R(cx - 5, by - 15, 5, 1, BZ3); R(cx - 3, by - 17, 7, 2, BZ1); P(cx, by - 18, BZ3); R(cx - 8, by - 13, 1, 4, BZ1); R(cx + 8, by - 13, 1, 4, BZ0);
  smoke(r, cx, by - 18, 5, 0.4, A4, 0.45);
  tray(x + 10, y + 46, 5, JD2, JADE); tray(x + 24, y + 48, 5, JD3, JD1); jar(x + 34, y + 40, JD3); jar(x + 2, y + 38);
  fenceH(x + 34, x + 50, y + 52);
}
function hySmith(x, y, r) {                   // 石記鐵鋪 86×60
  var i, w;
  /* 敞棚與爐 */
  R(x + 44, y + 22, 40, 20, '#0e0b09'); R(x + 48, y + 44, 38, 2, KK, 0.4);
  glow(x + 62, y + 36, 22, EMB, 0.07);
  R(x + 52, y + 22, 22, 15, '#2a1c15'); for (i = 0; i < 4; i++) R(x + 52, y + 25 + i * 3, 22, 1, '#1a110c'); R(x + 52, y + 22, 22, 1, '#4a3022'); R(x + 52, y + 22, 1, 15, '#3f2a1f');
  R(x + 58, y + 28, 10, 8, KK); R(x + 59, y + 30, 8, 6, RD1); R(x + 60, y + 31, 6, 5, RED); R(x + 61, y + 33, 4, 3, EMB); P(x + 62, y + 34, EMH); P(x + 63, y + 33, EMH); P(x + 60, y + 30, EMB);
  R(x + 76, y + 30, 6, 8, WD2); R(x + 76, y + 30, 6, 2, I3); R(x + 76, y + 30, 6, 1, WD4);                 // 淬火桶
  post(x + 44, y + 22, 22, WD2, WD4); post(x + 82, y + 22, 22, WD1, WD3);
  hip(x + 42, y + 6, 44, 17, 0, 4, PLK, 'plank');
  R(x + 59, y + 2, 8, 12, '#231712'); R(x + 59, y + 2, 3, 12, '#33211a'); R(x + 58, y + 1, 10, 2, '#4a3022'); R(x + 60, y + 1, 6, 1, KK); smoke(r, x + 63, y, 5, 0.8, A2, 0.45);
  /* 屋 */
  w = house(x, y + 2, 46, 22, 14, { ins: 8, rb: 5, pal: CLY, wall: 'st', r: r });
  door(x + 16, y + 27, 10, 11, null, false); win(x + 31, y + 29, 7, 5, true);
  /* 院子 */
  anvil(x + 50, y + 44); glow(x + 55, y + 46, 7, EMB, 0.06);
  wrack(x + 2, y + 42, 28, 6, 'sw');
  E(x + 73, y + 52, 8, 3, '#141312'); E(x + 72, y + 51, 6, 2, '#1f1d1b'); P(x + 70, y + 50, A1); P(x + 75, y + 51, A0); P(x + 68, y + 52, RD2);   // 炭堆
  R(x + 34, y + 47, 9, 5, '#2f3338'); R(x + 34, y + 47, 9, 1, '#59616a'); R(x + 34, y + 52, 9, 1, KK, 0.4);    // 鐵料
  R(x + 36, y + 55, 12, 2, '#3a3f45'); P(x + 36, y + 55, A4);
}
function hyBoard(x, y, r) {                   // 鎮衙・委託板 68×66
  var i, w = house(x + 3, y, 62, 25, 17, { ins: 10, rb: 6, pal: SLT });
  P(x + 12, y + 3, SLT[4]); P(x + 12, y + 4, SLT[3]); P(x + 55, y + 3, SLT[3]); P(x + 55, y + 4, SLT[2]);
  for (i = 0; i < 4; i++) post(w[0] + 1 + rd(i * (w[2] - 4) / 3), w[1], w[3], RD2, RD1);
  R(x + 27, y + 28, 14, 14, WD1); gateDoor(x + 28, y + 29, 12, 13); R(x + 24, y + 42, 20, 2, A1); R(x + 24, y + 42, 20, 1, A3);
  win(x + 10, y + 31, 9, 6, true); win(x + 49, y + 31, 9, 6, false);
  R(x + 29, y + 26, 10, 3, WD0); R(x + 30, y + 27, 8, 1, GD2);
  nboard(x + 3, y + 46, 30, 19, 4);
  R(x + 52, y + 46, 1, 16, WD3); R(x + 50, y + 46, 5, 1, WD4); lantern(x + 55, y + 46, 7); R(x + 51, y + 62, 3, 1, A1);
  jar(x + 40, y + 58);
}
function hyShrine(x, y, r) {                  // 窯神廟 54×56（破敗）
  var i;
  R(x + 8, y + 37, 42, 2, KK, 0.4);
  wallF(x + 6, y + 23, 40, 13, 'pl'); R(x + 6, y + 23, 40, 13, KK, 0.3);
  L(x + 12, y + 25, x + 15, y + 33, KK); L(x + 37, y + 26, x + 35, y + 35, KK); R(x + 30, y + 31, 6, 4, '#2a211a');
  R(x + 19, y + 26, 13, 10, KK); R(x + 20, y + 33, 11, 3, '#17120e'); R(x + 23, y + 29, 5, 5, '#1f1d1b'); R(x + 24, y + 28, 3, 1, '#2a2826');   // 空龕
  post(x + 6, y + 23, 13, RD3, RD2); L(x + 44, y + 23, x + 46, y + 36, RD3); L(x + 45, y + 23, x + 47, y + 36, '#2a100d');
  hip(x + 3, y + 2, 46, 22, 9, 5, CLY, 'tile');
  /* 破瓦：漏洞、露椽、青苔、塌脊 */
  R(x + 28, y + 6, 9, 3, CLY[2]); R(x + 29, y + 5, 6, 2, CLY[1]);
  R(x + 14, y + 11, 8, 6, '#0b0908'); R(x + 13, y + 13, 2, 3, '#0b0908'); L(x + 15, y + 11, x + 15, y + 16, WD1); L(x + 19, y + 11, x + 19, y + 16, WD1);
  R(x + 31, y + 14, 6, 5, '#0b0908'); P(x + 33, y + 14, WD1); P(x + 33, y + 16, WD1); P(x + 36, y + 13, '#0b0908');
  Dz(x + 22, y + 17, 8, 4, JD3, 2); Dz(x + 6, y + 14, 6, 6, JD3, 1); P(x + 25, y + 18, JD2); P(x + 40, y + 20, JD3); P(x + 41, y + 21, JD2);
  L(x + 3, y + 22, x + 10, y + 24, CLY[1]); R(x + 38, y + 23, 5, 2, CLY[2]); R(x + 44, y + 38, 4, 2, CLY[2]); R(x + 47, y + 41, 3, 1, CLY[3]); P(x + 41, y + 40, CLY[3]);
  /* 裂階、冷香爐、倒像 */
  R(x + 15, y + 36, 21, 2, A1); R(x + 15, y + 36, 9, 1, A2); R(x + 26, y + 37, 2, 1, KK);
  E(x + 12, y + 49, 6, 2, KK, 0.4); R(x + 7, y + 46, 2, 4, BZ0); R(x + 14, y + 46, 2, 4, BZ0); E(x + 11, y + 44, 6, 3, BZ0); E(x + 11, y + 43, 5, 2, BZ1); R(x + 7, y + 42, 9, 1, A1); R(x + 8, y + 41, 7, 1, A2); P(x + 5, y + 42, BZ1); P(x + 17, y + 42, BZ0);
  R(x + 11, y + 37, 1, 4, PA3); P(x + 9, y + 39, PA3); P(x + 13, y + 38, PA3);          // 殘香
  R(x + 31, y + 49, 12, 1, KK, 0.4); R(x + 30, y + 43, 11, 6, '#2b2a28'); R(x + 30, y + 43, 11, 2, '#47443f'); R(x + 30, y + 43, 1, 6, '#55524c'); R(x + 38, y + 45, 3, 4, '#1c1b1a');   // 空像座
  R(x + 33, y + 40, 2, 3, '#3d3a36'); R(x + 37, y + 41, 2, 2, '#343230'); P(x + 33, y + 40, '#5c5852');                                                                  // 斷足
  R(x + 33, y + 55, 19, 1, KK, 0.4);
  R(x + 34, y + 50, 13, 5, '#3a3835'); R(x + 34, y + 50, 13, 1, '#5c5852'); R(x + 34, y + 54, 13, 1, '#1f1e1d'); R(x + 37, y + 51, 1, 3, '#262524'); R(x + 41, y + 51, 1, 3, '#262524'); R(x + 44, y + 52, 3, 1, '#262524');   // 倒臥的像身
  R(x + 48, y + 50, 4, 4, '#45423e'); R(x + 48, y + 50, 4, 1, '#66625b'); R(x + 49, y + 49, 2, 1, '#55524c'); P(x + 50, y + 52, KK); P(x + 47, y + 52, '#1f1e1d'); P(x + 30, y + 52, '#343230'); P(x + 28, y + 54, '#2b2a28');   // 滾落的頭
  tuft(x + 4, y + 40, JD3, JD2); tuft(x + 22, y + 53, JD3, '#24281c'); tuft(x + 47, y + 46, JD3, JD2); tuft(x + 28, y + 45, '#24281c', JD3);
}
function planHuiyao() {
  var r = rng(301), i, x, y, B = {}, DIRT = '#27231d';
  R(0, 0, W, H, '#1b1815');
  /* 北坡窯場（柵外） */
  R(0, 0, W, 25, '#131211'); mottle(r, 0, 0, W, 24, ['#0e0d0c', '#191715'], 50);
  heap(r, 44, 19, 40, 8, ['#0e0d0c', '#161514', '#201e1c']); heap(r, 352, 20, 42, 8, ['#0e0d0c', '#161514', '#201e1c']); heap(r, 186, 20, 16, 4, ['#100f0e', '#1a1816', '#24211e']);
  /* 街與廣場 */
  var ED = '#211e19';
  trail(r, [[199, 262], [199, 168]], 34, DIRT, ED); blob(r, 199, 146, 96, 37, ED); blob(r, 199, 146, 92, 34, DIRT);
  trail(r, [[8, 112], [392, 116]], 13, DIRT, ED); trail(r, [[130, 112], [128, 36]], 11, DIRT, ED); trail(r, [[246, 116], [242, 36]], 11, DIRT, ED);
  trail(r, [[120, 170], [112, 252]], 13, DIRT, ED); trail(r, [[272, 168], [300, 222], [386, 226]], 13, DIRT, ED); trail(r, [[70, 180], [118, 182]], 10, DIRT, ED);
  mottle(r, 8, 30, W - 16, H - 40, ['#161411', '#211e19', '#2c2822', '#1d1a16'], 420, 0.6);
  ruts(r, [[193, 258], [195, 190], [186, 150]], 3, '#191613'); ruts(r, [[60, 114], [330, 117]], 3, '#191613');
  /* 廣場：井周一圈舊石板、零散鋪石 */
  for (i = 0; i < 20; i++) { var an = i * PI / 10 + 0.1; x = 199 + rd(cos(an) * 26) - 3; y = 147 + rd(sin(an) * 13) - 1; R(x, y, 7, 3, '#2d2a26'); R(x, y, 7, 1, '#3a3631'); R(x + 1, y + 3, 7, 1, '#151310'); }
  for (i = 0; i < 28; i++) { var an2 = i * PI / 14 + 0.3; if (i % 5 === 3) continue; x = 199 + rd(cos(an2) * 38) - 3; y = 147 + rd(sin(an2) * 19) - 1; R(x, y, 6, 3, '#292622'); R(x, y, 6, 1, '#33302b'); R(x + 1, y + 3, 6, 1, '#151310'); }
  for (i = 0; i < 30; i++) { x = 120 + fl(r() * 160); y = 118 + fl(r() * 60); if (abs(x - 199) < 46 && abs(y - 147) < 24) continue; R(x, y, 5, 2, '#2a2723'); R(x, y, 5, 1, '#33302b'); R(x + 1, y + 2, 5, 1, '#151310'); }
  for (i = 0; i < 60; i++) P(12 + fl(r() * 374), 36 + fl(r() * 210), r() < 0.5 ? '#35312a' : '#12100e');
  kilnO(r, 132, 13, 10, 7, true); kilnO(r, 246, 12, 11, 8, true); kilnO(r, 296, 14, 8, 6, false);
  R(108, 18, 8, 3, '#3a211a'); R(108, 18, 8, 1, '#55301f'); R(262, 19, 9, 3, '#3a211a'); R(262, 19, 9, 1, '#55301f');
  palH(4, 394, 24, 9); palV(4, 30, 250); palV(390, 30, 250);
  /* 上排 */
  deadTree(r, 122, 62, 18);
  hyMarket(18, 46, r); box(B, 'hy_market', 18, 46, 82, 58);
  hyBoard(156, 44, r); box(B, 'hy_board', 156, 44, 68, 66);
  hyInn(262, 40, r); box(B, 'hy_inn', 262, 40, 94, 72);
  tree(r, 374, 70, 8); barrel(364, 96, 7, 9); crate(372, 99, 8, 8);
  jar(232, 66); jar(238, 68, '#3a2b20'); jar(234, 72); R(140, 62, 10, 3, '#3a211a'); R(140, 62, 10, 1, '#55301f'); R(142, 59, 7, 3, '#3a211a'); R(142, 59, 7, 1, '#55301f');
  /* 中段 */
  hyShrine(12, 118, r); box(B, 'hy_shrine', 12, 118, 54, 56);
  well(199, 142);
  hySmith(288, 150, r); box(B, 'hy_smith', 288, 150, 86, 60);
  cart(92, 136, 'ore');
  deadTree(r, 262, 196, 16);
  for (i = 0; i < 3; i++) { R(270 + (i % 2), 182 - i * 3, 13, 3, WD2); R(270 + (i % 2), 182 - i * 3, 13, 1, WD4); P(270 + (i % 2), 183 - i * 3, WD5); } R(272, 185, 13, 1, KK, 0.4);
  R(110, 76, 1, 16, WD3); R(108, 76, 5, 1, WD4); lantern(113, 76, 7); R(246, 122, 1, 16, WD3); R(244, 122, 5, 1, WD4); lantern(249, 122, 7);
  fenceH(72, 112, 176); bush(78, 150, 5); bush(378, 126, 5); tuft(20, 184, JD3, '#24281c'); tuft(150, 232, JD3, '#24281c'); tuft(376, 150, JD3, '#24281c'); tuft(232, 44, JD3, '#24281c');
  /* 下排 */
  hyApoth(28, 190, r); box(B, 'hy_apoth', 28, 190, 76, 56);
  kilnO(r, 346, 232, 13, 9, true); heap(r, 318, 240, 12, 4, ['#100f0e', '#1a1816', '#262320']); heap(r, 376, 240, 9, 4, ['#100f0e', '#1a1816', '#262320']);
  R(300, 232, 10, 4, '#3a211a'); R(300, 232, 10, 1, '#55301f'); for (i = 0; i < 4; i++) P(302 + i * 2, 234, '#24140f'); R(301, 236, 10, 1, KK, 0.4);
  tree(r, 130, 240, 7); crate(240, 236, 8, 8); barrel(250, 234, 7, 10);
  /* 南柵與鎮口 */
  palH(4, 174, 249, 9); palH(224, 394, 249, 9);
  R(172, 222, 5, 36, WD1); R(172, 222, 2, 36, WD3); R(222, 222, 5, 36, WD1); R(222, 222, 2, 36, WD3); R(170, 256, 9, 2, A1); R(220, 256, 9, 2, A1);
  R(170, 218, 59, 4, WD2); R(170, 218, 59, 1, WD4); R(170, 222, 59, 1, KK, 0.6); R(168, 216, 4, 3, WD3); R(227, 216, 4, 3, WD2);
  T(232, 256, 177, 181, 177, 186, WD2); T(232, 256, 218, 222, 213, 222, WD1); R(177, 232, 1, 24, WD4);
  lantern(184, 222, 7); lantern(214, 222, 7);
  box(B, 'gate', 170, 216, 59, 44);
  mist(r, 100, 5, A2, 0.05); mist(r, 206, 5, A2, 0.05);
  fin();
  BLD.plan_huiyao = B;
  SPOTS.plan_huiyao = [[260, 264], [350, 330], [500, 300], [470, 396], [270, 400], [530, 262]];
}

/* ==================== 二、渡陰關 ==================== */
function cliff(r, side, y0, y1, w0, w1, pal) {  // 兩側山崖（俯視的岩體）
  var y, t, w, x, k = 0, ph = r() * 6;
  for (y = y0; y < y1; y++) {
    t = (y - y0) / (y1 - y0); w = rd(w0 + (w1 - w0) * t + sin(y / 9 + ph) * 4 + sin(y / 3.1 + ph) * 1.5);
    if (w <= 0) continue; x = side ? W - w : 0;
    R(x, y, w, 1, pal[1]);
    if (side) { R(x, y, 2, 1, pal[2]); R(x + 2, y, min(6, w - 2), 1, pal[2], 0.4); R(x + rd(w * 0.5), y, w - rd(w * 0.5), 1, pal[0]); }
    else { R(w - 3, y, 3, 1, pal[0]); R(0, y, rd(w * 0.4), 1, pal[0]); if ((y + (w & 1)) % 7 < 3) R(rd(w * 0.4), y, rd(w * 0.25), 1, pal[2]); }
  }
  for (k = 0; k < 10; k++) { y = y0 + fl(r() * (y1 - y0)); t = (y - y0) / (y1 - y0); w = w0 + (w1 - w0) * t; if (w < 8) continue; x = side ? W - fl(r() * w * 0.8) : fl(r() * w * 0.8); L(x, y, x + (side ? 3 : -3), y + 5 + fl(r() * 6), pal[0]); }
}
function dyTower(x, y, r) {                   // 關樓 94×70
  var i, cx = x + 47;
  /* 甕臺 */
  R(x + 6, y + 68, 86, 3, KK, 0.45);
  stone(x + 4, y + 34, 86, 34, r, ['#15161a', '#23252b', '#30333a'], 5, 10); R(x + 62, y + 34, 28, 34, KK, 0.22); R(x + 4, y + 34, 1, 34, '#3a3e46');
  R(x + 4, y + 26, 86, 8, '#2a2d33'); R(x + 4, y + 26, 86, 1, '#40444d');
  for (i = x + 4; i < x + 90; i += 8) { R(i, y + 30, 5, 5, '#2b2e35'); R(i, y + 30, 5, 1, '#454a53'); R(i, y + 35, 5, 1, '#111215'); }
  /* 拱門與重門 */
  E(cx, y + 50, 15, 13, '#3a3d44'); R(cx - 15, y + 50, 31, 18, '#3a3d44'); E(cx, y + 50, 13, 11, '#1b1c20'); R(cx - 13, y + 50, 27, 18, '#1b1c20');
  E(cx, y + 51, 11, 9, WD1); gateDoor(cx - 11, y + 51, 23, 17); for (i = -9; i <= 9; i += 3) R(cx + i, y + 44, 1, 7, WD0);
  R(cx - 11, y + 43, 23, 1, KK, 0.5); R(cx - 12, y + 66, 25, 2, KK, 0.35);
  R(cx - 9, y + 36, 19, 5, WD0); R(cx - 8, y + 37, 17, 3, RD2); for (i = 0; i < 3; i++) R(cx - 6 + i * 5, y + 37, 3, 3, GD2);
  /* 城樓 */
  R(x + 14, y + 20, 66, 9, RD3); for (i = 0; i < 7; i++) post(x + 14 + i * 10 + (i === 6 ? 4 : 0), y + 20, 9, RD2, RD1);
  win(x + 20, y + 22, 6, 5, true); win(x + 30, y + 22, 6, 5, true); win(x + 58, y + 22, 6, 5, true); win(x + 68, y + 22, 6, 5, false); R(x + 40, y + 21, 14, 8, KK); R(x + 41, y + 22, 12, 7, '#2a1d10'); R(x + 46, y + 22, 1, 7, KK);
  R(x + 14, y + 20, 66, 2, KK, 0.5);
  hip(x + 8, y, 78, 21, 16, 6, SLT, 'tile');
  P(x + 23, y + 3, SLT[4]); P(x + 23, y + 4, SLT[4]); P(x + 71, y + 3, SLT[3]); P(x + 71, y + 4, SLT[3]);
  brazier(x + 9, y + 32); brazier(x + 85, y + 32);
  R(x + 12, y + 40, 6, 12, RD2); R(x + 12, y + 40, 6, 1, RD1); R(x + 12, y + 40, 1, 12, RD1); P(x + 14, y + 44, GD1); P(x + 15, y + 46, GD1);
  R(x + 76, y + 40, 6, 12, RD2); R(x + 76, y + 40, 6, 1, RD1); R(x + 76, y + 40, 1, 12, RD1); P(x + 78, y + 44, GD1); P(x + 79, y + 46, GD1);
}
function wagon(x, y) {                        // 滿載篷車
  cart(x, y, null);
  R(x + 1, y - 7, 21, 8, '#3b3529'); R(x + 1, y - 7, 21, 2, '#5c5443'); R(x + 15, y - 5, 7, 6, '#2c271f'); L(x + 1, y - 2, x + 21, y - 4, '#211d17'); L(x + 6, y - 7, x + 6, y, '#211d17'); P(x + 2, y - 7, '#6a614d');
  crate(x + 3, y - 12, 8, 6);
}
function dyMarket(x, y, r) {                  // 天星關市 92×66
  var i, w;
  w = house(x, y, 74, 26, 20, { ins: 11, rb: 6, pal: SLT, wall: 'pl' });
  stone(w[0], w[1] + 12, w[2], 8, r, ['#1a1a1b', '#2a2a2b', '#39383a'], 4, 7); R(w[0] + 46, w[1] + 12, w[2] - 46, 8, KK, 0.25);
  for (i = 0; i < 5; i++) post(w[0] + rd(i * (w[2] - 2) / 4), w[1], 12, WD1, WD3);
  R(x + 27, y + 29, 20, 17, WD1); R(x + 28, y + 30, 18, 16, '#2a1d10'); R(x + 29, y + 38, 16, 8, LIT, 0.5); R(x + 28, y + 30, 18, 5, I3); R(x + 28, y + 30, 18, 1, I4); R(x + 36, y + 31, 1, 4, KK); R(x + 26, y + 46, 22, 1, A3);
  win(x + 8, y + 31, 11, 6, true); win(x + 56, y + 31, 11, 6, true);
  S(x + 34, y + 27, ['.#.', '###', '.#.'], { '#': GOLD });
  banner(x + 78, y + 2, 50, ['#141b22', '#1f2a35', '#2f3f4e'], STAR, GOLD);
  crate(x + 2, y + 48, 10, 9); crate(x + 13, y + 50, 9, 8); crate(x + 6, y + 42, 9, 7); barrel(x + 23, y + 50, 7, 10);
  wagon(x + 38, y + 52); sack(x + 74, y + 56, 8, 7); sack(x + 82, y + 58, 7, 6);
}
function dyInn(x, y, r) {                     // 關下酒肆 88×64
  var i, w;
  w = house(x + 18, y, 58, 24, 18, { ins: 9, rb: 5, pal: CLY, wall: 'wd' });
  post(w[0], w[1], w[3], WD1, WD4); post(w[0] + w[2] - 2, w[1], w[3], WD0, WD3);
  T(y + 44, y + 58, x + 36, x + 54, x + 30, x + 60, LIT, 0.16);                         // 門內燈光灑地
  door(x + 38, y + 27, 14, 15, [RD2, RD1], true); R(x + 36, y + 42, 18, 2, A1); R(x + 36, y + 42, 18, 1, A3);
  win(x + 24, y + 29, 9, 6, true); win(x + 58, y + 29, 9, 6, true);
  lantern(x + 34, y + 25, 7); lantern(x + 56, y + 25, 7);
  /* 酒罈堆 */
  wjar(x, y + 44); wjar(x + 8, y + 44); wjar(x + 16, y + 45); wjar(x + 4, y + 36); wjar(x + 12, y + 37); wjar(x + 8, y + 29);
  wjar(x + 2, y + 53); wjar(x + 11, y + 54);
  /* 酒旗 */
  pole(x + 80, y + 2, 56); R(x + 74, y + 4, 7, 1, WD4);
  R(x + 74, y + 5, 6, 20, PA2); R(x + 74, y + 5, 1, 20, PA1); R(x + 79, y + 5, 1, 20, PA3); R(x + 74, y + 5, 6, 1, PA1); T(y + 25, y + 28, x + 74, x + 80, x + 76, x + 78, PA2);
  E(x + 77, y + 12, 2, 2, RD1); P(x + 77, y + 12, RED); R(x + 76, y + 18, 3, 1, RD2); R(x + 77, y + 17, 1, 4, RD2);
  table(x + 58, y + 50, 14, 5); bench(x + 57, y + 59, 16); jar(x + 62, y + 46, '#3a2b20'); P(x + 68, y + 49, PA1);
  bench(x + 22, y + 48, 10);
}
function dySmith(x, y, r) {                   // 軍械坊 88×66
  var i, w;
  R(x + 40, y + 22, 44, 22, '#0e0b09'); R(x + 44, y + 46, 42, 2, KK, 0.4);
  glow(x + 62, y + 38, 22, EMB, 0.07);
  stone(x + 50, y + 22, 26, 17, r, ['#1a1716', '#2c2623', '#3d3531'], 3, 6); R(x + 50, y + 22, 26, 1, '#4d443e');
  E(x + 63, y + 33, 6, 5, KK); R(x + 57, y + 33, 13, 6, KK); R(x + 59, y + 32, 9, 7, RD1); R(x + 60, y + 33, 7, 6, RED); R(x + 61, y + 35, 5, 4, EMB); P(x + 63, y + 36, EMH); P(x + 62, y + 37, EMH); P(x + 64, y + 34, EMB);
  post(x + 40, y + 22, 24, WD2, WD4); post(x + 84, y + 22, 24, WD1, WD3);
  hip(x + 38, y + 4, 50, 19, 0, 4, SLT, 'tile');
  R(x + 60, y - 2, 8, 12, '#1f2024'); R(x + 60, y - 2, 3, 12, '#2c2e34'); R(x + 59, y - 3, 10, 2, '#3a3d44'); R(x + 61, y - 3, 6, 1, KK); smoke(r, x + 64, y - 4, 5, 0.8, A2, 0.5);
  w = house(x, y, 42, 24, 16, { ins: 8, rb: 5, pal: SLT, wall: 'st', r: r });
  door(x + 15, y + 27, 11, 13, null, false); R(x + 20, y + 27, 1, 13, WD1);
  shield(x + 8, y + 31); shield(x + 34, y + 31);
  /* 槍架、盾架、磨石 */
  wrack(x + 2, y + 46, 30, 7, 'sp');
  R(x + 36, y + 58, 20, 1, WD3); post(x + 36, y + 52, 10, WD2, WD4); post(x + 54, y + 52, 10, WD1, WD3); shield(x + 41, y + 55); shield(x + 48, y + 55); shield(x + 44, y + 60);
  E(x + 70, y + 54, 5, 5, A0); E(x + 70, y + 54, 4, 4, A2); E(x + 69, y + 53, 2, 2, A3); P(x + 70, y + 54, KK); R(x + 64, y + 58, 13, 2, WD2); R(x + 64, y + 58, 13, 1, WD4); R(x + 65, y + 60, 1, 3, WD1); R(x + 75, y + 60, 1, 3, WD1); R(x + 66, y + 63, 12, 1, KK, 0.4);
  anvil(x + 78, y + 46);
  barrel(x + 60, y + 44, 6, 8);
}
function dyApoth(x, y, r) {                   // 藥攤 58×48：大油紙傘
  var i, cx = x + 29, cy = y + 13, a;
  E(cx + 4, y + 41, 24, 6, KK, 0.35);
  R(cx, cy, 1, 28, WD4); R(cx + 1, cy, 1, 28, WD1);
  /* 攤桌與藥罐 */
  table(x + 8, y + 28, 34, 6);
  for (i = 0; i < 6; i++) { R(x + 10 + i * 5, y + 25, 3, 4, [JD2, '#3a2b20', RD2, JD1, '#2c2622', GD2][i]); P(x + 10 + i * 5, y + 25, [JADE, WD5, RD1, JADE, A3, GD1][i]); R(x + 10 + i * 5, y + 24, 3, 1, PA2); }
  tray(x + 48, y + 36, 5, JD2, JADE); tray(x + 46, y + 43, 4, JD3, JD1); sack(x + 2, y + 38, 8, 7); jar(x + 12, y + 41, JD3); jar(x + 19, y + 42);
  R(x + 28, y + 41, 6, 4, BZ1); R(x + 28, y + 41, 6, 1, BZ3); P(x + 30, y + 45, EMB); P(x + 32, y + 45, RD1); smoke(r, x + 31, y + 40, 3, 0.3, A4, 0.35);
  /* 傘面 */
  E(cx, cy + 1, 27, 13, '#33260f'); E(cx, cy, 27, 13, '#5a4520'); E(cx - 3, cy - 2, 21, 9, '#6e5628'); E(cx - 7, cy - 4, 12, 5, '#836a34', 1, 2);
  for (i = 0; i < 12; i++) { a = i * PI / 6 + 0.26; L(cx, cy - 1, cx + cos(a) * 26, cy + sin(a) * 12.5, sin(a) > 0.2 || cos(a) > 0.5 ? '#33260f' : '#463518'); }
  T(cy + 1, cy + 13, cx + 2, cx + 6, cx + 8, cx + 22, KK, 0.18);
  E(cx, cy - 1, 2, 1, WD1); P(cx, cy - 2, GD1);
  for (i = 0; i < 5; i++) { a = x + 10 + i * 9; R(a, cy + 10 + (i === 2 ? 3 : i % 2 ? 2 : 0), 1, 2, WD0); R(a - 1, cy + 12 + (i === 2 ? 3 : i % 2 ? 2 : 0), 3, 3, i % 2 ? JD1 : JD2); }
}
function dyBoard(x, y, r) {                   // 破曉募兵處 90×68
  var i;
  banner(x + 2, y, 46, [RD3, RD2, RD1], SUN, GOLD);
  /* 棚帳與桌 */
  R(x + 22, y + 26, 44, 18, '#0f0d0b'); R(x + 24, y + 46, 46, 2, KK, 0.4);
  table(x + 28, y + 33, 30, 6); paper(x + 31, y + 33, 7, 5, false); paper(x + 41, y + 34, 6, 4, true); R(x + 51, y + 33, 3, 3, '#2c2622'); P(x + 52, y + 31, PA1); P(x + 52, y + 32, PA2);
  post(x + 22, y + 26, 20, WD2, WD4); post(x + 64, y + 26, 20, WD1, WD3);
  hip(x + 18, y + 6, 52, 21, 12, 5, ['#1f1a10', '#33290f', '#4a3b1a', '#5e4d24', '#7a6634'], 'cloth');
  for (i = x + 20; i < x + 68; i += 4) { R(i, y + 27, 2, 2, RD2); P(i, y + 27, RD1); }
  P(x + 44, y + 9, GOLD); R(x + 43, y + 4, 1, 5, WD4); R(x + 44, y + 4, 4, 3, RD1); R(x + 44, y + 4, 4, 1, RED);
  nboard(x + 66, y + 22, 23, 22, 3);
  wrack(x + 60, y + 50, 28, 6, 'sp');
  crate(x + 8, y + 54, 10, 9); shield(x + 24, y + 58); shield(x + 31, y + 60); brazier(x + 46, y + 64);
}
function planDuyin() {
  var r = rng(302), i, x, y, B = {};
  /* 關外：夜色下的山口 */
  R(0, 0, W, 30, '#0b0c0f'); mottle(r, 0, 0, W, 24, ['#0e1014', '#111419'], 40);
  for (i = 0; i < 6; i++) { x = 110 + i * 36 + fl(r() * 10); T(8 + fl(r() * 6), 23, x, x + 2, x - 14, x + 18, '#101319'); }
  /* 關內鋪石 */
  stone(0, 62, W, H - 62, r, ['#15161a', '#1b1c20', '#212327'], 7, 13);
  stone(176, 62, 46, H - 62, r, ['#161514', '#201f1d', '#2a2825'], 9, 15); R(175, 62, 1, H - 62, '#111113'); R(222, 62, 1, H - 62, '#111113');
  mottle(r, 0, 70, W, H - 70, ['#101114', '#1e2024', '#191a1d'], 260, 0.55);
  blob(r, 199, 136, 46, 14, '#201f1d', 0.5);
  /* 關牆：走道、垛口、牆面 */
  R(0, 20, W, 3, '#2c2f36'); R(0, 20, W, 1, '#3d414a'); R(0, 23, W, 11, '#24262b');
  for (x = 3; x < W; x += 13) R(x, 24, 1, 9, '#1b1c20'); R(0, 28, W, 1, '#1b1c20', 0.6);
  stone(0, 38, W, 28, r, ['#131417', '#1d1f24', '#272a30'], 5, 11); R(0, 52, W, 14, KK, 0.2); R(0, 60, W, 6, KK, 0.2);
  for (x = 1; x < W; x += 8) { R(x, 33, 5, 5, '#2b2e35'); R(x, 33, 5, 1, '#454a53'); R(x, 33, 1, 5, '#363a42'); R(x, 38, 5, 1, '#0e0f11'); }
  R(0, 66, W, 4, KK, 0.45); Dz(0, 70, W, 2, KK, 2, 0.4);
  /* 登城馬道 */
  for (i = 0; i < 9; i++) { R(70 + i * 3, 40 + i * 3, 16, 3, '#2a2d33'); R(70 + i * 3, 40 + i * 3, 16, 1, '#3d414a'); } T(42, 66, 86, 88, 110, 114, KK, 0.35);
  for (i = 0; i < 4; i++) { x = [50, 124, 276, 330][i]; R(x, 40, 6, 14, RD2); R(x, 40, 6, 1, RD1); R(x, 40, 1, 14, RD1); R(x + 5, 40, 1, 14, RD3); P(x + 2, 45, GD1); P(x + 3, 47, GD1); P(x + 1, 54, RD2); P(x + 4, 54, RD3); }
  brazier(112, 32); brazier(286, 32);
  dyTower(152, 12, r); box(B, 'dy_tower', 152, 12, 94, 70);
  cliff(r, 0, 0, 150, 44, 4, ['#0b0b0d', '#131316', '#1f2025']); cliff(r, 1, 0, 160, 46, 4, ['#0b0b0d', '#131316', '#1f2025']);
  /* 中軸與廣場 */
  brazier(170, 98); brazier(228, 98);
  dyMarket(20, 86, r); box(B, 'dy_market', 20, 86, 92, 66);
  dyInn(288, 86, r); box(B, 'dy_inn', 288, 86, 88, 64);
  /* 下段 */
  dySmith(18, 180, r); box(B, 'dy_smith', 18, 180, 88, 66);
  dyApoth(228, 154, r); box(B, 'dy_apoth', 228, 154, 58, 48);
  dyBoard(296, 178, r); box(B, 'dy_board', 296, 178, 90, 68);
  wagon(118, 196); horse(150, 198, { a: '#3a3a3c', b: '#2c2c2e', c: '#151516', h: '#474749' });
  /* 廣場中的旗臺與拒馬 */
  R(194, 150, 11, 5, '#2a2c31'); R(194, 150, 11, 1, '#454a53'); R(194, 155, 11, 3, '#1b1c20'); R(196, 158, 11, 1, KK, 0.4); R(199, 118, 1, 33, WD4); R(200, 119, 1, 32, WD1); P(199, 117, GOLD);
  R(200, 120, 13, 9, RD2); R(200, 120, 13, 1, RD1); R(200, 120, 1, 9, RD1); T(129, 132, 200, 213, 200, 206, RD2); S(203, 122, ['#.#.#', '.###.', '#####'], { '#': GD1 });
  for (i = 0; i < 2; i++) { x = 124 + i * 132; L(x, 86, x + 16, 86, WD3); L(x, 87, x + 16, 87, WD0); for (y = 0; y < 3; y++) { L(x + 2 + y * 6, 82, x + 5 + y * 6, 91, WD2); L(x + 5 + y * 6, 82, x + 2 + y * 6, 91, WD1); P(x + 2 + y * 6, 81, A3); P(x + 5 + y * 6, 81, A3); } R(x + 2, 92, 16, 1, KK, 0.4); }
  crate(120, 232, 9, 9); crate(130, 234, 8, 8); barrel(112, 232, 7, 10);
  /* 南牆與南門 */
  stone(0, 248, 172, 12, r, ['#131417', '#1d1f24', '#272a30'], 4, 9); stone(226, 248, 172, 12, r, ['#131417', '#1d1f24', '#272a30'], 4, 9);
  R(0, 246, 172, 3, '#2a2d33'); R(0, 246, 172, 1, '#40444d'); R(226, 246, 172, 3, '#2a2d33'); R(226, 246, 172, 1, '#40444d');
  stone(168, 230, 10, 30, r, ['#15161a', '#23252b', '#30333a'], 4, 5); stone(220, 230, 10, 30, r, ['#15161a', '#23252b', '#30333a'], 4, 5);
  R(167, 228, 12, 3, '#30333a'); R(167, 228, 12, 1, '#454a53'); R(219, 228, 12, 3, '#30333a'); R(219, 228, 12, 1, '#454a53'); R(178, 232, 3, 28, KK, 0.35); R(230, 232, 3, 28, KK, 0.35);
  T(236, 258, 178, 181, 178, 187, WD2); T(236, 258, 217, 220, 211, 220, WD1); R(178, 236, 1, 22, WD4); for (i = 240; i < 258; i += 6) { R(178, i, 5, 1, A0); R(214, i, 6, 1, A0); }
  R(170, 238, 5, 10, RD2); R(170, 238, 5, 1, RD1); R(170, 238, 1, 10, RD1); P(172, 242, GD1); R(222, 238, 5, 10, RD2); R(222, 238, 5, 1, RD1); R(222, 238, 1, 10, RD1); P(224, 242, GD1);
  brazier(173, 228); brazier(225, 228);
  box(B, 'gate', 167, 216, 64, 44);
  mist(r, 76, 5, I3, 0.06); mist(r, 168, 4, I3, 0.05);
  fin(0.3);
  BLD.plan_duyin = B;
  SPOTS.plan_duyin = [[398, 214], [270, 250], [520, 244], [300, 350], [398, 372], [290, 456], [520, 464]];
}

/* ==================== 三、破曉營 ==================== */
function tentS(x, y, w, h, pal) {             // 小營帳：四坡落地、前開口
  var cx = x + fl(w / 2), rb = fl(h * 0.28);
  R(x + 3, y + h, w - 1, 2, KK, 0.4);
  hip(x, y, w, h, fl(w * 0.34), rb, pal, 'cloth', 3);
  T(y + h - 7, y + h - 1, cx, cx + 1, cx - 3, cx + 4, '#080706'); L(cx - 1, y + h - 7, cx - 4, y + h - 1, pal[4]); L(cx + 1, y + h - 7, cx + 4, y + h - 1, pal[0]);
  R(cx, y + rb - 3, 1, 3, WD4); P(x - 2, y + h, WD4); P(x + w + 1, y + h, WD3);
}
function woodGate(x, y, w) {                  // 柵門：兩高柱、橫梁、內開門扇
  R(x + 2, y + 6, 5, 38, WD1); R(x + 2, y + 6, 2, 38, WD3); R(x + w - 7, y + 6, 5, 38, WD1); R(x + w - 7, y + 6, 2, 38, WD3);
  R(x, y + 40, 9, 2, A1); R(x + w - 9, y + 40, 9, 2, A1);
  R(x, y + 2, w, 4, WD2); R(x, y + 2, w, 1, WD4); R(x, y + 6, w, 1, KK, 0.6); R(x - 2, y, 4, 3, WD3); R(x + w - 2, y, 4, 3, WD2);
  T(y + 16, y + 40, x + 7, x + 11, x + 7, x + 16, WD2); T(y + 16, y + 40, x + w - 11, x + w - 7, x + w - 16, x + w - 7, WD1); R(x + 7, y + 16, 1, 24, WD4);
  for (var j = y + 20; j < y + 40; j += 7) { R(x + 7, j, 7, 1, WD0); R(x + w - 14, j, 7, 1, WD0); }
}
function watchtower(x, y) {                   // 望樓 20×46
  E(x + 16, y + 46, 12, 3, KK, 0.35);
  L(x + 2, y + 45, x + 5, y + 16, WD2); L(x + 17, y + 45, x + 14, y + 16, WD1); L(x + 3, y + 45, x + 6, y + 16, WD3);
  L(x + 3, y + 40, x + 16, y + 28, WD1); L(x + 16, y + 40, x + 4, y + 28, WD2); R(x + 3, y + 34, 14, 1, WD2);
  for (var j = y + 20; j < y + 45; j += 4) R(x + 18, j, 4, 1, WD3); R(x + 18, y + 18, 1, 28, WD2); R(x + 22, y + 18, 1, 28, WD1);
  R(x + 2, y + 9, 16, 4, '#0b0908'); R(x + 1, y + 13, 18, 5, WD2); R(x + 1, y + 13, 18, 1, WD4); for (j = x + 3; j < x + 19; j += 3) R(j, y + 14, 1, 4, WD1);
  post(x + 2, y + 8, 6, WD1, WD3); post(x + 16, y + 8, 6, WD0, WD2);
  hip(x - 1, y, 22, 9, 7, 3, THA, 'thatch');
}
var DUMMY = ['...sss...', '...sst...', '...sst...', 'wwwwwwwww', '..ssstt..', '..ssstt..', '..rrrrr..', '..ssstt..', '..ssstt..', '...swt...', '....w....', '....w....', '....w....', '...www...'];
function dummy(x, y) { R(x + 3, y + 14, 8, 1, KK, 0.4); S(x, y, DUMMY, { s: THA[4], t: THA[2], w: WD3, r: RD1 }); P(x + 3, y + 3, WD5); }
function drum(x, y) {                         // 戰鼓＋鼓架
  E(x + 8, y + 15, 8, 2, KK, 0.4);
  L(x, y + 15, x + 3, y + 8, WD2); L(x + 13, y + 15, x + 10, y + 8, WD1); R(x + 1, y + 12, 12, 1, WD2);
  R(x, y + 3, 14, 8, RD1); R(x, y + 3, 3, 8, RED); R(x + 10, y + 3, 4, 8, RD2); E(x + 7, y + 11, 7, 2, RD2);
  for (var i = 1; i < 14; i += 3) { P(x + i, y + 6, GD1); P(x + i, y + 11, GD2); }
  E(x + 7, y + 3, 7, 3, PA2); E(x + 6, y + 2, 5, 2, PA1); E(x + 7, y + 3, 7, 3, PA3, 0); P(x + 5, y + 2, PAR);
  L(x + 15, y + 1, x + 19, y + 5, WD4); P(x + 15, y + 1, RD1);
}
function cot(x, y) { R(x + 1, y + 6, 14, 1, KK, 0.4); R(x, y, 14, 5, '#6a6455'); R(x, y, 14, 1, '#8a826f'); R(x, y, 4, 4, '#8f8672'); R(x + 5, y + 1, 9, 4, '#3a3229'); R(x + 5, y + 1, 9, 1, '#4a4136'); R(x, y + 5, 14, 1, WD1); }
function cookfire(r, x, y) {                  // 三腳鍋
  fire(x, y, 1); L(x - 5, y + 1, x, y - 11, WD3); L(x + 5, y + 1, x, y - 11, WD1); R(x - 2, y - 7, 5, 3, '#1c1b1a'); R(x - 2, y - 7, 5, 1, A2); smoke(r, x, y - 10, 3, 0.4, A3, 0.35);
}
function pxQuarter(x, y, r) {                 // 軍需帳 90×66
  var i;
  R(x + 6, y + 43, 64, 2, KK, 0.4);
  R(x + 4, y + 30, 62, 12, CNV[2]); for (i = x + 9; i < x + 66; i += 6) R(i, y + 30, 1, 12, CNV[1]); R(x + 46, y + 30, 20, 12, KK, 0.25); R(x + 4, y + 30, 62, 2, KK, 0.5); R(x + 4, y + 41, 62, 1, CNV[0]);
  R(x + 23, y + 31, 24, 11, '#0c0a08'); R(x + 26, y + 35, 7, 7, WD1); R(x + 26, y + 35, 7, 2, WD3); R(x + 35, y + 37, 8, 5, WD1); R(x + 35, y + 37, 8, 2, WD2); R(x + 36, y + 33, 6, 4, '#3b3529');
  R(x + 20, y + 31, 3, 11, CNV[3]); R(x + 20, y + 35, 3, 1, WD1); R(x + 47, y + 31, 3, 11, CNV[1]); R(x + 47, y + 35, 3, 1, WD0);
  hip(x + 1, y, 68, 31, 19, 8, CNV, 'cloth', 7);
  L(x + 35, y + 9, x + 35, y + 30, CNV[1]); L(x + 20, y + 10, x + 14, y + 30, CNV[1]); L(x + 50, y + 10, x + 56, y + 30, CNV[1]);
  R(x + 35, y + 1, 1, 7, WD4); R(x + 36, y + 1, 5, 3, RD1); R(x + 36, y + 1, 5, 1, RED);
  crate(x + 71, y + 22, 9, 8); crate(x + 70, y + 31, 10, 9); crate(x + 81, y + 28, 8, 8); crate(x + 80, y + 37, 9, 9); crate(x + 72, y + 41, 8, 8);
  barrel(x + 2, y + 45, 7, 10); barrel(x + 10, y + 46, 7, 10); barrel(x + 5, y + 54, 7, 10); barrel(x + 14, y + 55, 7, 10);
  sack(x + 22, y + 46, 8, 6); sack(x + 30, y + 47, 8, 6); sack(x + 25, y + 42, 8, 5);
  table(x + 44, y + 51, 24, 6); R(x + 47, y + 51, 9, 5, PA1); R(x + 51, y + 51, 1, 5, PA3); R(x + 48, y + 53, 2, 1, PA3); R(x + 53, y + 52, 2, 1, PA3); R(x + 53, y + 54, 2, 1, PA3);
  R(x + 59, y + 52, 3, 2, KK); P(x + 63, y + 51, PA1); L(x + 63, y + 52, x + 65, y + 55, WD1); R(x + 51, y + 61, 6, 2, WD4); R(x + 51, y + 63, 1, 2, WD1); R(x + 56, y + 63, 1, 2, WD1);
  R(x + 74, y + 54, 12, 1, WD4); R(x + 80, y + 50, 1, 9, WD3); R(x + 73, y + 55, 4, 1, BZ2); R(x + 84, y + 55, 4, 1, BZ2); R(x + 78, y + 59, 5, 1, WD1);   // 天秤
}
function pxMedic(x, y, r) {                   // 傷兵帳 82×64
  var i, P2 = ['#262420', '#3a362f', '#535043', '#6c6657', '#8a826f'];
  R(x + 6, y + 41, 60, 2, KK, 0.4);
  R(x + 4, y + 28, 58, 12, P2[2]); for (i = x + 9; i < x + 62; i += 6) R(i, y + 28, 1, 12, P2[1]); R(x + 44, y + 28, 18, 12, KK, 0.25); R(x + 4, y + 28, 58, 2, KK, 0.5); R(x + 4, y + 39, 58, 1, P2[0]);
  R(x + 13, y + 29, 38, 11, '#0d0b0a'); cot(x + 16, y + 32); cot(x + 34, y + 33); P(x + 31, y + 31, EMB); P(x + 31, y + 32, BZ1); glow(x + 31, y + 33, 6, EMB, 0.06);
  R(x + 10, y + 29, 3, 11, P2[4]); R(x + 10, y + 33, 3, 1, WD1); R(x + 51, y + 29, 3, 11, P2[1]); R(x + 51, y + 33, 3, 1, WD0);
  hip(x + 1, y, 64, 29, 18, 7, P2, 'cloth', 7);
  L(x + 33, y + 8, x + 33, y + 28, P2[1]); L(x + 19, y + 9, x + 13, y + 28, P2[1]); L(x + 47, y + 9, x + 53, y + 28, P2[1]);
  R(x + 33, y + 1, 1, 6, WD4); R(x + 34, y + 1, 4, 4, JD2); R(x + 34, y + 1, 4, 1, JD1);
  /* 帳外：病床、藥草繩、藥罐小火、水桶 */
  cot(x + 66, y + 32); R(x + 71, y + 33, 9, 3, RD3);
  post(x + 2, y + 44, 12, WD2, WD4); post(x + 30, y + 44, 12, WD1, WD3); L(x + 3, y + 45, x + 30, y + 46, WD4);
  for (i = 0; i < 6; i++) { R(x + 6 + i * 4, y + 46, 1, 1, WD0); R(x + 5 + i * 4, y + 47, 3, 4 + (i % 2), i % 3 ? JD2 : JD1); P(x + 5 + i * 4, y + 47, JADE); }
  fire(x + 46, y + 59, 1); R(x + 43, y + 50, 7, 5, '#2c2622'); R(x + 43, y + 50, 7, 1, A3); R(x + 42, y + 51, 1, 2, A1); smoke(r, x + 46, y + 49, 4, 0.3, A4, 0.4);
  barrel(x + 56, y + 48, 7, 9); R(x + 57, y + 49, 5, 1, I3);
  tray(x + 72, y + 54, 5, '#5a5448', PAR); R(x + 70, y + 53, 2, 2, PA1); R(x + 74, y + 54, 2, 2, PA1);
  L(x + 60, y + 61, x + 80, y + 59, WD3); L(x + 60, y + 63, x + 80, y + 62, WD2); R(x + 64, y + 60, 12, 3, P2[2]); R(x + 64, y + 60, 12, 1, P2[3]);
}
function pxBoard(x, y, r) {                   // 軍令牌 94×54
  var i;
  banner(x + 2, y, 42, [RD3, RD2, RD1], SUN, GOLD);
  R(x + 24, y + 22, 48, 18, KK, 0.5); R(x + 28, y + 42, 46, 2, KK, 0.3);
  table(x + 30, y + 27, 36, 7); R(x + 33, y + 27, 24, 6, PA2); R(x + 33, y + 27, 24, 1, PA1); L(x + 35, y + 31, x + 42, y + 29, PA3); L(x + 42, y + 29, x + 49, y + 31, PA3); L(x + 49, y + 31, x + 55, y + 28, PA3);
  P(x + 39, y + 30, RED); P(x + 47, y + 29, RED); P(x + 52, y + 31, '#1f2a35'); R(x + 60, y + 26, 2, 3, PA1); P(x + 60, y + 25, EMH); glow(x + 60, y + 27, 6, EMB, 0.07);
  post(x + 24, y + 20, 21, WD2, WD4); post(x + 70, y + 20, 21, WD1, WD3);
  hip(x + 20, y + 3, 54, 19, 13, 5, RDC, 'cloth');
  for (i = x + 21; i < x + 74; i += 3) P(i, y + 21, GD1); P(x + 47, y + 6, GOLD); R(x + 46, y + 7, 3, 1, GD1);
  nboard(x + 74, y + 12, 20, 28, 2);
  /* 主營火 */
  var fx = x + 13, fy = y + 50;
  for (i = 0; i < 8; i++) R(fx + rd(cos(i * PI / 4) * 9) - 1, fy + rd(sin(i * PI / 4) * 3) - 1, 3, 2, i > 4 || i === 0 ? A2 : A0);
  fire(fx, fy, 3); smoke(r, fx, fy - 12, 5, 0.5, A2, 0.3);
  R(x + 28, y + 49, 12, 3, WD2); R(x + 28, y + 49, 12, 1, WD4); P(x + 28, y + 50, WD5);
}
function pxDrill(x, y, r) {                   // 校場 96×68（沙地）
  var i, a;
  R(x + 1, y + 3, 94, 63, '#2e2920'); mottle(r, x + 2, y + 4, 92, 61, ['#383226', '#27231b', '#3e382b'], 150, 0.7);
  for (i = 0; i < 40; i++) { a = i * PI / 20; if (i % 5 === 4) continue; P(x + 48 + cos(a) * 21, y + 40 + sin(a) * 10, '#4d4636'); }
  for (i = 0; i < 14; i++) { a = x + 30 + fl(r() * 40); var b = y + 32 + fl(r() * 18); P(a, b, '#211d17'); P(a + 1, b + 1, '#211d17'); }
  fenceV(x + 1, y + 4, y + 64, [WD1, WD3, WD5]); fenceV(x + 95, y + 4, y + 64, [WD1, WD3, WD4]);
  fenceH(x, x + 96, y, [WD1, WD3, WD5]);
  wrack(x + 5, y + 6, 20, 5, 'sp'); wrack(x + 72, y + 6, 20, 5, 'sw');
  dummy(x + 30, y + 8); dummy(x + 44, y + 6); dummy(x + 58, y + 8);
  E(x + 16, y + 40, 4, 4, PA2); E(x + 16, y + 40, 3, 3, RD1); E(x + 16, y + 40, 1, 1, PA1); R(x + 15, y + 45, 3, 4, WD2); R(x + 13, y + 49, 8, 1, KK, 0.4);   // 箭靶
  drum(x + 74, y + 40);
  fenceH(x, x + 36, y + 61, [WD1, WD3, WD5]); fenceH(x + 60, x + 96, y + 61, [WD1, WD3, WD5]);
}
function planPoxiao() {
  var r = rng(303), i, x, y, B = {}, DIRT = '#29251e', EDGE = '#221f19', SB = [RD3, RD2, RD1];
  R(0, 0, W, H, '#1c1a15');
  R(0, 0, W, 25, '#11110f'); mottle(r, 0, 0, W, 24, ['#0d0d0b', '#181714'], 50);
  for (i = 0; i < 9; i++) { x = 114 + i * 22; L(x, 11, x + 7, 20, WD1); L(x + 7, 11, x, 20, WD2); L(x + 3, 9, x + 4, 21, WD0); }
  trail(r, [[171, 262], [171, 96]], 30, DIRT, EDGE); trail(r, [[10, 138], [196, 140]], 16, DIRT, EDGE); trail(r, [[171, 186], [390, 184]], 15, DIRT, EDGE);
  trail(r, [[110, 98], [250, 96], [390, 98]], 12, DIRT, EDGE); trail(r, [[300, 100], [304, 184]], 10, DIRT, EDGE);
  mottle(r, 8, 30, W - 16, H - 40, ['#171511', '#23201a', '#2e2a22', '#1f1c17'], 460, 0.6);
  for (i = 0; i < 110; i++) { x = 12 + fl(r() * 374); y = 36 + fl(r() * 210); R(x, y, 2, 1, r() < 0.5 ? THA[2] : '#12100e'); }
  ruts(r, [[166, 258], [168, 100]], 3, '#1a1714');
  palH(4, 394, 24, 9); palV(4, 30, 250); palV(390, 30, 250);
  /* 北半：軍需帳、軍令牌、營帳列 */
  pxQuarter(18, 44, r); box(B, 'px_quarter', 18, 44, 90, 66);
  pxBoard(150, 36, r); box(B, 'px_board', 150, 36, 94, 54);
  for (i = 0; i < 4; i++) tentS(266 + i * 30, 38, 24, 15, CNV);
  for (i = 0; i < 3; i++) tentS(280 + i * 30, 64, 24, 15, CNV);
  cookfire(r, 374, 80); flagS(258, 60, 22, RD1, RED);
  /* 中段：校場與兩翼 */
  tentS(22, 118, 24, 15, CNV); tentS(52, 118, 24, 15, CNV); crate(82, 122, 9, 9);
  pxDrill(196, 104, r); box(B, 'px_drill', 196, 104, 96, 68);
  for (i = 0; i < 3; i++) tentS(308 + i * 28, 110, 24, 15, CNV);
  horse(352, 140); horse(332, 146, { a: '#3a3a3c', b: '#2c2c2e', c: '#151516', h: '#444446' }); R(326, 157, 48, 1, WD3); post(326, 153, 8, WD2, WD4); post(350, 153, 8, WD2, WD4); post(372, 153, 8, WD1, WD3);
  R(376, 140, 9, 6, THA[2]); Dz(376, 140, 9, 6, THA[4], 1);
  /* 南半：傷兵帳、營帳列、望樓、營門 */
  pxMedic(24, 150, r); box(B, 'px_medic', 24, 150, 82, 64);
  for (i = 0; i < 5; i++) tentS(246 + i * 29, 198, 24, 15, CNV);
  for (i = 0; i < 4; i++) tentS(260 + i * 29, 224, 24, 15, CNV);
  cookfire(r, 378, 232);
  cart(30, 226, 'box'); for (i = 0; i < 3; i++) { R(70, 236 - i * 3, 16, 3, WD2); R(70, 236 - i * 3, 16, 1, WD4); P(70, 237 - i * 3, WD5); P(85, 237 - i * 3, WD0); } R(71, 239, 16, 1, KK, 0.4);
  palH(4, 146, 249, 9); palH(196, 394, 249, 9);
  watchtower(216, 200);
  woodGate(142, 216, 58); brazier(138, 258); brazier(204, 258);
  banner(122, 196, 46, SB, SUN, GOLD);
  box(B, 'gate', 142, 216, 58, 44);
  mist(r, 92, 4, A2, 0.05); mist(r, 188, 5, A2, 0.05);
  fin();
  BLD.plan_poxiao = B;
  SPOTS.plan_poxiao = [[260, 252], [330, 304], [268, 392], [408, 396], [564, 380], [672, 340]];
}

/* ==================== 四、官道驛站 ==================== */
function beacon(x, y, r) {                    // 烽燧：石臺、柴籠、木梯 26×42
  var i;
  T(y + 20, y + 42, x + 26, x + 30, x + 26, x + 38, KK, 0.35); R(x + 2, y + 41, 28, 2, KK, 0.4);
  stone(x, y + 17, 26, 24, r, ['#191817', '#2a2927', '#3a3835'], 4, 7); R(x + 17, y + 17, 9, 24, KK, 0.28); R(x, y + 17, 1, 24, '#45423e');
  R(x, y + 9, 26, 8, '#34322f'); R(x, y + 9, 26, 1, '#4d4a45'); R(x + 1, y + 10, 24, 1, '#3d3b37'); R(x, y + 17, 26, 1, KK, 0.5);
  for (i = 0; i < 4; i++) { R(x + i * 7, y + 14, 5, 4, '#2f2d2a'); R(x + i * 7, y + 14, 5, 1, '#4d4a45'); }
  R(x + 8, y + 3, 10, 8, '#1a1918'); for (i = 0; i < 4; i++) R(x + 8 + i * 3, y + 2, 1, 9, A1); R(x + 8, y + 2, 10, 1, A2); R(x + 8, y + 7, 10, 1, A0);
  R(x + 10, y + 4, 6, 3, WD2); P(x + 11, y + 5, RD1); P(x + 14, y + 4, EMB); P(x + 13, y + 6, RD2); glow(x + 13, y + 5, 8, EMB, 0.05);
  smoke(r, x + 13, y + 1, 4, 0.5, A2, 0.3);
  R(x + 27, y + 14, 1, 27, WD3); R(x + 31, y + 16, 1, 25, WD1); for (i = y + 17; i < y + 40; i += 4) R(x + 27, i, 5, 1, WD2);
}
function yzTea(x, y, r) {                     // 茶攤 90×66
  var i;
  R(x + 8, y + 42, 62, 2, KK, 0.4); R(x + 6, y + 25, 62, 16, '#0f0c0a');
  for (i = 0; i < 4; i++) jar(x + 12 + i * 7, y + 27, i % 2 ? '#3a2b20' : '#2c2622');
  R(x + 8, y + 34, 44, 2, WD4); R(x + 8, y + 34, 44, 1, WD5); R(x + 8, y + 36, 44, 5, WD2); for (i = x + 13; i < x + 52; i += 6) R(i, y + 36, 1, 5, WD1);
  P(x + 14, y + 33, PA1); P(x + 18, y + 33, PA1); P(x + 22, y + 33, PA2); R(x + 30, y + 31, 4, 3, BZ2); P(x + 34, y + 32, BZ1); R(x + 40, y + 32, 6, 2, WD3); P(x + 41, y + 31, PA1); P(x + 44, y + 31, PA1);
  post(x + 6, y + 25, 17, WD2, WD4); post(x + 52, y + 25, 17, WD1, WD3); post(x + 66, y + 25, 17, WD1, WD3);
  hip(x + 2, y, 70, 26, 14, 6, THA, 'thatch');
  lantern(x + 12, y + 26, 7);
  /* 棚邊土灶與銅壺 */
  glow(x + 79, y + 36, 12, EMB, 0.07); R(x + 75, y + 40, 12, 2, KK, 0.4);
  R(x + 73, y + 28, 13, 12, '#2a1c15'); R(x + 73, y + 28, 13, 3, '#3f2a1f'); R(x + 73, y + 28, 13, 1, '#523729'); R(x + 83, y + 31, 3, 9, '#1a110c');
  R(x + 76, y + 34, 6, 6, KK); R(x + 77, y + 36, 4, 4, RD1); P(x + 78, y + 37, EMB); P(x + 79, y + 38, EMH); P(x + 78, y + 39, RED);
  R(x + 76, y + 23, 7, 5, BZ1); R(x + 76, y + 23, 7, 1, BZ3); R(x + 76, y + 24, 1, 3, BZ2); P(x + 75, y + 24, BZ2); P(x + 74, y + 23, BZ2); R(x + 77, y + 21, 5, 1, BZ0); P(x + 76, y + 22, BZ0); P(x + 82, y + 22, BZ0);
  smoke(r, x + 78, y + 20, 5, 0.3, A4, 0.45);
  /* 桌凳 */
  table(x + 6, y + 48, 18, 5); bench(x + 5, y + 58, 20); P(x + 10, y + 47, PA1); P(x + 15, y + 48, PA1); R(x + 19, y + 46, 3, 2, BZ2);
  table(x + 36, y + 49, 18, 5); bench(x + 35, y + 59, 20); bench(x + 57, y + 51, 3); P(x + 41, y + 48, PA1); P(x + 48, y + 49, PA2);
  E(x + 68, y + 52, 4, 5, '#2c2622'); E(x + 67, y + 51, 3, 4, '#3a332c'); E(x + 68, y + 48, 3, 1, A2); E(x + 68, y + 48, 2, 0, '#0c0e10'); R(x + 66, y + 57, 7, 1, KK, 0.4);
  for (i = 0; i < 3; i++) { R(x + 74 + (i % 2), y + 56 - i * 3, 13, 3, WD2); R(x + 74 + (i % 2), y + 56 - i * 3, 13, 1, WD4); P(x + 74 + (i % 2), y + 57 - i * 3, WD5); } R(x + 76, y + 59, 13, 1, KK, 0.4);
}
function yzPeddler(x, y, r) {                 // 天星行商 96×66
  var i, j, t, xl, xr, c, bx = x + 6, by = y + 22, AW = ['#141b22', '#1f2a35', '#2a3643', '#3a4a5a', '#4f6276'];
  R(bx + 4, by + 15, 46, 2, KK, 0.4);
  /* 車與貨 */
  crate(bx + 2, by - 8, 9, 8); crate(bx + 25, by - 7, 9, 7); R(bx + 13, by - 6, 3, 6, RD1); R(bx + 13, by - 6, 1, 6, RED); R(bx + 17, by - 5, 3, 5, JD1); R(bx + 17, by - 5, 1, 5, JADE); R(bx + 21, by - 6, 3, 6, GD1); R(bx + 21, by - 6, 1, 6, GOLD);
  R(bx, by, 37, 5, WD3); R(bx, by, 37, 1, WD5); for (i = bx + 5; i < bx + 37; i += 6) R(i, by + 1, 1, 4, WD2); R(bx, by + 5, 37, 4, WD2); R(bx, by + 8, 37, 1, WD0);
  for (i = 0; i < 2; i++) { c = bx + 7 + i * 22; E(c, by + 10, 5, 5, WD0); E(c, by + 10, 4, 4, i ? WD2 : WD3); E(c, by + 10, 2, 2, '#15110d'); P(c, by + 10, WD4); R(c - 4, by + 10, 9, 1, WD1); R(c, by + 6, 1, 9, WD1); }
  L(bx + 37, by + 5, bx + 52, by + 8, WD3); L(bx + 37, by + 7, bx + 52, by + 10, WD1);
  post(bx, y + 14, 9, WD2, WD4); post(bx + 35, y + 14, 9, WD1, WD3);
  hip(x + 1, y + 2, 47, 15, 8, 4, AW, 'cloth');
  for (j = 5; j < 14; j++) { t = (14 - j) / 10; xl = x + 1 + rd(8 * t); xr = x + 48 - rd(8 * t); for (c = x + 5; c < xr; c += 6) if (c >= xl) R(c, y + 2 + j, 2, 1, PA2, 0.6); }
  for (c = x + 2; c < x + 48; c += 4) { R(c, y + 17, 2, 2, AW[2]); }
  /* 金星小旗 */
  R(x + 50, y, 1, 24, WD4); P(x + 50, y - 1 + 1, GD1); R(x + 51, y + 1, 9, 7, '#1f2a35'); R(x + 51, y + 1, 9, 1, '#2f3f4e'); R(x + 60, y + 1, 2, 2, '#1f2a35'); R(x + 60, y + 6, 2, 2, '#1f2a35'); P(x + 60, y + 3, '#1f2a35'); P(x + 60, y + 5, '#1f2a35'); S(x + 53, y + 2, ['#.#.#', '.###.', '#####', '.###.', '#.#.#'], { '#': GOLD });
  /* 騾 */
  horse(x + 60, y + 18, { a: '#5a5346', b: '#474136', c: '#1c1a16', h: '#625b4b' }, true); P(x + 72, y + 17, '#5a5346'); P(x + 74, y + 17, '#5a5346'); P(x + 75, y + 21, PA1); P(x + 75, y + 20, PA2);
  R(x + 65, y + 19, 6, 3, RD2); R(x + 65, y + 19, 6, 1, RD1); R(x + 66, y + 22, 1, 3, WD0); R(x + 69, y + 22, 1, 3, WD0);
  R(x + 78, y + 26, 5, 3, WD2); R(x + 78, y + 26, 5, 1, THA[4]);
  /* 地蓆與貨 */
  var mx = x + 6, my = y + 43;
  R(mx + 2, my + 16, 46, 1, KK, 0.4); R(mx, my, 46, 16, '#33290f'); Dz(mx, my, 46, 16, '#43341a', 1); R(mx, my, 46, 1, '#5a4722'); R(mx, my + 15, 46, 1, '#1b150a'); R(mx, my, 1, 16, '#5a4722');
  jar(mx + 3, my + 2); jar(mx + 10, my + 3, '#3a2b20'); R(mx + 18, my + 3, 6, 3, RD1); R(mx + 18, my + 3, 6, 1, RED); R(mx + 26, my + 2, 5, 4, I3); R(mx + 26, my + 2, 5, 1, I4);
  P(mx + 34, my + 3, GOLD); P(mx + 36, my + 4, GOLD); P(mx + 35, my + 6, GD1); E(mx + 41, my + 4, 2, 2, BZ2); P(mx + 40, my + 3, BZ3);
  R(mx + 4, my + 11, 7, 1, A4); P(mx + 11, my + 11, WD4); R(mx + 4, my + 13, 5, 1, A3); P(mx + 9, my + 13, WD4);
  R(mx + 15, my + 10, 6, 2, PA1); P(mx + 15, my + 10, RD1); P(mx + 20, my + 10, RD1); P(mx + 24, my + 12, RED); P(mx + 26, my + 11, JADE); P(mx + 28, my + 12, RED);
  crate(mx + 31, my + 8, 6, 6); R(mx + 39, my + 10, 3, 3, BZ2); P(mx + 39, my + 10, BZ3);
  /* 提燈、擔子 */
  R(x + 58, y + 36, 1, 20, WD3); R(x + 58, y + 36, 6, 1, WD4); glow(x + 63, y + 41, 11, EMB, 0.07); R(x + 61, y + 38, 5, 6, WD1); R(x + 62, y + 39, 3, 4, LIH); P(x + 63, y + 40, EMH); P(x + 63, y + 37, KK);
  for (i = 0; i < 2; i++) { c = x + 74 + i * 13; E(c + 1, y + 58, 5, 3, KK, 0.4); E(c, y + 57, 5, 3, THA[1]); E(c, y + 55, 5, 3, THA[3]); E(c, y + 55, 3, 2, i ? '#3b3529' : '#2a1d13'); P(c - 3, y + 54, THA[4]); }
  L(x + 70, y + 50, x + 92, y + 48, WD4); L(x + 74, y + 50, x + 74, y + 53, WD1); L(x + 87, y + 49, x + 87, y + 53, WD1);
  R(x + 58, y + 58, 7, 2, WD4); R(x + 58, y + 60, 1, 3, WD1); R(x + 64, y + 60, 1, 3, WD1);
}
function planYizhan() {
  var r = rng(304), B = {}, i, x, y, yc, k, GT = ['#0c110e', '#141d17', '#1d2a21', '#28392c'];
  function rc(xx) { return 222 - 0.402 * xx; }
  R(0, 0, W, H, '#171912');
  mottle(r, 0, 0, W, H, ['#12140e', '#1c1f16', '#20231a', '#14160f'], 620, 0.7);
  blob(r, 158, 118, 56, 12, '#211f19'); blob(r, 282, 196, 54, 18, '#211f19'); blob(r, 300, 60, 44, 10, '#1f1e18');
  trail(r, [[150, 166], [154, 124]], 10, '#211f19'); trail(r, [[268, 126], [270, 150]], 10, '#211f19'); trail(r, [[316, 92], [318, 62]], 9, '#211f19'); trail(r, [[60, 196], [56, 148]], 8, '#1f1e18');
  /* 官道：土路肩＋舊石板（俯視的路面，不作立面明暗） */
  for (x = 0; x < W; x++) { yc = rd(rc(x)); Dz(x, yc - 20, 1, 41, '#22201a', 2); R(x, yc - 17, 1, 35, '#22201a'); }
  for (x = 0; x < W; x++) { yc = rd(rc(x)); R(x, yc - 14, 1, 29, '#282723'); k = x % 7 < 5; P(x, yc - 15, k ? '#302f2a' : '#1d1c19'); P(x, yc + 15, k ? '#2c2b27' : '#1d1c19'); }
  for (k = -1; k <= 1; k++) for (x = 0; x < W; x++) if (((x + k * 17 + 40) % 23) < 12) P(x, rd(rc(x)) + k * 7, '#201f1c');
  for (x = 2; x < W; x += 9) for (k = 0; k < 4; k++) {
    var xx = x + (k % 2) * 4 + fl(r() * 3), y0, q = r(); yc = rd(rc(xx)); y0 = yc - 13 + k * 7;
    L(xx, y0, xx + 2, y0 + 5, '#201f1c'); if (q < 0.2) R(xx + 3, y0 + 1, 5, 3, '#2e2d28'); else if (q < 0.34) R(xx + 3, y0 + 1, 5, 4, '#232220');
  }
  for (x = 0; x < W; x++) { yc = rd(rc(x)); if ((x % 43) > 6) R(x, yc - 6, 1, 2, '#1f1e1b', 0.75); if (((x + 15) % 47) > 7) R(x, yc + 5, 1, 2, '#1f1e1b', 0.75); }
  for (i = 0; i < 12; i++) { x = 10 + fl(r() * 380); yc = rd(rc(x)); blob(r, x, yc + (r() < 0.5 ? -13 : 13), 6 + fl(r() * 7), 2, '#22201a'); }
  for (i = 0; i < 8; i++) { x = 10 + fl(r() * 380); yc = rd(rc(x)); blob(r, x, yc - 7 + fl(r() * 14), 4 + fl(r() * 5), 2, '#211f1b', 0.85); }
  for (i = 0; i < 26; i++) { x = fl(r() * W); yc = rd(rc(x)); k = r() < 0.5 ? -18 - fl(r() * 4) : 16 + fl(r() * 4); tuft(x, yc + k, '#2a3122', '#1e2419'); }
  /* 草與石 */
  for (i = 0; i < 150; i++) { x = fl(r() * W); y = 22 + fl(r() * 236); if (abs(y - rc(x)) < 24) continue; tuft(x, y, r() < 0.5 ? '#262d20' : '#1d2318', '#2e3626'); }
  for (i = 0; i < 16; i++) { x = fl(r() * W); y = 30 + fl(r() * 226); if (abs(y - rc(x)) < 26) continue; pebble(x, y, 3 + fl(r() * 3), ['#111', '#252522', '#34342f']); }
  /* 遠處樹叢 */
  tree(r, 16, 50, 10, GT); tree(r, 38, 42, 8, GT); tree(r, 8, 84, 9, GT); tree(r, 30, 70, 7, GT); tree(r, 280, 36, 9, GT); tree(r, 196, 36, 7, GT); tree(r, 84, 40, 7, GT);
  tree(r, 380, 140, 8, GT); rockO(360, 132, 12, 7, ['#111110', '#22221f', '#32322d']);
  /* 馬棚、拴馬樁、水槽 */
  R(302, 44, 50, 16, '#0d0c0a'); R(336, 51, 13, 9, THA[2]); Dz(336, 51, 13, 9, THA[4], 1); horse(306, 49); post(302, 44, 17, WD2, WD4); post(350, 44, 17, WD1, WD3); post(326, 44, 17, WD1, WD3); R(304, 61, 50, 2, KK, 0.4);
  hip(298, 28, 58, 17, 0, 4, THA, 'thatch');
  R(222, 104, 40, 1, WD4); R(222, 105, 40, 1, WD1); post(222, 100, 10, WD2, WD4); post(241, 100, 10, WD2, WD4); post(260, 100, 10, WD1, WD3); R(224, 110, 40, 1, KK, 0.4);
  horse(226, 91, { a: '#3a3a3c', b: '#2c2c2e', c: '#151516', h: '#474749' }); R(232, 92, 5, 3, RD2); R(232, 92, 5, 1, RD1);
  R(270, 98, 16, 6, '#2a2927'); R(270, 98, 16, 1, '#45423e'); R(271, 99, 14, 2, '#18222b'); P(274, 99, I4); R(271, 104, 16, 1, KK, 0.4);
  beacon(34, 98, r);
  well(92, 122);
  /* 菜畦、草垛、道旁石燈 */
  for (i = 0; i < 4; i++) { R(214, 22 + i * 5, 40, 3, '#1c1a13'); R(214, 22 + i * 5, 40, 1, '#25221a'); for (k = 0; k < 9; k++) { P(216 + k * 4 + (i % 2) * 2, 22 + i * 5, i % 2 ? '#2e3a26' : '#3a4a30'); P(217 + k * 4 + (i % 2) * 2, 21 + i * 5, '#26301f'); } }
  fenceH(210, 258, 40, ['#1c1610', '#2e2318', '#3c2e1f']);
  E(372, 62, 9, 4, KK, 0.35); E(368, 58, 9, 6, THA[1]); E(367, 56, 8, 5, THA[2]); E(365, 54, 5, 3, THA[3], 1, 2); P(368, 50, THA[3]); P(367, 51, THA[4]);
  R(378, 104, 5, 9, '#2a2927'); R(378, 104, 2, 9, '#45423e'); R(376, 100, 9, 4, '#383633'); R(376, 100, 9, 1, '#55524d'); R(379, 102, 3, 2, LIT); P(380, 102, EMH); glow(380, 103, 8, EMB, 0.06); R(377, 113, 7, 1, '#201f1d'); R(379, 114, 7, 1, KK, 0.4);
  for (i = 0; i < 3; i++) { R(68 + (i % 2), 136 - i * 3, 12, 3, WD2); R(68 + (i % 2), 136 - i * 3, 12, 1, WD4); P(68 + (i % 2), 137 - i * 3, WD5); } R(70, 139, 12, 1, KK, 0.4);
  yzTea(112, 52, r); box(B, 'yz_tea', 112, 52, 90, 66);
  yzPeddler(232, 146, r); box(B, 'yz_peddler', 232, 146, 96, 64);
  /* 里程碑 */
  R(74, 218, 7, 12, '#2c2b29'); R(74, 218, 2, 12, '#454340'); R(79, 218, 2, 12, '#1c1b1a'); R(75, 216, 5, 2, '#3a3936'); P(77, 221, '#55524d'); P(77, 223, '#55524d'); P(76, 225, '#55524d'); R(76, 227, 3, 2, RD2); R(73, 230, 9, 2, '#201f1d'); R(75, 232, 9, 1, KK, 0.4);
  /* 道口：界石、抬起的攔路桿、路牌 */
  for (i = 0; i < 2; i++) { x = i ? 30 : 8; y = i ? 232 : 200; R(x, y - 12, 7, 12, '#2a2927'); R(x, y - 12, 2, 12, '#45423e'); R(x + 5, y - 12, 2, 12, '#1a1918'); R(x - 1, y - 14, 9, 3, '#383633'); R(x - 1, y - 14, 9, 1, '#55524d'); R(x + 1, y, 8, 1, KK, 0.4); R(x + 2, y - 8, 3, 3, RD2); }
  L(11, 192, 40, 188, WD4); L(11, 193, 40, 189, WD1); for (i = 0; i < 4; i++) R(15 + i * 7, 191 - rd(i * 0.9), 3, 2, i % 2 ? RD1 : PA2);
  lantern(38, 222, 7); R(36, 220, 1, 16, WD3); R(36, 220, 4, 1, WD4);
  box(B, 'gate', 0, 186, 46, 52);
  tree(r, 372, 238, 11, GT); tree(r, 350, 250, 8, GT); tree(r, 388, 208, 8, GT); tree(r, 124, 252, 10, GT); tree(r, 150, 246, 7, GT); tree(r, 20, 256, 9, GT); bush(196, 236, 6, GT); bush(346, 226, 5, GT); bush(96, 150, 5, GT);
  rockO(206, 248, 14, 8, ['#111110', '#22221f', '#32322d']); rockO(100, 84, 10, 6, ['#111110', '#22221f', '#32322d']);
  mist(r, 30, 5, I3, 0.06); mist(r, 240, 5, I3, 0.06);
  fin();
  BLD.plan_yizhan = B;
  SPOTS.plan_yizhan = [[170, 372], [310, 318], [436, 272], [600, 204], [716, 150], [330, 440], [690, 340]];
}

/* ==================== 五、撿骨師營地 ==================== */
function skull(x, y) { R(x + 1, y, 2, 1, BN3); R(x, y + 1, 4, 2, BN2); P(x, y + 1, BN3); P(x + 1, y + 2, KK); P(x + 3, y + 2, KK); R(x + 1, y + 3, 2, 1, BN1); }
function lbone(x, y, v) { if (v) { R(x, y + 1, 1, 4, BN2); P(x, y, BN3); P(x + 1, y, BN2); P(x, y + 5, BN1); P(x - 1, y + 5, BN1); } else { R(x + 1, y, 4, 1, BN2); P(x, y, BN3); P(x + 5, y, BN1); P(x, y + 1, BN1); P(x + 5, y + 1, BN0); } }
function rib(x, y) { P(x + 2, y, BN1); P(x + 3, y, BN1); P(x + 1, y + 1, BN2); P(x, y + 2, BN2); P(x, y + 3, BN1); P(x + 4, y + 1, BN0); }
function bundle(x, y, v) {
  if (v) { R(x, y, 3, 7, BN1); R(x, y, 1, 7, BN2); R(x + 2, y, 1, 7, BN0); R(x, y + 2, 3, 1, WD1); R(x, y + 5, 3, 1, WD1); P(x + 1, y - 1, WD0); }
  else { R(x, y + 3, 9, 1, KK, 0.4); R(x, y, 8, 3, BN1); R(x, y, 8, 1, BN2); R(x, y + 2, 8, 1, BN0); R(x + 2, y, 1, 3, WD1); R(x + 5, y, 1, 3, WD1); P(x, y, BN3); }
}
function bonePile(r, cx, cy, rx, ry, top) {
  E(cx + 2, cy + 1, rx, ry, KK, 0.35); E(cx, cy, rx, ry, '#3a362e'); E(cx - 1, cy - 1, rx - 1, ry - 1, BN0); E(cx - rx * 0.3, cy - ry * 0.4, rx * 0.5, ry * 0.4, BN1, 1, 2);
  for (var i = 0; i < rx * 1.6; i++) { var a = r() * 6.28, d = r(); R(cx + cos(a) * rx * d * 0.8 - 1, cy + sin(a) * ry * d * 0.7, 2 + fl(r() * 2), 1, r() < 0.4 ? BN2 : BN1); }
  if (top === 's') { skull(cx - 3, cy - ry - 1); skull(cx + 2, cy - ry + 1); skull(cx - 7, cy - ry + 2); } else if (top === 'r') { rib(cx - 3, cy - ry); rib(cx + 2, cy - ry + 1); }
}
function dryRack(x, y, w, n) {
  R(x + 2, y + 15, w, 1, KK, 0.4); post(x, y, 15, WD2, WD4); post(x + w - 2, y, 15, WD1, WD3); R(x, y + 1, w, 1, WD4); L(x, y + 14, x + 4, y + 8, WD1); L(x + w - 1, y + 14, x + w - 5, y + 8, WD1);
  for (var i = 0; i < n; i++) { var hx = x + 3 + rd(i * (w - 7) / max(1, n - 1)); if (i % 3 === 1) { R(hx, y + 2, 2, 7, '#3c2a1b'); R(hx, y + 2, 1, 7, '#503824'); } else { R(hx, y + 2, 1, 5 + (i % 2) * 2, BN1); P(hx, y + 2, WD0); P(hx, y + 7 + (i % 2) * 2, BN2); } }
}
function sgTent(x, y, r) {                    // 撿骨師的棚子 96×74
  var i, j, cx = x + 37;
  function patch(px, py, pw, ph, c) { var k; R(px, py, pw, ph, c); for (k = px; k < px + pw; k += 2) { P(k, py - 1, PA3); P(k + 1, py + ph, '#15100b'); } for (k = py; k < py + ph; k += 2) { P(px - 1, k, PA3); P(px + pw, k + 1, '#15100b'); } }
  R(x + 10, y + 45, 60, 3, KK, 0.4);
  hip(x + 4, y + 2, 66, 43, 24, 10, HID, 'cloth', 11);
  patch(x + 18, y + 20, 9, 7, '#4a3a2a'); patch(x + 46, y + 18, 8, 9, '#33261a'); patch(x + 31, y + 14, 7, 5, '#5a4630'); patch(x + 14, y + 30, 5, 8, '#6a5238'); patch(x + 52, y + 32, 9, 6, '#4a3a2a'); patch(x + 59, y + 34, 5, 6, '#221810');
  L(x + 25, y + 13, x + 14, y + 44, HID[1]); L(x + 49, y + 13, x + 60, y + 44, HID[1]);
  T(y + 27, y + 44, cx, cx + 2, cx - 8, cx + 10, '#070605'); L(cx - 1, y + 27, cx - 9, y + 44, HID[4]); L(cx + 2, y + 27, cx + 10, y + 44, HID[0]);
  T(y + 30, y + 44, cx - 2, cx, cx - 13, cx - 8, HID[3]); R(cx - 9, y + 37, 3, 1, PA3);
  L(x + 24, y + 3, x + 30, y + 13, WD3); L(x + 34, y + 3, x + 28, y + 13, WD2); L(x + 44, y + 3, x + 50, y + 13, WD3); L(x + 54, y + 3, x + 48, y + 13, WD1);
  smoke(r, x + 38, y + 8, 3, 0.4, A2, 0.25);
  /* 門邊燈 */
  R(x + 52, y + 28, 1, 20, WD3); R(x + 53, y + 29, 1, 19, WD0); R(x + 52, y + 28, 6, 1, WD4); glow(x + 57, y + 34, 13, EMB, 0.07);
  R(x + 55, y + 30, 5, 7, WD1); R(x + 56, y + 31, 3, 5, LIH); R(x + 56, y + 32, 3, 2, EMH); P(x + 57, y + 29, KK); R(x + 55, y + 37, 5, 1, WD0);
  /* 成排骨束：架上兩排、地上兩排 */
  post(x + 72, y + 10, 34, WD2, WD4); post(x + 93, y + 10, 34, WD1, WD3); R(x + 72, y + 12, 23, 1, WD4); R(x + 72, y + 26, 23, 1, WD3); R(x + 75, y + 44, 22, 1, KK, 0.4);
  for (i = 0; i < 5; i++) { bundle(x + 75 + i * 4, y + 14, true); bundle(x + 75 + i * 4, y + 28, true); }
  for (j = 0; j < 2; j++) for (i = 0; i < 4; i++) bundle(x + 2 + i * 10 + j * 2, y + 52 + j * 7, false);
  /* 分揀桌 */
  table(x + 52, y + 56, 24, 6); lbone(x + 54, y + 57, false); lbone(x + 62, y + 58, false); skull(x + 70, y + 56); R(x + 56, y + 60, 4, 1, BN1);
  R(x + 80, y + 60, 6, 2, WD4); R(x + 80, y + 62, 1, 3, WD1); R(x + 85, y + 62, 1, 3, WD1);
  E(x + 46, y + 64, 4, 3, '#1c1b1a'); E(x + 46, y + 63, 4, 2, '#2e2c29'); E(x + 46, y + 63, 2, 1, KK);
}
function planShigu() {
  var r = rng(305), B = {}, i, j, x, y, k, RK = ['#0c0c0c', '#1d1c1b', '#2d2c2a'];
  R(0, 0, W, H, '#1b1a19');
  mottle(r, 0, 0, W, H, ['#151514', '#222120', '#282725', '#111110'], 620, 0.7);
  for (i = 0; i < 16; i++) E(fl(r() * W), 24 + fl(r() * 230), 10 + r() * 20, 2 + r() * 3, '#2c2b29', 0.6, 2);
  for (i = 0; i < 90; i++) P(fl(r() * W), fl(r() * H), r() < 0.5 ? '#3a3937' : '#0e0e0d');
  /* 東側：焦土與神墜裂隙 */
  for (k = 0; k < 4; k++) { x = 262 + k * 34; Dz(x - 8, 0, 4, H, RD3, 1, 0.5); Dz(x - 4, 0, 4, H, RD3, 2, 0.5); R(x, 0, W - x, H, RD3, 0.13); }
  trail(r, [[0, 210], [70, 204], [124, 176], [148, 146]], 12, '#242321', '#1f1e1d'); trail(r, [[148, 150], [230, 150], [300, 158]], 11, '#242321', '#1f1e1d');
  var rf = [[396, 22], [384, 52], [391, 80], [376, 112], [387, 144], [372, 176], [384, 206], [377, 236], [388, 262]];
  for (i = 0; i < rf.length - 1; i++) { glow(rf[i][0], rf[i][1] + 14, 16, RED, 0.05); L(rf[i][0] - 3, rf[i][1], rf[i + 1][0] - 3, rf[i + 1][1], '#2a2422', 9); }
  for (i = 0; i < rf.length - 1; i++) L(rf[i][0] - 1, rf[i][1], rf[i + 1][0] - 1, rf[i + 1][1], '#060505', 6);
  for (i = 0; i < rf.length - 1; i++) { L(rf[i][0] + 2, rf[i][1], rf[i + 1][0] + 2, rf[i + 1][1], RD2, 2); L(rf[i][0] + 3, rf[i][1] + 2, rf[i + 1][0] + 3, rf[i + 1][1] - 2, RD1, 1); P(rf[i][0] + 3, rf[i][1] + 9, EMB); }
  for (i = 0; i < 12; i++) rockO(356 + fl(r() * 26), 30 + i * 19 + fl(r() * 8), 5 + fl(r() * 6), 3 + fl(r() * 3), ['#0a0909', '#1c1716', '#2c2422']);
  /* 裂隙邊未揀的散骨、巨獸殘肋 */
  for (i = 0; i < 46; i++) { x = 268 + fl(r() * 96); y = 24 + fl(r() * 136); k = r(); if (k < 0.4) R(x, y, 3, 1, BN0); else if (k < 0.7) lbone(x, y, k < 0.55); else if (k < 0.88) rib(x, y); else skull(x, y); }
  for (i = 0; i < 4; i++) { x = 290 + i * 13; y = 138 - (i % 2) * 2; L(x + 3, y + 2, x + 16, y + 3, KK, 1, 0.4); L(x, y, x + 1, y - 9 - i, BN0, 2); L(x + 1, y - 9 - i, x + 5, y - 16 - i, BN1, 2); L(x + 5, y - 16 - i, x + 10, y - 18 - i, BN1, 2); P(x + 1, y - 9 - i, BN2); P(x + 5, y - 16 - i, BN2); P(x + 11, y - 18 - i, BN2); }
  /* 枯樹、殘樁 */
  deadTree(r, 330, 62, 24, ['#100e0d', '#231d1a', '#342b27']); deadTree(r, 22, 74, 22); deadTree(r, 232, 250, 14); deadTree(r, 356, 228, 16, ['#100e0d', '#231d1a', '#342b27']);
  R(60, 60, 5, 4, WD1); R(60, 60, 5, 1, WD3); R(304, 112, 4, 3, WD1); R(304, 112, 4, 1, WD3);
  rockO(44, 110, 12, 7, RK); rockO(260, 36, 10, 6, RK); rockO(180, 44, 8, 5, RK); rockO(14, 150, 9, 6, RK);
  /* 晾架、手推車 */
  dryRack(226, 62, 30, 8); dryRack(262, 80, 30, 8); dryRack(34, 96 + 22, 28, 7);
  cart(56, 134, 'bone');
  sgTent(100, 62, r); box(B, 'sg_tent', 100, 62, 96, 70);
  /* 分類成排的骨 */
  for (j = 0; j < 6; j++) {
    y = 170 + j * 12; R(196, y - 2, 150, 8, '#232120'); R(196, y - 2, 150, 1, '#2f2c2a'); R(196, y + 6, 150, 1, '#121110');
    R(193, y - 1, 2, 5, WD2); P(193, y - 1, WD4); R(347, y - 1, 2, 5, WD1);
    for (i = 0; i < 18; i++) { x = 199 + i * 8; if (j === 0) skull(x, y); else if (j === 1) lbone(x, y + 1, false); else if (j === 2) rib(x, y); else if (j === 3) { lbone(x + 1, y - 1, true); lbone(x + 4, y - 1, true); } else if (j === 4) { R(x, y + 1, 2, 1, BN1); R(x + 3, y + 3, 2, 1, BN2); P(x + 5, y, BN1); } else if (i % 2) skull(x - 2, y); else lbone(x - 2, y + 1, false); }
  }
  bonePile(r, 52, 238, 14, 6, 's'); bonePile(r, 86, 244, 12, 5, 'r'); bonePile(r, 120, 238, 10, 4);
  for (j = 0; j < 4; j++) for (i = 0; i < 4 - j; i++) lbone(150 + i * 6 + j * 3, 244 - j * 2, false);
  /* 冷火塘 */
  for (i = 0; i < 8; i++) R(170 + rd(cos(i * PI / 4) * 7) - 1, 160 + rd(sin(i * PI / 4) * 3) - 1, 3, 2, i > 4 || i === 0 ? A1 : A0); E(170, 160, 4, 2, '#2a2927'); P(169, 160, '#0e0e0d'); P(171, 159, RD2);
  /* 路口：繫骨的標樁 */
  for (i = 0; i < 2; i++) { x = i ? 30 : 10; y = i ? 232 : 206; L(x, y, x + (i ? -1 : 2), y - 18, WD3); L(x + 1, y, x + (i ? 0 : 3), y - 18, WD0); skull(x + (i ? -3 : 0), y - 22); R(x + 2, y - 14, 1, 5, RD2); R(x - 2, y - 12, 1, 4, BN1); P(x - 2, y - 13, WD0); R(x + 1, y, 5, 1, KK, 0.4); }
  for (i = 0; i < 3; i++) rockO(38 + i * 3, 196 - i * 3, 8 - i * 2, 4, RK);
  box(B, 'gate', 0, 184, 46, 52);
  /* 紅霧自東漫入 */
  for (i = 0; i < 9; i++) { y = 26 + i * 27 + fl(r() * 8); mist(r, y, 6, RD2, 0.42, 268 + fl(r() * 50), W); mist(r, y + 8, 4, RD1, 0.16, 322 + fl(r() * 30), W); }
  mist(r, 150, 5, RD2, 0.14, 180, W); mist(r, 96, 4, RD2, 0.1, 210, W); mist(r, 226, 4, RD2, 0.12, 160, W);
  mist(r, 44, 4, A2, 0.06); mist(r, 200, 4, A2, 0.05);
  fin(0.45);
  BLD.plan_shigu = B;
  SPOTS.plan_shigu = [[300, 336], [446, 276], [590, 290], [296, 440], [166, 330], [520, 240]];
}

/* ==================== 六、鴉巢 ==================== */
function limb(x0, y0, x1, y1, w0, w1, pal) {  // 漸細的粗枝
  var n = max(1, rd(max(abs(x1 - x0), abs(y1 - y0)))), hz = abs(x1 - x0) > abs(y1 - y0) * 1.2, i, t, w, x, y, e;
  for (i = 0; i <= n; i++) {
    t = i / n; w = max(1, rd(w0 + (w1 - w0) * t)); x = rd(x0 + (x1 - x0) * t - w / 2); y = rd(y0 + (y1 - y0) * t - w / 2);
    R(x, y, w, w, pal[1]);
    if (w >= 3) { e = max(1, fl(w * 0.3)); if (hz) { R(x, y, w, e, pal[2]); R(x, y + w - e, w, e, pal[0]); } else { R(x, y, e, w, pal[2]); R(x + w - e, y, e, w, pal[0]); } }
    else if (w === 2) P(x, y, pal[2]);
  }
}
function bough(r, x, y, ang, len, w, depth, pal, perch) {
  var x1 = x + cos(ang) * len, y1 = y + sin(ang) * len * 0.85, w1 = max(1, w * 0.55), n, k, t, a;
  limb(x, y, x1, y1, w, w1, pal);
  perch.push([x + (x1 - x) * 0.35, y + (y1 - y) * 0.35 - w * 0.45]); perch.push([x + (x1 - x) * 0.7, y + (y1 - y) * 0.7 - w * 0.4]); perch.push([x1, y1 - w1 * 0.5]);
  if (depth <= 0) { L(x1, y1, x1 + cos(ang - 0.5) * 6, y1 + sin(ang - 0.5) * 5, pal[1]); L(x1, y1, x1 + cos(ang + 0.6) * 5, y1 + sin(ang + 0.6) * 4, pal[0]); return; }
  n = 2 + (r() < 0.35 ? 1 : 0);
  for (k = 0; k < n; k++) { t = 0.55 + 0.45 * k / (n - 1); a = ang + (k % 2 ? 1 : -1) * (0.35 + r() * 0.5) * (k === n - 1 ? 0.5 : 1); bough(r, x + (x1 - x) * t, y + (y1 - y) * t, a, len * (0.55 + r() * 0.2), max(1, (w + (w1 - w) * t) * 0.75), depth - 1, pal, perch); }
}
var CROW = ['.kk....', 'bkhkk..', '.kkkkkt', '..k.k..'];
function crow(x, y, f) { S(x - 1, y - 1, CROW, { k: '#040405', h: '#34424f', b: '#8a8272', t: '#040405' }, f); }
function totem(x, y) {                        // 羽飾圖騰柱
  R(x + 1, y + 18, 4, 1, KK, 0.4); R(x, y + 2, 1, 16, WD3); R(x + 1, y + 3, 1, 15, WD0); R(x - 4, y + 5, 9, 1, WD3);
  R(x - 1, y, 3, 2, BN2); P(x - 1, y + 1, KK); P(x + 1, y + 1, KK); P(x + 2, y + 1, BN1); P(x + 3, y + 2, BN1);
  for (var i = -4; i <= 4; i += 2) { if (!i) continue; R(x + i, y + 6, 1, 4 + (abs(i) === 2 ? 2 : 0), '#070709'); P(x + i, y + 7, I3); }
  P(x, y + 7, RD1); P(x, y + 8, RD2); P(x, y + 12, RD2);
}
function ycNest(x, y, r) {                    // 鴉巢 96×64：樹根間的披棚、悶火、地圖皮
  var i, RP = ['#120e0a', '#1f1810', '#2c2318', '#3c3020', '#52422c'];
  R(x + 20, y + 26, 54, 13, '#070605'); R(x + 24, y + 40, 54, 2, KK, 0.35);
  R(x + 26, y + 34, 14, 4, RD3); R(x + 26, y + 34, 14, 1, RD2); R(x + 44, y + 33, 7, 5, WD1); R(x + 44, y + 33, 7, 1, WD3); R(x + 56, y + 30, 1, 8, WD3); P(x + 56, y + 29, A4);
  post(x + 20, y + 24, 16, WD1, WD3); post(x + 72, y + 24, 16, WD0, WD2); post(x + 46, y + 26, 3, WD1, WD2);
  hip(x + 15, y + 2, 64, 25, 9, 0, RP, 'thatch');
  L(x + 21, y + 10, x + 73, y + 9, RP[0]); L(x + 18, y + 18, x + 76, y + 19, RP[0]); L(x + 30, y + 3, x + 26, y + 26, WD1); L(x + 62, y + 3, x + 68, y + 26, WD0);
  R(x + 36, y + 11, 13, 7, HID[2]); R(x + 36, y + 11, 13, 1, HID[4]); for (i = 0; i < 13; i += 2) { P(x + 36 + i, y + 18, PA3); }
  for (i = 0; i < 7; i++) { R(x + 23 + i * 8, y + 27, 1, 3 + (i % 2) * 2, '#070709'); P(x + 23 + i * 8, y + 28, I3); }
  /* 悶火 */
  var fx = x + 36, fy = y + 53;
  glow(fx, fy, 11, EMB, 0.05); E(fx, fy, 7, 3, '#161412');
  for (i = 0; i < 8; i++) R(fx + rd(cos(i * PI / 4) * 7) - 1, fy + rd(sin(i * PI / 4) * 3) - 1, 3, 2, i > 4 || i === 0 ? A2 : A0);
  E(fx, fy, 4, 2, '#2a2826'); P(fx - 1, fy, RD1); P(fx + 1, fy, EMB); P(fx, fy - 1, RD1); P(fx + 2, fy + 1, RD2); smoke(r, fx, fy - 2, 3, 0.3, A2, 0.28);
  R(x + 12, y + 57, 13, 3, WD2); R(x + 12, y + 57, 13, 1, WD4); P(x + 12, y + 58, WD5); R(x + 14, y + 60, 13, 1, KK, 0.4);
  /* 繃在木架上的地圖皮 */
  var mx = x + 64, my = y + 30;
  R(mx + 4, my + 30, 28, 1, KK, 0.4);
  L(mx + 2, my + 30, mx + 5, my, WD3); L(mx + 3, my + 30, mx + 6, my, WD1); L(mx + 29, my + 30, mx + 26, my, WD2); L(mx + 30, my + 30, mx + 27, my, WD0);
  R(mx + 3, my + 3, 26, 1, WD4); R(mx + 2, my + 25, 28, 1, WD3);
  T(my + 6, my + 22, mx + 9, mx + 24, mx + 7, mx + 25, '#6e5d42'); R(mx + 9, my + 6, 15, 1, '#8a7655'); T(my + 6, my + 22, mx + 20, mx + 24, mx + 20, mx + 25, '#5a4b35'); R(mx + 7, my + 22, 18, 1, '#463a29'); P(mx + 9, my + 6, '#463a29'); P(mx + 24, my + 22, '#1f1810');
  for (i = 0; i < 4; i++) { L(mx + 5, my + 5 + i * 5, mx + 8, my + 7 + i * 5, PA3); L(mx + 27, my + 5 + i * 5, mx + 24, my + 7 + i * 5, PA3); }
  L(mx + 10, my + 10, mx + 14, my + 14, '#2a1d13'); L(mx + 14, my + 14, mx + 19, my + 12, '#2a1d13'); L(mx + 19, my + 12, mx + 22, my + 17, '#2a1d13'); P(mx + 12, my + 17, '#2a1d13'); P(mx + 13, my + 16, '#2a1d13'); P(mx + 14, my + 17, '#2a1d13');
  P(mx + 16, my + 9, RED); P(mx + 20, my + 18, RED); P(mx + 11, my + 13, RED); P(mx + 17, my + 19, '#2a1d13'); P(mx + 18, my + 19, '#2a1d13');
}
function planYachao() {
  var r = rng(306), B = {}, i, x, y, k, perch = [], BK = ['#15120f', '#2a2520', '#3c352d'], TK = ['#080a08', '#0e120e', '#151b15', '#1c241c'], RK = ['#0b0b0b', '#1a1a18', '#292926'];
  R(0, 0, W, H, '#1b1a14');
  mottle(r, 0, 0, W, H, ['#14130f', '#211f18', '#25231b', '#171611'], 620, 0.7);
  for (i = 0; i < 14; i++) E(40 + fl(r() * 320), 40 + fl(r() * 200), 6 + r() * 12, 2 + r() * 3, JD3, 0.5, 1);
  blob(r, 190, 212, 70, 22, '#211f19'); 
  trail(r, [[214, 226], [262, 238], [304, 232], [346, 242], [400, 252]], 7, '#211f19', '#1c1a15');
  for (i = 0; i < 70; i++) { x = 30 + fl(r() * 340); y = 30 + fl(r() * 220); P(x, y, '#08080a'); P(x + 1, y + 1, '#08080a'); if (r() < 0.3) P(x + 2, y + 1, I3); }
  /* 樹影 */
  E(232, 186, 70, 20, KK, 0.3); E(250, 196, 46, 12, KK, 0.25);
  /* 板根 */
  var rt = [[176, 160, 112, 196, 12], [184, 168, 146, 222, 10], [214, 168, 252, 224, 10], [222, 160, 292, 194, 12], [172, 150, 96, 164, 9], [226, 150, 306, 160, 9], [199, 170, 204, 226, 7]];
  for (i = 0; i < rt.length; i++) { limb(rt[i][0], rt[i][1], rt[i][2], rt[i][3], rt[i][4], 1, BK); }
  /* 主幹 */
  for (y = 58; y <= 174; y++) {
    var t = (y - 58) / 116, hw = rd(13 + t * 10 + (y > 150 ? (y - 150) * (y - 150) / 44 : 0)), cxx = 199 + rd(sin(y / 23) * 2);
    R(cxx - hw, y, hw * 2, 1, BK[1]); R(cxx - hw, y, rd(hw * 0.55), 1, BK[2]); R(cxx + rd(hw * 0.35), y, hw - rd(hw * 0.35), 1, BK[0]);
    P(cxx - hw, y, '#4d453a');
  }
  for (i = 0; i < 46; i++) { x = 180 + fl(r() * 40); y = 62 + fl(r() * 100); R(x, y, 1, 4 + fl(r() * 10), x < 196 ? BK[1] : (x < 206 ? BK[0] : '#0d0b09')); }
  E(205, 122, 4, 7, '#060505'); E(204, 121, 5, 8, BK[0], 1, 1); P(204, 119, '#060505');
  T(52, 58, 190, 196, 186, 212, BK[1]); T(50, 58, 202, 206, 198, 212, BK[1]); R(186, 58, 9, 1, BK[2]);
  /* 大枝 */
  bough(r, 188, 80, -2.62, 72, 12, 3, BK, perch); bough(r, 196, 64, -1.95, 58, 10, 3, BK, perch); bough(r, 204, 64, -1.15, 60, 10, 3, BK, perch); bough(r, 212, 80, -0.5, 74, 12, 3, BK, perch);
  bough(r, 184, 104, -3.05, 70, 9, 2, BK, perch); bough(r, 214, 106, -0.1, 74, 9, 2, BK, perch);
  /* 四周密叢與亂石（藏住窪地） */
  for (i = 0; i < 380; i++) {
    k = fl(r() * 4); var d = r() * r();
    if (k === 0) { x = r() * W; y = d * 30; } else if (k === 1) { x = r() * W; y = H - d * 24; } else if (k === 2) { x = d * 34; y = r() * H; } else { x = W - d * 34; y = r() * H; }
    if (x > 296 && x < 398 && y > 226 && y < 256 && r() < 0.8) continue;
    var rx = 5 + r() * 8; E(x, y, rx, rx * 0.6, TK[0]); E(x - 1, y - 1, rx - 2, rx * 0.45, TK[1]); if (r() < 0.6) E(x - rx * 0.3, y - rx * 0.25, rx * 0.45, rx * 0.22, TK[2], 1, 2);
  }
  rockO(60, 70, 16, 9, RK); rockO(336, 84, 18, 10, RK); rockO(44, 206, 14, 8, RK); rockO(120, 246, 12, 7, RK); rockO(360, 170, 14, 8, RK); rockO(76, 120, 9, 5, RK);
  ycNest(152, 150, r); box(B, 'yc_nest', 152, 150, 96, 64);
  totem(108, 196); totem(292, 170); totem(134, 126); totem(266, 124); totem(72, 164);
  /* 隱徑：缺口、立石、枝條編的遮屏 */
  trail(r, [[286, 236], [324, 240], [360, 246], [400, 250]], 9, '#221f19', '#1c1a15');
  rockO(306, 236, 16, 20, RK); rockO(349, 232, 15, 18, RK); P(303, 222, '#3a3a36'); P(346, 219, '#3a3a36');
  for (i = 0; i < 2; i++) { x = 316 + i * 13; y = 234 + i * 5; R(x + 2, y + 15, 14, 1, KK, 0.4); R(x, y, 14, 15, '#1a150f'); for (k = 0; k < 14; k += 3) { R(x + k, y, 1, 15, WD2); P(x + k, y, WD4); } for (k = 2; k < 15; k += 4) R(x, y + k, 14, 1, '#2f2518'); Dz(x - 1, y - 2, 16, 4, TK[3], 2); Dz(x + 3, y + 4, 8, 5, TK[2], 1); }
  E(338, 255, 10, 4, TK[0]); E(336, 254, 7, 2, TK[1]); E(304, 254, 8, 3, TK[0]); E(302, 253, 5, 2, TK[1]); totem(300, 210);
  box(B, 'gate', 298, 208, 56, 50);
  /* 群鴉 */
  var used = [], n = 0;
  for (i = 0; i < 400 && n < 52; i++) {
    var p = perch[fl(r() * perch.length)], ok = p[0] > 6 && p[0] < W - 8 && p[1] > 6 && p[1] < 150 && !(p[1] < 22 && (p[0] < 112 || p[0] > 308));
    for (k = 0; ok && k < used.length; k++) if (abs(used[k][0] - p[0]) < 7 && abs(used[k][1] - p[1]) < 5) ok = false;
    if (ok) { used.push(p); crow(rd(p[0]) - 2, rd(p[1]) - 2, r() < 0.5); n++; }
  }
  crow(176, 150, 0); crow(222, 152, 1); crow(118, 208, 1); crow(280, 206, 0); crow(88, 228, 0); crow(240, 232, 1); crow(170, 236, 0);
  S(120, 96, ['#...#', '.#.#.', '..#..'], { '#': '#050506' }); S(286, 150, ['#...#', '.#.#.', '..#..'], { '#': '#050506' }); S(70, 44, ['.#.#.', '#.#.#'], { '#': '#050506' });
  mist(r, 100, 5, I3, 0.05); mist(r, 190, 4, I3, 0.05);
  fin(0.45);
  BLD.plan_yachao = B;
  SPOTS.plan_yachao = [[220, 380], [250, 470], [400, 478], [560, 368], [650, 300], [130, 280]];
}

/* ---------- 產出 ---------- */
function scene(id, fn) {
  var cv = document.createElement('canvas'); cv.width = NW; cv.height = NH;
  var ctx = cv.getContext('2d'), img = ctx.createImageData(NW, NH);
  W = NW; H = NH; D = img.data;
  for (var i = 3; i < D.length; i += 4) D[i] = 255;
  R(0, 0, NW, NH, K0); fn();
  ctx.putImageData(img, 0, 0);
  URLS[id] = cv.toDataURL('image/png');
  D = null;
}
scene('plan_huiyao', planHuiyao);
scene('plan_duyin', planDuyin);
scene('plan_poxiao', planPoxiao);
scene('plan_yizhan', planYizhan);
scene('plan_shigu', planShigu);
scene('plan_yachao', planYachao);

var css = '', ids = Object.keys(URLS), n, k;
for (n = 0; n < ids.length; n++) css += '.sc-' + ids[n] + '{background-image:url(' + URLS[ids[n]] + ');background-size:100% 100%;image-rendering:pixelated}\n';
var st = document.createElement('style'); st.id = 'shl-scenes-town'; st.textContent = css;
(document.head || document.documentElement).appendChild(st);

/* ---------- 擴充登錄表（不改動 scenes.js） ---------- */
var own = Object.prototype.hasOwnProperty;
var base = window.SHL_SCENES || { has: function () { return false; }, list: function () { return []; }, buildings: {} };
var reg = {}, bld = {}, spots = {};
for (k in base) if (own.call(base, k)) reg[k] = base[k];
for (k in (base.buildings || {})) if (own.call(base.buildings, k)) bld[k] = base.buildings[k];
for (k in BLD) bld[k] = BLD[k];
for (k in (base.spots || {})) if (own.call(base.spots, k)) spots[k] = base.spots[k];
for (k in SPOTS) spots[k] = SPOTS[k];
reg.has = function (id) { return own.call(URLS, id) || (typeof base.has === 'function' && !!base.has(id)); };
reg.list = function () { return (typeof base.list === 'function' ? base.list() : []).concat(ids); };
reg.size = function (id) { return own.call(URLS, id) ? [NW * 2, NH * 2] : (typeof base.size === 'function' ? base.size(id) : null); };
reg.buildings = bld;
reg.spots = spots;
reg.townRenderMs = now() - T0;
window.SHL_SCENES = reg;
})();
