// 平板手工重排（第三輪）：審稿、輸出、範本庫三處需要「左邊操作、右邊並排預覽」，用橫向 1024×768 手工排版。
// 其餘平板畫面仍由 batch34.mjs 自動轉成分欄。審稿、輸出、範本庫的其他畫面（改寫、常用評語、進度、匯入等）仍是自動轉換。
import * as K from './m2kit.mjs';
import * as W from './wide.mjs';
const { ic, tag, btn, icbtn, seg, mframeWH, msteps } = K;
const { miniPaper } = W;
const T = (cap, H, inner) => mframeWH(cap, 1024, H, inner, 12);
const bar = (title) => `<div class="appbar" style="padding:0 16px;gap:12px"><span class="brand">${ic('bars')}</span><b style="font-size:17px;white-space:nowrap">${title}</b><div style="margin-left:auto;width:360px">${msteps(4)}</div>${icbtn('refresh', '重新開始')}${icbtn('gear', '設定')}</div>`;
const pane = (w, inner, o = '') => `<div class="pane" style="${w ? `width:${w}px;` : 'flex:1;min-width:0;'}padding:16px;gap:10px;${o}">${inner}</div>`;
const body = (...p) => `<div style="flex:1;min-height:0;display:flex">${p.join('')}</div>`;
const foot = (...b) => `<div class="actbar desk" style="justify-content:flex-end">${b.join('')}</div>`;
const side = '1px solid var(--line-soft)';

// ---- 審稿：左學生清單、中意見（文字鈕）、右老師評語與回饋單預覽
const stu = (n, nm, st, cur) => `<div class="qrow"${cur ? ' aria-current="true"' : ''}><span style="flex:1">${n} 號 ${nm}</span>${st === 2 ? tag('已完成', 'ok') : st === 1 ? tag('進行中', 'accent') : '<span class="small muted">未開始</span>'}</div>`;
const rv = (kind, text, flag, on) => `<div class="qcard" style="padding:10px 12px;gap:8px${flag ? ';border-color:var(--warn);border-width:1.5px' : ''}"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${tag(kind, kind === '建議' ? 'warn' : 'ok')}${flag ? tag(flag, 'bad') : ''}</div><span style="line-height:1.5">${text}</span><div style="display:flex;gap:8px">${btn('採用', on === 1 ? 'primary' : 'secondary', { sm: true })}${btn('隱藏', on === 2 ? 'primary' : 'secondary', { sm: true })}${btn('改寫', 'secondary', { sm: true })}</div></div>`;
export const review = T('6a 平板老師審稿（手工，橫向）｜1024×768。三欄並排：左邊學生清單（看得到誰做完）、中間意見（平板空間夠，「採用／隱藏／改寫」用文字鈕，不用手機的圖示鈕）、右邊老師評語與常用評語籌碼，下方是這位同學回饋單的即時縮圖，改完立刻看到結果。含「笨」的列加紅框與標籤，系統只提醒。其餘審稿畫面（改寫、存成常用評語、預設草稿）仍是自動轉換。', 768,
  `${bar('老師審稿')}${body(
    pane(250, `<div class="small muted" style="font-weight:700">已完成 18／44 人</div><div class="prog"><i style="width:41%"></i></div>${stu(4, '王○○', 2)}${stu(5, '李○○', 2)}${stu(6, '林小宇', 1, true)}${stu(7, '陳○○', 0)}${stu(8, '張○○', 0)}${stu(9, '黃○○', 0)}`, `border-right:${side};background:var(--card);padding:12px 8px`),
    pane(0, `<div style="display:flex;justify-content:space-between;align-items:center"><b>6 號 林小宇 · 36 則</b><span style="display:flex;gap:8px">${btn('全部採用', 'secondary', { sm: true })}${btn('跳過這位', 'ghost', { sm: true })}</span></div>${rv('優點', '報告條理清楚，圖表很好懂。', '', 1)}${rv('建議', '聲音可以再大一點，後排聽不太到。')}${rv('建議', '你講得很笨，要再練習。', '含「笨」')}`, 'overflow:hidden'),
    pane(300, `<b>老師評語</b><div class="input" style="min-height:88px;height:auto;padding:10px 12px;line-height:1.6">林小宇準備得很用心，看得出花了很多時間。</div><div class="chips" style="flex-wrap:wrap"><button class="chip" type="button" aria-pressed="true">稱讚努力與態度</button><button class="chip" type="button" aria-pressed="false">具體改進建議</button></div><span class="small muted">回饋單預覽</span><div style="align-self:center">${miniPaper(0.27)}</div>`, `border-left:${side};background:var(--card);overflow:hidden`),
  )}${foot(btn('上一位', 'secondary'), btn('下一位', 'primary'))}`);

// ---- 輸出設定：左邊設定（勾選清單），右邊即時預覽與摘要
const cb = (t, sm, on) => `<button class="opt" role="checkbox" aria-checked="${on}" type="button" style="min-height:52px"><span class="chk" data-on="${on}">${ic('check')}</span><span style="display:flex;flex-direction:column;line-height:1.3"><b>${t}</b>${sm ? `<span style="font-size:var(--fs-xs);color:var(--ink2);font-weight:400">${sm}</span>` : ''}</span></button>`;
export const output = T('4 平板輸出設定（手工，橫向）｜1024×768。左邊是設定（頁首「課程」「事項」兩欄、輸出內容與十一種圖表的勾選清單），右邊是回饋單即時預覽與摘要，勾選或改頁首時預覽同步變，不必按「預覽」再開新畫面。底部「產生並下載」。其餘輸出畫面（進度、完成、失敗）仍是自動轉換。', 768,
  `${bar('輸出設定')}${body(
    pane(0, `<span class="gl">回饋單頁首</span><div style="display:flex;gap:12px"><div style="flex:1;display:flex;flex-direction:column;gap:4px"><label class="small" for="o-c">課程</label><input class="input" id="o-c" value="三年二班 · 小組報告回饋"></div><div style="flex:1;display:flex;flex-direction:column;gap:4px"><label class="small" for="o-s">事項</label><input class="input" id="o-s" value="小組報告：水資源"></div></div><span class="gl">輸出內容</span><div style="display:flex;gap:8px">${cb('個人回饋單（學生版）', '每位同學一份', true)}${cb('班級總表', '', true)}${cb('同學回饋全文（給老師）', '', false)}</div><span class="gl">要放的圖表（11 種，勾選）</span><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${cb('對照條', '預設', true)}${cb('雷達圖', '', true)}${cb('堆疊橫條', '', false)}${cb('長條圖', '', false)}${cb('折線圖', '', false)}${cb('熱圖', '', false)}</div><p class="small muted" style="margin:0">…圓環／圓餅、直方圖、散布圖、盒鬚圖、圓點圖（捲動看到）</p>`, 'overflow:hidden'),
    pane(340, `<span class="small muted">預覽：6 號 林小宇</span><div style="align-self:center">${miniPaper(0.4)}</div><div class="sumline">${ic('info')}<span>將產生 41 個 PDF，打包成 1 個 zip，約 3.3 MB</span></div>`, `border-left:${side};background:var(--card);overflow:hidden`),
  )}${foot(btn('產生並下載', 'primary'))}`);

// ---- 範本庫：左邊縮圖網格，右邊選取範本的大預覽與操作
const tp = (nm, tg, cur) => `<div class="qcard" style="padding:10px;gap:6px${cur ? ';border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)' : ''}" ${cur ? 'aria-current="true"' : ''}><div aria-hidden="true" style="height:104px;border:1px solid var(--ctl);border-radius:4px;background:var(--card);padding:8px;display:flex;flex-direction:column;gap:5px"><i style="height:7px;background:var(--bar-muted);border-radius:2px"></i><i style="height:14px;background:var(--accent);border-radius:2px;width:70%"></i><i style="height:6px;background:var(--line);border-radius:2px"></i><i style="height:6px;background:var(--line);border-radius:2px;width:60%"></i></div><b style="font-size:var(--fs-sm)">${nm}</b>${tg}</div>`;
export const tpl = T('9a 平板範本庫（手工，橫向）｜1024×768。左邊是縮圖網格（每個範本的縮圖由實際版面產生，彼此看得出差別；篩選「全部／我的／內建」），右邊是選中範本的大預覽與操作：套用、編輯（內建的第一次改會複製成「我的範本」）、匯出分享、恢復預設（二次確認）。底部固定「匯入範本」。其餘範本畫面（第一次修改、匯入、匯出、設定檔）仍是自動轉換。', 768,
  `${bar('範本庫')}${body(
    pane(0, `${seg(['全部 7', '我的 1', '內建 6'], 0, '範本篩選')}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">${tp('票選結果公告', tag('我的', 'accent'))}${tp('個人回饋單 · 學生版', tag('內建'), true)}${tp('個人回饋單 · 含平均列', tag('內建'))}${tp('班級總表', tag('內建'))}${tp('同學回饋全文', tag('內建'))}${tp('統計方法說明', tag('內建'))}</div>`, 'overflow:hidden'),
    pane(340, `<b>個人回饋單 · 學生版</b>${tag('內建')}<span class="small muted">2 頁：分數、圖表、同學的具體回饋。</span><div style="align-self:center">${miniPaper(0.4)}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('套用', 'primary', { sm: true })}${btn('編輯', 'secondary', { sm: true })}${btn('匯出分享', 'secondary', { sm: true })}</div>`, `border-left:${side};background:var(--card);overflow:hidden`),
  )}${foot(btn('恢復預設', 'secondary'), btn('匯入範本', 'primary'))}`);
