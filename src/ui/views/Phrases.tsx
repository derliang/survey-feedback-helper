import { useRef, useState } from 'preact/hooks';
import { addCategory, addPhrase, fillName, insertAt, movePhrase, phraseLibrary, removePhrase, searchPhrases, toTemplate, updatePhrase } from '../../app/phrases';
import { savePhrases, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { Notice } from '../parts/parts';
import { extra } from '../strings-extra';

/** 老師評語欄 + 常用評語籌碼（R-021、R-022）：點籌碼插在游標處，{姓名} 換成這位同學。 */
export function TeacherComment(props: { value: string; onChange: (v: string) => void; studentName: string; allNames: string[] }) {
  const st = useApp();
  const P = S.review.phrases;
  const lib = phraseLibrary(st.data.phrases);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [catId, setCatId] = useState<string>(lib[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [manage, setManage] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const [newCat, setNewCat] = useState('');
  const cat = lib.find((c) => c.id === catId) ?? lib[0];
  const hits = searchPhrases(lib, q);

  const insert = (text: string) => {
    const ta = taRef.current;
    const snippet = fillName(text, props.studentName);
    const r = insertAt(props.value, ta?.selectionStart ?? props.value.length, ta?.selectionEnd ?? props.value.length, snippet);
    props.onChange(r.text);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(r.cursor, r.cursor);
    });
  };

  const startSave = () => {
    const ta = taRef.current;
    const sel = ta && ta.selectionEnd > ta.selectionStart ? props.value.slice(ta.selectionStart, ta.selectionEnd) : props.value;
    setSaving(toTemplate(sel, props.allNames));
    setMsg(null);
  };

  const confirmSave = () => {
    const r = addPhrase(lib, 'mine', saving ?? '');
    if (r.ok) {
      void savePhrases(r.lib);
      setSaving(null);
      setMsg({ kind: 'ok', text: P.added });
    } else {
      setMsg({ kind: 'warn', text: r.reason === 'duplicate' ? P.duplicate : r.reason === 'full' ? P.full : P.empty });
    }
  };

  const chips = (items: { categoryId: string; index: number; title: string; text: string }[]) => (
    <ul class="chips phrase-chips">
      {items.map((p) => (
        <li key={`${p.categoryId}-${p.index}`}>
          <button class="chip phrase" type="button" title={fillName(p.text, props.studentName)} aria-label={P.insert(p.title)} onClick={() => insert(p.text)}>
            {p.title}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <textarea
        ref={taRef}
        class="input area"
        rows={4}
        aria-label={S.review.teacherTitle}
        value={props.value}
        onInput={(e) => props.onChange((e.target as HTMLTextAreaElement).value)}
      />
      <div class="btn-row">
        <button class="btn ghost small" type="button" onClick={startSave}>
          {P.saveMine}
        </button>
      </div>
      {saving !== null && (
        <div class="phrase-save">
          <p class="hint">{P.saveHint}</p>
          <textarea class="input area" rows={2} aria-label={P.saveMine} value={saving} onInput={(e) => setSaving((e.target as HTMLTextAreaElement).value)} />
          <div class="btn-row">
            <button class="btn primary small" type="button" onClick={confirmSave}>
              {P.saveConfirm}
            </button>
            <button class="btn secondary small" type="button" onClick={() => setSaving(null)}>
              {S.cancel}
            </button>
          </div>
        </div>
      )}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <h4 class="phrase-h">{P.title}</h4>
      <p class="hint">{P.help}</p>
      <input class="input" type="search" value={q} placeholder={P.searchPlaceholder} aria-label={P.searchLabel} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      {q.trim() !== '' ? (
        hits.length > 0 ? (
          chips(hits.map((h) => ({ categoryId: h.categoryId, index: h.index, title: h.phrase.title, text: h.phrase.text })))
        ) : (
          <p class="hint">{P.noHit}</p>
        )
      ) : (
        <>
          <div class="seg phrase-tabs" role="tablist" aria-label={P.title}>
            {lib.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={cat?.id === c.id} class={cat?.id === c.id ? 'on' : ''} onClick={() => setCatId(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
          {cat && !manage && chips(cat.phrases.map((p, index) => ({ categoryId: cat.id, index, title: p.title, text: p.text })))}
          {cat && manage && (
            <ul class="phrase-edit">
              {cat.phrases.map((p, i) => (
                <li key={`${cat.id}-${i}`}>
                  <input class="input" type="text" value={p.title} aria-label={extra().phrases.shortTitle} onInput={(e) => void savePhrases(updatePhrase(lib, cat.id, i, { title: (e.target as HTMLInputElement).value }))} />
                  <textarea class="input area" rows={2} value={p.text} aria-label={P.edit} onInput={(e) => void savePhrases(updatePhrase(lib, cat.id, i, { text: (e.target as HTMLTextAreaElement).value }))} />
                  <div class="btn-row">
                    <button class="btn ghost small" type="button" disabled={i === 0} onClick={() => void savePhrases(movePhrase(lib, cat.id, i, -1))}>
                      {P.up}
                    </button>
                    <button class="btn ghost small" type="button" disabled={i === cat.phrases.length - 1} onClick={() => void savePhrases(movePhrase(lib, cat.id, i, 1))}>
                      {P.down}
                    </button>
                    <button class="btn ghost small" type="button" onClick={() => void savePhrases(removePhrase(lib, cat.id, i))}>
                      {P.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div class="btn-row">
        <button class="btn secondary small" type="button" aria-pressed={manage} onClick={() => setManage(!manage)}>
          {manage ? P.manageDone : P.manage}
        </button>
      </div>
      {manage && (
        <>
          <div class="btn-row">
            <input class="input" type="text" value={newCat} placeholder={P.categoryPlaceholder} aria-label={P.addCategory} onInput={(e) => setNewCat((e.target as HTMLInputElement).value)} />
            <button
              class="btn secondary small"
              type="button"
              onClick={() => {
                void savePhrases(addCategory(lib, newCat));
                setNewCat('');
              }}
            >
              {P.addCategory}
            </button>
          </div>
          <p class="hint">{P.resetNote}</p>
        </>
      )}
    </>
  );
}
