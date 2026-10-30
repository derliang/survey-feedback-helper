import * as W from './wide.mjs';
const { L, miniPaper, frameWH, tbar, pane, flex1, body, foot, kbd, fchip, h, qrow, nvr, tgl, card, table, cmt, cmpbar, addPages, voteBars, vote } = W;
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, grp, brow, write } = L;
const TW = 820, TH = 1000;
const T = (cap, step, title, inner) => frameWH(cap, TW, TH, `${tbar(step, title)}${inner}`);
const F = [];
const sc = (s) => ` aria-current="true"`;
const side = (inner) => pane(270, inner, 'padding:12px;border-right:1px solid var(--line-soft)');
const main = (inner) => flex1(inner, 'padding:20px;overflow:hidden');
const backNext = (n = '下一步：看統計') => foot(btn('上一步', 'secondary'), btn(n, 'primary'));

// 1 開啟
F.push(T('T1 平板：開啟問卷｜觸控為主，不依賴拖放；三個來源是大按鈕，下方列最近的專案與示範資料。內容限寬置中，避免橫向拉太長。', 1, '開啟問卷',
  `<div style="flex:1;min-height:0;display:flex;justify-content:center;padding:32px 20px;overflow:hidden"><div style="width:560px;display:flex;flex-direction:column;gap:16px">${h('開啟問卷檔', '支援 Google 表單匯出的 xlsx 或 csv。')}<button class="picker" type="button"><span class="big">${ic('file')}</span><b>選擇這台平板的檔案</b><small>系統選檔視窗也看得到 Google 雲端硬碟</small></button>${rowbtn('從 Google 雲端硬碟', '連線後可直接選檔', '', false, true)}${rowbtn('開啟專案檔', '還原欄位對應與設定', '', false, true)}${grp('最近的專案', rowbtn('三年二班 幹部票選', '10/28 · 票選幹部', '', false, true) + rowbtn('小組報告 評分', '10/12 · 報告回饋', '', false, true))}${notice('', 'lock', '資料只在這個瀏覽器處理，不會上傳，關閉頁面就清除。')}${btn('用示範資料試試看', 'secondary', { block: true })}</div></div>`));

// 2 準備資料
const maprow = (a, b, cur) => `<div style="display:flex;align-items:center;gap:10px;min-height:52px;padding:0 12px;border-radius:var(--r-sm);${cur ? 'background:var(--accent-soft)' : ''}"><span class="mono" style="width:6.5em">${a}</span><span style="color:var(--ink3)">${ic('next')}</span><div class="input" style="flex:1;min-height:44px;display:flex;align-items:center;padding:0 12px">${b}</div></div>`;
F.push(T('T2 平板：準備資料｜左右分欄：左邊四件事（問卷類型、欄位對應、學生名單、資料檢查）與狀態，右邊是目前選的那件事的內容，不用來回換頁。', 2, '準備資料',
  `${body(side(`<div class="small muted" style="font-weight:700">四件事</div>${rowbtn('問卷類型', '票選幹部', tag('已確認', 'ok'))}${rowbtn('欄位對應', '8 個欄位', tag('請確認', 'warn'), true)}${rowbtn('學生名單', '選用', tag('選用'))}${rowbtn('資料檢查', '3 項待處理', tag('請處理', 'warn'))}`), main(`${h('欄位對應', '系統已猜好，不對的才需要改。')}${[['時間戳記', '時間戳記'], ['班級', '班級'], ['座號', '座號'], ['姓名', '姓名'], ['班長', '班長（票選）'], ['副班長', '副班長（票選）'], ['風紀股長', '風紀股長（票選）'], ['衛生股長', '衛生股長（票選）']].map((c, i) => maprow(c[0], c[1], i === 4)).join('')}${notice('ok', 'check', '8 個欄位都已對應。')}`))}${backNext()}`));

// 3 資料檢查
F.push(T('T3 平板：資料檢查｜左邊類別與數量，右邊明細。重複填答兩份並排，選項橫排為三張卡片，手指好點。', 2, '資料檢查',
  `${body(side(`<div class="small muted" style="font-weight:700">檢查項目</div>${nvr('重複填答', true, tag('1', 'warn'))}${nvr('時間異常', false, tag('2', 'ok'))}${nvr('格式異常', false, tag('0', 'ok'))}${nvr('空白', false, tag('1', 'ok'))}${nvr('名單對照', false, tag('3', 'warn'))}`), main(`${h('重複填答：1 位同學', '趙子安（17 號）交了 2 份，請決定怎麼算。')}${table(['項目', '第一份 10:12', '第二份 10:31'], [['班長', '陳怡安', '<b>林小宇</b>'], ['副班長', '王品妍', '王品妍'], ['風紀股長', '蔡佳穎', '蔡佳穎'], ['衛生股長', '劉承恩', '劉承恩']])}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${rcard('只算最後一份', '預設', true)}${rcard('只算第一份', '', false)}${rcard('兩份都不算', '', false)}</div>${tiles([['收到', 42], ['納入', 41], ['排除', 1, 'warn']])}`))}${backNext()}`));

// 4 票選統計
F.push(T('T4 平板：票選統計｜左邊職位清單、右邊該職位的結果；分段控制切換「結果／防弊／唱票」。同票用警示色並提示抽籤。', 3, '統計結果',
  `${body(side(`<div class="small muted" style="font-weight:700">職位</div>${nvr('班長', true, tag('林小宇', 'ok'))}${nvr('副班長', false, tag('王品妍', 'ok'))}${nvr('風紀股長', false, tag('周冠宇', 'ok'))}${nvr('衛生股長', false, tag('劉承恩', 'ok'))}`), main(`${seg(['結果', '防弊', '唱票'], 0)}${h('班長', '有效票 40 張，空白 1 張')}${tiles([['當選', '林小宇'], ['得票', '18'], ['候補', '陳怡安']])}${card(voteBars())}${notice('', 'info', '副班長第 2 名同票，已用抽籤決定候補。種子 20261012-3A7F 寫進計票明細。')}`))}${backNext('下一步：輸出')}`));

// 5 報告回饋
const rk = [['1', '第 6 組　在地小吃', '86.0'], ['2', '第 1 組　水資源', '85.2'], ['3', '第 3 組　垃圾減量', '81.9'], ['6', '第 2 組　校園植物', '76.9'], ['8', '第 4 組　交通安全', '72.7']];
F.push(T('T5 平板：報告回饋｜左邊排名清單（可切換排序、一致性），右邊該組詳情：總分、自評、班均與四個規準的對照條。', 3, '統計結果',
  `${body(side(`${seg(['排名', '落差', '一致性'], 0)}${rk.map(([n, nm, s], i) => qrow(`<span style="width:1.4em;color:var(--ink3)">${n}</span><span style="flex:1">${nm}</span><b>${s}</b>`, i === 1)).join('')}`), main(`${h('第 1 組　水資源')}<div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px"><div class="tile" style="background:var(--accent-soft);border-color:transparent"><div class="l" style="color:var(--accent-ink)">加權總分</div><div class="n" style="color:var(--accent-ink)">85.2</div></div>${tile('自評', '87.2')}${tile('班均', '79.8')}</div><div class="small muted">藍條：同學給分　黃虛線：班均　黑線：自評</div>${card(cmpbar('內容完整 · 30%', 4.3, 4.0, 4.5), cmpbar('創意 · 25%', 4.0, 3.8, 4.2), cmpbar('表達 · 25%', 4.2, 3.9, 4.0), cmpbar('團隊合作 · 20%', 4.6, 4.2, 4.8))}${rowbtn('留言 5 則', '優點 3、建議 2，等老師審稿', tag('待審稿', 'warn'))}`))}${backNext('下一步：輸出')}`));

// 6 歷次趨勢
const X = [70, 380, 690], Y = (v) => 230 - ((v - 3) / 2) * 190;
const lines = [['活動內容有趣', [3.9, 4.1, 4.37], 'var(--d1)'], ['老師說明清楚', [4.3, 4.4, 4.46], 'var(--d2)'], ['活動場地舒適', [3.8, 3.6, 3.44], 'var(--d3)']];
const svg = `<svg viewBox="0 0 780 270" style="width:100%;height:auto" role="img" aria-label="三次問卷的平均分數變化">${[3, 3.5, 4, 4.5, 5].map((g) => `<line x1="50" x2="740" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--line-soft)"/><text x="42" y="${Y(g) + 4}" text-anchor="end" font-size="13" fill="var(--ink3)">${g}</text>`).join('')}${['8/30 開學', '9/20', '10/12 期中'].map((t, i) => `<text x="${X[i]}" y="262" text-anchor="middle" font-size="14" fill="var(--ink2)">${t}</text>`).join('')}${lines.map(([n, v, c]) => `<polyline fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" points="${v.map((y, i) => `${X[i]},${Y(y)}`).join(' ')}"/>${v.map((y, i) => `<circle cx="${X[i]}" cy="${Y(y)}" r="${i === 2 ? 6 : 4.5}" fill="${c}"/>`).join('')}<text x="${X[2] + 12}" y="${Y(v[2]) + 5}" font-size="14" font-weight="700" fill="var(--ink)">${v[2].toFixed(2)}</text>`).join('')}</svg>`;
F.push(T('T6 平板：歷次趨勢｜折線在線尾標分數，不靠圖例對色；下方表格列出變化與方向，下降用文字說明並警示連續下降。', 3, '歷次趨勢',
  `${body(main(`${fchip('trend', '三年二班　3 次問卷', '8/30 開學、9/20、10/12 期中')}${card(svg)}${table(['題目', '8/30', '9/20', '10/12', '變化'], lines.map(([n, v]) => [n, v[0].toFixed(1), v[1].toFixed(1), v[2].toFixed(2), tag(v[2] >= v[0] ? '上升' : '下降', v[2] >= v[0] ? 'ok' : 'warn')]))}${notice('warn', 'warn', '「活動場地舒適」連續兩次下降，從 3.8 降到 3.44。')}`))}${backNext('下一步：輸出')}`));

// 7 審稿
F.push(T('T7 平板：老師審稿｜左邊學生清單看得到誰審完，右邊留言逐則處理；右上「預覽」打開學生版預覽（橫向時改為三欄）。', 4, '老師審稿',
  `${body(side(`<div class="small muted" style="font-weight:700">學生（待審 5／41）</div>${[['5', '周宜靜', '完成'], ['6', '林小宇', '待審'], ['7', '陳怡安', '待審'], ['8', '張子豪', '完成'], ['9', '黃思穎', '完成'], ['10', '王品妍', '待審']].map(([n, nm, s], i) => qrow(`<span style="width:1.6em;color:var(--ink3)">${n}</span><span style="flex:1">${nm}</span>${tag(s, s === '完成' ? 'ok' : 'warn')}`, i === 1)).join('')}`), main(`<div style="display:flex;align-items:center">${h('林小宇（6 號）', '2 則待審')}<span style="margin-left:auto">${btn('預覽學生版', 'secondary', { sm: true, icon: 'file' })}</span></div>${tiles([['待審', 2, 'warn'], ['採用', 2], ['隱藏', 1]])}${cmt('報告條理清楚，圖表很好懂。', '優點', '採用')}${cmt('他講話有點笨拙，但是很認真。', '建議', '', true)}`))}${foot(btn('上一位', 'secondary'), btn('下一位', 'primary'))}`));

// 8 輸出
F.push(T('T8 平板：輸出｜左邊設定、右邊目前學生的即時預覽，可上一位下一位切換；底部「產生並下載」。', 4, '輸出',
  `${body(pane(300, `${h('輸出設定')}<div class="grp"><span class="gl">格式</span>${seg(['Excel', 'Word', 'PDF'], 2, '格式')}</div><div class="grp"><span class="gl">給誰看</span>${chips(['教師版', '學生版', '家長版'], 1)}</div><div class="grp"><span class="gl">範圍</span>${chips(['全班 41 人', '選擇學生'], 0)}</div><div class="field"><label for="tn">檔名規則</label><input class="input mono" id="tn" value="{班級}_{座號}_{姓名}_回饋單"></div><div style="background:var(--sunk);border-radius:var(--r-md);padding:12px 14px;font-size:var(--fs-sm)">將產生 <b>41 個 PDF</b>，打包成 1 個 zip，約 3.3 MB。</div>`, 'padding:16px;border-right:1px solid var(--line-soft);background:var(--card)'), flex1(`<div style="display:flex;justify-content:center;align-items:center;gap:8px"><button class="icbtn" type="button" aria-label="上一位">${ic('back')}</button><b>林小宇（6 號）</b><span class="small muted">6／41</span><button class="icbtn" type="button" aria-label="下一位">${ic('next')}</button></div><div style="display:grid;place-items:start center;overflow:hidden">${miniPaper(0.55)}</div>`, 'padding:12px;background:var(--sunk);overflow:hidden'))}${foot(btn('上一步', 'secondary'), btn('產生並下載', 'primary'))}`));

// 9 設定與範本
const tcard = (nm, sm, mine) => `<div class="qcard" style="gap:10px;padding:12px"><div style="display:grid;place-items:center;background:var(--sunk);border-radius:var(--r-sm);padding:10px;height:176px;overflow:hidden">${miniPaper(0.2)}</div><div style="display:flex;gap:6px;align-items:center"><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</b>${tag(mine ? '我的' : '內建', mine ? 'accent' : '')}</div><div class="small muted">${sm}</div><div style="display:flex;gap:6px">${btn('套用', 'primary', { sm: true })}${btn(mine ? '編輯' : '複製後編輯', 'secondary', { sm: true })}</div></div>`;
F.push(T('T9 平板：設定與範本庫｜左側設定分組、右側範本縮圖卡片兩欄。套用、編輯、複製放在卡片上。', 4, '設定',
  `${body(pane(220, `${['全域預設', '版面範本', '檔名規則', '關鍵字提醒', '備份與還原', '外觀', '隱私與關於'].map((t, i) => nvr(t, i === 1)).join('')}`, 'padding:12px;border-right:1px solid var(--line-soft)'), main(`<div style="display:flex;align-items:center;gap:12px">${h('版面範本', '只有版面與文字，不含學生資料。')}<div style="margin-left:auto;display:flex;gap:8px">${btn('匯入', 'secondary', { icon: 'down-arrow', sm: true })}${btn('新增', 'primary', { icon: 'plus', sm: true })}</div></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">${tcard('三年二班 學生版', '改自個人回饋單 · 2 頁', true)}${tcard('小組報告 評分表', '改自班級總表 · 1 頁', true)}${tcard('個人回饋單：學生版', '內建 · 2 頁', false)}${tcard('個人回饋單：家長版', '內建 · 1 頁', false)}</div>`))}`));

// 10 Google 雲端硬碟
const dr = (t, list) => `<div class="qcard" style="gap:6px"><b>${t}</b>${list.map((x) => `<div class="small" style="display:flex;gap:8px">${ic(x[0])}<span>${x[1]}</span></div>`).join('')}</div>`;
F.push(T('T10 平板：Google 雲端硬碟連線｜與手機同一套說明：可以做什麼、不能做什麼，並提供不登入的替代路徑。限寬置中。', 1, 'Google 雲端硬碟',
  `<div style="flex:1;min-height:0;display:flex;justify-content:center;padding:32px 20px;overflow:hidden"><div style="width:560px;display:flex;flex-direction:column;gap:14px">${h('連線後可以直接選檔、存檔', '不連線也能用：選「這台平板的檔案」，系統選檔視窗本來就看得到雲端硬碟。')}${dr('這個網站可以', [['check', '開啟你在選檔視窗點選的檔案'], ['check', '把輸出檔存進你指定的位置']])}${dr('這個網站不能', [['x', '看到或改動你雲端硬碟裡其他檔案'], ['x', '看到你的信箱或聯絡人'], ['x', '在你不知道時存取任何檔案']])}${notice('', 'lock', '資料仍然只在你的瀏覽器處理，不經過任何伺服器。可以隨時在 Google 帳戶「第三方存取」撤銷。')}<div style="display:flex;gap:8px">${btn('不連線，用平板檔案', 'secondary', { style: 'flex:1' })}${btn('連線 Google', 'primary', { style: 'flex:1' })}</div></div></div>`));

// 11 投影唱票（橫向）
const kb = (t) => kbd(t);
F.push(frameWH('T11 平板橫向：投影唱票｜1024×768。平板接投影或直接給全班看。姓名與票數極大，「下一票」整排最大的按鈕；也可用螢幕右側的大區塊點一下加一票。', 1024, 768,
  `<div style="flex:1;min-height:0;display:flex;flex-direction:column;padding:24px 40px;gap:6px;background:var(--paper)"><div style="display:flex;align-items:center"><span class="small muted" style="font-size:var(--fs-lg)">班長 · 第 1 位候選人／共 4 位</span><span style="margin-left:auto">${icbtn('x', '離開唱票模式')}</span></div><div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:88px;font-weight:800;line-height:1.2;letter-spacing:.04em">林小宇</div><div class="mono" style="font-size:220px;font-weight:800;line-height:1;color:var(--accent);font-variant-numeric:tabular-nums">11</div><div style="font-size:40px;font-weight:700;color:var(--ink2)">票</div></div><div style="display:flex;align-items:center;gap:16px"><div class="prog" style="flex:1" role="progressbar" aria-valuenow="27" aria-valuemin="0" aria-valuemax="100"><i style="width:27%"></i></div><span class="small muted">已唱 11／40 張有效票</span></div><div style="display:flex;gap:12px;padding-top:8px">${btn('上一位', 'secondary', { style: 'min-width:150px;height:72px;font-size:var(--fs-lg)' })}${btn('下一票　＋1', 'primary', { style: 'flex:1;height:72px;font-size:var(--fs-xl)' })}${btn('唱完了', 'secondary', { style: 'min-width:150px;height:72px;font-size:var(--fs-lg)' })}</div></div>`, 12));

// 12 離開確認
F.push(T('T12 平板：離開前確認｜關閉頁面或回到首頁前，說明「資料不保存」，主動作是「先輸出」；對話框置中、寬 480。', 3, '統計結果',
  `${body(side(`<div class="small muted" style="font-weight:700">職位</div>${nvr('班長', true)}${nvr('副班長')}${nvr('風紀股長')}${nvr('衛生股長')}`), main(`${seg(['結果', '防弊', '唱票'], 0)}${h('班長')}${card(voteBars())}`))}<div class="scrim"></div><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:480px;background:var(--card);border-radius:var(--r-lg);padding:24px;display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 40px var(--shadow-sm)"><h2 style="margin:0;font-size:var(--fs-xl)">要離開嗎？</h2><p style="margin:0;line-height:1.7">問卷資料不會保存，離開後要重新開啟檔案。要留下結果，請先輸出。</p><div style="display:flex;flex-direction:column;gap:8px">${btn('先輸出', 'primary', { block: true })}${btn('直接離開', 'secondary', { block: true })}${btn('取消', 'ghost', { block: true })}</div></div>`));

write('frag-b14.html', F);
addPages({ id: 'flow-tablet', short: '平板：全部流程', name: '平板-全部流程', title: '平板（820 直向）：開啟到輸出、設定、雲端硬碟、離開確認；橫向投影唱票', intro: '平板每一步都用左右分欄；觸控點擊區不低於 44px。與手機、桌機共用同一套 token 與元件。', frag: 'frag-b14.html' });
console.log(F.length);
