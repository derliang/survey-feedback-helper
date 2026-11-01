import { useEffect, useMemo } from 'preact/hooks';
import { type FeedbackSummary, type TargetResult, cellText, selfVsOthers } from '../../core';
import {
  type Question,
  type VoteResult,
  newSeed,
  opinionQuestions,
  runFeedback,
  runVote,
} from '../../app/analysis';
import { canGoStats } from '../../app/progress';
import { feedbackKey, openKey } from '../../app/output';
import { reviewCounts, setTeacher } from '../../app/review';
import { go, loadReview, set, setStats, updateReview, useApp } from '../../app/store';
import { barsSvg, columnsSvg, pairedBarsSvg } from '../chart-svg';
import { strings as S } from '../strings';
import { ActBar, Notice, useWide } from '../parts/parts';
import { CommentList, Keywords, SaveNote } from './ReviewParts';

const f1 = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : n.toFixed(1));
const pct = (x: number): string => `${Math.round(x * 100)}%`;

function Chart({ svg }: { svg: string }) {
  return <div class="chart" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div class="tile">
      <span class="tile-l">{label}</span>
      <span class="tile-n">{value}</span>
      {note && <span class="hint">{note}</span>}
    </div>
  );
}

function WorkList({ title, entries, sel }: { title: string; entries: { key: string; name: string; note?: string }[]; sel: string }) {
  return (
    <nav class="wb-list" aria-label={title}>
      <h2>{title}</h2>
      <ul class="plain-ul">
        {entries.map((e) => (
          <li key={e.key}>
            <button type="button" class={`rowbtn${sel === e.key ? ' on' : ''}`} aria-current={sel === e.key ? 'true' : undefined} onClick={() => set({ statSel: e.key })}>
              <span class="rb-main">
                <strong>{e.name}</strong>
                {e.note && <span class="rb-note">{e.note}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const personName = (t: TargetResult): string => cellText(t.person.name) || t.key;
const seatOf = (t: TargetResult): string => cellText(t.person.seat);

/* ───────── 報告回饋 ───────── */

function FeedbackMain({ summary, sel, wide }: { summary: FeedbackSummary; sel: string; wide: boolean }) {
  const st = useApp();
  const w = wide ? 560 : 340;
  const t = summary.targets.find((x) => x.key === sel);
  if (!t) {
    // 全班總覽
    const rows = [...summary.targets].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    return (
      <>
        <div class="tiles">
          <Tile label={S.stats.classMean} value={f1(summary.classMean.value)} note={summary.classMean.label} />
          <Tile label="被評對象" value={S.stats.people(summary.targets.length)} />
        </div>
        {summary.problems.length > 0 && <Notice kind="warn">{S.stats.problems(summary.problems.length)}</Notice>}
        {summary.rankMayChange && <Notice kind="info">{S.stats.rankMayChange}</Notice>}
        <Chart
          svg={barsSvg(
            rows.map((r) => ({ label: personName(r), value: r.total ?? 0, note: f1(r.total) })),
            { title: S.stats.total, max: st.session?.scale.max ?? 10, w },
          )}
        />
        <div class="table-wrap">
          <table class="roster-table">
            <thead>
              <tr>
                <th>名次</th>
                <th>座號</th>
                <th>姓名</th>
                {summary.items.map((i) => (
                  <th key={i.id}>{i.label}</th>
                ))}
                <th>{S.stats.total}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.rank ?? '—'}</td>
                  <td>{seatOf(r)}</td>
                  <td>{personName(r)}</td>
                  {r.averageRow.map((m, i) => (
                    <td key={i}>{f1(m)}</td>
                  ))}
                  <td>
                    <strong>{f1(r.total)}</strong>
                  </td>
                </tr>
              ))}
              <tr class="flag">
                <td colSpan={3}>{S.stats.classMean}</td>
                {summary.classItemMeans.map((m, i) => (
                  <td key={i}>{f1(m)}</td>
                ))}
                <td>
                  <strong>{f1(summary.classMean.value)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }
  const gap = selfVsOthers(summary).find((g) => g.key === t.key);
  const review = st.review;
  const items = t.comments.map((c) => ({ key: feedbackKey(c.recordId), text: c.text }));
  return (
    <>
      <div class="tiles">
        <Tile label={S.stats.total} value={f1(t.total)} />
        <Tile label={S.stats.classMean} value={f1(summary.classMean.value)} note={S.stats.classMeanNote(summary.classMean.included)} />
        <Tile label="名次" value={S.stats.rank(t.rank)} />
        <Tile label="評分" value={S.stats.raters(t.raters)} />
      </div>
      <section class="card">
        <h3>{S.stats.itemsTitle}</h3>
        <Chart
          svg={pairedBarsSvg(
            summary.items.map((it, i) => ({ label: it.label, a: t.averageRow[i] ?? null, b: summary.classItemMeans[i] ?? null })),
            { title: S.stats.itemsTitle, max: st.session?.scale.max ?? 10, aName: S.stats.mine, bName: S.stats.classAvg, w },
          )}
        />
      </section>
      <section class="card">
        <h3>{S.stats.selfTitle}</h3>
        {!gap?.hasSelf ? (
          <p class="hint">{S.stats.selfNone}</p>
        ) : (
          <div class="table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  <th>題目</th>
                  <th>自評</th>
                  <th>他評</th>
                  <th>落差</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {gap.items.map((g, i) => (
                  <tr key={g.itemId}>
                    <td>{summary.items[i]?.label}</td>
                    <td>{f1(g.self)}</td>
                    <td>{f1(g.others)}</td>
                    <td>{g.gap === null ? '—' : (g.gap > 0 ? '+' : '') + g.gap.toFixed(1)}</td>
                    <td>{g.kind === 'over' ? S.stats.selfOver : g.kind === 'under' ? S.stats.selfUnder : g.kind === 'aligned' ? S.stats.selfAligned : S.stats.selfUnknown}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p class="hint">{S.stats.gapNote}</p>
      </section>
      <section class="card">
        <h3>
          {S.review.title}・{S.review.count(items.length)}
        </h3>
        <CommentList items={items} />
      </section>
      <section class="card">
        <h3>{S.review.teacherTitle}</h3>
        <p class="hint">{S.review.teacherHelp}</p>
        <textarea
          class="input area"
          rows={4}
          aria-label={S.review.teacherTitle}
          value={review?.teacher[t.key] ?? ''}
          onInput={(e) => updateReview((r) => setTeacher(r, t.key, (e.target as HTMLTextAreaElement).value))}
        />
      </section>
    </>
  );
}

/* ───────── 意見調查 ───────── */

function QuestionMain({ q, wide }: { q: Question; wide: boolean }) {
  const st = useApp();
  const w = wide ? 560 : 340;
  const scale = st.session!.scale;
  if (q.kind === 'score') {
    const x = q.stat;
    return (
      <>
        <div class="tiles">
          <Tile label={S.stats.mean} value={f1(x.mean)} />
          <Tile label={S.stats.median} value={f1(x.median)} />
          <Tile label={S.stats.sd} value={f1(x.sd)} />
          <Tile label="有效" value={S.stats.people(x.n)} note={S.stats.blank(x.blank)} />
        </div>
        {x.invalid > 0 && <Notice kind="warn">{S.stats.invalid(x.invalid)}</Notice>}
        <Chart svg={columnsSvg(x.distribution, x.distribution.map((_, i) => String(scale.min + i)), { title: q.col.label, w, h: 220 })} />
      </>
    );
  }
  if (q.kind === 'choice') {
    const x = q.stat;
    return (
      <>
        <div class="tiles">
          <Tile label="作答" value={S.stats.people(x.answered)} note={S.stats.blank(x.blank)} />
        </div>
        <label class="check">
          <input type="checkbox" checked={q.multi} onChange={(e) => setStats({ multi: { ...st.stats.multi, [q.col.index]: (e.target as HTMLInputElement).checked } })} />
          {S.stats.multi}
          <span class="hint">{S.stats.multiHelp}</span>
        </label>
        <Chart svg={barsSvg(x.counts.map((c) => ({ label: c.option, value: c.count, note: `${c.count}（${pct(c.share)}）` })), { title: q.col.label, max: Math.max(1, x.answered), w })} />
        {x.others.length > 0 && (
          <section class="card">
            <h3>{S.stats.others}</h3>
            <ul class="plain-list">
              {x.others.map((o) => (
                <li key={o.text}>
                  {o.text}（{o.count}）
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }
  const items = q.stat.answers.map((a) => ({ key: openKey(q.col.index, a.row), text: a.text }));
  return (
    <section class="card">
      <h3>{S.stats.openCount(items.length)}</h3>
      <CommentList items={items} />
    </section>
  );
}

/* ───────── 票選幹部 ───────── */

function VoteMain({ v, sel, wide }: { v: VoteResult; sel: string; wide: boolean }) {
  const st = useApp();
  const w = wide ? 560 : 340;
  const p = v.positions.find((x) => String(x.col.index) === sel) ?? v.positions[0];
  if (!p) return <p class="hint">{S.stats.noData}</p>;
  const counts = { multi: 0, self: 0, time: 0, blank: 0 };
  for (const i of v.issues) counts[i.kind] += i.kind === 'multi' ? 1 : i.ballotIds.length;
  const any = counts.multi + counts.self + counts.time + counts.blank > 0;
  const elected = new Set(p.election.elected);
  return (
    <>
      <section class="card">
        <h3>{S.stats.issuesTitle}</h3>
        {any ? (
          <ul class="plain-list">
            {counts.multi > 0 && <li>{S.stats.issueMulti(counts.multi)}</li>}
            {counts.self > 0 && <li>{S.stats.issueSelf(counts.self)}</li>}
            {counts.time > 0 && <li>{S.stats.issueTime(counts.time)}</li>}
            {counts.blank > 0 && <li>{S.stats.issueBlank(counts.blank)}</li>}
          </ul>
        ) : (
          <p class="hint">{S.stats.noIssue}</p>
        )}
      </section>
      <div class="tiles">
        <Tile label="計入票數" value={String(p.tally.validBallots)} />
        <Tile label={S.stats.elected} value={p.election.elected.join('、') || '—'} />
      </div>
      <label class="field">
        <span class="label">{S.stats.seats}</span>
        <input class="input" type="number" min={1} max={20} value={p.seats} onInput={(e) => setStats({ seats: { ...st.stats.seats, [p.col.index]: Number((e.target as HTMLInputElement).value) || 1 } })} />
      </label>
      <Chart
        svg={barsSvg(
          p.tally.rows.map((r) => ({ label: r.name, value: r.votes, note: S.stats.votes(r.votes), strong: elected.has(r.name) })),
          { title: p.col.label, w, emphasis: true },
        )}
      />
      {p.election.tied.length > 0 && p.election.draw && (
        <Notice
          kind="info"
          title={S.stats.tied}
          actions={
            <button class="btn secondary small" type="button" onClick={() => setStats({ seed: newSeed() })}>
              {S.stats.reseed}
            </button>
          }
        >
          {S.stats.drawn(p.election.draw.seed)}：{p.election.tied.join('、')}
        </Notice>
      )}
      {p.tally.invalid > 0 && <p class="hint">{S.stats.invalidVotes(p.tally.invalid)}</p>}
      {p.tally.abstain > 0 && <p class="hint">{S.stats.abstain(p.tally.abstain)}</p>}
    </>
  );
}

function VoteRulesCard() {
  const st = useApp();
  const r = st.stats.voteRules;
  const set1 = <K extends keyof typeof r>(k: K, v: (typeof r)[K]) => setStats({ voteRules: { ...r, [k]: v } });
  const sel = <K extends keyof typeof r>(label: string, k: K, opts: Record<string, string>) => (
    <label class="field">
      <span class="label">{label}</span>
      <select class="input" value={r[k] as string} onChange={(e) => set1(k, (e.target as HTMLSelectElement).value as (typeof r)[K])}>
        {Object.entries(opts).map(([v, n]) => (
          <option key={v} value={v}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section class="card">
      <h3>{S.stats.rules}</h3>
      {sel(S.stats.ruleMulti, 'multi', S.stats.ruleMultiOpts)}
      {sel(S.stats.ruleSelf, 'self', S.stats.ruleSelfOpts)}
      {sel(S.stats.ruleTime, 'time', S.stats.ruleTimeOpts)}
    </section>
  );
}

function FeedbackSettings({ summary }: { summary: FeedbackSummary }) {
  const st = useApp();
  const o = st.stats;
  return (
    <section class="card">
      <h3>{S.stats.settingsTitle}</h3>
      <div class="field">
        <span class="label">{S.stats.trim}</span>
        <div class="seg" role="radiogroup" aria-label={S.stats.trim}>
          {[0, 1].map((k) => (
            <button key={k} type="button" role="radio" aria-checked={o.trim === k} class={o.trim === k ? 'on' : ''} onClick={() => setStats({ trim: k })}>
              {k === 0 ? S.stats.trimOff : S.stats.trimOne}
            </button>
          ))}
        </div>
        <p class="hint">{S.stats.trimHelp}</p>
      </div>
      <div class="field">
        <span class="label">{S.stats.reversedTitle}</span>
        {summary.items.map((it) => {
          const idx = Number(it.id);
          return (
            <label key={it.id} class="check">
              <input type="checkbox" checked={o.reversed.includes(idx)} onChange={(e) => setStats({ reversed: (e.target as HTMLInputElement).checked ? [...o.reversed, idx] : o.reversed.filter((x) => x !== idx) })} />
              {it.label}
            </label>
          );
        })}
        <p class="hint">{S.stats.reversedHelp}</p>
      </div>
    </section>
  );
}

/* ───────── 畫面 ───────── */

export function StatsView() {
  const st = useApp();
  const wide = useWide();
  const s = st.session;
  const ok = s !== null && canGoStats(s);
  useEffect(() => {
    if (ok) void loadReview();
  }, [ok, s?.surveyId]);

  const fb = useMemo(() => (ok && s.kind === 'feedback' ? runFeedback(s, st.stats) : null), [ok, s, st.stats]);
  const qs = useMemo(() => (ok && s.kind === 'opinion' ? opinionQuestions(s, st.stats) : null), [ok, s, st.stats]);
  const vote = useMemo(() => (ok && s.kind === 'vote' ? runVote(s, st.stats) : null), [ok, s, st.stats]);

  if (!ok) {
    return (
      <main class="page" id="main">
        <h1>{S.stats.title}</h1>
        <Notice kind="warn">{S.stats.locked}</Notice>
        <ActBar>
          <button class="btn secondary grow" type="button" onClick={() => go(s ? 'prepare' : 'home')}>
            {S.stats.goPrep}
          </button>
        </ActBar>
      </main>
    );
  }

  let entries: { key: string; name: string; note?: string }[] = [];
  let sel = st.statSel ?? '';
  let listTitle: string = S.stats.listTitle.opinion;
  let commentItems: { key: string; text: string }[] = [];
  if (fb) {
    listTitle = S.stats.listTitle.feedback;
    const sorted = [...fb.targets].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    entries = [{ key: '', name: '全班總覽', note: S.stats.people(fb.targets.length) }, ...sorted.map((t) => ({ key: t.key, name: `${seatOf(t)} ${personName(t)}`.trim(), note: `${f1(t.total)}・${S.stats.rank(t.rank)}` }))];
    if (!entries.some((e) => e.key === sel)) sel = '';
    commentItems = fb.targets.flatMap((t) => t.comments.map((c) => ({ key: feedbackKey(c.recordId), text: c.text })));
  } else if (qs) {
    listTitle = S.stats.listTitle.opinion;
    entries = qs.map((q) => ({ key: String(q.col.index), name: q.col.label }));
    if (!entries.some((e) => e.key === sel)) sel = entries[0]?.key ?? '';
    commentItems = qs.flatMap((q) => (q.kind === 'comment' ? q.stat.answers.map((a) => ({ key: openKey(q.col.index, a.row), text: a.text })) : []));
  } else if (vote) {
    listTitle = S.stats.listTitle.vote;
    entries = vote.positions.map((p) => ({ key: String(p.col.index), name: p.col.label, note: p.election.elected.join('、') }));
    if (!entries.some((e) => e.key === sel)) sel = entries[0]?.key ?? '';
  }
  const counts = st.review ? reviewCounts(st.review, commentItems) : null;
  const selQ = qs?.find((q) => String(q.col.index) === sel);

  return (
    <main class="page stats" id="main">
      <header class="prep-head">
        <h1>{S.stats.title}</h1>
        <p class="meta">
          {s.name}・{S.stats.rows(s.table.rows.length - s.excluded.length)}
          {s.excluded.length > 0 && <span class="tag">{S.stats.excluded(s.excluded.length)}</span>}{' '}
          <button class="linkbtn" type="button" onClick={() => go('method')}>
            {S.stats.methodLink}
          </button>
        </p>
      </header>
      {counts && counts.pending > 0 && (
        <Notice kind={counts.flaggedPending > 0 ? 'warn' : 'info'} title={S.review.pending(counts.pending)}>
          {S.review.lead}
          {counts.flaggedPending > 0 && ` ${S.review.flagged(counts.flaggedPending)}`}
        </Notice>
      )}
      <div class="wb">
        <WorkList title={listTitle} entries={entries} sel={sel} />
        <section class="wb-main" aria-live="polite">
          {fb && <FeedbackMain summary={fb} sel={sel} wide={wide} />}
          {qs && selQ && <QuestionMain q={selQ} wide={wide} />}
          {qs && !selQ && <p class="hint">{S.stats.noData}</p>}
          {vote && <VoteMain v={vote} sel={sel} wide={wide} />}
        </section>
        <aside class="wb-side">
          {fb && <FeedbackSettings summary={fb} />}
          {vote && <VoteRulesCard />}
          {(fb || qs) && <Keywords />}
          <SaveNote />
        </aside>
      </div>
      <ActBar>
        <button class="btn secondary" type="button" onClick={() => go('prepare')}>
          {S.back}
        </button>
        <button class="btn primary grow" type="button" onClick={() => go('output')}>
          {S.stats.toOutput}
        </button>
      </ActBar>
    </main>
  );
}
