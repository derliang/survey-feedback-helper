/** 統計核心：不依賴瀏覽器的純函式（硬規則 7）。此檔為骨架示範。 */

/** 算術平均；空陣列回傳 null，不回 NaN。 */
export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** 去掉一個最高分與一個最低分後的平均；少於 3 筆無法去極端值，回傳 null。 */
export function trimmedMean(values: readonly number[]): number | null {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return mean(sorted.slice(1, -1));
}

/**
 * 各去掉最高 k 個與最低 k 個（去極端值）。筆數 ≤ 2k 時不去除（避免把資料削光），trimmed 為 false。
 * k ≤ 0 不去除。同值依排序後位置去除，不改動輸入。
 */
export function trimExtremes(values: readonly number[], k: number): { values: number[]; trimmed: boolean } {
  if (k <= 0 || values.length <= 2 * k) return { values: [...values], trimmed: false };
  const sorted = [...values].sort((a, b) => a - b);
  return { values: sorted.slice(k, sorted.length - k), trimmed: true };
}

/** 中位數；空陣列為 null。 */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 === 1 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}
