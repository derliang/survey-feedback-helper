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
  const DEV = [
    { key: 'phone', label: '手機', note: '390 × 844，單手操作、一次一個步驟，底部操作列與底部彈出面板。', secs: ['core', 'flow-data', 'flow-stats', 'flow-out', 'flow-edit', 'flow-tpl', 'flow-drive', 'flow-guard', 'flow-sys'].map((id) => sec(id, by(id), figsOf(inner(by(id))))) },
    { key: 'tablet', label: '平板', note: '820 直向／1024 橫向，左右分欄，觸控點擊區不低於 44px。', secs: [sec('t-flow', by('flow-tablet'), figsOf(inner(by('flow-tablet'))), '平板：開啟到輸出、設定、雲端硬碟、離開確認、投影唱票'), sec('t-wide', by('flow-wide'), wide.filter((f) => capOf(f).includes('平板')), '平板：統計與橫向編輯器', '直向兩欄的統計，與橫向三欄的編輯器。')] },
    { key: 'desktop', label: '桌機', note: '1280，三欄工作台，鍵盤快速鍵，滑鼠拖曳與雙擊編輯。', secs: [sec('d-wide', by('flow-wide'), wide.filter((f) => capOf(f).includes('桌機')), '桌機：統計、編輯器、輸出工作台', '三欄工作台的三個主要畫面。'), sec('d-desk', by('flow-desk'), figsOf(inner(by('flow-desk')))), sec('d-desk2', by('flow-desk2'), figsOf(inner(by('flow-desk2'))))] },
  ];
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
