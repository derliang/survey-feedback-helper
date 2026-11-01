# 測試總覽與覆蓋範圍

> 2026-11-01 整理。指令與 CI 流程見 [CLAUDE.md](../CLAUDE.md)〈測試與建置指令〉；`npm run ci` 依序跑全部。

## 自動化測試一覽

| 層 | 位置 | 涵蓋 |
|---|---|---|
| 統計核心（純函式，不碰瀏覽器 API） | `src/core/*.test.ts` | 平均與去極端值（mean）、量表（scale）、選擇題與評分（survey）、報告回饋彙整與權重（feedback）、票選與同票抽籤（vote）、資料檢查（check）、名單比對（roster）、欄位標題辨識（headers）、去識別化（anonymize）、名單外人名偵測（possible-names）、表格與 csv／xlsx 讀取（table、xlsx）、進階統計（advanced）、趨勢（trend）、選課志願分配（course）、樣本資料集（sample-dataset）、**效能壓力（perf）** |
| 接線與流程 | `src/app/*.test.ts` | 開檔與編碼（app）、統計接線與審稿（stats）、常用評語（phrases）、輸出模型（render）、設定與英文骨架（polish）、**樣本對照精靈（sample-wizard：填寫者／被評對象雙欄、個人回饋單平均列）**、**Google 表單虛構樣本（form-samples：核取方塊、格狀題、線性量表、票選）** |
| 輸出 | `src/export/*.test.ts` | Excel／Word／PDF 內容與版面、批次輸出、視覺回歸 |
| 編輯器 | `src/editor/editor.test.ts` | 範本編輯、版面計算 |
| 儲存與 Google | `src/storage/*.test.ts`、`src/google/google.test.ts` | 設定檔存取、備份還原、Google 連線邏輯（不連真的 Google） |
| 介面字串 | `src/ui/strings.en.test.ts` | 英文介面覆蓋率（繁中有的鍵英文都有，除了待核對的段落） |
| 發布 | `scripts/release-meta.test.mjs` | 版本資訊 |
| 端對端（Playwright，桌機／平板／手機觸控） | `tests/e2e/*.spec.ts` | 開檔到輸出的主流程（app、smoke）、統計畫面（stats）、輸出（export）、編輯器（editor）、介面細節（polish）、設定備份（settings-backup） |
| 靜態檢查 | `npm run typecheck`、`lint`、`check:privacy`、`check:licenses`、`check:google-scopes`、`check:budget` | 型別、程式風格與核心不碰瀏覽器 API、不含學生資料、授權與費用、Google 權限範圍、首頁大小 |

測試資料一律虛構；xlsx 在測試時才用 `tests/e2e/fixtures.ts` 的 `makeXlsx` 產生，repo 內不放任何 xlsx／csv。

## 已知尚未涵蓋

- 真機測試（iOS Safari、Android Chrome）：見 [real-device-checklist.md](real-device-checklist.md)，需要人拿真的裝置。
- Google 表單的**真實匯出檔**：`form-samples.test.ts` 的欄位標題是依描述自編的近似（例如格狀題的「題目 [列名]」寫法），尚未對照真實匯出，待核對。
- 英文介面：`google`（登入面板）、`guide`（Google 表單教學）、`tpl`（快速範本題目）三段仍是繁體中文，要先對照真實 Google 英文介面才能翻（硬規則 10）。
- 首屏 2 秒在 Slow 4G 第一次造訪略超過，見 [performance.md](performance.md)。
