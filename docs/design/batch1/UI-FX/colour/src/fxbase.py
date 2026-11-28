# 共用繪圖：右欄（含時段條）、城鎮／荒野／地圖中欄、浮出標籤、時間軸
from fxlib import FX, BoardScreen
import v2base as V
from v2base import cell, bar, LX, RX, MX, MW, Y0, YB, ico, LW as LW_, CH as CH_, RW as RW_

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
# 右欄（17:23 欄位規則）：上方固定＝頭區、時間（時段條＋鐘點）、命／食／疲、危險警示；下方＝頁籤（角色／同伴／勢力／委託／傳聞）
PHASE_Y = 90
VIT_Y = {'命': 130, '飽食': 152, '疲累': 174}  # 條的舞台 y（每列 22）
DANGER_Y, TAB_Y, CONT_Y = 200, 234, 266
ATTR_Y, PTAB_Y, PROF_Y = 292, 346, 378           # 角色頁籤內容（熟練度列距 24）
QUEST_Y, QROW_Y, QROW_H = 266, 292, 52           # 委託頁籤內容
SYS_Y = 666
EDGE_X, EDGE_W = MX + MW - 128, 124  # 中欄右緣差值欄（16px 全稱「飽食 −16」）
TABS = ['角色', '同伴', '勢力', '委託', '傳聞']

def pack_xy(k):
    return PACK_X + (k % 5) * GP, PACK_Y + (k // 5) * GP

# ---------- 小工具 ----------
def fl(s, x, y, w, text, tier='S', h=None, layer=1, danger=False):
    """浮出：小／關鍵／重大；皆有底盤。P0 用 danger=True（--fx-danger）。"""
    h = h or {'S': 24, 'K': 26, 'M': 36}[tier]
    f = {'S': 'f16', 'K': 'f16b', 'M': 'f18b'}[tier]
    lh = {'f16': 22, 'f16b': 22, 'f18b': 24}[f]
    cls = 'fD' if danger else ('f' + tier)
    tc = 'c' if danger else ('c gold' if tier != 'S' else 'c')  # 危險字在 --red-d 底盤上用 --ink（8.25）；--red-text 只用於 --bg／--pill 上的紅字
    s.box(x, y, w, h, cls, layer=layer)
    s.t(x + 2, y + (h - lh) // 2, w - 4, text, f, tc, layer=layer)

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
            s.t(px, y + 10, sw2, '晨晝昏夜'[i], 'f16', 'c', layer=layer)
        if i == phase:
            mx = px + int(sw2 * mark)
            s.box(mx - 1, y - 3, 3, 14, 'mk', layer=layer)
        px += sw2

def hint_key(s, x, y, w, k, layer=None):
    s.box(x, y, w, 16, 'chip', layer=layer)
    s.t(x + 1, y, w - 2, k, 'f9', 'c', layer=layer)

# ---------- 危險四檔（低／中／高／極高；「中高」併入「高」）----------
RISK = {'低': 'low', '中': 'mid', '高': 'high', '極高': 'xhigh'}

def risk_mark(s, x, y, tier, layer=None):
    k = RISK[tier]
    if k == 'mid':
        s.box(x, y + 1, 0, 0, 'mk-mid', layer=layer)
    elif k == 'xhigh':
        s.box(x + 1, y + 1, 10, 10, 'mk-xhigh', layer=layer)
        s.box(x + 4, y + 4, 4, 4, 'mk-xin', layer=layer)
    else:
        s.box(x + 1, y + 1, 10, 10, 'mk-' + k, layer=layer)

def risk_chip(s, x, y, w, tier, h=26, layer=None, label='危險'):
    """危險分級 chip：框＋形狀＋文字（不只靠顏色）。低 jade◇｜中 gold△｜高 紅底◆｜極高 紅底粗框◆◆"""
    k = RISK[tier]
    s.box(x, y, w, h, 'risk-' + k, layer=layer)
    risk_mark(s, x + 8, y + (h - 12) // 2, tier, layer=layer)
    s.t(x + 26, y + (h - 22) // 2, w - 30, f'{label} {tier}', 'f16b', 'c rk-' + k, layer=layer)

def pill(s, x, y, w, h, lab, val, tier=None, hot=False):
    """底條格：上行標籤、下行數值（皆 16px）"""
    s.box(x, y, w, h, 'risk-' + RISK[tier] if tier else 'chip')
    s.t(x + 4, y + 2, w - 8, lab, 'f16', 'dim' if not tier else 'dim')
    s.t(x + 4, y + 24, w - 8, val, 'f16b', 'rk-' + RISK[tier] if tier else '')

# ---------- 左欄（17:23：只放「東西」＝裝備、行囊、負重；勢力移到右欄頁籤；無「同伴」占位） ----------
def draw_left(s, badge=False, pack_full=True, load=('52/80', '平常', '×0.82')):
    s.box(LX, Y0, LW_, CH_, 'z')
    for part, (x, y, w, h, g, rar, empty) in SLOTS_LIVE.items():
        cell(s, x, y, w, h, '' if empty else g, cls='ghost' if empty else 'p',
             gcls='c' if not empty else 'c off', corner=None if empty else rar)
        if empty:
            s.t(x + 1, y + (h - 22) // 2, w - 2, g, 'f16', 'c off')
    x, y, w, h = BAG
    cell(s, x, y, w, h, '囊', cnt='6')
    x, y, w, h = WAGON
    cell(s, x, y, w, h, '車', cls='lock', gcls='c off')
    s.t(16, 200, 100, '行囊 6/6', 'f16b')
    s.t(150, 200, 86, '上限 24', 'f16', 'r dim')
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
    # 負重＋腳程（底條兩行）
    cap, band, mult = load
    s.box(12, 652, 228, 56, 'p')
    ico(s, 16, 657, 16, 'ui_load')
    s.t(36, 654, 40, '負重', 'f16b')
    s.box(80, 661, 84, 8, 'trk'); s.box(80, 661, 55, 8, 'fill-fat'); s.box(80 + 34, 659, 1, 12, 'tick'); s.box(80 + 63, 659, 1, 12, 'tick')
    s.t(168, 654, 68, cap, 'f16', 'r')
    s.t(16, 678, 40, '腳程', 'f16b')
    s.t(58, 678, 176, f'{band} {mult}', 'f16b', 'r gold')

# ---------- 右欄 ----------
def tab_strip(s, active='角色', dots=()):
    for i, nm in enumerate(TABS):
        x = IX + i * 41
        on = nm == active
        s.box(x, TAB_Y, 40, 26, 'sel' if on else 'p')
        s.t(x, TAB_Y + 2, 40, nm, 'f16b' if on else 'f16', 'c' if on else 'c dim')
        if nm in dots:
            s.box(x + 31, TAB_Y + 3, 8, 8, 'dot-g')

def right(s, clock='17:40', phase=2, mark=0.5, silver='148', vit=((72, 80), (64, 100), (38, 100)),
          profs=None, quests=None, rumors=1, loc='灰窯鎮', date='春・第3日', dang=None, ptab='山野',
          tab='角色', dots=(), risk='低'):
    s.box(RX, Y0, RW_, CH_, 'z')
    s.box(IX, 14, 60, 60, 'art-face')
    s.t(IX + 68, 10, 136, '沈衡', 'f14b', 'gold')
    s.box(IX + 68, 36, 84, 26, 'chip'); s.t(IX + 69, 38, 82, loc, 'f16', 'c')
    s.box(RX + 160, 36, 52, 26, 'chip'); s.t(RX + 161, 38, 50, date.replace('・第', '').replace('第', ''), 'f16', 'c')
    ico(s, IX, 66, 16, 'ui_coin')
    sil = silver if len(str(silver)) <= 8 else str(silver).split()[-1]
    s.t(IX + 20, 63, 48, sil, 'f16b', 'gold')
    s.box(RX + 120, 62, 92, 26, 'chip'); s.t(RX + 121, 64, 90, clock, 'f16b', 'c')
    # 時間：時段條（正式四時段 3／9／3／9）＋時段名；鐘點為次級（上列 chip）
    s.box(IX, PHASE_Y, 204, 36, 'p')
    phase_bar(s, IX + 4, PHASE_Y + 4, phase, 144, mark)
    s.t(IX + 152, PHASE_Y + 6, 48, ['清晨', '白天', '黃昏', '黑夜'][phase], 'f16', 'r dim')
    # 命／食／疲
    names = [('命', 'ui_hp', 'fill-hp'), ('飽食', 'ui_food', 'fill-food'), ('疲累', 'ui_fat', 'fill-fat')]
    for i, ((full, icn, fillk), (v, m)) in enumerate(zip(names, vit)):
        y = VIT_Y[full]
        dg = dang and (dang.get(full) or dang.get({'命': '命', '飽食': '食', '疲累': '疲'}[full]))
        ico(s, IX, y + 3, 16, icn)
        ticks = (0.2,) if full == '飽食' else ((0.8,) if full == '疲累' else ())
        s.box(IX + 20, y + 8, 130, 6, 'trk')
        fw = int(round(130 * (v / m)))
        if fw:
            s.box(IX + 20, y + 8, fw, 6, 'rfill' if dg else fillk)
        for tk in ticks:
            s.box(IX + 20 + int(130 * tk), y + 5, 1, 12, 'tick')
        s.t(IX + 152, y, 52, f'{v}/{m}', 'f16b' if dg else 'f16', 'r' + (' red' if dg else ''))
    risk_chip(s, IX, DANGER_Y, 204, risk)
    s.hr(IX, 230, 204)
    tab_strip(s, tab, dots)
    if tab == '角色':
        s.t(IX, CONT_Y, 204, '護甲 6・傷 8–12', 'f16', 'dim')
        attrs = [('體', '7'), ('膂', '6'), ('身', '5'), ('靈', '8'), ('心', '5'), ('悟', '6'), ('口', '4')]
        for i, (ag, av) in enumerate(attrs):
            x = IX + i * 29
            s.box(x, ATTR_Y, 28, 48, 'p')
            s.t(x, ATTR_Y + 1, 28, ag, 'f16', 'c dim')
            s.t(x, ATTR_Y + 23, 28, av, 'f16b', 'c')
        for i, nm in enumerate(['武藝', '山野', '百工', '行走']):
            x = IX + i * 51
            on = nm == ptab
            s.box(x, PTAB_Y, 49, 26, 'sel' if on else 'p')
            s.t(x, PTAB_Y + 2, 49, nm, 'f16b' if on else 'f16', 'c')
        pr = profs or [('採藥', 4, .62), ('挖礦', 1, .30), ('追蹤', 0, .0), ('剝皮', 0, .0), ('野營', 1, .18), ('探幽', 6, .40)]
        for i, (nm, lv, p_) in enumerate(pr[:6]):
            y = PROF_Y + i * 24
            s.t(IX, y, 36, nm, 'f16')
            s.t(IX + 36, y, 22, str(lv), 'f16b', 'r')
            s.box(IX + 64, y + 9, 100, 6, 'trk'); 
            if p_: s.box(IX + 64, y + 9, int(100 * p_), 6, 'fill-jade')
            nxt = '→25' if 0 < p_ < 1 else ('→10' if lv == 0 else '')
            s.t(IX + 168, y, 36, nxt, 'f16', 'dim')
    elif tab == '委託':
        qs = quests if quests is not None else [('灰髯狼', '2/3', '40兩'), ('古窯清理', '0/1', '60兩')]
        ico(s, IX, QUEST_Y + 3, 16, 'ui_quest'); s.t(IX + 20, QUEST_Y, 80, f'委託 {len(qs)}', 'f16b')
        s.t(IX + 104, QUEST_Y, 100, '點開看全部', 'f16', 'r dim')
        for i, q in enumerate(qs[:2]):
            nm, pg, rw = q[:3]; done = len(q) > 3 and q[3]
            y = QROW_Y + i * QROW_H
            s.box(IX, y, 204, 48, 'sel' if done else 'p')
            if done:
                s.box(IX + 6, y + 8, 32, 32, 'dk'); s.t(IX + 6, y + 11, 32, '✓', 'f16b', 'c on-gold')
            else:
                s.box(IX + 6, y + 8, 32, 32, 'p'); s.t(IX + 6, y + 11, 32, nm[0], 'f16b', 'c')
            s.t(IX + 44, y + 2, 90, nm, 'f16b' if done else 'f16')
            s.t(IX + 44, y + 24, 100, pg, 'f16b' if done else 'f16', 'gold' if done else 'dim')
            s.t(IX + 140, y + 13, 60, rw, 'f16', 'r dim')
    elif tab == '傳聞':
        ico(s, IX, QUEST_Y + 3, 16, 'ui_rumor'); s.t(IX + 20, QUEST_Y, 80, f'傳聞 {rumors}/8', 'f16b')
        s.t(IX + 104, QUEST_Y, 100, '點開看全文', 'f16', 'r dim')
        s.box(IX, QROW_Y, 204, 48, 'p')
        s.box(IX + 6, QROW_Y + 8, 32, 32, 'p'); s.t(IX + 6, QROW_Y + 11, 32, '聞', 'f16b', 'c')
        s.t(IX + 44, QROW_Y + 2, 156, '祕寶・亂葬古窯', 'f16')
        s.t(IX + 44, QROW_Y + 24, 156, '3 天', 'f16', 'dim')
    elif tab == '勢力':
        ico(s, IX, QUEST_Y + 3, 16, 'ui_rep'); s.t(IX + 20, QUEST_Y, 80, '勢力', 'f16b')
        s.t(IX + 104, QUEST_Y, 100, '點開看聲望', 'f16', 'r dim')
        for i, (g, nm, lv, p_) in enumerate(FACTIONS):
            y = QROW_Y + i * 44
            s.box(IX, y, 204, 40, 'p')
            s.box(IX + 6, y + 6, 28, 28, 'p'); s.t(IX + 6, y + 9, 28, g, 'f16b', 'c')
            s.t(IX + 40, y + 9, 70, nm, 'f16')
            s.t(IX + 112, y + 9, 22, lv, 'f16b', 'r')
            s.box(IX + 140, y + 17, 58, 6, 'trk')
            if p_: s.box(IX + 140, y + 17, int(58 * p_), 6, 'fill')
    elif tab == '同伴':
        s.t(IX, QUEST_Y, 100, '同伴', 'f16b')
        s.box(IX, QROW_Y, 204, 120, 'ghost')
        s.t(IX, QROW_Y + 48, 204, '尚無同伴（占位）', 'f16', 'c dim')
    bw = 40
    for i, nm in enumerate(['記事', '人物', '日誌', '說明', '選單']):
        x = IX + i * 41
        s.box(x, SYS_Y, bw, 40, 'p'); s.t(x, SYS_Y + 9, bw, nm, 'f16', 'c')

# ---------- 中欄 ----------
def top_chip(s, text, w=90):
    s.box(MX + 8, 14, w, 26, 'chip', layer=0); s.t(MX + 9, 16, w - 2, text, 'f16b', 'c')

def leave_btn(s):
    s.box(MX + MW - 116, 14, 108, 26, 'p'); s.t(MX + MW - 116, 16, 108, '離開・地圖', 'f16', 'c')

# 鎮衙在實機 plan（398×260，2× 顯示）hy_board = (156,44,68,66) → 舞台
TOWN_BOARD = (MX + 312, Y0 + 88, 136, 132)

def town_scene(s, tintA=0.0, quiet=False, phase_tint=None):
    s.box(MX, Y0, MW, 520, 'art-town')
    # 色調層蓋住美術後，把地名／離開鈕再疊一次，避免被洗掉
    if tintA or phase_tint is not None:
        cls = {0:'tint0',1:'tint1',2:'tint2',3:'tint3'}.get(phase_tint)
        if cls:
            s.box(MX, Y0, MW, 520, cls, layer=1)
        elif tintA:
            tint(s, MX, Y0, MW, 520, tintA)
        top_chip(s, '灰窯鎮')
        leave_btn(s)

def info_strip(s, text, btn='探查（1 小時）'):
    y = 532
    s.box(MX, y, MW, 44, 'z')
    s.t(MX + 10, y + 10, 600, text, 'f16', 'dim')
    if btn:
        s.btn(MX + MW - 142, y + 6, 134, 32, btn, 'pri', 'f16b')

def log_box(s, y, lines, newest=0, h=None):
    h = h or (YB - y)
    s.box(MX, y, MW, h, 'z')
    for i, l in enumerate(lines):
        s.t(MX + 12, y + 6 + i * 22, MW - 40, l, 'f16', '' if i == newest else 'dim')
    if newest is not None and 0 <= newest < len(lines) and lines[newest]:
        s.box(MX + 4, y + 6 + newest * 22 + 1, 3, 20, 'dk')
    return y

# 實機青霧藥林點（wildscene 座標 + (MX,Y0)）
WILD_PTS = {
    'h1': (MX + 120, Y0 + 250),
    'h2': (MX + 270, Y0 + 290),
    'm1': (MX + 495, Y0 + 180),
    't1': (MX + 625, Y0 + 290),
    'fire': (MX + 366, Y0 + 320),
}

def wild_scene(s, tintA=0.0, nodes=None, fire=True, draw_nodes=False, phase_tint=None):
    SH = 404
    s.box(MX, Y0, MW, SH, 'art-wild')
    if tintA or phase_tint is not None:
        cls = {0:'tint0',1:'tint1',2:'tint2',3:'tint3'}.get(phase_tint)
        if cls:
            s.box(MX, Y0, MW, SH, cls, layer=1)
        elif tintA:
            tint(s, MX, Y0, MW, SH, tintA)
        top_chip(s, '青霧藥林', 110)
        risk_chip(s, MX + 124, 14, 100, '低')
        leave_btn(s)
    if draw_nodes:
        nodes = nodes or [('藥叢', '4', *WILD_PTS['h1'], '草'), ('清心叢', '2', *WILD_PTS['h2'], '葉'),
                          ('礦脈', '1', *WILD_PTS['m1'], '礦'), ('獸跡', '1', *WILD_PTS['t1'], '獸')]
        for nm, n, x, y, g in nodes:
            s.box(x - 22, y - 22, 44, 44, 'ell')
            s.box(x - 30, y + 26, 68, 18, 'chip'); s.t(x - 29, y + 27, 66, f'{nm} {n}', 'f10', 'c')

def action_cards(s, sel=None, y=416):
    acts = [('p_herb', '採藥', '1 小時', '疲累 +4'), ('p_ore', '挖礦', '2 小時', '疲累 +10'), ('p_track', '追蹤', '1 小時', '入戰'),
            ('ui_explore', '探查', '1 小時', '四處翻找'), ('ui_fire', '露宿', '8 小時', '夜警')]
    for i, (ic, nm, hrs, c) in enumerate(acts):
        bx = MX + i * 160
        s.box(bx, y, 156, 52, 'sel' if sel == i else 'p')
        s.box(bx + 6, y + 10, 32, 32, 'p'); ico(s, bx + 8, y + 12, 28, ic)
        s.t(bx + 44, y + 2, 56, nm, 'f16b')
        s.t(bx + 98, y + 2, 54, hrs, 'f16', 'r dim')
        s.t(bx + 44, y + 26, 108, c, 'f16', 'dim')

# 實機地圖節點（map 空間 + (MX,Y0)）de91435 data.js
LIVE_NODE = {
    '灰窯鎮': (MX + 678, Y0 + 330),
    '青霧藥林': (MX + 291, Y0 + 300),
    '官道驛站': (MX + 496, Y0 + 205),
    '渡陰關': (MX + 316, Y0 + 92),
    '野徑岔口': (MX + 478, Y0 + 350),
    '亂葬古窯': (MX + 106, Y0 + 228),
    '赤石廢礦': (MX + 396, Y0 + 480),
    '枯骨獸徑': (MX + 186, Y0 + 400),
    '沉淵祭窟': (MX + 726, Y0 + 455),
}

def world_map(s, here='灰窯鎮', dest='青霧藥林', prog=None):
    MAPH = 560
    s.box(MX, Y0, MW, MAPH, 'art-map')


def depart_strip(s, dest='青霧藥林', hours='3 小時', pills=None, go='前往', prog=None, log_lines=None, newest=None, band=('平常', '×0.82'), risk='低'):
    """實機地圖底條：地點、路程／飽食／疲累／危險／腳程（檔名＋倍率）、前往；其下日誌。全 16px。"""
    y, h = 572, 56
    s.box(MX + 6, y, 782, h, 'z')
    s.box(MX + 12, y + 8, 40, 40, 'p'); ico(s, MX + 16, y + 12, 32, 'n_forest' if dest == '青霧藥林' else 'n_town')
    s.t(MX + 58, y + 3, 100, dest, 'f16b')
    s.t(MX + 58, y + 27, 100, hours, 'f16', 'dim')
    pills = pills or [('路程', '3 小時'), ('飽食', '−12'), ('疲累', '+6'), ('危險', risk), ('腳程', f'{band[0]} {band[1]}')]
    px = MX + 162
    for lab, val in pills:
        pill(s, px, y + 2, 102 if lab == '腳程' else 98, 50, lab, val, tier=risk if lab == '危險' else None)
        px += (106 if lab == '腳程' else 102)
    if prog is not None:
        s.box(MX + 162, y + 53, 520, 3, 'trk')
        s.box(MX + 162, y + 53, max(4, int(520 * prog)), 3, 'fill')
    s.box(MX + 688, y + 10, 92, 36, 'off' if go != '前往' else 'p'); s.t(MX + 688, y + 14, 92, go, 'f16b', 'c' + (' off' if go != '前往' else ''))
    ly, lh = 634, 74
    s.box(MX + 6, ly, 782, lh, 'z')
    lines = log_lines if log_lines is not None else ['', '', '']
    for i, l in enumerate(lines[:3]):
        s.t(MX + 16, ly + 4 + i * 22, 760, l, 'f16', '' if newest == i else 'dim')

# ---------- 圖板：關鍵幀縮圖＋時間軸 ----------
def tw(text, f=16):
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
