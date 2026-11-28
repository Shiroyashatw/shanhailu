'use strict';
// B2 販人各階壽命與被抓前收入
const { r3, prob, writeCsv, verdict, prng, clamp, mean, median } = require('../lib/util');
const N = 1000, DAYS = 120, H = 18, S_ALLEY = 1.21;
/* 【假設】
 * - 各階每天做滿上限：把風 3 班／夜；押手 ≤2 單（金嫂派單）；掌帳 ≤3 單；分櫃 自營 1 單／日。單型（兵源／祭品／換骨）三選一均勻，n 在區間內均勻。
 * - 押手、掌帳、分櫃每單都要從人手池拿 n 人（池：初始 0、每 wday +3、上限 24、≤camp）；池不夠就做不了。難民營用簡化式：每日 arrive 3、settle floor(camp/20)。
 * - 工時：把風 3h／班；押手 h_route＋1h 交接；掌帳 1h；分櫃自營單 2h（規格沒給，取能重現規格表 33 兩/時 的量級）。
 * - 暴露：p_expose×S_pub（後巷 1.21；祭品單在野外交接 1.0），無官面掩護。暴露後盤查：說服 clamp(0.3−0.004×30−0.15,0.05,0.9)=0.05（起手口才 10、說服 0，ΔW=販人 30），
 *   不可賄賂；拋貨逃走 clamp(0.35+夜 0.10,0.10,0.75)=0.45；兩者皆敗＝被捕。逃掉不算被抓（W 的後果不在本項）。
 * - 判決：J＝Jk＋2（販人）＋2（無撈人管道）＋販人階加分（規格沒給：把風 0／押手 1／掌帳 2／分櫃 3）；善惡：把風每班輕惡 −2、其餘每單重惡 −50×弱者 2＝−100（下限 −200）。
 * - 風險調整後時薪＝120 天內實際拿到的錢 ÷「沒被抓的話這 120 天會做的工時」（被抓＝之後收入歸零）。 */
const TYPES = [{ k: '兵源', P: 30, n: [4, 6], h: 1, m: 1.0, px: 0.06, sp: S_ALLEY }, { k: '祭品', P: 45, n: [3, 5], h: 5, m: 1.3, px: 0.10, sp: 1.0 }, { k: '換骨', P: 38, n: [3, 5], h: 0.5, m: 1.0, px: 0.05, sp: S_ALLEY }];
const TIERS = [{ id: '把風', spec: 4, bonus: 0 }, { id: '押手', spec: 15, bonus: 1 }, { id: '掌帳', spec: 18.5, bonus: 2 }, { id: '分櫃', spec: 33, bonus: 3 }];
const P_FAIL = (1 - 0.05) * (1 - 0.45);
function one(seed, tier, usePool) {
  const r = prng(seed, 'B2' + tier.id); let camp = 60, pool = 0, K = 0, caught = null, income = 0, hours = 0, planHours = 0, planIncome = 0, units = 0, sentence = null;
  for (let d = 1; d <= DAYS; d++) {
    pool = Math.min(24, pool + 3, camp);
    const slots = tier.id === '把風' ? 3 : tier.id === '押手' ? 2 : tier.id === '掌帳' ? 3 : 1;
    for (let i = 0; i < slots; i++) {
      let pay, h, px, sp, n = 0;
      if (tier.id === '把風') { pay = 12; h = 3; px = 0.03; sp = S_ALLEY; }
      else {
        const t = TYPES[Math.floor(r() * 3)]; n = t.n[0] + Math.floor(r() * (t.n[1] - t.n[0] + 1));
        if (usePool && pool < n) continue;
        const wage = n * (4 + 2 * t.h) * t.m;
        if (tier.id === '押手') { pay = wage; h = t.h + 1; px = t.px; sp = t.sp; }
        else if (tier.id === '掌帳') { pay = 0.10 * n * t.P; h = 1; px = 0.03; sp = S_ALLEY; }
        else { pay = n * t.P * 0.85 - wage - 24; h = 2; px = 0.04; sp = S_ALLEY; }
        if (usePool) { pool -= n; camp -= n; }
      }
      planHours += h; planIncome += pay;
      if (caught !== null) continue;
      income += pay; hours += h; units++; K = Math.max(-200, K - (tier.id === '把風' ? 2 : 100));
      if (r() < px * sp && r() < P_FAIL) { caught = d; const J = (K <= -100 ? 3 : K <= -30 ? 0 : -1) + 2 + 2 + tier.bonus; sentence = J >= 5 ? 'death' : 'front'; }
    }
    camp += 3 - Math.floor(camp / 20);
  }
  return { caught, income, hours, planHours, planIncome, units, sentence };
}
function evalTier(tier, usePool) {
  const a = []; for (let s = 0; s < N; s++) a.push(one(s, tier, usePool));
  const caught = a.filter((x) => x.caught !== null);
  return { tier: tier.id, spec: tier.spec, pCaught: caught.length / N, nCaught: caught.length, lifeDays: mean(a.map((x) => (x.caught === null ? DAYS : x.caught))), medLife: median(a.map((x) => (x.caught === null ? DAYS : x.caught))), units: mean(a.map((x) => x.units)), income: mean(a.map((x) => x.income)),
    death: caught.filter((x) => x.sentence === 'death').length, front: caught.filter((x) => x.sentence === 'front').length, nominal: mean(a.map((x) => x.planIncome)) / mean(a.map((x) => x.planHours)), adj: mean(a.map((x) => x.income)) / mean(a.map((x) => x.planHours)), dayIncome: mean(a.map((x) => x.planIncome)) / DAYS, dayHours: mean(a.map((x) => x.planHours)) / DAYS };
}
function run() {
  const A = TIERS.map((t) => evalTier(t, true)), F = TIERS.map((t) => evalTier(t, false));
  const csv = []; const lines = ['| 階 | 120 天內被抓 | 期望壽命（天，中位） | 被抓前做了幾單／班 | 被抓前累積收入 | 被抓後 死刑／前線 | 名目時薪 | 風險調整後時薪 | 人手池下實際日收入（工時） | 規格表時薪 | 不受池限制的日收入 |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  A.forEach((x, i) => { const f = F[i];
    lines.push('| ' + [x.tier, prob(x.nCaught, N), r3(x.lifeDays) + '（' + r3(x.medLife) + '）', r3(x.units), r3(x.income), (x.nCaught ? r3(x.death / x.nCaught * 100) + '%／' + r3(x.front / x.nCaught * 100) + '%' : 'NA'), r3(x.nominal), r3(x.adj), r3(x.dayIncome) + ' 兩（' + r3(x.dayHours) + 'h）', x.spec, r3(f.dayIncome) + ' 兩（' + r3(f.dayHours) + 'h）'].join(' | ') + ' |');
    csv.push(['pool', x.tier, N, x.pCaught, x.lifeDays, x.medLife, x.units, x.income, x.nCaught ? x.death / x.nCaught : 0, x.nominal, x.adj, x.dayIncome, x.dayHours, x.spec]); csv.push(['no_pool', f.tier, N, f.pCaught, f.lifeDays, f.medLife, f.units, f.income, f.nCaught ? f.death / f.nCaught : 0, f.nominal, f.adj, f.dayIncome, f.dayHours, f.spec]); });
  writeCsv('B2', ['pool_mode', 'tier', 'n', 'p_caught_120d', 'mean_life_days', 'median_life_days', 'units_before_caught', 'income_before_caught', 'p_death_given_caught', 'nominal_per_hour', 'risk_adj_per_hour', 'plan_income_per_day', 'plan_hours_per_day', 'spec_per_hour'], csv);
  const mono = A[0].adj < A[1].adj && A[1].adj < A[2].adj && A[2].adj < A[3].adj, c2 = A[3].adj <= 2 * H;
  lines.push('① 風險調整後時薪單調遞增（把風<押手<掌帳<分櫃）：' + A.map((x) => r3(x.adj)).join(' < ') + ' → ' + verdict(mono) + '；② 分櫃 ' + r3(A[3].adj) + ' ≤ 2.0H＝36 → ' + verdict(c2));
  lines.push('名目時薪對規格表：' + A.map((x) => x.tier + ' ' + r3(x.nominal) + '（表 ' + x.spec + '，差 ' + r3(x.nominal - x.spec) + '）').join('；') + '。');
  lines.push('人手池是真正的瓶頸：每 wday 只補 3 人、每單要 3–6 人，押手／掌帳／分櫃實際都只做得到約 ' + r3(A[1].dayHours / mean(TYPES.map((t) => t.h + 1))) + ' 單／日（上限 2／3／1 單用不滿），所以掌帳一天只賺 ' + r3(A[2].dayIncome) + ' 兩、比把風的 ' + r3(A[0].dayIncome) + ' 兩還少；時薪排序成立，但「日收入」排序是 把風 > 押手 > 掌帳。見待決 Q-B2。');
  return { id: 'B2', title: '販人各階壽命與收入', measured: '風險調整後時薪 ' + A.map((x) => x.tier + ' ' + r3(x.adj)).join('／') + ' 兩；120 天內被抓 ' + A.map((x) => r3(x.pCaught * 100) + '%').join('／'), threshold: '①單調遞增 ②分櫃 ≤36 兩/時', pass: mono && c2, suggest: '—', rerun: '—', lines };
}
module.exports = { run };
