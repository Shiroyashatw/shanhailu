'use strict';
// K2 前線三波勝率（平民單一起手）。frontline() 逐行照抄 sim/items/K2.js，只把三波敵人改成參數。
const { g, P, U, CIV, civCleaner, writeCsv, pw } = require('./common');
const ISSUE = ['blade_short', 'buckler', 'leather'];
const CFG = {
  A: { desc: '原值每波 3 敵（窯屍×3／亡卒＋窯屍×2／血霧妖×2＋亡卒）', waves: [['corpse', 'corpse', 'corpse'], ['soldier_dead', 'corpse', 'corpse'], ['wraith', 'wraith', 'soldier_dead']] },
  B: { desc: '前一輪建議每波 2 敵（窯屍×2／亡卒＋窯屍／血霧妖＋亡卒）', waves: [['corpse', 'corpse'], ['soldier_dead', 'corpse'], ['wraith', 'soldier_dead']] },
  C: { desc: '同 B，第 3 波改 血霧妖＋窯屍', waves: [['corpse', 'corpse'], ['soldier_dead', 'corpse'], ['wraith', 'corpse']] },
  D: { desc: '同 B，第 2 波只放 亡卒', waves: [['corpse', 'corpse'], ['soldier_dead'], ['wraith', 'soldier_dead']] },
};
function frontline(tpl, seed, waves, startFrac, pots, heal) {
  const t = { origin: tpl.origin, attr: tpl.attr, prof: tpl.prof, gear: ISSUE, skills: tpl.skills || [], items: [['pot_hp', pots === undefined ? 2 : pots]] };
  g.setupPlayer(seed, t); const G = g.inst().G, S = G.state;
  S.hp = Math.round(G.maxHp() * startFrac); S.food = 80; S.fat = 10;
  let cleared = 0;
  for (let w = 0; w < 3; w++) {
    g.healTo(heal || 0.7);
    const r = g.fight(waves[w], { fatMult: 1.25 });
    if (!r.win) return { survive: false, cleared };
    cleared++;
  }
  return { survive: true, cleared };
}
/* 一組 n 場：種子 seed0+j。 */
function batch(tpl, cfg, pots, heal, n, seed0) {
  let k = 0; const w = [0, 0, 0, 0];
  for (let j = 0; j < n; j++) { const r = frontline(tpl, seed0 + j, CFG[cfg].waves, 1, pots, heal); if (r.survive) k++; w[r.cleared]++; }
  return { k, n, p: k / n, w };
}
const SEED_MAIN = 55000;   // 正式組：50000+5×1000+j，j=0..1999（前 500 場與前一輪「流民」那 500 場同種子）
const SEED_SWEEP = 155000; // 粗掃：155000+j，j=0..899（與正式組不重疊，避免「挑完再用同一批種子驗」）
function regression() {
  const cl = P.cleaners()[5], st = P.starters()[5];
  const a = batch(st, 'B', 3, 1, 500, SEED_MAIN), b = batch(st, 'A', 2, 0.7, 500, SEED_MAIN), c = batch(cl, 'B', 3, 1, 500, SEED_MAIN), d = batch(cl, 'A', 2, 0.7, 500, SEED_MAIN);
  const rows = [
    ['K2 起手・流民 建議值組（每波 2 敵、藥水×3、每波前回滿）', '0.084（42/500）', U.r3(a.p) + '（' + a.k + '/500）', a.k === 42],
    ['K2 起手・流民 原值組', '0.000', U.r3(b.p) + '（' + b.k + '/500）', b.k === 0],
    ['K2 古窯清理級・流民 建議值組', '0.994', U.r3(c.p) + '（' + c.k + '/500）', U.r3(c.p) === '0.994'],
    ['K2 古窯清理級・流民 原值組', '0.000', U.r3(d.p) + '（' + d.k + '/500）', d.k === 0],
  ];
  return { rows, ok: rows.every((r) => r[3]) };
}
function run() {
  const st = CIV, cl = civCleaner(); const csv = [], sweepCsv = [], lines = [];
  const N = 2000; const inA = (p) => p >= 0.2 && p <= 0.4;
  const row = (tag, cfg, pots, heal, a, b) => {
    const ok = inA(a.p) && b.p >= 0.7;
    [[st, a], [cl, b]].forEach(([t, x]) => { const [lo, hi] = U.wilson(x.k, x.n); csv.push([tag, cfg, pots, heal, t.name, x.n, x.k, x.p, lo, hi, x.w[0] / x.n, x.w[1] / x.n, x.w[2] / x.n]); });
    return { tag, cfg, pots, heal, a, b, ok };
  };
  const tableHead = ['| 列 | 配置 | 玩家 | 三波全過（存活）〔Wilson 95% CI〕 | 倒在第 1 波 | 第 2 波 | 第 3 波 | 門檻 | 通過與否 |', '|---|---|---|---|---|---|---|---|---|'];
  const tableRows = (r) => [
    '| ' + [r.tag, r.cfg + '／藥水×' + r.pots + '／波間補到 ' + (r.heal * 100) + '%', st.name, pw(r.a.k, r.a.n), U.r3(r.a.w[0] / r.a.n), U.r3(r.a.w[1] / r.a.n), U.r3(r.a.w[2] / r.a.n), '20–40%（目標≈30%）', U.verdict(inA(r.a.p))].join(' | ') + ' |',
    '| ' + [r.tag, '同上', cl.name, pw(r.b.k, r.b.n), U.r3(r.b.w[0] / r.b.n), U.r3(r.b.w[1] / r.b.n), U.r3(r.b.w[2] / r.b.n), '≥70%', U.verdict(r.b.p >= 0.7)].join(' | ') + ' |'];
  // 1. 原值
  const r1 = row('原值', 'A', 2, 0.7, batch(st, 'A', 2, 0.7, N, SEED_MAIN), batch(cl, 'A', 2, 0.7, N, SEED_MAIN));
  // 2. 前一輪建議值
  const r2 = row('前一輪建議值', 'B', 3, 1, batch(st, 'B', 3, 1, N, SEED_MAIN), batch(cl, 'B', 3, 1, N, SEED_MAIN));
  // 3. 平民專用建議值：粗掃
  let r3 = null, pick = null, note = '';
  const sweep = [];
  if (!inA(r2.a.p) || r2.b.p < 0.7) {
    ['A', 'B', 'C', 'D'].forEach((cfg) => [2, 3, 4, 5].forEach((pots) => [0.7, 1].forEach((heal) => {
      const a = batch(st, cfg, pots, heal, 900, SEED_SWEEP), b = batch(cl, cfg, pots, heal, 900, SEED_SWEEP);
      const ok = a.p >= 0.25 && a.p <= 0.35 && b.p >= 0.7;
      sweep.push({ cfg, pots, heal, a, b, ok }); sweepCsv.push([cfg, CFG[cfg].waves.map((w) => w.join('+')).join(' / '), pots, heal, 900, a.k, a.p, b.k, b.p, ok ? 'yes' : 'no']);
    })));
    const dist = (x) => Math.abs(x.a.p - 0.30);
    const okAB = sweep.filter((x) => x.ok && (x.cfg === 'A' || x.cfg === 'B')).sort((x, y) => dist(x) - dist(y));
    const okCD = sweep.filter((x) => x.ok && (x.cfg === 'C' || x.cfg === 'D')).sort((x, y) => dist(x) - dist(y));
    pick = okAB[0] || okCD[0] || null;
    note = okAB.length ? '敵人配置不動（A／B）就有合格候選 ' + okAB.length + ' 組，取起手・平民最接近 30% 的一組。' : okCD.length ? 'A、B 兩種敵人配置（藥水 2–5、補血 70%／100%）都沒有合格候選，才換到 C／D；C／D 合格候選 ' + okCD.length + ' 組，取起手・平民最接近 30% 的一組。' : '整個範圍（32 個候選）都找不到「起手・平民 25–35% 且古窯清理級・平民 ≥70%」的組合。';
    if (pick) r3 = row('平民專用建議值', pick.cfg, pick.pots, pick.heal, batch(st, pick.cfg, pick.pots, pick.heal, N, SEED_MAIN), batch(cl, pick.cfg, pick.pots, pick.heal, N, SEED_MAIN));
  }
  lines.push('場數：每組 ' + N + ' 場，種子 ' + SEED_MAIN + '+j（j=0..' + (N - 1) + '；即 50000+5×1000+j，前 500 場與前一輪流民組同種子）。制式裝備 短刃＋木盾＋皮甲、不可撤退、每日 2 餐（飽食 80）、疲累 ×1.25、第 1 波滿血。', '');
  lines.push(...tableHead); [r1, r2].concat(r3 ? [r3] : []).forEach((r) => lines.push(...tableRows(r)));
  lines.push('', '配置代號：' + Object.keys(CFG).map((k) => k + '＝' + CFG[k].desc).join('；') + '。', '');
  [r1, r2].concat(r3 ? [r3] : []).forEach((r) => lines.push('- ' + r.tag + '：起手・平民 ' + U.r3(r.a.p * 100) + '%、古窯清理級・平民 ' + U.r3(r.b.p * 100) + '% → **' + U.verdict(r.ok) + '**'));
  if (sweep.length) {
    lines.push('', '### K2 粗掃候選表（每個候選每組 900 場，種子 ' + SEED_SWEEP + '+j，j=0..899；第 1 波滿血）', '', note, '', '| 敵人配置 | 藥水 | 波間補到 | 起手・平民 | 古窯清理級・平民 | 起手 25–35% 且清理級 ≥70% |', '|---|---|---|---|---|---|');
    sweep.forEach((x) => lines.push('| ' + [x.cfg, x.pots, (x.heal * 100) + '%', U.r3(x.a.p * 100) + '%（' + x.a.k + '/900）', U.r3(x.b.p * 100) + '%（' + x.b.k + '/900）', (x.ok ? '是' : '否') + (x === pick ? '　← 選用' : '')].join(' | ') + ' |'));
    if (!pick) { const near = sweep.filter((x) => x.b.p >= 0.7).sort((x, y) => Math.abs(x.a.p - 0.3) - Math.abs(y.a.p - 0.3)).slice(0, 3); const near2 = sweep.slice().sort((x, y) => Math.abs(x.a.p - 0.3) - Math.abs(y.a.p - 0.3)).slice(0, 3);
      const f = (x) => x.cfg + '／藥水×' + x.pots + '／' + (x.heal * 100) + '%：起手 ' + U.r3(x.a.p * 100) + '%、清理級 ' + U.r3(x.b.p * 100) + '%';
      lines.push('', '**找不到。** 最接近的三組（清理級 ≥70% 之中，起手最接近 30%）：' + (near.map(f).join('；') || '無') + '。不限清理級門檻、起手最接近 30% 的三組：' + near2.map(f).join('；') + '。'); }
  }
  // 4. 參考：新建議值下六種出身
  let ref = null;
  if (r3) {
    ref = { st: [], cl: [] };
    P.starters().forEach((t, i) => { const x = batch(t, pick.cfg, pick.pots, pick.heal, 500, 50000 + i * 1000); ref.st.push([t.name, x]); csv.push(['參考：平民專用建議值×六出身', pick.cfg, pick.pots, pick.heal, t.name, x.n, x.k, x.p, ...U.wilson(x.k, x.n), x.w[0] / x.n, x.w[1] / x.n, x.w[2] / x.n]); });
    P.cleaners().forEach((t, i) => { const x = batch(t, pick.cfg, pick.pots, pick.heal, 500, 50000 + i * 1000); ref.cl.push([t.name, x]); csv.push(['參考：平民專用建議值×六出身', pick.cfg, pick.pots, pick.heal, t.name, x.n, x.k, x.p, ...U.wilson(x.k, x.n), x.w[0] / x.n, x.w[1] / x.n, x.w[2] / x.n]); });
    lines.push('', '### K2 參考：平民專用建議值下六種出身各自的存活率（只當參考，不當通過條件；每種 500 場，種子 50000+i×1000+j，與前一輪相同）', '', '| 出身 | 起手 | 古窯清理級 |', '|---|---|---|');
    ref.st.forEach(([nm, x], i) => lines.push('| ' + [nm.split('・')[1], pw(x.k, x.n), pw(ref.cl[i][1].k, ref.cl[i][1].n)].join(' | ') + ' |'));
  }
  const d = [st, cl].map((t) => { const x = P.describe({ origin: t.origin, attr: t.attr, prof: t.prof, gear: ISSUE, skills: t.skills }); return t.name + ' 生命 ' + x.hp + '、傷害 ' + x.dmg + '、護甲 ' + x.armor + '、命中 ' + x.hit + '%'; });
  lines.push('', '制式裝備下的面板：' + d.join('；') + '。');
  writeCsv('K2', ['round', 'enemy_config', 'potions', 'heal_between_waves', 'player', 'n', 'survive', 'p_survive', 'wilson_lo', 'wilson_hi', 'p_fall_wave1', 'p_fall_wave2', 'p_fall_wave3'], csv);
  writeCsv('K2-sweep', ['enemy_config', 'waves', 'potions', 'heal_between_waves', 'n', 'starter_civ_survive', 'starter_civ_p', 'cleaner_civ_survive', 'cleaner_civ_p', 'in_25_35_and_cleaner_ge_70'], sweepCsv);
  return { lines, r1, r2, r3, pick, sweep, note, ref };
}
module.exports = { run, regression, batch, CFG, SEED_MAIN, SEED_SWEEP };
