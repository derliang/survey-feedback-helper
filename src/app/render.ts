// 輸出接線：把「輸出用」範本（src/editor）套上真實統計資料，編譯成 src/export 讀的 DocModel。純函式。
import { builtinTemplates, SLOTS } from '../editor/builtin';
import { compile, pageSetup, type SlotBlock } from '../editor/compile';
import type { StudentOverride } from '../editor/overrides';
import { walk } from '../editor/ops';
import type { EditorTemplate, ReportVersion } from '../editor/types';
import * as advanced from '../export/advanced';
import { contentWidth, type Block, type DocModel } from '../export/model';
import type { ClassSummaryInput, PersonalFeedbackInput } from '../export';

const fmt1 = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(1));
const signed = (n: number): string => (n >= 0 ? '+' : '') + n.toFixed(1);

/** 範本是不是「班級總表」類（含班級總表資料槽）。 */
export function isSummaryTemplate(t: EditorTemplate): boolean {
  let found = false;
  walk(t.blocks, (b) => {
    if (b.kind === 'data' && b.slot === SLOTS.classTable) found = true;
  });
  return found;
}

export interface TemplatePick {
  /** 個人回饋單用的範本。 */
  personal: EditorTemplate;
  /** 班級總表用的範本。 */
  summary: EditorTemplate;
}

/**
 * 選輸出範本：使用者在範本庫（或輸出頁）選的那份（`useId`）；選到的是班級總表類就拿來做總表，否則做個人回饋單。
 * 沒選或找不到就用內建的。
 */
export function pickTemplates(all: EditorTemplate[], useId: string | null | undefined): TemplatePick {
  const builtin = builtinTemplates();
  const chosen = useId ? all.find((t) => t.id === useId && t.forKind === 'feedback') : undefined;
  const personalList = all.filter((t) => t.forKind === 'feedback' && !isSummaryTemplate(t));
  const summaryList = all.filter((t) => t.forKind === 'feedback' && isSummaryTemplate(t));
  const personal = chosen && !isSummaryTemplate(chosen) ? chosen : (personalList.find((t) => t.id === 'builtin-personal') ?? builtin[0]!);
  const summary = chosen && isSummaryTemplate(chosen) ? chosen : (summaryList.find((t) => t.id === 'builtin-class-summary') ?? builtin[1]!);
  return { personal, summary };
}

/** 輸出頁可選的個人回饋單範本。 */
export const personalChoices = (all: EditorTemplate[]): EditorTemplate[] => all.filter((t) => t.forKind === 'feedback' && !isSummaryTemplate(t));

/** 圖片參照（資料 URL）→ PNG 位元組；不是 PNG 的略過。 */
export function dataUrlToPng(url: string | undefined): Uint8Array | undefined {
  const m = url ? /^data:image\/png;base64,(.*)$/.exec(url) : null;
  if (!m) return undefined;
  try {
    return Uint8Array.from(atob(m[1]!), (c) => c.charCodeAt(0));
  } catch {
    return undefined;
  }
}

interface CommonCtx {
  version: ReportVersion;
  school?: string;
  images?: Record<string, string>;
  override?: StudentOverride;
}

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

function scoreTable(inp: PersonalFeedbackInput, width: number): Block {
  const rows = inp.items.map((it) => [it.label, fmt1(it.mine), fmt1(it.classMean), it.mine !== null && it.classMean !== null ? signed(it.mine - it.classMean) : '—']);
  rows.push(['平均', fmt1(inp.average.mine), fmt1(inp.average.classMean), inp.average.mine !== null && inp.average.classMean !== null ? signed(inp.average.mine - inp.average.classMean) : '—']);
  const w1 = Math.min(100, width / 4);
  return {
    type: 'table',
    widths: [width - w1 * 2 - 57.58, w1, w1, 57.58],
    header: ['向度', '你的平均', '班級平均', '差距'],
    rows,
    emphasisRows: [rows.length - 1],
    align: ['left', 'center', 'center', 'center'],
    rowH: 24,
    size: 10.5,
  };
}

function classTable(inp: ClassSummaryInput, width: number): Block {
  const seatW = 40,
    nameW = 70,
    meanW = 56;
  const itemW = (width - seatW - nameW - meanW) / Math.max(1, inp.items.length);
  const rows = inp.students.map((s) => [String(s.seat), s.name, ...s.values.map(fmt1), fmt1(s.mean)]);
  rows.push(['', '班級平均', ...inp.classMeans.map(fmt1), fmt1(inp.classOverall)]);
  return {
    type: 'table',
    widths: [seatW, nameW, ...inp.items.map(() => itemW), meanW],
    header: ['座號', '姓名', ...inp.items, '平均'],
    rows,
    emphasisRows: [rows.length - 1],
    align: ['center', 'left', ...inp.items.map(() => 'center' as const), 'center'],
    rowH: 22,
    size: 10,
  };
}

const finish = (doc: DocModel): DocModel => ({ ...doc, footerText: clean(doc.footerText) });

/** 個人回饋單：範本 ＋ 這位學生的統計資料。 */
export function personalDocFromTemplate(t: EditorTemplate, inp: PersonalFeedbackInput, ctx: CommonCtx): DocModel {
  const width = contentWidth(pageSetup(t.page));
  const vars: Record<string, string | number | undefined> = {
    姓名: inp.student.name,
    座號: inp.student.seat,
    班級: inp.className,
    事項: inp.topic,
    學校: ctx.school ?? inp.school ?? '',
    平均分: fmt1(inp.average.mine),
    班級平均: fmt1(inp.average.classMean),
    滿分: inp.scaleMax,
    老師評語: inp.teacherComment ?? '',
    // 回饋單對外不顯示名次：學生版、家長版的 {全班名次} 一律空白（摘要數字列的名次卡在 compile 裡同樣只給教師版）
    全班名次: ctx.version === 'teacher' ? (inp.stats?.rank ?? '') : '',
    回收份數: inp.stats?.count ?? '',
    中位數: inp.stats?.median != null ? fmt1(inp.stats.median) : '',
    標準差: inp.stats?.sd != null ? inp.stats.sd.toFixed(2) : '',
    有優點: inp.praise.length ? '1' : '',
    有建議: inp.advice.length ? '1' : '',
  };
  const slot = (name: string, b: SlotBlock): Block[] => {
    const size = 'size' in b && typeof b.size === 'number' ? b.size : 11;
    switch (name) {
      case SLOTS.scoreTable:
        return [scoreTable(inp, width)];
      case SLOTS.chart: {
        if (!inp.chartPng) return [];
        const w = Math.min(440, width);
        return [{ type: 'image', png: inp.chartPng, w, h: (190 * w) / 440 }];
      }
      case SLOTS.praise:
        return inp.praise.length ? [{ type: 'bullets', items: inp.praise, size }] : [];
      case SLOTS.advice:
        return inp.advice.length ? [{ type: 'bullets', items: inp.advice, size }] : [];
      case 'compare':
        return inp.selfCompare?.length ? [advanced.compareTable(inp.selfCompare, { width })] : [];
      case SLOTS.teacherComment:
        return inp.teacherComment ? [{ type: 'text', text: inp.teacherComment, size }] : [];
      default:
        return [];
    }
  };
  const title = `${inp.student.name} 的${inp.topic}回饋單`;
  return finish(
    compile(t, {
      version: ctx.version,
      vars,
      slot: (n, b) => slot(n, b),
      image: (src) => dataUrlToPng(ctx.images?.[src]),
      ...(ctx.override ? { override: ctx.override } : {}),
      title,
    }),
  );
}

/** 班級總表。 */
export function classDocFromTemplate(t: EditorTemplate, inp: ClassSummaryInput, ctx: CommonCtx): DocModel {
  const width = contentWidth(pageSetup(t.page));
  const vars = { 班級: inp.className, 事項: inp.topic, 學校: ctx.school ?? inp.school ?? '' };
  return finish(
    compile(t, {
      version: ctx.version,
      vars,
      slot: (name) => (name === SLOTS.classTable ? [classTable(inp, width)] : []),
      image: (src) => dataUrlToPng(ctx.images?.[src]),
      title: `${inp.className} ${inp.topic} 班級總表`,
    }),
  );
}
