import { type Page, expect, test } from '@playwright/test';
import { surveyFile } from './fixtures';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

/** 開檔、確認類型與欄位對應（台風改成評分），停在準備資料，之後用上方步驟列前往統計。 */
async function prepared(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: /^台風：/ }).click();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });

test('統計：全班總覽、個人結果、自評與同學評分比較與審稿', async ({ page }) => {
  await prepared(page);
  await step(page, '統計').click();
  await expect(page.getByRole('heading', { name: '統計', level: 1 })).toBeVisible();
  await expect(page.getByText('全班統計總覽').first()).toBeVisible();
  await expect(page.locator('.chart svg').first()).toBeVisible();
  await noOverflow(page);

  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
  await expect(page.getByRole('heading', { name: '自評與同學評分比較' })).toBeVisible();
  await expect(page.getByTestId('comment').first()).toBeVisible();
  await noOverflow(page);

  // 採用一則、隱藏一則，狀態立刻改變
  const first = page.getByTestId('comment').first();
  await first.getByRole('button', { name: '採用' }).click();
  await expect(first).toContainText('已採用');
  await page.getByRole('button', { name: '還原' }).first().click();
  await expect(first).toContainText('未審');

  // 老師評語
  await page.getByRole('textbox', { name: '老師評語' }).fill('報告很有條理，繼續加油。');
  await expect(page.getByRole('textbox', { name: '老師評語' })).toHaveValue('報告很有條理，繼續加油。');

  // 最高最低分處理設定：進階設定預設收合，要先展開
  await expect(page.getByTestId('advanced')).not.toHaveAttribute('open', '');
  await page.getByTestId('advanced').locator('summary').click();
  await page.getByRole('radio', { name: /每題各排除 1 個最高分和最低分/ }).click();
  await expect(page.getByRole('radio', { name: /每題各排除 1 個最高分和最低分/ })).toHaveAttribute('aria-checked', 'true');

  // 統計方法說明
  await page.getByRole('button', { name: '統計方法說明' }).click();
  await expect(page.getByRole('heading', { name: '統計方法說明' })).toBeVisible();
  await expect(page.getByText(/母體標準差/)).toBeVisible();
  await noOverflow(page);
});

test('輸出：學生版要先預覽，班級總表與批次 PDF 可下載', async ({ page }) => {
  test.setTimeout(120_000);
  await prepared(page);
  await step(page, '輸出').click();
  await expect(page.getByRole('heading', { name: '輸出', level: 1 })).toBeVisible();
  await noOverflow(page);

  // 輸出用範本：縮圖卡片（由編輯器範本產生），預設選內建個人回饋單
  const card = page.getByTestId('output-template').first();
  await expect(card).toBeVisible();
  await expect(card.getByRole('radio')).toBeChecked();
  await card.getByRole('radio').check();

  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Excel/ }).first().click()]);
  expect(dl.suggestedFilename()).toBe('讀書報告回饋 (回覆) 班級總表.xlsx');

  await page.getByRole('radio', { name: '學生版' }).click();
  const batch = page.getByRole('button', { name: /^全部 \d+ 位/ });
  await expect(batch).toBeDisabled();
  await page.getByRole('button', { name: '先預覽學生版' }).click();
  await expect(page.getByTestId('preview')).toBeVisible();
  await expect(page.getByRole('button', { name: '預覽過了' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /我已逐則看過預覽/ }).check();
  await page.getByRole('button', { name: '預覽過了' }).click();
  await expect(batch).toBeEnabled();
  await noOverflow(page);

  // 單人 PDF 也走範本
  const [one] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
  expect(one.suggestedFilename()).toMatch(/\.pdf$/);

  const [zip] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), batch.click()]);
  expect(zip.suggestedFilename()).toMatch(/個人回饋單 學生版\.zip$/);
});

test('圖表長條（5.26）：可聚焦，聚焦時加 2px 外框，標籤含人數', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: /^台風：/ }).click();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await page.locator('.stepper').getByRole('button', { name: /統計/ }).click();
  const bar = page.locator('.chart .bar').first();
  await expect(bar).toHaveAttribute('tabindex', '0');
  await bar.focus();
  expect(await bar.locator('rect').evaluate((el) => getComputedStyle(el).strokeWidth)).toBe('2px');
});

test('歷次趨勢：加入之前的問卷後並排成表與折線，可移除', async ({ page }) => {
  await prepared(page);
  await step(page, '統計').click();
  const card = page.getByTestId('trend');
  await expect(card).toBeVisible();
  await expect(card.getByText('請至少加入一份先前的問卷')).toBeVisible();
  await noOverflow(page);

  await page.getByTestId('trend-input').setInputFiles(surveyFile('上一次期中.xlsx'));
  await expect(page.getByTestId('trend-table')).toBeVisible();
  await expect(page.getByTestId('trend-table')).toContainText('上一次期中');
  await expect(page.getByTestId('trend-table')).toContainText('持平');
  await expect(card.locator('.chart svg')).toBeVisible();
  await noOverflow(page);

  await card.getByRole('button', { name: '移除' }).click();
  await expect(card.getByText('請至少加入一份先前的問卷')).toBeVisible();
});

test('去識別化預覽：每則留言可留著、隱藏（可還原）、改寫，勾選開關照舊', async ({ page }) => {
  await prepared(page);
  await step(page, '統計').click();
  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
  await page.getByTestId('comment').first().getByRole('button', { name: '採用' }).click();
  await step(page, '輸出').click();
  await page.getByRole('radio', { name: '學生版' }).click();
  await page.getByRole('button', { name: '先預覽學生版' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByTestId('pv-keep').first()).toBeDisabled();

  await dlg.getByTestId('pv-hide').first().click();
  await expect(dlg.getByTestId('pv-restore').first()).toBeVisible();
  await dlg.getByTestId('pv-restore').first().click();
  await expect(dlg.getByTestId('pv-hide').first()).toBeVisible();

  await dlg.getByTestId('pv-rewrite').first().click();
  await dlg.getByTestId('pv-draft').fill('改寫後的留言');
  await dlg.getByTestId('pv-save').click();
  await expect(dlg.getByTestId('preview')).toContainText('改寫後的留言');

  await expect(dlg.getByRole('button', { name: '預覽過了' })).toBeDisabled();
  await dlg.getByRole('checkbox', { name: /我已逐則看過預覽/ }).check();
  await dlg.getByRole('button', { name: '預覽過了' }).click();
  await expect(page.getByRole('button', { name: /^全部 \d+ 位/ })).toBeEnabled();
});

test('統計頁版面：選擇器在結果上方、審稿獨立成卡、進階設定收合、固定操作列', async ({ page }) => {
  await prepared(page);
  await step(page, '統計').click();
  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
  // 結果在選擇器之後第一屏可見（手機、平板選擇器在上方；桌機在左欄）
  const list = await page.locator('.wb-list').boundingBox();
  const tiles = await page.locator('.wb-main .tiles').boundingBox();
  const vh = page.viewportSize()!.height;
  expect(tiles!.y).toBeLessThan(vh);
  if (page.viewportSize()!.width < 1024) expect(tiles!.y).toBeGreaterThanOrEqual(list!.y + list!.height - 1);
  else expect(tiles!.x).toBeGreaterThan(list!.x + list!.width - 1);
  // 審稿卡有進度；進階設定預設收合並顯示目前設定摘要
  const review = page.getByTestId('review-card');
  await expect(review).toContainText(/已審 \d+／\d+/);
  await expect(review.getByRole('progressbar')).toBeVisible();
  const adv = page.getByTestId('advanced');
  await expect(adv).toContainText('最高最低分：不去除');
  await expect(adv.getByRole('radio', { name: /每題各排除 1 個/ })).toBeHidden();
  await adv.locator('summary').click();
  await expect(adv.getByRole('radio', { name: /每題各排除 1 個/ })).toBeVisible();
  // 頁頂細橫幅可關閉本次
  const banner = page.getByTestId('top-banner');
  if (await banner.count()) {
    await banner.getByRole('button', { name: '關閉這則提醒' }).click();
    await expect(banner).toBeHidden();
  }
  // 底部固定操作列：三種寬度都貼在視窗底
  const bar = await page.locator('.actbar').boundingBox();
  expect(Math.abs(bar!.y + bar!.height - vh)).toBeLessThanOrEqual(1);
  await expect(page.locator('.actbar').getByRole('button', { name: '前往輸出' })).toBeVisible();
  await noOverflow(page);
});

test('統計頁版面：320 寬沒有橫向溢出，手機表格座號與姓名併成一欄', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await prepared(page);
  await step(page, '統計').click();
  await noOverflow(page);
  await expect(page.locator('.roster-table thead th', { hasText: '座號' })).toHaveCount(0);
  await expect(page.locator('.roster-table thead th', { hasText: '學生' })).toHaveCount(1);
  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
  await noOverflow(page);
});

test('整欄空白的評分題：統計頁給可見提示（Issue #94）', async ({ page }) => {
  const csv = ['時間戳記,滿意度,建議', '2026-10-10 10:00:00,,', '2026-10-10 10:05:00,,希望多做實驗'].join('\n');
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({ name: '空白題.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('radio', { name: /意見調查/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await step(page, '統計').click();
  await expect(page.getByRole('heading', { name: '統計', level: 1 })).toBeVisible();
  await expect(page.locator('.wb-main')).toContainText('「滿意度」整欄沒有人填寫，所以沒有列入統計');
  await noOverflow(page);
});
