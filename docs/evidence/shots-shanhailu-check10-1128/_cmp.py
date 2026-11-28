import sys
from PIL import Image, ImageDraw, ImageFont
D = '/home/user/shanhailu/docs/design/batch1/UI-01/'
O = '/home/user/shanhailu/docs/evidence/shots-shanhailu-check10-1128/'
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
except Exception:
    F = ImageFont.load_default()

def side(draft, shot, out, ltxt, rtxt):
    a = Image.open(D + draft).convert('RGB').resize((1280, 720), Image.LANCZOS)
    b = Image.open(O + shot).convert('RGB')
    c = Image.new('RGB', (2580, 760), 'white')
    c.paste(a, (0, 40)); c.paste(b, (1300, 40))
    d = ImageDraw.Draw(c)
    d.text((10, 8), ltxt, fill='black', font=F); d.text((1310, 8), rtxt, fill='black', font=F)
    c.save(O + out)

def zoom(draft, shots, out):
    box = (1054, 6, 1274, 110)
    a = Image.open(D + draft).convert('RGB').resize((1280, 720), Image.LANCZOS).crop(box)
    tiles = [('UI-01 ' + draft.split('-stage')[0], a)] + [(s, Image.open(O + s).convert('RGB').crop(box)) for s in shots]
    w, h = 220 * 3, 104 * 3
    c = Image.new('RGB', (w * len(tiles) + 20 * (len(tiles) - 1), h + 40), 'white')
    d = ImageDraw.Draw(c)
    for i, (t, im) in enumerate(tiles):
        x = i * (w + 20)
        c.paste(im.resize((w, h), Image.NEAREST), (x, 40)); d.text((x + 4, 8), t, fill='black', font=F)
    c.save(O + out)

side('SHL-UI01-01-naming-stage1280.png', '01-naming-preview-twoline.png', 'cmp-01-naming.png', 'UI-01 草稿 SHL-UI01-01-naming-stage1280（縮至 1280×720）', '實機 792ec24：01-naming-preview-twoline（端木青）')
side('SHL-UI01-02-appearances-stage1280.png', '02-wake-right-twoline.png', 'cmp-02-wake-right.png', 'UI-01 草稿 SHL-UI01-02-appearances-stage1280', '實機 792ec24：02-wake-right-twoline（端木青）')
side('SHL-UI01-02-appearances-stage1280.png', '04-storyteller-duanmu.png', 'cmp-04-storyteller.png', 'UI-01 草稿 SHL-UI01-02（灰窯說書人／沈客官）', '實機 792ec24：04-storyteller-duanmu（端木客官）')
side('SHL-UI01-02-appearances-stage1280.png', '03-oldsave-fallback-shenheng.png', 'cmp-03-oldsave.png', 'UI-01 草稿 SHL-UI01-02（右欄 沈衡／平民・20歲）', '實機 792ec24：main 舊存檔（刪 name）→ 後備名 沈衡')
zoom('SHL-UI01-02-appearances-stage1280.png', ['01-naming-preview-twoline.png', '02-wake-right-twoline.png', '03-oldsave-fallback-shenheng.png'], 'cmp-05-right-top-zoom.png')
print('ok')
