import { describe, expect, it } from 'vitest';
import { strings } from './strings';
import { en } from './strings.en';

// 英文介面覆蓋率：繁中有的字串，英文都要有，除了下面「尚未翻譯」的整段（退回繁體中文）。
// 2026-11-04 起 google／guide／tpl 也已補上；其中 Google 英文介面名稱尚未走過真實介面，句尾標 (to be verified)（硬規則 10）。
const PENDING: string[] = [];

function missing(z: unknown, e: unknown, path: string, out: string[]): void {
  if (Array.isArray(z)) {
    if (!Array.isArray(e)) out.push(path);
    else if (e.length !== z.length) out.push(`${path}（長度 ${e.length}≠${z.length}）`);
    return;
  }
  if (z && typeof z === 'object') {
    for (const k of Object.keys(z)) missing((z as Record<string, unknown>)[k], (e as Record<string, unknown> | undefined)?.[k], path ? `${path}.${k}` : k, out);
    return;
  }
  if (e === undefined || typeof e !== typeof z) out.push(path);
}

describe('英文介面字串', () => {
  it('除了尚未翻譯的段落，繁中有的鍵英文都有', () => {
    const out: string[] = [];
    for (const k of Object.keys(strings)) if (!PENDING.includes(k)) missing((strings as Record<string, unknown>)[k], (en as Record<string, unknown>)[k], k, out);
    expect(out).toEqual([]);
  });
  it('英文沒有多出繁中不存在的鍵', () => {
    const extra: string[] = [];
    const walk = (e: unknown, z: unknown, path: string) => {
      if (e && typeof e === 'object' && !Array.isArray(e)) {
        for (const k of Object.keys(e)) {
          const zz = (z as Record<string, unknown> | undefined)?.[k];
          if (zz === undefined) extra.push(path ? `${path}.${k}` : k);
          else walk((e as Record<string, unknown>)[k], zz, path ? `${path}.${k}` : k);
        }
      }
    };
    walk(en, strings, '');
    expect(extra).toEqual([]);
  });
  it('函式型字串帶同樣的參數也能產出文字', () => {
    expect(en.stats?.rank?.(1)).toBe('Rank 1');
    expect(en.stats?.rank?.(null)).toBe('—');
    expect(en.method?.trimText?.(0)).toContain('not applied');
    expect(en.check?.scoreLine?.(3, '11', 'outOfRange')).toContain('out of range');
  });
  it('英文字串不含中文字（保留 {姓名} 佔位字與語言名稱）', () => {
    const bad: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'string') {
        const t = v.replace(/\{姓名\}/g, '').replace(/繁體中文/g, '');
        if (/[一-鿿]/.test(t)) bad.push(`${path}: ${v.slice(0, 40)}`);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    };
    walk(en, '');
    expect(bad).toEqual([]);
  });
});
