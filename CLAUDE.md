# 問卷回饋小幫手 專案規範

- 專案說明見 [README.md](README.md)；功能藍圖見 [docs/feature-blueprint.md](docs/feature-blueprint.md)；待辦見 [todo.md](todo.md)；決定見 `docs/decisions/`（技術與發布規則以 [技術選型與發布規則](docs/decisions/2026-10-30-技術選型與發布規則.md) 為準）。
- Repo：`derliang/survey-feedback-helper`（公開）。授權 GPL-3.0。

## 硬規則（使用者要求，不得違反）

1. **純網頁、免安裝、無後端**；手機、平板、桌機各自設計版面與操作（mobile-first）。
2. **main 即上線**：push／merge 到 `main` 就等於發布到 GitHub Pages 正式站。PR 階段必須測試完全通過，且使用者明確說「發布」才合併；合併前確認授權，合併後確認部署成功並回報正式站網址與 SHA。
3. **全專案零費用**：Google API、字型、CDN、套件、部署都不得產生費用。引入任何套件、字型、服務前先核對授權（須與 GPL-3.0 相容）與費用，並登錄 [docs/third-party.md](docs/third-party.md)。
4. **Google Cloud 專案絕不綁定帳單帳戶**，不啟用需要帳單的服務；Google 權限只用 `drive.file`；API 金鑰限 Pages 網址、只開 Drive 與 Picker。
5. **隱私**：絕不把學生資料（問卷結果、名單、輸出檔）commit 進 repo；`.gitignore` 已擋 xlsx／csv／docx／pdf。示範資料只用虛構資料。不蒐集任何使用數據（連匿名統計也不要）。
6. **資料不落地**：原始問卷資料只放記憶體，不寫入 localStorage／IndexedDB；只儲存設定、範本與檔案存取代號（不含資料內容）。
7. **統計計算必須有自動化測試**；統計核心是不依賴瀏覽器的純函式模組。
8. 瀏覽器支援近兩年的 Chrome、Edge、Safari、Firefox 與 iOS 16.4 以上；介面先繁體中文，文字集中抽出，英文 v1.0 補。

## 技術

TypeScript + Vite + Preact + Vitest + Playwright；ExcelJS、docx、fflate；PDF 程式直接產生（字型子集化）；圖表自製 SVG；GitHub Actions 部署 GitHub Pages。細節與原因見決定記錄。

## 測試與建置指令

尚未建立（專案骨架建立時補）。PR 關卡見決定記錄〈PR 與發布關卡〉。

## 工作流程

- **程式修改**在分支施工、開 PR；`main` 啟用分支保護後，程式類變更只能經 PR 合併。
- PR 全綠 → 回報測試證據 → 使用者說「發布」→ 合併。
- **純文件類可直接 push 到 `main`**（使用者 2026-10-30 決定）：文件不是正式程式，直接進 `main` 是為了讓後續對話一 pull 就拿到最新資訊。範圍僅限 `*.md`、`docs/`、`.github/` 的範本與 `LICENSE`；只要同一次變更碰到程式、`.github/workflows/`、設定或建置檔，就走 PR。部署流程建好後，須設定成純文件變更不觸發重新部署，並讓分支保護對純文件變更放行。
- 版本記錄：每次發布更新 `CHANGELOG.md` 並建立 GitHub Release；完成待辦要同步更新 `todo.md`。
- 介面與輸出文件的設計走設計員流程，設計系統完成後記錄於 `docs/design-system/`。
- Commit 署名依全域規範（`Claude-<裝置簡稱>`）。

## 設計規範（改頁面前必讀）

- 本專案的設計規範在 [docs/design/DESIGN.md](docs/design/DESIGN.md)，tokens 唯一來源是 [docs/design/tokens.css](docs/design/tokens.css)，定案的模擬頁在 `docs/design/mockups/`。一切頁面、版面、元件、樣式的工作以它們為準。
- 新增、改版、調整任何頁面前，先讀它。沿用其中的 tokens 與元件規則，不寫死色碼與間距。
- 新頁面或大改版使用 `設計員` 技能（輸入 `/設計員`）：先在對話中出設計稿給使用者確認，定案後把規範與模擬頁更新回 `docs/design/`，和程式放在同一個 PR。
- 要偏離規範，先更新 DESIGN.md 並取得使用者確認，不要只改程式。
