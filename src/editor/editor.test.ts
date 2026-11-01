import { describe, expect, it } from 'vitest';
import { builtinTemplates, SLOTS } from './builtin';
import { compile, type CompileContext } from './compile';
import { describeCondition, evalCondition } from './condition';
import { canRedo, canUndo, commit, createHistory, redo, undo } from './history';
import { ensureEditable, exportTemplate, importTemplate, referencedImages, resetToBuiltin, TemplateImportError } from './library';
import { blankBlock, dropBlock, duplicateBlock, findBlock, insertBlock, moveBlock, removeBlock, setColumnCount, setPage, updateBlock, walk } from './ops';
import { applyOverrides, countOverrides, listOverrides, setBlockOverride, setVarOverride } from './overrides';
import { bundleBackup, EditorDataError, emptyEditorData, parseEditorData, serializeEditorData, unbundleBackup } from './project';
import { emptyLayers, resolveSettings, settingSources } from './settings';
import type { Condition, EBlock, EditorTemplate } from './types';
import { wordNotes } from './word';

let n = 0;
const gen = () => `t${++n}`;
const personal = (): EditorTemplate => builtinTemplates()[0]!;
const ids = (t: EditorTemplate) => t.blocks.map((b) => b.id);

const ctx = (extra: Partial<CompileContext> = {}): CompileContext => ({
  version: 'teacher',
  vars: { 姓名: '王小明', 事項: '分組報告', 班級: '301', 座號: 5, 平均分: '4.2', 班級平均: '3.9', 滿分: 5, 學校: '', },
  slot: () => [],
  ...extra,
});

describe('區塊操作', () => {
  it('插入、刪除、上下移不改原範本', () => {
    const t = personal();
    const before = ids(t);
    const b = blankBlock('text', 'new1');
    const t2 = insertBlock(t, b, 'p-title');
    expect(ids(t2)[1]).toBe('new1');
    expect(ids(t)).toEqual(before);
    expect(ids(insertBlock(t, b, null))[0]).toBe('new1');
    expect(ids(insertBlock(t, b)).at(-1)).toBe('new1');
    expect(ids(removeBlock(t2, 'new1'))).toEqual(before);
    expect(ids(moveBlock(t, 'p-sub', -1))[0]).toBe('p-sub');
    expect(moveBlock(t, 'p-title', -1)).toBe(t); // 邊界原樣回傳
    expect(moveBlock(t, 'nope', 1)).toBe(t);
  });
  it('拖曳排序放前或放後', () => {
    const t = personal();
    expect(ids(dropBlock(t, 'p-teacher', 'p-title', true))[0]).toBe('p-teacher');
    expect(ids(dropBlock(t, 'p-title', 'p-sub', false))[1]).toBe('p-title');
    expect(dropBlock(t, 'p-title', 'p-title', true)).toBe(t);
  });
  it('複製會換新 id，含多欄子區塊', () => {
    let t = personal();
    t = insertBlock(t, blankBlock('columns', 'col1'));
    t = insertBlock(t, blankBlock('text', 'in1'), undefined, { columnsId: 'col1', col: 1 });
    const d = duplicateBlock(t, 'col1', gen);
    const all: string[] = [];
    walk(d.blocks, (b) => all.push(b.id));
    expect(new Set(all).size).toBe(all.length);
    const copy = d.blocks.find((b) => b.kind === 'columns' && b.id !== 'col1');
    expect(copy && copy.kind === 'columns' && copy.cols[1]!.length).toBe(1);
  });
  it('多欄：欄數增減、內容併入最後一欄；不能把多欄拖進自己；區塊可搬進欄', () => {
    let t = insertBlock(personal(), blankBlock('columns', 'c'));
    t = insertBlock(t, blankBlock('text', 'a'), undefined, { columnsId: 'c', col: 0 });
    t = setColumnCount(t, 'c', 3);
    const c3 = findBlock(t, 'c');
    expect(c3?.kind === 'columns' && c3.cols.length).toBe(3);
    t = insertBlock(t, blankBlock('text', 'b'), undefined, { columnsId: 'c', col: 2 });
    t = setColumnCount(t, 'c', 2);
    const c2 = findBlock(t, 'c');
    expect(c2?.kind === 'columns' && c2.cols.map((x) => x.length)).toEqual([1, 1]);
    expect(dropBlock(t, 'c', 'a', true)).toBe(t);
    const moved = dropBlock(t, 'p-title', 'a', true);
    expect(findBlock(moved, 'p-title')).not.toBeNull();
    expect(moved.blocks.find((b) => b.id === 'p-title')).toBeUndefined();
  });
  it('updateBlock 不能改 kind 與 id；undefined 代表移除欄位', () => {
    const t = updateBlock(personal(), 'p-title', { text: '新標題', kind: 'text', id: 'x', color: undefined });
    const b = findBlock(t, 'p-title') as EBlock & { text: string; color?: string };
    expect(b.kind).toBe('heading');
    expect(b.text).toBe('新標題');
    expect('color' in b).toBe(false);
  });
  it('頁面設定', () => {
    const t = setPage(personal(), { size: 'A5', background: '#fff8e1', mx: 40 });
    expect(t.page).toMatchObject({ size: 'A5', background: '#fff8e1', mx: 40 });
    expect('background' in setPage(t, { background: undefined }).page).toBe(false);
  });
});

describe('復原／重做', () => {
  it('復原、重做、新動作清掉重做', () => {
    let h = createHistory(1);
    h = commit(h, 2);
    h = commit(h, 3);
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(h.present).toBe(2);
    expect(canRedo(h)).toBe(true);
    expect(redo(h).present).toBe(3);
    h = commit(h, 9);
    expect(canRedo(h)).toBe(false);
    expect(undo(undo(h)).present).toBe(1);
    expect(undo(undo(undo(h))).present).toBe(1);
  });
  it('同物件不記錄；同鍵連續輸入合併成一步；上限 100 步', () => {
    let h = createHistory({ a: 1 });
    expect(commit(h, h.present)).toBe(h);
    h = commit(h, { a: 2 }, 'type:b1');
    h = commit(h, { a: 3 }, 'type:b1');
    h = commit(h, { a: 4 }, 'type:b1');
    expect(undo(h).present).toEqual({ a: 1 });
    let g = createHistory(0);
    for (let i = 1; i <= 150; i++) g = commit(g, i);
    expect(g.past.length).toBe(100);
  });
});

describe('條件顯示', () => {
  const c = { version: 'parent' as const, vars: { 老師評語: '', 平均: '4.5', 名: '甲' } };
  it('版本與變數', () => {
    expect(evalCondition(undefined, c)).toBe(true);
    expect(evalCondition({ kind: 'version', is: ['teacher'] }, c)).toBe(false);
    expect(evalCondition({ kind: 'version', is: ['teacher', 'parent'] }, c)).toBe(true);
    expect(evalCondition({ kind: 'var', name: '老師評語', op: 'nonEmpty' }, c)).toBe(false);
    expect(evalCondition({ kind: 'var', name: '老師評語', op: 'empty' }, c)).toBe(true);
    expect(evalCondition({ kind: 'var', name: '沒有的', op: 'empty' }, c)).toBe(true);
    expect(evalCondition({ kind: 'var', name: '名', op: 'eq', value: '甲' }, c)).toBe(true);
    expect(evalCondition({ kind: 'var', name: '名', op: 'neq', value: '甲' }, c)).toBe(false);
    expect(evalCondition({ kind: 'var', name: '平均', op: 'gt', value: 4 }, c)).toBe(true);
    expect(evalCondition({ kind: 'var', name: '平均', op: 'lt', value: 4 }, c)).toBe(false);
    expect(evalCondition({ kind: 'var', name: '名', op: 'gt', value: 1 }, c)).toBe(false);
    expect(evalCondition({ kind: 'var', name: '沒有的', op: 'gt', value: 1 }, c)).toBe(false);
  });
  it('組合', () => {
    const t: Condition = { kind: 'version', is: ['parent'] };
    const f: Condition = { kind: 'version', is: ['teacher'] };
    expect(evalCondition({ kind: 'not', cond: f }, c)).toBe(true);
    expect(evalCondition({ kind: 'all', conds: [t, f] }, c)).toBe(false);
    expect(evalCondition({ kind: 'any', conds: [t, f] }, c)).toBe(true);
  });
  it('白話描述', () => {
    expect(describeCondition(undefined)).toBe('一律顯示');
    expect(describeCondition({ kind: 'version', is: ['teacher', 'parent'] })).toBe('只在教師版、家長版顯示');
    expect(describeCondition({ kind: 'var', name: '老師評語', op: 'nonEmpty' })).toBe('{老師評語} 有內容時顯示');
  });
});

describe('單一學生覆寫', () => {
  it('改文字、隱藏、換變數、逐項還原，範本不受影響', () => {
    const t = personal();
    let m = setBlockOverride({}, '301-5', 'p-intro', { patch: { text: '特別的一段話' } });
    m = setBlockOverride(m, '301-5', 'p-h1', { hidden: true });
    m = setVarOverride(m, '301-5', '姓名', '小明');
    expect(countOverrides(m['301-5'])).toBe(3);
    const applied = applyOverrides(t, m['301-5']);
    expect((findBlock(applied, 'p-intro') as { text: string }).text).toBe('特別的一段話');
    expect(findBlock(applied, 'p-h1')).toBeNull();
    expect((findBlock(t, 'p-intro') as { text: string }).text).not.toBe('特別的一段話');
    expect(listOverrides(t, m['301-5']).map((x) => x.what)).toEqual(['改了 text', '隱藏', '換了內容']);
    m = setBlockOverride(m, '301-5', 'p-intro', {});
    m = setBlockOverride(m, '301-5', 'p-h1', {});
    m = setVarOverride(m, '301-5', '姓名', undefined);
    expect(m).toEqual({});
  });
  it('只收允許的欄位（不能改 id／kind／條件）', () => {
    const m = setBlockOverride({}, 's', 'p-intro', { patch: { text: 'x', kind: 'heading', id: 'zz', when: undefined } });
    expect(Object.keys(m.s!.blocks['p-intro']!.patch!)).toEqual(['text']);
  });
  it('多欄裡的區塊也能被覆寫', () => {
    let t = insertBlock(personal(), blankBlock('columns', 'c'));
    t = insertBlock(t, blankBlock('text', 'in'), undefined, { columnsId: 'c', col: 0 });
    const a = applyOverrides(t, setBlockOverride({}, 's', 'in', { hidden: true }).s);
    expect(findBlock(a, 'in')).toBeNull();
  });
});

describe('三層設定', () => {
  it('後面的層蓋前面的，只蓋有設的欄位；標出來源', () => {
    const l = emptyLayers();
    l.global = { school: '某某國中', filenameRule: '{座號}_{姓名}' };
    l.byKind = { feedback: { deidentify: true, filenameRule: '{班級}_{姓名}' } };
    l.run = { deidentify: false, school: undefined };
    const r = resolveSettings(l, 'feedback');
    expect(r).toMatchObject({ school: '某某國中', deidentify: false, filenameRule: '{班級}_{姓名}', version: 'teacher' });
    expect(resolveSettings(l, 'vote').filenameRule).toBe('{座號}_{姓名}');
    const s = settingSources(l, 'feedback');
    expect(s.school).toBe('global');
    expect(s.filenameRule).toBe('kind');
    expect(s.deidentify).toBe('run');
    expect(s.version).toBe('default');
  });
});

describe('編譯成輸出文件', () => {
  it('變數、條件、槽', () => {
    const t = personal();
    const table = { type: 'table' as const, widths: [100], header: ['x'], rows: [['1']], rowH: 20, size: 10 };
    const doc = compile(t, ctx({ slot: (s) => (s === SLOTS.scoreTable ? [table] : []) }));
    expect(doc.blocks[0]).toMatchObject({ type: 'heading', text: '王小明 的分組報告回饋單' });
    expect(doc.blocks.some((b) => b.type === 'table')).toBe(true);
    const heads = (d: typeof doc) => d.blocks.filter((b) => b.type === 'heading').map((b) => (b as { text: string }).text);
    expect(heads(doc)).toEqual(['王小明 的分組報告回饋單', '各向度評分']);
    const withAll = compile(
      t,
      ctx({ vars: { ...ctx().vars, 有優點: 1, 有建議: 1, 老師評語: '加油' }, slot: (s) => (s === 'praise' ? [{ type: 'bullets', items: ['很棒 {姓名}'], size: 11 }] : []) }),
    );
    expect(heads(withAll)).toContain('老師的話');
    expect(withAll.blocks.find((b) => b.type === 'bullets')).toMatchObject({ items: ['很棒 王小明'] });
    expect(withAll.footerText).toBe(' 301 王小明');
  });
  it('版本條件、覆寫、分頁與分隔線、多欄攤平', () => {
    let t: EditorTemplate = { ...personal(), blocks: [] };
    t = insertBlock(t, { ...blankBlock('text', 'x'), when: { kind: 'version', is: ['teacher'] } } as EBlock);
    t = insertBlock(t, blankBlock('divider', 'd'));
    t = insertBlock(t, blankBlock('pageBreak', 'pb'));
    t = insertBlock(t, blankBlock('columns', 'c'));
    t = insertBlock(t, { ...blankBlock('text', 'l'), text: '左' } as EBlock, undefined, { columnsId: 'c', col: 0 });
    t = insertBlock(t, { ...blankBlock('text', 'r'), text: '右' } as EBlock, undefined, { columnsId: 'c', col: 1 });
    expect(compile(t, ctx()).blocks.map((b) => b.type)).toEqual(['text', 'rule', 'pagebreak', 'text', 'text']);
    expect(compile(t, ctx({ version: 'parent' })).blocks.map((b) => b.type)).toEqual(['rule', 'pagebreak', 'text', 'text']);
    const ov = setBlockOverride({}, 's', 'l', { hidden: true }).s;
    expect(compile(t, ctx({ override: ov })).blocks.length).toBe(4);
  });
  it('圖片：有資料才放；頁面大小與橫式', () => {
    let t: EditorTemplate = { ...personal(), blocks: [] };
    t = insertBlock(t, { ...blankBlock('image', 'im'), src: 'logo.png' } as EBlock);
    expect(compile(t, ctx()).blocks.length).toBe(0);
    expect(compile(t, ctx({ image: () => new Uint8Array([1]) })).blocks[0]).toMatchObject({ type: 'image', w: 120 });
    expect(compile(setPage(t, { orientation: 'landscape', size: 'Letter' }), ctx()).page).toMatchObject({ w: 792, h: 612 });
  });
  it('資料槽沒資料時整個區塊略過', () => {
    expect(compile(personal(), ctx()).blocks.some((b) => b.type === 'table' || b.type === 'image')).toBe(false);
  });
});

describe('Word 不支援效果標示', () => {
  it('頁面、底色、多欄、圖表', () => {
    let t = setPage(personal(), { background: '#fffbe6', frame: { color: '#000000', width: 1, rounded: true } });
    t = updateBlock(t, 'p-intro', { bg: '#eeeeff' });
    t = insertBlock(t, blankBlock('columns', 'c'));
    const notes = wordNotes(t);
    const texts = notes.map((x) => x.note).join('|');
    expect(texts).toContain('圓角改直角');
    expect(texts).toContain('背景色');
    expect(notes.some((x) => x.target === 'p-intro')).toBe(true);
    expect(notes.some((x) => x.target === 'c')).toBe(true);
    expect(notes.find((x) => x.target === 'p-chart')?.note).toBe('Word：轉為圖片');
    expect(wordNotes(personal()).map((x) => x.target)).toEqual(['p-chart']);
  });
});

describe('範本庫與匯出入', () => {
  it('內建範本第一次修改複製成我的範本，名稱不重複；恢復預設', () => {
    const b = personal();
    const mine1 = ensureEditable(b, []);
    expect(mine1).toMatchObject({ builtin: false, name: '個人回饋單（我的）' });
    expect(mine1.id).not.toBe(b.id);
    expect(ensureEditable(b, [mine1]).name).toBe('個人回饋單（我的） 2');
    expect(ensureEditable(mine1, [])).toBe(mine1);
    expect(resetToBuiltin('builtin-personal')?.blocks.length).toBe(b.blocks.length);
    expect(resetToBuiltin('nope')).toBeNull();
  });
  it('匯出再匯入：內容相同、id 重發、不是內建', () => {
    const t = insertBlock(ensureEditable(personal(), []), { ...blankBlock('image', 'im'), src: 'logo.png' } as EBlock);
    const text = exportTemplate(t);
    expect(text).not.toContain('"builtin": true');
    const back = importTemplate(text, [t]);
    expect(back.builtin).toBe(false);
    expect(back.name).toBe(`${t.name} 2`);
    expect(back.blocks.length).toBe(t.blocks.length);
    expect(back.blocks.map((b) => b.id).some((id) => ids(t).includes(id))).toBe(false);
    expect(referencedImages(back)).toEqual(['logo.png']);
  });
  it('壞檔與較新版本被拒絕，壞區塊被略過', () => {
    expect(() => importTemplate('not json', [])).toThrow(TemplateImportError);
    expect(() => importTemplate('{"a":1}', [])).toThrow('這不是範本檔');
    expect(() => importTemplate(JSON.stringify({ format: 'sfh-template', version: 9, template: {} }), [])).toThrow('較新');
    const t = importTemplate(JSON.stringify({ format: 'sfh-template', version: 1, template: { name: '  ', blocks: [{ kind: 'bogus' }, { kind: 'text' }, 5], page: { size: 'ZZ', mx: 9999 } } }), []);
    expect(t.name).toBe('匯入的範本');
    expect(t.blocks.length).toBe(1);
    expect(t.blocks[0]).toMatchObject({ kind: 'text', text: '', size: 11 });
    expect(t.page.size).toBe('A4');
    expect(t.page.mx).toBe(56.7);
  });
});

describe('設定檔序列化與版本轉換', () => {
  it('寫出再讀回相同，保留範本 id', () => {
    const d = emptyEditorData();
    d.templates.push(ensureEditable(personal(), []));
    d.settings.global = { school: 'X' };
    d.overrides.s1 = setBlockOverride({}, '301-5', 'p-intro', { hidden: true });
    const { data, skipped, migratedFrom } = parseEditorData(serializeEditorData(d));
    expect(skipped).toBe(0);
    expect(migratedFrom).toBeUndefined();
    expect(data.templates[0]!.id).toBe(d.templates[0]!.id);
    expect(data.templates[0]!.name).toBe(d.templates[0]!.name);
    expect(data.settings.global.school).toBe('X');
    expect(data.overrides.s1).toEqual(d.overrides.s1);
  });
  it('舊版（v1）自動轉換；較新版本與壞檔拒絕', () => {
    const v1 = JSON.stringify({ version: 1, layouts: [{ ...personal(), builtin: false, id: 'old1', name: '舊範本' }, 'bad'], settings: { school: '舊校' } });
    const r = parseEditorData(v1);
    expect(r.migratedFrom).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.data.templates[0]).toMatchObject({ id: 'old1', name: '舊範本' });
    expect(r.data.settings.global.school).toBe('舊校');
    expect(() => parseEditorData('{"version":99}')).toThrow(EditorDataError);
    expect(() => parseEditorData('xx')).toThrow(EditorDataError);
    expect(() => parseEditorData('{"version":0}')).toThrow('不支援');
  });
  it('備份包', () => {
    const u = unbundleBackup(bundleBackup('{"version":1}', emptyEditorData()));
    expect(u.folder).toBe('{"version":1}');
    expect(parseEditorData(u.editor).data.version).toBe(2);
    expect(() => unbundleBackup('{"format":"x"}')).toThrow(EditorDataError);
  });
});

describe('我的範本來源與圖片', () => {
  it('複製自內建範本會記下來源，存檔後仍在；只收圖片 data URL', () => {
    const d = emptyEditorData();
    const mine = ensureEditable(personal(), []);
    expect(mine.basedOn).toBe('builtin-personal');
    d.templates.push(mine);
    d.images = { a: 'data:image/png;base64,AAAA', b: 'javascript:alert(1)' };
    const back = parseEditorData(serializeEditorData(d)).data;
    expect(back.templates[0]!.basedOn).toBe('builtin-personal');
    expect(Object.keys(back.images)).toEqual(['a']);
  });
});
