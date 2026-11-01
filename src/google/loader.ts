/** 動態載入 Google 腳本（不進首頁 bundle；只在老師按「連接 Google」後才載入）。 */
export type ScriptLoader = (url: string) => Promise<void>;

export const GIS_URL = "https://accounts.google.com/gsi/client";
export const GAPI_URL = "https://apis.google.com/js/api.js";

const pending = new Map<string, Promise<void>>();

export const loadScript: ScriptLoader = (url) => {
  const hit = pending.get(url);
  if (hit) return hit;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = url;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      pending.delete(url);
      reject(new TypeError(`無法載入 ${url}`));
    };
    document.head.appendChild(el);
  });
  pending.set(url, p);
  return p;
};
