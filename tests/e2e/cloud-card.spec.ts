// #180：雲端備份卡。建置時沒有 Google 設定（預設的 npm run build）卡片不出現，這支測試會略過；
// 要跑請用假的 Google 設定建置：VITE_GOOGLE_CLIENT_ID=x VITE_GOOGLE_API_KEY=y VITE_GOOGLE_APP_ID=z npm run build。
import { expect, test } from '@playwright/test';
import { settingsTab } from './fixtures';

test.beforeEach(async ({ page }, info) => {
  if (info.project.name === 'desktop') await page.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 }));
});

async function openCard(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await settingsTab(page, 'backup');
  const card = page.getByTestId('cloud-card');
  test.skip((await card.count()) === 0, '這個建置沒有 Google 設定');
  return card;
}

test('未登入就打開開關：先出現登入視窗，不是確認卡；取消後開關仍是關', async ({ page }) => {
  const card = await openCard(page);
  await card.getByTestId('cloud-switch').click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await expect(page.getByTestId('cloud-confirm-on')).toHaveCount(0);
  await dlg.getByRole('button', { name: '取消' }).click();
  await expect(dlg).toBeHidden();
  await expect(card.getByTestId('cloud-switch')).not.toBeChecked();
});

test('「存到哪裡？先後順序」面板：四種情境與還原說明，可關閉', async ({ page }) => {
  const card = await openCard(page);
  await card.getByTestId('cloud-where').click();
  const dlg = page.getByRole('dialog', { name: '存到哪裡？先後順序' });
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('資料夾（主要）');
  await expect(dlg).toContainText('開啟設定檔');
  await dlg.getByRole('button', { name: '知道了' }).click();
  await expect(dlg).toBeHidden();
});
