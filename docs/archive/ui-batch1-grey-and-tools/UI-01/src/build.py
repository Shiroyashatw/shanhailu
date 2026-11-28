import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import CSS
import screens as M
ROOT = '/workspace/shanhailu-batch1/UI-01/'
os.makedirs(ROOT + 'html/shl', exist_ok=True)
open(ROOT + 'html/common.css', 'w').write(CSS)
for grp, name, fn in M.SCREENS:
    os.makedirs(ROOT + f'html/{grp}', exist_ok=True)
    open(ROOT + f'html/{grp}/{name}.html', 'w').write(fn().html(rel_css='../common.css'))
    print(name)
