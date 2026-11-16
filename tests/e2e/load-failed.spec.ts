import { expect, test } from '@playwright/test';
import { settledBox, surveyFile } from './fixtures';

// 載入失敗共用元件（DESIGN 5.34 C）：擋掉延遲載入的 chunk 模擬斷網。資料皆為虛構。

test('載入失敗：按鈕不跑版、無橫向溢出；「回上一步」不會停在原地', async ({ page }) => {
  await page.route(/assets\/Prepare-.*\.js/, (r) => r.abort());
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('這個畫面沒有載入成功');
  await expect(alert).toContainText('你的資料還在');
  const retry = alert.getByRole('button', { name: '重新載入' });
  const back = alert.getByRole('button', { name: '回上一步' });
  for (const b of [retry, back]) expect((await settledBox(b)).height).toBeGreaterThanOrEqual(44);
  const width = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  // 目前就是「準備資料」失敗，回上一步要回首頁而不是停在原地
  await back.click();
  await expect(alert).toBeHidden();
  await expect(page.getByTestId('file-input')).toBeAttached();
});

test('載入失敗：網路恢復後按「重新載入」可進入畫面', async ({ page }) => {
  let block = true;
  await page.route(/assets\/Prepare-.*\.js/, (r) => (block ? r.abort() : r.continue()));
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await expect(page.getByRole('alert')).toBeVisible();
  block = false;
  await page.getByRole('button', { name: '重新載入' }).click();
  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
