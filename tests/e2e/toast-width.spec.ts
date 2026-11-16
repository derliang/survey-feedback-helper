import { expect, test } from '@playwright/test';

// Issue #179：提示浮層在手機不可被擠成窄條（寬度至少為視窗的一半以上，且不超出視窗）。
test('提示浮層寬度：手機不被擠成窄條', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByTestId('template-input').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('不是範本') });
  const toast = page.getByTestId('toast');
  await expect(toast).toContainText('這不是範本檔');
  const box = (await toast.boundingBox())!;
  const vw = page.viewportSize()!.width;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vw);
  expect(box.height).toBeLessThan(90); // 短句不折成多行窄條
});
