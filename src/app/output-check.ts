// 學生版／家長版輸出前的預覽核對（SUR-09）：讓預覽與實際產生的 Word／PDF 用同一份文件模型比對。純函式。
import { findPossibleNames, type PossibleName } from '../core/possible-names';
import type { PersonRef } from '../core';
import { normalizeName } from '../core/text';
import type { Block, DocModel } from '../export/model';

/** 文件裡所有會印出的文字（依出現順序；圖片不算）。Word 與 PDF 都只從這份模型輸出，所以這就是檔案的全部文字。 */
export function docTexts(doc: DocModel): string[] {
  const out: string[] = [];
  const add = (t: string | undefined) => {
    if (t !== undefined && t.trim() !== '') out.push(t);
  };
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      switch (b.type) {
        case 'heading':
        case 'text':
          add(b.text);
          break;
        case 'bullets':
          b.items.forEach(add);
          break;
        case 'table':
          b.header.forEach(add);
          b.rows.forEach((r) => r.forEach(add));
          break;
        case 'hero':
          add(b.title);
          add(b.subtitle);
          break;
        case 'stats':
          b.cards.forEach((c) => (add(c.value), add(c.label))); // 數字卡先印大字數值、再印標籤
          break;
        case 'callout':
          add(b.title);
          add(b.text);
          break;
        case 'columns':
          b.cols.forEach(walk);
          break;
        default:
          break;
      }
    }
  };
  add(doc.title);
  add(doc.deco?.headerText);
  walk(doc.blocks);
  add(doc.footerText);
  return out;
}

/** 預覽簽章：文件的全部文字。預覽確認後到真正產生檔案之間若有任何文字改變（審稿、老師評語、範本、個別覆寫），簽章就不同。 */
export const docSignature = (doc: DocModel): string => JSON.stringify(docTexts(doc));

/** a 有、b 沒有的文字（多重集合差，保留 a 的順序）。 */
export function textsAdded(a: readonly string[], b: readonly string[]): string[] {
  const left = new Map<string, number>();
  for (const t of b) left.set(t, (left.get(t) ?? 0) + 1);
  const out: string[] = [];
  for (const t of a) {
    const n = left.get(t) ?? 0;
    if (n > 0) left.set(t, n - 1);
    else out.push(t);
  }
  return out;
}

/** 某位學生的個別覆寫在文件裡多出來（或改掉）的文字：套覆寫的文件減去沒套覆寫的文件。 */
export const overrideTexts = (withOverride: DocModel, without: DocModel): string[] => textsAdded(docTexts(withOverride), docTexts(without));

/**
 * 老師評語裡要提醒的人名：名單上其他人的姓名（老師評語不會自動遮蔽）＋可能的名單外人名。
 * 被評者本人的姓名不標。只標示、不改字。
 */
export function teacherCommentHits(text: string, people: readonly PersonRef[], self: string): PossibleName[] {
  const me = normalizeName(self);
  const hits: PossibleName[] = [];
  const names = [...new Set(people.map((p) => normalizeName(p.name)).filter((n) => n.length >= 2 && n !== me))].sort((a, b) => b.length - a.length);
  for (const n of names) {
    for (let at = text.indexOf(n); at >= 0; at = text.indexOf(n, at + n.length)) {
      if (!hits.some((h) => at < h.end && at + n.length > h.start)) hits.push({ start: at, end: at + n.length, text: n, kind: 'titled', level: 'high' });
    }
  }
  const selfSpans: [number, number][] = [];
  if (me.length >= 2) for (let at = text.indexOf(me); at >= 0; at = text.indexOf(me, at + me.length)) selfSpans.push([at, at + me.length]);
  for (const h of findPossibleNames(text, { includeLow: true })) {
    const overlaps = (s: number, e: number) => h.start < e && h.end > s;
    if (selfSpans.some(([s, e]) => overlaps(s, e)) || hits.some((x) => overlaps(x.start, x.end))) continue;
    hits.push(h);
  }
  return hits.sort((a, b) => a.start - b.start);
}
