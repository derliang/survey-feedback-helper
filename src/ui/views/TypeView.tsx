import { inferKind } from '../../app/columns';
import { go, setSession, useApp } from '../../app/store';
import type { SurveyKind } from '../../storage';
import { strings as S } from '../strings';
import { ActBar } from '../parts/parts';

const KINDS: SurveyKind[] = ['course', 'feedback', 'vote', 'opinion'];

export function TypeView() {
  const s = useApp().session;
  if (!s) return null;
  const suggested = inferKind(s.cols);
  return (
    <div class="view">
      <h2>{S.type.title}</h2>
      <p class="hint">{S.type.suggest(S.type.options[suggested.kind][0])}</p>
      <div class="rcards" role="radiogroup" aria-label={S.type.title}>
        {KINDS.map((k) => {
          const on = s.kind === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={on}
              class={`rcard${on ? ' on' : ''}`}
              onClick={() => setSession({ kind: k, kindReason: suggested.kind === k ? suggested.reason : '' })}
            >
              <span class="radio" aria-hidden="true" />
              <span class="rc-main">
                <strong>
                  {S.type.options[k][0]}
                  {suggested.kind === k && <span class="tag accent">{S.type.badge}</span>}
                </strong>
                <span class="rc-sub">{S.type.options[k][1]}</span>
              </span>
            </button>
          );
        })}
      </div>
      {s.kind === 'course' && (
        <details class="howto" data-testid="course-howto">
          <summary>
            {S.type.courseHow} {S.type.toVerify && <span class="tag warn">{S.type.toVerify}</span>}
          </summary>
          <p>{S.type.courseHowBody}</p>
        </details>
      )}
      <details class="howto" open={suggested.kind === s.kind}>
        <summary>{S.type.howTitle}</summary>
        <p>{suggested.reason}</p>
      </details>
      <ActBar>
        <button class="btn secondary" type="button" onClick={() => go('prepare')}>
          {S.back}
        </button>
        <button
          class="btn primary grow"
          type="button"
          onClick={() => {
            setSession({ kindConfirmed: true });
            go('prepare', 'mapping');
          }}
        >
          {S.type.confirm}
        </button>
      </ActBar>
    </div>
  );
}
