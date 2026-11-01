import { describe, expect, it } from 'vitest';
import { runChecks, type CheckRecord } from './check';
import { summarizeFeedback, type FeedbackItem, type FeedbackRecord } from './feedback';
import { mulberry32 } from './random';
import { summarizeChoice, summarizeLikert } from './survey';
import { tableFromCsv } from './table';

// 統計效能壓力測試：量實際耗時並設寬鬆上限（CI 機器慢也不應失敗）。
// 結果與建議的使用規模記在 docs/performance.md；這裡的上限是「不退步」的護欄，不是承諾。
const rand = mulberry32('perf');
const time = <T>(label: string, fn: () => T): { out: T; ms: number } => {
  const t0 = performance.now();
  const out = fn();
  const ms = performance.now() - t0;
  console.log(`[perf] ${label}: ${ms.toFixed(0)} ms`);
  return { out, ms };
};

const ITEMS: FeedbackItem[] = Array.from({ length: 8 }, (_, i) => ({ id: `q${i}`, label: `題${i}` }));
function feedbackRecords(n: number, targets: number): FeedbackRecord[] {
  return Array.from({ length: n }, (_, id) => ({
    id,
    rater: { class: '301', name: `填${id % (targets * 2)}` },
    target: { class: '301', name: `評${id % targets}` },
    scores: Object.fromEntries(ITEMS.map((it) => [it.id, Math.floor(rand() * 11)])),
    comment: id % 3 === 0 ? '很清楚' : '',
  }));
}

describe('統計效能壓力測試', () => {
  it('報告回饋：2 萬份回覆、400 位被評對象、8 題', () => {
    const recs = feedbackRecords(20_000, 400);
    const { out, ms } = time('summarizeFeedback 2萬', () => summarizeFeedback(recs, ITEMS));
    expect(out.targets).toHaveLength(400);
    expect(ms).toBeLessThan(5000);
  });
  it('報告回饋：20 萬份回覆（遠超一般班級）', () => {
    const recs = feedbackRecords(200_000, 2000);
    const { out, ms } = time('summarizeFeedback 20萬', () => summarizeFeedback(recs, ITEMS, { trim: 1 }));
    expect(out.targets).toHaveLength(2000);
    expect(ms).toBeLessThan(30_000);
  });
  it('評分與選擇題：50 萬格評分、20 萬格複選', () => {
    const cells = Array.from({ length: 500_000 }, () => Math.floor(rand() * 11));
    const a = time('summarizeLikert 50萬', () => summarizeLikert(cells));
    expect(a.out.n).toBe(500_000);
    expect(a.ms).toBeLessThan(5000);
    const opts = ['甲', '乙', '丙', '丁', '戊'];
    const multi = Array.from({ length: 200_000 }, () => opts.filter(() => rand() < 0.5).join(', '));
    const b = time('summarizeChoice 複選 20萬', () => summarizeChoice(multi, { multi: true, options: opts }));
    expect(b.out.counts).toHaveLength(5);
    expect(b.ms).toBeLessThan(10_000);
  });
  it('資料檢查：1 萬份回覆（書名有 200 種寫法）', () => {
    const recs: CheckRecord[] = Array.from({ length: 10_000 }, (_, id) => ({
      id,
      timestamp: `2026/10/01 10:${String(id % 60).padStart(2, '0')}:00`,
      respondent: { class: '301', name: `填${id}` },
      target: { class: '301', name: `評${id % 300}` },
      bookTitle: `書名${id % 200}`,
      scores: { a: Math.floor(rand() * 11) },
      required: { a: 1 },
    }));
    const { out, ms } = time('runChecks 1萬', () => runChecks(recs, { withTarget: true, scale: { min: 0, max: 10 } }));
    expect(out.total).toBe(10_000);
    expect(ms).toBeLessThan(20_000);
  });
  it('讀取 csv：5 萬列、10 欄', () => {
    const lines = ['a,b,c,d,e,f,g,h,i,j'];
    for (let i = 0; i < 50_000; i++) lines.push(Array.from({ length: 10 }, (_, k) => (k === 0 ? `名${i}` : Math.floor(rand() * 11))).join(','));
    const { out, ms } = time('tableFromCsv 5萬列', () => tableFromCsv(lines.join('\n')));
    expect(out.rows).toHaveLength(50_000);
    expect(ms).toBeLessThan(10_000);
  });
});

describe('統計效能壓力測試：最壞情況', () => {
  it('資料檢查：1000 份回覆、書名全部不同（書名比對是兩兩比較）', () => {
    const recs: CheckRecord[] = Array.from({ length: 1000 }, (_, id) => ({ id, bookTitle: `書名${id}號${Math.floor(rand() * 1e6)}` }));
    const { ms } = time('runChecks 書名1000種', () => runChecks(recs));
    expect(ms).toBeLessThan(30_000);
  });
});
