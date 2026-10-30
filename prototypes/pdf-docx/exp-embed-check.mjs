import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const dir = new URL('./output/embed/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
for (const n of ['embed', 'noembed']) {
  const bytes = readFileSync(`${dir}${n}-word.pdf`);
  const names = [...new Set([...bytes.toString('latin1').matchAll(/\/BaseFont\s*\/([A-Za-z0-9+\-_#]+)/g)].map((m) => m[1]))];
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1.4 });
  const c = createCanvas(Math.round(vp.width), Math.round(vp.height));
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp, canvas: c }).promise;
  writeFileSync(`${dir}${n}-word.png`, c.toBuffer('image/png'));
  console.log(`${n}: ${pdf.numPages} 頁；PDF ${(bytes.length / 1024).toFixed(0)} KB；字型 = ${names.join(', ')}`);
}
