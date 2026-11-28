# CHANGELOG-1818：18:18 定稿輪異動清單

2026-11-28（台北時間 UTC+8）｜根目錄 `/workspace/shanhailu-batch1/`｜覆寫前備份在各包 `colour/_bak-1818/`（PNG 與 `src-docs/`），`_shared/consistency-1745.bak-1818.md`，`SPEC-03.bak-1818.md`。
標記：**改**＝內容有變｜**重繪同**＝重繪但像素與備份完全相同｜**新**＝新增。

## 共用
| 檔 | 變動 |
|---|---|
| `_shared/consistency-1745.md` | B 節切點表改 0.67–0.99／0.50–0.66、去【暫定】；文末加 18:18 更正註記與 C 節補充（險列有危險才出現） |
| `/workspace/shanhai-sandbox-gdd/proposals/specs/SPEC-03.md` | 修訂紀錄加一行；§2.1 第 5 條補「禁」＋hover；第 10 條改寫完整裁定＋DEV 備註；§16 Q-DROP-1 列同步。**本機，未提交** |

## UI-DROP（`UI-DROP/colour/`）
| 檔 | 變動 |
|---|---|
| `UI-DROP-01/02/03/04/06/07 *.png`（各全頁＋stage1280） | **改**：右欄低檔不畫險列、下方上移；01、04、06、07 圖例改字／換行 |
| `UI-DROP-05-edge-states*.png` | **重繪同** |
| `UI-DROP-08-danger-row*.png` | **新**：險列低／高並排＋過渡說明 |
| `html/uidrop/UI-DROP-01…08.html`、`html/common.css` | 重建 |
| `src/screens.py` | `right_ys()`、`draw_right()`；險列只在 risk≠低 才畫；圖 08；切點 0.67／0.50；去【暫定】；07 去「待定／是否保留」；04 Esc／右鍵標 DEV-DROP |
| `_tools/render.js` | 加圖例最後一行孤字檢查 |
| `_tools/check-danger-row.js`／`.json` | **新**：險列兩態 DOM 量測（fail＝[]） |
| `_tools/check-report.json` | 全套重跑（8／8 全 0） |
| `README.md` | 八張、險列規則、07 保留、Esc／右鍵＝DEV-DROP、已裁定／仍待確認 |
| `CHECK-1727.md`、`CHECK.md` | 切點行更正；加「18:18 定稿輪」 |

## UI-FX（`UI-FX/colour/`）
| 檔 | 變動 |
|---|---|
| `FX-01…06 *.png`（全頁＋stage1280） | **改**：右欄險列規則（低檔上移）；FX-04 另有圖例與浮字位置 |
| `FX-07-numbers*.png` | **改**：切點、險列文字、錨點座標 |
| `FX-08-settings*.png` | **重繪同** |
| `src/fxbase.py`、`s04.py`、`s07.py`、`fxlist.py` | 右欄預設低檔；`RISK_D=32`；採藥浮字下移 30；切點；X13 |
| `FX-LIST.md`／`.csv` | 切點改字；新增 X13（58 條：●29 ○12 △17）；去低檔留槽規則 |
| `html/FX-0n-*.html`、`_tools/check-report.json` | 重建；DOM 8／8 全 0 |
| `README.md`、`CHECK-1727.md` | 切點；18:18 說明；舊「保留空槽」劃掉；加「18:18 定稿輪」 |

## UI-01（`UI-01/colour/`）
| 檔 | 變動 |
|---|---|
| `SHL-UI01-01…04.png`（全頁） | **改**：圖例切點文字（僅一行） |
| `SHL-UI01-01…04-stage1280.png` | **重繪同** |
| `src/screens.py`、`html/shl/*.html`、`html/common.css` | 切點文字；重建 |
| `_tools/check-report.json` | 4／4 全 0 |
| `README.md`、`CHECK-1727.md` | 切點更正；加「18:18 定稿輪」 |

## UI-02（`UI-02/colour/`）
| 檔 | 變動 |
|---|---|
| `UI-02-05-map-move.png` | **改**：圖例備註切點文字 |
| `UI-02-05-map-move-stage1280.png` | **重繪同** |
| 其餘 10 張 | 未動（與備份像素相同） |
| `src/screens.py` | 圖例備註；`SPEED_TIERS` 邊界 0.8→0.67（HTML 逐位元不變） |
| `html/ui02/*.html`、`html/common.css` | 重建（內容不變） |
| `_tools/check-report.json`（05）、`check-report-1806.json`（備份） | 05 DOM 全 0 |
| `README.md`、`CHECK-1727.md` | 切點更正；加「18:18 定稿輪」 |

## 新增資料夾
`_final/`（本目錄）｜各包 `_bak-1818/`、`_tiles-1818/`（2× 切片 50 塊）｜`_tiles-1818-list.json`

## 未動
灰階各包頂層、`UI-02/wording-map-commission*.md`（LOC 擁有；檔案 18:23 有更新，非本輪動作）、game repo。
