import { chromium } from '@playwright/test';
const file = process.argv[2];
const b = await chromium.launch();
const page = await (await b.newContext({ acceptDownloads: true, viewport: {width:1280,height:900} })).newPage();
await page.goto('https://derliang.github.io/survey-feedback-helper/');
await page.getByTestId('file-input').setInputFiles(file);
await page.getByRole('button', { name: '確認，下一步：欄位對應' }).click();
await page.getByRole('button', { name: '完成對應，下一步' }).click();
await page.locator('.stepper').getByRole('button', { name: /輸出/ }).click();
await page.waitForTimeout(1000);
const sel = page.locator('select').first();
for (const name of ['王佑歆','林茲霓']) {
  await sel.selectOption({ label: (await sel.locator('option').allTextContents()).find(t=>t.includes(name)) });
  const t0 = Date.now();
  const [d] = await Promise.all([page.waitForEvent('download',{timeout:600000}), page.getByRole('button', { name: /^PDF/ }).nth(1).click()]);
  await d.saveAs(process.argv[3] + '/pw-' + name + '.pdf');
  console.log(name, 'PDF', ((Date.now()-t0)/1000).toFixed(1)+'s');
}
await b.close();
