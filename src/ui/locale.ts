// 介面語言：繁體中文（預設，集中在 strings.ts）與英文（strings.en.ts，需要時才載入）。
// 英文沒翻到的字，一律退回繁體中文。strings 是同一個物件，換語言時就地改寫，畫面重新繪製就會用新文字。
import { strings, type Strings } from './strings';

export type { Strings };
export type { Lang } from '../storage';
import type { Lang } from '../storage';
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends (...a: never[]) => unknown ? T[K] : T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 以 over 蓋過 base（只蓋有的鍵；陣列與函式整個取代），回傳新物件。 */
export function mergeStrings<T>(base: T, over: unknown): T {
  if (!isObj(base) || !isObj(over)) return (over ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? mergeStrings((base as Record<string, unknown>)[k], v) : v;
  return out as T;
}

const zh: Strings = mergeStrings(strings, {});
let current: Lang = 'zh';

export function currentLang(): Lang {
  return current;
}

/** 切換介面語言。回傳 true 表示有變更（呼叫端要讓畫面重畫）。 */
export async function applyLang(lang: Lang): Promise<boolean> {
  if (lang === current) return false;
  const next: Strings = lang === 'en' ? mergeStrings(zh, (await import('./strings.en')).en) : zh;
  for (const key of Object.keys(next) as (keyof Strings)[]) (strings as Record<string, unknown>)[key] = next[key];
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  return true;
}
