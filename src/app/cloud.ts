// 登入 Google 後，設定檔每次更新都順便存一份到使用者自己的雲端硬碟（drive.file）。
// 權杖只放在記憶體：重新整理頁面就沒了（硬規則 6：不寫進瀏覽器儲存）。
import { SETTINGS_FILE } from "../storage/folder-data";

let token: string | null = null;
let saving = false;
let pending: string | null = null;

export function setCloudToken(t: string | null): void {
  token = t;
}

export function getCloudToken(): string | null {
  return token;
}

export type CloudSaveResult = "off" | "saved" | "failed";

/** 還沒登入就什麼都不做；同時間只送一個請求，送的當下又有更新就只補送最新一份。 */
export async function saveToDrive(
  text: string,
  onFail: (message: string) => void,
): Promise<CloudSaveResult> {
  if (!token) return "off";
  if (saving) {
    pending = text;
    return "saved";
  }
  saving = true;
  try {
    let next: string | null = text;
    while (next !== null && token) {
      pending = null;
      const [{ createGoogleServices }, { classifyGoogleError, failureMessage }] =
        await Promise.all([import("../google"), import("../google/quota")]);
      const svc = createGoogleServices(
        import.meta.env as Record<string, string | undefined>,
      );
      if (!svc) return "off";
      try {
        await svc.drive.saveText(token, SETTINGS_FILE, next);
      } catch (err) {
        const kind = classifyGoogleError(err);
        if (kind === "auth") token = null;
        onFail(`沒能存到 Google 雲端硬碟。${failureMessage(kind)}`);
        return "failed";
      }
      next = pending;
    }
    return "saved";
  } finally {
    saving = false;
  }
}
