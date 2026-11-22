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
  // #213：被排除的票有「已排除」文字；確認後清單自動收合、結果在視窗內
  await page.getByTestId('guard-self').getByLabel('計入').first().uncheck();
  await expect(page.getByTestId('guard-self')).toContainText('已排除');
  await page.getByTestId('guard-self').getByLabel('計入').first().check();
  await page.getByRole('button', { name: '確認這樣處理' }).click();
  await expect(page.getByTestId('vote-gate')).toHaveCount(0);
  await expect(page.getByTestId('vote-result')).toBeVisible();
  await expect(page.getByTestId('guard-self').getByRole('button', { name: '確認這樣處理' })).toHaveCount(0);
  await expect(page.getByTestId('vote-result')).toBeInViewport();
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
  await page.getByTestId('advanced').locator('summary').click();
  await page.getByLabel('候補名額').selectOption('1');
  await expect(main).toContainText('候補：');
  await page.getByLabel('同票時').selectOption('manual');
  await expect(page.getByTestId('manual-tie')).toBeVisible();
  await page.getByTestId('manual-tie').getByLabel('乙小華').check();
  await expect(main.getByTestId('vote-result')).toContainText('當選');
  await expect(page.getByTestId('rule-preview')).toContainText('乙小華');
  await expect(main).toContainText('候補：甲小明');
  await noOverflow(page);
});

test('票選輸出表：真實題目與同票備註在 390 寬不被切、不需橫向捲動（#176）', async ({ page }) => {
  await openVote(page, [
    ['2026-10-04 12:00:00', '', '甲小明'],
    ['2026-10-04 12:01:00', '', '乙小華'],
  ]);
  await step(page, '輸出').click();
  const wrap = page.getByTestId('vote-output').locator('.table-wrap').first();
  await expect(wrap).toBeVisible();
  const over = await wrap.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
  await noOverflow(page);
});

test('投影唱票：全螢幕、全部候選人同列，+1／數字鍵／空白票／Ctrl+Z／離開，唱完與統計核對（#174）', async ({ page }) => {
  await openVote(page, [
    ['2026-10-04 12:00:00', '', '甲小明'],
    ['2026-10-04 12:01:00', '', '乙小華'],
    ['2026-10-04 12:02:00', '', '甲小明'],
  ]);
  await step(page, '統計').click();
  await page.getByRole('button', { name: '投影唱票' }).click();
  const tally = page.getByTestId('tally-projector');
  await expect(tally).toBeVisible();
  await expect(page.getByTestId('tally-progress')).toHaveText('已唱 0／3 票');
  // 同列、數字從 0 開始、不露結果
  await expect(page.getByTestId('tally-count-0')).toHaveText('0');
  await expect(page.getByTestId('tally-count-1')).toHaveText('0');
  const boxes = await tally.locator('.tally-col').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  if ((page.viewportSize()?.width ?? 0) > 700) expect(new Set(boxes).size).toBe(1);
  // 候選人依姓名排（不依票數，避免洩漏名次）；用名稱找出甲小明是第幾欄
  const names = await tally.locator('.tally-name').allTextContents();
  const ming = names.findIndex((n) => n.includes('甲小明'));
  const hua = names.findIndex((n) => n.includes('乙小華'));
  await tally.getByRole('button', { name: '甲小明 加一票' }).click();
  await expect(page.getByTestId(`tally-count-${ming}`)).toHaveText('1');
  await page.keyboard.press(String(ming + 1));
  await page.keyboard.press(String(hua + 1));
  await expect(page.getByTestId('tally-progress')).toHaveText('已唱 3／3 票');
  await expect(page.getByTestId('tally-done')).toContainText('與統計結果相符');
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('tally-progress')).toHaveText('已唱 2／3 票');
  await page.keyboard.press('b');
  await expect(page.getByTestId('tally-done')).toContainText('與統計結果不同');
  await noOverflow(page);
  // #219：離開、空白票按鈕的文字與底色要有足夠對比（不能白底白字）
  const lum = (c: string) => {
    const [r = 0, g = 0, b = 0] = c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map((v) => {
      const x = Number(v) / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const name of ['離開唱票', '空白票 ＋1']) {
    const [fg, bg] = await tally.getByRole('button', { name }).evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]);
    const [a = 0, b = 0] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    expect((a + 0.05) / (b + 0.05), `${name} 對比`).toBeGreaterThanOrEqual(4.5);
  }
  await page.keyboard.press('Escape');
  await expect(tally).toHaveCount(0);
});

test('防弊閘門也擋輸出頁：未確認時下載鈕停用並有「回統計頁確認」，確認後可下載（#175）', async ({ page }) => {
  await openVote(page, [
    ['2026-10-04 12:00:00', '甲小明', '甲小明'],
    ['2026-10-04 12:01:00', '乙小華', '甲小明'],
  ]);
  await step(page, '輸出').click();
  const out = page.getByTestId('vote-output');
  await expect(out).toContainText('還有 1 項防弊檢查要決定');
  await expect(out.getByRole('button', { name: /^Excel/ })).toBeDisabled();
  await out.getByRole('button', { name: '回統計頁確認' }).click();
  await page.getByTestId('guard-self').getByRole('button').first().click();
  await page.getByRole('button', { name: '確認這樣處理' }).click();
  await step(page, '輸出').click();
  await expect(page.getByTestId('vote-output').getByRole('button', { name: /^Excel/ })).toBeEnabled();
});
