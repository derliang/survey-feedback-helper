# 第三方套件登錄

> 專案原則：授權須與 GPL-3.0 相容，且**不得產生任何費用**。引入任何套件、字型、CDN、服務前先核對並在此登錄，PR 關卡會檢查。
> 「用途」欄：**正式候選**＝預計進正式版；**原型／測試**＝只用在 `prototypes/` 或測試，不隨網站發布。
> 核對方式：讀各套件 `package.json` 的 `license` 欄位（含間接相依，共約 28 個，全為寬鬆授權）；與 GPL-3.0 相容性依 FSF 的相容清單（MIT、BSD-3-Clause、0BSD、Zlib、Apache-2.0 皆可併入 GPL-3.0）。

| 套件／資源 | 版本 | 用途 | 授權 | 與 GPL-3.0 相容 | 費用 | 核對日期 |
|---|---|---|---|---|---|---|
| pdf-lib | 1.17.1 | 正式候選：程式直接產生 PDF（**不可用其內建 `subset:true`**，會漏字） | MIT | 是 | 免費 | 2026-10-30 |
| @pdf-lib/fontkit | 1.1.1 | 正式候選：pdf-lib 內嵌自訂字型 | MIT | 是 | 免費 | 2026-10-30 |
| docx | 9.15.0 | 正式候選：產生 Word（docx） | MIT | 是 | 免費 | 2026-10-30 |
| subset-font | 2.9.0 | 正式候選：HarfBuzz 字型子集化（主程式需包裝才能在瀏覽器用） | BSD-3-Clause | 是 | 免費 | 2026-10-30 |
| harfbuzzjs | （subset-font 相依） | 正式候選：HarfBuzz 的 wasm | MIT | 是 | 免費 | 2026-10-30 |
| fontverter | 2.0.0 | 正式候選：字型格式轉換（WOFF2↔TTF） | BSD-3-Clause | 是 | 免費 | 2026-10-30 |
| fflate | （原型安裝最新版） | 正式候選：zip 打包 | MIT | 是 | 免費 | 2026-10-30 |
| buffer | （原型安裝最新版） | 原型：瀏覽器的 Node `Buffer` 填補層（fontverter 需要） | MIT | 是 | 免費 | 2026-10-30 |
| esbuild | 0.28.2 | 原型：打包瀏覽器測試 | MIT | 是 | 免費 | 2026-10-30 |
| playwright-core | 1.64.1 | 原型／測試：驅動 Chromium | Apache-2.0 | 是（Apache-2.0 與 GPL-3.0 相容） | 免費 | 2026-10-30 |
| pdfjs-dist | 6.4.299 | 原型／測試：解析並渲染 PDF 以比對 | Apache-2.0 | 是 | 免費 | 2026-10-30 |
| @napi-rs/canvas | 1.0.13 | 原型／測試：Node 端畫圖 | MIT | 是 | 免費 | 2026-10-30 |
| Noto Sans TC（一般、粗體） | 由本機系統提供 | 正式候選：中文字型（正式版需把字型檔放進專案並明確放行 `.gitignore`） | SIL OFL 1.1 | 是（字型授權獨立於程式；OFL 允許內嵌與隨軟體散布，不可單獨販售字型） | 免費 | 2026-10-30（授權文字尚未逐字核對字型檔內附的 OFL，正式引入前要補） |

## 預計引入（尚未核對，引入時填入上表）

Preact、Vite、Vitest、ExcelJS（xlsx 讀寫）、圖示字型或圖示集（優先選 OFL／MIT）。
