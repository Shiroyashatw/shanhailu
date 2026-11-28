# 交辦單：SPEC-03 黑市與人路規格

- **負責 bot**：數值設計師
- **目標**：把藍圖第 10 節與 12.5.1 的收贓、暗路、販人四階寫成可實作規格。第 3 期只做灰窯原既有點上的收贓與暗路；販人四階的規矩本包寫完，實作放後面的 DEV-14。
- **範圍**
  - 做：收什麼、誰收、價差原則、與善惡／通緝的連動；人路買主的規矩；販人四階（把風、押手、掌帳、分櫃）的門檻與回頭條件。賬本式帶過，不寫過程細節。
  - 不做：開發、驗收。不定新經濟公式去改既有物價（鹽價差等照舊）。不改 A-05 軍需帳收購清單。不做人路過程描寫。
- **要讀的檔案**
  - `/workspace/shanhai-sandbox-gdd/proposals/world-blueprint-v0.3.md` 第 10 節、12.5.1
  - `/workspace/shanhai-sandbox-gdd/proposals/rollout-plan-v0.1.md` SPEC-03、DEV-09、DEV-14 列、第 4 節 A-05
  - `/workspace/shanhai-sandbox-gdd/v0.3/09-economy-recipes.md`（既有物價，只對接口）
- **已拍板的相關決定**：販人完整開放，但不是升階必經。A-05 不在本包改。
- **交件位置與格式**：`/workspace/shanhai-sandbox-gdd/proposals/specs/SPEC-03.md`，或另做閱讀版 Page。不要把整份貼進聊天。決定沒改就修同一份。
- **完成標準**：DEV-09、DEV-14 各能按期實作，不互相改規矩。
- **完成後**：回報給「遊戲製作人」。
- **依賴**：無前置，可與 SPEC-01、SPEC-02 並行。與善惡的交界對齊 SPEC-02，可邊寫邊對。
