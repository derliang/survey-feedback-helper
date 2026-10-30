# 模擬頁產生器（設計用，不屬於正式程式）

`docs/design/mockups/` 的模擬頁與成品頁，都是由這些腳本產生的。要改畫面，改這裡的 `*.mjs` 再重新產生，比手改 HTML 容易。

- 路徑：`lib.mjs` 的 `sp`（暫存資料夾）與 `mk.mjs` 的 `sp`、`repo` 是舊電腦的絕對路徑，換機器先改這三處。
- 順序：`docs0–3.mjs`（輸出文件）→ `batch4–15.mjs`（各畫面，各自輸出 `frag-*.html` 並登記到 `pages.json`）→ `node mk.mjs mockups` 產生模擬頁。
- `wide.mjs`：平板與桌機共用工具。`contrast.mjs`：token 對比檢查。
- 規範以 `docs/design/DESIGN.md` 與 `tokens.css` 為準；這個資料夾只是產生器。
