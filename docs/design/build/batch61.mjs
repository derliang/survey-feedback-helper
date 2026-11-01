// 第八輪（2026-11-01）：桌機的滑鼠懸停、焦點、動態與轉場細節（M2）
// 用法：node batch61.mjs  → 寫入 ../mockups/桌機-懸停與動態.html
// 只讀 tokens.css、chrome.css、app.css（都在 repo 內，路徑相對本檔），不依賴其他產生器。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rd = (f) => fs.readFileSync(path.join(here, f), 'utf8');
const tokens = rd('../tokens.css').replace(/\/\*[\s\S]*?\*\/\s*/, '');
const base = rd('chrome.css') + '\n' + rd('app.css');

// ---- 新規則的 CSS：同時是「建議寫進 app.css 的目標值」 ----
const rules = `
/* 懸停只在有滑鼠的裝置生效，避免觸控裝置點完後卡在懸停色 */
@media (hover:hover) and (pointer:fine){
  .btn-primary:hover:not([disabled]),.btn-primary.is-hover{filter:brightness(.94)}
  .btn-secondary:hover:not([disabled]),.btn-secondary.is-hover{background:var(--sunk);border-color:var(--ink2)}
  .btn-ghost:hover:not([disabled]),.btn-ghost.is-hover{background:var(--accent-soft)}
  .btn-danger:hover:not([disabled]),.btn-danger.is-hover{background:var(--bad-soft)}
  .icbtn:hover,.icbtn.is-hover{background:var(--sunk)}
  .row-i:hover:not(.sel),.row-i.is-hover:not(.sel){background:var(--sunk)}
  .card-i:hover,.card-i.is-hover{border-color:var(--ink2);box-shadow:0 2px 6px var(--shadow-sm)}
  .menu-i:hover,.menu-i.is-hover{background:var(--sunk)}
  .bar-i:hover,.bar-i.is-hover{outline:2px solid var(--ink);outline-offset:1px}
  .drag-h:hover{cursor:grab}
}
.btn:active:not([disabled]){filter:brightness(.88)}
.btn[disabled],.icbtn[disabled]{cursor:not-allowed}
.btn-secondary,.btn-ghost,.btn-danger,.icbtn,.row-i,.menu-i{transition:background var(--dur),border-color var(--dur)}
.card-i{transition:border-color var(--dur),box-shadow var(--dur)}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}
`;

const demoCss = `
body{background:var(--paper);color:var(--ink);font:var(--fs-md)/var(--lh-body) var(--font);margin:0;padding:32px 24px}
.pagehead{display:flex;flex-direction:column;gap:6px;max-width:76ch}
.fig figcaption{max-width:760px}
.sec{display:flex;flex-direction:column;gap:12px}
.panel{background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:16px;box-shadow:0 1px 2px var(--shadow-sm)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.state{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.state small{color:var(--ink3);font-size:var(--fs-xs)}
.row-i{display:flex;align-items:center;gap:12px;min-height:var(--tap-min);padding:0 12px;border-bottom:1px solid var(--line-soft);cursor:pointer}
.row-i.sel{background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent);font-weight:600}
.card-i{border:1px solid var(--line);border-radius:var(--r-md);background:var(--card);padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:6px}
.menu{background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);box-shadow:0 4px 12px var(--shadow);padding:4px;width:200px}
.menu-i{display:flex;align-items:center;min-height:var(--tap-min);padding:0 12px;border-radius:6px;cursor:pointer}
.menu-i.kb{outline:3px solid var(--accent);outline-offset:-3px}
.bars{display:flex;align-items:flex-end;gap:10px;height:120px;position:relative;padding-top:30px}
.bar-i{width:44px;background:var(--d1);border-radius:4px 4px 0 0;position:relative}
.bar-i .tip{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:4px 8px;border-radius:6px;font-size:var(--fs-xs);white-space:nowrap;z-index:2}
.bar-i:hover .tip,.bar-i.is-hover .tip,.bar-i:focus-visible .tip{display:block}
.bar-i:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.tipwrap{position:relative;display:inline-block}
.tipbox{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:4px 8px;border-radius:6px;font-size:var(--fs-xs);white-space:nowrap}
.kb{outline:3px solid var(--accent);outline-offset:2px}
.drag-demo{display:flex;flex-direction:column;gap:8px;max-width:360px}
.blk{display:flex;align-items:center;gap:8px;min-height:var(--tap);padding:0 12px;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--card)}
.blk.lift{box-shadow:0 8px 20px var(--shadow);transform:scale(1.02);border-color:var(--accent)}
.dropline{height:3px;background:var(--accent);border-radius:2px;margin:-6px 0}
.mo-demo{display:inline-block;width:160px;height:10px;border-radius:999px;background:var(--sunk);overflow:hidden}
.mo-demo i{display:block;height:100%;width:40%;background:var(--accent)}
table.t{width:100%;border-collapse:collapse;font-size:var(--fs-sm)}
table.t th{text-align:left;padding:8px 10px;background:var(--sunk)}
table.t td{padding:8px 10px;border-top:1px solid var(--line-soft);vertical-align:top}
table.t td:first-child{font-weight:700;white-space:nowrap}
.toggle{position:fixed;right:16px;top:16px}
@keyframes dlg{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.dlg-demo{animation:dlg 220ms ease-out}
@keyframes menuin{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.menu.live{animation:menuin 120ms ease-out}
`;

const hs = (cls, label, sub) => `<div class="state"><button class="btn ${cls}" type="button">${label}</button><small>${sub}</small></div>`;

const figBtn = `<section class="sec"><h2>H1　按鈕的五種狀態（桌機滑鼠）</h2>
<div class="panel"><div class="grid">
${['btn-primary|主按鈕', 'btn-secondary|次按鈕', 'btn-ghost|文字按鈕', 'btn-danger|危險按鈕'].map((x) => { const [c, n] = x.split('|'); return `<div class="state"><b>${n}</b>
<button class="btn ${c}" type="button">一般</button><small>一般</small>
<button class="btn ${c} is-hover" type="button">懸停</button><small>懸停（滑鼠移上去）</small>
<button class="btn ${c} kb" type="button">焦點</button><small>鍵盤焦點：3px 鈷藍外框（既有規則）</small>
<button class="btn ${c}" type="button" disabled>停用</button><small>停用：游標 not-allowed，不顯示懸停</small></div>`; }).join('')}
</div>
<p class="small muted" style="margin:12px 0 0">可以直接把滑鼠移到上面「一般」按鈕試試看。按下（active）：主按鈕 brightness .88，其餘沿用懸停色再加深一階。<b>只調亮度與底色，不位移、不縮放、不換字色</b>，所以不影響文字對比。</p></div>
<ul class="small muted"><li>主按鈕懸停用 <code>filter: brightness(.94)</code>：淺色變深一點，深色版的藍底白字也變深，對比只升不降。</li><li>次按鈕懸停底色 <code>--sunk</code>、外框 <code>--ink2</code>；文字對底色 15.4:1（淺）／16.8:1（深）。</li><li>文字按鈕懸停底色 <code>--accent-soft</code>（<code>--accent-ink</code> 對它 7.8:1 淺／7.3:1 深）；危險按鈕懸停底色 <code>--bad-soft</code>（5.7:1 淺／7.8:1 深）。</li></ul></section>`;

const figList = `<section class="sec"><h2>H2　清單列、卡片、下拉選單、圖示按鈕</h2>
<div class="grid">
<div class="panel"><b>清單列（資料檢查、名單、審稿）</b>
<div class="row-i">一般列</div><div class="row-i is-hover">懸停列（<code>--sunk</code>）</div><div class="row-i sel">已選取列（<code>--accent-soft</code>＋左側 3px 線）</div><div class="row-i sel is-hover">已選取又懸停：維持選取色</div>
<p class="small muted">懸停與選取<b>不同色</b>：懸停是中性灰，選取是藍；選取還有左線與粗體，不只靠顏色。</p></div>
<div class="panel"><b>可點的卡片（範本庫、輸出範本）</b>
<div class="card-i" style="margin-top:8px"><b>一般卡片</b><span class="small muted">外框 --line</span></div>
<div class="card-i is-hover" style="margin-top:8px"><b>懸停卡片</b><span class="small muted">外框變 --ink2、陰影加深一階；不上浮、不放大</span></div>
<p class="small muted">桌機範本卡懸停時，「編輯」「用這份輸出」按鈕才露出（第六輪已定）；鍵盤焦點到卡片也要露出。</p></div>
<div class="panel"><b>下拉選單</b>
<div class="menu live" style="margin-top:8px"><div class="menu-i">重新命名</div><div class="menu-i is-hover">複製（懸停）</div><div class="menu-i kb">匯出（鍵盤焦點）</div><div class="menu-i" style="color:var(--bad)">刪除…</div></div>
<p class="small muted">開啟：淡入＋上移 4px，120ms。關閉：立即。↑↓ 移動、Enter 選、Esc 關閉並把焦點還給觸發鈕。</p></div>
<div class="panel"><b>圖示按鈕與工具提示</b>
<div style="display:flex;gap:12px;margin-top:8px;align-items:flex-start;padding-bottom:36px">
<span class="tipwrap"><button class="icbtn" aria-label="復原" type="button">↶</button></span>
<span class="tipwrap"><button class="icbtn is-hover" aria-label="重做" type="button">↷</button><span class="tipbox">重做　Ctrl+Y</span></span>
<span class="tipwrap"><button class="icbtn kb" aria-label="縮小" type="button">−</button></span></div>
<p class="small muted">圖示鈕懸停底色 <code>--sunk</code>。工具提示：懸停 500ms 或鍵盤焦點後出現，100ms 淡入、離開立即消失；寫「名稱＋快捷鍵」。提示<b>不是唯一說明</b>，圖示鈕本來就有 <code>aria-label</code>。</p></div>
</div></section>`;

const figChart = `<section class="sec"><h2>H3　圖表長條的懸停與焦點</h2>
<div class="panel"><div class="bars">
${[['非常同意', 48, '48 人（40%）'], ['同意', 62, '62 人（52%）'], ['普通', 22, '22 人（18%）'], ['不同意', 8, '8 人（7%）']].map(([n, h, t], i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div class="bar-i ${i === 1 ? 'is-hover' : ''}" tabindex="0" role="img" aria-label="${n}：${t}" style="height:${h}px"><span class="tip">${n}　${t}</span></div><span class="small">${n}</span></div>`).join('')}
</div>
<p class="small muted">懸停或鍵盤聚焦長條：2px 外框（<code>--ink</code>）＋提示顯示「選項　人數（比例）」。<b>圖表上本來就印著數字與標籤，提示只是補充</b>；觸控裝置沒有懸停，點一下顯示同樣提示。提示無動畫，直接出現（避免掃過多根長條時閃爍）。</p></div></section>`;

const figDrag = `<section class="sec"><h2>H4　編輯器區塊拖曳（桌機滑鼠版）</h2>
<div class="panel"><div class="drag-demo">
<div class="blk"><span class="drag-h">⋮⋮</span>標題區</div>
<div class="dropline"></div>
<div class="blk lift"><span class="drag-h" style="cursor:grabbing">⋮⋮</span>摘要數字列（拖曳中）</div>
<div class="blk"><span class="drag-h">⋮⋮</span>稱讚提示</div></div>
<ul class="small muted"><li><b>桌機不用長按</b>：按住把手 ⋮⋮ 移動超過 4px 就開始拖（手機、平板維持長按 350ms，第六輪已定）。把手游標 <code>grab</code>，拖曳中 <code>grabbing</code>。</li><li>被拖區塊：浮起（陰影＋放大 2%，80ms）、外框變 <code>--accent</code>；放置線 3px <code>--accent</code> 80ms 淡入；放開後 160ms 落位。</li><li><b>鍵盤替代</b>：焦點到把手，Space 拿起、↑↓ 移動、Space 放下、Esc 取消；用 <code>aria-live</code> 讀出「第 2 個，共 5 個」。另有上下移鈕。</li><li>減少動態：不浮起放大，只留 <code>--accent</code> 粗外框（3px）與放置線；落位立即。</li></ul></div></section>`;

const MOTION = [
  ['按鈕、列、卡片懸停', '背景色／外框色／陰影漸變', '160ms', 'ease-out', '只在有滑鼠的裝置（hover:hover）；不位移、不縮放'],
  ['工具提示', '懸停 500ms 後淡入；離開立即消失', '100ms', 'ease-out', '鍵盤焦點也出現；長條圖提示無延遲、無動畫'],
  ['下拉選單開啟', '淡入＋上移 4px；關閉立即', '120ms', 'ease-out', '點外面或 Esc 關閉，焦點還給觸發鈕'],
  ['對話框（桌機）', '遮罩淡入；面板淡入＋上移 8px（第六輪已定）', '220ms 進、160ms 出', 'ease-out / ease-in', '焦點移進對話框，關閉後還給觸發鈕'],
  ['三欄工作台側欄收合／展開', '<b>不做動畫</b>，立即切換；預覽紙張隨欄寬重新縮放', '0', '—', '寬度動畫會讓預覽與圖表連續重排，卡頓；改用立即切換'],
  ['預覽縮放（紙張）', '紙張 transform 縮放', '160ms', 'ease-out', '只動 transform，不動版面'],
  ['預覽翻頁、輸出頁切換', '不做動畫，立即換', '0', '—', '第六輪「頁面切換不做動畫」延伸'],
  ['拖曳排序（滑鼠）', '同 H4', '80～160ms', 'ease-out', '4px 門檻，不用長按'],
  ['讀取中', '300ms 內完成就不顯示；超過才出現旋轉圖示（不用骨架閃爍）', '連續', 'linear', '避免短讀取畫面一閃而過'],
  ['複製成功、儲存完成', '按鈕文字原地換成「已複製」2 秒後換回；不彈提示', '0', '—', '用 aria-live 通知，不靠顏色'],
  ['提示（Notice）、錯誤', '直接出現（第六輪已定）', '0', '—', ''],
];

const figMotion = `<section class="sec"><h2>M2　桌機動態與轉場總表</h2>
<div class="panel" style="padding:0;overflow:hidden"><table class="t"><thead><tr>${['場合', '怎麼動', '時間', '緩動', '備註'].map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${MOTION.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
<div class="panel" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span class="small muted">實際播放（系統「減少動態」時不動）：</span><span class="mo-demo"><i></i></span>
<button class="btn btn-secondary" type="button" onclick="var d=document.getElementById('dd');d.hidden=false;d.classList.remove('dlg-demo');void d.offsetWidth;d.classList.add('dlg-demo')">播放對話框進場</button>
<div id="dd" class="panel dlg-demo" hidden style="width:320px;box-shadow:0 8px 24px var(--shadow)"><b>匯出範本</b><p class="small muted" style="margin:6px 0 12px">對話框淡入＋上移 8px。</p><button class="btn btn-primary btn-sm" type="button" onclick="document.getElementById('dd').hidden=true">關閉</button></div></div>
<ul class="small muted"><li><b>減少動態</b>：所有 transition、animation 設為 0；懸停<b>狀態</b>（底色變化）仍然保留，只是瞬間切換，因為那是狀態回饋，不是動態。</li><li>只動 <code>opacity</code>、<code>transform</code>、背景／外框色與陰影；側欄寬度、列高等會重排的屬性不做動畫（沿用 M1）。</li><li>深色與淺色相同，不加光暈；懸停色全部取自既有 token，<b>不新增任何顏色</b>。</li><li>觸控裝置（含桌機觸控螢幕）：懸停規則以 <code>@media (hover:hover) and (pointer:fine)</code> 包起來，不會點完卡在懸停色。</li></ul></section>`;

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>桌機：懸停與動態（模擬頁）</title>
<style>
${tokens}
${base}
${rules}
${demoCss}
</style>
</head>
<body>
<button class="btn btn-secondary btn-sm toggle" type="button" onclick="var r=document.documentElement;r.dataset.theme=r.dataset.theme==='dark'?'light':'dark'">切換深色／淺色</button>
<div class="wrap">
<header class="pagehead"><p class="small muted">設計規範的模擬頁，使用虛構資料。規範見 docs/design/DESIGN.md 5.26。<b>懸停與動畫都是真的，可以直接操作。</b></p><h1>桌機：懸停、焦點與動態</h1><p class="muted">第八輪（2026-11-01）：補上 5.19 留下的「桌機的動態與轉場、滑鼠懸停狀態的細節」。延續第六輪 M1 的原則，只補桌機獨有的部分（滑鼠懸停、工具提示、下拉選單、滑鼠拖曳、側欄收合）；手機與平板不受影響。</p></header>
${figBtn}
${figList}
${figChart}
${figDrag}
${figMotion}
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(here, '../mockups/桌機-懸停與動態.html'), html);
console.log('桌機-懸停與動態', html.length);
