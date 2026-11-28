'use strict';
// S2 參數敏感度：一次只動一個，重跑 B 組 B1–B9
const Wd = require('../lib/world');
const { evalB } = require('../lib/beval');
const { r3, writeCsv, verdict } = require('../lib/util');
const D0 = Wd.DEFAULTS; const KEYS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];
const sc = (o, f) => { const r = {}; Object.keys(o).forEach((k) => (r[k] = o[k] * f)); return r; };
function cases() {
  const out = [];
  [0.8, 1.2].forEach((f) => {
    out.push(['K_TAX ×' + f, { K_TAX: sc(D0.K_TAX, f) }]);
    out.push(['PATROL ×' + f + '（→' + D0.PATROL.map((x) => Math.round(x * f)).join('/') + '）', { PATROL: D0.PATROL.map((x) => Math.round(x * f)) }]);
    out.push(['P_DEF ×' + f, { P_DEF: D0.P_DEF.map((x) => Math.min(1, x * f)) }]);
    out.push(['PNOISE 幅度 ×' + f, { PNOISE: f }]);
    out.push(['人手回補週期 ×' + f + '（→' + Math.round(5 * f) + ' 天）', { CREW_PERIOD: Math.round(5 * f) }]);
  });
  out.push(['crewCap 3/5', { CREW_CAP: [3, 5] }]); out.push(['crewCap 5/7', { CREW_CAP: [5, 7] }]);
  return out;
}
function run() {
  const csv = [], lines = ['| 擾動 | ' + KEYS.join(' | ') + ' | 結果 |', '|---|' + KEYS.map(() => '---').join('|') + '|---|']; const failed = [];
  const one = (name, params) => {
    const B = evalB({ params, noQuests: true }, 200, 120); const fs = KEYS.filter((k) => !B.C[k].pass);
    csv.push([name].concat(KEYS.map((k) => (B.C[k].pass ? 'pass' : 'FAIL') + ': ' + B.C[k].txt)));
    lines.push('| ' + name + ' | ' + KEYS.map((k) => (B.C[k].pass ? '✓' : '✗')).join(' | ') + ' | ' + (fs.length ? '未通過：' + fs.map((k) => k + '（' + B.C[k].txt + '）').join('；') : '通過') + ' |');
    return fs;
  };
  cases().forEach(([name, params]) => { const fs = one(name, params); if (fs.length) failed.push([name, fs]); });
  let sug = '—', rer = '—';
  if (failed.length) {
    lines.push('', '重跑（建議值，一輪）：');
    lines.push('| 擾動 | ' + KEYS.join(' | ') + ' | 結果 |', '|---|' + KEYS.map(() => '---').join('|') + '|---|');
    const sugs = [], rers = [];
    if (failed.some(([nm]) => nm.startsWith('K_TAX'))) {
      // 兩鎮稅收對軍費的餘裕都只有 0–10%：要撐住 −20%，K_TAX 需 ≥ UPKEEP/(0.8·P̄·(0.6+0.004·Ō)) ≈ 灰窯 0.51、渡陰 1.42；取 0.56／1.45
      const k = { huiyao: 0.56, duyin: 1.45 };
      const fs0 = one('K_TAX 灰窯 0.56／渡陰 1.45（建議）本身', { K_TAX: k });
      const fs = one('K_TAX 建議值再 ×0.8 → 0.448／1.16', { K_TAX: { huiyao: k.huiyao * 0.8, duyin: k.duyin * 0.8 } });
      sugs.push('K_TAX 灰窯 0.45→0.56、渡陰 1.15→1.45（現值下稅收只比軍費多 0–10%，撐不住 −20%；或等效地調低 UPKEEP）'); rers.push('K_TAX 0.56／1.45：本身 ' + verdict(!fs0.length) + '；再 ×0.8 ' + verdict(!fs.length) + (fs.length ? '（' + fs.join('、') + '）' : ''));
    }
    if (failed.some(([nm]) => nm.startsWith('P_DEF'))) {
      // B9 的中心值就是 P_DEF 本身，±20% 時渡陰 0.44／0.66 本來就落在 55%±10pp 之外；容許擾動縮到 ±10%
      const f1 = one('P_DEF ×0.9（建議的容許範圍）', { P_DEF: D0.P_DEF.map((x) => x * 0.9) }), f2 = one('P_DEF ×1.1（建議的容許範圍）', { P_DEF: D0.P_DEF.map((x) => x * 1.1) });
      sugs.push('P_DEF 不改值；敏感度的容許擾動縮到 ±10%（B9 的 ±10pp 以 P_DEF 為中心，±20% 必然出界）'); rers.push('P_DEF ×0.9 ' + verdict(!f1.length) + '、×1.1 ' + verdict(!f2.length));
    }
    failed.filter(([nm]) => !nm.startsWith('K_TAX') && !nm.startsWith('P_DEF')).forEach(([nm]) => { sugs.push(nm + '：無建議值'); rers.push(nm + '：未重跑'); });
    sug = sugs.join('；'); rer = rers.join('；');
  }
  writeCsv('S2', ['perturbation'].concat(KEYS), csv);
  const n = cases().length;
  return { id: 'S2', title: '參數敏感度', measured: (n - failed.length) + '/' + n + ' 個擾動 B1–B9 全過' + (failed.length ? '；未通過：' + failed.map(([nm, fs]) => nm + '→' + fs.join('/')).join('；') : ''), threshold: '每個擾動 B1–B9 全過', pass: failed.length === 0, suggest: sug, rerun: rer, lines };
}
module.exports = { run };
