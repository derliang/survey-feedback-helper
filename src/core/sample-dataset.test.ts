import { describe, expect, it } from 'vitest';
import { buildSampleDataset, SAMPLE_HEADERS } from './sample-dataset';
import { buildRoster } from './roster';
import { personKey } from './check';
import { findPossibleNames } from './possible-names';
import { normalizeName } from './text';

describe('buildSampleDataset', () => {
  const d = buildSampleDataset();
  const col = (name: string) => d.responseTable.headers.indexOf(name);

  it('同 seed 同結果、不同 seed 分數不同；名單無問題', () => {
    expect(buildSampleDataset({ seed: 'a' })).toEqual(buildSampleDataset({ seed: 'a' }));
    expect(buildSampleDataset({ seed: 'a' }).responseTable).not.toEqual(buildSampleDataset({ seed: 'b' }).responseTable);
    expect(buildRoster(d.roster).problems).toEqual([]);
    expect(d.rosterTable.rows).toHaveLength(12);
  });
  it('每列欄數與標題一致；量表 0～10，只有刻意放入的超出範圍', () => {
    const w = d.responseTable.headers.length;
    expect(d.responseTable.rows.every((r) => r.length === w)).toBe(true);
    const cols = SAMPLE_HEADERS.items.map(col);
    const bad = d.responseTable.rows.flatMap((r, i) => (cols.some((c) => typeof r[c] === 'number' && ((r[c] as number) < 0 || (r[c] as number) > 10)) ? [i] : []));
    expect(bad).toEqual(d.planted.filter((p) => p.kind === 'scoreOutOfRange').map((p) => p.row));
  });
  it('刻意問題都在，且對照名單確實對不上', () => {
    const kinds = new Set(d.planted.map((p) => p.kind));
    for (const k of ['seatMismatch', 'nameTypo', 'bookVariant', 'selfEvaluation', 'scoreOutOfRange', 'duplicate', 'outsideNameComment', 'blankScore'])
      expect(kinds.has(k as never)).toBe(true);
    const keys = new Set(d.roster.map((s) => personKey(s)));
    const typo = d.planted.find((p) => p.kind === 'nameTypo')!;
    const row = d.responseTable.rows[typo.row]!;
    expect(keys.has(personKey({ class: row[col(SAMPLE_HEADERS.raterClass)], name: row[col(SAMPLE_HEADERS.raterName)] }))).toBe(false);
    const seat = d.planted.find((p) => p.kind === 'seatMismatch')!;
    expect(d.responseTable.rows[seat.row]![col(SAMPLE_HEADERS.raterSeat)]).toBe(99);
    const self = d.planted.find((p) => p.kind === 'selfEvaluation')!;
    const sr = d.responseTable.rows[self.row]!;
    expect(sr[col(SAMPLE_HEADERS.raterName)]).toBe(sr[col(SAMPLE_HEADERS.targetName)]);
  });
  it('書名至少有 5 種寫法', () => {
    const books = new Set(d.planted.filter((p) => p.kind === 'bookVariant').map((p) => d.responseTable.rows[p.row]![col(SAMPLE_HEADERS.book)]));
    expect(books.size).toBeGreaterThanOrEqual(5);
  });
  it('留言：名單外人名被偵測，名單內無誤報', () => {
    const comments = d.planted.filter((p) => p.kind === 'outsideNameComment').map((p) => String(d.responseTable.rows[p.row]![col(SAMPLE_HEADERS.comment)]));
    const known = d.roster.map((s) => normalizeName(s.name));
    const flagged = comments.map((c) => findPossibleNames(c, { knownNames: known }).length > 0);
    expect(flagged).toEqual([true, true, false, true]);
  });
  it('人數可調且有下限', () => {
    expect(buildSampleDataset({ students: 3 }).roster).toHaveLength(6);
    expect(buildSampleDataset({ students: 20 }).roster).toHaveLength(20);
  });
});
