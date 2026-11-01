import { useEffect, useRef, useState } from "preact/hooks";
import { setCloudToken } from "../../app/cloud";
import {
  backupToDrive,
  openSurveyTable,
  updatePrefs,
  useApp,
} from "../../app/store";
import { readGoogleConfig } from "../../google/config";
import type { ConnectResult } from "../../google/session";
import type { GoogleServices } from "../../google/types";
import { strings as S } from "../strings";
import { AccountChooser, Icon, Notice, Sheet, useWide } from "../parts/parts";
import { CloudExplain, CloudSwitch } from "./CloudParts";

const env = () => import.meta.env as Record<string, string | undefined>;

/** 建置時有三項 Google 設定才開放；沒有就維持「尚未開放」。 */
export function googleConfigured(): boolean {
  return readGoogleConfig(env()).ok;
}

// 只放在記憶體：重新整理頁面就沒了（硬規則 6：不寫進瀏覽器儲存）。
let token: string | null = null;
let servicesPromise: Promise<GoogleServices | null> | null = null;

/** Google 程式碼在第一次需要時才載入（不進首頁 bundle）。 */
function loadServices(): Promise<GoogleServices | null> {
  servicesPromise ??= import("../../google").then((m) =>
    m.createGoogleServices(env()),
  );
  return servicesPromise;
}

type Phase = "intro" | "reading" | "blocked" | "closed" | "failed" | "empty";

export function GoogleConnectDialog(props: {
  onClose: () => void;
  onExcel: () => void;
  /** 只登入、不選試算表（設定頁與備份失敗提示用）。 */
  loginOnly?: boolean;
}) {
  const app = useApp();
  const [svc, setSvc] = useState<GoogleServices | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  // 預載時一併載好；點擊時要能同步呼叫，不能再 await 動態載入
  const connect = useRef<
    | ((
        s: GoogleServices,
        o: { selectAccount: boolean },
      ) => Promise<ConnectResult>)
    | null
  >(null);

  // 進入就預載登入腳本：載好前「前往 Google」停用，確保按下去的同一瞬間能開彈窗
  useEffect(() => {
    mounted.current = true;
    void loadServices().then(async (s) => {
      if (!s || !mounted.current) return;
      setSvc(s);
      try {
        const m = await import("../../google/session");
        connect.current = m.connectGoogle;
        await s.auth.preload();
        if (mounted.current) setReady(s.auth.isReady());
      } catch {
        if (mounted.current) {
          setPhase("failed");
          setMessage("連不上 Google，請檢查網路後再試，或改用 Excel 檔。");
        }
      }
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const read = async (s: GoogleServices, t: string) => {
    setPhase("reading");
    const { pickAndRead } = await import("../../google/session");
    const r = await pickAndRead(s, t);
    if (!mounted.current) return;
    if (r.status === "cancelled") return setPhase("intro");
    if (r.status === "ok") {
      props.onClose();
      return openSurveyTable(r.table, r.name);
    }
    if (r.status === "empty") {
      setMessage(S.google.emptySheet(r.name));
      return setPhase("empty");
    }
    setMessage(r.message);
    if (r.failure === "auth") {
      token = null;
      setCloudToken(null);
    }
    setPhase("failed");
  };

  const go = () => {
    const run = connect.current;
    if (!svc || !ready || !run) return;
    // run 在第一個同步步驟就呼叫 signIn（同步開彈窗），之後才 await
    void run(svc, { selectAccount: token === null }).then(async (r) => {
      if (!mounted.current) return;
      if (r.status === "popup-blocked") return setPhase("blocked");
      if (r.status === "cancelled") return setPhase("closed");
      if (r.status === "failed") {
        setMessage(r.message);
        return setPhase("failed");
      }
      token = r.token;
      setCloudToken(r.token);
      void backupToDrive();
      if (props.loginOnly) return props.onClose();
      await read(svc, r.token);
    });
  };

  const isBlocked = phase === "blocked";
  const isClosed = phase === "closed";
  const wide = useWide();
  const goLabel = !ready
    ? S.google.preparing
    : isBlocked
      ? wide
        ? S.google.goAgain
        : S.google.retry
      : isClosed
        ? S.google.retry
        : S.google.go;
  // 依 DESIGN.md 5.25：停用態與失敗畫面都留「改用 Excel 檔」；一般登入前提示卡只有「取消」「前往 Google」
  const showExcel = phase !== "reading" && (!ready || phase !== "intro");
  const footer = (
    <>
      <button class="btn secondary" type="button" onClick={props.onClose}>
        {S.google.cancel}
      </button>
      {showExcel && (
        <button class="btn secondary" type="button" onClick={props.onExcel}>
          {S.google.useExcel}
        </button>
      )}
      {phase !== "reading" && (
        <button
          class="btn primary"
          type="button"
          disabled={!ready}
          aria-describedby={ready ? undefined : "g-why"}
          onClick={go}
          data-testid="google-go"
        >
          {goLabel}
        </button>
      )}
    </>
  );
  const title = isBlocked
    ? S.google.blockedSheet
    : isClosed
      ? S.google.closedSheet
      : S.google.title;
  const steps = (list: readonly (readonly string[])[]) => (
    <ol class="g-steps">
      {list.map(([h, b], i) => (
        <li key={h}>
          <strong>
            {i + 1}. {h}
          </strong>
          <span>{b}</span>
        </li>
      ))}
    </ol>
  );
  const noLogin = (
    <p class="hint">
      <Icon name="info" />
      <span>
        <strong>{S.google.noLoginTitle}</strong> {S.google.noLogin}{" "}
        {S.cloud.noLoginExtra}
      </span>
    </p>
  );

  return (
    <Sheet title={title} onClose={props.onClose} footer={footer} label={title}>
      {phase === "reading" ? (
        <p role="status">{S.google.reading}</p>
      ) : isBlocked || isClosed ? (
        <>
          <Notice
            kind="warn"
            title={isBlocked ? S.google.blockedTitle : S.google.closedTitle}
          >
            <p>{isBlocked ? S.google.blockedLead : S.google.closedLead}</p>
            <p>{isBlocked ? S.google.blockedCode : S.google.closedCode}</p>
          </Notice>
          {steps(isBlocked ? S.google.blockedSteps : S.google.closedSteps)}
          {noLogin}
        </>
      ) : (
        <>
          <p>
            {S.google.intro}
            <strong>{S.google.lead}</strong>
          </p>
          <AccountChooser />
          {phase === "intro" && (
            <>
              <CloudExplain />
              <CloudSwitch
                on={app.prefs.cloudBackup}
                onChange={(v) => updatePrefs({ cloudBackup: v })}
              />
            </>
          )}
          {!ready && phase === "intro" && (
            <p class="hint" id="g-why" role="status">
              <Icon name="info" />
              <span>
                <strong>{S.google.preparingTitle}</strong>{" "}
                {S.google.preparingWhy}
              </span>
            </p>
          )}
          {(phase === "failed" || phase === "empty") && (
            <Notice kind="warn">{message}</Notice>
          )}
          {noLogin}
        </>
      )}
    </Sheet>
  );
}
