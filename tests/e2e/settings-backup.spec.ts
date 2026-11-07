import { type Page, expect, test } from '@playwright/test';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

async function openSettings(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await expect(page.getByTestId('defaults-card')).toBeVisible();
}

test('三層設定：切層、標出來源、還原到上一層、不橫向捲動', async ({ page }) => {
  await openSettings(page);
  await noOverflow(page);
  const card = page.getByTestId('defaults-card');
  await expect(card.getByText('目前的值：內建預設').first()).toBeVisible();
  await card.getByLabel('學校名稱').fill('範例國中');
  await expect(card.getByText('目前的值：全域預設').first()).toBeVisible();
  await card.getByRole('radio', { name: '問卷類型' }).click();
  await card.getByRole('radio', { name: '票選' }).click();
  await card.getByRole('radio', { name: '學生版' }).click();
  await expect(card.getByText('目前的值：問卷類型範本').first()).toBeVisible();
  await card.getByRole('radio', { name: '這次輸出' }).click();
  await expect(card.getByText('只對這一次輸出有效')).toBeVisible();
  await card.getByRole('radio', { name: '全域預設' }).click();
  await card.getByRole('button', { name: '改回上一層的設定值' }).first().click();
  await expect(card.getByLabel('學校名稱')).toHaveValue('');
});

test('備份與還原：下載整包備份，選回後先看摘要、預設合併', async ({ page }) => {
  await openSettings(page);
  const card = page.getByTestId('backup-card');
  await expect(card.getByText('備份可能含學生姓名與名單')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), card.getByRole('button', { name: /^(下載全部設定與範本備份|儲存整包備份到檔案)$/ }).click()]);
  const path = await download.path();
  await card.locator('input[type=file]').setInputFiles(path);
  const panel = page.getByTestId('restore-panel');
  await expect(panel.getByText('還沒改任何資料')).toBeVisible();
  await expect(panel.getByRole('radio', { name: /只補上目前缺少的資料/ })).toHaveAttribute('aria-checked', 'true');
  await panel.getByRole('radio', { name: /用備份內容取代目前資料/ }).click();
  await expect(panel.getByText('先自動下載')).toBeVisible();
  await noOverflow(page);
  await panel.getByRole('button', { name: '取消' }).click();
  await expect(page.getByTestId('restore-panel')).toHaveCount(0);
  await card.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(card.getByText('無法讀取備份檔')).toBeVisible();
});

test('編輯器：加入面板有進階區塊，加入標題區與摘要數字列', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByTestId('template-card').first().click();
  const w = page.viewportSize()!.width;
  if (w < 900) await page.getByRole('button', { name: /編輯/ }).first().click();
  await page.getByRole('button', { name: /加入/ }).first().click();
  await expect(page.getByText('進階區塊')).toBeVisible();
  await page.getByRole('button', { name: '摘要數字列' }).click();
  await expect(page.getByText('顯示哪些數字')).toBeVisible();
  await expect(page.getByText('學生版與家長版不顯示全班名次')).toBeVisible();
});
