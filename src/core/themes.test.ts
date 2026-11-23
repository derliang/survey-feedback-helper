import { describe, expect, it } from 'vitest';
import { UNSORTED, parseKeywordInput, sanitizeThemes, themeCounts, themesOf, validateThemes } from './themes';

const themes = [
  { name: '戶外活動', keywords: ['戶外', '校外'] },
  { name: '時間安排', keywords: ['太趕', '時間'] },
];

describe('留言主題', () => {
  it('parseKeywordInput 以逗號、頓號、空白拆開並去重', () => {
    expect(parseKeywordInput('戶外, 校外、戶外　寫生\n野外')).toEqual(['戶外', '校外', '寫生', '野外']);
    expect(parseKeywordInput('  ')).toEqual([]);
  });
  it('themesOf 可同時命中多個主題，英文不分大小寫', () => {
    expect(themesOf('戶外活動時間太趕', themes)).toEqual(['戶外活動', '時間安排']);
    expect(themesOf('Outdoor 很棒', [{ name: 'A', keywords: ['OUTDOOR'] }])).toEqual(['A']);
    expect(themesOf('沒有相關', themes)).toEqual([]);
  });
  it('themeCounts 算各主題數，並列出未分類', () => {
    const r = themeCounts(['戶外很好', '時間太趕', '戶外時間', '其他'], themes);
    expect(r).toEqual([
      { name: '戶外活動', count: 2 },
      { name: '時間安排', count: 2 },
      { name: UNSORTED, count: 1 },
    ]);
    expect(themeCounts(['戶外'], themes).some((x) => x.name === UNSORTED)).toBe(false);
  });
  it('空關鍵詞不會命中所有留言', () => {
    expect(themesOf('任何字', [{ name: 'X', keywords: ['', ' '] }])).toEqual([]);
  });
  it('validateThemes 找出空名稱、重複與沒有關鍵詞', () => {
    expect(validateThemes(themes)).toEqual([]);
    expect(validateThemes([{ name: '', keywords: ['a'] }, { name: 'B', keywords: [] }, { name: 'B', keywords: ['x'] }]).length).toBe(3);
  });
  it('sanitizeThemes 丟掉壞資料', () => {
    expect(sanitizeThemes([{ name: 'A', keywords: ['x', 1] }, 5, { name: 3 }])).toEqual([{ name: 'A', keywords: ['x'] }]);
    expect(sanitizeThemes(null)).toEqual([]);
  });
});
