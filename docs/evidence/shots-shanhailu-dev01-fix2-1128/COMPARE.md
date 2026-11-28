# DEV-01 fix2（製作人 17:04 (6)(7)）實機 vs UI-01 對照

截圖由 `SHL_SHOTS_DIR=docs/evidence/shots-shanhailu-dev01-fix2-1128 node tests/e2e.js --shots` 在 commit `1d73371` 產生（1280×720，deviceScaleFactor 1）。
`cmp-*.png` 為實機（左）與 UI-01 `-stage1280.png`（右，2560×1440 縮至 1280×720）並排。

| 對照圖 | 實機 | UI-01 |
| --- | --- | --- |
| `cmp-01-naming-preview.png` | `30-naming-preview-twoline.png` | `SHL-UI01-01-naming-stage1280.png` |
| `cmp-02-wake-right.png` | `24-wake-log-right.png` | `SHL-UI01-02-appearances-stage1280.png` |
| `cmp-03-storyteller.png` | `31-storyteller-surname.png` | `SHL-UI01-02-appearances-stage1280.png` |
| `cmp-04-right-top-zoom.png` | 右欄頂部放大 ×3 | 圖 01／02 同區 |

## 一致
- 右欄兩行：第一行全名（2–4 字）、第二行「平民・20歲」（無空格，同圖 01／02 與 README §4 `{身分}・{年齡}歲`）。取名頁輸入中預覽同格式（圖 01）。
- 說書人名牌「灰窯說書人」，對白「{姓}客官，要在鎮裡聽段舊事嗎？」；姓取自 S.name.sur（截圖用「歐陽」）。
- 三欄 240／796／220、1280×720 無全頁捲動、文字無重疊（e2e audit）。

## 差異（逐項；本包不改）
1. 字級：實機沿用既有 15px/700（全名）與 11px/400（第二行）；UI-01 標 16/700・12/400 且名字有框。依 §6「不重做主介面」與 brief「不擅自改字級」維持實機字級、不加框。
2. 右欄頂部縱向：為放第二行，地點／日期膠囊 top 28→35、時鐘 51→57、銀兩 52→58（欄內位移 6–7px，寬度與字級不變）。UI-01 把銀兩與「第 1 日 08:00」分成兩行；實機維持同一列（不重排整欄）。實測（開局後，viewport 座標）：全名 y11–27、第二行 27–40、膠囊 42–62、銀兩 65–83、時鐘 64–84、命條 85–101，互不重疊。
3. 對話框：實機沿用既有街頭對話框（頭像在左、按鈕「閒談／離開」、框位置與尺寸照現況）；UI-01 圖 02 為合稿、按鈕寫「交談」。本包只改對白文字。
4. 左欄仍有「地面」10 格（UI-01 已拿掉）——屬 DEV-DROP，本包依 brief 不碰。
5. 圖 02 的日誌面板與懸賞令預留條是合稿示意，實機分開呈現（日誌 overlay `25-log-overlay.png`）。
6. README §1／§2 文字寫「沈衡・平民」（一行），但圖 01／02 PNG 畫兩行「沈衡／平民・20歲」；依 brief 以打開的 PNG 為準。
