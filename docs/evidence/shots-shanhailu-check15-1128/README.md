27012054412e8537bbea3ebf81eacfeee30f3808
# shanhailu-check15-1128：PR #15（DEV-05）合 main 後獨立驗收

- 合進的 main：cbef823b80caa65a3b3f3434d052f4901ae37c3a（PR #14 DEV-03）
- 合併前分支 HEAD：eceade15ed95c2d03acdc7507c565abe46fb7c2e
- 合併後程式 HEAD（所有測試與截圖在此跑）：27012054412e8537bbea3ebf81eacfeee30f3808

## 測試（log 第一行為 git rev-parse HEAD）
| 套件 | 結果 |
|---|---|
| e2e.js | 461/461 PASS（e2e.log） |
| e2e-dev02.js | 109/109 PASS |
| e2e-dev01b.js | 81/81 PASS |
| e2e-dev03.js | 5/5 次全過，每次 38/38（run1–5）；另 --shots 一次 38/38 |
| e2e-dev05.js | 5/5 次全過，每次 97/97（run1–5）；另 --shots 一次 97/97 |

## 截圖（1280×720，deviceScaleFactor 2；由 SHOTS_DIR=本目錄 跑 --shots 產生）
- dev05-01-collapsed.png／dev05-02-expanded.png：城況簡報收合／展開
- fix1-04-brief-danger-night.png：夜間出城路險（極高）；fix1-03：清晨「高」
- fix1-05-map-extreme.png：地圖 travelPreview 22:00 危險「!! 極高」（#5a1f1a 底、#c8463a 邊）
- dev05-06-commission.png：委託板每張單的 questTier（◇低／△中／!高）
- dev03-01～06：灰窯／渡陰街上路人與巡邏走動，底部同時有 DEV-05 城況列（並存證明）
- fix1-06-inn-sleep-2000.png：客棧「睡到 {wake}」
