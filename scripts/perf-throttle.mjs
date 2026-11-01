// 手機等級效能量測：用 Chromium CDP 的 CPU 降速（1x／4x／6x）跑輸出流程各階段並印出耗時（毫秒）。
// 用法：node scripts/perf-throttle.mjs [降速倍率…]，例如 node scripts/perf-throttle.mjs 1 4 6
// 只量主執行緒的 CPU 成本，不含網路；實機仍需使用者驗證（docs/real-device-checklist.md）。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';
import { build } from 'vite';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const rates = (process.argv.length > 2 ? process.argv.slice(2) : ['1', '4', '6']).map(Number);

const out = mkdtempSync(join(tmpdir(), 'sfh-perf-'));
await build({ root: 'tests/e2e/export-probe', publicDir: join(process.cwd(), 'public'), base: '/', logLevel: 'silent', configFile: false, build: { outDir: out, emptyOutDir: true, target: 'es2022' } });
const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = normalize(join(out, rel));
  try {
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const results = {};
const fontLoad = {};
for (const rate of rates) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(origin + '/');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  results[`${rate}x`] = await page.evaluate(() => globalThis.runPerf(35));
  fontLoad[`${rate}x`] = await page.evaluate(() => globalThis.runFontLoad());
  await ctx.close();
}
await browser.close();
server.close();
console.table(results);
console.log('loadFonts 前後對照（毫秒）');
console.table(fontLoad);
