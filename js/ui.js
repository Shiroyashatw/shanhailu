/* 《山海錄》灰盒 v0.1 — 三欄介面渲染（左 240／中 796／右 220） */
'use strict';

(function () {
  const D = window.SHL_DATA;
  const G = window.SHL;
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
  const RAR_CLS = { white: '', blue: 'r-blue', rare: 'r-rare', legend: 'r-legend' };

  function rmark(eq) { return eq && eq.rarity !== 'white' ? '<i class="rm ' + eq.rarity + '"></i>' : ''; }
  function pos(x, y, w, h) { return 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;'; }

  // ======================= 左欄 =======================
  function renderLeft(S) {
    let h = '<div class="doll">';
    Object.keys(DOLL).forEach((slot) => {
      const [x, y, w, hh] = DOLL[slot];
      if (slot === 'cart') {
        h += '<div class="cell locked slot-cart" data-tip="cart" style="' + pos(x, y, w, hh) + '" title="">車</div>';
        return;
      }
      const eq = S.equip[slot];
      if (eq) {
        const B = G.eqBase(eq);
        h += '<div class="cell click ' + RAR_CLS[eq.rarity] + '" data-a="unequip" data-v="' + slot + '" data-tip="slot:' + slot + '" data-testid="slot-' + slot + '" style="' + pos(x, y, w, hh) + (slot.startsWith('ring') || slot === 'amulet' || slot === 'belt' ? 'font-size:12px;' : '') + '">' + rmark(eq) + B.g + (slot === 'bag' ? '<span class="n">' + B.bag + '</span>' : '') + '</div>';
      } else {
        h += '<div class="cell empty" data-tip="slot:' + slot + '" data-testid="slot-' + slot + '" style="' + pos(x, y, w, hh) + (slot.startsWith('ring') || slot === 'amulet' || slot === 'belt' ? 'font-size:12px;' : '') + '">' + D.SLOT_GLYPH[slot] + '</div>';
      }
    });
    h += '</div>';
    const cap = G.bagCap(); const used = S.pack.filter(Boolean).length;
    h += '<div class="lhead" style="top:200px"><span class="lbl"><b>行囊 ' + used + '/' + cap + '</b></span><span class="sub">上限 24</span></div>';
    const retreat = S.combat && S.combat.retreatOpen;
    h += '<div class="packgrid" data-testid="pack">';
    for (let i = 0; i < 24; i++) {
      const x = (i % 5) * 44, y = Math.floor(i / 5) * 44;
      if (i >= cap) { h += '<div class="cell locked" style="' + pos(x, y, 40, 40) + '"></div>'; continue; }
      const it = S.pack[i];
      if (!it) { h += '<div class="cell empty" style="' + pos(x, y, 40, 40) + '"></div>'; continue; }
      const sel = (S.trade && S.trade.mode === 'sell' && S.trade.slot === i) ? ' sel' : '';
      const drop = retreat && S.retreatSel.includes(i) ? ' drop' : '';
      const act = retreat ? 'toggleDrop' : 'pack';
      const rc = it.k === 'eq' ? ' ' + RAR_CLS[it.eq.rarity] : '';
      h += '<div class="cell click' + rc + sel + drop + '" data-a="' + act + '" data-v="' + i + '" data-tip="pack:' + i + '" data-testid="pack-' + i + '" style="' + pos(x, y, 40, 40) + '">' + (it.k === 'eq' ? rmark(it.eq) : '') + G.itemGlyph(it) + (it.k !== 'eq' ? '<span class="n">×' + it.n + '</span>' : '') + '</div>';
    }
    h += '</div>';
    const gr = S.ground.node === S.loc ? S.ground.items : [];
    h += '<div class="lhead" style="top:438px"><span class="lbl"><b>地面</b></span><span class="sub">點擊撿回行囊</span></div>';
    h += '<div class="groundgrid" data-testid="ground">';
    for (let i = 0; i < 10; i++) {
      const x = (i % 5) * 44, y = Math.floor(i / 5) * 44;
      const it = gr[i];
      if (!it) { h += '<div class="cell empty" style="' + pos(x, y, 40, 40) + '"></div>'; continue; }
      h += '<div class="cell click" data-a="pickup" data-v="' + i + '" data-tip="ground:' + i + '" data-testid="ground-' + i + '" style="' + pos(x, y, 40, 40) + '">' + (it.k === 'eq' ? rmark(it.eq) : '') + G.itemGlyph(it) + (it.k !== 'eq' ? '<span class="n">×' + it.n + '</span>' : '') + '</div>';
    }
    h += '</div>';
    h += '<div class="minimap" data-testid="minimap">' + miniMap(S) + '</div>';
    // 負重底條
    const w = G.totalWt(), cc = G.carryCap(), band = G.loadBand();
    const pct = Math.min(1, w / cc);
    h += '<div class="loadbar" data-testid="loadbar" title=""><span class="ic">負</span><div class="thinbar' + (pct > 0.75 ? ' warn' : '') + '" style="width:108px"><i style="width:' + (pct * 100).toFixed(1) + '%"></i><b style="left:40%"></b><b style="left:75%"></b></div><span>' + Math.round(w) + '/' + cc + '</span><span style="margin-left:auto;font-weight:700">×' + G.speedMult().toFixed(2) + '</span></div>';
    h += '<div id="tip" style="display:none"></div>';
    $L.innerHTML = h;
  }
  function miniMap(S) {
    const sx = 228 / 796, sy = 124 / 560;
    let s = '<svg width="226" height="122" viewBox="0 0 226 122">';
    D.EDGES.forEach((e) => {
      const a = D.NODES[e.a], b = D.NODES[e.b];
      s += '<line x1="' + (a.x * sx) + '" y1="' + (a.y * sy) + '" x2="' + (b.x * sx) + '" y2="' + (b.y * sy) + '" stroke="#333" stroke-width="1" ' + (e.road ? '' : 'stroke-dasharray="3 2"') + '/>';
    });
    Object.keys(D.NODES).forEach((id) => {
      const n = D.NODES[id]; const x = n.x * sx, y = n.y * sy;
      if (n.kind === 'way') { s += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#fff" stroke="#333"/>'; return; }
      const cur = id === S.loc;
      s += '<rect x="' + (x - 8) + '" y="' + (y - 8) + '" width="16" height="16" fill="' + (cur ? '#222' : '#fff') + '" stroke="#222" stroke-width="' + (cur ? 2 : 1) + '"/>';
      s += '<text x="' + x + '" y="' + (y + 4) + '" font-size="10" text-anchor="middle" fill="' + (cur ? '#fff' : '#111') + '" font-weight="700">' + n.g + '</text>';
    });
    return s + '</svg>';
  }

  // ---------- 提示卡內容 ----------
  function eqTipHtml(eq, cmpEq, priceLine) {
    const B = G.eqBase(eq);
    let h = '<div class="tip-h"><span class="tip-name">' + esc(eq.name) + '</span><span class="tag">' + D.RARITY[eq.rarity].name + '</span></div>';
    h += '<div class="sub">' + (B.slot === 'ring' ? '戒指' : D.SLOT_NAMES[B.slot]) + '・重 ' + B.wt + (B.twoHanded ? '・雙手' : '') + '</div>';
    if (B.dmg) h += '<div class="tip-base">傷害 ' + B.dmg[0] + '–' + B.dmg[1] + '</div>';
    else if (B.armor) h += '<div class="tip-base">護甲 ' + B.armor + '</div>';
    else if (B.bag) h += '<div class="tip-base">背包 ' + B.bag + ' 格</div>';
    else if (B.cap) h += '<div class="tip-base">負重上限 +' + B.cap + '</div>';
    if (!eq.affixes.length && !eq.unique) h += '<div class="sub">（無詞綴）</div>';
    eq.affixes.forEach((a) => (h += '<div class="tip-aff">' + D.AFFIXES[a.id].t.replace('{v}', a.v) + '</div>'));
    if (eq.unique) h += '<div class="tip-uni">◆ ' + D.UNIQUES[eq.unique] + '</div>';
    h += '<div class="tip-foot"><span>' + priceLine + '</span><span>' + (cmpEq === undefined ? '點＝卸下' : '點＝裝備') + '</span></div>';
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
  function itemTipHtml(it, priceLine, hint) {
    const I = D.ITEMS[it.k];
    const type = { mat: '素材', use: '消耗', goods: '貨物', scroll: '殘卷' }[I.type];
    let h = '<div class="tip-h"><span class="tip-name">' + I.name + '</span><span class="tag">' + type + '</span></div>';
    h += '<div class="sub">數量 ' + it.n + '・重 ' + I.wt * it.n + '</div>';
    h += '<div class="tip-aff" style="white-space:normal">' + I.desc + '</div>';
    h += '<div class="tip-foot"><span>' + priceLine + '</span><span>' + hint + '</span></div>';
    return h;
  }
  function priceLineFor(it) {
    const town = D.NODES[G.state.loc].kind === 'town';
    if (it.k === 'eq') return (town ? '此地可賣 ' : '估價 ') + Math.floor(G.eqValue(it.eq) * 0.6) + ' 兩';
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
    if (!tip) return;
    const key = el.getAttribute('data-tip'); const [kind, v] = key.split(':');
    let html = '', rc = '';
    if (kind === 'cart') { html = '<div class="tip-h"><span class="tip-name">馬車槽</span><span class="tag">預留</span></div><div class="sub">架構預留・MVP 不可用</div><div class="tip-aff" style="white-space:normal">完整版可於城鎮雇用或購買馬車，提供大型貨倉、分擔負重，限走官道。</div>'; }
    else if (kind === 'slot') {
      const eq = S.equip[v];
      if (!eq) html = '<div class="tip-h"><span class="tip-name">' + D.SLOT_NAMES[v] + '</span><span class="tag">空</span></div><div class="sub">尚未裝備</div>';
      else { html = eqTipHtml(eq, undefined, priceLineFor({ k: 'eq', eq })); rc = RAR_CLS[eq.rarity]; if (v === 'bag') html = html.replace('點＝卸下', '城鎮買包替換'); }
    } else if (kind === 'pack' || kind === 'ground') {
      const it = kind === 'pack' ? S.pack[+v] : S.ground.items[+v];
      if (!it) return;
      if (it.k === 'eq') { html = eqTipHtml(it.eq, cmpFor(it.eq), priceLineFor(it)); rc = RAR_CLS[it.eq.rarity]; if (kind === 'ground') html = html.replace('點＝裝備', '點＝撿起'); }
      else {
        const I = D.ITEMS[it.k];
        let hint = I.type === 'use' ? '點＝使用' : I.type === 'scroll' ? '點＝研讀' : '';
        if (kind === 'ground') hint = '點＝撿起';
        if (kind === 'pack' && S.scene === 'town' && S.townTab === 'market') hint = '點＝選取・右鍵＝賣';
        html = itemTipHtml(it, priceLineFor(it), hint);
      }
    }
    tip.className = rc; tip.innerHTML = html; tip.style.display = 'block';
    // 錨定在被滑過的槽位正下方；太靠底改往上翻；永遠不出左欄
    const colR = $L.getBoundingClientRect(); const r = el.getBoundingClientRect();
    let top = r.bottom - colR.top + 4;
    const th = tip.offsetHeight;
    if (top + th > 704) top = r.top - colR.top - th - 4;
    if (top < 2) top = 2;
    tip.style.top = top + 'px';
  }
  function hideTip() { const tip = document.getElementById('tip'); if (tip) tip.style.display = 'none'; }

  // ======================= 右欄 =======================
  function renderRight(S) {
    const mh = G.maxHp();
    let h = '<div class="portrait">頭像</div><div class="pname">' + esc(S.name) + '</div>';
    h += '<div class="pill" style="left:76px;top:28px;width:136px" data-testid="loc">' + D.NODES[S.loc].name + '</div>';
    h += '<div class="silver"><span class="ic">銀</span><span data-testid="silver">' + S.silver + '</span></div>';
    h += '<div class="pill" style="left:122px;top:51px;width:90px;font-weight:700" data-testid="clock">' + G.fmtTime(S.t) + '</div>';
    const vit = (ic, v, max, y, crit, tid, marks) => '<div class="vit' + (crit ? ' crit' : '') + '" style="top:' + y + 'px" data-testid="' + tid + '"><span class="ic">' + ic + '</span><div class="bar"><i style="width:' + Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1) + '%"></i>' + (marks || '') + '</div><span class="num">' + Math.max(0, Math.round(v)) + '/' + max + '</span></div>';
    h += vit('命', S.hp, mh, 78, S.hp / mh <= 0.3, 'hp');
    h += vit('食', S.food, 100, 98, S.food <= 20, 'food', '<b style="left:20%"></b>');
    h += vit('疲', S.fat, 100, 118, S.fat >= 80, 'fat', '<b style="left:80%"></b>');
    const band = G.loadBand();
    const sts = [
      ['血', S.combat && S.combat.bleed > 0, true], ['餓', S.food < 20, true], ['倦', S.fat >= 80, true], ['重', band.id === 'heavy' || band.id === 'over', false],
    ];
    sts.forEach((s, i) => (h += '<div class="status' + (s[1] ? ' on' + (s[2] ? ' bad' : '') : '') + '" style="left:' + (8 + i * 26) + 'px">' + (s[1] ? s[0] : '') + '</div>'));
    h += '<div class="lbl" style="position:absolute;left:116px;top:144px">護甲 ' + G.armor() + '・傷 ' + G.weaponDmg().join('–') + '</div>';
    h += '<div class="sep" style="top:168px"></div>';
    D.PROFS.forEach((p, i) => {
      h += '<div class="prof" style="top:' + (172 + i * 22) + 'px" data-testid="prof-' + p.id + '"><span class="ic">' + p.g + '</span><span class="nm">' + p.name + '</span><span class="lv">' + G.profLv(p.id) + '</span><div class="pb"><i style="width:' + (G.profProgress(p.id) * 100).toFixed(0) + '%"></i></div></div>';
    });
    h += '<div class="lbl" style="position:absolute;left:8px;top:290px"><b>技能</b></div>';
    h += '<div class="skillgrid" data-testid="skills">';
    for (let i = 0; i < 12; i++) {
      const x = (i % 4) * 52, y = Math.floor(i / 4) * 52;
      const sk = S.skills[i];
      if (!sk) { h += '<div class="cell empty" style="' + pos(x, y, 46, 46) + '"></div>'; continue; }
      const K = D.SKILLS[sk];
      const cd = sk === 'beng' && S.combat && S.combat.cd > 0 ? S.combat.cd : '';
      h += '<div class="cell" title="' + K.name + '：' + K.desc + '" style="' + pos(x, y, 46, 46) + '"><span class="tl">' + K.kind + '</span>' + K.g + (cd ? '<span class="n">' + cd + '</span>' : '') + '</div>';
    }
    h += '</div>';
    h += '<div class="lbl" style="position:absolute;left:8px;top:466px"><b>追蹤賞金</b></div>';
    const tb = G.trackedBounty();
    if (tb) h += '<div class="bounty" data-testid="bounty"><span class="ic">' + tb.B.g + '</span><span class="tt">' + tb.B.title.replace(/ ×\d+/, '') + ' ' + tb.b.prog + '/' + tb.B.need + (tb.b.status === 'done' ? ' ✓' : '') + '</span><span>' + tb.B.reward + '兩</span></div>';
    else h += '<div class="bounty sub" data-testid="bounty">（無）城鎮賞金板揭榜</div>';
    h += '<div class="lbl" style="position:absolute;left:8px;top:528px;width:204px;white-space:normal;color:#8a8a8a">負重 ' + band.name + '・速度 ×' + G.speedMult().toFixed(2) + '</div>';
    h += '<div class="lbl" style="position:absolute;left:8px;top:546px;width:204px;white-space:normal;color:#8a8a8a">存檔：純永久死亡</div>';
    h += '<div class="sysbtns"><button data-a="sysCamp" data-testid="sys-camp">紮營</button><button data-a="overlay" data-v="log" data-testid="sys-log">日誌</button><button data-a="overlay" data-v="help" data-testid="sys-help">說明</button><button data-a="overlay" data-v="menu" data-testid="sys-menu">選單</button></div>';
    $R.innerHTML = h;
  }

  // ======================= 中欄 =======================
  function logLines(S, n) {
    return S.log.slice(-n).map((l) => '<div class="' + l.cls + '">' + esc(l.text) + '</div>').join('');
  }
  function renderCenter(S) {
    let h = '';
    switch (S.scene) {
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

  // ---------- 世界地圖 ----------
  function sceneMap(S) {
    const dest = S.dest; const p = dest ? G.travelPreview(dest) : null;
    const routeEdges = p ? p.edges : [];
    let h = '<div class="map" data-testid="worldmap">';
    h += '<div class="legend"><span>━ 官道</span><span>╍ 野徑</span></div>';
    h += '<div class="region" style="left:70px;top:150px">灰窯原</div><div class="region" style="left:470px;top:376px">青霧山</div>';
    let svg = '<svg width="796" height="560">';
    svg += '<defs><pattern id="hp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#e2e2e2" stroke-width="2"/></pattern></defs>';
    svg += '<path d="M0,250 C120,190 200,120 330,60" stroke="#dcdcdc" stroke-width="8" fill="none"/>';
    [['qingwu', 90, 70], ['guyao', 60, 55], ['jiku', 85, 55], ['chishi', 75, 55], ['kugu', 70, 55]].forEach(([id, rx, ry]) => {
      const n = D.NODES[id]; svg += '<ellipse cx="' + n.x + '" cy="' + n.y + '" rx="' + rx + '" ry="' + ry + '" fill="url(#hp)" stroke="#c8c8c8" stroke-dasharray="4 3"/>';
    });
    D.EDGES.forEach((e) => {
      const a = D.NODES[e.a], b = D.NODES[e.b];
      const on = routeEdges.includes(e);
      svg += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#111" stroke-width="' + (on ? 5 : e.road ? 2.5 : 1.6) + '" ' + (e.road || on ? '' : 'stroke-dasharray="6 5"') + '/>';
    });
    svg += '</svg>';
    h += svg;
    Object.keys(D.NODES).forEach((id) => {
      const n = D.NODES[id];
      if (n.kind === 'way') {
        h += '<div class="mway" style="left:' + (n.x - 7) + 'px;top:' + (n.y - 7) + 'px"></div>';
        h += '<div class="mlabel" style="left:' + (n.x - 34) + 'px;top:' + (n.y + 12) + 'px;width:68px;justify-content:center">' + n.name + '</div>';
        return;
      }
      const cls = (id === S.loc ? ' cur' : '') + (id === dest ? ' dest' : '');
      h += '<div class="mnode' + cls + '" data-a="dest" data-v="' + id + '" data-testid="node-' + id + '" style="left:' + (n.x - 17) + 'px;top:' + (n.y - 17) + 'px">' + n.g + '</div>';
      h += '<div class="mlabel" data-a="dest" data-v="' + id + '" style="left:' + (n.x - 34) + 'px;top:' + (n.y + 22) + 'px;width:68px;justify-content:center;cursor:pointer">' + n.name + '</div>';
      if (id === S.loc) h += '<div class="here" style="left:' + (n.x - 22) + 'px;top:' + (n.y - 42) + 'px">此地</div>';
    });
    if (p) {
      const n = D.NODES[dest];
      const txt = p.hours + ' 小時・食 −' + p.food + '・疲 +' + p.fat + '・險 ' + p.riskName;
      const w = 184; let x = n.x - w / 2; x = Math.max(6, Math.min(796 - w - 6, x));
      h += '<div class="tipbubble" style="left:' + x + 'px;top:' + (n.y - 50) + 'px;width:' + w + 'px;justify-content:center" data-testid="route-tip">' + txt + '</div>';
    }
    h += '</div>';
    // 出發條
    h += '<div class="departbar" data-testid="departbar">';
    if (p) {
      const n = D.NODES[dest];
      h += '<div class="dic">' + n.g + '</div><div class="dname"><b>' + n.name + '</b><span class="sub">經 ' + p.via + '</span></div>';
      h += '<div class="vpill"><span class="ic">時</span>' + p.hours + ' 小時</div><div class="vpill"><span class="ic">食</span>−' + p.food + '</div><div class="vpill"><span class="ic">疲</span>+' + p.fat + '</div><div class="vpill"><span class="ic">險</span>' + p.riskName + '</div><div class="vpill"><span class="ic">負</span>×' + p.mult.toFixed(2) + '</div>';
      h += '<button class="btn dark go" data-a="travel" data-testid="btn-travel">前往</button>';
    } else {
      const n = D.NODES[S.loc];
      h += '<div class="dic">' + n.g + '</div><div class="dname"><b>' + n.name + '</b><span class="sub">此地</span></div><span class="sub">點選地圖上的節點設定目的地；預告耗時、飽食、疲累、遇險與負重倍率。</span>';
      h += '<button class="btn dark go" data-a="enterHere" data-testid="btn-enter">進入此地</button>';
    }
    h += '</div>';
    h += '<div class="logbox" style="top:628px;height:74px" data-testid="log">' + logLines(S, 4) + '<span class="tag-tr">山海錄 灰盒 v0.1</span></div>';
    return h;
  }

  // ---------- 城鎮 ----------
  function sceneTown(S) {
    const tab = S.townTab || 'market';
    let h = '<div class="townscene" data-testid="town">';
    h += '<div class="tabs">' + [['market', '市集'], ['inn', '客棧'], ['bounty', '賞金']].map(([k, n]) => '<button class="' + (tab === k ? 'on' : '') + '" data-a="tab" data-v="' + k + '" data-testid="tab-' + k + '">' + n + '</button>').join('') + '</div>';
    h += '<div class="townname">' + D.NODES[S.loc].name + '</div>';
    h += '<div class="bld" style="left:250px;top:100px" data-a="tab" data-v="inn">藥爐</div>';
    h += '<div class="bld" style="left:380px;top:150px" data-a="tab" data-v="inn">客棧</div>';
    h += '<div class="bld" style="left:160px;top:208px" data-a="tab" data-v="market">市集</div>';
    h += '<div class="bld" style="left:576px;top:196px" data-a="tab" data-v="bounty">賞金</div>';
    h += '<div class="sub" style="position:absolute;left:8px;bottom:10px">' + D.TOWNS[S.loc].desc + '點建築或分頁切換；行囊格右鍵直接賣出。</div>';
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
    let h = '<div class="ttl" style="left:0;top:0">貨架</div><div class="shelf">';
    for (let i = 0; i < 18; i++) {
      const x = (i % 9) * 52, y = 16 + Math.floor(i / 9) * 52;
      const row = shop[i];
      if (!row) { h += '<div class="cell empty" style="' + pos(x, y, 48, 48) + 'cursor:default"></div>'; continue; }
      const it = row.it; const sel = S.trade && S.trade.mode === 'buy' && S.trade.idx === i ? ' sel' : '';
      const rc = it.k === 'eq' ? ' ' + RAR_CLS[it.eq.rarity] : '';
      let ar = '';
      if (it.k !== 'eq') { const tp = G.townPrice(it.k); const av = G.avgPrice(it.k); if (tp !== undefined) ar = row.price < av * 0.8 ? '<span class="ar">↓</span>' : ''; }
      h += '<div class="cell click' + rc + sel + '" data-a="shop" data-v="' + i + '" data-shop="' + i + '" data-testid="shop-' + i + '" style="' + pos(x, y, 48, 48) + '">' + (it.k === 'eq' ? rmark(it.eq) : '') + G.itemGlyph(it) + ar + '<span class="pr">' + row.price + '兩</span></div>';
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
      h += '<div class="cell click' + sel + '" data-a="pack" data-v="' + i + '" data-testid="buyback-' + i + '" style="' + pos(x, y, 48, 48) + '">' + G.itemGlyph(it) + ar + '<span class="pr">' + p + '兩</span>' + (it.k !== 'eq' ? '<span class="tl">×' + it.n + '</span>' : '') + '</div>';
    });
    if (!n) h += '<div class="sub" style="position:absolute;left:0;top:150px">行囊裡沒有此地收購的貨。</div>';
    h += '<div class="sub" style="position:absolute;left:0;top:280px">↑ 高於兩地均價　↓ 低於均價　行囊格右鍵＝直接賣出</div>';
    h += '<div class="trade" data-testid="trade">' + tradeBody(S) + '</div>';
    h += '<div id="shoptip" class="trade" style="display:none;z-index:20;background:#fff"></div>';
    return h;
  }
  function describe(it) {
    if (it.k === 'eq') {
      const B = G.eqBase(it.eq);
      const head = (B.bag ? B.bag + ' 格・重 ' + B.wt + '・現 ' + G.bagCap() + ' 格' : (B.slot === 'ring' ? '戒指' : D.SLOT_NAMES[B.slot]) + '・重 ' + B.wt + '・' + D.RARITY[it.eq.rarity].name);
      const lines = [];
      if (B.dmg) lines.push('傷害 ' + B.dmg[0] + '–' + B.dmg[1] + (B.twoHanded ? '（雙手）' : ''));
      if (B.armor) lines.push('護甲 ' + B.armor);
      if (B.cap) lines.push('負重上限 +' + B.cap);
      it.eq.affixes.forEach((a) => lines.push('■ ' + D.AFFIXES[a.id].t.replace('{v}', a.v)));
      if (it.eq.unique) lines.push('◆ ' + D.UNIQUES[it.eq.unique]);
      return { head, lines };
    }
    const I = D.ITEMS[it.k];
    return { head: '單重 ' + I.wt + '・' + { mat: '素材', use: '消耗', goods: '貨物', scroll: '殘卷' }[I.type], lines: [I.desc] };
  }
  function tradeBody(S, preview) {
    const tr = preview || S.trade;
    if (!tr) return '<div class="sub" style="position:absolute;left:8px;top:8px">點貨架商品＝買；點你的貨＝賣。</div><div class="tbtns"><button class="btn dark dis" disabled>買</button><button class="btn dis" disabled>賣出所選</button></div>';
    let it, unit, qty = tr.qty || 1, mode = tr.mode;
    if (mode === 'buy') { const row = S.shops[S.loc][tr.idx]; if (!row) return ''; it = row.it; unit = row.price; }
    else { it = S.pack[tr.slot]; if (!it) return ''; unit = G.sellPrice(it); }
    if (it.k === 'eq') qty = 1;
    const d = describe(it); const total = unit * qty;
    const after = mode === 'buy' ? S.silver - total : S.silver + total;
    let h = '<div class="cell tic ' + (it.k === 'eq' ? RAR_CLS[it.eq.rarity] : '') + '">' + G.itemGlyph(it) + '</div>';
    h += '<div class="tnm">' + esc(G.itemName(it)) + '</div><div class="tds">' + d.head + '</div>';
    h += '<div class="tdet">' + d.lines.slice(0, 4).map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>';
    if (!preview) h += '<div class="qty"><button data-a="qty" data-v="-1">−</button><span data-testid="trade-qty">' + qty + '</span><button data-a="qty" data-v="1">+</button></div>';
    h += '<div class="tprice">' + total + '兩</div><div class="tafter' + (after < 0 ? ' red' : '') + '">銀 ' + S.silver + ' → ' + after + '</div>';
    if (!preview) h += '<div class="tbtns"><button class="btn dark' + (mode !== 'buy' ? ' dis' : '') + '" ' + (mode !== 'buy' ? 'disabled' : '') + ' data-a="buy" data-testid="btn-buy">買</button><button class="btn' + (mode !== 'sell' ? ' dis' : '') + '" ' + (mode !== 'sell' ? 'disabled' : '') + ' data-a="sell" data-testid="btn-sell">賣出所選</button></div>';
    else h += '<div class="tbtns sub">點選後可買／賣</div>';
    return h;
  }
  function recipeCards(S, left0, top) {
    let h = '';
    D.RECIPES.forEach((R, i) => {
      const have = G.countItem(R.mat); const ok = have >= R.n && G.canCraftHere(R);
      const x = left0 + i * 260;
      h += '<div class="rcard' + (ok ? '' : ' dim') + '" style="left:' + x + 'px;top:' + top + 'px" data-testid="recipe-' + R.id + '">';
      h += '<div class="ric">' + R.g + '</div><div class="rnm">' + R.name + '</div><div class="ref">' + R.eff + '・1 小時</div>';
      h += '<div class="cell rmat' + (have >= R.n ? '' : ' empty') + '">' + D.ITEMS[R.mat].g + '<span class="n">' + have + '/' + R.n + '</span></div><div class="rarr">→</div><div class="cell rout">' + R.g + '</div>';
      h += '<button class="btn rmk' + (ok ? ' dark' : ' dis') + '" ' + (ok ? '' : 'disabled') + ' data-a="craft" data-v="' + R.id + '" data-testid="craft-' + R.id + '">製</button>';
      h += '<div class="rwh">' + R.where + '・需' + D.ITEMS[R.mat].name + ' ×' + R.n + '</div></div>';
    });
    return h;
  }
  function tabInn(S) {
    let h = '<div class="ttl" style="left:0;top:0">客棧</div><div class="irow" style="left:0;top:16px">';
    h += '<div class="ibox" data-a="innRest" data-testid="inn-rest"><span class="ic">宿</span><span><b>歇一夜</b>8 兩・睡到 08:00</span></div>';
    h += '<div class="ibox" data-a="innSoup" data-testid="inn-soup"><span class="ic">食</span><span><b>熱湯</b>3 兩・食 +30</span></div>';
    h += '<div class="ibox dis"><span class="ic">爐</span><span><b>藥爐</b>免費・見下方</span></div></div>';
    h += '<div class="ttl" style="left:0;top:80px">藥爐（煉藥 ' + G.profLv('yao') + '）</div>';
    h += recipeCards(S, 0, 96);
    return h;
  }
  function tabBounty(S) {
    let h = '<div class="ttl" style="left:0;top:0">賞金板・' + D.NODES[S.loc].name + '</div>';
    const list = D.BOUNTIES.filter((B) => B.town === S.loc);
    list.forEach((B, i) => {
      const b = S.bounties.find((x) => x.id === B.id);
      const x = (i % 3) * 260, y = 18 + Math.floor(i / 3) * 72;
      let btn;
      if (b.status === 'open') btn = '<button class="btn" data-a="bounty" data-v="' + B.id + '" data-testid="bounty-' + B.id + '">揭榜</button>';
      else if (b.status === 'active') btn = '<button class="btn dis" disabled>' + b.prog + '/' + B.need + '</button>';
      else if (b.status === 'done') btn = '<button class="btn dark" data-a="bounty" data-v="' + B.id + '" data-testid="bounty-' + B.id + '">交付</button>';
      else btn = '<button class="btn dis" disabled>已交付</button>';
      const where = B.kind === 'kill' ? (B.enemy === 'wolf' ? '枯骨獸徑・青霧藥林' : '枯骨獸徑') : D.NODES[B.dungeon].name;
      h += '<div class="bcard" style="left:' + x + 'px;top:' + y + 'px"><span class="ic">' + B.g + '</span><span class="bt"><b>' + B.title + '・' + B.reward + '兩</b><span class="sub">' + where + '</span></span>' + btn + '</div>';
    });
    const other = D.BOUNTIES.filter((B) => B.town !== S.loc).map((B) => B.title).join('、');
    h += '<div class="sub" style="position:absolute;left:0;top:170px">他鎮賞金：' + other + '（至' + D.NODES[S.loc === 'huiyao' ? 'duyin' : 'huiyao'].name + '揭榜／交付）</div>';
    return h;
  }

  // ---------- 荒野 ----------
  function sceneWild(S) {
    const W = D.WILDS[S.loc]; const ns = G.nodeState(S.loc);
    let h = '<div class="wildscene" data-testid="wild">';
    h += '<div class="stagehead"><span class="pill">' + D.NODES[S.loc].name + '</span><span class="pill">險 ' + W.risk + '</span></div>';
    h += '<button class="btn" style="position:absolute;right:6px;top:6px;font-weight:700" data-a="toMap" data-testid="btn-leave">離開・地圖</button>';
    W.points.forEach((p) => {
      const n = ns.pts[p.id]; const done = n <= 0;
      h += '<div class="gpt' + (done ? ' done' : '') + '" data-a="gpt" data-v="' + p.id + '" data-testid="gpt-' + p.id + '" style="left:' + (p.x - 22) + 'px;top:' + (p.y - 22) + 'px"></div>';
      h += '<div class="gptl' + (done ? ' done' : '') + '" style="left:' + (p.x - 34) + 'px;top:' + (p.y + 26) + 'px;width:68px;justify-content:center">' + p.label + ' ' + n + '</div>';
    });
    h += '<div class="gpt fire' + (S.fire ? ' lit' : '') + '" data-a="camp" style="left:' + (W.fire.x - 22) + 'px;top:' + (W.fire.y - 22) + 'px"></div><div class="gptl" style="left:' + (W.fire.x - 34) + 'px;top:' + (W.fire.y + 26) + 'px;width:68px;justify-content:center">' + (S.fire ? '營火・燃' : '營火位') + '</div>';
    h += '<div class="sub" style="position:absolute;left:8px;bottom:8px">' + W.scene + (G.isNight(S.t) ? '　夜裡，遇險上升。' : '') + '</div>';
    h += '</div>';
    const cai = G.profLv('cai');
    const herbF = Math.round(4 * (1 - (cai - 1) * 0.06)), oreF = Math.round(10 * (1 - (cai - 1) * 0.06));
    h += '<div class="gbtns">';
    h += '<button class="gbtn" data-a="gather" data-v="herb" data-testid="act-herb"><span class="ic">草</span><span><b>採藥</b><span>1 小時・疲 +' + herbF + '</span></span></button>';
    h += '<button class="gbtn" data-a="gather" data-v="ore" data-testid="act-ore"><span class="ic">礦</span><span><b>挖礦</b><span>2 小時・疲 +' + oreF + '</span></span></button>';
    h += '<button class="gbtn" data-a="gather" data-v="track" data-testid="act-track"><span class="ic">獸</span><span><b>追蹤</b><span>1 小時・入戰</span></span></button>';
    h += '<button class="gbtn hot" data-a="camp" data-testid="act-camp"><span class="ic">火</span><span><b>' + (S.fire ? '露宿' : '紮營') + '</b><span>' + (S.fire ? '8 小時・夜警' : '生火・1 小時') + '</span></span></button>';
    h += '</div>';
    h += '<div class="recipes" data-testid="recipes"><div class="ttl" style="left:8px;top:4px">營火' + (S.fire ? '' : '（未生火：先紮營）') + '　煉藥 ' + G.profLv('yao') + '</div>' + recipeCards(S, 6, 24) + '</div>';
    h += '<div class="logbox" style="top:642px;height:60px" data-testid="log">' + logLines(S, 3) + '</div>';
    return h;
  }

  // ---------- 地城 ----------
  function sceneDungeon(S) {
    const DG = D.DUNGEONS[S.loc]; const st = S.dungeon;
    const cleared = st.clearedDay === G.dayOf(S.t);
    let h = '<div class="dgscene" data-testid="dungeon">';
    h += '<div class="stagehead"><span class="pill">' + D.NODES[S.loc].name + '</span><span class="pill">險 ' + DG.risk + '</span></div>';
    h += '<div class="sub" style="position:absolute;left:140px;top:80px;font-size:13px;color:#555">' + DG.scene + '</div>';
    h += '<div class="floors">';
    DG.floors.forEach((f, i) => {
      const cls = cleared || i < st.floor ? ' done' : i === st.floor ? ' cur' : '';
      h += '<div class="floor' + cls + '"><b>' + DG.floorNames[i] + (i === DG.floors.length - 1 ? '・首領' : '') + '</b>' + f.map((e) => '<div class="fe">' + D.ENEMIES[e].g + '　' + D.ENEMIES[e].name + '</div>').join('') + '<div class="sub" style="position:absolute;left:10px;bottom:8px">' + (cleared || i < st.floor ? '已清' : i === st.floor ? '下一層' : '未探') + '</div></div>';
    });
    h += '</div>';
    h += '<div class="sub" style="position:absolute;left:140px;top:310px">掉落：' + (S.loc === 'guyao' ? '凡品／良品裝備、基礎殘卷' : '稀有／傳奇試做裝、玄石、殘卷') + '</div>';
    h += '</div><div class="dgact">';
    if (cleared) h += '<button class="btn dis" disabled>今日已清空</button>';
    else h += '<button class="btn dark" data-a="delve" data-testid="btn-delve">深入' + DG.floorNames[st.floor] + '（1 小時）</button>';
    h += '<button class="btn" data-a="toMap" data-testid="btn-leave">離開・地圖</button><span class="sub">層與層之間可從左欄喝藥、吃糧。</span></div>';
    h += '<div class="logbox" style="top:542px;height:160px" data-testid="log">' + logLines(S, 9) + '</div>';
    return h;
  }

  // ---------- 戰鬥 ----------
  function intentHtml(e) {
    const it = e.intent; if (!it) return '';
    if (it.k === 'atk') return '<div class="intent">⚔ 攻擊 ' + it.range[0] + '–' + it.range[1] + '</div>';
    if (it.k === 'heavy') return '<div class="intent heavy">✕ 重擊 ' + it.range[0] + '–' + it.range[1] + '</div>';
    if (it.k === 'bleed') return '<div class="intent">流血 ' + it.range[0] + '–' + it.range[1] + '</div>';
    if (it.k === 'charge') return '<div class="intent">蓄力：將重擊</div>';
    return '<div class="intent guard">◆ 防禦 +6</div>';
  }
  function sceneCombat(S) {
    const c = S.combat;
    const ctx = c.ctx; const N = D.NODES[ctx.node];
    const where = ctx.type === 'dungeon' ? N.name + '・' + D.DUNGEONS[ctx.node].floorNames[ctx.floor] : ctx.type === 'hunt' ? N.name + '・狩獵' : ctx.type === 'event' ? '旅途遇襲' : N.name + '・遇襲';
    let h = '<div class="cstage" data-testid="combat">';
    h += '<div class="chead"><span class="pill" style="left:0;top:0">' + where + '</span>';
    h += '<div class="order" data-testid="order"><span class="sub">順序</span>' + G.combatOrder().map((o) => o.who === 'you' ? '<span class="o you">你</span>' : '<span class="o">' + c.enemies[o.who].g + '</span>').join('') + '</div>';
    h += '<span class="pill" style="right:0;top:0;left:auto" data-testid="round">第 ' + c.round + ' 回合</span></div>';
    const n = c.enemies.length;
    c.enemies.forEach((e, i) => {
      const x = n === 1 ? 298 : i === 0 ? 150 : 446;
      const dead = e.hp <= 0;
      h += '<div class="enemy' + (dead ? ' dead' : '') + (i === c.target && !dead ? ' tgt' : '') + '" data-a="target" data-v="' + i + '" data-testid="enemy-' + i + '" style="left:' + x + 'px">';
      h += '<div class="ename">' + e.name + '</div><div class="ehp"><i style="width:' + (Math.max(0, e.hp / e.max) * 100).toFixed(1) + '%"></i></div><div class="ehpn">' + Math.max(0, e.hp) + '/' + e.max + '</div>';
      if (!dead) h += '<div data-testid="intent-' + i + '">' + intentHtml(e) + '</div>';
      h += '<div class="body">' + e.g + '</div>';
      if (c.flash && c.flash.i === i) h += '<div class="dmgf">−' + c.flash.d + '</div>';
      h += '</div>';
    });
    h += '</div>';
    // 棄物撤退確認條（點了才展開）
    if (c.retreatOpen) {
      const dw = G.selWt(); const p0 = G.retreatChance(0), p1 = G.retreatChance(dw);
      const m0 = G.loadBand().mult, m1 = G.loadBand(G.totalWt() - dw).mult;
      h += '<div class="rbar" data-testid="retreat-bar"><span class="rt">棄物撤退</span><div class="ritems">';
      S.pack.forEach((it, i) => { if (!it) return; h += '<div class="cell' + (S.retreatSel.includes(i) ? ' drop' : '') + '" data-a="toggleDrop" data-v="' + i + '" data-testid="drop-' + i + '">' + G.itemGlyph(it) + (it.k !== 'eq' ? '<span class="n">' + it.n + '</span>' : '') + '</div>'; });
      h += '</div><div class="rp"><b data-testid="retreat-rate">撤退率 ' + Math.round(p0 * 100) + '% → ' + Math.round(p1 * 100) + '%</b><span>負重 ×' + m0.toFixed(2) + ' → ×' + m1.toFixed(2) + '・丟下的落在地面</span></div>';
      h += '<button class="btn redb" data-a="retreatGo" data-testid="btn-retreat-confirm">確認撤退</button><button class="btn" data-a="retreatClose">取消</button></div>';
    } else {
      h += '<div class="sub" style="position:absolute;left:10px;top:516px">紅框＝重擊意圖，可防禦或先喝藥；點敵人切換目標；按「撤」展開棄物撤退。</div>';
    }
    const pots = G.countItem('pot_hp');
    const hasBeng = S.skills.includes('beng');
    h += '<div class="abar">';
    h += '<button class="act" data-a="cact" data-v="attack" data-testid="act-attack"><span class="k">1</span><b>攻</b><span>普攻</span></button>';
    h += '<button class="act" data-a="cact" data-v="skill" data-testid="act-skill" ' + (!hasBeng || c.cd > 0 ? 'disabled' : '') + '><span class="k">2</span>' + (c.cd > 0 ? '<span class="c">' + c.cd + '</span>' : '') + '<b>崩</b><span>' + (hasBeng ? '崩岩擊' : '未習得') + '</span></button>';
    h += '<button class="act" data-a="cact" data-v="potion" data-testid="act-potion" ' + (pots ? '' : 'disabled') + '><span class="k">3</span><span class="c">×' + pots + '</span><b>藥</b><span>金創</span></button>';
    h += '<button class="act" data-a="cact" data-v="defend" data-testid="act-defend"><span class="k">4</span><b>防</b><span>防禦</span></button>';
    h += '<button class="act" data-a="cact" data-v="wait" data-testid="act-wait"><span class="k">5</span><b>等</b><span>待機</span></button>';
    h += '<button class="act retreat" data-a="retreatOpen" data-testid="act-retreat"><span class="k">R</span><b>撤</b><span>棄物撤退</span></button>';
    h += '</div>';
    h += '<div class="logbox" style="top:610px;height:92px" data-testid="log">' + logLines(S, 5) + '</div>';
    return h;
  }
  function sceneLoot(S) {
    const L = S.loot;
    let h = '<div class="panel" style="left:198px;top:120px;width:400px" data-testid="loot"><h2>' + L.title + '</h2>';
    if (L.silver) h += '<div class="pl">銀兩 +' + L.silver + '</div>';
    L.items.forEach((t) => (h += '<div class="pl">■ ' + esc(t) + '</div>'));
    if (!L.items.length && !L.silver) h += '<div class="pl sub">一無所獲。</div>';
    if (L.grounded) h += '<div class="pl red">行囊放不下，部分落在左欄「地面」。</div>';
    h += '<button class="btn dark" style="margin-top:14px;width:120px;height:36px" data-a="lootDone" data-testid="btn-loot-done">繼續</button></div>';
    h += '<div class="logbox" style="top:610px;height:92px" data-testid="log">' + logLines(S, 5) + '</div>';
    return h;
  }
  function sceneEvent(S) {
    const ev = S.event; const E = D.EVENTS.find((x) => x.id === ev.id);
    let h = '<div class="panel" style="left:168px;top:110px;width:460px" data-testid="event"><div class="sub">旅途事件・往' + D.NODES[ev.dest].name + '</div><h2>' + E.title + '</h2><div class="pl">' + E.text + '</div>';
    if (!ev.result) E.opts.forEach((o) => (h += '<button class="evopt" data-a="evopt" data-v="' + o.k + '" data-testid="ev-' + o.k + '">' + o.label + '<span>' + o.note + '</span></button>'));
    else h += '<div class="pl" style="margin-top:10px;font-weight:700">' + esc(ev.result) + '</div><button class="btn dark" style="margin-top:12px;width:120px;height:36px" data-a="evdone" data-testid="btn-ev-done">繼續上路</button>';
    h += '</div><div class="logbox" style="top:610px;height:92px" data-testid="log">' + logLines(S, 5) + '</div>';
    return h;
  }
  function sceneDead(S) {
    const d = S.dead;
    const quote = d.kills > 5 ? '刀下亡魂不少，終究也成了荒野一縷。' : d.gathers > 6 ? '識得百草，卻沒能醫好自己。' : '山海路遠，此生只走到這裡。';
    let h = '<div class="epitaph" data-testid="epitaph"><div class="sub">墓誌銘</div><h1>沈衡之墓</h1><div class="ep-sub">卒於' + d.when + '・' + d.where + '</div>';
    h += '<div class="ep-line">死因：<b>' + esc(d.cause) + '</b></div>';
    h += '<div class="ep-line">行走 ' + d.hours + ' 小時，歷 ' + d.days + ' 日</div>';
    h += '<div class="ep-line">擊殺 ' + d.kills + '・採集 ' + d.gathers + '・製作 ' + d.crafts + '・賞金 ' + d.bounties + '</div>';
    h += '<div class="ep-line">熟練：' + d.profs + '</div>';
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
    } else if (S.overlay === 'help') {
      h += '<h2>說明（灰盒 v0.1）</h2>';
      ['左欄：10 部位人形裝備＋背包槽（馬車槽預留鎖定）、行囊 ICON 格、地面暫放格、近處小圖、負重條。滑過看提示卡；點裝備＝卸下；點行囊＝使用／裝備。',
        '中欄：地圖點節點→出發條預告耗時、飽食、疲累、遇險與負重倍率→「前往」。城鎮有市集／客棧（含藥爐）／賞金；荒野可採藥、挖礦、追蹤、紮營與營火 3 配方；地城分 3 層。',
        '戰鬥：第一人稱，只畫敵人；頭頂有血條與意圖（紅框＝重擊）。鍵盤 1–5 行動、R 棄物撤退：勾選要丟的貨物可大幅提高撤退率。',
        '右欄：24 小時制時間、命／食／疲、5 類行為熟練度（無等級系統）、已習技能、追蹤賞金。',
        '負重：≤40% 輕裝、41–75% 常態重負（×0.82）、76–100% 超載（×0.60）。',
        '永久死亡：死亡即刪檔並留下墓誌銘，可一鍵重開。存檔底層已預留城鎮檢查點模式。',
      ].forEach((t) => (h += '<p>' + t + '</p>'));
    } else {
      h += '<h2>選單</h2><p>存檔模式：<b>純永久死亡</b>（城鎮檢查點模式為架構預留，MVP 不開放）</p><p>存檔位置：瀏覽器 localStorage「' + G.SAVE_KEY + '」，每次行動自動存檔。</p>';
      h += '<button class="btn" data-a="restartAsk" data-testid="btn-abandon" style="margin-top:12px">放棄此生並重開</button>';
    }
    return h + '</div>';
  }

  // ======================= 互動 =======================
  function render(S) { renderLeft(S); renderCenter(S); renderRight(S); }
  G.on(render);

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]'); if (!el || el.disabled) return;
    const a = el.getAttribute('data-a'); const v = el.getAttribute('data-v');
    const S = G.state;
    hideTip();
    switch (a) {
      case 'unequip': return G.unequip(v);
      case 'pack': return G.clickPack(+v);
      case 'pickup': return G.pickupGround(+v);
      case 'toggleDrop': return G.toggleDrop(+v);
      case 'dest': return G.selectDest(v);
      case 'travel': return G.travel();
      case 'enterHere': return G.enterHere();
      case 'toMap': return G.toMap();
      case 'tab': return G.setTab(v);
      case 'shop': return G.selectShop(+v);
      case 'qty': return G.setQty(+v);
      case 'buy': return G.buy();
      case 'sell': return G.sell();
      case 'innRest': return G.innRest();
      case 'innSoup': return G.innSoup();
      case 'bounty': return G.claimBounty(v);
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
    if (!el) { box.style.display = 'none'; return; }
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

  // 啟動：?seed=數字 固定亂數；?fresh=1 強制新局
  const q = new URLSearchParams(location.search);
  const seed = q.has('seed') ? parseInt(q.get('seed'), 10) : undefined;
  G.init({ seed, fresh: q.get('fresh') === '1' });
})();
