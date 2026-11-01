import { describe, expect, it } from 'vitest';
import { recognizeConfig } from '../core';
import { barsSvg, svgSize, svgTitle, toPrintSvg } from '../ui/chart-svg';
import { mergeStrings } from '../ui/locale';
import { strings } from '../ui/strings';
import { en } from '../ui/strings.en';
import { QUICK_TEMPLATES, questionHint, questionsAsText, templateAsSurvey, templateHeaders } from './quick-templates';

describe('圖表另存圖片', () => {
  const svg = barsSvg([{ label: '甲', value: 3 }], { title: '第 1 題 "好" & 壞', w: 400 });
  it('換成紙本淺色：不留 CSS 變數，鋪白底', () => {
    const out = toPrintSvg(svg);
    expect(svg).toContain('var(--');
    expect(out).not.toContain('var(--');
    expect(out).toMatch(/^<svg[^>]*><rect width="400"[^>]*fill:#ffffff/);
  });
  it('尺寸與標題取自 SVG', () => {
    expect(svgSize(svg).w).toBe(400);
    expect(svgTitle(svg)).toBe('第 1 題 "好" & 壞');
  });
});

describe('快速範本', () => {
  it('六個範本，題目數與草稿一致，其中一個是票選幹部', () => {
    expect(QUICK_TEMPLATES.map((t) => [t.name, t.questions.length])).toEqual([
      ['活動滿意度', 6],
      ['家長意見', 6],
      ['教學回饋', 7],
      ['學習自評', 9],
      ['報名點名清點', 5],
      ['班規議題票選', 5],
    ]);
    expect(QUICK_TEMPLATES.filter((t) => t.kind === 'vote').map((t) => t.name)).toEqual(['班規議題票選']);
  });
  it('匿名範本沒有姓名題，具名範本前三題是班級、座號、姓名', () => {
    for (const t of QUICK_TEMPLATES) {
      const roles = t.questions.map((q) => q.role);
      if (t.named) expect(roles.slice(0, 3)).toEqual(['respondentClass', 'respondentSeat', 'respondentName']);
      else expect(roles).not.toContain('respondentName');
    }
  });
  it('匯出後的欄位標題會被認成同一份範本，改了題目就不再自動認得（沿用 0.8 門檻，走一般的欄位對應），別的表單也不會誤認', () => {
    const configs = QUICK_TEMPLATES.map(templateAsSurvey).map((t) => ({ id: t.id, name: t.name, headers: t.headers, mapping: t.mapping }));
    for (const t of QUICK_TEMPLATES) {
      const hit = recognizeConfig(templateHeaders(t), configs);
      expect(hit?.config.name).toBe(t.name);
      expect(hit?.exact).toBe(true);
    }
    const act = QUICK_TEMPLATES[0]!;
    const edited = templateHeaders(act);
    edited[2] = '活動內容很有趣';
    expect(recognizeConfig(edited, configs)).toBeNull();
    expect(recognizeConfig(['時間戳記', '完全不同的題目', '另一題'], configs)).toBeNull();
  });
  it('對應：量表題是評分、選擇題是選擇題、留言是開放意見；量表範圍照範本', () => {
    const s = templateAsSurvey(QUICK_TEMPLATES[1]!);
    expect(s.mapping.score).toHaveLength(3);
    expect(s.mapping.choice).toHaveLength(2);
    expect(s.mapping.comment).toHaveLength(1);
    expect(s.mapping.timestamp).toEqual(['時間戳記']);
    expect(s.scale).toEqual({ min: 1, max: 5 });
  });
  it('題目清單純文字：含題號、題型與選項', () => {
    const t = QUICK_TEMPLATES[1]!;
    const text = questionsAsText(t);
    expect(text).toContain('1. 我清楚了解孩子在班上的學習狀況');
    expect(text).toContain('選擇題：更常／維持／更少');
    expect(questionHint(t.questions[0]!, t.scale)).toBe('線性刻度 1～5');
  });
});

describe('英文介面骨架', () => {
  it('只蓋有翻的字，其餘退回繁體中文；函式與陣列整個取代', () => {
    const merged = mergeStrings(strings, en);
    expect(merged.appName).toBe('Survey Feedback Helper');
    expect(merged.steps).toHaveLength(4);
    expect(merged.settingsPage.themes.dark).toBe('Dark');
    expect(merged.review.adopt).toBe(strings.review.adopt);
    expect(merged.folder.reauthTitle('x')).toBe(strings.folder.reauthTitle('x'));
    expect(strings.appName).toBe('問卷回饋小幫手');
  });
  it('英文沒有多出中文版沒有的鍵', () => {
    const walk = (e: Record<string, unknown>, z: Record<string, unknown>, path: string) => {
      for (const [k, v] of Object.entries(e)) {
        expect(k in z, `${path}.${k}`).toBe(true);
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) walk(v as Record<string, unknown>, z[k] as Record<string, unknown>, `${path}.${k}`);
      }
    };
    walk(en as Record<string, unknown>, strings as unknown as Record<string, unknown>, 'en');
  });
});
