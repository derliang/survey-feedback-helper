// 屬性面板：依區塊類型顯示；分段控制、籌碼與開關為主，不需要輸入數字（手機友善）。
import { blockNameUi, ed, statLabelUi } from '../strings-editor';
import { useRef } from 'preact/hooks';
import { describeCondition } from '../../editor/condition';
import { listOverrides, withoutBlockPart } from '../../editor/overrides';
import { wordNotes } from '../../editor/word';
import type { Condition, EBlock, EBlockKind, EditorTemplate, ReportVersion } from '../../editor/types';
import { STAT_KEYS, type StatKey } from '../../editor/types';
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
const VERSIONS = (): [ReportVersion, string][] => [
  ['teacher', ed().verTeacher],
  ['student', ed().verStudent],
  ['parent', ed().verParent],
];
const PALETTES = (): [string, string, string[]][] => [
  ['default', ed().dflt, []],
  ['warm', ed().palWarm, ['#cf5f12', '#eaa06a', '#b3367a']],
  ['blue', ed().palBlue, ['#2554d8', '#7f9be3', '#1b3fa6']],
  ['gray', ed().palGray, ['#222222', '#7b8494', '#c9ced8']],
];
const BGS = (): [string, string][] => [
  ['', ed().none],
  ['#fff6d6', ed().lightYellow],
  ['#e7edff', ed().lightBlue],
  ['#dcf1e3', ed().lightGreen],
];
const CHARTS = (): [string, string][] => [
  ['bar', ed().chBar],
  ['compare', ed().chCompare],
  ['dist', ed().chDist],
  ['stacked', ed().chStacked],
];

function CondEditor({ b, disabled }: { b: EBlock; disabled: boolean }) {
  const w = b.when;
  const mode = !w ? 'always' : w.kind === 'version' ? 'version' : 'var';
  const set = (c: Condition | undefined) => patchBlock(b.id, { when: c });
  return (
    <div class="field">
      <span class="label">{ed().condLabel}</span>
      <div class="seg" role="group" aria-label={ed().condLabel}>
        {(
          [
            ['always', ed().condAlways],
            ['version', ed().condVersion],
            ['var', ed().condVar],
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
          {VERSIONS().map(([v, n]) => {
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
          <select class="input" aria-label={ed().condWhich} disabled={disabled} value={w.name} onChange={(e) => set({ ...w, name: (e.currentTarget as HTMLSelectElement).value })}>
            {VAR_NAMES.map((n) => (
              <option key={n} value={n}>{`{${n}}`}</option>
            ))}
          </select>
          <select class="input" aria-label={ed().condCond} disabled={disabled} value={w.op} onChange={(e) => set({ ...w, op: (e.currentTarget as HTMLSelectElement).value as 'nonEmpty' | 'empty' })}>
            <option value="nonEmpty">{ed().condNonEmpty}</option>
            <option value="empty">{ed().condEmpty}</option>
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
      <h3 class="props-h">{blockNameUi(b)}</h3>
      {student && (
        <p class="hint warn-text">
          {ed().studentOnly(student)}
        </p>
      )}
      {(b.kind === 'heading' || b.kind === 'text') && (
        <>
          <div class="field">
            <label class="label" for="pp-text">
              {ed().content}
            </label>
            <textarea id="pp-text" ref={area} class="input area" rows={4} value={text} onInput={(e) => setP({ text: (e.currentTarget as HTMLTextAreaElement).value }, `text:${b.id}`)} />
          </div>
          <div class="field">
            <span class="label">{ed().insertVars}</span>
            <div class="chips">
              {VAR_NAMES.map((n) => (
                <button key={n} type="button" class="chip" onClick={() => insertVar(n)}>{`{${n}}`}</button>
              ))}
            </div>
          </div>
          <Seg
            label={ed().textSize}
            value={nearest((ov?.patch?.size as number | undefined) ?? b.size, b.kind === 'heading' ? [12, 14, 18] : [10, 11, 13])}
            opts={b.kind === 'heading' ? [[12, ed().small], [14, ed().medium], [18, ed().large]] : [[10, ed().small], [11, ed().medium], [13, ed().large]]}
            onPick={(v) => setP({ size: v })}
          />
          {b.kind === 'text' && (
            <div class="field">
              <span class="label">{ed().bg}</span>
              <div class="chips">
                {BGS().map(([c, n]) => {
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
            {ed().bulletItems}
          </label>
          {b.slot ? (
            <p class="hint">{ed().bulletAuto}</p>
          ) : (
            <textarea id="pp-items" class="input area" rows={5} value={((ov?.patch?.items as string[] | undefined) ?? b.items).join('\n')} onInput={(e) => setP({ items: (e.currentTarget as HTMLTextAreaElement).value.split('\n') }, `items:${b.id}`)} />
          )}
        </div>
      )}
      {b.kind === 'data' && b.dataKind === 'chart' && (
        <>
          <Seg label={ed().chartType} value={(((ov?.patch?.chartType as string | undefined) ?? b.chartType) ?? 'bar')} opts={CHARTS()} onPick={(v) => setP({ chartType: v })} />
          <div class="field">
            <span class="label">{ed().color}</span>
            <div class="chips">
              {PALETTES().map(([k, n, cols]) => {
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
          <Toggle label={ed().compareLine} on={((ov?.patch?.compareLine as boolean | undefined) ?? b.compareLine) ?? false} onChange={(v) => setP({ compareLine: v })} />
        </>
      )}
      {b.kind === 'hero' && (
        <>
          <TextField id="pp-hero-t" label={ed().heroTitle} value={b.title} onInput={(v) => patchBlock(b.id, { title: v }, `title:${b.id}`)} />
          <TextField id="pp-hero-s" label={ed().heroSub} value={b.subtitle} onInput={(v) => patchBlock(b.id, { subtitle: v }, `sub:${b.id}`)} />
          <Swatches label={ed().heroFill} value={b.fill ?? ''} opts={HERO_FILLS()} onPick={(fill) => patchBlock(b.id, { fill: fill || undefined })} />
        </>
      )}
      {b.kind === 'stats' && (
        <>
          <div class="field">
            <span class="label">{ed().statsShow}</span>
            <div class="chips">
              {(Object.keys(STAT_KEYS) as StatKey[]).map((k) => {
                const on = b.items.includes(k);
                return (
                  <button key={k} type="button" class={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => patchBlock(b.id, { items: on ? b.items.filter((x) => x !== k) : [...b.items, k] })}>
                    {statLabelUi(k)}
                  </button>
                );
              })}
            </div>
            <p class="hint">{ed().statsHint}</p>
          </div>
          <Seg label={ed().perRow} value={b.perRow} opts={[[2, '2'], [3, '3'], [4, '4']]} onPick={(perRow) => patchBlock(b.id, { perRow })} />
          <Swatches label={ed().bg} value={b.fill ?? ''} opts={STAT_FILLS()} onPick={(fill) => patchBlock(b.id, { fill: fill || undefined })} />
        </>
      )}
      {b.kind === 'callout' && (
        <>
          <Seg label={ed().tone} value={b.tone} opts={[['praise', ed().praise], ['hint', ed().hint]]} onPick={(tone) => patchBlock(b.id, { tone })} />
          <TextField id="pp-co-t" label={ed().smallTitle} value={b.title} onInput={(v) => patchBlock(b.id, { title: v }, `ctitle:${b.id}`)} />
          {b.slot ? (
            <p class="hint">{ed().calloutAuto}</p>
          ) : (
            <TextField id="pp-co-x" label={ed().content} value={b.text} onInput={(v) => patchBlock(b.id, { text: v }, `ctext:${b.id}`)} />
          )}
        </>
      )}
      {b.kind === 'compare' && <p class="hint">{ed().compareHint}</p>}
      {b.kind === 'data' && b.dataKind !== 'chart' && <p class="hint">{ed().dataHint}</p>}
      {b.kind === 'image' && !student && <ImageProps b={b} images={props.images} />}
      {b.kind === 'columns' && !student && (
        <Seg label={ed().cols} value={b.cols.length} opts={[[2, ed().cols2], [3, ed().cols3], [4, ed().cols4]]} onPick={(n) => columnCount(b.id, n)} />
      )}
      {!student && <Seg label={ed().spaceBelow} value={nearest(b.after ?? 0, [0, 6, 12, 20])} opts={[[0, ed().none], [6, ed().small], [12, ed().medium], [20, ed().large]]} onPick={(v) => patchBlock(b.id, { after: v })} />}
      <CondEditor b={b} disabled={student !== null} />
      {notes.map((n) => (
        <p key={n.note} class="word-note">
          {n.note}
        </p>
      ))}
      {student ? (
        <div class="field">
          <button type="button" class={`btn secondary${ov?.hidden ? ' on' : ''}`} onClick={() => overrideBlock(b.id, { ...ov, hidden: !ov?.hidden })}>
            {ov?.hidden ? ed().studentShow : ed().studentHide}
          </button>
        </div>
      ) : (
        <div class="btn-row">
          <button type="button" class="btn secondary" onClick={() => moveSel(b.id, -1)}>
            {ed().up}
          </button>
          <button type="button" class="btn secondary" onClick={() => moveSel(b.id, 1)}>
            {ed().down}
          </button>
          <button type="button" class="btn secondary" onClick={() => dupBlock(b.id)}>
            {ed().dup}
          </button>
          <button type="button" class="btn danger" onClick={() => deleteBlock(b.id)}>
            {ed().del}
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
        <span class="label">{ed().image}</span>
        <label class="btn secondary">
          {images[b.src] ? ed().changeImage : ed().chooseImage}
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
      <Seg label={ed().sizeLabel} value={nearest(b.w, [60, 120, 200])} opts={[[60, ed().small], [120, ed().medium], [200, ed().large]]} onPick={(w) => patchBlock(b.id, { w, h: Math.round((w * b.h) / b.w) })} />
      <Toggle label={ed().isLogo} on={b.isLogo ?? false} onChange={(v) => patchBlock(b.id, { isLogo: v })} />
    </>
  );
}

const HERO_FILLS = (): [string, string][] => [
  ['', ed().heroOrange],
  ['#1f4e79', ed().cobalt],
  ['#2f6f55', ed().heroGreen],
];
const STAT_FILLS = (): [string, string][] => [
  ['', ed().dflt],
  ['#eef3fa', ed().lightBlue],
  ['#fff1d6', ed().lightYellow],
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

const ADDABLE = (): { name: string; kind: EBlockKind; preset?: Partial<EBlock> }[] => [
  { name: ed().nHeading, kind: 'heading' },
  { name: ed().nText, kind: 'text' },
  { name: ed().nBullets, kind: 'bullets' },
  { name: ed().nTable, kind: 'data', preset: { slot: 'scoreTable', dataKind: 'table', label: '評分表' } as Partial<EBlock> },
  { name: ed().nChart, kind: 'data', preset: { slot: 'chart', dataKind: 'chart', chartType: 'compare', label: '圖表' } as Partial<EBlock> },
  { name: ed().nPraiseList, kind: 'bullets', preset: { slot: 'praise', items: [], label: '同學的話' } as Partial<EBlock> },
  { name: ed().nTeacher, kind: 'text', preset: { text: '{老師評語}', label: '老師評語', when: { kind: 'var', name: '老師評語', op: 'nonEmpty' } } as Partial<EBlock> },
  { name: ed().image, kind: 'image' },
  { name: ed().nDivider, kind: 'divider' },
  { name: ed().nPageBreak, kind: 'pageBreak' },
  { name: ed().nColumns, kind: 'columns' },
];
const ADVANCED = (): { name: string; kind: EBlockKind }[] => [
  { name: ed().nHero, kind: 'hero' },
  { name: ed().nStats, kind: 'stats' },
  { name: ed().nCallout, kind: 'callout' },
  { name: ed().nCompare, kind: 'compare' },
];

export function AddPanel(props: { selName: string | null; onDone: () => void }) {
  return (
    <div class="props">
      <h3 class="props-h">{ed().basicBlocks}</h3>
      <div class="add-grid">
        {ADDABLE().map((a) => (
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
      <h3 class="props-h">{ed().advBlocks}</h3>
      <div class="add-grid">
        {ADVANCED().map((a) => (
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
      <p class="hint">{props.selName ? ed().addedBelow(props.selName) : ed().addedEnd}</p>
    </div>
  );
}

const MARGINS = (): [number, string][] => [
  [28, ed().mNarrow],
  [56.7, ed().medium],
  [72, ed().mWide],
];
const FRAME_COLORS = (): [string, string][] => [
  ['#1f4e79', ed().cobalt],
  ['#3d4450', ed().graphite],
  ['#7a5230', ed().brown],
];
const FRAME_WIDTHS = (): [number, string][] => [
  [0.75, ed().thin],
  [1.5, ed().medium],
  [3, ed().thick],
];
const PAGE_BGS = (): [string, string][] => [
  ['', ed().white],
  ['#fffaf0', ed().warmWhite],
  ['#f2f6ff', ed().lightBlue],
];

export function PagePanel({ t, images }: { t: EditorTemplate; images: Record<string, string> }) {
  const p = t.page;
  const notes = wordNotes(t).filter((n) => n.target === 'page');
  return (
    <div class="props">
      <Seg label={ed().paper} value={p.size} opts={[['A4', 'A4'], ['A5', 'A5'], ['Letter', 'Letter']]} onPick={(size) => patchPage({ size })} />
      <Seg label={ed().orient} value={p.orientation} opts={[['portrait', ed().portrait], ['landscape', ed().landscape]]} onPick={(orientation) => patchPage({ orientation })} />
      <Seg label={ed().margins} value={nearest(p.mx, [28, 56.7, 72])} opts={MARGINS()} onPick={(m) => patchPage({ mx: m, mt: m, mb: m + 14 })} />
      <div class="field">
        <span class="label">{ed().pageBg}</span>
        <div class="chips">
          {PAGE_BGS().map(([c, n]) => (
            <button key={n} type="button" class={`chip${(p.background ?? '') === c ? ' on' : ''}`} aria-pressed={(p.background ?? '') === c} onClick={() => patchPage({ background: c || undefined })}>
              {c && <i class="sw" style={{ background: c }} />}
              {n}
            </button>
          ))}
        </div>
      </div>
      <Toggle label={ed().frame} on={!!p.frame} onChange={(v) => patchPage({ frame: v ? { color: '#1f4e79', width: 1.5, rounded: false } : undefined })} />
      {p.frame && (
        <>
          <Seg label={ed().frameColor} value={p.frame.color} opts={FRAME_COLORS()} onPick={(color) => patchPage({ frame: { ...p.frame!, color } })} />
          <Seg label={ed().frameWidth} value={nearest(p.frame.width, [0.75, 1.5, 3])} opts={FRAME_WIDTHS()} onPick={(width) => patchPage({ frame: { ...p.frame!, width } })} />
          <Toggle label={ed().frameRound} on={p.frame.rounded} onChange={(rounded) => patchPage({ frame: { ...p.frame!, rounded } })} />
        </>
      )}
      <div class="field">
        <label class="label" for="pg-foot">
          {ed().footerText}
        </label>
        <input id="pg-foot" class="input" value={p.footerText} onInput={(e) => patchPage({ footerText: (e.currentTarget as HTMLInputElement).value })} />
      </div>
      <div class="field">
        <span class="label">{ed().schoolLogo}</span>
        <div class="btn-row">
          <label class="btn secondary">
            {p.logoSrc && images[p.logoSrc] ? ed().changeShort : ed().chooseImage}
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
              {ed().remove}
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
      <p class="hint">{ed().pickStudentHint}</p>
      <div class="opt-list">
        <button type="button" class={`opt${props.student === null ? ' on' : ''}`} onClick={() => pickStudent(null)}>
          {ed().classTemplate}
        </button>
        {props.students.map((s) => (
          <button key={s.key} type="button" class={`opt${props.student === s.key ? ' on' : ''}`} onClick={() => pickStudent(s.key)}>
            {s.name}
            {m[s.key] && <span class="tag">{ed().indivVer}</span>}
          </button>
        ))}
      </div>
      {props.student && (
        <div class="field">
          <span class="label">{ed().changedItems}</span>
          {items.length === 0 && <p class="hint">{ed().noChanges}</p>}
          <ul class="plain-ul">
            {items.map((it, i) => (
              <li key={i} class="ov-row">
                <span>
                  {it.label}：{it.what}
                </span>
                <button type="button" class="btn ghost small" onClick={() => (it.kind === 'block' && it.part ? overrideBlock(it.id, withoutBlockPart(m[props.student!]?.blocks[it.id], it.part)) : overrideVar(it.id, undefined))}>
                  {ed().restore}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
