# shanhailu-check11b-1128：PR #11（DEV-02）fix3 獨立驗收

- 驗收對象：`feat/dev02-two-towns` @ `3fc260f8a38a84b791b5260bad8f19f18ec8d321`
- 判定：**PASS**

| 檔案 | 內容 |
| --- | --- |
| `e2e.log` | `node tests/e2e.js` 完整輸出（461/461 PASS，exit=0） |
| `e2e-dev02.log` | `node tests/e2e-dev02.js` 完整輸出（90/90 PASS，exit=0） |
| `check11b.js`／`check11b.log` | 獨立一次性腳本與輸出（24/24 PASS）：AC 20 測點、riskTier 對十進位參考實作全掃、route() 對暴力窮舉（正常／EDGES 反轉／NODES 反轉／隱藏點全知）、自造等長、源碼殘留三檔檢查、截圖 DOM 驗證 |
| `diff-4bb6f26-3fc260f.txt` | 4bb6f26..3fc260f 檔案與行數、睡眠識別字 diff 命中 |
| `map-preview-zhong.png` | 灰窯→野徑岔口 白天 12:00，risk 0.22「中」 |
| `map-preview-gao.png` | 灰窯→野徑岔口 黑夜 22:00，risk 0.44「高」（hot） |
| `map-preview-jigao.png` | 灰窯→青霧藥林 黑夜 22:00，risk 0.60「極高」（hot） |
| `map-preview-di.png` | 對照：灰窯→渡陰關 白天，官道 0.04「低」 |

範圍外、與 SPEC-TIME 7.1b 不一致（只記錄不修）：見 PR #11 留言。
