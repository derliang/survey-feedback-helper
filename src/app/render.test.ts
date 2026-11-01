import { describe, expect, it } from 'vitest';
import { builtinTemplates } from '../editor/builtin';
import type { EditorTemplate } from '../editor/types';
import type { ClassSummaryInput, PersonalFeedbackInput } from '../export';
import { classDocFromTemplate, dataUrlToPng, isSummaryTemplate, personalChoices, personalDocFromTemplate, pickTemplates } from './render';

const input = (over: Partial<PersonalFeedbackInput> = {}): PersonalFeedbackInput => ({
  className: '三年二班',
  topic: '小組報告',
  student: { seat: '6', name: '林小宇' },
  scaleMax: 5,
  items: [
    { label: '內容', mine: 4.5, classMean: 4 },
    { label: '表達', mine: 3.5, classMean: 4 },
  ],
  average: { mine: 4, classMean: 4 },
  praise: ['講得很清楚'],
  advice: [],
  teacherComment: '繼續加油',
  ...over,
});
const texts = (d: { blocks: { type: string; text?: string; items?: string[] }[] }) => d.blocks.flatMap((b) => [b.text ?? '', ...(b.items ?? [])]);
const [personal, summary] = builtinTemplates() as [EditorTemplate, EditorTemplate];

describe('輸出接線：範本 → DocModel', () => {
  it('內建個人回饋單填入真實資料', () => {
    const d = personalDocFromTemplate(personal, input(), { version: 'teacher', school: '○○國中' });
    const all = texts(d).join('|');
    expect(all).toContain('林小宇 的小組報告回饋單');
    expect(all).toContain('平均 4.0 分');
    expect(all).toContain('講得很清楚');
    expect(all).toContain('繼續加油');
    expect(all).not.toContain('{');
    const table = d.blocks.find((b) => b.type === 'table');
    expect(table && 'rows' in table && table.rows.map((r) => r[0])).toEqual(['內容', '表達', '平均']);
    expect(d.footerText).toBe('○○國中 三年二班 林小宇');
    expect(d.title).toBe('林小宇 的小組報告回饋單');
  });

  it('沒有留言時略過留言區；沒有學校時頁尾不留空白', () => {
    const d = personalDocFromTemplate(personal, input({ praise: [], teacherComment: undefined }), { version: 'student' });
    expect(texts(d).join('|')).not.toContain('同學的留言');
    expect(d.footerText).toBe('三年二班 林小宇');
  });

  it('圖表有圖才放；學生覆寫能隱藏區塊與換變數', () => {
    const png = new Uint8Array([1, 2, 3]);
    expect(personalDocFromTemplate(personal, input({ chartPng: png }), { version: 'teacher' }).blocks.some((b) => b.type === 'image')).toBe(true);
    expect(personalDocFromTemplate(personal, input(), { version: 'teacher' }).blocks.some((b) => b.type === 'image')).toBe(false);
    const d = personalDocFromTemplate(personal, input(), { version: 'teacher', override: { blocks: { 'p-teacher': { hidden: true } }, vars: { 姓名: '小宇' } } });
    expect(texts(d).join('|')).not.toContain('繼續加油');
    expect(texts(d).join('|')).toContain('小宇 的小組報告回饋單');
  });

  it('使用者自訂範本（改標題、換頁面）被採用', () => {
    const mine: EditorTemplate = { ...personal, id: 'mine', builtin: false, name: '我的', page: { ...personal.page, orientation: 'landscape' }, blocks: [{ id: 'x', kind: 'heading', text: '嗨 {姓名}', size: 20 }] };
    const d = personalDocFromTemplate(mine, input(), { version: 'teacher' });
    expect(texts(d)).toEqual(['嗨 林小宇']);
    expect(d.page!.w).toBeGreaterThan(d.page!.h);
  });

  it('班級總表', () => {
    const inp: ClassSummaryInput = { className: '三年二班', topic: '小組報告', items: ['內容'], students: [{ seat: '6', name: '林小宇', values: [4.5], mean: 4.5 }], classMeans: [4], classOverall: 4 };
    const d = classDocFromTemplate(summary, inp, { version: 'teacher' });
    const t = d.blocks.find((b) => b.type === 'table');
    expect(t && 'rows' in t && t.rows).toHaveLength(2);
    expect(texts(d).join('|')).toContain('三年二班 小組報告 班級總表');
  });

  it('選範本：選到個人回饋單類或班級總表類，另一類用內建；找不到用內建', () => {
    const mine: EditorTemplate = { ...personal, id: 'mine', builtin: false };
    const all = [mine, ...builtinTemplates()];
    expect(pickTemplates(all, 'mine').personal.id).toBe('mine');
    expect(pickTemplates(all, 'mine').summary.id).toBe('builtin-class-summary');
    expect(pickTemplates(all, 'builtin-class-summary').personal.id).toBe('builtin-personal');
    expect(pickTemplates(all, 'gone').personal.id).toBe('builtin-personal');
    expect(pickTemplates([], null).personal.id).toBe('builtin-personal');
    expect(isSummaryTemplate(summary)).toBe(true);
    expect(personalChoices(all).map((t) => t.id)).toEqual(['mine', 'builtin-personal', 'builtin-personal-adv']);
  });

  it('資料 URL 只接受 PNG', () => {
    expect(dataUrlToPng('data:image/png;base64,AQID')).toEqual(new Uint8Array([1, 2, 3]));
    expect(dataUrlToPng('data:image/jpeg;base64,AQID')).toBeUndefined();
    expect(dataUrlToPng(undefined)).toBeUndefined();
  });
});

describe('進階範本接線', () => {
  const adv = builtinTemplates().find((t) => t.id === 'builtin-personal-adv')!;
  const types = (d: { blocks: { type: string }[] }) => d.blocks.map((b) => b.type);
  it('老師版有摘要數字列（含名次）與自評對照表', () => {
    const inp = input({ stats: { rank: 3, count: 8, median: 4.1, sd: 0.31 }, selfCompare: [{ item: '內容', others: 4.5, self: 4 }] });
    const d = personalDocFromTemplate(adv, inp, { version: 'teacher' });
    expect(types(d)).toEqual(expect.arrayContaining(['hero', 'stats', 'table', 'callout']));
    const stats = d.blocks.find((b) => b.type === 'stats');
    expect(stats && 'cards' in stats && stats.cards.map((c) => c.label)).toEqual(['我的平均', '班級平均', '全班名次', '回收份數']);
    const cmp = d.blocks.filter((b) => b.type === 'table').find((b) => 'header' in b && b.header[0] === '項目');
    expect(cmp && 'rows' in cmp && cmp.rows[0]).toEqual(['內容', '4.5', '4.0', '-0.5']);
  });
  it('學生版隱藏名次；沒有自評資料就略過對照表', () => {
    const d = personalDocFromTemplate(adv, input({ stats: { rank: 3, count: 8 } }), { version: 'student' });
    const stats = d.blocks.find((b) => b.type === 'stats');
    expect(stats && 'cards' in stats && stats.cards.map((c) => c.label)).not.toContain('全班名次');
    expect(d.blocks.some((b) => b.type === 'table' && 'header' in b && b.header[0] === '項目')).toBe(false);
  });
});
