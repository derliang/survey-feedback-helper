import { useEffect, useRef } from 'preact/hooks';
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
  return <RestartSheet loseCourse={st.folder.state !== 'ready' && st.session?.course.result != null} />;
}

function RestartSheet({ loseCourse }: { loseCourse: boolean }) {
  const cancel = useRef<HTMLButtonElement>(null);
  // 取消是預設焦點（Sheet 先把焦點放在視窗上，這裡再移到取消鈕）
  useEffect(() => cancel.current?.focus(), []);
  return (
    <Sheet
      title={S.settingsPage.restartTitle}
      onClose={() => set({ confirmRestart: false })}
      footer={
        <>
          <button class="btn secondary" type="button" ref={cancel} onClick={() => set({ confirmRestart: false })}>
            {S.cancel}
          </button>
          <button class="btn danger grow" type="button" onClick={restart}>
            {S.settingsPage.restartYes}
          </button>
        </>
      }
    >
      <p>{S.settingsPage.restartConfirm}</p>
      {loseCourse && <p><strong>{S.settingsPage.restartLoseCourse}</strong></p>}
    </Sheet>
  );
}
