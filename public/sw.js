// Service Worker：只快取輸出用的大型靜態檔（字型 WOFF2、HarfBuzz wasm），其餘請求一律不碰。
// 策略：快取優先；沒快取才連網，成功後存入。字型檔改版時換檔名或遞增 CACHE，舊快取會在啟用時清掉。
// 不蒐集任何資料，不快取問卷資料（問卷資料不經過網路）。
const CACHE = 'sfh-assets-v1';
const CACHEABLE = /\/fonts\/[^/]+\.woff2$|\.wasm$/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sfh-assets-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !CACHEABLE.test(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});
