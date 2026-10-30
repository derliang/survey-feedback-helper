// 比對「程式產生的 PDF」與「Word 排版後輸出的 PDF」：頁數、每行文字、位置偏差，並輸出並排圖。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const root = new URL('./output/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['01', '02', '09', '18', '27'];
mkdirSync(`${root}png`, { recursive: true });

async function open(path) {
  const data = new Uint8Array(readFileSync(path));
  return pdfjs.getDocument({ data, useSystemFonts: false, isEvalSupported: false }).promise;
}

// 把一頁的文字項目合併成「行」：同一個 y（容許 2pt）的項目依 x 排序後串起來
async function lines(page) {
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = tc.items.filter((i) => i.str !== '').map((i) => ({ s: i.str, x: i.transform[4], y: vp.height - i.transform[5], w: i.width }));
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const it of items) {
    const r = rows.find((r) => Math.abs(r.y - it.y) <= 2);
    if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] });
  }
  return rows
    .map((r) => {
      r.items.sort((a, b) => a.x - b.x);
      return { y: r.y, x: r.items[0].x, text: r.items.map((i) => i.s).join('').replace(/\s+/g, ''), right: Math.max(...r.items.map((i) => i.x + i.w)) };
    })
    .sort((a, b) => a.y - b.y);
}

async function render(page, scale = 1.4) {
  const vp = page.getViewport({ scale });
  const c = createCanvas(Math.round(vp.width), Math.round(vp.height));
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp, canvas: c }).promise;
  return c;
}

let totalLines = 0, sameText = 0, samePages = 0;
const dys = [], dxs = [];
for (const id of ids) {
  const a = `${root}pdf/${id}.pdf`, b = `${root}wordpdf/${id}.pdf`;
  if (!existsSync(b)) { console.log(`${id}: 缺少 Word 輸出，略過`); continue; }
  const [pa, pb] = [await open(a), await open(b)];
  const same = pa.numPages === pb.numPages;
  if (same) samePages++;
  let note = `${id}: 程式 ${pa.numPages} 頁 / Word ${pb.numPages} 頁${same ? '' : ' ← 頁數不同'}`;
  const pages = Math.min(pa.numPages, pb.numPages);
  const mism = [];
  for (let p = 1; p <= pages; p++) {
    const [la, lb] = [await lines(await pa.getPage(p)), await lines(await pb.getPage(p))];
    const n = Math.min(la.length, lb.length);
    for (let i = 0; i < n; i++) {
      totalLines++;
      if (la[i].text === lb[i].text) {
        sameText++;
        dys.push(lb[i].y - la[i].y); dxs.push(lb[i].x - la[i].x);
      } else if (mism.length < 4) mism.push(`  第${p}頁第${i + 1}行\n    程式: ${la[i].text}\n    Word: ${lb[i].text}`);
    }
    if (la.length !== lb.length) mism.push(`  第${p}頁行數 程式 ${la.length} / Word ${lb.length}`);
    // 並排圖
    const [ca, cb] = [await render(await pa.getPage(p)), await render(await pb.getPage(p))];
    const out = createCanvas(ca.width + cb.width + 20, ca.height);
    const g = out.getContext('2d');
    g.fillStyle = '#888'; g.fillRect(0, 0, out.width, out.height);
    g.drawImage(await loadImage(ca.toBuffer('image/png')), 0, 0);
    g.drawImage(await loadImage(cb.toBuffer('image/png')), ca.width + 20, 0);
    writeFileSync(`${root}png/${id}-p${p}.png`, out.toBuffer('image/png'));
  }
  console.log(note);
  mism.forEach((m) => console.log(m));
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / (a.length || 1));
console.log(`\n頁數相同: ${samePages}/${ids.length}`);
console.log(`逐行文字（含換行位置）相同: ${sameText}/${totalLines}`);
console.log(`文字相同的行：Word 相對程式的 y 偏差 平均 ${avg(dys).toFixed(2)}pt、最大 ${Math.max(...dys.map(Math.abs)).toFixed(2)}pt；x 偏差 平均 ${avg(dxs).toFixed(2)}pt、最大 ${Math.max(...dxs.map(Math.abs)).toFixed(2)}pt`);
