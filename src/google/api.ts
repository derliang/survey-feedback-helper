import type { Cell } from "../core/text";
import { type FetchLike, getJson, sendJson } from "./http";
import type { DriveApi, SheetInfo, SheetsApi } from "./types";

/** A1 表示法的工作表名稱要用單引號包起來，名稱內的單引號重複一次。 */
export function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export function createSheetsApi(fetchFn: FetchLike): SheetsApi {
  const base = "https://sheets.googleapis.com/v4/spreadsheets";
  return {
    async info(token, spreadsheetId): Promise<SheetInfo> {
      const body = (await getJson(
        fetchFn,
        `${base}/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`,
        token,
      )) as {
        properties?: { title?: string };
        sheets?: { properties?: { title?: string } }[];
      };
      return {
        title: body.properties?.title ?? "",
        sheets: (body.sheets ?? []).map((s) => s.properties?.title ?? ""),
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
      return (body.values ?? []).map((row) =>
        row.map((c) => (c == null ? "" : String(c))),
      );
    },
  };
}

/** Drive 檔名查詢字串：單引號與反斜線要跳脫。 */
export function quoteDriveName(name: string): string {
  return `'${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function createDriveApi(fetchFn: FetchLike): DriveApi {
  const files = "https://www.googleapis.com/drive/v3/files";
  const upload = "https://www.googleapis.com/upload/drive/v3/files";
  return {
    async saveText(token, name, text): Promise<string> {
      const q = encodeURIComponent(
        `name = ${quoteDriveName(name)} and trashed = false`,
      );
      const found = (await getJson(
        fetchFn,
        `${files}?q=${q}&spaces=drive&pageSize=1&fields=files(id)`,
        token,
      )) as { files?: { id?: string }[] };
      const id = found.files?.[0]?.id;
      if (id) {
        await sendJson(
          fetchFn,
          `${upload}/${encodeURIComponent(id)}?uploadType=media&fields=id`,
          token,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: text,
          },
        );
        return id;
      }
      const boundary = "sfh-" + Math.random().toString(36).slice(2);
      const part = (content: string) =>
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n`;
      const body =
        part(JSON.stringify({ name, mimeType: "application/json" })) +
        part(text) +
        `--${boundary}--`;
      const created = (await sendJson(
        fetchFn,
        `${upload}?uploadType=multipart&fields=id`,
        token,
        {
          method: "POST",
          headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
          body,
        },
      )) as { id?: string };
      return created.id ?? "";
    },
  };
}
