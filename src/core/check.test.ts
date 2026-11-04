import { describe, expect, it } from 'vitest';
import { clusterTitles, findBadTimestamps, findBlanks, findDuplicates, findInvalidScores, runChecks, type CheckRecord } from './check';

const rec = (id: number, o: Partial<CheckRecord> = {}): CheckRecord => ({ id, ...o });

describe('findDuplicates', () => {
  it('同一位填寫者多份（容忍空白）', () => {
    const d = findDuplicates([rec(0, { respondent: { name: '王小明' } }), rec(1, { respondent: { name: ' 王 小明' } }), rec(2, { respondent: { name: '李小華' } })], false);
    expect(d).toEqual([{ key: '|王小明', ids: [0, 1], seatConflict: false }]);
  });
  it('報告回饋以「填寫者＋被評對象」為單位：評不同人不算重複', () => {
    const rows = [
      rec(0, { respondent: { name: 'A' }, target: { name: 'X' } }),
      rec(1, { respondent: { name: 'A' }, target: { name: 'Y' } }),
      rec(2, { respondent: { name: 'A' }, target: { name: 'X' } }),
    ];
    expect(findDuplicates(rows, true).map((g) => g.ids)).toEqual([[0, 2]]);
  });
  it('沒填姓名的不參與重複判斷；空輸入無結果', () => {
    expect(findDuplicates([rec(0), rec(1)], false)).toEqual([]);
    expect(findDuplicates([], true)).toEqual([]);
  });
  it('不同班同名不算重複', () => {
    expect(findDuplicates([rec(0, { respondent: { class: '301', name: 'A' } }), rec(1, { respondent: { class: '302', name: 'A' } })], false)).toEqual([]);
  });
});

describe('findBlanks / findInvalidScores / findBadTimestamps', () => {
  it('必填空白列出欄位', () => {
    expect(findBlanks([rec(0, { required: { name: '王', book: ' ' } }), rec(1, { required: { name: '', book: null } }), rec(2, { required: { name: 'x' } })])).toEqual([
      { id: 0, fields: ['book'] },
      { id: 1, fields: ['name', 'book'] },
    ]);
  });
  it('無效分數：非數字、超出範圍、負數、極端值；空白與小數不算', () => {
    const issues = findInvalidScores(
      [rec(0, { scores: { a: '八', b: 11, c: -1, d: 9999999, e: '', f: 7.5, g: '10', h: '8分' } })],
      { min: 0, max: 10 },
    );
    expect(issues.map((i) => `${i.field}:${i.kind}`)).toEqual(['a:notNumber', 'b:outOfRange', 'c:outOfRange', 'd:outOfRange', 'h:notNumber']);
  });
  it('時間格式異常只抓「有填但解析不了」', () => {
    expect(findBadTimestamps([rec(0, { timestamp: '2026/10/12 14:00:00' }), rec(1, { timestamp: '昨天' }), rec(2, { timestamp: '' }), rec(3, { timestamp: '2026/13/40 1:00' })])).toEqual([1, 3]);
  });
});

describe('clusterTitles（書名多種寫法）', () => {
  it('標點空白不同、互相包含、一兩個字不同都歸同一群，並選最多人用的寫法', () => {
    const titles = ['不被定義的心理師', '不被定義的心理醫生', '《不被定義的心理師》', ' 不被定義的心理師', '不被定義的心理師（增訂版）', '海邊的卡夫卡', '海邊的卡夫卡'];
    const clusters = clusterTitles(titles.map((t, i) => rec(i, { bookTitle: t })));
    expect(clusters).toHaveLength(1);
    const c = clusters[0]!;
    expect(c.canonical).toBe('不被定義的心理師');
    expect(c.variants.map((v) => v.text)).toContain('不被定義的心理醫生');
    expect(c.ids).toEqual([0, 1, 2, 3, 4]);
  });
  it('不同的書不併；全部相同或只有一種寫法時不回報', () => {
    expect(clusterTitles([rec(0, { bookTitle: '小王子' }), rec(1, { bookTitle: '海邊的卡夫卡' })])).toEqual([]);
    expect(clusterTitles([rec(0, { bookTitle: '小王子' }), rec(1, { bookTitle: '小王子' })])).toEqual([]);
    expect(clusterTitles([])).toEqual([]);
  });
  it('空白書名與非字串書名不會壞', () => {
    expect(clusterTitles([rec(0, { bookTitle: null }), rec(1, { bookTitle: '  ' }), rec(2, { bookTitle: 123 })])).toEqual([]);
  });
});

describe('runChecks', () => {
  it('彙整所有檢查；沒給量表就不查分數', () => {
    const rows = [rec(0, { respondent: { name: 'A' }, scores: { a: 99 }, timestamp: 'x' }), rec(1, { respondent: { name: 'A' }, scores: { a: 5 } })];
    const full = runChecks(rows, { scale: { min: 0, max: 10 } });
    expect(full.total).toBe(2);
    expect(full.duplicates).toHaveLength(1);
    expect(full.invalidScores).toHaveLength(1);
    expect(full.badTimestamps).toEqual([0]);
    expect(runChecks(rows).invalidScores).toEqual([]);
  });
  it('空表', () => {
    expect(runChecks([])).toEqual({ total: 0, duplicates: [], blanks: [], invalidScores: [], badTimestamps: [], titleClusters: [] });
  });
});
