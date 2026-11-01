import { idbDelete, idbGet, idbSet } from './idb';
import type { FolderStatus, FolderStore } from './types';

// File System Access API 的最小型別（TypeScript 內建 DOM 型別未必涵蓋）
interface FileHandleLike {
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}
export interface DirHandleLike {
  name: string;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>;
  queryPermission?(d: { mode: 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?(d: { mode: 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
}

const HANDLE_KEY = 'folder';

export function fsaSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** 以資料夾代號建立儲存提供者；檔案不存在回傳 null。 */
export function storeFromHandle(dir: DirHandleLike): FolderStore {
  return {
    kind: 'folder',
    name: dir.name,
    async read(file) {
      try {
        const fh = await dir.getFileHandle(file);
        return await (await fh.getFile()).text();
      } catch (e) {
        if (e instanceof DOMException && e.name === 'NotFoundError') return null;
        throw e;
      }
    },
    async write(file, text) {
      const fh = await dir.getFileHandle(file, { create: true });
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
    },
  };
}

/** 啟動時還原：不支援、沒選過、需重新授權、已就緒。 */
export async function restoreFolder(): Promise<FolderStatus> {
  if (!fsaSupported()) return { state: 'unsupported' };
  const dir = await idbGet<DirHandleLike>(HANDLE_KEY);
  if (!dir) return { state: 'none' };
  const perm = (await dir.queryPermission?.({ mode: 'readwrite' })) ?? 'prompt';
  if (perm === 'granted') return { state: 'ready', store: storeFromHandle(dir) };
  return { state: 'needsPermission', name: dir.name };
}

/** 跳出瀏覽器的選資料夾視窗；使用者取消回傳 null。 */
export async function pickFolder(): Promise<FolderStore | null> {
  const picker = (window as unknown as { showDirectoryPicker: (o: object) => Promise<DirHandleLike> }).showDirectoryPicker;
  try {
    const dir = await picker.call(window, { id: 'sfh', mode: 'readwrite' });
    await idbSet(HANDLE_KEY, dir);
    return storeFromHandle(dir);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
}

/** 重新授權已記住的資料夾（需在使用者點擊中呼叫）。 */
export async function reauthorizeFolder(): Promise<FolderStore | null> {
  const dir = await idbGet<DirHandleLike>(HANDLE_KEY);
  if (!dir) return null;
  const perm = (await dir.requestPermission?.({ mode: 'readwrite' })) ?? 'denied';
  return perm === 'granted' ? storeFromHandle(dir) : null;
}

/** 忘記這個資料夾：只清瀏覽器裡的代號，不動資料夾內任何檔案。 */
export async function forgetFolder(): Promise<void> {
  await idbDelete(HANDLE_KEY);
}
