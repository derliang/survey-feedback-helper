import { describe, expect, it } from 'vitest';
import { parseCsv, tableFromCsv, tableFromRows, tableFromSource } from './table';
import { xlsxSource, parseXlsxParts, decodeXml, serialToDate } from './xlsx';
import { FIXTURE_XLSX_BASE64 } from './xlsx.fixture';
import { cellText, normalizeSeat, normalizeName, parseNumber, parseTimestamp, round1, diceSimilarity, levenshtein } from './text';

describe('parseCsv', () => {
  it('處理引號內逗號、換行與跳脫的雙引號', () => {
    expect(parseCsv('a,b\n"x,1","line1\nline2"\n"he said ""hi""",z')).toEqual([
      ['a', 'b'],
      ['x,1', 'line1\nline2'],
      ['he said "hi"', 'z'],
    ]);
  });
  it('BOM、CRLF、結尾換行不產生空列', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('空字串得到空陣列；保留空欄位', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });
  it('最後一列沒有換行也要收進來', () => {
    expect(parseCsv('a\nb')).toEqual([['a'], ['b']]);
  });
});

describe('tableFromRows', () => {
  it('第一個非空白列當標題，略過空白列，資料補齊並去頭尾空白', () => {
    const t = tableFromRows([[], ['姓名', '分數', ''], [' 王小明 ', 8], [null, null], ['李小華']]);
    expect(t.headers).toEqual(['姓名', '分數']);
    expect(t.rows).toEqual([
      ['王小明', 8],
      ['李小華', null],
    ]);
  });
  it('全空輸入得到空表（空表邊界）', () => {
    expect(tableFromRows([])).toEqual({ headers: [], rows: [] });
    expect(tableFromRows([[null, ''], []])).toEqual({ headers: [], rows: [] });
  });
  it('只有標題沒有資料', () => {
    expect(tableFromCsv('a,b\n')).toEqual({ headers: ['a', 'b'], rows: [] });
  });
  it('tableFromSource：沒有工作表時回空表，工作表索引超出也回空表', async () => {
    expect(await tableFromSource({ sheets: async () => [] })).toEqual({ headers: [], rows: [] });
    expect(await tableFromSource({ sheets: async () => [{ name: 's', rows: [['x']] }] }, 3)).toEqual({ headers: [], rows: [] });
  });
});

describe('xlsx 讀取（ExcelJS 產生的虛構檔）', () => {
  const bytes = Uint8Array.from(Buffer.from(FIXTURE_XLSX_BASE64, 'base64'));
  it('讀出工作表名稱（含需跳脫的字元）', async () => {
    const sheets = await xlsxSource(bytes).sheets();
    expect(sheets.map((s) => s.name)).toEqual(['回覆 & 資料', '第二頁']);
  });
  it('字串、日期、數字、小數、布林、公式結果與空格都對', async () => {
    const t = await tableFromSource(xlsxSource(bytes), 0);
    expect(t.headers).toEqual(['時間戳記', '我的名字', '分數（0～10）：', '備註', '已讀']);
    expect(t.rows).toHaveLength(3);
    const [a, b, c] = t.rows;
    expect((a?.[0] as Date).toISOString()).toBe('2026-10-12T14:03:45.000Z');
    expect(a?.slice(1)).toEqual(['王小明', 8, '很好 <讚> & "棒"', true]);
    expect(b?.slice(1)).toEqual(['李小華', 7.5, null, false]);
    expect(c).toEqual([null, '陳大文', 9, '末列', null]);
  });
  it('第二個工作表', async () => {
    expect(await tableFromSource(xlsxSource(bytes.buffer.slice(0) as ArrayBuffer), 1)).toEqual({ headers: ['a', 'b'], rows: [['x', 1]] });
  });
  it('壞檔（不是 zip）會丟錯而不是回傳假資料', async () => {
    await expect(xlsxSource(new Uint8Array([1, 2, 3, 4])).sheets()).rejects.toThrow();
  });
});

describe('parseXlsxParts 邊界', () => {
  it('缺少 workbook 回傳空陣列', () => {
    expect(parseXlsxParts({ workbook: null, rels: null, sharedStrings: null, styles: null, sheet: () => null })).toEqual([]);
  });
  it('內嵌字串、1904 日期系統、字串公式、錯誤值', () => {
    const sheet =
      '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>你好</t></is></c><c r="B1" s="1"><v>0</v></c><c r="C1" t="str"><f>x</f><v>結果</v></c><c r="D1" t="e"><v>#DIV/0!</v></c><c r="F1" t="s"><v>0</v></c></row></sheetData></worksheet>';
    const out = parseXlsxParts({
      workbook: '<workbook><workbookPr date1904="1"/><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>',
      rels: '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      sharedStrings: '<sst><si><r><t>共</t></r><r><t>用</t></r><rPh><t>ignored</t></rPh></si></sst>',
      styles: '<styleSheet><cellXfs><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>',
      sheet: () => sheet,
    });
    expect(out[0]?.rows[0]).toEqual(['你好', new Date(Date.UTC(1904, 0, 1)), '結果', null, null, '共用']);
  });
  it('xml 實體與序號轉日期', () => {
    expect(decodeXml('&lt;a&gt; &amp;amp; &#x4e2d;&#25991;')).toBe('<a> &amp; 中文');
    expect(serialToDate(25569, false).toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('text 工具', () => {
  it('座號容忍 05、5號、全形、數字型別；0 與無數字為 null', () => {
    expect(normalizeSeat('05')).toBe(5);
    expect(normalizeSeat('５號')).toBe(5);
    expect(normalizeSeat(12)).toBe(12);
    expect(normalizeSeat('0')).toBeNull();
    expect(normalizeSeat('')).toBeNull();
    expect(normalizeSeat('無')).toBeNull();
    expect(normalizeSeat(2.5)).toBeNull();
  });
  it('姓名去空白與間隔號、全半形', () => {
    expect(normalizeName(' 王 小 明 ')).toBe('王小明');
    expect(normalizeName('ＡＢＣ')).toBe('ABC');
    expect(normalizeName(null)).toBe('');
  });
  it('parseNumber 嚴格：8分、八、空字串都不是數字', () => {
    expect(parseNumber(' 8 ')).toBe(8);
    expect(parseNumber('７.５')).toBe(7.5);
    expect(parseNumber('8分')).toBeNull();
    expect(parseNumber('八')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber(NaN)).toBeNull();
    expect(parseNumber(Infinity)).toBeNull();
    expect(parseNumber(null)).toBeNull();
  });
  it('parseTimestamp 解析 Google 表單的上午／下午格式與 ISO，壞日期為 null', () => {
    const base = Date.UTC(2026, 9, 12, 14, 3, 45);
    expect(parseTimestamp('2026/10/12 下午 2:03:45')).toBe(base);
    expect(parseTimestamp('2026/10/12 14:03:45')).toBe(base);
    expect(parseTimestamp('2026-10-12T14:03:45')).toBe(base);
    expect(parseTimestamp('2026/10/12 下午 12:00:00')).toBe(Date.UTC(2026, 9, 12, 12));
    expect(parseTimestamp('2026/10/12 上午 12:00:00')).toBe(Date.UTC(2026, 9, 12, 0));
    expect(parseTimestamp(new Date(base))).toBe(base);
    expect(parseTimestamp('2026/02/31 10:00:00')).toBeNull();
    expect(parseTimestamp('昨天')).toBeNull();
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp(new Date('x'))).toBeNull();
  });
  it('round1、相似度、編輯距離', () => {
    expect(round1(2.25)).toBe(2.3);
    expect(round1(8.04)).toBe(8);
    expect(levenshtein('王小明', '王小民')).toBe(1);
    expect(diceSimilarity('', '')).toBe(0);
    expect(diceSimilarity('a', 'a')).toBe(1);
    expect(cellText(new Date('x'))).toBe('');
  });
});
