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

// 效能分段量測（scripts/perf-throttle.mjs 在 CPU 降速下呼叫）：下載、解壓、wasm 初始化、子集化、單份 PDF、35 份批次
(window as unknown as Record<string, unknown>).runPerf = async (batch = 35) => {
  const [{ woff2ToTtf }, { initSubset, subsetTtf }, loader, tpl, pdf] = await Promise.all([
    import('../../../src/fonts/woff2'),
    import('../../../src/fonts/subset'),
    import('../../../src/fonts/loader'),
    loadTemplates(),
    loadPdf(),
  ]);
  const src = loader.browserFontSource();
  const t: Record<string, number> = {};
  let p = performance.now();
  const lap = (k: string) => {
    const n = performance.now();
    t[k] = Math.round(n - p);
    p = n;
  };
  const [woff2, wasm] = await Promise.all([src.fetchFont(), src.fetchWasm()]);
  lap('下載（快取後約為讀取）');
  await initSubset(wasm);
  lap('wasm 初始化');
  const ttf = await woff2ToTtf(woff2);
  lap('WOFF2 解壓');
  // 對照：把解壓後的 TTF 存進 Cache Storage 再讀回（取代重複解壓）
  const cache = await caches.open('sfh-perf-ttf');
  await cache.put('/ttf', new Response(ttf as BlobPart));
  p = performance.now();
  const back = new Uint8Array(await (await cache.match('/ttf'))!.arrayBuffer());
  lap('（對照）從 Cache Storage 讀回解壓後 TTF');
  t['TTF 大小 KB'] = Math.round(back.length / 1024);
  await caches.delete('sfh-perf-ttf');
  p = performance.now();
  const text = '問卷回饋小幫手報告架構清楚圖片用心聲音洪亮語速適中看著同學說話很有自信'.repeat(3) + '0123456789';
  await subsetTtf(ttf, text, { pinWeight: 400 });
  lap('子集化一個字重');
  const fonts = { ttf };
  const fbDoc = (seat: number) =>
    tpl.personalFeedbackDoc({
      className: '八年三班',
      topic: '分組專題報告',
      student: { seat, name: `虛構學生${seat}` },
      scaleMax: 10,
      items: items.map((label) => ({ label, mine: 7.5, classMean: 7 })),
      average: { mine: 7.5, classMean: 7 },
      praise: ['報告架構清楚，從動機到結論一氣呵成，聽起來很舒服。'],
      advice: ['有幾頁的文字稍微多了一點，如果改成條列或圖表，會更容易吸收。'],
    });
  await pdf.renderPdf(fbDoc(1), fonts);
  lap('單份 PDF');
  let longTask = 0;
  const obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => (longTask = Math.max(longTask, e.duration))));
  obs.observe({ entryTypes: ['longtask'] });
  await pdf.renderBatchZip(
    Array.from({ length: batch }, (_, i) => ({ name: `${i + 1}`, doc: fbDoc(i + 1) })),
    fonts,
  );
  lap(`${batch} 份批次 PDF`);
  await new Promise((r) => setTimeout(r, 100));
  obs.disconnect();
  t['最長單次卡住主執行緒'] = Math.round(longTask);
  return t;
};

// 優化前後對照：loadFonts 第一次（要解壓）與清掉記憶體後第二次（讀解壓後 TTF 快取）
(window as unknown as Record<string, unknown>).runFontLoad = async () => {
  const loader = await import('../../../src/fonts/loader');
  await caches.delete('sfh-ttf-v1');
  const time = async () => {
    loader.resetFontCache();
    const t0 = performance.now();
    await loader.loadFonts();
    return Math.round(performance.now() - t0);
  };
  const first = await time();
  await new Promise((r) => setTimeout(r, 300)); // 等背景寫入快取
  const second = await time();
  return { 第一次含解壓: first, 之後讀快取: second };
};
