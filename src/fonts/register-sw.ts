// 註冊 Service Worker（快取字型與 wasm）。不支援或失敗時靜默略過：輸出照常運作，只是每次都重新下載。
export async function registerAssetCache(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const base = import.meta.env.BASE_URL;
    await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    return true;
  } catch {
    return false;
  }
}
