import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildVersionJson,
  changelogHint,
  changelogSection,
  isValidVersion,
  releaseNotes,
  tagName,
  taipeiDate,
} from './release-meta.mjs';

const SHA = 'a'.repeat(40);

describe('版號與日期', () => {
  it('只接受 x.y.z', () => {
    expect(isValidVersion('1.0.0')).toBe(true);
    for (const v of ['1.0', 'v1.0.0', '1.0.0-beta', '', undefined]) expect(isValidVersion(v)).toBe(false);
  });
  it('日期用台北時間（UTC 16:00 已是隔天）', () => {
    expect(taipeiDate(new Date('2026-10-31T15:59:00Z'))).toBe('2026-10-31');
    expect(taipeiDate(new Date('2026-10-31T16:00:00Z'))).toBe('2026-11-01');
  });
  it('tag 名稱', () => expect(tagName('1.2.3')).toBe('v1.2.3'));
});

describe('version.json', () => {
  it('欄位與格式', () => {
    const j = buildVersionJson({ version: '0.1.0', commit: SHA, now: new Date('2026-11-01T02:00:00Z') });
    expect(j).toEqual({ version: '0.1.0', releaseDate: '2026-11-01', commit: SHA });
    expect(j.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('壞版號或壞 SHA 會丟錯', () => {
    expect(() => buildVersionJson({ version: 'x', commit: SHA })).toThrow();
    expect(() => buildVersionJson({ version: '1.0.0', commit: 'abc' })).toThrow();
  });
});

describe('CHANGELOG 區段', () => {
  const text = '# x\n\n## [Unreleased]\n- a\n\n## [0.2.0] - 2026-11-02\n- new\n\n## [0.1.0] - 2026-11-01\n- first\n';
  it('取出指定版本內文', () => {
    expect(changelogSection(text, '0.2.0')).toBe('- new');
    expect(changelogSection(text, '0.1.0')).toBe('- first');
    expect(changelogSection(text, '9.9.9')).toBeNull();
  });
  it('提示與 Release 說明', () => {
    expect(changelogHint(text, '0.1.0')).toContain('已有');
    expect(changelogHint(text, '9.9.9')).toContain('還沒有');
    expect(releaseNotes(text, '0.1.0', SHA)).toContain(`main @ ${SHA}`);
  });
});

describe('release.mjs dry-run 不動遠端', () => {
  const src = readFileSync(new URL('./release.mjs', import.meta.url), 'utf8');
  it('push、tag、gh release 都只在 --yes 區塊內', () => {
    const idx = src.indexOf('if (!publish) {');
    for (const needle of ["'push'", "'tag'", "'release', 'create'"]) {
      expect(src.indexOf(needle)).toBeGreaterThan(idx);
    }
  });
});
