// #184：關於卡（版本、授權、原始碼）、檔案讀不了時的「重新選擇」、欄位對應頁不再同時顯示「都已確認」與問題。資料為虛構。
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { makeXlsx, settingsTab } from './fixtures';

test('設定「說明與隱私」：關於卡有版本、GPL-3.0、原始碼與回報問題連結', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await settingsTab(page, 'help');
  const card = page.getByTestId('about-card');
  const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  await expect(card).toContainText(`版本 ${version}`);
  await expect(card).toContainText('GPL-3.0');
  await expect(card.getByRole('link', { name: '開啟原始碼頁面' })).toHaveAttribute('href', /github\.com\/derliang\/survey-feedback-helper$/);
  await expect(card.getByRole('link', { name: '第三方元件與授權' })).toHaveAttribute('href', /third-party\.md$/);
  await expect(card.getByRole('link', { name: '回報問題' })).toHaveAttribute('href', /\/issues$/);
});

test('檔案格式不支援：錯誤提示有「重新選擇」（再開檔案視窗）與「看匯出教學」', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') });
  const err = page.getByTestId('error');
  await expect(err).toContainText('不支援這個檔案格式');
  const chooser = page.waitForEvent('filechooser');
  await err.getByTestId('error-repick').click();
  await chooser;
  await expect(err).toHaveCount(0);
});

test('欄位對應：只有姓名與時間戳記時，不會同時顯示「所有欄位都已確認」與問題', async ({ page }) => {
  const buffer = makeXlsx(['時間戳記', '姓名'], [['2026/11/16 10:00:00', '王大明']]);
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({ name: 'm.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await expect(page.getByRole('heading', { name: '欄位對應' }).first()).toBeVisible();
  await expect(page.getByText('請先處理下列問題，再繼續')).toBeVisible();
  await expect(page.getByText('所有欄位都已確認')).toHaveCount(0);
});
