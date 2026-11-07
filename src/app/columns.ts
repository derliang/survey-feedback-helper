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
import { extra } from '../ui/strings-extra';

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
  /** 系統看不出題型但有內容的欄（「待分類」）。老師還沒決定前 `confirm` 為 true；決定後 `confirm` 變 false，這個旗標留著，用來列「已處理」。 */
  unsorted?: boolean;
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
    let unsorted = false;
    if (role === null) {
      const g = guessByContent(columnValues(table, index));
      if (g) {
        role = g.role;
        confirm = g.confirm;
      } else {
        // 有內容卻猜不出題型：標「請確認」，不默默當成不分析
        role = 'ignore';
        confirm = columnValues(table, index).length > 0;
        unsorted = confirm;
      }
    }
    const col: ColumnInfo = { index, header, label: header, role, confirm, samples: samplesOf(table, index) };
    if (unsorted) col.unsorted = true;
    return col;
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
        delete col.unsorted;
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
    return { kind: 'feedback', reason: extra().columns.feedback(scores) };
  }
  if (has(cols, 'preference')) {
    return { kind: 'course', reason: extra().columns.course };
  }
  const titles = cols.map((c) => c.header).join(' ');
  if (/班長|幹部|票選|投票|推薦|當選/.test(titles)) {
    return { kind: 'vote', reason: extra().columns.vote };
  }
  return { kind: 'opinion', reason: extra().columns.opinion };
}

/** 欄位對應還缺什麼；空陣列代表可以往下。 */
export function mappingProblems(kind: SurveyKind, cols: readonly ColumnInfo[]): string[] {
  const out: string[] = [];
  const content = cols.filter((c) => c.role === 'score' || c.role === 'choice' || c.role === 'comment').length;
  if (kind === 'course') {
    if (!has(cols, 'preference')) out.push(extra().columns.needPref);
    if (!has(cols, 'respondentName') && !has(cols, 'respondentSeat')) out.push(extra().columns.needWho);
  } else if (kind === 'vote') {
    if (!has(cols, 'choice')) out.push(extra().columns.needChoice);
  } else if (kind === 'feedback') {
    if (!has(cols, 'respondentName')) out.push(extra().columns.needRespondent);
    if (!has(cols, 'targetName')) out.push(extra().columns.needTarget);
    if (!has(cols, 'score')) out.push(extra().columns.needScore);
  } else if (content === 0) {
    out.push(extra().columns.needContent);
  }
  return out;
}

/** 還在「待分類」的欄：猜不出題型、老師還沒決定。 */
export function isPending(c: ColumnInfo): boolean {
  return c.unsorted === true && c.confirm && c.role === 'ignore';
}

export function pendingCols(cols: readonly ColumnInfo[]): ColumnInfo[] {
  return cols.filter(isPending);
}

/** 老師已處理過的待分類欄（分到某個類型或選了「不使用」）。 */
export function sortedCols(cols: readonly ColumnInfo[]): ColumnInfo[] {
  return cols.filter((c) => c.unsorted === true && !c.confirm);
}

/** 「N 欄請確認」：待分類欄另列，不算在內。 */
export function countToConfirm(cols: readonly ColumnInfo[]): number {
  return cols.filter((c) => c.confirm && !isPending(c)).length;
}

/** 待分類欄的判斷依據：幾人有填、幾種答案。 */
export function pendingFacts(table: Table, index: number): { filled: number; distinct: number } {
  const texts = columnValues(table, index).map((v) => cellText(v));
  return { filled: texts.length, distinct: new Set(texts).size };
}

/** 改回「待分類」：角色回到不使用、標待確認。 */
export function withPending(cols: readonly ColumnInfo[], index: number): ColumnInfo[] {
  return compactRanks(cols.map((c) => (c.index === index ? { ...c, role: 'ignore' as Role, confirm: true, unsorted: true } : c)));
}

/** 其餘待分類欄一次設成「不使用」（老師明確按下，算已處理）。 */
export function ignoreAllPending(cols: readonly ColumnInfo[]): ColumnInfo[] {
  return cols.map((c) => (isPending(c) ? { ...c, role: 'ignore' as Role, confirm: false } : c));
}

/**
 * 量表範圍：評分欄的最大值 ≤5 當 1～5，否則 0～10（樣本是 0～10）；含 0 一律 0～10。
 * 例外：最大值 ≤5 而 0 只有零星一兩筆（不到 5%）時，視為 1～5 的輸入異常，不因此擴成 0～10；那幾筆由資料檢查標成超出範圍。
 */
export function detectScale(table: Table, cols: readonly ColumnInfo[]): Scale {
  return judgeScale(scoreStats(table, cols)).scale;
}

export interface ScoreStats {
  max: number;
  min: number;
  total: number;
  zeros: number;
  /** 各分數出現幾筆（只算讀得成數字的）。 */
  counts: Map<number, number>;
  /** 每個評分欄各有幾筆 0 分。 */
  zeroByCol: { index: number; n: number }[];
  /** 評分欄的數量。 */
  scoreCols: number;
}

export function scoreStats(table: Table, cols: readonly ColumnInfo[]): ScoreStats {
  const st: ScoreStats = { max: 0, min: Infinity, total: 0, zeros: 0, counts: new Map(), zeroByCol: [], scoreCols: 0 };
  for (const c of cols) {
    if (c.role !== 'score') continue;
    st.scoreCols++;
    let zeros = 0;
    for (const v of columnValues(table, c.index)) {
      const n = parseNumber(v);
      if (n === null) continue;
      st.total++;
      if (n === 0) zeros++;
      st.max = Math.max(st.max, n);
      st.min = Math.min(st.min, n);
      st.counts.set(n, (st.counts.get(n) ?? 0) + 1);
    }
    st.zeros += zeros;
    if (zeros > 0) st.zeroByCol.push({ index: c.index, n: zeros });
  }
  return st;
}

/** 判定量表；有疑慮時 `doubt` 寫出為什麼（'sporadic'＝判 1～5 但有零星 0 分；'many'＝最大值 ≤5、0 分不零星而判成 0～10）。 */
export function judgeScale(st: ScoreStats): { scale: Scale; doubt: 'sporadic' | 'many' | null } {
  const { max, min, total, zeros } = st;
  if (max === 0 && min === Infinity) return { scale: { min: 1, max: 5 }, doubt: null };
  if (max <= 5 && min >= 1) return { scale: { min: 1, max: 5 }, doubt: null };
  if (max <= 5 && min === 0) {
    if (zeros <= 2 && zeros / total < 0.05) return { scale: { min: 1, max: 5 }, doubt: 'sporadic' };
    return { scale: { min: 0, max: 10 }, doubt: 'many' };
  }
  return { scale: { min: 0, max: 10 }, doubt: null };
}

export interface ScaleDoubt {
  kind: 'sporadic' | 'many';
  /** 系統的判斷（只標「建議」，不預選）。 */
  suggested: Scale;
  cols: number;
  total: number;
  zeros: number;
  /** 各分數筆數，分數由大到小。 */
  hist: { score: number; n: number; pct: number }[];
  /** 0 分出現在哪幾欄。 */
  where: { col: string; n: number }[];
}

/** 量表有沒有需要老師確認的疑慮；沒有就回 null（維持現狀的分段選擇）。 */
export function scaleDoubt(table: Table, cols: readonly ColumnInfo[]): ScaleDoubt | null {
  const st = scoreStats(table, cols);
  const j = judgeScale(st);
  if (!j.doubt) return null;
  const hist = [...st.counts]
    .sort((a, b) => b[0] - a[0])
    .map(([score, n]) => ({ score, n, pct: Math.round((n / st.total) * 100) }));
  const where = st.zeroByCol.map((z) => ({ col: cols.find((c) => c.index === z.index)?.label ?? '', n: z.n }));
  return { kind: j.doubt, suggested: j.scale, cols: st.scoreCols, total: st.total, zeros: st.zeros, hist, where };
}

/** 評分欄的組合（改了評分欄就要重新判斷量表）。 */
export function scoreSignature(cols: readonly ColumnInfo[]): string {
  return cols
    .filter((c) => c.role === 'score')
    .map((c) => c.index)
    .join(',');
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

/** 「單選方格」匯出的志願：欄名都是「題目 [列名]」且至少兩欄是志願，就合併成一組。欄名格式已於 2026-11-07 對照真實匯出（docs/design/Google介面核對紀錄.md）。 */
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
