// 歷次趨勢的接線：把另外選的問卷檔轉成一次「波」，和目前問卷並排。純函式，資料只在記憶體（不寫進資料夾）。
import { type FeedbackSummary, type Table, compareTrend, normalizeTitle } from '../core';
import type { TrendResult, TrendWave } from '../core/trend';
import { defaultStatsOpts, runFeedback } from './analysis';
import { type ColumnInfo, type Scale, analyzeColumns, detectScale, inferKind } from './columns';
import type { Session } from './store';

/** 另外加進來的一次問卷；summary 為 null 表示不是報告回饋型或沒有評分欄。 */
export interface ExtraWave {
  id: string;
  label: string;
  summary: FeedbackSummary | null;
}

/** 目前問卷的欄位對應與量表；較早的問卷以同題名沿用（Issue #222）。 */
export interface TrendRef {
  cols: readonly ColumnInfo[];
  scale: Scale;
}

/** 同題名（normalizeTitle）的欄沿用目前問卷的題型與顯示名稱，其餘維持自動判斷。 */
export function applyRef(cols: ColumnInfo[], ref: TrendRef): ColumnInfo[] {
  const byTitle = new Map<string, ColumnInfo>();
  for (const c of ref.cols) {
    const k = normalizeTitle(c.header);
    if (k !== '' && !byTitle.has(k)) byTitle.set(k, c);
  }
  return cols.map((c) => {
    const m = byTitle.get(normalizeTitle(c.header));
    return m ? { ...c, role: m.role, label: m.label, confirm: false } : c;
  });
}

/** 用欄位自動判斷（不經對應精靈）算出該次的彙整；有 ref 時同題名沿用目前問卷的欄位對應與量表；不是報告回饋型回傳 null。 */
export function summaryFromTable(table: Table, ref?: TrendRef): FeedbackSummary | null {
  const auto = analyzeColumns(table);
  const cols = ref ? applyRef(auto, ref) : auto;
  if (inferKind(cols).kind !== 'feedback') return null;
  if (!cols.some((c) => c.role === 'score')) return null;
  const s = { table, cols, scale: ref ? ref.scale : detectScale(table, cols), excluded: [] as number[] } as unknown as Session;
  return runFeedback(s, defaultStatsOpts());
}

/** 目前問卷放最後一個，其餘依加入順序；沒有結果的次數不列入。 */
export function trendOf(extras: readonly ExtraWave[], current: { label: string; summary: FeedbackSummary }): TrendResult {
  const waves: TrendWave[] = [...extras.filter((e) => e.summary !== null).map((e) => ({ label: e.label, summary: e.summary! })), current];
  return compareTrend(waves);
}

/** 連續下降（至少兩次連續 down）的題目，給警示用。 */
export function consecutiveDrops(t: TrendResult): { label: string; from: number; to: number }[] {
  const out: { label: string; from: number; to: number }[] = [];
  for (const s of t.items) {
    const vals = s.points.filter((p) => p.value !== null);
    let run = 0;
    let start = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i]!.direction === 'down') {
        if (run === 0) start = i - 1;
        run++;
      } else run = 0;
      if (run >= 2 && i === vals.length - 1) out.push({ label: s.label, from: vals[start]!.value!, to: vals[i]!.value! });
    }
  }
  return out;
}
