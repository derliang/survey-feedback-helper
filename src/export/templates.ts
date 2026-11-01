// 預設範本：把統計結果（一般資料結構）排成文件模型。範本不碰統計運算，只負責呈現。
import { A4_LANDSCAPE, A4_PORTRAIT, type DocModel, type Block, contentWidth, fillVars } from './model';

const NAVY = '#1f4e79';
const fmt1 = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(1));
const signed = (n: number): string => (n >= 0 ? '+' : '') + n.toFixed(1);

export interface PersonalFeedbackInput {
  school?: string;
  className: string;
  /** 事項／課程名稱，例如「分組專題報告」。 */
  topic: string;
  student: { seat: number | string; name: string };
  scaleMax: number;
  /** 各題項：自己的他評平均與班級平均（沒有有效分數用 null）。 */
  items: { label: string; mine: number | null; classMean: number | null }[];
  /** 平均列：各題項平均後的總平均。 */
  average: { mine: number | null; classMean: number | null };
  praise: string[];
  advice: string[];
  /** 優點區塊的標題；不分優點與建議、一律放「留言」時改成「同學的留言」。 */
  praiseTitle?: string;
  teacherComment?: string;
  /** 已畫好的圖表（PNG）。 */
  chartPng?: Uint8Array;
  /** 標題、副標的範本，可含變數 {姓名}{座號}{班級}{事項}。 */
  titleTemplate?: string;
}

/** 個人回饋單（含平均列）。 */
export function personalFeedbackDoc(inp: PersonalFeedbackInput): DocModel {
  const v = { 姓名: inp.student.name, 座號: inp.student.seat, 班級: inp.className, 事項: inp.topic };
  const page = A4_PORTRAIT;
  const w = contentWidth(page);
  const widths = [w - 100 * 2 - 57.58, 100, 100, 57.58];
  const rows = inp.items.map((it) => [
    it.label,
    fmt1(it.mine),
    fmt1(it.classMean),
    it.mine !== null && it.classMean !== null ? signed(it.mine - it.classMean) : '—',
  ]);
  rows.push([
    '平均',
    fmt1(inp.average.mine),
    fmt1(inp.average.classMean),
    inp.average.mine !== null && inp.average.classMean !== null ? signed(inp.average.mine - inp.average.classMean) : '—',
  ]);
  const blocks: Block[] = [
    { type: 'heading', text: fillVars(inp.titleTemplate ?? '{姓名} 的{事項}回饋單', v), size: 22, color: NAVY, after: 4 },
    { type: 'text', text: fillVars('{班級} {座號} 號｜{事項}', v), size: 11, color: '#5b6b7b', after: 12 },
    {
      type: 'text',
      text: `同學們這次給了你平均 ${fmt1(inp.average.mine)} 分（滿分 ${inp.scaleMax} 分），班級平均為 ${fmt1(inp.average.classMean)} 分。以下是各向度的表現與同學們的留言。`,
      size: 11,
      color: '#222222',
      after: 10,
    },
    { type: 'heading', text: '各向度評分', size: 14, color: NAVY, before: 6, after: 6 },
    {
      type: 'table',
      widths,
      header: ['向度', '你的平均', '班級平均', '差距'],
      rows,
      emphasisRows: [rows.length - 1],
      align: ['left', 'center', 'center', 'center'],
      rowH: 24,
      size: 10.5,
      after: 12,
    },
  ];
  if (inp.chartPng) blocks.push({ type: 'image', png: inp.chartPng, w: 440, h: 190, after: 12 });
  if (inp.praise.length) {
    blocks.push({ type: 'heading', text: inp.praiseTitle ?? '同學的優點回饋', size: 14, color: NAVY, before: 6, after: 6 });
    blocks.push({ type: 'bullets', items: inp.praise, size: 11, after: 10 });
  }
  if (inp.advice.length) {
    blocks.push({ type: 'heading', text: '同學的建議', size: 14, color: NAVY, before: 6, after: 6 });
    blocks.push({ type: 'bullets', items: inp.advice, size: 11, after: 10 });
  }
  if (inp.teacherComment) {
    blocks.push({ type: 'heading', text: '老師的話', size: 14, color: NAVY, before: 6, after: 6 });
    blocks.push({ type: 'text', text: inp.teacherComment, size: 11, color: '#222222', after: 0 });
  }
  return {
    blocks,
    footerText: [inp.school, inp.className, inp.student.name].filter(Boolean).join(' '),
    lineH: 18,
    title: fillVars('{姓名} 的{事項}回饋單', v),
  };
}

export interface ClassSummaryInput {
  school?: string;
  className: string;
  topic: string;
  /** 題項名稱（欄）。 */
  items: string[];
  /** 每位學生一列：各題項的平均與總平均。 */
  students: { seat: number | string; name: string; values: (number | null)[]; mean: number | null }[];
  /** 班級平均列。 */
  classMeans: (number | null)[];
  classOverall: number | null;
}

/** 班級總表（A4 橫式，表頭跨頁重複由輸出器處理）。 */
export function classSummaryDoc(inp: ClassSummaryInput): DocModel {
  const page = A4_LANDSCAPE;
  const w = contentWidth(page);
  const seatW = 40,
    nameW = 70,
    meanW = 56;
  const itemW = (w - seatW - nameW - meanW) / Math.max(1, inp.items.length);
  const rows = inp.students.map((s) => [String(s.seat), s.name, ...s.values.map(fmt1), fmt1(s.mean)]);
  rows.push(['', '班級平均', ...inp.classMeans.map(fmt1), fmt1(inp.classOverall)]);
  const blocks: Block[] = [
    { type: 'heading', text: `${inp.className} ${inp.topic} 班級總表`, size: 18, color: NAVY, after: 8 },
    {
      type: 'table',
      widths: [seatW, nameW, ...inp.items.map(() => itemW), meanW],
      header: ['座號', '姓名', ...inp.items, '平均'],
      rows,
      emphasisRows: [rows.length - 1],
      align: ['center', 'left', ...inp.items.map(() => 'center' as const), 'center'],
      rowH: 22,
      size: 10,
      after: 0,
    },
  ];
  return {
    blocks,
    footerText: [inp.school, inp.className, '班級總表'].filter(Boolean).join(' '),
    lineH: 16,
    page,
    title: `${inp.className} ${inp.topic} 班級總表`,
  };
}
