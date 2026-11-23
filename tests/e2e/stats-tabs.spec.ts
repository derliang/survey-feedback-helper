// 意見調查統計頁：題目／交叉／留言分頁、交叉熱圖、橫條帶量表文字（Issue #217，稿 5g、5f、12a／12c）。
// 全部虛構資料；桌機、平板、手機三個專案都跑。
import { type Page, expect, test } from '@playwright/test';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};
const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });
const rail = (page: Page, name: string) => page.locator('.rail').getByRole('button', { name: new RegExp(String.raw`^\d?\s*` + name) });

const ROWS = [
  [5, '實作', '籃球', '希望多做實驗'],
  [4, '討論', '閱讀', ''],
  [4, '實作', '籃球', '作業可以少一點'],
  [3, '講述', '手作', ''],
  [5, '實作', '手作', '老師講解很清楚'],
  [2, '講述', '閱讀', '進度太快'],
  [4, '討論', '籃球', ''],
  [5, '實作', '閱讀', '期待戶外教學'],
  [3, '討論', '籃球', ''],
  [4, '實作', '閱讀', '分組討論很有趣'],
  [4, '討論', '手作', ''],
  [5, '實作', '籃球', '謝謝老師'],
];
const csv = [['時間戳記', '課程滿意度', '喜歡的學習方式', '想參加的活動', '其他建議'].join(','), ...ROWS.map((r, i) => [`2026-10-${10 + (i % 9)} 10:0${i % 10}:00`, ...r].join(','))].join('\n');

async function toStats(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({ name: '課程意見調查 (回覆).csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
  await rail(page, '問卷類型').click();
  await page.getByRole('radio', { name: /意見調查/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await step(page, '統計').click();
  await expect(page.getByRole('heading', { name: '統計', level: 1 })).toBeVisible();
}

test('量表題：橫條帶量表文字、人數與百分比', async ({ page }) => {
  await toStats(page);
  await page.locator('.wb-list').getByRole('button', { name: /課程滿意度/ }).click();
  const chart = page.locator('.chart svg').first();
  await expect(chart).toContainText('5 非常同意');
  await expect(chart).toContainText('1 非常不同意');
  await expect(chart).toContainText('4 人・33%');
  await noOverflow(page);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/q-${test.info().project.name}.png` : test.info().outputPath('q.png') });
});

test('分頁：題目／交叉／留言切換，交叉熱圖有各組平均與人數', async ({ page }) => {
  await toStats(page);
  const tabs = page.getByTestId('view-tabs');
  await expect(tabs.getByRole('button', { name: '題目' })).toHaveAttribute('aria-pressed', 'true');

  await tabs.getByRole('button', { name: '交叉' }).click();
  const cross = page.getByTestId('cross-view');
  await expect(cross).toBeVisible();
  await expect(page.locator('.wb-list')).toHaveCount(0);
  // 以「喜歡的學習方式」分組：實作 6 人，滿意度平均 (5+4+5+5+4+5)/6 = 4.7
  await expect(cross.getByRole('rowheader', { name: /實作/ })).toContainText('6人');
  await expect(cross.getByRole('row', { name: /實作/ }).getByTestId('heat-cell')).toHaveText('4.7');
  await noOverflow(page);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/cross-${test.info().project.name}.png` : test.info().outputPath('cross.png') });

  await tabs.getByRole('button', { name: '留言' }).click();
  const cm = page.getByTestId('comments-view');
  await expect(cm.getByTestId('comment')).toHaveCount(7);
  await cm.getByRole('searchbox', { name: '搜尋留言' }).fill('老師');
  await cm.getByRole('button', { name: '搜尋' }).click();
  await expect(cm.getByTestId('comment')).toHaveCount(2);
  await expect(cm.locator('mark').first()).toHaveText('老師');
  await expect(cm).toContainText('符合 2 則，共 7 則');
  await noOverflow(page);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/comments-${test.info().project.name}.png` : test.info().outputPath('comments.png') });

  await tabs.getByRole('button', { name: '題目' }).click();
  await expect(page.locator('.wb-list')).toBeVisible();
});
