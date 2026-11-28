# CHECK-ATB：四步文字檢查（colour-fix-1727 §3）

日期 2026-11-28（台北時間 UTC+8）。工具：`_tools/render.js`（puppeteer-core，2× 縮放）。報表：`_tools/check-report.json`。

1. DOM 逐節點：overflow／clipped／overlap（含編號章與跨層）／行數（標籤、按鈕、數值須單行）／孤字／拆分記號（如「×1.08」）／字級 <16px（編號章與圖例註記除外，另計 badge）。
2. 每張 PNG 2× 切 4 塊（`_tiles/<檔名>-t1..t4.png`），逐塊用 Read 打開目視（含修改後重讀的塊）。
3. 禁用詞 grep（完美度／血霧／T階／裝備★／灰鬣狼／鎮公所／中高）在 html／src：**0 筆**；另 html 內「刻」「ATB 縮寫」：**0 筆**（README 的詞語對照表除外，那裡刻意列舊詞）。
4. 下表。

| 檔名 | DOM（overflow / clip / overlap / 行數 / 孤字 / 拆分 / <16px / 章） | 目視 4 塊 | 這輪改了什麼 |
|---|---|---|---|
| ATB-01-choose.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 補 trails；重算按鈕輕重標位置；圖例 21 項自動避讓；「同刻度」→「同一把尺」 |
| ATB-02-running.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 出手線標籤左移 12px 離開「第 3 手」框 |
| ATB-03-ready.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 同上；輕重標沿用 |
| ATB-04-motion.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 補軌跡殘影；T5 句子重寫；「立刻」→「立即」 |
| ATB-05-knockback.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | B 段標題上移 14px 避開區段標籤；你的「搖」記號提到外圈之上 |
| ATB-06-fx0.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 「立刻」→「立即」；ui.js 行號改 10–11 |
| ATB-07-crowd.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 下一位／被滑過者的小籤提到最上層；卡片列與展開名單對齊 44 熱區；備註改位置 |
| ATB-08-weights.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 尾註改「招式名是示例」 |
| ATB-09-openings.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 鄰近敵人小籤只留記號；遇伏疊放記號移到左側不蓋編號 |
| ATB-10-edge.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 長名稱 tooltip 與「指令不可用」改為不編造規則 |
| ATB-11-prediction-slot.png／-stage1280.png | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | OK | 8 格改 47px 間距不貼框；4 格說明框縮高避免壓狀態牌 |

**<16px 例外**：圖例表格、編號章（12px）＝稿紙註記，不是遊戲 UI；遊戲 UI 內文字全部 ≥16px。

**未驗**：實際像素圖留白（敵人身體圖與狀態牌 23px 重疊）、真實字型（用 Noto Sans CJK 近似）、手把與鍵盤操作。
