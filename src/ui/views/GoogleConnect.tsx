import { useEffect, useRef, useState } from "preact/hooks";
import { openSurveyTable } from "../../app/store";
import { readGoogleConfig } from "../../google/config";
import type { ConnectResult } from "../../google/session";
import type { GoogleServices } from "../../google/types";
import { strings as S } from "../strings";
import { Icon, Notice, Sheet } from "../parts/parts";

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
}) {
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
    if (r.failure === "auth") token = null;
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
      await read(svc, r.token);
    });
  };

  const goLabel = !ready
    ? S.google.preparing
    : phase === "blocked"
      ? S.google.goAgain
      : S.google.go;
  const footer = (
    <>
      <button class="btn secondary" type="button" onClick={props.onClose}>
        {S.google.cancel}
      </button>
      {phase !== "intro" && phase !== "reading" && (
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

  return (
    <Sheet
      title={S.google.title}
      onClose={props.onClose}
      footer={footer}
      label={S.google.title}
    >
      {phase === "reading" ? (
        <p role="status">{S.google.reading}</p>
      ) : (
        <>
          <p>{S.google.lead}</p>
          <Chooser />
          {!ready && phase === "intro" && (
            <p class="hint" id="g-why" role="status">
              <Icon name="info" />
              <span>{S.google.preparingWhy}</span>
            </p>
          )}
          {phase === "blocked" && (
            <Notice kind="warn" title={S.google.blockedTitle}>
              <p>{S.google.blockedLead}</p>
              <ol>
                {S.google.blockedSteps.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </Notice>
          )}
          {phase === "closed" && (
            <Notice kind="warn" title={S.google.closedTitle}>
              <p>{S.google.closedLead}</p>
              <ol>
                {S.google.closedSteps.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            </Notice>
          )}
          {(phase === "failed" || phase === "empty") && (
            <Notice kind="warn">{message}</Notice>
          )}
          {phase === "intro" && (
            <p class="hint">
              <Icon name="info" />
              <span>{S.google.noLogin}</span>
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

/** 選帳號畫面的示意圖（虛構帳號）：放著試算表的那一列標「選這個」，不再有「不要選」。 */
function Chooser() {
  return (
    <div class="g-chooser" role="group" aria-label={S.google.chooserLabel}>
      <div class="g-row g-pick">
        <strong>{S.google.accountA}</strong>
        <span>{S.google.sheetName}</span>
        <em>{S.google.pickThis}</em>
      </div>
      <div class="g-row">
        <strong>{S.google.accountB}</strong>
        <span>{S.google.notThis}</span>
      </div>
      <div class="g-row g-other">{S.google.other}</div>
    </div>
  );
}
