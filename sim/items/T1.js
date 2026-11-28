'use strict';
// T1 半年生存曲線
const T = require('../lib/time');
const { data } = require('../lib/game');
const { r3, pct, prob, writeCsv, verdict, mean } = require('../lib/util');
const SEEDS = 200;

// 標準日：08:00–22:00 活動（灰窯↔野徑岔口 1h＋採集 1h＋回程 1h 為一趟），22:00 客棧睡到 08:00
function runSeason(seed, season, meals, mode, curve, opt) {
  opt = opt || {};
  const edge = data().EDGES.find((e) => e.a === 'huiyao' && e.b === 'chakou'); // data.js:191
  const b = T.newBody(); const tStart = season * 30 * 1440 + T.DAY_START; let t = tStart;
  const out = { wildDays: [], extra: 0 };
  for (let d = 0; d < 30 && !b.dead; d++) {
    const day0 = t; let dMaxCold = 0, dMaxFat = 0, dMinFood = 999;
    const step = (mins, ctx) => { // 分段推進，途中在指定整點進食
      let left = mins;
      while (left > 0 && !b.dead) {
        const m = T.minOfDay(t);
        if (meals.includes(m / 60)) { if (!(opt.skipFirst && t === tStart)) T.eat(b, 35); }
        else if (opt.adaptive && b.food < 30 && ctx.act === 'awake') { T.eat(b, 35); out.extra++; }
        const go = Math.min(left, 60 - (m % 60));
        const f0 = b.minFood, c0 = b.maxCold; b.minFood = 999; b.maxCold = 0; b.maxFat = 0;
        t = T.advance(b, t, go, Object.assign({ seed }, ctx));
        dMinFood = Math.min(dMinFood, b.minFood); dMaxCold = Math.max(dMaxCold, b.maxCold); dMaxFat = Math.max(dMaxFat, b.maxFat);
        b.minFood = Math.min(f0, b.minFood); b.maxCold = Math.max(c0, b.maxCold);
        left -= go;
      }
    };
    if (mode === 'std') {
      for (let trip = 0; trip < 4; trip++) { // 4 趟 ×3h＝08:00–20:00
        step(edge.h * 60, { place: 'wild', act: 'awake', fatRate: 3 }); // 趕路疲累 3/h（game.js:640）
        step(60, { place: 'wild', act: 'awake', fatRate: 4 }); // 採藥 4/h（game.js:1267）
        step(edge.h * 60, { place: 'wild', act: 'awake', fatRate: 3 });
      }
      step(120, { place: 'street', act: 'awake' });
    } else { // 冬季整天野外作業 08:00–17:00，17:00 已在城裡
      step(540, { place: 'wild', act: 'awake' });
      out.wildDays.push({ d: d + 1, wx: T.weatherOfWday(seed, T.wdayOf(day0)), maxCold: dMaxCold, trans: d + 1 >= 26 });
      step(300, { place: 'street', act: 'awake' });
    }
    step(600, { place: 'indoor', act: 'inn', sleepGuard: true });
    T.innWake(b);
    if (curve) { const c = curve[d] || (curve[d] = { minFood: 0, maxCold: 0, maxFat: 0, hp: 0, n: 0 }); c.minFood += dMinFood; c.maxCold += dMaxCold; c.maxFat += dMaxFat; c.hp += b.hp; c.n++; }
  }
  out.b = b; out.tStart = tStart; return out;
}
function run() {
  const groups = [[0, [8, 18], 'std', '春2餐'], [1, [8, 18], 'std', '夏2餐'], [2, [8, 18], 'std', '秋2餐'], [3, [8, 18], 'std', '冬2餐'], [3, [8, 13, 18], 'std', '冬3餐'], [3, [8, 13, 18], 'wild', '冬野外作業3餐'],
    [3, [8, 18], 'std', '冬2餐(首日不吃早餐)', { skipFirst: true }], [3, [8, 18], 'std', '冬2餐+餓了補一餐', { adaptive: true }]];
  const csv = [], res = {}, lines = [];
  groups.forEach(([s, meals, mode, name, opt]) => {
    const curve = []; let ok30 = 0, dead = 0, extra = 0; const first30 = [], wild = [], deadDay = [];
    for (let seed = 0; seed < SEEDS; seed++) {
      const o = runSeason(seed, s, meals, mode, curve, opt);
      if (o.b.minFood >= 30) ok30++;
      if (o.b.dead) { dead++; deadDay.push((o.b.tFirst.dead - s * 30 * 1440) / 1440 + 1); }
      if (o.b.tFirst.food30 !== undefined) first30.push(o.b.tFirst.food30 - s * 30 * 1440);
      extra += o.extra; o.wildDays.forEach((w) => wild.push(w));
    }
    curve.forEach((c, i) => csv.push([name, i + 1, c.n, c.minFood / c.n, c.maxCold / c.n, c.maxFat / c.n, c.hp / c.n]));
    res[name] = { ok30, dead, first30, wild, deadDay, extra };
  });
  writeCsv('T1', ['group', 'day', 'alive_seeds', 'mean_min_food', 'mean_max_cold', 'mean_max_fat', 'mean_hp_morning'], csv);
  const c1 = ['春2餐', '夏2餐', '秋2餐'].every((k) => res[k].ok30 === SEEDS);
  const w2 = res['冬2餐'], w3 = res['冬3餐'], wo = res['冬野外作業3餐'], alt = res['冬2餐(首日不吃早餐)'], ad = res['冬2餐+餓了補一餐'];
  const c2 = w3.ok30 === SEEDS;
  const wd = wo.wild.filter((w) => !w.trans), snowT = wo.wild.filter((w) => w.trans && w.wx === 'snow');
  const sunny = wd.filter((w) => w.wx !== 'snow'), snow = wd.filter((w) => w.wx === 'snow');
  const mx = (a) => (a.length ? Math.max(...a.map((w) => w.maxCold)) : NaN), mn = (a) => (a.length ? Math.min(...a.map((w) => w.maxCold)) : NaN);
  const c3 = mx(sunny) < 30 && mn(snow) >= 30 && mx(snow) < 60 && wo.dead === 0;
  const core = ['春2餐', '夏2餐', '秋2餐', '冬3餐', '冬野外作業3餐'];
  const deadCore = core.reduce((a, k) => a + res[k].dead, 0), c4 = deadCore + w2.dead === 0;
  const tf = (a) => '冬季' + T.fmtT(Math.round(mean(a)));
  lines.push('① 春／夏／秋 2 餐飽食最低 ≥30 的 seed：' + ['春2餐', '夏2餐', '秋2餐'].map((k) => k + ' ' + prob(res[k].ok30, SEEDS)).join('；') + ' → ' + verdict(c1));
  lines.push('② 冬 2 餐進入 <30 的 seed：' + prob(SEEDS - w2.ok30, SEEDS) + '；首次進入＝' + tf(w2.first30) + '（腳本第 1 日 08:00 有吃早餐、飽食上限 100）。若第 1 日 08:00 不吃（對得上手算數字的走法）：' + tf(alt.first30) + ' 降到 29.375（＝手算 29.4，但時刻是第 2 日 08:00 起床前，不是傍晚）。冬 3 餐 ≥30：' + prob(w3.ok30, SEEDS) + ' → ' + verdict(c2));
  lines.push('③ 冬季白天野外作業（3 餐；第 1–25 日）：晴／霧日寒意日內最高 max=' + r3(mx(sunny)) + '（門檻 <30，手算 18，' + sunny.length + ' 日）；雪日 min=' + r3(mn(snow)) + '、max=' + r3(mx(snow)) + '（門檻 30–60，手算 36，' + snow.length + ' 日）；死亡 ' + wo.dead + ' → ' + verdict(c3));
  lines.push('　 換季日（冬季第 26–30 日，S_eff=floor((3+0)/2+0.5)=2）雪日寒意最高 ' + r3(mn(snowT)) + '–' + r3(mx(snowT)) + '（' + snowT.length + ' 日）：不到 30，未計入 ③，見待決 Q-T1c。');
  lines.push('④ 死亡：春夏秋 2 餐＋冬 3 餐＋冬野外 3 餐 合計 ' + deadCore + '/' + SEEDS * 5 + '；**冬 2 餐（固定兩餐、餓了也不補）' + prob(w2.dead, SEEDS) + ' 餓死**，平均死於冬季第 ' + r3(mean(w2.deadDay)) + ' 日（每日消耗 14h×5＋10h×1.5625＝85.625 > 兩餐 70，淨 −15.625／日；飽食歸零後清醒時 −3hp/h，客棧睡眠保護只保睡覺那段）→ ' + verdict(c4));
  lines.push('重跑（建議值）：冬 2 餐＋「飽食 <30 就補一餐 +35」：死亡 ' + prob(ad.dead, SEEDS) + '，30 天平均多吃 ' + r3(ad.extra / SEEDS) + ' 餐 → ' + verdict(ad.dead === 0));
  const ok = c1 && c2 && c3 && c4;
  return { id: 'T1', title: '半年生存曲線', measured: '春夏秋 2 餐 ≥30：' + pct(Math.min(res['春2餐'].ok30, res['夏2餐'].ok30, res['秋2餐'].ok30) / SEEDS) + '；冬 2 餐進 <30：' + pct((SEEDS - w2.ok30) / SEEDS) + '（' + tf(w2.first30) + '）且餓死 ' + pct(w2.dead / SEEDS) + '；冬 3 餐 ≥30：' + pct(w3.ok30 / SEEDS) + '；冬野外寒意 晴 ' + r3(mx(sunny)) + '／雪 ' + r3(mn(snow)) + '；其餘組死亡 ' + deadCore,
    threshold: '①100%；②冬 3 餐 100%；③晴 <30、雪 30–60；④全組死亡 0', pass: ok, passNote: !c4 && c1 && c2 && c3 ? '①②③通過；④因「冬 2 餐固定不補」組餓死而未通過' : '',
    suggest: c4 ? '—' : '冬季 2 餐不可持續（淨 −15.625／日）是規格本意；④ 應排除該組，或腳本改「餓了（<30）補一餐」', rerun: c4 ? '—' : '冬 2 餐＋餓了補一餐：死亡 ' + pct(ad.dead / SEEDS) + '、30 天多吃 ' + r3(ad.extra / SEEDS) + ' 餐（' + verdict(ad.dead === 0) + '）', lines };
}
module.exports = { run };
