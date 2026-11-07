import { expect, test } from '@playwright/test';

test('首頁可開啟並顯示標題', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: '問卷回饋小幫手' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '選擇要整理的問卷' })).toBeVisible();
});

test('版面不會橫向捲動', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('觸控裝置回報觸控能力', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', '桌機不模擬觸控');
  await page.goto('./');
  expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
});
