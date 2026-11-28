import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import CSS
from fxlib import EXTRA_CSS
import importlib
ROOT = '/workspace/shanhailu-batch1/UI-FX/'
open(ROOT + 'html/common.css', 'w').write(CSS + EXTRA_CSS)
for mod in sys.argv[1:] or ['s01', 's02', 's03', 's04', 's05', 's06', 's07']:
    try:
        M = importlib.import_module(mod)
    except ModuleNotFoundError as ex:
        if ex.name == mod: continue
        raise
    for name, fn in M.SCREENS:
        open(ROOT + f'html/{name}.html', 'w').write(fn().html(rel_css='common.css'))
        print(name)
