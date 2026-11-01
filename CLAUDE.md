# 問卷回饋小幫手 專案規範

- 專案說明見 [README.md](README.md)；功能藍圖見 [docs/feature-blueprint.md](docs/feature-blueprint.md)；待辦見 [todo.md](todo.md)；決定見 `docs/decisions/`（技術與發布規則以 [技術選型與發布規則](docs/decisions/2026-10-30-技術選型與發布規則.md) 為準）。
- Repo：`derliang/survey-feedback-helper`（公開）。授權 GPL-3.0。

## 硬規則（使用者要求，不得違反）

1. **純網頁、免安裝、無後端**；手機、平板、桌機各自設計版面與操作（mobile-first）。
2. **發布 = 本機執行 `npm run release -- --yes`**（2026-11-01 起；不用 GitHub Actions，避免收費）：合併到 `main` **不會**上線，`main` 只是原始碼。PR 階段必須在本機跑完 `npm run ci` 並附證據。**使用者 2026-11-01 常態授權：不必等全部功能完成，調度員可隨時發布**（`main` 已含審過的 PR、`npm run ci` 全綠、HEAD = `origin/main` 時，每合併一批有意義的進展就發布一次，讓使用者能隨時在線上測試）；發布後確認 `gh-pages` 的 SHA 與正式站網址並回報。發布會同時在 `gh-pages` 放 `version.json`（版號取自 `package.json`、台北日期、來源 SHA），並建立 tag `v<版號>` 與 GitHub Release；**每次發布前先升 `package.json` 版號並整理 CHANGELOG 區段**，見[發布版本資訊](docs/decisions/2026-11-01-發布版本資訊.md)。見[Pages 改本機發布](docs/decisions/2026-11-01-Pages改本機發布.md)。
3. **全專案零費用**：Google API、字型、CDN、套件、部署都不得產生費用。引入任何套件、字型、服務前先核對授權（須與 GPL-3.0 相容）與費用，並登錄 [docs/third-party.md](docs/third-party.md)。
4. **Google Cloud 專案絕不綁定帳單帳戶**，不啟用需要帳單的服務；Google 權限只用 `drive.file`；API 金鑰限 Pages 網址、只開 Drive、Picker 與 Google Sheets API（2026-11-01 使用者裁示改為直讀 Google 試算表，見[審稿意見裁示](docs/decisions/2026-11-01-審稿意見裁示.md)）。
5. **不把學生資料放進 repo**（repo 公開）：絕不把學生資料（問卷結果、名單、輸出檔）commit 進 repo；`.gitignore` 已擋 xlsx／csv／docx／pdf。示範資料只用虛構資料。不蒐集任何使用數據（連匿名統計也不要）。
6. **資料存電腦實體資料夾，不靠瀏覽器儲存**（使用者 2026-11-01 邊界條件，取代先前「名單與審稿進度存瀏覽器」的放寬）：問卷作答資料與輸出檔不寫入 localStorage／IndexedDB；設定檔、學生名單、審稿進度存在使用者選定的電腦資料夾（File System Access API，桌機 Chrome／Edge）。瀏覽器只存資料夾存取代號與介面偏好，代號被清掉時請使用者重選一次資料夾；Safari、Firefox、手機平板退回手動下載與選檔。資料與電腦都是老師自己的，隱私文案從簡，不設「管理名單／一鍵刪除」專用入口。見[邊界條件裁示](docs/decisions/2026-11-01-邊界條件.md)。
7. **統計計算必須有自動化測試**；統計核心是不依賴瀏覽器的純函式模組。
8. 瀏覽器支援近兩年的 Chrome、Edge、Safari、Firefox 與 iOS 16.4 以上（資料夾自動存取僅桌機 Chrome／Edge，其餘退回手動）；介面先繁體中文，文字集中抽出，英文 v1.0 補。
9. **載入速度是功能**：首頁程式 gzip 後 150 KB 內、中階手機首屏 2 秒內，CI 超標擋 PR；xlsx、docx、PDF 輸出與字型一律延遲載入並快取。
10. **操作說明與功能用字必須與實際介面完全一致**：Google 表單、Google 試算表、Excel 的選單與按鈕名稱，一律實際走過介面後照抄，並註明核對日期；不憑記憶寫。
11. **所有設計稿都由設計員設計**（`/設計員` 技能）：Claude 不自行畫設計稿，小改依設計規範直接修。

## 技術

TypeScript + Vite + Preact + Vitest + Playwright；ExcelJS、docx、fflate；PDF 程式直接產生（字型子集化）；圖表自製 SVG；本機腳本發布到 GitHub Pages（`gh-pages` 分支，Pages 設為「從分支部署」）。細節與原因見決定記錄。

## 測試與建置指令

需要 Node 24、npm 11。第一次在新電腦：`npm ci`，再 `npx playwright install chromium`（免費下載）。

| 目的 | 指令 |
|---|---|
| 開發伺服器 | `npm run dev` |
| 型別檢查 | `npm run typecheck` |
| Lint | `npm run lint` |
| 單元測試（統計核心在 `src/core/`，純函式、不碰瀏覽器 API，lint 會擋） | `npm test` |
| 建置（輸出 `dist/`，base 為 `/survey-feedback-helper/`） | `npm run build` |
| 效能預算（首頁 gzip 150 KB，需先建置） | `npm run check:budget` |
| 端對端（桌機、平板、手機觸控；需先建置，自動以 `scripts/serve-dist.mjs` 提供 `dist/`） | `npm run test:e2e` |
| 隱私掃描／授權與費用／Google 權限 | `npm run check:privacy`、`npm run check:licenses`、`npm run check:google-scopes` |
| 以上全部依序跑（型別、lint、單元、隱私、授權、Google 權限、建置、效能預算、e2e；取代原 PR 關卡 CI） | `npm run ci` |
| 發布 dry-run（先跑 `npm run ci`，再印出將發布到 `gh-pages` 的內容，不動遠端） | `npm run release` |
| 正式發布（只有使用者說「發布」後才加 `--yes`；要求工作樹乾淨且 HEAD = `origin/main`） | `npm run release -- --yes` |

沒有 GitHub Actions：PR 關卡就是在本機跑 `npm run ci`，結果貼在 PR 的測試證據；發布用 `scripts/release.mjs`。細節見[決定記錄〈PR 與發布關卡〉](docs/decisions/2026-10-30-技術選型與發布規則.md)與[Pages 改本機發布](docs/decisions/2026-11-01-Pages改本機發布.md)。引入新套件須先登錄 `docs/third-party.md`，`check:licenses` 會擋未登錄的直接相依。

## 工作流程

- **程式修改**在分支施工、開 PR；`main` 啟用分支保護後，程式類變更只能經 PR 合併（分支保護不能以 CI 作為必要檢查，因為沒有 CI）。
- 本機 `npm run ci` 全綠 → PR 附測試證據 → 調度員審核後合併 → 有意義的進展隨時（使用者已常態授權，或使用者說「發布」）在 `main` 上 `npm run release -- --yes` → 回報 `gh-pages` SHA 與正式站網址。
- **純文件類可直接 push 到 `main`**（使用者 2026-10-30 決定）：文件不是正式程式，直接進 `main` 是為了讓後續對話一 pull 就拿到最新資訊。範圍僅限 `*.md`、`docs/`、`.github/` 的範本與 `LICENSE`；只要同一次變更碰到程式、`.github/workflows/`、設定或建置檔，就走 PR。純文件變更不需要發布；`main` 不會自動上線，所以直接 push 文件不影響正式站。
- 版本記錄：每次發布更新 `CHANGELOG.md` 並建立 GitHub Release；完成待辦要同步更新 `todo.md`。
- 介面與輸出文件的設計走設計員流程，設計系統記錄於 `docs/design/`。
- Commit 署名依全域規範（`Claude-<裝置簡稱>`）。

## 設計規範（改頁面前必讀）

- 本專案的設計規範在 [docs/design/DESIGN.md](docs/design/DESIGN.md)，tokens 唯一來源是 [docs/design/tokens.css](docs/design/tokens.css)，定案的模擬頁在 `docs/design/mockups/`。一切頁面、版面、元件、樣式的工作以它們為準。
- 新增、改版、調整任何頁面前，先讀它。沿用其中的 tokens 與元件規則，不寫死色碼與間距。
- 新頁面或大改版使用 `設計員` 技能（輸入 `/設計員`）：先在對話中出設計稿給使用者確認，定案後把規範與模擬頁更新回 `docs/design/`，和程式放在同一個 PR。
- 要偏離規範，先更新 DESIGN.md 並取得使用者確認，不要只改程式。
