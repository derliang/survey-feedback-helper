import type { ComponentChildren } from 'preact';
import {
  type ColumnInfo,
  type Role,
  type ScaleDoubt,
  ignoreAllPending,
  pendingCols,
  pendingFacts,
  sortedCols,
  withPending,
  withRole,
} from '../../app/columns';
import { type Session, setSession } from '../../app/store';
import { strings as S } from '../strings';
import { extra } from '../strings-extra';
import { Icon, Notice } from '../parts/parts';

const CHOICES: Role[] = ['choice', 'comment', 'score', 'ignore'];

/** 「待分類」集中清單（SUR-04）：看不出題型的欄放在列表最上面，一欄一組直接給籌碼；分類前「完成對應」停用。 */
export function PendingCard(props: {
  s: Session;
  setCols: (f: (cols: ColumnInfo[]) => ColumnInfo[]) => void;
  rename: (c: ColumnInfo) => ComponentChildren;
  onMore: (c: ColumnInfo) => void;
}) {
  const { s, setCols } = props;
  const M = S.mapping;
  const pending = pendingCols(s.cols);
  const sorted = sortedCols(s.cols);
  if (pending.length === 0 && sorted.length === 0) return null;
  const done = pending.length === 0;
  const roleName = (r: Role | null) => M.pendChoices[r ?? 'ignore'] ?? M.roles[r ?? 'ignore'] ?? '';
  return (
    <section class={`card pend-card${done ? ' is-done' : ''}`} aria-label={M.pendTitle(pending.length)} data-testid="pending-card">
      <div class="pc-head">
        <span class={`pc-ic ${done ? 'ok' : 'warn'}`}>
          <Icon name={done ? 'check' : 'warn'} />
        </span>
        <h3>{done ? M.pendDoneTitle(sorted.length) : M.pendTitle(pending.length)}</h3>
        {done && <span class="tag ok">{M.pendDoneTag}</span>}
      </div>
      {!done && (
        <>
          <p>{M.pendLead}</p>
          <p class="hint">{M.pendLegend}</p>
          {pending.map((c) => {
            const facts = pendingFacts(s.table, c.index);
            const name = `${c.label}`;
            return (
              <div key={c.index} class="pc-col" data-testid="pending-col">
                <div class="pc-name">
                  <strong>{name}</strong>
                  {props.rename(c)}
                </div>
                <p class="hint">
                  {M.pendSamples(c.samples.slice(0, 5).join(extra().mapping.sep) || extra().mapping.noData)}
                  <br />
                  {M.pendWhy(facts.filled, facts.distinct)}
                </p>
                <div class="chips" role="radiogroup" aria-label={M.pickTitle(name)}>
                  {CHOICES.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={false} class="chip" onClick={() => setCols((cols) => withRole(cols, c.index, r))}>
                      {M.pendChoices[r]}
                    </button>
                  ))}
                  <button type="button" class="btn ghost small" onClick={() => props.onMore(c)}>
                    {M.pendMore}
                  </button>
                </div>
              </div>
            );
          })}
          {pending.length >= 2 && (
            <button type="button" class="btn secondary" onClick={() => setCols(ignoreAllPending)} data-testid="pend-all-ignore">
              {M.pendAllIgnore(pending.length)}
            </button>
          )}
        </>
      )}
      {sorted.length > 0 && (
        <div class="pc-done">
          <strong class="small">{M.pendDoneRows(sorted.length)}</strong>
          {sorted.map((c) => (
            <div key={c.index} class="pc-row">
              <Icon name="check" />
              <span class="pc-row-main">
                <strong>{c.label}</strong>
                <span class="hint">{M.pendDoneAs(roleName(c.role))}</span>
              </span>
              <button type="button" class="btn ghost small" onClick={() => setCols((cols) => withPending(cols, c.index))}>
                {M.pendBack}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** 量表上下限請確認（SUR-06）：附各分數筆數；不預選，只在建議那張標「建議」，老師點了才算確認。 */
export function ScaleCard(props: { s: Session; doubt: ScaleDoubt }) {
  const { s, doubt } = props;
  const M = S.mapping;
  const confirmed = s.scaleConfirmed;
  const opts = [
    { key: '1-5', min: 1, max: 5 },
    { key: '0-10', min: 0, max: 10 },
  ] as const;
  const picked = opts.find((o) => s.scale.min === o.min && s.scale.max === o.max);
  const pickedLabel = picked ? M.scaleOptions[picked.key] : '';
  const zeros = doubt.zeros;
  return (
    <section class={`card scale-card${confirmed ? ' is-done' : ''}`} aria-label={M.scaleTitle} data-testid="scale-card">
      <div class="pc-head">
        <span class={`pc-ic ${confirmed ? 'ok' : 'warn'}`}>
          <Icon name={confirmed ? 'check' : 'warn'} />
        </span>
        <h3>{M.scaleTitle}</h3>
        {confirmed && <span class="tag ok">{M.scaleConfirmedTag}</span>}
      </div>
      <div class="sc-grid">
        <div class="sc-left">
          <p>{M.scaleLead(doubt.cols, doubt.total, M.scaleOptions['1-5'], M.scaleOdd(zeros, 0))}</p>
          <div class="sc-hist">
            <strong class="small">{M.scaleHist}</strong>
            {doubt.hist.map((h) => (
              <div key={h.score} class="brow">
                <div class="h">
                  <span class="nm">
                    {M.scaleScore(h.score)}
                    {h.score === 0 && <span class="tag warn">{M.scaleSuspect}</span>}
                  </span>
                  <span class="v">{M.scaleCount(h.n, h.pct)}</span>
                </div>
                <div class="track">
                  <i class={h.score === 0 ? 'tie' : ''} style={{ width: `${Math.max(h.pct, 1)}%` }} />
                </div>
              </div>
            ))}
            {doubt.where.slice(0, 5).map((w) => (
              <p key={w.col} class="hint">
                {M.scaleWhere(w.col, w.n, 0)}
              </p>
            ))}
          </div>
        </div>
        <div class="sc-right">
          <strong class="small" id="scale-ask">
            {M.scaleAsk}
          </strong>
          <div class="rcards" role="radiogroup" aria-labelledby="scale-ask">
            {opts.map((o) => {
              const on = confirmed && picked?.key === o.key;
              const suggest = doubt.suggested.min === o.min && doubt.suggested.max === o.max;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  class={`rcard${on ? ' on' : ''}`}
                  data-testid={`scale-${o.key}`}
                  onClick={() => setSession({ scale: { min: o.min, max: o.max }, scaleConfirmed: true })}
                >
                  <span class="radio" aria-hidden="true" />
                  <span class="rc-main">
                    <strong>
                      {M.scaleOptions[o.key]}
                      {suggest && <span class="tag accent">{M.scaleSuggest}</span>}
                    </strong>
                    <span class="rc-sub">{o.key === '1-5' ? M.scaleOutOfRange(zeros, 0) : M.scaleLegal(zeros, 0)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p class="hint">{M.scaleNote}</p>
        </div>
      </div>
      {confirmed && <Notice kind="ok">{(picked?.key === '0-10' ? M.scaleDoneLegal : M.scaleDone)(pickedLabel, zeros, 0)}</Notice>}
    </section>
  );
}
