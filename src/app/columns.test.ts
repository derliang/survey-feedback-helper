import { describe, expect, it } from 'vitest';
import { tableFromCsv } from '../core';
import { analyzeColumns, detectScale, scaleSuspect, suspectScoreColumns } from './columns';

describe('疑似評分欄與量表不符的提示（#145）', () => {
  it('評分欄混了文字與越界值被判成選擇題 → 列為疑似評分欄', () => {
    const rows = ['填寫者,被評者,表達', ...Array.from({ length: 8 }, (_, i) => `甲${i},乙,${i % 2 ? '缺' : 11 + (i % 3)}`), '甲9,乙,5', '甲10,乙,6', '甲11,乙,7'];
    const table = tableFromCsv(rows.join('\n'));
    const cols = analyzeColumns(table).map((c) => (c.header === '表達' ? { ...c, role: 'choice' as const } : c));
    expect(suspectScoreColumns(table, cols).map((c) => c.header)).toEqual(['表達']);
  });
  it('真的選擇題（文字選項）不被當成評分欄', () => {
    const table = tableFromCsv(['填寫者,選擇', '甲,紅', '乙,藍', '丙,紅', '丁,綠'].join('\n'));
    const cols = analyzeColumns(table).map((c) => (c.header === '選擇' ? { ...c, role: 'choice' as const } : c));
    expect(suspectScoreColumns(table, cols)).toEqual([]);
  });
  it('0～10 預設量表但幾乎全是 1～5，只有零星 6 → 提示；確認過或真的 0～10 不提示', () => {
    const body = Array.from({ length: 40 }, (_, i) => `甲${i},乙,${(i % 5) + 1}`);
    body.push('甲x,乙,6');
    const table = tableFromCsv(['填寫者,被評者,表達', ...body].join('\n'));
    const cols = analyzeColumns(table).map((c) => (c.header === '表達' ? { ...c, role: 'score' as const } : c));
    const scale = detectScale(table, cols);
    expect(scale).toEqual({ min: 0, max: 10 });
    expect(scaleSuspect(table, cols, scale, false)).toEqual({ outliers: 1, total: 41 });
    expect(scaleSuspect(table, cols, scale, true)).toBeNull();
    const wide = tableFromCsv(['填寫者,被評者,表達', ...Array.from({ length: 20 }, (_, i) => `甲${i},乙,${(i % 10) + 1}`)].join('\n'));
    const wc = analyzeColumns(wide).map((c) => (c.header === '表達' ? { ...c, role: 'score' as const } : c));
    expect(scaleSuspect(wide, wc, detectScale(wide, wc), false)).toBeNull();
  });
});
