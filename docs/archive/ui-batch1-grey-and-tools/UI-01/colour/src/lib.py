# 《山海錄》UI-01 上色稿：對齊 main @ de91435231ed 的 style.css 變數與元件處理
# 不修改已拍板灰盒檔。版面座標與灰盒定稿相同。
import html as H

FONT = '"Noto Sans CJK TC","Noto Sans TC","Noto Sans CJK","Noto Sans",sans-serif'
SERIF = '"Noto Serif CJK TC","Noto Serif TC","Noto Serif CJK","Noto Serif",serif'


def e(s):
    return H.escape(str(s), quote=False)


class Screen:
    def __init__(self, sid, title, desc, layer=0, stamp='山海錄 UI-01 上色'):
        self.sid, self.title, self.desc = sid, title, desc
        self.parts = []
        self.leg = []
        self.notes = []
        self.n = 0
        self.layer = 0
        self.extra = ''
        self.stamp = stamp
        self.stamp_box = (258, 698, None)

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
        tc = 'wh' if kind == 'pri' else ('off' if kind == 'off' else ('red' if kind == 'warn' else 'ink'))
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

    def px(self, x, y, size, ic, layer=None):
        """實機像素圖：icons.js / icons_npc.js 產出的 .ic-<id>。"""
        L = self.layer if layer is None else layer
        self.parts.append(
            f'<i class="px ic-{ic}" style="left:{x}px;top:{y}px;width:{size}px;height:{size}px;'
            f'z-index:{4 + L * 10}"></i>'
        )

    def fillbar(self, x, y, w, h, pct, dark=True):
        self.box(x, y, w, h, 'track')
        fw = int(round(w * max(0, min(1, pct))))
        if fw > 0:
            self.box(x, y, fw, h, 'fill-jade' if dark else 'fill-gold')

    def L(self, name, x, y, w, h, font='16/400', token='--ink', hit=None, note='', bx=None, by=None, side=None):
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
        scripts = '''
<script src="../../js/icons.js"></script>
<script src="../../js/icons_more.js"></script>
<script src="../../js/icons_npc.js"></script>
<script src="../../js/scenes.js"></script>
<script src="../../js/scenes_town.js"></script>'''
        return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>{e(self.sid)} {e(self.title)}</title><link rel="stylesheet" href="{rel_css}">{scripts}</head>
<body><div class="page"><div class="stage" id="stage">{''.join(self.parts)}{stamp}</div>
<div class="legend" id="legend"><h1>{e(self.sid)} {e(self.title)}　<span class="tag">上色</span></h1>
<p class="sub">{e(self.desc)}<br>2026-11-28（台北時間 UTC+8）｜UI-01 上色稿｜1280×720 固定三欄單屏｜基準 main @ de91435231ed（style.css 變數、按鈕／面板／石碑處理，加上 icons.js／icons_npc.js／scenes_town.js 像素圖）｜版面與已拍板灰盒定稿相同｜欄位：編號｜功能｜x,y w×h｜字級/字重｜token｜熱區｜備註</p>
<div class="cols">{items}</div><div class="note">{notes}</div>{self.extra}</div></div></body></html>'''


def build_css():
    sans = FONT
    serif = SERIF
    return f'''
:root {{
  --page:#0b0a08;
  --bg:#171512;
  --cell:#1d1a16;
  --cell-2:#26221c;
  --line:#4b4336;
  --line-soft:#332e26;
  --ink:#d8cfbd;
  --ink-2:#a0967f;
  --ink-3:#6e6656;
  --gold:#c9a24a;
  --gold-d:#7d6328;
  --red:#c8463a;
  --red-d:#5a1f1a;
  --jade:#6aa585;
  --r-blue:#5b8fc9;
  --r-rare:#d6b24a;
  --r-legend:#e07a2e;
  --hp:#b5382c;
  --food:#c9a24a;
  --fat:#6b7fa8;
  --hatch:repeating-linear-gradient(135deg,#191714 0 4px,#14120f 4px 6px);
  --serif:{serif};
  --sans:{sans};
  --btn-dark-ink:#fff3d6;
  --danger-ink:#f0b8b0;
  --overlay:#131210;
  --logbox:#100f0c;
  --track:#0f0e0c;
  --empty:#14120f;
  --epitaph-top:#211e19;
}}
*{{box-sizing:border-box}}
html,body{{margin:0;padding:0;background:#f4f0e6;color:#1a1814;font-family:{sans};-webkit-font-smoothing:antialiased}}
.page{{display:flex;gap:16px;padding:20px;width:2136px;align-items:flex-start}}
.stage{{position:relative;width:1280px;height:720px;flex:0 0 1280px;overflow:hidden;background:var(--page);outline:1px solid var(--line)}}
.b{{position:absolute;border:1px solid var(--line);background:var(--cell)}}
.b.z{{background:var(--bg);border-color:var(--line)}}
.b.p{{background:var(--bg);border-color:var(--line)}}
.b.in{{background:var(--bg);border-color:var(--line)}}
.b.sel{{border:2px solid var(--gold);background:var(--cell-2);outline:none}}
.b.dash{{border-style:dashed;border-color:var(--line-soft);background:transparent}}
.b.off{{border-style:dashed;border-color:var(--line-soft);background:transparent;color:var(--ink-2)}}
.b.pri{{background:var(--gold-d);border:1px solid var(--gold)}}
.b.scrim{{background:rgba(11,10,8,.45);border:none}}
.b.tip{{background:var(--logbox);border:1px solid var(--ink-3);box-shadow:0 4px 12px rgba(0,0,0,.7)}}
.b.modal{{background:var(--overlay);border:1px solid var(--gold);box-shadow:0 8px 30px rgba(0,0,0,.8)}}
.b.warn{{border:2px solid var(--red);background:var(--red-d)}}
.b.ic{{background:var(--cell);border:1px solid var(--line)}}
.b.round{{border-radius:50%;background:var(--cell);border-color:var(--line-soft)}}
.b.fill{{background:var(--jade);border-color:var(--jade)}}
.b.fill2{{background:var(--gold);border-color:var(--gold)}}
.b.track{{background:var(--track);border:1px solid var(--line)}}
.b.fill-hp{{background:var(--hp);border:0}}
.b.fill-food{{background:var(--food);border:0}}
.b.fill-fat{{background:var(--fat);border:0}}
.b.fill-jade{{background:var(--jade);border:0}}
.b.fill-gold{{background:var(--gold);border:0}}
.b.art{{background:var(--hatch);border:1px solid var(--line)}}
.b.doll{{border:none;background:radial-gradient(ellipse at 50% 45%,#211d18 0,var(--bg) 70%)}}
.b.plan{{border:none;border-bottom:1px solid var(--line-soft);background-color:var(--hatch);background-size:100% 100%;image-rendering:pixelated}}
.hr{{position:absolute;height:1px;background:var(--line-soft)}}
.vr{{position:absolute;width:1px;background:var(--line-soft)}}
.ln{{position:absolute;background:var(--line-soft);transform-origin:0 50%;pointer-events:none}}
.tx{{position:absolute;white-space:nowrap;overflow:hidden;color:var(--ink);z-index:3}}
.tx.ml{{white-space:normal}}
.tx.c{{text-align:center}}.tx.r{{text-align:right}}
.dim{{color:var(--ink-2)}}.off{{color:var(--ink-2)}}.red{{color:var(--danger-ink)}}.wh{{color:var(--btn-dark-ink)}}
.ink{{color:var(--ink)}}.gold{{color:var(--gold)}}.jade{{color:var(--jade)}}
.term{{text-decoration:underline dotted var(--ink-2);text-underline-offset:3px}}
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
.sf16{{font:400 16px/22px {serif}}}.sf16b{{font:700 16px/22px {serif}}}
.sf20b{{font:700 20px/26px {serif}}}
.sf24b{{font:700 24px/32px {serif}}}
.sf28b{{font:700 28px/36px {serif}}}
.sf32b{{font:700 32px/42px {serif}}}
.tx.sf32b.gold,.tx.sf28b,.tx.sf24b.gold{{text-shadow:0 2px 0 #000}}
.bd{{position:absolute;z-index:60;min-width:18px;height:13px;padding:0 2px;background:#fff;border:1px solid #be1414;color:#be1414;font:700 9px/11px "Noto Sans Mono CJK TC",{sans};text-align:center}}
.stamp{{position:absolute;z-index:70;border:1px solid var(--gold-d);background:var(--cell);color:var(--ink-2);padding:0 6px;font:700 11px/16px {sans}}}
.legend{{width:780px;flex:0 0 780px;font:400 11px/15px {sans};color:#1a1814}}
.legend h1{{font:700 16px/22px {sans};margin:0 0 2px;color:#1a1814}}
.legend .tag{{border:1px solid #7d6328;background:#c9a24a;color:#171512;padding:0 5px;font-size:11px;font-weight:700}}
.legend .sub{{color:#3a352c;margin:0 0 6px}}
.legend .cols{{column-count:2;column-gap:14px}}
.legend .it{{break-inside:avoid;margin:0 0 5px;padding-left:28px;position:relative}}
.legend .it b.n{{position:absolute;left:0;top:1px;border:1px solid #be1414;color:#be1414;background:#fff;font:700 9px/11px "Noto Sans Mono CJK TC",{sans};padding:0 2px;min-width:20px;text-align:center}}
.legend .it .nm{{font-weight:700}}
.legend .it .g{{color:#4a453a}}
.legend .note{{border-top:1px solid #b7b09f;margin-top:6px;padding-top:4px;color:#2a261e}}
.legend .note p{{margin:0 0 3px}}
.b.dot{{background:#be1414;border:1px solid #be1414;border-radius:50%}}
.b.glow{{border:2px solid var(--gold);background:transparent;box-shadow:0 0 10px rgba(201,162,74,.45)}}
.b.cap{{background:var(--cell);border:1px solid var(--line);border-radius:12px}}
.b.ell{{border:1px dashed var(--line-soft);background:transparent;border-radius:50%}}
.b.tick{{background:var(--ink);border:none}}
.b.chip{{background:var(--logbox);border:1px solid var(--line);border-radius:0}}
.b.rd{{background:var(--red-d);border:1px solid var(--red)}}
.b.rfill{{background:var(--red);border-color:var(--red)}}
.b.lock{{border:1px dashed var(--line-soft);background:var(--hatch)}}
.b.dk{{background:var(--page);border-color:var(--line)}}
.b.ghost{{background:var(--empty);border:1px solid var(--line-soft)}}
.b.double{{background:linear-gradient(var(--epitaph-top),var(--bg));border:3px double var(--ink-3)}}
.b.record{{background:var(--logbox);border:1px solid var(--ink-3)}}
.b.sdlg{{background:rgba(19,18,16,.97);border:1px solid var(--gold);box-shadow:0 6px 20px rgba(0,0,0,.7)}}
.b.logbox{{background:var(--logbox);border:1px solid var(--line-soft)}}
.b.tabon{{background:var(--cell-2);border:1px solid var(--gold)}}
.legend .extra{{margin-top:8px;border-top:1px solid #b7b09f;padding-top:6px}}
.px{{position:absolute;display:block;flex:none;background-size:100% 100%;background-repeat:no-repeat;image-rendering:pixelated;pointer-events:none}}
'''


CSS = build_css()
