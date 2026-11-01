import { useRef, useState } from "preact/hooks";
import {
  dismiss,
  downloadSettings,
  go,
  importSettings,
  openSurveyFile,
  reauthorize,
  set,
  useApp,
} from "../../app/store";
import { isTouchDevice, recentSurveys } from "../../storage";
import { strings as S } from "../strings";
import { Icon, Notice } from "../parts/parts";
import { GoogleConnectDialog, googleConfigured } from "./GoogleConnect";

// iOS 的「檔案」選擇器遇到不認得的副檔名會把檔案灰掉：試算表加上 MIME，設定檔在觸控裝置不設限（讀進來再檢查格式）。
const SURVEY_ACCEPT =
  ".xlsx,.csv,.tsv,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values,application/vnd.ms-excel";
const CONFIG_ACCEPT = ".sfh,.json,application/json";

export function FolderNotices() {
  const st = useApp();
  const f = st.folder;
  const touch = isTouchDevice();
  return (
    <>
      {f.state === "needsPermission" && (
        <Notice
          kind="warn"
          title={S.folder.reauthTitle(f.name)}
          actions={
            <>
              <button
                class="btn primary small"
                type="button"
                onClick={() => void reauthorize()}
              >
                {S.folder.reauth}
              </button>
              <button
                class="btn secondary small"
                type="button"
                onClick={() => set({ folderDialog: true })}
              >
                {S.folder.repick}
              </button>
            </>
          }
        >
          {S.folder.reauthBody}
        </Notice>
      )}
      {f.state === "unsupported" &&
        !st.prefs.dismissed.includes("unsupported") && (
          <div class="notice-line" role="status" data-testid="unsupported-line">
            <Icon name="info" />
            <span>{touch ? S.folder.touchLine : S.folder.desktopLine}</span>
            <button
              class="btn ghost small"
              type="button"
              aria-label={S.folder.closeLine}
              onClick={() => dismiss("unsupported")}
            >
              {S.close}
            </button>
          </div>
        )}
      {f.state !== "ready" && st.dirty && (
        <Notice
          kind="warn"
          title={S.folder.dirtyTitle}
          actions={
            <button
              class="btn primary small"
              type="button"
              onClick={() => void downloadSettings()}
            >
              {touch ? S.folder.saveToFiles : S.folder.download}
            </button>
          }
        >
          {touch ? S.folder.touchDirtyBody : S.folder.dirtyBody}
        </Notice>
      )}
    </>
  );
}

export function Home() {
  const st = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const cfgRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const googleOn = googleConfigured();
  const recent = recentSurveys(st.data);
  const f = st.folder;

  const pick = (file: File | undefined) => {
    if (file) void openSurveyFile(file);
  };

  return (
    <main class="page home" id="main">
      {googleOpen && (
        <GoogleConnectDialog
          onClose={() => setGoogleOpen(false)}
          onExcel={() => {
            setGoogleOpen(false);
            fileRef.current?.click();
          }}
        />
      )}
      <FolderNotices />
      <h1>{S.home.title}</h1>
      <p class="lead">{S.home.lead}</p>
      <div class="home-grid">
        <section aria-label={S.home.pickFile}>
          <div
            class={`drop${over ? " over" : ""}`}
            data-testid="drop"
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              pick(e.dataTransfer?.files?.[0]);
            }}
          >
            <Icon name="upload" />
            <strong class="drop-main">{S.home.drop}</strong>
            <span class="drop-or">{S.home.dropOr}</span>
          </div>
          <div class="open-buttons">
            <div class="open-cell">
              <button
                class="btn secondary"
                type="button"
                disabled={!googleOn}
                aria-describedby="sheet-why"
                onClick={() => setGoogleOpen(true)}
              >
                {S.home.openSheet}
              </button>
              <p class="hint open-why" id="sheet-why">
                <Icon name="info" />
                <span>
                  {googleOn ? S.home.openSheetReady : S.home.openSheetWhy}
                </span>
              </p>
            </div>
            <button
              class="btn primary"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              {S.home.pickFile}
            </button>
            <button
              class="btn secondary"
              type="button"
              onClick={() => cfgRef.current?.click()}
            >
              {S.home.openConfig}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept={SURVEY_ACCEPT}
            data-testid="file-input"
            onChange={(e) => {
              pick(e.currentTarget.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={cfgRef}
            type="file"
            hidden
            accept={isTouchDevice() ? undefined : CONFIG_ACCEPT}
            data-testid="config-input"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void importSettings(file);
              e.currentTarget.value = "";
            }}
          />
          <p class="home-links">
            <button
              class="btn ghost small"
              type="button"
              onClick={() => go("templates")}
            >
              {S.home2.templates}
            </button>
            <button
              class="btn ghost small"
              type="button"
              onClick={() => go("guide")}
            >
              {S.home2.guide}
            </button>
          </p>
          <details class="howto">
            <summary>{S.load.howExport}</summary>
            <p>{S.load.howExportBody}</p>
          </details>
        </section>

        <section aria-labelledby="recent-h">
          <h2 id="recent-h">{S.home.recent}</h2>
          {recent.length > 0 ? (
            <>
              <p class="hint">{S.home.recentLead}</p>
              <ul class="cards">
                {recent.map((r) => {
                  const more = st.pendingRecent === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        class="card-btn"
                        type="button"
                        aria-label={`${r.name}，${S.home.kindNames[r.kind]}`}
                        onClick={() => {
                          set({ pendingRecent: r.id });
                          fileRef.current?.click();
                        }}
                      >
                        <strong>{r.name}</strong>
                        <span class="meta">
                          {S.home.kindNames[r.kind]} · {r.sourceLabel}
                        </span>
                        <span class="meta">
                          {S.home.lastUsed(
                            r.lastUsed
                              .slice(5)
                              .replace("-", "/")
                              .replace(/^0/, ""),
                          )}
                          <span class="tag">{S.home.autoFill}</span>
                        </span>
                        {more && <span class="hint">{S.home.recentPick}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p class="empty">
              {f.state === "needsPermission"
                ? S.home.recentNeedAuth
                : f.state === "ready"
                  ? S.home.recentEmpty
                  : S.home.recentNeedFolder}
            </p>
          )}
        </section>
      </div>

      <footer class="folder-bar">
        <span class="folder-line">
          <Icon name="folder" />
          <span>{S.folder.label}</span>
          <strong data-testid="folder-name">
            {f.state === "ready"
              ? f.store.name
              : f.state === "needsPermission"
                ? f.name
                : S.folder.none}
          </strong>
          {f.state === "ready" && (
            <span class="tag ok">{S.folder.connected}</span>
          )}
          {f.state === "unsupported" && (
            <span class="tag">{S.folder.unsupportedShort}</span>
          )}
          {(f.state === "none" || f.state === "ready") && (
            <button
              class="btn ghost small"
              type="button"
              onClick={() => set({ folderDialog: true })}
            >
              {f.state === "ready" ? S.folder.repick : S.folder.choose}
            </button>
          )}
        </span>
        <span class="privacy-line">{S.privacy.join("")}</span>
        <a
          class="privacy-link"
          href={`${import.meta.env.BASE_URL}privacy.html`}
          target="_blank"
          rel="noopener"
        >
          {S.privacyPolicy}
        </a>
      </footer>
    </main>
  );
}
