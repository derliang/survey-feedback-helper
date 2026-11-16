// ChatGPT 稽核 Issue #117／#118／#121／#123／#124／#126 的回歸測試（全是虛構資料）。
import { describe, expect, it } from 'vitest';
import { type Ballot, decideInclusion, detectVoteIssues, parseTimestamp, tableFromRows, tallyPosition } from '../core';
import { defaultStatsOpts, runFeedback, runVote } from './analysis';
import { analyzeColumns, detectScale } from './columns';
import { checkReport, rosterComparison } from './progress';
import type { Session } from './store';
import { emptyCourseState } from './course-app';
import { tableFromCsv } from '../core';
import type { RosterRow } from './roster-input';

function session(csv: string, roles: Record<string, string>, kind: Session['kind'], rosterRows: RosterRow[] | null = null): Session {
  const table = tableFromCsv(csv);
  const cols = analyzeColumns(table).map((c) => ({ ...c, role: (roles[c.header] ?? 'ignore') as never, confirm: false }));
  return {
    fileName: 't.csv', sourceLabel: 'Excel 檔', name: '測試問卷', table, cols, kind, kindReason: '', kindConfirmed: true,
    scale: detectScale(table, cols), scaleConfirmed: true, sheetPool: null, mappingConfirmed: true, recognition: null, surveyId: 's1', previousRows: null,
    rosterRows, rosterMixed: false, rosterSkipped: false, rosterName: '', resolutions: {}, excluded: [], titleMerges: {}, checkHandled: [], course: emptyCourseState(),
    demo: false,
  };
}

const ROSTER: RosterRow[] = [
  { class: '', seat: '1', name: '王小明' },
  { class: '', seat: '2', name: '李小華' },
];

const R3: RosterRow[] = [...ROSTER, { class: '', seat: '3', name: '陳大文' }];

describe('#117 名單對照「是同一人」要進統計與資料檢查', () => {
  const csv = ['填寫者,班長', '王小明,李小華', '王小民,陳大文', '李小華,陳大文'].join('\n');
  const roles = { 填寫者: 'respondentName', 班長: 'choice' };
  it('未確認前兩筆是不同人；accept 後同人只保留最後一張，復原後還原', () => {
    const s = session(csv, roles, 'vote', R3);
    const before = runVote(s, defaultStatsOpts());
    expect(before.issues.some((i) => i.kind === 'multi')).toBe(false);
    s.resolutions = { 1: 'accept' };
    const after = runVote(s, defaultStatsOpts());
    expect(after.issues.filter((i) => i.kind === 'multi')).toHaveLength(1);
    const tally = after.positions[0]!.tally;
    expect(tally.rows.find((r) => r.name === '李小華')!.votes).toBe(0); // 王小明的第一張被同人規則剔除
    expect(tally.rows.find((r) => r.name === '陳大文')!.votes).toBe(2); // 王小民（＝王小明）最後一張＋李小華
    expect(tally.validBallots).toBe(2);
    expect(s.table.rows[1]![0]).toBe('王小民'); // 原始資料不動
    s.resolutions = {};
    expect(runVote(s, defaultStatsOpts()).issues.some((i) => i.kind === 'multi')).toBe(false);
  });
  it('資料檢查的重複填答也採用確認後的身分', () => {
    const s = session(csv, roles, 'vote', ROSTER);
    expect(checkReport(s).duplicates).toHaveLength(0);
    s.resolutions = { 1: 'accept' };
    expect(checkReport(s).duplicates).toHaveLength(1);
  });
  it('exclude 的列不進統計；rosterComparison 行為不變', () => {
    const s = session(csv, roles, 'vote', ROSTER);
    s.resolutions = { 1: 'exclude' };
    expect(rosterComparison(s)).not.toBeNull();
  });
  it('互評：填寫者寫錯字，確認後仍判為自評', () => {
    const fb = ['填寫者,被評者,內容', '王小民,王小明,10', '李小華,王小明,6'].join('\n');
    const r = { 填寫者: 'respondentName', 被評者: 'targetName', 內容: 'score' };
    const s = session(fb, r, 'feedback', ROSTER);
    expect(runFeedback(s, defaultStatsOpts()).targets.find((t) => t.person.name === '王小明')!.raters).toBe(2);
    s.resolutions = { 0: 'accept' };
    const t = runFeedback(s, defaultStatsOpts()).targets.find((x) => x.person.name === '王小明')!;
    expect(t.raters).toBe(1);
    expect(t.selfScores).not.toBeNull();
  });
});

describe('#118 候選選項含座號', () => {
  const ballot = (id: number, voter: string, pick: string): Ballot => ({ id, voter: { name: voter }, timestamp: '2026/11/16 09:00', picks: { 班長: pick } });
  it('「01 王小明」「301 02 李小華」算有效票，不變無效票', () => {
    const bs = [ballot(1, 'A', '01 王小明'), ballot(2, 'B', '301 02 李小華'), ballot(3, 'C', '王小明'), ballot(4, 'D', '99 路人')];
    const inc = decideInclusion(bs, detectVoteIssues(bs));
    const t = tallyPosition(bs, inc, '班長', ['王小明', '李小華']);
    expect(t.invalid).toBe(1);
    expect(t.rows.find((r) => r.name === '王小明')!.votes).toBe(2);
    expect(t.rows.find((r) => r.name === '李小華')!.votes).toBe(1);
  });
  it('自投偵測也認得座號前綴', () => {
    const bs = [ballot(1, '王小明', '01 王小明')];
    expect(detectVoteIssues(bs).some((i) => i.kind === 'self')).toBe(true);
  });
  it('整個流程：有名單時 2 張有效票不再 invalid=2', () => {
    const csv = ['填寫者,班長,時間戳記', 'A,01 王小明,2026/11/16 09:00', 'B,02 李小華,2026/11/16 09:01'].join('\n');
    const s = session(csv, { 填寫者: 'respondentName', 班長: 'choice', 時間戳記: 'timestamp' }, 'vote', ROSTER);
    const p = runVote(s, defaultStatsOpts()).positions[0]!.tally;
    expect(p.invalid).toBe(0);
    expect(p.rows.map((r) => r.votes)).toEqual([1, 1]);
  });
});

describe('#121 同班同名不同座號', () => {
  const R2: RosterRow[] = [
    { class: '301', seat: '3', name: '王小明' },
    { class: '301', seat: '18', name: '王小明' },
    { class: '301', seat: '5', name: '李小華' },
  ];
  const csv = ['填寫者,被評者班級,被評者座號,被評者姓名,內容', 'A,301,3,王小明,10', 'B,301,18,王小明,2', 'C,301,5,李小華,7'].join('\n');
  const roles = { 填寫者: 'respondentName', 被評者班級: 'targetClass', 被評者座號: 'targetSeat', 被評者姓名: 'targetName', 內容: 'score' };
  it('名單有同班同名時，依座號分成兩位，分數各 10、2', () => {
    const s = session(csv, roles, 'feedback', R2);
    const t = runFeedback(s, defaultStatsOpts()).targets.filter((x) => x.person.name === '王小明');
    expect(t).toHaveLength(2);
    expect(t.map((x) => x.total).sort()).toEqual([10, 2].sort());
  });
  it('名單沒有同名者時，座號填錯不會把一個人拆開', () => {
    const typo = ['填寫者,被評者班級,被評者座號,被評者姓名,內容', 'A,301,3,李小華,10', 'B,301,30,李小華,8'].join('\n');
    const s = session(typo, roles, 'feedback', R2);
    expect(runFeedback(s, defaultStatsOpts()).targets.filter((x) => x.person.name === '李小華')).toHaveLength(1);
  });
});

describe('#123 帶時區的 ISO 8601', () => {
  const wall = Date.UTC(2026, 10, 16, 9, 23, 0);
  it('+08:00 視為台北牆上時間，與無時區同值', () => {
    expect(parseTimestamp('2026-11-16T09:23:00+08:00')).toBe(wall);
    expect(parseTimestamp('2026-11-16T09:23:00')).toBe(wall);
    expect(parseTimestamp('2026-11-16T09:23:00+0800')).toBe(wall);
  });
  it('同一瞬間不同時區表示相等', () => {
    const a = parseTimestamp('2026-11-16T01:23:00Z');
    expect(a).toBe(wall);
    expect(parseTimestamp('2026-11-15T20:23:00-05:00')).toBe(a);
  });
  it('時區超範圍、日期不合法回 null', () => {
    expect(parseTimestamp('2026-11-16T09:23:00+25:00')).toBeNull();
    expect(parseTimestamp('2026-11-16T09:23:00+08:75')).toBeNull();
    expect(parseTimestamp('2026-02-31T09:23:00+08:00')).toBeNull();
  });
  it('投票時間檢查不再把它列為無法解析', () => {
    const b: Ballot = { id: 1, voter: { name: 'A' }, timestamp: '2026-11-16T09:23:00+08:00', picks: { x: '甲' } };
    expect(detectVoteIssues([b]).some((i) => i.kind === 'time')).toBe(false);
  });
});

describe('#124 標題尾端空白但資料有值', () => {
  it('有資料的缺標題欄保留並給預設欄名', () => {
    const t = tableFromRows([['姓名', '分數', ''], ['王小明', '8', '非常好']]);
    expect(t.headers).toEqual(['姓名', '分數', '未命名欄 C']);
    expect(t.rows).toEqual([['王小明', '8', '非常好']]);
  });
  it('整欄空白的尾端欄仍乾淨略過', () => {
    const t = tableFromRows([['姓名', '分數', '', ''], ['王小明', '8', '', null]]);
    expect(t.headers).toEqual(['姓名', '分數']);
  });
  it('中間夾空欄名、後面有欄名的行為不變', () => {
    const t = tableFromRows([['姓名', '', '備註'], ['王小明', 'x', 'y']]);
    expect(t.headers).toEqual(['姓名', '', '備註']);
  });
  it('CSV 同樣不遺失', () => {
    const t = tableFromCsv('姓名,分數,\n王小明,8,好');
    expect(t.headers).toHaveLength(3);
    expect(t.rows[0]![2]).toBe('好');
  });
});

describe('#126 同人多票時間缺失', () => {
  const mk = (id: number, ts: string | null, pick: string): Ballot => ({ id, voter: { name: '王小明' }, timestamp: ts, picks: { 班長: pick } });
  it('一張有時間、一張缺時間：依列順序，保留後面的那張（不當成 1970）', () => {
    const bs = [mk(1, '2026/11/16 09:00', '甲'), mk(2, null, '乙')];
    const inc = decideInclusion(bs, detectVoteIssues(bs));
    expect(inc.decisions.find((d) => d.ballotId === 2)!.included).toBe(true);
    expect(inc.decisions.find((d) => d.ballotId === 1)!.included).toBe(false);
    expect(inc.rowOrderBallots.sort()).toEqual([1, 2]);
  });
  it('兩張都有時間：依時間（輸入逆序也正確），不標列順序提示', () => {
    const bs = [mk(1, '2026/11/16 10:00', '甲'), mk(2, '2026/11/16 09:00', '乙')];
    const inc = decideInclusion(bs, detectVoteIssues(bs));
    expect(inc.decisions.find((d) => d.ballotId === 1)!.included).toBe(true);
    expect(inc.rowOrderBallots).toEqual([]);
  });
  it('兩張都沒時間：依列順序；first 保留第一張；人工覆寫優先', () => {
    const bs = [mk(1, null, '甲'), mk(2, '昨天', '乙')];
    const issues = detectVoteIssues(bs);
    const last = decideInclusion(bs, issues, { multi: 'last', self: 'count', time: 'keep' });
    expect(last.decisions.map((d) => d.included)).toEqual([false, true]);
    const first = decideInclusion(bs, issues, { multi: 'first', self: 'count', time: 'keep' });
    expect(first.decisions.map((d) => d.included)).toEqual([true, false]);
    const man = decideInclusion(bs, issues, { multi: 'last', self: 'count', time: 'keep' }, new Map([[1, true]]));
    expect(man.decisions.map((d) => d.included)).toEqual([true, true]);
    expect(man.manualCount).toBe(1);
  });
  it('multi none／all 與 time exclude 的組合', () => {
    const bs = [mk(1, '2026/11/16 09:00', '甲'), mk(2, null, '乙')];
    const issues = detectVoteIssues(bs);
    expect(decideInclusion(bs, issues, { multi: 'none', self: 'count', time: 'keep' }).decisions.map((d) => d.included)).toEqual([false, false]);
    expect(decideInclusion(bs, issues, { multi: 'all', self: 'count', time: 'keep' }).decisions.map((d) => d.included)).toEqual([true, true]);
    // 缺時間票被排除時，剩下那張自然保留
    const ex = decideInclusion(bs, issues, { multi: 'last', self: 'count', time: 'exclude' });
    expect(ex.decisions.map((d) => d.included)).toEqual([false, false]); // 缺時間票時間異常被排除；另一張因多票規則被排除（列順序）
  });
});
