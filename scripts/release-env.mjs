// 發布前的金鑰檢查（純函式，release.mjs 呼叫；單元測試在 release-env.test.mjs）。
// 用戶端 ID 與受網址限制的 API 金鑰本來就會出現在公開網頁，但「不進 git」是我們的規則：
// 金鑰放在本機 .env.local 或 .env.production.local，建置時由 Vite 注入。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** git ls-files 的輸出裡，不該被追蹤的 .env 檔（.env.example 除外）。 */
export function trackedEnvFiles(lsFilesOutput) {
  return lsFilesOutput
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => /(^|\/)\.env(\..+)?$/.test(f) && !/(^|\/)\.env\.example$/.test(f));
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.js$/.test(name)) yield full;
  }
}

/** dist 的 JS 裡是否含 Google 用戶端 ID（建置時有 VITE_GOOGLE_CLIENT_ID 才會有）。 */
export function distHasGoogleConfig(distDir) {
  for (const f of walk(distDir)) {
    if (/\d+-[a-z0-9]+\.apps\.googleusercontent\.com/.test(readFileSync(f, 'utf8'))) return true;
  }
  return false;
}

export const NO_GOOGLE_MESSAGE =
  '建出來的網站沒有 Google 設定（首頁會是「尚未開放」）。請在放有 .env.local 或 .env.production.local 的機器上發布，檔內要有 VITE_GOOGLE_CLIENT_ID、VITE_GOOGLE_API_KEY、VITE_GOOGLE_APP_ID（範本見 .env.example）；金鑰不進 repo。';
