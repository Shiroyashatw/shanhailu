# 《山海錄》UI-02 城況簡報灰盒草稿
# 在既有三欄加一塊，不重做 HUD。城鎮平面 796×520 對齊 v0.3 實機。
from lib import Screen

PAD, GAP = 6, 6
LW, MW, RW = 240, 796, 220
LX, MX, RX = PAD, PAD + LW + GAP, PAD + LW + GAP + MW + GAP  # 6, 252, 1054
Y0, CH = PAD, 720 - PAD * 2  # 6, 708
YB = Y0 + CH  # 714
assert RX + RW + PAD == 1280

PLAN_W, PLAN_H = 796, 520
BAR_X, BAR_W = MX + 6, 782  # 258, 782
BAR_Y = Y0 + PLAN_H + 6     # 532
LOG_BOTTOM = YB - 6         # 708
# 收合條 56；展開時條 72（露出數字），詳情佔剩餘，整塊不蓋平面圖
BAR_H_COLLAPSE = 56
BAR_H_EXPAND = 72

def expand_geometry(has_alert=False, n_lines=2):
    """展開塊自下往上推，最多蓋住平面圖下緣約 80px（出口帶），收合態不遮。"""
    bar_h = BAR_H_EXPAND
    alert_h = 32 if has_alert else 0
    detail = 8 + alert_h + n_lines * 22 + 4 + 22 + 8 + 44 + 8
    total = bar_h + detail
    top = LOG_BOTTOM - total
    min_top = Y0 + PLAN_H - 80
    if top < min_top:
        top = min_top
    return top, bar_h, LOG_BOTTOM - top


def cell(s, x, y, w, h, g, cnt=None, cls='p', gf='f12b', gcls='c'):
    s.box(x, y, w, h, cls)
    gy = y + (h - 16) // 2 - (3 if cnt else 0)
    if g:
        s.t(x + 1, gy, w - 2, g, gf, gcls)
    if cnt:
        s.t(x + 2, y + h - 13, w - 4, cnt, 'f9b', 'r')


def bar(s, x, y, w, h, pct, red=False, ticks=(), kind=None):
    s.box(x, y, w, h, 'bartrack')
    fw = int(round(w * max(0, min(1, pct))))
    if fw:
        if kind:
            fill = kind
        elif red:
            fill = 'rfill'
        else:
            fill = 'goldfill' if pct > 0.4 else 'jade'
        s.box(x, y, fw, h, fill)
    for tk in ticks:
        s.box(x + int(w * tk), y - 2, 1, h + 4, 'tick')


def draw_left(s, reps=None, load=None):
    """對齊 v0.3 左欄：人形、行囊、勢力、負重底條。已去掉地面格與小地圖。"""
    reps = reps or [('破曉軍團', '0'), ('天星商會', '0'), ('鴉衛', '0')]
    wt, pct, spd = load or ('52/80', 0.65, '×0.82')
    s.box(LX, Y0, LW, CH, 'z')
    slots = [
        (104, 14, 40, 40, '冠'), (22, 40, 44, 88, '刃'), (182, 40, 44, 88, '盾'),
        (100, 60, 48, 64, '甲'), (22, 134, 44, 40, '手'), (182, 134, 44, 40, '靴'),
        (100, 130, 48, 22, '帶'), (70, 130, 26, 26, '戒'), (152, 130, 26, 26, ''),
        (86, 162, 36, 36, '囊'), (126, 162, 36, 36, ''),
    ]
    for (x, y, w, h, g) in slots:
        empty = g == ''
        cls = 'lock' if (x, y) == (126, 162) else ('ghost' if empty else 'p')
        cell(s, x, y, w, h, g, cnt='6' if g == '囊' else None, cls=cls,
             gcls='c off' if empty else 'c')
    s.hr(12, 206, 228)
    s.t(12, 210, 80, '行囊 6/6', 'f10b')
    s.t(140, 210, 86, '上限 24', 'f9', 'r dim')
    pack = [('草', '×4'), ('葉', '×3'), ('鐵', '×2'), ('藥', '×1'), ('皮', '×1'), ('糧', '×1')]
    for i in range(24):
        x, y = 12 + (i % 5) * 44, 230 + (i // 5) * 44
        if i < 6:
            cell(s, x, y, 40, 40, pack[i][0], cnt=pack[i][1])
        else:
            s.box(x, y, 40, 40, 'lock')
    # 地面已刪：勢力上移到原地面位置（實機 lhead top 438 區）
    s.hr(12, 454, 228)
    s.t(12, 458, 80, '勢力 ' + str(len(reps)), 'f10b')
    s.t(120, 458, 106, '點開看全部', 'f9', 'r dim')
    for i, (nm, v) in enumerate(reps):
        y = 478 + i * 28
        s.t(12, y, 16, '旗', 'f10b')
        s.t(30, y, 140, nm, 'f10')
        s.t(170, y, 56, v, 'f10b', 'r')
    s.box(12, 684, 228, 24, 'p')
    s.t(14, 688, 16, '負', 'f10b', 'c')
    bar(s, 32, 692, 108, 8, pct, ticks=(0.40, 0.75))
    s.t(144, 688, 40, wt, 'f10')
    s.t(186, 688, 50, spd, 'f10b', 'r gold')


def draw_right(s, loc='灰窯鎮', *, origin='平民', n_quest=1, n_rumor='0/3',
               rumor_line='（無）客棧可打聽', quest=None, age='20 歲'):
    """對齊 v0.3 右欄：身分改稱「身分」，開局示例用「平民」；山野六項與實機一致。"""
    s.box(RX, Y0, RW, CH, 'z')
    IX = RX + 6
    s.box(IX, 12, 60, 60, 'art')
    s.t(IX + 1, 28, 58, '頭像', 'f10', 'c dim')
    s.t(IX + 1, 44, 58, '示意', 'f9', 'c dim')
    s.t(IX + 68, 12, 140, '沈衡', 'f14b')
    s.t(IX + 68, 32, 140, origin + '・' + age, 'f10', 'dim')
    s.box(IX + 68, 50, 70, 18, 'chip')
    s.t(IX + 68, 51, 70, loc, 'f10', 'c')
    s.box(IX + 142, 50, 66, 18, 'chip')
    s.t(IX + 142, 51, 66, '白天', 'f10', 'c')
    s.t(IX + 68, 72, 16, '銀', 'f9b')
    s.t(IX + 86, 70, 50, '148', 'f12b', 'gold')
    s.t(IX + 136, 72, 72, '第 12 日', 'f10', 'r dim')
    rows = [('命', 0.80, '72/90', 'hp'), ('食', 0.64, '64/100', 'food'), ('疲', 0.38, '38/100', 'fat')]
    y = 96
    for g, p, num, k in rows:
        s.box(IX, y, 16, 16, 'p')
        s.t(IX, y + 1, 16, g, 'f10b', 'c')
        bar(s, IX + 20, y + 5, 122, 6, p, kind=k)
        s.t(IX + 144, y, 64, num, 'f10', 'r')
        y += 20
    s.t(IX, 158, 208, '護甲 0・傷 4–7', 'f10', 'dim')
    s.hr(IX, 176, 208)
    # 實機順序：體 膂 身 靈 心 悟 口
    attrs = [('體', '10'), ('膂', '10'), ('身', '10'), ('靈', '10'),
             ('心', '10'), ('悟', '10'), ('口', '10')]
    for i, (g, v) in enumerate(attrs):
        x = IX + i * 29
        s.box(x, 184, 27, 36, 'p')
        s.t(x, 186, 27, g, 'f9', 'c dim')
        s.t(x, 200, 27, v, 'f11b', 'c')
    for i, nm in enumerate(['武藝', '山野', '百工', '行走']):
        s.btn(IX + i * 52, 226, 50, 22, nm, 'sel' if i == 1 else '', 'f10')
    profs = [('採藥', '0'), ('挖礦', '0'), ('追蹤', '0'),
             ('剝皮', '0'), ('野營', '0'), ('探幽', '0')]
    y = 252
    for nm, lv in profs:
        s.t(IX, y, 40, nm, 'f10')
        s.t(IX + 42, y, 18, lv, 'f10b', 'r')
        bar(s, IX + 64, y + 5, 110, 4, 0.0)
        s.t(IX + 176, y, 28, '→25', 'f9', 'dim')
        y += 18
    s.hr(IX, 364, 208)
    s.t(IX, 370, 80, '委託 ' + str(n_quest), 'f10b')
    s.t(IX + 80, 370, 128, '點開看全部', 'f9', 'r dim')
    qlist = quest if isinstance(quest, list) else (
        [] if n_quest == 0 else [quest] if quest else
        [('狼', '灰髯狼 0/3', '枯骨獸徑・長期', '40')]
    )
    if not qlist:
        s.t(IX, 392, 208, '（無）到委託板接榜', 'f10', 'dim')
        ry = 420
    else:
        for i, q in enumerate(qlist[:3]):
            yy = 390 + i * 34
            s.box(IX, yy, 208, 32, 'p')
            s.box(IX + 4, yy + 4, 24, 24, 'p')
            s.t(IX + 4, yy + 7, 24, q[0], 'f10b', 'c')
            s.t(IX + 32, yy + 2, 128, q[1], 'f10b')
            s.t(IX + 32, yy + 16, 128, q[2], 'f9', 'dim')
            s.t(IX + 160, yy + 8, 44, q[3], 'f10', 'r dim')
        ry = 390 + min(3, len(qlist)) * 34 + 6
    s.t(IX, ry, 80, '傳聞 ' + n_rumor, 'f10b')
    s.t(IX + 80, ry, 128, '點開看全文', 'f9', 'r dim')
    s.t(IX, ry + 22, 208, rumor_line, 'f10', 'dim')
    for i, nm in enumerate(['記事', '人物', '日誌', '說明', '選單']):
        s.btn(IX + i * 42, 668, 40, 36, nm, '', 'f10')

def draw_plan(s, title='灰窯鎮', hurt=False):
    """既有城鎮平面圖示意，尺寸對齊 v0.3：796×520。"""
    s.box(MX, Y0, MW, CH, 'z')
    s.box(MX, Y0, PLAN_W, PLAN_H, 'art')
    s.t(MX + PLAN_W - 80, Y0 + PLAN_H - 20, 72, '平面 示意', 'f10', 'r dim')
    # 廣場與路
    s.box(MX + 300, Y0 + 160, 200, 200, 'z')
    s.box(MX + 378, Y0 + 230, 40, 40, 'p')  # 井
    s.t(MX + 378, Y0 + 240, 40, '井', 'f10', 'c dim')
    # 建築
    blds = [
        (MX + 70, Y0 + 48, 150, 86, '天星分號', '買賣'),
        (MX + 330, Y0 + 36, 150, 90, '鎮公所', '委託'),
        (MX + 560, Y0 + 40, 170, 90, '老窯客棧', '歇腳'),
        (MX + 70, Y0 + 170, 130, 80, '窯神廟', '上香'),
        (MX + 70, Y0 + 310, 150, 80, '回春藥鋪', '藥'),
        (MX + 560, Y0 + 200, 170, 96, '石記鐵鋪', '兵甲'),
        (MX + 330, Y0 + 420, 140, 70, '出口', ''),
    ]
    for x, y, w, h, nm, sub in blds:
        cls = 'dash' if nm == '出口' else 'p'
        s.box(x, y, w, h, cls)
        s.t(x + 6, y + (18 if sub else (h - 20) // 2), w - 12, nm, 'f14b', 'c')
        if sub:
            s.t(x + 6, y + 40, w - 12, sub, 'f10', 'c dim')
    # 路人
    for x, y, nm in [(MX + 280, Y0 + 250, '阿滿'), (MX + 400, Y0 + 300, '說書人'), (MX + 500, Y0 + 250, '老礦工')]:
        s.box(x, y, 20, 28, 'fill2')
        tw = 16 * len(nm) + 8
        s.box(x + 10 - tw // 2, y + 30, tw, 16, 'chip')
        s.t(x + 10 - tw // 2, y + 30, tw, nm, 'f10', 'c')
    # 鎮名、離鎮（既有 HUD，高度沿用實機 26）
    nw = 16 * len(title) + 28
    s.box(MX + 6, Y0 + 6, nw, 26, 'sel')
    s.t(MX + 6, Y0 + 8, nw, title, 'f16b', 'c gold serif')
    s.box(MX + 796 - 6 - 100, Y0 + 6, 100, 26, 'p')
    s.t(MX + 796 - 6 - 100, Y0 + 8, 100, '離開・地圖', 'f12', 'c')
    if hurt:
        s.box(MX + 200, Y0 + 6, 280, 26, 'hurtflag')
        s.t(MX + 200, Y0 + 8, 280, '獸潮過後・鎮上受創', 'f14b', 'c on-alert')


def draw_log(s, y, h, lines):
    s.box(BAR_X, y, BAR_W, h, 'p')
    yy = y + 6
    for cls, tx in lines:
        s.t(BAR_X + 8, yy, BAR_W - 16, tx, 'f11', cls)
        yy += 18


def stat_cell(s, x, y, w, h, label, tier, trend=None, number=None, danger=False, expand=False):
    """三要項卡片。收合：標籤＋檔名；展開：加數字。"""
    s.box(x, y, w, h, 'rd' if danger else 'sel')
    tc = ' red' if danger else ''
    if expand and number is not None:
        # 64 高：標籤 16 / 檔名 18b / 數字 16，行距錯開避免重疊
        s.t(x + 8, y + 2, w - 16, label, 'f16', 'dim')
        val = tier + ((' ' + trend) if trend else '')
        s.t(x + 8, y + 24, w - 16, val, 'f18b', tc)
        s.t(x + 8, y + 46, w - 16, number, 'f16', 'dim')
    else:
        # 44 高：左標籤、右檔名同一垂直帶，左右不重疊
        s.t(x + 8, y + (h - 22) // 2, 48, label, 'f16', 'dim')
        val = tier + ((' ' + trend) if trend else '')
        s.t(x + 56, y + (h - 24) // 2, w - 64, val, 'f18b', tc)


def draw_brief_bar(s, *, expand, stats, danger=False, loc='灰窯鎮', y=None):
    """
    stats: list of dict label, tier, trend, number, danger
    右側鈕：收合態＝探查；展開態＝收合。
    """
    h = BAR_H_EXPAND if expand else BAR_H_COLLAPSE
    bar_y = BAR_Y if y is None else y
    s.box(BAR_X, bar_y, BAR_W, h, 'rd' if danger else 'p')
    # 左籤
    s.box(BAR_X + 6, bar_y + (h - 44) // 2, 48, 44, 'sel' if not danger else 'rd')
    s.t(BAR_X + 6, bar_y + (h - 22) // 2, 48, '城況', 'f16b', 'c' + (' red' if danger else ''))
    # 三要項
    cell_h = 44 if not expand else 64
    cell_w = 176
    gap = 8
    cx = BAR_X + 6 + 48 + 8
    cy = bar_y + (h - cell_h) // 2
    for i, st in enumerate(stats):
        stat_cell(s, cx + i * (cell_w + gap), cy, cell_w, cell_h,
                  st['label'], st['tier'], st.get('trend'), st.get('number'),
                  st.get('danger', False), expand)
    # 右側鈕 132×44
    bx = BAR_X + BAR_W - 8 - 132
    by = bar_y + (h - 44) // 2
    if expand:
        s.btn(bx, by, 132, 44, '收合', '', 'f16b')
    else:
        s.btn(bx, by, 132, 44, '探查 1時', 'sel', 'f16b')
    return bar_y, h


def draw_brief_detail(s, y, h, *, lines, secondary, actions, help_txt=None, alert=None):
    """展開後的詳情區：因果 1 句、次要資訊、介入鈕。不蓋平面圖。"""
    s.box(BAR_X, y, BAR_W, h, 'p')
    yy = y + 8
    if alert:
        s.box(BAR_X + 8, yy, BAR_W - 16, 28, 'alert')
        s.t(BAR_X + 12, yy + 3, BAR_W - 24, alert, 'f16b', 'on-alert')
        yy += 32
    for i, line in enumerate(lines):
        s.t(BAR_X + 12, yy, BAR_W - 24, line, 'f16')
        yy += 22
    # 次要資訊一行
    yy += 4
    s.t(BAR_X + 12, yy, BAR_W - 24, secondary, 'f16', 'dim')
    # 介入鈕貼底
    by = y + h - 8 - 44
    n = len(actions)
    aw = (BAR_W - 24 - 8 * (n - 1)) // n
    ax = BAR_X + 12
    for kind, label in actions:
        s.btn(ax, by, aw, 44, label, kind, 'f16b')
        ax += aw + 8
    return by



# ---------- 畫面 ----------
def stats_normal():
    # 灰窯起手第 1 天（SPEC-01 v0.3 §7.2）：T 顯示 208，In 23、Out 15、Net +8；treasuryTier=ok → 足餉。
    return [
        dict(label='繁榮', tier='平常', trend='', number='50　持平'),
        dict(label='治安', tier='尚可', trend='', number='55'),
        dict(label='財庫', tier='足餉', trend='', number='現額 208'),
    ]


def stats_hurt():
    # 受創＋欠餉滿 3 天、當日已自動求援。rescueAmt=90 計入 treasuryIn（§7.2）。
    return [
        dict(label='繁榮', tier='荒涼', trend='↓', number='18　昨日降', danger=True),
        dict(label='治安', tier='混亂', trend='↓', number='22　昨日降', danger=True),
        dict(label='財庫', tier='欠餉', trend='', number='現額 90'),
    ]


def ui02_01():
    s = Screen('UI-02-01', '城況收合態（鎮上常駐）',
               '灰窯鎮街上：在既有平面圖下方、原 townbar 位置，加上城況收合條。前 3 要項最醒目：繁榮／治安看五檔檔名，財庫看四檔短語；細數點開才看。探查鈕留在條右側。本圖為起手日（持平）。')
    draw_left(s)
    draw_right(s, n_quest=1)
    draw_plan(s)
    bar_y, h = draw_brief_bar(s, expand=False, stats=stats_normal())
    log_y = bar_y + h + 6
    log_h = LOG_BOTTOM - log_y
    draw_log(s, log_y, log_h, [
        ('', '沈衡在灰窯鎮歇腳。鎮公所的「灰髯狼 ×3」已揭下。'),
        ('dim', '點建築進去，點路人交談。離鎮後每個地點都能探查。'),
        ('', '老窯客棧裡人聲普通，街上與昨日相仿。'),
        ('dim', '（日誌為既有區塊，條加高後略縮；本包不改寫法。）'),
    ])
    s.L('既有城鎮平面圖', MX, Y0, PLAN_W, PLAN_H, '14/700 建築名（示意）', '--town-plan',
        '建築與路人沿用實機熱區；本包不改尺寸',
        '對齊 v0.3：原生 398×260，顯示 796×520。鎮名與「離開・地圖」為既有 HUD（鈕高 26，不在本包重設）。',
        bx=MX + 118, by=Y0 + 10)
    s.L('城況收合條', BAR_X, BAR_Y, BAR_W, BAR_H_COLLAPSE, '16/400 標籤・18/700 檔名', '--brief-bar',
        '同框 782×56；點條內三要項或空白＝展開簡報',
        '取代實機 townbar（40 高）。左籤「城況」48×44。收合只留繁榮／治安／財庫（Q3 甲）；駐軍、匪勢點開才看。資料讀 brief，UI 不重跑日結。',
        bx=BAR_X + 2, by=BAR_Y - 8)
    s.L('要項：繁榮（五檔文字）', BAR_X + 62, BAR_Y + 6, 176, 44, '16/400・18/700', '--brief-prosper',
        '同框 176×44；滑過看數字，點＝展開',
        '檔名已定：荒涼／冷清／平常／熱鬧／繁華。門檻 <25／25–39／40–59／60–74／≥75（SPEC-01 §7、X-h）。本圖 P=50 平常；|dP|<0.5 顯示持平、收合不畫箭頭。讀 towns.P、brief.dP。',
        bx=BAR_X + 62, by=BAR_Y - 8)
    s.L('要項：治安', BAR_X + 246, BAR_Y + 6, 176, 44, '16/400・18/700', '--brief-order',
        '同框 176×44；滑過看數字，點＝展開',
        '五檔已定：混亂／不安／尚可／安穩／太平。門檻 <25／25–44／45–64／65–84／≥85。本圖 O=55 尚可。讀 towns.O。收合只顯示檔名。',
        bx=BAR_X + 246, by=BAR_Y - 8)
    s.L('要項：財庫（四檔短語）', BAR_X + 430, BAR_Y + 6, 176, 44, '16/400・18/700', '--brief-treasury',
        '同框 176×44；滑過看數字，點＝展開',
        '讀 brief.treasuryTier：欠餉／滿庫／吃緊／足餉（SPEC-01 §7.3）。本圖起手 ok→足餉（T 顯示 208≥45）。現額與收支在展開態。',
        bx=BAR_X + 430, by=BAR_Y - 8)
    s.L('探查（既有，併入條內）', BAR_X + BAR_W - 8 - 132, BAR_Y + 6, 132, 44, '16/700', '--explore',
        '同框 132×44',
        '熱區加到 44（Q6 甲）。花費 1 小時。離開・地圖仍 26 高，留到後續 HUD 包再改。',
        bx=BAR_X + BAR_W - 28, by=BAR_Y - 8)
    s.L('既有日誌', BAR_X, log_y, BAR_W, log_h, '11/400', '--town-log',
        '—（閱讀）',
        '實機 street 日誌 top=572 h=130；條加高後略縮，寫法不變。',
        bx=BAR_X + BAR_W - 22, by=log_y)
    s.note('資訊層級：收合＝繁榮檔名（持平無箭頭）＋治安檔名＋財庫四檔短語；現額、收支、駐軍、匪勢、路險、持平句、介入都放到展開態（見 UI-02-02）。')
    s.note('左右欄已對齊 de91435 實機結構：去掉地面格與小地圖（改勢力清單）；右欄身份示例改「平民」，熟練為山野六項（採藥／挖礦／追蹤／剝皮／野營／探幽），素質序為體膂身靈心悟口。左右欄示意不編號。')
    s.note('紅色只用於編號圓章。本圖為平常城況，無紅字警示。')
    return s


def ui02_02():
    s = Screen('UI-02-02', '城況展開態（簡報）',
               '點收合條後展開：三要項原位露出數字；財庫為四檔短語＋現額，詳情列出今日收入／支出／淨額。持平日只寫「與昨日持平」，不出因果句。資料讀 brief，不重跑日結。')
    draw_left(s)
    draw_right(s, n_quest=1)
    draw_plan(s)
    s.layer = 1
    top, bar_h, _ = expand_geometry(False, 3)
    bar_y, h = draw_brief_bar(s, expand=True, stats=stats_normal(), y=top)
    det_y = bar_y + h
    det_h = LOG_BOTTOM - det_y
    lines = [
        '與昨日持平',
        '今日收入 23　今日支出 15　今日淨額 +8',
        '現額 208',
    ]
    secondary = '駐軍 自衛隊　匪勢 零星 30　官道風險 平常　交易稅 5%'
    actions = [('', '資助巡邏 100兩'), ('', '投資巡邏所'), ('dash', '尚無剿匪委託')]
    draw_brief_detail(s, det_y, det_h, lines=lines, secondary=secondary, actions=actions)
    act_y = LOG_BOTTOM - 8 - 44
    s.L('展開後的三要項（露出數字）', BAR_X + 62, bar_y + 4, 536, 64, '16/400・18/700・16/400 數字', '--brief-numbers',
        '同框；再點或按「收合」＝回到 UI-02-01',
        '對齊 SPEC-01 v0.3 §7.2 起手日：P=50、O=55、T 顯示 208。財庫檔名讀 brief.treasuryTier＝ok→足餉；現額讀 round(T)。',
        bx=BAR_X + 62, by=bar_y - 8 if bar_y >= 10 else bar_y + 2)
    s.L('收合', BAR_X + BAR_W - 8 - 132, bar_y + (h - 44) // 2, 132, 44, '16/700', '--brief-collapse',
        '同框 132×44',
        '展開時暫代探查鈕位置；收合後探查回到原位。',
        bx=BAR_X + BAR_W - 28, by=bar_y - 8 if bar_y >= 10 else bar_y + 2)
    s.L('持平句（不出因果）', BAR_X + 12, det_y + 8, BAR_W - 24, 22, '16/400', '--brief-flat',
        '—（閱讀；不單獨點）',
        'brief.trend===flat（|dP|<0.5）時 whyCode=null，不寫因果句，只顯示檔位與「與昨日持平」（§7.5）。無數字、無鎮名，≤22 字。',
        bx=BAR_X + BAR_W - 22, by=det_y + 8)
    s.L('財庫收支（讀 brief 整數）', BAR_X + 12, det_y + 8 + 22, BAR_W - 24, 44, '16/400', '--brief-treasury-io',
        '—（閱讀）',
        'treasuryIn／Out／Net 為 brief 已四捨五入的整數，Net＝取整後兩數相減。本圖 23／15／+8、現額 208（v0.3 §7.2 手算）。taxCutDays=0，第三行「稅收抽成，餘 X 天」隱藏。',
        bx=BAR_X + BAR_W - 22, by=det_y + 8 + 22)
    s.L('次要資訊：駐軍／匪勢／路險／稅', BAR_X + 12, det_y + 8 + 22 * 3 + 4, BAR_W - 24, 22, '16/400', '--brief-secondary',
        '—（閱讀；危險時轉警示）',
        '駐軍讀 Geff（無／自衛隊／巡邏隊／駐軍）。匪勢四檔：絕跡／零星／猖獗／橫行（<15／15–34／35–59／≥60），本圖 B=30 零星。路險與交易稅點開才看（Q3 甲）。',
        bx=BAR_X + BAR_W - 22, by=det_y + 8 + 22 * 3 + 4)
    s.L('介入：資助巡邏', BAR_X + 12, act_y, 246, 44, '16/700', '--act-fund',
        '同框 246×44',
        'SPEC-01：資助單位 50／100／200 兩，進 F；100 兩在灰窯可加派 4 天。本鈕示意 100 兩一檔，點了走確認（本包不畫付款流程）。',
        bx=BAR_X + 12, by=act_y - 10)
    s.L('介入：投資巡邏所', BAR_X + 12 + 254, act_y, 246, 44, '16/700', '--act-invest',
        '同框 246×44',
        'SPEC-01：巡邏所 Lv1 100／Lv2 300／Lv3 600，須依序。MVP 只做巡邏所。點開後另走確認（本包不畫付款流程）。',
        bx=BAR_X + 12 + 254, by=act_y - 10)
    s.L('介入：剿匪（無委託時禁用）', BAR_X + 12 + 508, act_y, 246, 44, '16/700', '--act-bandit',
        '同框 246×44；無委託＝虛線禁用',
        '有剿匪委託時改標「看剿匪委託」，點了帶去鎮公所委託板。不把通緝告示塞進來（UI-03）。',
        bx=BAR_X + BAR_W - 28, by=act_y - 10)
    s.note(f'展開塊自下緣 y=708 往上排滿內容（本圖上緣約 y={top}）。若略高於平面圖下緣 y=526，只蓋出口下方空帶，不遮建築與路人。日誌在展開期間讓位，收合後回來。')
    s.note('不顯示：通緝（UI-03）、勢力影響力（v0.5）、精確公式。左右欄示意同 UI-02-01，不編號。')
    s.note('紅色只用於編號圓章。本圖為平常城況，無紅字警示。求援條因 rescueToday=false 不出現。')
    return s


def ui02_03():
    s = Screen('UI-02-03', '荒涼警示態（展開）',
               '獸潮過後受創的灰窯鎮：繁榮荒涼、治安混亂（紅字）。欠餉滿 3 天已自動求援（MVP 只做抽成）；警示條只在求援當日出現。不另設求援鈕。')
    draw_left(s)
    draw_right(s, loc='灰窯鎮')
    draw_plan(s, hurt=True)
    s.layer = 1
    top, bar_h, _ = expand_geometry(True, 3)
    bar_y, h = draw_brief_bar(s, expand=True, stats=stats_hurt(), danger=True, y=top)
    det_y = bar_y + h
    det_h = LOG_BOTTOM - det_y
    lines = [
        '繁榮較昨日降，鎮上受創',
        '今日收入 90　今日支出 0　今日淨額 +90　現額 90',
        '稅收抽成，餘 10 天',
    ]
    secondary = '駐軍 無（欠餉）　匪勢 猖獗 40　官道風險 升高　交易稅 5%'
    actions = [('', '資助巡邏 100兩'), ('', '投資巡邏所'), ('dash', '尚無剿匪委託')]
    draw_brief_detail(s, det_y, det_h,
                      lines=lines, secondary=secondary, actions=actions,
                      alert='已求援：補貼90兩')
    act_y = LOG_BOTTOM - 8 - 44
    s.L('危險態三要項（紅框紅字）', BAR_X + 62, bar_y + 4, 536, 64, '16/400・18/700 紅', '--brief-danger-stats',
        '同框；點收合可回到收合條（仍保留紅框）',
        'P=18→荒涼（<25），O=22→混亂（<25）。財庫檔名讀 treasuryTier＝debt→欠餉；現額 90。↓＝brief.dP／dO。',
        bx=BAR_X + 62, by=bar_y - 8 if bar_y >= 10 else bar_y + 2)
    s.L('求援警示條（只在當日）', BAR_X + 8, det_y + 8, BAR_W - 16, 28, '16/700 紅', '--brief-alert',
        '—（閱讀；求援為日結自動觸發，無按鈕）',
        '只在 brief.rescueToday 為真時顯示，可帶 brief.rescueAmt（灰窯 90）。本圖文案暫名「已求援：補貼90兩」，交 LOC。',
        bx=BAR_X + 10, by=det_y - 8 if det_y >= 10 else det_y + 2)
    s.L('因果正文（1 句，無鎮名無數字）', BAR_X + 12, det_y + 8 + 32, BAR_W - 24, 22, '16/400', '--brief-cause-hurt',
        '—（閱讀）',
        'whyCode＝WHY_HURT。格式：無 {town}、無數字、≤22 字。本圖「繁榮較昨日降，鎮上受創」為暫名，交 LOC。',
        bx=BAR_X + BAR_W - 22, by=det_y + 8 + 32)
    s.L('財庫收支（求援計入收入）', BAR_X + 12, det_y + 8 + 32 + 22, BAR_W - 24, 44, '16/400', '--brief-treasury-rescue',
        '—（閱讀）',
        'rescueAmt 計入 treasuryIn（§7.2），本圖示意入 90、出 0、淨 +90、現額 90。第三行「稅收抽成，餘 10 天」因 taxCutDays=10 顯示；為 0 時隱藏。',
        bx=BAR_X + BAR_W - 22, by=det_y + 8 + 32 + 22)
    s.L('次要資訊（欠餉／匪勢猖獗）', BAR_X + 12, det_y + 8 + 32 + 22 * 3 + 4, BAR_W - 24, 22, '16/400', '--brief-sec-hurt',
        '—（閱讀）',
        '駐軍讀今日 Geff：欠餉只降一檔（1→0「無」），求援不即時復檔。匪勢 B=40→猖獗（≥35）。抽成餘日已寫在財庫第三行，此列不再重複。',
        bx=BAR_X + BAR_W - 22, by=det_y + 8 + 32 + 22 * 3 + 4)
    s.L('平面圖受創標（既有危急，提到條上）', MX + 200, Y0 + 6, 280, 26, '14/700 紅', '--hurt-flag',
        '—（狀態標，不可點）',
        '對齊實機 townbar 在獸潮／受創時改紅字的做法；本包改放到平面圖上緣，避免跟城況三要項搶位置。',
        bx=MX + 200, by=Y0 + 34)
    s.note('展開塊因多了警示條與財庫行，上緣可能蓋到平面圖下緣出口帶（Q5 甲，最多 80px），街上建築仍可見。收合態完全不遮平面圖。')
    s.note('紅色只用在：編號圓章、危險檔名（荒涼／混亂）、求援警示、平面圖受創標。資助／投資仍是黑字灰框。求援無操作鈕。')
    s.note('不顯示通緝告示。不使用舊專案詞。03 數字為示意組合（對齊門檻與補貼常數），不是 §7.2 起手日手算。')
    return s


def ui02_04():
    s = Screen('UI-02-04', '大城總覽（2–4 區，非 MVP）',
               'v0.6 大城：中欄上緣一行城況＋麵包屑；中間是分坊總覽（本圖 4 坊），每坊看出繁榮、治安與支配勢力。點坊一次進入與鎮上相同的平面圖。名稱皆暫名。')
    draw_left(s)
    draw_right(s, loc='鎮西城', n_quest=0)
    s.box(MX, Y0, MW, CH, 'z')
    top_h = 56
    s.box(MX, Y0, MW, top_h, 'p')
    s.t(MX + 10, Y0 + 17, 220, '地圖 / 鎮西城 / 總覽', 'f16', 'dim')
    chips = [('繁榮', '熱鬧'), ('治安', '尚可'), ('財庫', '—')]
    cx = MX + 230
    for i, (lb, v) in enumerate(chips):
        x = cx + i * 150
        s.box(x, Y0 + 6, 142, 44, 'sel')
        s.t(x + 8, Y0 + 17, 44, lb, 'f16', 'dim')
        s.t(x + 52, Y0 + 15, 82, v, 'f18b')
    OV_Y = Y0 + top_h
    OV_H = 560
    s.box(MX, OV_Y, 796, OV_H, 'art')
    wards = [
        (0, 0, '衙城', '熱鬧', '安穩', '白虎軍', True),
        (1, 0, '東市', '繁華', '尚可', '天星商會', False),
        (0, 1, '西關', '平常', '安穩', '白虎軍', False),
        (1, 1, '南津', '冷清', '不安', '—', False),
    ]
    for c, r, name, p, o, fac, on in wards:
        x = MX + 16 + c * (376 + 12)
        y = OV_Y + 16 + r * (258 + 12)
        danger = o == '不安'
        s.box(x, y, 376, 258, 'sel' if on else ('rd' if danger else 'p'))
        s.t(x + 16, y + 16, 200, name, 'f18b')
        s.t(x + 16, y + 48, 340, '繁榮  ' + p, 'f16')
        s.t(x + 16, y + 74, 340, '治安  ' + o, 'f16', 'red' if danger else '')
        s.t(x + 16, y + 100, 340, '支配  ' + fac, 'f16', 'dim')
        if on:
            s.t(x + 220, y + 16, 140, '已選', 'f16', 'r dim')
    bot_y = OV_Y + OV_H
    s.box(MX, bot_y, 796, 86, 'p')
    s.t(MX + 16, bot_y + 18, 520, '點坊一次選取，再點或按右側鈕進入該坊街道。', 'f16', 'dim')
    s.btn(MX + 796 - 16 - 200, bot_y + 18, 200, 44, '進入此坊', '', 'f16b')
    s.L('麵包屑＋城況一行', MX, Y0, MW, top_h, '16/400・18/700', '--city-top',
        '同框 796×56',
        '大城預留。財庫本圖暫「—」（無 brief）；上色前改讀該城／坊 treasuryTier 四檔。',
        bx=MX + 10, by=Y0 + 2)
    s.L('坊：衙城（已選）', MX + 16, OV_Y + 16, 376, 258, '22/700・16/400', '--ward-yamen',
        '同框 376×258；點＝選取',
        '示意行政坊。勢力與坊名皆暫名，待藍圖拍板。',
        bx=MX + 18, by=OV_Y + 18)
    s.L('坊：東市', MX + 16 + 388, OV_Y + 16, 376, 258, '22/700・16/400', '--ward-east',
        '同框 376×258；點＝選取',
        '示意商貿坊由天星商會支配。勢力與坊名皆暫名。',
        bx=MX + 16 + 388, by=OV_Y + 18)
    s.L('坊：西關', MX + 16, OV_Y + 16 + 270, 376, 258, '22/700・16/400', '--ward-west',
        '同框 376×258；點＝選取',
        '示意關城／軍營坊。',
        bx=MX + 18, by=OV_Y + 16 + 270)
    s.L('坊：南津（治安不安，紅字）', MX + 16 + 388, OV_Y + 16 + 270, 376, 258, '22/700・16/400 紅＝不安', '--ward-south',
        '同框 376×258；點＝選取',
        '示範四坊不必同一檔。支配「—」表示尚未揭露或無單一支配（待 SPEC／藍圖）。',
        bx=MX + 16 + 388, by=OV_Y + 16 + 270)
    s.L('進入此坊', MX + 796 - 16 - 200, bot_y + 18, 200, 44, '16/700', '--enter-ward',
        '同框 200×44',
        '選坊後可從底列進入，等同再點已選坊。進坊後中欄換成 796×520 平面圖＋UI-02-01 的城況條。',
        bx=MX + 796 - 28, by=bot_y + 6)
    s.note('本圖為 v0.6 大城預留，不在第一批兩鎮範圍。尺寸：上緣 56＋總覽 796×560＋底列 86＝欄高 708，地圖視窗對齊 WORLD-MAP-SPEC 的 796×560。')
    s.note('不加欄、不改 240／796／220。鎮西城、四坊名、白虎軍／天星商會皆暫名。不畫大陸圖（ART-01）。')
    s.note('紅色只用於編號圓章，以及南津「不安」這項危險檔名。財庫四檔已定，本圖無 brief 故暫「—」。左右欄已去掉地面、改平民。')
    return s


# ---------- 地圖節點（data.js NODES／EDGES，略去 hidden） ----------
MAP_NODES = {
    'huiyao': ('灰窯鎮', '鎮', 678, 330),
    'yizhan': ('官道驛站', '驛', 496, 205),
    'duyin': ('渡陰關', '關', 316, 92),
    'poxiao': ('破曉營', '營', 106, 100),
    'chakou': ('野徑岔口', '岔', 478, 350),
    'qingwu': ('青霧藥林', '林', 291, 300),
    'guyao': ('亂葬古窯', '窯', 106, 228),
    'kugu': ('枯骨獸徑', '獸', 186, 400),
    'chishi': ('赤石廢礦', '礦', 396, 480),
    'fuzhao': ('腐骨沼', '沼', 581, 470),
    'jiku': ('沉淵祭窟', '窟', 726, 455),
    'shigu': ('撿骨師營地', '骨', 176, 500),
    'liekou': ('酉神裂口', '裂', 61, 470),
}
MAP_EDGES = [
    ('huiyao', 'yizhan', True),
    ('yizhan', 'duyin', True),
    ('duyin', 'poxiao', True),
    ('huiyao', 'chakou', False),
    ('yizhan', 'chakou', False),
    ('chakou', 'qingwu', False),
    ('chakou', 'chishi', False),
    ('qingwu', 'guyao', False),
    ('qingwu', 'kugu', False),
    ('poxiao', 'guyao', False),
    ('chishi', 'kugu', False),
    ('chishi', 'fuzhao', False),
    ('huiyao', 'fuzhao', False),
    ('fuzhao', 'jiku', False),
    ('kugu', 'shigu', False),
    ('shigu', 'liekou', False),
]
MAP_ROUTE = {('huiyao', 'chakou'), ('chakou', 'huiyao'), ('chakou', 'qingwu'), ('qingwu', 'chakou')}
MAP_LABELS = [('灰窯原', 640, 250), ('青霧山', 250, 372), ('腐骨沼', 610, 512)]  # 略去實機「血霧」標籤，見說明

# 擬用詞（交 LOC 確認），見 wording-map-commission.md
TERM_TIPS = {
    '路程': '依這條路線的基礎時數與目前腳程算出，是這次出發會耗掉的時辰。',
    '飽食': '趕路會消耗飽食；降到過低時，生命不再回復。',
    '疲累': '趕路會累積疲累；過高時命中與趕路都會變慢。',
    '危險': '這條路上遇襲的高低；夜間、負重過高或走野徑時較容易遇險。',
    '腳程': '負重、裝備與疲累會影響趕路速度',
}


def _map_pt(nx, ny):
    return MX + nx, Y0 + ny


def draw_world_map(s, dest='qingwu'):
    """區域圖 796×560，對齊實機 sceneMap。"""
    s.box(MX, Y0, MW, 560, 'map')
    # 先畫路
    for a, b, road in MAP_EDGES:
        ax, ay = MAP_NODES[a][2], MAP_NODES[a][3]
        bx, by = MAP_NODES[b][2], MAP_NODES[b][3]
        x1, y1 = _map_pt(ax, ay)
        x2, y2 = _map_pt(bx, by)
        on = (a, b) in MAP_ROUTE or (b, a) in MAP_ROUTE
        s.line(x1, y1, x2, y2, kind='selr' if on else ('road' if road else 'trail'))
    for name, x, y in MAP_LABELS:
        px, py = _map_pt(x, y)
        s.box(px, py, 72, 18, 'mlabel')
        s.t(px, py + 1, 72, name, 'f12', 'c dim')
    for nid, (name, g, x, y) in MAP_NODES.items():
        px, py = _map_pt(x - 19, y - 19)
        cls = 'sel' if nid == dest else ('glow' if nid == 'huiyao' else 'p')
        s.box(px, py, 38, 38, cls)
        s.t(px, py + 8, 38, g, 'f14b', 'c')
        s.box(px - 15, py + 40, 68, 18, 'mlabel')
        s.t(px - 15, py + 41, 68, name, 'f11', 'c')
        if nid == 'huiyao':
            s.box(px + 19 - 22, py - 18, 44, 18, 'fill')
            s.t(px + 19 - 22, py - 17, 44, '此地', 'f11b', 'c inkog')
    # 大陸圖、圖例（實機既有）
    s.btn(MX + 796 - 6 - 80, Y0 + 6, 80, 24, '大陸圖', '', 'f10')
    s.t(MX + 8, Y0 + 8, 200, '━ 官道　　╍ 野徑', 'f11', 'dim')
    # 懸浮標籤（完整用詞，兩行以免蓋住左側地名）
    n = MAP_NODES[dest]
    tw, th = 248, 68
    tx = MX + n[2] - tw // 2
    tx = max(MX + 6, min(MX + 796 - tw - 6, tx))
    ty = Y0 + n[3] - 19 - 8 - th
    s.box(tx, ty, tw, th, 'sel')
    s.t(tx, ty + 2, tw, '路程 2 小時・飽食 −8', 'f16b', 'c')
    s.t(tx, ty + 24, tw, '疲累 +5・<span class="red">危險 高</span>', 'f16b', 'c', raw=True)
    s.t(tx, ty + 46, tw, '腳程 ×1.08', 'f16b', 'c')
    return tx, ty, tw, th


def draw_depart_bar(s, y, h):
    """目的地詳情條：完整用詞、熱區 44、擬用懸浮說明。"""
    s.box(BAR_X, y, BAR_W, h, 'p')
    s.box(BAR_X + 8, y + (h - 44) // 2, 44, 44, 'sel')
    s.t(BAR_X + 8, y + (h - 22) // 2, 44, '林', 'f16b', 'c')
    s.t(BAR_X + 60, y + 8, 150, '青霧藥林', 'f16b')
    s.t(BAR_X + 60, y + 32, 150, '經 野徑岔口', 'f16', 'dim')
    # 五個完整用詞格
    pills = [
        ('路程', '2 小時', False),
        ('飽食', '−8', False),
        ('疲累', '+5', False),
        ('危險', '高', True),
        ('腳程', '×1.08', False),
    ]
    # 名稱 150 + 缺口後，剩餘給 5 pill + 前往
    px = BAR_X + 220
    pw = 80
    gap = 6
    widths = [80, 76, 76, 76, 84]
    py = y + (h - 44) // 2
    acc = px
    boxes = []
    for (lab, val, hot), ww in zip(pills, widths):
        cls = 'rd' if hot else 'sel'
        s.box(acc, py, ww, 44, cls)
        s.t(acc + 2, py + 2, ww - 4, lab, 'f16 term', 'c' + (' red' if hot else ' dim'))
        s.t(acc + 2, py + 22, ww - 4, val, 'f16b', 'c' + (' red' if hot else ''))
        boxes.append((lab, acc, py, ww))
        acc += ww + gap
    # 前往
    bx = BAR_X + BAR_W - 8 - 104
    s.btn(bx, py, 104, 44, '前往', 'pri', 'f16b')
    return boxes, bx, py


def ui02_05():
    s = Screen('UI-02-05', '地圖趕路・地點詳情（完整用詞）',
               '選了青霧藥林：圖上虛線為野徑，選定路線加粗（上色後為金）。灰窯鎮有「此地」籤。懸浮標籤與底列改用完整用詞；底列每一項可滑過看一句說明。用詞為擬案，交本地化編輯確認。')
    draw_left(s, reps=[('破曉軍團', '3'), ('天星商會', '0'), ('鴉衛', '0'), ('鎮西將軍府', '0')],
              load=('28/80', 0.35, '×1.08'))
    draw_right(s, loc='灰窯鎮', n_quest=4, n_rumor='1/3',
               rumor_line='秘寶・亂葬古窯　3天',
               quest=[
                   ('狼', '灰髯狼 0/3', '枯骨獸徑・長期', '40'),
                   ('豬', '山豬 0/2', '枯骨獸徑・剩 3 天', '40'),
                   ('包', '送貨至渡陰關', '剩 2 天', '24'),
               ])
    s.box(MX, Y0, MW, CH, 'z')
    tx, ty, tw, th = draw_world_map(s, 'qingwu')
    bar_y, bar_h = Y0 + 566, 72
    boxes, go_x, go_y = draw_depart_bar(s, bar_y, bar_h)
    log_y = bar_y + bar_h + 6
    log_h = LOG_BOTTOM - log_y
    draw_log(s, log_y, log_h, [
        ('', '點青霧藥林，路線經野徑岔口。'),
        ('dim', '（日誌為既有區塊；底列加高後略縮。）'),
    ])
    # 負重的懸浮說明（示範一句、不寫 UI 未讀的數字）
    tip_x, tip_y = MX + 796 - 8 - 320, Y0 + 36
    s.box(tip_x, tip_y, 320, 76, 'tip')
    s.t(tip_x + 8, tip_y + 4, 304, '腳程', 'f16b')
    s.t(tip_x + 8, tip_y + 28, 304, TERM_TIPS['腳程'], 'f16', 'ml dim', h=44)

    nq = MAP_NODES['qingwu']
    s.L('區域圖（既有）', MX, Y0, MW, 560, '11/400 地名', '--map-canvas',
        '點地點＝設目的地',
        '尺寸對齊實機 796×560。節點座標取自 data.js。隱藏點（鴉巢、無名古塚）未揭則不畫。實機區域標有「血霧」一詞，本圖略去，待 LOC 另擬。',
        bx=MX + 8, by=Y0 + 28)
    s.L('選定路線（上色後為金）', MX + 478, Y0 + 330, 80, 24, '—', '--route-selected',
        '—（狀態，隨目的地）',
        '實機選中邊以金色實線加粗（token --route-selected）。灰階以加粗實線表示；未選野徑仍用虛線，官道用細實線。',
        bx=MX + 520, by=Y0 + 348)
    s.L('此地籤', MX + 678 - 22, Y0 + 330 - 44, 44, 18, '11/700', '--here-tag',
        '—（狀態標）',
        '只出現在目前所在地。本圖在灰窯鎮。',
        bx=MX + 678 - 22, by=Y0 + 330 - 62)
    s.L('圖上懸浮（完整用詞）', tx, ty, tw, th, '16/700', '--route-tip',
        '—（滑過／選中時出現）',
        '與底列同一套完整用詞，不再寫「食／疲／險」。危險為路線遇襲檔（低／中／高），與地點固有險級（WILDS.risk）不是同一欄。擬案，交 LOC。',
        bx=tx, by=ty - 14)
    s.L('目的地詳情條', BAR_X, bar_y, BAR_W, bar_h, '16/400・16/700', '--depart-bar',
        '同框 782×72；各格可滑過',
        '實機 departbar 高 56、用字為「時／食／疲／險／負」。本圖加高到 72 以容納 16px 與 44 熱區，並改完整用詞。日誌隨之略縮。',
        bx=BAR_X + 2, by=bar_y - 8)
    # 各用詞格
    tokens = {
        '路程': '--term-hours',
        '飽食': '--term-food',
        '疲累': '--term-fatigue',
        '危險': '--term-risk',
        '腳程': '--term-pace',
    }
    for lab, x, y, w in boxes:
        s.L('用詞：' + lab, x, y, w, 44, '16/400・16/700' + (' 紅' if lab == '危險' else ''),
            tokens[lab],
            '同框 ' + str(w) + '×44；滑過出一句說明',
            '擬案。說明：「' + TERM_TIPS[lab] + '」。危險「高」用紅字（關鍵危險警示）。「腳程」＝speedMult()，用來除基礎時數。',
            bx=x + w - 22, by=y - 14)
    s.L('前往', go_x, go_y, 104, 44, '16/700', '--btn-travel',
        '同框 104×44',
        '對齊實機 data-a=travel。背重超過上限 1.25 倍時會被擋住（實機既有）。',
        bx=go_x + 80, by=go_y - 14)
    s.L('用詞說明（示範）', tip_x, tip_y, 320, 76, '16/700・16/400', '--term-tooltip',
        '—（滑過才出現）',
        '本圖展開「腳程」一句。全文見 wording-map-commission.md。',
        bx=tip_x, by=tip_y - 14)
    s.note('左欄對齊地圖畫面例：行囊＋勢力數字 3／0／0／0（破曉 3，其餘 0；鎮西將軍府在揭開 c_warlord 後才出現）。已去掉地面與小地圖。右欄：山野六項、委託 4、傳聞 1/3。')
    s.note('16:29 拍板：底列第五格改名「腳程 ×M」（本圖 ×1.08）。懸浮：「負重、裝備與疲累會影響趕路速度」。機制仍是 speedMult()，用來除基礎時數。')
    s.note('選定路線用實機色 --route #e3bb5c（token --route-selected）。紅色只用在編號圓章與危險「高」。')
    s.note('暫定（interim）：區域圖「血霧」地名仍略去；路線危險與地點險級尚未統一；地面移除後溢出物去向未定。')
    return s


# 委託單色票（灰階處理＋預定 token，上色後才上彩）
# 目標 --quest-target：深底或加粗，預定墨色／金強調
# 時限一般 --quest-due：細框淺底
# 時限緊急 --quest-due-urgent：實心底＋紅字（剩 ≤ 1 日）
# 報酬 --quest-reward：淺底，預定金色
# 風險低 --risk-low：淺底細框
# 風險中 --risk-mid：中灰底
# 風險中高／極高／高 --risk-high：重框＋紅字


def draw_sheet(s, x, y, w, h, card):
    """一張正方形委託單（上色：目標／時限／報酬／風險用正式 token）。"""
    s.box(x, y, w, h, 'p')
    pad = 8
    s.box(x + pad, y + 6, w - pad * 2, 28, 'target')
    s.t(x + pad + 4, y + 6, 36, '目標', 'f11b', 'gold')
    s.t(x + pad + 42, y + 8, w - pad * 2 - 46, card['target'], 'f18b', 'gold')
    s.t(x + pad, y + 38, w - pad * 2, card['place'], 'f16')
    s.box(x + pad, y + 62, w - pad * 2, 24, 'reward')
    s.t(x + pad + 4, y + 64, w - pad * 2 - 8, card['reward'], 'f16', 'gold')
    urgent = card.get('urgent')
    s.box(x + pad, y + 90, w - pad * 2, 28, 'due-urgent' if urgent else 'due')
    s.t(x + pad + 4, y + 94, 40, '時限', 'f16', 'on-alert' if urgent else 'dim')
    s.t(x + pad + 44, y + 94, w - pad * 2 - 48, card['due'], 'f16b', 'on-alert' if urgent else '')
    rhot = card.get('risk_hot')
    pending = card.get('risk_pending')
    rk = card.get('risk_key', 'unk')  # low mid high unk
    rcls = {'low': 'risk-low', 'mid': 'risk-mid', 'high': 'risk-high'}.get(rk, 'risk-unk')
    mark = {'low': '◇', 'mid': '△', 'high': '!', 'unk': '?'}.get(rk, '?')
    mcol = 'on-alert' if rhot or rk == 'high' else ('jade' if rk == 'low' else ('gold' if rk == 'mid' else 'dim'))
    s.box(x + pad, y + 122, w - pad * 2, 44, rcls)
    s.box(x + pad + 4, y + 126, 20, 20, 'in')
    s.t(x + pad + 4, y + 126, 20, mark, 'f16b', 'c ' + mcol)
    s.t(x + pad + 28, y + 124, 40, '風險', 'f16', 'on-alert' if rk == 'high' else 'dim')
    s.t(x + pad + 68, y + 124, w - pad * 2 - 72, card['risk'], 'f16b', mcol)
    s.t(x + pad + 28, y + 144, w - pad * 2 - 32, card['fail'], 'f16', 'on-alert' if rk == 'high' else ('dim' if pending else ''))
    by = y + h - pad - 44
    if card.get('prog'):
        s.box(x + pad, by, w - pad * 2, 44, 'sel')
        s.t(x + pad, by + 11, w - pad * 2, card['prog'], 'f16b', 'c gold')
    else:
        s.btn(x + pad, by, w - pad * 2, 44, '揭榜', '', 'f16b')
    return x + pad, by, w - pad * 2, 44


SHEETS = [
    dict(target='獵殺 灰髯狼 ×3', place='枯骨獸徑・青霧藥林', reward='報酬 40 兩',
         due='長期', urgent=False, risk='危險 中', fail='失敗罰則未定',
         risk_pending=True, risk_hot=False, risk_key='mid', prog=None,
         note='固定起手榜，無 due。地點險取較高者（枯骨獸徑 中＞青霧藥林 低）。長期無逾期處理，失敗罰則待數值設計師。'),
    dict(target='收購 止血草 ×4', place='帶回此地交付', reward='報酬 18 兩',
         due='剩 1 天', urgent=True, risk='危險 未定', fail='逾期則撕榜',
         risk_pending=True, risk_hot=False, risk_key='unk', prog=None,
         note='收集類無目的地險級欄，危險標未定（待數值設計師）。逾期後果為實機既有：撕榜。報酬為示意整數。'),
    dict(target='送貨至渡陰關', place='送到渡陰關', reward='報酬 24 兩・押金 10 兩',
         due='剩 2 天', urgent=False, risk='危險 未定', fail='逾期押金沒收',
         risk_pending=True, risk_hot=False, risk_key='unk', prog=None,
         note='目的地為城鎮，data.js 無城鎮險級。逾期沒收押金為實機既有。押金 10、報酬 24 讀 QUEST_GEN.deliver。'),
    dict(target='獵殺 山豬 ×2', place='枯骨獸徑', reward='報酬 40 兩',
         due='剩 3 天', urgent=False, risk='危險 中', fail='逾期則撕榜',
         risk_pending=False, risk_hot=False, risk_key='mid', prog=None,
         note='WILDS.kugu.risk＝中。逾期撕榜。'),
    dict(target='獵殺 逃兵 ×1', place='野徑岔口', reward='報酬 30 兩',
         due='剩 4 天', urgent=False, risk='危險 低', fail='逾期則撕榜',
         risk_pending=False, risk_hot=False, risk_key='low', prog=None,
         note='WILDS.chakou.risk＝低。'),
    dict(target='獵殺 沼蛭 ×2', place='腐骨沼', reward='報酬 34 兩',
         due='剩 1 天', urgent=True, risk='危險 中高', fail='逾期則撕榜',
         risk_pending=False, risk_hot=True, risk_key='high', prog='進度 0/2',
         note='已揭榜，改顯示進度（熱區 44）。腐骨沼 risk＝中高，紅字。剩 1 天為緊急時限，紅字。'),
]


def ui02_06():
    s = Screen('UI-02-06', '鎮公所・委託單（含風險提示）',
               '把原 3×2 扁卡改成方形委託單，填滿頭欄與日誌之間的空白。風險提示寫在單上（險級＋一句失敗後果），不另開確認窗。時限與目標用灰階塊面區分，預定色票寫在圖例。用詞為擬案，交本地化編輯。')
    draw_left(s)
    draw_right(s, n_quest=1, n_rumor='1/3', rumor_line='秘寶・亂葬古窯　3天')
    s.box(MX, Y0, MW, CH, 'z')
    # NPC 頭欄（對齊實機 bhead 796×132）
    s.box(MX, Y0, MW, 132, 'p')
    s.box(MX + 10, Y0 + 10, 104, 104, 'art')
    s.t(MX + 10, Y0 + 46, 104, '肖像', 'f14', 'c dim')
    s.t(MX + 10, Y0 + 68, 104, '示意', 'f12', 'c dim')
    s.t(MX + 126, Y0 + 14, 170, '鎮公所', 'f18b', 'gold serif')
    s.t(MX + 126, Y0 + 42, 170, '周里正・灰窯鎮里正', 'f16')
    s.t(MX + 126, Y0 + 66, 170, '破曉軍團 0', 'f16', 'dim')
    s.box(MX + 304, Y0 + 12, 372, 104, 'p')
    s.t(MX + 316, Y0 + 44, 348, '板上的都是這幾日要辦的。', 'f16')
    s.btn(MX + 796 - 8 - 96, Y0 + 12, 96, 36, '閒談', '', 'f16b')
    s.btn(MX + 796 - 8 - 96, Y0 + 12 + 44, 96, 36, '回到街上', '', 'f16b')
    # tpanel
    PX, PY, PW, PH = MX + 6, Y0 + 138, 784, 498
    s.box(PX, PY, PW, PH, 'z')
    s.t(PX + 8, PY + 6, 400, '委託・灰窯鎮', 'f16b')
    # 3×2 方卡：250×212（保留頭欄 132 與日誌 60 後，淨高只能到約 212；寬 250）
    cw, ch, gap = 250, 212, 8
    grid_w = cw * 3 + gap * 2
    gx = PX + (PW - grid_w) // 2
    gy = PY + 32
    btns = []
    for i, card in enumerate(SHEETS):
        c, r = i % 3, i // 3
        x = gx + c * (cw + gap)
        y = gy + r * (ch + gap)
        btns.append((card, x, y, *draw_sheet(s, x, y, cw, ch, card)))
    # 腳註（實機既有一句，保留）
    foot_y = PY + PH - 28
    s.t(PX + 8, foot_y, PW - 16, '每天補到 3 張，過期撕榜。完成委託會提高破曉軍團的聲望。', 'f16', 'dim')
    # 日誌
    log_y = Y0 + 642
    log_h = 60
    draw_log(s, log_y, log_h, [
        ('', '沈衡進了鎮公所。'),
        ('dim', '（建築內日誌實機 top=642 h=60，本圖沿用。）'),
    ])

    s.L('既有頭欄（NPC）', MX, Y0, MW, 132, '18/700・16/400', '--board-head',
        '閒談／回到街上為既有鈕（實機高 36，本包不重設）',
        '對齊實機 bhead：鎮公所、周里正・灰窯鎮里正、破曉軍團聲望。對話框保留。按鈕文案依原始碼為「閒談」（非「開談」）。',
        bx=MX + 8, by=Y0 + 2)
    s.L('委託單網格（3×2，可捲）', gx, gy, grid_w, ch * 2 + gap, '18/700・16/400', '--sheet-grid',
        '超過 6 張時在此區捲動',
        '單張 250×212。保留既有頭欄與日誌後，高度無法嚴格到 230–250 正方形，故以滿寬 250、盡量接近方形。超過 6 張在網格內捲動（實機原 slice 12）。',
        bx=PX + PW - 24, by=PY + 6)
    # 標第一張的結構層次
    c0x, c0y = gx, gy
    s.L('目標（大字＋塊面）', c0x + 8, c0y + 6, 234, 28, '18/700', '--quest-target',
        '—（閱讀；預定色票 --quest-target）',
        '「獵殺 灰髯狼 ×3」等，含做什麼與數量。灰階用淺底塊強調。預定上色後以墨色／金強調。標題型字串 ≤8 字（本圖目標列剛好 8 字量級，交 LOC 核）。',
        bx=c0x + 234 - 22, by=c0y + 6)
    s.L('時限塊（一般／緊急）', c0x + 8, c0y + 90, 234, 28, '16/700', '--quest-due',
        '—（閱讀）',
        '一般 token --quest-due（細框淺底）；剩 ≤ 1 日 token --quest-due-urgent，紅字＋紅框。文案「剩 X 天」或「長期」。',
        bx=c0x + 200, by=c0y + 76)
    s.L('風險塊（險級＋失敗後果）', c0x + 8, c0y + 122, 234, 44, '16/400・16/700', '--quest-risk',
        '—（閱讀）',
        '險級只讀已有資料：獵殺看目的地 WILDS/DUNGEONS.risk（低／中／中高／極高）；收集與城鎮送貨標「未定」，待數值設計師。失敗一句只寫實機已有後果：逾期撕榜、送貨沒收押金。長期無逾期則寫「失敗罰則未定」。token：--risk-low／--risk-mid／--risk-high（中高、極高、高用紅字）。',
        bx=c0x + 200, by=c0y + 114)
    s.L('揭榜（熱區 44）', c0x + 8, c0y + 212 - 8 - 44, 234, 44, '16/700', '--btn-accept',
        '同框 234×44',
        '對齊實機揭榜（questAct：status→active）。風險已寫在單上，不另開確認窗。送貨仍在按下時扣押金、檢查空格（實機既有，失敗只記日誌）。',
        bx=c0x + 234 - 22, by=c0y + 212 - 8 - 44)
    # 緊急＋中高 示例（第 6 張）
    c5x = gx + 2 * (cw + gap)
    c5y = gy + ch + gap
    s.L('緊急時限＋高險示例', c5x + 8, c5y + 90, 234, 76, '16/700 紅', '--sheet-urgent',
        '—（閱讀）',
        '第 6 張：時限「剩 1 天」紅字（--quest-due-urgent），危險「中高」紅字（--risk-high）。已揭榜改顯示「進度 0/2」，熱區仍 44。',
        bx=c5x + 200, by=c5y + 70)
    s.L('既有腳註', PX + 8, foot_y, PW - 16, 22, '16/400', '--board-foot',
        '—（閱讀）',
        '保留實機一句：每天補到 3 張，過期撕榜。完成委託會提高破曉軍團的聲望。字數超過 22，屬既有句子，不在本包改寫，交 LOC 決定是否縮。',
        bx=PX + 8, by=foot_y - 16)
    s.L('既有日誌', BAR_X, log_y, BAR_W, log_h, '11/400', '--board-log',
        '—（閱讀）',
        '實機建築內 logbox top=642 height=60。',
        bx=BAR_X + BAR_W - 22, by=log_y)
    s.note('接榜流程現況（game.js questAct）：在委託板或給予者面前，open／hidden → active；送貨先扣押金並放入包裹。沒有確認窗，也沒有風險提示——本圖把提示做在單上。逾期：一般撕榜，送貨另沒收押金並移除包裹。沒有聲望懲罰、受傷或兵刃懲罰欄。')
    s.note('預定色票（上色後才用，本圖灰階）：--quest-target 目標；--quest-due 時限一般；--quest-due-urgent 時限緊急（紅字）；--quest-reward 報酬（預定金）；--risk-low／--risk-mid／--risk-high 風險三檔（高檔紅字）。紅色只用在編號、緊急時限、高險級。')
    s.note('用詞見 wording-map-commission.md。「腳程」已於 16:29 拍板。委託單 250×212 已通過。')
    s.note('以下仍為暫定（interim，待數值／LOC 另決，本圖沿用灰階稿取值）：風險分檔與顏色（低／中／中高是否統一路線三檔）、長期委託失敗罰則、路線危險與地點險級是否統一、地面移除後溢出物去向、「灰髯狼」是否改「灰鬣狼」、區域圖「血霧」地名、腳註是否縮到 22 字內。')
    return s


SCREENS = [
    ('ui02', 'UI-02-01-collapsed', ui02_01),
    ('ui02', 'UI-02-02-expanded', ui02_02),
    ('ui02', 'UI-02-03-danger', ui02_03),
    ('ui02', 'UI-02-04-city-overview', ui02_04),
    ('ui02', 'UI-02-05-map-move', ui02_05),
    ('ui02', 'UI-02-06-commission-sheet', ui02_06),
]
