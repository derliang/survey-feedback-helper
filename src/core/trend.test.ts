import { describe, expect, it } from 'vitest';
import { compareTrend } from './trend';
import { summarizeFeedback, type FeedbackItem, type FeedbackRecord } from './feedback';

const mkItems = (labels: string[]): FeedbackItem[] => labels.map((label, i) => ({ id: `q${i}`, label }));
const rec = (id: number, rater: string, target: string, scores: number[]): FeedbackRecord => ({
  id,
  rater: { name: rater },
  target: { name: target },
  scores: Object.fromEntries(scores.map((s, i) => [`q${i}`, s])),
});

describe('compareTrend（歷次趨勢）', () => {
  const items = mkItems(['內容', '台風']);
  const w1 = summarizeFeedback([rec(0, 'a', '乙', [6, 6]), rec(1, 'a', '丙', [8, 8])], items);
  const w2 = summarizeFeedback([rec(0, 'a', '乙', [8, 6]), rec(1, 'a', '丙', [6, 6])], items);
  const w3 = summarizeFeedback([rec(0, 'a', '乙', [9, 5])], items);

  it('班均、各題、每人的差與方向', () => {
    const t = compareTrend([{ label: '第一次', summary: w1 }, { label: '第二次', summary: w2 }, { label: '第三次', summary: w3 }]);
    expect(t.labels).toEqual(['第一次', '第二次', '第三次']);
    expect(t.classMean.points.map((p) => p.value)).toEqual([7, 6.5, 7]);
    expect(t.classMean.points.map((p) => p.delta)).toEqual([null, -0.5, 0.5]);
    expect(t.classMean.points.map((p) => p.direction)).toEqual(['unknown', 'down', 'up']);
    expect(t.classMean.change).toBe(0);
    expect(t.classMean.direction).toBe('flat');
    const content = t.items.find((i) => i.label === '內容')!;
    expect(content.points.map((p) => p.value)).toEqual([7, 7, 9]);
    const yi = t.people.find((p) => p.person.name === '乙')!;
    expect(yi.points.map((p) => p.value)).toEqual([6, 7, 7]);
    expect(yi.change).toBe(1);
    expect(yi.direction).toBe('up');
    expect(yi.ranks).toEqual([2, 1, 1]);
  });
  it('缺席的那次為 null，差與前一個有值的點比', () => {
    const t = compareTrend([{ label: 'a', summary: w1 }, { label: 'b', summary: w3 }, { label: 'c', summary: w2 }]);
    const bing = t.people.find((p) => p.person.name === '丙')!;
    expect(bing.points.map((p) => p.value)).toEqual([8, null, 6]);
    expect(bing.points.map((p) => p.delta)).toEqual([null, null, -2]);
    expect(bing.change).toBe(-2);
    expect(bing.ranks).toEqual([1, null, 2]);
  });
  it('題目以名稱比對（id 不同、全半形或空白不同也接得起來），新題目前面為 null', () => {
    const other = summarizeFeedback([{ id: 0, rater: { name: 'a' }, target: { name: '乙' }, scores: { x: 4, y: 4, z: 4 } }], [{ id: 'x', label: ' 台風 ' }, { id: 'y', label: '內容' }, { id: 'z', label: '時間' }]);
    const t = compareTrend([{ label: 'a', summary: w1 }, { label: 'b', summary: other }]);
    expect(t.items.map((i) => i.label)).toEqual(['內容', '台風', '時間']);
    expect(t.items[1]?.points.map((p) => p.value)).toEqual([7, 4]);
    expect(t.items[2]?.points.map((p) => p.value)).toEqual([null, 4]);
    expect(t.items[2]?.change).toBeNull();
  });
  it('只有一次問卷：沒有差與變化', () => {
    const t = compareTrend([{ label: 'a', summary: w1 }]);
    expect(t.classMean).toMatchObject({ change: null, direction: 'unknown' });
    expect(t.people.every((p) => p.change === null)).toBe(true);
  });
  it('空輸入、空資料的一次', () => {
    const e = compareTrend([]);
    expect(e).toMatchObject({ labels: [], items: [], people: [] });
    expect(e.classMean.points).toEqual([]);
    const empty = compareTrend([{ label: 'a', summary: summarizeFeedback([], items) }, { label: 'b', summary: w1 }]);
    expect(empty.classMean.points.map((p) => p.value)).toEqual([null, 7]);
    expect(empty.classMean.change).toBeNull();
  });
  it('微小變化在 epsilon 內視為持平；全相同值', () => {
    const a = summarizeFeedback([rec(0, 'a', '乙', [5, 5])], items);
    const b = summarizeFeedback([rec(0, 'a', '乙', [5, 5])], items);
    const t = compareTrend([{ label: 'a', summary: a }, { label: 'b', summary: b }]);
    expect(t.people[0]).toMatchObject({ change: 0, direction: 'flat' });
    const c = summarizeFeedback([rec(0, 'a', '乙', [5.04, 5.04])], items);
    expect(compareTrend([{ label: 'a', summary: a }, { label: 'b', summary: c }]).people[0]?.direction).toBe('flat');
    expect(compareTrend([{ label: 'a', summary: a }, { label: 'b', summary: c }], { epsilon: 0 }).people[0]?.direction).toBe('up');
  });
});
