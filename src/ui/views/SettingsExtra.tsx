// 設定頁的兩張卡：預設值（三層設定）與備份與還原。依設計第六輪 A1～A3。
import { useEffect, useState } from 'preact/hooks';
import { getState, persist, set } from '../../app/store';
import { downloadText, saveFile } from '../../storage';
import { mergeFolderData, parseFolderData, serializeFolderData } from '../../storage/folder-data';
import type { FolderData } from '../../storage/types';
import { type BackupSummary, type EditorData, bundleBackup, EditorDataError, mergeEditorData, parseEditorData, summarizeBackup, unbundleBackup } from '../../editor/project';
import { type Layer, type ReportSettings, resolveSettings, settingSources } from '../../editor/settings';
import type { ReportVersion } from '../../editor/types';
import { applyEditorData, es, layers, load, setLayerValue, useEditor } from '../editor/state';
import { Notice } from '../parts/parts';
import { backupStrings as B, defaultsStrings as D } from '../strings-backup';

type Kind = 'feedback' | 'opinion' | 'vote';
const KINDS: Kind[] = ['feedback', 'opinion', 'vote'];
const VERSIONS: ReportVersion[] = ['teacher', 'student', 'parent'];

export function DefaultsCard() {
  const st = useEditor();
  const [layer, setLayer] = useState<Layer>('global');
  const [kind, setKind] = useState<Kind>('feedback');
  useEffect(() => void load(), []);
  const l = layers();
  const value = resolveSettings(l, kind);
  const src = settingSources(l, kind);
  const mine: Partial<ReportSettings> = layer === 'global' ? l.global : layer === 'kind' ? l.byKind[kind] ?? {} : l.run;
  void st;

  function Tag({ k }: { k: keyof ReportSettings }) {
    return (
      <span class="row-meta">
        <span class="tag">
          {D.current}：{D.sources[src[k]]}
        </span>
        {mine[k] !== undefined && (
          <button class="btn quiet" type="button" onClick={() => setLayerValue(layer, kind, k, undefined)}>
            {D.revert}
          </button>
        )}
      </span>
    );
  }

  const text = (k: 'school' | 'filenameRule') => (
    <div class="field" key={k}>
      <label class="label" for={`def-${k}`}>
        {D.fields[k]}
      </label>
      <input id={`def-${k}`} class="input" type="text" value={mine[k] ?? value[k]} onInput={(e) => setLayerValue(layer, kind, k, (e.target as HTMLInputElement).value)} />
      <Tag k={k} />
    </div>
  );
  const toggle = (k: 'deidentify' | 'showOthersNames' | 'showRawComments' | 'showClassCompare') => (
    <div class="field" key={k}>
      <label class="check">
        <input type="checkbox" checked={value[k]} onChange={(e) => setLayerValue(layer, kind, k, (e.target as HTMLInputElement).checked)} />
        <span>
          {D.toggles[k]}（{value[k] ? D.on : D.off}）
        </span>
      </label>
      <Tag k={k} />
    </div>
  );

  return (
    <section class="card" data-testid="defaults-card">
      <h2>{D.title}</h2>
      <p class="hint">{D.intro}</p>
      <div class="seg" role="radiogroup" aria-label={D.title}>
        {(['global', 'kind', 'run'] as Layer[]).map((x) => (
          <button key={x} type="button" role="radio" aria-checked={layer === x} class={layer === x ? 'on' : ''} onClick={() => setLayer(x)}>
            {D.layers[x]}
          </button>
        ))}
      </div>
      {layer === 'kind' && (
        <div class="seg" role="radiogroup" aria-label={D.layers.kind} style="margin-top:var(--sp-2)">
          {KINDS.map((x) => (
            <button key={x} type="button" role="radio" aria-checked={kind === x} class={kind === x ? 'on' : ''} onClick={() => setKind(x)}>
              {D.kinds[x]}
            </button>
          ))}
        </div>
      )}
      {layer === 'run' && <Notice kind="warn">{D.runNote}</Notice>}
      <div class="stack" style="margin-top:var(--sp-3)">
        {text('school')}
        <div class="field">
          <span class="label">{D.versionLabel}</span>
          <div class="seg" role="radiogroup" aria-label={D.versionLabel}>
            {VERSIONS.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={value.version === v} class={value.version === v ? 'on' : ''} onClick={() => setLayerValue(layer, kind, 'version', v)}>
                {D.versions[v]}
              </button>
            ))}
          </div>
          <Tag k="version" />
        </div>
        {text('filenameRule')}
        {toggle('deidentify')}
        {toggle('showOthersNames')}
        {toggle('showRawComments')}
        {toggle('showClassCompare')}
        <div class="field">
          <label class="label" for="def-keywords">
            {D.fields.keywords}
          </label>
          <input
            id="def-keywords"
            class="input"
            type="text"
            value={value.keywords.join('，')}
            onInput={(e) =>
              setLayerValue(
                layer,
                kind,
                'keywords',
                (e.target as HTMLInputElement).value
                  .split(/[,，、]/)
                  .map((x) => x.trim())
                  .filter(Boolean),
              )
            }
          />
          <Tag k="keywords" />
        </div>
      </div>
    </section>
  );
}

interface Parsed {
  folder: FolderData;
  editor: EditorData;
  skipped: number;
  migratedFrom?: number;
  summary: BackupSummary;
}

export function BackupCard() {
  useEffect(() => void load(), []);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState(false);
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const name = '問卷小幫手整包備份.json';

  const currentText = (): string => bundleBackup(serializeFolderData(getState().data), es().data);

  async function make(): Promise<void> {
    const text = currentText();
    await saveFile(name, text, 'application/json', () => downloadText(name, text));
  }

  async function pick(file: File | undefined): Promise<void> {
    if (!file) return;
    setError(false);
    try {
      const { folder, editor } = unbundleBackup(await file.text());
      const f = parseFolderData(folder);
      const e = parseEditorData(editor);
      setParsed({ folder: f, editor: e.data, skipped: e.skipped, migratedFrom: e.migratedFrom, summary: summarizeBackup(f, e.data) });
      setMode('merge');
    } catch (err) {
      setParsed(null);
      setError(true);
      if (!(err instanceof EditorDataError) && !(err instanceof SyntaxError)) setError(true);
    }
  }

  async function go(): Promise<void> {
    if (!parsed) return;
    if (mode === 'replace') {
      downloadText('問卷小幫手整包備份（還原前）.json', currentText());
      await persist(parsed.folder);
      applyEditorData(parsed.editor);
    } else {
      await persist(mergeFolderData(getState().data, parsed.folder));
      applyEditorData(mergeEditorData(es().data, parsed.editor));
    }
    set({ toast: mode === 'replace' ? B.doneReplace : B.done });
    setParsed(null);
  }

  return (
    <section class="card" data-testid="backup-card">
      <h2>{B.title}</h2>
      <p>
        <strong>{B.hasTitle}</strong>
        {B.has}
      </p>
      <p>
        <strong>{B.notTitle}</strong>
        {B.not}
      </p>
      <Notice kind="warn">{B.warn}</Notice>
      <div class="btn-row">
        <button class="btn secondary" type="button" onClick={() => void make()}>
          {touch ? B.makeTouch : B.make}
        </button>
        <label class="btn secondary">
          {B.pick}
          <input type="file" accept={touch ? undefined : '.json,application/json'} hidden onChange={(e) => void pick((e.target as HTMLInputElement).files?.[0])} />
        </label>
      </div>
      {error && <Notice kind="bad">{B.bad}</Notice>}
      {parsed && (
        <div class="stack" data-testid="restore-panel">
          <h3>{B.summaryTitle}</h3>
          <p>{B.summary(parsed.summary)}</p>
          {parsed.migratedFrom !== undefined && <Notice kind="warn">{B.migrated}</Notice>}
          {parsed.skipped > 0 && <Notice kind="warn">{B.skipped(parsed.skipped)}</Notice>}
          <h3>{B.modeTitle}</h3>
          <div role="radiogroup" aria-label={B.modeTitle} class="stack">
            {(['merge', 'replace'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} class={`pick${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                <strong>{B[m]}</strong>
                <span class="hint">{B[m === 'merge' ? 'mergeNote' : 'replaceNote']}</span>
              </button>
            ))}
          </div>
          <div class="btn-row">
            <button class="btn secondary" type="button" onClick={() => setParsed(null)}>
              {B.cancel}
            </button>
            <button class="btn primary grow" type="button" onClick={() => void go()}>
              {B.go}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
