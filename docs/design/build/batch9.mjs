import fs from 'node:fs';
import * as L from './lib.mjs';
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, grp, bar, steps, act, scr, sheet, frame, write, field } = L;

const nav = btn('上一步', 'secondary');
const tgl = (label, sub, on) => `<button class="tgl" role="switch" aria-checked="${on}" type="button"><span style="text-align:left"><b style="display:block">${label}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</span><span class="sw2"></span></button>`;
const fchip = (icon, b, s) => `<div class="filechip">${ic(icon)}<div><b>${b}</b><span>${s}</span></div></div>`;
const sbtns = (a, b) => `<div style="display:flex;gap:8px;margin-top:12px">${a}${b}</div>`;
const half = (t, kind = 'secondary') => btn(t, kind, { style: 'flex:1' });
const tpl = (nm, sm, t, tc) => rowbtn(nm, sm, tag(t, tc));

// ======== 範本與專案檔 ========
const A = [];

A.push(frame('9a 範本庫｜範本是「版面與文字」，不含學生資料。內建範本不可改，要改就先複製成「我的範本」。上方用分段控制篩選，最近用過的排在前面。',
  bar('版面範本'), 
  scr(seg(['全部', '內建', '我的'], 0, '範本來源') +
    grp('我的範本', tpl('三年二班 學生版回饋單', '改自「個人回饋單 學生版」· 10/28 用過', '我的', 'accent') + tpl('小組報告 評分表', '改自「班級總表」· 10/12 用過', '我的', 'accent')) +
    grp('內建', tpl('班級報告：意見調查', '3 頁 · 量化＋質化', '內建') + tpl('票選結果：公告＋明細', '2 頁', '內建') + tpl('報告回饋：班級總表', '1 頁', '內建') + tpl('個人回饋單：學生版', '2 頁 · 溫暖版', '內建') + tpl('個人回饋單：家長版', '1 頁', '內建')), 14),
  act(btn('匯入範本檔', 'secondary', { icon: 'down-arrow' }), btn('新增範本', 'primary', { icon: 'plus' }))));

A.push(frame('9b 範本選單｜點範本開底部面板：套用、編輯、複製、匯出分享、刪除。刪除是危險動作，排在最後並用警示色，且要再確認一次。',
  bar('版面範本'),
  scr(seg(['全部', '內建', '我的'], 0, '範本來源') + grp('我的範本', tpl('三年二班 學生版回饋單', '改自「個人回饋單 學生版」· 10/28 用過', '我的', 'accent') + tpl('小組報告 評分表', '改自「班級總表」· 10/12 用過', '我的', 'accent')), 14),
  act(btn('匯入範本檔', 'secondary', { icon: 'down-arrow' }), btn('新增範本', 'primary', { icon: 'plus' })),
  sheet('三年二班 學生版回饋單', '個人回饋單 · 2 頁 · 10/28 用過',
    `<div style="display:flex;flex-direction:column;gap:2px;margin-top:6px">${rowbtn('用這份範本輸出', '回到「輸出」步驟套用', '', false, true)}${rowbtn('編輯版面', '開啟區塊編輯器', '', false, true)}${rowbtn('複製', '做一份新的再改', '', false, true)}${rowbtn('匯出分享', '存成範本檔，給其他老師', '', false, true)}<button class="rowbtn" type="button" style="color:var(--bad)"><div><div class="nm">刪除範本</div><div class="sm">刪除後無法復原，建議先匯出備份</div></div></button></div>`)));

A.push(frame('9c 匯出分享範本｜說清楚檔案含什麼、不含什麼。校名與 Logo 會一併帶出，分享前提醒老師確認。分享用系統分享，可傳 LINE 或存到雲端硬碟。',
  bar('匯出範本', { close: true }),
  scr(fchip('file', '三年二班 學生版回饋單.sfhtpl', '約 48 KB · 2 頁版面') +
    `<div class="qcard" style="gap:10px"><b>檔案內含</b><div class="small">版面、文字、變數、顏色、校名與 Logo 圖片</div><b>檔案不含</b><div class="small">學生姓名、成績、問卷資料。這份範本只有版面。</div></div>` +
    notice('warn', 'info', '範本含校名與 Logo。若要分享給校外的人，請先確認可以公開。') +
    field('tn', '檔名', '三年二班 學生版回饋單') , 14),
  act(btn('存到這支手機', 'secondary'), btn('分享…', 'primary', { icon: 'up' }))));

A.push(frame('9d 匯入範本｜選檔後先預覽再匯入。同名時問「取代」或「兩份都留」，預設兩份都留，不會悄悄蓋掉老師自己的版本。',
  bar('匯入範本', { close: true }),
  scr(fchip('file', '科任老師分享_回饋單.sfhtpl', '來自檔案 · 51 KB · 範本格式 v1') +
    `<div class="qcard" style="gap:6px"><b>個人回饋單：學生版（科任版）</b><div class="small muted">2 頁 · 含 1 張圖片（Logo） · 7 個區塊</div></div>` +
    notice('warn', 'warn', '你已經有同名的範本「三年二班 學生版回饋單」。') +
    grp('同名時怎麼處理', rcard('兩份都留', '新的會加上「（2）」', true) + rcard('取代舊的', '舊版會先備份一份', false)) +
    notice('ok', 'check', '格式相容。這份檔案不含任何學生資料。'), 12),
  act(nav, btn('匯入範本', 'primary'))));

A.push(frame('9e 儲存專案檔｜專案檔記住「怎麼對應欄位、用什麼設定與範本」，下學期同一份問卷格式再開就不用重做。學生資料不會存進去。',
  bar('專案檔', { close: true }),
  scr(`<div class="qcard" style="gap:8px"><b>專案檔會記住</b><div class="small">問卷類型、欄位對應、評分權重、統計設定、選用的範本、檔名規則</div><b>不會記住</b><div class="small">問卷回覆、學生名單、輸出檔。資料檔每次都要重新選。</div></div>` +
    field('pn', '專案名稱', '三年二班 幹部票選', '建議包含班級與用途，下學期才找得到。') +
    grp('存到哪裡', rcard('這支手機', '下載成 .sfh 檔案', true) + rcard('Google 雲端硬碟', '用系統選檔視窗存到你的雲端硬碟', false)), 14),
  act(nav, btn('儲存專案檔', 'primary'))));

A.push(frame('9f 開啟專案檔後｜設定都還原了，但專案檔沒有資料，所以請老師選這學期的問卷檔。選完比對欄位，找不到的欄位標出來，一鍵重新對應。',
  bar('準備資料', { right: 'help' }), steps(2),
  scr(notice('ok', 'check', '已載入專案「三年二班 幹部票選」。欄位對應、設定與範本已還原。') +
    fchip('file', '114下_幹部票選.xlsx', '已讀取 41 列 · 欄位比對完成') +
    notice('warn', 'warn', '有 2 個欄位和專案檔的對不上：「班級」「座號」。', btn('重新對應這 2 個', 'secondary', { sm: true })) +
    rowbtn('問卷類型', '票選幹部', tag('已確認', 'ok')) + rowbtn('欄位對應', '9 個欄位，2 個需要確認', tag('請確認', 'warn'), true) + rowbtn('資料檢查', '尚未檢查', tag('等待')), 10),
  act(nav, btn('下一步：看統計', 'primary', { dis: true }))));

write('frag-b9.html', A);

// ======== Google 雲端硬碟 ========
const B = [];
const dr = (t, list) => `<div class="qcard" style="gap:6px"><b>${t}</b>${list.map((x) => `<div class="small" style="display:flex;gap:8px">${ic(x[0])}<span>${x[1]}</span></div>`).join('')}</div>`;

B.push(frame('10a 連線說明｜不做不透明的「一鍵授權」。登入前先用白話講清楚：只能存取你選的檔案與本網站建立的檔案，不能翻你的雲端硬碟。不想登入的人有另一條路。',
  bar('Google 雲端硬碟'),
  scr(`<div class="grp"><h1 style="font-size:var(--fs-xl)">連線後可以直接選檔、存檔</h1><p class="small muted">不連線也能用：用「這支手機的檔案」，系統選檔視窗本來就看得到雲端硬碟。</p></div>` +
    dr('這個網站可以', [['check', '開啟你在選檔視窗點選的檔案'], ['check', '把輸出檔存進你指定的位置']]) +
    dr('這個網站不能', [['x', '看到或改動你雲端硬碟裡其他檔案'], ['x', '看到你的信箱或聯絡人'], ['x', '在你不知道時存取任何檔案']]) +
    notice('', 'lock', '資料仍然只在你的瀏覽器處理，不經過任何伺服器。可以隨時在 Google 帳戶「第三方存取」撤銷。'), 12),
  act(btn('不連線，用手機檔案', 'secondary'), btn('連線 Google', 'primary'))));

B.push(frame('10b 選檔｜Google 試算表不能直接當 xlsx 讀，選到時說明「會先轉成 xlsx 再讀」，原檔不會被改動。轉換需要連線，離線時退回「請先下載 xlsx」。',
  bar('從雲端硬碟選擇', { close: true }),
  scr(`<div class="field"><label for="ds">搜尋</label><input class="input" id="ds" value="幹部票選"></div>` +
    fchip('file', '114下 幹部票選（回覆）', 'Google 試算表 · 今天 10:42') +
    fchip('file', '113下 幹部票選.xlsx', 'Excel 檔 · 去年') +
    notice('', 'info', '「Google 試算表」會先轉成 xlsx 再讀取，不會改到你的原檔。') +
    `<div class="qcard" style="gap:6px"><b>已選：114下 幹部票選（回覆）</b><div class="small muted">轉換中…約需幾秒鐘</div><div class="prog" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"><i style="width:60%"></i></div></div>`, 12),
  act(nav, btn('讀取這個檔案', 'primary'))));

B.push(frame('10c 配額用完或連線失敗｜Google 免費配額用完只會被拒絕、不會收費。說明原因，並提供不用登入的替代做法，讓老師不被卡住。',
  bar('Google 雲端硬碟'),
  scr(notice('warn', 'warn', '<b>今天的免費額度用完了</b><br>Google 對免費使用有每日上限。明天會恢復，這不會產生任何費用。') +
    `<div class="qcard" style="gap:8px"><b>現在可以這樣做</b><ol class="small" style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px"><li>回到「開啟」，選「這支手機的檔案」</li><li>在系統選檔視窗找到雲端硬碟裡的檔案</li><li>Google 試算表請先「下載為 Excel」</li></ol></div>` + notice('ok', 'check', '已讀取的資料與設定都還在，不用重做。'), 14),
  act(btn('稍後再試', 'secondary'), btn('改用手機檔案', 'primary'))));

B.push(frame('10d 已連線設定｜顯示連線的帳號與權限範圍，隨時可中斷。中斷只是這個網站忘記連線，不會刪任何檔案；也教老師怎麼到 Google 撤銷。',
  bar('Google 雲端硬碟'),
  scr(fchip('users', '已連線', 'wang.teacher@school.example.tw') +
    rowbtn('權限範圍', '僅限你選的檔案與本網站建立的檔案', '', false, true) +
    rowbtn('輸出預設位置', '雲端硬碟／回饋小幫手', '', false, true) +
    tgl('輸出完成後自動存一份', '輸出檔另存到上面的位置', false) +
    notice('', 'info', '中斷連線不會刪任何檔案。若要徹底撤銷，請到 Google 帳戶的「第三方存取」。') , 12),
  act(btn('中斷連線', 'secondary'), btn('完成', 'primary'))));

write('frag-b10.html', B);

// ---- 登記到 pages.json
const pj = L.sp + '/pages.json';
const pages = JSON.parse(fs.readFileSync(pj, 'utf8'));
const add = (o) => { const i = pages.findIndex((p) => p.id === o.id); if (i >= 0) pages[i] = o; else pages.push(o); };
add({ id: 'flow-tpl', short: '範本與專案檔', name: '手機-範本與專案檔', title: '範本庫與專案檔（手機）', intro: '範本庫、範本選單、匯出分享、匯入、專案檔儲存與開啟後的比對。', frag: 'frag-b9.html' });
add({ id: 'flow-drive', short: 'Google 雲端硬碟', name: '手機-Google雲端硬碟', title: 'Google 雲端硬碟連線（手機）', intro: '連線說明、選檔與轉換、配額用完、已連線設定。只申請 drive.file。', frag: 'frag-b10.html' });
fs.writeFileSync(pj, JSON.stringify(pages, null, 2));
console.log(A.length, B.length);
