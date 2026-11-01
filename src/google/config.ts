import type { GoogleConfig } from './types';

export type ConfigResult = { ok: true; config: GoogleConfig } | { ok: false; missing: string[] };

const KEYS = [
  ['clientId', 'VITE_GOOGLE_CLIENT_ID'],
  ['apiKey', 'VITE_GOOGLE_API_KEY'],
  ['appId', 'VITE_GOOGLE_APP_ID'],
] as const;

/** 從建置時環境變數讀設定（金鑰不進 repo）；缺任何一項就整個停用 Google 功能。 */
export function readGoogleConfig(env: Record<string, string | undefined>): ConfigResult {
  const missing: string[] = [];
  const out: Record<string, string> = {};
  for (const [field, name] of KEYS) {
    const v = env[name]?.trim();
    if (v) out[field] = v;
    else missing.push(name);
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, config: out as unknown as GoogleConfig };
}

/** 停用時顯示給老師看的說明（不講技術名詞）。 */
export const GOOGLE_DISABLED_MESSAGE =
  '這個網站目前沒有開放 Google 登入。請改用 Excel 檔：在 Google 試算表選「檔案」→「下載」→「Microsoft Excel (.xlsx)」，再把檔案拖進來。';
