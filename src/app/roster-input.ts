import { type Cell, type PersonRef, type Student, buildRoster, normalizeHeader, tableFromRows } from '../core';

/** 名單編輯中的一列（文字，讓老師可以直接改）。 */
export interface RosterRow {
  class: string;
  seat: string;
  name: string;
}

/**
 * 貼上的名單：一列一位，「座號 姓名」；混班為「班級 座號 姓名」；
 * 沒有座號只有姓名時，依序補 1、2、3…。分隔可為空白、Tab、逗號。
 */
export function parsePastedRoster(text: string, mixed: boolean, defaultClass = ''): RosterRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');
  const rows: RosterRow[] = [];
  let auto = 0;
  for (const line of lines) {
    const parts = line.split(/[\s,，、\t]+/).filter((p) => p !== '');
    if (mixed) {
      if (parts.length >= 3) rows.push({ class: parts[0] as string, seat: parts[1] as string, name: parts.slice(2).join('') });
      else if (parts.length === 2) rows.push({ class: parts[0] as string, seat: String(++auto), name: parts[1] as string });
      else rows.push({ class: defaultClass, seat: String(++auto), name: parts[0] as string });
    } else if (parts.length >= 2 && /^\d+$/.test(parts[0] as string)) {
      rows.push({ class: defaultClass, seat: parts[0] as string, name: parts.slice(1).join('') });
    } else {
      rows.push({ class: defaultClass, seat: String(++auto), name: parts.join('') });
    }
  }
  return rows;
}

/** 名單檔（xlsx／csv 轉出的資料表）：找「班級」「座號」「姓名」欄。 */
export function rosterRowsFromTable(headers: readonly string[], rows: readonly (readonly Cell[])[]): RosterRow[] | null {
  const norm = headers.map(normalizeHeader);
  const find = (re: RegExp) => norm.findIndex((h) => re.test(h));
  const name = find(/姓名|名字/);
  const seat = find(/座號|號碼/);
  const cls = find(/班級|班別|班$/);
  if (name < 0) return null;
  const t = tableFromRows([headers as Cell[], ...(rows as Cell[][])]);
  return t.rows.map((r, i) => ({
    class: cls >= 0 ? String(r[cls] ?? '').trim() : '',
    seat: seat >= 0 ? String(r[seat] ?? '').trim() : String(i + 1),
    name: String(r[name] ?? '').trim(),
  }));
}

export function rosterFromRows(rows: readonly RosterRow[]): { students: Student[]; problems: ReturnType<typeof buildRoster>['problems'] } {
  const refs: PersonRef[] = rows.map((r) => ({ class: r.class, seat: r.seat, name: r.name }));
  return buildRoster(refs);
}

/** 名單是否含超過一個班級。 */
export function isMixedClasses(students: readonly Student[]): boolean {
  return new Set(students.map((s) => s.class)).size > 1;
}
