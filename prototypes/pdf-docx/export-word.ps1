# 用本機 Microsoft Word 把 docx 排版後輸出成 PDF（驗證用，只在原型階段使用）
#
# 這台 Word 的自動化很容易卡住（原因未明）。實測有效的做法，缺一不可：
#   1. 用 Start-Job 執行下面的區塊，並用 Wait-Job -Timeout 設逾時（不要直接在前景跑）
#   2. Word 設為可見（Visible = $true）
#   3. 只用 Open(…, ReadOnly) + SaveAs2(路徑, 17)；不要呼叫 ComputeStatistics、ExportAsFixedFormat
# 用法（PowerShell，第二個參數是 output 資料夾的絕對路徑）：
#   $job = Start-Job -FilePath .\export-word.ps1 -ArgumentList '01,02,09', 'C:\...\prototypes\pdf-docx\output'
#   Wait-Job $job -Timeout 120; Receive-Job $job
# 結束後只清理自己啟動的 Word（命令列含 /Automation 的），不碰使用者原有的。
param([string]$IdList, [string]$dir)
$Ids = $IdList -split ','
$dst = Join-Path $dir 'wordpdf'
New-Item -ItemType Directory -Force $dst | Out-Null
$w = New-Object -ComObject Word.Application
$w.Visible = $true
$w.DisplayAlerts = 0
foreach ($id in $Ids) {
  $d = $w.Documents.Open((Join-Path $dir "docx\$id.docx"), $false, $true)
  $d.SaveAs2((Join-Path $dst "$id.pdf"), 17)
  "saved $id"
  $d.Close($false)
}
$w.Quit()
