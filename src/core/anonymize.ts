import { normalizeName } from './text';
import { personKey } from './check';
import { type PersonRef } from './roster';
import { seededShuffle } from './random';
import { type FeedbackSummary, type TargetResult } from './feedback';

export interface PseudonymMap {
  /** 比對鍵 → 代號。 */
  codes: Map<string, string>;
  /** 代號 → 人（對照表，只給老師，不可隨去識別化檔案一起輸出）。 */
  table: { code: string; person: PersonRef }[];
}

/**
 * 姓名換代號。
 * - 以人的比對鍵（班級＋姓名）去重，同一人永遠同一代號
 * - 沒給 seed：依比對鍵排序編號（可重現）；給 seed：以該種子洗牌後編號，代號順序與座號、姓名無關（可重現）
 * - 代號 = prefix + 補零數字，位數隨人數自動加寬（至少 2 位）
 * - 姓名空白的人沒有比對鍵，不編號
 */
export function pseudonymize(people: readonly PersonRef[], opts: { prefix?: string; seed?: string } = {}): PseudonymMap {
  const prefix = opts.prefix ?? 'S';
  const unique = new Map<string, PersonRef>();
  for (const p of people) {
    const k = personKey(p);
    if (k !== null && !unique.has(k)) unique.set(k, p);
  }
  let keys = [...unique.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  if (opts.seed !== undefined) keys = seededShuffle(keys, opts.seed);
  const width = Math.max(2, String(keys.length).length);
  const codes = new Map<string, string>();
  const table = keys.map((k, i) => {
    const code = `${prefix}${String(i + 1).padStart(width, '0')}`;
    codes.set(k, code);
    return { code, person: unique.get(k) as PersonRef };
  });
  return { codes, table };
}

/** 代號；查不到（姓名空白或不在對照表）回 null。 */
export function codeOf(person: PersonRef, map: PseudonymMap): string | null {
  return map.codes.get(personKey(person) ?? '') ?? null;
}

/** 把文字中出現的已知姓名換成 replacement（預設各人的代號；長姓名先換）。名單外的姓名無法辨識，不處理。 */
export function scrubNames(text: string, map: PseudonymMap, replacement?: string): string {
  const names = map.table
    .map((t) => ({ name: normalizeName(t.person.name), code: replacement ?? t.code }))
    .filter((n) => n.name.length >= 2)
    .sort((a, b) => b.name.length - a.name.length);
  let out = text;
  for (const n of names) out = out.split(n.name).join(n.code);
  return out;
}

/** 去識別化彙整：被評者只留代號（不留班級座號）、key 也換成代號、留言內的已知姓名換代號。 */
export function deidentifySummary(summary: FeedbackSummary, map: PseudonymMap): FeedbackSummary {
  return {
    ...summary,
    targets: summary.targets.map((t) => {
      const code = codeOf(t.person, map) ?? '（未編號）';
      return { ...t, key: code, person: { name: code }, comments: t.comments.map((c) => ({ ...c, text: scrubNames(c.text, map) })) };
    }),
  };
}

export type ViewKind = 'teacher' | 'student' | 'parent';

export interface FeedbackView {
  kind: ViewKind;
  person: PersonRef;
  total: number | null;
  classMean: number | null;
  /** 各題平均（到小數一位）與班級各題平均；家長版省略。 */
  items?: { label: string; mean: number | null; classMean: number | null }[];
  rank?: number | null;
  comments: string[];
  /** 教師版才有：他評筆數、自評與留言來源編號。 */
  raters?: number;
  selfScores?: TargetResult['selfScores'];
  commentIds?: number[];
}

function itemRows(target: TargetResult, summary: FeedbackSummary) {
  return summary.items.map((it, i) => ({ label: it.label, mean: target.averageRow[i] ?? null, classMean: summary.classItemMeans[i] ?? null }));
}

/**
 * 三種版本的資料轉換：
 * - teacher：完整（名次、自評、留言來源編號）
 * - student：匿名彙整——各題平均與班均，留言去掉來源編號、已知姓名換成「某同學」；預設不含名次
 * - parent：精簡——總分與班均、最多 maxComments 則留言（預設 2），不含各題與名次
 * showRank 可讓學生版、家長版帶名次。留言姓名遮蔽需要 map（未提供則不遮蔽）。
 */
export function buildView(
  target: TargetResult,
  summary: FeedbackSummary,
  kind: ViewKind,
  opts: { map?: PseudonymMap; showRank?: boolean; maxComments?: number } = {},
): FeedbackView {
  const hide = (s: string) => (opts.map ? scrubNames(s, opts.map, '某同學') : s);
  const base = { kind, person: target.person, total: target.total, classMean: summary.classMean.value };
  if (kind === 'teacher') {
    return {
      ...base,
      items: itemRows(target, summary),
      rank: target.rank,
      comments: target.comments.map((c) => c.text),
      raters: target.raters,
      selfScores: target.selfScores,
      commentIds: target.comments.map((c) => c.recordId),
    };
  }
  const rank = opts.showRank ? { rank: target.rank } : {};
  if (kind === 'student') return { ...base, ...rank, items: itemRows(target, summary), comments: target.comments.map((c) => hide(c.text)) };
  const max = Math.max(0, opts.maxComments ?? 2);
  return { ...base, ...rank, comments: target.comments.slice(0, max).map((c) => hide(c.text)) };
}
