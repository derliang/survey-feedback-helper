/** 文字與儲存格的正規化工具（純函式，無瀏覽器相依）。 */

export type Cell = string | number | boolean | Date | null;

/** 儲存格轉成去頭尾空白的文字；null 與 undefined 為空字串。 */
export function cellText(c: Cell | undefined): string {
  if (c === null || c === undefined) return '';
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? '' : c.toISOString();
  return String(c).trim();
}

export function isBlankCell(c: Cell | undefined): boolean {
  return cellText(c) === '';
}

/** 姓名比對用：全半形統一、移除所有空白與間隔號。 */
export function normalizeName(v: Cell | undefined): string {
  return cellText(v).normalize('NFKC').replace(/[\s·・‧•]/g, '');
}

/** 座號：取第一段數字（容忍「05」「5號」「５」）；沒有數字或小於 1 回傳 null。 */
export function normalizeSeat(v: Cell | undefined): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 ? v : null;
  const m = /\d+/.exec(cellText(v).normalize('NFKC'));
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 1 ? n : null;
}

export function normalizeClass(v: Cell | undefined): string {
  return cellText(v).normalize('NFKC').replace(/\s/g, '');
}

/** 書名比對用：全半形統一、小寫，移除空白、標點與書名號。 */
export function normalizeTitle(v: Cell | undefined): string {
  return cellText(v)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s《》〈〉「」『』“”"'`~!?,.;:()[\]{}\-_—–、，。；：！？·・]/g, '');
}

export function levenshtein(a: string, b: string): number {
  const s = [...a];
  const t = [...b];
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = cur;
  }
  return prev[t.length] ?? 0;
}

/** 二字組（bigram）Dice 係數，0～1。單字元字串視為整個字串一組。 */
export function diceSimilarity(a: string, b: string): number {
  if (a === b) return a === '' ? 0 : 1;
  const grams = (x: string): Map<string, number> => {
    const chars = [...x];
    const m = new Map<string, number>();
    if (chars.length === 1) m.set(x, 1);
    for (let i = 0; i < chars.length - 1; i++) {
      const g = (chars[i] ?? '') + (chars[i + 1] ?? '');
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  let total = 0;
  for (const n of ga.values()) total += n;
  for (const n of gb.values()) total += n;
  for (const [g, n] of ga) inter += Math.min(n, gb.get(g) ?? 0);
  return total === 0 ? 0 : (2 * inter) / total;
}

/** 四捨五入到小數 1 位（避開 0.05 的浮點誤差）。 */
export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** 數值解析：接受數字與數字文字（含全形、前後空白）；其他回傳 null。 */
export function parseNumber(c: Cell | undefined): number | null {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  const t = cellText(c).normalize('NFKC');
  if (t === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t);
}

/** 解析時間戳記為「牆上時間」的毫秒（以 UTC 計，不受時區影響）。無法解析回傳 null。 */
export function parseTimestamp(c: Cell | undefined): number | null {
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? null : c.getTime();
  if (typeof c === 'number') {
    // Excel 序號（1900 日期系統）
    if (c > 20000 && c < 80000) return Math.round((c - 25569) * 86400000);
    return null;
  }
  const t = cellText(c).normalize('NFKC');
  if (t === '') return null;
  const m =
    /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})(?:[ T]+(上午|下午|AM|PM|am|pm)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(AM|PM|am|pm)?)?(?:Z)?$/.exec(
      t,
    );
  if (!m) return null;
  const [, y, mo, d, ap1, hh, mm, ss, ap2] = m;
  let hour = hh === undefined ? 0 : Number(hh);
  const min = mm === undefined ? 0 : Number(mm);
  const sec = ss === undefined ? 0 : Number(ss);
  const ap = (ap1 ?? ap2 ?? '').toLowerCase();
  if (ap === '下午' || ap === 'pm') {
    if (hour < 12) hour += 12;
  } else if ((ap === '上午' || ap === 'am') && hour === 12) hour = 0;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59 || sec > 59) return null;
  const ms = Date.UTC(Number(y), month - 1, day, hour, min, sec);
  // 擋掉 2 月 31 日這類溢位
  const back = new Date(ms);
  if (back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day) return null;
  return ms;
}
