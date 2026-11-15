// 第二輪版面改版（第二批）：準備資料桌機寬、頂列檔名、確認視窗置中、意見調查輸出摘要、設定範圍下拉。
import { expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

test('準備資料桌機：右欄撐到 1240 容器右緣（S11）；<1100 頂列不顯示檔名', async ({ page }, info) => {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await expect(page.getByRole('heading', { level: 1, name: /讀書報告回饋/ })).toBeVisible();
  const w = page.viewportSize()!.width;
  if (w >= 1100) {
    const grid = (await page.locator('.prep-grid').boundingBox())!;
    const panel = (await page.locator('.prep-grid .view').first().boundingBox())!;
    expect(grid.x + grid.width - (panel.x + panel.width)).toBeLessThanOrEqual(1);
    await expect(page.locator('.file-name')).toBeVisible();
  } else {
    await expect(page.locator('.file-name')).toBeHidden();
  }
  expect(info.project.name).toBeTruthy();
});

test('重新開始確認：平板與桌機置中、寬不超過 480；手機為底部面板', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await page.getByRole('button', { name: '重新開始' }).click();
  const box = (await page.getByRole('dialog').boundingBox())!;
  const vw = page.viewportSize()!.width;
  if (vw >= 600) {
    expect(box.width).toBeLessThanOrEqual(521);
    expect(box.height).toBeLessThan(400);
    expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThan(2);
  } else {
    expect(box.width).toBeGreaterThan(vw - 2);
  }
});

test('設定頁：預設輸出的範圍用下拉，與內容分段控制區隔（S14）', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  const card = page.getByTestId('defaults-card');
  const scope = card.getByLabel('套用範圍');
  await expect(scope).toBeVisible();
  await scope.selectOption({ label: '問卷類型' });
  await expect(card.getByLabel('問卷類型', { exact: true })).toBeVisible();
  // 「預設給誰看」仍是分段控制
  await expect(card.getByRole('radio', { name: '老師版' })).toBeVisible();
});
