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
  /** 區塊底色（標題、文字區塊用；PDF 畫成色塊，Word 改為段落網底）。 */
  bg?: string;
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
/** 強制換頁（編輯器的「分頁」區塊）。 */
export interface PageBreakBlock extends BlockBase {
  type: 'pagebreak';
}
/** 細分隔線（編輯器的「分隔線」區塊）。 */
export interface RuleBlock extends BlockBase {
  type: 'rule';
  color?: string;
}
/** 多欄並排：每欄是一串區塊，欄寬依 widths 比例（沒給就均分）。PDF 畫成並排、Word 用無框線表格。 */
export interface ColumnsBlock extends BlockBase {
  type: 'columns';
  cols: Block[][];
  /** 各欄寬度比例（例如 [2,1]）。 */
  widths?: number[];
  /** 欄距（pt），預設 14。 */
  gap?: number;
}
/** 進階區塊：標題區（色塊＋大標＋副標）。 */
export interface HeroBlock extends BlockBase {
  type: 'hero';
  title: string;
  subtitle?: string;
  /** 色塊底色（預設暖橘）。 */
  fill?: string;
  /** 字色（預設白）。 */
  color?: string;
  size?: number;
}
/** 進階區塊：摘要數字列（幾張並排的數字卡）。 */
export interface StatsBlock extends BlockBase {
  type: 'stats';
  items: { label: string; value: string }[];
  fill?: string;
  color?: string;
}
/** 進階區塊：稱讚（praise）或提示（hint）卡片，左側色條。 */
export interface CalloutBlock extends BlockBase {
  type: 'callout';
  tone: 'praise' | 'hint';
  title?: string;
  text: string;
}
export type Block = HeadingBlock | TextBlock | BulletsBlock | TableBlock | ImageBlock | PageBreakBlock | RuleBlock | ColumnsBlock | HeroBlock | StatsBlock | CalloutBlock;

/** 頁面裝飾：背景色、頁框、頁首文字、Logo（每頁都畫）。 */
export interface PageDeco {
  background?: string;
  frame?: { color: string; width: number; rounded: boolean };
  headerText?: string;
  logo?: { png: Uint8Array; w: number; h: number };
}

export interface DocModel {
  blocks: Block[];
  footerText: string;
  /** 內文固定行高（pt）。 */
  lineH: number;
  page?: PageSetup;
  deco?: PageDeco;
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

/** 進階區塊的固定尺寸（PDF 與 Word 共用，兩邊才排得一樣）。 */
export const GEO = { heroPad: 16, heroSubLh: 18, heroSubSize: 11, calloutPad: 10, calloutBar: 4, calloutSize: 11, calloutTitleLh: 18, statsH: 64, statsGap: 8, statsValueSize: 20, statsLabelSize: 10, textPad: 6, colGap: 14, frameInset: 18 };

export const TONES = {
  praise: { fill: '#e3f3e6', bar: '#2f8f4e', ink: '#1d5c33' },
  hint: { fill: '#fff1d6', bar: '#c98512', ink: '#7a4f00' },
} as const;
export const HERO_FILL = '#a84f00';

const eachBlock = (blocks: Block[], fn: (b: Block) => void): void => {
  for (const b of blocks) {
    fn(b);
    if (b.type === 'columns') b.cols.forEach((c) => eachBlock(c, fn));
  }
};

/** 收集各字重實際用到的字元（粗體：標題、表頭、強調列、進階區塊的大字；其餘一般字重），給字型子集化用。 */
export function collectChars(doc: DocModel): { regular: string; bold: string } {
  const reg = new Set('•｜第頁，共 0123456789'),
    // 粗體字集不可為空（子集化空字集會失敗）：編輯器的文件可能完全沒有標題或表格
    bol = new Set<string>('0123456789');
  const add = (set: Set<string>, t?: string) => {
    if (t) for (const c of t) set.add(c);
  };
  add(reg, doc.footerText);
  add(reg, doc.deco?.headerText);
  eachBlock(doc.blocks, (b) => {
    if (b.type === 'heading') add(bol, b.text);
    else if (b.type === 'text') add(reg, b.text);
    else if (b.type === 'bullets') b.items.forEach((t) => add(reg, t));
    else if (b.type === 'table') {
      b.header.forEach((t) => add(bol, t));
      b.rows.forEach((r, ri) => r.forEach((t) => add(b.emphasisRows?.includes(ri) ? bol : reg, t)));
    } else if (b.type === 'hero') {
      add(bol, b.title);
      add(reg, b.subtitle);
    } else if (b.type === 'stats') b.items.forEach((it) => (add(bol, it.value), add(reg, it.label)));
    else if (b.type === 'callout') {
      add(bol, b.title);
      add(reg, b.text);
    }
  });
  return { regular: [...reg].join(''), bold: [...bol].join('') };
}
