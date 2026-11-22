import { useState } from 'preact/hooks';
import { VOTE_GUARD_KINDS, type VoteResult } from '../../app/analysis';
import { setStats, useApp } from '../../app/store';
import { cellText, countVoteIssues, type VoteIssueKind } from '../../core';
import { Notice } from '../parts/parts';
import { vt } from '../strings-vote';

/** 票選防弊四項成組畫面（D47／D48）：件數、狀態、逐人名單、隱藏「投給誰」，全部決定後才看正式結果。 */
export function VoteGuard({ v }: { v: VoteResult }) {
  const st = useApp();
  const G = vt().guard;
  const [open, setOpen] = useState<VoteIssueKind | null>(null);
  const [hide, setHide] = useState(false);
  const counts = countVoteIssues(v.issues);
  const done = st.stats.guardDone;
  const label = new Map(v.positions.map((p) => [String(p.col.index), p.col.label]));
  const decision = new Map(v.inclusion.decisions.map((d) => [d.ballotId, d]));
  const ballot = new Map(v.ballots.map((b) => [b.id, b]));
  const pending = VOTE_GUARD_KINDS.filter((k) => counts[k] > 0 && !done.includes(k)).length;

  const toggle = (id: string | number, include: boolean) =>
    setStats({ ballotOverrides: { ...st.stats.ballotOverrides, [Number(id)]: include } });
  const mark = (k: VoteIssueKind, on: boolean) => {
    setStats({ guardDone: on ? [...new Set([...done, k])] : done.filter((x) => x !== k) });
    if (!on) return;
    // 決定後自動收合清單；全部決定完就捲到結果，不讓結果被長清單推到螢幕外（#213）
    setOpen(null);
    if (pending <= 1 && !done.includes(k)) {
      setTimeout(() => document.querySelector('[data-testid="vote-result"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    }
  };
  const ruleText = (k: VoteIssueKind): string => {
    const r = st.stats.voteRules;
    return k === 'multi' ? G.rule.multi[r.multi] : k === 'self' ? G.rule.self[r.self] : k === 'time' ? G.rule.time[r.time] : G.rule.blank;
  };

  return (
    <section class="card guard-card" data-testid="vote-guard">
      <h3>{G.title}</h3>
      <p class="hint">{G.lead}</p>
      <label class="guard-toggle">
        <input type="checkbox" checked={hide} onChange={(e) => setHide((e.target as HTMLInputElement).checked)} />
        {G.hidePicks}
      </label>
      <ul class="guard-rows">
        {VOTE_GUARD_KINDS.map((k) => {
          const n = counts[k];
          const isDone = n > 0 && done.includes(k);
          const expanded = open === k && n > 0;
          const ids = [...new Set(v.issues.filter((i) => i.kind === k).flatMap((i) => i.ballotIds))];
          return (
            <li key={k} class={`guard-row${n > 0 && !isDone ? ' attn' : ''}`} data-testid={`guard-${k}`}>
              <button type="button" class="rowbtn" aria-expanded={expanded} disabled={n === 0} onClick={() => setOpen(expanded ? null : k)}>
                <span class="rb-main">
                  <strong>
                    {G.kinds[k][0]}
                    {n > 0 && `・${G.count(n, k)}`}
                  </strong>
                  <span class="rb-note">{n === 0 ? G.kinds[k][1] : `${G.kinds[k][1]}。${ruleText(k)}`}</span>
                </span>
                {n === 0 ? <span class="tag ok">{G.clean}</span> : isDone ? <span class="tag ok">{G.done}</span> : <span class="tag warn">{G.pending}</span>}
              </button>
              {expanded && (
                <div class="guard-detail">
                  <p class="hint">{G.see}</p>
                  {ids.map((id) => {
                    const b = ballot.get(id);
                    const d = decision.get(id);
                    if (!b || !d) return null;
                    const picks = Object.entries(b.picks)
                      .filter(([, who]) => who !== null)
                      .map(([c, who]) => `${label.get(c) ?? c}：${who}`)
                      .join('、');
                    return (
                      <div key={String(id)} class="guard-ballot">
                        <span class="who">
                          <strong>{String(b.voter.name ?? '').trim() || G.anon}</strong>
                          <span class="hint">
                            {' '}
                            {cellText(b.timestamp) || G.noTime}
                            {' ・ '}
                            {hide ? G.hidden : picks || '—'}
                          </span>
                          {!d.included && <span class="tag warn">{G.excluded}</span>}
                        </span>
                        <label>
                          <input type="checkbox" checked={d.included} onChange={(e) => toggle(id, (e.target as HTMLInputElement).checked)} />
                          {G.include}
                        </label>
                      </div>
                    );
                  })}
                  <div class="btn-row">
                    {isDone ? (
                      <button class="btn secondary small" type="button" onClick={() => mark(k, false)}>
                        {G.redo}
                      </button>
                    ) : (
                      <button class="btn primary small" type="button" onClick={() => mark(k, true)}>
                        {G.confirm}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {v.inclusion.manualCount > 0 && <p class="hint">{G.manualHint(v.inclusion.manualCount)}</p>}
      {pending > 0 && (
        <Notice kind="warn" title={G.gateTitle(pending)}>
          {G.gateBody}
        </Notice>
      )}
    </section>
  );
}
