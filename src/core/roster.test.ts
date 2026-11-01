import { describe, expect, it } from 'vitest';
import { buildRoster, compareRoster, matchPerson, type Student } from './roster';

const roster: Student[] = [
  { class: '301', seat: 1, name: '王小明' },
  { class: '301', seat: 2, name: '李小華' },
  { class: '301', seat: 3, name: '陳大文' },
  { class: '301', seat: 4, name: '林美玲' },
];

describe('buildRoster', () => {
  it('回報座號重複、同名、座號無效、姓名空白，其餘仍建立', () => {
    const { students, problems } = buildRoster([
      { class: '301', seat: 1, name: '王小明' },
      { class: '301', seat: 1, name: '李小華' },
      { class: '301', seat: 3, name: '王小明' },
      { class: '301', seat: 'x', name: '無座號' },
      { class: '301', seat: 5, name: '  ' },
    ]);
    expect(students).toHaveLength(3);
    expect(problems.map((p) => p.kind).sort()).toEqual(['badSeat', 'blankName', 'duplicateName', 'duplicateSeat']);
  });
  it('不同班可以有同座號', () => {
    expect(buildRoster([{ class: '301', seat: 1, name: 'A' }, { class: '302', seat: 1, name: 'B' }]).problems).toEqual([]);
  });
});

describe('matchPerson', () => {
  it('姓名對、座號對', () => {
    expect(matchPerson(roster, { name: '王小明', seat: '1' }).status).toBe('ok');
  });
  it('容忍姓名空白與全形、座號 01', () => {
    expect(matchPerson(roster, { name: ' 王 小明', seat: '０１' }).status).toBe('ok');
  });
  it('姓名對、座號不同 → seatMismatch，仍指向姓名那位', () => {
    const m = matchPerson(roster, { name: '李小華', seat: 3 });
    expect(m.status).toBe('seatMismatch');
    expect(m.student?.seat).toBe(2);
  });
  it('只填姓名沒填座號 → ok', () => {
    expect(matchPerson(roster, { name: '陳大文' }).status).toBe('ok');
  });
  it('姓名打錯一個字 → unknownName 並建議最接近的人', () => {
    const m = matchPerson(roster, { name: '王小民', seat: 1 });
    expect(m.status).toBe('unknownName');
    expect(m.suggestion?.name).toBe('王小明');
  });
  it('名單沒有的人（冒名）：沒有建議時 suggestion 為座號持有者', () => {
    const m = matchPerson(roster, { name: '張三豐', seat: 4 });
    expect(m.status).toBe('unknownName');
    expect(m.suggestion?.name).toBe('林美玲');
  });
  it('完全陌生且座號也不存在 → 無建議', () => {
    const m = matchPerson(roster, { name: '張三豐', seat: 40 });
    expect(m).toEqual({ status: 'unknownName', student: null, suggestion: null });
  });
  it('只有座號 → seatOnly；座號不存在 → unknownName', () => {
    expect(matchPerson(roster, { seat: 2 }).status).toBe('seatOnly');
    expect(matchPerson(roster, { seat: 9 }).status).toBe('unknownName');
  });
  it('都沒填 → blank', () => {
    expect(matchPerson(roster, {}).status).toBe('blank');
    expect(matchPerson(roster, { name: ' ', seat: '' }).status).toBe('blank');
  });
  it('混班同名：用座號或班級分辨，否則 ambiguous', () => {
    const mixed: Student[] = [
      { class: '301', seat: 1, name: '王小明' },
      { class: '302', seat: 5, name: '王小明' },
    ];
    expect(matchPerson(mixed, { name: '王小明' }).status).toBe('ambiguous');
    expect(matchPerson(mixed, { name: '王小明', seat: 5 }).student?.class).toBe('302');
    expect(matchPerson(mixed, { name: '王小明', class: '301' }).student?.seat).toBe(1);
  });
  it('空名單：任何人都是 unknownName', () => {
    expect(matchPerson([], { name: '王小明' }).status).toBe('unknownName');
  });
});

describe('compareRoster', () => {
  it('誰沒填、重複、冒名、座號對不上同時出現', () => {
    const r = compareRoster(roster, [
      { id: 0, person: { name: '王小明', seat: 1 } },
      { id: 1, person: { name: '王小明', seat: 1 } },
      { id: 2, person: { name: '李小華', seat: 9 } },
      { id: 3, person: { name: '路人甲', seat: 7 } },
      { id: 4, person: {} },
    ]);
    expect(r.missing.map((s) => s.name)).toEqual(['陳大文', '林美玲']);
    expect(r.duplicates).toEqual([{ student: roster[0], ids: [0, 1] }]);
    expect(r.seatMismatches.map((x) => x.id)).toEqual([2]);
    expect(r.unknown.map((x) => x.id)).toEqual([3]);
    expect(r.blank).toEqual([4]);
  });
  it('座號對不上的人仍算已填（不在 missing）', () => {
    const r = compareRoster(roster, [{ id: 'a', person: { name: '李小華', seat: 4 } }]);
    expect(r.missing.map((s) => s.name)).not.toContain('李小華');
  });
  it('空回覆：全班都沒填；空名單：沒有 missing', () => {
    expect(compareRoster(roster, []).missing).toHaveLength(4);
    expect(compareRoster([], [{ id: 1, person: { name: 'x' } }]).missing).toEqual([]);
  });
});
