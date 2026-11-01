// 輸出器進階版面：多欄並排、頁面背景、頁框、頁首、Logo、區塊底色、進階區塊（PDF 以真實渲染的像素檢查，Word 檢查 XML）。
import { createCanvas } from '@napi-rs/canvas';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { loadFonts } from '../fonts/loader';
import { compareTable, columns, hero, hint, praise, stats } from './advanced';
import { renderDocx } from './docx';
import { A4_PORTRAIT, collectChars, parseDoc, serializeDoc, type Block, type DocModel } from './model';
import { renderPdf } from './pdf';
import { docToHtml } from './print';
import { nodeFontSource } from './test-support';


type PdfjsPage = {
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: unknown): { promise: Promise<void> };
  getTextContent(): Promise<{ items: { str?: string; transform?: number[] }[] }>;
};

async function openPdf(bytes: Uint8Array) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
}
/** 渲染成 1 px = 1 pt 的像素陣列。 */
async function pixels(bytes: Uint8Array, pageNo = 1) {
  const pdf = await openPdf(bytes);
  const page = (await pdf.getPage(pageNo)) as unknown as PdfjsPage;
  const vp = page.getViewport({ scale: 1 });
  const c = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  return (x: number, y: number): string => {
    const i = (Math.round(y) * c.width + Math.round(x)) * 4;
    return '#' + [d[i]!, d[i + 1]!, d[i + 2]!].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
}
async function textItems(bytes: Uint8Array, pageNo = 1) {
  const pdf = await openPdf(bytes);
  const tc = await ((await pdf.getPage(pageNo)) as unknown as PdfjsPage).getTextContent();
  return tc.items.filter((i) => i.str?.trim()).map((i) => ({ s: i.str!, x: i.transform![4]!, y: i.transform![5]! }));
}

const logoPng = (): Uint8Array => {
  const c = createCanvas(40, 20);
  const g = c.getContext('2d');
  g.fillStyle = '#ff0000';
  g.fillRect(0, 0, 40, 20);
  return new Uint8Array(c.toBuffer('image/png'));
};

const P = A4_PORTRAIT;
const base = (blocks: Block[], extra: Partial<DocModel> = {}): DocModel => ({ blocks, footerText: '示範', lineH: 18, page: P, ...extra });
const near = (a: string, b: string, tol = 12) => [1, 3, 5].every((i) => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= tol);

describe('PDF：多欄並排', () => {
  it('兩欄文字由同一個高度起畫，左欄在左、右欄在右', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const doc = base([columns([[{ type: 'text', text: '左欄內容', size: 12 }], [{ type: 'text', text: '右欄內容', size: 12 }]])]);
    const { bytes } = await renderPdf(doc, fonts);
    const items = await textItems(bytes);
    const l = items.find((i) => i.s.includes('左欄'))!;
    const r = items.find((i) => i.s.includes('右欄'))!;
    expect(l.y).toBeCloseTo(r.y, 0);
    expect(r.x).toBeGreaterThan(l.x + 200);
  }, 60_000);

  it('欄寬比例生效，欄內表格縮到欄寬內；下一個區塊接在最高那欄之後', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const table: Block = { type: 'table', widths: [300, 181.88], header: ['項目', '分數'], rows: [['甲', '9']], rowH: 24, size: 11 };
    const doc = base([columns([[table], [{ type: 'text', text: '右邊的窄欄', size: 12 }]], { widths: [2, 1] }), { type: 'text', text: '欄後面的文字', size: 12 }]);
    const { bytes } = await renderPdf(doc, fonts);
    const items = await textItems(bytes);
    const right = items.find((i) => i.s.includes('右邊'))!;
    const after = items.find((i) => i.s.includes('欄後面'))!;
    // 右欄從內容寬度的 2/3 附近起算（扣欄距）
    expect(right.x).toBeGreaterThan(P.mx + 300);
    // 表格高 48，之後才是下一段文字
    expect(P.h - after.y).toBeGreaterThan(P.mt + 48);
  }, 60_000);

  it('多欄比一頁還高就改成上下排列，不丟內容', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const long = (t: string): Block => ({ type: 'text', text: t.repeat(900), size: 12 });
    const { bytes, pageCount } = await renderPdf(base([columns([[long('甲')], [long('乙')]])]), fonts);
    expect(pageCount).toBeGreaterThan(1);
    const all = (await Promise.all(Array.from({ length: pageCount }, (_, i) => textItems(bytes, i + 1)))).flat().map((i) => i.s).join('');
    expect(all.split('甲').length - 1).toBe(900);
    expect(all.split('乙').length - 1).toBe(900);
  }, 90_000);
});

describe('PDF：頁面背景、頁框、頁首、Logo、區塊底色', () => {
  it('每頁都有背景色與頁框，頁首文字與 Logo 畫在邊界內', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const doc = base([{ type: 'text', text: '第一頁', size: 12 }, { type: 'pagebreak' }, { type: 'text', text: '第二頁', size: 12 }], {
      deco: { background: '#fffdf9', frame: { color: '#a84f00', width: 3, rounded: false }, headerText: '八年三班回饋單', logo: { png: logoPng(), w: 40, h: 20 } },
    });
    const { bytes, pageCount, missingChars } = await renderPdf(doc, fonts);
    expect(pageCount).toBe(2);
    expect(missingChars).toEqual([]);
    for (const pg of [1, 2]) {
      const px = await pixels(bytes, pg);
      expect(near(px(300, 400), '#fffdf9', 3)).toBe(true); // 背景
      expect(near(px(P.w / 2, 18), '#a84f00', 40)).toBe(true); // 頁框上緣（inset 18）
      expect(near(px(P.w - P.mx - 20, 14 + 10), '#ff0000', 40)).toBe(true); // Logo 在右上
      const items = await textItems(bytes, pg);
      expect(items.some((i) => i.s.includes('八年三班回饋單'))).toBe(true);
    }
  }, 60_000);

  it('圓角頁框的四個角是空的、邊的中點有線', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const doc = base([{ type: 'text', text: 'x', size: 12 }], { deco: { frame: { color: '#000000', width: 3, rounded: true } } });
    const px = await pixels((await renderPdf(doc, fonts)).bytes);
    expect(px(18, 18)).toBe('#ffffff'); // 圓角：角點不在線上
    expect(near(px(P.w / 2, 18), '#000000', 60)).toBe(true);
  }, 60_000);

  it('文字區塊底色畫成色塊', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const doc = base([{ type: 'text', text: '有底色的文字', size: 12, bg: '#ffe9a8' }]);
    const px = await pixels((await renderPdf(doc, fonts)).bytes);
    expect(near(px(P.mx + 300, P.mt + 9), '#ffe9a8', 3)).toBe(true);
    expect(px(P.mx + 300, P.mt + 40)).toBe('#ffffff');
  }, 60_000);
});

describe('PDF：進階區塊', () => {
  it('標題區、摘要數字列、稱讚與提示卡都畫出來且字都在字型內', async () => {
    const fonts = await loadFonts(nodeFontSource);
    const doc = base([
      hero('個人回饋單', '八年三班 王小明 同學', { fill: '#a84f00' }),
      stats([
        { label: '總分', value: '8.6' },
        { label: '全班平均', value: '7.9' },
        { label: '進步', value: '+0.4' },
      ]),
      praise('報告架構清楚，聽起來很舒服。'),
      hint('部分頁面文字稍多，可改成條列。'),
      compareTable([
        { item: '內容完整度', others: 8.2, self: 8.8 },
        { item: '時間掌控', others: 7.5, self: 7 },
      ]),
    ]);
    const { bytes, missingChars } = await renderPdf(doc, fonts);
    expect(missingChars).toEqual([]);
    const px = await pixels(bytes);
    expect(near(px(P.mx + 5, P.mt + 5), '#a84f00', 3)).toBe(true); // 標題區色塊
    const heroH = 16 * 2 + 33 + 4 + 18;
    const statsTop = P.mt + heroH + 10;
    expect(near(px(P.mx + 6, statsTop + 4), '#fff1de', 6)).toBe(true); // 數字卡底
    const calloutTop = statsTop + 64 + 10;
    expect(near(px(P.mx + 1, calloutTop + 10), '#2f8f4e', 3)).toBe(true); // 稱讚卡色條
    expect(near(px(P.mx + 30, calloutTop + 5), '#e3f3e6', 3)).toBe(true);
    const items = await textItems(bytes);
    for (const s of ['個人回饋單', '8.6', '全班平均', '你的強項', '下一步可以試試', '+0.6', '-0.5']) expect(items.some((i) => i.s.includes(s)), s).toBe(true);
  }, 60_000);

  it('collectChars 涵蓋進階區塊與頁首（欄內也算）', () => {
    const c = collectChars(base([columns([[hero('甲標題', '乙副標')], [stats([{ label: '丙標籤', value: '丁' }])]])], { deco: { headerText: '戊頁首' } }));
    expect(c.bold).toContain('甲');
    expect(c.bold).toContain('丁');
    expect(c.regular).toContain('乙');
    expect(c.regular).toContain('丙');
    expect(c.regular).toContain('戊');
  });

  it('序列化後還原一致（含 Logo 位元組與欄位）', () => {
    const doc = base([columns([[hero('t')], [hint('x')]], { widths: [1, 2] })], { deco: { logo: { png: new Uint8Array([137, 80, 78, 71]), w: 10, h: 5 }, background: '#ffffff' } });
    expect(parseDoc(serializeDoc(doc))).toEqual(doc);
  });

  it('自評對照表：落差是自評減他評', () => {
    const t = compareTable([{ item: 'a', others: 8, self: 9.5 }]);
    expect(t.rows[0]).toEqual(['a', '8.0', '9.5', '+1.5']);
    expect(t.widths.reduce((a, c) => a + c, 0)).toBeCloseTo(481.88, 3);
  });
});

describe('Word：版面效果', () => {
  const files = async (doc: DocModel) => {
    const z = unzipSync(await renderDocx(doc, { fontName: 'Microsoft JhengHei' }));
    return { z, xml: strFromU8(z['word/document.xml']!) };
  };
  it('背景色、頁框、頁首（文字與 Logo）都寫進檔案', async () => {
    const { z, xml } = await files(base([{ type: 'text', text: 'x', size: 12 }], { deco: { background: '#fffdf9', frame: { color: '#a84f00', width: 2, rounded: true }, headerText: '頁首字', logo: { png: logoPng(), w: 40, h: 20 } } }));
    expect(xml).toContain('<w:background w:color="FFFDF9"');
    expect(strFromU8(z['word/settings.xml']!)).toContain('displayBackgroundShape');
    expect(xml).toContain('<w:pgBorders');
    expect(xml).toContain('A84F00');
    const headerKey = Object.keys(z).find((k) => /word\/header\d*\.xml$/.test(k))!;
    expect(strFromU8(z[headerKey]!)).toContain('頁首字');
    expect(strFromU8(z[headerKey]!)).toContain('<w:drawing');
  }, 30_000);

  it('多欄是無框線表格，欄寬依比例；欄內表格縮到欄寬', async () => {
    const table: Block = { type: 'table', widths: [300, 181.88], header: ['項目', '分數'], rows: [['甲', '9']], rowH: 24, size: 11 };
    const { xml } = await files(base([columns([[table], [{ type: 'text', text: '右', size: 12 }]], { widths: [2, 1], gap: 14 })]));
    const grids = [...xml.matchAll(/<w:tblGrid>(.*?)<\/w:tblGrid>/g)].map((m) => [...m[1]!.matchAll(/w:w="(\d+)"/g)].map((x) => +x[1]!));
    expect(grids[0]).toEqual([Math.round(((481.88 - 14) * 2 / 3) * 20), 280, Math.round(((481.88 - 14) / 3) * 20)]);
    // 巢狀表格總寬 = 左欄寬
    expect(grids[1]!.reduce((a, c) => a + c, 0)).toBeLessThanOrEqual(grids[0]![0]! + 2);
  }, 30_000);

  it('標題區、摘要數字列、提示卡有底色；文字區塊底色變段落網底', async () => {
    const { xml } = await files(base([hero('標題'), stats([{ label: 'a', value: '1' }]), praise('好'), { type: 'text', text: '有底色', size: 12, bg: '#ffe9a8' }]));
    for (const fill of ['A84F00', 'FFF1DE', 'E3F3E6', 'FFE9A8']) expect(xml).toContain(`w:fill="${fill}"`);
    expect(xml).toContain('2F8F4E'); // 色條
  }, 30_000);
});

describe('桌機備用：瀏覽器列印', () => {
  it('列印用 HTML 帶頁面尺寸、背景、頁框與各種區塊', () => {
    const html = docToHtml(
      base([hero('標題', '副標'), columns([[{ type: 'text', text: '左<&>', size: 12 }], [praise('好')]]), stats([{ label: 'a', value: '1' }]), { type: 'pagebreak' }], {
        deco: { background: '#fffdf9', frame: { color: '#a84f00', width: 2, rounded: true }, headerText: '頁首', logo: { png: logoPng(), w: 40, h: 20 } },
      }),
    );
    expect(html).toContain('@page{size:595.28pt 841.89pt');
    expect(html).toContain('background:#fffdf9');
    expect(html).toContain('border-radius:14pt');
    expect(html).toContain('左&lt;&amp;&gt;');
    expect(html).toContain('data:image/png;base64,');
    expect(html).toContain('break-after:page');
    expect(html).toContain('display:flex');
  });
});
