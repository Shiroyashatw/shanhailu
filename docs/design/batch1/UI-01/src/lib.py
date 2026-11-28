# 《山海錄》灰盒線框草稿：白底、灰框、黑字；紅只用於編號與危險警示
import html as H
FONT = '"Noto Sans CJK TC","Noto Sans CJK","Noto Sans",sans-serif'
SERIF = '"Noto Serif CJK TC","Noto Serif CJK","Noto Serif",serif'
CSS = r'''
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000;font-family:%s;-webkit-font-smoothing:antialiased}
.page{display:flex;gap:16px;padding:20px;width:2136px;align-items:flex-start}
.stage{position:relative;width:1280px;height:720px;flex:0 0 1280px;overflow:hidden;background:#fff;outline:1px solid #000}
.b{position:absolute;border:1px solid #8a8a8a;background:#f7f7f7}
.b.z{background:#fafafa}.b.p{background:#fff;border-color:#555}.b.in{background:#eeeeee}
.b.sel{border:2px solid #000;background:#e8e8e8}.b.dash{border-style:dashed;background:#fff}
.b.off{border-style:dashed;background:#fbfbfb}.b.pri{background:#2b2b2b;border-color:#000}
.b.scrim{background:rgba(0,0,0,.08);border:none}.b.tip{background:#fff;border:1px solid #000;box-shadow:2px 2px 0 #bbb}
.b.modal{background:#fff;border:2px solid #000}.b.warn{border:2px solid #be1414;background:#fff}
.b.ic{background:#e4e4e4;border:1px solid #9a9a9a}
.b.ic::after{content:"";position:absolute;inset:0;background:linear-gradient(to top right,transparent 49%%,#b5b5b5 50%%,transparent 51%%)}
.b.round{border-radius:50%%}
.b.fill{background:#444;border-color:#444}
.b.fill2{background:#888;border-color:#888}
.b.art{background:repeating-linear-gradient(135deg,#f4f4f4 0 6px,#ececec 6px 12px);border:1px solid #b0b0b0}
.hr{position:absolute;height:1px;background:#9a9a9a}
.vr{position:absolute;width:1px;background:#9a9a9a}
.ln{position:absolute;background:#9a9a9a;transform-origin:0 50%%;pointer-events:none}
.tx{position:absolute;white-space:nowrap;overflow:hidden;color:#000;z-index:3}
.tx.ml{white-space:normal}
.tx.c{text-align:center}.tx.r{text-align:right}
.dim{color:#555}.off{color:#8a8a8a}.red{color:#be1414}.wh{color:#fff}
.term{text-decoration:underline dotted #000;text-underline-offset:3px}
.f9{font:400 9px/12px %s}.f9b{font:700 9px/12px %s}
.f10{font:400 10px/14px %s}.f10b{font:700 10px/14px %s}
.f11{font:400 11px/15px %s}.f11b{font:700 11px/15px %s}
.f12{font:400 12px/16px %s}.f12b{font:700 12px/16px %s}
.f13{font:400 13px/18px %s}
.f14{font:400 14px/20px %s}.f14b{font:700 14px/20px %s}
.f16{font:400 16px/22px %s}.f16b{font:700 16px/22px %s}
.f18{font:400 18px/24px %s}.f18b{font:700 18px/24px %s}
.f20b{font:700 20px/26px %s}
.f22b{font:700 22px/28px %s}
.f24b{font:700 24px/32px %s}
.f28b{font:700 28px/36px %s}
.f32b{font:700 32px/40px %s}
.sf16{font:400 16px/22px %s}
.sf16b{font:700 16px/22px %s}
.sf20b{font:700 20px/26px %s}
.sf24b{font:700 24px/32px %s}
.sf28b{font:700 28px/36px %s}
.sf32b{font:700 32px/42px %s}
.bd{position:absolute;z-index:60;min-width:18px;height:13px;padding:0 2px;background:#fff;border:1px solid #be1414;color:#be1414;font:700 9px/11px "Noto Sans Mono CJK TC",%s;text-align:center}
.stamp{position:absolute;z-index:70;border:1px solid #000;background:#fff;padding:0 6px;font:700 11px/16px %s}
.legend{width:780px;flex:0 0 780px;font:400 11px/15px %s;color:#000}
.legend h1{font:700 16px/22px %s;margin:0 0 2px}
.legend .sub{color:#333;margin:0 0 6px}
.legend .cols{column-count:2;column-gap:14px}
.legend .it{break-inside:avoid;margin:0 0 5px;padding-left:28px;position:relative}
.legend .it b.n{position:absolute;left:0;top:1px;border:1px solid #be1414;color:#be1414;font:700 9px/11px "Noto Sans Mono CJK TC",%s;padding:0 2px;min-width:20px;text-align:center}
.legend .it .nm{font-weight:700}
.legend .it .g{color:#333}
.legend .note{border-top:1px solid #999;margin-top:6px;padding-top:4px;color:#222}
.legend .note p{margin:0 0 3px}
.b.dot{background:#be1414;border:1px solid #be1414;border-radius:50%%}
.b.glow{border:2px solid #000;background:transparent;box-shadow:0 0 0 4px #d6d6d6}
.b.cap{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:2px 2px 0 #bbb}
.b.ell{border:1px dashed #9a9a9a;background:transparent;border-radius:50%%}
.b.tick{background:#000;border:none}
.b.chip{background:#fff;border:1px solid #777;border-radius:2px}
.b.rd{background:#fff;border:1px solid #be1414}
.b.rfill{background:#be1414;border-color:#be1414}
.b.lock{border:1px dashed #9a9a9a;background:repeating-linear-gradient(135deg,#fff 0 4px,#f0f0f0 4px 8px)}
.b.dk{background:#000;border-color:#000}
.b.ghost{background:transparent;border:1px dashed #9a9a9a}
.b.double{background:#fff;border:3px double #000}
.b.record{background:#f7f7f7;border:1px solid #000}
.legend .extra{margin-top:8px;border-top:1px solid #999;padding-top:6px}
'''.replace('%s', FONT, 1)
# fill remaining %s: most FONT, serif classes need SERIF
# The first replace only got the font-family in html,body because replace('%s', FONT, 1)
# Better to format explicitly.

def _css():
    sans = FONT
    serif = SERIF
    # We already called replace once in the string above — rebuild cleanly instead.
    return None

# Rebuild CSS properly below (the module-level CSS will be overwritten).
CSS = None


def e(s):
    return H.escape(str(s), quote=False)


class Screen:
    def __init__(self, sid, title, desc, layer=0, stamp='山海錄 UI-01 灰盒'):
        self.sid, self.title, self.desc = sid, title, desc
        self.parts = []
        self.leg = []
        self.notes = []
        self.n = 0
        self.layer = 0
        self.extra = ''
        self.stamp = stamp
        self.stamp_box = (258, 698, None)  # x, y, or None to hide; width auto

    def box(self, x, y, w, h, cls='', layer=None, extra=''):
        L = self.layer if layer is None else layer
        z = f'z-index:{2 + L * 10}'
        self.parts.append(
            f'<div class="b {cls}" data-l="{L}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{z};{extra}"></div>'
        )

    def hr(self, x, y, w):
        self.parts.append(
            f'<div class="hr" style="left:{x}px;top:{y}px;width:{w}px;z-index:{2 + self.layer * 10}"></div>'
        )

    def vr(self, x, y, h):
        self.parts.append(
            f'<div class="vr" style="left:{x}px;top:{y}px;height:{h}px;z-index:{2 + self.layer * 10}"></div>'
        )

    def t(self, x, y, w, s, f='f12', cls='', h=None, raw=False, layer=None, extra=''):
        L = self.layer if layer is None else layer
        hh = f'height:{h}px;' if h else ''
        body = s if raw else e(s)
        self.parts.append(
            f'<div class="tx {f} {cls}" data-l="{L}" style="left:{x}px;top:{y}px;width:{w}px;{hh}z-index:{3 + L * 10};{extra}">{body}</div>'
        )

    def btn(self, x, y, w, h, s, kind='', f='f16b', sub=None, raw=False):
        cls = {'': '', 'sel': 'sel', 'off': 'off', 'pri': 'pri', 'dash': 'dash', 'warn': 'warn'}[kind]
        self.box(x, y, w, h, cls)
        tc = 'wh' if kind == 'pri' else ('off' if kind == 'off' else ('red' if kind == 'warn' else ''))
        lh_map = {
            'f9': 12, 'f9b': 12, 'f10': 14, 'f10b': 14, 'f11': 15, 'f11b': 15,
            'f12': 16, 'f12b': 16, 'f13': 18, 'f14': 20, 'f14b': 20,
            'f16': 22, 'f16b': 22, 'f18': 24, 'f18b': 24, 'f20b': 26, 'f22b': 28,
        }
        lh = lh_map.get(f, 22)
        if sub is None:
            self.t(x + 4, y + (h - lh) // 2, w - 8, s, f, 'c ' + tc, raw=raw)
        else:
            self.t(x + 4, y + (h - lh - 22) // 2, w - 8, s, f, 'c ' + tc, raw=raw)
            self.t(x + 4, y + (h - lh - 22) // 2 + lh, w - 8, sub, 'f16', 'c ' + (
                'wh' if kind == 'pri' else 'dim' if kind != 'off' else 'off'))

    def icon(self, x, y, w, h):
        self.box(x, y, w, h, 'ic')

    def fillbar(self, x, y, w, h, pct, dark=True):
        self.box(x, y, w, h, 'p')
        fw = int(round(w * max(0, min(1, pct))))
        if fw > 0:
            self.box(x, y, fw, h, 'fill' if dark else 'fill2')

    def L(self, name, x, y, w, h, font='16/400', token='--tx', hit=None, note='', bx=None, by=None, side=None):
        self.n += 1
        n = self.n
        if side is None:
            side = h <= 24
        bxp = (x - 22 if side else x + 2) if bx is None else bx
        byp = (y + 1 if side else y - 8) if by is None else by
        if bxp < 1:
            bxp = x + 2
            if byp < y:
                byp = y + 2
        if byp < 1:
            byp = y + 2
        if bxp + 22 > 1280:
            bxp = x + w - 22
        if byp + 13 > 720:
            byp = y - 8 if y >= 10 else y + 2
        self.parts.append(f'<span class="bd" data-n="{n}" style="left:{bxp}px;top:{byp}px">{n}</span>')
        hit = hit or (f'同框 {w}×{h}' if h >= 24 else '—（不可點）')
        self.leg.append((n, name, f'{x},{y}　{w}×{h}', font, token, hit, note))
        return n

    def note(self, s):
        self.notes.append(s)

    def html(self, rel_css='../common.css'):
        items = ''.join(
            f'<div class="it"><b class="n">{n}</b><span class="nm">{e(nm)}</span>｜{e(pos)}｜{e(fo)}｜<span class="g">{e(tk)}</span>｜熱區 {e(hit)}'
            + (f'｜{e(nt)}' if nt else '') + '</div>'
            for (n, nm, pos, fo, tk, hit, nt) in self.leg)
        notes = ''.join(f'<p>{e(s)}</p>' for s in self.notes)
        if self.stamp and self.stamp_box:
            sx, sy, _ = self.stamp_box
            stamp = f'<div class="stamp" style="left:{sx}px;top:{sy}px;right:auto;bottom:auto">{e(self.stamp)}・{e(self.sid)}</div>'
        else:
            stamp = ''
        return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>{e(self.sid)} {e(self.title)}</title><link rel="stylesheet" href="{rel_css}"></head>
<body><div class="page"><div class="stage" id="stage">{''.join(self.parts)}{stamp}</div>
<div class="legend" id="legend"><h1>{e(self.sid)} {e(self.title)}　<span style="border:1px solid #000;padding:0 4px;font-size:11px">草稿</span></h1>
<p class="sub">{e(self.desc)}<br>2026-11-28（台北時間 UTC+8）｜UI-01｜1280×720 固定三欄單屏｜基準 v0.3 實機＋living-world v0.2 §6＋藍圖 v0.3 §12.9｜白底灰框黑字，紅＝編號與危險警示｜欄位：編號｜功能｜x,y w×h｜字級/字重｜token｜熱區｜備註</p>
<div class="cols">{items}</div><div class="note">{notes}</div>{self.extra}</div></div></body></html>'''


def build_css():
    sans = FONT
    serif = SERIF
    return f'''
*{{box-sizing:border-box}}
html,body{{margin:0;padding:0;background:#fff;color:#000;font-family:{sans};-webkit-font-smoothing:antialiased}}
.page{{display:flex;gap:16px;padding:20px;width:2136px;align-items:flex-start}}
.stage{{position:relative;width:1280px;height:720px;flex:0 0 1280px;overflow:hidden;background:#fff;outline:1px solid #000}}
.b{{position:absolute;border:1px solid #8a8a8a;background:#f7f7f7}}
.b.z{{background:#fafafa}}.b.p{{background:#fff;border-color:#555}}.b.in{{background:#eeeeee}}
.b.sel{{border:2px solid #000;background:#e8e8e8}}.b.dash{{border-style:dashed;background:#fff}}
.b.off{{border-style:dashed;background:#fbfbfb}}.b.pri{{background:#2b2b2b;border-color:#000}}
.b.scrim{{background:rgba(0,0,0,.08);border:none}}.b.tip{{background:#fff;border:1px solid #000;box-shadow:2px 2px 0 #bbb}}
.b.modal{{background:#fff;border:2px solid #000}}.b.warn{{border:2px solid #be1414;background:#fff}}
.b.ic{{background:#e4e4e4;border:1px solid #9a9a9a}}
.b.ic::after{{content:"";position:absolute;inset:0;background:linear-gradient(to top right,transparent 49%,#b5b5b5 50%,transparent 51%)}}
.b.round{{border-radius:50%}}
.b.fill{{background:#444;border-color:#444}}
.b.fill2{{background:#888;border-color:#888}}
.b.art{{background:repeating-linear-gradient(135deg,#f4f4f4 0 6px,#ececec 6px 12px);border:1px solid #b0b0b0}}
.hr{{position:absolute;height:1px;background:#9a9a9a}}
.vr{{position:absolute;width:1px;background:#9a9a9a}}
.ln{{position:absolute;background:#9a9a9a;transform-origin:0 50%;pointer-events:none}}
.tx{{position:absolute;white-space:nowrap;overflow:hidden;color:#000;z-index:3}}
.tx.ml{{white-space:normal}}
.tx.c{{text-align:center}}.tx.r{{text-align:right}}
.dim{{color:#555}}.off{{color:#8a8a8a}}.red{{color:#be1414}}.wh{{color:#fff}}
.term{{text-decoration:underline dotted #000;text-underline-offset:3px}}
.f9{{font:400 9px/12px {sans}}}.f9b{{font:700 9px/12px {sans}}}
.f10{{font:400 10px/14px {sans}}}.f10b{{font:700 10px/14px {sans}}}
.f11{{font:400 11px/15px {sans}}}.f11b{{font:700 11px/15px {sans}}}
.f12{{font:400 12px/16px {sans}}}.f12b{{font:700 12px/16px {sans}}}
.f13{{font:400 13px/18px {sans}}}
.f14{{font:400 14px/20px {sans}}}.f14b{{font:700 14px/20px {sans}}}
.f16{{font:400 16px/22px {sans}}}.f16b{{font:700 16px/22px {sans}}}
.f18{{font:400 18px/24px {sans}}}.f18b{{font:700 18px/24px {sans}}}
.f20b{{font:700 20px/26px {sans}}}
.f22b{{font:700 22px/28px {sans}}}
.f24b{{font:700 24px/32px {sans}}}
.f28b{{font:700 28px/36px {sans}}}
.f32b{{font:700 32px/40px {sans}}}
.sf16{{font:400 16px/22px {serif}}}
.sf16b{{font:700 16px/22px {serif}}}
.sf20b{{font:700 20px/26px {serif}}}
.sf24b{{font:700 24px/32px {serif}}}
.sf28b{{font:700 28px/36px {serif}}}
.sf32b{{font:700 32px/42px {serif}}}
.bd{{position:absolute;z-index:60;min-width:18px;height:13px;padding:0 2px;background:#fff;border:1px solid #be1414;color:#be1414;font:700 9px/11px "Noto Sans Mono CJK TC",{sans};text-align:center}}
.stamp{{position:absolute;z-index:70;border:1px solid #000;background:#fff;padding:0 6px;font:700 11px/16px {sans}}}
.legend{{width:780px;flex:0 0 780px;font:400 11px/15px {sans};color:#000}}
.legend h1{{font:700 16px/22px {sans};margin:0 0 2px}}
.legend .sub{{color:#333;margin:0 0 6px}}
.legend .cols{{column-count:2;column-gap:14px}}
.legend .it{{break-inside:avoid;margin:0 0 5px;padding-left:28px;position:relative}}
.legend .it b.n{{position:absolute;left:0;top:1px;border:1px solid #be1414;color:#be1414;font:700 9px/11px "Noto Sans Mono CJK TC",{sans};padding:0 2px;min-width:20px;text-align:center}}
.legend .it .nm{{font-weight:700}}
.legend .it .g{{color:#333}}
.legend .note{{border-top:1px solid #999;margin-top:6px;padding-top:4px;color:#222}}
.legend .note p{{margin:0 0 3px}}
.b.dot{{background:#be1414;border:1px solid #be1414;border-radius:50%}}
.b.glow{{border:2px solid #000;background:transparent;box-shadow:0 0 0 4px #d6d6d6}}
.b.cap{{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:2px 2px 0 #bbb}}
.b.ell{{border:1px dashed #9a9a9a;background:transparent;border-radius:50%}}
.b.tick{{background:#000;border:none}}
.b.chip{{background:#fff;border:1px solid #777;border-radius:2px}}
.b.rd{{background:#fff;border:1px solid #be1414}}
.b.rfill{{background:#be1414;border-color:#be1414}}
.b.lock{{border:1px dashed #9a9a9a;background:repeating-linear-gradient(135deg,#fff 0 4px,#f0f0f0 4px 8px)}}
.b.dk{{background:#000;border-color:#000}}
.b.ghost{{background:transparent;border:1px dashed #9a9a9a}}
.b.double{{background:#fff;border:3px double #000}}
.b.record{{background:#f7f7f7;border:1px solid #000}}
.legend .extra{{margin-top:8px;border-top:1px solid #999;padding-top:6px}}
'''


CSS = build_css()
