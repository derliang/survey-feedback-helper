/** 留言主題：老師自己設定「主題名稱＋關鍵詞」，留言含任一關鍵詞就歸入該主題（不使用 AI，結果可重現；稿 5f）。 */
export interface Theme {
  name: string;
  keywords: string[];
}

/** 沒有任何主題命中的留言所歸的分組名稱（畫面文字另由字串表決定，這裡只當鍵值）。 */
export const UNSORTED = '\u0000unsorted';

/** 把「用逗號、頓號、空白或換行分隔」的輸入拆成不重複的關鍵詞。 */
export function parseKeywordInput(text: string): string[] {
  return [...new Set(text.split(/[,，、;；\s]+/).map((k) => k.trim()).filter((k) => k !== ''))];
}

/** 一則留言命中的主題名稱（可同時命中多個）；比對不分英文大小寫。 */
export function themesOf(text: string, themes: readonly Theme[]): string[] {
  const t = text.toLowerCase();
  return themes.filter((th) => th.keywords.some((k) => k.trim() !== '' && t.includes(k.toLowerCase()))).map((th) => th.name);
}

export interface ThemeCount {
  name: string;
  count: number;
}

/** 各主題的留言數（含「未分類」，鍵為 UNSORTED；只在有留言未歸類時列出）。 */
export function themeCounts(texts: readonly string[], themes: readonly Theme[]): ThemeCount[] {
  const out: ThemeCount[] = themes.map((th) => ({ name: th.name, count: 0 }));
  let unsorted = 0;
  for (const text of texts) {
    const hit = themesOf(text, themes);
    if (hit.length === 0) unsorted++;
    for (const n of hit) {
      const row = out.find((r) => r.name === n);
      if (row) row.count++;
    }
  }
  if (unsorted > 0) out.push({ name: UNSORTED, count: unsorted });
  return out;
}

/** 主題設定檢查：名稱空白、名稱重複、沒有關鍵詞。回傳問題文字，空陣列代表沒問題。 */
export function validateThemes(themes: readonly Theme[]): string[] {
  const out: string[] = [];
  const names = new Set<string>();
  themes.forEach((th, i) => {
    const n = th.name.trim();
    if (n === '') out.push(`第 ${i + 1} 個主題沒有名稱`);
    else if (names.has(n)) out.push(`主題「${n}」重複`);
    names.add(n);
    if (th.keywords.length === 0) out.push(`主題「${n || i + 1}」還沒有關鍵詞`);
  });
  return out;
}

/** 讀檔用：把不明資料整理成合法的主題清單。 */
export function sanitizeThemes(v: unknown): Theme[] {
  if (!Array.isArray(v)) return [];
  const out: Theme[] = [];
  for (const x of v) {
    if (typeof x !== 'object' || x === null) continue;
    const o = x as Record<string, unknown>;
    if (typeof o.name !== 'string' || !Array.isArray(o.keywords)) continue;
    out.push({ name: o.name, keywords: o.keywords.filter((k): k is string => typeof k === 'string') });
  }
  return out;
}
