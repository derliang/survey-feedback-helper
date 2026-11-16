// 個人回饋單圖表類型與班級平均參考線（DESIGN.md 5.37）：編輯器預覽跟著設定變，輸出的 Word 真的換圖。
import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
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

async function openChartPanel(page: Page, wide: boolean) {
  await page.getByRole('button', { name: '編輯範本' }).click();
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  if (!wide) await page.getByRole('button', { name: '區塊清單' }).click();
  await page.getByRole('button', { name: '對照圖', exact: true }).first().click();
  if (!wide) await page.getByRole('button', { name: '編輯屬性' }).click();
}

const preview = (page: Page) => page.locator('.ph-svg svg').first();

/** 手機／平板：預覽模式沒有「編輯屬性」，回區塊清單再開（選取的區塊仍在）。 */
async function reopen(page: Page) {
  await page.getByRole('button', { name: '區塊清單' }).click();
  await page.getByRole('button', { name: '編輯屬性' }).click();
}

test('編輯器：圖表類型與參考線改了，預覽立刻換成對應的圖', async ({ page }, info) => {
  const wide = info.project.name === 'desktop';
  await toOutput(page);
  await openChartPanel(page, wide);
  // 內建範本預設是對照條：參考線開關不放，改放說明
  await expect(page.getByTestId('compare-line-na')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '在圖表顯示班級平均參考線' })).toHaveCount(0);
  if (!wide) {
    await page.getByRole('button', { name: '完成' }).click();
    await page.getByRole('button', { name: '預覽', exact: true }).click();
  }
  const compare = await preview(page).innerHTML();
  if (!wide) await reopen(page);

  await page.getByRole('button', { name: '堆疊', exact: true }).click();
  await expect(page.getByTestId('chart-hint')).toContainText('100% 堆疊');
  const toggle = page.getByRole('checkbox', { name: '在圖表顯示班級平均參考線' });
  await expect(toggle).toBeVisible();
  if (!wide) {
    await page.getByRole('button', { name: '完成' }).click();
    await page.getByRole('button', { name: '預覽', exact: true }).click();
  }
  const stacked = await preview(page).innerHTML();
  expect(stacked).toContain('fill-opacity');
  expect(stacked).not.toEqual(compare);
  // 內建範本的參考線預設是開的
  expect(stacked).toContain('stroke-dasharray');

  if (!wide) await reopen(page);
  await toggle.click();
  if (!wide) {
    await page.getByRole('button', { name: '完成' }).click();
    await page.getByRole('button', { name: '預覽', exact: true }).click();
  }
  expect(await preview(page).innerHTML()).not.toContain('stroke-dasharray');
  if (!wide) await reopen(page);
  await toggle.click();
  await page.getByRole('button', { name: '分布', exact: true }).click();
  if (!wide) {
    await page.getByRole('button', { name: '完成' }).click();
    await page.getByRole('button', { name: '預覽', exact: true }).click();
  }
  expect(await preview(page).innerHTML()).toContain('<polyline');
});

test('輸出：範本改成堆疊圖，下載的 Word 裡的圖就不再是原本的對照條', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '輸出內容不分版面，只在桌機專案跑一次');
  test.setTimeout(120_000);
  await toOutput(page);

  const media = async (): Promise<{ name: string; bytes: Uint8Array }[]> => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('button', { name: '下載 Word' }).click()]);
    const file = await d.path();
    const zip = unzipSync(new Uint8Array(await readFile(file)));
    return Object.entries(zip)
      .filter(([n]) => /^word\/media\/.+\.png$/.test(n))
      .map(([name, bytes]) => ({ name, bytes }));
  };
  const before = await media();
  expect(before.length).toBeGreaterThan(0);

  await openChartPanel(page, true);
  await page.getByRole('button', { name: '堆疊', exact: true }).click();
  await page.getByRole('button', { name: '回範本庫' }).click();
  await page.getByTestId('template-card').filter({ hasText: '（我的）' }).first().getByRole('button', { name: /輸出$/ }).click();
  await page.locator('.stepper').getByRole('button', { name: /輸出/ }).click();
  await expect(page.getByRole('heading', { name: '輸出', level: 1 })).toBeVisible();

  const after = await media();
  expect(after.length).toBeGreaterThan(0);
  const sig = (m: { bytes: Uint8Array }[]) => m.map((x) => x.bytes.length + ':' + x.bytes.slice(0, 64).join(',')).join('|');
  expect(sig(after)).not.toEqual(sig(before));
});
