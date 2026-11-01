// 輸出視覺檢查：把 PDF 真的畫成圖，比對「墨跡」。
// 為什麼不只抽文字：pdf-lib 內建子集化會漏字，但文字內容仍在 PDF 裡，抽文字看不出來（見 2026-10-30 原型驗證結果）。
// 做法：同一份文件，一份用本專案的 HarfBuzz 子集化字型，一份內嵌「完整」字型當對照，逐頁比墨跡與逐像素差異。
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { loadFonts, WEIGHT_VALUE } from '../fonts/loader';
import { subsetTtf } from '../fonts/subset';
import { renderPdf } from './pdf';
import { classSummaryDoc, personalFeedbackDoc } from './templates';
import { fakeClassSummary, fakeFeedback, nodeFontSource } from './test-support';

type PdfjsPage = {
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: unknown): { promise: Promise<void> };
};

async function renderPages(bytes: Uint8Array, scale = 1.2): Promise<Uint8ClampedArray[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const out: Uint8ClampedArray[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = (await pdf.getPage(i)) as unknown as PdfjsPage;
    const vp = page.getViewport({ scale });
    const c = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
    out.push(new Uint8ClampedArray(ctx.getImageData(0, 0, c.width, c.height).data));
    if (process.env.EXPORT_VISUAL_DIR) {
      mkdirSync(process.env.EXPORT_VISUAL_DIR, { recursive: true });
      writeFileSync(`${process.env.EXPORT_VISUAL_DIR}/p${i}-${Date.now() % 100000}.png`, c.toBuffer('image/png'));
    }
  }
  return out;
}

/** 非白像素的「暗度」總和。 */
const ink = (px: Uint8ClampedArray) => {
  let s = 0;
  for (let i = 0; i < px.length; i += 4) s += 255 - (px[i]! + px[i + 1]! + px[i + 2]!) / 3;
  return s;
};

/** 完整字型的對照組：保留字型內所有字元（不做子集化，只固定字重）。 */
async function fullInstance(ttf: Uint8Array, weight: number): Promise<Uint8Array> {
  let all = '';
  for (let cp = 0x20; cp <= 0xffff; cp++) if (cp < 0xd800 || cp > 0xdfff) all += String.fromCharCode(cp);
  return subsetTtf(ttf, all, { pinWeight: weight });
}

async function pageTexts(bytes: Uint8Array): Promise<string[][]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const out: string[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent();
    out.push(tc.items.map((it) => ('str' in it ? it.str : '')).filter((t) => t.trim()));
  }
  return out;
}

describe('輸出視覺檢查', () => {
  it('標題不會孤零零留在頁尾', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const { bytes, pageCount } = await renderPdf(personalFeedbackDoc(fakeFeedback(3, 8)), fonts);
    expect(pageCount).toBe(2);
    const texts = await pageTexts(bytes);
    const page1 = texts[0]!.filter((t) => !t.includes('第 1 頁'));
    expect(page1.at(-1)).not.toBe('老師的話');
    expect(texts[1]).toContain('老師的話');
  }, 60_000);

  it('子集化字型畫出的字形與完整字型一致（沒有漏字）', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const embed = { regular: await fullInstance(fonts.ttf, WEIGHT_VALUE.regular), bold: await fullInstance(fonts.ttf, WEIGHT_VALUE.bold) };
    const docs = [personalFeedbackDoc(fakeFeedback(3, 8)), classSummaryDoc(fakeClassSummary(45))];
    for (const doc of docs) {
      const sub = await renderPdf(doc, fonts);
      const full = await renderPdf(doc, fonts, { embed });
      expect(sub.pageCount).toBe(full.pageCount);
      expect(sub.bytes.length).toBeLessThan(full.bytes.length / 5);
      const a = await renderPages(sub.bytes);
      const b = await renderPages(full.bytes);
      a.forEach((pa, i) => {
        const pb = b[i]!;
        expect(ink(pa)).toBeGreaterThan(0);
        expect(Math.abs(ink(pa) - ink(pb)) / ink(pb)).toBeLessThan(0.005); // 墨跡總量差 0.5% 內
        let diff = 0;
        for (let k = 0; k < pa.length; k += 4) if (Math.abs(pa[k]! - pb[k]!) > 40) diff++;
        expect(diff / (pa.length / 4)).toBeLessThan(0.0005); // 明顯不同的像素 0.05% 內
      });
    }
  }, 180_000);

  it('版面：頁面都有內容，頁尾與表格位置在頁面內', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const { bytes, pageCount } = await renderPdf(classSummaryDoc(fakeClassSummary(60)), fonts);
    const pages = await renderPages(bytes, 1);
    expect(pages).toHaveLength(pageCount);
    for (const p of pages) expect(ink(p)).toBeGreaterThan(50_000);
    // 最後一頁不能是只剩頁尾的空頁：除了頁尾以外還要有表格內容（墨跡明顯多於一行頁尾）
    expect(ink(pages.at(-1)!)).toBeGreaterThan(ink(pages[0]!) * 0.05);
  }, 120_000);
});
