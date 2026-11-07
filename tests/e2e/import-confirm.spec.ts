import { type Locator, type Page, expect, test } from '@playwright/test';
import { makeXlsx, makeXlsxSheets } from './fixtures';

// 匯入確認三畫面（待分類、量表上下限、選擇工作表）：三種寬度、深淺色、點擊區 ≥44、不橫向捲動。資料全是虛構。

const xlsx = (name: string, buffer: Buffer) => ({ name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

/** 每個元素的點擊區高度都 ≥44。 */
const tall = async (loc: Locator) => {
  const n = await loc.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const b = await loc.nth(i).boundingBox();
    expect(b!.height, `第 ${i + 1} 個`).toBeGreaterThanOrEqual(44);
  }
};

async function enter(page: Page, item: string) {
  await page.locator('.rail').getByRole('button', { name: new RegExp(String.raw`^\d?\s*` + item) }).click();
}

async function toMapping(page: Page) {
  await enter(page, '問卷類型');
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await expect(page.getByRole('heading', { name: '欄位對應' })).toBeVisible();
}

/** 12 位學生：座號、姓名、兩題評分，再加兩欄猜不出題型的文字欄。 */
const pendingBook = () =>
  makeXlsx(
    ['座號', '姓名', '整體滿意度', '活動安排', '用一個詞形容這次活動', '另一欄'],
    Array.from({ length: 12 }, (_, i) => [i + 1, `學生${String.fromCharCode(65 + i)}`, (i % 5) + 1, ((i + 2) % 5) + 1, `想法${i}`, `備註${i}`]),
  );

/** 兩題評分大多 1～5，其中一題有 1 筆 0 分。 */
const zeroBook = () =>
  makeXlsx(
    ['座號', '姓名', '整體滿意度', '活動安排'],
    Array.from({ length: 20 }, (_, i) => [i + 1, `學生${String.fromCharCode(65 + i)}`, (i % 5) + 1, i === 3 ? 0 : ((i + 2) % 5) + 1]),
  );

const sheetsBook = () =>
  makeXlsxSheets([
    { name: '使用說明', headers: ['使用說明'], rows: [['請先填寫'], ['填完交回'], ['謝謝'], ['有問題問老師'], ['不要改欄名']] },
    {
      name: '問卷回覆',
      headers: ['時間戳記', '姓名', '座號', '整體滿意度'],
      rows: Array.from({ length: 12 }, (_, i) => [`2026-11-0${(i % 7) + 1} 10:00`, `學生${String.fromCharCode(65 + i)}`, i + 1, (i % 5) + 1]),
    },
    {
      name: '去年資料',
      headers: ['時間戳記', '姓名', '座號', '整體滿意度'],
      rows: Array.from({ length: 8 }, (_, i) => [`2025-11-0${(i % 7) + 1} 10:00`, `舊生${String.fromCharCode(65 + i)}`, i + 1, (i % 5) + 1]),
    },
    { name: 'Sheet3', headers: [], rows: [] },
  ]);

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme === 'light' ? '淺色' : '深色'}模式`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('./');
    });

    test('待分類：集中清單、硬擋「完成對應」、一鍵全不使用、可反悔', async ({ page }) => {
      await page.getByTestId('file-input').setInputFiles(xlsx('活動回饋.xlsx', pendingBook()));
      await expect(page.getByRole('heading', { level: 1, name: '活動回饋' })).toBeVisible();
      await toMapping(page);
      // 寬螢幕左欄的「欄位對應」副標寫出「N 欄待分類」（手機的總覽另一頁，下面回總覽時再看）
      if (page.viewportSize()!.width >= 600) await expect(page.locator('.rail').getByText('6 欄 · 2 欄待分類')).toBeVisible();

      const card = page.getByTestId('pending-card');
      await expect(card.getByRole('heading', { name: '待分類（2 欄）' })).toBeVisible();
      await expect(card.getByText('系統看不出這幾欄是什麼題型，分類前不會進統計。')).toBeVisible();
      await expect(card.getByText('12 人有填，12 種答案，答案偏短、種類偏多').first()).toBeVisible();
      // 待分類欄不算進「N 欄請確認」，也不在「沒有使用的欄」裡
      await expect(page.getByText('所有欄位都已確認')).toBeHidden();
      await expect(page.locator('.unused')).toBeHidden();
      // 還有待分類欄：停用並寫出原因
      const done = page.getByRole('button', { name: '完成對應，下一步' });
      await expect(done).toBeDisabled();
      await expect(page.getByTestId('gate-why')).toHaveText('還有 2 欄待分類，分完才能往下。');
      await tall(card.getByRole('radio'));
      await tall(page.getByTestId('pend-all-ignore'));
      await noOverflow(page);

      // 第一欄分到「開放意見」：移到已處理，剩 1 欄，不再有「其餘 N 欄都不使用」
      await card.getByRole('radiogroup', { name: /用一個詞形容這次活動/ }).getByRole('radio', { name: '開放意見' }).click();
      await expect(card.getByRole('heading', { name: '待分類（1 欄）' })).toBeVisible();
      await expect(card.getByText('已處理（1）')).toBeVisible();
      await expect(card.getByText('分類為「開放意見」')).toBeVisible();
      await expect(page.getByTestId('pend-all-ignore')).toBeHidden();
      await expect(page.getByTestId('gate-why')).toHaveText('還有 1 欄待分類，分完才能往下。');
      // 反悔
      await card.getByRole('button', { name: '改回待分類' }).click();
      await expect(card.getByRole('heading', { name: '待分類（2 欄）' })).toBeVisible();
      // 一鍵全不使用
      await page.getByTestId('pend-all-ignore').click();
      await expect(card.getByRole('heading', { name: '待分類：2 欄都處理好了' })).toBeVisible();
      await expect(card.getByText('已完成')).toBeVisible();
      await expect(page.getByTestId('gate-why')).toBeHidden();
      await expect(done).toBeEnabled();
      await noOverflow(page);
      await done.click();
      await expect(page.getByRole('heading', { name: '學生名單' })).toBeVisible();
    });

    test('待分類：「其他類型…」開既有的欄位類型面板', async ({ page }) => {
      await page.getByTestId('file-input').setInputFiles(xlsx('活動回饋.xlsx', pendingBook()));
      await toMapping(page);
      await page.getByTestId('pending-card').getByRole('button', { name: '其他類型…' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('radio', { name: '書名' }).click();
      await page.getByRole('button', { name: '套用' }).click();
      await expect(page.getByTestId('pending-card').getByText('已處理（1）')).toBeVisible();
      await expect(page.getByTestId('pending-card').getByText('分類為「書名」')).toBeVisible();
    });

    test('量表上下限：有疑慮才問、不預選只標建議、確認後不被重算覆蓋', async ({ page }) => {
      await page.getByTestId('file-input').setInputFiles(xlsx('活動回饋.xlsx', zeroBook()));
      await toMapping(page);
      const card = page.getByTestId('scale-card');
      await expect(card.getByRole('heading', { name: '量表上下限請確認' })).toBeVisible();
      await expect(card.getByText(/評分題共 2 欄、40 筆分數。大多數落在 1～5 分，但有 1 筆 0 分/)).toBeVisible();
      await expect(card.getByText('可疑', { exact: true })).toBeVisible();
      await expect(card.getByText('0 分出現在「活動安排」欄（1 筆）。')).toBeVisible();
      // 不預選：兩張卡都沒選，「建議」標在 1～5
      const r15 = page.getByTestId('scale-1-5');
      const r010 = page.getByTestId('scale-0-10');
      await expect(r15).toHaveAttribute('aria-checked', 'false');
      await expect(r010).toHaveAttribute('aria-checked', 'false');
      await expect(r15.getByText('建議')).toBeVisible();
      await expect(r010.getByText('建議')).toBeHidden();
      await expect(r15.getByText(/0 分的 1 筆算「超出範圍」/)).toBeVisible();
      await expect(r010.getByText('0 分是合法分數：1 筆會算進平均與分布。')).toBeVisible();
      // 沒確認前停用
      const done = page.getByRole('button', { name: '完成對應，下一步' });
      await expect(done).toBeDisabled();
      await expect(page.getByTestId('gate-why')).toHaveText('量表上下限還沒確認，確認後才能往下。');
      await tall(card.getByRole('radio'));
      await noOverflow(page);

      // 老師選 0～10：確認後出現結果提示、可往下
      await r010.click();
      await expect(r010).toHaveAttribute('aria-checked', 'true');
      await expect(card.getByText('已確認：0～10 分。0 分的 1 筆會算進平均與分布。')).toBeVisible();
      await expect(done).toBeEnabled();
      await done.click();
      await expect(page.getByRole('heading', { name: '學生名單' })).toBeVisible();

      // 回到欄位對應：老師選的 0～10 不能被自動判斷（1～5）蓋掉
      await page.locator('.stepper').getByRole('button', { name: /準備資料/ }).click();
      await enter(page, '欄位對應');
      await expect(page.getByTestId('scale-0-10')).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByTestId('scale-1-5')).toHaveAttribute('aria-checked', 'false');
      // 可再改：改選 1～5
      await page.getByTestId('scale-1-5').click();
      await expect(page.getByText('已確認：1～5 分。0 分的 1 筆會列入資料檢查。')).toBeVisible();
    });

    test('量表沒有疑慮：不出現確認卡，維持分段選擇', async ({ page }) => {
      await page.getByTestId('file-input').setInputFiles(
        xlsx(
          '活動回饋.xlsx',
          makeXlsx(['座號', '姓名', '整體滿意度', '活動安排'], Array.from({ length: 12 }, (_, i) => [i + 1, `學生${String.fromCharCode(65 + i)}`, (i % 5) + 1, ((i + 2) % 5) + 1])),
        ),
      );
      await toMapping(page);
      await expect(page.getByTestId('scale-card')).toBeHidden();
      await expect(page.getByRole('radio', { name: '0～10 分' })).toBeVisible();
    });

    test('選擇工作表：2 張以上有資料才出頁，預選資料列最多者，可更換', async ({ page }) => {
      await page.getByTestId('file-input').setInputFiles(xlsx('活動滿意度調查.xlsx', sheetsBook()));
      await expect(page.getByRole('heading', { level: 1, name: '這個 Excel 檔有 3 張工作表有資料，要分析哪一張？' })).toBeVisible();
      await expect(page.getByText('一次只分析一張。')).toBeVisible();
      const cards = page.getByTestId('sheet-card');
      await expect(cards).toHaveCount(3);
      await expect(cards.nth(1)).toHaveAttribute('aria-checked', 'true');
      await expect(cards.nth(1).getByText('建議')).toBeVisible();
      await expect(cards.nth(1).getByText('12 筆資料 · 4 欄')).toBeVisible();
      await expect(cards.nth(1).getByText('前幾欄：時間戳記、姓名、座號')).toBeVisible();
      await expect(cards.nth(0)).toHaveAttribute('aria-checked', 'false');
      await expect(page.getByText('另有 1 張工作表沒有資料，已略過：Sheet3。')).toBeVisible();
      await tall(cards);
      await tall(page.getByRole('button', { name: '用這張工作表' }));
      await noOverflow(page);
      // 平板與桌機：右邊有預覽表，點別張預覽跟著換；手機不顯示預覽
      const preview = page.locator('.sp-preview');
      if (page.viewportSize()!.width >= 600) {
        await expect(preview.getByRole('columnheader', { name: '整體滿意度' })).toBeVisible();
        await cards.nth(0).click();
        await expect(preview.getByRole('columnheader', { name: '使用說明' })).toBeVisible();
        await cards.nth(1).click();
      } else {
        await expect(preview).toBeHidden();
      }
      // 「上一步」回首頁，什麼都沒開始
      await page.getByRole('button', { name: '上一步' }).click();
      await expect(page.getByTestId('file-input')).toBeAttached();
      await expect(page.getByRole('heading', { level: 1, name: '這個 Excel 檔有 3 張工作表有資料，要分析哪一張？' })).toBeHidden();

      await page.getByTestId('file-input').setInputFiles(xlsx('活動滿意度調查.xlsx', sheetsBook()));
      await page.getByRole('button', { name: '用這張工作表' }).click();
      await expect(page.getByRole('heading', { level: 1, name: '活動滿意度調查' })).toBeVisible();
      await expect(page.getByText('Excel 檔 · 12 筆回覆 · 4 欄')).toBeVisible();
      const line = page.getByTestId('sheet-line');
      await expect(line.getByText('工作表：問卷回覆')).toBeVisible();
      await expect(line.getByText('這個檔共 3 張有資料')).toBeVisible();
      await tall(page.getByTestId('sheet-change'));
      await noOverflow(page);

      // 更換工作表：回到同一頁，標「目前使用」並警示
      await page.getByTestId('sheet-change').click();
      await expect(cards.nth(1)).toHaveAttribute('aria-checked', 'true');
      await expect(cards.nth(1).getByText('目前使用')).toBeVisible();
      await expect(page.getByText('更換後會重新判斷欄位，已做的欄位對應不保留；學生名單不受影響。')).toBeVisible();
      await expect(page.getByRole('button', { name: '更換', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '取消' }).click();
      await expect(line.getByText('工作表：問卷回覆')).toBeVisible();
      await page.getByTestId('sheet-change').click();
      await cards.nth(2).click();
      await page.getByRole('button', { name: '更換', exact: true }).click();
      await expect(page.getByText('Excel 檔 · 8 筆回覆 · 4 欄')).toBeVisible();
      await expect(line.getByText('工作表：去年資料')).toBeVisible();
    });

    test('只有一張有資料的工作表：不出選擇頁、頁頭沒有更換入口', async ({ page }) => {
      const b = makeXlsxSheets([
        { name: '說明', headers: [], rows: [] },
        { name: '回覆', headers: ['座號', '整體滿意度'], rows: [[1, 5], [2, 4]] },
      ]);
      await page.getByTestId('file-input').setInputFiles(xlsx('單表.xlsx', b));
      await expect(page.getByRole('heading', { level: 1, name: '單表' })).toBeVisible();
      await expect(page.getByTestId('sheet-line')).toBeHidden();
    });
  });
}
