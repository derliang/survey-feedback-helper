import { readFileSync } from 'node:fs';
import fontverter from 'fontverter';
const kb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
for (const f of ['NotoSansTC-Regular', 'NotoSansTC-Bold', 'NotoSansTC-VF']) {
  const ttf = readFileSync(`C:/Windows/Fonts/${f}.ttf`);
  const t = performance.now();
  const w2 = await fontverter.convert(ttf, 'woff2');
  console.log(`${f}: TTF ${kb(ttf.length)} → WOFF2 ${kb(w2.length)}（${(performance.now() - t).toFixed(0)} ms）`);
}
