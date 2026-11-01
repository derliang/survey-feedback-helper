// 編輯器畫面：範本庫、區塊編輯器（桌機三欄；手機與直向平板為「預覽／區塊清單」＋底部彈出屬性面板）。
// 這個檔案連同它引入的模組只在進入編輯器時才下載（動態載入），不進首頁 bundle。
import { useEffect, useState } from 'preact/hooks';
import { getState, go, useApp } from '../../app/store';
import { applyOverrides, countOverrides } from '../../editor/overrides';
import { blockName, findBlock, walk } from '../../editor/ops';
import type { EBlock, EditorTemplate } from '../../editor/types';
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
        <h1>範本與版面</h1>
        <p class="lead">內建範本不能直接改；第一次修改時會複製成「我的範本」。</p>
      </div>
      <SaveNote e={e} hasFolder={st.folder.state === 'ready'} />
      <div class="seg" role="group" aria-label="篩選範本">
        {(
          [
            ['all', '全部'],
            ['builtin', '內建'],
            ['mine', '我的'],
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
            <button type="button" class="lib-thumb" aria-label={`編輯「${t.name}」`} onClick={() => openEditor(t.id)}>
              <Preview t={t} scale={0.14} thumb />
            </button>
            <div class="lib-meta">
              <strong>{t.name}</strong>
              <span class="tags">
                <span class="tag">{t.builtin ? '內建' : '我的'}</span>
                {e.useId === t.id && <span class="tag ok">輸出用</span>}
              </span>
            </div>
            <div class="lib-acts">
              {desk && (
                <>
                  <button type="button" class="btn secondary small" onClick={() => openEditor(t.id)} aria-label={`編輯版面「${t.name}」`}>
                    編輯
                  </button>
                  <button type="button" class="btn secondary small" onClick={() => useTemplate(t.id)} aria-label={`用「${t.name}」輸出`}>
                    用這份輸出
                  </button>
                </>
              )}
              <button type="button" class="btn secondary small" onClick={() => setMenuFor(t.id)} aria-label={`「${t.name}」的選單`}>
                選單
              </button>
            </div>
          </div>
        ))}
      </div>
      <div class="btn-row">
        <label class="btn secondary">
          匯入範本檔
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
          新增範本
        </button>
      </div>
      {menu && (
        <Sheet title={menu.name} onClose={() => setMenuFor(null)}>
          <div class="opt-list">
            <button type="button" class="opt" onClick={() => useTemplate(menu.id)}>
              用這份範本輸出
            </button>
            <button type="button" class="opt" onClick={() => openEditor(menu.id)}>
              編輯版面
            </button>
            <button type="button" class="opt" onClick={() => duplicate(menu.id)}>
              複製
            </button>
            <button type="button" class="opt" onClick={() => exportOne(menu.id)}>
              匯出分享（範本檔）
            </button>
            {!menu.builtin && menu.basedOn && (
              <button type="button" class="opt" onClick={() => setConfirm({ kind: 'reset', id: menu.id })}>
                恢復預設版面
              </button>
            )}
            {!menu.builtin && (
              <button type="button" class="opt danger-text" onClick={() => setConfirm({ kind: 'delete', id: menu.id })}>
                刪除
              </button>
            )}
          </div>
        </Sheet>
      )}
      {e.confirm && (
        <Sheet
          title={e.confirm.kind === 'delete' ? '刪除這份範本？' : '恢復成內建版面？'}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" class="btn secondary grow" onClick={() => setConfirm(null)}>
                取消
              </button>
              <button type="button" class="btn danger grow" onClick={() => (e.confirm!.kind === 'delete' ? removeTemplate(e.confirm!.id) : resetTemplate(e.confirm!.id))}>
                {e.confirm.kind === 'delete' ? '刪除' : '恢復預設'}
              </button>
            </>
          }
        >
          <p>{e.confirm.kind === 'delete' ? '刪除後無法復原。已輸出的檔案不受影響。' : '你對這份範本做的修改會被內建版面取代，無法復原。'}</p>
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
      title={hasFolder ? '範本還沒存進資料夾' : '還沒選資料夾，範本只在這次使用'}
      actions={
        <>
          <button type="button" class="btn secondary small" onClick={downloadBackup}>
            下載範本備份
          </button>
          {!hasFolder && (
            <button type="button" class="btn ghost small" onClick={() => go('settings')}>
              去設定選資料夾
            </button>
          )}
        </>
      }
    >
      下載的檔案之後可在這裡用「匯入範本檔」或開啟設定檔還原。
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
    <ul class="blk-list" aria-label="區塊清單">
      {names.map(({ id, b, depth }) => {
        const top = t0.blocks.findIndex((x) => x.id === id);
        const dropMark = drag?.target === id ? (drag.before ? 'before' : 'after') : '';
        return (
          <li key={id} data-bid={id} class={`blk${sel === id ? ' sel' : ''}${drag?.id === id ? ' lift' : ''}${dropMark ? ` drop-${dropMark}` : ''}`} style={{ paddingLeft: depth * 16 }}>
            {!e.student && (
              <span class="grip" role="img" aria-label="拖曳把手：長按後拖曳" {...(handleProps(id) as object)}>
                ⋮⋮
              </span>
            )}
            <button type="button" class="blk-name" onClick={() => select(id)} aria-pressed={sel === id}>
              {blockName(b)}
              {b.when && <span class="tag">條件</span>}
            </button>
            {!e.student && depth === 0 && (
              <span class="blk-mv">
                <button type="button" class="icbtn" aria-label={`上移「${blockName(b)}」`} disabled={top === 0} onClick={() => moveSel(id, -1)}>
                  ↑
                </button>
                <button type="button" class="icbtn" aria-label={`下移「${blockName(b)}」`} disabled={top === t0.blocks.length - 1} onClick={() => moveSel(id, 1)}>
                  ↓
                </button>
              </span>
            )}
          </li>
        );
      })}
      {names.length === 0 && <li class="empty">還沒有區塊，按「加入區塊」開始。</li>}
    </ul>
  );

  const pages = (
    <div class={`pv-wrap${canEdit ? ' editing' : ''}`}>
      <Preview t={t} factor={e.zoom ?? 1} sel={canEdit ? sel : null} interactive={canEdit} onSelect={(id) => select(id)} onText={onText} images={images} {...(vars ? { vars } : {})} />
    </div>
  );

  const wnotes = wordNotes(t0);
  const header = (
    <div class="ed-bar">
      <button type="button" class="btn ghost small" aria-label="回範本庫" onClick={backToLibrary}>
        <Icon name="back" />
        <span class="lbl">範本庫</span>
      </button>
      <input class="input ed-name" aria-label="範本名稱" value={t0.name} disabled={t0.builtin} onInput={(ev) => renameTemplate((ev.currentTarget as HTMLInputElement).value)} />
      <button type="button" class="btn secondary small" disabled={!canUndo(e.hist!)} onClick={doUndo}>
        復原
      </button>
      <button type="button" class="btn secondary small" disabled={!canRedo(e.hist!)} onClick={doRedo}>
        重做
      </button>
    </div>
  );

  const banner = e.student && (
    <Notice
      kind="warn"
      title="個別版本"
      actions={
        <button type="button" class="btn secondary small" onClick={() => setPanel('student')}>
          看改了哪些
        </button>
      }
    >
      {stu?.name}：{countOverrides(ov)} 項覆寫。回到全班範本不受影響。
    </Notice>
  );

  const sheets = (
    <>
      {e.panel === 'add' && (
        <Sheet title="加入區塊" onClose={() => setPanel(null)}>
          <AddPanel selName={selBlock ? blockName(selBlock) : null} onDone={() => (wide ? setPanel(null) : setPanel('props'))} />
        </Sheet>
      )}
      {e.panel === 'page' && (
        <Sheet title="頁面設定" onClose={() => setPanel(null)} footer={<button type="button" class="btn grow" onClick={() => setPanel(null)}>完成</button>}>
          <PagePanel t={t0} images={images} />
        </Sheet>
      )}
      {e.panel === 'student' && (
        <Sheet title="個別學生版本" onClose={() => setPanel(null)} footer={<button type="button" class="btn grow" onClick={() => setPanel(null)}>完成</button>}>
          <StudentPanel t={t0} students={students()} student={e.student} />
        </Sheet>
      )}
      {!wide && e.panel === 'props' && selBlock && (
        <Sheet title={blockName(selBlock)} onClose={() => setPanel(null)} footer={<button type="button" class="btn grow" onClick={() => setPanel(null)}>完成</button>}>
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
            頁面設定
          </button>
          <button type="button" class="btn secondary small" onClick={() => setPanel('student')}>
            {e.student ? '個別學生版本（使用中）' : '個別學生版本'}
          </button>
          <Zoom e={e} pages={pageCount(t0)} />
          <span class="kbd-hint">Ctrl+Z 復原 · Delete 刪除 · ↑↓ 移動 · 雙擊文字直接改</span>
        </div>
        <div class="ed-grid">
          <aside class="ed-left" aria-label="區塊">
            <h2 class="sub-h">區塊</h2>
            {blockList}
            {!e.student && (
              <button type="button" class="btn secondary" onClick={() => setPanel('add')}>
                加入區塊
              </button>
            )}
          </aside>
          <section class="ed-center" aria-label="頁面預覽">
            {pages}
          </section>
          <aside class="ed-right" aria-label="屬性">
            {propsPanel}
          </aside>
        </div>
        {wnotes.length > 0 && <p class="hint">Word 輸出時有 {wnotes.length} 處效果會改變（選取區塊可看說明）。</p>}
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
        <div class="seg" role="group" aria-label="檢視">
          <button type="button" class={e.view === 'preview' ? 'on' : ''} aria-pressed={e.view === 'preview'} onClick={() => setView('preview')}>
            預覽
          </button>
          <button type="button" class={e.view === 'list' ? 'on' : ''} aria-pressed={e.view === 'list'} onClick={() => setView('list')}>
            區塊清單
          </button>
        </div>
        {e.view === 'preview' && (
          <button type="button" class={`chip${e.editMode ? ' on' : ''}`} aria-pressed={e.editMode} onClick={() => setEditMode(!e.editMode)}>
            {e.editMode ? '編輯中' : '編輯'}
          </button>
        )}
      </div>
      {e.view === 'preview' ? (
        <>
          <Zoom e={e} pages={pageCount(t0)} />
          <p class="hint">{e.editMode ? '點一下區塊選取，再按下方「編輯屬性」。' : '捲動模式：單指捲動、雙指縮放，不會誤改。要修改請打開「編輯」。'}</p>
          {pages}
        </>
      ) : (
        <>
          {blockList}
          <p class="hint">長按「⋮⋮」把手後拖曳排序；也可以用 ↑ ↓ 按鈕。</p>
        </>
      )}
      <div class="actbar ed-act">
        <div class="ed-sel">{selBlock ? `已選取：${blockName(selBlock)}` : '沒有選取區塊'}</div>
        <button type="button" class="btn secondary" onClick={() => setPanel('page')}>
          頁面
        </button>
        <button type="button" class="btn secondary" onClick={() => setPanel('student')}>
          個別學生
        </button>
        {!e.student && (
          <button type="button" class="btn secondary" onClick={() => setPanel('add')}>
            加入
          </button>
        )}
        <button type="button" class="btn" disabled={!selBlock} onClick={() => setPanel('props')}>
          編輯屬性
        </button>
      </div>
      {sheets}
    </main>
  );
}

function Zoom({ e, pages }: { e: ES; pages: number }) {
  const f = e.zoom ?? 1;
  return (
    <div class="zoom" role="group" aria-label="預覽縮放">
      <button type="button" class="icbtn" aria-label="縮小" disabled={f <= 0.5} onClick={() => setZoom(Math.max(0.5, f - 0.25))}>
        −
      </button>
      <button type="button" class="chip" onClick={() => setZoom(null)} aria-label="符合寬度">
        {Math.round(f * 100)}%
      </button>
      <button type="button" class="icbtn" aria-label="放大" disabled={f >= 3} onClick={() => setZoom(Math.min(3, f + 0.25))}>
        ＋
      </button>
      <span class="zoom-pages" data-testid="page-count">
        共 {pages} 頁
      </span>
    </div>
  );
}

