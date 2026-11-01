import { useMemo, useState } from 'preact/hooks';
import { type FeedbackSummary } from '../../core';
import { tableFromFile } from '../../app/load';
import { surveyNameFromFile } from '../../app/load';
import { type ExtraWave, consecutiveDrops, summaryFromTable, trendOf } from '../../app/trend';
import { strings as S } from '../strings';
import { linesSvg } from '../chart-svg';
import { Notice } from '../parts/parts';

const f2 = (n: number | null): string => (n === null ? '—' : (Math.round(n * 100) / 100).toFixed(2));
const DIR = { up: S.trend.up, down: S.trend.down, flat: S.trend.flat, unknown: S.trend.unknown } as const;

/** 歷次趨勢：加入之前的問卷檔（只在記憶體），並排看各題班均的變化。 */
export function TrendCard({ current, label, max, wide }: { current: FeedbackSummary; label: string; max: number; wide: boolean }) {
  const [extras, setExtras] = useState<ExtraWave[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const trend = useMemo(() => trendOf(extras, { label: `${label}（${S.trend.current}）`, summary: current }), [extras, current, label]);
  const enough = trend.labels.length >= 2;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setMsg(null);
    const added: ExtraWave[] = [];
    for (const f of Array.from(files)) {
      const name = surveyNameFromFile(f.name);
      try {
        const summary = summaryFromTable(await tableFromFile(f));
        if (!summary) setMsg(S.trend.notFeedback(name));
        else added.push({ id: `${Date.now()}-${added.length}-${name}`, label: name, summary });
      } catch {
        setMsg(S.trend.unreadable(name));
      }
    }
    if (added.length > 0) setExtras((cur) => [...cur, ...added]);
  };

  const drops = enough ? consecutiveDrops(trend) : [];
  const svg = enough
    ? linesSvg([{ label: S.trend.classMean, values: trend.classMean.points.map((p) => p.value) }, ...trend.items.map((s) => ({ label: s.label, values: s.points.map((p) => p.value) }))].slice(0, 4), trend.labels, { title: S.trend.chartTitle, max, w: wide ? 560 : 340 })
    : '';

  return (
    <section class="card" data-testid="trend">
      <h2>{S.trend.title}</h2>
      <p class="hint">{S.trend.lead}</p>
      <label class="btn secondary small">
        {S.trend.add}
        <input type="file" accept=".xlsx,.csv,.tsv" multiple hidden aria-label={S.trend.addAria} data-testid="trend-input" onChange={(e) => void onFiles((e.target as HTMLInputElement).files)} />
      </label>
      {msg && <Notice kind="warn">{msg}</Notice>}
      {extras.length > 0 && (
        <ul class="plain-list">
          {extras.map((x) => (
            <li key={x.id}>
              {x.label}{' '}
              <button class="linkbtn" type="button" onClick={() => setExtras((cur) => cur.filter((c) => c.id !== x.id))}>
                {S.trend.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!enough && <p class="hint">{S.trend.needTwo}</p>}
      {drops.map((d) => (
        <Notice key={d.label} kind="warn">
          {S.trend.drops(d.label, f2(d.from), f2(d.to))}
        </Notice>
      ))}
      {enough && (
        <>
          <figure class="chart-fig">
            <div class="chart" dangerouslySetInnerHTML={{ __html: svg }} />
          </figure>
          <div class="table-wrap">
            <table class="roster-table" data-testid="trend-table">
              <thead>
                <tr>
                  <th>{S.trend.colItem}</th>
                  {trend.labels.map((l) => (
                    <th key={l}>{l}</th>
                  ))}
                  <th>{S.trend.colChange}</th>
                </tr>
              </thead>
              <tbody>
                {[trend.classMean, ...trend.items].map((s) => (
                  <tr key={s.key}>
                    <th scope="row">{s.label}</th>
                    {s.points.map((p, i) => (
                      <td key={i}>{f2(p.value)}</td>
                    ))}
                    <td>
                      {s.change === null ? '—' : `${s.change > 0 ? '+' : ''}${f2(s.change)} `}
                      {DIR[s.direction]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="hint">{S.trend.matchNote}</p>
        </>
      )}
    </section>
  );
}
