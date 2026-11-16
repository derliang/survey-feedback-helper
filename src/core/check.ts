import { type Cell, diceSimilarity, isBlankCell, normalizeClass, normalizeName, normalizeSeat, normalizeTitle, parseNumber, parseTimestamp } from './text';
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

/** 比對鍵（班級|姓名）取出姓名。 */
function nameOfKey(k: string): string {
  return k.split('|').slice(1).join('|') || k;
}

export interface DuplicateGroup {
  key: string;
  ids: number[];
  /** 這幾份的座號互不相同：可能是同班同名的兩位學生，只能標「疑似重複」請老師核對，不能直接建議刪除。 */
  seatConflict: boolean;
  /** 給人看的名稱：填寫者姓名；報告回饋為「填寫者 → 被評對象」（不含內部分隔符）。 */
  label: string;
}

/** 重複填答：同一位填寫者（報告回饋時為「填寫者＋被評對象」）出現多份。 */
export function findDuplicates(records: readonly CheckRecord[], withTarget: boolean): DuplicateGroup[] {
  const groups = new Map<string, number[]>();
  const labels = new Map<string, string>();
  const seatOf = new Map<number, number | null>();
  for (const r of records) {
    seatOf.set(r.id, normalizeSeat(r.respondent?.seat));
    const who = personKey(r.respondent);
    if (who === null) continue;
    let key = who;
    let label = nameOfKey(who);
    if (withTarget) {
      const t = personKey(r.target);
      if (t === null) continue;
      key = `${who}→${t}`;
      label = `${nameOfKey(who)} → ${nameOfKey(t)}`;
    }
    groups.set(key, [...(groups.get(key) ?? []), r.id]);
    labels.set(key, label);
  }
  return [...groups]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => {
      const seats = ids.map((id) => seatOf.get(id) ?? null);
      // 每份都填了座號且至少兩種 → 座號不同；有人沒填座號就無從判斷，仍照重複處理
      const seatConflict = seats.every((s) => s !== null) && new Set(seats).size > 1;
      return { key, ids, seatConflict, label: labels.get(key) ?? key };
    });
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

export interface SingleTarget {
  /** 只有一筆回覆的被評對象（給人看的姓名）。 */
  name: string;
  id: number;
  /** 名字最像的其他被評對象（二字組相似度 ≥ 0.5）；找不到為 null。 */
  similarTo: string | null;
}

const TARGET_SIMILARITY = 0.5;

/**
 * 報告回饋：被評對象只有 1 筆回覆（而其他人有多筆）時，疑似同學打錯被評者姓名。
 * 只提示，不改資料、不影響其他人的名次；大家都只有 1 筆（例如一人一份）時不提示。
 */
export function findSingleReplyTargets(records: readonly CheckRecord[]): SingleTarget[] {
  const byKey = new Map<string, { name: string; ids: number[] }>();
  for (const r of records) {
    const k = personKey(r.target);
    if (k === null) continue;
    const e = byKey.get(k) ?? { name: nameOfKey(k), ids: [] };
    e.ids.push(r.id);
    byKey.set(k, e);
  }
  const all = [...byKey.values()];
  if (!all.some((e) => e.ids.length >= 2)) return [];
  const multi = all.filter((e) => e.ids.length >= 2);
  return all
    .filter((e) => e.ids.length === 1)
    .map((e) => {
      let best: { name: string; sim: number } | null = null;
      for (const m of multi) {
        const sim = diceSimilarity(normalizeName(e.name), normalizeName(m.name));
        if (sim >= TARGET_SIMILARITY && (best === null || sim > best.sim)) best = { name: m.name, sim };
      }
      return { name: e.name, id: e.ids[0] as number, similarTo: best?.name ?? null };
    });
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
  /** 只有 1 筆回覆的被評對象（僅報告回饋）。 */
  singleTargets: SingleTarget[];
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
    singleTargets: opts.withTarget ? findSingleReplyTargets(records) : [],
  };
}
