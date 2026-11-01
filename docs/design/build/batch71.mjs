// 選課分組志願（2026-11-01 定案後出稿）：手機、平板、桌機各一個模擬頁。
// 需求：docs/decisions/2026-11-01-選課分組志願裁示.md；資料形狀：src/core/course.ts（Course／Applicant／Assignment）。
// 執行：node batch71.mjs   →  寫入 ../mockups/{手機,平板,桌機}-選課分組志願.html
// 全部是虛構課程與學生。第一版輸出只有分組名單、待安排名單、志願命中統計；公布版與個人通知單不畫（後續）。
import fs from 'node:fs';
import * as K from './m2kit.mjs';
import * as DK from './deskkit.mjs';

const { ic, tag, btn, notice, tile, seg, chips, rcard, opt, rowbtn, brow, scr, act, mbar, mframe, mframeWH, sheet } = K;
const { D, side, main, rside, modal, mhead, mfoot, body, h: dh, frameWH, topbar } = DK;
const icbtn = K.L.icbtn;
const sp = K.sp;
const rd = (f) => fs.readFileSync(f, 'utf8');
const repo = sp + '/../../..';
const mh = (t, s) => `<h1 style="font-size:var(--fs-xl);margin:0">${t}</h1>${s ? `<p class="small muted" style="margin:0">${s}</p>` : ''}`;

// 這個類型的第 3 步叫「名額與分配」（草稿 §5.2；其他類型仍叫「統計」）
K.NAMES[2] = '名額與分配';
DK.W.STEP_NAMES[2] = '名額與分配';

// ---------- 虛構資料 ----------
// [課程, 名額, 最少, 已分到, 第1志願報名]
const C = [
  ['微積分', 30, 10, 30, 39],
  ['生物實驗', 25, null, 25, 28],
  ['地球探索', 20, 15, 12, 14],
  ['程式設計', 8, null, 8, 7],
  ['攝影社', 15, null, 15, 6],
];
// [座號, 姓名, 第幾志願, 旗標]
const S = [
  [3, '王小明', 1, {}],
  [7, '林小美', 2, {}],
  [11, '陳怡安', 1, { pri: 1 }],
  [15, '張子豪', 1, {}],
  [18, '黃思穎', 3, {}],
  [22, '周家豪', 1, { manual: 1 }],
];
const PEND = [
  [5, '李宛庭', '志願都滿了'], [9, '吳柏翰', '志願都滿了'], [14, '蔡承恩', '志願都滿了'],
  [26, '許雅婷', '志願都滿了'], [31, '鄭宇軒', '沒填志願'], [38, '謝佩珊', '沒填志願'],
];
let uid = 0;
const nf = (label, value, o = {}) => { const id = 'f' + ++uid; return `<div class="field"><label for="${id}">${label}</label><input class="input${o.err ? ' err' : ''}" id="${id}" value="${value}" inputmode="numeric" style="text-align:right;font-variant-numeric:tabular-nums"${o.dis ? ' disabled' : ''}>${o.err ? `<span class="errmsg">${o.err}</span>` : o.hint ? `<span class="hint">${o.hint}</span>` : ''}</div>`; };
const rankTag = (r) => tag(`第${r}志願`, r === 1 ? 'accent' : '');
const flagTags = (f) => `${f.pri ? tag('優先', 'ok') : ''}${f.manual ? tag('手動', 'warn') : ''}`;

// 課程列 .crow：.brow 加標籤與箭頭，整列可點
function crow(c, o = {}) {
  const [nm, cap, min, got, reg] = c;
  const n = o.n ?? got;
  const over = n > cap;
  const low = min != null && n < min;
  const full = n === cap;
  const tags = `${over ? tag(`超額 ${n - cap} 人`, 'warn') : full ? tag('已滿', 'warn') : ''}${low ? tag(`建議停開（低於最少 ${min}）`, 'warn') : ''}`;
  const kind = over || low ? 'tie' : 'lead';
  const pct = Math.min(100, Math.round((n / cap) * 100));
  const hint = o.noReg ? '' : `<div class="small muted">第 1 志願報名 ${reg} 人${min != null ? ` · 最少開班 ${min}` : ''}</div>`;
  return `<button class="crow${o.cur ? ' cur' : ''}" type="button"${o.cur ? ' aria-current="true"' : ''}><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">${brow(nm, `${n}／${cap}`, pct, kind, tags).replace(/ · \d+%/, '')}${hint}</div>${o.chev === false ? '' : `<span style="color:var(--ink2)">${ic('next')}</span>`}</button>`;
}
const pendRow = (o = {}) => `<button class="crow${o.cur ? ' cur' : ''}" type="button"${o.cur ? ' aria-current="true"' : ''}><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><div style="display:flex;gap:8px;align-items:center"><b>待安排</b>${tag('6 人', 'warn')}</div><div class="small muted">4 人志願都滿了 · 2 人沒填志願</div></div>${o.chev === false ? '' : `<span style="color:var(--ink2)">${ic('next')}</span>`}</button>`;
const srow = ([no, nm, r, f], o = {}) => `<div class="srow"${o.drag ? ' style="box-shadow:0 6px 18px var(--shadow);transform:scale(1.02);border-color:var(--accent)"' : ''}>${o.grip ? `<span style="color:var(--ink3);flex:none" aria-hidden="true">${ic('grip')}</span>` : ''}<span class="no">${String(no).padStart(2, '0')}</span><b style="flex:1;min-width:0">${nm}</b>${rankTag(r)}${flagTags(f)}${o.noMove ? '' : btn('移到…', 'secondary', { sm: true })}</div>`;
const prow = ([no, nm, why], o = {}) => `<div class="srow"><span class="no">${String(no).padStart(2, '0')}</span><b style="flex:1;min-width:0">${nm}</b>${tag(why, why === '沒填志願' ? '' : 'warn')}${btn('放入…', 'secondary', { sm: true })}</div>`;
const tilesAll = (a, b, c) => `<div class="tiles3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${tile('已分配', a)}${tile('第 1 志願達成', b)}${tile('待安排', c, 'warn')}</div>`;
const seedRow = (o = {}) => `<div class="qcard" style="padding:10px 14px;gap:8px;flex-direction:row;align-items:center;flex-wrap:wrap"><span style="display:inline-flex;gap:8px;align-items:center;flex:1;min-width:140px">${ic('dice')}<span><b>抽籤種子 4821</b><br><span class="small muted">同資料同種子，結果一樣</span></span></span><span style="display:flex;gap:8px">${btn('重新抽籤', 'secondary', { sm: true })}${btn('固定結果', 'ghost', { sm: true })}</span></div>`;
const fgoogle = (t) => `<span class="small muted">${t} ${tag('待核對')}</span>`;
const checkRow = (label, sub, on = true) => `<label class="qcard" style="padding:12px 14px;gap:4px;flex-direction:row;align-items:flex-start;cursor:pointer"><input type="checkbox" ${on ? 'checked' : ''} aria-label="${label}" style="margin-top:4px;width:20px;height:20px;flex:none"><span style="flex:1"><b>${label}</b><br><span class="small muted">${sub}</span></span>${tag('xlsx')}</label>`;
const hitRows = () => `${brow('第 1 志願', '68 人', 71, 'lead')}${brow('第 2 志願', '15 人', 16, '')}${brow('第 3 志願', '7 人', 7, '')}${brow('待安排', '6 人', 6, 'tie')}`;
const hitCourse = () => C.map((c) => brow(c[0], `${c[3]}／${c[1]}`, Math.round((c[3] / c[1]) * 100), c[3] === c[1] ? 'lead' : '', `<span class="small muted">報名 ${c[4]}</span>`).replace(/ · \d+%/, '')).join('');
const privacy = notice('', 'info', '分組名單含學生姓名，請像對待名單一樣保管。公布版與個人通知單之後再加。');

// ====================================================================
// 手機
// ====================================================================
const P = [];
const pl = (H, cap, ...r) => P.push(K.mlong(H, cap, ...r));
const pf = (cap, ...r) => P.push(mframe(cap, ...r));
const prepBar = K.msteps(2);

pf('C1 問卷類型：第五種「選課分組志願」｜準備資料第一件事「這是哪一種問卷？」多一張選項卡（原本票選、意見調查、報告回饋三張，歷次趨勢從別處進入）。欄名含「第一志願」「第二志願」時偵測並標「建議」。選項卡說明一句話講清楚能做什麼；選取外框與 5.2 一致。Google 表單怎麼收志願放在連結列，字樣待核對（硬規則 10）。', mbar('準備資料', { right: null }), prepBar, scr(`${mh('這是哪一種問卷？')}${notice('', 'info', '看起來像「選課分組志願」（欄名有「第一志願」「第二志願」「第三志願」），你可以更改。')}<div role="radiogroup" aria-label="問卷類型" style="display:flex;flex-direction:column;gap:8px">${rcard('選課分組志願 ' + tag('建議', 'accent'), '學生填第 1～N 志願：依名額分組，超額可重現抽籤，可手動調整', true, 'min-height:76px')}${rcard('票選幹部', '選班長、副班長等：算每個人得幾票、誰當選、同票怎麼辦', false, 'min-height:76px')}${rcard('意見調查', '活動滿意、教學回饋：每題的分布、平均，與開放意見整理', false, 'min-height:76px')}${rcard('報告回饋', '同學互評、小組報告：每位被評對象的各項平均與同學的具體回饋', false, 'min-height:76px')}</div><div class="small" style="color:var(--ink2)">${ic('help')} 怎麼用 Google 表單收志願？${fgoogle('選「選擇題方格」，勾選「每欄限選一個回應」')}</div>`, 12), act(btn('確認，下一步：欄位對應', 'primary', { block: true })));

pl(780, 'C2 欄位對應：新增「志願」角色｜志願欄用 .rowbtn 列出：左欄名與範例、右標籤「志願 1」「志願 2」…。順序由欄名自動猜（含「第一」「第二」或「第1志願」），猜的列加警示外框與「請確認」。順序可在面板調整；志願數不寫死（預設 3，可增減）。姓名、座號沿用既有。', mbar('欄位對應', { right: null }), prepBar, scr(`${notice('warn', 'warn', '已智慧判斷，3 欄請確認')}${rowbtn('姓名', '範例：王小明', tag('姓名', 'ok'), false)}${rowbtn('座號', '範例：3', tag('座號', 'ok'), false)}${rowbtn('第一志願', '範例：微積分', tag('志願 1', 'accent') + ' ' + tag('請確認', 'warn'), true)}${rowbtn('第二志願', '範例：生物實驗', tag('志願 2', 'accent') + ' ' + tag('請確認', 'warn'), true)}${rowbtn('第三志願', '範例：地球探索', tag('志願 3', 'accent') + ' ' + tag('請確認', 'warn'), true)}${btn('＋ 新增一個志願欄', 'ghost', { icon: 'plus' })}<div class="small muted">沒有使用的欄（1）· 時間戳記 · 仍看得到，隨時找回</div>`, 10), act(btn('上一步', 'secondary'), btn('完成對應，下一步', 'primary', { block: true })));

pf('C3 欄位角色面板：選「志願」｜點欄位列開底部面板；單選欄位角色，新增「志願（第幾志願）」。選了之後面板下半出現「第幾志願」籌碼（1、2、3…，數量依實際有的欄）。同一個志願序不能重複：已被別欄用掉的籌碼停用並標「已用」。', mbar('欄位對應', { right: null }), prepBar, scr(rowbtn('第二志願', '範例：生物實驗', tag('志願 2', 'accent'), false), 10), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="第二志願是哪一種欄位？"><div class="grab"></div><h3>「第二志願」是哪一種欄位？</h3><p class="sub">範例答案：生物實驗、地球探索、微積分</p><div role="radiogroup" aria-label="欄位種類" style="display:flex;flex-direction:column;gap:2px">${opt('姓名')}${opt('座號')}${opt('志願（第幾志願）', true, '學生填的第 N 志願課程')}${opt('略過這一欄')}</div><div class="small muted" style="font-weight:700;margin-top:8px">第幾志願</div>${chips(['1（已用）', '2', '3'], 1)}${btn('套用', 'primary', { block: true })}</div>`);

pl(700, 'C4 志願方格合併｜用「選擇題方格」收志願時，匯出是一個志願一欄。小幫手把同一題的各列合併成一組志願，一列顯示就好；展開可看每個志願對到哪一欄。對不上的欄單獨列出，由老師決定放入或略過。（欄名格式依實際匯出核對，待核對。）', mbar('欄位對應', { right: null }), prepBar, scr(`${notice('', 'info', '偵測到「選擇題方格」：3 欄合併成一組志願。')}${rowbtn('志願方格：選課志願', '第一志願 → 第二志願 → 第三志願', tag('志願 1～3', 'accent'), false)}<div class="qcard" style="padding:12px 14px;gap:6px"><b>展開</b>${[['志願選課 [第一志願]', '志願 1'], ['志願選課 [第二志願]', '志願 2'], ['志願選課 [第三志願]', '志願 3']].map(([a, b]) => `<div style="display:flex;justify-content:space-between;gap:8px"><span>${a}</span>${tag(b, 'accent')}</div>`).join('')}</div><div style="color:var(--ink2)" class="small">${ic('warn')} 1 欄對不上：</div>${rowbtn('備註', '範例：想上程式', tag('略過'), true)}<div class="small muted">匯出欄名格式${fgoogle('以實際匯出為準')}</div>`, 10), act(btn('上一步', 'secondary'), btn('完成對應，下一步', 'primary', { block: true })));

const coursesSetup = (rows) => rows.map((c) => `<div class="qcard" style="padding:12px 14px;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>${c[0]}</b><span class="small muted">第 1 志願 ${c[4]} 人</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${nf('名額', c[1])}${nf('最少開班人數（選填）', c[2] ?? '—')}</div></div>`).join('');
pl(1340, 'C5 步驟 3「名額與分配」：名額與規則｜每個課程一張卡：名稱、第 1 志願報名人數、「名額」「最少開班人數（選填）」兩個數字輸入（48 高）。表單選項與課程名對不上時列出，一鍵合併。下方：優先名單、抽籤種子；主按鈕「開始分配」。最少開班人數只用來標「建議停開」，不會自動重分。', mbar('名額與分配', { right: null }), K.msteps(3), scr(`${mh('每個課程收幾人？', '名額填多少就收多少，之後還能手動調整。')}${notice('warn', 'warn', '有 1 個課程名和表單選項對不上<br>「地球 探索」→ 合併到「地球探索」？', btn('合併', 'secondary', { sm: true }) + btn('不合併', 'ghost', { sm: true }))}${coursesSetup(C)}${rowbtn('優先名單', '同課超額時，優先的人先取得名額', tag('2 人') , false)}${rowbtn('抽籤種子', '同資料同種子，結果一樣', tag('4821'), false)}`, 10), act(btn('上一步', 'secondary'), btn('開始分配', 'primary', { block: true })));

pl(1250, 'C6 步驟 3「名額與分配」：結果｜頂端三塊數字磚（已分配、第 1 志願達成、待安排，需要處理的用警示色）、種子列、課程列 .crow（名稱＋人數／名額＋長條；已滿與建議停開用標籤，不只靠顏色）、待安排列。點課程列開名單面板。', mbar('名額與分配', { right: null }), K.msteps(3), scr(`${tilesAll('90／96', '71%', '6')}${seedRow()}${C.map((c) => crow(c)).join('')}${pendRow()}${notice('warn', 'warn', '<b>地球探索只有 12 人，低於最少 15 人</b><br>建議停開。小幫手不會自動重分，要不要開由你決定。', btn('看這 12 人', 'secondary', { sm: true }))}`, 10), act(btn('上一步', 'secondary'), btn('確認，下一步：輸出', 'primary', { block: true })));

pf('C7 課程名單面板｜點課程列，底部面板列出該課學生：座號、姓名、第幾志願標籤（優先、手動另有標籤）、每列「移到…」。名單可捲動；每列 52 高、按鈕 44 高。不靠拖曳。面板底部「完成」關閉。', mbar('名額與分配', { right: null }), K.msteps(3), scr(`${tilesAll('90／96', '71%', '6')}${crow(C[0])}`, 10), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="微積分名單"><div class="grab"></div><h3>微積分　30／30</h3><p class="sub">已滿 · 第 1 志願 39 人，其中 9 人沒抽中，往下一志願</p><div style="display:flex;flex-direction:column;gap:6px;max-height:430px;overflow:hidden">${S.map((s) => srow(s)).join('')}</div><div class="small muted" style="text-align:center">共 30 人，向下捲動看全部</div>${btn('完成', 'primary', { block: true })}</div>`);

pf('C8 「移到…」選課程面板｜點某位學生的「移到…」開第二層面板：列出所有課程，每項寫目前人數／名額；已滿的標「已滿，移入會超額」。選了超額的課程，面板內出現警示但仍可確認（老師決定）。另有「待安排」。主按鈕文字隨選項變：「移到生物實驗」。', mbar('名額與分配', { right: null }), K.msteps(3), scr(crow(C[0]), 10), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="把王小明移到"><div class="grab"></div><h3>把 03 王小明移到…</h3><p class="sub">目前在微積分 · 第 1 志願</p><div role="radiogroup" aria-label="課程" style="display:flex;flex-direction:column;gap:2px">${opt('生物實驗', true, '25／25 · 已滿，移入會超額')}${opt('地球探索', false, '12／20 · 他填第 2 志願')}${opt('程式設計', false, '8／8 · 已滿，移入會超額')}${opt('攝影社', false, '15／15 · 已滿，移入會超額')}${opt('待安排', false, '先不放進任何課程')}</div>${notice('warn', 'warn', '移入後生物實驗 26／25，超額 1 人。仍可保留，由你決定。')}${btn('移到生物實驗', 'primary', { block: true })}</div>`);

pl(1070, 'C9 手動移動後的結果｜移人後該課程的列馬上更新：超額的課程長條用警示色並寫「超額 1 人」，被動過的學生在名單裡有「手動」標籤。沒有彈跳視窗或確認對話框；「復原」放在提示內，一步回到移動前。', mbar('名額與分配', { right: null }), K.msteps(3), scr(`${tilesAll('90／96', '70%', '6')}${notice('', 'info', '已把 03 王小明從微積分移到生物實驗。', btn('復原', 'secondary', { sm: true }))}${crow(C[0], { n: 29 })}${crow(C[1], { n: 26 })}${crow(C[2])}${crow(C[3])}${crow(C[4])}${pendRow()}`, 10), act(btn('上一步', 'secondary'), btn('確認，下一步：輸出', 'primary', { block: true })));

pf('C10 待安排面板｜點「待安排」列：每人寫原因（志願都滿了／沒填志願）與「放入…」，放入時開和 C8 同樣的選課程面板。原因用文字標籤，不只靠顏色。可「全部放入同一課」不做（避免誤操作）。', mbar('名額與分配', { right: null }), K.msteps(3), scr(pendRow({ cur: 1 }), 10), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="待安排名單"><div class="grab"></div><h3>待安排　6 人</h3><p class="sub">沒分到任何一個志願的人，由你決定放到哪裡。</p><div style="display:flex;flex-direction:column;gap:6px">${PEND.map((p) => prow(p)).join('')}</div>${btn('完成', 'primary', { block: true })}</div>`);

pf('C11 優先名單面板｜選少數學生優先（例如特殊需求）。同課超額時優先者先取得名額，其餘照抽籤；不加權、不看成績。搜尋框加已選清單，勾選列 52 高。已選數量寫在標題。', mbar('名額與分配', { right: null }), K.msteps(3), scr(rowbtn('優先名單', '同課超額時，優先的人先取得名額', tag('2 人'), false), 10), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="優先名單"><div class="grab"></div><h3>優先名單　已選 2 人</h3><p class="sub">只在同一課超額時有差別，其餘照抽籤。</p><input class="input" value="" placeholder="搜尋座號或姓名" aria-label="搜尋"><div style="display:flex;flex-direction:column;gap:2px">${[[11, '陳怡安', true], [3, '王小明', false], [7, '林小美', true], [15, '張子豪', false]].map(([n, nm, on]) => `<label class="srow" style="cursor:pointer"><input type="checkbox" ${on ? 'checked' : ''} aria-label="${nm}" style="width:22px;height:22px;flex:none"><span class="no">${String(n).padStart(2, '0')}</span><b style="flex:1">${nm}</b>${on ? tag('優先', 'ok') : ''}</label>`).join('')}</div>${btn('完成', 'primary', { block: true })}</div>`);

pl(1040, 'C12 步驟 4 輸出：新增三種檔案｜沿用輸出頁的檔案卡（勾選＋說明＋格式標籤）。第一版三項預設開：分組名單（每課一張工作表＋總表）、待安排名單、志願命中統計（第 1 志願達成率、各課報名人數與名額比，附長條圖）。分配紀錄（種子、規則、名額、時間）放在名單裡。公布版與個人通知單不在第一版。', mbar('輸出', { right: null }), K.msteps(4), scr(`${mh('要輸出什麼？')}${checkRow('分組名單', '每個課程一張工作表，加一張總表（座號、姓名、課程、第幾志願）')}${checkRow('待安排名單', '沒分到的人與原因')}${checkRow('志願命中統計', '第 1 志願達成率、各課報名人數與名額比')}<div class="qcard" style="padding:12px 14px;gap:10px"><b>志願命中統計預覽</b>${hitRows()}</div><div class="small muted">${ic('dice')} 分配紀錄：種子 4821 · 逐志願輪＋可重現抽籤 · 名額 98 · 2026/11/01 14:20</div>${privacy}`, 12), act(btn('上一步', 'secondary'), btn('產生並下載', 'primary', { block: true })));

pl(780, 'C13 名額頁的提示狀態｜①總名額少於填答人數（警示，不擋）：寫出差多少人。②沒有任何志願欄被對應（錯誤，擋下，附回上一步）。③全部名額為 0 或未填（主按鈕停用，旁邊寫原因）。④名單外的學生填了表單（沿用名單對照，列出讓老師決定納入與否）。⑤最少開班人數大於名額（輸入框紅框加說明）。', mbar('名額與分配', { right: null }), K.msteps(3), scr(`${notice('warn', 'warn', '名額合計 90，填答 96 人，至少 6 人會進待安排。')}${notice('bad', 'warn', '<b>還沒指定哪些欄位是志願</b><br>請先在步驟 2 指定哪些欄位是志願。', btn('回欄位對應', 'secondary', { sm: true }))}${notice('', 'info', '2 位學生不在名單上（座號 41、43）。', btn('看是誰', 'secondary', { sm: true }) + btn('納入', 'ghost', { sm: true }))}<div class="qcard" style="padding:12px 14px;gap:10px"><b>攝影社</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${nf('名額', 15)}${nf('最少開班人數（選填）', 18, { err: '最少不能大於名額 15' })}</div></div>`, 10), act(btn('上一步', 'secondary'), btn('開始分配', 'primary', { block: true, dis: true })), `<div class="small muted" style="padding:0 16px 8px">主按鈕停用：還有課程名額沒填，或全部名額為 0。</div>`);

// ====================================================================
// 平板（820）：自訂左欄＋右側內容
// ====================================================================
const T = [];
const rail = (title, items, cur) => `<div class="small muted" style="font-weight:700;padding:4px 12px">${title}</div>${items.map((x, i) => `<div class="qrow"${i === cur ? ' aria-current="true"' : ''}><span style="flex:1">${x}</span></div>`).join('')}`;
const tbar = (title, step) => `<div class="appbar" style="padding:0 12px;gap:10px"><span class="brand">${ic('bars')}</span><b style="font-size:17px;white-space:nowrap">${title}</b><div style="margin-left:auto;width:360px">${K.msteps(step)}</div>${icbtn('refresh', '重新開始')}${icbtn('gear', '設定')}</div>`;
const tab = (cap, step, railHtml, right, foot = '', over = '', H = 900, o = {}) => mframeWH(cap + '（平板：左欄＋右側內容）', 820, H, `${tbar('問卷回饋小幫手', step)}<div style="flex:1;min-height:0;display:flex"><div class="pane" style="width:${o.railW || 236}px;padding:12px 8px;border-right:1px solid var(--line-soft);background:var(--card);gap:${o.railGap ?? 2}px">${railHtml}</div><div class="pane" style="flex:1;padding:12px 16px;align-items:stretch;gap:12px;overflow:hidden">${right}</div></div>${foot ? `<div class="actbar desk" style="justify-content:flex-end">${foot}</div>` : ''}${over}`, 24);
const prepRail = rail('準備資料', ['問卷類型', '欄位對應', '學生名單（選用）', '資料檢查'], 0);
const step3Rail = (cur) => rail('名額與分配', ['名額與規則', '分配結果', '待安排名單'], cur);
const sideSheet = (title, sub, inner, foot) => `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="${title}" style="left:auto;right:0;top:0;bottom:0;width:400px;border-radius:var(--r-lg) 0 0 var(--r-lg);padding:24px 20px;justify-content:flex-start;box-shadow:-8px 0 24px var(--shadow);overflow:hidden"><h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}${inner}${foot || ''}</div>`;

T.push(tab('C1 問卷類型：第五種「選課分組志願」', 2, prepRail, `${mh('這是哪一種問卷？')}${notice('', 'info', '看起來像「選課分組志願」（欄名有「第一志願」「第二志願」「第三志願」），你可以更改。')}<div role="radiogroup" aria-label="問卷類型" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${rcard('選課分組志願 ' + tag('建議', 'accent'), '學生填第 1～N 志願：依名額分組，超額可重現抽籤，可手動調整', true, 'min-height:96px')}${rcard('票選幹部', '選班長、副班長等：算每個人得幾票、誰當選', false, 'min-height:96px')}${rcard('意見調查', '活動滿意、教學回饋：每題分布、平均，與開放意見', false, 'min-height:96px')}${rcard('報告回饋', '同學互評、小組報告：每位被評對象的各項平均', false, 'min-height:96px')}</div><div class="small" style="color:var(--ink2)">${ic('help')} 怎麼用 Google 表單收志願？${fgoogle('選「選擇題方格」，勾選「每欄限選一個回應」')}</div>`, btn('確認，下一步：欄位對應', 'primary'), '', 700));

T.push(tab('C2 欄位對應：「志願」角色', 2, rail('準備資料', ['問卷類型', '欄位對應', '學生名單（選用）', '資料檢查'], 1), `${notice('warn', 'warn', '已智慧判斷，3 欄請確認')}${rowbtn('姓名', '範例：王小明', tag('姓名', 'ok'), false)}${rowbtn('座號', '範例：3', tag('座號', 'ok'), false)}${rowbtn('第一志願', '範例：微積分', tag('志願 1', 'accent') + ' ' + tag('請確認', 'warn'), true)}${rowbtn('第二志願', '範例：生物實驗', tag('志願 2', 'accent') + ' ' + tag('請確認', 'warn'), true)}${rowbtn('第三志願', '範例：地球探索', tag('志願 3', 'accent') + ' ' + tag('請確認', 'warn'), true)}${btn('＋ 新增一個志願欄', 'ghost', { icon: 'plus' })}<div class="small muted">沒有使用的欄（1）· 時間戳記</div>`, btn('上一步', 'secondary') + btn('完成對應，下一步', 'primary'), sideSheet('「第二志願」是哪一種欄位？', '範例答案：生物實驗、地球探索、微積分', `<div role="radiogroup" aria-label="欄位種類" style="display:flex;flex-direction:column;gap:2px">${opt('姓名')}${opt('座號')}${opt('志願（第幾志願）', true, '學生填的第 N 志願課程')}${opt('略過這一欄')}</div><div class="small muted" style="font-weight:700;margin-top:8px">第幾志願</div>${chips(['1（已用）', '2', '3'], 1)}`, btn('套用', 'primary', { block: true })), 800));

T.push(tab('C5 步驟 3：名額與規則', 3, step3Rail(0), `${mh('每個課程收幾人？', '名額填多少就收多少，之後還能手動調整。')}${notice('warn', 'warn', '有 1 個課程名和表單選項對不上：「地球 探索」→ 合併到「地球探索」？', btn('合併', 'secondary', { sm: true }))}<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);background:var(--card);overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-sm)"><thead><tr style="background:var(--sunk)">${['課程', '第 1 志願', '名額', '最少開班（選填）'].map((x, i) => `<th style="text-align:${i ? 'right' : 'left'};padding:8px 10px">${x}</th>`).join('')}</tr></thead><tbody>${C.map((c) => `<tr><td style="padding:6px 10px;border-top:1px solid var(--line-soft);font-weight:700">${c[0]}</td><td style="padding:6px 10px;border-top:1px solid var(--line-soft);text-align:right" class="muted">${c[4]} 人</td><td style="padding:6px 10px;border-top:1px solid var(--line-soft);width:110px">${nf('名額', c[1]).replace('<label', '<label class="sr"')}</td><td style="padding:6px 10px;border-top:1px solid var(--line-soft);width:130px">${nf('最少', c[2] ?? '—').replace('<label', '<label class="sr"')}</td></tr>`).join('')}</tbody></table></div>${rowbtn('優先名單', '同課超額時，優先的人先取得名額', tag('2 人'), false)}${rowbtn('抽籤種子', '同資料同種子，結果一樣', tag('4821'), false)}`, btn('上一步', 'secondary') + btn('開始分配', 'primary'), '', 900));

// 結果：左課程清單、右該課名單（草稿 §4）
const resultRight = (c, extra = '') => `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="margin:0;font-size:var(--fs-lg)">${c[0]}　${c[3]}／${c[1]}</h2>${c[3] === c[1] ? tag('已滿', 'warn') : ''}<span style="margin-left:auto">${btn('匯出此課', 'ghost', { sm: true })}</span></div>${extra}<div style="display:flex;flex-direction:column;gap:6px">${S.map((s) => srow(s)).join('')}</div><div class="small muted">共 ${c[3]} 人，向下捲動看全部</div>`;
const resultRail = (curIdx) => `<div style="display:flex;flex-direction:column;gap:8px">${tilesAll('90／96', '71%', '6').replace('repeat(3,1fr)', '1fr')}</div>`;
T.push(tab('C6／C7 步驟 3：分配結果', 3, `<div style="display:flex;flex-direction:column;gap:8px">${C.map((c, i) => crow(c, { cur: i === 0, noReg: true, chev: false })).join('')}${pendRow({ chev: false })}<div class="small muted" style="padding:4px 4px 0">${ic('dice')} 種子 4821 · 規則與種子可收合</div></div>`, `${tilesAll('90／96', '71%', '6')}${resultRight(C[0])}`, btn('上一步', 'secondary') + btn('確認，下一步：輸出', 'primary'), '', 1000, { railW: 300, railGap: 8 }));

T.push(tab('C8 「移到…」（側邊彈出）', 3, `<div style="display:flex;flex-direction:column;gap:8px">${C.map((c, i) => crow(c, { cur: i === 0, noReg: true, chev: false })).join('')}${pendRow({ chev: false })}</div>`, resultRight(C[0]), btn('上一步', 'secondary') + btn('確認，下一步：輸出', 'primary'), sideSheet('把 03 王小明移到…', '目前在微積分 · 第 1 志願', `<div role="radiogroup" aria-label="課程" style="display:flex;flex-direction:column;gap:2px">${opt('生物實驗', true, '25／25 · 已滿，移入會超額')}${opt('地球探索', false, '12／20 · 他填第 2 志願')}${opt('程式設計', false, '8／8 · 已滿，移入會超額')}${opt('攝影社', false, '15／15 · 已滿，移入會超額')}${opt('待安排', false, '先不放進任何課程')}</div>${notice('warn', 'warn', '移入後生物實驗 26／25，超額 1 人。仍可保留，由你決定。')}`, btn('移到生物實驗', 'primary', { block: true })), 1000, { railW: 300, railGap: 8 }));

T.push(tab('C10 待安排名單', 3, `<div style="display:flex;flex-direction:column;gap:8px">${C.map((c) => crow(c, { noReg: true, chev: false })).join('')}${pendRow({ cur: 1, chev: false })}</div>`, `<div style="display:flex;align-items:center;gap:8px"><h2 style="margin:0;font-size:var(--fs-lg)">待安排　6 人</h2></div><p class="small muted" style="margin:0">沒分到任何一個志願的人，由你決定放到哪裡。</p><div style="display:flex;flex-direction:column;gap:6px">${PEND.map((p) => prow(p)).join('')}</div>`, btn('上一步', 'secondary') + btn('確認，下一步：輸出', 'primary'), '', 900, { railW: 300, railGap: 8 }));

T.push(tab('C12 步驟 4 輸出', 4, rail('輸出', ['要輸出什麼', '檔案與進度', '完成'], 0), `${mh('要輸出什麼？')}${checkRow('分組名單', '每個課程一張工作表，加一張總表（座號、姓名、課程、第幾志願）')}${checkRow('待安排名單', '沒分到的人與原因')}${checkRow('志願命中統計', '第 1 志願達成率、各課報名人數與名額比')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="qcard" style="padding:12px 14px;gap:10px"><b>第幾志願分到</b>${hitRows()}</div><div class="qcard" style="padding:12px 14px;gap:10px"><b>各課人數／名額</b>${hitCourse()}</div></div><div class="small muted">${ic('dice')} 分配紀錄：種子 4821 · 逐志願輪＋可重現抽籤 · 名額 98 · 2026/11/01 14:20</div>${privacy}`, btn('上一步', 'secondary') + btn('產生並下載', 'primary'), '', 1300));

// ====================================================================
// 桌機（1280）
// ====================================================================
const DKS = [];
const df = (cap, step, inner, file, H, o) => DKS.push(D(cap, step, inner, file, H, o));
const FILE = '三年二班_選課志願.xlsx';
const prepSide = (cur) => side(260, `<div class="small muted" style="font-weight:700;padding:4px 12px">準備資料</div>${['問卷類型', '欄位對應', '學生名單（選用）', '資料檢查'].map((x, i) => DK.nvr(x, i === cur)).join('')}`);
const courseSide = (cur, o = {}) => side(300, `<div class="small muted" style="font-weight:700;padding:4px 12px">課程</div><div style="display:flex;flex-direction:column;gap:8px;padding:0 4px">${C.map((c, i) => crow(c, { cur: i === cur, noReg: true, chev: false, ...(o.over && i === o.over.i ? o.over.o : {}), ...(o.drop === i ? {} : {}) }).replace('class="crow', o.drop === i ? 'class="crow drop' : 'class="crow')).join('')}${pendRow({ cur: cur === 5, chev: false })}</div>`);
const rulesSide = (extra = '') => rside(300, `<b>規則與種子</b><div class="qcard" style="padding:12px 14px;gap:6px"><div class="small muted">分配方式</div><b>逐志願輪</b><div class="small muted" style="margin-top:6px">超額處理</div><b>可重現抽籤</b></div>${seedRow()}${rowbtn('優先名單', '2 人', '', false)}${rowbtn('分配紀錄', '種子、規則、名額、時間', '', false)}${extra}`);

df('C1 問卷類型：第五種「選課分組志願」｜桌機：左欄準備資料四件事，中間 2×2 選項卡，選課分組志願標「建議」。與其他類型同寬同高。', 2, `${body(prepSide(0), main(`${dh('這是哪一種問卷？')}${notice('', 'info', '看起來像「選課分組志願」（欄名有「第一志願」「第二志願」「第三志願」），你可以更改。')}<div role="radiogroup" aria-label="問卷類型" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${rcard('選課分組志願 ' + tag('建議', 'accent'), '學生填第 1～N 志願：依名額分組，超額可重現抽籤，可手動調整', true, 'min-height:96px')}${rcard('票選幹部', '選班長、副班長等：算每個人得幾票、誰當選、同票怎麼辦', false, 'min-height:96px')}${rcard('意見調查', '活動滿意、教學回饋：每題的分布、平均，與開放意見整理', false, 'min-height:96px')}${rcard('報告回饋', '同學互評、小組報告：每位被評對象的各項平均與同學的具體回饋', false, 'min-height:96px')}</div><div class="small" style="color:var(--ink2)">${ic('help')} 怎麼用 Google 表單收志願？${fgoogle('選「選擇題方格」，勾選「每欄限選一個回應」')}</div>`, 'gap:14px;max-width:820px'))}${DK.nav('確認，下一步：欄位對應', '回開啟')}`, FILE, 700);

df('C2 欄位對應：「志願」角色｜桌機：中間欄位列（整列可點，開置中對話框選角色），右側「志願順序」顯示目前 1→2→3，可上下移（順序也能在此改）；方格合併提示放右側。', 2, `${body(prepSide(1), main(`${notice('warn', 'warn', '已智慧判斷，3 欄請確認')}${rowbtn('姓名', '範例：王小明', tag('姓名', 'ok'), false)}${rowbtn('座號', '範例：3', tag('座號', 'ok'), false)}${rowbtn('第一志願', '範例：微積分', tag('志願 1', 'accent') + ' ' + tag('請確認', 'warn'), true)}${rowbtn('第二志願', '範例：生物實驗', tag('志願 2', 'accent') + ' ' + tag('請確認', 'warn'), true)}${rowbtn('第三志願', '範例：地球探索', tag('志願 3', 'accent') + ' ' + tag('請確認', 'warn'), true)}${btn('＋ 新增一個志願欄', 'ghost', { icon: 'plus' })}`, 'gap:10px;max-width:760px'), rside(340, `<b>志願順序</b><div class="small muted">欄名猜的順序，請確認。第 1 志願最優先。</div>${['第一志願', '第二志願', '第三志願'].map((x, i) => `<div class="qrow"><span style="flex:none;color:var(--ink3)">${ic('grip')}</span><span style="flex:1">${tag('志願 ' + (i + 1), 'accent')} ${x}</span>${icbtn('up', '上移')}${icbtn('down', '下移')}</div>`).join('')}<div class="small muted">用「選擇題方格」收的話，同一題的各列會自動合併成一組。${fgoogle('欄名格式依實際匯出')}</div>`))}${DK.nav('完成對應，下一步', '上一步')}`, FILE, 760);

df('C3 欄位角色對話框｜桌機置中對話框（寬 520）：欄位種類單選，選「志願」後下方出現「第幾志願」籌碼，已用的停用。', 2, `${body(prepSide(1), main(`${rowbtn('第二志願', '範例：生物實驗', tag('志願 2', 'accent'), false)}`, 'gap:10px;max-width:760px'))}${modal(520, `${mhead('「第二志願」是哪一種欄位？')}<div class="small muted">範例答案：生物實驗、地球探索、微積分</div><div role="radiogroup" aria-label="欄位種類" style="display:flex;flex-direction:column;gap:2px">${opt('姓名')}${opt('座號')}${opt('志願（第幾志願）', true, '學生填的第 N 志願課程')}${opt('略過這一欄')}</div><div class="small muted" style="font-weight:700">第幾志願</div>${chips(['1（已用）', '2', '3'], 1)}${mfoot(btn('取消', 'secondary'), btn('套用', 'primary'))}`)}`, FILE, 760);

df('C5 步驟 3：名額與規則｜桌機：中間課程表（名額、最少開班輸入框在表格內，Tab 依序走），右側規則與種子。表格在自己的容器內，不產生橫向捲動。', 3, `${body(side(240, `<div class="small muted" style="font-weight:700;padding:4px 12px">名額與分配</div>${['名額與規則', '分配結果', '待安排名單'].map((x, i) => DK.nvr(x, i === 0)).join('')}`), main(`${dh('每個課程收幾人？', '名額填多少就收多少，之後還能手動調整。')}${notice('warn', 'warn', '有 1 個課程名和表單選項對不上：「地球 探索」→ 合併到「地球探索」？', btn('合併', 'secondary', { sm: true }) + btn('不合併', 'ghost', { sm: true }))}<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);background:var(--card);overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-sm)"><thead><tr style="background:var(--sunk)">${['課程', '第 1 志願報名', '名額', '最少開班人數（選填）'].map((x, i) => `<th style="text-align:${i ? 'right' : 'left'};padding:8px 12px">${x}</th>`).join('')}</tr></thead><tbody>${C.map((c) => `<tr><td style="padding:6px 12px;border-top:1px solid var(--line-soft);font-weight:700">${c[0]}</td><td style="padding:6px 12px;border-top:1px solid var(--line-soft);text-align:right" class="muted">${c[4]} 人</td><td style="padding:6px 12px;border-top:1px solid var(--line-soft);width:140px">${nf('名額', c[1]).replace('<label', '<label class="sr"')}</td><td style="padding:6px 12px;border-top:1px solid var(--line-soft);width:200px">${nf('最少', c[2] ?? '—').replace('<label', '<label class="sr"')}</td></tr>`).join('')}</tbody></table></div><div class="small muted">總名額 98，填答 96 人。</div>`, 'gap:12px'), rside(320, `<b>規則與種子</b><div class="qcard" style="padding:12px 14px;gap:6px"><div class="small muted">分配方式</div><b>逐志願輪</b><div class="small muted" style="margin-top:6px">超額處理</div><b>可重現抽籤</b></div>${seedRow()}${rowbtn('優先名單', '同課超額時，優先的人先取得名額', tag('2 人'), false)}<div class="small muted">最少開班人數只用來標「建議停開」，不會自動重分。</div>`))}${DK.nav('開始分配', '上一步')}`, FILE, 800);

df('C6／C7 步驟 3：分配結果工作台（三欄）｜左欄課程（人數／名額長條＋已滿／建議停開標籤）、中欄選取課程的名單（搜尋、每列「移到…」、拖曳把手）、右欄規則與種子、分配紀錄。上方三塊數字磚。拖曳是加分功能，一律另有「移到…」按鈕與鍵盤操作。', 3, `${body(courseSide(0), main(`${tilesAll('90／96', '71%', '6')}<div style="display:flex;gap:8px;align-items:center"><h2 style="margin:0;font-size:var(--fs-lg)">微積分　30／30</h2>${tag('已滿', 'warn')}<span style="margin-left:auto;width:240px"><input class="input" placeholder="搜尋學生…" aria-label="搜尋學生"></span>${btn('匯出此課', 'ghost', { sm: true })}</div><div style="display:flex;flex-direction:column;gap:6px">${S.map((s) => srow(s, { grip: true })).join('')}</div><div class="small muted">共 30 人 · 拖曳左側把手到左邊的課程，或按「移到…」。</div>`, 'gap:12px'), rulesSide(notice('warn', 'warn', '<b>地球探索 12 人，低於最少 15 人</b><br>建議停開，由你決定。')))}${DK.nav('確認，下一步：輸出', '上一步')}`, FILE, 920);

df('C8 拖曳中｜按住把手 350ms（滑鼠 4px 門檻）開始拖：被拖的列浮起（陰影、放大 2%）；游標經過的課程列顯示強調色外框作為放置位置（<b>不用紅色</b>），超額的課程在外框旁多一個警示標籤「放入會超額」。放開後 160ms 落位，出現「復原」。Esc 取消。', 3, `${body(courseSide(0, { drop: 1 }), main(`${tilesAll('90／96', '71%', '6')}<div style="display:flex;gap:8px;align-items:center"><h2 style="margin:0;font-size:var(--fs-lg)">微積分　30／30</h2>${tag('已滿', 'warn')}</div><div style="display:flex;flex-direction:column;gap:6px">${srow(S[0], { grip: true, drag: true, noMove: true })}${S.slice(1).map((s) => srow(s, { grip: true })).join('')}</div>`, 'gap:12px'), rulesSide())}<div style="position:absolute;left:316px;top:292px;display:flex;gap:8px;align-items:center;background:var(--card);border:2px solid var(--accent);border-radius:var(--r-sm);padding:6px 10px;box-shadow:0 6px 18px var(--shadow)"><span class="small">放到「生物實驗」</span>${tag('放入會超額 26／25', 'warn')}</div>`, FILE, 920);

df('C9 「移到…」對話框與鍵盤｜桌機也有「移到…」：置中對話框（寬 520），上下鍵選課程、Enter 確認、Esc 取消。內容與手機面板一致。超額時警示但可確認。', 3, `${body(courseSide(0), main(`${tilesAll('90／96', '71%', '6')}<div style="display:flex;flex-direction:column;gap:6px">${S.map((s) => srow(s, { grip: true })).join('')}</div>`, 'gap:12px'), rulesSide())}${modal(520, `${mhead('把 03 王小明移到…')}<div class="small muted">目前在微積分 · 第 1 志願</div><div role="radiogroup" aria-label="課程" style="display:flex;flex-direction:column;gap:2px">${opt('生物實驗', true, '25／25 · 已滿，移入會超額')}${opt('地球探索', false, '12／20 · 他填第 2 志願')}${opt('程式設計', false, '8／8 · 已滿，移入會超額')}${opt('攝影社', false, '15／15 · 已滿，移入會超額')}${opt('待安排', false, '先不放進任何課程')}</div>${notice('warn', 'warn', '移入後生物實驗 26／25，超額 1 人。仍可保留，由你決定。')}${mfoot(btn('取消', 'secondary'), btn('移到生物實驗', 'primary'))}`)}`, FILE, 920);

df('C10 待安排名單｜左欄選「待安排」：中欄列出 6 人與原因（志願都滿了／沒填志願）、每列「放入…」；也可把列拖到左欄課程。右欄顯示可放入的課程與剩餘名額。', 3, `${body(courseSide(5), main(`<div style="display:flex;gap:8px;align-items:center"><h2 style="margin:0;font-size:var(--fs-lg)">待安排　6 人</h2></div><p class="small muted" style="margin:0">沒分到任何一個志願的人，由你決定放到哪裡。</p><div style="display:flex;flex-direction:column;gap:6px">${PEND.map((p) => prow(p)).join('')}</div>`, 'gap:12px'), rside(300, `<b>還有名額的課程</b>${[['地球探索', '8 個名額'], ['程式設計', '0'], ['攝影社', '0']].map(([a, b]) => `<div class="qrow"><span style="flex:1">${a}</span>${tag(b, b === '0' ? 'warn' : 'ok')}</div>`).join('')}<div class="small muted">放入時可以超額，系統只會標示。</div>`))}${DK.nav('確認，下一步：輸出', '上一步')}`, FILE, 800);

df('C11 優先名單對話框｜桌機置中對話框（寬 560）：搜尋、勾選、已選清單；只在同課超額時有差別，不加權、不看成績。', 3, `${body(courseSide(0), main('', ''), rulesSide())}${modal(560, `${mhead('優先名單　已選 2 人')}<div class="small muted">同一課超額時，優先的人先取得名額，其餘照抽籤。</div><input class="input" placeholder="搜尋座號或姓名" aria-label="搜尋"><div style="display:flex;flex-direction:column;gap:2px">${[[11, '陳怡安', true], [3, '王小明', false], [7, '林小美', true], [15, '張子豪', false]].map(([n, nm, on]) => `<label class="srow" style="cursor:pointer"><input type="checkbox" ${on ? 'checked' : ''} aria-label="${nm}" style="width:22px;height:22px;flex:none"><span class="no">${String(n).padStart(2, '0')}</span><b style="flex:1">${nm}</b>${on ? tag('優先', 'ok') : ''}</label>`).join('')}</div>${mfoot(btn('取消', 'secondary'), btn('完成', 'primary'))}`)}`, FILE, 760);

df('C12 步驟 4 輸出｜桌機：左邊三個檔案卡（預設全開），右邊預覽志願命中統計（第幾志願分到、各課人數／名額），下方分配紀錄。公布版與個人通知單不在第一版。', 4, `${body(side(260, `<div class="small muted" style="font-weight:700;padding:4px 12px">輸出</div>${['要輸出什麼', '檔案與進度', '完成'].map((x, i) => DK.nvr(x, i === 0)).join('')}`), main(`${dh('要輸出什麼？')}${checkRow('分組名單', '每個課程一張工作表，加一張總表（座號、姓名、課程、第幾志願）')}${checkRow('待安排名單', '沒分到的人與原因')}${checkRow('志願命中統計', '第 1 志願達成率、各課報名人數與名額比')}<div class="small muted">${ic('dice')} 分配紀錄：種子 4821 · 逐志願輪＋可重現抽籤 · 名額 98 · 2026/11/01 14:20</div>${privacy}`, 'gap:12px;max-width:600px'), rside(520, `<b>志願命中統計預覽</b><div class="qcard" style="padding:12px 14px;gap:10px"><div class="small muted" style="font-weight:700">第幾志願分到</div>${hitRows()}</div><div class="qcard" style="padding:12px 14px;gap:10px"><div class="small muted" style="font-weight:700">各課人數／名額（報名＝第 1 志願）</div>${hitCourse()}</div>`))}${DK.nav('產生並下載', '上一步')}`, FILE, 900, { prog: {} });

df('C13 提示狀態｜①總名額少於填答人數（警示，不擋）②沒有志願欄（錯誤，擋下）③名單外學生④最少開班人數大於名額（輸入框紅框加說明）⑤名額都沒填時主按鈕停用並寫原因。', 3, `${body(side(240, `<div class="small muted" style="font-weight:700;padding:4px 12px">名額與分配</div>${['名額與規則', '分配結果', '待安排名單'].map((x, i) => DK.nvr(x, i === 0)).join('')}`), main(`${notice('warn', 'warn', '名額合計 90，填答 96 人，至少 6 人會進待安排。')}${notice('bad', 'warn', '<b>還沒指定哪些欄位是志願</b><br>請先在步驟 2 指定哪些欄位是志願。', btn('回欄位對應', 'secondary', { sm: true }))}${notice('', 'info', '2 位學生不在名單上（座號 41、43）。', btn('看是誰', 'secondary', { sm: true }) + btn('納入', 'ghost', { sm: true }))}<div class="qcard" style="padding:12px 14px;gap:10px;max-width:520px"><b>攝影社</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${nf('名額', 15)}${nf('最少開班人數（選填）', 18, { err: '最少不能大於名額 15' })}</div></div>`, 'gap:12px;max-width:760px'))}${foot0()}`, FILE, 700);
function foot0() { return DK.foot(`<span class="small muted" style="margin-right:auto">主按鈕停用：還有課程名額沒填，或全部名額為 0。</span>`, btn('上一步', 'secondary'), btn('開始分配', 'primary', { dis: true })); }

// ====================================================================
// 輸出
// ====================================================================
const tokensText = rd(repo + '/docs/design/tokens.css');
const tokens = tokensText.replace(/\/\*[\s\S]*?\*\/\s*/, '');
const css = [rd(sp + '/chrome.css'), rd(sp + '/app.css'), rd(sp + '/doc.css')].join('\n');
const sprite = rd(sp + '/sprite.html');
const extra = `.pagehead{display:flex;flex-direction:column;gap:6px;max-width:72ch}.round{display:flex;flex-direction:column;gap:32px}.scale{position:static!important;width:auto!important;height:auto!important}.scale>.dev,.scale>.paper{position:relative!important;transform:none!important}.figs{overflow-x:auto}
.crow{display:flex;align-items:center;gap:12px;text-align:left;min-height:64px;padding:10px 14px;background:var(--card);border:1px solid var(--ctl);border-radius:var(--r-md);box-shadow:0 1px 2px var(--shadow-sm);color:var(--ink);font:inherit;cursor:pointer;width:100%}
.crow.cur{border-color:var(--accent);background:var(--accent-soft);border-width:2px}
.crow.drop{border-color:var(--accent);border-width:2px;background:var(--accent-soft)}
.srow{display:flex;align-items:center;gap:8px;min-height:52px;padding:4px 10px;background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-sm)}
.srow .no{font-variant-numeric:tabular-nums;color:var(--ink2);width:2ch;flex:none}
.tiles3 .tile .n{font-size:var(--fs-xl);white-space:nowrap}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
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
<header class="pagehead"><p class="small muted">設計規範的模擬頁，使用虛構資料。規範見 docs/design/DESIGN.md 5.27。</p><h1>${title}</h1><p class="muted">${intro}</p></header>
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
const INTRO = '選課分組志願（2026-11-01 定案）：第五種問卷類型。①問卷類型入口；②欄位對應新增「志願」角色；③步驟 3「名額與分配」（名額、優先名單、種子、結果、手動移人、待安排、建議停開）；④輸出分組名單、待安排名單、志願命中統計。第一版不含公布版與個人通知單。Google 表單介面字樣標「待核對」。';
page('手機-選課分組志願', '選課分組志願（手機）', INTRO, P);
page('平板-選課分組志願', '選課分組志願（平板）', INTRO + ' 平板：左欄清單＋右側內容，彈出面板改靠右側。', T);
page('桌機-選課分組志願', '選課分組志願（桌機）', INTRO + ' 桌機：三欄工作台，可拖曳移人，另有「移到…」與鍵盤操作。', DKS);
