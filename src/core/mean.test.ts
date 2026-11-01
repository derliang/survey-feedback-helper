import { describe, expect, it } from 'vitest';
import { mean, trimmedMean } from './mean';

describe('mean', () => {
  it('算出平均', () => {
    expect(mean([4, 5, 3])).toBe(4);
  });
  it('空陣列回傳 null', () => {
    expect(mean([])).toBeNull();
  });
});

describe('trimmedMean', () => {
  it('去掉最高與最低後平均', () => {
    expect(trimmedMean([1, 5, 5, 5, 10])).toBe(5);
  });
  it('不改動輸入陣列', () => {
    const input = [3, 1, 2];
    trimmedMean(input);
    expect(input).toEqual([3, 1, 2]);
  });
  it('少於 3 筆回傳 null', () => {
    expect(trimmedMean([1, 2])).toBeNull();
  });
});
