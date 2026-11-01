// 桌機備用：瀏覽器列印。PDF 輸出失敗（字型下載不到、記憶體不足）時，把同一份 DocModel 轉成列印用 HTML，
// 交給瀏覽器的列印視窗（可另存 PDF）。字型用系統字型，換行會和 PDF 版略有差異。
// docToHtml 是純函式（可測）；printDoc 才碰 DOM。
import { contentWidth, GEO, HERO_FILL, pageOf, TONES, type Block, type DocModel } from './model';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl = (s: string): string => esc(s).replace(/\n/g, '<br>');
const pt = (n: number): string => `${+n.toFixed(2)}pt`;

function b64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
const png = (b: Uint8Array): string => `data:image/png;base64,${b64(b)}`;

function blockHtml(b: Block, doc: DocModel, w: number): string {
  const sp = `${b.before ? `margin-top:${pt(b.before)};` : ''}margin-bottom:${pt(b.after ?? 0)};`;
  switch (b.type) {
    case 'heading':
      return `<div style="${sp}font-size:${pt(b.size)};line-height:${pt(Math.round(b.size * 1.5))};font-weight:700;color:${b.color ?? '#222'};${b.bg ? `background:${b.bg};padding:0 ${pt(GEO.textPad)};` : ''}break-after:avoid">${nl(b.text)}</div>`;
    case 'text':
      return `<div style="${sp}font-size:${pt(b.size)};line-height:${pt(doc.lineH)};color:${b.color ?? '#222'};${b.bg ? `background:${b.bg};padding:0 ${pt(GEO.textPad)};` : ''}">${nl(b.text)}</div>`;
    case 'bullets':
      return `<ul style="${sp}margin-left:0;padding-left:14pt;font-size:${pt(b.size)};line-height:${pt(doc.lineH)}">${b.items.map((i) => `<li>${nl(i)}</li>`).join('')}</ul>`;
    case 'table': {
      const sum = b.widths.reduce((a, c) => a + c, 0) || 1;
      const al = (i: number) => b.align?.[i] ?? (i === 0 ? 'left' : 'center');
      const cell = (t: string, i: number, tag: 'th' | 'td', style: string) => `<${tag} style="width:${((b.widths[i] ?? 0) / sum) * 100}%;text-align:${al(i)};${style}">${esc(t)}</${tag}>`;
      const head = `<tr>${b.header.map((t, i) => cell(t, i, 'th', 'background:#1f4e79;color:#fff')).join('')}</tr>`;
      const rows = b.rows
        .map((r, ri) => {
          const emph = b.emphasisRows?.includes(ri);
          return `<tr>${r.map((t, i) => cell(t, i, 'td', `background:${emph ? '#dce8f4' : ri % 2 ? '#f2f6fa' : '#fff'};${emph ? 'font-weight:700' : ''}`)).join('')}</tr>`;
        })
        .join('');
      return `<table class="t" style="${sp}font-size:${pt(b.size)};height:auto"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
    }
    case 'image':
      return `<div style="${sp}"><img src="${png(b.png)}" style="width:${pt(b.w)};height:${pt(b.h)};max-width:100%"></div>`;
    case 'pagebreak':
      return '<div style="break-after:page"></div>';
    case 'rule':
      return `<hr style="${sp}border:0;border-top:0.75pt solid ${b.color ?? '#c9d6e3'}">`;
    case 'hero':
      return `<div style="${sp}background:${b.fill ?? HERO_FILL};color:${b.color ?? '#fff'};padding:${pt(GEO.heroPad)}"><div style="font-size:${pt(b.size ?? 22)};font-weight:700;line-height:1.5">${nl(b.title)}</div>${b.subtitle ? `<div style="margin-top:4pt;font-size:${pt(GEO.heroSubSize)};line-height:${pt(GEO.heroSubLh)}">${nl(b.subtitle)}</div>` : ''}</div>`;
    case 'stats':
      return `<div style="${sp}display:flex;gap:${pt(GEO.statsGap)}">${b.cards
        .map((it) => `<div style="flex:1;height:${pt(GEO.statsH)};background:${b.fill ?? '#fff1de'};border:0.5pt solid #ead9c3;text-align:center;display:flex;flex-direction:column;justify-content:center"><div style="font-size:${pt(GEO.statsValueSize)};font-weight:700;color:${b.color ?? HERO_FILL}">${esc(it.value)}</div><div style="font-size:${pt(GEO.statsLabelSize)};color:#66554a">${esc(it.label)}</div></div>`)
        .join('')}</div>`;
    case 'callout': {
      const t = TONES[b.tone];
      return `<div style="${sp}background:${t.fill};border-left:${pt(GEO.calloutBar)} solid ${t.bar};padding:${pt(GEO.calloutPad)};break-inside:avoid">${b.title ? `<div style="font-size:${pt(GEO.calloutSize)};font-weight:700;color:${t.ink};line-height:${pt(GEO.calloutTitleLh)}">${nl(b.title)}</div>` : ''}<div style="font-size:${pt(GEO.calloutSize)};line-height:${pt(doc.lineH)}">${nl(b.text)}</div></div>`;
    }
    case 'columns': {
      const n = b.cols.length;
      const gap = b.gap ?? GEO.colGap;
      const wt = b.widths && b.widths.length === n ? b.widths : b.cols.map(() => 1);
      return `<div style="${sp}display:flex;gap:${pt(gap)};align-items:flex-start">${b.cols
        .map((c, i) => `<div style="flex:${wt[i]} 1 0;min-width:0">${c.map((x) => blockHtml(x, doc, w)).join('')}</div>`)
        .join('')}</div>`;
    }
  }
}

/** DocModel → 完整的列印用 HTML（含 @page 尺寸與邊界、頁面背景、頁框、頁首文字、Logo、頁尾文字）。 */
export function docToHtml(doc: DocModel): string {
  const P = pageOf(doc);
  const d = doc.deco;
  const inner = doc.blocks.map((b) => blockHtml(b, doc, contentWidth(P))).join('\n');
  const logo = d?.logo ? `<img src="${png(d.logo.png)}" style="height:${pt(Math.min(d.logo.h, P.mt - 24))}">` : '';
  const head = d?.headerText || logo ? `<div class="hd"><span>${esc(d?.headerText ?? '')}</span>${logo}</div>` : '';
  const frame = d?.frame ? `<div class="fr" style="border:${pt(d.frame.width)} solid ${d.frame.color};border-radius:${d.frame.rounded ? '14pt' : '0'}"></div>` : '';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${esc(doc.title ?? '列印')}</title><style>
@page{size:${pt(P.w)} ${pt(P.h)};margin:${pt(P.mt)} ${pt(P.mx)} ${pt(P.mb)} ${pt(P.mx)}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;font-size:11pt;color:#222;${d?.background ? `background:${d.background};` : ''}}
table.t{border-collapse:collapse;width:100%;table-layout:fixed}
table.t th,table.t td{border:0.5pt solid #c9d6e3;height:24pt;padding:0 8pt;font-weight:inherit}
table.t th{font-weight:700}
thead{display:table-header-group}tr{break-inside:avoid}
ul{margin-top:0}
.fr{position:fixed;left:${pt(GEO.frameInset - P.mx)};right:${pt(GEO.frameInset - P.mx)};top:${pt(GEO.frameInset - P.mt)};bottom:${pt(GEO.frameInset - P.mb)};pointer-events:none}
.hd{position:fixed;top:${pt(-P.mt * 0.6)};left:0;right:0;display:flex;justify-content:space-between;align-items:center;font-size:9pt;color:#8a97a5}
</style></head><body>${frame}${head}${inner}</body></html>`;
}

/** 在隱藏的 iframe 裡載入列印版 HTML 並呼叫瀏覽器列印；列印視窗關掉後移除 iframe。 */
export function printDoc(doc: DocModel): Promise<void> {
  return new Promise((resolve, reject) => {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    const done = () => {
      f.remove();
      resolve();
    };
    f.onload = () => {
      const w = f.contentWindow;
      if (!w) return reject(new Error('無法開啟列印視窗'));
      w.onafterprint = done;
      w.focus();
      w.print();
      // 部分瀏覽器不觸發 afterprint；列印對話框關閉後的保險清理
      setTimeout(done, 60_000);
    };
    f.srcdoc = docToHtml(doc);
    document.body.appendChild(f);
  });
}
