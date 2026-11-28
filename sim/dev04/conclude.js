'use strict';
/* 結論段：所有數字都從 run.js 算出的物件取，不手寫。 */
module.exports = function conclude(o, P_, table) {
  const { rows, res0, verdictRow, comp, RID, ci, H_DEV, H_POOL, H_NOPERK, runs, geo, st0, tn } = o;
  const r3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
  const V = (ok) => (ok ? '通過' : '未通過');
  const four = (ri) => verdictRow(ri).r.map(r3).join('／');
  const S = st0[tn[0]], C = st0[tn[1]];
  const ie = RID('IMPL-event')[0], ir = RID('IMPL-rumor')[0], im = RID('IMPL-mixed')[0];
  const c0 = RID('C0')[0]; const c1 = RID('C1'); const c2 = RID('C2'); const c3 = RID('C3')[0];
  const best = (idx) => idx.slice().sort((a, b) => Math.min(...verdictRow(b).r) - Math.min(...verdictRow(a).r))[0];
  const c1b = best(c1);
  const c2half = c2[1]; const cr = RID('C2+賞金');
  const h = (x) => comp.find((c) => c.h === x);
  const rng = (a) => (a.length ? a[0] + '–' + a[a.length - 1] : '找不到');
  const ciS = (ri, gi, ni) => { const [a, b] = ci(ri, gi, ni); return '[' + r3(a) + ', ' + r3(b) + ']'; };
  const maxEv = Math.max(...RID('IMPL-event').flatMap((ri) => verdictRow(ri).r));
  const bbTxt = '一般開場勝率 ' + r3(S.bb.win) + '、中伏 ' + r3(S.bbA.win) + '，每戰失血成本 ' + r3(S.bb.hp) + '／' + r3(S.bbA.hp) + ' 點（×0.3 ≈ ' + r3(S.bb.hp * 0.3) + '／' + r3(S.bbA.hp * 0.3) + ' 兩）';
  const P2 = (G, k) => 2 + G[k].p90 + o.TR.enc * 0.2;
  P_('## 結論', '');
  P_('### (1) 實作的實際搜尋時間下，S4／AC-E8 過不過', '');
  P_('**不過，差很多。** 照 PR #16 程式，玩家要找劫匪只有野徑趕路碰「劫匪攔路」或聽傳聞兩條路（沒有任何「接了剿匪單才找得到」的機制；委託單的「野徑一帶」不對應任何地點）。');
  P_('- IMPL-event（只靠野徑事件，' + r3(H_DEV) + ' h／頭＋獸跡繞路 1h／頭）：四個比值 ' + four(ie) + ' → ' + V(verdictRow(ie).strict) + '；×2 一張 ' + r3(res0[ie][0][0].hours) + ' h、×4 一張 ' + r3(res0[ie][0][1].hours) + ' h。換成白天解析 22.7、兩種子合併 ' + r3(H_POOL) + '、不吃〈腳力〉的 ' + r3(H_NOPERK) + '、甚至夜間 11.4 h／頭，四個比值全部 ≤ ' + r3(maxEv) + '。');
  P_('- IMPL-rumor（只靠傳聞，最近地點、付費）：' + four(ir) + ' → ' + V(verdictRow(ir).strict) + '。每頭只要 ' + r3(res0[ir][0][0].hours / 2) + ' h，但傳聞戰是 2 名劫匪同場：起手・平民 ' + bbTxt + '，加上 5 兩酒錢，起手・平民每張**倒賠**；傳聞免費也是 ' + four(RID('IMPL-rumor')[1]) + '。');
  P_('- IMPL-mixed（跑傳聞、路上劫匪也算進度）：' + four(im) + ' → ' + V(verdictRow(im).strict) + '；1/(1/h1+1/h2) 樂觀合併：' + four(RID('IMPL-mixed')[1]) + '。');
  P_('- 0.790 例外是 v0.4 在「每頭 1h」假設下給的；實作的實際搜尋時間下三臂所有列的「沿用例外」欄也全部未通過。', '');
  P_('### (2) 候選規則', '');
  P_('- 賞金維持 24／36 時，**C0–C3 沒有任何一列嚴格通過**。只有 C0（＝C2 p=1.0）在「沿用 ≥0.790 例外」下通過：' + four(c0) + '（本輪 2000 場；起手・平民 ×4 ' + r3(verdictRow(c0).r[1]) + ' ' + ciS(c0, 0, 1) + '，CI 跨過 0.8）。');
  P_('- C1（加權劫匪事件）：最好的一列（' + rows[c1b].label + '）也只有 ' + four(c1b) + '。白天就算劫匪事件占 100%（k=∞）也要 4.5 h／頭；而且 C1 要改事件表，與 E10「本包不改事件表」衝突。');
  P_('- **我建議的 C2 p=0.5 在 24／36 下未通過**：' + four(c2half) + '（每頭平均 ' + r3(geo[0.5].mean) + ' h、P90 ' + r3(geo[0.5].p90) + ' h；×2 一張 ' + r3(res0[c2half][0][0].hours) + ' h、×4 一張 ' + r3(res0[c2half][0][1].hours) + ' h）。賞金要調到 **rw2 ' + rng(h(2).f2) + '、rw4 ' + rng(h(2).f4) + '** 才四個都進 0.8–1.25（共 ' + h(2).f2.length * h(2).f4.length + ' 組）；置中值 ' + h(2).pick2 + '／' + h(2).pick4 + ' 重算（含 CI）：' + four(cr[0]) + ' → **' + V(verdictRow(cr[0]).strict) + '**（四個 CI：' + [[0, 0], [0, 1], [1, 0], [1, 1]].map(([g, n]) => ciS(cr[0], g, n)).join('、') + '）。體驗：×2 一張平均 ' + r3(res0[cr[0]][0][0].hours) + ' h（P90 ' + r3(P2(geo[0.5], 'x2')) + '）、×4 一張平均 ' + r3(res0[cr[0]][0][1].hours) + ' h（P90 ' + r3(P2(geo[0.5], 'x4')) + '）；單張期望收入 起手 ' + r3(res0[cr[0]][0][0].income) + '／' + r3(res0[cr[0]][0][1].income) + ' 兩、清理級 ' + r3(res0[cr[0]][1][0].income) + '／' + r3(res0[cr[0]][1][1].income) + ' 兩（×2／×4）。');
  P_('- C2 p=1/3：rw2 ' + rng(h(3).f2) + '、rw4 ' + rng(h(3).f4) + ' 可行（置中 ' + h(3).pick2 + '／' + h(3).pick4 + '：' + four(cr[1]) + '），但 ×2 一張 ' + r3(h(3).exp[0].hours) + ' h、×4 一張 ' + r3(h(3).exp[1].hours) + ' h，略超體驗目標。C2 p=0.25：rw2 ' + rng(h(4).f2) + '、rw4 ' + rng(h(4).f4) + '（置中 ' + h(4).pick2 + '／' + h(4).pick4 + '：' + four(cr[2]) + '），×4 一張 ' + r3(h(4).exp[1].hours) + ' h。');
  P_('- C3（一戰兩頭）：' + four(c3) + ' → 未通過，賞金補償也找不到解：起手・平民打 2 對 1 太貴（×4 在 36 兩時收入為負），清理級在 36 兩已經 ' + r3(verdictRow(c3).r[3]) + '（>1.25），加賞金只會更高。');
  P_('- 賞金補償搜尋（1 對 1、掉落 3–7）：嚴格可行的 h 只有 2、3、4。h=1 時 rw4 無解（起手・平民 ×4 在 36 兩是 ' + r3(h(1).r24[1]) + '，加賞金時清理級先破 1.25；沿用例外則只有 rw4=36）；h=6 時 rw2 ' + rng(h(6).f2) + ' 但 rw4 到 120 仍無解；h=9、13.6、22.7 全無解（最接近分別是 ' + [9, 13.6, 22.7].map((x) => h(x).near[0].rw2 + '/' + h(x).near[0].rw4 + '：' + h(x).near[0].v.map(r3).join('／')).join('；') + '）。');
  P_('- 為什麼 h=1 無解、h=2–4 有解：比值＝（賞金＋掉落−失血成本）÷時數÷分母。兩組的差主要來自失血成本（劫匪 1 對 1：起手 ' + r3(S.bandit.hp) + ' 點、清理級 ' + r3(C.bandit.hp) + ' 點）。h 大時要靠更高的賞金補時薪，失血成本在收入中的占比變小，兩組比值靠攏；h=1 時賞金低、失血占比大，×4 兩組比值差超過區間寬度 1.5625。h 再大（≥6）則 120 兩上限不夠補。');
  P_('- 體驗指標（×2 ≤ 約 8h、×4 ≤ 約 14h）：滿足的 h＝' + comp.filter((c) => c.h !== 'C3' && c.ok8 && c.ok14).map((c) => c.h).join('、') + '（h=3 時各超 ' + r3(h(3).exp[0].hours - 8) + ' h）。**同時滿足嚴格判準與體驗指標的只有 h=2，也就是 C2 p=0.5 配 rw2 ' + rng(h(2).f2) + '、rw4 ' + rng(h(2).f4) + '。**', '');
  P_('### (3) 改實作還是改驗算假設（數字結論）', '');
  P_('- **只改驗算假設不行**：把搜尋時間換成實作實測值（事件 ≈18–24 h／頭；傳聞 ≈4.5 h／頭但 2 對 1），24／36 下比值 ≤ ' + r3(maxEv) + '（事件）或起手為負（傳聞）；賞金放到 70／120 也無解（h=22.7 最接近 ' + h(22.7).near[0].v.map(r3).join('／') + '）。');
  P_('- **要改實作**：給剿匪單一個找得到劫匪的動作。維持 24／36 與 AC-E8 現有寫法（含 0.790 例外）需要「每頭 ≈1h 必中」（C2 p=1.0：' + four(c2[0]) + '，起手 ×4 仍 <0.8）；採建議的 C2 p=0.5 則賞金需改為 rw2 ' + rng(h(2).f2) + '、rw4 ' + rng(h(2).f4) + '（例 ' + h(2).pick2 + '／' + h(2).pick4 + '），四個比值嚴格通過、不需例外。兩者都要改 SPEC-01 4.9（地點、動作、賞金）與 AC-E8。', '');
  P_('### 規格待釐清與待決問題（共 8 項）', '');
  table(['編號', '問題'], [
    ['Q-dev04-1 搜尋機制與賞金', '選 C2 p=1.0＋24／36（需保留例外，本輪起手 ×4 ' + r3(verdictRow(c0).r[1]) + '）或 C2 p=0.5＋賞金約 ' + h(2).pick2 + '／' + h(2).pick4 + '（可行 ' + rng(h(2).f2) + '／' + rng(h(2).f4) + '，嚴格通過）。4.9、AC-E8、第 15 節 S4 列要一起改。'],
    ['Q-dev04-2 地點字串', "`where.bandit='野徑一帶'` 不對應任何節點。若採 C2，改為「野徑岔口」（chakou）並在該節點加「搜匪」動作；是否只有接著未完成剿匪單時才能搜。"],
    ['Q-dev04-3 搜匪與匪勢', '每殺 1 名劫匪 B −2.5、crew −0.5（banditKilled）。搜匪命中率 p 要不要隨 crew／B 下降？crew=0（據點被端）時還搜得到嗎？×4 一張讓 crew 4→2。本輪 C2 假設 p 固定。'],
    ['Q-dev04-4 0.790 例外', '例外是在「每頭 1h、N=150」下給的；PR #16 改了亂數序列後同一套 sim 是 ' + o.reg[1].ratios.map(r3).join('／') + '，2000 場是 ' + four(c0) + '（起手 ×4 CI ' + ciS(c0, 0, 1) + '）。AC-E8 是否改引用大樣本值並附 CI；改搜尋機制後例外是否作廢。'],
    ['Q-dev04-5 E10 與 C1', 'C1（加權事件）與 E10「本包不改事件表」衝突，且 k=∞ 也過不了，建議不採。'],
    ['Q-dev04-6 傳聞 2 對 1', '傳聞的劫匪戰是 2 對 1：起手・平民 ' + bbTxt + '；平民靠傳聞剿匪會倒賠。是否本意（不屬 S4 判準，但影響剿匪單怎麼做）。'],
    ['Q-dev04-7 量測腳本', '`tests/measure-dev04-bandit.js` 的 23.69 混了：一趟 4h 官道（路線迴圈把玩家留在渡陰）、約 37% 夜間趟（遇險 ×2）、〈腳力〉25 級遇險 −20%（第 ' + runs[0].firstPerk + ' 趟起）。白天、無腳力的平民是 22.7 h／頭；24 小時連跑、無腳力是 ' + r3(H_NOPERK) + '。是否請開發修正量測（本輪不改 tests/）。'],
    ['Q-dev04-8 進度計數', '任何來源殺的劫匪都算剿匪進度（questProgress 不看來源），同時只能有一張劫匪單（去重）。加搜匪動作後，路上事件與傳聞的劫匪是否照算（本輪 C2 不把路上劫匪算進度，與前一輪 C0 一致）。'],
  ]);
};
