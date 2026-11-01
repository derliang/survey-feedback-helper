// 單一學生覆寫：只存「和全班範本不同的地方」，回到全班範本不受影響。
import { walk } from './ops';
import type { EBlock, EditorTemplate } from './types';

/** 個別學生可以改的欄位（不含 id、kind、條件）。 */
export const OVERRIDABLE = ['text', 'items', 'size', 'color', 'bg', 'colors', 'chartType', 'compareLine'] as const;

export interface BlockOverride {
  hidden?: boolean;
  patch?: Record<string, unknown>;
}
export interface StudentOverride {
  blocks: Record<string, BlockOverride>;
  /** 覆寫變數（例如把 {姓名} 換成暱稱）。 */
  vars?: Record<string, string>;
}
/** 學生鍵 → 覆寫；鍵由應用層決定（班級-座號）。 */
export type OverrideMap = Record<string, StudentOverride>;

export function setBlockOverride(m: OverrideMap, student: string, blockId: string, ov: BlockOverride): OverrideMap {
  const cur = m[student] ?? { blocks: {} };
  const patch = ov.patch ? Object.fromEntries(Object.entries(ov.patch).filter(([k]) => (OVERRIDABLE as readonly string[]).includes(k))) : undefined;
  const clean: BlockOverride = {};
  if (ov.hidden) clean.hidden = true;
  if (patch && Object.keys(patch).length) clean.patch = patch;
  const blocks = { ...cur.blocks };
  if (Object.keys(clean).length) blocks[blockId] = clean;
  else delete blocks[blockId];
  return prune({ ...m, [student]: { ...cur, blocks } }, student);
}

export function setVarOverride(m: OverrideMap, student: string, name: string, value: string | undefined): OverrideMap {
  const cur = m[student] ?? { blocks: {} };
  const vars = { ...(cur.vars ?? {}) };
  if (value === undefined) delete vars[name];
  else vars[name] = value;
  return prune({ ...m, [student]: { ...cur, vars } }, student);
}

function prune(m: OverrideMap, student: string): OverrideMap {
  const s = m[student];
  if (s && !Object.keys(s.blocks).length && !Object.keys(s.vars ?? {}).length) {
    const rest = { ...m };
    delete rest[student];
    return rest;
  }
  return m;
}

export const clearStudent = (m: OverrideMap, student: string): OverrideMap => {
  const rest = { ...m };
  delete rest[student];
  return rest;
};

/** 覆寫項目數（頁頂橫幅「個別版本，N 項覆寫」）。 */
export function countOverrides(s: StudentOverride | undefined): number {
  return s ? Object.keys(s.blocks).length + Object.keys(s.vars ?? {}).length : 0;
}

export interface OverrideItem {
  kind: 'block' | 'var';
  id: string;
  label: string;
  what: string;
  /** 區塊覆寫的哪一部分（隱藏／改內容），var 沒有。 */
  part?: BlockPart;
}
export type BlockPart = 'hidden' | 'patch';

/** 只拿掉區塊覆寫的某一部分，其餘保留（全拿掉就回傳空物件，setBlockOverride 會刪除該項）。 */
export function withoutBlockPart(ov: BlockOverride | undefined, part: BlockPart): BlockOverride {
  const rest: BlockOverride = { ...(ov ?? {}) };
  delete rest[part];
  return rest;
}
/** 面板列出被改過的項目，可逐項還原。 */
export function listOverrides(t: EditorTemplate, s: StudentOverride | undefined): OverrideItem[] {
  if (!s) return [];
  const names = new Map<string, string>();
  walk(t.blocks, (b) => names.set(b.id, b.label ?? b.kind));
  const out: OverrideItem[] = [];
  for (const [id, ov] of Object.entries(s.blocks)) {
    const label = names.get(id) ?? '（已刪除的區塊）';
    if (ov.hidden) out.push({ kind: 'block', id, label, what: '隱藏', part: 'hidden' });
    if (ov.patch) out.push({ kind: 'block', id, label, what: `改了 ${Object.keys(ov.patch).join('、')}`, part: 'patch' });
  }
  for (const k of Object.keys(s.vars ?? {})) out.push({ kind: 'var', id: k, label: `{${k}}`, what: '換了內容' });
  return out;
}

/** 套用某位學生的覆寫到範本（回傳新範本；沒有覆寫就原樣回傳）。 */
export function applyOverrides(t: EditorTemplate, s: StudentOverride | undefined): EditorTemplate {
  if (!s || !Object.keys(s.blocks).length) return t;
  const map = (list: EBlock[]): EBlock[] =>
    list.flatMap((b) => {
      const ov = s.blocks[b.id];
      if (ov?.hidden) return [];
      const nb = (ov?.patch ? { ...b, ...ov.patch } : b) as EBlock;
      return [nb.kind === 'columns' ? { ...nb, cols: nb.cols.map(map) } : nb];
    });
  return { ...t, blocks: map(t.blocks) };
}
