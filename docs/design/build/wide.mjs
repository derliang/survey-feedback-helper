// 平板與桌機畫面共用小工具
import fs from 'node:fs';
import * as L from './lib.mjs';
export { L };
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, grp, brow } = L;
export const page = fs.readFileSync(L.sp + '/paper-stu1.html', 'utf8');
export const miniPaper = (k) => `<div style="position:relative;width:${Math.round(794 * k)}px;height:${Math.round(1123 * k)}px;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff;box-shadow:0 4px 14px var(--shadow-sm);flex:none"><div style="width:794px;transform:scale(${k});transform-origin:0 0;pointer-events:none">${page}</div></div>`;
export const frameWH = (cap, W, H, inner, rad) => {
  const t = cap.split('｜');
  return `<figure class="fig" style="margin:0"><div class="scale" data-w="${W}" data-h="${H}"><div class="dev" style="width:${W}px;height:${H}px;border-radius:${rad ?? (W > 1000 ? 12 : 28)}px">${inner}</div></div><figcaption style="max-width:${Math.min(W, 640)}px"><b>${t[0]}</b>${t[1] || ''}</figcaption></figure>`;
};
const stp = (step) => `<div class="stepper" style="border:0;padding:0;background:transparent;margin-left:auto;width:${'%W%'}"><div class="segs">${['開啟', '對應', '統計', '輸出'].map((t, i) => `<span class="st${i === step - 1 ? ' on cur' : i < step - 1 ? ' on' : ''}">${t}</span>`).join('')}</div></div>`;
export const topbar = (step, file = '三年二班_幹部票選.xlsx') => `<div class="appbar" style="padding:0 16px;gap:20px"><span class="brand">${ic('bars')}</span><b style="font-size:17px">問卷回饋小幫手</b><span class="small muted">${file}</span>${stp(step).replace('%W%', '360px')}${icbtn('sliders', '設定')}</div>`;
export const tbar = (step, title) => `<div class="appbar" style="padding:0 16px;gap:12px"><span class="brand">${ic('bars')}</span><b style="font-size:var(--fs-lg)">${title}</b>${stp(step).replace('%W%', '300px')}${icbtn('sliders', '設定')}</div>`;
export const pane = (w, inner, o = '') => `<div class="pane" style="width:${w}px;${o}">${inner}</div>`;
export const flex1 = (inner, o = '') => `<div class="pane" style="flex:1;${o}">${inner}</div>`;
export const body = (...p) => `<div style="flex:1;min-height:0;display:flex">${p.join('')}</div>`;
export const foot = (...b) => `<div class="actbar desk" style="justify-content:flex-end">${b.join('')}</div>`;
export const kbd = (t) => `<span class="mono" style="border:1px solid var(--line);border-radius:4px;padding:1px 6px;background:var(--card)">${t}</span>`;
export const fchip = (icon, b, s) => `<div class="filechip">${ic(icon)}<div><b>${b}</b><span>${s}</span></div></div>`;
export const h = (t, p) => `<div style="display:flex;flex-direction:column;gap:4px"><h2 style="margin:0;font-size:var(--fs-xl)">${t}</h2>${p ? `<p class="small muted" style="margin:0">${p}</p>` : ''}</div>`;
export const th = 'text-align:left;padding:8px 10px;font-weight:700;border-bottom:1px solid var(--line);background:var(--sunk);white-space:nowrap';
export const td = 'padding:8px 10px;border-bottom:1px solid var(--line-soft);white-space:nowrap';
export const qrow = (inner, cur) => `<div class="qrow"${cur ? ' aria-current="true"' : ''}>${inner}</div>`;
export const nvr = (t, cur, rt = '') => qrow(`<span style="flex:1">${t}</span>${rt}`, cur);
export const tgl = (label, sub, on) => `<button class="tgl" role="switch" aria-checked="${on}" type="button"><span style="text-align:left"><b style="display:block">${label}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</span><span class="sw2"></span></button>`;
export const card = (...x) => `<div class="qcard" style="gap:10px">${x.join('')}</div>`;
export const table = (head, rows, hl = -1) => `<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden;background:var(--card)"><table style="border-collapse:collapse;width:100%;font-size:var(--fs-sm)"><thead><tr>${head.map((c, i) => `<th style="${th}${i === hl ? ';background:var(--accent-soft);color:var(--accent-ink)' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="${td}${i === hl ? ';background:var(--accent-soft)' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const cmt = (text, kind, state, warn) => `<div class="qcard" style="gap:8px;padding:12px 14px"><div style="display:flex;gap:6px;flex-wrap:wrap">${tag(kind, kind === '優點' ? 'ok' : 'accent')}${warn ? tag('提醒：含「笨」', 'bad') : ''}${state ? tag(state, 'ok') : ''}</div><div style="line-height:1.6">${text}</div><div style="display:flex;gap:6px">${['採用', '隱藏', '改寫'].map((a) => `<button class="btn btn-${a === state ? 'primary' : 'secondary'} btn-sm" type="button">${a}</button>`).join('')}</div></div>`;
export const cmpbar = (nm, p, a, sf) => `<div class="cmp"><div class="h"><span style="font-weight:600">${nm}</span><span class="v"><b>${p}</b> <span class="small muted">班均 ${a}</span></span></div><div class="tr"><i style="width:${(p / 5) * 100}%"></i><u style="left:${(a / 5) * 100}%"></u><em style="left:calc(${(sf / 5) * 100}% - 1px)"></em></div></div>`;
export const addPages = (...list) => {
  const pj = L.sp + '/pages.json';
  const pages = JSON.parse(fs.readFileSync(pj, 'utf8'));
  for (const o of list) { const i = pages.findIndex((p) => p.id === o.id); if (i >= 0) pages[i] = o; else pages.push(o); }
  fs.writeFileSync(pj, JSON.stringify(pages, null, 2));
};
export const vote = [['林小宇', 18, 45, '當選'], ['陳怡安', 12, 30, '候補'], ['張子豪', 6, 15, ''], ['黃思穎', 4, 10, '']];
export const voteBars = () => vote.map(([n, v, p, t]) => brow(n, v, p, t === '當選' ? 'lead' : '', t ? tag(t, t === '當選' ? 'ok' : 'accent') : '')).join('');
