import { type PrepItem, canGoStats, doneCount, prepItems } from '../../app/progress';
import { type Sub, acceptRecognition, go, rejectRecognition, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { ActBar, Icon, Notice, Sheet, useWide } from '../parts/parts';
import { CheckView } from './CheckView';
import { CompareView } from './CompareView';
import { MappingView } from './MappingView';
import { RosterView } from './RosterView';
import { TypeView } from './TypeView';

const SUB_OF: Record<PrepItem['key'], Sub> = { type: 'type', mapping: 'mapping', roster: 'roster', check: 'check' };
const ITEM_OF: Record<Sub, PrepItem['key']> = { type: 'type', mapping: 'mapping', roster: 'roster', compare: 'roster', check: 'check' };

function nextAction(items: PrepItem[]): { sub: Sub; label: string } | null {
  const open = items.find((i) => i.state === 'todo' || i.state === 'attention');
  if (open) return { sub: SUB_OF[open.key], label: `${S.prep.next}：${S.prep.items[open.key].replace('（選用）', '')}` };
  return null;
}

export function Prepare() {
  const st = useApp();
  const wide = useWide();
  const s = st.session;
  if (!s) return null;
  const items = prepItems(s);
  const first = items.find((i) => i.state !== 'done' && i.state !== 'locked');
  const active: Sub | null = st.sub ?? (wide ? (first ? SUB_OF[first.key] : 'check') : null);
  const activeItem = active ? ITEM_OF[active] : null;
  const next = nextAction(items);
  const ready = canGoStats(s);
  const more = s.previousRows !== null ? s.table.rows.length - s.previousRows : null;

  return (
    <main class={`page prep${active ? ' has-sub' : ''}`} id="main">
      <header class="prep-head">
        <h1>{s.name}</h1>
        <p class="meta">
          {S.prep.sourceInfo(s.sourceLabel, s.table.rows.length, s.table.headers.length)}
          {more !== null && more > 0 && <span class="tag accent">{S.prep.moreRows(more)}</span>}
        </p>
      </header>

      <div class="prep-grid">
        <nav class="rail" aria-label={S.prep.title}>
          <p class="rail-top">
            <strong data-testid="done-count">{S.prep.done(doneCount(items))}</strong> · {S.prep.leadIn}
          </p>
          <ol>
            {items.map((it, n) => {
              const locked = it.state === 'locked';
              return (
                <li key={it.key}>
                  <button
                    type="button"
                    class={`rowbtn st-${it.state}${activeItem === it.key ? ' on' : ''}`}
                    disabled={locked}
                    aria-disabled={locked}
                    aria-current={activeItem === it.key ? 'true' : undefined}
                    onClick={() => go('prepare', SUB_OF[it.key])}
                  >
                    <span class="rb-num">{it.state === 'done' ? <Icon name="check" /> : locked ? <Icon name="lock" /> : n + 1}</span>
                    <span class="rb-main">
                      <strong>{S.prep.items[it.key]}</strong>
                      <span class="rb-note">{it.note}</span>
                    </span>
                    <span class={`tag ${it.state === 'done' ? 'ok' : it.state === 'attention' || it.state === 'todo' ? 'warn' : ''}`}>
                      {S.prep.states[it.state]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p class="hint rail-foot">{S.prep.footer}</p>
        </nav>

        <section class="panel" aria-live="polite">
          {active === 'type' && <TypeView />}
          {active === 'mapping' && <MappingView />}
          {active === 'roster' && <RosterView />}
          {active === 'compare' && <CompareView />}
          {active === 'check' && <CheckView />}
        </section>
      </div>

      {!active && (
        <ActBar>
          <button class="btn secondary" type="button" onClick={() => go('home')}>
            {S.back}
          </button>
          {ready ? (
            <button class="btn primary grow" type="button" onClick={() => go('stats')}>
              {S.prep.toStats}
            </button>
          ) : (
            <button class="btn primary grow" type="button" disabled={!next} onClick={() => next && go('prepare', next.sub)}>
              {next?.label ?? S.prep.toStats}
            </button>
          )}
        </ActBar>
      )}

      {s.recognition && (
        <Sheet title={S.recognition.title(s.recognition.survey.name)} onClose={rejectRecognition}
          footer={
            <>
              <button class="btn secondary" type="button" onClick={rejectRecognition}>
                {S.recognition.no}
              </button>
              <button class="btn primary grow" type="button" onClick={acceptRecognition}>
                {S.recognition.yes}
              </button>
            </>
          }
        >
          <Notice kind="info">{S.recognition.body(Math.round(s.recognition.similarity * 100))}</Notice>
        </Sheet>
      )}
    </main>
  );
}
