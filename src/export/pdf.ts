// PDF 輸出器：pdf-lib 畫圖、自己排版；字型先用 HarfBuzz 子集化（依字重只留用到的字元）再以 subset:false 內嵌。
// 禁用 pdf-lib 內建的 subset:true（實測會漏字，見 docs/decisions/2026-10-30-原型驗證結果.md）。
import { subsetFor, type Fonts } from '../fonts/loader';
import { wrap } from './layout';
import { collectChars, contentWidth, pageOf, type DocModel } from './model';

const hexParts = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export interface PdfResult {
  bytes: Uint8Array;
  pageCount: number;
  /** 字型沒有的字元（會顯示成空白方框）；介面可據此提醒使用者改用 Word 版或換字。 */
  missingChars: string[];
}

/** baseK：基線位置係數，0.5 為對照 Word 實測校準值。 */
/** opts.embed：測試用，直接內嵌指定字型而不子集化（拿來當「完整字型」的對照組）。 */
export async function renderPdf(doc: DocModel, fonts: Fonts, opts: { baseK?: number; embed?: { regular: Uint8Array; bold: Uint8Array } } = {}): Promise<PdfResult> {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit')]);
  const color = (h: string) => rgb(...hexParts(h));
  const need = collectChars(doc);
  const [fr, fb] = opts.embed
    ? [opts.embed.regular, opts.embed.bold]
    : await Promise.all([subsetFor(fonts, 'regular', need.regular), subsetFor(fonts, 'bold', need.bold)]);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fr, { subset: false });
  const bold = await pdf.embedFont(fb, { subset: false });
  const has = new Set([...regular.getCharacterSet(), ...bold.getCharacterSet()]);
  const missingChars = [...new Set([...need.regular, ...need.bold])].filter((c) => !/\s/.test(c) && !has.has(c.codePointAt(0)!));
  if (doc.title) pdf.setTitle(doc.title);
  pdf.setProducer('問卷回饋小幫手');
  pdf.setCreator('問卷回饋小幫手');

  const P = pageOf(doc);
  const CW = contentWidth(P);
  const lineH = doc.lineH;
  const base = (top: number, h: number, size: number) => top + h / 2 + size * (opts.baseK ?? 0.5);

  let page = pdf.addPage([P.w, P.h]);
  const pages = [page];
  let y = P.mt;
  const newPage = () => {
    page = pdf.addPage([P.w, P.h]);
    pages.push(page);
    y = P.mt;
  };
  const ensure = (h: number) => {
    if (y + h > P.h - P.mb + 0.01) newPage();
  };
  type F = typeof regular;
  const text = (s: string, x: number, topY: number, h: number, size: number, font: F, c: string) =>
    page.drawText(s, { x, y: P.h - base(topY, h, size), size, font, color: color(c) });

  for (const [bi, b] of doc.blocks.entries()) {
    y += b.before ?? 0;
    if (b.type === 'heading' || b.type === 'text') {
      const font = b.type === 'heading' ? bold : regular;
      const lh = b.type === 'heading' ? Math.round(b.size * 1.5) : lineH;
      // 標題不可孤零零留在頁尾：至少要連同下一個區塊的開頭（表格兩列／一行文字）一起放得下
      if (b.type === 'heading') {
        const next = doc.blocks[bi + 1];
        ensure(lh + (b.after ?? 0) + (next?.type === 'table' ? next.rowH * 2 : next?.type === 'image' ? next.h : lineH));
      }
      for (const ln of wrap(b.text, (s) => font.widthOfTextAtSize(s, b.size), CW)) {
        ensure(lh);
        text(ln, P.mx, y, lh, b.size, font, b.color ?? '#222222');
        y += lh;
      }
      y += b.after ?? 0;
    } else if (b.type === 'bullets') {
      const ind = 14;
      for (const item of b.items) {
        wrap(item, (s) => regular.widthOfTextAtSize(s, b.size), CW - ind).forEach((ln, i) => {
          ensure(lineH);
          if (i === 0) text('•', P.mx + 2, y, lineH, b.size, regular, '#1f4e79');
          text(ln, P.mx + ind, y, lineH, b.size, regular, '#222222');
          y += lineH;
        });
        y += 3;
      }
      y += (b.after ?? 0) - 3;
    } else if (b.type === 'table') {
      const draw = (cells: string[], topY: number, fill: string, c: string, font: F) => {
        let x = P.mx;
        cells.forEach((cell, i) => {
          const cw = b.widths[i] ?? 0;
          page.drawRectangle({ x, y: P.h - topY - b.rowH, width: cw, height: b.rowH, color: color(fill), borderColor: color('#c9d6e3'), borderWidth: 0.5 });
          const tw = font.widthOfTextAtSize(cell, b.size);
          const align = b.align?.[i] ?? (i === 0 ? 'left' : 'center');
          const tx = align === 'left' ? x + 8 : align === 'right' ? x + cw - tw - 8 : x + (cw - tw) / 2;
          text(cell, tx, topY, b.rowH, b.size, font, c);
          x += cw;
        });
      };
      const header = () => draw(b.header, y, '#1f4e79', '#ffffff', bold);
      ensure(b.rowH * 2);
      header();
      y += b.rowH;
      b.rows.forEach((r, ri) => {
        if (y + b.rowH > P.h - P.mb + 0.01) {
          newPage();
          header(); // 跨頁時表頭重複
          y += b.rowH;
        }
        const emph = b.emphasisRows?.includes(ri);
        draw(r, y, emph ? '#dce8f4' : ri % 2 ? '#f2f6fa' : '#ffffff', '#222222', emph ? bold : regular);
        y += b.rowH;
      });
      y += b.after ?? 0;
    } else {
      ensure(b.h);
      const img = await pdf.embedPng(b.png);
      page.drawImage(img, { x: P.mx, y: P.h - y - b.h, width: b.w, height: b.h });
      y += b.h + (b.after ?? 0);
    }
  }

  pages.forEach((p, i) => {
    p.drawText(`${doc.footerText}｜第 ${i + 1} 頁，共 ${pages.length} 頁`, { x: P.mx, y: P.footerFromBottom + 3, size: 9, font: regular, color: color('#8a97a5') });
  });
  return { bytes: await pdf.save(), pageCount: pages.length, missingChars };
}
