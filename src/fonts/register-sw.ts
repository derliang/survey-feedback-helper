// 註冊 Service Worker（快取字型與 wasm）。不支援或失敗時靜默略過：輸出照常運作，只是每次都重新下載。
// onWaiting：已有舊版在運作、新版裝好在等待時呼叫（第一次安裝不會呼叫，新版直接啟用）。
export async function registerAssetCache(onWaiting?: (apply: () => void) => void): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const base = import.meta.env.BASE_URL;
    const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
    if (onWaiting) watchWaiting(reg, onWaiting);
    return true;
  } catch {
    return false;
  }
}

function watchWaiting(reg: ServiceWorkerRegistration, onWaiting: (apply: () => void) => void): void {
  let applying = false;
  const apply = () => {
    const w = reg.waiting;
    if (!w) return;
    applying = true;
    w.postMessage({ type: 'SKIP_WAITING' });
  };
  // 只在是我們要求更新時才重新載入，別的分頁換版時不打斷這個分頁
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applying) location.reload();
  });
  const check = () => {
    if (reg.waiting && navigator.serviceWorker.controller) onWaiting(apply);
  };
  check();
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w?.addEventListener('statechange', () => {
      if (w.state === 'installed') check();
    });
  });
}
