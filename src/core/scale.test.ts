import { describe, expect, it } from 'vitest';
import { LIKERT5_AGREE, labelOf, nearestLabel, parseScaleAnswer, reverseScore, validateLabels } from './scale';

const scale = { min: 1, max: 5 };

describe('reverseScore', () => {
  it('1～5：1↔5、3 不變；0～10：0↔10', () => {
    expect(reverseScore(1, scale)).toBe(5);
    expect(reverseScore(3, scale)).toBe(3);
    expect(reverseScore(0, { min: 0, max: 10 })).toBe(10);
  });
});

describe('量表標籤', () => {
  it('labelOf：有標籤回標籤，沒有回數字，null 回空字串', () => {
    expect(labelOf(5, LIKERT5_AGREE)).toBe('非常同意');
    expect(labelOf(7, LIKERT5_AGREE)).toBe('7');
    expect(labelOf(null, LIKERT5_AGREE)).toBe('');
    expect(labelOf(2, [])).toBe('2');
  });
  it('nearestLabel：平均轉最近標籤，平手取較高；空清單與 null', () => {
    expect(nearestLabel(4.2, LIKERT5_AGREE)).toBe('同意');
    expect(nearestLabel(3.5, LIKERT5_AGREE)).toBe('同意');
    expect(nearestLabel(9, LIKERT5_AGREE)).toBe('非常同意');
    expect(nearestLabel(null, LIKERT5_AGREE)).toBe('');
    expect(nearestLabel(3, [])).toBe('');
  });
  it('parseScaleAnswer：數字、數字字串、標籤、「5 非常同意」', () => {
    expect(parseScaleAnswer(4, LIKERT5_AGREE, scale)).toBe(4);
    expect(parseScaleAnswer(' ４ ', LIKERT5_AGREE, scale)).toBe(4);
    expect(parseScaleAnswer('非常同意', LIKERT5_AGREE, scale)).toBe(5);
    expect(parseScaleAnswer(' 不 同意 ', LIKERT5_AGREE, scale)).toBe(2);
    expect(parseScaleAnswer('5 非常同意', LIKERT5_AGREE, scale)).toBe(5);
    expect(parseScaleAnswer('3非常', [], scale)).toBe(3);
  });
  it('parseScaleAnswer：空白、超出量表、讀不出來、標籤分數超出量表 → null', () => {
    expect(parseScaleAnswer(null, LIKERT5_AGREE, scale)).toBeNull();
    expect(parseScaleAnswer('', LIKERT5_AGREE, scale)).toBeNull();
    expect(parseScaleAnswer(6, LIKERT5_AGREE, scale)).toBeNull();
    expect(parseScaleAnswer('0', LIKERT5_AGREE, scale)).toBeNull();
    expect(parseScaleAnswer('隨便', LIKERT5_AGREE, scale)).toBeNull();
    expect(parseScaleAnswer('很好', [{ value: 9, label: '很好' }], scale)).toBeNull();
  });
  it('validateLabels：重複分數、空白標籤、重複標籤', () => {
    expect(validateLabels(LIKERT5_AGREE)).toEqual([]);
    expect(validateLabels([])).toEqual([]);
    expect(validateLabels([{ value: 1, label: 'a' }, { value: 1, label: 'b' }])).toEqual(['分數 1 重複']);
    expect(validateLabels([{ value: 1, label: ' ' }])).toEqual(['分數 1 的標籤是空白']);
    expect(validateLabels([{ value: 1, label: '好' }, { value: 2, label: '好 ' }])).toEqual(['標籤「好 」重複']);
  });
});

import { SCALE_PRESETS, sanitizeScaleLabels, scoreText } from './scale';
describe('量表標籤顯示（稿 11d）', () => {
  it('沒自訂：1～5 用同意程度預設，其他量表只顯示分數', () => {
    expect(scoreText({ min: 1, max: 5 }, 5, null)).toBe('5 非常同意');
    expect(scoreText({ min: 1, max: 7 }, 5, null)).toBe('5');
  });
  it('有自訂就用自訂，沒填的分數只顯示數字', () => {
    expect(scoreText({ min: 1, max: 5 }, 1, SCALE_PRESETS.freq)).toBe('1 從不');
    expect(scoreText({ min: 1, max: 7 }, 7, [{ value: 7, label: '極好' }])).toBe('7 極好');
    expect(scoreText({ min: 1, max: 7 }, 3, [{ value: 7, label: '極好' }])).toBe('3');
    expect(scoreText({ min: 1, max: 5 }, 2, [{ value: 2, label: '  ' }])).toBe('2');
  });
  it('三組預設各五個分數且標籤不重複', () => {
    for (const p of Object.values(SCALE_PRESETS)) expect(p.map((x) => x.value)).toEqual([1, 2, 3, 4, 5]);
  });
  it('sanitizeScaleLabels 丟掉壞資料', () => {
    expect(sanitizeScaleLabels([{ value: 1, label: 'a' }, { value: 'x' }, 3])).toEqual([{ value: 1, label: 'a' }]);
    expect(sanitizeScaleLabels('x')).toBeNull();
    expect(sanitizeScaleLabels([])).toBeNull();
  });
});
