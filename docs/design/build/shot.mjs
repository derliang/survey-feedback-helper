// 預覽用：node shot.mjs <模擬頁檔名.html> <第幾張，從 0 起> [輸出png]  → 用 Edge 無頭模式截圖該張桌機畫面（1280 原尺寸）
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { sp } from './lib.mjs';
const [name, idx = '0', out = 'shot.png'] = process.argv.slice(2);
const dir = sp + '/../mockups/';
let html = fs.readFileSync(dir + name, 'utf8');
const figs = html.match(/<figure class="fig"[\s\S]*?<\/figure>/g);
const f = figs[+idx];
const H = +(f.match(/data-h="(\d+)"/) || [0, 800])[1];
const cap = (f.match(/<figcaption[^>]*><b>([^<]*)/) || [])[1];
html = html.replace(/<div class="figs"[^>]*>[\s\S]*<\/div>\s*<\/div>\s*<\/body>/, `<div class="figs">${f}</div></div></body>`).replace(/<header class="pagehead">[\s\S]*?<\/header>/, '').replace('<style>', '<style>.wrap{padding:0!important;max-width:none!important}body{margin:0}figcaption{display:none}');
const tmp = process.env.TEMP + '/shot-' + process.pid + '.html';
fs.writeFileSync(tmp, html);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
execFileSync(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=1320,${H + 20}`, `--screenshot=${out}`, 'file:///' + tmp.replace(/\\/g, '/')], { stdio: 'ignore' });
console.log(cap, H, out);
