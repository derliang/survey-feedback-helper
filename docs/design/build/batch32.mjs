// 手機第二輪 B：準備資料、名單、權重、票選名單、唱票（B）、圖表（圖庫、勾選換圖、另存）、報告回饋、累積統計
import * as K from './m2kit.mjs';
const { ic, tag, btn, notice, seg, chips, rcard, rowbtn, brow, sheet, scr, act, write, mbar, msteps, mframe, mframeWH, mlong, h, file, tile, tiles, kb } = K;
const F = [];
const back = (t, step, o = {}) => [mbar(t, o), msteps(step, o.done)];

// ---- 2 準備資料（總覽）：四件事固定順序，前兩件完成才解鎖後兩件（R-006）；完成度依實際狀態（R-037）
const locked = (nm, why) => `<button class="rowbtn" type="button" disabled style="opacity:1;background:var(--sunk);border-color:var(--line-soft)"><div><div class="nm" style="color:var(--ink2)">${nm}</div><div class="sm" style="white-space:normal;color:var(--ink2)">${why}</div></div><span class="rt">${tag('未解鎖')}</span></button>`;
F.push(mframe('2 準備資料（總覽）｜四件事固定順序：問卷類型 → 欄位對應 → 學生名單（選用）→ 資料檢查。前兩件做完才解鎖後兩件，鎖住的寫出缺什麼（R-006）；上方寫「完成 1／4」，依實際狀態算。',
  ...back('準備資料', 2, { brand: true }),
  scr(file() + `<p class="small" style="margin:0"><b>完成 1／4</b> · 依序做完；前兩件是必做。</p>` + rowbtn('1 問卷類型', '報告回饋（系統智慧判斷後，你已確認）', tag('已確認', 'ok')) + rowbtn('2 欄位對應', '12 欄中 2 欄請確認；這份問卷存過設定，已先帶入', tag('請確認', 'warn'), true) + locked('3 學生名單（選用）', '先完成欄位對應。可跳過：不比對名單也能統計') + locked('4 資料檢查', '先完成欄位對應。重複、空白、同一人書名多種寫法') + notice('', 'info', '完成「欄位對應」後就能看統計；名單與資料檢查之後再做也可以，統計會跟著更新。'), 10),
  act(btn('上一步', 'secondary'), btn('下一步：欄位對應', 'primary'))));

// ---- 2a 問卷類型
F.push(mframe('2a 問卷類型｜系統「智慧判斷」並標「建議」，老師確認。每種類型一句白話：它會幫你做什麼。下面寫「怎麼判斷的」，類型只決定預設的統計方式，之後還能調整。',
  ...back('問卷類型', 2),
  scr(h('這是哪一種問卷？', '看起來像「報告回饋」，你可以更改。') + rcard('票選幹部', '選班長、副班長等：算每個人得幾票、誰當選、同票怎麼辦', false, 'min-height:76px') + rcard('意見調查', '活動滿意、教學回饋：每題的分布、平均，與開放意見整理', false, 'min-height:76px') + rcard('報告回饋 ' + tag('建議', 'accent'), '同學互評、小組報告：每位被評對象的各項平均與同學的具體回饋', true, 'min-height:76px') + notice('', 'info', '<b>怎麼判斷的</b><br>有「我的名字」與「被回饋者姓名」兩種姓名欄，並有 5 題 0～10 的評分，所以判斷是報告回饋。'), 10),
  act(btn('上一步', 'secondary'), btn('下一步：欄位對應', 'primary'))));

// ---- 2b 欄位對應（報告回饋）：顯示名稱可改、預覽格可改、沒用到的欄收到下方（R-011、R-036）
const cm = (a, b, use, st, need) => `<button class="rowbtn${need ? ' need' : ''}" type="button"><div><div class="nm">${a}</div><div class="sm">顯示為「${b}」<span aria-hidden="true">　✎</span></div></div><span class="rt">${tag(use, 'accent')}${st ? tag(st, 'warn') : ''}${ic('next')}</span></button>`;
F.push(mlong(880, '2b 欄位對應（報告回饋）｜依你的樣本結構：填寫者（我的名字、座號）與被評對象是兩組。欄位名稱可直接改（鉛筆 ✎）；沒用到的欄收到下方「沒有使用的欄」，隨時可加回；需確認的列加警示外框與「請確認」。',
  ...back('欄位對應', 2),
  scr(cm('我的名字', '填寫者', '填寫者') + cm('被回饋者姓名', '被評對象', '被評對象') + cm('她的座號', '被評對象座號', '座號', '請確認', true) + cm('她的書名', '書名', '書名', '請確認', true) + cm('簡報內容（充實度）：', '簡報內容（充實度）', '評分 0～10') + cm('台風', '台風', '評分 0～10') + cm('開放意見', '同學的具體回饋', '開放回饋') + `<details style="border:1px solid var(--line-soft);border-radius:var(--r-sm);background:var(--card);padding:0 12px"><summary style="min-height:48px;display:flex;align-items:center;font-weight:600">沒有使用的欄（3） · 仍看得到，隨時找回</summary></details>` + notice('warn', 'warn', '「書名」有 2 種寫法：「被討厭的勇氣」與「被討厭的勇氣（全新版）」。到「資料檢查」可合併。'), 8),
  act(btn('上一步', 'secondary'), btn('下一步：學生名單', 'primary'))));

// ---- 3a 匯入學生名單：同一班／混班兩個頁籤（R-012）
const lrow = (c, n, nm, st) => `<div style="display:grid;grid-template-columns:${c ? '64px ' : ''}40px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:var(--fs-sm)">${c ? `<span style="color:var(--ink3)">${c}</span>` : ''}<span>${n}</span><span>${nm}</span>${st ? tag(st, 'warn') : '<span></span>'}</div>`;
F.push(mframe('3a 匯入學生名單｜「同一班」「混班」兩個頁籤（R-012）。名單來源：貼上、開名單檔、用你存過的名單。明細固定欄位「班級、座號、姓名」，單班時班級用淡字（R-013）；預覽格可直接改。名單存在你自己保存的設定檔旁，不進瀏覽器儲存。',
  ...back('學生名單', 2),
  scr(seg(['同一班', '混班'], 0, '名單類型') + rcard('貼上名單', '一列一位：座號 姓名；沒有座號就自動補 1、2、3…', true) + rcard('開啟名單檔', 'xlsx 或 csv，要有座號與姓名欄', false) + `<div class="grp"><span class="gl">預覽（點格子可改） · 三年二班 44 人 · 1 組同名</span>${lrow('三年二班', 1, '林○○')}${lrow('三年二班', 2, '王○○')}${lrow('三年二班', 4, '陳○○', '同名，請確認')}${lrow('三年二班', 5, '陳○○', '同名，請確認')}</div>`, 10),
  act(btn('上一步', 'secondary'), btn('下一步：資料檢查', 'primary'))));

// ---- 3b 名單對照（未填）
F.push(mframe('3b 名單對照（未填）｜四個數字先看全貌；明細固定「班級、座號、姓名」三欄（R-013）。未填的人可「複製未填名單」貼進聊天或試算表。',
  ...back('名單對照', 2),
  scr(tiles([['已填', 39], ['沒填', 5, 'warn'], ['要確認', 3], ['重複', 2]]) + seg(['還沒填 5', '需要確認 3', '重複 2'], 0) + `<div class="grp"><span class="gl">還沒填的 5 位</span>${lrow('三年二班', 7, '周○○')}${lrow('三年二班', 12, '許○○')}${lrow('三年二班', 19, '蔡○○')}${lrow('三年二班', 23, '鄭○○')}${lrow('三年二班', 31, '謝○○')}</div>` + btn('複製未填名單', 'secondary', { block: true, icon: 'copy' }) + `<p class="small muted">複製的內容：「班級 座號 姓名」各一欄，可直接貼進聊天或試算表。</p>`, 10),
  act(btn('上一步', 'secondary'), btn('下一步：統計', 'primary'))));

// ---- W 量表與權重（R-014）
const wrow = (nm, v, st) => `<div style="display:grid;grid-template-columns:1fr 92px;gap:8px;align-items:center"><div><b>${nm}</b><div class="small muted">${st}</div></div><div style="display:flex;align-items:center;gap:4px"><input class="input" value="${v}" inputmode="decimal" aria-label="${nm}的權重" style="width:68px;text-align:right"><span>%</span></div></div>`;
F.push(mframe('W 量表與權重｜只有量表評分項目分權重，預設每項等重；手動改一項後其他項不動。合計不是 100% 時停用「下一步」並寫差多少，附「恢復等重」（R-014）。量表範圍支援 0～10 分（樣本是 0～10）。',
  ...back('量表與權重', 2),
  scr(seg(['1～5 分', '0～10 分', '自訂'], 1, '量表範圍') + wrow('簡報內容（充實度）', '20.0', '預設') + wrow('簡報設計', '20.0', '預設') + wrow('講述的內容', '20.0', '預設') + wrow('台風', '25.0', '手動調整') + wrow('時間控制', '20.0', '預設') + `<div style="display:flex;justify-content:space-between;font-weight:700"><span>合計</span><span style="color:var(--warn)">105.0 %</span></div>` + notice('warn', 'warn', '合計是 105.0%，<b>多了 5.0%</b>，請調整後再往下。', btn('恢復等重', 'secondary', { sm: true })), 12),
  act(btn('上一步', 'secondary'), btn('下一步：看統計', 'primary', { dis: true }))));

// ---- V1 票選名單（逐人勾選，R-015）
const vrow = (nm, sub, mark, on = true) => `<div style="display:flex;gap:10px;align-items:center;min-height:56px;padding:6px 10px;background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-sm)"><span class="chk" data-on="${on}">${ic('check')}</span><div style="flex:1;min-width:0"><b>${nm}</b><div class="small muted">${sub}</div></div>${mark}</div>`;
F.push(mframe('V1 票選名單（逐人勾選）｜名單每列一位同學；同一人投多次的展開各份勾選，預設沿用整類決定（只算最後一份）並標「N 位為手動調整」（R-015）。「投給誰」可在投影時隱藏，避免提前劇透（R-039）。',
  ...back('票選名單', 3),
  scr(seg(['同一人投多次 2', '自己投自己 3', '時間異常 1', '空白票 1'], 0, '檢查項目') + `<p class="small muted" style="margin:0">預設：只算最後一份。<b>2 位為手動調整</b>。</p><button class="tgl" role="switch" aria-checked="false" type="button"><span><b>投影時隱藏「投給誰」</b></span><span class="sw2"></span></button>` + vrow('趙○○（17 號）', '第 1 份 10:02 班長 林○○', tag('手動'), false) + vrow('趙○○（17 號）', '第 2 份 10:05 班長 陳○○', tag('手動')) + vrow('孫○○（8 號）', '2 份 · 預設只算最後一份', tag('多票')) + vrow('周○○（3 號）', '班長 林○○', tag('自己投自己', 'warn')) + vrow('吳○○（21 號）', '（空白）', tag('空白票', 'warn')), 8),
  act(btn('恢復整類預設', 'secondary'), btn('下一步：看結果', 'primary'))));

// ---- 唱票（定案 B：全部候選人同列，手機橫向）
const tcol = (nm, n, short) => `<div style="flex:1;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;padding:10px;background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);min-width:0"><b style="font-size:20px">${nm}</b><span style="font-size:64px;line-height:1;font-weight:700;font-variant-numeric:tabular-nums">${n}</span><button class="btn btn-primary" type="button" style="width:100%;min-height:64px;font-size:22px">+1 <span class="muted" style="color:inherit;opacity:.9">${short}</span></button></div>`;
F.push(mframeWH('唱票 投影唱票（定案：全部候選人同列，手機橫向）｜每個候選人一欄，唱到誰就在那一欄按「+1」，每唱一票對應 +1；候選人建議 6 人內。「退回一票」與「空白票 +1」另有按鈕（桌機 Ctrl+Z）。進度條與離開鍵在上方；手機請橫放。落選：單一候選人大字（A）。',
  844, 390, `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--card);border-bottom:1px solid var(--line-soft)"><b style="font-size:18px">班長唱票</b><span class="small">已唱 27／41 票</span><div class="prog" style="flex:1"><i style="width:66%"></i></div><button class="btn btn-secondary btn-sm" type="button">離開</button></div><div style="flex:1;display:flex;gap:8px;padding:10px 14px;min-height:0">${tcol('林○○', 12, '林')}${tcol('陳○○', 8, '陳')}${tcol('張○○', 5, '張')}${tcol('黃○○', 2, '黃')}</div><div class="actbar" style="padding:8px 14px;justify-content:space-between;align-items:center">${btn('退回一票', 'secondary', { sm: true, icon: 'undo' })}${btn('空白票 +1', 'secondary', { sm: true })}</div>`, 22));

// ---- 5d 量表題（圖表按鈕）與圖表勾選／換圖（R-017、R-018、R-024）
const bars = `<div class="grp">${brow('10 分', 14, 25)}${brow('9 分', 18, 32, 'lead')}${brow('8 分', 12, 21)}${brow('7 分以下', 12, 22)}</div>`;
const qhead = `<div class="pager"><button class="icbtn" type="button" aria-label="上一題">${ic('back')}</button><div class="c"><small>第 1 題 · 0～10 分 · 56 筆</small><b>簡報內容（充實度）</b></div><button class="icbtn" type="button" aria-label="下一題">${ic('next')}</button></div>`;
const statTiles = tiles([['平均', '8.4'], ['中位數', 9], ['標準差', '1.2']]);
const chartCard = `<div class="qcard"><div style="display:flex;align-items:center;gap:6px"><b style="flex:1">分數分布 · 堆疊橫條</b>${btn('換圖', 'ghost', { sm: true })}${btn('隱藏', 'ghost', { sm: true })}</div>${bars}</div>`;
F.push(mframe('5d 量表題｜先看平均、中位數、標準差，再看分數分布。每張圖右上有「換圖」「隱藏」；畫面頂端的「圖表」按鈕開勾選清單（R-017、R-018）。量表預設堆疊橫條。',
  ...back('統計：讀書報告回饋', 3, { brand: true }),
  scr(seg(['題目', '交叉', '留言'], 0) + qhead + `<div style="display:flex;gap:8px">${btn('圖表', 'secondary', { sm: true, icon: 'c-bar' })}${btn('重新讀取', 'secondary', { sm: true, icon: 'refresh' })}</div>` + statTiles + chartCard, 10),
  act(btn('上一步', 'secondary'), btn('下一步：輸出', 'primary'))));

const cpick = (ico, nm, sm, on) => `<button class="opt" role="checkbox" aria-checked="${on}" type="button" style="min-height:60px"><span class="chk" data-on="${on}">${ic('check')}</span><span style="color:var(--accent-ink)">${ic(ico)}</span><span style="display:flex;flex-direction:column;line-height:1.3;flex:1"><b>${nm}</b><span style="font-size:var(--fs-xs);color:var(--ink2);font-weight:400">${sm}</span></span></button>`;
F.push(mframe('5e 圖表勾選與換圖｜點「圖表」開底部面板：只列出適用於「量表題」的圖，每項有縮圖圖示與一句用途，勾選決定這題顯示哪些圖（R-017、R-018）。選擇存在設定，不含資料；單一學生的圖表可在審稿頁覆寫（R-024）。',
  ...back('統計：讀書報告回饋', 3, { brand: true }),
  scr(seg(['題目', '交叉', '留言'], 0) + qhead + statTiles + chartCard, 10),
  act(btn('上一步', 'secondary'), btn('下一步：輸出', 'primary')),
  sheet('這題要顯示的圖', '只列出適用於「量表題」的圖。', cpick('c-stack', '堆疊橫條', '各分數各占多少', true) + cpick('c-hist', '直方圖', '分數集中在哪一段', true) + cpick('c-box', '盒鬚圖', '中間範圍與極端值', false) + cpick('c-dots', '圓點圖', '比較許多項目', false), btn('完成', 'primary', { block: true }))));

// ---- 圖表圖庫（十一種，R-017）
const gal = (ico, nm, sm, def) => `<div class="qcard" style="padding:10px 12px;gap:4px;flex-direction:row;align-items:center"><span style="color:var(--accent-ink)">${ic(ico)}</span><div style="flex:1;min-width:0"><b>${nm}</b> ${def ? tag(def, 'accent') : ''}<div class="small muted">${sm}</div></div></div>`;
F.push(mlong(950, 'Gal 圖表圖庫（十一種）｜新增七種（圓環／圓餅、堆疊橫條、直方圖、雷達圖、散布圖、盒鬚圖、圓點圖）；每種附一句用途，藍色標籤是該種統計的預設圖。不做儀表板：每個統計畫面有「圖表」按鈕勾要顯示的圖（R-017、R-018、R-024、R-029）。',
  mbar('圖表圖庫', {}),
  scr(`<div class="grp" style="gap:6px">${gal('c-bar', '長條圖', '誰得最多票、哪個選項最多', '票選預設')}${gal('c-stack', '堆疊橫條', '一題各分數各占多少', '量表預設')}${gal('c-diff', '對照條', '每位同學跟班均差多少', '報告回饋預設')}${gal('trend', '折線圖', '同一班多次問卷的變化', '趨勢預設')}${gal('c-heat', '熱圖', '兩個題目交叉後哪格人多', '交叉預設')}${gal('c-donut', '圓環／圓餅', '各選項占整體幾成（少於 6 個）')}${gal('c-hist', '直方圖', '分數集中在哪一段')}${gal('c-radar', '雷達圖', '一位同學五個項目的強弱')}${gal('c-scatter', '散布圖', '兩題的分數有沒有一起變高')}${gal('c-box', '盒鬚圖', '分數的中間範圍與極端值')}${gal('c-dots', '圓點圖', '用點比較許多項目，比長條更清爽')}</div>`, 8)));

// ---- 圖表另存圖片（R-038：JPG、4800px）
F.push(mframe('Save 圖表另存圖片｜格式加了 JPG；大小加到寬度 4800px（現有 1200、2400）。JPG 不支援透明，背景固定白底。手機輸出大圖可能較慢，4800px 約 9 MB，提示會多花幾秒。',
  ...back('統計：讀書報告回饋', 3, { brand: true }),
  scr(seg(['題目', '交叉', '留言'], 0) + qhead + chartCard, 10),
  act(btn('上一步', 'secondary'), btn('下一步：輸出', 'primary')),
  sheet('另存圖表', '「簡報內容（充實度）」的分數分布', `<div class="grp"><span class="gl">格式</span>${seg(['PNG 圖片', 'JPG 圖片', 'SVG 向量'], 1, '格式')}<span class="gl">大小</span>${seg(['1200px', '2400px', '4800px'], 2, '大小')}<span class="gl">背景</span>${seg(['白底', '透明'], 0, '背景')}</div><p class="small muted">JPG 不支援透明，背景固定白底。4800px 約 9 MB，存檔會多花幾秒。</p>`, btn('另存', 'primary', { block: true }) + btn('取消', 'secondary', { block: true }))));

// ---- 5h 報告回饋清單（R-016）：班均註明已計入組數；最後一列「平均」
const rk = (n, nm, v, sub, tg) => `<button class="rowbtn" type="button" style="min-height:64px"><div><div class="nm">${n} ${nm}</div><div class="sm">${sub}</div></div><span class="rt"><b style="font-size:var(--fs-lg)">${v}</b>${tg || ''}${ic('next')}</span></button>`;
F.push(mframe('5h 報告回饋：被評對象清單｜以被評對象為單位，依平均排序。班均一律寫成「班均（已計入 6 組／共 8 組）」（R-016）；資料不齊時上方提示「排名可能改變」；最後一列是「平均」（小數一位）。',
  ...back('統計：報告回饋', 3, { brand: true }),
  scr(notice('warn', 'warn', '還有 2 組沒填，<b>排名可能改變</b>。') + seg(['依平均', '依一致性'], 0, '排序') + rk(1, '林○○', '8.9', '《小王子》 · 42 位回饋') + rk(2, '張○○', '8.6', '《被討厭的勇氣》 · 42 位回饋') + rk(3, '陳○○', '8.4', '38 位回饋', tag('一致性低', 'warn')) + rk(4, '黃○○', '8.1', '40 位回饋') + `<div style="display:flex;justify-content:space-between;padding:10px 12px;background:var(--sunk);border-radius:var(--r-sm);font-weight:700"><span>班均（已計入 6 組／共 8 組）</span><span>8.3</span></div>`, 8),
  act(btn('上一步', 'secondary'), btn('下一步：審稿', 'primary'))));

// ---- E6 重新讀取後的統計（累積，邊界條件 3）
F.push(mframe('E6 重新讀取後的統計（累積）｜再讀到新回覆時，統計用「全部累積」，頂端寫「比上次多 12 筆」，並可切換「只看新增」。已認得這份問卷，欄位對應來自設定檔（邊界條件 3）。',
  ...back('統計：讀書報告回饋', 3, { brand: true }),
  scr(notice('', 'info', '<b>比上次多 12 筆。</b>上次讀取是 10/28 10:42（44 筆）。統計已包含新回覆；排名可能有變化。') + seg(['全部累積 56 筆', '只看新增 12 筆'], 0, '範圍') + qhead + statTiles + bars + `<p class="small muted" style="margin:0">這次讀取：來源 Google 試算表 · 今天 14:05 · 回覆 56 筆（新增 12 筆）。已認得這份問卷。</p>`, 10),
  act(btn('上一步', 'secondary'), btn('下一步：輸出', 'primary'))));

write('frag-b32.html', F);
console.log('b32', F.length);
