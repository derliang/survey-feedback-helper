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

/** 第一行 Tab 比逗號多就當成 tsv。 */
export function guessDelimiter(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  return (first.match(/\t/g) ?? []).length > (first.match(/,/g) ?? []).length ? '\t' : ',';
}

/** 去副檔名並去掉頭尾空白，當作問卷名稱的預設值。 */
export function surveyNameFromFile(name: string): string {
  return name.replace(/\.(xlsx|xls|csv|tsv)$/i, '').replace(/\s+/g, ' ').trim() || '未命名問卷';
}

/** 讀 xlsx 或 csv 成資料表；多個工作表時取第一個有資料的。 */
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
      const hit = sheets.map((s) => tableFromRows(s.rows)).find((t) => t.headers.length > 0);
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
