import { type Cell, cellText } from './text';

/** 一列資料的指紋（雜湊字串）。設定檔只存指紋，不存學生資料（硬規則 5、6）。 */
export function rowFingerprint(row: readonly Cell[]): string {
  const norm = row.map((c) => (c instanceof Date ? c.toISOString() : typeof c === 'number' ? String(c) : cellText(c).normalize('NFKC')));
  return cyrb53(JSON.stringify(norm));
}

/** cyrb53：53 位元非加密雜湊，足以區分資料列。 */
function cyrb53(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export interface ReadDiff {
  /** 第一次讀（沒有上次記錄）。 */
  firstRead: boolean;
  previousCount: number;
  currentCount: number;
  /** 比上次多的筆數（新增）。 */
  added: number;
  /** 上次有、這次沒有或被改過的筆數；大於 0 要提醒老師來源被修改或刪除。 */
  removed: number;
  /** 這次資料中屬於新增的列索引（供「只看新增」）。 */
  newRowIndices: number[];
  /** 給畫面的標示，例如「比上次多 12 筆」；沒有新增為 null。 */
  label: string | null;
}

/**
 * 累積讀取的差異：用指紋多重集合比對（同樣內容的兩列各算一筆），
 * 不依賴列順序，來源在中間插列或重新排序也算得對。
 * 統計一律用全部資料；newRowIndices 只用來切換「只看新增」。
 */
export function diffAccumulated(previous: readonly string[] | null, currentRows: readonly (readonly Cell[])[]): ReadDiff {
  const current = currentRows.map(rowFingerprint);
  if (previous === null) {
    return { firstRead: true, previousCount: 0, currentCount: current.length, added: 0, removed: 0, newRowIndices: [], label: null };
  }
  const remaining = new Map<string, number>();
  for (const f of previous) remaining.set(f, (remaining.get(f) ?? 0) + 1);
  const newRowIndices: number[] = [];
  current.forEach((f, i) => {
    const n = remaining.get(f) ?? 0;
    if (n > 0) remaining.set(f, n - 1);
    else newRowIndices.push(i);
  });
  let removed = 0;
  for (const n of remaining.values()) removed += n;
  const added = newRowIndices.length;
  return {
    firstRead: false,
    previousCount: previous.length,
    currentCount: current.length,
    added,
    removed,
    newRowIndices,
    label: added > 0 ? `比上次多 ${added} 筆` : null,
  };
}
