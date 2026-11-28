# 《山海錄》灰盒線框草稿：白底、灰框、黑字；紅只用於編號與危險警示
import html as H
FONT = '"Noto Sans CJK TC","Noto Sans CJK","Noto Sans",sans-serif'
CSS = r'''
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000;font-family:%s;-webkit-font-smoothing:antialiased}
.page{display:flex;gap:16px;padding:20px;width:2136px;align-items:flex-start}
.stage{position:relative;width:1280px;height:720px;flex:0 0 1280px;overflow:hidden;background:#fff;outline:1px solid #000}
.b{position:absolute;border:1px solid #8a8a8a;background:#f7f7f7}
.b.z{background:#fafafa}.b.p{background:#fff;border-color:#555}.b.in{background:#eeeeee}
.b.sel{border:2px solid #000;background:#e8e8e8}.b.dash{border-style:dashed;background:#fff}
.b.off{border-style:dashed;background:#fbfbfb}.b.pri{background:#2b2b2b;border-color:#000}
.b.scrim{background:rgba(0,0,0,.35);border:none}.b.tip{background:#fff;border:1px solid #000;box-shadow:2px 2px 0 #bbb}
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
.f10{font:400 10px/14px %s}.f10b{font:700 10px/14px %s}
.f11{font:400 11px/15px %s}.f11b{font:700 11px/15px %s}
.f12{font:400 12px/16px %s}.f12b{font:700 12px/16px %s}.f13{font:400 13px/18px %s}
.f14{font:400 14px/20px %s}.f14b{font:700 14px/20px %s}.f16b{font:700 16px/22px %s}.f18b{font:700 18px/24px %s}
.bd{position:absolute;z-index:60;min-width:18px;height:13px;padding:0 2px;background:#fff;border:1px solid #be1414;color:#be1414;font:700 9px/11px "Noto Sans Mono CJK TC",%s;text-align:center}
.stamp{position:absolute;right:240px;bottom:10px;z-index:70;border:1px solid #000;background:#fff;padding:0 6px;font:700 11px/16px %s}
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
.b.terr{border:1px dashed #c4c4c4;background:repeating-linear-gradient(45deg,#ededed 0 2px,transparent 2px 8px);border-radius:46%%}
.b.mtn{border:none;background:transparent;width:0;height:0}
.b.map{background:#fbfbfb;border:1px solid #8a8a8a}
.b.ghost{background:transparent;border:1px dashed #9a9a9a}
.b.enemy{border:2px dashed #555;background:repeating-linear-gradient(135deg,#e9e9e9 0 5px,#dedede 5px 10px);border-radius:40%% 40%% 8px 8px}
.b.chip{background:#fff;border:1px solid #777;border-radius:2px}
.b.rd{background:#fff;border:1px solid #be1414}
.b.rfill{background:#be1414;border-color:#be1414}
.b.lock{border:1px dashed #9a9a9a;background:repeating-linear-gradient(135deg,#fff 0 4px,#f0f0f0 4px 8px)}
.b.dk{background:#000;border-color:#000}
.ln.road{height:3px!important;background:#222}
.ln.trail{height:0!important;background:transparent;border-top:2px dashed #555}
.ln.selr{height:5px!important;background:#000}
.ln.river{height:6px!important;background:#e2e2e2}
.f9{font:400 9px/12px %s}.f9b{font:700 9px/12px %s}
.f20b{font:700 20px/26px %s}
.big{font:700 28px/34px %s;color:#d2d2d2;letter-spacing:6px}
.legend .extra{margin-top:8px;border-top:1px solid #999;padding-top:6px}
'''.replace('%s', FONT).replace('%%', '%')

def e(s):
    return H.escape(str(s), quote=False)

class Screen:
    def __init__(self, sid, title, desc, layer=0):
        self.sid, self.title, self.desc = sid, title, desc
        self.parts = []
        self.leg = []
        self.notes = []
        self.n = 0
        self.layer = 0
        self.extra = ''

    def box(self, x, y, w, h, cls='', layer=None, extra=''):
        L = self.layer if layer is None else layer
        z = f'z-index:{2 + L * 10}'
        self.parts.append(f'<div class="b {cls}" data-l="{L}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{z};{extra}"></div>')

    def hr(self, x, y, w):
        self.parts.append(f'<div class="hr" style="left:{x}px;top:{y}px;width:{w}px;z-index:{2 + self.layer * 10}"></div>')

    def vr(self, x, y, h):
        self.parts.append(f'<div class="vr" style="left:{x}px;top:{y}px;height:{h}px;z-index:{2 + self.layer * 10}"></div>')

    def line(self, x1, y1, x2, y2, layer=None, kind=''):
        L = self.layer if layer is None else layer
        import math
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        ang = math.degrees(math.atan2(dy, dx))
        self.parts.append(
            f'<div class="ln {kind}" data-l="{L}" style="left:{x1}px;top:{y1 - 0.5}px;width:{length:.1f}px;height:1px;'
            f'transform:rotate({ang:.2f}deg);z-index:{2 + L * 10}"></div>'
        )

    def t(self, x, y, w, s, f='f12', cls='', h=None, raw=False, layer=None):
        L = self.layer if layer is None else layer
        hh = f'height:{h}px;' if h else ''
        body = s if raw else e(s)
        self.parts.append(f'<div class="tx {f} {cls}" data-l="{L}" style="left:{x}px;top:{y}px;width:{w}px;{hh}z-index:{3 + L * 10}">{body}</div>')

    def btn(self, x, y, w, h, s, kind='', f='f12', sub=None, raw=False):
        cls = {'': '', 'sel': 'sel', 'off': 'off', 'pri': 'pri', 'dash': 'dash', 'warn': 'warn'}[kind]
        self.box(x, y, w, h, cls)
        tc = 'wh' if kind == 'pri' else ('off' if kind == 'off' else ('red' if kind == 'warn' else ''))
        if f in ('f12b', 'f12'):
            lh = 16
        elif f.startswith('f14') or f == 'f13':
            lh = 20
        elif f.startswith('f16'):
            lh = 22
        elif f in ('f11b', 'f11'):
            lh = 15
        else:
            lh = 15
        if sub is None:
            self.t(x + 4, y + (h - lh) // 2, w - 8, s, f, 'c ' + tc, raw=raw)
        else:
            self.t(x + 4, y + (h - lh - 15) // 2, w - 8, s, f, 'c ' + tc, raw=raw)
            self.t(x + 4, y + (h - lh - 15) // 2 + lh, w - 8, sub, 'f11', 'c ' + ('wh' if kind == 'pri' else 'dim' if kind != 'off' else 'off'))

    def icon(self, x, y, w, h):
        self.box(x, y, w, h, 'ic')

    def fillbar(self, x, y, w, h, pct, dark=True):
        self.box(x, y, w, h, 'p')
        fw = int(round(w * max(0, min(1, pct))))
        if fw > 0:
            self.box(x, y, fw, h, 'fill' if dark else 'fill2')

    def L(self, name, x, y, w, h, font='12/400', token='--tx', hit=None, note='', bx=None, by=None, side=None):
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
        return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>{e(self.sid)} {e(self.title)}</title><link rel="stylesheet" href="{rel_css}"></head>
<body><div class="page"><div class="stage" id="stage">{''.join(self.parts)}<div class="stamp">山海錄 v2 灰盒・{e(self.sid)}</div></div>
<div class="legend" id="legend"><h1>{e(self.sid)} {e(self.title)}　<span style="border:1px solid #000;padding:0 4px;font-size:11px">草稿</span></h1>
<p class="sub">{e(self.desc)}<br>2026-11-27（台北時間 UTC+8）｜v2｜1280×720 固定三欄單屏｜《山海錄》GDD v0.2｜白底灰框黑字，紅＝編號與危險警示｜欄位：編號｜功能｜x,y w×h｜字級/字重｜token｜熱區｜備註</p>
<div class="cols">{items}</div><div class="note">{notes}</div>{self.extra}</div></div></body></html>'''
