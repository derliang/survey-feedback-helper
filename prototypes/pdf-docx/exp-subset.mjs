// 對照實驗：三種字型處理方式輸出同一份 PDF，比較大小、時間與「字形有沒有真的畫出來」
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import subsetFont from 'subset-font';
import { makeStudents, classAverages, buildDoc, CLASS_INFO } from './lib/model.mjs';
import { drawChart } from './lib/chart.mjs';
import { renderPdf } from './lib/pdf.mjs';
import { loadFonts } from './lib/fonts.mjs';

const out = new URL('./output/exp/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(out, { recursive: true });
const students = makeStudents(35);
const avgs = classAverages(students);
const s = students[0];
const doc = buildDoc(s, avgs, drawChart(CLASS_INFO.dimensions, s.scores, avgs));
const fonts = loadFonts();
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

// 這份文件用到的所有字元
const chars = new Set();
for (const b of doc.blocks) for (const t of [b.text, ...(b.items ?? []), ...(b.header ?? []), ...(b.rows?.flat() ?? [])]) if (t) for (const c of t) chars.add(c);
for (const c of doc.footerText + '｜第頁，共 0123456789') chars.add(c);
const text = [...chars].join('');

async function darkPixels(bytes, name) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1.4 });
  const c = createCanvas(Math.round(vp.width), Math.round(vp.height));
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp, canvas: c }).promise;
  writeFileSync(`${out}${name}.png`, c.toBuffer('image/png'));
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100) n++;
  return n;
}

const run = async (name, f, opts) => {
  const t = performance.now();
  const r = await renderPdf(doc, f, opts);
  const ms = performance.now() - t;
  const dark = await darkPixels(r.bytes, name);
  return { name, size: r.bytes.length, ms, dark };
};

const results = [];
results.push(await run('A-pdflib內建子集化', fonts, { mode: 'pdflib' }));
results.push(await run('B-完整字型不子集化', fonts, { mode: 'none' }));
let t = performance.now();
const sub = { regular: await subsetFont(fonts.regular, text, { targetFormat: 'truetype' }), bold: await subsetFont(fonts.bold, text, { targetFormat: 'truetype' }) };
const subMs = performance.now() - t;
console.log(`HarfBuzz 子集化 ${chars.size} 個字元：Regular ${kb(sub.regular.length)}、Bold ${kb(sub.bold.length)}，${subMs.toFixed(0)} ms`);
results.push(await run('C-HarfBuzz子集化後內嵌（全文用同一份字元）', sub, { mode: 'none' }));
results.push(await run('D-HarfBuzz 依字重分別子集化（正式做法）', fonts, { mode: 'harfbuzz' }));

const base = results.find((r) => r.name.startsWith('B')).dark;
for (const r of results) console.log(`${r.name}: PDF ${kb(r.size)}，${r.ms.toFixed(0)} ms，深色像素 ${r.dark}（相對完整字型 ${((r.dark / base) * 100).toFixed(0)}%）`);
