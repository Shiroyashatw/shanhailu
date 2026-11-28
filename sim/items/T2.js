'use strict';
// T2 天候頻率
const T = require('../lib/time');
const { r3, writeCsv, verdict } = require('../lib/util');
function run() {
  const N = 1000, cnt = [0, 1, 2, 3].map(() => [0, 0, 0, 0]); let zeroViol = 0;
  for (let seed = 0; seed < N; seed++) for (let wd = 0; wd < 120; wd++) {
    const s = Math.floor(wd / 30), k = T.WX.indexOf(T.weatherOfWday(seed, wd)); cnt[s][k]++;
    if (T.WX_WEIGHT[s][k] === 0) zeroViol++;
  }
  const SN = ['春', '夏', '秋', '冬'], WN = ['晴', '雨', '霧', '雪']; const csv = []; let ok = zeroViol === 0; const bad = [];
  for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) {
    const days = s === 0 ? 29 : 30; let exp = days * T.WX_WEIGHT[s][k] / 100 + (s === 0 && k === 0 ? 1 : 0);
    const got = cnt[s][k] / N; const dev = exp ? (got - exp) / exp : 0; const pass = exp === 0 ? cnt[s][k] === 0 : Math.abs(dev) <= 0.15;
    if (!pass) { ok = false; bad.push(SN[s] + WN[k]); }
    csv.push([SN[s], WN[k], exp, got, exp ? dev * 100 : 0, pass ? 'pass' : 'FAIL']);
  }
  writeCsv('T2', ['season', 'weather', 'expected_days', 'mean_days', 'deviation_pct', 'pass'], csv);
  const worst = csv.filter((r) => r[2] > 0).sort((a, b) => Math.abs(b[4]) - Math.abs(a[4]))[0];
  const lines = ['| 季 | 晴 | 雨 | 霧 | 雪 |', '|---|---|---|---|---|'];
  for (let s = 0; s < 4; s++) lines.push('| ' + SN[s] + ' | ' + [0, 1, 2, 3].map((k) => r3(cnt[s][k] / N) + '（期望 ' + r3(csv[s * 4 + k][2]) + '）').join(' | ') + ' |');
  lines.push('期望為 0 的格出現次數：' + zeroViol + '；最大相對偏差：' + worst[0] + worst[1] + ' ' + r3(worst[4]) + '%。春季期望＝29 天抽樣＋第 0 日固定晴。');
  return { id: 'T2', title: '天候頻率', measured: '最大偏差 ' + worst[0] + worst[1] + ' ' + r3(worst[4]) + '%；零格違規 ' + zeroViol, threshold: '每格 ±15%；零格全 0', pass: ok, suggest: bad.length ? bad.join('、') : '—', rerun: '—', lines };
}
module.exports = { run };
