// 選課分組志願：把問卷資料表接到 src/core/course.ts 的分配核心（純函式，不碰瀏覽器 API）。
import {
  type AllocationSummary,
  type Applicant,
  type Assignment,
  type Course,
  allocate,
  cellText,
  matchCourseNames,
  moveApplicant,
  readPrefs,
  summarize,
} from '../core';
import { prefColumns } from './columns';
import { newSeed } from './analysis';
import { rosterComparison } from './progress';
import type { Session } from './store';
import { extra } from '../ui/strings-extra';

/** 名額頁與結果的狀態；只屬於目前這份問卷，存在使用者選的資料夾（不進 repo）。 */
export interface CourseState {
  /** 課程名 → 名額輸入文字（沒填是空字串） */
  capacity: Record<string, string>;
  minSize: Record<string, string>;
  /** 表單選項原文 → 合併到的課程名 */
  merges: Record<string, string>;
  /** 老師按了「不合併」的選項 */
  declined: string[];
  /** 優先名單（學生編號＝資料列索引） */
  priority: string[];
  seed: string;
  /** 還沒按「開始分配」前是 null */
  result: Assignment[] | null;
  ranAt: string | null;
  /** 按了「固定結果」：不能再重新抽籤 */
  fixed: boolean;
  /** 老師按了「納入」的名單外填答者（資料列索引）；沒按的不進分配 */
  included: string[];
}

export function emptyCourseState(): CourseState {
  return { capacity: {}, minSize: {}, merges: {}, declined: [], priority: [], seed: newSeed(), result: null, ranAt: null, fixed: false, included: [] };
}

export const courseFileName = (surveyId: string): string => `選課分組-${surveyId}.json`;

export function serializeCourse(c: CourseState): string {
  return JSON.stringify({ version: 1, ...c });
}

export function parseCourse(text: string): CourseState {
  const base = emptyCourseState();
  const o = JSON.parse(text) as Partial<CourseState>;
  const rec = (v: unknown): Record<string, string> =>
    v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === 'string')) as Record<string, string> : {};
  const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const result = Array.isArray(o.result)
    ? o.result.filter((a): a is Assignment => !!a && typeof a === 'object' && typeof (a as Assignment).id === 'string')
    : null;
  return {
    capacity: rec(o.capacity),
    minSize: rec(o.minSize),
    merges: rec(o.merges),
    declined: strs(o.declined),
    priority: strs(o.priority),
    seed: typeof o.seed === 'string' && o.seed !== '' ? o.seed : base.seed,
    result,
    ranAt: typeof o.ranAt === 'string' ? o.ranAt : null,
    fixed: o.fixed === true,
    included: strs(o.included),
  };
}

export interface Person {
  id: string;
  seat: string;
  name: string;
}

/** 顯示用：「03 王小明」。 */
export function personLabel(p: Person | undefined): string {
  if (!p) return '';
  const seat = /^\d+$/.test(p.seat) ? p.seat.padStart(2, '0') : p.seat;
  return `${seat} ${p.name}`.trim();
}

function colOf(s: Session, role: 'respondentSeat' | 'respondentName'): number | null {
  return s.cols.find((c) => c.role === role)?.index ?? null;
}

/** 志願欄裡出現過的課程選項（原文）與第 1 志願人數，依人數多到少。 */
export function rawOptions(s: Session): { option: string; count: number }[] {
  const cols = prefColumns(s.cols);
  const counts = new Map<string, number>();
  const gone = new Set(s.excluded);
  s.table.rows.forEach((r, i) => {
    if (gone.has(i)) return;
    for (const v of readPrefs(r, cols.map((c) => c.index))) counts.set(v, (counts.get(v) ?? 0) + 1);
  });
  return [...counts].map(([option, count]) => ({ option, count })).sort((a, b) => b.count - a.count || (a.option < b.option ? -1 : 1));
}

/** 套用合併後的課程名。 */
export function mergedName(c: CourseState, option: string): string {
  return c.merges[option] ?? option;
}

/** 課程名對不上的選項：與人數較多的課程名相似，建議合併。已合併或按過「不合併」的不再出現。 */
export function mergeSuggestions(s: Session, c: CourseState): { option: string; into: string }[] {
  const opts = rawOptions(s);
  const out: { option: string; into: string }[] = [];
  const earlier: Course[] = [];
  for (const { option } of opts) {
    if (c.merges[option] === undefined && !c.declined.includes(option) && earlier.length > 0) {
      const m = matchCourseNames([option], earlier)[0];
      if (m?.course) out.push({ option, into: m.course });
    }
    if (c.merges[option] === undefined && !out.some((x) => x.option === option)) earlier.push({ name: option, capacity: 0 });
  }
  return out;
}

/** 目前的課程：合併後的課程名，依第 1 志願人數排序。 */
export function courseNames(s: Session, c: CourseState): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const { option } of rawOptions(s)) {
    const n = mergedName(c, option);
    if (!seen.has(n)) {
      seen.add(n);
      names.push(n);
    }
  }
  return names;
}

export function parseCount(text: string | undefined): number | null {
  const t = (text ?? '').trim();
  if (t === '' || !/^\d+$/.test(t)) return null;
  return Number(t);
}

export function courseList(s: Session, c: CourseState): Course[] {
  return courseNames(s, c).map((name) => {
    const min = parseCount(c.minSize[name]);
    return { name, capacity: parseCount(c.capacity[name]) ?? 0, ...(min !== null && min > 0 ? { minSize: min } : {}) };
  });
}

/** 不在名單上、而且老師還沒按「納入」的填答者（資料列索引）；沒有名單時是空集合。 */
export function outsideIds(s: Session, c: CourseState): Set<string> {
  const inc = new Set(c.included);
  return new Set((rosterComparison(s)?.unknown ?? []).map((u) => String(u.id)).filter((id) => !inc.has(id)));
}

/** 不在名單上、但老師已按「納入」的人數。 */
export function includedCount(s: Session, c: CourseState): number {
  const inc = new Set(c.included);
  return (rosterComparison(s)?.unknown ?? []).filter((u) => inc.has(String(u.id))).length;
}

export interface Applicants {
  list: Applicant[];
  people: Map<string, Person>;
}

/** 每位填答者（排除資料檢查排除的列）與其志願；志願套用合併。 */
export function courseApplicants(s: Session, c: CourseState): Applicants {
  const cols = prefColumns(s.cols).map((x) => x.index);
  const seatCol = colOf(s, 'respondentSeat');
  const nameCol = colOf(s, 'respondentName');
  const gone = new Set(s.excluded);
  const pri = new Set(c.priority);
  const outside = outsideIds(s, c);
  const list: Applicant[] = [];
  const people = new Map<string, Person>();
  s.table.rows.forEach((r, i) => {
    if (gone.has(i) || outside.has(String(i))) return;
    const id = String(i);
    const prefs = readPrefs(r, cols).map((v) => mergedName(c, v));
    list.push({ id, prefs, ...(pri.has(id) ? { priority: true } : {}) });
    people.set(id, { id, seat: seatCol === null ? '' : cellText(r[seatCol]), name: nameCol === null ? '' : cellText(r[nameCol]) });
  });
  const num = (p: Person) => (/^\d+$/.test(p.seat) ? Number(p.seat) : Number.POSITIVE_INFINITY);
  list.sort((a, b) => {
    const pa = people.get(a.id) as Person;
    const pb = people.get(b.id) as Person;
    return num(pa) - num(pb) || pa.name.localeCompare(pb.name, 'zh-Hant') || Number(a.id) - Number(b.id);
  });
  return { list, people };
}

export interface CourseIssues {
  /** 沒有任何志願欄 */
  noPrefCols: boolean;
  /** 還有課程名額沒填 */
  missing: string[];
  /** 名額全為 0 或沒填 */
  allZero: boolean;
  /** 總名額少於填答人數時差幾人 */
  shortfall: number;
  /** 最少開班大於名額的課程 */
  minOverCap: string[];
  total: number;
  totalCap: number;
}

export function courseIssues(s: Session, c: CourseState): CourseIssues {
  const names = courseNames(s, c);
  const missing = names.filter((n) => parseCount(c.capacity[n]) === null);
  const caps = names.map((n) => parseCount(c.capacity[n]) ?? 0);
  const totalCap = caps.reduce((a, b) => a + b, 0);
  const total = courseApplicants(s, c).list.length;
  return {
    noPrefCols: prefColumns(s.cols).length === 0,
    missing,
    allZero: totalCap === 0,
    shortfall: Math.max(0, total - totalCap),
    minOverCap: names.filter((n) => {
      const m = parseCount(c.minSize[n]);
      return m !== null && m > (parseCount(c.capacity[n]) ?? 0);
    }),
    total,
    totalCap,
  };
}

/** 能不能按「開始分配」，不能的話一句原因。 */
export function cannotRun(i: CourseIssues): string | null {
  if (i.noPrefCols) return extra().course.noPref;
  if (i.missing.length > 0) return extra().course.missing(i.missing.length);
  if (i.allZero) return extra().course.allZero;
  if (i.minOverCap.length > 0) return extra().course.minOver;
  return null;
}

export function runAllocation(s: Session, c: CourseState): CourseState {
  const { list } = courseApplicants(s, c);
  const r = allocate(list, courseList(s, c), c.seed);
  return { ...c, result: r.assignments, ranAt: new Date().toISOString() };
}

export function moveTo(s: Session, c: CourseState, id: string, course: string | null): CourseState {
  if (!c.result) return c;
  const { list } = courseApplicants(s, c);
  return { ...c, result: moveApplicant(c.result, list, id, course, courseList(s, c)) };
}

export function courseSummary(s: Session, c: CourseState): AllocationSummary | null {
  if (!c.result) return null;
  return summarize(c.result, courseApplicants(s, c).list, courseList(s, c));
}

/** 結果是否還對得上目前的資料（新增了回覆或改了合併後要重新分配）。 */
export function resultStale(s: Session, c: CourseState): boolean {
  if (!c.result) return false;
  const ids = new Set(courseApplicants(s, c).list.map((a) => a.id));
  return c.result.length !== ids.size || c.result.some((a) => !ids.has(a.id));
}

/** 一門課的學生（座號小到大）；null＝待安排。 */
export function studentsOf(c: CourseState, course: string | null): Assignment[] {
  return (c.result ?? []).filter((a) => a.course === course);
}

/** 台北時間的「2026/11/01 14:20」；沒有時間回傳空字串。 */
export const stampTaipei = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const t = new Date(d.getTime() + 8 * 3600 * 1000); // 台北時間
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}/${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
};

