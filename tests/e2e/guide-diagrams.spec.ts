import { expect, test, type Page } from '@playwright/test';
import { makeXlsx } from './fixtures';

// 教學圖解（設計稿 5.32）：所有教學流程都是「自畫示意圖＋短字」。三個專案（desktop 1280、tablet 820、phone 390）各跑一次。
// 圖的規矩：role="img"＋aria-label（含「自畫示意，不是截圖」）、不放點陣圖、沒核對過的標「待核對」、無橫向溢出。

const CAP = '自畫示意，不是截圖';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

/** 每張圖：role=img、aria-label 含固定註記、圖下有註記字樣；圖內字不被裁切（不橫向捲動）。 */
const figuresOk = async (page: Page, scope: string, count: number) => {
  const figs = page.locator(`${scope} figure.dg`);
  await expect(figs).toHaveCount(count);
  const bad = await figs.evaluateAll((els, cap) => {
    const out: string[] = [];
    for (const el of els as HTMLElement[]) {
      if (el.getAttribute('role') !== 'img') out.push('no role=img');
      if (!(el.getAttribute('aria-label') ?? '').includes(cap)) out.push(`no cap in aria-label: ${el.getAttribute('aria-label')}`);
      if (!(el.querySelector('figcaption')?.textContent ?? '').includes(cap)) out.push('no figcaption');
      if (el.scrollWidth > el.clientWidth + 1) out.push(`overflow ${el.scrollWidth}>${el.clientWidth}: ${el.getAttribute('aria-label')}`);
    }
    return out;
  }, CAP);
  expect(bad).toEqual([]);
};

async function openGuide(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Google 表單怎麼設計' }).click();
  await expect(page.getByRole('heading', { name: 'Google 表單教學', level: 1 })).toBeVisible();
}

test('教學頁：每個流程的每一步都有圖（共同前置 5、做法一 5＋遇到問題 1、做法二 3、設計技巧 5），文字短、沒有點陣圖', async ({ page }) => {
  await openGuide(page);
  await figuresOk(page, '#g1', 5);
  await figuresOk(page, '#g2', 6); // 5 步＋「遇到問題」折疊裡的 1 張
  await figuresOk(page, '#g3', 3); // 2 步＋另一條 CSV 路
  await figuresOk(page, '#g4', 5); // 技巧 1、2、3、5 各一張＋題型下拉選單
  // 步驟都是「一張圖＋一兩句短字」；技巧 4「開放題少而精」只有字
  await expect(page.locator('#g1 .dstep')).toHaveCount(5);
  await expect(page.locator('#g2 > .dsteps .dstep')).toHaveCount(5);
  await expect(page.locator('#g3 > .dsteps:not(.alt) .dstep')).toHaveCount(2);
  await expect(page.locator('#g4 > .dsteps .dstep')).toHaveCount(5);
  await expect(page.locator('#g4 > .dsteps .dstep').nth(3).locator('figure')).toHaveCount(0);
  const long = await page.locator('main .dtx p').evaluateAll((els) => els.filter((e) => (e.textContent ?? '').length > 70).map((e) => e.textContent));
  expect(long).toEqual([]);
  // 不放點陣圖、不用截圖
  await expect(page.locator('main img')).toHaveCount(0);
  // 圖內的示意按鈕不可點、不進 Tab 順序
  await expect(page.locator('main figure.dg button, main figure.dg a, main figure.dg [tabindex]')).toHaveCount(0);
});

test('教學頁：沒核對的 Google 畫面標「待核對」、已核對的不標；不再有「個人帳號／學校帳號被擋」的說法', async ({ page }) => {
  await openGuide(page);
  // 做法一第 3、4 張（Google 選帳號、選檔視窗）字樣沒核對：虛線框、灰條、圖下標「待核對」
  for (const n of [2, 3]) {
    const fig = page.locator('#g2 > .dsteps .dstep').nth(n).locator('figure.dg');
    await expect(fig.locator('.dg-w.tbd')).toHaveCount(1);
    await expect(fig.locator('figcaption .tag.warn')).toHaveText('待核對');
  }
  // 共同前置、做法二、設計技巧的圖字樣都已核對
  await expect(page.locator('#g1 figure.dg .tag.warn, #g3 figure.dg .tag.warn, #g4 figure.dg .tag.warn')).toHaveCount(0);
  // 做法二第 1 張：六個格式，能讀寫字（✓ 能讀／✕ 讀不了），.tsv 也能讀
  const m2a = page.locator('#g3 figure.dg').first();
  await expect(m2a.locator('.dg-ok')).toHaveCount(3); // .xlsx、.csv、.tsv
  await expect(m2a.locator('.dg-no')).toHaveCount(3); // .ods、.pdf、.html
  await expect(m2a).toContainText('Tab 鍵分隔值檔案 (.tsv)');
  await expect(page.locator('#g3 .who')).not.toContainText('學校帳號');
  await page.locator('#g2 details.fold summary').click();
  await expect(page.locator('#g2 details.fold')).not.toContainText(/學校管理員|個人帳號、學校帳號/);
  await expect(page.locator('#g2 details.fold .g-chooser')).not.toContainText(/個人帳號|學校帳號/);
});

test('教學頁：展開「遇到問題」後仍無橫向溢出、圖不被裁切', async ({ page }) => {
  await openGuide(page);
  await page.locator('#g2 details.fold summary').click();
  await figuresOk(page, '#g2', 6);
  await noOverflow(page);
});

test('圖解步驟的欄數跟著卡片寬度：手機一欄、平板兩欄、桌機前置三欄', async ({ page }) => {
  await openGuide(page);
  const w = page.viewportSize()!.width;
  const cols = await page.locator('#g1 .dsteps').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  if (w >= 1024) expect(cols).toBe(3);
  else if (w >= 600) expect(cols).toBe(2);
  else expect(cols).toBe(1);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`教學頁與快速範本頁：${scheme === 'light' ? '淺色' : '深色'}圖無橫向溢出`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openGuide(page);
    await noOverflow(page);
    await page.getByRole('button', { name: '用快速範本' }).click();
    await expect(page.getByRole('heading', { name: '快速範本', level: 1 })).toBeVisible();
    await noOverflow(page);
  });
}

test('快速範本：導言下方三步圖解（選情境、複製題目清單、貼進 Google 表單）', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '用快速範本' }).click();
  await expect(page.getByRole('heading', { name: '快速範本', level: 1 })).toBeVisible();
  await expect(page.locator('main .dsteps .dstep')).toHaveCount(3);
  await figuresOk(page, 'main .dsteps', 3);
  await expect(page.locator('main .dsteps')).toContainText('複製題目清單');
  await noOverflow(page);
});

test('首頁「怎麼從 Google 表單匯出？」：沿用做法二第 1 張圖＋一句話＋「看完整教學」', async ({ page }) => {
  await page.goto('./');
  const how = page.locator('details.howto', { hasText: '怎麼從 Google 表單匯出？' });
  await how.locator('summary').click();
  await figuresOk(page, 'details.howto', 1);
  await expect(how.locator('.mp')).toContainText('Microsoft Excel (.xlsx)');
  await noOverflow(page);
  await how.getByRole('button', { name: '看完整教學' }).click();
  await expect(page.getByRole('heading', { name: 'Google 表單教學', level: 1 })).toBeVisible();
});

test('資料夾「怎麼手動存取」：手機平板 3 張圖、桌機 2 張圖', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  });
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints ?? 0) > 1);
  await expect(page.getByText('怎麼手動存取')).toBeVisible();
  await figuresOk(page, 'main .dsteps', touch ? 3 : 2);
  await expect(page.locator('main .dsteps .dstep')).toHaveCount(touch ? 3 : 2);
  if (touch) await expect(page.locator('main .dsteps figure.dg').nth(1).locator('figcaption .tag.warn')).toHaveText('待核對'); // 分享選單字樣沒有實機核對
  await noOverflow(page);
});

test('選課分組志願「怎麼用 Google 表單收志願？」：兩步各一張圖', async ({ page }) => {
  const HEADERS = ['時間戳記', '座號', '姓名', '第一志願', '第二志願', '第三志願'];
  const P = ['微積分', '生物實驗', '地球探索'];
  const rows: (string | number)[][] = Array.from({ length: 8 }, (_, i) => [`2026-11-01 10:00:0${i}`, i + 1, `王${i + 1}`, P[i % 3]!, P[(i + 1) % 3]!, P[(i + 2) % 3]!]);
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({ name: '選課志願 (回覆).xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: makeXlsx(HEADERS, rows) });
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  const how = page.getByTestId('course-howto');
  await how.locator('summary').click();
  await figuresOk(page, '[data-testid="course-howto"]', 2);
  await expect(how).toContainText('每欄僅限一則回應');
  await expect(how).not.toContainText('待核對');
  await noOverflow(page);
});
