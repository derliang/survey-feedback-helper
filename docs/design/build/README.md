# 模擬頁產生器（設計用，不屬於正式程式）

`docs/design/mockups/` 的模擬頁與成品頁，都是由這些腳本產生的。要改畫面，改這裡的 `*.mjs` 再重新產生，比手改 HTML 容易。

- 路徑：`lib.mjs` 的 `sp`（暫存資料夾）與 `mk.mjs` 的 `sp`、`repo` 是舊電腦的絕對路徑，換機器先改這三處。
- 順序：`docs0–3.mjs`（輸出文件）→ `batch4–19.mjs`（各畫面，各自輸出 `frag-*.html` 並登記到 `pages.json`）→ `node mk.mjs mockups` 產生模擬頁；`node mk.mjs artifact` 產生成品頁（`survey-pages.html`、`survey-docs.html`）。
- `deskkit.mjs`：桌機 1280 畫面的共用外框（`D`、`modal`、`side／main／rside` 三欄）；`batch16–19.mjs` 是桌機補齊的 45 個畫面。桌機分頁的分組寫在 `mk.mjs` 的 `DESK_SECS`，新增畫面要登記進去，否則產生時會報錯。
- `txt.mjs <frag檔> <編號…>` 取出某些畫面的純文字（寫另一裝置版時對文案用）；`list.mjs` 列出全部畫面。
- `wide.mjs`：平板與桌機共用工具。`contrast.mjs`：token 對比檢查。
- 規範以 `docs/design/DESIGN.md` 與 `tokens.css` 為準；這個資料夾只是產生器。

## 手機與平板第二輪（2026-11-01）

- `batch31–33.mjs` 產生手機第二輪新畫面（`frag-b31–33.html`）；`m2kit.mjs` 是手機與平板共用工具（數字步驟列、頂端列、用語整理 `patchOld`、`tabletize`）。
- `phones.mjs` 是**手機畫面總表**：舊畫面（整理過用語）加新畫面，依使用順序分 11 組；被取代的舊畫面列在 `DROP`。`mk.mjs` 與 `batch34.mjs` 都從這裡取畫面。
- `batch34.mjs` 把每個手機畫面自動轉成平板版（`frag-b34.html`、`tablet-secs.json`），另有 6 張保留的手工平板稿（`KEEP`）。新增手機畫面要在 `RAIL` 登記平板左欄。
- 順序：`node batch31.mjs; node batch32.mjs; node batch33.mjs; node batch34.mjs; node mk.mjs`（產生模擬頁）；`node mk.mjs artifact` 產生成品頁。成品頁 `survey-*.html` 是產物，不進版控。
- 舊的 `batch4–12、14`、`frag-core` 等手機與平板稿仍是 `phones.mjs` 的來源（被取代的畫面不再顯示）。
- 第六輪：`batch51.mjs`（`node batch51.mjs` 直接寫入 `mockups/{手機,平板,桌機}-第六輪.html`；用 `m2kit`、`deskkit`，深色頁用 tokens.css 深色區塊改成 `.dk` 範圍）。
