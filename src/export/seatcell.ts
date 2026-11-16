import type { XCell } from './xlsx';

/** 座號：純整數（沒有前導 0）存成數字，方便排序；其他寫法（01、A3）保留文字，不改動老師的原樣。 */
export function seatCell(seat: unknown): XCell {
  const t = String(seat ?? '').trim();
  if (/^(0|[1-9]\d{0,8})$/.test(t)) return Number(t);
  return { v: t, s: 'text' };
}
