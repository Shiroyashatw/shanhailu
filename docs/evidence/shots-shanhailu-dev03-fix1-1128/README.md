# DEV-03 fix1 — 合併 DEV-02（main 8a634d6）與 docs（6b6cbde）後重測

測試 HEAD：`05e1cb48b4163755834fb72c9f98c83a55b7e6c6`（每份 log 第一行）。本資料夾在其後一個 commit 加入，只放證據、不改程式。

| 檔 | 內容 |
| --- | --- |
| e2e.log / e2e-dev02.log / e2e-dev01b.log / e2e-dev03.log | 四套完整輸出（461 / 109 / 81 / 37 全 PASS） |
| dev03-01-huiyao-high-P80.png | 灰窯 P=80、Geff=1：有職位者 3＋巡邏 1＋匿名路人 6＝10 |
| dev03-02-huiyao-low-P20.png | 灰窯 P=20、Geff=1：3＋1＋2＝6 |
| dev03-03／04-huiyao-patrol-a／b-1500ms.png | 灰窯 P=50、Geff=2：相隔 1.5 秒，巡邏與路人位置已移動 |
| dev03-05-duyin-high-P80-G3.png | 渡陰 P=80、Geff=3：1＋3＋6＝10 |
| dev03-06-duyin-low-P20-G3.png | 渡陰 P=20、Geff=3：1＋3＋2＝6 |
| dev03-07-wild-head-risk-chakou.png | 出鎮到野徑岔口：DEV-02 標頭「險 低」四檔色正常、無走動者 |

右欄名字（DEV-01b）每張都顯示「沈衡」。城鎮街景本來就沒有險級標頭（DEV-02 的 head-risk 只在荒野／地城），故另截 07 驗證。
