import { useEffect } from 'preact/hooks';
import { CloudAlert } from './views/CloudBackup';
import { boot, set, useApp } from '../app/store';
import { strings as S } from './strings';
import { Notice } from './parts/parts';
import { TopBar } from './parts/Chrome';
import { Home } from './views/Home';
import { FolderDialog, RestartDialog, Settings } from './views/Misc';
import { MethodView } from './views/MethodView';
import { OutputView } from './views/OutputView';
import { StatsView } from './views/StatsView';
import { Prepare } from './views/Prepare';
import { EditorRoute } from './editor/Loader';
import { GuideRoute } from './guide/Loader';
import { CourseRoute } from './views/CourseLoader';

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

  if (!st.ready) return <div class="boot" aria-busy="true" />;

  return (
    <>
      <a class="skip" href="#main">
        跳到主要內容
      </a>
      <TopBar />
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
      {st.route === 'home' && <Home />}
      {st.route === 'prepare' && (st.session ? <Prepare /> : <Home />)}
      {st.route === 'stats' && (st.session?.kind === 'course' ? <CourseRoute part="stats" /> : <StatsView />)}
      {st.route === 'output' && (st.session?.kind === 'course' ? <CourseRoute part="output" /> : <OutputView />)}
      {st.route === 'method' && <MethodView />}
      {st.route === 'editor' && <EditorRoute />}
      {(st.route === 'guide' || st.route === 'templates') && <GuideRoute />}
      {st.route === 'settings' && <Settings />}
      <FolderDialog />
      <CloudAlert />
      <RestartDialog />
      {st.toast && (
        <div class="toast" role="status" data-testid="toast">
          {st.toast}
        </div>
      )}
    </>
  );
}
