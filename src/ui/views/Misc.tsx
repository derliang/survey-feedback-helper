import { choosePickFolder, downloadSettings, forgetThisFolder, go, restart, set, updatePrefs, useApp } from '../../app/store';
import { type Lang, type Theme, isTouchDevice } from '../../storage';
import { strings as S } from '../strings';
import { ActBar, Sheet } from '../parts/parts';
import { CloudCard } from './CloudBackup';
import { BackupCard, DefaultsCard } from './SettingsExtra';

export function Settings() {
  const st = useApp();
  const f = st.folder;
  const touch = isTouchDevice();
  return (
    <main class="page" id="main">
      <h1>{S.settingsPage.title}</h1>

      <section class="card">
        <h2>{S.settingsPage.privacyTitle}</h2>
        <ul class="plain-list">
          {S.privacy.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <a
          class="privacy-link"
          href={`${import.meta.env.BASE_URL}privacy.html`}
          target="_blank"
          rel="noopener"
        >
          {S.privacyPolicy}
        </a>
      </section>

      <section class="card">
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
            <p class="hint">{touch ? S.folder.touchManualBody : S.folder.manualBody}</p>
          </>
        )}
      </section>

      <CloudCard />
      <DefaultsCard />
      <BackupCard />

      <section class="card">
        <h2>{S.settingsPage.theme}</h2>
        <div class="seg" role="radiogroup" aria-label={S.settingsPage.theme}>
          {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={st.prefs.theme === t} class={st.prefs.theme === t ? 'on' : ''} onClick={() => updatePrefs({ theme: t })}>
              {S.settingsPage.themes[t]}
            </button>
          ))}
        </div>
      </section>

      <section class="card">
        <h2>{S.settingsPage.language}</h2>
        <div class="seg" role="radiogroup" aria-label={S.settingsPage.language}>
          {(['zh', 'en'] as Lang[]).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={st.prefs.lang === l} class={st.prefs.lang === l ? 'on' : ''} onClick={() => updatePrefs({ lang: l })}>
              {S.settingsPage.languages[l]}
            </button>
          ))}
        </div>
      </section>

      <section class="card">
        <h2>{S.settingsPage.offlineTitle}</h2>
        <p>{S.settingsPage.offlineBody}</p>
      </section>

      <section class="card">
        <h2>{S.settingsPage.shortcutsTitle}</h2>
        <p>{S.settingsPage.shortcutsBody}</p>
      </section>

      <section class="card">
        <h2>{S.settingsPage.browserTitle}</h2>
        <p>{S.settingsPage.browserBody}</p>
      </section>

      <ActBar>
        <button class="btn secondary grow" type="button" onClick={() => go(st.session ? 'prepare' : 'home')}>
          {S.back}
        </button>
      </ActBar>
    </main>
  );
}

export function FolderDialog() {
  const st = useApp();
  if (!st.folderDialog) return null;
  const supported = st.folder.state !== 'unsupported';
  return (
    <Sheet
      title={S.folder.dialogTitle}
      onClose={() => set({ folderDialog: false })}
      footer={
        <>
          <button class="btn secondary" type="button" onClick={() => set({ folderDialog: false })}>
            {supported ? S.folder.later : S.close}
          </button>
          {supported && (
            <button class="btn primary grow" type="button" onClick={() => void choosePickFolder()}>
              {S.folder.chooseFolder}
            </button>
          )}
        </>
      }
    >
      <p>{S.folder.dialogBody}</p>
      <p>
        <strong>{S.folder.dialogNote}</strong>
      </p>
      <h3>{S.folder.anywhereTitle}</h3>
      <p>{S.folder.anywhereBody}</p>
      <p class="hint">{S.folder.browserNote}</p>
    </Sheet>
  );
}

export function RestartDialog() {
  const st = useApp();
  if (!st.confirmRestart) return null;
  return (
    <Sheet
      title={S.restart}
      onClose={() => set({ confirmRestart: false })}
      footer={
        <>
          <button class="btn secondary" type="button" onClick={() => set({ confirmRestart: false })}>
            {S.cancel}
          </button>
          <button class="btn danger grow" type="button" onClick={restart}>
            {S.settingsPage.restartYes}
          </button>
        </>
      }
    >
      <p>{S.settingsPage.restartConfirm}</p>
    </Sheet>
  );
}
