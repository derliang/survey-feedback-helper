// 桌機補完 A：資料進來與檢查（D12–D22）
import * as K from './deskkit.mjs';
const { L, D, side, main, rside, nav, modal, mhead, mfoot, prog, dropzone, round, centered, rail, fbox, bgOpen, h, th, td, qrow, nvr, tgl, body, pane, flex1, foot, fchip, table, tag, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, ic, icbtn, brow, addPages, write, scr } = K;
const F = [];
const recent = () => rside(340, `${h('最近的專案', '只記住設定，不含學生資料')}${rowbtn('三年二班 幹部票選', '10/28 · 票選幹部', '', false, true)}${rowbtn('小組報告 評分', '10/12 · 報告回饋', '', false, true)}${rowbtn('開啟專案檔…', '從檔案還原設定', '', false, true)}<div style="margin-top:auto">${btn('用示範資料試試看', 'secondary', { block: true })}</div>`);
const openLayout = (center, step = 1) => body(flex1(centered(560, center), 'padding:24px;align-items:stretch;justify-content:center'), recent());

// D12 選檔來源
F.push(D('D12 桌機：選檔來源｜按「選擇檔案」後，在畫面中央開一個對話框，列出三個來源與示範資料。每一項寫清楚會發生什麼事；Esc 或「取消」關閉。', 1,
  `${bgOpen()}${modal(600, `${mhead('從哪裡選檔案？')}${rowbtn('這台電腦的檔案', '開啟檔案總管選 xlsx 或 csv；也可以直接把檔案拖到畫面上', '', false, true)}${rowbtn('Google 雲端硬碟', '用資料夾讀取（不用登入），或登入後用選檔視窗挑檔案', '', false, true)}${rowbtn('開啟專案檔', '還原之前存的欄位對應與設定，之後再選這學期的問卷檔', '', false, true)}${rowbtn('示範資料', '虛構的三年二班資料，用來試用，不含任何真實姓名', '', false, true)}${mfoot(btn('取消', 'secondary'))}`)}`, ''));

// D13 讀取中
F.push(D('D13 桌機：讀取中｜選好檔案後立刻顯示檔名、進度與「資料只在這台電腦處理」。讀取時「下一步」停用，右邊的最近專案照常顯示。', 1,
  `${openLayout(`${h('開啟問卷檔')}${fchip('file', '三年二班_幹部票選.xlsx', '1.1 MB')}${prog(62)}<div style="display:flex;flex-direction:column;gap:4px"><b>正在讀取…</b><span class="small muted">讀取 41 筆回覆，通常幾秒內完成。</span></div>${notice('', 'lock', '資料只在這台電腦的瀏覽器處理，不會上傳。')}`)}${foot(btn('取消', 'secondary'), btn('下一步：對應欄位', 'primary', { dis: true }))}`, ''));

// D14 讀不到檔案
F.push(D('D14 桌機：讀不到檔案｜錯誤說明哪裡錯、怎麼改，直接給「重新選擇」；右下是匯出教學，步驟有先後所以用編號。', 1,
  `${openLayout(`${h('開啟問卷檔')}${notice('bad', 'warn', '<b>讀不到「回覆.numbers」</b><br>目前只支援 xlsx 與 csv。', btn('重新選擇檔案', 'primary', { sm: true }))}${dropzone(`<b>把 xlsx 或 csv 拖到這裡</b><span class="small muted">或</span>${btn('選擇檔案', 'secondary')}`)}<div class="qcard" style="gap:8px"><b>怎麼從 Google 表單匯出？</b><ol style="margin:0;padding-left:1.2em;line-height:1.8"><li>開啟 Google 表單，點上方「回覆」。</li><li>選「下載回覆 (.csv)」，或在試算表選「檔案 → 下載 → Microsoft Excel (.xlsx)」。</li><li>回到這裡，把下載的檔案拖進來。</li></ol></div>`)}${foot(btn('下一步：對應欄位', 'primary', { dis: true }))}`, ''));

// D15 瀏覽器過舊
F.push(D('D15 桌機：瀏覽器版本過舊｜頁面最上方的警示條，不擋住操作。說明影響與怎麼更新，老師可選擇繼續使用。', 1,
  `<div style="padding:12px 16px 0">${notice('warn', 'warn', '<b>你的瀏覽器版本較舊（Chrome 98）</b><br>部分功能可能無法使用，例如輸出 PDF。建議更新到近兩年的 Chrome、Edge、Safari 或 Firefox。', `${btn('如何更新', 'secondary', { sm: true })}${btn('繼續使用', 'secondary', { sm: true })}`)}</div>${bgOpen()}`, ''));

// D16 準備資料總覽
const prep = (ic1, nm, sm, st, kind) => `<div class="qcard" style="gap:8px;padding:16px 18px"><div style="display:flex;align-items:center;gap:10px"><span style="color:var(--accent-ink)">${ic(ic1)}</span><b style="font-size:var(--fs-lg)">${nm}</b><span style="margin-left:auto">${tag(st, kind)}</span></div><span class="small muted" style="line-height:1.7">${sm}</span><div>${btn('開啟', 'secondary', { sm: true })}</div></div>`;
F.push(D('D16 桌機：準備資料（總覽）｜第 2 步的入口：四件事排成 2×2，各有狀態。必做的先排，選用的標「選用」；右邊說明還缺什麼，老師一眼知道能不能往下。', 2,
  `${body(main(`${fchip('file', '三年二班_幹部票選.xlsx', '41 筆回覆 · 9 欄')}${h('準備資料', '四件事，前兩件做完就能看統計。')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${prep('list', '問卷類型', '票選幹部', '已確認', 'ok')}${prep('table', '欄位對應', '9 欄，2 欄請確認', '請確認', 'warn')}${prep('users', '學生名單', '找出沒填、冒名與重複', '選用', '')}${prep('flag', '資料檢查', '重複、空白、無效票、格式異常', '3 項待處理', 'warn')}</div>`), rside(340, `${h('還缺什麼')}${rowbtn('欄位對應', '先完成才能看統計', tag('必做', 'warn'), true, true)}${rowbtn('學生名單', '之後再做也可以', tag('選用', ''), false, true)}${rowbtn('資料檢查', '輸出前建議處理完', tag('建議', 'accent'), false, true)}${notice('', 'info', '名單與資料檢查可以之後再做，統計結果會在你處理後自動更新。')}`))}${nav('下一步：看統計')}`));

// D17 問卷類型
F.push(D('D17 桌機：問卷類型｜系統先猜，老師確認。三種類型並排成卡片，每種用一句話講它會幫你做什麼；右邊說明系統怎麼猜的，不是黑盒子。', 2,
  `${body(main(`${h('這是哪一種問卷？', '看起來像「票選幹部」，你可以更改。')}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${rcard('票選幹部 ' + tag('建議', 'ok'), '各職位得票與排名、同票抽籤、防弊檢查', true, 'min-height:140px')}${rcard('意見調查', '單選、複選、量表、開放題、交叉分析', false, 'min-height:140px')}${rcard('報告回饋', '以被評學生為單位：加權、去最高最低、自評對他評、小組互評', false, 'min-height:140px')}</div>`), rside(360, `${h('系統怎麼猜的')}<p class="small" style="margin:0;line-height:1.8">「班長、副班長、風紀股長、衛生股長」這幾欄，每欄只有 4 到 6 種答案，而且答案都是人名，所以猜是票選。</p>${tiles([['可能是票選', '4 欄'], ['可能是量表', '0 欄']])}${notice('', 'info', '選錯也沒關係，之後隨時可以回來改，欄位對應會重新猜。')}`))}${nav('確定')}`));

// D18 欄位用途下拉
const cols = [['時間戳記', '時間戳記'], ['班級', '班級'], ['座號', '座號'], ['姓名', '姓名'], ['班長', '班長（票選）'], ['副班長', '副班長（票選）'], ['風紀股長', '風紀股長（票選）']];
const maprow = (a, b, cur) => `<div style="display:flex;align-items:center;gap:10px;min-height:48px;padding:0 12px;border-radius:var(--r-sm);${cur ? 'background:var(--accent-soft)' : ''}"><span class="mono" style="width:6.5em">${a}</span><span style="color:var(--ink3)">${ic('next')}</span><div class="input" style="flex:1;min-height:40px;display:flex;align-items:center;padding:0 12px">${b}</div></div>`;
const rows = [['2026/10/12 10:12', '2', '6', '林小宇', '陳怡安', '王品妍', '周冠宇'], ['2026/10/12 10:13', '2', '17', '趙子安', '林小宇', '王品妍', '蔡佳穎'], ['2026/10/12 10:15', '2', '9', '周宜靜', '林小宇', '李冠廷', '周冠宇'], ['2026/10/12 10:15', '2', '21', '張語彤', '陳怡安', '王品妍', '周冠宇']];
const menu = ['時間戳記', '班級', '座號', '姓名', '投票選項（單選）', '量表題', '複選題', '開放題', '不使用這欄'].map((t, i) => `<div class="qrow"${i === 4 ? ' aria-current="true"' : ''} style="min-height:36px">${i === 4 ? ic('check') : '<span style="width:1.2em"></span>'}<span style="flex:1">${t}</span></div>`).join('');
F.push(D('D18 桌機：選擇欄位用途（下拉選單）｜手機用底部面板，桌機改成貼在欄位旁的下拉選單。選項 40px 高，目前選的打勾；點外面或按 Esc 關閉，鍵盤可用 ↑ ↓ Enter。', 2,
  `${body(pane(520, `${h('欄位對應', '系統已猜好，不對的才需要改。')}${cols.slice(0, 5).map((c, i) => maprow(c[0], c[1], i === 4)).join('')}<div style="position:absolute;left:216px;top:300px;width:300px;background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:0 8px 24px var(--shadow-sm);padding:6px;z-index:2">${menu}</div>${maprow('風紀股長', '風紀股長（票選）', false)}`, 'padding:20px;border-right:1px solid var(--line-soft);overflow:hidden;position:relative'), flex1(`${h('資料預覽', '前 4 列，共 41 列')}${fbox(`<table style="border-collapse:collapse;width:100%;font-size:var(--fs-sm)"><thead><tr>${['時間戳記', '班級', '座號', '姓名', '班長', '副班長', '風紀股長'].map((c, i) => `<th style="${th}${i === 4 ? ';background:var(--accent-soft);color:var(--accent-ink)' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="${td}${i === 4 ? ';background:var(--accent-soft)' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`)}`, 'padding:20px;overflow:hidden;gap:14px'))}${nav('下一步：看統計')}`));

// D19 報告回饋欄位對應
const crit = [['內容完整', '5、4、4、3…', 30], ['創意', '4、4、5、3…', 25], ['表達', '4、5、4、4…', 25], ['團隊合作', '5、5、4、4…', 20]];
F.push(D('D19 桌機：欄位對應（報告回饋）｜類型不同，欄位種類也不同：評分者、被評對象、評分項目（含權重）。權重即時加總，必須等於 100%；右邊一直看得到合計。', 2,
  `${body(main(`${h('欄位對應：報告回饋', '指定誰評、評誰、用哪幾項規準。')}${fbox(`<table style="border-collapse:collapse;width:100%;font-size:var(--fs-md)"><thead><tr><th style="${th}">欄位</th><th style="${th}">範例內容</th><th style="${th}">用途</th><th style="${th};text-align:right">權重</th></tr></thead><tbody><tr><td style="${td}">姓名</td><td style="${td}" class="muted">陳家豪、林雅婷…</td><td style="${td}">${tag('評分者', 'accent')}</td><td style="${td}"></td></tr><tr><td style="${td}">被評組別</td><td style="${td}" class="muted">第 1 組、第 3 組…</td><td style="${td}">${tag('被評對象', 'accent')}</td><td style="${td}"></td></tr>${crit.map(([n, s, w]) => `<tr><td style="${td}">${n}</td><td style="${td}" class="muted">${s}</td><td style="${td}">${tag('量表', '')}</td><td style="${td};text-align:right"><b>${w}%</b></td></tr>`).join('')}<tr><td style="${td}">優點與建議</td><td style="${td}" class="muted">報告條理清楚…</td><td style="${td}">${tag('開放題', '')}</td><td style="${td}"></td></tr></tbody></table>`)}`), rside(340, `${h('合計')}${tiles([['評分者', 41], ['被評對象', '8 組']])}${tile('權重合計', '100%', 'ok')}${notice('ok', 'check', '權重合計 100%，可以往下。若不等於 100%，「下一步」會停用，並指出差多少。')}`))}${nav('下一步')}`));

// D20 匯入學生名單
F.push(D('D20 桌機：匯入學生名單｜左邊三種方式（貼上、開檔、略過），中間貼上名單並即時顯示辨識人數；名單只在記憶體，不會存起來。', 2,
  `${body(side(300, `${rail('匯入方式')}${rcard('貼上名單', '每行一位：座號 姓名', true)}${rcard('開啟名單檔', 'xlsx 或 csv，要有座號與姓名欄', false)}${rcard('先略過', '之後想用再回來', false)}`), main(`${h('匯入學生名單', '用來找出沒填的人、冒名與打錯的名字。可以先略過。')}<div class="input mono" style="min-height:300px;padding:14px;line-height:2;white-space:pre">1 王大明\n2 林雅婷\n3 陳家豪\n4 黃思穎\n5 林小宇\n6 陳怡安\n7 張子豪\n…</div><div style="display:flex;align-items:center;gap:8px">${tag('已辨識 42 位', 'ok')}<span class="small muted">座號 1–42，沒有重複</span></div>`), rside(320, `${h('隱私')}${notice('', 'lock', '名單只在這台電腦的記憶體裡，不會存起來，關閉頁面就清除。')}<p class="small muted" style="margin:0;line-height:1.7">也可以直接從 Excel 複製兩欄貼上，系統會自動分辨座號與姓名。</p>`))}${nav('匯入名單')}`));

// D21 名單對照：未填
const cmpTabs = (on) => `${rail('對照結果')}${nvr('未填', on === 0, tag('1', 'warn'))}${nvr('需確認', on === 1, tag('2', 'warn'))}${nvr('重複', on === 2, tag('1', 'warn'))}${nvr('全部', on === 3, tag('42'))}`;
F.push(D('D21 桌機：名單對照（未填）｜上方四個數字看全貌，左邊切換問題類型，中間列出明細。未填的人可一鍵複製名單去提醒同學。', 2,
  `${body(side(260, cmpTabs(0)), main(`${tiles([['已對應', 39], ['需確認', 2, 'warn'], ['未填', 1, 'warn'], ['重複', 1, 'warn']])}${h('未填 1 位', '名單有、問卷沒有')}${fbox(`<table style="border-collapse:collapse;width:100%;font-size:var(--fs-md)"><thead><tr><th style="${th}">座號</th><th style="${th}">姓名</th><th style="${th}">狀態</th></tr></thead><tbody><tr><td style="${td}">23</td><td style="${td}">吳家豪</td><td style="${td}">${tag('未填', 'warn')}</td></tr></tbody></table>`)}<div>${btn('複製未填名單', 'secondary', { icon: 'copy' })}</div>`), rside(320, `${h('怎麼算的')}<p class="small" style="margin:0;line-height:1.8">42 位學生中，41 位有填答。收到 42 份表單，其中 1 份是重複填答。</p>${notice('', 'info', '未填不代表缺考；系統只列出，不會替你判斷。')}`))}${nav('完成對照')}`));

// D22 名單對照：需確認
const guess = (a, b, n) => `<div class="qcard" style="gap:10px;padding:14px 16px"><div style="display:flex;align-items:center;gap:12px"><div><div class="small muted">填答的名字</div><b style="font-size:var(--fs-lg)">${a}</b></div><span style="color:var(--ink3)">${ic('next')}</span><div><div class="small muted">名單裡最接近</div><b style="font-size:var(--fs-lg)">${b}（${n} 號）</b></div></div><div style="display:flex;gap:8px">${btn('是同一人', 'primary', { sm: true })}${btn('不是，另選', 'secondary', { sm: true })}${btn('排除這筆', 'secondary', { sm: true })}</div></div>`;
F.push(D('D22 桌機：名單對照（需確認）｜打錯名字或冒名的情況。系統猜最接近的人，老師一鍵確認，不用自己查；三個按鈕橫排在每張卡上。', 2,
  `${body(side(260, cmpTabs(1)), main(`${tiles([['已對應', 39], ['需確認', 2, 'warn'], ['未填', 1, 'warn'], ['重複', 1, 'warn']])}${h('需確認 2 筆', '名字和名單對不上，請確認是不是同一人。')}${guess('王小明', '王大明', 1)}${guess('林雅挺', '林雅婷', 2)}`), rside(320, `${h('系統怎麼猜')}<p class="small" style="margin:0;line-height:1.8">比較字形相近與座號，找出名單裡最接近的一位。只提供建議，不會自動套用。</p>${notice('warn', 'warn', '「排除這筆」不會刪除原始資料，只是不納入統計。')}`))}${nav('完成對照')}`));

write('frag-b16.html', F);
addPages({ id: 'desk-a', short: '桌機：資料進來與檢查', name: '桌機-資料進來與檢查', title: '桌機（1280）：資料進來與檢查', intro: '選檔來源、讀取中與錯誤、瀏覽器過舊、準備資料總覽、問卷類型、欄位對應、名單匯入與對照。人名與數字皆為虛構。', frag: 'frag-b16.html' });
console.log(F.length);
