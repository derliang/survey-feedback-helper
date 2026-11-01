import { roleLabelsOf } from '../../app/method';
import { rosterStudents } from '../../app/progress';
import { go, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { ActBar, Notice } from '../parts/parts';

export function MethodView() {
  const st = useApp();
  const s = st.session;
  const M = S.method;
  return (
    <main class="page method" id="main">
      <h1>{M.title}</h1>
      <p class="lead">{M.lead}</p>

      {!s && <Notice kind="info">{M.noSession}</Notice>}

      {s && (
        <>
          <section class="card">
            <h2>{M.sourceTitle}</h2>
            <p>{M.source(s.fileName, s.table.rows.length, s.table.headers.length)}</p>
            <h3>{M.mapping}</h3>
            <ul class="plain-list">
              {roleLabelsOf(s).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
          <section class="card">
            <h2>{M.includedTitle}</h2>
            <ul class="plain-list">
              <li>{s.excluded.length > 0 ? M.excluded(s.excluded.length) : M.noExcluded}</li>
              {s.kind === 'feedback' && <li>{M.trimText(st.stats.trim)}</li>}
              <li>{M.rosterText(rosterStudents(s).length)}</li>
            </ul>
          </section>
        </>
      )}

      <section class="card">
        <h2>{M.calcTitle}</h2>
        <ul class="plain-list">
          {M.calc.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section class="card">
        <h2>{M.settingsTitle}</h2>
        <ul class="plain-list">
          {s && <li>{M.scaleText(s.scale.min, s.scale.max)}</li>}
          {s && s.kind === 'feedback' && (
            <li>{M.reversedText(s.cols.filter((c) => st.stats.reversed.includes(c.index)).map((c) => c.label))}</li>
          )}
          {s && s.kind === 'vote' && <li>{M.seedText(st.stats.seed)}</li>}
          <li>{M.repro}</li>
          <li>{M.noAi}</li>
        </ul>
      </section>

      <section class="card">
        <h2>{M.noteTitle}</h2>
        <ul class="plain-list">
          {M.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <ActBar>
        <button class="btn secondary grow" type="button" onClick={() => go(s ? 'stats' : 'home')}>
          {M.back}
        </button>
      </ActBar>
    </main>
  );
}
