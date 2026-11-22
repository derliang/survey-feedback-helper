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
