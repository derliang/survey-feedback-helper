import type { Cell } from "../core/text";

/** Google 權限只用 drive.file（硬規則 4；check:google-scopes 會擋其他範圍）。 */
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export interface GoogleConfig {
  clientId: string;
  apiKey: string;
  /** Google Cloud 專案編號，Picker 的 setAppId 用。 */
  appId: string;
}

/** Google API 回應失敗：status 是 HTTP 狀態，reason 是 Google 錯誤內的 reason／message。 */
export class GoogleApiError extends Error {
  constructor(
    public status: number,
    public reason = "",
  ) {
    super(`Google API ${status} ${reason}`.trim());
  }
}

/**
 * 登入：回傳存取權杖。使用者關掉視窗時 reject SignInCancelled；彈窗被瀏覽器擋下時 reject SignInPopupBlocked。
 * signIn 必須在使用者點擊的同步呼叫內開彈窗，所以登入腳本要先用 preload 載好（isReady 為 true 才可呼叫）。
 */
export interface GoogleAuth {
  /** 預先下載登入腳本（可重複呼叫）；失敗 reject，之後可再試。 */
  preload(): Promise<void>;
  /** 登入腳本是否已載好；沒載好時按鈕要停用。 */
  isReady(): boolean;
  signIn(opts?: { selectAccount?: boolean }): Promise<string>;
  revoke(token: string): Promise<void>;
}

export interface SheetInfo {
  title: string;
  sheets: string[];
}

export interface SheetsApi {
  info(token: string, spreadsheetId: string): Promise<SheetInfo>;
  /** 讀一個工作表的全部儲存格（即時內容，不是匯出快照）。 */
  values(
    token: string,
    spreadsheetId: string,
    sheetTitle: string,
  ): Promise<Cell[][]>;
}

export interface PickedFile {
  id: string;
  name: string;
}

export interface PickerApi {
  /** 開啟 Picker 選一份 Google 試算表；使用者取消回 null。 */
  pickSpreadsheet(token: string): Promise<PickedFile | null>;
}

export interface GoogleServices {
  auth: GoogleAuth;
  sheets: SheetsApi;
  picker: PickerApi;
}
