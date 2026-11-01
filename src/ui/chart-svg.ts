// 自製 SVG 圖表（不用圖表套件）。回傳 SVG 字串：畫面直接嵌入，輸出時另轉 PNG。
// 畫面用設計 token（CSS 變數，跟著深色模式走）；輸出用固定色碼（紙本一律淺底）。
export interface Palette {
  ink: string;
  muted: string;
  grid: string;
  a: string;
  b: string;
  bg: string;
}

export const SCREEN: Palette = { ink: 'var(--ink)', muted: 'var(--ink3)', grid: 'var(--line-soft)', a: 'var(--d1)', b: 'var(--d2)', bg: 'transparent' };
export const PRINT: Palette = { ink: '#14171f', muted: '#5b6373', grid: '#e3e6ec', a: '#2554d8', b: '#cf5f12', bg: '#ffffff' };

const PRINT_VARS: Record<string, string> = {
  '--ink': PRINT.ink,
  '--ink3': PRINT.muted,
  '--line-soft': PRINT.grid,
  '--d1': PRINT.a,
  '--d2': PRINT.b,
  '--bar-muted': '#7f889b',
};

/** 把畫面用的圖表（CSS 變數、透明底）換成紙本淺色版：另存圖片時不隨深色模式變色（紙張永遠淺色）。 */
export function toPrintSvg(svg: string): string {
  const out = svg.replace(/var\((--[a-z0-9-]+)\)/g, (m, name: string) => PRINT_VARS[name] ?? m);
  const dim = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(out);
  if (!dim) return out;
  return out.replace(/(<svg[^>]*>)/, `$1<rect width="${dim[1]}" height="${dim[2]}" style="fill:${PRINT.bg}"/>`);
}

/** 圖表尺寸（取自 viewBox）。 */
export function svgSize(svg: string): { w: number; h: number } {
  const dim = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  return { w: dim ? Number(dim[1]) : 560, h: dim ? Number(dim[2]) : 300 };
}

/** 圖表標題（取自 aria-label），用來當另存圖片的檔名。 */
export function svgTitle(svg: string): string {
  const m = /aria-label="([^"]*)"/.exec(svg);
  return (m?.[1] ?? '圖表').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const FONT = `font-family="'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif"`;

function wrapSvg(w: number, h: number, title: string, p: Palette, body: string): string {
  const bg = p.bg === 'transparent' ? '' : `<rect width="${w}" height="${h}" style="fill:${p.bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}" ${FONT}>${bg}${body}</svg>`;
}

/** 文字太長時截短（SVG 不會自動換行）。 */
export function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

export interface BarRow {
  label: string;
  value: number;
  /** 數值旁的說明，例如「3 人（25%）」；沒給就顯示數值。 */
  note?: string;
  /** 突顯（例如當選者）；未突顯的用較淡的色。 */
  strong?: boolean;
}

/** 橫條圖：一列一個選項。 */
export function barsSvg(rows: readonly BarRow[], o: { title: string; max?: number; w?: number; palette?: Palette; emphasis?: boolean }): string {
  const p = o.palette ?? SCREEN;
  const w = o.w ?? 560;
  const rowH = 32;
  const narrow = w < 420;
  const labelW = narrow ? 104 : 150;
  const noteW = narrow ? 84 : 88;
  const h = Math.max(rows.length, 1) * rowH + 8;
  const max = o.max ?? Math.max(1, ...rows.map((r) => r.value));
  const barW = w - labelW - noteW - 8;
  const body = rows
    .map((r, i) => {
      const y = 4 + i * rowH;
      const len = Math.max(0, Math.min(1, r.value / max)) * barW;
      const color = o.emphasis && r.strong === false ? 'var(--bar-muted)' : p.a;
      const fill = p === PRINT && color.startsWith('var') ? '#7f889b' : color;
      return (
        `<text x="${labelW - 8}" y="${y + 20}" text-anchor="end" font-size="14" style="fill:${p.ink}">${esc(clip(r.label, narrow ? 6 : 9))}</text>` +
        `<rect x="${labelW}" y="${y + 6}" width="${f1(barW)}" height="18" rx="3" style="fill:${p.grid}"/>` +
        `<g class="bar" tabindex="0" role="img" aria-label="${esc(r.label)}\u3000${esc(r.note ?? f1(r.value))}"><title>${esc(r.label)}\u3000${esc(r.note ?? f1(r.value))}</title><rect x="${labelW}" y="${y + 6}" width="${f1(len)}" height="18" rx="3" style="fill:${fill}"/></g>` +
        `<text x="${labelW + barW + 8}" y="${y + 20}" font-size="14" style="fill:${p.ink}">${esc(r.note ?? f1(r.value))}</text>`
      );
    })
    .join('');
  return wrapSvg(w, h, o.title, p, body);
}

export interface PairRow {
  label: string;
  a: number | null;
  b: number | null;
}

/** 成對橫條：每列兩條（例如「你」和「班級平均」）。 */
export function pairedBarsSvg(
  rows: readonly PairRow[],
  o: { title: string; max: number; aName: string; bName: string; w?: number; h?: number; palette?: Palette },
): string {
  const p = o.palette ?? SCREEN;
  const w = o.w ?? 560;
  const legendH = 26;
  const rowH = 38;
  const h = o.h ?? legendH + Math.max(rows.length, 1) * rowH + 6;
  const narrow = w < 420;
  const labelW = narrow ? 96 : 130;
  const barW = w - labelW - 48;
  const bar = (v: number | null, y: number, color: string) =>
    v === null
      ? `<text x="${labelW}" y="${y + 11}" font-size="12" style="fill:${p.muted}">—</text>`
      : `<rect x="${labelW}" y="${y}" width="${f1(Math.max(0, Math.min(1, v / o.max)) * barW)}" height="12" rx="2" style="fill:${color}"/>` +
        `<text x="${labelW + Math.max(0, Math.min(1, v / o.max)) * barW + 6}" y="${y + 11}" font-size="12" style="fill:${p.ink}">${f1(Math.round(v * 10) / 10)}</text>`;
  const legend =
    `<rect x="${labelW}" y="6" width="12" height="12" rx="2" style="fill:${p.a}"/><text x="${labelW + 18}" y="17" font-size="13" style="fill:${p.ink}">${esc(o.aName)}</text>` +
    `<rect x="${labelW + (narrow ? 90 : 110)}" y="6" width="12" height="12" rx="2" style="fill:${p.b}"/><text x="${labelW + (narrow ? 108 : 128)}" y="17" font-size="13" style="fill:${p.ink}">${esc(o.bName)}</text>`;
  const body =
    legend +
    rows
      .map((r, i) => {
        const y = legendH + i * rowH;
        return `<text x="${labelW - 8}" y="${y + 20}" text-anchor="end" font-size="13" style="fill:${p.ink}">${esc(clip(r.label, narrow ? 6 : 8))}</text>${bar(r.a, y + 4, p.a)}${bar(r.b, y + 20, p.b)}`;
      })
      .join('');
  return wrapSvg(w, h, o.title, p, body);
}

/** 直條圖（分布）：每個分數一根。 */
export function columnsSvg(values: readonly number[], labels: readonly string[], o: { title: string; w?: number; h?: number; palette?: Palette }): string {
  const p = o.palette ?? SCREEN;
  const w = o.w ?? 560;
  const h = o.h ?? 220;
  const top = 22;
  const bottom = 28;
  const max = Math.max(1, ...values);
  const n = Math.max(values.length, 1);
  const slot = (w - 16) / n;
  const bw = Math.min(40, slot * 0.7);
  const body = values
    .map((v, i) => {
      const bh = (v / max) * (h - top - bottom);
      const x = 8 + i * slot + (slot - bw) / 2;
      return (
        `<g class="bar" tabindex="0" role="img" aria-label="${esc(labels[i] ?? '')}\u3000${v}"><title>${esc(labels[i] ?? '')}\u3000${v}</title><rect x="${f1(x)}" y="${f1(h - bottom - bh)}" width="${f1(bw)}" height="${f1(bh)}" rx="2" style="fill:${p.a}"/></g>` +
        `<text x="${f1(x + bw / 2)}" y="${f1(h - bottom - bh - 5)}" text-anchor="middle" font-size="12" style="fill:${p.ink}">${v}</text>` +
        `<text x="${f1(x + bw / 2)}" y="${h - 9}" text-anchor="middle" font-size="12" style="fill:${p.muted}">${esc(labels[i] ?? '')}</text>`
      );
    })
    .join('');
  return wrapSvg(w, h, o.title, p, `<line x1="8" y1="${h - bottom}" x2="${w - 8}" y2="${h - bottom}" style="stroke:${p.grid}" stroke-width="1"/>${body}`);
}
