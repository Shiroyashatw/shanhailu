# 交辦單：SPEC-01 活世界循環規格

- **負責 bot**：數值設計師
- **目標**：把 living-world v0.2 的 MVP 寫成開發只看這一份就能做的規格。
- **範圍**
  - 做：繁榮、財庫、治安、駐軍、稅、防失控、獸潮連動、玩家介入（資助巡邏、投資巡邏所、剿匪）。整理變數、每日結算、起手值、驗收數字（200 seed × 120 天等）。標出哪些是 living-world 已列的建議數字，不新造一套。
  - 不做：開發、驗收。不寫通緝、勢力影響力、邪路、時間骨幹（見 SPEC-TIME）、販人與融合。不定新數值體系。不改 GDD 分冊、不改 A-01～A-07（趕路只乘治安修正，不改負重公式）。
- **要讀的檔案**
  - `/workspace/shanhai-sandbox-gdd/proposals/living-world-v0.2.md` 第 1、2、8 節（系統循環、玩家介入、MVP 驗收）
  - `/workspace/shanhai-sandbox-gdd/proposals/rollout-plan-v0.1.md` SPEC-01 列、第 4 節 A-01、第 6 節第 2–4 項
  - `/workspace/shanhai-sandbox-gdd/v0.3/08-survival-time.md`、`03-world-map.md`（既有遇險率、獸潮，只對接口）
- **已拍板的相關決定**：第一批實作範圍仍是兩鎮、斷路幫、取名。A-01～A-07 不擋，沿用程式現況。活世界不必等美術定稿。一年 120 天、一季 30 天（日結會用到）。
- **交件位置與格式**：`/workspace/shanhai-sandbox-gdd/proposals/specs/SPEC-01.md`，或另做一份閱讀版 Page。不要把整份貼進聊天。決定沒改就修同一份。
- **完成標準**：開發只看這一份就能做 DEV-02～04；驗收條目可被 ACC-01 直接引用。
- **完成後**：回報給「遊戲製作人」。
- **依賴**：無前置，可立即開始。可與 SPEC-02、SPEC-03、SPEC-TIME 並行。UI-02 建議對齊本包要給玩家看的項目，但不必等本包完成才開工。
