# shanhailu-check11c-1128：PR #11 fix4 獨立驗收證據

- 驗收 HEAD：`57a5b83e7955a895f8a77bdaedbdfd63d80cd784`（feat/dev02-two-towns）
- 未改任何 js／tests；本目錄只放證據。

| 檔案 | 內容 |
|---|---|
| `e2e.log` | 57a5b83 上 `node tests/e2e.js` 完整輸出（461/461） |
| `e2e-dev02.log` | 57a5b83 上 `node tests/e2e-dev02.js` 完整輸出（99/99） |
| `check11c.js` / `check11c.log` | 獨立腳本與輸出（19/19）：AC 21 源碼／資料／70 個畫面／含露宿日誌掃描、露宿同 seed 對 4bb6f26／3fc260f 比對（各 400 次）、AC 20 測點、route() 四層對自寫暴力窮舉（24 情境 × 6 排列 = 30240 次）、routeRisk／travelPreview 一致、自造 L3／L4 決勝 5 案 |
| `l4shot.js` / `l4shot.log` | 真實地圖第 4 層決勝路線（青霧藥林→赤石廢礦，經野徑岔口）預覽截圖 |
| `diff-3fc260f-57a5b83.txt` | `--stat` 與程式部分 diff |
| `merge-check.txt` | `git merge-tree` 試合 origin/main（adbb161）、b9f1118 包含檢查 |
| `jiku-risk-gao.png`、`fuzhao-risk-gao.png` | 1280×720：沉淵祭窟／腐骨沼「險 高」 |
| `real-l4-preview-qingwu-chishi.png` | 1280×720：真實地圖第 4 層決勝路線預覽 |
| `synthetic-l3-preview.png` | 1280×720：自造圖第 3 層決勝預覽（真實地圖無第 3 層決勝路線，僅示意） |

重跑：`node docs/evidence/shots-shanhailu-check11c-1128/check11c.js <4bb6f26 解出目錄> <3fc260f 解出目錄>`（舊版樹以 `git archive <sha> | tar -x -C <dir>` 取得）。

附註（不在本輪驗收清單內，供裁定）：SPEC-TIME AC 21 另寫「四檔共用同一套色階」。目前路程預覽「高」「極高」上 hot 樣式，但荒野險級 pill 一律無 hot、地城險級 pill 只有「極高」上 hot，所以沉淵祭窟／腐骨沼的「險 高」不是 hot 色，與路程預覽的「高」顏色不同。此差異 fix4 前就存在（舊「中高」也不上色），fix4 未改 ui.js。
