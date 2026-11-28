# shanhailu-dev02-fix2-1128 證據

依據：docs/design/batch1/decisions-producer-1128-1726.md（17:26／mumi 17:25 批）、UI-FX/FX-LIST.md **X12**、specs/SPEC-TIME.md §6.2、Q7；T7／wrnd／08:00 依 issue #13。

完整測試執行時 HEAD：`59d4f8b38de682439d1c34471b5f2257c49af26f`（e2e-full.log：461/461 PASS；e2e-dev02-full.log：78/78 PASS）。

## cflash（ui.js 呈現層 `makeFlashBudget`／`flashOnce`）

量測：`animationstart`（animationName = cflash）時間戳，即玩家實際看到的閃光開播。最壞情況：4 隻 bug、bleed／poison 每回合、敵方幾乎必中。

| 模式 | 修前（350ms）總數／每秒最大／最小間隔 | 修後（400ms＋一影格餘裕）總數／每秒最大／最小間隔 |
|---|---|---|
| natural | 19／3／480ms | 19／3／480ms |
| mash200 | 0／0／— | 0／0／— |
| mash250 | 15／3／483ms | 15／3／482ms |
| mash300 | 13／2／583ms | 13／2／583ms |
| mash350 | 11／2／667ms | 12／2／683ms |
| mash400 | 20／3／**383ms（不合 ≥400）** | 10／2／767ms |

修前：最小間隔 383ms（cflash-before-350ms.log，新斷言 FAIL）。修後：全部模式每秒 ≤3、最小間隔 480ms（cflash-after-400ms.log、cflash-measure.json）。

## 睡眠

- sleep-before-fix.log：修前 13 項 FAIL，含 rest／bunk 在飽食 0、hp 10 時 `dead:true`（重現餓死）。
- sleep-after-fix.log：修後 28/28 PASS（13h→−16.25、6h→−7.5、9.5h→−11.875、12h→−15、冬季 10h→−15.625；rest 醒來回滿、bunk 醒來 31；一般 passTime 對照仍會死）。

截圖：dev02-01/02/03（1280×720），由 `SHOTS_DIR=docs/evidence/shots-shanhailu-dev02-fix2-1128 node tests/e2e-dev02.js --shots` 產生。
