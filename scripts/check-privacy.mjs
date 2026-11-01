// 隱私掃描：repo 追蹤的檔案不得含學生資料檔（硬規則 5）。
// 白名單：docs/ 底下的 pdf（文件用）。用 git ls-files 檢查，涵蓋已 commit 與暫存的檔案。
import { execFileSync } from 'node:child_process';

const FORBIDDEN = /\.(xlsx|xls|xlsm|csv|tsv|docx|doc|pdf)$/i;
const ALLOW = [/^docs\/.+\.pdf$/i];
const FORBIDDEN_DIRS = /^(sample-data\/private|output)\//;

const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const bad = files.filter(
  (f) => (FORBIDDEN.test(f) && !ALLOW.some((re) => re.test(f))) || FORBIDDEN_DIRS.test(f),
);

if (bad.length > 0) {
  console.error('隱私掃描失敗：以下檔案不得進入 repo（公開 repo，不可放學生資料或輸出檔）：');
  for (const f of bad) console.error('  - ' + f);
  process.exit(1);
}
console.log(`隱私掃描通過（檢查 ${files.length} 個追蹤檔案）`);
