// DESIGN 5.39 待實作 P1、P2、P4、P5、P6、P7 的驗收（P3 在 export.test.ts、P10 在 cloud-backup.test.ts、P8／P9 在 cloud-card.spec.ts）。資料為虛構。
import { type Page, expect, test } from '@playwright/test';
import { makeXlsx, makeXlsxSheets, surveyFile } from './fixtures';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }, info) => {
  if (info.project.name === 'desktop') await page.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 }));
});

const xlsx = (name: string, buffer: Buffer) => ({ name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
const cols = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

async function openGuide(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Google 表單怎麼設計' }).click();
  await expect(page.getByRole('heading', { name: 'Google 表單教學', level: 1 })).toBeVisible();
}

test('P1：600–1023 教學圖解與題型對照單欄；桌機共同前置多欄', async ({ page }) => {
  await openGuide(page);
  const w = page.viewportSize()!.width;
  const n = await cols(page, '#g1 .dsteps, section:has(.dsteps) .dsteps');
  if (w >= 1024) expect(n).toBeGreaterThan(1);
  else expect(n).toBe(1);
  if (w < 1024) expect(await cols(page, '.typewrap')).toBe(1);
});

test('P2：選單路徑每個「›」與前一詞不斷行，句號併進最後一個小標', async ({ page }) => {
  await openGuide(page);
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    for (const p of document.querySelectorAll<HTMLElement>('.mp-part')) {
      if (getComputedStyle(p).whiteSpace !== 'nowrap') out.push('wrap');
      const next = p.nextElementSibling;
      if (!next && p.parentElement?.nextSibling?.textContent?.match(/^[。，]/)) out.push('lonely-punct');
    }
    for (const s of document.querySelectorAll<HTMLElement>('.mps')) if (s.previousElementSibling === null) out.push('sep-first');
    return out;
  });
  expect(bad).toEqual([]);
  await expect(page.locator('.mp-part').first()).toBeVisible();
});

test('P5：「遇到問題」選帳號圖有標題，檔名與教學一致', async ({ page }) => {
  await openGuide(page);
  await page.locator('summary', { hasText: '遇到問題' }).first().click();
  const fig = page.locator('#g2 .g-chooser');
  await expect(fig.locator('.g-title')).toHaveText('選擇帳戶');
  await expect(fig).toContainText('活動滿意度 (回覆)');
});

async function toMapping(page: Page, book: Buffer) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(xlsx('x.xlsx', book));
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
}

test('P6：桌機待分類每欄一列、三欄對齊；手機平板垂直堆疊', async ({ page }) => {
  const book = makeXlsx(['座號', '姓名', '整體滿意度', '用一個詞形容這次活動', '另一欄'], Array.from({ length: 12 }, (_, i) => [i + 1, `學生${i}`, (i % 5) + 1, `想法${i}`, `備註${i}`]));
  await toMapping(page, book);
  const row = page.getByTestId('pending-col').first();
  await expect(row).toBeVisible();
  const xs = await row.locator(':scope > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  if (page.viewportSize()!.width >= 1024) {
    expect(xs.length).toBe(3);
    expect(xs[0]!).toBeLessThan(xs[1]!);
    expect(xs[1]!).toBeLessThan(xs[2]!);
  } else {
    expect(new Set(xs).size).toBe(1);
  }
});

test('P7：選工作表預覽標題含工作表名', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 600, '手機不顯示預覽');
  const book = makeXlsxSheets([
    { name: '使用說明', headers: ['使用說明'], rows: [['a'], ['b'], ['c'], ['d'], ['e']] },
    { name: '問卷回覆', headers: ['時間戳記', '姓名', '座號', '整體滿意度'], rows: Array.from({ length: 12 }, (_, i) => [`2026-11-01 10:00`, `學生${i}`, i + 1, (i % 5) + 1]) },
  ]);
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(xlsx('y.xlsx', book));
  await expect(page.locator('.sp-preview h2')).toHaveText('前幾列預覽：問卷回覆（共 12 筆）');
});

test('P4：桌機輸出狀態浮層在固定底部操作列之上', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, '桌機才有固定底部操作列');
  test.setTimeout(90_000);
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: /^台風：/ }).click();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await page.locator('.stepper').getByRole('button', { name: /輸出/ }).click();
  await expect(page.getByTestId('output-template').first()).toBeVisible();
  await page.route('**/fonts/*.woff2', (route) => route.abort());
  await page.getByRole('button', { name: 'PDF', exact: true }).last().click();
  const status = page.getByTestId('out-status');
  await expect(status).toContainText('產生失敗');
  const s = (await status.boundingBox())!;
  const bar = (await page.locator('.actbar-fixed').boundingBox())!;
  expect(s.y + s.height).toBeLessThanOrEqual(bar.y);
});
