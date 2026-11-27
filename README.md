# 山海錄（shanhailu）— 灰盒 v0.25

依據：`docs/design/GDD-v0.25.md`（增修）、`docs/design/GDD-v0.2.md`、`docs/design/UIUX-v2-README.md`。

俠客遊式的單機自由人生。純前端靜態 HTML/CSS/JS，GitHub Pages 根目錄 `index.html` 可直接開啟，不需要後端，也沒有任何外部圖檔：像素 ICON 與場景都是程式在載入時畫出來的。

## 開啟
- 直接開 `index.html`，或在 repo 根目錄執行 `python3 -m http.server` 後瀏覽 `http://localhost:8000/`。
- 網址參數：`?seed=數字` 固定亂數；`?fresh=1` 強制開新局；`?origin=hunter` 直接指定出身（`hunter`／`herbalist`／`miner`／`deserter`／`peddler`／`drifter`）。
- 存檔：瀏覽器 localStorage `shanhailu.save`，每次行動自動存。v0.1 的舊存檔不相容，會自動開新局。
- 畫面以 1280×720 為設計基準，依視窗大小自動等比縮放置中。

## v0.25 新增
| 系統 | 內容 |
| --- | --- |
| 成長 | 7 項素質、四大類 23 項熟練度（25／50／75 門檻能力）、6 種出身。沒有等級 |
| 裝備 | 10 部位全開、30 種基底、武器四類、輕重甲、素質門檻、未鑑定 |
| 委託 | 每城每天補到 3 張（收集／獵殺／送貨），有期限；另有長期清窟懸賞 |
| 傳聞 | 客棧打聽。3 題材 × 5 真相（屬實／有人盤踞／強敵鎮守／已被取走／是餌），會隨時間過時 |
| 世界事件 | 獸潮：每隔幾天襲擊一座城鎮，不理會有後果 |
| 時間 | 曆法、四季影響採集、年齡 |
| 介面 | 中式暗黑配色、像素 ICON 與場景、道具拖拉、視窗等比縮放 |

## 操作
- 點擊：行囊＝使用／裝備／鑑定；人形槽＝卸下；地面＝撿起；市集裡點行囊＝選取賣出、右鍵＝直接賣。
- 拖拉：行囊格互換或合併；行囊↔人形槽＝穿脫；拖到「地面」＝丟下；市集裡拖到交易欄＝賣、貨架拖進行囊＝買一個。
- 戰鬥：鍵盤 1–5 行動、R 棄物撤退。

## 檔案
- `index.html`、`css/style.css`
- `js/data.js`：資料表（物品、裝備基底、詞綴、敵人、節點、城鎮、素質、熟練度、出身、委託與傳聞模板、獸潮）
- `js/icons.js`：像素 ICON（手繪像素格，載入時轉成 CSS class `.ic-<id>`）
- `js/scenes.js`：像素場景（載入時以程式繪製，轉成 CSS class `.sc-<id>`；並提供城鎮建築的點擊範圍）
- `js/game.js`：狀態、存檔、時間、背包、成長、委託、傳聞、世界事件、戰鬥
- `js/ui.js`：三欄渲染、拖拉、縮放
- `tests/e2e.js`：Playwright 自動化互動驗證

## 驗證
```
node tests/e2e.js          # 只跑驗證
node tests/e2e.js --shots  # 並另存 1280×720 截圖到 docs/evidence/shots-v025/
```
需要 Node 與 `playwright`（Chromium）。

## 還沒做
數值只做到「能玩」，沒有調過平衡。同伴、偷竊與通緝、老化、勢力、馬車、檢查點模式都還沒做，見 GDD v0.25 第十節。
