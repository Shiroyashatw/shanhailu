/* 《山海錄》灰盒 v0.1 — 靜態資料表
 * 依據：docs/design/GDD-v0.2.md、docs/design/UIUX-v2-README.md
 * 所有數值皆為「15 分鐘可玩灰盒初版平衡」，待數值設計定案。
 */
'use strict';

window.SHL_DATA = (function () {
  // ---------- 堆疊物品（素材／消耗品／貨物／殘卷） ----------
  const ITEMS = {
    herb_zx: { name: '止血草', g: '草', wt: 1, stack: 10, type: 'mat', desc: '藥林常見，調配金創藥水。' },
    leaf_qx: { name: '清心葉', g: '葉', wt: 1, stack: 10, type: 'mat', desc: '提神醒腦，調配提神湯藥。' },
    vine_du: { name: '毒藤', g: '藤', wt: 1, stack: 10, type: 'mat', desc: '帶毒的藤蔓，渡陰關藥鋪高價收購。' },
    ore_fe: { name: '粗鐵', g: '鐵', wt: 4, stack: 5, type: 'mat', desc: '粗礦，重而便宜，渡陰關收價較高。' },
    ore_cu: { name: '赤銅', g: '銅', wt: 4, stack: 5, type: 'mat', desc: '赤石廢礦所產，價錢不錯。' },
    ore_xs: { name: '玄石', g: '玄', wt: 5, stack: 5, type: 'mat', desc: '罕見黑石，極重亦極貴。' },
    hide: { name: '獸皮', g: '皮', wt: 3, stack: 5, type: 'mat', desc: '剝自野獸，灰窯鎮收價較高。' },
    meat: { name: '生肉', g: '肉', wt: 2, stack: 5, type: 'mat', desc: '營火烤成乾糧。' },
    pot_hp: { name: '金創藥水', g: '創', wt: 1, stack: 5, type: 'use', use: { hp: 30 }, desc: '回復 30 生命（煉藥熟練度加成）。' },
    pot_ft: { name: '提神湯藥', g: '神', wt: 1, stack: 5, type: 'use', use: { fat: -25 }, desc: '疲累 −25。' },
    ration: { name: '烤肉乾糧', g: '乾', wt: 1, stack: 5, type: 'use', use: { food: 35 }, desc: '飽食 +35。' },
    bread: { name: '乾餅', g: '糧', wt: 1, stack: 5, type: 'use', use: { food: 20 }, desc: '飽食 +20。' },
    salt: { name: '粗鹽', g: '鹽', wt: 2, stack: 5, type: 'goods', desc: '灰窯鎮特產，渡陰關缺貨（跑商可選）。' },
    pig_iron: { name: '生鐵', g: '錠', wt: 3, stack: 5, type: 'goods', desc: '灰窯鎮特產，渡陰關收價高（跑商可選）。' },
    yam: { name: '山藥', g: '薯', wt: 2, stack: 5, type: 'goods', desc: '渡陰關特產，灰窯鎮收價高（跑商可選）。' },
    smoked: { name: '燻皮', g: '燻', wt: 2, stack: 5, type: 'goods', desc: '渡陰關特產，灰窯鎮收價高（跑商可選）。' },
    scroll_beng: { name: '崩岩擊殘卷', g: '卷', wt: 1, stack: 1, type: 'scroll', skill: 'beng', desc: '點擊研讀：習得主動技「崩岩擊」。' },
    scroll_xi: { name: '調息殘卷', g: '卷', wt: 1, stack: 1, type: 'scroll', skill: 'xi', desc: '點擊研讀：習得被動技「調息」。' },
  };

  // ---------- 技能（不靠升級點數；殘卷與探索取得） ----------
  const SKILLS = {
    beng: { name: '崩岩擊', g: '崩', kind: '主', cd: 3, desc: '主動：造成 170% 傷害並無視防禦，冷卻 3 回合。' },
    xi: { name: '調息', g: '息', kind: '被', desc: '被動：戰鬥每回合回復 2 生命；露宿疲累回復 +25%。' },
    jixing: { name: '疾行', g: '疾', kind: '被', desc: '被動：撤退率 +10%，趕路疲累 −10%。' },
  };

  // ---------- 裝備基底（10 部位＋背包槽） ----------
  // slot: main/off/head/chest/gloves/boots/amulet/ring/belt/bag
  const BASES = {
    blade_rust: { name: '鏽刃', slot: 'main', g: '刃', wt: 3, dmg: [4, 7], val: 8 },
    blade_short: { name: '短刃', slot: 'main', g: '刃', wt: 3, dmg: [5, 8], val: 22 },
    saber: { name: '長刀', slot: 'main', g: '刀', wt: 5, dmg: [7, 11], val: 40 },
    axe2h: { name: '開山斧', slot: 'main', g: '斧', wt: 8, dmg: [10, 16], twoHanded: true, val: 55 },
    buckler: { name: '木盾', slot: 'off', g: '盾', wt: 4, armor: 5, val: 16 },
    ironshield: { name: '鐵盾', slot: 'off', g: '盾', wt: 7, armor: 9, val: 34 },
    offblade: { name: '副刃', slot: 'off', g: '匕', wt: 2, dmg: [1, 3], val: 20 },
    cap: { name: '布帽', slot: 'head', g: '冠', wt: 1, armor: 2, val: 8 },
    helm: { name: '鐵盔', slot: 'head', g: '冠', wt: 4, armor: 6, val: 28 },
    robe: { name: '布衣', slot: 'chest', g: '甲', wt: 2, armor: 4, val: 6 },
    leather: { name: '皮甲', slot: 'chest', g: '甲', wt: 6, armor: 10, val: 30 },
    mail: { name: '鐵甲', slot: 'chest', g: '甲', wt: 12, armor: 16, val: 60 },
    gloves: { name: '布手套', slot: 'gloves', g: '手', wt: 1, armor: 2, val: 6 },
    boots: { name: '行旅靴', slot: 'boots', g: '靴', wt: 2, armor: 3, val: 12 },
    amulet: { name: '骨符', slot: 'amulet', g: '符', wt: 0, val: 20 },
    ring: { name: '銅戒', slot: 'ring', g: '戒', wt: 0, val: 18 },
    belt: { name: '皮腰帶', slot: 'belt', g: '帶', wt: 1, cap: 5, val: 10 },
    bag_cloth: { name: '粗布小包', slot: 'bag', g: '囊', wt: 1, bag: 6, val: 10 },
    bag_travel: { name: '行旅皮囊', slot: 'bag', g: '囊', wt: 2, bag: 10, val: 48 },
    bag_trade: { name: '商旅背簍', slot: 'bag', g: '簍', wt: 3, bag: 16, val: 96 },
    bag_fine: { name: '精工大囊', slot: 'bag', g: '囊', wt: 3, bag: 24, val: 180 },
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
  const ENEMIES = {
    wolf: { name: '灰髯狼', g: '狼', hp: 22, dmg: [4, 6], spd: 12, armor: 0, beast: true, pat: ['atk', 'bleed', 'atk', 'guard'], skin: [1, 2], meat: [1, 1] },
    boar: { name: '山豬', g: '豬', hp: 30, dmg: [5, 7], heavy: [12, 16], spd: 8, armor: 2, beast: true, pat: ['atk', 'charge', 'guard', 'atk'], skin: [1, 2], meat: [1, 2] },
    bug: { name: '毒蟲', g: '蟲', hp: 12, dmg: [2, 4], spd: 14, armor: 0, beast: true, pat: ['atk', 'bleed'], skin: [0, 0], meat: [0, 0], extra: 'vine_du' },
    bandit: { name: '劫匪', g: '匪', hp: 26, dmg: [5, 8], heavy: [12, 15], spd: 10, armor: 3, pat: ['atk', 'charge', 'guard', 'atk'], silver: [8, 20] },
    corpse: { name: '窯屍', g: '屍', hp: 26, dmg: [4, 7], heavy: [12, 16], spd: 6, armor: 2, pat: ['atk', 'charge', 'atk', 'guard'] },
    corpse_king: { name: '窯屍王', g: '王', hp: 60, dmg: [6, 9], heavy: [16, 22], spd: 7, armor: 4, boss: true, pat: ['atk', 'charge', 'bleed', 'atk', 'guard'] },
    serpent: { name: '沉淵祭蛇', g: '蛇', hp: 40, dmg: [7, 10], spd: 13, armor: 2, pat: ['atk', 'bleed', 'atk', 'guard'] },
    shaman: { name: '祭窟巫祝', g: '巫', hp: 95, dmg: [9, 12], heavy: [22, 28], spd: 9, armor: 5, boss: true, pat: ['atk', 'charge', 'bleed', 'guard', 'atk'] },
  };

  // ---------- 世界節點（沿用 v2 世界地圖拓撲；座標為中欄 796×560 地圖內） ----------
  const NODES = {
    duyin: { name: '渡陰關', g: '關', kind: 'town', x: 502, y: 96 },
    road: { name: '安全官道', kind: 'way', x: 490, y: 200 },
    huiyao: { name: '灰窯鎮', g: '鎮', kind: 'town', x: 124, y: 330 },
    trail: { name: '山嶺野徑', kind: 'way', x: 391, y: 330 },
    qingwu: { name: '青霧藥林', g: '林', kind: 'wild', x: 594, y: 330 },
    guyao: { name: '亂葬古窯', g: '窯', kind: 'dungeon', x: 693, y: 232 },
    chishi: { name: '赤石廢礦', g: '礦', kind: 'wild', x: 391, y: 456 },
    kugu: { name: '枯骨獸徑', g: '獸', kind: 'wild', x: 594, y: 456 },
    jiku: { name: '沉淵祭窟', g: '窟', kind: 'dungeon', x: 217, y: 456 },
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
      buy: { herb_zx: 3, leaf_qx: 3, vine_du: 4, hide: 8, meat: 2, ore_fe: 4, ore_cu: 6, ore_xs: 14, salt: 3, pig_iron: 4, yam: 10, smoked: 11, pot_hp: 5, pot_ft: 5, ration: 3, bread: 1 },
      stock: [
        ['bag_travel', 48], ['bag_trade', 96], ['blade_short', 30], ['leather', 34], ['boots', 14], ['buckler', 18],
        ['cap', 9], ['ring', 26, 'blue'], ['gloves', 8],
        ['pot_hp', 9, 6], ['bread', 3, 10], ['salt', 4, 8], ['pig_iron', 5, 6],
      ],
    },
    duyin: {
      desc: '邊關集鎮，張貼賞金。',
      buy: { herb_zx: 5, leaf_qx: 4, vine_du: 7, hide: 5, meat: 3, ore_fe: 8, ore_cu: 12, ore_xs: 26, salt: 9, pig_iron: 10, yam: 4, smoked: 5, pot_hp: 6, pot_ft: 6, ration: 3, bread: 1 },
      stock: [
        ['bag_travel', 48], ['bag_trade', 96], ['bag_fine', 180], ['saber', 48], ['helm', 30], ['mail', 64],
        ['ironshield', 38], ['amulet', 44, 'blue'], ['axe2h', 60],
        ['pot_hp', 10, 6], ['pot_ft', 12, 4], ['bread', 3, 10], ['yam', 5, 8], ['smoked', 6, 6],
      ],
    },
  };

  // ---------- 賞金（開局即接灰髯狼） ----------
  const BOUNTIES = [
    { id: 'b_wolf', town: 'huiyao', g: '狼', title: '灰髯狼 ×3', kind: 'kill', enemy: 'wolf', need: 3, reward: 40, start: true },
    { id: 'b_guyao', town: 'huiyao', g: '窯', title: '古窯清理', kind: 'clear', dungeon: 'guyao', need: 1, reward: 60 },
    { id: 'b_boar', town: 'duyin', g: '豬', title: '山豬 ×2', kind: 'kill', enemy: 'boar', need: 2, reward: 35 },
    { id: 'b_jiku', town: 'duyin', g: '巫', title: '祭窟巫祝', kind: 'clear', dungeon: 'jiku', need: 1, reward: 150 },
  ];

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
      opts: [{ k: 'pay', label: '交出 15 兩', note: '銀兩 −15' }, { k: 'fight', label: '迎戰', note: '入戰' }, { k: 'drop', label: '丟下最重的貨逃跑', note: '失去 1 格' }] },
    { id: 'tracks', title: '異獸蹤跡', text: '泥地上有新鮮的大型獸跡，往林子深處去。',
      opts: [{ k: 'hunt', label: '追蹤', note: '狩獵・入戰' }, { k: 'detour', label: '繞路', note: '耗時 +1 小時' }] },
    { id: 'stele', title: '路旁古碑', text: '半埋土中的古碑，刻著行路人的口訣。',
      opts: [{ k: 'study', label: '參悟', note: '耗時 1 小時・行腳' }, { k: 'leave', label: '離開', note: '無代價' }] },
    { id: 'mine', title: '崩塌古礦', text: '山壁崩開一道舊礦口，隱約可見礦脈。',
      opts: [{ k: 'dig', label: '冒險搜刮', note: '採集檢定' }, { k: 'leave', label: '離開', note: '無代價' }] },
  ];

  // 熟練度：無等級系統，行為累積
  const PROFS = [
    { id: 'zhan', g: '戰', name: '戰鬥' },
    { id: 'cai', g: '採', name: '採集' },
    { id: 'lie', g: '獵', name: '狩獵' },
    { id: 'yao', g: '藥', name: '煉藥' },
    { id: 'xing', g: '商', name: '行腳' },
  ];
  const PROF_XP = [0, 3, 7, 12, 18, 26, 36, 48, 62, 80];

  const EQ_SLOTS = ['main', 'off', 'head', 'chest', 'gloves', 'boots', 'amulet', 'ring1', 'ring2', 'belt'];
  const SLOT_NAMES = { main: '主手', off: '副手', head: '頭盔', chest: '胸甲', gloves: '手套', boots: '靴子', amulet: '護身符', ring1: '左戒', ring2: '右戒', belt: '腰帶', bag: '背包', cart: '馬車' };
  const SLOT_GLYPH = { main: '刃', off: '盾', head: '冠', chest: '甲', gloves: '手', boots: '靴', amulet: '符', ring1: '戒', ring2: '戒', belt: '帶', bag: '囊', cart: '車' };

  return { ITEMS, SKILLS, BASES, AFFIXES, UNIQUES, LEGENDS, RARITY, ENEMIES, NODES, EDGES, WILDS, DUNGEONS, TOWNS, BOUNTIES, RECIPES, EVENTS, PROFS, PROF_XP, EQ_SLOTS, SLOT_NAMES, SLOT_GLYPH };
})();
