# shanhailu-check10-1128：PR #10 獨立驗證證據

- 驗證 HEAD：`792ec2446108d85ef761ddb0d7d06f950aebe3ca`（feat/dev01-name-commoner）
- 對照：main `de91435231edaed633476bcbea0ae1c1d2511022`（獨立 worktree，未改）
- 依據：`docs/design/batch1/rollout-plan-v0.1.md` 第 112 行、第 336 行；`decisions-producer-1128-1646.md` 第 2、3 項；`UI-01/README.md` 與 01／02／03 `-stage1280.png`
- 本目錄只放證據，不改功能檔。截圖皆 1280×720、deviceScaleFactor 1，由 `_shots.js` 產生；並排圖由 `_cmp.py` 產生（UI-01 草稿 2560×1440 縮至 1280×720）。

## e2e 輸出末尾

- `e2e-tail-pr-792ec24.txt`：`node tests/e2e.js --shots`（截圖寫到 repo 外 `../pr-e2e-shots`，未動 shots-v03）→ 461/461 PASS
- `e2e-tail-main-de91435.txt`：main worktree 同指令 → 376/376 PASS

## 截圖

| 檔 | 內容 |
| --- | --- |
| `00-title-one-card.png` | 標題頁只一張「身分／平民」卡 |
| `01-naming-preview-twoline.png` | 取名頁，輸入非常見姓「端木」名「青」；右欄即時兩行「端木青／平民・20歲」 |
| `02-wake-right-twoline.png` | 確定後醒來；右欄兩行；日誌「端木青（平民）在灰窯鎮醒來。」 |
| `03-oldsave-fallback-shenheng.png` | 用 **main @ de91435 實際產生的舊存檔**（origin=hunter，name 為字串），刪掉 name 欄、換 seed 1／42／99999 載入 → 右欄「沈衡」 |
| `03b-oldsave-log-overlay.png` | 同上，日誌 overlay（舊日誌原文「沈衡（獵戶）…」保留） |
| `04-storyteller-duanmu.png` | 灰窯說書人：「端木客官，要在鎮裡聽段舊事嗎？」 |
| `cmp-01-naming.png` | UI-01 01 vs 實機取名頁 |
| `cmp-02-wake-right.png` | UI-01 02 vs 實機醒來 |
| `cmp-03-oldsave.png` | UI-01 02 vs 舊存檔後備名 |
| `cmp-04-storyteller.png` | UI-01 02（沈客官）vs 實機（端木客官） |
| `cmp-05-right-top-zoom.png` | 右欄頂部 3× 放大：草稿 vs 01／02／03 |
| `measurements.json` | 各畫面右欄元素框、三欄寬、scroll 尺寸、重疊檢查結果 |

## 對照差異（照實列，不放寬）

1. 右欄第二行 `平民・20歲` 字級 11px 灰字，草稿第二行約與地點膠囊同級、較大；格式與用字一致（無空格、`・`、`歲`）。屬視覺級差，未判不符。
2. 左欄：實機仍有「地面」10 格，草稿已拿掉改「之後：同伴」。依製作人 16:46 裁決第 1 項「地面 10 格和『落在地面』不動」（DEV-DROP 範圍），屬預期，不算本包問題。
3. 左欄勢力清單實機為「破曉軍團／天星商會／鴉衛」，草稿為「…／白虎軍」；main 既有內容，本包未動。
4. 取名頁實機無「輸入不符時（示範）」框（草稿標明「非本屏狀態」）；不符時規則句換成兩條紅字（e2e 驗過）。
5. 人物 overlay 標題仍是 `人物・{全名}（平民・N 歲）`（有空格），與右欄 `平民・N歲` 不一致；UI-01 未畫人物 overlay，列待裁。
6. 舊存檔若原為已移除的出身（如獵戶），右欄身分顯示「平民」，但素質／熟練度／銀兩保留獵戶原值（截圖 03：靈覺 12、追蹤 20、銀 50）；日誌舊句仍寫「（獵戶）」。規格未規定，列待裁。

量測（measurements.json）：取名頁、醒來、說書人、舊存檔四個畫面皆 cols 240／796／220、scrollWidth 1280、scrollHeight 720、右欄名字兩行與膠囊／銀兩／時鐘／命條無重疊（hits 為空）、console 0 error。
