import { describe, expect, it } from 'vitest';
import { makeXlsx } from '../../tests/e2e/fixtures';
import { defaultStatsOpts, looksMulti, opinionQuestions } from './analysis';
import { analyzeColumns, detectScale, inferKind, mappingProblems } from './columns';
import { tableFromFile } from './load';
import type { Session } from './store';

// 多種 Google 表單匯出的虛構樣本（核取方塊、格狀題、線性量表、票選）。
// xlsx 在測試時才產生、不 commit 資料檔；欄位標題的寫法是依公開文件描述自編的近似，尚未對照真實匯出檔（待核對）。

const xlsxFile = (name: string, headers: string[], rows: (string | number)[][]) => {
  const b = makeXlsx(headers, rows);
  return { name, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer };
};

async function sessionOf(name: string, headers: string[], rows: (string | number)[][], kind: Session['kind']): Promise<Session> {
  const table = await tableFromFile(xlsxFile(name, headers, rows));
  const cols = analyzeColumns(table);
  return {
    fileName: name, sourceLabel: 'Excel 檔', name, table, cols, kind, kindReason: '', kindConfirmed: true,
    scale: detectScale(table, cols), mappingConfirmed: true, recognition: null, surveyId: 's', previousRows: null,
    rosterRows: null, rosterMixed: false, rosterSkipped: false, rosterName: '', resolutions: {}, excluded: [], titleMerges: {}, checkHandled: [],
    demo: false,
  };
}

describe('Google 表單樣本：核取方塊（複選）', () => {
  const headers = ['時間戳記', '你參加哪些社團活動？', '還有什麼想說的？'];
  const rows = [
    ['2026-10-01 10:00:00', '籃球, 閱讀, 手作', '希望多辦幾次活動，讓更多同學有機會嘗試新的項目'],
    ['2026-10-01 10:01:00', '籃球', ''],
    ['2026-10-01 10:02:00', '閱讀, 手作', '場地可以再大一點，上課時比較不會擠在一起'],
    ['2026-10-01 10:03:00', '籃球, 閱讀', ''],
  ];
  it('逗號分隔的作答被判為複選，各選項分別計次', async () => {
    const s = await sessionOf('社團調查.xlsx', headers, rows, 'opinion');
    const q = opinionQuestions(s, defaultStatsOpts());
    const choice = q.find((x) => x.kind === 'choice');
    expect(choice).toMatchObject({ kind: 'choice', multi: true });
    const counts = Object.fromEntries((choice as { stat: { counts: { option: string; count: number }[] } }).stat.counts.map((c) => [c.option, c.count]));
    expect(counts).toEqual({ 籃球: 3, 閱讀: 3, 手作: 2 });
  });
  it('單一選項的欄位不會被誤判為複選', () => {
    expect(looksMulti(['籃球', '閱讀', '手作', '閱讀'])).toBe(false);
  });
});

describe('Google 表單樣本：格狀題與線性量表', () => {
  // 格狀題：每一列題目匯出成一欄，標題為「題目 [列名]」
  const headers = ['時間戳記', '對課程的看法 [內容充實]', '對課程的看法 [進度適中]', '對課程的看法 [作業份量]', '整體滿意度（1＝非常不滿意，5＝非常滿意）'];
  const rows = [
    ['2026-10-02 09:00:00', 5, 4, 3, 5],
    ['2026-10-02 09:01:00', 4, 4, 2, 4],
    ['2026-10-02 09:02:00', 3, 5, 4, 4],
    ['2026-10-02 09:03:00', 5, 3, 3, 5],
  ];
  it('每個「[列名]」欄各自成為一題評分，量表為 1～5', async () => {
    const s = await sessionOf('課程回饋.xlsx', headers, rows, 'opinion');
    const scoreCols = s.cols.filter((c) => c.role === 'score');
    expect(scoreCols.map((c) => c.header)).toEqual(headers.slice(1));
    expect(s.scale).toEqual({ min: 1, max: 5 });
    const q = opinionQuestions(s, defaultStatsOpts()).filter((x) => x.kind === 'score');
    expect(q).toHaveLength(4);
    expect((q[0] as { stat: { mean: number | null } }).stat.mean).toBe(4.25);
  });
  it('只有評分欄時不會被判成報告回饋', async () => {
    const s = await sessionOf('課程回饋.xlsx', headers, rows, 'opinion');
    expect(inferKind(s.cols).kind).toBe('opinion');
    expect(mappingProblems('opinion', s.cols)).toEqual([]);
  });
});

describe('Google 表單樣本：核取方塊格狀（每列可複選）', () => {
  const headers = ['時間戳記', '每天使用的裝置 [週間]', '每天使用的裝置 [週末]'];
  const rows = [
    ['2026-10-03 08:00:00', '手機, 平板', '手機, 電腦, 平板'],
    ['2026-10-03 08:01:00', '手機', '手機, 電腦'],
    ['2026-10-03 08:02:00', '手機, 電腦', '平板, 電腦'],
  ];
  it('各列分別判為複選並計次', async () => {
    const s = await sessionOf('裝置.xlsx', headers, rows, 'opinion');
    const choices = opinionQuestions(s, defaultStatsOpts()).filter((x) => x.kind === 'choice');
    expect(choices).toHaveLength(2);
    for (const c of choices) expect(c).toMatchObject({ multi: true });
    const first = choices[0] as { stat: { counts: { option: string; count: number }[] } };
    expect(Object.fromEntries(first.stat.counts.map((c) => [c.option, c.count]))).toMatchObject({ 手機: 3, 電腦: 1, 平板: 1 });
  });
});

describe('Google 表單樣本：票選幹部與空白、缺漏', () => {
  it('標題含「班長」判為票選；整欄空白的題目不當成有效題', async () => {
    const headers = ['時間戳記', '你推薦誰當班長？', '你推薦誰當副班長？', '備註'];
    const rows = [
      ['2026-10-04 12:00:00', '甲小明', '乙小華', ''],
      ['2026-10-04 12:01:00', '乙小華', '甲小明', ''],
    ];
    const s = await sessionOf('選幹部.xlsx', headers, rows, 'vote');
    expect(inferKind(s.cols).kind).toBe('vote');
    expect(s.cols.find((c) => c.header === '備註')?.role).toBe('ignore');
  });
});
