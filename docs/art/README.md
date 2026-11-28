# 《山海錄》美術成品（準備進 repo）

整理完成：2026-11-29 00:03（台北時間 Asia/Taipei）  
來源：共用電腦 `/workspace/shanhailu-art`（不是 git repo）  
擬放入：`Shiroyashatw/shanhailu` 的 `docs/art/`  
mumi 同意時間：2026-11-28 23:56（台北時間）

主分支目前沒有 `docs/art/`。現有 `docs/` 底下是 `design`（GDD、舊總覽 `docs/design/img/maps-v03.png`、`world-map-points-v0.1.csv`）、`specs`、`ui`、`evidence` 等。美術成品單獨放 `docs/art/`，不和 GDD 或驗收截圖混在一起。本包相對路徑與規格書一致。

**重要：最終成品圖所在的 `out/` 資料夾，在來源裡已經不在。** 大陸總圖、Z1／Z2 各頁地形／疊層／遊戲內樣貌／標註，以及 ART-02 七張平面圖草稿（含石骨鏡像）與熱區 json，都還不能進 repo。詳見暫存根目錄的 `EXCLUDED.md`。

## 目錄

### [`world-map-v1/`](world-map-v1/)

世界地圖 v1（GAD-12，已定稿）。

- 規格：[`WORLD-MAP-SPEC.md`](world-map-v1/WORLD-MAP-SPEC.md)、[`SLOTS-README.md`](world-map-v1/SLOTS-README.md)、[`CHANGELOG.md`](world-map-v1/CHANGELOG.md)
- 量測：[`measure.json`](world-map-v1/measure.json)、[`z1/measure_z1.json`](world-map-v1/z1/measure_z1.json)、[`z2/measure_z2.json`](world-map-v1/z2/measure_z2.json)
- 點位與鎖定資料：[`data/`](world-map-v1/data/)（含 [`points_v1.csv`](world-map-v1/data/points_v1.csv)／[`.json`](world-map-v1/data/points_v1.json)、與清單一致的 [`world-map-points-v0.1.csv`](world-map-v1/data/world-map-points-v0.1.csv)、[`z2_dynamic_slots_locked.json`](world-map-v1/data/z2_dynamic_slots_locked.json)／[`z2_dynamic_slots_final.csv`](world-map-v1/data/z2_dynamic_slots_final.csv)、別名、擁擠度、道路／河流、季節介面、地形分類等）
- 現有總覽／預覽（`out/` 缺失時的替代檢視，非正式地形檔）：
  - [`z1/z1_contact_sheet_mock.png`](world-map-v1/z1/z1_contact_sheet_mock.png)
  - [`z1/preview/`](world-map-v1/z1/preview/)
  - [`z2/preview/`](world-map-v1/z2/preview/)（A–D contact sheet 與較早的 preview 接觸表）

主分支既有的 `docs/design/world-map-points-v0.1.csv` 應與本包 [`world-map-v1/data/world-map-points-v0.1.csv`](world-map-v1/data/world-map-points-v0.1.csv) 對過（16:01 同步後與 GDD 清單 0 差異）；進 repo 時請工程師決定要不要一併更新 design 那份。

### [`towns-v1/`](towns-v1/)

聚落平面圖 ART-02（GAD-13）。**灰模草稿，尚未經 mumi 核可，未上色。**

- 規格：[`ART-02-SPEC.md`](towns-v1/ART-02-SPEC.md)、[`CHANGELOG.md`](towns-v1/CHANGELOG.md)
- 量測：[`measure.json`](towns-v1/measure.json)（七張草稿自檢當時全過）
- [`ref/`](towns-v1/ref/)：現行遊戲畫面轉出，只作前後對照，不是新草稿
- 應在 `out/` 的七張草稿（灰窯、驛站、渡陰關主圖／後巷、破曉營、撿骨師營地〔已水平鏡像，西緣朝向裂口〕、鴉巢）與熱區資料：**來源中缺失，未放入**

## 未放入的東西

備份、`world-map-v0.1`、生成工具（`src/`、`tools/`、`run_all.sh`）、生圖／引導中間檔（`gen/`、`guide/`）都不放。完整說明與缺失清單見暫存根目錄 `EXCLUDED.md`。
