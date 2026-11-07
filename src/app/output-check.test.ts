// SUR-09：學生版／家長版的預覽必須涵蓋實際下載的 Word／PDF 內容。
// 用虛構資料走完「審稿 → 輸出接線 → 範本編譯 → 產生 Word／PDF」，再解析檔案裡的文字逐項比對。全部是虛構資料。
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { tableFromCsv } from '../core';
import { defaultStatsOpts, runFeedback } from './analysis';
import { analyzeColumns, detectScale } from './columns';
import { emptyCourseState } from './course-app';
import { allPeople, personalInputs, type Audience } from './output';
import { docSignature, docTexts, overrideTexts, teacherCommentHits, textsAdded } from './output-check';
import { personalDocFromTemplate } from './render';
import { emptyReview, setComment, setRewrite, setTeacher } from './review';
import type { Session } from './store';
import { builtinTemplates } from '../editor/builtin';
import type { StudentOverride } from '../editor/overrides';
import type { EditorTemplate } from '../editor/types';
import { renderDocx } from '../export/docx';
import type { DocModel } from '../export/model';
import { renderPdf } from '../export/pdf';
import { nodeFontSource } from '../export/test-support';
import { loadFonts } from '../fonts/loader';

function session(csv: string, roles: Record<string, string>): Session {
  const table = tableFromCsv(csv);
  const cols = analyzeColumns(table).map((c) => ({ ...c, role: (roles[c.header] ?? 'ignore') as never, confirm: false }));
  return {
    fileName: 't.csv', sourceLabel: 'Excel 檔', name: '專題報告', table, cols, kind: 'feedback', kindReason: '', kindConfirmed: true,
    scale: detectScale(table, cols), mappingConfirmed: true, recognition: null, surveyId: 's1', previousRows: null,
    rosterRows: null, rosterMixed: false, rosterSkipped: false, rosterName: '', resolutions: {}, excluded: [], titleMerges: {}, checkHandled: [], course: emptyCourseState(),
    demo: false,
  };
}

// 列號 0～4 對應審稿鍵 f0～f4
const CSV = [
  '填寫者,被評者,內容,台風,意見',
  '王大明,林雅婷,8,9,王大明覺得講得很清楚', // f0 採用：留言裡的名單內姓名要換成「某同學」
  '陳家豪,林雅婷,6,7,張阿姨說你很棒', // f1 採用：名單外人名不會遮蔽，預覽要標出
  '王大明,陳家豪,7,8,還沒審的留言', // f2 未審：學生版、家長版不放
  '林雅婷,陳家豪,5,6,要隱藏的留言', // f3 隱藏
  '林雅婷,王大明,9,9,原本的留言', // f4 改寫
].join('\n');
const ROLES = { 填寫者: 'respondentName', 被評者: 'targetName', 內容: 'score', 台風: 'score', 意見: 'comment' };

const s = session(CSV, ROLES);
const summary = runFeedback(s, defaultStatsOpts());
const raters = summary.targets.map((t) => t.person);
let review = emptyReview('s1');
review = setComment(review, 'f0', 'adopt');
review = setComment(review, 'f1', 'adopt');
review = setComment(review, 'f3', 'hide');
review = setRewrite(review, 'f4', '改寫後的留言');
for (const t of summary.targets) review = setTeacher(review, t.key, `老師給${String(t.person.name)}：和陳家豪合作很好`);

const [PERSONAL, , ADVANCED] = builtinTemplates() as [EditorTemplate, EditorTemplate, EditorTemplate];
const TEMPLATES = [PERSONAL, ADVANCED];
const AUDIENCES: Audience[] = ['student', 'parent'];
/** 範本裡只在有內容時才出現的小標（不是自由文字）。 */
const CONDITIONAL_LABELS = ['同學的留言', '同學的建議', '老師的話'];

const squash = (t: string) => t.replace(/\s+/g, '');
/** 內文（文件標題屬性不在內文裡，另外比對）。 */
const bodyTexts = (doc: DocModel) => docTexts({ ...doc, title: undefined });

async function pdfFile(bytes: Uint8Array): Promise<{ body: string; title: string }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  let body = '';
  for (let i = 1; i <= pdf.numPages; i++) body += (await (await pdf.getPage(i)).getTextContent()).items.map((it) => ('str' in it ? it.str : '')).join('');
  const info = (await pdf.getMetadata()).info as { Title?: string };
  // 輸出器自己加的：條列符號、頁碼
  return { body: squash(body).replace(/•/g, '').replace(/｜第\d+頁，共\d+頁/g, ''), title: info.Title ?? '' };
}
function docxFile(bytes: Uint8Array): { body: string; title: string } {
  const z = unzipSync(bytes);
  const runs = (k: string) => [...strFromU8(z[k]!).matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]!).join('');
  const parts = ['word/header1.xml', 'word/document.xml', 'word/footer1.xml'].filter((k) => z[k]);
  const body = squash(parts.map(runs).join('')).replace(/｜第頁，共頁/g, ''); // 頁碼是欄位，不在 w:t 裡
  const title = /<dc:title>([^<]*)<\/dc:title>/.exec(strFromU8(z['docProps/core.xml']!))?.[1] ?? '';
  return { body, title };
}

describe('文件文字（預覽簽章的來源）', () => {
  it('涵蓋各種區塊，依印出的順序', () => {
    const doc: DocModel = {
      title: '標題屬性',
      footerText: '頁尾',
      lineH: 18,
      deco: { headerText: '頁首' },
      blocks: [
        { type: 'hero', title: '大標', subtitle: '副標', size: 20 },
        { type: 'stats', cards: [{ label: '我的平均', value: '9.0' }] },
        { type: 'columns', cols: [[{ type: 'text', text: '左欄', size: 11 }], [{ type: 'bullets', items: ['條列'], size: 11 }]] },
        { type: 'table', widths: [1], header: ['表頭'], rows: [['格子']], rowH: 20, size: 10 },
        { type: 'callout', tone: 'hint', title: '卡片標題', text: '卡片內文' },
        { type: 'image', png: new Uint8Array([1]), w: 1, h: 1 },
        { type: 'text', text: '   ', size: 11 },
      ],
    };
    expect(docTexts(doc)).toEqual(['標題屬性', '頁首', '大標', '副標', '9.0', '我的平均', '左欄', '條列', '表頭', '格子', '卡片標題', '卡片內文', '頁尾']);
  });
  it('多重集合差：重複的文字要逐筆扣', () => {
    expect(textsAdded(['甲', '乙', '甲', '丙'], ['甲', '乙'])).toEqual(['甲', '丙']);
    expect(textsAdded(['甲'], ['甲', '甲'])).toEqual([]);
  });
});

describe('老師的話的人名提示', () => {
  const people = allPeople(s, summary, raters);
  it('標出名單上其他人的姓名，不標被評者本人', () => {
    const hits = teacherCommentHits('老師給王大明：和陳家豪合作很好', people, '王大明');
    expect(hits.map((h) => h.text)).toEqual(['陳家豪']);
    expect(hits[0]!.level).toBe('high');
  });
  it('也標出可能的名單外人名', () => {
    expect(teacherCommentHits('這次張阿姨也來幫忙', people, '王大明').map((h) => h.text)).toContain('張阿姨');
    expect(teacherCommentHits('繼續保持', people, '王大明')).toEqual([]);
  });
});

describe('SUR-09：預覽與實際 Word／PDF 一致', () => {
  for (const audience of AUDIENCES) {
    for (const tpl of TEMPLATES) {
      it(`${audience}／${tpl.name}：檔案文字＝文件模型，自由文字＝預覽列出的留言與老師的話`, async () => {
        const fonts = await loadFonts(nodeFontSource);
        const list = personalInputs(s, summary, review, audience, raters);
        expect(list).toHaveLength(3);
        for (const p of list) {
          const doc = personalDocFromTemplate(tpl, p.input, { version: audience, school: '示範國中' });
          const want = squash(bodyTexts(doc).join(''));
          const docx = docxFile(await renderDocx(doc));
          const pdf = await pdfFile((await renderPdf(doc, fonts)).bytes);
          // 1. 檔案裡的全部文字就是文件模型的文字（沒有模型以外的內容），所以預覽可以只看模型
          expect(docx.body, `${p.fileName} Word`).toBe(want);
          expect(pdf.body, `${p.fileName} PDF`).toBe(want);
          expect(docx.title).toBe(doc.title);
          expect(pdf.title).toBe(doc.title);
          // 2. 模型裡的自由文字（範本固定字以外）正好是預覽列出的留言與老師的話
          const empty = personalDocFromTemplate(tpl, { ...p.input, praise: [], teacherComment: undefined }, { version: audience, school: '示範國中' });
          const free = textsAdded(docTexts(doc), docTexts(empty)).filter((t) => !CONDITIONAL_LABELS.includes(t));
          const praise = tpl.id === ADVANCED.id ? (p.comments.length ? [p.comments.join('；')] : []) : p.comments;
          expect(free.sort()).toEqual([...praise, p.input.teacherComment!].sort());
          // 3. 隱藏、未審的留言不在檔案裡；名單內姓名在留言裡已遮蔽
          for (const body of [docx.body, pdf.body]) {
            expect(body).not.toContain('要隱藏的留言');
            expect(body).not.toContain('還沒審的留言');
            expect(body).not.toContain('原本的留言');
            expect(body).not.toContain('王大明覺得');
          }
        }
        const lin = list.find((p) => p.input.student.name === '林雅婷')!;
        expect(lin.comments).toEqual(['某同學覺得講得很清楚', '張阿姨說你很棒']);
      }, 60_000);
    }
  }

  it('學生版、家長版的 {全班名次} 一律空白，教師版才有', () => {
    const custom: EditorTemplate = { ...PERSONAL, id: 'my', builtin: false, blocks: [{ id: 'r', kind: 'text', text: '名次：{全班名次}', size: 11 }] };
    for (const audience of ['teacher', ...AUDIENCES] as Audience[]) {
      for (const p of personalInputs(s, summary, review, audience, raters)) {
        const texts = docTexts(personalDocFromTemplate(custom, p.input, { version: audience }));
        expect(texts).toContain(audience === 'teacher' ? `名次：${p.input.stats!.rank}` : '名次：');
      }
    }
    // 進階版的摘要數字列也不放名次卡
    const p = personalInputs(s, summary, review, 'student', raters)[0]!;
    expect(docTexts(personalDocFromTemplate(ADVANCED, p.input, { version: 'student' }))).not.toContain('全班名次');
  });

  it('個別版本改的文字與老師的話會進檔案：預覽要列出，且簽章改變（產生前會要求重新預覽）', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const p = personalInputs(s, summary, review, 'student', raters).find((x) => x.input.student.name === '林雅婷')!;
    const override: StudentOverride = { blocks: { 'p-intro': { patch: { text: '個別版本寫的開場：李小華也很努力' } } }, vars: { 老師評語: '個別版本的老師話' } };
    const doc = personalDocFromTemplate(PERSONAL, p.input, { version: 'student', override });
    const plain = personalDocFromTemplate(PERSONAL, p.input, { version: 'student' });
    const extra = overrideTexts(doc, plain);
    expect(extra).toEqual(['個別版本寫的開場：李小華也很努力', '個別版本的老師話']);
    // 這些文字確實印在 Word 與 PDF 裡，而它們不在原本的留言與老師的話中（以前的預覽看不到）
    const docx = docxFile(await renderDocx(doc));
    const pdf = await pdfFile((await renderPdf(doc, fonts)).bytes);
    for (const t of extra) {
      expect(docx.body).toContain(squash(t));
      expect(pdf.body).toContain(squash(t));
      expect([...p.comments, p.input.teacherComment]).not.toContain(t);
    }
    expect(docSignature(doc)).not.toBe(docSignature(plain));
    expect(overrideTexts(plain, plain)).toEqual([]);
  }, 60_000);

  it('簽章只跟文字有關：審稿或老師的話一改就不同，圖表圖片不影響', () => {
    const p = personalInputs(s, summary, review, 'student', raters)[0]!;
    const base = docSignature(personalDocFromTemplate(PERSONAL, p.input, { version: 'student' }));
    expect(docSignature(personalDocFromTemplate(PERSONAL, { ...p.input, chartPng: new Uint8Array([137, 80, 78, 71]) }, { version: 'student' }))).toBe(base);
    expect(docSignature(personalDocFromTemplate(PERSONAL, { ...p.input, teacherComment: '改過的老師話' }, { version: 'student' }))).not.toBe(base);
    const r2 = setComment(review, 'f2', 'adopt');
    const after = personalInputs(s, summary, r2, 'student', raters).find((x) => x.key === p.key)!;
    if (after.comments.join() !== p.comments.join()) expect(docSignature(personalDocFromTemplate(PERSONAL, after.input, { version: 'student' }))).not.toBe(base);
  });
});
