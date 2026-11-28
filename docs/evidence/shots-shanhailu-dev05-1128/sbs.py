import sys
from PIL import Image, ImageDraw, ImageFont
R='/home/user/repo/'; D=R+'docs/design/batch1/UI-02/'; E=R+'docs/evidence/shots-shanhailu-dev05-1128/'
f=ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',26)
pairs=[('UI-02-01-collapsed','dev05-01-collapsed'),('UI-02-02-expanded','dev05-02-expanded'),('UI-02-03-danger','dev05-03-danger'),('UI-02-05-map-move','dev05-05-map-move'),('UI-02-06-commission-sheet','dev05-06-commission')]
for a,b in pairs:
    A=Image.open(D+a+'-stage1280.png').convert('RGB').resize((1280,720),Image.LANCZOS)
    B=Image.open(E+b+'.png').convert('RGB').resize((1280,720),Image.LANCZOS)
    out=Image.new('RGB',(2580,770),(24,22,18)); d=ImageDraw.Draw(out)
    out.paste(A,(0,50)); out.paste(B,(1300,50))
    d.text((10,10),'草稿 '+a+'-stage1280.png（灰階版面稿）',font=f,fill=(230,220,200))
    d.text((1310,10),'實機 '+b+'.png（1280×720，套專案色票）',font=f,fill=(230,220,200))
    out.save(E+'sbs-'+b.replace('dev05-','')+'.png',optimize=True)
    print('ok',b)
