/**
 * 選課分組志願：逐志願輪＋可重現抽籤的分配（純函式，不碰瀏覽器 API）。
 * 規則見 docs/decisions/2026-11-01-選課分組志願裁示.md。
 */
import { seededShuffle } from './random';
import { normalizeTitle, diceSimilarity, type Cell } from './text';

export interface Course {
  name: string;
  /** 名額上限（整數，小於 0 視為 0） */
  capacity: number;
  /** 最少開班人數（選填；低於門檻只標示「建議停開」，不自動重分） */
  minSize?: number;
}

export interface Applicant {
  id: string;
  /** 依第 1、第 2… 志願排序的課程名（可不滿 N 個；可含重複與不存在的課程） */
  prefs: readonly string[];
  /** 優先名單：同一輪同一課程超額時，優先者先取得名額 */
  priority?: boolean;
}

export type UnassignedReason = 'noPrefs' | 'allFull';

export interface Assignment {
  id: string;
  course: string | null;
  /** 分到第幾志願（1 起算）；手動放入非志願課程或待安排為 null */
  rank: number | null;
  reason?: UnassignedReason;
  /** 老師手動調整過 */
  manual?: boolean;
}

export interface AllocationResult {
  assignments: Assignment[];
  seed: string;
  /** 實際跑的輪數（等於所有人最長的有效志願數） */
  rounds: number;
}

/** 志願清單清理：依序保留存在的課程，同一課程只留最前面一次。 */
export function cleanPrefs(prefs: readonly string[], courses: readonly Course[]): string[] {
  const known = new Set(courses.map((c) => c.name));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of prefs) {
    if (!known.has(p) || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/**
 * 逐志願輪分配：第 k 輪處理「尚未分到」的人的第 k 志願；該課程剩餘名額夠就全收，
 * 不夠則優先名單先取、其餘在同組內以種子可重現抽籤。沒分到的進下一輪。
 * 同一份資料加同一個種子，結果一定相同（與輸入順序無關）。
 */
export function allocate(applicants: readonly Applicant[], courses: readonly Course[], seed: string): AllocationResult {
  const left = new Map(courses.map((c) => [c.name, Math.max(0, Math.floor(c.capacity))]));
  const prefs = new Map(applicants.map((a) => [a.id, cleanPrefs(a.prefs, courses)]));
  const result = new Map<string, Assignment>();
  let pending = [...applicants].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rounds = Math.max(0, ...[...prefs.values()].map((p) => p.length));

  for (let r = 0; r < rounds; r++) {
    const byCourse = new Map<string, Applicant[]>();
    for (const a of pending) {
      const c = prefs.get(a.id)?.[r];
      if (c === undefined) continue;
      const list = byCourse.get(c) ?? [];
      list.push(a);
      byCourse.set(c, list);
    }
    for (const [name, list] of byCourse) {
      const room = left.get(name) ?? 0;
      let winners: Applicant[];
      if (list.length <= room) {
        winners = list;
      } else {
        const pri = seededShuffle(list.filter((a) => a.priority), `${seed}|${r}|${name}|p`);
        const rest = seededShuffle(list.filter((a) => !a.priority), `${seed}|${r}|${name}`);
        winners = [...pri, ...rest].slice(0, room);
      }
      const won = new Set(winners.map((a) => a.id));
      left.set(name, room - winners.length);
      for (const a of list) {
        if (won.has(a.id)) result.set(a.id, { id: a.id, course: name, rank: r + 1 });
      }
    }
    pending = pending.filter((a) => !result.has(a.id));
  }

  const assignments = applicants.map((a): Assignment => {
    const got = result.get(a.id);
    if (got) return got;
    return { id: a.id, course: null, rank: null, reason: (prefs.get(a.id)?.length ?? 0) === 0 ? 'noPrefs' : 'allFull' };
  });
  return { assignments, seed, rounds };
}

/** 手動調整：把某人放到指定課程（null＝移到待安排）。超額允許，由 {@link summarize} 標示。 */
export function moveApplicant(
  assignments: readonly Assignment[],
  applicants: readonly Applicant[],
  id: string,
  course: string | null,
  courses: readonly Course[],
): Assignment[] {
  const a = applicants.find((x) => x.id === id);
  const list = a ? cleanPrefs(a.prefs, courses) : [];
  return assignments.map((s) => {
    if (s.id !== id) return s;
    if (course === null) return { id, course: null, rank: null, reason: list.length === 0 ? 'noPrefs' : 'allFull', manual: true };
    const idx = list.indexOf(course);
    return { id, course, rank: idx < 0 ? null : idx + 1, manual: true };
  });
}

export interface CourseSummary {
  name: string;
  capacity: number;
  /** 實際分到人數 */
  filled: number;
  /** 以第 1 志願報名人數 */
  firstChoice: number;
  /** 志願序中任一位報名人數 */
  anyChoice: number;
  full: boolean;
  /** 超額人數（手動調整才會發生） */
  over: number;
  /** 有設最少人數且 filled 低於它：建議停開 */
  suggestClose: boolean;
}

export interface AllocationSummary {
  total: number;
  assigned: number;
  unassigned: number;
  /** 各志願達成人數，索引 0＝第 1 志願 */
  rankCounts: number[];
  /** 第 1 志願達成率（0～1；沒有人時為 0） */
  firstRate: number;
  courses: CourseSummary[];
  /** 名額合計小於填答人數時，至少會進待安排的人數 */
  shortfall: number;
}

export function summarize(
  assignments: readonly Assignment[],
  applicants: readonly Applicant[],
  courses: readonly Course[],
): AllocationSummary {
  const total = applicants.length;
  const assigned = assignments.filter((a) => a.course !== null).length;
  const maxRank = Math.max(0, ...assignments.map((a) => a.rank ?? 0));
  const rankCounts = Array.from({ length: maxRank }, (_, i) => assignments.filter((a) => a.rank === i + 1).length);
  const cs = courses.map((c): CourseSummary => {
    const filled = assignments.filter((a) => a.course === c.name).length;
    const cap = Math.max(0, Math.floor(c.capacity));
    let first = 0;
    let any = 0;
    for (const a of applicants) {
      const p = cleanPrefs(a.prefs, courses);
      if (p[0] === c.name) first++;
      if (p.includes(c.name)) any++;
    }
    return {
      name: c.name,
      capacity: cap,
      filled,
      firstChoice: first,
      anyChoice: any,
      full: filled >= cap,
      over: Math.max(0, filled - cap),
      suggestClose: c.minSize !== undefined && c.minSize > 0 && filled < c.minSize,
    };
  });
  const totalCap = courses.reduce((s, c) => s + Math.max(0, Math.floor(c.capacity)), 0);
  return {
    total,
    assigned,
    unassigned: total - assigned,
    rankCounts,
    firstRate: total === 0 ? 0 : (rankCounts[0] ?? 0) / total,
    courses: cs,
    shortfall: Math.max(0, total - totalCap),
  };
}

export interface CourseNameMatch {
  /** 表單選項原文 */
  option: string;
  /** 對到的課程；null＝對不上，需老師確認 */
  course: string | null;
  /** 並非完全相同（正規化後相同或相似）時為 true，請老師確認 */
  fuzzy: boolean;
}

/** 表單選項與老師填的課程名比對：先正規化後完全相同，其次 bigram 相似度 ≥ 0.6 且唯一最高。 */
export function matchCourseNames(options: readonly string[], courses: readonly Course[], threshold = 0.6): CourseNameMatch[] {
  return options.map((option) => {
    if (courses.some((c) => c.name === option)) return { option, course: option, fuzzy: false };
    const key = normalizeTitle(option);
    const same = courses.filter((c) => normalizeTitle(c.name) === key);
    if (same.length === 1) return { option, course: (same[0] as Course).name, fuzzy: true };
    const scored = courses
      .map((c) => ({ name: c.name, s: diceSimilarity(key, normalizeTitle(c.name)) }))
      .sort((a, b) => b.s - a.s);
    const [best, second] = scored;
    if (best && best.s >= threshold && (!second || second.s < best.s)) return { option, course: best.name, fuzzy: true };
    return { option, course: null, fuzzy: false };
  });
}

/** 從表單資料列取出志願：columns 依第 1、第 2… 志願順序排列的欄位索引；空白略過。 */
export function readPrefs(row: readonly Cell[], columns: readonly number[]): string[] {
  const out: string[] = [];
  for (const i of columns) {
    const v = row[i];
    const t = v === null || v === undefined ? '' : String(v).trim();
    if (t !== '') out.push(t);
  }
  return out;
}

/** 欄名猜志願順序：「第一志願」「第2志願」「[第三志願]」等；猜不到回傳 null。 */
export function guessRank(header: string): number | null {
  const s = header.normalize('NFKC');
  const m = /第\s*([0-9]+|[一二三四五六七八九十]+)\s*志願/.exec(s);
  if (!m) return null;
  const g = m[1] as string;
  if (/^[0-9]+$/.test(g)) return Number(g) >= 1 ? Number(g) : null;
  const digits = '一二三四五六七八九';
  if (g === '十') return 10;
  if (g.startsWith('十')) return 10 + digits.indexOf(g.slice(1)) + 1;
  if (g.length === 1) return digits.indexOf(g) + 1;
  if (g.length === 2 && g[1] === '十') return (digits.indexOf(g[0] as string) + 1) * 10;
  return null;
}
