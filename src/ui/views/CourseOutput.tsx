import { useEffect, useState } from 'preact/hooks';
import { courseApplicants, courseList, courseSummary } from '../../app/course-app';
import { courseXlsxName, hitSheets, listSheets, pendingSheets } from '../../app/course-out';
import { canGoStats } from '../../app/progress';
import { go, loadCourse, useApp } from '../../app/store';
import { loadXlsx } from '../../export';
import { downloadBytes } from '../../storage';
import { strings as S } from '../strings';
import { ActBar, Notice } from '../parts/parts';

const O = S.course.out;
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
type Key = 'list' | 'pending' | 'hits';

export default function CourseOutput() {
  const st = useApp();
  const s = st.session;
  const [on, setOn] = useState<Record<Key, boolean>>({ list: true, pending: true, hits: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  useEffect(() => {
    void loadCourse();
  }, [s?.surveyId]);
  if (!s || !canGoStats(s) || !s.course.result) {
    return (
      <main class="page out" id="main">
        <h1>{S.output.title}</h1>
        <Notice kind="warn">{O.needResult}</Notice>
        <ActBar>
          <button class="btn secondary grow" type="button" onClick={() => go(s && canGoStats(s) ? 'stats' : s ? 'prepare' : 'home')}>
            {O.goStep3}
          </button>
        </ActBar>
      </main>
    );
  }
  const c = s.course;
  const sum = courseSummary(s, c)!;
  const cap = courseList(s, c).reduce((a, x) => a + x.capacity, 0);
  const people = courseApplicants(s, c).list.length;
  const defs: { key: Key; title: string; note: string; build: () => ReturnType<typeof listSheets>; label: string }[] = [
    { key: 'list', title: O.list, note: O.listNote, build: () => listSheets(s), label: O.listFile },
    { key: 'pending', title: O.pending, note: O.pendingNote, build: () => pendingSheets(s), label: O.pendingFile },
    { key: 'hits', title: O.hits, note: O.hitsNote, build: () => hitSheets(s), label: O.hitsFile },
  ];
  const chosen = defs.filter((d) => on[d.key]);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { buildXlsx } = await loadXlsx();
      const names: string[] = [];
      for (const d of chosen) {
        const name = courseXlsxName(s, d.label);
        downloadBytes(name, buildXlsx(d.build()), XLSX);
        names.push(name);
      }
      setMsg({ kind: 'ok', text: S.output.done(names.join('、')) });
    } catch {
      setMsg({ kind: 'bad', text: S.output.failed });
    } finally {
      setBusy(false);
    }
  };

  const pct = (n: number) => (sum.total === 0 ? 0 : Math.round((n / sum.total) * 100));

  return (
    <main class="page out course-out" id="main">
      <header class="prep-head">
        <h1>{S.output.title}</h1>
        <p class="meta">{s.name}</p>
      </header>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div class="out-grid">
        <section class="card">
          <h2>{O.title}</h2>
          <ul class="plain-ul">
            {defs.map((d) => (
              <li key={d.key}>
                <label class="filecard">
                  <input type="checkbox" checked={on[d.key]} onChange={(e) => setOn({ ...on, [d.key]: e.currentTarget.checked })} data-testid={`out-${d.key}`} />
                  <span class="fc-main">
                    <strong>{d.title}</strong>
                    <span class="rb-note">{d.note}</span>
                  </span>
                  <span class="tag">xlsx</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section class="card" aria-label={O.previewTitle}>
          <h2>{O.previewTitle}</h2>
          <ul class="plain-ul hit-list" data-testid="hit-preview">
            {sum.rankCounts.map((n, i) => (
              <li key={i}>{O.rankLine(i + 1, n, pct(n))}</li>
            ))}
            <li>{O.pendingLine(sum.unassigned, pct(sum.unassigned))}</li>
          </ul>
          <ul class="plain-ul">
            {sum.courses.map((x) => (
              <li key={x.name} class="hit-course">
                <span>
                  {x.name} <span class="hint">{O.applied(x.firstChoice)}</span>
                </span>
                <span class="hit-n">
                  {x.filled}／{x.capacity}
                </span>
                <div class={`cbar${x.over > 0 || x.suggestClose ? ' bad' : ''}`} aria-hidden="true">
                  <span style={{ width: `${x.capacity <= 0 ? 0 : Math.min(100, Math.round((x.filled / x.capacity) * 100))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Notice kind="info">{O.record(c.seed, cap, people)}</Notice>
      <Notice kind="warn">{O.privacy}</Notice>
      <ActBar>
        <button class="btn secondary" type="button" onClick={() => go('stats')}>
          {S.output.back}
        </button>
        <button class="btn primary grow" type="button" disabled={busy || chosen.length === 0} onClick={() => void run()} data-testid="course-download">
          {O.download}
        </button>
      </ActBar>
    </main>
  );
}
