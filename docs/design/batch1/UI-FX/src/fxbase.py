# 共用繪圖：右欄（含時段條）、城鎮／荒野／地圖中欄、浮出標籤、時間軸
from fxlib import FX, BoardScreen
import v2base as V
from v2base import cell, bar, LX, RX, MX, MW, Y0, YB

IX = RX + 8          # 1062，對齊實機右欄內距 8
SC = 'f9'

# 左欄對齊 main@de91435（欄內座標 + (LX, Y0)）
PACK_X, PACK_Y, GP, GC = LX + 10, Y0 + 218, 44, 40   # 16, 224
BAG = (88, 164, 36, 36)
WAGON = (130, 164, 36, 36)
SLOTS_LIVE = {  # 部位: (x, y, w, h, 圖示, 稀有角標, 空?)
    '頭盔': (106, 12, 40, 40, '冠', None, False),
    '護身符': (156, 18, 28, 28, '符', None, True),
    '主手': (20, 36, 44, 88, '刃', '良', False),
    '副手': (188, 36, 44, 88, '盾', None, False),
    '胸甲': (102, 58, 48, 64, '甲', '稀', False),
    '手套': (20, 132, 44, 40, '手', None, False),
    '左戒': (70, 134, 26, 26, '戒', None, False),
    '腰帶': (102, 128, 48, 22, '帶', None, False),
    '右戒': (156, 134, 26, 26, '戒', None, True),
    '靴子': (188, 132, 44, 40, '靴', '良', False),
}
PACK_ITEMS = [('草', '×4'), ('葉', '×3'), ('鐵', '×2'), ('藥', '×1'), ('皮', '×1'), ('糧', '×1')]
FACTIONS = [
    ('曉', '破曉軍團', '12', 0.40),
    ('星', '天星商會', '8', 0.30),
    ('鴉', '鴉衛', '4', 0.15),
    ('將', '鎮西府', '—', 0),
    ('裂', '拜裂教', '—', 0),
]
# 右欄（插入時段條後，命／食／疲相對實機下移 24px；委託／傳聞／系統鈕保持實機高度）
PHASE_Y = 78
VIT_Y = {'命': 108, '飽食': 128, '疲累': 148}  # 條的舞台 y
ATTR_Y, PTAB_Y, PROF_Y = 202, 242, 266
QUEST_Y, RUMOR_Y, SYS_Y = 418, 544, 666
EDGE_X, EDGE_W = MX + MW - 82, 78  # 中欄右緣差值欄

def pack_xy(k):
    return PACK_X + (k % 5) * GP, PACK_Y + (k // 5) * GP

# ---------- 小工具 ----------
def fl(s, x, y, w, text, tier='S', h=None, layer=1):
    """浮出標籤（數字跳出／toast）：小＝虛線無粗；關鍵＝黑細框 bold；重大＝黑粗框＋陰影"""
    h = h or {'S': 18, 'K': 22, 'M': 28}[tier]
    f = {'S': 'f11', 'K': 'f12b', 'M': 'f16b'}[tier]
    lh = {'f11': 15, 'f12b': 16, 'f16b': 22}[f]
    s.box(x, y, w, h, 'f' + tier, layer=layer)
    s.t(x + 2, y + (h - lh) // 2, w - 4, text, f, 'c', layer=layer)

def path(s, x1, y1, x2, y2, layer=1):
    s.line(x1, y1, x2, y2, layer=layer, kind='trail')
    s.box(x2 - 3, y2 - 3, 6, 6, 'dk round', layer=layer)

def tint(s, x, y, w, h, a, layer=1):
    s.box(x, y, w, h, 'tint', layer=layer, extra=f'background:rgba(0,0,0,{a})')

def phase_bar(s, x, y, phase, w=144, mark=0.5, layer=None, labels=True):
    """四時段條：清晨 05–08／白天 08–17／黃昏 17–20／黑夜 20–05；段寬 3／9／3／9（已定）；mark＝該段內位置 0–1"""
    segs = [18, 54, 18, 54]
    px = x
    for i, sw in enumerate(segs):
        sw2 = int(round(sw * w / 144))
        s.box(px, y, sw2, 8, f'ph{i}', layer=layer)
        if labels:
            s.t(px, y + 10, sw2, '晨晝昏夜'[i], 'f9', 'c', layer=layer)
        if i == phase:
            mx = px + int(sw2 * mark)
            s.box(mx - 1, y - 3, 3, 14, 'mk', layer=layer)
        px += sw2

def hint_key(s, x, y, w, k, layer=None):
    s.box(x, y, w, 16, 'chip', layer=layer)
    s.t(x + 1, y, w - 2, k, 'f9', 'c', layer=layer)

# ---------- 左欄（對齊現況：人形＋行囊＋勢力＋負重；小地圖已撤；地面依 16:07 已知變更自草稿移除） ----------
def draw_left(s, badge=False, pack_full=True):
    s.box(LX, Y0, V.LW, V.CH, 'z')
    for part, (x, y, w, h, g, rar, empty) in SLOTS_LIVE.items():
        cell(s, x, y, w, h, '' if empty else g, cls='ghost' if empty else 'p',
             gcls='c' if not empty else 'c off', corner=None if empty else rar)
        if empty:
            s.t(x + 1, y + (h - 16) // 2, w - 2, g, 'f11', 'c off')
    x, y, w, h = BAG
    cell(s, x, y, w, h, '囊', cnt='6')
    x, y, w, h = WAGON
    cell(s, x, y, w, h, '車', cls='lock', gcls='c off')
    # 行囊（實機 top:200 / packgrid top:218）
    s.t(16, 206, 70, '行囊 6/6', 'f10b')
    s.t(150, 206, 76, '上限 24', 'f9', 'r dim')
    k = 0
    for r in range(5):
        for c in range(5):
            if k >= 24:
                break
            x, y = pack_xy(k)
            if k < 6:
                g, n = PACK_ITEMS[k] if pack_full else ('', None)
                cell(s, x, y, GC, GC, g, cnt=n)
            else:
                s.box(x, y, GC, GC, 'lock')
            k += 1
    # 勢力聲望（實機佔原小地圖區；地面格已自本包草稿拿掉，列表上移填補）
    s.t(16, 448, 80, '勢力', 'f10b')
    s.t(100, 448, 126, '點開看聲望', 'f9', 'r dim')
    for i, (g, nm, lv, p) in enumerate(FACTIONS):
        y = 466 + i * 34
        s.box(12, y, 228, 32, 'p')
        s.box(16, y + 4, 24, 24, 'p'); s.t(16, y + 8, 24, g, 'f10b', 'c')
        s.t(44, y + 2, 70, nm, 'f10')
        s.t(114, y + 2, 24, lv, 'f10b', 'r')
        bar(s, 142, y + 13, 70, 5, p)
        s.t(214, y + 8, 22, '', 'f9', 'dim')
    # 負重底條（實機 top:678）
    s.box(12, 684, 228, 24, 'p')
    s.t(14, 688, 32, '負重', 'f10b')
    bar(s, 48, 692, 92, 8, 0.65, ticks=(0.40, 0.75))
    s.t(144, 688, 40, '52/80', 'f10')
    s.t(186, 688, 50, '×0.82', 'f10b', 'r')

# ---------- 右欄 ----------
def right(s, clock='17:40', phase=2, mark=0.5, silver='148', vit=((72, 80), (64, 100), (38, 100)),
          profs=None, quests=None, rumors=1, loc='灰窯鎮', date='春・第3日', dang=None, ptab='山野'):
    s.box(RX, Y0, V.RW, V.CH, 'z')
    s.box(IX, 14, 60, 60, 'art'); s.t(IX + 1, 36, 58, '頭像', 'f10', 'c dim')
    s.t(IX + 68, 12, 136, '沈衡', 'f14b')
    s.box(IX + 68, 34, 82, 20, 'chip'); s.t(IX + 69, 36, 80, loc, 'f10', 'c')
    s.box(RX + 160, 34, 52, 20, 'chip'); s.t(RX + 161, 36, 50, date.replace('第',''), 'f9', 'c')
    s.box(IX + 68, 58, 16, 16, 'p'); s.t(IX + 68, 59, 16, '銀', 'f9b', 'c')
    sil = silver if len(str(silver)) <= 8 else str(silver).split()[-1]
    s.t(IX + 88, 57, 36, sil, 'f12b')
    s.box(RX + 122, 57, 90, 20, 'chip'); s.t(RX + 123, 59, 88, clock, 'f11b', 'c')
    # 時段條（本包新增，插在頭區與命／食／疲之間；鐘點保留為次級）
    s.box(IX, PHASE_Y, 204, 24, 'p')
    phase_bar(s, IX + 4, PHASE_Y + 4, phase, 144, mark)
    s.t(IX + 152, PHASE_Y + 6, 48, ['清晨', '白天', '黃昏', '黑夜'][phase], 'f9', 'r dim')
    # 命／食／疲（條上仍用一字標，與實機 16px 格一致；浮出數字用全稱）
    names = [('命', '命'), ('食', '飽食'), ('疲', '疲累')]
    for i, ((g, full), (v, m)) in enumerate(zip(names, vit)):
        y = [VIT_Y['命'], VIT_Y['飽食'], VIT_Y['疲累']][i]
        dg = dang and (dang.get(g) or dang.get(full))
        s.box(IX, y, 16, 16, 'rd' if dg else 'p')
        s.t(IX, y + 1, 16, g, 'f10b', 'c' + (' red' if dg else ''))
        ticks = (0.2,) if g == '食' else ((0.8,) if g == '疲' else ())
        bar(s, IX + 20, y + 5, 130, 6, v / m, red=bool(dg), ticks=ticks)
        s.t(IX + 152, y, 52, f'{v}/{m}', 'f10b' if dg else 'f10', 'r' + (' red' if dg else ''))
    # 狀態列示意
    s.t(IX, 171, 204, '護甲 6・傷 8–12', 'f9', 'dim')
    s.hr(IX, 198, 204)
    # 7 素質
    attrs = [('體', '7'), ('膂', '6'), ('身', '5'), ('靈', '8'), ('心', '5'), ('悟', '6'), ('口', '4')]
    aw = 28
    for i, (ag, av) in enumerate(attrs):
        x = IX + i * (aw + 1)
        s.box(x, ATTR_Y, aw, 36, 'p')
        s.t(x, ATTR_Y + 2, aw, ag, 'f9', 'c dim')
        s.t(x, ATTR_Y + 16, aw, av, 'f11b', 'c')
    # 熟練度四分頁
    tabs = ['武藝', '山野', '百工', '行走']
    tw = 49
    for i, nm in enumerate(tabs):
        x = IX + i * (tw + 2)
        on = nm == ptab
        s.box(x, PTAB_Y, tw, 20, 'sel' if on else 'p')
        s.t(x, PTAB_Y + 3, tw, nm, 'f9b' if on else 'f9', 'c')
    pr = profs or [('採藥', 4, .62), ('挖礦', 1, .30), ('追蹤', 0, .0), ('剝皮', 0, .0), ('野營', 1, .18), ('探幽', 6, .40)]
    for i, (nm, lv, p_) in enumerate(pr[:6]):
        y = PROF_Y + i * 19
        s.t(IX, y + 1, 28, nm, 'f10')
        s.t(IX + 28, y + 1, 18, str(lv), 'f10b', 'r')
        bar(s, IX + 50, y + 6, 118, 5, p_)
        nxt = '→25' if 0 < p_ < 1 else ('→10' if lv == 0 else '')
        s.t(IX + 172, y + 1, 32, nxt, 'f9', 'dim')
    # 委託／傳聞／系統鈕：對齊實機高度
    qs = quests if quests is not None else [('灰鬃狼', '2/3', '40兩'), ('古窯清理', '0/1', '60兩')]
    s.t(IX, QUEST_Y, 120, f'委託 {len(qs)}', 'f10b')
    s.t(IX + 120, QUEST_Y, 84, '點開看全部', 'f9', 'r dim')
    for i, q in enumerate(qs[:2]):
        nm, pg, rw = q[:3]; done = len(q) > 3 and q[3]
        y = 436 + i * 34
        s.box(IX, y, 204, 32, 'sel' if done else 'p')
        if done:
            s.box(IX + 4, y + 4, 24, 24, 'dk'); s.t(IX + 4, y + 8, 24, '✓', 'f10b', 'c wh')
        else:
            s.box(IX + 4, y + 4, 24, 24, 'p'); s.t(IX + 4, y + 8, 24, nm[0], 'f10b', 'c')
        s.t(IX + 32, y + 2, 110, nm, 'f11b' if done else 'f11')
        s.t(IX + 32, y + 16, 110, pg, 'f9', '' if done else 'dim')
        s.t(IX + 140, y + 8, 60, rw, 'f10', 'r dim')
    s.t(IX, RUMOR_Y, 120, f'傳聞 {rumors}/8', 'f10b')
    s.t(IX + 120, RUMOR_Y, 84, '點開看全文', 'f9', 'r dim')
    s.box(IX, 562, 204, 32, 'p')
    s.box(IX + 4, 566, 24, 24, 'p'); s.t(IX + 4, 570, 24, '聞', 'f10b', 'c')
    s.t(IX + 32, 564, 168, '祕寶・亂葬古窯', 'f11')
    s.t(IX + 32, 578, 168, '3 天', 'f9', 'dim')
    bw, gap = 39, 2
    for i, nm in enumerate(['記事', '人物', '日誌', '說明', '選單']):
        s.btn(IX + i * (bw + gap), SYS_Y, bw, 40, nm, '', 'f11')

# ---------- 中欄 ----------
def top_chip(s, text, w=90):
    s.box(MX + 8, 14, w, 24, 'chip', layer=0); s.t(MX + 9, 17, w - 2, text, 'f12b', 'c')

def town_scene(s, tintA=0.0, quiet=False):
    s.box(MX, Y0, MW, 520, 'art')
    top_chip(s, '灰窯鎮')
    s.btn(MX + MW - 100, 14, 92, 24, '離開・地圖', '', 'f11')
    B = [('天星分號', 70, 78, 80), ('鎮公所', 340, 60, 64), ('老窯客棧', 590, 70, 80), ('窯神廟', 40, 250, 64),
         ('回春藥鋪', 130, 400, 80), ('石記鐵鋪', 600, 280, 80)]
    for nm, x, y, w in B:
        s.box(MX + x, y, w + 10, 50, 'ghost')
        s.box(MX + x + 2, y + 54, w + 6, 18, 'chip'); s.t(MX + x + 3, y + 55, w + 4, nm, 'f10', 'c')
    s.box(MX + 380, 480, 60, 24, 'chip'); s.t(MX + 381, 483, 58, '出口', 'f10', 'c')
    for (x, y) in [(300, 250), (470, 300), (440, 190)]:
        s.box(MX + x, y, 8, 8, 'dk round')
    s.box(MX + 400, 280, 22, 22, 'ell')
    if tintA:
        tint(s, MX, Y0, MW, 520, tintA)

def info_strip(s, text, btn='探查（1 小時）'):
    y = 532
    s.box(MX, y, MW, 44, 'z')
    s.t(MX + 10, y + 12, 560, text, 'f12', 'dim')
    if btn:
        s.btn(MX + MW - 142, y + 6, 134, 32, btn, '', 'f12b')

def log_box(s, y, lines, newest=0, h=None):
    h = h or (YB - y)
    s.box(MX, y, MW, h, 'z')
    for i, l in enumerate(lines):
        s.t(MX + 12, y + 6 + i * 18, MW - 40, l, 'f11', '' if i == newest else 'dim')
    return y

def wild_scene(s, tintA=0.0, nodes=None, fire=True):
    SH = 404
    s.box(MX, Y0, MW, SH, 'art')
    top_chip(s, '青霧藥林', 110)
    s.box(MX + 124, 14, 72, 24, 'chip'); s.t(MX + 125, 18, 70, '危險 低', 'f10', 'c')
    s.btn(MX + MW - 100, 14, 92, 24, '離開・地圖', '', 'f11')
    nodes = nodes or [('藥叢', '4', 360, 250, '草'), ('藥叢', '2', 520, 300, '草'), ('礦脈', '1', 760, 170, '礦'), ('獸跡', '1', 900, 290, '獸')]
    for nm, n, x, y, g in nodes:
        s.box(x, y, 44, 44, 'ell')
        s.t(x, y + 14, 44, g, 'f12b', 'c')
        s.box(x - 8, y + 48, 60, 20, 'chip'); s.t(x - 7, y + 50, 58, f'{nm} {n}', 'f10', 'c')
    if fire:
        s.box(MX + 380, 330, 48, 40, 'ell'); s.t(MX + 360, 374, 88, '營火・燃', 'f10', 'c dim')
    if tintA:
        tint(s, MX, Y0, MW, SH, tintA)

def action_cards(s, sel=None, y=416):
    acts = [('草', '採藥', '1 小時・疲累 +4'), ('礦', '挖礦', '2 小時・疲累 +10'), ('獸', '追蹤', '1 小時・入戰'), ('探', '探查', '1 小時・四處翻找'), ('火', '露宿', '8 小時・夜警')]
    for i, (g, nm, c) in enumerate(acts):
        bx = MX + i * 160
        s.box(bx, y, 156, 52, 'sel' if sel == i else 'p')
        s.box(bx + 6, y + 8, 36, 36, 'p'); s.t(bx + 6, y + 18, 36, g, 'f12b', 'c')
        s.t(bx + 48, y + 6, 104, nm, 'f12b')
        s.t(bx + 48, y + 28, 104, c, 'f9', 'dim')

NODES = V.NODES; EDGES = V.EDGES
def world_map(s, here='灰窯鎮', dest='青霧藥林', prog=None):
    MAPH = 560
    s.box(MX, Y0, MW, MAPH, 'map')
    s.box(770, 280, 190, 130, 'terr'); s.box(560, 420, 170, 110, 'terr'); s.box(380, 430, 170, 100, 'terr'); s.box(890, 190, 130, 110, 'terr')
    s.t(780, 392, 170, '青霧山', 'big', 'c'); s.t(300, 160, 220, '灰窯原', 'big', 'c')
    for a, b, k in EDGES:
        x1, y1 = NODES[a][:2]; x2, y2 = NODES[b][:2]
        s.line(x1, y1, x2, y2, kind=k)
    for nm, (cx, cy, tp, g) in NODES.items():
        if tp == 'way':
            s.box(cx - 7, cy - 7, 14, 14, 'p round')
            s.box(cx - 36, cy + 10, 72, 18, 'chip'); s.t(cx - 35, cy + 11, 70, nm, 'f10', 'c')
            continue
        sz = 36 if tp == 'town' else 30
        s.box(cx - sz // 2, cy - sz // 2, sz, sz, 'sel' if nm == dest else 'p')
        s.t(cx - sz // 2 + 1, cy - 8, sz - 2, g, 'f12b', 'c')
        s.box(cx - 34, cy + sz // 2 + 8, 68, 18, 'chip'); s.t(cx - 33, cy + sz // 2 + 9, 66, nm, 'f11b' if tp == 'town' else 'f11', 'c')
    s.box(260, 14, 150, 24, 'chip')
    s.line(268, 26, 290, 26, kind='road'); s.t(293, 18, 30, '官道', 'f10')
    s.line(328, 26, 350, 26, kind='trail'); s.t(353, 18, 30, '野徑', 'f10')


def depart_strip(s, dest='青霧藥林', hours='3 小時', pills=None, go='前往', prog=None, log_lines=None, newest=None):
    """實機地圖底條：地點、路程／飽食／疲累／危險／負重、前往；其下日誌（col top 566／628）。"""
    y, h = 572, 56
    s.box(MX + 6, y, 782, h, 'z')
    s.box(MX + 14, y + 8, 40, 40, 'p'); s.t(MX + 14, y + 20, 40, dest[0], 'f14b', 'c')
    s.t(MX + 58, y + 10, 100, dest, 'f12b')
    s.t(MX + 58, y + 28, 100, hours, 'f10', 'dim')
    pills = pills or [('路程', '3 小時'), ('飽食', '−12'), ('疲累', '+6'), ('危險', '低'), ('負重', '×0.82')]
    px = MX + 162
    for lab, val in pills:
        s.box(px, y + 14, 86, 28, 'chip')
        s.t(px + 2, y + 20, 36, lab, 'f9b')
        s.t(px + 36, y + 20, 48, val, 'f10', 'r')
        px += 90
    if prog is not None:
        s.box(MX + 162, y + 46, 446, 4, 'p')
        s.box(MX + 162, y + 46, max(4, int(446 * prog)), 4, 'fill')
        s.t(MX + 612, y + 18, 70, f'{int(round(prog * 3))}/3 小時' if abs(prog * 3 - round(prog * 3)) < 0.05 else f'{prog:.2f}', 'f10')
    s.btn(MX + 688, y + 10, 92, 36, go, 'off' if go != '前往' else '', 'f12b')
    ly, lh = 634, 74
    s.box(MX + 6, ly, 782, lh, 'z')
    lines = log_lines if log_lines is not None else ['', '', '']
    for i, l in enumerate(lines[:4]):
        s.t(MX + 16, ly + 6 + i * 16, 760, l, 'f11', '' if newest == i else 'dim')

# ---------- 圖板：關鍵幀縮圖＋時間軸 ----------
def tw(text, f=9):
    return sum(f if ord(c) > 255 else f * 0.55 for c in text) + 2

def kf_frame(b, x, y, w, h, title, ms, note=None):
    """關鍵幀外框：標題列（KFn・t ms）＋內容區；回傳內容區原點與大小"""
    b.box(x, y, w, h, 'kf')
    b.box(x, y, w, 18, 'kfh')
    b.t(x + 4, y + 2, w - 70, title, 'f10b')
    b.t(x + w - 66, y + 2, 62, ms, 'f10', 'r dim')
    cy = y + 20
    ch = h - 20
    if note:
        b.t(x + 4, y + h - 16, w - 8, note, 'f9', 'dim')
        ch -= 16
    return x + 2, cy, w - 4, ch

def gantt(b, x, y, w, total, rows, step=200, lab_w=210, rh=20, title=None):
    tx0 = x + lab_w; tw_ = w - lab_w - 8
    k = tw_ / total
    if title:
        b.t(x, y - 2, lab_w - 24, title, 'f10b')
    for t in range(0, total + 1, step):
        px = tx0 + int(t * k)
        b.box(px, y + 14, 1, 4 + rh * len(rows), 'tick', extra='background:#d0d0d0')
        b.t(px - 18, y, 36, str(t), 'f9', 'c dim')
    yy = y + 20
    for lab, segs in rows:
        b.t(x, yy + 1, lab_w - 6, lab, 'f10')
        b.box(tx0, yy, tw_, rh - 3, 'trk')
        for i, (t0, t1, txt, kind) in enumerate(segs):
            if t1 is None:  # 音效預留點
                px = tx0 + int(t0 * k)
                b.box(px - 4, yy + 4, 8, 8, 'dia')
                b.t(px + 10, yy + 1, min(300, tx0 + tw_ - px - 12), txt, 'f9', 'dim')
                continue
            px0 = tx0 + int(t0 * k); px1 = tx0 + int(t1 * k)
            b.box(px0, yy, max(4, px1 - px0), rh - 3, 'bar2' if kind == 'hold' else 'bar')
            if tw(txt) <= px1 - px0 - 6:
                b.t(px0 + 3, yy + 1, px1 - px0 - 4, txt, 'f9')
            elif txt:
                nxt = segs[i + 1][0] if i + 1 < len(segs) else total
                avail = tx0 + int(nxt * k) - px1 - 8
                if avail < tw(txt):
                    avail = tx0 + tw_ - px1 - 6
                b.t(px1 + 4, yy + 1, max(40, avail), txt, 'f9', 'dim')
        yy += rh
    return yy

def bar_legend(b, x, y):
    b.box(x, y + 3, 20, 9, 'bar'); b.t(x + 24, y, 90, '動畫進行中', 'f9')
    b.box(x + 100, y + 3, 20, 9, 'bar2'); b.t(x + 124, y, 90, '靜止停留（hold）', 'f9')
    b.box(x + 230, y + 3, 8, 8, 'dia'); b.t(x + 244, y, 120, '音效預留點（只留事件名）', 'f9')
