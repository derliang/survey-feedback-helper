import { type Cell, isBlankCell, parseNumber, round1 } from './text';
import { type PersonRef } from './roster';
import { personKey } from './check';

export interface FeedbackItem {
  id: string;
  label: string;
  /** 權重（相對值）。未給時等重。 */
  weight?: number;
}

export interface FeedbackScale {
  min: number;
  max: number;
}

/** 量表預設 0～10（樣本結構）。 */
export const DEFAULT_SCALE: FeedbackScale = { min: 0, max: 10 };

/** 一份回饋：填寫者評被評對象（雙欄結構）。 */
export interface FeedbackRecord {
  id: number;
  rater: PersonRef;
  target: PersonRef;
  scores: Record<string, Cell>;
  comment?: Cell;
}

/** 權重預設等重（R-014）：回傳每項的內部權重，和為 1，除不盡時內部保留完整精度。 */
export function equalWeights(n: number): number[] {
  return n <= 0 ? [] : Array<number>(n).fill(1 / n);
}

/** 內部權重：全部項目都沒設權重 → 等重；有設定時依比例正規化到和為 1。 */
export function effectiveWeights(items: readonly FeedbackItem[]): number[] {
  const set = items.map((i) => (i.weight !== undefined && i.weight >= 0 && Number.isFinite(i.weight) ? i.weight : null));
  if (set.every((w) => w === null)) return equalWeights(items.length);
  const filled = set.map((w) => w ?? 0);
  const sum = filled.reduce((s, w) => s + w, 0);
  return sum === 0 ? equalWeights(items.length) : filled.map((w) => w / sum);
}

/** 權重欄顯示：每項到小數一位的百分比；合計顯示 100%（除不盡時不補差，內部仍等重）。 */
export function formatWeights(weights: readonly number[]): { each: string[]; total: string } {
  return { each: weights.map((w) => `${round1(w * 100)}%`), total: weights.length === 0 ? '0%' : '100%' };
}

/** 手動輸入百分比權重時的檢查：合計不是 100 要指出差多少（正數＝還差、負數＝超出）。 */
export function weightShortfall(percents: readonly number[]): number {
  return round1(100 - percents.reduce((s, p) => s + p, 0));
}

export interface ItemStat {
  itemId: string;
  /** 他評分數的平均；沒有有效分數為 null。 */
  mean: number | null;
  /** 有效分數筆數。 */
  n: number;
}

export interface TargetResult {
  key: string;
  person: PersonRef;
  /** 他評的筆數（不含自評）。 */
  raters: number;
  items: ItemStat[];
  /** 加權總分（只含有平均的項目，權重在這些項目間重新正規化）；沒有任何項目為 null。 */
  total: number | null;
  /** 自評（填寫者＝被評者）的各項分數，供「自評對他評」使用，不計入他評平均。 */
  selfScores: Record<string, number | null> | null;
  comments: { recordId: number; text: string }[];
  /** 平均列：各題平均到小數一位（個人回饋單最後一列）。 */
  averageRow: (number | null)[];
  rank: number | null;
}

export interface ScoreProblem {
  recordId: number;
  itemId: string;
  kind: 'notNumber' | 'outOfRange';
}

export interface FeedbackSummary {
  items: FeedbackItem[];
  weights: number[];
  targets: TargetResult[];
  problems: ScoreProblem[];
  /** 班均：各組加權總分的平均，包含自己這組（R-016）。 */
  classMean: { value: number | null; included: number; total: number | null; label: string };
  /** 班級各題平均（以各組該題平均再平均）。 */
  classItemMeans: (number | null)[];
  /** 資料不齊（已計入組數少於總組數）→ 排名可能改變。 */
  rankMayChange: boolean;
}

/**
 * 報告回饋彙整：以被評對象為單位。
 * - 自評（填寫者與被評者同一人）不計入他評平均，另存 selfScores
 * - 無效分數（非數字、超出量表）不計入並列入 problems
 * - 權重預設等重；總分只在有分數的項目間正規化
 * - totalGroups：全班應有幾組（例如名單裡要報告的人數）；未提供時班均只寫「已計入」
 */
export function summarizeFeedback(
  records: readonly FeedbackRecord[],
  items: readonly FeedbackItem[],
  opts: { scale?: FeedbackScale; totalGroups?: number } = {},
): FeedbackSummary {
  const scale = opts.scale ?? DEFAULT_SCALE;
  const weights = effectiveWeights(items);
  const problems: ScoreProblem[] = [];
  type Acc = { person: PersonRef; sums: number[]; ns: number[]; raters: Set<string>; raterCount: number; self: Record<string, number | null> | null; comments: { recordId: number; text: string }[] };
  const byTarget = new Map<string, Acc>();

  for (const r of records) {
    const key = personKey(r.target);
    if (key === null) continue;
    const acc = byTarget.get(key) ?? { person: r.target, sums: items.map(() => 0), ns: items.map(() => 0), raters: new Set(), raterCount: 0, self: null, comments: [] };
    byTarget.set(key, acc);
    const isSelf = personKey(r.rater) === key;
    const parsed = items.map((it) => {
      const cell = r.scores[it.id];
      if (isBlankCell(cell)) return null;
      const n = parseNumber(cell);
      if (n === null) {
        problems.push({ recordId: r.id, itemId: it.id, kind: 'notNumber' });
        return null;
      }
      if (n < scale.min || n > scale.max) {
        problems.push({ recordId: r.id, itemId: it.id, kind: 'outOfRange' });
        return null;
      }
      return n;
    });
    if (isSelf) {
      acc.self = Object.fromEntries(items.map((it, i) => [it.id, parsed[i] ?? null]));
      continue;
    }
    acc.raterCount++;
    parsed.forEach((v, i) => {
      if (v !== null) {
        acc.sums[i] = (acc.sums[i] ?? 0) + v;
        acc.ns[i] = (acc.ns[i] ?? 0) + 1;
      }
    });
    const text = typeof r.comment === 'string' ? r.comment.trim() : '';
    if (text !== '') acc.comments.push({ recordId: r.id, text });
  }

  const targets: TargetResult[] = [...byTarget].map(([key, a]) => {
    const itemStats: ItemStat[] = items.map((it, i) => ({
      itemId: it.id,
      n: a.ns[i] ?? 0,
      mean: (a.ns[i] ?? 0) > 0 ? (a.sums[i] as number) / (a.ns[i] as number) : null,
    }));
    let wsum = 0;
    let total = 0;
    itemStats.forEach((s, i) => {
      if (s.mean !== null) {
        total += s.mean * (weights[i] ?? 0);
        wsum += weights[i] ?? 0;
      }
    });
    return {
      key,
      person: a.person,
      raters: a.raterCount,
      items: itemStats,
      total: wsum > 0 ? total / wsum : null,
      selfScores: a.self,
      comments: a.comments,
      averageRow: itemStats.map((s) => (s.mean === null ? null : round1(s.mean))),
      rank: null,
    };
  });

  const ranked = targets.filter((t) => t.total !== null).sort((a, b) => (b.total as number) - (a.total as number));
  ranked.forEach((t, i) => {
    const prev = ranked[i - 1];
    t.rank = prev && prev.total === t.total ? (prev.rank as number) : i + 1;
  });

  const totals = targets.map((t) => t.total).filter((v): v is number => v !== null);
  const included = totals.length;
  const total = opts.totalGroups ?? null;
  const classMean = {
    value: included === 0 ? null : totals.reduce((s, v) => s + v, 0) / included,
    included,
    total,
    label: total === null ? `班均（已計入 ${included} 組）` : `班均（已計入 ${included} 組／共 ${total} 組）`,
  };
  const classItemMeans = items.map((_, i) => {
    const ms = targets.map((t) => t.items[i]?.mean ?? null).filter((v): v is number => v !== null);
    return ms.length === 0 ? null : ms.reduce((s, v) => s + v, 0) / ms.length;
  });
  return {
    items: [...items],
    weights,
    targets,
    problems,
    classMean,
    classItemMeans,
    rankMayChange: total !== null && included < total,
  };
}
