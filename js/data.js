/* 《山海錄》灰盒 v0.3 — 靜態資料表
 * 依據：docs/design/GDD-v0.3.md
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
    poison_oil: { name: '淬毒油', g: '毒', wt: 1, stack: 5, type: 'use', use: { oil: 1 }, combatOnly: true, desc: '戰鬥中塗在武器上：本場命中有五成機會使敵中毒。' },
    antidote: { name: '解毒丸', g: '解', wt: 1, stack: 5, type: 'use', use: { cure: 1 }, desc: '解除中毒。' },
    tea: { name: '粗茶', g: '茶', wt: 1, stack: 5, type: 'use', use: { fat: -10, food: 5 }, desc: '疲累 −10、飽食 +5。' },
    bog_iron: { name: '沼鐵', g: '沼', wt: 4, stack: 3, type: 'mat', dl: 25, desc: '腐骨沼泥裡的鏽鐵，鐵匠肯出好價。' },
    leech_gland: { name: '蛭腺', g: '腺', wt: 1, stack: 5, type: 'mat', desc: '沼蛭的毒腺，可製解毒丸。' },
    dogtag: { name: '軍牌', g: '牌', wt: 1, stack: 5, type: 'mat', desc: '遠征軍的軍牌。破曉營軍需帳與撿骨師都收。' },
    bone_relic: { name: '神骨碎片', g: '骨', wt: 2, stack: 3, type: 'mat', desc: '嵌在裂口岩壁裡、微微發光的骨頭。撿骨師重金收。' },
    blood_moss: { name: '血苔', g: '苔', wt: 1, stack: 10, type: 'mat', desc: '長在血霧裡的苔，藥鋪收。' },
    incense: { name: '線香', g: '香', wt: 0, stack: 5, type: 'quest', desc: '三炷線香。可以拿去窯神廟。' },
    parcel: { name: '委託包裹', g: '包', wt: 3, stack: 1, type: 'quest', desc: '送貨委託的包裹。送到指定城鎮的委託板交付。' },
    scroll_beng: { name: '崩岩擊殘卷', g: '卷', ic: 'scroll', wt: 1, stack: 1, type: 'scroll', skill: 'beng', desc: '點擊研讀：習得主動技「崩岩擊」。' },
    scroll_xi: { name: '調息殘卷', g: '卷', ic: 'scroll', wt: 1, stack: 1, type: 'scroll', skill: 'xi', desc: '點擊研讀：習得被動技「調息」。' },
  };

  // ---------- 技能（殘卷與勢力傳授；不靠熟練度） ----------
  // active：出現在戰鬥行動列；cost＝增加的疲累；cd＝冷卻回合
  const SKILLS = {
    beng: { name: '崩岩擊', g: '崩', ic: 's_beng', kind: '主', active: true, cost: 5, cd: 3, src: '亂葬古窯首領的殘卷', desc: '170% 傷害，無視防禦。' },
    xi: { name: '調息', g: '息', ic: 's_xi', kind: '被', src: '沉淵祭窟首領的殘卷', desc: '戰鬥每回合回復 2 生命；露宿疲累回復 +25%。' },
    jixing: { name: '疾行', g: '疾', ic: 's_jixing', kind: '被', src: '路旁古碑', desc: '撤退率 +10%，趕路疲累 −10%。' },
    pozhen: { name: '破陣', g: '陣', ic: 's_pozhen', kind: '主', active: true, cost: 6, cd: 5, src: '破曉軍團（聲望 10）', desc: '攻擊全體 90%，打斷所有蓄力。' },
    yaying: { name: '鴉影', g: '鴉', ic: 's_yaying', kind: '主', active: true, cost: 4, cd: 5, src: '鴉衛（聲望 14）', desc: '本回合敵人的攻擊必定落空，本場撤退率 +30%。' },
  };

  // ---------- 招式：靠熟練度解鎖，跟著手上的武器走 ----------
  // prof＝對應熟練度；lv＝門檻；mult＝傷害倍率；其餘旗標見 game.js useTech()
  const TECHS = [
    { id: 't_slash', prof: 'dao', lv: 10, name: '橫斬', g: '斬', cost: 4, cd: 3, mult: 0.7, all: true, desc: '攻擊全體，70% 傷害。' },
    { id: 't_execute', prof: 'dao', lv: 30, name: '奪命', g: '奪', cost: 6, cd: 4, mult: 1.5, vsBleed: 2, desc: '150% 傷害；對流血的敵人 200%。' },
    { id: 't_thrust', prof: 'qiang', lv: 10, name: '突刺', g: '刺', cost: 3, cd: 2, mult: 1.2, pierce: true, desc: '120% 傷害，無視防禦。' },
    { id: 't_sweep', prof: 'qiang', lv: 30, name: '掃腿', g: '掃', cost: 5, cd: 4, mult: 0.8, stagger: true, desc: '80% 傷害，使敵失衡（首領五成抵抗）。' },
    { id: 't_cleave', prof: 'fu', lv: 10, name: '重劈', g: '劈', cost: 5, cd: 3, mult: 1.6, hit: -0.15, desc: '160% 傷害，命中 −15%。' },
    { id: 't_quake', prof: 'fu', lv: 30, name: '震地', g: '震', cost: 6, cd: 4, mult: 0.6, all: true, brk: 3, desc: '攻擊全體 60%，並破甲 3 回合。' },
    { id: 't_aim', prof: 'gong', lv: 10, name: '瞄準', g: '瞄', cost: 3, cd: 2, mult: 1.3, sure: true, crit: 0.2, desc: '130% 傷害，必中，會心 +20%。' },
    { id: 't_volley', prof: 'gong', lv: 30, name: '連珠', g: '連', cost: 5, cd: 3, mult: 0.75, times: 2, desc: '連射兩箭，各 75%。' },
    { id: 't_grapple', prof: 'quan', lv: 10, name: '擒拿', g: '擒', cost: 3, cd: 3, mult: 0.6, stagger: true, sureStagger: true, desc: '60% 傷害，打斷對方這回合的行動。' },
    { id: 't_inner', prof: 'quan', lv: 30, name: '內勁', g: '勁', cost: 6, cd: 4, mult: 1.4, noArmor: true, desc: '140% 傷害，無視護甲。' },
    { id: 't_bash', prof: 'dun', lv: 15, name: '盾擊', g: '盾', cost: 4, cd: 3, shield: true, desc: '以盾的護甲值造成傷害，打斷蓄力。' },
    { id: 't_evade', prof: 'shan', lv: 15, name: '遊身', g: '遊', cost: 3, cd: 4, evade: true, desc: '本回合閃避 +60%，下一擊 +30%。' },
  ];

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
    spd: { t: '+{v}% 腳程', r: [3, 8] },
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
    leech: { name: '沼蛭', g: '蛭', lv: 20, hp: 24, dmg: [3, 5], spd: 9, armor: 0, beast: true, pat: ['drain', 'poison', 'atk'], skin: [0, 0], meat: [0, 0], extra: 'leech_gland' },
    bogcorpse: { name: '沼屍', g: '沼', lv: 30, hp: 42, dmg: [6, 9], heavy: [14, 18], spd: 5, armor: 3, pat: ['atk', 'poison', 'charge', 'atk'] },
    deserter: { name: '逃兵', g: '逃', lv: 20, hp: 30, dmg: [5, 8], heavy: [12, 16], spd: 10, armor: 4, pat: ['atk', 'guard', 'charge', 'atk'], silver: [6, 16], drop: ['dogtag', 0.4] },
    wraith: { name: '血霧妖', g: '霧', lv: 45, hp: 34, dmg: [7, 10], spd: 13, armor: 0, pat: ['corrupt', 'atk', 'bleed'] },
    soldier_dead: { name: '遠征亡卒', g: '卒', lv: 50, hp: 50, dmg: [8, 11], heavy: [18, 24], spd: 8, armor: 6, pat: ['atk', 'guard', 'charge', 'atk'], drop: ['dogtag', 0.6] },
    rooster: { name: '酉神殘影', g: '酉', lv: 80, hp: 160, dmg: [11, 15], heavy: [26, 34], spd: 12, armor: 5, boss: true, pat: ['atk', 'corrupt', 'charge', 'bleed', 'atk', 'guard'] },
    golem: { name: '守墓俑', g: '俑', lv: 40, hp: 55, dmg: [6, 9], heavy: [16, 20], spd: 5, armor: 9, pat: ['guard', 'atk', 'charge', 'atk'] },
    tomblord: { name: '墓主', g: '墓', lv: 60, hp: 100, dmg: [9, 12], heavy: [20, 26], spd: 8, armor: 6, boss: true, pat: ['atk', 'drain', 'charge', 'bleed', 'guard'] },
    xiao: { name: '山魈', g: '魈', lv: 70, hp: 120, dmg: [10, 14], heavy: [24, 30], spd: 11, armor: 6, boss: true, pat: ['atk', 'charge', 'atk', 'bleed', 'guard'] },
  };

  // ---------- 世界節點：西山東麓・灰窯原（座標為中欄 796×560 區域圖內） ----------
  // kind: town 城鎮／驛站（平面圖＋建築）、wild 荒野、dungeon 地城；hidden＝要探查才會出現
  const NODES = {
    huiyao: { name: '灰窯鎮', g: '鎮', ic: 'n_town', kind: 'town', x: 678, y: 330 },
    yizhan: { name: '官道驛站', g: '驛', ic: 'n_station', kind: 'town', x: 496, y: 205 },
    duyin: { name: '渡陰關', g: '關', ic: 'n_gate', kind: 'town', x: 316, y: 92 },
    poxiao: { name: '破曉營', g: '營', ic: 'n_camp', kind: 'town', x: 106, y: 100 },
    chakou: { name: '野徑岔口', g: '岔', ic: 'n_cross', kind: 'wild', x: 478, y: 350 },
    qingwu: { name: '青霧藥林', g: '林', ic: 'n_forest', kind: 'wild', x: 291, y: 300 },
    guyao: { name: '亂葬古窯', g: '窯', ic: 'n_kiln', kind: 'dungeon', x: 106, y: 228 },
    kugu: { name: '枯骨獸徑', g: '獸', ic: 'n_bones', kind: 'wild', x: 186, y: 400 },
    chishi: { name: '赤石廢礦', g: '礦', ic: 'n_mine', kind: 'wild', x: 396, y: 480 },
    fuzhao: { name: '腐骨沼', g: '沼', ic: 'n_swamp', kind: 'wild', x: 581, y: 470 },
    jiku: { name: '沉淵祭窟', g: '窟', ic: 'n_cave', kind: 'dungeon', x: 726, y: 455 },
    shigu: { name: '撿骨師營地', g: '骨', ic: 'n_bonecamp', kind: 'town', x: 176, y: 500 },
    liekou: { name: '酉神裂口', g: '裂', ic: 'n_rift', kind: 'dungeon', x: 61, y: 470 },
    yachao: { name: '鴉巢', g: '鴉', ic: 'n_crow', kind: 'town', x: 581, y: 245, hidden: true },
    guzhong: { name: '無名古塚', g: '塚', ic: 'n_tomb', kind: 'dungeon', x: 496, y: 512, hidden: true },
  };
  // h＝基礎時數；road＝官道（低遇險）
  const EDGES = [
    { a: 'huiyao', b: 'yizhan', h: 2, road: true },
    { a: 'yizhan', b: 'duyin', h: 2, road: true },
    { a: 'duyin', b: 'poxiao', h: 2, road: true },
    { a: 'huiyao', b: 'chakou', h: 1 },
    { a: 'yizhan', b: 'chakou', h: 1 },
    { a: 'chakou', b: 'qingwu', h: 1 },
    { a: 'chakou', b: 'chishi', h: 2 },
    { a: 'qingwu', b: 'guyao', h: 2 },
    { a: 'qingwu', b: 'kugu', h: 1 },
    { a: 'poxiao', b: 'guyao', h: 2 },
    { a: 'chishi', b: 'kugu', h: 2 },
    { a: 'chishi', b: 'fuzhao', h: 2 },
    { a: 'huiyao', b: 'fuzhao', h: 2 },
    { a: 'fuzhao', b: 'jiku', h: 1 },
    { a: 'kugu', b: 'shigu', h: 1 },
    { a: 'shigu', b: 'liekou', h: 1 },
    { a: 'chakou', b: 'yachao', h: 1 },
    { a: 'fuzhao', b: 'guzhong', h: 1 },
  ];
  // 區域圖上的淡色地名
  const REGION_LABELS = [['灰窯原', 640, 250], ['青霧山', 250, 372], ['腐骨沼', 610, 512], ['血霧', 40, 420]];

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

  WILDS.fuzhao = {
    risk: '高', scene: '退水的沼地，黑水底下全是骨頭。',
    points: [
      { id: 'h1', kind: 'herb', item: 'vine_du', max: 2, x: 150, y: 230, label: '毒藤' },
      { id: 'm1', kind: 'ore', item: 'bog_iron', max: 2, x: 330, y: 270, label: '沼鐵' },
      { id: 't1', kind: 'track', enemy: 'leech', max: 2, x: 520, y: 210, label: '蛭跡' },
      { id: 't2', kind: 'track', enemy: 'bogcorpse', max: 1, x: 640, y: 290, label: '屍跡' },
    ],
    fire: { x: 366, y: 320 }, ambush: { on: 'herb', enemy: 'leech', p: 0.2 },
  };
  WILDS.chakou = {
    risk: '低', scene: '野徑在這裡分成三條，路牌上的字早就磨平了。',
    points: [
      { id: 'h1', kind: 'herb', item: 'herb_zx', max: 2, x: 160, y: 260, label: '藥叢' },
      { id: 't1', kind: 'track', enemy: 'deserter', max: 1, x: 600, y: 240, label: '人跡' },
    ],
    fire: { x: 366, y: 320 }, ambush: { on: 'herb', enemy: null, p: 0 },
  };

  // ---------- 地城 ----------
  const DUNGEONS = {
    guyao: {
      risk: '低', scene: '燒窯廢墟改作亂葬崗，窯口飄出屍氣。',
      floors: [['corpse'], ['corpse', 'wolf'], ['corpse_king']],
      floorNames: ['一層', '二層', '窯底'],
      loot: { white: 0.5, blue: 0.45, rare: 0.05 }, silver: [6, 14],
      boss: { scroll: 'scroll_beng', loot: { blue: 0.6, rare: 0.4 }, silver: [20, 30] },
    },
    jiku: {
      risk: '高', scene: '沉在淵底的古祭窟，潮氣與血腥味混雜。',
      floors: [['serpent'], ['serpent', 'corpse'], ['shaman']],
      floorNames: ['一層', '二層', '祭壇'],
      loot: { blue: 0.5, rare: 0.4, legend: 0.1 }, silver: [16, 30],
      boss: { scroll: 'scroll_xi', loot: { rare: 0.5, legend: 0.5 }, silver: [50, 80], extra: ['ore_xs', 2] },
    },
  };

  DUNGEONS.guzhong = {
    risk: '中', scene: '沼邊的古塚，墓道兩側站滿了陶俑。',
    floors: [['golem'], ['golem', 'golem'], ['tomblord']],
    floorNames: ['墓道', '俑坑', '主室'],
    loot: { blue: 0.6, rare: 0.4 }, silver: [12, 24], drops: '良品／稀有裝備、陪葬銀器',
    boss: { loot: { rare: 0.8, legend: 0.2 }, silver: [60, 90] },
  };
  DUNGEONS.liekou = {
    risk: '極高', scene: '神墜之處。地層一層一層露在外面，血霧從底下往上湧。', mist: 2,
    floors: [['wraith'], ['soldier_dead', 'wraith'], ['soldier_dead', 'soldier_dead'], ['rooster']],
    floorNames: ['裂口', '霧層', '亡卒道', '神墜處'],
    loot: { rare: 0.7, legend: 0.3 }, silver: [20, 40], drops: '稀有／傳奇裝備、軍牌、神骨碎片',
    boss: { loot: { legend: 1 }, silver: [120, 180], extra: ['bone_relic', 2], codex: 'c_mingmen' },
  };
  DUNGEONS.guyao.drops = '凡品／良品裝備、基礎殘卷';
  DUNGEONS.jiku.drops = '稀有／傳奇試做裝、玄石、殘卷';

  // ---------- 行情：兩套基準價（灰窯鎮、渡陰關）；其他地點引用其中一套 ----------
  const PRICES = {
    huiyao: { herb_zx: 3, leaf_qx: 3, vine_du: 4, hide: 8, hide_fine: 20, beast_core: 38, meat: 2, ore_fe: 4, ore_cu: 6, ore_xs: 14, bog_iron: 6, leech_gland: 5, dogtag: 10, bone_relic: 34, blood_moss: 10, salt: 3, pig_iron: 4, yam: 10, smoked: 11, pot_hp: 5, pot_ft: 5, poison_oil: 7, antidote: 5, ration: 3, bread: 1, tea: 1 },
    duyin: { herb_zx: 5, leaf_qx: 4, vine_du: 7, hide: 5, hide_fine: 15, beast_core: 55, meat: 3, ore_fe: 8, ore_cu: 12, ore_xs: 26, bog_iron: 11, leech_gland: 7, dogtag: 13, bone_relic: 48, blood_moss: 15, salt: 9, pig_iron: 10, yam: 4, smoked: 5, pot_hp: 6, pot_ft: 6, poison_oil: 8, antidote: 6, ration: 3, bread: 1, tea: 1 },
  };

  // ---------- 城鎮與驛站：平面圖上的建築與路人 ----------
  // plan＝平面圖場景 id（js/scenes_town.js）；price＝引用哪套行情；board＝有委託板；tide＝會被獸潮襲擊
  const PLACES = {
    huiyao: { plan: 'plan_huiyao', price: 'huiyao', desc: '礦窯小鎮。煤灰落在每一片屋瓦上。', buildings: ['hy_market', 'hy_inn', 'hy_apoth', 'hy_smith', 'hy_board', 'hy_shrine'], street: ['np_aman', 'np_story', 'np_miner'], board: 'hy_board', tide: true },
    duyin: { plan: 'plan_duyin', price: 'duyin', desc: '邊關。牆外就是血霧起的方向。', buildings: ['dy_market', 'dy_inn', 'dy_smith', 'dy_apoth', 'dy_board', 'dy_tower'], street: ['np_refugee'], board: 'dy_board', tide: true },
    poxiao: { plan: 'plan_poxiao', price: 'duyin', desc: '破曉軍團的營地。旗上繡著半個日頭。', buildings: ['px_drill', 'px_quarter', 'px_medic', 'px_board'], street: ['np_wounded', 'np_recruit'], board: 'px_board' },
    yizhan: { plan: 'plan_yizhan', price: 'huiyao', desc: '官道上的驛站。來往的人在這裡喝一碗茶。', buildings: ['yz_tea', 'yz_peddler'], street: [] },
    shigu: { plan: 'plan_shigu', price: 'duyin', desc: '裂口出口旁的營地。骨頭排得很整齊。', buildings: ['sg_tent'], street: [] },
    yachao: { plan: 'plan_yachao', price: 'duyin', desc: '枯樹下的暗樁。樹上全是烏鴉。', buildings: ['yc_nest'], street: [] },
  };
  // type 決定服務；buys＝收購哪幾類（all＝全收；其餘為 ITEM_CLASS 的類別，專門店加價 15%）
  // stock 每列：[基底或物品, 價格, 稀有度或庫存量]；rep＝需要的聲望才上架
  const BUILDINGS = {
    hy_market: { place: 'huiyao', type: 'market', name: '天星分號', npc: 'np_qian', faction: 'star', buys: 'all', identify: true,
      stock: [['bag_travel', 48], ['bag_trade', 96], ['cap', 9], ['hat', 7], ['gloves', 8], ['boots', 14], ['belt', 12], ['ring', 26, 'blue'], ['bread', 3, 10], ['salt', 4, 8], ['pig_iron', 5, 6], ['incense', 1, 5]] },
    hy_inn: { place: 'huiyao', type: 'inn', name: '老窯客棧', npc: 'np_liu' },
    hy_apoth: { place: 'huiyao', type: 'apoth', name: '回春藥鋪', npc: 'np_baizhu', buys: ['herb', 'potion'],
      stock: [['pot_hp', 9, 6], ['antidote', 8, 4], ['herb_zx', 5, 6]] },
    hy_smith: { place: 'huiyao', type: 'smith', name: '石記鐵鋪', npc: 'np_shigan', buys: ['ore', 'eq'],
      stock: [['blade_short', 30], ['hammer', 34], ['spear', 40], ['buckler', 18], ['leather', 34]] },
    hy_board: { place: 'huiyao', type: 'board', name: '鎮公所', npc: 'np_zhou', faction: 'dawn' },
    hy_shrine: { place: 'huiyao', type: 'shrine', name: '窯神廟', npc: 'np_yabo' },
    dy_market: { place: 'duyin', type: 'market', name: '天星關市', npc: 'np_jia', faction: 'star', buys: 'all', identify: true,
      stock: [['bag_travel', 48], ['bag_trade', 96], ['bag_fine', 180, null, { star: 25 }], ['belt_wide', 28], ['amulet', 44, 'blue'], ['ring_jade', 40, 'blue'], ['jade', 46], ['bread', 3, 10], ['yam', 5, 8], ['smoked', 6, 6], ['tea', 2, 6]] },
    dy_inn: { place: 'duyin', type: 'inn', name: '關下酒肆', npc: 'np_ge' },
    dy_smith: { place: 'duyin', type: 'smith', name: '軍械坊', npc: 'np_yan', buys: ['ore', 'eq'],
      stock: [['saber', 48], ['spear', 42], ['bow', 32], ['axe2h', 60], ['helm', 30], ['mail', 64], ['ironshield', 38], ['gauntlet', 26], ['ironboots', 28]] },
    dy_apoth: { place: 'duyin', type: 'apoth', name: '藥攤', npc: 'np_kushen', buys: ['herb', 'potion'],
      stock: [['pot_hp', 10, 6], ['pot_ft', 12, 4], ['antidote', 8, 4], ['poison_oil', 12, 3]] },
    dy_board: { place: 'duyin', type: 'board', name: '破曉募兵處', npc: 'np_han', faction: 'dawn' },
    dy_tower: { place: 'duyin', type: 'tower', name: '關樓', npc: 'np_ding' },
    px_drill: { place: 'poxiao', type: 'drill', name: '校場', npc: 'np_huo', faction: 'dawn' },
    px_quarter: { place: 'poxiao', type: 'smith', name: '軍需帳', npc: 'np_suanpan', faction: 'dawn', buys: ['beast', 'tag'],
      stock: [['blade_short', 28], ['buckler', 17], ['helm', 29], ['leather', 32], ['pot_hp', 9, 4], ['ration', 5, 6]] },
    px_medic: { place: 'poxiao', type: 'medic', name: '傷兵帳', npc: 'np_wen', faction: 'dawn' },
    px_board: { place: 'poxiao', type: 'board', name: '軍令牌', npc: 'np_xiaoman', faction: 'dawn' },
    yz_tea: { place: 'yizhan', type: 'tea', name: '茶攤', npc: 'np_zhang' },
    yz_peddler: { place: 'yizhan', type: 'market', name: '天星行商', npc: 'np_ma', faction: 'star', buys: 'all', buyMult: 0.9, rotate: 5,
      pool: [['pot_hp', 11, 3], ['pot_ft', 13, 2], ['antidote', 9, 2], ['poison_oil', 13, 2], ['tea', 2, 4], ['bread', 3, 6], ['salt', 5, 4], ['yam', 7, 4], ['incense', 1, 3], ['bag_travel', 52], ['boots', 15], ['offblade', 24], ['ring', 30, 'blue'], ['amulet', 50, 'blue'], ['belt_wide', 30]] },
    sg_tent: { place: 'shigu', type: 'bone', name: '撿骨師的棚子', npc: 'np_bone', buys: ['tag', 'relic'], gamble: 3 },
    yc_nest: { place: 'yachao', type: 'crow', name: '鴉巢', npc: 'np_chiya', faction: 'crow' },
  };
  // 物品類別（給專門店的收購規則用）
  const ITEM_CLASS = {
    herb_zx: 'herb', leaf_qx: 'herb', vine_du: 'herb', blood_moss: 'herb', leech_gland: 'herb',
    pot_hp: 'potion', pot_ft: 'potion', poison_oil: 'potion', antidote: 'potion',
    ore_fe: 'ore', ore_cu: 'ore', ore_xs: 'ore', bog_iron: 'ore', pig_iron: 'ore',
    hide: 'beast', hide_fine: 'beast', meat: 'beast', beast_core: 'beast', smoked: 'beast',
    dogtag: 'tag', bone_relic: 'relic',
  };
  // NPC：頭像 ic＝npc id；fig＝站在平面圖上的小人；codex＝閒談會給的見聞錄條目（依序）
  const NPCS = {
    np_qian: { name: '錢四海', title: '天星分號掌櫃' }, np_liu: { name: '柳三娘', title: '老窯客棧老闆娘' },
    np_baizhu: { name: '白朮', title: '回春藥鋪藥師', codex: ['c_bloodrain'] }, np_shigan: { name: '石敢', title: '鐵匠' },
    np_zhou: { name: '周里正', title: '灰窯鎮里正', codex: ['c_warlord'] }, np_yabo: { name: '啞伯', title: '守廟人' },
    np_jia: { name: '賈掌櫃', title: '天星商會大掌櫃', codex: ['c_star'] }, np_ge: { name: '老葛', title: '酒保', codex: ['c_army'] },
    np_yan: { name: '嚴鐵娘', title: '軍械匠' }, np_kushen: { name: '苦參', title: '遊方郎中', codex: ['c_qiqing'] },
    np_han: { name: '韓厲', title: '破曉軍團百夫長', codex: ['c_dawn'] }, np_ding: { name: '丁老七', title: '守關老卒', codex: ['c_night'] },
    np_huo: { name: '霍青', title: '破曉營教頭' }, np_suanpan: { name: '算盤', title: '軍需官' },
    np_wen: { name: '溫姑', title: '醫官', codex: ['c_mist'] }, np_xiaoman: { name: '小滿', title: '傳令兵' },
    np_zhang: { name: '駝背張', title: '茶攤老闆' }, np_ma: { name: '馬六', title: '天星行商' },
    np_bone: { name: '撿骨師', title: '', codex: ['c_bonepicker'] }, np_chiya: { name: '赤鴉', title: '鴉衛', codex: ['c_crow', 'c_chiya'] },
    np_aman: { name: '阿滿', title: '乞兒', fig: 'fig_child', act: 'rumor' },
    np_story: { name: '灰窯說書人', title: '', fig: 'fig_elder', codex: ['c_geo', 'c_gods'] },
    np_miner: { name: '老礦工', title: '', fig: 'fig_man', codex: ['c_fall'] },
    np_refugee: { name: '難民婦人', title: '', fig: 'fig_woman', quest: 'b_refugee', codex: ['c_kiln'] },
    np_wounded: { name: '傷兵', title: '破曉軍團', fig: 'fig_soldier', codex: ['c_army'] },
    np_recruit: { name: '新兵', title: '破曉軍團', fig: 'fig_soldier' },
  };

  // ---------- 三大勢力與聲望門檻 ----------
  // ---------- 勢力與聲望門檻 ----------
  // 勢力會越來越多：reveal＝讀到這條見聞才知道有這個勢力；how＝怎麼漲聲望（介面說明用）
  const FACTIONS = {
    dawn: { name: '破曉軍團', g: '曉', ic: 'f_dawn', desc: '冒險者、傭兵與亡國殘兵的聯合武裝，在各地建據點護民。', how: '完成委託、擊退獸潮、清空地城、上繳軍牌', perks: [[10, '校場肯教〈破陣〉'], [20, '委託報酬 +15%']] },
    star: { name: '天星商會', g: '星', ic: 'f_star', desc: '天裂前就幾乎壟斷大陸經濟的金融帝國，災變後仍有辦法把貨運到。', how: '在天星商號與行商買賣、完成送貨、付費鑑定', perks: [[10, '商號九五折'], [25, '可買精工大囊、鑑定半價']] },
    crow: { name: '鴉衛', g: '鴉', ic: 'f_crow', desc: '人數極少的情報組織，專門調查天裂之後的異象。', how: '向赤鴉回報見聞、查證傳聞', perks: [[6, '赤鴉肯替你辨傳聞'], [14, '傳授〈鴉影〉']] },
    warlord: { name: '鎮西將軍府', g: '將', reveal: 'c_warlord', desc: '當年護民的人，三年後在官道上收稅。灰窯原名義上歸他們管。', how: '（下一版開放）', perks: [] },
    cult: { name: '拜裂教', g: '裂', reveal: 'c_cult', desc: '他們拜的不是神，是裂口。沉淵祭窟的供桌是新的。', how: '（下一版開放）', perks: [] },
  };

  // ---------- 探查：每個地點固定幾樣發現，依序找到 ----------
  // kind: lore 見聞（codex）／cache 藏物（items、silver、eq）／point 新採集點／node 新地點／fight 遭遇
  const EXPLORE = {
    huiyao: [{ id: 'e_hy1', kind: 'lore', codex: 'c_night' }, { id: 'e_hy2', kind: 'cache', items: [['ore_cu', 1], ['bread', 1]], silver: 8 }, { id: 'e_hy3', kind: 'lore', codex: 'c_army' }],
    yizhan: [{ id: 'e_yz1', kind: 'lore', codex: 'c_star' }, { id: 'e_yz2', kind: 'cache', items: [['salt', 2]] }, { id: 'e_yz3', kind: 'fight', enemy: ['deserter'], items: [['dogtag', 1]] }],
    duyin: [{ id: 'e_dy1', kind: 'lore', codex: 'c_duyin' }, { id: 'e_dy2', kind: 'lore', codex: 'c_mist' }, { id: 'e_dy3', kind: 'cache', items: [['pot_hp', 1]], silver: 15 }],
    poxiao: [{ id: 'e_px1', kind: 'lore', codex: 'c_dawn' }, { id: 'e_px2', kind: 'lore', codex: 'c_warlord' }, { id: 'e_px3', kind: 'cache', items: [['ration', 2], ['pot_hp', 1]] }],
    chakou: [{ id: 'e_ck1', kind: 'lore', codex: 'c_gods' }, { id: 'e_ck2', kind: 'node', node: 'yachao' }, { id: 'e_ck3', kind: 'cache', items: [['bread', 2]], silver: 12 }],
    qingwu: [{ id: 'e_qw1', kind: 'point', point: { id: 'x1', kind: 'herb', item: 'vine_du', max: 2, x: 390, y: 210, label: '毒藤' } }, { id: 'e_qw2', kind: 'lore', codex: 'c_bloodrain' }, { id: 'e_qw3', kind: 'cache', items: [['herb_zx', 3], ['leaf_qx', 2]] }],
    guyao: [{ id: 'e_gy1', kind: 'lore', codex: 'c_kiln' }, { id: 'e_gy2', kind: 'cache', silver: 18, eq: 'blue' }, { id: 'e_gy3', kind: 'lore', codex: 'c_sanshi' }],
    kugu: [{ id: 'e_kg1', kind: 'point', point: { id: 'x1', kind: 'track', enemy: 'boar', max: 1, x: 540, y: 300, label: '鹿徑' } }, { id: 'e_kg2', kind: 'lore', codex: 'c_beasts' }, { id: 'e_kg3', kind: 'cache', items: [['hide_fine', 1], ['ration', 1]] }],
    chishi: [{ id: 'e_cs1', kind: 'point', point: { id: 'x1', kind: 'ore', item: 'ore_cu', max: 2, x: 450, y: 270, label: '支坑' } }, { id: 'e_cs2', kind: 'lore', codex: 'c_fall' }, { id: 'e_cs3', kind: 'cache', items: [['ore_xs', 1]] }],
    fuzhao: [{ id: 'e_fz1', kind: 'lore', codex: 'c_swamp' }, { id: 'e_fz2', kind: 'node', node: 'guzhong' }, { id: 'e_fz3', kind: 'point', point: { id: 'x1', kind: 'ore', item: 'bog_iron', max: 2, x: 430, y: 180, label: '鏽脈' } }],
    jiku: [{ id: 'e_jk1', kind: 'lore', codex: 'c_sacrifice' }, { id: 'e_jk2', kind: 'cache', items: [['pot_ft', 1]], silver: 22 }, { id: 'e_jk3', kind: 'lore', codex: 'c_cult' }],
    shigu: [{ id: 'e_sg1', kind: 'lore', codex: 'c_bonepicker' }, { id: 'e_sg2', kind: 'cache', items: [['dogtag', 2]] }],
    liekou: [{ id: 'e_lk1', kind: 'lore', codex: 'c_rift' }, { id: 'e_lk2', kind: 'lore', codex: 'c_mingmen' }, { id: 'e_lk3', kind: 'cache', items: [['bone_relic', 1], ['blood_moss', 2]] }],
    yachao: [{ id: 'e_yc1', kind: 'lore', codex: 'c_crow' }],
    guzhong: [{ id: 'e_gz1', kind: 'lore', codex: 'c_tomb' }, { id: 'e_gz2', kind: 'cache', silver: 30, eq: 'rare' }],
  };
  const CODEX_CATS = ['天裂', '勢力', '地理', '人物', '異象'];

  // ---------- 委託（城鎮任務板）：固定懸賞＋每日生成 ----------
  // 固定懸賞：開局即接灰髯狼；清窟為長期懸賞（無期限）；giver＝由路人給、不上板
  const BOUNTIES = [
    { id: 'b_wolf', town: 'huiyao', g: '狼', title: '灰髯狼 ×3', kind: 'kill', enemy: 'wolf', need: 3, reward: 40, start: true },
    { id: 'b_guyao', town: 'huiyao', g: '窯', title: '古窯清理', kind: 'clear', dungeon: 'guyao', need: 1, reward: 60 },
    { id: 'b_jiku', town: 'duyin', g: '巫', title: '祭窟巫祝', kind: 'clear', dungeon: 'jiku', need: 1, reward: 150 },
    { id: 'b_liekou', town: 'poxiao', g: '裂', title: '裂口殘影', kind: 'clear', dungeon: 'liekou', need: 1, reward: 320 },
    { id: 'b_refugee', town: 'duyin', g: '牌', title: '丈夫的軍牌', kind: 'collect', item: 'dogtag', need: 1, reward: 20, giver: 'np_refugee' },
  ];
  // 每日生成的委託模板：有委託板的地點每天補到 3 張
  const QUEST_GEN = {
    perTown: 3,
    kinds: { huiyao: { collect: 45, kill: 35, deliver: 20 }, duyin: { collect: 45, kill: 35, deliver: 20 }, poxiao: { kill: 100 } },
    collect: { days: 3, pool: [['herb_zx', 4], ['leaf_qx', 3], ['vine_du', 2], ['hide', 3], ['meat', 3], ['ore_fe', 2], ['ore_cu', 2], ['bog_iron', 2], ['leech_gland', 2]] },
    kill: { days: 4, pool: [['wolf', 2, 26], ['wolf', 3, 38], ['boar', 1, 22], ['boar', 2, 40], ['bug', 2, 16], ['leech', 2, 34], ['deserter', 1, 30], ['bogcorpse', 1, 44]] },
    where: { wolf: '枯骨獸徑・青霧藥林', boar: '枯骨獸徑', bug: '青霧藥林', leech: '腐骨沼', deserter: '野徑岔口', bogcorpse: '腐骨沼' },
    deliver: { days: 2, reward: 24, deposit: 10 },
  };

  // ---------- 傳聞：3 題材 × 5 真相 ----------
  // 真相：true 屬實易取／guard 有人盤踞／strong 強敵鎮守／gone 已被取走／bait 根本是餌
  const RUMOR = {
    cost: 5, max: 3, days: 4, decay: 0.2,
    truth: { true: 30, guard: 25, strong: 15, gone: 15, bait: 15 },
    kinds: {
      cache: { name: '秘寶', nodes: ['guyao', 'jiku', 'chishi', 'kugu', 'chakou', 'fuzhao'], text: ['聽說{n}一帶有人埋了一口箱子，還沒人去挖。', '有個老卒說，{n}的石縫裡藏著前人的行囊。'] },
      vein: { name: '富脈', nodes: ['chishi', 'qingwu', 'fuzhao'], text: ['{n}崩出一段新脈，成色極好。', '採藥人說{n}深處長了一片沒人動過的好東西。'] },
      beast: { name: '異獸', nodes: ['kugu', 'qingwu', 'fuzhao'], text: ['{n}出了一頭赤鬃的異獸，皮毛值大錢。', '獵戶們在傳，{n}有東西把狼群都趕跑了。'] },
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
  const TIDE = { towns: ['huiyao', 'duyin'], first: [3, 4], gap: [5, 7], days: 2, need: 4, reward: 50, potMult: 1.5, hurtDays: 2 };
  // 歇息起床（SPEC-TIME v0.4 §11 B1）：起床＝min(max(現在+minH, 下一個 wakeMin), 現在+maxH)；maxH 13 為建議值、未經模擬（Q-T7 乙）
  // SPEC-TIME 7.1b 險級分檔：路程險級門檻（半開區間；比較前 risk 先封頂 0.85、再 half-up 取三位）→ 低／中／高／極高
  const TIME = { RISK_CUTS: [0.15, 0.35, 0.60], RISK_TIERS: ['低', '中', '高', '極高'] };
  const SLEEP = { wakeMin: 8 * 60, minH: 6, maxH: 13 };
  // ===== 兩鎮循環（SPEC-01 v0.4 §3、§4；單一來源，DEV-02） =====
  // 標記沿用規格：〔LW〕living-world、〔新〕規格補值、〔既有〕現況。數字全部照 SPEC-01 v0.4，未經本包調整。
  const WORLD = {
    TOWNS: ['huiyao', 'duyin'],
    // §3.1 起手／§4.5 基準（P_base、O_base、G0＝Gnom）
    START: { huiyao: { P: 50, T: 200, O: 55, Gnom: 1 }, duyin: { P: 45, T: 300, O: 60, Gnom: 2 } },
    BASE: { huiyao: { P_base: 50, O_base: 55, G0: 1 }, duyin: { P_base: 45, O_base: 60, G0: 2 } },
    // §4.1 驅動與回歸
    K_REG: 0.10, DAY_CAP: 3, P_MIN: 15, P_CAP: 80, P_HIGH: 70, P_HIGH_MULT: 0.5, PNOISE: 1,
    // §4.2 目標值係數
    P_OF_O: 0.40, O_OF_P: 0.20, O_OF_B: 0.20, O_PER_G: 10, B_REF: 30, O_MEAN: 57.5, P_MEAN: 47.5,
    // §4.3 軍費、稅、財庫（K_TAX v0.3 值）
    UPKEEP: [0, 15, 40, 90], K_TAX: { huiyao: 0.56, duyin: 1.45 }, TAX_O0: 0.6, TAX_O1: 0.004, TAX_CUT_MULT: 0.8,
    TRADE_TAX: 0.05, T_CAP_DAYS: 90, REMIT_LOG_GAP: 10,
    // §4.4 欠餉與求援
    RESCUE_DEBT: 3, RESCUE_UPKEEP_DAYS: 6, RESCUE_TAX_CUT: 10, RESCUE_CD: 20,
    // §4.6（只留資料，資助與巡邏所的玩家行動屬 DEV-04）
    PATROL: [0, 5, 9, 12], F_CAP: 500,
    // §3.2 區域起手
    REGION0: { B: 30, crew: 4, crewCtr: 0, crewWiped: false },
    // §4.8 遇險率的治安／匪勢修正 R 與封頂（封頂在所有乘項之後做一次）
    R_ROAD: { kO: 0.015, lo: 0.5, hi: 1.5 }, R_WILD: { kB: 0.012, kO: 0.010, lo: 0.5, hi: 1.8 }, RISK_CAP: 0.85,
    // §4.10 S_pub＝P_DETECT(O, Geff)/0.57
    S_PUB: { a: 0.25, kO: 0.004, kG: 0.10, lo: 0.15, hi: 0.95, norm: 0.57 },
    // §7.1 簡報換算門檻（只給 brief 用，畫面屬 DEV-05）
    TREND_EPS: 0.5, TIGHT_DAYS: 3, WHY_BANDIT_B: 35,
    // §7.1／§7.6／§11 駐軍四檔顯示名（列名仍「駐軍」）：0 無、1 自衛隊、2 巡邏隊、3 守備（v0.4，mumi 16:10）
    GARRISON_NAMES: ['無', '自衛隊', '巡邏隊', '守備'],
    // §3.2／§5.10 難民棚起手（只存欄位；§5.10 規則無人認領，本包不結算）
    REFUGEE0: { camp: 60, inTotal: 0, settledTotal: 0, soldTotal: 0, soldToday: 0, soldYday: 0 },
  };

  // ===== 題材文字表（DEV-05；可替換資料檔） =====
  // 假設：分檔檔名與切點待 mumi（製作人 16:46 裁決第 1 項）；本包先集中放在這一處，ui.js 只讀這張表，不寫死句子。
  // 來源：city.* ＝ docs/design/batch1/city-status-copy-v0.1.csv（字串 key 照 CSV）；map.* ＝ UI-02/wording-map-commission.md §1；
  //       quest.* ＝ wording-map §2；腳程懸浮＝mumi 原句（16:29 拍板、16:46 裁決第 1 項）。駐軍四檔名在 WORLD.GARRISON_NAMES（DEV-02），不在此重複。
  // {名稱} 為代入欄位，名稱對齊 brief 欄位（SPEC-01 §7.6）。
  const TEXT = {
    city: {
      title: '城況', collapse: '收合',
      label: { prosperity: '繁榮', order: '治安', treasury: '財庫', garrison: '駐軍', bandit: '匪勢' },
      // §7.1 換算：值 < 上界即落在該檔（最後一檔上界 Infinity）
      prosperity: [[25, '荒涼'], [40, '冷清'], [60, '平常'], [75, '熱鬧'], [Infinity, '繁華']],
      order: [[25, '混亂'], [45, '不安'], [65, '尚可'], [85, '安穩'], [Infinity, '太平']],
      bandit: [[15, '絕跡'], [35, '零星'], [60, '猖獗'], [Infinity, '橫行']],
      trend: { up: '較昨日升', down: '較昨日降', flat: '與昨日持平' },
      delta: { up: '較昨日+{N}', down: '較昨日−{N}', flat: '與昨日持平' },
      arrow: { up: '↑', down: '↓', flat: '' },
      treasury: { debt: '欠餉', full: '滿庫', tight: '吃緊', ok: '足餉' },
      treasuryIn: '今日收入{treasuryIn}兩', treasuryOut: '今日支出{treasuryOut}兩', treasuryNet: '今日淨額{treasuryNet}兩',
      treasuryAmount: '現額{T}兩', taxcut: '稅收抽成，餘{taxCutDays}天',
      rescue: '已求援，得銀{rescueAmt}兩',
      garrisonAid: '資助加派中，餘{aidDaysLeft}天', garrisonDebt: '欠餉，降一檔',
      why: {
        WHY_TIDE: '繁榮{trend}，因獸潮壓境', WHY_HURT: '繁榮{trend}，因獸潮過後鎮上受創', WHY_REPEL: '繁榮{trend}，因擊退獸潮',
        WHY_DEBT: '繁榮{trend}，因欠餉，駐軍降一檔', WHY_BANDIT: '繁榮{trend}，因匪勢{bandit}', WHY_RENLU: '繁榮{trend}，因難民被販走',
        WHY_AID: '繁榮{trend}，因資助巡邏加派駐軍', WHY_ORDER_UP: '繁榮{trend}，因治安轉好', WHY_ORDER_DOWN: '繁榮{trend}，因治安轉差',
        WHY_REVERT: '繁榮{trend}，因市面回穩', WHY_NONE: '繁榮{trend}，因市面小起落',
      },
      // 交易稅率顯示（SPEC-01 §4.3 5%；草稿 UI-02-02 展開末行）。數字由 WORLD.TRADE_TAX 代入
      tradeTax: '交易稅 {pct}%',
      // 假設：第一次日結（00:00）之前 brief 還是空的；SPEC 未定這時要顯示什麼，本包不自行補算，只顯示這兩句
      pendingTier: '待日結', pending: '第一次日結（00:00）後才有今日收支',
      // 原本放在鎮上說明列的兩句（沿用原文，只搬位置到平面圖頂端警示條，對照 UI-02-03）
      hurt: '獸潮過後一片狼藉：貨架剩一半、客棧漲價。', tide: '獸潮期間，藥水漲價五成。',
      toggleHint: '點開看收支、駐軍與匪勢',
    },
    // 地圖趕路（底列與圖上氣泡同一套詞；wording-map §1）
    map: {
      hours: '路程', food: '飽食', fat: '疲累', risk: '危險', speed: '腳程',
      hoursVal: '{hours} 小時', foodVal: '−{food}', fatVal: '+{fat}', speedVal: '×{mult}',
      bubble1: '路程 {hours} 小時・飽食 −{food}', bubble2: '疲累 +{fat}・危險 {riskName}',
      // 懸浮說明：腳程為 mumi 原句；其餘四句為 wording-map §1 擬案（路程一句把「時辰」改「時數」，見 PR 說明）
      hint: {
        hours: '依這條路線的基礎時數與目前負重算出，是這次出發會耗掉的時數。',
        food: '趕路會消耗飽食；降到過低時，生命不再回復。',
        fat: '趕路會累積疲累；過高時命中與趕路都會變慢。',
        risk: '這條路上遇襲的高低；夜間、負重過高或走野徑時較容易遇險。',
        speed: '負重、裝備與疲累會影響趕路速度',
      },
    },
    // 鎮公所委託單（wording-map §2）
    quest: {
      target: '目標', reward: '報酬', whereHere: '送到此地交付', whereBring: '帶回此地交付', due: '時限', risk: '風險',
      rewardVal: '{reward} 兩', depositVal: '・押金 {deposit} 兩',
      dueLong: '長期', dueToday: '今日截止', dueLeft: '剩 {n} 天',
      riskVal: '危險 {level}', riskNone: '危險 未定',
      failDeadline: '逾期則撕榜', failDeposit: '逾期押金沒收', failNone: '失敗罰則未定',
      take: '揭榜', deliver: '交付', claimed: '已交付', delivering: '送達', progress: '進度 {a}/{b}',
    },
  };

  // ---------- 營火／藥爐配方 ----------
  const RECIPES = [
    { id: 'r_hp', out: 'pot_hp', g: '創', name: '金創藥水', eff: '命 +30', mat: 'herb_zx', n: 2, where: '營火／藥爐', fireOnly: false, h: 1 },
    { id: 'r_ft', out: 'pot_ft', g: '神', name: '提神湯藥', eff: '疲 −25', mat: 'leaf_qx', n: 2, where: '營火／藥爐', fireOnly: false, h: 1 },
    { id: 'r_ra', out: 'ration', g: '乾', name: '烤肉乾糧', eff: '食 +35', mat: 'meat', n: 1, where: '需營火', fireOnly: true, h: 1 },
    { id: 'r_oil', out: 'poison_oil', g: '毒', name: '淬毒油', eff: '戰鬥塗刃', mat: 'vine_du', n: 2, where: '營火／藥爐', fireOnly: false, h: 1 },
    { id: 'r_anti', out: 'antidote', g: '解', name: '解毒丸', eff: '解毒', mat: 'leech_gland', n: 1, where: '營火／藥爐', fireOnly: false, h: 1 },
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

  // ---------- 熟練度（四大類 24 項；0–100；perks 的鍵＝門檻） ----------
  const PROF_GROUPS = [
    { id: 'wu', name: '武藝' }, { id: 'ye', name: '山野' }, { id: 'gong', name: '百工' }, { id: 'xing', name: '行走' },
  ];
  const PROFS = [
    { id: 'dao', grp: 'wu', attr: 'li', name: '刀劍', how: '持刀劍命中', perks: { 10: '招式〈橫斬〉', 25: '流血刀法：命中 20% 使敵流血', 30: '招式〈奪命〉' } },
    { id: 'qiang', grp: 'wu', attr: 'li', name: '長兵', how: '持槍命中', perks: { 10: '招式〈突刺〉', 25: '先制：開戰第一回合必先出手', 30: '招式〈掃腿〉' } },
    { id: 'fu', grp: 'wu', attr: 'li', name: '斧錘', how: '持斧錘命中', perks: { 10: '招式〈重劈〉', 25: '破甲：無視敵方護甲', 30: '招式〈震地〉' } },
    { id: 'gong', grp: 'wu', attr: 'shen', name: '弓弩', how: '持弓命中', perks: { 10: '招式〈瞄準〉', 25: '先射：開戰前免費射一箭', 30: '招式〈連珠〉' } },
    { id: 'quan', grp: 'wu', attr: 'xin', name: '拳腳', how: '空手命中', perks: { 10: '招式〈擒拿〉', 25: '卸力：空手時受傷 −15%', 30: '招式〈內勁〉' } },
    { id: 'dun', grp: 'wu', attr: 'xin', name: '盾防', how: '持盾防禦', perks: { 15: '招式〈盾擊〉', 25: '反震：防禦時回敬 2–4 傷害' } },
    { id: 'shan', grp: 'wu', attr: 'shen', name: '閃躲', how: '被攻擊', perks: { 15: '招式〈遊身〉', 25: '撤退率 +8%' } },
    { id: 'qing', grp: 'wu', attr: 'shen', name: '輕甲', how: '穿輕甲受擊', perks: { 25: '輕甲重量減半' } },
    { id: 'zhong', grp: 'wu', attr: 'ti', name: '重甲', how: '穿重甲受擊', perks: { 25: '受重擊再減 15%' } },
    { id: 'cai', grp: 'ye', attr: 'ling', name: '採藥', how: '採藥草', perks: { 25: '辨異草：25% 多得一株毒藤', 50: '40% 一次採雙份', 75: '毒蟲不侵' } },
    { id: 'kuang', grp: 'ye', attr: 'li', name: '挖礦', how: '挖礦', perks: { 25: '落石傷害減半', 50: '35% 多挖一塊' } },
    { id: 'zong', grp: 'ye', attr: 'ling', name: '追蹤', how: '追蹤獸跡', perks: { 25: '辨痕：傳聞現場可先看痕跡', 50: '伏擊：狩獵戰首回合敵人不動' } },
    { id: 'bo', grp: 'ye', attr: 'ling', name: '剝皮', how: '剝皮取肉', perks: { 25: '50% 多剝一張皮', 50: '可剝出完整獸皮', 75: '可取異獸內丹' } },
    { id: 'ying', grp: 'ye', attr: 'ti', name: '野營', how: '生火、露宿', perks: { 25: '夜警機率 −40%', 50: '露宿回復 +25%' } },
    { id: 'tanyou', grp: 'ye', attr: 'ling', name: '探幽', how: '探查地點', perks: { 25: '探查落空時不會驚動野獸', 50: '探查只花半小時' } },
    { id: 'yao', grp: 'gong', attr: 'wu', name: '煉藥', how: '製藥', perks: { 25: '30% 省一份材料', 50: '25% 一爐雙產' } },
    { id: 'peng', grp: 'gong', attr: 'wu', name: '烹食', how: '烤乾糧', perks: { 25: '30% 一肉兩糧' } },
    { id: 'jian', grp: 'gong', attr: 'wu', name: '鑑物', how: '鑑定裝備', perks: { 25: '可鑑稀有', 50: '可鑑傳奇' } },
    { id: 'jiao', grp: 'xing', attr: 'shen', name: '腳力', how: '趕路', perks: { 25: '野徑遇險 −20%' } },
    { id: 'fuz', grp: 'xing', attr: 'ti', name: '負重', how: '背重趕路', perks: { 25: '常態重負的腳程懲罰減半', 50: '超載懲罰減輕' } },
    { id: 'yi', grp: 'xing', attr: 'kou', name: '議價', how: '買賣', perks: { 25: '委託報酬 +10%' } },
    { id: 'tan', grp: 'xing', attr: 'kou', name: '探聞', how: '打聽傳聞', perks: { 25: '聽傳聞時多一句判斷', 50: '打聽半價' } },
    { id: 'shuo', grp: 'xing', attr: 'kou', name: '說服', how: '事件中開口', perks: { 25: '劫匪買路錢減半' } },
    { id: 'tou', grp: 'xing', attr: 'shen', name: '偷竊', how: '下一版開放', locked: true, perks: {} },
  ];
  const WTYPE_NAMES = { dao: '刀劍', qiang: '長兵', fu: '斧錘', gong: '弓弩' };

  // ---------- 身分（DEV-01 開局平民化：出身只剩「平民」一張卡，沿用舊「流民」數值） ----------
  // 假設：內部 id 保留 'drifter'（存檔欄位 S.origin、頭像 pl_drifter 都沿用），畫面顯示「平民」。
  // 假設：卡片說明沿用舊流民說明（UI-01 草稿只畫「身分／平民」，沒有給卡片說明文字）。
  const ORIGINS = [
    { id: 'drifter', name: '平民', desc: '什麼都不會，什麼都能學。', attr: {}, prof: {}, gear: ['blade_rust', 'robe'], silver: 60 },
  ];
  // 開局取名：預設名（不在池內）與整池 60 組（姓、名），原樣取自 docs/design/batch1/name-pool-v0.1.csv，順序與用字不改
  const NAME_DEFAULT = { sur: '沈', given: '衡' };
  // 自訂名「已有人用」清單：整名完全相同才攔（取名禁字規則定稿 v1.0 §3、§5 起始表）。
  // 固定角色全名＋稱謂詞＋遊戲名詞＋九大勢力全名（共 42 項）。正式版可由 names-final 新名欄與勢力名產出後整批替換本常數。
  const NAME_TAKEN = [
    '虞九淵', '明夷',
    '撿骨師', '傀母', '蠱母', '里正', '鴉首', '路人', '兇煞', '良民', '平民', '掌櫃', '先生', '客官',
    '守備', '紅霧', '腳程', '輕快', '平常', '沉重', '蹣跚', '鎮衙', '祭祀', '侵蝕', '破曉', '天星', '鴉衛', '拜裂', '九幽', '飲霧', '四象', '黑水', '天工', '萬神',
    // 九大勢力全名（定稿第 5 節末段；本地化 2026-11-28 18:09 裁定收入；鴉衛已在上列）
    '四象軍', '破曉軍團', '天星商會', '拜裂教', '黑水盟', '天工盟', '萬神教', '九幽殿',
  ];
  const NAME_POOL = [
    ['郝', '朔'], ['柏', '戎'], ['巢', '岩'], ['岳', '樵'], ['滕', '莽'], ['莘', '月'], ['茅', '葦'], ['紀', '谷'], ['卜', '雁'], ['芮', '秋'],
    ['祁', '禾'], ['韋', '溪'], ['岑', '苗'], ['舒', '苓'], ['管', '沐'], ['譚', '荷'], ['尹', '若'], ['宓', '芹'], ['蒲', '穗'], ['杭', '柔'],
    ['柯', '磐'], ['盧', '炭'], ['卓', '錘'], ['鈕', '魁'], ['裴', '厚'], ['井', '秀'], ['鄒', '桂'], ['竇', '香'], ['池', '蘭'], ['萬', '菊'],
    ['賀', '固'], ['常', '垣'], ['靳', '北'], ['尚', '嶺'], ['解', '戈'], ['藺', '棠'], ['尤', '晴'], ['涂', '素'], ['步', '南'], ['成', '映'],
    ['汪', '季航'], ['駱', '載行'], ['傅', '津渡'], ['盛', '車馬'], ['奚', '瀾舟'], ['鮑', '綺羅'], ['練', '晚泊'], ['邢', '繡織'], ['俞', '市南'], ['梅', '書柬'],
    ['包', '拴'], ['黎', '河'], ['史', '陌'], ['安', '麥'], ['喬', '路'], ['倪', '桃兒'], ['甘', '菜頭'], ['戴', '盼兒'], ['宋', '芋頭'], ['翁', '阿彩'],
  ];

  const SEASONS = ['春', '夏', '秋', '冬'];
  const YEAR_NAMES = ['元', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  const EQ_SLOTS = ['main', 'off', 'head', 'chest', 'gloves', 'boots', 'amulet', 'ring1', 'ring2', 'belt'];
  const SLOT_NAMES = { main: '主手', off: '副手', head: '頭盔', chest: '胸甲', gloves: '手套', boots: '靴子', amulet: '護身符', ring1: '左戒', ring2: '右戒', belt: '腰帶', bag: '背包', cart: '馬車' };
  const SLOT_GLYPH = { main: '刃', off: '盾', head: '冠', chest: '甲', gloves: '手', boots: '靴', amulet: '符', ring1: '戒', ring2: '戒', belt: '帶', bag: '囊', cart: '車' };

  return { ITEMS, SKILLS, TECHS, BASES, AFFIXES, UNIQUES, LEGENDS, RARITY, ENEMIES, NODES, EDGES, REGION_LABELS, WILDS, DUNGEONS, PRICES, PLACES, BUILDINGS, ITEM_CLASS, NPCS, FACTIONS, EXPLORE, CODEX_CATS, BOUNTIES, QUEST_GEN, RUMOR, TIDE, SLEEP, TIME, WORLD, TEXT, RECIPES, EVENTS, ATTRS, PROFS, PROF_GROUPS, WTYPE_NAMES, ORIGINS, NAME_DEFAULT, NAME_TAKEN, NAME_POOL, SEASONS, YEAR_NAMES, EQ_SLOTS, SLOT_NAMES, SLOT_GLYPH };
})();
