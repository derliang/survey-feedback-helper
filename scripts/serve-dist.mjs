// 以 /survey-feedback-helper/ 子路徑靜態提供 dist/，行為貼近 GitHub Pages，給端對端測試用。
// （vite preview 在 Vite 8 對 Sec-Fetch-Dest: script 的請求會回 404，改用這個。）
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const BASE = '/survey-feedback-helper/';
const PORT = Number(process.env.PORT ?? 4173);
// GZIP=1：像 GitHub Pages 一樣壓縮文字檔（量首屏用；GitHub Pages 對 js／css／html／json 會 gzip）。預設不壓，給端對端測試。
const GZIP = process.env.GZIP === '1';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end('Not found');
    return;
  }
  let rel = decodeURIComponent(url.pathname.slice(BASE.length)) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join('dist', rel));
  if (!file.startsWith('dist')) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    let body = await readFile(file);
    const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
    if (GZIP && /\.(html|js|css|json|svg)$/.test(file) && /gzip/.test(String(req.headers['accept-encoding']))) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`serving dist at http://localhost:${PORT}${BASE}`));
