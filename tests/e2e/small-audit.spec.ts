import { type Page, expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

// 2026-11-14 逐頁版面稽核小改（S1～S10）與 Issue #90、#92 的回歸測試。資料皆為虛構。

async function prepared(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: /^台風：/ }).click();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

test('首頁（S1）：「選擇 Excel 檔」是第一顆主要按鈕，停用的「開啟試算表」排在後面', async ({ page }) => {
  await page.goto('./');
  const names = await page.locator('.open-buttons .btn').allTextContents();
  expect(names[0]).toBe('選擇 Excel 檔');
  expect(names.at(-1)).toBe('開啟試算表');
  await expect(page.locator('.open-buttons .btn').first()).toHaveClass(/primary/);
  await expect(page.getByRole('navigation', { name: '新手協助' })).toBeVisible();
});

test('儲存警示（G1、#90）：沒有審稿變更不顯示；改了才在頁頂出現，可關閉本次', async ({ page }) => {
  await prepared(page);
  await page.locator('.stepper').getByRole('button', { name: /統計/ }).click();
  await expect(page.getByText('全班統計總覽').first()).toBeVisible();
  await expect(page.getByText(/審稿進度尚未成功儲存/)).toHaveCount(0);
  await expect(page.getByTestId('banner-review')).toHaveCount(0);

  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
  await page.getByTestId('comment').first().getByRole('button', { name: '採用' }).click();
  const banner = page.getByTestId('banner-review');
  await expect(banner).toBeVisible();
  // 橫幅在頁面最上方（頂端列之下），不是頁底
  const top = await banner.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThan(140);
  await banner.getByRole('button', { name: '關閉' }).click();
  await expect(banner).toHaveCount(0);
});

test('學生名單（S4）：底部列只有「上一步」「下一步」，略過改成卡內連結', async ({ page }) => {
  await prepared(page);
  const bar = page.locator('.actbar');
  await expect(bar.getByRole('button')).toHaveCount(2);
  await expect(page.locator('.roster-skip').getByRole('button', { name: '這次先不匯入名單' })).toBeVisible();
  // 「開啟名單檔」排在停用的「加入名單」前面
  const order = await page.locator('.btn-row .btn').allTextContents();
  expect(order.indexOf('開啟名單檔')).toBeLessThan(order.indexOf('加入名單'));
});

test('英文介面（#92）：來源標籤「Excel 檔」依語言顯示', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('radio', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await expect(page.locator('.prep-head .meta')).toContainText('Excel file');
  await expect(page.locator('.prep-head .meta')).not.toContainText('Excel 檔');
});
