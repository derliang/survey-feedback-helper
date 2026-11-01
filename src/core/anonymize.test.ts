import { describe, expect, it } from 'vitest';
import { buildView, codeOf, deidentifySummary, pseudonymize, scrubNames } from './anonymize';
import { summarizeFeedback, type FeedbackItem, type FeedbackRecord } from './feedback';

const people = [
  { class: '301', seat: 1, name: '王小明' },
  { class: '301', seat: 2, name: '李小華' },
  { class: '301', seat: 3, name: '陳大文' },
];

describe('pseudonymize', () => {
  it('同一人同一代號；依排序編號、補零；重複與空白姓名不另編號', () => {
    const m = pseudonymize([...people, { class: '301', name: '王小明' }, { name: '  ' }, {}]);
    expect(m.table).toHaveLength(3);
    expect(m.table.map((t) => t.code)).toEqual(['S01', 'S02', 'S03']);
    expect(codeOf({ class: '301', name: '王小明' }, m)).toBe(codeOf(people[0]!, m));
    expect(codeOf({ name: '' }, m)).toBeNull();
    expect(codeOf({ class: '999', name: '路人' }, m)).toBeNull();
  });
  it('有 seed：可重現，且順序與無 seed 不同於座號排序時仍一對一', () => {
    const a = pseudonymize(people, { seed: 'abc' });
    const b = pseudonymize(people, { seed: 'abc' });
    expect(a.table.map((t) => t.person.name)).toEqual(b.table.map((t) => t.person.name));
    expect(new Set(a.table.map((t) => t.code)).size).toBe(3);
  });
  it('位數隨人數加寬、可自訂前綴；空名單', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ class: '301', name: `學生${i}` }));
    expect(pseudonymize(many, { prefix: 'X' }).table.at(-1)?.code).toBe('X120');
    expect(pseudonymize(many).table[0]?.code).toBe('S001');
    expect(pseudonymize([]).table).toEqual([]);
  });
});

describe('scrubNames', () => {
  const m = pseudonymize(people);
  it('已知姓名換代號（長名先換）；可指定取代字；單字名不處理', () => {
    expect(scrubNames('王小明講得很好，李小華補充', m)).toBe(`${codeOf(people[0]!, m)}講得很好，${codeOf(people[1]!, m)}補充`);
    expect(scrubNames('謝謝王小明', m, '某同學')).toBe('謝謝某同學');
    expect(scrubNames('', m)).toBe('');
    const one = pseudonymize([{ name: '王' }]);
    expect(scrubNames('王老師', one)).toBe('王老師');
  });
});

describe('deidentifySummary 與三種版本', () => {
  const items: FeedbackItem[] = [{ id: 'q0', label: '內容' }, { id: 'q1', label: '台風' }];
  const rec = (id: number, rater: string, target: string, scores: number[], comment = ''): FeedbackRecord => ({
    id,
    rater: { class: '301', name: rater },
    target: { class: '301', name: target },
    scores: Object.fromEntries(scores.map((s, i) => [`q${i}`, s])),
    comment,
  });
  const rows = [rec(0, '李小華', '王小明', [8, 6], '王小明很用心'), rec(1, '陳大文', '王小明', [6, 6], '加油'), rec(2, '王小明', '李小華', [7, 7], '不錯'), rec(3, '陳大文', '李小華', [5, 5], '李小華要練習')];
  const summary = summarizeFeedback(rows, items);
  const map = pseudonymize(people);
  const wang = summary.targets.find((t) => t.person.name === '王小明')!;

  it('去識別化：被評者只留代號、留言內姓名被換、不留班級座號；不改原物件', () => {
    const d = deidentifySummary(summary, map);
    const t = d.targets.find((x) => x.comments.some((c) => c.text.includes('很用心')))!;
    expect(t.person).toEqual({ name: codeOf(people[0]!, map) });
    expect(t.key).toBe(codeOf(people[0]!, map));
    expect(t.comments[0]?.text).toBe(`${t.key}很用心`);
    expect(JSON.stringify(d.targets)).not.toContain('王小明');
    expect(wang.person.name).toBe('王小明');
    expect(d.classMean).toEqual(summary.classMean);
  });
  it('名單外的被評者顯示（未編號），不洩漏原名', () => {
    const d = deidentifySummary(summarizeFeedback([rec(0, 'a', '路人甲', [5, 5])], items), map);
    expect(d.targets[0]?.person).toEqual({ name: '（未編號）' });
  });
  it('教師版完整；學生版匿名彙整無來源編號與名次；家長版精簡', () => {
    const t = buildView(wang, summary, 'teacher');
    expect(t).toMatchObject({ rank: 1, raters: 2, commentIds: [0, 1] });
    expect(t.items?.[0]).toMatchObject({ label: '內容', mean: 7 });
    const s = buildView(wang, summary, 'student', { map });
    expect(s).not.toHaveProperty('rank');
    expect(s).not.toHaveProperty('commentIds');
    expect(s.comments).toEqual(['某同學很用心', '加油']);
    expect(s.items).toHaveLength(2);
    const p = buildView(wang, summary, 'parent', { map, maxComments: 1 });
    expect(p).not.toHaveProperty('items');
    expect(p.comments).toEqual(['某同學很用心']);
    expect(p.total).toBeCloseTo(6.5);
  });
  it('showRank 讓學生版、家長版帶名次；maxComments 0；沒給 map 不遮蔽', () => {
    expect(buildView(wang, summary, 'student', { showRank: true }).rank).toBe(1);
    expect(buildView(wang, summary, 'parent', { showRank: true }).rank).toBe(1);
    expect(buildView(wang, summary, 'parent', { maxComments: 0 }).comments).toEqual([]);
    expect(buildView(wang, summary, 'student').comments[0]).toBe('王小明很用心');
  });
  it('沒有他評的被評者（只有自評）：總分 null 仍可產生各版本', () => {
    const s = summarizeFeedback([rec(0, '王小明', '王小明', [9, 9])], items);
    const t = s.targets[0]!;
    expect(buildView(t, s, 'parent')).toMatchObject({ total: null, classMean: null, comments: [] });
    expect(buildView(t, s, 'teacher').selfScores).toEqual({ q0: 9, q1: 9 });
  });
});
