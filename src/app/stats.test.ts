import { describe, expect, it } from 'vitest';
import { tableFromCsv } from '../core';
import { type StatsOpts, defaultStatsOpts, looksMulti, opinionQuestions, runFeedback, runVote } from './analysis';
import { analyzeColumns, detectScale } from './columns';
import { AUDIENCE_NAMES, classSummaryInput, opinionSheets, personalInputs, voteSheets } from './output';
import { commentState, emptyReview, finalText, flaggedWords, parseReview, reviewCounts, serializeReview, setComment, setKeywords, setRewrite, setTeacher } from './review';
import type { Session } from './store';
import { emptyCourseState } from './course-app';
import { barsSvg, columnsSvg, pairedBarsSvg, PRINT } from '../ui/chart-svg';

// 全部是虛構資料
function session(csv: string, roles: Record<string, string>, kind: Session['kind']): Session {
  const table = tableFromCsv(csv);
  const cols = analyzeColumns(table).map((c) => ({ ...c, role: (roles[c.header] ?? 'ignore') as never, confirm: false }));
  return {
    fileName: 't.csv', sourceLabel: 'Excel 檔', name: '測試問卷', table, cols, kind, kindReason: '', kindConfirmed: true,
    scale: detectScale(table, cols), scaleConfirmed: true, sheetPool: null, mappingConfirmed: true, recognition: null, surveyId: 's1', previousRows: null,
    rosterRows: null, rosterMixed: false, rosterSkipped: false, rosterName: '', resolutions: {}, excluded: [], titleMerges: {}, checkHandled: [], course: emptyCourseState(),
    demo: false,
  };
}

const FB = [
  '填寫者,被評者,內容,台風,意見',
  '王大明,林雅婷,8,9,講得很清楚',
  '陳家豪,林雅婷,6,7,你很笨',
  '林雅婷,林雅婷,10,10,',
  '林雅婷,王大明,7,8,不錯',
  '陳家豪,王大明,5,6,',
].join('\n');
const FB_ROLES = { 填寫者: 'respondentName', 被評者: 'targetName', 內容: 'score', 台風: 'score', 意見: 'comment' };

describe('報告回饋接線', () => {
  const s = session(FB, FB_ROLES, 'feedback');
  const o = defaultStatsOpts();
  it('自評不進他評平均，排除的列不計入', () => {
    const sum = runFeedback(s, o);
    const lin = sum.targets.find((t) => t.person.name === '林雅婷')!;
    expect(lin.raters).toBe(2);
    expect(lin.items[0]!.mean).toBe(7);
    expect(lin.selfScores).not.toBeNull();
    const sum2 = runFeedback({ ...s, excluded: [1] }, o);
    expect(sum2.targets.find((t) => t.person.name === '林雅婷')!.raters).toBe(1);
  });
  it('反向計分題換算', () => {
    const idx = s.cols.find((c) => c.header === '內容')!.index;
    const sum = runFeedback(s, { ...o, reversed: [idx] } as StatsOpts);
    const lin = sum.targets.find((t) => t.person.name === '林雅婷')!;
    expect(lin.items[0]!.mean).toBe(3); // 10 - 8、10 - 6 → 2、4 → 3
  });
});

describe('審稿', () => {
  it('未審只給老師版，隱藏全擋，改寫三種版本都用改寫後文字', () => {
    let r = emptyReview('s1');
    expect(finalText(r, 'f1', '原文', 'teacher')).toBe('原文');
    expect(finalText(r, 'f1', '原文', 'student')).toBeNull();
    r = setComment(r, 'f1', 'adopt');
    expect(finalText(r, 'f1', '原文', 'parent')).toBe('原文');
    r = setComment(r, 'f1', 'hide');
    expect(finalText(r, 'f1', '原文', 'teacher')).toBeNull();
    r = setRewrite(r, 'f1', '改過');
    expect(commentState(r, 'f1')).toBe('rewrite');
    expect(finalText(r, 'f1', '原文', 'student')).toBe('改過');
    r = setComment(r, 'f1', 'pending');
    expect(commentState(r, 'f1')).toBe('pending');
  });
  it('關鍵字提醒只比對字串，可自訂', () => {
    expect(flaggedWords('你很笨', ['笨', '爛'])).toEqual(['笨']);
    const r = setKeywords(emptyReview('s1'), ['  討厭 ', '討厭', '']);
    expect(r.keywords).toEqual(['討厭']);
    expect(reviewCounts(emptyReview('s1'), [{ key: 'a', text: '你很笨' }, { key: 'b', text: '好' }])).toEqual({ total: 2, pending: 2, flaggedPending: 1 });
  });
  it('存取往返', () => {
    let r = setTeacher(emptyReview('s1'), 'k', '加油');
    r = setComment(r, 'f2', 'hide');
    const back = parseReview(serializeReview(r), 's1');
    expect(back).toEqual(r);
    expect(() => parseReview('[]x', 's1')).toThrow();
  });
});

describe('輸出接線', () => {
  const s = session(FB, FB_ROLES, 'feedback');
  const summary = runFeedback(s, defaultStatsOpts());
  const raters = summary.targets.map((t) => t.person);
  it('學生版只放老師採用的留言，並遮蔽名單內的姓名', () => {
    let r = emptyReview('s1');
    r = setComment(r, 'f0', 'adopt'); // 王大明對林雅婷「講得很清楚」
    const list = personalInputs(s, summary, r, 'student', raters);
    const lin = list.find((p) => p.input.student.name === '林雅婷')!;
    expect(lin.comments).toEqual(['講得很清楚']);
    const teacher = personalInputs(s, summary, r, 'teacher', raters).find((p) => p.input.student.name === '林雅婷')!;
    expect(teacher.comments).toContain('你很笨');
    expect(personalInputs(s, summary, r, 'parent', raters)[0]!.input.items).toEqual([]);
  });
  it('摘要統計：名次、回收份數、班級中位數與標準差（母體）', () => {
    const list = personalInputs(s, summary, emptyReview('s1'), 'teacher', raters);
    for (const p of list) {
      expect(p.input.stats?.count).toBeGreaterThan(0);
      expect(p.input.stats?.median).not.toBeNull();
      expect(p.input.stats?.sd).toBeGreaterThanOrEqual(0);
    }
    expect(list.map((p) => p.input.stats?.rank).sort()).toEqual([1, 2]);
  });
  it('班級總表與標題', () => {
    const c = classSummaryInput(s, summary);
    expect(c.items).toEqual(['內容', '台風']);
    expect(c.students).toHaveLength(2);
    expect(AUDIENCE_NAMES.parent).toBe('家長版');
  });
});

describe('意見調查與票選', () => {
  it('複選自動判斷與分布', () => {
    const csv = ['喜歡的科目,滿意度,想說的', '國文,4,好', '國文，數學,5,', '數學,3,太難', '英文,x,'].join('\n');
    const s = session(csv, { 喜歡的科目: 'choice', 滿意度: 'score', 想說的: 'comment' }, 'opinion');
    const qs = opinionQuestions(s, defaultStatsOpts());
    expect(qs).toHaveLength(3);
    const choice = qs[0]!;
    expect(choice.kind === 'choice' && choice.multi).toBe(true);
    const score = qs[1]!;
    expect(score.kind === 'score' && score.stat.invalid).toBe(1);
    expect(looksMulti(['a', 'b'])).toBe(false);
    const sheets = opinionSheets(qs, emptyReview('s1'), s.scale.min);
    expect(sheets.map((x) => x.name)).toContain('開放意見');
  });
  it('票選：同人多票只算最後一張，同票可重現抽籤', () => {
    const csv = ['填寫者,班長', 'A同學,甲', 'A同學,乙', 'B同學,乙', 'C同學,甲', 'D同學,丙'].join('\n');
    const s = session(csv, { 填寫者: 'respondentName', 班長: 'choice' }, 'vote');
    const o = { ...defaultStatsOpts(), seed: 'x' };
    const v = runVote(s, o);
    const p = v.positions[0]!;
    expect(p.tally.rows.find((r) => r.name === '乙')!.votes).toBe(2);
    expect(p.tally.rows.find((r) => r.name === '甲')!.votes).toBe(1);
    expect(runVote(s, o).positions[0]!.election.elected).toEqual(p.election.elected);
    expect(voteSheets(v)[0]!.rows.length).toBe(2);
  });
});

describe('SVG 圖表', () => {
  it('產生有標籤的 SVG，文字會跳脫', () => {
    const svg = barsSvg([{ label: 'A<B', value: 3, note: '3 人' }], { title: '題目' });
    expect(svg).toContain('aria-label="題目"');
    expect(svg).toContain('A&lt;B');
    expect(columnsSvg([1, 2], ['1', '2'], { title: 'x' })).toContain('<rect');
    expect(pairedBarsSvg([{ label: 'q', a: 5, b: null }], { title: 't', max: 10, aName: 'a', bName: 'b', palette: PRINT })).toContain('#2554d8');
  });
});
