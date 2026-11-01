// Google 權限檢查：程式碼與設定中出現的 Google OAuth scope 只允許 drive.file（硬規則 4）。
// 另擋 drive 完整權限簡寫（如 "scope: drive"）。docs/ 文件不掃（文件會討論被禁的權限）。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src', 'index.html', 'public', 'vite.config.ts', '.github/workflows'];
const EXT = /\.(ts|tsx|js|mjs|json|html|yml|yaml)$/;
const ALLOWED = new Set(['https://www.googleapis.com/auth/drive.file']);
const SCOPE_RE = /https:\/\/www\.googleapis\.com\/auth\/[A-Za-z0-9._\-/]*/g;

function* walk(p) {
  let st;
  try {
    st = statSync(p);
  } catch {
    return;
  }
  if (st.isFile()) {
    if (EXT.test(p)) yield p;
    return;
  }
  for (const name of readdirSync(p)) yield* walk(join(p, name));
}

const problems = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(SCOPE_RE)) {
      if (!ALLOWED.has(m[0])) problems.push(`${file}: ${m[0]}`);
    }
    if (/\bscope\s*[:=]\s*['"`](?:drive|spreadsheets|drive\.readonly)['"`]/.test(text)) {
      problems.push(`${file}: 疑似使用非 drive.file 的簡寫 scope`);
    }
  }
}

if (problems.length > 0) {
  console.error('Google 權限檢查失敗：只允許 drive.file');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('Google 權限檢查通過（只出現 drive.file 或沒有 Google scope）');
