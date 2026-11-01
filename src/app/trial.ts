// 編輯器的「試印 PDF」：用虛構的示範資料把目前範本實際輸出成 PDF，讓老師在編輯當下就看到真正的版面。
// 重量級輸出器都在按下時才動態載入（硬規則 9）；示範資料全是虛構的，不含任何學生資料。
import type { StudentOverride } from '../editor/overrides';
import type { EditorTemplate, ReportVersion } from '../editor/types';
import type { ClassSummaryInput, PersonalFeedbackInput } from '../export';
import { classDocFromTemplate, isSummaryTemplate, personalDocFromTemplate } from './render';

export const TRIAL_PERSONAL: PersonalFeedbackInput = {
  school: '○○國中',
  className: '三年二班',
  topic: '小組報告',
  student: { seat: 6, name: '林小宇' },
  scaleMax: 5,
  items: [
    { label: '內容完整', mine: 4.5, classMean: 4.1 },
    { label: '表達清楚', mine: 4.0, classMean: 3.9 },
    { label: '團隊合作', mine: 4.5, classMean: 4.2 },
  ],
  average: { mine: 4.3, classMean: 4.07 },
  praise: ['內容整理得很清楚', '說明時很有自信'],
  advice: ['下次可以多一點圖表'],
  teacherComment: '這次的表現很穩，期待你在下次發表時更放得開。',
  stats: { rank: 3, count: 8, median: 4.1, sd: 0.31 },
  selfCompare: [
    { item: '內容完整', others: 4.5, self: 4.0 },
    { item: '表達清楚', others: 4.0, self: 4.5 },
    { item: '團隊合作', others: 4.5, self: 4.5 },
  ],
};

export const TRIAL_CLASS: ClassSummaryInput = {
  school: '○○國中',
  className: '三年二班',
  topic: '小組報告',
  items: ['內容完整', '表達清楚', '團隊合作'],
  students: [
    { seat: 1, name: '王小明', values: [4.2, 4.0, 4.4], mean: 4.2 },
    { seat: 2, name: '陳小美', values: [3.8, 4.1, 4.0], mean: 4.0 },
    { seat: 3, name: '林小宇', values: [4.5, 4.0, 4.5], mean: 4.3 },
  ],
  classMeans: [4.2, 4.0, 4.3],
  classOverall: 4.17,
};

/** 把目前的範本輸出成 PDF 位元組（缺字清單一併回傳）。 */
export async function trialPdf(t: EditorTemplate, opts: { version: ReportVersion; images?: Record<string, string>; override?: StudentOverride }): Promise<{ bytes: Uint8Array; missingChars: string[] }> {
  const ctx = { version: opts.version, ...(opts.images ? { images: opts.images } : {}), ...(opts.override ? { override: opts.override } : {}) };
  const doc = isSummaryTemplate(t) ? classDocFromTemplate(t, TRIAL_CLASS, ctx) : personalDocFromTemplate(t, TRIAL_PERSONAL, ctx);
  const { loadPdf } = await import('../export');
  const { renderPdf, loadFonts } = await loadPdf();
  const r = await renderPdf(doc, await loadFonts());
  return { bytes: r.bytes, missingChars: [...r.missingChars] };
}
