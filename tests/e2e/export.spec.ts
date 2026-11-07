// 輸出器在真實瀏覽器（Chromium）的端對端：字型與 wasm 從網路抓、WOFF2 解壓、HarfBuzz 子集化、PDF／Word／xlsx／zip，
// 並確認 Service Worker 把字型與 wasm 存進快取、第二次載入不再連網。
// 另外 build 一個只給測試用的探針頁（tests/e2e/export-probe），不影響正式 dist。
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { expect, test } from '@playwright/test';
import { build } from 'vite';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

let server: Server;
let origin = '';
const requests: string[] = [];

test.beforeAll(async () => {
  const out = mkdtempSync(join(tmpdir(), 'sfh-export-probe-'));
  await build({
    root: 'tests/e2e/export-probe',
    publicDir: join(process.cwd(), 'public'),
    base: '/',
    logLevel: 'silent',
    configFile: false,
    build: { outDir: out, emptyOutDir: true, target: 'es2022' },
  });
  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    requests.push(url.pathname);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = normalize(join(out, rel));
    if (!file.startsWith(out)) return void res.writeHead(403).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  origin = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(() => server?.close());

test('瀏覽器內完整輸出流程，字型與 wasm 由 Service Worker 快取', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '輸出流程不分版面，只在桌機專案跑一次');
  test.setTimeout(40_000);
  page.on('console', (m) => console.log('[頁面]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('[頁面錯誤]', e.message));
  page.on('requestfailed', (r) => console.log('[請求失敗]', r.url()));
  await page.goto(origin + '/');
  const r1 = await page.evaluate(() => (window as unknown as { runExport: () => Promise<Record<string, unknown>> }).runExport());
  expect(r1).toMatchObject({ registered: true, pdfHead: '%PDF-', zipHead: 'PK', docxHead: 'PK', xlsxHead: 'PK' });
  console.log('第一次（含下載）耗時 ms：', JSON.stringify(r1.ms), 'PDF 大小', r1.pdfBytes, 'zip(12 份) 大小', r1.zipBytes);
  expect(r1.pdfBytes as number).toBeLessThan(200_000);

  // 等 Service Worker 控制頁面並確認快取內容
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Service Worker 是在 ready 之後才非同步把字型與 wasm 寫進快取；機器吃重時會晚一點，所以輪詢而不是只看一次
  const cachedPaths = () => page.evaluate(async () => (await (await caches.open('sfh-assets-v1')).keys()).map((k) => new URL(k.url).pathname));
  await expect.poll(async () => (await cachedPaths()).some((p) => p.endsWith('NotoSansTC-VF.woff2')), { timeout: 15_000 }).toBe(true);
  await expect.poll(async () => (await cachedPaths()).some((p) => p.endsWith('.wasm')), { timeout: 15_000 }).toBe(true);

  // 第二次載入：字型與 wasm 不再打到伺服器
  requests.length = 0;
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  const r2 = await page.evaluate(() => (window as unknown as { runExport: () => Promise<Record<string, unknown>> }).runExport());
  expect(r2.pdfHead).toBe('%PDF-');
  console.log('第二次（快取）耗時 ms：', JSON.stringify(r2.ms));
  expect(requests.filter((p) => p.endsWith('.woff2') || p.endsWith('.wasm'))).toEqual([]);
});
