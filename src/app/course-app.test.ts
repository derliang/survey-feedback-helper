import { describe, expect, it } from 'vitest';
import { tableFromCsv } from '../core';
import {
  type CourseState,
  cannotRun,
  courseApplicants,
  courseIssues,
  courseList,
  courseNames,
  emptyCourseState,
  includedCount,
  outsideIds,
  mergeSuggestions,
  moveTo,
  parseCourse,
  personLabel,
  resultStale,
  runAllocation,
  serializeCourse,
  stampTaipei,
} from './course-app';
import { hitSheets, listSheets, pendingSheets } from './course-out';
import { analyzeColumns, applySavedMapping, assignRanks, detectScale, gridGroup, inferKind, mappingProblems, movePref, prefColumns, toSavedMapping, withRank, withRole } from './columns';
import type { Session } from './store';

// 全部是虛構資料
const CSV = [
  '座號,姓名,第三志願,第一志願,第二志願',
  '1,甲,丙課,甲課,乙課',
  '2,乙,丙課,甲課,乙課',
  '3,丙,乙課,甲課,丙課',
  '4,丁,,,',
  '5,戊,甲課,乙課,丙課',
  '6,己,丙 課,乙課,甲課',
].join('\n');

function session(extra: Partial<Session> = {}): Session {
  const table = tableFromCsv(CSV);
  const cols = analyzeColumns(table);
  return {
    fileName: 't.csv', sourceLabel: 'Excel 檔', name: '選課', table, cols, kind: 'course', kindReason: '', kindConfirmed: true,
    scale: detectScale(table, cols), scaleConfirmed: true, sheetPool: null, mappingConfirmed: true, recognition: null, surveyId: 's1', previousRows: null,
    rosterRows: null, rosterMixed: false, rosterSkipped: false, rosterName: '', resolutions: {}, excluded: [], titleMerges: {}, checkHandled: [], course: emptyCourseState(),
    demo: false, ...extra,
  };
}

const withCaps = (c: CourseState, caps: Record<string, string>, min: Record<string, string> = {}): CourseState => ({ ...c, capacity: caps, minSize: min });

describe('志願欄對應', () => {
  it('欄名猜順序：第一、第二、第三志願，不是欄位出現的順序', () => {
    const cols = analyzeColumns(tableFromCsv(CSV));
    expect(prefColumns(cols).map((c) => c.header)).toEqual(['第一志願', '第二志願', '第三志願']);
    expect(cols.filter((c) => c.role === 'preference').every((c) => c.confirm)).toBe(true);
    expect(inferKind(cols).kind).toBe('course');
  });

  it('沒有志願欄或沒有姓名座號時擋下', () => {
    const cols = analyzeColumns(tableFromCsv(CSV));
    expect(mappingProblems('course', cols)).toEqual([]);
    expect(mappingProblems('course', cols.map((c) => (c.role === 'preference' ? { ...c, role: 'ignore' as const } : c)))).toHaveLength(1);
    expect(mappingProblems('course', cols.map((c) => (c.role === 'respondentName' || c.role === 'respondentSeat' ? { ...c, role: 'ignore' as const } : c)))).toHaveLength(1);
  });

  it('withRole／withRank／movePref：順序一律保持 1、2、3…，換順位會和原本佔用的欄對調', () => {
    let cols = analyzeColumns(tableFromCsv(CSV));
    cols = movePref(cols, 2, -1); // 第三志願欄（索引 2）上移
    expect(prefColumns(cols).map((c) => c.header)).toEqual(['第一志願', '第三志願', '第二志願']);
    cols = withRank(cols, 2, 1); // 第三志願欄指定成 1，原本的 1 對調
    expect(prefColumns(cols).map((c) => [c.header, c.rank])).toEqual([['第三志願', 1], ['第一志願', 2], ['第二志願', 3]]);
    cols = withRole(cols, 2, 'ignore'); // 離開志願後補齊
    expect(prefColumns(cols).map((c) => [c.header, c.rank])).toEqual([['第一志願', 1], ['第二志願', 2]]);
    cols = withRole(cols, 0, 'preference'); // 新增志願欄接在最後
    expect(prefColumns(cols).at(-1)?.index).toBe(0);
    expect(prefColumns(cols).at(-1)?.rank).toBe(3);
  });

  it('存檔對應的順序就是志願順序，讀回來順序不變', () => {
    const table = tableFromCsv(CSV);
    const cols = movePref(analyzeColumns(table), 2, -1);
    const saved = toSavedMapping(cols);
    expect(saved.preference).toEqual(['第一志願', '第三志願', '第二志願']);
    expect(prefColumns(applySavedMapping(table, saved)).map((c) => c.header)).toEqual(['第一志願', '第三志願', '第二志願']);
  });

  it('assignRanks：猜不到的欄接在後面，不重複', () => {
    const table = tableFromCsv('姓名,志願 A,志願 B\n甲,x,y');
    const cols = assignRanks(analyzeColumns(table));
    expect(prefColumns(cols).map((c) => c.rank)).toEqual([1, 2]);
  });

  it('單選方格：同一題的志願欄合併成一組，同題但沒當志願的欄列為對不上', () => {
    const table = tableFromCsv('姓名,志願選課 [第一志願],志願選課 [第二志願],志願選課 [備註]\n甲,a,b,c');
    const cols = analyzeColumns(table).map((c) => (c.header.includes('備註') ? { ...c, role: 'ignore' as const } : c));
    const g = gridGroup(cols);
    expect(g?.question).toBe('志願選課');
    expect(g?.members.map((m) => m.header)).toEqual(['志願選課 [第一志願]', '志願選課 [第二志願]']);
    expect(g?.unmatched.map((m) => m.header)).toEqual(['志願選課 [備註]']);
    expect(gridGroup(analyzeColumns(tableFromCsv(CSV)))).toBeNull();
  });
});

describe('名額與分配的資料接線', () => {
  it('課程名相近的選項建議合併，按「合併」後課程數減少，按「不合併」後不再提示', () => {
    const s = session();
    const c0 = emptyCourseState();
    expect(mergeSuggestions(s, c0)).toEqual([{ option: '丙 課', into: '丙課' }]);
    expect(courseNames(s, c0)).toHaveLength(4);
    const merged = { ...c0, merges: { '丙 課': '丙課' } };
    expect(mergeSuggestions(s, merged)).toEqual([]);
    expect(courseNames(s, merged)).toHaveLength(3);
    expect(mergeSuggestions(s, { ...c0, declined: ['丙 課'] })).toEqual([]);
  });

  it('填答者依座號排序，排除的列不算，志願套用合併', () => {
    const s = session({ excluded: [0] });
    const c = { ...emptyCourseState(), merges: { '丙 課': '丙課' }, priority: ['5'] };
    const { list, people } = courseApplicants(s, c);
    expect(list.map((a) => a.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(personLabel(people.get('5'))).toBe('06 己');
    expect(list.find((a) => a.id === '5')?.prefs).toEqual(['乙課', '甲課', '丙課']);
    expect(list.find((a) => a.id === '5')?.priority).toBe(true);
    expect(list.find((a) => a.id === '3')?.prefs).toEqual([]);
  });

  it('提示：名額沒填、全 0、最少大於名額、總名額不足', () => {
    const s = session();
    const c = { ...emptyCourseState(), merges: { '丙 課': '丙課' } };
    expect(cannotRun(courseIssues(s, c))).toContain('沒填名額');
    expect(cannotRun(courseIssues(s, withCaps(c, { 甲課: '0', 乙課: '0', 丙課: '0' })))).toContain('都是 0');
    expect(cannotRun(courseIssues(s, withCaps(c, { 甲課: '2', 乙課: '2', 丙課: '1' }, { 丙課: '3' })))).toContain('最少開班');
    const ok = courseIssues(s, withCaps(c, { 甲課: '2', 乙課: '2', 丙課: '1' }));
    expect(cannotRun(ok)).toBeNull();
    expect(ok.shortfall).toBe(1);
    expect(courseList(s, withCaps(c, { 甲課: '2', 乙課: '2', 丙課: '1' }, { 乙課: '2' })).find((x) => x.name === '乙課')?.minSize).toBe(2);
  });

  it('分配：同資料同種子結果相同；名額限制；手動移動不改原結果', () => {
    const s = session();
    const c = runAllocation(s, withCaps({ ...emptyCourseState(), seed: 'seed-1', merges: { '丙 課': '丙課' } }, { 甲課: '2', 乙課: '2', 丙課: '1' }));
    const again = runAllocation(s, c);
    expect(again.result).toEqual(c.result);
    const filled = (name: string) => c.result!.filter((a) => a.course === name).length;
    expect(filled('甲課')).toBeLessThanOrEqual(2);
    expect(filled('乙課')).toBeLessThanOrEqual(2);
    expect(filled('丙課')).toBeLessThanOrEqual(1);
    expect(c.result!.find((a) => a.id === '3')?.reason).toBe('noPrefs');
    expect(resultStale(s, c)).toBe(false);
    expect(resultStale(session({ excluded: [1] }), c)).toBe(true);
    const moved = moveTo(s, c, '3', '甲課');
    expect(moved.result!.find((a) => a.id === '3')).toMatchObject({ course: '甲課', manual: true });
    expect(c.result!.find((a) => a.id === '3')?.course).toBeNull();
  });

  it('存檔：序列化後讀回一樣；壞檔欄位退回預設', () => {
    const c = runAllocation(session(), withCaps({ ...emptyCourseState(), seed: 'x', priority: ['1'], fixed: true }, { 甲課: '3', 乙課: '3', 丙課: '3', '丙 課': '1' }));
    expect(parseCourse(serializeCourse(c))).toEqual(c);
    const bad = parseCourse('{"capacity":{"a":1},"result":"x","seed":""}');
    expect(bad.capacity).toEqual({});
    expect(bad.result).toBeNull();
    expect(bad.seed).not.toBe('');
  });

  it('台北時間格式', () => {
    expect(stampTaipei('2026-11-01T06:20:00.000Z')).toBe('2026/11/01 14:20');
    expect(stampTaipei(null)).toBe('');
  });
});

describe('選課分組輸出', () => {
  const s = session();
  const c = runAllocation(s, withCaps({ ...emptyCourseState(), seed: 's9', merges: { '丙 課': '丙課' } }, { 甲課: '2', 乙課: '2', 丙課: '1' }, { 丙課: '1' }));
  const s2 = { ...s, course: c };

  it('分組名單：總表加每課一張加分配紀錄', () => {
    const sheets = listSheets(s2);
    expect(sheets.map((x) => x.name).sort()).toEqual(['總表', '甲課', '乙課', '丙課', '分配紀錄'].sort());
    expect(sheets[0]!.rows).toHaveLength(1 + 6);
    const seed = sheets.at(-1)!.rows.find((r) => r[0] === '抽籤種子');
    expect(seed?.[1]).toBe('s9');
  });

  it('待安排：沒分到的人與原因', () => {
    const [sheet] = pendingSheets(s2);
    const pending = c.result!.filter((a) => a.course === null);
    expect(sheet!.rows).toHaveLength(1 + pending.length);
    expect(JSON.stringify(sheet!.rows)).toContain('沒填志願');
  });

  it('命中統計：第幾志願人數加待安排等於總人數', () => {
    const [hit, per] = hitSheets(s2);
    const nums = hit!.rows.slice(1, -1).map((r) => r[1] as number);
    expect(nums.reduce((a, b) => a + b, 0)).toBe(6);
    expect(JSON.stringify(per!.rows[0])).toContain('最少開班');
  });
});

describe('名單外填答者（納入）', () => {
  // 名單只有座號 1～5，己（6 號）不在名單上
  const rosterRows = [1, 2, 3, 4, 5].map((n, i) => ({ class: '', seat: String(n), name: '甲乙丙丁戊'[i]! }));

  it('有名單時，名單外的人預設不進分配；按納入後才算', () => {
    const s = session({ rosterRows });
    const c = emptyCourseState();
    expect(courseApplicants(s, c).list).toHaveLength(5);
    expect(outsideIds(s, c).size).toBe(1);
    const c2 = { ...c, included: [...outsideIds(s, c)] };
    expect(courseApplicants(s, c2).list).toHaveLength(6);
    expect(includedCount(s, c2)).toBe(1);
    expect(outsideIds(s, c2).size).toBe(0);
  });

  it('沒有名單時不影響原有行為；included 會存檔與讀回', () => {
    const s = session();
    expect(courseApplicants(s, emptyCourseState()).list).toHaveLength(6);
    const back = parseCourse(serializeCourse({ ...emptyCourseState(), included: ['5'] }));
    expect(back.included).toEqual(['5']);
    expect(parseCourse('{}').included).toEqual([]);
  });
});
