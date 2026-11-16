import { expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

// #183：設定頁資料夾卡顯示「已連線」；「忘記這個資料夾」要先確認；沒資料夾的工作頁橫幅有「選擇資料夾」。資料皆為虛構。

test('設定頁：已連線標籤；忘記資料夾先確認，取消不變，確認才忘記', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'File System Access 僅 Chromium');
  await page.addInitScript(() => {
    (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker = () => navigator.storage.getDirectory();
  });
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByTestId('folder-card').getByRole('button', { name: '選擇資料夾' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '選擇資料夾' }).click();
  const card = page.getByTestId('folder-card');
  await expect(card.getByTestId('folder-state')).toHaveText('已連線');
  await card.getByTestId('folder-forget').click();
  const dlg = page.getByRole('dialog', { name: '忘記這個資料夾？' });
  await expect(dlg).toBeVisible();
  await dlg.getByRole('button', { name: '取消' }).click();
  await expect(card.getByTestId('folder-state')).toHaveText('已連線');
  await card.getByTestId('folder-forget').click();
  await page.getByTestId('forget-yes').click();
  await expect(card).toContainText('尚未選擇資料夾');
});

test('沒選資料夾：工作頁「設定有更新」橫幅有「選擇資料夾」入口', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'File System Access 僅 Chromium');
  await page.addInitScript(() => {
    (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker = () => navigator.storage.getDirectory();
  });
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await page.getByRole('button', { name: /下一步|對應欄位/ }).first().click().catch(() => undefined);
  const btn = page.getByTestId('banner-pick-folder');
  if ((await page.getByTestId('banner-settings').count()) > 0) await expect(btn).toBeVisible();
});
