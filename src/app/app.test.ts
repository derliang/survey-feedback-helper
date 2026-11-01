import { describe, expect, it } from 'vitest';
import { analyzeColumns, applySavedMapping, detectScale, inferKind, mappingProblems, toSavedMapping } from './columns';
import { LoadError, decodeCsv, guessDelimiter, surveyNameFromFile, tableFromFile } from './load';
import { parsePastedRoster, rosterRowsFromTable } from './roster-input';
import { tableFromCsv } from '../core';
import { emptyFolderData, mergeFolderData, parseFolderData, recentSurveys, serializeFolderData, upsertSurvey } from '../storage';
import type { SavedSurvey } from '../storage';

// 全部是虛構資料
const CSV = [
  '時間戳記,我的名字,她的座號,被回饋者姓名,她的書名,簡報內容（充實度）：,台風,同學的具體回饋',
  '2026-10-12 13:02:11,王大明,2,林雅婷,被討厭的勇氣,8,9,講得很清楚',
  '2026-10-12 13:05:40,林雅婷,1,王大明,被討厭的勇氣（全新版）,7,8,',
  '2026-10-12 13:06:00,陳家豪,1,王大明,小王子,9,10,很有自信',
].join('\n');

const file = (name: string, text: string | Uint8Array) => ({
  name,
  arrayBuffer: async () => {
    const b = typeof text === 'string' ? new TextEncoder().encode(text) : text;
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  },
});

describe('開檔', () => {
  it('讀 csv，檔名多餘空白與副檔名大小寫不影響', async () => {
    const t = await tableFromFile(file('讀書報告  回饋 (回覆).CSV', CSV));
    expect(t.rows).toHaveLength(3);
    expect(t.headers[1]).toBe('我的名字');
    expect(surveyNameFromFile('讀書報告  回饋 (回覆).xlsx')).toBe('讀書報告 回饋 (回覆)');
  });
  it('不支援的格式與舊版 xls 給出明確原因', async () => {
    await expect(tableFromFile(file('a.pdf', 'x'))).rejects.toMatchObject({ reason: 'unsupported' });
    await expect(tableFromFile(file('a.xls', 'x'))).rejects.toBeInstanceOf(LoadError);
    await expect(tableFromFile(file('a.xls', 'x'))).rejects.toMatchObject({ reason: 'oldExcel' });
  });
  it('空檔案與損毀的 xlsx', async () => {
    await expect(tableFromFile(file('a.csv', '標題\n'))).rejects.toMatchObject({ reason: 'empty' });
    await expect(tableFromFile(file('a.xlsx', new Uint8Array([1, 2, 3, 4])))).rejects.toMatchObject({ reason: 'unreadable' });
  });
  it('tsv 與 Big5 的 csv', () => {
    expect(guessDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    expect(decodeCsv(new TextEncoder().encode('姓名,座號'))).toBe('姓名,座號');
    const big5 = new Uint8Array([0xa4, 0xa4, 0xa4, 0xe5]); // 中文（Big5）
    expect(decodeCsv(big5)).toBe('中文');
  });
});

describe('欄位對應', () => {
  const table = tableFromCsv(CSV);
  it('依標題與內容判斷角色，沒把握的標請確認', () => {
    const cols = analyzeColumns(table);
    const role = (h: string) => cols.find((c) => c.header === h);
    expect(role('我的名字')?.role).toBe('respondentName');
    expect(role('被回饋者姓名')?.role).toBe('targetName');
    expect(role('她的座號')?.role).toBe('targetSeat');
    expect(role('簡報內容（充實度）：')).toMatchObject({ role: 'score', confirm: true });
    expect(role('同學的具體回饋')).toMatchObject({ role: 'comment', confirm: true });
    expect(role('時間戳記')).toMatchObject({ role: 'timestamp', confirm: false });
  });
  it('判斷問卷類型與缺什麼', () => {
    const cols = analyzeColumns(table);
    expect(inferKind(cols).kind).toBe('feedback');
    expect(mappingProblems('feedback', cols)).toEqual([]);
    const noTarget = cols.map((c) => (c.role === 'targetName' ? { ...c, role: 'ignore' as const } : c));
    expect(mappingProblems('feedback', noTarget).join()).toContain('被評對象姓名');
  });
  it('量表範圍：有 10 就是 0～10', () => {
    expect(detectScale(table, analyzeColumns(table))).toEqual({ min: 0, max: 10 });
  });
  it('已存對應容忍全形冒號、括號與空白，新增欄位仍待確認', () => {
    const cols = analyzeColumns(table);
    const saved = toSavedMapping(cols);
    const changed = tableFromCsv(CSV.replace('簡報內容（充實度）：', '簡報內容 (充實度) :').replace('台風', '台風 ') + '').headers;
    expect(changed).toContain('簡報內容 (充實度) :');
    const t2 = { headers: [...changed, '新題目'], rows: table.rows.map((r) => [...r, 5]) };
    const applied = applySavedMapping(t2, saved);
    expect(applied.find((c) => c.header === '簡報內容 (充實度) :')).toMatchObject({ role: 'score', confirm: false });
    expect(applied.find((c) => c.header === '新題目')?.confirm).toBe(true);
  });
});

describe('名單輸入', () => {
  it('貼上：座號 姓名；沒有座號自動補', () => {
    expect(parsePastedRoster('1 王大明\n2\t林雅婷', false, '三年二班')).toEqual([
      { class: '三年二班', seat: '1', name: '王大明' },
      { class: '三年二班', seat: '2', name: '林雅婷' },
    ]);
    expect(parsePastedRoster('王大明\n林雅婷', false).map((r) => r.seat)).toEqual(['1', '2']);
    expect(parsePastedRoster('二班 3 張小美', true)[0]).toEqual({ class: '二班', seat: '3', name: '張小美' });
  });
  it('名單檔：找班級、座號、姓名欄', () => {
    const rows = rosterRowsFromTable(['班級', '座號', '姓名'], [['二班', 1, '王大明']]);
    expect(rows).toEqual([{ class: '二班', seat: '1', name: '王大明' }]);
    expect(rosterRowsFromTable(['座號'], [[1]])).toBeNull();
  });
});

describe('設定檔', () => {
  const survey: SavedSurvey = {
    id: 'a',
    name: '測試問卷',
    kind: 'feedback',
    sourceLabel: 'Excel 檔',
    headers: ['a', 'b'],
    mapping: { respondentName: ['a'] },
    labels: { b: '乙' },
    scale: { min: 0, max: 10 },
    lastUsed: '2026-10-12',
    rowCount: 12,
    rosterId: null,
  };
  it('存取一輪不變，且不含作答內容', () => {
    const data = upsertSurvey(emptyFolderData(), survey);
    const text = serializeFolderData(data);
    expect(parseFolderData(text)).toEqual(data);
    expect(text).not.toContain('講得很清楚');
  });
  it('壞檔丟錯、合併保留較新、最近依日期排序', () => {
    expect(() => parseFolderData('{"version":2}')).toThrow();
    expect(() => parseFolderData('不是 JSON')).toThrow();
    const newer = { ...survey, lastUsed: '2026-10-20', rowCount: 30 };
    const merged = mergeFolderData(upsertSurvey(emptyFolderData(), survey), upsertSurvey(emptyFolderData(), newer));
    expect(merged.surveys).toEqual([newer]);
    const other = { ...survey, id: 'b', lastUsed: '2026-11-01' };
    expect(recentSurveys(upsertSurvey(merged, other)).map((s) => s.id)).toEqual(['b', 'a']);
  });
  it('缺欄位的舊檔也能讀', () => {
    const data = parseFolderData('{"version":1,"surveys":[{"id":"x","headers":["h"]}]}');
    expect(data.surveys[0]).toMatchObject({ id: 'x', name: '未命名問卷', kind: 'opinion', scale: { min: 1, max: 5 } });
  });
});
