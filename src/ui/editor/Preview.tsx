// 頁面預覽：直接畫範本（不是輸出檔），每個區塊可選取、可雙擊改字。資料區塊畫示意（真正的數字在輸出時才填）。
import { ed, statLabelUi } from '../strings-editor';
import { useEffect, useRef, useState } from 'preact/hooks';
import { fillVars } from '../../export/model';
import { describeCondition } from '../../editor/condition';
import type { DragInfo } from './drag';
import type { Palette } from '../chart-svg';
import { buildChart, type ChartInput } from '../chart-types';
import { chartPalette, chartText } from '../chart-text';
import { STAT_KEYS, PAGE_SIZES, type DataEB, type EBlock, type EditorTemplate } from '../../editor/types';

export const SAMPLE_VARS: Record<string, string> = {
  姓名: '林小宇',
  班級: '三年二班',
  座號: '6',
  事項: '小組報告',
  學校: '○○國中',
  平均分: '4.3',
  班級平均: '4.0',
  滿分: '5',
  老師評語: '這次的表現很穩，期待你在下次發表時更放得開。',
};
/** 紙張永遠淺色：圖表預覽用紙張色（doc-warm），不跟深色模式。 */
const PAPER: Palette = { ink: 'var(--doc-ink)', muted: 'var(--doc-ink2)', grid: 'var(--doc-line)', a: 'var(--doc-s5)', b: 'var(--doc-s1)', bg: 'transparent', hole: 'var(--doc-card)' };

/** 圖表預覽用的示範資料（虛構）：量表 1–5，四個向度。 */
const SAMPLE_CHART: ChartInput = {
  scaleMin: 1,
  scaleMax: 5,
  items: [
    { label: '表達', mine: 4.2, cls: 3.8, dist: [0, 1, 2, 5, 4], classDist: [2, 6, 14, 22, 16] },
    { label: '合作', mine: 3.9, cls: 4.1, dist: [0, 1, 3, 5, 3], classDist: [1, 5, 12, 24, 18] },
    { label: '內容', mine: 4.5, cls: 3.9, dist: [0, 0, 1, 5, 6], classDist: [1, 4, 15, 21, 19] },
    { label: '創意', mine: 3.6, cls: 3.7, dist: [0, 2, 3, 5, 2], classDist: [3, 7, 13, 20, 17] },
  ],
};
export const VAR_NAMES = Object.keys(SAMPLE_VARS);

const px = (pt: number, s: number) => `${(pt * s).toFixed(2)}px`;

interface Ctx {
  s: number;
  sel: string | null;
  interactive: boolean;
  vars: Record<string, string>;
  images: Record<string, string>;
  onSelect: (id: string) => void;
  onText: (id: string, text: string) => void;
  /** 頁面上拖曳排序：把手屬性與目前拖曳狀態（沒有就不顯示把手）。 */
  grip?: (id: string) => object;
  drag?: DragInfo | null;
}

function Placeholder({ b, s }: { b: DataEB; s: number }) {
  if (b.dataKind === 'table')
    return (
      <div class="ph ph-table" style={{ fontSize: px(9, s) }}>
        {[0, 1, 2, 3].map((r) => (
          <div key={r} class={r === 0 ? 'ph-head' : ''}>
            <span>{r === 0 ? ed().pvDim : ed().pvItem(r)}</span>
            <span>{r === 0 ? ed().pvYourAvg : '4.2'}</span>
            <span>{r === 0 ? ed().pvClassAvg : '3.9'}</span>
          </div>
        ))}
      </div>
    );
  if (b.dataKind === 'chart') {
    // 用輸出同一套畫法，畫一張示範資料的圖：類型、參考線、顏色改了立刻看得到
    const r = buildChart(b.chartType, b.compareLine === true, SAMPLE_CHART, chartText(), { w: 440, palette: chartPalette(b.colors, PAPER) });
    return <div class="ph-svg" role="img" aria-label={ed().pvChartAlt} dangerouslySetInnerHTML={{ __html: r.svg }} />;
  }
  return (
    <div class="ph ph-lines" role="img" aria-label={ed().pvLinesAlt}>
      <i />
      <i />
      <i style={{ width: '60%' }} />
    </div>
  );
}

function Block({ b, c }: { b: EBlock; c: Ctx }) {
  const [editing, setEditing] = useState(false);
  const sel = c.sel === b.id;
  const pad = { marginTop: px(b.before ?? 0, c.s), marginBottom: px(b.after ?? 0, c.s) };
  let body;
  switch (b.kind) {
    case 'heading':
    case 'text': {
      const style = { fontSize: px(b.size, c.s), color: b.color, background: b.kind === 'text' ? b.bg : undefined, fontWeight: b.kind === 'heading' ? 700 : 400, lineHeight: 1.5 };
      body = editing ? (
        <textarea
          class="inline-edit"
          style={style}
          value={b.text}
          autoFocus
          aria-label={ed().pvDirect}
          onInput={(e) => c.onText(b.id, (e.currentTarget as HTMLTextAreaElement).value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        />
      ) : (
        <div style={style} class="eb-text" onDblClick={() => c.interactive && setEditing(true)}>
          {fillVars(b.text, c.vars) || ed().pvBlank}
        </div>
      );
      break;
    }
    case 'bullets':
      body = (
        <ul class="eb-ul" style={{ fontSize: px(b.size, c.s) }}>
          {(b.slot ? [ed().pvComments] : b.items).map((it, i) => (
            <li key={i}>{fillVars(it, c.vars)}</li>
          ))}
        </ul>
      );
      break;
    case 'data':
      body = <Placeholder b={b} s={c.s} />;
      break;
    case 'image': {
      const src = c.images[b.src];
      body = src ? (
        <img src={src} alt="" style={{ width: px(b.w, c.s), height: px(b.h, c.s) }} />
      ) : (
        <div class="ph ph-img" style={{ width: px(b.w, c.s), height: px(b.h, c.s) }}>
          {ed().pvNoImage}
        </div>
      );
      break;
    }
    case 'divider':
      body = <hr class="eb-hr" />;
      break;
    case 'pageBreak':
      body = <div class="eb-break">{ed().nPageBreak}</div>;
      break;
    case 'hero':
      body = (
        <div class="eb-hero" style={{ background: b.fill ?? 'var(--doc-accent)', padding: px(16, c.s) }}>
          <strong style={{ fontSize: px(20, c.s) }}>{fillVars(b.title, c.vars) || ed().pvBigTitle}</strong>
          {b.subtitle && <div style={{ fontSize: px(11, c.s) }}>{fillVars(b.subtitle, c.vars)}</div>}
        </div>
      );
      break;
    case 'stats': {
      const shown = b.items;
      body = (
        <div class="eb-stats" style={{ gridTemplateColumns: `repeat(${Math.max(1, b.perRow)}, 1fr)` }}>
          {shown.map((k) => (
            <div key={k} class="eb-stat" style={{ background: b.fill ?? 'var(--doc-blue-soft)', padding: px(8, c.s) }}>
              <strong style={{ fontSize: px(20, c.s) }}>{c.vars[STAT_KEYS[k].varName] || '—'}</strong>
              <span style={{ fontSize: px(10, c.s) }}>{statLabelUi(k)}{k === 'rank' ? ed().pvNoRank : ''}</span>
            </div>
          ))}
        </div>
      );
      break;
    }
    case 'callout':
      body = (
        <div class={`eb-callout ${b.tone}`} style={{ padding: px(10, c.s) }}>
          <strong style={{ fontSize: px(11, c.s) }}>{fillVars(b.title, c.vars)}</strong>
          <div style={{ fontSize: px(11, c.s) }}>{b.slot ? ed().pvPraise : fillVars(b.text, c.vars)}</div>
        </div>
      );
      break;
    case 'compare':
      body = (
        <div class="ph ph-lines" role="img" aria-label={ed().pvCompareAlt}>
          {ed().pvCompareText}
        </div>
      );
      break;
    case 'columns':
      body = (
        <div class="eb-cols">
          {b.cols.map((col, i) => (
            <div key={i} class="eb-col">
              {col.length ? col.map((x) => <Block key={x.id} b={x} c={c} />) : <div class="eb-empty">{ed().pvEmptyCol}</div>}
            </div>
          ))}
        </div>
      );
      break;
  }
  const mark = c.drag?.target === b.id ? ` drop-${c.drag.before ? 'before' : 'after'}` : '';
  return (
    <div
      class={`eb${sel ? ' sel' : ''}${b.when ? ' cond' : ''}${c.drag?.id === b.id ? ' lift' : ''}${mark}`}
      data-bid={b.id}
      style={pad}
      onClick={(e) => {
        if (!c.interactive) return;
        e.stopPropagation();
        c.onSelect(b.id);
      }}
    >
      {sel && c.grip && c.interactive && (
        <span class="pv-grip" role="button" aria-label={ed().pvDrag} {...(c.grip(b.id) as object)}>
          ⋮⋮
        </span>
      )}
      {b.when && <span class="eb-tag">{describeCondition(b.when)}</span>}
      {body}
    </div>
  );
}

export function Preview(props: {
  t: EditorTemplate;
  /** 每 pt 幾個 CSS px；省略時符合容器寬度。 */
  scale?: number;
  /** 符合寬度的倍率（縮放用）。 */
  factor?: number;
  sel?: string | null;
  interactive?: boolean;
  vars?: Record<string, string>;
  images?: Record<string, string>;
  onSelect?: (id: string | null) => void;
  onText?: (id: string, text: string) => void;
  grip?: (id: string) => object;
  drag?: DragInfo | null;
  /** 縮圖：不要互動。 */
  thumb?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (props.scale !== undefined || !box.current) return;
    const el = box.current;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [props.scale]);
  const p = props.t.page;
  const dim = PAGE_SIZES[p.size];
  const pw = p.orientation === 'landscape' ? dim.h : dim.w;
  const ph = p.orientation === 'landscape' ? dim.w : dim.h;
  // 縮圖：整張紙以 1pt＝1px 畫出，再用同一個 transform: scale 整體縮小；文字不另設縮小後的像素字級（太小的字級會被瀏覽器的最小字級放大，蓋住縮圖）
  const thumbK = props.thumb ? (props.scale ?? (w ? w / pw : 0.2)) : 1;
  const s = props.thumb ? 1 : (props.scale ?? (w ? (w / pw) * (props.factor ?? 1) : 0.5));
  const vars = { ...SAMPLE_VARS, ...(props.vars ?? {}) };
  const ctx: Ctx = {
    s,
    sel: props.sel ?? null,
    interactive: props.interactive ?? false,
    vars,
    images: props.images ?? {},
    onSelect: (id) => props.onSelect?.(id),
    onText: (id, t) => props.onText?.(id, t),
    ...(props.grip ? { grip: props.grip } : {}),
    drag: props.drag ?? null,
  };
  // 縮圖一定要寫 'px' 字串：數字的 width／height 在這裡不會套用（紙張會變成撐滿容器），縮圖才會跑版
  const dimv = (n: number): number | string => (props.thumb ? `${n}px` : n);
  const paper = (
    <div
      class="pv-page doc-warm"
      style={{
        width: dimv(pw * s),
        minHeight: dimv(ph * s),
        padding: `${p.mt * s}px ${p.mx * s}px ${p.mb * s}px`,
        background: p.background ?? 'var(--doc-card)',
        border: p.frame ? `${Math.max(1, p.frame.width * s)}px solid ${p.frame.color}` : undefined,
        borderRadius: p.frame?.rounded ? dimv(12 * s) : 0,
      }}
    >
      {p.logoSrc && ctx.images[p.logoSrc] && <img class="pv-logo" src={ctx.images[p.logoSrc]} alt="" style={{ height: dimv(36 * s) }} />}
      {props.t.blocks.map((b) => (
        <Block key={b.id} b={b} c={ctx} />
      ))}
      <div class="pv-foot" style={{ fontSize: 9 * s }}>
        {fillVars(p.footerText, vars)}｜{ed().pvPage1}
      </div>
    </div>
  );
  return (
    <div class={`pv-box${props.thumb ? ' thumb' : ''}`} ref={box} onClick={() => props.interactive && props.onSelect?.(null)}>
      {props.thumb ? (
        <div class="pv-thumb" style={{ width: `${pw * thumbK}px`, height: `${ph * thumbK}px` }}>
          <div style={{ width: `${pw}px`, transform: `scale(${thumbK})`, transformOrigin: '0 0' }}>{paper}</div>
        </div>
      ) : (
        paper
      )}
    </div>
  );
}
