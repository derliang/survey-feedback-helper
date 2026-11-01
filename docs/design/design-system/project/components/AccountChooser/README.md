# AccountChooser

選帳號示意圖：Gmail 一列「✓ 選這個」，學校帳號與用其他信箱註冊的 Google 帳號各一列「✕ 不要選」，最後一列「使用其他帳戶」。

用在兩處：①開 Google 視窗之前的「選帳號前先看一下」；②擋下畫面與教學。擋下時用 `chooser('school')` 標出「你剛才選的」。只有 @gmail.com 結尾能用，其餘一律擋下、不設「仍要繼續」。自畫示意，不是 Google 截圖；「使用其他帳戶」字樣尚未核對，圖上標「字樣待核對」。程式在 `docs/design/build/acctkit.mjs`。

來源：docs/design/DESIGN.md 第 4、5 節，docs/design/build/app.css、doc.css。
