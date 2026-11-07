import { tableFromRows, type Table } from "../core";
import { SignInCancelled, SignInPopupBlocked } from "./browser";
import {
  classifyGoogleError,
  failureMessage,
  type GoogleFailure,
} from "./quota";
import type { GoogleServices } from "./types";

export type ConnectResult =
  | { status: "ok"; token: string }
  | { status: "cancelled"; message: string }
  /** 彈出視窗沒開起來：message 教老師再按一次、換瀏覽器或允許彈出視窗，並指出 Excel 檔出口。 */
  | { status: "popup-blocked"; message: string }
  | { status: "failed"; failure: GoogleFailure; message: string };

export const POPUP_BLOCKED_MESSAGE =
  "沒能開啟 Google 登入視窗。請再按一次「前往 Google」；還是不行，請改用 Safari 或 Chrome（LINE 等 App 內建的瀏覽器常會擋），或到瀏覽器設定允許這個網站的彈出式視窗。也可以改用 Excel 檔：在 Google 試算表選「檔案」→「下載」→「Microsoft Excel (.xlsx)」，再把檔案拖進來。";

export const POPUP_CLOSED_MESSAGE =
  "登入視窗已關閉，沒有連接 Google。如果 Google 顯示「無法使用」或管理員限制的訊息（例如學校帳號被管理員限制第三方應用），請改用別的 Google 帳號，或改用 Excel 檔。";

/** 登入（任何 Google 帳號皆可，不限 Gmail）。呼叫前要先 preload 並確認 isReady，才能在點擊內開彈窗。 */
export async function connectGoogle(
  svc: GoogleServices,
  opts?: { selectAccount?: boolean },
): Promise<ConnectResult> {
  try {
    const token = await svc.auth.signIn({
      selectAccount: opts?.selectAccount ?? true,
    });
    return { status: "ok", token };
  } catch (err) {
    if (err instanceof SignInPopupBlocked)
      return { status: "popup-blocked", message: POPUP_BLOCKED_MESSAGE };
    if (err instanceof SignInCancelled)
      return { status: "cancelled", message: POPUP_CLOSED_MESSAGE };
    return fail(err);
  }
}

function fail(err: unknown): {
  status: "failed";
  failure: GoogleFailure;
  message: string;
} {
  const failure = classifyGoogleError(err);
  return { status: "failed", failure, message: failureMessage(failure) };
}

export type ReadResult =
  | {
      status: "ok";
      spreadsheetId: string;
      name: string;
      /** 第一個有資料的分頁（只有一個分頁有資料時就是它）。 */
      sheetTitle: string;
      table: Table;
      /** 全部有資料的分頁（2 個以上時讓老師選）與完全沒資料而略過的分頁名稱。 */
      sheets: { name: string; table: Table }[];
      skipped: string[];
    }
  | { status: "cancelled" }
  | { status: "empty"; name: string }
  | { status: "failed"; failure: GoogleFailure; message: string };

/** 用 Picker 選一份試算表並直讀有資料的分頁（2 個以上由畫面讓老師選）。 */
export async function pickAndRead(
  svc: GoogleServices,
  token: string,
): Promise<ReadResult> {
  try {
    const picked = await svc.picker.pickSpreadsheet(token);
    if (!picked) return { status: "cancelled" };
    return await readSpreadsheet(svc, token, picked.id, picked.name);
  } catch (err) {
    return fail(err);
  }
}

/** 重新讀取（用試算表 ID，讀到目前最新內容）。 */
export async function readSpreadsheet(
  svc: GoogleServices,
  token: string,
  spreadsheetId: string,
  name?: string,
): Promise<ReadResult> {
  try {
    const info = await svc.sheets.info(token, spreadsheetId);
    const label = name ?? info.title;
    const sheets: { name: string; table: Table }[] = [];
    const skipped: string[] = [];
    for (const sheetTitle of info.sheets) {
      const rows = await svc.sheets.values(token, spreadsheetId, sheetTitle);
      const table = tableFromRows(rows);
      if (table.headers.length > 0 && table.rows.length > 0) sheets.push({ name: sheetTitle, table });
      else skipped.push(sheetTitle);
    }
    const first = sheets[0];
    if (!first) return { status: "empty", name: label };
    return {
      status: "ok",
      spreadsheetId,
      name: label,
      sheetTitle: first.name,
      table: first.table,
      sheets,
      skipped,
    };
  } catch (err) {
    return fail(err);
  }
}
