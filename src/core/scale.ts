import { type Cell, cellText, isBlankCell, normalizeTitle, parseNumber } from './text';
import { type FeedbackScale } from './feedback';

/** 反向計分：min + max − 分數。 */
export function reverseScore(value: number, scale: FeedbackScale): number {
  return scale.min + scale.max - value;
}

/** 量表標籤：分數 → 文字（老師可自訂）。 */
export interface ScaleLabel {
  value: number;
  label: string;
}

/** 常見五點同意度（預設範本，老師可改）。 */
export const LIKERT5_AGREE: readonly ScaleLabel[] = [
  { value: 1, label: '非常不同意' },
  { value: 2, label: '不同意' },
  { value: 3, label: '普通' },
  { value: 4, label: '同意' },
  { value: 5, label: '非常同意' },
];

/** 分數轉標籤；沒有對應標籤時回傳數字字串。 */
export function labelOf(value: number | null, labels: readonly ScaleLabel[]): string {
  if (value === null) return '';
  return labels.find((l) => l.value === value)?.label ?? String(value);
}

/** 平均分轉最接近的標籤（四捨五入到最近的有標籤分數；平手取較高）。沒有標籤清單或平均為 null 回傳空字串。 */
export function nearestLabel(value: number | null, labels: readonly ScaleLabel[]): string {
  if (value === null || labels.length === 0) return '';
  let best = labels[0] as ScaleLabel;
  for (const l of labels) {
    const d = Math.abs(l.value - value);
    const bd = Math.abs(best.value - value);
    if (d < bd || (d === bd && l.value > best.value)) best = l;
  }
  return best.label;
}

/**
 * 把一格作答讀成分數：數字、數字字串，或標籤文字（忽略空白與全半形差異）。
 * 也接受「5 非常同意」這類以數字開頭的寫法。讀不出來或不在量表內為 null。
 */
export function parseScaleAnswer(cell: Cell | undefined, labels: readonly ScaleLabel[], scale: FeedbackScale): number | null {
  if (isBlankCell(cell)) return null;
  const inScale = (n: number | null): number | null => (n !== null && n >= scale.min && n <= scale.max ? n : null);
  const num = parseNumber(cell);
  if (num !== null) return inScale(num);
  const text = normalizeTitle(cellText(cell));
  const hit = labels.find((l) => normalizeTitle(l.label) === text);
  if (hit) return inScale(hit.value);
  const lead = /^\s*([0-9]+(?:\.[0-9]+)?)\b/.exec(cellText(cell));
  return lead ? inScale(Number(lead[1])) : null;
}

/** 標籤清單檢查：分數重複、標籤空白、標籤重複。回傳問題文字，空陣列代表沒問題。 */
export function validateLabels(labels: readonly ScaleLabel[]): string[] {
  const out: string[] = [];
  const values = new Set<number>();
  const names = new Set<string>();
  for (const l of labels) {
    if (values.has(l.value)) out.push(`分數 ${l.value} 重複`);
    values.add(l.value);
    const key = normalizeTitle(l.label);
    if (key === '') out.push(`分數 ${l.value} 的標籤是空白`);
    else if (names.has(key)) out.push(`標籤「${l.label}」重複`);
    names.add(key);
  }
  return out;
}
