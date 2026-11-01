import { describe, expect, it } from 'vitest';
import { buildMapping, headerSimilarity, normalizeFileTitle, normalizeHeader, recognizeConfig, resolveMapping, suggestRoles, type SavedConfig } from './headers';

const SAMPLE_HEADERS = ['時間戳記', '我的名字', '我的座號', '被回饋者姓名', '她的座號', '她的書名', '簡報內容（充實度）：', '簡報設計：', '開放意見'];

describe('normalizeHeader', () => {
  it('容忍全形冒號、括號與多餘空白', () => {
    expect(normalizeHeader('簡報內容（充實度）：')).toBe(normalizeHeader(' 簡報內容(充實度):  '));
    expect(normalizeHeader('簡報內容（充實度）：')).toBe('簡報內容充實度');
  });
  it('大小寫與全半形英文數字', () => {
    expect(normalizeHeader('Ｑ1 Score')).toBe('q1score');
  });
  it('null 與空白標題得到空字串', () => {
    expect(normalizeHeader(null)).toBe('');
    expect(normalizeHeader('  ：')).toBe('');
  });
});

describe('normalizeFileTitle', () => {
  it('去掉(回覆)、副檔名與多餘空白', () => {
    expect(normalizeFileTitle('讀書心得  (回覆).xlsx')).toBe('讀書心得');
    expect(normalizeFileTitle('讀書心得 (Form Responses 1).xlsx')).toBe('讀書心得');
    expect(normalizeFileTitle('讀書心得.CSV')).toBe('讀書心得');
  });
});

describe('認得讀過', () => {
  const saved: SavedConfig = {
    id: 'c1',
    name: '讀書心得',
    headers: SAMPLE_HEADERS,
    mapping: { timestamp: ['時間戳記'], respondentName: ['我的名字'], score: ['簡報內容（充實度）：', '簡報設計：'] },
  };
  const other: SavedConfig = { id: 'c2', name: '班級投票', headers: ['時間戳記', '班長', '副班長'], mapping: {} };

  it('標題一樣（只差全形半形與空白）→ exact', () => {
    const headers = ['時間戳記', '我的名字', '我的座號', '被回饋者姓名', '她的座號', '她的書名', '簡報內容(充實度):', ' 簡報設計 ：', '開放意見'];
    const r = recognizeConfig(headers, [other, saved]);
    expect(r?.config.id).toBe('c1');
    expect(r?.exact).toBe(true);
  });
  it('多一兩個欄位仍認得，但不是 exact', () => {
    const r = recognizeConfig([...SAMPLE_HEADERS, '新題目'], [saved]);
    expect(r?.config.id).toBe('c1');
    expect(r?.exact).toBe(false);
    expect(r?.similarity).toBeCloseTo(9 / 10);
  });
  it('差太多就不認得；沒有已存設定也不認得', () => {
    expect(recognizeConfig(['a', 'b', 'c'], [saved])).toBeNull();
    expect(recognizeConfig(SAMPLE_HEADERS, [])).toBeNull();
  });
  it('空標題相似度為 0', () => {
    expect(headerSimilarity([], ['a'])).toBe(0);
    expect(headerSimilarity(['', ' '], ['a'])).toBe(0);
  });
  it('套用已存對應：依標題找欄、回報缺少與新增的欄', () => {
    const headers = ['時間戳記', '我的名字', '簡報內容(充實度):', '簡報設計', '新題目'];
    const res = resolveMapping(headers, { ...saved.mapping, comment: ['開放意見'] });
    expect(res.columns).toEqual({ timestamp: [0], respondentName: [1], score: [2, 3], comment: [] });
    expect(res.missing).toEqual([{ role: 'comment', header: '開放意見' }]);
    expect(res.unmapped).toEqual([4]);
  });
  it('重複標題依序取用，不會兩個角色拿到同一欄', () => {
    const res = resolveMapping(['分數', '分數'], { score: ['分數', '分數'] });
    expect(res.columns.score).toEqual([0, 1]);
  });
  it('buildMapping 把索引轉回標題，略過空標題', () => {
    expect(buildMapping(['a', '', 'c'], { score: [0, 1, 2] })).toEqual({ score: ['a', 'c'] });
  });
});

describe('suggestRoles（樣本結構）', () => {
  it('分出填寫者與被評對象、座號、書名、時間戳記', () => {
    const roles = suggestRoles(SAMPLE_HEADERS).map((s) => s.role);
    expect(roles).toEqual(['timestamp', 'respondentName', 'respondentSeat', 'targetName', 'targetSeat', 'bookTitle', null, null, 'comment']);
  });
  it('班級欄與英文 Timestamp', () => {
    expect(suggestRoles(['Timestamp', '班級', '被評班級']).map((s) => s.role)).toEqual(['timestamp', 'respondentClass', 'targetClass']);
  });
});
