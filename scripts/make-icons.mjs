// 產生 PWA 圖示（public/icons/*.png）：與頂端列的 Logo 相同（鈷藍圓角底、三根長條加勾）。
// 圖示已 commit；只有要改圖示時才需要重跑：node scripts/make-icons.mjs
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';

function draw(size, { maskable = false } = {}) {
  const c = createCanvas(size, size);
  const g = c.getContext('2d');
  const k = size / 32;
  g.fillStyle = '#2554d8';
  if (maskable) g.fillRect(0, 0, size, size);
  else {
    g.beginPath();
    g.roundRect(0, 0, size, size, 8 * k);
    g.fill();
  }
  const inset = maskable ? 0.18 : 0;
  g.save();
  g.translate(size * inset, size * inset);
  g.scale(1 - 2 * inset, 1 - 2 * inset);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 3 * k;
  for (const [x, y] of [[8, 16], [14, 11], [20, 14]]) {
    g.beginPath();
    g.moveTo(x * k, 22 * k);
    g.lineTo(x * k, y * k);
    g.stroke();
  }
  g.lineWidth = 2.4 * k;
  g.beginPath();
  g.moveTo(18 * k, 8 * k);
  g.lineTo(21 * k, 11 * k);
  g.lineTo(26 * k, 5 * k);
  g.stroke();
  g.restore();
  return c.toBuffer('image/png');
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', draw(192));
writeFileSync('public/icons/icon-512.png', draw(512));
writeFileSync('public/icons/icon-maskable-512.png', draw(512, { maskable: true }));
writeFileSync('public/icons/apple-touch-icon.png', draw(180, { maskable: true }));
console.log('icons written');
