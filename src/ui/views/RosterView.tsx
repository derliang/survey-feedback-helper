import { useRef, useState } from 'preact/hooks';
import { tableFromCsv, tableFromRows } from '../../core';
import { xlsxSource } from '../../core/xlsx';
import { type RosterRow, isMixedClasses, parsePastedRoster, rosterFromRows, rosterRowsFromTable } from '../../app/roster-input';
import { decodeCsv, guessDelimiter } from '../../app/load';
import { go, saveSurvey, setSession, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { ActBar, Notice } from '../parts/parts';

async function rowsFromFile(file: File): Promise<RosterRow[] | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let table;
  if (/\.xlsx$/i.test(file.name)) {
    const sheets = await xlsxSource(bytes).sheets();
    table = sheets.map((sh) => tableFromRows(sh.rows)).find((t) => t.headers.length > 0);
  } else {
    const text = decodeCsv(bytes);
    table = tableFromCsv(text, guessDelimiter(text));
  }
  return table ? rosterRowsFromTable(table.headers, table.rows) : null;
}

export function RosterView() {
  const st = useApp();
  const s = st.session;
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  if (!s) return null;

  const rows = s.rosterRows ?? [];
  const { students, problems } = rosterFromRows(rows);
  const flagged = new Map<number, string>();
  for (const p of problems) for (const r of p.rows) flagged.set(r, S.roster.problem[p.kind]);
  const sameNames = problems.filter((p) => p.kind === 'duplicateName').length;
  const saved = st.data.rosters;
  const setRows = (next: RosterRow[]) => setSession({ rosterRows: next, rosterSkipped: false });
  const className = (rows[0]?.class ?? '') as string;
  const defaultClass = s.rosterMixed ? '' : className;

  const edit = (i: number, patch: Partial<RosterRow>) => setRows(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  return (
    <div class="view">
      <h2>{S.roster.title}</h2>
      <p class="hint">{S.roster.lead}</p>

      <div class="seg" role="tablist" aria-label={S.roster.title}>
        {([false, true] as const).map((m) => (
          <button key={String(m)} type="button" role="tab" aria-selected={s.rosterMixed === m} class={s.rosterMixed === m ? 'on' : ''} onClick={() => setSession({ rosterMixed: m })}>
            {m ? S.roster.mixed : S.roster.sameClass}
          </button>
        ))}
      </div>

      {!s.rosterMixed && (
        <label class="field">
          <span class="label">{S.roster.className}</span>
          <input
            class="input"
            value={className}
            onInput={(e) => {
              const v = e.currentTarget.value;
              setRows(rows.map((r) => ({ ...r, class: v })));
            }}
          />
        </label>
      )}

      <label class="field">
        <span class="label">{S.roster.paste}</span>
        <textarea
          class="input area"
          rows={5}
          value={paste}
          placeholder={s.rosterMixed ? S.roster.pasteHintMixed : S.roster.pasteHintSame}
          onInput={(e) => setPaste(e.currentTarget.value)}
        />
        <span class="hint">{s.rosterMixed ? S.roster.pasteHintMixed : S.roster.pasteHintSame}</span>
      </label>
      <div class="btn-row">
        <button
          class="btn secondary"
          type="button"
          disabled={paste.trim() === ''}
          onClick={() => {
            setRows(parsePastedRoster(paste, s.rosterMixed, defaultClass));
            setPaste('');
            setError('');
          }}
        >
          {S.roster.pasteAction}
        </button>
        <button class="btn secondary" type="button" onClick={() => fileRef.current?.click()}>
          {S.roster.openFile}
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".xlsx,.csv,.tsv"
          data-testid="roster-input"
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (!file) return;
            try {
              const r = await rowsFromFile(file);
              if (!r) setError(S.roster.noNameCol);
              else {
                setRows(r);
                setSession({ rosterMixed: isMixedClasses(rosterFromRows(r).students), rosterName: file.name.replace(/\.[^.]+$/, '') });
                setError('');
              }
            } catch {
              setError(S.load.unreadable);
            }
          }}
        />
      </div>
      <p class="hint">{S.roster.openFileHint}</p>
      {error && <Notice kind="bad">{error}</Notice>}

      {saved.length > 0 && (
        <div class="saved-rosters">
          <span class="label">{S.roster.saved}</span>
          <div class="chips">
            {saved.map((r) => (
              <button
                key={r.id}
                class="chip"
                type="button"
                onClick={() => {
                  setRows(r.students.map((x) => ({ class: x.class, seat: String(x.seat), name: x.name })));
                  setSession({ rosterMixed: isMixedClasses(r.students), rosterName: r.name });
                }}
              >
                {r.name}（{r.students.length}）
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 ? (
        <>
          <h3 class="sub-h">{S.roster.preview(students.length, sameNames)}</h3>
          <div class="table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  {S.roster.cols.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                  <th scope="col" class="sr">
                    狀態
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} class={flagged.has(i) ? 'flag' : ''}>
                    <td>
                      <input class={`cell${s.rosterMixed ? '' : ' faint'}`} aria-label={`第 ${i + 1} 列班級`} value={r.class} onInput={(e) => edit(i, { class: e.currentTarget.value })} />
                    </td>
                    <td>
                      <input class="cell narrow" inputMode="numeric" aria-label={`第 ${i + 1} 列座號`} value={r.seat} onInput={(e) => edit(i, { seat: e.currentTarget.value })} />
                    </td>
                    <td>
                      <input class="cell" aria-label={`第 ${i + 1} 列姓名`} value={r.name} onInput={(e) => edit(i, { name: e.currentTarget.value })} />
                    </td>
                    <td>{flagged.has(i) && <span class="tag warn">{flagged.get(i)}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button class="btn ghost small" type="button" onClick={() => setSession({ rosterRows: null })}>
            {S.roster.clear}
          </button>
        </>
      ) : (
        <p class="empty">{S.roster.empty}</p>
      )}

      <ActBar>
        <button class="btn secondary" type="button" onClick={() => go('prepare')}>
          {S.back}
        </button>
        {students.length === 0 && (
          <button
            class="btn secondary"
            type="button"
            onClick={() => {
              setSession({ rosterSkipped: true });
              go('prepare', 'check');
            }}
          >
            {S.roster.skip}
          </button>
        )}
        <button
          class="btn primary grow"
          type="button"
          disabled={students.length === 0}
          onClick={() => {
            void saveSurvey();
            go('prepare', 'compare');
          }}
        >
          {S.roster.compare}
        </button>
      </ActBar>
    </div>
  );
}
