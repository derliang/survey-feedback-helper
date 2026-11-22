import type { ComponentType } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { feedbackRecords, opinionQuestions, runFeedback, runVote, voteGuardPending } from '../../app/analysis';
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
import { go, loadReview, setSession, useApp } from '../../app/store';
import { loadDocx, loadPdf, loadPrint, loadXlsx, registerAssetCache } from '../../export';
import type { ClassSummaryInput, DocModel, PersonalFeedbackInput } from '../../export';
import { downloadBytes, isTouchDevice } from '../../storage';
import { allPeople, feedbackKey } from '../../app/output';
import { docSignature, overrideTexts, teacherCommentHits } from '../../app/output-check';
import { resolveSettings } from '../../editor/settings';
import { applyOverrides } from '../../editor/overrides';
import { walk } from '../../editor/ops';
import { chartKey, type DataEB } from '../../editor/types';
import { PreviewActions } from './ReviewParts';
import { findPossibleNames, type PossibleName } from '../../core/possible-names';
import { svgToPng } from '../chart-png';
import { strings as S } from '../strings';
import { ActBar, Icon, Notice, OptionGroup, Sheet } from '../parts/parts';
import { extra } from '../strings-extra';
import { vt } from '../strings-vote';

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
    /** 這位學生的範本裡有哪些圖表區塊（已套用個別版本），每種設定畫一張。 */
    chartSpecs: (inp: PersonalFeedbackInput): DataEB[] => {
      const t = applyOverrides(picks.personal, overrides[`${inp.className}-${inp.student.seat}`]);
      const out: DataEB[] = [];
      walk(t.blocks, (b) => {
        if (b.kind === 'data' && b.dataKind === 'chart') out.push(b);
      });
      return out;
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

class Cancelled extends Error {}

type Stage = 'prepare' | 'fonts' | 'render' | 'zip';

/** 失敗原因（D31）：網路（程式區塊或字型下載不到）、記憶體不足、其他。 */
function failReason(e: unknown): 'net' | 'mem' | 'other' {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  if (/memory|allocation|array length|RangeError/i.test(m)) return 'mem';
  if (/fetch|dynamically imported|import|network|load failed|NetworkError|下載失敗/i.test(m)) return 'net';
  return 'other';
}

/** 輸出進行中（D27）：階段、進度條、剩餘時間、「請不要關閉這個頁面」與「取消」。 */
function ProgressNotice(props: { stage: Stage; progN: { d: number; t: number } | null; startedAt: number; onCancel: () => void; fallback: string }) {
  const X = extra().output;
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const { stage, progN } = props;
  const label = stage === 'render' && progN ? X.stageRender(progN.d, progN.t) : X.stages[stage];
  let eta = '';
  if (stage === 'render' && progN && progN.d > 0) {
    const secs = Math.max(1, Math.round(((Date.now() - props.startedAt) / progN.d) * (progN.t - progN.d) / 1000));
    eta = X.eta(secs);
  }
  const pct = progN && progN.t > 0 ? Math.round((progN.d / progN.t) * 100) : null;
  return (
    <Notice
      kind="info"
      role="status"
      actions={
        <button class="btn secondary small" type="button" data-testid="out-cancel" onClick={props.onCancel}>
          {X.cancel}
        </button>
      }
    >
      <span data-testid="out-stage">{progN || stage !== 'prepare' ? label : props.fallback}</span>
      {eta && <span> · {eta}</span>}
      {pct !== null && (
        <span class="out-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={X.stages.render}>
          <i style={{ width: `${pct}%` }} />
        </span>
      )}
      <span class="hint out-keep">{X.keepOpen}</span>
    </Notice>
  );
}

export function OutputView() {
  const st = useApp();
  const s = st.session;
  const ok = s !== null && canGoStats(s);
  const [audience, setAudience] = useState<Audience>('teacher');
  const [who, setWho] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  /** 批次產生的進度字串（「產生中 3 / 20」）；busy 仍是工作代號，按鈕才認得出是哪一顆在跑。 */
  const [prog, setProg] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'warn'; text: string; retry?: () => void; partial?: { name: string; bytes: Uint8Array; n: number } } | null>(null);
  /** 輸出進度（D27）：目前階段、第幾份／共幾份、開始時間；取消旗標。 */
  const [stage, setStage] = useState<Stage>('prepare');
  const [progN, setProgN] = useState<{ d: number; t: number } | null>(null);
  const startedAt = useRef(0);
  const cancelRef = useRef(false);
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
  useEffect(() => {
    if (msg?.kind !== 'ok') return;
    const t = setTimeout(() => setMsg(null), 8000);
    return () => clearTimeout(t);
  }, [msg]);

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
    setStage('prepare');
    setProgN(null);
    cancelRef.current = false;
    startedAt.current = Date.now();
    try {
      const out = await job();
      if (cancelRef.current) throw new Cancelled();
      downloadBytes(out.name, out.bytes, out.mime);
      const missing = out.missing ?? [];
      setMsg({ kind: missing.length > 0 ? 'warn' : 'ok', text: S.output.done(out.name) + (missing.length > 0 ? ` ${S.output.missingChars(missing.slice(0, 8).join(''), missing.length)}` : '') });
    } catch (e) {
      if (e instanceof Cancelled) setMsg({ kind: 'warn', text: extra().output.cancelled });
      else if (e instanceof PreviewStale) staleOrFail(e, S.output.failed);
      else {
        const X = extra().output;
        const at = progN && progN.d < progN.t ? ` ${X.failedAt(progN.d + 1, progN.t)}` : '';
        const pz = (e as { partialZip?: Uint8Array | null; done?: number; cause?: unknown }) ?? {};
        const partial = pz.partialZip ? { name: `${base} 個人回饋單 ${AUDIENCE_NAMES[audience]}（已完成 ${pz.done} 份）.zip`, bytes: pz.partialZip, n: pz.done ?? 0 } : undefined;
        const why = partial ? failReason(pz.cause) : failReason(e);
        setMsg({ kind: 'bad', text: `${S.output.failed.replace('，請再試一次。', '。')}${at} ${X.reasons[why]} ${X.alt}`, retry: () => void run(label, job), partial });
      }
    } finally {
      setBusy(null);
      setProg(null);
      setProgN(null);
    }
  }

  const base = s.name;
  /** 個人回饋單：依範本圖表區塊的設定（類型、參考線、顏色）替每位學生畫圖，輸出與預覽用同一套畫法。 */
  const withCharts = async () => {
    const list = personalInputs(s, summary!, review, audience, raters);
    if (audience === 'parent') return list;
    const tools = await docTools();
    const { buildChart } = await import('../chart-types');
    const { chartText, chartPalette } = await import('../chart-text');
    const text = chartText();
    for (const p of list) {
      const out: NonNullable<PersonalFeedbackInput['charts']> = {};
      for (const spec of tools.chartSpecs(p.input)) {
        const key = chartKey(spec);
        if (out[key]) continue;
        try {
          const r = buildChart(spec.chartType, spec.compareLine === true, p.chart, text, { w: 440, palette: chartPalette(spec.colors) });
          out[key] = { png: await svgToPng(r.svg, r.w, r.h), h: r.h };
        } catch {
          /* 畫不出圖就不放圖，其餘照常輸出 */
        }
      }
      p.input.charts = out;
    }
    return list;
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
      setMoreOpen(false);
    }
  };

  const batch = () =>
    run('batch', async () => {
      const list = await withCharts();
      const tools = await docTools();
      const { renderBatchZip, loadFonts } = await loadPdf();
      setStage('fonts');
      const items = list.map((p) => {
        const doc = tools.personal(p.input, audience);
        guard(p.key, doc);
        return { name: `${p.fileName} ${AUDIENCE_NAMES[audience]}`, doc };
      });
      const missing = new Set<string>();
      const fonts = await loadFonts();
      if (cancelRef.current) throw new Cancelled();
      setStage('render');
      setProgN({ d: 0, t: items.length });
      const bytes = await renderBatchZip(
        items,
        fonts,
        (d, t) => {
          setProg(S.output.progress(d, t));
          setProgN({ d, t });
          if (d === t) setStage('zip');
          else if (cancelRef.current) throw new Cancelled();
        },
        (cs) => cs.forEach((c) => missing.add(c)),
      );
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
  const voteGate = vote ? voteGuardPending(vote, st.stats).length : 0;
  /** 正在跑的那顆按鈕立刻改字（不等狀態提示的延遲），其他按鈕維持原字且停用。 */
  const lbl = (key: string, text: string) => (busy === key ? (key === 'batch' && prog ? prog : S.output.working) : text);
  /** 下載成功／失敗與進行中的提示：浮在畫面下方，不推擠版面，連點按鈕不會點空（#146）。 */
  const status =
    msg || busy ? (
      <div class="out-status" data-testid="out-status">
        {msg && (
          <Notice
            kind={msg.kind}
            actions={
              msg.kind === 'bad' ? (
                <>
                  {msg.retry && (
                    <button class="btn secondary small" type="button" data-testid="out-retry" onClick={msg.retry}>
                      {extra().output.retry}
                    </button>
                  )}
                  {msg.partial && (
                    <button
                      class="btn secondary small"
                      type="button"
                      data-testid="out-partial"
                      onClick={() => msg.partial && downloadBytes(msg.partial.name, msg.partial.bytes, MIME.zip)}
                    >
                      {extra().output.savePartial(msg.partial.n)}
                    </button>
                  )}
                  <button class="btn ghost small" type="button" onClick={() => setMsg(null)}>
                    {S.close}
                  </button>
                </>
              ) : undefined
            }
          >
            {msg.text}
          </Notice>
        )}
        {busy && <ProgressNotice stage={stage} progN={progN} startedAt={startedAt.current} onCancel={() => (cancelRef.current = true)} fallback={prog ?? S.output.working} />}
      </div>
    ) : null;
  const personalDis = dis || !previewed || personal.length === 0;

  return (
    <main class="page out" id="main">
      <header class="prep-head">
        <h1>{S.output.title}</h1>
        <p class="meta">{s.name}</p>
      </header>

      {!summary && !vote && !qs && status}

      {summary && (
        <div class="out-cols">
          <div class="out-main">
          <section class="card">
            <h2>{S.output.stepWho}</h2>
            <label class="field">
              <span class="label">{S.output.topicName}</span>
              <input class="input" type="text" data-testid="topic-name" value={s.name} onChange={(e) => setSession({ name: (e.target as HTMLInputElement).value.replace(/\s+/g, ' ').trim() || s.name })} />
              <span class="hint">{S.output.topicHint}</span>
            </label>
            <OptionGroup label={S.output.audienceTitle} value={audience} options={(['teacher', 'student', 'parent'] as Audience[]).map((a) => ({ value: a, label: S.output.audiences[a] }))} onChange={setAudience} />
            <p class="hint">{S.output.audienceNotes[audience]}</p>
            {audience !== 'teacher' && counts.pending > 0 && <Notice kind="info">{S.output.unreviewed(counts.pending)}</Notice>}
            {audience !== 'teacher' && counts.flaggedPending > 0 && <Notice kind="warn">{S.output.flaggedUnreviewed(counts.flaggedPending)}</Notice>}
            {needPreview && (
              <Notice
                kind="warn"
                title={S.output.warnTitle}
                actions={
                  <button class="btn secondary small" type="button" onClick={() => { setConfirmed(false); setPreviewOpen(true); }}>
                    {previewed ? S.output.previewDone : extra().output.previewFirst(S.output.audiences[audience])}
                  </button>
                }
              >
                {S.output.warnBody}
                {nameFlags > 0 && ` ${S.output.possibleNameCount(nameFlags)}`}
              </Notice>
            )}
          </section>

          <section class="card">
            <h2>{S.output.stepTemplate}</h2>
            <p class="hint">{S.output.templateHint}</p>
            <PickerLazy />
          </section>
          </div>

          <aside class="out-side">
            <section class="card out-dl" aria-busy={dis} aria-label={S.output.stepDownload}>
              <h2>{S.output.stepDownload}</h2>
              {status}
              <h3>{S.output.classTable}</h3>
              <div class="out-eq">
                {(['xlsx', 'docx', 'pdf'] as Fmt[]).map((f) => (
                  <button key={f} class="btn secondary" type="button" disabled={dis || summary.targets.length === 0} onClick={() => void classTable(f)}>
                    {lbl(`class-${f}`, S.output.fmtShort[f])}
                  </button>
                ))}
              </div>
              <hr class="out-sep" />
              <h3>{S.output.personal}</h3>
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
              <div class="out-pers">
                <button class="btn primary out-main-btn" type="button" disabled={personalDis} onClick={() => void onePersonal('docx')}>
                  {lbl('one-docx', S.output.downloadWord)}
                </button>
                <button class="btn secondary" type="button" disabled={personalDis} onClick={() => void onePersonal('pdf')}>
                  {lbl('one-pdf', S.output.pdf)}
                </button>
                {!isTouchDevice() && (
                  <div class="out-more">
                    <button class="btn secondary" type="button" aria-label={S.output.more} aria-haspopup="true" aria-expanded={moreOpen} disabled={personalDis} onClick={() => setMoreOpen((v) => !v)} onKeyDown={(e) => e.key === 'Escape' && setMoreOpen(false)}>
                      ⋯
                    </button>
                    {moreOpen && !personalDis && (
                      <div class="out-pop">
                        <button class="btn secondary" type="button" onClick={() => void printOne()}>
                          {lbl('print', S.output.print)}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!previewed && (
                <p class="hint lock-hint">
                  <Icon name="lock" /> {S.output.needPreview}
                </p>
              )}
              <p class="hint">{S.output.noteNoRank}</p>
              <button class="btn secondary" type="button" disabled={personalDis} onClick={() => void batch()}>
                {lbl('batch', S.output.allStudents(personal.length))}
              </button>
            </section>
          </aside>
        </div>
      )}

      {vote && (
        <div class="out-cols" data-testid="vote-output">
          <div class="out-main">
            <section class="card">
              <h2>{S.output.voteContent}</h2>
              {voteGate > 0 && (
                <Notice
                  kind="warn"
                  title={vt().guard.gateTitle(voteGate)}
                  actions={
                    <button class="btn secondary small" type="button" onClick={() => go('stats')}>
                      {vt().guard.backToStats}
                    </button>
                  }
                >
                  {vt().guard.gateBody}
                </Notice>
              )}
              <div class="table-wrap" hidden={voteGate > 0}>
                <table class="roster-table vote-sum">
                  <thead>
                    <tr>
                      {S.output.voteCols.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vote.positions.map((p) => {
                      const top = p.tally.rows.filter((r) => p.election.elected.includes(r.name));
                      return (
                        <tr key={p.col.index}>
                          <td>{p.col.label}</td>
                          <td>
                            <strong>{p.election.elected.join('、') || '—'}</strong>
                          </td>
                          <td>{top.map((r) => r.votes).join('、') || '—'}</td>
                          <td>{p.election.draw ? <span class="tag warn">{S.output.voteTied}</span> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p class="hint">{S.output.voteFileNote}</p>
            </section>
          </div>
          <aside class="out-side">
            <section class="card out-dl" aria-busy={dis} aria-label={S.output.stepDownload}>
              <h2>{S.output.voteDownload}</h2>
              {status}
              <div class="out-pers">
                <button class="btn primary out-main-btn" type="button" disabled={dis || voteGate > 0} onClick={() => void report('docx')}>
                  {lbl('report-docx', S.output.downloadWord)}
                </button>
                <button class="btn secondary" type="button" disabled={dis || voteGate > 0} onClick={() => void report('pdf')}>
                  {lbl('report-pdf', S.output.pdf)}
                </button>
                <button class="btn secondary" type="button" disabled={dis || voteGate > 0} onClick={() => void report('xlsx')}>
                  {lbl('report-xlsx', S.output.fmtShort.xlsx)}
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {qs && (
        <div class="out-cols" data-testid="opinion-output">
          <div class="out-main">
            <section class="card">
              <h2>{S.output.voteContent}</h2>
              <div class="table-wrap">
                <table class="roster-table vote-sum opinion-sum">
                  <thead>
                    <tr>
                      {S.output.opinionCols.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {qs.map((q) => {
                      const answered = q.kind === 'score' ? q.stat.n : q.kind === 'choice' ? q.stat.answered : q.stat.answers.length;
                      const top = q.kind === 'choice' ? [...q.stat.counts].sort((x, y) => y.count - x.count)[0] : undefined;
                      const gist =
                        q.kind === 'score' ? (q.stat.mean === null ? '—' : S.output.opinionMean(q.stat.mean.toFixed(2))) : q.kind === 'choice' ? (top ? `${top.option}（${top.count}）` : '—') : '—';
                      return (
                        <tr key={q.col.index}>
                          <td>{q.col.label}</td>
                          <td>{S.output.opinionKinds[q.kind]}</td>
                          <td>{answered}</td>
                          <td>{gist}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p class="hint">{S.output.opinionFileNote}</p>
            </section>
          </div>
          <aside class="out-side">
            <section class="card out-dl" aria-busy={dis} aria-label={S.output.stepDownload}>
              <h2>{S.output.voteDownload}</h2>
              {status}
              <div class="out-pers">
                <button class="btn primary out-main-btn" type="button" disabled={dis} onClick={() => void report('docx')}>
                  {lbl('report-docx', S.output.downloadWord)}
                </button>
                <button class="btn secondary" type="button" disabled={dis} onClick={() => void report('pdf')}>
                  {lbl('report-pdf', S.output.pdf)}
                </button>
                <button class="btn secondary" type="button" disabled={dis} onClick={() => void report('xlsx')}>
                  {lbl('report-xlsx', S.output.fmtShort.xlsx)}
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      <p class="hint">{S.output.fontsNote}</p>
      <p class="hint">
        {S.output.wordFont}
        {S.output.wordFontNote}
      </p>

      {previewOpen && (
        <Sheet
          wide
          title={S.output.previewTitle}
          onClose={() => setPreviewOpen(false)}
          footer={
            <>
              {(!confirmed || ready === null) && (
                <p class="hint sheet-why" data-testid="preview-why">
                  {ready === null ? extra().output.whyLoading : extra().output.whyTick}
                </p>
              )}
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
                {confirmed ? S.output.previewDone : S.output.previewTick}
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
          <label class="check check-inline">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed((e.target as HTMLInputElement).checked)} />
            {S.output.previewConfirm}
          </label>
        </Sheet>
      )}

      <ActBar fixed>
        <button class="btn secondary grow" type="button" onClick={() => go('stats')}>
          {S.output.back}
        </button>
      </ActBar>
    </main>
  );
}
