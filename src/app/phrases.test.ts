import { describe, expect, it } from 'vitest';
import { emptyFolderData, mergeFolderData, parseFolderData, serializeFolderData } from '../storage';
import { DEFAULT_PHRASES, MAX_PER_CATEGORY, addCategory, addPhrase, autoTitle, fillName, insertAt, movePhrase, phraseLibrary, removePhrase, searchPhrases, toTemplate, updatePhrase } from './phrases';

describe('常用評語', () => {
  it('內建六類，每類 5 句', () => {
    expect(DEFAULT_PHRASES).toHaveLength(6);
    for (const c of DEFAULT_PHRASES) expect(c.phrases).toHaveLength(5);
  });
  it('fillName 換掉 {姓名}', () => {
    expect(fillName('{姓名}很棒。期待{姓名}。', '小明')).toBe('小明很棒。期待小明。');
    expect(fillName('{姓名}很棒', undefined)).toBe('這位同學很棒');
  });
  it('insertAt 插在游標、取代選取', () => {
    expect(insertAt('ab', 1, 1, 'X')).toEqual({ text: 'aXb', cursor: 2 });
    expect(insertAt('abcd', 1, 3, 'X')).toEqual({ text: 'aXd', cursor: 2 });
    expect(insertAt('ab', 99, 99, 'X').text).toBe('abX');
  });
  it('toTemplate 把學生姓名換回 {姓名}，長名字優先', () => {
    expect(toTemplate('王小明和小明都很棒', ['小明', '王小明'])).toBe('{姓名}和{姓名}都很棒');
  });
  it('autoTitle 取句首 6 字且不含 {姓名}', () => {
    expect(autoTitle('{姓名}準備得很用心，看得出')).toBe('準備得很用心');
  });
  it('addPhrase：空白、重複、額滿都拒絕；成功時放進「我的」', () => {
    const lib = phraseLibrary(undefined);
    expect(addPhrase(lib, 'mine', '  ')).toEqual({ ok: false, reason: 'empty' });
    expect(addPhrase(lib, 'mine', '{姓名}準備得很用心，看得出花了很多時間。')).toEqual({ ok: false, reason: 'duplicate' });
    const r = addPhrase(lib, 'mine', '{姓名}很有幽默感。');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lib.at(-1)).toMatchObject({ id: 'mine', name: '我的' });
    let cur = lib;
    for (let i = 0; i < MAX_PER_CATEGORY - 5; i++) {
      const x = addPhrase(cur, 'effort', `第${i}句`);
      if (x.ok) cur = x.lib;
    }
    expect(addPhrase(cur, 'effort', '再一句')).toEqual({ ok: false, reason: 'full' });
  });
  it('改寫、刪除、排序、新增分類，且不改到內建常數', () => {
    let lib = phraseLibrary(undefined);
    lib = updatePhrase(lib, 'effort', 0, { text: '改過了' });
    expect(lib[0]?.phrases[0]?.text).toBe('改過了');
    expect(DEFAULT_PHRASES[0]?.phrases[0]?.text).not.toBe('改過了');
    lib = movePhrase(lib, 'effort', 0, 1);
    expect(lib[0]?.phrases[1]?.text).toBe('改過了');
    expect(movePhrase(lib, 'effort', 0, -1)).toEqual(lib);
    lib = removePhrase(lib, 'effort', 1);
    expect(lib[0]?.phrases).toHaveLength(4);
    const withNew = addCategory(lib, '科任');
    expect(withNew.at(-1)?.name).toBe('科任');
    expect(withNew).toHaveLength(7);
    expect(addCategory(withNew, '科任')).toHaveLength(7);
  });
  it('搜尋跨分類', () => {
    expect(searchPhrases(phraseLibrary(undefined), '台風')).toHaveLength(1);
    expect(searchPhrases(phraseLibrary(undefined), '')).toEqual([]);
  });
  it('存進設定檔再讀回來不變，合併時保留本機的', () => {
    const lib = phraseLibrary(undefined);
    const text = serializeFolderData({ ...emptyFolderData(), phrases: lib });
    expect(parseFolderData(text).phrases).toEqual(lib);
    expect(parseFolderData(serializeFolderData(emptyFolderData())).phrases).toBeUndefined();
    const merged = mergeFolderData({ ...emptyFolderData(), phrases: lib }, { ...emptyFolderData(), phrases: [] });
    expect(merged.phrases).toEqual(lib);
  });
});
