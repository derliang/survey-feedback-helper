// 手機第二輪 C：審稿（單行意見）、改寫、常用評語、輸出設定、範本、設定檔、關於與隱私、忘記資料夾、Logo
import * as K from './m2kit.mjs';
const { ic, tag, btn, notice, seg, chips, rcard, rowbtn, sheet, scr, act, write, mbar, msteps, mframe, mlong, h, tile, tiles, PRIV } = K;
const F = [];
const back = (t, step, o = {}) => [mbar(t, o), msteps(step, o.done)];

// ---- 6a 老師審稿：意見列單行（R-019）。文字與「採用／隱藏／改寫」同一列；手機用三個 44px 圖示鈕（aria-label 寫全名）
const rv = (kind, text, flag, st = 0) => `<div class="rv${flag ? ' flag' : ''}"><div class="tx">${tag(kind, kind === '建議' ? 'warn' : 'ok')} ${text}${flag ? ' ' + tag(flag, 'bad') : ''}</div><div class="ac"><button type="button" aria-label="採用" aria-pressed="${st === 1}">${ic('check')}</button><button type="button" aria-label="隱藏" aria-pressed="${st === 2}">${ic('eye-off')}</button><button type="button" aria-label="改寫">${ic('pencil')}</button></div></div>`;
const revHead = `<div class="grp"><div style="display:flex;justify-content:space-between;align-items:center"><b>6 號 林小宇</b><span class="small muted">36 則</span></div><div class="small" style="display:flex;justify-content:space-between"><span>已完成 18／44 人</span><span>41%</span></div><div class="prog"><i style="width:41%"></i></div></div>`;
F.push(mframe('6a 老師審稿｜意見列改成單行（R-019）：標籤、文字、「採用／隱藏／改寫」在同一列，一屏約 8 則。手機把三個動作做成 44px 圖示鈕（圖示加 aria-label，長按不需要）；含關鍵字的列加警示外框與「含「笨」」標籤，系統只提醒、不做智慧判斷。完成人數統一寫「已完成 N／總人數 人」加細進度軌道（R-023）。',
  ...back('老師審稿', 4, { right: 'users' }),
  scr(revHead + `<div style="display:flex;gap:8px">${btn('全部採用', 'secondary', { sm: true })}${btn('跳過這位', 'ghost', { sm: true })}</div>` + rv('優點', '報告條理清楚，圖表很好懂。', '', 1) + rv('優點', '講到書裡的例子，讓人想去讀。', '', 1) + rv('建議', '聲音可以再大一點，後排聽不太到。') + rv('建議', '時間有點趕，最後一部分很快帶過。') + rv('建議', '你講得很笨，要再練習。', '含「笨」') + rv('優點', '台風穩，沒有一直看稿。') + rv('建議', '結論可以多說一點自己的想法。'), 8),
  act(btn('評語', 'secondary'), btn('下一位', 'primary'))));

// ---- 6b 改寫留言：兩個框等高（R-020、R-026）
F.push(mframe('6b 改寫留言｜點「改寫」開底部面板：上框是原文（唯讀、灰底、提醒含「笨」），下框是改寫後會顯示給同學的內容；兩個框高度、內距、圓角與字級完全一致（R-020、R-026）。教師版會標示「老師改寫」。',
  ...back('老師審稿', 4, { right: 'users' }),
  scr(revHead + rv('建議', '你講得很笨，要再練習。', '含「笨」') + rv('優點', '台風穩，沒有一直看稿。'), 8),
  act(btn('評語', 'secondary'), btn('下一位', 'primary')),
  sheet('改寫這則回饋', '', `<div class="grp"><span class="gl">原文（唯讀）${' ' + tag('含「笨」', 'bad')}</span><div class="input" style="min-height:76px;height:auto;padding:10px 12px;background:var(--sunk)">你講得很笨，要再練習。</div><span class="gl">改寫後（會顯示給同學）</span><div class="input" style="min-height:76px;height:auto;padding:10px 12px">報告內容可以再多練習幾次，讓表達更順暢。</div></div>`, btn('套用改寫', 'primary', { block: true }) + btn('取消', 'secondary', { block: true }))));

// ---- 6c 老師評語與常用評語：六類頁籤可複選、搜尋、新增分類（R-021、R-042）
const cc = (t, on) => `<button class="chip" type="button" aria-pressed="${!!on}">${t}</button>`;
F.push(mlong(860, '6c 老師評語與常用評語｜評語欄可套用常用評語：六類分類（稱讚努力與態度、稱讚表現與成果、具體改進建議、鼓勵與期待、合作與人際、表達與發表）可複選疊加，加搜尋與「＋ 新增分類」；籌碼顯示短標題，點一下把整句插入。寫了評語或按「跳過」就算完成。預設內容草稿待使用者修改後定稿。',
  ...back('老師審稿', 4, { right: 'users' }),
  scr(`<div class="grp"><b>6 號 林小宇 · 老師評語</b><div class="input" style="min-height:92px;height:auto;padding:10px 12px;line-height:1.6">林小宇準備得很用心，看得出花了很多時間。下次可以再多舉一個例子。</div><div class="small muted" style="display:flex;justify-content:space-between"><span>共 37 字</span>${btn('存成常用評語', 'ghost', { sm: true })}</div></div><div class="grp"><span class="gl">常用評語（點分類可複選；點句子插入）</span><div class="input" style="display:flex;gap:8px;align-items:center;color:var(--ink3)">${ic('search')}搜尋</div><div class="chips" style="flex-wrap:wrap">${cc('稱讚努力與態度', true)}${cc('稱讚表現與成果')}${cc('具體改進建議', true)}${cc('鼓勵與期待')}${cc('合作與人際')}${cc('表達與發表')}${cc('＋ 新增分類')}</div><div class="chips" style="flex-wrap:wrap">${cc('很用心')}${cc('持續進步')}${cc('認真負責')}${cc('再多舉例')}${cc('控制時間')}</div></div>${notice('', 'info', '含關鍵字的回饋會標出：笨、爛。' + ' ' + btn('編輯關鍵字', 'ghost', { sm: true }))}`, 10),
  act(btn('上一位', 'secondary'), btn('下一位', 'primary'))));

F.push(mframe('6d 存成常用評語｜預設存整段；有選取文字就只存選取的部分。學生姓名自動換成 {姓名}，可修改；分類可複選，也可「＋ 新增分類」；短標題顯示在籌碼上（R-042）。',
  ...back('老師審稿', 4, { right: 'users' }),
  scr(`<div class="grp"><b>6 號 林小宇 · 老師評語</b><div class="input" style="min-height:92px;height:auto;padding:10px 12px">林小宇準備得很用心，看得出花了很多時間。</div></div>`, 10),
  act(btn('上一位', 'secondary'), btn('下一位', 'primary')),
  sheet('存成常用評語', '', `<div class="grp"><span class="gl">內容（姓名已換成 {姓名}，可修改）</span><div class="input" style="min-height:64px;height:auto;padding:10px 12px">{姓名}準備得很用心，看得出花了很多時間。</div><span class="gl">放進哪些分類（可複選）</span><div class="chips" style="flex-wrap:wrap">${cc('我的')}${cc('稱讚努力與態度', true)}${cc('稱讚表現與成果')}${cc('具體改進建議')}${cc('鼓勵與期待')}${cc('＋ 新增分類')}</div><span class="gl">短標題（籌碼上顯示）</span><input class="input" value="很用心" aria-label="短標題"></div>`, btn('儲存', 'primary', { block: true }) + btn('取消', 'secondary', { block: true }))));

const draft = (cat, items) => `<div class="grp"><span class="gl">${cat}</span>${items.map(([a, b]) => `<div class="qcard" style="padding:8px 12px;gap:2px"><b>${a}</b><span class="small">${b}</span></div>`).join('')}</div>`;
F.push(mframe('6e 預設常用評語草稿（六類）｜沿用桌機稿現狀，<b>尚未定稿，等使用者修改</b>，不自行改定稿（D54 與評語草稿同樣待回覆）。短標題顯示在籌碼上，完整句子點一下插入，姓名用 {姓名}。完整草稿見 docs/design/預設常用評語草稿.md。',
  mbar('預設常用評語（草稿）', {}),
  scr(draft('稱讚努力與態度', [['很用心', '{姓名}準備得很用心，看得出花了很多時間。'], ['持續進步', '{姓名}一次比一次進步，繼續保持。']]) + draft('稱讚表現與成果', [['內容充實', '{姓名}的內容很充實，重點清楚。'], ['條理清楚', '{姓名}的報告條理分明，聽起來很容易跟上。']]) + draft('具體改進建議', [['再多舉例', '{姓名}下次可以多舉一個例子，讓內容更具體。'], ['聲音再大', '{姓名}的聲音可以再大一點，讓後排也聽得清楚。']]) + `<p class="small muted" style="margin:0">…另三類：鼓勵與期待、合作與人際、表達與發表。草稿待使用者修改。</p>`, 8)));

// ---- O1 輸出設定（R-041）：頁首只有課程、事項；圖表為十一種勾選清單；輸出內容全為勾選清單
const cb = (t, sm, on) => `<button class="opt" role="checkbox" aria-checked="${on}" type="button" style="min-height:52px"><span class="chk" data-on="${on}">${ic('check')}</span><span style="display:flex;flex-direction:column;line-height:1.3"><b>${t}</b>${sm ? `<span style="font-size:var(--fs-xs);color:var(--ink2);font-weight:400">${sm}</span>` : ''}</span></button>`;
F.push(mlong(1030, '4 輸出設定｜回饋單頁首只有「課程」「事項」兩欄（R-041）；圖表區為十一種的勾選清單（全班一致，單人在審稿頁覆寫）；輸出內容也是勾選清單。檔案格式與版本沿用既有（Excel／Word／PDF、教師版／學生版／家長版）。底部一行白話說明會產生什麼。',
  ...back('輸出設定', 4, { brand: true }),
  scr(`<div class="grp"><span class="gl">回饋單頁首</span><label class="small" for="o-c">課程</label><input class="input" id="o-c" value="三年二班 · 小組報告回饋"><label class="small" for="o-s">事項</label><input class="input" id="o-s" value="小組報告：水資源"></div><div class="grp"><span class="gl">輸出內容</span>${cb('個人回饋單（學生版）', '每位同學一份', true)}${cb('班級總表', '', true)}${cb('同學回饋全文（給老師）', '', false)}</div><div class="grp"><span class="gl">要放的圖表（11 種，勾選）</span>${cb('對照條', '預設', true)}${cb('雷達圖', '', true)}${cb('堆疊橫條', '', false)}${cb('長條圖', '', false)}<p class="small muted" style="margin:0">…折線圖、熱圖、圓環／圓餅、直方圖、散布圖、盒鬚圖、圓點圖</p></div><div class="sumline">${ic('info')}<span>將產生 41 個 PDF，打包成 1 個 zip，約 3.3 MB</span></div>`, 10),
  act(btn('預覽', 'secondary'), btn('產生並下載', 'primary'))));

// ---- 範本庫（R-025、R-043）
const tp = (nm, sm, tg) => `<div class="qcard" style="padding:10px 12px;gap:8px"><div style="display:flex;gap:10px;align-items:center"><div aria-hidden="true" style="width:56px;height:76px;border:1px solid var(--ctl);border-radius:4px;background:var(--card);padding:6px;display:flex;flex-direction:column;gap:4px;flex:none"><i style="height:6px;background:var(--bar-muted);border-radius:2px"></i><i style="height:12px;background:var(--accent);border-radius:2px;width:70%"></i><i style="height:5px;background:var(--line);border-radius:2px"></i><i style="height:5px;background:var(--line);border-radius:2px;width:60%"></i></div><div style="flex:1;min-width:0"><b>${nm}</b> ${tg}<div class="small muted">${sm}</div></div></div><div style="display:flex;gap:8px">${btn('套用', 'secondary', { sm: true })}${btn('編輯', 'secondary', { sm: true })}</div></div>`;
F.push(mframe('9a 範本庫｜每個範本的縮圖由它實際的版面產生（R-025），彼此看得出差別；內建不可改，第一次修改時複製成「我的範本」並命名；範本庫與編輯器都有「恢復預設」（二次確認，R-043）。底部固定「匯入範本」。',
  ...back('範本庫', 4, { right: 'more' }),
  scr(seg(['全部 7', '我的 1', '內建 6'], 0, '範本篩選') + tp('票選結果公告', '公告頁與計票明細。', tag('我的', 'accent')) + tp('個人回饋單 · 學生版', '2 頁：分數、圖表、同學的具體回饋。', tag('內建')) + tp('個人回饋單 · 含平均列', '一位被回饋者一張，最後一列是各題平均（小數一位）。', tag('內建')), 8),
  act(btn('恢復預設', 'secondary'), btn('匯入範本', 'primary'))));

F.push(mframe('9a2 第一次修改內建範本｜內建範本不能直接改，所以第一次動就複製成「我的範本」，要先命名；內建的原版不會被動到，隨時可以「恢復預設」。',
  ...back('編輯：個人回饋單 · 學生版', 4, { right: 'more' }),
  scr(tp('個人回饋單 · 學生版', '2 頁：分數、圖表、同學的具體回饋。', tag('內建')), 8),
  act(btn('取消', 'secondary'), btn('下一步', 'primary')),
  sheet('複製成「我的範本」再修改', '內建範本不能直接改。我會幫你複製一份，之後都改這一份；內建的原版不會被動到。', `<label class="small" for="tn">範本名稱</label><input class="input" id="tn" value="個人回饋單 · 學生版（我的）">`, btn('複製並開始編輯', 'primary', { block: true }) + btn('取消', 'secondary', { block: true }))));

// ---- 設定檔（R-030：專案檔→設定檔）
const inc = (t, on = true) => `<div style="display:flex;gap:10px;align-items:center;min-height:36px"><span class="chk" data-on="${on}">${ic('check')}</span><span class="small">${t}</span></div>`;
F.push(mframe('9e 儲存設定檔｜「專案檔」改叫「設定檔」（R-030）。內容是欄位對應、試算表 ID（用來認得是同一份）、權重、量表標籤、圖表與輸出設定、範本；學生名單另存。手機＝下載 .sfh 檔（副檔名暫定），桌機才會存進你選的資料夾。不含任何問卷作答資料。',
  ...back('儲存設定檔', 4, { right: null }),
  scr(h('儲存設定檔', '下學期同一份問卷格式一樣，開啟後就不用再對應欄位。') + `<label class="small" for="cn">設定檔名稱</label><input class="input" id="cn" value="讀書報告回饋（三年二班）"><div class="grp"><span class="gl">會存什麼</span>${inc('欄位對應與顯示名稱')}${inc('試算表 ID（用來認得是同一份）')}${inc('權重、量表標籤、反向題')}${inc('圖表與輸出設定、範本')}${inc('學生名單（另存，與設定檔分開）', false)}</div>` + notice('', 'info', '這支手機會下載成「讀書報告回饋（三年二班）.sfh」。不含任何問卷作答資料。'), 10),
  act(btn('取消', 'secondary'), btn('存起來', 'primary'))));

// ---- 關於與隱私（從簡）、忘記資料夾（邊界條件 1）
F.push(mframe('12d 關於與隱私（從簡）｜資料與設備都是老師自己的，只用三句白話（邊界條件 1）；隱私三句仍待使用者定稿（D54），這裡沿用桌機稿現況。沒有「分析使用數據」選項（不蒐集），也沒有「管理名單／一鍵刪除」入口與存放期限。',
  ...back('關於與隱私', 4, { right: null }),
  scr(`<div class="grp"><span class="gl">資料怎麼處理</span><div class="qcard" style="gap:10px"><span>本程式沒有伺服器，問卷結果只在這個瀏覽器處理。</span><span>設定、名單與審稿進度存在你選的資料夾（手機＝你下載的設定檔），隨時能在檔案總管或檔案 App 看到、備份或刪除。</span><span>問卷結果如果放在 Google 試算表或同步資料夾，由該服務處理。</span></div></div><div class="grp"><span class="gl">授權與原始碼</span><div class="qcard" style="gap:6px"><span>GPL-3.0 · 原始碼與第三方元件清單在 GitHub。</span>${btn('開啟原始碼頁面', 'secondary', { sm: true })}</div></div>`, 14)));

F.push(mframe('12f 忘記這個資料夾｜取代原「清除本機設定」。只會讓瀏覽器忘記資料夾的位置與最近的問卷清單，資料夾（或你下載的檔案）裡的東西都不動；之後重新選同一個資料夾，一切就回來。手機沒有可選的資料夾時，這一項改成「清除最近的問卷清單」。',
  ...back('資料夾與 Google', 4, { right: null }),
  scr(`<div class="grp"><span class="gl">存放資料的位置</span>${notice('', 'info', '這支手機：設定檔與名單用下載保存，不會自動存取資料夾。')}${btn('忘記最近的問卷清單', 'danger', { block: true })}</div>`, 12),
  sheet('忘記最近的問卷清單？', '瀏覽器會忘記最近的問卷清單（桌機則是忘記「問卷小幫手」資料夾的位置）。', `<ul class="small" style="margin:0 0 8px 1.2em;padding:0;line-height:1.9"><li><b>設定檔、名單、審稿進度都不會動</b></li><li>已輸出的檔案與雲端檔案不受影響</li><li>之後重新開啟設定檔，一切就回來</li></ul>`, btn('忘記', 'danger', { block: true }) + btn('取消', 'secondary', { block: true }))));

// ---- Logo（定案：乙，長條＋勾）
const L2 = '<rect width="64" height="64" rx="14" style="fill:var(--accent)"/><rect x="14" y="34" width="9" height="16" rx="2" style="fill:var(--on-accent)"/><rect x="27" y="24" width="9" height="26" rx="2" style="fill:var(--on-accent)"/><rect x="40" y="14" width="9" height="36" rx="2" style="fill:var(--on-accent)"/><path d="M13 20l7 7 12-14" style="fill:none;stroke:var(--on-accent);stroke-width:4;stroke-linecap:round;stroke-linejoin:round" transform="translate(30 -2) scale(.6)"/>';
const lg = (px) => `<svg viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true">${L2}</svg>`;
F.push(mframe('Logo 品牌（定案：乙，長條＋勾）｜使用者 2026-11-01 選定：三根升高的長條加右上的勾，像「統計完成」，只用主色（鈷藍）與白，16px 仍清楚；深色模式一樣成立。手機放在頂端列與主畫面圖示。',
  mbar('問卷回饋小幫手', { brand: true }), msteps(1, []),
  scr(`<div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding-top:40px">${lg(96)}<b style="font-size:var(--fs-xl)">問卷回饋小幫手</b><div style="display:flex;gap:24px;align-items:flex-end">${lg(48)}${lg(32)}${lg(16)}</div><span class="small muted">96／48／32／16 px</span></div>`, 12)));

write('frag-b33.html', F);
console.log('b33', F.length);
