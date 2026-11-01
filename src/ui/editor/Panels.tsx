// 屬性面板：依區塊類型顯示；分段控制、籌碼與開關為主，不需要輸入數字（手機友善）。
import { useRef } from 'preact/hooks';
import { describeCondition } from '../../editor/condition';
import { listOverrides } from '../../editor/overrides';
import { wordNotes } from '../../editor/word';
import type { Condition, EBlock, EBlockKind, EditorTemplate, ReportVersion } from '../../editor/types';
import { KIND_NAMES, STAT_KEYS, type StatKey } from '../../editor/types';
import { addBlock, addImage, columnCount, currentOverrides, deleteBlock, dupBlock, moveSel, overrideBlock, overrideVar, patchBlock, patchPage, pickStudent } from './state';
import { VAR_NAMES } from './Preview';

type Pat = Record<string, unknown>;

function Seg<T extends string | number>(props: { label: string; value: T; opts: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div class="field">
      <span class="label">{props.label}</span>
      <div class="seg" role="group" aria-label={props.label}>
        {props.opts.map(([v, n]) => (
          <button key={String(v)} type="button" class={v === props.value ? 'on' : ''} aria-pressed={v === props.value} onClick={() => props.onPick(v)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle(props: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="check">
      <input type="checkbox" checked={props.on} onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)} />
      <span>{props.label}</span>
    </label>
  );
}

const nearest = (v: number, opts: number[]) => opts.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
const VERSIONS: [ReportVersion, string][] = [
  ['teacher', '教師版'],
  ['student', '學生版'],
  ['parent', '家長版'],
];
const PALETTES: [string, string, string[]][] = [
  ['default', '預設', []],
  ['warm', '暖色', ['#cf5f12', '#eaa06a', '#b3367a']],
  ['blue', '藍系', ['#2554d8', '#7f9be3', '#1b3fa6']],
  ['gray', '黑白列印', ['#222222', '#7b8494', '#c9ced8']],
];
const BGS: [string, string][] = [
  ['', '無'],
  ['#fff6d6', '淡黃'],
  ['#e7edff', '淡藍'],
  ['#dcf1e3', '淡綠'],
];
const CHARTS: [string, string][] = [
  ['bar', '長條'],
  ['compare', '對照條'],
  ['dist', '分布'],
  ['stacked', '堆疊'],
];

function CondEditor({ b, disabled }: { b: EBlock; disabled: boolean }) {
  const w = b.when;
  const mode = !w ? 'always' : w.kind === 'version' ? 'version' : 'var';
  const set = (c: Condition | undefined) => patchBlock(b.id, { when: c });
  return (
    <div class="field">
      <span class="label">條件顯示</span>
      <div class="seg" role="group" aria-label="條件顯示">
        {(
          [
            ['always', '一律'],
            ['version', '依版本'],
            ['var', '依內容'],
          ] as const
        ).map(([m, n]) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            class={m === mode ? 'on' : ''}
            aria-pressed={m === mode}
            onClick={() => set(m === 'always' ? undefined : m === 'version' ? { kind: 'version', is: ['teacher'] } : { kind: 'var', name: '老師評語', op: 'nonEmpty' })}
          >
            {n}
          </button>
        ))}
      </div>
      {w?.kind === 'version' && (
        <div class="chips">
          {VERSIONS.map(([v, n]) => {
            const on = w.is.includes(v);
            return (
              <button
                key={v}
                type="button"
                class={`chip${on ? ' on' : ''}`}
                aria-pressed={on}
                disabled={disabled}
                onClick={() => {
                  const is = on ? w.is.filter((x) => x !== v) : [...w.is, v];
                  set(is.length ? { kind: 'version', is } : undefined);
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
      {w?.kind === 'var' && (
        <div class="chips">
          <select class="input" aria-label="哪個內容" disabled={disabled} value={w.name} onChange={(e) => set({ ...w, name: (e.currentTarget as HTMLSelectElement).value })}>
            {VAR_NAMES.map((n) => (
              <option key={n} value={n}>{`{${n}}`}</option>
            ))}
          </select>
          <select class="input" aria-label="條件" disabled={disabled} value={w.op} onChange={(e) => set({ ...w, op: (e.currentTarget as HTMLSelectElement).value as 'nonEmpty' | 'empty' })}>
            <option value="nonEmpty">有內容時</option>
            <option value="empty">沒有內容時</option>
          </select>
        </div>
      )}
      <p class="hint">{describeCondition(w)}</p>
    </div>
  );
}

export function BlockProps(props: { t: EditorTemplate; b: EBlock; student: string | null; images: Record<string, string> }) {
  const { b, student } = props;
  const area = useRef<HTMLTextAreaElement>(null);
  const ov = student ? currentOverrides()[student]?.blocks[b.id] : undefined;
  // 個別學生模式：修改記在這位學生身上；否則改範本
  const setP = (patch: Pat, key?: string) => (student ? overrideBlock(b.id, { ...ov, patch: { ...(ov?.patch ?? {}), ...patch } }) : patchBlock(b.id, patch, key));
  const notes = wordNotes(props.t).filter((n) => n.target === b.id);
  const text = (b.kind === 'heading' || b.kind === 'text' ? (ov?.patch?.text as string | undefined) ?? b.text : '') as string;
  const insertVar = (name: string) => {
    const el = area.current;
    const at = el ? el.selectionStart : text.length;
    setP({ text: `${text.slice(0, at)}{${name}}${text.slice(el ? el.selectionEnd : at)}` });
  };
  return (
    <div class="props">
      <h3 class="props-h">{b.label ?? KIND_NAMES[b.kind]}</h3>
      {student && (
        <p class="hint warn-text">
          目前改的是「{student}」的個別版本，不會動到全班範本。
        </p>
      )}
      {(b.kind === 'heading' || b.kind === 'text') && (
        <>
          <div class="field">
            <label class="label" for="pp-text">
              內容
            </label>
            <textarea id="pp-text" ref={area} class="input area" rows={4} value={text} onInput={(e) => setP({ text: (e.currentTarget as HTMLTextAreaElement).value }, `text:${b.id}`)} />
          </div>
          <div class="field">
            <span class="label">插入變數</span>
            <div class="chips">
              {VAR_NAMES.map((n) => (
                <button key={n} type="button" class="chip" onClick={() => insertVar(n)}>{`{${n}}`}</button>
              ))}
            </div>
          </div>
          <Seg
            label="字級"
            value={nearest((ov?.patch?.size as number | undefined) ?? b.size, b.kind === 'heading' ? [12, 14, 18] : [10, 11, 13])}
            opts={b.kind === 'heading' ? [[12, '小'], [14, '中'], [18, '大']] : [[10, '小'], [11, '中'], [13, '大']]}
            onPick={(v) => setP({ size: v })}
          />
          {b.kind === 'text' && (
            <div class="field">
              <span class="label">底色</span>
              <div class="chips">
                {BGS.map(([c, n]) => {
                  const cur = ((ov?.patch?.bg as string | undefined) ?? b.bg ?? '') === c;
                  return (
                    <button key={n} type="button" class={`chip${cur ? ' on' : ''}`} aria-pressed={cur} onClick={() => setP({ bg: c || undefined })}>
                      {c && <i class="sw" style={{ background: c }} />}
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {b.kind === 'bullets' && (
        <div class="field">
          <label class="label" for="pp-items">
            條列項目（一行一項）
          </label>
          {b.slot ? (
            <p class="hint">這一區的項目由統計結果自動填入。</p>
          ) : (
            <textarea id="pp-items" class="input area" rows={5} value={((ov?.patch?.items as string[] | undefined) ?? b.items).join('\n')} onInput={(e) => setP({ items: (e.currentTarget as HTMLTextAreaElement).value.split('\n') }, `items:${b.id}`)} />
          )}
        </div>
      )}
      {b.kind === 'data' && b.dataKind === 'chart' && (
        <>
          <Seg label="圖表類型" value={(((ov?.patch?.chartType as string | undefined) ?? b.chartType) ?? 'bar')} opts={CHARTS} onPick={(v) => setP({ chartType: v })} />
          <div class="field">
            <span class="label">顏色</span>
            <div class="chips">
              {PALETTES.map(([k, n, cols]) => {
                const cur = JSON.stringify((ov?.patch?.colors as string[] | undefined) ?? b.colors ?? []) === JSON.stringify(cols);
                return (
                  <button key={k} type="button" class={`chip${cur ? ' on' : ''}`} aria-pressed={cur} onClick={() => setP({ colors: cols.length ? cols : undefined })}>
                    {cols.map((c) => (
                      <i key={c} class="sw" style={{ background: c }} />
                    ))}
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
          <Toggle label="顯示班級平均線" on={((ov?.patch?.compareLine as boolean | undefined) ?? b.compareLine) ?? false} onChange={(v) => setP({ compareLine: v })} />
        </>
      )}
      {b.kind === 'hero' && (
        <>
          <TextField id="pp-hero-t" label="大標" value={b.title} onInput={(v) => patchBlock(b.id, { title: v }, `title:${b.id}`)} />
          <TextField id="pp-hero-s" label="副標" value={b.subtitle} onInput={(v) => patchBlock(b.id, { subtitle: v }, `sub:${b.id}`)} />
          <Swatches label="色塊底色" value={b.fill ?? ''} opts={HERO_FILLS} onPick={(fill) => patchBlock(b.id, { fill: fill || undefined })} />
        </>
      )}
      {b.kind === 'stats' && (
        <>
          <div class="field">
            <span class="label">顯示哪些數字</span>
            <div class="chips">
              {(Object.keys(STAT_KEYS) as StatKey[]).map((k) => {
                const on = b.items.includes(k);
                return (
                  <button key={k} type="button" class={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => patchBlock(b.id, { items: on ? b.items.filter((x) => x !== k) : [...b.items, k] })}>
                    {STAT_KEYS[k].label}
                  </button>
                );
              })}
            </div>
            <p class="hint">全班名次在學生版與家長版會自動隱藏；統計沒有帶入的數字不會顯示。</p>
          </div>
          <Seg label="每列幾格" value={b.perRow} opts={[[2, '2'], [3, '3'], [4, '4']]} onPick={(perRow) => patchBlock(b.id, { perRow })} />
          <Swatches label="底色" value={b.fill ?? ''} opts={STAT_FILLS} onPick={(fill) => patchBlock(b.id, { fill: fill || undefined })} />
        </>
      )}
      {b.kind === 'callout' && (
        <>
          <Seg label="種類" value={b.tone} opts={[['praise', '稱讚'], ['hint', '提示']]} onPick={(tone) => patchBlock(b.id, { tone })} />
          <TextField id="pp-co-t" label="小標題" value={b.title} onInput={(v) => patchBlock(b.id, { title: v }, `ctitle:${b.id}`)} />
          {b.slot ? (
            <p class="hint">內容由統計結果自動填入（同學的優點留言）。</p>
          ) : (
            <TextField id="pp-co-x" label="內容" value={b.text} onInput={(v) => patchBlock(b.id, { text: v }, `ctext:${b.id}`)} />
          )}
        </>
      )}
      {b.kind === 'compare' && <p class="hint">同學給的分與自己給的分並排，並標出落差。沒有自評資料時不會出現。</p>}
      {b.kind === 'data' && b.dataKind !== 'chart' && <p class="hint">這一區的內容由統計結果自動填入，這裡可以移動、複製或設定條件。</p>}
      {b.kind === 'image' && !student && <ImageProps b={b} images={props.images} />}
      {b.kind === 'columns' && !student && (
        <Seg label="欄數" value={b.cols.length} opts={[[2, '2 欄'], [3, '3 欄'], [4, '4 欄']]} onPick={(n) => columnCount(b.id, n)} />
      )}
      {!student && <Seg label="下方空白" value={nearest(b.after ?? 0, [0, 6, 12, 20])} opts={[[0, '無'], [6, '小'], [12, '中'], [20, '大']]} onPick={(v) => patchBlock(b.id, { after: v })} />}
      <CondEditor b={b} disabled={student !== null} />
      {notes.map((n) => (
        <p key={n.note} class="word-note">
          {n.note}
        </p>
      ))}
      {student ? (
        <div class="field">
          <button type="button" class={`btn secondary${ov?.hidden ? ' on' : ''}`} onClick={() => overrideBlock(b.id, { ...ov, hidden: !ov?.hidden })}>
            {ov?.hidden ? '這位學生：恢復顯示此區塊' : '這位學生：隱藏此區塊'}
          </button>
        </div>
      ) : (
        <div class="btn-row">
          <button type="button" class="btn secondary" onClick={() => moveSel(b.id, -1)}>
            上移
          </button>
          <button type="button" class="btn secondary" onClick={() => moveSel(b.id, 1)}>
            下移
          </button>
          <button type="button" class="btn secondary" onClick={() => dupBlock(b.id)}>
            複製
          </button>
          <button type="button" class="btn danger" onClick={() => deleteBlock(b.id)}>
            刪除
          </button>
        </div>
      )}
    </div>
  );
}

function ImageProps({ b, images }: { b: Extract<EBlock, { kind: 'image' }>; images: Record<string, string> }) {
  return (
    <>
      <div class="field">
        <span class="label">圖片</span>
        <label class="btn secondary">
          {images[b.src] ? '換一張圖片' : '選擇圖片'}
          <input
            type="file"
            accept="image/png,image/jpeg"
            class="sr"
            data-testid="image-input"
            onChange={async (e) => {
              const f = (e.currentTarget as HTMLInputElement).files?.[0];
              if (!f) return;
              const key = await addImage(f);
              if (key) patchBlock(b.id, { src: key });
            }}
          />
        </label>
      </div>
      <Seg label="大小" value={nearest(b.w, [60, 120, 200])} opts={[[60, '小'], [120, '中'], [200, '大']]} onPick={(w) => patchBlock(b.id, { w, h: Math.round((w * b.h) / b.w) })} />
      <Toggle label="這是學校 Logo" on={b.isLogo ?? false} onChange={(v) => patchBlock(b.id, { isLogo: v })} />
    </>
  );
}

const HERO_FILLS: [string, string][] = [
  ['', '暖橘'],
  ['#1f4e79', '鈷藍'],
  ['#2f6f55', '森綠'],
];
const STAT_FILLS: [string, string][] = [
  ['', '預設'],
  ['#eef3fa', '淡藍'],
  ['#fff1d6', '淡黃'],
];

function TextField(props: { id: string; label: string; value: string; onInput: (v: string) => void }) {
  return (
    <div class="field">
      <label class="label" for={props.id}>
        {props.label}
      </label>
      <input id={props.id} class="input" value={props.value} onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)} />
    </div>
  );
}
function Swatches(props: { label: string; value: string; opts: [string, string][]; onPick: (v: string) => void }) {
  return (
    <div class="field">
      <span class="label">{props.label}</span>
      <div class="chips">
        {props.opts.map(([c, n]) => (
          <button key={n} type="button" class={`chip${props.value === c ? ' on' : ''}`} aria-pressed={props.value === c} onClick={() => props.onPick(c)}>
            {c && <i class="sw" style={{ background: c }} />}
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const ADDABLE: { name: string; kind: EBlockKind; preset?: Partial<EBlock> }[] = [
  { name: '標題', kind: 'heading' },
  { name: '文字', kind: 'text' },
  { name: '條列', kind: 'bullets' },
  { name: '統計表', kind: 'data', preset: { slot: 'scoreTable', dataKind: 'table', label: '評分表' } as Partial<EBlock> },
  { name: '圖表', kind: 'data', preset: { slot: 'chart', dataKind: 'chart', chartType: 'compare', label: '圖表' } as Partial<EBlock> },
  { name: '同學的話', kind: 'bullets', preset: { slot: 'praise', items: [], label: '同學的話' } as Partial<EBlock> },
  { name: '老師的話', kind: 'text', preset: { text: '{老師評語}', label: '老師評語', when: { kind: 'var', name: '老師評語', op: 'nonEmpty' } } as Partial<EBlock> },
  { name: '圖片', kind: 'image' },
  { name: '分隔線', kind: 'divider' },
  { name: '分頁線', kind: 'pageBreak' },
  { name: '多欄', kind: 'columns' },
];
const ADVANCED: { name: string; kind: EBlockKind }[] = [
  { name: '標題區', kind: 'hero' },
  { name: '摘要數字列', kind: 'stats' },
  { name: '稱讚提示', kind: 'callout' },
  { name: '自評對照表', kind: 'compare' },
];

export function AddPanel(props: { selName: string | null; onDone: () => void }) {
  return (
    <div class="props">
      <h3 class="props-h">基本區塊</h3>
      <div class="add-grid">
        {ADDABLE.map((a) => (
          <button
            key={a.name}
            type="button"
            class="add-tile"
            onClick={() => {
              addBlock(a.kind, a.preset);
              props.onDone();
            }}
          >
            {a.name}
          </button>
        ))}
      </div>
      <h3 class="props-h">進階區塊</h3>
      <div class="add-grid">
        {ADVANCED.map((a) => (
          <button
            key={a.name}
            type="button"
            class="add-tile"
            onClick={() => {
              addBlock(a.kind);
              props.onDone();
            }}
          >
            {a.name}
          </button>
        ))}
      </div>
      <p class="hint">{props.selName ? `會加在「${props.selName}」的下方。` : '會加在最後面。'}</p>
    </div>
  );
}

const MARGINS: [number, string][] = [
  [28, '窄'],
  [56.7, '中'],
  [72, '寬'],
];
const FRAME_COLORS: [string, string][] = [
  ['#1f4e79', '鈷藍'],
  ['#3d4450', '石墨灰'],
  ['#7a5230', '暖棕'],
];
const FRAME_WIDTHS: [number, string][] = [
  [0.75, '細'],
  [1.5, '中'],
  [3, '粗'],
];
const PAGE_BGS: [string, string][] = [
  ['', '白'],
  ['#fffaf0', '暖白'],
  ['#f2f6ff', '淡藍'],
];

export function PagePanel({ t, images }: { t: EditorTemplate; images: Record<string, string> }) {
  const p = t.page;
  const notes = wordNotes(t).filter((n) => n.target === 'page');
  return (
    <div class="props">
      <Seg label="紙張" value={p.size} opts={[['A4', 'A4'], ['A5', 'A5'], ['Letter', 'Letter']]} onPick={(size) => patchPage({ size })} />
      <Seg label="方向" value={p.orientation} opts={[['portrait', '直式'], ['landscape', '橫式']]} onPick={(orientation) => patchPage({ orientation })} />
      <Seg label="邊界" value={nearest(p.mx, [28, 56.7, 72])} opts={MARGINS} onPick={(m) => patchPage({ mx: m, mt: m, mb: m + 14 })} />
      <div class="field">
        <span class="label">頁面背景</span>
        <div class="chips">
          {PAGE_BGS.map(([c, n]) => (
            <button key={n} type="button" class={`chip${(p.background ?? '') === c ? ' on' : ''}`} aria-pressed={(p.background ?? '') === c} onClick={() => patchPage({ background: c || undefined })}>
              {c && <i class="sw" style={{ background: c }} />}
              {n}
            </button>
          ))}
        </div>
      </div>
      <Toggle label="頁框" on={!!p.frame} onChange={(v) => patchPage({ frame: v ? { color: '#1f4e79', width: 1.5, rounded: false } : undefined })} />
      {p.frame && (
        <>
          <Seg label="頁框顏色" value={p.frame.color} opts={FRAME_COLORS} onPick={(color) => patchPage({ frame: { ...p.frame!, color } })} />
          <Seg label="頁框粗細" value={nearest(p.frame.width, [0.75, 1.5, 3])} opts={FRAME_WIDTHS} onPick={(width) => patchPage({ frame: { ...p.frame!, width } })} />
          <Toggle label="頁框圓角" on={p.frame.rounded} onChange={(rounded) => patchPage({ frame: { ...p.frame!, rounded } })} />
        </>
      )}
      <div class="field">
        <label class="label" for="pg-foot">
          頁尾文字
        </label>
        <input id="pg-foot" class="input" value={p.footerText} onInput={(e) => patchPage({ footerText: (e.currentTarget as HTMLInputElement).value })} />
      </div>
      <div class="field">
        <span class="label">學校 Logo</span>
        <div class="btn-row">
          <label class="btn secondary">
            {p.logoSrc && images[p.logoSrc] ? '換一張' : '選擇圖片'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              class="sr"
              data-testid="logo-input"
              onChange={async (e) => {
                const f = (e.currentTarget as HTMLInputElement).files?.[0];
                if (!f) return;
                const key = await addImage(f);
                if (key) patchPage({ logoSrc: key });
              }}
            />
          </label>
          {p.logoSrc && (
            <button type="button" class="btn ghost" onClick={() => patchPage({ logoSrc: undefined })}>
              移除
            </button>
          )}
        </div>
      </div>
      {notes.map((n) => (
        <p key={n.note} class="word-note">
          {n.label}：{n.note}
        </p>
      ))}
    </div>
  );
}

export function StudentPanel(props: { t: EditorTemplate; students: { key: string; name: string }[]; student: string | null }) {
  const m = currentOverrides();
  const items = listOverrides(props.t, props.student ? m[props.student] : undefined);
  return (
    <div class="props">
      <p class="hint">選一位學生，只改這位學生的版本；其他同學與全班範本不受影響。</p>
      <div class="opt-list">
        <button type="button" class={`opt${props.student === null ? ' on' : ''}`} onClick={() => pickStudent(null)}>
          全班範本
        </button>
        {props.students.map((s) => (
          <button key={s.key} type="button" class={`opt${props.student === s.key ? ' on' : ''}`} onClick={() => pickStudent(s.key)}>
            {s.name}
            {m[s.key] && <span class="tag">個別版本</span>}
          </button>
        ))}
      </div>
      {props.student && (
        <div class="field">
          <span class="label">被改過的項目</span>
          {items.length === 0 && <p class="hint">還沒有。選取區塊後修改，會記在這位學生身上。</p>}
          <ul class="plain-ul">
            {items.map((it, i) => (
              <li key={i} class="ov-row">
                <span>
                  {it.label}：{it.what}
                </span>
                <button type="button" class="btn ghost small" onClick={() => (it.kind === 'block' ? overrideBlock(it.id, {}) : overrideVar(it.id, undefined))}>
                  還原
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
