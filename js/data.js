/* 《山海錄》灰盒 v0.25 — 靜態資料表
 * 依據：docs/design/GDD-v0.25.md（增修）、GDD-v0.2.md、UIUX-v2-README.md
 * 所有數值皆為「15 分鐘可玩灰盒初版平衡」，待數值設計定案。
 */
'use strict';

window.SHL_DATA = (function () {
  // ---------- 堆疊物品（素材／消耗品／貨物／殘卷） ----------
  // ic＝像素 ICON id（js/icons.js）；dl＝採集難度（熟練度高出太多就不再成長）
  const ITEMS = {
    herb_zx: { name: '止血草', g: '草', wt: 1, stack: 10, type: 'mat', dl: 0, desc: '藥林常見，調配金創藥水。' },
    leaf_qx: { name: '清心葉', g: '葉', wt: 1, stack: 10, type: 'mat', dl: 8, desc: '提神醒腦，調配提神湯藥。' },
    vine_du: { name: '毒藤', g: '藤', wt: 1, stack: 10, type: 'mat', dl: 20, desc: '帶毒的藤蔓，渡陰關藥鋪高價收購。' },
    ore_fe: { name: '粗鐵', g: '鐵', wt: 4, stack: 3, type: 'mat', dl: 0, desc: '粗礦，重而便宜，渡陰關收價較高。' },
    ore_cu: { name: '赤銅', g: '銅', wt: 4, stack: 3, type: 'mat', dl: 15, desc: '赤石廢礦所產，價錢不錯。' },
    ore_xs: { name: '玄石', g: '玄', wt: 5, stack: 3, type: 'mat', dl: 35, desc: '罕見黑石，極重亦極貴。' },
    hide: { name: '獸皮', g: '皮', wt: 3, stack: 5, type: 'mat', desc: '剝自野獸，灰窯鎮收價較高。' },
    hide_fine: { name: '完整獸皮', g: '裘', wt: 3, stack: 5, type: 'mat', desc: '剝皮 50 才剝得出的整張好皮，價錢是散皮的兩倍多。' },
    beast_core: { name: '異獸內丹', g: '丹', wt: 1, stack: 5, type: 'mat', desc: '異獸體內凝成的丹核，渡陰關重金收購。' },
    meat: { name: '生肉', g: '肉', wt: 2, stack: 5, type: 'mat', desc: '營火烤成乾糧。' },
    pot_hp: { name: '金創藥水', g: '創', wt: 1, stack: 5, type: 'use', use: { hp: 30 }, desc: '回復 30 生命（煉藥熟練度加成）。' },
    pot_ft: { name: '提神湯藥', g: '神', wt: 1, stack: 5, type: 'use', use: { fat: -25 }, desc: '疲累 −25。' },
    ration: { name: '烤肉乾糧', g: '乾', wt: 1, stack: 5, type: 'use', use: { food: 35 }, desc: '飽食 +35（烹食熟練度加成）。' },
    bread: { name: '乾餅', g: '糧', wt: 1, stack: 5, type: 'use', use: { food: 20 }, desc: '飽食 +20。' },
    salt: { name: '粗鹽', g: '鹽', wt: 2, stack: 5, type: 'goods', desc: '灰窯鎮特產，渡陰關缺貨（跑商可選）。' },
    pig_iron: { name: '生鐵', g: '錠', wt: 3, stack: 5, type: 'goods', desc: '灰窯鎮特產，渡陰關收價高（跑商可選）。' },
    yam: { name: '山藥', g: '薯', wt: 2, stack: 5, type: 'goods', desc: '渡陰關特產，灰窯鎮收價高（跑商可選）。' },
    smoked: { name: '燻皮', g: '燻', wt: 2, stack: 5, type: 'goods', desc: '渡陰關特產，灰窯鎮收價高（跑商可選）。' },
    parcel: { name: '委託包裹', g: '包', wt: 3, stack: 1, type: 'quest', desc: '送貨委託的包裹。送到指定城鎮的委託板交付。' },
    scroll_beng: { name: '崩岩擊殘卷', g: '卷', ic: 'scroll', wt: 1, stack: 1, type: 'scroll', skill: 'beng', desc: '點擊研讀：習得主動技「崩岩擊」。' },
    scroll_xi: { name: '調息殘卷', g: '卷', ic: 'scroll', wt: 1, stack: 1, type: 'scroll', skill: 'xi', desc: '點擊研讀：習得被動技「調息」。' },
  };

  // ---------- 技能（不靠升級點數；殘卷與探索取得） ----------
  const SKILLS = {
    beng: { name: '崩岩擊', g: '崩', kind: '主', cd: 3, desc: '主動：造成 170% 傷害並無視防禦，冷卻 3 回合。' },
    xi: { name: '調息', g: '息', kind: '被', desc: '被動：戰鬥每回合回復 2 生命；露宿疲累回復 +25%。' },
    jixing: { name: '疾行', g: '疾', kind: '被', desc: '被動：撤退率 +10%，趕路疲累 −10%。' },
  };

  // ---------- 裝備基底（10 部位全開，每部位至少 2 種＋4 種背包，共 30） ----------
  // slot: main/off/head/chest/gloves/boots/amulet/ring/belt/bag
  // wtype: 武器類別＝對應熟練度（dao 刀劍／qiang 長兵／fu 斧錘／gong 弓弩）
  // ac: 防具類別（light 輕甲／heavy 重甲）；req: 素質門檻；shield: 可練盾防
  const BASES = {
    blade_rust: { name: '鏽刃', slot: 'main', g: '刃', ic: 'w_blade', wtype: 'dao', wt: 3, dmg: [4, 7], val: 8 },
    blade_short: { name: '短刃', slot: 'main', g: '刃', ic: 'w_blade', wtype: 'dao', wt: 3, dmg: [5, 8], val: 22 },
    saber: { name: '長刀', slot: 'main', g: '刀', ic: 'w_saber', wtype: 'dao', wt: 5, dmg: [7, 11], val: 40 },
    spear: { name: '長槍', slot: 'main', g: '槍', ic: 'w_spear', wtype: 'qiang', wt: 5, dmg: [6, 10], val: 36 },
    hammer: { name: '鐵鎚', slot: 'main', g: '鎚', ic: 'w_hammer', wtype: 'fu', wt: 6, dmg: [6, 10], req: { li: 11 }, val: 30 },
    axe2h: { name: '開山斧', slot: 'main', g: '斧', ic: 'w_axe', wtype: 'fu', wt: 8, dmg: [10, 16], twoHanded: true, req: { li: 12 }, val: 55 },
    bow: { name: '獵弓', slot: 'main', g: '弓', ic: 'w_bow', wtype: 'gong', wt: 2, dmg: [5, 9], twoHanded: true, req: { shen: 11 }, val: 28 },
    buckler: { name: '木盾', slot: 'off', g: '盾', ic: 'o_shield', shield: true, wt: 4, armor: 5, val: 16 },
    ironshield: { name: '鐵盾', slot: 'off', g: '盾', ic: 'o_ironshield', shield: true, wt: 7, armor: 9, req: { ti: 11 }, val: 34 },
    offblade: { name: '副刃', slot: 'off', g: '匕', ic: 'o_dagger', wt: 2, dmg: [1, 3], val: 20 },
    cap: { name: '布帽', slot: 'head', g: '冠', ic: 'h_cap', ac: 'light', wt: 1, armor: 2, val: 8 },
    hat: { name: '斗笠', slot: 'head', g: '笠', ic: 'h_cap', ac: 'light', wt: 1, armor: 1, val: 6 },
    helm: { name: '鐵盔', slot: 'head', g: '盔', ic: 'h_helm', ac: 'heavy', wt: 4, armor: 6, req: { ti: 11 }, val: 28 },
    robe: { name: '布衣', slot: 'chest', g: '衣', ic: 'c_robe', ac: 'light', wt: 2, armor: 4, val: 6 },
    leather: { name: '皮甲', slot: 'chest', g: '甲', ic: 'c_leather', ac: 'light', wt: 6, armor: 10, val: 30 },
    mail: { name: '鐵甲', slot: 'chest', g: '鎧', ic: 'c_mail', ac: 'heavy', wt: 12, armor: 16, req: { ti: 12 }, val: 60 },
    gloves: { name: '布手套', slot: 'gloves', g: '手', ic: 'g_cloth', ac: 'light', wt: 1, armor: 2, val: 6 },
    gauntlet: { name: '鐵護手', slot: 'gloves', g: '腕', ic: 'g_iron', ac: 'heavy', wt: 3, armor: 4, req: { ti: 11 }, val: 24 },
    boots: { name: '行旅靴', slot: 'boots', g: '靴', ic: 'b_boots', ac: 'light', wt: 2, armor: 3, val: 12 },
    ironboots: { name: '鐵靴', slot: 'boots', g: '靴', ic: 'b_ironboots', ac: 'heavy', wt: 4, armor: 5, req: { ti: 11 }, val: 26 },
    amulet: { name: '骨符', slot: 'amulet', g: '符', ic: 'a_bone', wt: 0, val: 20 },
    jade: { name: '玉珮', slot: 'amulet', g: '珮', ic: 'a_jade', wt: 0, val: 36 },
    ring: { name: '銅戒', slot: 'ring', g: '戒', ic: 'r_copper', wt: 0, val: 18 },
    ring_jade: { name: '玉戒', slot: 'ring', g: '戒', ic: 'r_jade', wt: 0, val: 30 },
    belt: { name: '皮腰帶', slot: 'belt', g: '帶', ic: 'belt', wt: 1, cap: 5, val: 10 },
    belt_wide: { name: '寬腰帶', slot: 'belt', g: '帶', ic: 'belt_wide', wt: 2, cap: 10, val: 24 },
    bag_cloth: { name: '粗布小包', slot: 'bag', g: '囊', ic: 'bag', wt: 1, bag: 6, val: 10 },
    bag_travel: { name: '行旅皮囊', slot: 'bag', g: '囊', ic: 'bag', wt: 2, bag: 10, val: 48 },
    bag_trade: { name: '商旅背簍', slot: 'bag', g: '簍', ic: 'basket', wt: 3, bag: 16, val: 96 },
    bag_fine: { name: '精工大囊', slot: 'bag', g: '囊', ic: 'bag', wt: 3, bag: 24, val: 180 },
  };

  // ---------- 詞綴：不分前後綴、無 T 階，直接區間直骰；最多 3 條 ----------
  const AFFIXES = {
    hp: { t: '+{v} 最大生命', r: [5, 12] },
    dmg: { t: '+{v} 傷害', r: [1, 4] },
    dmgp: { t: '+{v}% 傷害', r: [6, 16] },
    acc: { t: '+{v} 命中', r: [3, 8] },
    armor: { t: '+{v} 護甲', r: [2, 6] },
    bleedres: { t: '+{v}% 流血抗性', r: [8, 20] },
    fatred: { t: '疲累累積 −{v}%', r: [4, 8] },
    spd: { t: '+{v}% 行動速度', r: [3, 8] },
    cap: { t: '+{v} 負重上限', r: [4, 10] },
    gather: { t: '+{v}% 採集收成', r: [10, 25] },
    skin: { t: '+{v}% 剝皮收成', r: [10, 25] },
    a_ti: { t: '+{v} 體魄', r: [1, 2] },
    a_li: { t: '+{v} 膂力', r: [1, 2] },
    a_shen: { t: '+{v} 身法', r: [1, 2] },
    a_ling: { t: '+{v} 靈覺', r: [1, 2] },
  };
  // 傳奇專屬機制詞條
  const UNIQUES = {
    crit_heavy: '對重擊意圖敵人首擊必暴',
    kill_heal: '擊殺敵人回復 8 生命',
    sure_retreat: '撤退率 +25%',
  };
  const LEGENDS = {
    main: { name: '鎮淵古刃', unique: 'crit_heavy' },
    chest: { name: '沉淵鱗甲', unique: 'kill_heal' },
    amulet: { name: '山海骨符', unique: 'sure_retreat' },
  };
  const RARITY = {
    white: { name: '凡品', affix: [0, 0], mult: 1 },
    blue: { name: '良品', affix: [1, 2], mult: 1.6 },
    rare: { name: '稀有', affix: [2, 3], mult: 2.6 },
    legend: { name: '傳奇', affix: [2, 3], mult: 4 },
  };

  // ---------- 敵人與意圖 ----------
  // 意圖：atk 攻擊、heavy 重擊、bleed 流血、charge 蓄力（下回合必重擊）、guard 防禦
  // lv＝難度（決定武藝／追蹤熟練度能不能再成長）
  const ENEMIES = {
    wolf: { name: '灰髯狼', g: '狼', lv: 5, hp: 22, dmg: [4, 6], spd: 12, armor: 0, beast: true, pat: ['atk', 'bleed', 'atk', 'guard'], skin: [1, 2], meat: [1, 1] },
    boar: { name: '山豬', g: '豬', lv: 15, hp: 30, dmg: [5, 7], heavy: [12, 16], spd: 8, armor: 2, beast: true, pat: ['atk', 'charge', 'guard', 'atk'], skin: [1, 2], meat: [1, 2] },
    bug: { name: '毒蟲', g: '蟲', lv: 0, hp: 12, dmg: [2, 4], spd: 14, armor: 0, beast: true, pat: ['atk', 'bleed'], skin: [0, 0], meat: [0, 0], extra: 'vine_du' },
    redboar: { name: '赤鬃異豬', g: '異', ic: 'boar', lv: 40, hp: 58, dmg: [7, 10], heavy: [16, 21], spd: 10, armor: 3, beast: true, rare: true, pat: ['atk', 'charge', 'bleed', 'atk', 'guard'], skin: [2, 3], meat: [2, 2] },
    bandit: { name: '劫匪', g: '匪', lv: 15, hp: 26, dmg: [5, 8], heavy: [12, 15], spd: 10, armor: 3, pat: ['atk', 'charge', 'guard', 'atk'], silver: [8, 20] },
    corpse: { name: '窯屍', g: '屍', lv: 15, hp: 26, dmg: [4, 7], heavy: [12, 16], spd: 6, armor: 2, pat: ['atk', 'charge', 'atk', 'guard'] },
    corpse_king: { name: '窯屍王', g: '王', lv: 35, hp: 60, dmg: [6, 9], heavy: [16, 22], spd: 7, armor: 4, boss: true, pat: ['atk', 'charge', 'bleed', 'atk', 'guard'] },
    serpent: { name: '沉淵祭蛇', g: '蛇', lv: 35, hp: 40, dmg: [7, 10], spd: 13, armor: 2, pat: ['atk', 'bleed', 'atk', 'guard'] },
    shaman: { name: '祭窟巫祝', g: '巫', lv: 55, hp: 95, dmg: [9, 12], heavy: [22, 28], spd: 9, armor: 5, boss: true, pat: ['atk', 'charge', 'bleed', 'guard', 'atk'] },
    xiao: { name: '山魈', g: '魈', lv: 70, hp: 120, dmg: [10, 14], heavy: [24, 30], spd: 11, armor: 6, boss: true, pat: ['atk', 'charge', 'atk', 'bleed', 'guard'] },
  };

  // ---------- 世界節點（沿用 v2 世界地圖拓撲；座標為中欄 796×560 地圖內） ----------
  const NODES = {
    duyin: { name: '渡陰關', g: '關', ic: 'n_gate', kind: 'town', x: 502, y: 96 },
    road: { name: '安全官道', kind: 'way', x: 490, y: 200 },
    huiyao: { name: '灰窯鎮', g: '鎮', ic: 'n_town', kind: 'town', x: 124, y: 330 },
    trail: { name: '山嶺野徑', kind: 'way', x: 391, y: 330 },
    qingwu: { name: '青霧藥林', g: '林', ic: 'n_forest', kind: 'wild', x: 594, y: 330 },
    guyao: { name: '亂葬古窯', g: '窯', ic: 'n_kiln', kind: 'dungeon', x: 693, y: 232 },
    chishi: { name: '赤石廢礦', g: '礦', ic: 'n_mine', kind: 'wild', x: 391, y: 456 },
    kugu: { name: '枯骨獸徑', g: '獸', ic: 'n_bones', kind: 'wild', x: 594, y: 456 },
    jiku: { name: '沉淵祭窟', g: '窟', ic: 'n_cave', kind: 'dungeon', x: 217, y: 456 },
  };
  // 1 條安全官道＋1 條山嶺野徑；h＝基礎時數；road＝官道（低遇險）
  const EDGES = [
    { a: 'huiyao', b: 'road', h: 2, road: true },
    { a: 'road', b: 'duyin', h: 2, road: true },
    { a: 'huiyao', b: 'trail', h: 1 },
    { a: 'trail', b: 'qingwu', h: 1 },
    { a: 'trail', b: 'chishi', h: 2 },
    { a: 'chishi', b: 'jiku', h: 2 },
    { a: 'qingwu', b: 'kugu', h: 1 },
    { a: 'qingwu', b: 'guyao', h: 2 },
  ];

  // ---------- 3 類荒野採集區 ----------
  const WILDS = {
    qingwu: {
      risk: '低', scene: '青霧瀰漫的藥林，藥叢遍地。',
      points: [
        { id: 'h1', kind: 'herb', item: 'herb_zx', max: 3, x: 120, y: 250, label: '藥叢' },
        { id: 'h2', kind: 'herb', item: 'leaf_qx', max: 3, x: 270, y: 290, label: '清心叢' },
        { id: 'm1', kind: 'ore', item: 'ore_fe', max: 1, x: 495, y: 180, label: '礦脈' },
        { id: 't1', kind: 'track', enemy: 'wolf', max: 1, x: 625, y: 290, label: '獸跡' },
      ],
      fire: { x: 366, y: 320 }, ambush: { on: 'herb', enemy: 'bug', p: 0.12 },
    },
    chishi: {
      risk: '中', scene: '赤紅岩壁的廢棄礦坑，坑道隨時可能崩塌。',
      points: [
        { id: 'm1', kind: 'ore', item: 'ore_fe', max: 3, x: 130, y: 200, label: '鐵脈' },
        { id: 'm2', kind: 'ore', item: 'ore_cu', max: 2, x: 330, y: 150, label: '銅脈' },
        { id: 'm3', kind: 'ore', item: 'ore_xs', max: 1, x: 560, y: 170, label: '玄石' },
        { id: 'h1', kind: 'herb', item: 'herb_zx', max: 1, x: 650, y: 300, label: '藥叢' },
      ],
      fire: { x: 366, y: 320 }, ambush: { on: 'ore', enemy: null, p: 0.10 },
    },
    kugu: {
      risk: '中', scene: '白骨散落的獸徑，獸跡新鮮。',
      points: [
        { id: 't1', kind: 'track', enemy: 'wolf', max: 2, x: 150, y: 200, label: '狼跡' },
        { id: 't2', kind: 'track', enemy: 'boar', max: 1, x: 420, y: 160, label: '豬跡' },
        { id: 't3', kind: 'track', enemy: 'wolf', max: 1, x: 640, y: 230, label: '狼跡' },
        { id: 'h1', kind: 'herb', item: 'leaf_qx', max: 2, x: 250, y: 300, label: '清心叢' },
      ],
      fire: { x: 366, y: 320 }, ambush: { on: 'track', enemy: null, p: 0 },
    },
  };

  // ---------- 2 個地城 ----------
  const DUNGEONS = {
    guyao: {
      risk: '低', scene: '燒窯廢墟改作亂葬崗，窯口飄出屍氣。',
      floors: [['corpse'], ['corpse', 'wolf'], ['corpse_king']],
      floorNames: ['一層', '二層', '窯底'],
      loot: { white: 0.5, blue: 0.45, rare: 0.05 }, silver: [6, 14],
      boss: { scroll: 'scroll_beng', loot: { blue: 0.6, rare: 0.4 }, silver: [20, 30] },
    },
    jiku: {
      risk: '中高', scene: '沉在淵底的古祭窟，潮氣與血腥味混雜。',
      floors: [['serpent'], ['serpent', 'corpse'], ['shaman']],
      floorNames: ['一層', '二層', '祭壇'],
      loot: { blue: 0.5, rare: 0.4, legend: 0.1 }, silver: [16, 30],
      boss: { scroll: 'scroll_xi', loot: { rare: 0.5, legend: 0.5 }, silver: [50, 80], extra: ['ore_xs', 2] },
    },
  };

  // ---------- 2 座城鎮：收購價與貨架 ----------
  const TOWNS = {
    huiyao: {
      desc: '起始礦窯小鎮。',
      buy: { herb_zx: 3, leaf_qx: 3, vine_du: 4, hide: 8, hide_fine: 20, beast_core: 38, meat: 2, ore_fe: 4, ore_cu: 6, ore_xs: 14, salt: 3, pig_iron: 4, yam: 10, smoked: 11, pot_hp: 5, pot_ft: 5, ration: 3, bread: 1 },
      stock: [
        ['bag_travel', 48], ['bag_trade', 96], ['blade_short', 30], ['hammer', 34], ['leather', 34], ['boots', 14], ['buckler', 18],
        ['cap', 9], ['ring', 26, 'blue'], ['gloves', 8], ['belt', 12],
        ['pot_hp', 9, 6], ['bread', 3, 10], ['salt', 4, 8], ['pig_iron', 5, 6],
      ],
    },
    duyin: {
      desc: '邊關集鎮，委託多。',
      buy: { herb_zx: 5, leaf_qx: 4, vine_du: 7, hide: 5, hide_fine: 15, beast_core: 55, meat: 3, ore_fe: 8, ore_cu: 12, ore_xs: 26, salt: 9, pig_iron: 10, yam: 4, smoked: 5, pot_hp: 6, pot_ft: 6, ration: 3, bread: 1 },
      stock: [
        ['bag_travel', 48], ['bag_trade', 96], ['bag_fine', 180], ['saber', 48], ['spear', 42], ['bow', 32], ['helm', 30], ['mail', 64],
        ['ironshield', 38], ['amulet', 44, 'blue'], ['axe2h', 60], ['belt_wide', 28],
        ['pot_hp', 10, 6], ['pot_ft', 12, 4], ['bread', 3, 10], ['yam', 5, 8], ['smoked', 6, 6],
      ],
    },
  };

  // ---------- 委託（城鎮任務板）：固定懸賞＋每日生成 ----------
  // 固定懸賞：開局即接灰髯狼；清窟為長期懸賞（無期限）
  const BOUNTIES = [
    { id: 'b_wolf', town: 'huiyao', g: '狼', title: '灰髯狼 ×3', kind: 'kill', enemy: 'wolf', need: 3, reward: 40, start: true },
    { id: 'b_guyao', town: 'huiyao', g: '窯', title: '古窯清理', kind: 'clear', dungeon: 'guyao', need: 1, reward: 60 },
    { id: 'b_jiku', town: 'duyin', g: '巫', title: '祭窟巫祝', kind: 'clear', dungeon: 'jiku', need: 1, reward: 150 },
  ];
  // 每日生成的委託模板：每城每天補到 3 張
  const QUEST_GEN = {
    perTown: 3,
    collect: { days: 3, pool: [['herb_zx', 4], ['leaf_qx', 3], ['vine_du', 2], ['hide', 3], ['meat', 3], ['ore_fe', 2], ['ore_cu', 2]] },
    kill: { days: 4, pool: [['wolf', 2, 26], ['wolf', 3, 38], ['boar', 1, 22], ['boar', 2, 40], ['bug', 2, 16]] },
    deliver: { days: 2, reward: 24, deposit: 10 },
  };

  // ---------- 傳聞：3 題材 × 5 真相 ----------
  // 真相：true 屬實易取／guard 有人盤踞／strong 強敵鎮守／gone 已被取走／bait 根本是餌
  const RUMOR = {
    cost: 5, max: 3, days: 4, decay: 0.2,
    truth: { true: 30, guard: 25, strong: 15, gone: 15, bait: 15 },
    kinds: {
      cache: { name: '秘寶', nodes: ['guyao', 'jiku', 'chishi', 'kugu'], text: ['聽說{n}一帶有人埋了一口箱子，還沒人去挖。', '有個老卒說，{n}的石縫裡藏著前人的行囊。'] },
      vein: { name: '富脈', nodes: ['chishi', 'qingwu'], text: ['{n}崩出一段新脈，成色極好。', '採藥人說{n}深處長了一片沒人動過的好東西。'] },
      beast: { name: '異獸', nodes: ['kugu', 'qingwu'], text: ['{n}出了一頭赤鬃的異獸，皮毛值大錢。', '獵戶們在傳，{n}有東西把狼群都趕跑了。'] },
    },
    // 探聞 25：聽傳聞時多一句判斷
    hint: {
      true: '說的人神色篤定，細節對得上。',
      guard: '說的人壓低了聲音：「不只我一個知道。」',
      strong: '說的人自己不敢去，講到一半就打住了。',
      gone: '這消息在客棧裡已經傳了好一陣子。',
      bait: '說這話的人眼神閃爍，還一直打量你的行囊。',
    },
    // 追蹤 25：到現場先看痕跡
    trace: {
      true: '四下沒有新的足跡，草葉上的露水還在。',
      guard: '地上有好幾個人的腳印，還有熄掉不久的火堆。',
      strong: '樹幹上有巨大的爪痕，地上的腳印只有一行。',
      gone: '土被翻過，腳印已經乾硬，有人早來過了。',
      bait: '草叢被刻意踩平，兩側有人蹲伏過的痕跡。',
    },
  };

  // ---------- 世界事件：獸潮 ----------
  const TIDE = { first: [3, 4], gap: [5, 7], days: 2, need: 4, reward: 50, potMult: 1.5, hurtDays: 2 };

  // ---------- 營火／藥爐 3 配方 ----------
  const RECIPES = [
    { id: 'r_hp', out: 'pot_hp', g: '創', name: '金創藥水', eff: '命 +30', mat: 'herb_zx', n: 2, where: '營火／藥爐', fireOnly: false, h: 1 },
    { id: 'r_ft', out: 'pot_ft', g: '神', name: '提神湯藥', eff: '疲 −25', mat: 'leaf_qx', n: 2, where: '營火／藥爐', fireOnly: false, h: 1 },
    { id: 'r_ra', out: 'ration', g: '乾', name: '烤肉乾糧', eff: '食 +35', mat: 'meat', n: 1, where: '需 營火', fireOnly: true, h: 1 },
  ];

  // ---------- 旅途事件（野徑） ----------
  const EVENTS = [
    { id: 'herbs', title: '稀有藥叢', text: '崖邊長著一片罕見藥叢，崖下碎石鬆動。',
      opts: [{ k: 'pick', label: '攀崖採摘', note: '採集檢定' }, { k: 'leave', label: '繞過', note: '無代價' }] },
    { id: 'bandit', title: '劫匪攔路', text: '兩旁林中竄出一名劫匪，刀口指著你的行囊。',
      opts: [{ k: 'pay', label: '交出買路錢', note: '銀兩 −15' }, { k: 'talk', label: '開口周旋', note: '說服檢定' }, { k: 'fight', label: '迎戰', note: '入戰' }, { k: 'drop', label: '丟下最重的貨逃跑', note: '失去 1 格' }] },
    { id: 'tracks', title: '異獸蹤跡', text: '泥地上有新鮮的大型獸跡，往林子深處去。',
      opts: [{ k: 'hunt', label: '追蹤', note: '狩獵・入戰' }, { k: 'detour', label: '繞路', note: '耗時 +1 小時' }] },
    { id: 'stele', title: '路旁古碑', text: '半埋土中的古碑，刻著行路人的口訣。',
      opts: [{ k: 'study', label: '參悟', note: '耗時 1 小時・腳力' }, { k: 'leave', label: '離開', note: '無代價' }] },
    { id: 'mine', title: '崩塌古礦', text: '山壁崩開一道舊礦口，隱約可見礦脈。',
      opts: [{ k: 'dig', label: '冒險搜刮', note: '採集檢定' }, { k: 'leave', label: '離開', note: '無代價' }] },
  ];

  // ---------- 素質（7 項，基準 10） ----------
  const ATTRS = [
    { id: 'ti', g: '體', name: '體魄', desc: '生命上限、負重基礎。帶動：負重、重甲、野營。' },
    { id: 'li', g: '膂', name: '膂力', desc: '近戰傷害、重武器門檻。帶動：刀劍、長兵、斧錘、挖礦。' },
    { id: 'shen', g: '身', name: '身法', desc: '出手速度、閃避。帶動：閃躲、輕甲、弓弩、腳力。' },
    { id: 'ling', g: '靈', name: '靈覺', desc: '察覺埋伏、採集時的額外發現。帶動：採藥、追蹤、剝皮。' },
    { id: 'xin', g: '心', name: '心志', desc: '疲累耐受、流血抗性。帶動：盾防、拳腳。' },
    { id: 'wu', g: '悟', name: '悟性', desc: '全體熟練度成長速度。帶動：煉藥、烹食、鑑物。' },
    { id: 'kou', g: '口', name: '口才', desc: '買賣價格。帶動：議價、探聞、說服。' },
  ];

  // ---------- 熟練度（四大類 22 項；0–100；25／50／75 門檻） ----------
  const PROF_GROUPS = [
    { id: 'wu', name: '武藝' }, { id: 'ye', name: '山野' }, { id: 'gong', name: '百工' }, { id: 'xing', name: '行走' },
  ];
  const PROFS = [
    { id: 'dao', grp: 'wu', attr: 'li', name: '刀劍', how: '持刀劍命中', perks: { 25: '流血刀法：命中 20% 使敵流血' } },
    { id: 'qiang', grp: 'wu', attr: 'li', name: '長兵', how: '持槍命中', perks: { 25: '先制：開戰第一回合必先出手' } },
    { id: 'fu', grp: 'wu', attr: 'li', name: '斧錘', how: '持斧錘命中', perks: { 25: '破甲：無視敵方護甲' } },
    { id: 'gong', grp: 'wu', attr: 'shen', name: '弓弩', how: '持弓命中', perks: { 25: '先射：開戰前免費射一箭' } },
    { id: 'quan', grp: 'wu', attr: 'xin', name: '拳腳', how: '空手命中', perks: { 25: '卸力：空手時受傷 −15%' } },
    { id: 'dun', grp: 'wu', attr: 'xin', name: '盾防', how: '持盾防禦', perks: { 25: '反震：防禦時回敬 2–4 傷害' } },
    { id: 'shan', grp: 'wu', attr: 'shen', name: '閃躲', how: '被攻擊', perks: { 25: '撤退率 +8%' } },
    { id: 'qing', grp: 'wu', attr: 'shen', name: '輕甲', how: '穿輕甲受擊', perks: { 25: '輕甲重量減半' } },
    { id: 'zhong', grp: 'wu', attr: 'ti', name: '重甲', how: '穿重甲受擊', perks: { 25: '受重擊再減 15%' } },
    { id: 'cai', grp: 'ye', attr: 'ling', name: '採藥', how: '採藥草', perks: { 25: '辨異草：25% 多得一株毒藤', 50: '40% 一次採雙份', 75: '毒蟲不侵' } },
    { id: 'kuang', grp: 'ye', attr: 'li', name: '挖礦', how: '挖礦', perks: { 25: '落石傷害減半', 50: '35% 多挖一塊' } },
    { id: 'zong', grp: 'ye', attr: 'ling', name: '追蹤', how: '追蹤獸跡', perks: { 25: '辨痕：傳聞現場可先看痕跡', 50: '伏擊：狩獵戰首回合敵人不動' } },
    { id: 'bo', grp: 'ye', attr: 'ling', name: '剝皮', how: '剝皮取肉', perks: { 25: '50% 多剝一張皮', 50: '可剝出完整獸皮', 75: '可取異獸內丹' } },
    { id: 'ying', grp: 'ye', attr: 'ti', name: '野營', how: '生火、露宿', perks: { 25: '夜警機率 −40%', 50: '露宿回復 +25%' } },
    { id: 'yao', grp: 'gong', attr: 'wu', name: '煉藥', how: '製藥', perks: { 25: '30% 省一份材料', 50: '25% 一爐雙產' } },
    { id: 'peng', grp: 'gong', attr: 'wu', name: '烹食', how: '烤乾糧', perks: { 25: '30% 一肉兩糧' } },
    { id: 'jian', grp: 'gong', attr: 'wu', name: '鑑物', how: '鑑定裝備', perks: { 25: '可鑑稀有', 50: '可鑑傳奇' } },
    { id: 'jiao', grp: 'xing', attr: 'shen', name: '腳力', how: '趕路', perks: { 25: '野徑遇險 −20%' } },
    { id: 'fuz', grp: 'xing', attr: 'ti', name: '負重', how: '背重趕路', perks: { 25: '常態重負的速度懲罰減半', 50: '超載懲罰減輕' } },
    { id: 'yi', grp: 'xing', attr: 'kou', name: '議價', how: '買賣', perks: { 25: '委託報酬 +10%' } },
    { id: 'tan', grp: 'xing', attr: 'kou', name: '探聞', how: '打聽傳聞', perks: { 25: '聽傳聞時多一句判斷', 50: '打聽半價' } },
    { id: 'shuo', grp: 'xing', attr: 'kou', name: '說服', how: '事件中開口', perks: { 25: '劫匪買路錢減半' } },
    { id: 'tou', grp: 'xing', attr: 'shen', name: '偷竊', how: '下一版開放', locked: true, perks: {} },
  ];
  const WTYPE_NAMES = { dao: '刀劍', qiang: '長兵', fu: '斧錘', gong: '弓弩' };

  // ---------- 出身 ----------
  const ORIGINS = [
    { id: 'hunter', name: '獵戶', desc: '山裡長大，認得獸跡。', attr: { ling: 12, shen: 11, kou: 8 }, prof: { zong: 20, bo: 16, gong: 12 }, gear: ['bow', 'robe'], silver: 50 },
    { id: 'herbalist', name: '藥童', desc: '跟過藥鋪師傅，識得百草。', attr: { wu: 12, ling: 11, li: 8 }, prof: { cai: 20, yao: 16, jian: 10 }, gear: ['blade_rust', 'robe'], silver: 50, items: [['pot_hp', 2]] },
    { id: 'miner', name: '礦工', desc: '灰窯鎮的苦力，一身蠻力。', attr: { li: 12, ti: 12, kou: 8, wu: 8 }, prof: { kuang: 20, fuz: 16, fu: 12 }, gear: ['hammer', 'robe'], silver: 50 },
    { id: 'deserter', name: '逃兵', desc: '從渡陰關逃下來，只會打仗。', attr: { li: 11, ti: 11, xin: 11, kou: 8, wu: 9 }, prof: { dao: 20, dun: 14, zhong: 10 }, gear: ['blade_short', 'buckler', 'robe'], silver: 25 },
    { id: 'peddler', name: '行商', desc: '挑擔走街，嘴上功夫了得。', attr: { kou: 13, wu: 11, li: 8, ti: 9 }, prof: { yi: 20, jiao: 14, tan: 12 }, gear: ['blade_rust', 'robe'], silver: 110 },
    { id: 'drifter', name: '流民', desc: '什麼都不會，什麼都能學。', attr: {}, prof: {}, gear: ['blade_rust', 'robe'], silver: 60 },
  ];

  const SEASONS = ['春', '夏', '秋', '冬'];
  const YEAR_NAMES = ['元', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  const EQ_SLOTS = ['main', 'off', 'head', 'chest', 'gloves', 'boots', 'amulet', 'ring1', 'ring2', 'belt'];
  const SLOT_NAMES = { main: '主手', off: '副手', head: '頭盔', chest: '胸甲', gloves: '手套', boots: '靴子', amulet: '護身符', ring1: '左戒', ring2: '右戒', belt: '腰帶', bag: '背包', cart: '馬車' };
  const SLOT_GLYPH = { main: '刃', off: '盾', head: '冠', chest: '甲', gloves: '手', boots: '靴', amulet: '符', ring1: '戒', ring2: '戒', belt: '帶', bag: '囊', cart: '車' };

  return { ITEMS, SKILLS, BASES, AFFIXES, UNIQUES, LEGENDS, RARITY, ENEMIES, NODES, EDGES, WILDS, DUNGEONS, TOWNS, BOUNTIES, QUEST_GEN, RUMOR, TIDE, RECIPES, EVENTS, ATTRS, PROFS, PROF_GROUPS, WTYPE_NAMES, ORIGINS, SEASONS, YEAR_NAMES, EQ_SLOTS, SLOT_NAMES, SLOT_GLYPH };
})();
