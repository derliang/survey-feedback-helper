import { type Cell, cellText, isBlankCell, normalizeTitle, parseNumber } from './text';

/**
 * 複選題拆分：Google 表單把多選合併成「選項A, 選項B」。
 * 有選項清單時以清單為準（選項本身含逗號也拆得對，最長的先比），清單外的殘餘文字歸 others；
 * 沒有清單時依逗號（含全形、頓號）拆。
 */
export function splitMulti(cell: Cell | undefined, options?: readonly string[]): { selected: string[]; others: string[] } {
  let rest = cellText(cell);
  if (rest === '') return { selected: [], others: [] };
  if (!options || options.length === 0) {
    const parts = rest.split(/\s*[,，、]\s*/).map((s) => s.trim()).filter((s) => s !== '');
    return { selected: [...new Set(parts)], others: [] };
  }
  const selected: string[] = [];
  for (const opt of [...options].sort((a, b) => b.length - a.length)) {
    const o = opt.trim();
    if (o === '') continue;
    const at = rest.indexOf(o);
    if (at >= 0) {
      selected.push(opt);
      rest = rest.slice(0, at) + '' + rest.slice(at + o.length);
    }
  }
  const others = rest.split(/[,，、]/).map((s) => s.trim()).filter((s) => s !== '');
  // 依選項清單原順序輸出
  selected.sort((a, b) => options.indexOf(a) - options.indexOf(b));
  return { selected, others };
}

export interface ChoiceSummary {
  /** 有作答的人數。 */
  answered: number;
  blank: number;
  counts: { option: string; count: number; share: number }[];
  /** 清單外的答案（其他）及次數。 */
  others: { text: string; count: number }[];
}

/**
 * 單選或複選題統計。share = 該選項人數 ÷ 有作答人數（複選時總和可超過 1）。
 * options 給定時 0 人的選項也列出，順序依清單；否則依出現次數排序。
 */
export function summarizeChoice(cells: readonly Cell[], opts: { multi?: boolean; options?: readonly string[] } = {}): ChoiceSummary {
  const counts = new Map<string, number>();
  const others = new Map<string, number>();
  const optionKeys = new Map((opts.options ?? []).map((o) => [normalizeTitle(o), o] as const));
  for (const o of opts.options ?? []) counts.set(o, 0);
  let answered = 0;
  let blank = 0;
  for (const cell of cells) {
    if (isBlankCell(cell)) {
      blank++;
      continue;
    }
    answered++;
    const { selected, others: extra } = opts.multi
      ? splitMulti(cell, opts.options)
      : { selected: [cellText(cell)], others: [] as string[] };
    for (const s of selected) {
      const canon = optionKeys.get(normalizeTitle(s));
      if (opts.options && canon === undefined) others.set(s, (others.get(s) ?? 0) + 1);
      else counts.set(canon ?? s, (counts.get(canon ?? s) ?? 0) + 1);
    }
    for (const s of extra) others.set(s, (others.get(s) ?? 0) + 1);
  }
  let list = [...counts].map(([option, count]) => ({ option, count, share: answered === 0 ? 0 : count / answered }));
  if (!opts.options) list = list.sort((a, b) => b.count - a.count);
  return {
    answered,
    blank,
    counts: list,
    others: [...others].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count),
  };
}

export interface LikertSummary {
  n: number;
  blank: number;
  /** 不是數字或超出範圍而未計入的筆數。 */
  invalid: number;
  mean: number | null;
  median: number | null;
  /** 母體標準差；n < 1 為 null。 */
  sd: number | null;
  min: number | null;
  max: number | null;
  /** 每個整數分的人數，從 scale.min 到 scale.max（量表寬度超過 101 格時不產生）。 */
  distribution: number[];
}

/** 量表題統計（預設 0～10）。小數分數計入平均，但不進整數分布。 */
export function summarizeLikert(cells: readonly Cell[], scale: { min: number; max: number } = { min: 0, max: 10 }): LikertSummary {
  const values: number[] = [];
  let blank = 0;
  let invalid = 0;
  for (const c of cells) {
    if (isBlankCell(c)) {
      blank++;
      continue;
    }
    const n = parseNumber(c);
    if (n === null || n < scale.min || n > scale.max) invalid++;
    else values.push(n);
  }
  const width = Math.floor(scale.max - scale.min) + 1;
  const distribution = width > 0 && width <= 101 ? Array<number>(width).fill(0) : [];
  for (const v of values) {
    if (Number.isInteger(v) && distribution.length > 0) distribution[v - scale.min] = (distribution[v - scale.min] ?? 0) + 1;
  }
  if (values.length === 0) return { n: 0, blank, invalid, mean: null, median: null, sd: null, min: null, max: null, distribution };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  return { n: values.length, blank, invalid, mean, median, sd, min: sorted[0] as number, max: sorted[sorted.length - 1] as number, distribution };
}

/** 開放題：回傳非空白的答案（保留原順序與列索引），並統計空白數。 */
export function summarizeOpen(cells: readonly Cell[]): { answers: { row: number; text: string }[]; blank: number } {
  const answers: { row: number; text: string }[] = [];
  let blank = 0;
  cells.forEach((c, row) => {
    const text = cellText(c);
    if (text === '') blank++;
    else answers.push({ row, text });
  });
  return { answers, blank };
}

export interface CrossTab {
  rowLabels: string[];
  colLabels: string[];
  /** counts[r][c]：同時選到列 r 與欄 c 的人數。 */
  counts: number[][];
  /** 任一題空白而未計入的人數。 */
  skipped: number;
}

/** 交叉分析：兩題單選的人數表。兩欄長度不同時以較短者為準。 */
export function crossTab(rowCells: readonly Cell[], colCells: readonly Cell[]): CrossTab {
  const rowLabels: string[] = [];
  const colLabels: string[] = [];
  const pairs: [number, number][] = [];
  let skipped = 0;
  const n = Math.min(rowCells.length, colCells.length);
  const idx = (labels: string[], t: string): number => {
    const i = labels.indexOf(t);
    if (i >= 0) return i;
    labels.push(t);
    return labels.length - 1;
  };
  for (let i = 0; i < n; i++) {
    const a = cellText(rowCells[i]);
    const b = cellText(colCells[i]);
    if (a === '' || b === '') {
      skipped++;
      continue;
    }
    pairs.push([idx(rowLabels, a), idx(colLabels, b)]);
  }
  const counts = rowLabels.map(() => colLabels.map(() => 0));
  for (const [r, c] of pairs) (counts[r] as number[])[c] = ((counts[r] as number[])[c] ?? 0) + 1;
  return { rowLabels, colLabels, counts, skipped };
}
