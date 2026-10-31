// 桌機補完 B：統計、審稿、輸出、設定與狀態（D23–D32）
import * as K from './deskkit.mjs';
const { progDone, chartHead, L, D, side, main, rside, nav, modal, mhead, mfoot, prog, round, centered, rail, fbox, h, th, td, qrow, nvr, tgl, body, pane, flex1, foot, fchip, table, cmt, tag, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, ic, icbtn, brow, addPages, write, voteBars } = K;
const F = [];
const posList = (cur) => `${rail('職位')}${['班長', '副班長', '風紀股長', '衛生股長'].map((t, i) => nvr(t, i === cur, i === 1 ? tag('同票', 'warn') : '')).join('')}`;
const qList = (cur) => `${rail('題目')}${['1 活動內容有趣', '2 老師說明清楚', '3 活動場地舒適', '4 時間安排', '5 整體滿意度', '6 推薦給別人', '7 希望增加的活動', '8 分組方式', '9 其他建議'].map((t, i) => nvr(t, i === cur)).join('')}`;
const statsBase = () => body(side(260, posList(1)), main(`${h('副班長', '有效票 40 張')}${brow('王品妍', 16, 40, 'lead', tag('當選', 'ok'))}${brow('李冠廷', 10, 25, '', tag('同票', 'warn'))}${brow('吳承翰', 10, 25, '', tag('同票', 'warn'))}${brow('周冠宇', 4, 10)}`), rside(320, `${h('規則')}${notice('warn', 'warn', '第 2 名同票，請抽籤決定候補。')}`));

// D23 同票抽籤
F.push(D('D23 桌機：同票抽籤｜桌機用置中對話框。抽籤可以重現：顯示並記錄隨機種子，結果寫進輸出文件的計票明細。老師可以向同學說明公平。', 3,
  `${statsBase()}${modal(560, `${mhead('抽籤決定副班長候補')}<p style="margin:0;line-height:1.7">李冠廷、吳承翰同為 10 票。</p><div class="qcard" style="gap:6px;align-items:center;padding:20px"><span class="small muted">結果</span><b style="font-size:var(--fs-2xl)">李冠廷為候補</b><span class="small muted">2026/10/14 15:32 抽出</span></div><div style="display:flex;flex-direction:column;gap:4px"><span class="small muted">隨機種子</span><span class="mono" style="font-size:var(--fs-lg)">20261014-3A7F</span><span class="small muted">用同一個種子與名單順序，會得到一樣的結果。已記錄在計票明細。</span></div>${mfoot(btn('重新抽籤', 'secondary'), btn('完成', 'primary'))}`)}`));

// D24 複選題
F.push(D('D24 桌機：意見調查（複選題）｜左邊題目清單可一直看到全部題目，中間是這題的結果，右邊是排序與顯示設定。複選的比例以「填答人數」為基準，加總會超過 100%，畫面上直接寫明。', 3,
  `${body(side(260, qList(6)), main(`${h('第 7 題 ／ 9 · 複選', '希望增加的活動')}${notice('', 'info', '複選題：比例以 41 位填答者為基準，所以加總會超過 100%。')}${brow('戶外參訪', 26, 63, 'lead')}${brow('手作課', 19, 46)}${brow('桌遊', 17, 41)}${brow('運動會', 14, 34)}${brow('其他', 3, 7)}`), rside(320, `${h('顯示設定')}${rail('排序')}${seg(['人數多到少', '原順序'], 0, '排序')}${tgl('顯示百分比', '以填答者人數為基準', true)}${tgl('「其他」展開文字', '3 則，列在下方', false)}`))}${nav('下一步：輸出')}`));

// D25 改寫留言
const reviewBase = () => body(side(260, `${rail('學生（審完 12／41）')}${['王大明', '林雅婷', '陳家豪', '黃思穎'].map((t, i) => nvr(t, i === 2, i < 2 ? tag('已審', 'ok') : '')).join('')}`), main(`${h('陳家豪 收到的留言', '3 則 · 待審 2')}${cmt('他講話有點笨拙，但是很認真。', '建議', '', true)}${cmt('報告條理清楚，圖表很好懂。', '優點', '採用')}`));
F.push(D('D25 桌機：改寫留言｜點「改寫」開置中對話框。兩框等高、內距與字級一致：左邊原文灰底標唯讀，右邊改寫白底，高度隨較長者。改寫過的留言在教師版標示「老師改寫」，學生版看不到差別。', 4,
  `${reviewBase()}${modal(720, `${mhead('改寫留言')}<div class="twin"><div class="ro"><span class="lab">原文 ${tag('唯讀')}</span>他講話有點笨拙，但是很認真。</div><div class="rw"><span class="lab">改寫後的內容</span>講話可以再慢一點、再有條理，但是看得出來很認真。</div></div><span class="small muted">學生版看到的是改寫後的內容。</span>${mfoot(btn('取消', 'secondary'), btn('儲存並採用', 'primary'))}`)}`));

// D26 老師評語與關鍵字
F.push(D('D26 桌機：老師評語與關鍵字｜左邊切換學生並看完成人數，有寫評語或標「跳過」就算完成。中間寫評語，常用評語用分類頁籤加搜尋，籌碼顯示短標題，點一下插在游標處。六類預設是草稿，等使用者修改後定稿。', 4,
  `${body(side(260, `${progDone(3, 35)}${['林小宇', '陳怡安', '張子豪', '黃思穎'].map((t, i) => nvr(t, i === 0, i < 2 ? tag('已寫', 'ok') : i === 2 ? tag('跳過') : '')).join('')}`), main(`${h('林小宇（6 號）', '評語會出現在學生版與家長版')}<div style="position:relative"><div class="input" style="min-height:150px;padding:14px 14px 56px;line-height:1.8">小宇，這次報告看得出你很用心，也很願意照顧組員。下次試著把一個生活例子放進去。</div><span style="position:absolute;right:8px;bottom:8px">${btn('存成常用評語', 'secondary', { sm: true, icon: 'plus' })}</span></div><span class="small muted">38 字 · 可使用 {姓名}、{總分}</span><div style="display:flex;align-items:center;gap:12px">${rail('常用評語')}<input class="input" style="flex:1;min-height:44px" placeholder="搜尋評語" aria-label="搜尋評語"></div>${seg(['學習態度', '課堂參與', '合作', '表達', '進步', '鼓勵', '我的'], 0, '評語分類')}${chips(['很用心', '主動學習', '按部就班', '願意修正', '再專注一點'], -1)}<span class="small muted">游標停在籌碼上可預覽整句。可以新增、改寫、刪除與排序。</span>`), rside(320, `${h('關鍵字提醒', '留言含這些詞時，審稿畫面會加紅色提醒。系統只提醒，不會自動隱藏。')}<div style="display:flex;flex-wrap:wrap;gap:6px">${['笨', '白痴', '討厭', '很爛', '最差'].map((t) => tag(t, 'bad')).join('')}</div><div>${btn('編輯關鍵字', 'secondary', { sm: true, icon: 'pencil' })}</div>`))}${nav('儲存', '上一步')}`));

// D27 輸出進度
const stepRow = (t, st) => `<div style="display:flex;align-items:center;gap:10px;min-height:36px"><span style="width:22px;height:22px;border-radius:50%;display:grid;place-items:center;${st === 'done' ? 'background:var(--ok);color:#fff' : st === 'now' ? 'border:2px solid var(--accent)' : 'border:2px solid var(--line)'}">${st === 'done' ? ic('check') : ''}</span><span style="${st === 'wait' ? 'color:var(--ink3)' : ''}">${t}</span></div>`;
F.push(D('D27 桌機：輸出進度｜逐項顯示進度（已完成、進行中、等待）與剩餘時間。桌機可以切到別的分頁，但請不要關閉本頁；可以取消。', 4,
  `${body(main(`${h('輸出設定')}${card2()}`))}${modal(560, `${mhead('正在產生個人回饋單', false)}<span class="small muted">學生版 · PDF · 41 人</span><div style="display:flex;align-items:baseline;gap:6px"><b style="font-size:var(--fs-3xl)">28</b><span class="muted">／41 份　約剩 10 秒</span></div>${prog(68)}<div>${stepRow('準備字型', 'done')}${stepRow('計算統計與圖表', 'done')}${stepRow('產生 PDF（28／41）', 'now')}${stepRow('打包成 zip', 'wait')}</div>${notice('', 'info', '可以切到別的分頁，但請不要關閉這個頁面。')}${mfoot(btn('取消', 'secondary'))}`)}`));
function card2() { return `<div class="qcard" style="gap:10px"><div class="small muted">學生版 · PDF · 41 個，打包 1 個 zip</div></div>`; }

// D28 檔名規則與去識別化
F.push(D('D28 桌機：檔名規則與去識別化｜輸出頁「進階」展開。左邊用變數組檔名並即時預覽；右邊去識別化把姓名換成代號，另存對照表。', 4,
  `${body(main(`${h('檔名與去識別化', '進階設定，輸出前可以先在這裡看結果。')}<div class="qcard" style="gap:12px"><b>檔名規則</b><div style="display:flex;gap:6px;flex-wrap:wrap">${['{班級}', '_', '{座號}', '_', '{姓名}', '_', '回饋單'].map((t) => `<span class="tag" style="font-size:var(--fs-md);min-height:36px">${t}</span>`).join('')}</div><div class="small muted">可加入的變數</div>${chips(['{班級}', '{座號}', '{姓名}', '{日期}'], -1)}<div class="notice ok">${ic('check')}<div>預覽：<span class="mono">三年二班_06_林小宇_回饋單.pdf</span></div></div></div>`), rside(400, `${h('去識別化匯出')}${tgl('姓名換成代號（如 S06）', '另存對照表', true)}${notice('', 'lock', '對照表是一個獨立檔案，只有你保管。')}${fbox(`<table style="border-collapse:collapse;width:100%;font-size:var(--fs-sm)"><thead><tr><th style="${th}">代號</th><th style="${th}">檔名預覽</th></tr></thead><tbody><tr><td style="${td}">S06</td><td style="${td}" class="mono">三年二班_S06_回饋單.pdf</td></tr><tr><td style="${td}">S07</td><td style="${td}" class="mono">三年二班_S07_回饋單.pdf</td></tr></tbody></table>`)}`))}${nav('套用', '取消')}`));

// D29 備份與還原
F.push(D('D29 桌機：備份與還原｜設定檔與專案檔分開：設定檔含範本、權重、關鍵字；專案檔另含資料來源與欄位對應。兩者都不含學生資料。舊版設定匯入時自動轉換。', 4,
  `${body(pane(240, `${['全域預設', '版面範本', '檔名規則', '關鍵字提醒', '備份與還原', '外觀', '隱私與關於'].map((t, i) => nvr(t, i === 4)).join('')}`, 'padding:12px;border-right:1px solid var(--line-soft)'), main(`${h('備份與還原', '備份檔不含任何學生資料或問卷內容。')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="qcard" style="gap:10px"><b>設定檔</b><span class="small muted" style="line-height:1.7">範本、權重、關鍵字、檔名規則。</span><div style="display:flex;gap:8px">${btn('匯出設定', 'secondary')}${btn('匯入設定', 'secondary')}</div></div><div class="qcard" style="gap:10px"><b>專案檔</b><span class="small muted" style="line-height:1.7">存下欄位對應與設定，下學期開同一種問卷時可以直接還原。</span><div>${btn('存成專案檔', 'secondary')}</div></div></div>${notice('', 'info', '這份設定來自舊版 v0.2，已自動轉換為目前版本。')}`), rside(300, `${h('備份包含什麼')}<div style="display:flex;flex-direction:column;gap:6px;line-height:1.7"><span>${ic('check')} 範本與版面</span><span>${ic('check')} 權重與計分規則</span><span>${ic('check')} 關鍵字與常用評語</span><span style="color:var(--ink3)">${ic('x')} 學生姓名與成績</span><span style="color:var(--ink3)">${ic('x')} 問卷回覆內容</span></div>`))}`));

// D30 空白狀態
F.push(D('D30 桌機：空白狀態｜沒有可統計的題目。說明為什麼、下一步做什麼，直接給回到對應欄位的按鈕。不放插圖或笑臉。', 3,
  `${body(side(260, `${rail('題目')}<span class="small muted" style="padding:0 12px">（尚無題目）</span>`), main(`${centered(480, `<b style="font-size:var(--fs-xl)">還沒有可以統計的題目</b><p class="muted" style="margin:0;line-height:1.8">所有欄位都被設成「略過」或「開放題」。請回到「對應欄位」，把題目改成單選、複選或量表。</p><div>${btn('回到對應欄位', 'primary')}</div>`)}`, 'justify-content:center'))}${nav('下一步：輸出')}`));

// D31 輸出失敗
F.push(D('D31 桌機：輸出失敗｜說明原因，並給兩個替代做法；已完成的保留。錯誤訊息不道歉、不嚇人。桌機通常不會遇到，但瀏覽器記憶體不足時仍可能發生。', 4,
  `${body(main(`${h('輸出')}${notice('bad', 'warn', '<b>產生到第 27 份時中斷</b><br>瀏覽器的記憶體不夠一次處理 41 份。已完成的 26 份保留，不會遺失。')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${rcard('分批輸出', '每次 20 份，分 3 批', true, 'min-height:110px')}${rcard('改輸出 Excel', '一個檔案含全班統計，檔案較小', false, 'min-height:110px')}</div>`))}${nav('繼續')}`));

// D32 離開前確認
F.push(D('D32 桌機：離開前確認｜關閉分頁或回到首頁前，說明「資料不保存」，主動作是「先輸出」。對話框置中，寬 480。', 3,
  `${body(side(260, qList(0)), main(`${h('第 1 題 ／ 9 · 量表', '活動內容有趣')}${brow('非常同意', 22, 54, 'lead')}${brow('同意', 12, 29)}${brow('普通', 5, 12)}${brow('不同意', 2, 5)}`))}${nav('下一步：輸出')}${modal(480, `${mhead('現在離開嗎？', false)}<p style="margin:0;line-height:1.8">問卷資料不會被保存，離開後要重新開啟檔案。<br>如果還沒有輸出，建議先輸出。</p>${mfoot(btn('離開', 'secondary'), btn('先輸出', 'primary'))}`)}`));

write('frag-b17.html', F);
addPages({ id: 'desk-b', short: '桌機：統計、審稿與輸出', name: '桌機-統計審稿輸出與狀態', title: '桌機（1280）：統計、審稿、輸出、設定與狀態', intro: '同票抽籤、複選題、改寫留言、老師評語、輸出進度、檔名與去識別化、備份與還原、空白、輸出失敗與離開確認。人名與數字皆為虛構。', frag: 'frag-b17.html' });
console.log(F.length);
