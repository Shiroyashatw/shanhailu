# UI-FX 草稿共用：舞台＋圖板（關鍵幀／時間軸）＋7 欄 legend
from lib import Screen, CSS as BASE_CSS, FONT, e

EXTRA_CSS = r'''
.page{width:2136px;align-items:flex-start}
.wrap{width:1280px;flex:0 0 1280px}
.cont{position:relative;width:1280px;overflow:hidden;background:#fff;outline:1px solid #000}
#board{margin-top:12px;outline:1px solid #555}
.b.tint{border:none;background:rgba(0,0,0,.18)}
.b.fS{background:#fff;border:1px dashed #8a8a8a}
.b.fK{background:#fff;border:1px solid #000}
.b.fM{background:#fff;border:2px solid #000;box-shadow:2px 2px 0 #bbb}
.b.bar{background:#d4d4d4;border:1px solid #555}
.b.bar2{background:#9c9c9c;border:1px solid #444}
.b.trk{background:#f3f3f3;border:1px solid #d0d0d0}
.b.kf{background:#fff;border:1px solid #777}
.b.kfh{background:#e6e6e6;border:1px solid #777}
.b.dia{background:#000;border:none;transform:rotate(45deg)}
.b.sh{background:#e0e0e0;border:1px solid #888}
.b.ph0{background:#d9d9d9;border:1px solid #777}.b.ph1{background:#fff;border:1px solid #777}
.b.ph2{background:#a8a8a8;border:1px solid #777}.b.ph3{background:#3a3a3a;border:1px solid #000}
.b.mk{background:#000;border:1px solid #fff}
.b.redge{border:3px solid #be1414;background:transparent}
.legend{width:780px;flex:0 0 780px;font:400 10px/13px %s}
.legend table{border-collapse:collapse;width:100%%;table-layout:fixed;margin-top:4px}
.legend th{font:700 10px/13px %s;text-align:left;border-bottom:1px solid #000;padding:2px 3px;background:#f0f0f0}
.legend td{vertical-align:top;border-bottom:1px solid #cfcfcf;padding:2px 3px;word-break:break-all}
.legend td.n b{border:1px solid #be1414;color:#be1414;font:700 9px/11px "Noto Sans Mono CJK TC",%s;padding:0 2px;display:inline-block;min-width:18px;text-align:center}
.legend td.nm{font-weight:700}
.legend .sub{margin:0 0 4px;color:#333;font:400 11px/15px %s}
.legend .note p{margin:0 0 3px;font:400 10px/14px %s}
.legend h1{font:700 16px/22px %s;margin:0 0 2px}
.legend .tiers{display:flex;gap:8px;margin:6px 0}
.legend .tiers div{padding:2px 6px;background:#fff}
'''.replace('%%', '%').replace('%s', FONT)

class BoardScreen(Screen):
    def L(self, *a, **k):
        n = super().L(*a, **k)
        t = list(self.leg[-1]); t[2] = '圖板 ' + t[2]; self.leg[-1] = tuple(t)
        return n

class FX(Screen):
    def __init__(self, sid, title, desc):
        super().__init__(sid, title, desc)
        self.board = None; self.bh = 0
    def make_board(self, h):
        b = BoardScreen(self.sid, '', '')
        b.n = self.n; b.leg = self.leg; self.board = b; self.bh = h
        return b
    def html(self, rel_css='../common.css'):
        rows = ''.join(
            f'<tr><td class="n"><b>{n}</b></td><td class="nm">{e(nm)}</td><td>{e(pos)}</td><td>{e(fo)}</td><td>{e(tk)}</td><td>{e(hit)}</td><td>{e(nt)}</td></tr>'
            for (n, nm, pos, fo, tk, hit, nt) in self.leg)
        notes = ''.join(f'<p>{e(s)}</p>' for s in self.notes)
        bparts = ''.join(self.board.parts) if self.board else ''
        board = f'<div class="cont" id="board" style="height:{self.bh}px">{bparts}</div>' if self.board else ''
        return f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>{e(self.sid)} {e(self.title)}</title><link rel="stylesheet" href="{rel_css}"></head>
<body><div class="page"><div class="wrap"><div class="cont stage" id="stage" style="height:720px;flex:none">{''.join(self.parts)}<div class="stamp">山海錄 UI-FX 草稿・{e(self.sid)}</div></div>{board}</div>
<div class="legend" id="legend"><h1>{e(self.sid)} {e(self.title)}　<span style="border:1px solid #000;padding:0 4px;font-size:11px">草稿</span></h1>
<p class="sub">{e(self.desc)}</p>
<table><colgroup><col style="width:30px"><col style="width:92px"><col style="width:96px"><col style="width:74px"><col style="width:96px"><col style="width:84px"><col></colgroup>
<thead><tr><th>編號</th><th>功能名</th><th>座標／尺寸</th><th>字體字級</th><th>token</th><th>點擊區</th><th>說明</th></tr></thead><tbody>{rows}</tbody></table>
<div class="note">{notes}</div></div></div></body></html>'''
