import { canGoStats } from '../../app/progress';
import { type Route, getState, go, requestRestart, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { Icon } from './parts';

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
  const steps: StepDef[] = STEP_ROUTES.map((route, i) => ({ route, label: S.steps[i] as string }));
  return (
    <header class="topbar">
      <div class="appbar">
        <button class="brand" type="button" onClick={() => go('home')} aria-label={S.appName}>
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <path d="M8 22V16M14 22V11M20 22V14" stroke="#fff" stroke-width="3" stroke-linecap="round" />
            <path d="M18 8l3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="brand-name">{S.appName}</span>
        </button>
        {st.session && <span class="file-name">{st.session.fileName}</span>}
        <nav class="stepper" aria-label="步驟">
          <StepList steps={steps} />
        </nav>
        <div class="bar-actions">
          <button class="btn ghost small" type="button" onClick={requestRestart} aria-label={S.restart}>
            <Icon name="restart" />
            <span class="lbl">{S.restart}</span>
          </button>
          <button class="btn ghost small" type="button" onClick={() => go('editor')} aria-label="範本與版面">
            <Icon name="pencil" />
            <span class="lbl">範本</span>
          </button>
          <button class="btn secondary small" type="button" onClick={() => go('settings')} aria-label={S.settings}>
            <Icon name="gear" />
            <span class="lbl">{S.settings}</span>
          </button>
        </div>
      </div>
    </header>
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
