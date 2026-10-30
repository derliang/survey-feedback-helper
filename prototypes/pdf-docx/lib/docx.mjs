import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Footer,
  AlignmentType, WidthType, LineRuleType, HeightRule, VerticalAlign, ShadingType,
  TableLayoutType, BorderStyle, PageNumber, LevelFormat,
} from 'docx';
import { PAGE } from './model.mjs';

const tw = (pt) => Math.round(pt * 20); // pt → twips
const FONT = 'Noto Sans TC';
const font = { name: FONT, eastAsia: FONT, ascii: FONT, hAnsi: FONT };
const col = (h) => h.slice(1).toUpperCase();

const base = {
  widowControl: false,
  autoSpaceEastAsianText: false, // 不要在中英文之間自動插空白，與 PDF 輸出器一致
};

export async function renderDocx(doc, opts = {}) {
  const lineH = doc.lineH;
  const children = [];
  const spacer = (pt) =>
    pt > 0 && children.push(new Paragraph({ ...base, spacing: { line: tw(pt), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: '', font, size: 2 })] }));

  for (const b of doc.blocks) {
    spacer(b.before ?? 0);
    if (b.type === 'heading' || b.type === 'text') {
      const lh = b.type === 'heading' ? Math.round(b.size * 1.5) : lineH;
      children.push(new Paragraph({
        ...base,
        spacing: { line: tw(lh), lineRule: LineRuleType.EXACT, before: 0, after: tw(b.after ?? 0) },
        children: [new TextRun({ text: b.text, font, size: b.size * 2, bold: b.type === 'heading', color: col(b.color ?? '#222222') })],
      }));
    } else if (b.type === 'bullets') {
      b.items.forEach((item, i) => {
        children.push(new Paragraph({
          ...base,
          numbering: { reference: 'dot', level: 0 },
          spacing: { line: tw(lineH), lineRule: LineRuleType.EXACT, before: 0, after: tw(i === b.items.length - 1 ? b.after ?? 0 : 3) },
          children: [new TextRun({ text: item, font, size: b.size * 2, color: '222222' })],
        }));
      });
    } else if (b.type === 'table') {
      const cell = (txt, i, fill, color, bold) => new TableCell({
        width: { size: tw(b.widths[i]), type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: col(fill), color: 'auto' },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 0, bottom: 0, left: tw(8), right: tw(8) },
        children: [new Paragraph({
          ...base,
          alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
          spacing: { line: tw(b.rowH - 2), lineRule: LineRuleType.EXACT, before: 0, after: 0 },
          children: [new TextRun({ text: txt, font, size: b.size * 2, bold, color: col(color) })],
        })],
      });
      const row = (cells, fill, color, bold) => new TableRow({
        height: { value: tw(b.rowH), rule: HeightRule.EXACT },
        cantSplit: true,
        children: cells.map((c, i) => cell(c, i, fill, color, bold)),
      });
      const bd = { style: BorderStyle.SINGLE, size: 4, color: 'C9D6E3' };
      children.push(new Table({
        width: { size: tw(b.widths.reduce((a, c) => a + c, 0)), type: WidthType.DXA },
        columnWidths: b.widths.map(tw),
        layout: TableLayoutType.FIXED,
        borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd },
        rows: [row(b.header, '#1f4e79', '#ffffff', true), ...b.rows.map((r, ri) => row(r, ri % 2 ? '#f2f6fa' : '#ffffff', '#222222', false))],
      }));
      spacer(b.after ?? 0);
    } else if (b.type === 'image') {
      children.push(new Paragraph({
        ...base,
        // 圖片段落不能用固定行高（EXACT），Word 會把圖裁掉；改用「最小行高」
        spacing: { before: 0, after: 0, line: tw(b.h), lineRule: LineRuleType.AT_LEAST },
        children: [new ImageRun({ type: 'png', data: b.png, transformation: { width: b.w / 0.75, height: b.h / 0.75 } })],
      }));
      spacer(b.after ?? 0);
    }
  }

  const footer = new Footer({
    children: [new Paragraph({
      ...base,
      spacing: { line: tw(14), lineRule: LineRuleType.EXACT, before: 0, after: 0 },
      children: [
        new TextRun({ text: `${doc.footerText}｜第 `, font, size: 18, color: '8A97A5' }),
        new TextRun({ children: [PageNumber.CURRENT], font, size: 18, color: '8A97A5' }),
        new TextRun({ text: ' 頁，共 ', font, size: 18, color: '8A97A5' }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font, size: 18, color: '8A97A5' }),
        new TextRun({ text: ' 頁', font, size: 18, color: '8A97A5' }),
      ],
    })],
  });

  const d = new Document({
    ...(opts.embedFont ? { fonts: [{ name: FONT, data: opts.embedFont, characterSet: 'ChineseBig5' }] } : {}),
    styles: { default: { document: { run: { font, size: 22 }, paragraph: { spacing: { before: 0, after: 0 } } } } },
    numbering: {
      config: [{
        reference: 'dot',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: tw(14), hanging: tw(14) } }, run: { font, color: '1F4E79' } } }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: tw(PAGE.w), height: tw(PAGE.h) },
          margin: { top: tw(PAGE.mt), bottom: tw(PAGE.mb), left: tw(PAGE.mx), right: tw(PAGE.mx), footer: tw(PAGE.footerFromBottom), header: 0 },
        },
      },
      footers: { default: footer },
      children,
    }],
  });
  return Packer.toBuffer(d);
}
