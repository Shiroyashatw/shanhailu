# shanhailu-dev05-fix1-1128 證據

程式碼 HEAD：`bd11bdbcbc5e2ac32d8ce990c9351cd35472d6dc`（四套 log 首行皆記此 sha；本 README 與 log 另一個 commit 收錄，不改程式）。

| 套件 | 結果 |
| --- | --- |
| `node tests/e2e.js` | 461/461 PASS（`e2e.log`） |
| `node tests/e2e-dev02.js` | 109/109 PASS（`e2e-dev02.log`） |
| `node tests/e2e-dev01b.js` | 81/81 PASS（`e2e-dev01b.log`） |
| `node tests/e2e-dev05.js` | 97/97 PASS（`e2e-dev05.log`） |

長期委託先失敗：同一段 e2e（`e2e-dev05.js` 第 13 節單獨抽出）在修改前的 merge commit `dd70b01` 跑 4/12（8 FAIL，`longquest-before-fix-dd70b01.log`），修改後 12/12（`longquest-after-fix.log`）。

截圖（1280×720，deviceScaleFactor 2）：

| 檔案 | 對照 | 內容 |
| --- | --- | --- |
| `dev05-01-collapsed.png` | UI-02-01 | 城況收合（日結後） |
| `dev05-02-expanded.png` | UI-02-02 | 展開：收支、駐軍、匪勢、出城路險、交易稅；無「投資巡邏所」、無剿匪鈕、無鎮簡介 |
| `dev05-03-danger.png` | UI-02-03 | 受創＋求援 |
| `fix1-03-brief-danger-dawn-high.png` | UI-02-03 | 清晨 06:00「出城路險 ! 高」（重現草稿 03 示範的「高」）；第一次日結前「尚無消息／過了午夜才有各鎮消息」 |
| `fix1-04-brief-danger-night.png` | UI-02-03 | 22:00「出城路險 !! 極高」（18:38 定稿底框）；左欄「腳程 輕快 ×1.00」 |
| `dev05-05-map-move.png` | UI-02-05 | 趕路底列、腳程 hover 定稿句 |
| `fix1-05-map-extreme.png` | UI-02-05 | 趕路列「危險 !! 極高」（hot、底 #5a1f1a、2px #c8463a） |
| `dev05-06-commission.png` | UI-02-06 | 委託單：險級四檔與色、長期單罰則、腳註原文 |
| `fix1-06-inn-sleep-2000.png` | — | 客棧 20:00「睡到明日 08:00」 |
