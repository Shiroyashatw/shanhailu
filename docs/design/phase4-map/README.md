# 第 4 期「新世界地圖」總覽

> 狀態：彙整現況，未定稿
> 日期：2026-11-28（台北時間 UTC+8）｜彙整：遊戲製作人
>
> 來源：
> - `proposals/rollout-plan-v0.1.md`（第 2、3、6 節；第 4 期各包）
> - `proposals/world-blueprint-v0.3.md`（第 1、7、11.5、11.6 節）
> - `proposals/world-map-points-v0.1.md`／`.csv`
> - `proposals/living-world-v0.2.md`（第 4 節，歷史）
> - `proposals/handoff/batch1/ART-01.md`
> - `/workspace/shanhailu-art/world-map-v1/WORLD-MAP-SPEC.md`、`SLOTS-README.md`、`CHANGELOG.md`、`data/z2_dynamic_slots_final.csv`
> - `/workspace/shanhailu-art/towns-v1/ART-02-SPEC.md`
> - `proposals/specs/SPEC-TIME.md`（7.1b 出城路險）
> - repo `Shiroyashatw/shanhailu` 唯讀（本機對照 `main@8c8beb6`：`js/scenes_map.js`、`js/data.js`、`js/ui.js`、`docs/`）
>
> 本目錄只整理已寫過的現況。未定處標【待定】，不自行拍板。
> 標記：**mumi 已定**（附時間與出處）、**製作人判斷**、**【待定】**。

用詞已定：紅霧（不用血霧）、鎮衙、危險四檔低／中／高／極高（沒有「中高」）、出城路險、腳程。

同目錄：`SPEC-MAP.md` 世界地圖規格、`SPEC-DYN.md` 動態地點、`ART-DEPS.md` 美術依賴、`TECH.md` 技術方向、`OPEN-QUESTIONS.md` 待定題。

---

## 1. 目標

把美術已畫的大陸圖、區域圖、地方層 27 頁與六聚落平面圖換進遊戲；在地方層預留空位上，先於灰窯原生成會出現、也會消失的動態地點。

未開放區只能看。不一次灌 300+ 新點。不開放中山與裂縫外。地城方案 B 的臨時地城與遠地總壇不在本期（第 6 期 SPEC-DUN／DEV-DUN）。

## 2. 分期位置（mumi 已定）

- **15:22**（rollout 決策表第 17 項）：先做完日常生活類，再接新世界地圖；身分與路線之後慢慢補。
- **18:07**（決策表第 26 項）：第一批開發回來即暫停，ACC-01 先不做。重啟先第 2 期（時段、四季、天候、節慶、手感），3a 盜墓接第 2 期後、不等 ATB；然後 3b 居民與人事；再進第 4 期。法紀在地圖之後、路線之前（原為製作人判斷，18:07 已確認）。
- **18:07**（決策表第 27 項）：同伴排在所有玩法之後，不能提前。

第 4 期本身：等 ART-01 定稿後再做開發（rollout 第 2 節）。ART-01／ART-02 是否已達「定稿」、可否開工，見 `OPEN-QUESTIONS.md` 題 1。

## 3. 包清單與依賴（全部未派）

來源：rollout-plan 第 2 節分期圖、第 3 節第 4 期表。現況：**九包皆未派**。

| 包 | 負責 | 目標（摘） | 前置 |
| --- | --- | --- | --- |
| SPEC-DYN | 數值 | 藍圖 11.5 的生成規則與數值；只放 238 格 | SPEC-01、SPEC-TIME、空位表定稿 |
| LOC-DYN | 本地化 | 8 類暫名定名 | 可與 SPEC-DYN 並行 |
| DEV-10 | 開發 | 兩層地圖加地方層 27 頁；聚落平面圖接入。可拆 10a（大陸、區域）與 10b（地方層與平面圖） | ART-01 定稿、ART-02 定稿 |
| DEV-11 | 開發 | 灰窯原新點位（分批）：先據點、關口、廟壇、收贓點、暗路點、裂口；野外地標第二批 | DEV-10、**DEV-NPC**（第 3 期 3b）；圖等 ART-03，否則先佔位 |
| ART-03 | 美術 | 灰窯原關鍵新點視覺（後巷、射圃、私礦口、祭窟外觀等） | ART-01 草稿通過後可出草稿 |
| ART-DYN | 美術 | 8 類圖示與地方層空位樣式 | ART-01 地方層進度；可與 SPEC-DYN 並行出草稿 |
| UI-DYN | UIUX | 發現提示、地方層標示、傳聞／跡象；本批先到草稿 | SPEC-DYN；標示接 ART-DYN |
| DEV-DYN | 開發 | 在空位上生成、消失、雙向改城況；先灰窯原；地城入口格先留空 | SPEC-DYN、空位表、DEV-02、DEV-10；圖示等 ART-DYN、提示等 UI-DYN；建議 DEV-11 已能放點 |
| ACC-03 | UIUX | 對藍圖第 1、7、11.5 節與點位清單第一批 | DEV-10、DEV-11、DEV-DYN 回來後再派 |

依賴順序（照 rollout 已寫的前置，不另定）：

```
ART-01 定稿 ──┐
ART-02 定稿 ──┴─ DEV-10 ──┬─ DEV-11（另依 DEV-NPC；圖等 ART-03，否則佔位）
SPEC-01、SPEC-TIME、空位表 ─ SPEC-DYN ─┐
LOC-DYN（可並行）                      ├─ DEV-DYN → ACC-03
ART-01 地方層 ─ ART-DYN ───────────────┤     （ACC 也要等 DEV-11）
SPEC-DYN ─ UI-DYN ────────────────────┘
```

規格可提早寫、不佔開發（rollout 第 2 節）：SPEC-DYN、LOC-DYN 等 SPEC-01、SPEC-TIME 與空位表定稿。這三項現況都已齊。暫停期間要不要派，見 `OPEN-QUESTIONS.md` 題 2。

不在本期：SPEC-DUN／DEV-DUN／ART-04（第 6 期）；ART-SEASON／DEV-TIME／DEV-SEASON（第 2 期）；其他山、大荒實作、中山遠望細節（第 8 期）。第 4 期沒有獨立的 UI-MAP／SPEC-MAP 包，見題 3。

## 4. 已有資料現況（不是派工狀態）

美術側（`/workspace/shanhailu-art/world-map-v1/`，至 16:01）：

- 大陸 Z0 定稿；Z1 9 頁已畫（mumi 13:19 D1 定案）。
- 地方層 Z2 27 頁定案（mumi 核可 A 14:25、B 14:45、C 15:06、D 15:20；rollout 決策表第 18 項）。
- 動態點空位表定稿 238 格（同項）。
- 季節疊加接口已寫（供第 2 期 ART-SEASON 接手，不畫四季成品）。
- ART-02 六聚落平面圖為灰模草稿 v0.2（mumi 14:06 核可 D1–D5），不上色、不定最終上色稿。

開發側：第 4 期九包全部未派。現行遊戲仍是程式繪製的區域圖＋大陸圖（15 地點、6 聚落）。

## 5. 建議放入 repo 的位置

見本目錄交辦回報。建議路徑：`docs/design/phase4-map/`（與現有 `docs/design/batch1/` 並列）。不要併進 docs PR #9（`docs/batch1-specs`，那是第一批規格）。只推文件、不改程式；開文件 PR，不合併進 main（mumi 18:08）。
