# 《山海錄》docs 索引

> 這個資料夾放《山海錄》全部設計文件。最後整理：2026-11-28（台北時間 UTC+8），依 mumi 18:53 交辦。

## 規則

1. **repo 是最終版。** Cursor Pages（cursor.com/canvas 上的頁面）只是閱讀用的副本；兩邊不一致時，以這個 repo 為準。
2. 現行版本用固定檔名（例如 `world-blueprint-v0.3.md`）；舊版與作廢內容一律放 `archive/`，每份 .md 檔頭一行寫明被誰取代、何時。
3. 只有 mumi 的話算決定。狀態欄標「定案」的，檔內都能追到 mumi 的拍板時間；「提案」「待定」不得當成已決實作。
4. 金鑰、token 與任何 API key 一律不得進 repo、文件或對話。
5. 這裡只放文件；程式在 repo 其他目錄。

## 狀態說明

| 狀態 | 意思 |
|---|---|
| 定案 | mumi 已拍板，可以當依據 |
| 提案 | 建議稿，沒有全部拍板 |
| 待定 | 草案、待驗算或等 mumi 回答；不得當定稿實作 |
| 已作廢 | 被新版取代或決定撤回，只留歷史（在 `archive/`） |

## 目錄

```
docs/
├─ README.md            本索引
├─ design/              GDD、世界藍圖、地圖點位、活世界、NPC 生成化
│  ├─ gdd-v0.3-sections/    GDD v0.3 分冊
│  └─ img/                  GDD v0.3 參考圖
├─ specs/               規格（SPEC-01/02/03/TIME/ATB/GRAVE/NPC）與先交件
├─ proposals/           提案（盜墓、青樓、ATB、第 4 期地圖）
├─ loc/                 本地化產出（命名、用詞、對照表、名稱表）
├─ plan/                排期、拍板清單、製作人裁決、交辦單
├─ ui/batch1/           UIUX 第一批定稿規格與彩稿
├─ archive/             舊版與作廢內容
└─ evidence/            開發驗收證據（既有，不動）
```

## 檔案清單


### 設計（design/）

| 檔案 | 用途 | 狀態 |
|---|---|---|
| `design/GDD-v0.3.md` | 遊戲企劃書（GDD）現行版：世界觀、地圖、城鎮、戰鬥、成長等總綱 | 定案（現行） |
| `design/gdd-v0.3-sections/` | GDD v0.3 分冊（16 檔：00-changelog、01-overview…13-roadmap-open-questions、discrepancies、index），方便分章閱讀；內容以 GDD-v0.3.md 為準 | 定案（分冊，閱讀用） |
| `design/world-blueprint-v0.3.md` | 世界藍圖：世界長什麼樣、誰在哪、靠什麼活、有什麼規矩；含勢力表（含 18:45 青樓修訂：新增九尾樓與權貴靠山）、渡陰關聚落表、邪路、NPC 生成化 | 定案（定稿；2026-11-28 18:52 版，青樓 v0.3 內容已寫入） |
| `design/world-map-points-v0.1.md` | 世界地圖點位清單（給美術）；對照藍圖附錄 A 名稱總表 | 定案（現行） |
| `design/world-map-points-v0.1.csv` | 同上，CSV 版 | 定案（現行） |
| `design/living-world-v0.2.md` | 讓世界活起來：兩鎮循環、斷路幫、巡邏等 MVP 構想（MVP 已寫成 SPEC-01） | 提案（檔頭仍寫待拍板；已由 SPEC-01 落成規格） |
| `design/start-and-routes-v0.1.md` | 開局平民化與路線玩法現況評估（第 4 節 10 題 mumi 15:19 已照建議拍板） | 定案（10 題已決） |
| `design/npc-generated-identity-v0.2.md` | NPC 全面生成化的影響評估與建議（含玩家當首領、定時換人事件、規模與效能） | 提案（v0.1 十題已決；其餘見檔內） |
| `design/img/` | GDD v0.3 參考圖：icons-v03、maps-v03、plans-v03、portraits-v03（原在 docs/design/，內容未改） | 定案（參考圖） |

### 規格（specs/）

| 檔案 | 用途 | 狀態 |
|---|---|---|
| `specs/SPEC-01.md` | 活世界循環 MVP（兩鎮循環、斷路幫、資助巡邏）v0.5；含 18:19 剿匪單退出第一批的修訂（AC-E12） | 定案（v0.5，驗算結果見檔頭） |
| `specs/SPEC-02.md` | 善惡、通緝、死刑規格 v0.5 | 定案（v0.5） |
| `specs/SPEC-03.md` | 黑市與人路規格 v0.5；含 Q-DROP-1 丟棄／制式裝備裁定 | 定案（v0.5） |
| `specs/SPEC-TIME.md` | 時間骨幹規格 v0.5：時段、季節、天候、事件接口、斷糧／野外過夜等 | 定案（v0.5） |
| `specs/SPEC-ATB.md` | 戰鬥行動條（ATB）規格 v0.1.3 | 待定（草案；ATB 目前暫停，驗算未回） |
| `specs/SPEC-GRAVE.md` | 盜墓規格（第一批：窯外墳場亂墳＋無名古塚與盜洞入口）v0.1 | 待定（待驗算，數值為手算初值，不得當定稿實作） |
| `specs/SPEC-NPC.md` | 人事與生成規格（資料層）v0.1 | 待定（第一輪已驗；N2／N3 待驗算） |
| `specs/CHANGELOG.md` | 第一批規格變更紀錄（SPEC-TIME／01／02／03，v0.2 → v0.4） | 定案（紀錄；v0.5 起的變動看各 SPEC 檔內修訂紀錄） |
| `specs/handoff/ATB-loc-handoff.md` | ATB 先交件：給本地化的回合語意對照表與名詞定義 | 待定（隨 SPEC-ATB 暫停） |
| `specs/handoff/ATB-uiux-handoff.md` | ATB 先交件：給 UIUX 的跑道、意圖小標、狀態記號 | 待定（隨 SPEC-ATB 暫停） |

### 提案（proposals/）

| 檔案 | 用途 | 狀態 |
|---|---|---|
| `proposals/grave-robbing-v0.1.md` | 盜墓玩法建議；第 11 節 11 題 mumi 16:10 已全照 ★ 拍板；不派工 | 定案（11 題已決，未派工） |
| `proposals/brothel-business-v0.3.md` | 青樓相關事業提案：九尾樓、權貴撐腰、期別、成人限制與淡出；只文件，未派 UI／美術／開發 | 定案（mumi 18:45 A–F 六題；只寫文件） |
| `proposals/combat-atb-v0.1.md` | 戰鬥改版提案：行動條（ATB） | 提案（題目已拍板；ATB 暫停） |
| `proposals/phase4-map/` | 第 4 期新世界地圖規格彙整（README、SPEC-MAP、SPEC-DYN、ART-DEPS、TECH、OPEN-QUESTIONS）；SPEC-DYN 含 18:19「第一批不做剿匪單」一行 | 待定（未定稿；16 題等 mumi 回覆） |

### 本地化（loc/）

| 檔案 | 用途 | 狀態 |
|---|---|---|
| `loc/loc-npc-naming-v0.2.md` | NPC 生成命名規則（姓 188、名 727、綽號 85、職位 90 列、禁字 321 列） | 待定（草案；8 題等 mumi，不交開發） |
| `loc/loc-npc-naming-v0.2-*.csv` | 上列的 6 份資料表：surnames、given-names、titles、job-titles、banned、start-pool | 待定（同上） |
| `loc/loc-grave-v0.2.md` | 盜墓用詞（130 條字串＋名詞表 24 列）；統一用「盜墓」、「掘墓」禁用 | 待定（草案；不交開發） |
| `loc/loc-grave-v0.2.csv` | 同上，CSV 版 | 待定（草案） |
| `loc/loc-drop-v0.2.md` | 地面／丟棄字串（42 條，對照 UI-DROP 彩稿）；制式裝備／委託物 hover 字面已定 | 定案（定版 18:20；待 DEV-DROP 才交開發） |
| `loc/loc-drop-v0.2.csv` | 同上，CSV 版 | 定案 |
| `loc/loc-atb-v0.1.md` | 戰鬥行動條用詞 | 待定（草案；隨 ATB 暫停） |
| `loc/loc-batch1-pending-v0.1.md` | 第一批待決用詞（16:31 交辦） | 待定（檔頭未標結案；請以 dev-string-replace 與 batch1-decisions 為準） |
| `loc/names-final-v0.1.csv` | 世界名稱最終表（地名、勢力名等） | 定案 |
| `loc/names-confirm-v0.1.md` | 名稱確認 LOC-01（含 15:19 決定） | 定案 |
| `loc/names-review-v0.1.md` | 世界名稱潤飾審查，14 題全照第一建議 | 定案 |
| `loc/name-pool-v0.1.md` | 開局姓名池與 NPC 取名庫（15:19 mumi 決定） | 定案 |
| `loc/name-pool-v0.1.csv` | 同上，CSV 版 | 定案 |
| `loc/naming-banned-chars-final-v1.0.md` | 取名禁字規則（17:52 mumi 拍板，Q1–Q6 照建議）；開發實作用這份 | 定案 |
| `loc/dev-string-replace-batch1-v0.1.md` | 開發字串替換對照表 batch1（給開發工程師） | 定案（對照表） |
| `loc/dev-string-replace-batch1-v0.1.csv` | 同上，CSV 版 | 定案 |
| `loc/dev05-strings-v0.1.md` | DEV-05 字串（歇息列等） | 定案 |
| `loc/city-status-copy-v0.1.md` | 城況短語（UI-02／X-h）；駐軍第 3 檔改名「守備」 | 待定（文案草稿，待製作人過目） |
| `loc/city-status-copy-v0.1.csv` | 同上，CSV 版 | 待定（文案草稿） |
| `loc/wording-map-commission.md` | 地圖／委託字面對照；18:23 已定名「出城路險」 | 定案 |

### 排期與決策（plan/）

| 檔案 | 用途 | 狀態 |
|---|---|---|
| `plan/rollout-plan-v0.1.md` | 怎麼放進遊戲：工作包拆分與期別（第 4 期四設施、第 5 期贊助宴客、第 6 期經營賣人等） | 現行排期（檔頭仍寫「提案」；期別已依 mumi 重排） |
| `plan/batch1-decisions-v0.1.md` | 第一批合併拍板清單（61 題＋後續各輪；mumi 14:06、16:10、17:27、18:xx 各輪決定） | 定案 |
| `plan/decisions-producer-1128-1646.md` | 遊戲製作人裁決 16:46（7 項） | 定案（記錄） |
| `plan/decisions-producer-1128-1726.md` | 遊戲製作人裁決 17:04／17:26 | 定案（記錄） |
| `plan/decisions-producer-1128-1727.md` | 遊戲製作人裁決 17:30（mumi 17:27 六項） | 定案（記錄） |
| `plan/polish-list.md` | 打磨清單底稿；正式位置是 GitHub issue #23 | 待定（底稿） |
| `plan/handoff-batch1/` | 第一批交辦單（ART-01/02、LOC-01、SPEC-01/02/03/TIME、UI-01/02/FX） | 已結案（歷史交辦，僅供查） |

### UIUX 第一批（ui/batch1/）

| 檔案 | 用途 | 狀態 |
|---|---|---|
| `ui/batch1/INDEX.md` | UIUX 第一批上色定稿總索引（四包、這輪重繪、待辦） | 定案（mumi 18:18 OK） |
| `ui/batch1/CHANGELOG-1818.md` | 18:18 定稿輪異動清單 | 定案（記錄） |
| `ui/batch1/SPEC-UI-01.md` | UI-01 開局取名／外貌／墓誌銘 定稿規格 | 定案 |
| `ui/batch1/SPEC-UI-02.md` | UI-02 城況簡報／地圖移動／委託單 定稿規格 | 定案 |
| `ui/batch1/SPEC-UI-DROP.md` | UI-DROP 丟棄、行囊、制式裝備與委託物 定稿規格 | 定案 |
| `ui/batch1/SPEC-UI-FX.md` | UI-FX 時間／過夜／趕路／採集／交易／委託／數字／設定 定稿規格 | 定案 |
| `ui/batch1/consistency-1745.md` | 跨包一致化標準（含 18:18 更正：險列有危險才出現） | 定案 |
| `ui/batch1/colour-fix-1727.md` | 17:27 彩色稿修正要求（歷史） | 已結案（歷史） |
| `ui/batch1/UI-01/、UI-02/、UI-FX/、UI-DROP/` | 定稿彩稿 PNG（每張兩份：含圖例的審稿版與 -stage1280 純舞台版）、各包 README、CHECK-1727 檢查表、FX-LIST；UI-DROP 另有灰階 README 與欄位規則衝突紀錄 | 定案（mumi 18:18 OK） |
| `ui/batch1/UI-ATB-draft/` | 行動條跑道與指令列灰階草稿（README、CHECK-ATB、11 張 -stage1280） | 待定（暫定草稿；ATB 暫停） |

### 封存與既有（archive/、evidence/）

| 檔案 | 用途 | 狀態 |
|---|---|---|
| `archive/` | 已作廢或被取代的舊版；每份 .md 檔頭一行寫明被誰取代，清單見 archive/README.md | 已作廢 |
| `evidence/` | 開發驗收證據（截圖、e2e 輸出）；本次整理不動 | 定案（既有，維持原位） |

## 未收進來的東西

- 各 bot 的 `.bak`、`.parked`、暫存稿與 PNG 以外的產圖工具（`build.py`、`render.js`、`html/` 等）：不進 repo。舊的灰階稿與產圖工具已在 repo，移到 `archive/ui-batch1-grey-and-tools/`。
- dpoe 專案的名詞表與其他專案文件：不屬於《山海錄》。
- 青樓內容的硬性寫法：只淡出、不寫露骨內容、年齡下限 18 歲、被賣進來的人不能成為消費對象；細節看 `proposals/brothel-business-v0.3.md`。
