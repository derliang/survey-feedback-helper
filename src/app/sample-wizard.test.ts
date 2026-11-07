import { describe, expect, it } from 'vitest';
import { buildSampleDataset, SAMPLE_HEADERS } from '../core/sample-dataset';
import { defaultStatsOpts, runFeedback } from './analysis';
import { analyzeColumns, buildCheckRecords, detectScale, inferKind, mappingProblems, personRefs } from './columns';
import { classSummaryInput, personalInputs } from './output';
import { emptyReview } from './review';
import type { Session } from './store';
import { emptyCourseState } from './course-app';

// 樣本對照：以虛構資料集（記憶體產生，不寫檔）走過「欄位對應精靈 → 統計 → 個人回饋單平均列」。
const ds = buildSampleDataset({ students: 12, seed: 'wizard' });

function sessionOf(): Session {
  const table = ds.responseTable;
  const cols = analyzeColumns(table).map((c) => (c.role === 'score' ? { ...c, confirm: false } : c));
  return {
    fileName: 's.xlsx', sourceLabel: 'Excel 檔', name: '樣本問卷', table, cols, kind: 'feedback', kindReason: '', kindConfirmed: true,
    scale: detectScale(table, cols), scaleConfirmed: true, sheetPool: null, mappingConfirmed: true, recognition: null, surveyId: 's1', previousRows: null,
    rosterRows: null, rosterMixed: false, rosterSkipped: false, rosterName: '', resolutions: {}, excluded: [], titleMerges: {}, checkHandled: [], course: emptyCourseState(),
    demo: false,
  };
}

describe('樣本對照：欄位對應精靈（填寫者／被評對象雙欄）', () => {
  const cols = analyzeColumns(ds.responseTable);
  const roleOf = (h: string) => cols.find((c) => c.header === h)?.role;
  const H = SAMPLE_HEADERS;

  it('填寫者與被評對象各自的班級、座號、姓名分得開', () => {
    expect(roleOf(H.raterClass)).toBe('respondentClass');
    expect(roleOf(H.raterSeat)).toBe('respondentSeat');
    expect(roleOf(H.raterName)).toBe('respondentName');
    expect(roleOf(H.targetClass)).toBe('targetClass');
    expect(roleOf(H.targetSeat)).toBe('targetSeat');
    expect(roleOf(H.targetName)).toBe('targetName');
    expect(roleOf(H.timestamp)).toBe('timestamp');
    expect(roleOf(H.book)).toBe('bookTitle');
  });
  it('四題 0～10 評分只靠內容猜成評分且標「請確認」；量表判為 0～10', () => {
    for (const label of H.items) expect(cols.find((c) => c.header === label)).toMatchObject({ role: 'score', confirm: true });
    expect(detectScale(ds.responseTable, cols)).toEqual({ min: 0, max: 10 });
  });
  it('判斷為報告回饋、沒有缺的對應', () => {
    expect(inferKind(cols).kind).toBe('feedback');
    expect(mappingProblems('feedback', cols)).toEqual([]);
  });
  it('每列兩組人各自取到對的值，互不混淆', () => {
    const rater = personRefs(ds.responseTable, cols, 'respondent');
    const target = personRefs(ds.responseTable, cols, 'target');
    expect(rater[0]).toMatchObject({ seat: 1, name: ds.roster[0]!.name });
    expect(target[0]).toMatchObject({ seat: 2, name: ds.roster[1]!.name });
    expect(buildCheckRecords(ds.responseTable, cols)).toHaveLength(ds.responseTable.rows.length);
  });
  it('把被評對象欄改成「略過」會被指出缺被評對象姓名', () => {
    const broken = cols.map((c) => (c.role === 'targetName' ? { ...c, role: 'ignore' as const } : c));
    expect(mappingProblems('feedback', broken).join()).toContain('被評對象姓名');
  });
});

describe('樣本對照：個人回饋單的平均列', () => {
  const s = sessionOf();
  const summary = runFeedback(s, defaultStatsOpts());
  const raters = ds.responseTable.rows.map((_, i) => personRefs(s.table, s.cols, 'respondent')[i]!);
  const list = personalInputs(s, summary, emptyReview('s1'), 'teacher', raters);

  it('每位被評對象一份，題目數＝評分欄數', () => {
    expect(list.length).toBe(summary.targets.length);
    for (const p of list) expect(p.input.items).toHaveLength(SAMPLE_HEADERS.items.length);
  });
  it('平均列＝各題平均（到小數一位）；個人平均與班級平均有值', () => {
    for (const t of summary.targets) {
      const p = list.find((x) => x.input.student.name === String(t.person.name))!;
      expect(p.input.items.map((i) => i.mine)).toEqual(t.averageRow);
      expect(p.input.average.mine).not.toBeNull();
      expect(p.input.average.classMean).not.toBeNull();
    }
  });
  it('班級總表的平均列與個人一致', () => {
    const c = classSummaryInput(s, summary);
    expect(c.items).toEqual([...SAMPLE_HEADERS.items]);
    expect(c.students).toHaveLength(summary.targets.length);
    expect(c.classMeans).toHaveLength(SAMPLE_HEADERS.items.length);
  });
});
