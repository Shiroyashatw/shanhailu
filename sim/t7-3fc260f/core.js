'use strict';
/* （num-shl-t7-3fc260f：複製自 sim/t7/core.js，只在最後多記 tideDoneSum／tideDoneN＝「有完成」的獸潮件 出現→完成 小時，流程不變）
 * T7 情境模擬：simulate() 逐行沿用 sim/items/T7.js（numbers/num-shl-b1-sim@e76bf93，與 num-shl-b1-k1 同檔）的 simulate，
 * 只改三處（皆為參數化，不改原邏輯）：
 *   1) 起床函式 wake 由參數傳入（原本 rule==='new'?T.wakeNew:T.wakeOld）；
 *   2) 「睡過頭」的參考時數 ref 由參數傳入（原本固定 T.wakeNew）；
 *   3) 就寢時刻 pickBed 由 bedMode 決定：'orig'＝原 22:00±3h；'slot'＝每天固定同一分鐘 m；'rand'＝每次就寢在 0:00–23:59 均勻抽一分鐘。
 * 另加記錄（不影響流程）：tideFinish＝各獸潮 出現→完成 小時總和（未完成記到期），expAsleep＝睡著時過期的件數（不依賴參考規則）、delaySum/delayN＝完成件的 出現→完成 時間、perSleep 睡眠時長。 */
const { data } = require('../lib/game');
const { prng } = require('../lib/util');
const T = require('../lib/time');
const DAYS = 60;
function simulate(seed, wake, ref, work, bedMode, bedArg) {
  const D = data(); const r = prng(seed, 'T7');
  const tr = prng(seed, 'T7-world'); // 世界事件新舊規則共用同一序列（原檔）
  let next = D.TIDE.first[0] + Math.floor(tr() * 2); const tides = [];
  for (let d = next; d <= DAYS; ) { tides.push({ kind: 'tide', born: (d - 1) * 1440, due: (d - 1 + D.TIDE.days) * 1440, need: 36, done: 0 }); d += D.TIDE.days + D.TIDE.gap[0] + Math.floor(tr() * 3); }
  const rumorDays = []; for (let d = 1; d <= DAYS; d++) if (tr() < 0.5) rumorDays.push(d);
  let t = T.DAY_START; const items = [];
  const res = { expired: 0, overslept: 0, done: 0, sleepH: 0, longSleeps: 0, heard: 0, missedHear: 0, expAsleep: 0, delaySum: 0, delayN: 0, tideFinish: 0, sleeps: 0, minSleep: Infinity, maxSleep: 0 };
  let ti = 0, ri = 0, asleepUntil = 0, sleepStart = 0, bed = null;
  const pickBed = (from) => {
    const d0 = Math.floor(from / 1440) * 1440;
    if (bedMode === 'orig') { let b = d0 + 22 * 60 + Math.round((r() * 6 - 3) * 6) * 10; if (b <= from) b = from + 60; return b; }
    const m = bedMode === 'slot' ? bedArg : Math.floor(r() * 1440);
    let b = d0 + m; if (b <= from) b += 1440; return b;
  };
  bed = pickBed(t);
  const end = DAYS * 1440;
  for (; t < end; t += 10) {
    const asleep = t < asleepUntil;
    while (ti < tides.length && tides[ti].born <= t) items.push(tides[ti++]);
    while (ri < rumorDays.length && (rumorDays[ri] - 1) * 1440 + 720 <= t) { const d = rumorDays[ri++]; if (asleep) { res.missedHear++; if (!work) items.push({ kind: 'rumor', born: t, due: (d - 1 + D.RUMOR.days) * 1440, need: 36, done: 0 }); } else if (items.filter((x) => x.kind === 'rumor' && !x.closed).length < D.RUMOR.max) { items.push({ kind: 'rumor', born: t, due: (d - 1 + D.RUMOR.days) * 1440, need: 36, done: 0 }); res.heard++; } }
    items.forEach((x) => { if (!x.closed && x.due <= t) { x.closed = true; res.expired++; if (asleep) res.expAsleep++; if (asleep && t - sleepStart > (ref(sleepStart) - sleepStart)) res.overslept++; } });
    if (!asleep) {
      if (t >= bed) { sleepStart = t; asleepUntil = wake(t); const h = (asleepUntil - t) / 60; res.sleepH += h; if (h > 13) res.longSleeps++; res.sleeps++; res.minSleep = Math.min(res.minSleep, h); res.maxSleep = Math.max(res.maxSleep, h); bed = pickBed(asleepUntil); continue; }
      const x = items.filter((y) => !y.closed).sort((a, b) => a.due - b.due)[0];
      if (x && work) { x.done++; if (x.done >= x.need) { x.closed = true; x.fin = t + 10; res.done++; res.delaySum += (t + 10 - x.born) / 60; res.delayN++; } }
    }
  }
  // 配對延誤（無選擇偏差）：獸潮事件在各規則下完全相同（同 seed 的 T7-world 序列），每件記 出現→完成 小時；過期或到 60 天仍未完成記 到期→出現（上限）
  tides.forEach((x) => { res.tideFinish += ((x.fin !== undefined ? x.fin : x.due) - x.born) / 60; });
  res.tideN = tides.length;
  res.tideDoneSum = 0; res.tideDoneN = 0; tides.forEach((x) => { if (x.fin !== undefined) { res.tideDoneSum += (x.fin - x.born) / 60; res.tideDoneN++; } });
  return res;
}
module.exports = { simulate, DAYS };
