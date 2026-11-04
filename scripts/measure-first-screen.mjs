// 量首屏載入時間（用法：先 npm run build，再 node scripts/measure-first-screen.mjs）。
// 模擬中階手機：CPU 降速 4 倍、網路約 1.6 Mbps／150 ms 延遲（Chrome DevTools 的「Slow 4G」數值）；
// 環境變數 PROFILE=fast 改用較快的 4G（約 9 Mbps／40 ms，Chrome 的「Fast 4G」數值）。
// 預設像 GitHub Pages 一樣 gzip（GZIP=0 可關掉，量未壓縮的最壞情況）。
// 量到「首頁主標題出現」的時間，三次取中位數。結果記在 docs/performance.md；不進 npm run ci（時間受機器影響）。
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const server = spawn(process.execPath, ['scripts/serve-dist.mjs'], { env: { ...process.env, PORT: '4199', GZIP: process.env.GZIP ?? '1' }, stdio: 'ignore' });
await sleep(800);
const url = 'http://localhost:4199/survey-feedback-helper/';
const browser = await chromium.launch();
const results = [];
const fast = process.env.PROFILE === 'fast';
const net = fast ? { latency: 40, down: 9 } : { latency: 150, down: 1.6 };
try {
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.latency, downloadThroughput: (net.down * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'commit' });
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30000 });
    results.push(Date.now() - t0);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
results.sort((a, b) => a - b);
console.log(`[${fast ? 'Fast 4G' : 'Slow 4G'}] 首屏（主標題出現）：${results.join(' / ')} ms，中位數 ${results[1]} ms`);
