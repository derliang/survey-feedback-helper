import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Assignment } from '../../core';
import { cleanPrefs } from '../../core';
import { newSeed } from '../../app/analysis';
import {
  type CourseState,
  cannotRun,
  courseApplicants,
  courseIssues,
  courseList,
  courseSummary,
  mergeSuggestions,
  moveTo,
  parseCount,
  personLabel,
  resultStale,
  runAllocation,
  stampTaipei,
} from '../../app/course-app';
import { rosterComparison } from '../../app/progress';
import { go, loadCourse, updateCourse, useApp } from '../../app/store';
import { downloadBytes } from '../../storage';
import { loadXlsx } from '../../export';
import { courseXlsxName, oneCourseSheets } from '../../app/course-out';
import { strings as S } from '../strings';
import { ActBar, Notice, Sheet, useWide } from '../parts/parts';

const C = S.course;
const PENDING = '__pending__';

/** 桌機（寬 ≥ 1024 且有滑鼠）才開放拖曳；其餘一律用「移到…」。 */
function useDesktopMouse(): boolean {
  const q = '(min-width: 1024px) and (pointer: fine)';
  const [on, setOn] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setOn(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return on;
}

function NumInput(props: { value: string; label: string; onChange: (v: string) => void; bad?: boolean; describedBy?: string; testid?: string }) {
  return (
    <input
      class={`input num${props.bad ? ' bad' : ''}`}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={props.label}
      aria-invalid={props.bad ? 'true' : undefined}
      aria-describedby={props.describedBy}
      data-testid={props.testid}
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value.replace(/[^0-9]/g, ''))}
    />
  );
}

function Bar({ value, max, bad }: { value: number; max: number; bad?: boolean }) {
  const w = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div class={`cbar${bad ? ' bad' : ''}`} aria-hidden="true">
      <span style={{ width: `${w}%` }} />
    </div>
  );
}

interface Snapshot {
  result: Assignment[] | null;
  seed: string;
}

/* ───────── 名額與規則 ───────── */

function Rules(props: { onRun: () => void; onBack: () => void; hasResult: boolean }) {
  const st = useApp();
  const wide = useWide();
  const s = st.session!;
  const c = s.course;
  const [prioOpen, setPrioOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const issues = courseIssues(s, c);
  const why = cannotRun(issues);
  const courses = courseList(s, c);
  const { list } = useMemo(() => courseApplicants(s, c), [s, c]);
  const firstOf = (name: string) => list.filter((a) => a.prefs[0] === name).length;
  const merges = mergeSuggestions(s, c);
  const unknown = rosterComparison(s)?.unknown.length ?? 0;
  const set = (patch: Partial<CourseState>) => updateCourse((cur) => ({ ...cur, ...patch }));
  const setCap = (name: string, v: string) => set({ capacity: { ...c.capacity, [name]: v } });
  const setMin = (name: string, v: string) => set({ minSize: { ...c.minSize, [name]: v } });
  const minBad = (name: string) => {
    const m = parseCount(c.minSize[name]);
    return m !== null && m > (parseCount(c.capacity[name]) ?? 0);
  };

  return (
    <div class="course-body course-rules">
      <h2>{C.title}</h2>
      <p class="hint">{C.lead}</p>

      {issues.noPrefCols && (
        <Notice
          kind="bad"
          title={C.noPrefTitle}
          actions={
            <button class="btn secondary small" type="button" onClick={() => go('prepare', 'mapping')}>
              {C.goMapping}
            </button>
          }
        >
          {C.noPrefBody}
        </Notice>
      )}
      {!issues.noPrefCols && issues.shortfall > 0 && issues.missing.length === 0 && <Notice kind="warn">{C.shortfall(issues.totalCap, issues.total, issues.shortfall)}</Notice>}
      {unknown > 0 && (
        <Notice
          kind="info"
          actions={
            <button class="btn secondary small" type="button" onClick={() => go('prepare', 'compare')}>
              {C.seeWho}
            </button>
          }
        >
          {C.outsideRoster(unknown)}
        </Notice>
      )}
      {merges.length > 0 && (
        <Notice kind="warn" title={C.mergeTitle(merges.length)}>
          <span class="merge-list">
            {merges.map((m) => (
              <span key={m.option} class="merge-row" data-testid="merge-row">
                <span>{C.mergeAsk(m.option, m.into)}</span>
                <span class="merge-btns">
                  <button class="btn secondary small" type="button" onClick={() => set({ merges: { ...c.merges, [m.option]: m.into }, result: null })}>
                    {C.merge}
                  </button>
                  <button class="btn ghost small" type="button" onClick={() => set({ declined: [...c.declined, m.option] })}>
                    {C.noMerge}
                  </button>
                </span>
              </span>
            ))}
          </span>
        </Notice>
      )}

      {wide ? (
        <div class="table-wrap">
          <table class="roster-table course-table">
            <thead>
              <tr>
                <th>{C.colCourse}</th>
                <th>{C.colFirst}</th>
                <th>{C.capacity}</th>
                <th>{C.minSizeShort}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((co, i) => (
                <tr key={co.name} class={minBad(co.name) ? 'flag' : ''}>
                  <td>{co.name}</td>
                  <td>{C.people(firstOf(co.name))}</td>
                  <td>
                    <NumInput value={c.capacity[co.name] ?? ''} label={`${co.name} ${C.capacity}`} testid={`cap-${i}`} onChange={(v) => setCap(co.name, v)} />
                  </td>
                  <td>
                    <NumInput
                      value={c.minSize[co.name] ?? ''}
                      label={`${co.name} ${C.minSize}`}
                      bad={minBad(co.name)}
                      testid={`min-${i}`}
                      describedBy={minBad(co.name) ? `minerr-${i}` : undefined}
                      onChange={(v) => setMin(co.name, v)}
                    />
                    {minBad(co.name) && (
                      <span id={`minerr-${i}`} class="field-err">
                        {C.minOver(parseCount(c.capacity[co.name]) ?? 0)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul class="plain-ul">
          {courses.map((co, i) => (
            <li key={co.name} class="card rule-card">
              <div class="rule-head">
                <strong>{co.name}</strong>
                <span class="hint">{C.firstCount(firstOf(co.name))}</span>
              </div>
              <label class="field">
                <span class="label">{C.capacity}</span>
                <NumInput value={c.capacity[co.name] ?? ''} label={`${co.name} ${C.capacity}`} testid={`cap-${i}`} onChange={(v) => setCap(co.name, v)} />
              </label>
              <label class="field">
                <span class="label">{C.minSize}</span>
                <NumInput
                  value={c.minSize[co.name] ?? ''}
                  label={`${co.name} ${C.minSize}`}
                  bad={minBad(co.name)}
                  testid={`min-${i}`}
                  describedBy={minBad(co.name) ? `minerr-${i}` : undefined}
                  onChange={(v) => setMin(co.name, v)}
                />
                {minBad(co.name) && (
                  <span id={`minerr-${i}`} class="field-err">
                    {C.minOver(parseCount(c.capacity[co.name]) ?? 0)}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}

      <button type="button" class="rowbtn" onClick={() => setPrioOpen(true)} data-testid="prio-open">
        <span class="rb-main">
          <strong>{C.priority}</strong>
          <span class="rb-note">{C.priorityHint}</span>
        </span>
        <span class="tag">{C.people(c.priority.length)}</span>
      </button>
      <button type="button" class="rowbtn" onClick={() => setSeedOpen(true)}>
        <span class="rb-main">
          <strong>{C.seed}</strong>
          <span class="rb-note">{C.seedHint}</span>
        </span>
        <span class="tag">{c.seed}</span>
      </button>
      <p class="hint">{C.minNote}</p>

      <ActBar>
        <button class="btn secondary" type="button" onClick={props.onBack}>
          {S.back}
        </button>
        <button class="btn primary grow" type="button" disabled={why !== null} onClick={props.onRun} data-testid="course-start">
          {props.hasResult ? C.rerun : C.start}
        </button>
      </ActBar>
      {why && (
        <p class="hint" data-testid="course-why">
          {C.whyDisabled}
          {why}
        </p>
      )}

      {prioOpen && <PrioritySheet onClose={() => setPrioOpen(false)} />}
      {seedOpen && <SeedSheet onClose={() => setSeedOpen(false)} />}
    </div>
  );
}

function PrioritySheet({ onClose }: { onClose: () => void }) {
  const s = useApp().session!;
  const c = s.course;
  const [q, setQ] = useState('');
  const { list, people } = useMemo(() => courseApplicants(s, c), [s, c]);
  const shown = list.filter((a) => personLabel(people.get(a.id)).includes(q.trim()));
  const toggle = (id: string) =>
    updateCourse((cur) => ({ ...cur, priority: cur.priority.includes(id) ? cur.priority.filter((x) => x !== id) : [...cur.priority, id] }));
  return (
    <Sheet
      title={C.prioTitle(c.priority.length)}
      onClose={onClose}
      footer={
        <button class="btn primary grow" type="button" onClick={onClose}>
          {C.done}
        </button>
      }
    >
      <p class="hint">{C.prioNote}</p>
      <input class="input" type="search" aria-label={C.search} placeholder={C.search} value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      {c.priority.length > 0 && (
        <p class="chosen" data-testid="prio-chosen">
          {C.chosen}
          {c.priority.map((id) => personLabel(people.get(id))).filter(Boolean).join('、')}
        </p>
      )}
      <ul class="plain-ul prio-list">
        {shown.map((a) => (
          <li key={a.id}>
            <label class="check row52">
              <input type="checkbox" checked={c.priority.includes(a.id)} onChange={() => toggle(a.id)} />
              {personLabel(people.get(a.id))}
            </label>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function SeedSheet({ onClose }: { onClose: () => void }) {
  const s = useApp().session!;
  const c = s.course;
  return (
    <Sheet
      title={C.seed}
      onClose={onClose}
      footer={
        <button class="btn primary grow" type="button" onClick={onClose}>
          {C.done}
        </button>
      }
    >
      <p class="hint">{C.seedHint}</p>
      <label class="field">
        <span class="label">{C.seed}</span>
        <input class="input" type="text" value={c.seed} onInput={(e) => updateCourse((cur) => ({ ...cur, seed: e.currentTarget.value }))} />
      </label>
      <button class="btn secondary" type="button" onClick={() => updateCourse((cur) => ({ ...cur, seed: newSeed() }))}>
        {C.newSeed}
      </button>
    </Sheet>
  );
}

/* ───────── 移到… ───────── */

function MoveSheet(props: { id: string; onClose: () => void; onMove: (to: string | null) => void }) {
  const s = useApp().session!;
  const c = s.course;
  const courses = courseList(s, c);
  const { list, people } = useMemo(() => courseApplicants(s, c), [s, c]);
  const sum = courseSummary(s, c)!;
  const me = (c.result ?? []).find((a) => a.id === props.id);
  const prefs = cleanPrefs(list.find((a) => a.id === props.id)?.prefs ?? [], courses);
  const options: (string | null)[] = [...courses.map((x) => x.name), null];
  const current = me?.course ?? null;
  const [pick, setPick] = useState<string | null | undefined>(undefined);
  const cs = (name: string) => sum.courses.find((x) => x.name === name)!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = pick === undefined ? -1 : options.indexOf(pick);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        let n = idx;
        for (let k = 0; k < options.length; k++) {
          n = (n + step + options.length) % options.length;
          if (options[n] !== current) break;
        }
        setPick(options[n] as string | null);
        requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-move-opt][aria-checked="true"]')?.focus());
      } else if (e.key === 'Enter' && pick !== undefined) {
        const t = e.target as HTMLElement;
        if (t.closest('.sheet-foot') && t.tagName === 'BUTTON') return;
        e.preventDefault();
        props.onMove(pick);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const label = personLabel(people.get(props.id));
  const note = (name: string | null): string => {
    if (name === null) return C.pendingNote;
    const x = cs(name);
    const base = `${x.filled}／${x.capacity}`;
    const r = prefs.indexOf(name);
    if (name === current) return `${base} · ${C.here}`;
    if (x.filled >= x.capacity) return `${base} · ${C.fullOver}`;
    return r >= 0 ? `${base} · ${C.hisPick(r + 1)}` : base;
  };
  const target = pick !== undefined && pick !== null ? cs(pick) : null;
  const overBy = target && pick !== current ? target.filled + 1 - target.capacity : 0;

  return (
    <Sheet
      title={current === null ? C.putIn(label) : C.moveTitle(label)}
      onClose={props.onClose}
      footer={
        <button class="btn primary grow" type="button" disabled={pick === undefined} onClick={() => pick !== undefined && props.onMove(pick)} data-testid="move-confirm">
          {pick === undefined ? C.pickFirst : pick === null ? C.moveToPending : C.moveTo(pick)}
        </button>
      }
    >
      <p class="hint">{current === null ? C.nowPending : C.nowIn(current, me?.rank ?? null)}</p>
      <div role="radiogroup" aria-label={C.moveTitle(label)} class="opt-list">
        {options.map((name) => {
          const on = pick === name;
          const here = name === current;
          return (
            <button
              key={name ?? PENDING}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={here}
              disabled={here}
              data-move-opt=""
              class={`opt move-opt${on ? ' on' : ''}`}
              onClick={() => setPick(name)}
            >
              <span class="radio" aria-hidden="true" />
              <span class="mo-main">
                <strong>{name ?? C.pending}</strong>
                <span class="rb-note">{note(name)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {overBy > 0 && target && pick !== null && pick !== undefined && <Notice kind="warn">{C.overNote(pick, target.filled + 1, target.capacity, overBy)}</Notice>}
    </Sheet>
  );
}

/* ───────── 名單 ───────── */

interface RosterProps {
  name: string | null;
  onMove: (id: string) => void;
  onHandle: (e: PointerEvent, id: string) => void;
  dragId: string | null;
  desktop: boolean;
  exportable: boolean;
}

function Roster(props: RosterProps) {
  const s = useApp().session!;
  const c = s.course;
  const { list, people } = useMemo(() => courseApplicants(s, c), [s, c]);
  const sum = courseSummary(s, c)!;
  const rows = (c.result ?? []).filter((a) => a.course === props.name);
  const info = props.name === null ? null : sum.courses.find((x) => x.name === props.name);
  const lost = props.name === null ? 0 : (info?.firstChoice ?? 0) - rows.filter((a) => a.rank === 1).length;
  const pri = new Set(c.priority);
  const [busy, setBusy] = useState(false);
  const exportOne = async () => {
    if (props.name === null) return;
    setBusy(true);
    try {
      const { buildXlsx } = await loadXlsx();
      const sheets = oneCourseSheets(s, props.name);
      downloadBytes(courseXlsxName(s, props.name), buildXlsx(sheets), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="roster-panel" data-testid="roster-panel">
      <div class="roster-head">
        <h3>
          {props.name ?? C.pending} <span class="hint">{props.name === null ? C.people(rows.length) : `${rows.length}／${info?.capacity ?? 0}`}</span>
        </h3>
        {props.name !== null && info && (info.full || info.over > 0) && (
          <span class="tag warn">{info.over > 0 ? C.overTag(info.over) : C.fullTag}</span>
        )}
        {props.exportable && props.name !== null && (
          <button class="btn secondary small" type="button" disabled={busy || rows.length === 0} onClick={() => void exportOne()}>
            {C.exportOne}
          </button>
        )}
      </div>
      {props.name === null ? (
        <p class="hint">{C.pendingLead}</p>
      ) : (
        <p class="hint">{lost > 0 && info ? C.fullLine(info.full, info.firstChoice, lost) : info ? C.firstCount(info.firstChoice) : ''}</p>
      )}
      <ul class="plain-ul srows">
        {rows.length === 0 && <li class="hint">{C.emptyCourse}</li>}
        {rows.map((a) => {
          const reason = a.reason === 'noPrefs' ? C.reasonNone : C.reasonFull;
          return (
            <li key={a.id} class={`srow${props.dragId === a.id ? ' dragging' : ''}`} data-testid="srow" data-id={a.id}>
              {props.desktop && (
                <span class="handle" aria-hidden="true" title={C.dragHint} onPointerDown={(e) => props.onHandle(e as unknown as PointerEvent, a.id)}>
                  ⋮⋮
                </span>
              )}
              <span class="sr-name">{personLabel(people.get(a.id))}</span>
              <span class="sr-tags">
                {props.name === null ? (
                  <span class="tag warn">{reason}</span>
                ) : a.rank === null ? (
                  <span class="tag">{C.notChosen}</span>
                ) : (
                  <span class={`tag${a.rank === 1 ? ' accent' : ''}`}>{C.rankTag(a.rank)}</span>
                )}
                {pri.has(a.id) && <span class="tag ok">{C.priorityTag}</span>}
                {a.manual && <span class="tag warn">{C.manualTag}</span>}
              </span>
              <button class="btn secondary small" type="button" onClick={() => props.onMove(a.id)} aria-label={`${props.name === null ? C.putInBtn : C.moveBtn} ${personLabel(people.get(a.id))}`}>
                {props.name === null ? C.putInBtn : C.moveBtn}
              </button>
            </li>
          );
        })}
      </ul>
      {list.length > 0 && rows.length > 30 && <p class="hint">{C.scrollAll(rows.length)}</p>}
    </div>
  );
}

/* ───────── 結果 ───────── */

function Result(props: { onRules: () => void }) {
  const st = useApp();
  const wide = useWide();
  const desktop = useDesktopMouse();
  const s = st.session!;
  const c = s.course;
  const sum = courseSummary(s, c)!;
  const { list, people } = useMemo(() => courseApplicants(s, c), [s, c]);
  const courses = courseList(s, c);
  const [sel, setSel] = useState<string>(courses[0]?.name ?? PENDING);
  const [panel, setPanel] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [last, setLast] = useState<{ msg: string; prev: Snapshot } | null>(null);
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null);
  const [prioOpen, setPrioOpen] = useState(false);
  const stale = resultStale(s, c);
  const pendingRows = (c.result ?? []).filter((a) => a.course === null);
  const full = pendingRows.filter((a) => a.reason !== 'noPrefs').length;
  const none = pendingRows.length - full;
  const suggest = sum.courses.filter((x) => x.suggestClose);
  const selName = sel === PENDING ? null : sel;

  const rerun = (seed?: string) => {
    const prev: Snapshot = { result: c.result, seed: c.seed };
    updateCourse((cur) => runAllocation(s, seed === undefined ? cur : { ...cur, seed }));
    setLast({ msg: seed === undefined ? C.reran : C.redrew, prev });
  };

  const doMove = (id: string, to: string | null) => {
    const from = (c.result ?? []).find((a) => a.id === id)?.course ?? null;
    if (from === to) return;
    const prev: Snapshot = { result: c.result, seed: c.seed };
    updateCourse((cur) => moveTo(s, cur, id, to));
    setLast({ msg: C.moved(personLabel(people.get(id)), from ?? C.pending, to ?? C.pending), prev });
    setMoving(null);
  };

  const undo = () => {
    if (!last) return;
    const { prev } = last;
    updateCourse((cur) => ({ ...cur, result: prev.result, seed: prev.seed }));
    setLast(null);
  };

  const startDrag = (e: PointerEvent, id: string) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const overAt = (x: number, y: number): string | null => (document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null);
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key);
      setDrag(null);
    };
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      active = true;
      setDrag({ id, over: overAt(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      const over = active ? overAt(ev.clientX, ev.clientY) : null;
      stop();
      if (over !== null) doMove(id, over === PENDING ? null : over);
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') stop();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
  };

  const dropState = (name: string | null): { over: boolean; warn: boolean } => {
    const key = name ?? PENDING;
    if (!drag || drag.over !== key) return { over: false, warn: false };
    const x = name === null ? null : sum.courses.find((k) => k.name === name);
    const cur = (c.result ?? []).find((a) => a.id === drag.id)?.course ?? null;
    return { over: true, warn: !!x && cur !== name && x.filled >= x.capacity };
  };

  const rosterProps = (name: string | null): RosterProps => ({
    name,
    onMove: (id) => setMoving(id),
    onHandle: startDrag,
    dragId: drag?.id ?? null,
    desktop,
    exportable: wide,
  });

  const crow = (co: (typeof sum.courses)[number]) => {
    const ds = dropState(co.name);
    const bad = co.over > 0 || co.suggestClose;
    return (
      <li key={co.name}>
        <button
          type="button"
          class={`crow${sel === co.name ? ' on' : ''}${ds.over ? ' drop-on' : ''}`}
          data-testid="crow"
          data-drop={co.name}
          aria-current={sel === co.name ? 'true' : undefined}
          onClick={() => {
            setSel(co.name);
            if (!wide) setPanel(co.name);
          }}
        >
          <span class="cr-top">
            <strong>{co.name}</strong>
            <span class="cr-tags">
              {co.over > 0 ? <span class="tag warn">{C.overTag(co.over)}</span> : co.full ? <span class="tag">{C.fullTag}</span> : null}
              {co.suggestClose && <span class="tag warn">{C.closeTag(courses.find((k) => k.name === co.name)?.minSize ?? 0)}</span>}
              {ds.warn && <span class="tag warn">{C.dropOver}</span>}
            </span>
            <span class="cr-n">
              {co.filled}／{co.capacity}
            </span>
          </span>
          <Bar value={co.filled} max={co.capacity} bad={bad} />
          <span class="rb-note">
            {C.firstCount(co.firstChoice)}
            {(courses.find((k) => k.name === co.name)?.minSize ?? 0) > 0 && ` · ${C.minLine(courses.find((k) => k.name === co.name)?.minSize ?? 0)}`}
          </span>
        </button>
      </li>
    );
  };

  const pendingRow = (
    <li key={PENDING}>
      <button
        type="button"
        class={`crow${sel === PENDING ? ' on' : ''}${dropState(null).over ? ' drop-on' : ''}`}
        data-testid="crow-pending"
        data-drop={PENDING}
        aria-current={sel === PENDING ? 'true' : undefined}
        onClick={() => {
          setSel(PENDING);
          if (!wide) setPanel(PENDING);
        }}
      >
        <span class="cr-top">
          <strong>{C.pending}</strong>
          <span class="cr-tags">
            <span class={`tag${pendingRows.length > 0 ? ' warn' : ''}`}>{C.people(pendingRows.length)}</span>
          </span>
        </span>
        <span class="rb-note">{C.pendingReasons(full, none)}</span>
      </button>
    </li>
  );

  const rate = Math.round(sum.firstRate * 100);

  return (
    <div class="course-body course-result">
      {stale && (
        <Notice
          kind="warn"
          actions={
            <button class="btn secondary small" type="button" onClick={() => rerun()}>
              {C.rerun}
            </button>
          }
        >
          {C.stale}
        </Notice>
      )}
      <div class="tiles course-tiles">
        <div class="tile" data-testid="tile-assigned">
          <span class="tile-l">{C.tileAssigned}</span>
          <span class="tile-n">
            {sum.assigned}／{sum.total}
          </span>
        </div>
        <div class="tile" data-testid="tile-first">
          <span class="tile-l">{C.tileFirst}</span>
          <span class="tile-n">{rate}%</span>
        </div>
        <div class={`tile${sum.unassigned > 0 ? ' warn' : ''}`} data-testid="tile-pending">
          <span class="tile-l">{C.pending}</span>
          <span class="tile-n">{sum.unassigned}</span>
        </div>
      </div>

      <div class="card seed-row">
        <div>
          <strong>{C.seed}</strong> <span class="tag" data-testid="seed-value">{c.seed}</span>
          <p class="hint">{C.seedHint}</p>
        </div>
        <div class="btn-row">
          <button class="btn secondary small" type="button" disabled={c.fixed} onClick={() => rerun(newSeed())} data-testid="redraw">
            {C.redraw}
          </button>
          <button class="btn secondary small" type="button" aria-pressed={c.fixed} onClick={() => updateCourse((cur) => ({ ...cur, fixed: !cur.fixed }))}>
            {c.fixed ? C.unfix : C.fix}
          </button>
        </div>
      </div>

      {last && (
        <Notice
          kind="ok"
          actions={
            <button class="btn secondary small" type="button" onClick={undo} data-testid="undo">
              {C.undo}
            </button>
          }
        >
          <span data-testid="move-msg">{last.msg}</span>
        </Notice>
      )}

      <div class="wb crs">
        <nav class="wb-list" aria-label={C.listLabel}>
          <ul class="plain-ul">
            {sum.courses.map(crow)}
            {pendingRow}
          </ul>
        </nav>
        {wide && (
          <section class="wb-main" aria-live="polite">
            <Roster {...rosterProps(selName)} />
          </section>
        )}
        <aside class="wb-side">
          <div class="card">
            <h3>{C.rulesTitle}</h3>
            <p class="hint">{C.rulesSummary(sum.courses.reduce((a, x) => a + x.capacity, 0), list.length)}</p>
            <div class="side-btns">
              <button class="btn secondary small" type="button" onClick={() => setPrioOpen(true)}>
                {C.priority}（{c.priority.length}）
              </button>
              <button class="btn secondary small" type="button" onClick={props.onRules}>
                {C.editRules}
              </button>
            </div>
          </div>
          <div class="card" data-testid="record">
            <h3>{C.recordTitle}</h3>
            <p class="hint">{C.record(c.seed, sum.courses.reduce((a, x) => a + x.capacity, 0), stampTaipei(c.ranAt))}</p>
          </div>
        </aside>
      </div>

      {suggest.map((x) => (
        <Notice
          key={x.name}
          kind="warn"
          actions={
            <button
              class="btn secondary small"
              type="button"
              onClick={() => {
                setSel(x.name);
                if (!wide) setPanel(x.name);
              }}
            >
              {C.seeThese(x.filled)}
            </button>
          }
        >
          <span data-testid="close-note">{C.closeNote(x.name, x.filled, courses.find((k) => k.name === x.name)?.minSize ?? 0)}</span>
        </Notice>
      ))}
      {st.courseUnsaved && <p class="hint">{C.unsaved}</p>}

      <ActBar>
        <button class="btn secondary" type="button" onClick={props.onRules}>
          {S.back}
        </button>
        <button class="btn primary grow" type="button" onClick={() => go('output')} data-testid="course-next">
          {C.toOutput}
        </button>
      </ActBar>

      {!wide && panel !== null && (
        <Sheet
          title={panel === PENDING ? C.pending : panel}
          onClose={() => setPanel(null)}
          footer={
            <button class="btn primary grow" type="button" onClick={() => setPanel(null)}>
              {C.done}
            </button>
          }
        >
          <Roster {...rosterProps(panel === PENDING ? null : panel)} />
        </Sheet>
      )}
      {moving !== null && <MoveSheet id={moving} onClose={() => setMoving(null)} onMove={(to) => doMove(moving, to)} />}
      {prioOpen && <PrioritySheet onClose={() => setPrioOpen(false)} />}
    </div>
  );
}

/* ───────── 步驟 3 ───────── */

export default function CourseView() {
  const st = useApp();
  const s = st.session;
  const [editRules, setEditRules] = useState(false);
  useEffect(() => {
    void loadCourse();
  }, [s?.surveyId]);
  if (!s) return null;
  const c = s.course;
  const showResult = c.result !== null && !editRules;
  return (
    <main class="page course-page" id="main">
      <header class="prep-head">
        <h1>{C.step}</h1>
        <p class="meta">{s.name}</p>
      </header>
      {showResult ? (
        <Result onRules={() => setEditRules(true)} />
      ) : (
        <Rules
          hasResult={c.result !== null}
          onBack={() => (c.result !== null ? setEditRules(false) : go('prepare'))}
          onRun={() => {
            updateCourse((cur) => runAllocation(s, cur));
            setEditRules(false);
          }}
        />
      )}
    </main>
  );
}

