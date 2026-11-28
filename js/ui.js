/* 《山海錄》灰盒 v0.3 — 三欄介面渲染（左 240／中 796／右 220，依視窗等比縮放） */
'use strict';

(function () {
  const D = window.SHL_DATA;
  const G = window.SHL;
  const IC = window.SHL_ICONS || { has: () => false };
  const SC = window.SHL_SCENES || { has: () => false, buildings: {} };
  const Q = new URLSearchParams(location.search);
  // 戰鬥演出：?fx=0 關閉（自動化測試用）
  const FXON = Q.get('fx') !== '0';
  const $A = document.getElementById('app');
  const $L = document.getElementById('col-left');
  const $C = document.getElementById('col-center');
  const $R = document.getElementById('col-right');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 人形 10 部位＋背包槽＋馬車槽（D2 式緊湊排法）
  const DOLL = {
    head: [100, 6, 40, 40], amulet: [150, 12, 28, 28],
    main: [14, 30, 44, 88], chest: [96, 52, 48, 64], off: [182, 30, 44, 88],
    gloves: [14, 126, 44, 40], ring1: [64, 128, 26, 26], belt: [96, 122, 48, 22], ring2: [150, 128, 26, 26], boots: [182, 126, 44, 40],
    bag: [82, 158, 36, 36], cart: [124, 158, 36, 36],
  };
  const SMALL = { amulet: 1, ring1: 1, ring2: 1, belt: 1 };
  const RAR_CLS = { white: '', blue: 'r-blue', rare: 'r-rare', legend: 'r-legend' };

  function pos(x, y, w, h) { return 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;'; }
  // 像素 ICON；沒有圖就退回文字代號
  function ico(id, glyph, size) {
    if (id && IC.has(id)) return '<i class="px ic-' + id + '"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '') + '></i>';
    return '<span class="gl">' + (glyph || '') + '</span>';
  }
  function itIco(it, size) { return it.k === 'eq' && it.eq.unid ? ico(G.itemIcon(it), G.itemGlyph(it), size) + '<span class="unid">?</span>' : ico(G.itemIcon(it), G.itemGlyph(it), size); }
  function rcls(it) { return it.k === 'eq' ? ' ' + RAR_CLS[it.eq.rarity] : ''; }
  function scn(id) { return SC.has(id) ? ' sc-' + id : ''; }
  // 題材文字表代入：{名稱} → vars[名稱]（DEV-05；句子都在 D.TEXT，不在這裡寫死）
  const TX = D.TEXT;
  function tx(str, vars) { return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m)); }
  // 整數帶符號：正數半形 +、負數 U+2212、0 不帶號（city-status-copy CSV city.treasury.net 備註）
  function sgn(n) { return n > 0 ? '+' + n : n < 0 ? '\u2212' + -n : '0'; }

  // ======================= 左欄 =======================
  function renderLeft(S) {
    const fight = !!S.combat;
    let h = '<div class="doll">';
    Object.keys(DOLL).forEach((slot) => {
      const [x, y, w, hh] = DOLL[slot];
      const sz = SMALL[slot] ? Math.min(w, hh) - 4 : slot === 'bag' ? 28 : 32;
      if (slot === 'cart') {
        h += '<div class="cell locked slot-cart" data-tip="cart" style="' + pos(x, y, w, hh) + '">' + ico('cart', '車', 28) + '</div>';
        return;
      }
      const eq = S.equip[slot];
      // 戰鬥中：主手＝出手，副手盾＝防禦（武器和攻擊放在一起）
      const act = fight && slot === 'main' ? 'attack' : fight && slot === 'off' && eq && G.eqBase(eq).shield ? 'defend' : null;
      if (eq) {
        const B = G.eqBase(eq);
        h += '<div class="cell click ' + RAR_CLS[eq.rarity] + (act ? ' hand' : '') + '" data-a="' + (act ? 'cact' : 'unequip') + '" data-v="' + (act || slot) + '" data-tip="slot:' + slot + '" data-drop="slot:' + slot + '"' + (slot !== 'bag' && !fight ? ' data-drag="slot:' + slot + '"' : '') + ' data-testid="slot-' + slot + '" style="' + pos(x, y, w, hh) + '">' + ico(B.ic, B.g, sz) + (slot === 'bag' ? '<span class="n">' + B.bag + '</span>' : '') + (act ? '<span class="hb">' + (act === 'attack' ? '攻' : '防') + '</span>' : '') + '</div>';
      } else if (act) {
        h += '<div class="cell click hand" data-a="cact" data-v="attack" data-tip="slot:' + slot + '" data-testid="slot-' + slot + '" style="' + pos(x, y, w, hh) + '">' + ico('a_attack', '拳', 32) + '<span class="hb">攻</span></div>';
      } else {
        h += '<div class="cell empty" data-tip="slot:' + slot + '" data-drop="slot:' + slot + '" data-testid="slot-' + slot + '" style="' + pos(x, y, w, hh) + (SMALL[slot] ? 'font-size:12px;' : '') + '">' + D.SLOT_GLYPH[slot] + '</div>';
      }
    });
    h += '</div>';
    const cap = G.bagCap(); const used = S.pack.filter(Boolean).length;
    h += '<div class="lhead" style="top:200px"><span class="lbl"><b>行囊 ' + used + '/' + cap + '</b></span><span class="sub">可拖拉</span></div>';
    const retreat = S.combat && S.combat.retreatOpen;
    h += '<div class="packgrid" data-testid="pack">';
    for (let i = 0; i < 24; i++) {
      const x = (i % 5) * 44, y = Math.floor(i / 5) * 44;
      if (i >= cap) { h += '<div class="cell locked" style="' + pos(x, y, 40, 40) + '"></div>'; continue; }
      const it = S.pack[i];
      if (!it) { h += '<div class="cell empty" data-drop="pack:' + i + '" style="' + pos(x, y, 40, 40) + '"></div>'; continue; }
      const sel = (S.trade && S.trade.mode === 'sell' && S.trade.slot === i) ? ' sel' : '';
      const drop = retreat && S.retreatSel.includes(i) ? ' drop' : '';
      const act = retreat ? 'toggleDrop' : 'pack';
      h += '<div class="cell click' + rcls(it) + sel + drop + '" data-a="' + act + '" data-v="' + i + '" data-tip="pack:' + i + '" data-drag="pack:' + i + '" data-drop="pack:' + i + '" data-testid="pack-' + i + '" style="' + pos(x, y, 40, 40) + '">' + itIco(it) + (it.k !== 'eq' && it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>';
    }
    h += '</div>';
    const gr = S.ground.node === S.loc ? S.ground.items : [];
    h += '<div class="lhead" style="top:438px"><span class="lbl"><b>地面</b></span><span class="sub">拖到這裡丟下</span></div>';
    h += '<div class="groundgrid" data-drop="ground" data-testid="ground">';
    for (let i = 0; i < 10; i++) {
      const x = (i % 5) * 44, y = Math.floor(i / 5) * 44;
      const it = gr[i];
      if (!it) { h += '<div class="cell empty" style="' + pos(x, y, 40, 40) + '"></div>'; continue; }
      h += '<div class="cell click' + rcls(it) + '" data-a="pickup" data-v="' + i + '" data-tip="ground:' + i + '" data-drag="ground:' + i + '" data-testid="ground-' + i + '" style="' + pos(x, y, 40, 40) + '">' + itIco(it) + (it.k !== 'eq' && it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>';
    }
    h += '</div>';
    // 勢力聲望（原小地圖的位置）：勢力會越來越多，所以做成可捲動的精簡清單，聲望高的排前面；點開看全部
    const fs = G.knownFactions().sort((a, b) => G.repOf(b) - G.repOf(a));
    h += '<div class="lhead" style="top:546px" data-a="overlay" data-v="faction"><span class="lbl"><b>勢力 ' + fs.length + '</b></span><span class="sub lnk">點開看全部</span></div><div class="reps" data-testid="reps">';
    fs.forEach((f) => {
      const F = D.FACTIONS[f]; const v = G.repOf(f); const nx = F.perks.find((p) => v < p[0]);
      const base = nx ? (F.perks[F.perks.indexOf(nx) - 1] || [0])[0] : 0;
      h += '<div class="rep" data-a="overlay" data-v="faction" data-testid="rep-' + f + '" title="' + F.name + '：' + (F.perks.length ? F.perks.map((p) => p[0] + ' ' + p[1]).join('；') : '尚無往來') + '">' + ico(F.ic, F.g, 16) + '<span class="rn">' + F.name + '</span><div class="pb"><i style="width:' + (F.perks.length ? (nx ? Math.min(100, ((v - base) / (nx[0] - base)) * 100) : 100) : 0).toFixed(0) + '%"></i></div><b>' + Math.floor(v) + '</b></div>';
    });
    h += '</div>';
    // 負重底條
    const w = G.totalWt(), cc = G.carryCap();
    const pct = Math.min(1, w / cc);
    h += '<div class="loadbar" data-testid="loadbar">' + ico('ui_load', '負', 16) + '<div class="thinbar' + (pct > 0.75 ? ' warn' : pct > 0.4 ? ' mid' : '') + '" style="width:72px"><i style="width:' + (pct * 100).toFixed(1) + '%"></i><b style="left:40%"></b><b style="left:75%"></b></div><span>' + Math.round(w) + '/' + cc + '</span><span class="spd" data-tip="spd" data-testid="speed">' + TX.map.speed + ' ' + tx(TX.map.speedVal, { mult: G.speedMult().toFixed(2) }) + '</span></div>';
    h += '<div id="tip" style="display:none"></div>';
    $L.innerHTML = h;
  }

  // ---------- 提示卡內容 ----------
  function eqKindLine(B) {
    let t = (B.slot === 'ring' ? '戒指' : D.SLOT_NAMES[B.slot]);
    if (B.wtype) t += '・' + D.WTYPE_NAMES[B.wtype];
    if (B.ac) t += '・' + (B.ac === 'light' ? '輕甲' : '重甲');
    if (B.shield) t += '・盾';
    return t + '・重 ' + B.wt + (B.twoHanded ? '・雙手' : '');
  }
  function reqLine(eq) {
    const rq = G.eqBase(eq).req; if (!rq) return '';
    const miss = G.reqUnmet(eq);
    return '<div class="tip-req' + (miss ? ' red' : '') + '">需要 ' + Object.keys(rq).map((k) => D.ATTRS.find((a) => a.id === k).name + ' ' + rq[k]).join('、') + (miss ? '（不足）' : '') + '</div>';
  }
  function eqTipHtml(eq, cmpEq, priceLine) {
    const B = G.eqBase(eq);
    let h = '<div class="tip-h"><span class="tip-name">' + esc(eq.unid ? '未鑑定的' + B.name : eq.name) + '</span><span class="tag">' + D.RARITY[eq.rarity].name + '</span></div>';
    h += '<div class="sub">' + eqKindLine(B) + '</div>';
    if (B.dmg) h += '<div class="tip-base">傷害 ' + B.dmg[0] + '–' + B.dmg[1] + '</div>';
    else if (B.armor) h += '<div class="tip-base">護甲 ' + B.armor + '</div>';
    else if (B.bag) h += '<div class="tip-base">背包 ' + B.bag + ' 格</div>';
    else if (B.cap) h += '<div class="tip-base">負重上限 +' + B.cap + '</div>';
    h += reqLine(eq);
    if (eq.unid) h += '<div class="tip-aff unk">？？？　詞綴未明</div><div class="sub">鑑物夠高可點擊鑑定，或到市集付 ' + G.identifyFee(eq) + ' 兩</div>';
    else {
      if (!eq.affixes.length && !eq.unique) h += '<div class="sub">（無詞綴）</div>';
      eq.affixes.forEach((a) => (h += '<div class="tip-aff">' + D.AFFIXES[a.id].t.replace('{v}', a.v) + '</div>'));
      if (eq.unique) h += '<div class="tip-uni">◆ ' + D.UNIQUES[eq.unique] + '</div>';
    }
    h += '<div class="tip-foot"><span>' + priceLine + '</span><span>' + (cmpEq === undefined ? '點＝卸下' : eq.unid ? '點＝鑑定' : '點＝裝備') + '</span></div>';
    if (cmpEq) {
      const Bc = G.eqBase(cmpEq);
      if (B.dmg && Bc.dmg) h += '<div class="tip-cmp">對比現穿：傷害上限 ' + sign(B.dmg[1] - Bc.dmg[1]) + '</div>';
      else if (B.armor !== undefined && Bc.armor !== undefined) h += '<div class="tip-cmp">對比現穿：護甲 ' + sign((B.armor || 0) - (Bc.armor || 0)) + '</div>';
      else if (B.bag && Bc.bag) h += '<div class="tip-cmp">對比現用：' + sign(B.bag - Bc.bag) + ' 格</div>';
      else h += '<div class="tip-cmp">對比現穿：' + esc(cmpEq.name) + '</div>';
    } else if (cmpEq === null) h += '<div class="tip-cmp">此部位目前空著</div>';
    return h;
  }
  function sign(v) { return (v >= 0 ? '+' : '−') + Math.abs(v); }
  const TYPE_NAMES = { mat: '素材', use: '消耗', goods: '貨物', scroll: '殘卷', quest: '委託' };
  function itemTipHtml(it, priceLine, hint) {
    const I = D.ITEMS[it.k];
    let h = '<div class="tip-h"><span class="tip-name">' + I.name + '</span><span class="tag">' + TYPE_NAMES[I.type] + '</span></div>';
    h += '<div class="sub">數量 ' + it.n + '・重 ' + I.wt * it.n + '</div>';
    h += '<div class="tip-aff" style="white-space:normal">' + I.desc + '</div>';
    h += '<div class="tip-foot"><span>' + priceLine + '</span><span>' + hint + '</span></div>';
    return h;
  }
  function priceLineFor(it) {
    const S = G.state; const town = S.scene === 'town';
    const shop = town && G.bld() && G.bld().buys;
    if (it.k !== 'eq' && D.ITEMS[it.k].type === 'quest') return '不可買賣';
    if (shop) { const p = G.sellPrice(it); return p ? '此店收 ' + p + ' 兩' + (it.k === 'eq' ? '' : '／個') : '此店不收'; }
    if (it.k === 'eq') return '估價 ' + G.sellPrice(it) + ' 兩';
    if (town) return '進店才能賣';
    return '灰窯 ' + (D.PRICES.huiyao[it.k] || '—') + '／渡陰 ' + (D.PRICES.duyin[it.k] || '—');
  }
  function cmpFor(eq) {
    const S = G.state; const s = G.eqBase(eq).slot;
    if (s === 'ring') return S.equip.ring1 || S.equip.ring2 || null;
    return S.equip[s] || null;
  }
  function showTip(el) {
    const S = G.state; const tip = document.getElementById('tip');
    if (!tip || dragState) return;
    const key = el.getAttribute('data-tip'); const [kind, v] = key.split(':');
    let html = '', rc = '';
    if (kind === 'spd') { html = '<div class="tip-h"><span class="tip-name">' + TX.map.speed + ' ' + tx(TX.map.speedVal, { mult: G.speedMult().toFixed(2) }) + '</span></div><div class="tip-aff" data-testid="speed-hint" style="white-space:normal">' + TX.map.hint.speed + '</div>'; }
    else if (kind === 'cart') { html = '<div class="tip-h"><span class="tip-name">馬車槽</span><span class="tag">預留</span></div><div class="sub">架構預留・本版不可用</div><div class="tip-aff" style="white-space:normal">完整版可於城鎮雇用或購買馬車，提供大型貨倉、分擔負重，限走官道。</div>'; }
    else if (kind === 'slot') {
      const eq = S.equip[v];
      if (!eq) html = '<div class="tip-h"><span class="tip-name">' + D.SLOT_NAMES[v] + '</span><span class="tag">空</span></div><div class="sub">尚未裝備・可把行囊裡的裝備拖過來</div>';
      else { html = eqTipHtml(eq, undefined, priceLineFor({ k: 'eq', eq })); rc = RAR_CLS[eq.rarity]; if (v === 'bag') html = html.replace('點＝卸下', '城鎮買包替換'); else if (S.combat) html = html.replace('點＝卸下', v === 'main' ? '點＝出手' : v === 'off' && G.eqBase(eq).shield ? '點＝防禦' : '戰鬥中不能換裝'); }
    } else if (kind === 'pack' || kind === 'ground') {
      const it = kind === 'pack' ? S.pack[+v] : S.ground.items[+v];
      if (!it) return;
      if (it.k === 'eq') { html = eqTipHtml(it.eq, cmpFor(it.eq), priceLineFor(it)); rc = RAR_CLS[it.eq.rarity]; if (kind === 'ground') html = html.replace(/點＝(裝備|鑑定)/, '點＝撿起'); }
      else {
        const I = D.ITEMS[it.k];
        let hint = I.type === 'use' ? '點＝使用' : I.type === 'scroll' ? '點＝研讀' : '';
        if (kind === 'ground') hint = '點＝撿起';
        if (kind === 'pack' && S.scene === 'town' && G.bld() && G.bld().buys) hint = '點＝選取・右鍵＝賣';
        if (kind === 'pack' && S.combat) hint = I.type === 'use' ? '點＝使用（耗一回合）' : '';
        html = itemTipHtml(it, priceLineFor(it), hint);
      }
    }
    tip.className = rc; tip.innerHTML = html; tip.style.display = 'block';
    // 錨定在被滑過的槽位正下方；太靠底改往上翻；永遠不出左欄（以設計座標計算，不受縮放影響）
    const colR = $L.getBoundingClientRect(); const r = el.getBoundingClientRect();
    let top = (r.bottom - colR.top) / scale + 4;
    const th = tip.offsetHeight;
    if (top + th > 704) top = (r.top - colR.top) / scale - th - 4;
    if (top < 2) top = 2;
    tip.style.top = top + 'px';
  }
  function hideTip() { const tip = document.getElementById('tip'); if (tip) tip.style.display = 'none'; }

  // ======================= 右欄 =======================
  function cut(t, n) { return t.length > n ? t.slice(0, n) + '…' : t; }
  function renderRight(S) {
    const mh = G.maxHp();
    const O = D.ORIGINS.find((o) => o.id === S.origin);
    const face = 'pl_' + S.origin;
    let h = '<div class="portrait">' + (IC.has(face) ? ico(face, '', 56) : (O ? O.name : '無名')) + '</div><div class="pname">' + esc(S.name) + '<span class="page" data-testid="age">' + (O ? O.name + '・' : '') + G.ageOf(S.t) + ' 歲</span></div>';
    h += '<div class="pill" style="left:76px;top:28px;width:82px" data-testid="loc">' + D.NODES[S.loc].name + '</div>';
    const td = G.tideInfo();
    h += '<div class="pill date' + (td ? ' hot' : '') + '" style="left:162px;top:28px;width:50px" data-testid="date"' + (td ? ' title="獸潮・' + D.NODES[td.town].name + '，剩 ' + td.left + ' 天"' : '') + '>' + (td ? '獸潮' : G.fmtDate(S.t)) + '</div>';
    h += '<div class="silver">' + ico('ui_coin', '銀', 16) + '<span data-testid="silver">' + S.silver + '</span></div>';
    h += '<div class="pill" style="left:122px;top:51px;width:90px;font-weight:700" data-testid="clock">' + G.fmtTime(S.t) + '</div>';
    const vit = (ic, gl, v, max, y, crit, tid, cls, marks) => '<div class="vit ' + cls + (crit ? ' crit' : '') + '" style="top:' + y + 'px" data-testid="' + tid + '">' + ico(ic, gl, 16) + '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1) + '%"></i>' + (marks || '') + '</div><span class="num">' + Math.max(0, Math.round(v)) + '/' + max + '</span></div>';
    h += vit('ui_hp', '命', S.hp, mh, 78, S.hp / mh <= 0.3, 'hp', 'v-hp');
    h += vit('ui_food', '食', S.food, 100, 98, S.food <= 20, 'food', 'v-food', '<b style="left:20%"></b>');
    h += vit('ui_fat', '疲', S.fat, 100, 118, S.fat >= 80, 'fat', 'v-fat', '<b style="left:80%"></b>');
    const band = G.loadBand(); const c = S.combat;
    const sts = [
      ['st_bleed', '血', c && c.bleed > 0, '流血'], ['st_poison', '毒', c && c.poison > 0, '中毒'], ['', '餓', S.food < 20, '飢餓：回復停滯'], ['', '倦', S.fat >= 80, '力竭：命中與速度下降'],
      ['', '重', band.id === 'heavy' || band.id === 'over', '超載'], ['st_corrupt', '蝕', S.corrupt > 0, '侵蝕 ' + S.corrupt + '：生命上限 −' + S.corrupt],
    ].filter((x) => x[2]);
    h += '<div class="strow" data-testid="statuses">' + sts.map((x) => '<span class="stc" title="' + x[3] + '">' + ico(x[0], x[1], 16) + '</span>').join('') + '<span class="stt">護甲 ' + G.armor() + '・傷 ' + G.weaponDmg().join('–') + '</span></div>';
    h += '<div class="sep" style="top:168px"></div>';
    // 7 素質
    h += '<div class="attrs" data-testid="attrs">';
    D.ATTRS.forEach((a) => {
      const v = G.attrVal(a.id); const base = S.attr[a.id];
      h += '<div class="attr" data-testid="attr-' + a.id + '" title="' + a.name + ' ' + v + '：' + a.desc + '"><span class="ag">' + a.g + '</span><b class="' + (v > base ? 'up' : '') + '">' + v + '</b><i style="width:' + (G.attrProgress(a.id) * 100).toFixed(0) + '%"></i></div>';
    });
    h += '</div>';
    // 熟練度：四大類分頁
    const tab = S.profTab || 'ye';
    h += '<div class="ptabs">' + D.PROF_GROUPS.map((g) => '<button class="' + (tab === g.id ? 'on' : '') + '" data-a="profTab" data-v="' + g.id + '" data-testid="ptab-' + g.id + '">' + g.name + '</button>').join('') + '</div>';
    D.PROFS.filter((p) => p.grp === tab).forEach((p, i) => {
      const lv = G.profLv(p.id);
      const next = Object.keys(p.perks).map(Number).sort((a, b) => a - b).find((t) => lv < t);
      const tipTxt = p.name + ' ' + lv + '（' + D.ATTRS.find((a) => a.id === p.attr).name + '）：' + p.how + (next ? '。' + next + '：' + p.perks[next] : '');
      h += '<div class="prof' + (p.locked ? ' lock' : '') + '" style="top:' + (236 + i * 19) + 'px" data-testid="prof-' + p.id + '" title="' + tipTxt + '"><span class="nm">' + p.name + '</span><span class="lv">' + (p.locked ? '—' : lv) + '</span><div class="pb"><i style="width:' + (p.locked ? 0 : G.profProgress(p.id) * 100).toFixed(0) + '%"></i></div><span class="nx">' + (p.locked ? '預留' : next ? '→' + next : '') + '</span></div>';
    });
    // 委託（兩行大字）
    const day = G.dayOf(S.t);
    const aq = G.activeQuests().slice().sort((a, b) => (b.status === 'done') - (a.status === 'done'));
    h += '<div class="jhead" style="top:412px" data-a="journal" data-v="quest"><b>委託 ' + aq.length + '</b><span class="sub">點開看全部</span></div>';
    if (!aq.length) h += '<div class="jent sub" style="top:430px" data-testid="bounty">（無）到委託板接榜</div>';
    aq.slice(0, 3).forEach((q, i) => {
      const due = q.due ? (q.due - day <= 0 ? '今日截止' : '剩 ' + (q.due - day) + ' 天') : '長期';
      h += '<div class="jent' + (q.status === 'done' ? ' done' : '') + '" style="top:' + (430 + i * 34) + 'px" data-a="journal" data-v="quest"' + (i === 0 ? ' data-testid="bounty"' : '') + '>' + ico(q.ic, q.g, 24) + '<span class="jt"><b>' + qShort(q) + '</b><span class="js">' + cut(G.questWhere(q), 9) + '・<span class="' + (q.due && q.due - day <= 0 ? 'red' : '') + '">' + due + '</span></span></span><span class="rw">' + G.questReward(q) + '</span></div>';
    });
    // 傳聞（兩行大字）
    h += '<div class="jhead" style="top:538px" data-a="journal" data-v="rumor"><b>傳聞 ' + S.rumors.length + '/' + D.RUMOR.max + '</b><span class="sub">點開看全文</span></div>';
    if (!S.rumors.length) h += '<div class="jent sub" style="top:556px">（無）客棧可打聽</div>';
    S.rumors.forEach((r, i) => {
      const left = D.RUMOR.days - (day - r.day);
      h += '<div class="jent rum" style="top:' + (556 + i * 34) + 'px" data-a="journal" data-v="rumor" data-testid="rumor-' + i + '">' + ico('ui_rumor', '聞', 24) + '<span class="jt"><b>' + D.RUMOR.kinds[r.kind].name + '・' + D.NODES[r.node].name + '</b><span class="js">' + (r.hint ? cut(r.hint, 12) : cut(r.text, 12)) + '</span></span><span class="rw ' + (left <= 1 ? 'red' : '') + '">' + left + '天</span></div>';
    });
    h += '<div class="sysbtns"><button data-a="overlay" data-v="journal" data-testid="sys-journal">記事</button><button data-a="overlay" data-v="char" data-testid="sys-char">人物</button><button data-a="overlay" data-v="log" data-testid="sys-log">日誌</button><button data-a="overlay" data-v="help" data-testid="sys-help">說明</button><button data-a="overlay" data-v="menu" data-testid="sys-menu">選單</button></div>';
    $R.innerHTML = h;
  }
  function qShort(q) {
    const t = q.title.replace(/ ×\d+/, '');
    if (q.status === 'done') return t + ' ✓';
    if (q.kind === 'collect') return t + ' ' + Math.min(q.need, G.countItem(q.item)) + '/' + q.need;
    if (q.kind === 'deliver') return t;
    return t + ' ' + q.prog + '/' + q.need;
  }

  // ======================= 中欄 =======================
  function logLines(S, n) {
    return S.log.slice(-n).map((l) => '<div class="' + l.cls + '">' + esc(l.text) + '</div>').join('');
  }
  function renderCenter(S) {
    let h = '';
    switch (S.scene) {
      case 'origin': h = sceneOrigin(S); break;
      case 'map': h = sceneMap(S); break;
      case 'town': h = sceneTown(S); break;
      case 'wild': h = sceneWild(S); break;
      case 'dungeon': h = sceneDungeon(S); break;
      case 'combat': h = sceneCombat(S); break;
      case 'loot': h = sceneLoot(S); break;
      case 'event': h = sceneEvent(S); break;
      case 'dead': h = sceneDead(S); break;
    }
    if (S.overlay) h += overlay(S);
    $C.innerHTML = h;
    $C.setAttribute('data-scene', S.scene);
  }
  // 探查鈕：每個地點都有
  function exploreBtn(S, cls) {
    return '<button class="btn gold' + (cls ? ' ' + cls : '') + '" data-a="explore" data-testid="btn-explore" title="花 1 小時在這裡四處翻找：可能找到東西、聽到見聞，或發現新的地方。靈覺與探幽越高越容易有收穫。">探查（1 小時）</button>';
  }

  // ---------- 出身 ----------
  function sceneOrigin() {
    let h = '<div class="origin' + scn('road') + '" data-testid="origin"><div class="otitle">山海錄</div><div class="osub">天裂後第三年。選一個出身，之後過什麼日子就長什麼本事。</div><div class="ogrid">';
    D.ORIGINS.forEach((o) => {
      const at = Object.keys(o.attr).map((k) => D.ATTRS.find((a) => a.id === k).name + ' ' + o.attr[k]).join('・') || '素質全 10';
      const pf = Object.keys(o.prof).map((k) => D.PROFS.find((p) => p.id === k).name + ' ' + o.prof[k]).join('・') || '無起手熟練度';
      const gear = o.gear.map((b) => D.BASES[b].name).concat((o.items || []).map(([k, n]) => D.ITEMS[k].name + ' +' + n)).join('、');
      h += '<button class="ocard" data-a="origin" data-v="' + o.id + '" data-testid="origin-' + o.id + '">' + (IC.has('pl_' + o.id) ? '<span class="oface">' + ico('pl_' + o.id, '', 48) + '</span>' : '') + '<b>' + o.name + '</b><span class="od">' + o.desc + '</span><span class="oa">' + at + '</span><span class="op">' + pf + '</span><span class="og">' + gear + '・' + o.silver + ' 兩</span></button>';
    });
    return h + '</div></div>';
  }

  // ---------- 世界地圖：區域圖／大陸圖 ----------
  const CONT = [['zhong', '中山', '地層與冥門所在'], ['nan', '南山', '火與岩漿'], ['bei', '北山', '冰雪洞窟'], ['xi', '西山', '毒沼古墓'], ['dong', '東山', '廢棄廟宇'], ['haiwai', '海外', '異國異人'], ['dahuang', '大荒', '禁地']];
  function sceneContinent(S) {
    const R = SC.regions || {};
    let h = '<div class="map cont" data-testid="continent"><div class="contmap' + scn('map_continent') + '">';
    CONT.forEach(([k, n, d]) => { const p = R[k]; if (!p) return; h += '<div class="cchip' + (k === 'xi' ? ' on' : '') + '" style="left:' + (p[0] - 36) + 'px;top:' + (p[1] - 10) + 'px" title="' + d + '">' + n + '</div>'; });
    if (R.here) h += '<div class="chere" style="left:' + (R.here[0] + R.here[2] / 2 - 40) + 'px;top:' + (R.here[1] + R.here[3] + 4) + 'px">灰窯原（此地）</div>';
    h += '</div><button class="btn mapsw" data-a="mapView" data-v="region" data-testid="btn-region">回區域圖</button>';
    h += '<div class="ccap">十二神墜落之處散在四山之間。目前只走得到西山東麓的灰窯原，其餘尚未開放。</div></div>';
    return h;
  }
  function sceneMap(S) {
    const dest = S.dest; const p = dest ? G.travelPreview(dest) : null;
    const routeEdges = p ? p.edges : [];
    const td = G.tideInfo();
    let h;
    if (S.mapView === 'continent') h = sceneContinent(S);
    else {
      h = '<div class="map' + scn('map_region') + '" data-testid="worldmap">';
      h += '<div class="legend"><span>━ 官道</span><span>╍ 野徑</span><span class="red">■ 有傳聞</span></div>';
      h += '<button class="btn mapsw" data-a="mapView" data-v="continent" data-testid="btn-continent">大陸圖</button>';
      D.REGION_LABELS.forEach(([n, x, y]) => (h += '<div class="region" style="left:' + x + 'px;top:' + y + 'px">' + n + '</div>'));
      let svg = '<svg width="796" height="560">';
      D.EDGES.forEach((e) => {
        if (!G.known(e.a) || !G.known(e.b)) return;
        const a = D.NODES[e.a], b = D.NODES[e.b];
        const on = routeEdges.includes(e);
        svg += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#0b0a08" stroke-width="' + (on ? 8 : e.road ? 5.5 : 4) + '" stroke-opacity=".55"/>';
        svg += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (on ? '#e3bb5c' : e.road ? '#b9ae96' : '#958a74') + '" stroke-width="' + (on ? 4.5 : e.road ? 2.5 : 1.6) + '" ' + (e.road || on ? '' : 'stroke-dasharray="6 5"') + '/>';
      });
      svg += '</svg>';
      h += svg;
      Object.keys(D.NODES).forEach((id) => {
        if (!G.known(id)) return;
        const n = D.NODES[id];
        const rum = S.rumors.some((r) => r.node === id); const tide = td && td.town === id;
        const cls = (id === S.loc ? ' cur' : '') + (id === dest ? ' dest' : '') + (rum ? ' rum' : '') + (tide ? ' tide' : '') + (n.hidden ? ' secret' : '');
        h += '<div class="mnode' + cls + '" data-a="dest" data-v="' + id + '" data-testid="node-' + id + '" style="left:' + (n.x - 19) + 'px;top:' + (n.y - 19) + 'px">' + ico(n.ic, n.g, 32) + '</div>';
        h += '<div class="mlabel" data-a="dest" data-v="' + id + '" style="left:' + (n.x - 34) + 'px;top:' + (n.y + 23) + 'px;width:68px;justify-content:center;cursor:pointer">' + n.name + '</div>';
        if (id === S.loc) h += '<div class="here" style="left:' + (n.x - 22) + 'px;top:' + (n.y - 44) + 'px">此地</div>';
        else if (tide) h += '<div class="here tidel" style="left:' + (n.x - 22) + 'px;top:' + (n.y - 44) + 'px">獸潮</div>';
        else if (rum && id !== dest) h += '<div class="here ruml" style="left:' + (n.x - 22) + 'px;top:' + (n.y - 44) + 'px">傳聞</div>';
      });
      if (p) {
        const n = D.NODES[dest];
        const txt = tx(TX.map.bubble1, p) + '<br>' + tx(TX.map.bubble2, p);
        const w = 196; let x = n.x - w / 2; x = Math.max(6, Math.min(796 - w - 6, x));
        h += '<div class="tipbubble two" style="left:' + x + 'px;top:' + Math.max(4, n.y - 68) + 'px;width:' + w + 'px" data-testid="route-tip">' + txt + '</div>';
      }
      h += '<div class="hintbox" id="hintbox" data-testid="hintbox" style="display:none"></div>';
      h += '</div>';
    }
    // 出發條
    h += '<div class="departbar" data-testid="departbar">';
    if (p) {
      const n = D.NODES[dest];
      h += '<div class="dic">' + ico(n.ic, n.g, 32) + '</div><div class="dname"><b>' + n.name + '</b><span class="sub">經 ' + p.via + '</span></div>';
      // 底列五格：完整用詞＋懸浮說明（UI-02-05、wording-map §1）；「腳程」＝speedMult()，16:29 拍板
      const vp = (k, val, hot) => '<div class="vpill' + (hot ? ' hot' : '') + '" data-hint="' + k + '" data-testid="vp-' + k + '"><span class="vl">' + TX.map[k] + '</span><b>' + val + '</b></div>';
      h += vp('hours', tx(TX.map.hoursVal, p)) + vp('food', tx(TX.map.foodVal, p)) + vp('fat', tx(TX.map.fatVal, p)) + vp('risk', p.riskName, p.riskName === '高') + vp('speed', tx(TX.map.speedVal, { mult: p.mult.toFixed(2) }));
      h += '<button class="btn dark go" data-a="travel" data-testid="btn-travel">前往</button>';
    } else {
      const n = D.NODES[S.loc];
      h += '<div class="dic">' + ico(n.ic, n.g, 32) + '</div><div class="dname"><b>' + n.name + '</b><span class="sub">此地</span></div><span class="sub dhint">點任何地點設定目的地；每個地點都能進去。</span>';
      h += exploreBtn(S, 'dexp') + '<button class="btn dark go" data-a="enterHere" data-testid="btn-enter">進入此地</button>';
    }
    h += '</div>';
    h += '<div class="logbox" style="top:628px;height:74px" data-testid="log">' + logLines(S, 4) + '<span class="tag-tr">山海錄 灰盒 v0.3</span></div>';
    return h;
  }

  // ---------- 城鎮：平面圖（街上）與建築內部 ----------
  const TYPE_HINT = { market: '買賣', smith: '兵甲', apoth: '藥', inn: '歇腳・傳聞', board: '委託', shrine: '上香', tower: '遠望', drill: '操練', medic: '治傷', tea: '茶', bone: '撿來的', crow: '見聞' };
  function planBoxes(S) {
    const P = G.place(); const real = SC.buildings && SC.buildings[P.plan];
    const out = {};
    P.buildings.forEach((b, i) => { out[b] = (real && real[b]) || [50 + (i % 3) * 250, 90 + Math.floor(i / 3) * 190, 180, 120]; });
    out.gate = (real && real.gate) || [338, 440, 120, 70];
    return out;
  }
  function planSpots(S) {
    const P = G.place(); const real = SC.spots && SC.spots[P.plan];
    return real && real.length >= P.street.length ? real : [[150, 320], [400, 290], [620, 330], [280, 420], [540, 430]];
  }
  function npcFace(npc, size) { return IC.has(npc) ? ico(npc, '', size) : '<span class="gl nofc">' + D.NPCS[npc].name.slice(0, 1) + '</span>'; }
  function sceneTown(S) {
    return S.townTab ? sceneBuilding(S) : sceneStreet(S);
  }
  function sceneStreet(S) {
    const P = G.place(); const N = D.NODES[S.loc];
    const boxes = planBoxes(S); const spots = planSpots(S);
    const hurt = G.townHurt(S.loc); const td = G.tideInfo();
    let h = '<div class="plan' + scn(P.plan) + (S.street ? ' mute' : '') + '" data-testid="town">';
    h += '<div class="pname2">' + N.name + '</div>';
    h += '<button class="btn leave" data-a="toMap" data-testid="btn-leave">離開・地圖</button>';
    if (hurt || td) h += '<div class="cwarn" data-testid="city-warn">' + (hurt ? TX.city.hurt : TX.city.tide) + '</div>';
    P.buildings.forEach((bid) => {
      const B = D.BUILDINGS[bid]; const b = boxes[bid];
      const mark = B.type === 'board' && G.questsHere().some((q) => G.questReady(q)) ? '<i class="bmark">!</i>' : '';
      h += '<div class="bld" data-a="tab" data-v="' + bid + '" data-testid="bld-' + bid + '" style="' + pos(b[0], b[1], b[2], b[3]) + '" title="' + B.name + '：' + D.NPCS[B.npc].name + '"><span>' + B.name + '<em>' + TYPE_HINT[B.type] + '</em>' + mark + '</span></div>';
    });
    const g = boxes.gate;
    h += '<div class="bld gate" data-a="toMap" data-testid="bld-gate" style="' + pos(g[0], g[1], g[2], g[3]) + '"><span>' + (N.hidden ? '小徑' : S.loc === 'duyin' ? '關門' : '出口') + '</span></div>';
    // 街上的路人
    P.street.forEach((npc, i) => {
      const sp = spots[i]; const NP = D.NPCS[npc];
      const q = S.quests.find((x) => x.giver === npc);
      const mark = q && (q.status === 'hidden' || G.questReady(q)) ? '<i class="bmark">!</i>' : '';
      h += '<div class="fig' + (S.street === npc ? ' on' : '') + '" data-a="street" data-v="' + npc + '" data-testid="npc-' + npc + '" style="left:' + (sp[0] - 16) + 'px;top:' + (sp[1] - 32) + 'px">' + ico(NP.fig || 'fig_man', NP.name.slice(0, 1), 32) + '<span>' + NP.name + mark + '</span></div>';
    });
    if (S.street) h += streetDialog(S);
    h += '</div>';
    h += cityBar(S, hurt, td);
    h += '<div class="logbox" style="top:588px;height:114px" data-testid="log">' + logLines(S, 6) + '</div>';
    return h;
  }
  // ---------- 城況簡報（DEV-05；UI-02-01 收合／02 展開／03 受創求援；SPEC-01 §7） ----------
  // 只讀 G.cityView()（brief＋日結後的 P、O、B 對檔名），不重算任何數字。展開與否只是畫面狀態，不存檔。
  let cityOpen = false;
  function cityBar(S, hurt, td) {
    const v = G.cityView(S.loc);
    if (!v) return '<div class="citybox" data-testid="citybar"><div class="crow"><span class="sub cnone">' + G.place().desc + '</span>' + exploreBtn(S, 'cexp') + '</div></div>';
    const C = TX.city, b = v.brief;
    const tierKey = v.has ? b.treasuryTier : null;
    const tName = tierKey ? C.treasury[tierKey] : C.pendingTier;
    const arrow = v.has ? C.arrow[b.trend] : '';
    const pBad = v.pIdx === 0, oBad = v.oIdx === 0, tBad = tierKey === 'debt' || tierKey === 'tight';
    const tile = (k, label, name, bad, sub, ar) => '<div class="ctile' + (bad ? ' bad' : '') + '" data-testid="city-' + k + '"><span class="cl">' + label + '</span><b class="cv">' + name + (ar ? '<i class="car">' + ar + '</i>' : '') + '</b>' + (cityOpen ? '<span class="cs">' + sub + '</span>' : '') + '</div>';
    let delta = '';
    if (v.has) { const n = Math.round(Math.abs(b.dP)); delta = b.trend === 'flat' ? C.delta.flat : tx(C.delta[b.trend], { N: n }); }
    let h = '<div class="citybox' + (cityOpen ? ' open' : '') + (rescueOn(v) ? ' alarm' : '') + '" data-testid="citybar">';
    h += '<div class="crow">';
    h += '<button class="btn ctog" data-a="cityToggle" data-testid="city-toggle" title="' + C.toggleHint + '">' + C.title + '</button>';
    h += tile('prosperity', C.label.prosperity, v.pName, pBad, v.P + (delta ? '　' + delta : ''), arrow);
    h += tile('order', C.label.order, v.oName, oBad, String(v.O), '');
    h += tile('treasury', C.label.treasury, tName, tBad, v.has ? tx(C.treasuryAmount, { T: Math.round(b.T) }) : '', '');
    h += cityOpen ? '<button class="btn cclose" data-a="cityToggle" data-testid="city-collapse">' + C.collapse + '</button>' : exploreBtn(S, 'cexp');
    h += '</div>';
    if (cityOpen) {
      h += '<div class="cdetail" data-testid="city-detail">';
      if (rescueOn(v)) h += '<div class="crescue" data-testid="city-rescue">' + tx(C.rescue, { rescueAmt: Math.round(b.rescueAmt) }) + '</div>';
      if (v.has) {
        // 因果句：flat 時不出句，只寫「與昨日持平」（§7.5）
        const why = b.trend === 'flat' || !b.whyCode ? C.trend.flat : tx(C.why[b.whyCode], { trend: C.trend[b.trend], bandit: v.bName });
        h += '<div class="cline cwhy" data-testid="city-why">' + why + '</div>';
        h += '<div class="cline" data-testid="city-money"><span>' + tx(C.treasuryIn, b) + '</span><span>' + tx(C.treasuryOut, b) + '</span><span>' + tx(C.treasuryNet, { treasuryNet: sgn(b.treasuryNet) }) + '</span><span data-testid="city-amount">' + tx(C.treasuryAmount, { T: Math.round(b.T) }) + '</span></div>';
        if (b.taxCutDays > 0) h += '<div class="cline" data-testid="city-taxcut">' + tx(C.taxcut, b) + '</div>';
      } else h += '<div class="cline cwhy" data-testid="city-why">' + C.pending + '</div>';
      const gs = v.has && b.aidToday ? '（' + tx(C.garrisonAid, b) + '）' : v.has && b.debtToday ? '（' + C.garrisonDebt + '）' : '';
      h += '<div class="cline dim" data-testid="city-misc"><span data-testid="city-garrison">' + C.label.garrison + ' ' + v.gName + gs + '</span><span data-testid="city-bandit">' + C.label.bandit + ' ' + v.bName + ' ' + v.B + '</span><span>' + tx(C.tradeTax, { pct: Math.round(D.WORLD.TRADE_TAX * 100) }) + '</span></div>';
      h += '</div>';
    }
    return h + '</div>';
  }
  function rescueOn(v) { return !!(v && v.has && v.brief.rescueToday); }
  function streetDialog(S) {
    const npc = S.street; const NP = D.NPCS[npc];
    const q = S.quests.find((x) => x.giver === npc);
    let h = '<div class="sdlg" data-testid="street-dialog"><div class="sface">' + npcFace(npc, 72) + '</div><div class="sname"><b>' + NP.name + '</b><span class="sub">' + NP.title + '</span></div>';
    h += '<div class="stext" data-testid="say">' + esc((S.say && S.say.npc === npc && S.say.text) || '……') + '</div><div class="sbtns">';
    h += '<button class="btn" data-a="talk" data-v="' + npc + '" data-testid="btn-talk">閒談</button>';
    if (NP.act === 'rumor') h += '<button class="btn gold" data-a="cheapRumor" data-testid="btn-cheap-rumor">給一文錢</button>';
    if (q && q.status === 'hidden') h += '<button class="btn gold" data-a="bounty" data-v="' + q.id + '" data-testid="bounty-' + q.id + '">接下：' + q.title + '</button>';
    else if (q && q.status !== 'claimed') h += '<button class="btn ' + (G.questReady(q) ? 'dark' : 'dis') + '" ' + (G.questReady(q) ? '' : 'disabled') + ' data-a="bounty" data-v="' + q.id + '" data-testid="bounty-' + q.id + '">交付：' + q.title + '（' + G.questReward(q) + ' 兩）</button>';
    h += '<button class="btn" data-a="streetClose" data-testid="btn-street-close">離開</button></div></div>';
    return h;
  }
  function sceneBuilding(S) {
    const B = G.bld(); const NP = D.NPCS[B.npc]; const F = B.faction ? D.FACTIONS[B.faction] : null;
    let h = '<div class="bhead" data-testid="town"><div class="bface">' + npcFace(B.npc, 96) + '</div>';
    h += '<div class="btitle"><b data-testid="bld-name">' + B.name + '</b><span>' + NP.name + (NP.title ? '・' + NP.title : '') + '</span>' + (F ? '<span class="bfac">' + ico(F.ic, F.g, 16) + F.name + ' ' + Math.floor(G.repOf(B.faction)) + '</span>' : '') + '</div>';
    h += '<div class="bsay" data-testid="say">' + esc((S.say && S.say.text) || '……') + '</div>';
    h += '<div class="bbtns"><button class="btn" data-a="talk" data-v="' + B.npc + '" data-testid="btn-talk">閒談</button><button class="btn dark" data-a="tab" data-v="" data-testid="btn-street">回到街上</button></div></div>';
    h += '<div class="tpanel">';
    const c = G.innCost();
    const svc = (k, g, name, sub, tid, dis) => '<div class="ibox' + (dis ? ' dis' : '') + '" data-a="svc" data-v="' + k + '" data-testid="' + (tid || 'svc-' + k.split(':')[0]) + '"><span class="ic">' + g + '</span><span><b>' + name + '</b>' + sub + '</span></div>';
    switch (B.type) {
      case 'market': case 'smith': case 'bone': h += tabShop(S, B, 0); break;
      case 'apoth': h += tabShop(S, B, 0) + '<div class="ttl" style="left:0;top:280px">藥爐（煉藥 ' + G.profLv('yao') + '）</div>' + recipeCards(S, 0, 298); break;
      case 'inn': {
        const free = S.freeRumor[S.loc] !== G.dayOf(S.t);
        h += '<div class="irow" style="left:0;top:8px">' + svc('rest', '宿', '歇一夜', c.rest + ' 兩・睡到 08:00・侵蝕 −10', 'inn-rest') + svc('soup', '食', '熱湯', c.soup + ' 兩・飽食 +30', 'inn-soup') + '<div class="ibox" data-a="hearRumor" data-testid="inn-rumor"><span class="ic">聞</span><span><b>打聽傳聞</b>' + (free ? '今日第一則免費' : '請酒 ' + c.rumor + ' 兩') + '</span></div></div>';
        h += rumorList(S, 84);
        break;
      }
      case 'tea': {
        const free = S.freeRumor[S.loc] !== G.dayOf(S.t);
        h += '<div class="irow" style="left:0;top:8px">' + svc('tea', '茶', '粗茶', c.tea + ' 兩・疲累 −10、飽食 +10') + svc('nap', '歇', '歇腳', c.nap + ' 兩・2 小時・疲累 −20') + '<div class="ibox" data-a="hearRumor" data-testid="inn-rumor"><span class="ic">聞</span><span><b>聽過路人說</b>' + (free ? '今日第一則免費' : '請茶 ' + c.rumor + ' 兩') + '</span></div></div>';
        h += rumorList(S, 84);
        break;
      }
      case 'board': h += tabBounty(S); break;
      case 'shrine':
        h += '<div class="irow" style="left:0;top:8px">' + svc('offer', '香', '上香', '需要線香 ×1（持有 ' + G.countItem('incense') + '）') + '</div>';
        h += '<div class="note" style="top:84px">香爐是冷的。神像的臉裂成兩半。</div>';
        break;
      case 'tower':
        h += '<div class="irow" style="left:0;top:8px">' + svc('look', '望', '登樓遠望', '半小時・看得出獸潮還有幾天') + '</div>';
        h += '<div class="note" style="top:84px">關門三年沒開過。門外是血霧起的方向。</div>';
        break;
      case 'medic':
        h += '<div class="irow" style="left:0;top:8px">' + svc('heal', '治', '治傷', c.heal + ' 兩・生命回滿') + svc('cleanse', '清', '清除侵蝕', c.cleanse + ' 兩・目前侵蝕 ' + S.corrupt) + svc('bunk', '鋪', '睡通鋪', (c.bunk ? c.bunk + ' 兩' : '免費') + '・睡到 08:00') + '</div>';
        h += '<div class="note" style="top:84px">被血霧侵蝕的人，生命上限會一點一點掉。客棧歇一夜能退一些，這裡能清乾淨。</div>';
        break;
      case 'drill': h += tabDrill(S, c); break;
      case 'crow': {
        const fresh = S.codex.filter((x) => !S.reported.includes(x)).length;
        h += '<div class="irow" style="left:0;top:8px">' + svc('report', '報', '回報見聞', fresh ? fresh + ' 條新的・共 ' + fresh * c.report + ' 兩' : '沒有新的見聞') + svc('yaying', '影', '學〈鴉影〉', S.skills.includes('yaying') ? '已習得' : c.yaying + ' 兩・鴉衛聲望 14', null, S.skills.includes('yaying')) + '</div>';
        h += '<div class="ttl" style="left:0;top:84px">請赤鴉辨傳聞（' + c.judge + ' 兩一則・鴉衛聲望 6）</div>';
        if (!S.rumors.length) h += '<div class="note" style="top:102px">你身上沒有記著的傳聞。</div>';
        S.rumors.forEach((r, i) => (h += '<div class="rrow" style="top:' + (102 + i * 34) + 'px"><span class="rtx">【' + D.RUMOR.kinds[r.kind].name + '・' + D.NODES[r.node].name + '】' + (r.judged ? '<span class="hint">' + D.RUMOR.trace[r.truth] + '</span>' : esc(cut(r.text, 30))) + '</span><button class="btn ' + (r.judged ? 'dis' : 'gold') + '" ' + (r.judged ? 'disabled' : '') + ' data-a="svc" data-v="judge:' + r.id + '" data-testid="btn-judge-' + i + '">' + (r.judged ? '已辨' : '辨') + '</button></div>'));
        break;
      }
    }
    h += '</div>';
    h += '<div class="logbox" style="top:642px;height:60px" data-testid="log">' + logLines(S, 3) + '</div>';
    return h;
  }
  function rumorList(S, top) {
    let h = '<div class="ttl" style="left:0;top:' + top + 'px">記著的傳聞 ' + S.rumors.length + '/' + D.RUMOR.max + '</div>';
    if (!S.rumors.length) h += '<div class="note" style="top:' + (top + 18) + 'px">還沒聽到什麼。傳聞可能是真的、過時的，也可能是個餌。聽到就該動身。</div>';
    S.rumors.forEach((r, i) => (h += '<div class="rcardL" style="top:' + (top + 18 + i * 62) + 'px"><b>【' + D.RUMOR.kinds[r.kind].name + '】' + D.NODES[r.node].name + '　<span class="sub">剩 ' + (D.RUMOR.days - (G.dayOf(S.t) - r.day)) + ' 天</span></b><span>' + esc(r.text) + '</span>' + (r.hint ? '<span class="hint">' + r.hint + '</span>' : '') + '</div>'));
    return h;
  }
  function tabDrill(S, c) {
    let h = '<div class="ttl" style="left:0;top:0">校場操練（' + c.drill + ' 兩・4 小時・疲累 +20・該項武藝大幅成長）</div>';
    D.PROFS.filter((p) => p.grp === 'wu').forEach((p, i) => {
      const x = (i % 3) * 262, y = 18 + Math.floor(i / 3) * 56;
      const next = Object.keys(p.perks).map(Number).sort((a, b) => a - b).find((t) => G.profLv(p.id) < t);
      h += '<div class="dcard" style="left:' + x + 'px;top:' + y + 'px"><span class="bt"><b>' + p.name + ' ' + G.profLv(p.id) + '</b><span class="sub">' + (next ? next + '：' + cut(p.perks[next], 14) : '已無新門檻') + '</span></span><button class="btn" data-a="svc" data-v="drill:' + p.id + '" data-testid="drill-' + p.id + '">操練</button></div>';
    });
    const has = S.skills.includes('pozhen');
    h += '<div class="ttl" style="left:0;top:194px">軍團傳授</div><div class="dcard wide" style="left:0;top:212px">' + ico('s_pozhen', '陣', 32) + '<span class="bt"><b>破陣</b><span class="sub">' + D.SKILLS.pozhen.desc + '需破曉軍團聲望 10（目前 ' + Math.floor(G.repOf('dawn')) + '）</span></span><button class="btn ' + (has ? 'dis' : 'gold') + '" ' + (has ? 'disabled' : '') + ' data-a="svc" data-v="pozhen" data-testid="svc-pozhen">' + (has ? '已習得' : '學（' + c.pozhen + ' 兩）') + '</button></div>';
    return h;
  }
  function tabShop(S, B) {
    const shop = G.shopRows();
    let h = '<div class="ttl" style="left:0;top:0">貨架（可拖進行囊）</div><div class="shelf">';
    for (let i = 0; i < 18; i++) {
      const x = (i % 9) * 52, y = 16 + Math.floor(i / 9) * 52;
      const row = shop[i];
      if (!row) { h += '<div class="cell empty" style="' + pos(x, y, 48, 48) + 'cursor:default"></div>'; continue; }
      const it = row.it; const sel = S.trade && S.trade.mode === 'buy' && S.trade.idx === i ? ' sel' : '';
      const price = G.buyPrice(row); const lock = G.rowLocked(row);
      let ar = '';
      if (it.k !== 'eq' && D.PRICES.huiyao[it.k]) ar = price < G.avgPrice(it.k) * 0.8 ? '<span class="ar">↓</span>' : '';
      h += '<div class="cell click' + rcls(it) + sel + (lock ? ' rlock' : '') + '" data-a="shop" data-v="' + i + '" data-shop="' + i + '"' + (lock ? '' : ' data-drag="shop:' + i + '"') + ' data-testid="shop-' + i + '" style="' + pos(x, y, 48, 48) + '">' + itIco(it) + ar + '<span class="pr">' + price + '</span>' + (lock ? '<span class="tl">鎖</span>' : '') + '</div>';
    }
    h += '</div>';
    const what = B.buys === 'all' ? '什麼都收' + (B.buyMult ? '（九折）' : '') : '只收' + B.buys.map((k) => ({ herb: '藥草', potion: '藥水', ore: '礦石', eq: '裝備', beast: '獸皮獸肉', tag: '軍牌', relic: '神骨' }[k])).join('、') + '（加價 15%）';
    h += '<div class="ttl" style="left:0;top:128px">收購（你的貨）・' + what + '</div>';
    let n = 0;
    S.pack.forEach((it, i) => {
      if (!it || n >= 18) return;
      const p = G.sellPrice(it); if (!p) return;
      const x = (n % 9) * 52, y = 144 + Math.floor(n / 9) * 52; n++;
      let ar = '';
      if (it.k !== 'eq') { const tp = G.townPrice(it.k), av = G.avgPrice(it.k); ar = tp > av ? '<span class="ar up">↑</span>' : tp < av ? '<span class="ar">↓</span>' : ''; }
      const sel = S.trade && S.trade.mode === 'sell' && S.trade.slot === i ? ' sel' : '';
      h += '<div class="cell click' + rcls(it) + sel + '" data-a="pack" data-v="' + i + '" data-testid="buyback-' + i + '" style="' + pos(x, y, 48, 48) + '">' + itIco(it) + ar + '<span class="pr">' + p + '</span>' + (it.k !== 'eq' && it.n > 1 ? '<span class="tl">×' + it.n + '</span>' : '') + '</div>';
    });
    if (!n) h += '<div class="sub" style="position:absolute;left:0;top:150px">行囊裡沒有這家店收的東西。</div>';
    h += '<div class="sub" style="position:absolute;left:0;top:254px">↑ 高於兩地均價　↓ 低於均價　行囊格右鍵或拖到右側＝賣出</div>';
    h += '<div class="trade" data-drop="sell" data-testid="trade">' + tradeBody(S) + '</div>';
    h += '<div id="shoptip" class="trade" style="display:none;z-index:20"></div>';
    return h;
  }
  function describe(it) {
    if (it.k === 'eq') {
      const B = G.eqBase(it.eq);
      const head = (B.bag ? B.bag + ' 格・重 ' + B.wt + '・現 ' + G.bagCap() + ' 格' : (B.slot === 'ring' ? '戒指' : D.SLOT_NAMES[B.slot]) + '・重 ' + B.wt + '・' + D.RARITY[it.eq.rarity].name);
      const lines = [];
      if (B.dmg) lines.push('傷害 ' + B.dmg[0] + '–' + B.dmg[1] + (B.twoHanded ? '（雙手）' : '') + '・' + D.WTYPE_NAMES[B.wtype || 'dao']);
      if (B.armor) lines.push('護甲 ' + B.armor + (B.ac ? '・' + (B.ac === 'light' ? '輕甲' : '重甲') : ''));
      if (B.cap) lines.push('負重上限 +' + B.cap);
      if (B.req) lines.push('需要 ' + Object.keys(B.req).map((k) => D.ATTRS.find((a) => a.id === k).name + ' ' + B.req[k]).join('、') + (G.reqUnmet(it.eq) ? '（不足）' : ''));
      if (it.eq.unid) lines.push('？？？　未鑑定');
      else { it.eq.affixes.forEach((a) => lines.push('■ ' + D.AFFIXES[a.id].t.replace('{v}', a.v))); if (it.eq.unique) lines.push('◆ ' + D.UNIQUES[it.eq.unique]); }
      return { head, lines };
    }
    const I = D.ITEMS[it.k];
    return { head: '單重 ' + I.wt + '・' + TYPE_NAMES[I.type], lines: [I.desc] };
  }
  function tradeBody(S, preview) {
    const tr = preview || S.trade;
    if (!tr) return '<div class="sub" style="position:absolute;left:8px;top:8px">點貨架商品＝買；點你的貨＝賣。</div><div class="sub" style="position:absolute;left:8px;top:28px">也可以把行囊裡的東西拖到這裡賣掉。</div><div class="tbtns"><button class="btn dark dis" disabled>買</button><button class="btn dis" disabled>賣出所選</button></div>';
    let it, unit, qty = tr.qty || 1; const mode = tr.mode; let lock = null;
    if (mode === 'buy') { const row = G.shopRows()[tr.idx]; if (!row) return ''; it = row.it; unit = G.buyPrice(row); if (G.rowLocked(row)) lock = Object.keys(row.rep).map((f) => D.FACTIONS[f].name + '聲望 ' + row.rep[f]).join('、'); }
    else { it = S.pack[tr.slot]; if (!it) return ''; unit = G.sellPrice(it); }
    if (it.k === 'eq') qty = 1;
    const d = describe(it); const total = unit * qty;
    const after = mode === 'buy' ? S.silver - total : S.silver + total;
    let h = '<div class="cell tic' + rcls(it) + '">' + itIco(it) + '</div>';
    h += '<div class="tnm">' + esc(G.itemName(it)) + '</div><div class="tds">' + d.head + '</div>';
    h += '<div class="tdet">' + (lock ? ['需要 ' + lock] : []).concat(d.lines).slice(0, 4).map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>';
    if (!preview) h += '<div class="qty"><button data-a="qty" data-v="-1">−</button><span data-testid="trade-qty">' + qty + '</span><button data-a="qty" data-v="1">+</button></div>';
    h += '<div class="tprice">' + total + '兩</div><div class="tafter' + (after < 0 ? ' red' : '') + '">銀 ' + S.silver + ' → ' + after + '</div>';
    if (!preview) {
      const unid = mode === 'sell' && it.k === 'eq' && it.eq.unid && G.bld().identify;
      h += '<div class="tbtns"><button class="btn dark' + (mode !== 'buy' || lock ? ' dis' : '') + '" ' + (mode !== 'buy' || lock ? 'disabled' : '') + ' data-a="buy" data-testid="btn-buy">買</button><button class="btn' + (mode !== 'sell' ? ' dis' : '') + '" ' + (mode !== 'sell' ? 'disabled' : '') + ' data-a="sell" data-testid="btn-sell">賣出所選</button>' + (unid ? '<button class="btn gold" data-a="identifyPay" data-v="' + tr.slot + '" data-testid="btn-identify">鑑定 ' + G.identifyFee(it.eq) + '兩</button>' : '') + '</div>';
    } else h += '<div class="tbtns sub">點選後可買，或直接拖進行囊</div>';
    return h;
  }
  // 配方卡（精簡版，一列五張）
  function recipeCards(S, left0, top) {
    let h = '';
    D.RECIPES.forEach((R, i) => {
      const have = G.countItem(R.mat); const ok = have >= R.n && G.canCraftHere(R);
      const x = left0 + i * 156;
      h += '<div class="rcard' + (ok ? '' : ' dim') + '" style="left:' + x + 'px;top:' + top + 'px" data-testid="recipe-' + R.id + '" title="' + R.name + '：' + D.ITEMS[R.out].desc + '（' + R.where + '）">';
      h += '<div class="ric">' + ico(R.out, R.g, 32) + '</div><div class="rnm">' + R.name + '</div><div class="ref">' + R.eff + '</div>';
      h += '<div class="cell rmat' + (have >= R.n ? '' : ' lack') + '">' + ico(R.mat, D.ITEMS[R.mat].g, 24) + '<span class="n">' + have + '/' + R.n + '</span></div><div class="rarr">→</div>';
      h += '<button class="btn rmk' + (ok ? ' dark' : ' dis') + '" ' + (ok ? '' : 'disabled') + ' data-a="craft" data-v="' + R.id + '" data-testid="craft-' + R.id + '">' + (R.fireOnly && !(S.scene === 'wild') ? '需營火' : '製') + '</button></div>';
    });
    return h;
  }
  // 鎮公所委託單（UI-02-06、wording-map §2）：目標／地點／報酬／時限／風險寫在單上，不另開確認窗
  function tabBounty(S) {
    const Q = TX.quest;
    let h = '<div class="ttl" style="left:0;top:0">委託・' + D.NODES[S.loc].name + '</div>';
    const day = G.dayOf(S.t);
    const ord = { done: 0, active: 1, open: 2, claimed: 3 };
    const list = G.questsHere().slice().sort((a, b) => (G.questReady(b) ? 1 : 0) - (G.questReady(a) ? 1 : 0) || ord[a.status] - ord[b.status]).slice(0, 12);
    h += '<div class="qgrid" data-testid="quest-grid">';
    list.forEach((q) => {
      const ready = G.questReady(q);
      let btn;
      if (q.status === 'open') btn = '<button class="btn qbtn" data-a="bounty" data-v="' + q.id + '" data-testid="bounty-' + q.id + '">' + Q.take + '</button>';
      else if (ready) btn = '<button class="btn dark qbtn" data-a="bounty" data-v="' + q.id + '" data-testid="bounty-' + q.id + '">' + Q.deliver + '</button>';
      else if (q.status === 'claimed') btn = '<button class="btn dis qbtn" disabled>' + Q.claimed + '</button>';
      else btn = '<button class="btn dis qbtn" disabled>' + (q.kind === 'deliver' ? Q.delivering : tx(Q.progress, { a: q.kind === 'collect' ? Math.min(q.need, G.countItem(q.item)) : q.prog, b: q.need })) + '</button>';
      const where = q.kind === 'deliver' ? (q.to === S.loc ? Q.whereHere : G.questWhere(q)) : q.kind === 'collect' ? Q.whereBring : G.questWhere(q);
      const left = q.due ? q.due - day : null;
      const due = left === null ? Q.dueLong : left <= 0 ? Q.dueToday : tx(Q.dueLeft, { n: left });
      const urgent = left !== null && left <= 1;
      const rk = G.questRisk(q);
      const fail = rk.fail === 'deposit' ? Q.failDeposit : rk.fail === 'deadline' ? Q.failDeadline : Q.failNone;
      h += '<div class="qsheet' + (ready ? ' ready' : '') + '" data-testid="qsheet-' + q.id + '">';
      h += '<div class="qtar"><span class="ql">' + Q.target + '</span><b>' + q.title + '</b></div>';
      h += '<div class="qwhere">' + where + '</div>';
      h += '<div class="qrow"><span class="ql">' + Q.reward + '</span><b class="gold">' + tx(Q.rewardVal, { reward: G.questReward(q) }) + '</b>' + (q.deposit ? '<span>' + tx(Q.depositVal, q) + '</span>' : '') + '</div>';
      h += '<div class="qrow' + (urgent ? ' urgent' : '') + '" data-testid="qdue-' + q.id + '"><span class="ql">' + Q.due + '</span><b>' + due + '</b></div>';
      h += '<div class="qrisk' + (rk.high ? ' high' : rk.level ? '' : ' none') + '" data-testid="qrisk-' + q.id + '"><div><span class="ql">' + Q.risk + '</span><b>' + (rk.level ? tx(Q.riskVal, { level: rk.level }) : Q.riskNone) + '</b></div><div class="qfail">' + fail + '</div></div>';
      h += btn + '</div>';
    });
    h += '</div>';
    if (!list.length) h += '<div class="note" style="top:24px">板上空空如也，明天再來看看。</div>';
    const act = G.activeQuests().filter((q) => q.town !== S.loc && !(q.kind === 'deliver' && q.to === S.loc)).map((q) => q.title + '（' + D.NODES[q.town].name + '）').join('、');
    h += '<div class="note" style="top:474px">每天補到 3 張，過期撕榜。完成委託會提高破曉軍團的聲望。' + (act ? '你在別處還有：' + cut(act, 40) : '') + '</div>';
    return h;
  }

  // ---------- 傳聞現場（荒野／地城共用） ----------
  function rumorChips(S) {
    const list = G.rumorsHere(); if (!list.length) return '';
    let h = '<div class="rchips" data-testid="rumor-here">';
    list.forEach((r) => {
      h += '<div class="rchip"><span class="rk">傳聞・' + D.RUMOR.kinds[r.kind].name + '</span>';
      if (G.perk('zong', 25) && !r.traced) h += '<button class="btn" data-a="trace" data-v="' + r.id + '" data-testid="btn-trace">查看痕跡</button>';
      h += '<button class="btn gold" data-a="investigate" data-v="' + r.id + '" data-testid="btn-investigate">查探（1 小時）</button></div>';
    });
    return h + '</div>';
  }

  // ---------- 荒野 ----------
  const PT_IC = { herb: 'p_herb', ore: 'p_ore', track: 'p_track' };
  function sceneWild(S) {
    const W = D.WILDS[S.loc]; const ns = G.nodeState(S.loc);
    let h = '<div class="wildscene' + scn('wild_' + S.loc) + '" data-testid="wild">';
    h += '<div class="stagehead"><span class="pill">' + D.NODES[S.loc].name + '</span><span class="pill">險 ' + W.risk + '</span>' + (G.tideInfo() ? '<span class="pill hot">獸潮</span>' : '') + '</div>';
    h += '<button class="btn" style="position:absolute;right:6px;top:6px;font-weight:700" data-a="toMap" data-testid="btn-leave">離開・地圖</button>';
    h += rumorChips(S);
    G.wildPoints(S.loc).forEach((p) => {
      const n = ns.pts[p.id] || 0; const done = n <= 0;
      h += '<div class="gpt' + (done ? ' done' : '') + '" data-a="gpt" data-v="' + p.id + '" data-testid="gpt-' + p.id + '" style="left:' + (p.x - 22) + 'px;top:' + (p.y - 22) + 'px">' + ico(PT_IC[p.kind], '', 32) + '</div>';
      h += '<div class="gptl' + (done ? ' done' : '') + '" style="left:' + (p.x - 34) + 'px;top:' + (p.y + 26) + 'px;width:68px;justify-content:center">' + p.label + ' ' + n + '</div>';
    });
    h += '<div class="gpt fire' + (S.fire ? ' lit' : '') + '" data-a="camp" style="left:' + (W.fire.x - 22) + 'px;top:' + (W.fire.y - 22) + 'px">' + ico('ui_fire', '', 32) + '</div><div class="gptl" style="left:' + (W.fire.x - 34) + 'px;top:' + (W.fire.y + 26) + 'px;width:68px;justify-content:center">' + (S.fire ? '營火・燃' : '營火位') + '</div>';
    h += '<div class="scap">' + W.scene + (G.isNight(S.t) ? '　夜裡，遇險上升。' : '') + '</div>';
    h += '</div>';
    const herbF = Math.round(G.gatherFat('herb')), oreF = Math.round(G.gatherFat('ore'));
    h += '<div class="gbtns">';
    h += '<button class="gbtn" data-a="gather" data-v="herb" data-testid="act-herb"><span class="ic">' + ico('p_herb', '草', 28) + '</span><span><b>採藥</b><span>1 小時・疲 +' + herbF + '</span></span></button>';
    h += '<button class="gbtn" data-a="gather" data-v="ore" data-testid="act-ore"><span class="ic">' + ico('p_ore', '礦', 28) + '</span><span><b>挖礦</b><span>2 小時・疲 +' + oreF + '</span></span></button>';
    h += '<button class="gbtn" data-a="gather" data-v="track" data-testid="act-track"><span class="ic">' + ico('p_track', '獸', 28) + '</span><span><b>追蹤</b><span>1 小時・入戰</span></span></button>';
    h += '<button class="gbtn" data-a="explore" data-testid="btn-explore"><span class="ic">' + ico('ui_explore', '探', 28) + '</span><span><b>探查</b><span>1 小時・四處翻找</span></span></button>';
    h += '<button class="gbtn hot" data-a="camp" data-testid="act-camp"><span class="ic">' + ico('ui_fire', '火', 28) + '</span><span><b>' + (S.fire ? '露宿' : '紮營') + '</b><span>' + (S.fire ? '8 小時・夜警' : '生火・1 小時') + '</span></span></button>';
    h += '</div>';
    h += '<div class="recipes" data-testid="recipes"><div class="ttl" style="left:8px;top:4px">營火' + (S.fire ? '' : '（未生火：先紮營）') + '　煉藥 ' + G.profLv('yao') + '・烹食 ' + G.profLv('peng') + '</div>' + recipeCards(S, 4, 24) + '</div>';
    h += '<div class="logbox" style="top:592px;height:110px" data-testid="log">' + logLines(S, 6) + '</div>';
    return h;
  }

  // ---------- 地城 ----------
  function sceneDungeon(S) {
    const DG = D.DUNGEONS[S.loc]; const st = S.dungeon;
    const cleared = st.clearedDay === G.dayOf(S.t);
    let h = '<div class="dgscene' + scn('dg_' + S.loc) + '" data-testid="dungeon">';
    h += '<div class="stagehead"><span class="pill">' + D.NODES[S.loc].name + '</span><span class="pill' + (DG.risk === '極高' ? ' hot' : '') + '">險 ' + DG.risk + '</span>' + (DG.mist ? '<span class="pill hot">血霧：每層侵蝕 +' + DG.mist + '</span>' : '') + '</div>';
    h += rumorChips(S);
    h += '<div class="dgdesc">' + DG.scene + '</div>';
    h += '<div class="floors">';
    DG.floors.forEach((f, i) => {
      const cls = cleared || i < st.floor ? ' done' : i === st.floor ? ' cur' : '';
      h += '<div class="floor' + cls + '"><b>' + DG.floorNames[i] + (i === DG.floors.length - 1 ? '・首領' : '') + '</b>' + f.map((e) => '<div class="fe">' + ico(D.ENEMIES[e].ic || e, D.ENEMIES[e].g, 24) + '<span>' + D.ENEMIES[e].name + '</span></div>').join('') + '<div class="sub fs">' + (cleared || i < st.floor ? '已清' : i === st.floor ? '下一層' : '未探') + '</div></div>';
    });
    h += '</div>';
    h += '<div class="dgdesc" style="top:318px">掉落：' + DG.drops + '（良品以上未鑑定）</div>';
    h += '</div><div class="dgact">';
    if (cleared) h += '<button class="btn dis" disabled>今日已清空</button>';
    else h += '<button class="btn dark" data-a="delve" data-testid="btn-delve">深入' + DG.floorNames[st.floor] + '（1 小時）</button>';
    h += exploreBtn(S) + '<button class="btn" data-a="toMap" data-testid="btn-leave">離開・地圖</button><span class="sub">層與層之間可從左欄喝藥、吃糧。</span></div>';
    h += '<div class="logbox" style="top:542px;height:160px" data-testid="log">' + logLines(S, 9) + '</div>';
    return h;
  }

  // ---------- 戰鬥 ----------
  const INTENT = { atk: ['⚔ 攻擊', ''], heavy: ['✕ 重擊', 'heavy'], bleed: ['撕咬・流血', ''], poison: ['毒咬・下毒', 'poison'], drain: ['吸血', 'poison'], corrupt: ['血霧・侵蝕', 'heavy'] };
  function intentHtml(e, stun) {
    const it = e.intent; if (!it) return '';
    if (stun) return '<div class="intent guard">措手不及</div>';
    if (e.stag > 0) return '<div class="intent guard">失衡：無法行動</div>';
    if (it.k === 'charge') return '<div class="intent charge">蓄力：將重擊</div>';
    if (it.k === 'guard') return '<div class="intent guard">◆ 防禦 +6</div>';
    const I = INTENT[it.k] || INTENT.atk;
    return '<div class="intent ' + I[1] + '">' + I[0] + ' ' + it.range[0] + '–' + it.range[1] + '</div>';
  }
  function estat(e) {
    const a = [];
    if (e.bleed > 0) a.push(['st_bleed', '血', '流血 ' + e.bleed]); if (e.poison > 0) a.push(['st_poison', '毒', '中毒 ' + e.poison]);
    if (e.brk > 0) a.push(['st_break', '破', '破甲 ' + e.brk]); if (e.stag > 0) a.push(['st_stagger', '衡', '失衡']);
    if (e.guard > 0) a.push(['st_guard', '防', '防禦中']); if (e.charged) a.push(['st_charge', '蓄', '蓄力']);
    if (e.raged) a.push(['', '怒', '狂怒：傷害提高']);
    return a.map((x) => '<span class="stc" title="' + x[2] + '">' + ico(x[0], x[1], 16) + '</span>').join('');
  }
  function combatBg(ctx) {
    if (ctx.type === 'dungeon') return scn('dg_' + ctx.node);
    if (ctx.type === 'event') return scn('road');
    return SC.has('wild_' + ctx.node) ? scn('wild_' + ctx.node) : SC.has('dg_' + ctx.node) ? scn('dg_' + ctx.node) : scn('road');
  }
  function sceneCombat(S) {
    const c = S.combat;
    const ctx = c.ctx; const N = D.NODES[ctx.node];
    const where = ctx.type === 'dungeon' ? N.name + '・' + D.DUNGEONS[ctx.node].floorNames[ctx.floor] : ctx.type === 'hunt' ? N.name + '・狩獵' : ctx.type === 'event' ? '旅途遇襲' : ctx.type === 'rumor' ? N.name + '・傳聞現場' : N.name + '・遇襲';
    let h = '<div class="cstage' + combatBg(ctx) + '" data-testid="combat"><div class="cshade"></div><div class="cflash"></div>';
    h += '<div class="chead"><span class="pill" style="left:0;top:0">' + where + '</span>';
    h += '<div class="order" data-testid="order"><span class="sub">順序</span>' + G.combatOrder().map((o) => o.who === 'you' ? '<span class="o you">你</span>' : '<span class="o">' + c.enemies[o.who].g + '</span>').join('') + '</div>';
    h += '<span class="pill" style="right:0;top:0;left:auto" data-testid="round">第 ' + c.round + ' 回合</span></div>';
    const n = c.enemies.length;
    c.enemies.forEach((e, i) => {
      const x = n === 1 ? 298 : i === 0 ? 150 : 446;
      const dead = e.hp <= 0; const E = D.ENEMIES[e.id];
      h += '<div class="enemy' + (dead ? ' dead' : '') + (i === c.target && !dead ? ' tgt' : '') + (E.boss ? ' boss' : '') + '" data-a="target" data-v="' + i + '" data-max="' + e.max + '" data-testid="enemy-' + i + '" style="left:' + x + 'px">';
      h += '<div class="ename">' + e.name + '</div><div class="ehp"><i style="width:' + (Math.max(0, e.hp / e.max) * 100).toFixed(1) + '%"></i></div><div class="ehpn">' + Math.max(0, e.hp) + '/' + e.max + '</div><div class="est">' + (dead ? '' : estat(e)) + '</div>';
      if (!dead) h += '<div data-testid="intent-' + i + '">' + intentHtml(e, c.stun > 0) + '</div>';
      h += '<div class="body">' + ico(E.ic || e.id, e.g, 192) + '</div>';
      h += '</div>';
    });
    // 自己的狀態牌：生命、疲累、身上的異常
    const mh = G.maxHp(); const face = 'pl_' + S.origin;
    const pst = [];
    if (c.bleed > 0) pst.push(['st_bleed', '血', '流血 ' + c.bleed]); if (c.poison > 0) pst.push(['st_poison', '毒', '中毒 ' + c.poison]);
    if (S.corrupt > 0) pst.push(['st_corrupt', '蝕', '侵蝕 ' + S.corrupt]); if (c.oil) pst.push(['poison_oil', '油', '兵刃淬毒']);
    if (c.next > 1) pst.push(['st_evade', '遊', '下一擊 +30%']);
    h += '<div class="plate" data-max="' + mh + '" data-testid="plate"><div class="pface">' + (IC.has(face) ? ico(face, '', 48) : '<span class="gl">你</span>') + '</div><div class="pbars"><div class="php"><i style="width:' + (Math.max(0, S.hp / mh) * 100).toFixed(1) + '%"></i></div><span class="phpn">' + Math.max(0, S.hp) + '/' + mh + '</span><div class="pfat"><i style="width:' + S.fat + '%"></i></div><span class="pfatn">疲 ' + S.fat + '</span></div><div class="pst">' + pst.map((x) => '<span class="stc" title="' + x[2] + '">' + ico(x[0], x[1], 16) + '</span>').join('') + '</div></div>';
    h += '</div>';
    // 說明列／棄物撤退確認條
    if (c.retreatOpen) {
      const dw = G.selWt(); const p0 = G.retreatChance(0), p1 = G.retreatChance(dw);
      const m0 = G.loadBand().mult, m1 = G.loadBand(G.totalWt() - dw).mult;
      h += '<div class="rbar" data-testid="retreat-bar"><span class="rt">棄物撤退</span><div class="ritems">';
      S.pack.forEach((it, i) => { if (!it) return; h += '<div class="cell' + (S.retreatSel.includes(i) ? ' drop' : '') + '" data-a="toggleDrop" data-v="' + i + '" data-testid="drop-' + i + '">' + ico(G.itemIcon(it), G.itemGlyph(it), 24) + (it.k !== 'eq' && it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>'; });
      h += '</div><div class="rp"><b data-testid="retreat-rate">撤退率 ' + Math.round(p0 * 100) + '% → ' + Math.round(p1 * 100) + '%</b><span>' + TX.map.speed + ' ×' + m0.toFixed(2) + ' → ×' + m1.toFixed(2) + '・丟下的落在地面</span></div>';
      h += '<button class="btn redb" data-a="retreatGo" data-testid="btn-retreat-confirm">確認撤退</button><button class="btn" data-a="retreatClose">取消</button></div>';
    } else {
      h += '<div class="chint" id="adesc" data-testid="adesc">滑過行動看說明。點敵人換目標。招式會增加疲累。也可以直接點左邊人形上的武器出手。</div>';
    }
    // 行動列：武器、招式、技能、防禦、道具都在這裡
    const A = G.combatActions();
    h += '<div class="abar" data-testid="abar">';
    A.forEach((a, i) => {
      const key = i < 9 ? String(i + 1) : '';
      h += '<button class="act k-' + a.kind + (a.locked ? ' locked' : '') + '" data-a="cdo" data-v="' + a.id + '" data-desc="' + esc(a.name + '：' + a.desc) + '" data-testid="act-' + a.id.replace(':', '-') + '" ' + (a.disabled ? 'disabled' : '') + '><span class="k">' + key + '</span>' + ico(a.ic, a.g, 30) + '<span class="an">' + (a.locked ? a.lockText : a.name) + '</span>' + (a.cd > 0 ? '<span class="cd">' + a.cd + '</span>' : '') + (a.n ? '<span class="c">×' + a.n + '</span>' : a.cost ? '<span class="c ft">+' + a.cost + '</span>' : '') + '</button>';
    });
    h += '<button class="act retreat" data-a="retreatOpen" data-desc="棄物撤退：勾選要丟下的東西，丟得越重越容易脫身。目前撤退率 ' + Math.round(G.retreatChance(0) * 100) + '%。" data-testid="act-retreat"><span class="k">R</span>' + ico('a_retreat', '撤', 30) + '<span class="an">撤退</span></button>';
    h += '</div>';
    h += '<div class="logbox" style="top:588px;height:114px" data-testid="log">' + logLines(S, 6) + '</div>';
    return h;
  }
  function backdrop(S) { return '<div class="backdrop' + (SC.has('wild_' + S.loc) ? scn('wild_' + S.loc) : SC.has('dg_' + S.loc) ? scn('dg_' + S.loc) : scn('road')) + '"><div class="cshade"></div></div>'; }
  function sceneLoot(S) {
    const L = S.loot;
    let h = backdrop(S) + '<div class="panel" style="left:198px;top:120px;width:400px" data-testid="loot"><h2>' + L.title + '</h2>';
    if (L.silver) h += '<div class="pl gold">銀兩 +' + L.silver + '</div>';
    L.items.forEach((t) => (h += '<div class="pl">■ ' + esc(t) + '</div>'));
    if (!L.items.length && !L.silver) h += '<div class="pl sub">一無所獲。</div>';
    if (L.grounded) h += '<div class="pl red">行囊放不下，部分落在左欄「地面」。</div>';
    h += '<button class="btn dark" style="margin-top:14px;width:120px;height:36px" data-a="lootDone" data-testid="btn-loot-done">繼續</button></div>';
    h += '<div class="logbox" style="top:610px;height:92px" data-testid="log">' + logLines(S, 5) + '</div>';
    return h;
  }
  function sceneEvent(S) {
    const ev = S.event; const E = ev.dyn || D.EVENTS.find((x) => x.id === ev.id);
    let h = backdrop(S) + '<div class="panel" style="left:148px;top:100px;width:500px" data-testid="event"><div class="sub">' + (ev.dyn ? D.NODES[ev.dest].name : '旅途事件・往' + D.NODES[ev.dest].name) + '</div><h2>' + esc(E.title) + '</h2><div class="pl">' + esc(E.text) + '</div>';
    if (!ev.result) E.opts.forEach((o) => (h += '<button class="evopt" data-a="evopt" data-v="' + o.k + '" data-testid="ev-' + o.k + '">' + o.label + '<span>' + o.note + '</span></button>'));
    else h += '<div class="pl res">' + esc(ev.result) + '</div><button class="btn dark" style="margin-top:12px;width:120px;height:36px" data-a="evdone" data-testid="btn-ev-done">' + (ev.dyn ? '繼續' : '繼續上路') + '</button>';
    h += '</div><div class="logbox" style="top:610px;height:92px" data-testid="log">' + logLines(S, 5) + '</div>';
    return h;
  }
  function sceneDead(S) {
    const d = S.dead;
    const quote = d.codex >= 10 ? '他撿了一路的碎片，沒來得及拼起來。' : d.rumors > 1 ? '聽信了太多傳聞，最後自己也成了傳聞。' : d.kills > 5 ? '刀下亡魂不少，終究也成了荒野一縷。' : d.gathers > 6 ? '識得百草，卻沒能醫好自己。' : '山海路遠，此生只走到這裡。';
    let h = '<div class="epitaph" data-testid="epitaph"><div class="sub">墓誌銘</div><h1>沈衡之墓</h1><div class="ep-sub">' + d.origin + '・享年 ' + d.age + '・卒於' + d.when + '・' + d.where + '</div>';
    h += '<div class="ep-line">死因：<b>' + esc(d.cause) + '</b></div>';
    h += '<div class="ep-line">行走 ' + d.hours + ' 小時，歷 ' + d.days + ' 日（' + d.date + '）</div>';
    h += '<div class="ep-line">擊殺 ' + d.kills + '・採集 ' + d.gathers + '・製作 ' + d.crafts + '・委託 ' + d.bounties + '・傳聞 ' + d.rumors + '</div>';
    h += '<div class="ep-line">探得 ' + d.finds + ' 處・見聞 ' + d.codex + '/' + Object.keys(G.LORE().CODEX).length + (d.rep ? '・' + d.rep : '') + '</div>';
    h += '<div class="ep-line">' + d.attrs + '</div>';
    h += '<div class="ep-line">所長：' + d.profs + '</div>';
    h += '<div class="ep-line">所習：' + (d.skills.length ? d.skills.join('、') : '無') + '・最多銀兩 ' + d.maxSilver + '</div>';
    h += '<div class="ep-quote">「' + quote + '」</div>';
    h += '<div class="sub">純永久死亡：此生存檔已刪除。</div>';
    h += '<button class="btn dark" data-a="restart" data-testid="btn-restart">一鍵重開</button></div>';
    return h;
  }
  function overlay(S) {
    let h = '<div class="overlay" data-testid="overlay-' + S.overlay + '"><button class="btn close" data-a="overlay" data-v="' + S.overlay + '">關閉</button>';
    if (S.overlay === 'log') {
      h += '<h2>日誌</h2><div class="olog">' + S.log.slice().reverse().map((l) => '<div class="' + l.cls + '">' + G.fmtClock(l.t) + '・第 ' + G.dayOf(l.t) + ' 日　' + esc(l.text) + '</div>').join('') + '</div>';
    } else if (S.overlay === 'journal') {
      const tab = S.journalTab || 'quest'; const day = G.dayOf(S.t); const L = G.LORE();
      h += '<h2>記事</h2><div class="jtabs">' + [['quest', '委託 ' + G.activeQuests().length], ['rumor', '傳聞 ' + S.rumors.length], ['codex', '見聞錄 ' + S.codex.length + '/' + Object.keys(L.CODEX).length]].map(([k, n]) => '<button class="' + (tab === k ? 'on' : '') + '" data-a="journal" data-v="' + k + '" data-testid="jtab-' + k + '">' + n + '</button>').join('') + '</div><div class="jbody">';
      if (tab === 'quest') {
        const list = G.activeQuests();
        if (!list.length) h += '<p class="sub">手上沒有委託。到城鎮的委託板接榜，或和街上的人聊聊。</p>';
        list.forEach((q) => (h += '<div class="jrow' + (q.status === 'done' ? ' done' : '') + '">' + ico(q.ic, q.g, 32) + '<div><b>' + q.title + '</b>　<span class="gold">' + G.questReward(q) + ' 兩</span>' + (q.status === 'done' ? '　<span class="jade">已達成，回去交付</span>' : '') + '<p>' + G.questWhere(q) + '・發自' + D.NODES[q.town].name + (q.giver ? '的' + D.NPCS[q.giver].name : '') + '・' + (q.due ? '第 ' + q.due + ' 日前（剩 ' + Math.max(0, q.due - day) + ' 天）' : '長期') + (q.kind === 'kill' || q.kind === 'tide' || q.kind === 'clear' ? '・進度 ' + q.prog + '/' + q.need : q.kind === 'collect' ? '・持有 ' + G.countItem(q.item) + '/' + q.need : '') + '</p></div></div>'));
      } else if (tab === 'rumor') {
        if (!S.rumors.length) h += '<p class="sub">沒有記著的傳聞。客棧每天第一則免費；街上的乞兒一文錢一則。</p>';
        S.rumors.forEach((r) => (h += '<div class="jrow">' + ico(D.NODES[r.node].ic, D.NODES[r.node].g, 32) + '<div><b>【' + D.RUMOR.kinds[r.kind].name + '】' + D.NODES[r.node].name + '</b>　<span class="sub">第 ' + r.day + ' 日聽聞・剩 ' + (D.RUMOR.days - (day - r.day)) + ' 天</span><p>' + esc(r.text) + '</p>' + (r.hint ? '<p class="jade">判斷：' + r.hint + '</p>' : '') + (r.traced ? '<p class="jade">痕跡：' + D.RUMOR.trace[r.truth] + '</p>' : '') + '</div></div>'));
        h += '<p class="sub">傳聞可能屬實、有人盤踞、強敵鎮守、已被取走，或根本是餌。屬實的每過一天有兩成被人取走。</p>';
      } else {
        D.CODEX_CATS.forEach((cat) => {
          const ids = Object.keys(L.CODEX).filter((k) => L.CODEX[k].cat === cat);
          h += '<h3>' + cat + '　<span class="sub">' + ids.filter((k) => S.codex.includes(k)).length + '/' + ids.length + '</span></h3>';
          ids.forEach((k) => { const has = S.codex.includes(k); h += '<div class="cx' + (has ? '' : ' unk') + '"><b>' + (has ? esc(L.CODEX[k].title) : '？？？') + '</b>' + (has ? '<p>' + esc(L.CODEX[k].text).replace(/\n/g, '<br>') + '</p>' : '') + '</div>'; });
        });
      }
      h += '</div>';
    } else if (S.overlay === 'faction') {
      const fs = G.knownFactions(); const all = Object.keys(D.FACTIONS);
      h += '<h2>勢力</h2><div class="jbody">';
      fs.sort((a, b) => G.repOf(b) - G.repOf(a)).forEach((f) => {
        const F = D.FACTIONS[f]; const v = G.repOf(f);
        h += '<div class="fcard" data-testid="fcard-' + f + '"><div class="fic">' + ico(F.ic, F.g, 32) + '</div><div class="fbd"><b>' + F.name + '</b>　<span class="gold">聲望 ' + Math.floor(v) + '</span><p>' + F.desc + '</p><p class="sub">怎麼漲：' + F.how + '</p>';
        h += F.perks.length ? '<div class="fperks">' + F.perks.map((p) => '<span class="' + (v >= p[0] ? 'got' : '') + '">' + p[0] + '　' + p[1] + '</span>').join('') + '</div>' : '<p class="sub">尚無往來。</p>';
        h += '</div></div>';
      });
      if (all.length > fs.length) h += '<p class="sub">還有 ' + (all.length - fs.length) + ' 個勢力你還不知道。多聽、多看、多探查。</p>';
      h += '</div>';
    } else if (S.overlay === 'char') {
      const O = D.ORIGINS.find((o) => o.id === S.origin);
      h += '<h2>人物・' + esc(S.name) + '（' + (O ? O.name : '無名') + '・' + G.ageOf(S.t) + ' 歲）</h2><div class="jbody">';
      h += '<div class="cattrs">' + D.ATTRS.map((a) => '<div class="cattr"><b>' + a.name + ' ' + G.attrVal(a.id) + '</b><div class="pb"><i style="width:' + (G.attrProgress(a.id) * 100).toFixed(0) + '%"></i></div><span>' + a.desc + '</span></div>').join('') + '</div>';
      h += '<h3>招式與技能</h3><div class="ctechs">';
      S.skills.forEach((k) => { const K = D.SKILLS[k]; h += '<div class="ctech got">' + ico(K.ic, K.g, 24) + '<div><b>' + K.name + '</b><em>' + (K.active ? '主動' : '被動') + '・' + K.src + '</em><span>' + K.desc + '</span></div></div>'; });
      D.TECHS.forEach((T) => { const P = D.PROFS.find((p) => p.id === T.prof); const got = G.profLv(T.prof) >= T.lv; h += '<div class="ctech' + (got ? ' got' : '') + '">' + ico(T.id, T.g, 24) + '<div><b>' + T.name + '</b><em>' + P.name + ' ' + T.lv + (got ? '・已領悟' : '・目前 ' + G.profLv(T.prof)) + '</em><span>' + T.desc + '</span></div></div>'; });
      h += '</div><h3>熟練度</h3><div class="cprofs">';
      D.PROF_GROUPS.forEach((g) => {
        h += '<div class="cgrp"><h4>' + g.name + '</h4>';
        D.PROFS.filter((p) => p.grp === g.id).forEach((p) => {
          const lv = G.profLv(p.id);
          const perks = Object.keys(p.perks).map(Number).sort((a, b) => a - b).map((t) => '<span class="' + (lv >= t ? 'got' : '') + '">' + t + ' ' + p.perks[t] + '</span>').join('');
          h += '<div class="cprof' + (p.locked ? ' lock' : '') + '"><b>' + p.name + ' ' + (p.locked ? '—' : lv) + '</b><em>' + D.ATTRS.find((a) => a.id === p.attr).name + '・' + p.how + '</em><div class="pb"><i style="width:' + (p.locked ? 0 : G.profProgress(p.id) * 100).toFixed(0) + '%"></i></div>' + perks + '</div>';
        });
        h += '</div>';
      });
      h += '</div></div>';
    } else if (S.overlay === 'help') {
      h += '<h2>說明（灰盒 v0.3）</h2><div class="jbody">';
      ['沒有主線，沒有等級。成長分三層：素質（很慢）、熟練度（做什麼長什麼）、裝備。做太簡單的事不會再成長。',
        '地圖：每個地點都能走、都能「探查」。探查會找到見聞（世界觀碎片）、藏物、新的採集點，甚至地圖上原本沒有的地方。',
        '城鎮：點建築進去，裡面有老闆和服務；點路人交談。專門店（鐵匠收礦、藥鋪收藥草、軍需收獸皮）出價比商號高 15%，但只收自己那一類。',
        '戰鬥：行動都在下方那一條。武器招式靠熟練度解鎖，會增加疲累並有冷卻。也可以直接點左邊人形上的武器出手、點盾牌防禦。數字鍵 1–9 對應行動列，R 是棄物撤退。演出中再按一次會直接收尾。',
        '狀態：流血與中毒每回合扣血；破甲使護甲歸零；失衡會跳過一次行動；侵蝕來自血霧，會降低生命上限，客棧歇一夜退一些，傷兵帳能清乾淨。',
        '勢力：完成委託漲破曉軍團聲望；在天星商號買賣漲天星聲望；把見聞回報給鴉衛漲鴉衛聲望。各有門檻好處，左欄下方看得到。',
        '委託有期限。傳聞可能屬實、有人盤踞、強敵鎮守、已被取走，或是餌，而且會過時。獸潮每隔幾天襲擊一座城鎮，不理會有後果。',
        '拖拉：行囊格互換或合併；行囊↔人形槽＝穿脫；拖到「地面」＝丟下；店裡拖到交易欄＝賣、貨架拖進行囊＝買一個。',
        '永久死亡：死亡即刪檔並留下墓誌銘。',
      ].forEach((t) => (h += '<p>' + t + '</p>'));
      h += '</div>';
    } else {
      h += '<h2>選單</h2><p>存檔模式：<b>純永久死亡</b>（城鎮檢查點模式為架構預留，本版不開放）</p><p>存檔位置：瀏覽器 localStorage「' + G.SAVE_KEY + '」，每次行動自動存檔。</p>';
      h += '<button class="btn" data-a="restartAsk" data-testid="btn-abandon" style="margin-top:12px">放棄此生並重開</button>';
    }
    return h + '</div>';
  }

  // ======================= 等比縮放：整個畫面依視窗大小縮放置中 =======================
  let scale = 1;
  function fit() {
    const w = window.innerWidth, hh = window.innerHeight;
    scale = Math.min(w / 1280, hh / 720);
    if (!(scale > 0)) scale = 1;
    const dx = Math.max(0, (w - 1280 * scale) / 2), dy = Math.max(0, (hh - 720 * scale) / 2);
    $A.style.transform = scale === 1 && !dx && !dy ? 'none' : 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
    document.documentElement.style.setProperty('--scale', scale);
  }
  window.addEventListener('resize', fit);
  fit();

  // ======================= 戰鬥演出：依序播放規則層記下的每一筆 =======================
  let fxTimers = []; let fxBusy = false;
  const FX_DELAY = { p_hit: 240, p_miss: 240, e_act: 300, e_hit: 190, e_miss: 190, kill: 40, e_text: 110, p_text: 200, e_heal: 200, e_dot: 260, p_dot: 260, p_heal: 200 };
  const FX_SPRITE = { dao: 'fx_slash', qiang: 'fx_slash', fu: 'fx_blunt', quan: 'fx_blunt', gong: 'fx_arrow' };
  function floatOn(el, text, cls) {
    if (!el) return;
    const f = document.createElement('div'); f.className = 'fnum ' + (cls || ''); f.textContent = text;
    f.style.marginLeft = (Math.random() * 40 - 20).toFixed(0) + 'px';
    el.appendChild(f);
  }
  function pulse(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  // 戰鬥紅閃 cflash 預算：任意 1 秒 ≤ 3 次（batch1 X-g 甲；rollout-plan DEV-02）。兩次閃光至少相隔 350ms（≥ 334ms，留一格影格的餘裕），太近的那次只略過閃光，震動與數字照播。
  const CFLASH_GAP = 350; let lastCflash = -1e9;
  function flashOnce(stage) {
    const now = performance.now(); if (now - lastCflash < CFLASH_GAP) return;
    lastCflash = now; pulse(stage.querySelector('.cflash'), 'on');
  }
  function setEhp(el, hp) { if (!el) return; const max = +el.getAttribute('data-max') || 1; const bar = el.querySelector('.ehp > i'); const num = el.querySelector('.ehpn'); if (bar) bar.style.width = (Math.max(0, hp / max) * 100).toFixed(1) + '%'; if (num) num.textContent = Math.max(0, hp) + '/' + max; }
  function setPhp(el, hp) { if (!el) return; const max = +el.getAttribute('data-max') || 1; const bar = el.querySelector('.php > i'); const num = el.querySelector('.phpn'); if (bar) bar.style.width = (Math.max(0, hp / max) * 100).toFixed(1) + '%'; if (num) num.textContent = Math.max(0, hp) + '/' + max; }
  function showFx(e) {
    const stage = $C.querySelector('.cstage'); if (!stage) return;
    const en = e.i !== undefined ? stage.querySelector('[data-testid="enemy-' + e.i + '"]') : null;
    const plate = stage.querySelector('.plate');
    switch (e.t) {
      case 'p_hit': {
        pulse(en, 'hit'); setEhp(en, e.hp); floatOn(en, '−' + e.d + (e.crit ? ' 會心' : ''), e.crit ? 'crit' : 'dmg');
        const sp = FX_SPRITE[e.kind] || 'fx_slash';
        if (en && IC.has(sp)) { const s = document.createElement('i'); s.className = 'px fxs ic-' + sp; en.appendChild(s); }
        break;
      }
      case 'p_miss': floatOn(en, '落空', 'miss'); break;
      case 'e_text': floatOn(en, e.text, e.bad ? 'bad' : 'txt'); break;
      case 'e_heal': setEhp(en, e.hp); floatOn(en, '+' + e.d, 'heal'); break;
      case 'e_dot': pulse(en, 'hit'); setEhp(en, e.hp); floatOn(en, '−' + e.d, 'dot'); break;
      case 'e_act': pulse(en, 'lunge'); break;
      case 'e_hit': {
        pulse(stage, e.heavy ? 'shake2' : 'shake'); flashOnce(stage); setPhp(plate, e.php); floatOn(plate, '−' + e.d, e.heavy ? 'crit bad' : 'dmg bad');
        if (IC.has('fx_claw')) { const s = document.createElement('i'); s.className = 'px fxc ic-fx_claw'; stage.appendChild(s); }
        break;
      }
      case 'e_miss': floatOn(plate, '閃過', 'miss'); break;
      case 'p_dot': setPhp(plate, e.php); floatOn(plate, '−' + e.d, 'dot'); break;
      case 'p_heal': setPhp(plate, e.php); floatOn(plate, '+' + e.d, 'heal'); break;
      case 'p_text': floatOn(plate, e.text, e.bad ? 'bad' : 'txt'); break;
      case 'kill': if (en) en.classList.add('dying'); break;
    }
  }
  function flushFx() {
    if (!fxBusy) return;
    fxTimers.forEach(clearTimeout); fxTimers = []; fxBusy = false;
    renderAll(G.state);
  }
  function playFx(q) {
    fxBusy = true; let t = 0;
    q.forEach((e, i) => { t += i === 0 ? 0 : (FX_DELAY[e.t] || 200); fxTimers.push(setTimeout(() => showFx(e), t)); });
    fxTimers.push(setTimeout(() => { fxTimers = []; fxBusy = false; renderAll(G.state); }, t + 520));
  }

  // ======================= 互動 =======================
  function renderAll(S) { renderLeft(S); renderCenter(S); renderRight(S); }
  function render(S) {
    const q = G.takeFx();
    if (fxBusy) { fxTimers.forEach(clearTimeout); fxTimers = []; fxBusy = false; }
    // 有演出、而且畫面上還是剛才那場戰鬥：先在舊畫面上演完，再換成新狀態
    if (FXON && q.length && $C.getAttribute('data-scene') === 'combat' && $C.querySelector('.cstage')) return playFx(q);
    renderAll(S);
  }
  G.on(render);

  // ---------- 拖拉道具（pointer 事件，滑鼠與觸控共用） ----------
  let dragState = null; let suppressClick = false;
  function dropTargetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('[data-drop]') : null;
  }
  function endDrag() {
    if (!dragState) return;
    if (dragState.ghost) dragState.ghost.remove();
    document.querySelectorAll('.dropok, .dragsrc').forEach((e) => e.classList.remove('dropok', 'dragsrc'));
    document.body.classList.remove('dragging');
    dragState = null;
  }
  document.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || fxBusy) return;
    const el = ev.target.closest('[data-drag]'); if (!el) return;
    dragState = { from: el.getAttribute('data-drag'), el, sx: ev.clientX, sy: ev.clientY, active: false, ghost: null };
  });
  document.addEventListener('pointermove', (ev) => {
    const d = dragState; if (!d) return;
    if (!d.active) {
      if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return;
      d.active = true; hideTip();
      const box = document.getElementById('shoptip'); if (box) box.style.display = 'none';
      const g = document.createElement('div');
      g.className = 'cell ghost ' + Array.from(d.el.classList).filter((c) => c.startsWith('r-')).join(' ');
      g.innerHTML = d.el.innerHTML;
      document.body.appendChild(g); d.ghost = g;
      d.el.classList.add('dragsrc'); document.body.classList.add('dragging');
    }
    d.ghost.style.left = (ev.clientX - 20 * scale) + 'px'; d.ghost.style.top = (ev.clientY - 20 * scale) + 'px';
    document.querySelectorAll('.dropok').forEach((e) => e.classList.remove('dropok'));
    const t = dropTargetAt(ev.clientX, ev.clientY);
    if (t && t.getAttribute('data-drop') !== d.from) t.classList.add('dropok');
    ev.preventDefault();
  });
  document.addEventListener('pointerup', (ev) => {
    const d = dragState; if (!d) return;
    if (!d.active) { dragState = null; return; }
    if (d.ghost) d.ghost.style.display = 'none';
    const t = dropTargetAt(ev.clientX, ev.clientY);
    const from = d.from; const to = t ? t.getAttribute('data-drop') : null;
    endDrag();
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
    if (to && to !== from) G.drag(from, to);
  });
  document.addEventListener('pointercancel', endDrag);

  document.addEventListener('click', (ev) => {
    if (suppressClick) { suppressClick = false; ev.preventDefault(); return; }
    const el = ev.target.closest('[data-a]'); if (!el || el.disabled || el.classList.contains('dis')) return;
    const a = el.getAttribute('data-a'); const v = el.getAttribute('data-v');
    // 演出中再按：先把演出收尾，再執行這次的行動
    flushFx();
    const S = G.state;
    hideTip();
    switch (a) {
      case 'origin': return G.chooseOrigin(v);
      case 'unequip': return G.unequip(v);
      case 'pack': return G.clickPack(+v);
      case 'pickup': return G.pickupGround(+v);
      case 'toggleDrop': return G.toggleDrop(+v);
      case 'dest': return G.selectDest(v);
      case 'travel': return G.travel();
      case 'enterHere': return G.enterHere();
      case 'toMap': return G.toMap();
      case 'mapView': return G.setMapView(v);
      case 'explore': return G.explore();
      case 'cityToggle': cityOpen = !cityOpen; return renderAll(S);
      case 'tab': return G.setTab(v || null);
      case 'street': return G.streetTalk(v);
      case 'streetClose': return G.streetClose();
      case 'talk': return G.talk(v);
      case 'cheapRumor': return G.cheapRumor();
      case 'svc': { const [k, arg] = v.split(':'); return G.service(k, arg); }
      case 'profTab': return G.setProfTab(v);
      case 'journal': G.setJournalTab(v); if (S.overlay !== 'journal') G.setOverlay('journal'); return;
      case 'shop': return G.selectShop(+v);
      case 'qty': return G.setQty(+v);
      case 'buy': return G.buy();
      case 'sell': return G.sell();
      case 'identifyPay': return G.identify(+v, true);
      case 'hearRumor': return G.hearRumor();
      case 'bounty': return G.questAct(v);
      case 'trace': return G.traceRumor(v);
      case 'investigate': return G.investigate(v);
      case 'craft': return G.craft(v);
      case 'gather': return G.gather(v);
      case 'gpt': { const p = G.wildPoints(S.loc).find((x) => x.id === v); return G.gather(p.kind, v); }
      case 'camp': return G.camp();
      case 'delve': return G.dungeonDelve();
      case 'cact': return G.combatAction(v);
      case 'cdo': return G.combatAction('do', v);
      case 'target': return G.setTarget(+v);
      case 'retreatOpen': return G.toggleRetreat(true);
      case 'retreatClose': return G.toggleRetreat(false);
      case 'retreatGo': return G.combatAction('retreat');
      case 'lootDone': return G.lootDone();
      case 'evopt': return G.eventChoose(v);
      case 'evdone': return G.eventDone();
      case 'overlay': return G.setOverlay(v);
      case 'restart': return G.restart();
      case 'restartAsk': if (window.confirm('確定放棄此生？存檔將刪除。')) G.restart(); return;
    }
  });
  document.addEventListener('contextmenu', (ev) => {
    const el = ev.target.closest('[data-a="pack"]');
    const S = G.state;
    if (el && S.scene === 'town' && G.bld() && G.bld().buys) { ev.preventDefault(); G.sell(+el.getAttribute('data-v')); }
  });
  $L.addEventListener('mouseover', (ev) => { const el = ev.target.closest('[data-tip]'); if (el) showTip(el); });
  $L.addEventListener('mouseout', (ev) => { const el = ev.target.closest('[data-tip]'); if (el && !el.contains(ev.relatedTarget)) hideTip(); });
  // 中欄：商品提示卡錨定在交易欄位置；戰鬥行動列滑過顯示說明
  $C.addEventListener('mouseover', (ev) => {
    // 地圖底列懸浮說明（wording-map §1；腳程為 mumi 原句）
    const hb = document.getElementById('hintbox');
    if (hb) {
      const hv = ev.target.closest('[data-hint]');
      if (hv) { const k = hv.getAttribute('data-hint'); hb.innerHTML = '<b>' + TX.map[k] + '</b><span data-testid="hint-text">' + TX.map.hint[k] + '</span>'; hb.style.display = 'block'; }
      else hb.style.display = 'none';
    }
    const ad = ev.target.closest('[data-desc]'); const line = document.getElementById('adesc');
    if (ad && line) line.textContent = ad.getAttribute('data-desc');
    const el = ev.target.closest('[data-shop]'); const box = document.getElementById('shoptip');
    if (!box) return;
    if (!el || dragState) { box.style.display = 'none'; return; }
    box.innerHTML = tradeBody(G.state, { mode: 'buy', idx: +el.getAttribute('data-shop'), qty: 1 });
    box.style.display = 'block';
  });
  $C.addEventListener('mouseleave', () => { const box = document.getElementById('shoptip'); if (box) box.style.display = 'none'; });
  document.addEventListener('keydown', (ev) => {
    const S = G.state; if (!S) return;
    if (ev.key === 'Escape' && S.overlay) return G.setOverlay(S.overlay);
    if (!S.combat || S.overlay) return;
    if (ev.key >= '1' && ev.key <= '9') { flushFx(); const a = G.combatActions()[+ev.key - 1]; if (a && !a.disabled && G.state.combat) G.combatAction('do', a.id); }
    else if (ev.key === 'r' || ev.key === 'R') { flushFx(); if (G.state.combat) G.toggleRetreat(!G.state.combat.retreatOpen); }
  });

  // 啟動：?seed=數字 固定亂數；?fresh=1 強制新局；?origin=hunter 等直接指定出身；?fx=0 關閉戰鬥演出
  const seed = Q.has('seed') ? parseInt(Q.get('seed'), 10) : undefined;
  G.init({ seed, fresh: Q.get('fresh') === '1', origin: Q.get('origin') || undefined });
})();
