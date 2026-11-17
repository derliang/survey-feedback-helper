import { SaveBanners } from './parts/SaveBanners';
import { useEffect } from 'preact/hooks';
import { CloudAlert } from './views/CloudBackup';
import { boot, go, set, useApp } from '../app/store';
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

const MethodView = lazyView(() => import('./views/MethodView').then((m) => m.MethodView));
const OutputView = lazyView(() => import('./views/OutputView').then((m) => m.OutputView));
const StatsView = lazyView(() => import('./views/StatsView').then((m) => m.StatsView));
const Prepare = lazyView(() => import('./views/Prepare').then((m) => m.Prepare));

export function App() {
  const st = useApp();
  useEffect(() => {
    void boot();
  }, []);
  // 提示訊息 5 秒後自動收起
  useEffect(() => {
    if (!st.toast) return;
    const t = setTimeout(() => set({ toast: null }), 5000);
    return () => clearTimeout(t);
  }, [st.toast]);

  /** 檔案讀不了時「重新選擇」：直接再開檔案挑選視窗（不在首頁就先回首頁）。 */
  const repick = () => {
    set({ error: null });
    const open = () => document.querySelector<HTMLInputElement>('[data-testid="file-input"]')?.click();
    if (document.querySelector('[data-testid="file-input"]')) open();
    else {
      go('home');
      setTimeout(open, 0);
    }
  };

  if (!st.ready) return <div class="boot" aria-busy="true" />;

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
              <>
                {st.error !== 'settings' && (
                  <>
                    <button class="btn primary small" type="button" data-testid="error-repick" onClick={repick}>
                      {extra().loadError.repick}
                    </button>
                    <button
                      class="btn secondary small"
                      type="button"
                      onClick={() => {
                        set({ error: null });
                        go('guide');
                      }}
                    >
                      {extra().loadError.howExport}
                    </button>
                  </>
                )}
                <button class="btn ghost small" type="button" onClick={() => set({ error: null })}>
                  {S.close}
                </button>
              </>
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
