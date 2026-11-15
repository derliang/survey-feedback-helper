// 輸出頁改版（DESIGN.md 5.33 B）：三段、桌機右側固定下載面板、縮圖不爆框、產生中提示（Issue #93）。三種寬度都跑。
import { type Page, expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

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
  await expect(page.getByRole('heading', { name: '輸出', level: 1 })).toBeVisible();
  await expect(page.getByTestId('output-template').first()).toBeVisible();
}

test('輸出頁：三段標題、版面不橫向溢出、下載面板在第一屏可見（桌機）', async ({ page }, info) => {
  await toOutput(page);
  for (const h of ['① 給誰看', '② 範本', '③ 下載']) await expect(page.getByRole('heading', { name: h })).toBeVisible();
  const w = page.viewportSize()!.width;
  expect(await page.evaluate((x) => Math.max(document.documentElement.scrollWidth, innerWidth) - x, w)).toBeLessThanOrEqual(0);
  const primary = page.getByRole('button', { name: '下載 Word' });
  await expect(primary).toBeVisible();
  if (info.project.name === 'desktop') {
    // 兩欄：右側面板在視窗內，捲動後仍固定在視窗內
    const dl = page.locator('.out-dl');
    const mainBox = await page.locator('.out-main').boundingBox();
    const dlBox = (await dl.boundingBox())!;
    expect(dlBox.x).toBeGreaterThan(mainBox!.x + mainBox!.width - 1);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(150);
    const after = (await dl.boundingBox())!;
    expect(after.y).toBeGreaterThanOrEqual(0);
    expect(after.y + 100).toBeLessThan(page.viewportSize()!.height);
  }
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/output-${info.project.name}.png`, fullPage: true });
});

test('範本縮圖：頁尾文字在縮圖框內、字級縮小後不蓋住版面（G4）', async ({ page }) => {
  await toOutput(page);
  const thumb = page.locator('.out-thumb').first();
  const t = (await thumb.boundingBox())!;
  const foot = (await thumb.locator('.pv-foot').boundingBox())!;
  expect(foot.x).toBeGreaterThanOrEqual(t.x - 1);
  expect(foot.x + foot.width).toBeLessThanOrEqual(t.x + t.width + 1);
  expect(foot.height).toBeLessThan(t.height / 10);
  // 縮圖比例是 A4（高約為寬的 1.414 倍）
  expect(t.height / t.width).toBeGreaterThan(1.3);
});

test('產生中：按鈕立刻改字（狀態提示在面板內），完成後還原（#93）', async ({ page }) => {
  test.setTimeout(90_000);
  await toOutput(page);
  const pdf = page.getByRole('button', { name: 'PDF', exact: true }).last();
  const done = page.waitForEvent('download', { timeout: 60_000 });
  await pdf.click();
  await expect(page.locator('.out-dl').getByRole('button', { name: '產生中⋯' })).toBeVisible();
  await done;
  await expect(page.getByRole('button', { name: 'PDF', exact: true }).last()).toBeEnabled();
});

test('桌機：更多選單有列印視窗；觸控裝置沒有', async ({ page }, info) => {
  await toOutput(page);
  const more = page.getByRole('button', { name: '更多' });
  if (info.project.name === 'desktop') {
    await more.click();
    await expect(page.getByRole('button', { name: '開啟瀏覽器列印視窗' })).toBeVisible();
  } else {
    await expect(more).toHaveCount(0);
  }
});

test('範本庫縮圖同樣修正：頁尾文字在縮圖框內（G4）', async ({ page }, info) => {
  await toOutput(page);
  await page.getByRole('button', { name: '編輯範本' }).click();
  const thumb = page.locator('.lib-thumb').first();
  await expect(thumb).toBeVisible();
  const t = (await thumb.boundingBox())!;
  const foot = (await thumb.locator('.pv-foot').boundingBox())!;
  expect(foot.x).toBeGreaterThanOrEqual(t.x - 1);
  expect(foot.x + foot.width).toBeLessThanOrEqual(t.x + t.width + 1);
  expect(foot.y + foot.height).toBeLessThanOrEqual(t.y + t.height + 1);
  expect(foot.height).toBeLessThan(20);
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/lib-${info.project.name}.png` });
});
