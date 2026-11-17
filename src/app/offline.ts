// 離線提示：目前有沒有網路，以及第一次快取完成時的「已可離線使用」（只提示一次，DESIGN 5.15、D52／12b）。
import { useEffect, useState } from 'preact/hooks';
import { set } from './store';
import { extra } from '../ui/strings-extra';

const READY_KEY = 'sfh-offline-ready-shown';

/** 第一次程式快取完成時呼叫；同一個瀏覽器只提示一次（只記一個旗標，不涉及任何資料）。 */
export function announceOfflineReady(): void {
  try {
    if (localStorage.getItem(READY_KEY)) return;
    localStorage.setItem(READY_KEY, '1');
  } catch {
    /* 讀寫不了就照樣提示一次 */
  }
  set({ toast: extra().offline.ready });
}

/** 目前是否離線（跟著瀏覽器的 online／offline 事件更新）。 */
export function useOffline(): boolean {
  const [off, setOff] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOff(false);
    const offFn = () => setOff(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', offFn);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', offFn);
    };
  }, []);
  return off;
}
