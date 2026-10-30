// 畫面片段產生器：共用小工具，輸出與設計系統一致的 HTML
import fs from 'node:fs';
export const sp = 'C:/Users/derli/AppData/Local/Temp/claude/C--Users-derli-Documents-claude-projects-survey-feedback-helper/7debb979-1afb-49a7-80fb-e06703a95e45/scratchpad';

export const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
export const tag = (t, c = '') => `<span class="tag${c ? ' tag-' + c : ''}">${t}</span>`;
export const icbtn = (n, label) => `<button class="icbtn" type="button" aria-label="${label}">${ic(n)}</button>`;
export const btn = (t, kind = 'primary', o = {}) => `<button class="btn btn-${kind}${o.sm ? ' btn-sm' : ''}${o.block ? ' btn-block' : ''}" type="button"${o.dis ? ' disabled' : ''}${o.style ? ` style="${o.style}"` : ''}>${o.icon ? ic(o.icon) : ''}${t}</button>`;
export const notice = (kind, icon, html, acts = '') => `<div class="notice${kind ? ' ' + kind : ''}">${ic(icon)}<div>${html}${acts ? `<div class="acts">${acts}</div>` : ''}</div></div>`;
export const tile = (l, n, c = '') => `<div class="tile${c ? ' ' + c : ''}"><div class="l">${l}</div><div class="n">${n}</div></div>`;
export const tiles = (arr) => `<div style="display:grid;grid-template-columns:repeat(${arr.length},1fr);gap:8px">${arr.map((a) => tile(...a)).join('')}</div>`;
export const seg = (items, on = 0, label = '檢視') => `<div class="seg" role="group" aria-label="${label}">${items.map((t, i) => `<button type="button" aria-pressed="${i === on}">${t}</button>`).join('')}</div>`;
export const chips = (items, on = 0) => `<div class="chips">${items.map((t, i) => `<button class="chip" type="button" aria-pressed="${i === on}">${t}</button>`).join('')}</div>`;
export const rcard = (b, small, on = false, style = '') => `<button class="rcard" role="radio" aria-checked="${on}" type="button"${style ? ` style="${style}"` : ''}><span class="dot"></span><span><b>${b}</b>${small ? `<small>${small}</small>` : ''}</span></button>`;
export const opt = (t, on = false, small = '') => `<button class="opt" role="radio" aria-checked="${on}" type="button"><span class="dot"></span>${t}${small ? `<small>${small}</small>` : ''}</button>`;
export const rowbtn = (nm, sm, rt = '', need = false, chev = true) => `<button class="rowbtn${need ? ' need' : ''}" type="button"><div><div class="nm">${nm}</div>${sm ? `<div class="sm">${sm}</div>` : ''}</div><span class="rt">${rt}${chev ? ic('next') : ''}</span></button>`;
export const brow = (name, v, pct, kind = '', tags = '') => `<div class="brow"><div class="h"><span class="nm">${name}${tags ? ' ' + tags : ''}</span><span class="v"><b>${v}</b>${pct != null ? ` · ${pct}%` : ''}</span></div><div class="track"><i${kind ? ` class="${kind}"` : ''} style="width:${pct}%"></i></div></div>`;
export const grp = (label, inner) => `<div class="grp"><span class="gl">${label}</span>${inner}</div>`;
export const field = (id, label, value, hint = '') => `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" value="${value}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

export const bar = (title, o = {}) => {
  const left = o.brand ? `<span class="brand">${ic('bars')}</span>` : o.noback ? '' : icbtn(o.close ? 'x' : 'back', o.close ? '關閉' : '返回');
  const right = o.right === null ? '' : icbtn(o.right || 'help', { help: '說明', sliders: '設定', more: '更多', users: '名單' }[o.right || 'help'] || '更多');
  return `<div class="appbar">${left}<span class="ttl">${title}</span>${right}</div>`;
};
const STEPS = ['開啟', '對應', '統計', '輸出'];
export const steps = (n) => `<div class="stepper"><div class="segs">${STEPS.map((t, i) => `<span class="st${i === n - 1 ? ' on cur' : i < n - 1 ? ' on' : ''}">${t}</span>`).join('')}</div></div>`;
export const act = (...b) => `<div class="actbar">${b.join('')}</div>`;
export const scr = (inner, gap = 14) => `<div class="scr" style="gap:${gap}px">${inner}</div>`;
export const sheet = (title, sub, inner, foot = '') => `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="${title}"><div class="grab"></div><h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}${inner}${foot}</div>`;
export const frame = (cap, head, ...rest) => {
  const t = cap.split('｜');
  return `<figure class="fig" style="margin:0"><div class="scale" data-w="390" data-h="844"><div class="dev">${head}${rest.join('')}</div></div><figcaption><b>${t[0]}</b>${t[1] || ''}</figcaption></figure>`;
};
export const write = (name, arr) => fs.writeFileSync(`${sp}/${name}`, arr.join('\n') + '\n');
