'use strict';
/* D. 長期委託軟期限（R3）：固定懸賞 × 兩組平民玩家的完成日分布、完成率／逾期率、「打不了」三種切法、修正期限；
 * 聲望下限規則單元測試；逾期不扣銀／不加惡／不寫通緝的斷言。
 * 玩家樣板：sim/civ/common.js 的 CIV（起手・平民）與 civCleaner()（古窯清理級・平民），戰鬥一律 sim/lib/game.js 的 fight()（決策器不改）。 */
const g = require('../lib/game');
const T = require('../lib/time');
const { CIV, civCleaner } = require('../civ/common');
const C = require('./common');
const { routeOf } = require('./c_tier');
const { r3, prng, quantile, wilson } = C.U;
const SEEDS = 200, N_DUEL = 2000, SEED_DUEL = 55000, CAP_DAYS = 120;
const GRID = [15, 20, 30, 45, 60, 90];
const R_WILD = 1.042, R_ROAD = 1.033; // 前一輪 S3 不介入 120 天平均：野徑 22.916%/0.22、官道 4.131%/0.04
const INNS = ['huiyao', 'duyin'];
function bounties() { return g.data().BOUNTIES.filter((b) => !b.giver).map((b) => ({ id: b.id, title: b.title, kind: b.kind, town: b.town, enemy: b.enemy, need: b.need, dungeon: b.dungeon, reward: b.reward, N: C.deadlineDays(b.reward) })); }
function players() { return [CIV, civCleaner()]; }
/* ---------- 單次挑戰勝率（打不了的判定用）：滿血、樣板行囊，連打到底不休息 ---------- */
function challenge(tpl, B, seed) {
  const G = g.inst().G; g.setupPlayer(seed, tpl); const S = G.state; const D = g.data();
  if (B.kind === 'kill') { for (let i = 0; i < B.need; i++) { const r = g.fight([B.enemy], { ctxType: 'hunt' }); if (!r.win) return false; } return true; }
  const DG = D.DUNGEONS[B.dungeon];
  for (const f of DG.floors) { if (DG.mist) G._debug.addCorrupt(DG.mist); const r = g.fight(f, { ctxType: 'wild' }); if (!r.win) return false; }
  return true;
}
/* ---------- 長期追單模擬 ---------- */
function wolfSites() { const D = g.data(); return Object.keys(D.WILDS).filter((n) => D.WILDS[n].points.some((p) => p.kind === 'track' && p.enemy === 'wolf')); }
function one(tpl, B, seed) {
  const D = g.data(); const G = g.inst().G; g.setupPlayer(seed, tpl); const S = G.state; const r = prng(seed, 't3v5-D-' + B.id);
  const pots0 = Math.max(2, G.countItem('pot_hp'));
  const startDay = Math.floor(seed / 50) * 30; const tDay0 = startDay * 1440; let t = tDay0 + 480;
  const b = T.newBody({ food: 80, fat: 10, hp: G.maxHp(), maxHp: G.maxHp() });
  let loc = B.town, prog = 0, floor = 0, losses = 0, rations = 0, fights = 0, sorties = 0, tDone = null, tReport = null; const used = {};
  const out = { seed };
  const site = B.kind === 'clear' ? B.dungeon : null;
  const nearestInn = (node) => INNS.slice().sort((x, y) => routeOf(node, x).hours - routeOf(node, y).hours)[0];
  const base = B.kind === 'clear' ? nearestInn(site) : nearestInn(wolfSites()[0]);
  const eatIfHungry = () => { while (b.food < 30) { T.eat(b, 35); rations++; } };
  const pass = (h, ctx) => { t = T.advance(b, t, Math.round(h * 60), Object.assign({ seed, act: 'awake' }, ctx)); if (b.dead) { b.dead = false; b.hp = 1; } eatIfHungry(); };
  const mState = (edge) => { const bd = G.loadBand(); const load = bd.id === 'light' ? 'light' : bd.id === 'normal' ? (G.perk('fuz', 25) ? 'normal25' : 'normal') : bd.id === 'heavy' ? (G.perk('fuz', 50) ? 'heavy50' : 'heavy') : 'over';
    const wx = T.weatherAt(seed, t); return { load, spd: G.affixSum('spd') || 0, tired: b.fat >= 80, cold: b.cold >= 90 ? 'frozen' : b.cold >= 60 ? 'shiver' : null, snow: wx === 'snow' ? (edge.road ? 'road' : 'wild') : null }; };
  const fightIt = (ids, ctxType) => {
    S.hp = Math.max(1, Math.round(b.hp)); S.food = Math.round(b.food); S.fat = Math.round(b.fat); S.dead = null; fights++;
    const f = g.fight(ids, { ctxType }); b.maxHp = G.maxHp(); b.hp = Math.max(1, f.hpEnd); b.fat = S.fat; S.dead = null;
    if (!f.win) { losses++; return false; }
    return true;
  };
  const walk = (to) => { // 回傳 false＝路上遇襲戰敗
    if (loc === to) return true;
    const rt = routeOf(loc, to); const legs = rt.edges.map((e) => [e.h, C.M100(mState(e))]); const h = C.walkHours(legs);
    const st = T.walkStats(seed, t, h); const risk = T.riskNew({ base: rt.base / 1000, R: rt.wild ? R_WILD : R_ROAD, meanW: st.meanW, wxRisk: st.wxRisk }).risk;
    const band = G.loadBand(); pass(h, { place: 'wild', fatRate: 3 * band.fat }); loc = to;
    if (r() < risk) { const ev = Math.floor(r() * 5); if (ev === 1) return fightIt(['bandit'], 'event'); if (ev === 2) return fightIt([r() < 0.5 ? 'boar' : 'wolf'], 'hunt'); }
    return true;
  };
  const sleepInn = () => { const t1 = T.wakeNew(t); t = T.advance(b, t, t1 - t, { seed, act: 'inn', place: 'indoor', sleepGuard: true }); T.innWake(b);
    if (S.corrupt) S.corrupt = Math.max(0, S.corrupt - 10); b.maxHp = G.maxHp(); b.hp = b.maxHp; if (b.food < 80) b.food = 80; const k = G.countItem('pot_hp'); if (k < pots0) G._debug.addItem({ k: 'pot_hp', n: pots0 - k }); };
  const ready = () => !(b.hp < 0.5 * b.maxHp && G.countItem('pot_hp') === 0) && b.fat < 76 && T.minOfDay(t) < 1200 && T.minOfDay(t) >= 300;
  const dayIdx = (x) => Math.floor((x - tDay0) / 1440);
  while (tDone === null && dayIdx(t) < CAP_DAYS) {
    sorties++;
    if (B.kind === 'kill') {
      for (const nd of wolfSites().sort((x, y) => routeOf(base, x).hours - routeOf(base, y).hours)) {
        if (tDone !== null || !ready()) break;
        if (!walk(nd)) break;
        const day = T.dayOf(t); const pts = D.WILDS[nd].points.filter((p) => p.kind === 'track' && p.enemy === B.enemy);
        let lost = false;
        for (const p of pts) {
          const key = day + ':' + nd + ':' + p.id; const max = p.max + (T.seasonOf(t) === 2 ? 1 : 0);
          while ((used[key] || 0) < max && ready() && tDone === null) {
            used[key] = (used[key] || 0) + 1; pass(1, { place: 'wild', fatRate: 3 });
            if (!fightIt([B.enemy], 'hunt')) { lost = true; break; }
            prog++; if (prog >= B.need) tDone = t;
          }
          if (lost) break;
        }
        if (lost) break;
      }
    } else {
      const DG = D.DUNGEONS[site];
      if (walk(site)) {
        while (tDone === null && ready()) {
          pass(1, { place: 'wild', fatRate: 3 }); if (DG.mist) { G._debug.addCorrupt(DG.mist); b.maxHp = G.maxHp(); b.hp = Math.min(b.hp, b.maxHp); }
          if (!fightIt(DG.floors[floor], 'wild')) break; // 敗退：層數保留（S.dungeon 不重設，game.js:689）
          floor++; if (floor >= DG.floors.length) tDone = t;
        }
      }
    }
    if (tDone !== null) { walk(B.town); tReport = t; break; }
    walk(base); sleepInn();
  }
  Object.assign(out, { endSilver: S.silver, endRep: (S.rep && S.rep.dawn) || 0, done: tDone !== null, day: tDone === null ? null : dayIdx(tDone), dayReport: tReport === null ? null : dayIdx(tReport), losses, fights, sorties, rations });
  return out;
}
function run() {
  const lines = []; const BS = bounties(); const PL = players();
  // 聲望下限單元測試
  const EX = [[20, 20], [21, 20], [5, 4], [0, 0], [10, 10], [11, 10]];
  const exOk = EX.map(([a, e]) => [a, e, C.overdue({ rep: a }).rep]);
  const sweep = []; let sweepOk = true;
  for (let rep = 0; rep <= 25; rep++) { const o = C.overdue({ rep, silver: 123, evil: 7, wanted: false }); const fl = C.repFloor(rep); const ok = o.rep === Math.max(rep - 1, fl) && o.rep >= fl && o.rep <= rep && o.rep >= 0 && (rep === 0 || rep === 10 || rep === 20 ? o.rep === rep : o.rep === rep - 1) && o.silver === 123 && o.evil === 7 && o.wanted === false; if (!ok) sweepOk = false; sweep.push([rep, fl, o.rep, ok ? 'ok' : 'FAIL']); }
  // 單次挑戰
  const ch = {}; const csvCh = [];
  BS.forEach((B) => PL.forEach((P) => { let k = 0; for (let j = 0; j < N_DUEL; j++) if (challenge(P, B, SEED_DUEL + j)) k++; ch[B.id + '|' + P.name] = k / N_DUEL; const [lo, hi] = wilson(k, N_DUEL); csvCh.push([B.id, B.title, P.name, N_DUEL, k, k / N_DUEL, lo, hi]); }));
  // 長期模擬
  const res = {}; const csvDone = [], csvRun = [];
  const assertBad = []; let nAssert = 0;
  BS.forEach((B) => PL.forEach((P) => {
    const rs = []; for (let s = 0; s < SEEDS; s++) rs.push(one(P, B, s));
    res[B.id + '|' + P.name] = rs;
    rs.forEach((x) => {
      csvRun.push([B.id, P.name, x.seed, x.done ? 1 : 0, x.day === null ? '' : x.day, x.dayReport === null ? '' : x.dayReport, x.losses, x.fights, x.sorties]);
      // 逾期處理斷言：只動聲望
      // 每一筆都假設逾期，以該 seed 結束時的實際銀兩、聲望（game state）＋模型的惡行 0／通緝 false 呼叫逾期函式
      const before = { rep: x.endRep, silver: x.endSilver, evil: 0, wanted: false }; const after = C.overdue(before); nAssert++;
      if (after.silver !== before.silver || after.evil !== before.evil || after.wanted !== before.wanted || after.rep !== Math.max(before.rep - 1, C.repFloor(before.rep))) assertBad.push(B.id + '|' + P.name + '|' + x.seed);
    });
  }));
  // 彙總
  const rowOf = (B, P) => {
    const rs = res[B.id + '|' + P.name]; const ds = rs.filter((x) => x.done).map((x) => x.day);
    const onTime = (N) => rs.filter((x) => x.done && x.day <= N - 1).length;
    const q = (p) => (ds.length === rs.length ? quantile(ds, p) : (() => { const all = rs.map((x) => (x.done ? x.day : Infinity)).sort((a, b) => a - b); const v = all[Math.round((all.length - 1) * p)]; return v; })());
    const minN = (() => { for (let N = 1; N <= CAP_DAYS; N++) if ((rs.length - onTime(N)) / rs.length <= 0.10) return N; return null; })();
    const lossAny = rs.filter((x) => x.losses > 0).length; const clean = rs.filter((x) => x.done && x.day <= B.N - 1 && x.losses === 0).length;
    return { B, P, rs, n: rs.length, nd: ds.length, min: ds.length ? Math.min(...ds) : null, p10: q(0.1), med: q(0.5), p90: q(0.9), ok: onTime(B.N), late: rs.length - onTime(B.N), grid: GRID.map(onTime), minN, ch: ch[B.id + '|' + P.name], lossAny, clean, repDays: rs.filter((x) => x.done).map((x) => x.dayReport) };
  };
  const rows = []; BS.forEach((B) => PL.forEach((P) => rows.push(rowOf(B, P))));
  rows.forEach((x) => csvDone.push([x.B.id, x.B.title, x.B.reward, x.B.N, x.P.name, x.n, x.ch, x.nd, x.min === null ? '' : x.min, x.p10, x.med, x.p90, x.ok, x.ok / x.n, x.late / x.n].concat(x.grid.map((k) => k / x.n)).concat([x.minN === null ? '>' + CAP_DAYS : x.minN, x.lossAny / x.n, x.clean / x.n])));
  C.writeCsv('long-bounty', ['bounty', 'title', 'reward', 'deadline_days', 'player', 'seeds', 'single_try_win', 'completed_by_day120', 'min_day', 'p10_day', 'median_day', 'p90_day', 'on_time', 'p_on_time', 'p_overdue'].concat(GRID.map((d) => 'p_done_le_' + d + 'd')).concat(['min_deadline_overdue_le_10pct', 'p_lost_a_fight_before_done', 'p_on_time_and_never_lost']), csvDone);
  C.writeCsv('long-bounty-runs', ['bounty', 'player', 'seed', 'done', 'done_day_index', 'report_day_index', 'losses', 'fights', 'sorties'], csvRun);
  C.writeCsv('long-bounty-challenge', ['bounty', 'title', 'player', 'n', 'wins', 'p', 'wilson_lo', 'wilson_hi'], csvCh);
  C.writeCsv('rep-floor', ['rep', 'floor', 'rep_after_overdue', 'check'], sweep);
  const fd = (v) => (v === null || v === undefined ? '—' : v === Infinity ? '未完成' : String(v));
  lines.push('固定懸賞（`data.js` BOUNTIES，私人委託「丈夫的軍牌」不適用）：' + BS.map((B) => B.title + ' ' + B.reward + ' 兩 → 期限 ' + B.N + ' 日').join('；') + '。', '');
  lines.push('單次挑戰勝率（打不了的判定；每組 ' + N_DUEL + ' 場，種子 ' + SEED_DUEL + '+j，j=0..' + (N_DUEL - 1) + '；滿血、樣板行囊，從頭連打到底不回城）：', '', '| 懸賞 | ' + PL.map((p) => p.name).join(' | ') + ' |', '|---|' + PL.map(() => '---').join('|') + '|');
  BS.forEach((B) => lines.push('| ' + B.title + ' | ' + PL.map((P) => { const p = ch[B.id + '|' + P.name]; return C.pctCI(Math.round(p * N_DUEL), N_DUEL); }).join(' | ') + ' |'));
  lines.push('', '長期追單（每組 seed＝0..' + (SEEDS - 1) + '；第 0 日 08:00 在發單地接單，最多追 ' + CAP_DAYS + ' 日；完成日＝目標達成（status done）那一刻的第幾日，第 0 日起算）：', '',
    '| 懸賞 | 玩家 | 單次勝率 | 完成（≤' + CAP_DAYS + '日） | min／P10／中位／P90 完成日 | 期限 ' + '內完成率 | 逾期率 | ' + GRID.map((d) => '≤' + d + '日').join(' | ') + ' | 逾期率 ≤10% 的最小期限 | 完成前曾戰敗 | 期限內且從未戰敗 |', '|---|---|---|---|---|---|---|' + GRID.map(() => '---').join('|') + '|---|---|---|');
  rows.forEach((x) => lines.push('| ' + [x.B.title + '（' + x.B.N + ' 日）', x.P.name, r3(x.ch * 100) + '%', x.nd + '/' + x.n, [x.min, x.p10, x.med, x.p90].map(fd).join('／'), C.pctCI(x.ok, x.n), r3(x.late / x.n * 100) + '%'].concat(x.grid.map((k) => r3(k / x.n * 100) + '%')).concat([x.minN === null ? '>' + CAP_DAYS : x.minN + ' 日', r3(x.lossAny / x.n * 100) + '%', r3(x.clean / x.n * 100) + '%']).join(' | ') + ' |'));
  // 打不了三種切法
  const CUTS = [0.05, 0.10, 0.25]; const verdicts = {};
  lines.push('', '「打不了」三種切法（單次挑戰勝率 < 切點者另列、不計入逾期率）與判準「打得了的單 逾期率 ≤ 10%」：', '', '| 切法 | 打不了 | 打得了的單：逾期率（期限） | 判準 |', '|---|---|---|---|');
  CUTS.forEach((c) => {
    const no = rows.filter((x) => x.ch < c), yes = rows.filter((x) => x.ch >= c); const okAll = yes.every((x) => x.late / x.n <= 0.10);
    verdicts[c] = { no, yes, okAll };
    lines.push('| < ' + (c * 100) + '% | ' + (no.map((x) => x.B.title + '×' + x.P.name).join('、') || '無') + ' | ' + yes.map((x) => x.B.title + '×' + x.P.name + ' ' + r3(x.late / x.n * 100) + '%（' + x.B.N + '日）').join('；') + ' | **' + C.U.verdict(okAll) + '** |');
  });
  // 修正值：分報酬 <100 與 ≥100（以 <25% 以外的每種切法各列）
  lines.push('', '修正值（讓「打得了的單」逾期率 ≤10% 的最小期限，逐日掃 1–' + CAP_DAYS + ' 日；同一類取各單的最大值）：', '', '| 切法 | 報酬 <100（現 30 日） | 報酬 ≥100（現 60 日） |', '|---|---|---|');
  CUTS.forEach((c) => { const yes = verdicts[c].yes; const cls = (f) => { const a = yes.filter((x) => f(x.B.reward)); if (!a.length) return '（無打得了的單）'; const ms = a.map((x) => x.minN); const m = ms.includes(null) ? null : Math.max(...ms); return (m === null ? '>' + CAP_DAYS + ' 日（有單 ' + CAP_DAYS + ' 日內完成率仍 <90%）' : m + ' 日') + '；各單：' + a.map((x) => x.B.title + '×' + x.P.name + ' ' + (x.minN === null ? '>' + CAP_DAYS : x.minN)).join('、'); };
    lines.push('| < ' + (c * 100) + '% | ' + cls((r) => r < 100) + ' | ' + cls((r) => r >= 100) + ' |'); });
  lines.push('', '聲望下限 `rep\' = max(rep − 1, floor)`、floor ∈ {0,10,20}：6 個例子 ' + exOk.map(([a, e, got]) => a + '→' + got + (got === e ? '' : '（預期 ' + e + '，**不符**）')).join('、') + ' → ' + (exOk.every((x) => x[1] === x[2]) ? '全符' : '**有不符**') + '；rep＝0–25 全掃 ' + (sweepOk ? '26/26 符合（floor 正確、不跌破已達門檻、0/10/20 不動、其餘 −1）' : '**有不符**，見 csv-t3v5/rep-floor.csv') + '。');
  const nOver = rows.reduce((a, x) => a + x.late, 0);
  lines.push('逾期處理斷言（不扣銀、不加惡、不寫通緝，只動聲望）：本輪實際逾期 ' + nOver + ' 筆，所以改為對全部 ' + nAssert + ' 筆（seed×單×玩家）都假設逾期、以結束時的實際銀兩與破曉聲望呼叫逾期函式；銀兩／惡行／通緝前後不變且聲望照下限規則的斷言失敗 ' + assertBad.length + ' 筆。rep 全掃也同時斷言了銀兩 123／惡行 7／通緝 false 不變。註：`js/game.js` 現況沒有惡行、通緝欄位（`grep evil|wanted|karma` 無結果），這兩項只能在模型裡斷言。');
  return { rows, ch, verdicts, exOk, sweepOk, assertBad, lines, BS, PL };
}
module.exports = { run, one, challenge, bounties };
