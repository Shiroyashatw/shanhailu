# shanhailu-check14-1128 — PR #14（DEV-03 路人與巡邏走動）獨立驗收證據

驗收 HEAD：`32cbfb5405d7e46a594186399b0d947d98a52017`（程式同 05e1cb4；base main 8a634d6）。每份 log 第一行為 `git rev-parse HEAD`。
環境：雲端容器 Linux、headless Chromium（Playwright）、4 核；**未在真機測試**。

| 檔 | 內容 |
| --- | --- |
| e2e.log / e2e-dev02.log / e2e-dev01b.log / e2e-dev03.log | 四套完整輸出：461/461、109/109、81/81、**36/37（1 FAIL）** |
| e2e-dev03-repeat10.log | e2e-dev03 原樣重跑 10 次：**4/10 失敗**，皆為「[走動] 灰窯 7 個走動者 800ms 內全部移動」moved 6/7 |
| check14.js / check14.log | 驗收自寫腳本與輸出（期望值依 SPEC-01 §6 推導）：20/21 PASS；唯一 FAIL 是本腳本自加的 CPU×4 降速組「無 >50ms 長幀」嚴格條件（walk=1 某輪 1 幀 50.1ms；walk=0 對照組也出現 50.0／50.1ms 幀，fps 兩組同為 59.9），不視為 AC-J6 不符 |
| c14-01-huiyao-high-P80-G1.png | 灰窯 P=80、Geff=1：3＋1＋6＝10 |
| c14-02-huiyao-low-P20-G1.png | 灰窯 P=20、Geff=1：3＋1＋2＝6 |
| c14-03-duyin-G3-P80.png | 渡陰 P=80、Geff=3：1＋3＋6＝10 |
| c14-04-duyin-G3-P20.png | 渡陰 P=20、Geff=3：1＋3＋2＝6 |

e2e-dev03 失敗原因（以加印座標的副本重現）：第 3 位走動者（路線 2「西巷」、速度 23、相位 0.930）在測試取樣時剛好走到折線端點折返，800ms 前後 x、y 取整後相同（例：[487,219]→[487,219]）。走動者實際有在走（其他時間點皆移動），屬測試取樣設計（單一 800ms 兩點比較＋固定相位、固定載入時序）造成的不穩定，但交付的測試套件不能穩定全過。
