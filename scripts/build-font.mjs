// 把 Noto Sans TC 可變字型（TTF）壓成 WOFF2，放進 public/fonts/（只在更新字型時手動執行，不屬於 ci）。
// 用法：node scripts/build-font.mjs [來源 ttf，預設 C:/Windows/Fonts/NotoSansTC-VF.ttf]
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { compress } from 'woff2-encoder';

const src = process.argv[2] ?? 'C:/Windows/Fonts/NotoSansTC-VF.ttf';
const out = 'public/fonts/NotoSansTC-VF.woff2';
const ttf = readFileSync(src);
console.log(`來源 ${src}：${(ttf.length / 1e6).toFixed(1)} MB，壓縮中…`);
const woff2 = await compress(ttf);
writeFileSync(out, woff2);
console.log(`已寫入 ${out}：${(statSync(out).size / 1e6).toFixed(2)} MB`);
