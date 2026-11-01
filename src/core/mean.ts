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
