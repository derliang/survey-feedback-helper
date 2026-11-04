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

/** 讀 xlsx 或 csv 成資料表；多個工作表時取第一個「有欄名也有資料列」的（第一張只是說明頁也讀得到後面的回覆）。 */
export async function tableFromFile(file: FileLike): Promise<Table> {
  const lower = file.name.trim().toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let table: Table;
  try {
    if (/\.(csv|tsv|txt)$/.test(lower)) {
      const text = decodeCsv(bytes);
      table = tableFromCsv(text, guessDelimiter(text));
    } else if (/\.xlsx$/.test(lower)) {
      const sheets = await xlsxSource(bytes).sheets();
      const tables = sheets.map((s) => tableFromRows(s.rows));
      const hit = tables.find((t) => t.headers.length > 0 && t.rows.length > 0) ?? tables.find((t) => t.headers.length > 0);
      table = hit ?? { headers: [], rows: [] };
    } else if (/\.(xls|xlsm|ods)$/.test(lower)) {
      throw new LoadError('oldExcel');
    } else {
      throw new LoadError('unsupported');
    }
  } catch (e) {
    if (e instanceof LoadError) throw e;
    throw new LoadError('unreadable');
  }
  if (table.headers.length === 0 || table.rows.length === 0) throw new LoadError('empty');
  return table;
}
