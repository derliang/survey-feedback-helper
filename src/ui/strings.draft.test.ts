import { describe, expect, it } from 'vitest';
import { strings } from './strings';
import { en } from './strings.en';

// #224：草稿註記（「待核對」「not yet verified」）不得直接顯示在「存到哪裡」說明
describe('備份說明文案不含草稿註記', () => {
  it('whereRestore 中英文', () => {
    expect(strings.cloud.whereRestore).not.toMatch(/待核對/);
    expect(JSON.stringify(en)).not.toMatch(/not yet verified/);
  });
});

describe('缺字提示不再整串列出（#214）', () => {
  it('超過 8 個時只列前面幾個並註明總數', () => {
    const all = [...'😀😁😂🤣😃😄😅😆😉😊'];
    const msg = strings.output.missingChars(all.slice(0, 8).join(''), all.length);
    expect(msg).toContain('共 10 個');
    expect(msg.length).toBeLessThan(80);
  });
});
