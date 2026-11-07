import { type Page, expect, test } from '@playwright/test';
import { QUICK_TEMPLATES, templateHeaders } from '../../src/app/quick-templates';
import { makeXlsx, surveyFile } from './fixtures';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

/** 進統計畫面的回饋單頁（個人結果）。 */
async function statsPerson(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await page.locator('.rail').getByRole('button', { name: /^\d?\s*問卷類型/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: /^台風：/ }).click();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await page.locator('.stepper').getByRole('button', { name: /統計/ }).click();
  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
}

test('深色模式：設定頁切換後整個畫面換深色，不橫向捲動', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('radio', { name: '深色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(14, 16, 20)');
  await noOverflow(page);
  await page.getByRole('radio', { name: '淺色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('深色模式：跟隨系統', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(14, 16, 20)');
});

test('PWA：有 manifest，安裝 Service Worker 後離線重新整理仍能開', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const manifest = await page.evaluate(async () => {
    const href = (document.querySelector('link[rel="manifest"]') as HTMLLinkElement).href;
    return (await fetch(href)).json();
  });
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  // 等預先快取完成
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith('sfh-app-')))).toBe(true);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '今天要處理哪一份問卷？' })).toBeVisible();
  // 離線也能進需要動態載入的頁面
  await page.getByRole('button', { name: '用快速範本' }).click();
  await expect(page.getByRole('heading', { name: '快速範本', level: 1 })).toBeVisible();
  await context.setOffline(false);
});

test('PWA 快取只放程式本身，不放問卷資料', async ({ page }) => {
  await page.goto('./');
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith('sfh-app-')))).toBe(true);
  const list = () =>
    page.evaluate(async () => {
      const out: string[] = [];
      for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(r.url);
      return out;
    });
  await expect.poll(async () => (await list()).length, { timeout: 15_000 }).toBeGreaterThan(3);
  const urls = await list();
  expect(urls.every((u) => /\/survey-feedback-helper\/(.*\.(js|css|png|webmanifest|html)|)$/.test(u))).toBe(true);
});

test('鍵盤：Tab 先到「跳到主要內容」；面板內 Tab 循環、Esc 關閉並還原焦點', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '鍵盤操作以桌機驗證');
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '今天要處理哪一份問卷？' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳到主要內容' })).toBeFocused();
  const open = page.locator('.folder-bar').getByRole('button', { name: /選擇資料夾/ });
  await open.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});

test('動態：彈出面板有進場動畫（≤220ms），減少動態時關閉', async ({ page }) => {
  await page.goto('./');
  await page.locator('.folder-bar').getByRole('button', { name: /選擇資料夾/ }).click();
  const anim = await page.locator('.sheet').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { name: cs.animationName, ms: parseFloat(cs.animationDuration) * 1000 };
  });
  expect(anim.name).not.toBe('none');
  expect(anim.ms).toBeLessThanOrEqual(220);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.locator('.sheet').evaluate((el) => getComputedStyle(el).animationName);
  expect(reduced).toBe('none');
});

test('圖表另存圖片（JPG）', async ({ page }) => {
  await statsPerson(page);
  await page.locator('.stepper').getByRole('button', { name: /統計/ }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '另存圖片（JPG）' }).first().click()]);
  expect(dl.suggestedFilename()).toMatch(/\.jpg$/);
  const stream = await dl.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const bytes = Buffer.concat(chunks);
  expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff'); // JPEG 檔頭
  expect(bytes.length).toBeGreaterThan(1000);
});

test('常用評語：點一下插在游標處、{姓名} 換成同學名字，可存成自己的評語', async ({ page }) => {
  await statsPerson(page);
  const box = page.getByRole('textbox', { name: '老師評語' });
  await box.fill('前面。後面。');
  await box.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(3, 3));
  await page.getByRole('button', { name: '插入「很用心」' }).click();
  await expect(box).toHaveValue('前面。林雅婷準備得很用心，看得出花了很多時間。後面。');
  await noOverflow(page);

  // 切到別的分類、搜尋
  await page.getByRole('tab', { name: '表達與發表' }).click();
  await expect(page.getByRole('button', { name: '插入「台風穩」' })).toBeVisible();
  await page.getByRole('searchbox', { name: '搜尋常用評語' }).fill('負責');
  await expect(page.getByRole('button', { name: '插入「認真負責」' })).toBeVisible();
  await page.getByRole('searchbox', { name: '搜尋常用評語' }).fill('');

  // 存成常用評語：學生名字換成 {姓名}，重複時不新增
  await box.fill('林雅婷的口條很流暢。');
  await page.getByRole('button', { name: '存成常用評語' }).click();
  await expect(page.getByRole('textbox', { name: '存成常用評語' })).toHaveValue('{姓名}的口條很流暢。');
  await page.getByRole('button', { name: '存起來' }).click();
  await expect(page.getByText('已存到「我的」。')).toBeVisible();
  await page.getByRole('tab', { name: '我的' }).click();
  await expect(page.getByRole('button', { name: '插入「的口條很流暢」' })).toBeVisible();
  await page.getByRole('button', { name: '存成常用評語' }).click();
  await page.getByRole('button', { name: '存起來' }).click();
  await expect(page.getByText('已經有一樣的評語，沒有重複新增。')).toBeVisible();
});

test('快速範本：選範本看題目、複製清單，六個都在', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  await page.goto('./');
  await page.getByRole('button', { name: '用快速範本' }).click();
  await expect(page.getByRole('heading', { name: '快速範本', level: 1 })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(6);
  await page.getByRole('radio', { name: /班規議題票選/ }).click();
  await expect(page.getByText('議題一的立場').first()).toBeVisible();
  await expect(page.getByText('票選幹部').first()).toBeVisible();
  // 題型名稱已於 2026-11-07 核對：畫面上不再標「待核對」，卡底改寫核對日期
  await expect(page.getByText(/待核對/)).toHaveCount(0);
  await expect(page.getByText(/2026-11-07 核對/).first()).toBeVisible();
  await noOverflow(page);
  await page.getByRole('radio', { name: /家長意見/ }).click();
  await expect(page.getByRole('textbox', { name: '複製題目清單' })).toHaveValue(/1\. 我清楚了解孩子在班上的學習狀況/);
  await page.getByRole('button', { name: '複製題目清單' }).first().click();
  await expect(page.getByText(/已複製|不讓程式複製/)).toBeVisible();
});

test('快速範本：用範本題目建的表單匯出後開啟，會問「是不是用範本做的」並直接帶入設定', async ({ page }) => {
  const tpl = QUICK_TEMPLATES.find((t) => t.id === 'activity')!;
  const row = ['2026-11-01 10:00:00', 5, 4, 5, 4, 5, '很好玩'];
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({
    name: '活動滿意度 (回覆).xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: makeXlsx(templateHeaders(tpl), [row, row.map((v, i) => (i === 0 ? '2026-11-01 10:05:00' : v))]),
  });
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: /快速範本做的表單/ })).toBeVisible();
  await sheet.getByRole('button', { name: '是，用範本的設定' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await noOverflow(page);
});

test('教學頁與示範資料：六個區段，載入示範資料進準備資料並標「示範資料」，重新開始即清除', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Google 表單怎麼設計' }).click();
  await expect(page.getByRole('heading', { name: 'Google 表單教學', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '做法二：下載檔案再匯入' })).toBeVisible();
  await expect(page.getByText('Microsoft Excel (.xlsx)').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /五個技巧/ })).toBeVisible();
  await expect(page.getByText(/尚未提供可直接建立副本/)).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: '載入示範資料' }).click();
  await expect(page.getByTestId('demo-tag')).toBeVisible();
  await expect(page.getByRole('heading', { name: '示範資料', level: 1 })).toBeVisible();
  await noOverflow(page);
  // 不進最近的問卷、不要求存資料夾
  await expect(page.getByTestId('unsaved-dot')).toHaveCount(0);
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.getByRole('button', { name: '確定重新開始' }).click();
  await expect(page.getByTestId('demo-tag')).toHaveCount(0);
  await expect(page.getByText('選好資料夾後，處理過的問卷會出現在這裡。')).toBeVisible();
});

test('英文介面：切換後主要畫面變英文，沒翻到的字退回中文，換回來恢復', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Which survey are we working on today?' })).toBeVisible();
  await noOverflow(page);
  // 重新整理後仍是英文
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Which survey are we working on today?' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: '繁體中文' }).click();
  await expect(page.getByRole('heading', { name: '設定', level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
});

test('桌機懸停（5.26）：次按鈕懸停換 --sunk，停用不變；減少動態時 transition 為 0', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '懸停只在有滑鼠的桌機');
  await page.goto('./');
  const btn = page.locator('.btn.secondary:not(:disabled)').first();
  await expect(btn).toBeVisible();
  const bg = () => btn.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await bg();
  await btn.hover();
  const sunk = await page.evaluate(() => {
    const t = document.createElement('i');
    t.style.background = 'var(--sunk)';
    document.body.append(t);
    const c = getComputedStyle(t).backgroundColor;
    t.remove();
    return c;
  });
  expect(await bg()).toBe(sunk);
  expect(await bg()).not.toBe(before);
  expect(await btn.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0(\.0+)?s(, 0(\.0+)?s)*$/);
});
