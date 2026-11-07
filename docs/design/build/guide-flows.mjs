// Google 表單教學頁改版（2026-11-07 設計員出稿）：手機 390、平板 820、桌機 1280 各一個模擬頁。
// 背景：教學頁的資訊架構已由使用者裁示為「方案 A」：共同前置只寫一次 → 做法一（直接讀取 Google 試算表）、做法二（下載檔案再匯入）並列，
//       故障排除降為做法一底下的折疊「遇到問題」；左欄導覽由五項改六項。見 docs/decisions/2026-11-07-Google教學兩條正常流程資訊架構草案.md〈使用者裁示〉。
// 規範：DESIGN.md 5.31；決定記錄 docs/decisions/2026-11-07-Google教學改版設計.md。**未動 src/**。
// 執行：node guide-flows.mjs   →  寫入 ../mockups/{手機,平板,桌機}-Google教學兩條流程.html
// 方法：同一份頁面用「容器查詢」跟著畫面（frame）的寬度重排，所以 390／820／1280 三個畫面是同一套 CSS 的真實結果，不是三張各畫各的圖。
// 全部是虛構資料。Google 視窗字樣尚未核對的地方一律標「待核對」，不編造字樣。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'mockups');
const tokens = fs.readFileSync(path.join(here, '..', 'tokens.css'), 'utf8');

// ---------- tokens：淺色 :root 原樣放入；深色把 :root[data-theme="dark"] 改成 .dk（模擬頁淺深並排，不靠系統設定） ----------
const lightBlock = tokens.match(/:root\s*\{[\s\S]*?\n\}/)[0];
const darkBlock = tokens.match(/:root\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/)[0].replace(':root[data-theme="dark"]', '.dk');

// ---------- 文案（以 src/ui/strings.ts 的 guide 段為底，依 2026-11-07 核對與裁示改寫） ----------
const u = (t) => `<b class="u">「${t}」</b>`; // Google 介面上的名稱，照核對紀錄逐字
const mp = (...xs) => `<span class="mp">${xs.map((x) => `<span class="mpi">${x}</span>`).join('<span class="mps" aria-hidden="true">›</span>')}</span>`; // 選單路徑
const tbc = '<span class="tag warn">待核對</span>';

const T = {
  title: 'Google 表單教學',
  lead: '把問卷結果帶進本程式有兩種做法：直接讀取 Google 試算表，或下載檔案再匯入。後面還有表單設計技巧、範本表單和示範資料。',
  nav: ['共同前置：建立回應試算表', '做法一：直接讀取 Google 試算表', '做法二：下載檔案再匯入', 'Google 表單怎麼設計', '範本表單', '示範資料'],
  pre: {
    lead: '兩種做法都要先做這五步，讓表單有一份回應試算表。已經有了，就直接看做法一或做法二。',
    steps: [
      `開啟 Google 表單（docs.google.com/forms），打開你的表單。新表單一開始可能會彈出 Gemini 建立視窗，按右上角的${u('✕')}關閉即可，不是必要步驟。`,
      `表單要先發布才收得到回應：按右上角的${u('發布')}，在${u('發布表單')}視窗再按${u('發布')}。發布後右上角會顯示${u('已發布')}。`,
      `在表單上方按${u('回覆')}分頁。有回應後，分頁旁會出現數字，標題是${u('N 則回應')}。`,
      `按${u('連結至試算表')}，在${u('選取回應目標位置')}視窗選${u('建立新試算表')}，再按${u('建立')}。已經連結過的表單，這顆按鈕會變成${u('在試算表中查看')}（按下去的行為${tbc}）。`,
      `會自動開一個新分頁顯示 Google 試算表，工作表名稱是${u('表單回覆 1')}，檔案預設名稱是${u('（檔案名稱） (回覆)')}。`,
    ],
    checked: '介面名稱核對日期：2026-11-07（桌機 Chrome、繁體中文介面）。Safari、Firefox 與手機 App 的畫面可能不同；Google 改版時以實際畫面為準。',
  },
  pick: '前置做完後，選一種做法把問卷結果帶進本程式：',
  m1: {
    tag: '做法一',
    title: '做法一：直接讀取 Google 試算表',
    who: '桌機、願意登入 Google 的人。需要連網，瀏覽器不能擋彈出視窗。',
    steps: [
      `回到本程式首頁，按${u('開啟試算表')}。`,
      `看到${u('登入前先看一下')}，按${u('前往 Google')}。`,
      `照 Google 視窗的指示選帳號，並按同意。${tbc}`,
      `照 Google 選檔視窗的指示，選剛才那份${u('（檔案名稱） (回覆)')}試算表。${tbc}`,
      `本程式顯示${u('讀取試算表中…')}，讀完就進「準備資料」。`,
    ],
    later: `之後有新回應：再按一次${u('開啟試算表')}，選同一份就好。「最近的問卷」會自動帶入之前的欄位對應。`,
    limit: '本程式只看得到你在 Google 選檔視窗選的那一份試算表，其他檔案一概看不到。',
    foldTitle: '遇到問題',
    foldSub: '登入視窗沒打開、開了又關掉、找不到試算表',
    cases: [
      ['登入視窗沒有打開。', `再按一次；還是不行，改用 Safari 或 Chrome（LINE 等 App 內建瀏覽器常擋），或允許這個網站的彈出式視窗。${tbc} 各瀏覽器設定選單的名稱。`],
      ['視窗開了又關掉。', '再按一次，選好帳號後按同意。如果 Google 視窗顯示錯誤，可能是學校管理員限制了第三方應用程式：換另一個 Google 帳號再試，或改用做法二。'],
      ['登入了，但找不到要開的試算表。', `多半是選到沒有放這份試算表的帳號：重新登入，選放著它的那一個。沒看到帳號時按「使用其他帳戶」。${tbc} 實際字樣。`],
    ],
    exit: '走不通就改用做法二：只要下載檔案再選檔，完全不用登入。',
    exitBtn: '改用做法二',
  },
  m2: {
    tag: '做法二',
    title: '做法二：下載檔案再匯入',
    who: '手機、平板、Safari、Firefox、不想登入，或學校帳號被擋的人。',
    steps: [
      `在 Google 試算表（前置最後一步開的那個分頁）左上選單列按${mp('檔案', '下載', 'Microsoft Excel (.xlsx)')}，檔案就開始下載。想用 CSV，改選${u('逗號分隔值檔案 (.csv)')}。`,
      `只選 .xlsx 或 .csv。${u('OpenDocument 檔案 (.ods)')}、${u('PDF 檔案 (.pdf)')}、${u('網頁 (.html)')} 本程式讀不了。`,
      `回到本程式首頁，按${u('選擇 Excel 檔')}，選剛下載的檔案。電腦上也可以把檔案拖進首頁。`,
      '之後有新回應：重新下載、重新選一次檔。「最近的問卷」會自動帶入之前的欄位對應。',
    ],
    alt: `另一條 CSV 路徑：在表單的${u('回覆')}分頁，按右側的${u('⋮')}，選${u('下載回應 (.csv)')}（要有回應才能按）。`,
  },
  g3: {
    title: 'Google 表單怎麼設計：五個技巧',
    tips: [
      ['姓名與座號分開問，用「簡答」', '班級、座號、姓名各一題，不要合在同一格，名單對照才對得準。'],
      ['候選人與書名用固定選項', '用固定選項（選擇題）而不是讓同學自己打字，才不會同一個人或同一本書有好幾種寫法。'],
      ['量表用「線性刻度」，方向一致', '同一份問卷裡，數字大都代表更好、更同意。方向不一致，平均就沒有意義。'],
      ['開放題少而精', '一份問卷放 1～2 題就夠，題目寫得具體，例如「最喜歡的部分」「可以更好的地方」。'],
      ['先自己填一份測試', '送出前自己填一份，匯出看看欄位標題對不對，再發給同學。'],
    ],
    typesTitle: '題型對照',
    typesHead: ['你想問的', 'Google 表單的題型'],
    types: [
      ['姓名、座號、班級', '簡答'],
      ['單選（候選人、書名、是否參加）', '選擇題'],
      ['複選（最有幫助的活動）', '核取方塊'],
      ['量表（1～5 分）', '線性刻度'],
      ['開放意見', '詳答'],
      ['一次評多個項目', '單選方格'],
    ],
    typesNote: '題型名稱核對日期：2026-11-07（桌機 Chrome、繁體中文介面）。貼上題目時，Google 會依題目文字自動猜題型，題型以題目右上角的下拉選單為準。',
  },
  g4: {
    title: '範本表單',
    body: '一份虛構的「活動滿意度」Google 表單，建立副本到你的雲端硬碟就能改成自己的。裡面沒有任何學生資料。',
    soon: '範本表單還在準備中（需要用私人 Gmail 建立並共用連結），建好後會放在這裡。現在可以用「快速範本」複製題目清單，自己在 Google 表單建立。',
    btn: '用快速範本',
  },
  g5: {
    title: '示範資料',
    body: '載入 41 人的虛構資料，直接走一遍準備資料、統計和輸出。示範資料不會存進資料夾，也不會出現在「最近的問卷」，按「重新開始」就清除。',
    btn: '載入示範資料',
  },
};

// ---------- 小元件 ----------
const svg = (d) => `<svg class="ic" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  back: svg('<path d="M15 6l-6 6 6 6"/>'),
  chev: svg('<path d="M6 9l6 6 6-6"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  warn: svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
  list: svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
};
const notice = (kind, body, act = '') => `<div class="notice ${kind}"><span class="ni">${IC[kind === 'warn' ? 'warn' : 'info']}</span><div class="nb">${body}${act ? `<div class="na">${act}</div>` : ''}</div></div>`;
const steps = (xs) => `<ol class="steps">${xs.map((t, i) => `<li><span class="num" aria-hidden="true">${i + 1}</span><div>${t}</div></li>`).join('')}</ol>`;
const who = (t) => `<p class="who"><b>適合：</b>${t}</p>`;

// 選帳號示意（自畫簡化，沿用第七輪 acctkit.chooser 的內容；使用其他帳戶字樣待核對）
const chooser = () => `<div class="chooser" role="group" aria-label="Google 選帳號視窗示意（自畫簡化，不是 Google 截圖）"><div class="ch-box"><div class="ch-cap">Google 選帳號視窗（示意）</div>`
  + `<div class="ch-row"><span class="av" aria-hidden="true">王</span><span class="ch-t"><b>王老師</b><span>teacher.wang@gmail.com</span><span>個人帳號 · 沒有放這份試算表</span></span></div>`
  + `<div class="ch-row ok"><span class="av" aria-hidden="true">王</span><span class="ch-t"><b>王老師</b><span>wang@school.edu.tw</span><span>學校帳號 · 「讀書報告回饋 (回覆)」放在這裡</span></span><span class="pickt">✓ 選這個</span></div>`
  + `<div class="ch-row"><span class="av plus" aria-hidden="true">${IC.plus}</span><span class="ch-t"><b>使用其他帳戶</b><span>想用的帳號沒出現在清單時，按這裡再登入</span></span><span class="tbc2">字樣待核對</span></div></div>`
  + `<p class="hint">自畫示意，不是 Google 截圖；帳號都是虛構的。個人帳號、學校帳號都能用，選放著這份試算表的那一個。</p></div>`;

const navItems = (cur, A) => T.nav.map((n, i) => `<a class="nvr" href="#${A(i + 1)}"${i === cur ? ' aria-current="location"' : ''}>${n}</a>`).join('');

// ---------- 整頁 ----------
function page({ w, dark = false, openFold = false, openToc = false, cur = 0, id }) {
  const A = (n) => `${id}-g${n}`; // 錨點：同一頁多個畫面不重複 id
  const m1 = T.m1;
  const m2 = T.m2;
  return `<div class="frame${dark ? ' dk' : ''}" style="--fw:${w}px" data-w="${w}"><div class="gpage">
<button class="btn ghost sm back" type="button">${IC.back}回首頁</button>
<h1>${T.title}</h1>
<p class="lead">${T.lead}</p>
<details class="toc"${openToc ? ' open' : ''}><summary class="btn secondary toc-s">${IC.list}<span>本頁目錄</span>${IC.chev}</summary><nav class="toc-n" aria-label="本頁目錄">${navItems(cur, A)}</nav></details>
<div class="gwrap">
<aside class="rail"><nav class="rail-n" aria-label="${T.title}">${navItems(cur, A)}</nav></aside>
<div class="gmain">

<section class="card" id="${A(1)}" aria-labelledby="${A(1)}h"><h2 id="${A(1)}h">${T.nav[0]}</h2><p>${T.pre.lead}</p>${steps(T.pre.steps)}<p class="hint">${T.pre.checked}</p></section>

<p class="pick">${T.pick}</p>
<div class="methods">
<section class="card" id="${A(2)}" aria-labelledby="${A(2)}h"><div class="mh"><span class="tag accent">${m1.tag}</span></div><h2 id="${A(2)}h">${m1.title}</h2>${who(m1.who)}${steps(m1.steps)}<p>${m1.later}</p><p class="hint">${m1.limit}</p>
<details class="fold"${openFold ? ' open' : ''}><summary><span class="fs"><b>${m1.foldTitle}</b><span class="hint">${m1.foldSub}</span></span>${IC.chev}</summary><div class="fb"><ol class="cases">${m1.cases.map(([h, b]) => `<li><strong>${h}</strong><span>${b}</span></li>`).join('')}</ol>${chooser()}${notice('info', m1.exit, `<a class="btn secondary sm" href="#${A(3)}">${m1.exitBtn}</a>`)}</div></details></section>

<section class="card" id="${A(3)}" aria-labelledby="${A(3)}h"><div class="mh"><span class="tag accent">${m2.tag}</span></div><h2 id="${A(3)}h">${m2.title}</h2>${who(m2.who)}${steps(m2.steps)}<p class="hint">${m2.alt}</p></section>
</div>

<section class="card" id="${A(4)}" aria-labelledby="${A(4)}h"><h2 id="${A(4)}h">${T.g3.title}</h2><ol class="tips">${T.g3.tips.map(([h, p], i) => `<li><span class="num" aria-hidden="true">${i + 1}</span><div><strong>${h}</strong><p>${p}</p></div></li>`).join('')}</ol>
<h3>${T.g3.typesTitle}</h3><div class="table-wrap"><table><thead><tr>${T.g3.typesHead.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${T.g3.types.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div><p class="hint">${T.g3.typesNote}</p></section>

<section class="card" id="${A(5)}" aria-labelledby="${A(5)}h"><h2 id="${A(5)}h">${T.g4.title}</h2><p>${T.g4.body}</p>${notice('info', T.g4.soon)}<div class="btn-row"><button class="btn secondary" type="button">${T.g4.btn}</button></div></section>

<section class="card" id="${A(6)}" aria-labelledby="${A(6)}h"><h2 id="${A(6)}h">${T.g5.title}</h2><p>${T.g5.body}</p><div class="btn-row"><button class="btn primary" type="button">${T.g5.btn}</button></div></section>

</div></div></div></div>`;
}

// ---------- 「待核對」標籤撤除前後（建議，待使用者裁示） ----------
const tplPanel = (after, w) => {
  const li = (t, h) => `<li>${t}<span class="hint"> — ${h}</span>${after ? '' : ' <span class="todo-check">（待核對）</span>'}</li>`;
  const note = after
    ? '題型名稱是 Google 表單畫面上的字樣（2026-11-07 核對，桌機 Chrome、繁體中文介面）。題型以題目右上角的下拉選單為準。'
    : '題型名稱是 Google 表單畫面上的字樣，還沒有實際走過介面核對（待核對）。';
  return `<div class="frame" style="--fw:${w}px" data-w="${w}"><div class="gpage"><div class="gmain">`
    + `<section class="card"><h2>預設題目・活動滿意度</h2><p class="hint">量表：1 非常不滿意～5 非常滿意</p><ol class="tpl-q">${li('整體來說，我對這次活動感到滿意', '線性刻度 1～5')}${li('活動內容有趣、有收穫', '線性刻度 1～5')}${li('最喜歡的部分與可以更好的地方', '詳答')}</ol><p class="hint">${note}</p></section>`
    + `<section class="card"><h2>這是哪一種問卷？（選課分組志願）</h2><details class="fold" open><summary><span class="fs"><b>怎麼用 Google 表單收志願？</b></span>${after ? '' : '<span class="tag warn">待核對</span>'}${IC.chev}</summary><div class="fb"><p>選「單選方格」，勾選「每欄僅限一則回應」</p></div></details></section>`
    + '</div></div></div>';
};

// ---------- CSS ----------
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
.cell{display:flex;flex-direction:column;gap:12px}
/* 畫面框：容器查詢以它的寬度為準 */
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
/* 按鈕 */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--sp-2);min-height:var(--tap);padding:0 var(--sp-4);border-radius:var(--r-sm);border:1px solid transparent;font:inherit;font-weight:600;font-size:var(--fs-md);text-decoration:none;cursor:pointer;background:none;color:var(--accent-ink);transition:background var(--dur),border-color var(--dur)}
.btn.sm{min-height:var(--tap-min);font-size:15px;padding:0 var(--sp-3)}
.btn.primary{background:var(--accent);color:var(--on-accent)}
.btn.secondary{background:var(--card);border-color:var(--ink3);color:var(--ink)}
.btn.ghost{color:var(--accent-ink)}
.btn.back{justify-self:start;padding-left:var(--sp-2)}
.btn-row{display:flex;flex-wrap:wrap;gap:var(--sp-3)}
.frame :focus-visible{outline:3px solid var(--accent);outline-offset:2px}
/* 卡片 */
.card{background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:var(--sp-4);display:grid;gap:var(--sp-3);box-shadow:0 1px 2px var(--shadow-sm);min-width:0}
.card>*{min-width:0}
.gmain{display:grid;gap:var(--sp-4);min-width:0;align-content:start}
.pick{font-weight:600;color:var(--ink2)}
.methods{display:grid;gap:var(--sp-4);min-width:0}
.mh{display:flex}
/* 標籤 */
.tag{display:inline-flex;align-items:center;height:26px;padding:0 var(--sp-2);border-radius:6px;font-size:var(--fs-xs);font-weight:700;background:var(--sunk);color:var(--ink2);white-space:nowrap;vertical-align:middle}
.tag.accent{background:var(--accent-soft);color:var(--accent-ink)}
.tag.warn{background:var(--warn-soft);color:var(--warn)}
.todo-check{font-weight:700;color:var(--warn)}
/* 步驟（編號圈沿用 .tips .num） */
.steps,.tips,.cases{list-style:none;margin:0;padding:0;display:grid;gap:var(--sp-3)}
.steps li,.tips li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:var(--sp-3);align-items:start}
.num{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-ink);font-weight:700;font-size:var(--fs-sm);font-variant-numeric:tabular-nums}
.u{font-weight:600}
.mp{display:inline-flex;flex-wrap:wrap;align-items:center;gap:var(--sp-1);vertical-align:middle}
.mpi{padding:0 var(--sp-2);border:1px solid var(--line);border-radius:6px;background:var(--sunk);font-weight:600;font-size:15px}
.mps{color:var(--ink3)}
.who{background:var(--sunk);border-radius:var(--r-sm);padding:var(--sp-2) var(--sp-3);color:var(--ink)}
.tips li strong{display:block}
.tips li p{color:var(--ink2)}
.cases li{display:grid;gap:2px}
.cases li span{color:var(--ink2)}
/* 提示 */
.notice{display:flex;gap:var(--sp-3);padding:var(--sp-3);border-radius:var(--r-md);background:var(--accent-soft);color:var(--ink)}
.notice.warn{background:var(--warn-soft)}
.notice .ni{flex:none;color:var(--accent-ink);padding-top:2px}
.notice.warn .ni{color:var(--warn)}
.nb{display:grid;gap:var(--sp-2);min-width:0}
.na{display:flex}
/* 折疊「遇到問題」 */
.fold{border:1px solid var(--ctl);border-radius:var(--r-sm);background:var(--card)}
.fold>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:var(--sp-3);min-height:var(--tap);padding:var(--sp-2) var(--sp-3);cursor:pointer;border-radius:var(--r-sm)}
.fold>summary::-webkit-details-marker{display:none}
.fold .fs{display:grid;min-width:0;flex:1}
.fold .ic{flex:none;transition:transform var(--dur)}
.fold[open]>summary .ic{transform:rotate(180deg)}
.fold[open]>summary{border-bottom:1px solid var(--line-soft);border-bottom-left-radius:0;border-bottom-right-radius:0}
.fb{display:grid;gap:var(--sp-3);padding:var(--sp-3)}
@media (hover:hover) and (pointer:fine){.fold>summary:hover{background:var(--sunk)}.btn.secondary:hover{background:var(--sunk);border-color:var(--ink2)}.btn.ghost:hover{background:var(--accent-soft)}.nvr:hover{background:var(--sunk)}}
/* 目錄：手機是折疊鈕，平板以上是左欄 */
.toc{display:block}
.toc-s{display:flex;justify-content:space-between;width:100%;list-style:none;cursor:pointer;gap:var(--sp-3)}
.toc-s span{flex:1;text-align:left}
.toc-s::-webkit-details-marker{display:none}
.toc[open] .toc-s .ic:last-child{transform:rotate(180deg)}
.toc-n{display:grid;gap:var(--sp-2);margin-top:var(--sp-2);background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:var(--sp-2)}
.nvr{display:flex;align-items:center;min-height:var(--tap);padding:var(--sp-2) var(--sp-3);border-radius:var(--r-sm);color:var(--ink2);text-decoration:none;font-weight:600;font-size:15px;line-height:1.4}
.frame a.nvr{color:var(--ink2)}
.frame a.nvr[aria-current]{background:var(--accent-soft);color:var(--accent-ink);font-weight:700;box-shadow:inset 3px 0 0 var(--accent)}
.rail{display:none}
.rail-n{display:grid;gap:var(--sp-2)}
.gwrap{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--sp-4);min-width:0}
/* 表格 */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:15px}
th,td{text-align:left;padding:var(--sp-2) var(--sp-3);border-bottom:1px solid var(--line-soft);vertical-align:top}
th{font-size:var(--fs-sm);color:var(--ink2);background:var(--sunk)}
.tpl-q{margin:0;padding-left:1.4em;display:grid;gap:var(--sp-2)}
/* 選帳號示意 */
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
/* 平板以上（容器寬 ≥ 600）：左欄＋內容 */
@container (min-width: 600px){
  .gpage{padding:var(--sp-5);gap:var(--sp-4)}
  .card{padding:var(--sp-5)}
  .toc{display:none}
  .rail{display:block;position:sticky;top:var(--sp-4);align-self:start}
  .gwrap{grid-template-columns:200px minmax(0,1fr);gap:var(--sp-5)}
}
/* 桌機（容器寬 ≥ 1024）：左欄加寬、兩個做法並排 */
@container (min-width: 1024px){
  .gpage{max-width:1240px;margin:0 auto}
  .gwrap{grid-template-columns:240px minmax(0,1fr)}
  .methods{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

// ---------- 組頁 ----------
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
<li>依使用者 2026-11-07 裁示：<b>方案 A</b>。共同前置只寫一次；之後「做法一：直接讀取 Google 試算表」「做法二：下載檔案再匯入」兩張卡並列，<b>做法一在前</b>，每張開頭一句「適合：…」。原故障排除降為做法一底下的折疊「遇到問題」，保留「改用做法二」出口。導覽由五項改六項。</li>
<li>名稱與步驟一律用核對紀錄（docs/design/Google介面核對紀錄.md）實際走過的字樣；Google 選帳號、同意、選檔視窗的字樣沒核對過，稿中寫「照 Google 視窗的指示…」並標「待核對」。英文介面不核對。</li>
${extra}</ul></div>`;

const DEC = '決定記錄：docs/decisions/2026-11-07-Google教學改版設計.md；規範：DESIGN.md 5.31。';

// 手機
const phone = shell('Google 表單教學：兩條流程（手機 390）',
  intro('手機', `<li>手機沒有左欄：頁首下方一顆「本頁目錄」折疊鈕（48 高），展開後是六個 48 高的連結。兩個做法上下排（做法一在上）。</li><li>${DEC}</li>`),
  `<div class="row">
<div class="cell"><div class="cap">A. 整頁（淺色，折疊狀態）</div>${page({ w: 390, id: 'pa' })}</div>
<div class="cell"><div class="cap">B. 目錄展開、「遇到問題」展開</div>${page({ w: 390, id: 'pb', openToc: true, openFold: true })}</div>
<div class="cell"><div class="cap">C. 深色（整頁，折疊）</div>${page({ w: 390, id: 'pc', dark: true })}</div>
</div>
<div class="cap">附：「待核對」標籤撤除建議（快速範本、課程說明）。左：現況；右：建議。</div>
<div class="row"><div class="cell">${tplPanel(false, 390)}</div><div class="cell">${tplPanel(true, 390)}</div></div>`);

// 平板
const tablet = shell('Google 表單教學：兩條流程（平板 820）',
  intro('平板', `<li>平板有 200 寬的左欄（目前所在項目：淺藍底＋左側 3px 線＋粗體）。兩個做法仍上下排：內容欄只有約 540 寬，並排會太擠。</li><li>${DEC}</li>`),
  `<div class="row">
<div class="cell"><div class="cap">A. 整頁（淺色，折疊狀態，目前在「做法一」）</div>${page({ w: 820, id: 'ta', cur: 1 })}</div>
<div class="cell"><div class="cap">B. 深色，「遇到問題」展開</div>${page({ w: 820, id: 'tb', dark: true, openFold: true, cur: 1 })}</div>
</div>
<div class="cap">附：「待核對」標籤撤除建議（快速範本、課程說明）。左：現況；右：建議。</div>
<div class="row"><div class="cell">${tplPanel(false, 640)}</div><div class="cell">${tplPanel(true, 640)}</div></div>`);

// 桌機
const desktop = shell('Google 表單教學：兩條流程（桌機 1280）',
  intro('桌機', `<li>桌機左欄 240 寬；<b>兩個做法並排</b>（各約 470 寬），一眼比較「適合誰」。做法一的「遇到問題」展開時兩張卡高度不同，卡片頂端對齊、不拉齊高度。</li><li>${DEC}</li>`),
  `<div class="cell"><div class="cap">A. 整頁（淺色，折疊狀態，目前在「共同前置」）</div>${page({ w: 1280, id: 'da', cur: 0 })}</div>
<div class="cell"><div class="cap">B. 深色，「遇到問題」展開，目前在「做法一」</div>${page({ w: 1280, id: 'db', dark: true, openFold: true, cur: 1 })}</div>
<div class="cap">附：「待核對」標籤撤除建議（快速範本、課程說明）。左：現況；右：建議。</div>
<div class="row"><div class="cell">${tplPanel(false, 640)}</div><div class="cell">${tplPanel(true, 640)}</div></div>`);

fs.writeFileSync(path.join(out, '手機-Google教學兩條流程.html'), phone);
fs.writeFileSync(path.join(out, '平板-Google教學兩條流程.html'), tablet);
fs.writeFileSync(path.join(out, '桌機-Google教學兩條流程.html'), desktop);
console.log('wrote 3 mockups');
