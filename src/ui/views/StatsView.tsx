import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
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
import { detectScale, scaleSuspect, scoreSignature, suspectScoreColumns, withRole } from '../../app/columns';
import { feedbackKey, openKey } from '../../app/output';
import { reviewCounts, setTeacher } from '../../app/review';
import { blankColumns } from '../../app/analysis';
import { downloadReview, go, loadReview, set, setSession, setStats, updateReview, useApp } from '../../app/store';
import { isTouchDevice } from '../../storage';
import { barsSvg, columnsSvg, pairedBarsSvg, svgSize, svgTitle, toPrintSvg } from '../chart-svg';
import { svgToJpg } from '../chart-png';
import { downloadBytes } from '../../storage';
import { TrendCard } from './TrendCard';
import { strings as S } from '../strings';
import { ActBar, Icon, Notice, OptionGroup, useWide } from '../parts/parts';
import { CommentList, Keywords } from './ReviewParts';
import { TeacherComment } from './Phrases';
import { extra } from '../strings-extra';

const ui = () => extra().statsUi;

const f1 = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : n.toFixed(1));
const pct = (x: number): string => `${Math.round(x * 100)}%`;

function Chart({ svg }: { svg: string }) {
  const [failed, setFailed] = useState(false);
  const save = async () => {
    try {
      const print = toPrintSvg(svg);
      const { w, h } = svgSize(svg);
      const bytes = await svgToJpg(print, w, h);
      downloadBytes(`${svgTitle(svg)}.jpg`, bytes, 'image/jpeg');
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };
  return (
    <figure class="chart-fig">
      <div class="chart" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption class="chart-tools">
        <button class="btn ghost small" type="button" onClick={() => void save()}>
          {S.stats.saveImage}
        </button>
        {failed && <span class="hint" role="alert">{S.stats.saveImageFailed}</span>}
      </figcaption>
    </figure>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div class="tile">
      <span class="tile-l">{label}</span>
      <span class={`tile-n${[...value].length > 4 ? ' long' : ''}`}>{value}</span>
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
          <Tile label={S.stats.classMean} value={f1(summary.classMean.value)} note={S.stats.classMeanNote(summary.classMean.included, summary.classMean.total)} />
          <Tile label={extra().stats.targets} value={S.stats.people(summary.targets.length)} />
        </div>
        {summary.problems.length > 0 && <Notice kind="warn">{S.stats.problems(summary.problems.length)}</Notice>}
        <ScoreHints />
        {summary.rankMayChange && <Notice kind="info">{S.stats.rankMayChange}</Notice>}
        <Chart
          svg={barsSvg(
            rows.map((r) => ({ label: personName(r), value: r.total ?? 0, note: f1(r.total) })),
            { title: S.stats.total, max: st.session?.scale.max ?? 10, w },
          )}
        />
        <div class="table-wrap">
          <table class="roster-table stats-table">
            <thead>
              <tr>
                <th>{extra().stats.rank}</th>
                {wide ? (
                  <>
                    <th>{extra().stats.seat}</th>
                    <th>{extra().stats.name}</th>
                  </>
                ) : (
                  <th>{ui().student}</th>
                )}
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
                  {wide ? (
                    <>
                      <td>{seatOf(r)}</td>
                      <td>{personName(r)}</td>
                    </>
                  ) : (
                    <td>{`${seatOf(r)} ${personName(r)}`.trim()}</td>
                  )}
                  {r.averageRow.map((m, i) => (
                    <td key={i}>{f1(m)}</td>
                  ))}
                  <td>
                    <strong>{f1(r.total)}</strong>
                  </td>
                </tr>
              ))}
              <tr class="flag">
                <td colSpan={wide ? 3 : 2}>{S.stats.classMean}</td>
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
  return (
    <>
      <div class="tiles">
        <Tile label={S.stats.total} value={f1(t.total)} />
        <Tile label={S.stats.classMean} value={f1(summary.classMean.value)} note={S.stats.classMeanNote(summary.classMean.included)} />
        <Tile label={extra().stats.rank} value={S.stats.rank(t.rank)} />
        <Tile label={extra().stats.rating} value={S.stats.raters(t.raters)} />
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
                  <th>{extra().stats.question}</th>
                  <th>{extra().stats.self}</th>
                  <th>{extra().stats.others}</th>
                  <th>{extra().stats.gap}</th>
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
    </>
  );
}

/* ───────── 意見調查 ───────── */

function QuestionMain({ q, wide, reviewTotal }: { q: Question; wide: boolean; reviewTotal: { total: number; pending: number } }) {
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
          <Tile label={extra().stats.valid} value={S.stats.people(x.n)} note={S.stats.blank(x.blank)} />
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
          <Tile label={extra().stats.answered} value={S.stats.people(x.answered)} note={S.stats.blank(x.blank)} />
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
  return <ReviewCard items={items} total={reviewTotal.total} pending={reviewTotal.pending} />;
}

/* ───────── 票選幹部 ───────── */

/** 只放「另存圖片」：票選結果畫面用 HTML 長條列，圖片版仍由 SVG 產生。 */
function ImageSave({ svg }: { svg: string }) {
  const [failed, setFailed] = useState(false);
  const save = async () => {
    try {
      const { w, h } = svgSize(svg);
      downloadBytes(`${svgTitle(svg)}.jpg`, await svgToJpg(toPrintSvg(svg), w, h), 'image/jpeg');
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };
  return (
    <div class="chart-tools">
      <button class="btn ghost small" type="button" onClick={() => void save()}>
        {S.stats.saveImage}
      </button>
      {failed && <span class="hint" role="alert">{S.stats.saveImageFailed}</span>}
    </div>
  );
}

/** 當選名額小步進器：−、數字、＋（取代拉滿寬的輸入框）。 */
function SeatStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.min(20, Math.max(1, n));
  return (
    <div class="stepper-num" role="group" aria-label={S.stats.seats}>
      <span class="stepper-l">{S.stats.seats}</span>
      <button class="icbtn" type="button" aria-label={ui().seatsDec} disabled={value <= 1} onClick={() => onChange(clamp(value - 1))}>
        <span aria-hidden="true">−</span>
      </button>
      <output class="stepper-v" data-testid="seats-value" aria-live="polite">
        {value}
      </output>
      <button class="icbtn" type="button" aria-label={ui().seatsInc} disabled={value >= 20} onClick={() => onChange(clamp(value + 1))}>
        <span aria-hidden="true">＋</span>
      </button>
    </div>
  );
}

function VoteMain({ v, sel }: { v: VoteResult; sel: string; wide: boolean }) {
  const st = useApp();
  const p = v.positions.find((x) => String(x.col.index) === sel) ?? v.positions[0];
  if (!p) return <p class="hint">{S.stats.noData}</p>;
  const counts = { multi: 0, self: 0, time: 0, blank: 0 };
  for (const i of v.issues) counts[i.kind] += i.kind === 'multi' ? 1 : i.ballotIds.length;
  const any = counts.multi + counts.self + counts.time + counts.blank > 0;
  const elected = new Set(p.election.elected);
  const tied = new Set(p.election.tied);
  const tiedVotes = p.tally.rows.find((r) => tied.has(r.name))?.votes ?? 0;
  // 當選者固定在前（同票時當選者排在落選者前面），避免第一列是落選者
  const rows = [...p.tally.rows].sort((a, b) => Number(elected.has(b.name)) - Number(elected.has(a.name)) || b.votes - a.votes);
  const total = rows.reduce((n, r) => n + r.votes, 0);
  const maxVotes = Math.max(1, ...rows.map((r) => r.votes));
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const electedText = p.election.elected.join('、') || '—';
  const imgSvg = barsSvg(
    rows.map((r) => ({ label: r.name, value: r.votes, note: S.stats.votes(r.votes), strong: elected.has(r.name) })),
    { title: p.col.label, w: 560, emphasis: true },
  );
  return (
    <>
      {any && (
        <section class="card issue-card" data-testid="vote-issues">
          <h3>{S.stats.issuesTitle}</h3>
          <ul class="plain-list">
            {counts.multi > 0 && <li>{S.stats.issueMulti(counts.multi)}</li>}
            {counts.self > 0 && <li>{S.stats.issueSelf(counts.self)}</li>}
            {counts.time > 0 && <li>{S.stats.issueTime(counts.time)}</li>}
            {counts.blank > 0 && <li>{S.stats.issueBlank(counts.blank)}</li>}
          </ul>
        </section>
      )}
      <section class="card vote-result" data-testid="vote-result" aria-label={p.col.label}>
        <header class="vote-head">
          <h3>{p.col.label}</h3>
          <SeatStepper value={p.seats} onChange={(n) => setStats({ seats: { ...st.stats.seats, [p.col.index]: n } })} />
        </header>
        <div class="tiles">
          <Tile label={extra().stats.ballots} value={String(p.tally.validBallots)} />
          <div class="tile on-soft">
            <span class="tile-l">{S.stats.elected}</span>
            <span class={`tile-n${[...electedText].length > 7 ? ' long' : ''}`}>{electedText}</span>
          </div>
        </div>
        <div class="vote-bars" role="list">
          {rows.map((r) => {
            const isElected = elected.has(r.name);
            const isTied = tied.has(r.name);
            return (
              <div key={r.name} class="brow" role="listitem">
                <div class="h">
                  <span class="nm">
                    {r.name}
                    {isElected && <span class="tag accent">{S.stats.elected}</span>}
                    {isTied && <span class="tag warn">{S.stats.tied}</span>}
                  </span>
                  <span class="v">{`${S.stats.votes(r.votes)} · ${pct(r.votes)}%`}</span>
                </div>
                <div class="track">
                  <i class={isElected ? 'win' : isTied ? 'tie' : ''} style={{ width: `${Math.max(2, Math.round((r.votes / maxVotes) * 100))}%` }} />
                </div>
              </div>
            );
          })}
        </div>
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
            {S.stats.drawn(p.election.tied.join('、'), tiedVotes, p.election.tied.filter((n) => elected.has(n)).join('、'))}
            <br />
            {S.stats.drawnNote}
          </Notice>
        )}
        {p.tally.invalid > 0 && <p class="hint">{S.stats.invalidVotes(p.tally.invalid)}</p>}
        {p.tally.abstain > 0 && <p class="hint">{S.stats.abstain(p.tally.abstain)}</p>}
        {v.inclusion.rowOrderBallots.length > 0 && (
          <p class="hint" data-testid="row-order-hint">
            <Icon name="info" />
            <span>{S.stats.rowOrder(v.inclusion.rowOrderBallots.length)}</span>
          </p>
        )}
        <ImageSave svg={imgSvg} />
      </section>
      {!any && (
        <p class="ok-line" data-testid="vote-no-issue">
          <Icon name="check" />
          <span>{S.stats.noIssue}</span>
        </p>
      )}
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
        <OptionGroup
          label={S.stats.trim}
          value={o.trim}
          options={[
            { value: 0, label: S.stats.trimOff },
            { value: 1, label: S.stats.trimOne },
          ]}
          onChange={(k) => setStats({ trim: k })}
        />
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

/* ───────── 審稿卡、頁頂提醒、進階設定 ───────── */

interface TeacherProps {
  value: string;
  onChange: (v: string) => void;
  name: string;
  allNames: string[];
}

/** 審稿：獨立一張卡，帶進度（已審 N／M）；有老師評語就接在留言後面。 */
function ReviewCard(props: { items: { key: string; text: string }[]; total: number; pending: number; teacher?: TeacherProps; hint?: string }) {
  const st = useApp();
  if (!st.review) return null;
  const done = props.total - props.pending;
  const R = S.review;
  return (
    <section class="card review-card" data-testid="review-card">
      <h3>
        {ui().reviewTitle}
        {props.total > 0 && <span class="tag warn">{ui().reviewDone(done, props.total)}</span>}
      </h3>
      {props.total > 0 && (
        <div class="track" role="progressbar" aria-label={ui().reviewBar} aria-valuemin={0} aria-valuemax={props.total} aria-valuenow={done}>
          <i style={{ width: `${Math.round((done / props.total) * 100)}%` }} />
        </div>
      )}
      {props.hint ? (
        <p class="hint">{props.hint}</p>
      ) : (
        <>
          <p class="hint">{R.lead}</p>
          <p class="hint">{R.count(props.items.length)}</p>
          <CommentList items={props.items} />
        </>
      )}
      {props.teacher && (
        <div class="review-teacher">
          <h4>{R.teacherTitle}</h4>
          <p class="hint">{R.teacherHelp}</p>
          <TeacherComment value={props.teacher.value} onChange={props.teacher.onChange} studentName={props.teacher.name} allNames={props.teacher.allNames} />
        </div>
      )}
      {!st.reviewUnsaved && st.folder.state === 'ready' && <p class="hint">{R.savedFolder}</p>}
    </section>
  );
}

/** 頁頂一行細橫幅（可關閉本次）：還沒審的留言數與儲存狀態合併成一則。 */
function TopBanner({ pending, flagged, onClose }: { pending: number; flagged: number; onClose: () => void }) {
  const st = useApp();
  const unsaved = st.reviewUnsaved;
  if (pending === 0 && !unsaved) return null;
  const parts = [pending > 0 ? `${ui().bannerPending(pending)}${flagged > 0 ? `（${ui().bannerFlagged(flagged)}）` : ''}` : '', unsaved ? ui().bannerUnsaved : ''].filter(Boolean);
  return (
    <div class={`strip ${flagged > 0 || unsaved ? 'warn' : 'info'}`} role="status" data-testid="top-banner">
      <span class="strip-text">{parts.join('；')}</span>
      {unsaved && (
        <button class="btn secondary small" type="button" onClick={() => void downloadReview()}>
          {isTouchDevice() ? S.folder.saveToFiles : S.review.downloadReview}
        </button>
      )}
      <button class="strip-x" type="button" aria-label={ui().dismiss} onClick={onClose}>
        ×
      </button>
    </div>
  );
}

/** 進階設定：預設收合，只顯示目前設定摘要。 */
function Advanced({ summary, children }: { summary: string; children: ComponentChildren }) {
  return (
    <details class="card adv" data-testid="advanced">
      <summary>
        <span class="adv-t">
          <strong>{ui().advTitle}</strong>
          <span class="hint">{summary}</span>
        </span>
        <span class="adv-chev" aria-hidden="true" />
      </summary>
      <div class="adv-body">{children}</div>
    </details>
  );
}

/* ───────── 畫面 ───────── */

export function StatsView() {
  const st = useApp();
  const wide = useWide();
  const [bannerOff, setBannerOff] = useState(false);
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
    entries = [{ key: '', name: extra().stats.classOverview, note: S.stats.people(fb.targets.length) }, ...sorted.map((t) => ({ key: t.key, name: `${seatOf(t)} ${personName(t)}`.trim(), note: `${f1(t.total)}・${S.stats.rank(t.rank)}` }))];
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
  const total = { total: counts?.total ?? 0, pending: counts?.pending ?? 0 };
  const selQ = qs?.find((q) => String(q.col.index) === sel);
  const selT = fb?.targets.find((t) => t.key === sel);
  const blanks = qs ? blankColumns(s) : [];
  const hasComments = commentItems.length > 0;
  const showBanner = !bannerOff && st.review !== null && hasComments;

  const o = st.stats;
  const advSummary = fb
    ? [
        `${ui().advTrim}：${o.trim === 0 ? ui().advTrimOff : ui().advTrimOne}`,
        `${ui().advReversed}：${ui().advReversedN(o.reversed.length)}`,
        ...(hasComments ? [`${ui().advWords}：${ui().advWordsN(st.review?.keywords.length ?? 0)}`] : []),
      ].join('・')
    : vote
      ? `${ui().advRules}：${[S.stats.ruleMultiOpts[o.voteRules.multi], S.stats.ruleSelfOpts[o.voteRules.self], S.stats.ruleTimeOpts[o.voteRules.time]].join('・')}`
      : hasComments
        ? `${ui().advWords}：${ui().advWordsN(st.review?.keywords.length ?? 0)}`
        : '';
  const hasAdvanced = fb !== null || vote !== null || (qs !== null && hasComments);
  // 審稿卡在右欄（報告回饋）；意見調查的留言題把審稿卡當成結果放在主欄
  const hasSide = fb !== null && st.review !== null;

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
      {showBanner && <TopBanner pending={total.pending} flagged={counts?.flaggedPending ?? 0} onClose={() => setBannerOff(true)} />}
      <div class={`wb${hasSide ? '' : ' wb-noside'}`}>
        <WorkList title={listTitle} entries={entries} sel={sel} />
        <section class="wb-main" aria-live="polite">
          {blanks.length > 0 && <Notice kind="info">{ui().blankCols(blanks.map((c) => c.label))}</Notice>}
          {fb && <FeedbackMain summary={fb} sel={sel} wide={wide} />}
          {fb && sel === '' && <TrendCard current={fb} label={s.name} max={s.scale.max} wide={wide} />}
          {qs && selQ && <QuestionMain q={selQ} wide={wide} reviewTotal={total} />}
          {qs && !selQ && <p class="hint">{S.stats.noData}</p>}
          {vote && <VoteMain v={vote} sel={sel} wide={wide} />}
        </section>
        {hasSide && fb && (
          <aside class="wb-side">
            <ReviewCard
              items={selT ? selT.comments.map((c) => ({ key: feedbackKey(c.recordId), text: c.text })) : []}
              total={total.total}
              pending={total.pending}
              hint={selT ? undefined : ui().pickToReview}
              teacher={
                selT
                  ? {
                      value: st.review?.teacher[selT.key] ?? '',
                      onChange: (v) => updateReview((r) => setTeacher(r, selT.key, v)),
                      name: personName(selT),
                      allNames: fb.targets.map(personName),
                    }
                  : undefined
              }
            />
          </aside>
        )}
      </div>
      {hasAdvanced && (
        <Advanced summary={advSummary}>
          {fb && <FeedbackSettings summary={fb} />}
          {vote && <VoteRulesCard />}
          {hasComments && <Keywords />}
        </Advanced>
      )}
      <ActBar fixed>
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

/** 報告回饋統計頁的資料提示：疑似評分欄被當成選擇題、量表疑似不符（Issue #145）。 */
function ScoreHints() {
  const s = useApp().session;
  if (!s || s.kind !== 'feedback') return null;
  const suspects = suspectScoreColumns(s.table, s.cols);
  const sus = scaleSuspect(s.table, s.cols, s.scale, s.scaleConfirmed);
  if (suspects.length === 0 && !sus) return null;
  const toScore = (index: number) =>
    setSession((cur) => {
      const cols = withRole(cur.cols, index, 'score');
      return scoreSignature(cols) === scoreSignature(cur.cols) ? { cols } : { cols, scaleConfirmed: false, scale: detectScale(cur.table, cols) };
    });
  return (
    <div data-testid="score-hints">
      {suspects.map((c) => (
        <Notice
          key={c.index}
          kind="warn"
          actions={
            <button class="btn primary small" type="button" onClick={() => toScore(c.index)}>
              {S.stats.suspectScoreBtn(c.label)}
            </button>
          }
        >
          {S.stats.suspectScoreCol(c.label)}
        </Notice>
      ))}
      {sus && (
        <Notice
          kind="warn"
          actions={
            <>
              <button class="btn primary small" type="button" onClick={() => setSession({ scale: { min: 1, max: 5 }, scaleConfirmed: true })}>
                {S.stats.scaleSuspectBtn}
              </button>
              <button class="btn secondary small" type="button" onClick={() => setSession({ scaleConfirmed: true })}>
                {S.stats.scaleSuspectKeep}
              </button>
            </>
          }
        >
          {S.stats.scaleSuspect(sus.outliers, sus.total)}
        </Notice>
      )}
    </div>
  );
}
