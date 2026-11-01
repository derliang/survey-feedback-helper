import { useRef, useState } from 'preact/hooks';
import { dismiss, downloadSettings, importSettings, openSurveyFile, reauthorize, set, useApp } from '../../app/store';
import { recentSurveys } from '../../storage';
import { strings as S } from '../strings';
import { Icon, Notice } from '../parts/parts';

export function FolderNotices() {
  const st = useApp();
  const f = st.folder;
  return (
    <>
      {f.state === 'needsPermission' && (
        <Notice
          kind="warn"
          title={S.folder.reauthTitle(f.name)}
          actions={
            <>
              <button class="btn primary small" type="button" onClick={() => void reauthorize()}>
                {S.folder.reauth}
              </button>
              <button class="btn secondary small" type="button" onClick={() => set({ folderDialog: true })}>
                {S.folder.repick}
              </button>
            </>
          }
        >
          {S.folder.reauthBody}
        </Notice>
      )}
      {f.state === 'unsupported' && !st.prefs.dismissed.includes('unsupported') && (
        <Notice
          kind="info"
          title={S.folder.unsupportedTitle}
          actions={
            <button class="btn secondary small" type="button" onClick={() => dismiss('unsupported')}>
              {S.gotIt}
            </button>
          }
        >
          {S.folder.unsupportedBody} {S.folder.manualBody}
        </Notice>
      )}
      {f.state !== 'ready' && st.dirty && (
        <Notice
          kind="warn"
          title={S.folder.dirtyTitle}
          actions={
            <button class="btn primary small" type="button" onClick={downloadSettings}>
              {S.folder.download}
            </button>
          }
        >
          {S.folder.dirtyBody}
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
  const recent = recentSurveys(st.data);
  const f = st.folder;

  const pick = (file: File | undefined) => {
    if (file) void openSurveyFile(file);
  };

  return (
    <main class="page home" id="main">
      <FolderNotices />
      <h1>{S.home.title}</h1>
      <p class="lead">{S.home.lead}</p>
      <div class="home-grid">
        <section aria-label={S.home.pickFile}>
          <div
            class={`drop${over ? ' over' : ''}`}
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
            <button class="btn secondary" type="button" disabled aria-describedby="sheet-why">
              {S.home.openSheet}
            </button>
            <button class="btn primary" type="button" onClick={() => fileRef.current?.click()}>
              {S.home.pickFile}
            </button>
            <button class="btn secondary" type="button" onClick={() => cfgRef.current?.click()}>
              {S.home.openConfig}
            </button>
          </div>
          <p class="hint" id="sheet-why">
            {S.home.openSheetWhy}
          </p>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".xlsx,.csv,.tsv,.xls"
            data-testid="file-input"
            onChange={(e) => {
              pick(e.currentTarget.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
          <input
            ref={cfgRef}
            type="file"
            hidden
            accept=".sfh,.json"
            data-testid="config-input"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void importSettings(file);
              e.currentTarget.value = '';
            }}
          />
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
                          {S.home.lastUsed(r.lastUsed.slice(5).replace('-', '/').replace(/^0/, ''))}
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
              {f.state === 'needsPermission' ? S.home.recentNeedAuth : f.state === 'ready' ? S.home.recentEmpty : S.home.recentNeedFolder}
            </p>
          )}
        </section>
      </div>

      <footer class="folder-bar">
        <span class="folder-line">
          <Icon name="folder" />
          <span>{S.folder.label}</span>
          <strong data-testid="folder-name">{f.state === 'ready' ? f.store.name : f.state === 'needsPermission' ? f.name : S.folder.none}</strong>
          {f.state === 'ready' && <span class="tag ok">{S.folder.connected}</span>}
          {f.state === 'unsupported' && <span class="tag">{S.folder.unsupportedShort}</span>}
          {(f.state === 'none' || f.state === 'ready') && (
            <button class="btn ghost small" type="button" onClick={() => set({ folderDialog: true })}>
              {f.state === 'ready' ? S.folder.repick : S.folder.choose}
            </button>
          )}
        </span>
        <span class="privacy-line">{S.privacy.join("")}</span>
      </footer>
    </main>
  );
}
