# 色彩稿共用常數與小元件（已移除舊 v2 灰盒整頁；無舊詞）
from lib import Screen

PAD, GAP = 6, 6
LW, MW, RW = 240, 796, 220
LX, MX, RX = PAD, PAD + LW + GAP, PAD + LW + GAP + MW + GAP   # 6, 252, 1054
Y0, CH = PAD, 720 - PAD * 2                                   # 6, 708
YB = Y0 + CH                                                  # 714
assert RX + RW + PAD == 1280

# ---------- 小元件 ----------

GLYPH_IC = {
    '冠':'h_helm','符':'a_jade','刃':'w_blade','盾':'o_shield','甲':'c_mail',
    '手':'g_iron','戒':'r_copper','帶':'belt','靴':'b_boots','囊':'bag','車':'cart',
    '草':'herb_zx','葉':'leaf_qx','鐵':'ore_cu','藥':'pot_hp','皮':'hide','糧':'ration',
    '鹽':'salt','帽':'h_cap','石':'ore_xs','符':'a_jade',
}
def ico(s, x, y, size, ic, layer=None):
    L = s.layer if layer is None else layer
    s.parts.append(
        f'<i class="px ic-{ic}" data-l="{L}" style="left:{x}px;top:{y}px;width:{size}px;height:{size}px;z-index:{4 + L * 10}"></i>'
    )

def cell(s, x, y, w, h, g, cnt=None, cls='p', gf='f12b', gcls='c', key=None, corner=None, top=None):
    """格：優先放 repo 像素 ICON；沒有對應 id 時退回 1 字代號（示意）"""
    s.box(x, y, w, h, cls)
    gy = y + (h - 16) // 2 - (3 if cnt else 0)
    ic = GLYPH_IC.get(g)
    if ic:
        sz = max(12, min(w, h) - (10 if cnt else 6))
        ico(s, x + (w - sz) // 2, y + (h - sz) // 2 - (2 if cnt else 0), sz, ic)
    elif g:
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



LW_, CH_ = LW, CH
