import { describe, expect, it } from 'vitest';
import { tableFromCsv } from '../core';
import { consecutiveDrops, summaryFromTable, trendOf } from './trend';
import { linesSvg } from '../ui/chart-svg';

// 全部是虛構資料
const wave = (a: number, b: number): string =>
  ['我的名字,被回饋者姓名,簡報內容,台風', `王大明,林雅婷,${a},${b}`, `陳家豪,林雅婷,${a},${b}`, `林雅婷,王大明,${a},${b}`, `陳家豪,王大明,${a},${b}`].join('\n');

describe('歷次趨勢接線', () => {
  it('另一份報告回饋檔可自動算出彙整，非報告回饋型回 null', () => {
    expect(summaryFromTable(tableFromCsv(wave(8, 9)))).not.toBeNull();
    expect(summaryFromTable(tableFromCsv('代號,意見\n甲,好\n乙,不好'))).toBeNull();
  });

  it('目前問卷放最後；連續下降會被挑出來', () => {
    const w1 = summaryFromTable(tableFromCsv(wave(9, 9)))!;
    const w2 = summaryFromTable(tableFromCsv(wave(8, 9)))!;
    const w3 = summaryFromTable(tableFromCsv(wave(6, 9)))!;
    const t = trendOf([{ id: '1', label: '第一次', summary: w1 }, { id: '2', label: '第二次', summary: w2 }, { id: '3', label: '壞檔', summary: null }], { label: '這次', summary: w3 });
    expect(t.labels).toEqual(['第一次', '第二次', '這次']);
    expect(consecutiveDrops(t).map((d) => d.label)).toEqual(['簡報內容']);
    expect(t.items.find((i) => i.label === '台風')?.direction).toBe('flat');
  });

  it('折線圖在線尾標題名與分數', () => {
    const svg = linesSvg([{ label: '內容', values: [9, 8, 6] }], ['a', 'b', 'c'], { title: '圖', max: 10 });
    expect(svg).toContain('內容 6');
    expect(svg).toContain('aria-label="圖"');
  });
});
