import type { Cell } from './text';
import type { RowSource } from './table';

/**
 * xlsx 唯讀解析的薄封裝：用 fflate 解 zip（延遲載入，硬規則 9），
 * 自己讀 sharedStrings、styles（判斷日期格式）與各工作表的儲存格值。
 * 只讀「值」：公式取快取的計算結果、日期取 Date（以 UTC 牆上時間表示）。
 * 不讀樣式、合併儲存格、圖表。xlsx 輸出另案處理。
 */
export function xlsxSource(data: ArrayBuffer | Uint8Array): RowSource {
  return {
    async sheets() {
      const { unzipSync, strFromU8 } = await import('fflate');
      const files = unzipSync(data instanceof Uint8Array ? data : new Uint8Array(data));
      const text = (path: string): string | null => {
        const f = files[path];
        return f ? strFromU8(f) : null;
      };
      return parseXlsxParts({
        workbook: text('xl/workbook.xml'),
        rels: text('xl/_rels/workbook.xml.rels'),
        sharedStrings: text('xl/sharedStrings.xml'),
        styles: text('xl/styles.xml'),
        sheet: (target) => text(target),
      });
    },
  };
}

export interface XlsxParts {
  workbook: string | null;
  rels: string | null;
  sharedStrings: string | null;
  styles: string | null;
  /** 取工作表 XML；path 為 zip 內完整路徑，如 xl/worksheets/sheet1.xml。 */
  sheet: (path: string) => string | null;
}

export function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag);
  return m ? decodeXml(m[1] as string) : null;
}

/** 取 <t>…</t> 的文字（含富文字多段），略過注音 <rPh>。 */
function textOf(xml: string): string {
  const noPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let out = '';
  for (const m of noPhonetic.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) out += decodeXml(m[1] ?? '');
  return out;
}

function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map((m) => textOf(m[1] ?? ''));
}

const BUILTIN_DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

function isDateFormat(code: string): boolean {
  const stripped = code.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[[^\]]*\]/g, '');
  return /[ymdhs]/i.test(stripped);
}

/** 回傳每個 cellXfs 索引是否為日期格式。 */
function parseDateStyles(xml: string | null): boolean[] {
  if (!xml) return [];
  const custom = new Map<number, string>();
  for (const m of xml.matchAll(/<numFmt\b([^>]*?)\/?>/g)) {
    const id = attr(m[1] ?? '', 'numFmtId');
    const code = attr(m[1] ?? '', 'formatCode');
    if (id !== null && code !== null) custom.set(Number(id), code);
  }
  const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (!xfs) return [];
  return [...(xfs[1] ?? '').matchAll(/<xf\b([^>]*?)\/?>/g)].map((m) => {
    const id = Number(attr(m[1] ?? '', 'numFmtId') ?? 0);
    const code = custom.get(id);
    return code !== undefined ? isDateFormat(code) : BUILTIN_DATE_IDS.has(id);
  });
}

function colIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function rowIndex(ref: string): number {
  return Number(/\d+/.exec(ref)?.[0] ?? 1) - 1;
}

export function serialToDate(serial: number, date1904: boolean): Date {
  const base = date1904 ? 24107 : 25569;
  return new Date(Math.round((serial - base) * 86400000));
}

function parseSheet(xml: string, shared: string[], dateStyles: boolean[], date1904: boolean): Cell[][] {
  const rows: Cell[][] = [];
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const tag = m[1] ?? '';
    const body = m[2] ?? '';
    const ref = attr(tag, 'r');
    if (ref === null) continue;
    const type = attr(tag, 't');
    const style = Number(attr(tag, 's') ?? 0);
    const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];
    let value: Cell = null;
    if (type === 'inlineStr') value = textOf(/<is\b[^>]*>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? '');
    else if (v !== undefined) {
      const raw = decodeXml(v);
      if (type === 's') value = shared[Number(raw)] ?? null;
      else if (type === 'str') value = raw;
      else if (type === 'b') value = raw === '1';
      else if (type === 'e') value = null;
      else if (type === 'd') value = new Date(raw.endsWith('Z') ? raw : raw + 'Z');
      else {
        const n = Number(raw);
        value = Number.isFinite(n) ? (dateStyles[style] ? serialToDate(n, date1904) : n) : null;
      }
    }
    const r = rowIndex(ref);
    const row = (rows[r] ??= []);
    row[colIndex(ref)] = value;
  }
  for (let i = 0; i < rows.length; i++) {
    const row = (rows[i] ??= []);
    for (let j = 0; j < row.length; j++) row[j] ??= null;
  }
  return rows;
}

/** 純文字層的解析（不碰 zip），方便單元測試。 */
export function parseXlsxParts(parts: XlsxParts): { name: string; rows: Cell[][] }[] {
  if (!parts.workbook) return [];
  const shared = parseSharedStrings(parts.sharedStrings);
  const dateStyles = parseDateStyles(parts.styles);
  const date1904 = /<workbookPr\b[^>]*date1904="(1|true)"/.test(parts.workbook);
  const targets = new Map<string, string>();
  for (const m of (parts.rels ?? '').matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = attr(m[1] ?? '', 'Id');
    const target = attr(m[1] ?? '', 'Target');
    if (id !== null && target !== null) targets.set(id, target);
  }
  const out: { name: string; rows: Cell[][] }[] = [];
  let n = 0;
  for (const m of parts.workbook.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    n++;
    const tag = m[1] ?? '';
    const name = attr(tag, 'name') ?? `Sheet${n}`;
    const rid = attr(tag, 'r:id');
    const target = rid !== null ? targets.get(rid) : undefined;
    const path = target ? (target.startsWith('/') ? target.slice(1) : `xl/${target}`) : `xl/worksheets/sheet${n}.xml`;
    const xml = parts.sheet(path);
    out.push({ name, rows: xml ? parseSheet(xml, shared, dateStyles, date1904) : [] });
  }
  return out;
}
