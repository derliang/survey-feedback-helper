import fs from 'node:fs';
const css = fs.readFileSync(process.argv[2], 'utf8');
function block(re) {
  const m = css.match(re);
  const o = {};
  for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) o[k] = v;
  return o;
}
const light = block(/:root \{([\s\S]*?)\n\}/);
const dark = { ...light, ...block(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/) };
const doc = block(/\.doc-warm \{([\s\S]*?)\n\}/);
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ['ink', 'paper', 4.5], ['ink', 'card', 4.5], ['ink2', 'paper', 4.5], ['ink2', 'card', 4.5], ['ink2', 'sunk', 4.5],
  ['ink3', 'paper', 4.5], ['ink3', 'card', 4.5], ['ink3', 'sunk', 4.5],
  ['on-accent', 'accent', 4.5], ['accent-ink', 'accent-soft', 4.5], ['accent-ink', 'paper', 4.5], ['accent-ink', 'card', 4.5], ['accent', 'card', 3],
  ['ok', 'ok-soft', 4.5], ['warn', 'warn-soft', 4.5], ['bad', 'bad-soft', 4.5], ['bad', 'card', 4.5], ['bad', 'paper', 4.5],
  ['d1', 'card', 3], ['d2', 'card', 3], ['d3', 'card', 3], ['d4', 'card', 3], ['d5', 'card', 3], ['d0', 'card', 3], ['bar-muted', 'card', 1.5],
  
];
let bad = 0;
for (const [name, t] of [['light', light], ['dark', dark]]) {
  for (const [f, b, min] of pairs) {
    const r = ratio(t[f], t[b]);
    if (r < min) { bad++; console.log(`FAIL ${name} ${f} on ${b}: ${r.toFixed(2)} < ${min}`); }
  }
}
for (const [f, b, min] of [['doc-ink', 'doc-paper', 4.5], ['doc-ink2', 'doc-paper', 4.5], ['doc-accent', 'doc-paper', 4.5], ['doc-accent', 'doc-accent-soft', 4.5], ['doc-leaf', 'doc-leaf-soft', 4.5], ['doc-ink', 'doc-accent-soft', 4.5]]) {
  const r = ratio(doc[f], doc[b]);
  if (r < min) { bad++; console.log(`FAIL doc ${f} on ${b}: ${r.toFixed(2)}`); }
}
console.log(bad ? `${bad} 項不合格` : '全部通過');
// 暗色區塊是否與 media 區塊值一致
const media = css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\n  \}/)[1];
const mo = {};
for (const [, k, v] of media.matchAll(/--([\w-]+):\s*([^;]+);/g)) mo[k] = v.trim();
const dblk = css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)[1];
const dd = {};
for (const [, k, v] of dblk.matchAll(/--([\w-]+):\s*([^;]+);/g)) dd[k] = v.trim();
const diff = Object.keys({ ...mo, ...dd }).filter((k) => mo[k] !== dd[k]);
console.log(diff.length ? '兩個深色區塊不一致：' + diff.join(',') : '兩個深色區塊一致');
