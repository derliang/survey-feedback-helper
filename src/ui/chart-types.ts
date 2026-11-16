// 回饋單圖表的四種類型（長條／對照條／分布／堆疊）與班級平均參考線。自製 SVG，不用圖表套件。
// 純函式：輸入統計資料與範本設定，回傳 SVG 與圖高；輸出（Word／PDF／列印）與編輯器預覽共用同一份，所以一致。
// 設計見 docs/design/DESIGN.md 5.36。非顏色辨識：參考線＝虛線，班級分布＝虛線外框與空心點，堆疊＝同色深淺加數字。
import { PRINT, clip, esc, f1, pairedBarsHeight, pairedBarsSvg, wrapSvg, type Palette } from './chart-svg';

import { asChartKind, type ChartKind } from '../editor/types';
export type { ChartKind };

export interface ChartItem {
  label: string;
  /** 這位同學這題的平均；沒有為 null。 */
  mine: number | null;
  /** 班級這題的平均；沒有為 null。 */
  cls: number | null;
  /** 這位同學這題各分數的人數（索引 0 ＝ 量表最低分）。 */
  dist: readonly number[];
  /** 全班這題各分數的人數（全班所有被評者合計）。 */
  classDist: readonly number[];
}

export interface ChartInput {
  items: readonly ChartItem[];
  scaleMin: number;
  scaleMax: number;
}

export interface ChartText {
  title: string;
  mine: string;
  classAvg: string;
  /** 分布圖、堆疊圖用：全班整體、分數低高端。 */
  classAll: string;
  low: string;
  high: string;
  ratings: (n: number) => string;
  noteFallback: string;
  noteNoClass: string;
}

export interface ChartResult {
  svg: string;
  w: number;
  h: number;
  /** 實際畫出的類型（資料不足時會降級成對照條）。 */
  kind: ChartKind;
  /** 降級或省略參考線時的說明（也已畫在圖下方）。 */
  note?: string;
}

/** 全形空白（提示文字裡分隔用）。 */
const SP = String.fromCharCode(0x3000);
const NOTE_H = 18;
const DASH = '4 3';
const sum = (a: readonly number[]): number => a.reduce((x, y) => x + y, 0);
const hole = (p: Palette): string => p.hole ?? (p.bg === 'transparent' ? 'var(--card)' : p.bg);
const r1 = (n: number): string => f1(Math.round(n * 10) / 10);

function withNote(svg: string, w: number, h: number, note: string | undefined, p: Palette): string {
  if (!note) return svg;
  return svg.replace('</svg>', `<text x="6" y="${h - 5}" font-size="11" style="fill:${p.muted}">${esc(clip(note, w < 420 ? 30 : 46))}</text></svg>`);
}

export function chartHeight(kind: ChartKind, line: boolean, rows: number, withNoteLine = false): number {
  const n = Math.max(rows, 1);
  const extra = withNoteLine ? NOTE_H : 0;
  switch (kind) {
    case 'compare':
      return pairedBarsHeight(n) + extra;
    case 'bar':
      return 26 + n * 28 + 6 + extra;
    case 'stacked':
      return 34 + n * (line ? 42 : 28) + 6 + extra;
    case 'dist':
      return 210 + extra;
  }
}

/** 畫一張圖。type／line 就是範本裡「圖表類型」「在圖表顯示班級平均參考線」兩個設定。 */
export function buildChart(type: string | undefined, line: boolean, d: ChartInput, t: ChartText, o: { w?: number; palette?: Palette } = {}): ChartResult {
  const w = o.w ?? 440;
  const p = o.palette ?? PRINT;
  let kind = asChartKind(type);
  let note: string | undefined;
  // 分布、堆疊需要評分人數資料；沒有就降級成對照條並說明
  if ((kind === 'dist' || kind === 'stacked') && !d.items.some((it) => sum(it.dist) > 0)) {
    kind = 'compare';
    note = t.noteFallback;
  }
  // 參考線需要班級資料：沒有就不畫並說明。對照條本身就含班級平均，開關不影響。
  const hasClass = kind === 'bar' ? d.items.some((it) => it.cls !== null) : d.items.some((it) => sum(it.classDist) > 0);
  const wantLine = line && kind !== 'compare';
  if (wantLine && !hasClass) note = note ?? t.noteNoClass;
  const drawLine = wantLine && hasClass;
  const h = chartHeight(kind, drawLine, d.items.length, note !== undefined);
  const c: Ctx = { ...d, w, h, p, pad: note !== undefined ? NOTE_H : 0 };
  let svg: string;
  switch (kind) {
    case 'compare':
      svg = pairedBarsSvg(
        d.items.map((it) => ({ label: it.label, a: it.mine, b: it.cls })),
        { title: t.title, max: d.scaleMax, aName: t.mine, bName: t.classAvg, w, h, palette: p },
      );
      break;
    case 'bar':
      svg = barChart(c, t, drawLine);
      break;
    case 'dist':
      svg = distChart(c, t, drawLine);
      break;
    case 'stacked':
      svg = stackedChart(c, t, drawLine);
      break;
  }
  return { svg: withNote(svg, w, h, note, p), w, h, kind, ...(note ? { note } : {}) };
}

interface Ctx extends ChartInput {
  w: number;
  h: number;
  p: Palette;
  /** 底部留給說明文字的高度。 */
  pad: number;
}

/** 長條：每題一根「這位同學的平均」；開參考線時，在該題畫一條虛線標出班級平均。 */
function barChart(c: Ctx, t: ChartText, line: boolean): string {
  const { p, w } = c;
  const narrow = w < 420;
  const labelW = narrow ? 96 : 130;
  const barW = w - labelW - 48;
  const rowH = 28;
  const at = (v: number) => labelW + Math.max(0, Math.min(1, v / c.scaleMax)) * barW;
  const legend =
    `<rect x="${labelW}" y="6" width="12" height="12" rx="2" style="fill:${p.a}"/><text x="${labelW + 18}" y="17" font-size="13" style="fill:${p.ink}">${esc(t.mine)}</text>` +
    (line
      ? `<line x1="${labelW + 112}" x2="${labelW + 112}" y1="5" y2="19" stroke-width="2" stroke-dasharray="3 2" style="stroke:${p.b}"/><text x="${labelW + 120}" y="17" font-size="13" style="fill:${p.ink}">${esc(t.classAvg)}</text>`
      : '');
  const rows = c.items
    .map((it, i) => {
      const y = 26 + i * rowH;
      const bar =
        it.mine === null
          ? `<text x="${labelW}" y="${y + 15}" font-size="12" style="fill:${p.muted}">—</text>`
          : `<rect x="${labelW}" y="${y + 4}" width="${f1(at(it.mine) - labelW)}" height="14" rx="2" style="fill:${p.a}"/><text x="${f1(at(line && it.cls !== null ? Math.max(it.mine, it.cls) : it.mine) + 6)}" y="${y + 16}" font-size="12" style="fill:${p.ink}">${r1(it.mine)}</text>`;
      const ref =
        line && it.cls !== null
          ? `<line x1="${f1(at(it.cls))}" x2="${f1(at(it.cls))}" y1="${y}" y2="${y + 22}" stroke-width="2" stroke-dasharray="3 2" style="stroke:${p.b}"><title>${esc(t.classAvg)} ${r1(it.cls)}</title></line>`
          : '';
      return `<text x="${labelW - 8}" y="${y + 16}" text-anchor="end" font-size="13" style="fill:${p.ink}">${esc(clip(it.label, narrow ? 6 : 8))}</text>${bar}${ref}`;
    })
    .join('');
  return wrapSvg(w, c.h, t.title, p, legend + rows);
}

/** 分布：這位同學收到的所有評分，各分數占多少比例（直條）；開參考線時疊上全班的比例（虛線＋空心點）。 */
function distChart(c: Ctx, t: ChartText, line: boolean): string {
  const { p, w, h } = c;
  const n = Math.max(1, c.scaleMax - c.scaleMin + 1);
  const pool = (pick: (i: ChartItem) => readonly number[]) => Array.from({ length: n }, (_, k) => c.items.reduce((s, it) => s + (pick(it)[k] ?? 0), 0));
  const mine = pool((i) => i.dist);
  const cls = pool((i) => i.classDist);
  const mShare = mine.map((v) => v / (sum(mine) || 1));
  const cShare = cls.map((v) => v / (sum(cls) || 1));
  const top = 36;
  const bottom = 30;
  const padX = 24;
  const ymax = Math.max(0.2, Math.ceil(Math.max(...mShare, ...(line ? cShare : [0])) * 10) / 10);
  const slot = (w - padX * 2) / n;
  const bw = Math.min(44, slot * 0.66);
  const base = h - bottom - c.pad;
  const yOf = (v: number) => base - (v / ymax) * (base - top);
  const cx = (k: number) => padX + k * slot + slot / 2;
  const legend = `<rect x="${padX}" y="6" width="12" height="12" rx="2" style="fill:${p.a}"/><text x="${padX + 18}" y="17" font-size="13" style="fill:${p.ink}">${esc(t.mine)}（${esc(t.ratings(sum(mine)))}）</text>`;
  const cols = mShare
    .map((v, k) => {
      const pct = `${Math.round(v * 100)}%`;
      return (
        `<g class="bar"><title>${c.scaleMin + k}${SP}${pct}（${mine[k]}）</title><rect x="${f1(cx(k) - bw / 2)}" y="${f1(yOf(v))}" width="${f1(bw)}" height="${f1(base - yOf(v))}" rx="2" style="fill:${p.a}"/></g>` +
        `<text x="${f1(cx(k))}" y="${f1(Math.min(yOf(v), line ? yOf(cShare[k] ?? 0) : yOf(v)) - (line ? 9 : 5))}" text-anchor="middle" font-size="12" style="fill:${p.ink}">${pct}</text>` +
        `<text x="${f1(cx(k))}" y="${base + 16}" text-anchor="middle" font-size="12" style="fill:${p.muted}">${c.scaleMin + k}</text>`
      );
    })
    .join('');
  let ref = '';
  if (line) {
    const pts = cShare.map((v, k) => `${f1(cx(k))} ${f1(yOf(v))}`).join(' ');
    const dot = (x: number, y: number, title = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="4" stroke-width="2" style="fill:${hole(p)};stroke:${p.b}">${title ? `<title>${esc(title)}</title>` : ''}</circle>`;
    const lx = w - padX - (w < 420 ? 84 : 92);
    ref =
      `<polyline points="${pts}" fill="none" stroke-width="2" stroke-dasharray="${DASH}" style="stroke:${p.b}"/>` +
      cShare.map((v, k) => dot(cx(k), yOf(v), `${t.classAll} ${c.scaleMin + k}${SP}${Math.round(v * 100)}%`)).join('') +
      `<line x1="${lx}" x2="${lx + 22}" y1="12" y2="12" stroke-width="2" stroke-dasharray="${DASH}" style="stroke:${p.b}"/>${dot(lx + 11, 12)}<text x="${lx + 28}" y="17" font-size="12" style="fill:${p.ink}">${esc(t.classAll)}</text>`;
  }
  return wrapSvg(w, h, t.title, p, `${legend}<line x1="${padX}" x2="${w - padX}" y1="${base}" y2="${base}" style="stroke:${p.grid}"/>${cols}${ref}`);
}

/** 堆疊：每題一條 100% 堆疊橫條，分段是各分數的人數比例（同色深淺加數字）；開參考線時，下方多一條虛線外框的「全班」。 */
function stackedChart(c: Ctx, t: ChartText, line: boolean): string {
  const { p, w } = c;
  const narrow = w < 420;
  const labelW = narrow ? 96 : 130;
  const barW = w - labelW - 12;
  const n = Math.max(1, c.scaleMax - c.scaleMin + 1);
  const opac = (k: number) => (n <= 1 ? 1 : 0.16 + (0.84 * k) / (n - 1));
  const onFill = (k: number) => (opac(k) > 0.6 ? '#ffffff' : p.ink);
  const rowH = line ? 42 : 28;
  const seg = (dist: readonly number[], y: number, bh: number, dashed: boolean, label: string): string => {
    const tot = sum(dist);
    if (tot === 0) return `<text x="${labelW}" y="${y + bh - 3}" font-size="12" style="fill:${p.muted}">—</text>`;
    let acc = 0;
    const parts = dist.map((v, k) => {
      const sw = (v / tot) * barW;
      const sx = labelW + (acc / tot) * barW;
      acc += v;
      if (v === 0) return '';
      const txt = sw >= 26 && bh >= 16 ? `<text x="${f1(sx + sw / 2)}" y="${f1(y + bh / 2 + 4)}" text-anchor="middle" font-size="12" style="fill:${onFill(k)}">${Math.round((v / tot) * 100)}%</text>` : '';
      return `<rect x="${f1(sx)}" y="${y}" width="${f1(sw)}" height="${bh}" style="fill:${p.a};fill-opacity:${f1(opac(k))};stroke:${hole(p)};stroke-width:1"/>${txt}`;
    });
    const frame = dashed ? `<rect x="${labelW}" y="${y}" width="${f1(barW)}" height="${bh}" fill="none" stroke-width="1.5" stroke-dasharray="${DASH}" style="stroke:${p.b}"/>` : '';
    return `<g class="bar"><title>${esc(label)}</title>${parts.join('')}${frame}</g>`;
  };
  const sw = Math.min(30, (barW - 100) / n);
  let lg = `<text x="${labelW - 8}" y="17" text-anchor="end" font-size="12" style="fill:${p.muted}">${esc(t.low)}</text>`;
  for (let k = 0; k < n; k++) {
    lg += `<rect x="${f1(labelW + k * sw)}" y="5" width="${f1(sw)}" height="14" style="fill:${p.a};fill-opacity:${f1(opac(k))}"/><text x="${f1(labelW + k * sw + sw / 2)}" y="16" text-anchor="middle" font-size="11" style="fill:${onFill(k)}">${c.scaleMin + k}</text>`;
  }
  const hx = labelW + n * sw + 6;
  lg += `<text x="${f1(hx)}" y="17" font-size="12" style="fill:${p.muted}">${esc(t.high)}</text>`;
  if (line) lg += `<rect x="${f1(hx + 36)}" y="6" width="22" height="12" fill="none" stroke-width="1.5" stroke-dasharray="${DASH}" style="stroke:${p.b}"/><text x="${f1(hx + 62)}" y="17" font-size="12" style="fill:${p.ink}">${esc(t.classAll)}</text>`;
  const rows = c.items
    .map((it, i) => {
      const y = 28 + i * rowH;
      return (
        `<text x="${labelW - 8}" y="${y + 15}" text-anchor="end" font-size="13" style="fill:${p.ink}">${esc(clip(it.label, narrow ? 6 : 8))}</text>` +
        seg(it.dist, y + 2, 18, false, `${it.label}${SP}${t.mine}`) +
        (line ? seg(it.classDist, y + 24, 12, true, `${it.label}${SP}${t.classAll}`) : '')
      );
    })
    .join('');
  return wrapSvg(w, c.h, t.title, p, lg + rows);
}
