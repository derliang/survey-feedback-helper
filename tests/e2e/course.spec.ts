import { type Download, type Page, expect, test } from '@playwright/test';
import { makeXlsx } from './fixtures';

// 選課分組志願（虛構資料）：12 位學生、4 門課，名額合計 10，所以一定有人進待安排；攝影社只有林十二把它排第 3，一定低於最少開班 2 人。
const HEADERS = ['時間戳記', '座號', '姓名', '第一志願', '第二志願', '第三志願'];
const P = ['微積分', '生物實驗', '地球探索'] as const;
const ROWS: (string | number)[][] = [
  ['2026-11-01 10:00:00', 1, '王一', P[0], P[1], P[2]],
  ['2026-11-01 10:00:01', 2, '王二', P[0], P[1], P[2]],
  ['2026-11-01 10:00:02', 3, '王三', P[0], P[2], P[1]],
  ['2026-11-01 10:00:03', 4, '王四', P[0], P[2], P[1]],
  ['2026-11-01 10:00:04', 5, '王五', P[1], P[0], P[2]],
  ['2026-11-01 10:00:05', 6, '王六', P[1], P[0], P[2]],
  ['2026-11-01 10:00:06', 7, '王七', P[1], '地球 探索', P[0]],
  ['2026-11-01 10:00:07', 8, '王八', P[1], P[0], P[2]],
  ['2026-11-01 10:00:08', 9, '王九', P[2], P[0], P[1]],
  ['2026-11-01 10:00:09', 10, '王十', P[2], P[1], P[0]],
  ['2026-11-01 10:00:10', 11, '林十一', '', '', ''],
  ['2026-11-01 10:00:11', 12, '林十二', P[0], P[1], '攝影社'],
];

const file = () => ({ name: '選課志願 (回覆).xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: makeXlsx(HEADERS, ROWS) });
const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

async function toMapping(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(file());
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
}

async function mapped(page: Page) {
  await toMapping(page);
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

/** 目前已分配人數（數字磚「已分配 N／12」的 N）。 */
const assigned = async (page: Page) => Number(/(\d+)／12/.exec(await page.getByTestId('tile-assigned').innerText())![1]);

/** 填名額：微積分 3、生物實驗 3、地球探索 2、攝影社 2（最少開班 2）。 */
async function fillRules(page: Page) {
  await expect(page.getByRole('heading', { name: '每個課程收幾人？' })).toBeVisible();
  await page.getByTestId('merge-row').getByRole('button', { name: '合併', exact: true }).click();
  await expect(page.getByTestId('merge-row')).toHaveCount(0);
  const caps = ['3', '3', '2', '2'];
  for (let i = 0; i < 4; i++) await page.getByTestId(`cap-${i}`).fill(caps[i]!);
  await page.getByTestId('min-3').fill('2');
}

/** 打開某門課的名單：手機是底部面板，平板與桌機在中欄。 */
async function openRoster(page: Page, name: string | RegExp) {
  await page.getByTestId(name === '待安排' ? 'crow-pending' : 'crow').filter({ hasText: name }).first().click();
  await expect(page.getByTestId('roster-panel')).toBeVisible();
}

const closePanelIfSheet = async (page: Page) => {
  if (page.viewportSize()!.width < 600) await page.getByRole('dialog').getByRole('button', { name: '完成' }).click();
};

test('入口：第五種類型、志願欄順序與新增志願欄', async ({ page }) => {
  await toMapping(page);
  const card = page.getByRole('radio', { name: /選課分組志願/ });
  await expect(card).toContainText('建議');
  await expect(card).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('course-howto')).toContainText('待核對');
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await expect(page.getByRole('button', { name: /^第一志願：/ })).toContainText('志願 1');
  await expect(page.getByRole('button', { name: /^第三志願：/ })).toContainText('志願 3');
  await noOverflow(page);

  // 順序調整：把第三志願往上移一格，它變成志願 2
  await page.getByRole('button', { name: '上移：第三志願' }).click();
  await expect(page.getByRole('button', { name: /^第三志願：/ })).toContainText('志願 2');
  await expect(page.getByRole('button', { name: /^第二志願：/ })).toContainText('志願 3');
  await page.getByRole('button', { name: '下移：第三志願' }).click();
  await expect(page.getByRole('button', { name: /^第三志願：/ })).toContainText('志願 3');

  // 角色面板：選「志願」後有「第幾志願」，別欄用掉的順位停用
  await page.getByRole('button', { name: /^第二志願：/ }).click();
  const chips = page.getByRole('dialog').getByRole('radiogroup', { name: '第幾志願' });
  await expect(chips.getByRole('radio', { name: '1（已用）' })).toBeDisabled();
  await expect(chips.getByRole('radio', { name: '2', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '套用' }).click();

  // 把時間戳記加成新的志願欄
  await page.getByTestId('add-pref').click();
  await page.getByRole('dialog').getByRole('button', { name: /時間戳記/ }).click();
  await expect(page.getByRole('button', { name: /^時間戳記：/ })).toContainText('志願 4');
});

test('名額與分配：合併、分配、手動移人、復原、輸出', async ({ page }) => {
  await mapped(page);
  await expect(step(page, '名額與分配')).toBeVisible();
  await step(page, '名額與分配').click();

  // 沒填名額：主按鈕停用並寫原因
  await expect(page.getByTestId('course-start')).toBeDisabled();
  await expect(page.getByTestId('course-why')).toContainText('名額');
  await expect(page.getByText('有 1 個課程名和表單選項對不上')).toBeVisible();
  await fillRules(page);
  await page.getByTestId('min-2').fill('5'); // 最少開班 5 > 名額 2
  await expect(page.getByText('最少不能大於名額 2')).toBeVisible();
  await expect(page.getByTestId('course-start')).toBeDisabled();
  await page.getByTestId('min-2').fill('2');
  await noOverflow(page);
  await expect(page.getByText(/名額合計 10，填答 12 人，至少 2 人會進待安排/)).toBeVisible();
  await page.getByTestId('course-start').click();

  // 結果：三塊數字磚（攝影社最多 1 人，所以 8 或 9 人分到名額）
  await expect(page.getByTestId('crow')).toHaveCount(4);
  const a0 = await assigned(page);
  expect([8, 9]).toContain(a0);
  await expect(page.getByTestId('tile-pending')).toContainText(String(12 - a0));
  await expect(page.getByTestId('record')).toContainText('名額 10');
  await expect(page.getByTestId('close-note')).toContainText('攝影社');
  await expect(page.getByTestId('close-note')).toContainText('不會自動重分');
  await expect(page.getByTestId('crow').filter({ hasText: '攝影社' })).toContainText('建議停開');
  await noOverflow(page);
  const seed = await page.getByTestId('seed-value').innerText();

  // 重新抽籤換種子，復原後回到原本的種子與結果
  await page.getByTestId('redraw').click();
  await expect(page.getByTestId('seed-value')).not.toHaveText(seed);
  await page.getByTestId('undo').click();
  await expect(page.getByTestId('seed-value')).toHaveText(seed);

  // 手動移人：待安排的第一位放入地球探索（超額）
  await openRoster(page, '待安排');
  const who = await page.getByTestId('srow').first().locator('.sr-name').innerText();
  await page.getByTestId('srow').first().getByRole('button', { name: /放入/ }).click();
  await page.getByRole('radio', { name: /地球探索/ }).click();
  await expect(page.getByRole('dialog').last()).toContainText('超額 1 人');
  await page.getByTestId('move-confirm').click();
  await closePanelIfSheet(page);
  await expect(page.getByTestId('move-msg')).toContainText(`已把 ${who} 從待安排移到地球探索`);
  await expect.poll(() => assigned(page)).toBe(a0 + 1);
  await expect(page.getByTestId('crow').filter({ hasText: '地球探索' })).toContainText('超額 1 人');
  await page.getByTestId('undo').click();
  await expect.poll(() => assigned(page)).toBe(a0);
  await expect(page.getByTestId('crow').filter({ hasText: '地球探索' })).not.toContainText('超額');

  // 輸出：三個檔案
  await page.getByTestId('course-next').click();
  await expect(page.getByTestId('hit-preview')).toContainText('第 1 志願');
  await noOverflow(page);
  const downloads: Download[] = [];
  page.on('download', (d) => downloads.push(d));
  await page.getByTestId('course-download').click();
  await expect.poll(() => downloads.length).toBe(3);
  expect(downloads.map((d) => d.suggestedFilename()).sort()).toEqual(['選課志願 (回覆) 分組名單.xlsx', '選課志願 (回覆) 志願命中統計.xlsx', '選課志願 (回覆) 待安排名單.xlsx'].sort());
});

test('優先名單與建議停開', async ({ page }) => {
  await mapped(page);
  await step(page, '名額與分配').click();
  await fillRules(page);
  // 微積分名額縮成 1、5 人搶：優先的王一（第 1 志願微積分）一定拿到；地球探索最少 4 人，一定低於
  await page.getByTestId('cap-0').fill('1');
  await page.getByTestId('prio-open').click();
  await expect(page.getByRole('dialog')).toContainText('優先名單 · 已選 0 人');
  await page.getByRole('dialog').getByRole('checkbox', { name: /王三/ }).check();
  await expect(page.getByRole('dialog')).toContainText('優先名單 · 已選 1 人');
  await page.getByRole('dialog').getByRole('button', { name: '完成' }).click();
  await page.getByTestId('course-start').click();
  await expect(page.getByTestId('tile-assigned')).toBeVisible();
  await openRoster(page, /微積分/);
  const row = page.getByTestId('srow').filter({ hasText: '王三' });
  await expect(row).toContainText('優先');
  await expect(row).toContainText('第1志願');
  await closePanelIfSheet(page);
});

test('桌機：拖曳與鍵盤移人', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '拖曳只在桌機滑鼠開放');
  await page.setViewportSize({ width: 1280, height: 1200 }); // 拖曳起點與目標要都在畫面內
  await mapped(page);
  await step(page, '名額與分配').click();
  await fillRules(page);
  await page.getByTestId('course-start').click();
  const a0 = await assigned(page);

  // 鍵盤：Enter 開「移到…」，下鍵選，Enter 確認
  await openRoster(page, '待安排');
  await page.getByTestId('srow').first().getByRole('button', { name: /放入/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect.poll(() => assigned(page)).toBe(a0 + 1);
  await page.getByTestId('undo').click();
  await expect.poll(() => assigned(page)).toBe(a0);

  // 滑鼠拖曳：把待安排的人拖到第二門課，放開前目標有外框，超額有警示標籤
  const handle = page.getByTestId('srow').first().locator('.handle');
  const target = page.getByTestId('crow').nth(1);
  const h = (await handle.boundingBox())!;
  const t = (await target.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 40, h.y + 10, { steps: 4 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 });
  await expect(target).toHaveClass(/drop-on/);
  await expect(target).toContainText('放入會超額');
  await page.mouse.up();
  await expect.poll(() => assigned(page)).toBe(a0 + 1);
  // Esc 取消拖曳
  await page.getByTestId('undo').click();
  const h2 = (await page.getByTestId('srow').first().locator('.handle').boundingBox())!;
  await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2);
  await page.mouse.down();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect.poll(() => assigned(page)).toBe(a0);
});

test('名單外填答者：預設不進分配，按「納入」後算進去，可復原', async ({ page }) => {
  await mapped(page);
  // 名單只放 1～11 號，林十二（12 號）不在名單上
  const roster = ['王一', '王二', '王三', '王四', '王五', '王六', '王七', '王八', '王九', '王十', '林十一'].map((n, i) => `${i + 1} ${n}`).join('\n');
  await page.getByRole('textbox', { name: '貼上名單' }).fill(roster);
  await page.getByRole('button', { name: '加入名單' }).click();
  await step(page, '名額與分配').click();
  await expect(page.getByText(/1 位填答者不在名單上/)).toBeVisible();
  await expect(page.getByTestId('include-outside')).toBeVisible();
  await page.getByTestId('include-outside').click();
  await expect(page.getByTestId('undo-include')).toBeVisible();
  await expect(page.getByText(/已把 1 位名單外的填答者納入分配/)).toBeVisible();
  await page.getByTestId('undo-include').click();
  await expect(page.getByTestId('include-outside')).toBeVisible();
});
