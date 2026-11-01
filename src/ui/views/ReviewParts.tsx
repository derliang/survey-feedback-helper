import { useState } from 'preact/hooks';
import { commentState, flaggedWords, setComment, setKeywords, setRewrite, type Review } from '../../app/review';
import { isTouchDevice } from '../../storage';
import { downloadReview, updateReview, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { Notice } from '../parts/parts';

export interface CommentItem {
  key: string;
  text: string;
}

function CommentRow({ item, review }: { item: CommentItem; review: Review }) {
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
          <p class={st === 'hide' ? 'cm-text hidden' : 'cm-text'}>{shown}</p>
          {st === 'rewrite' && <p class="hint">原文：{item.text}</p>}
          <div class="btn-row">
            <button class="btn secondary small" type="button" disabled={st === 'adopt'} onClick={() => updateReview((r) => setComment(r, item.key, 'adopt'))}>
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

export function CommentList({ items }: { items: CommentItem[] }) {
  const review = useApp().review;
  if (!review) return null;
  if (items.length === 0) return <p class="hint">{S.review.noComments}</p>;
  return (
    <ul class="cm-list">
      {items.map((it) => (
        <CommentRow key={`${it.key}|${it.text}`} item={it} review={review} />
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

export function SaveNote() {
  const st = useApp();
  if (!st.review) return null;
  return st.reviewUnsaved ? (
    <Notice
      kind="warn"
      actions={
        <button class="btn secondary small" type="button" onClick={() => void downloadReview()}>
          {isTouchDevice() ? S.folder.saveToFiles : S.review.downloadReview}
        </button>
      }
    >
      {S.review.unsaved}
    </Notice>
  ) : (
    <p class="hint">{S.review.savedFolder}</p>
  );
}
