/** 觸控裝置（手機、平板）：沒有 File System Access，保存改走系統分享選單的「儲存到檔案」。 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints ?? 0) > 1;
  } catch {
    return false;
  }
}

export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

type ShareNav = Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };

/** 這台裝置能把這個檔案送到分享選單嗎（先偵測 files 支援）。 */
export function canShareFile(file: File): boolean {
  const nav = navigator as ShareNav;
  try {
    return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * 保存一個檔案：觸控裝置優先開分享選單（可選「儲存到檔案」），不支援或失敗就退回下載。
 * 必須在點擊事件裡直接呼叫（瀏覽器要求使用者操作）。桌機一律下載，行為不變。
 */
export async function saveFile(
  fileName: string,
  data: string | Uint8Array,
  mime: string,
  download: () => void,
): Promise<SaveResult> {
  if (isTouchDevice()) {
    const blobPart = data as BlobPart;
    const file = new File([blobPart], fileName, { type: mime });
    if (canShareFile(file)) {
      try {
        await (navigator as ShareNav).share?.({ files: [file], title: fileName });
        return 'shared';
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
        // 其他錯誤（例如分享被系統拒絕）退回下載
      }
    }
  }
  download();
  return 'downloaded';
}
