// 內建範本：個人回饋單、班級總表。資料區塊用槽（slot）名稱，由應用層對到實際的統計結果。
import { A4_LANDSCAPE, A4_PORTRAIT } from '../export/model';
import type { EBlock, EditorTemplate } from './types';

const NAVY = '#1f4e79';

/** 資料槽名稱（應用層要提供這些）。 */
export const SLOTS = {
  scoreTable: 'scoreTable',
  chart: 'chart',
  praise: 'praise',
  advice: 'advice',
  teacherComment: 'teacherComment',
  classTable: 'classTable',
} as const;

const h = (id: string, text: string, size: number, extra: Partial<EBlock> = {}): EBlock => ({ id, kind: 'heading', text, size, color: NAVY, ...extra }) as EBlock;

export function builtinTemplates(): EditorTemplate[] {
  const personal: EditorTemplate = {
    id: 'builtin-personal',
    name: '個人回饋單',
    builtin: true,
    forKind: 'feedback',
    lineH: 18,
    page: { size: 'A4', orientation: 'portrait', mx: A4_PORTRAIT.mx, mt: A4_PORTRAIT.mt, mb: A4_PORTRAIT.mb, footerText: '{學校} {班級} {姓名}' },
    blocks: [
      h('p-title', '{姓名} 的{事項}回饋單', 22, { after: 4, label: '標題' }),
      { id: 'p-sub', kind: 'text', text: '{班級} {座號} 號｜{事項}', size: 11, color: '#5b6b7b', after: 12, label: '副標' },
      { id: 'p-intro', kind: 'text', text: '同學們這次給了你平均 {平均分} 分（滿分 {滿分} 分），班級平均為 {班級平均} 分。以下是各向度的表現與同學們的留言。', size: 11, color: '#222222', after: 10, label: '開場白' },
      h('p-h1', '各向度評分', 14, { before: 6, after: 6 }),
      { id: 'p-table', kind: 'data', slot: SLOTS.scoreTable, dataKind: 'table', after: 12, label: '評分表（含平均列）' },
      { id: 'p-chart', kind: 'data', slot: SLOTS.chart, dataKind: 'chart', chartType: 'compare', compareLine: true, after: 12, label: '對照圖' },
      h('p-h2', '同學的優點回饋', 14, { before: 6, after: 6, when: { kind: 'var', name: '有優點', op: 'nonEmpty' } }),
      { id: 'p-praise', kind: 'bullets', slot: SLOTS.praise, items: [], size: 11, after: 10, label: '優點留言', when: { kind: 'var', name: '有優點', op: 'nonEmpty' } },
      h('p-h3', '同學的建議', 14, { before: 6, after: 6, when: { kind: 'var', name: '有建議', op: 'nonEmpty' } }),
      { id: 'p-advice', kind: 'bullets', slot: SLOTS.advice, items: [], size: 11, after: 10, label: '建議留言', when: { kind: 'var', name: '有建議', op: 'nonEmpty' } },
      h('p-h4', '老師的話', 14, { before: 6, after: 6, when: { kind: 'var', name: '老師評語', op: 'nonEmpty' } }),
      { id: 'p-teacher', kind: 'text', text: '{老師評語}', size: 11, color: '#222222', after: 0, label: '老師評語', when: { kind: 'var', name: '老師評語', op: 'nonEmpty' } },
    ],
  };
  const summary: EditorTemplate = {
    id: 'builtin-class-summary',
    name: '班級總表',
    builtin: true,
    forKind: 'feedback',
    lineH: 16,
    page: { size: 'A4', orientation: 'landscape', mx: A4_LANDSCAPE.mx, mt: A4_LANDSCAPE.mt, mb: A4_LANDSCAPE.mb, footerText: '{學校} {班級} 班級總表' },
    blocks: [h('s-title', '{班級} {事項} 班級總表', 18, { after: 8, label: '標題' }), { id: 's-table', kind: 'data', slot: SLOTS.classTable, dataKind: 'table', after: 0, label: '班級總表' }],
  };
  return [personal, summary];
}
