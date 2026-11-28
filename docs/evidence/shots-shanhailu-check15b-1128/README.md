# shanhailu-check15b-1128：PR #15（DEV-05）獨立驗收 15b

- 驗收 HEAD：6c88bd50d6d1dba7a2fb736880ed366770c3fbf0（程式 HEAD 2985c81；2985c81→6c88bd5 只動 docs/evidence）
- main：35c3cc010548d3e49960b0ed129ae424f64a374d（fetch 後未前進，未再合 main）
- 每個 log 第一行為 `git rev-parse HEAD`。

| 檔案 | 內容 |
|---|---|
| diff-review.log | 程式 diff 檢查（migrate/SCHEMA、isNight／routeRisk 呼叫點、修正 commit 全 diff） |
| e2e*.log | 六套 e2e 實跑；dev03／dev04／dev05 各 5 次 |
| check15b.js／check15b.log | 一次性 scratch：preview==roll（48 趟逐 30 分＋所有目的地）、獨立公式重算、輕功案例、對照值（含畫面）、DEV-03／DEV-04 並存、截圖 |
| c15b-01/02 | 地圖 travelPreview 清晨 06:00／黃昏 18:00（灰窯→青霧，皆「高」） |
| c15b-03 | 城況簡報展開（清晨，出城路險 高） |
| c15b-04 | 委託板險級 |
| c15b-05 | 城鎮：路人／巡邏＋城況簡報同屏 |

截圖 1280×720 視窗、deviceScaleFactor 2。
