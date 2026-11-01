// 雲端硬碟自動備份（2026-11-01 設計員出稿）：手機、平板、桌機各一個模擬頁。
// 背景：PR #52 讓登入 Google 後每次設定更新都自動把「問卷小幫手設定.sfh」（含學生名單）存到老師自己的雲端硬碟，
// 但只有 toast、沒有說明卡與開關。這份稿補：登入前說明卡、設定頁開關（預設關）、開關後行為、toast 文案、與資料夾存檔的先後。
// 規範見 DESIGN.md 5.28；決定見 docs/decisions/2026-11-01-雲端自動備份設計.md。
// 執行：node batch81.mjs   →  寫入 ../mockups/{手機,平板,桌機}-雲端自動備份.html
// 全部是虛構資料。Google 介面字樣一律標「待核對」。
import fs from 'node:fs';
import * as K from './m2kit.mjs';
import * as DK from './deskkit.mjs';
import { chooser } from './acctkit.mjs';

const { ic, tag, btn, notice, seg, rowbtn, scr, act, mbar, mframe, mframeWH, sheet, grp } = K;
const { D, side, main, modal, mhead, mfoot, body, frameWH } = DK;
const icbtn = K.L.icbtn;
const sp = K.sp;
const rd = (f) => fs.readFileSync(f, 'utf8');
const repo = sp + '/../../..';
const FNAME = '問卷小幫手設定.sfh';
const fg = (t) => `${t} ${tag('待核對')}`;

// ---------- 共用文案 ----------
// 說明卡四句（登入前卡、開啟確認卡共用，一字不差）
const DISCLOSE = [
  `存的是「${FNAME}」：裡面有你的設定、範本，以及<b>匯入的學生名單</b>。問卷作答結果不會上傳。`,
  '<b>只存這一個檔</b>，放在你自己的 Google 雲端硬碟。本程式只能看到自己存的這個檔，看不到你雲端硬碟裡的其他檔案。',
  '本程式沒有伺服器，<b>我們看不到這個檔</b>。',
  '如果登入的是學校帳號，學校管理員可能看得到這個檔；名單要保密時，請用個人帳號，或不要開啟。',
];
const disclose = (o = {}) => `<div class="qcard" style="padding:12px 14px;gap:8px"><b>${o.title || '會存什麼、存到哪裡'}</b><ul style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px;line-height:1.6">${DISCLOSE.map((x) => `<li class="small">${x}</li>`).join('')}</ul></div>`;
const swt = (label, sub, on, o = {}) => `<button class="tgl" role="switch" aria-checked="${on}" type="button"${o.dis ? ' disabled' : ''}><span style="text-align:left"><b style="display:block">${label}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</span><span class="sw2"></span></button>`;
const SW_LABEL = '自動存到雲端硬碟';
const SW_SUB_OFF = '預設關閉。打開前會先說明並請你確認。';
const lead = '個人帳號、學校帳號都能用，請選放著這份試算表、或有權限開它的那一個。';
const xlsxExit = '<b>不想登入？</b>在試算表選「檔案」→「下載」→「Microsoft Excel (.xlsx)」，回到本程式按「選擇 Excel 檔」。這樣完全不用登入，也不會備份到雲端。';
const chooserRow = rowbtn('選哪個帳號？', '看選帳號示意圖（自畫，不是 Google 截圖）', '', false);
const mh = (t, s) => `<h1 style="font-size:var(--fs-xl);margin:0">${t}</h1>${s ? `<p class="small muted" style="margin:0">${s}</p>` : ''}`;

// ---------- toast ----------
// 沿用 src/ui/app.css 的 .toast（深底淺字、圓角 --r-sm、手機貼底部操作列上方 96px、桌機離底 --sp-5）。
// 新增：成功類 5 秒自動消失（既有）；失敗類不自動消失，要按「關閉」；失敗類加警示圖示、role="alert"、可有 1 個動作鈕。
const toast = (msg, o = {}) => `<div class="toast2${o.fail ? ' fail' : ''}" role="${o.fail ? 'alert' : 'status'}">${o.fail ? `<span class="ti">${ic('warn')}</span>` : ''}<span class="tm">${msg}</span>${o.act ? `<button class="ta" type="button">${o.act}</button>` : ''}${o.fail ? `<button class="tx" type="button" aria-label="關閉">${ic('x')}</button>` : ''}</div>`;
const T_OK1 = `已把「${FNAME}」存到你的 Google 雲端硬碟。之後有更新會自動再存。`;
const T_NET = '沒能存到 Google 雲端硬碟：連不上 Google。設定檔仍在你的資料夾，下次有更新會再試一次。';
const T_AUTH = 'Google 登入過期了，雲端備份先暫停。';
const T_RATE = 'Google 暫時限制了存取次數，這次沒存到。過一兩分鐘，下次有更新會再試一次。';
const T_FULL = '你的 Google 雲端硬碟空間已滿，沒能備份。清出空間後會自動再試；資料夾裡的設定檔不受影響。';
const T_OTHER = `沒能存到 Google 雲端硬碟，原因不明。設定檔仍在你的資料夾；到「設定」按「立即存一次」可以再試。`;
const T_TAIL_NOFOLDER = '（沒選資料夾的裝置，句尾改為：這台裝置沒有資料夾，請先按「儲存到檔案」另存一份。）';

// ---------- 背景畫面 ----------
const phoneHome = () => `${mbar('問卷回饋小幫手', { brand: true })}${K.msteps(1, [])}${scr(`${K.h('今天要處理哪一份問卷？', '開啟 Google 試算表，或選一個 Excel 檔。')}<div class="grp">${btn('開啟試算表', 'primary', { block: true })}${btn('選擇 Excel 檔', 'secondary', { block: true })}</div>`, 12)}`;

// ---------- 設定頁內容（三個裝置共用） ----------
// state: off | on-ok | on-signedout | on-paused
const cloudCard = (state) => {
  const on = state !== 'off';
  const sw = swt(SW_LABEL, on ? '每次更新設定，都會多存一份到你的 Google 雲端硬碟。' : SW_SUB_OFF, on);
  let st = '';
  if (state === 'off') st = `<div class="small muted" style="line-height:1.6">目前沒有連接 Google，也沒有存任何東西到雲端。打開時會先登入並請你確認。</div>`;
  if (state === 'on-ok') st = `<div class="qcard" style="padding:12px 14px;gap:6px"><div class="qrow" style="padding:0">${ic('check')}<span style="flex:1"><b>已連接 Google</b><br><span class="small muted">這個分頁開著的期間有效</span></span>${tag('運作中', 'ok')}</div><div class="small muted">上次存到雲端：今天 14:20 · 檔名「${FNAME}」</div><div class="small muted">位置：你的雲端硬碟最上層（${fg('Google 雲端硬碟中的顯示名稱')}）</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">${btn('立即存一次', 'secondary', { sm: true })}${btn('中斷 Google 連線', 'ghost', { sm: true })}</div></div>`;
  if (state === 'on-signedout') st = notice('warn', 'warn', '<b>這次還沒登入 Google，所以沒有備份。</b><br>登入資訊只放在這個分頁的記憶體，重新整理或關掉網頁就沒了；要再登入一次，才會繼續備份。', btn('登入 Google', 'primary', { sm: true }));
  if (state === 'on-paused') st = notice('warn', 'warn', '<b>雲端備份暫停中：Google 雲端硬碟空間已滿</b><br>上次成功存到：今天 14:20。清出空間後，下次有更新會自動再試；也可以現在按「立即存一次」。資料夾裡的設定檔照常更新。', btn('立即存一次', 'secondary', { sm: true }) + btn('知道了', 'ghost', { sm: true }));
  return `${sw}${st}`;
};
const folderCard = `<div class="qcard" style="padding:12px 14px;gap:6px"><div class="qrow" style="padding:0">${ic('folder')}<span style="flex:1"><b>這台電腦的資料夾</b><br><span class="small muted">文件／問卷小幫手（設定與名單存在這裡）</span></span>${tag('主要', 'ok')}</div></div>`;
const orderLink = rowbtn('存到哪裡？先後順序', '資料夾、雲端、手動儲存怎麼搭配', '', false);

// ---------- 說明卡：先後順序（Y8） ----------
const prioBody = `<ol style="margin:0;padding-left:1.3em;display:flex;flex-direction:column;gap:8px;line-height:1.6"><li><b>資料夾（主要）</b>：桌機 Chrome／Edge 選的資料夾。每次更新都先寫這裡，它是你的「正本」。</li><li><b>Google 雲端硬碟（備份，選用）</b>：資料夾寫完後，再多存一份；同一個檔名，直接覆蓋上一次的。</li><li><b>儲存到檔案（手動）</b>：手機、平板、Safari 沒有資料夾時，隨時可以自己存。</li></ol>`;
const prioRows = [
  ['有資料夾，也開了雲端', '先存資料夾，再存雲端。雲端失敗不影響資料夾，只會提醒。'],
  ['沒有資料夾（手機、平板、Safari），開了雲端', '雲端是唯一的自動備份。建議偶爾再按「儲存到檔案」另存一份。'],
  ['有資料夾，沒開雲端', '跟以前一樣，只存資料夾。'],
  ['都沒有', '頂端「設定」鈕會有小點，提醒設定還沒保存。'],
];
const prioTable = `<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden;background:var(--card)">${prioRows.map(([a, b], i) => `<div style="padding:10px 14px;${i ? 'border-top:1px solid var(--line-soft);' : ''}display:flex;flex-direction:column;gap:2px"><b class="small">${a}</b><span class="small muted" style="line-height:1.6">${b}</span></div>`).join('')}</div>`;
const prioNotes = `${notice('', 'info', '<b>只往雲端寫，不會讀回來蓋掉本機。</b>要從雲端還原：首頁按「開啟設定檔」，在系統選檔視窗選雲端硬碟裡的那個檔（選檔視窗的名稱' + tag('待核對') + '）。')}${notice('warn', 'warn', '<b>兩台電腦用同一個 Google 帳號都開著備份時，後存的會蓋掉先存的</b>（同名覆蓋），不會自動合併。換電腦前，請先在舊電腦存好、再開新電腦。')}`;

// ====================================================================
// 手機
// ====================================================================
const P = [];
const pl = (H, cap, ...r) => P.push(K.mlong(H, cap, ...r));

// Y1 登入前先看一下（含雲端備份說明，開關預設關）
const loginSheet = (on, dis) => sheet('登入前先看一下', lead,
  `${chooserRow}${disclose({ title: '另外：要順便備份設定檔嗎？（選填）' })}${swt('登入後自動存到我的雲端硬碟', on ? '登入成功後會立刻存第一次。' : '預設關閉，不打開也能照常讀試算表。', on)}<p class="small muted" style="margin:0;line-height:1.6">${xlsxExit}</p>`,
  `<div style="display:flex;gap:8px">${btn('取消', 'secondary', { block: true })}${btn('前往 Google', 'primary', { block: true })}</div>`);
pl(1180, 'Y1 登入前先看一下（加上雲端備份說明，開關預設關）｜取代 S0 的內容：原有「選帳號」示意圖收成一列（點開才展開，內容不變，見 S0），騰出空間放雲端備份說明與開關。說明四句白話：存什麼（設定、範本、匯入的學生名單，不含作答結果）、只存這一個檔、我們看不到、學校帳號管理員可能看得到。<b>開關預設關</b>：不打開，登入後只讀試算表，不會寫任何東西到雲端硬碟。「不想登入？」出口保留，並補一句「也不會備份到雲端」。Google 視窗字樣沿用 S0，仍標待核對。', phoneHome(), act(btn('下一步：準備資料', 'primary', { dis: true })), loginSheet(false));
pl(1180, 'Y1b 同上，開關已打開｜老師主動打開開關後：副標改成「登入成功後會立刻存第一次」，按鈕仍是「前往 Google」。打開開關就是同意：同意只在這個畫面或 Y4（設定頁）做一次。這個偏好存在瀏覽器（介面偏好，硬規則 6 允許）；被清掉就回到預設關，是安全的方向。', phoneHome(), act(btn('下一步：準備資料', 'primary', { dis: true })), loginSheet(true));

// 設定頁
const setPage = (state, cap, H, over = '') => pl(H, cap, mbar('檔案與儲存', { right: null }), scr(`${folderCard}${grp('雲端備份（選用）', cloudCard(state) + orderLink)}`, 14), over);
setPage('off', 'Y2 設定 › 檔案與儲存（雲端備份關閉，預設）｜「檔案與儲存」是 8a 設定首頁既有的分組。資料夾列標「主要」；雲端備份是獨立一組，開關預設關，下面一行字明說「目前沒有連接 Google，也沒有存任何東西到雲端」。開關右側沿用 .tgl（56 高，52×32 開關）。「存到哪裡？先後順序」進 Y8。', 640);
setPage('on-ok', 'Y3 設定 › 檔案與儲存（已開啟、運作中）｜顯示：已連接 Google（<b>不顯示信箱</b>：本程式只用 drive.file 權限，拿不到也不去查信箱）、上次存到雲端的時間、檔名與位置（只在這個分頁開著期間有記憶）。按鈕：「立即存一次」「中斷 Google 連線」。第一次成功時，畫面下方出現 5 秒的成功 toast（之後每次靜默，只更新「上次存到」）。', 760, `<div style="position:absolute;left:16px;right:16px;bottom:24px">${toast(T_OK1)}</div>`);
setPage('on-signedout', 'Y3b 設定 › 檔案與儲存（開關開著，但這次還沒登入）｜重新整理或重開網頁後，登入資訊（只放在記憶體）會消失，但「開啟備份」的偏好還在，所以開關仍是開、卻沒有在備份。這時用警示提示明說「沒有備份」，並給「登入 Google」；不自動彈 Google 視窗（沒有使用者點擊，會被瀏覽器擋）。', 640);
setPage('on-paused', 'Y3c 設定 › 檔案與儲存（備份暫停：雲端硬碟空間已滿）｜失敗後的持續狀態：警示提示寫原因與「上次成功」時間，給「立即存一次」。資料夾照常更新。同一種失敗在同一次開啟期間只跳一次 toast，之後只更新這張提示（避免每次改設定都被打斷）；備份暫停期間，頂端「設定」鈕沿用既有的警示小點。', 680);

// Y4 設定頁打開開關時的確認（已登入）
pl(1100, 'Y4 在設定頁打開開關：確認卡（已登入 Google 的情況）｜開關在「已登入」時按下去，不會直接生效，先跳這張底部面板：同樣四句說明，主按鈕「開啟自動存檔」才算同意；「先不要」開關維持關。尚未登入時改走 Y1b（先登入再存）。按下後立刻存第一次，成功就出現第一次的成功 toast。', mbar('檔案與儲存', { right: null }), scr(`${folderCard}${grp('雲端備份（選用）', cloudCard('off') + orderLink)}`, 14),
  sheet('開啟自動存到雲端硬碟？', '每次更新設定，都會多存一份到你自己的 Google 雲端硬碟。', disclose(), `<div style="display:flex;gap:8px">${btn('先不要', 'secondary', { block: true })}${btn('開啟自動存檔', 'primary', { block: true })}</div>`));

// Y5 關閉確認
pl(1000, 'Y5 關閉開關：說明關閉後的行為｜關閉要先確認，因為老師最怕的是「關了以為資料被刪、或以為已經沒在存」。三句寫清楚：①不再存新的更新；②雲端硬碟裡已存的那份<b>會留著，程式不會刪</b>，要刪請自己到 Google 雲端硬碟刪；③資料夾裡的設定檔不受影響。選項「同時中斷 Google 連線」預設不勾（之後讀試算表要再登入）。', mbar('檔案與儲存', { right: null }), scr(`${folderCard}${grp('雲端備份（選用）', cloudCard('on-ok') + orderLink)}`, 14),
  sheet('關閉自動存到雲端硬碟？', '關閉後：', `<ul style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px;line-height:1.6"><li>不會再把新的更新存到雲端。</li><li>雲端硬碟裡<b>已經存的那份會留著</b>，本程式不會刪它。要刪，請到 Google 雲端硬碟自己刪（${fg('「移到垃圾桶」的實際字樣')}）。</li><li>你資料夾裡的設定檔照常更新，不受影響。</li></ul><label class="qcard" style="padding:12px 14px;gap:4px;flex-direction:row;align-items:flex-start;cursor:pointer"><input type="checkbox" aria-label="同時中斷 Google 連線" style="margin-top:4px;width:20px;height:20px;flex:none"><span style="flex:1"><b>同時中斷 Google 連線</b><br><span class="small muted">之後再讀 Google 試算表，需要重新登入。</span></span></label>`, `<div style="display:flex;gap:8px">${btn('保持開啟', 'secondary', { block: true })}${btn('關閉自動存檔', 'primary', { block: true })}</div>`));

// Y6 失敗 toast 文案一覽
const toastList = () => `<div style="display:flex;flex-direction:column;gap:14px">${[
  ['① 第一次成功（5 秒後自動消失）', toast(T_OK1)],
  ['② 網路不通', toast(T_NET, { fail: true, act: '重試' })],
  ['③ 登入過期（401）', toast(T_AUTH, { fail: true, act: '重新登入' })],
  ['④ 用量上限（Google 暫時限流，429）', toast(T_RATE, { fail: true })],
  ['⑤ 雲端硬碟空間用完', toast(T_FULL, { fail: true })],
  ['⑥ 其他／原因不明', toast(T_OTHER, { fail: true })],
].map(([l, t]) => `<div style="display:flex;flex-direction:column;gap:6px"><span class="small muted" style="font-weight:700">${l}</span>${t}</div>`).join('')}<p class="small muted" style="margin:0;line-height:1.6">${T_TAIL_NOFOLDER}</p></div>`;
pl(1180, 'Y6 toast 文案與樣式（同一時間只出現一則，這裡並排看）｜成功：沿用既有深底 toast，5 秒自動消失。失敗：同底色加警示圖示、role="alert"、<b>不自動消失</b>（要按 ✕），可有一個動作鈕（重試／重新登入）。動作鈕與 ✕ 都 ≥44 高。位置沿用既有：手機在底部操作列上方，桌機離底 24px。⑤ 與 ④ 要分開寫：空間滿要老師去清空間，限流只要等；現有 src/google/quota.ts 的 quota 一類兩者混用，且 failureMessage 的文字講的是「讀取」「改用 Excel 檔」，存檔時不適用，需另寫存檔版（見 DESIGN.md 5.28）。', mbar('toast 樣式與文案', { right: null }), scr(toastList(), 10));

// Y8 先後順序
pl(1180, 'Y8 存到哪裡？先後順序｜從設定頁「存到哪裡？先後順序」進入。三層：資料夾（主要）→ 雲端（選用備份）→ 手動儲存到檔案；下方四種情境各一句話；再提醒兩件事：只往雲端寫、不讀回來；兩台電腦同帳號會互相覆蓋。', mbar('存到哪裡？', { right: null }), scr(`${prioBody}${prioTable}${prioNotes}`, 14));

// ====================================================================
// 平板（820）
// ====================================================================
const TB = [];
const rail = (title, items, cur) => `<div class="small muted" style="font-weight:700;padding:4px 12px">${title}</div>${items.map((x, i) => `<div class="qrow"${i === cur ? ' aria-current="true"' : ''}><span style="flex:1">${x}</span></div>`).join('')}`;
const tbar = (title) => `<div class="appbar" style="padding:0 12px;gap:10px"><span class="brand">${ic('bars')}</span><b style="font-size:17px;white-space:nowrap">${title}</b><div style="margin-left:auto"></div>${icbtn('refresh', '重新開始')}${icbtn('gear', '設定')}</div>`;
const tfr = (cap, H, railHtml, right, over = '') => TB.push(mframeWH(cap + '（平板：左欄＋右側內容）', 820, H, `${tbar('問卷回饋小幫手')}<div style="flex:1;min-height:0;display:flex"><div class="pane" style="width:236px;padding:12px 8px;border-right:1px solid var(--line-soft);background:var(--card);gap:2px">${railHtml}</div><div class="pane" style="flex:1;padding:16px 20px;align-items:stretch;gap:12px;overflow:hidden">${right}</div></div>${over}`));
const setRail = rail('設定', ['外觀', '預設值', '關鍵字', '檔案與儲存', '備份與還原', '隱私'], 3);
const sideSheet = (title, sub, inner, foot) => `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="${title}" style="left:auto;right:0;top:0;bottom:0;width:420px;border-radius:var(--r-lg) 0 0 var(--r-lg);padding:24px 20px;justify-content:flex-start;box-shadow:-8px 0 24px var(--shadow);overflow:hidden"><h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}${inner}${foot || ''}</div>`;

const tHome = (cap, H, over) => TB.push(mframeWH(cap + '（平板）', 820, H, `${tbar('問卷回饋小幫手')}<div style="flex:1;min-height:0;display:flex"><div class="pane" style="width:236px;padding:12px 8px;border-right:1px solid var(--line-soft);background:var(--card);gap:2px">${rail('開啟問卷', ['開啟試算表', '選擇 Excel 檔', '開啟設定檔'], 0)}</div><div class="pane" style="flex:1;padding:16px 20px;align-items:stretch;gap:12px;overflow:hidden">${mh('今天要處理哪一份問卷？', '開啟 Google 試算表，或選一個 Excel 檔。')}<div style="display:flex;gap:8px;max-width:420px">${btn('開啟試算表', 'primary')}${btn('選擇 Excel 檔', 'secondary')}</div></div></div>${over}`));
const tLogin = (on) => sideSheet('登入前先看一下', lead, `${chooserRow}${disclose({ title: '另外：要順便備份設定檔嗎？（選填）' })}${swt('登入後自動存到我的雲端硬碟', on ? '登入成功後會立刻存第一次。' : '預設關閉，不打開也能照常讀試算表。', on)}<p class="small muted" style="margin:0;line-height:1.6">${xlsxExit}</p>`, `<div style="display:flex;gap:8px;margin-top:auto">${btn('取消', 'secondary', { block: true })}${btn('前往 Google', 'primary', { block: true })}</div>`);
tHome('Y1 登入前先看一下（加上雲端備份說明，開關預設關）｜平板：靠右側彈出（寬 420），內容與手機一致。', 1180, tLogin(false));
tHome('Y1b 同上，開關已打開｜同手機。', 1180, tLogin(true));
const tSet = (state, cap, H, over = '') => tfr(cap, H, setRail, `${mh('檔案與儲存')}<div style="display:flex;flex-direction:column;gap:12px;max-width:560px">${folderCard}${grp('雲端備份（選用）', cloudCard(state) + orderLink)}</div>${over}`);
tSet('off', 'Y2 設定 › 檔案與儲存（雲端備份關閉，預設）｜同手機；左欄是設定分組，右欄限寬 560。', 760);
tSet('on-ok', 'Y3 設定 › 檔案與儲存（已開啟、運作中）｜第一次成功 toast 置中偏下，離右側內容底部 24px。', 820, `<div style="position:absolute;left:50%;transform:translateX(-50%);bottom:28px;width:min(520px,calc(100% - 48px))">${toast(T_OK1)}</div>`);
tSet('on-signedout', 'Y3b 設定 › 檔案與儲存（開關開著，但這次還沒登入）｜同手機。', 760);
tSet('on-paused', 'Y3c 設定 › 檔案與儲存（備份暫停：雲端硬碟空間已滿）｜同手機。', 800);
tfr('Y4 在設定頁打開開關：確認卡（已登入）｜靠右側彈出。', 1100, setRail, `${mh('檔案與儲存')}<div style="display:flex;flex-direction:column;gap:12px;max-width:560px">${folderCard}${grp('雲端備份（選用）', cloudCard('off') + orderLink)}</div>`,
  sideSheet('開啟自動存到雲端硬碟？', '每次更新設定，都會多存一份到你自己的 Google 雲端硬碟。', disclose(), `<div style="display:flex;gap:8px;margin-top:auto">${btn('先不要', 'secondary', { block: true })}${btn('開啟自動存檔', 'primary', { block: true })}</div>`));
tfr('Y5 關閉開關：說明關閉後的行為｜靠右側彈出。', 1000, setRail, `${mh('檔案與儲存')}<div style="display:flex;flex-direction:column;gap:12px;max-width:560px">${folderCard}${grp('雲端備份（選用）', cloudCard('on-ok') + orderLink)}</div>`,
  sideSheet('關閉自動存到雲端硬碟？', '關閉後：', `<ul style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px;line-height:1.6"><li>不會再把新的更新存到雲端。</li><li>雲端硬碟裡<b>已經存的那份會留著</b>，本程式不會刪它。要刪，請到 Google 雲端硬碟自己刪（${fg('「移到垃圾桶」的實際字樣')}）。</li><li>你資料夾裡的設定檔照常更新，不受影響。</li></ul><label class="qcard" style="padding:12px 14px;gap:4px;flex-direction:row;align-items:flex-start;cursor:pointer"><input type="checkbox" aria-label="同時中斷 Google 連線" style="margin-top:4px;width:20px;height:20px;flex:none"><span style="flex:1"><b>同時中斷 Google 連線</b><br><span class="small muted">之後再讀 Google 試算表，需要重新登入。</span></span></label>`, `<div style="display:flex;gap:8px;margin-top:auto">${btn('保持開啟', 'secondary', { block: true })}${btn('關閉自動存檔', 'primary', { block: true })}</div>`));
tfr('Y6 toast 文案與樣式', 1080, setRail, `${mh('toast 樣式與文案')}<div style="max-width:560px">${toastList()}</div>`);
tfr('Y8 存到哪裡？先後順序', 1180, setRail, `${mh('存到哪裡？')}<div style="display:flex;flex-direction:column;gap:14px;max-width:600px">${prioBody}${prioTable}${prioNotes}</div>`);

// ====================================================================
// 桌機（1280）
// ====================================================================
const DKS = [];
const df = (cap, inner, H, o = {}) => DKS.push(D(cap, 1, inner, '', H, { lock: [2, 3, 4], ...o }));
const dset = (state, over = '') => body(side(240, `<div class="small muted" style="font-weight:700;padding:4px 12px">設定</div>${['外觀', '預設值', '關鍵字', '檔案與儲存', '備份與還原', '隱私'].map((x, i) => DK.nvr(x, i === 3)).join('')}`), main(`${mh('檔案與儲存')}<div style="display:flex;flex-direction:column;gap:12px;max-width:600px">${folderCard}${grp('雲端備份（選用）', cloudCard(state) + orderLink)}</div>${over}`, 'gap:14px'));
const dsetOnly = (state, cap, H, over = '') => df(cap, dset(state, over), H);
const dLogin = (on) => `${DK.bgOpen()}${modal(680, `${mhead('登入前先看一下')}<span class="muted">${lead}</span>${chooser()}${disclose({ title: '另外：要順便備份設定檔嗎？（選填）' })}${swt('登入後自動存到我的雲端硬碟', on ? '登入成功後會立刻存第一次。' : '預設關閉，不打開也能照常讀試算表。', on)}${notice('', 'info', xlsxExit)}${mfoot(btn('取消', 'secondary'), btn('前往 Google', 'primary'))}`)}`;
df('Y1 登入前先看一下（加上雲端備份說明，開關預設關）｜桌機：置中對話框（寬 680），沿用 D58 並把選帳號示意圖保留在上方；說明卡與開關在示意圖下方。', dLogin(false), 1180);
df('Y1b 同上，開關已打開｜同手機。', dLogin(true), 1180);
dsetOnly('off', 'Y2 設定 › 檔案與儲存（雲端備份關閉，預設）｜桌機：左欄設定分組，右欄限寬 600。', 760);
dsetOnly('on-ok', 'Y3 設定 › 檔案與儲存（已開啟、運作中）｜第一次成功 toast：視窗底部置中，離底 24px，寬至多 520。', 760, `<div style="position:absolute;left:50%;transform:translateX(-50%);bottom:24px;width:min(520px,calc(100% - 48px))">${toast(T_OK1)}</div>`);
dsetOnly('on-signedout', 'Y3b 設定 › 檔案與儲存（開關開著，但這次還沒登入）｜同手機。', 760);
dsetOnly('on-paused', 'Y3c 設定 › 檔案與儲存（備份暫停：雲端硬碟空間已滿）｜同手機。', 780);
df('Y4 在設定頁打開開關：確認卡（已登入）｜桌機置中對話框（寬 560）。', `${dset('off')}${modal(560, `${mhead('開啟自動存到雲端硬碟？')}<span class="muted">每次更新設定，都會多存一份到你自己的 Google 雲端硬碟。</span>${disclose()}${mfoot(btn('先不要', 'secondary'), btn('開啟自動存檔', 'primary'))}`)}`, 920);
df('Y5 關閉開關：說明關閉後的行為｜桌機置中對話框（寬 560）。', `${dset('on-ok')}${modal(560, `${mhead('關閉自動存到雲端硬碟？')}<span class="muted">關閉後：</span><ul style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px;line-height:1.6"><li>不會再把新的更新存到雲端。</li><li>雲端硬碟裡<b>已經存的那份會留著</b>，本程式不會刪它。要刪，請到 Google 雲端硬碟自己刪（${fg('「移到垃圾桶」的實際字樣')}）。</li><li>你資料夾裡的設定檔照常更新，不受影響。</li></ul><label class="qcard" style="padding:12px 14px;gap:4px;flex-direction:row;align-items:flex-start;cursor:pointer"><input type="checkbox" aria-label="同時中斷 Google 連線" style="margin-top:4px;width:20px;height:20px;flex:none"><span style="flex:1"><b>同時中斷 Google 連線</b><br><span class="small muted">之後再讀 Google 試算表，需要重新登入。</span></span></label>${mfoot(btn('保持開啟', 'secondary'), btn('關閉自動存檔', 'primary'))}`)}`, 920);
df('Y6 toast 文案與樣式｜桌機：toast 位置在視窗底部置中；這裡把六種並排看，實際同一時間只出現一則。', body(main(`${mh('toast 樣式與文案')}<div style="max-width:640px">${toastList()}</div>`, 'gap:14px')), 1000);
df('Y8 存到哪裡？先後順序｜桌機置中對話框（寬 720）。', `${dset('on-ok')}${modal(720, `${mhead('存到哪裡？先後順序')}${prioBody}${prioTable}${prioNotes}${mfoot(btn('知道了', 'primary'))}`)}`, 1000);

// ====================================================================
// 輸出
// ====================================================================
const tokens = rd(repo + '/docs/design/tokens.css').replace(/\/\*[\s\S]*?\*\/\s*/, '');
const css = [rd(sp + '/chrome.css'), rd(sp + '/app.css'), rd(sp + '/doc.css')].join('\n');
const sprite = rd(sp + '/sprite.html');
const extra = `.pagehead{display:flex;flex-direction:column;gap:6px;max-width:72ch}.round{display:flex;flex-direction:column;gap:32px}.scale{position:static!important;width:auto!important;height:auto!important}.scale>.dev,.scale>.paper{position:relative!important;transform:none!important}.figs{overflow-x:auto}
.toast2{display:flex;align-items:center;gap:4px;background:var(--ink);color:var(--paper);padding:var(--sp-3) var(--sp-4);border-radius:var(--r-sm);max-width:min(32rem,calc(100vw - 32px));line-height:1.6}
.toast2 .ti{flex:none;display:grid;place-items:center;margin-right:6px}
.toast2 .tm{flex:1;min-width:0}
.toast2 .ta{flex:none;min-height:44px;padding:0 12px;margin-left:6px;background:transparent;border:0;color:var(--paper);font:inherit;font-weight:700;text-decoration:underline;cursor:pointer}
.toast2 .tx{flex:none;width:44px;height:44px;margin:-8px -10px -8px 0;display:grid;place-items:center;background:transparent;border:0;color:var(--paper);cursor:pointer}`;
function page(name, title, intro, figs) {
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}（模擬頁）</title>
<style>
${tokens}
${css}
${extra}
</style>
</head>
<body>
${sprite}
<div class="wrap">
<header class="pagehead"><p class="small muted">設計規範的模擬頁，使用虛構資料。規範見 docs/design/DESIGN.md 5.28。</p><h1>${title}</h1><p class="muted">${intro}</p></header>
<div class="figs">
${figs.join('\n')}
</div>
</div>
</body>
</html>
`;
  fs.writeFileSync(`${repo}/docs/design/mockups/${name}.html`, html);
  console.log(name, figs.length);
}
const INTRO = '雲端硬碟自動備份（2026-11-01 設計員出稿）：①登入前說明卡與開關（預設關）；②設定頁「自動存到雲端硬碟」開關、開啟前確認、關閉後行為；③存檔成功／失敗／空間滿 toast；④與資料夾存檔的先後順序。Google 介面字樣標「待核對」。';
page('手機-雲端自動備份', '雲端自動備份（手機）', INTRO, P);
page('平板-雲端自動備份', '雲端自動備份（平板）', INTRO + ' 平板：左欄設定分組＋右側內容，彈出面板靠右側。', TB);
page('桌機-雲端自動備份', '雲端自動備份（桌機）', INTRO + ' 桌機：置中對話框。', DKS);
