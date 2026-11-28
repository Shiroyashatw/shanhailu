# 山海錄（shanhailu）— 灰盒 v0.3

企劃書：`docs/design/GDD-v0.3.md`（完整版；v0.2、v0.25 保留作為歷史）。

十二生肖神墜落後第三年。在山海世界裡當一個無名小卒，自己決定怎麼活：沒有主線，沒有等級。
純前端靜態 HTML/CSS/JS，GitHub Pages 根目錄 `index.html` 可直接開啟。沒有任何外部圖檔，圖示、頭像、場景、地圖都是程式在載入時畫出來的。

## 開啟
- 直接開 `index.html`，或在 repo 根目錄執行 `python3 -m http.server` 後瀏覽 `http://localhost:8000/`。
- 網址參數：`?seed=數字` 固定亂數；`?fresh=1` 強制開新局；`?origin=hunter` 直接指定出身（`hunter`／`herbalist`／`miner`／`deserter`／`peddler`／`drifter`）；`?fx=0` 關閉戰鬥演出。
- 存檔：瀏覽器 localStorage `shanhailu.save`，每次行動自動存。舊版存檔不相容，會自動開新局。
- 畫面以 1280×720 為設計基準，依視窗大小自動等比縮放置中。

## v0.3 內容
| 系統 | 內容 |
| --- | --- |
| 世界 | 西山東麓・灰窯原：15 個地點（2 個要探查才會出現），另有大陸圖 |
| 城鎮 | 平面圖上直接點建築。6 個聚落、20 棟建築、26 個 NPC（老闆與路人） |
| 探查 | 每個地點都能探查：見聞、藏物、新採集點、新地點、遭遇，共 41 樣 |
| 見聞錄 | 25 條世界觀碎片，只能用撿的 |
| 勢力 | 破曉軍團、天星商會、鴉衛的聲望與門檻好處 |
| 戰鬥 | 一條行動列（武器、招式、技能、防禦、道具）；12 個招式、5 個技能；流血、中毒、破甲、失衡、侵蝕、會心；逐步演出 |
| 成長 | 7 素質、24 熟練度、6 出身。沒有等級 |
| 其他 | 委託、傳聞、獸潮、未鑑定裝備、5 個配方、4 個地城、18 種敵人、拖拉道具、永久死亡 |

## 操作
- 城鎮：點建築進去，點路人交談，點出口離開。
- 地圖：點地點設定目的地；在任何地點都能按「探查」。
- 戰鬥：點行動列，或數字鍵 1–9；R 是棄物撤退。也可以直接點左欄人形上的武器出手、點盾防禦。演出中再按會立刻收尾。
- 行囊：點擊＝使用／裝備／鑑定；拖拉＝搬移、穿脫、丟下、買賣。

## 檔案
- `index.html`、`css/style.css`
- `js/data.js`：資料表（物品、裝備、敵人、地點、建築、NPC、招式、探查、委託與傳聞模板…）
- `js/lore.js`：世界觀文本（見聞錄、NPC 台詞、探查與初訪文字）
- `js/icons.js`、`js/icons_npc.js`、`js/icons_more.js`：像素圖示、頭像、敵人（載入時轉成 CSS class `.ic-<id>`）
- `js/scenes.js`、`js/scenes_town.js`、`js/scenes_map.js`：像素場景、城鎮平面圖、地圖（`.sc-<id>`；並提供建築的點擊範圍）
- `js/game.js`：規則（狀態、存檔、時間、成長、城鎮服務、探查、委託、傳聞、世界事件、戰鬥）
- `js/ui.js`：三欄渲染、戰鬥演出、拖拉、縮放
- `tests/e2e.js`：Playwright 自動化互動驗證

## 繪圖
新增或修改任何圖（圖示、頭像、敵人、場景、地圖）時，照 `.claude/skills/shanhai-pixel-art/SKILL.md` 的流程做。Claude Code 在這個 repo 裡會自動載入這個 skill。附帶兩支腳本：

```
node .claude/skills/shanhai-pixel-art/scripts/check.js np_ pl_                # 結構檢查（尺寸、調色盤、id）
node .claude/skills/shanhai-pixel-art/scripts/sheet.js --out /tmp/s.png np_   # 放大總覽圖，供親眼檢查
```

## 驗證
```
node tests/e2e.js          # 只跑驗證
node tests/e2e.js --shots  # 並另存 1280×720 截圖到 docs/evidence/shots-v03/
```
需要 Node 與 `playwright`（Chromium）。

## 還沒做
數值只做到「能玩」，沒有調過平衡。同伴、偷竊與通緝、老化、第二個區域、馬車、檢查點模式都還沒做，見 GDD v0.3 第十一節。
