// 端對端測試用探針：在真實瀏覽器裡跑完整輸出流程（抓字型 → 解壓 → 子集化 → PDF／Word／xlsx／zip），回報結果與耗時。
import { loadDocx, loadPdf, loadTemplates, loadXlsx, registerAssetCache } from '../../../src/export';

const items = ['內容完整度', '表達清晰度', '創意與亮點'];
const students = Array.from({ length: 12 }, (_, i) => ({
  seat: i + 1,
  name: `虛構學生${i + 1}`,
  values: items.map((_, d) => 6 + ((i + d) % 5) * 0.5),
  mean: 7,
}));
const summary = { className: '八年三班', topic: '分組專題報告', items, students, classMeans: [7, 7, 7], classOverall: 7 };

(window as unknown as Record<string, unknown>).runExport = async () => {
  const t0 = performance.now();
  const reg = await registerAssetCache();
  const [tpl, xlsx, docx, pdf] = await Promise.all([loadTemplates(), loadXlsx(), loadDocx(), loadPdf()]);
  const tLoad = performance.now();
  const fonts = await pdf.loadFonts();
  const tFonts = performance.now();
  const fbDoc = (seat: number) =>
    tpl.personalFeedbackDoc({
      className: '八年三班',
      topic: '分組專題報告',
      student: { seat, name: `虛構學生${seat}` },
      scaleMax: 10,
      items: items.map((label) => ({ label, mine: 7.5, classMean: 7 })),
      average: { mine: 7.5, classMean: 7 },
      praise: ['報告架構清楚。'],
      advice: ['可以多一點互動。'],
    });
  const one = await pdf.renderPdf(fbDoc(1), fonts);
  const tPdf = performance.now();
  const zip = await pdf.renderBatchZip(
    students.map((s) => ({ name: `${s.seat} ${s.name}`, doc: fbDoc(s.seat) })),
    fonts,
  );
  const tZip = performance.now();
  const word = await docx.renderDocx(tpl.classSummaryDoc(summary));
  const sheet = xlsx.classSummaryXlsx(summary);
  const head = (b: Uint8Array, n: number) => String.fromCharCode(...b.subarray(0, n));
  return {
    registered: reg,
    pdfHead: head(one.bytes, 5),
    pdfBytes: one.bytes.length,
    zipHead: head(zip, 2),
    zipBytes: zip.length,
    docxHead: head(word, 2),
    xlsxHead: head(sheet, 2),
    ms: { loadModules: tLoad - t0, fonts: tFonts - tLoad, onePdf: tPdf - tFonts, zip12: tZip - tPdf },
  };
};
