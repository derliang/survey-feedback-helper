import { type Cell, levenshtein, normalizeClass, normalizeName, normalizeSeat } from './text';

/** 名單上的一位學生。明細一律輸出「班級、座號、姓名」三欄（R-013）。 */
export interface Student {
  class: string;
  seat: number;
  name: string;
}

/** 問卷裡填的一個人：三欄都可能缺或寫錯。 */
export interface PersonRef {
  class?: Cell;
  seat?: Cell;
  name?: Cell;
}

export interface RosterProblem {
  kind: 'duplicateSeat' | 'duplicateName' | 'badSeat' | 'blankName';
  /** 對應輸入列（從 0 起算）。 */
  rows: number[];
}

/** 由原始名單列建立名單，並回報名單本身的問題（同班座號重複、同班同名、座號無效、姓名空白）。 */
export function buildRoster(input: readonly PersonRef[]): { students: Student[]; problems: RosterProblem[] } {
  const students: Student[] = [];
  const problems: RosterProblem[] = [];
  const seatSeen = new Map<string, number[]>();
  const nameSeen = new Map<string, number[]>();
  input.forEach((p, i) => {
    const name = normalizeName(p.name);
    const seat = normalizeSeat(p.seat);
    const cls = normalizeClass(p.class);
    if (name === '') {
      problems.push({ kind: 'blankName', rows: [i] });
      return;
    }
    if (seat === null) {
      problems.push({ kind: 'badSeat', rows: [i] });
      return;
    }
    students.push({ class: cls, seat, name });
    const sk = `${cls}|${seat}`;
    const nk = `${cls}|${name}`;
    seatSeen.set(sk, [...(seatSeen.get(sk) ?? []), i]);
    nameSeen.set(nk, [...(nameSeen.get(nk) ?? []), i]);
  });
  for (const rows of seatSeen.values()) if (rows.length > 1) problems.push({ kind: 'duplicateSeat', rows });
  for (const rows of nameSeen.values()) if (rows.length > 1) problems.push({ kind: 'duplicateName', rows });
  return { students, problems };
}

export type MatchStatus =
  /** 姓名（與座號，若有填）都對得上。 */
  | 'ok'
  /** 姓名在名單上，但填的座號與名單不同。 */
  | 'seatMismatch'
  /** 姓名不在名單上（冒名或打錯字）；suggestion 為最接近的人。 */
  | 'unknownName'
  /** 姓名對到多位（混班同名），無法判斷。 */
  | 'ambiguous'
  /** 沒填姓名但座號對得到唯一一人。 */
  | 'seatOnly'
  /** 姓名與座號都沒填。 */
  | 'blank';

export interface PersonMatch {
  status: MatchStatus;
  student: Student | null;
  suggestion: Student | null;
}

function nearest(candidates: readonly Student[], name: string): Student | null {
  let best: Student | null = null;
  let bestD = Infinity;
  for (const s of candidates) {
    const d = levenshtein(s.name, name);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best !== null && bestD <= 1 ? best : null;
}

/** 把問卷裡的一個人對到名單。有填班級時只在該班比對；姓名優先於座號。 */
export function matchPerson(roster: readonly Student[], ref: PersonRef): PersonMatch {
  const name = normalizeName(ref.name);
  const seat = normalizeSeat(ref.seat);
  const cls = normalizeClass(ref.class);
  const pool = cls === '' ? roster : roster.filter((s) => s.class === cls);

  if (name === '' && seat === null) return { status: 'blank', student: null, suggestion: null };

  if (name === '') {
    const holders = pool.filter((s) => s.seat === seat);
    if (holders.length === 1) return { status: 'seatOnly', student: holders[0] as Student, suggestion: null };
    return { status: holders.length > 1 ? 'ambiguous' : 'unknownName', student: null, suggestion: null };
  }

  const byName = pool.filter((s) => s.name === name);
  if (byName.length === 1) {
    const s = byName[0] as Student;
    return { status: seat !== null && seat !== s.seat ? 'seatMismatch' : 'ok', student: s, suggestion: null };
  }
  if (byName.length > 1) {
    const withSeat = seat === null ? [] : byName.filter((s) => s.seat === seat);
    if (withSeat.length === 1) return { status: 'ok', student: withSeat[0] as Student, suggestion: null };
    return { status: 'ambiguous', student: null, suggestion: null };
  }
  const holder = seat === null ? [] : pool.filter((s) => s.seat === seat);
  const suggestion = nearest(pool, name) ?? (holder.length === 1 ? (holder[0] as Student) : null);
  return { status: 'unknownName', student: null, suggestion };
}

export interface RosterEntry {
  /** 回覆的識別（通常是資料列索引）。 */
  id: number | string;
  person: PersonRef;
}

export interface RosterComparison {
  results: { id: number | string; match: PersonMatch }[];
  /** 名單上有、問卷沒有（誰沒填）。 */
  missing: Student[];
  /** 同一位學生出現在多份回覆。 */
  duplicates: { student: Student; ids: (number | string)[] }[];
  /** 姓名不在名單（冒名或打錯字）。 */
  unknown: { id: number | string; match: PersonMatch }[];
  /** 姓名對得上、座號對不上。 */
  seatMismatches: { id: number | string; match: PersonMatch }[];
  ambiguous: (number | string)[];
  blank: (number | string)[];
}

/** 名單對照：誰沒填、重複、冒名、座號姓名對不上。 */
export function compareRoster(roster: readonly Student[], entries: readonly RosterEntry[]): RosterComparison {
  const results = entries.map((e) => ({ id: e.id, match: matchPerson(roster, e.person) }));
  const seen = new Map<Student, (number | string)[]>();
  for (const r of results) {
    const { status, student } = r.match;
    if (student !== null && (status === 'ok' || status === 'seatMismatch' || status === 'seatOnly')) {
      seen.set(student, [...(seen.get(student) ?? []), r.id]);
    }
  }
  return {
    results,
    missing: roster.filter((s) => !seen.has(s)),
    duplicates: [...seen].filter(([, ids]) => ids.length > 1).map(([student, ids]) => ({ student, ids })),
    unknown: results.filter((r) => r.match.status === 'unknownName'),
    seatMismatches: results.filter((r) => r.match.status === 'seatMismatch'),
    ambiguous: results.filter((r) => r.match.status === 'ambiguous').map((r) => r.id),
    blank: results.filter((r) => r.match.status === 'blank').map((r) => r.id),
  };
}
