// #185：彈出面板——確認視窗按鈕靠右不鋪滿、學生版預覽停用時寫原因、「加入區塊」有圖示與取消。資料為虛構。
import { type Page, expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

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

test('確認視窗（平板、桌機）：兩顆靠右不鋪滿，沒有 ✕', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', '手機維持底部面板兩顆並排');
  await toOutput(page);
  await page.getByRole('button', { name: '重新開始' }).first().click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.sheet-x')).toBeHidden();
  const btns = dlg.locator('.sheet-foot .btn');
  const n = await btns.count();
  expect(n).toBe(2);
  for (let i = 0; i < n; i++) expect((await btns.nth(i).boundingBox())!.width).toBeLessThan(260);
  const d = (await dlg.boundingBox())!;
  const last = (await btns.nth(n - 1).boundingBox())!;
  expect(d.x + d.width - (last.x + last.width)).toBeLessThan(40); // 靠右
});

test('學生版預覽：按鈕停用時旁邊寫原因，勾選後原因消失', async ({ page }) => {
  await toOutput(page);
  await page.getByRole('radio', { name: '學生版' }).click();
  await page.getByRole('button', { name: '先預覽學生版' }).click();
  await expect(page.getByTestId('preview')).toBeVisible();
  const why = page.getByTestId('preview-why');
  await expect(why).toBeVisible();
  await page.getByRole('checkbox', { name: /我已逐則看過預覽/ }).check();
  await expect(why).toHaveCount(0);
});

test('加入區塊：方塊有圖示，並有「取消」', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  await page.getByRole('button', { name: /^加入/ }).first().click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.locator('.add-tile .add-ic').first()).toBeVisible();
  expect(await dlg.locator('.add-tile').first().evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(80);
  await dlg.getByRole('button', { name: '取消' }).click();
  await expect(dlg).toBeHidden();
});
