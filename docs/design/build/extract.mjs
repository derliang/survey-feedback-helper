// 還原沒有產生器的片段：frag-core、輸出文件等只存在於模擬頁，從 mockups 取回放進 build/（不進版控）
import fs from 'node:fs';
import { sp } from './lib.mjs';
const pages = JSON.parse(fs.readFileSync(`${sp}/pages.json`, 'utf8'));
for (const p of pages) {
  if (fs.existsSync(`${sp}/${p.frag}`)) continue;
  const html = fs.readFileSync(new URL(`../mockups/${p.name}.html`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const a = html.indexOf('\n', html.indexOf('<div class="figs"')) + 1;
  const b = html.lastIndexOf('\n</div>\n</div>\n</body>');
  fs.writeFileSync(`${sp}/${p.frag}`, html.slice(a, b));
}
