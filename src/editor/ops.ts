// 區塊操作：全部不改原物件（回傳新的範本），方便復原／重做。id 可在巢狀的多欄裡找。
import type { ColumnsEB, EBlock, EBlockKind, EditorTemplate } from './types';
import { KIND_NAMES } from './types';

let counter = 0;
/** 產生區塊 id；測試可傳自己的產生器。 */
export function newId(): string {
  counter += 1;
  const rnd = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);
  return `b${counter}-${rnd}`;
}

type Loc = { list: EBlock[]; index: number; parent: ColumnsEB | null; col: number };

function find(blocks: EBlock[], id: string, parent: ColumnsEB | null = null, col = 0): Loc | null {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.id === id) return { list: blocks, index: i, parent, col };
    if (b.kind === 'columns') {
      for (let c = 0; c < b.cols.length; c++) {
        const r = find(b.cols[c]!, id, b, c);
        if (r) return r;
      }
    }
  }
  return null;
}

/** 深拷貝（範本只含 JSON 型別）。 */
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

function edit(t: EditorTemplate, id: string, fn: (loc: Loc) => void): EditorTemplate {
  const next = clone(t);
  const loc = find(next.blocks, id);
  if (!loc) return t;
  fn(loc);
  return next;
}

export function findBlock(t: EditorTemplate, id: string): EBlock | null {
  const loc = find(t.blocks, id);
  return loc ? loc.list[loc.index]! : null;
}

/** 依序走過所有區塊（含多欄裡的）。 */
export function walk(blocks: EBlock[], fn: (b: EBlock) => void): void {
  for (const b of blocks) {
    fn(b);
    if (b.kind === 'columns') b.cols.forEach((c) => walk(c, fn));
  }
}

/** 預設的新區塊內容。 */
export function blankBlock(kind: EBlockKind, id = newId()): EBlock {
  switch (kind) {
    case 'heading':
      return { id, kind, text: '新標題', size: 14, color: '#1f4e79', before: 6, after: 6 };
    case 'text':
      return { id, kind, text: '在這裡輸入文字，可用 {姓名} 這類變數。', size: 11, after: 8 };
    case 'bullets':
      return { id, kind, items: ['項目一', '項目二'], size: 11, after: 8 };
    case 'data':
      return { id, kind, slot: '', dataKind: 'table', after: 10 };
    case 'image':
      return { id, kind, src: '', w: 120, h: 60, after: 8 };
    case 'divider':
      return { id, kind, after: 8 };
    case 'pageBreak':
      return { id, kind };
    case 'columns':
      return { id, kind, cols: [[], []], after: 8 };
    case 'hero':
      return { id, kind, title: '{班級} {事項}', subtitle: '{姓名} 的回饋單', after: 10 };
    case 'stats':
      return { id, kind, items: ['mine', 'classMean', 'rank'], perRow: 3, after: 10 };
    case 'callout':
      return { id, kind, tone: 'praise', title: '你的強項', text: '', slot: 'praise', after: 8 };
    case 'compare':
      return { id, kind, after: 8 };
  }
}

export const blockName = (b: EBlock): string => b.label ?? KIND_NAMES[b.kind];

/** 在 afterId 之後插入；afterId 為 null 插在最前，未提供插在最後。多欄用 colTarget 指定放進哪一欄。 */
export function insertBlock(t: EditorTemplate, block: EBlock, afterId?: string | null, colTarget?: { columnsId: string; col: number }): EditorTemplate {
  const next = clone(t);
  if (colTarget) {
    const loc = find(next.blocks, colTarget.columnsId);
    const host = loc?.list[loc.index];
    if (!host || host.kind !== 'columns' || !host.cols[colTarget.col]) return t;
    host.cols[colTarget.col]!.push(block);
    return next;
  }
  if (afterId === null) next.blocks.unshift(block);
  else if (afterId === undefined) next.blocks.push(block);
  else {
    const loc = find(next.blocks, afterId);
    if (!loc) return t;
    loc.list.splice(loc.index + 1, 0, block);
  }
  return next;
}

export function removeBlock(t: EditorTemplate, id: string): EditorTemplate {
  return edit(t, id, (l) => l.list.splice(l.index, 1));
}

/** 上移（-1）或下移（+1）一格；已在邊界則原樣回傳（同一個物件，呼叫端可據此不記錄歷史）。 */
export function moveBlock(t: EditorTemplate, id: string, delta: -1 | 1): EditorTemplate {
  const loc = find(t.blocks, id);
  if (!loc) return t;
  const to = loc.index + delta;
  if (to < 0 || to >= loc.list.length) return t;
  return edit(t, id, (l) => {
    const [b] = l.list.splice(l.index, 1) as [EBlock];
    l.list.splice(to, 0, b);
  });
}

/** 拖曳：把 id 搬到 targetId 之前（before=true）或之後；不能搬進自己的多欄裡。 */
export function dropBlock(t: EditorTemplate, id: string, targetId: string, before: boolean): EditorTemplate {
  if (id === targetId) return t;
  const src = find(t.blocks, id);
  if (!src) return t;
  const moving = src.list[src.index]!;
  if (moving.kind === 'columns') {
    let inside = false;
    walk([moving], (b) => (inside ||= b.id === targetId));
    if (inside) return t;
  }
  const next = clone(t);
  const s = find(next.blocks, id)!;
  const [b] = s.list.splice(s.index, 1) as [EBlock];
  const d = find(next.blocks, targetId);
  if (!d) return t;
  d.list.splice(d.index + (before ? 0 : 1), 0, b);
  return next;
}

/** 複製：產生新 id（含多欄裡的子區塊），放在原區塊之後。 */
export function duplicateBlock(t: EditorTemplate, id: string, gen: () => string = newId): EditorTemplate {
  return edit(t, id, (l) => {
    const copy = clone(l.list[l.index]!);
    walk([copy], (b) => (b.id = gen()));
    l.list.splice(l.index + 1, 0, copy);
  });
}

/** 改區塊內容（只改傳入的欄位；kind 與 id 不可改）。 */
export function updateBlock(t: EditorTemplate, id: string, patch: Record<string, unknown>): EditorTemplate {
  return edit(t, id, (l) => {
    const { kind: _k, id: _i, ...rest } = patch;
    void _k;
    void _i;
    const b = l.list[l.index]! as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) delete b[k];
      else b[k] = v;
    }
  });
}

export function setPage(t: EditorTemplate, patch: Partial<EditorTemplate['page']>): EditorTemplate {
  const page = { ...t.page };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete (page as Record<string, unknown>)[k];
    else (page as Record<string, unknown>)[k] = v;
  }
  return { ...t, page };
}

/** 多欄增減欄數（2–4 欄）；減少時被移除的欄的內容併進最後一欄。 */
export function setColumnCount(t: EditorTemplate, id: string, count: number): EditorTemplate {
  const n = Math.min(4, Math.max(2, Math.round(count)));
  return edit(t, id, (l) => {
    const b = l.list[l.index]!;
    if (b.kind !== 'columns' || b.cols.length === n) return;
    while (b.cols.length < n) b.cols.push([]);
    while (b.cols.length > n) {
      const extra = b.cols.pop()!;
      b.cols[b.cols.length - 1]!.push(...extra);
    }
  });
}
