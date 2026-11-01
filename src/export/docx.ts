// Word（docx）輸出器：版面規則與 PDF 一致（固定行高、固定欄寬、關閉寡行控制與中英自動間距、圖片段落用最小行高）。
// 字型用系統字型（見 src/fonts/word-fonts.ts），不內嵌。
// 多欄、標題區、摘要數字列、稱讚提示卡都用表格排版；Word 做不到的效果（圓角頁框、圓角底色）見 src/editor/word.ts 的標示。
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { wordFontFor } from '../fonts/word-fonts';
import { contentWidth, GEO, HERO_FILL, pageOf, TONES, type Block, type ColumnsBlock, type DocModel } from './model';

const tw = (pt: number) => Math.round(pt * 20);
const col = (h: string) => h.slice(1).toUpperCase();

/** Word 要在 settings.xml 開 displayBackgroundShape 才會顯示頁面背景色；docx 套件沒提供，打包後補上。 */
function enableBackground(bytes: Uint8Array): Uint8Array {
  const files = unzipSync(bytes);
  const f = files['word/settings.xml'];
  if (!f) return bytes;
  let xml = strFromU8(f);
  if (xml.includes('displayBackgroundShape')) return bytes;
  // schema 順序：displayBackgroundShape 在 zoom 之後、其他設定之前
  const m = /<w:zoom[^>]*\/>/.exec(xml);
  xml = m ? xml.replace(m[0], `${m[0]}<w:displayBackgroundShape/>`) : xml.replace(/(<w:settings[^>]*>)/, '$1<w:displayBackgroundShape/>');
  files['word/settings.xml'] = strToU8(xml);
  return zipSync(files);
}

export async function renderDocx(doc: DocModel, opts: { fontName?: string } = {}): Promise<Uint8Array> {
  const D = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Footer, Header, AlignmentType, WidthType, LineRuleType, HeightRule, VerticalAlign, ShadingType, TableLayoutType, BorderStyle, PageNumber, LevelFormat, PageOrientation, PageBorderDisplay, PageBorderOffsetFrom, TabStopType } = D;
  const FONT = opts.fontName ?? wordFontFor('auto');
  const font = { name: FONT, eastAsia: FONT, ascii: FONT, hAnsi: FONT };
  const P = pageOf(doc);
  const landscape = P.w > P.h;
  const lineH = doc.lineH;
  const deco = doc.deco;
  const base = { widowControl: false, autoSpaceEastAsianText: false };
  type Node = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
  const children: Node[] = [];
  const aligns = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };
  const cellNoBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const emptyPara = (pt = 2) => new Paragraph({ ...base, spacing: { line: tw(pt), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: '', font, size: 2 })] });
  /** 表格儲存格的最後一個元素必須是段落。 */
  const ensureEnd = (nodes: Node[]) => {
    if (nodes.length === 0 || nodes[nodes.length - 1] instanceof Table) nodes.push(emptyPara());
    return nodes;
  };
  const scaledW = (ws: number[], w: number) => {
    const sum = ws.reduce((a, c) => a + c, 0);
    return Math.abs(sum - w) < 0.5 || sum === 0 ? ws : ws.map((x) => (x * w) / sum);
  };
  const colWidths = (b: ColumnsBlock, w: number): number[] => {
    const n = b.cols.length;
    const gap = b.gap ?? GEO.colGap;
    const weights = b.widths && b.widths.length === n ? b.widths : b.cols.map(() => 1);
    const sum = weights.reduce((a, c) => a + c, 0) || 1;
    return weights.map((wt) => ((w - gap * (n - 1)) * wt) / sum);
  };
  /** 單格表格（標題區、提示卡）：底色＋可選左側色條。 */
  const boxTable = (w: number, fill: string, barColor: string | undefined, paras: Node[], padPt: number) =>
    new Table({
      width: { size: tw(w), type: WidthType.DXA },
      columnWidths: [tw(w)],
      layout: TableLayoutType.FIXED,
      borders: noBorders,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: tw(w), type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: col(fill), color: 'auto' },
              margins: { top: tw(padPt), bottom: tw(padPt), left: tw(padPt), right: tw(padPt) },
              borders: barColor ? { ...cellNoBorders, left: { style: BorderStyle.SINGLE, size: GEO.calloutBar * 8, color: col(barColor) } } : cellNoBorders,
              children: ensureEnd(paras),
            }),
          ],
        }),
      ],
    });

  const blockNodes = (b: Block, w: number): Node[] => {
    const out: Node[] = [];
    const sp = (pt: number) => {
      if (pt > 0) out.push(emptyPara(pt));
    };
    if (b.type !== 'pagebreak') sp(b.before ?? 0);
    if (b.type === 'heading' || b.type === 'text') {
      const lh = b.type === 'heading' ? Math.round(b.size * 1.5) : lineH;
      out.push(
        new Paragraph({
          ...base,
          keepNext: b.type === 'heading', // 標題與下一段同頁，與 PDF 一致
          spacing: { line: tw(lh), lineRule: LineRuleType.EXACT, before: 0, after: tw(b.after ?? 0) },
          ...(b.bg ? { shading: { type: ShadingType.CLEAR, fill: col(b.bg), color: 'auto' }, indent: { left: tw(GEO.textPad), right: tw(GEO.textPad) } } : {}),
          children: [new TextRun({ text: b.text, font, size: b.size * 2, bold: b.type === 'heading', color: col(b.color ?? '#222222') })],
        }),
      );
    } else if (b.type === 'bullets') {
      b.items.forEach((item, i) =>
        out.push(
          new Paragraph({
            ...base,
            numbering: { reference: 'dot', level: 0 },
            spacing: { line: tw(lineH), lineRule: LineRuleType.EXACT, before: 0, after: tw(i === b.items.length - 1 ? (b.after ?? 0) : 3) },
            children: [new TextRun({ text: item, font, size: b.size * 2, color: '222222' })],
          }),
        ),
      );
    } else if (b.type === 'table') {
      const widths = scaledW(b.widths, w);
      const cell = (txt: string, i: number, fill: string, c: string, bld: boolean) =>
        new TableCell({
          width: { size: tw(widths[i] ?? 0), type: WidthType.DXA },
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
      out.push(
        new Table({
          width: { size: tw(widths.reduce((a, c) => a + c, 0)), type: WidthType.DXA },
          columnWidths: widths.map(tw),
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
      sp(b.after ?? 0);
    } else if (b.type === 'pagebreak') {
      out.push(new Paragraph({ ...base, pageBreakBefore: true, spacing: { line: tw(2), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: '', font, size: 2 })] }));
    } else if (b.type === 'rule') {
      out.push(
        new Paragraph({
          ...base,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: col(b.color ?? '#c9d6e3'), space: 0 } },
          spacing: { line: tw(2), lineRule: LineRuleType.EXACT, before: 0, after: tw(b.after ?? 0) },
          children: [new TextRun({ text: '', font, size: 2 })],
        }),
      );
    } else if (b.type === 'image') {
      const k = Math.min(1, w / b.w);
      out.push(
        new Paragraph({
          ...base,
          // 圖片段落不能用固定行高，Word 會把圖裁掉；改用最小行高
          spacing: { before: 0, after: 0, line: tw(b.h * k), lineRule: LineRuleType.AT_LEAST },
          children: [new ImageRun({ type: 'png', data: b.png, transformation: { width: (b.w * k) / 0.75, height: (b.h * k) / 0.75 } })],
        }),
      );
      sp(b.after ?? 0);
    } else if (b.type === 'hero') {
      const size = b.size ?? 22;
      const c = col(b.color ?? '#ffffff');
      const paras: Node[] = [
        new Paragraph({ ...base, spacing: { line: tw(Math.round(size * 1.5)), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: b.title, font, size: size * 2, bold: true, color: c })] }),
      ];
      if (b.subtitle)
        paras.push(new Paragraph({ ...base, spacing: { line: tw(GEO.heroSubLh), lineRule: LineRuleType.EXACT, before: tw(4), after: 0 }, children: [new TextRun({ text: b.subtitle, font, size: GEO.heroSubSize * 2, color: c })] }));
      out.push(boxTable(w, b.fill ?? HERO_FILL, undefined, paras, GEO.heroPad));
      sp(b.after ?? 0);
    } else if (b.type === 'stats') {
      const n = Math.max(1, b.cards.length);
      const cw = w / n;
      const gapB = { style: BorderStyle.SINGLE, size: GEO.statsGap * 4, color: 'FFFFFF' }; // 白色粗框線當欄距
      out.push(
        new Table({
          width: { size: tw(w), type: WidthType.DXA },
          columnWidths: b.cards.map(() => tw(cw)),
          layout: TableLayoutType.FIXED,
          borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: gapB },
          rows: [
            new TableRow({
              cantSplit: true,
              height: { value: tw(GEO.statsH), rule: HeightRule.EXACT },
              children: b.cards.map(
                (it) =>
                  new TableCell({
                    width: { size: tw(cw), type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: col(b.fill ?? '#fff1de'), color: 'auto' },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({ ...base, alignment: AlignmentType.CENTER, spacing: { line: tw(32), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: it.value, font, size: GEO.statsValueSize * 2, bold: true, color: col(b.color ?? HERO_FILL) })] }),
                      new Paragraph({ ...base, alignment: AlignmentType.CENTER, spacing: { line: tw(18), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: it.label, font, size: GEO.statsLabelSize * 2, color: '66554A' })] }),
                    ],
                  }),
              ),
            }),
          ],
        }),
      );
      sp(b.after ?? 0);
    } else if (b.type === 'callout') {
      const t = TONES[b.tone];
      const paras: Node[] = [];
      if (b.title) paras.push(new Paragraph({ ...base, spacing: { line: tw(GEO.calloutTitleLh), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: b.title, font, size: GEO.calloutSize * 2, bold: true, color: col(t.ink) })] }));
      paras.push(new Paragraph({ ...base, spacing: { line: tw(lineH), lineRule: LineRuleType.EXACT, before: 0, after: 0 }, children: [new TextRun({ text: b.text, font, size: GEO.calloutSize * 2, color: '222222' })] }));
      out.push(boxTable(w, t.fill, t.bar, paras, GEO.calloutPad));
      sp(b.after ?? 0);
    } else {
      // 多欄：無框線的一列表格，欄與欄之間用空白欄當欄距
      const ws = colWidths(b, w);
      const gap = b.gap ?? GEO.colGap;
      const cells: InstanceType<typeof TableCell>[] = [];
      const grid: number[] = [];
      const zero = { top: 0, bottom: 0, left: 0, right: 0 };
      b.cols.forEach((c, i) => {
        const nodes = ensureEnd(c.flatMap((x) => blockNodes(x, ws[i]!)));
        cells.push(new TableCell({ width: { size: tw(ws[i]!), type: WidthType.DXA }, margins: zero, borders: cellNoBorders, children: nodes }));
        grid.push(tw(ws[i]!));
        if (i < b.cols.length - 1) {
          cells.push(new TableCell({ width: { size: tw(gap), type: WidthType.DXA }, margins: zero, borders: cellNoBorders, children: [emptyPara()] }));
          grid.push(tw(gap));
        }
      });
      out.push(new Table({ width: { size: tw(w), type: WidthType.DXA }, columnWidths: grid, layout: TableLayoutType.FIXED, borders: noBorders, rows: [new TableRow({ children: cells })] }));
      sp(b.after ?? 0);
    }
    return out;
  };

  for (const b of doc.blocks) children.push(...blockNodes(b, contentWidth(P)));

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

  // 頁首：左邊文字、右邊 Logo（Word 沒有逐頁固定位置的圖，所以放頁首，見 wordNotes）
  const headerRuns: InstanceType<typeof TextRun | typeof ImageRun>[] = [];
  if (deco?.headerText) headerRuns.push(new TextRun({ text: deco.headerText, font, size: 18, color: gray }));
  if (deco?.logo) {
    const hh = Math.min(deco.logo.h, P.mt - 24),
      ww = deco.logo.w * (hh / deco.logo.h);
    headerRuns.push(new TextRun({ text: '\t', font }), new ImageRun({ type: 'png', data: deco.logo.png, transformation: { width: ww / 0.75, height: hh / 0.75 } }));
  }
  const header = headerRuns.length
    ? new Header({
        children: [
          new Paragraph({
            ...base,
            tabStops: [{ type: TabStopType.RIGHT, position: tw(contentWidth(P)) }],
            spacing: { line: tw(Math.max(14, Math.min(deco?.logo?.h ?? 0, P.mt - 24) + 2)), lineRule: LineRuleType.AT_LEAST, before: 0, after: 0 },
            children: headerRuns,
          }),
        ],
      })
    : undefined;

  const fr = deco?.frame;
  const pageBorder = fr ? { style: BorderStyle.SINGLE, size: Math.max(2, Math.min(96, Math.round(fr.width * 8))), color: col(fr.color), space: 18 } : undefined;

  const d = new Document({
    title: doc.title,
    creator: '問卷回饋小幫手',
    ...(deco?.background ? { background: { color: col(deco.background) } } : {}),
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
            margin: { top: tw(P.mt), bottom: tw(P.mb), left: tw(P.mx), right: tw(P.mx), footer: tw(P.footerFromBottom), header: tw(deco?.logo ? 14 : P.mt * 0.4) },
            ...(pageBorder
              ? {
                  borders: {
                    pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE },
                    pageBorderTop: pageBorder,
                    pageBorderBottom: pageBorder,
                    pageBorderLeft: pageBorder,
                    pageBorderRight: pageBorder,
                  },
                }
              : {}),
          },
        },
        ...(header ? { headers: { default: header } } : {}),
        footers: { default: footer },
        children,
      },
    ],
  });
  const bytes = new Uint8Array(await Packer.toArrayBuffer(d));
  return deco?.background ? enableBackground(bytes) : bytes;
}
