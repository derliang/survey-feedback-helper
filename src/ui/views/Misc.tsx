import { choosePickFolder, restart, set, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { Sheet } from '../parts/parts';

export { Settings } from './SettingsPage';

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
      title={S.settingsPage.restartTitle}
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
