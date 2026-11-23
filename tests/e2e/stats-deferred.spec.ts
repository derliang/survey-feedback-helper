// 意見調查統計頁延後三項（Issue #217）：交叉「看哪些題」、留言主題籌碼、量表標籤自訂（稿 5g、5f、11d）。全部虛構資料；三種版面都跑。
import { type Page, expect, test } from '@playwright/test';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};
const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });
const rail = (page: Page, name: string) => page.locator('.rail').getByRole('button', { name: new RegExp(String.raw`^\d?\s*` + name) });

const ROWS = [
  [5, 4, '實作', '希望多辦戶外活動'],
  [4, 4, '討論', ''],
  [4, 3, '實作', '時間太趕了'],
  [3, 5, '講述', ''],
  [5, 4, '實作', '戶外寫生很好玩，時間也剛好'],
  [2, 2, '講述', '謝謝老師'],
  [4, 4, '討論', ''],
  [5, 3, '實作', '期待校外教學'],
];
const csv = [['時間戳記', '課程滿意度', '教材難度', '喜歡的學習方式', '其他建議'].join(','), ...ROWS.map((r, i) => [`2026-10-${10 + i} 10:00:00`, ...r].join(','))].join('\n');

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

test('交叉：看哪些題勾選，表格欄位跟著變，至少留一題', async ({ page }) => {
  await toStats(page);
  await page.getByTestId('view-tabs').getByRole('button', { name: '交叉' }).click();
  const cross = page.getByTestId('cross-view');
  await expect(cross.getByTestId('cross-pick')).toContainText('全部 2 題量表');
  await expect(cross.locator('thead th')).toHaveCount(3);
  await cross.getByTestId('cross-pick').click();
  await cross.getByRole('checkbox', { name: '教材難度' }).uncheck();
  await expect(cross.getByTestId('cross-pick')).toContainText('已選 1／2 題');
  await expect(cross.locator('thead th')).toHaveCount(2);
  await expect(cross.getByRole('row', { name: /實作/ }).getByTestId('heat-cell')).toHaveText('4.8');
  // 最後一題不能取消
  await cross.getByRole('checkbox', { name: '課程滿意度' }).click();
  await expect(cross.getByRole('checkbox', { name: '課程滿意度' })).toBeChecked();
  await cross.getByRole('button', { name: '全選' }).click();
  await expect(cross.locator('thead th')).toHaveCount(3);
  await noOverflow(page);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/pick-${test.info().project.name}.png` : test.info().outputPath('pick.png') });
});

test('留言：設定主題後出現籌碼與主題標籤，點籌碼篩選，未分類另列', async ({ page }) => {
  await toStats(page);
  await page.getByTestId('view-tabs').getByRole('button', { name: '留言' }).click();
  const cm = page.getByTestId('comments-view');
  await cm.getByTestId('theme-manage').click();
  await cm.getByRole('button', { name: '新增主題' }).click();
  await cm.getByRole('textbox', { name: '主題名稱' }).fill('戶外活動');
  const words = cm.getByRole('textbox', { name: /關鍵詞/ });
  await words.fill('戶外、校外');
  await words.blur();
  await cm.getByRole('button', { name: '新增主題' }).click();
  await cm.getByRole('textbox', { name: '主題名稱' }).nth(1).fill('時間安排');
  const w2 = cm.getByRole('textbox', { name: /關鍵詞/ }).nth(1);
  await w2.fill('時間,太趕');
  await w2.blur();
  await cm.getByTestId('theme-manage').click(); // 完成
  const chips = cm.getByTestId('theme-chips');
  await expect(chips.getByRole('button', { name: '全部 5' })).toBeVisible();
  await expect(chips.getByRole('button', { name: '戶外活動 3' })).toBeVisible();
  await expect(chips.getByRole('button', { name: '時間安排 2' })).toBeVisible();
  await expect(chips.getByRole('button', { name: '未分類 1' })).toBeVisible();
  await chips.getByRole('button', { name: '戶外活動 3' }).click();
  await expect(cm.getByTestId('comment')).toHaveCount(3);
  await expect(cm.getByTestId('comment').first().locator('.tag.accent')).toContainText('戶外活動');
  await chips.getByRole('button', { name: '未分類 1' }).click();
  await expect(cm.getByTestId('comment')).toHaveCount(1);
  await expect(cm.getByTestId('comment')).toContainText('謝謝老師');
  await noOverflow(page);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/themes-${test.info().project.name}.png` : test.info().outputPath('themes.png') });
});

test('量表標籤：套用滿意度預設、逐分自訂，圖表文字跟著變，可還原', async ({ page }) => {
  await toStats(page);
  await page.locator('.wb-list').getByRole('button', { name: /課程滿意度/ }).click();
  const chart = page.locator('.chart svg').first();
  await expect(chart).toContainText('5 非常同意');
  const box = page.getByTestId('scale-labels');
  await box.locator('summary').click();
  await box.getByRole('button', { name: '滿意度' }).click();
  await expect(chart).toContainText('5 非常滿意');
  await box.getByRole('textbox', { name: '分數 5 的標籤' }).fill('超讚');
  await expect(chart).toContainText('5 超讚');
  await expect(box.getByRole('button', { name: '自訂' })).toHaveAttribute('aria-pressed', 'true');
  await noOverflow(page);
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/labels-${test.info().project.name}.png` : test.info().outputPath('labels.png') });
  await box.getByRole('button', { name: '還原成預設' }).click();
  await expect(chart).toContainText('5 非常同意');
});
