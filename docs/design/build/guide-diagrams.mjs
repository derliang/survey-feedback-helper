// 教學圖解（2026-11-07 設計員出稿）：所有教學流程改成「自畫示意圖＋一兩句短字」。手機 390、平板 820、桌機 1280 各一個模擬頁。
// 背景：使用者 2026-11-07 裁示（docs/decisions/2026-11-07-取消登入警告與教學圖解化.md〈二〉）。
//       承接已定案的 Google 表單教學資訊架構（共同前置＋兩條並列流程，guide-flows.mjs、DESIGN.md 5.31），不推翻，只把文字步驟圖解化。
// 規範：DESIGN.md 5.32；決定記錄 docs/decisions/2026-11-07-教學圖解設計.md。**未動 src/**。
// 執行：node guide-diagrams.mjs → 寫入 ../mockups/{手機,平板,桌機}-教學圖解.html
// 做法：圖用 HTML 方塊＋少量內嵌 SVG（箭頭、游標），全部走 tokens，所以淺色深色自動成立、可縮放、不放點陣圖。
// 硬規則：不用 Google／Microsoft 截圖；圖上的按鈕與選單字樣一律取自 docs/design/Google介面核對紀錄.md 或 src/ui/strings.ts；沒核對過的標「待核對」。
// 全部是虛構資料（王老師、活動滿意度等）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'mockups');
const tokens = fs.readFileSync(path.join(here, '..', 'tokens.css'), 'utf8');
const lightBlock = tokens.match(/:root\s*\{[\s\S]*?\n\}/)[0];
const darkBlock = tokens.match(/:root\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/)[0].replace(':root[data-theme="dark"]', '.dk');

// ================= 圖解語彙（DESIGN.md 5.32 的元件，名稱對應 CSS class） =================
const svg = (d, cls = 'ic', s = 20) => `<svg class="${cls}" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  back: svg('<path d="M15 6l-6 6 6 6"/>'),
  chev: svg('<path d="M6 9l6 6 6-6"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  warn: svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
  list: svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
};
// 游標（「按這裡」）：實心箭頭，ink 填色、card 描邊，淺深色都看得到
const CUR = '<svg class="dg-cur" viewBox="0 0 16 20" width="14" height="18" aria-hidden="true" focusable="false"><path d="M1 1v15l4-4 3 7 3-1.4-3-6.6h6z" fill="var(--ink)" stroke="var(--card)" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const ARROW = `<div class="dg-ar" aria-hidden="true">${svg('<path d="M12 4v15M6 13l6 6 6-6"/>', 'ic', 18)}</div>`;

/** 一張圖：外框＋固定註記「自畫示意，不是截圖」；alt 給螢幕報讀（內部細節不重複報讀，步驟文字已說明）。 */
const fig = (body, alt, { tbc = false } = {}) =>
  `<figure class="dg" role="img" aria-label="${alt}（自畫示意，不是截圖${tbc ? '；部分字樣待核對' : ''}）">${body}<figcaption class="dg-cap" aria-hidden="true">自畫示意，不是截圖${tbc ? '<span class="tag warn sm">待核對</span>' : ''}</figcaption></figure>`;
/** 視窗：kind = 'app'（本程式）／'ext'（Google 等外部服務，字樣已核對）／'tbd'（外部且字樣未核對：虛線框） */
const win = (title, body, kind = 'ext') =>
  `<div class="dg-w ${kind}"><div class="dg-wt"><span class="dg-dots" aria-hidden="true"></span><span class="dg-wn">${title}</span>${kind === 'app' ? '<span class="dg-me">本程式</span>' : ''}</div><div class="dg-wb">${body}</div></div>`;
const b = (t, o = {}) => `<span class="dg-b${o.pri ? ' pri' : ''}${o.hot ? ' hot' : ''}">${t}${o.hot ? CUR : ''}</span>`;
const hot = (t, o = {}) => b(t, { ...o, hot: true });
const row = (...xs) => `<div class="dg-row">${xs.join('')}</div>`;
const sp = '<span class="dg-sp"></span>';
const ph = (w = 60) => `<span class="dg-ph" style="width:${w}%"></span>`; // 灰條：不重要、或字樣未核對而不寫的地方
const t = (x, cls = '') => `<span class="dg-t ${cls}">${x}</span>`;
const mi = (x, o = {}) => `<div class="dg-mi${o.sel ? ' sel' : ''}${o.no ? ' no' : ''}"><span class="mt">${x}</span>${o.ok ? '<span class="dg-ok">✓ 能讀</span>' : ''}${o.no ? '<span class="dg-no">✕ 讀不了</span>' : ''}${o.sub ? '<span class="dg-sub">›</span>' : ''}${o.sel && o.cur !== false ? CUR : ''}</div>`;
const menu = (items) => `<div class="dg-m">${items.join('')}</div>`;
const msep = '<div class="dg-msep"></div>';
const dlg = (title, body) => `<div class="dg-dlg"><b class="dh">${title}</b>${body}</div>`;
const radio = (x, on) => `<div class="dg-rd${on ? ' on' : ''}"><span class="dot" aria-hidden="true"></span>${x}</div>`;
const tabs = (xs, on) => `<div class="dg-tabs">${xs.map((x, i) => `<span class="dg-tab${i === on ? ' on hot' : ''}">${x}${i === on ? CUR : ''}</span>`).join('')}</div>`;
const flow = (...xs) => `<div class="dg-flow">${xs.join(ARROW)}</div>`;
const good = (x) => `<div class="dg-v ok"><b class="dg-ok">✓ 這樣做</b>${x}</div>`;
const bad = (x) => `<div class="dg-v no"><b class="dg-no">✕ 不要這樣</b>${x}</div>`;
const q = (title, type, body = '') => `<div class="dg-q"><div class="dg-row"><b>${title}</b>${sp}<span class="dg-type">${type}</span></div>${body}</div>`;
const file = (x) => `<span class="dg-file">${svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', 'ic', 16)}${x}</span>`;

// 每一步＝一張圖＋一兩句短字
const dsteps = (xs) => `<ol class="dsteps">${xs.map(([f, txt], i) => `<li class="dstep">${f}<div class="dtx"><span class="num" aria-hidden="true">${i + 1}</span><p>${txt}</p></div></li>`).join('')}</ol>`;
const u = (x) => `<b class="u">「${x}」</b>`;
const tbc = '<span class="tag warn">待核對</span>';

// ================= 每一張圖 =================
const SHEET = '活動滿意度 (回覆)'; // 虛構表單「活動滿意度」的回應試算表（格式「檔案名稱 (回覆)」已核對）
const F = {
  // ---- 共同前置 ----
  pre1: fig(win('Google 表單', row(t('活動滿意度', 'b'), sp, ph(30)) + `<div class="dg-pop">${row(t('Gemini 建立視窗', 'b'), sp, hot('✕'))}${ph(90)}${ph(70)}</div>`), '新表單跳出 Gemini 建立視窗，按右上角的 ✕ 關掉'),
  pre2: fig(flow(win('Google 表單', row(t('活動滿意度', 'b'), sp, hot('發布', { pri: true }))), dlg('發布表單', `${row(t('作答者'), t('知道連結的使用者', 'm'))}${row(sp, b('關閉'), hot('發布', { pri: true }))}`), row(t('右上變成'), b('已發布'))), '按右上「發布」，在「發布表單」視窗再按「發布」，右上變成「已發布」'),
  pre3: fig(win('Google 表單', `${tabs(['問題', '回覆 <span class="dg-badge">2</span>', '設定'], 1)}${t('2 則回應', 'b')}${ph(80)}`), '按上方的「回覆」分頁，有回應時分頁旁有數字'),
  pre4: fig(flow(win('Google 表單', row(t('2 則回應', 'b'), sp, hot('連結至試算表'), b('⋮'))), dlg('選取回應目標位置', `${radio('建立新試算表', true)}${radio('選取現有的試算表')}${row(sp, b('取消'), hot('建立', { pri: true }))}`)), '按「連結至試算表」，選「建立新試算表」，再按「建立」'),
  pre5: fig(win(SHEET, `<div class="dg-grid"><span class="h">時間戳記</span><span class="h">整體滿意度</span>${ph(90)}${ph(30)}${ph(90)}${ph(30)}</div>${row(`<span class="dg-sheettab mark">表單回覆 1</span>`)}`), '自動開新分頁顯示回應試算表，下方工作表名稱是「表單回覆 1」'),
  // ---- 做法一 ----
  m1a: fig(win('問卷回饋小幫手', `${t('今天要處理哪一份問卷？', 'b')}${row(hot('開啟試算表', { pri: true }), b('選擇 Excel 檔'))}`, 'app'), '本程式首頁，按「開啟試算表」'),
  m1b: fig(win('問卷回饋小幫手', `${t('登入前先看一下', 'b')}${ph(90)}${ph(60)}${row(sp, b('取消'), hot('前往 Google', { pri: true }))}`, 'app'), '看到「登入前先看一下」，按「前往 Google」'),
  m1c: fig(win('Google 視窗', `${t('選帳號', 'm')}<div class="dg-acct">${t('王')}<span>teacher.wang@gmail.com</span></div><div class="dg-acct hot">${t('王')}<span>wang@school.edu.tw</span>${CUR}</div>${row(sp, `<span class="dg-b ghostb">（同意的按鈕）</span>`)}`, 'tbd'), '照 Google 視窗的指示，選放著這份試算表的帳號並按同意', { tbc: true }),
  m1d: fig(win('Google 選檔視窗', `<div class="dg-acct">${file('其他試算表')}</div><div class="dg-acct hot">${file(SHEET)}${CUR}</div><div class="dg-acct">${file('其他試算表')}</div>`, 'tbd'), `在 Google 選檔視窗選「${SHEET}」`, { tbc: true }),
  m1e: fig(flow(win('問卷回饋小幫手', `${t('讀取試算表中…', 'b')}<span class="dg-prog"><span></span></span>`, 'app'), win('問卷回饋小幫手', `<div class="dg-step4"><span>開啟問卷</span><span class="on">準備資料</span><span>統計</span><span>輸出</span></div>`, 'app')), '本程式顯示「讀取試算表中…」，讀完進入「準備資料」'),
  case1: fig(flow(`<div class="dg-v no"><b class="dg-no">✕ 常擋登入視窗</b>LINE 等 App 內建的瀏覽器</div>`, `<div class="dg-v ok"><b class="dg-ok">✓ 改用</b>Safari 或 Chrome 開啟本網站，再按一次</div>`), '登入視窗沒打開時：改用 Safari 或 Chrome 開啟本網站'),
  // ---- 做法二 ----
  m2a: fig(win(SHEET, `${row(hot('檔案'), t('編輯'), t('查看'), t('插入'), ph(15))}<div class="dg-cas">${menu([`<div class="dg-mi"><span class="mt">${ph(50)}</span></div>`, msep, mi('共用'), mi('電子郵件'), mi('下載', { sel: true, sub: true, cur: false }), msep, `<div class="dg-mi"><span class="mt">${ph(40)}</span></div>`])}${menu([mi('Microsoft Excel (.xlsx)', { sel: true, ok: true }), mi('OpenDocument 檔案 (.ods)', { no: true }), mi('PDF 檔案 (.pdf)', { no: true }), mi('網頁 (.html)', { no: true }), mi('逗號分隔值檔案 (.csv)', { ok: true }), mi('Tab 鍵分隔值檔案 (.tsv)', { ok: true })])}</div>`), '在試算表按「檔案」、「下載」、「Microsoft Excel (.xlsx)」；.csv、.tsv 也能讀，.ods、.pdf、.html 讀不了'),
  m2b: fig(win('問卷回饋小幫手', `${t('今天要處理哪一份問卷？', 'b')}<div class="dg-drop">${file('剛下載的 .xlsx')}${t('把 Excel 檔拖到這裡', 'm')}</div>${row(b('開啟試算表', { pri: true }), hot('選擇 Excel 檔'))}`, 'app'), '回到本程式首頁，按「選擇 Excel 檔」，或把檔案拖進首頁'),
  m2alt: fig(win('Google 表單', `${row(t('2 則回應', 'b'), sp, b('在試算表中查看'), hot('⋮'))}${menu([mi('有新回應時透過電子郵件通知我'), mi('選取回應目標位置'), mi('取消連結表單'), mi('下載回應 (.csv)', { sel: true }), mi('列印所有回應'), mi('刪除所有回應')])}`), '另一條路：表單「回覆」分頁按「⋮」，選「下載回應 (.csv)」'),
  // ---- 表單怎麼設計 ----
  tip1: fig(`${good(`${q('班級', '簡答')}${q('座號', '簡答')}${q('姓名', '簡答')}`)}${bad(q('班級座號姓名', '簡答'))}`, '班級、座號、姓名各一題用簡答，不要合成一題'),
  tip2: fig(`${good(q('你選誰當班長？', '選擇題', `${radio('王小明')}${radio('李小華')}`))}${bad(`${q('你選誰當班長？', '簡答')}<div class="dg-row">${b('王小明')}${b('小明')}${b('王 小明')}</div>`)}`, '候選人用選擇題固定選項；自己打字會出現好幾種寫法'),
  tip3: fig(`${good(`<div class="dg-scale"><span>非常不滿意</span><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><span>非常滿意</span></div>${t('每題都是數字大＝更好、更同意', 'm')}`)}${bad(`<div class="dg-scale"><span>非常同意</span><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b><span>非常不同意</span></div>${t('同一份問卷裡方向反過來', 'm')}`)}`, '線性刻度每題方向一致，數字大代表更好'),
  tip5: fig(flow(win('Google 表單（作答畫面）', `${ph(80)}${ph(50)}${row(hot('提交', { pri: true }))}`), win(SHEET, `<div class="dg-grid"><span class="h mark">時間戳記</span><span class="h mark">整體滿意度</span>${ph(90)}${ph(30)}</div>${t('標題對不對？', 'm')}`)), '自己填一份按「提交」，再到回應試算表看第一列標題對不對'),
  types: fig(menu([mi('簡答', { sel: true, cur: false }), mi('詳答', { sel: true, cur: false }), msep, mi('選擇題', { sel: true, cur: false }), mi('核取方塊', { sel: true, cur: false }), mi('下拉式選單'), msep, mi('檔案上傳'), msep, mi('線性刻度', { sel: true, cur: false }), mi('評分'), mi('單選方格', { sel: true, cur: false }), mi('核取方塊格'), msep, mi('日期'), mi('時間')]), '題目右上角的題型下拉選單，本程式常用的六種已標出'),
  // ---- 資料夾：怎麼手動存取（手機、平板） ----
  fdT1: fig(win('問卷回饋小幫手', `${t('設定有更新，還沒保存', 'b')}${row(hot('儲存到檔案', { pri: true }))}`, 'app'), '處理完按「儲存到檔案」'),
  fdT2: fig(win('分享選單（iPhone、iPad）', `${row(ph(20), ph(20), ph(20))}<div class="dg-acct hot">${file('儲存到檔案')}${CUR}</div>${t('選位置：iCloud 雲端硬碟、Google 雲端硬碟…', 'm')}`, 'tbd'), '在分享選單選「儲存到檔案」，再選一個位置', { tbc: true }),
  fdT3: fig(win('問卷回饋小幫手', `${t('今天要處理哪一份問卷？', 'b')}${row(b('開啟試算表', { pri: true }), b('選擇 Excel 檔'), hot('開啟設定檔'))}${t('從「檔案」選回剛才存的設定檔', 'm')}`, 'app'), '下次在首頁按「開啟設定檔」，從「檔案」選回來'),
  // ---- 資料夾：怎麼手動存取（桌機，Safari、Firefox） ----
  fdD1: fig(flow(win('問卷回饋小幫手', `${t('設定有更新，還沒保存', 'b')}${row(hot('下載設定檔', { pri: true }))}`, 'app'), row(file('設定檔（.sfh）'), t('存到你的電腦', 'm'))), '處理完按「下載設定檔」存到電腦'),
  fdD2: fig(win('問卷回饋小幫手', `${t('今天要處理哪一份問卷？', 'b')}${row(b('開啟試算表', { pri: true }), b('選擇 Excel 檔'), hot('開啟設定檔'))}${row(file('設定檔（.sfh）'))}`, 'app'), '下次在首頁按「開啟設定檔」選回來'),
  // ---- 快速範本 ----
  tq1: fig(win('問卷回饋小幫手', `<div class="dg-cards"><span class="dg-card hot">活動滿意度${CUR}</span><span class="dg-card">家長意見</span><span class="dg-card">教學回饋</span><span class="dg-card">學習自評</span></div>`, 'app'), '在快速範本選一個情境'),
  tq2: fig(win('問卷回饋小幫手', `${t('預設題目・活動滿意度', 'b')}${ph(90)}${ph(70)}${row(hot('複製題目清單', { pri: true }))}${t('已複製，貼進 Google 表單或文件就能用。', 'm')}`, 'app'), '按「複製題目清單」'),
  tq3: fig(win('Google 表單', `${q('整體來說，我對這次活動感到滿意', '線性刻度')}${t('問題類型會根據問題內容自動更新。', 'm')}${t('題型以題目右上角的下拉選單為準', 'm b')}`), '在 Google 表單貼上題目，題型以右上角下拉選單為準'),
  // ---- 選課分組志願 ----
  cs1: fig(win('Google 表單', `${q('第一志願', '單選方格')}${menu([mi('線性刻度'), mi('評分'), mi('單選方格', { sel: true }), mi('核取方塊格')])}`), '題型選「單選方格」'),
  cs2: fig(win('Google 表單', `${q('志願序', '單選方格', `${ph(80)}${ph(60)}${row(sp, hot('⋮'))}`)}${menu([`<div class="dg-mi"><span class="mt">${ph(70)}</span></div>`, `<div class="dg-mi sel"><span class="mt">✓ 每欄僅限一則回應</span>${CUR}</div>`])}`), '該題右下角按「⋮」，勾選「每欄僅限一則回應」'),
};

// ================= 文案（以 guide-flows.mjs 定案稿為底；只改成短句，資訊架構不變） =================
const T = {
  title: 'Google 表單教學',
  lead: '把問卷結果帶進本程式有兩種做法：直接讀取 Google 試算表，或下載檔案再匯入。後面還有表單設計技巧、範本表單和示範資料。',
  note: '圖都是自畫示意，不是 Google 截圖；Google 改版時以實際畫面為準。介面名稱核對日期：2026-11-07（桌機 Chrome、繁體中文介面），Safari、Firefox 與手機 App 可能不同。',
  nav: ['共同前置：建立回應試算表', '做法一：直接讀取 Google 試算表', '做法二：下載檔案再匯入', 'Google 表單怎麼設計', '範本表單', '示範資料'],
  pre: [
    [F.pre1, `開啟 Google 表單（docs.google.com/forms），打開你的表單。跳出 Gemini 建立視窗就按${u('✕')}關掉。`],
    [F.pre2, `按右上${u('發布')}，在${u('發布表單')}視窗再按${u('發布')}。`],
    [F.pre3, `按上方的${u('回覆')}分頁。`],
    [F.pre4, `按${u('連結至試算表')}，選${u('建立新試算表')}，再按${u('建立')}。`],
    [F.pre5, `自動開新分頁，就是回應試算表，工作表叫${u('表單回覆 1')}。`],
  ],
  preAfter: `已經連結過的表單，那顆按鈕會變成${u('在試算表中查看')}（按下去的行為${tbc}）。`,
  m1: {
    who: '桌機、願意登入 Google 的人。需要連網，瀏覽器不能擋彈出視窗。',
    steps: [
      [F.m1a, `回到本程式首頁，按${u('開啟試算表')}。`],
      [F.m1b, `看到${u('登入前先看一下')}，按${u('前往 Google')}。`],
      [F.m1c, `照 Google 視窗的指示，選放著這份試算表的帳號，按同意。${tbc}`],
      [F.m1d, `在 Google 選檔視窗選這份回應試算表。${tbc}`],
      [F.m1e, `看到${u('讀取試算表中…')}，讀完就進「準備資料」。`],
    ],
    later: `之後有新回應：再按一次${u('開啟試算表')}，選同一份就好。`,
    limit: '本程式只看得到你在 Google 選檔視窗選的那一份試算表。',
    cases: [
      ['登入視窗沒有打開。', `改用 Safari 或 Chrome 開啟本網站，再按一次；或允許這個網站的彈出式視窗。${tbc} 各瀏覽器設定的名稱。`, F.case1],
      ['視窗開了又關掉。', '再按一次，選好帳號後按同意。還是不行就改用做法二。', ''],
      ['登入了，但找不到要開的試算表。', `多半是選到沒有放這份試算表的帳號：重新登入，選放著它的那一個。沒看到帳號時按「使用其他帳戶」。${tbc} 實際字樣。`, ''],
    ],
  },
  m2: {
    who: '手機、平板、Safari、Firefox，或不想登入的人。',
    steps: [
      [F.m2a, `在回應試算表按${u('檔案')}›${u('下載')}›${u('Microsoft Excel (.xlsx)')}。`],
      [F.m2b, `回到本程式首頁，按${u('選擇 Excel 檔')}，選剛下載的檔案。電腦上也可以直接拖進首頁。`],
    ],
    later: '之後有新回應：重新下載、重新選一次檔，「最近的問卷」會自動帶入之前的欄位對應。',
    alt: [[F.m2alt, `另一條路：在表單的${u('回覆')}分頁按${u('⋮')}，選${u('下載回應 (.csv)')}（要有回應才能按）。`]],
  },
  tips: [
    [F.tip1, '姓名與座號分開問，用「簡答」', '班級、座號、姓名各一題，名單才對得準。'],
    [F.tip2, '候選人與書名用固定選項', '用「選擇題」，才不會同一個人有好幾種寫法。'],
    [F.tip3, '量表用「線性刻度」，方向一致', '每題都是數字大＝更好、更同意。'],
    ['', '開放題少而精', '一份問卷放 1～2 題就夠，題目寫具體。'],
    [F.tip5, '先自己填一份測試', '自己填一份，看回應試算表的標題對不對。'],
  ],
};

// 選帳號示意（沿用 5.25 chooser；拿掉「個人帳號／學校帳號」的分類說明，只講「選放著試算表的那個帳號」）
const chooser = () => `<div class="chooser" role="group" aria-label="Google 選帳號視窗示意（自畫簡化，不是 Google 截圖）"><div class="ch-box"><div class="ch-cap">Google 選帳號視窗（示意）</div>`
  + `<div class="ch-row"><span class="av" aria-hidden="true">王</span><span class="ch-t"><b>王老師</b><span>teacher.wang@gmail.com</span><span>沒有放這份試算表</span></span></div>`
  + `<div class="ch-row ok"><span class="av" aria-hidden="true">王</span><span class="ch-t"><b>王老師</b><span>wang@school.edu.tw</span><span>「${SHEET}」放在這裡</span></span><span class="pickt">✓ 選這個</span></div>`
  + `<div class="ch-row"><span class="av plus" aria-hidden="true">${IC.plus}</span><span class="ch-t"><b>使用其他帳戶</b><span>想用的帳號沒出現在清單時，按這裡再登入</span></span><span class="tbc2">字樣待核對</span></div></div>`
  + '<p class="hint">自畫示意，不是 Google 截圖；帳號都是虛構的。選放著這份試算表、或有權限開它的那個 Google 帳號。</p></div>';

const notice = (kind, body, act = '') => `<div class="notice ${kind}"><span class="ni">${IC[kind === 'warn' ? 'warn' : 'info']}</span><div class="nb">${body}${act ? `<div class="na">${act}</div>` : ''}</div></div>`;
const who = (x) => `<p class="who"><b>適合：</b>${x}</p>`;
const navItems = (cur, A) => T.nav.map((n, i) => `<a class="nvr" href="#${A(i + 1)}"${i === cur ? ' aria-current="location"' : ''}>${n}</a>`).join('');
const fold = (title, sub, body, open) => `<details class="fold"${open ? ' open' : ''}><summary><span class="fs"><b>${title}</b>${sub ? `<span class="hint">${sub}</span>` : ''}</span>${IC.chev}</summary><div class="fb">${body}</div></details>`;

// ================= 教學頁整頁 =================
function guidePage({ w, dark = false, openFold = false, openToc = false, cur = 0, id }) {
  const A = (n) => `${id}-g${n}`;
  const m1 = T.m1;
  const m2 = T.m2;
  const cases = `<ol class="cases">${m1.cases.map(([h, x, f]) => `<li><strong>${h}</strong><span>${x}</span>${f}</li>`).join('')}</ol>${chooser()}${notice('info', '走不通就改用做法二：只要下載檔案再選檔，完全不用登入。', `<a class="btn secondary sm" href="#${A(3)}">改用做法二</a>`)}`;
  return `<div class="frame${dark ? ' dk' : ''}" style="--fw:${w}px" data-w="${w}"><div class="gpage">
<button class="btn ghost sm back" type="button">${IC.back}回首頁</button>
<h1>${T.title}</h1>
<p class="lead">${T.lead}</p>
<details class="toc"${openToc ? ' open' : ''}><summary class="btn secondary toc-s">${IC.list}<span>本頁目錄</span>${IC.chev}</summary><nav class="toc-n" aria-label="本頁目錄">${navItems(cur, A)}</nav></details>
<div class="gwrap">
<aside class="rail"><nav class="rail-n" aria-label="${T.title}">${navItems(cur, A)}</nav></aside>
<div class="gmain">
<p class="hint">${T.note}</p>
<section class="card" id="${A(1)}" aria-labelledby="${A(1)}h"><h2 id="${A(1)}h">${T.nav[0]}</h2><p>兩種做法都要先做這五步。已經有回應試算表，就直接看做法一或做法二。</p>${dsteps(T.pre)}<p class="hint">${T.preAfter}</p></section>
<p class="pick">前置做完後，選一種做法把問卷結果帶進本程式：</p>
<div class="methods">
<section class="card" id="${A(2)}" aria-labelledby="${A(2)}h"><div class="mh"><span class="tag accent">做法一</span></div><h2 id="${A(2)}h">${T.nav[1]}</h2>${who(m1.who)}${dsteps(m1.steps)}<p>${m1.later}</p><p class="hint">${m1.limit}</p>
${fold('遇到問題', '登入視窗沒打開、開了又關掉、找不到試算表', cases, openFold)}</section>
<section class="card" id="${A(3)}" aria-labelledby="${A(3)}h"><div class="mh"><span class="tag accent">做法二</span></div><h2 id="${A(3)}h">${T.nav[2]}</h2>${who(m2.who)}${dsteps(m2.steps)}<p>${m2.later}</p>
<ul class="dsteps alt">${m2.alt.map(([f, x]) => `<li class="dstep">${f}<div class="dtx"><p class="hint">${x}</p></div></li>`).join('')}</ul></section>
</div>
<section class="card" id="${A(4)}" aria-labelledby="${A(4)}h"><h2 id="${A(4)}h">Google 表單怎麼設計：五個技巧</h2>
<ol class="dsteps">${T.tips.map(([f, h, p], i) => `<li class="dstep">${f}<div class="dtx"><span class="num" aria-hidden="true">${i + 1}</span><div><strong>${h}</strong><p class="sub">${p}</p></div></div></li>`).join('')}</ol>
<h3>題型對照</h3>
<div class="typewrap"><div class="table-wrap"><table><thead><tr><th>你想問的</th><th>Google 表單的題型</th></tr></thead><tbody>${[['姓名、座號、班級', '簡答'], ['單選（候選人、書名、是否參加）', '選擇題'], ['複選（最有幫助的活動）', '核取方塊'], ['量表（1～5 分）', '線性刻度'], ['開放意見', '詳答'], ['一次評多個項目', '單選方格']].map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>${F.types}</div>
<p class="hint">貼上題目時 Google 會自動猜題型，以題目右上角的下拉選單為準。</p></section>
<section class="card" id="${A(5)}" aria-labelledby="${A(5)}h"><h2 id="${A(5)}h">範本表單</h2><p>一份虛構的「活動滿意度」Google 表單，建立副本到你的雲端硬碟就能改成自己的。</p>${notice('info', '範本表單還在準備中，建好後會放在這裡。現在可以用「快速範本」複製題目清單。')}<div class="btn-row"><button class="btn secondary" type="button">用快速範本</button></div></section>
<section class="card" id="${A(6)}" aria-labelledby="${A(6)}h"><h2 id="${A(6)}h">示範資料</h2><p>載入 41 人的虛構資料，直接走一遍準備資料、統計和輸出。</p><div class="btn-row"><button class="btn primary" type="button">載入示範資料</button></div></section>
</div></div></div></div>`;
}

// ================= 其他教學流程（教學頁以外、現在用文字一步步講解的地方） =================
const dnote = (x) => `<p class="dnote"><b>設計註記</b>${x}</p>`;
function othersPage({ w, dark = false, touch = true, id }) {
  return `<div class="frame${dark ? ' dk' : ''}" style="--fw:${w}px" data-w="${w}"><div class="gpage"><div class="gmain solo">
${dnote('首頁讀不到檔案時的「怎麼從 Google 表單匯出？」（strings.ts load.howExport）：現況是一行文字。改成做法二第 1 張圖＋一句話＋連到教學頁「做法二」。')}
<section class="card">${notice('warn', '這個檔案格式讀不了。請選擇 .xlsx 或 .csv 檔。')}
${fold('怎麼從 Google 表單匯出？', '', `${F.m2a}<p>在回應試算表按${u('檔案')}›${u('下載')}›${u('Microsoft Excel (.xlsx)')}，再回來按${u('選擇 Excel 檔')}。</p><a class="btn ghost sm" href="#">看完整教學</a>`, true)}</section>
${dnote('登入視窗被擋（GoogleConnect，popup_failed_to_open）：沿用「遇到問題」第 1 種情況的圖，放在三步上方；三步改短句。「登入視窗被關掉了」只有兩句，維持文字。')}
<section class="card"><h2>瀏覽器擋下了 Google 登入視窗</h2><p class="hint">這不是你的帳號有問題，也沒有讀取你的任何檔案。</p>${F.case1}
<ol class="tips2"><li><b>再按一次</b>按下方的「再試一次」。</li><li><b>改用 Safari 或 Chrome</b>LINE 等 App 內建的瀏覽器常常擋。</li><li><b>或允許彈出式視窗</b>到瀏覽器設定允許這個網站。${tbc}</li></ol>
<div class="btn-row end"><button class="btn secondary" type="button">改用 Excel 檔</button><button class="btn primary" type="button">再試一次</button></div></section>
${dnote(touch ? '資料夾不能自動存取時的「怎麼手動存取」（手機、平板：strings.ts folder.touchManualBody）。iPhone、iPad 分享選單的字樣沒有在本專案實機核對過，標待核對；Android 因機型而異。' : '資料夾不能自動存取時的「怎麼手動存取」（桌機 Safari、Firefox：strings.ts folder.manualBody）。')}
<section class="card">${fold('怎麼手動存取', '', touch ? dsteps([[F.fdT1, `處理完按${u('儲存到檔案')}。`], [F.fdT2, `在分享選單選${u('儲存到檔案')}，選一個位置。${tbc}`], [F.fdT3, `下次在首頁按${u('開啟設定檔')}，從「檔案」選回來。`]]) : dsteps([[F.fdD1, `處理完按${u('下載設定檔')}存到電腦。`], [F.fdD2, `下次在首頁按${u('開啟設定檔')}選回來，最近的問卷就會回來。`]]), true)}</section>
${dnote('快速範本頁（GuideView Templates）：現況是一句導言講完三件事。改成導言下方三步圖解；文字照舊集中在 strings.ts。')}
<section class="card"><h2>快速範本</h2><p class="lead">照著三步在 Google 表單建好、匯出後用本程式開啟，會自動認得。</p>${dsteps([[F.tq1, '選一個情境，看預設題目。'], [F.tq2, `按${u('複製題目清單')}。`], [F.tq3, '在 Google 表單貼上，題型以題目右上角的下拉選單為準。']])}</section>
${dnote('選課分組志願「怎麼用 Google 表單收志願？」（strings.ts course.courseHowBody）：一句話拆成兩步兩張圖；「⋮」選單裡其他項目沒有逐字核對，用灰條代替、不編字。')}
<section class="card">${fold('怎麼用 Google 表單收志願？', '', dsteps([[F.cs1, `題型選${u('單選方格')}。`], [F.cs2, `在該題右下角按${u('⋮')}，勾選${u('每欄僅限一則回應')}。`]]), true)}</section>
</div></div></div>`;
}

// ================= 圖解語彙說明卡（放在模擬頁上方，給施工與後續設計參考） =================
const legend = () => `<div class="frame" style="--fw:860px"><div class="gpage"><div class="gmain solo"><section class="card"><h2>圖解語彙（DESIGN.md 5.32）</h2>
<div class="lg">
<div>${win('問卷回饋小幫手', row(hot('開啟試算表', { pri: true }), b('選擇 Excel 檔')), 'app')}<p class="hint">本程式的畫面：標題列右邊有「本程式」小標。要按的元件＝強調色外框＋游標。</p></div>
<div>${win('Google 表單', row(t('2 則回應', 'b'), sp, hot('連結至試算表')))}<p class="hint">外部服務（字樣已核對）：實線框，標題列寫服務名稱，不畫 Logo。</p></div>
<div>${win('Google 視窗', `${ph(80)}${ph(50)}`, 'tbd')}<p class="hint">外部服務但字樣沒核對：虛線框、灰條代替文字，圖下標「待核對」，不編造字樣。</p></div>
<div>${menu([mi('Microsoft Excel (.xlsx)', { sel: true, ok: true }), mi('PDF 檔案 (.pdf)', { no: true })])}<p class="hint">選單：要選的項目淡底＋游標；能不能用一律寫字（✓ 能讀／✕ 讀不了＋刪除線），不只靠顏色。</p></div>
<div>${good(q('座號', '簡答'))}${bad(q('班級座號姓名', '簡答'))}<p class="hint">對照：「✓ 這樣做」「✕ 不要這樣」兩格上下排。</p></div>
<div>${flow(b('發布', { pri: true }), b('已發布'))}<p class="hint">先後：向下箭頭（窄卡也不會擠），不用左右箭頭。</p></div>
</div></section></div></div></div>`;

// ================= CSS =================
const css = `
${lightBlock}
${darkBlock}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#dfe2e8;color:#14171f;font-family:var(--font);font-size:15px;line-height:1.6}
.mock{max-width:1360px;margin:0 auto;padding:24px 16px 64px;display:flex;flex-direction:column;gap:20px}
.mock h1.t{font-size:22px;margin:0}
.mock .note{background:#fff;border:1px solid #cfd3dc;border-radius:12px;padding:14px 16px;display:grid;gap:6px;max-width:860px}
.mock .note ul{margin:0;padding-left:1.3em;display:grid;gap:4px}
.mock .note h2{font-size:16px;margin:0}
.cap{font-weight:700;max-width:860px}
.row{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
.cell{display:flex;flex-direction:column;gap:12px;max-width:100%}
.frame{width:var(--fw);max-width:100%;container-type:inline-size;background:var(--paper);color:var(--ink);font-family:var(--font);font-size:var(--fs-md);line-height:var(--lh-body);border:1px solid var(--line);border-radius:var(--r-md)}
.frame.dk{color-scheme:dark}
.gpage{padding:var(--sp-4);display:grid;gap:var(--sp-3);grid-template-columns:minmax(0,1fr)}
.gpage>*{min-width:0}
.frame h1{font-size:var(--fs-2xl);line-height:var(--lh-tight);margin:0;text-wrap:balance}
.frame h2{font-size:var(--fs-xl);line-height:var(--lh-tight);margin:0;text-wrap:balance}
.frame h3{font-size:var(--fs-lg);line-height:var(--lh-tight);margin:0}
.frame p{margin:0;text-wrap:pretty}
.frame .lead{color:var(--ink2)}
.hint{font-size:var(--fs-sm);color:var(--ink2)}
.frame a{color:var(--accent-ink)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--sp-2);min-height:var(--tap);padding:0 var(--sp-4);border-radius:var(--r-sm);border:1px solid transparent;font:inherit;font-weight:600;font-size:var(--fs-md);text-decoration:none;cursor:pointer;background:none;color:var(--accent-ink);transition:background var(--dur),border-color var(--dur)}
.btn.sm{min-height:var(--tap-min);font-size:15px;padding:0 var(--sp-3)}
.btn.primary{background:var(--accent);color:var(--on-accent)}
.btn.secondary{background:var(--card);border-color:var(--ink3);color:var(--ink)}
.btn.back{justify-self:start;padding-left:var(--sp-2)}
.btn-row{display:flex;flex-wrap:wrap;gap:var(--sp-3)}
.btn-row.end{justify-content:flex-end}
.frame :focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.card{background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:var(--sp-4);display:grid;gap:var(--sp-3);box-shadow:0 1px 2px var(--shadow-sm);min-width:0}
.card>*{min-width:0}
.gmain{display:grid;gap:var(--sp-4);min-width:0;align-content:start}
.pick{font-weight:600;color:var(--ink2)}
.methods{display:grid;gap:var(--sp-4);min-width:0}
.mh{display:flex}
.tag{display:inline-flex;align-items:center;height:26px;padding:0 var(--sp-2);border-radius:6px;font-size:var(--fs-xs);font-weight:700;background:var(--sunk);color:var(--ink2);white-space:nowrap;vertical-align:middle}
.tag.sm{height:20px;padding:0 6px}
.tag.accent{background:var(--accent-soft);color:var(--accent-ink)}
.tag.warn{background:var(--warn-soft);color:var(--warn)}
.num{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-ink);font-weight:700;font-size:var(--fs-sm);font-variant-numeric:tabular-nums}
.u{font-weight:600}
.who{background:var(--sunk);border-radius:var(--r-sm);padding:var(--sp-2) var(--sp-3);color:var(--ink)}
.cases{list-style:none;margin:0;padding:0;display:grid;gap:var(--sp-4)}
.cases li{display:grid;gap:var(--sp-2)}
.cases li>span{color:var(--ink2)}
.tips2{margin:0;padding-left:1.4em;display:grid;gap:var(--sp-2)}
.tips2 b{display:block}
.notice{display:flex;gap:var(--sp-3);padding:var(--sp-3);border-radius:var(--r-md);background:var(--accent-soft);color:var(--ink)}
.notice.warn{background:var(--warn-soft)}
.notice .ni{flex:none;color:var(--accent-ink);padding-top:2px}
.notice.warn .ni{color:var(--warn)}
.nb{display:grid;gap:var(--sp-2);min-width:0}
.na{display:flex}
.fold{border:1px solid var(--ctl);border-radius:var(--r-sm);background:var(--card)}
.fold>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:var(--sp-3);min-height:var(--tap);padding:var(--sp-2) var(--sp-3);cursor:pointer;border-radius:var(--r-sm)}
.fold>summary::-webkit-details-marker{display:none}
.fold .fs{display:grid;min-width:0;flex:1}
.fold>summary>.ic{flex:none;transition:transform var(--dur)}
.fold[open]>summary>.ic{transform:rotate(180deg)}
.fold[open]>summary{border-bottom:1px solid var(--line-soft);border-bottom-left-radius:0;border-bottom-right-radius:0}
.fb{display:grid;gap:var(--sp-3);padding:var(--sp-3)}
@media (hover:hover) and (pointer:fine){.fold>summary:hover{background:var(--sunk)}.btn.secondary:hover{background:var(--sunk);border-color:var(--ink2)}.btn.ghost:hover{background:var(--accent-soft)}.nvr:hover{background:var(--sunk)}}
.toc{display:block}
.toc-s{display:flex;justify-content:space-between;width:100%;list-style:none;cursor:pointer;gap:var(--sp-3)}
.toc-s span{flex:1;text-align:left}
.toc-s::-webkit-details-marker{display:none}
.toc-n{display:grid;gap:var(--sp-2);margin-top:var(--sp-2);background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:var(--sp-2)}
.nvr{display:flex;align-items:center;min-height:var(--tap);padding:var(--sp-2) var(--sp-3);border-radius:var(--r-sm);text-decoration:none;font-weight:600;font-size:15px;line-height:1.4}
.frame a.nvr{color:var(--ink2)}
.frame a.nvr[aria-current]{background:var(--accent-soft);color:var(--accent-ink);font-weight:700;box-shadow:inset 3px 0 0 var(--accent)}
.rail{display:none}
.rail-n{display:grid;gap:var(--sp-2)}
.gwrap{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--sp-4);min-width:0}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:15px}
th,td{text-align:left;padding:var(--sp-2) var(--sp-3);border-bottom:1px solid var(--line-soft);vertical-align:top}
th{font-size:var(--fs-sm);color:var(--ink2);background:var(--sunk)}
.typewrap{display:grid;gap:var(--sp-3);grid-template-columns:minmax(0,1fr)}
.dnote{border:1px dashed var(--ink3);border-radius:var(--r-sm);padding:var(--sp-2) var(--sp-3);font-size:var(--fs-sm);color:var(--ink2);display:grid;gap:2px}
.dnote b{color:var(--ink)}
/* 選帳號示意（沿用 5.25） */
.chooser{display:grid;gap:6px}
.ch-box{border:1px solid var(--ctl);border-radius:var(--r-md);overflow:hidden;background:var(--card)}
.ch-cap{padding:8px 12px;font-size:var(--fs-sm);font-weight:600;background:var(--sunk);color:var(--ink2)}
.ch-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid var(--line-soft);flex-wrap:wrap}
.ch-row.ok{background:var(--ok-soft)}
.av{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--sunk);color:var(--ink2)}
.av.plus{background:none;color:var(--accent-ink)}
.ch-t{flex:1;min-width:140px;display:grid;line-height:1.4}
.ch-t span{font-size:var(--fs-sm);color:var(--ink2);overflow-wrap:anywhere}
.pickt{flex:none;white-space:nowrap;font-size:var(--fs-xs);font-weight:700;padding:2px 10px;border-radius:999px;border:1px solid var(--ok);color:var(--ok);background:var(--ok-soft)}
.tbc2{flex:none;font-size:var(--fs-sm);font-weight:700;color:var(--warn)}

/* ===== 圖解步驟：每一步＝一張圖＋一兩句短字；欄數跟著卡片寬度自動排（手機 1 欄、平板 2 欄、桌機前置 3 欄） ===== */
.dsteps{list-style:none;margin:0;padding:0;display:grid;gap:var(--sp-4);grid-template-columns:repeat(auto-fill,minmax(232px,1fr));align-items:start}
.dstep{display:grid;gap:var(--sp-2);min-width:0}
.dtx{display:flex;gap:var(--sp-2);align-items:flex-start}
.dtx p{min-width:0}
.dtx .sub{color:var(--ink2);font-size:var(--fs-sm)}
.dtx strong{display:block}
/* ===== 圖解語彙 ===== */
.dg{margin:0;background:var(--sunk);border-radius:var(--r-md);padding:var(--sp-3);display:grid;gap:var(--sp-2);min-width:0;font-size:var(--fs-xs);line-height:1.45;color:var(--ink)}
.dg-cap{display:flex;flex-wrap:wrap;align-items:center;gap:6px;color:var(--ink2);font-size:var(--fs-xs)}
.dg-w{background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden;min-width:0;font-size:var(--fs-xs)}
.dg-w.tbd{border:1.5px dashed var(--ink3)}
.dg-wt{display:flex;align-items:center;gap:6px;padding:3px 8px;background:var(--sunk);border-bottom:1px solid var(--line-soft);color:var(--ink2);font-weight:600;min-width:0}
.dg-w.app .dg-wt{background:var(--accent-soft);color:var(--accent-ink)}
.dg-wn{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.dg-me{flex:none;font-size:var(--fs-xs);font-weight:700}
.dg-dots{flex:none;width:30px;height:8px;background:radial-gradient(circle at 4px 4px,var(--ink3) 3px,transparent 3.5px) 0 0/11px 8px repeat-x;opacity:.7}
.dg-wb{padding:8px;display:grid;gap:6px;min-width:0}
.dg-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.dg-sp{flex:1}
.dg-t{min-width:0;overflow-wrap:anywhere}
.dg-t.b{font-weight:700}
.dg-t.m{color:var(--ink2)}
.dg-b{position:relative;display:inline-flex;align-items:center;min-height:24px;padding:0 8px;border:1px solid var(--ctl);border-radius:6px;background:var(--card);color:var(--ink);font-weight:600;white-space:nowrap}
.dg-b.pri{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.dg-b.ghostb{border-style:dashed;color:var(--ink2);font-weight:400}
.hot{outline:2px solid var(--accent);outline-offset:2px;position:relative}
.dg-cur{position:absolute;right:-9px;bottom:-13px;pointer-events:none}
.dg-ph{display:block;height:8px;border-radius:4px;background:var(--line-soft);flex:none}
.dg-pop{border:1px solid var(--line);border-radius:6px;padding:6px;display:grid;gap:5px;background:var(--card);box-shadow:0 2px 6px var(--shadow-sm)}
.dg-dlg{border:1px solid var(--line);border-radius:8px;background:var(--card);padding:8px;display:grid;gap:6px;box-shadow:0 2px 6px var(--shadow-sm);min-width:0}
.dg-dlg .dh{font-size:var(--fs-xs)}
.dg-rd{display:flex;align-items:center;gap:6px}
.dg-rd .dot{flex:none;width:12px;height:12px;border-radius:50%;border:2px solid var(--ink3)}
.dg-rd.on .dot{border-color:var(--accent);background:radial-gradient(circle,var(--accent) 0 3px,transparent 3.5px)}
.dg-tabs{display:flex;gap:14px;border-bottom:1px solid var(--line-soft);padding-bottom:4px}
.dg-tab{position:relative;font-weight:600;color:var(--ink2);padding:0 2px}
.dg-tab.on{color:var(--ink)}
.dg-badge{display:inline-grid;place-items:center;min-width:16px;height:16px;border-radius:8px;background:var(--ink2);color:var(--card);font-size:11px;margin-left:2px}
.dg-flow{display:grid;gap:4px;min-width:0}
.dg-ar{display:flex;justify-content:center;color:var(--accent-ink)}
.dg-m{border:1px solid var(--line);border-radius:6px;background:var(--card);box-shadow:0 2px 6px var(--shadow-sm);display:grid;padding:3px 0;min-width:0}
.dg-mi{position:relative;display:flex;align-items:center;gap:6px;padding:2px 8px;min-width:0}
.dg-mi .mt{flex:1;min-width:0;overflow-wrap:anywhere}
.dg-mi.sel{background:var(--accent-soft);color:var(--accent-ink);font-weight:700;box-shadow:inset 2px 0 0 var(--accent)}
.dg-mi.no .mt{text-decoration:line-through;color:var(--ink2)}
.dg-mi .dg-cur{right:6px;bottom:-8px}
.dg-msep{border-top:1px solid var(--line-soft);margin:3px 0}
.dg-sub{color:var(--ink3)}
.dg-ok{color:var(--ok);font-weight:700;white-space:nowrap}
.dg-no{color:var(--bad);font-weight:700;white-space:nowrap}
.dg-cas{display:grid;gap:6px;grid-template-columns:minmax(0,1fr)}
.dg-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line-soft);gap:0}
.dg-grid>*{border:1px solid var(--line-soft);padding:3px 6px;min-height:22px}
.dg-grid .dg-ph{height:8px;margin:6px;border:0;padding:0;min-height:0}
.dg-grid .h{font-weight:700;background:var(--sunk)}
.dg-sheettab{display:inline-block;padding:2px 8px;border:1px solid var(--line);border-top:0;background:var(--card);font-weight:700}
.mark{outline:2px dashed var(--accent);outline-offset:1px}
.dg-acct{position:relative;display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid var(--line-soft);border-radius:6px;min-width:0;overflow-wrap:anywhere}
.dg-acct>.dg-t{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--sunk);font-weight:700}
.dg-acct.hot{background:var(--accent-soft)}
.dg-acct .dg-cur{right:6px;bottom:-8px}
.dg-file{display:inline-flex;align-items:center;gap:4px;font-weight:600;min-width:0;overflow-wrap:anywhere}
.dg-file .ic{flex:none;color:var(--ink2)}
.dg-prog{display:block;height:6px;border-radius:3px;background:var(--sunk);overflow:hidden}
.dg-prog span{display:block;width:60%;height:100%;background:var(--accent)}
.dg-step4{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;text-align:center;color:var(--ink2)}
.dg-step4 span{border-top:3px solid var(--line);padding-top:2px}
.dg-step4 .on{border-color:var(--accent);color:var(--accent-ink);font-weight:700}
.dg-drop{border:1.5px dashed var(--ink3);border-radius:6px;padding:6px;display:grid;gap:4px;justify-items:center;text-align:center}
.dg-v{display:grid;gap:4px;border-radius:6px;padding:6px;background:var(--card);border:1px solid var(--line-soft)}
.dg-v.ok{border-color:var(--ok)}
.dg-v.no{border-color:var(--bad)}
.dg-q{display:grid;gap:4px;border:1px solid var(--line-soft);border-radius:6px;padding:4px 6px;background:var(--card);min-width:0}
.dg-type{flex:none;border:1px solid var(--ctl);border-radius:4px;padding:0 6px;color:var(--ink2);white-space:nowrap}
.dg-scale{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.dg-scale b{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--ink3);display:grid;place-items:center;font-size:11px}
.dg-scale span{color:var(--ink2)}
.dg-cards{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.dg-card{position:relative;border:1px solid var(--ctl);border-radius:6px;padding:6px;font-weight:700;background:var(--card)}
.dg-card.hot{background:var(--accent-soft);color:var(--accent-ink);border-color:var(--accent)}
.lg{display:grid;gap:var(--sp-4);grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.lg>div{display:grid;gap:var(--sp-2);align-content:start;font-size:var(--fs-xs);line-height:1.45}
@container (min-width: 600px){
  .gpage{padding:var(--sp-5);gap:var(--sp-4)}
  .card{padding:var(--sp-5)}
  .toc{display:none}
  .rail{display:block;position:sticky;top:var(--sp-4);align-self:start}
  .gwrap{grid-template-columns:200px minmax(0,1fr);gap:var(--sp-5)}
  .typewrap{grid-template-columns:minmax(0,1fr) 220px;align-items:start}
}
@container (min-width: 1024px){
  .gpage{max-width:1240px;margin:0 auto}
  .gwrap{grid-template-columns:240px minmax(0,1fr)}
  .methods{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
  .gmain.solo{max-width:960px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

// ================= 組頁 =================
const shell = (title, intro, body) => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}（模擬頁）</title>
<style>${css}</style>
</head>
<body><div class="mock">
<h1 class="t">${title}（模擬頁）</h1>
${intro}
${body}
</div></body></html>
`;
const intro = (device, extra) => `<div class="note"><h2>設計說明（${device}）</h2><ul>
<li>依使用者 2026-11-07 裁示：<b>所有教學流程改成自畫圖解＋簡單文字</b>。每一步＝一張自畫示意圖＋一兩句短字；圖下固定寫「自畫示意，不是截圖」。</li>
<li>Google 表單教學沿用已定案的資訊架構（共同前置＋做法一、做法二並列，桌機並排，標題「Google 表單教學」），只把文字步驟圖解化；另外五個地方（首頁匯出提示、登入視窗被擋、資料夾手動存取、快速範本、選課分組志願）也一併圖解。</li>
<li>圖上的按鈕與選單名稱一律取自 docs/design/Google介面核對紀錄.md（2026-11-07，桌機 Chrome、繁體中文）或 src/ui/strings.ts；沒核對過的畫面畫成虛線框、用灰條代替文字並標「待核對」。英文介面不核對。</li>
<li>決定記錄：docs/decisions/2026-11-07-教學圖解設計.md；規範：DESIGN.md 5.32；產生程式 docs/design/build/guide-diagrams.mjs。</li>
${extra}</ul></div>`;

const phone = shell('教學圖解（手機 390）',
  intro('手機', '<li>手機：每一步的圖在上、字在下，一欄排到底；圖寬約 326。目錄仍是頁首下方的「本頁目錄」折疊鈕。</li>'),
  `${legend()}
<div class="row">
<div class="cell"><div class="cap">A. Google 表單教學（淺色）</div>${guidePage({ w: 390, id: 'pa' })}</div>
<div class="cell"><div class="cap">B. 深色，目錄與「遇到問題」展開</div>${guidePage({ w: 390, id: 'pb', dark: true, openToc: true, openFold: true })}</div>
<div class="cell"><div class="cap">C. 其他教學流程（淺色）</div>${othersPage({ w: 390, id: 'pc' })}</div>
<div class="cell"><div class="cap">D. 其他教學流程（深色）</div>${othersPage({ w: 390, id: 'pd', dark: true })}</div>
</div>`);

const tablet = shell('教學圖解（平板 820）',
  intro('平板', '<li>平板：左欄 200；步驟圖一列兩張（內容欄約 500）。題型對照表右邊並排題型下拉選單的圖。資料夾手動存取用手機、平板版（分享選單）。</li>'),
  `<div class="row">
<div class="cell"><div class="cap">A. Google 表單教學（淺色，目前在「共同前置」）</div>${guidePage({ w: 820, id: 'ta', cur: 0 })}</div>
<div class="cell"><div class="cap">B. 深色，「遇到問題」展開，目前在「做法一」</div>${guidePage({ w: 820, id: 'tb', dark: true, openFold: true, cur: 1 })}</div>
<div class="cell"><div class="cap">C. 其他教學流程（淺色）</div>${othersPage({ w: 820, id: 'tc' })}</div>
</div>`);

const desktop = shell('教學圖解（桌機 1280）',
  intro('桌機', '<li>桌機：左欄 240；共同前置的五張圖一列三張；兩個做法並排，各自一欄圖。資料夾手動存取用桌機版（下載設定檔，Safari、Firefox）。</li>'),
  `<div class="cell"><div class="cap">A. Google 表單教學（淺色，目前在「共同前置」）</div>${guidePage({ w: 1280, id: 'da', cur: 0 })}</div>
<div class="cell"><div class="cap">B. 深色，「遇到問題」展開，目前在「做法一」</div>${guidePage({ w: 1280, id: 'db', dark: true, openFold: true, cur: 1 })}</div>
<div class="cell"><div class="cap">C. 其他教學流程（淺色）</div>${othersPage({ w: 1280, id: 'dc', touch: false })}</div>`);

fs.writeFileSync(path.join(out, '手機-教學圖解.html'), phone);
fs.writeFileSync(path.join(out, '平板-教學圖解.html'), tablet);
fs.writeFileSync(path.join(out, '桌機-教學圖解.html'), desktop);
console.log('wrote 3 mockups');
