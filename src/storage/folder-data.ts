import type { Student } from '../core';
import type { FolderData, PhraseCategory, SavedRoster, SavedSurvey, SurveyKind } from './types';

/** 資料夾裡存設定與名單的檔名；副檔名 .sfh 為「設定檔」，內容是 JSON。 */
export const SETTINGS_FILE = '問卷小幫手設定.sfh';

export function emptyFolderData(): FolderData {
  return { version: 1, surveys: [], rosters: [] };
}

const KINDS: SurveyKind[] = ['vote', 'opinion', 'feedback'];

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function parseSurvey(v: unknown): SavedSurvey | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || !Array.isArray(o.headers)) return null;
  const mapping: Record<string, string[]> = {};
  if (typeof o.mapping === 'object' && o.mapping !== null) {
    for (const [role, titles] of Object.entries(o.mapping)) {
      if (Array.isArray(titles)) mapping[role] = titles.filter((t): t is string => typeof t === 'string');
    }
  }
  const labels: Record<string, string> = {};
  if (typeof o.labels === 'object' && o.labels !== null) {
    for (const [k, l] of Object.entries(o.labels)) if (typeof l === 'string') labels[k] = l;
  }
  const scale = o.scale as { min?: unknown; max?: unknown } | undefined;
  return {
    id: o.id,
    name: str(o.name, '未命名問卷'),
    kind: KINDS.includes(o.kind as SurveyKind) ? (o.kind as SurveyKind) : 'opinion',
    sourceLabel: str(o.sourceLabel, 'Excel 檔'),
    headers: o.headers.filter((h): h is string => typeof h === 'string'),
    mapping,
    labels,
    scale: { min: typeof scale?.min === 'number' ? scale.min : 1, max: typeof scale?.max === 'number' ? scale.max : 5 },
    lastUsed: str(o.lastUsed),
    rowCount: typeof o.rowCount === 'number' ? o.rowCount : 0,
    rosterId: typeof o.rosterId === 'string' ? o.rosterId : null,
  };
}

function parseRoster(v: unknown): SavedRoster | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string' || !Array.isArray(o.students)) return null;
  const students: Student[] = [];
  for (const s of o.students) {
    if (typeof s !== 'object' || s === null) continue;
    const r = s as Record<string, unknown>;
    if (typeof r.name === 'string' && typeof r.seat === 'number') {
      students.push({ class: str(r.class), seat: r.seat, name: r.name });
    }
  }
  return { id: o.id, name: str(o.name, '名單'), students };
}

/** 讀設定檔文字；格式不對時丟出錯誤（呼叫端顯示「這不是設定檔」）。 */
export function parseFolderData(text: string): FolderData {
  const raw: unknown = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  if (typeof raw !== 'object' || raw === null || (raw as { version?: unknown }).version !== 1) {
    throw new Error('not a settings file');
  }
  const o = raw as { surveys?: unknown; rosters?: unknown };
  const surveys = (Array.isArray(o.surveys) ? o.surveys : []).map(parseSurvey).filter((x): x is SavedSurvey => x !== null);
  const rosters = (Array.isArray(o.rosters) ? o.rosters : []).map(parseRoster).filter((x): x is SavedRoster => x !== null);
  const phrases = parsePhrases((raw as { phrases?: unknown }).phrases);
  return phrases ? { version: 1, surveys, rosters, phrases } : { version: 1, surveys, rosters };
}

function parsePhrases(v: unknown): PhraseCategory[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: PhraseCategory[] = [];
  for (const c of v) {
    if (typeof c !== 'object' || c === null) continue;
    const o = c as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.name !== 'string' || !Array.isArray(o.phrases)) continue;
    const phrases = o.phrases
      .filter((p): p is { title: string; text: string } => typeof p === 'object' && p !== null && typeof (p as { text?: unknown }).text === 'string')
      .map((p) => ({ title: typeof p.title === 'string' ? p.title : p.text.slice(0, 6), text: p.text }));
    out.push({ id: o.id, name: o.name, phrases });
  }
  return out;
}

export function serializeFolderData(data: FolderData): string {
  return JSON.stringify(data, null, 2);
}

/** 合併兩份設定：問卷同 id 以 lastUsed 較新者為準，名單同 id 以 incoming 為準。 */
export function mergeFolderData(base: FolderData, incoming: FolderData): FolderData {
  const surveys = new Map(base.surveys.map((s) => [s.id, s]));
  for (const s of incoming.surveys) {
    const cur = surveys.get(s.id);
    if (!cur || cur.lastUsed <= s.lastUsed) surveys.set(s.id, s);
  }
  const rosters = new Map(base.rosters.map((r) => [r.id, r]));
  for (const r of incoming.rosters) rosters.set(r.id, r);
  const phrases = base.phrases ?? incoming.phrases;
  return { version: 1, surveys: [...surveys.values()], rosters: [...rosters.values()], ...(phrases ? { phrases } : {}) };
}

/** 新增或更新一份問卷設定。 */
export function upsertSurvey(data: FolderData, survey: SavedSurvey): FolderData {
  return { ...data, surveys: [survey, ...data.surveys.filter((s) => s.id !== survey.id)] };
}

export function upsertRoster(data: FolderData, roster: SavedRoster): FolderData {
  return { ...data, rosters: [roster, ...data.rosters.filter((r) => r.id !== roster.id)] };
}

/** 最近的問卷：依上次使用日期新到舊。 */
export function recentSurveys(data: FolderData): SavedSurvey[] {
  return [...data.surveys].sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
}
