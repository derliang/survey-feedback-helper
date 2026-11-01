import { type Page, expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

/** 開檔、確認類型與欄位對應（台風改成評分），停在準備資料，之後用上方步驟列前往統計。 */
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

const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });

test('統計：全班總覽、個人結果、自評對他評與審稿', async ({ page }) => {
  await prepared(page);
  await step(page, '統計').click();
  await expect(page.getByRole('heading', { name: '統計', level: 1 })).toBeVisible();
  await expect(page.getByText('全班總覽').first()).toBeVisible();
  await expect(page.locator('.chart svg').first()).toBeVisible();
  await noOverflow(page);

  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
  await expect(page.getByRole('heading', { name: '自評對他評' })).toBeVisible();
  await expect(page.getByTestId('comment').first()).toBeVisible();
  await noOverflow(page);

  // 採用一則、隱藏一則，狀態立刻改變
  const first = page.getByTestId('comment').first();
  await first.getByRole('button', { name: '採用' }).click();
  await expect(first).toContainText('已採用');
  await page.getByRole('button', { name: '還原' }).first().click();
  await expect(first).toContainText('未審');

  // 老師評語
  await page.getByRole('textbox', { name: '老師評語' }).fill('報告很有條理，繼續加油。');
  await expect(page.getByRole('textbox', { name: '老師評語' })).toHaveValue('報告很有條理，繼續加油。');

  // 去極端值設定
  await page.getByRole('radio', { name: /各去 1 個最高、最低/ }).click();
  await expect(page.getByRole('radio', { name: /各去 1 個最高、最低/ })).toHaveAttribute('aria-checked', 'true');

  // 統計方法說明
  await page.getByRole('button', { name: '統計方法說明' }).click();
  await expect(page.getByRole('heading', { name: '統計方法說明' })).toBeVisible();
  await expect(page.getByText(/母體標準差/)).toBeVisible();
  await noOverflow(page);
});

test('輸出：學生版要先預覽，班級總表與批次 PDF 可下載', async ({ page }) => {
  test.setTimeout(120_000);
  await prepared(page);
  await step(page, '輸出').click();
  await expect(page.getByRole('heading', { name: '輸出', level: 1 })).toBeVisible();
  await noOverflow(page);

  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Excel/ }).first().click()]);
  expect(dl.suggestedFilename()).toBe('讀書報告回饋 (回覆) 班級總表.xlsx');

  await page.getByRole('radio', { name: '學生版' }).click();
  const batch = page.getByRole('button', { name: /^全部 \d+ 位/ });
  await expect(batch).toBeDisabled();
  await page.getByRole('button', { name: '先預覽學生版' }).click();
  await expect(page.getByTestId('preview')).toBeVisible();
  await expect(page.getByRole('button', { name: '預覽過了' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /我已逐則看過預覽/ }).check();
  await page.getByRole('button', { name: '預覽過了' }).click();
  await expect(batch).toBeEnabled();
  await noOverflow(page);

  const [zip] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), batch.click()]);
  expect(zip.suggestedFilename()).toMatch(/個人回饋單 學生版\.zip$/);
});
