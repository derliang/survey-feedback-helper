import { describe, expect, it } from 'vitest';
import { findPossibleNames, flagPossibleNames } from './possible-names';
import { scrubNames, pseudonymize } from './anonymize';

const texts = (s: string, o?: Parameters<typeof findPossibleNames>[1]) => findPossibleNames(s, o).map((h) => h.text);

describe('findPossibleNames', () => {
  it('姓名＋稱謂：高信心', () => {
    const hits = findPossibleNames('我覺得陳小明同學報告得很好');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ text: '陳小明同學', kind: 'titled', level: 'high' });
  });
  it('姓氏直接接稱謂、單名加稱謂', () => {
    expect(texts('王老師很棒')).toEqual(['王老師']);
    expect(texts('李華同學很棒')).toEqual(['李華同學']);
  });
  it('前面有稱謂：班長王小明', () => {
    expect(findPossibleNames('多虧班長王小明，幫了大忙')[0]).toMatchObject({ text: '王小明', kind: 'titled' });
  });
  it('暱稱：小林、老李；小王子不算', () => {
    expect(texts('小林很認真')).toEqual(['小林']);
    expect(findPossibleNames('老李來了')[0]?.kind).toBe('nickname');
    expect(findPossibleNames('小王子很好看', { includeLow: false })).toEqual([]);
  });
  it('只有姓氏＋兩字：低信心；一般詞彙不標', () => {
    expect(findPossibleNames('跟隔壁班的李大同一起準備')[0]).toMatchObject({ text: '李大同', kind: 'bare', level: 'low' });
    expect(texts('我很高興，馬上就好，方法很方便')).toEqual([]);
    expect(texts('跟隔壁班的李大同一起準備', { includeLow: false })).toEqual([]);
  });
  it('複姓', () => {
    expect(texts('歐陽同學說的')).toEqual(['歐陽同學']);
  });
  it('沒有姓氏的稱謂（老師、同學）不標', () => {
    expect(texts('老師說得很有道理，同學都同意')).toEqual([]);
    expect(texts('某同學很認真')).toEqual([]);
  });
  it('名單內姓名（含部分重疊）不回報；代號與英數不影響', () => {
    expect(texts('王小明同學很好', { knownNames: ['王小明'] })).toEqual([]);
    expect(texts('S01 與 S02 很好')).toEqual([]);
    const map = pseudonymize([{ class: '301', name: '王小明' }]);
    expect(texts(scrubNames('王小明報告得很好', map))).toEqual([]);
  });
  it('多個命中依序、不重疊；空字串', () => {
    const hits = findPossibleNames('張同學和林同學都很棒');
    expect(hits.map((h) => h.text)).toEqual(['張同學', '林同學']);
    expect(hits[0]!.end).toBeLessThanOrEqual(hits[1]!.start);
    expect(findPossibleNames('')).toEqual([]);
  });
  it('只標示不改文字', () => {
    const s = '黃先生說的';
    findPossibleNames(s);
    expect(s).toBe('黃先生說的');
  });
});

describe('flagPossibleNames', () => {
  it('回傳有命中的留言索引', () => {
    const r = flagPossibleNames(['很好', '陳同學很棒', '老師很好']);
    expect(r.map((x) => x.index)).toEqual([1]);
  });
});
