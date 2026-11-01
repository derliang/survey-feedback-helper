// 手機與平板第二輪共用小工具（2026-11-01）
// 手機畫面：用 mframe 產生；平板畫面：用 tabletize 從「手機畫面」自動產生，保證一一對應。
import * as L from './lib.mjs';
export { L };
export const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, brow, grp, field, sheet, scr, act, write, sp } = L;

export const NAMES = ['開啟問卷', '準備資料', '統計', '輸出'];
// R-004、R-037：數字步驟列；n＝目前步驟，done＝已完成的步驟編號（預設為目前之前）
export const msteps = (n, done) => {
  const d = done || NAMES.map((_, i) => i + 1).filter((i) => i < n);
  return `<div class="stepper"><div class="segs">${NAMES.map((t, i) => {
    const k = i + 1;
    const cls = k === n ? ' on cur' : d.includes(k) ? ' on' : '';
    return `<span class="st${cls}"><span class="sl"><span class="sn">${d.includes(k) && k !== n ? ic('check') : k}</span>${t}</span></span>`;
  }).join('')}</div></div>`;
};
const resetBtn = icbtn('refresh', '重新開始');
const gearBtn = icbtn('gear', '設定');
// 頂端列：品牌＋標題＋重新開始＋設定（R-028、R-035）。子頁用返回
export const mbar = (title, o = {}) => {
  if (o.brand) return `<div class="appbar"><span class="brand" style="margin-left:8px">${ic('bars')}</span><span class="ttl">${title}</span>${resetBtn}${gearBtn}</div>`;
  const left = o.close ? icbtn('x', '關閉') : icbtn('back', '返回');
  const right = o.right === null ? '' : o.right === 'reset' ? resetBtn : icbtn(o.right || 'help', { help: '說明', gear: '設定', more: '更多', users: '名單', sliders: '設定' }[o.right || 'help'] || '更多');
  return `<div class="appbar">${left}<span class="ttl">${title}</span>${right}</div>`;
};
export const mframe = (cap, ...rest) => L.frame(cap, ...rest);
export const mframeWH = (cap, W, H, inner, rad) => {
  const t = cap.split('｜');
  return `<figure class="fig" style="margin:0"><div class="scale" data-w="${W}" data-h="${H}"><div class="dev" style="width:${W}px;height:${H}px;border-radius:${rad ?? 28}px">${inner}</div></div><figcaption style="max-width:${Math.min(W, 640)}px"><b>${t[0]}</b>${t[1] || ''}</figcaption></figure>`;
};
export const h = (t, p) => `<div class="grp"><h1 style="font-size:var(--fs-xl)">${t}</h1>${p ? `<p class="small muted">${p}</p>` : ''}</div>`;
export const PRIV = '本程式沒有伺服器，問卷結果只在這個瀏覽器處理。設定與名單存在你選的資料夾。';
export const file = (nm = '讀書報告回饋 (回覆)', sm = 'Google 試算表 · 56 筆回覆 · 12 欄') => `<div class="filechip">${ic('file')}<div><b>${nm}</b><span>${sm}</span></div></div>`;
export const kb = (t) => `<span class="mono" style="border:1px solid var(--line);border-radius:4px;padding:1px 6px;background:var(--card)">${t}</span>`;
// 外部服務代表色圖示（自畫 Excel「X」，不是 Microsoft 官方 Logo）
export const xl = '<svg class="xl" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect width="24" height="24" rx="4" style="fill:var(--ext-excel)"/><path d="M7 7l10 10M17 7L7 17" style="stroke:var(--on-accent);stroke-width:2.6;stroke-linecap:round;fill:none"/></svg>';

// ---------- 把舊畫面片段整理成新用語（手機與平板共用） ----------
const TERMS = [
  [/開啟專案檔/g, '開啟設定檔'], [/儲存專案檔/g, '儲存設定檔'], [/專案檔/g, '設定檔'], [/最近的專案/g, '最近的問卷'], [/專案/g, '問卷'],
  [/系統先猜，/g, '系統智慧判斷，'], [/系統猜最接近的人/g, '系統智慧判斷最接近的人'], [/由系統猜/g, '由系統智慧判斷'], [/猜/g, '智慧判斷'],
  [/（\.json）/g, '（.sfh）'],
];
const fixSteps = (h) => h.replace(/<div class="stepper"([^>]*)><div class="segs">([\s\S]*?)<\/div><\/div>/g, (m, a, inner) => {
  const spans = inner.match(/<span class="st[^"]*"[^>]*>[\s\S]*?<\/span>/g) || [];
  if (spans.length !== 4 || /class="sn"/.test(inner)) return m;
  const cur = spans.findIndex((s) => /class="st on cur"/.test(s)) + 1;
  const out = msteps(cur || 0, undefined);
  return a.includes('style=') ? out.replace('<div class="stepper">', `<div class="stepper"${a}>`) : out;
});
const fixBar = (h) => h.replace(/<button class="icbtn" type="button" aria-label="設定"><svg class="ic"><use href="#i-sliders"\/><\/svg><\/button>/g, resetBtn + gearBtn);
export const patchTerms = (h) => TERMS.reduce((s, [a, b]) => s.replace(a, b), h);
export const patchOld = (h) => fixBar(fixSteps(patchTerms(h)));

// ---------- 拆開畫面片段 ----------
const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'col']);
export function splitTop(html) {
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  const out = [];
  let depth = 0, start = -1, m;
  while ((m = re.exec(html))) {
    const [, close, tagName, self] = m;
    if (VOID.has(tagName.toLowerCase()) || self) { if (depth === 0) out.push(m[0]); continue; }
    if (!close) { if (depth === 0) start = m.index; depth++; }
    else { depth--; if (depth === 0) out.push(html.slice(start, re.lastIndex)); }
  }
  return out;
}
export const figsOf = (h) => h.match(/<figure class="fig"[\s\S]*?<\/figure>/g) || [];
export const capParts = (f) => {
  const m = f.match(/<figcaption[^>]*><b>([^<]*)<\/b>([\s\S]*?)<\/figcaption>/) || [];
  return { title: m[1] || '', note: m[2] || '' };
};
export const keyOf = (f) => capParts(f).title.split(' ')[0];
export function parseFig(f) {
  const m = f.match(/data-w="(\d+)" data-h="(\d+)"><div class="dev"[^>]*>/);
  if (!m) return null;
  const i0 = f.indexOf(m[0]) + m[0].length;
  const i1 = f.lastIndexOf('</div></div><figcaption');
  return { w: +m[1], h: +m[2], parts: splitTop(f.slice(i0, i1)), ...capParts(f) };
}

// ---------- 平板：左欄清單（依畫面類型） ----------
const RAILS = {
  home: ['最近的問卷', ['讀書報告回饋（三年二班）', '幹部票選（三年二班）', '活動滿意度調查']],
  prep: ['準備資料', ['問卷類型', '欄位對應', '學生名單（選用）', '資料檢查', '量表與權重']],
  vote: ['票選幹部', ['各職位結果', '防弊檢查', '票選名單', '計票規則', '唱票']],
  survey: ['題目', ['1 簡報內容（充實度）', '2 簡報設計', '3 講述的內容', '4 台風', '5 時間控制', '交叉分析', '開放題留言']],
  fb: ['被評對象（依平均）', ['1 林○○ 8.9', '2 張○○ 8.6', '3 陳○○ 8.4', '4 黃○○ 8.1', '5 王○○ 7.9']],
  trend: ['歷次問卷', ['期中報告回饋', '期末報告回饋', '學期總回饋']],
  review: ['老師審稿（18／44 人）', ['1 號 陳○○ · 完成', '2 號 林○○ · 完成', '3 號 王○○ · 跳過', '4 號 張○○ · 完成', '6 號 林小宇', '7 號 周○○']],
  out: ['輸出', ['輸出設定', '檔名與去識別化', '進度', '完成']],
  chart: ['圖表', ['圖表圖庫', '勾選與換圖', '另存圖片', '量表標籤', '反向計分']],
  set: ['設定', ['全域預設', '版面範本', '檔名規則', '關鍵字提醒', '資料夾', '備份與還原', '外觀', '關於與隱私']],
  edit: ['編輯器', ['區塊清單', '預覽', '文字區塊', '圖表區塊', '加入區塊', '頁面設定', '個別學生版本']],
  tpl: ['範本與設定檔', ['範本庫', '匯入範本', '匯出分享', '儲存設定檔', '開啟設定檔']],
  help: ['教學', ['怎麼匯出成 Excel 檔', '學校帳號的表單', 'Google 表單怎麼設計']],
  google: ['Google 試算表', ['選取試算表', '讀取中', '無法連線', '資料夾與 Google 連線']],
  sys: ['狀態與系統', ['安裝到主畫面', '離線', '新版本', '第一次載入', '離開與重新開始']],
};
export const railHtml = (type, cur) => {
  const [t, items] = RAILS[type] || RAILS.prep;
  return `<div class="small muted" style="font-weight:700;padding:4px 12px">${t}</div>${items.map((x, i) => `<div class="qrow"${i === cur ? ' aria-current="true"' : ''}><span style="flex:1">${x}</span></div>`).join('')}`;
};
const tabSteps = (n) => msteps(n || 0, n ? undefined : []);
const tabBar = (title, step) => `<div class="appbar" style="padding:0 12px;gap:10px"><span class="brand">${ic('bars')}</span><b style="font-size:17px;white-space:nowrap">${title}</b><div style="margin-left:auto;width:330px">${tabSteps(step)}</div>${resetBtn}${gearBtn}</div>`;

// 把一張手機畫面（HTML）換成平板版：頂端列＋左欄清單＋右側內容＋底部操作列；底部彈出面板改成靠右側彈出
export function tabletize(fig, rail, o = {}) {
  const p = parseFig(fig);
  if (!p) return fig;
  const kids = p.parts;
  const cls = (s) => (s.match(/^<div class="([\w-]+)/) || [])[1] || '';
  let bar = '', stepper = '', scrS = '', action = '', scrim = '', sh = '';
  const rest = [];
  for (const k of kids) {
    const c = cls(k);
    if (c === 'appbar') bar = k;
    else if (c === 'stepper') stepper = k;
    else if (c === 'scr') scrS = k;
    else if (c === 'actbar') action = k;
    else if (c === 'scrim') scrim = k;
    else if (c === 'sheet') sh = k;
    else rest.push(k);
  }
  const title = ((bar.match(/class="ttl">([\s\S]*?)<\/span>/) || [])[1] || '問卷回饋小幫手').replace(/<[^>]+>/g, '');
  const cur = stepper ? (splitTop(stepper)[0] || '').split('class="st ').findIndex((s) => s.startsWith('on cur')) : 0;
  const step = o.step ?? Math.max(cur, 0);
  const inner = scrS.replace(/^<div class="scr"/, '<div class="scr" data-t="1"');
  const sideSheet = sh
    ? sh.replace('<div class="grab"></div>', '').replace('<div class="sheet"', '<div class="sheet" style="left:auto;right:0;top:0;bottom:0;width:400px;border-radius:var(--r-lg) 0 0 var(--r-lg);padding:24px 20px;justify-content:flex-start;box-shadow:-8px 0 24px var(--shadow);overflow:hidden"')
    : '';
  const foot = action ? `<div class="actbar desk" style="justify-content:flex-end">${action.replace(/^<div class="actbar">/, '').replace(/<\/div>$/, '')}</div>` : '';
  const W = 820, H = o.h || 1000;
  const body = `<div style="flex:1;min-height:0;display:flex"><div class="pane" style="width:236px;padding:12px 8px;border-right:1px solid var(--line-soft);background:var(--card);gap:2px">${railHtml(rail[0], rail[1])}</div><div class="pane" style="flex:1;padding:8px 0;align-items:stretch"><div style="width:100%;max-width:560px;margin:0 auto;flex:1;min-height:0;display:flex;flex-direction:column">${rest.join('')}${inner}</div></div></div>`;
  const t = `<figure class="fig" style="margin:0"><div class="scale" data-w="${W}" data-h="${H}"><div class="dev" style="width:${W}px;height:${H}px;border-radius:28px">${tabBar(title, step)}${body}${foot}${scrim}${sideSheet}</div></div><figcaption style="max-width:640px"><b>${p.title}</b>${p.note}</figcaption></figure>`;
  return t;
}

// 長畫面：實機可捲動，模擬頁把畫面框加高、完整展開（標題後加註）
export const mlong = (H, cap, ...rest) => mframeWH(cap.replace('｜', '（長畫面，實機可捲動，這裡完整展開）｜'), 390, H, rest.join(''), 34);
