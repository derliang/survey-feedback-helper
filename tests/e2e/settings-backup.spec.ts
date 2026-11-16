import { type Page, expect, test } from '@playwright/test';
import { settingsTab } from './fixtures';

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
  // 沒改過的欄位不顯示任何標籤（5.33 C②）
  await expect(card.locator('.tag', { hasText: '已自訂' })).toHaveCount(0);
  await expect(card.getByText('目前的值')).toHaveCount(0);
  await card.getByLabel('學校名稱').fill('範例國中');
  await expect(card.locator('.tag', { hasText: '已自訂' })).toHaveCount(1);
  await card.getByRole('radio', { name: '問卷類型' }).click();
  await card.locator('#def-kind').selectOption({ label: '票選' });
  await card.getByRole('radio', { name: '學生版' }).click();
  await expect(card.getByText('沿用全域預設').first()).toBeVisible();
  await card.getByRole('radio', { name: '這次輸出' }).click();
  await expect(card.getByText('只對這一次輸出有效')).toBeVisible();
  await card.getByRole('radio', { name: '全域預設' }).click();
  await card.getByRole('button', { name: '改回上一層的設定值' }).first().click();
  await expect(card.getByLabel('學校名稱')).toHaveValue('');
});

test('備份與還原：下載整包備份，選回後先看摘要、預設合併', async ({ page }) => {
  await openSettings(page);
  await settingsTab(page, 'backup');
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
  await expect(panel.getByRole('button', { name: '取代並還原' })).toHaveClass(/danger/);
  await expect(card.getByText('備份檔包含以下資料：')).toBeVisible();
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

test('設定頁版面（5.33 C／D）：分組導覽、內容最寬 720、底部操作列固定、說明預設收合、點擊區 ≥44', async ({ page }) => {
  await openSettings(page);
  await noOverflow(page);
  const wide = page.viewportSize()!.width >= 600;
  // 常用：資料夾與預設輸出；進階的卡片不在畫面上
  await expect(page.getByTestId('folder-card')).toBeVisible();
  await expect(page.getByTestId('backup-card')).toHaveCount(0);
  await expect(page.getByTestId('look-card')).toHaveCount(0);
  if (wide) {
    await expect(page.getByRole('navigation', { name: '設定項目' })).toBeVisible();
    const w = await page.locator('.set-main').evaluate((e) => e.getBoundingClientRect().width);
    expect(w).toBeLessThanOrEqual(720);
    await settingsTab(page, 'look');
    await expect(page.getByTestId('look-card')).toBeVisible();
    await expect(page.getByTestId('backup-card')).toHaveCount(0);
  } else {
    await expect(page.getByRole('tablist', { name: '設定分類' })).toBeVisible();
    await settingsTab(page, 'backup');
    // 手機：進階三項併在同一頁
    await expect(page.getByTestId('backup-card')).toBeVisible();
    await expect(page.getByTestId('look-card')).toBeVisible();
    await expect(page.getByTestId('folder-card')).toHaveCount(0);
  }
  // 說明預設收合，點開才看到離線使用
  await settingsTab(page, 'help');
  const help = page.getByTestId('help-card');
  await expect(help).not.toHaveAttribute('open', '');
  await help.locator('summary').click();
  await expect(help.getByRole('heading', { name: '離線使用' })).toBeVisible();
  // 底部操作列固定在視窗底（手機、平板、桌機都一樣）
  const bar = page.locator('.actbar');
  expect(await bar.evaluate((e) => getComputedStyle(e).position)).toBe('fixed');
  const box = (await bar.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(page.viewportSize()!.height);
  // 導覽、分段、按鈕點擊區 ≥ 44
  const small = await page.locator('main button, main label.btn, main summary').evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getBoundingClientRect()).filter((r) => r.height < 43.5).length,
  );
  expect(small).toBe(0);
  await noOverflow(page);
});
