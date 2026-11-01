import { type CheckReport, type RosterComparison, type Student, compareRoster, runChecks } from '../core';
import { buildCheckRecords, countToConfirm, mappingProblems, personRefs } from './columns';
import { rosterFromRows } from './roster-input';
import type { Session } from './store';

export type ItemState = 'done' | 'todo' | 'attention' | 'locked' | 'optional';

export interface PrepItem {
  key: 'type' | 'mapping' | 'roster' | 'check';
  state: ItemState;
  /** 鎖住時寫出缺什麼；其他狀態是一句狀態說明。 */
  note: string;
}

export function rosterStudents(s: Session): Student[] {
  return s.rosterRows ? rosterFromRows(s.rosterRows).students : [];
}

export function rosterComparison(s: Session): RosterComparison | null {
  const students = rosterStudents(s);
  if (students.length === 0) return null;
  const refs = personRefs(s.table, s.cols, 'respondent');
  const entries = refs.map((person, id) => ({ id, person })).filter((e) => !s.excluded.includes(e.id));
  const first = compareRoster(students, entries);
  // 老師按「是同一人」的列，改用名單上那位的資料再比一次
  const accepted = new Map<number | string, Student>();
  for (const r of first.results) {
    const target = r.match.student ?? r.match.suggestion;
    if (s.resolutions[r.id as number] === 'accept' && target) accepted.set(r.id, target);
  }
  if (accepted.size === 0) return first;
  return compareRoster(
    students,
    entries.map((e) => {
      const st = accepted.get(e.id);
      return st ? { id: e.id, person: { class: st.class, seat: st.seat, name: st.name } } : e;
    }),
  );
}

export function checkReport(s: Session): CheckReport {
  const records = buildCheckRecords(s.table, s.cols)
    .filter((r) => !s.excluded.includes(r.id))
    .map((r) => {
      const title = typeof r.bookTitle === 'string' ? r.bookTitle.trim() : '';
      const merged = s.titleMerges[title];
      return merged === undefined ? r : { ...r, bookTitle: merged };
    });
  return runChecks(records, { withTarget: s.kind === 'feedback', scale: s.scale });
}

export type CheckKey = 'duplicates' | 'timestamps' | 'scores' | 'blanks' | 'titles';

export function checkCounts(r: CheckReport): Record<CheckKey, number> {
  return {
    duplicates: r.duplicates.length,
    timestamps: r.badTimestamps.length,
    scores: r.invalidScores.length,
    blanks: r.blanks.length,
    titles: r.titleClusters.length,
  };
}

/** 有問題而且老師還沒處理或忽略的類別。 */
export function pendingChecks(s: Session): CheckKey[] {
  const counts = checkCounts(checkReport(s));
  return (Object.keys(counts) as CheckKey[]).filter((k) => counts[k] > 0 && !s.checkHandled.includes(k));
}

/** 名單對照要老師看的筆數（座號對不上、不在名單、同名分不出）。 */
export function rosterToConfirm(s: Session): number {
  const c = rosterComparison(s);
  return c ? c.unknown.length + c.seatMismatches.length + c.ambiguous.length : 0;
}

export function mappingReady(s: Session): boolean {
  return s.mappingConfirmed && mappingProblems(s.kind, s.cols).length === 0;
}

export function prepItems(s: Session): PrepItem[] {
  const mappingOk = mappingReady(s);
  const front = s.kindConfirmed && mappingOk;
  const locked = '先完成欄位對應。';
  const toConfirm = countToConfirm(s.cols);
  const problems = mappingProblems(s.kind, s.cols);
  const students = rosterStudents(s);
  const rosterDone = students.length > 0 || s.rosterSkipped;
  const pending = pendingChecks(s).length;
  return [
    {
      key: 'type',
      state: s.kindConfirmed ? 'done' : 'todo',
      note: s.kindConfirmed ? '已確認' : '系統已智慧判斷，請你確認',
    },
    {
      key: 'mapping',
      state: mappingOk ? 'done' : !s.kindConfirmed ? 'locked' : 'attention',
      note: !s.kindConfirmed
        ? '先確認問卷類型。'
        : problems.length > 0
          ? problems[0]!
          : mappingOk
            ? `${s.cols.length} 欄已對應`
            : `${s.cols.length} 欄中 ${toConfirm} 欄請確認`,
    },
    {
      key: 'roster',
      state: !front ? 'locked' : rosterDone ? 'done' : 'optional',
      note: !front
        ? `${locked}可跳過：不比對名單也能統計`
        : students.length > 0
          ? `${students.length} 人${rosterToConfirm(s) > 0 ? `，${rosterToConfirm(s)} 筆要確認` : ''}`
          : s.rosterSkipped
            ? '已跳過'
            : '選用：貼上或開啟名單，就能知道誰沒填',
    },
    {
      key: 'check',
      state: !front ? 'locked' : pending === 0 ? 'done' : 'attention',
      note: !front ? `${locked}重複、空白、同一人書名多種寫法` : pending === 0 ? '沒有待處理的項目' : `${pending} 類待處理`,
    },
  ];
}

export function doneCount(items: PrepItem[]): number {
  return items.filter((i) => i.state === 'done').length;
}

/** 欄位對應完成就能看統計；名單與檢查之後再做也可以。 */
export function canGoStats(s: Session): boolean {
  return s.kindConfirmed && mappingReady(s);
}
