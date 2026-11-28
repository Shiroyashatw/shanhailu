'use strict';
// K3 偷竊被抓率
const { r3, prob, writeCsv, verdict, clamp, prng } = require('../lib/util');
const pDetect = (O, G) => clamp(0.25 + 0.004 * O + 0.10 * G, 0.15, 0.95);
function run() {
  const places = [['灰窯起手 白天', pDetect(55, 1), 1], ['灰窯起手 黑夜', pDetect(55, 1), 0.7], ['渡陰起手 白天', pDetect(60, 2), 1], ['渡陰起手 黑夜', pDetect(60, 2), 0.7]];
  const csv = [], tab = {}; const lines = ['| 身法 | 偷竊 | 地點 | 得手率 | 發現率（得手時） | 被抓率（解析） | 蒙地卡羅 10 萬次 |', '|---|---|---|---|---|---|---|'];
  [10, 14].forEach((shen) => [0, 25].forEach((tou) => places.forEach(([pn, pd, ph]) => {
    const ps = clamp(0.30 + 0.03 * (shen - 10) + 0.006 * tou, 0.05, 0.85), det = pd * ph * 0.3, caught = (1 - ps) + ps * det;
    const r = prng(shen * 100 + tou, 'K3' + pn); let k = 0; const N = 100000; for (let i = 0; i < N; i++) { if (r() >= ps) k++; else if (r() < det) k++; }
    tab[shen + '/' + tou + '/' + pn] = caught; csv.push([shen, tou, pn, pd * ph, ps, det, caught, k / N]);
    lines.push('| ' + [shen, tou, pn + '（P_DETECT×時段 ' + r3(pd * ph) + '）', r3(ps), r3(det), r3(caught), prob(k, N)].join(' | ') + ' |');
  })));
  writeCsv('K3', ['shen', 'tou', 'place', 'p_detect_x_phase', 'p_success', 'p_detect_on_success', 'p_caught', 'p_caught_mc'], csv);
  const day = tab['10/0/灰窯起手 白天'], night = tab['10/0/灰窯起手 黑夜']; const c1 = day >= 0.30 && day <= 0.85, c2 = night / day >= 0.75;
  let minRatio = 1; [10, 14].forEach((s) => [0, 25].forEach((t) => ['灰窯起手', '渡陰起手'].forEach((p) => { minRatio = Math.min(minRatio, tab[s + '/' + t + '/' + p + ' 黑夜'] / tab[s + '/' + t + '/' + p + ' 白天']); })));
  lines.push('身法 10、偷竊 0、灰窯白天被抓率 ' + r3(day) + '（門檻 0.30–0.85）→ ' + verdict(c1) + '；黑夜÷白天 ' + r3(night / day) + '（門檻 ≥0.75）→ ' + verdict(c2) + '；全部組合的黑夜÷白天最小 ' + r3(minRatio) + '。');
  lines.push('被抓主要來自失手（失手必被發現）：身法 10、偷竊 0 時失手 70%，得手後才被看見只占 ' + r3(0.3 * 0.57 * 0.3) + '。');
  return { id: 'K3', title: '偷竊被抓率', measured: '灰窯白天 ' + r3(day) + '；黑夜 ' + r3(night) + '；黑夜÷白天 ' + r3(night / day), threshold: '0.30–0.85；黑夜÷白天 ≥0.75', pass: c1 && c2, suggest: '—', rerun: '—', lines };
}
module.exports = { run, pDetect };
