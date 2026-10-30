# 模擬頁產生器（設計用，不屬於正式程式）

`docs/design/mockups/` 的模擬頁與成品頁，都是由這些腳本產生的。要改畫面，改這裡的 `*.mjs` 再重新產生，比手改 HTML 容易。

- 路徑：`lib.mjs` 的 `sp`（暫存資料夾）與 `mk.mjs` 的 `sp`、`repo` 是舊電腦的絕對路徑，換機器先改這三處。
- 順序：`docs0–3.mjs`（輸出文件）→ `batch4–19.mjs`（各畫面，各自輸出 `frag-*.html` 並登記到 `pages.json`）→ `node mk.mjs mockups` 產生模擬頁；`node mk.mjs artifact` 產生成品頁（`survey-pages.html`、`survey-docs.html`）。
- `deskkit.mjs`：桌機 1280 畫面的共用外框（`D`、`modal`、`side／main／rside` 三欄）；`batch16–19.mjs` 是桌機補齊的 45 個畫面。桌機分頁的分組寫在 `mk.mjs` 的 `DESK_SECS`，新增畫面要登記進去，否則產生時會報錯。
- `txt.mjs <frag檔> <編號…>` 取出某些畫面的純文字（寫另一裝置版時對文案用）；`list.mjs` 列出全部畫面。
- `wide.mjs`：平板與桌機共用工具。`contrast.mjs`：token 對比檢查。
- 規範以 `docs/design/DESIGN.md` 與 `tokens.css` 為準；這個資料夾只是產生器。
