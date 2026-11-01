// 與真實 Google 腳本（GIS、Picker）接合的薄層；邏輯很少，單元測試以假的全域物件驗證。
// 這裡的行為都「待實測」（需要使用者建好 OAuth 用戶端 ID），見 docs/decisions/2026-11-01-Google登入軌文件重核.md。
import { GAPI_URL, GIS_URL, type ScriptLoader } from './loader';
import { DRIVE_FILE_SCOPE, type GoogleAuth, type GoogleConfig, type PickedFile, type PickerApi } from './types';

interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}
interface GisGlobal {
  accounts: {
    oauth2: {
      initTokenClient(cfg: {
        client_id: string;
        scope: string;
        callback: (r: TokenResponse) => void;
        error_callback?: (e: { type?: string }) => void;
      }): TokenClient;
      revoke(token: string, done: () => void): void;
    };
  };
}

export class SignInCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

export function createGoogleAuth(
  config: Pick<GoogleConfig, 'clientId'>,
  load: ScriptLoader,
  getGlobal: () => GisGlobal | undefined,
): GoogleAuth {
  return {
    async signIn(opts) {
      await load(GIS_URL);
      const gis = getGlobal();
      if (!gis) throw new TypeError('Google 登入程式沒有載入');
      return new Promise<string>((resolve, reject) => {
        const client = gis.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: DRIVE_FILE_SCOPE,
          callback: (r) => {
            if (r.access_token) resolve(r.access_token);
            else reject(new SignInCancelled());
          },
          // 使用者關掉視窗或被瀏覽器擋彈出視窗時走這裡
          error_callback: () => reject(new SignInCancelled()),
        });
        client.requestAccessToken({ prompt: opts?.selectAccount ? 'select_account' : '' });
      });
    },
    async revoke(token) {
      await load(GIS_URL);
      const gis = getGlobal();
      if (!gis) return;
      await new Promise<void>((resolve) => gis.accounts.oauth2.revoke(token, () => resolve()));
    },
  };
}

interface PickerDoc {
  id: string;
  name: string;
}
interface PickerResponse {
  action: string;
  docs?: PickerDoc[];
}
interface PickerBuilderLike {
  addView(v: unknown): PickerBuilderLike;
  setOAuthToken(t: string): PickerBuilderLike;
  setDeveloperKey(k: string): PickerBuilderLike;
  setAppId(id: string): PickerBuilderLike;
  setCallback(cb: (r: PickerResponse) => void): PickerBuilderLike;
  build(): { setVisible(v: boolean): void };
}
interface GapiGlobal {
  gapi: { load(name: string, cb: () => void): void };
  google: {
    picker: {
      PickerBuilder: new () => PickerBuilderLike;
      DocsView: new (viewId: unknown) => { setMimeTypes(m: string): unknown };
      ViewId: { SPREADSHEETS: unknown };
      Action: { PICKED: string; CANCEL: string };
    };
  };
}

export function createPicker(
  config: Pick<GoogleConfig, 'apiKey' | 'appId'>,
  load: ScriptLoader,
  getGlobal: () => GapiGlobal | undefined,
): PickerApi {
  return {
    async pickSpreadsheet(token) {
      await load(GAPI_URL);
      const g = getGlobal();
      if (!g) throw new TypeError('Google 選檔程式沒有載入');
      await new Promise<void>((resolve) => g.gapi.load('picker', resolve));
      const p = g.google.picker;
      return new Promise<PickedFile | null>((resolve) => {
        const view = new p.DocsView(p.ViewId.SPREADSHEETS);
        new p.PickerBuilder()
          .addView(view)
          .setOAuthToken(token)
          .setDeveloperKey(config.apiKey)
          .setAppId(config.appId)
          .setCallback((r) => {
            if (r.action === p.Action.PICKED && r.docs?.[0]) resolve({ id: r.docs[0].id, name: r.docs[0].name });
            else if (r.action === p.Action.CANCEL) resolve(null);
          })
          .build()
          .setVisible(true);
      });
    },
  };
}

/** 真實環境：組出所有服務。腳本在第一次呼叫時才動態載入。 */
export type { GapiGlobal, GisGlobal };
