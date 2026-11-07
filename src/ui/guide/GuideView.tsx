import { useState } from 'preact/hooks';
import { TEMPLATE_FORM_URL } from '../../app/guide-config';
import { QUICK_TEMPLATES, questionsAsText } from '../../app/quick-templates';
import { localizeTemplate, questionHintL, questionsAsTextL } from '../../app/quick-templates.en';
import { currentLang } from '../locale';
import { go, openDemoTable, set, useApp } from '../../app/store';
import { strings as S } from '../strings';
import { AccountChooser, Icon, Notice } from '../parts/parts';

/** 教學頁（route=guide）與快速範本（route=templates）：同一個動態載入的 chunk。 */
export default function GuideView() {
  const route = useApp().route;
  return route === 'templates' ? <Templates /> : <Guide />;
}

function Guide() {
  const G = S.guide;
  const [loading, setLoading] = useState(false);
  const loadDemo = async () => {
    setLoading(true);
    try {
      const { buildSampleDataset } = await import('../../core/sample-dataset');
      const d = buildSampleDataset({ students: 41, seed: 'demo' });
      openDemoTable(
        d.responseTable,
        d.roster.map((s) => ({ class: s.class, seat: String(s.seat), name: s.name })),
      );
    } catch {
      set({ toast: G.demoFail });
    } finally {
      setLoading(false);
    }
  };
  return (
    <main class="page guide" id="main">
      <button class="btn ghost small" type="button" onClick={() => go('home')}>
        <Icon name="back" />
        {G.back}
      </button>
      <h1>{G.title}</h1>
      <p class="lead">{G.lead}</p>
      <nav class="guide-nav" aria-label={G.title}>
        {G.nav.map((n, i) => (
          <a key={n} class="btn secondary small" href={`#g${i + 1}`}>
            {n}
          </a>
        ))}
      </nav>

      <section class="card" id="g1" aria-labelledby="g1h">
        <h2 id="g1h">{G.exportTitle}</h2>
        <ol>
          {G.exportSteps.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <p>{G.exportAlt}</p>
        <p class="hint">{G.exportPublish}</p>
        <p class="hint">{G.exportChecked}</p>
      </section>

      <section class="card" id="g2" aria-labelledby="g2h">
        <h2 id="g2h">{G.accountTitle}</h2>
        <p>{G.accountLead}</p>
        <ol class="tips">
          {G.accountItems.map(([h, b]) => (
            <li key={h}>
              <strong>{h}</strong>
              <span>{b}</span>
            </li>
          ))}
        </ol>
        <AccountChooser />
        <p class="hint">
          <strong>{S.google.noLoginTitle}</strong> {G.accountAlt}
        </p>
      </section>

      <section class="card" id="g3" aria-labelledby="g3h">
        <h2 id="g3h">{G.tipsTitle}</h2>
        <ol class="tips">
          {G.tips.map((t, i) => (
            <li key={t.h}>
              <span class="num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <strong>{t.h}</strong>
                <p>{t.p}</p>
              </div>
            </li>
          ))}
        </ol>
        <h3>{G.typesTitle}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                {G.typesHead.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {G.types.map((r) => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td>{r[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="hint">{G.typesNote}</p>
      </section>

      <section class="card" id="g4" aria-labelledby="g4h">
        <h2 id="g4h">{G.templateTitle}</h2>
        <p>{G.templateBody}</p>
        {TEMPLATE_FORM_URL ? (
          <a class="btn primary" href={TEMPLATE_FORM_URL} target="_blank" rel="noopener noreferrer">
            {G.templateOpen}
          </a>
        ) : (
          <Notice kind="info">{G.templateSoon}</Notice>
        )}
        <div class="btn-row">
          <button class="btn secondary" type="button" onClick={() => go('templates')}>
            {G.templateToQuick}
          </button>
        </div>
      </section>

      <section class="card" id="g5" aria-labelledby="g5h">
        <h2 id="g5h">{G.demoTitle}</h2>
        <p>{G.demoBody}</p>
        <div class="btn-row">
          <button class="btn primary" type="button" disabled={loading} onClick={() => void loadDemo()}>
            {G.demoLoad}
          </button>
        </div>
      </section>
    </main>
  );
}

function Templates() {
  const T = S.tpl;
  const [sel, setSel] = useState(QUICK_TEMPLATES[0]?.id ?? '');
  const [copyMsg, setCopyMsg] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const lang = currentLang();
  const tplList = QUICK_TEMPLATES.map((t) => localizeTemplate(t, lang));
  const tpl = tplList.find((t) => t.id === sel) ?? tplList[0];
  if (!tpl) return null;
  const text = lang === 'en' ? questionsAsTextL(tpl, 'en') : questionsAsText(tpl);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg({ kind: 'ok', text: T.copied });
    } catch {
      setCopyMsg({ kind: 'warn', text: T.copyFail });
    }
  };

  return (
    <main class="page guide" id="main">
      <button class="btn ghost small" type="button" onClick={() => go('home')}>
        <Icon name="back" />
        {T.back}
      </button>
      <h1>{T.title}</h1>
      <p class="lead">{T.lead}</p>
      <div class="tpl-split">
        <div class="tpl-grid" role="radiogroup" aria-label={T.pickLabel}>
          {tplList.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === tpl.id}
              class="tpl-card"
              onClick={() => {
                setSel(t.id);
                setCopyMsg(null);
              }}
            >
              <strong>{t.name}</strong>
              <span>{t.purpose}</span>
              <span class="meta">
                <span class="tag">{T.kindNames[t.kind]}</span> <span class="tag">{T.count(t.questions.length)}</span>{' '}
                <span class="tag">{t.named ? T.named : T.anonymous}</span> <span class="tag">{T.audience(t.audience)}</span>
              </span>
            </button>
          ))}
        </div>

        <section class="card" aria-labelledby="tq">
          <h2 id="tq">
            {T.questionsTitle}・{tpl.name}
          </h2>
          <p class="hint">{T.scaleLabel(tpl.scaleLabels)}</p>
          <ol class="tpl-q">
            {tpl.questions.map((q) => (
              <li key={q.text}>
                {q.text}
                <span class="hint"> — {questionHintL(q, tpl.scale, lang)}</span> <span class="todo-check">（{T.todoCheck}）</span>
              </li>
            ))}
          </ol>
          <p class="hint">{T.typeNote}</p>
          <h3>{T.defaultsTitle}</h3>
          <p>{tpl.defaults}</p>
          {tpl.note && <Notice kind="warn">{tpl.note}</Notice>}
          <p class="hint">{T.autoNote}</p>
          <div class="btn-row">
            <button class="btn primary" type="button" onClick={() => void copy()}>
              {T.copy}
            </button>
            <button class="btn secondary" type="button" onClick={() => go('guide')}>
              {T.guide}
            </button>
          </div>
          {copyMsg && <Notice kind={copyMsg.kind}>{copyMsg.text}</Notice>}
          <textarea class="input area" rows={Math.min(14, tpl.questions.length * 2 + 2)} readOnly value={text} aria-label={T.copy} />
        </section>
      </div>
    </main>
  );
}
