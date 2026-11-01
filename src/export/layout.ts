// 中文換行（PDF 輸出器自己排版；Word 交給 Word 排，靠相同的固定行高與行首禁則達到一致）。

/** 行首禁則：這些標點不可出現在行首。 */
const NO_LINE_START = new Set('，。、；：！？）」』》〉】,.;:!?)]}%');
/** 英數連續字元視為不可拆開的一個單位。 */
const isLatin = (c: string) => /[A-Za-z0-9.%+\-_/@#]/.test(c);

function tokenize(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (const ch of text) {
    if (isLatin(ch)) {
      buf += ch;
      continue;
    }
    if (buf) {
      out.push(buf);
      buf = '';
    }
    out.push(ch);
  }
  if (buf) out.push(buf);
  return out;
}

export type Measure = (text: string) => number;

/** 依寬度換行；`\n` 強制換行。 */
export function wrap(text: string, measure: Measure, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    const tokens = tokenize(para);
    let cur = '';
    for (const t of tokens) {
      if (measure(cur + t) <= maxW || cur === '') {
        cur += t;
        continue;
      }
      // 放不下：換行。下一個字元不得出現在行首時，把目前行尾一個單位帶到下一行
      if (NO_LINE_START.has(t[0]!) && [...cur].length > 1) {
        const chars = [...cur];
        const last = chars.pop()!;
        lines.push(chars.join(''));
        cur = last + t;
      } else {
        lines.push(cur);
        cur = t;
      }
    }
    lines.push(cur);
  }
  return lines;
}
