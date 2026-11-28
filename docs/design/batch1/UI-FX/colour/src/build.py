# 色彩稿產生器：輸出到 colour/，不改灰階定稿
import sys, os, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
CSS_SRC = ROOT + 'html/common.css'
# common.css 由本包維護，不覆蓋
for mod in sys.argv[1:] or ['s01', 's02', 's03', 's04', 's05', 's06', 's07']:
    try:
        M = importlib.import_module(mod)
    except ModuleNotFoundError as ex:
        if ex.name == mod: continue
        raise
    for name, fn in M.SCREENS:
        open(ROOT + f'html/{name}.html', 'w').write(fn().html(rel_css='common.css'))
        print(name)
