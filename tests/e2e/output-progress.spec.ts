// #186：輸出進度（階段、取消、請勿關閉）與失敗（原因、替代做法、再試一次、關閉）。資料為虛構。
import { type Page, expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

// 封鎖 Service Worker，page.route 才攔得到字型（同 load-failed.spec）
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }, info) => {
  if (info.project.name === 'desktop') await page.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 }));
});

async function toOutput(page: Page) {
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
}

test('輸出進行中：有「請不要關閉」與取消；取消後不下載、顯示已取消', async ({ page }) => {
  test.setTimeout(90_000);
  await toOutput(page);
  await page.route('**/fonts/*.woff2', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  let downloaded = false;
  page.on('download', () => (downloaded = true));
  await page.getByRole('button', { name: 'PDF', exact: true }).last().click();
  const status = page.getByTestId('out-status');
  await expect(status).toContainText('請不要關閉這個頁面');
  await page.getByTestId('out-cancel').click();
  await expect(status).toContainText('已取消，沒有產生檔案');
  expect(downloaded).toBe(false);
});

test('輸出失敗：說明原因與替代做法，可再試一次、可關閉', async ({ page }) => {
  test.setTimeout(90_000);
  await toOutput(page);
  await page.route('**/fonts/*.woff2', (route) => route.abort());
  await page.getByRole('button', { name: 'PDF', exact: true }).last().click();
  const status = page.getByTestId('out-status');
  await expect(status).toContainText('產生失敗');
  await expect(status).toContainText('原因');
  await expect(status).toContainText('班級總表 Excel');
  await expect(page.getByTestId('out-retry')).toBeVisible();
  await status.getByRole('button', { name: '關閉' }).click();
  await expect(status).toHaveCount(0);
});
