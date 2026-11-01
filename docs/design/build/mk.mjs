// 建置：成品頁（分組）與 repo 內的各頁模擬頁
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { phoneSecs, checkUnused } from './phones.mjs';
const sp = decodeURIComponent(new URL('.', import.meta.url).pathname).slice(1).replace(/\/$/, '');
const repo = sp + '/../../..';
const rd = (f) => fs.readFileSync(f, 'utf8');
const tokens = rd(repo + '/docs/design/tokens.css').replace(/\/\*[\s\S]*?\*\/\s*/, '');
const css = [rd(sp + '/chrome.css'), rd(sp + '/app.css'), rd(sp + '/doc.css')].join('\n');
const sprite = rd(sp + '/sprite.html');
const pages = JSON.parse(rd(sp + '/pages.json'));
const only = process.argv[2];
const extra = `.pagehead{display:flex;flex-direction:column;gap:6px;max-width:72ch}.round{display:flex;flex-direction:column;gap:32px}`;
const R2 = ['desk-r2a', 'desk-r2b', 'desk-r2c'];
const OLD_DESK = ['flow-wide', 'flow-desk', 'flow-desk2', 'desk-a', 'desk-b', 'desk-c', 'desk-d'];
const capKey = (f) => ((f.match(/<figcaption[^>]*><b>([^<]*)/) || [])[1] || '').split(' ')[0];
const SUPERSEDED = new Set(['13a', '13b', '13f', 'D7']);
for (const id of R2) { const p = pages.find((x) => x.id === id); if (p) for (const f of rd(`${sp}/${p.frag}`).match(/<figure class="fig"[\s\S]*?<\/figure>/g) || []) SUPERSEDED.add(capKey(f)); }
// 第 2 輪取代的桌機舊畫面，不再出現在舊模擬頁（保留 git 歷史即可）
const inner = (p) => { const h = rd(`${sp}/${p.frag}`); if (!OLD_DESK.includes(p.id)) return h; return h.replace(/<figure class="fig"[\s\S]*?<\/figure>/g, (f) => (SUPERSEDED.has(capKey(f)) && (p.id !== 'flow-wide' || /<figcaption[^>]*><b>[^<]*桌機/.test(f)) ? '' : f)); };
const GROUPS = { screens: { file: 'survey-pages.html', title: '問卷回饋小幫手畫面設計', kicker: '畫面設計（手機優先）' }, docs: { file: 'survey-docs.html', title: '問卷回饋小幫手輸出文件', kicker: '輸出文件設計（A4）' } };

function mockup(p, figsHtml) {
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.title}（模擬頁）</title>
<style>
${tokens}
${css}
${extra}
.scale{position:static!important;width:auto!important;height:auto!important}
.scale>.dev,.scale>.paper{position:relative!important;transform:none!important}
.figs{overflow-x:auto}
.docfig{overflow-x:auto}
</style>
</head>
<body>
${sprite}
<div class="wrap">
<header class="pagehead"><p class="small muted">設計規範的模擬頁，使用虛構資料。規範見 docs/design/DESIGN.md。</p><h1>${p.title}</h1><p class="muted">${p.intro}</p></header>
<div class="figs"${p.group==='docs'?' style="flex-direction:column"':''}>
${figsHtml ?? inner(p)}
</div>
</div>
</body>
</html>
`;
  fs.writeFileSync(`${repo}/docs/design/mockups/${p.name}.html`, html);
}


const figsOf = (html) => html.match(/<figure class="fig"[\s\S]*?<\/figure>/g) || [];
const capOf = (f) => (f.match(/<figcaption[^>]*><b>([^<]*)<\/b>/) || [])[1] || '';
function deviceArtifact() {
  const G = GROUPS.screens;
  const by = (id) => pages.find((p) => p.id === id);
  const sec = (id, p, figs, title, intro) => ({ id, title: title || p.title, intro: intro || p.intro, figs });
  const wide = figsOf(inner(by('flow-wide')));
  const DESK = {};
  const used = new Set();
  [...wide.filter((f) => capOf(f).includes('桌機')), ...['flow-desk', 'flow-desk2', 'desk-a', 'desk-b', 'desk-c', 'desk-d', 'desk-r2a', 'desk-r2b', 'desk-r2c'].flatMap((id) => figsOf(inner(by(id))))].forEach((f) => { DESK[capOf(f).split(' ')[0]] = f; });
  const DESK_N = Object.keys(DESK).length - 4;
  const DESK_SECS = [
    { id: 'd-open', title: '開啟問卷（第 2 輪：首頁三方案）', intro: '第 1 步。首頁（定案：雙欄）、選來源、讀取中、讀不到檔案與匯出教學、瀏覽器過舊。', keys: ['H1', 'D12', 'D13', 'D14', 'D15'] },
    { id: 'd-folder', title: '資料夾與認得讀過（第 2 輪新增）', intro: '設定、名單、審稿進度存實體資料夾：第一次選、授權失效重選、不支援的瀏覽器退回手動；認得讀過；重新開始。', keys: ['E1', 'E2', 'E3', 'E4', 'E5'] },
    { id: 'd-prep', title: '準備資料', intro: '第 2 步。四件事固定順序並解鎖、問卷類型、欄位對應與名單（可編輯）、名單對照、資料檢查、量表與權重。', keys: ['D16', 'D17', 'D18', 'D19', 'D20', 'D21', 'D22', '13c', 'E7'] },
    { id: 'd-survey', title: '意見調查統計與圖表', intro: '第 3 步。量表、複選、開放題、交叉分析、累積讀取、圖表圖庫與勾選換圖、圖表另存、量表標籤與反向計分。', keys: ['12c', 'E6', 'D24', 'E8', 'E9', 'D5', 'D4', 'D50', 'D10'] },
    { id: 'd-vote', title: '票選統計與防弊', intro: '第 3 步。各職位結果、同票抽籤、投影唱票（定案：全部候選人同列）、防弊檢查、逐人票選名單、計票規則。', keys: ['D1', 'D23', '唱票', 'D47', 'D48', 'D49'] },
    { id: 'd-fb', title: '報告回饋與歷次趨勢', intro: '第 3 步。以被評對象為單位的統計（班均註明已計入組數、含平均列），與同一班多次問卷的變化。', keys: ['D2', 'D3'] },
    { id: 'd-out', title: '審稿與輸出', intro: '第 4 步。單行意見審稿、改寫、常用評語與存成常用評語、輸出設定（頁首與圖表勾選）、檔名與去識別化、進度、完成與失敗。', keys: ['13d', 'D25', 'D26', 'D26b', 'D26c', '12e', 'D28', 'D27', 'D6', 'D31'] },
    { id: 'd-edit', title: '版面編輯器', intro: '三欄：區塊清單、頁面、屬性。文字與圖表屬性、加入區塊、頁面設定、個別學生版本、拖曳排序。', keys: ['12d', 'D33', 'D34', 'D35', 'D36', 'D37'] },
    { id: 'd-tpl', title: '範本庫與設定檔', intro: '範本縮圖由真實版面產生、第一次修改內建範本、選單、匯出與匯入；儲存設定檔，與開啟設定檔後的接續。', keys: ['D38', 'D38b', 'D39', 'D40', 'D41', 'D42', 'D43'] },
    { id: 'd-drive', title: 'Google 試算表直讀', intro: '選取 Google 試算表（直接讀、可重新讀取）、無法連線的說法、偵測到學校帳號時擋下、資料夾與 Google 連線設定。', keys: ['D44', 'D45', 'D57', 'D46'] },
    { id: 'd-set', title: '設定、教學、隱私與品牌', intro: '設定與範本、三層預設、備份與還原、關於與隱私（從簡）、忘記資料夾、教學頁（含示範資料）、Logo（定案：乙）。', keys: ['13e', 'D11', 'D29', 'D54', 'D56', 'D8', 'Logo'] },
    { id: 'd-sys', title: '狀態、提示與系統', intro: '空白、離開確認、快速鍵說明、安裝為應用程式、離線與新版本、第一次載入。', keys: ['D30', 'D32', '13g', 'D51', 'D52', 'D53', 'D55'] },
  ];
  checkUnused();
  const PH = phoneSecs().map((x) => ({ id: x.id, title: x.title, intro: x.intro, figs: x.entries.map((e) => e.html) }));
  const PHONE_N = PH.reduce((a, x) => a + x.figs.length, 0);
  const tfig = figsOf(rd(sp + '/frag-b34.html'));
  let ti = 0;
  const TB = JSON.parse(rd(sp + '/tablet-secs.json')).map((x) => ({ id: x.id, title: x.title, intro: x.intro, figs: tfig.slice(ti, (ti += x.n)) }));
  const DEV = [
    { key: 'phone', label: '手機', note: '390 × 844，單手操作、一次一個步驟，底部操作列與底部彈出面板。共 ' + PHONE_N + ' 個畫面，第 2 輪（2026-11-01）已套用桌機定案與全部裁示；手機沒有拖放、不能自動存資料夾，其餘與桌機一一對應。', secs: PH },
    { key: 'tablet', label: '平板', note: '820 直向／1024 橫向，左右分欄（左清單、右內容），面板改成靠右側彈出，觸控點擊區不低於 44px。共 ' + PHONE_N + ' 個畫面，與手機一一對應（由手機畫面轉成分欄版面）。', secs: TB },
    { key: 'desktop', label: '桌機', note: '1280，三欄工作台，鍵盤快速鍵，滑鼠拖曳與雙擊編輯。共 ' + DESK_N + ' 個畫面，依使用順序分組，第 2 輪（2026-11-01）已套用邊界條件、審稿意見與頁面裁示；手機與平板的第 2 輪另見各自分頁。', secs: DESK_SECS.map((s) => sec(s.id, { title: s.title, intro: s.intro }, s.keys.map((k) => { const f = DESK[k]; if (!f) throw new Error('桌機缺畫面 ' + k); used.add(k); return f; }))) },
  ];
  const RETIRED = ['13a', '13b', '13f', 'D7']; // 第 2 輪被取代：13a→首頁甲乙丙、13b→D19、13f→唱票A／B、D7→Google 試算表直讀（D44～D46）
  const left = Object.keys(DESK).filter((k) => !used.has(k) && !RETIRED.includes(k));
  if (left.length) throw new Error('桌機畫面未分組：' + left.join(','));
  const view = DEV.map((d) => `<section class="dev-view" id="v-${d.key}" hidden><p class="muted">${d.note}</p><nav class="chips" aria-label="${d.label}頁面索引">${d.secs.map((x) => `<a class="chip" style="display:inline-flex;align-items:center;text-decoration:none" href="#${x.id}" data-sec="${x.id}">${(x.title || '').replace(/（.*?）/g, '')}</a>`).join('')}</nav>${d.secs.map((x) => `<section class="sec" id="${x.id}"><div class="pagehead"><h2>${x.title}</h2><p class="muted small">${x.intro}</p></div><div class="figs">${x.figs.join('\n')}</div></section>`).join('\n')}</section>`).join('\n');
  const html = `<title>${G.title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${tokens}
${css}
${extra}
.devsw{max-width:420px}
.dev-view{display:flex;flex-direction:column;gap:28px}
</style>
${sprite}
<div class="wrap">
<header class="top"><div class="top-row"><div><p class="small muted">畫面設計 · 規範見 docs/design/DESIGN.md</p><h1>${G.title}</h1></div><button class="btn btn-secondary btn-sm" id="themeBtn" type="button">切換深色／淺色</button></div>
<div class="seg devsw" role="group" aria-label="裝置">${DEV.map((d, i) => `<button type="button" data-dev="${d.key}" aria-pressed="${i === 0}">${d.label}</button>`).join('')}</div></header>
${view}
</div>
<script>
(function(){
  var root=document.documentElement;
  function fit(){var avail=document.querySelector('.wrap').clientWidth;document.querySelectorAll('.scale').forEach(function(s){var w=+s.dataset.w,h=+s.dataset.h,k=Math.min(1,avail/w);s.style.width=w*k+'px';s.style.height=h*k+'px';s.firstElementChild.style.transform='scale('+k+')';});}
  function show(key,secId){
    document.querySelectorAll('.dev-view').forEach(function(v){v.hidden=v.id!=='v-'+key;});
    document.querySelectorAll('.devsw button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.dev===key?'true':'false');});
    try{history.replaceState(null,'','#'+key);}catch(e){}
    if(secId){var el=document.getElementById(secId);if(el)el.scrollIntoView();}else{window.scrollTo(0,0);}
    fit();
  }
  document.querySelectorAll('.devsw button').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.dev);});});
  document.getElementById('themeBtn').addEventListener('click',function(){var dark=root.getAttribute('data-theme')==='dark'||(root.getAttribute('data-theme')!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);root.setAttribute('data-theme',dark?'light':'dark');});
  document.addEventListener('click',function(e){var b=e.target.closest('.seg:not(.devsw) button,.chips button');if(!b)return;var g=b.parentElement;g.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});});
  addEventListener('resize',fit);
  var h=(location.hash||'').slice(1);show(['phone','tablet','desktop'].indexOf(h)>=0?h:'phone');
})();
</script>
`;
  fs.writeFileSync(`${sp}/${G.file}`, html);
}

function artifact(g) {
  if (g === 'screens') return deviceArtifact();
  const G = GROUPS[g];
  const list = pages.filter((p) => (p.group || 'screens') === g);
  const rounds = list.map((p) => `<section class="sec" id="${p.id}"><div class="pagehead"><h2>${p.title}</h2><p class="muted small">${p.intro}</p></div><div class="figs"${g==='docs'?' style="flex-direction:column"':''}>${inner(p)}</div></section>`).join('\n');
  const html = `<title>${G.title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${tokens}
${css}
${extra}
</style>
${sprite}
<div class="wrap">
<header class="top"><div class="top-row"><div><p class="small muted">${G.kicker} · 規範見 docs/design/DESIGN.md</p><h1>${G.title}</h1></div><button class="btn btn-secondary btn-sm" id="themeBtn" type="button">切換深色／淺色</button></div>
<nav class="chips" aria-label="頁面索引">${list.map((p) => `<a class="chip" style="display:inline-flex;align-items:center;text-decoration:none" href="#${p.id}">${p.short || p.title}</a>`).join('')}</nav></header>
${rounds}
</div>
<script>
(function(){
  var root=document.documentElement;
  function fit(){var avail=document.querySelector('.wrap').clientWidth;document.querySelectorAll('.scale').forEach(function(s){var w=+s.dataset.w,h=+s.dataset.h,k=Math.min(1,avail/w);s.style.width=w*k+'px';s.style.height=h*k+'px';s.firstElementChild.style.transform='scale('+k+')';});}
  document.getElementById('themeBtn').addEventListener('click',function(){var dark=root.getAttribute('data-theme')==='dark'||(root.getAttribute('data-theme')!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);root.setAttribute('data-theme',dark?'light':'dark');});
  document.addEventListener('click',function(e){var b=e.target.closest('.seg button,.chips button');if(!b)return;var g=b.parentElement;g.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});});
  addEventListener('resize',fit);fit();
})();
</script>
`;
  fs.writeFileSync(`${sp}/${G.file}`, html);
}
const OLD_DEVICE = ['core', 'flow-data', 'flow-stats', 'flow-out', 'flow-edit', 'flow-tpl', 'flow-drive', 'flow-guard', 'flow-sys', 'flow-tablet'];
const MOCK = { open: '開啟與資料夾', help: '教學', prep: '準備資料', vote: '票選統計', survey: '意見調查統計與圖表', fb: '報告回饋與趨勢', out: '審稿與輸出', edit: '編輯器', tpl: '範本與設定檔', set: '設定與隱私', sys: '狀態與系統' };
if (only !== 'artifact') {
  pages.filter((p) => p.name && !OLD_DEVICE.includes(p.id)).forEach((p) => mockup(p));
  checkUnused();
  const tf = figsOf(rd(sp + '/frag-b34.html'));
  let k = 0;
  const tsec = JSON.parse(rd(sp + '/tablet-secs.json'));
  phoneSecs().forEach((x, i) => {
    const nm = MOCK[x.id.replace('p-', '')];
    mockup({ name: '手機-' + nm, title: x.title + '（手機）', intro: x.intro + ' 390 × 844，人名與數字皆為虛構。' }, x.entries.map((e) => e.html).join(String.fromCharCode(10)));
    mockup({ name: '平板-' + nm, title: x.title + '（平板）', intro: x.intro + ' 平板 820 直向／1024 橫向，與手機一一對應。' }, tf.slice(k, (k += tsec[i].n)).join(String.fromCharCode(10)));
  });
}
if (only !== 'mockups') Object.keys(GROUPS).forEach((g) => { if (pages.some((p) => (p.group || 'screens') === g)) artifact(g); });
console.log('ok', pages.map((p) => p.id).join(','));
