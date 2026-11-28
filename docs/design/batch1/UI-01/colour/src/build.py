from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import CSS
from screens import SCREENS

ROOT = Path(__file__).resolve().parents[1]
html = ROOT / 'html'
(html / 'shl').mkdir(parents=True, exist_ok=True)
(html / 'common.css').write_text(CSS, encoding='utf-8')
for group, sid, fn in SCREENS:
    (html / group / f'{sid}.html').write_text(fn().html(), encoding='utf-8')
    print(sid)
