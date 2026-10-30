// 驗證用：把 TTF 的 name 表改成指定字型名稱（讓系統裡找不到同名字型，才能證明 docx 內嵌有作用）
function checksum(buf) {
  const padded = Buffer.alloc((buf.length + 3) & ~3);
  buf.copy(padded);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

export function renameFont(ttf, family) {
  const src = Buffer.from(ttf);
  const n = src.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    const tag = src.toString('ascii', o, o + 4);
    const off = src.readUInt32BE(o + 8), len = src.readUInt32BE(o + 12);
    tables.push({ tag, data: Buffer.from(src.subarray(off, off + len)) });
  }
  // 新的 name 表：family(1)、subfamily(2)、full(4)、postscript(6)，平台 3（Windows）、Unicode BMP、英文
  const recs = [[1, family], [2, 'Regular'], [4, family], [6, family.replace(/\s/g, '')]];
  const strs = recs.map(([, s]) => Buffer.from(s, 'utf16le').swap16());
  const head = Buffer.alloc(6 + recs.length * 12);
  head.writeUInt16BE(0, 0); head.writeUInt16BE(recs.length, 2); head.writeUInt16BE(head.length, 4);
  let off = 0;
  recs.forEach(([id], i) => {
    const p = 6 + i * 12;
    head.writeUInt16BE(3, p); head.writeUInt16BE(1, p + 2); head.writeUInt16BE(0x409, p + 4);
    head.writeUInt16BE(id, p + 6); head.writeUInt16BE(strs[i].length, p + 8); head.writeUInt16BE(off, p + 10);
    off += strs[i].length;
  });
  tables.find((t) => t.tag === 'name').data = Buffer.concat([head, ...strs]);
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const dirLen = 12 + tables.length * 16;
  let pos = dirLen;
  const out = Buffer.alloc(dirLen);
  src.copy(out, 0, 0, 12);
  out.writeUInt16BE(tables.length, 4);
  const maxPow = 2 ** Math.floor(Math.log2(tables.length));
  out.writeUInt16BE(maxPow * 16, 6); out.writeUInt16BE(Math.log2(maxPow), 8); out.writeUInt16BE(tables.length * 16 - maxPow * 16, 10);
  const bodies = [];
  tables.forEach((t, i) => {
    if (t.tag === 'head') t.data.writeUInt32BE(0, 8); // 先清掉 checkSumAdjustment
    const o = 12 + i * 16;
    out.write(t.tag, o, 'ascii');
    out.writeUInt32BE(checksum(t.data), o + 4);
    out.writeUInt32BE(pos, o + 8); out.writeUInt32BE(t.data.length, o + 12);
    const padded = Buffer.alloc((t.data.length + 3) & ~3); t.data.copy(padded);
    bodies.push(padded); pos += padded.length;
  });
  const file = Buffer.concat([out, ...bodies]);
  const adj = (0xB1B0AFBA - checksum(file)) >>> 0;
  const hi = tables.findIndex((t) => t.tag === 'head');
  let hoff = dirLen;
  for (let i = 0; i < hi; i++) hoff += bodies[i].length;
  file.writeUInt32BE(adj, hoff + 8);
  return file;
}
