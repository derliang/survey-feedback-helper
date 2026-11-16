import { describe, expect, it } from 'vitest';
import { summarizeFeedback, type FeedbackItem, type FeedbackRecord } from '../core/feedback';
import { builtinTemplates } from '../editor/builtin';
import { asChartKind, chartKey, type EditorTemplate } from '../editor/types';
import { chartData } from '../app/output';
import { personalDocFromTemplate } from '../app/render';
import type { PersonalFeedbackInput } from '../export';
import { PRINT, toPrintSvg } from './chart-svg';
import { chartPalette, chartText } from './chart-text';
import { buildChart, type ChartInput } from './chart-types';

const T = chartText();
const data: ChartInput = {
  scaleMin: 1,
  scaleMax: 5,
  items: [
    { label: '表達', mine: 4.2, cls: 3.8, dist: [0, 1, 2, 5, 4], classDist: [2, 6, 14, 22, 16] },
    { label: '合作', mine: 3.9, cls: 4.1, dist: [0, 1, 3, 5, 3], classDist: [1, 5, 12, 24, 18] },
  ],
};
const dashed = (svg: string): boolean => svg.includes('stroke-dasharray');

describe('圖表類型：鍵與預設', () => {
  it('不認得或沒設定的類型一律是對照條（原本的畫法）', () => {
    expect(asChartKind(undefined)).toBe('compare');
    expect(asChartKind('heatmap')).toBe('compare');
    expect(asChartKind('stacked')).toBe('stacked');
  });
  it('圖的辨識鍵含類型、參考線與顏色', () => {
    expect(chartKey({ chartType: 'bar', compareLine: true })).toBe('bar|1|');
    expect(chartKey({ chartType: 'bar' })).not.toBe(chartKey({ chartType: 'bar', compareLine: true }));
    expect(chartKey({ chartType: 'dist', colors: ['#111111', '#222222'] })).toBe('dist|0|#111111,#222222');
  });
});

describe('圖表類型：四種圖各自畫出不同的圖', () => {
  const svgs = (['bar', 'compare', 'dist', 'stacked'] as const).map((k) => buildChart(k, false, data, T).svg);
  it('四種圖互不相同、都是合法 SVG', () => {
    expect(new Set(svgs).size).toBe(4);
    for (const s of svgs) {
      expect(s.startsWith('<svg')).toBe(true);
      expect(s.endsWith('</svg>')).toBe(true);
    }
  });
  it('長條：每題一根；開參考線才有虛線', () => {
    expect(dashed(buildChart('bar', false, data, T).svg)).toBe(false);
    const on = buildChart('bar', true, data, T);
    expect(on.kind).toBe('bar');
    expect(on.svg.match(/stroke-dasharray/g)!.length).toBeGreaterThanOrEqual(data.items.length);
  });
  it('對照條：含班級平均，參考線開關不影響', () => {
    const a = buildChart('compare', false, data, T);
    const b = buildChart('compare', true, data, T);
    expect(a.svg).toBe(b.svg);
    expect(a.svg).toContain(T.classAvg);
  });
  it('分布：直條為各分數比例；開參考線疊上虛線與空心點，並在圖例標出全班', () => {
    const off = buildChart('dist', false, data, T);
    const on = buildChart('dist', true, data, T);
    expect(off.svg).toContain('%');
    expect(dashed(off.svg)).toBe(false);
    expect(on.svg).toContain('<polyline');
    expect(on.svg).toContain(T.classAll);
    expect(on.svg.match(/<circle/g)!.length).toBe(5 + 1);
  });
  it('堆疊：分段數字加同色深淺；開參考線下方多一條虛線外框的全班', () => {
    const off = buildChart('stacked', false, data, T);
    const on = buildChart('stacked', true, data, T);
    expect(off.svg).toContain('fill-opacity');
    expect(off.svg).toContain('%');
    expect(dashed(off.svg)).toBe(false);
    expect(dashed(on.svg)).toBe(true);
    expect(on.h).toBeGreaterThan(off.h);
  });
  it('列印用調色盤不含 CSS 變數，黑白也能靠虛線與數字辨識', () => {
    for (const k of ['bar', 'dist', 'stacked'] as const) {
      const r = buildChart(k, true, data, T, { palette: PRINT });
      expect(toPrintSvg(r.svg)).not.toContain('var(');
    }
  });
  it('自訂顏色換掉主色與參考色', () => {
    const r = buildChart('bar', true, data, T, { palette: chartPalette(['#222222', '#7b8494', '#c9ced8']) });
    expect(r.svg).toContain('#222222');
    expect(r.svg).toContain('#7b8494');
  });
});

describe('圖表類型：沒有適用資料時降級並說明', () => {
  it('沒有評分人數資料：分布、堆疊改畫對照條並在圖內寫明', () => {
    const none: ChartInput = { ...data, items: data.items.map((i) => ({ ...i, dist: [0, 0, 0, 0, 0] })) };
    for (const k of ['dist', 'stacked'] as const) {
      const r = buildChart(k, true, none, T);
      expect(r.kind).toBe('compare');
      expect(r.note).toBe(T.noteFallback);
      expect(r.svg).toContain(T.noteFallback);
    }
  });
  it('沒有班級資料：參考線省略並說明，主圖照畫', () => {
    const noClass: ChartInput = { ...data, items: data.items.map((i) => ({ ...i, cls: null, classDist: [0, 0, 0, 0, 0] })) };
    for (const k of ['bar', 'dist', 'stacked'] as const) {
      const r = buildChart(k, true, noClass, T);
      expect(r.kind).toBe(k);
      expect(r.note).toBe(T.noteNoClass);
      expect(dashed(r.svg.replace(T.noteNoClass, ''))).toBe(false);
    }
  });
  it('單一向度、單一評分也畫得出來；圖高放得下說明', () => {
    const one: ChartInput = { scaleMin: 1, scaleMax: 5, items: [{ label: '表達', mine: 5, cls: null, dist: [0, 0, 0, 0, 1], classDist: [0, 0, 0, 0, 1] }] };
    for (const k of ['bar', 'compare', 'dist', 'stacked'] as const) {
      const r = buildChart(k, true, one, T);
      expect(r.svg).toContain('viewBox="0 0 440 ' + r.h + '"');
    }
  });
  it('有說明時比沒說明高，避免說明壓到圖', () => {
    const noClass: ChartInput = { ...data, items: data.items.map((i) => ({ ...i, cls: null, classDist: [0, 0, 0, 0, 0] })) };
    expect(buildChart('bar', true, noClass, T).h).toBeGreaterThan(buildChart('bar', false, noClass, T).h);
  });
});

describe('回饋單：統計裡的分數分布與輸出接線', () => {
  const items: FeedbackItem[] = [{ id: 'q0', label: '表達' }, { id: 'q1', label: '合作' }];
  const rec = (id: number, rater: string, target: string, a: number, b: number): FeedbackRecord => ({ id, rater: { name: rater }, target: { name: target }, scores: { q0: a, q1: b }, comment: '' });
  const rows = [rec(1, 'a', 'x', 5, 3), rec(2, 'b', 'x', 5, 4), rec(3, 'c', 'x', 4, 4), rec(4, 'a', 'y', 2, 1), rec(5, 'b', 'y', 3, 1)];
  const summary = summarizeFeedback(rows, items, { scale: { min: 1, max: 5 } });
  const x = summary.targets.find((t) => t.person.name === 'x')!;

  it('每題各分數的人數（索引 0 ＝ 最低分）', () => {
    expect(x.items[0]!.dist).toEqual([0, 0, 0, 1, 2]);
    expect(x.items[1]!.dist).toEqual([0, 0, 1, 2, 0]);
  });
  it('chartData 帶上本人與全班合計', () => {
    const d = chartData(summary, x, { min: 1, max: 5 });
    expect(d.items[0]!.dist).toEqual([0, 0, 0, 1, 2]);
    expect(d.items[0]!.classDist).toEqual([0, 1, 1, 1, 2]);
    expect(d.items[0]!.cls).toBe(summary.classItemMeans[0]);
  });
  it('範本圖表區塊依自己的設定取圖（同一份範本、不同設定拿到不同的圖）', () => {
    const personal = (builtinTemplates() as [EditorTemplate])[0];
    const inp: PersonalFeedbackInput = {
      className: '三年二班',
      topic: '報告',
      student: { seat: '6', name: '林小宇' },
      scaleMax: 5,
      items: [{ label: '表達', mine: 4, classMean: 4 }],
      average: { mine: 4, classMean: 4 },
      praise: [],
      advice: [],
      charts: { [chartKey({ chartType: 'compare', compareLine: true })]: { png: new Uint8Array([1]), h: 100 }, [chartKey({ chartType: 'stacked', compareLine: true })]: { png: new Uint8Array([2]), h: 150 } },
    };
    const img = (t: EditorTemplate) => personalDocFromTemplate(t, inp, { version: 'teacher' }).blocks.find((b) => b.type === 'image') as { png: Uint8Array; h: number } | undefined;
    expect(img(personal)!.png[0]).toBe(1);
    const stacked: EditorTemplate = { ...personal, blocks: personal.blocks.map((b) => (b.kind === 'data' && b.dataKind === 'chart' ? { ...b, chartType: 'stacked' } : b)) };
    const got = img(stacked)!;
    expect(got.png[0]).toBe(2);
    expect(got.h).toBeCloseTo(150, 5);
    const missing: EditorTemplate = { ...personal, blocks: personal.blocks.map((b) => (b.kind === 'data' && b.dataKind === 'chart' ? { ...b, chartType: 'dist' } : b)) };
    expect(img(missing)).toBeUndefined();
  });
});
