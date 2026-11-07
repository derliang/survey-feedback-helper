// 問卷匯入→類型／欄位確認→資料檢查→統計→輸出 的端到端驗收（2026-11-07）。
// 全部虛構資料，測試時才產生 csv／tsv／xlsx，不放進 repo；桌機、平板、手機（觸控）三個專案都跑。
import { readFile } from 'node:fs/promises';
import { type Download, type Page, expect, test } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { makeXlsx, makeXlsxSheets } from './fixtures';

const noOverflow = async (page: Page) => {
  const width = page.viewportSize()!.width;
  const over = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, window.innerWidth) - w, width);
  expect(over).toBeLessThanOrEqual(0);
};

const csvFile = (name: string, text: string) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(text, 'utf8') });
const step = (page: Page, name: string) => page.locator('.stepper').getByRole('button', { name: new RegExp(name) });
/** 手機上完成對應後停在子頁，總覽（rail）要先回「準備資料」才看得到；桌機／平板按了也沒壞處。 */
const gotoPrep = (page: Page, item: string) => step(page, '準備資料').click().then(() => rail(page, item).click());
const rail = (page: Page, name: string) => page.locator('.rail').getByRole('button', { name: new RegExp(String.raw`^\d?\s*` + name) });

async function bytesOf(d: Download): Promise<Buffer> {
  return readFile(await d.path());
}
/** 讀 xlsx／docx 這類 zip 裡所有 xml 的文字（xlsx 的字串在 sharedStrings、docx 在 document.xml）。 */
function zipText(buf: Buffer): string {
  const files = unzipSync(new Uint8Array(buf));
  return Object.entries(files)
    .filter(([n]) => n.endsWith('.xml'))
    .map(([, v]) => strFromU8(v))
    .join('\n');
}

async function download(page: Page, click: () => Promise<void>, timeout = 60_000): Promise<Download> {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout }), click()]);
  return d;
}

/* ───────── 意見調查：匯入 CSV → 統計 → Excel／Word／PDF ───────── */

// 12 份回覆（虛構）。滿意度 1～5：總和 48、平均 4.0；學習方式單選；活動複選；建議開放題。
const OPINION_ROWS = [
  [5, '實作', '籃球, 閱讀', '希望多做實驗'],
  [4, '討論', '閱讀', ''],
  [4, '實作', '籃球', '作業可以少一點'],
  [3, '講述', '手作', ''],
  [5, '實作', '籃球, 手作', '老師講解很清楚'],
  [2, '講述', '閱讀', '進度太快'],
  [4, '討論', '籃球', ''],
  [5, '實作', '閱讀, 手作', '期待戶外教學'],
  [3, '討論', '籃球', ''],
  [4, '實作', '閱讀', '分組討論很有趣'],
  [4, '討論', '手作', ''],
  [5, '實作', '籃球', '謝謝老師'],
];
const OPINION_HEAD = ['時間戳記', '課程滿意度', '喜歡的學習方式', '想參加的活動', '其他建議'];
const opinionCsv = () =>
  [OPINION_HEAD.join(','), ...OPINION_ROWS.map((r, i) => [`2026-10-${String(10 + (i % 9)).padStart(2, '0')} 10:0${i % 10}:00`, ...r.map((c) => (typeof c === 'string' && c.includes(',') ? `"${c}"` : c))].join(','))].join('\n');

async function openAsOpinion(page: Page, name = '課程意見調查 (回覆).csv') {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(csvFile(name, opinionCsv()));
  await expect(page.getByRole('heading', { level: 1, name: /課程意見調查/ })).toBeVisible();
  await expect(page.getByText('CSV／TSV 檔 · 12 筆回覆 · 5 欄')).toBeVisible();
  await rail(page, '問卷類型').click();
  await page.getByRole('radio', { name: /意見調查/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await expect(page.getByRole('heading', { name: '欄位對應' })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

test('意見調查：匯入→欄位對應→資料檢查→統計（平均、人數、分布）', async ({ page }) => {
  await openAsOpinion(page);
  // 準備資料頁：意見調查不需要名單，資料檢查沒有重複，可直接看統計
  await step(page, '統計').click();
  await expect(page.getByRole('heading', { name: '統計', level: 1 })).toBeVisible();
  await noOverflow(page);
  // 評分題：平均 4.0、12 人作答（總和 48 ÷ 12）
  await page.locator('.wb-list').getByRole('button', { name: /課程滿意度/ }).click();
  const main = page.locator('main');
  await expect(main).toContainText('4.0');
  await expect(main).toContainText('12');
  await expect(page.locator('.chart svg').first()).toBeVisible();
  // 單選題：「實作」6 人
  await page.locator('.wb-list').getByRole('button', { name: /喜歡的學習方式/ }).click();
  await expect(main).toContainText('實作');
  await expect(main).toContainText('6');
  // 複選題：籃球 6 人
  await page.locator('.wb-list').getByRole('button', { name: /想參加的活動/ }).click();
  await expect(main).toContainText('籃球');
  await noOverflow(page);
});

test('意見調查：Excel、Word、PDF 輸出，內容含統計結果', async ({ page }) => {
  test.setTimeout(120_000);
  await openAsOpinion(page);
  await step(page, '輸出').click();
  await expect(page.getByRole('heading', { name: '輸出', level: 1 })).toBeVisible();
  await noOverflow(page);

  const xlsx = await download(page, () => page.getByRole('button', { name: /^Excel/ }).first().click());
  expect(xlsx.suggestedFilename()).toBe('課程意見調查 (回覆) 統計報告.xlsx');
  const xt = zipText(await bytesOf(xlsx));
  for (const must of ['課程滿意度', '喜歡的學習方式', '籃球', '作業可以少一點']) expect(xt, `xlsx 應含「${must}」`).toContain(must);

  const docx = await download(page, () => page.getByRole('button', { name: /^Word/ }).first().click());
  expect(docx.suggestedFilename()).toBe('課程意見調查 (回覆) 統計報告.docx');
  const dt = zipText(await bytesOf(docx));
  for (const must of ['課程滿意度', '喜歡的學習方式', '實作']) expect(dt, `docx 應含「${must}」`).toContain(must);
  expect(dt).toContain('4.0');

  const pdf = await download(page, () => page.getByRole('button', { name: /^PDF/ }).first().click());
  expect(pdf.suggestedFilename()).toBe('課程意見調查 (回覆) 統計報告.pdf');
  const pb = await bytesOf(pdf);
  expect(pb.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pb.length).toBeGreaterThan(5_000);
  await noOverflow(page);
});

/* ───────── 報告回饋：Word 輸出與老師評語 ───────── */

const FB_HEAD = ['時間戳記', '我的名字', '我的座號', '被回饋者姓名', '她的座號', '她的書名', '簡報內容（充實度）：', '台風', '同學的具體回饋'];
const FB_ROWS: (string | number)[][] = [
  ['2026-10-12 13:02:11', '王大明', 1, '林雅婷', 2, '被討厭的勇氣', 8, 9, '講得很清楚'],
  ['2026-10-12 13:03:20', '林雅婷', 2, '王大明', 1, '被討厭的勇氣', 7, 8, '舉例很有趣'],
  ['2026-10-12 13:04:05', '陳家豪', 3, '王大明', 1, '被討厭的勇氣', 9, 9, '很有自信'],
  ['2026-10-12 13:06:10', '張小美', 4, '林雅婷', 2, '被討厭的勇氣', 6, 7, '圖片再大一點'],
];

async function openFeedback(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(file);
  await rail(page, '問卷類型').click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  await page.getByRole('button', { name: /^台風：/ }).click();
  await page.getByRole('radio', { name: '評分' }).click();
  await page.getByRole('button', { name: '套用' }).click();
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
}

test('報告回饋：Word 班級總表與學生版個人回饋單（只含採用的留言，姓名匿名）', async ({ page }) => {
  test.setTimeout(120_000);
  await openFeedback(page, { name: '報告回饋 (回覆).xlsx', mimeType: 'application/octet-stream', buffer: makeXlsx(FB_HEAD, FB_ROWS) });
  await step(page, '統計').click();
  await page.locator('.wb-list').getByRole('button', { name: /林雅婷/ }).click();
  // 採用「講得很清楚」、隱藏「圖片再大一點」，並寫老師評語
  const comments = page.getByTestId('comment');
  await comments.filter({ hasText: '講得很清楚' }).getByRole('button', { name: '採用' }).click();
  await comments.filter({ hasText: '圖片再大一點' }).getByRole('button', { name: '隱藏' }).click();
  await page.getByRole('textbox', { name: '老師評語' }).fill('架構完整，繼續加油。');

  await step(page, '輸出').click();
  const cls = await download(page, () => page.getByRole('button', { name: /^Word/ }).first().click());
  expect(cls.suggestedFilename()).toBe('報告回饋 (回覆) 班級總表.docx');
  const ct = zipText(await bytesOf(cls));
  for (const must of ['王大明', '林雅婷']) expect(ct).toContain(must);

  // 學生版：先預覽、勾「我已逐則看過」，再選林雅婷下載 Word
  await page.getByRole('radio', { name: '學生版' }).click();
  await page.getByRole('button', { name: '先預覽學生版' }).click();
  await expect(page.getByTestId('preview')).toContainText('講得很清楚');
  await expect(page.getByTestId('preview')).not.toContainText('圖片再大一點');
  await page.getByRole('checkbox', { name: /我已逐則看過預覽/ }).check();
  await page.getByRole('button', { name: '預覽過了' }).click();
  const select = page.locator('select.input');
  await select.selectOption((await select.locator('option', { hasText: '林雅婷' }).first().getAttribute('value'))!);
  const one = await download(page, () => page.getByRole('button', { name: /^Word/ }).last().click());
  expect(one.suggestedFilename()).toMatch(/\.docx$/);
  const ot = zipText(await bytesOf(one));
  expect(ot).toContain('講得很清楚');
  expect(ot).not.toContain('圖片再大一點');
  expect(ot).not.toContain('陳家豪');
  expect(ot).toContain('架構完整，繼續加油。');
  await noOverflow(page);
});

/* ───────── 異常檔案 ───────── */

test('異常檔案：空檔、只有標題、不支援的格式，都有說明且可再選別的檔案', async ({ page }) => {
  await page.goto('./');
  const input = page.getByTestId('file-input');
  await input.setInputFiles(csvFile('空.csv', ''));
  await expect(page.getByTestId('error')).toBeVisible();
  await input.setInputFiles(csvFile('只有標題.csv', '標題\n'));
  await expect(page.getByTestId('error')).toContainText('沒有資料');
  await input.setInputFiles({ name: '成績.xls', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('x') });
  await expect(page.getByTestId('error')).toContainText('讀不了');
  // 錯誤之後再選正常檔案可以繼續
  await input.setInputFiles(csvFile('課程意見調查 (回覆).csv', opinionCsv()));
  await expect(page.getByRole('heading', { level: 1, name: /課程意見調查/ })).toBeVisible();
  await noOverflow(page);
});

test('異常檔案：多工作表 xlsx（第一張是說明）讀到有回覆的那張', async ({ page }) => {
  await page.goto('./');
  const buffer = makeXlsxSheets([
    { name: '使用說明', headers: ['請從「問卷回覆」工作表開始'], rows: [] },
    { name: '問卷回覆', headers: OPINION_HEAD, rows: OPINION_ROWS.map((r, i) => [`2026-10-1${i % 9} 10:00:00`, ...r]) },
  ]);
  await page.getByTestId('file-input').setInputFiles({ name: '多表.xlsx', mimeType: 'application/octet-stream', buffer });
  await expect(page.getByText('Excel 檔 · 12 筆回覆 · 5 欄')).toBeVisible();
  await noOverflow(page);
});

test('異常檔案：TSV 題目含逗號不會錯分欄', async ({ page }) => {
  await page.goto('./');
  const tsv = ['時間戳記\t你最喜歡的活動,原因,建議\t滿意度', ...OPINION_ROWS.slice(0, 6).map((r, i) => `2026-10-1${i} 10:00:00\t課程,時間安排好${i}\t${r[0]}`)].join('\n');
  await page.getByTestId('file-input').setInputFiles({ name: '活動.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from(tsv, 'utf8') });
  await expect(page.getByText('CSV／TSV 檔 · 6 筆回覆 · 3 欄')).toBeVisible();
  await rail(page, '問卷類型').click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  // 含逗號的題目完整保留成一欄，不被切開
  await expect(page.getByRole('button', { name: /^你最喜歡的活動,原因,建議：/ })).toBeVisible();
});

test('異常檔案：評分題混入一筆文字，資料檢查列出該列，不吞掉其他分數', async ({ page }) => {
  const rows = OPINION_ROWS.map((r, i) => [`2026-10-1${i % 9} 10:00:00`, ...(i === 3 ? ['五分', ...r.slice(1)] : r)]);
  const csv = [OPINION_HEAD.join(','), ...rows.map((r) => r.map((c) => (typeof c === 'string' && c.includes(',') ? `"${c}"` : c)).join(','))].join('\n');
  await page.goto('./');
  await page.getByTestId('file-input').setInputFiles(csvFile('課程意見調查 (回覆).csv', csv));
  await rail(page, '問卷類型').click();
  await page.getByRole('radio', { name: /意見調查/ }).click();
  await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
  // 「課程滿意度」仍被認成評分（待確認），不是選擇題
  await expect(page.getByRole('button', { name: /^課程滿意度：/ })).toContainText('評分');
  await page.getByRole('button', { name: '完成對應，下一步' }).click();
  await gotoPrep(page, '資料檢查');
  await page.getByRole('button', { name: /^格式異常/ }).click();
  await expect(page.getByText(/第 5 列：五分（不是數字）/)).toBeVisible();
  await noOverflow(page);
});

/* ───────── 同班同名不同座號、復原 ───────── */

test('重複回覆：同班同名但座號不同要提醒，不預設刪除；重新開始可回到起點', async ({ page }) => {
  const rows: (string | number)[][] = [
    ['2026-10-12 13:02:11', '王小明', 1, '林雅婷', 2, '被討厭的勇氣', 8, 9, '講得很清楚'],
    ['2026-10-12 13:03:20', '王小明', 16, '林雅婷', 2, '被討厭的勇氣', 7, 8, '舉例很有趣'],
    ['2026-10-12 13:04:05', '陳家豪', 3, '林雅婷', 2, '被討厭的勇氣', 9, 9, '很有自信'],
  ];
  await openFeedback(page, { name: '報告回饋 (回覆).xlsx', mimeType: 'application/octet-stream', buffer: makeXlsx(FB_HEAD, rows) });
  await gotoPrep(page, '資料檢查');
  await page.getByRole('button', { name: /^重複填答/ }).click();
  await expect(page.getByText(/座號不同，可能是同班同名的不同人/)).toBeVisible();
  // 保留最後一份降為次要按鈕，避免順手按下而刪掉另一個人
  await expect(page.getByRole('button', { name: '保留最後一份' })).toHaveClass(/secondary/);
  await noOverflow(page);

  // 排除一份後，重新開始要先確認（取消則留在原處）；確認後回首頁
  await page.getByRole('button', { name: '保留最後一份' }).click();
  await expect(page.getByText('已排除 1 筆回覆')).toBeVisible();
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByText('已排除 1 筆回覆')).toBeVisible();
  await page.getByRole('button', { name: '重新開始' }).click();
  await page.getByRole('button', { name: '確定重新開始' }).click();
  await expect(page.getByRole('heading', { name: '今天要處理哪一份問卷？' })).toBeVisible();
  // 再開同一份檔案：排除的紀錄不殘留，重複填答又回到待處理
  await openFeedback(page, { name: '報告回饋 (回覆).xlsx', mimeType: 'application/octet-stream', buffer: makeXlsx(FB_HEAD, rows) });
  await gotoPrep(page, '資料檢查');
  await expect(page.getByText(/已排除 \d+ 筆回覆/)).toBeHidden();
  await expect(page.getByRole('button', { name: /^重複填答/ })).toBeEnabled();
});
