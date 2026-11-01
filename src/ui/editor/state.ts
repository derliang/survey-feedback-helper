// 編輯器的畫面狀態：自己一個小 store，不碰 app 的 store（只讀資料夾狀態、用它的提示訊息）。
// 編輯器資料（我的範本、學生覆寫、圖片）寫進資料夾的 EDITOR_FILE；沒有資料夾時只留在記憶體並提示下載。
import { useEffect, useReducer } from 'preact/hooks';
import { getState as appState, set as appSet } from '../../app/store';
import { downloadText } from '../../storage';
import { builtinTemplates } from '../../editor/builtin';
import { type History, canRedo, canUndo, commit, createHistory, redo, undo } from '../../editor/history';
import { ensureEditable, exportTemplate, importTemplate, resetToBuiltin, TemplateImportError, uniqueName } from '../../editor/library';
import { blankBlock, dropBlock, duplicateBlock, findBlock, insertBlock, moveBlock, removeBlock, setColumnCount, setPage, updateBlock } from '../../editor/ops';
import { type BlockOverride, type OverrideMap, setBlockOverride, setVarOverride } from '../../editor/overrides';
import { EDITOR_FILE, type EditorData, emptyEditorData, parseEditorData, serializeEditorData } from '../../editor/project';
import type { EBlock, EBlockKind, EditorTemplate, PageSpec } from '../../editor/types';

export type Screen = 'library' | 'edit';
export type Panel = 'props' | 'add' | 'page' | 'student' | 'menu' | null;

export interface ES {
  loaded: boolean;
  screen: Screen;
  data: EditorData;
  /** 正在編輯的範本（含復原歷史）；內建範本在第一次修改時才複製成「我的範本」。 */
  hist: History<EditorTemplate> | null;
  sel: string | null;
  /** 手機：預設捲動模式，打開「編輯」才能選取與修改。 */
  editMode: boolean;
  view: 'preview' | 'list';
  /** 預覽縮放；null = 符合寬度。 */
  zoom: number | null;
  panel: Panel;
  /** 「個別學生版本」：選到某位學生後，文字等修改只存在這位學生身上。 */
  student: string | null;
  /** 資料沒有存進資料夾（沒資料夾或寫入失敗）。 */
  unsaved: boolean;
  /** 範本庫選單開在哪份範本。 */
  menuFor: string | null;
  confirm: null | { kind: 'delete' | 'reset'; id: string };
  /** 目前正在輸出時要用的範本。 */
  useId: string | null;
}

const init: ES = {
  loaded: false,
  screen: 'library',
  data: emptyEditorData(),
  hist: null,
  sel: null,
  editMode: false,
  view: 'preview',
  zoom: null,
  panel: null,
  student: null,
  unsaved: false,
  menuFor: null,
  confirm: null,
  useId: null,
};

let st: ES = init;
const subs = new Set<() => void>();
export const es = (): ES => st;
function put(p: Partial<ES>): void {
  st = { ...st, ...p };
  subs.forEach((f) => f());
}
export function useEditor(): ES {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    subs.add(tick as () => void);
    return () => void subs.delete(tick as () => void);
  }, []);
  return st;
}
const toast = (m: string): void => appSet({ toast: m });

/** 範本庫的全部範本：我的在前，內建在後。 */
export const allTemplates = (d: EditorData = st.data): EditorTemplate[] => [...d.templates, ...builtinTemplates()];
export const current = (): EditorTemplate | null => st.hist?.present ?? null;

// ---- 讀寫 ----

export async function load(): Promise<void> {
  if (st.loaded) return;
  const f = appState().folder;
  let data = emptyEditorData();
  let unsaved = f.state !== 'ready';
  if (f.state === 'ready') {
    try {
      const text = await f.store.read(EDITOR_FILE);
      if (text !== null) {
        const r = parseEditorData(text);
        data = r.data;
        if (r.skipped) toast(`有 ${r.skipped} 份範本無法讀取，已略過。`);
      }
      unsaved = false;
    } catch {
      toast('範本檔讀不出來，先用空白的。原檔沒有被改動。');
      unsaved = true;
    }
  }
  put({ loaded: true, data, unsaved, useId: data.settings.global.templateId || null });
}

let timer: ReturnType<typeof setTimeout> | undefined;
async function write(): Promise<void> {
  const f = appState().folder;
  if (f.state !== 'ready') return put({ unsaved: true });
  try {
    await f.store.write(EDITOR_FILE, serializeEditorData(st.data));
    put({ unsaved: false });
  } catch {
    put({ unsaved: true });
    toast('範本寫入資料夾失敗，請下載備份。');
  }
}
function save(data: EditorData): void {
  put({ data });
  clearTimeout(timer);
  timer = setTimeout(() => void write(), 500);
}
export function downloadBackup(): void {
  downloadText(EDITOR_FILE, serializeEditorData(st.data));
  put({ unsaved: false });
}

// ---- 範本庫 ----

function setMine(list: EditorTemplate[]): void {
  save({ ...st.data, templates: list });
}
function upsertMine(t: EditorTemplate): void {
  const list = st.data.templates;
  setMine(list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [t, ...list]);
}

export function openEditor(id: string): void {
  const t = allTemplates().find((x) => x.id === id);
  if (!t) return;
  put({ hist: createHistory(t), screen: 'edit', sel: null, panel: null, student: null, editMode: false, view: 'preview', zoom: null, menuFor: null });
}
export function backToLibrary(): void {
  put({ screen: 'library', hist: null, sel: null, panel: null, student: null });
}
export function useTemplate(id: string): void {
  const data = { ...st.data, settings: { ...st.data.settings, global: { ...st.data.settings.global, templateId: id } } };
  put({ useId: id, menuFor: null });
  save(data);
  toast('之後輸出會用這份範本。');
}
export function duplicate(id: string): void {
  const t = allTemplates().find((x) => x.id === id);
  if (!t) return;
  const copy = ensureEditable({ ...t, builtin: true }, st.data.templates);
  const named = { ...copy, name: uniqueName(`${t.name.replace('（我的）', '')} 副本`, st.data.templates), basedOn: t.builtin ? t.id : t.basedOn };
  upsertMine(named);
  put({ menuFor: null });
  toast(`已複製為「${named.name}」。`);
}
export function newTemplate(): void {
  const base = builtinTemplates()[0]!;
  const t = { ...ensureEditable(base, st.data.templates), name: '新的範本', blocks: [] as EBlock[] };
  upsertMine(t);
  openEditor(t.id);
}
export function removeTemplate(id: string): void {
  setMine(st.data.templates.filter((x) => x.id !== id));
  put({ confirm: null, menuFor: null, useId: st.useId === id ? null : st.useId });
}
export function resetTemplate(id: string): void {
  const mine = st.data.templates.find((x) => x.id === id);
  const orig = mine?.basedOn ? resetToBuiltin(mine.basedOn) : null;
  if (!mine || !orig) return;
  upsertMine({ ...orig, id: mine.id, name: mine.name, builtin: false, basedOn: orig.id });
  put({ confirm: null, menuFor: null });
  toast('已恢復成內建版面。');
}
export function exportOne(id: string): void {
  const t = allTemplates().find((x) => x.id === id);
  if (!t) return;
  downloadText(`${t.name}.json`, exportTemplate(t));
  put({ menuFor: null });
}
export async function importFile(file: File): Promise<void> {
  try {
    const t = importTemplate(await file.text(), st.data.templates);
    upsertMine(t);
    toast(`已匯入「${t.name}」。`);
  } catch (e) {
    toast(e instanceof TemplateImportError ? e.message : '讀不出這個檔案。');
  }
}

// ---- 編輯 ----

/** 套用一次修改。內建範本先複製成「我的範本」；同一個 key 連續輸入合成一步復原。 */
function apply(fn: (t: EditorTemplate) => EditorTemplate, key?: string): void {
  const h = st.hist;
  if (!h) return;
  let base = h.present;
  let hist = h;
  if (base.builtin) {
    base = ensureEditable(base, st.data.templates);
    hist = { ...h, present: base };
    toast(`內建範本不能直接改，已複製成「${base.name}」。`);
  }
  const next = fn(base);
  const nh = next === base && hist === h ? h : commit(hist, next, key);
  put({ hist: nh });
  if (!nh.present.builtin) upsertMine(nh.present);
}

export const addBlock = (kind: EBlockKind, preset?: Partial<EBlock>): void => {
  const after = st.sel ?? undefined;
  let newId = '';
  const selBlock = st.sel && st.hist ? findBlock(st.hist.present, st.sel) : null;
  apply((t) => {
    const b = { ...blankBlock(kind), ...(preset ?? {}) } as EBlock;
    newId = b.id;
    // 選到的是多欄：新區塊放進第一欄
    if (selBlock?.kind === 'columns') return insertBlock(t, b, undefined, { columnsId: selBlock.id, col: 0 });
    return insertBlock(t, b, after);
  });
  put({ sel: newId, panel: 'props' });
};
export const patchBlock = (id: string, patch: Record<string, unknown>, key?: string): void => apply((t) => updateBlock(t, id, patch), key);
export const deleteBlock = (id: string): void => {
  apply((t) => removeBlock(t, id));
  put({ sel: null, panel: null });
};
export const moveSel = (id: string, d: -1 | 1): void => apply((t) => moveBlock(t, id, d));
export const dropSel = (id: string, target: string, before: boolean): void => apply((t) => dropBlock(t, id, target, before));
export const dupBlock = (id: string): void => apply((t) => duplicateBlock(t, id));
export const patchPage = (p: Partial<PageSpec>): void => apply((t) => setPage(t, p));
export const renameTemplate = (name: string): void => apply((t) => ({ ...t, name }), 'rename');
export const columnCount = (id: string, n: number): void => apply((t) => setColumnCount(t, id, n));
export const doUndo = (): void => {
  if (st.hist && canUndo(st.hist)) {
    const nh = undo(st.hist);
    put({ hist: nh });
    if (!nh.present.builtin) upsertMine(nh.present);
  }
};
export const doRedo = (): void => {
  if (st.hist && canRedo(st.hist)) {
    const nh = redo(st.hist);
    put({ hist: nh });
    if (!nh.present.builtin) upsertMine(nh.present);
  }
};
export const select = (id: string | null): void => put({ sel: id });
export const setPanel = (panel: Panel): void => put({ panel });
export const setView = (view: ES['view']): void => put({ view });
export const setEditMode = (editMode: boolean): void => put({ editMode, sel: editMode ? st.sel : null, panel: null });
export const setZoom = (zoom: number | null): void => put({ zoom });
export const setMenuFor = (menuFor: string | null): void => put({ menuFor });
export const setConfirm = (confirm: ES['confirm']): void => put({ confirm, menuFor: confirm ? null : st.menuFor });

// ---- 圖片 ----

export async function addImage(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    toast('請選圖片檔。');
    return null;
  }
  if (file.size > 300 * 1024) {
    toast('圖片請小於 300 KB（Logo 不需要太大）。');
    return null;
  }
  const url = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  const key = `img-${Date.now().toString(36)}`;
  save({ ...st.data, images: { ...st.data.images, [key]: url } });
  return key;
}

// ---- 個別學生版本 ----

export const overrideKey = (): string => appState().session?.surveyId ?? '_sample';
export const currentOverrides = (): OverrideMap => st.data.overrides[overrideKey()] ?? {};
function saveOverrides(m: OverrideMap): void {
  const overrides = { ...st.data.overrides };
  if (Object.keys(m).length) overrides[overrideKey()] = m;
  else delete overrides[overrideKey()];
  save({ ...st.data, overrides });
}
export const pickStudent = (student: string | null): void => put({ student, panel: null });
export function overrideBlock(blockId: string, ov: BlockOverride): void {
  if (!st.student) return;
  saveOverrides(setBlockOverride(currentOverrides(), st.student, blockId, ov));
}
export function overrideVar(name: string, value: string | undefined): void {
  if (!st.student) return;
  saveOverrides(setVarOverride(currentOverrides(), st.student, name, value));
}
