import { type Table, tableFromCsv, tableFromRows } from '../core';
import { xlsxSource } from '../core/xlsx';

export type LoadFailure = 'unsupported' | 'oldExcel' | 'empty' | 'unreadable';

export class LoadError extends Error {
  constructor(public reason: LoadFailure) {
    super(reason);
  }
}

export interface FileLike {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** csv 解碼：先試 UTF-8，不合法再退回 Big5（舊版 Excel 另存的 csv）。 */
export function decodeCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('big5').decode(bytes);
  }
}

/** 第一筆記錄（引號內的換行不算換行）裡，引號外的 Tab 比逗號多就當成 tsv；引號內的逗號、Tab 不計。 */
export function guessDelimiter(text: string): string {
  let tabs = 0;
  let commas = 0;
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted) {
      if (ch === '\n' || ch === '\r') break;
      if (ch === '\t') tabs++;
      else if (ch === ',') commas++;
    }
  }
  return tabs > commas ? '\t' : ',';
}

/** 去副檔名並去掉頭尾空白，當作問卷名稱的預設值。 */
export function surveyNameFromFile(name: string): string {
  return name.replace(/\.(xlsx|xls|csv|tsv)$/i, '').replace(/\s+/g, ' ').trim() || '未命名問卷';
}

/** 一張「有欄名也有資料列」的工作表（csv 只有一張，名稱是空字串）。 */
export interface SheetCandidate {
  name: string;
  table: Table;
}

export interface LoadedSheets {
  /** 有資料的工作表，依檔案內的順序。 */
  sheets: SheetCandidate[];
  /** 完全沒有資料而略過的工作表名稱。 */
  skipped: string[];
}

/** 建議的工作表＝資料列最多者（一樣多取前面的）。 */
export function recommendedSheet(sheets: readonly SheetCandidate[]): number {
  let best = 0;
  sheets.forEach((s, i) => {
    if (s.table.rows.length > (sheets[best]?.table.rows.length ?? -1)) best = i;
  });
  return best;
}

/** 讀 xlsx 或 csv，回傳所有有資料的工作表（沒有任何資料就丟 LoadError('empty')）。 */
export async function sheetsFromFile(file: FileLike): Promise<LoadedSheets> {
  const lower = file.name.trim().toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let out: LoadedSheets;
  try {
    if (/\.(csv|tsv|txt)$/.test(lower)) {
      const text = decodeCsv(bytes);
      out = { sheets: [{ name: '', table: tableFromCsv(text, guessDelimiter(text)) }], skipped: [] };
    } else if (/\.xlsx$/.test(lower)) {
      const raw = await xlsxSource(bytes).sheets();
      const all = raw.map((s) => ({ name: s.name, table: tableFromRows(s.rows) }));
      out = {
        sheets: all.filter((s) => s.table.headers.length > 0 && s.table.rows.length > 0),
        skipped: all.filter((s) => s.table.headers.length === 0 || s.table.rows.length === 0).map((s) => s.name),
      };
    } else if (/\.(xls|xlsm|ods)$/.test(lower)) {
      throw new LoadError('oldExcel');
    } else {
      throw new LoadError('unsupported');
    }
  } catch (e) {
    if (e instanceof LoadError) throw e;
    throw new LoadError('unreadable');
  }
  if (out.sheets.length === 0 || out.sheets.every((s) => s.table.headers.length === 0 || s.table.rows.length === 0)) throw new LoadError('empty');
  return out;
}

/** 讀 xlsx 或 csv 成資料表；多個工作表時取第一個「有欄名也有資料列」的（開問卷時改由老師選，見 store 的 sheetPick）。 */
export async function tableFromFile(file: FileLike): Promise<Table> {
  const { sheets } = await sheetsFromFile(file);
  return (sheets[0] as SheetCandidate).table;
}
