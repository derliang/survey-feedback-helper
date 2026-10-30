# 問卷回饋小幫手 專案規範

- 專案說明見 [README.md](README.md)；功能藍圖見 [docs/feature-blueprint.md](docs/feature-blueprint.md)；待辦見 [todo.md](todo.md)；決定見 `docs/decisions/`。
- Repo：`derliang/survey-feedback-helper`（公開）。授權 GPL-3.0，引入的第三方套件須相容並登錄 `docs/third-party.md`。
- **隱私原則**：絕不把學生資料（問卷結果、名單、輸出檔）commit 進 repo；`.gitignore` 已擋 xlsx／csv／docx／pdf。示範資料只用虛構資料。
- **資料不落地**：原始問卷資料只放記憶體，不寫入 localStorage／IndexedDB；只儲存設定。
- **測試與建置指令**：尚未建立（v0.1 開工時補）。統計計算必須有自動化測試。
- **工作流程**：依全域規範，程式修改在分支施工、開 PR；文件類小改可依授權直接在 main。
- **版本記錄**：每次發布更新 `CHANGELOG.md` 並建立 GitHub Release；完成待辦要同步更新 `todo.md`。
- 介面與輸出文件的設計走設計員流程，設計系統完成後記錄於 `docs/design-system/`。
