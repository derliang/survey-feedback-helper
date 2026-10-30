# 參與貢獻

謝謝你願意幫忙！本專案是給老師用的網頁工具，處理的是學生資料，所以**隱私、正確性與零費用**是三條底線。

## 開始前先看

- [README.md](README.md)：專案目標與隱私承諾
- [docs/feature-blueprint.md](docs/feature-blueprint.md)：功能藍圖
- [docs/decisions/](docs/decisions/)：已定案的決定與被否決的選項，請先看，避免重複討論
- [todo.md](todo.md)：目前進度

## 重要規則

1. **`main` 即上線。** 合併到 `main` 就會發布到 GitHub Pages 正式站，所以所有變更都要走 PR，且必須通過全部檢查，經維護者確認後才合併。
2. **絕對不要提交學生資料。** 問卷結果、名單、輸出的 xlsx／csv／docx／pdf 都不能進 repo。示範資料請只用虛構資料。
3. **資料不落地。** 原始問卷資料只能放記憶體，不能寫入 localStorage、IndexedDB 或任何伺服器；不得加入任何使用數據蒐集。
4. **零費用。** 新增套件、字型、CDN、服務前，先確認授權與 GPL-3.0 相容且不產生費用，並登錄 [docs/third-party.md](docs/third-party.md)。
5. **Google 權限只用 `drive.file`。**
6. **統計計算要有自動化測試。**
7. 各裝置（手機、平板、桌機）的版面都要考量。

## PR 流程

1. 從 `main` 開分支，小而專注的修改。
2. 本機通過型別與 lint、單元測試、端對端測試後再開 PR。
3. 依 PR 範本填寫，包含測試證據。
4. 等待所有檢查通過與維護者審核，**由維護者決定何時合併與發布**。

## 回報問題

請用 Issue 範本。**回報時請不要附上真實的學生資料**，用虛構資料或截圖遮蔽後再貼。安全性問題請見 [SECURITY.md](SECURITY.md)。

## 授權

貢獻的內容將以 [GPL-3.0](LICENSE) 授權。
