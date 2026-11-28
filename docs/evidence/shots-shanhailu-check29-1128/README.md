# shanhailu-check29-1128：PR #29 合進 main 後的驗收

- 合併前分支 HEAD：706cccf55fc2d363ea14d5aefe089d748f80ea19；合進 main：e03947e8531b9b00d1cadcd5ed8d67757cdde5a1；合併 commit（最終 HEAD）：2ec6fb83edef87b6f2e906afd0cc0f4e9bb76fb5（無衝突）
- **判定：FAIL**。`tests/e2e.js:666` 與 `tests/e2e-dev01b.js:104` 讀的是 `docs/design/batch1/name-pool-v0.1.csv`，但 main 的 PR #26 已把它搬（R100）到 `docs/loc/name-pool-v0.1.csv`，兩套測試在合併後 ENOENT 中止。
  合併前的 706cccf 對照組：e2e 461/461、dev01b 81/81（log-control-706cccf-*.txt）。依指示只回報，不修。
- 其餘：dev02 109/109、dev04 92/92、dev05 103/103、dev03 5/5 次 38/38；token-check PASS（54 對變更行，51 個字串字面）；舊詞 rg 為 0；docs/ 只多了 PR 自己的 textsweep1 證據目錄。
- 截圖：用 e2e.js --shots 重拍 23 張（中止前），19 張與 textsweep1 完全相同；01、02、16 是路人走位不同，13 是傷害數字飄字時間不同（cmp-*.png 左舊右新）。字面一致。

| 檔案 | 內容 |
|---|---|
| log-*.txt | 各套測試完整輸出，第一行為 HEAD sha |
| token-check.js / log-token-check.txt | 字面／token 檢查腳本與結果 |
| log-rg-docs.txt | rg 舊詞與 docs/ diff |
| shot-compare.txt, cmp-*.png | 截圖比對 |
