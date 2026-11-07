import type { ComponentType } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { type TargetResult } from '../../core';
import { feedbackRecords, opinionQuestions, runFeedback, runVote } from '../../app/analysis';
import {
  AUDIENCE_NAMES,
  type Audience,
  classSummaryInput,
  opinionReport,
  opinionSheets,
  personalInputs,
  voteReport,
  voteSheets,
} from '../../app/output';
import { canGoStats } from '../../app/progress';
import { emptyReview, reviewCounts } from '../../app/review';
import { go, loadReview, useApp } from '../../app/store';
import { WORD_FONT_NOTE, loadDocx, loadPdf, loadPrint, loadXlsx, registerAssetCache } from '../../export';
import type { ClassSummaryInput, DocModel, PersonalFeedbackInput } from '../../export';
import { downloadBytes, isTouchDevice } from '../../storage';
import { allPeople, feedbackKey } from '../../app/output';
import { docSignature, overrideTexts, teacherCommentHits } from '../../app/output-check';
import { resolveSettings } from '../../editor/settings';
import { PreviewActions } from './ReviewParts';
import { findPossibleNames, type PossibleName } from '../../core/possible-names';
import { PRINT, pairedBarsSvg } from '../chart-svg';
import { svgToPng } from '../chart-png';
import { strings as S } from '../strings';
import { ActBar, Icon, Notice, Sheet } from '../parts/parts';

type Fmt = 'xlsx' | 'docx' | 'pdf';

/** 輸出用範本與編輯器資料（延遲載入，和編輯器同一包）：回傳把統計資料編成 DocModel 的函式。 */
async function docTools() {
  const [ed, r] = await Promise.all([import('../editor/state'), import('../../app/render')]);
  await ed.load();
  const data = ed.es().data;
  const picks = ed.pickedTemplates();
  const school = resolveSettings({ global: data.settings.global, byKind: data.settings.byKind, run: {} }, 'feedback').school;
  const overrides = ed.currentOverrides();
  return {
    /** plain：不套這位學生的個別版本（預覽用來找出個別版本多出的文字）。 */
    personal: (inp: PersonalFeedbackInput, audience: Audience, plain = false): DocModel => {
      const ov = plain ? undefined : overrides[`${inp.className}-${inp.student.seat}`];
      return r.personalDocFromTemplate(picks.personal, inp, { version: audience, school, images: data.images, ...(ov ? { override: ov } : {}) });
    },
    summary: (inp: ClassSummaryInput): DocModel => r.classDocFromTemplate(picks.summary, inp, { version: 'teacher', school, images: data.images }),
  };
}

const PickerLazy = (() => {
  let C: ComponentType | null = null;
  return function Picker() {
    const [, set] = useState(0);
    useEffect(() => {
      if (!C) void import('../editor/OutputPicker').then((m) => { C = m.default; set((n) => n + 1); });
    }, []);
    return C ? <C /> : <p class="hint">{S.output.templateLoading}</p>;
  };
})();
const MIME: Record<Fmt | 'zip', string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

/** 把提醒的人名用警示底標出。 */
function markParts(text: string, hits: PossibleName[]): preact.ComponentChildren[] {
  const parts: preact.ComponentChildren[] = [];
  let at = 0;
  hits.forEach((h, i) => {
    if (h.start > at) parts.push(text.slice(at, h.start));
    parts.push(
      <mark key={i} class={'pn pn-' + h.level} title={h.level === 'high' ? S.output.possibleNameHigh : S.output.possibleNameLow}>
        {h.text}
      </mark>,
    );
    at = h.end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return parts;
}

/** 老師的話、個別版本的文字：不會自動遮蔽姓名，名單上其他人的姓名與可能的人名都標出。 */
function UnmaskedText({ text, hits }: { text: string; hits: PossibleName[] }) {
  if (hits.length === 0) return <span>{text}</span>;
  return (
    <span>
      {markParts(text, hits)} <span class="tag warn">{S.output.unmaskedNameTag}</span>
    </span>
  );
}

class PreviewStale extends Error {}

/** 逐則預覽的留言：可能含名單外人名的用警示底標出（只是提醒，沒標出不代表沒有）。 */
function FlaggedComment({ text, itemKey, hiddenHere, onHide }: { text: string; itemKey: string; hiddenHere: boolean; onHide: () => void }) {
  const hits: PossibleName[] = useMemo(() => findPossibleNames(text, { includeLow: true }), [text]);
  if (hits.length === 0) {
    return (
      <li class={hiddenHere ? 'cm-text hidden' : undefined} data-testid="preview-comment">
        <PreviewActions itemKey={itemKey} text={text} hidden={hiddenHere} onHide={onHide}>
          <span>{text}</span>
        </PreviewActions>
      </li>
    );
  }
  const parts = markParts(text, hits);
  const high = hits.some((h) => h.level === 'high');
  return (
    <li class={'flagged-comment ' + (high ? 'high' : 'low')} data-testid="flagged-comment">
      <PreviewActions itemKey={itemKey} text={text} hidden={hiddenHere} onHide={onHide}>
        <span>
          {parts} <span class="tag warn">{S.output.possibleNameTag}</span>
        </span>
      </PreviewActions>
    </li>
  );
}

export function OutputView() {
  const st = useApp();
  const s = st.session;
  const ok = s !== null && canGoStats(s);
  const [audience, setAudience] = useState<Audience>('teacher');
  const [who, setWho] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'warn'; text: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  /** 確認過的預覽：fast＝留言與老師的話（決定按鈕能不能按）；docs＝每位學生文件的全部文字（產生檔案前逐份比對）。 */
  const [seen, setSeen] = useState<{ fast: string; docs: Record<string, string> } | null>(null);
  /** 預覽中整理好的實際文件：每位學生的簽章與個別版本多出的文字。 */
  const [prep, setPrep] = useState<{ fast: string; docs: Record<string, { sig: string; extra: string[] }> } | 'fail' | null>(null);
  /** 這次預覽中按了「隱藏這則」的留言（留在清單上以便還原）：審稿鍵 → 被評對象鍵與顯示文字 */
  const [hiddenHere, setHiddenHere] = useState<Record<string, { who: string; text: string }>>({});

  useEffect(() => {
    if (!ok) return;
    void registerAssetCache();
    void loadReview();
  }, [ok]);

  const review = st.review ?? emptyReview(s?.surveyId ?? '');
  const summary = useMemo(() => (ok && s.kind === 'feedback' ? runFeedback(s, st.stats) : null), [ok, s, st.stats]);
  const raters = useMemo(() => (ok && s.kind === 'feedback' ? feedbackRecords(s).map((r) => r.rater) : []), [ok, s]);
  const personal = useMemo(() => (ok && summary ? personalInputs(s, summary, review, audience, raters) : []), [ok, s, summary, review, audience, raters]);
  const qs = useMemo(() => (ok && s.kind === 'opinion' ? opinionQuestions(s, st.stats) : null), [ok, s, st.stats]);
  const vote = useMemo(() => (ok && s.kind === 'vote' ? runVote(s, st.stats) : null), [ok, s, st.stats]);
  const people = useMemo(() => (ok && summary ? allPeople(s, summary, raters) : []), [ok, s, summary, raters]);
  const needPreview = audience !== 'teacher' && summary !== null;
  const sig = JSON.stringify([audience, personal.map((p) => [p.key, p.comments, p.input.teacherComment ?? ''])]);

  // 預覽打開時，用和下載同一條路徑編出每位學生的文件：找出個別版本多出的文字，並記下全部文字當簽章
  useEffect(() => {
    if (!previewOpen || !needPreview) return;
    let alive = true;
    setPrep(null);
    docTools()
      .then((tools) => {
        if (!alive) return;
        const docs: Record<string, { sig: string; extra: string[] }> = {};
        for (const p of personal) {
          const doc = tools.personal(p.input, audience);
          docs[p.key] = { sig: docSignature(doc), extra: overrideTexts(doc, tools.personal(p.input, audience, true)) };
        }
        setPrep({ fast: sig, docs });
      })
      .catch(() => alive && setPrep('fail'));
    return () => {
      alive = false;
    };
    // personal、audience 都已反映在 sig 裡
  }, [previewOpen, needPreview, sig]);

  if (!ok) {
    return (
      <main class="page" id="main">
        <h1>{S.output.title}</h1>
        <Notice kind="warn">{S.output.locked}</Notice>
        <ActBar>
          <button class="btn secondary grow" type="button" onClick={() => go(s ? 'prepare' : 'home')}>
            {S.output.goPrep}
          </button>
        </ActBar>
      </main>
    );
  }

  const nameFlags = audience !== 'teacher' ? personal.reduce((n, p) => n + p.comments.filter((c) => findPossibleNames(c, { includeLow: false }).length > 0).length, 0) : 0;
  const previewed = !needPreview || seen?.fast === sig;
  const ready = prep !== null && prep !== 'fail' && prep.fast === sig ? prep : null;
  /** 產生學生版、家長版檔案前：這份文件的全部文字必須和確認過的預覽一模一樣，否則要求重新預覽。 */
  const guard = (key: string, doc: DocModel) => {
    if (needPreview && seen?.docs[key] !== docSignature(doc)) throw new PreviewStale();
  };
  const staleOrFail = (e: unknown, fallback: string) => {
    if (e instanceof PreviewStale) {
      setSeen(null);
      setMsg({ kind: 'bad', text: S.output.previewStale });
    } else setMsg({ kind: 'bad', text: fallback });
  };
  const sel = personal.find((p) => p.key === who) ?? personal[0];
  const allComments = summary ? summary.targets.flatMap((t) => t.comments.map((c) => ({ key: feedbackKey(c.recordId), text: c.text }))) : [];
  const counts = reviewCounts(review, allComments);

  async function run(label: string, job: () => Promise<{ name: string; bytes: Uint8Array; mime: string; missing?: string[] }>) {
    setBusy(label);
    setMsg(null);
    try {
      const out = await job();
      downloadBytes(out.name, out.bytes, out.mime);
      const missing = out.missing ?? [];
      setMsg({ kind: missing.length > 0 ? 'warn' : 'ok', text: S.output.done(out.name) + (missing.length > 0 ? ` ${S.output.missingChars(missing.join(''))}` : '') });
    } catch (e) {
      staleOrFail(e, S.output.failed);
    } finally {
      setBusy(null);
    }
  }

  const base = s.name;
  const charts = async (): Promise<Map<string, Uint8Array>> => {
    const map = new Map<string, Uint8Array>();
    if (!summary || audience === 'parent') return map;
    for (const t of summary.targets) {
      try {
        const svg = pairedBarsSvg(
          summary.items.map((it, i) => ({ label: it.label, a: t.averageRow[i] ?? null, b: summary.classItemMeans[i] ?? null })),
          { title: S.stats.itemsTitle, max: s.scale.max, aName: S.stats.mine, bName: S.stats.classAvg, w: 440, h: 190, palette: PRINT },
        );
        map.set(t.key, await svgToPng(svg, 440, 190));
      } catch {
        /* 畫不出圖就不放圖，其餘照常輸出 */
      }
    }
    return map;
  };
  const withCharts = async () => {
    const map = await charts();
    return personalInputs(s, summary!, review, audience, raters, (t: TargetResult) => map.get(t.key));
  };

  const classTable = (fmt: Fmt) =>
    run(`class-${fmt}`, async () => {
      const input = classSummaryInput(s, summary!);
      const name = `${base} 班級總表.${fmt}`;
      if (fmt === 'xlsx') return { name, bytes: (await loadXlsx()).classSummaryXlsx(input), mime: MIME.xlsx };
      const doc = (await docTools()).summary(input);
      if (fmt === 'docx') return { name, bytes: await (await loadDocx()).renderDocx(doc), mime: MIME.docx };
      const { renderPdf, loadFonts } = await loadPdf();
      {
        const r = await renderPdf(doc, await loadFonts());
        return { name, bytes: r.bytes, mime: MIME.pdf, missing: r.missingChars };
      }
    });

  const onePersonal = (fmt: 'docx' | 'pdf') =>
    run(`one-${fmt}`, async () => {
      const list = await withCharts();
      const pick = list.find((p) => p.key === (sel?.key ?? '')) ?? list[0]!;
      const doc = (await docTools()).personal(pick.input, audience);
      guard(pick.key, doc);
      const name = `${pick.fileName} ${AUDIENCE_NAMES[audience]}.${fmt}`;
      if (fmt === 'docx') return { name, bytes: await (await loadDocx()).renderDocx(doc), mime: MIME.docx };
      const { renderPdf, loadFonts } = await loadPdf();
      {
        const r = await renderPdf(doc, await loadFonts());
        return { name, bytes: r.bytes, mime: MIME.pdf, missing: r.missingChars };
      }
    });

  /** 桌機備用：用瀏覽器列印（不產生檔案，在列印視窗選「另存為 PDF」或直接印）。 */
  const printOne = async () => {
    setBusy('print');
    try {
      const list = await withCharts();
      const pick = list.find((p) => p.key === (sel?.key ?? '')) ?? list[0]!;
      const doc = (await docTools()).personal(pick.input, audience);
      guard(pick.key, doc);
      await (await loadPrint()).printDoc(doc);
    } catch (e) {
      staleOrFail(e, S.output.printFail);
    } finally {
      setBusy(null);
    }
  };

  const batch = () =>
    run('batch', async () => {
      const list = await withCharts();
      const tools = await docTools();
      const { renderBatchZip, loadFonts } = await loadPdf();
      const items = list.map((p) => {
        const doc = tools.personal(p.input, audience);
        guard(p.key, doc);
        return { name: `${p.fileName} ${AUDIENCE_NAMES[audience]}`, doc };
      });
      const missing = new Set<string>();
      const bytes = await renderBatchZip(items, await loadFonts(), (d, t) => setBusy(S.output.progress(d, t)), (cs) => cs.forEach((c) => missing.add(c)));
      return { name: `${base} 個人回饋單 ${AUDIENCE_NAMES[audience]}.zip`, bytes, mime: MIME.zip, missing: [...missing] };
    });

  const report = (fmt: Fmt) =>
    run(`report-${fmt}`, async () => {
      const name = `${base} ${vote ? '票選結果' : '統計報告'}.${fmt}`;
      if (fmt === 'xlsx') {
        const { buildXlsx } = await loadXlsx();
        const sheets = vote ? voteSheets(vote) : opinionSheets(qs!, review, s.scale.min);
        return { name, bytes: buildXlsx(sheets), mime: MIME.xlsx };
      }
      const doc = vote ? voteReport(s, vote) : opinionReport(s, qs!, review);
      if (fmt === 'docx') return { name, bytes: await (await loadDocx()).renderDocx(doc), mime: MIME.docx };
      const { renderPdf, loadFonts } = await loadPdf();
      {
        const r = await renderPdf(doc, await loadFonts());
        return { name, bytes: r.bytes, mime: MIME.pdf, missing: r.missingChars };
      }
    });

  const dis = busy !== null;
  const personalDis = dis || !previewed || personal.length === 0;

  return (
    <main class="page out" id="main">
      <header class="prep-head">
        <h1>{S.output.title}</h1>
        <p class="meta">{s.name}</p>
      </header>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {busy && (
        <Notice kind="info" role="status">
          {busy.startsWith('產生中') ? busy : S.output.working}
        </Notice>
      )}

      {summary && (
        <>
          <section class="card">
            <h2>{S.output.audienceTitle}</h2>
            <div class="seg" role="radiogroup" aria-label={S.output.audienceTitle}>
              {(['teacher', 'student', 'parent'] as Audience[]).map((a) => (
                <button key={a} type="button" role="radio" aria-checked={audience === a} class={audience === a ? 'on' : ''} onClick={() => setAudience(a)}>
                  {S.output.audiences[a]}
                </button>
              ))}
            </div>
            <p class="hint">{S.output.audienceNotes[audience]}</p>
            {audience !== 'teacher' && counts.pending > 0 && <Notice kind="info">{S.output.unreviewed(counts.pending)}</Notice>}
            {audience !== 'teacher' && counts.flaggedPending > 0 && <Notice kind="warn">{S.output.flaggedUnreviewed(counts.flaggedPending)}</Notice>}
            {needPreview && (
              <Notice
                kind="warn"
                title={S.output.warnTitle}
                actions={
                  <button class="btn secondary small" type="button" onClick={() => { setConfirmed(false); setPreviewOpen(true); }}>
                    {previewed ? S.output.previewDone : `先預覽${AUDIENCE_NAMES[audience]}`}
                  </button>
                }
              >
                {S.output.warnBody}
                {nameFlags > 0 && ` ${S.output.possibleNameCount(nameFlags)}`}
              </Notice>
            )}
          </section>

          <section class="card">
            <h2>{S.output.classTable}</h2>
            <p class="hint">{S.output.audiences.teacher}</p>
            <div class="btn-row">
              {(['xlsx', 'docx', 'pdf'] as Fmt[]).map((f) => (
                <button key={f} class="btn secondary" type="button" disabled={dis || summary.targets.length === 0} onClick={() => void classTable(f)}>
                  {S.output[f]}
                </button>
              ))}
            </div>
          </section>

          <section class="card">
            <h2>{S.output.templateTitle}</h2>
            <p class="hint">{S.output.templateHint}</p>
            <PickerLazy />
          </section>

          <section class="card">
            <h2>{S.output.personal}</h2>
            {personal.length === 0 && <p class="hint">{S.output.noFeedbackTargets}</p>}
            <label class="field">
              <span class="label">{S.output.pickStudent}</span>
              <select class="input" value={sel?.key ?? ''} onChange={(e) => setWho((e.target as HTMLSelectElement).value)}>
                {personal.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.fileName}
                  </option>
                ))}
              </select>
            </label>
            <div class="btn-row">
              <button class="btn secondary" type="button" disabled={personalDis} onClick={() => void onePersonal('pdf')}>
                {S.output.pdf}
              </button>
              <button class="btn secondary" type="button" disabled={personalDis} onClick={() => void onePersonal('docx')}>
                {S.output.docx}
              </button>
              {!isTouchDevice() && (
                <button class="btn secondary" type="button" disabled={personalDis} onClick={() => void printOne()}>
                  {S.output.print}
                </button>
              )}
              <button class="btn primary" type="button" disabled={personalDis} onClick={() => void batch()}>
                {S.output.allStudents(personal.length)}
              </button>
            </div>
            {!previewed && (
              <p class="hint lock-hint">
                <Icon name="lock" /> {S.output.needPreview}
              </p>
            )}
            <p class="hint">{S.output.noteNoRank}</p>
          </section>
        </>
      )}

      {(qs || vote) && (
        <section class="card">
          <h2>{S.output.report}</h2>
          <div class="btn-row">
            {(['xlsx', 'docx', 'pdf'] as Fmt[]).map((f) => (
              <button key={f} class="btn secondary" type="button" disabled={dis} onClick={() => void report(f)}>
                {S.output[f]}
              </button>
            ))}
          </div>
        </section>
      )}

      <p class="hint">{S.output.fontsNote}</p>
      <p class="hint">
        {S.output.wordFont}
        {WORD_FONT_NOTE}
      </p>

      {previewOpen && (
        <Sheet
          title={S.output.previewTitle}
          onClose={() => setPreviewOpen(false)}
          footer={
            <>
              <button class="btn secondary" type="button" onClick={() => setPreviewOpen(false)}>
                {S.close}
              </button>
              <button
                class="btn primary grow"
                type="button"
                disabled={!confirmed || ready === null}
                onClick={() => {
                  if (!ready) return;
                  setSeen({ fast: sig, docs: Object.fromEntries(Object.entries(ready.docs).map(([k, v]) => [k, v.sig])) });
                  setMsg(null);
                  setPreviewOpen(false);
                }}
              >
                {S.output.previewDone}
              </button>
            </>
          }
        >
          <Notice kind="warn">{S.output.warnBody}</Notice>
          <p class="hint">{S.output.possibleNameNote}</p>
          {prep === 'fail' ? (
            <Notice kind="bad">{S.output.previewLoadFail}</Notice>
          ) : (
            ready === null && (
              <Notice kind="info" role="status">
                {S.output.previewLoading}
              </Notice>
            )
          )}
          <ul class="plain-ul preview-list" data-testid="preview">
            {personal.map((p) => (
              <li key={p.key}>
                <strong>{p.fileName}</strong>
                {(() => {
                  const gone = Object.entries(hiddenHere).filter(([k, v]) => v.who === p.key && !p.commentKeys.includes(k));
                  const teacher = p.input.teacherComment;
                  const extra = ready?.docs[p.key]?.extra ?? [];
                  const self = p.input.student.name;
                  if (p.comments.length === 0 && gone.length === 0 && !teacher && extra.length === 0) return <p class="hint">{S.output.previewEmpty}</p>;
                  return (
                    <ul class="plain-list">
                      {teacher && (
                        <li data-testid="preview-teacher">
                          <span class="hint">{S.output.previewTeacher}</span> <UnmaskedText text={teacher} hits={teacherCommentHits(teacher, people, self)} />
                        </li>
                      )}
                      {extra.length > 0 && (
                        <li data-testid="preview-override">
                          <span class="hint">{S.output.previewOverride}</span>
                          <ul class="plain-list">
                            {extra.map((t, i) => (
                              <li key={i}>
                                <UnmaskedText text={t} hits={teacherCommentHits(t, people, self)} />
                              </li>
                            ))}
                          </ul>
                        </li>
                      )}
                      {p.comments.map((c, i) => (
                        <FlaggedComment
                          key={p.commentKeys[i] ?? i}
                          text={c}
                          itemKey={p.commentKeys[i] ?? ''}
                          hiddenHere={false}
                          onHide={() => setHiddenHere((h) => ({ ...h, [p.commentKeys[i] ?? '']: { who: p.key, text: c } }))}
                        />
                      ))}
                      {gone.map(([k, v]) => (
                        <FlaggedComment key={k} text={v.text} itemKey={k} hiddenHere onHide={() => undefined} />
                      ))}
                    </ul>
                  );
                })()}
              </li>
            ))}
          </ul>
          <label class="check">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed((e.target as HTMLInputElement).checked)} />
            {S.output.previewConfirm}
          </label>
        </Sheet>
      )}

      <ActBar>
        <button class="btn secondary grow" type="button" onClick={() => go('stats')}>
          {S.output.back}
        </button>
      </ActBar>
    </main>
  );
}
