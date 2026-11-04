import { strToU8, zipSync } from 'fflate';

// 測試用虛構資料（姓名、書名、分數皆為捏造，不含任何真實學生資料；硬規則 5）。
// xlsx 在測試時才產生，不把 xlsx／csv 放進 repo。

export const HEADERS = [
  '時間戳記',
  '我的名字',
  '我的座號',
  '被回饋者姓名',
  '她的座號',
  '她的書名',
  '簡報內容（充實度）：',
  '台風',
  '同學的具體回饋',
];

export const ROWS: (string | number)[][] = [
  ['2026-10-12 13:02:11', '王大明', 1, '林雅婷', 2, '被討厭的勇氣', 8, 9, '講得很清楚'],
  ['2026-10-12 13:03:20', '林雅婷', 2, '王大明', 1, '被討厭的勇氣（全新版）', 7, 8, ''],
  ['2026-10-12 13:04:05', '陳家豪', 3, '王大明', 1, '小王子', 9, 9, '很有自信'],
  ['2026-10-12 13:05:40', '陳家豪', 3, '王大明', 1, '小王子', 9, 10, '很有自信，聲音再大一點'],
  ['2026-10-12 13:06:10', '張小美', 4, '林雅婷', 2, '小王子', 6, 7, ''],
  ['2026-10-12 13:07:00', '王小明', 1, '林雅婷', 2, '被討厭的勇氣', 5, 6, '資料可以再多一點'],
];

/** 名單：三年二班 6 人（虛構）；李小龍、黃阿花沒填問卷，「王小明」是「王大明」的打字錯誤。 */
export const ROSTER_TEXT = ['1 王大明', '2 林雅婷', '3 陳家豪', '4 張小美', '5 李小龍', '6 黃阿花'].join('\n');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colName = (i: number) => String.fromCharCode(65 + i);

/** 產生最小可讀的 xlsx（inlineStr）。 */
export function makeXlsx(headers: string[], rows: (string | number)[][]): Buffer {
  const all = [headers, ...rows];
  const sheetRows = all
    .map((r, ri) => {
      const cells = r
        .map((v, ci) => {
          const ref = `${colName(ci)}${ri + 1}`;
          return typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
        })
        .join('');
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join('');
  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="表單回應 1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  };
  return Buffer.from(zipSync(files));
}

/** 多個工作表的最小 xlsx（inlineStr）；每張表第一列是欄名。 */
export function makeXlsxSheets(sheets: { name: string; headers: string[]; rows: (string | number)[][] }[]): Buffer {
  const sheetXml = (headers: string[], rows: (string | number)[][]) =>
    `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${[headers, ...rows]
      .map(
        (r, ri) =>
          `<row r="${ri + 1}">${r
            .map((v, ci) => {
              const ref = `${colName(ci)}${ri + 1}`;
              return typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
            })
            .join('')}</row>`,
      )
      .join('')}</sheetData></worksheet>`;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}</Types>`,
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}</Relationships>`,
    ),
  };
  sheets.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s.headers, s.rows));
  });
  return Buffer.from(zipSync(files));
}

export const surveyFile = (name ='讀書報告回饋  (回覆).xlsx') => ({
  name,
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: makeXlsx(HEADERS, ROWS),
});
