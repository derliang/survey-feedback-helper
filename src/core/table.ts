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

/** 0 起算的欄序轉成試算表欄字母（0→A、26→AA）。 */
export function columnLetter(i: number): string {
  let n = i;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function filledCount(r: readonly Cell[]): number {
  return r.filter((c) => !isBlankCell(c)).length;
}

/**
 * 欄名列偵測（Issue #209）：老師常在表格上方加標題文字（只有一兩格有字）。
 * 第一個非空白列的有字格數不到前 10 列最大值的一半時，改取之後第一個達到六成的列當欄名；否則維持原樣。
 */
function detectHeaderRow(raw: readonly (readonly Cell[])[], first: number): number {
  const window = raw.slice(first, first + 10);
  const max = Math.max(...window.map(filledCount));
  if (filledCount(raw[first] as readonly Cell[]) * 2 >= max) return first;
  const idx = window.findIndex((r) => filledCount(r) >= max * 0.6);
  return idx < 0 ? first : first + idx;
}

const SUMMARY_LABEL = /^(平均|合計|總計|小計|總平均)$/;

/**
 * 把列陣列整理成資料表：第一個非空白列當標題，資料列補齊到標題長度，
 * 整列空白的資料列略過。標題重複時保留（對應時會依序取用）。
 */
export function tableFromRows(raw: readonly (readonly Cell[])[]): Table {
  let first = raw.findIndex((r) => r.some((c) => !isBlankCell(c)));
  if (first < 0) return { headers: [], rows: [] };
  first = detectHeaderRow(raw, first);
  const headers = (raw[first] as readonly Cell[]).map(cellText);
  // 尾端沒有欄名的欄：整欄空白才略過；資料列有值就保留，給預設欄名請老師在欄位對應確認（Issue #124）
  const titleSkipped = first > raw.findIndex((r) => r.some((c) => !isBlankCell(c)));
  let body = raw.slice(first + 1);
  // 只在上方有標題文字的表格，才把最後一列「平均／合計」類統計列排除，避免誤刪真實回覆
  if (titleSkipped) {
    while (body.length > 0) {
      const lastRow = body[body.length - 1] as readonly Cell[];
      if (!lastRow.some((c) => !isBlankCell(c))) body = body.slice(0, -1);
      else if (lastRow.some((c) => typeof c === 'string' && SUMMARY_LABEL.test(c.trim()))) body = body.slice(0, -1);
      else break;
    }
  }
  const lastFilled = body.reduce((m, r) => {
    for (let i = r.length - 1; i > m; i--) if (!isBlankCell(r[i])) return i;
    return m;
  }, -1);
  let lastNamed = headers.length - 1;
  while (lastNamed >= 0 && headers[lastNamed] === '') lastNamed--;
  headers.length = Math.max(lastNamed, lastFilled) + 1;
  for (let i = lastNamed + 1; i < headers.length; i++) headers[i] = `未命名欄 ${columnLetter(i)}`;
  const rows: Cell[][] = [];
  for (const r of body) {
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
