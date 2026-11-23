import { useMemo, useState } from 'preact/hooks';
import { isLowSample } from '../../core';
import { type Question, crossGroupCols, crossMeans } from '../../app/analysis';
import type { Session } from '../../app/store';
import { useApp } from '../../app/store';
import { strings as S } from '../strings';
import { extra } from '../strings-extra';
import { Notice } from '../parts/parts';
import { CommentList } from './ReviewParts';

const T = () => extra().opinionTabs;
/** 熱圖最多列出的組數，避免像「姓名」這種每人一種答案的欄位撐爆畫面。 */
const MAX_GROUPS = 12;

export type OpinionView = 'q' | 'cross' | 'comments';

/** 統計頁上方的「題目／交叉／留言」分段（稿 5.8、工作台 12a／12c）。 */
export function ViewTabs({ value, onChange }: { value: OpinionView; onChange: (v: OpinionView) => void }) {
  const tabs: [OpinionView, string][] = [
    ['q', T().questions],
    ['cross', T().cross],
    ['comments', T().comments],
  ];
  return (
    <div class="seg" role="group" aria-label={T().label} data-testid="view-tabs">
      {tabs.map(([k, label]) => (
        <button key={k} type="button" class={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** 交叉分析（稿 5g）：選分組題，看各組在每題量表的平均；首欄固定、可左右滑，格內一定有數字。 */
export function CrossView({ s }: { s: Session }) {
  const st = useApp();
  const groups = useMemo(() => crossGroupCols(s, st.stats), [s, st.stats]);
  const [sel, setSel] = useState(0);
  const col = groups[Math.min(sel, groups.length - 1)];
  const data = useMemo(() => (col ? crossMeans(s, col) : null), [s, col]);
  if (!col || !data) return <Notice kind="info">{T().noGroup}</Notice>;
  if (data.scoreCols.length === 0) return <Notice kind="info">{T().noScore}</Notice>;
  const r = data.result;
  const order = r.groupLabels.map((_, i) => i).sort((a, b) => (r.sizes[b] ?? 0) - (r.sizes[a] ?? 0) || a - b);
  const shown = order.slice(0, MAX_GROUPS);
  const span = Math.max(1, s.scale.max - s.scale.min);
  return (
    <section class="card cross" data-testid="cross-view">
      <label class="field">
        <span class="lbl">{T().groupBy}</span>
        <select class="input" value={String(sel)} onChange={(e) => setSel(Number((e.target as HTMLSelectElement).value))} aria-label={T().groupBy}>
          {groups.map((g, i) => (
            <option key={g.index} value={i}>
              {g.label}
            </option>
          ))}
        </select>
        <span class="hint">{T().groupHelp}</span>
      </label>
      {r.skipped > 0 && <p class="hint">{T().skipped(r.skipped)}</p>}
      {order.length > shown.length && <p class="hint">{T().tooMany(order.length, shown.length)}</p>}
      <div class="heat-wrap">
        <table class="heat" aria-label={T().tableLabel}>
          <thead>
            <tr>
              <th scope="col">{col.label}</th>
              {data.scoreCols.map((c) => (
                <th key={c.index} scope="col" title={c.label}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((g) => (
              <tr key={r.groupLabels[g]}>
                <th scope="row">
                  {r.groupLabels[g]} <span class="hint">{T().people(r.sizes[g] ?? 0)}</span>
                  {isLowSample(r.sizes[g] ?? 0) && <span class="tag warn">{T().lowSample(r.sizes[g] ?? 0)}</span>}
                </th>
                {data.scoreCols.map((c, q) => {
                  const m = r.means[g]?.[q] ?? null;
                  const pctVal = m === null ? 0 : Math.round(Math.max(0, Math.min(1, (m - s.scale.min) / span)) * 60);
                  return (
                    <td key={c.index} data-testid="heat-cell" style={m === null ? undefined : { background: `color-mix(in srgb, var(--accent) ${pctVal}%, var(--card))` }}>
                      {m === null ? '—' : m.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="hint">{T().heatHint}</p>
    </section>
  );
}

const esc = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 留言分頁：所有開放題的留言放在一起，可搜尋，關鍵字在原文標出（不使用 AI）。 */
export function CommentsView({ qs, items }: { qs: Question[]; items: { key: string; text: string }[] }) {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const hasOpen = qs.some((x) => x.kind === 'comment');
  if (!hasOpen) return <Notice kind="info">{T().noOpen}</Notice>;
  const needle = q.trim();
  const shown = needle === '' ? items : items.filter((i) => i.text.toLowerCase().includes(needle.toLowerCase()));
  return (
    <section class="card" data-testid="comments-view">
      <form
        class="btn-row"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft);
        }}
      >
        <input class="input" type="search" value={draft} aria-label={T().search} placeholder={T().search} onInput={(e) => setDraft((e.target as HTMLInputElement).value)} />
        <button class="btn secondary" type="submit">
          {T().searchBtn}
        </button>
      </form>
      <p class="hint" role="status">
        {T().found(shown.length, items.length)}
      </p>
      {shown.length === 0 ? <p class="hint">{T().noMatch}</p> : <CommentList items={shown} mark={needle === '' ? undefined : new RegExp(esc(needle), 'gi')} />}
      <p class="hint">{S.review.lead}</p>
    </section>
  );
}
