# 山海錄（shanhailu）— 灰盒 v0.1

依據：`docs/design/GDD-v0.2.md` 與 `docs/design/UIUX-v2-README.md`（含 4 張 v2 參考圖）。

15 分鐘可玩灰盒草稿。純前端靜態 HTML/CSS/JS，GitHub Pages 根目錄 `index.html` 可直接開啟，不需要後端。

## 開啟
- 直接開 `index.html`，或在 repo 根目錄執行 `python3 -m http.server` 後瀏覽 `http://localhost:8000/`。
- 網址參數：`?seed=數字` 固定亂數；`?fresh=1` 強制開新局。
- 存檔：瀏覽器 localStorage `shanhailu.save`，每次行動自動存。

## 版面（UIUX v2，1280×720 單屏）
| 欄 | x | 寬 | 內容 |
| --- | --- | --- | --- |
| 左 | 6 | 240 | 10 部位人形＋背包槽＋鎖定馬車槽、行囊 ICON 格（6 格起、最多 24）、地面暫放、近處小圖、24px 負重／速度條；Hover 提示卡只在左欄 |
| 中 | 252 | 796 | 世界地圖＋出發條／城鎮（市集・客棧＋藥爐・賞金）／荒野採集＋營火 3 配方／地城／第一人稱回合戰鬥（只畫敵人、頭頂血條與意圖、棄物撤退）／旅途事件／墓誌銘 |
| 右 | 1054 | 220 | 24 小時制時間、命／食／疲、5 類行為熟練度、已習技能、追蹤賞金、系統鈕 |

## 檔案
- `index.html`、`css/style.css`
- `js/data.js`：資料表（物品、裝備基底、詞綴、敵人、節點、城鎮、配方、事件、賞金）
- `js/game.js`：狀態、存檔（永久死亡／城鎮檢查點雙模式預留）、時間、背包、戰鬥、事件
- `js/ui.js`：三欄渲染與互動
- `tests/e2e.js`：Playwright 自動化互動驗證

## 驗證
```
node tests/e2e.js          # 只跑驗證
node tests/e2e.js --shots  # 並另存 1280×720 截圖到 docs/evidence/shots-v01/
```
需要 Node 與 `playwright`（Chromium）。
