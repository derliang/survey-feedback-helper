// 瀏覽器端實測：在真瀏覽器內載入字型、畫圖、子集化、產生全班 PDF 與 docx，打包 zip，量時間。
import './shim.mjs'; // Node 的 Buffer 填補層，必須最先載入
import { Buffer } from 'buffer';
import { zipSync } from 'fflate';
import { makeStudents, classAverages, buildDoc, CLASS_INFO } from '../lib/model.mjs';
import { paintChart } from '../lib/chart-core.mjs';
import { renderPdf } from '../lib/pdf.mjs';
import { renderDocx } from '../lib/docx.mjs';

async function chartPng(s, avgs) {
  const S = 3, c = document.createElement('canvas');
  c.width = 440 * S; c.height = 190 * S;
  paintChart(c.getContext('2d'), 440, 190, S, 'NotoSansTC', CLASS_INFO.dimensions, s.scores, avgs);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

window.runTest = async (n, withDocx) => {
  const r = { n, ua: navigator.userAgent, cores: navigator.hardwareConcurrency };
  const t0 = performance.now();
  const [reg, bold] = await Promise.all(['Regular', 'Bold'].map((w) => fetch(`/fonts/NotoSansTC-${w}.${window.FONT_EXT}`).then((x) => x.arrayBuffer())));
  r.fontFetchMs = performance.now() - t0;
  r.fontBytes = reg.byteLength + bold.byteLength;
  // 圖表字型（網頁字型）
  const ff = new FontFace('NotoSansTC', reg); await ff.load(); document.fonts.add(ff);
  // WOFF2 必須先解壓成 TTF，且只做一次（每位學生都解壓一次會慢到不能用，實測踩過）
  const fontverter = (await import('fontverter')).default;
  let fonts = { regular: Buffer.from(reg), bold: Buffer.from(bold) };
  const td = performance.now();
  if (window.FONT_EXT === 'woff2') {
    fonts = { regular: await fontverter.convert(fonts.regular, 'truetype'), bold: await fontverter.convert(fonts.bold, 'truetype') };
  }
  r.fontDecodeMs = performance.now() - td;

  const students = makeStudents(n), avgs = classAverages(students);
  const files = {}, pdfMs = [], docxMs = [];
  const t1 = performance.now();
  for (const s of students) {
    const png = await chartPng(s, avgs);
    const doc = buildDoc(s, avgs, png);
    let t = performance.now();
    const p = await renderPdf(doc, fonts);
    pdfMs.push(performance.now() - t);
    const id = String(s.seat).padStart(2, '0');
    files[`pdf/${id}.pdf`] = p.bytes;
    if (withDocx) {
      t = performance.now();
      files[`docx/${id}.docx`] = new Uint8Array(await renderDocx(doc));
      docxMs.push(performance.now() - t);
    }
  }
  r.generateMs = performance.now() - t1;
  const t2 = performance.now();
  const zip = zipSync(files, { level: 0 }); // PDF/docx 本身已壓縮，zip 用儲存模式
  r.zipMs = performance.now() - t2;
  r.zipBytes = zip.length;
  r.pdfAvgMs = pdfMs.reduce((a, b) => a + b, 0) / pdfMs.length;
  r.docxAvgMs = docxMs.length ? docxMs.reduce((a, b) => a + b, 0) / docxMs.length : null;
  r.totalMs = performance.now() - t0;
  r.heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  r.firstPdfHeader = String.fromCharCode(...files['pdf/01.pdf'].slice(0, 5));
  r.pdf01 = btoa(String.fromCharCode(...files['pdf/01.pdf']));
  return r;
};
