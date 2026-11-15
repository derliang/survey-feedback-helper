// 設定頁（DESIGN.md 5.33 C／D，使用者 2026-11-14 裁示方案 A）：
// 分「常用」（資料夾、預設輸出）與「進階與資訊」（備份與還原、外觀與語言、說明與隱私）。
// 手機（<600）頂端分段控制二選一；平板、桌機（≥600）左側導覽四項。內容最寬 720，底部固定操作列。
import { useEffect, useState } from 'preact/hooks';
import { downloadSettings, forgetThisFolder, go, set, updatePrefs, useApp } from '../../app/store';
import { type Lang, type Theme, isTouchDevice } from '../../storage';
import { strings as S } from '../strings';
import { ActBar } from '../parts/parts';
import { LazySteps } from '../parts/LazyDiagram';
import { rich } from '../parts/rich';
import { CloudCard } from './CloudBackup';
import { BackupCard, DefaultsCard } from './SettingsExtra';

type Panel = 'common' | 'backup' | 'look' | 'help';
const ADVANCED: Panel[] = ['backup', 'look', 'help'];

/** 平板以上才用左側導覽；監聽視窗寬度變化。 */
function useWide(): boolean {
  const q = '(min-width: 600px)';
  const get = () => typeof matchMedia === 'function' && matchMedia(q).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

function FolderCard() {
  const st = useApp();
  const f = st.folder;
  const touch = isTouchDevice();
  return (
    <section class="card" data-testid="folder-card">
      <h2>{S.settingsPage.folderTitle}</h2>
      <p>
        {S.folder.label}
        <strong>{f.state === 'ready' ? f.store.name : f.state === 'needsPermission' ? f.name : S.folder.none}</strong>
      </p>
      <div class="btn-row">
        {f.state !== 'unsupported' && (
          <button class="btn secondary" type="button" onClick={() => set({ folderDialog: true })}>
            {S.folder.choose}
          </button>
        )}
        {f.state !== 'unsupported' && f.state !== 'none' && (
          <button class="btn danger" type="button" onClick={() => void forgetThisFolder()}>
            {S.settingsPage.forget}
          </button>
        )}
        {f.state !== 'ready' && (
          <button class="btn secondary" type="button" onClick={() => void downloadSettings()}>
            {touch ? S.folder.saveToFiles : S.folder.download}
          </button>
        )}
      </div>
      {f.state !== 'unsupported' && f.state !== 'none' && <p class="hint">{S.settingsPage.forgetNote}</p>}
      {f.state === 'unsupported' && (
        <>
          <p class="hint">{S.folder.unsupportedBody}</p>
          <strong>{S.folder.howManual}</strong>
          <LazySteps
            steps={(touch ? S.folder.touchManualSteps : S.folder.manualSteps).map((t, i) => ({
              fig: (touch ? (['fdT1', 'fdT2', 'fdT3'] as const) : (['fdD1', 'fdD2'] as const))[i],
              text: rich(t),
            }))}
          />
        </>
      )}
    </section>
  );
}

function LookCard() {
  const st = useApp();
  return (
    <section class="card" data-testid="look-card">
      <h2>{S.settingsPage.lookTitle}</h2>
      <div class="field">
        <span class="label" id="set-theme">
          {S.settingsPage.theme}
        </span>
        <div class="seg" role="radiogroup" aria-labelledby="set-theme">
          {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={st.prefs.theme === t} class={st.prefs.theme === t ? 'on' : ''} onClick={() => updatePrefs({ theme: t })}>
              {S.settingsPage.themes[t]}
            </button>
          ))}
        </div>
      </div>
      <div class="field">
        <span class="label" id="set-lang">
          {S.settingsPage.language}
        </span>
        <div class="seg" role="radiogroup" aria-labelledby="set-lang">
          {(['zh', 'en'] as Lang[]).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={st.prefs.lang === l} class={st.prefs.lang === l ? 'on' : ''} onClick={() => updatePrefs({ lang: l })}>
              {S.settingsPage.languages[l]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HelpCards() {
  return (
    <>
      <section class="card" data-testid="privacy-card">
        <h2>{S.settingsPage.privacyTitle}</h2>
        <ul class="plain-list">
          {S.privacy.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
      <details class="card help-acc" data-testid="help-card">
        <summary>
          <span class="help-t">
            <strong>{S.settingsPage.helpTitle}</strong>
            <span>{S.settingsPage.helpSummary}</span>
          </span>
        </summary>
        <div class="stack">
          <div>
            <h3>{S.settingsPage.offlineTitle}</h3>
            <p>{S.settingsPage.offlineBody}</p>
          </div>
          <div>
            <h3>{S.settingsPage.shortcutsTitle}</h3>
            <p>{S.settingsPage.shortcutsBody}</p>
          </div>
          <div>
            <h3>{S.settingsPage.browserTitle}</h3>
            <p>{S.settingsPage.browserBody}</p>
          </div>
          <a class="privacy-link" href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener">
            {S.privacyPolicy}
          </a>
        </div>
      </details>
    </>
  );
}

export function Settings() {
  const st = useApp();
  const f = st.folder;
  const wide = useWide();
  const [panel, setPanel] = useState<Panel>('common');
  const N = S.settingsPage.nav;
  const folderName = f.state === 'ready' ? f.store.name : f.state === 'needsPermission' ? f.name : S.folder.none;
  const subs: Record<Panel, string> = {
    common: folderName,
    backup: N.backup.sub,
    look: `${S.settingsPage.themes[st.prefs.theme]} · ${S.settingsPage.languages[st.prefs.lang]}`,
    help: N.help.sub,
  };
  const group = panel === 'common' ? 'common' : 'advanced';
  // 手機：分組顯示；平板以上：一次顯示一項
  const shown = (p: Panel): boolean => (wide ? panel === p : p === 'common' ? group === 'common' : group === 'advanced');

  const item = (p: Panel) => (
    <button key={p} type="button" class={`set-nav-item${panel === p ? ' on' : ''}`} aria-current={panel === p ? 'page' : undefined} onClick={() => setPanel(p)}>
      <b>{N[p].title}</b>
      <span>{subs[p]}</span>
    </button>
  );

  return (
    <main class="page settings-page" id="main">
      <h1>{S.settingsPage.title}</h1>

      {!wide && (
        <div class="seg set-seg" role="tablist" aria-label={S.settingsPage.groupLabel}>
          {(['common', 'advanced'] as const).map((g) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} class={group === g ? 'on' : ''} onClick={() => setPanel(g === 'common' ? 'common' : panel === 'common' ? 'backup' : panel)}>
              {S.settingsPage.groups[g]}
            </button>
          ))}
        </div>
      )}

      <div class="set-cols">
        {wide && (
          <nav class="set-nav" aria-label={S.settingsPage.navLabel}>
            <p class="set-nav-h">{S.settingsPage.navHeads.common}</p>
            {item('common')}
            <p class="set-nav-h">{S.settingsPage.navHeads.advanced}</p>
            {ADVANCED.map(item)}
          </nav>
        )}
        <div class="set-main">
          {shown('common') && (
            <>
              <FolderCard />
              <DefaultsCard />
            </>
          )}
          {shown('backup') && (
            <>
              <CloudCard />
              <BackupCard />
            </>
          )}
          {shown('look') && <LookCard />}
          {shown('help') && <HelpCards />}
        </div>
      </div>

      <ActBar fixed>
        <button class="btn secondary grow" type="button" onClick={() => go(st.session ? 'prepare' : 'home')}>
          {S.back}
        </button>
      </ActBar>
    </main>
  );
}
