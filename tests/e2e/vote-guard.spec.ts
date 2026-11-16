// 票選防弊（Issue #175）：同人多票兩份並排、防弊四項成組畫面與閘門、新計票規則。全部虛構資料。
import { type Page, expect, test } from '@playwright/test';
import { makeXlsx } from './fixtures';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};
const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });
const rail = (page: Page, name: string) => page.locator('.rail').getByRole('button', { name: new RegExp(String.raw`^\d?\s*` + name) });
const gotoPrep = (page: Page, item: string) => step(page, '準備資料').click().then(() => rail(page, item).click());

const HEAD = ['時間戳記', '你的名字', '你推薦誰當班長？'];

async function openVote(page: Page, rows: string[][]) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({ name: '票選 (回覆).xlsx', mimeType: 'application/octet-stream', buffer: makeXlsx(HEAD, rows) });
  await rail(page, '問卷類型').click();
  await page.getByRole('radio', { name: /票選幹部/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

test('同人多票：兩份並排列出時間與投給誰，預設只算最後一份，附理由', async ({ page }) => {
  await openVote(page, [
    ['2026-10-04 12:00:00', '王大明', '甲小明'],
    ['2026-10-04 12:05:00', '王大明', '乙小華'],
    ['2026-10-04 12:02:00', '林雅婷', '甲小明'],
  ]);
  await gotoPrep(page, '資料檢查');
  await page.getByRole('button', { name: /^重複填答/ }).click();
  const copies = page.getByTestId('dup-copies');
  await expect(copies).toContainText('第 1 份');
  await expect(copies).toContainText('第 2 份');
  await expect(copies).toContainText('2026-10-04 12:00:00');
  await expect(copies).toContainText('你推薦誰當班長？：甲小明');
  await expect(copies).toContainText('你推薦誰當班長？：乙小華');
  const last = page.getByRole('radio', { name: '只算最後一份（預設）' });
  await expect(last).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText(/預設只算最後一份：同一人通常是改了主意重送/)).toBeVisible();
  await noOverflow(page);
  await page.getByRole('radio', { name: '只算第一份' }).click();
  await page.getByRole('button', { name: '照這樣決定' }).click();
  await expect(page.getByText('已排除 1 筆回覆')).toBeVisible();
  // 採用第一份後，統計裡王大明的票投給甲小明
  await step(page, '統計').click();
  await expect(page.locator('main')).toContainText('甲小明');
});

test('防弊四項：有自投時先決定才看得到正式結果；逐人名單可隱藏「投給誰」', async ({ page }) => {
  await openVote(page, [
    ['2026-10-04 12:00:00', '甲小明', '甲小明'],
    ['2026-10-04 12:01:00', '乙小華', '甲小明'],
    ['2026-10-04 12:02:00', '丙小美', '乙小華'],
  ]);
  await step(page, '統計').click();
  const guard = page.getByTestId('vote-guard');
  await expect(guard).toBeVisible();
  await expect(guard).toContainText('防弊檢查');
  await expect(page.getByTestId('vote-gate')).toContainText('還有 1 項防弊檢查要決定');
  await expect(page.getByTestId('vote-result')).toHaveCount(0);
  await noOverflow(page);
  await page.getByTestId('guard-self').getByRole('button').first().click();
  await expect(page.getByTestId('guard-self')).toContainText('甲小明');
  await expect(page.getByTestId('guard-self')).toContainText('你推薦誰當班長？：甲小明');
  await page.getByLabel('投影時隱藏「投給誰」').check();
  await expect(page.getByTestId('guard-self')).toContainText('（已隱藏）');
  await expect(page.getByTestId('guard-self')).not.toContainText('你推薦誰當班長？：甲小明');
  await page.getByRole('button', { name: '確認這樣處理' }).click();
  await expect(page.getByTestId('vote-gate')).toHaveCount(0);
  await expect(page.getByTestId('vote-result')).toBeVisible();
  await noOverflow(page);
});

test('計票規則：候補名額與同票由老師指定', async ({ page }) => {
  await openVote(page, [
    ['2026-10-04 12:00:00', '', '甲小明'],
    ['2026-10-04 12:01:00', '', '乙小華'],
    ['2026-10-04 12:02:00', '', '乙小華'],
    ['2026-10-04 12:03:00', '', '甲小明'],
    ['2026-10-04 12:04:00', '', '丙小美'],
  ]);
  await step(page, '統計').click();
  const main = page.locator('main');
  await page.getByRole('button', { name: /計票規則/ }).click();
  await page.getByLabel('候補名額').selectOption('1');
  await expect(main).toContainText('候補：丙小美');
  await page.getByLabel('同票時').selectOption('manual');
  await expect(page.getByTestId('manual-tie')).toBeVisible();
  await page.getByTestId('manual-tie').getByLabel('乙小華').check();
  await expect(main.getByTestId('vote-result')).toContainText('當選');
  await expect(page.getByTestId('rule-preview')).toContainText('乙小華');
  await noOverflow(page);
});
