import { useState } from 'preact/hooks';
import { type ColumnInfo, type Role, countToConfirm, detectScale, gridGroup, mappingProblems, movePref, prefColumns, withRank, withRole } from '../../app/columns';
import { go, saveSurvey, setSession, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { ActBar, Icon, Notice, Sheet } from '../parts/parts';

function rolesFor(kind: string): Role[] {
  const base: Role[] = ['timestamp', 'respondentClass', 'respondentSeat', 'respondentName'];
  const target: Role[] = ['targetClass', 'targetSeat', 'targetName'];
  const rest: Role[] = kind === 'course' ? ['preference', 'comment', 'ignore'] : ['bookTitle', 'score', 'choice', 'comment', 'ignore'];
  return [...base, ...(kind === 'feedback' ? target : []), ...rest];
}

export function MappingView() {
  const s = useApp().session;
  const [editing, setEditing] = useState<ColumnInfo | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  if (!s) return null;

  const update = (index: number, patch: Partial<ColumnInfo>) =>
    setSession((cur) => ({ cols: cur.cols.map((c) => (c.index === index ? { ...c, ...patch } : c)) }));
  const setCols = (f: (cols: ColumnInfo[]) => ColumnInfo[]) => setSession((cur) => ({ cols: f(cur.cols) }));
  const isCourse = s.kind === 'course';
  const prefs = prefColumns(s.cols);
  const grid = isCourse ? gridGroup(s.cols) : null;
  const used = s.cols.filter((c) => c.role !== 'ignore');
  const unused = s.cols.filter((c) => c.role === 'ignore');
  const ordered = [...used.filter((c) => c.confirm), ...used.filter((c) => !c.confirm)];
  const problems = mappingProblems(s.kind, s.cols);
  const toConfirm = countToConfirm(s.cols);
  const hasScore = s.cols.some((c) => c.role === 'score');

  const row = (c: ColumnInfo) => (
    <li key={c.index} class="map-row">
      <button type="button" class={`rowbtn${c.confirm ? ' needs' : ''}`} onClick={() => setEditing(c)} aria-label={`${c.label}：${S.mapping.roles[c.role ?? 'ignore']}`}>
        <span class="rb-main">
          <strong>{c.label}</strong>
          <span class="rb-note">{c.samples.slice(0, 3).join('、') || '（沒有資料）'}</span>
        </span>
        <span class="rb-tags">
          {c.confirm && <span class="tag warn">{S.mapping.confirmTag}</span>}
          <span class="tag">{c.role === 'preference' ? S.mapping.rankTag(c.rank ?? 1) : S.mapping.roles[c.role ?? 'ignore']}</span>
        </span>
      </button>
      {renaming === c.index ? (
        <input
          class="input rename"
          aria-label={S.mapping.rename}
          autoFocus
          value={c.label}
          onInput={(e) => update(c.index, { label: e.currentTarget.value })}
          onBlur={() => {
            if (c.label.trim() === '') update(c.index, { label: c.header });
            setRenaming(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      ) : (
        <button type="button" class="icbtn" aria-label={`${S.mapping.rename}：${c.label}`} onClick={() => setRenaming(c.index)}>
          <Icon name="pencil" />
        </button>
      )}
    </li>
  );

  const finish = () => {
    setSession((cur) => ({
      cols: cur.cols.map((c) => ({ ...c, confirm: false })),
      scale: detectScale(cur.table, cur.cols),
      mappingConfirmed: true,
    }));
    void saveSurvey();
    go('prepare', 'roster');
  };

  return (
    <div class="view">
      <h2>{S.mapping.title}</h2>
      <p class="hint">{S.mapping.lead}</p>
      {toConfirm > 0 ? <Notice kind="warn">{S.mapping.toConfirm(toConfirm)}</Notice> : <Notice kind="ok">{S.mapping.allGood}</Notice>}
      <ul class="map-list">{ordered.map(row)}</ul>
      {isCourse && (
        <button type="button" class="btn secondary" onClick={() => setAdding(true)} data-testid="add-pref">
          {S.mapping.addPref}
        </button>
      )}
      {isCourse && prefs.length > 1 && (
        <section class="card pref-order" aria-label={S.mapping.prefOrder}>
          <h3>{S.mapping.prefOrder}</h3>
          <ol class="plain-ul">
            {prefs.map((c, i) => (
              <li key={c.index} class="pref-row">
                <span class="tag accent">{S.mapping.rankTag(i + 1)}</span>
                <span class="pr-name">{c.label}</span>
                <button type="button" class="icbtn" disabled={i === 0} aria-label={`${S.mapping.moveUp}：${c.label}`} onClick={() => setCols((cols) => movePref(cols, c.index, -1))}>
                  ↑
                </button>
                <button type="button" class="icbtn" disabled={i === prefs.length - 1} aria-label={`${S.mapping.moveDown}：${c.label}`} onClick={() => setCols((cols) => movePref(cols, c.index, 1))}>
                  ↓
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      {grid && (
        <Notice kind="info" title={S.mapping.gridTitle(grid.members.length)}>
          {grid.question}：{grid.members.map((m) => m.label).join(' → ')}{' '}
          <button class="btn ghost small" type="button" aria-expanded={showGrid} onClick={() => setShowGrid(!showGrid)}>
            {showGrid ? S.mapping.collapse : S.mapping.expand}
          </button>{' '}
          <span class="tag warn">{S.mapping.toVerify}</span>
        </Notice>
      )}
      {grid && showGrid && (
        <ul class="plain-ul grid-members">
          {grid.members.map((m) => (
            <li key={m.index}>
              {m.header} <span class="tag">{S.mapping.rankTag(m.rank ?? 1)}</span>
            </li>
          ))}
        </ul>
      )}
      {grid && grid.unmatched.length > 0 && (
        <Notice kind="warn" title={S.mapping.gridUnmatched(grid.unmatched.length)}>
          <span class="merge-list">
            {grid.unmatched.map((u) => (
              <span key={u.index} class="merge-row">
                <span>
                  {u.label} <span class="hint">{u.samples.slice(0, 2).join('、')}</span>
                </span>
                <span class="merge-btns">
                  {u.role === 'ignore' ? (
                    <span class="tag">{S.mapping.skipped}</span>
                  ) : (
                    <button class="btn secondary small" type="button" onClick={() => setCols((cols) => withRole(cols, u.index, 'ignore'))}>
                      {S.mapping.skip}
                    </button>
                  )}
                  <button class="btn ghost small" type="button" onClick={() => setCols((cols) => withRole(cols, u.index, 'preference'))}>
                    {S.mapping.putPref}
                  </button>
                </span>
              </span>
            ))}
          </span>
        </Notice>
      )}
      {hasScore && (
        <div class="field">
          <span class="label" id="scale-l">
            {S.mapping.scale}
          </span>
          <div class="seg" role="radiogroup" aria-labelledby="scale-l">
            {(['1-5', '0-10'] as const).map((k) => {
              const [min, max] = k.split('-').map(Number) as [number, number];
              const on = s.scale.min === min && s.scale.max === max;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} class={on ? 'on' : ''} onClick={() => setSession({ scale: { min, max } })}>
                  {S.mapping.scaleOptions[k]}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {unused.length > 0 && (
        <details class="unused">
          <summary>{S.mapping.unused(unused.length)}</summary>
          <ul class="map-list">{unused.map(row)}</ul>
        </details>
      )}
      {problems.length > 0 && (
        <Notice kind="bad" title={S.mapping.problemsTitle}>
          {problems.join(' ')}
        </Notice>
      )}
      <ActBar>
        <button class="btn secondary" type="button" onClick={() => go('prepare', 'type')}>
          {S.back}
        </button>
        <button class="btn primary grow" type="button" disabled={problems.length > 0} onClick={finish}>
          {S.mapping.done}
        </button>
      </ActBar>

      {editing && (
        <Sheet
          title={S.mapping.pickTitle(editing.label)}
          onClose={() => setEditing(null)}
          footer={
            <button class="btn primary grow" type="button" onClick={() => setEditing(null)}>
              {S.apply}
            </button>
          }
        >
          <p class="hint">{S.mapping.samples(editing.samples.join('、') || '（沒有資料）')}</p>
          <div role="radiogroup" aria-label={S.mapping.pickTitle(editing.label)} class="opt-list">
            {rolesFor(s.kind).map((r) => {
              const cur = s.cols.find((c) => c.index === editing.index)?.role === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={cur}
                  class={`opt${cur ? ' on' : ''}`}
                  onClick={() => setCols((cols) => withRole(cols, editing.index, r))}
                >
                  <span class="radio" aria-hidden="true" />
                  <span class="mo-main">
                    {S.mapping.roles[r]}
                    {S.mapping.roleNotes[r] && <span class="rb-note">{S.mapping.roleNotes[r]}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {s.cols.find((c) => c.index === editing.index)?.role === 'preference' && (
            <div class="field">
              <span class="label" id="rank-l">
                {S.mapping.rankPick}
              </span>
              <div class="chips" role="radiogroup" aria-labelledby="rank-l">
                {Array.from({ length: Math.max(3, prefs.length) }, (_, i) => i + 1).map((n) => {
                  const mine = s.cols.find((c) => c.index === editing.index)?.rank === n;
                  const other = prefs.some((p) => p.rank === n && p.index !== editing.index);
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={mine}
                      disabled={other}
                      class={`chip${mine ? ' on' : ''}`}
                      onClick={() => setCols((cols) => withRank(cols, editing.index, n))}
                    >
                      {other ? `${n}${S.mapping.rankUsed}` : n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Sheet>
      )}
      {adding && (
        <Sheet
          title={S.mapping.addPrefTitle}
          onClose={() => setAdding(false)}
          footer={
            <button class="btn secondary grow" type="button" onClick={() => setAdding(false)}>
              {S.cancel}
            </button>
          }
        >
          <ul class="plain-ul">
            {s.cols
              .filter((c) => c.role !== 'preference')
              .map((c) => (
                <li key={c.index}>
                  <button
                    type="button"
                    class="rowbtn"
                    onClick={() => {
                      setCols((cols) => withRole(cols, c.index, 'preference'));
                      setAdding(false);
                    }}
                  >
                    <span class="rb-main">
                      <strong>{c.label}</strong>
                      <span class="rb-note">{c.samples.slice(0, 3).join('、') || '（沒有資料）'}</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
}
