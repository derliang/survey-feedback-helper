# 決定：在 Teacher Hub 先放候選佔位卡（2026-10-30）

## 結論
- 問卷回饋小幫手要上架到 Teacher Hub（`derliang/teacher-hub`，https://derliang.github.io/teacher-hub/）。
- 分區：**「立即可用」區**。理由：純網頁、單人使用、沒有後端，資料只在老師自己的瀏覽器處理，不屬於需要 GAS 的多人使用工具。
- 目前還沒有任何版本與 GitHub Pages 網址，所以先放一張不可點的**候選佔位卡**。已發佈：`derliang/teacher-hub` PR #6，合併提交 `fa34d25`，Teacher Hub 首頁版本 v1.14.0。

## 為什麼要改 Teacher Hub 的規範
Teacher Hub 原規範只允許 GAS 區有候選卡，「立即可用」區只能放即開即用或 Beta。擁有者於 2026-10-30 同意新增例外：已核准、單人使用的 web app 在網址未上線前，可在「立即可用」區放不可點的候選卡。Teacher Hub 的 DESIGN.md、PUBLISHING.md、首頁模擬頁與 `check_design.py` 已同步。「立即可用」的件數把候選卡也算進去（現為 5 款）。

## 被否決的做法
- 放進 GAS 區的候選：問卷小幫手沒有 GAS 後端，與分區規則矛盾。
- 首頁完全不放，只在文件預留：擁有者要首頁先看得到佔位。

## 未完成（見 [todo.md](../../todo.md)「Teacher Hub 卡片轉正」）
第一版上線後，由 teacher-hub 把候選卡改成可點卡片並加入 `tools.json`。工具需有 `version.json`；上架前要親自開啟正式網址驗證，版本與發布日要有可靠來源，不得填今天日期。

## 相關
- teacher-hub 上架規範：`docs/PUBLISHING.md`（在 teacher-hub repo）
- 本專案隱私與發布規則：[CLAUDE.md](../../CLAUDE.md)
