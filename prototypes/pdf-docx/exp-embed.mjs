// 驗證：docx 內嵌「子集化＋改名」的字型，Word 能否靠它畫出中文（系統裡沒有這個字型名稱）
import { writeFileSync, mkdirSync } from 'node:fs';
import subsetFont from 'subset-font';
import { makeStudents, classAverages, buildDoc, CLASS_INFO } from './lib/model.mjs';
import { drawChart } from './lib/chart.mjs';
import { renderDocx } from './lib/docx.mjs';
import { loadFonts } from './lib/fonts.mjs';
import { renameFont } from './lib/rename-font.mjs';

const out = new URL('./output/embed/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(out, { recursive: true });
const students = makeStudents(35), avgs = classAverages(students);
const s = students[0];
const doc = buildDoc(s, avgs, drawChart(CLASS_INFO.dimensions, s.scores, avgs));
const chars = new Set('•｜第頁，共 0123456789');
for (const b of doc.blocks) for (const t of [b.text, ...(b.items ?? []), ...(b.header ?? []), ...(b.rows?.flat() ?? [])]) if (t) for (const c of t) chars.add(c);
for (const c of doc.footerText) chars.add(c);
const sub = await subsetFont(loadFonts().regular, [...chars].join(''), { targetFormat: 'truetype', noHinting: true });
const NAME = 'SFH Embed Test';
const renamed = renameFont(sub, NAME);
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
writeFileSync(`${out}embed.docx`, await renderDocx(doc, { fontName: NAME, embedFont: renamed }));
writeFileSync(`${out}noembed.docx`, await renderDocx(doc, { fontName: NAME }));
console.log(`子集化字型 ${kb(sub.length)}（${chars.size} 字）；embed.docx = ${kb((await renderDocx(doc, { fontName: NAME, embedFont: renamed })).length)}；noembed.docx = ${kb((await renderDocx(doc, { fontName: NAME })).length)}`);
