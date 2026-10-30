# 原型：同一份文件模型輸出 PDF 與 Word

**只用來驗證技術可行性，不隨網站發布，也不是正式版程式碼。** 驗證結果與結論見 [docs/decisions/2026-10-30-原型驗證結果.md](../../docs/decisions/2026-10-30-原型驗證結果.md)。

- 資料全為虛構（`lib/model.mjs` 產生）。
- `lib/pdf.mjs`：PDF 輸出器（pdf-lib＋HarfBuzz 子集化；自帶中文換行與分頁）
- `lib/docx.mjs`：Word 輸出器（docx）
- `lib/chart-core.mjs`：圖表（Node 與瀏覽器共用）
- `run.mjs`、`exp-subset.mjs`、`exp-woff2.mjs`、`compare.mjs`、`browser/`：量測與比對腳本
- `export-word.ps1`：用本機 Word 輸出 PDF 的做法與已知的卡住問題（只有註解有參考價值）

重跑方式見驗證結果文件〈重跑方式〉。需要本機已安裝 Noto Sans TC（預設讀 `C:/Windows/Fonts`，可用環境變數 `PROTO_FONT_DIR` 改）。輸出與打包產物不進版控。
