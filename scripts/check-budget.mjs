// 效能預算（硬規則 9）：首頁載入的程式（index.html 直接引用的 JS、CSS，含 modulepreload）
// gzip 後合計不得超過 150 KB。延遲載入的 chunk（動態 import）不計入。
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_BYTES = 150 * 1000; // 以 150 KB = 150,000 位元組計，較嚴格
const DIST = 'dist';

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|mjs))"/g)) refs.add(m[1]);

let total = 0;
for (const ref of refs) {
  const rel = ref.replace(/^\/survey-feedback-helper\//, '').replace(/^\.?\//, '');
  const size = gzipSync(readFileSync(join(DIST, rel)), { level: 9 }).length;
  total += size;
  console.log(`  ${rel}: ${(size / 1000).toFixed(1)} KB gzip`);
}
const htmlSize = gzipSync(Buffer.from(html)).length;
total += htmlSize;
console.log(`  index.html: ${(htmlSize / 1000).toFixed(1)} KB gzip`);
console.log(`首頁合計 ${(total / 1000).toFixed(1)} KB gzip（預算 ${BUDGET_BYTES / 1000} KB）`);

if (refs.size === 0) {
  console.error('找不到首頁引用的 JS/CSS，檢查腳本可能失效');
  process.exit(1);
}
if (total > BUDGET_BYTES) {
  console.error('效能預算超標：首頁 gzip 超過 150 KB。請把大型功能（xlsx、docx、PDF、字型）改為延遲載入。');
  process.exit(1);
}
