// 進階區塊的建構函式：給 compile 與範本用，輸入一般資料、輸出 DocModel 區塊。
// 標題區、摘要數字列、稱讚提示在 model.ts 是獨立的區塊類型（由 PDF／Word 引擎直接繪製）；自評對照表用既有的表格區塊組成。
import type { Block, CalloutBlock, HeroBlock, StatsBlock, TableBlock } from './model';

export const hero = (title: string, subtitle?: string, extra: Partial<HeroBlock> = {}): HeroBlock => ({ type: 'hero', title, ...(subtitle ? { subtitle } : {}), after: 10, ...extra });

export const stats = (items: { label: string; value: string }[], extra: Partial<StatsBlock> = {}): StatsBlock => ({ type: 'stats', items, after: 10, ...extra });

export const praise = (text: string, title = '你的強項'): CalloutBlock => ({ type: 'callout', tone: 'praise', title, text, after: 8 });
export const hint = (text: string, title = '下一步可以試試'): CalloutBlock => ({ type: 'callout', tone: 'hint', title, text, after: 8 });

export interface CompareRow {
  item: string;
  /** 同學給的分（他評平均）。 */
  others: number;
  /** 自己給自己的分。 */
  self: number;
}

/** 自評對照表：每項的他評、自評與落差（自評 − 他評，正數 = 自評較高）。 */
export function compareTable(rows: CompareRow[], opts: { digits?: number; size?: number; rowH?: number; width?: number } = {}): TableBlock {
  const d = opts.digits ?? 1;
  const W = opts.width ?? 481.88;
  const first = W * 0.4;
  const rest = (W - first) / 3;
  const sign = (n: number) => (n > 0 ? '+' : '') + n.toFixed(d);
  return {
    type: 'table',
    widths: [first, rest, rest, rest],
    header: ['項目', '同學給的', '自己給的', '落差'],
    rows: rows.map((r) => [r.item, r.others.toFixed(d), r.self.toFixed(d), sign(r.self - r.others)]),
    rowH: opts.rowH ?? 24,
    size: opts.size ?? 10.5,
    after: 8,
  };
}

/** 多欄便利函式：等寬並排。 */
export const columns = (cols: Block[][], extra: { widths?: number[]; gap?: number } = {}): Block => ({ type: 'columns', cols, ...extra });
