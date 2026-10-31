// 桌機補完 A：資料進來與檢查（D12–D22）
import * as K from './deskkit.mjs';
const { L, D, home, homeDrop, homeRecent, homeWrap, guide, privacy, howtoLink, lnk, colrow, offgroup, grp, weightTable, BAR_H, side, main, rside, nav, modal, mhead, mfoot, prog, dropzone, round, centered, rail, fbox, bgOpen, h, th, td, qrow, nvr, tgl, body, pane, flex1, foot, fchip, table, tag, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, ic, icbtn, brow, addPages, write, scr } = K;
const F = [];
const openLayout = (left, right = homeRecent()) => homeWrap(left, right);

// D12 選檔來源
F.push(D('D12 桌機：選檔來源｜按「選擇檔案」後開的對話框，只留兩個來源。本機檔案不分資料夾，放在雲端同步資料夾也一樣；Google 登入入口移到設定頁，示範資料移到教學頁。', 1,
  `${bgOpen()}${modal(600, `${mhead('從哪裡選檔案？')}${rowbtn('這台電腦的檔案', '開啟檔案總管選 Excel 檔；也可以直接把檔案拖到畫面上', '', false, true)}${rowbtn('開啟專案檔', '還原之前存的欄位對應與設定，之後再選這學期的試算表', '', false, true)}${mfoot(btn('取消', 'secondary'))}`)}`, ''));

// D13 讀取中
F.push(D('D13 桌機：讀取中｜選好檔案後，左邊的放檔區換成檔名與進度；右邊最近的專案照常顯示，隱私提示在同一個位置。', 1,
  `${openLayout(`<div class="hdrop" style="align-items:stretch;text-align:left"><h1>開啟試算表</h1>${fchip('file', '三年二班_幹部票選.xlsx', '1.1 MB')}${prog(62)}<div style="display:flex;flex-direction:column;gap:4px"><b>正在讀取…</b><span class="small muted">讀取 41 筆回覆，通常幾秒內完成。</span></div>${btn('取消', 'secondary')}</div>`)}`, ''));

// D14 讀不到檔案
F.push(D('D14 桌機：讀不到檔案｜錯誤說明哪裡錯、怎麼改，放檔區保留在左邊可直接重試。右邊換成匯出教學，用自畫的簡化示意圖，和首頁連結、教學頁共用同一組圖。', 1,
  `${openLayout(`<div style="display:flex;flex-direction:column;gap:12px;min-height:0">${notice('bad', 'warn', '<b>讀不到「回覆.numbers」</b><br>請改用 Excel 檔（xlsx）。csv 也可以。')}<div class="hdrop" style="flex:1"><b>把 Excel 檔拖到這裡</b><span class="small muted">或</span>${btn('重新選擇檔案', 'primary')}</div></div>`, `<div class="hright"><div class="shead"><h3>怎麼從 Google 表單匯出？</h3></div>${guide()}<div style="margin-top:auto">${privacy()}</div></div>`)}`, ''));

// D57 匯出教學（首頁連結）
F.push(D('D57 桌機：匯出教學｜按首頁「怎麼從 Google 表單匯出？」開的對話框，內容和 D14、D8 共用同一組示意圖。', 1,
  `${bgOpen()}${modal(760, `${mhead('怎麼從 Google 表單匯出？')}${guide()}${notice('warn', 'warn', '雲端硬碟或同步資料夾裡的 Google 試算表只是捷徑，不能直接讀，請先下載成 Excel 檔。')}${mfoot(btn('知道了', 'primary'))}`)}`, ''));

// D15 瀏覽器過舊
F.push(D('D15 桌機：瀏覽器版本過舊｜頁面最上方的警示條，不擋住操作。說明影響與怎麼更新，老師可選擇繼續使用。', 1,
  `<div style="padding:12px 16px 0">${notice('warn', 'warn', '<b>你的瀏覽器版本較舊（Chrome 98）</b><br>部分功能可能無法使用，例如輸出 PDF。建議更新到近兩年的 Chrome、Edge、Safari 或 Firefox。', `${btn('如何更新', 'secondary', { sm: true })}${btn('繼續使用', 'secondary', { sm: true })}`)}</div>${bgOpen()}`, ''));

// D16 準備資料總覽
const prep = (n, st, nm, sm, tg, kind, cls = '', bt = '') => `<li class="${cls === 'opt1' ? 'opt1' : ''}"><span class="num ${st}">${st === 'done' ? ic('check') : st === 'lock' ? ic('lock') : n}</span><div class="vcard ${cls === 'opt1' ? '' : cls}"><div><b>${nm}</b><span class="small muted">${sm}</span></div>${tag(tg, kind)}${bt}</div></li>`;
F.push(D('D16 桌機：準備資料（總覽）｜四件事改成由上而下的固定順序：問卷類型、欄位對應、學生名單（選用）、資料檢查。編號和頂端步驟列同一套；目前該做的那件放大並給按鈕，前兩件完成才解鎖後面；名單可跳過，連接線用虛線。', 2,
  `${body(main(`${fchip('file', '三年二班_幹部票選.xlsx', '41 筆回覆 · 9 欄')}${h('準備資料', '依序做完四件事。前兩件完成後就能看統計。')}<ol class="vs">${prep(1, 'done', '問卷類型', '票選幹部', '已確認', 'ok')}${prep(2, 'cur', '欄位對應', '9 欄，使用 7 欄，2 欄請確認', '請確認', 'warn', 'now', btn('開始', 'primary', { sm: true }))}${prep(3, 'lock', '學生名單', '找出沒填、冒名與重複。完成欄位對應後解鎖', '選用', '', 'lock opt1')}${prep(4, 'lock', '資料檢查', '重複、空白、無效票、格式異常。完成欄位對應後解鎖', '尚未解鎖', '', 'lock')}</ol>`), rside(340, `${h('還缺什麼')}${rowbtn('欄位對應', '先完成才能看統計', tag('必做', 'warn'), true, true)}${notice('', 'info', '學生名單可以跳過。回頭改前面的設定，後面已完成的項目會標「請重新確認」。')}`))}${foot(btn('上一步', 'secondary'), `<span class="small muted" style="align-self:center">欄位對應完成後才能往下</span>`, btn('下一步：看統計', 'primary', { dis: true }))}`));

// D17 問卷類型
F.push(D('D17 桌機：問卷類型｜系統先智慧判斷，老師確認。三種類型並排成卡片，每種用一句話講它會幫你做什麼；右邊說明系統怎麼判斷的，不是黑盒子。', 2,
  `${body(main(`${h('這是哪一種問卷？', '智慧判斷是「票選幹部」，你可以更改。')}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${rcard('票選幹部 ' + tag('建議', 'ok'), '各職位得票與排名、同票抽籤、防弊檢查', true, 'min-height:140px')}${rcard('意見調查', '單選、複選、量表、開放題、交叉分析', false, 'min-height:140px')}${rcard('報告回饋', '以被評學生為單位：加權、去最高最低、自評對他評、小組互評', false, 'min-height:140px')}</div>${grp('快速範本', chips(['活動滿意度', '家長意見', '教學回饋', '學習自評', '報名點名清點', '班規議題票選'], -1))}<p class="small muted" style="margin:0">快速範本是預先設好欄位與文案的起點，分別掛在上面三種類型底下。</p>`), rside(360, `${h('怎麼判斷的')}<p class="small" style="margin:0;line-height:1.8">「班長、副班長、風紀股長、衛生股長」這幾欄，每欄只有 4 到 6 種答案，而且答案都是人名，所以判斷是票選。</p>${tiles([['可能是票選', '4 欄'], ['可能是量表', '0 欄']])}${notice('', 'info', '選錯也沒關係，之後隨時可以回來改，欄位對應會重新智慧判斷。')}`))}${nav('確定')}`));

// D18 欄位用途下拉
const cols = [['時間戳記', '時間戳記'], ['班級', '班級'], ['座號', '座號'], ['姓名', '姓名'], ['班長', '班長（票選）'], ['副班長', '副班長（票選）'], ['風紀股長', '風紀股長（票選）']];
const maprow = (a, b, cur) => `<div style="display:flex;align-items:center;gap:10px;min-height:48px;padding:0 12px;border-radius:var(--r-sm);${cur ? 'background:var(--accent-soft)' : ''}"><span class="mono" style="width:6.5em">${a}</span><span style="color:var(--ink3)">${ic('next')}</span><div class="input" style="flex:1;min-height:40px;display:flex;align-items:center;padding:0 12px">${b}</div></div>`;
const rows = [['2026/10/12 10:12', '2', '6', '林小宇', '陳怡安', '王品妍', '周冠宇'], ['2026/10/12 10:13', '2', '17', '趙子安', '林小宇', '王品妍', '蔡佳穎'], ['2026/10/12 10:15', '2', '9', '周宜靜', '林小宇', '李冠廷', '周冠宇'], ['2026/10/12 10:15', '2', '21', '張語彤', '陳怡安', '王品妍', '周冠宇']];
const menu = ['時間戳記', '班級', '座號', '姓名', '投票選項（單選）', '量表題', '複選題', '開放題', '不使用這欄'].map((t, i) => `<div class="qrow"${i === 4 ? ' aria-current="true"' : ''} style="min-height:36px">${i === 4 ? ic('check') : '<span style="width:1.2em"></span>'}<span style="flex:1">${t}</span></div>`).join('');
F.push(D('D18 桌機：選擇欄位用途（下拉選單）｜手機用底部面板，桌機改成貼在欄位旁的下拉選單。選項 40px 高，目前選的打勾；點外面或按 Esc 關閉，鍵盤可用 ↑ ↓ Enter。', 2,
  `${body(pane(540, `${h('欄位對應', '已智慧判斷，不對的才需要改。')}${cols.slice(0, 5).map((c, i) => colrow(c[0], c[1], i === 4)).join('')}<div style="position:absolute;left:216px;top:300px;width:300px;background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:0 8px 24px var(--shadow-sm);padding:6px;z-index:2">${menu}</div>`, 'padding:20px;border-right:1px solid var(--line-soft);overflow:hidden;position:relative'), flex1(`${h('資料預覽', '前 4 列，共 41 列')}${fbox(`<table style="border-collapse:collapse;width:100%;font-size:var(--fs-sm)"><thead><tr>${['時間戳記', '班級', '座號', '姓名', '班長', '副班長', '風紀股長'].map((c, i) => `<th style="${th}${i === 4 ? ';background:var(--accent-soft);color:var(--accent-ink)' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="${td}${i === 4 ? ';background:var(--accent-soft)' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`)}`, 'padding:20px;overflow:hidden;gap:14px'))}${nav('下一步：看統計')}`));

// D19 報告回饋欄位對應
F.push(D('D19 桌機：欄位對應（報告回饋）｜類型不同，欄位種類也不同：評分者、被評對象、評分項目。權重預設每項等重，只有量表項目分權重；除不盡時內部等重、顯示到小數一位。沒手動改過時，增刪項目自動重新平分。', 2,
  `${body(main(`${h('欄位對應：報告回饋', '指定誰評、評誰、用哪幾項規準。')}${weightTable([25, 25, 25, 25])}`), rside(340, `${h('合計')}${tiles([['評分者', 41], ['被評對象', '8 組']])}${tile('權重合計', '100%')}${notice('ok', 'check', '權重合計 100%，可以往下。')}`))}${nav('下一步')}`));

// D20 匯入學生名單
const rosterTabs = (on) => seg(['同一班', '混班'], on, '名單類型');
const rosterPrev = (rows) => `<table style="border-collapse:collapse;width:100%;font-size:var(--fs-sm)"><thead><tr><th style="${th}">班級</th><th style="${th}">座號</th><th style="${th}">姓名</th><th style="${th}">狀態</th></tr></thead><tbody>${rows.map(([c, n, nm, st]) => `<tr><td style="${td}"${c === '三年二班' ? ' class="muted"' : ''}>${c}</td><td style="${td}">${n}</td><td style="${td}">${nm}</td><td style="${td}">${st}</td></tr>`).join('')}</tbody></table>`;
F.push(D('D20 桌機：匯入學生名單（同一班）｜同一班手填班級，貼上時每行一位姓名，座號由程式依序補上；姓名前有數字就當座號。預覽表可以改座號或插入缺號，同名標示請老師確認。', 2,
  `${body(side(300, `${rail('匯入方式')}${rcard('貼上名單', '每行一位姓名', true)}${rcard('開啟名單檔', 'Excel 檔；有座號欄就用，沒有就自動補', false)}${rcard('先略過', '之後想用再回來', false)}`), main(`${h('匯入學生名單', '用來找出沒填的人、冒名與打錯的名字。可以先略過。')}${rosterTabs(0)}<div style="display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px;flex:1;min-height:0"><div style="display:flex;flex-direction:column;gap:8px">${L.field('cls', '班級', '三年二班')}<div class="input mono" style="flex:1;min-height:0;padding:12px;line-height:2;white-space:pre">王大明\n林雅婷\n陳家豪\n黃思穎\n林雅婷\n…</div></div><div style="display:flex;flex-direction:column;gap:8px;min-width:0"><b class="small">預覽（點座號可修改）</b>${fbox(rosterPrev([['三年二班', '1', '王大明', ''], ['三年二班', '2', '林雅婷', tag('同名', 'warn')], ['三年二班', '3', '陳家豪', ''], ['三年二班', '4', '黃思穎', ''], ['三年二班', '5', '林雅婷', tag('同名', 'warn')]]))}<div>${btn('插入缺號', 'secondary', { sm: true, icon: 'plus' })}</div></div></div><div style="display:flex;align-items:center;gap:8px">${tag('已辨識 42 位', 'ok')}<span class="small muted">座號 1–42，有 2 位同名請確認</span></div>`), rside(300, `${h('怎麼核對')}<p class="small" style="margin:0;line-height:1.8">問卷有座號欄時，會和名單核對，不符的列在「需確認」。</p>${notice('', 'lock', '名單只在這個瀏覽器的記憶體裡，不會存起來，關閉頁面就清除。')}`))}${nav('匯入名單')}`));

// D58 匯入學生名單（混班）
F.push(D('D58 桌機：匯入學生名單（混班）｜混班直接從 Excel 複製三欄貼上。缺班級或座號的列標出來請老師補，程式不補不猜；班級名稱照老師貼的，不限格式。', 2,
  `${body(side(300, `${rail('匯入方式')}${rcard('貼上名單', '從 Excel 複製班級、座號、姓名三欄', true)}${rcard('開啟名單檔', 'Excel 檔，要有班級、座號、姓名', false)}${rcard('先略過', '之後想用再回來', false)}`), main(`${h('匯入學生名單', '選修、社團等跨班問卷用這裡。')}${rosterTabs(1)}<div style="display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px;flex:1;min-height:0"><div class="input mono" style="min-height:0;padding:12px;line-height:2;white-space:pre">301班	5	王大明\n302班	12	林雅婷\n	8	陳家豪\n高三3	3	黃思穎\n…</div><div style="display:flex;flex-direction:column;gap:8px;min-width:0"><b class="small">預覽</b>${fbox(rosterPrev([['301班', '5', '王大明', ''], ['302班', '12', '林雅婷', ''], ['<span style="color:var(--warn);font-weight:700">缺班級</span>', '8', '陳家豪', tag('請補上', 'warn')], ['高三3', '3', '黃思穎', '']]))}</div></div><div style="display:flex;align-items:center;gap:8px">${tag('已辨識 28 位', 'ok')}${tag('1 列要補', 'warn')}<span class="small muted">補完才能匯入</span></div>`), rside(300, `${h('怎麼核對')}<p class="small" style="margin:0;line-height:1.8">同一個人用班級加座號辨識。不同班的同名同學不算重複。</p>${notice('', 'lock', '名單只在這個瀏覽器的記憶體裡，不會存起來，關閉頁面就清除。')}`))}${foot(btn('上一步', 'secondary'), btn('匯入名單', 'primary', { dis: true }))}`));

// D21 名單對照：未填
const cmpTabs = (on) => `${rail('對照結果')}${nvr('未填', on === 0, tag('1', 'warn'))}${nvr('需確認', on === 1, tag('2', 'warn'))}${nvr('重複', on === 2, tag('1', 'warn'))}${nvr('全部', on === 3, tag('42'))}`;
F.push(D('D21 桌機：名單對照（未填）｜上方四個數字看全貌，左邊切換問題類型，中間列出明細。明細固定班級、座號、姓名，單班時班級用淡字；未填的人可一鍵複製，複製內容也帶這三項。', 2,
  `${body(side(260, cmpTabs(0)), main(`${tiles([['已對應', 39], ['需確認', 2, 'warn'], ['未填', 1, 'warn'], ['重複', 1, 'warn']])}${h('未填 1 位', '名單有、問卷沒有')}${fbox(`<table style="border-collapse:collapse;width:100%;font-size:var(--fs-md)"><thead><tr><th style="${th}">班級</th><th style="${th}">座號</th><th style="${th}">姓名</th><th style="${th}">狀態</th></tr></thead><tbody><tr><td style="${td}" class="muted">三年二班</td><td style="${td}">23</td><td style="${td}">吳家豪</td><td style="${td}">${tag('未填', 'warn')}</td></tr></tbody></table>`)}<div>${btn('複製未填名單', 'secondary', { icon: 'copy' })}</div>`), rside(320, `${h('怎麼算的')}<p class="small" style="margin:0;line-height:1.8">42 位學生中，41 位有填答。收到 42 份表單，其中 1 份是重複填答。</p>${notice('', 'info', '未填不代表缺考；系統只列出，不會替你判斷。')}`))}${nav('完成對照')}`));

// D22 名單對照：需確認
const guess = (a, b, n) => `<div class="qcard" style="gap:10px;padding:14px 16px"><div style="display:flex;align-items:center;gap:12px"><div><div class="small muted">填答的名字</div><b style="font-size:var(--fs-lg)">${a}</b><div class="small muted">三年二班 · 問卷填的座號</div></div><span style="color:var(--ink3)">${ic('next')}</span><div><div class="small muted">名單裡最接近</div><b style="font-size:var(--fs-lg)">${b}</b><div class="small muted">三年二班 ${n} 號</div></div></div><div style="display:flex;gap:8px">${btn('是同一人', 'primary', { sm: true })}${btn('不是，另選', 'secondary', { sm: true })}${btn('排除這筆', 'secondary', { sm: true })}</div></div>`;
F.push(D('D22 桌機：名單對照（需確認）｜打錯名字或冒名的情況。系統智慧判斷最接近的人，老師一鍵確認，不用自己查；三個按鈕橫排在每張卡上。', 2,
  `${body(side(260, cmpTabs(1)), main(`${tiles([['已對應', 39], ['需確認', 2, 'warn'], ['未填', 1, 'warn'], ['重複', 1, 'warn']])}${h('需確認 2 筆', '名字和名單對不上，請確認是不是同一人。')}${guess('王小明', '王大明', 1)}${guess('林雅挺', '林雅婷', 2)}`), rside(320, `${h('怎麼智慧判斷')}<p class="small" style="margin:0;line-height:1.8">比較字形相近與座號，找出名單裡最接近的一位。只提供建議，不會自動套用。</p>${notice('warn', 'warn', '「排除這筆」不會刪除原始資料，只是不納入統計。')}`))}${nav('完成對照')}`));

write('frag-b16.html', F);
addPages({ id: 'desk-a', short: '桌機：資料進來與檢查', name: '桌機-資料進來與檢查', title: '桌機（1280）：資料進來與檢查', intro: '選檔來源、讀取中與錯誤、瀏覽器過舊、準備資料總覽、問卷類型、欄位對應、名單匯入與對照。人名與數字皆為虛構。', frag: 'frag-b16.html' });
console.log(F.length);
