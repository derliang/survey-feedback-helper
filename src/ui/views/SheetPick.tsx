import { cellText } from '../../core';
import { cancelSheetPick, confirmSheet, pickSheet, useApp } from '../../app/store';
import { recommendedSheet } from '../../app/load';
import { strings as S } from '../strings';
import { extra } from '../strings-extra';
import { ActBar, Icon, Notice } from '../parts/parts';

const PREVIEW_ROWS = 6;
const PREVIEW_COLS = 8;

/** 選擇工作表（SUR-01）：檔案裡有 2 張以上有資料的工作表時，先讓老師選；也當作「更換工作表」的頁面。 */
export function SheetPick() {
  const st = useApp();
  const p = st.sheetPick;
  if (!p) return null;
  const sheets = p.pool.sheets;
  const best = recommendedSheet(sheets);
  const change = p.mode === 'change';
  const google = p.sourceLabel === 'Google 試算表';
  const shown = sheets[p.selected];
  const label = (name: string) => (name === '' ? S.sheet.unnamed : name);
  return (
    <main class="page sheet-pick" id="main">
      <p class="filechip">
        <Icon name="folder" />
        <span>
          <strong>{p.fileName}</strong>
          <span class="hint"> · {p.sourceLabel}</span>
        </span>
      </p>
      <div class="sp-head">
        <h1>{google ? S.sheet.leadGoogle(sheets.length) : S.sheet.lead(sheets.length)}</h1>
        <p class="hint">{S.sheet.one}</p>
      </div>
      <div class="sp-grid">
        <div class="sp-list">
          <div class="rcards" role="radiogroup" aria-label={S.sheet.group}>
            {sheets.map((sh, i) => {
              const on = i === p.selected;
              const heads = sh.table.headers.slice(0, 3).filter((h) => h !== '').join(extra().mapping.sep);
              return (
                <button key={i} type="button" role="radio" aria-checked={on} class={`rcard${on ? ' on' : ''}`} data-testid="sheet-card" onClick={() => pickSheet(i)}>
                  <span class="radio" aria-hidden="true" />
                  <span class="rc-main">
                    <strong>
                      {label(sh.name)}
                      {i === best && <span class="tag accent">{S.sheet.suggest}</span>}
                      {change && i === p.pool.index && <span class="tag">{S.sheet.current}</span>}
                    </strong>
                    <span class="rc-sub">{S.sheet.meta(sh.table.rows.length, sh.table.headers.length)}</span>
                    <span class="rc-sub">{S.sheet.heads(heads)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {p.pool.skipped.length > 0 && <Notice kind="info">{S.sheet.skipped(p.pool.skipped.length, p.pool.skipped.map(label).join(extra().mapping.sep))}</Notice>}
          {change && <Notice kind="warn">{S.sheet.changeWarn}</Notice>}
        </div>
        {shown && (
          <section class="sp-preview" aria-label={S.sheet.preview(shown.table.rows.length)}>
            <h2 class="small">{S.sheet.preview(shown.table.rows.length)}</h2>
            <div class="table-wrap" tabIndex={0}>
              <table class="roster-table">
                <thead>
                  <tr>
                    {shown.table.headers.slice(0, PREVIEW_COLS).map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.table.rows.slice(0, PREVIEW_ROWS).map((r, ri) => (
                    <tr key={ri}>
                      {shown.table.headers.slice(0, PREVIEW_COLS).map((_, ci) => (
                        <td key={ci} class="pv-cell">
                          {cellText(r[ci] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p class="hint">{S.sheet.previewNote}</p>
          </section>
        )}
      </div>
      <ActBar>
        <button class="btn secondary" type="button" onClick={cancelSheetPick}>
          {change ? S.cancel : S.back}
        </button>
        <button class="btn primary grow" type="button" onClick={confirmSheet} data-testid="sheet-confirm">
          {change ? S.sheet.changeDo : S.sheet.next}
        </button>
      </ActBar>
    </main>
  );
}
