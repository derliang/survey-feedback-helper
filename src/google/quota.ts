import { GoogleApiError } from "./types";

export type GoogleFailure =
  "quota" | "auth" | "no-access" | "not-found" | "network" | "other";

/** 把 Google API 錯誤分類。403 的 rateLimitExceeded 與 429 都算配額用完。 */
export function classifyGoogleError(err: unknown): GoogleFailure {
  if (!(err instanceof GoogleApiError))
    return err instanceof TypeError ? "network" : "other";
  const { status, reason } = err;
  if (status === 429) return "quota";
  if (status === 403 && /rate|quota/i.test(reason)) return "quota";
  if (status === 401) return "auth";
  if (status === 403) return "no-access";
  if (status === 404) return "not-found";
  return "other";
}

/** 友善提示；配額用完時建議改用本機檔案（Excel 檔）。 */
export function failureMessage(kind: GoogleFailure): string {
  switch (kind) {
    case "quota":
      return "Google 暫時不讓這個網站讀取了（用量達到上限）。請等一分鐘再試，或改用 Excel 檔：在 Google 試算表選「檔案」→「下載」→「Microsoft Excel (.xlsx)」，再把檔案拖進來。";
    case "auth":
      return "登入已經過期，請重新連接 Google。";
    case "no-access":
      return "這個帳號沒有權限讀這份試算表。請確認選的是自己的試算表，或改用 Excel 檔。";
    case "not-found":
      return "找不到這份試算表，可能已被刪除或移動。請重新選擇。";
    case "network":
      return "連不上 Google，請檢查網路後再試，或改用 Excel 檔。";
    default:
      return "讀取 Google 試算表時發生問題。請再試一次，或改用 Excel 檔。";
  }
}

/** 存檔失敗的種類（與讀取不同：要分開「限流」與「雲端空間滿」）。 */
export type SaveFailure = "network" | "auth" | "rate" | "storage" | "other";

export function classifySaveError(err: unknown): SaveFailure {
  if (!(err instanceof GoogleApiError))
    return err instanceof TypeError ? "network" : "other";
  const { status, reason } = err;
  if (/storageQuotaExceeded/i.test(reason)) return "storage";
  if (status === 429 || /rate|quota/i.test(reason)) return "rate";
  if (status === 401) return "auth";
  return "other";
}
