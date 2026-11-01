// 批次輸出：每位學生一個 PDF，打包成一個 zip。
import { zipSync } from 'fflate';
import type { Fonts } from '../fonts/loader';
import type { DocModel } from './model';
import { renderPdf } from './pdf';

/** 檔名清理：去掉不能用於檔名的字元與結尾的點／空白，最長 80 字。 */
export function safeFileName(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 80);
  return cleaned || '未命名';
}

/** 檔名不重複：同名加 (2)、(3)…，大小寫視為相同。 */
export function uniqueNames(names: string[], ext: string): string[] {
  const seen = new Set<string>();
  return names.map((raw) => {
    const base = safeFileName(raw);
    let out = `${base}${ext}`,
      n = 2;
    while (seen.has(out.toLowerCase())) out = `${base} (${n++})${ext}`;
    seen.add(out.toLowerCase());
    return out;
  });
}

export interface BatchItem {
  /** 檔名（不含副檔名），例如「05 王小明」。 */
  name: string;
  doc: DocModel;
}

/** 每位學生一個 PDF 的 zip。每份之間讓出執行緒，介面不會卡死；`onProgress(done, total)`。 */
export async function renderBatchZip(items: BatchItem[], fonts: Fonts, onProgress?: (done: number, total: number) => void): Promise<Uint8Array> {
  const names = uniqueNames(
    items.map((i) => i.name),
    '.pdf',
  );
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < items.length; i++) {
    files[names[i]!] = (await renderPdf(items[i]!.doc, fonts)).bytes;
    onProgress?.(i + 1, items.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  return zipSync(files, { level: 0 }); // PDF 已壓縮，zip 只打包不再壓縮
}
