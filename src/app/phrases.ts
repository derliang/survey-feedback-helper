// 常用評語（R-021、R-022、R-042）：內建六類各 5 句（docs/design/預設常用評語草稿.md，使用者 2026-11-01 裁示照草稿定稿）。
// 老師可新增、改寫、刪除、排序、新增分類；整句可含 {姓名}。不做分數推薦。
import type { Phrase, PhraseCategory } from '../storage';

export const NAME_TOKEN = '{姓名}';
/** 每類句數上限（設計規範：每類 5～8 句）。 */
export const MAX_PER_CATEGORY = 8;
export const MINE_ID = 'mine';

const P = (title: string, text: string): Phrase => ({ title, text });

export const DEFAULT_PHRASES: readonly PhraseCategory[] = [
  {
    id: 'effort',
    name: '稱讚努力與態度',
    phrases: [
      P('很用心', '{姓名}準備得很用心，看得出花了很多時間。'),
      P('持續進步', '{姓名}一次比一次進步，繼續保持。'),
      P('認真負責', '{姓名}對自己的報告很負責，值得肯定。'),
      P('不怕困難', '{姓名}遇到困難沒有放棄，這點很棒。'),
      P('準時完成', '{姓名}準時完成，讓大家能順利進行。'),
    ],
  },
  {
    id: 'result',
    name: '稱讚表現與成果',
    phrases: [
      P('內容充實', '{姓名}的內容很充實，重點清楚。'),
      P('條理清楚', '{姓名}的報告條理分明，聽起來很容易跟上。'),
      P('有自己的想法', '{姓名}能說出自己的看法，不只是複述內容。'),
      P('設計得好', '{姓名}的簡報設計乾淨，圖表也好懂。'),
      P('舉例生動', '{姓名}用的例子很生動，讓人印象深刻。'),
    ],
  },
  {
    id: 'improve',
    name: '具體改進建議',
    phrases: [
      P('再多舉例', '{姓名}下次可以多舉一個例子，讓內容更具體。'),
      P('控制時間', '{姓名}的時間有點趕，下次可以先抓好每一段的長度。'),
      P('聲音再大', '{姓名}的聲音可以再大一點，讓後排也聽得清楚。'),
      P('少看稿', '{姓名}可以試著少看稿，多看看同學。'),
      P('說出感受', '{姓名}可以多說一點自己讀完的感受。'),
    ],
  },
  {
    id: 'encourage',
    name: '鼓勵與期待',
    phrases: [
      P('繼續加油', '{姓名}繼續加油，期待你下一次的表現。'),
      P('相信自己', '{姓名}其實做得很好，要多相信自己。'),
      P('勇敢嘗試', '期待{姓名}勇敢嘗試不同的做法。'),
      P('保持熱情', '{姓名}保持這份熱情，一定會越來越好。'),
      P('看見潛力', '老師看見{姓名}的潛力，一起往前。'),
    ],
  },
  {
    id: 'team',
    name: '合作與人際',
    phrases: [
      P('合作愉快', '{姓名}和組員合作愉快，分工清楚。'),
      P('願意傾聽', '{姓名}願意聽別人的意見，讓討論更順利。'),
      P('幫助同學', '{姓名}會主動幫助同學，很溫暖。'),
      P('有責任感', '{姓名}在小組中很有責任感。'),
      P('溝通清楚', '{姓名}溝通時說得清楚，也不傷人。'),
    ],
  },
  {
    id: 'speak',
    name: '表達與發表',
    phrases: [
      P('勇於發表', '{姓名}勇於上台發表，這一步很不容易。'),
      P('聲音清楚', '{姓名}說話清楚，咬字穩定。'),
      P('台風穩', '{姓名}台風穩，看得出有練習。'),
      P('有互動', '{姓名}會和台下互動，讓大家更投入。'),
      P('結論有力', '{姓名}的結論清楚有力，重點一次說到。'),
    ],
  },
];

/** 老師的評語庫：沒自訂過就用內建六類（複製一份，避免改到常數）。 */
export function phraseLibrary(saved: readonly PhraseCategory[] | undefined): PhraseCategory[] {
  const src = saved ?? DEFAULT_PHRASES;
  return src.map((c) => ({ ...c, phrases: c.phrases.map((p) => ({ ...p })) }));
}

/** 把 {姓名} 換成這位同學的名字；沒有名字時換成「這位同學」。 */
export function fillName(text: string, name: string | undefined): string {
  return text.split(NAME_TOKEN).join(name && name.trim() !== '' ? name.trim() : '這位同學');
}

/** 把文字插在游標處（有選取就取代選取）。回傳新文字與插入後的游標位置。 */
export function insertAt(text: string, start: number, end: number, snippet: string): { text: string; cursor: number } {
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  return { text: text.slice(0, a) + snippet + text.slice(b), cursor: a + snippet.length };
}

/** 存成常用評語前：學生姓名自動換成 {姓名}（R-022）。 */
export function toTemplate(text: string, names: readonly string[]): string {
  let out = text;
  for (const n of [...names].filter((x) => x.trim() !== '').sort((a, b) => b.length - a.length)) out = out.split(n.trim()).join(NAME_TOKEN);
  return out;
}

/** 籌碼短標題：取句首 6 個字（去掉 {姓名}）。 */
export function autoTitle(text: string): string {
  const t = [...text.split(NAME_TOKEN).join('').trim()];
  return t.slice(0, 6).join('');
}

/** 評語庫裡是否已有相同整句（重複時提示不新增）。 */
export function hasPhrase(lib: readonly PhraseCategory[], text: string): boolean {
  return lib.some((c) => c.phrases.some((p) => p.text.trim() === text.trim()));
}

export type AddResult = { ok: true; lib: PhraseCategory[] } | { ok: false; reason: 'empty' | 'duplicate' | 'full' };

/** 新增一句到指定分類；沒有該分類時放進「我的」。 */
export function addPhrase(lib: readonly PhraseCategory[], categoryId: string, text: string, title?: string): AddResult {
  const t = text.trim();
  if (t === '') return { ok: false, reason: 'empty' };
  if (hasPhrase(lib, t)) return { ok: false, reason: 'duplicate' };
  let next = phraseLibrary(lib);
  let cat = next.find((c) => c.id === categoryId);
  if (!cat) {
    cat = next.find((c) => c.id === MINE_ID);
    if (!cat) {
      cat = { id: MINE_ID, name: '我的', phrases: [] };
      next = [...next, cat];
    }
  }
  if (cat.phrases.length >= MAX_PER_CATEGORY) return { ok: false, reason: 'full' };
  cat.phrases.push({ title: (title ?? '').trim() || autoTitle(t), text: t });
  return { ok: true, lib: next };
}

export function updatePhrase(lib: readonly PhraseCategory[], categoryId: string, index: number, patch: Partial<Phrase>): PhraseCategory[] {
  return phraseLibrary(lib).map((c) => (c.id === categoryId ? { ...c, phrases: c.phrases.map((p, i) => (i === index ? { ...p, ...patch } : p)) } : c));
}

export function removePhrase(lib: readonly PhraseCategory[], categoryId: string, index: number): PhraseCategory[] {
  return phraseLibrary(lib).map((c) => (c.id === categoryId ? { ...c, phrases: c.phrases.filter((_, i) => i !== index) } : c));
}

/** 上移（-1）或下移（+1）。 */
export function movePhrase(lib: readonly PhraseCategory[], categoryId: string, index: number, dir: -1 | 1): PhraseCategory[] {
  return phraseLibrary(lib).map((c) => {
    if (c.id !== categoryId) return c;
    const j = index + dir;
    if (j < 0 || j >= c.phrases.length) return c;
    const phrases = [...c.phrases];
    [phrases[index], phrases[j]] = [phrases[j] as Phrase, phrases[index] as Phrase];
    return { ...c, phrases };
  });
}

export function addCategory(lib: readonly PhraseCategory[], name: string): PhraseCategory[] {
  const n = name.trim();
  const next = phraseLibrary(lib);
  if (n === '' || next.some((c) => c.name === n)) return next;
  return [...next, { id: `c${Date.now().toString(36)}${next.length}`, name: n, phrases: [] }];
}

/** 搜尋：標題或整句含關鍵字（跨分類）。 */
export function searchPhrases(lib: readonly PhraseCategory[], q: string): { categoryId: string; index: number; phrase: Phrase }[] {
  const k = q.trim();
  if (k === '') return [];
  const out: { categoryId: string; index: number; phrase: Phrase }[] = [];
  for (const c of lib) c.phrases.forEach((phrase, index) => (phrase.title.includes(k) || phrase.text.includes(k)) && out.push({ categoryId: c.id, index, phrase }));
  return out;
}
