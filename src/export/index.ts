// 輸出器的唯一入口。這裡只有型別與「延遲載入函式」：應用程式一律從這裡取用，
// 重量級模組（pdf-lib、docx、HarfBuzz、字型）都在按下輸出時才動態 import，不得進首頁 bundle（硬規則 9）。
export type { DocModel, Block, PageSetup } from './model';
export type { PersonalFeedbackInput, ClassSummaryInput } from './templates';
export type { XSheet, XCell } from './xlsx';
export type { BatchItem } from './batch';
export type { FontSource } from '../fonts/loader';
export { WORD_FONT_NOTE } from '../fonts/word-fonts';
export { registerAssetCache } from '../fonts/register-sw';

/** 範本與文件模型工具（輕量，只有純函式）。 */
export const loadTemplates = () => import('./templates');
/** xlsx 輸出（fflate，輕量）。 */
export const loadXlsx = () => import('./xlsx');
/** Word 輸出（docx 套件）。 */
export const loadDocx = () => import('./docx');
/** PDF 與批次輸出：回傳 { renderPdf, renderBatchZip, loadFonts }，字型在 loadFonts() 時才下載。 */
export const loadPdf = async () => {
  const [pdf, batch, fonts] = await Promise.all([import('./pdf'), import('./batch'), import('../fonts/loader')]);
  return { renderPdf: pdf.renderPdf, renderBatchZip: batch.renderBatchZip, loadFonts: fonts.loadFonts };
};
/** 進階區塊建構函式（標題區、摘要數字列、稱讚提示、自評對照表、多欄；純函式，輕量）。 */
export * as advanced from './advanced';
export type { ColumnsBlock, HeroBlock, StatsBlock, CalloutBlock, PageDeco } from './model';
/** 桌機備用：瀏覽器列印（docToHtml 純函式、printDoc 開列印視窗）。 */
export const loadPrint = () => import('./print');
