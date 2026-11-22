import { describe, expect, it } from 'vitest';
import { DEFAULT_VOTE_RULES, tableFromCsv } from '../core';
import { type StatsOpts, blankColumns, defaultStatsOpts, multiElected, looksMulti, opinionQuestions, runFeedback, runVote, voteGuardPending } from './analysis';
import { analyzeColumns, detectScale } from './columns';
import { AUDIENCE_NAMES, classSummaryInput, opinionReport, opinionSheets, personalInputs, voteReport, voteSheets } from './output';
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
    // #134：複選題的摘要與 Word/PDF 都要說明比例加總可超過 100%
    expect(JSON.stringify(sheets[0]!.rows)).toContain('加總可能超過 100%');
    expect(JSON.stringify(opinionReport(s, qs, emptyReview('s1')))).toContain('加總可能超過 100%');
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

describe('票選防弊與計票規則（#175）', () => {
  const head = '時間戳記,填寫者,班長';
  it('每人每職位限投一票：複選的該職位視為無效；關閉後照舊', () => {
    const csv = [head, '2026/10/01 10:00:00,甲,乙、丙', '2026/10/01 10:01:00,丁,乙'].join('\n');
    const s = session(csv, { 時間戳記: 'timestamp', 填寫者: 'respondentName', 班長: 'choice' }, 'vote');
    const on = runVote(s, defaultStatsOpts()).positions[0]!;
    expect(on.multiPick).toBe(1);
    expect(on.tally.rows.map((r) => [r.name, r.votes])).toEqual([['乙', 1]]);
    const off = runVote(s, { ...defaultStatsOpts(), voteRules: { ...DEFAULT_VOTE_RULES, oneVote: false } }).positions[0]!;
    expect(off.multiPick).toBe(0);
  });
  it('逐張覆寫與閘門：有可疑票且未確認時待決定，確認後解除', () => {
    const csv = [head, '2026/10/01 10:00:00,甲,甲', '2026/10/01 10:01:00,乙,甲'].join('\n');
    const s = session(csv, { 時間戳記: 'timestamp', 填寫者: 'respondentName', 班長: 'choice' }, 'vote');
    const o = defaultStatsOpts();
    const v = runVote(s, o);
    expect(voteGuardPending(v, o)).toEqual(['self']);
    expect(voteGuardPending(v, { ...o, guardDone: ['self'] })).toEqual([]);
    const v2 = runVote(s, { ...o, ballotOverrides: { 0: false } });
    expect(v2.positions[0]!.tally.rows[0]).toMatchObject({ name: '甲', votes: 1 });
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

describe('整欄空白的欄位提示（Issue #94）', () => {
  const csv = ['時間戳記,滿意度,建議', '2026-10-10,,', '2026-10-11,,希望多做實驗'].join('\n');
  it('沒被當成題型、整欄沒人填的欄位會列出；有人填的不列', () => {
    const s = session(csv, { 建議: 'comment' }, 'opinion');
    expect(blankColumns(s).map((c) => c.header)).toEqual(['滿意度']);
    expect(opinionQuestions(s, defaultStatsOpts()).map((q) => q.col.header)).toEqual(['建議']);
  });
  it('被排除的列不算：只剩空白的列時整欄視為空白', () => {
    const s = session(['滿意度,建議', '4,好', ',有意見', '5,棒'].join('\n'), { 建議: 'comment' }, 'opinion');
    expect(blankColumns(s)).toHaveLength(0);
    expect(blankColumns({ ...s, excluded: [0, 2] }).map((c) => c.header)).toEqual(['滿意度']);
  });
});

describe('票選小問題（#150）', () => {
  it('匯出的抽籤紀錄不露出內部「|欄位序號」後綴', () => {
    const csv = ['時間戳記,填寫者,班長', '2026/10/01 10:00:00,甲,乙', '2026/10/01 10:01:00,丙,丁'].join('\n');
    const s = session(csv, { 時間戳記: 'timestamp', 填寫者: 'respondentName', 班長: 'choice' }, 'vote');
    const o = { ...defaultStatsOpts(), seed: 'draw-abc', seats: { 2: 1 } };
    const v = runVote(s, o);
    const draw = voteSheets(v)[0]!.rows[1]![2] as string;
    expect(draw).toContain('抽籤編號「draw-abc」');
    expect(draw).not.toContain('|');
  });
  it('時間戳記空白的票列入時間異常', () => {
    const csv = ['時間戳記,填寫者,班長', ',甲,乙', '2026/10/01 10:01:00,丙,丁'].join('\n');
    const s = session(csv, { 時間戳記: 'timestamp', 填寫者: 'respondentName', 班長: 'choice' }, 'vote');
    const v = runVote(s, defaultStatsOpts());
    expect(v.issues.filter((i) => i.kind === 'time').flatMap((i) => i.ballotIds)).toEqual([0]);
  });
});

describe('同一人當選多個職位提示（Issue #211）', () => {
  const pos = (label: string, elected: string[]) => ({ col: { label }, election: { elected } }) as unknown as Parameters<typeof multiElected>[0][number];
  it('列出同時當選兩個以上職位的人；各當一個職位的不列', () => {
    const r = multiElected([pos('班長', ['甲']), pos('副班長', ['甲', '乙']), pos('康樂', ['丙'])]);
    expect(r).toEqual([{ name: '甲', positions: ['班長', '副班長'] }]);
    expect(multiElected([pos('班長', ['甲']), pos('副班長', ['乙'])])).toEqual([]);
  });
  it('同一職位名單內重複姓名不算多職', () => {
    expect(multiElected([pos('班長', ['甲', '甲'])])).toEqual([]);
  });
});

describe('票選輸出不列 0 票候選人（#216）', () => {
  const csv = ['時間戳記,填寫者,班長,副班長', '2026/10/01 10:00:00,甲,乙,丙', '2026/10/01 10:01:00,丁,乙,丁', '2026/10/01 10:02:00,戊,丙,丙'].join('\n');
  const s = session(csv, { 時間戳記: 'timestamp', 填寫者: 'respondentName', 班長: 'choice', 副班長: 'choice' }, 'vote');
  const v = runVote(s, defaultStatsOpts());
  // 名單內沒人投的候選人（有名單時才會出現 0 票列）：直接補兩位虛構的 0 票列
  for (const p of v.positions) p.tally.rows.push({ rank: 9, name: '零票甲', votes: 0 } as never, { rank: 9, name: '零票乙', votes: 0 } as never);
  it('得票數工作表只列有票者，並註明其餘 0 票人數', () => {
    const det = JSON.stringify(voteSheets(v)[1]!.rows);
    expect(det).toContain('0 票，未列出');
    for (const p of v.positions) {
      const zero = p.tally.rows.filter((r) => r.votes === 0).length;
      expect(zero).toBeGreaterThan(0);
      expect(voteSheets(v)[1]!.rows.filter((r) => r[0] === p.col.label).length).toBe(p.tally.rows.length - zero + 1);
    }
  });
  it('PDF／Word 報告同樣不列 0 票者並在文字註明', () => {
    const doc = JSON.stringify(voteReport(s, v));
    expect(doc).toContain('0 票，未列出');
  });
});
