import { describe, expect, it } from 'vitest';
import { formatShare, peerContribution, recordScore, selfVsOthers } from './advanced';
import { summarizeFeedback, type FeedbackItem, type FeedbackRecord } from './feedback';
import { median, trimExtremes } from './mean';
import { personKey } from './check';

const items: FeedbackItem[] = [{ id: 'q0', label: '內容' }, { id: 'q1', label: '台風' }];
const rec = (id: number, rater: string, target: string, scores: (number | string | null)[]): FeedbackRecord => ({
  id,
  rater: { name: rater },
  target: { name: target },
  scores: Object.fromEntries(scores.map((s, i) => [`q${i}`, s])),
});
const key = (name: string) => personKey({ name }) as string;

describe('trimExtremes／median（虛構數字）', () => {
  it('各去 k 個最高最低；不改輸入', () => {
    const input = [9, 1, 5, 7, 3];
    expect(trimExtremes(input, 1)).toEqual({ values: [3, 5, 7], trimmed: true });
    expect(trimExtremes(input, 2)).toEqual({ values: [5], trimmed: true });
    expect(input).toEqual([9, 1, 5, 7, 3]);
  });
  it('筆數 ≤ 2k、k=0、負數、空陣列 → 不去除', () => {
    expect(trimExtremes([1, 2], 1)).toEqual({ values: [1, 2], trimmed: false });
    expect(trimExtremes([1, 2, 3], 0).trimmed).toBe(false);
    expect(trimExtremes([1, 2, 3], -1).trimmed).toBe(false);
    expect(trimExtremes([], 1)).toEqual({ values: [], trimmed: false });
  });
  it('單一樣本與全相同值', () => {
    expect(trimExtremes([5], 1).values).toEqual([5]);
    expect(trimExtremes([4, 4, 4, 4], 1)).toEqual({ values: [4, 4], trimmed: true });
  });
  it('中位數：奇偶、空、單一', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(median([7])).toBe(7);
  });
});

describe('summarizeFeedback：反向計分題與最高最低分處理', () => {
  it('反向計分題以 min+max−分數 換算（0～10 量表 3 → 7），自評同樣換算', () => {
    const rev: FeedbackItem[] = [{ id: 'q0', label: '內容' }, { id: 'q1', label: '太吵', reversed: true }];
    const s = summarizeFeedback([rec(0, 'a', 'x', [8, 3]), rec(1, 'x', 'x', [9, 2])], rev);
    const x = s.targets[0]!;
    expect(x.items.map((i) => i.mean)).toEqual([8, 7]);
    expect(x.selfScores).toEqual({ q0: 9, q1: 8 });
  });
  it('反向計分題的壞分數仍先判範圍：11 不會被換成 −1', () => {
    const rev: FeedbackItem[] = [{ id: 'q0', label: 'a', reversed: true }];
    const s = summarizeFeedback([rec(0, 'a', 'x', [11])], rev);
    expect(s.problems).toEqual([{ recordId: 0, itemId: 'q0', kind: 'outOfRange' }]);
    expect(s.targets[0]?.items[0]?.mean).toBeNull();
  });
  it('自訂量表 1～5 的反向計分題：2 → 4', () => {
    const rev: FeedbackItem[] = [{ id: 'q0', label: 'a', reversed: true }];
    expect(summarizeFeedback([rec(0, 'a', 'x', [2])], rev, { scale: { min: 1, max: 5 } }).targets[0]?.items[0]?.mean).toBe(4);
  });
  it('trim=1：每題去掉最高最低；筆數不足時不去除並標示 trimmed=false', () => {
    const rows = [rec(0, 'a', 'x', [0, 5]), rec(1, 'b', 'x', [6, 5]), rec(2, 'c', 'x', [6, null]), rec(3, 'd', 'x', [10, 5])];
    const s = summarizeFeedback(rows, items, { trim: 1 });
    const x = s.targets[0]!;
    expect(x.items[0]).toMatchObject({ mean: 6, n: 4, trimmed: true });
    expect(x.items[1]).toMatchObject({ mean: 5, n: 3, trimmed: true });
    const s2 = summarizeFeedback(rows.slice(0, 2), items, { trim: 1 });
    expect(s2.targets[0]?.items[0]).toMatchObject({ mean: 3, trimmed: false });
  });
  it('trim 預設不去除；單一樣本、全相同值', () => {
    expect(summarizeFeedback([rec(0, 'a', 'x', [7, 7])], items, { trim: 1 }).targets[0]?.items[0]).toMatchObject({ mean: 7, n: 1, trimmed: false });
    const same = [1, 2, 3].map((i) => rec(i, `r${i}`, 'x', [6, 6]));
    expect(summarizeFeedback(same, items, { trim: 1 }).targets[0]?.items[0]?.mean).toBe(6);
    expect(summarizeFeedback(same, items).targets[0]?.items[0]?.trimmed).toBe(false);
  });
  it('最高最低分處理後總分（依題目權重計算）跟著變', () => {
    const w: FeedbackItem[] = [{ id: 'q0', label: 'a', weight: 1 }];
    const rows = [0, 5, 5, 10].map((v, i) => rec(i, `r${i}`, 'x', [v]));
    expect(summarizeFeedback(rows, w).targets[0]?.total).toBe(5);
    expect(summarizeFeedback([0, 6, 6, 10].map((v, i) => rec(i, `r${i}`, 'x', [v])), w, { trim: 1 }).targets[0]?.total).toBe(6);
  });
});

describe('recordScore', () => {
  it('加權、略過空白與壞分數、權重重新正規化、反向計分題換算', () => {
    const w: FeedbackItem[] = [{ id: 'q0', label: 'a', weight: 1 }, { id: 'q1', label: 'b', weight: 3 }];
    expect(recordScore(rec(0, 'a', 'x', [4, 8]), w)).toBe(7);
    expect(recordScore(rec(0, 'a', 'x', [4, null]), w)).toBe(4);
    expect(recordScore(rec(0, 'a', 'x', ['九', 12]), w)).toBeNull();
    expect(recordScore(rec(0, 'a', 'x', [4, 8]), [{ id: 'q0', label: 'a' }, { id: 'q1', label: 'b', reversed: true }])).toBe(3);
    expect(recordScore(rec(0, 'a', 'x', []), [])).toBeNull();
  });
});

describe('selfVsOthers（自評與同學評分比較）', () => {
  it('每題與總分的落差、偏高偏低與接近', () => {
    const s = summarizeFeedback([rec(0, 'x', 'x', [9, 4]), rec(1, 'a', 'x', [6, 5]), rec(2, 'b', 'x', [6, 5])], items);
    const r = selfVsOthers(s)[0]!;
    expect(r.hasSelf).toBe(true);
    expect(r.items.map((i) => i.gap)).toEqual([3, -1]);
    expect(r.items.map((i) => i.kind)).toEqual(['over', 'aligned']); // 剛好 1 分不算超過門檻
    expect(r.selfTotal).toBe(6.5);
    expect(r.othersTotal).toBe(5.5);
    expect(r.totalGap).toBe(1);
    expect(selfVsOthers(s, { threshold: 0.5 })[0]?.items[1]?.kind).toBe('under');
  });
  it('沒有自評 → hasSelf false、各項 unknown、總分落差 null', () => {
    const r = selfVsOthers(summarizeFeedback([rec(0, 'a', 'x', [6, 5])], items))[0]!;
    expect(r).toMatchObject({ hasSelf: false, selfTotal: null, totalGap: null, totalKind: 'unknown' });
    expect(r.items.every((i) => i.kind === 'unknown')).toBe(true);
  });
  it('只有自評（沒有他評）→ 落差 null；自評缺某題只比兩邊都有的題', () => {
    const only = selfVsOthers(summarizeFeedback([rec(0, 'x', 'x', [9, 9])], items))[0]!;
    expect(only.items.every((i) => i.gap === null)).toBe(true);
    const partial = selfVsOthers(summarizeFeedback([rec(0, 'x', 'x', [8, null]), rec(1, 'a', 'x', [6, 6])], items))[0]!;
    expect(partial.items.map((i) => i.gap)).toEqual([2, null]);
    expect(partial.totalGap).toBe(2);
  });
  it('空資料', () => {
    expect(selfVsOthers(summarizeFeedback([], items))).toEqual([]);
  });
});

describe('peerContribution（小組互評貢獻度）', () => {
  const groupOf = (k: string) => ({ [key('甲')]: '第1組', [key('乙')]: '第1組', [key('丙')]: '第1組', [key('丁')]: '第2組', [key('戊')]: '第2組' })[k] ?? null;
  const rows = [
    rec(0, '甲', '乙', [8, 8]),
    rec(1, '丙', '乙', [6, 6]),
    rec(2, '乙', '甲', [5, 5]),
    rec(3, '丙', '甲', [5, 5]),
    rec(4, '甲', '丙', [4, 4]),
    rec(5, '乙', '丙', [4, 4]),
    rec(6, '乙', '乙', [10, 10]),
    rec(7, '丁', '乙', [10, 10]), // 他組評分者：不計入
  ];
  it('占比與指數；自評另列；他組評分者不計入並計數', () => {
    const g = peerContribution(rows, items, groupOf)[0]!;
    expect(g.group).toBe('第1組');
    expect(g.ignored).toBe(1);
    const m = Object.fromEntries(g.members.map((x) => [x.person.name, x]));
    expect(m['乙']).toMatchObject({ raters: 2, received: 7, self: 10 });
    expect(m['甲']).toMatchObject({ raters: 2, received: 5 });
    expect(m['丙']?.received).toBe(4);
    expect(m['乙']?.share).toBeCloseTo(7 / 16);
    expect(m['乙']?.index).toBeCloseTo(7 / (16 / 3));
    expect(m['甲']?.self).toBeNull();
    const shareSum = g.members.reduce((s, x) => s + (x.share ?? 0), 0);
    expect(shareSum).toBeCloseTo(1);
  });
  it('沒被評過的組員 received/share/index 皆 null，不影響他人占比', () => {
    const g = peerContribution([rec(0, '甲', '乙', [6, 6])], items, groupOf)[0]!;
    const m = Object.fromEntries(g.members.map((x) => [x.person.name, x]));
    expect(m['甲']).toMatchObject({ received: null, share: null, index: null });
    expect(m['乙']).toMatchObject({ received: 6, share: 1, index: 1 });
  });
  it('全部 0 分 → 占比與指數為 null（避免除以 0）', () => {
    const g = peerContribution([rec(0, '甲', '乙', [0, 0]), rec(1, '乙', '甲', [0, 0])], items, groupOf)[0]!;
    expect(g.members.every((x) => x.share === null && x.index === null)).toBe(true);
    expect(g.members.every((x) => x.received === 0)).toBe(true);
  });
  it('trim 最高最低分處理；沒有分組對應的人略過；空資料', () => {
    const many = [rec(0, '甲', '乙', [0, 0]), rec(1, '丙', '乙', [6, 6]), rec(2, '乙', '乙', [9, 9])];
    expect(peerContribution(many, items, groupOf)[0]?.members.find((x) => x.person.name === '乙')?.received).toBe(3);
    const t = peerContribution([...many, rec(3, '甲', '乙', [10, 10])], items, groupOf, { trim: 1 })[0]!;
    expect(t.members.find((x) => x.person.name === '乙')?.received).toBe(6);
    expect(peerContribution([rec(0, '路人', '陌生', [5, 5])], items, groupOf)).toEqual([]);
    expect(peerContribution([], items, groupOf)).toEqual([]);
  });
  it('評分者空白姓名不計入', () => {
    const g = peerContribution([{ id: 0, rater: {}, target: { name: '乙' }, scores: { q0: 5, q1: 5 } }], items, groupOf)[0]!;
    expect(g.ignored).toBe(1);
    expect(g.members[0]?.received).toBeNull();
  });
  it('formatShare', () => {
    expect(formatShare(0.2537)).toBe('25.4%');
    expect(formatShare(null)).toBe('—');
    expect(formatShare(0)).toBe('0%');
  });
});
