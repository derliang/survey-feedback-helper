// 範本庫與匯出入：內建範本不可改（第一次修改複製成「我的範本」）、恢復預設、單一範本的匯出入與分享。
import { builtinTemplates } from './builtin';
import { newId, walk } from './ops';
import type { EBlock, EditorTemplate } from './types';
import { PAGE_SIZES } from './types';

export const TEMPLATE_FORMAT = 'sfh-template';

/** 取出可編輯的範本：內建的先複製成「我的範本」（名稱加「（我的）」，已存在則加序號）。 */
export function ensureEditable(t: EditorTemplate, mine: EditorTemplate[]): EditorTemplate {
  if (!t.builtin) return t;
  const copy: EditorTemplate = JSON.parse(JSON.stringify(t));
  copy.id = `mine-${newId()}`;
  copy.builtin = false;
  copy.basedOn = t.id;
  copy.name = uniqueName(`${t.name}（我的）`, mine);
  return copy;
}

export function uniqueName(name: string, existing: EditorTemplate[]): string {
  const used = new Set(existing.map((e) => e.name));
  if (!used.has(name)) return name;
  for (let i = 2; ; i++) if (!used.has(`${name} ${i}`)) return `${name} ${i}`;
}

/** 恢復預設：回傳該範本對應的內建原版（我的範本以其來源內建 id 判斷不了，所以由呼叫端傳內建 id）。 */
export function resetToBuiltin(builtinId: string): EditorTemplate | null {
  return builtinTemplates().find((b) => b.id === builtinId) ?? null;
}

/** 匯出單一範本為 JSON 文字（可分享）。不含學生資料；圖片只存參照名稱。 */
export function exportTemplate(t: EditorTemplate): string {
  return JSON.stringify({ format: TEMPLATE_FORMAT, version: 1, template: { ...t, builtin: false } }, null, 2);
}

export class TemplateImportError extends Error {}

const KINDS = ['heading', 'text', 'bullets', 'data', 'image', 'divider', 'pageBreak', 'columns'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function cleanBlock(v: unknown, seen: Set<string>): EBlock | null {
  if (!isObj(v) || typeof v.kind !== 'string' || !KINDS.includes(v.kind)) return null;
  const b = { ...v } as Record<string, unknown>;
  // 匯入的 id 一律重發，避免和現有範本或覆寫撞號
  b.id = newId();
  seen.add(b.id as string);
  if (b.kind === 'columns') {
    const cols = Array.isArray(b.cols) ? b.cols : [];
    b.cols = cols.map((c) => (Array.isArray(c) ? c.map((x) => cleanBlock(x, seen)).filter((x): x is EBlock => x !== null) : []));
    if ((b.cols as unknown[]).length < 2) b.cols = [[], []];
  }
  // 必要欄位補預設，避免壞檔讓編輯器當掉
  if (typeof b.size !== 'number' && (b.kind === 'heading' || b.kind === 'text' || b.kind === 'bullets')) b.size = 11;
  if ((b.kind === 'heading' || b.kind === 'text') && typeof b.text !== 'string') b.text = '';
  if (b.kind === 'bullets' && !Array.isArray(b.items)) b.items = [];
  if (b.kind === 'data') {
    if (typeof b.slot !== 'string') b.slot = '';
    if (!['table', 'chart', 'comments', 'teacherComment'].includes(b.dataKind as string)) b.dataKind = 'table';
  }
  if (b.kind === 'image') {
    if (typeof b.src !== 'string') b.src = '';
    if (typeof b.w !== 'number') b.w = 120;
    if (typeof b.h !== 'number') b.h = 60;
  }
  return b as unknown as EBlock;
}

/** 讀範本檔；格式不對丟 TemplateImportError。回傳的範本一律不是內建，id 與區塊 id 重發，名稱不重複。 */
export function importTemplate(text: string, existing: EditorTemplate[]): EditorTemplate {
  let raw: unknown;
  try {
    raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    throw new TemplateImportError('這不是範本檔');
  }
  if (!isObj(raw) || raw.format !== TEMPLATE_FORMAT || typeof raw.version !== 'number' || !isObj(raw.template)) throw new TemplateImportError('這不是範本檔');
  if (raw.version > 1) throw new TemplateImportError('這個範本來自較新的版本，請先更新網頁');
  const t = raw.template;
  const page = isObj(t.page) ? t.page : {};
  const size = (['A4', 'A5', 'Letter'] as const).find((s) => s === page.size) ?? 'A4';
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), 200) : d);
  const seen = new Set<string>();
  const blocks = (Array.isArray(t.blocks) ? t.blocks : []).map((x) => cleanBlock(x, seen)).filter((x): x is EBlock => x !== null);
  const result: EditorTemplate = {
    id: `mine-${newId()}`,
    name: uniqueName(typeof t.name === 'string' && t.name.trim() ? t.name.trim().slice(0, 40) : '匯入的範本', existing),
    builtin: false,
    forKind: t.forKind === 'opinion' || t.forKind === 'vote' ? t.forKind : 'feedback',
    lineH: num(t.lineH, 18) || 18,
    page: {
      size,
      orientation: page.orientation === 'landscape' ? 'landscape' : 'portrait',
      mx: num(page.mx, 56.7),
      mt: num(page.mt, 56.7),
      mb: num(page.mb, 70),
      footerText: typeof page.footerText === 'string' ? page.footerText : '',
      ...(typeof page.headerText === 'string' ? { headerText: page.headerText } : {}),
      ...(typeof page.background === 'string' && /^#[0-9a-f]{6}$/i.test(page.background) ? { background: page.background } : {}),
      ...(typeof page.logoSrc === 'string' ? { logoSrc: page.logoSrc } : {}),
      ...(isObj(page.frame) && typeof page.frame.color === 'string' && /^#[0-9a-f]{6}$/i.test(page.frame.color)
        ? { frame: { color: page.frame.color, width: num(page.frame.width, 1), rounded: page.frame.rounded === true } }
        : {}),
    },
    blocks,
  };
  // 邊界不可大到沒有內文空間
  const dim = PAGE_SIZES[size];
  const w = result.page.orientation === 'landscape' ? dim.h : dim.w;
  if (result.page.mx * 2 > w / 2) result.page.mx = 56.7; // 左右邊界合計超過頁寬一半就還原
  return result;
}

/** 範本引用的圖片參照（匯出分享時提醒「圖片不隨檔案」）。 */
export function referencedImages(t: EditorTemplate): string[] {
  const out = new Set<string>();
  if (t.page.logoSrc) out.add(t.page.logoSrc);
  walk(t.blocks, (b) => b.kind === 'image' && b.src && out.add(b.src));
  return [...out];
}
