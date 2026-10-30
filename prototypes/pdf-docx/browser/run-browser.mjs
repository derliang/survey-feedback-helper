// 以 esbuild 打包瀏覽器入口，起本機靜態伺服器，用 Playwright（Chromium）實測。
// 用法：node browser/run-browser.mjs [人數] [ttf|woff2] [cpu降速倍率] [手機視窗 0|1]
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import fontverter from 'fontverter';

const here = new URL('./', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const [n = 35, ext = 'ttf', cpu = 1, mobile = 0] = process.argv.slice(2);
mkdirSync(`${here}dist`, { recursive: true });
// subset-font 的主程式用 Node 的 fs 讀 wasm；打包時把那一行換成瀏覽器的 fetch（原型驗證用的修補）
const patchSubsetFont = {
  name: 'patch-subset-font',
  setup(b) {
    // 瀏覽器沒有 fs／path：換成空模組（只有 Node 分支才會用到）
    b.onResolve({ filter: /^(fs|path)$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'module.exports = {};', loader: 'js' }));
    b.onLoad({ filter: /subset-font[\\/]index\.js$/ }, (a) => {
      let t = readFileSync(a.path, 'utf8');
      t = t.replace("const { readFile } = require('fs').promises;", "const readFile = async () => (await fetch('/harfbuzz-subset.wasm')).arrayBuffer();");
      t = t.replace("require.resolve('harfbuzzjs/dist/harfbuzz-subset.wasm')", "''");
      return { contents: t, loader: 'js', resolveDir: a.path.replace(/[\\/][^\\/]*$/, '') };
    });
  },
};
await build({ entryPoints: [`${here}entry.mjs`], bundle: true, format: 'iife', outfile: `${here}dist/bundle.js`, platform: 'browser', target: 'es2022', plugins: [patchSubsetFont], logLevel: 'error' });
const bundleKB = (readFileSync(`${here}dist/bundle.js`).length / 1024).toFixed(0);

// WOFF2 字型只轉一次（慢），快取在 dist/
const fontFile = (w, e) => `${here}dist/NotoSansTC-${w}.${e}`;
for (const w of ['Regular', 'Bold']) {
  if (!existsSync(fontFile(w, 'ttf'))) writeFileSync(fontFile(w, 'ttf'), readFileSync(`C:/Windows/Fonts/NotoSansTC-${w}.ttf`));
  if (ext === 'woff2' && !existsSync(fontFile(w, 'woff2'))) writeFileSync(fontFile(w, 'woff2'), await fontverter.convert(readFileSync(fontFile(w, 'ttf')), 'woff2'));
}

const html = `<!doctype html><meta charset=utf-8><script>window.FONT_EXT='${ext}'</script><script src="/bundle.js"></script><body>test`;
const srv = createServer((req, res) => {
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); return res.end(html); }
  if (req.url === '/harfbuzz-subset.wasm') { res.setHeader('content-type', 'application/wasm'); return res.end(readFileSync(`${here}../node_modules/harfbuzzjs/dist/harfbuzz-subset.wasm`)); }
  if (req.url === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); return res.end(readFileSync(`${here}dist/bundle.js`)); }
  const m = req.url.match(/^\/fonts\/NotoSansTC-(Regular|Bold)\.(ttf|woff2)$/);
  if (m) { res.setHeader('content-type', 'font/' + m[2]); return res.end(readFileSync(fontFile(m[1], m[2]))); }
  res.statusCode = 404; res.end();
}).listen(0);
const port = srv.address().port;

const base = `${process.env.LOCALAPPDATA}/ms-playwright`;
const dir = readdirSync(base).find((d) => d.startsWith('chromium-') );
const exe = `${base}/${dir}/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ executablePath: existsSync(exe) ? exe : undefined, headless: true });
const ctx = await browser.newContext(mobile === '1' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : {});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('頁面錯誤:', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('console error:', m.text()));
if (Number(cpu) > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: Number(cpu) }); }
await page.goto(`http://localhost:${port}/`);
const r = await page.evaluate(([n, d]) => window.runTest(n, d), [Number(n), true]);
const s = (ms) => (ms / 1000).toFixed(1) + ' s';
console.log(`打包後程式 ${bundleKB} KB；字型格式 ${ext}；CPU 降速 ${cpu}x；${mobile === '1' ? '手機視窗(390x844)' : '桌機視窗'}；${r.ua.match(/Chrome\/[\d.]+/)?.[0]}`);
console.log(`學生 ${r.n} 人：字型下載 ${(r.fontBytes / 1048576).toFixed(1)} MB（本機伺服器 ${r.fontFetchMs.toFixed(0)} ms，不代表真實網路）`);
console.log(`字型解壓（WOFF2→TTF，一次性）${r.fontDecodeMs.toFixed(0)} ms`);
console.log(`產生全班 PDF+docx ${s(r.generateMs)}；PDF 平均 ${r.pdfAvgMs.toFixed(0)} ms/份；docx 平均 ${r.docxAvgMs.toFixed(0)} ms/份；zip ${r.zipMs.toFixed(0)} ms，${(r.zipBytes / 1048576).toFixed(1)} MB；總計 ${s(r.totalMs)}；JS heap ${r.heapMB} MB；PDF 檔頭 ${r.firstPdfHeader}`);
writeFileSync(`${here}dist/browser-01.pdf`, Buffer.from(r.pdf01, 'base64'));
await browser.close(); srv.close();
