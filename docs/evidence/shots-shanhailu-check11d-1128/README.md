# shanhailu-check11d-1128：PR #11（DEV-02）fix5 最終驗收

- 驗收 HEAD：`20b5bcb7cdfa0eb528d61a0e96f012ab5cfdade6`（base main b0bed0a）
- 判定：**PASS**

| 項 | 檔案 | 結果 |
| --- | --- | --- |
| e2e.js | `e2e.log` | 461/461 PASS |
| e2e-dev02.js | `e2e-dev02.log`（未帶 --shots，不寫截圖） | 109/109 PASS |
| e2e-dev01b.js | `e2e-dev01b.log` | 81/81 PASS |
| check11c.js 重跑 | `check11c-rerun/`（只改 ROOT 相對路徑一行；log 內標籤文字仍寫 57a5b83，為原腳本硬寫字串，實跑對象是 20b5bcb） | 19/19 PASS |
| fix5 獨立核對 | `check11d.js`、`check11d.log` | 31/31 PASS |
| 合併 main／程式差異／睡眠 | `merge-and-diff-check.txt`、`diff-57a5b83-20b5bcb.txt` | 符合 |

截圖（1280×720）：
- `1-wild-head-low-chakou.png` 荒野標頭「低」
- `2-wild-head-mid-kugu.png` 荒野標頭「中」
- `3-dungeon-head-high-jiku.png` 地城標頭「高」（沉淵祭窟）
- `4-dungeon-head-extreme-liekou.png` 「極高」（酉神裂口）
- `5a-travelpreview-huiyao-to-fuzhao.png` ／ `5b-head-fuzhao.png` travelPreview「高」與同目的地腐骨沼標頭同色 rgb(200, 70, 58)
