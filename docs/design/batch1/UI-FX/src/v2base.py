# 《山海錄》v2 灰盒線框：窄側欄＋超大中央舞台（GDD v0.2）
from lib import Screen

PAD, GAP = 6, 6
LW, MW, RW = 240, 796, 220
LX, MX, RX = PAD, PAD + LW + GAP, PAD + LW + GAP + MW + GAP   # 6, 252, 1054
Y0, CH = PAD, 720 - PAD * 2                                   # 6, 708
YB = Y0 + CH                                                  # 714
assert RX + RW + PAD == 1280

# ---------- 小元件 ----------
def cell(s, x, y, w, h, g, cnt=None, cls='p', gf='f12b', gcls='c', key=None, corner=None, top=None):
    """純 ICON 方格：中央 1 字圖示代號，右下堆疊數字，左上快捷鍵，右上小記號"""
    s.box(x, y, w, h, cls)
    gy = y + (h - 16) // 2 - (3 if cnt else 0)
    if g:
        s.t(x + 1, gy, w - 2, g, gf, gcls)
    if cnt:
        s.t(x + 2, y + h - 13, w - 4, cnt, 'f9b', 'r')
    if key:
        s.t(x + 2, y + 1, 12, key, 'f9', 'dim')
    if top:
        s.t(x + w - 16, y + 1, 14, top, 'f9b', 'r ' + ('red' if top in ('↑',) else 'dim'))
    if corner:  # 稀有度角標：良=灰 稀有=黑 傳奇=黑框
        c = {'良': 'fill2', '稀': 'fill', '傳': 'dk'}[corner]
        s.box(x + 2, y + 2, 6, 6, c)


def bar(s, x, y, w, h, pct, red=False, ticks=()):
    s.box(x, y, w, h, 'p')
    fw = int(round(w * pct))
    if fw:
        s.box(x, y, fw, h, 'rfill' if red else 'fill')
    for t in ticks:
        s.box(x + int(w * t), y - 2, 1, h + 4, 'tick')


# ---------- 左欄 ----------
SLOTS = {  # 部位: (x, y, w, h, 圖示代號, 稀有度角標, 空?)
    '頭盔': (104, 14, 40, 40, '冠', None, False),
    '護身符': (152, 20, 28, 28, '符', None, True),
    '主手': (22, 40, 44, 88, '刃', '良', False),
    '副手': (182, 40, 44, 88, '盾', None, False),
    '胸甲': (100, 60, 48, 64, '甲', '稀', False),
    '手套': (22, 134, 44, 40, '手', None, False),
    '左戒': (70, 130, 26, 26, '戒', None, False),
    '腰帶': (100, 130, 48, 22, '帶', None, False),
    '右戒': (152, 130, 26, 26, '戒', None, True),
    '靴子': (182, 134, 44, 40, '靴', '良', False),
}
BAG = (86, 162, 36, 36)
WAGON = (126, 162, 36, 36)
PACK = [('草', '×4'), ('葉', '×3'), ('鐵', '×2'), ('藥', '×1'), ('皮', '×1'), ('糧', '×1')]
GX0, GY0, GP, GC = 12, 230, 44, 40


def draw_left(s, hover=None, badge=True, ground=None, pack_full=True):
    s.box(LX, Y0, LW, CH, 'z')
    # 紙娃娃
    for part, (x, y, w, h, g, rar, empty) in SLOTS.items():
        sel = hover == part
        cell(s, x, y, w, h, '' if empty else g, cls='sel' if sel else ('ghost' if empty else 'p'),
             gcls='c' if not empty else 'c off', corner=None if empty else rar)
        if empty:
            s.t(x + 1, y + (h - 16) // 2, w - 2, g, 'f11', 'c off')
    x, y, w, h = BAG
    cell(s, x, y, w, h, '囊', cnt='6')
    x, y, w, h = WAGON
    cell(s, x, y, w, h, '車', cls='lock', gcls='c off')
    if badge:
        s.L('人形 10 裝備部位（緊湊槽）', 22, 14, 204, 184, '12/700 圖示代號', '--slot',
            '每槽 = 熱區；點＝穿脫，滑過＝提示卡', '武器／副手 44×88、胸甲 48×64、頭盔 40×40、手套／靴 44×40、腰帶 48×22、戒／護身符 26–28 方。左上小方塊＝稀有度角標（灰良／黑稀有／黑實心傳奇）。槽內只有 1 字圖示代號，無品名。',
            bx=26, by=16)
        s.L('背包槽（裝備 ICON）', BAG[0], BAG[1], 36, 36, '12/700', '--slot-bag',
            '同框 36×36；點＝換背包', '背包本身就是一件裝備，右下數字＝格數。換更大背包，下方行囊格自動解鎖。',
            bx=BAG[0] - 22, by=BAG[1] + 2)
        s.L('馬車槽（預留・鎖）', WAGON[0], WAGON[1], 36, 36, '12/400 灰', '--slot-lock',
            '—（MVP 不可點）', '虛線斜紋＝架構預留，完整版開放。', bx=WAGON[0] + 38, by=WAGON[1] + 2)
    s.hr(12, 206, 228)
    # 行囊
    s.t(12, 210, 60, '行囊 6/6', 'f10b')
    s.t(150, 210, 76, '上限 24', 'f9', 'r dim')
    k = 0
    for r in range(5):
        for c in range(5):
            if k >= 24:
                break
            x, y = GX0 + c * GP, GY0 + r * GP
            if k < 6:
                g, n = PACK[k] if pack_full else ('', None)
                cell(s, x, y, GC, GC, g, cnt=n)
            else:
                s.box(x, y, GC, GC, 'lock')
            k += 1
    s.box(234, 230, 4, 216, 'p')
    s.box(234, 230, 4, 60, 'fill2')
    if badge:
        s.L('行囊：純 ICON 網格', GX0, GY0, 216, 216, '1 字代號＋右下 9/700 疊數', '--pack-cell',
            '每格 40×40 熱區；點＝使用／拖曳', '5 欄、格距 4。初始 6 格（粗布小包），斜紋虛線格＝換大包後解鎖，最多 24 格，超出可視時欄內捲動。格內只放 ICON＋數字，細節全靠提示卡。',
            bx=GX0 + 4 * GP + 2, by=GY0 + 4 * GP + 2)
    # 地面（溢出／剝皮／棄物暫放）
    s.hr(12, 452, 228)
    s.t(12, 456, 60, '地面', 'f10b')
    s.t(120, 456, 106, '拖入行囊＝拾取', 'f9', 'r dim')
    gr = ground or []
    for i in range(10):
        x, y = GX0 + (i % 5) * GP, 474 + (i // 5) * GP
        if i < len(gr):
            cell(s, x, y, GC, GC, gr[i][0], cnt=gr[i][1])
        else:
            s.box(x, y, GC, GC, 'ghost')
    if badge:
        s.L('地面暫放格', GX0, 474, 216, 84, '同行囊', '--ground',
            '格可拖曳至行囊', '採集／剝皮超出背包、棄物撤退丟下的物品暫放此處（離開節點即消失）。',
            bx=GX0 + 4 * GP + 2, by=474 + GP + 2)
    # 近處小圖
    s.hr(12, 566, 228)
    s.box(12, 572, 228, 104, 'map')
    for (x, y, g) in [(40, 600, '鎮'), (110, 600, '徑'), (180, 600, '林'), (110, 640, '礦'), (180, 640, '獸')]:
        s.box(x, y, 20, 20, 'p')
        s.t(x + 1, y + 2, 18, g, 'f10b', 'c')
    s.line(60, 610, 110, 610, kind='trail'); s.line(130, 610, 180, 610, kind='trail')
    s.line(120, 620, 120, 640, kind='trail'); s.line(190, 620, 190, 640, kind='trail')
    s.box(36, 596, 28, 28, 'glow')
    if badge:
        s.L('近處小圖', 12, 572, 228, 104, '10/700', '--minimap',
            '點＝中欄切世界地圖', '對齊 Underkeep 左下常駐小地圖；世界地圖情境時可收合。',
            bx=14, by=574)
    # 負重底條
    s.box(12, 684, 228, 24, 'p')
    s.t(14, 688, 16, '負', 'f10b', 'c')
    bar(s, 32, 692, 108, 8, 0.65, ticks=(0.40, 0.75))
    s.t(144, 688, 40, '52/80', 'f10')
    s.t(186, 688, 50, '×0.82', 'f10b', 'r')
    if badge:
        s.L('負重底條（最底）', 12, 684, 228, 24, '10/700', '--load',
            '滑過看公式', '細條刻度 40%／75%＝輕裝／常態重負／超載三段；右側＝行動速度倍率。',
            bx=14, by=670)


# ---------- 右欄 ----------
def draw_right(s, hp=(72, 90), food=(64, 100), fat=(38, 100), badge=True, low_hp=False, status=(), loc='灰窯鎮'):
    s.box(RX, Y0, RW, CH, 'z')
    IX = RX + 6
    s.box(IX, 12, 60, 60, 'art')
    s.t(IX + 1, 34, 58, '頭像', 'f10', 'c dim')
    s.t(IX + 68, 12, 136, '沈衡', 'f14b')
    s.box(IX + 68, 36, 64, 18, 'chip'); s.t(IX + 69, 38, 62, loc, 'f10', 'c')
    s.box(IX + 136, 36, 72, 18, 'chip'); s.t(IX + 137, 38, 70, '3日・申時', 'f10', 'c')
    s.box(IX + 68, 58, 16, 16, 'p'); s.t(IX + 68, 59, 16, '銀', 'f9b', 'c')
    s.t(IX + 88, 57, 80, '148', 'f12b')
    if badge:
        s.L('頭像＋地名＋時辰＋銀兩', IX, 12, 208, 62, '14/700・10/400', '--portrait',
            '頭像點＝角色細節', '不寫「現在：」等贅字；地名與時辰為小膠囊。', bx=IX + 2, by=14)
    rows = [('命', hp, low_hp), ('食', food, False), ('疲', fat, False)]
    y = 84
    for g, (v, m), danger in rows:
        s.box(IX, y, 16, 16, 'rd' if danger else 'p')
        s.t(IX, y + 1, 16, g, 'f10b', 'c' + (' red' if danger else ''))
        bar(s, IX + 20, y + 5, 138, 6, v / m, red=danger,
            ticks=(0.2,) if g == '食' else ((0.8,) if g == '疲' else ()))
        s.t(IX + 160, y, 48, f'{v}/{m}', 'f10b' if danger else 'f10', 'r' + (' red' if danger else ''))
        y += 22
    if badge:
        s.L('命／食／疲 三細條', IX, 84, 208, 60, '10/400', '--vital',
            '滑過看效果', '條高 6；食 20% 刻度、疲 80% 刻度＝臨界；臨界才轉紅框紅字，不寫說明句。',
            bx=IX + 186, by=150)
    # 狀態
    for i in range(4):
        x = IX + i * 26
        if i < len(status):
            s.box(x, 150, 22, 22, 'rd'); s.t(x, 153, 22, status[i], 'f10b', 'c red')
        else:
            s.box(x, 150, 22, 22, 'ghost')
    s.hr(IX, 182, 208)
    # 熟練度
    prof = [('戰', '戰鬥', 3, .45), ('採', '採集', 2, .62), ('獵', '狩獵', 1, .30), ('藥', '煉藥', 2, .18), ('商', '行腳', 1, .40)]
    y = 190
    for g, nm, lv, p in prof:
        s.box(IX, y, 16, 16, 'p'); s.t(IX, y + 1, 16, g, 'f10b', 'c')
        s.t(IX + 20, y + 1, 28, nm, 'f10')
        s.t(IX + 50, y + 1, 14, str(lv), 'f10b', 'r')
        bar(s, IX + 70, y + 6, 138, 4, p)
        y += 22
    if badge:
        s.L('5 類行為熟練度', IX, 190, 208, 104, '10/400', '--prof',
            '滑過看加成', '小圖示＋2 字名＋等級數字＋4px 細進度條；無標題框、無說明句。',
            bx=IX + 186, by=296)
    s.hr(IX, 312, 208)
    # 技能 ICON 格
    s.t(IX, 316, 40, '技能', 'f10b')
    sk = [('崩', '3', '主'), ('息', None, '被')] + [None] * 10
    for i, v in enumerate(sk):
        x, y = IX + (i % 4) * 54, 336 + (i // 4) * 54
        if v:
            g, cd, tag = v
            s.box(x, y, 46, 46, 'p')
            s.t(x + 1, y + 13, 44, g, 'f14b', 'c')
            if cd:
                s.t(x + 30, y + 31, 14, cd, 'f9b', 'r')
            s.t(x + 2, y + 1, 14, tag, 'f9', 'dim')
        else:
            s.box(x, y, 46, 46, 'ghost')
    if badge:
        s.L('已習技能 ICON 格 4×3', IX, 336, 208, 154, '14/700 代號', '--skill',
            '每格 46×46；點＝施放，滑過＝說明', '左上「主／被」＝主動／被動，右下數字＝冷卻回合；空虛線格＝待地城殘卷習得（12 格上限，超過欄內捲動）。',
            bx=IX + 162 + 30, by=336 + 108 + 2)
    s.hr(IX, 500, 208)
    # 追蹤賞金
    s.t(IX, 504, 40, '追蹤', 'f10b')
    s.box(IX, 524, 208, 34, 'p')
    s.box(IX + 4, 528, 26, 26, 'p'); s.t(IX + 4, 533, 26, '賞', 'f10b', 'c')
    s.t(IX + 36, 532, 110, '灰鬃狼 1/3', 'f11')
    s.t(IX + 150, 532, 54, '40兩', 'f10', 'r dim')
    # 系統鈕
    for i, nm in enumerate(['紮營', '日誌', '說明', '選單']):
        s.btn(IX + i * 53, 668, 49, 40, nm, '', 'f11')
    if badge:
        s.L('追蹤賞金＋系統鈕', IX, 524, 208, 184, '11/400', '--sys',
            '各鈕同框', '對齊 Underkeep 右下營火／紀錄／存檔小鈕；紮營＝就地生火（中欄切營火）。',
            bx=IX + 2, by=652)


# ---------- 中欄：世界地圖 ----------
NODES = {  # 名稱: (cx, cy, 類型, 圖示代號)  —— 沿用 v1 SHL-01 的節點拓撲，等比放大
    '渡陰關': (755, 97, 'town', '關'),
    '安全官道': (743, 206, 'way', ''),
    '灰窯鎮': (377, 341, 'town', '鎮'),
    '山嶺野徑': (644, 343, 'way', ''),
    '青霧藥林': (847, 343, 'zone', '林'),
    '亂葬古窯': (946, 250, 'dun', '窯'),
    '赤石廢礦': (644, 473, 'zone', '礦'),
    '枯骨獸徑': (847, 473, 'zone', '獸'),
    '沉淵祭窟': (470, 473, 'dun', '窟'),
}
EDGES = [('渡陰關', '安全官道', 'road'), ('安全官道', '灰窯鎮', 'road'), ('灰窯鎮', '山嶺野徑', 'selr'),
         ('山嶺野徑', '青霧藥林', 'selr'), ('青霧藥林', '亂葬古窯', 'trail'), ('山嶺野徑', '赤石廢礦', 'trail'),
         ('青霧藥林', '枯骨獸徑', 'trail'), ('赤石廢礦', '沉淵祭窟', 'trail')]


def draw_mid_map(s, badge=True):
    MAPH = 560
    s.box(MX, Y0, MW, MAPH, 'map')
    # 地形底（灰階淡化）
    s.box(770, 280, 190, 130, 'terr')      # 青霧林地
    s.box(560, 420, 170, 110, 'terr')      # 赤石岩場
    s.box(380, 430, 170, 100, 'terr')      # 祭窟荒原
    s.box(890, 190, 130, 110, 'terr')      # 古窯丘
    s.t(780, 392, 170, '青霧山', 'big', 'c')
    s.t(300, 160, 220, '灰窯原', 'big', 'c')
    for a, b in [((262, 250), (420, 210)), ((420, 210), (560, 150)), ((560, 150), (690, 40)), ((690, 40), (720, 6))]:
        s.line(*a, *b, kind='river')
    for a, b, k in EDGES:
        x1, y1 = NODES[a][:2]; x2, y2 = NODES[b][:2]
        s.line(x1, y1, x2, y2, kind=k)
    for nm, (cx, cy, tp, g) in NODES.items():
        if tp == 'way':
            s.box(cx - 7, cy - 7, 14, 14, 'p round')
            s.box(cx - 36, cy + 10, 72, 18, 'chip')
            s.t(cx - 35, cy + 11, 70, nm, 'f10', 'c')
            continue
        sz = 36 if tp == 'town' else 30
        cls = 'sel' if nm == '灰窯鎮' else 'p'
        s.box(cx - sz // 2, cy - sz // 2, sz, sz, cls)
        s.t(cx - sz // 2 + 1, cy - 8, sz - 2, g, 'f12b', 'c')
        s.box(cx - 34, cy + sz // 2 + 8, 68, 18, 'chip')
        s.t(cx - 33, cy + sz // 2 + 9, 66, nm, 'f11b' if tp == 'town' else 'f11', 'c')
    # 目前位置與選中目的地
    s.box(377 - 34, 341 - 46, 68, 18, 'dk'); s.t(377 - 33, 341 - 45, 66, '此地', 'f10b', 'c wh')
    s.box(847 - 17, 343 - 17, 34, 34, 'glow')
    s.box(636, 290, 184, 24, 'tip')
    s.t(638, 293, 180, '2時辰・食−8・疲+12・險低', 'f10', 'c')
    # 地圖左上圖例
    s.box(260, 14, 150, 24, 'chip')
    s.line(268, 26, 290, 26, kind='road'); s.t(293, 18, 30, '官道', 'f10')
    s.line(328, 26, 350, 26, kind='trail'); s.t(353, 18, 30, '野徑', 'f10')
    # 右上縮放
    s.btn(1012, 14, 28, 24, '＋', '', 'f12b'); s.btn(980, 14, 28, 24, '－', '', 'f12b')
    if badge:
        s.L('世界地圖舞台（沿用 v1 節點地圖）', MX, Y0, MW, MAPH, '11/400 地名・28/700 淡區名', '--map',
            '節點＝熱區；拖曳平移、＋－縮放', '796×560（中欄高 79%）。節點拓撲與連線直接沿用 v1 SHL-01 世界地圖（2 鎮、3 採集區、2 地城、官道與山嶺野徑），等比放大；淡斜紋＝地形區、淡粗線＝河，像素美術完成後換底圖、節點座標不變。',
            bx=MX + 2, by=Y0 + 36)
        s.L('節點：方 ICON＋短地名', 847 - 15, 473 - 15, 30, 30, '11/400', '--node',
            '方塊 30–36 為熱區', '鎮 36、區／窟 30、路口圓點 14；目前位置＝粗框＋黑「此地」。', bx=847 + 18, by=473 - 15)
        s.L('路徑：實線官道／虛線野徑／黑粗＝選中路線', 644, 343, 4, 4, '—', '--route',
            '—（不可點）', '選中目的地後自動高亮最短路線。', bx=560, by=322)
        s.L('目的地預告泡泡', 636, 290, 184, 24, '10/400', '--tip',
            '—（跟隨選中節點）', '路程／飽食／疲累／遇險一行講完。', bx=636 + 186, by=292)
    # 底部行動條
    y = Y0 + MAPH + 6
    s.box(MX, y, MW, YB - y, 'z')
    cell(s, MX + 8, y + 8, 40, 40, '林')
    s.t(MX + 56, y + 8, 120, '青霧藥林', 'f14b')
    s.t(MX + 56, y + 30, 120, '經 山嶺野徑', 'f10', 'dim')
    chips = [('時', '2時辰'), ('食', '−8'), ('疲', '+12'), ('險', '低'), ('負', '×0.82')]
    cx = MX + 184
    for g, v in chips:
        s.box(cx, y + 14, 84, 28, 'chip')
        s.box(cx + 4, y + 20, 16, 16, 'p'); s.t(cx + 4, y + 21, 16, g, 'f10b', 'c')
        s.t(cx + 24, y + 20, 56, v, 'f11b')
        cx += 90
    s.btn(MX + MW - 112, y + 10, 104, 36, '前往', 'pri', 'f14b')
    s.hr(MX + 8, y + 56, MW - 16)
    logs = ['在市集售出止血草 ×2，得銀 12 兩', '客棧歇息一夜，疲累清零']
    for i, l in enumerate(logs):
        s.t(MX + 8, y + 62 + i * 18, MW - 16, l, 'f11', 'dim')
    if badge:
        s.L('出發條（選中節點＋消耗＋前往）', MX, y, MW, 56, '14/700・11/700', '--depart',
            '「前往」104×36 唯一主鈕', '一行講完目的地、路程與飽食／疲累／遇險／負重倍率；不再有大清單框。',
            bx=MX + 8 + 40 + 2, by=y + 36 + 14 + 2)
        s.L('短紀錄 2 行', MX, y + 60, MW, 40, '11/400', '--log', '—（欄內可捲）', '', bx=MX + MW - 24, by=y + 62)


# ---------- 中欄：戰鬥 ----------
def draw_mid_combat(s, badge=True):
    SH = 500
    s.box(MX, Y0, MW, SH, 'art')
    s.box(MX + 8, 14, 120, 20, 'chip'); s.t(MX + 9, 16, 118, '亂葬古窯・二層', 'f10', 'c')
    s.box(MX + MW - 88, 14, 80, 20, 'chip'); s.t(MX + MW - 87, 16, 78, '第 3 回合', 'f10', 'c')
    # 行動順序
    s.t(560, 18, 50, '順序', 'f10', 'r dim')
    ox = 616
    for g, cls in [('你', 'dk'), ('屍', 'p'), ('狼', 'p')]:
        s.box(ox, 14, 24, 24, cls); s.t(ox, 18, 24, g, 'f10b', 'c' + (' wh' if cls == 'dk' else ''))
        ox += 30
    # 敵 A：窯屍（選中目標）
    ax, ay, aw, ah = 420, 170, 190, 300
    s.box(ax - 6, ay - 6, aw + 12, ah + 12, 'glow')
    s.box(ax, ay, aw, ah, 'enemy')
    s.t(ax, ay + 130, aw, '敵 A', 'f12', 'c dim')
    s.t(ax, 88, aw, '窯屍', 'f14b', 'c')
    bar(s, ax + 25, 112, 140, 6, 44 / 60)
    s.t(ax + 25, 120, 140, '44/60', 'f10', 'c')
    s.box(ax + 35, 138, 120, 24, 'warn')
    s.t(ax + 36, 141, 118, '⚔ 重擊 18–24', 'f12b', 'c red')
    s.t(ax + aw + 10, ay + 40, 40, '−12', 'f16b')
    # 敵 B：灰鬃狼
    bx, by, bw, bh = 700, 260, 200, 210
    s.box(bx, by, bw, bh, 'enemy')
    s.t(bx, by + 90, bw, '敵 B', 'f12', 'c dim')
    s.t(bx, 178, bw, '灰鬃狼', 'f14b', 'c')
    bar(s, bx + 30, 202, 140, 6, 20 / 32)
    s.t(bx + 30, 210, 140, '20/32', 'f10', 'c')
    s.box(bx + 50, 228, 100, 24, 'chip')
    s.t(bx + 51, 231, 98, '◆ 防禦 +6', 'f12b', 'c')
    if badge:
        s.L('第一人稱戰鬥舞台（不畫我方）', MX, Y0, MW, SH, '—', '--stage',
            '敵人本體＝選目標熱區', '796×500（中欄高 71%）。只正面直面敵人，我方狀態全在右欄；對齊 Underkeep／Grimrock／Operencia。',
            bx=MX + 2, by=40)
        s.L('敵名＋細血條（頭頂）', ax + 25, 88, 140, 44, '14/700・10/400', '--enemy-hp',
            '—', '血條 140×6，直接疊在敵人頭頂，不開大框。', bx=ax + 25 - 22, by=88 + 2)
        s.L('敵方意圖（紅＝重擊）', ax + 35, 138, 120, 24, '12/700 紅', '--intent-danger',
            '滑過看說明', '只有重擊／流血等危險意圖用紅框；防禦、蓄力等為灰框。', bx=ax + 35 + 122, by=140)
        s.L('行動順序條', 616, 14, 84, 24, '10/700', '--order', '滑過看速度',
            '負重拖慢速度時「你」會往後排。', bx=616 + 90, by=18)
        s.L('選中目標框', ax - 6, ay - 6, aw + 12, ah + 12, '—', '--target', '點敵人切換', '',
            bx=ax - 6 + 2, by=ay + ah - 12)
    # 棄物撤退確認條（展開態）
    y = Y0 + SH + 6
    s.box(MX, y, MW, 40, 'warn')
    s.t(MX + 8, y + 12, 64, '棄物撤退', 'f11b', 'red')
    ix = MX + 78
    for g, n, sel in [('鐵', '×2', True), ('皮', '×1', True), ('草', '×4', False), ('葉', '×3', False)]:
        cell(s, ix, y + 4, 32, 32, g, cnt=n, cls='sel' if sel else 'p', gf='f11b')
        ix += 36
    s.t(MX + 232, y + 4, 150, '撤退率 35% → 80%', 'f12b')
    s.t(MX + 232, y + 22, 150, '負重 ×0.82 → ×1.0', 'f10', 'dim')
    s.btn(MX + MW - 180, y + 6, 100, 28, '確認撤退', 'warn', 'f12b')
    s.btn(MX + MW - 72, y + 6, 64, 28, '取消', '', 'f12')
    if badge:
        s.L('棄物撤退確認條（點才展開）', MX, y, MW, 40, '11/700 紅', '--retreat',
            '物品格可勾選；確認 100×28', '勾選要丟的貨物，即時顯示撤退率與負重變化；被丟的物品落入左欄「地面」。',
            bx=MX + 400, by=y + 14)
    # 動作列
    y2 = y + 46
    acts = [('攻', '普攻', '1', None), ('崩', '崩岩擊', '2', None), ('藥', '金創', '3', '×1'), ('防', '防禦', '4', None), ('等', '待機', '5', None)]
    ax0 = MX + 8
    for g, nm, k, n in acts:
        s.box(ax0, y2, 72, 52, 'p')
        s.t(ax0 + 2, y2 + 1, 12, k, 'f9', 'dim')
        s.t(ax0 + 1, y2 + 8, 70, g, 'f14b', 'c')
        s.t(ax0 + 1, y2 + 32, 70, nm, 'f10', 'c')
        if n:
            s.t(ax0 + 52, y2 + 1, 18, n, 'f9b', 'r')
        ax0 += 78
    s.box(MX + MW - 128, y2, 120, 52, 'warn')
    s.t(MX + MW - 127, y2 + 8, 118, '撤', 'f14b', 'c red')
    s.t(MX + MW - 127, y2 + 32, 118, '棄物撤退', 'f10b', 'c red')
    if badge:
        s.L('緊湊動作列（圖示＋短字）', MX + 8, y2, 384, 52, '14/700・10/400', '--act',
            '每鈕 72×52；1–5 快捷鍵', '技能 ICON 與右欄技能格同步；丹藥鈕右上數量取自行囊。', bx=MX + 8 + 390, by=y2 + 2)
    # 戰鬥紀錄
    y3 = y2 + 58
    s.box(MX, y3, MW, YB - y3, 'z')
    logs = [('窯屍 蓄力：下回合重擊 18–24', 'red'), ('你以崩岩擊命中窯屍，造成 12 傷害', 'dim'), ('灰鬃狼 架起防禦 +6', 'dim')]
    for i, (l, c) in enumerate(logs):
        s.t(MX + 8, y3 + 4 + i * 16, MW - 40, l, 'f11', c)
    if badge:
        s.L('戰鬥短紀錄 3 行', MX, y3, MW, YB - y3, '11/400', '--log', '—', '', bx=MX + MW - 24, by=y3 + 4)


# ---------- 提示卡 ----------
def draw_tooltip(s, badge=True):
    s.layer = 1
    x, y, w, h = 10, 204, 232, 214
    s.box(x, y, w, h, 'tip')
    s.t(x + 8, y + 6, 150, '霧紋皮甲', 'f14b')
    s.box(x + w - 50, y + 8, 42, 18, 'p'); s.t(x + w - 49, y + 9, 40, '稀有', 'f10b', 'c')
    s.t(x + 8, y + 28, 200, '胸甲・重 6', 'f10', 'dim')
    s.t(x + 8, y + 48, 200, '護甲 14', 'f14b')
    s.hr(x + 8, y + 74, w - 16)
    afx = ['＋8 最大生命', '＋12% 流血抗性', '疲累累積 −6%']
    for i, a in enumerate(afx):
        s.box(x + 10, y + 86 + i * 24, 6, 6, 'fill')
        s.t(x + 22, y + 80 + i * 24, w - 30, a, 'f12')
    s.hr(x + 8, y + 156, w - 16)
    s.t(x + 8, y + 162, 110, '可賣 48兩', 'f10', 'dim')
    s.t(x + 120, y + 162, w - 128, '點＝穿脫', 'f10', 'r dim')
    s.t(x + 8, y + 182, w - 16, '對比現穿：護甲 ＋4', 'f10b')
    s.layer = 0
    if badge:
        s.L('裝備提示卡（Hover）', x, y, w, h, '14/700 名・12/400 詞綴', '--tooltip',
            '—（滑出即關）', '232 寬，錨定左欄、右緣 ≤ x242，絕不跨進中欄；最多 3 條詞綴、不分前後綴、不顯示詞綴等級。',
            bx=x + w - 24, by=y + h - 16)


# ---------- 中欄：城鎮 ----------
def draw_mid_town(s, badge=True):
    SH = 330
    s.box(MX, Y0, MW, SH, 'art')
    for i, nm in enumerate(['市集', '客棧', '賞金']):
        s.btn(MX + 8 + i * 68, 14, 64, 26, nm, 'sel' if i == 0 else '', 'f12b' if i == 0 else 'f12')
    s.box(MX + MW - 116, 14, 108, 26, 'chip'); s.t(MX + MW - 115, 18, 106, '灰窯鎮', 'f12b', 'c')
    for nm, x, y in [('市集', 420, 230), ('客棧', 640, 170), ('賞金', 860, 220), ('藥爐', 520, 120)]:
        s.box(x, y, 60, 22, 'chip'); s.t(x + 1, y + 3, 58, nm, 'f11', 'c')
        s.box(x + 26, y + 26, 8, 8, 'dk round')
    s.btn(MX + MW - 96, Y0 + SH - 36, 88, 28, '離鎮', '', 'f12b')
    if badge:
        s.L('城鎮場景＋3 小分頁', MX, Y0, MW, SH, '12/700', '--town-scene',
            '分頁 64×26；場景建築膠囊＝熱區', '796×330 大場景圖預留（對齊 Battle Brothers 城鎮）；建築小膠囊與分頁同步，可直接點。',
            bx=MX + 8 + 3 * 68 + 4, by=18)
    # 市集
    y = Y0 + SH + 6
    s.box(MX, y, MW, 252, 'z')
    s.t(MX + 8, y + 4, 60, '貨架', 'f10b')
    goods = [('囊', '48兩', None), ('刃', '36兩', None), ('甲', '30兩', None), ('靴', '12兩', None), ('盾', '18兩', None),
             ('藥', '9兩', None), ('糧', '3兩', '↓'), ('鹽', '4兩', '↓'), ('鐵', '5兩', None),
             ('帽', '8兩', None), ('戒', '22兩', None), ('囊', '96兩', None), None, None, None, None, None, None]
    for i, gd in enumerate(goods):
        gx, gy = MX + 8 + (i % 9) * 54, y + 22 + (i // 9) * 54
        if gd:
            g, p, ar = gd
            cell(s, gx, gy, 48, 48, g, cnt=p, cls='sel' if i == 0 else 'p', top=ar)
        else:
            s.box(gx, gy, 48, 48, 'ghost')
    s.t(MX + 8, y + 134, 120, '收購（你的貨）', 'f10b')
    buy = [('草', '3兩', '↑'), ('葉', '3兩', None), ('皮', '6兩', '↑'), ('鐵', '2兩', '↓'), ('礦', '—', None)]
    for i, (g, p, ar) in enumerate(buy):
        gx = MX + 8 + i * 54
        cell(s, gx, y + 152, 48, 48, g, cnt=p, top=ar)
    s.t(MX + 8, y + 210, 480, '↑ 高於均價　↓ 低於均價　行囊格右鍵＝直接賣出', 'f10', 'dim')
    if badge:
        s.L('貨架：商品 ICON 網格', MX + 8, y + 22, 480, 102, '12/700 代號＋9/700 價', '--shop-cell',
            '每格 48×48；點＝選入交易欄，雙擊＝直接買', '右下＝銀兩價、右上箭頭＝價差（↑紅＝高）；細節靠提示卡（錨定中欄右側交易欄，不蓋貨架）。',
            bx=MX + 8 + 9 * 54 - 2 - 18, by=y + 4)
        s.L('收購價格（你的貨）', MX + 8, y + 152, 264, 48, '同上', '--shop-sell',
            '每格 48×48', '只列你行囊裡此鎮會收的貨；跑商可選。', bx=MX + 8 + 5 * 54 + 4, by=y + 154)
    # 快速交易欄
    tx = MX + 506
    s.box(tx, y + 22, 282, 222, 'p')
    cell(s, tx + 8, y + 30, 48, 48, '囊', cls='sel')
    s.t(tx + 64, y + 30, 150, '行旅皮囊', 'f14b')
    s.t(tx + 64, y + 52, 210, '10 格・重 2・現 6 格', 'f10', 'dim')
    s.btn(tx + 8, y + 92, 32, 28, '－', '', 'f12b')
    s.box(tx + 44, y + 92, 48, 28, 'p'); s.t(tx + 45, y + 97, 46, '1', 'f12b', 'c')
    s.btn(tx + 96, y + 92, 32, 28, '＋', '', 'f12b')
    s.t(tx + 140, y + 94, 134, '48兩', 'f18b', 'r')
    s.t(tx + 8, y + 132, 266, '銀 148 → 100', 'f12', 'r')
    s.btn(tx + 8, y + 160, 130, 36, '買', 'pri', 'f14b')
    s.btn(tx + 144, y + 160, 130, 36, '賣出所選', '', 'f12b')
    s.t(tx + 8, y + 204, 266, '換包後舊包落入行囊／地面', 'f10', 'dim')
    if badge:
        s.L('快速交易欄', tx, y + 22, 282, 222, '14/700・18/700 價', '--trade',
            '買／賣 130×36', '對齊 Stoneshard／Vagrus：選中商品＋數量＋單一價格＋買賣鈕，無長清單。',
            bx=tx + 282 - 22, by=y + 4)
    # 客棧＋賞金（其他分頁的緊湊樣式）
    y2 = y + 258
    s.box(MX, y2, 392, 60, 'z'); s.box(MX + 404, y2, 392, 60, 'z')
    s.t(MX + 8, y2 + 4, 40, '客棧', 'f10b')
    for i, (g, nm, p) in enumerate([('宿', '歇一夜', '8兩'), ('食', '熱湯', '3兩'), ('爐', '藥爐', '免')]):
        bx0 = MX + 48 + i * 112
        s.box(bx0, y2 + 8, 106, 44, 'p')
        s.box(bx0 + 4, y2 + 14, 32, 32, 'p'); s.t(bx0 + 4, y2 + 22, 32, g, 'f12b', 'c')
        s.t(bx0 + 40, y2 + 12, 62, nm, 'f11')
        s.t(bx0 + 40, y2 + 30, 62, p, 'f11b')
    s.t(MX + 412, y2 + 4, 40, '賞金', 'f10b')
    for i, (g, nm, p) in enumerate([('狼', '灰鬃狼×3', '40兩'), ('窯', '古窯清理', '60兩')]):
        bx0 = MX + 452 + i * 168
        s.box(bx0, y2 + 8, 162, 44, 'p')
        s.box(bx0 + 4, y2 + 14, 32, 32, 'p'); s.t(bx0 + 4, y2 + 22, 32, g, 'f12b', 'c')
        s.t(bx0 + 40, y2 + 12, 118, nm, 'f11')
        s.t(bx0 + 40, y2 + 30, 118, p, 'f11b')
    if badge:
        s.L('客棧／賞金分頁（緊湊圖示條）', MX, y2, MW, 60, '11/400', '--inn-bounty',
            '每條同框；點＝執行／接取', '本圖並列示意兩分頁樣式；實際一次只顯示目前分頁，位置同市集區。',
            bx=MX + 8 + 34, by=y2 + 5)
    # 紀錄
    y3 = y2 + 66
    s.box(MX, y3, MW, YB - y3, 'z')
    s.t(MX + 8, y3 + 4, MW - 40, '藥鋪收購止血草 ↑（渡陰關缺貨）', 'f11', 'dim')
    s.t(MX + 8, y3 + 22, MW - 40, '客棧掌櫃：古窯近日鬧屍', 'f11', 'dim')


# ---------- 中欄：荒野 ----------
def draw_mid_wild(s, badge=True):
    SH = 404
    s.box(MX, Y0, MW, SH, 'art')
    s.box(MX + 8, 14, 110, 24, 'chip'); s.t(MX + 9, 17, 108, '青霧藥林', 'f12b', 'c')
    s.box(MX + 124, 14, 60, 24, 'chip'); s.t(MX + 125, 18, 58, '險 低', 'f10', 'c')
    for nm, n, x, y in [('藥叢', '3', 360, 260), ('藥叢', '2', 520, 300), ('礦脈', '1', 760, 200), ('獸跡', '', 900, 300)]:
        s.box(x, y, 44, 44, 'ell')
        s.box(x - 8, y + 48, 60, 20, 'chip'); s.t(x - 7, y + 50, 58, nm + (f' {n}' if n else ''), 'f10', 'c')
    s.box(620, 330, 48, 40, 'ell'); s.t(600, 374, 88, '營火位', 'f10', 'c dim')
    if badge:
        s.L('荒野場景＋採集點標記', MX, Y0, MW, SH, '10/400', '--wild-scene',
            '虛線圈＝可點採集點', '796×404（中欄高 57%）；點場景上的藥叢／礦脈／獸跡＝直接採集或追蹤，數字＝剩餘次數。',
            bx=MX + 190, by=18)
    y = Y0 + SH + 6
    acts = [('草', '採藥', '1時辰・疲+4'), ('礦', '挖礦', '2時辰・疲+10'), ('獸', '追蹤', '1時辰・入戰'), ('火', '紮營', '生火・夜警')]
    for i, (g, nm, c) in enumerate(acts):
        bx0 = MX + i * 200
        s.box(bx0, y, 196, 52, 'sel' if i == 3 else 'p')
        s.box(bx0 + 6, y + 8, 36, 36, 'p'); s.t(bx0 + 6, y + 18, 36, g, 'f12b', 'c')
        s.t(bx0 + 50, y + 6, 140, nm, 'f12b')
        s.t(bx0 + 50, y + 26, 140, c, 'f10', 'dim')
    if badge:
        s.L('採集動作鈕（圖示＋短耗）', MX, y, MW, 52, '12/700・10/400', '--gather',
            '每鈕 196×52', '與場景採集點同步；挖礦顯著加重，耗時與疲累一行數字講完。', bx=MX + 170, by=y + 4)
    # 營火 3 配方
    y2 = y + 58
    s.box(MX, y2, MW, 168, 'z')
    s.t(MX + 8, y2 + 4, 60, '營火', 'f10b')
    s.t(MX + 60, y2 + 4, 80, '煉藥 2', 'f10', 'dim')
    recs = [('創', '金創藥水', '命 +30', [('草', '2/4')], True),
            ('神', '提神湯藥', '疲 −25', [('葉', '2/3')], True),
            ('乾', '烤肉乾糧', '食 +35', [('肉', '0/1')], False)]
    for i, (g, nm, eff, mats, ok) in enumerate(recs):
        rx = MX + 8 + i * 262
        s.box(rx, y2 + 22, 254, 138, 'p')
        cell(s, rx + 8, y2 + 30, 44, 44, g, gf='f14b')
        s.t(rx + 60, y2 + 32, 120, nm, 'f12b')
        s.t(rx + 60, y2 + 52, 120, eff, 'f11', 'dim')
        mx = rx + 8
        for mg, mn in mats:
            cell(s, mx, y2 + 86, 36, 36, mg, cnt=mn, cls='p' if ok else 'ghost')
            mx += 40
        s.t(mx + 2, y2 + 94, 20, '→', 'f14b', 'c')
        cell(s, mx + 26, y2 + 86, 36, 36, g, cls='ghost')
        s.btn(rx + 182, y2 + 86, 64, 36, '製', 'pri' if ok else 'off', 'f14b')
        s.t(rx + 8, y2 + 128, 238, '需 營火' if g == '乾' else '營火／藥爐', 'f10', 'dim')
    if badge:
        s.L('營火 3 配方卡', MX + 8, y2 + 22, 778, 138, '12/700・右下 9/700 需/有', '--recipe',
            '「製」64×36；不足時灰虛線', '材料小格右下＝需要／持有；一鍵製作直接扣左欄行囊，無小遊戲。', bx=MX + 8 + 3 * 262 - 34 - 8, by=y2 + 5)
    y3 = y2 + 174
    s.box(MX, y3, MW, YB - y3, 'z')
    s.t(MX + 8, y3 + 4, MW - 40, '採得止血草 ×2（採集 +1）', 'f11', 'dim')
    s.t(MX + 8, y3 + 22, MW - 40, '林間傳來狼嚎，夜警風險上升', 'f11', 'dim')


# ---------- 稀有度樣張（圖例下方，不在舞台內） ----------
RAR_HTML = '''<div class="extra"><b>提示卡 4 階稀有度精簡樣張</b>（同一張 232 寬卡；只換右上標籤與邊框；最多 3 條詞綴、不分前後綴、無詞綴等級）
<div style="display:flex;gap:8px;margin-top:6px">%s</div></div>'''
def rar_card(name, tag, border, base, afx, extra=None):
    lines = ''.join(f'<div style="font-size:11px;line-height:16px">▪ {a}</div>' for a in afx) or '<div style="font-size:11px;line-height:16px;color:#777">（無詞綴）</div>'
    if extra:
        lines += f'<div style="font-size:11px;line-height:16px;font-weight:700;border-top:1px dashed #999;margin-top:3px;padding-top:2px">◆ {extra}</div>'
    return (f'<div style="width:186px;border:{border};padding:6px 7px;background:#fff;box-shadow:2px 2px 0 #bbb">'
            f'<div style="display:flex;justify-content:space-between;font-weight:700;font-size:12px"><span>{name}</span>'
            f'<span style="border:1px solid #000;font-size:10px;padding:0 3px">{tag}</span></div>'
            f'<div style="font-size:10px;color:#555">{base}</div><div style="border-top:1px solid #999;margin:4px 0 3px"></div>{lines}</div>')
RARITY = RAR_HTML % ''.join([
    rar_card('粗布帽', '凡品', '1px solid #999', '頭盔・護甲 3', []),
    rar_card('行旅布靴', '良品', '1px solid #000', '靴子・護甲 4', ['＋5% 行動速度', '負重上限 ＋4']),
    rar_card('霧紋皮甲', '稀有', '2px solid #000', '胸甲・護甲 14', ['＋8 最大生命', '＋12% 流血抗性', '疲累累積 −6%']),
    rar_card('鎮淵古刃', '傳奇', '3px double #000', '主手・傷害 9–14', ['＋14% 傷害', '＋6 命中', '＋10% 剝皮收成'], '對重擊意圖敵人首擊必暴'),
])


# ---------- 畫面組合 ----------
COMMON_NOTES = [
    '格線：外距／欄距 6｜左 240（18.8%）｜中 796（62.2%）｜右 220（17.2%）｜6+240+6+796+6+220+6＝1280；單屏無全頁捲動。v1 中欄 568（44.4%）→ v2 796（62.2%），＋228px／＋17.8 個百分點。',
    '方格內單字（刃、甲、草、鐵…）＝灰盒期 ICON 代號，像素美術到位後換成圖示；格內絕不放品名或說明，細節一律靠 Hover 提示卡。',
    '紅色只用於：編號徽章、敵方重擊意圖、低血臨界、棄物撤退、價差↑。',
]


def v2_01():
    s = Screen('SHL-v2-01', '世界地圖（三欄主草稿）', '中欄＝世界地圖情境：沿用 v1 世界地圖節點拓撲作底，大地圖滿版＋底部精簡出發條；左右窄欄全圖示化。')
    draw_left(s)
    draw_mid_map(s)
    draw_right(s)
    for n in COMMON_NOTES:
        s.note(n)
    s.note('世界地圖底圖：/workspace 與 /cursor/stores 下找不到任何手繪或像素世界地圖圖檔；唯一畫過的《山海錄》世界地圖是 v1 SHL-01 中欄的節點地圖，本版直接沿用其節點、連線與相對位置（等比放大 ×1.45／×2.09），並加淡化地形區示意。')
    return s


def v2_02():
    s = Screen('SHL-v2-02', '第一人稱戰鬥＋裝備提示卡', '中欄＝回合戰鬥：只畫敵人與頭頂意圖，不畫我方；棄物撤退確認條展開態；左欄示範滑過胸甲的提示卡（不跨進中欄）。')
    draw_left(s, hover='胸甲', badge=False, ground=[('鐵', '×1')])
    draw_tooltip(s)
    draw_mid_combat(s)
    draw_right(s, hp=(24, 90), food=(52, 100), fat=(58, 100), low_hp=True, status=('血',), loc='亂葬古窯')
    for n in COMMON_NOTES:
        s.note(n)
    s.note('提示卡防遮擋：只錨定在左欄內（x 10–242），在被滑過的槽位正下方展開，蓋住行囊區暫時資訊；接近底部時往上翻。中欄（x≥252）與敵方意圖區永遠不被提示卡覆蓋。中欄商品的提示卡則錨定在中欄右側交易欄位置。')
    s.note('左欄本圖不重複編號（同 SHL-v2-01）；右欄示範低血 24/90 → 命條轉紅＋紅框，狀態格「血」＝流血。')
    s.extra = RARITY
    return s


def v2_03():
    s = Screen('SHL-v2-03-town', '城鎮：市集／客棧／賞金', '中欄＝城鎮情境（真實 796 寬）：大場景＋3 小分頁，市集改商品 ICON 網格＋快速交易欄；客棧與賞金壓成圖示條。')
    draw_left(s, badge=False)
    draw_mid_town(s)
    draw_right(s, badge=False)
    for n in COMMON_NOTES:
        s.note(n)
    s.note('左右欄同 SHL-v2-01，本圖不重複編號。賣貨：行囊格右鍵直接賣，或拖到「收購」區。')
    return s


def v2_04():
    s = Screen('SHL-v2-04-wild', '荒野：採集＋營火製藥', '中欄＝荒野情境（真實 796 寬）：場景上直接點採集點，下方採集動作鈕與營火 3 配方卡，全部圖示＋短數字。')
    draw_left(s, badge=False, ground=[('草', '×2')])
    draw_mid_wild(s)
    draw_right(s, badge=False, food=(48, 100), fat=(44, 100), loc='青霧藥林')
    for n in COMMON_NOTES:
        s.note(n)
    s.note('左右欄同 SHL-v2-01，本圖不重複編號。行囊已滿 6/6，新採的止血草 ×2 落在左欄「地面」，示範背包容量壓力。')
    return s


SCREENS = [('shl', 'SHL-v2-01-worldmap', v2_01), ('shl', 'SHL-v2-02-combat-tooltip', v2_02),
           ('shl', 'SHL-v2-03-town', v2_03), ('shl', 'SHL-v2-04-wild', v2_04)]
