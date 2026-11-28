'use strict';
// T7 睡眠最短 6 小時（量測＋健全檢查）
const T = require('../lib/time');
const { data } = require('../lib/game');
const { r3, writeCsv, verdict, prng, mean } = require('../lib/util');
const SEEDS = 200, DAYS = 60;
/* 【假設】玩家每晚 22:00±3h（均勻）就寢；醒著的每小時都拿去做「期限最近」的那件事：
 * 傳聞要 6 個清醒小時（來回＋查證）、獸潮要 6 個清醒小時（殺滿 4 頭）。期限：傳聞 day−r.day>=RUMOR.days（game.js:1023）、獸潮 day>end（game.js:1129）。
 * 「因睡過頭過期」＝期限落在睡眠中，且當時已連續睡超過新規則該睡的時數（max(6h, 到下一個 08:00)）。 */
function simulate(seed, rule, work) {
  const D = data(); const r = prng(seed, 'T7'); const wake = rule === 'new' ? T.wakeNew : T.wakeOld;
  const tr = prng(seed, 'T7-world'); // 世界事件（傳聞出現、獸潮排程）新舊規則共用同一序列
  let next = D.TIDE.first[0] + Math.floor(tr() * 2); const tides = [];
  for (let d = next; d <= DAYS; ) { tides.push({ kind: 'tide', born: (d - 1) * 1440, due: (d - 1 + D.TIDE.days) * 1440, need: 36, done: 0 }); d += D.TIDE.days + D.TIDE.gap[0] + Math.floor(tr() * 3); }
  const rumorDays = []; for (let d = 1; d <= DAYS; d++) if (tr() < 0.5) rumorDays.push(d);
  let t = T.DAY_START; const items = []; const res = { expired: 0, overslept: 0, done: 0, sleepH: 0, longSleeps: 0, heard: 0, missedHear: 0 };
  let ti = 0, ri = 0, asleepUntil = 0, sleepStart = 0, bed = null;
  const pickBed = (from) => { const d0 = Math.floor(from / 1440) * 1440; let b = d0 + 22 * 60 + Math.round((r() * 6 - 3) * 6) * 10; if (b <= from) b = from + 60; return b; };
  bed = pickBed(t);
  const end = DAYS * 1440;
  for (; t < end; t += 10) {
    const asleep = t < asleepUntil;
    while (ti < tides.length && tides[ti].born <= t) items.push(tides[ti++]);
    // 傳聞：當天 12:00 在客棧聽到（醒著才聽得到；最多 RUMOR.max 則）
    while (ri < rumorDays.length && (rumorDays[ri] - 1) * 1440 + 720 <= t) { const d = rumorDays[ri++]; if (asleep) { res.missedHear++; if (!work) items.push({ kind: 'rumor', born: t, due: (d - 1 + D.RUMOR.days) * 1440, need: 36, done: 0 }); } else if (items.filter((x) => x.kind === 'rumor' && !x.closed).length < D.RUMOR.max) { items.push({ kind: 'rumor', born: t, due: (d - 1 + D.RUMOR.days) * 1440, need: 36, done: 0 }); res.heard++; } }
    items.forEach((x) => { if (!x.closed && x.due <= t) { x.closed = true; res.expired++; if (asleep && t - sleepStart > (T.wakeNew(sleepStart) - sleepStart)) res.overslept++; } });
    if (!asleep) {
      if (t >= bed) { sleepStart = t; asleepUntil = wake(t); const h = (asleepUntil - t) / 60; res.sleepH += h; if (h > 13) res.longSleeps++; bed = pickBed(asleepUntil); continue; }
      const x = items.filter((y) => !y.closed).sort((a, b) => a.due - b.due)[0];
      if (x && work) { x.done++; if (x.done >= x.need) { x.closed = true; res.done++; } }
    }
  }
  return res;
}
function run() {
  const csv = []; let maxNew = 0, maxOld = 0;
  for (let m = 0; m < 1440; m += 10) { const n = (T.wakeNew(m) - m) / 60, o = (T.wakeOld(m) - m) / 60; maxNew = Math.max(maxNew, n); maxOld = Math.max(maxOld, o); csv.push(['bedtime', T.fmtClock(m), n, o]); }
  const sl = (m, f) => (f(m) - m) / 60;
  const s = sl(0, T.wakeNew) === 8 && sl(180, T.wakeNew) === 6 && sl(420, T.wakeNew) === 6 && sl(1200, T.wakeNew) === 12 && sl(0, T.wakeOld) === 32;
  const tot = { new: { expired: 0, overslept: 0, done: 0, sleepH: 0, longSleeps: 0, heard: 0, missedHear: 0 }, old: { expired: 0, overslept: 0, done: 0, sleepH: 0, longSleeps: 0, heard: 0, missedHear: 0 } };
  const raw = { new: { expired: 0, overslept: 0 }, old: { expired: 0, overslept: 0 } };
  for (let seed = 0; seed < SEEDS; seed++) ['new', 'old'].forEach((k) => { const o = simulate(seed, k, true); Object.keys(o).forEach((x) => (tot[k][x] += o[x])); const q = simulate(seed, k, false); raw[k].expired += q.expired; raw[k].overslept += q.overslept; });
  ['new', 'old'].forEach((k) => csv.push(['sim_' + k, 'expired=' + tot[k].expired, tot[k].overslept, tot[k].done]));
  writeCsv('T7', ['kind', 'bedtime_or_metric', 'new_sleep_h_or_overslept', 'old_sleep_h_or_done'], csv);
  const ok = s && tot.new.expired <= tot.old.expired && tot.new.overslept <= tot.old.overslept && raw.new.overslept <= raw.old.overslept;
  const per = (x) => r3(x / SEEDS);
  const lines = ['就寢時刻掃描（每 10 分鐘，見 csv）：新規則睡 6–' + r3(maxNew) + ' 小時；舊規則 ' + r3(Math.min(...csv.filter((c) => c[0] === 'bedtime').map((c) => c[3]))) + '–' + r3(maxOld) + ' 小時。',
    '健全檢查：新 00:00→' + sl(0, T.wakeNew) + 'h、03:00→' + sl(180, T.wakeNew) + 'h、07:00→' + sl(420, T.wakeNew) + 'h、20:00→' + sl(1200, T.wakeNew) + 'h；舊 00:00→' + sl(0, T.wakeOld) + 'h → ' + verdict(s),
    '| 每 seed 60 天平均 | 新規則 | 舊規則 |', '|---|---|---|',
    '| A 不處理任何事件：期限落在「睡過頭」那段睡眠裡的次數 | ' + per(raw.new.overslept) + ' | ' + per(raw.old.overslept) + '（全部期限 ' + per(raw.old.expired) + ' 個） |',
    '| B 有在處理：期限過期（傳聞＋獸潮）次數 | ' + per(tot.new.expired) + ' | ' + per(tot.old.expired) + ' |',
    '| B 其中「因睡過頭」過期 | ' + per(tot.new.overslept) + ' | ' + per(tot.old.overslept) + ' |',
    '| B 完成件數 | ' + per(tot.new.done) + ' | ' + per(tot.old.done) + ' |',
    '| 睡超過 13 小時的次數 | ' + per(tot.new.longSleeps) + ' | ' + per(tot.old.longSleeps) + ' |',
    '| 總睡眠時數 | ' + per(tot.new.sleepH) + ' | ' + per(tot.old.sleepH) + ' |',
    '| 睡著而沒聽到當天的傳聞 | ' + per(tot.new.missedHear) + ' | ' + per(tot.old.missedHear) + ' |',
    '註：新規則照字面「max(now+6h, 下一個 08:00)」，08:10 之後的白天就寢會一路睡到隔天 08:00（最長 ' + r3(maxNew) + ' 小時），列為待決 Q-T7。',
    '期限過期次數 新 ≤ 舊 → ' + verdict(tot.new.expired <= tot.old.expired) + '（傳聞期限 ' + data().RUMOR.days + ' 天 data.js:428、獸潮 ' + data().TIDE.days + ' 天 data.js:454）'];
  return { id: 'T7', title: '睡眠最短 6 小時（量測）', measured: '期限落在睡過頭時段／seed：新 ' + per(raw.new.overslept) + '、舊 ' + per(raw.old.overslept) + '；有處理時過期：新 ' + per(tot.new.expired) + '、舊 ' + per(tot.old.expired) + '；完成件數 新 ' + per(tot.new.done) + '／舊 ' + per(tot.old.done), threshold: '健全檢查 8／6／6／12h、舊 32h；新過期 ≤ 舊', pass: ok, suggest: '—', rerun: '—', lines };
}
module.exports = { run };
