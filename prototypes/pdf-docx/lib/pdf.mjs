import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import subsetFont from 'subset-font';
import { PAGE, CONTENT_W } from './model.mjs';

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// 行首禁則：這些標點不可出現在行首
const NO_LINE_START = new Set('，。、；：！？）」』》〉】』,.;:!?)]}%');
// 英數連續字元視為不可拆開的一個單位
const isLatin = (c) => /[A-Za-z0-9.%+\-_/@#]/.test(c);

function tokenize(text) {
  const out = [];
  let buf = '';
  for (const ch of text) {
    if (isLatin(ch)) { buf += ch; continue; }
    if (buf) { out.push(buf); buf = ''; }
    out.push(ch);
  }
  if (buf) out.push(buf);
  return out;
}

export function wrap(text, font, size, maxW) {
  const tokens = tokenize(text);
  const lines = [];
  let cur = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const w = font.widthOfTextAtSize(cur + t, size);
    if (w <= maxW || cur === '') { cur += t; continue; }
    // 放不下：換行。若下一個字元不得出現在行首，把目前行尾一個單位一起帶到下一行
    if (NO_LINE_START.has(t[0]) && cur.length > 1) {
      const last = [...cur].pop();
      lines.push(cur.slice(0, -last.length));
      cur = last + t;
    } else {
      lines.push(cur);
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// 收集這份文件各字重實際用到的字元（粗體：標題與表頭；其餘用一般字重）
function collectChars(doc) {
  const reg = new Set('•｜第頁，共 0123456789'), bol = new Set();
  const add = (set, t) => { if (t) for (const c of t) set.add(c); };
  add(reg, doc.footerText);
  for (const b of doc.blocks) {
    if (b.type === 'heading') add(bol, b.text);
    else if (b.type === 'text') add(reg, b.text);
    else if (b.type === 'bullets') b.items.forEach((t) => add(reg, t));
    else if (b.type === 'table') { b.header.forEach((t) => add(bol, t)); b.rows.flat().forEach((t) => add(reg, t)); }
  }
  return { regular: [...reg].join(''), bold: [...bol].join('') };
}

// mode: 'harfbuzz'（預設，先用 HarfBuzz 子集化再內嵌）｜'pdflib'（pdf-lib 內建子集化，實測會漏字，勿用）｜'none'（內嵌完整字型）
export async function renderPdf(doc, fonts, opts = {}) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const mode = opts.mode ?? 'harfbuzz';
  let fr = fonts.regular, fb = fonts.bold;
  if (mode === 'harfbuzz') {
    const need = collectChars(doc);
    fr = await subsetFont(fonts.regular, need.regular, { targetFormat: 'truetype', noHinting: true });
    fb = await subsetFont(fonts.bold, need.bold, { targetFormat: 'truetype', noHinting: true });
  }
  const regular = await pdf.embedFont(fr, { subset: mode === 'pdflib' });
  const bold = await pdf.embedFont(fb, { subset: mode === 'pdflib' });
  const { w: W, h: H, mx, mt, mb } = PAGE;
  const lineH = doc.lineH;
  const base = (top, h, size) => top + h / 2 + size * (opts.baseK ?? 0.5); // 基線位置（由上往下量），0.5 為對照 Word 實測校準值

  let page = pdf.addPage([W, H]);
  const pages = [page];
  let y = mt;
  const ensure = (h) => {
    if (y + h > H - mb + 0.01) { page = pdf.addPage([W, H]); pages.push(page); y = mt; }
  };
  const text = (s, x, topY, h, size, font, color) =>
    page.drawText(s, { x, y: H - base(topY, h, size), size, font, color: hex(color) });

  for (const b of doc.blocks) {
    y += b.before ?? 0;
    if (b.type === 'heading' || b.type === 'text') {
      const font = b.type === 'heading' ? bold : regular;
      const lh = b.type === 'heading' ? Math.round(b.size * 1.5) : lineH;
      const lines = wrap(b.text, font, b.size, CONTENT_W);
      for (const ln of lines) {
        ensure(lh);
        text(ln, mx, y, lh, b.size, font, b.color ?? '#222222');
        y += lh;
      }
      y += b.after ?? 0;
    } else if (b.type === 'bullets') {
      const ind = 14;
      for (const item of b.items) {
        const lines = wrap(item, regular, b.size, CONTENT_W - ind);
        lines.forEach((ln, i) => {
          ensure(lineH);
          if (i === 0) text('•', mx + 2, y, lineH, b.size, regular, '#1f4e79');
          text(ln, mx + ind, y, lineH, b.size, regular, '#222222');
          y += lineH;
        });
        y += 3; // 項目間距
      }
      y += (b.after ?? 0) - 3;
    } else if (b.type === 'table') {
      const draw = (cells, topY, fill, color, font) => {
        let x = mx;
        cells.forEach((c, i) => {
          const cw = b.widths[i];
          page.drawRectangle({ x, y: H - topY - b.rowH, width: cw, height: b.rowH, color: hex(fill), borderColor: hex('#c9d6e3'), borderWidth: 0.5 });
          const tw = font.widthOfTextAtSize(c, b.size);
          const tx = i === 0 ? x + 8 : x + (cw - tw) / 2;
          text(c, tx, topY, b.rowH, b.size, font, color);
          x += cw;
        });
      };
      ensure(b.rowH);
      draw(b.header, y, '#1f4e79', '#ffffff', bold);
      y += b.rowH;
      b.rows.forEach((r, ri) => {
        ensure(b.rowH);
        draw(r, y, ri % 2 ? '#f2f6fa' : '#ffffff', '#222222', regular);
        y += b.rowH;
      });
      y += b.after ?? 0;
    } else if (b.type === 'image') {
      ensure(b.h);
      const img = await pdf.embedPng(b.png);
      page.drawImage(img, { x: mx, y: H - y - b.h, width: b.w, height: b.h });
      y += b.h + (b.after ?? 0);
    }
  }

  // 頁尾（含頁碼）
  pages.forEach((p, i) => {
    const s = `${doc.footerText}｜第 ${i + 1} 頁，共 ${pages.length} 頁`;
    const size = 9;
    p.drawText(s, { x: mx, y: PAGE.footerFromBottom + 3, size, font: regular, color: hex('#8a97a5') });
  });
  return { bytes: await pdf.save(), pageCount: pages.length };
}
