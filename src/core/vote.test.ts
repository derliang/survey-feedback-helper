import { describe, expect, it } from 'vitest';
import { decideInclusion, detectVoteIssues, elect, tallyPosition, DEFAULT_VOTE_RULES, type Ballot } from './vote';
import { makeSeed, seededShuffle } from './random';

const t = (min: number, sec = 0) => `2026/10/12 14:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
const ballot = (id: number, voter: string, picks: Record<string, string | null>, ts: string | null = t(id)): Ballot => ({ id, voter: { name: voter }, timestamp: ts, picks });

const base: Ballot[] = [
  ballot(0, '甲', { 班長: '丙', 副班長: '丁' }),
  ballot(1, '乙', { 班長: '丙', 副班長: '甲' }),
  ballot(2, '丙', { 班長: '丙', 副班長: '丁' }), // 自投
  ballot(3, '丁', { 班長: '甲', 副班長: '乙' }),
  ballot(4, '戊', { 班長: '甲', 副班長: '' }),
];

describe('detectVoteIssues', () => {
  it('乾淨資料無問題；空輸入無問題', () => {
    expect(detectVoteIssues([ballot(0, '甲', { 班長: '乙' })])).toEqual([]);
    expect(detectVoteIssues([])).toEqual([]);
  });
  it('多票、自投（含空白與全形差異）', () => {
    const issues = detectVoteIssues([...base, ballot(5, ' 甲 ', { 班長: '甲' }, t(5)), ballot(6, '甲', { 班長: '乙' }, t(6))]);
    expect(issues.find((i) => i.kind === 'multi')?.ballotIds).toEqual([0, 5, 6]);
    expect(issues.filter((i) => i.kind === 'self').map((i) => [i.ballotIds[0], i.detail])).toEqual([[2, '班長'], [5, '班長']]);
  });
  it('時間異常：無法解析、不在投票期間、短時間湧入', () => {
    const win = { start: Date.UTC(2026, 9, 12, 14, 0, 0), end: Date.UTC(2026, 9, 12, 14, 30, 0) };
    const bs = [
      ballot(0, 'a', { 班長: 'x' }, t(1)),
      ballot(1, 'b', { 班長: 'x' }, '亂碼'),
      ballot(2, 'c', { 班長: 'x' }, '2026/10/12 15:00:00'),
      ...[10, 11, 12, 13].map((s, i) => ballot(10 + i, `r${i}`, { 班長: 'x' }, t(20, s))),
    ];
    const issues = detectVoteIssues(bs, { window: win, burst: { count: 4, withinMs: 5000 } });
    const time = issues.filter((i) => i.kind === 'time');
    expect(time.find((i) => i.detail === 'unparsable')?.ballotIds).toEqual([1]);
    expect(time.find((i) => i.detail === 'outsideWindow')?.ballotIds).toEqual([2]);
    expect(time.find((i) => i.detail === 'burst')?.ballotIds.sort()).toEqual([10, 11, 12, 13]);
  });
  it('空白票：全部職位都沒投', () => {
    const issues = detectVoteIssues([ballot(0, '甲', { 班長: '', 副班長: null }), ballot(1, '乙', {})]);
    expect(issues.filter((i) => i.kind === 'blank').map((i) => i.ballotIds[0])).toEqual([0, 1]);
  });
});

describe('decideInclusion', () => {
  const dupe = [...base, ballot(5, '甲', { 班長: '乙', 副班長: '丁' }, t(5))];
  it('預設：同人多票只算最後一張，自投照算', () => {
    const inc = decideInclusion(dupe, detectVoteIssues(dupe), DEFAULT_VOTE_RULES);
    expect(inc.decisions.filter((d) => !d.included).map((d) => d.ballotId)).toEqual([0]);
    expect(inc.manualCount).toBe(0);
  });
  it('多票規則：first / none / all', () => {
    const issues = detectVoteIssues(dupe);
    const excluded = (multi: 'first' | 'none' | 'all') =>
      decideInclusion(dupe, issues, { ...DEFAULT_VOTE_RULES, multi }).decisions.filter((d) => !d.included).map((d) => d.ballotId);
    expect(excluded('first')).toEqual([5]);
    expect(excluded('none')).toEqual([0, 5]);
    expect(excluded('all')).toEqual([]);
  });
  it('多票以時間戳記為準而不是輸入順序', () => {
    const bs = [ballot(0, '甲', { 班長: '乙' }, t(9)), ballot(1, '甲', { 班長: '丙' }, t(1))];
    const inc = decideInclusion(bs, detectVoteIssues(bs), DEFAULT_VOTE_RULES);
    expect(inc.decisions.find((d) => d.included)?.ballotId).toBe(0);
  });
  it('自投規則：整張不算／只剔除自投那格', () => {
    const issues = detectVoteIssues(base);
    expect(decideInclusion(base, issues, { ...DEFAULT_VOTE_RULES, self: 'excludeBallot' }).decisions[2]?.included).toBe(false);
    const d = decideInclusion(base, issues, { ...DEFAULT_VOTE_RULES, self: 'excludePick' }).decisions[2];
    expect(d?.included).toBe(true);
    expect(d?.droppedPositions).toEqual(['班長']);
  });
  it('空白票一律不算；時間異常依規則', () => {
    const bs = [ballot(0, '甲', {}), ballot(1, '乙', { 班長: '丙' }, '壞')];
    const issues = detectVoteIssues(bs);
    expect(decideInclusion(bs, issues, DEFAULT_VOTE_RULES).decisions.map((d) => d.included)).toEqual([false, true]);
    expect(decideInclusion(bs, issues, { ...DEFAULT_VOTE_RULES, time: 'exclude' }).decisions.map((d) => d.included)).toEqual([false, false]);
  });
  it('逐張覆寫：與整類預設不同才算手動調整；覆寫為計入時自投整張照算', () => {
    const issues = detectVoteIssues(base);
    const rules = { ...DEFAULT_VOTE_RULES, self: 'excludePick' as const };
    const inc = decideInclusion(base, issues, rules, new Map([[2, true], [0, true], [3, false]]));
    expect(inc.manualCount).toBe(1); // 只有 3 與預設不同；0、2 覆寫值＝計入，與預設「計入」相同
    expect(inc.decisions[2]?.droppedPositions).toEqual([]);
    expect(inc.decisions[3]?.manual).toBe(true);
  });
});

describe('tallyPosition', () => {
  it('得票、同票同名次跳號、棄權', () => {
    const inc = decideInclusion(base, detectVoteIssues(base));
    const r = tallyPosition(base, inc, '班長');
    expect(r.rows).toEqual([
      { name: '丙', votes: 3, rank: 1 },
      { name: '甲', votes: 2, rank: 2 },
    ]);
    const v = tallyPosition(base, inc, '副班長');
    expect(v.abstain).toBe(1);
    expect(v.rows.map((x) => [x.name, x.votes, x.rank])).toEqual([['丁', 2, 1], ['乙', 1, 2], ['甲', 1, 2]]);
  });
  it('給候選人名單：0 票者也列出，名單外算無效票', () => {
    const bs = [ballot(0, 'a', { 班長: '甲' }), ballot(1, 'b', { 班長: '路人' })];
    const r = tallyPosition(bs, decideInclusion(bs, detectVoteIssues(bs)), '班長', ['甲', '乙']);
    expect(r.rows).toEqual([{ name: '甲', votes: 1, rank: 1 }, { name: '乙', votes: 0, rank: 2 }]);
    expect(r.invalid).toBe(1);
  });
  it('手動排除後重算票數與名次；全部排除得空表', () => {
    const issues = detectVoteIssues(base);
    const inc = decideInclusion(base, issues, DEFAULT_VOTE_RULES, new Map([[0, false], [1, false], [2, false]]));
    expect(tallyPosition(base, inc, '班長').rows).toEqual([{ name: '甲', votes: 2, rank: 1 }]);
    const none = decideInclusion(base, issues, DEFAULT_VOTE_RULES, new Map(base.map((b) => [b.id, false])));
    expect(tallyPosition(base, none, '班長')).toMatchObject({ rows: [], validBallots: 0 });
  });
  it('excludePick 只讓該職位少一票', () => {
    const inc = decideInclusion(base, detectVoteIssues(base), { ...DEFAULT_VOTE_RULES, self: 'excludePick' });
    expect(tallyPosition(base, inc, '班長').rows[0]).toEqual({ name: '丙', votes: 2, rank: 1 });
    expect(tallyPosition(base, inc, '副班長').rows[0]?.votes).toBe(2);
  });
});

describe('elect 與可重現抽籤', () => {
  const tallyOf = (votes: [string, number][]) => ({
    position: 'p',
    rows: votes.map(([name, v], i) => ({ name, votes: v, rank: i + 1 })),
    invalid: 0,
    abstain: 0,
    validBallots: 0,
  });
  it('名額邊界無同票：不抽籤', () => {
    const e = elect(tallyOf([['甲', 5], ['乙', 3], ['丙', 1]]), 2, 'seed');
    expect(e).toMatchObject({ elected: ['甲', '乙'], draw: null, tied: [] });
  });
  it('邊界同票：同一種子永遠同一結果；記錄種子與依據', () => {
    const tl = tallyOf([['甲', 5], ['乙', 3], ['丙', 3], ['丁', 3], ['戊', 1]]);
    const a = elect(tl, 2, 'abc12345');
    const b = elect(tl, 2, 'abc12345');
    expect(a).toEqual(b);
    expect(a.certain).toEqual(['甲']);
    expect(a.elected).toHaveLength(2);
    expect(a.tied).toHaveLength(3);
    expect(a.draw?.seed).toBe('abc12345');
    expect(a.draw?.order.slice().sort()).toEqual(['丁', '丙', '乙']);
    expect(a.draw?.basis).toContain('3|');
  });
  it('輸入順序不同、種子相同 → 結果相同（可重現）', () => {
    const a = elect(tallyOf([['乙', 3], ['丙', 3], ['丁', 3]]), 1, 's');
    const b = elect(tallyOf([['丁', 3], ['乙', 3], ['丙', 3]]), 1, 's');
    expect(a.elected).toEqual(b.elected);
  });
  it('不同種子可得不同順序（至少有一個種子不同）', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f'];
    const orders = new Set(['s1', 's2', 's3', 's4', 's5'].map((s) => seededShuffle(names, s).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });
  it('名額多於有票者、0 票者不當選、名額 0、空表', () => {
    expect(elect(tallyOf([['甲', 2], ['乙', 0]]), 3, 's').elected).toEqual(['甲']);
    expect(elect(tallyOf([['甲', 2]]), 0, 's').elected).toEqual([]);
    expect(elect(tallyOf([]), 1, 's').draw).toBeNull();
  });
  it('全員同票', () => {
    const e = elect(tallyOf([['甲', 1], ['乙', 1], ['丙', 1]]), 1, 'x');
    expect(e.certain).toEqual([]);
    expect(e.elected).toHaveLength(1);
  });
  it('seededShuffle 不改動輸入；makeSeed 為 8 位十六進位', () => {
    const input = [1, 2, 3];
    seededShuffle(input, 'a');
    expect(input).toEqual([1, 2, 3]);
    expect(makeSeed(() => 0.5)).toMatch(/^[0-9a-f]{8}$/);
    expect(makeSeed()).toMatch(/^[0-9a-f]{8}$/);
  });
});
