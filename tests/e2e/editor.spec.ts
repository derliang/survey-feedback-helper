import { type Page, expect, test } from '@playwright/test';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

const smallButtons = (page: Page) =>
  page.$$eval('button:not([hidden]), label.btn', (els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .map((e) => ({ t: e.textContent?.trim() || e.getAttribute('aria-label'), h: e.getBoundingClientRect().height }))
      .filter((x) => x.h < 43),
  );

async function openLibrary(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: '範本與版面' }).click();
  await expect(page.getByRole('heading', { name: '範本與版面' })).toBeVisible();
}

test('範本庫：內建範本、不橫向捲動、按鈕夠大', async ({ page }) => {
  await openLibrary(page);
  await expect(page.getByTestId('template-card')).toHaveCount(3);
  await expect(page.getByText('個人回饋單', { exact: true })).toBeVisible();
  await noOverflow(page);
  expect(await smallButtons(page)).toEqual([]);
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByTestId('template-card')).toHaveCount(0);
});

test('編輯：改標題文字（內建先複製成我的範本）、復原重做、加入與刪除區塊', async ({ page }, info) => {
  const wide = info.project.name === 'desktop';
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  await expect(page.getByLabel('範本名稱')).toHaveValue('個人回饋單');
  await noOverflow(page);

  if (!wide) {
    // 手機：先在區塊清單改，再回預覽
    await page.getByRole('button', { name: '區塊清單' }).click();
  }
  await page.getByRole('button', { name: '標題', exact: true }).first().click();
  if (!wide) await page.getByRole('button', { name: '編輯屬性' }).click();
  const box = page.getByLabel('內容', { exact: true });
  await box.fill('{姓名} 的期末回饋');
  await expect(page.getByTestId('toast')).toContainText('已複製成');
  await expect(page.getByLabel('範本名稱')).toHaveValue('個人回饋單（我的）');
  if (!wide) await page.getByRole('button', { name: '完成' }).click();
  if (!wide) await page.getByRole('button', { name: '預覽', exact: true }).click();
  await expect(page.getByText('林小宇 的期末回饋')).toBeVisible();

  // 復原／重做
  await page.getByRole('button', { name: '復原' }).click();
  await expect(page.getByText('林小宇 的期末回饋')).toBeHidden();
  await page.getByRole('button', { name: '重做' }).click();
  await expect(page.getByText('林小宇 的期末回饋')).toBeVisible();

  // 加入一個分隔線再刪除
  await page.getByRole('button', { name: /^加入/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '分隔線' }).click();
  if (!wide) await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '刪除', exact: true }).click();
  await noOverflow(page);
  expect(await smallButtons(page)).toEqual([]);
});

test('編輯：區塊清單用按鈕上移；多欄與頁面設定', async ({ page }, info) => {
  const wide = info.project.name === 'desktop';
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  if (!wide) await page.getByRole('button', { name: '區塊清單' }).click();
  const names = () => page.locator('.blk-name').allTextContents();
  const before = await names();
  await page.getByRole('button', { name: '下移「標題」' }).first().click();
  const after = await names();
  expect(after[1]).toBe(before[0]);

  // 頁面設定：改成橫式
  await page.getByRole('button', { name: wide ? '頁面設定' : '頁面', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '橫式' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /完成|關閉/ }).click();
  await noOverflow(page);
});

test('手機：預設捲動模式不能選取，打開編輯後可以', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', '桌機沒有模式切換');
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  await expect(page.getByText('沒有選取區塊')).toBeVisible();
  await page.locator('.eb').first().click({ force: true });
  await expect(page.getByText('沒有選取區塊')).toBeVisible();
  await page.getByRole('button', { name: '編輯', exact: true }).click();
  await page.locator('.eb').first().click();
  await expect(page.getByText(/已選取：/)).toBeVisible();
  // 縮放
  await page.getByRole('button', { name: '放大' }).click();
  await expect(page.getByRole('button', { name: '符合寬度' })).toHaveText('125%');
  await noOverflow(page);
});

test('個別學生版本：改一位學生的文字，範本不變，可逐項還原', async ({ page }, info) => {
  const wide = info.project.name === 'desktop';
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  await page.getByRole('button', { name: wide ? /^單一學生的專屬版面/ : '單一學生', exact: false }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /林小宇/ }).click();
  await expect(page.getByText('個別版本', { exact: true }).first()).toBeVisible();
  if (!wide) await page.getByRole('button', { name: '區塊清單' }).click();
  await page.getByRole('button', { name: '開場白' }).click();
  if (!wide) await page.getByRole('button', { name: '編輯屬性' }).click();
  await page.getByLabel('內容', { exact: true }).fill('只給這位同學的話');
  if (!wide) await page.getByRole('button', { name: '完成' }).click();
  await page.getByRole('button', { name: wide ? /^單一學生的專屬版面/ : '單一學生' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('開場白：改了 text');
  await page.getByRole('dialog').getByRole('button', { name: '還原' }).click();
  await expect(page.getByRole('dialog')).toContainText('還沒有');
  await page.getByRole('dialog').getByRole('button', { name: '全班範本' }).click();
  await expect(page.getByLabel('範本名稱')).toHaveValue('個人回饋單');
});

test('範本匯出、匯入與選單', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: '「班級總表」的選單' }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: /下載範本檔供分享/ }).click();
  const file = await dl;
  const path = await file.path();
  expect(path).toBeTruthy();
  // 匯入剛匯出的範本檔
  await page.getByTestId('template-input').setInputFiles(path!);
  await expect(page.getByTestId('toast')).toContainText('已匯入');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByTestId('template-card')).toHaveCount(1);
  // 壞檔
  await page.getByTestId('template-input').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('不是範本') });
  await expect(page.getByTestId('toast')).toContainText('這不是範本檔');
  // 刪除要再確認
  await page.getByRole('button', { name: /的選單/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: '刪除', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('刪除這份範本');
  await page.getByRole('dialog').getByRole('button', { name: '刪除', exact: true }).click();
  await expect(page.getByTestId('template-card')).toHaveCount(0);
  await noOverflow(page);
});

test('沒有資料夾時提示下載備份；有資料夾時重開後範本還在', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'File System Access 僅 Chromium');
  await openLibrary(page);
  await page.getByRole('button', { name: '「班級總表」的選單' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '複製' }).click();
  await expect(page.getByText('尚未選擇資料夾，請下載備份，避免關閉後遺失範本修改。')).toBeVisible();
  await expect(page.getByRole('button', { name: '下載目前的範本備份檔' })).toBeVisible();

  // 以瀏覽器內建資料夾模擬
  await page.addInitScript(() => {
    (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker = () => navigator.storage.getDirectory();
  });
  await page.goto('./');
  await page.getByRole('button', { name: '選擇資料夾' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '選擇資料夾' }).click();
  await expect(page.getByText('已取得資料夾存取權')).toBeVisible();
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByRole('button', { name: '「班級總表」的選單' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '複製' }).click();
  await expect(page.getByText('尚未選擇資料夾')).toBeHidden();
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByText('已取得資料夾存取權')).toBeVisible();
  await page.getByRole('button', { name: '範本與版面' }).click();
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByTestId('template-card')).toHaveCount(1);
});

test('設計落地：桌機範本卡露出「編輯」「用這份輸出」，其他寬度只有選單', async ({ page }, info) => {
  await openLibrary(page);
  const card = page.getByTestId('template-card').first();
  if (info.project.name === 'desktop') {
    await expect(card.getByRole('button', { name: /^編輯版面/ })).toBeVisible();
    await expect(card.getByRole('button', { name: /輸出$/ })).toBeVisible();
  } else {
    await expect(card.getByRole('button', { name: /^編輯版面/ })).toHaveCount(0);
  }
  await expect(card.getByRole('button', { name: /的選單$/ })).toBeVisible();
  expect(await smallButtons(page)).toEqual([]);
});

test('設計落地：紙張用 --doc-* token、縮放旁顯示頁數、把手 ≥44', async ({ page }, info) => {
  const wide = info.project.name === 'desktop';
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  await expect(page.getByTestId('page-count')).toHaveText(/共 \d+ 頁/);
  const paper = await page.locator('.pv-page').first().evaluate((el) => ({ cls: el.className, bg: getComputedStyle(el).backgroundColor }));
  expect(paper.cls).toContain('doc-warm');
  expect(paper.bg).toBe('rgb(255, 255, 255)');
  if (!wide) await page.getByRole('button', { name: '區塊清單' }).click();
  const grip = await page.locator('.grip').first().boundingBox();
  expect(grip!.width).toBeGreaterThanOrEqual(44);
  expect(grip!.height).toBeGreaterThanOrEqual(44);
});

test('設計落地：面板進場有動畫，減少動態時為 0', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: '「班級總表」的選單' }).click();
  const anim = () => page.locator('.sheet').first().evaluate((el) => getComputedStyle(el).animationDuration);
  expect(await anim()).toBe('0.22s');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '「班級總表」的選單' }).click();
  expect(['0s', '']).toContain(await anim());
});

test('桌機拖曳（5.26）：滑鼠按住移動不到 4px 不開始，超過才開始', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '滑鼠拖曳門檻只在桌機');
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  const box = (await page.locator('.grip').first().boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 3);
  await expect(page.locator('.blk.lift')).toHaveCount(0);
  await page.mouse.move(x, y + 12);
  await expect(page.locator('.blk.lift')).toHaveCount(1);
  await page.mouse.up();
});

test('桌機（5.26）：圖示鈕工具提示懸停 500ms、鍵盤焦點立即；鍵盤拖曳 Space 拿起、↑↓ 移動、Esc 取消', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '工具提示與鍵盤拖曳驗桌機');
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  const mv = page.locator('.blk-mv .icbtn').nth(1);
  const tip = () => mv.evaluate((el) => ({ o: getComputedStyle(el, '::after').opacity, c: getComputedStyle(el, '::after').content }));
  expect((await tip()).o).toBe('0');
  await mv.hover();
  expect((await mv.evaluate((el) => getComputedStyle(el, '::after').transitionDelay))).toBe('0.5s');
  await expect.poll(async () => (await tip()).o).toBe('1');
  expect((await tip()).c).toContain('下移');
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await tip()).o).toBe('0');

  const names = () => page.locator('.blk-list .blk .blk-name').allTextContents();
  const before = await names();
  const grip = page.locator('.blk-list .grip[tabindex="0"]').first();
  await grip.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.blk-list [role="status"]')).toContainText(/第 1 個，共 \d+ 個/);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.blk-list [role="status"]')).toContainText('第 2 個');
  expect((await names())[1]).toBe(before[0]);
  await page.keyboard.press('Escape');
  await expect.poll(names).toEqual(before);
});

test('設計落地 G9：手機底部操作列四顆按鈕夠大、字不被截', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', '只有手機版有底部操作列');
  await openLibrary(page);
  await page.getByRole('button', { name: '編輯「個人回饋單」' }).click();
  const btns = await page.$$eval('.ed-act button', (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { t: el.textContent?.trim(), w: r.width, h: r.height, clipped: el.scrollWidth > el.clientWidth };
    }),
  );
  expect(btns.map((b) => b.t)).toEqual(['頁面', '單一學生', '加入', '編輯屬性']);
  for (const b of btns) {
    expect(b.w, b.t).toBeGreaterThanOrEqual(44);
    expect(b.h, b.t).toBeGreaterThanOrEqual(44);
    expect(b.clipped, `${b.t} 被截`).toBe(false);
  }
  await noOverflow(page);
});
