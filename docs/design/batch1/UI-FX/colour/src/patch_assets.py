# 覆蓋實機截圖上的舊詞（只改 colour/assets，原圖留在 assets/orig/）
#  - 地圖區塊「血霧」→「紅霧」（17:27 用詞裁定）
#  - 平面圖建築標籤「鎮公所」→「鎮衙」
from PIL import Image, ImageDraw, ImageFont
import numpy as np, os
A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
SERIF = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
SANS = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
def font(path, size):
    for idx in range(0, 8):
        try:
            f = ImageFont.truetype(path, size, index=idx)
            return f
        except Exception:
            continue
# ---- 地圖 ----
m = Image.open(f'{A}/orig/world-map.png').convert('RGB')
a = np.array(m).astype(float)
X0, X1, Y0_, Y1 = 40, 101, 421, 457
for r in range(Y0_, Y1):
    L = a[r, X0 - 5].copy(); R = a[r, X1 + 5].copy()
    if L[0] > 140 and L[0] - L[2] > 90:   # 左側落在熔岩裂縫上：整列改用右側底色
        L = R.copy()
    if R[0] > 140 and R[0] - R[2] > 90:
        R = L.copy()
    for c in range(X0, X1 + 1):
        t = (c - X0) / (X1 - X0)
        a[r, c] = L * (1 - t) + R * t
img = Image.fromarray(a.astype('uint8')).convert('RGBA')
ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
f = font(SERIF, 30)
d.text((42, 421), '紅', font=f, fill=(210, 190, 180, 52))
d.text((72, 421), '霧', font=f, fill=(210, 190, 180, 52))
Image.alpha_composite(img, ov).convert('RGB').save(f'{A}/world-map.png')
# ---- 城鎮平面圖 ----
t = Image.open(f'{A}/orig/town-plan.png').convert('RGB')
b = np.array(t).astype(int)
# 舊標籤板 339..423 × 68..88；先用左右外側同列像素補回底
px0, px1, py0, py1 = 338, 424, 67, 89
for r in range(py0, py1 + 1):
    for c in range(px0, px1 + 1):
        b[r, c] = b[r, 332] if c < 381 else b[r, 430]
t = Image.fromarray(b.astype('uint8')).convert('RGB')
dr = ImageDraw.Draw(t)
plate_bg = (16, 15, 12); border = (96, 86, 70)
nx0, nx1 = 343, 419
dr.rectangle([nx0, 68, nx1, 88], fill=plate_bg, outline=border, width=1)
f2 = font(SANS, 13)
dr.text((nx0 + 9, 69), '鎮衙', font=f2, fill=(214, 205, 186))
dr.text((nx0 + 9 + 26 + 6, 69), '委託', font=f2, fill=(110, 102, 86))
t.save(f'{A}/town-plan.png')
print('patched')
