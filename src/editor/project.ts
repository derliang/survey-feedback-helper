// 編輯器相關資料存進使用者選定的資料夾：我的範本、設定兩層、各問卷的學生覆寫。
// 與 storage 的 FolderData（問卷與名單）分檔存放，兩邊版本號各自演進；匯出備份時一起打包（見 bundle）。
import { importTemplate } from './library';
import type { OverrideMap } from './overrides';
import { emptyLayers, persistable, type SettingsLayers } from './settings';
import type { EditorTemplate } from './types';

export const EDITOR_FILE = '問卷小幫手範本與版面.sfh';
export const EDITOR_VERSION = 2;

export interface EditorData {
  version: typeof EDITOR_VERSION;
  templates: EditorTemplate[];
  settings: Pick<SettingsLayers, 'global' | 'byKind'>;
  /** 問卷 id → 學生覆寫。 */
  overrides: Record<string, OverrideMap>;
}

export const emptyEditorData = (): EditorData => ({ version: EDITOR_VERSION, templates: [], settings: persistable(emptyLayers()), overrides: {} });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 逐版轉換：每個函式把 N 版的原始資料升到 N+1 版。 */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // v1（設計初稿）：settings 是單層扁平物件、範本放在 `layouts`。
  1: (d) => ({ ...d, version: 2, templates: d.layouts ?? [], settings: { global: isObj(d.settings) ? d.settings : {}, byKind: {} }, overrides: d.overrides ?? {} }),
};

export class EditorDataError extends Error {}

/** 讀檔；較舊版本自動轉換，較新版本拒絕（避免舊網頁蓋掉新資料）。壞掉的範本略過並回報數量。 */
export function parseEditorData(text: string): { data: EditorData; skipped: number; migratedFrom?: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    throw new EditorDataError('這不是設定檔');
  }
  if (!isObj(raw) || typeof raw.version !== 'number') throw new EditorDataError('這不是設定檔');
  if (raw.version > EDITOR_VERSION) throw new EditorDataError('這份設定來自較新的版本，請先更新網頁');
  const from = raw.version;
  let cur: Record<string, unknown> = raw;
  while ((cur.version as number) < EDITOR_VERSION) {
    const step = MIGRATIONS[cur.version as number];
    if (!step) throw new EditorDataError('不支援這個舊版本的設定檔');
    cur = step(cur);
  }
  const templates: EditorTemplate[] = [];
  let skipped = 0;
  for (const t of Array.isArray(cur.templates) ? cur.templates : []) {
    try {
      // 直接走匯入的清理流程，但保留原 id（覆寫與設定靠 id 對應）
      const keepId = isObj(t) && typeof t.id === 'string' ? t.id : null;
      const imp = importTemplate(JSON.stringify({ format: 'sfh-template', version: 1, template: t }), templates);
      templates.push(keepId ? { ...imp, id: keepId, name: isObj(t) && typeof t.name === 'string' ? t.name : imp.name } : imp);
    } catch {
      skipped++;
    }
  }
  const s = isObj(cur.settings) ? cur.settings : {};
  const settings = {
    global: isObj(s.global) ? (s.global as SettingsLayers['global']) : {},
    byKind: isObj(s.byKind) ? (s.byKind as SettingsLayers['byKind']) : {},
  };
  const overrides = isObj(cur.overrides) ? (cur.overrides as EditorData['overrides']) : {};
  return { data: { version: EDITOR_VERSION, templates, settings, overrides }, skipped, ...(from < EDITOR_VERSION ? { migratedFrom: from } : {}) };
}

export const serializeEditorData = (d: EditorData): string => JSON.stringify(d, null, 2);

/** 備份包：問卷與名單（storage 的設定檔文字）加上編輯器資料，一個 JSON，匯入時拆開。 */
export function bundleBackup(folderDataText: string, editor: EditorData): string {
  return JSON.stringify({ format: 'sfh-backup', version: 1, folder: folderDataText, editor: serializeEditorData(editor) });
}
export function unbundleBackup(text: string): { folder: string; editor: string } {
  const raw: unknown = JSON.parse(text);
  if (!isObj(raw) || raw.format !== 'sfh-backup' || typeof raw.folder !== 'string' || typeof raw.editor !== 'string') throw new EditorDataError('這不是備份檔');
  return { folder: raw.folder, editor: raw.editor };
}
