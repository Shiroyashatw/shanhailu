import sys
from PIL import Image
# usage: crop.py name x y w h [out]   (座標以 1x 頁面像素計，輸出 2x)
n,x,y,w,h=sys.argv[1],*map(int,sys.argv[2:6])
im=Image.open(f'/workspace/shanhailu-batch1/UI-FX/{n}.png')
out=sys.argv[6] if len(sys.argv)>6 else f'/tmp/crop_{n}.png'
im.crop((x*2,y*2,(x+w)*2,(y+h)*2)).save(out)
print(out, im.size)
