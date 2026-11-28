# 《山海錄》UI-FX 色彩稿（v0.3）

2026-11-28（台北時間 UTC+8）｜UIUX設計師｜基準＝v0.3 實機 repo `main @ de91435`（讀 `css/style.css`、`js/ui.js`、`js/icons*.js` 與 `docs/evidence/shots-v03/` 截圖，**未開、未跑實機**）。mumi 16:29 核准灰階定稿後的下一階段。

**灰階定稿未改**（`/workspace/shanhailu-batch1/UI-FX/FX-0n-*.png` 仍為 16:20）。本包只寫入 `/workspace/shanhailu-batch1/UI-FX/colour/`。

用詞裁定：畫面、清單、CSV 的倍率文案「負重 ×M」改為「腳程 ×M」；左欄容量條仍寫「負重 52/80」。

---

## 檔案

| 圖 | 全頁（舞台＋圖板＋7 欄 legend） | 舞台 1280×720 |
|---|---|---|
| FX-01 度過時間（白天→黃昏） | `FX-01-time.png` | `FX-01-time-stage1280.png` |
| FX-02 露宿 8 小時 | `FX-02-camp.png` | `FX-02-camp-stage1280.png` |
| FX-03 趕路 | `FX-03-travel.png` | `FX-03-travel-stage1280.png` |
| FX-04 採集／挖礦 | `FX-04-gather.png` | `FX-04-gather-stage1280.png` |
| FX-05 買賣 | `FX-05-trade.png` | `FX-05-trade-stage1280.png` |
| FX-06 完成任務 | `FX-06-quest.png` | `FX-06-quest-stage1280.png` |
| FX-07 數字跳出規格 | `FX-07-numbers.png` | `FX-07-numbers-stage1280.png` |
| FX-08 回饋設定 | `FX-08-settings.png` | `FX-08-settings-stage1280.png` |

清單：`FX-LIST.md`／`FX-LIST.csv`（v0.3 色彩稿，57 條；已列色彩 token 與「腳程 ×M」）。排版與灰階定稿相同（1280×720、左 240／中 796／右 220、7 欄編號對應舞台／圖板徽章）。

美術裁切：`assets/town-plan.png`、`wild-qingwu.png`、`world-map.png`、`portrait.png`（自 `docs/evidence/shots-v03/` 對應 01-town-street、11-wild-campfire、08-worldmap）。像素 ICON 為 repo `icons.js`／`icons_more.js`／`icons_npc.js` 當場繪製。

---

## Token（style.css `:root` @ de91435，另註衍生）

| token | 值 | 用途 |
|---|---|---|
| `--page` | `#0b0a08` | 頁面底；主鈕字（落在 `--gold` 上） |
| `--bg` | `#171512` | 欄／圖板／legend 底 |
| `--cell` / `--cell-2` | `#1d1a16` / `#26221c` | 面板、格 |
| `--line` / `--line-soft` | `#4b4336` / `#332e26` | 框線 |
| `--ink` | `#d8cfbd` | 正文 |
| `--ink-2` | `#a0967f` | **16px 次要字**（`.dim`／`.off`／legend 副標）；不用 `--ink-3` 當 16px 字 |
| `--ink-3` | `#6e6656` | 非 16px 裝飾（對比不足正文 4.5） |
| `--gold` / `--gold-d` | `#c9a24a` / `#7d6328` | 主鈕底／金邊、關鍵與重大框；金標題 |
| `--red` | `#c8463a` | **只用於條／邊／填**，禁止當 16px 字色 |
| `--red-d` | `#5a1f1a` | 危險底盤、編號徽章底 |
| `--red-text` | `#e07066` | **衍生**：16px 危險／紅字，僅用於 `--bg`／`--pill`／`--cell` 上 |
| `--jade` | `#6aa585` | 輔色 |
| `--r-blue` / `--r-rare` / `--r-legend` | `#5b8fc9` / `#d6b24a` / `#e07a2e` | 稀有度等 |
| `--hp` / `--food` / `--fat` | `#b5382c` / `#c9a24a` / `#6b7fa8` | 命／飽食／疲累條填色（非字色） |
| `--bar-track` / `--pill` | `#0f0e0c` / `#100f0c` | 條軌道、浮出／toast 底盤 |
| `--serif` / `--sans` | Noto Serif CJK TC / Noto Sans CJK TC | 人名與標題用 serif；介面用 sans |
| `--fx-float-s` | 虛線底盤＋`--ink` 字 | 小階 |
| `--fx-float-k` | `--gold` 細邊＋`--gold` 字 | 關鍵階（強度高於小階） |
| `--fx-toast-m` | `--gold` 粗邊＋陰影＋底盤 | 重大階（強度最高的常規回饋） |
| `--fx-danger` | 底 `--red-d`、邊 `--red`；底盤上字 `--ink` | P0 危險，壓過以上三階 |
| `--fx-tint-0…3` | 示意色調 | 清晨／白天／黃昏／黑夜（無正式 ART-DAY） |
| `--fx-flash-max` | ≤3／秒、間隔 ≥400ms | 含戰鬥 cflash（未驗，待開發實測） |

主鈕：底改用官方 `--gold`（不用 `--gold-d`），字用 `--page`（8.25:1）。`--ink` 落在 `--gold-d` 只有 3.68，達不到正文 4.5。

---

## 對比（sRGB WCAG）

正文 ≥4.5:1；大字與圖示／色塊 ≥3:1。

| 前景 | 背景 | 比 | 判定 |
|---|---|---|---|
| `--ink #d8cfbd` | `--bg #171512` | 11.78 | PASS 4.5（正文） |
| `--ink-2 #a0967f` | `--bg` | 6.22 | PASS 4.5（16px 次要字） |
| `--ink-3 #6e6656` | `--bg` | 3.21 | FAIL 4.5（不當 16px 字） |
| `--gold #c9a24a` | `--bg` | 7.59 | PASS 4.5 |
| `--red #c8463a` | `--bg` | 3.81 | FAIL 4.5（只做條／邊／填） |
| `--red-text #e07066` | `--bg` | 5.80 | PASS 4.5（16px 紅字） |
| `--red-text` | `--red-d #5a1f1a` | 4.06 | FAIL 4.5（故危險底盤改用 `--ink`） |
| `--ink` | `--red-d` | 8.25 | PASS 4.5（危險底盤字） |
| `--ink` | `--pill #100f0c` | 12.39 | PASS 4.5（toast／浮出底盤） |
| `--ink-2` | `--pill` | 6.54 | PASS 4.5 |
| `--jade #6aa585` | `--bg` | 6.36 | PASS 4.5 |
| `--page #0b0a08` | `--gold` | 8.25 | PASS 4.5（主鈕字） |
| `--ink` | `--cell #1d1a16` | 11.21 | PASS 4.5 |
| `--hp #b5382c` | `--bar-track` | 3.28 | PASS 3.0（條填，非字） |
| `--food #c9a24a` | `--bar-track` | 8.04 | PASS 3.0／4.5 |
| `--fat #6b7fa8` | `--bar-track` | 4.80 | PASS 4.5 |

場景上的 toast／浮出皆有實心底盤（`--pill` 或 `--red-d`），不把字直接疊在美術上。

字級：legend、日誌、toast／浮出、露宿跳過提示為 ≥16px。舞台 HUD（欄標、格、pill、時段條）維持實機緊湊字級（約 9–12px），以免打散已核准排版，並讓畫面像現況。FX-07／FX-08 規格頁內說明表亦維持緊湊，階層樣品與危險字為 16px。

---

## 示意／占位

- 時段色調 `--fx-tint-0…3` 與時段條 `ph0–ph3` 色相：**示意**（無正式 ART-DAY）。
- 圖板關鍵幀內的街景／荒野／地圖縮圖：**示意**小圖，不是重繪美術。
- FX-08「選單 → 設定 → 回饋」面板本身：**示意**（實機尚無此頁）。
- 商店「店主」格：無對應立繪，以文字格示意。
- 街道／荒野／世界地圖／頭像：實機 evidence 裁切，不是占位。世界地圖截圖上的「血霧」二字是 `08-worldmap.png` 既有題字，本包未新寫；若需迴避請另裁或覆蓋（未先行塗改，以免偏離實機畫面）。

對齊實機座標（de91435）：趕路路線 灰窯鎮 (678,330) → 青霧藥林 (291,300)（地圖空間）；鎮公所光框為 plan `hy_board` 2×（舞台 564,94、136×132）；採集對準青霧藥林清心叢 (270,290)。

---

## 自檢

- `colour/_tools/render.js`：**8/8、0 issues**（溢出、截斷、同層重疊、編號壓字、編號互壓、legend 編號齊全）。
- 以 Read 打開全部 16 張 PNG（8 全頁＋8 張 stage1280）：日誌高亮已對 22px 行距；浮出無互壓；toast 有底盤；徽章未壓標題。目視未見需再改的裁切或溢出版。
- 灰階定稿 16 張 PNG 時間戳仍為 16:20（台北時間 UTC+8），未覆寫。
- 無舊 dpoe 用語（完美度、T 階、裝備★等）；本包文案未寫「血霧」（僅實機地圖截圖既有）。
