import { describe, expect, it } from 'vitest';
import { strings } from './strings';
import { en } from './strings.en';
import { backupStrings, defaultsStrings } from './strings-backup';
import { backupStringsEn, defaultsStringsEn } from './strings-backup.en';
import { extraEn, extraZh } from './strings-extra';
import { edEn, edZh, blockNameUi } from './strings-editor';
import { dgEn, dgZh } from './strings-guide';
import { QUICK_TEMPLATES, templateAsSurvey } from '../app/quick-templates';
import { TEMPLATES_EN, localizeTemplate, questionsAsTextL, templateAsSurveyEn, templateHeadersEn } from '../app/quick-templates.en';
import { recognizeConfig } from '../core';

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

const CJK = /[一-鿿]/;
function shape(v: unknown): unknown {
  if (typeof v === 'function') return 'fn';
  if (typeof v === 'string') return 's';
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]));
  return typeof v;
}
function cjkPaths(v: unknown, path: string, out: string[]): void {
  if (typeof v === 'string') {
    if (CJK.test(v)) out.push(`${path}: ${v.slice(0, 40)}`);
  } else if (typeof v === 'function') {
    // 函式型字串用固定參數產一次文字，確認也沒有中文
    try {
      const r = (v as (...a: unknown[]) => unknown)('A', 2, 3);
      if (typeof r === 'string' && CJK.test(r)) out.push(`${path}()`);
    } catch {
      /* 參數型別不同就略過 */
    }
  } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) cjkPaths(x, `${path}.${k}`, out);
}

describe('英文：備份與三層設定、寫死提示、快速範本', () => {
  it('strings-backup 的英文鍵與繁中完全一致、沒有中文', () => {
    expect(shape(defaultsStringsEn)).toEqual(shape(defaultsStrings));
    expect(shape(backupStringsEn)).toEqual(shape(backupStrings));
    const bad: string[] = [];
    cjkPaths(defaultsStringsEn, 'defaults', bad);
    cjkPaths(backupStringsEn, 'backup', bad);
    expect(bad).toEqual([]);
    expect(backupStringsEn.summary({ surveys: 1, rosters: 2, templates: 3, overrides: 4, settingLayers: 5, images: 6 })).toContain('6 image');
  });
  it('strings-extra（原寫死在 tsx／store 的提示）英文鍵與繁中一致、沒有中文', () => {
    expect(shape(extraEn)).toEqual(shape(extraZh));
    const bad: string[] = [];
    cjkPaths(extraEn, 'extra', bad);
    expect(bad).toEqual([]);
    expect(extraZh.check.rows('3、4')).toBe('第 3、4 列');
    expect(extraEn.check.rows('3, 4')).toBe('Row 3, 4');
  });
  it('strings-guide（教學圖內的字）英文鍵與繁中一致、沒有中文，圖的替代文字都帶「自畫示意」註記', () => {
    expect(shape(dgEn)).toEqual(shape(dgZh));
    const bad: string[] = [];
    cjkPaths(dgEn, 'dg', bad);
    expect(bad).toEqual([]);
    for (const k of Object.keys(dgZh.a)) {
      expect(dgZh.alt((dgZh.a as Record<string, string>)[k]!, false)).toContain('自畫示意，不是截圖');
      expect(dgEn.alt((dgEn.a as Record<string, string>)[k]!, true)).toContain('not a screenshot');
    }
    expect(Object.keys(dgZh.a)).toHaveLength(29);
  });
  it('每份快速範本都有英文版，題數與選項數與繁中一致、沒有中文', () => {
    expect(Object.keys(TEMPLATES_EN).sort()).toEqual(QUICK_TEMPLATES.map((t) => t.id).sort());
    for (const t of QUICK_TEMPLATES) {
      const e = TEMPLATES_EN[t.id]!;
      expect(e.questions.length).toBe(t.questions.length);
      t.questions.forEach((q, i) => expect(e.questions[i]!.options?.length).toBe(q.options?.length));
      const loc = localizeTemplate(t, 'en');
      expect(loc.name).toBe(e.name);
      const bad: string[] = [];
      cjkPaths(loc, t.id, bad);
      expect(bad).toEqual([]);
      expect(questionsAsTextL(loc, 'en')).not.toMatch(CJK);
    }
  });
  it('繁中版不受影響，英文表單匯出檔的標題也能認出是哪份範本', () => {
    expect(localizeTemplate(QUICK_TEMPLATES[0]!, 'zh')).toBe(QUICK_TEMPLATES[0]);
    const cfgs = [...QUICK_TEMPLATES.map(templateAsSurvey), ...QUICK_TEMPLATES.map(templateAsSurveyEn)].map((t) => ({ id: t.id, name: t.name, headers: t.headers, mapping: t.mapping }));
    for (const t of QUICK_TEMPLATES) {
      const hit = recognizeConfig(templateHeadersEn(t), cfgs);
      expect(hit?.config.id).toBe(`tpl-${t.id}`);
    }
  });
});

describe('英文：範本編輯器字串（strings-editor）', () => {
  it('英文鍵與繁中完全一致、沒有中文（函式型字串用固定參數檢查）', () => {
    expect(shape(edEn)).toEqual(shape(edZh));
    const bad: string[] = [];
    cjkPaths(edEn, 'ed', bad);
    expect(bad).toEqual([]);
  });
  it('繁中原文不變，帶參數的字串保留動態值', () => {
    expect(edZh.editNamed('範本A')).toBe('編輯「範本A」');
    expect(edZh.kbPos(2, 5)).toBe('第 2 個，共 5 個');
    expect(edZh.pagesCount(3)).toBe('共 3 頁');
    expect(edEn.kbPos(2, 5)).toBe('Item 2 of 5');
    expect(edEn.indivNote('Amy', 3)).toContain('Amy');
    expect(blockNameUi({ kind: 'hero' })).toBe('標題區');
    expect(blockNameUi({ kind: 'hero', label: '自訂' })).toBe('自訂');
  });
});
