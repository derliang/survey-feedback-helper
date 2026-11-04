import {
  type Cell,
  type CheckRecord,
  type FieldRole,
  type PersonRef,
  type SavedMapping,
  type Table,
  buildMapping,
  cellText,
  guessRank,
  isBlankCell,
  parseNumber,
  resolveMapping,
  suggestRoles,
} from '../core';
import type { SurveyKind } from '../storage';

export type Role = FieldRole;

export interface ColumnInfo {
  index: number;
  header: string;
  /** 老師看到的名稱（可改）；沒改就等於原標題。 */
  label: string;
  role: Role | null;
  /** 系統沒把握或老師還沒看過，需要確認。 */
  confirm: boolean;
  samples: string[];
  /** 志願欄才有：第幾志願（1 起算）。 */
  rank?: number;
}

export interface Scale {
  min: number;
  max: number;
}

function samplesOf(table: Table, index: number, n = 5): string[] {
  const out: string[] = [];
  for (const r of table.rows) {
    const c = r[index];
    if (!isBlankCell(c)) out.push(cellText(c));
    if (out.length >= n) break;
  }
  return out;
}

function columnValues(table: Table, index: number): Cell[] {
  return table.rows.map((r) => r[index] ?? null).filter((c) => !isBlankCell(c));
}

/** 只靠內容猜：整欄都是 0～10 的數字 → 評分；選項很少 → 選擇題；文字很長 → 開放意見。 */
function guessByContent(values: Cell[]): { role: Role; confirm: boolean } | null {
  if (values.length === 0) return null;
  const nums = values.map((v) => parseNumber(v));
  // 九成以上是 0～10 的整數就當評分：偶有打錯的 11 或混入一筆文字（如「五分」）不該讓整欄被當成選擇題
  // （資料檢查會再標出超出範圍或無法讀成數字的那一列）
  const inRange = nums.filter((n) => n !== null && n >= 0 && n <= 10 && Number.isInteger(n)).length;
  if (inRange / nums.length >= 0.9) {
    return { role: 'score', confirm: true };
  }
  const texts = values.map((v) => cellText(v));
  const distinct = new Set(texts);
  const avgLen = texts.reduce((a, t) => a + t.length, 0) / texts.length;
  if (avgLen >= 12) return { role: 'comment', confirm: true };
  if (distinct.size <= Math.max(6, texts.length / 4) && avgLen <= 12) return { role: 'choice', confirm: true };
  return null;
}

/** 欄位智慧判斷：標題優先，再看內容；沒把握的標「請確認」。 */
export function analyzeColumns(table: Table): ColumnInfo[] {
  const sug = suggestRoles(table.headers);
  const cols = table.headers.map((header, index) => {
    const s = sug[index];
    let role: Role | null = s?.role ?? null;
    let confirm = s?.confidence === 'low' && role !== null;
    if (role === null) {
      const g = guessByContent(columnValues(table, index));
      if (g) {
        role = g.role;
        confirm = g.confirm;
      } else {
        // 有內容卻猜不出題型：標「請確認」，不默默當成不分析
        role = 'ignore';
        confirm = columnValues(table, index).length > 0;
      }
    }
    return { index, header, label: header, role, confirm, samples: samplesOf(table, index) };
  });
  return assignRanks(cols);
}

/** 志願欄的順序：欄名猜得到就用，猜不到或重複的接在最後；一律標「請確認」（順序由老師把關）。 */
export function assignRanks(cols: ColumnInfo[]): ColumnInfo[] {
  const prefs = cols.filter((c) => c.role === 'preference');
  const taken = new Set<number>();
  const guessed = new Map<number, number>();
  for (const c of prefs) {
    const g = guessRank(c.header);
    if (g !== null && !taken.has(g)) {
      taken.add(g);
      guessed.set(c.index, g);
    }
  }
  let next = 1;
  return cols.map((c) => {
    if (c.role !== 'preference') {
      if (c.rank === undefined) return c;
      const rest = { ...c };
      delete rest.rank;
      return rest;
    }
    let r = guessed.get(c.index);
    if (r === undefined) {
      while (taken.has(next)) next++;
      r = next;
      taken.add(r);
    }
    return { ...c, rank: r };
  });
}

/** 依第幾志願排序的志願欄。 */
export function prefColumns(cols: readonly ColumnInfo[]): ColumnInfo[] {
  return cols.filter((c) => c.role === 'preference').sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || a.index - b.index);
}

/** 套用已存的對應（認得讀過）：標題比對成功的欄位直接帶入且免確認，新增的欄位仍需確認。 */
export function applySavedMapping(table: Table, saved: SavedMapping, labels: Record<string, string> = {}): ColumnInfo[] {
  const base = analyzeColumns(table);
  const { columns } = resolveMapping(table.headers, saved);
  for (const [role, idxs] of Object.entries(columns)) {
    idxs.forEach((i, n) => {
      const col = base[i];
      if (col) {
        col.role = role as Role;
        col.confirm = false;
        // 志願欄存檔時依第幾志願排序，順序即志願
        if (role === 'preference') col.rank = n + 1;
        else delete col.rank;
      }
    });
  }
  return base.map((c) => ({ ...c, label: labels[c.header] ?? c.header }));
}

/** 由目前的欄位選擇建立可存的對應（角色 → 欄位原標題）。 */
export function toSavedMapping(cols: readonly ColumnInfo[]): SavedMapping {
  const byRole: Record<string, number[]> = {};
  for (const c of cols) {
    if (c.role === null || c.role === 'preference') continue;
    (byRole[c.role] ??= []).push(c.index);
  }
  const prefs = prefColumns(cols);
  if (prefs.length > 0) byRole.preference = prefs.map((c) => c.index);
  return buildMapping(
    cols.map((c) => c.header),
    byRole,
  );
}

export function toSavedLabels(cols: readonly ColumnInfo[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of cols) if (c.label.trim() !== '' && c.label !== c.header) out[c.header] = c.label.trim();
  return out;
}

const has = (cols: readonly ColumnInfo[], role: Role) => cols.some((c) => c.role === role);

/** 問卷類型建議與判斷依據。 */
export function inferKind(cols: readonly ColumnInfo[]): { kind: SurveyKind; reason: string } {
  const names = cols.filter((c) => c.role === 'respondentName' || c.role === 'targetName').length;
  const scores = cols.filter((c) => c.role === 'score').length;
  if (has(cols, 'targetName') && names >= 2 && scores >= 1) {
    return { kind: 'feedback', reason: `有「填寫者」與「被評對象」兩種姓名欄，並有 ${scores} 題評分，所以判斷是報告回饋。` };
  }
  if (has(cols, 'preference')) {
    return { kind: 'course', reason: '欄名有「第一志願」「第二志願」等字樣，所以判斷是選課分組志願。' };
  }
  const titles = cols.map((c) => c.header).join(' ');
  if (/班長|幹部|票選|投票|推薦|當選/.test(titles)) {
    return { kind: 'vote', reason: '欄位標題有「班長、幹部、票選」等字樣，所以判斷是票選幹部。' };
  }
  return { kind: 'opinion', reason: '沒有被評對象欄，也不像票選，所以判斷是意見調查。' };
}

/** 欄位對應還缺什麼；空陣列代表可以往下。 */
export function mappingProblems(kind: SurveyKind, cols: readonly ColumnInfo[]): string[] {
  const out: string[] = [];
  const content = cols.filter((c) => c.role === 'score' || c.role === 'choice' || c.role === 'comment').length;
  if (kind === 'course') {
    if (!has(cols, 'preference')) out.push('選課分組志願需要至少一欄「志願」。');
    if (!has(cols, 'respondentName') && !has(cols, 'respondentSeat')) out.push('選課分組志願需要「填寫者姓名」或「填寫者座號」，才分得出是誰。');
  } else if (kind === 'vote') {
    if (!has(cols, 'choice')) out.push('票選幹部需要至少一欄「選擇題」（例如班長、副班長）。');
  } else if (kind === 'feedback') {
    if (!has(cols, 'respondentName')) out.push('報告回饋需要一欄「填寫者姓名」。');
    if (!has(cols, 'targetName')) out.push('報告回饋需要一欄「被評對象姓名」。');
    if (!has(cols, 'score')) out.push('報告回饋需要至少一欄「評分」。');
  } else if (content === 0) {
    out.push('意見調查需要至少一欄「評分」「選擇題」或「開放意見」。');
  }
  return out;
}

export function countToConfirm(cols: readonly ColumnInfo[]): number {
  return cols.filter((c) => c.confirm).length;
}

/**
 * 量表範圍：評分欄的最大值 ≤5 當 1～5，否則 0～10（樣本是 0～10）；含 0 一律 0～10。
 * 例外：最大值 ≤5 而 0 只有零星一兩筆（不到 5%）時，視為 1～5 的輸入異常，不因此擴成 0～10；那幾筆由資料檢查標成超出範圍。
 */
export function detectScale(table: Table, cols: readonly ColumnInfo[]): Scale {
  let max = 0;
  let min = Infinity;
  let total = 0;
  let zeros = 0;
  for (const c of cols) {
    if (c.role !== 'score') continue;
    for (const v of columnValues(table, c.index)) {
      const n = parseNumber(v);
      if (n === null) continue;
      total++;
      if (n === 0) zeros++;
      max = Math.max(max, n);
      min = Math.min(min, n);
    }
  }
  if (max === 0 && min === Infinity) return { min: 1, max: 5 };
  if (max <= 5 && min >= 1) return { min: 1, max: 5 };
  if (max <= 5 && min === 0 && zeros <= 2 && zeros / total < 0.05) return { min: 1, max: 5 };
  return { min: 0, max: 10 };
}

function pick(row: readonly Cell[], cols: readonly ColumnInfo[], role: Role): Cell {
  const c = cols.find((x) => x.role === role);
  return c ? (row[c.index] ?? null) : null;
}

/** 某一組人（填寫者或被評對象）每列的班級、座號、姓名。 */
export function personRefs(table: Table, cols: readonly ColumnInfo[], who: 'respondent' | 'target'): PersonRef[] {
  return table.rows.map((r) => ({
    class: pick(r, cols, `${who}Class` as Role),
    seat: pick(r, cols, `${who}Seat` as Role),
    name: pick(r, cols, `${who}Name` as Role),
  }));
}

/** 資料檢查的輸入：只含檢查需要的欄位。 */
export function buildCheckRecords(table: Table, cols: readonly ColumnInfo[]): CheckRecord[] {
  const resp = personRefs(table, cols, 'respondent');
  const target = personRefs(table, cols, 'target');
  const scoreCols = cols.filter((c) => c.role === 'score');
  return table.rows.map((r, i) => ({
    id: i,
    timestamp: pick(r, cols, 'timestamp'),
    respondent: resp[i],
    target: target[i],
    bookTitle: pick(r, cols, 'bookTitle'),
    scores: Object.fromEntries(scoreCols.map((c) => [String(c.index), r[c.index] ?? null])),
    required: Object.fromEntries(
      cols.filter((c) => c.role === 'score' || c.role === 'choice').map((c) => [String(c.index), r[c.index] ?? null]),
    ),
  }));
}

/** 志願順序整理成 1、2、3…（中間有空缺就補齊）。 */
export function compactRanks(cols: readonly ColumnInfo[]): ColumnInfo[] {
  const order = new Map(prefColumns(cols).map((c, i) => [c.index, i + 1]));
  return cols.map((c) => {
    if (c.role !== 'preference') {
      if (c.rank === undefined) return c;
      const rest = { ...c };
      delete rest.rank;
      return rest;
    }
    return { ...c, rank: order.get(c.index) ?? 1 };
  });
}

/** 改某欄的角色；改成「志願」時接在最後一個志願後面，離開「志願」時順序自動補齊。 */
export function withRole(cols: readonly ColumnInfo[], index: number, role: Role): ColumnInfo[] {
  const used = prefColumns(cols).filter((c) => c.index !== index).length;
  return compactRanks(
    cols.map((c) => {
      if (c.index !== index) return c;
      const next: ColumnInfo = { ...c, role, confirm: false };
      if (role === 'preference') next.rank = used + 1;
      return next;
    }),
  );
}

/** 指定某欄為第幾志願；原本佔著該順位的欄跟它對調。 */
export function withRank(cols: readonly ColumnInfo[], index: number, rank: number): ColumnInfo[] {
  const me = cols.find((c) => c.index === index);
  if (!me || me.role !== 'preference') return [...cols];
  const mine = me.rank ?? 1;
  return cols.map((c) => {
    if (c.index === index) return { ...c, rank, confirm: false };
    if (c.role === 'preference' && c.rank === rank) return { ...c, rank: mine };
    return c;
  });
}

/** 志願順序上移或下移一格。 */
export function movePref(cols: readonly ColumnInfo[], index: number, dir: -1 | 1): ColumnInfo[] {
  const order = prefColumns(cols);
  const at = order.findIndex((c) => c.index === index);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= order.length) return [...cols];
  const a = order[at] as ColumnInfo;
  const b = order[to] as ColumnInfo;
  return cols.map((c) => {
    if (c.index === a.index) return { ...c, rank: to + 1, confirm: false };
    if (c.index === b.index) return { ...c, rank: at + 1, confirm: false };
    return c;
  });
}

export interface GridGroup {
  /** 題目名稱（欄名「題目 [列名]」方括號前的部分） */
  question: string;
  /** 已當成志願的欄，依志願順序 */
  members: ColumnInfo[];
  /** 同一題但沒當成志願的欄 */
  unmatched: ColumnInfo[];
}

const GRID = /^(.*?)\s*[[［]\s*(.+?)\s*[\]］]\s*$/;

/** 「選擇題方格」匯出的志願：欄名都是「題目 [列名]」且至少兩欄是志願，就合併成一組。欄名格式待核對真實匯出。 */
export function gridGroup(cols: readonly ColumnInfo[]): GridGroup | null {
  const prefs = prefColumns(cols);
  const byQ = new Map<string, ColumnInfo[]>();
  for (const c of prefs) {
    const m = GRID.exec(c.header.normalize('NFKC'));
    if (!m) continue;
    const q = (m[1] as string).trim();
    byQ.set(q, [...(byQ.get(q) ?? []), c]);
  }
  const best = [...byQ].sort((a, b) => b[1].length - a[1].length)[0];
  if (!best || best[1].length < 2) return null;
  const [question, members] = best;
  const unmatched = cols.filter((c) => c.role !== 'preference' && (GRID.exec(c.header.normalize('NFKC'))?.[1] ?? '').trim() === question);
  return { question, members, unmatched };
}
