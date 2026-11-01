import { expect, test } from '@playwright/test';

// Google OAuth 正式版需要公開的隱私權政策網址：建置後 dist 根目錄要有 privacy.html，首頁頁尾要連得到。
test('dist 內有隱私權政策頁，內容完整、版面不橫向捲動', async ({ page }) => {
  const res = await page.goto('privacy.html');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: '隱私權政策' })).toBeVisible();
  await expect(page.getByText('不蒐集任何使用數據').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Privacy Policy (English)' })).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('首頁頁尾有隱私權政策連結，指向 privacy.html', async ({ page }) => {
  await page.goto('./');
  const link = page.getByRole('link', { name: '隱私權政策' });
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  expect(href).toMatch(/\/survey-feedback-helper\/privacy\.html$/);
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  const box = await link.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
