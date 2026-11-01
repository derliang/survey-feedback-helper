import { useEffect, useReducer } from 'preact/hooks';
import { type Table, recognizeConfig } from '../core';
import {
  type FolderData,
  type FolderStatus,
  type Prefs,
  type SavedSurvey,
  SETTINGS_FILE,
  applyTheme,
  downloadText,
  emptyFolderData,
  forgetFolder,
  loadPrefs,
  mergeFolderData,
  parseFolderData,
  pickFolder,
  reauthorizeFolder,
  restoreFolder,
  savePrefs,
  serializeFolderData,
  upsertRoster,
  upsertSurvey,
} from '../storage';
import type { SurveyKind } from '../storage';
import { type ColumnInfo, type Scale, analyzeColumns, applySavedMapping, detectScale, inferKind, toSavedLabels, toSavedMapping } from './columns';
import { LoadError, type FileLike, surveyNameFromFile, tableFromFile } from './load';
import { type RosterRow, isMixedClasses, rosterFromRows } from './roster-input';

export type Route = 'home' | 'prepare' | 'stats' | 'output' | 'settings';
export type Sub = 'type' | 'mapping' | 'roster' | 'compare' | 'check';

/** 一份正在處理的問卷。作答資料只在記憶體，關掉分頁就沒有（硬規則 6）。 */
export interface Session {
  fileName: string;
  sourceLabel: string;
  name: string;
  table: Table;
  cols: ColumnInfo[];
  kind: SurveyKind;
  kindReason: string;
  kindConfirmed: boolean;
  scale: Scale;
  mappingConfirmed: boolean;
  /** 之前存過、欄位標題相似的設定，等老師回答「是不是之前的」。 */
  recognition: { survey: SavedSurvey; similarity: number } | null;
  surveyId: string;
  /** 之前讀到的筆數，null 表示第一次讀。 */
  previousRows: number | null;
  rosterRows: RosterRow[] | null;
  rosterMixed: boolean;
  rosterSkipped: boolean;
  rosterName: string;
  /** 名單對照：老師對每一列的決定。 */
  resolutions: Record<number, 'accept' | 'exclude'>;
  /** 資料檢查：被排除的列、書名合併、已處理或忽略的類別。 */
  excluded: number[];
  titleMerges: Record<string, string>;
  checkHandled: string[];
}

export interface AppState {
  ready: boolean;
  route: Route;
  sub: Sub | null;
  session: Session | null;
  folder: FolderStatus;
  data: FolderData;
  /** 沒有資料夾時，設定有更新但還沒下載。 */
  dirty: boolean;
  prefs: Prefs;
  folderDialog: boolean;
  confirmRestart: boolean;
  toast: string | null;
  error: LoadError['reason'] | 'settings' | null;
  /** 從「最近的問卷」卡片點進來，等選檔後優先比對這一份。 */
  pendingRecent: string | null;
  oldBrowser: boolean;
}

const initial: AppState = {
  ready: false,
  route: 'home',
  sub: null,
  session: null,
  folder: { state: 'none' },
  data: emptyFolderData(),
  dirty: false,
  prefs: { theme: 'auto', dismissed: [] },
  folderDialog: false,
  confirmRestart: false,
  toast: null,
  error: null,
  pendingRecent: null,
  oldBrowser: false,
};

let state: AppState = initial;
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
}

export function setSession(patch: Partial<Session> | ((s: Session) => Partial<Session>)): void {
  set((s) => (s.session ? { session: { ...s.session, ...(typeof patch === 'function' ? patch(s.session) : patch) } } : {}));
}

export function useApp(): AppState {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force as () => void);
    return () => void listeners.delete(force as () => void);
  }, []);
  return state;
}

const today = () => new Date().toISOString().slice(0, 10);

/** 瀏覽器太舊的判斷：缺少我們用到的基本功能就提示（仍可繼續使用）。 */
export function isOldBrowser(): boolean {
  return !(typeof structuredClone === 'function' && typeof Array.prototype.at === 'function' && typeof Object.hasOwn === 'function');
}

/** 啟動：還原偏好與資料夾，並讀回資料夾裡的設定。 */
export async function boot(): Promise<void> {
  const prefs = loadPrefs();
  applyTheme(prefs.theme);
  const folder = await restoreFolder().catch((): FolderStatus => ({ state: 'none' }));
  set({ prefs, folder, oldBrowser: isOldBrowser(), ready: true });
  if (folder.state === 'ready') await loadFromFolder();
}

async function loadFromFolder(): Promise<void> {
  const f = getState().folder;
  if (f.state !== 'ready') return;
  try {
    const text = await f.store.read(SETTINGS_FILE);
    if (text !== null) set({ data: parseFolderData(text) });
  } catch {
    set({ error: 'settings' });
  }
}

export function updatePrefs(p: Partial<Prefs>): void {
  const prefs = { ...getState().prefs, ...p };
  savePrefs(prefs);
  applyTheme(prefs.theme);
  set({ prefs });
}

export function dismiss(key: string): void {
  const { dismissed } = getState().prefs;
  if (!dismissed.includes(key)) updatePrefs({ dismissed: [...dismissed, key] });
}

/** 存設定：有資料夾就直接寫；沒有就記下「還沒下載」。 */
export async function persist(data: FolderData): Promise<void> {
  set({ data });
  const f = getState().folder;
  if (f.state === 'ready') {
    try {
      await f.store.write(SETTINGS_FILE, serializeFolderData(data));
      set({ dirty: false });
    } catch {
      set({ dirty: true, toast: '寫入資料夾失敗，請改按「下載設定檔」保存。' });
    }
  } else {
    set({ dirty: true });
  }
}

export function downloadSettings(): void {
  downloadText(SETTINGS_FILE, serializeFolderData(getState().data));
  set({ dirty: false });
}

export async function choosePickFolder(): Promise<void> {
  set({ folderDialog: false });
  try {
    const store = await pickFolder();
    if (!store) return;
    set({ folder: { state: 'ready', store } });
    const text = await store.read(SETTINGS_FILE);
    if (text !== null) {
      // 資料夾裡已有設定：與目前記憶體中的合併，不覆蓋
      set((s) => ({ data: mergeFolderData(parseFolderData(text), s.data) }));
    }
    await persist(getState().data);
  } catch {
    set({ toast: '無法使用這個資料夾，請換一個資料夾試試。' });
  }
}

export async function reauthorize(): Promise<void> {
  const store = await reauthorizeFolder().catch(() => null);
  if (!store) return;
  set({ folder: { state: 'ready', store } });
  await loadFromFolder();
}

export async function forgetThisFolder(): Promise<void> {
  await forgetFolder();
  set({ folder: { state: 'none' }, data: emptyFolderData() });
}

/** 開啟設定檔（.sfh）：還原之前存的欄位對應與名單。 */
export async function importSettings(file: FileLike & { text(): Promise<string> }): Promise<void> {
  try {
    const incoming = parseFolderData(await file.text());
    await persist(mergeFolderData(getState().data, incoming));
    set({ toast: `已載入設定檔，共 ${incoming.surveys.length} 份問卷設定。` });
  } catch {
    set({ error: 'settings' });
  }
}

function newId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 開啟問卷檔。找得到相似的已存設定就先問老師「是不是之前的」。 */
export async function openSurveyFile(file: FileLike): Promise<void> {
  let table: Table;
  try {
    table = await tableFromFile(file);
  } catch (e) {
    set({ error: e instanceof LoadError ? e.reason : 'unreadable' });
    return;
  }
  const { data, pendingRecent } = getState();
  let hit = recognizeConfig(
    table.headers,
    data.surveys.map((s) => ({ id: s.id, name: s.name, headers: s.headers, mapping: s.mapping })),
  );
  if (!hit && pendingRecent) {
    const want = data.surveys.find((s) => s.id === pendingRecent);
    if (want) hit = recognizeConfig(table.headers, [{ id: want.id, name: want.name, headers: want.headers, mapping: want.mapping }], 0.5);
  }
  const saved = hit ? data.surveys.find((s) => s.id === hit.config.id) : undefined;
  const cols = analyzeColumns(table);
  const { kind, reason } = inferKind(cols);
  const session: Session = {
    fileName: file.name,
    sourceLabel: 'Excel 檔',
    name: surveyNameFromFile(file.name),
    table,
    cols,
    kind,
    kindReason: reason,
    kindConfirmed: false,
    scale: detectScale(table, cols),
    mappingConfirmed: false,
    recognition: saved && hit ? { survey: saved, similarity: hit.similarity } : null,
    surveyId: newId(),
    previousRows: null,
    rosterRows: null,
    rosterMixed: false,
    rosterSkipped: false,
    rosterName: '',
    resolutions: {},
    excluded: [],
    titleMerges: {},
    checkHandled: [],
  };
  set({ session, route: 'prepare', sub: null, error: null, pendingRecent: null });
}

/** 「是之前的問卷」：帶入已存的對應，跳過欄位對應精靈。 */
export function acceptRecognition(): void {
  const s = getState().session;
  if (!s?.recognition) return;
  const saved = s.recognition.survey;
  const cols = applySavedMapping(s.table, saved.mapping, saved.labels);
  const roster = saved.rosterId ? getState().data.rosters.find((r) => r.id === saved.rosterId) : undefined;
  setSession({
    recognition: null,
    surveyId: saved.id,
    name: saved.name,
    kind: saved.kind,
    kindConfirmed: true,
    kindReason: '沿用之前存的設定。',
    cols,
    scale: saved.scale,
    mappingConfirmed: true,
    previousRows: saved.rowCount,
    rosterRows: roster ? roster.students.map((st) => ({ class: st.class, seat: String(st.seat), name: st.name })) : null,
    rosterMixed: roster ? isMixedClasses(roster.students) : false,
    rosterName: roster?.name ?? '',
  });
  void saveSurvey();
}

export function rejectRecognition(): void {
  setSession({ recognition: null });
}

/** 把目前的對應存進設定（資料夾或待下載）。不含任何作答資料。 */
export async function saveSurvey(): Promise<void> {
  const { session: s, data } = getState();
  if (!s) return;
  const survey: SavedSurvey = {
    id: s.surveyId,
    name: s.name,
    kind: s.kind,
    sourceLabel: s.sourceLabel,
    headers: s.table.headers,
    mapping: toSavedMapping(s.cols),
    labels: toSavedLabels(s.cols),
    scale: s.scale,
    lastUsed: today(),
    rowCount: s.table.rows.length,
    rosterId: s.rosterRows ? `r-${s.surveyId}` : null,
  };
  let next = upsertSurvey(data, survey);
  if (s.rosterRows) {
    const { students } = rosterFromRows(s.rosterRows);
    next = upsertRoster(next, { id: `r-${s.surveyId}`, name: s.rosterName || `${s.name} 名單`, students });
  }
  await persist(next);
}

export function requestRestart(): void {
  if (getState().session) set({ confirmRestart: true });
  else go('home');
}

export function restart(): void {
  set({ confirmRestart: false, session: null, route: 'home', sub: null, error: null, pendingRecent: null });
}

export function go(route: Route, sub: Sub | null = null): void {
  set({ route, sub });
  window.scrollTo?.(0, 0);
}
