// 匯入確認三畫面（2026-11-07 設計員出稿）：手機、平板、桌機各一個模擬頁。
// 背景：PR #65 修了 SUR-01～10 的程式，但三個畫面依硬規則 11 要先有設計稿，所以功能只做一半：
//   ① 「待分類」集中清單（SUR-04）：猜不出題型但有內容的欄，讓老師在一處逐欄確認。
//   ② 「量表上下限確認」（SUR-06）：1～5 分量表混入單筆 0 等有疑慮時，要老師確認上下限。
//   ③ 「選擇工作表」（SUR-01）：Excel 有多張工作表都有資料時，讓老師選用哪一張，事後可更換。
// 規範見 DESIGN.md 5.30；決定見 docs/decisions/2026-11-07-匯入確認三畫面設計.md。
// 執行：node batch91.mjs   →  寫入 ../mockups/{手機,平板,桌機}-匯入確認三畫面.html
// 全部是虛構資料（虛構的「活動滿意度調查」，41 位學生）。
import fs from 'node:fs';
import * as K from './m2kit.mjs';
import * as DK from './deskkit.mjs';

const { ic, tag, btn, notice, rowbtn, scr, act, mbar, mframeWH, brow, rcard } = K;
const { D, body, main, side, foot, h: dh, table, fchip } = DK;
const icbtn = K.L.icbtn;
const sp = K.sp;
const rd = (f) => fs.readFileSync(f, 'utf8');
const repo = sp + '/../../..';

// ====================================================================
// 文案（集中在這裡；定稿後照 DESIGN.md 5.30 的字串表放進 src/ui/strings.ts）
// ====================================================================
const FILE = '活動滿意度調查.xlsx';
const T = {
  // 待分類
  pendTitle: (n) => `待分類（${n} 欄）`,
  pendLead: '系統看不出這幾欄是什麼題型，分類前不會進統計。',
  pendLegend: '選擇題＝算各選項人數；開放意見＝逐則看留言；評分＝算平均與分布。',
  pendWhy: (filled, distinct) => `${filled} 人有填，${distinct} 種答案，答案偏短、種類偏多`,
  pendSamples: (s) => `答案：${s}`,
  pendMore: '其他類型…',
  pendAllIgnore: (n) => `其餘 ${n} 欄都不使用`,
  pendDoneTitle: (n) => `待分類：${n} 欄都處理好了`,
  pendDoneRows: (n) => `已處理（${n}）`,
  pendBack: '改回待分類',
  pendBlock: (n) => `還有 ${n} 欄待分類，分完才能往下。`,
  // 量表
  scaleTitle: '量表上下限請確認',
  scaleLead: '評分題共 2 欄、82 筆分數。大多數落在 1～5 分，但有 1 筆 0 分。這會影響平均與分布，請告訴我們問卷設計的是哪一種。',
  scaleHist: '各分數有幾筆',
  scaleWhere: '0 分出現在「活動安排」欄（1 筆）。',
  scaleAsk: '這份問卷的量表是：',
  scaleA: ['1～5 分', '0 分的 1 筆算「超出範圍」：不計入平均，並列入資料檢查，讓你去看是不是打錯。'],
  scaleB: ['0～10 分', '0 分是合法分數：1 筆會算進平均與分布。'],
  scaleNote: '選好後套用到全部評分欄；之後可回到這一頁再改。',
  scaleDone: '已確認：1～5 分。0 分的 1 筆會列入資料檢查。',
  scaleBlock: '量表上下限還沒確認，確認後才能往下。',
  // 工作表
  sheetTitle: '選擇工作表',
  sheetLead: (n) => `這個 Excel 檔有 ${n} 張工作表有資料，要分析哪一張？`,
  sheetOne: '一次只分析一張。',
  sheetSkip: (n, names) => `另有 ${n} 張工作表沒有資料，已略過：${names}。`,
  sheetNext: '用這張工作表',
  sheetCur: (n) => `工作表：${n}`,
  sheetCount: (n) => `這個檔共 ${n} 張有資料`,
  sheetChange: '更換工作表',
  sheetChangeWarn: '更換後會重新判斷欄位，已做的欄位對應不保留；學生名單不受影響。',
  sheetPrev: (rows) => `前幾列預覽（共 ${rows} 筆）`,
};
const SAMPLES = [
  { name: '用一個詞形容這次活動', ans: '好玩、有趣、累、普通、期待', filled: 38, distinct: 22 },
  { name: '最想感謝的人', ans: '小組長、老師、阿宇、小美、同學', filled: 31, distinct: 27 },
  { name: '下次想嘗試', ans: '戶外、桌遊、電影、烤肉、密室', filled: 29, distinct: 15 },
];
const SHEETS = [
  { name: '使用說明', rows: 5, cols: 1, heads: '使用說明', first: '請在下方工作表填寫…' },
  { name: '問卷回覆', rows: 41, cols: 9, heads: '時間戳記、姓名、座號', first: '2026/10/28 下午 2:15 · 王○○ · 3', sug: true },
  { name: '去年資料', rows: 38, cols: 9, heads: '時間戳記、姓名、座號', first: '2025/10/30 上午 9:40 · 林○○ · 12' },
];
const PREVIEW_HEAD = ['時間戳記', '姓名', '座號', '整體滿意度', '活動安排', '用一個詞形容這次活動'];
const PREVIEW_ROWS = [
  ['2026/10/28 下午 2:15', '王○○', '3', '5', '4', '好玩'],
  ['2026/10/28 下午 2:18', '林○○', '12', '4', '4', '有趣'],
  ['2026/10/28 下午 2:21', '陳○○', '7', '5', '5', '累'],
  ['2026/10/28 下午 2:30', '張○○', '21', '3', '0', '普通'],
];

// ====================================================================
// 共用元件
// ====================================================================
const mh = (t, s) => `<div class="grp"><h1 style="font-size:var(--fs-xl);margin:0">${t}</h1>${s ? `<p class="small muted" style="margin:0">${s}</p>` : ''}</div>`;
const pencil = icbtn('pencil', '改名稱');
const recog = [
  ['時間戳記', '2026/10/28 下午 2:15、2:18', '時間戳記', false],
  ['姓名', '王○○、林○○、陳○○', '填寫者姓名', false],
  ['座號', '3、12、7', '填寫者座號', false],
  ['整體滿意度', '5、4、5', '評分', true],
  ['活動安排', '4、4、5', '評分', true],
  ['其他想說的話', '希望可以再久一點、分組很好玩', '開放意見', true],
];
const recogRows = () => recog.map(([nm, sm, role, need]) => `<div style="display:flex;gap:4px;align-items:center"><div style="flex:1;min-width:0">${rowbtn(nm, sm, `${need ? tag('請確認', 'warn') + ' ' : ''}${tag(role)}`, need)}</div>${pencil}</div>`).join('');
const toConfirmNotice = notice('warn', 'warn', '已智慧判斷，3 欄請確認');

// 小圓鈕式單選（用 .chip，role="radio"；規範 4：選項少又要並排時用）
const typeChips = (nm, wide) => `<div class="chips" role="radiogroup" aria-label="「${nm}」的類型" style="${wide ? 'flex-wrap:nowrap' : ''}">${['選擇題', '開放意見', '評分', '不使用'].map((t) => `<button class="chip" type="button" role="radio" aria-checked="false">${t}</button>`).join('')}<button class="btn btn-ghost btn-sm" type="button">${T.pendMore}</button></div>`;

const pendRowM = (c, i) => `<div style="display:flex;flex-direction:column;gap:8px;${i ? 'border-top:1px solid var(--line-soft);padding-top:14px' : ''}"><div style="display:flex;align-items:center;gap:4px"><b style="flex:1;min-width:0">${c.name}</b>${pencil}</div><div class="small muted" style="line-height:1.55">${T.pendSamples(c.ans)}<br>${T.pendWhy(c.filled, c.distinct)}</div>${typeChips(c.name)}</div>`;
const doneRow = (c, role) => `<div class="sumline">${ic('check')}<span style="flex:1;min-width:0"><b>${c.name}</b><br><span class="muted">分類為「${role}」</span></span><button class="btn btn-ghost btn-sm" type="button">${T.pendBack}</button></div>`;
const DONE_ROLES = ['開放意見', '選擇題', '選擇題'];

// 待分類區塊（手機、平板共用）
const pendingCard = (state) => {
  if (state === 'done') {
    return `<section class="qcard" style="padding:14px;gap:12px" aria-label="待分類"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="color:var(--ok);display:flex">${ic('check')}</span><b style="flex:1">${T.pendDoneTitle(3)}</b>${tag('已完成', 'ok')}</div><div class="small muted"><b>${T.pendDoneRows(3)}</b></div>${SAMPLES.map((c, i) => doneRow(c, DONE_ROLES[i])).join('')}</section>`;
  }
  return `<section class="qcard" style="padding:14px;gap:14px;border:1.5px solid var(--warn)" aria-label="待分類"><div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--warn);display:flex">${ic('warn')}</span><b style="font-size:var(--fs-lg)">${T.pendTitle(3)}</b></div><p class="small" style="margin:0;line-height:1.55">${T.pendLead}</p><p class="small muted" style="margin:0;line-height:1.55">${T.pendLegend}</p></div>${SAMPLES.map(pendRowM).join('')}<div style="border-top:1px solid var(--line-soft);padding-top:14px">${btn(T.pendAllIgnore(3), 'secondary', { block: true })}</div></section>`;
};

// 量表區塊（手機、平板共用；桌機另排兩欄）
const HIST = [[5, 39, 48], [4, 27, 33], [3, 11, 13], [2, 3, 4], [1, 1, 1], [0, 1, 1]];
const histRows = () => HIST.map(([s, n, p]) => brow(`${s} 分`, `${n} 筆`, p, s === 0 ? 'tie' : '', s === 0 ? tag('可疑', 'warn') : '')).join('');
const scaleOpts = (sel, row) => `<div role="radiogroup" aria-label="${T.scaleAsk}" style="display:${row ? 'grid;grid-template-columns:1fr 1fr' : 'flex;flex-direction:column'};gap:10px">${rcard(`${T.scaleA[0]} ${tag('建議', 'accent')}`, T.scaleA[1], sel === 'A')}${rcard(T.scaleB[0], T.scaleB[1], sel === 'B')}</div>`;
const scaleCard = (sel) => `<section class="qcard" style="padding:14px;gap:14px;${sel ? '' : 'border:1.5px solid var(--warn)'}" aria-label="${T.scaleTitle}"><div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;align-items:center;gap:8px"><span style="color:${sel ? 'var(--ok)' : 'var(--warn)'};display:flex">${ic(sel ? 'check' : 'warn')}</span><b style="font-size:var(--fs-lg);flex:1">${T.scaleTitle}</b>${sel ? tag('已確認', 'ok') : ''}</div><p class="small" style="margin:0;line-height:1.55">${T.scaleLead}</p></div><div style="display:flex;flex-direction:column;gap:10px"><b class="small">${T.scaleHist}</b>${histRows()}<p class="small muted" style="margin:0">${T.scaleWhere}</p></div><div style="display:flex;flex-direction:column;gap:10px"><b class="small">${T.scaleAsk}</b>${scaleOpts(sel)}</div>${sel ? notice('ok', 'check', T.scaleDone) : `<p class="small muted" style="margin:0">${T.scaleNote}</p>`}</section>`;

// 底部操作列（手機）：停用時在按鈕上方寫原因
const mact = (reason, dis) => `<div class="actbar" style="flex-direction:column;gap:8px">${dis ? `<p class="small" style="margin:0;display:flex;gap:6px;align-items:center;color:var(--warn)">${ic('lock')}<span>${reason}</span></p>` : ''}<div style="display:flex;gap:12px">${btn('上一步', 'secondary')}${btn('完成對應，下一步', 'primary', { dis })}</div></div>`;

// ====================================================================
// 手機（390）
// ====================================================================
const P = [];
const nb = (c) => c.replace(/<\/?b>/g, '');
const pl = (H, cap, ...r) => P.push(mframeWH(nb(cap), 390, H, r.join(''), 34));
const mapHead = `${mbar('欄位對應')}${K.msteps(2, [1])}`;
const mapTop = `${mh('欄位對應', '欄位名稱可直接改（✎）；沒用到的欄收在下方，隨時可加回。')}`;

pl(1760, 'A1 欄位對應：「待分類」集中清單｜猜不出題型、但有內容的欄，原本會掉進最下面收合的「沒有使用的欄」，老師看不到、也不知道會被略過。現在把它們集中在列表<b>最上面</b>的警示卡（警示外框、不用左側色條）：一欄一組，寫欄名、幾個答案例、「幾人有填、幾種答案」當判斷依據，下面直接給四個一點即分的籌碼（選擇題、開放意見、評分、不使用），要別的類型再按「其他類型…」開既有的欄位類型面板。卡頂一行說明三種分類各會怎麼算。分類前的欄<b>不會進統計</b>，所以「完成對應」停用並在按鈕上方寫原因（含鎖頭圖示）。', mapHead, scr(`${mapTop}${pendingCard('open')}${toConfirmNotice}<div class="grp">${recogRows()}</div>`, 14), mact(T.pendBlock(3), true));
pl(1500, 'A2 待分類：全部處理後｜點籌碼就分類，那一欄立刻從清單移到卡底「已處理」，每筆有「改回待分類」可反悔。三欄都處理完，卡片變成「已完成」（綠勾、一般外框），「完成對應」可按。原本的「已智慧判斷，3 欄請確認」是另一回事（系統有猜、請你看一眼），維持不變。分類後這幾欄成為一般的欄位列，之後在列表裡點開可再改。', mapHead, scr(`${mapTop}${pendingCard('done')}${toConfirmNotice}<div class="grp">${recogRows()}</div>`, 14), mact('', false));

pl(1660, 'B1 量表上下限請確認（有疑慮）｜判定為 1～5 分、卻混入 0 分時，原本只在列表最下面有一個「量表範圍」分段，而且按「完成對應」時會被程式重新判斷覆蓋。現在偏離時改成列表最上面的警示卡：先講疑點（82 筆分數大多在 1～5，有 1 筆 0 分）、給「各分數有幾筆」長條（可疑的 0 分用警示色加「可疑」文字）、指出 0 分在哪一欄（方便找打錯的人），再請老師二選一。兩個選項都寫清楚<b>選了會怎麼算</b>；「建議」標籤標出系統的判斷，但<b>不預先選好</b>：這是會悄悄改變平均的決定，要老師親手點一下。沒選前「完成對應」停用。', mapHead, scr(`${mapTop}${scaleCard(null)}${toConfirmNotice}<div class="grp">${recogRows()}</div>`, 14), mact(T.scaleBlock, true));
pl(1670, 'B2 量表上下限：已確認｜選了之後卡片變一般外框、標題旁出現「已確認」，底下綠色提示寫出結果（1～5 分：0 分那 1 筆會列入資料檢查）。「完成對應」可按。之後想改，回到這一頁點另一個選項即可。', mapHead, scr(`${mapTop}${scaleCard('A')}${toConfirmNotice}<div class="grp">${recogRows()}</div>`, 14), mact('', false));

const sheetCard = (s, sel, cur) => {
  const dis = s.rows <= 5;
  return `<button class="rcard" role="radio" aria-checked="${sel}" type="button" style="align-items:flex-start"><span class="dot"></span><span style="min-width:0"><b style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${s.name}${s.sug ? tag('建議', 'accent') : ''}${cur ? tag('目前使用', 'ok') : ''}</b><small>${s.rows} 筆資料 · ${s.cols} 欄</small><small>前幾欄：${s.heads}</small></span></button>`;
};
const sheetList = (sel, cur) => `<div role="radiogroup" aria-label="${T.sheetTitle}" style="display:flex;flex-direction:column;gap:10px">${SHEETS.map((s, i) => sheetCard(s, i === sel, i === cur)).join('')}</div>`;
const sheetNoData = notice('', 'info', T.sheetSkip(1, 'Sheet3'));
const sheetHead = (back) => `${mbar(T.sheetTitle, back ? { right: null } : { right: null })}${K.msteps(1, [])}`;
const sheetAct = (nxt) => act(btn('上一步', 'secondary'), btn(nxt, 'primary'));
pl(1040, 'C1 選擇工作表｜Excel 有 2 張以上「有欄名也有資料列」的工作表時，選完檔先到這一頁，不直接替老師挑。第一張常是說明頁（這裡的「使用說明」也有幾列字，所以只擋「完全空的」不夠）。單選卡每張寫工作表名、幾筆資料、前幾欄的欄名，一眼看得出哪張是回覆；「建議」標在資料列最多的那張並預先選好（選錯代價低：之後可更換，見 C2）。空白的工作表不列出，只用一行資訊提示說「已略過」。只有 1 張有資料時不出現這一頁，流程不變。', sheetHead(), scr(`${K.file(FILE, 'Excel 檔')}${mh(T.sheetLead(3), T.sheetOne)}${sheetList(1, -1)}${sheetNoData}`, 14), sheetAct(T.sheetNext));
pl(900, 'C2 準備資料：顯示目前用哪張工作表｜只要這個檔有多張有資料的工作表，準備資料頁頭就多一列「工作表：問卷回覆」與次要按鈕「更換工作表」，選錯或想看另一張，不必重新開始。只有 1 張有資料的檔不顯示這一列。按「更換工作表」回到 C3。', mbar('問卷回饋小幫手', { brand: true }), K.msteps(2, [1]), scr(`<div class="grp"><h1 style="font-size:var(--fs-xl);margin:0">活動滿意度調查</h1><p class="small muted" style="margin:0">Excel 檔 · 41 筆回覆 · 9 欄</p></div><div class="sumline">${ic('file')}<span style="flex:1;min-width:0">${T.sheetCur('<b>問卷回覆</b>')}<br><span class="muted">${T.sheetCount(3)}</span></span><button class="btn btn-secondary btn-sm" type="button">${T.sheetChange}</button></div><div class="grp">${rowbtn('問卷類型', '意見調查', tag('已確認', 'ok'), false)}${rowbtn('欄位對應', '9 欄 · 3 欄待分類', tag('請確認', 'warn'), true)}${rowbtn('學生名單（選用）', '要先完成前兩件', tag('未解鎖'), false)}${rowbtn('資料檢查', '要先完成前兩件', tag('未解鎖'), false)}</div>`, 14), act(btn('下一步：欄位對應', 'primary', { dis: true })));
pl(1100, 'C3 更換工作表｜同一頁，進入方式不同：標題旁多「目前使用」標籤、預選的是目前這張，並多一則警示提示說明更換的代價（重新判斷欄位、已做的對應不保留；學生名單存在資料夾，不受影響）。按「更換」才生效；「取消」回準備資料。', sheetHead(true), scr(`${K.file(FILE, 'Excel 檔')}${mh(T.sheetTitle, T.sheetOne)}${notice('warn', 'warn', T.sheetChangeWarn)}${sheetList(1, 1)}`, 14), act(btn('取消', 'secondary'), btn('更換', 'primary', { dis: true })));

// ====================================================================
// 平板（820）：頂端列＋左欄＋右側內容
// ====================================================================
const TB = [];
const tbar = (n) => `<div class="appbar" style="padding:0 12px;gap:10px"><span class="brand">${ic('bars')}</span><b style="font-size:17px;white-space:nowrap">問卷回饋小幫手</b><div style="margin-left:auto;width:330px">${K.msteps(n, n === 1 ? [] : [1])}</div>${icbtn('refresh', '重新開始')}${icbtn('gear', '設定')}</div>`;
const prepRail = `<div class="small muted" style="font-weight:700;padding:4px 12px">準備資料 · 完成 1／4</div>${[['問卷類型', 0], ['欄位對應', 1], ['學生名單（選用）', 0], ['資料檢查', 0]].map(([x, c]) => `<div class="qrow"${c ? ' aria-current="true"' : ''}><span style="flex:1">${x}</span></div>`).join('')}`;
const tfr = (cap, H, rail, right, bottom, n = 2) => TB.push(mframeWH(nb(cap) + '（平板：頂端列＋左欄＋右側內容）', 820, H, `${tbar(n)}<div style="flex:1;min-height:0;display:flex"><div class="pane" style="width:236px;padding:12px 8px;border-right:1px solid var(--line-soft);background:var(--card);gap:2px">${rail}</div><div class="pane" style="flex:1;padding:16px 20px;align-items:stretch;overflow:hidden"><div style="width:100%;max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:14px">${right}</div></div></div>${bottom}`, 28));
const tfoot = (reason, label, dis) => `<div class="actbar desk" style="justify-content:flex-end;align-items:center">${dis ? `<span class="small" style="margin-right:auto;display:flex;gap:6px;align-items:center;color:var(--warn)">${ic('lock')}${reason}</span>` : ''}${btn('上一步', 'secondary')}${btn(label, 'primary', { dis })}</div>`;
tfr('A1 欄位對應：「待分類」集中清單｜與手機相同的警示卡，放在右側內容（限寬 560）最上面；左欄是準備資料四件事，「欄位對應」為目前項。停用原因寫在底部操作列左側。', 1480, prepRail, `${mapTop}${pendingCard('open')}${toConfirmNotice}<div class="grp">${recogRows()}</div>`, tfoot(T.pendBlock(3), '完成對應，下一步', true));
tfr('B1 量表上下限請確認（有疑慮）｜與手機相同。', 1560, prepRail, `${mapTop}${scaleCard(null)}${toConfirmNotice}<div class="grp">${recogRows()}</div>`, tfoot(T.scaleBlock, '完成對應，下一步', true));

// 平板的選擇工作表：左清單、右預覽（空間夠，直接看資料）
const previewTable = (n = 4) => table(PREVIEW_HEAD, PREVIEW_ROWS.slice(0, n));
const previewBox = (name, rows) => `<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><b>${name}</b><span class="small muted">${T.sheetPrev(rows)}</span><div style="overflow-x:auto;border-radius:var(--r-md)">${previewTable()}</div><p class="small muted" style="margin:0">表格可左右滑動。這是這張工作表原樣的前幾列，用來確認是不是你要的回覆。</p></div>`;
TB.push(mframeWH(nb('C1 選擇工作表｜平板（頂端列＋左欄清單＋右側預覽）：左邊 300 是三張工作表的單選卡，右邊顯示被選那張的前幾列，不用點進去看。沒有左側步驟欄（這是步驟 1 的子頁）。'), 820, 900, `${tbar(1)}<div style="flex:1;min-height:0;display:flex"><div class="pane" style="width:300px;padding:16px 14px;border-right:1px solid var(--line-soft);background:var(--card);gap:12px;align-items:stretch">${K.file(FILE, 'Excel 檔')}${mh(T.sheetLead(3), T.sheetOne)}${sheetList(1, -1)}${sheetNoData}</div><div class="pane" style="flex:1;padding:16px 20px;align-items:stretch;overflow:hidden">${previewBox('問卷回覆', 41)}</div></div>${tfoot('', T.sheetNext, false)}`, 28));

// ====================================================================
// 桌機（1280）
// ====================================================================
const DKS = [];
const dprep = (cur) => side(340, `<div class="small muted" style="font-weight:700;margin-bottom:8px">準備資料 · 完成 1／4 · 前兩件是必做</div><div style="display:flex;flex-direction:column;gap:8px">${rowbtn('問卷類型', '意見調查', tag('已確認', 'ok'), false)}${rowbtn('欄位對應', cur, tag('請確認', 'warn'), true)}${rowbtn('學生名單（選用）', '要先完成前兩件', ic('lock'), false, false)}${rowbtn('資料檢查', '要先完成前兩件', ic('lock'), false, false)}</div>`);
const dfoot = (reason, label, dis) => `<div class="actbar desk" style="justify-content:flex-end;align-items:center">${dis ? `<span class="small" style="margin-right:auto;display:flex;gap:6px;align-items:center;color:var(--warn)">${ic('lock')}${reason}</span>` : ''}${btn('上一步', 'secondary')}${btn(label, 'primary', { dis })}</div>`;
const df = (cap, step, inner, H, file = FILE) => DKS.push(D(nb(cap), step, inner, file, H, { lock: step === 1 ? [2, 3, 4] : [3, 4], prog: step === 2 ? { 2: '1／4' } : {} }));

// 桌機待分類：一欄一列，左（欄名與答案例）、中（判斷依據）、右（籌碼）
const pendRowD = (c, i) => `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) auto;gap:16px;align-items:center;padding:12px 0;${i ? 'border-top:1px solid var(--line-soft)' : ''}"><div style="min-width:0;display:flex;flex-direction:column;gap:2px"><b>${c.name}</b><span class="small muted">${T.pendSamples(c.ans)}</span></div><span class="small muted" style="line-height:1.55">${T.pendWhy(c.filled, c.distinct)}</span>${typeChips(c.name, true)}</div>`;
const pendingD = `<section class="qcard" style="padding:16px 18px;gap:6px;border:1.5px solid var(--warn)" aria-label="待分類"><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--warn);display:flex">${ic('warn')}</span><b style="font-size:var(--fs-lg)">${T.pendTitle(3)}</b><span class="small" style="margin-left:8px">${T.pendLead}</span></div><p class="small muted" style="margin:0 0 6px">${T.pendLegend}</p>${SAMPLES.map(pendRowD).join('')}<div style="display:flex;justify-content:flex-end;border-top:1px solid var(--line-soft);padding-top:12px">${btn(T.pendAllIgnore(3), 'secondary', { sm: true })}</div></section>`;
const recogD = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${recog.map(([nm, sm, role, need]) => rowbtn(nm, sm, `${need ? tag('請確認', 'warn') + ' ' : ''}${tag(role)}`, need)).join('')}</div>`;
df('A1 欄位對應：「待分類」集中清單｜桌機：左欄 340 是準備資料四件事（「欄位對應」為目前項，右側標籤寫「請確認」）；右側最上面是待分類卡，一欄一列、三欄對齊（欄名與答案例／判斷依據／類型籌碼），籌碼單行不換行。已辨識的欄收成兩欄格放下面。「完成對應」停用，原因寫在操作列左側。', 2, body(dprep('9 欄 · 3 欄待分類'), main(`${dh('欄位對應', '欄位名稱可直接改；沒用到的欄收在下方，隨時可加回。')}${pendingD}${toConfirmNotice}${recogD}`, 'gap:14px')) + dfoot(T.pendBlock(3), '完成對應，下一步', true), 1030);

const scaleD = `<section class="qcard" style="padding:16px 18px;gap:14px;border:1.5px solid var(--warn)" aria-label="${T.scaleTitle}"><div style="display:flex;align-items:center;gap:8px"><span style="color:var(--warn);display:flex">${ic('warn')}</span><b style="font-size:var(--fs-lg)">${T.scaleTitle}</b></div><p class="small" style="margin:0;line-height:1.55;max-width:70ch">${T.scaleLead}</p><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:28px;align-items:start"><div style="display:flex;flex-direction:column;gap:10px"><b class="small">${T.scaleHist}</b>${histRows()}<p class="small muted" style="margin:0">${T.scaleWhere}</p></div><div style="display:flex;flex-direction:column;gap:10px"><b class="small">${T.scaleAsk}</b>${scaleOpts(null)}<p class="small muted" style="margin:0">${T.scaleNote}</p></div></div></section>`;
df('B1 量表上下限請確認（有疑慮）｜桌機：卡片左半是「各分數有幾筆」長條（可疑的 0 分用警示色加文字），右半是兩個單選卡（選項各寫選了會怎麼算，「建議」標籤但不預選）。沒選前「完成對應」停用。', 2, body(dprep('9 欄 · 量表待確認'), main(`${dh('欄位對應', '欄位名稱可直接改；沒用到的欄收在下方，隨時可加回。')}${scaleD}${toConfirmNotice}${recogD}`, 'gap:14px')) + dfoot(T.scaleBlock, '完成對應，下一步', true), 1070);

const sheetRows = `<div role="radiogroup" aria-label="${T.sheetTitle}" style="display:flex;flex-direction:column;gap:10px">${SHEETS.map((s, i) => sheetCard(s, i === 1, false)).join('')}</div>`;
df('C1 選擇工作表｜桌機：左欄 380 是工作表單選卡，右邊是被選那張的前幾列預覽（點別張，預覽跟著換），用來確認這是不是回覆。「建議」標在資料列最多的那張並預先選好。步驟列停在「開啟問卷」，後三步停用（尚未讀進資料）。', 1, body(side(380, `${fchip('file', FILE, 'Excel 檔')}<div style="height:12px"></div>${mh(T.sheetLead(3), T.sheetOne)}<div style="height:12px"></div>${sheetRows}<div style="height:12px"></div>${sheetNoData}`), main(`${previewBox('問卷回覆', 41)}`, 'gap:14px')) + dfoot('', T.sheetNext, false), 760);
df('C2 準備資料：顯示目前用哪張工作表｜桌機：在左欄四件事上方加一列「工作表：問卷回覆」與「更換工作表」；按下去回到 C1（標題旁多「目前使用」、多一則警示說明更換的代價，同手機 C3）。', 2, body(side(340, `<div class="sumline" style="margin-bottom:12px">${ic('file')}<span style="flex:1;min-width:0">${T.sheetCur('<b>問卷回覆</b>')}<br><span class="muted">${T.sheetCount(3)}</span></span></div><div style="margin-bottom:12px">${btn(T.sheetChange, 'secondary', { sm: true, style: 'width:100%' })}</div><div class="small muted" style="font-weight:700;margin-bottom:8px">準備資料 · 完成 1／4</div><div style="display:flex;flex-direction:column;gap:8px">${rowbtn('問卷類型', '意見調查', tag('已確認', 'ok'), false)}${rowbtn('欄位對應', '9 欄 · 3 欄待分類', tag('請確認', 'warn'), true)}</div>`), main(`${dh('活動滿意度調查', 'Excel 檔 · 41 筆回覆 · 9 欄')}${notice('', 'info', '左側選一件事開始。前兩件是必做，做完才能看統計。')}`, 'gap:14px')), 520);

// ====================================================================
// 輸出
// ====================================================================
const tokens = rd(repo + '/docs/design/tokens.css').replace(/\/\*[\s\S]*?\*\/\s*/, '');
const css = [rd(sp + '/chrome.css'), rd(sp + '/app.css'), rd(sp + '/doc.css')].join('\n');
const sprite = rd(sp + '/sprite.html');
const extra = `.pagehead{display:flex;flex-direction:column;gap:6px;max-width:72ch}.round{display:flex;flex-direction:column;gap:32px}.scale{position:static!important;width:auto!important;height:auto!important}.scale>.dev,.scale>.paper{position:relative!important;transform:none!important}.figs{overflow-x:auto}.wrap{max-width:1320px}`;
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
<header class="pagehead"><p class="small muted">設計規範的模擬頁，使用虛構資料。規範見 docs/design/DESIGN.md 5.30。</p><h1>${title}</h1><p class="muted">${intro}</p></header>
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
const INTRO = '匯入確認三畫面（2026-11-07 設計員出稿）：A「待分類」集中清單（SUR-04）、B「量表上下限請確認」（SUR-06）、C「選擇工作表」與事後更換（SUR-01）。三畫面都是欄位對應與準備資料的延伸，沿用既有的警示外框、欄位列、單選卡、籌碼與底部操作列，沒有新元件。';
page('手機-匯入確認三畫面', '匯入確認三畫面（手機）', INTRO, P);
page('平板-匯入確認三畫面', '匯入確認三畫面（平板）', INTRO + ' 平板：頂端列＋左欄＋右側內容，單選頁改成左清單、右預覽。', TB);
page('桌機-匯入確認三畫面', '匯入確認三畫面（桌機）', INTRO + ' 桌機：左欄 340 準備資料四件事＋右側內容。', DKS);
