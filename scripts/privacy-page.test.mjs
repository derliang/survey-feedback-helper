// 隱私權政策頁（public/privacy.html，Google OAuth 正式版要求的公開網址）：
// ①tokens 與 docs/design/tokens.css 一致 ②關鍵聲明與實際做法一致 ③沒有個人信箱 ④英文段落在。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (f) => readFileSync(f, 'utf8').split('\r\n').join('\n');
const page = read('public/privacy.html');
const tokens = read('docs/design/tokens.css').replace(/\/\*[\s\S]*?\*\/\s*/, '').trimEnd();

describe('隱私權政策頁', () => {
  it('內嵌的 tokens 與 docs/design/tokens.css 相同', () => {
    const m = page.match(/\/\* tokens:start[^\n]*\*\/\n([\s\S]*?)\n\/\* tokens:end \*\//);
    expect(m?.[1]).toBe(tokens);
  });
  it('寫明與實際一致的重點', () => {
    for (const s of ['沒有伺服器', '不蒐集任何使用數據', 'drive.file', '預設關閉', '問卷小幫手設定.sfh', '只放在瀏覽器的記憶體', 'Limited Use', '待核對', 'github.com/derliang/survey-feedback-helper/issues']) {
      expect(page, s).toContain(s);
    }
  });
  it('有英文段落，且沒有寫個人信箱', () => {
    expect(page).toMatch(/<section id="english" lang="en"/);
    expect(page).toContain('Privacy Policy (English)');
    expect(page).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});
