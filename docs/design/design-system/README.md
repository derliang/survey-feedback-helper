# 設計系統成品頁（2026-10-31）

- 成品頁（derliang@gmail.com 帳號，私人）：https://claude.ai/artifact/857AdkhXWshr4UNaQzELkQ
- 畫面設計（149 張）：https://claude.ai/artifact/VNReJ26aV2zkEh9GUQeFKg
- 輸出文件：https://claude.ai/artifact/XRF6iMuXKwdkkFrjmmHzaj
- 規範仍以 `docs/design/DESIGN.md`、`docs/design/tokens.css` 為準；`project/` 是 `docs/design/build/ds.mjs` 產生的，不要手改。
- 更新方式：`node docs/design/build/ds.mjs`，再用 Artifact publish 到同一網址（`root` 設為這個資料夾），只送改過的檔。新增圖示要先上傳，把 id 補進 `assets.json`。

## 與另一帳號三個成品頁的對照

對照對象：RLcyVRmEWpQjaVmxYjujKM（畫面設計）、PyDBFqxp3VH2aFwVLMqK2b（輸出文件）、K7UuEDQEcSppFaveAqhvqB（第 1 輪設計系統），比對 repo `main@31635ff`。

- tokens：三頁的淺色 52 個、深色 29 個、`.doc-warm` 8 個，與 `tokens.css` 全部相同，差異 0。
- 畫面：畫面設計 149 張、輸出文件 9 張、第 1 輪 5 張，標題都在 repo 模擬頁內，沒有 repo 缺的畫面。只比對標題，沒有逐張比內容。
- 元件 CSS：`app.css`、`chrome.css` 三頁都完整；輸出文件頁少 16 條 `doc.css` 規則（`.cmp`、`.tgl` 等），這些是畫面用的元件，不影響該頁。
- 第 1 輪頁寫平板與桌機「留待下一輪」，已被 DESIGN.md 5.11、5.17～5.19 取代。

## 規範與樣式不一致（2026-10-31 已裁示，待套用，見[決定記錄](../../decisions/2026-10-31-頁面討論裁示.md)）

1. 長條粗細：DESIGN.md 寫 14，`.track` 實際 12。
2. 控制項外框：規範要用 `--ink3`，但 `.rcard` 用 `--line`、`.rowbtn` 用 `--line-soft`，對比低於 3:1。
3. `--warn-bar` 淺色對卡片 2.26:1、`--bar-muted` 約 1.7:1，低於圖形 3:1，目前靠旁邊的數字與文字。
4. 字級表外的值：`.btn-sm`、`.seg`、`.chip` 用 15px，頂端列標題用 17px。
5. `doc.css` 有寫死的色碼（`#efe8dc`、`#f4eee4`、`#e3eaff` 等），尚未變成 token。

## 畫面與輸出文件兩頁怎麼重建

`build/` 缺 `frag-core.html` 等早期片段，無法從 `batch*.mjs` 全部重跑。做法：複製 `build/` 到短路徑（暫存目錄路徑太長時 Node 無法當工作目錄），改 `lib.mjs` 與 `mk.mjs` 的 `sp`、`repo`，再依 `pages.json` 把每個 `mockups/<name>.html` 裡 `<div class="figs">` 的內容寫成 `<frag>`，執行 `node mk.mjs artifact`。2026-10-31 重建結果與另一帳號原頁逐張比對：畫面 149／149、輸出文件 10／10 完全相同。

## 尚未完成

- 另一帳號成品頁上的留言沒有搬過來，已記錄的部分在 `頁面討論紀錄.md`。
- `頁面討論紀錄.md` 的 R-001～R-029 都已裁示但還沒套用，設計系統反映的是修改前的現況。
- 元件只有 CSS class 與預覽，沒有 React bundle；`bundle.js` 是空殼。
- 深色模式抽查了大部分元件；Assets 分頁與手機寬度沒有實際看過。
