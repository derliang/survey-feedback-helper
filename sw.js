// Service Worker：讓程式離線也能開（PWA），並快取輸出用的大型靜態檔。
// 只快取「程式本身」：建置時產生的檔案清單（precache.json，JS、CSS、首頁、圖示）與字型、wasm。
// 不快取、也不攔截任何問卷資料：問卷資料不經過網路（只在記憶體），也不蒐集任何資料。
// 版本：建置時把下面的 ce6523d609d0 換成檔案清單的雜湊，sw.js 內容一變，瀏覽器就會更新。
const BUILD = '__BUILD_ID__';
const APP_CACHE = `sfh-app-${BUILD}`;
const ASSET_CACHE = 'sfh-assets-v1';
const FONT_OR_WASM = /\/fonts\/[^/]+\.woff2$|\.wasm$/;
const BASE = new URL('./', self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(`${BASE}precache.json`, { cache: 'reload' });
      const files = await res.json();
      const cache = await caches.open(APP_CACHE);
      await cache.addAll(files.map((f) => new Request(`${BASE}${f}`, { cache: 'reload' })));
      await self.skipWaiting();
    })().catch(() => {
      /* 清單抓不到（例如開發模式）就不快取，下次再試 */
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('sfh-app-') && k !== APP_CACHE) || (k.startsWith('sfh-assets-') && k !== ASSET_CACHE)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;

  // 字型與 wasm：快取優先，沒快取才連網並存起來
  if (FONT_OR_WASM.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // 程式本身：先找預先快取的，沒有就連網（連不上時開首頁）
  event.respondWith(
    caches.open(APP_CACHE).then(async (cache) => {
      const hit = await cache.match(req.mode === 'navigate' && !url.pathname.endsWith('.html') ? `${BASE}index.html` : req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (e) {
        if (req.mode === 'navigate') {
          const home = await cache.match(`${BASE}index.html`);
          if (home) return home;
        }
        throw e;
      }
    }),
  );
});
