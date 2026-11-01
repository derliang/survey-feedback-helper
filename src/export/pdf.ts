// PDF 輸出器：pdf-lib 畫圖、自己排版；字型先用 HarfBuzz 子集化（依字重只留用到的字元）再以 subset:false 內嵌。
// 禁用 pdf-lib 內建的 subset:true（實測會漏字，見 docs/decisions/2026-10-30-原型驗證結果.md）。
// 排版：同一個 drawBlock 同時服務整頁流動（paginate）與欄位／卡片內的固定位置繪製；多欄是各欄由同一個 y 起畫。
import { subsetFor, type Fonts } from '../fonts/loader';
import { wrap } from './layout';
import { collectChars, contentWidth, GEO, HERO_FILL, pageOf, TONES, type Block, type DocModel } from './model';

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

/** 圓角矩形的 SVG 路徑（drawSvgPath 以頁面左上角為原點）。 */
const roundedRect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;

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
  const deco = doc.deco;
  const base = (top: number, h: number, size: number) => top + h / 2 + size * (opts.baseK ?? 0.5);
  type F = typeof regular;
  const logo = deco?.logo ? await pdf.embedPng(deco.logo.png) : undefined;
  const imgCache = new Map<Uint8Array, Awaited<ReturnType<typeof pdf.embedPng>>>();

  const makePage = () => {
    const pg = pdf.addPage([P.w, P.h]);
    if (deco?.background) pg.drawRectangle({ x: 0, y: 0, width: P.w, height: P.h, color: color(deco.background) });
    if (deco?.frame) {
      const f = deco.frame;
      const inset = GEO.frameInset;
      if (f.rounded) pg.drawSvgPath(roundedRect(inset, inset, P.w - inset * 2, P.h - inset * 2, 14), { x: 0, y: P.h, borderColor: color(f.color), borderWidth: f.width });
      else pg.drawRectangle({ x: inset, y: inset, width: P.w - inset * 2, height: P.h - inset * 2, borderColor: color(f.color), borderWidth: f.width });
    }
    if (deco?.headerText) pg.drawText(deco.headerText, { x: P.mx, y: P.h - (P.mt * 0.5 + 3), size: 9, font: regular, color: color('#8a97a5') });
    if (logo && deco?.logo) {
      const hh = Math.min(deco.logo.h, P.mt - 24),
        ww = deco.logo.w * (hh / deco.logo.h);
      pg.drawImage(logo, { x: P.w - P.mx - ww, y: P.h - 14 - hh, width: ww, height: hh });
    }
    return pg;
  };
  let page = makePage();
  const pages = [page];
  let y = P.mt;
  const newPage = () => {
    page = makePage();
    pages.push(page);
    y = P.mt;
  };
  const text = (s: string, x: number, topY: number, h: number, size: number, font: F, c: string) =>
    page.drawText(s, { x, y: P.h - base(topY, h, size), size, font, color: color(c) });
  const fillRect = (x: number, topY: number, w: number, h: number, c: string, border?: string) =>
    page.drawRectangle({ x, y: P.h - topY - h, width: w, height: h, color: color(c), ...(border ? { borderColor: color(border), borderWidth: 0.5 } : {}) });
  const mw = (font: F, size: number) => (s: string) => font.widthOfTextAtSize(s, size);

  const colWidths = (b: Extract<Block, { type: 'columns' }>, w: number): number[] => {
    const n = b.cols.length;
    const gap = b.gap ?? GEO.colGap;
    const weights = b.widths && b.widths.length === n ? b.widths : b.cols.map(() => 1);
    const sum = weights.reduce((a, c) => a + c, 0) || 1;
    return weights.map((wt) => ((w - gap * (n - 1)) * wt) / sum);
  };
  const scaled = (widths: number[], w: number) => {
    const sum = widths.reduce((a, c) => a + c, 0);
    return Math.abs(sum - w) < 0.5 || sum === 0 ? widths : widths.map((x) => (x * w) / sum);
  };

  /** 區塊高度（含前後間距），不分頁。多欄取最高的一欄。 */
  const heightOf = (b: Block, w: number): number => {
    const sp = (b.before ?? 0) + (b.after ?? 0);
    switch (b.type) {
      case 'heading':
      case 'text': {
        const font = b.type === 'heading' ? bold : regular;
        const lh = b.type === 'heading' ? Math.round(b.size * 1.5) : lineH;
        const iw = w - (b.bg ? GEO.textPad * 2 : 0);
        return wrap(b.text, mw(font, b.size), iw).length * lh + sp;
      }
      case 'bullets':
        return b.items.reduce((a, it) => a + wrap(it, mw(regular, b.size), w - 14).length * lineH + 3, 0) - 3 + sp;
      case 'table':
        return b.rowH * (b.rows.length + 1) + sp;
      case 'image':
        return Math.min(b.h, (b.h * w) / Math.max(b.w, w)) + sp;
      case 'rule':
        return 1 + sp;
      case 'pagebreak':
        return 0;
      case 'hero': {
        const size = b.size ?? 22;
        const t = wrap(b.title, mw(bold, size), w - GEO.heroPad * 2).length * Math.round(size * 1.5);
        const s = b.subtitle ? 4 + wrap(b.subtitle, mw(regular, GEO.heroSubSize), w - GEO.heroPad * 2).length * GEO.heroSubLh : 0;
        return GEO.heroPad * 2 + t + s + sp;
      }
      case 'stats':
        return GEO.statsH + sp;
      case 'callout': {
        const iw = w - GEO.calloutBar - GEO.calloutPad * 2;
        const t = b.title ? GEO.calloutTitleLh : 0;
        return GEO.calloutPad * 2 + t + wrap(b.text, mw(regular, GEO.calloutSize), iw).length * lineH + sp;
      }
      case 'columns': {
        const ws = colWidths(b, w);
        return Math.max(0, ...b.cols.map((c, i) => c.reduce((a, x) => a + heightOf(x, ws[i]!), 0))) + sp;
      }
    }
  };

  const ensure = (h: number) => {
    if (y + h > P.h - P.mb + 0.01) newPage();
  };

  /** 畫一個區塊。paginate = true：整頁流動（可換頁）；false：在欄位或卡片內，位置固定、不換頁。 */
  const drawBlock = async (b: Block, x: number, w: number, paginate: boolean, next?: Block): Promise<void> => {
    const ens = paginate ? ensure : () => undefined;
    const atomic = b.type === 'hero' || b.type === 'stats' || b.type === 'callout' || b.type === 'columns';
    if (atomic) ens(heightOf(b, w));
    if (b.type !== 'pagebreak') y += b.before ?? 0;
    switch (b.type) {
      case 'heading':
      case 'text': {
        const font = b.type === 'heading' ? bold : regular;
        const lh = b.type === 'heading' ? Math.round(b.size * 1.5) : lineH;
        // 標題不可孤零零留在頁尾：至少要連同下一個區塊的開頭（表格兩列／一行文字）一起放得下
        if (b.type === 'heading' && paginate) ens(lh + (b.after ?? 0) + (next?.type === 'table' ? next.rowH * 2 : next?.type === 'image' ? next.h : lineH));
        const pad = b.bg ? GEO.textPad : 0;
        for (const ln of wrap(b.text, mw(font, b.size), w - pad * 2)) {
          ens(lh);
          if (b.bg) fillRect(x, y, w, lh, b.bg);
          text(ln, x + pad, y, lh, b.size, font, b.color ?? '#222222');
          y += lh;
        }
        y += b.after ?? 0;
        break;
      }
      case 'bullets': {
        const ind = 14;
        for (const item of b.items) {
          wrap(item, mw(regular, b.size), w - ind).forEach((ln, i) => {
            ens(lineH);
            if (i === 0) text('•', x + 2, y, lineH, b.size, regular, '#1f4e79');
            text(ln, x + ind, y, lineH, b.size, regular, '#222222');
            y += lineH;
          });
          y += 3;
        }
        y += (b.after ?? 0) - 3;
        break;
      }
      case 'table': {
        const widths = scaled(b.widths, w);
        const draw = (cells: string[], topY: number, fill: string, c: string, font: F) => {
          let cx = x;
          cells.forEach((cell, i) => {
            const cw = widths[i] ?? 0;
            fillRect(cx, topY, cw, b.rowH, fill, '#c9d6e3');
            const tw = font.widthOfTextAtSize(cell, b.size);
            const align = b.align?.[i] ?? (i === 0 ? 'left' : 'center');
            const tx = align === 'left' ? cx + 8 : align === 'right' ? cx + cw - tw - 8 : cx + (cw - tw) / 2;
            text(cell, tx, topY, b.rowH, b.size, font, c);
            cx += cw;
          });
        };
        const header = () => draw(b.header, y, '#1f4e79', '#ffffff', bold);
        ens(b.rowH * 2);
        header();
        y += b.rowH;
        b.rows.forEach((r, ri) => {
          if (paginate && y + b.rowH > P.h - P.mb + 0.01) {
            newPage();
            header(); // 跨頁時表頭重複
            y += b.rowH;
          }
          const emph = b.emphasisRows?.includes(ri);
          draw(r, y, emph ? '#dce8f4' : ri % 2 ? '#f2f6fa' : '#ffffff', '#222222', emph ? bold : regular);
          y += b.rowH;
        });
        y += b.after ?? 0;
        break;
      }
      case 'pagebreak':
        if (paginate && y > P.mt) newPage();
        break;
      case 'rule':
        ens(1);
        page.drawLine({ start: { x, y: P.h - y }, end: { x: x + w, y: P.h - y }, thickness: 0.75, color: color(b.color ?? '#c9d6e3') });
        y += 1 + (b.after ?? 0);
        break;
      case 'image': {
        const k = Math.min(1, w / b.w);
        const iw = b.w * k,
          ih = b.h * k;
        ens(ih);
        let img = imgCache.get(b.png);
        if (!img) imgCache.set(b.png, (img = await pdf.embedPng(b.png)));
        page.drawImage(img, { x, y: P.h - y - ih, width: iw, height: ih });
        y += ih + (b.after ?? 0);
        break;
      }
      case 'hero': {
        const size = b.size ?? 22;
        const tl = Math.round(size * 1.5);
        const h = heightOf({ ...b, before: 0, after: 0 }, w);
        const iw = w - GEO.heroPad * 2;
        fillRect(x, y, w, h, b.fill ?? HERO_FILL);
        let ty = y + GEO.heroPad;
        for (const ln of wrap(b.title, mw(bold, size), iw)) {
          text(ln, x + GEO.heroPad, ty, tl, size, bold, b.color ?? '#ffffff');
          ty += tl;
        }
        if (b.subtitle) {
          ty += 4;
          for (const ln of wrap(b.subtitle, mw(regular, GEO.heroSubSize), iw)) {
            text(ln, x + GEO.heroPad, ty, GEO.heroSubLh, GEO.heroSubSize, regular, b.color ?? '#ffffff');
            ty += GEO.heroSubLh;
          }
        }
        y += h + (b.after ?? 0);
        break;
      }
      case 'stats': {
        const n = Math.max(1, b.items.length);
        const cw = (w - GEO.statsGap * (n - 1)) / n;
        b.items.forEach((it, i) => {
          const cx = x + i * (cw + GEO.statsGap);
          fillRect(cx, y, cw, GEO.statsH, b.fill ?? '#fff1de', '#ead9c3');
          const vw = bold.widthOfTextAtSize(it.value, GEO.statsValueSize);
          text(it.value, cx + (cw - vw) / 2, y + 6, 32, GEO.statsValueSize, bold, b.color ?? HERO_FILL);
          const lw = regular.widthOfTextAtSize(it.label, GEO.statsLabelSize);
          text(it.label, cx + (cw - lw) / 2, y + 38, 18, GEO.statsLabelSize, regular, '#66554a');
        });
        y += GEO.statsH + (b.after ?? 0);
        break;
      }
      case 'callout': {
        const t = TONES[b.tone];
        const h = heightOf({ ...b, before: 0, after: 0 }, w);
        fillRect(x, y, w, h, t.fill);
        fillRect(x, y, GEO.calloutBar, h, t.bar);
        const tx = x + GEO.calloutBar + GEO.calloutPad;
        let ty = y + GEO.calloutPad;
        if (b.title) {
          text(b.title, tx, ty, GEO.calloutTitleLh, GEO.calloutSize, bold, t.ink);
          ty += GEO.calloutTitleLh;
        }
        for (const ln of wrap(b.text, mw(regular, GEO.calloutSize), w - GEO.calloutBar - GEO.calloutPad * 2)) {
          text(ln, tx, ty, lineH, GEO.calloutSize, regular, '#222222');
          ty += lineH;
        }
        y += h + (b.after ?? 0);
        break;
      }
      case 'columns': {
        const ws = colWidths(b, w);
        const gap = b.gap ?? GEO.colGap;
        const top = y;
        let end = top;
        let cx = x;
        for (const [i, col] of b.cols.entries()) {
          y = top;
          for (const [bi, cb] of col.entries()) await drawBlock(cb, cx, ws[i]!, false, col[bi + 1]);
          end = Math.max(end, y);
          cx += ws[i]! + gap;
        }
        y = end + (b.after ?? 0);
        break;
      }
    }
  };

  const flow = async (blocks: Block[]): Promise<void> => {
    for (const [bi, b] of blocks.entries()) {
      // 多欄比一頁還高就放棄並排，改成各欄依序往下排（避免內容被切掉）
      if (b.type === 'columns' && heightOf(b, CW) > P.h - P.mt - P.mb) {
        await flow(b.cols.flat());
        continue;
      }
      await drawBlock(b, P.mx, CW, true, blocks[bi + 1]);
    }
  };
  await flow(doc.blocks);

  pages.forEach((p, i) => {
    p.drawText(`${doc.footerText}｜第 ${i + 1} 頁，共 ${pages.length} 頁`, { x: P.mx, y: P.footerFromBottom + 3, size: 9, font: regular, color: color('#8a97a5') });
  });
  return { bytes: await pdf.save(), pageCount: pages.length, missingChars };
}
