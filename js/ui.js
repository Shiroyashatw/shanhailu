/* 《山海錄》灰盒 v0.25 — 三欄介面渲染（左 240／中 796／右 220，依視窗等比縮放） */
'use strict';

(function () {
  const D = window.SHL_DATA;
  const G = window.SHL;
  const IC = window.SHL_ICONS || { has: () => false };
  const SC = window.SHL_SCENES || { has: () => false, buildings: {} };
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

  // ======================= 左欄 =======================
  function renderLeft(S) {
    let h = '<div class="doll">';
    Object.keys(DOLL).forEach((slot) => {
      const [x, y, w, hh] = DOLL[slot];
      const sz = SMALL[slot] ? Math.min(w, hh) - 4 : slot === 'bag' ? 28 : 32;
      if (slot === 'cart') {
        h += '<div class="cell locked slot-cart" data-tip="cart" style="' + pos(x, y, w, hh) + '">' + ico('cart', '車', 28) + '</div>';
        return;
      }
      const eq = S.equip[slot];
      if (eq) {
        const B = G.eqBase(eq);
        h += '<div class="cell click ' + RAR_CLS[eq.rarity] + '" data-a="unequip" data-v="' + slot + '" data-tip="slot:' + slot + '" data-drop="slot:' + slot + '"' + (slot !== 'bag' ? ' data-drag="slot:' + slot + '"' : '') + ' data-testid="slot-' + slot + '" style="' + pos(x, y, w, hh) + '">' + ico(B.ic, B.g, sz) + (slot === 'bag' ? '<span class="n">' + B.bag + '</span>' : '') + '</div>';
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
    h += '<div class="minimap" data-testid="minimap">' + miniMap(S) + '</div>';
    // 負重底條
    const w = G.totalWt(), cc = G.carryCap();
    const pct = Math.min(1, w / cc);
    h += '<div class="loadbar" data-testid="loadbar">' + ico('ui_load', '負', 16) + '<div class="thinbar' + (pct > 0.75 ? ' warn' : pct > 0.4 ? ' mid' : '') + '" style="width:104px"><i style="width:' + (pct * 100).toFixed(1) + '%"></i><b style="left:40%"></b><b style="left:75%"></b></div><span>' + Math.round(w) + '/' + cc + '</span><span class="spd">×' + G.speedMult().toFixed(2) + '</span></div>';
    h += '<div id="tip" style="display:none"></div>';
    $L.innerHTML = h;
  }
  function miniMap(S) {
    const sx = 228 / 796, sy = 124 / 560;
    let s = '<svg width="226" height="122" viewBox="0 0 226 122">';
    D.EDGES.forEach((e) => {
      const a = D.NODES[e.a], b = D.NODES[e.b];
      s += '<line x1="' + (a.x * sx) + '" y1="' + (a.y * sy) + '" x2="' + (b.x * sx) + '" y2="' + (b.y * sy) + '" stroke="#6e6656" stroke-width="1" ' + (e.road ? '' : 'stroke-dasharray="3 2"') + '/>';
    });
    Object.keys(D.NODES).forEach((id) => {
      const n = D.NODES[id]; const x = n.x * sx, y = n.y * sy;
      if (n.kind === 'way') { s += '<circle cx="' + x + '" cy="' + y + '" r="2.5" fill="#171512" stroke="#6e6656"/>'; return; }
      const cur = id === S.loc; const rum = S.rumors.some((r) => r.node === id);
      s += '<rect x="' + (x - 7) + '" y="' + (y - 7) + '" width="14" height="14" fill="' + (cur ? '#c9a24a' : '#26221c') + '" stroke="' + (rum ? '#c8463a' : cur ? '#c9a24a' : '#6e6656') + '" stroke-width="' + (rum ? 2 : 1) + '"/>';
      s += '<text x="' + x + '" y="' + (y + 3.5) + '" font-size="9" text-anchor="middle" fill="' + (cur ? '#171512' : '#d8cfbd') + '" font-weight="700">' + n.g + '</text>';
    });
    return s + '</svg>';
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
    const town = D.NODES[G.state.loc].kind === 'town';
    if (it.k === 'eq') return (town ? '此地可賣 ' : '估價 ') + G.sellPrice(it) + ' 兩';
    if (D.ITEMS[it.k].type === 'quest') return '不可買賣';
    if (town) { const p = G.sellPrice(it); return p ? '此地收 ' + p + ' 兩／個' : '此地不收'; }
    return '灰窯 ' + (D.TOWNS.huiyao.buy[it.k] || '—') + '／渡陰 ' + (D.TOWNS.duyin.buy[it.k] || '—');
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
    if (kind === 'cart') { html = '<div class="tip-h"><span class="tip-name">馬車槽</span><span class="tag">預留</span></div><div class="sub">架構預留・本版不可用</div><div class="tip-aff" style="white-space:normal">完整版可於城鎮雇用或購買馬車，提供大型貨倉、分擔負重，限走官道。</div>'; }
    else if (kind === 'slot') {
      const eq = S.equip[v];
      if (!eq) html = '<div class="tip-h"><span class="tip-name">' + D.SLOT_NAMES[v] + '</span><span class="tag">空</span></div><div class="sub">尚未裝備・可把行囊裡的裝備拖過來</div>';
      else { html = eqTipHtml(eq, undefined, priceLineFor({ k: 'eq', eq })); rc = RAR_CLS[eq.rarity]; if (v === 'bag') html = html.replace('點＝卸下', '城鎮買包替換'); }
    } else if (kind === 'pack' || kind === 'ground') {
      const it = kind === 'pack' ? S.pack[+v] : S.ground.items[+v];
      if (!it) return;
      if (it.k === 'eq') { html = eqTipHtml(it.eq, cmpFor(it.eq), priceLineFor(it)); rc = RAR_CLS[it.eq.rarity]; if (kind === 'ground') html = html.replace(/點＝(裝備|鑑定)/, '點＝撿起'); }
      else {
        const I = D.ITEMS[it.k];
        let hint = I.type === 'use' ? '點＝使用' : I.type === 'scroll' ? '點＝研讀' : '';
        if (kind === 'ground') hint = '點＝撿起';
        if (kind === 'pack' && S.scene === 'town' && S.townTab === 'market') hint = '點＝選取・右鍵＝賣';
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
  function renderRight(S) {
    const mh = G.maxHp();
    const O = D.ORIGINS.find((o) => o.id === S.origin);
    let h = '<div class="portrait">' + (O ? O.name : '無名') + '</div><div class="pname">' + esc(S.name) + '<span class="page" data-testid="age">' + G.ageOf(S.t) + ' 歲</span></div>';
    h += '<div class="pill" style="left:76px;top:28px;width:82px" data-testid="loc">' + D.NODES[S.loc].name + '</div>';
    h += '<div class="pill date" style="left:162px;top:28px;width:50px" data-testid="date">' + G.fmtDate(S.t) + '</div>';
    h += '<div class="silver">' + ico('ui_coin', '銀', 16) + '<span data-testid="silver">' + S.silver + '</span></div>';
    h += '<div class="pill" style="left:122px;top:51px;width:90px;font-weight:700" data-testid="clock">' + G.fmtTime(S.t) + '</div>';
    const vit = (ic, gl, v, max, y, crit, tid, cls, marks) => '<div class="vit ' + cls + (crit ? ' crit' : '') + '" style="top:' + y + 'px" data-testid="' + tid + '">' + ico(ic, gl, 16) + '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1) + '%"></i>' + (marks || '') + '</div><span class="num">' + Math.max(0, Math.round(v)) + '/' + max + '</span></div>';
    h += vit('ui_hp', '命', S.hp, mh, 78, S.hp / mh <= 0.3, 'hp', 'v-hp');
    h += vit('ui_food', '食', S.food, 100, 98, S.food <= 20, 'food', 'v-food', '<b style="left:20%"></b>');
    h += vit('ui_fat', '疲', S.fat, 100, 118, S.fat >= 80, 'fat', 'v-fat', '<b style="left:80%"></b>');
    const band = G.loadBand();
    const sts = [
      ['血', S.combat && S.combat.bleed > 0, true], ['餓', S.food < 20, true], ['倦', S.fat >= 80, true], ['重', band.id === 'heavy' || band.id === 'over', false],
    ];
    sts.forEach((s, i) => (h += '<div class="status' + (s[1] ? ' on' + (s[2] ? ' bad' : '') : '') + '" style="left:' + (8 + i * 26) + 'px">' + (s[1] ? s[0] : '') + '</div>'));
    h += '<div class="lbl" style="position:absolute;left:116px;top:144px">護甲 ' + G.armor() + '・傷 ' + G.weaponDmg().join('–') + '</div>';
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
      const next = [25, 50, 75].find((t) => lv < t && p.perks[t]);
      const tipTxt = p.name + ' ' + lv + '（' + D.ATTRS.find((a) => a.id === p.attr).name + '）：' + p.how + (next ? '。' + next + '：' + p.perks[next] : '');
      h += '<div class="prof' + (p.locked ? ' lock' : '') + '" style="top:' + (236 + i * 19) + 'px" data-testid="prof-' + p.id + '" title="' + tipTxt + '"><span class="nm">' + p.name + '</span><span class="lv">' + (p.locked ? '—' : lv) + '</span><div class="pb"><i style="width:' + (p.locked ? 0 : G.profProgress(p.id) * 100).toFixed(0) + '%"></i></div><span class="nx">' + (p.locked ? '預留' : next ? '→' + next : '') + '</span></div>';
    });
    h += '<div class="lbl" style="position:absolute;left:8px;top:410px"><b>技能</b></div>';
    h += '<div class="skillgrid" data-testid="skills">';
    for (let i = 0; i < 4; i++) {
      const x = i * 52;
      const sk = S.skills[i];
      if (!sk) { h += '<div class="cell empty" style="' + pos(x, 0, 46, 46) + '"></div>'; continue; }
      const K = D.SKILLS[sk];
      const cd = sk === 'beng' && S.combat && S.combat.cd > 0 ? S.combat.cd : '';
      h += '<div class="cell" title="' + K.name + '：' + K.desc + '" style="' + pos(x, 0, 46, 46) + '"><span class="tl">' + K.kind + '</span>' + K.g + (cd ? '<span class="n">' + cd + '</span>' : '') + '</div>';
    }
    h += '</div>';
    // 追蹤中的委託與傳聞
    h += '<div class="lbl" style="position:absolute;left:8px;top:480px"><b>委託</b></div>';
    const tq = G.trackedQuest();
    if (tq) h += '<div class="bounty' + (tq.status === 'done' ? ' done' : '') + '" data-testid="bounty">' + ico(tq.ic, tq.g, 22) + '<span class="tt">' + qShort(tq) + '</span><span class="rw">' + G.questReward(tq) + '兩</span></div>';
    else h += '<div class="bounty sub" data-testid="bounty">（無）城鎮委託板揭榜</div>';
    h += '<div class="lbl" style="position:absolute;left:8px;top:534px"><b>傳聞 ' + S.rumors.length + '/' + D.RUMOR.max + '</b></div>';
    if (!S.rumors.length) h += '<div class="rline sub" style="top:551px">（無）客棧可打聽</div>';
    S.rumors.forEach((r, i) => (h += '<div class="rline" style="top:' + (551 + i * 16) + 'px" data-testid="rumor-' + i + '" title="' + esc(r.text) + (r.hint ? '（' + r.hint + '）' : '') + '">' + D.RUMOR.kinds[r.kind].name + '・' + D.NODES[r.node].name + '<span class="sub">　剩 ' + (D.RUMOR.days - (G.dayOf(S.t) - r.day)) + ' 天</span></div>'));
    const td = G.tideInfo();
    if (td) h += '<div class="tide" data-testid="tide">獸潮・' + D.NODES[td.town].name + '　' + td.kills + '/' + td.need + '　剩 ' + td.left + ' 天</div>';
    h += '<div class="lbl dim" style="position:absolute;left:8px;top:622px">負重 ' + band.name + '・速度 ×' + G.speedMult().toFixed(2) + '</div>';
    h += '<div class="lbl dim" style="position:absolute;left:8px;top:638px">存檔：純永久死亡</div>';
    h += '<div class="sysbtns"><button data-a="sysCamp" data-testid="sys-camp">紮營</button><button data-a="overlay" data-v="log" data-testid="sys-log">日誌</button><button data-a="overlay" data-v="char" data-testid="sys-char">人物</button><button data-a="overlay" data-v="help" data-testid="sys-help">說明</button><button data-a="overlay" data-v="menu" data-testid="sys-menu">選單</button></div>';
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

  // ---------- 出身 ----------
  function sceneOrigin() {
    let h = '<div class="origin' + scn('road') + '" data-testid="origin"><div class="otitle">山海錄</div><div class="osub">選一個出身。出身決定起手的素質、熟練度與行囊，之後過什麼日子就長什麼本事。</div><div class="ogrid">';
    D.ORIGINS.forEach((o) => {
      const at = Object.keys(o.attr).map((k) => D.ATTRS.find((a) => a.id === k).name + ' ' + o.attr[k]).join('・') || '素質全 10';
      const pf = Object.keys(o.prof).map((k) => D.PROFS.find((p) => p.id === k).name + ' ' + o.prof[k]).join('・') || '無起手熟練度';
      const gear = o.gear.map((b) => D.BASES[b].name).concat((o.items || []).map(([k, n]) => D.ITEMS[k].name + ' +' + n)).join('、');
      h += '<button class="ocard" data-a="origin" data-v="' + o.id + '" data-testid="origin-' + o.id + '"><b>' + o.name + '</b><span class="od">' + o.desc + '</span><span class="oa">' + at + '</span><span class="op">' + pf + '</span><span class="og">' + gear + '・' + o.silver + ' 兩</span></button>';
    });
    return h + '</div></div>';
  }

  // ---------- 世界地圖 ----------
  function sceneMap(S) {
    const dest = S.dest; const p = dest ? G.travelPreview(dest) : null;
    const routeEdges = p ? p.edges : [];
    const td = G.tideInfo();
    let h = '<div class="map" data-testid="worldmap">';
    h += '<div class="legend"><span>━ 官道</span><span>╍ 野徑</span><span class="red">■ 有傳聞</span></div>';
    h += '<div class="region" style="left:70px;top:150px">灰窯原</div><div class="region" style="left:470px;top:376px">青霧山</div>';
    let svg = '<svg width="796" height="560">';
    svg += '<defs><pattern id="hp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#24201a" stroke-width="2"/></pattern></defs>';
    svg += '<path d="M0,250 C120,190 200,120 330,60" stroke="#243038" stroke-width="8" fill="none"/>';
    [['qingwu', 90, 70], ['guyao', 60, 55], ['jiku', 85, 55], ['chishi', 75, 55], ['kugu', 70, 55]].forEach(([id, rx, ry]) => {
      const n = D.NODES[id]; svg += '<ellipse cx="' + n.x + '" cy="' + n.y + '" rx="' + rx + '" ry="' + ry + '" fill="url(#hp)" stroke="#3a342a" stroke-dasharray="4 3"/>';
    });
    D.EDGES.forEach((e) => {
      const a = D.NODES[e.a], b = D.NODES[e.b];
      const on = routeEdges.includes(e);
      svg += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (on ? '#c9a24a' : e.road ? '#8d8370' : '#6e6656') + '" stroke-width="' + (on ? 5 : e.road ? 2.5 : 1.6) + '" ' + (e.road || on ? '' : 'stroke-dasharray="6 5"') + '/>';
    });
    svg += '</svg>';
    h += svg;
    Object.keys(D.NODES).forEach((id) => {
      const n = D.NODES[id];
      if (n.kind === 'way') {
        h += '<div class="mway" style="left:' + (n.x - 7) + 'px;top:' + (n.y - 7) + 'px"></div>';
        h += '<div class="mlabel way" style="left:' + (n.x - 34) + 'px;top:' + (n.y + 12) + 'px;width:68px;justify-content:center">' + n.name + '</div>';
        return;
      }
      const rum = S.rumors.some((r) => r.node === id); const tide = td && td.town === id;
      const cls = (id === S.loc ? ' cur' : '') + (id === dest ? ' dest' : '') + (rum ? ' rum' : '') + (tide ? ' tide' : '');
      h += '<div class="mnode' + cls + '" data-a="dest" data-v="' + id + '" data-testid="node-' + id + '" style="left:' + (n.x - 19) + 'px;top:' + (n.y - 19) + 'px">' + ico(n.ic, n.g, 32) + '</div>';
      h += '<div class="mlabel" data-a="dest" data-v="' + id + '" style="left:' + (n.x - 34) + 'px;top:' + (n.y + 23) + 'px;width:68px;justify-content:center;cursor:pointer">' + n.name + '</div>';
      if (id === S.loc) h += '<div class="here" style="left:' + (n.x - 22) + 'px;top:' + (n.y - 44) + 'px">此地</div>';
      else if (tide) h += '<div class="here tidel" style="left:' + (n.x - 22) + 'px;top:' + (n.y - 44) + 'px">獸潮</div>';
      else if (rum && id !== dest) h += '<div class="here ruml" style="left:' + (n.x - 22) + 'px;top:' + (n.y - 44) + 'px">傳聞</div>';
    });
    if (p) {
      const n = D.NODES[dest];
      const txt = p.hours + ' 小時・食 −' + p.food + '・疲 +' + p.fat + '・險 ' + p.riskName;
      const w = 184; let x = n.x - w / 2; x = Math.max(6, Math.min(796 - w - 6, x));
      h += '<div class="tipbubble" style="left:' + x + 'px;top:' + (n.y - 52) + 'px;width:' + w + 'px;justify-content:center" data-testid="route-tip">' + txt + '</div>';
    }
    h += '</div>';
    // 出發條
    h += '<div class="departbar" data-testid="departbar">';
    if (p) {
      const n = D.NODES[dest];
      h += '<div class="dic">' + ico(n.ic, n.g, 32) + '</div><div class="dname"><b>' + n.name + '</b><span class="sub">經 ' + p.via + '</span></div>';
      h += '<div class="vpill"><span class="ic">時</span>' + p.hours + ' 小時</div><div class="vpill"><span class="ic">食</span>−' + p.food + '</div><div class="vpill"><span class="ic">疲</span>+' + p.fat + '</div><div class="vpill' + (p.riskName === '高' ? ' hot' : '') + '"><span class="ic">險</span>' + p.riskName + '</div><div class="vpill"><span class="ic">負</span>×' + p.mult.toFixed(2) + '</div>';
      h += '<button class="btn dark go" data-a="travel" data-testid="btn-travel">前往</button>';
    } else {
      const n = D.NODES[S.loc];
      h += '<div class="dic">' + ico(n.ic, n.g, 32) + '</div><div class="dname"><b>' + n.name + '</b><span class="sub">此地</span></div><span class="sub">點選地圖上的節點設定目的地；預告耗時、飽食、疲累、遇險與負重倍率。</span>';
      h += '<button class="btn dark go" data-a="enterHere" data-testid="btn-enter">進入此地</button>';
    }
    h += '</div>';
    h += '<div class="logbox" style="top:628px;height:74px" data-testid="log">' + logLines(S, 4) + '<span class="tag-tr">山海錄 灰盒 v0.25</span></div>';
    return h;
  }

  // ---------- 城鎮 ----------
  const BLD_FALLBACK = { furnace: [220, 80, 120, 90], inn: [360, 110, 130, 110], market: [90, 190, 150, 100], bounty: [540, 170, 100, 100] };
  const BLD = { market: ['市集', 'market'], inn: ['客棧', 'inn'], furnace: ['藥爐', 'inn'], bounty: ['委託板', 'bounty'] };
  function sceneTown(S) {
    const tab = S.townTab || 'market';
    const sid = 'town_' + S.loc;
    let h = '<div class="townscene' + scn(sid) + '" data-testid="town">';
    h += '<div class="tabs">' + [['market', '市集'], ['inn', '客棧'], ['bounty', '委託']].map(([k, n]) => '<button class="' + (tab === k ? 'on' : '') + '" data-a="tab" data-v="' + k + '" data-testid="tab-' + k + '">' + n + '</button>').join('') + '</div>';
    h += '<div class="townname">' + D.NODES[S.loc].name + '</div>';
    const boxes = (SC.buildings && SC.buildings[sid]) || BLD_FALLBACK;
    Object.keys(BLD).forEach((k) => {
      const b = boxes[k]; if (!b) return;
      const on = BLD[k][1] === tab;
      h += '<div class="bld' + (on ? ' on' : '') + '" data-a="tab" data-v="' + BLD[k][1] + '" data-testid="bld-' + k + '" style="' + pos(b[0], b[1], b[2], b[3]) + '"><span>' + BLD[k][0] + '</span></div>';
    });
    const hurt = G.townHurt(S.loc); const td = G.tideInfo();
    h += '<div class="scap">' + (hurt ? '<span class="red">獸潮過後，鎮上一片狼藉：貨架剩一半、客棧漲價。</span>' : td ? '<span class="red">獸潮期間，藥水漲價。</span>' : D.TOWNS[S.loc].desc + '點建築或分頁切換。') + '</div>';
    h += '<button class="btn leave" data-a="toMap" data-testid="btn-leave">離鎮</button>';
    h += '</div><div class="tpanel">';
    if (tab === 'market') h += tabMarket(S);
    else if (tab === 'inn') h += tabInn(S);
    else h += tabBounty(S);
    h += '</div>';
    h += '<div class="logbox" style="top:642px;height:60px" data-testid="log">' + logLines(S, 3) + '</div>';
    return h;
  }
  function tabMarket(S) {
    const shop = S.shops[S.loc] || [];
    let h = '<div class="ttl" style="left:0;top:0">貨架（可拖進行囊）</div><div class="shelf">';
    for (let i = 0; i < 18; i++) {
      const x = (i % 9) * 52, y = 16 + Math.floor(i / 9) * 52;
      const row = shop[i];
      if (!row) { h += '<div class="cell empty" style="' + pos(x, y, 48, 48) + 'cursor:default"></div>'; continue; }
      const it = row.it; const sel = S.trade && S.trade.mode === 'buy' && S.trade.idx === i ? ' sel' : '';
      const price = G.buyPrice(row);
      let ar = '';
      if (it.k !== 'eq') { const tp = G.townPrice(it.k); const av = G.avgPrice(it.k); if (tp !== undefined) ar = price < av * 0.8 ? '<span class="ar">↓</span>' : ''; }
      h += '<div class="cell click' + rcls(it) + sel + '" data-a="shop" data-v="' + i + '" data-shop="' + i + '" data-drag="shop:' + i + '" data-testid="shop-' + i + '" style="' + pos(x, y, 48, 48) + '">' + itIco(it) + ar + '<span class="pr">' + price + '</span></div>';
    }
    h += '</div>';
    h += '<div class="ttl" style="left:0;top:128px">收購（你的貨）</div>';
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
    if (!n) h += '<div class="sub" style="position:absolute;left:0;top:150px">行囊裡沒有此地收購的貨。</div>';
    h += '<div class="sub" style="position:absolute;left:0;top:280px">↑ 高於兩地均價　↓ 低於均價　行囊格右鍵或拖到右側＝賣出</div>';
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
    let it, unit, qty = tr.qty || 1; const mode = tr.mode;
    if (mode === 'buy') { const row = S.shops[S.loc][tr.idx]; if (!row) return ''; it = row.it; unit = G.buyPrice(row); }
    else { it = S.pack[tr.slot]; if (!it) return ''; unit = G.sellPrice(it); }
    if (it.k === 'eq') qty = 1;
    const d = describe(it); const total = unit * qty;
    const after = mode === 'buy' ? S.silver - total : S.silver + total;
    let h = '<div class="cell tic' + rcls(it) + '">' + itIco(it) + '</div>';
    h += '<div class="tnm">' + esc(G.itemName(it)) + '</div><div class="tds">' + d.head + '</div>';
    h += '<div class="tdet">' + d.lines.slice(0, 4).map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>';
    if (!preview) h += '<div class="qty"><button data-a="qty" data-v="-1">−</button><span data-testid="trade-qty">' + qty + '</span><button data-a="qty" data-v="1">+</button></div>';
    h += '<div class="tprice">' + total + '兩</div><div class="tafter' + (after < 0 ? ' red' : '') + '">銀 ' + S.silver + ' → ' + after + '</div>';
    if (!preview) {
      const unid = mode === 'sell' && it.k === 'eq' && it.eq.unid;
      h += '<div class="tbtns"><button class="btn dark' + (mode !== 'buy' ? ' dis' : '') + '" ' + (mode !== 'buy' ? 'disabled' : '') + ' data-a="buy" data-testid="btn-buy">買</button><button class="btn' + (mode !== 'sell' ? ' dis' : '') + '" ' + (mode !== 'sell' ? 'disabled' : '') + ' data-a="sell" data-testid="btn-sell">賣出所選</button>' + (unid ? '<button class="btn gold" data-a="identifyPay" data-v="' + tr.slot + '" data-testid="btn-identify">鑑定 ' + G.identifyFee(it.eq) + '兩</button>' : '') + '</div>';
    } else h += '<div class="tbtns sub">點選後可買，或直接拖進行囊</div>';
    return h;
  }
  function recipeCards(S, left0, top) {
    let h = '';
    D.RECIPES.forEach((R, i) => {
      const have = G.countItem(R.mat); const ok = have >= R.n && G.canCraftHere(R);
      const x = left0 + i * 260;
      h += '<div class="rcard' + (ok ? '' : ' dim') + '" style="left:' + x + 'px;top:' + top + 'px" data-testid="recipe-' + R.id + '">';
      h += '<div class="ric">' + ico(R.out, R.g, 32) + '</div><div class="rnm">' + R.name + '</div><div class="ref">' + R.eff + '・1 小時</div>';
      h += '<div class="cell rmat' + (have >= R.n ? '' : ' lack') + '">' + ico(R.mat, D.ITEMS[R.mat].g, 24) + '<span class="n">' + have + '/' + R.n + '</span></div><div class="rarr">→</div><div class="cell rout">' + ico(R.out, R.g, 24) + '</div>';
      h += '<button class="btn rmk' + (ok ? ' dark' : ' dis') + '" ' + (ok ? '' : 'disabled') + ' data-a="craft" data-v="' + R.id + '" data-testid="craft-' + R.id + '">製</button>';
      h += '<div class="rwh">' + R.where + '・需' + D.ITEMS[R.mat].name + ' ×' + R.n + '</div></div>';
    });
    return h;
  }
  function tabInn(S) {
    const c = G.innCost(); const free = S.freeRumor[S.loc] !== G.dayOf(S.t);
    let h = '<div class="ttl" style="left:0;top:0">客棧</div><div class="irow" style="left:0;top:16px">';
    h += '<div class="ibox" data-a="innRest" data-testid="inn-rest"><span class="ic">宿</span><span><b>歇一夜</b>' + c.rest + ' 兩・睡到 08:00</span></div>';
    h += '<div class="ibox" data-a="innSoup" data-testid="inn-soup"><span class="ic">食</span><span><b>熱湯</b>' + c.soup + ' 兩・食 +30</span></div>';
    h += '<div class="ibox" data-a="hearRumor" data-testid="inn-rumor"><span class="ic">聞</span><span><b>打聽傳聞</b>' + (free ? '今日第一則免費' : '請酒 ' + c.rumor + ' 兩') + '</span></div></div>';
    h += '<div class="ttl" style="left:0;top:80px">藥爐（煉藥 ' + G.profLv('yao') + '・烹食 ' + G.profLv('peng') + '）</div>';
    h += recipeCards(S, 0, 96);
    h += '<div class="ttl" style="left:0;top:240px">記著的傳聞 ' + S.rumors.length + '/' + D.RUMOR.max + '</div>';
    if (!S.rumors.length) h += '<div class="rtext sub" style="top:256px">還沒聽到什麼。傳聞可能是真的、過時的，也可能是個餌。</div>';
    S.rumors.forEach((r, i) => (h += '<div class="rtext" style="top:' + (256 + i * 15) + 'px">【' + D.RUMOR.kinds[r.kind].name + '】' + esc(r.text) + (r.hint ? '<span class="hint">　' + r.hint + '</span>' : '') + '</div>'));
    return h;
  }
  function tabBounty(S) {
    let h = '<div class="ttl" style="left:0;top:0">委託板・' + D.NODES[S.loc].name + '</div>';
    const day = G.dayOf(S.t);
    const ord = { done: 0, active: 1, open: 2, claimed: 3 };
    const list = G.questsHere().slice().sort((a, b) => (G.questReady(b) ? 1 : 0) - (G.questReady(a) ? 1 : 0) || ord[a.status] - ord[b.status]).slice(0, 9);
    list.forEach((q, i) => {
      const x = (i % 3) * 262, y = 18 + Math.floor(i / 3) * 70;
      const ready = G.questReady(q);
      let btn;
      if (q.status === 'open') btn = '<button class="btn" data-a="bounty" data-v="' + q.id + '" data-testid="bounty-' + q.id + '">揭榜</button>';
      else if (ready) btn = '<button class="btn dark" data-a="bounty" data-v="' + q.id + '" data-testid="bounty-' + q.id + '">交付</button>';
      else if (q.status === 'claimed') btn = '<button class="btn dis" disabled>已交付</button>';
      else btn = '<button class="btn dis" disabled>' + (q.kind === 'collect' ? Math.min(q.need, G.countItem(q.item)) + '/' + q.need : q.kind === 'deliver' ? '送達' : q.prog + '/' + q.need) + '</button>';
      let where;
      if (q.kind === 'kill') where = q.enemy === 'wolf' ? '枯骨獸徑・青霧藥林' : q.enemy === 'boar' ? '枯骨獸徑' : '青霧藥林';
      else if (q.kind === 'clear') where = D.NODES[q.dungeon].name;
      else if (q.kind === 'deliver') where = q.to === S.loc ? '送到此地交付' : '押金 ' + q.deposit + ' 兩';
      else if (q.kind === 'tide') where = '期間獵殺任何野獸';
      else where = '帶回此地交付';
      const due = q.due ? (q.due - day <= 0 ? '今日截止' : '剩 ' + (q.due - day) + ' 天') : '長期';
      h += '<div class="bcard' + (ready ? ' ready' : '') + '" style="left:' + x + 'px;top:' + y + 'px"><span class="ic">' + ico(q.ic, q.g, 32) + '</span><span class="bt"><b>' + q.title + '・' + G.questReward(q) + '兩</b><span class="sub">' + where + '・<span class="' + (q.due && q.due - day <= 0 ? 'red' : '') + '">' + due + '</span></span></span>' + btn + '</div>';
    });
    if (!list.length) h += '<div class="sub" style="position:absolute;left:0;top:24px">板上空空如也，明天再來看看。</div>';
    const other = S.loc === 'huiyao' ? 'duyin' : 'huiyao';
    const act = G.activeQuests().filter((q) => q.town !== S.loc && !(q.kind === 'deliver' && q.to === S.loc)).map((q) => q.title).join('、');
    h += '<div class="sub" style="position:absolute;left:0;top:232px">每座城鎮每天補到 3 張委託，過期撕榜。' + (act ? '你在' + D.NODES[other].name + '還有：' + act : '') + '</div>';
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
    W.points.forEach((p) => {
      const n = ns.pts[p.id]; const done = n <= 0;
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
    h += '<button class="gbtn hot" data-a="camp" data-testid="act-camp"><span class="ic">' + ico('ui_fire', '火', 28) + '</span><span><b>' + (S.fire ? '露宿' : '紮營') + '</b><span>' + (S.fire ? '8 小時・夜警' : '生火・1 小時') + '</span></span></button>';
    h += '</div>';
    h += '<div class="recipes" data-testid="recipes"><div class="ttl" style="left:8px;top:4px">營火' + (S.fire ? '' : '（未生火：先紮營）') + '　煉藥 ' + G.profLv('yao') + '・烹食 ' + G.profLv('peng') + '</div>' + recipeCards(S, 6, 24) + '</div>';
    h += '<div class="logbox" style="top:642px;height:60px" data-testid="log">' + logLines(S, 3) + '</div>';
    return h;
  }

  // ---------- 地城 ----------
  function sceneDungeon(S) {
    const DG = D.DUNGEONS[S.loc]; const st = S.dungeon;
    const cleared = st.clearedDay === G.dayOf(S.t);
    let h = '<div class="dgscene' + scn('dg_' + S.loc) + '" data-testid="dungeon">';
    h += '<div class="stagehead"><span class="pill">' + D.NODES[S.loc].name + '</span><span class="pill">險 ' + DG.risk + '</span></div>';
    h += rumorChips(S);
    h += '<div class="dgdesc">' + DG.scene + '</div>';
    h += '<div class="floors">';
    DG.floors.forEach((f, i) => {
      const cls = cleared || i < st.floor ? ' done' : i === st.floor ? ' cur' : '';
      h += '<div class="floor' + cls + '"><b>' + DG.floorNames[i] + (i === DG.floors.length - 1 ? '・首領' : '') + '</b>' + f.map((e) => '<div class="fe">' + ico(D.ENEMIES[e].ic || e, D.ENEMIES[e].g, 24) + '<span>' + D.ENEMIES[e].name + '</span></div>').join('') + '<div class="sub fs">' + (cleared || i < st.floor ? '已清' : i === st.floor ? '下一層' : '未探') + '</div></div>';
    });
    h += '</div>';
    h += '<div class="dgdesc" style="top:318px">掉落：' + (S.loc === 'guyao' ? '凡品／良品裝備、基礎殘卷' : '稀有／傳奇試做裝、玄石、殘卷') + '（良品以上未鑑定）</div>';
    h += '</div><div class="dgact">';
    if (cleared) h += '<button class="btn dis" disabled>今日已清空</button>';
    else h += '<button class="btn dark" data-a="delve" data-testid="btn-delve">深入' + DG.floorNames[st.floor] + '（1 小時）</button>';
    h += '<button class="btn" data-a="toMap" data-testid="btn-leave">離開・地圖</button><span class="sub">層與層之間可從左欄喝藥、吃糧。</span></div>';
    h += '<div class="logbox" style="top:542px;height:160px" data-testid="log">' + logLines(S, 9) + '</div>';
    return h;
  }

  // ---------- 戰鬥 ----------
  function intentHtml(e, stun) {
    const it = e.intent; if (!it) return '';
    if (stun) return '<div class="intent guard">措手不及</div>';
    if (it.k === 'atk') return '<div class="intent">⚔ 攻擊 ' + it.range[0] + '–' + it.range[1] + '</div>';
    if (it.k === 'heavy') return '<div class="intent heavy">✕ 重擊 ' + it.range[0] + '–' + it.range[1] + '</div>';
    if (it.k === 'bleed') return '<div class="intent">流血 ' + it.range[0] + '–' + it.range[1] + '</div>';
    if (it.k === 'charge') return '<div class="intent charge">蓄力：將重擊</div>';
    return '<div class="intent guard">◆ 防禦 +6</div>';
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
    let h = '<div class="cstage' + combatBg(ctx) + '" data-testid="combat"><div class="cshade"></div>';
    h += '<div class="chead"><span class="pill" style="left:0;top:0">' + where + '</span>';
    h += '<div class="order" data-testid="order"><span class="sub">順序</span>' + G.combatOrder().map((o) => o.who === 'you' ? '<span class="o you">你</span>' : '<span class="o">' + c.enemies[o.who].g + '</span>').join('') + '</div>';
    h += '<span class="pill" style="right:0;top:0;left:auto" data-testid="round">第 ' + c.round + ' 回合</span></div>';
    const n = c.enemies.length;
    c.enemies.forEach((e, i) => {
      const x = n === 1 ? 298 : i === 0 ? 150 : 446;
      const dead = e.hp <= 0; const E = D.ENEMIES[e.id];
      h += '<div class="enemy' + (dead ? ' dead' : '') + (i === c.target && !dead ? ' tgt' : '') + (E.boss ? ' boss' : '') + '" data-a="target" data-v="' + i + '" data-testid="enemy-' + i + '" style="left:' + x + 'px">';
      h += '<div class="ename">' + e.name + '</div><div class="ehp"><i style="width:' + (Math.max(0, e.hp / e.max) * 100).toFixed(1) + '%"></i></div><div class="ehpn">' + Math.max(0, e.hp) + '/' + e.max + (e.bleed > 0 ? '・流血' : '') + '</div>';
      if (!dead) h += '<div data-testid="intent-' + i + '">' + intentHtml(e, c.stun > 0) + '</div>';
      h += '<div class="body">' + ico(E.ic || e.id, e.g, 192) + '</div>';
      if (c.flash && c.flash.i === i) h += '<div class="dmgf">−' + c.flash.d + '</div>';
      h += '</div>';
    });
    h += '</div>';
    // 棄物撤退確認條（點了才展開）
    if (c.retreatOpen) {
      const dw = G.selWt(); const p0 = G.retreatChance(0), p1 = G.retreatChance(dw);
      const m0 = G.loadBand().mult, m1 = G.loadBand(G.totalWt() - dw).mult;
      h += '<div class="rbar" data-testid="retreat-bar"><span class="rt">棄物撤退</span><div class="ritems">';
      S.pack.forEach((it, i) => { if (!it) return; h += '<div class="cell' + (S.retreatSel.includes(i) ? ' drop' : '') + '" data-a="toggleDrop" data-v="' + i + '" data-testid="drop-' + i + '">' + ico(G.itemIcon(it), G.itemGlyph(it), 24) + (it.k !== 'eq' && it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>'; });
      h += '</div><div class="rp"><b data-testid="retreat-rate">撤退率 ' + Math.round(p0 * 100) + '% → ' + Math.round(p1 * 100) + '%</b><span>負重 ×' + m0.toFixed(2) + ' → ×' + m1.toFixed(2) + '・丟下的落在地面</span></div>';
      h += '<button class="btn redb" data-a="retreatGo" data-testid="btn-retreat-confirm">確認撤退</button><button class="btn" data-a="retreatClose">取消</button></div>';
    } else {
      h += '<div class="chint">紅框＝重擊意圖，可防禦或先喝藥；點敵人切換目標；按「撤」展開棄物撤退。</div>';
    }
    const pots = G.countItem('pot_hp');
    const hasBeng = S.skills.includes('beng');
    const wt = G.weaponType(); const wname = wt === 'quan' ? '拳腳' : D.WTYPE_NAMES[wt];
    h += '<div class="abar">';
    h += '<button class="act" data-a="cact" data-v="attack" data-testid="act-attack"><span class="k">1</span><b>攻</b><span>' + wname + '</span></button>';
    h += '<button class="act" data-a="cact" data-v="skill" data-testid="act-skill" ' + (!hasBeng || c.cd > 0 ? 'disabled' : '') + '><span class="k">2</span>' + (c.cd > 0 ? '<span class="c">' + c.cd + '</span>' : '') + '<b>崩</b><span>' + (hasBeng ? '崩岩擊' : '未習得') + '</span></button>';
    h += '<button class="act" data-a="cact" data-v="potion" data-testid="act-potion" ' + (pots ? '' : 'disabled') + '><span class="k">3</span><span class="c">×' + pots + '</span><b>藥</b><span>金創</span></button>';
    h += '<button class="act" data-a="cact" data-v="defend" data-testid="act-defend"><span class="k">4</span><b>防</b><span>防禦</span></button>';
    h += '<button class="act" data-a="cact" data-v="wait" data-testid="act-wait"><span class="k">5</span><b>等</b><span>待機</span></button>';
    h += '<div class="cstat">命中 ' + Math.round(G.hitChance() * 100) + '%・閃避 ' + Math.round(G.dodgeChance() * 100) + '%・傷 ' + G.weaponDmg().join('–') + '</div>';
    h += '<button class="act retreat" data-a="retreatOpen" data-testid="act-retreat"><span class="k">R</span><b>撤</b><span>棄物撤退</span></button>';
    h += '</div>';
    h += '<div class="logbox" style="top:610px;height:92px" data-testid="log">' + logLines(S, 5) + '</div>';
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
    let h = backdrop(S) + '<div class="panel" style="left:168px;top:110px;width:460px" data-testid="event"><div class="sub">' + (ev.dyn ? D.NODES[ev.dest].name : '旅途事件・往' + D.NODES[ev.dest].name) + '</div><h2>' + E.title + '</h2><div class="pl">' + E.text + '</div>';
    if (!ev.result) E.opts.forEach((o) => (h += '<button class="evopt" data-a="evopt" data-v="' + o.k + '" data-testid="ev-' + o.k + '">' + o.label + '<span>' + o.note + '</span></button>'));
    else h += '<div class="pl res">' + esc(ev.result) + '</div><button class="btn dark" style="margin-top:12px;width:120px;height:36px" data-a="evdone" data-testid="btn-ev-done">' + (ev.dyn ? '繼續' : '繼續上路') + '</button>';
    h += '</div><div class="logbox" style="top:610px;height:92px" data-testid="log">' + logLines(S, 5) + '</div>';
    return h;
  }
  function sceneDead(S) {
    const d = S.dead;
    const quote = d.rumors > 1 ? '聽信了太多傳聞，最後自己也成了傳聞。' : d.kills > 5 ? '刀下亡魂不少，終究也成了荒野一縷。' : d.gathers > 6 ? '識得百草，卻沒能醫好自己。' : '山海路遠，此生只走到這裡。';
    let h = '<div class="epitaph" data-testid="epitaph"><div class="sub">墓誌銘</div><h1>沈衡之墓</h1><div class="ep-sub">' + d.origin + '・享年 ' + d.age + '・卒於' + d.when + '・' + d.where + '</div>';
    h += '<div class="ep-line">死因：<b>' + esc(d.cause) + '</b></div>';
    h += '<div class="ep-line">行走 ' + d.hours + ' 小時，歷 ' + d.days + ' 日（' + d.date + '）</div>';
    h += '<div class="ep-line">擊殺 ' + d.kills + '・採集 ' + d.gathers + '・製作 ' + d.crafts + '・委託 ' + d.bounties + '・傳聞 ' + d.rumors + '</div>';
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
    } else if (S.overlay === 'char') {
      const O = D.ORIGINS.find((o) => o.id === S.origin);
      h += '<h2>人物・' + esc(S.name) + '（' + (O ? O.name : '無名') + '・' + G.ageOf(S.t) + ' 歲）</h2>';
      h += '<div class="cattrs">' + D.ATTRS.map((a) => '<div class="cattr"><b>' + a.name + ' ' + G.attrVal(a.id) + '</b><div class="pb"><i style="width:' + (G.attrProgress(a.id) * 100).toFixed(0) + '%"></i></div><span>' + a.desc + '</span></div>').join('') + '</div>';
      h += '<div class="cprofs">';
      D.PROF_GROUPS.forEach((g) => {
        h += '<div class="cgrp"><h3>' + g.name + '</h3>';
        D.PROFS.filter((p) => p.grp === g.id).forEach((p) => {
          const lv = G.profLv(p.id);
          const perks = [25, 50, 75].filter((t) => p.perks[t]).map((t) => '<span class="' + (lv >= t ? 'got' : '') + '">' + t + ' ' + p.perks[t] + '</span>').join('');
          h += '<div class="cprof' + (p.locked ? ' lock' : '') + '"><b>' + p.name + ' ' + (p.locked ? '—' : lv) + '</b><em>' + D.ATTRS.find((a) => a.id === p.attr).name + '・' + p.how + '</em><div class="pb"><i style="width:' + (p.locked ? 0 : G.profProgress(p.id) * 100).toFixed(0) + '%"></i></div>' + perks + '</div>';
        });
        h += '</div>';
      });
      h += '</div>';
    } else if (S.overlay === 'help') {
      h += '<h2>說明（灰盒 v0.25）</h2>';
      ['沒有等級。成長分三層：素質（很慢）、熟練度（做什麼長什麼）、裝備。熟練度到 25／50／75 會領悟新能力，同時帶動主素質。做太簡單的事不會再成長。',
        '拖拉：行囊格之間拖拉可交換或合併；拖到人形槽＝裝備，人形槽拖回行囊＝卸下；拖到「地面」＝丟下；市集裡拖到右側交易欄＝賣出，貨架拖進行囊＝買一個。點擊仍是使用／裝備／選取。',
        '裝備：重裝備有素質門檻。地城與傳聞掉的良品以上裝備未鑑定，要靠鑑物熟練度或到市集付費鑑定才能穿。',
        '負重：格數看背包，重量看體魄與負重熟練度。≤40% 輕裝、41–75% 常態重負（×0.82）、76–100% 超載（×0.60）。背到常態重負以上趕路才會練到負重。',
        '委託：城鎮委託板每天補到 3 張，有期限。傳聞：客棧打聽，每天第一則免費；可能屬實、有人盤踞、強敵鎮守、已被取走，或根本是餌。探聞與追蹤到 25 能提前看出端倪。',
        '獸潮：每隔幾天襲擊一座城鎮，為期 2 天。期間獸跡變多、野徑更險、藥水漲價；沒擊退的話城鎮會受創。',
        '戰鬥：鍵盤 1–5 行動、R 棄物撤退。紅框＝重擊意圖。永久死亡：死亡即刪檔並留下墓誌銘。',
      ].forEach((t) => (h += '<p>' + t + '</p>'));
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

  // ======================= 互動 =======================
  function render(S) { renderLeft(S); renderCenter(S); renderRight(S); }
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
    if (ev.button !== 0) return;
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
    const el = ev.target.closest('[data-a]'); if (!el || el.disabled) return;
    const a = el.getAttribute('data-a'); const v = el.getAttribute('data-v');
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
      case 'tab': return G.setTab(v);
      case 'profTab': return G.setProfTab(v);
      case 'shop': return G.selectShop(+v);
      case 'qty': return G.setQty(+v);
      case 'buy': return G.buy();
      case 'sell': return G.sell();
      case 'identifyPay': return G.identify(+v, true);
      case 'innRest': return G.innRest();
      case 'innSoup': return G.innSoup();
      case 'hearRumor': return G.hearRumor();
      case 'bounty': return G.questAct(v);
      case 'trace': return G.traceRumor(v);
      case 'investigate': return G.investigate(v);
      case 'craft': return G.craft(v);
      case 'gather': return G.gather(v);
      case 'gpt': { const p = D.WILDS[S.loc].points.find((x) => x.id === v); return G.gather(p.kind, v); }
      case 'camp': return G.camp();
      case 'delve': return G.dungeonDelve();
      case 'cact': return G.combatAction(v);
      case 'target': return G.setTarget(+v);
      case 'retreatOpen': return G.toggleRetreat(true);
      case 'retreatClose': return G.toggleRetreat(false);
      case 'retreatGo': return G.combatAction('retreat');
      case 'lootDone': return G.lootDone();
      case 'evopt': return G.eventChoose(v);
      case 'evdone': return G.eventDone();
      case 'overlay': return G.setOverlay(v);
      case 'sysCamp': return G.sysCamp();
      case 'restart': return G.restart();
      case 'restartAsk': if (window.confirm('確定放棄此生？存檔將刪除。')) G.restart(); return;
    }
  });
  document.addEventListener('contextmenu', (ev) => {
    const el = ev.target.closest('[data-a="pack"]');
    const S = G.state;
    if (el && S.scene === 'town' && S.townTab === 'market') { ev.preventDefault(); G.sell(+el.getAttribute('data-v')); }
  });
  $L.addEventListener('mouseover', (ev) => { const el = ev.target.closest('[data-tip]'); if (el) showTip(el); });
  $L.addEventListener('mouseout', (ev) => { const el = ev.target.closest('[data-tip]'); if (el && !el.contains(ev.relatedTarget)) hideTip(); });
  // 中欄商品提示卡：錨定在交易欄位置，不蓋住貨架
  $C.addEventListener('mouseover', (ev) => {
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
    if (!S.combat) return;
    const map = { 1: 'attack', 2: 'skill', 3: 'potion', 4: 'defend', 5: 'wait' };
    if (map[ev.key]) { if (map[ev.key] === 'skill' && (!S.skills.includes('beng') || S.combat.cd > 0)) return; G.combatAction(map[ev.key]); }
    else if (ev.key === 'r' || ev.key === 'R') G.toggleRetreat(!S.combat.retreatOpen);
  });

  // 啟動：?seed=數字 固定亂數；?fresh=1 強制新局；?origin=hunter 等直接指定出身
  const q = new URLSearchParams(location.search);
  const seed = q.has('seed') ? parseInt(q.get('seed'), 10) : undefined;
  G.init({ seed, fresh: q.get('fresh') === '1', origin: q.get('origin') || undefined });
})();
