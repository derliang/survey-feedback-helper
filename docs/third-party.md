# 第三方套件登錄

> 專案原則：授權須與 GPL-3.0 相容，且**不得產生任何費用**。引入任何套件、字型、CDN、服務前先核對並在此登錄，PR 關卡會檢查。
> 「用途」欄：**正式候選**＝預計進正式版；**原型／測試**＝只用在 `prototypes/` 或測試，不隨網站發布。
> 核對方式：讀各套件 `package.json` 的 `license` 欄位（含間接相依，共約 28 個，全為寬鬆授權）。2026-11-01 骨架套件由 `npm run check:licenses` 逐一檢查所有已安裝套件（含間接相依）的授權；與 GPL-3.0 相容性依 FSF 的相容清單（MIT、BSD-3-Clause、0BSD、Zlib、Apache-2.0 皆可併入 GPL-3.0）。

| 套件／資源 | 版本 | 用途 | 授權 | 與 GPL-3.0 相容 | 費用 | 核對日期 |
|---|---|---|---|---|---|---|
| pdf-lib | 1.17.1 | 正式：程式直接產生 PDF（`src/export/pdf.ts`，延遲載入）（**不可用其內建 `subset:true`**，會漏字） | MIT | 是 | 免費 | 2026-10-30 |
| @pdf-lib/fontkit | 1.1.1 | 正式：pdf-lib 內嵌自訂字型 | MIT | 是 | 免費 | 2026-10-30 |
| docx | 9.15.0 | 正式：產生 Word（docx）（`src/export/docx.ts`，延遲載入） | MIT | 是 | 免費 | 2026-10-30 |
| subset-font | 2.9.0 | 正式候選：HarfBuzz 字型子集化（主程式需包裝才能在瀏覽器用） | BSD-3-Clause | 是 | 免費 | 2026-10-30 |
| harfbuzzjs | 1.6.4 | 正式：HarfBuzz 子集化 wasm（`harfbuzz-subset.wasm` 約 0.7 MB，由 Vite 打成獨立檔、延遲載入、Service Worker 快取） | MIT | 是 | 免費 | 2026-10-30 |
| fontverter | 2.0.0 | 原型：字型格式轉換（正式版改用 wawoff2，不再相依） | BSD-3-Clause | 是 | 免費 | 2026-10-30 |
| fflate | 0.8.3 | 正式：zip 解壓（讀 xlsx，`src/core/xlsx.ts`，延遲載入）；zip 打包（批次輸出）。無間接相依 | MIT | 是 | 免費 | 2026-11-01 |
| buffer | （原型安裝最新版） | 原型：瀏覽器的 Node `Buffer` 填補層（fontverter 需要） | MIT | 是 | 免費 | 2026-10-30 |
| esbuild | 0.28.2 | 原型：打包瀏覽器測試 | MIT | 是 | 免費 | 2026-10-30 |
| playwright-core | 1.64.1 | 原型／測試：驅動 Chromium | Apache-2.0 | 是（Apache-2.0 與 GPL-3.0 相容） | 免費 | 2026-10-30 |
| pdfjs-dist | 6.4.299 | 原型／測試：解析並渲染 PDF 以比對 | Apache-2.0 | 是 | 免費 | 2026-10-30 |
| @napi-rs/canvas | 1.0.13 | 原型／測試：Node 端畫圖 | MIT | 是 | 免費 | 2026-10-30 |
| Noto Sans TC（可變字型，一個檔涵蓋一般與粗體） | 2.04（取自本機 Windows 內建的 `NotoSansTC-VF.ttf`，Adobe 版權；字型檔內 name 表標「non-release」，內容未改） | 正式：`public/fonts/NotoSansTC-VF.woff2`（5.43 MB，TTF 無損轉 WOFF2，`scripts/build-font.mjs`），PDF 輸出時依字重固定後子集化內嵌 | SIL OFL 1.1 | 是（字型授權獨立於程式；OFL 允許內嵌與隨軟體散布，不可單獨販售字型；保留字型名稱只有 'Source'，我們未改名、未改字形） | 免費 | 2026-11-01（授權全文已放在 `public/fonts/OFL.txt`，取自 notofonts/noto-cjk 的 Sans/LICENSE，並與字型檔 name 表內的授權敘述相符） |
| woff2-encoder | 2.0.0 | 正式：WOFF2 解壓（`src/fonts/woff2.ts`，只載解壓端 wasm，延遲載入）；`scripts/build-font.mjs` 壓縮字型也用它。不用 wawoff2：它在瀏覽器打包後不會初始化（2026-11-01 實測卡死）| MIT | 是 | 免費 | 2026-11-01 |
| pdfjs-dist | 6.4.299 | 測試：把輸出的 PDF 畫成圖做視覺檢查（`src/export/visual.test.ts`，開發相依，不隨網站發布） | Apache-2.0 | 是 | 免費 | 2026-11-01 |
| @napi-rs/canvas | 1.1.0 | 測試：Node 端畫布，供 pdfjs 渲染（開發相依，不隨網站發布） | MIT | 是 | 免費 | 2026-11-01 |
| preact | 11.1.1 | 正式：介面框架（執行時相依） | MIT | 是 | 免費 | 2026-11-01 |
| vite | 8.3.5 | 建置：打包與開發伺服器（不隨網站發布） | MIT | 是 | 免費 | 2026-11-01 |
| @preact/preset-vite | 2.10.6 | 建置：Vite 的 Preact 外掛 | MIT | 是 | 免費 | 2026-11-01 |
| typescript | 6.0.3 | 建置：型別檢查 | Apache-2.0 | 是 | 免費 | 2026-11-01 |
| vitest | 5.0.5 | 測試：單元測試 | MIT | 是 | 免費 | 2026-11-01 |
| @playwright/test | 1.64.1 | 測試：端對端（桌機、平板、手機觸控） | Apache-2.0 | 是 | 免費 | 2026-11-01 |
| eslint | 10.14.0 | 建置：lint | MIT | 是 | 免費 | 2026-11-01 |
| @eslint/js | 10.0.1 | 建置：ESLint 推薦規則 | MIT | 是 | 免費 | 2026-11-01 |
| typescript-eslint | 8.72.1 | 建置：ESLint 的 TypeScript 支援 | MIT | 是 | 免費 | 2026-11-01 |
| @types/node | 26.6.6 | 建置：Node 型別（設定檔與腳本用） | MIT | 是 | 免費 | 2026-11-01 |
| Google Identity Services／Google API 腳本（`accounts.google.com/gsi/client`、`apis.google.com/js/api.js`） | 執行期載入 | 正式（v0.4）：Google 登入與 Picker；只在老師按「連接 Google」後動態載入，不進首頁 bundle，不是 npm 套件 | Google 服務條款（非隨附程式碼） | 不隨附、不散布 | 免費（標準使用；超額計費預計 2026 稍晚，我們不綁帳單，見[文件重核](decisions/2026-11-01-Google登入軌文件重核.md)） | 2026-11-01 |

## 預計引入（尚未核對，引入時填入上表）

ExcelJS（**不採用**：xlsx 讀取與輸出都自寫於 fflate，見 [決定記錄](decisions/2026-11-01-xlsx輸出與分支保護.md)）、圖示字型或圖示集（優先選 OFL／MIT）。
