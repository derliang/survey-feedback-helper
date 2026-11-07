import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
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

/**
 * 教學字串的標記：**…** ＝ Google 畫面上的按鈕或選單名稱（粗體）；{{甲>乙>丙}} ＝ 選單路徑（每層一個小標）；
 * [[v]] ＝ 「待核對」標籤（文字取自 verifyTag）。字串集中在 strings，標記只在這裡解析。
 */
function rich(text: string, verifyTag: string): ComponentChildren {
  return text.split(/(\*\*[^*]+\*\*|\{\{[^}]+\}\}|\[\[v\]\])/g).map((part, i) => {
    if (part.startsWith('**')) {
      return (
        <b class="u" key={i}>
          {part.slice(2, -2)}
        </b>
      );
    }
    if (part.startsWith('{{')) {
      const items = part.slice(2, -2).split('>');
      return (
        <span class="mp" key={i}>
          {items.map((m, j) => (
            <span key={j} class="mp-part">
              {j > 0 && (
                <span class="mps" aria-hidden="true">
                  ›
                </span>
              )}
              <span class="mpi">{m}</span>
            </span>
          ))}
        </span>
      );
    }
    if (part === '[[v]]') {
      return (
        <span class="tag warn" key={i}>
          {verifyTag}
        </span>
      );
    }
    return part;
  });
}

const SECTION_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

/**
 * 捲動時跟著更新「目前所在項目」（aria-current）；不做捲動動畫。
 * 桌機兩個做法並排，兩張都在畫面內：點了哪一項，就停在那一項，直到它離開畫面才回到「最上面看得到的那一項」。
 */
function useActiveSection(): [string, (id: string) => void] {
  const [active, setActive] = useState(SECTION_IDS[0]!);
  const picked = useRef<string | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        if (picked.current && visible.has(picked.current)) return setActive(picked.current);
        picked.current = null;
        const first = SECTION_IDS.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return [
    active,
    (id) => {
      picked.current = id;
      setActive(id);
    },
  ];
}

function NavLinks(props: { active: string; onPick: (id: string) => void }) {
  return (
    <>
      {S.guide.nav.map((n, i) => {
        const id = SECTION_IDS[i]!;
        return (
          <a key={id} class="nvr" href={`#${id}`} aria-current={props.active === id ? 'location' : undefined} onClick={() => props.onPick(id)}>
            {n}
          </a>
        );
      })}
    </>
  );
}

function Guide() {
  const G = S.guide;
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useActiveSection();
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
  const r = (t: string) => rich(t, G.verifyTag);
  const steps = (list: string[]) => (
    <ol class="steps">
      {list.map((t, i) => (
        <li key={t}>
          <span class="num" aria-hidden="true">
            {i + 1}
          </span>
          <div>{r(t)}</div>
        </li>
      ))}
    </ol>
  );
  return (
    <main class="page guide" id="main">
      <button class="btn ghost small" type="button" onClick={() => go('home')}>
        <Icon name="back" />
        {G.back}
      </button>
      <h1>{G.title}</h1>
      <p class="lead">{G.lead}</p>
      {/* 同一份連結資料、兩個外觀：手機是折疊目錄，平板以上是左欄；CSS 切換，被隱藏的那份不進無障礙樹 */}
      <details class="toc">
        <summary class="btn secondary toc-s">
          <Icon name="list" />
          <span>{G.tocLabel}</span>
          <Icon name="chevron" />
        </summary>
        <nav class="toc-n" aria-label={G.tocLabel}>
          <NavLinks active={active} onPick={setActive} />
        </nav>
      </details>

      <div class="gwrap">
        <aside class="grail">
          <nav class="grail-n" aria-label={G.title}>
            <NavLinks active={active} onPick={setActive} />
          </nav>
        </aside>

        <div class="gmain">
          <section class="card" id="g1" aria-labelledby="g1h">
            <h2 id="g1h">{G.prepTitle}</h2>
            <p>{G.prepLead}</p>
            {steps(G.prepSteps)}
            <p class="hint">{G.prepChecked}</p>
          </section>

          <p class="gpick">{G.pick}</p>
          <div class="methods">
            <section class="card" id="g2" aria-labelledby="g2h">
              <div class="mh">
                <span class="tag accent">{G.methodTags[0]}</span>
              </div>
              <h2 id="g2h">{G.m1Title}</h2>
              <p class="who">
                <b>{G.whoLabel}</b>
                {G.m1Who}
              </p>
              {steps(G.m1Steps)}
              <p>{r(G.m1Later)}</p>
              <p class="hint">{G.m1Scope}</p>
              <details class="fold">
                <summary>
                  <span class="fs">
                    <b>{G.troubleTitle}</b>
                    <span class="hint">{G.troubleSub}</span>
                  </span>
                  <Icon name="chevron" />
                </summary>
                <div class="fb">
                  <ol class="cases">
                    {G.troubleCases.map(([h, b]) => (
                      <li key={h}>
                        <strong>{h}</strong>
                        <span>{r(b ?? '')}</span>
                      </li>
                    ))}
                  </ol>
                  <AccountChooser />
                  <Notice
                    kind="info"
                    actions={
                      <a class="btn secondary small" href="#g3" onClick={() => setActive('g3')}>
                        {G.troubleSwitch}
                      </a>
                    }
                  >
                    {G.troubleAlt}
                  </Notice>
                </div>
              </details>
            </section>

            <section class="card" id="g3" aria-labelledby="g3h">
              <div class="mh">
                <span class="tag accent">{G.methodTags[1]}</span>
              </div>
              <h2 id="g3h">{G.m2Title}</h2>
              <p class="who">
                <b>{G.whoLabel}</b>
                {G.m2Who}
              </p>
              {steps(G.m2Steps)}
              <p class="hint">{r(G.m2Csv)}</p>
            </section>
          </div>

          <section class="card" id="g4" aria-labelledby="g4h">
            <h2 id="g4h">{G.tipsTitle}</h2>
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
                  {G.types.map((row) => (
                    <tr key={row[0]}>
                      <td>{row[0]}</td>
                      <td>{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p class="hint">{G.typesNote}</p>
          </section>

          <section class="card" id="g5" aria-labelledby="g5h">
            <h2 id="g5h">{G.templateTitle}</h2>
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

          <section class="card" id="g6" aria-labelledby="g6h">
            <h2 id="g6h">{G.demoTitle}</h2>
            <p>{G.demoBody}</p>
            <div class="btn-row">
              <button class="btn primary" type="button" disabled={loading} onClick={() => void loadDemo()}>
                {G.demoLoad}
              </button>
            </div>
          </section>
        </div>
      </div>
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
                <span class="hint"> — {questionHintL(q, tpl.scale, lang)}</span> {T.todoCheck && <span class="todo-check">（{T.todoCheck}）</span>}
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
