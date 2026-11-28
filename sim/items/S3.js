'use strict';
// S3 R 係數（量測＋健全檢查）
const Wd = require('../lib/world');
const T = require('../lib/time');
const { r3, writeCsv, verdict, mean } = require('../lib/util');
const SEEDS = 200, DAYS = 120;
function scen(name, init, hook) {
  const acc = { name, wild: [], road: [], wildL: [], roadL: [], oH: [], oD: [], oHL: [], B: [], BL: [], rmin: Infinity, rmax: -Infinity, daily: [] };
  for (let s = 0; s < SEEDS; s++) {
    const W = Wd.run(s, DAYS, { noQuests: true, init }, hook);
    W.hist.forEach((h, i) => {
      const rw = T.R_wild(h.B, h.Obar), rr = T.R_road(h.Obar);
      acc.rmin = Math.min(acc.rmin, rw, rr); acc.rmax = Math.max(acc.rmax, rw, rr);
      acc.wild.push(0.22 * rw); acc.road.push(0.04 * rr); acc.oH.push(h.huiyao.O); acc.oD.push(h.duyin.O); acc.B.push(h.B);
      if (i >= 60) { acc.wildL.push(0.22 * rw); acc.roadL.push(0.04 * rr); acc.oHL.push(h.huiyao.O); acc.BL.push(h.B); }
      const d = acc.daily[i] || (acc.daily[i] = { w: 0, r: 0, n: 0 }); d.w += 0.22 * rw; d.r += 0.04 * rr; d.n++;
    });
  }
  return acc;
}
function run() {
  const S = [
    scen('不介入'),
    scen('灰窯 Lv3', (W) => (W.towns.huiyao.Lpat = 3)),
    scen('兩鎮 Lv3', (W) => { W.towns.huiyao.Lpat = 3; W.towns.duyin.Lpat = 3; }),
    scen('灰窯 Lv3＋常駐資助', (W) => (W.towns.huiyao.Lpat = 3), (W) => Wd.donate(W, 'huiyao', 25)),
  ];
  const csv = []; S.forEach((a) => a.daily.forEach((d, i) => csv.push([a.name, i + 1, d.w / d.n, d.r / d.n])));
  writeCsv('S3', ['scenario', 'day', 'wild_single_day_risk', 'road_risk'], csv);
  const lines = ['| 情境 | 野徑單段白天（120 天） | 野徑（第 61–120 日） | 官道（120 天） | 官道（第 61–120 日） | 灰窯 O（第 61–120 日） | B（第 61–120 日） |', '|---|---|---|---|---|---|---|'];
  S.forEach((a) => lines.push('| ' + [a.name, r3(mean(a.wild) * 100) + '%', r3(mean(a.wildL) * 100) + '%', r3(mean(a.road) * 100) + '%', r3(mean(a.roadL) * 100) + '%', r3(mean(a.oHL)), r3(mean(a.BL))].join(' | ') + ' |'));
  const dO = mean(S[1].oHL) - mean(S[0].oHL), w0 = mean(S[0].wildL), w1 = mean(S[1].wildL), r0 = mean(S[0].roadL), r1 = mean(S[1].roadL);
  const rmin = Math.min(...S.map((a) => a.rmin)), rmax = Math.max(...S.map((a) => a.rmax));
  const cO = Math.abs(dO - 13.9) <= 2, cW = Math.abs(w0 - 0.22) <= 0.015 && Math.abs(w1 - 0.194) <= 0.015, cR = Math.abs(r0 - 0.04) <= 0.003 && Math.abs(r1 - 0.036) <= 0.003, cB = rmin >= 0.5 && rmax <= 1.8;
  // 另附：無獸潮擾動的名目基準（Ō=57.5、B=30 → R=1）對 Lv3 的相對降幅
  lines.push('健全檢查（長期＝第 61–120 日平均）：灰窯 Lv3 的 δO（灰窯）＝+' + r3(dO) + '（手算 +13.9，容許 ±2）→ ' + verdict(cO));
  lines.push('　野徑單段：不介入 ' + r3(w0 * 100) + '% → 灰窯 Lv3 ' + r3(w1 * 100) + '%（手算 22%→19.4%，各 ±1.5pp）→ ' + verdict(cW) + '；降幅 ' + r3((w0 - w1) * 100) + 'pp（手算 2.6pp）');
  lines.push('　官道：' + r3(r0 * 100) + '% → ' + r3(r1 * 100) + '%（手算 4%→3.6%，本項自訂容許 ±0.3pp）→ ' + verdict(cR));
  lines.push('　R 範圍：' + r3(rmin) + '–' + r3(rmax) + '（門檻 [0.5,1.8]）→ ' + verdict(cB));
  lines.push('註：不介入時因獸潮把 O 拉低、B 抬高，野徑實際落在 ' + r3(w0 * 100) + '% 而不是名目的 22%；手算的 22%→19.4% 是以 R=1 為起點。');
  const ok = cO && cW && cR && cB;
  return { id: 'S3', title: 'R 係數（量測）', measured: '野徑 ' + S.map((a) => r3(mean(a.wild) * 100) + '%').join('／') + '；官道 ' + S.map((a) => r3(mean(a.road) * 100) + '%').join('／') + '（不介入／灰窯Lv3／兩鎮Lv3／灰窯Lv3＋資助）；δO +' + r3(dO) + '；R ' + r3(rmin) + '–' + r3(rmax), threshold: '量測；健全：δO≈+13.9、野徑 22→19.4%(±1.5pp)、官道 4→3.6%、R∈[0.5,1.8]', pass: ok, suggest: '—', rerun: '—', lines, avgR: { wild: mean(S[0].wild) / 0.22, road: mean(S[0].road) / 0.04 } };
}
module.exports = { run };
