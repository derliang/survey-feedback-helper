import { useState } from 'preact/hooks';
import { type ColumnInfo, type Role, countToConfirm, detectScale, mappingProblems } from '../../app/columns';
import { go, saveSurvey, setSession, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { ActBar, Icon, Notice, Sheet } from '../parts/parts';

function rolesFor(kind: string): Role[] {
  const base: Role[] = ['timestamp', 'respondentClass', 'respondentSeat', 'respondentName'];
  const target: Role[] = ['targetClass', 'targetSeat', 'targetName'];
  const rest: Role[] = ['bookTitle', 'score', 'choice', 'comment', 'ignore'];
  return [...base, ...(kind === 'feedback' ? target : []), ...rest];
}

export function MappingView() {
  const s = useApp().session;
  const [editing, setEditing] = useState<ColumnInfo | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  if (!s) return null;

  const update = (index: number, patch: Partial<ColumnInfo>) =>
    setSession((cur) => ({ cols: cur.cols.map((c) => (c.index === index ? { ...c, ...patch } : c)) }));
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
          <span class="tag">{S.mapping.roles[c.role ?? 'ignore']}</span>
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
                  onClick={() => update(editing.index, { role: r, confirm: false })}
                >
                  <span class="radio" aria-hidden="true" />
                  {S.mapping.roles[r]}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}
