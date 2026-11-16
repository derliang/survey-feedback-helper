import { canGoStats } from '../../app/progress';
import { type Route, getState, go, reauthorize, requestRestart, set, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { Icon } from './parts';
import { extra } from '../strings-extra';

interface StepDef {
  route: Route;
  label: string;
}

const STEP_ROUTES: Route[] = ['home', 'prepare', 'stats', 'output'];

/** 步驟是否可點與是否完成（依實際狀態計算，R-037）。 */
function stepState(i: number, st: ReturnType<typeof getState>): { enabled: boolean; done: boolean } {
  const s = st.session;
  if (i === 0) return { enabled: true, done: s !== null };
  if (!s) return { enabled: false, done: false };
  if (i === 1) return { enabled: true, done: canGoStats(s) };
  return { enabled: canGoStats(s), done: false };
}

export function TopBar() {
  const st = useApp();
  const unsaved = st.dirty && st.folder.state !== 'ready';
  const steps: StepDef[] = STEP_ROUTES.map((route, i) => ({ route, label: (i === 2 && st.session?.kind === 'course' ? extra().chrome.courseStep : extra().chrome.stepNames[i]) as string }));
  return (
    <header class="topbar">
      <div class="appbar">
        <button class="brand" type="button" onClick={() => go('home')} aria-label={S.appName}>
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <path d="M8 22V16M14 22V11M20 22V14" stroke="#fff" stroke-width="3" stroke-linecap="round" />
            <path d="M18 8l3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="brand-name">{extra().chrome.brand}</span>
        </button>
        {st.session && <span class="file-name">{st.session.fileName}</span>}
        {st.session?.demo && (
          <span class="tag warn demo-tag" data-testid="demo-tag">
            {S.guide.demoTag}
          </span>
        )}
        <nav class="stepper" aria-label={extra().chrome.steps}>
          <StepList steps={steps} />
        </nav>
        <div class="bar-actions">
          <button class="btn ghost small" type="button" onClick={requestRestart} aria-label={S.restart}>
            <Icon name="restart" />
            <span class="lbl">{extra().chrome.restart}</span>
          </button>
          <button class="btn ghost small" type="button" onClick={() => go('editor')} aria-label={extra().chrome.templateAria}>
            <Icon name="layout" />
            <span class="lbl">{extra().chrome.templateLabel}</span>
          </button>
          <button class="btn secondary small" type="button" onClick={() => go('settings')} aria-label={unsaved ? S.settingsUnsaved : S.settings} title={unsaved ? S.settingsUnsaved : undefined}>
            <Icon name="gear" />
            <span class="lbl">{S.settings}</span>
            {unsaved && <span class="dot-warn" data-testid="unsaved-dot" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <FolderStrip />
    </header>
  );
}

/** 手機工作頁（準備資料、統計、輸出）頂列下方的資料夾狀態細條（R3-1 方案 A）；寬螢幕由 CSS 隱藏。不支援資料夾的瀏覽器沒有資料夾可談，不顯示。 */
function FolderStrip() {
  const st = useApp();
  const f = st.folder;
  const work = st.session !== null && (st.route === 'prepare' || st.route === 'stats' || st.route === 'output');
  if (!work || f.state === 'unsupported') return null;
  const name = f.state === 'ready' ? f.store.name : f.state === 'needsPermission' ? f.name : S.folder.none;
  const warn = f.state !== 'ready';
  return (
    <div class={`folder-strip${warn ? ' warn' : ''}`} data-testid="folder-strip">
      <Icon name="folder" />
      <span class="fs-text">
        {f.state === 'none' ? (
          name
        ) : (
          <>
            {S.folder.label}
            <strong>{name}</strong>
          </>
        )}
      </span>
      <button
        class="btn ghost small"
        type="button"
        onClick={() => (f.state === 'needsPermission' ? void reauthorize() : set({ folderDialog: true }))}
      >
        {f.state === 'none' ? S.folder.choose : S.folder.repick}
      </button>
    </div>
  );
}

function StepList({ steps }: { steps: StepDef[] }) {
  const st = useApp();
  return (
    <ol>
      {steps.map((step, i) => {
        const { enabled, done } = stepState(i, st);
        const current = st.route === step.route;
        return (
          <li key={step.route}>
            <button
              type="button"
              class={`ds${current ? ' now' : ''}${done ? ' done' : ''}`}
              disabled={!enabled}
              aria-current={current ? 'step' : undefined}
              onClick={() => go(step.route)}
            >
              <span class="num">{done && !current ? <Icon name="check" /> : i + 1}</span>
              <span class="nm">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
