// 雲端自動備份的傳輸層：只負責「有權杖就把文字存到 Drive」。要不要存（開關偏好）、
// 提示怎麼跳（成功只一次、同種失敗只一次）由 store.backupToDrive 決定。
// 權杖只放在記憶體：重新整理頁面就沒了（硬規則 6：不寫進瀏覽器儲存）。
import { SETTINGS_FILE } from "../storage/folder-data";
import type { SaveFailure } from "../google/quota";

let token: string | null = null;
let saving = false;
let pending: string | null = null;

export function setCloudToken(t: string | null): void {
  token = t;
}

export function hasCloudToken(): boolean {
  return token !== null;
}

export type CloudSaveResult =
  | { status: "no-token" }
  | { status: "saved"; at: number }
  | { status: "failed"; kind: SaveFailure };

/** 同時間只送一個請求；送的當下又有更新就只補送最新一份。 */
export async function saveToDrive(text: string): Promise<CloudSaveResult> {
  if (!token) return { status: "no-token" };
  if (saving) {
    pending = text;
    return { status: "saved", at: Date.now() };
  }
  saving = true;
  try {
    let next: string | null = text;
    while (next !== null && token) {
      pending = null;
      const [{ createGoogleServices }, { classifySaveError }] =
        await Promise.all([import("../google"), import("../google/quota")]);
      const svc = createGoogleServices(
        import.meta.env as Record<string, string | undefined>,
      );
      if (!svc) return { status: "no-token" };
      try {
        await svc.drive.saveText(token, SETTINGS_FILE, next);
      } catch (err) {
        const kind = classifySaveError(err);
        if (kind === "auth") token = null;
        return { status: "failed", kind };
      }
      next = pending;
    }
    return { status: "saved", at: Date.now() };
  } finally {
    saving = false;
  }
}
