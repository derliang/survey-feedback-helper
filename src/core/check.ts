import { type Cell, diceSimilarity, isBlankCell, normalizeClass, normalizeName, normalizeTitle, parseNumber, parseTimestamp } from './text';
import type { PersonRef } from './roster';

/** 資料檢查的輸入：每份回覆一筆，id 通常是資料列索引。 */
export interface CheckRecord {
  id: number;
  timestamp?: Cell;
  respondent?: PersonRef;
  target?: PersonRef;
  bookTitle?: Cell;
  /** 量表分數，欄位 id → 儲存格。 */
  scores?: Record<string, Cell>;
  /** 必填欄位，欄位 id → 儲存格。 */
  required?: Record<string, Cell>;
}

export interface ScoreScale {
  min: number;
  max: number;
}

/** 人的比對鍵：班級＋姓名（座號可能填錯，不納入）。姓名空白回傳 null。 */
export function personKey(p: PersonRef | undefined): string | null {
  const name = normalizeName(p?.name);
  if (name === '') return null;
  return `${normalizeClass(p?.class)}|${name}`;
}

export interface DuplicateGroup {
  key: string;
  ids: number[];
}

/** 重複填答：同一位填寫者（報告回饋時為「填寫者＋被評對象」）出現多份。 */
export function findDuplicates(records: readonly CheckRecord[], withTarget: boolean): DuplicateGroup[] {
  const groups = new Map<string, number[]>();
  for (const r of records) {
    const who = personKey(r.respondent);
    if (who === null) continue;
    let key = who;
    if (withTarget) {
      const t = personKey(r.target);
      if (t === null) continue;
      key = `${who}→${t}`;
    }
    groups.set(key, [...(groups.get(key) ?? []), r.id]);
  }
  return [...groups].filter(([, ids]) => ids.length > 1).map(([key, ids]) => ({ key, ids }));
}

export interface BlankIssue {
  id: number;
  /** 空白的欄位 id。 */
  fields: string[];
}

/** 空白：必填欄位沒填；整份回覆完全空白時 fields 為全部必填欄位。 */
export function findBlanks(records: readonly CheckRecord[]): BlankIssue[] {
  const out: BlankIssue[] = [];
  for (const r of records) {
    const fields = Object.entries(r.required ?? {})
      .filter(([, v]) => isBlankCell(v))
      .map(([k]) => k);
    if (fields.length > 0) out.push({ id: r.id, fields });
  }
  return out;
}

export interface ScoreIssue {
  id: number;
  field: string;
  /** notNumber：不是數字（如「八」「8分」）；outOfRange：超出量表範圍。空白不算問題（見 findBlanks）。 */
  kind: 'notNumber' | 'outOfRange';
  value: string;
}

/** 無效分數（格式異常的一種）。 */
export function findInvalidScores(records: readonly CheckRecord[], scale: ScoreScale): ScoreIssue[] {
  const out: ScoreIssue[] = [];
  for (const r of records) {
    for (const [field, cell] of Object.entries(r.scores ?? {})) {
      if (isBlankCell(cell)) continue;
      const n = parseNumber(cell);
      const value = String(cell);
      if (n === null) out.push({ id: r.id, field, kind: 'notNumber', value });
      else if (n < scale.min || n > scale.max) out.push({ id: r.id, field, kind: 'outOfRange', value });
    }
  }
  return out;
}

/** 時間戳記無法解析的回覆（有填但格式異常）。 */
export function findBadTimestamps(records: readonly CheckRecord[]): number[] {
  return records.filter((r) => !isBlankCell(r.timestamp) && parseTimestamp(r.timestamp) === null).map((r) => r.id);
}

export interface TitleCluster {
  /** 建議的標準寫法：出現最多次者，同次數取先出現者。 */
  canonical: string;
  variants: { text: string; count: number }[];
  ids: number[];
}

const TITLE_SIMILARITY = 0.7;

/**
 * 同一人書名多種寫法：把「正規化後相同、互相包含（短的至少 4 字）、或二字組相似度 ≥ 0.7」的書名併成一群。
 * 只回報有 2 種以上寫法的群；是否同一本書由老師決定（僅建議）。
 */
export function clusterTitles(records: readonly CheckRecord[]): TitleCluster[] {
  const byText = new Map<string, { norm: string; ids: number[] }>();
  for (const r of records) {
    const text = typeof r.bookTitle === 'string' ? r.bookTitle.trim() : String(r.bookTitle ?? '').trim();
    if (text === '') continue;
    const e = byText.get(text) ?? { norm: normalizeTitle(text), ids: [] };
    e.ids.push(r.id);
    byText.set(text, e);
  }
  const texts = [...byText.keys()];
  const parent = texts.map((_, i) => i);
  const find = (i: number): number => ((parent[i] as number) === i ? i : (parent[i] = find(parent[i] as number)));
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = (byText.get(texts[i] as string) as { norm: string }).norm;
      const b = (byText.get(texts[j] as string) as { norm: string }).norm;
      const [short, long] = a.length <= b.length ? [a, b] : [b, a];
      const similar =
        a === b || (short.length >= 4 && long.includes(short)) || diceSimilarity(a, b) >= TITLE_SIMILARITY;
      if (similar) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, string[]>();
  texts.forEach((t, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), t]));
  const out: TitleCluster[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const variants = members
      .map((text) => ({ text, count: (byText.get(text) as { ids: number[] }).ids.length }))
      .sort((a, b) => b.count - a.count);
    const ids = members.flatMap((t) => (byText.get(t) as { ids: number[] }).ids).sort((a, b) => a - b);
    out.push({ canonical: (variants[0] as { text: string }).text, variants, ids });
  }
  return out;
}

export interface CheckOptions {
  withTarget?: boolean;
  scale?: ScoreScale;
}

export interface CheckReport {
  total: number;
  duplicates: DuplicateGroup[];
  blanks: BlankIssue[];
  invalidScores: ScoreIssue[];
  badTimestamps: number[];
  titleClusters: TitleCluster[];
}

/** 資料檢查總表：重複、空白、無效分數、時間格式異常、書名多種寫法。 */
export function runChecks(records: readonly CheckRecord[], opts: CheckOptions = {}): CheckReport {
  return {
    total: records.length,
    duplicates: findDuplicates(records, opts.withTarget ?? false),
    blanks: findBlanks(records),
    invalidScores: opts.scale ? findInvalidScores(records, opts.scale) : [],
    badTimestamps: findBadTimestamps(records),
    titleClusters: clusterTitles(records),
  };
}
