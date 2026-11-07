import { useState } from 'preact/hooks';
import { type CheckKey, canGoStats, checkCounts, checkReport } from '../../app/progress';
import { go, setSession, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { ActBar, Notice } from '../parts/parts';
import { extra } from '../strings-extra';

const KEYS: CheckKey[] = ['duplicates', 'timestamps', 'scores', 'blanks', 'titles'];

export function CheckView() {
  const s = useApp().session;
  const [open, setOpen] = useState<CheckKey | null>(null);
  if (!s) return null;
  const report = checkReport(s);
  const counts = checkCounts(report);
  const pending = KEYS.filter((k) => counts[k] > 0 && !s.checkHandled.includes(k)).length;
  const handled = KEYS.filter((k) => counts[k] > 0 && s.checkHandled.includes(k)).length;

  const mark = (k: CheckKey) => setSession((cur) => ({ checkHandled: cur.checkHandled.includes(k) ? cur.checkHandled : [...cur.checkHandled, k] }));
  const exclude = (ids: number[]) => setSession((cur) => ({ excluded: [...new Set([...cur.excluded, ...ids])] }));
  const rowNo = (id: number) => id + 2;

  const detail = (k: CheckKey) => {
    if (k === 'duplicates') {
      return (
        <>
          <p class="hint">{S.check.leadDup}</p>
          <ul class="issue-list">
            {report.duplicates.map((g) => {
              const who = g.key.split('|').slice(1).join('|') || g.key;
              const sorted = [...g.ids].sort((a, b) => a - b);
              return (
                <li key={g.key} class="issue">
                  <strong>{S.check.dupDetail(who, g.ids.length)}</strong>
                  <span class="hint">{extra().check.rows(sorted.map(rowNo).join(extra().check.sep))}</span>
                  {g.seatConflict && <Notice kind="warn">{S.check.dupSeatNote}</Notice>}
                  <div class="btn-row">
                    <button class={`btn ${g.seatConflict ? 'secondary' : 'primary'} small`} type="button" onClick={() => exclude(sorted.slice(0, -1))}>
                      {S.check.keepLast}
                    </button>
                    <button class="btn secondary small" type="button" onClick={() => exclude(sorted.slice(1))}>
                      {S.check.keepFirst}
                    </button>
                    <button class="btn secondary small" type="button" onClick={() => exclude(sorted)}>
                      {S.check.excludeBoth}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      );
    }
    if (k === 'titles') {
      return (
        <ul class="issue-list">
          {report.titleClusters.map((cl) => (
            <li key={cl.canonical} class="issue">
              <strong>{cl.variants.map((v) => `「${v.text}」×${v.count}`).join('、')}</strong>
              <div class="btn-row">
                <button
                  class="btn primary small"
                  type="button"
                  onClick={() => setSession((cur) => ({ titleMerges: { ...cur.titleMerges, ...Object.fromEntries(cl.variants.map((v) => [v.text, cl.canonical])) } }))}
                >
                  {S.check.merge}「{cl.canonical}」
                </button>
              </div>
            </li>
          ))}
        </ul>
      );
    }
    const lines =
      k === 'scores'
        ? report.invalidScores.map((i) => S.check.scoreLine(rowNo(i.id), i.value, i.kind))
        : k === 'blanks'
          ? report.blanks.map((b) => S.check.blankFields(rowNo(b.id), b.fields.length))
          : report.badTimestamps.map((id) => S.check.rowLine(rowNo(id)));
    return (
      <>
        <ul class="plain-list">
          {lines.slice(0, 50).map((l) => (
            <li key={l}>{l}</li>
          ))}
          {lines.length > 50 && <li>{extra().check.more(lines.length - 50)}</li>}
        </ul>
        <button class="btn secondary small" type="button" onClick={() => mark(k)}>
          {S.check.markHandled}
        </button>
      </>
    );
  };

  return (
    <div class="view">
      <h2>{S.check.title}</h2>
      <div class="tiles">
        <div class={`tile${pending > 0 ? ' warn' : ''}`}>
          <span class="tile-l">{S.check.pending}</span>
          <span class="tile-n" data-testid="check-pending">
            {pending}
          </span>
        </div>
        <div class="tile">
          <span class="tile-l">{S.check.handled}</span>
          <span class="tile-n">{handled}</span>
        </div>
      </div>
      {s.excluded.length > 0 && <Notice kind="info">{S.check.excludedN(s.excluded.length)}</Notice>}
      <ul class="check-list">
        {KEYS.map((k) => {
          const n = counts[k];
          const isHandled = n > 0 && s.checkHandled.includes(k);
          const expanded = open === k && n > 0;
          return (
            <li key={k} class={`check-row${n > 0 && !isHandled ? ' attn' : ''}`}>
              <button type="button" class="rowbtn" aria-expanded={expanded} disabled={n === 0} onClick={() => setOpen(expanded ? null : k)}>
                <span class="rb-main">
                  <strong>{S.check.rows[k][0]}</strong>
                  <span class="rb-note">{n === 0 ? S.check.noneFound : S.check.rows[k][1]}</span>
                </span>
                {n === 0 ? <span class="tag ok">{S.check.clean}</span> : isHandled ? <span class="tag ok">{S.check.handled}</span> : <span class="tag warn">{n}</span>}
              </button>
              {expanded && <div class="check-detail">{detail(k)}</div>}
            </li>
          );
        })}
      </ul>
      <ActBar>
        <button class="btn secondary" type="button" onClick={() => go('prepare')}>
          {S.check.back}
        </button>
        <button class="btn primary grow" type="button" disabled={!canGoStats(s)} onClick={() => go('stats')}>
          {S.prep.toStats}
        </button>
      </ActBar>
    </div>
  );
}
