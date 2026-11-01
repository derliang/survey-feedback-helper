import { describe, expect, it } from 'vitest';
import { crossTab, splitMulti, summarizeChoice, summarizeLikert, summarizeOpen } from './survey';

describe('splitMulti', () => {
  it('無清單時依逗號（全形、頓號）拆並去重', () => {
    expect(splitMulti('A, B，C、A').selected).toEqual(['A', 'B', 'C']);
  });
  it('有清單時選項含逗號也拆得對；清單外歸 others', () => {
    const opts = ['看電影, 看影集', '運動', '閱讀'];
    expect(splitMulti('運動, 看電影, 看影集, 彈吉他', opts)).toEqual({ selected: ['看電影, 看影集', '運動'], others: ['彈吉他'] });
  });
  it('空白與 null', () => {
    expect(splitMulti('')).toEqual({ selected: [], others: [] });
    expect(splitMulti(null, ['a'])).toEqual({ selected: [], others: [] });
  });
});

describe('summarizeChoice', () => {
  it('單選：計次、比例、空白；依次數排序', () => {
    const r = summarizeChoice(['A', 'B', 'A', '', null, ' A ']);
    expect(r.answered).toBe(4);
    expect(r.blank).toBe(2);
    expect(r.counts).toEqual([{ option: 'A', count: 3, share: 0.75 }, { option: 'B', count: 1, share: 0.25 }]);
  });
  it('給選項清單：順序依清單、0 人也列、清單外歸其他（容忍全半形）', () => {
    const r = summarizeChoice(['甲', '乙', '丙丙', 'ｂ'], { options: ['甲', '乙', 'B', '丁'] });
    expect(r.counts.map((c) => [c.option, c.count])).toEqual([['甲', 1], ['乙', 1], ['B', 1], ['丁', 0]]);
    expect(r.others).toEqual([{ text: '丙丙', count: 1 }]);
  });
  it('複選：比例總和可超過 1', () => {
    const r = summarizeChoice(['A, B', 'A', 'B, C'], { multi: true, options: ['A', 'B', 'C'] });
    expect(r.counts.map((c) => c.count)).toEqual([2, 2, 1]);
    expect(r.counts.reduce((s, c) => s + c.share, 0)).toBeGreaterThan(1);
  });
  it('空資料', () => {
    expect(summarizeChoice([])).toEqual({ answered: 0, blank: 0, counts: [], others: [] });
    expect(summarizeChoice([''], { options: ['a'] }).counts).toEqual([{ option: 'a', count: 0, share: 0 }]);
  });
});

describe('summarizeLikert（0～10）', () => {
  it('平均、中位數、標準差、分布', () => {
    const r = summarizeLikert([8, 9, 10, 10, 7]);
    expect(r.n).toBe(5);
    expect(r.mean).toBeCloseTo(8.8);
    expect(r.median).toBe(9);
    expect(r.sd).toBeCloseTo(1.2, 1);
    expect(r.distribution).toHaveLength(11);
    expect(r.distribution[10]).toBe(2);
    expect(r.min).toBe(7);
    expect(r.max).toBe(10);
  });
  it('偶數筆中位數取中間兩數平均', () => {
    expect(summarizeLikert([1, 2, 3, 4]).median).toBe(2.5);
  });
  it('壞資料不計入：非數字、超出範圍、極端值；空白另計', () => {
    const r = summarizeLikert(['八', 11, -1, 1e9, '', null, '7', 5]);
    expect(r).toMatchObject({ n: 2, invalid: 4, blank: 2 });
    expect(r.mean).toBe(6);
  });
  it('全空與全壞 → mean 為 null 不是 NaN', () => {
    expect(summarizeLikert([])).toMatchObject({ n: 0, mean: null, median: null, sd: null });
    expect(summarizeLikert(['x'])).toMatchObject({ n: 0, mean: null, invalid: 1 });
  });
  it('小數計入平均但不進整數分布；單筆標準差為 0', () => {
    const r = summarizeLikert([7.5]);
    expect(r.mean).toBe(7.5);
    expect(r.distribution.every((x) => x === 0)).toBe(true);
    expect(r.sd).toBe(0);
  });
  it('自訂量表 1～5', () => {
    const r = summarizeLikert([1, 5, 6], { min: 1, max: 5 });
    expect(r.distribution).toEqual([1, 0, 0, 0, 1]);
    expect(r.invalid).toBe(1);
  });
});

describe('summarizeOpen / crossTab', () => {
  it('開放題保留列索引並略過空白', () => {
    expect(summarizeOpen(['很好', '', '  ', '加油'])).toEqual({ answers: [{ row: 0, text: '很好' }, { row: 3, text: '加油' }], blank: 2 });
  });
  it('交叉分析：缺任一題者略過', () => {
    const r = crossTab(['男', '女', '男', '', '女'], ['同意', '同意', '不同意', '同意', null]);
    expect(r.rowLabels).toEqual(['男', '女']);
    expect(r.colLabels).toEqual(['同意', '不同意']);
    expect(r.counts).toEqual([[1, 1], [1, 0]]);
    expect(r.skipped).toBe(2);
  });
  it('長度不同以較短者為準；空輸入', () => {
    expect(crossTab(['a', 'b'], ['x']).counts).toEqual([[1]]);
    expect(crossTab([], [])).toEqual({ rowLabels: [], colLabels: [], counts: [], skipped: 0 });
  });
});
