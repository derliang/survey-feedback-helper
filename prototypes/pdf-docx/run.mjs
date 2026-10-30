// 產生全班（預設 35 人）的 PDF 與 docx，量測大小與時間。輸出到 output/（已被 .gitignore 擋下）。
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { makeStudents, classAverages, buildDoc, CLASS_INFO } from './lib/model.mjs';
import { drawChart } from './lib/chart.mjs';
import { renderPdf } from './lib/pdf.mjs';
import { renderDocx } from './lib/docx.mjs';
import { loadFonts, DIMENSIONS_FONT } from './lib/fonts.mjs';

const N = Number(process.argv[2] ?? 35);
const out = new URL('./output/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(`${out}pdf`, { recursive: true });
mkdirSync(`${out}docx`, { recursive: true });

const students = makeStudents(N);
const avgs = classAverages(students);
const fonts = loadFonts();
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

const stat = { pdf: [], docx: [], pdfMs: [], docxMs: [], pages: [] };
for (const s of students) {
  const png = drawChart(CLASS_INFO.dimensions, s.scores, avgs);
  const doc = buildDoc(s, avgs, png);
  let t = performance.now();
  const p = await renderPdf(doc, fonts);
  stat.pdfMs.push(performance.now() - t);
  t = performance.now();
  const d = await renderDocx(doc);
  stat.docxMs.push(performance.now() - t);
  const id = String(s.seat).padStart(2, '0');
  writeFileSync(`${out}pdf/${id}.pdf`, p.bytes);
  writeFileSync(`${out}docx/${id}.docx`, d);
  stat.pdf.push(p.bytes.length); stat.docx.push(d.length); stat.pages.push(p.pageCount);
}
const sum = (a) => a.reduce((x, y) => x + y, 0);
const rpt = (name, a, ms) => console.log(`${name}: 每份平均 ${kb(sum(a) / a.length)}、最大 ${kb(Math.max(...a))}；全班 ${kb(sum(a))}；產生時間平均 ${(sum(ms) / ms.length).toFixed(0)} ms、全班 ${(sum(ms) / 1000).toFixed(1)} s`);
console.log(`學生 ${N} 人；PDF 頁數分布：`, stat.pages.reduce((m, p) => ((m[p] = (m[p] ?? 0) + 1), m), {}));
rpt('PDF（字型子集化）', stat.pdf, stat.pdfMs);
rpt('docx（未內嵌字型）', stat.docx, stat.docxMs);

// 對照：PDF 不做子集化、docx 內嵌整個字型檔
const s0 = students[0];
const doc0 = buildDoc(s0, avgs, drawChart(CLASS_INFO.dimensions, s0.scores, avgs));
let t = performance.now();
const full = await renderPdf(doc0, fonts, { mode: 'none' });
console.log(`對照 PDF 不子集化（單份）: ${kb(full.bytes.length)}，${(performance.now() - t).toFixed(0)} ms`);
t = performance.now();
const emb = await renderDocx(doc0, { embedFont: readFileSync(DIMENSIONS_FONT) });
console.log(`對照 docx 內嵌整個 Noto Sans TC Regular（單份）: ${kb(emb.length)}，${(performance.now() - t).toFixed(0)} ms`);
writeFileSync(`${out}docx/embedded-01.docx`, emb);
