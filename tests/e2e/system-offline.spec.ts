import { expect, test } from '@playwright/test';
import { settingsTab } from './fixtures';

// #181：離線提示、設定頁安裝說明、第一次載入畫面。皆不含任何資料。

test('離線時頁首出現提示，恢復連線後消失', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByTestId('banner-offline')).toHaveCount(0);
  await context.setOffline(true);
  await expect(page.getByTestId('banner-offline')).toContainText('目前沒有網路');
  await context.setOffline(false);
  await expect(page.getByTestId('banner-offline')).toHaveCount(0);
});

test('設定「說明」：有 Chrome／Edge 與 Safari 兩組編號安裝步驟', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await settingsTab(page, 'help');
  await page.getByTestId('help-card').locator('summary').click();
  const help = page.getByTestId('install-help');
  await expect(help.getByRole('heading', { name: '安裝到主畫面或桌面' })).toBeVisible();
  await expect(help.locator('ol')).toHaveCount(2);
  await expect(help.locator('ol').nth(1)).toContainText('加入主畫面');
});

test('第一次載入：主程式延遲時看得到品牌、準備中與「不含學生資料」說明', async ({ page }) => {
  await page.route('**/assets/index-*.js', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'commit' });
  await expect(page.locator('body')).toContainText('正在準備', { timeout: 1200 });
  await expect(page.locator('body')).toContainText('不含任何學生資料');
  await expect(page.getByRole('heading', { name: '選擇要整理的問卷' })).toBeVisible({ timeout: 10_000 });
});
