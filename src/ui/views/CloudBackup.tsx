import { useState } from "preact/hooks";
import { hasCloudToken } from "../../app/cloud";
import { backupToDrive, set, setCloudBackup, useApp } from "../../app/store";
import { googleConfigured, GoogleConnectDialog } from "./GoogleConnect";
import { CloudExplain, CloudSwitch, saveMessage } from "./CloudParts";
import { SETTINGS_FILE } from "../../storage/folder-data";
import { strings as S } from "../strings";
import { Icon, Notice, Sheet } from "../parts/parts";

function when(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** 設定頁「雲端備份（選用）」：關／開且運作中／開但這次還沒登入／暫停 */
export function CloudCard() {
  const st = useApp();
  const [ask, setAsk] = useState<"on" | "off" | "login" | null>(null);
  const [alsoDisconnect, setAlsoDisconnect] = useState(false);
  if (!googleConfigured()) return null;
  const on = st.prefs.cloudBackup;
  const signed = hasCloudToken();
  return (
    <section class="card" data-testid="cloud-card">
      <h2>{S.cloud.title}</h2>
      <CloudSwitch
        on={on}
        onChange={(v) => {
          setAlsoDisconnect(false);
          setAsk(v ? "on" : "off");
        }}
      />
      {!on && <p class="hint">{S.cloud.offStatus}</p>}
      {on && st.cloud.paused && (
        <Notice kind="warn" title={S.cloud.paused}>
          <p>{saveMessage(st.cloud.paused, st.folder.state === "ready")}</p>
        </Notice>
      )}
      {on && !signed && !st.cloud.paused && (
        <Notice kind="warn">
          <p>{S.cloud.needLogin}</p>
        </Notice>
      )}
      {on && signed && !st.cloud.paused && (
        <p class="hint">
          {S.cloud.onStatus}{" "}
          {st.cloud.lastSaved
            ? S.cloud.lastSaved(when(st.cloud.lastSaved))
            : S.cloud.neverSaved}{" "}
          {S.cloud.where(SETTINGS_FILE)}
        </p>
      )}
      {on && (
        <div class="btn-row">
          {!signed && (
            <button class="btn primary" type="button" onClick={() => setAsk("login")}>
              {S.cloud.login}
            </button>
          )}
          {signed && (
            <button class="btn secondary" type="button" onClick={() => void backupToDrive()}>
              {S.cloud.syncNow}
            </button>
          )}
          {signed && (
            <button
              class="btn secondary"
              type="button"
              onClick={() => {
                setCloudBackup(false, true);
              }}
            >
              {S.cloud.disconnect}
            </button>
          )}
        </div>
      )}
      <p class="hint">{S.cloud.order}</p>
      {ask === "on" && (
        <Sheet
          title={S.cloud.confirmTitle}
          onClose={() => setAsk(null)}
          footer={
            <>
              <button class="btn secondary" type="button" onClick={() => setAsk(null)}>
                {S.cloud.confirmNo}
              </button>
              <button
                class="btn primary"
                type="button"
                data-testid="cloud-confirm-on"
                onClick={() => {
                  setAsk(null);
                  setCloudBackup(true);
                }}
              >
                {S.cloud.confirmOk}
              </button>
            </>
          }
        >
          <CloudExplain />
        </Sheet>
      )}
      {ask === "off" && (
        <Sheet
          title={S.cloud.offTitle}
          onClose={() => setAsk(null)}
          footer={
            <>
              <button class="btn secondary" type="button" onClick={() => setAsk(null)}>
                {S.cloud.offKeep}
              </button>
              <button
                class="btn primary"
                type="button"
                data-testid="cloud-confirm-off"
                onClick={() => {
                  setAsk(null);
                  setCloudBackup(false, alsoDisconnect);
                }}
              >
                {S.cloud.offOk}
              </button>
            </>
          }
        >
          <ul class="plain-list">
            <li>{S.cloud.offBody1}</li>
            <li>{S.cloud.offBody2}</li>
            <li>{S.cloud.offBody3}</li>
          </ul>
          <label class="g-check">
            <input
              type="checkbox"
              checked={alsoDisconnect}
              onChange={(e) => setAlsoDisconnect((e.currentTarget as HTMLInputElement).checked)}
            />
            <span>{S.cloud.offAlso}</span>
          </label>
        </Sheet>
      )}
      {ask === "login" && (
        <GoogleConnectDialog
          loginOnly
          onClose={() => setAsk(null)}
          onExcel={() => setAsk(null)}
        />
      )}
    </section>
  );
}

/** 失敗提示：圖示、role=alert、不自動消失、可有動作鈕與關閉鈕。 */
export function CloudAlert() {
  const st = useApp();
  const [login, setLogin] = useState(false);
  const kind = st.cloudAlert;
  if (!kind) return null;
  const hasFolder = st.folder.state === "ready";
  const message = saveMessage(kind, hasFolder);
  const action =
    kind === "network"
      ? { label: S.cloud.retry, run: () => void backupToDrive() }
      : kind === "auth"
        ? { label: S.cloud.relogin, run: () => setLogin(true) }
        : null;
  return (
    <>
      <div class="toast toast-bad" role="alert" data-testid="cloud-alert">
        <Icon name="warn" />
        <span>{message}</span>
        {action && (
          <button class="btn secondary" type="button" onClick={action.run}>
            {action.label}
          </button>
        )}
        <button
          class="toast-x"
          type="button"
          aria-label={S.cloud.close}
          onClick={() => set({ cloudAlert: null })}
        >
          ✕
        </button>
      </div>
      {login && (
        <GoogleConnectDialog
          loginOnly
          onClose={() => setLogin(false)}
          onExcel={() => setLogin(false)}
        />
      )}
    </>
  );
}
