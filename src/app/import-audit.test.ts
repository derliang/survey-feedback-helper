import { describe, expect, it } from 'vitest';
import { makeXlsxSheets } from '../../tests/e2e/fixtures';
import { findDuplicates } from '../core/check';
import { looksMulti } from './analysis';
import { analyzeColumns, detectScale } from './columns';
import { guessDelimiter, tableFromFile } from './load';
import { tableFromCsv } from '../core';

// 2026-11-03 第三方稽核「問卷匯入與統計主流程」SUR-01～07 的回歸測試；全部是虛構資料。

const bytesFile = (name: string, b: Uint8Array) => ({
  name,
  arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
});
const textFile = (name: string, text: string) => bytesFile(name, new TextEncoder().encode(text));

describe('SUR-01 多工作表 xlsx', () => {
  it('第一張只有說明、第二張才有回覆：讀第二張，不回報空檔', async () => {
    const b = makeXlsxSheets([
      { name: '說明', headers: ['使用說明'], rows: [] },
      { name: '問卷回覆', headers: ['姓名', '分數'], rows: [['王甲', 5], ['李乙', 4]] },
    ]);
    const t = await tableFromFile(bytesFile('多表.xlsx', b));
    expect(t.headers).toEqual(['姓名', '分數']);
    expect(t.rows).toHaveLength(2);
  });
  it('所有工作表都沒有資料列仍回報 empty', async () => {
    const b = makeXlsxSheets([{ name: '說明', headers: ['使用說明'], rows: [] }]);
    await expect(tableFromFile(bytesFile('空.xlsx', b))).rejects.toMatchObject({ reason: 'empty' });
  });
});

describe('SUR-02 TSV 標題含逗號', () => {
  const tsv = '姓名\t"你最喜歡的活動,原因,建議"\n王甲\t"課程,時間安排好"';
  it('引號內的逗號不影響分隔符判斷', () => {
    expect(guessDelimiter(tsv)).toBe('\t');
  });
  it('讀成兩欄、題目與作答完整保留', async () => {
    const t = await tableFromFile(textFile('活動.tsv', tsv));
    expect(t.headers).toEqual(['姓名', '你最喜歡的活動,原因,建議']);
    expect(t.rows[0]?.[1]).toBe('課程,時間安排好');
  });
  it('一般 csv 與 tsv 判斷不變', () => {
    expect(guessDelimiter('a,b,c\n1,2,3')).toBe(',');
    expect(guessDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });
});

describe('SUR-03 評分欄混入一筆文字', () => {
  it('9 筆分數＋1 筆「五分」仍判為評分（待確認），不是選擇題', () => {
    const vals = [5, 4, 3, 2, 4, 5, 3, 4, 2, '五分'];
    const t = tableFromCsv(['課程滿意', ...vals.map(String)].join('\n'));
    const col = analyzeColumns(t)[0];
    expect(col?.role).toBe('score');
    expect(col?.confirm).toBe(true);
  });
  it('一半是文字就不當評分', () => {
    const t = tableFromCsv(['好壞', '好', '壞', '5', '好', '壞', '3', '好', '壞', '好', '壞'].join('\n'));
    expect(analyzeColumns(t)[0]?.role).not.toBe('score');
  });
});

describe('SUR-04 猜不出題型的欄位', () => {
  it('短句開放題有內容卻無法分類：保持略過但標「請確認」', () => {
    const words = ['好', '普通', '不錯', '待加強', '有收穫', '值得', '改善', '很棒', '還好', '清楚', '期待', '謝謝'];
    const t = tableFromCsv(['心得', ...words].join('\n'));
    const col = analyzeColumns(t)[0];
    expect(col?.confirm).toBe(true);
  });
  it('整欄空白不要求確認', () => {
    const t = tableFromCsv('備註,姓名\n,王甲\n,李乙');
    const col = analyzeColumns(t).find((c) => c.header === '備註');
    expect(col?.confirm).toBe(false);
  });
});

describe('SUR-05 單選選項含頓號', () => {
  it('「人文、社會」是單一選項：不判為複選', () => {
    expect(looksMulti(['人文、社會', '自然', '自然', '自然', '自然'])).toBe(false);
  });
  it('同一個含頓號的選項被多人選：仍不判為複選', () => {
    expect(looksMulti(['人文、社會', '人文、社會', '自然', '自然', '自然'])).toBe(false);
  });
  it('真正複選（片段單獨出現或在不同組合中共用）判為複選', () => {
    expect(looksMulti(['籃球, 閱讀', '籃球', '閱讀, 手作', '閱讀'])).toBe(true);
    expect(looksMulti(['籃球, 閱讀', '閱讀, 手作', '籃球, 手作'])).toBe(true);
  });
});

describe('SUR-06 1～5 量表混入單筆 0', () => {
  const scaleOf = (vals: (number | string)[]) => {
    const t = tableFromCsv(['滿意度', ...vals.map(String)].join('\n'));
    const cols = analyzeColumns(t).map((c) => ({ ...c, role: 'score' as const }));
    return detectScale(t, cols);
  };
  it('20 筆 1～5 加 1 筆 0：仍是 1～5', () => {
    expect(scaleOf([...Array.from({ length: 20 }, (_, i) => (i % 5) + 1), 0])).toEqual({ min: 1, max: 5 });
  });
  it('0 很多（真的是 0～10 或 0～5 的量表）不受影響', () => {
    expect(scaleOf([0, 1, 2, 3, 4, 5, 0, 0])).toEqual({ min: 0, max: 10 });
    expect(scaleOf([0, 7, 9, 10])).toEqual({ min: 0, max: 10 });
  });
});

describe('SUR-07 同班同名不同座號', () => {
  const rec = (id: number, seat: number | null) => ({ id, respondent: { class: '三年溫班', name: '王小明', seat } });
  it('座號不同：仍列出但標 seatConflict，不當成確定重複', () => {
    const d = findDuplicates([rec(0, 1), rec(1, 16)], false);
    expect(d).toHaveLength(1);
    expect(d[0]?.seatConflict).toBe(true);
  });
  it('座號相同或未填：照一般重複處理', () => {
    expect(findDuplicates([rec(0, 1), rec(1, 1)], false)[0]?.seatConflict).toBe(false);
    expect(findDuplicates([rec(0, 1), rec(1, null)], false)[0]?.seatConflict).toBe(false);
  });
});
