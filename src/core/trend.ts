import { normalizeTitle } from './text';
import { type FeedbackSummary } from './feedback';
import { type PersonRef } from './roster';

export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown';

/** 一次問卷的彙整結果（按時間先後排列，label 如「第一次期中報告」）。 */
export interface TrendWave {
  label: string;
  summary: FeedbackSummary;
}

export interface TrendPoint {
  label: string;
  value: number | null;
  /** 與前一個有值的點比較的差（本次 − 前次）；第一個有值的點或本次無值為 null。 */
  delta: number | null;
  direction: TrendDirection;
}

export interface TrendSeries {
  /** 項目以 normalizeTitle(label) 比對，不同次問卷 id 不同也接得起來。 */
  key: string;
  label: string;
  points: TrendPoint[];
  /** 第一個有值的點到最後一個有值的點的總變化；少於兩個有值的點為 null。 */
  change: number | null;
  direction: TrendDirection;
}

export interface PersonTrend extends TrendSeries {
  person: PersonRef;
  /** 各次名次（沒有為 null）。 */
  ranks: (number | null)[];
}

export interface TrendResult {
  labels: string[];
  /** 班均走勢。 */
  classMean: TrendSeries;
  /** 各題班級平均走勢（只含在任一次出現過的題目）。 */
  items: TrendSeries[];
  /** 每位被評者的總分走勢（以比對鍵為準，缺席的那次為 null）。 */
  people: PersonTrend[];
}

function direction(delta: number | null, epsilon: number): TrendDirection {
  if (delta === null) return 'unknown';
  return delta > epsilon ? 'up' : delta < -epsilon ? 'down' : 'flat';
}

function buildSeries(key: string, label: string, labels: readonly string[], values: readonly (number | null)[], epsilon: number): TrendSeries {
  let prev: number | null = null;
  let first: number | null = null;
  let last: number | null = null;
  let count = 0;
  const points = values.map((value, i): TrendPoint => {
    const delta = value !== null && prev !== null ? value - prev : null;
    if (value !== null) {
      prev = value;
      first ??= value;
      last = value;
      count++;
    }
    return { label: labels[i] ?? '', value, delta, direction: direction(delta, epsilon) };
  });
  const change = first !== null && last !== null && count >= 2 ? last - first : null;
  return { key, label, points, change, direction: direction(change, epsilon) };
}

/**
 * 歷次趨勢比較（同一班多次問卷並排）。
 * epsilon：差距不超過此值視為持平（預設 0.05，避免微小波動被標成進步或退步）。
 * 空輸入回傳空結果；只有一次問卷時所有 delta／change 為 null。
 */
export function compareTrend(waves: readonly TrendWave[], opts: { epsilon?: number } = {}): TrendResult {
  const eps = opts.epsilon ?? 0.05;
  const labels = waves.map((w) => w.label);
  const classMean = buildSeries('classMean', '班均', labels, waves.map((w) => w.summary.classMean.value), eps);

  const itemKeys = new Map<string, string>();
  for (const w of waves) for (const it of w.summary.items) if (!itemKeys.has(normalizeTitle(it.label))) itemKeys.set(normalizeTitle(it.label), it.label);
  const items = [...itemKeys].map(([key, label]) =>
    buildSeries(
      key,
      label,
      labels,
      waves.map((w) => {
        const idx = w.summary.items.findIndex((it) => normalizeTitle(it.label) === key);
        return idx < 0 ? null : (w.summary.classItemMeans[idx] ?? null);
      }),
      eps,
    ),
  );

  const people = new Map<string, { person: PersonRef; totals: (number | null)[]; ranks: (number | null)[] }>();
  waves.forEach((w, wi) => {
    for (const t of w.summary.targets) {
      let p = people.get(t.key);
      if (!p) people.set(t.key, (p = { person: t.person, totals: waves.map(() => null), ranks: waves.map(() => null) }));
      p.totals[wi] = t.total;
      p.ranks[wi] = t.rank;
    }
  });
  return {
    labels,
    classMean,
    items,
    people: [...people].map(([key, p]) => ({ ...buildSeries(key, String(p.person.name ?? ''), labels, p.totals, eps), person: p.person, ranks: p.ranks })),
  };
}
