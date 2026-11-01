// 復原／重做：存快照（範本是不可變的，快照只是參照，不複製）。
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** 上一次記錄的合併鍵，連續同鍵（例如同一個文字框打字）合成一步。 */
  key?: string;
}

export const LIMIT = 100;

export const createHistory = <T,>(initial: T): History<T> => ({ past: [], present: initial, future: [] });

/** 記錄新狀態。相同物件（沒有實際變動）不記；mergeKey 與上一步相同則合併。 */
export function commit<T>(h: History<T>, next: T, mergeKey?: string): History<T> {
  if (next === h.present) return h;
  if (mergeKey && h.key === mergeKey) return { ...h, present: next, future: [] };
  const past = [...h.past, h.present];
  if (past.length > LIMIT) past.shift();
  return { past, present: next, future: [], key: mergeKey };
}

export const canUndo = <T,>(h: History<T>): boolean => h.past.length > 0;
export const canRedo = <T,>(h: History<T>): boolean => h.future.length > 0;

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const past = h.past.slice(0, -1);
  return { past, present: h.past[h.past.length - 1]!, future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  const [present, ...future] = h.future as [T, ...T[]];
  return { past: [...h.past, h.present], present, future };
}
