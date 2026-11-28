'use strict';
/* E7 渠道：只報數。200 seeds（seed＝0..199），亂數 prng(seed,'E7:…')。 */
const { U, writeCsv, r2, PRICE } = require('./common');
function run() {
  const lines = [], csv = [];
  // (a) 古塚取 4：一趟的古物（壁龕 下×1、俑坑 下/中、主室 4×(中70%/上30%)）在沼地渡口每日收貨上限行情 100 的影響
  const rowsA = []; let tot = 0, day1 = 0, nights = 0, left = 0;
  for (let s = 0; s < 200; s++) {
    const r = U.prng(s, 'E7:take4'); const items = [PRICE.lo, r() < 0.5 ? PRICE.lo : PRICE.mid]; for (let k = 0; k < 4; k++) items.push(r() < 0.7 ? PRICE.mid : PRICE.hi);
    const T = items.reduce((a, b) => a + b, 0); tot += T;
    let inv = items.slice().sort((a, b) => b - a), n = 0, first = 0;
    while (inv.length) { let cap = 100; const keep = []; let sold = 0; inv.forEach((v) => { if (v <= cap) { cap -= v; sold += v; } else keep.push(v); }); n++; if (n === 1) first = sold; inv = keep; }
    day1 += first; nights += n; left += T - first; rowsA.push([s, T, first, T - first, n]);
  }
  lines.push('**(a) 古塚取 4 的古物 vs 渡口每日上限（行情 100）**：200 趟（seed 0..199）每趟古物行情平均 ' + r2(tot / 200) + '（手算 12＋18＋4×31.2＝154.8）；第一晚收得下 ' + r2(day1 / 200) + '（×0.65＝' + r2(day1 / 200 * 0.65) + ' 兩），剩 ' + r2(left / 200) + ' 要隔晚再賣；平均要 ' + U.r3(nights / 200) + ' 個渡口夜才賣完（每多一夜＝多等 24h 或另跑一趟腐骨沼）。上限不影響總價（同為 ×0.65），只影響時間：一週一趟取 4 的古物，第二晚在灰窯→腐骨沼 2h 範圍內，或改走鬼市。', '');
  writeCsv('E7-take4-ferry', ['seed', 'antique_market_value', 'sold_night1', 'left_after_night1', 'ferry_nights'], rowsA);
  // (b) 四渠道：同一批 100 兩行情的墓中物
  const ch = [];
  const ferry = { name: '沼地渡口', m: 0.65, raid: 0, note: '17:00–08:00、每日上限行情 100、只收墓中物；灰窯→腐骨沼 2h，破曉營→腐骨沼 8h（官道 6h＋野徑 2h）' };
  const ghost = [0, 1, 2].map((i) => ({ name: '鬼市（聲望檔 ' + i + '）', m: [0.6375, 0.66, 0.675][i], raid: [0.10, 0.08, 0.06][i], note: '突查＝整批沒收（假設，SPEC-03 突查的後果 base sim 沒有）；地點與時數 base sim 沒有' }));
  const black = { name: '黑攤', m: 0.50, raid: 0, note: '地點與時數 base sim 沒有' };
  const wash = { name: '洗貨→天星', m: null, raid: 0, note: '0.70–0.75 均勻、2 天' };
  [ferry].concat(ghost, [black, wash]).forEach((c) => {
    let sum = 0, raided = 0; const r = U.prng(0, 'E7:' + c.name);
    for (let s = 0; s < 200; s++) { const rr = U.prng(s, 'E7:' + c.name); const m = c.m === null ? 0.70 + 0.05 * rr() : c.m; const hit = rr() < c.raid; if (hit) raided++; sum += hit ? 0 : 100 * m; }
    ch.push({ c, mean: sum / 200, raided });
    csv.push([c.name, c.m === null ? '0.70-0.75' : c.m, c.raid, 200, raided, sum / 200, c.c === undefined ? '' : '']);
  });
  lines.push('**(b) 四渠道，每 100 兩行情的墓中物實得**（200 seeds 抽突查與洗貨倍率）：', '', '| 渠道 | 出手倍率 | 突查率 | 被突查（/200） | 實得平均（兩） | 期望值（解析） | 時間與條件 |', '|---|---|---|---|---|---|---|');
  ch.forEach(({ c, mean, raided }) => lines.push('| ' + [c.name, c.m === null ? '0.70–0.75' : c.m, c.raid ? c.raid : '0', raided, r2(mean), r2(c.m === null ? 72.5 : 100 * c.m * (1 - c.raid)), c.note].join(' | ') + ' |'));
  // 稅卡
  const tax = []; for (let n = 0; n <= 8; n++) { const p = Math.min(0.5, (0.10 + 0.05 * n) * 1.21); tax.push([n, p]); csv.push(['稅卡 n_mark=' + n, '', p, '', '', '', '']); }
  lines.push('', '稅卡（驛站↔渡陰段，S_pub 1.21）P＝min(0.5,(0.10＋0.05·n_mark)×1.21)：' + tax.map(([n, p]) => 'n=' + n + ' ' + U.r3(p)).join('；') + '（n≥7 封頂 0.5）。帶記號的墓中物經官道去渡陰（天星／洗貨）時，若被查算整批沒收，100 兩行情在 n=3 時期望只剩 ' + r2(72.5 * (1 - tax[3][1])) + ' 兩（洗貨）／' + r2(65 * (1 - tax[3][1])) + '（若照渡口價）；這段只有走官道去渡陰才會碰到，渡口在腐骨沼、不經稅卡。');
  writeCsv('E7-channels', ['channel', 'mult', 'p_raid_or_tax', 'n', 'raided', 'mean_realized_per100', 'note'], csv);
  return { lines, ch, tax, take4: { mean: tot / 200, night1: day1 / 200, nights: nights / 200 } };
}
module.exports = { run };
