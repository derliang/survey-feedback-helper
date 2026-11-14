// 編輯器畫面：範本庫、區塊編輯器（桌機三欄；手機與直向平板為「預覽／區塊清單」＋底部彈出屬性面板）。
// 這個檔案連同它引入的模組只在進入編輯器時才下載（動態載入），不進首頁 bundle。
import { blockNameUi as blockName, ed } from '../strings-editor';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getState, go, useApp } from '../../app/store';
import { applyOverrides, countOverrides } from '../../editor/overrides';
import { findBlock, walk } from '../../editor/ops';
import type { EBlock, EditorTemplate } from '../../editor/types';
import { pinchZoom } from '../../editor/pinch';
import { wordNotes } from '../../editor/word';
import { Icon, Notice, Sheet, useWide } from '../parts/parts';
import './editor.css';
import { useDragSort } from './drag';
import { AddPanel, BlockProps, PagePanel, StudentPanel } from './Panels';
import { Preview } from './Preview';
import {
  type ES, allTemplates, backToLibrary, currentOverrides, deleteBlock, doRedo, doUndo, dropSel, downloadBackup, duplicate, exportOne, importFile, load, moveSel, newTemplate, overrideBlock,
  openEditor, patchBlock, removeTemplate, renameTemplate, resetTemplate, select, setConfirm, setEditMode, setMenuFor, setPanel, setView, setZoom, useEditor, useTemplate,
} from './state';
import { canRedo, canUndo } from '../../editor/history';

const SAMPLE_STUDENTS = [
  { key: '範例-6', name: '林小宇（6 號）' },
  { key: '範例-12', name: '陳怡君（12 號）' },
  { key: '範例-23', name: '張志豪（23 號）' },
];

function students(): { key: string; name: string }[] {
  const rows = getState().session?.rosterRows;
  if (rows?.length) return rows.map((r) => ({ key: `${r.class}-${r.seat}`, name: `${r.name}（${r.seat} 號）` }));
  return SAMPLE_STUDENTS;
}

export default function EditorView() {
  const e = useEditor();
  useEffect(() => {
    void load();
  }, []);
  if (!e.loaded) return <main class="page" aria-busy="true" />;
  return e.screen === 'library' ? <Library e={e} /> : <Edit e={e} />;
}

// ---- 範本庫 ----

/** 桌機寬度（≥1024）：範本卡直接露出常用動作；較窄只留「選單」。 */
function useDesk(): boolean {
  const q = '(min-width: 1024px)';
  const [desk, setDesk] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setDesk(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return desk;
}

/** 頁數：以分頁線計（內容超出一頁的自動換頁要到輸出才知道）。 */
function pageCount(t: EditorTemplate): number {
  let n = 1;
  walk(t.blocks, (b) => {
    if (b.kind === 'pageBreak') n += 1;
  });
  return n;
}

function Library({ e }: { e: ES }) {
  const st = useApp();
  const desk = useDesk();
  const [filter, setFilter] = useState<'all' | 'builtin' | 'mine'>('all');
  const list = allTemplates(e.data).filter((t) => filter === 'all' || (filter === 'builtin') === t.builtin);
  const menu = e.menuFor ? allTemplates(e.data).find((t) => t.id === e.menuFor) : undefined;
  return (
    <main class="page editor-lib" id="main">
      <div class="prep-head">
        <h1>{ed().libTitle}</h1>
        <p class="lead">{ed().libLead}</p>
      </div>
      <SaveNote e={e} hasFolder={st.folder.state === 'ready'} />
      <div class="seg" role="group" aria-label={ed().libFilter}>
        {(
          [
            ['all', ed().all],
            ['builtin', ed().builtin],
            ['mine', ed().mine],
          ] as const
        ).map(([k, n]) => (
          <button
            key={k}
            type="button"
            class={filter === k ? 'on' : ''}
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
          >
            {n}
          </button>
        ))}
      </div>
      <div class="lib-grid">
        {list.map((t) => (
          <div key={t.id} class="lib-card" data-testid="template-card">
            <button type="button" class="lib-thumb" aria-label={ed().editNamed(t.name)} onClick={() => openEditor(t.id)}>
              <Preview t={t} scale={0.14} thumb />
            </button>
            <div class="lib-meta">
              <strong>{t.name}</strong>
              <span class="tags">
                <span class="tag">{t.builtin ? ed().builtin : ed().mine}</span>
                {e.useId === t.id && <span class="tag ok">{ed().usedForOutput}</span>}
              </span>
            </div>
            <div class="lib-acts">
              {desk && (
                <>
                  <button type="button" class="btn secondary small" onClick={() => openEditor(t.id)} aria-label={ed().editLayoutNamed(t.name)}>
                    {ed().edit}
                  </button>
                  <button type="button" class="btn secondary small" onClick={() => useTemplate(t.id)} aria-label={ed().useNamed(t.name)}>
                    {ed().useForOutput}
                  </button>
                </>
              )}
              <button type="button" class="btn secondary small" onClick={() => setMenuFor(t.id)} aria-label={ed().menuOf(t.name)}>
                {ed().menu}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div class="btn-row">
        <label class="btn secondary">
          {ed().importFile}
          <input
            type="file"
            accept=".json,application/json"
            class="sr"
            data-testid="template-input"
            onChange={async (ev) => {
              const f = (ev.currentTarget as HTMLInputElement).files?.[0];
              (ev.currentTarget as HTMLInputElement).value = '';
              if (f) await importFile(f);
            }}
          />
        </label>
        <button type="button" class="btn" onClick={newTemplate}>
          {ed().createNew}
        </button>
      </div>
      {menu && (
        <Sheet title={menu.name} onClose={() => setMenuFor(null)}>
          <div class="opt-list">
            <button type="button" class="opt" onClick={() => useTemplate(menu.id)}>
              {ed().useThis}
            </button>
            <button type="button" class="opt" onClick={() => openEditor(menu.id)}>
              {ed().editLayout}
            </button>
            <button type="button" class="opt" onClick={() => duplicate(menu.id)}>
              {ed().dup}
            </button>
            <button type="button" class="opt" onClick={() => exportOne(menu.id)}>
              {ed().download}
            </button>
            {!menu.builtin && menu.basedOn && (
              <button type="button" class="opt" onClick={() => setConfirm({ kind: 'reset', id: menu.id })}>
                {ed().restoreBuiltin}
              </button>
            )}
            {!menu.builtin && (
              <button type="button" class="opt danger-text" onClick={() => setConfirm({ kind: 'delete', id: menu.id })}>
                {ed().del}
              </button>
            )}
          </div>
        </Sheet>
      )}
      {e.confirm && (
        <Sheet
          title={e.confirm.kind === 'delete' ? ed().confDelTitle : ed().confRestTitle}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" class="btn secondary grow" onClick={() => setConfirm(null)}>
                {ed().cancel}
              </button>
              <button type="button" class="btn danger grow" onClick={() => (e.confirm!.kind === 'delete' ? removeTemplate(e.confirm!.id) : resetTemplate(e.confirm!.id))}>
                {e.confirm.kind === 'delete' ? ed().del : ed().restoreDefault}
              </button>
            </>
          }
        >
          <p>{e.confirm.kind === 'delete' ? ed().confDelBody : ed().confRestBody}</p>
        </Sheet>
      )}
    </main>
  );
}

function SaveNote({ e, hasFolder }: { e: ES; hasFolder: boolean }) {
  if (!e.unsaved) return null;
  return (
    <Notice
      kind="warn"
      title={hasFolder ? ed().notSaved : ed().noFolder}
      actions={
        <>
          <button type="button" class="btn secondary small" onClick={downloadBackup}>
            {ed().dlBackup}
          </button>
          {!hasFolder && (
            <button type="button" class="btn ghost small" onClick={() => go('settings')}>
              {ed().goSettings}
            </button>
          )}
        </>
      }
    >
      {ed().keepFile}
    </Notice>
  );
}

// ---- 編輯 ----

function Edit({ e }: { e: ES }) {
  const wide = useWide() && window.matchMedia('(min-width: 900px)').matches;
  const st = useApp();
  const t0 = e.hist!.present;
  const ovs = currentOverrides();
  const ov = e.student ? ovs[e.student] : undefined;
  const t = e.student ? applyOverrides(t0, ov) : t0;
  const stu = students().find((s) => s.key === e.student);
  const vars = stu ? { 姓名: stu.name.replace(/（.*/, '') } : undefined;
  const sel = e.sel && findBlock(t0, e.sel) ? e.sel : null;
  const selBlock = sel ? findBlock(t0, sel) : null;
  const canEdit = wide || e.editMode;
  const images = e.data.images;
  const { drag, handleProps } = useDragSort(dropSel);
  // 雙指縮放：兩根觸控點的距離變化換算成縮放比；單指維持捲動
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ d: number; z: number } | null>(null);
  const dist = () => {
    const [a, b] = [...touches.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const pinch = {
    onPointerDown: (ev: PointerEvent) => {
      if (ev.pointerType !== 'touch') return;
      touches.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.current.size === 2) pinchStart.current = { d: dist(), z: e.zoom ?? 1 };
    },
    onPointerMove: (ev: PointerEvent) => {
      if (!touches.current.has(ev.pointerId)) return;
      touches.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.current.size === 2 && pinchStart.current) setZoom(pinchZoom(pinchStart.current.z, pinchStart.current.d, dist()));
    },
    onPointerUp: (ev: PointerEvent) => {
      touches.current.delete(ev.pointerId);
      if (touches.current.size < 2) pinchStart.current = null;
    },
    onPointerCancel: (ev: PointerEvent) => {
      touches.current.delete(ev.pointerId);
      if (touches.current.size < 2) pinchStart.current = null;
    },
  };
  // 試印 PDF：用虛構示範資料把目前範本實際輸出，開新分頁看；開不了就改下載
  const [trial, setTrial] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: '' });
  const doTrial = async () => {
    setTrial({ busy: true, msg: ed().trialBusy });
    try {
      const { trialPdf } = await import('../../app/trial');
      const r = await trialPdf(t0, { version: 'teacher', images: e.data.images, ...(ov ? { override: ov } : {}) });
      const url = URL.createObjectURL(new Blob([r.bytes as BlobPart], { type: 'application/pdf' }));
      if (!window.open(url, '_blank')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `試印-${t0.name}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setTrial({ busy: false, msg: r.missingChars.length ? ed().trialMissing(r.missingChars.join('')) : ed().trialOk });
    } catch (err) {
      setTrial({ busy: false, msg: ed().trialFail(err instanceof Error ? err.message : String(err)) });
    }
  };
  // 鍵盤拖曳（5.26）：Space 拿起、↑↓ 移動、Space 放下、Esc 取消（復原已移動的步數）
  const [kb, setKb] = useState<{ id: string; moves: number } | null>(null);
  const [kbMsg, setKbMsg] = useState('');
  const kbKey = (id: string, ev: KeyboardEvent) => {
    const total = t0.blocks.length;
    const pos = (bid: string) => t0.blocks.findIndex((x) => x.id === bid);
    const say = (i: number) => setKbMsg(ed().kbPos(i + 1, total));
    const refocus = () => requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-bid="${id}"] .grip`)?.focus());
    if (ev.key === ' ') {
      ev.preventDefault();
      if (kb) {
        setKb(null);
        setKbMsg(ed().kbDropped(pos(id) + 1));
      } else {
        setKb({ id, moves: 0 });
        say(pos(id));
      }
    } else if (kb && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
      ev.preventDefault();
      ev.stopPropagation();
      const d = ev.key === 'ArrowUp' ? -1 : 1;
      const i = pos(id);
      if (i + d < 0 || i + d >= total) return;
      moveSel(id, d);
      setKb({ id, moves: kb.moves + 1 });
      say(i + d);
      refocus();
    } else if (kb && ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      for (let n = 0; n < kb.moves; n++) doUndo();
      setKb(null);
      setKbMsg(ed().cancelled);
      refocus();
    }
  };

  // 鍵盤：Ctrl+Z 復原、Ctrl+Y／Ctrl+Shift+Z 重做、Delete 刪除、↑↓ 移動區塊（輸入文字時不攔截）
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) doRedo();
        else doUndo();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') {
        ev.preventDefault();
        doRedo();
      } else if (sel && !e.student && ev.key === 'Delete') deleteBlock(sel);
      else if (sel && !e.student && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
        ev.preventDefault();
        moveSel(sel, ev.key === 'ArrowUp' ? -1 : 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sel, e.student]);

  const onText = (id: string, text: string) => {
    if (e.student) {
      const cur = ovs[e.student]?.blocks[id];
      overrideBlock(id, { ...cur, patch: { ...(cur?.patch ?? {}), text } });
    } else patchBlock(id, { text }, `text:${id}`);
  };

  const propsPanel = selBlock ? (
    <BlockProps t={t0} b={selBlock} student={e.student} images={images} />
  ) : (
    <PagePanel t={t0} images={images} />
  );

  const names: { id: string; b: EBlock; depth: number }[] = [];
  const collect = (list: EBlock[], depth: number) => {
    for (const b of list) {
      names.push({ id: b.id, b, depth });
      if (b.kind === 'columns') b.cols.forEach((c) => collect(c, depth + 1));
    }
  };
  collect(t0.blocks, 0);

  const blockList = (
    <ul class="blk-list" aria-label={ed().blockListAria}>
      <li class="sr" role="status" aria-live="polite">
        {kbMsg}
      </li>
      {names.map(({ id, b, depth }) => {
        const top = t0.blocks.findIndex((x) => x.id === id);
        const dropMark = drag?.target === id ? (drag.before ? 'before' : 'after') : '';
        return (
          <li key={id} data-bid={id} class={`blk${sel === id ? ' sel' : ''}${drag?.id === id || kb?.id === id ? ' lift' : ''}${dropMark ? ` drop-${dropMark}` : ''}`} style={{ paddingLeft: depth * 16 }}>
            {!e.student && (
              <span
                class="grip"
                role="button"
                tabIndex={depth === 0 ? 0 : -1}
                aria-pressed={kb?.id === id}
                aria-label={ed().dragHandle}
                onKeyDown={depth === 0 ? (ev) => kbKey(id, ev as unknown as KeyboardEvent) : undefined}
                onBlur={() => kb?.id === id && setKb(null)}
                {...(handleProps(id) as object)}
              >
                ⋮⋮
              </span>
            )}
            <button type="button" class="blk-name" onClick={() => select(id)} aria-pressed={sel === id}>
              {blockName(b)}
              {b.when && <span class="tag">{ed().condCond}</span>}
            </button>
            {!e.student && depth === 0 && (
              <span class="blk-mv">
                <button type="button" class="icbtn" aria-label={ed().upNamed(blockName(b))} disabled={top === 0} onClick={() => moveSel(id, -1)}>
                  ↑
                </button>
                <button type="button" class="icbtn" aria-label={ed().downNamed(blockName(b))} disabled={top === t0.blocks.length - 1} onClick={() => moveSel(id, 1)}>
                  ↓
                </button>
              </span>
            )}
          </li>
        );
      })}
      {names.length === 0 && <li class="empty">{ed().noBlocks}</li>}
    </ul>
  );

  const pages = (
    <div class={`pv-wrap${canEdit ? ' editing' : ''}`} data-testid="pv-wrap" {...pinch}>
      <Preview t={t} factor={e.zoom ?? 1} sel={canEdit ? sel : null} interactive={canEdit} onSelect={(id) => select(id)} onText={onText} images={images} {...(vars ? { vars } : {})} {...(canEdit && !e.student ? { grip: handleProps, drag } : {})} />
    </div>
  );

  const wnotes = wordNotes(t0);
  const header = (
    <div class="ed-bar">
      <button type="button" class="btn ghost small" aria-label={ed().backLib} onClick={backToLibrary}>
        <Icon name="back" />
        <span class="lbl">{ed().libShort}</span>
      </button>
      <input class="input ed-name" aria-label={ed().tplName} value={t0.name} disabled={t0.builtin} onInput={(ev) => renameTemplate((ev.currentTarget as HTMLInputElement).value)} />
      <button type="button" class="btn secondary small" disabled={!canUndo(e.hist!)} onClick={doUndo}>
        {ed().undo}
      </button>
      <button type="button" class="btn secondary small" disabled={!canRedo(e.hist!)} onClick={doRedo}>
        {ed().redo}
      </button>
      <button type="button" class="btn secondary small" disabled={trial.busy} onClick={doTrial}>
        {ed().trialPdf}
      </button>
      <span class="sr" role="status" data-testid="trial-msg">
        {trial.msg}
      </span>
    </div>
  );

  const banner = e.student && (
    <Notice
      kind="warn"
      title={ed().indivVer}
      actions={
        <button type="button" class="btn secondary small" onClick={() => setPanel('student')}>
          {ed().viewStudent}
        </button>
      }
    >
      {ed().indivNote(stu?.name ?? '', countOverrides(ov))}
    </Notice>
  );

  const sheets = (
    <>
      {e.panel === 'add' && (
        <Sheet title={ed().addBlock} onClose={() => setPanel(null)}>
          <AddPanel selName={selBlock ? blockName(selBlock) : null} onDone={() => (wide ? setPanel(null) : setPanel('props'))} />
        </Sheet>
      )}
      {e.panel === 'page' && (
        <Sheet title={ed().pageSetup} onClose={() => setPanel(null)} footer={<button type="button" class="btn grow" onClick={() => setPanel(null)}>{ed().done}</button>}>
          <PagePanel t={t0} images={images} />
        </Sheet>
      )}
      {e.panel === 'student' && (
        <Sheet title={ed().singleLayout} onClose={() => setPanel(null)} footer={<button type="button" class="btn grow" onClick={() => setPanel(null)}>{ed().done}</button>}>
          <StudentPanel t={t0} students={students()} student={e.student} />
        </Sheet>
      )}
      {!wide && e.panel === 'props' && selBlock && (
        <Sheet title={blockName(selBlock)} onClose={() => setPanel(null)} footer={<button type="button" class="btn grow" onClick={() => setPanel(null)}>{ed().done}</button>}>
          <BlockProps t={t0} b={selBlock} student={e.student} images={images} />
        </Sheet>
      )}
    </>
  );

  if (wide) {
    return (
      <main class="page editor wide" id="main">
        {header}
        <SaveNote e={e} hasFolder={st.folder.state === 'ready'} />
        {banner}
        <div class="ed-tools">
          <button type="button" class="btn secondary small" onClick={() => setPanel('page')}>
            {ed().pageSetup}
          </button>
          <button type="button" class="btn secondary small" onClick={() => setPanel('student')}>
            {e.student ? ed().singleLayoutOn : ed().singleLayout}
          </button>
          <Zoom e={e} pages={pageCount(t0)} />
          <span class="kbd-hint">{ed().kbdHint}</span>
        </div>
        <div class="ed-grid">
          <aside class="ed-left" aria-label={ed().blocks}>
            <h2 class="sub-h">{ed().blocks}</h2>
            {blockList}
            {!e.student && (
              <button type="button" class="btn secondary" onClick={() => setPanel('add')}>
                {ed().addBlock}
              </button>
            )}
          </aside>
          <section class="ed-center" aria-label={ed().pagePreview}>
            {pages}
          </section>
          <aside class="ed-right" aria-label={ed().props}>
            {propsPanel}
          </aside>
        </div>
        {wnotes.length > 0 && <p class="hint">{ed().wordNote(wnotes.length)}</p>}
        {sheets}
      </main>
    );
  }

  return (
    <main class="page editor narrow" id="main">
      {header}
      <SaveNote e={e} hasFolder={st.folder.state === 'ready'} />
      {banner}
      <div class="ed-modes">
        <div class="seg" role="group" aria-label={ed().viewAria}>
          <button type="button" class={e.view === 'preview' ? 'on' : ''} aria-pressed={e.view === 'preview'} onClick={() => setView('preview')}>
            {ed().preview}
          </button>
          <button type="button" class={e.view === 'list' ? 'on' : ''} aria-pressed={e.view === 'list'} onClick={() => setView('list')}>
            {ed().blockListAria}
          </button>
        </div>
        {e.view === 'preview' && (
          <button type="button" class={`chip${e.editMode ? ' on' : ''}`} aria-pressed={e.editMode} onClick={() => setEditMode(!e.editMode)}>
            {e.editMode ? ed().editing : ed().edit}
          </button>
        )}
      </div>
      {e.view === 'preview' ? (
        <>
          <Zoom e={e} pages={pageCount(t0)} />
          <p class="hint">{e.editMode ? ed().editHint : ed().scrollHint}</p>
          {pages}
        </>
      ) : (
        <>
          {blockList}
          <p class="hint">{ed().dragHint}</p>
        </>
      )}
      <div class="actbar ed-act">
        <div class="ed-sel">{selBlock ? ed().selected(blockName(selBlock)) : ed().noSel}</div>
        <button type="button" class="btn secondary" onClick={() => setPanel('page')}>
          {ed().page}
        </button>
        <button type="button" class="btn secondary" onClick={() => setPanel('student')}>
          {ed().singleShort}
        </button>
        {!e.student && (
          <button type="button" class="btn secondary" onClick={() => setPanel('add')}>
            {ed().add}
          </button>
        )}
        <button type="button" class="btn" disabled={!selBlock} onClick={() => setPanel('props')}>
          {ed().editProps}
        </button>
      </div>
      {sheets}
    </main>
  );
}

function Zoom({ e, pages }: { e: ES; pages: number }) {
  const f = e.zoom ?? 1;
  return (
    <div class="zoom" role="group" aria-label={ed().zoomAria}>
      <button type="button" class="icbtn" aria-label={ed().zoomOut} disabled={f <= 0.5} onClick={() => setZoom(Math.max(0.5, f - 0.25))}>
        −
      </button>
      <button type="button" class="chip" onClick={() => setZoom(null)} aria-label={ed().fitWidth}>
        {Math.round(f * 100)}%
      </button>
      <button type="button" class="icbtn" aria-label={ed().zoomIn} disabled={f >= 3} onClick={() => setZoom(Math.min(3, f + 0.25))}>
        ＋
      </button>
      <span class="zoom-pages" data-testid="page-count">
        {ed().pagesCount(pages)}
      </span>
    </div>
  );
}

