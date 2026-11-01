// 文件模型：一份可序列化成 JSON 的區塊清單。PDF、Word、（之後的）預覽都只讀它。
// 長度單位一律是 pt；顏色是 #rrggbb。圖片是 PNG 位元組（序列化時轉 base64，見 serialize）。

export interface PageSetup {
  w: number;
  h: number;
  mx: number;
  mt: number;
  mb: number;
  footerFromBottom: number;
}

/** A4 直式／橫式（pt）。 */
export const A4_PORTRAIT: PageSetup = { w: 595.28, h: 841.89, mx: 56.7, mt: 56.7, mb: 70, footerFromBottom: 30 };
export const A4_LANDSCAPE: PageSetup = { w: 841.89, h: 595.28, mx: 42.5, mt: 42.5, mb: 60, footerFromBottom: 24 };

export type Align = 'left' | 'center' | 'right';

interface BlockBase {
  before?: number;
  after?: number;
}
export interface HeadingBlock extends BlockBase {
  type: 'heading';
  text: string;
  size: number;
  color?: string;
}
export interface TextBlock extends BlockBase {
  type: 'text';
  text: string;
  size: number;
  color?: string;
}
export interface BulletsBlock extends BlockBase {
  type: 'bullets';
  items: string[];
  size: number;
}
export interface TableBlock extends BlockBase {
  type: 'table';
  widths: number[];
  header: string[];
  rows: string[][];
  /** 要強調的列（例如平均列）：粗體、淡色底。 */
  emphasisRows?: number[];
  align?: Align[];
  rowH: number;
  size: number;
}
export interface ImageBlock extends BlockBase {
  type: 'image';
  png: Uint8Array;
  w: number;
  h: number;
}
export type Block = HeadingBlock | TextBlock | BulletsBlock | TableBlock | ImageBlock;

export interface DocModel {
  blocks: Block[];
  footerText: string;
  /** 內文固定行高（pt）。 */
  lineH: number;
  page?: PageSetup;
  /** 檔案標題（PDF／Word 的文件屬性）。 */
  title?: string;
}

export const pageOf = (doc: DocModel): PageSetup => doc.page ?? A4_PORTRAIT;
export const contentWidth = (p: PageSetup): number => p.w - p.mx * 2;

/** 變數替換：`{姓名}`。變數名稱可以是中文（規則 `[^{}]+`，原型曾因只認 \w 出過錯）；沒有的變數換成空字串。 */
export function fillVars(text: string, vars: Record<string, string | number | undefined>): string {
  return text.replace(/\{([^{}]+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

/** 序列化成 JSON（圖片轉 base64）。文件模型存進設定檔、或日後預覽用。 */
export function serializeDoc(doc: DocModel): string {
  return JSON.stringify(doc, (_k, v: unknown) => (v instanceof Uint8Array ? { $png: toBase64(v) } : v));
}

export function parseDoc(json: string): DocModel {
  return JSON.parse(json, (_k, v: unknown) => {
    if (v && typeof v === 'object' && '$png' in v) return fromBase64((v as { $png: string }).$png);
    return v;
  }) as DocModel;
}

function toBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** 收集各字重實際用到的字元（粗體：標題、表頭、強調列；其餘一般字重），給字型子集化用。 */
export function collectChars(doc: DocModel): { regular: string; bold: string } {
  const reg = new Set('•｜第頁，共 0123456789'),
    bol = new Set<string>();
  const add = (set: Set<string>, t?: string) => {
    if (t) for (const c of t) set.add(c);
  };
  add(reg, doc.footerText);
  for (const b of doc.blocks) {
    if (b.type === 'heading') add(bol, b.text);
    else if (b.type === 'text') add(reg, b.text);
    else if (b.type === 'bullets') b.items.forEach((t) => add(reg, t));
    else if (b.type === 'table') {
      b.header.forEach((t) => add(bol, t));
      b.rows.forEach((r, ri) => r.forEach((t) => add(b.emphasisRows?.includes(ri) ? bol : reg, t)));
    }
  }
  return { regular: [...reg].join(''), bold: [...bol].join('') };
}
