'use strict';
/* 回歸：在指定參考根目錄下，用前一輪 sim/civ/s4.js 的 evalGroup（N=150、種子 100+i，與前一輪相同）
 * 重算「掉落 3–7（平均 5）、賞金 24／36、每頭搜尋 1h」的四個比值。用法：node sim/dev04/regress.js old|new → 印 JSON。 */
const { refRoot } = require('./ref');
const kind = process.argv[2] || 'old';
const root = refRoot(kind);
const S4 = require(root + '/sim/civ/s4');
const { CIV, civCleaner } = require(root + '/sim/civ/common');
const D = require(root + '/sim/lib/game').data();
const cache = {};
const a = S4.evalGroup([CIV], 24, 36, cache, 5), b = S4.evalGroup([civCleaner()], 24, 36, cache, 5);
const duel = {}; Object.keys(cache).forEach((k) => (duel[k] = { win: cache[k].win, hpCost: cache[k].hpCost }));
console.log(JSON.stringify({ kind, ratios: [a.ratio2, a.ratio4, b.ratio2, b.ratio4], exRate: [a.exRate, b.exRate], banditSilver: D.ENEMIES.bandit.silver, killPool: D.QUEST_GEN.kill.pool, duel }));
