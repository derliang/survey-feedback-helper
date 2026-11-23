import { useState } from 'preact/hooks';
import { personRefs } from '../../app/columns';
import { rosterComparison, rosterStudents } from '../../app/progress';
import { go, set, setSession, useApp } from '../../app/store';
import { type PersonMatch, type Student, cellText } from '../../core';
import { strings as S } from '../strings';
import { ActBar, Notice, Sheet } from '../parts/parts';
import { extra } from '../strings-extra';

type Tab = 'missing' | 'confirm' | 'duplicate';

const label = (st: Student) => extra().compare.label(st.class, st.seat, st.name);

export function CompareView() {
  const app = useApp();
  const s = app.session;
  const [tab, setTab] = useState<Tab>('missing');
  const [askAll, setAskAll] = useState(false);
  if (!s) return null;
  const students = rosterStudents(s);
  const c = rosterComparison(s);
  if (!c || students.length === 0) {
    return (
      <div class="view">
        <h2>{S.compare.title}</h2>
        <Notice kind="info">{S.compare.noRoster}</Notice>
        <ActBar fixed>
          <button class="btn primary grow" type="button" onClick={() => go('prepare', 'roster')}>
            {S.compare.goRoster}
          </button>
        </ActBar>
      </div>
    );
  }

  const refs = personRefs(s.table, s.cols, 'respondent');
  const nameOf = (id: number | string) => cellText(refs[id as number]?.name) || extra().compare.noName;
  const confirmItems = [...c.unknown, ...c.seatMismatches, ...c.ambiguous.map((id) => ({ id, match: { status: 'ambiguous', student: null, suggestion: null } as PersonMatch }))];
  const accepted = Object.entries(s.resolutions).filter(([, v]) => v === 'accept').map(([k]) => Number(k));
  const filled = students.length - c.missing.length;
  const tiles: [string, number, Tab | null][] = [
    [S.compare.filled, filled, null],
    [S.compare.missing, c.missing.length, 'missing'],
    [S.compare.toConfirm, confirmItems.length, 'confirm'],
    [S.compare.duplicate, c.duplicates.length, 'duplicate'],
  ];

  const resolve = (id: number, how: 'accept' | 'exclude') =>
    setSession((cur) => ({
      resolutions: { ...cur.resolutions, [id]: how },
      excluded: how === 'exclude' ? [...cur.excluded, id] : cur.excluded,
    }));
  // 一次確認所有「姓名對得上、只有座號不同」的項目（Issue #227）；名單找不到人或同名分不出的不動
  const batchIds = c.seatMismatches.map((x) => Number(x.id)).filter((id) => s.resolutions[id] === undefined);
  const acceptAll = () =>
    setSession((cur) => ({ resolutions: { ...cur.resolutions, ...Object.fromEntries(batchIds.map((id) => [id, 'accept' as const])) } }));
  const undoAll = () =>
    setSession((cur) => ({ resolutions: Object.fromEntries(Object.entries(cur.resolutions).filter(([, v]) => v !== 'accept')) as typeof cur.resolutions }));
  const undo = (id: number) =>
    setSession((cur) => {
      const rest = { ...cur.resolutions };
      delete rest[id];
      return { resolutions: rest, excluded: cur.excluded.filter((x) => x !== id) };
    });

  const copyMissing = async () => {
    const text = c.missing.map((m) => `${m.class}\t${m.seat}\t${m.name}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      set({ toast: S.compare.copied });
    } catch {
      set({ toast: extra().compare.copyFail });
    }
  };

  return (
    <div class="view">
      <h2>{S.compare.title}</h2>
      <div class="tiles" data-testid="compare-tiles">
        {tiles.map(([name, n, t]) => (
          <button key={name} type="button" class={`tile${t && n > 0 && t !== 'missing' ? ' warn' : ''}${t === tab ? ' on' : ''}`} disabled={t === null} onClick={() => t && setTab(t)}>
            <span class="tile-l">{name}</span>
            {t === 'confirm' && n > 0 && <span class="tile-note">{S.compare.toConfirmNote}</span>}
            <span class="tile-n">{n}</span>
          </button>
        ))}
      </div>

      <div class="seg" role="tablist" aria-label={S.compare.title}>
        {(['missing', 'confirm', 'duplicate'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} class={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {S.compare.tabs[t]}
            {t === 'confirm' && confirmItems.length > 0 ? ` ${confirmItems.length}` : t === 'missing' ? ` ${c.missing.length}` : t === 'duplicate' ? ` ${c.duplicates.length}` : ''}
          </button>
        ))}
      </div>

      {tab === 'missing' && (
        <section>
          <h3 class="sub-h">{S.compare.missingList(c.missing.length)}</h3>
          {c.missing.length === 0 ? (
            <p class="empty">{S.compare.none}</p>
          ) : (
            <>
              <ul class="plain-list">
                {c.missing.map((m) => (
                  <li key={`${m.class}|${m.seat}`}>{label(m)}</li>
                ))}
              </ul>
              <button class="btn secondary" type="button" onClick={() => void copyMissing()}>
                {S.compare.copy}
              </button>
              <p class="hint">{S.compare.copyHint}</p>
            </>
          )}
        </section>
      )}

      {tab === 'confirm' && (
        <section>
          {confirmItems.length === 0 && accepted.length === 0 && <p class="empty">{S.compare.none}</p>}
          {batchIds.length > 1 && (
            <button class="btn primary" type="button" data-testid="accept-all" onClick={() => setAskAll(true)}>
              {S.compare.sameAll(batchIds.length)}
            </button>
          )}
          {accepted.length > 1 && (
            <button class="btn ghost" type="button" data-testid="undo-all" onClick={undoAll}>
              {S.compare.undoAll}
            </button>
          )}
          <ul class="issue-list">
            {confirmItems.map(({ id, match }) => (
              <li key={id} class="issue">
                <div>
                  <span class="hint">{S.compare.answered}</span>
                  <strong class="big-name">{nameOf(id)}</strong>
                  {match.status === 'seatMismatch' && match.student && <p>{S.compare.seatDiffers(match.student.seat)}</p>}
                  {match.status === 'ambiguous' && <p>{S.compare.ambiguous}</p>}
                  {match.status === 'unknownName' && match.suggestion && (
                    <p>
                      {S.compare.nearest}
                      <strong>{label(match.suggestion)}</strong>
                    </p>
                  )}
                  {match.status === 'unknownName' && !match.suggestion && <p>{S.compare.notInRoster}</p>}
                </div>
                <div class="btn-row">
                  {(match.suggestion || match.student) && (
                    <button class="btn primary small" type="button" onClick={() => resolve(id as number, 'accept')}>
                      {S.compare.same}
                    </button>
                  )}
                  <button class="btn secondary small" type="button" onClick={() => resolve(id as number, 'exclude')}>
                    {S.compare.exclude}
                  </button>
                </div>
              </li>
            ))}
            {Object.entries(s.resolutions).map(([id, how]) => (
              <li key={`r${id}`} class="issue done">
                <span>
                  {nameOf(Number(id))} · <span class="tag ok">{S.compare.resolved}</span> {how === 'exclude' ? S.compare.exclude : S.compare.same}
                </span>
                <button class="btn ghost small" type="button" onClick={() => undo(Number(id))}>
                  {S.compare.undo}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'duplicate' && (
        <section>
          {c.duplicates.length === 0 ? (
            <p class="empty">{S.compare.none}</p>
          ) : (
            <ul class="issue-list">
              {c.duplicates.map((d) => (
                <li key={`${d.student.class}|${d.student.seat}`} class="issue">
                  <strong>
                    {label(d.student)} · {S.compare.dupLine(d.ids.length)}
                  </strong>
                  <span class="hint">{extra().check.rows(d.ids.map((i) => Number(i) + 2).join(extra().check.sep))}</span>
                </li>
              ))}
            </ul>
          )}
          <p class="hint">{extra().compare.keepWhich}</p>
        </section>
      )}

      {askAll && (
        <Sheet
          confirm
          title={S.compare.sameAllTitle}
          onClose={() => setAskAll(false)}
          footer={
            <>
              <button class="btn secondary grow" type="button" onClick={() => setAskAll(false)}>
                {S.compare.sameAllNo}
              </button>
              <button
                class="btn primary grow"
                type="button"
                data-testid="accept-all-yes"
                onClick={() => {
                  acceptAll();
                  setAskAll(false);
                  set({ toast: S.compare.sameAllDone(batchIds.length) });
                }}
              >
                {S.compare.sameAllYes}
              </button>
            </>
          }
        >
          <p>{S.compare.sameAllBody(batchIds.length)}</p>
        </Sheet>
      )}

      <ActBar fixed>
        <button class="btn secondary" type="button" onClick={() => go('prepare', 'roster')}>
          {S.back}
        </button>
        <button class="btn primary grow" type="button" onClick={() => go('prepare', 'check')}>
          {S.compare.done}
        </button>
      </ActBar>
    </div>
  );
}
