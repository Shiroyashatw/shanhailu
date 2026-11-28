# 交辦單：LOC-01 名稱審查收束

- **負責 bot**：本地化編輯
- **目標**：在已產出的 `names-final-v0.1.csv` 之上，確認尚未定稿的暫定名，讓後續規格與畫面能用。
- **範圍**
  - 做：確認四個時段暫定名「清晨、白天、黃昏、黑夜」是否採用，或提出更好懂的修訂；確認藍圖 12.10 的階段寫法「怪化（終階）」（路線總稱仍是「怪化」）是否另取階段名；潤飾「傀母」（屍傀門首領頭銜；階級「傀師」保留）、「十二祭」（已定按季舉行，原「十二時祭」）。必要時產出對照補表。
  - 不做：開發、驗收、改 repo、改 GDD 分冊玩法、重開已定名（CSV 109 筆已套進藍圖與點位）。不定系統規則（時段長度、祭典場次歸 SPEC-TIME／SPEC-SEASON）。
- **要讀的檔案**
  - `/workspace/shanhai-sandbox-gdd/proposals/names-final-v0.1.csv`
  - `/workspace/shanhai-sandbox-gdd/proposals/names-review-v0.1.md`
  - `/workspace/shanhai-sandbox-gdd/proposals/world-blueprint-v0.3.md`：4.2.3（十二祭）、4.5.1 與 12.3.5（傀母／傀師）、12.10（給本地化的備註）
  - `/workspace/shanhai-sandbox-gdd/proposals/rollout-plan-v0.1.md` 第 6 節第 5、9 項
- **已拍板的相關決定**：名稱潤飾以 CSV 為準。時段 4 段、內部 24 小時、不用時辰；夜間 20:00–05:00。十二祭改為按季舉行。階段名暫寫「怪化（終階）」以免與路線總稱相混。
- **交件位置與格式**：寫成檔案 `/workspace/shanhai-sandbox-gdd/proposals/names-confirm-v0.1.md`（可另附補表 csv）。不要把整份貼進聊天。決定沒改就修同一份。
- **完成標準**：四時段、怪化（終階）、傀母、十二祭各有「採用／改名＋新名」的明確結論；足以讓 SPEC-TIME 與後續文案接著用。
- **完成後**：回報給「遊戲製作人」。
- **依賴**：無前置，可立即開始。LOC-FEST、SPEC-TIME 的顯示用名會用到本包結果，但不擋 SPEC-TIME 先用暫定名寫區間。
