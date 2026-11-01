import { createDriveApi, createSheetsApi } from './api';
import { createGoogleAuth, createPicker, type GapiGlobal, type GisGlobal } from './browser';
import { readGoogleConfig } from './config';
import type { FetchLike } from './http';
import { loadScript } from './loader';
import type { GoogleServices } from './types';

export * from './account';
export * from './config';
export * from './quota';
export * from './session';
export * from './types';

/** 真實環境的服務（Google 腳本在第一次使用時才動態載入）。設定不齊全回 null＝停用 Google 功能。 */
export function createGoogleServices(env: Record<string, string | undefined>): GoogleServices | null {
  const cfg = readGoogleConfig(env);
  if (!cfg.ok) return null;
  const fetchFn: FetchLike = (url, init) => fetch(url, init);
  const w = window as unknown as { google?: GisGlobal & GapiGlobal['google']; gapi?: GapiGlobal['gapi'] };
  return {
    auth: createGoogleAuth(cfg.config, loadScript, () => w.google as GisGlobal | undefined),
    drive: createDriveApi(fetchFn),
    sheets: createSheetsApi(fetchFn),
    picker: createPicker(cfg.config, loadScript, () =>
      w.gapi && w.google ? ({ gapi: w.gapi, google: w.google } as GapiGlobal) : undefined,
    ),
  };
}
