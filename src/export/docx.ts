// Word（docx）輸出器：版面規則與 PDF 一致（固定行高、固定欄寬、關閉寡行控制與中英自動間距、圖片段落用最小行高）。
// 字型用系統字型（見 src/fonts/word-fonts.ts），不內嵌。
import { wordFontFor } from '../fonts/word-fonts';
import { pageOf, type DocModel } from './model';

const tw = (pt: number) => Math.round(pt * 20);
const col = (h: string) => h.slice(1).toUpperCase();

export async function renderDocx(doc: DocModel, opts: { fontName?: string } = {}): Promise<Uint8Array> {
  const D = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Footer, AlignmentType, WidthType, LineRuleType, HeightRule, VerticalAlign, ShadingType, TableLayoutType, BorderStyle, PageNumber, LevelFormat, PageOrientation } = D;
  const FONT = opts.fontName ?? wordFontFor('auto');
  const font = { name: FONT, eastAsia: FONT, ascii: FONT, hAnsi: FONT };
  const P = pageOf(doc);
  const landscape = P.w > P.h;
  const lineH = doc.lineH;
  const base = { widowControl: false, autoSpaceEastAsianText: false };
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  const spacer = (pt: number) => {
    if (pt > 0)
      children.push(new Paragraph({ ...base, spacing: { line: tw(pt), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: '', font, size: 2 })] }));
  };
  const aligns = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT };

  for (const b of doc.blocks) {
    spacer(b.before ?? 0);
    if (b.type === 'heading' || b.type === 'text') {
      const lh = b.type === 'heading' ? Math.round(b.size * 1.5) : lineH;
      children.push(
        new Paragraph({
          ...base,
          keepNext: b.type === 'heading', // 標題與下一段同頁，與 PDF 一致
          spacing: { line: tw(lh), lineRule: LineRuleType.EXACT, before: 0, after: tw(b.after ?? 0) },
          children: [new TextRun({ text: b.text, font, size: b.size * 2, bold: b.type === 'heading', color: col(b.color ?? '#222222') })],
        }),
      );
    } else if (b.type === 'bullets') {
      b.items.forEach((item, i) =>
        children.push(
          new Paragraph({
            ...base,
            numbering: { reference: 'dot', level: 0 },
            spacing: { line: tw(lineH), lineRule: LineRuleType.EXACT, before: 0, after: tw(i === b.items.length - 1 ? (b.after ?? 0) : 3) },
            children: [new TextRun({ text: item, font, size: b.size * 2, color: '222222' })],
          }),
        ),
      );
    } else if (b.type === 'table') {
      const cell = (txt: string, i: number, fill: string, c: string, bld: boolean) =>
        new TableCell({
          width: { size: tw(b.widths[i] ?? 0), type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: col(fill), color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 0, bottom: 0, left: tw(8), right: tw(8) },
          children: [
            new Paragraph({
              ...base,
              alignment: aligns[b.align?.[i] ?? (i === 0 ? 'left' : 'center')],
              spacing: { line: tw(b.rowH - 2), lineRule: LineRuleType.EXACT, before: 0, after: 0 },
              children: [new TextRun({ text: txt, font, size: b.size * 2, bold: bld, color: col(c) })],
            }),
          ],
        });
      const row = (cells: string[], fill: string, c: string, bld: boolean, isHeader = false) =>
        new TableRow({ height: { value: tw(b.rowH), rule: HeightRule.EXACT }, cantSplit: true, tableHeader: isHeader, children: cells.map((t, i) => cell(t, i, fill, c, bld)) });
      const bd = { style: BorderStyle.SINGLE, size: 4, color: 'C9D6E3' };
      children.push(
        new Table({
          width: { size: tw(b.widths.reduce((a, c) => a + c, 0)), type: WidthType.DXA },
          columnWidths: b.widths.map(tw),
          layout: TableLayoutType.FIXED,
          borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd },
          rows: [
            row(b.header, '#1f4e79', '#ffffff', true, true), // 表頭跨頁重複
            ...b.rows.map((r, ri) => {
              const emph = b.emphasisRows?.includes(ri) ?? false;
              return row(r, emph ? '#dce8f4' : ri % 2 ? '#f2f6fa' : '#ffffff', '#222222', emph);
            }),
          ],
        }),
      );
      spacer(b.after ?? 0);
    } else {
      children.push(
        new Paragraph({
          ...base,
          // 圖片段落不能用固定行高，Word 會把圖裁掉；改用最小行高
          spacing: { before: 0, after: 0, line: tw(b.h), lineRule: LineRuleType.AT_LEAST },
          children: [new ImageRun({ type: 'png', data: b.png, transformation: { width: b.w / 0.75, height: b.h / 0.75 } })],
        }),
      );
      spacer(b.after ?? 0);
    }
  }

  const gray = '8A97A5';
  const footer = new Footer({
    children: [
      new Paragraph({
        ...base,
        spacing: { line: tw(14), lineRule: LineRuleType.EXACT, before: 0, after: 0 },
        children: [
          new TextRun({ text: `${doc.footerText}｜第 `, font, size: 18, color: gray }),
          new TextRun({ children: [PageNumber.CURRENT], font, size: 18, color: gray }),
          new TextRun({ text: ' 頁，共 ', font, size: 18, color: gray }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font, size: 18, color: gray }),
          new TextRun({ text: ' 頁', font, size: 18, color: gray }),
        ],
      }),
    ],
  });

  const d = new Document({
    title: doc.title,
    creator: '問卷回饋小幫手',
    styles: { default: { document: { run: { font, size: 22 }, paragraph: { spacing: { before: 0, after: 0 } } } } },
    numbering: {
      config: [
        {
          reference: 'dot',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: tw(14), hanging: tw(14) } }, run: { font, color: '1F4E79' } } }],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            // docx 套件在橫式時會自行對調寬高，所以一律給直式尺寸
            size: { width: tw(Math.min(P.w, P.h)), height: tw(Math.max(P.w, P.h)), orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: { top: tw(P.mt), bottom: tw(P.mb), left: tw(P.mx), right: tw(P.mx), footer: tw(P.footerFromBottom), header: 0 },
          },
        },
        footers: { default: footer },
        children,
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(d));
}
