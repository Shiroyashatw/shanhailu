'use strict';
// K2 前線三波勝率
const g = require('../lib/game');
const P = require('../lib/players');
const { r3, prob, writeCsv, verdict } = require('../lib/util');
const N = 500; // 每種出身 500 場（每組 6 出身 = 3000 場）
const WAVES = [['corpse', 'corpse', 'corpse'], ['soldier_dead', 'corpse', 'corpse'], ['wraith', 'wraith', 'soldier_dead']];
const ISSUE = ['blade_short', 'buckler', 'leather']; // 制式裝備（data.js:76,82,89），金創藥水×2（data.js:21）
function frontline(tpl, seed, startFrac, pots, heal) {
  const t = { origin: tpl.origin, attr: tpl.attr, prof: tpl.prof, gear: ISSUE, skills: tpl.skills || [], items: [['pot_hp', pots === undefined ? 2 : pots]] };
  g.setupPlayer(seed, t); const G = g.inst().G, S = G.state;
  S.hp = Math.round(G.maxHp() * startFrac); S.food = 80; S.fat = 10; // 每日 2 餐：飽食不落到 <20 的命中懲罰
  let cleared = 0;
  for (let w = 0; w < 3; w++) {
    g.healTo(heal || 0.7); // 每波前生命回到 ≥70% 最大值
    const r = g.fight(WAVES[w], { fatMult: 1.25 }); // 不可撤退：決策器本來就不撤退
    if (!r.win) return { survive: false, cleared, fat: S.fat };
    cleared++;
  }
  return { survive: true, cleared, fat: S.fat, hp: S.hp / G.maxHp() };
}
function group(name, tpls, csv, startFrac, pots, tag, heal) {
  let s = 0, n = 0; const w = [0, 0, 0, 0]; const per = [];
  tpls.forEach((t, i) => { let k = 0; for (let j = 0; j < N; j++) { const r = frontline(t, 50000 + i * 1000 + j, startFrac, pots, heal); if (r.survive) k++; w[r.cleared]++; } s += k; n += N; per.push([t.name, k]); csv.push([tag, name, t.name, N, k / N]); });
  return { name, s, n, w, per };
}
function run() {
  const csv = []; const st = P.starters(), cl = P.cleaners();
  const A = group('出身起手', st, csv, 1, 2, '原值'), B = group('古窯清理級', cl, csv, 1, 2, '原值');
  const A7 = group('出身起手', st, csv, 0.7, 2, '第1波前僅70%'), B7 = group('古窯清理級', cl, csv, 0.7, 2, '第1波前僅70%');
  const pa = A.s / A.n, pb = B.s / B.n; const okA = pa >= 0.2 && pa <= 0.4, okB = pb >= 0.7;
  const lines = ['| 組 | 三波全過（存活） | 倒在第 1 波 | 第 2 波 | 第 3 波 | 各出身 |', '|---|---|---|---|---|---|'];
  [A, B].forEach((x) => lines.push('| ' + [x.name, prob(x.s, x.n), r3(x.w[0] / x.n), r3(x.w[1] / x.n), r3(x.w[2] / x.n), x.per.map(([nm, k]) => nm.split('・')[1] + ' ' + r3(k / N)).join('、')].join(' | ') + ' |'));
  lines.push('起手組存活 ' + r3(pa * 100) + '%（門檻 20–40%，目標 ≈30%）→ ' + verdict(okA) + '；古窯清理級 ' + r3(pb * 100) + '%（門檻 ≥70%）→ ' + verdict(okB));
  lines.push('對照（第 1 波也只從 70% 生命開打）：起手 ' + prob(A7.s, A7.n) + '；古窯清理級 ' + prob(B7.s, B7.n) + '。');
  lines.push('制式裝備下的面板：' + [st[5], cl[5]].map((t) => { const d = P.describe({ origin: t.origin, attr: t.attr, prof: t.prof, gear: ISSUE, skills: t.skills }); return t.name + ' 生命 ' + d.hp + '、傷害 ' + d.dmg + '、護甲 ' + d.armor + '、命中 ' + d.hit + '%'; }).join('；') + '。三波共 9 個敵人（生命合計 ' + WAVES.flat().reduce((a, e) => a + g.data().ENEMIES[e].hp, 0) + '），每波 3 人同時出手，玩家只有 2 瓶藥。');
  let sug = '—', rer = '—';
  if (!(okA && okB)) {
    // 建議值（一輪）：每波改 2 敵（窯屍×2；亡卒＋窯屍；血霧妖＋亡卒）、藥水 ×3、每波前回滿。
    // 這組是從 8 個候選（敵數／藥水 2–4 瓶／波間回 70% 或 100%）以每組 900 場粗掃後挑的，候選表見 assumptions。
    const save = WAVES.map((w) => w.slice());
    WAVES[0] = ['corpse', 'corpse']; WAVES[1] = ['soldier_dead', 'corpse']; WAVES[2] = ['wraith', 'soldier_dead'];
    const A2 = group('出身起手', st, csv, 1, 3, '建議值', 1), B2 = group('古窯清理級', cl, csv, 1, 3, '建議值', 1);
    save.forEach((w, i) => (WAVES[i] = w));
    const qa = A2.s / A2.n, qb = B2.s / B2.n; const ok2 = qa >= 0.2 && qa <= 0.4 && qb >= 0.7;
    lines.push('', '重跑（建議值：三波改為 窯屍×2／亡卒＋窯屍／血霧妖＋亡卒，制式藥水 ×3，每波前生命回滿）：', '| 組 | 存活 | 倒在第 1 波 | 第 2 波 | 第 3 波 | 各出身 |', '|---|---|---|---|---|---|');
    [A2, B2].forEach((x) => lines.push('| ' + [x.name, prob(x.s, x.n), r3(x.w[0] / x.n), r3(x.w[1] / x.n), r3(x.w[2] / x.n), x.per.map(([nm, k]) => nm.split('・')[1] + ' ' + r3(k / N)).join('、')].join(' | ') + ' |'));
    lines.push('→ 起手 ' + r3(qa * 100) + '%、古窯清理級 ' + r3(qb * 100) + '%：' + verdict(ok2));
    sug = '三波各減 1 敵（窯屍×2／亡卒＋窯屍／血霧妖＋亡卒）、制式藥水 ×3、每波前回滿（原 70%）'; rer = '起手 ' + r3(qa * 100) + '%、古窯清理級 ' + r3(qb * 100) + '%（' + verdict(ok2) + '）';
  }
  writeCsv('K2', ['round', 'group', 'player', 'n', 'p_survive'], csv);
  return { id: 'K2', title: '前線三波勝率', measured: '起手 ' + r3(pa * 100) + '%；古窯清理級 ' + r3(pb * 100) + '%', threshold: '起手 20–40%；古窯清理級 ≥70%', pass: okA && okB, suggest: sug, rerun: rer, lines };
}
module.exports = { run };
