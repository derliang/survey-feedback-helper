// 設計系統成品頁的產生器：把 tokens.css、app.css、doc.css、sprite.html 轉成 Design System 成品頁的檔案
// 用法：node docs/design/build/ds.mjs；輸出到 docs/design/design-system/project/，發佈方式見 docs/design/design-system/README.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ic, tag, icbtn, btn, notice, tile, seg, chips, rcard, opt, rowbtn, brow, field, grp, steps, sheet } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const design = path.resolve(here, '..');
const out = path.join(design, 'design-system', 'project');
const rd = (f) => fs.readFileSync(path.join(design, f), 'utf8');
const wr = (f, s) => { const p = path.join(out, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
fs.rmSync(out, { recursive: true, force: true });

/* ===== tokens：直接從 tokens.css 讀值，不另存一份 ===== */
const clean = rd('tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
const block = (re) => Object.fromEntries([...clean.match(re)[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const L = block(/:root\s*\{([\s\S]*?)\}/);
const D = block(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
const W = block(/\.doc-warm\s*\{([\s\S]*?)\}/);

const USAGE = {
  paper: '頁面底。', card: '卡片、導覽列、輸入框底。', sunk: '凹陷底：分段控制軌道、進度軌道、停用狀態。',
  ink: '主要文字，用在 paper、card、sunk 上。', ink2: '次要文字與說明，用在 paper、card、sunk 上。', ink3: '輔助文字與控制項外框，用在 paper、card、sunk 上。',
  line: '強分隔線、色票外框（裝飾用，控制項外框改用 ink3）。', 'line-soft': '卡片外框、列分隔（裝飾用）。',
  accent: '唯一強調色（鈷藍）：主按鈕、目前步驟、選取。深色版對 card 為 3.68:1，只當底色與圖形，文字改用 accent-ink。', 'on-accent': 'accent 底上的文字，兩個主題都是白字。',
  'accent-soft': '選取底、一般提示底。', 'accent-ink': '強調色文字與連結，用在 card、accent-soft 上。',
  ok: '成功文字，用在 ok-soft、card 上。', 'ok-soft': '成功底。', warn: '警示、同票、請確認的文字，用在 warn-soft、card 上。', 'warn-soft': '警示底。', bad: '錯誤與危險文字及外框，用在 bad-soft、card 上。', 'bad-soft': '錯誤底。',
  d1: '圖表資料色 1（藍）；一定搭配文字標籤。', d2: '圖表資料色 2（橙）。', d3: '圖表資料色 3（洋紅）。', d4: '圖表資料色 4（青）。', d5: '圖表資料色 5（琥珀）。', d0: '圖表的「其他」、未分類。',
  'warn-bar': '同票、需處理的長條。淺色版對 card 僅 2.26:1，旁邊一定要有數字與文字。', 'bar-muted': '未突顯的長條。對 card 僅約 1.7:1，旁邊一定要有數字與名稱。',
  scrim: '彈出面板與對話框的遮罩。', shadow: '底部彈出面板、分段控制選取項的陰影色。', 'shadow-sm': '卡片、數字磚、列、次按鈕的細微陰影色。',
};
const colorNames = Object.keys(USAGE);
const colors = colorNames.map((n) => ({ name: n, value: { light: L[n], dark: D[n] }, usage: USAGE[n] }));
const DOCU = { 'doc-paper': '輸出文件紙張底，永遠是淺色。', 'doc-ink': '輸出文件主要文字，用在 doc-paper 上。', 'doc-ink2': '輸出文件次要文字，用在 doc-paper 上。', 'doc-line': '輸出文件分隔線。', 'doc-accent': '琥珀：重點數字與標題，用在 doc-paper、doc-accent-soft 上。', 'doc-accent-soft': '輸出文件重點底。', 'doc-leaf': '綠：稱讚與優點，用在 doc-paper、doc-leaf-soft 上。', 'doc-leaf-soft': '稱讚底與老師評語底。' };
for (const n of Object.keys(DOCU)) colors.push({ name: n, value: { light: W[n], dark: W[n] }, usage: DOCU[n] });
// 五級量表固定色，值來自 DESIGN.md 5.6 與 doc.css 的 .paper
for (const [n, v, u] of [['likert-1', '#cf5f12', '量表 1 分（橘，不同意）。'], ['likert-2', '#eaa06a', '量表 2 分（淺橘）。'], ['likert-3', '#ddd5c8', '量表 3 分（暖灰）。'], ['likert-4', '#7f9be3', '量表 4 分（淺藍）。'], ['likert-5', '#2554d8', '量表 5 分（藍，同意）。']]) colors.push({ name: n, value: { light: v, dark: v }, usage: u + '只用在輸出文件，紙張永遠淺色。' });

const list = (keys, usage) => keys.map((n) => ({ name: n, value: L[n], usage: usage[n] }));
const tokens = {
  name: '問卷回饋小幫手', version: 1,
  meta: { source: 'github', repo: 'derliang/survey-feedback-helper', ref: process.env.DS_REF || 'main', paths: { tokens: ['docs/design/tokens.css'], docs: ['docs/design/DESIGN.md'] }, synced: new Date().toISOString().slice(0, 10) },
  color: { themes: [{ id: 'light', name: '淺色' }, { id: 'dark', name: '深色' }], tokens: colors },
  type: {
    fonts: [],
    families: { sans: L.font.replace(/\s+/g, ' '), mono: L['font-mono'] },
    groups: [
      { name: '介面', family: 'sans', styles: [
        { name: 'type-2xl', fontSize: '28px', lineHeight: 1.3, fontWeight: 700, sample: '三年二班 幹部票選', usage: '頁面大標題、統計大數字。' },
        { name: 'type-xl', fontSize: '22px', lineHeight: 1.3, fontWeight: 700, sample: '開啟問卷檔', usage: '區段標題、畫面標題。' },
        { name: 'type-lg', fontSize: '18px', lineHeight: 1.3, fontWeight: 700, sample: '第 3 題：你最喜歡哪個單元？', usage: '卡片標題、面板標題。' },
        { name: 'type-md', fontSize: '16px', lineHeight: 1.65, fontWeight: 400, sample: '資料只在這支手機的瀏覽器處理。', usage: '內文與輸入。手機輸入框不得小於 16。' },
        { name: 'type-md-strong', fontSize: '16px', lineHeight: 1.2, fontWeight: 600, sample: '下一步：對應欄位', usage: '按鈕文字。' },
        { name: 'type-sm', fontSize: '14px', lineHeight: 1.65, fontWeight: 400, sample: '已自動辨識 12 欄，2 欄請確認。', usage: '說明、提示、列表次行。' },
        { name: 'type-xs', fontSize: '13px', lineHeight: 1.65, fontWeight: 400, sample: '回覆 41 份', usage: '標籤、輔助文字。' },
      ] },
      { name: '檔案與代碼', family: 'mono', styles: [{ name: 'type-mono', fontSize: '13px', lineHeight: 1.4, fontWeight: 400, sample: '三年二班_幹部票選.xlsx', usage: '檔案名稱、代碼。' }] },
      { name: '輸出文件（列印）', family: 'sans', styles: [
        { name: 'doc-title', fontSize: '24pt', lineHeight: 1.25, fontWeight: 700, sample: '期末課程意見調查', usage: '文件標題。' },
        { name: 'doc-section', fontSize: '15pt', lineHeight: 1.3, fontWeight: 700, sample: '逐題結果', usage: '區段標題。' },
        { name: 'doc-body', fontSize: '12pt', lineHeight: 1.6, fontWeight: 400, sample: '你的報告在內容掌握上高於班級平均。', usage: '學生版與家長版內文；教師版可用 11pt。' },
        { name: 'doc-table', fontSize: '10pt', lineHeight: 1.4, fontWeight: 400, sample: '平均 4.2　中位數 4　標準差 0.8', usage: '表格。' },
        { name: 'doc-note', fontSize: '9pt', lineHeight: 1.5, fontWeight: 400, sample: '人數少於 8 人的組僅供參考。', usage: '註解，不得低於 9pt。' },
      ] },
    ],
  },
  spacing: { note: '4 的倍數；並排元素用 flex 或 grid 加 gap。', tokens: list(['sp-1', 'sp-2', 'sp-3', 'sp-4', 'sp-5', 'sp-6', 'sp-7'], { 'sp-1': '標籤內距。', 'sp-2': '相鄰可點元件的最小間距。', 'sp-3': '列內間距、卡片內小間距。', 'sp-4': '手機左右留白、畫面區塊間距。', 'sp-5': '區段間距。', 'sp-6': '大區段間距。', 'sp-7': '頁面主要分區。' }) },
  radius: { tokens: list(['r-sm', 'r-md', 'r-lg'], { 'r-sm': '按鈕、輸入框、選項。', 'r-md': '卡片、面板、提示。', 'r-lg': '底部彈出面板上緣、桌機對話框。' }) },
  fontSize: { note: '元件樣式用的字級變數。', tokens: list(['fs-xs', 'fs-sm', 'fs-md', 'fs-lg', 'fs-xl', 'fs-2xl'], { 'fs-xs': '標籤、輔助文字。', 'fs-sm': '說明、提示。', 'fs-md': '內文與輸入。', 'fs-lg': '卡片標題。', 'fs-xl': '區段標題。', 'fs-2xl': '頁面大標題。' }) },
  lineHeight: { tokens: list(['lh-body', 'lh-tight'], { 'lh-body': '內文。', 'lh-tight': '標題。' }) },
  control: { note: '點擊區：任何可點元件不得低於 tap-min。', tokens: list(['tap', 'tap-min'], { tap: '按鈕、輸入框、圖示按鈕的預設高度。', 'tap-min': '可點元件的最低高度。' }) },
};
wr('tokens.json', JSON.stringify(tokens, null, 2) + '\n');

/* ===== bundle.css：實作用的 class，來源 app.css（元件段）＋ chrome.css 基礎＋ doc.css ===== */
const app = rd('build/app.css').split(/\r?\n/).filter((l) => !/^(\.figs|\.fig\b|\.scale)/.test(l)).join('\n');
const doc = rd('build/doc.css')
  .split(/\r?\n/).filter((l) => !/^\.(scale|docfig)/.test(l)).join('\n')
  .replace('--blue:#2554d8;--blue2:#7f9be3;--mid:#ddd5c8;--or2:#eaa06a;--or1:#cf5f12', '--blue:var(--likert-5);--blue2:var(--likert-4);--mid:var(--likert-3);--or2:var(--likert-2);--or1:var(--likert-1)');
wr('components/bundle.css', `/* 問卷回饋小幫手元件樣式。值來自 tokens；--font 與 --dur 不在 tokens.json 的欄位內，在這裡宣告。 */
:root{--font:var(--font-sans);--dur:160ms}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:var(--fs-md)/var(--lh-body) var(--font)}
h1,h2,h3,h4,p{margin:0}
.muted{color:var(--ink2)}
.small{font-size:var(--fs-sm)}
.mono{font-family:var(--font-mono);font-size:var(--fs-xs)}
svg.ic{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
button{font-family:inherit}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
${app}
${doc}
/* 對話框：桌機與平板的置中面板，值與 deskkit.mjs 的 modal 相同 */
.dialog{background:var(--card);border-radius:var(--r-lg);padding:28px;display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 40px var(--shadow-sm)}
`);

/* ===== 圖示 ===== */
const sprite = rd('build/sprite.html');
const icons = [...sprite.matchAll(/<symbol id="i-([\w-]+)" viewBox="0 0 24 24">([\s\S]*?)<\/symbol>/g)].map((m) => [m[1], m[2]]);
for (const [n, body] of icons) wr(`assets/Icons/${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#14171f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`);
wr('assets/Icons/README.md', `# 圖示\n\n${icons.length} 個線條圖示，線寬 2、圓端點，來源 docs/design/build/sprite.html。實作時用行內 SVG 的 stroke="currentColor"；這裡的單檔以 ink 色 #14171f 存放。不用 emoji，不載入外部圖示字型。\n`);

/* ===== 元件預覽與指引 ===== */
const stack = (...x) => `<div style="display:flex;flex-direction:column;gap:12px;padding:16px;max-width:420px">${x.join('')}</div>`;
const row = (...x) => `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:16px">${x.join('')}</div>`;
const tgl = (t, s, on) => `<button class="tgl" role="switch" aria-checked="${on}" type="button"><span style="text-align:left"><b style="display:block">${t}</b><span class="small muted">${s}</span></span><span class="sw2"></span></button>`;
const dev = (inner, w = 390, h = 844, r = 34) => `<div class="dev" style="width:${w}px;height:${h}px;border-radius:${r}px">${inner}</div>`;
const paper = (inner) => `<div class="paper">${inner}</div>`;
const blk = (t, inner) => `<div class="blk" style="margin:16px"><div class="bh"><b>${t}</b></div>${inner}</div>`;
const lkrow = (q, v, m, s) => `<div class="lkrow"><span class="q">${q}</span><div class="lk">${v.map((p, i) => `<i style="width:${p}%;background:var(--likert-${i + 1})"></i>`).join('')}</div><span class="m">${m}<small>${s}</small></span></div>`;
const hbar = (n, p, v, k = '') => `<div class="hbar"><span>${n}</span><div class="t"><i${k ? ` class="${k}"` : ''} style="width:${p}%"></i></div><span class="v"><b>${v}</b> · ${p}%</span></div>`;
const cmp = (n, p, a, s) => `<div class="cmp"><div class="h"><span style="font-weight:600">${n}</span><span class="v"><b>${p}</b> <span class="small muted">班均 ${a}</span></span></div><div class="tr"><i style="width:${(p / 5) * 100}%"></i><u style="left:${(a / 5) * 100}%"></u><em style="left:${(s / 5) * 100}%"></em></div></div>`;
const appbar = (t, l, r) => `<div class="appbar">${l}<span class="ttl">${t}</span>${r}</div>`;
const brandbar = `<span class="brand">${ic('bars')}</span>`;

const C = [
  ['Button', '動作', 200, '主要動作用按鈕，高 48，小尺寸 44。', '每個手機畫面只有一個 `primary`，放在底部操作列。`danger` 用紅外框，不用實心紅。停用時旁邊要說明原因。文字寫動作，例如「下一步：對應欄位」。', `<div style="padding:16px;display:grid;gap:12px;max-width:420px">${btn('下一步：對應欄位', 'primary', { block: 1 })}${btn('上一步', 'secondary', { block: 1 })}<div style="display:flex;gap:12px;flex-wrap:wrap">${btn('怎麼匯出？', 'ghost')}${btn('確定清除', 'danger')}${btn('產生並下載', 'primary', { dis: 1 })}${btn('套用', 'primary', { sm: 1 })}</div></div>`],
  ['IconButton', '動作', 88, '只有圖示的按鈕，48×48，一定要有 aria-label。', '用在頂端列與工具列。圖示線寬 2、圓端點。', row(icbtn('back', '返回'), icbtn('sliders', '設定'), icbtn('help', '說明'), icbtn('x', '關閉'), icbtn('undo', '復原'), icbtn('redo', '重做'))],
  ['Input', '表單', 240, '文字輸入框，高 48、字級 16。', '標籤在上、提示在下。錯誤用 2px `bad` 外框加下方紅字，說明哪裡錯、怎麼改。', stack(field('ds-a', '問卷名稱', '期末課程意見調查', '會顯示在報告標題。'), `<div class="field"><label for="ds-b">權重合計</label><input class="input err" id="ds-b" value="90%"><span class="errmsg">權重合計要是 100%，還差 10%。</span></div>`)],
  ['Toggle', '表單', 168, '開關，高 56，右側 52×32，role="switch"。', '用在設定頁與去識別化。', stack(tgl('去識別化', '檔名不放學生姓名', true), tgl('附上統計方法說明', '輸出時多一頁附錄', false))],
  ['Segmented', '選擇', 148, '分段控制，2 到 4 項，各 44 高。', '切換檢視或格式。選取項是卡片底、強調色文字加細陰影。', stack(seg(['題目', '名單', '檢查'], 0), seg(['Excel', 'Word', 'PDF'], 2, '格式'))],
  ['Chip', '選擇', 88, '籌碼，高 44、全圓，單選一組。', '選項少又要並排時用。', row(chips(['教師版', '學生版', '家長版'], 1))],
  ['OptionCard', '選擇', 232, '單選卡，圓點加主說明與次說明，最小高 64。', '每個選項都要說明時用。class 是 `rcard`。選取：強調色外框加淡底。', `<div role="radiogroup" aria-label="輸出內容" style="display:grid;gap:8px;padding:16px;max-width:420px">${rcard('班級總表', '全班統計與圖表，一份檔案', true)}${rcard('個人回饋單', '每位學生一份')}</div>`],
  ['Tag', '資訊', 88, '不可點的標籤，高 26、圓角 6。', '變體：中性、強調、成功、警示、錯誤。狀態一定寫字。', row(tag('選用'), tag('建議', 'accent'), tag('已確認', 'ok'), tag('請確認', 'warn'), tag('讀取失敗', 'bad'))],
  ['Notice', '資訊', 340, '提示，圖示加文字，四種。', '可附一個次按鈕。隱私說明用白話，不嚇人也不隱瞞。', stack(notice('', 'lock', '資料只在這支手機的瀏覽器處理，不會上傳，關閉頁面就清除。'), notice('warn', 'warn', '已自動辨識 12 欄，2 欄請確認。'), notice('bad', 'x', '讀不到這個檔案。請確認是 xlsx 或 csv。'), notice('ok', 'check', '已可離線使用。'))],
  ['Tile', '資訊', 120, '數字磚，標籤在上、大數字在下。', '只在摘要用，不當裝飾。需要處理的磚用 `warn`。', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:16px;max-width:420px">${tile('回覆', 41)}${tile('題目', 12)}${tile('需檢查', 3, 'warn')}</div>`],
  ['Progress', '資訊', 84, '進度條，高 8，role="progressbar"。', '用在讀取與輸出。旁邊要寫在等什麼。', stack(`<div class="prog" role="progressbar" aria-label="輸出進度" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"><i style="width:62%"></i></div><span class="small muted">正在產生 25／41 份 PDF</span>`)],
  ['BarRow', '資料', 280, '長條列：名稱與「N 票 · P%」同一列，長條在下。', '當選用 `lead`、同票用 `tie`、其餘用 `bar-muted`。比例以全部有效票為 100%。', stack(brow('林小宇', 18, 45, 'lead', tag('當選', 'ok')), brow('陳怡安', 11, 28, 'tie', tag('同票', 'warn')), brow('張子豪', 11, 28, 'tie', tag('同票', 'warn')), brow('黃思穎', 0, 0))],
  ['ComparisonBar', '資料', 140, '對照條：藍條是同學給分、虛線是班均、黑線是自評。', '用在報告回饋。線與條都要有數字。', stack(cmp('內容掌握', 4.4, 3.9, 3.5), cmp('口語表達', 3.6, 3.8, 4))],
  ['Pager', '資料', 88, '左右箭頭換題，中間是題號與題名。', '用在手機統計的題目卡。', `<div class="pager" style="padding:16px;max-width:420px">${icbtn('back', '上一題')}<div class="c"><small>第 3／12 題</small><b>最喜歡的單元</b></div>${icbtn('next', '下一題')}</div>`],
  ['FieldRow', '列表', 176, '欄位對應列，整列可點，最小高 64。', 'class 是 `rowbtn`。需確認的列加 `need` 與「請確認」標籤。', stack(rowbtn('你對這堂課的滿意度', '範例：非常滿意', tag('量表')), rowbtn('座號', '範例：12', tag('請確認', 'warn'), true))],
  ['FilePicker', '列表', 216, '選檔大按鈕，虛線外框，最小高 176。', 'class 是 `picker`。第 1 步的主要入口。', stack(`<button class="picker" type="button"><span class="big">${ic('file')}</span><b>選擇問卷檔</b><small>Google 表單匯出的 xlsx 或 csv</small></button>`)],
  ['FileChip', '列表', 100, '檔案資訊列。', '檔名過長時省略，檔案大小寫在次行。', stack(`<div class="filechip">${ic('file')}<div><b>三年二班_幹部票選.xlsx</b><span>41 筆回覆 · 18 KB</span></div></div>`)],
  ['AppBar', '導覽', 88, '頂端列，高 56。', '左返回或品牌、中標題、右動作。畫面標題只寫一次。', appbar('問卷回饋小幫手', brandbar, icbtn('sliders', '設定'))],
  ['Stepper', '導覽', 88, '四段步驟進度：開啟、對應、統計、輸出。', '目前步驟用強調色文字。', steps(3)],
  ['ActionBar', '導覽', 96, '底部操作列，主按鈕佔滿剩餘寬度。', '要加 `env(safe-area-inset-bottom)`。桌機用 `actbar desk`，按鈕固定寬度靠右。', `<div class="actbar">${btn('上一步', 'secondary')}${btn('下一步：輸出')}</div>`],
  ['BottomSheet', '面板', 420, '手機的底部彈出面板，上緣圓角 r-lg，有把手。', '點遮罩關閉；選項 52 高。桌機改成對話框或下拉選單。', `<div style="position:relative;height:420px;overflow:hidden">${sheet('題目類型', '這一欄是什麼題目？', `<div role="radiogroup" aria-label="題目類型">${opt('單選', true)}${opt('複選')}${opt('量表')}${opt('開放題')}</div>`, btn('套用', 'primary', { block: 1 }))}</div>`],
  ['Dialog', '面板', 300, '桌機與平板的置中對話框，寬 480～720。', '主動作在最右，次要動作在左；危險動作用外框紅，排最後。背景用 `scrim`。', `<div style="padding:24px;background:var(--scrim)"><div class="dialog" role="dialog" aria-label="離開前確認" style="max-width:480px;margin:auto"><h2 style="font-size:var(--fs-xl)">離開這個頁面？</h2><p class="muted">資料不保存，離開後要重新選檔。</p><div style="display:flex;gap:8px;justify-content:flex-end">${btn('離開', 'secondary')}${btn('先輸出')}</div></div></div>`],
  ['PhoneScreen', '版面', 880, '手機畫面：頂端列、步驟、內容、底部操作列。', '390 寬，單欄、一次一個步驟。內容左右留白 16。', dev(`${appbar('問卷回饋小幫手', brandbar, icbtn('sliders', '設定'))}${steps(1)}<div class="scr"><h2 style="font-size:var(--fs-xl)">開啟問卷檔</h2><button class="picker" type="button"><span class="big">${ic('file')}</span><b>選擇問卷檔</b><small>Google 表單匯出的 xlsx 或 csv</small></button>${notice('', 'lock', '資料只在這支手機的瀏覽器處理，不會上傳，關閉頁面就清除。')}</div><div class="actbar">${btn('下一步', 'primary', { dis: 1, block: 1 })}</div>`)],
  ['DesktopWorkbench', '版面', 640, '桌機三欄工作台：清單、內容、設定。', '1280 寬，內容最寬 1240，保留 44px 點擊區。手機的底部面板在桌機改成對話框或下拉選單。', `<div style="padding:16px">${dev(`<div class="appbar" style="padding:0 16px;gap:20px">${brandbar}<b style="font-size:17px">問卷回饋小幫手</b><span class="small muted">三年二班_幹部票選.xlsx</span></div><div style="flex:1;min-height:0;display:flex"><div class="pane" style="width:260px;padding:12px;border-right:1px solid var(--line-soft)"><div class="qrow" aria-current="true">班長</div><div class="qrow">副班長</div><div class="qrow">學藝股長</div></div><div class="pane" style="flex:1;padding:20px"><h2 style="font-size:var(--fs-xl)">班長</h2>${brow('林小宇', 18, 45, 'lead', tag('當選', 'ok'))}${brow('陳怡安', 12, 30)}</div><div class="pane" style="width:300px;padding:20px;border-left:1px solid var(--line-soft);background:var(--card)"><b>防弊與規則</b><p class="small muted">同人多票 1 件，已處理。</p></div></div><div class="actbar desk" style="justify-content:flex-end">${btn('上一步', 'secondary')}${btn('下一步：輸出')}</div>`, 1200, 560, 12)}</div>`],
  ['DocPage', '輸出文件', 1160, '輸出文件的 A4 頁面，794×1123，紙張永遠是淺色。', '頁首、標題、摘要、內容、頁尾。圖形旁一定標數字與文字，彩色與黑白列印都讀得出來。', paper(`<div class="ph"><span>三年二班 · 期末課程意見調查</span><span>教師版</span></div><div class="dt"><span class="eyebrow">意見調查報告</span><h1>期末課程意見調查</h1><div class="meta"><span>回收 34／36 份</span><span>2026-10-30</span></div></div><div class="kpis"><div class="kpi hi"><span class="l">整體滿意度</span><span class="n">4.2<small>／5</small></span><span class="s">4–5 分占 82%</span></div><div class="kpi"><span class="l">回收率</span><span class="n">94<small>%</small></span><span class="s">34 份有效</span></div><div class="kpi"><span class="l">最高分題</span><span class="n">4.6</span><span class="s">老師講解清楚</span></div><div class="kpi"><span class="l">最低分題</span><span class="n">3.4</span><span class="s">作業份量</span></div></div><ul class="finds"><li><span><b>整體滿意度高</b>，82% 給 4 分以上。</span></li><li><span><b>作業份量</b>是最需要注意的題目。</span></li></ul><div class="pf"><span>請妥善保管</span><span>第 1 頁</span></div>`)],
  ['DocLikert', '輸出文件', 180, '量表分布條，橘到藍五段，每段比例對應數字。', 'Word 轉為圖片。右側給平均與 4–5 分比例。', blk('量表分布', `${lkrow('老師講解清楚', [3, 6, 11, 38, 42], 4.1, '4–5 分 80%')}${lkrow('作業份量適當', [12, 18, 26, 30, 14], 3.2, '4–5 分 44%')}`)],
  ['DocBarChart', '輸出文件', 160, '輸出文件的長條圖。', '單選以 100% 計，複選以回收人數為基準並寫明。', blk('最喜歡的單元', `${hbar('電路實作', 45, 15, 'k')}${hbar('力學', 30, 10)}${hbar('光學', 25, 9)}`)],
  ['DocTable', '輸出文件', 190, '統計表：表頭粗線、列細線、數字靠右。', '可跨頁並重複表頭；最高最低列用底色加文字標籤。', blk('各規準分數', `<table class="dtable"><thead><tr><th>規準</th><th class="r">平均</th><th class="r">標準差</th><th></th></tr></thead><tbody><tr class="hl"><td>內容掌握</td><td class="r">4.4</td><td class="r">0.6</td><td><span class="pill g">最高</span></td></tr><tr><td>口語表達</td><td class="r">3.6</td><td class="r">0.9</td><td></td></tr></tbody></table>`)],
  ['DocComment', '輸出文件', 200, '留言與老師評語。', '留言預設匿名，經老師審稿；老師評語用綠色底。', blk('留言與評語', `<div class="quote">投影片的圖表很清楚，舉例也很好懂。<span class="by">優點 · 匿名</span></div><div class="callout g"><b>老師評語</b>　這次的資料整理很完整，下次可以多練習口頭結論。</div>`)],
];
const hasIcons = (h) => h.includes('<use ');
const inlineSprite = sprite.replace(/^[\s\S]*?(<svg)/, '$1');
for (const [name, group, h, sum, guide, html] of C) {
  wr(`components/${name}/README.md`, `# ${name}\n\n${sum}\n\n${guide}\n\n來源：docs/design/DESIGN.md 第 4、5 節，docs/design/build/app.css、doc.css。\n`);
  const w = name === 'PhoneScreen' ? ' width=390' : name === 'DesktopWorkbench' ? ' width=1232' : name === 'DocPage' ? ' width=794' : '';
  wr(`components/${name}/preview.html`, `<!-- @dsCard group="${group}" height=${h}${w} -->\n<!doctype html>\n<html lang="zh-Hant"><body>\n${hasIcons(html) ? inlineSprite + '\n' : ''}${html}\n</body></html>\n`);
}

// 專案還沒有元件程式，這支只讓預覽正常載入；元件本身是 bundle.css 的 class
wr('components/bundle.js', `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: 'SurveyFeedbackHelper', components: C.map(([name]) => ({ name })) })} */\nwindow.SurveyFeedbackHelper = {};\n`);

/* ===== 封面 ===== */
wr('components/Cover/preview.html', `<!-- @dsCard height=300 -->
<!doctype html>
<html lang="zh-Hant"><head><style>
.cv{position:relative;width:960px;height:300px;background:var(--paper);overflow:hidden}
.cv svg{position:absolute;left:0;top:0}
.a{fill:var(--accent)}.o{fill:var(--d2)}.i{fill:var(--ink)}.s{fill:var(--accent-soft)}.y{fill:var(--warn-bar)}
.l1{fill:var(--likert-1)}.l2{fill:var(--likert-2)}.l3{fill:var(--likert-3)}.l4{fill:var(--likert-4)}.l5{fill:var(--likert-5)}
.t{position:absolute;left:48px;bottom:32px}
.t h1{font:700 64px/1 var(--font);color:var(--ink);letter-spacing:0}
.t p{margin-top:12px;font:400 14px/1.4 var(--font);color:var(--ink2)}
</style></head><body><div class="cv">
<!-- 色塊：accent 480×112、ink 160×112、d2 120×112、accent-soft 200×112。
     排列：上緣橫帶，如同一條堆疊長條；名稱過寬，用上方橫帶版面。
     圖樣：字面母題（長條列），這個產品就是把問卷變成帶數字的長條，選這列最像它自己。
     尺度：長條高 sp-3（12px）、間距 sp-2（8px），圓角 r-sm。 -->
<svg width="960" height="120" viewBox="0 0 960 120" aria-hidden="true">
<rect class="a" x="0" y="0" width="480" height="112"/><rect class="i" x="480" y="0" width="160" height="112"/><rect class="o" x="640" y="0" width="120" height="112"/><rect class="s" x="760" y="0" width="200" height="112"/>
<rect class="l1" x="776" y="20" width="24" height="12" rx="6"/><rect class="l2" x="804" y="20" width="32" height="12" rx="6"/><rect class="l3" x="840" y="20" width="24" height="12" rx="6"/><rect class="l4" x="868" y="20" width="32" height="12" rx="6"/><rect class="l5" x="904" y="20" width="40" height="12" rx="6"/>
<rect class="l5" x="776" y="40" width="136" height="12" rx="6"/><rect class="y" x="776" y="60" width="96" height="12" rx="6"/><rect class="y" x="776" y="80" width="96" height="12" rx="6"/>
</svg>
<div class="t"><h1>問卷回饋小幫手</h1><p>把 Google 表單問卷變成老師看得懂、學生願意看的回饋。</p></div>
</div></body></html>
`);

/* ===== README（品牌手冊）===== */
wr('README.md', `問卷回饋小幫手是給老師用的網頁工具：統計 Google 表單問卷，產出班級總表與學生個人回饋單，資料只在瀏覽器處理。介面是清爽的數據工具，輸出文件是溫暖親切的紙本，兩者各有一組色票。

## 設計原則

- **手機單手優先。** 先設計 390 寬，平板與桌機從它延伸；主要動作放畫面底部。
- **一次一個步驟。** 流程固定四步：開啟、對應、統計、輸出；每個手機畫面只有一個 \`primary\` 按鈕。
- **數字要能對照。** 長條旁一定有名稱與數字，狀態一定有文字或圖示。
- **誠實說明資料去向。** 第一屏就寫資料在哪裡處理。

## 文案

用台灣繁體中文，用「你」不用「您」。短句，直接說做了什麼。

- 按鈕寫動作：「下一步：對應欄位」「產生並下載」「套用」。
- 錯誤說明哪裡錯、怎麼改，不道歉：「讀不到這個檔案。請確認是 xlsx 或 csv。」
- 隱私用白話：「資料只在這支手機的瀏覽器處理，不會上傳，關閉頁面就清除。」
- 不用 emoji。

## 色彩

介面底色用 \`paper\`、卡片用 \`card\`、凹陷處用 \`sunk\`。文字用 \`ink\`、\`ink2\`、\`ink3\`，都是不透明色，不用透明度把字變淡。

強調色只有 \`accent\`（鈷藍），主按鈕、目前步驟、選取才用；上面的字用 \`on-accent\`，強調色文字用 \`accent-ink\`。\`ok\`、\`warn\`、\`bad\` 是語意色，不拿來裝飾。表面一律中性灰，不用青綠或其他色調。

圖表用 \`d1\` 到 \`d5\` 與 \`d0\`，當選用 \`accent\`，同票用 \`warn-bar\`，其餘用 \`bar-muted\`。任何圖形都要搭配文字與數字。

輸出文件用 \`doc-paper\`、\`doc-ink\`、\`doc-accent\`（琥珀）、\`doc-leaf\`（稱讚綠），紙張永遠是淺色；五級量表固定用 \`likert-1\` 到 \`likert-5\`，橘到藍。

## 字型

介面一律用系統字型 \`sans\`，不載入網路字型，理由是零費用、可離線、不向第三方傳送 IP。只有文件預覽與 PDF 輸出內嵌 Noto Sans TC 子集。數字加 \`font-variant-numeric: tabular-nums\`；檔名與代碼用 \`mono\`。手機輸入框不得小於 16px。

## 版面

| 範圍 | 版面 |
|---|---|
| 手機 < 600（以 390 為準） | 單欄、一次一個步驟，左右留白 16，面板由下往上 |
| 平板 600–1023（以 820 為準） | 左右分欄，左 260～300，面板靠側彈出 |
| 桌機 ≥ 1024（以 1280 為準） | 三欄工作台，內容最寬 1240 |

間距用 \`sp-1\` 到 \`sp-7\`，並排用 flex 或 grid 加 gap。可點元件高度用 \`tap\`，不得低於 \`tap-min\`，相鄰間距至少 \`sp-2\`。不得出現橫向捲動，只有表格與程式碼可以在自己的容器內捲動。

## 外框、陰影與動態

卡片用 1px \`line-soft\` 外框加 \`0 1px 2px\` 的 \`shadow-sm\`。較大的陰影只用在底部彈出面板與對話框。圓角：控制項 \`r-sm\`、卡片 \`r-md\`、面板 \`r-lg\`；籌碼全圓。動態 160ms，只改背景與外框色，\`prefers-reduced-motion\` 時關閉，不做進場動畫。焦點框 3px \`accent\`，外移 2px。

## 輸出文件

A4 直式，邊界約 14 mm，頁尾區 20 mm。每份報告依序是摘要、逐題與交叉、質化、方法說明。教師版完整；學生版匿名彙整，不含排名；家長版精簡一頁，不含排名與原文。Word 輸出時，圓角與陰影改直角，堆疊條、熱圖、對照條轉為圖片。

## 圖示

用 Icons 資產裡的線條圖示，線寬 2、圓端點，實作時用 \`stroke="currentColor"\` 繼承文字色。圖示按鈕一定要有 \`aria-label\`。

## 不要做的事

- 不載入網路字型、CDN 圖示或任何外部資源。
- 不用彩色當唯一的資訊管道。
- 不用漸層、大面積陰影、帶左側色邊的圓角卡片。
- 手機版不用 hover 才出現的功能，不用雙擊或長按當唯一操作。
- 不放使用者沒要求的統計或裝飾性數字。

## 未同步的項目

- 字型檔：介面用系統字型，沒有字型檔；PDF 的 Noto Sans TC 子集在實作階段才進專案。
- 元件是 CSS class 加靜態預覽，repo 還沒有正式的元件程式，所以沒有 React bundle。
`);

/* ===== 索引：圖示已上傳到成品頁，assets.json 記上傳後的 id；新增圖示要先上傳再補 id ===== */
const blobs = JSON.parse(rd('design-system/assets.json'));
const iconNames = icons.map(([n]) => `${n}.svg`);
const missing = iconNames.filter((n) => !blobs[n]);
if (missing.length) throw new Error('assets.json 缺圖示 id：' + missing.join(','));
const files = Object.fromEntries(iconNames.map((n) => [n, { name: n, blob: blobs[n], size: fs.statSync(path.join(out, 'assets/Icons', n)).size, type: 'image/svg+xml' }]));
wr('design-system.json', JSON.stringify({
  v: 3, layout: 'files', createdOnFiles: { v: 1, at: process.env.DS_CREATED || new Date().toISOString() },
  title: '問卷回饋小幫手 設計系統', namespace: 'SurveyFeedbackHelper', libraries: [], sections: {}, groups: ['Icons'],
  assetGroups: { Icons: { name: 'Icons', tile: 's', order: iconNames, files } }, blobs: {}, docs: { readme: 'project/README.md', sections: [] },
  lastChange: { by: 'derliang', at: new Date().toISOString(), via: `GitHub · derliang/survey-feedback-helper@${(process.env.DS_REF || 'main').replace('main@', '')}`, note: '由 docs/design 的 tokens、元件 CSS 與圖示建立' },
}, null, 2) + '\n');
console.log(`colors ${colors.length}、components ${C.length}、icons ${iconNames.length}`);
