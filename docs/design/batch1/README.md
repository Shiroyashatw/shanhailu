# 第一批規格與草稿（batch1）

放入日期：2026-11-28（台北時間 UTC+8），依遊戲製作人 16:31 轉達、mumi 16:29 OK。檔案全部**原樣**從 box 複製，沒有改字。

## 拆包與完成標準看哪裡

拆包與完成標準看 `rollout-plan-v0.1.md` 第 5 節表格第 112–116 行、第 336–340 行。

補充（行號對的是本資料夾這份原檔）：

- 第 112–116 行＝第 3 節「第 1 期」工作包表（DEV-01～DEV-05 的「做／不做／前置／完成標準」欄）。
- 第 336–340 行＝第 5.1 節「建議第一批開發內容」表（DEV-01～DEV-05 的內容與前置）。
- 第 5 節整段（第 309 行起）另有派工條件與「不在第一批」清單，第 6 節是 mumi 已拍板項。

## 來源

| 本資料夾 | 來源（box，唯讀） |
| --- | --- |
| `rollout-plan-v0.1.md` | `/workspace/shanhai-sandbox-gdd/proposals/rollout-plan-v0.1.md`（2026-11-28 16:13 版） |
| `specs/SPEC-01.md`、`specs/SPEC-TIME.md`、`specs/SPEC-02.md`、`specs/SPEC-03.md`、`specs/CHANGELOG.md` | `/workspace/shanhai-sandbox-gdd/proposals/specs/`（四份規格與 CHANGELOG 皆 v0.5，2026-11-28 17:27／17:40 載入；SPEC-03 此次新加入） |
| `decisions-producer-1128-1646.md` | 遊戲製作人 16:46 裁決原文（7 項），後續 session 以本檔為準 |
| `decisions-producer-1128-1726.md` | 製作人 17:04 裁決（DEV-01 說書人台詞、右欄兩行）與 17:26／mumi 17:25 批（DEV-02 cflash 間隔 ≥400ms，對照 UI-FX X12） |
| `decisions-producer-1128-1727.md` | 製作人 17:30／mumi 17:27 拍板：腳程四檔與 hover 定稿、血霧→紅霧、鎮公所→鎮衙、委託險級、地面格繼續扣住 |
| `UI-FX/` | `/workspace/shanhailu-batch1/UI-FX/`（含 `FX-LIST.md`／`FX-LIST.csv` 的 X12；`__pycache__`／`.pyc` 未放） |
| `batch1-decisions-v0.1.md`、`city-status-copy-v0.1.csv`、`names-final-v0.1.csv`、`name-pool-v0.1.csv` | `/workspace/shanhai-sandbox-gdd/proposals/` |
| `dev-string-replace-batch1-v0.1.md`、`dev-string-replace-batch1-v0.1.csv` | `/workspace/shanhai-sandbox-gdd/proposals/`（本地化編輯 17:42；64 條字串替換對照表，位置對 `8c8beb6`） |
| `dev05-strings-v0.1.md` | `/workspace/shanhai-sandbox-gdd/proposals/dev05-strings-v0.1.md`（本地化編輯 17:46／檔案標 17:50；DEV-05「尚無消息」與客棧「睡到 {wake}」定稿） |
| `UI-01/`、`UI-02/` | `/workspace/shanhailu-batch1/UI-01/`、`UI-02/`（UI-02 含 `wording-map-commission.md`） |

說明：

- 規格基準程式是 `main @ dd3843b`；UI 草稿對照的是 `main @ de91435231ed`。實作時以目前 main 為準，行號與位置可能已變，要先在目前 main 上確認。
- `UI-01/`、`UI-02/` 的 `src/__pycache__/*.pyc`（Python 編譯快取）沒有放進來，其餘整個資料夾（PNG、`html/`、`src/*.py`、`_tools/`）照放。
- `SPEC-03.md` 已於 17:40 隨 v0.5 補入。其他 `proposals/` 檔案與各種 `.bak-*` 舊版仍未放入。`UI-FX/` 已於 17:28 補入（見後續更新）。
- 草稿（UI-01、UI-02）是灰階版面稿，只定版面與互動，實作要套專案現有色票與字級，不照草稿的白底灰框。


## 後續更新

- 2026-11-28 16:51（台北時間 UTC+8）：放進 `specs/SPEC-02.md`（16:41，K1 複驗已回並通過，新增 Q-K1d；Q-K1b／Q-K2d 本身已在 16:28 寫進上一版）、`specs/SPEC-01.md` 與 `specs/CHANGELOG.md`（檔案 mtime 16:48:30，正文標「v0.4 追加 16:50」：AC-A7 改為 `treasuryIn／Out／Net`＝23／15／+8，`T = 207.96`）。另增 `decisions-producer-1128-1646.md`（製作人 16:46 裁決 7 項原文）。與先前 brief 假設衝突時，以該裁決檔為準。
- 2026-11-28 17:28（台北時間 UTC+8）：補入 `UI-FX/`（來源 `/workspace/shanhailu-batch1/UI-FX/`，不含 `__pycache__`／`.pyc`），以及 `decisions-producer-1128-1726.md`（17:04 的 DEV-01 第 6、7 項；17:26／mumi 17:25 批：cflash 節流在 `ui.js` 呈現層，每秒最多 3 次、間隔至少 400ms，對照 FX-LIST X12，不綁回合結構，這批其他地方一律不動戰鬥）。
- 2026-11-28 17:31（台北時間 UTC+8）：另增 `decisions-producer-1128-1727.md`（製作人 17:30、mumi 17:27 拍板 6 項）。腳程改由 DEV-05 顯示「檔名 ×倍率」與定稿 hover；全域「血霧→紅霧」「鎮公所→鎮衙」等 DEV-02～05 合併後另開 textsweep；地面格與 DEV-DROP 繼續扣住。

- 2026-11-28 17:40（台北時間 UTC+8）：四份規格升 v0.5（來源 `/workspace/shanhai-sandbox-gdd/proposals/specs/`）。`specs/SPEC-TIME.md`：7.1b 險級四檔（門檻 0.15／0.35／0.60）、7.2 腳程切點與兩位小數判檔、血霧→紅霧、B1／E11「下一個 08:00」含當下、§6.2 睡眠飽食 1.25×時數。`specs/SPEC-01.md`：4.8／4.9 委託險級、長期委託軟期限 30／60 日、AC-E9～E11。`specs/SPEC-02.md`：事件 `longquest_expire`、驗收第 34 條。`specs/SPEC-03.md` 新加入：2.1 行囊滿流程、DEV-09 驗收第 11 條。`specs/CHANGELOG.md` 同步放入 v0.5 段。`num-shl-b1-t3v5` 結果待回。 另放入 `dev-string-replace-batch1-v0.1.md` 與同名 `.csv`（本地化編輯 17:42；「17:27 本批」38、「稍早已定」26，共 64 條；位置對 `8c8beb6`）。全域字面替換以本表為依據，等 DEV-02～05 合併後由 textsweep1 執行。
- 2026-11-28 17:46（台北時間 UTC+8）：放入 `dev05-strings-v0.1.md`（本地化編輯；第一次日結前「尚無消息」／「過了午夜才有各鎮消息」；客棧按鈕「睡到 {wake}」與 hover 定稿）。
