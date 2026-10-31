// 桌機補完 D：雲端硬碟、票選防弊與統計設定、系統與狀態（D44–D56）
import * as K from './deskkit.mjs';
const { W, L, prow, psub, guardList, chartHead, frameWH, D, side, main, rside, nav, modal, mhead, mfoot, prog, round, centered, rail, fbox, bgOpen, h, th, td, nvr, tgl, body, pane, flex1, foot, fchip, kbd, tag, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, ic, icbtn, grp, brow, addPages, write, field } = K;
const F = [];
const setNav = (cur) => pane(240, ['全域預設', '版面範本', '檔名規則', '關鍵字提醒', 'Google 雲端硬碟', '備份與還原', '外觀', '隱私與關於'].map((t, i) => nvr(t, i === cur)).join(''), 'padding:12px;border-right:1px solid var(--line-soft)');
const qList = (cur) => `${rail('題目')}${['1 老師說明清楚', '2 活動內容有趣', '3 分組讓我有機會表達', '4 願意推薦給其他班', '5 活動時間太趕', '6 活動場地舒適'].map((t, i) => nvr(t, i === cur)).join('')}`;
const scaleBase = () => body(side(260, qList(1)), main(`${h('第 2 題 ／ 9 · 量表', '活動內容有趣')}${tiles([['平均', '4.37'], ['中位數', 4], ['標準差', '0.74'], ['4–5 分', '86%']])}<div class="qcard" style="gap:12px">${brow('5 非常同意', 22, 54, 'lead')}${brow('4 同意', 13, 32)}${brow('3 普通', 5, 12)}${brow('2 不同意', 1, 2)}</div>`), rside(300, `${h('設定')}${tgl('排除重複填答', '已排除 1 份', true)}`));
const guardTabs = (cur) => `${rail('檢查項目')}${nvr('同一人投多次', cur === 0, tag('請處理', 'warn'))}${nvr('自己投自己', cur === 1, tag('已決定', 'ok'))}${nvr('時間異常', cur === 2, tag('已決定', 'ok'))}${nvr('空白票', cur === 3, tag('已決定', 'ok'))}`;

// D44 雲端選檔
const gf = (nm, sub, on) => `<div class="qrow"${on ? ' aria-current="true"' : ''} style="min-height:56px"><span style="color:var(--accent-ink)">${ic('file')}</span><div style="flex:1"><div>${nm}</div><div class="small muted" style="font-weight:400">${sub}</div></div></div>`;
F.push(D('D44 桌機：從雲端硬碟選檔（登入後的選檔視窗）｜Google 試算表不能直接當 xlsx 讀，選到時說明「會先轉成 xlsx 再讀」，原檔不會被改動。選檔視窗是 Google 提供的，只能看到你點選的檔案。', 1,
  `${bgOpen()}${modal(720, `${mhead('從雲端硬碟選擇')}<div class="field"><input class="input" value="" placeholder="搜尋"></div><div style="display:flex;flex-direction:column;gap:4px">${gf('114下 幹部票選（回覆）', 'Google 試算表 · 今天 10:42', true)}${gf('113下 幹部票選.xlsx', 'Excel 檔 · 去年', false)}</div>${notice('', 'info', '「Google 試算表」會先轉成 xlsx 再讀取，不會改到你的原檔。')}<div class="small muted">已選：114下 幹部票選（回覆）　轉換中…約需幾秒鐘</div>${mfoot(btn('取消', 'secondary'), btn('讀取這個檔案', 'primary'))}`)}`, ''));

// D45 配額用完
F.push(D('D45 桌機：Google 連線無法使用｜配額與費用的說法查證前先收斂，不保證何時恢復，也不談費用；直接給不用登入的替代做法。', 1,
  `${body(main(`${centered(600, `${notice('warn', 'warn', '<b>目前無法使用 Google 連線，請改用本機檔案。</b>')}${h('現在可以這樣做')}<ol style="margin:0;padding-left:1.2em;line-height:1.9"><li>回到「開啟」，選這台電腦的 Excel 檔。</li><li>Google 試算表請先下載成 Excel 檔。</li></ol>${notice('ok', 'check', '已讀取的資料與設定都還在，不用重做。')}<div style="display:flex;gap:8px">${btn('稍後再試', 'secondary')}${btn('改用本機檔案', 'primary')}</div>`)}`, 'justify-content:center'))}`, ''));

// D46 已連線設定
F.push(D('D46 桌機：雲端硬碟已連線設定｜顯示連線的帳號與權限範圍，隨時可中斷。中斷只是這個網站忘記連線，不會刪任何檔案；也教老師怎麼到 Google 帳戶撤銷。', 4,
  `${body(setNav(4), main(`${h('Google 雲端硬碟', '已連線')}${fbox(`<div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:center;gap:8px"><b>wang.teacher@school.example.tw</b>${tag('已連線', 'ok')}</div><div class="small muted">權限範圍：僅限你選的檔案與本網站建立的檔案</div><div class="small muted">輸出預設位置：雲端硬碟／回饋小幫手</div></div>`)}${tgl('輸出完成後自動存一份', '輸出檔另存到上面的位置', true)}<div>${btn('中斷連線', 'secondary', { style: 'color:var(--bad);border-color:var(--bad)' })}</div>`), rside(320, `${h('怎麼撤銷')}<p class="small" style="margin:0;line-height:1.8">中斷連線不會刪任何檔案。若要徹底撤銷，請到 Google 帳戶的「第三方存取」。</p>${notice('', 'lock', '這個網站只能存取你選的檔案與它自己建立的檔案。')}`))}${nav('完成', '返回')}`));

// D47 防弊檢查總覽
F.push(D('D47 桌機：票選防弊檢查｜多票、自投、時間異常、空白票都有名單，每列一位同學。預設沿用整類決定，可全選、全不選或逐人勾選，例外標「手動調整」。系統只列出可疑，由老師決定；名單顯示投給誰，投影時隱藏。', 3,
  `${body(side(260, guardTabs(1)), main(`${tiles([['收到', 42], ['已決定', 3], ['待處理', 1, 'warn']])}${guardList(h('自己投自己：3 人', '勾選的計入。班級選舉可投自己，預設計入。'), [prow(true, '三年二班', 6, '林小宇', '班長投 林小宇'), prow(true, '三年二班', 12, '陳怡安', '副班長投 陳怡安'), prow(false, '三年二班', 21, '張語彤', '班長投 張語彤', tag('手動調整', 'accent'))], 1)}${notice('', 'info', '投影唱票時，這份名單與投給誰都不會出現。')}`), rside(320, `${h('為什麼要防弊')}<p class="small" style="margin:0;line-height:1.8">票選容易有重複送出或亂按的情況。系統不會自己刪票，只把可疑的列出來給你判斷。</p>${notice('', 'info', '處理的決定會寫進「計票明細」。全部決定後，才能看正式結果。')}`))}${nav('下一步：看結果')}`));

// D48 同人多票
F.push(D('D48 桌機：同人多票（展開逐份勾選）｜取代原本的處理對話框。名單每列一位同學，多票的人可以展開，逐份勾選要算哪一份；預設「只算最後一份」並寫明理由。', 3,
  `${body(side(260, guardTabs(0)), main(`${tiles([['收到', 42], ['已決定', 3], ['待處理', 1, 'warn']])}${guardList(h('同一人投了多次：1 位', '預設只算最後一份，因為同學重送通常是改變心意。'), [prow(false, '三年二班', 17, '趙子安', '2 份，班長投的人不同', tag('請處理', 'warn')), psub(false, '10:12 · 第一份', '班長 陳怡安 · 副班長 王品妍'), psub(true, '10:31 · 第二份', '班長 林小宇 · 副班長 王品妍', tag('預設')) ], 0)}${notice('', 'info', '兩份都不勾，就是兩份都不算。')}`), rside(320, `${h('怎麼決定')}<p class="small" style="margin:0;line-height:1.8">你選的處理會寫進「統計方法說明」，之後可以重現同樣的結果。</p>`))}${nav('下一步：看結果')}`));

// D49 計票規則
F.push(D('D49 桌機：計票規則｜幾條規則用開關與分段控制呈現，說清楚影響什麼。右側即時預覽改了規則後的結果，改完統計與計票明細會立刻重新計算。', 3,
  `${body(main(`${h('計票規則')}${tgl('每人每職位限投一票', '同職位投 2 人的整份該職位視為無效', true)}${tgl('自己投自己計入', '班級選舉預設計入；關閉後自投不計', true)}${tgl('排除時間異常的回覆', '預設只標示、保留，不影響票數', false)}${grp('候補名額', seg(['0 人', '1 人', '2 人'], 1, '候補名額'))}${grp('同票時', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${rcard('抽籤決定', '記錄隨機種子，可重現', true)}${rcard('由老師手動指定', '不抽籤，自己選', false)}</div>`)}`), rside(340, `${h('目前的結果', '改規則後立刻更新')}${brow('林小宇', 18, 45, 'lead', tag('當選', 'ok'))}${brow('陳怡安', 12, 30, '', tag('候補', 'accent'))}${brow('張子豪', 6, 15)}${notice('', 'info', '這裡是整類預設，防弊名單的逐人勾選是例外。目前 1 位為手動調整。')}`))}${nav('完成')}`));

// D50 圖表另存圖片
F.push(D('D50 桌機：圖表另存圖片｜每張圖表可另存成圖片，放進簡報或通知。預設白底（印刷與投影都清楚）、含標題與題目；透明背景給進階使用。', 3,
  `${scaleBase()}${nav('下一步：輸出')}${modal(600, `${mhead('另存圖表')}<span class="muted">「活動內容有趣」的分布圖</span><div style="display:flex;gap:16px"><div style="flex:1;display:flex;flex-direction:column;gap:12px">${grp('格式', seg(['PNG 圖片', 'SVG 向量'], 0, '格式'))}${grp('大小', seg(['一般 1200px', '清晰 2400px'], 0, '大小'))}${grp('背景', seg(['白底', '透明'], 0, '背景'))}${tgl('含標題與題目', '', true)}</div><div class="qcard" style="width:240px;gap:8px"><b>活動內容有趣</b>${brow('5 非常同意', 22, 54, 'lead')}${brow('4 同意', 13, 32)}${brow('3 普通', 5, 12)}</div></div>${mfoot(btn('取消', 'secondary'), btn('下載圖片', 'primary', { icon: 'down-arrow' }))}`)}`));

// D51 安裝為應用程式
const stp = (n, t) => `<div style="display:flex;gap:12px;align-items:flex-start"><span style="width:28px;height:28px;border-radius:50%;background:var(--accent-soft);color:var(--accent-ink);display:grid;place-items:center;font-weight:700;flex:none">${n}</span><span style="line-height:1.7;padding-top:2px">${t}</span></div>`;
F.push(D('D51 桌機：安裝為應用程式｜安裝不是必要，只是桌面有圖示、獨立視窗、沒有網路也能用。分 Chrome／Edge 與 Safari（Mac）兩組步驟；步驟有先後，所以用編號。', 1,
  `${bgOpen()}${modal(620, `${mhead('安裝到這台電腦')}<span class="muted">好處：桌面有圖示、獨立視窗開啟、沒有網路也能用。</span>${seg(['Chrome／Edge', 'Safari（Mac）'], 0, '瀏覽器')}${stp(1, '點網址列最右邊的「安裝」圖示（螢幕加向下箭頭）。')}${stp(2, '在跳出的小視窗選「安裝」。')}${stp(3, '之後可從桌面或開始功能表開啟，不用再打網址。')}${notice('', 'info', '不安裝也完全可以使用，所有功能都在網頁上。')}${mfoot(btn('我知道了', 'primary'))}`)}`, ''));

// D52 離線與已就緒
F.push(D('D52 桌機：離線與已就緒｜裝完或快取完成時顯示一次「已可離線使用」。離線時頁首出現淡色提示：統計與輸出照常，只有雲端硬碟不能用。', 2,
  `<div style="padding:12px 16px 0;display:flex;flex-direction:column;gap:8px">${notice('', 'info', '目前沒有網路。統計與輸出照常可用，Google 雲端硬碟暫時不能用。')}${notice('ok', 'check', '已可離線使用。下次沒有網路也能打開。')}</div>${body(main(`${h('準備資料')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${[['問卷類型', '票選幹部', '已確認', 'ok'], ['欄位對應', '已完成', '已確認', 'ok'], ['Google 雲端硬碟', '離線時無法使用', '離線', ''], ['資料檢查', '3 項待處理', '請處理', 'warn']].map(([a, b, c, k]) => `<div class="qcard" style="gap:6px"><div style="display:flex"><b>${a}</b><span style="margin-left:auto">${tag(c, k)}</span></div><span class="small muted">${b}</span></div>`).join('')}</div>`))}${nav('下一步：看統計')}`));

// D53 有新版本
F.push(D('D53 桌機：有新版本｜更新會重新載入頁面、資料會清掉，所以資料已載入時主動作是「先輸出」，更新排在後面；沒載入資料時才直接更新。', 3,
  `${scaleBase()}${nav('下一步：輸出')}${modal(560, `${mhead('有新版本可以更新')}<span class="muted">v0.2.0 · 11/12</span><ul style="margin:0;padding-left:1.2em;line-height:1.9"><li>新增票選防弊檢查</li><li>桌機編輯器可拖曳排序區塊</li><li>修正量表平均的小數進位</li></ul>${notice('warn', 'warn', '更新會重新載入頁面，目前載入的資料不會保留。')}${mfoot(btn('稍後再說', 'secondary'), btn('現在更新（資料會清掉）', 'secondary'), btn('先輸出，再更新', 'primary'))}`)}`));

// D54 隱私與關於
F.push(D('D54 桌機：隱私與關於｜白話說明資料怎麼處理，並把授權、第三方元件與原始碼連結放在這裡。沒有「分析使用數據」的選項，因為本來就不蒐集。', 4,
  `${body(setNav(7), main(`${h('隱私與關於')}${fbox(`<div style="padding:16px;display:flex;flex-direction:column;gap:10px;line-height:1.8"><b>你的資料</b><span>本程式沒有伺服器，資料只在這個瀏覽器處理，關閉頁面就清除。檔案若放在雲端硬碟或同步資料夾，由該雲端服務處理。這個網站只在本機存設定、範本與檔案位置，不蒐集任何使用數據。</span><span class="muted">輸出檔含學生資料，請依學校的個資規範保管，不要放在公開的雲端位置。</span></div>`)}${rowbtn('版本與更新紀錄', '', 'v0.1.0', false, true)}${rowbtn('授權', '', 'GPL-3.0（開放原始碼）', false, true)}${rowbtn('第三方元件授權', '所有套件與字型的授權清單', '', false, true)}${rowbtn('原始碼與回報問題', '', 'GitHub', false, true)}`), rside(300, `${h('一句話')}<p style="margin:0;line-height:1.8">本程式沒有伺服器，不會收到你的資料。</p>${notice('', 'lock', '沒有帳號、沒有追蹤、沒有廣告。')}`))}`));

// D55 第一次載入
F.push(frameWH('D55 桌機：第一次載入｜第一次需要下載約 1.2 MB，之後可離線。用骨架與進度說明在等什麼，不用旋轉圖示；有進度數字，也說明下載的只是程式、不含學生資料。', 1280, 800,
  `<div style="flex:1;display:grid;place-items:center">${centered(480, `<div style="display:flex;align-items:center;gap:12px"><span class="brand" style="width:48px;height:48px;display:grid;place-items:center">${ic('bars')}</span><b style="font-size:var(--fs-2xl)">問卷回饋小幫手</b></div><b style="font-size:var(--fs-lg)">正在準備…</b><span class="muted" style="line-height:1.7">第一次開啟需要下載約 1.2 MB，之後沒有網路也能用。</span>${prog(45)}<span class="small muted">已下載 45%</span><div style="display:flex;flex-direction:column;gap:8px"><div style="height:14px;border-radius:7px;background:var(--sunk);width:100%"></div><div style="height:14px;border-radius:7px;background:var(--sunk);width:80%"></div><div style="height:14px;border-radius:7px;background:var(--sunk);width:60%"></div></div>${notice('', 'lock', '載入的是網頁程式本身，不含任何學生資料。')}`)}</div>`));

// D56 清除本機設定
F.push(D('D56 桌機：清除本機設定｜「清除」影響範圍要講清楚：會刪設定、範本與檔案存取代號；不影響已輸出的檔案。建議先備份，主動作是「先備份」。', 4,
  `${body(setNav(5), main(`${h('備份與還原')}${rowbtn('匯出設定與範本', '', '', false, true)}${rowbtn('清除本機資料', '把這個瀏覽器記住的設定全部清掉', tag('進階', ''), false, true)}`))}${modal(520, `${mhead('清除這個瀏覽器的設定？', false)}<b style="color:var(--bad)">無法復原。</b><div class="qcard" style="gap:6px"><b>會刪除</b><span class="small muted" style="line-height:1.7">全域預設、你的範本、檔名規則、關鍵字清單、記住的檔案位置。</span></div><div class="qcard" style="gap:6px"><b>不會影響</b><span class="small muted">已輸出的檔案、雲端硬碟裡的檔案。</span></div><span class="small muted">建議先到「備份與還原」匯出設定，之後才能還原。</span>${mfoot(btn('取消', 'secondary'), btn('確定清除', 'secondary', { style: 'color:var(--bad);border-color:var(--bad)' }), btn('先備份', 'primary'))}`)}`));

write('frag-b19.html', F);
addPages({ id: 'desk-d', short: '桌機：雲端、防弊與系統', name: '桌機-雲端防弊與系統', title: '桌機（1280）：雲端硬碟、票選防弊與統計設定、系統與狀態', intro: '雲端硬碟選檔、配額用完與已連線設定、票選防弊檢查與計票規則、圖表另存圖片、安裝為應用程式、離線與新版本、隱私與關於、第一次載入、清除本機設定。人名與數字皆為虛構。', frag: 'frag-b19.html' });
console.log(F.length);
