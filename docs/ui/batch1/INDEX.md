# INDEX：《山海錄》批次 1 上色定稿

**狀態：定稿（mumi OK 18:18）**｜2026-11-28（台北時間 UTC+8）｜UIUX設計師｜文件只供開發與本地化對照，**不推 repo、不派工**。

**四包全數定稿（mumi OK 18:18）。** 根目錄：`/workspace/shanhailu-batch1/`

| 包 | 規格 | 圖（colour/） | 張數 | 這輪重繪 | 18:18 定稿輪檢查表 |
|---|---|---|---|---|---|
| UI-01 | `_final/SPEC-UI-01.md` | `UI-01/colour/SHL-UI01-0n-*.png` | 4 張×2 | 4 張全頁（圖例一行）；舞台像素相同 | `UI-01/colour/CHECK-1727.md` |
| UI-02 | `_final/SPEC-UI-02.md` | `UI-02/colour/UI-02-0n-*.png` | 6 張×2 | 05 全頁（圖例）；其餘未動 | `UI-02/colour/CHECK-1727.md` |
| UI-FX | `_final/SPEC-UI-FX.md` | `UI-FX/colour/FX-0n-*.png` | 8 張×2 | FX-01…07（右欄、圖例）；FX-08 像素相同 | `UI-FX/colour/CHECK-1727.md` |
| UI-DROP | `_final/SPEC-UI-DROP.md` | `UI-DROP/colour/UI-DROP-0n-*.png` | **8 張**×2（新增 08） | 01–04、06、07（右欄上移）＋08 新增；05 像素相同 | `UI-DROP/colour/CHECK-1727.md`、`CHECK.md` |

其他：`CHANGELOG-1818.md`（異動清單）｜`_shared/consistency-1745.md`（含 18:18 更正註記）｜`/workspace/shanhai-sandbox-gdd/proposals/specs/SPEC-03.md`（Q-DROP-1，本機改，未提交）。每包 `_bak-1818/` 是覆寫前備份。

## 18:18 定稿輪重點

1. 腳程切點＝mumi 17:27：輕快 ≥1.00｜平常 0.67–0.99｜沉重 0.50–0.66｜蹣跚 <0.50。
2. 險列有危險（中／高／極高）才出現，低檔隱藏、下方上移；對照圖 UI-DROP-08。
3. UI-DROP 07 保留。
4. Esc／右鍵取消拖曳＝DEV-DROP 需求（未派工）。
5. SPEC-03 Q-DROP-1 依 17:56 裁定補齊顯示與 DEV 備註。

## 待辦（不在本輪範圍）

| 項目 | 歸屬 |
|---|---|
| 制式裝備 hover「這是制式裝備，不能丟棄」字面 | 本地化 |
| DEV-DROP：Esc／右鍵取消；撤退棄物改直接消失（`game.js` 1603 `dropToGround`）；「禁」判斷與押前線制式裝備（目前無 issue 代碼） | 開發（未派工） |
| 險列 160ms 過渡實測 | 開發（未驗） |
| `wording-map-commission.md` | LOC 擁有；18:23 已定名「出城路險」，無待改 |

## 未驗

沒有開實機、沒有跑遊戲；實機行為（`game.js` 行號、tooltip 手感、動效秒數）只讀原始碼（main 8c8beb6）或屬擬案。
