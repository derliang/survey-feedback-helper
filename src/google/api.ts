import type { Cell } from '../core/text';
import { type FetchLike, getJson } from './http';
import type { DriveApi, SheetInfo, SheetsApi } from './types';

export function createDriveApi(fetchFn: FetchLike): DriveApi {
  return {
    async userEmail(token) {
      const body = (await getJson(
        fetchFn,
        'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',
        token,
      )) as { user?: { emailAddress?: string } };
      return body.user?.emailAddress ?? null;
    },
  };
}

/** A1 表示法的工作表名稱要用單引號包起來，名稱內的單引號重複一次。 */
export function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export function createSheetsApi(fetchFn: FetchLike): SheetsApi {
  const base = 'https://sheets.googleapis.com/v4/spreadsheets';
  return {
    async info(token, spreadsheetId): Promise<SheetInfo> {
      const body = (await getJson(
        fetchFn,
        `${base}/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`,
        token,
      )) as { properties?: { title?: string }; sheets?: { properties?: { title?: string } }[] };
      return {
        title: body.properties?.title ?? '',
        sheets: (body.sheets ?? []).map((s) => s.properties?.title ?? ''),
      };
    },
    async values(token, spreadsheetId, sheetTitle): Promise<Cell[][]> {
      // 用顯示的樣子讀（時間戳記等維持 Google 表單看到的文字），與讀 xlsx 的結果一致。
      const range = encodeURIComponent(quoteSheetTitle(sheetTitle));
      const body = (await getJson(
        fetchFn,
        `${base}/${encodeURIComponent(spreadsheetId)}/values/${range}?valueRenderOption=FORMATTED_VALUE`,
        token,
      )) as { values?: unknown[][] };
      return (body.values ?? []).map((row) => row.map((c) => (c == null ? '' : String(c))));
    },
  };
}
