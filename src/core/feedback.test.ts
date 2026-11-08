import { describe, expect, it } from 'vitest';
import { diffAccumulated, rowFingerprint } from './diff';
import { effectiveWeights, equalWeights, formatWeights, summarizeFeedback, weightShortfall, type FeedbackItem, type FeedbackRecord } from './feedback';

const items: FeedbackItem[] = ['內容', '設計', '講述', '台風', '時間'].map((label, i) => ({ id: `q${i}`, label }));
const rec = (id: number, rater: string, target: string, scores: (number | string | null)[], comment = ''): FeedbackRecord => ({
  id,
  rater: { name: rater },
  target: { name: target },
  scores: Object.fromEntries(scores.map((s, i) => [`q${i}`, s])),
  comment,
});

describe('權重（R-014）', () => {
  it('預設等重；除不盡內部保留精度，顯示小數一位、合計 100%', () => {
    const w = equalWeights(3);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
    expect(formatWeights(w)).toEqual({ each: ['33.3%', '33.3%', '33.3%'], total: '100%' });
    expect(equalWeights(0)).toEqual([]);
  });
  it('有設權重則正規化；全 0 或負數退回等重', () => {
    expect(effectiveWeights([{ id: 'a', label: 'a', weight: 3 }, { id: 'b', label: 'b', weight: 1 }])).toEqual([0.75, 0.25]);
    expect(effectiveWeights([{ id: 'a', label: 'a', weight: 0 }, { id: 'b', label: 'b', weight: 0 }])).toEqual([0.5, 0.5]);
    expect(effectiveWeights([{ id: 'a', label: 'a', weight: -1 }, { id: 'b', label: 'b' }])).toEqual([0.5, 0.5]); // 無效權重視為沒設
  });
  it('手動百分比合計不是 100 → 指出差多少', () => {
    expect(weightShortfall([50, 30])).toBe(20);
    expect(weightShortfall([60, 50])).toBe(-10);
    expect(weightShortfall([33.3, 33.3, 33.4])).toBe(0);
  });
});

describe('summarizeFeedback（報告回饋）', () => {
  const rows: FeedbackRecord[] = [
    rec(0, '甲', '乙', [8, 8, 9, 9, 10], '很棒'),
    rec(1, '丙', '乙', [9, 9, 9, 9, 9], '加油'),
    rec(2, '乙', '甲', [7, 7, 7, 7, 7], '一般'),
    rec(3, '丙', '甲', [9, 9, 9, 9, 9]),
  ];
  it('以被評對象彙整：各題平均、平均列到小數一位、總分、名次', () => {
    const s = summarizeFeedback(rows, items);
    const yi = s.targets.find((t) => t.person.name === '乙')!;
    expect(yi.raters).toBe(2);
    expect(yi.items.map((i) => i.mean)).toEqual([8.5, 8.5, 9, 9, 9.5]);
    expect(yi.averageRow).toEqual([8.5, 8.5, 9, 9, 9.5]);
    expect(yi.total).toBeCloseTo(8.9);
    expect(yi.rank).toBe(1);
    expect(yi.comments.map((c) => c.text)).toEqual(['很棒', '加油']);
    expect(s.targets.find((t) => t.person.name === '甲')?.rank).toBe(2);
  });
  it('班均包含自己這組，標示已計入組數；未給總數只寫已計入', () => {
    const s = summarizeFeedback(rows, items, { totalGroups: 8 });
    expect(s.classMean.label).toBe('班均（已計入 2 組／共 8 組）');
    expect(s.classMean.value).toBeCloseTo((8.9 + 8) / 2);
    expect(s.rankMayChange).toBe(true);
    const s2 = summarizeFeedback(rows, items);
    expect(s2.classMean.label).toBe('班均（已計入 2 組）');
    expect(s2.rankMayChange).toBe(false);
    expect(summarizeFeedback(rows, items, { totalGroups: 2 }).rankMayChange).toBe(false);
  });
  it('平均列四捨五入到小數一位', () => {
    const s = summarizeFeedback([rec(0, 'a', 'x', [8, 8, 8, 8, 8]), rec(1, 'b', 'x', [8, 8, 8, 8, 9]), rec(2, 'c', 'x', [8, 8, 8, 8, 9])], items);
    expect(s.targets[0]?.averageRow[4]).toBe(8.7);
  });
  it('自評不計入他評平均，另存自評分數（樣本有 1 筆自評）', () => {
    const s = summarizeFeedback([rec(0, '乙', '乙', [10, 10, 10, 10, 10]), rec(1, '甲', '乙', [6, 6, 6, 6, 6])], items);
    const yi = s.targets[0]!;
    expect(yi.raters).toBe(1);
    expect(yi.items[0]?.mean).toBe(6);
    expect(yi.selfScores?.q0).toBe(10);
  });
  it('只有自評 → 沒有他評平均，總分與名次為 null，不進班均', () => {
    const s = summarizeFeedback([rec(0, '乙', '乙', [9, 9, 9, 9, 9])], items);
    expect(s.targets[0]).toMatchObject({ total: null, rank: null, raters: 0 });
    expect(s.classMean).toMatchObject({ value: null, included: 0 });
  });
  it('壞分數不計入並列入問題：非數字、超出 0～10、極端值；空白不算問題', () => {
    const s = summarizeFeedback([rec(0, 'a', 'x', [8, '九', 11, -3, null]), rec(1, 'b', 'x', [6, 6, 6, 6, 6])], items);
    expect(s.problems).toEqual([
      { recordId: 0, itemId: 'q1', kind: 'notNumber' },
      { recordId: 0, itemId: 'q2', kind: 'outOfRange' },
      { recordId: 0, itemId: 'q3', kind: 'outOfRange' },
    ]);
    expect(s.targets[0]?.items.map((i) => i.n)).toEqual([2, 1, 1, 1, 1]);
  });
  it('0 分是有效分數；量表上限 10 含', () => {
    const s = summarizeFeedback([rec(0, 'a', 'x', [0, 10, 0, 10, 0])], items);
    expect(s.targets[0]?.items.map((i) => i.mean)).toEqual([0, 10, 0, 10, 0]);
  });
  it('總分（依題目權重計算）；某題全空時權重在其餘題間重新正規化', () => {
    const w: FeedbackItem[] = [{ id: 'q0', label: 'a', weight: 1 }, { id: 'q1', label: 'b', weight: 3 }, { id: 'q2', label: 'c', weight: 6 }];
    expect(summarizeFeedback([rec(0, 'a', 'x', [10, 0, 0])], w).targets[0]?.total).toBeCloseTo(1);
    expect(summarizeFeedback([rec(0, 'a', 'x', [10, 0, null])], w).targets[0]?.total).toBeCloseTo(2.5);
  });
  it('同分同名次；沒有被評姓名的回覆略過；空輸入', () => {
    const s = summarizeFeedback([rec(0, 'a', 'x', [5, 5, 5, 5, 5]), rec(1, 'a', 'y', [5, 5, 5, 5, 5]), { id: 9, rater: { name: 'z' }, target: {}, scores: {} }], items);
    expect(s.targets.map((t) => t.rank)).toEqual([1, 1]);
    expect(s.targets).toHaveLength(2);
    expect(summarizeFeedback([], items).targets).toEqual([]);
  });
  it('資料表為空時不爆', () => {
    const s = summarizeFeedback([], []);
    expect(s.weights).toEqual([]);
    expect(s.classMean.value).toBeNull();
  });
});

describe('累積讀取差異', () => {
  const rows1 = [['2026/10/12 14:00:00', '甲', 8], ['2026/10/12 14:05:00', '乙', 9]];
  const prev = rows1.map(rowFingerprint);
  it('第一次讀：沒有「比上次多」', () => {
    const d = diffAccumulated(null, rows1);
    expect(d).toMatchObject({ firstRead: true, currentCount: 2, added: 0, label: null });
  });
  it('重讀沒變 → 無新增、無標示', () => {
    expect(diffAccumulated(prev, rows1)).toMatchObject({ added: 0, removed: 0, label: null, previousCount: 2 });
  });
  it('新增 N 筆 → 「比上次多 N 筆」並回報新增列索引（不依賴順序）', () => {
    const next = [['2026/10/12 15:00:00', '丙', 7], ...rows1, ['2026/10/12 15:01:00', '丁', 6]];
    const d = diffAccumulated(prev, next);
    expect(d.added).toBe(2);
    expect(d.label).toBe('比上次多 2 筆');
    expect(d.newRowIndices).toEqual([0, 3]);
    expect(d.currentCount).toBe(4);
  });
  it('內容完全相同的兩列各算一筆', () => {
    const d = diffAccumulated(prev, [...rows1, rows1[0]!]);
    expect(d.added).toBe(1);
  });
  it('來源刪除或修改過 → removed 大於 0', () => {
    const d = diffAccumulated(prev, [rows1[0]!, ['2026/10/12 14:05:00', '乙', 10]]);
    expect(d.removed).toBe(1);
    expect(d.added).toBe(1);
  });
  it('指紋不洩漏原文，Date 與字串日期等價於各自的正規化', () => {
    expect(rowFingerprint(['王小明'])).not.toContain('王');
    expect(rowFingerprint([new Date(Date.UTC(2026, 0, 1))])).toBe(rowFingerprint([new Date(Date.UTC(2026, 0, 1))]));
    expect(rowFingerprint([' 甲 ', 8])).toBe(rowFingerprint(['甲', 8]));
  });
  it('空表重讀', () => {
    expect(diffAccumulated([], [])).toMatchObject({ added: 0, removed: 0, firstRead: false });
  });
});
