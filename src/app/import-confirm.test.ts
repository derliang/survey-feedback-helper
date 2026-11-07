import { beforeEach, describe, expect, it } from 'vitest';
import { makeXlsxSheets } from '../../tests/e2e/fixtures';
import { tableFromCsv } from '../core';
import {
  analyzeColumns,
  countToConfirm,
  detectScale,
  ignoreAllPending,
  isPending,
  pendingCols,
  pendingFacts,
  scaleDoubt,
  scoreSignature,
  sortedCols,
  withPending,
  withRole,
} from './columns';
import { recommendedSheet, sheetsFromFile } from './load';
import { mappingReady, prepItems } from './progress';
import { cancelSheetPick, confirmSheet, getState, openSurveyFile, pickSheet, requestSheetChange, restart, set, setSession } from './store';

// 匯入確認三畫面（SUR-01／04／06）的邏輯：虛構資料。

const bytesFile = (name: string, b: Uint8Array) => ({
  name,
  arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
});

/** 兩個評分欄加兩個看不出題型的欄（答案短、種類多、不是數字）。 */
const withPendingCsv = () => {
  const rows = Array.from({ length: 12 }, (_, i) => `${i + 1},${(i % 5) + 1},${((i + 1) % 5) + 1},想法${i},備註${i}`);
  return tableFromCsv(['座號,整體滿意度,活動安排,用一個詞形容,另一欄', ...rows].join('\n'));
};

describe('SUR-04 待分類', () => {
  it('猜不出題型、有內容的欄標「待分類」，不算進「N 欄請確認」', () => {
    const cols = analyzeColumns(withPendingCsv());
    const pend = pendingCols(cols);
    expect(pend.map((c) => c.header)).toEqual(['用一個詞形容', '另一欄']);
    expect(pend.every((c) => c.role === 'ignore' && c.confirm && c.unsorted)).toBe(true);
    expect(countToConfirm(cols)).toBe(cols.filter((c) => c.confirm).length - 2);
  });
  it('判斷依據：幾人有填、幾種答案', () => {
    const t = withPendingCsv();
    expect(pendingFacts(t, 3)).toEqual({ filled: 12, distinct: 12 });
  });
  it('分類後移到已處理；改回待分類可反悔', () => {
    const t = withPendingCsv();
    let cols = withRole(analyzeColumns(t), 3, 'comment');
    expect(isPending(cols[3]!)).toBe(false);
    expect(sortedCols(cols).map((c) => c.index)).toEqual([3]);
    expect(pendingCols(cols).map((c) => c.index)).toEqual([4]);
    cols = withPending(cols, 3);
    expect(pendingCols(cols).map((c) => c.index)).toEqual([3, 4]);
    expect(cols[3]!.role).toBe('ignore');
  });
  it('「其餘 N 欄都不使用」：全部算已處理，角色維持不使用', () => {
    const cols = ignoreAllPending(analyzeColumns(withPendingCsv()));
    expect(pendingCols(cols)).toHaveLength(0);
    expect(sortedCols(cols)).toHaveLength(2);
    expect(sortedCols(cols).every((c) => c.role === 'ignore')).toBe(true);
  });
});

describe('SUR-06 量表疑慮', () => {
  const table = (scores: number[][]) => {
    const rows = scores.map((r, i) => `${i + 1},${r.join(',')}`);
    return tableFromCsv(['座號,整體滿意度,活動安排', ...rows].join('\n'));
  };
  const scored = (t: ReturnType<typeof table>) => analyzeColumns(t).map((c) => (c.index >= 1 ? { ...c, role: 'score' as const } : c));
  const many = (n: number, v: number) => Array.from({ length: n }, () => [v, v]);

  it('純 1～5 或有 6 分以上的 0～10：不問', () => {
    const a = table([...many(10, 5), ...many(10, 3), ...many(4, 1)]);
    expect(scaleDoubt(a, scored(a))).toBeNull();
    const b = table([...many(10, 9), ...many(5, 0), ...many(5, 7)]);
    expect(scaleDoubt(b, scored(b))).toBeNull();
  });
  it('1～5 加一筆 0：有疑慮，建議 1～5，直方圖與 0 分出現的欄', () => {
    const t = table([...many(20, 4), [0, 5], ...many(10, 5)]);
    const cols = scored(t);
    const d = scaleDoubt(t, cols)!;
    expect(d.kind).toBe('sporadic');
    expect(d.suggested).toEqual({ min: 1, max: 5 });
    expect(d.zeros).toBe(1);
    expect(d.total).toBe(62);
    expect(d.hist[0]).toMatchObject({ score: 5 });
    expect(d.hist.at(-1)).toMatchObject({ score: 0, n: 1 });
    expect(d.where).toEqual([{ col: '整體滿意度', n: 1 }]);
    expect(detectScale(t, cols)).toEqual({ min: 1, max: 5 });
  });
  it('最大值 ≤5 而 0 分不零星：有疑慮，建議 0～10', () => {
    const t = table([...many(10, 0), ...many(10, 3)]);
    const d = scaleDoubt(t, scored(t))!;
    expect(d.kind).toBe('many');
    expect(d.suggested).toEqual({ min: 0, max: 10 });
  });
  it('評分欄的組合改變才算不同（用來作廢已確認的量表）', () => {
    const t = table(many(10, 3));
    const cols = scored(t);
    expect(scoreSignature(cols)).toBe('1,2');
    expect(scoreSignature(withRole(cols, 2, 'ignore'))).toBe('1');
  });
});

describe('SUR-01 多工作表', () => {
  beforeEach(() => {
    restart();
    set({ sheetPick: null });
  });
  const book = () =>
    makeXlsxSheets([
      { name: '使用說明', headers: ['使用說明'], rows: [['請先填'], ['再交回']] },
      { name: '問卷回覆', headers: ['姓名', '滿意度'], rows: [['王甲', 5], ['李乙', 4], ['陳丙', 3]] },
      { name: '空白', headers: [], rows: [] },
    ]);
  it('列出有資料的工作表、略過空的；建議資料列最多者', async () => {
    const r = await sheetsFromFile(bytesFile('多表.xlsx', book()));
    expect(r.sheets.map((s) => s.name)).toEqual(['使用說明', '問卷回覆']);
    expect(r.skipped).toEqual(['空白']);
    expect(recommendedSheet(r.sheets)).toBe(1);
  });
  it('只有一張有資料：直接開始，不出選擇頁', async () => {
    const b = makeXlsxSheets([
      { name: '說明', headers: [], rows: [] },
      { name: '回覆', headers: ['姓名', '滿意度'], rows: [['王甲', 5]] },
    ]);
    await openSurveyFile(bytesFile('單表.xlsx', b));
    expect(getState().sheetPick).toBeNull();
    expect(getState().session?.sheetPool).toBeNull();
  });
  it('2 張以上：先選（預選建議）；選了才開始，準備資料頁可更換、名單保留、對應重來', async () => {
    await openSurveyFile(bytesFile('多表.xlsx', book()));
    const pick = getState().sheetPick!;
    expect(pick.mode).toBe('open');
    expect(pick.selected).toBe(1);
    expect(getState().session).toBeNull();
    // 先換成說明頁再按上一步：什麼都沒開始
    pickSheet(0);
    cancelSheetPick();
    expect(getState().sheetPick).toBeNull();
    expect(getState().session).toBeNull();

    await openSurveyFile(bytesFile('多表.xlsx', book()));
    confirmSheet();
    const s1 = getState().session!;
    expect(getState().sheetPick).toBeNull();
    expect(s1.table.headers).toEqual(['姓名', '滿意度']);
    expect(s1.sheetPool?.index).toBe(1);
    expect(s1.sheetPool?.sheets).toHaveLength(2);

    setSession({ rosterRows: [{ class: '', seat: '1', name: '王甲' }], rosterName: '我的名單', scaleConfirmed: true, name: '我的問卷' });
    requestSheetChange();
    expect(getState().sheetPick).toMatchObject({ mode: 'change', selected: 1 });
    pickSheet(0);
    confirmSheet();
    const s2 = getState().session!;
    expect(s2.table.headers).toEqual(['使用說明']);
    expect(s2.sheetPool?.index).toBe(0);
    expect(s2.rosterRows).toHaveLength(1);
    expect(s2.rosterName).toBe('我的名單');
    expect(s2.name).toBe('我的問卷');
    expect(s2.surveyId).toBe(s1.surveyId);
    expect(s2.scaleConfirmed).toBe(false);
    expect(s2.kindConfirmed).toBe(false);
  });
});

describe('完成對應的閘門', () => {
  const csv = (() => {
    const rows = Array.from({ length: 12 }, (_, i) => `${i + 1},${(i % 5) + 1},${((i + 1) % 5) + 1},想法${i},備註${i}`);
    return ['座號,整體滿意度,活動安排,用一個詞形容,另一欄', ...rows].join(String.fromCharCode(10));
  })();
  it('還有待分類欄時欄位對應不算完成；分完才算，量表有疑慮時還要確認', async () => {
    await openSurveyFile(bytesFile('活動.csv', new TextEncoder().encode(csv)));
    setSession({ mappingConfirmed: true, kindConfirmed: true });
    let cur = getState().session!;
    expect(pendingCols(cur.cols)).toHaveLength(2);
    expect(mappingReady(cur)).toBe(false);
    expect(prepItems(cur).find((i) => i.key === 'mapping')?.note).toContain('待分類');
    setSession({ cols: ignoreAllPending(cur.cols) });
    cur = getState().session!;
    expect(pendingCols(cur.cols)).toHaveLength(0);
    expect(prepItems(cur).find((i) => i.key === 'mapping')?.state).not.toBe('locked');
  });
  it('量表有疑慮而老師沒確認：不算完成，確認後才算', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => `${i + 1},${i === 0 ? 0 : (i % 5) + 1},${(i % 5) + 1}`);
    await openSurveyFile(bytesFile('量表.csv', new TextEncoder().encode(['座號,整體滿意度,活動安排', ...rows].join(String.fromCharCode(10)))));
    const cols = getState().session!.cols.map((c) => (c.index >= 1 ? { ...c, role: 'score' as const, confirm: false } : { ...c, confirm: false }));
    setSession({ cols, mappingConfirmed: true, kindConfirmed: true, kind: 'opinion' });
    expect(mappingReady(getState().session!)).toBe(false);
    setSession({ scale: { min: 1, max: 5 }, scaleConfirmed: true });
    expect(mappingReady(getState().session!)).toBe(true);
  });
});
