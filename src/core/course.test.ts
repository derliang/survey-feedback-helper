import { describe, expect, it } from 'vitest';
import { allocate, cleanPrefs, guessRank, matchCourseNames, moveApplicant, readPrefs, summarize, type Applicant, type Course } from './course';

const courses: Course[] = [
  { name: '微積分', capacity: 2, minSize: 2 },
  { name: '生物實驗', capacity: 2 },
  { name: '地球探索', capacity: 3 },
];
const ap = (id: string, prefs: string[], priority = false): Applicant => ({ id, prefs, priority });
const crowd: Applicant[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ap(id, ['微積分', '生物實驗', '地球探索']));

describe('cleanPrefs', () => {
  it('去除重複與不存在的課程，保留順序', () => {
    expect(cleanPrefs(['生物實驗', '不存在', '生物實驗', '微積分'], courses)).toEqual(['生物實驗', '微積分']);
  });
});

describe('allocate', () => {
  it('不超額時全部拿到第 1 志願', () => {
    const r = allocate([ap('a', ['微積分']), ap('b', ['生物實驗']), ap('c', ['地球探索'])], courses, 's');
    expect(r.assignments.map((x) => [x.course, x.rank])).toEqual([['微積分', 1], ['生物實驗', 1], ['地球探索', 1]]);
  });
  it('名額不超額、沒分到的人往下一志願', () => {
    const r = allocate(crowd, courses, 'seed1');
    const count = (n: string) => r.assignments.filter((x) => x.course === n).length;
    expect([count('微積分'), count('生物實驗'), count('地球探索')]).toEqual([2, 2, 2]);
    expect(r.assignments.filter((x) => x.rank === 1)).toHaveLength(2);
    expect(r.assignments.filter((x) => x.rank === 2)).toHaveLength(2);
    expect(r.assignments.filter((x) => x.rank === 3)).toHaveLength(2);
  });
  it('同種子同結果，且與輸入順序無關', () => {
    const a = allocate(crowd, courses, 'x');
    const b = allocate([...crowd].reverse(), courses, 'x');
    const key = (res: typeof a) => res.assignments.map((s) => `${s.id}:${s.course}`).sort();
    expect(key(a)).toEqual(key(b));
    expect(allocate(crowd, courses, 'x')).toEqual(a);
  });
  it('不同種子可能不同結果', () => {
    const wins = new Set(['s1', 's2', 's3', 's4', 's5', 's6'].map((s) => allocate(crowd, courses, s).assignments.filter((x) => x.rank === 1).map((x) => x.id).join()));
    expect(wins.size).toBeGreaterThan(1);
  });
  it('優先名單超額時先取得名額', () => {
    for (const seed of ['1', '2', '3', '4', '5']) {
      const list = crowd.map((a) => (a.id === 'e' || a.id === 'f' ? { ...a, priority: true } : a));
      const r = allocate(list, courses, seed);
      expect(r.assignments.find((x) => x.id === 'e')?.rank).toBe(1);
      expect(r.assignments.find((x) => x.id === 'f')?.rank).toBe(1);
    }
  });
  it('待安排：沒填志願、志願全滿', () => {
    const r = allocate([ap('a', ['微積分']), ap('b', ['微積分']), ap('c', ['微積分']), ap('d', []), ap('e', ['不存在'])], courses, 's');
    const by = (id: string) => r.assignments.find((x) => x.id === id);
    expect(r.assignments.filter((x) => x.course === '微積分')).toHaveLength(2);
    expect(r.assignments.filter((x) => x.reason === 'allFull')).toHaveLength(1);
    expect(by('d')?.reason).toBe('noPrefs');
    expect(by('e')?.reason).toBe('noPrefs');
  });
  it('名額 0 與空輸入', () => {
    expect(allocate([ap('a', ['微積分'])], [{ name: '微積分', capacity: 0 }], 's').assignments[0]?.course).toBeNull();
    expect(allocate([], courses, 's')).toEqual({ assignments: [], seed: 's', rounds: 0 });
  });
});

describe('summarize 與 moveApplicant', () => {
  it('統計達成率、報名人數、建議停開、名額缺口', () => {
    const r = allocate(crowd, courses, 'k');
    const s = summarize(r.assignments, crowd, courses);
    expect(s).toMatchObject({ total: 6, assigned: 6, unassigned: 0, rankCounts: [2, 2, 2], shortfall: 0 });
    expect(s.firstRate).toBeCloseTo(1 / 3);
    expect(s.courses[0]).toMatchObject({ firstChoice: 6, anyChoice: 6, full: true, suggestClose: false });
    const tight = summarize(r.assignments, [...crowd, ap('g', [])], courses);
    expect(tight.shortfall).toBe(0);
    expect(summarize([], [ap('a', [])], [{ name: 'x', capacity: 0 }]).shortfall).toBe(1);
  });
  it('手動調整：超額會標示，非志願課程 rank 為 null，可移到待安排', () => {
    const list = [ap('a', ['微積分']), ap('b', ['微積分']), ap('c', ['生物實驗', '微積分'])];
    let as = allocate(list, courses, 'z').assignments;
    as = moveApplicant(as, list, 'c', '微積分', courses);
    expect(summarize(as, list, courses).courses[0]?.over).toBe(1);
    as = moveApplicant(as, list, 'a', '地球探索', courses);
    expect(as.find((x) => x.id === 'a')).toMatchObject({ course: '地球探索', rank: null, manual: true });
    as = moveApplicant(as, list, 'b', null, courses);
    expect(as.find((x) => x.id === 'b')).toMatchObject({ course: null, reason: 'allFull' });
  });
  it('最少開班人數：低於門檻只標示建議停開', () => {
    const list = [ap('a', ['微積分'])];
    const s = summarize(allocate(list, courses, 's').assignments, list, courses);
    expect(s.courses[0]?.suggestClose).toBe(true);
  });
});

describe('matchCourseNames', () => {
  it('完全相同、正規化後相同、相似、對不上', () => {
    const m = matchCourseNames(['微積分', '地球 探索', '生物實驗課', '體育'], courses);
    expect(m).toEqual([
      { option: '微積分', course: '微積分', fuzzy: false },
      { option: '地球 探索', course: '地球探索', fuzzy: true },
      { option: '生物實驗課', course: '生物實驗', fuzzy: true },
      { option: '體育', course: null, fuzzy: false },
    ]);
  });
});

describe('readPrefs 與 guessRank', () => {
  it('依欄位順序讀志願並略過空白', () => {
    expect(readPrefs(['x', ' 微積分 ', '', null, '生物實驗'], [1, 2, 3, 4])).toEqual(['微積分', '生物實驗']);
  });
  it('欄名猜志願順序', () => {
    expect(guessRank('選課 [第一志願]')).toBe(1);
    expect(guessRank('第２志願')).toBe(2);
    expect(guessRank('第十二志願')).toBe(12);
    expect(guessRank('第二十志願')).toBe(20);
    expect(guessRank('姓名')).toBeNull();
  });
});
