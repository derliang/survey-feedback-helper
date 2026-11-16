// 「有新版本」：Service Worker 新版在等待時，沒有載入資料就直接更新，有資料就請使用者先輸出再更新（DESIGN 5.15、D53）。
import { getState, set } from './store';

let apply: (() => void) | null = null;

/** 目前有沒有「換版會清掉」的內容。 */
export function hasUnsavedWork(): boolean {
  const s = getState();
  return s.session != null || s.reviewUnsaved || s.courseUnsaved || s.route === 'editor';
}

/** register-sw 發現新版在等待時呼叫。 */
export function onUpdateWaiting(applyFn: () => void): void {
  apply = applyFn;
  if (!hasUnsavedWork()) return applyFn();
  set({ updateReady: true, updateDismissed: false });
}

export function applyUpdateNow(): void {
  apply?.();
}
