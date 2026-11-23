import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { commentState, flaggedWords, setComment, setKeywords, setRewrite, type Review } from '../../app/review';
import { updateReview, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { extra } from '../strings-extra';

export interface CommentItem {
  key: string;
  text: string;
  /** 命中的留言主題名稱（稿 5f），有就在卡片上標出。 */
  tags?: string[];
}

/** 把符合搜尋字的片段標出來（稿 5f）；不使用 AI，只比對字串。 */
function Marked({ text, mark }: { text: string; mark?: RegExp }) {
  if (!mark) return <>{text}</>;
  const parts = text.split(new RegExp(`(${mark.source})`, 'gi'));
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : p))}
    </>
  );
}

function CommentRow({ item, review, mark }: { item: CommentItem; review: Review; mark?: RegExp }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const st = commentState(review, item.key);
  const words = flaggedWords(item.text, review.keywords);
  const shown = st === 'rewrite' ? (review.rewrites[item.key] as string) : item.text;
  const R = S.review;
  return (
    <li class={`cm cm-${st}`} data-testid="comment">
      <div class="cm-head">
        <span class={`tag ${st === 'adopt' || st === 'rewrite' ? 'ok' : st === 'hide' ? '' : 'warn'}`}>{R.state[st]}</span>
        {item.tags?.map((n) => (
          <span key={n} class="tag accent">
            {n}
          </span>
        ))}
        {words.length > 0 && <span class="tag warn">{R.flagWord(words)}</span>}
      </div>
      {editing ? (
        <>
          <textarea class="input area" rows={3} value={draft} aria-label={R.rewrite} onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)} />
          <div class="btn-row">
            <button
              class="btn primary small"
              type="button"
              onClick={() => {
                updateReview((r) => setRewrite(r, item.key, draft));
                setEditing(false);
              }}
            >
              {R.save}
            </button>
            <button class="btn secondary small" type="button" onClick={() => setEditing(false)}>
              {R.cancel}
            </button>
          </div>
        </>
      ) : (
        <>
          <p class={st === 'hide' ? 'cm-text hidden' : 'cm-text'}>
            <Marked text={shown} mark={mark} />
          </p>
          {st === 'rewrite' && <p class="hint">{extra().review.original}{item.text}</p>}
          <div class="btn-row">
            <button class="btn small" type="button" disabled={st === 'adopt'} onClick={() => updateReview((r) => setComment(r, item.key, 'adopt'))}>
              {R.adopt}
            </button>
            <button class="btn secondary small" type="button" disabled={st === 'hide'} onClick={() => updateReview((r) => setComment(r, item.key, 'hide'))}>
              {R.hide}
            </button>
            <button
              class="btn secondary small"
              type="button"
              onClick={() => {
                setDraft(shown);
                setEditing(true);
              }}
            >
              {R.rewrite}
            </button>
            {st !== 'pending' && (
              <button class="btn ghost small" type="button" onClick={() => updateReview((r) => setComment(r, item.key, 'pending'))}>
                {R.undo}
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

export function CommentList({ items, mark }: { items: CommentItem[]; mark?: RegExp }) {
  const review = useApp().review;
  if (!review) return null;
  if (items.length === 0) return <p class="hint">{S.review.noComments}</p>;
  return (
    <ul class="cm-list">
      {items.map((it) => (
        <CommentRow key={`${it.key}|${it.text}`} item={it} review={review} mark={mark} />
      ))}
    </ul>
  );
}

/** 提醒用詞：可增減，存在審稿進度裡。 */
export function Keywords() {
  const st = useApp();
  const review = st.review;
  const [draft, setDraft] = useState('');
  if (!review) return null;
  const R = S.review;
  const add = () => {
    if (draft.trim() === '') return;
    updateReview((r) => setKeywords(r, [...r.keywords, draft]));
    setDraft('');
  };
  return (
    <section class="card">
      <h3>{R.keywordsTitle}</h3>
      <p class="hint">{R.keywordsHelp}</p>
      <ul class="chips">
        {review.keywords.map((k) => (
          <li key={k} class="chip kw">
            {k}
            <button class="chip-x" type="button" aria-label={R.removeKeyword(k)} onClick={() => updateReview((r) => setKeywords(r, r.keywords.filter((x) => x !== k)))}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <div class="btn-row">
        <input
          class="input"
          type="text"
          value={draft}
          placeholder={R.keywordPlaceholder}
          aria-label={R.addKeyword}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button class="btn secondary" type="button" onClick={add}>
          {R.addKeyword}
        </button>
      </div>
    </section>
  );
}

/** 審稿進度存放狀態：已存進資料夾才說；沒存好的警示在頁頂橫幅（SaveBanners，G1）。 */
export function SaveNote() {
  const st = useApp();
  if (!st.review || st.reviewUnsaved || st.folder.state !== 'ready') return null;
  return <p class="hint">{S.review.savedFolder}</p>;
}

/**
 * 去識別化預覽內每則留言的「留著／隱藏這則／改寫」：與審稿頁同一組邏輯（setComment／setRewrite）。
 * `children` 是留言本文（可含名單外人名標示）；`text` 是預覽上顯示的文字，改寫從它開始。
 */
export function PreviewActions(props: { itemKey: string; text: string; hidden: boolean; onHide: () => void; children: ComponentChildren }) {
  const review = useApp().review;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.text);
  const R = S.review;
  if (!review) return <>{props.children}</>;
  const st = commentState(review, props.itemKey);
  return (
    <>
      {props.children}
      {editing ? (
        <div class="pv-edit">
          <textarea class="input area" rows={3} value={draft} aria-label={R.rewrite} data-testid="pv-draft" onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)} />
          <div class="btn-row">
            <button
              class="btn primary small"
              type="button"
              data-testid="pv-save"
              onClick={() => {
                updateReview((r) => setRewrite(r, props.itemKey, draft));
                setEditing(false);
              }}
            >
              {R.save}
            </button>
            <button class="btn secondary small" type="button" onClick={() => setEditing(false)}>
              {R.cancel}
            </button>
          </div>
        </div>
      ) : props.hidden ? (
        <div class="btn-row">
          <span class="tag">{R.state.hide}</span>
          <button class="btn ghost small" type="button" data-testid="pv-restore" onClick={() => updateReview((r) => setComment(r, props.itemKey, 'adopt'))}>
            {R.restore}
          </button>
        </div>
      ) : (
        <div class="btn-row">
          <button class="btn secondary small" type="button" data-testid="pv-keep" disabled={st === 'adopt' || st === 'rewrite'} aria-pressed={st === 'adopt' || st === 'rewrite'}>
            {R.keep}
          </button>
          <button
            class="btn secondary small"
            type="button"
            data-testid="pv-hide"
            onClick={() => {
              updateReview((r) => setComment(r, props.itemKey, 'hide'));
              props.onHide();
            }}
          >
            {R.hideThis}
          </button>
          <button
            class="btn secondary small"
            type="button"
            data-testid="pv-rewrite"
            onClick={() => {
              setDraft(props.text);
              setEditing(true);
            }}
          >
            {R.rewrite}
          </button>
        </div>
      )}
    </>
  );
}
