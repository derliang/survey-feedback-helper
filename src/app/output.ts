// 輸出接線：把統計結果＋審稿結果轉成 src/export 範本的輸入（一般資料結構）。純函式，不載入任何輸出器。
import {
  type FeedbackSummary,
  type PersonRef,
  type PseudonymMap,
  type TargetResult,
  buildView,
  cellText,
  pseudonymize,
  type ViewKind,
} from '../core';
import type { BatchItem, ClassSummaryInput, DocModel, PersonalFeedbackInput, XSheet } from '../export';
import { rosterStudents } from './progress';
import { type Question, type VoteResult } from './analysis';
import { finalText, type Review } from './review';
import type { Session } from './store';

export type Audience = ViewKind;

export const AUDIENCE_NAMES: Record<Audience, string> = { teacher: '教師版', student: '學生版', parent: '家長版' };

/** 留言審稿用的鍵：報告回饋以列號、意見調查以「欄:列」。 */
export const feedbackKey = (recordId: number): string => `f${recordId}`;
export const openKey = (col: number, row: number): string => `o${col}:${row}`;

const ref = (name: string): PersonRef => ({ class: null, seat: null, name });

/** 名單與資料裡出現過的所有人，用來遮蔽留言裡的姓名（名單外的人名無法辨識）。 */
export function allPeople(s: Session, summary: FeedbackSummary, raters: PersonRef[]): PersonRef[] {
  return [...rosterStudents(s).map((st) => ({ class: st.class, seat: st.seat, name: st.name })), ...summary.targets.map((t) => t.person), ...raters];
}

export function reviewedTarget(t: TargetResult, review: Review, audience: Audience): TargetResult {
  const comments = t.comments
    .map((c) => ({ recordId: c.recordId, text: finalText(review, feedbackKey(c.recordId), c.text, audience) }))
    .filter((c): c is { recordId: number; text: string } => c.text !== null && c.text.trim() !== '');
  return { ...t, comments };
}

const seatText = (p: PersonRef): string => cellText(p.seat);
const classText = (p: PersonRef): string => cellText(p.class);
const nameText = (p: PersonRef): string => cellText(p.name);

export interface PersonalOutput {
  key: string;
  fileName: string;
  input: PersonalFeedbackInput;
  /** 這份將放進去的留言（預覽給老師看）。 */
  comments: string[];
}

/** 每位被評對象一份個人回饋單的輸入。 */
export function personalInputs(
  s: Session,
  summary: FeedbackSummary,
  review: Review,
  audience: Audience,
  raters: PersonRef[],
  chartFor?: (t: TargetResult) => Uint8Array | undefined,
): PersonalOutput[] {
  const map: PseudonymMap = pseudonymize(allPeople(s, summary, raters));
  const sorted = [...summary.targets].sort((a, b) => Number(seatText(a.person)) - Number(seatText(b.person)) || nameText(a.person).localeCompare(nameText(b.person), 'zh-Hant'));
  const itemLabels = summary.items.map((i) => i.label);
  return sorted.map((t) => {
    const view = buildView(reviewedTarget(t, review, audience), summary, audience, { map });
    const items = (view.items ?? []).map((it, i) => ({ label: itemLabels[i] ?? it.label, mine: it.mean, classMean: it.classMean }));
    const comments = view.comments;
    const seat = seatText(t.person);
    const input: PersonalFeedbackInput = {
      className: classText(t.person),
      topic: s.name,
      student: { seat, name: nameText(t.person) },
      scaleMax: s.scale.max,
      items,
      average: { mine: view.total, classMean: view.classMean },
      praise: comments,
      praiseTitle: '同學的留言',
      advice: [],
      teacherComment: review.teacher[t.key] || undefined,
      chartPng: chartFor?.(t),
    };
    const prefix = seat === '' ? '' : `${seat.padStart(2, '0')} `;
    return { key: t.key, fileName: `${prefix}${nameText(t.person)}`, input, comments };
  });
}

export function batchItems(list: { fileName: string; doc: DocModel }[]): BatchItem[] {
  return list.map((x) => ({ name: x.fileName, doc: x.doc }));
}

/** 班級總表（教師用）。 */
export function classSummaryInput(s: Session, summary: FeedbackSummary): ClassSummaryInput {
  const sorted = [...summary.targets].sort((a, b) => Number(seatText(a.person)) - Number(seatText(b.person)));
  return {
    className: classText(sorted[0]?.person ?? ref('')),
    topic: s.name,
    items: summary.items.map((i) => i.label),
    students: sorted.map((t) => ({ seat: seatText(t.person), name: nameText(t.person), values: t.averageRow, mean: t.total })),
    classMeans: summary.classItemMeans,
    classOverall: summary.classMean.value,
  };
}

/* ───────── 意見調查與票選：xlsx 表與簡單報告 ───────── */

const pct = (x: number): string => `${Math.round(x * 100)}%`;

export function opinionSheets(qs: Question[], review: Review, scaleMin: number): XSheet[] {
  const summary: XSheet = { name: '統計摘要', rows: [[{ v: '題目', s: 'header' }, { v: '類型', s: 'header' }, { v: '結果', s: 'header' }]], colWidths: [40, 12, 60] };
  const detail: XSheet = { name: '選項與分布', rows: [[{ v: '題目', s: 'header' }, { v: '選項或分數', s: 'header' }, { v: '人數', s: 'header' }, { v: '比例', s: 'header' }]], colWidths: [40, 24, 10, 10] };
  const open: XSheet = { name: '開放意見', rows: [[{ v: '題目', s: 'header' }, { v: '意見', s: 'header' }]], colWidths: [40, 80] };
  for (const q of qs) {
    if (q.kind === 'score') {
      const st = q.stat;
      summary.rows.push([q.col.label, '評分', st.n === 0 ? '沒有有效分數' : `平均 ${st.mean!.toFixed(1)}，中位數 ${st.median}，共 ${st.n} 人`]);
      st.distribution.forEach((n, i) => detail.rows.push([q.col.label, String(scaleMin + i), n, '']));
    } else if (q.kind === 'choice') {
      summary.rows.push([q.col.label, q.multi ? '複選題' : '單選題', `${q.stat.answered} 人作答`]);
      for (const c of q.stat.counts) detail.rows.push([q.col.label, c.option, c.count, pct(c.share)]);
    } else {
      const texts = q.stat.answers
        .map((a) => finalText(review, openKey(q.col.index, a.row), a.text, 'teacher'))
        .filter((t): t is string => t !== null);
      summary.rows.push([q.col.label, '開放意見', `${texts.length} 則（隱藏的不列）`]);
      for (const t of texts) open.rows.push([q.col.label, t]);
    }
  }
  return [summary, detail, open].filter((sh) => sh.rows.length > 1);
}

export function voteSheets(v: VoteResult): XSheet[] {
  const sheets: XSheet[] = [];
  const sum: XSheet = { name: '當選結果', rows: [[{ v: '職位', s: 'header' }, { v: '當選', s: 'header' }, { v: '抽籤', s: 'header' }]], colWidths: [24, 40, 50] };
  for (const p of v.positions) {
    const draw = p.election.draw ? `同票抽籤，種子「${p.election.draw.seed}」，順序：${p.election.draw.order.join('、')}` : '';
    sum.rows.push([p.col.label, p.election.elected.join('、') || '（無人）', draw]);
  }
  sheets.push(sum);
  const det: XSheet = { name: '得票數', rows: [[{ v: '職位', s: 'header' }, { v: '名次', s: 'header' }, { v: '姓名', s: 'header' }, { v: '票數', s: 'header' }]], colWidths: [24, 8, 20, 8] };
  for (const p of v.positions) for (const r of p.tally.rows) det.rows.push([p.col.label, r.rank, r.name, r.votes]);
  sheets.push(det);
  return sheets;
}

/** 意見調查與票選的簡單報告（Word、PDF 用）。 */
export function reportDoc(title: string, sections: { heading: string; lines?: string[]; table?: { header: string[]; rows: string[][] } }[]): DocModel {
  const W = 481.88;
  const blocks: DocModel['blocks'] = [{ type: 'heading', text: title, size: 22, color: '#1f4e79', after: 10 }];
  for (const sec of sections) {
    blocks.push({ type: 'heading', text: sec.heading, size: 14, color: '#1f4e79', before: 8, after: 6 });
    if (sec.lines?.length) blocks.push({ type: 'bullets', items: sec.lines, size: 11, after: 6 });
    if (sec.table) {
      const n = sec.table.header.length;
      const first = n === 1 ? W : W - (n - 1) * 80;
      blocks.push({ type: 'table', widths: [first, ...Array<number>(n - 1).fill(80)], header: sec.table.header, rows: sec.table.rows, rowH: 22, size: 10.5, after: 8 });
    }
  }
  return { blocks, footerText: title, lineH: 18, title };
}

export function opinionReport(s: Session, qs: Question[], review: Review): DocModel {
  return reportDoc(
    `${s.name} 統計報告`,
    qs.map((q) => {
      if (q.kind === 'score') {
        const st = q.stat;
        return { heading: q.col.label, lines: [st.n === 0 ? '沒有有效分數。' : `平均 ${st.mean!.toFixed(1)}（${s.scale.min}～${s.scale.max} 分），中位數 ${st.median}，共 ${st.n} 人。`] };
      }
      if (q.kind === 'choice') {
        return { heading: q.col.label, table: { header: ['選項', '人數', '比例'], rows: q.stat.counts.map((c) => [c.option, String(c.count), pct(c.share)]) } };
      }
      const texts = q.stat.answers
        .map((a) => finalText(review, openKey(q.col.index, a.row), a.text, 'teacher'))
        .filter((t): t is string => t !== null);
      return { heading: q.col.label, lines: texts.length ? texts : ['沒有意見。'] };
    }),
  );
}

export function voteReport(s: Session, v: VoteResult): DocModel {
  return reportDoc(
    `${s.name} 票選結果`,
    v.positions.map((p) => ({
      heading: `${p.col.label}（名額 ${p.seats}）`,
      lines: [`當選：${p.election.elected.join('、') || '（無人）'}`, ...(p.election.draw ? [`同票抽籤，種子「${p.election.draw.seed}」。`] : [])],
      table: { header: ['姓名', '票數'], rows: p.tally.rows.map((r) => [r.name, String(r.votes)]) },
    })),
  );
}
