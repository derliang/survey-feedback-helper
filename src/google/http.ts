import { GoogleApiError } from "./types";

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/** GET JSON；失敗丟 GoogleApiError（帶 HTTP 狀態與 Google 回的 reason／message）。 */
export async function getJson(
  fetchFn: FetchLike,
  url: string,
  token: string,
  apiKey?: string,
): Promise<unknown> {
  return sendJson(fetchFn, url, token, {}, apiKey);
}

/** 寫入用（POST／PATCH）：失敗同樣丟 GoogleApiError。 */
export async function sendJson(
  fetchFn: FetchLike,
  url: string,
  token: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
  apiKey?: string,
): Promise<unknown> {
  const full = apiKey
    ? `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
    : url;
  const res = await fetchFn(full, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (res.ok) return res.json();
  let reason = "";
  try {
    const body = (await res.json()) as {
      error?: {
        message?: string;
        status?: string;
        errors?: { reason?: string }[];
      };
    };
    reason =
      body.error?.errors?.[0]?.reason ??
      body.error?.status ??
      body.error?.message ??
      "";
  } catch {
    /* 回應不是 JSON，只留狀態碼 */
  }
  throw new GoogleApiError(res.status, reason);
}
