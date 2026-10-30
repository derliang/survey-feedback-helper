// 建置：成品頁（分組）與 repo 內的各頁模擬頁
import fs from 'node:fs';
const sp = 'C:/Users/derli/AppData/Local/Temp/claude/C--Users-derli-Documents-claude-projects-survey-feedback-helper/7debb979-1afb-49a7-80fb-e06703a95e45/scratchpad';
const repo = 'C:/Users/derli/Documents/claude_projects/survey-feedback-helper-design';
const rd = (f) => fs.readFileSync(f, 'utf8');
const tokens = rd(repo + '/docs/design/tokens.css').replace(/\/\*[\s\S]*?\*\/\s*/, '');
const css = [rd(sp + '/chrome.css'), rd(sp + '/app.css'), rd(sp + '/doc.css')].join('\n');
const sprite = rd(sp + '/sprite.html');
const pages = JSON.parse(rd(sp + '/pages.json'));
const only = process.argv[2];
const extra = `.pagehead{display:flex;flex-direction:column;gap:6px;max-width:72ch}.round{display:flex;flex-direction:column;gap:32px}`;
const inner = (p) => rd(`${sp}/${p.frag}`);
const GROUPS = { screens: { file: 'survey-pages.html', title: '問卷回饋小幫手畫面設計', kicker: '畫面設計（手機優先）' }, docs: { file: 'survey-docs.html', title: '問卷回饋小幫手輸出文件', kicker: '輸出文件設計（A4）' } };

function mockup(p) {
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
${inner(p)}
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
  [...wide.filter((f) => capOf(f).includes('桌機')), ...['flow-desk', 'flow-desk2', 'desk-a', 'desk-b', 'desk-c', 'desk-d'].flatMap((id) => figsOf(inner(by(id))))].forEach((f) => { DESK[capOf(f).split(' ')[0]] = f; });
  const DESK_N = Object.keys(DESK).length;
  const DESK_SECS = [
    { id: 'd-open', title: '開啟問卷', intro: '第 1 步。拖放或選檔、選檔來源、讀取中、讀不到檔案、瀏覽器過舊。', keys: ['13a', 'D12', 'D13', 'D14', 'D15'] },
    { id: 'd-prep', title: '準備資料', intro: '第 2 步。總覽、問卷類型、欄位對應、學生名單與對照、資料檢查。', keys: ['D16', 'D17', '13b', 'D18', 'D19', 'D20', 'D21', 'D22', '13c'] },
    { id: 'd-survey', title: '意見調查統計', intro: '第 3 步。量表、複選、開放題、交叉分析、圖表另存、量表標籤與反向計分。', keys: ['12c', 'D24', 'D5', 'D4', 'D50', 'D10'] },
    { id: 'd-vote', title: '票選統計與防弊', intro: '第 3 步。各職位結果、同票抽籤、投影唱票、防弊檢查、同人多票、計票規則。', keys: ['D1', 'D23', '13f', 'D47', 'D48', 'D49'] },
    { id: 'd-fb', title: '報告回饋與歷次趨勢', intro: '第 3 步。以被評對象為單位的統計，與同一班多次問卷的變化。', keys: ['D2', 'D3'] },
    { id: 'd-out', title: '審稿與輸出', intro: '第 4 步。老師審稿、改寫留言、評語與關鍵字、輸出設定、檔名與去識別化、進度、完成與失敗。', keys: ['13d', 'D25', 'D26', '12e', 'D28', 'D27', 'D6', 'D31'] },
    { id: 'd-edit', title: '版面編輯器', intro: '三欄：區塊清單、頁面、屬性。文字與圖表屬性、加入區塊、頁面設定、個別學生版本、拖曳排序。', keys: ['12d', 'D33', 'D34', 'D35', 'D36', 'D37'] },
    { id: 'd-tpl', title: '範本庫與專案檔', intro: '範本縮圖、選單、匯出與匯入；儲存專案檔，與開啟專案檔後的接續。', keys: ['D38', 'D39', 'D40', 'D41', 'D42', 'D43'] },
    { id: 'd-drive', title: 'Google 雲端硬碟', intro: '雙軌（資料夾與登入）、選檔視窗、配額用完、已連線設定。', keys: ['D7', 'D44', 'D45', 'D46'] },
    { id: 'd-set', title: '設定、教學與隱私', intro: '設定與範本、三層預設、備份與還原、隱私與關於、清除本機設定、Google 表單教學。', keys: ['13e', 'D11', 'D29', 'D54', 'D56', 'D8'] },
    { id: 'd-sys', title: '狀態、提示與系統', intro: '空白、離開確認、快速鍵說明、安裝為應用程式、離線與新版本、第一次載入。', keys: ['D30', 'D32', '13g', 'D51', 'D52', 'D53', 'D55'] },
  ];
  const DEV = [
    { key: 'phone', label: '手機', note: '390 × 844，單手操作、一次一個步驟，底部操作列與底部彈出面板。', secs: ['core', 'flow-data', 'flow-stats', 'flow-out', 'flow-edit', 'flow-tpl', 'flow-drive', 'flow-guard', 'flow-sys'].map((id) => sec(id, by(id), figsOf(inner(by(id))))) },
    { key: 'tablet', label: '平板', note: '820 直向／1024 橫向，左右分欄，觸控點擊區不低於 44px。', secs: [sec('t-flow', by('flow-tablet'), figsOf(inner(by('flow-tablet'))), '平板：開啟到輸出、設定、雲端硬碟、離開確認、投影唱票'), sec('t-wide', by('flow-wide'), wide.filter((f) => capOf(f).includes('平板')), '平板：統計與橫向編輯器', '直向兩欄的統計，與橫向三欄的編輯器。')] },
    { key: 'desktop', label: '桌機', note: '1280，三欄工作台，鍵盤快速鍵，滑鼠拖曳與雙擊編輯。共 ' + DESK_N + ' 個畫面，依使用順序分組，每個畫面都有對應的手機版。', secs: DESK_SECS.map((s) => sec(s.id, { title: s.title, intro: s.intro }, s.keys.map((k) => { const f = DESK[k]; if (!f) throw new Error('桌機缺畫面 ' + k); used.add(k); return f; }))) },
  ];
  const left = Object.keys(DESK).filter((k) => !used.has(k));
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
if (only !== 'artifact') pages.filter((p) => p.name).forEach(mockup);
if (only !== 'mockups') Object.keys(GROUPS).forEach((g) => { if (pages.some((p) => (p.group || 'screens') === g)) artifact(g); });
console.log('ok', pages.map((p) => p.id).join(','));
