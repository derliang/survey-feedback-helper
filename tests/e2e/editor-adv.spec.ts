import { type Page, expect, test } from '@playwright/test';

async function openAdv(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByRole('button', { name: '編輯「個人回饋單（進階版）」' }).click();
  await expect(page.getByLabel('範本名稱')).toHaveValue('個人回饋單（進階版）');
}

test('進階範本：預覽畫出標題區、摘要數字列、稱讚提示、自評對照表', async ({ page }) => {
  await openAdv(page);
  await expect(page.locator('.eb-hero')).toBeVisible();
  await expect(page.locator('.eb-stats .eb-stat')).toHaveCount(4);
  await expect(page.locator('.eb-callout').first()).toBeVisible();
  await expect(page.getByLabel('自評對照表示意')).toBeVisible();
});

test('桌機：從加入面板加進階區塊並改屬性', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '加入面板的流程在桌機驗');
  await openAdv(page);
  await page.getByRole('button', { name: '加入區塊' }).first().click();
  await page.locator('.add-tile', { hasText: '摘要數字列' }).click();
  await expect(page.locator('.eb-stats')).toHaveCount(2);
});

test('桌機：直接在頁面上拖曳區塊換位置', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '滑鼠拖曳在桌機驗');
  await page.goto('./');
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  const first = page.locator('.pv-page > .eb').first();
  const firstText = await first.innerText();
  await first.click();
  const grip = page.locator('.pv-grip');
  await expect(grip).toBeVisible();
  const g = (await grip.boundingBox())!;
  const third = (await page.locator('.pv-page > .eb').nth(2).boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, g.y + 20);
  await page.mouse.move(third.x + 20, third.y + third.height - 2, { steps: 5 });
  await expect(page.locator('.eb.drop-after, .eb.drop-before')).toHaveCount(1);
  await page.mouse.up();
  expect(await page.locator('.pv-page > .eb').first().innerText()).not.toBe(firstText);
  await expect(page.locator('.pv-page > .eb').nth(2)).toContainText(firstText.split('\n')[0]!);
});

test('試印 PDF：用示範資料輸出目前範本', async ({ page }) => {
  await openAdv(page);
  const popup = page.context().waitForEvent('page', { timeout: 60_000 }).catch(() => null);
  await page.getByRole('button', { name: '試印 PDF' }).click();
  await expect(page.getByTestId('trial-msg')).toContainText('試印完成', { timeout: 60_000 });
  const p = await popup;
  await p?.close();
});

test('手機：雙指縮放預覽', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', '雙指縮放驗手機與平板');
  await page.goto('./');
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  const chip = page.getByRole('button', { name: '符合寬度' });
  await expect(chip).toHaveText('100%');
  const fire = (type: string, id: number, x: number) =>
    page.getByTestId('pv-wrap').evaluate(
      (el, a) => el.dispatchEvent(new PointerEvent(a.type, { pointerId: a.id, pointerType: 'touch', clientX: a.x, clientY: 300, bubbles: true })),
      { type, id, x },
    );
  await fire('pointerdown', 1, 100);
  await fire('pointerdown', 2, 200);
  await fire('pointermove', 2, 300); // 距離 100 → 200，放大一倍
  await expect(chip).toHaveText('200%');
  await fire('pointermove', 2, 150); // 距離 50 → 縮到 50%
  await expect(chip).toHaveText('50%');
  await fire('pointerup', 1, 100);
  await fire('pointerup', 2, 150);
  // 單指移動不改縮放
  await fire('pointerdown', 3, 100);
  await fire('pointermove', 3, 250);
  await expect(chip).toHaveText('50%');
  await fire('pointerup', 3, 250);
});
