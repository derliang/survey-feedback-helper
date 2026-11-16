import { expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

// 手機工作頁的資料夾狀態細條（DESIGN 5.35、R3-1 方案 A）。資料皆為虛構；資料夾以瀏覽器內建儲存空間模擬。

test('手機工作頁：頂列下方顯示資料夾狀態，未選警示、選後平淡；寬螢幕不顯示', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'File System Access 僅 Chromium');
  await page.addInitScript(() => {
    (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker = () => navigator.storage.getDirectory();
  });
  await page.goto('./');
  await expect(page.getByTestId('folder-strip')).toHaveCount(0); // 首頁有自己的資料夾列
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  const strip = page.getByTestId('folder-strip');
  await expect(strip).toContainText('尚未選擇資料夾');
  const phone = info.project.name === 'phone';
  if (!phone) {
    await expect(strip).toBeHidden();
    return;
  }
  await expect(strip).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await strip.getByRole('button', { name: '選擇資料夾' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '選擇資料夾' }).click();
  await expect(strip).toContainText('資料夾：');
  await expect(strip.getByRole('button', { name: '重選資料夾' })).toBeVisible();
  await expect(strip).not.toHaveClass(/warn/);
});
