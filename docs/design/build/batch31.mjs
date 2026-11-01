// 手機第二輪 A：首頁、開啟、讀取、資料夾（手機退回手動）、認得讀過、重新開始、Google 試算表直讀、匯出教學、Google 登入前提醒與視窗被擋（第七輪取代原「擋下學校帳號」）
// 套用 2026-11-01 邊界條件、審稿意見裁示、10-31 頁面裁示；桌機定案（首頁雙欄、Logo 乙）視為沿用。
import * as K from './m2kit.mjs';
import { chooser } from './acctkit.mjs';
const { ic, tag, icbtn, btn, notice, seg, rcard, rowbtn, grp, sheet, scr, act, write, mbar, msteps, mframe, mlong, h, file, PRIV, xl } = K;
const F = [];

// 最近的問卷卡：每張卡記住「設定檔位置＋試算表 ID／欄位標題」，一鍵銜接、跳過欄位對應（邊界條件 3）
const rc = (nm, kind, last, extra) => `<button class="rowbtn" type="button" style="min-height:84px;align-items:flex-start"><div><div class="nm" style="white-space:normal">${nm}</div><div class="sm" style="white-space:normal">${kind}</div><div class="sm" style="white-space:normal">上次 ${last}</div></div><span class="rt" style="flex-direction:column;align-items:flex-end;gap:6px">${extra}${ic('next')}</span></button>`;
const R1 = rc('讀書報告回饋（三年二班）', '報告回饋 · Google 試算表', '10/28', tag('新增 12 筆', 'accent'));
const R2 = rc('幹部票選（三年二班）', '票選幹部 · Excel 檔', '10/12', tag('選檔後自動帶入'));
const R3 = rc('活動滿意度調查', '意見調查 · Google 試算表', '9/30', tag('沒有新回覆'));
const foldStat = `<div class="small" style="display:flex;gap:8px;color:var(--ink2);align-items:flex-start">${ic('lock')}<span>${PRIV}</span></div>`;
const openBtns = `${btn('開啟試算表', 'primary', { block: true, icon: 'table' })}${btn('選擇 Excel 檔', 'secondary', { block: true, icon: 'file' })}${btn('開啟設定檔', 'secondary', { block: true, icon: 'folder' })}`;
const homeBody = (extra = '') => scr(extra + h('今天要處理哪一份問卷？', '開啟 Google 試算表，或選一個 Excel 檔。') + `<div class="grp">${openBtns}</div><div class="grp"><span class="gl">最近的問卷</span>${R1}${R2}${R3}</div>${foldStat}`, 12);

// ---- H1 首頁（手機版：沒有拖放，三個大按鈕在上、最近的問卷卡在下，對應桌機定案的雙欄）
F.push(mframe('H1 首頁｜桌機定案「雙欄」在手機改成上下排：三個開啟按鈕在上（手機不能拖放，所以不放拖放區），最近的問卷卡片在下，卡片標「新增 N 筆」。拿掉示範資料與雲端硬碟入口（R-001、R-002）；示範資料只放教學頁。頂端列固定有「重新開始」（圖示）與「設定」。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []), homeBody(),
  act(btn('下一步：準備資料', 'primary', { dis: true }))));

// ---- 1b 開啟（選來源）
const src = (icon, nm, sm, rec) => `<button class="opt" type="button" style="min-height:68px"><span style="color:var(--accent-ink)">${ic(icon)}</span><span style="display:flex;flex-direction:column;line-height:1.35;flex:1"><b>${nm} ${rec ? tag('建議', 'accent') : ''}</b><span style="font-size:var(--fs-xs);color:var(--ink2);font-weight:400;white-space:normal">${sm}</span></span></button>`;
F.push(mframe('1b 開啟（選來源）｜按下「開啟」由下往上彈出。三個來源各寫一句會發生什麼：Google 試算表讀「目前最新內容」且不改原檔；Excel 檔用系統選檔；設定檔還原之前存的欄位對應。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []), homeBody(),
  act(btn('下一步：準備資料', 'primary', { dis: true })),
  sheet('從哪裡開啟？', '', src('table', 'Google 試算表', '登入 Google 後挑一份回應試算表；讀到目前最新內容，不會改到原檔，之後可再按「重新讀取」。', true) + src('file', 'Excel 檔', '用系統選檔視窗選 .xlsx（下載資料夾、檔案 App）。') + src('folder', '設定檔', '還原之前存的欄位對應與設定，再選這學期的問卷。'), btn('取消', 'secondary', { block: true }))));

// ---- 1c 讀取中（Google 直讀）
F.push(mframe('1c 讀取中（Google 試算表）｜顯示「正在讀取目前最新的內容」。讀完標出比上次多幾筆；不會改到雲端的原檔。讀取時「下一步」停用。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []),
  scr(h('開啟問卷') + file('讀書報告回饋 (回覆)', 'Google 試算表 · 表單回覆 1') + `<div class="prog" role="progressbar" aria-valuenow="60"><i style="width:60%"></i></div><p class="small muted">正在讀取目前最新的內容…讀到 56 筆回覆。這是讀取當下的內容，不會改到雲端的原檔。</p>` + notice('', 'lock', PRIV) + `<div class="grp"><span class="gl">最近的問卷</span>${R1}${R2}</div>`, 12),
  act(btn('取消', 'secondary'), btn('下一步：準備資料', 'primary', { dis: true }))));

// ---- 1d 讀不到檔案
F.push(mframe('1d 讀不到檔案｜說明哪裡錯、怎麼改，並直接給「重新選擇」與匯出教學連結。錯誤提示加圖示與文字，不只靠顏色。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []),
  scr(h('開啟問卷') + notice('bad', 'warn', '<b>讀不到「回覆.numbers」</b><br>目前只支援 Excel（.xlsx）與 csv。', btn('重新選擇檔案', 'primary', { sm: true })) + rowbtn('怎麼匯出成 Excel 檔？', '兩段，各三步以內', tag('教學'), false) + rowbtn('Google 登入遇到問題怎麼辦？', '視窗打不開、被關掉、找不到試算表', tag('教學'), false) + `<p class="small muted">更簡單：回到首頁用「開啟試算表」直接讀 Google 試算表，不必匯出。</p>`, 12),
  act(btn('回到首頁', 'secondary'), btn('重新選擇檔案', 'primary'))));

// ---- E3 手機：不能自動存到資料夾
F.push(mframe('E3 這支手機不能自動存取資料夾｜桌機 Chrome／Edge 才能把設定與名單自動存進你選的資料夾；手機與平板（含 Safari、Firefox）不支援，改成手動下載與選檔，功能一樣能用。不擋人、不重複彈出。桌機的 E1「第一次選資料夾」、E2「重新授權」在手機不會出現。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []),
  scr(notice('', 'info', '<b>這支手機無法自動存到資料夾</b><br>你仍然可以完整使用。差別是：設定檔與名單要自己下載保存，下次再用「開啟設定檔」選回來。想要自動存取，請改用桌機版 Chrome 或 Edge。', btn('知道了', 'secondary', { sm: true }) + btn('怎麼手動存取', 'ghost', { sm: true })) + h('今天要處理哪一份問卷？') + `<div class="grp">${openBtns}</div><div class="grp"><span class="gl">最近的問卷</span><div class="notice">${ic('folder')}<div><b>這個瀏覽器不會記住</b><br>請按「開啟設定檔」選之前存的檔案，就能接續。</div></div></div>`, 12),
  act(btn('下一步：準備資料', 'primary', { dis: true }))));

// ---- E4 認得讀過
const mapRow = (a, b) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:var(--fs-sm)"><span>${a}</span><b>${b}</b></div>`;
F.push(mframe('E4 認得讀過｜選了 Excel 檔，欄位標題跟某份存過的設定很像（不看檔名，因為檔名會變），就問老師「這是不是之前的《…》？」。確認後跳過欄位對應，直接進統計。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []),
  scr(h('這是不是之前的《讀書報告回饋》？') + file('讀書回饋 (回覆) 新.xlsx', '12 欄，與 10/28 存的設定有 11 欄一樣') + `<div class="grp"><span class="gl">這份檔案的欄位 → 套用設定後的用途</span>${mapRow('我的名字', '填寫者')}${mapRow('被回饋者姓名', '被評對象')}${mapRow('她的書名', '書名')}${mapRow('簡報內容（充實度）：', '評分項目 0～10')}${mapRow('時間戳記', '時間')}<p class="small muted" style="margin-top:6px">…另 6 欄</p></div><p class="small muted">套用後會直接進到「統計」，統計用全部累積的回覆；之後想改欄位對應，到「準備資料」改。</p>`, 10),
  act(btn('不是，重新對應', 'secondary'), btn('是，直接套用', 'primary'))));

// ---- E5 重新開始（確認）
F.push(mframe('E5 重新開始（確認）｜頂端列固定有「重新開始」（圓箭頭圖示，aria-label「重新開始」），每個畫面都按得到。按下先確認：說明會清掉什麼、不會動什麼；審稿進度未存時，主動作是「先存進度」。',
  mbar('統計：幹部票選', { brand: true }), msteps(3),
  scr(`<div class="grp"><b>三年二班 · 41 筆回覆</b></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${K.tile('收到', 41)}${K.tile('已決定', 3)}${K.tile('待處理', 1, 'warn')}</div>`, 12),
  act(btn('上一步', 'secondary'), btn('下一步：輸出', 'primary')),
  sheet('重新開始？', '會清掉這次開啟的全部內容，回到首頁：', `<ul class="small" style="margin:0 0 8px 1.2em;padding:0;line-height:1.9"><li>這次讀進來的問卷結果</li><li>這次的審稿與評語（<b>還沒存的部分</b>）</li><li>這次改過但沒存的設定</li></ul><p class="small muted">不會動：資料夾或你下載的設定檔、名單，與已輸出的檔案。審稿進度 18／44 人，要保留的話先按「存進度」。</p>`, btn('先存進度', 'primary', { block: true }) + btn('重新開始', 'danger', { block: true }) + btn('取消', 'secondary', { block: true }))));

// ---- Google 試算表直讀（R-044）：D44、D45、D46
const sheetRow = (nm, sm, on) => `<button class="opt" role="radio" aria-checked="${!!on}" type="button" style="min-height:64px"><span class="dot"></span><span style="display:flex;flex-direction:column;line-height:1.35"><b>${nm}</b><span style="font-size:var(--fs-xs);color:var(--ink2);font-weight:400">${sm}</span></span></button>`;
F.push(mframe('Gd1 選取 Google 試算表｜登入後出現 Google 提供的選檔視窗，只看得到你點選的檔案。文案：選好後讀到「目前最新的內容」，不會修改原檔；之後有新回覆，按「重新讀取」更新。（2026-11-01 起任何 Google 帳號都能用，不限私人 Gmail）',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []), homeBody(),
  act(btn('下一步：準備資料', 'primary', { dis: true })),
  sheet('選取 Google 試算表', '', sheetRow('讀書報告回饋 (回覆)', 'Google 試算表 · 今天 10:42', true) + sheetRow('幹部票選 (回覆)', 'Google 試算表 · 去年') + `<p class="small muted" style="margin-top:6px">選好後會直接讀取它目前最新的內容，<b>不會修改原檔</b>。之後有新回覆，按「重新讀取」就會更新。個人帳號、學校帳號都能登入。</p>`, btn('選取並讀取', 'primary', { block: true }) + btn('取消', 'secondary', { block: true }))));

F.push(mframe('Gd2 無法連線 Google｜只說現況與替代做法：不保證何時恢復、不談費用（R-027）。已存的設定檔不受影響，改用 Excel 檔也會認得這份問卷、帶入欄位對應。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []),
  scr(notice('warn', 'warn', '<b>目前無法使用 Google 連線</b><br>可能是網路問題，或 Google 暫時限制了使用量。稍後再試，或先改用 Excel 檔。', btn('再試一次', 'secondary', { sm: true })) + `<div class="grp"><span class="gl">現在可以這樣做</span><ol class="small" style="margin:0 0 0 1.2em;padding:0;line-height:1.9"><li>回到首頁，按「選擇 Excel 檔」。</li><li>在試算表選「<b>檔案</b>」→「<b>下載</b>」→「<b>Microsoft Excel (.xlsx)</b>」，再把檔案選進來。</li></ol></div><p class="small muted">已存的設定檔不受影響，改用 Excel 檔也會認得這份問卷、帶入欄位對應。</p>`, 14),
  act(btn('選擇 Excel 檔', 'primary', { block: true }))));

F.push(mframe('Gd3 資料夾與 Google 連線設定｜上半是存放資料的位置（手機＝手動保存，桌機才有可重選的資料夾），下半是 Google 連線。「中斷連線」只是讓本程式忘記連線，不刪任何檔案；要完全撤銷到 Google 帳戶的「安全性」→「第三方應用程式存取權」。權限範圍只有 drive.file。',
  mbar('資料夾與 Google', {}),
  scr(`<div class="grp"><span class="gl">設定與名單的存放</span>${notice('', 'info', '這支手機：設定檔與名單用「下載」存、用「開啟設定檔」讀回；不會自動存取資料夾。')}${btn('下載目前的設定檔', 'secondary', { block: true, icon: 'down-arrow' })}</div><div class="grp"><span class="gl">Google 連線</span><div class="qcard" style="gap:8px"><div style="display:flex;gap:8px;align-items:center"><b>已連線</b>${tag('已連線', 'ok')}</div><span class="small">wang.teacher@gmail.com</span><span class="small muted">權限：只能讀你點選的試算表，不能看你其他的檔案。</span></div>${btn('中斷連線', 'danger', { block: true })}<p class="small muted">中斷連線不會刪檔。想完全撤銷：到 Google 帳戶的「安全性」→「第三方應用程式存取權」移除本程式。</p></div>`, 14)));

// ---- 教學：怎麼匯出成 Excel 檔（用字照 Google介面核對紀錄.md，2026-11-01 核對，桌機 Chrome 繁體中文）
const mini = (rows, style = '') => `<div aria-hidden="true" style="border:1px solid var(--ctl);border-radius:var(--r-sm);background:var(--card);padding:8px 10px;font-size:var(--fs-xs);display:flex;flex-direction:column;gap:4px;${style}">${rows}</div>`;
const tabs = `<div style="display:flex;gap:14px;border-bottom:1px solid var(--line-soft);padding-bottom:4px"><span>問題</span><b style="color:var(--accent-ink);border-bottom:2px solid var(--accent-ink)">回覆</b><span>設定</span></div><div style="display:flex;justify-content:space-between;align-items:center"><b>0 則回應</b><span style="display:flex;gap:6px;align-items:center">${xl.replace('width="24" height="24"', 'width="18" height="18"')}<b style="color:var(--accent-ink)">連結至試算表</b> ⋮</span></div>`;
const stepN = (n, inner) => `<div style="display:flex;gap:10px;align-items:flex-start"><span style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:grid;place-items:center;font-weight:700;font-size:var(--fs-sm)">${n}</span><div class="small" style="line-height:1.7;display:flex;flex-direction:column;gap:6px;min-width:0">${inner}</div></div>`;
const checked = '<p class="small muted" style="margin:0">用字依 2026-11-01 在桌機 Chrome（繁體中文介面）實際操作核對（見 Google介面核對紀錄）；手機 App 與其他瀏覽器的介面<b>待核對</b>；Google 改版時可能不同。示意圖為自畫簡化版，不是 Google 截圖。</p>';
F.push(mlong(990, 'G1 教學：怎麼匯出成 Excel 檔（A）｜A. 在 Google 表單「連結至試算表」。三步以內，名稱照實際畫面抄，「回覆」分頁與「回應」計數並用也照抄。新表單會彈出 Gemini 視窗，提醒先按右上「✕」關掉。',
  mbar('怎麼匯出成 Excel 檔', {}),
  scr(`<h2 style="font-size:var(--fs-lg);margin:0">A. 在 Google 表單「連結至試算表」</h2>` + stepN(1, `開啟你的 Google 表單，點上方的「<b>回覆</b>」分頁。<span class="muted">新表單一開始會跳出 Gemini 視窗，按右上「✕」關掉即可，不是必要步驟。</span>${mini(tabs)}`) + stepN(2, `按「<b>連結至試算表</b>」，在「選取回應目標位置」選「<b>建立新試算表</b>」，按「<b>建立</b>」。<span class="muted">會自動開一個新分頁顯示試算表，名稱是「表單名稱 (回覆)」。</span>${mini('<b>選取回應目標位置</b><span>◉ 建立新試算表（名稱：表單名稱 (回覆)）</span><span>○ 選取現有的試算表</span><span style="text-align:right">取消　<b style="color:var(--accent-ink)">建立</b></span>')}`) + `<p class="small muted" style="margin:0">更簡單：用「開啟試算表」直接讀 Google 試算表，不必匯出。</p>` + checked, 12),
  act(btn('下一段：匯出', 'primary', { block: true }))));

F.push(mlong(960, 'G2 教學：怎麼匯出成 Excel 檔（B）｜B. 從回應試算表匯出：「檔案」→「下載」→「Microsoft Excel (.xlsx)」。檔名通常是「表單名稱 (回覆).xlsx」；下載後回到本程式用「選擇 Excel 檔」選它。',
  mbar('怎麼匯出成 Excel 檔', {}),
  scr(`<h2 style="font-size:var(--fs-lg);margin:0">B. 從回應試算表匯出 Excel 檔</h2>` + stepN(1, `在試算表上方選單點「<b>檔案</b>」，再點「<b>下載</b>」。${mini('<b>檔案</b>　編輯　查看　插入…<hr style="border:0;border-top:1px solid var(--line-soft);width:100%;margin:2px 0"><span>開啟　匯入　建立副本</span><span><b>下載 ▸</b></span><span>重新命名　移動…</span>')}`) + stepN(2, `選「<b>Microsoft Excel (.xlsx)</b>」，檔案就會下載。<span class="muted">檔名通常是「表單名稱 (回覆).xlsx」。</span>${mini('<b style="color:var(--accent-ink)">Microsoft Excel (.xlsx)</b><span>OpenDocument 檔案 (.ods)</span><span>PDF 檔案 (.pdf)</span><span>網頁 (.html)</span><span>逗號分隔值檔案 (.csv)</span><span>Tab 鍵分隔值檔案 (.tsv)</span>')}`) + stepN(3, '回到這裡，按「選擇 Excel 檔」選剛下載的檔案。') + checked, 12),
  act(btn('回到首頁', 'secondary'), btn('選擇 Excel 檔', 'primary'))));

// ---- Google 登入：登入前先看一下、準備中、視窗被擋、教學（第七輪，2026-11-01：取消「只限私人 Gmail」，任何 Google 帳號都能用；取代第三、四輪的「擋下學校帳號」S0／S1／S2）
const bstep = (n, t) => `<div class="qcard" style="gap:4px;padding:12px 14px"><b>${n}　${t[0]}</b><span class="small" style="line-height:1.6">${t[1]}</span></div>`;
const gXlsx = '<b>不想登入？</b>在試算表選「檔案」→「下載」→「Microsoft Excel (.xlsx)」，回到本程式按「選擇 Excel 檔」。這樣完全不用登入。';
const gLead = '個人帳號、學校帳號都能用，請選放著這份試算表、或有權限開它的那一個。';
F.push(mframe('S0 登入前先看一下｜在「開啟試算表」選了 Google 試算表之後、開 Google 視窗「之前」先由下往上彈出這張卡。取消帳號限制後它不再教老師選哪種信箱，只提醒「選放著這份試算表的帳號」與「沒看到帳號按『使用其他帳戶』」；進入這張卡時就在背景預載 Google 登入腳本（見 S0b）。示意為自畫簡化版，「使用其他帳戶」字樣待核對。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []), homeBody(),
  act(btn('下一步：準備資料', 'primary', { dis: true })),
  sheet('登入前先看一下', gLead, chooser() + `<p class="small muted" style="margin:0;line-height:1.6">${gXlsx}</p>`, `<div style="display:flex;gap:8px">${btn('取消', 'secondary', { block: true })}${btn('前往 Google', 'primary', { block: true })}</div>`)));

F.push(mframe('S0b 準備 Google 登入…（按鈕停用）｜Google 登入腳本還沒載好時，主按鈕停用並改寫「準備 Google 登入…」，卡片裡寫明原因；載好才變回「前往 Google」。理由：登入視窗必須在按下去的同一瞬間開，腳本若等到點擊之後才下載，iOS Safari 等會擋下視窗（見決定記錄〈取消帳號限制〉預防第 1、2 點）。「取消」仍可按。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []), homeBody(),
  act(btn('下一步：準備資料', 'primary', { dis: true })),
  sheet('登入前先看一下', gLead, chooser() + notice('', 'info', '<b>正在準備 Google 登入…</b>通常一兩秒，載好後按鈕會變成「前往 Google」。網路較慢時請稍等，不用重按。', '') + `<p class="small muted" style="margin:0;line-height:1.6">${gXlsx}</p>`, `<div style="display:flex;gap:8px">${btn('取消', 'secondary', { block: true })}${btn('準備 Google 登入…', 'primary', { block: true, dis: true })}</div>`)));

F.push(mlong(800, 'S1 Google 登入視窗被瀏覽器擋下（popup_failed_to_open）｜按「前往 Google」後，瀏覽器沒讓登入視窗開出來。這不是帳號的問題，沒有讀取任何檔案。文案依決定記錄〈取消帳號限制〉預防第 3 點：請再按一次；還是不行改用 Safari 或 Chrome（LINE 等 App 內建瀏覽器常擋）；或到瀏覽器設定允許這個網站的彈出式視窗；出口「改用 Excel 檔」。各瀏覽器設定選單的實際名稱待核對。',
  mbar('無法開啟登入視窗', { close: true, right: null }),
  scr(notice('warn', 'warn', '<b>瀏覽器擋下了 Google 登入視窗</b><br>這不是你的帳號有問題，也<b>沒有讀取你的任何檔案</b>。<br><span class="small muted">錯誤代碼：popup_failed_to_open</span>', '') + bstep('1', ['再按一次', '按下方的「再試一次」。']) + bstep('2', ['還是不行：改用 Safari 或 Chrome', '請用 Safari 或 Chrome 開啟本網站。LINE 等 App 內建的瀏覽器常常擋彈出視窗。']) + bstep('3', ['或允許彈出式視窗', '到瀏覽器設定，允許這個網站的彈出式視窗。待核對：各瀏覽器設定選單的實際名稱。']) + notice('', 'info', gXlsx, ''), 10),
  act(btn('再試一次', 'primary', { block: true }), btn('改用 Excel 檔', 'secondary', { block: true }))));

F.push(mlong(780, 'S1b Google 登入視窗被關掉（popup_closed）｜視窗有開出來，但沒完成登入就關了：可能是老師自己關的，也可能是 Google 在視窗裡顯示了錯誤頁後關閉（例如學校管理員限制第三方應用程式，這種情況本程式攔不到、也處理不了）。與 S1 分開說明：先請再試一次，再說明學校管理員限制時改用另一個 Google 帳號或 Excel 檔。Google 錯誤頁的實際字樣待核對。',
  mbar('登入還沒完成', { close: true, right: null }),
  scr(notice('warn', 'warn', '<b>登入視窗被關掉了</b><br>可能是你自己關掉的，也可能是 Google 在視窗裡顯示了錯誤頁後關閉。<br><span class="small muted">錯誤代碼：popup_closed</span>', '') + bstep('1', ['想繼續：再按一次', '選好帳號後，依畫面按同意。']) + bstep('2', ['Google 視窗顯示錯誤時', '常見原因是學校管理員限制了第三方應用程式。這是學校帳號的設定，本程式處理不了：換另一個 Google 帳號（例如個人帳號）再試，或改用 Excel 檔。待核對：Google 錯誤頁的實際字樣。']) + notice('', 'info', gXlsx, ''), 10),
  act(btn('再試一次', 'primary', { block: true }), btn('改用 Excel 檔', 'secondary', { block: true }))));

F.push(mlong(1000, 'S2 教學：Google 登入遇到問題怎麼辦｜在「教學」裡的固定說明（不是錯誤畫面）。三種情況：登入視窗沒有打開（S1）、視窗開了又被關掉（S1b）、登入後找不到要開的試算表（多半是帳號選錯，附選帳號示意圖）；最後固定給「改用 Excel 檔」的出口。取代第三、四輪的「怎麼改用私人 Gmail 登入」。Google 視窗與 Google 試算表的字樣只用已核對的選單，其餘標「待核對」。',
  mbar('Google 登入遇到問題', {}),
  scr(`<p class="small" style="margin:0;line-height:1.7">個人帳號、學校帳號都能用。遇到下面的情況，照著做：</p>` + stepN(1, '<span><b>登入視窗沒有打開。</b>再按一次；還是不行，改用 Safari 或 Chrome（LINE 等 App 內建瀏覽器常擋），或允許這個網站的彈出式視窗。<span class="muted">待核對：各瀏覽器設定選單的名稱。</span></span>') + stepN(2, '<span><b>視窗開了又關掉。</b>再按一次，選好帳號後按同意。如果 Google 視窗顯示錯誤，可能是學校管理員限制了第三方應用程式：換另一個 Google 帳號再試。</span>') + stepN(3, '<span><b>登入了，但找不到要開的試算表。</b>多半是選到沒有放這份試算表的帳號：登出後重新登入，選放著它的那一個。沒看到帳號時按「使用其他帳戶」。<span class="muted">待核對：實際字樣。</span></span>') + chooser() + notice('', 'info', gXlsx, ''), 12),
  act(btn('回首頁', 'secondary'), btn('選擇 Excel 檔', 'primary'))));

write('frag-b31.html', F);
console.log('b31', F.length);
