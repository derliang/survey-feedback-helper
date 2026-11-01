import { type Cell, cellText } from './text';

/** 欄位標題正規化：全半形統一、小寫，移除空白、冒號、括號與標點，保留括號內的字。 */
export function normalizeHeader(s: Cell | undefined): string {
  return cellText(s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s:()[\]{}「」『』、,。.*＊]/g, '');
}

/** 檔名比對用：去副檔名、「(回覆)」「(Responses)」「(Form Responses 1)」與多餘空白。 */
export function normalizeFileTitle(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/\.(xlsx|xls|csv)$/i, '')
    .replace(/\((回覆|responses|form responses \d*)\)/gi, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export type FieldRole =
  | 'timestamp'
  | 'respondentClass'
  | 'respondentSeat'
  | 'respondentName'
  | 'targetClass'
  | 'targetSeat'
  | 'targetName'
  | 'bookTitle'
  | 'score'
  | 'choice'
  | 'comment'
  | 'preference'
  | 'ignore';

/** 已存設定：角色 → 欄位標題（存的是老師看到的原標題）。同一角色多欄（如五題評分）存陣列。 */
export interface SavedMapping {
  [role: string]: string[];
}

export interface SavedConfig {
  id: string;
  name: string;
  /** 存檔當時的所有欄位標題，用來判斷「這份檔案之前讀過」。 */
  headers: string[];
  mapping: SavedMapping;
}

export interface Recognition {
  config: SavedConfig;
  /** 0～1，標題集合的 Jaccard 相似度。 */
  similarity: number;
  /** 標題完全一致（正規化後）。 */
  exact: boolean;
}

/** 相似度門檻：邊界條件記錄寫明「尚未驗證」，這是暫定值，由老師按確認把關。 */
export const RECOGNITION_THRESHOLD = 0.8;

export function headerSimilarity(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a.map(normalizeHeader).filter((x) => x !== ''));
  const sb = new Set(b.map(normalizeHeader).filter((x) => x !== ''));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** 找最像的已存設定；低於門檻回傳 null。同分時取先出現者。 */
export function recognizeConfig(
  headers: readonly string[],
  configs: readonly SavedConfig[],
  threshold = RECOGNITION_THRESHOLD,
): Recognition | null {
  let best: Recognition | null = null;
  for (const config of configs) {
    const similarity = headerSimilarity(headers, config.headers);
    if (similarity >= threshold && (best === null || similarity > best.similarity)) {
      best = { config, similarity, exact: similarity === 1 };
    }
  }
  return best;
}

export interface ResolvedMapping {
  /** 角色 → 欄位索引（多欄角色為陣列，依存檔順序）。 */
  columns: Record<string, number[]>;
  /** 已存設定指到、但這份檔案找不到的標題。 */
  missing: { role: string; header: string }[];
  /** 這份檔案有、設定裡沒提過的欄位索引（可能是新增的題目）。 */
  unmapped: number[];
}

/** 以標題（容忍全形半形、冒號、括號、空白）把已存對應套到這份檔案的欄位上。 */
export function resolveMapping(headers: readonly string[], mapping: SavedMapping): ResolvedMapping {
  const used = new Set<number>();
  const columns: Record<string, number[]> = {};
  const missing: { role: string; header: string }[] = [];
  for (const [role, titles] of Object.entries(mapping)) {
    columns[role] = [];
    for (const title of titles) {
      const want = normalizeHeader(title);
      const idx = headers.findIndex((h, i) => !used.has(i) && normalizeHeader(h) === want);
      if (idx < 0) missing.push({ role, header: title });
      else {
        used.add(idx);
        (columns[role] as number[]).push(idx);
      }
    }
  }
  const unmapped = headers.map((_, i) => i).filter((i) => !used.has(i));
  return { columns, missing, unmapped };
}

/** 由目前的欄位選擇建立可存的對應（索引 → 標題）。 */
export function buildMapping(headers: readonly string[], columns: Record<string, readonly number[]>): SavedMapping {
  const out: SavedMapping = {};
  for (const [role, idxs] of Object.entries(columns)) {
    out[role] = idxs.map((i) => headers[i] ?? '').filter((h) => h !== '');
  }
  return out;
}

export interface RoleSuggestion {
  index: number;
  role: FieldRole | null;
  confidence: 'high' | 'low';
}

const TARGET = /她的|他的|被回饋|被評|對象|被觀察|被推薦/;

/**
 * 依標題猜欄位用途（智慧判斷）。只猜身分、時間、書名、意見；評分欄交給老師勾選。
 * 填寫者與被評對象的區分靠「她的／他的／被回饋」等字樣。
 */
export function suggestRoles(headers: readonly string[]): RoleSuggestion[] {
  return headers.map((raw, index) => {
    const h = normalizeHeader(raw);
    const isTarget = TARGET.test(h);
    const hit = (role: FieldRole, confidence: 'high' | 'low' = 'high'): RoleSuggestion => ({ index, role, confidence });
    if (/時間戳|timestamp/.test(h)) return hit('timestamp');
    if (/班級|班別/.test(h)) return hit(isTarget ? 'targetClass' : 'respondentClass');
    if (/座號/.test(h)) return hit(isTarget ? 'targetSeat' : 'respondentSeat');
    if (/書名|書籍|書目/.test(h)) return hit('bookTitle');
    if (/姓名|名字|填寫者|被回饋者/.test(h)) return hit(isTarget ? 'targetName' : 'respondentName');
    if (/志願/.test(h)) return hit('preference', 'low');
    if (/意見|回饋|建議|心得|留言|想法/.test(h)) return hit('comment', 'low');
    return { index, role: null, confidence: 'low' };
  });
}
