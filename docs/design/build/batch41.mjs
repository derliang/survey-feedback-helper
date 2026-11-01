// 第五輪（2026-11-01）：補稿＋教學頁＋快速範本＋去識別化提醒。手機、平板、桌機各一個模擬頁。
// 文案與狀態以實際 src/ui（分支 app-v01）為準（唯讀參考）；Google 介面名稱只有 Google介面核對紀錄.md 有核對的才算已核對，其餘一律標「待核對」。
// 執行：node batch41.mjs   →  寫入 ../mockups/{手機,平板,桌機}-第五輪.html
import fs from 'node:fs';
import * as K from './m2kit.mjs';
import * as DK from './deskkit.mjs';

const { ic, tag, btn, notice, tile, seg, chips, rowbtn, rcard, opt, field, sheet, scr, act, msteps, mbar, mframe, mframeWH, h: mh, tabletize, grp } = K;
const { D, side, main, rside, modal, mhead, mfoot, body, foot, flex1, pane, h: dh, fbox, fchip, topbar } = DK;
const sp = K.sp;
const rd = (f) => fs.readFileSync(f, 'utf8');
const repo = sp + '/../../..';

const PRIV = '本程式沒有伺服器，問卷結果只在這個瀏覽器處理。設定與名單存在你選的資料夾。放在雲端的檔案由該服務處理。';
const CHECKED = '2026-11-01';
const PENDING = '<span class="tag tag-warn">待核對</span>';

// ---------- 共用片段（三個裝置共用文案） ----------
const folderBar = (state) => `<div class="small" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:var(--ink2)">${ic('folder')}資料夾：<b>${state}</b>${state === '尚未選擇' ? '' : ''}</div><div class="small muted">${PRIV}</div>`;
const dirtyNotice = () => notice('warn', 'warn', '<b>設定有更新，還沒保存</b><br>請按「下載設定檔」保存，下次才接得上。', btn('下載設定檔', 'primary', { sm: true }));
const unsupportedNotice = () => notice('', 'info', '<b>這個瀏覽器無法自動存到資料夾</b><br>你仍然可以完整使用；差別是設定檔與名單要自己下載保存，下次再手動選回來。想要自動存取，請改用桌機版 Chrome 或 Edge。', btn('知道了', 'secondary', { sm: true }));
const WHY_SHEET = 'Google 試算表直接讀取會在 v0.4 提供；現在請先從試算表下載 Excel 檔（下方「怎麼從 Google 表單匯出？」有步驟）。';
const disabledSheetBtn = (block) => `<div style="display:flex;flex-direction:column;gap:6px">${btn('開啟試算表', 'secondary', { dis: true, block })}<span class="small" style="color:var(--ink2)">${ic('info')} ${WHY_SHEET}</span></div>`;

const dupRow = (who, rows, open) => `<div class="qcard" style="gap:10px;padding:12px 14px"><div><b>${who}</b> 填了 2 份<div class="small muted">第 ${rows} 列</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('保留最後一份', 'primary', { sm: true })}${btn('保留最早一份', 'secondary', { sm: true })}${btn('兩份都排除', 'secondary', { sm: true })}</div>${open ? '' : ''}</div>`;
const checkRows = (expand) => [
  ['重複填答', '同一人填了不只一份', tag('2', 'warn'), true],
  ['時間戳異常', '時間格式無法辨識', tag('正常', 'ok'), false],
  ['格式異常', '評分不是數字或超出範圍', tag('1', 'warn'), false],
  ['空白答案', '必填的題目沒有答案', tag('正常', 'ok'), false],
  ['書名多種寫法', '同一本書寫法不一，可合併', tag('已處理', 'ok'), false],
].map(([n, s, t, o]) => `<div style="display:flex;flex-direction:column;gap:8px">${rowbtn(n, s, t, !o && t.includes('1'), false).replace('class="rowbtn', `aria-expanded="${o && expand}" class="rowbtn`)}${o && expand ? `<div style="display:flex;flex-direction:column;gap:8px;padding:0 4px"><p class="small muted" style="margin:0">預設保留最後一份：同一人通常是重填，後面那份才是想送出的。</p>${dupRow('林○○', '5、9', true)}${dupRow('陳○○', '12、30', true)}</div>` : ''}</div>`).join('');

const cmpItem = (ans, line, acts) => `<div class="qcard" style="gap:10px;padding:12px 14px"><div><span class="small muted">填答的名字</span><div style="font-size:var(--fs-lg);font-weight:700">${ans}</div><div class="small">${line}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${acts}</div></div>`;
const cmpConfirm = () => `${cmpItem('林曉宇', '名單裡最接近：<b>3年2班 6 號 林小宇</b>', btn('是同一人', 'primary', { sm: true }) + btn('排除這筆', 'secondary', { sm: true }))}${cmpItem('王小明', '姓名對得上，但名單座號是 14 號', btn('是同一人', 'primary', { sm: true }) + btn('排除這筆', 'secondary', { sm: true }))}<div class="qcard" style="gap:8px;padding:12px 14px;background:var(--sunk)"><div class="small muted">已處理</div><div style="display:flex;align-items:center;gap:8px"><b>黃思穎</b>${tag('已合併到 3年2班 9 號', 'ok')}<span style="margin-left:auto">${btn('還原', 'ghost', { sm: true })}</span></div></div>`;

const roleOpts = (on) => ['時間戳記', '填寫者班級', '填寫者座號', '填寫者姓名', '被評對象班級', '被評對象座號', '被評對象姓名', '書名', '評分', '選擇題', '開放意見', '不使用這一欄'].map((r) => opt(r, r === on)).join('');
const typeSheetBody = () => `<p class="small muted" style="margin:0">範例答案：5、4、5、3、4</p><div role="radiogroup" aria-label="「簡報內容（充實度）」是哪一種欄位？" style="display:grid">${roleOpts('評分')}</div>`;
const typeSheetFoot = () => btn('套用', 'primary', { block: true });
const restartBody = () => `<p style="margin:0">重新開始會清掉目前這份問卷在畫面上的所有內容（不會動資料夾裡存的設定）。確定嗎？</p>`;

// ---------- 教學頁（R-001、藍圖「Google 表單設計教學頁與範本表單」） ----------
const QTYPES = [
  ['單選（選班長、選一個答案）', '「選擇題」', '一人一票時用；候選人名字固定打好，避免打錯字'],
  ['複選（可選多個）', '「核取方塊」', '比例以填答者為基準，加總會超過 100%'],
  ['1～5 分評分', '「線性刻度」', '兩端文字寫清楚（例如 1 非常不同意、5 非常同意）；量表不要混用方向'],
  ['開放意見', '「段落」', '一題只問一件事；「簡答」留給姓名、座號'],
  ['同一組題目重複評好幾項', '「單選方格」', '例如評分規準；本程式讀得進來，但每格一欄，欄位會變多'],
];
const TIPS = [
  ['姓名與座號分成兩題、用「簡答」', '合併成一格容易打成「3號 小明」「小明3」，之後對不上名單。班級、座號、姓名各一題，統計和名單對照才準。', ''],
  ['候選人與書名用固定選項', '票選用「選擇題」，把候選人一個一個建好；自己打字的書名會有多種寫法，資料檢查雖然能合併，但選項最省事。', ''],
  ['量表用「線性刻度」、方向一致', '全部「越高越好」；如果有反向題（例如「我覺得很無聊」），統計時再勾選反向計分，表單裡不必改分數。', ''],
  ['開放題少而精', '一份問卷 1～2 題開放意見就好；留言會逐則讓老師審稿，題目越多審稿越久。', ''],
  ['先自己填一份測試，再發給學生', '測試那份會混進回覆，匯出後用「資料檢查」的重複與格式異常排除，或直接在表單刪除該筆回覆。', ''],
];
const tipList = (compact) => TIPS.map(([t, d], i) => `<div class="qcard" style="gap:6px;padding:12px 14px"><div style="display:flex;gap:10px;align-items:center"><span style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--accent-soft);color:var(--accent-ink);display:grid;place-items:center;font-weight:700">${i + 1}</span><b>${t}</b></div>${compact ? '' : ''}<div class="small" style="color:var(--ink2)">${d}</div></div>`).join('');
const typeTable = () => `<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden;background:var(--card)">${QTYPES.map(([a, b, c], i) => `<div style="padding:10px 12px;${i ? 'border-top:1px solid var(--line-soft);' : ''}display:flex;flex-direction:column;gap:2px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b>${a}</b><span class="mono small">${b}</span>${PENDING}</div><div class="small" style="color:var(--ink2)">${c}</div></div>`).join('')}</div>`;
const verifyNote = `<div class="small muted">用字核對：「回覆」分頁、「連結至試算表」、「建立新試算表」、「建立」已於 ${CHECKED} 實際走過介面核對（見 Google介面核對紀錄）。<b>題型名稱（選擇題、核取方塊、線性刻度、段落、簡答、單選方格）與「必填」開關尚未在本專案核對，一律標「待核對」</b>，實作前要實際走一次建立題目的畫面再照抄。</div>`;
const openTemplate = () => notice('', 'info', '<b>範本表單</b>：一份虛構的「活動滿意度」表單，題型都已建好。按下去會要你登入 Google，並<b>建立副本</b>到你的雲端硬碟，不會改到原表單。<br><span class="small">個人帳號、學校帳號都能登入。</span>', btn('取得範本表單（建立副本）', 'secondary', { sm: true }) + ' ' + PENDING);
const demoEntry = () => `<div class="qcard" style="gap:10px;padding:14px"><div style="display:flex;gap:10px;align-items:center">${ic('file')}<b>示範資料</b></div><div class="small" style="color:var(--ink2)">想先看看統計和輸出長什麼樣子？用一份<b>虛構</b>的示範資料試試：全班 41 人、姓名都是虛構的，不會存進你的資料夾，也不會出現在「最近的問卷」。</div>${btn('用示範資料試試看', 'secondary', { sm: true })}<div class="small muted">示範資料只放在教學頁（R-001）；首頁沒有這個入口。</div></div>`;
const exportStepsLink = rowbtn('怎麼從 Google 表單匯出成 Excel 檔', '連結至試算表 → 檔案 → 下載 → Microsoft Excel (.xlsx)（已核對 ' + CHECKED + '）', '', false, true);

// ---------- 快速範本（R-009） ----------
export const QT = [
  { id: 'sat', nm: '活動滿意度', kind: '意見調查', who: '學生或參加者', n: 6, ex: '遠足、校慶、營隊、班級活動後的回饋', qs: ['整體來說，我對這次活動感到滿意（1～5）', '活動內容有趣、有收穫（1～5）', '時間與流程安排得宜（1～5）', '場地與準備工作讓我覺得舒服（1～5）', '我願意再參加類似的活動（1～5）', '最喜歡的部分與可以更好的地方（開放意見）'] },
  { id: 'par', nm: '家長意見', kind: '意見調查', who: '家長', n: 6, ex: '班親會、聯絡簿、親師溝通方式', qs: ['我清楚了解孩子在班上的學習狀況（1～5）', '班級聯絡方式（通知、聯絡簿）讓我方便掌握訊息（1～5）', '我覺得老師重視孩子的個別需求（1～5）', '我希望班親會或聯繫的頻率（單選：更常／維持／更少）', '最希望老師多協助的方面（核取方塊：學習、生活、人際、情緒、其他）', '還有什麼想對老師說的（開放意見）'] },
  { id: 'tch', nm: '教學回饋', kind: '意見調查', who: '學生', n: 7, ex: '期中、期末的課堂教學意見', qs: ['老師上課的重點清楚（1～5）', '上課的步調我跟得上（1～5）', '作業的份量與難度適中（1～5）', '我敢在課堂上提問或發言（1～5）', '最有幫助的課堂活動（核取方塊）', '希望老師繼續的一件事（開放意見）', '希望老師調整的一件事（開放意見）'] },
  { id: 'slf', nm: '學習自評', kind: '意見調查', who: '學生', n: 6, ex: '單元結束後學生自己評估學習狀況', qs: ['我能用自己的話說明這個單元的重點（1～5）', '我完成了老師交代的練習（1～5）', '我有遇到不懂的地方會想辦法弄懂（1～5）', '我和同學合作得很順利（1～5）', '這個單元我進步最多的地方（開放意見）', '我接下來想加強的地方（開放意見）'] },
  { id: 'reg', nm: '報名點名清點', kind: '意見調查', who: '學生或家長', n: 5, ex: '活動報名、秋遊參加與否、統購清點', qs: ['班級（簡答）', '座號（簡答）', '姓名（簡答）', '是否參加（單選：參加／不參加）', '備註，例如飲食禁忌（段落）'] },
  { id: 'rul', nm: '班規議題票選', kind: '票選幹部', who: '學生', n: 5, ex: '班規修正案、班級活動主題、座位排法等多個議題', qs: ['班級（簡答）', '座號（簡答）', '姓名（簡答）', '議題一的立場（單選：贊成／反對／沒意見）', '議題二的立場（單選：贊成／反對／沒意見）'] },
];
const qtCard = (q, on) => `<button class="rcard" role="radio" aria-checked="${!!on}" type="button" style="min-height:76px"><span class="dot"></span><span><b>${q.nm}</b><small>${q.ex}</small><small>${tag(q.kind)} ${tag(q.n + ' 題')} ${tag(q.who)}</small></span></button>`;
const qtList = (sel) => `<div role="radiogroup" aria-label="快速範本" style="display:flex;flex-direction:column;gap:8px">${QT.map((q, i) => qtCard(q, i === sel)).join('')}</div>`;
const qtPreview = (q, dense) => `<div class="qcard" style="gap:8px;padding:14px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b style="font-size:var(--fs-lg)">${q.nm}</b>${tag(q.kind, 'accent')}</div><div class="small" style="color:var(--ink2)">預設題目（${q.n} 題；欄位對應與統計方式已預先設好）</div><ol style="margin:0;padding-left:1.4em;display:flex;flex-direction:column;gap:${dense ? 2 : 4}px">${q.qs.map((s) => `<li class="small">${s}</li>`).join('')}</ol></div>`;
const qtHow = `<div class="small muted">範本做三件事：①給你一份可複製的 Google 表單題目清單（照著建，或用教學頁的範本表單）；②匯出後，欄位對應、問卷類型、量表範圍（1～5）自動帶好，可跳過「欄位對應」精靈；③統計與報告的預設圖表也已選好。範本不會帶任何學生資料。</div>`;
const qtFlow = `<div class="small" style="color:var(--ink2)">用法：選範本 → 照題目在 Google 表單建立（或取得範本表單）→ 學生填完 → 匯出 Excel → 回到首頁開啟，會自動認得是這個範本。</div>`;

// ---------- 去識別化提醒（進階統計定義） ----------
const VIEWS = [['教師版', '完整，含原文與名次，只給老師自己看', false], ['學生版', '匿名彙整：姓名換成「某同學」，沒有名次、沒有來源編號', true], ['家長版', '精簡一頁：總分、班均、最多 2 則留言，不含名次與原文', true]];
const remind = (compact) => notice('warn', 'warn', `<b>輸出學生版或家長版前，請先確認留言裡沒有同學的名字</b><br>程式只能遮蔽名單上的人（換成「某同學」）。留言裡如果寫了<b>名單外的人名</b>（例如別班同學、老師、綽號），程式認不出來，不會自動遮蔽。${compact ? '' : '<br>所以這一步一定要你自己看過預覽。'}`);
const previewList = () => `<div style="display:flex;flex-direction:column;gap:8px">${[['某同學 · 給林○○', '簡報很清楚，但是陳大明那一段我覺得太快了。', true, '可能含人名「陳大明」（名單外）'], ['某同學 · 給林○○', '聲音很大聲，大家都聽得到。', false, ''], ['某同學 · 給林○○', '張老師說的那個例子很好，可以再多一點。', true, '可能含人名「張老師」（名單外）']].map(([w, t, bad, why]) => `<div class="qcard" style="gap:6px;padding:12px 14px;${bad ? 'border-color:var(--warn);background:var(--warn-soft)' : ''}"><div class="small muted">${w}</div><div>${t}</div>${bad ? `<div class="small" style="color:var(--warn);font-weight:700">${ic('warn')} ${why}</div>` : ''}<div style="display:flex;gap:8px;flex-wrap:wrap">${btn('留著', 'secondary', { sm: true })}${btn('隱藏這則', 'secondary', { sm: true })}${btn('改寫', 'secondary', { sm: true })}</div></div>`).join('')}</div>`;
const pvNote = `<div class="small muted">「可能含人名」只是<b>提醒</b>：程式用姓氏與稱謂簡單比對（不是智慧判斷、不保證找得出來），沒標出來不代表沒有人名。真正的把關是你看過這份預覽。</div>`;
const gateCheck = (on) => `<button class="tgl" role="switch" aria-checked="${on}" type="button"><span style="text-align:left"><b style="display:block">我已逐則看過學生版預覽，沒有名單外的人名</b><span class="small muted">打開後才能產生學生版與家長版</span></span><span class="sw2"></span></button>`;
const viewPick = (sel) => `<div role="radiogroup" aria-label="給誰看" style="display:flex;flex-direction:column;gap:8px">${VIEWS.map(([a, b], i) => rcard(a, b, i === sel)).join('')}</div>`;

// ====================================================================
// 手機
// ====================================================================
const P = [];
const pf = (cap, ...r) => P.push(mframe(cap, ...r));
const pl = (H, cap, ...r) => P.push(K.mlong(H, cap, ...r));
const homeScr = (inner) => scr(inner, 12);
const pbrand = mbar('問卷回饋小幫手', { brand: true });
const hBlock = (extra) => `<h1 style="font-size:var(--fs-xl);margin:0">今天要處理哪一份問卷？</h1><p class="small muted" style="margin:0">把 Excel 檔放進來，或直接開啟 Google 試算表。</p>${extra || ''}`;
const openBtns = `<div style="display:flex;flex-direction:column;gap:8px">${disabledSheetBtn(true)}${btn('選擇 Excel 檔', 'primary', { block: true })}${btn('開啟設定檔', 'secondary', { block: true })}</div>`;

pl(980, 'H1a 首頁：「開啟試算表」停用狀態｜實作現況入畫（v0.1 只有 Excel 檔可用）。停用的鈕不只變灰：緊貼下方一行說明原因；因為試算表鈕不能用，主要鈕（藍底）換成「選擇 Excel 檔」，三顆依序為「開啟試算表」「選擇 Excel 檔」「開啟設定檔」（與程式一致，DESIGN.md 4 的停用規則）。手機沒有拖放，所以沒有拖放區。', pbrand, msteps(1, []), homeScr(`${hBlock()}${openBtns}${exportStepsLink}<h2 style="font-size:var(--fs-lg);margin:8px 0 0">最近的問卷</h2><div class="qcard" style="gap:4px;padding:12px 14px"><b>讀書報告回饋（三年二班）</b><span class="small muted">報告回饋 · 讀書報告回饋 (回覆).xlsx</span><span class="small muted">上次 10/31 ${tag('選檔後自動帶入', 'accent')}</span></div><div class="small muted" style="display:flex;gap:6px;align-items:center">${ic('folder')} 資料夾：<b>三年二班問卷</b> ${tag('已連線', 'ok')}</div><div class="small muted">${PRIV}</div>`));

pl(1060, 'H1b 首頁：沒有資料夾時，「設定有更新，還沒保存」＋「下載設定檔」｜只有 E3（這個瀏覽器無法自動存到資料夾，資訊提示）原稿；實作多了設定更新後的警示：警示提示置於首頁最上方，主要動作「下載設定檔」，保存後提示消失。兩則提示同時出現時，資訊提示在上、警示在下（程式順序）。此狀態只在手機、平板與 Safari、Firefox 出現。', pbrand, msteps(1, []), homeScr(`${unsupportedNotice()}${dirtyNotice()}${hBlock()}${openBtns}<h2 style="font-size:var(--fs-lg);margin:8px 0 0">最近的問卷</h2><p class="small muted" style="margin:0">還沒有最近的問卷。處理過的問卷會出現在這裡。</p><div class="small muted" style="display:flex;gap:6px;align-items:center">${ic('folder')} 資料夾：<b>尚未選擇</b> ${tag('此瀏覽器無法自動存到資料夾')}</div><div class="small muted">${PRIV}</div>`));

pf('H1c 設定頁：資料夾區（沒有資料夾時）｜設定頁依規範組裝，分段為「資料去向、資料夾、外觀、瀏覽器支援」四張卡。沒有資料夾時，資料夾卡多一顆「下載設定檔」，並重複說明手動做法；有資料夾時才有「選擇資料夾」「忘記這個資料夾」（危險色、排最後，附「只讓瀏覽器忘記位置」）。', mbar('設定', { right: null }), scr(`<div class="qcard" style="gap:6px"><h2 style="margin:0;font-size:var(--fs-lg)">資料去向</h2><ul style="margin:0;padding-left:1.2em" class="small"><li>本程式沒有伺服器，問卷結果只在這個瀏覽器處理。</li><li>設定與名單存在你選的資料夾。</li><li>放在雲端的檔案由該服務處理。</li></ul></div><div class="qcard" style="gap:8px"><h2 style="margin:0;font-size:var(--fs-lg)">資料夾</h2><div class="small">資料夾：<b>尚未選擇</b></div>${btn('下載設定檔', 'secondary', { block: true })}<div class="small muted">處理完按「下載設定檔」存到你的電腦；下次在首頁按「開啟設定檔」選回來，最近的問卷就會回來。</div></div><div class="qcard" style="gap:8px"><h2 style="margin:0;font-size:var(--fs-lg)">外觀</h2>${seg(['跟隨系統', '淺色', '深色'], 0, '外觀')}</div><div class="qcard" style="gap:6px"><h2 style="margin:0;font-size:var(--fs-lg)">瀏覽器支援</h2><div class="small">支援近兩年的 Chrome、Edge、Safari、Firefox，以及 iOS 16.4 以上。自動存取資料夾僅限桌機 Chrome／Edge，其餘改用手動下載與選檔。</div></div>`, 12), act(btn('上一步', 'secondary', { block: true })));

pl(1140, 'H2a 準備資料：資料檢查，列內按鈕｜取代原稿的底部彈出面板。點「重複填答」那一列展開，處理按鈕直接在同一張卡內（每筆三顆：保留最後一份〔主〕、保留最早一份、兩份都排除）；預設值的理由寫在展開處最上方。處理後該列標「已處理」。好處：不必開關面板、一次可連續處理多筆。', mbar('資料檢查', { right: null }), scr(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${tile('待處理', '2', 'warn')}${tile('已處理', '1')}</div>${notice('', 'info', '已排除 0 筆回覆')}${checkRows(true)}`, 12), act(btn('回到準備資料', 'secondary'), btn('下一步：看統計', 'primary', { style: 'flex:1' })));

pl(980, 'H2b 準備資料：名單對照「需要確認」，列內按鈕｜取代原稿的底部面板。每筆一張卡：填答的名字（大字）、系統找到的最接近同學，按鈕「是同一人」（主）與「排除這筆」；處理完的移到下方灰底「已處理」，可「還原」。三個分頁：還沒填／需要確認／重複。', mbar('名單對照', { right: null }), scr(`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${tile('已填', '38')}${tile('沒填', '3')}${tile('要確認', '2', 'warn')}${tile('重複', '1', 'warn')}</div>${seg(['還沒填 3', '需要確認 2', '重複 1'], 1, '名單對照')}${cmpConfirm()}`, 12), act(btn('完成對照', 'primary', { block: true })));

pf('H3a 欄位類型面板（底部彈出）｜實作：點欄位列開底部面板，標題「「○○」是哪一種欄位？」、範例答案、單選清單（每項 52 高）、主按鈕「套用」。與 DESIGN.md 5.2、4 的底部彈出面板完全一致；補稿只確認選取狀態與清單長度（清單可捲動，把手在上）。', mbar('欄位對應', { right: null }), scr(`${notice('warn', 'warn', '已智慧判斷，2 欄請確認')}${rowbtn('簡報內容（充實度）', '5、4、5', tag('評分'), false)}${rowbtn('簡報設計', '4、4、5', tag('評分'), false)}`, 10), sheet('「簡報內容（充實度）」是哪一種欄位？', '', typeSheetBody(), typeSheetFoot()));

pf('H3b 重新開始確認（底部彈出）｜實作：頂端列圓箭頭圖示→確認面板，標題「重新開始」，一段說明（清掉畫面上的內容，不動資料夾裡的設定），左「取消」、右「確定重新開始」（危險色，不用實心紅鈕）。', pbrand, msteps(2, [1]), scr('<div class="qcard"><b>讀書報告回饋（三年二班）</b><span class="small muted">Google 試算表 · 56 筆回覆 · 12 欄</span></div>', 12), sheet('重新開始', '', restartBody(), `<div style="display:flex;gap:8px;margin-top:8px">${btn('取消', 'secondary')}${btn('確定重新開始', 'danger', { style: 'flex:1' })}</div>`));

// ---- 教學、範本
pl(1260, 'G3 教學：Google 表單怎麼設計（五個技巧）｜給老師看的短教學：五個技巧（有先後才用編號；這裡每個技巧獨立，用圓形編號只是方便口頭討論）＋題型對照表。題型名稱全部標「待核對」。', mbar('教學', { right: null }), scr(`${mh('Google 表單怎麼設計才好分析', '五個小技巧，匯出後欄位對應會更準。')}${tipList()}<h2 style="margin:8px 0 0;font-size:var(--fs-lg)">題型怎麼選</h2>${typeTable()}${verifyNote}`, 12), act(btn('取得範本表單', 'primary', { block: true })));

pl(1060, 'G4 教學：範本表單｜一份虛構的「活動滿意度」Google 表單，題型都建好。按鈕會要求登入 Google（任何 Google 帳號都能用，流程同 S0／S0b／S1）並「建立副本」到老師自己的雲端硬碟。表單網址與按鈕實際字樣（「建立副本」或「建立一份副本」）尚未核對。', mbar('範本表單', { right: null }), scr(`${mh('取得範本表單', '用虛構的活動滿意度表單，看看好分析的表單長什麼樣子。')}${openTemplate()}${notice('', 'info', '範本表單裡沒有任何學生資料。副本在你的雲端硬碟裡，你想怎麼改都可以。')}${exportStepsLink}`, 12), act(btn('回到教學', 'secondary', { block: true })));

pf('G5 教學：示範資料入口（R-001）｜示範資料只放在教學頁（首頁、選檔來源都沒有）。按「用示範資料試試看」載入一份虛構的 41 人資料，直接進「準備資料」，不寫入資料夾、不進「最近的問卷」；頂端列加一條「示範資料」標籤，重新開始就清掉。', mbar('教學', { right: null }), scr(`${mh('先試試看', '還沒有自己的問卷也沒關係。')}${demoEntry()}${notice('', 'info', '示範資料是虛構的：41 位學生、姓名都是編的，載入後可以走完統計與輸出，不會存下任何東西。')}`, 12), act(btn('回到教學', 'secondary', { block: true })));

pl(1270, 'Q1 快速範本：選擇畫面（R-009）｜入口在首頁底部或教學頁「快速範本」（待使用者確認入口位置）。六個範本以選項卡排列，每張寫用途、類型、題數與對象；選一個後下方出現預設題目預覽。類型維持三種（意見調查、票選幹部、報告回饋），範本只是預設值。', mbar('快速範本', { right: null }), scr(`${mh('用快速範本', '選一個情境，題目與統計預設都先幫你設好。')}${qtList(0)}${qtPreview(QT[0], true)}${qtHow}`, 12), act(btn('取消', 'secondary'), btn('用這個範本', 'primary', { style: 'flex:1' })));

pf('Q2 快速範本：下一步｜按「用這個範本」後，給兩個出口：「複製題目清單」（純文字，貼進 Google 表單）與「取得範本表單」（G4）；說明匯出後怎麼接回來。範本的預設內容草稿全文見 快速範本草稿.md（待使用者修改後定稿）。', mbar('活動滿意度', { right: null }), scr(`${notice('ok', 'check', '已選「活動滿意度」：意見調查、6 題。')}${qtPreview(QT[0], false)}${btn('複製題目清單', 'secondary', { block: true })}${btn('取得範本表單（G4）', 'secondary', { block: true })}${qtFlow}`, 12), act(btn('完成', 'primary', { block: true })));

// ---- 去識別化
pl(1000, 'P1 輸出前提醒：學生版與家長版｜輸出設定選了學生版或家長版，就在「給誰看」下方出現警示提示（不是彈窗，不能忽略成一個「知道了」）：程式只能遮蔽名單上的人，名單外的人名認不出來。主要鈕不是「產生」，而是「先預覽」；預覽沒看完，「產生並下載」維持停用並寫出原因。教師版沒有這個提醒。', mbar('輸出設定', { right: null }), msteps(4, [1, 2, 3]), scr(`<div class="grp"><h2 style="margin:0;font-size:var(--fs-lg)">給誰看</h2></div>${viewPick(1)}${remind()}${btn('先預覽學生版', 'primary', { block: true })}${btn('產生並下載', 'primary', { block: true, dis: true })}<span class="small" style="color:var(--ink2)">${ic('lock')} 要先逐則看過預覽才能產生。</span>`, 12));

pl(1280, 'P2 必須預覽：留言逐則確認｜預覽只放有風險的內容：學生版會出現的每一則留言（已把名單上的名字換成「某同學」），程式簡單比對姓氏與稱謂，把「可能含名單外人名」的留言標警示底。每則可留著、隱藏、改寫（沿用審稿的三個動作）。底部開關「我已逐則看過」打開後，才能產生；打開前主要鈕停用並寫原因。', mbar('預覽學生版', { right: null }), scr(`${mh('留言預覽（學生版）', '第 1 位 · 林○○ · 3 則')}${pvNote}${previewList()}${gateCheck(false)}`, 12), act(btn('返回', 'secondary'), btn('產生並下載', 'primary', { style: 'flex:1', dis: true })));

// ====================================================================
// 平板（由手機自動轉換）
// ====================================================================
const T = [];
const KEEP_TALL = { H1b: 1300, H2a: 1250, G3: 1400, G4: 1100, Q1: 1300, P1: 1100, P2: 1380, H1a: 1100, H2b: 1100 };
const railOf = { H1a: ['home', 0], H1b: ['home', 0], H1c: ['set', 4], H2a: ['prep', 3], H2b: ['prep', 2], H3a: ['prep', 1], H3b: ['prep', 1], G3: ['help', 2], G4: ['help', 3], G5: ['help', 4], Q1: ['qt', 0], Q2: ['qt', 0], P1: ['out', 1], P2: ['out', 1] };
for (const f of P) {
  const key = (f.match(/<figcaption[^>]*><b>([^<]*)/) || [])[1].split(' ')[0];
  const r = railOf[key];
  if (!r) throw new Error('平板缺左欄：' + key);
  T.push(tabletize(f, r, { h: KEEP_TALL[key] || 1000, noBlock: true }).replace(/（底部彈出）/g, '（平板：靠右側彈出，寬 400）').replace('點欄位列開底部面板', '點欄位列開右側面板').replace('頂端列圓箭頭圖示→確認面板', '頂端列「重新開始」→靠右側確認面板'));
}

// ====================================================================
// 桌機（1280）
// ====================================================================
const DK_ = [];
const df = (cap, step, inner, file, H, o) => DK_.push(D(cap, step, inner, file, H, o));
const deskForm = (inner) => inner;

// 首頁雙欄（與 H1 定案一致）
const dropInner = `<div style="border:2px dashed var(--ink3);border-radius:var(--r-lg);padding:40px 24px;display:flex;flex-direction:column;align-items:center;gap:12px;background:var(--card)">${DK.round('down-arrow')}<b style="font-size:var(--fs-lg)">把 Excel 檔拖到這裡</b><span class="small muted">或用下面的按鈕選擇</span></div>`;
const deskHome = (top, folder) => body(
  main(`${top}${dh('今天要處理哪一份問卷？', '把 Excel 檔放進來，或直接開啟 Google 試算表。')}${dropInner}<div style="display:flex;gap:8px;flex-wrap:wrap">${btn('開啟試算表', 'secondary', { dis: true })}${btn('選擇 Excel 檔', 'primary')}${btn('開啟設定檔', 'secondary')}</div><span class="small" style="color:var(--ink2)">${ic('info')} ${WHY_SHEET}</span>${exportStepsLink}`, 'gap:14px'),
  rside(460, `${dh('最近的問卷')}<div class="small muted">點一下就接續，不必再對應欄位</div><div class="qcard" style="gap:4px;padding:12px 14px"><b>讀書報告回饋（三年二班）</b><span class="small muted">報告回饋 · 讀書報告回饋 (回覆).xlsx</span><span class="small muted">上次 10/31 ${tag('選檔後自動帶入', 'accent')}</span></div><div style="margin-top:auto" class="small muted">${ic('folder')} 資料夾：<b>${folder}</b><br>${PRIV}</div>`),
);
df('H1a 首頁：「開啟試算表」停用狀態｜雙欄首頁（H1 定案）不變，只補停用態：「開啟試算表」鈕灰底，下方一行說明原因；主要鈕換成「選擇 Excel 檔」。', 1, deskHome('', '三年二班問卷'), '', 800, { prog: {}, lock: [2, 3, 4] });
df('H1b 首頁：沒有資料夾時的「設定有更新，還沒保存」｜桌機 Safari、Firefox 或使用者不選資料夾時出現：資訊提示（這個瀏覽器無法自動存到資料夾）在上，警示提示（設定有更新，還沒保存＋「下載設定檔」）在下，兩則都在左欄最上方；右欄最近的問卷為空，資料夾列顯示「尚未選擇」。', 1, deskHome(unsupportedNotice() + dirtyNotice(), '尚未選擇').replace('點一下就接續，不必再對應欄位', '還沒有最近的問卷。處理過的問卷會出現在這裡。'), '', 900, { prog: {}, lock: [2, 3, 4] });

const checkDesk = body(
  side(280, `<div class="small muted" style="font-weight:700;padding:4px 12px">準備資料 · 完成 3／4</div>${['問卷類型 · 已確認', '欄位對應 · 已確認', '學生名單（選用）· 已確認', '資料檢查 · 2 項待處理'].map((x, i) => DK.nvr(x, i === 3)).join('')}`),
  main(`${dh('資料檢查', '預設保留最後一份：同一人通常是重填，後面那份才是想送出的。')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:420px">${tile('待處理', '2', 'warn')}${tile('已處理', '1')}</div>${checkRows(true)}`, 'gap:12px;max-width:720px'),
);
df('H2a 準備資料：資料檢查，列內按鈕｜桌機版：點「重複填答」那列展開，按鈕在列內（取代原稿的置中對話框）；一次可連續處理多筆。左欄是準備資料四件事，與實作的兩欄一致（H5）。', 2, `${checkDesk}${DK.nav('下一步：看統計', '回到準備資料')}`, '三年二班_報告回饋.xlsx', 960, { prog: { 2: '3／4' } });

df('H2b 準備資料：名單對照「需要確認」，列內按鈕｜桌機：四個數字磚＋三個分頁，「需要確認」每筆一張卡，按鈕在卡內。', 2, `${body(side(280, `<div class="small muted" style="font-weight:700;padding:4px 12px">準備資料 · 完成 2／4</div>${['問卷類型 · 已確認', '欄位對應 · 已確認', '學生名單（選用）· 要確認 2', '資料檢查'].map((x, i) => DK.nvr(x, i === 2)).join('')}`), main(`${dh('名單對照')}<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:620px">${tile('已填', '38')}${tile('沒填', '3')}${tile('要確認', '2', 'warn')}${tile('重複', '1', 'warn')}</div><div style="max-width:420px">${seg(['還沒填 3', '需要確認 2', '重複 1'], 1, '名單對照')}</div>${cmpConfirm()}`, 'gap:12px;max-width:720px'))}${DK.nav('完成對照', '回到準備資料')}`, '三年二班_報告回饋.xlsx', 840, { prog: { 2: '2／4' } });

// H3：桌機置中對話框（程式為寬 520）
const mapBg = body(side(280, `<div class="small muted" style="font-weight:700;padding:4px 12px">準備資料 · 完成 1／4</div>${['問卷類型 · 已確認', '欄位對應 · 請確認', '學生名單（選用）· 未解鎖', '資料檢查 · 未解鎖'].map((x, i) => DK.nvr(x, i === 1)).join('')}`), main(`${dh('欄位對應', '欄位名稱可直接改（✎）；沒用到的欄收在下方，隨時可加回。')}${notice('warn', 'warn', '已智慧判斷，2 欄請確認')}${rowbtn('簡報內容（充實度）', '5、4、5', tag('評分'), false)}${rowbtn('簡報設計', '4、4、5', tag('評分'), false)}${rowbtn('時間戳記', '2026/10/30 下午 2:14', tag('時間戳記'), false)}`, 'gap:10px;max-width:720px'));
df('H3a 欄位類型面板（桌機置中對話框）｜寬 520、Esc 或「取消」關閉；內容與手機、平板相同（標題、範例答案、12 項單選、主按鈕「套用」）。', 2, `${mapBg}${modal(520, `${mhead('「簡報內容（充實度）」是哪一種欄位？')}<div style="max-height:440px;overflow-y:auto">${typeSheetBody()}</div>${mfoot(btn('取消', 'secondary'), btn('套用', 'primary'))}`)}`, '三年二班_報告回饋.xlsx', 860, { prog: { 2: '1／4' } });

df('H3b 重新開始確認（桌機置中對話框）｜每個桌機畫面頂端的「重新開始」→ 寬 480 對話框；右下「確定重新開始」（危險色外框，不用實心紅鈕）在最右，「取消」在左；預設焦點在「取消」。', 2, `${mapBg}${modal(480, `${mhead('重新開始')}${restartBody()}${mfoot(btn('取消', 'secondary'), btn('確定重新開始', 'danger'))}`)}`, '三年二班_報告回饋.xlsx', 860, { prog: { 2: '1／4' } });

df('H3c 設定頁（桌機）｜四張卡直向排列，內容寬 640 置中：資料去向、資料夾（選擇資料夾／忘記這個資料夾〔危險色〕／下載設定檔；沒有資料夾時只剩「下載設定檔」）、外觀（跟隨系統、淺色、深色）、瀏覽器支援。「上一步」回到上一個畫面。', 1, `${body(flex1(`<div style="width:640px;display:flex;flex-direction:column;gap:12px;margin:0 auto">${dh('設定')}<div class="qcard" style="gap:6px"><h3 style="margin:0">資料去向</h3><ul style="margin:0;padding-left:1.2em" class="small"><li>本程式沒有伺服器，問卷結果只在這個瀏覽器處理。</li><li>設定與名單存在你選的資料夾。</li><li>放在雲端的檔案由該服務處理。</li></ul></div><div class="qcard" style="gap:8px"><h3 style="margin:0">資料夾</h3><div class="small">資料夾：<b>三年二班問卷</b> ${tag('已連線', 'ok')}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('選擇資料夾', 'secondary')}${btn('忘記這個資料夾', 'danger')}</div><div class="small muted">只讓瀏覽器忘記位置，不會動資料夾裡的任何檔案。</div></div><div class="qcard" style="gap:8px"><h3 style="margin:0">外觀</h3><div style="max-width:360px">${seg(['跟隨系統', '淺色', '深色'], 0, '外觀')}</div></div><div class="qcard" style="gap:6px"><h3 style="margin:0">瀏覽器支援</h3><div class="small">支援近兩年的 Chrome、Edge、Safari、Firefox，以及 iOS 16.4 以上。自動存取資料夾僅限桌機 Chrome／Edge，其餘改用手動下載與選檔。</div></div></div>`, 'padding:20px;overflow:hidden'))}${DK.nav('', '上一步').replace(/<button[^>]*btn-primary[^>]*>[^<]*<\/button>/, '')}`, '', 800, { prog: {} });

df('H5 準備資料：桌機兩欄（左四件事清單＋右內容）｜沿用平板通則：左欄 340 寬，每件事一列（編號圈、名稱、一行狀態、右側標籤；鎖住的顯示鎖頭並寫出缺什麼），目前項目高亮；右邊直接顯示該項內容，進頁預設開第一個未完成項。底部「回到上一步／下一步：看統計」。桌機設計稿（第二輪）的三欄工作台是統計之後的畫面，與此不衝突。', 2, `${body(pane(340, `<div style="padding:12px;display:flex;flex-direction:column;gap:8px"><div class="small"><b>完成 2／4</b> · 依序做完；前兩件是必做。</div>${[['1', '問卷類型', '票選幹部（建議）', '已確認', 'ok'], ['2', '欄位對應', '12 欄，已確認', '已確認', 'ok'], ['3', '學生名單（選用）', '41 人 · 還沒對照', '請確認', 'warn'], ['4', '資料檢查', '2 項待處理', '請確認', 'warn']].map(([n, t, s, g, c], i) => `<button class="rowbtn" type="button" ${i === 2 ? 'aria-current="true" style="border-color:var(--accent);background:var(--accent-soft)"' : ''}><div style="display:flex;gap:10px;align-items:center"><span style="flex:none;width:28px;height:28px;border-radius:50%;background:${c === 'ok' ? 'var(--accent)' : 'var(--sunk)'};color:${c === 'ok' ? 'var(--on-accent)' : 'var(--ink2)'};display:grid;place-items:center;font-weight:700">${c === 'ok' ? ic('check') : n}</span><div><div class="nm">${t}</div><div class="sm">${s}</div></div></div><span class="rt">${tag(g, c)}</span></button>`).join('')}<div class="small muted">完成「欄位對應」後就能看統計；名單與資料檢查之後再做也可以，統計會跟著更新。</div></div>`, 'border-right:1px solid var(--line-soft)'), main(`${dh('學生名單', '選用。有名單就能比對誰沒填、重複、冒名。名單存在你選的資料夾，不進瀏覽器儲存。')}<div style="max-width:420px">${seg(['同一班', '混班'], 0, '名單種類')}</div>${field('cn', '班級名稱（選填）', '三年二班')}<div style="display:flex;gap:8px">${btn('貼上名單', 'secondary')}${btn('開啟名單檔', 'secondary')}${btn('用你存過的名單', 'secondary')}</div>`, 'gap:12px;max-width:700px'))}${DK.nav('下一步：看統計', '回到首頁')}`, '三年二班_報告回饋.xlsx', 760, { prog: { 2: '2／4' } });

// ---- 教學、範本、去識別化（桌機）
const helpSide = (cur) => side(260, `<div class="small muted" style="font-weight:700;padding:4px 12px">教學</div>${['怎麼匯出成 Excel 檔', 'Google 登入遇到問題', 'Google 表單怎麼設計', '範本表單', '示範資料'].map((x, i) => DK.nvr(x, i === cur)).join('')}`);
df('G3 教學：Google 表單怎麼設計（五個技巧）｜桌機：左欄教學清單，右邊五個技巧（兩欄卡）＋題型對照表；題型名稱標「待核對」。', 1, `${body(helpSide(2), main(`${dh('Google 表單怎麼設計才好分析', '五個小技巧，匯出後欄位對應會更準。')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${tipList()}</div><h3 style="margin:8px 0 0">題型怎麼選</h3>${typeTable()}${verifyNote}`, 'gap:12px;overflow:hidden'))}${foot(btn('取得範本表單', 'primary'))}`, '', 1100, { prog: {} });
df('G4 教學：範本表單｜說明與手機相同；按鈕要求登入 Google（任何 Google 帳號都能用，流程同 D58／D58b／D57）並建立副本。', 1, `${body(helpSide(3), main(`${dh('取得範本表單', '用虛構的活動滿意度表單，看看好分析的表單長什麼樣子。')}${openTemplate()}${notice('', 'info', '範本表單裡沒有任何學生資料。副本在你的雲端硬碟裡，你想怎麼改都可以。')}${exportStepsLink}`, 'gap:12px;max-width:720px'))}`, '', 700, { prog: {} });
df('G5 教學：示範資料入口（R-001）｜示範資料只放在教學頁；載入後直接進準備資料，頂端出現「示範資料」標籤，不寫入資料夾、不進最近的問卷。', 1, `${body(helpSide(4), main(`${dh('先試試看', '還沒有自己的問卷也沒關係。')}${demoEntry()}${notice('', 'info', '示範資料是虛構的：41 位學生、姓名都是編的，載入後可以走完統計與輸出，不會存下任何東西。')}`, 'gap:12px;max-width:720px'))}`, '', 640, { prog: {} });

const qtDesk = (q) => body(main(`${dh('用快速範本', '選一個情境，題目與統計預設都先幫你設好。')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${QT.map((x, i) => qtCard(x, i === q)).join('')}</div>${qtHow}`, 'gap:12px;max-width:820px'), rside(430, `${qtPreview(QT[q], false)}${qtFlow}`));
df('Q1 快速範本：選擇畫面（R-009）｜桌機：左邊六張範本卡（兩欄），右邊預覽預設題目；入口放首頁左欄按鈕列下方的文字連結「用快速範本」與教學頁（待使用者確認入口）。', 1, `${qtDesk(0)}${DK.nav('用這個範本', '取消')}`, '', 800, { prog: {} });
df('Q2 快速範本：選「班規議題票選」｜類型為票選幹部，預覽題目不同；其餘與 Q1 相同。', 1, `${qtDesk(5)}${DK.nav('用這個範本', '取消')}`, '', 800, { prog: {} });

const outDesk = (inner, step = 4) => body(side(300, `<div class="small muted" style="font-weight:700;padding:4px 12px">輸出</div>${['輸出設定', '檔名與去識別化', '進度', '完成'].map((x, i) => DK.nvr(x, i === 0)).join('')}`), inner);
df('P1 輸出前提醒：學生版與家長版｜選了學生版或家長版，「給誰看」下方出現警示提示；主要鈕變「先預覽學生版」，「產生並下載」停用並寫原因。右邊是版本說明。', 4, `${outDesk(main(`${dh('輸出設定', '給誰看')}${viewPick(1)}${remind()}<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${btn('先預覽學生版', 'primary')}${btn('產生並下載', 'primary', { dis: true })}<span class="small" style="color:var(--ink2)">${ic('lock')} 要先逐則看過預覽才能產生。</span></div>`, 'gap:12px;max-width:640px'))}`, '三年二班_報告回饋.xlsx', 760, { prog: { 2: '4／4' } });
df('P2 必須預覽：留言逐則確認｜桌機：左邊留言清單（有風險的標警示底），右邊學生版即時預覽（單一配色，可「模擬黑白」）；底部開關「我已逐則看過」打開後才能產生。', 4, `${body(main(`${dh('留言預覽（學生版）', '第 1 位 · 林○○ · 3 則')}${pvNote}${previewList()}`, 'gap:10px;max-width:640px'), rside(520, `<div class="small muted" style="font-weight:700">學生版預覽（第 1 頁）</div><div style="display:flex;justify-content:center">${DK.miniPaper(0.5)}</div>${gateCheck(false)}`))}${foot(btn('返回', 'secondary'), btn('產生並下載', 'primary', { dis: true }))}`, '三年二班_報告回饋.xlsx', 900, { prog: { 2: '4／4' } });

// ====================================================================
// 輸出三個模擬頁
// ====================================================================
const tokens = rd(repo + '/docs/design/tokens.css').replace(/\/\*[\s\S]*?\*\/\s*/, '');
const css = [rd(sp + '/chrome.css'), rd(sp + '/app.css'), rd(sp + '/doc.css')].join('\n');
const sprite = rd(sp + '/sprite.html');
const extra = `.pagehead{display:flex;flex-direction:column;gap:6px;max-width:72ch}.round{display:flex;flex-direction:column;gap:32px}.scale{position:static!important;width:auto!important;height:auto!important}.scale>.dev,.scale>.paper{position:relative!important;transform:none!important}.figs{overflow-x:auto}`;
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
<header class="pagehead"><p class="small muted">設計規範的模擬頁，使用虛構資料。規範見 docs/design/DESIGN.md 5.23。</p><h1>${title}</h1><p class="muted">${intro}</p></header>
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
const INTRO = '第五輪（2026-11-01）：①補稿，以實際 src/ui（分支 app-v01）為準校正；②Google 表單設計教學頁、範本表單、示範資料入口；③快速範本；④學生版與家長版的去識別化提醒與必須預覽。Google 介面名稱只有已實際核對者為「已核對」，其餘標「待核對」。';
page('手機-第五輪', '第五輪補稿（手機）', INTRO, P);
page('平板-第五輪', '第五輪補稿（平板）', INTRO + ' 平板由手機自動轉成分欄，底部彈出面板改成靠右側彈出。', T);
page('桌機-第五輪', '第五輪補稿（桌機）', INTRO, DK_);
