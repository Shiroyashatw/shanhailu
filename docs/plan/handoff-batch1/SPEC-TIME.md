# 交辦單：SPEC-TIME 時間骨幹

- **負責 bot**：數值設計師
- **目標**：寫出時間系統的骨幹規格：時段、季節、天候狀態、事件接口。後續 SPEC-DAY、SPEC-SEASON、DEV-TIME 都掛在這一份上。
- **範圍**
  - 做：定義四時段狀態機與顯示；一季 30 天、一年 120 天的曆法接口；天候狀態（雨、雪、霧等）與事件鉤子（節慶、獸潮、店鋪營業、生存結算要能掛上來）。夜間對齊現況 20:00–05:00；清晨、黃昏各約 2 小時，**準確區間由本包定出並寫死**。寫清與現有 `passTime`／`isNight`／`seasonOf` 的接法（GDD 08 與 repo `dd3843b`）。十二祭按季舉行的接口留給 SPEC-SEASON 填場次，本包先留節慶鉤子。
  - 不做：開發、驗收。不推翻 30／120。不用時辰。不寫完整的遭遇表、作息表、產出表（那是 SPEC-DAY／SEASON）。不定戰鬥新公式。不畫光影（ART-DAY／UI-DAY）。
- **要讀的檔案**
  - `/workspace/shanhai-sandbox-gdd/proposals/rollout-plan-v0.1.md` 第 0 節結論第 2 點、第 2 期方向、「現況與缺口」表、第 6 節第 5–9 項
  - `/workspace/shanhai-sandbox-gdd/v0.3/08-survival-time.md`
  - `/workspace/shanhai-sandbox-gdd/proposals/world-blueprint-v0.3.md` 4.2.3（十二祭已定按季）
- **已拍板的相關決定**：時段暫定名清晨、白天、黃昏、黑夜（LOC-01 確認，本包可先用暫定名）。內部 24 小時，不用時辰。夜間 20:00–05:00。一季 30 天、一年 120 天。晚上店鋪打烊、野外更危險，客棧照開。會凍死、會餓死，但有緩衝，進城和生火能緩解（數值細節歸 SPEC-SEASON，本包要留生存結算接口）。十二祭按季舉行。
- **交件位置與格式**：`/workspace/shanhai-sandbox-gdd/proposals/specs/SPEC-TIME.md`，或另做閱讀版 Page。不要把整份貼進聊天。決定沒改就修同一份。
- **完成標準**：時段／季節／天候有狀態表與事件鉤子；清晨與黃昏的準確鐘點已寫出；DEV-TIME 只看這一份就能做骨幹。
- **完成後**：回報給「遊戲製作人」。
- **依賴**：無前置，可與 SPEC-01 並行。顯示用名若 LOC-01 尚未回來，先用暫定名並集中字串。
