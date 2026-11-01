import { tableFromRows, type Table } from '../core';
import { checkAccount } from './account';
import { classifyGoogleError, failureMessage, type GoogleFailure } from './quota';
import type { GoogleServices } from './types';

export type ConnectResult =
  | { status: 'ok'; token: string; email: string }
  /** 學校帳號或其他非 Gmail：已撤銷權杖、沒有讀任何檔案。 */
  | { status: 'blocked'; domain: string | null; reason: 'not-gmail' | 'no-email' }
  | { status: 'cancelled' }
  | { status: 'failed'; failure: GoogleFailure; message: string };

/**
 * 登入 → 取信箱 → 判斷帳號。不是 Gmail（或取不到信箱）就立刻撤銷權杖並擋下，
 * 擋下之前不呼叫 Sheets／Picker，不讀任何檔案。
 */
export async function connectGoogle(svc: GoogleServices, opts?: { selectAccount?: boolean }): Promise<ConnectResult> {
  let token: string;
  try {
    token = await svc.auth.signIn({ selectAccount: opts?.selectAccount ?? true });
  } catch (err) {
    if (err instanceof Error && err.message === 'cancelled') return { status: 'cancelled' };
    return fail(err);
  }
  try {
    const verdict = checkAccount(await svc.drive.userEmail(token));
    if (verdict.allowed) return { status: 'ok', token, email: verdict.email };
    await safeRevoke(svc, token);
    return { status: 'blocked', domain: verdict.domain, reason: verdict.reason };
  } catch (err) {
    // 取信箱失敗也不能放行：無法確認是 Gmail，就撤銷並回報失敗
    await safeRevoke(svc, token);
    return fail(err);
  }
}

async function safeRevoke(svc: GoogleServices, token: string): Promise<void> {
  try {
    await svc.auth.revoke(token);
  } catch {
    /* 撤銷失敗不影響擋下；權杖不會被保存 */
  }
}

function fail(err: unknown): { status: 'failed'; failure: GoogleFailure; message: string } {
  const failure = classifyGoogleError(err);
  return { status: 'failed', failure, message: failureMessage(failure) };
}

export type ReadResult =
  | { status: 'ok'; spreadsheetId: string; name: string; sheetTitle: string; table: Table }
  | { status: 'cancelled' }
  | { status: 'empty'; name: string }
  | { status: 'failed'; failure: GoogleFailure; message: string };

/** 用 Picker 選一份試算表並直讀第一個有資料的工作表。 */
export async function pickAndRead(svc: GoogleServices, token: string): Promise<ReadResult> {
  try {
    const picked = await svc.picker.pickSpreadsheet(token);
    if (!picked) return { status: 'cancelled' };
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
    for (const sheetTitle of info.sheets) {
      const rows = await svc.sheets.values(token, spreadsheetId, sheetTitle);
      const table = tableFromRows(rows);
      if (table.headers.length > 0 && table.rows.length > 0) {
        return { status: 'ok', spreadsheetId, name: label, sheetTitle, table };
      }
    }
    return { status: 'empty', name: label };
  } catch (err) {
    return fail(err);
  }
}
