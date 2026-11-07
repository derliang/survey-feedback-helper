// 複選題與票選型問卷：匯入→類型→統計（人數／比例）→Excel／Word／PDF 輸出並解開檔案核對內容（2026-11-07）。
// 全部虛構資料，測試時才產生 xlsx，不放進 repo；桌機、平板、手機三個專案都跑。
import { readFile } from 'node:fs/promises';
import { type Download, type Page, expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { makeXlsx } from './fixtures';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};
const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });
const rail = (page: Page, name: string) => page.locator('.rail').getByRole('button', { name: new RegExp(String.raw`^\d?\s*` + name) });
const xlsx = (name: string, headers: string[], rows: (string | number)[][]) => ({ name, mimeType: 'application/octet-stream', buffer: makeXlsx(headers, rows) });

async function bytesOf(d: Download): Promise<Buffer> {
  return readFile(await d.path());
}
function zipText(buf: Buffer): string {
  return Object.entries(unzipSync(new Uint8Array(buf)))
    .filter(([n]) => n.endsWith('.xml'))
    .map(([, v]) => strFromU8(v))
    .join('\n');
}
async function download(page: Page, click: () => Promise<void>): Promise<Download> {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), click()]);
  return d;
}

/* ───────── 複選題：核取方塊 ───────── */

// 8 份回覆（虛構）。籃球 6、閱讀 4、手作 3；作答 8 人，比例 = 人數 ÷ 作答人數。
const CLUB_HEAD = ['時間戳記', '你參加哪些社團活動？', '還有什麼想說的？'];
const CLUB_ROWS: string[][] = [
  ['2026-10-01 10:00:00', '籃球, 閱讀, 手作', '希望多辦幾次活動'],
  ['2026-10-01 10:01:00', '籃球', ''],
  ['2026-10-01 10:02:00', '閱讀, 手作', '場地可以再大一點'],
  ['2026-10-01 10:03:00', '籃球, 閱讀', ''],
  ['2026-10-01 10:04:00', '籃球', '謝謝老師安排'],
  ['2026-10-01 10:05:00', '手作', ''],
  ['2026-10-01 10:06:00', '籃球, 閱讀', ''],
  ['2026-10-01 10:07:00', '籃球', ''],
];

async function openClub(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(xlsx('社團調查 (回覆).xlsx', CLUB_HEAD, CLUB_ROWS));
  await rail(page, '問卷類型').click();
  await page.getByRole('radio', { name: /意見調查/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

test('複選題：統計顯示各選項人數與比例', async ({ page }) => {
  await openClub(page);
  await step(page, '統計').click();
  await page.locator('.wb-list').getByRole('button', { name: /你參加哪些社團活動/ }).click();
  const main = page.locator('main');
  await expect(main).toContainText('複選');
  await expect(main).toContainText('籃球');
  await expect(main).toContainText('75%'); // 6 / 8
  await expect(main).toContainText('50%'); // 4 / 8
  await expect(main).toContainText('38%'); // 3 / 8
  await noOverflow(page);
});

test('複選題：Excel、Word、PDF 輸出，解開後有選項、人數與比例', async ({ page }) => {
  test.setTimeout(120_000);
  await openClub(page);
  await step(page, '輸出').click();
  const x = await download(page, () => page.getByRole('button', { name: /^Excel/ }).first().click());
  const xt = zipText(await bytesOf(x));
  for (const must of ['你參加哪些社團活動？', '複選題', '籃球', '閱讀', '手作', '8 人作答', '75%', '50%', '38%', '場地可以再大一點']) expect(xt, `xlsx 應含「${must}」`).toContain(must);
  const w = await download(page, () => page.getByRole('button', { name: /^Word/ }).first().click());
  const wt = zipText(await bytesOf(w));
  for (const must of ['你參加哪些社團活動？', '籃球', '75%', '50%', '38%']) expect(wt, `docx 應含「${must}」`).toContain(must);
  const p = await download(page, () => page.getByRole('button', { name: /^PDF/ }).first().click());
  const pb = await bytesOf(p);
  expect(pb.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pb.length).toBeGreaterThan(5_000);
  await noOverflow(page);
});

/* ───────── 票選幹部 ───────── */

const VOTE_HEAD = ['時間戳記', '你推薦誰當班長？', '你推薦誰當副班長？'];
const VOTE_ROWS: string[][] = [
  ['2026-10-04 12:00:00', '甲小明', '乙小華'],
  ['2026-10-04 12:01:00', '乙小華', '甲小明'],
  ['2026-10-04 12:02:00', '甲小明', '丙小美'],
  ['2026-10-04 12:03:00', '甲小明', '乙小華'],
  ['2026-10-04 12:04:00', '丙小美', '乙小華'],
];

test('票選幹部：匯入→類型→統計票數→Excel、Word、PDF', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(xlsx('選幹部 (回覆).xlsx', VOTE_HEAD, VOTE_ROWS));
  await rail(page, '問卷類型').click();
  await page.getByRole('radio', { name: /票選幹部/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await noOverflow(page);
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await step(page, '統計').click();
  const main = page.locator('main');
  // 班長：甲小明 3 票當選；副班長：乙小華 3 票當選
  await expect(main).toContainText('甲小明');
  await expect(main).toContainText('3 票');
  await noOverflow(page);
  await page.getByRole('button', { name: /你推薦誰當副班長/ }).first().click();
  await expect(main).toContainText('乙小華');
  await expect(main).toContainText('3 票');

  await step(page, '輸出').click();
  await expect(page.getByRole('heading', { name: '輸出', level: 1 })).toBeVisible();
  await noOverflow(page);
  const x = await download(page, () => page.getByRole('button', { name: /^Excel/ }).first().click());
  const xt = zipText(await bytesOf(x));
  for (const must of ['當選結果', '得票數', '你推薦誰當班長？', '你推薦誰當副班長？', '甲小明', '乙小華', '丙小美']) expect(xt, `xlsx 應含「${must}」`).toContain(must);
  const w = await download(page, () => page.getByRole('button', { name: /^Word/ }).first().click());
  const wt = zipText(await bytesOf(w));
  for (const must of ['票選結果', '當選：甲小明', '當選：乙小華', '票數']) expect(wt, `docx 應含「${must}」`).toContain(must);
  const p = await download(page, () => page.getByRole('button', { name: /^PDF/ }).first().click());
  const pb = await bytesOf(p);
  expect(pb.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pb.length).toBeGreaterThan(5_000);
  await noOverflow(page);
});

/* ───────── 單選題、下拉式選單、詳答（標題只有題目文字；單選題／簡答／詳答的真實匯出尚未實測，見 Google介面核對紀錄） ───────── */

test('單選題與詳答：匯入→欄位對應→統計人數，詳答列為開放意見', async ({ page }) => {
  const head = ['時間戳記', '你最常用哪種交通工具上學？', '你住在哪一區？', '對學校有什麼建議？請詳細說明'];
  const rows = [
    ['2026-10-05 08:00:00', '公車', '北區', '希望增加午休時間，因為下午上課常常想睡。'],
    ['2026-10-05 08:01:00', '腳踏車', '東區', ''],
    ['2026-10-05 08:02:00', '公車', '北區', '操場的排水可以改善，下雨後常常積水。'],
    ['2026-10-05 08:03:00', '步行', '南區', '圖書館可以開放到晚上，方便寫功課。'],
    ['2026-10-05 08:04:00', '公車', '東區', ''],
    ['2026-10-05 08:05:00', '步行', '北區', '希望多辦英語戲劇活動，讓大家有機會上台。'],
  ];
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(xlsx('通學調查 (回覆).xlsx', head, rows));
  await rail(page, '問卷類型').click();
  await page.getByRole('radio', { name: /意見調查/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await expect(page.getByRole('button', { name: /^你最常用哪種交通工具上學？：/ })).toContainText('選擇題');
  await noOverflow(page);
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await step(page, '統計').click();
  const main = page.locator('main');
  await page.locator('.wb-list').getByRole('button', { name: /你最常用哪種交通工具/ }).click();
  await expect(main).toContainText('公車');
  await expect(main).toContainText('50%'); // 3 / 6
  await page.locator('.wb-list').getByRole('button', { name: /對學校有什麼建議/ }).click();
  await expect(main).toContainText('圖書館可以開放到晚上');
  await noOverflow(page);
});
