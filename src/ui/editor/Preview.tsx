// 頁面預覽：直接畫範本（不是輸出檔），每個區塊可選取、可雙擊改字。資料區塊畫示意（真正的數字在輸出時才填）。
import { useEffect, useRef, useState } from 'preact/hooks';
import { fillVars } from '../../export/model';
import { describeCondition } from '../../editor/condition';
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
}

function Placeholder({ b, s }: { b: DataEB; s: number }) {
  const colors = b.colors?.length ? b.colors : ['var(--d1)', 'var(--d2)', 'var(--d3)'];
  if (b.dataKind === 'table')
    return (
      <div class="ph ph-table" style={{ fontSize: px(9, s) }}>
        {[0, 1, 2, 3].map((r) => (
          <div key={r} class={r === 0 ? 'ph-head' : ''}>
            <span>{r === 0 ? '向度' : `項目 ${r}`}</span>
            <span>{r === 0 ? '你的平均' : '4.2'}</span>
            <span>{r === 0 ? '班級平均' : '3.9'}</span>
          </div>
        ))}
      </div>
    );
  if (b.dataKind === 'chart')
    return (
      <div class="ph ph-chart" style={{ height: px(90, s) }} role="img" aria-label="圖表示意">
        {[70, 55, 85, 62].map((h, i) => (
          <i key={i} style={{ height: `${h}%`, background: colors[i % colors.length] }} />
        ))}
      </div>
    );
  return (
    <div class="ph ph-lines" role="img" aria-label="留言示意">
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
          aria-label="直接改文字"
          onInput={(e) => c.onText(b.id, (e.currentTarget as HTMLTextAreaElement).value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        />
      ) : (
        <div style={style} class="eb-text" onDblClick={() => c.interactive && setEditing(true)}>
          {fillVars(b.text, c.vars) || '（空白）'}
        </div>
      );
      break;
    }
    case 'bullets':
      body = (
        <ul class="eb-ul" style={{ fontSize: px(b.size, c.s) }}>
          {(b.slot ? ['（同學的留言會出現在這裡）'] : b.items).map((it, i) => (
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
          未選圖片
        </div>
      );
      break;
    }
    case 'divider':
      body = <hr class="eb-hr" />;
      break;
    case 'pageBreak':
      body = <div class="eb-break">分頁線</div>;
      break;
    case 'hero':
      body = (
        <div class="eb-hero" style={{ background: b.fill ?? '#a84f00', padding: px(16, c.s) }}>
          <strong style={{ fontSize: px(20, c.s) }}>{fillVars(b.title, c.vars) || '（大標）'}</strong>
          {b.subtitle && <div style={{ fontSize: px(11, c.s) }}>{fillVars(b.subtitle, c.vars)}</div>}
        </div>
      );
      break;
    case 'stats': {
      const shown = b.items;
      body = (
        <div class="eb-stats" style={{ gridTemplateColumns: `repeat(${Math.max(1, b.perRow)}, 1fr)` }}>
          {shown.map((k) => (
            <div key={k} class="eb-stat" style={{ background: b.fill ?? '#eef3fa', padding: px(8, c.s) }}>
              <strong style={{ fontSize: px(20, c.s) }}>{c.vars[STAT_KEYS[k].varName] || '—'}</strong>
              <span style={{ fontSize: px(10, c.s) }}>{STAT_KEYS[k].label}{k === 'rank' ? '（學生版隱藏）' : ''}</span>
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
          <div style={{ fontSize: px(11, c.s) }}>{b.slot ? '（同學的優點留言會出現在這裡）' : fillVars(b.text, c.vars)}</div>
        </div>
      );
      break;
    case 'compare':
      body = (
        <div class="ph ph-lines" role="img" aria-label="自評對照表示意">
          自評對照表（同學給的、自己給的、落差）
        </div>
      );
      break;
    case 'columns':
      body = (
        <div class="eb-cols">
          {b.cols.map((col, i) => (
            <div key={i} class="eb-col">
              {col.length ? col.map((x) => <Block key={x.id} b={x} c={c} />) : <div class="eb-empty">空的欄</div>}
            </div>
          ))}
        </div>
      );
      break;
  }
  return (
    <div
      class={`eb${sel ? ' sel' : ''}${b.when ? ' cond' : ''}`}
      data-bid={b.id}
      style={pad}
      onClick={(e) => {
        if (!c.interactive) return;
        e.stopPropagation();
        c.onSelect(b.id);
      }}
    >
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
  const s = props.scale ?? (w ? (w / pw) * (props.factor ?? 1) : 0.5);
  const vars = { ...SAMPLE_VARS, ...(props.vars ?? {}) };
  const ctx: Ctx = {
    s,
    sel: props.sel ?? null,
    interactive: props.interactive ?? false,
    vars,
    images: props.images ?? {},
    onSelect: (id) => props.onSelect?.(id),
    onText: (id, t) => props.onText?.(id, t),
  };
  return (
    <div class={`pv-box${props.thumb ? ' thumb' : ''}`} ref={box} onClick={() => props.interactive && props.onSelect?.(null)}>
      <div
        class="pv-page"
        style={{
          width: pw * s,
          minHeight: ph * s,
          padding: `${p.mt * s}px ${p.mx * s}px ${p.mb * s}px`,
          background: p.background ?? '#fff',
          border: p.frame ? `${Math.max(1, p.frame.width * s)}px solid ${p.frame.color}` : undefined,
          borderRadius: p.frame?.rounded ? 12 * s : 0,
        }}
      >
        {p.logoSrc && ctx.images[p.logoSrc] && <img class="pv-logo" src={ctx.images[p.logoSrc]} alt="" style={{ height: 36 * s }} />}
        {props.t.blocks.map((b) => (
          <Block key={b.id} b={b} c={ctx} />
        ))}
        <div class="pv-foot" style={{ fontSize: 9 * s }}>
          {fillVars(p.footerText, vars)}｜第 1 頁
        </div>
      </div>
    </div>
  );
}
