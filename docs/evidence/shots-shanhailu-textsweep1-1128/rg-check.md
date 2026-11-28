# textsweep1 rg 檢查（範圍 js/ css/ index.html tests/；e2e-dev05.js:282 註解改「高」前產生，該行為唯一差異）

## 全文搜尋列
- 1.3「PACE」：6 處 js/data.js:1 tests/e2e-dev05.js:3 js/game.js:2 
- 1.5「移動速度」：0 處 
- 1.14「灰鬣」：0 處 
- 1.14「灰鬃」：0 處 
- 1.31/2.25「血霧宗」：0 處 
- 1.31/2.25「血霧丹」：0 處 
- 2.5「出身」：10 處 css/style.css:2 tests/e2e.js:3 js/data.js:1 js/ui.js:3 js/game.js:1 
- 2.13「無名成人平民」：0 處 
- 2.14「駐軍」：24 處 js/data.js:6 js/game.js:6 tests/e2e-dev05.js:8 tests/e2e.js:1 tests/e2e-dev04.js:1 tests/e2e-dev02.js:2 
- 2.15「傀母殃婆」：0 處 
- 2.16「青娘」：0 處 
- 2.17「祠婆」：0 處 
- 2.18「烏婆」：0 處 
- 2.19「沼蠱婆」：0 處 
- 2.20「沼蠱婆草棚」：0 處 
- 2.21「煞星」：0 處 
- 2.23「怪化」：0 處 
- 2.23「十二祭」：0 處 

## 替換後檢查
- 「血霧」：
- 「鎮公所」：
- 「上香」：
- 「中高」：tests/e2e.js:1 tests/e2e-dev02.js:6 tests/e2e-dev05.js:6 js/game.js:2 
- 「赤鴉」：js/data.js:1 js/icons_npc.js:1 
- 「老闆娘」：
- 「溫姑」：js/data.js:1 js/icons_npc.js:1 
- 「灰髯狼」：js/data.js:3 js/game.js:1 tests/e2e.js:2 tests/e2e-dev05.js:3 
- 「腳力」：js/data.js:3 js/game.js:2 tests/e2e-dev01b.js:3 
- 「傳令兵」：js/data.js:1 
- 「客官」：js/data.js:1 js/lore.js:4 tests/e2e.js:4 js/game.js:1 tests/e2e-dev01b.js:1 
- 「鴉衛」：tests/e2e.js:3 js/icons_more.js:1 tests/e2e-dev01b.js:2 js/game.js:2 js/ui.js:3 js/data.js:4 js/lore.js:3 
- 「鴉影」：js/icons_more.js:1 js/data.js:2 js/ui.js:1 js/game.js:2 
- 「紅霧」：js/icons_more.js:1 js/scenes_map.js:1 js/data.js:6 js/lore.js:3 js/scenes_town.js:1 js/game.js:2 js/ui.js:5 tests/e2e.js:3 tests/e2e-dev01b.js:1 
- 「鎮衙」：js/data.js:3 js/scenes_town.js:1 tests/e2e.js:1 js/game.js:2 js/ui.js:2 tests/e2e-dev01b.js:1 
- 「祭祀」：js/data.js:1 tests/e2e.js:1 tests/e2e-dev01b.js:1 js/game.js:1 js/ui.js:2 
- 「鴉首」：js/data.js:3 tests/e2e.js:3 js/lore.js:1 tests/e2e-dev01b.js:1 js/ui.js:1 js/game.js:6 
- 「破曉醫官」：js/data.js:1 js/lore.js:2 js/game.js:1 

## 剩餘「赤鴉」「中高」「溫姑」逐行
js/data.js:363:    np_wen: { name: '溫姑', title: '破曉醫官', codex: ['c_mist'] }, np_xiaoman: { name: '小滿', title: '傳令兵' },
js/data.js:365:    np_bone: { name: '撿骨師', title: '', codex: ['c_bonepicker'] }, np_chiya: { name: '赤鴉', title: '鴉首', codex: ['c_crow', 'c_chiya']
tests/e2e.js:354:  check('#4 原本的路口（官道驛站）現在可以當目的地', (await st(page)).dest === 'yizhan' && /路程 \d+ 小時・飽食 −\d
tests/e2e-dev02.js:462:  // ===== U. fix4：「中高」改「高」（數值 18:14 裁定、SPEC-TIME AC 21）；route() 第三、四層 tie-break =====
tests/e2e-dev02.js:466:    check('[AC 21] 資料 WILDS／DUNGEONS／NODES／TIME 不含「中高」', !ids.data.includes('中高'));
tests/e2e-dev02.js:473:    const bad = Object.keys(seen).filter((k) => seen[k].body.includes('中高'));
tests/e2e-dev02.js:474:    check('[AC 21] 逐一進入全部荒野 ' + ids.wilds.length + ' 處、地城 ' + ids.dgs.length + ' 處，畫面不出現「中高�
tests/e2e-dev02.js:475:    check('[AC 21] 原「中高」的腐骨沼（荒野）、沉淵祭窟（地城）現顯示「險 高」', seen.fuzhao.pill === '險 �
tests/e2e-dev02.js:496:    check('[AC 21] 日誌（含趕路、露宿、進地城共 ' + lg.n + ' 行）與日誌畫面不出現「中高」', lg.n > 0 && !lg.t
js/icons_npc.js:461:  // 溫姑 — camp medic, white headscarf, calm
js/icons_npc.js:601:  // 赤鴉 — crow-guard huntress, feather cloak, beak half-mask, corroded arm
tests/e2e-dev05.js:282:    // 造齊四種單：長期獵殺（起手固定單）、有期限獵殺（腐骨沼＝中高）、收集（無險級）、送貨（�
tests/e2e-dev05.js:298:  check('有期限獵殺（腐骨沼，地點級高）：「危險 高」紅框＋「逾期則撕榜」（畫面不出現「中高」）'
tests/e2e-dev05.js:451:    // 地點舊稱「中高」：顯示層對應為「高」
tests/e2e-dev05.js:452:    const old = D.WILDS.fuzhao.risk; D.WILDS.fuzhao.risk = '中高';
tests/e2e-dev05.js:466:  check('地點險級舊稱「中高」在委託單顯示為「高」（max(路程中, 地點高)）', qt.leechOld === '高', qt.leechOld
tests/e2e-dev05.js:470:  check('荒野標頭（腐骨沼）四檔：「險 高」（不顯示「中高」）', fz === '險 高', fz);
js/game.js:816:  // 地點險級 siteTier（7.1b）：舊稱「中高」在畫面一律顯示「高」
js/game.js:817:  function siteTier(r) { return r === '中高' ? '高' : r; }
