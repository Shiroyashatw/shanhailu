'use strict';
/* K6／K8 共用：三種玩法的善惡、通緝、盤查、逮捕、判決（SPEC-02 摘錄＋【假設】）。
 * 【假設】（規格摘錄沒給的部分）
 * - 玩家長住灰窯（王法管轄，Gmax=2 → 留在管轄內每 wday −0.75）；從不進破曉營（軍規，離開管轄，G 取 3 → 每 wday −1.0，取最慢的衰減＝最保守）。
 * - 罪行被看見才加 W：城內 P_DETECT（灰窯起手白天 0.57）；官道劫道＝兩端鎮 P_DETECT 平均×0.6＝0.378。善惡照扣（不論有沒有人看見）。
 * - 偷竊用 K3 公式（身法 10、偷竊 0）；偷竊＝輕惡 −2、劫道＝中惡 −8、傷人＝中惡 −8、殺良（平民）＝重惡 −50。
 * - 盤查頻率（規格未給）：每 wday 在城內被盤查的機率＝P_DETECT×檔位係數（嫌疑 0.05／通緝 0.15／重犯 0.30）；死罪檔「見面即捕」＝每 wday P_DETECT。
 * - 盤查：說服 clamp(0.3+0.008·說服+0.05·(口才−10)−0.004·W−0.15, 0.05, 0.90)（ΔW 以當下 W 代入）；非重罪說服失敗＝罰錢了事（不判刑）；
 *   重罪不可賄賂 → 拋貨逃走 clamp(0.35+0.03·(身法−10)+0.004·閃躲, 0.10, 0.75)（白天）→ 再失敗＝被捕。
 * - 判決 J＝Jk＋min(3,nKill)＋撈人管道 0 → +2；不自首、武藝熟練 <25、無血祭／屠殺／販人／官員。J≥5 死刑，否則前線。被捕後該 seed 結束。
 * - 重罪的認定：主讀法＝殺良／販人／通邪／血祭／屠殺／傷官；保守讀法＝再加「傷人」。 */
const { prng, clamp } = require('./util');
const PD_HY = 0.57, PD_ROAD = (0.57 + 0.69) / 2 * 0.6;
const tierOf = (W, felony) => (W >= 80 && felony ? 4 : W >= 50 ? 3 : W >= 20 ? 2 : W >= 1 ? 1 : 0);
const Jk = (K) => (K <= -100 ? 3 : K <= -30 ? 0 : -1);
function simulate(seed, style, o) {
  o = o || {}; const r = prng(seed, 'crime:' + style);
  let K = 0, Wk = 0, Wm = 0, felony = false, nKill = 0; const pending = []; // 擴散：隔一個 wday 才到
  const res = { arrested: false, sentence: null, day: null, J: null, mil20: false, mil50: false, maxWm: 0, maxWk: 0, K: 0, crimes: 0, fines: 0 };
  const addWk = (d) => { Wk = Math.min(felony ? 100 : 79, Wk + d); };
  for (let day = 1; day <= 120; day++) {
    // 換日（05:00）：衰減＋擴散到帳
    Wk = Math.max(0, Wk - 0.75); Wm = Math.max(0, Wm - 1.0);
    while (pending.length && pending[0].day <= day) Wm = Math.min(100, Wm + pending.shift().dw);
    if (Wm >= 20) res.mil20 = true; if (Wm >= 50) res.mil50 = true; if (Wm > res.maxWm) res.maxWm = Wm;
    // 罪行
    if (style === 'good' && day % 10 === 0) { res.crimes++; K -= 2; const ok = r() < 0.30; const seen = ok ? r() < PD_HY * 0.3 : true; if (seen) addWk(6); }
    if (style === 'gray' && day % 10 === 0) {
      res.crimes++; K -= 8; const seen = r() < PD_ROAD; const hurt = r() < 0.2;
      if (hurt) K -= 8;
      if (seen) { addWk(20); if (hurt) { if (o.hurtIsFelony) felony = true; addWk(15); pending.push({ day: day + 1, dw: 15 * 0.5 }); } }
    }
    if (style === 'evil' && day % 15 === 0) { res.crimes++; K -= 50; if (r() < PD_HY) { felony = true; nKill++; addWk(40); pending.push({ day: day + 1, dw: 40 * 0.5 }); } }
    K = clamp(K, -200, 150); if (Wk > res.maxWk) res.maxWk = Wk;
    if (o.noArrest) continue;
    // 盤查／逮捕
    const tier = tierOf(Wk, felony); let arrest = false;
    if (tier === 4) arrest = r() < PD_HY;
    else if (tier > 0 && r() < PD_HY * [0, 0.05, 0.15, 0.30][tier]) {
      const talk = clamp(0.3 - 0.004 * Wk - 0.15, 0.05, 0.90);
      if (r() >= talk) { if (!felony) res.fines++; else if (r() >= 0.35) arrest = true; }
    }
    if (arrest) { const J = Jk(K) + Math.min(3, nKill) + 2; res.arrested = true; res.day = day; res.J = J; res.sentence = J >= 5 ? 'death' : 'front'; break; }
  }
  res.K = K; return res;
}
module.exports = { simulate, tierOf, Jk };
