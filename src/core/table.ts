import { type Cell, cellText, isBlankCell } from './text';

/** 資料表：第一列標題，其餘為資料列。csv、xlsx、Google 試算表都先轉成這個形狀。 */
export interface Table {
  headers: string[];
  rows: Cell[][];
}

/** 讀檔介面：xlsx 與 Google 試算表的讀取器只要產生「已解析的列」即可。 */
export interface RowSource {
  /** 一個檔案可能有多個工作表。 */
  sheets(): Promise<{ name: string; rows: Cell[][] }[]>;
}

/** RFC 4180 的 csv 解析：支援 BOM、引號內逗號與換行、"" 跳脫、CRLF。 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let touched = false;
  const endRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = '';
    touched = false;
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === '') {
      inQuotes = true;
      touched = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
      touched = true;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      endRow();
    } else {
      field += ch;
      touched = true;
    }
  }
  if (touched || field !== '' || row.length > 0) endRow();
  return rows;
}

/**
 * 把列陣列整理成資料表：第一個非空白列當標題，資料列補齊到標題長度，
 * 整列空白的資料列略過。標題重複時保留（對應時會依序取用）。
 */
export function tableFromRows(raw: readonly (readonly Cell[])[]): Table {
  const first = raw.findIndex((r) => r.some((c) => !isBlankCell(c)));
  if (first < 0) return { headers: [], rows: [] };
  const headers = (raw[first] as readonly Cell[]).map(cellText);
  while (headers.length > 0 && headers[headers.length - 1] === '') headers.pop();
  const rows: Cell[][] = [];
  for (const r of raw.slice(first + 1)) {
    if (!r.some((c) => !isBlankCell(c))) continue;
    const padded: Cell[] = headers.map((_, i) => {
      const c = r[i] ?? null;
      return typeof c === 'string' ? c.trim() : c;
    });
    rows.push(padded);
  }
  return { headers, rows };
}

export function tableFromCsv(text: string, delimiter = ','): Table {
  return tableFromRows(parseCsv(text, delimiter));
}

/** 從 RowSource 取第 n 個工作表（預設第一個）；沒有工作表時回傳空表。 */
export async function tableFromSource(src: RowSource, sheetIndex = 0): Promise<Table> {
  const sheets = await src.sheets();
  const s = sheets[sheetIndex];
  return s ? tableFromRows(s.rows) : { headers: [], rows: [] };
}
