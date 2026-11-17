import { SaveBanners } from './parts/SaveBanners';
import { useEffect } from 'preact/hooks';
import { CloudAlert } from './views/CloudBackup';
import { boot, set, useApp } from '../app/store';
import { strings as S } from './strings';
import { Notice } from './parts/parts';
import { TopBar } from './parts/Chrome';
import { lazyView } from './lazy-view';
import { UpdateDialog } from './views/UpdateDialog';
import { Home } from './views/Home';
import { SheetPick } from './views/SheetPick';
import { FolderDialog, RestartDialog, Settings } from './views/Misc';
import { EditorRoute } from './editor/Loader';
import { GuideRoute } from './guide/Loader';
import { CourseRoute } from './views/CourseLoader';
import { extra } from './strings-extra';
import { hasUnsavedWork } from '../app/update';

const MethodView = lazyView(() => import('./views/MethodView').then((m) => m.MethodView));
const OutputView = lazyView(() => import('./views/OutputView').then((m) => m.OutputView));
const StatsView = lazyView(() => import('./views/StatsView').then((m) => m.StatsView));
const Prepare = lazyView(() => import('./views/Prepare').then((m) => m.Prepare));

/** 第一次載入畫面（D55／12e）：品牌、進度、骨架與「不含學生資料」說明；index.html 內有同樣的靜態版，JS 還沒載入時就看得到。 */
function Boot() {
  const B = extra().boot;
  return (
    <div class="boot" aria-busy="true" data-testid="boot">
      <div class="boot-brand">{B.title}</div>
      <div>{B.preparing}</div>
      <div class="boot-bar" aria-hidden="true">
        <i />
      </div>
      <div class="boot-skel" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p class="hint">{B.note}</p>
    </div>
  );
}

export function App() {
  const st = useApp();
  useEffect(() => {
    void boot();
  }, []);
  // 離開前確認：有載入的資料或沒存的內容時，關閉分頁或重新整理前由瀏覽器問一次（自訂文字瀏覽器不允許）
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork()) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  // 提示訊息 5 秒後自動收起
  useEffect(() => {
    if (!st.toast) return;
    const t = setTimeout(() => set({ toast: null }), 5000);
    return () => clearTimeout(t);
  }, [st.toast]);

  if (!st.ready) return <Boot />;

  return (
    <>
      <a class="skip" href="#main">
        {extra().skip}
      </a>
      <TopBar />
      <SaveBanners />
      {st.oldBrowser && (
        <div class="banner">
          <Notice kind="warn">{S.oldBrowser}</Notice>
        </div>
      )}
      {st.error && (
        <div class="banner" data-testid="error">
          <Notice
            kind="bad"
            actions={
              <button class="btn secondary small" type="button" onClick={() => set({ error: null })}>
                {S.close}
              </button>
            }
          >
            {st.error === 'settings' ? S.load.settings : S.load[st.error]}
          </Notice>
        </div>
      )}
      {st.sheetPick && <SheetPick />}
      {!st.sheetPick && st.route === 'home' && <Home />}
      {!st.sheetPick && st.route === 'prepare' && (st.session ? <Prepare /> : <Home />)}
      {!st.sheetPick && st.route === 'stats' && (st.session?.kind === 'course' ? <CourseRoute part="stats" /> : <StatsView />)}
      {!st.sheetPick && st.route === 'output' && (st.session?.kind === 'course' ? <CourseRoute part="output" /> : <OutputView />)}
      {st.route === 'method' && <MethodView />}
      {st.route === 'editor' && <EditorRoute />}
      {(st.route === 'guide' || st.route === 'templates') && <GuideRoute />}
      {st.route === 'settings' && <Settings />}
      <FolderDialog />
      <CloudAlert />
      <RestartDialog />
      <UpdateDialog />
      {st.toast && !st.cloudAlert && (
        <div class="toast" role="status" data-testid="toast">
          {st.toast}
        </div>
      )}
    </>
  );
}
