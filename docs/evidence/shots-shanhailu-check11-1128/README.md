# shanhailu-check11-1128：PR #11（DEV-02 兩鎮循環）獨立驗證證據

- 驗證對象：`feat/dev02-two-towns` @ `d0989ba447ff9c9ab9337841db398b9d82173a9a`（PR #11 head，開始前以 `git ls-remote` 與 REST 確認相符）
- 對照：`main` @ `de91435231edaed633476bcbea0ae1c1d2511022`（另開 worktree，未改 main）
- 依據：只用 `docs/design/batch1/`（rollout-plan 第 113、337 行、decisions-producer-1128-1646 第 1、4–7 項、SPEC-01 v0.4、SPEC-TIME v0.4 §11 B1／E11）
- 本目錄只新增證據檔，沒有改 `js/`、`tests/`、CSS、HTML。

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `test-pr-d0989ba-e2e.txt` | 本分支完整 `node tests/e2e.js` 原始輸出（首行為執行時 `git rev-parse HEAD`）→ 376/376 PASS |
| `test-pr-d0989ba-e2e-dev02.txt` | 本分支完整 `node tests/e2e-dev02.js --shots` 原始輸出（`SHOTS_DIR` 指到暫存目錄，未覆蓋開發 session 的截圖）→ 58/58 PASS |
| `test-main-de91435-e2e.txt` | main 完整 `node tests/e2e.js` 原始輸出 → 376/376 PASS（main 無 `tests/e2e-dev02.js`，僅對照 e2e.js） |
| `verify-check11.js` | 本次自寫的重現腳本（Playwright，不改遊戲程式；從畫面點客棧「歇一夜」、日結、cflash 以 `DOMTokenList.add` 掛鉤＋`animationstart` 雙重計次、版面與重疊檢查） |
| `verify-out.txt` | 上述腳本輸出 |
| `01-sleep-0000-to-0800-log.png` | 第 3 日 00:00 在灰窯客棧點「歇一夜」→ 第 3 日 08:00 醒（8 小時，不是 32 小時），日誌 24 小時制 |
| `02-sleep-0810-to-2110-13h-log.png` | 第 3 日 08:10 點「歇一夜」→ 第 3 日 21:10 醒（13 小時上限） |
| `03-next-day-town.png` | 連續日結 6 天後的灰窯鎮畫面 |
| `04-day2-town-after-first-settlement.png` | 新局只過第 1 個日結後（第 2 日 08:00）的灰窯鎮；當時 `brief`：treasuryIn 23／Out 15／Net +8、T 207.96（畫面還沒有城況簡報，屬 DEV-05） |

所有截圖 1280×720、deviceScaleFactor 1；版面：`scrollWidth 1280`、`scrollHeight 720`、三欄 240／796／220。

## 自行重現結果（摘自 `verify-out.txt`）

- 00:00 就寢：第 3 日 00:00 → 第 3 日 08:00，8 小時。
- 08:10 就寢：第 3 日 08:10 → 第 3 日 21:10，13 小時。
- `wakeTime` 每 1 分鐘掃一整天：最短 6、最長 13 小時；20:00→12h、03:00→6h、00:00→8h、08:10→13h，與 SPEC-TIME E11 一致。
- 灰窯起手第 1 天（PNOISE 開著也一樣）：treasuryIn 23、treasuryOut 15、treasuryNet +8、T 207.96、tier ok；渡陰 55／40／+15、T 314.81。
- 兩鎮每天會變：第 3–8 日灰窯 P 50.1→50.09→51.08→49.97→49.97→50.97、T 215.46→255.81；渡陰 P 43.1–44.6、T 328.4→396.06。
- cflash 任意 1 秒滑動視窗：等演出播完 3、每 150ms 連按 3（實播 1）、每 200ms 2、每 300ms 2；皆 ≤ 3。
- 畫面無十二時辰字樣、時間皆 HH:MM。

## T7

13 小時上限的公式已實作並重現（見上）；**T7 模擬是否通過不由本驗證判定，待數值設計師在本分支重驗。**
