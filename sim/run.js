'use strict';
// 單項執行：node sim/run.js T1
const id = process.argv[2];
if (!id) { console.error('用法：node sim/run.js <項目編號，如 T1>'); process.exit(1); }
const r = require('./items/' + id + '.js').run();
console.log('[' + r.id + '] ' + r.title + ' → ' + (r.pass === null ? '量測' : r.pass ? '通過' : '未通過') + (r.passNote ? '（' + r.passNote + '）' : ''));
console.log('  實測：' + r.measured + '\n  門檻：' + r.threshold + '\n  建議：' + r.suggest + '\n  重跑：' + r.rerun);
(r.lines || []).forEach((l) => console.log('  ' + l));
