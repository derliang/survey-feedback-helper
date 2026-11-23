import { useMemo, useState } from 'preact/hooks';
import { type Theme, UNSORTED, isLowSample, parseKeywordInput, themeCounts, themesOf, validateThemes } from '../../core';
import { type Question, crossGroupCols, crossMeans } from '../../app/analysis';
import type { Session } from '../../app/store';
import { setSession, useApp } from '../../app/store';
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
  const [picked, setPicked] = useState<number[] | null>(null); // 欄位編號；null＝全部
  const [pickOpen, setPickOpen] = useState(false);
  const col = groups[Math.min(sel, groups.length - 1)];
  const data = useMemo(() => (col ? crossMeans(s, col) : null), [s, col]);
  if (!col || !data) return <Notice kind="info">{T().noGroup}</Notice>;
  if (data.scoreCols.length === 0) return <Notice kind="info">{T().noScore}</Notice>;
  const qIdx = data.scoreCols.map((c, i) => i).filter((i) => picked === null || picked.includes((data.scoreCols[i] as { index: number }).index));
  const cols = qIdx.map((i) => data.scoreCols[i] as (typeof data.scoreCols)[number]);
  const toggle = (idx: number) => {
    const all = data.scoreCols.map((c) => c.index);
    const cur = picked ?? all;
    const next = cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx];
    if (next.length === 0) return false;
    setPicked(next.length === all.length ? null : next);
    return true;
  };
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
      <div class="field cross-pick">
        <button class="rowbtn" type="button" aria-expanded={pickOpen} onClick={() => setPickOpen(!pickOpen)} data-testid="cross-pick">
          <span>
            <span class="nm">{T().pickQ}</span>
            <span class="sm">{cols.length === data.scoreCols.length ? T().pickAll(data.scoreCols.length) : T().pickSome(cols.length, data.scoreCols.length)}</span>
          </span>
          <span class="tag accent">{pickOpen ? T().themeDone : T().pickChange}</span>
        </button>
        {pickOpen && (
          <div class="pick-panel" role="group" aria-label={T().pickTitle}>
            <div class="btn-row">
              <button class="btn ghost small" type="button" onClick={() => setPicked(null)}>
                {T().pickSelectAll}
              </button>
              <button class="btn ghost small" type="button" onClick={() => setPicked(cols.length > 0 ? [(cols[0] as { index: number }).index] : null)}>
                {T().pickNone}
              </button>
            </div>
            {data.scoreCols.map((c) => (
              <label key={c.index} class="check">
                <input type="checkbox" checked={picked === null || picked.includes(c.index)} onChange={(e) => {
                    if (!toggle(c.index)) (e.target as HTMLInputElement).checked = true; // 最後一題不能取消：還原勾選
                  }}
                />
                {c.label}
              </label>
            ))}
            {picked !== null && picked.length === 1 && <p class="hint">{T().pickMin}</p>}
          </div>
        )}
      </div>
      {r.skipped > 0 && <p class="hint">{T().skipped(r.skipped)}</p>}
      {order.length > shown.length && <p class="hint">{T().tooMany(order.length, shown.length)}</p>}
      <div class="heat-wrap">
        <table class="heat" aria-label={T().tableLabel}>
          <thead>
            <tr>
              <th scope="col">{col.label}</th>
              {cols.map((c) => (
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
                {cols.map((c, qi) => {
                  const m = r.means[g]?.[qIdx[qi] as number] ?? null;
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

/** 留言分頁：所有開放題的留言放在一起，可搜尋、依老師設定的主題篩選，關鍵字在原文標出（不使用 AI，稿 5f）。 */
export function CommentsView({ qs, items }: { qs: Question[]; items: { key: string; text: string }[] }) {
  const st = useApp();
  const themes = st.session?.themes ?? [];
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [theme, setTheme] = useState<string | null>(null); // null＝全部
  const [manage, setManage] = useState(false);
  const hasOpen = qs.some((x) => x.kind === 'comment');
  if (!hasOpen) return <Notice kind="info">{T().noOpen}</Notice>;
  const needle = q.trim();
  const counts = themeCounts(items.map((i) => i.text), themes);
  const active = theme !== null && counts.some((c) => c.name === theme) ? theme : null;
  const tagged = items.map((i) => ({ ...i, tags: themesOf(i.text, themes) }));
  const byTheme = active === null ? tagged : tagged.filter((i) => (active === UNSORTED ? i.tags.length === 0 : i.tags.includes(active)));
  const shown = needle === '' ? byTheme : byTheme.filter((i) => i.text.toLowerCase().includes(needle.toLowerCase()));
  const setThemes = (next: Theme[]) => setSession({ themes: next });
  const problems = validateThemes(themes);
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
      <div class="chips" role="group" aria-label={T().themeManage} data-testid="theme-chips">
        <button class={`chip${active === null ? ' on' : ''}`} type="button" aria-pressed={active === null} onClick={() => setTheme(null)}>
          {T().themeAll(items.length)}
        </button>
        {counts.map((c) => (
          <button key={c.name} class={`chip${active === c.name ? ' on' : ''}`} type="button" aria-pressed={active === c.name} onClick={() => setTheme(c.name)}>
            {T().themeChip(c.name === UNSORTED ? T().themeUnsorted : c.name, c.count)}
          </button>
        ))}
        <button class="chip ghost" type="button" aria-expanded={manage} onClick={() => setManage(!manage)} data-testid="theme-manage">
          {manage ? T().themeDone : T().themeManage}
        </button>
      </div>
      {manage && (
        <div class="theme-edit" data-testid="theme-edit">
          <p class="hint">{T().themeHelp}</p>
          {themes.length === 0 && <p class="hint">{T().themeEmpty}</p>}
          {themes.map((th, i) => (
            <div key={i} class="theme-row">
              <input class="input" value={th.name} aria-label={T().themeName} placeholder={T().themeName} onInput={(e) => setThemes(themes.map((x, j) => (j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x)))} />
              <input
                class="input"
                defaultValue={th.keywords.join('、')}
                aria-label={T().themeWords}
                placeholder={T().themeWords}
                onBlur={(e) => setThemes(themes.map((x, j) => (j === i ? { ...x, keywords: parseKeywordInput((e.target as HTMLInputElement).value) } : x)))}
              />
              <button class="btn ghost small" type="button" aria-label={T().themeDel(th.name)} onClick={() => setThemes(themes.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          {problems.length > 0 && (
            <p class="hint" role="status">
              {problems.join('；')}
            </p>
          )}
          <button class="btn secondary small" type="button" onClick={() => setThemes([...themes, { name: '', keywords: [] }])}>
            {T().themeAdd}
          </button>
        </div>
      )}
      <p class="hint" role="status">
        {T().found(shown.length, items.length)}
      </p>
      {shown.length === 0 ? <p class="hint">{T().noMatch}</p> : <CommentList items={shown} mark={needle === '' ? undefined : new RegExp(esc(needle), 'gi')} />}
      <p class="hint">{S.review.lead}</p>
    </section>
  );
}
