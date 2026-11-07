import { type Page, expect, test } from '@playwright/test';
import { ROSTER_TEXT, surveyFile } from './fixtures';

const noOverflow = async (page: Page) => {
  // 以裝置寬度為準（手機會因內容太寬而縮小版面，innerWidth 會跟著變大而漏掉問題）
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

async function openSurvey(page: Page) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await expect(page.getByRole('heading', { level: 1, name: '讀書報告回饋 (回覆)' })).toBeVisible();
}

/** 從總覽（手機是獨立一頁、寬螢幕是左欄）進入某一項。 */
async function enter(page: Page, item: string) {
  const btn = page.locator('.rail').getByRole('button', { name: new RegExp(String.raw`^\d?\s*` + item) });
  await btn.click();
}

async function confirmType(page: Page) {
  await enter(page, '問卷類型');
  await expect(page.getByText('這是哪一種問卷？')).toBeVisible();
  await expect(page.getByRole('radio', { name: /報告回饋/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
}

async function confirmMapping(page: Page, label = '台風') {
  await expect(page.getByRole('heading', { name: '欄位對應' })).toBeVisible();
  await expect(page.getByText(/已智慧判斷，\d 欄請確認/)).toBeVisible();
  // 換一欄的類型（開底部／側邊面板）
  await page.getByRole('button', { name: new RegExp(`^${label}：`) }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

test('開檔到欄位對應：容忍全形冒號、檔名多餘空白，並可改欄位名稱', async ({ page }) => {
  await openSurvey(page);
  await noOverflow(page);
  await expect(page.getByText('Excel 檔 · 6 筆回覆 · 9 欄')).toBeVisible();
  await confirmType(page);
  // 改欄位顯示名稱
  await page.getByRole('button', { name: '改名稱：台風' }).click();
  await page.getByRole('textbox', { name: '改名稱' }).fill('台風表現');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^台風表現：/ })).toBeVisible();
  await noOverflow(page);
  await confirmMapping(page, '台風表現');
  await expect(page.getByRole('heading', { name: '學生名單' })).toBeVisible();
});

test('名單對照、資料檢查完整流程', async ({ page }) => {
  await openSurvey(page);
  await confirmType(page);
  await confirmMapping(page);

  // 名單：混班頁籤也可切換；這裡用同一班
  await page.getByRole('textbox', { name: '貼上名單' }).fill(ROSTER_TEXT);
  await page.getByRole('button', { name: '加入名單' }).click();
  await expect(page.getByText(/預覽（點格子可改）· 6 人/)).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: '下一步：名單對照' }).click();

  const tiles = page.getByTestId('compare-tiles');
  await expect(tiles).toContainText('沒填');
  await expect(tiles.getByRole('button', { name: /^沒填\s*2$/ })).toBeVisible();
  await expect(page.getByText('還沒填的 2 位')).toBeVisible();
  await expect(page.getByText('5 號 李小龍')).toBeVisible();

  await page.getByRole('tab', { name: /需要確認/ }).click();
  await expect(page.getByText('王小明')).toBeVisible();
  await expect(page.getByText(/名單中可能對應的學生：/)).toContainText('王大明');
  await page.getByRole('button', { name: '是同一人' }).click();
  await expect(page.getByText('已處理')).toBeVisible();
  await noOverflow(page);

  await page.getByRole('button', { name: '完成對照' }).click();
  await expect(page.getByRole('heading', { name: '資料檢查' })).toBeVisible();
  const pending = page.getByTestId('check-pending');
  await expect(pending).not.toHaveText('0');
  await page.getByRole('button', { name: /^重複填答/ }).click();
  await page.getByRole('button', { name: '保留最後一份' }).click();
  await expect(page.getByText('已排除 1 筆回覆')).toBeVisible();
  await page.getByRole('button', { name: /^書名多種寫法/ }).click();
  await page.getByRole('button', { name: /^合併成/ }).click();
  await noOverflow(page);
  // 欄位對應完成後可前往統計
  await page.getByRole('button', { name: '下一步：看統計' }).click();
  await expect(page.getByRole('heading', { name: '統計', level: 1 })).toBeVisible();
});

test('作答資料不寫入瀏覽器儲存（硬規則 6）', async ({ page }) => {
  await openSurvey(page);
  await confirmType(page);
  await confirmMapping(page);
  await page.getByRole('textbox', { name: '貼上名單' }).fill(ROSTER_TEXT);
  await page.getByRole('button', { name: '加入名單' }).click();
  const dump = await page.evaluate(async () => {
    const out: string[] = [JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage })];
    const dbs = (await indexedDB.databases?.()) ?? [];
    for (const d of dbs) {
      const req = indexedDB.open(d.name!);
      const db = await new Promise<IDBDatabase>((res) => (req.onsuccess = () => res(req.result)));
      for (const name of Array.from(db.objectStoreNames)) {
        const all = await new Promise<unknown[]>((res) => {
          const r = db.transaction(name).objectStore(name).getAll();
          r.onsuccess = () => res(r.result);
        });
        out.push(JSON.stringify(all));
      }
      db.close();
    }
    return out.join('\n');
  });
  for (const secret of ['陳家豪', '林雅婷', '很有自信', '李小龍']) expect(dump).not.toContain(secret);
});

test('錯誤：不支援的檔案與空檔案都有說明', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles({ name: '成績.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
  await expect(page.getByTestId('error')).toContainText('讀不了');
  await page.getByTestId('file-input').setInputFiles({ name: 'a.csv', mimeType: 'text/csv', buffer: Buffer.from('標題\n') });
  await expect(page.getByTestId('error')).toContainText('沒有資料');
});

test('重新開始會先確認，設定頁有隱私三句與忘記資料夾', async ({ page }) => {
  await openSurvey(page);
  await page.getByRole('button', { name: '重新開始' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await expect(page.getByText('本程式沒有伺服器，問卷結果只在這個瀏覽器處理。')).toBeVisible();
  await expect(page.getByText('設定與名單存在你選的資料夾。')).toBeVisible();
  await expect(page.getByText('放在雲端的檔案由該服務處理。')).toBeVisible();
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.getByRole('button', { name: '確定重新開始' }).click();
  await expect(page.getByRole('heading', { name: '今天要處理哪一份問卷？' })).toBeVisible();
});

test('不支援資料夾的瀏覽器：退回下載與上傳，認得讀過', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
    delete (navigator as unknown as { share?: unknown }).share; // 觸控裝置不支援分享時退回下載
  });
  await page.goto('./');
  await expect(page.getByTestId('unsupported-line')).toBeVisible();
  await expect(page.getByTestId('unsupported-line')).toContainText(/無法自動存到資料夾|儲存到檔案/);
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await confirmType(page);
  await confirmMapping(page);
  // 設定有更新但還沒保存 → 回首頁可下載設定檔
  await page.getByRole('button', { name: '問卷回饋小幫手', exact: true }).click();
  await expect(page.getByText('設定有更新，還沒保存')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^(下載設定檔|儲存到檔案)$/ }).click()]);
  expect(download.suggestedFilename()).toBe('問卷小幫手設定.sfh');
  const path = await download.path();
  const saved = await (await import('node:fs/promises')).readFile(path, 'utf8');
  expect(saved).not.toContain('陳家豪');
  expect(saved).toContain('targetName');

  // 重新載入（等於新的工作階段）→ 開啟設定檔 → 最近的問卷 → 選同一份檔案 → 認得讀過
  await page.reload();
  await page.getByTestId('config-input').setInputFiles({ name: '問卷小幫手設定.sfh', mimeType: 'application/json', buffer: Buffer.from(saved) });
  await expect(page.getByRole('button', { name: /讀書報告回饋 \(回覆\)/ })).toBeVisible();
  await page.getByTestId('file-input').setInputFiles(surveyFile('讀書報告回饋 (回覆).xlsx'));
  await expect(page.getByRole('dialog')).toContainText('這是不是之前的《讀書報告回饋 (回覆)》？');
  await page.getByRole('button', { name: '是，用之前的設定' }).click();
  await expect(page.getByTestId('done-count')).toHaveText('完成 2／4');
});

test('觸控裝置：保存設定送到分享選單，小提示只出現一次', async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, '分享選單只在觸控裝置優先');
  await page.addInitScript(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
    const w = window as unknown as { __shared: { name: string; text: Promise<string> }[] };
    w.__shared = [];
    Object.defineProperty(navigator, 'canShare', { value: (d: ShareData) => !!d.files?.length, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: async (d: ShareData) => {
        for (const f of d.files ?? []) w.__shared.push({ name: f.name, text: f.text() });
      },
      configurable: true,
    });
  });
  await page.goto('./');
  await expect(page.getByTestId('unsupported-line')).toContainText('儲存到檔案');
  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await confirmType(page);
  await confirmMapping(page);
  await expect(page.getByTestId('unsaved-dot')).toBeVisible();
  await page.getByRole('button', { name: '問卷回饋小幫手', exact: true }).click();
  await expect(page.getByText('設定有更新，還沒保存')).toBeVisible();
  await page.getByRole('button', { name: '儲存到檔案', exact: true }).click();
  await expect(page.getByText('設定有更新，還沒保存')).toBeHidden();
  const shared = await page.evaluate(async () => {
    const w = window as unknown as { __shared: { name: string; text: Promise<string> }[] };
    return Promise.all(w.__shared.map(async (f) => ({ name: f.name, text: await f.text })));
  });
  expect(shared).toHaveLength(1);
  expect(shared[0]!.name).toBe('問卷小幫手設定.sfh');
  expect(shared[0]!.text).not.toContain('陳家豪');
  await page.getByTestId('unsupported-line').getByRole('button').click();
  await page.reload();
  await expect(page.getByTestId('unsupported-line')).toBeHidden();
  await noOverflow(page);
});

test('資料夾：選擇、重開後仍記得（以瀏覽器內建資料夾模擬）', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium', 'File System Access 僅 Chromium');
  await page.addInitScript(() => {
    (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker = () => navigator.storage.getDirectory();
    // 讓寫入檔案變慢，等於模擬機器吃重：測試不能靠「剛好寫完」才過
    const close = FileSystemWritableFileStream.prototype.close;
    FileSystemWritableFileStream.prototype.close = async function (this: FileSystemWritableFileStream) {
      await new Promise((r) => setTimeout(r, 1500));
      return close.call(this);
    };
  });
  await page.goto('./');
  await page.getByRole('button', { name: '選擇資料夾' }).click();
  await expect(page.getByRole('dialog')).toContainText('選一個資料夾來存你的設定');
  await page.getByRole('dialog').getByRole('button', { name: '選擇資料夾' }).click();
  await expect(page.getByTestId('folder-name')).not.toHaveText('尚未選擇');
  await expect(page.getByText('已連線')).toBeVisible();

  await page.getByTestId('file-input').setInputFiles(surveyFile());
  await confirmType(page);
  await confirmMapping(page);
  // 設定是非同步寫進資料夾的；要等檔案真的寫好才重開，否則在吃重時會在寫入中途重載
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          try {
            const dir = await navigator.storage.getDirectory();
            return await (await (await dir.getFileHandle('問卷小幫手設定.sfh')).getFile()).text();
          } catch {
            return '';
          }
        }),
      { timeout: 15_000 },
    )
    .toContain('讀書報告回饋');
  await page.reload();
  await expect(page.getByText('已連線')).toBeVisible();
  await expect(page.getByRole('button', { name: /讀書報告回饋 \(回覆\)/ })).toBeVisible();
  await noOverflow(page);
  info.annotations.push({ type: 'note', description: '資料夾代號存在 IndexedDB，內容存在資料夾內的 .sfh' });
});

test('各畫面不橫向捲動、主要按鈕夠大', async ({ page }) => {
  await page.goto('./');
  await noOverflow(page);
  const small = await page.$$eval('button:not([hidden])', (els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .map((e) => ({ t: e.textContent?.trim() ?? e.getAttribute('aria-label'), h: e.getBoundingClientRect().height }))
      .filter((x) => x.h < 43),
  );
  expect(small).toEqual([]);
});
