import { describe, expect, it } from 'vitest';
import { QUICK_TEMPLATES } from './quick-templates';
import { TEMPLATES_EN } from './quick-templates.en';

// 語意核實（docs/analysis/2026-11-16-語意高風險核實.md）：範本的預設說明不可承諾目前沒有的功能或保證。
describe('快速範本預設說明不過度承諾', () => {
  const zh = QUICK_TEMPLATES.map((t) => t.defaults ?? '');
  const en = Object.values(TEMPLATES_EN).map((t) => t.defaults ?? '');

  it('不提目前沒有的圖表與班級比較', () => {
    for (const d of zh) expect(d).not.toMatch(/雷達|熱圖|堆疊橫條|不同班級/);
    for (const d of en) expect(d).not.toMatch(/radar|heat ?map|stacked|compare classes/i);
  });

  it('不單獨保證「匿名」：不放姓名題的說明要同時提醒匿名取決於表單設定', () => {
    for (const d of zh) if (d.includes('匿名')) expect(d).toMatch(/設定/);
    for (const d of en) if (/anonymous/i.test(d)) expect(d).toMatch(/settings/i);
  });
});
