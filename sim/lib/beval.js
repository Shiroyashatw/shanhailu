'use strict';
/* B 組（無玩家介入）門檻 B1–B11 的評估器；S1、S2、S3、S5 共用。 */
const Wd = require('./world');
const { r3, wilson } = require('./util');
function maxRun(arr, f) { let m = 0, c = 0; arr.forEach((x) => { if (f(x)) { c++; if (c > m) m = c; } else c = 0; }); return m; }
function evalB(opts, seeds, days) {
  seeds = seeds || 200; days = days || 120;
  const M = { townDays: 0, pIn: 0, b2bad: 0, b3bad: 0, minT: Infinity, maxTratio: 0, b4: { huiyao: 0, duyin: 0 }, b5: { huiyao: 0, duyin: 0 }, b5both: 0, debtDays: 0, bIn: 0, bDays: 0, rescues: 0,
    tides: { huiyao: [0, 0], duyin: [0, 0] }, b10bad: 0, minHeavy: 99, minWin: 99, conserveBad: 0, campMin: 999, campMax: 0, sumP: { huiyao: 0, duyin: 0 }, sumO: { huiyao: 0, duyin: 0 }, sumB: 0, banditMax: 0, sumRw: 0, sumRr: 0, daily: [] };
  for (let seed = 0; seed < seeds; seed++) {
    const W = Wd.run(seed, days, opts, opts && opts.hook);
    let b5ok = true;
    Wd.TOWNS.forEach((id) => {
      const P = W.hist.map((h) => h[id].P), O = W.hist.map((h) => h[id].O), T = W.hist.map((h) => h[id].T);
      P.forEach((p) => { M.townDays++; if (p >= 20 && p <= 90) M.pIn++; M.sumP[id] += p; }); O.forEach((o) => (M.sumO[id] += o));
      if (maxRun(P, (p) => p <= 16) >= 30 || maxRun(P, (p) => p >= 78) >= 30 || O.some((o) => o <= 2 || o >= 98)) M.b2bad++;
      const cap = W.towns[id].T_CAP; T.forEach((t) => { if (t < -1e-9 || t > cap + 1e-9) M.b3bad++; if (t < M.minT) M.minT = t; if (t / cap > M.maxTratio) M.maxTratio = t / cap; });
      if (Math.max(...P) - Math.min(...P) >= 6) M.b4[id]++;
      const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      const ok = Math.abs(m(P.slice(90, 120)) - m(P.slice(0, 30))) <= 10; if (ok) M.b5[id]++; else b5ok = false;
      M.debtDays += W.hist.filter((h) => h[id].debtToday).length; M.rescues += W.towns[id].rescues;
    });
    if (b5ok) M.b5both++;
    W.hist.forEach((h, i) => { M.bDays++; if (h.B >= 5 && h.B <= 70) M.bIn++; M.sumB += h.B; if (!h.conserve) M.conserveBad++; if (h.camp < M.campMin) M.campMin = h.camp; if (h.camp > M.campMax) M.campMax = h.camp; if (h.banditShare > M.banditMax) M.banditMax = h.banditShare;
      const d = M.daily[i] || (M.daily[i] = { hP: 0, dP: 0, hO: 0, dO: 0, hT: 0, dT: 0, B: 0, crew: 0, camp: 0, n: 0 }); d.hP += h.huiyao.P; d.dP += h.duyin.P; d.hO += h.huiyao.O; d.dO += h.duyin.O; d.hT += h.huiyao.T; d.dT += h.duyin.T; d.B += h.B; d.crew += h.crew; d.camp += h.camp; d.n++; });
    W.tideLog.forEach((t) => { if (!t.byPlayer) { M.tides[t.town][1]++; if (t.repel) M.tides[t.town][0]++; } });
    for (let s = 0; s < Math.floor(days / 30); s++) { const h = W.heavyOps[s] || 0; if (h < M.minHeavy) M.minHeavy = h; if (h < 2) M.b10bad++; }
    for (let d = 1; d + 29 <= days; d++) { const c = W.tideStarts.filter((x) => x >= d && x <= d + 29).length; if (c < M.minWin) M.minWin = c; if (c < 2) M.b10bad++; }
  }
  const td = M.townDays, rh = M.tides.huiyao[1] ? M.tides.huiyao[0] / M.tides.huiyao[1] : NaN, rd = M.tides.duyin[1] ? M.tides.duyin[0] / M.tides.duyin[1] : NaN;
  const C = {
    B1: { v: M.pIn / td, pass: M.pIn / td >= 0.95, txt: 'P∈[20,90] ' + r3(M.pIn / td * 100) + '%（平均 灰窯 ' + r3(M.sumP.huiyao / (td / 2)) + '、渡陰 ' + r3(M.sumP.duyin / (td / 2)) + '）', th: '≥95%' },
    B2: { v: M.b2bad, pass: M.b2bad === 0, txt: '違規鎮次 ' + M.b2bad, th: '0' },
    B3: { v: M.b3bad, pass: M.b3bad === 0, txt: 'T 越界 ' + M.b3bad + ' 次（最小 ' + r3(M.minT) + '、最高達上限的 ' + r3(M.maxTratio * 100) + '%）', th: '0 ≤ T ≤ T_CAP' },
    B4: { v: Math.min(M.b4.huiyao, M.b4.duyin) / seeds, pass: Math.min(M.b4.huiyao, M.b4.duyin) / seeds >= 0.9, txt: 'P 振幅≥6：灰窯 ' + r3(M.b4.huiyao / seeds * 100) + '%、渡陰 ' + r3(M.b4.duyin / seeds * 100) + '%', th: '≥90%' },
    B5: { v: M.b5both / seeds, pass: M.b5both / seeds >= 0.95, txt: '首尾 30 天 P 均值差≤10：兩鎮皆合 ' + r3(M.b5both / seeds * 100) + '%（灰窯 ' + r3(M.b5.huiyao / seeds * 100) + '%、渡陰 ' + r3(M.b5.duyin / seeds * 100) + '%）', th: '≥95%' },
    B6: { v: M.debtDays / td, pass: M.debtDays / td <= 0.10, txt: '欠餉日 ' + r3(M.debtDays / td * 100) + '%', th: '≤10%' },
    B7: { v: M.bIn / M.bDays, pass: M.bIn / M.bDays >= 0.95, txt: 'B∈[5,70] ' + r3(M.bIn / M.bDays * 100) + '%（平均 ' + r3(M.sumB / M.bDays) + '）', th: '≥95%' },
    B8: { v: M.rescues / (seeds * 2), pass: M.rescues / (seeds * 2) <= 0.2, txt: '求援 ' + r3(M.rescues / (seeds * 2)) + ' 次／鎮／seed', th: '≤0.2' },
    B9: { v: [rh, rd], pass: Math.abs(rh - 0.30) <= 0.10 && Math.abs(rd - 0.55) <= 0.10, txt: '自衛擊退 灰窯 ' + r3(rh * 100) + '%（' + M.tides.huiyao.join('/') + '，95%CI ' + wilson(M.tides.huiyao[0], M.tides.huiyao[1]).map((x) => r3(x * 100)).join('–') + '）、渡陰 ' + r3(rd * 100) + '%（' + M.tides.duyin.join('/') + '，95%CI ' + wilson(M.tides.duyin[0], M.tides.duyin[1]).map((x) => r3(x * 100)).join('–') + '）', th: '30%±10pp／55%±10pp' },
    B10: { v: M.b10bad, pass: M.b10bad === 0, txt: '每季 heavyOps 最少 ' + M.minHeavy + '；任一 30 天窗獸潮開始最少 ' + M.minWin, th: '皆 ≥2' },
    B11: { v: M.conserveBad, pass: M.conserveBad === 0 && M.campMin >= 60 && M.campMax <= 79, txt: '守恆違規 ' + M.conserveBad + ' 日；camp ' + M.campMin + '–' + M.campMax, th: '守恆恆成立、camp 60–79' },
  };
  return { M, C, seeds, days, avgP: { huiyao: M.sumP.huiyao / (td / 2), duyin: M.sumP.duyin / (td / 2) }, avgO: { huiyao: M.sumO.huiyao / (td / 2), duyin: M.sumO.duyin / (td / 2) }, avgB: M.sumB / M.bDays };
}
module.exports = { evalB, maxRun };
