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
| `specs/SPEC-01.md`、`specs/SPEC-TIME.md`、`specs/SPEC-02.md` | `/workspace/shanhai-sandbox-gdd/proposals/specs/`（SPEC-01、SPEC-TIME v0.4；SPEC-02 v0.4） |
| `batch1-decisions-v0.1.md`、`city-status-copy-v0.1.csv`、`names-final-v0.1.csv`、`name-pool-v0.1.csv` | `/workspace/shanhai-sandbox-gdd/proposals/` |
| `UI-01/`、`UI-02/` | `/workspace/shanhailu-batch1/UI-01/`、`UI-02/`（UI-02 含 `wording-map-commission.md`） |

說明：

- 規格基準程式是 `main @ dd3843b`；UI 草稿對照的是 `main @ de91435231ed`。實作時以目前 main 為準，行號與位置可能已變，要先在目前 main 上確認。
- `UI-01/`、`UI-02/` 的 `src/__pycache__/*.pyc`（Python 編譯快取）沒有放進來，其餘整個資料夾（PNG、`html/`、`src/*.py`、`_tools/`）照放。
- 沒有放入 `SPEC-03.md`、`UI-FX/`、其他 `proposals/` 檔案與各種 `.bak-*` 舊版。
- 草稿（UI-01、UI-02）是灰階版面稿，只定版面與互動，實作要套專案現有色票與字級，不照草稿的白底灰框。
