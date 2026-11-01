// xlsx 輸出：自寫（fflate 打包 zip）。沒有用 ExcelJS，原因見 docs/decisions/2026-11-01-xlsx輸出與分支保護.md。
// 支援：多工作表、欄寬、凍結列、固定幾種儲存格樣式（標題、表頭、文字、數字 0.0、強調列）；文字用內嵌字串。
import { zipSync, strToU8 } from 'fflate';
import type { ClassSummaryInput } from './templates';

export type XStyle = 'title' | 'header' | 'text' | 'num' | 'emphText' | 'emphNum';
export type XValue = string | number | null;
export type XCell = XValue | { v: XValue; s: XStyle };

export interface XSheet {
  name: string;
  rows: XCell[][];
  /** 欄寬（字元數）。 */
  colWidths?: number[];
  /** 從上面凍結幾列（表頭）。 */
  freezeRows?: number;
}

// styles.xml 的 cellXfs 順序 = 這個陣列順序（0 = 預設）
const STYLE_INDEX: Record<XStyle, number> = { title: 1, header: 2, text: 3, num: 4, emphText: 5, emphNum: 6 };

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>
<fonts count="4">
<font><sz val="11"/><name val="Microsoft JhengHei"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="FF1F4E79"/><name val="Microsoft JhengHei"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Microsoft JhengHei"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDCE8F4"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFC9D6E3"/></left><right style="thin"><color rgb="FFC9D6E3"/></right><top style="thin"><color rgb="FFC9D6E3"/></top><bottom style="thin"><color rgb="FFC9D6E3"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const esc = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 欄號轉字母：0 → A、26 → AA。 */
export function colName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** 工作表名稱：最多 31 字、不可含 []:*?/\、不可重複（同名加序號）。 */
export function safeSheetName(name: string, used: Set<string>): string {
  const base = (name.replace(/[[\]:*?/\\]/g, '_').trim() || '工作表').slice(0, 31);
  let out = base,
    n = 2;
  while (used.has(out.toLowerCase())) {
    const suffix = ` (${n++})`;
    out = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(out.toLowerCase());
  return out;
}

function sheetXml(sh: XSheet): string {
  const rows = sh.rows
    .map((row, r) => {
      const cells = row
        .map((c, ci) => {
          const cell = c !== null && typeof c === 'object' ? c : { v: c, s: undefined };
          const ref = `${colName(ci)}${r + 1}`;
          const style = cell.s ? ` s="${STYLE_INDEX[cell.s]}"` : '';
          if (cell.v === null || cell.v === undefined || cell.v === '') return style ? `<c r="${ref}"${style}/>` : '';
          if (typeof cell.v === 'number') return Number.isFinite(cell.v) ? `<c r="${ref}"${style}><v>${cell.v}</v></c>` : `<c r="${ref}"${style}/>`;
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  const cols = sh.colWidths?.length
    ? `<cols>${sh.colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const freeze = sh.freezeRows
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.freezeRows}" topLeftCell="A${sh.freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

/** 組出 xlsx 檔（Uint8Array）。 */
export function buildXlsx(sheets: XSheet[]): Uint8Array {
  if (sheets.length === 0) throw new Error('至少要有一個工作表');
  const used = new Set<string>();
  const names = sheets.map((s) => safeSheetName(s.name, used));
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}</Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names
        .map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    'xl/styles.xml': strToU8(STYLES_XML),
  };
  sheets.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s));
  });
  return zipSync(files, { level: 6 });
}

/** 班級總表的 xlsx（數字存成數字，可再計算；平均列強調）。 */
export function classSummaryXlsx(inp: ClassSummaryInput): Uint8Array {
  const n = (v: number | null): XCell => ({ v, s: 'num' });
  const en = (v: number | null): XCell => ({ v, s: 'emphNum' });
  const rows: XCell[][] = [
    [{ v: `${inp.className} ${inp.topic} 班級總表`, s: 'title' }],
    [],
    ['座號', '姓名', ...inp.items, '平均'].map((v) => ({ v, s: 'header' as const })),
    ...inp.students.map((s) => [{ v: String(s.seat), s: 'text' as const }, { v: s.name, s: 'text' as const }, ...s.values.map(n), n(s.mean)]),
    [{ v: '', s: 'emphText' as const }, { v: '班級平均', s: 'emphText' as const }, ...inp.classMeans.map(en), en(inp.classOverall)],
  ];
  return buildXlsx([{ name: '班級總表', rows, colWidths: [8, 14, ...inp.items.map(() => 14), 10], freezeRows: 3 }]);
}
