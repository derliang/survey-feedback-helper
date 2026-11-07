import type { ComponentChildren } from 'preact';
import { strings } from '../strings';

/**
 * 教學字串的標記：**…** ＝ Google 畫面上的按鈕或選單名稱（粗體）；{{甲>乙>丙}} ＝ 選單路徑（每層一個小標）；
 * [[v]] ＝ 「待核對」標籤（文字取自 strings.guide.verifyTag）。字串集中在 strings，標記只在這裡解析。
 */
export function rich(text: string): ComponentChildren {
  return text.split(/(\*\*[^*]+\*\*|\{\{[^}]+\}\}|\[\[v\]\])/g).map((part, i) => {
    if (part.startsWith('**')) {
      return (
        <b class="u" key={i}>
          {part.slice(2, -2)}
        </b>
      );
    }
    if (part.startsWith('{{')) {
      const items = part.slice(2, -2).split('>');
      return (
        <span class="mp" key={i}>
          {items.map((m, j) => (
            <span key={j} class="mp-part">
              {j > 0 && (
                <span class="mps" aria-hidden="true">
                  ›
                </span>
              )}
              <span class="mpi">{m}</span>
            </span>
          ))}
        </span>
      );
    }
    if (part === '[[v]]') {
      return (
        <span class="tag warn" key={i}>
          {strings.guide.verifyTag}
        </span>
      );
    }
    return part;
  });
}
