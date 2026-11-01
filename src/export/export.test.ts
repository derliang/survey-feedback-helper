import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { xlsxSource } from '../core/xlsx';
import { subsetFor, loadFonts, resetFontCache } from '../fonts/loader';
import { wordFontFor } from '../fonts/word-fonts';
import { renderBatchZip, safeFileName, uniqueNames } from './batch';
import { renderDocx } from './docx';
import { wrap } from './layout';
import { collectChars, fillVars, parseDoc, serializeDoc } from './model';
import { renderPdf } from './pdf';
import { classSummaryDoc, personalFeedbackDoc } from './templates';
import { fakeClassSummary, fakeFeedback, nodeFontSource } from './test-support';
import { buildXlsx, classSummaryXlsx, colName, safeSheetName } from './xlsx';

describe('文件模型', () => {
  it('變數可以是中文，沒有的換成空字串', () => {
    expect(fillVars('{姓名} {座號} 號 {不存在}', { 姓名: '王小明', 座號: 5 })).toBe('王小明 5 號 ');
  });
  it('序列化後還原一致（含圖片）', () => {
    const doc = personalFeedbackDoc({ ...fakeFeedback(), chartPng: new Uint8Array([137, 80, 78, 71, 1, 2, 3]) });
    const back = parseDoc(serializeDoc(doc));
    expect(back).toEqual(doc);
  });
  it('個人回饋單有平均列且被標為強調列', () => {
    const doc = personalFeedbackDoc(fakeFeedback());
    const table = doc.blocks.find((b) => b.type === 'table');
    expect(table?.type === 'table' && table.rows.at(-1)?.[0]).toBe('平均');
    expect(table?.type === 'table' && table.emphasisRows).toEqual([5]);
  });
  it('班級總表欄寬加總等於內容寬度，最後一列是班級平均', () => {
    const doc = classSummaryDoc(fakeClassSummary(10));
    const t = doc.blocks[1]!;
    if (t.type !== 'table') throw new Error('應為表格');
    const total = t.widths.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(doc.page!.w - doc.page!.mx * 2, 3);
    expect(t.rows.at(-1)?.[1]).toBe('班級平均');
    expect(t.header).toHaveLength(t.widths.length);
  });
  it('收集字元：強調列與標題算粗體', () => {
    const doc = personalFeedbackDoc(fakeFeedback());
    const c = collectChars(doc);
    expect(c.bold).toContain('平'); // 平均列
    expect(c.regular).toContain('報');
  });
});

describe('中文換行', () => {
  const m = (s: string) => [...s].length * 10;
  it('標點不出現在行首', () => {
    const lines = wrap('一二三四五，六七八九十', m, 50);
    expect(lines.every((l) => !'，。、'.includes(l[0]!))).toBe(true);
    expect(lines.join('')).toBe('一二三四五，六七八九十');
  });
  it('英數連續字元不拆開', () => {
    expect(wrap('一二三CO2排放', m, 50)[0]).not.toMatch(/C$|CO$/);
  });
  it('換行符號強制換行', () => {
    expect(wrap('甲\n乙', m, 500)).toEqual(['甲', '乙']);
  });
});

describe('xlsx 輸出', () => {
  it('可被自家讀取器讀回（文字與數字）', async () => {
    const inp = fakeClassSummary(5);
    const sheets = await xlsxSource(classSummaryXlsx(inp)).sheets();
    expect(sheets).toHaveLength(1);
    const rows = sheets[0]!.rows;
    expect(rows[0]![0]).toContain('班級總表');
    expect(rows[2]).toEqual(['座號', '姓名', ...inp.items, '平均']);
    expect(rows[3]![1]).toBe(inp.students[0]!.name);
    expect(rows[3]![2]).toBe(inp.students[0]!.values[0]);
    expect(rows.at(-1)![1]).toBe('班級平均');
  });
  it('特殊字元會跳脫、不合法的控制字元被去掉', async () => {
    const bytes = buildXlsx([{ name: 'a/b', rows: [['<&>"\u0001x', 1.25, null]] }]);
    const rows = (await xlsxSource(bytes).sheets())[0]!;
    expect(rows.name).toBe('a_b');
    expect(rows.rows[0]![0]).toBe('<&>"x');
    expect(rows.rows[0]![1]).toBe(1.25);
  });
  it('檔案結構完整，含凍結列與欄寬', () => {
    const files = unzipSync(classSummaryXlsx(fakeClassSummary(3)));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']));
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']!);
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('<cols>');
  });
  it('欄號與工作表名稱', () => {
    expect([colName(0), colName(25), colName(26), colName(701), colName(702)]).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA']);
    const used = new Set<string>();
    expect(safeSheetName('同名', used)).toBe('同名');
    expect(safeSheetName('同名', used)).toBe('同名 (2)');
    expect(safeSheetName('x'.repeat(40), new Set())).toHaveLength(31);
  });
});

describe('批次檔名', () => {
  it('清理非法字元並避免重名', () => {
    expect(safeFileName('a/b:c?.')).toBe('a_b_c_');
    expect(uniqueNames(['01 王小明', '01 王小明', '01 王小明'], '.pdf')).toEqual(['01 王小明.pdf', '01 王小明 (2).pdf', '01 王小明 (3).pdf']);
  });
});

describe('字型管線（真實字型）', () => {
  it('解壓一次後重複使用，子集化後遠小於完整字型，且依字重不同', async () => {
    resetFontCache();
    const fonts = await loadFonts(nodeFontSource);
    expect(await loadFonts(nodeFontSource)).toBe(fonts); // 同一份，不重複解壓
    expect(fonts.ttf.length).toBeGreaterThan(5_000_000);
    const reg = await subsetFor(fonts, 'regular', '問卷回饋小幫手 0123456789');
    const bold = await subsetFor(fonts, 'bold', '問卷回饋小幫手 0123456789');
    expect(reg.length).toBeLessThan(60_000);
    expect(bold.length).toBeLessThan(60_000);
    expect(Buffer.from(reg).equals(Buffer.from(bold))).toBe(false); // 固定了不同字重
    // 輸出是靜態字型：沒有 fvar 變化軸表
    expect(Buffer.from(reg).includes(Buffer.from('fvar'))).toBe(false);
  }, 60_000);
});

describe('PDF／Word／批次輸出', () => {
  it('PDF：個人回饋單、班級總表可產生且為有效 PDF；班級總表多頁時表頭重複', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const one = await renderPdf(personalFeedbackDoc(fakeFeedback()), fonts);
    expect(strFromU8(one.bytes.subarray(0, 5))).toBe('%PDF-');
    expect(one.pageCount).toBe(1);
    expect(one.bytes.length).toBeLessThan(250_000);
    const many = await renderPdf(classSummaryDoc(fakeClassSummary(60)), fonts);
    expect(many.pageCount).toBeGreaterThan(1);
  }, 60_000);

  it('Word：docx 結構正確（字型、橫式、固定行高、表頭重複、頁碼欄位）', async () => {
    const bytes = await renderDocx(classSummaryDoc(fakeClassSummary(40)), { fontName: wordFontFor('windows') });
    const files = unzipSync(bytes);
    const doc = strFromU8(files['word/document.xml']!);
    expect(doc).toContain('Microsoft JhengHei');
    expect(doc).toContain('w:orient="landscape"');
    expect(doc).toContain('w:lineRule="exact"');
    expect(doc).toContain('w:tblHeader');
    expect(doc).toContain('班級平均');
    expect(strFromU8(files['word/footer1.xml']!)).toContain('PAGE');
    expect(strFromU8(files['word/footer1.xml']!)).toContain('NUMPAGES');
    const fb = strFromU8(unzipSync(await renderDocx(personalFeedbackDoc(fakeFeedback()), { fontName: wordFontFor('mac') }))['word/document.xml']!);
    expect(fb).toContain('PingFang TC');
    expect(fb).toContain('平均');
  });

  it('批次 zip：每位學生一個 PDF，檔名不重複，進度回報', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const progress: number[] = [];
    const items = [1, 2, 3].map((seat) => ({ name: '同名', doc: personalFeedbackDoc(fakeFeedback(seat)) }));
    const zip = await renderBatchZip(items, fonts, (d) => progress.push(d));
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual(['同名 (2).pdf', '同名 (3).pdf', '同名.pdf']);
    expect(progress).toEqual([1, 2, 3]);
    for (const f of Object.values(files)) expect(strFromU8(f.subarray(0, 5))).toBe('%PDF-');
  }, 60_000);
});

// 手動檢查用：EXPORT_DUMP_DIR=某資料夾 npx vitest run src/export/export.test.ts，會把輸出檔寫出來，拿去 Word／Excel 開。
describe.skipIf(!process.env.EXPORT_DUMP_DIR)('輸出檔傾印（手動）', () => {
  it('寫出 xlsx／docx／pdf', async () => {
    const dir = process.env.EXPORT_DUMP_DIR!;
    mkdirSync(dir, { recursive: true });
    const fonts = await loadFonts(nodeFontSource);
    writeFileSync(`${dir}/班級總表.xlsx`, classSummaryXlsx(fakeClassSummary(35)));
    writeFileSync(`${dir}/班級總表.docx`, await renderDocx(classSummaryDoc(fakeClassSummary(35))));
    writeFileSync(`${dir}/個人回饋單.docx`, await renderDocx(personalFeedbackDoc(fakeFeedback(3, 8))));
    writeFileSync(`${dir}/個人回饋單.pdf`, (await renderPdf(personalFeedbackDoc(fakeFeedback(3, 8)), fonts)).bytes);
  }, 60_000);
});
