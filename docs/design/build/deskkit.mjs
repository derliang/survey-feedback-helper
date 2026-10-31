// 桌機畫面共用外框與小工具（1280 寬）
import * as W from './wide.mjs';
export { W };
export const { L, miniPaper, frameWH, topbar, BAR_H, pane, flex1, body, foot, kbd, fchip, h, th, td, qrow, nvr, tgl, card, table, cmt, cmpbar, addPages, voteBars, vote } = W;
export const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, grp, brow, write, field, opt } = L;
export const D = (cap, step, inner, file, H = 800) => frameWH(cap, 1280, H + BAR_H, `${topbar(step, file)}${inner}`);
export const side = (w, inner) => pane(w, inner, 'padding:12px;border-right:1px solid var(--line-soft)');
export const main = (inner, o = '') => flex1(inner, `padding:20px;overflow:hidden;${o}`);
export const rside = (w, inner) => pane(w, inner, 'padding:20px;border-left:1px solid var(--line-soft);background:var(--card)');
export const nav = (a = '下一步', b = '上一步') => foot(btn(b, 'secondary'), btn(a, 'primary'));
export const modal = (w, inner, o = '') => `<div class="scrim"></div><div role="dialog" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${w}px;background:var(--card);border-radius:var(--r-lg);padding:28px;display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 40px var(--shadow-sm);${o}">${inner}</div>`;
export const mhead = (t, close = true) => `<div style="display:flex;align-items:center"><h2 style="margin:0;font-size:var(--fs-xl)">${t}</h2>${close ? `<span style="margin-left:auto">${icbtn('x', '關閉')}</span>` : ''}</div>`;
export const mfoot = (...b) => `<div style="display:flex;gap:8px;justify-content:flex-end">${b.join('')}</div>`;
export const prog = (p) => `<div class="prog"><i style="width:${p}%"></i></div>`;
export const dropzone = (inner) => `<div style="border:2px dashed var(--ink3);border-radius:var(--r-lg);padding:48px 24px;display:flex;flex-direction:column;align-items:center;gap:14px;background:var(--card)">${inner}</div>`;
export const round = (i, bg = 'var(--accent-soft)', fg = 'var(--accent-ink)') => `<span style="width:56px;height:56px;border-radius:50%;background:${bg};color:${fg};display:grid;place-items:center;flex:none">${ic(i)}</span>`;
export const centered = (w, inner) => `<div style="margin:auto;width:${w}px;display:flex;flex-direction:column;gap:16px">${inner}</div>`;
export const rail = (inner) => `<div class="small muted" style="font-weight:700">${inner}</div>`;
export const fbox = (inner) => `<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden;background:var(--card)">${inner}</div>`;
const KIND = { 票選: ['票選幹部', 'flag', 'd1'], 意見: ['意見調查', 'comment', 'd2'], 報告: ['報告回饋', 'users', 'd3'] };
const RECENT = [['三年二班 幹部票選', '三年二班_幹部票選.xlsx', '票選', '今天 09:12', ''], ['小組報告 第二次互評', '小組報告_互評2.xlsx', '報告', '10/28', ''], ['校慶活動 滿意度', '校慶滿意度_回覆.xlsx', '意見', '10/21', ''], ['小組報告 第一次互評', '小組報告_互評1.xlsx', '報告', '10/12', ''], ['親師座談 家長意見', '親師座談_回覆.xlsx', '意見', '09/30', ''], ['期初 班級幹部票選', '期初幹部.xlsx', '票選', '09/03', '找不到檔案']];
const rcCard = ([n, f, k, d, warn]) => { const [kn, g, c] = KIND[k]; return `<button class="rc" type="button"><span class="rk" style="--k:var(--${c})">${ic(g)}</span><span class="rb"><b>${n}</b><span class="fn">${f}</span><span class="rm">${tag(kn)}${warn ? tag(warn, 'warn') : ''}<span class="dt">${d}</span></span></span></button>`; };
export const lnk = (t, i) => `<button class="lnk" type="button">${i ? ic(i) : ''}${t}</button>`;
export const PRIV1 = '本程式沒有伺服器，資料只在這個瀏覽器處理，關閉頁面就清除。';
export const PRIV2 = '檔案若放在雲端硬碟或同步資料夾，由該雲端服務處理。';
export const privacy = () => `<p class="pv" style="margin:0">${ic('lock')}<span>${PRIV1}${PRIV2}</span></p>`;
const sheetArt = '<svg class="hart" viewBox="0 0 150 112" aria-hidden="true"><rect x="1" y="1" width="148" height="110" rx="10" class="a0"/><rect x="1" y="1" width="148" height="24" rx="10" class="a1"/><path class="a2" d="M50 1v110M100 1v110M1 25h148M1 54h148M1 83h148"/><rect x="60" y="33" width="30" height="13" rx="3" class="a1"/><rect x="110" y="62" width="30" height="13" rx="3" class="a1"/><rect x="10" y="62" width="30" height="13" rx="3" class="a3"/></svg>';
export const howtoLink = () => lnk('怎麼從 Google 表單匯出？', 'help');
export const homeDrop = () => `<div class="hdrop">${sheetArt}<h1>開啟試算表</h1><b>把 Excel 檔拖到這裡</b><span class="small muted">或</span>${btn('選擇檔案', 'primary')}${howtoLink()}</div>`;
export const homeRecent = () => `<div class="hright"><div class="shead"><h3>最近的專案</h3><div class="chips mini"><button class="chip" aria-pressed="true" type="button">全部</button><button class="chip" aria-pressed="false" type="button">票選</button><button class="chip" aria-pressed="false" type="button">意見</button><button class="chip" aria-pressed="false" type="button">報告</button></div><span class="end">${lnk('開啟專案檔', 'folder')}${lnk('全部 8 筆')}</span></div><div class="rgrid">${RECENT.map(rcCard).join('')}</div><p class="small muted" style="margin:0">點一下就重新讀取檔案並套用上次的設定。這裡只記檔案位置與設定，不存統計結果。</p>${privacy()}</div>`;
export const homeWrap = (left, right) => `<div class="home">${left}${right}</div>`;
export const home = () => homeWrap(homeDrop(), homeRecent());
export const bgOpen = home;
const gart = (inner) => `<svg class="gart" viewBox="0 0 200 120" aria-hidden="true">${inner}</svg>`;
const GUIDE = [
  ['開啟 Google 表單，點上方「回覆」。', gart('<rect class="f" x="0" y="0" width="200" height="30"/><rect class="m" x="72" y="7" width="56" height="20" rx="4"/><text class="on" x="100" y="21" text-anchor="middle">回覆</text><text x="36" y="21" text-anchor="middle">問題</text><text x="164" y="21" text-anchor="middle">設定</text><path class="l" d="M16 52h168M16 72h168M16 92h110"/><rect class="o" x="68" y="3" width="64" height="28" rx="6"/>')],
  ['點「在試算表中查看」，再選「檔案 → 下載 → Microsoft Excel」。', gart('<rect class="f" x="0" y="0" width="200" height="24"/><text x="24" y="17" text-anchor="middle">檔案</text><rect x="8" y="26" width="128" height="86" rx="6" fill="var(--card)" stroke="var(--ink3)"/><text x="20" y="46">下載</text><rect class="m" x="50" y="58" width="140" height="24" rx="4"/><text class="on" x="60" y="74">Microsoft Excel</text><rect class="o" x="46" y="54" width="148" height="32" rx="6"/>')],
  ['回到這裡，把下載的檔案拖進來。', gart('<rect x="14" y="26" width="172" height="80" rx="10" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 5"/><rect class="m" x="72" y="8" width="56" height="44" rx="5"/><text class="on" x="100" y="35" text-anchor="middle">xlsx</text><path class="l" d="M100 58v30M90 78l10 10 10-10"/>')],
];
export const guide = () => `<div class="guide">${GUIDE.map(([t, a], i) => `<div class="gstep">${a}<div class="gh"><span class="num cur">${i + 1}</span><span>${t}</span></div></div>`).join('')}</div>`;

export const colrow = (a, b, cur) => `<div class="colrow${cur ? ' cur' : ''}"><span class="mono">${a}</span><span style="color:var(--ink3)">${ic('next')}</span><div class="input">${b}</div>${btn('不使用', 'ghost', { sm: true })}</div>`;
export const offrow = (a, v) => `<div class="colrow off"><span class="mono">${a}</span><span></span><span class="small">${v}</span>${btn('加回', 'secondary', { sm: true })}</div>`;
export const offgroup = (rows) => `<div class="qcard" style="gap:4px;padding:10px 12px"><div style="display:flex;align-items:center;gap:8px"><b class="small">不使用的欄（${rows.length}）</b><span class="small muted">不納入統計，隨時可以加回</span></div>${rows.map(([a, v]) => offrow(a, v)).join('')}</div>`;

export const chartBtn = () => btn('圖表', 'secondary', { sm: true, icon: 'bars' });
export const chartHead = (t, p) => `<div style="display:flex;align-items:flex-start;gap:12px">${h(t, p)}<span style="margin-left:auto">${chartBtn()}</span></div>`;
export const progDone = (n, all) => `<div style="display:flex;flex-direction:column;gap:6px;padding:4px 4px 8px"><b class="small">已完成 ${n}／${all} 人</b>${prog(Math.round((n / all) * 100))}</div>`;
const CRIT = [['內容完整', '5、4、4、3…'], ['創意', '4、4、5、3…'], ['表達', '4、5、4、4…'], ['團隊合作', '5、5、4、4…']];
export const weightTable = (ws) => fbox(`<table style="border-collapse:collapse;width:100%;font-size:var(--fs-md)"><thead><tr><th style="${th}">欄位</th><th style="${th}">範例內容</th><th style="${th}">用途</th><th style="${th};text-align:right">權重（預設：每項等重）</th></tr></thead><tbody><tr><td style="${td}">姓名</td><td style="${td}" class="muted">陳家豪、林雅婷…</td><td style="${td}">${tag('評分者', 'accent')}</td><td style="${td}"></td></tr><tr><td style="${td}">被評組別</td><td style="${td}" class="muted">第 1 組、第 3 組…</td><td style="${td}">${tag('被評對象', 'accent')}</td><td style="${td}"></td></tr>${CRIT.map(([n, x], i) => `<tr><td style="${td}">${n}</td><td style="${td}" class="muted">${x}</td><td style="${td}">${tag('量表', '')}</td><td style="${td};text-align:right"><b>${ws[i]}%</b></td></tr>`).join('')}<tr><td style="${td}">優點與建議</td><td style="${td}" class="muted">報告條理清楚…</td><td style="${td}">${tag('開放題', '')}</td><td style="${td}" class="small muted">開放題不算</td></tr></tbody></table>`);
export const editorBar = () => `<div class="appbar" style="padding:0 16px;gap:8px">${icbtn('back', '返回')}<b style="font-size:17px">三年二班 學生版回饋單</b>${tag('我的範本', 'accent')}<button class="lnk" type="button" style="margin-right:auto">${ic('info')}已儲存在這個瀏覽器</button>${icbtn('undo', '復原')}${icbtn('redo', '重做')}<span style="width:1px;height:24px;background:var(--line);margin:0 8px"></span>${icbtn('minus', '縮小')}<span style="font-variant-numeric:tabular-nums;font-weight:600;min-width:48px;text-align:center">70%</span>${icbtn('plus', '放大')}${btn('恢復預設', 'secondary', { sm: true })}${btn('頁面設定', 'secondary', { sm: true })}${btn('預覽輸出', 'primary', { sm: true })}</div>`;
const pList = (rows) => `<div class="plist">${rows.join('')}</div>`;
export const prow = (on, cls, n, nm, vote, rt = '') => `<div class="prow"><span class="ck${on ? ' on' : ''}">${on ? ic('check') : ''}</span><span class="${cls === '三年二班' ? 'muted' : ''}">${cls}</span><span>${n}</span><b>${nm}</b><span class="muted">${vote}</span><span>${rt}</span></div>`;
export const psub = (on, t, v, rt = '') => `<div class="prow sub"><span class="ck${on ? ' on' : ''}">${on ? ic('check') : ''}</span><span>${t}　<span class="muted">${v}</span></span><span>${rt}</span></div>`;
export const guardList = (head, rows, manual) => `${head}<div style="display:flex;align-items:center;gap:8px"><span class="small muted">預設沿用整類決定</span>${manual ? tag(manual + ' 位為手動調整', 'accent') : ''}<span style="margin-left:auto;display:flex;gap:8px">${btn('全選', 'secondary', { sm: true })}${btn('全不選', 'secondary', { sm: true })}</span></div>${pList(rows)}`;
