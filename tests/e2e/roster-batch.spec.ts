import { type Page, expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';


// Issue #227：名單對照「全部確認為同一位」與摘要「含在已填內」。三種寬度各跑一次（playwright 專案設定）。資料全是虛構。

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

/** 名單座號與問卷故意不同（11～16），姓名相同：問卷裡的王大明、林雅婷、陳家豪（兩份）、張小美都是「座號不同」。 */
const SHIFTED = ['11 王大明', '12 林雅婷', '13 陳家豪', '14 張小美', '15 李小龍', '16 黃阿花'].join('\n');

async function toCompare(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await expect(page.getByRole('heading', { level: 1, name: '讀書報告回饋 (回覆)' })).toBeVisible();
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: /^台風：/ }).click();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await page.getByRole('textbox', { name: '貼上名單' }).fill(SHIFTED);
  await page.getByRole('button', { name: '加入名單' }).click();
  await page.getByRole('button', { name: '下一步：名單對照' }).click();
  await page.getByRole('tab', { name: /需要確認/ }).click();
}

test('摘要的「要確認」註明含在已填內', async ({ page }) => {
  await toCompare(page);
  const tile = page.getByTestId('compare-tiles').getByRole('button', { name: /^要確認/ });
  await expect(tile).toContainText('含在已填內');
  await noOverflow(page);
});

test('全部確認為同一位：先出確認對話，取消不動；確認後一次處理，且可全部還原', async ({ page }) => {
  await toCompare(page);
  const all = page.getByTestId('accept-all');
  await expect(all).toContainText('全部確認為同一位（5 筆）');
  // 取消：什麼都沒變
  await all.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: '先不要' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('已處理')).toHaveCount(0);
  // 確認
  await all.click();
  await page.getByTestId('accept-all-yes').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('已處理')).toHaveCount(5);
  await expect(all).toBeHidden();
  // 沒被一併確認的（名字打錯的「王小明」）仍在待確認
  await expect(page.getByText(/名單中可能對應的學生：/)).toBeVisible();
  await noOverflow(page);
  // 全部還原
  await page.getByTestId('undo-all').click();
  await expect(page.getByText('已處理')).toHaveCount(0);
  await expect(page.getByTestId('accept-all')).toBeVisible();
});
