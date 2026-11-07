import { expect, test, type Page } from '@playwright/test';

// Google 表單教學頁（設計稿 5.31）：共同前置＋兩條並列流程；導覽錨點 g1～g6；手機折疊目錄、平板以上左欄、桌機兩個做法並排。
// 三個專案（desktop 1280、tablet 820、phone 390）各跑一次，淺色與深色都量。

const NAV = ['共同前置：建立回應試算表', '做法一：直接讀取 Google 試算表', '做法二：下載檔案再匯入', 'Google 表單怎麼設計', '範本表單', '示範資料'];

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

/** 看得見的連結、按鈕、摘要都要 ≥ 44×44（選單路徑是文字小標，不是按鈕）。 */
const tapTargetsOk = async (page: Page) => {
  const small = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('main a.btn, main a.nvr, main button, main summary')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 44 || r.height < 44) out.push(`${(el.textContent ?? '').trim().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  });
  expect(small).toEqual([]);
};

async function openGuide(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Google 表單怎麼設計' }).click();
  await expect(page.getByRole('heading', { name: 'Google 表單教學', level: 1 })).toBeVisible();
}

test('教學頁：標題、六個區段與兩個做法的內容', async ({ page }) => {
  await openGuide(page);
  for (const id of ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.getByRole('heading', { name: '共同前置：建立回應試算表' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '做法一：直接讀取 Google 試算表' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '做法二：下載檔案再匯入' })).toBeVisible();
  await expect(page.locator('#g2').getByText('適合：')).toBeVisible();
  await expect(page.locator('#g3').getByText('適合：')).toBeVisible();
  // 做法二的選單路徑逐字取自核對紀錄
  await expect(page.locator('#g3 .mp').first()).toContainText('檔案');
  await expect(page.locator('#g3 .mp').first()).toContainText('Microsoft Excel (.xlsx)');
  // 每張做法卡的編號都從 1 開始
  await expect(page.locator('#g2 .steps .num').first()).toHaveText('1');
  await expect(page.locator('#g3 .steps .num').first()).toHaveText('1');
  // 舊的獨立卡與舊標題都不見了
  await expect(page.getByRole('heading', { name: '連接 Google 帳號' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '怎麼匯出成 Excel 檔' })).toHaveCount(0);
  // 題型對照已核對：沒有「待核對」標籤
  await expect(page.locator('#g4')).not.toContainText('待核對');
});

test('教學頁：導覽六項、錨點跳到對應區段、目前項目標 aria-current', async ({ page }) => {
  await openGuide(page);
  const phone = page.viewportSize()!.width < 600;
  if (phone) {
    // 手機：左欄不在，折疊「本頁目錄」展開後才有連結
    await expect(page.getByRole('navigation', { name: 'Google 表單教學' })).toBeHidden();
    await page.getByText('本頁目錄').click();
  }
  const nav = page.getByRole('navigation', { name: phone ? '本頁目錄' : 'Google 表單教學' });
  await expect(nav.getByRole('link')).toHaveCount(6);
  for (let i = 0; i < NAV.length; i++) await expect(nav.getByRole('link').nth(i)).toHaveText(NAV[i]!);
  await nav.getByRole('link', { name: '做法二：下載檔案再匯入' }).click();
  await expect(page).toHaveURL(/#g3$/);
  await expect(page.locator('#g3')).toBeInViewport();
  await expect(nav.getByRole('link', { name: '做法二：下載檔案再匯入' })).toHaveAttribute('aria-current', 'location');
  await expect(nav.getByRole('link', { name: '共同前置：建立回應試算表' })).not.toHaveAttribute('aria-current', 'location');
});

test('教學頁：「遇到問題」折疊預設收合，展開看得到三種情況與「改用做法二」', async ({ page }) => {
  await openGuide(page);
  const fold = page.locator('#g2 details.fold');
  await expect(fold).not.toHaveAttribute('open', '');
  await expect(fold.getByText('登入視窗沒有打開。')).toBeHidden();
  await fold.locator('summary').click();
  await expect(fold.getByText('登入視窗沒有打開。')).toBeVisible();
  await expect(fold.getByText('視窗開了又關掉。')).toBeVisible();
  await expect(fold.getByText('登入了，但找不到要開的試算表。')).toBeVisible();
  await expect(fold.getByRole('group', { name: /選帳號/ })).toBeVisible();
  await fold.getByRole('link', { name: '改用做法二' }).click();
  await expect(page).toHaveURL(/#g3$/);
  await expect(page.locator('#g3')).toBeInViewport();
});

test('教學頁：版面——桌機兩個做法並排、平板以下上下排；無橫向溢出、可點元件 ≥ 44', async ({ page }) => {
  await openGuide(page);
  const w = page.viewportSize()!.width;
  const a = (await page.locator('#g2').boundingBox())!;
  const b = (await page.locator('#g3').boundingBox())!;
  if (w >= 1024) {
    expect(Math.abs(a.y - b.y)).toBeLessThan(2); // 頂端對齊
    expect(b.x).toBeGreaterThan(a.x + a.width - 1); // 做法二在右邊
  } else {
    expect(b.y).toBeGreaterThan(a.y + a.height - 1); // 做法二在下面
    expect(Math.abs(a.x - b.x)).toBeLessThan(2);
  }
  // 平板以上有左欄（sticky），手機沒有
  if (w >= 600) await expect(page.locator('.grail')).toBeVisible();
  else await expect(page.locator('.grail')).toBeHidden();
  await noOverflow(page);
  await tapTargetsOk(page);
  await page.locator('#g2 details.fold summary').click();
  await noOverflow(page);
  await tapTargetsOk(page);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`教學頁：${scheme === 'light' ? '淺色' : '深色'}無橫向溢出、可點元件 ≥ 44`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openGuide(page);
    if (page.viewportSize()!.width < 600) {
      await page.getByText('本頁目錄').click();
      await noOverflow(page);
      await tapTargetsOk(page);
    }
    await page.locator('#g2 details.fold summary').click();
    await noOverflow(page);
    await tapTargetsOk(page);
  });
}
