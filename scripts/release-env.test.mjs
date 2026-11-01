import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { distHasGoogleConfig, trackedEnvFiles } from './release-env.mjs';

describe('trackedEnvFiles', () => {
  it('只放行 .env.example，其餘 .env* 都算被追蹤', () => {
    const out = ['package.json', '.env.example', '.env', '.env.local', '.env.production.local', 'sub/.env', 'docs/env.md'].join('\n');
    expect(trackedEnvFiles(out)).toEqual(['.env', '.env.local', '.env.production.local', 'sub/.env']);
  });
  it('沒有就回空陣列', () => {
    expect(trackedEnvFiles('a.ts\nb.ts\n')).toEqual([]);
  });
});

describe('distHasGoogleConfig', () => {
  const make = (js) => {
    const d = mkdtempSync(join(tmpdir(), 'sfh-dist-'));
    mkdirSync(join(d, 'assets'));
    writeFileSync(join(d, 'assets', 'a.js'), js);
    return d;
  };
  it('含用戶端 ID 就通過', () => {
    const d = make('const c="123456-abcdef.apps.googleusercontent.com";');
    expect(distHasGoogleConfig(d)).toBe(true);
    rmSync(d, { recursive: true });
  });
  it('沒有就不通過', () => {
    const d = make('const c="";');
    expect(distHasGoogleConfig(d)).toBe(false);
    rmSync(d, { recursive: true });
  });
});
