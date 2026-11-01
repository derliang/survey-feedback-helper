// Word 不支援（或會改變外觀）的效果標示：編輯器在區塊與頁面上顯示，輸出前也列給老師看。
import { walk } from './ops';
import type { EditorTemplate } from './types';

export interface WordNote {
  /** 區塊 id；頁面層級用 'page'。 */
  target: string;
  label: string;
  /** 標示文字，例如「Word：轉為圖片」。 */
  note: string;
}

/** 這些圖表在 Word 轉成圖片（其餘圖表本來就是圖片）。 */
const IMAGE_ONLY_CHARTS = ['stacked', 'heatmap', 'compare'];

export function wordNotes(t: EditorTemplate): WordNote[] {
  const out: WordNote[] = [];
  const p = t.page;
  if (p.background) out.push({ target: 'page', label: '頁面背景', note: 'Word：背景色可能不顯示（需開啟「列印背景色」）' });
  if (p.frame) out.push({ target: 'page', label: '頁框', note: p.frame.rounded ? 'Word：圓角改直角' : 'Word：頁框以頁面邊框近似' });
  walk(t.blocks, (b) => {
    const label = b.label ?? b.kind;
    if (b.kind === 'columns') out.push({ target: b.id, label, note: 'Word：以表格排版，欄寬可能略有差異' });
    if (b.kind === 'text' && b.bg) out.push({ target: b.id, label, note: 'Word：底色改為段落網底，圓角改直角' });
    if (b.kind === 'data' && b.dataKind === 'chart') {
      const t2 = b.chartType ?? '';
      out.push({ target: b.id, label, note: IMAGE_ONLY_CHARTS.includes(t2) ? 'Word：轉為圖片' : 'Word：以圖片插入，無法在 Word 內編輯' });
    }
    if (b.kind === 'hero' || b.kind === 'stats' || b.kind === 'callout') out.push({ target: b.id, label, note: 'Word：色塊以表格呈現，圓角改直角' });
    if (b.kind === 'image' && b.isLogo) out.push({ target: b.id, label, note: 'Word：Logo 放在頁首' });
  });
  return out;
}
