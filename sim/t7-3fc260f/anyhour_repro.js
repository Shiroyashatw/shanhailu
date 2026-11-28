'use strict';
/* 複算開發工程師的非正式 anyhour 腳本（docs/evidence/shots-shanhailu-dev02-1128/README.md:80-100）。
 * 原腳本未入庫（README：「T7.js 單行改寫，僅在本機暫存執行」），這裡是【重建】：
 *   - 讀 sim/items/T7.js 原文，只把 pickBed 那一行換成「當天 0:00 起均勻取 10 分鐘格（Math.floor(r()*144)*10），若不晚於起床就 from+60」；
 *     （在 8 個候選改寫中，只有這一種能逐位重現 README 的 mode=sim 數字，見 evidence/t7-dev02-assumptions.md）
 *   - mode=sim：T.wakeOld 暫時換成 T.wakeNew（v0.3），新舊同規則 → README 的 mode=sim 新舊完全相同；
 *   - mode=game：T.wakeNew 換成 DEV-02 的 SHL.wakeTime（含 13h 上限），T.wakeOld 換成原 v0.3 wakeNew。
 * 不改任何檔案；改寫只在記憶體中。 */
const fs = require('fs');
const path = require('path');
const T = require('../lib/time');
const { r3 } = require('../lib/util');
const LIB = path.join(__dirname, '..', 'lib') + path.sep;
const ORIG = 'const d0 = Math.floor(from / 1440) * 1440; let b = d0 + 22 * 60 + Math.round((r() * 6 - 3) * 6) * 10; if (b <= from) b = from + 60; return b;';
const REPL = 'const d0 = Math.floor(from / 1440) * 1440; let b = d0 + Math.floor(r() * 144) * 10; if (b <= from) b = from + 60; return b;';
const DEV = { // README 原文數字
  sim: { A_new: 0, A_old: 0, A_total: 34.175, B_new: 2.54, B_old: 2.54, Bo_new: 0, Bo_old: 0, done_new: 19.915, done_old: 19.915, long_new: 47.39, long_old: 47.39, sh_new: 1100.813, sh_old: 1100.813, mh_new: 14.955, mh_old: 14.955 },
  game: { A_new: 0, A_old: 15.58, A_total: 34.175, B_new: 1.16, B_old: 2.54, Bo_new: 0, Bo_old: 2.25, done_new: 22.96, done_old: 19.915, long_new: 0, long_old: 47.39, sh_new: 974.195, sh_old: 1100.813, mh_new: 13.385, mh_old: 14.955 },
};
function loadSim() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'items', 'T7.js'), 'utf8');
  if (!src.includes(ORIG)) throw new Error('T7.js pickBed 行與預期不同');
  const s = src.replace(ORIG, REPL).replace(/require\('\.\.\/lib\//g, "require('" + LIB.replace(/\\/g, '\\\\')).replace('module.exports = { run };', 'module.exports = { simulate };');
  const m = { exports: {} }; new Function('module', 'require', s)(m, require); return m.exports.simulate;
}
function run(implWake) {
  const sim = loadSim(); const w0 = T.wakeNew, o0 = T.wakeOld; const rows = [], lines = [];
  for (const mode of ['sim', 'game']) {
    if (mode === 'sim') { T.wakeOld = w0; } else { T.wakeNew = implWake; T.wakeOld = w0; }
    const tot = { new: {}, old: {} }, raw = { new: { expired: 0, overslept: 0 }, old: { expired: 0, overslept: 0 } };
    for (let seed = 0; seed < 200; seed++) ['new', 'old'].forEach((k) => { const o = sim(seed, k, true); Object.keys(o).forEach((x) => (tot[k][x] = (tot[k][x] || 0) + o[x])); const q = sim(seed, k, false); raw[k].expired += q.expired; raw[k].overslept += q.overslept; });
    T.wakeNew = w0; T.wakeOld = o0;
    const p = (x) => x / 200; const d = DEV[mode];
    const M = [['A 睡過頭時段期限', p(raw.new.overslept), p(raw.old.overslept), d.A_new, d.A_old], ['A 全部期限（舊）', p(raw.new.expired), p(raw.old.expired), d.A_total, d.A_total], ['B 過期', p(tot.new.expired), p(tot.old.expired), d.B_new, d.B_old], ['B 因睡過頭', p(tot.new.overslept), p(tot.old.overslept), d.Bo_new, d.Bo_old], ['B 完成件數', p(tot.new.done), p(tot.old.done), d.done_new, d.done_old], ['睡 >13h 次數', p(tot.new.longSleeps), p(tot.old.longSleeps), d.long_new, d.long_old], ['總睡眠時數', p(tot.new.sleepH), p(tot.old.sleepH), d.sh_new, d.sh_old], ['睡著沒聽到傳聞', p(tot.new.missedHear), p(tot.old.missedHear), d.mh_new, d.mh_old]];
    lines.push('mode=' + mode + '（新＝' + (mode === 'sim' ? 'v0.3' : 'DEV-02 wakeTime') + '，舊＝v0.3）'); lines.push('| 指標 | 新 複算 | 舊 複算 | 新 README | 舊 README | 一致 |'); lines.push('|---|---|---|---|---|---|');
    M.forEach(([n, a, b, c, e]) => {
      const same = n === 'A 全部期限（舊）' ? r3(b) === r3(e) : r3(a) === r3(c) && r3(b) === r3(e);
      lines.push('| ' + n + ' | ' + r3(a) + ' | ' + r3(b) + ' | ' + (n === 'A 全部期限（舊）' ? '—' : r3(c)) + ' | ' + r3(e) + ' | ' + (same ? '是' : '否') + ' |');
      rows.push([mode, n, a, b, n === 'A 全部期限（舊）' ? '' : c, e, same ? 1 : 0]);
    });
  }
  return { rows, lines };
}
module.exports = { run, REPL };
