// 老師審稿：學生留言要不要放進輸出（採用／隱藏／改寫）、給每位學生的老師評語、關鍵字提醒。
// 審稿進度存在使用者選的資料夾（硬規則 6），不寫入瀏覽器儲存空間。
export type CommentState = 'pending' | 'adopt' | 'hide' | 'rewrite';

export interface Review {
  version: 1;
  /** 這份審稿屬於哪份問卷設定（對應 SavedSurvey.id）。 */
  surveyId: string;
  /** 老師按過「採用」或「隱藏」的留言；沒有紀錄就是「未審」。 */
  status: Record<string, 'adopt' | 'hide'>;
  /** 改寫後的文字（有改寫就視為採用改寫後的版本）。 */
  rewrites: Record<string, string>;
  /** 老師評語：被評對象的比對鍵 → 文字。 */
  teacher: Record<string, string>;
  keywords: string[];
}

/** 預設提醒用詞：只做字串比對，不做智慧判斷（可自訂）。 */
export const DEFAULT_KEYWORDS: readonly string[] = ['笨', '白痴', '智障', '爛', '垃圾', '討厭', '去死', '閉嘴', '很醜', '廢物'];

export function emptyReview(surveyId: string): Review {
  return { version: 1, surveyId, status: {}, rewrites: {}, teacher: {}, keywords: [...DEFAULT_KEYWORDS] };
}

export const reviewFileName = (surveyId: string): string => `審稿進度-${surveyId}.json`;

export function commentState(r: Review, key: string): CommentState {
  if (r.rewrites[key] !== undefined) return 'rewrite';
  return r.status[key] ?? 'pending';
}

/** 留言命中的提醒用詞（空陣列＝沒有）。 */
export function flaggedWords(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((k) => k.trim() !== '' && text.includes(k));
}

/**
 * 輸出時的留言文字。
 * - 隱藏 → null
 * - 老師版：未審也留（老師自己看）
 * - 學生版、家長版：只放老師採用或改寫過的（未審不放）
 */
export function finalText(r: Review, key: string, text: string, audience: 'teacher' | 'student' | 'parent'): string | null {
  const st = commentState(r, key);
  if (st === 'hide') return null;
  if (st === 'rewrite') return (r.rewrites[key] ?? '').trim() === '' ? null : (r.rewrites[key] as string);
  if (st === 'pending' && audience !== 'teacher') return null;
  return text;
}

export function setComment(r: Review, key: string, state: 'adopt' | 'hide' | 'pending'): Review {
  const status = { ...r.status };
  const rewrites = { ...r.rewrites };
  delete rewrites[key];
  if (state === 'pending') delete status[key];
  else status[key] = state;
  return { ...r, status, rewrites };
}

export function setRewrite(r: Review, key: string, text: string): Review {
  const status = { ...r.status };
  delete status[key];
  return { ...r, status, rewrites: { ...r.rewrites, [key]: text } };
}

export function setTeacher(r: Review, targetKey: string, text: string): Review {
  const teacher = { ...r.teacher };
  if (text.trim() === '') delete teacher[targetKey];
  else teacher[targetKey] = text;
  return { ...r, teacher };
}

export function setKeywords(r: Review, keywords: string[]): Review {
  return { ...r, keywords: [...new Set(keywords.map((k) => k.trim()).filter((k) => k !== ''))] };
}

/** 未審留言數與命中提醒用詞但未審的筆數。 */
export function reviewCounts(r: Review, items: { key: string; text: string }[]): { total: number; pending: number; flaggedPending: number } {
  let pending = 0;
  let flaggedPending = 0;
  for (const it of items) {
    if (commentState(r, it.key) !== 'pending') continue;
    pending++;
    if (flaggedWords(it.text, r.keywords).length > 0) flaggedPending++;
  }
  return { total: items.length, pending, flaggedPending };
}

export function serializeReview(r: Review): string {
  return JSON.stringify(r, null, 2);
}

function strMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof v === 'object' && v !== null) for (const [k, x] of Object.entries(v)) if (typeof x === 'string') out[k] = x;
  return out;
}

export function parseReview(text: string, surveyId: string): Review {
  const raw: unknown = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  if (typeof raw !== 'object' || raw === null) throw new Error('not a review file');
  const o = raw as Record<string, unknown>;
  const status: Record<string, 'adopt' | 'hide'> = {};
  for (const [k, v] of Object.entries(strMap(o.status))) if (v === 'adopt' || v === 'hide') status[k] = v;
  const keywords = Array.isArray(o.keywords) ? o.keywords.filter((k): k is string => typeof k === 'string') : [...DEFAULT_KEYWORDS];
  return { version: 1, surveyId, status, rewrites: strMap(o.rewrites), teacher: strMap(o.teacher), keywords };
}
