// 產生 2026-11-14 稽核改版的三張模擬頁（統計、輸出、設定）。
// 用法：node docs/design/build/audit-mockups.mjs   （在 repo 根目錄執行）
// tokens 從 docs/design/tokens.css 原樣讀入，不另寫死色碼。純靜態、只有虛構資料。
import { readFileSync, writeFileSync } from 'node:fs';

const tokens = readFileSync('docs/design/tokens.css', 'utf8');

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:var(--sunk);color:var(--ink);font-family:var(--font);font-size:var(--fs-md);line-height:var(--lh-body)}
.doc{max-width:1360px;margin:0 auto;padding:24px 16px 64px}
.doc h1{font-size:var(--fs-2xl);line-height:var(--lh-tight);margin:0 0 8px}
.doc>p,.doc li{color:var(--ink2);font-size:var(--fs-sm)}
.note{background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:16px;margin:16px 0}
.note h2{font-size:var(--fs-lg);margin:0 0 8px}
.note ul{margin:4px 0 0;padding-left:20px}
.devs{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;margin-top:24px}
.dev{flex:0 0 auto}
.dev>h3{font-size:var(--fs-sm);color:var(--ink2);margin:0 0 8px}
.frame{background:var(--paper);border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden;position:relative}
.frame.m{width:390px}.frame.t{width:768px}.frame.d{width:1280px}
.scroll{overflow-x:auto;max-width:100%}
.bar{display:flex;align-items:center;gap:12px;background:var(--card);border-bottom:1px solid var(--line-soft);padding:0 16px;height:56px}
.bar .brand{font-weight:700;font-size:17px;white-space:nowrap}
.bar .sp{flex:1}
.bar .lk{color:var(--accent-ink);font-weight:600;font-size:15px;white-space:nowrap}
.steps{display:flex;gap:8px;flex:1}
.steps i{flex:1;font-style:normal;text-align:center;font-size:var(--fs-xs);color:var(--ink3);border-top:4px solid var(--line-soft);padding-top:4px}
.steps i.on{color:var(--accent-ink);font-weight:700;border-top-color:var(--accent)}
.steps i.done{border-top-color:var(--accent);color:var(--ink2)}
.stepm{display:flex;gap:6px;padding:8px 16px 0;background:var(--card)}
.stepm i{flex:1;font-style:normal;text-align:center;font-size:var(--fs-xs);color:var(--ink3);border-top:4px solid var(--line-soft);padding-top:4px}
.stepm i.on{color:var(--accent-ink);font-weight:700;border-top-color:var(--accent)}
.stepm i.done{border-top-color:var(--accent)}
.pg{padding:16px}
.d .pg,.t .pg{padding:24px 44px}
h2.ttl{font-size:var(--fs-xl);line-height:var(--lh-tight);margin:4px 0 4px}
.sub{color:var(--ink2);font-size:var(--fs-sm);margin:0 0 12px}
.card{background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:16px;box-shadow:0 1px 2px var(--shadow-sm)}
.card+.card,.card+.banner,.banner+.card{margin-top:12px}
.card h3{font-size:var(--fs-lg);margin:0 0 8px;line-height:var(--lh-tight)}
.card h4{font-size:var(--fs-md);margin:0 0 6px}
.hint{color:var(--ink2);font-size:var(--fs-sm);margin:0 0 8px}
.xs{font-size:var(--fs-xs);color:var(--ink3)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 16px;border-radius:var(--r-sm);border:1px solid var(--ink3);background:var(--card);color:var(--ink);font:600 16px var(--font);white-space:nowrap}
.btn.p{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.btn.g{border-color:transparent;background:transparent;color:var(--accent-ink)}
.btn.s{min-height:44px;font-size:15px}
.btn.dis{background:var(--sunk);color:var(--ink3);border-color:transparent}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.row.nw{flex-wrap:nowrap}
.grow{flex:1}
.chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 6px}
.chip{flex:0 0 auto;min-height:44px;display:inline-flex;align-items:center;padding:0 16px;border-radius:999px;border:1px solid var(--ctl);background:var(--card);font-size:15px;font-weight:600;white-space:nowrap}
.chip.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-ink)}
.seg{display:flex;background:var(--sunk);border-radius:var(--r-sm);padding:3px;gap:2px}
.seg b{flex:1;text-align:center;min-height:44px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;color:var(--ink2);border-radius:6px}
.seg b.on{background:var(--card);color:var(--accent-ink);box-shadow:0 1px 3px var(--shadow)}
.tiles{display:flex;gap:12px}
.tile{flex:1;background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);padding:12px 16px}
.tile small{display:block;color:var(--ink2);font-size:var(--fs-xs)}
.tile b{font-size:var(--fs-2xl);line-height:1.2;font-variant-numeric:tabular-nums}
.tile.warn{background:var(--warn-soft);border-color:var(--warn)}
.banner{display:flex;align-items:center;gap:12px;background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);border-radius:var(--r-sm);padding:8px 12px;font-size:var(--fs-sm);min-height:44px}
.banner.info{background:var(--accent-soft);color:var(--accent-ink);border-color:var(--accent)}
.banner .x{margin-left:auto;font-weight:700;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}
.tag{display:inline-block;height:26px;line-height:26px;padding:0 8px;border-radius:6px;font-size:var(--fs-xs);font-weight:600;background:var(--sunk);color:var(--ink2)}
.tag.w{background:var(--warn-soft);color:var(--warn)}
.tag.ok{background:var(--ok-soft);color:var(--ok)}
.tag.a{background:var(--accent-soft);color:var(--accent-ink)}
.brow{margin:8px 0}
.brow .l{display:flex;justify-content:space-between;font-size:var(--fs-sm)}
.track{height:12px;border-radius:6px;background:var(--sunk);overflow:hidden}
.track i{display:block;height:100%;background:var(--accent);border-radius:6px}
table.tb{width:100%;border-collapse:collapse;font-size:var(--fs-sm);font-variant-numeric:tabular-nums}
table.tb th{background:var(--sunk);text-align:left;padding:8px;font-weight:700}
table.tb td{padding:8px;border-top:1px solid var(--line-soft)}
table.tb tr.avg td{background:var(--warn-soft)}
.acc{display:flex;align-items:center;gap:12px;min-height:64px}
.acc .t{flex:1}.acc .t b{display:block}
.acc .t span{color:var(--ink2);font-size:var(--fs-sm)}
.chev{font-size:20px;color:var(--ink3)}
.actbar{display:flex;gap:8px;justify-content:flex-end;background:var(--card);border-top:1px solid var(--line-soft);padding:12px 16px}
.d .actbar,.t .actbar{padding:12px 44px}
.m .actbar .btn.p{flex:1}
.cols{display:flex;gap:24px;align-items:flex-start}
.cols>.main{flex:1;min-width:0}.cols>.side{flex:0 0 340px}
.cols>.nav{flex:0 0 240px}
.nav .item{min-height:56px;display:flex;flex-direction:column;justify-content:center;padding:6px 12px;border-radius:var(--r-sm);border:1px solid var(--line-soft);background:var(--card);margin-bottom:8px}
.nav .item.on{background:var(--accent-soft);border-color:var(--accent)}
.nav .item b{font-size:var(--fs-sm)}
.nav .item span{font-size:var(--fs-xs);color:var(--ink2)}
.nav h4{margin:12px 0 6px;font-size:var(--fs-xs);color:var(--ink3);letter-spacing:.04em}
.fld{margin:12px 0}
.fld label{display:block;font-weight:600;font-size:var(--fs-sm);margin-bottom:4px}
.inp{min-height:48px;border:1px solid var(--ink3);border-radius:var(--r-sm);background:var(--card);padding:10px 12px;color:var(--ink3)}
.inp.v{color:var(--ink)}
.ck{display:flex;gap:10px;align-items:center;min-height:44px}
.ck i{width:22px;height:22px;border:2px solid var(--ink3);border-radius:4px;flex:0 0 auto}
.ck i.on{background:var(--accent);border-color:var(--accent)}
/* 範本縮圖：整張 A4 放在固定大小的容器內，用同一個 scale 縮小，字級不另外設像素 */
.thumbbox{width:var(--tw,150px);height:calc(var(--tw,150px)*1.414);background:#fff;border:1px solid var(--line);border-radius:6px;overflow:hidden;position:relative;flex:0 0 auto}
.thumbbox .pg794{width:794px;height:1123px;transform:scale(var(--s,0.19));transform-origin:0 0;padding:56px 56px;font-size:20px;color:#222;font-family:var(--font);position:absolute;left:0;top:0}
.sel{background:var(--card);border:2px solid var(--line-soft);border-radius:var(--r-md);padding:10px;display:flex;flex-direction:column;gap:6px;align-items:center;flex:0 0 auto}
.sel.on{border-color:var(--accent);background:var(--accent-soft)}
.sel b{font-size:var(--fs-sm)}
.stk{position:sticky;top:12px}
.t .bar .xs{display:none}
.t .steps i{font-size:12px}
`;

const FOOT = `
<script>/* 靜態模擬頁，無互動 */</script>`;

const page = (title, body) => `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}（模擬頁）</title>
<style>
${tokens}
${CSS}
</style></head><body><div class="doc">
${body}
</div>${FOOT}</body></html>`;

const appbarM = (on) => `<div class="bar"><span class="brand">問卷回饋小幫手</span><span class="sp"></span><span class="lk">↺</span><span class="lk">✎</span><span class="btn s" style="min-height:40px">⚙</span></div><div class="stepm"><i class="done">開啟問卷</i><i class="done">準備資料</i><i class="${on === 3 ? 'on' : 'done'}">統計</i><i class="${on === 4 ? 'on' : ''}">輸出</i></div>`;
const appbarD = (on) => `<div class="bar"><span class="brand">問卷回饋小幫手</span><span class="xs">報告回饋 (回覆).csv</span><div class="steps"><i class="done">① 開啟問卷</i><i class="done">② 準備資料</i><i class="${on === 3 ? 'on' : 'done'}">③ 統計</i><i class="${on === 4 ? 'on' : ''}">④ 輸出</i></div><span class="lk">↺ 重新開始</span><span class="lk">✎ 範本</span><span class="btn s" style="min-height:40px">⚙ 設定</span></div>`;

/* ───────── 1. 統計頁 ───────── */
const slimBanner = `<div class="banner"><span>⚠ 還有 5 則留言沒審；審稿進度不會自動儲存（尚未選資料夾）</span><span class="x" aria-label="關閉本次">✕</span></div>`;
const adv = `<div class="card"><div class="acc"><div class="t"><b>進階設定</b><span>最高最低分：不去除 · 反向題：0 題 · 注意用詞：9 個</span></div><span class="chev">▾</span></div></div>`;
const review = `<div class="card"><h3>審稿　<span class="tag w">已審 2／5</span></h3>
<div class="track" style="margin-bottom:10px"><i style="width:40%"></i></div>
<div style="border:1px solid var(--line-soft);border-radius:8px;padding:10px;margin-bottom:8px"><span class="tag w">未審</span> 講得很清楚<div class="row" style="margin-top:8px"><span class="btn s p">採用</span><span class="btn s">隱藏</span><span class="btn s">改寫</span></div></div>
<div style="border:1px solid var(--line-soft);border-radius:8px;padding:10px"><span class="tag w">未審</span> 圖片再大一點<div class="row" style="margin-top:8px"><span class="btn s p">採用</span><span class="btn s">隱藏</span><span class="btn s">改寫</span></div></div>
<div class="fld"><label>老師評語</label><div class="inp" style="min-height:72px">這位同學…</div></div></div>`;
const result = `<div class="tiles"><div class="tile"><small>總分（加權）</small><b>7.5</b></div><div class="tile"><small>班級平均</small><b>8.1</b></div></div>
<div class="card" style="margin-top:12px"><h4>各題平均</h4>
<div class="brow"><div class="l"><span>簡報內容（充實度）</span><b>7.0</b></div><div class="track"><i style="width:70%"></i></div></div>
<div class="brow"><div class="l"><span>台風</span><b>8.0</b></div><div class="track"><i style="width:80%"></i></div></div>
<div class="row" style="justify-content:flex-end"><span class="btn g s">下載這張圖表（JPG）</span></div></div>`;
const table = `<div class="card" style="margin-top:12px;padding:0;overflow:hidden"><table class="tb"><tr><th>名次</th><th>學生</th><th>簡報</th><th>台風</th><th>總分</th></tr><tr><td>1</td><td>1 王大明</td><td>8.3</td><td>9.0</td><td><b>8.7</b></td></tr><tr><td>2</td><td>2 林雅婷</td><td>7.0</td><td>8.0</td><td><b>7.5</b></td></tr><tr class="avg"><td></td><td>班級平均</td><td>7.7</td><td>8.5</td><td><b>8.1</b></td></tr></table></div>`;

const statsM = `<div class="frame m">${appbarM(3)}<div class="pg"><h2 class="ttl">統計</h2><p class="sub">報告回饋 (回覆)・共 5 筆回覆・<u>統計方法說明</u></p>${slimBanner}
<div class="chips" style="margin-top:8px"><span class="chip">全班總覽</span><span class="chip">1 王大明</span><span class="chip on">2 林雅婷</span></div>
${result}${review}${table}${adv}</div><div class="actbar"><span class="btn">上一步</span><span class="btn p">前往輸出</span></div></div>`;

const statsT = `<div class="frame t">${appbarD(3)}<div class="pg"><h2 class="ttl">統計</h2><p class="sub">報告回饋 (回覆)・共 5 筆回覆・<u>統計方法說明</u></p>${slimBanner}
<div class="chips" style="margin-top:8px"><span class="chip">全班總覽</span><span class="chip">1 王大明</span><span class="chip on">2 林雅婷</span></div>
<div class="cols"><div class="main">${result}${table}</div><div class="side" style="flex-basis:300px">${review}</div></div>
<div style="margin-top:12px">${adv}</div></div><div class="actbar"><span class="btn">上一步</span><span class="btn p">前往輸出</span></div></div>`;

const statsD = `<div class="frame d">${appbarD(3)}<div class="pg"><h2 class="ttl">統計</h2><p class="sub">報告回饋 (回覆)・共 5 筆回覆・<u>統計方法說明</u></p>${slimBanner}
<div class="cols" style="margin-top:12px"><div class="nav" style="flex-basis:220px"><h4 style="margin-top:0">被評對象</h4><div class="item"><b>全班統計總覽</b><span>2 人</span></div><div class="item"><b>1 王大明</b><span>8.7 · 第 1 名</span></div><div class="item on"><b>2 林雅婷</b><span>7.5 · 第 2 名</span></div></div>
<div class="main">${result}${table}</div><div class="side">${review}</div></div>
<div style="margin-top:12px">${adv}</div></div><div class="actbar"><span class="btn">上一步</span><span class="btn p">前往輸出</span></div></div>`;

writeFileSync('docs/design/mockups/稽核改版-統計頁.html', page('統計頁改版', `
<h1>統計頁改版（手機／平板／桌機）</h1>
<p>2026-11-14 設計員逐頁稽核後的重新設計，待使用者確認。稽核見 <code>docs/design/逐頁版面稽核-2026-11-14.md</code> P07、P08；規範見 DESIGN.md 5.33。全部是虛構資料。</p>
<div class="note"><h2>改了什麼、為什麼</h2><ul>
<li><b>結果在第一屏</b>：被評對象（或題目）改成頂端選擇器——手機是可橫向捲動的 chips，桌機是左欄清單——選了就在正下方看到數字與圖表，不必先捲過一整排大卡。</li>
<li><b>設定收進「進階設定」</b>：最高最低分處理、反向計分題、注意用詞（九個 chip）很少動，預設收成一張卡、只顯示目前設定摘要；展開才看到內容。</li>
<li><b>審稿成為獨立的一張卡</b>，帶進度（已審 2／5），在結果之後；這是這頁真正要做的事。</li>
<li><b>儲存警示變成頁頂一行細橫幅</b>（可關閉本次），不再是每次都在頁底的大黃卡；沒有審稿內容的問卷（例如意見調查）不顯示。</li>
<li><b>桌機</b>：左欄選擇、中欄結果、右欄審稿；底部固定操作列（跟手機同一個元件），「前往輸出」永遠在眼前。手機表格把座號與姓名併成一欄，避免姓名被擠成三行。</li>
</ul></div>
<div class="note"><h2>待使用者裁示</h2><ul>
<li><b>A（建議）：頂端選擇器＋進階設定收合</b>。優點：第一屏就是結果、審稿有進度；缺點：進階設定多一次點擊（但很少用）。</li>
<li><b>B：維持現在的卡片清單，只把設定與用詞移到頁底</b>。優點：改動最小；缺點：手機仍要先捲過大卡才看到結果。</li>
</ul></div>
<div class="devs">
<div class="dev"><h3>手機 390</h3>${statsM}</div>
<div class="dev"><h3>平板 768</h3><div class="scroll">${statsT}</div></div>
<div class="dev"><h3>桌機 1280</h3><div class="scroll">${statsD}</div></div>
</div>`));

/* ───────── 2. 輸出頁 ───────── */
const thumb = (kind, w) => {
  const body = kind === 'class'
    ? `<div style="text-align:center;font-weight:700;font-size:26px;color:#9a4a00">班級總表</div><div style="height:12px"></div><div style="background:#9a4a00;color:#fff;padding:6px 10px">姓名　平均</div>${'<div style="padding:6px 10px;border-bottom:1px solid #eee">王大明　8.7</div>'.repeat(5)}`
    : kind === 'adv'
    ? `<div style="background:#9a4a00;color:#fff;padding:10px;font-weight:700;font-size:26px">個人回饋單（進階版）</div><div style="height:10px"></div><div style="background:#f5ece0;padding:10px">自評對照表（同學給的、自己給的、落差）</div>${'<div style="padding:6px 10px;border-bottom:1px solid #eee">簡報內容　8　9</div>'.repeat(3)}`
    : `<div style="color:#1d4f91;font-weight:700;font-size:28px">林小宇 的小組報告回饋單</div><div style="color:#666">三年二班 6 號｜小組報告</div><div style="height:10px"></div><div style="background:#9a4a00;color:#fff;padding:6px 10px">各向度評分</div>${'<div style="padding:6px 10px;border-bottom:1px solid #eee">項目　4.2　3.9</div>'.repeat(3)}<div style="height:12px"></div><div style="background:#fdf3d8;padding:8px">{老師評語} 有內容時顯示</div>`;
  return `<div class="thumbbox" style="--tw:${w}px;--s:${(w / 794).toFixed(4)}"><div class="pg794">${body}<div style="position:absolute;left:56px;right:56px;bottom:40px;color:#888;font-size:18px">〇〇國中 三年二班 ${kind === 'class' ? '班級總表' : '林小宇'}｜第 1 頁</div></div></div>`;
};
const tpls = (w, wrap) => `<div class="${wrap ? 'chips' : 'row'}" style="align-items:stretch;gap:12px">
<div class="sel on">${thumb('p', w)}<b>個人回饋單</b><span class="tag a">目前選用</span></div>
<div class="sel">${thumb('adv', w)}<b>個人回饋單（進階版）</b><span class="xs">自評對照</span></div>
<div class="sel">${thumb('class', w)}<b>班級總表</b><span class="xs">給老師</span></div></div>`;
const audience = `<div class="card"><h3>① 給誰看</h3><div class="seg"><b class="on">教師版</b><b>學生版</b><b>家長版</b></div><p class="hint" style="margin-top:8px">顯示各題平均、班級平均及全部留言（含未審者）。</p></div>`;
const downloadPanel = (stickyCls) => `<div class="card ${stickyCls || ''}"><h3>③ 下載</h3>
<h4>班級總表</h4><div class="row nw"><span class="btn grow">Excel</span><span class="btn grow">Word</span><span class="btn grow">PDF</span></div>
<hr style="border:0;border-top:1px solid var(--line-soft);margin:16px 0">
<h4>個人回饋單</h4><div class="fld" style="margin-top:0"><div class="inp v">01 王大明　▾</div></div>
<div class="row nw"><span class="btn p grow">下載 Word</span><span class="btn grow">PDF</span><span class="btn" aria-label="更多">⋯</span></div>
<p class="xs" style="margin-top:8px">⋯ 內有「開啟瀏覽器列印視窗」。回饋單不顯示名次。</p>
<span class="btn s" style="width:100%;margin-top:4px">全部 2 位（打包 zip）</span></div>`;
const outNote = `<p class="xs" style="margin:12px 0 0">第一次產生 PDF 或 Word 可能需要載入約 5 MB 字型資源；Word 檔字型使用電腦內建的中文字型，換行位置可能和 PDF 有一兩個字的差異。</p>`;

const outM = `<div class="frame m">${appbarM(4)}<div class="pg"><h2 class="ttl">輸出</h2><p class="sub">報告回饋 (回覆)</p>${audience}
<div class="card"><h3>② 範本</h3><p class="hint">左右滑動選擇；要改版面請按「編輯範本」。</p>${tpls(120, true)}<div class="row" style="margin-top:4px"><span class="btn g s">編輯範本</span></div></div>
${downloadPanel()}${outNote}</div><div class="actbar"><span class="btn">回到統計</span></div></div>`;
const outT = `<div class="frame t">${appbarD(4)}<div class="pg"><h2 class="ttl">輸出</h2><p class="sub">報告回饋 (回覆)</p>${audience}
<div class="card"><h3>② 範本</h3>${tpls(140, false)}<div class="row" style="margin-top:8px"><span class="btn g s">編輯範本</span></div></div>
${downloadPanel()}${outNote}</div><div class="actbar"><span class="btn">回到統計</span></div></div>`;
const outD = `<div class="frame d">${appbarD(4)}<div class="pg"><h2 class="ttl">輸出</h2><p class="sub">報告回饋 (回覆)</p>
<div class="cols"><div class="main">${audience}<div class="card"><h3>② 範本</h3><p class="hint">個人回饋單使用目前選定的範本版面；要改版面請按「編輯範本」。</p>${tpls(170, false)}<div class="row" style="margin-top:8px"><span class="btn g s">編輯範本</span></div></div>${outNote}</div>
<div class="side" style="flex-basis:400px">${downloadPanel('stk')}</div></div></div><div class="actbar"><span class="btn">回到統計</span></div></div>`;

writeFileSync('docs/design/mockups/稽核改版-輸出頁.html', page('輸出頁改版', `
<h1>輸出頁改版（手機／平板／桌機）</h1>
<p>2026-11-14 設計員逐頁稽核後的重新設計，待使用者確認。稽核見 <code>docs/design/逐頁版面稽核-2026-11-14.md</code> P09、G4；規範見 DESIGN.md 5.33。全部是虛構資料。</p>
<div class="note"><h2>改了什麼、為什麼</h2><ul>
<li><b>三段式：① 給誰看　② 範本　③ 下載</b>。現在是四張一樣大的全寬卡，真正的主要動作（下載）在最底。</li>
<li><b>桌機左右兩欄</b>：左邊選設定（給誰看、範本），右邊是<b>固定的「下載」面板</b>（捲動時跟著），主要動作永遠在眼前，不用捲到最底。</li>
<li><b>範本改成縮圖列</b>：手機可左右滑，平板與桌機並排；<b>縮圖壞掉的問題一併修正</b>——整張 A4 放進固定大小容器、用同一個縮放，頁尾文字不再被放大蓋住縮圖。「編輯範本」改成次要文字按鈕並與縮圖分開。</li>
<li><b>下載面板的主次固定</b>：每個區塊只有一顆主要按鈕（個人回饋單：下載 Word），其餘（PDF、更多「⋯」內有列印視窗與 zip）退為次要；班級總表三顆等寬排一列，手機不再折成兩排。</li>
<li>選學生用一般寬度的下拉，不再拉滿 1190。</li>
</ul></div>
<div class="note"><h2>待使用者裁示</h2><ul>
<li><b>A（建議）：桌機兩欄，右側固定下載面板</b>。優點：主要動作永遠可見、版面有層次；缺點：桌機左欄範本縮圖空間變小（170 寬，仍看得出版面）。</li>
<li><b>B：維持單欄直排，只修縮圖與按鈕主次</b>。優點：改動小；缺點：桌機仍有大片空白，下載仍在最底。</li>
</ul></div>
<div class="devs">
<div class="dev"><h3>手機 390</h3>${outM}</div>
<div class="dev"><h3>平板 768</h3><div class="scroll">${outT}</div></div>
<div class="dev"><h3>桌機 1280</h3><div class="scroll">${outD}</div></div>
</div>`));

/* ───────── 3. 設定頁 ───────── */
const fldC = (label, val, custom) => `<div class="fld"><label>${label} ${custom ? '<span class="tag a">已自訂</span>' : ''}</label><div class="inp ${val ? 'v' : ''}">${val || '（使用預設）'}</div></div>`;
const folder = `<div class="card"><h3>資料夾</h3><p class="hint">資料夾：<b>尚未選擇資料夾</b></p><div class="row"><span class="btn s">選擇資料夾</span><span class="btn s">下載設定檔</span></div></div>`;
const defaults = `<div class="card"><h3>預設輸出設定</h3><p class="hint">依序採用「全域預設 → 問卷類型 → 這次輸出」，後一層有設定時採用後一層；「這次輸出」的調整只對這一次有效。</p><div class="seg"><b class="on">全域預設</b><b>問卷類型</b><b>這次輸出</b></div>
${fldC('學校名稱', '', false)}${fldC('檔名規則', '{班級}_{座號}_{姓名}_回饋單', true)}
<div class="fld"><label>預設給誰看</label><div class="seg"><b class="on">教師版</b><b>學生版</b><b>家長版</b></div></div>
<div class="ck"><i></i>姓名換代號</div><div class="ck"><i></i>顯示他人姓名</div><div class="ck"><i></i>附上原始留言</div><div class="ck"><i class="on"></i>顯示班級比較</div>
<p class="xs">沒有「已自訂」標籤的欄位都在用內建預設。</p></div>`;
const backup = `<div class="card"><h3>備份與還原</h3><p class="hint"><b>備份檔包含</b>問卷設定、名單對照、審稿進度、各層設定、我的範本、個別學生版本、圖片。<b>不包含</b>內建範本、原始作答的 Excel 檔。</p><div class="banner" style="margin-bottom:12px">⚠ 備份可能含學生姓名與名單，請依學校個資規範保管。</div><div class="row"><span class="btn s p">下載全部設定與範本備份</span><span class="btn s">匯入備份檔並選擇還原方式</span></div></div>`;
const look = `<div class="card"><h3>外觀與語言</h3><div class="fld" style="margin-top:0"><label>外觀</label><div class="seg"><b class="on">跟隨系統</b><b>淺色</b><b>深色</b></div></div><div class="fld"><label>語言</label><div class="seg"><b class="on">繁體中文</b><b>English</b></div></div></div>`;
const help = `<div class="card"><div class="acc"><div class="t"><b>說明</b><span>離線使用 · 鍵盤操作 · 瀏覽器支援 · 隱私權政策</span></div><span class="chev">▾</span></div></div>`;
const storage = `<div class="card"><h3>資料儲存與隱私</h3><ul style="margin:0;padding-left:20px"><li>本程式沒有伺服器，問卷結果只在這個瀏覽器處理。</li><li>設定與名單存在你選的資料夾。</li><li>放在雲端的檔案由該服務處理。</li></ul></div>`;

const setM = (tab) => `<div class="frame m">${appbarM(0)}<div class="pg"><h2 class="ttl">設定</h2><div class="seg" style="margin:8px 0 12px"><b class="${tab === 0 ? 'on' : ''}">常用</b><b class="${tab === 1 ? 'on' : ''}">進階與資訊</b></div>
${tab === 0 ? folder + defaults : backup + look + help + storage}</div><div class="actbar"><span class="btn">上一步</span></div></div>`;
const setNav = (on) => `<div class="nav"><h4 style="margin-top:0">常用</h4><div class="item ${on === 0 ? 'on' : ''}"><b>資料夾與預設輸出</b><span>尚未選擇資料夾</span></div><h4>進階與資訊</h4><div class="item ${on === 1 ? 'on' : ''}"><b>備份與還原</b><span>下載或匯入設定檔</span></div><div class="item ${on === 2 ? 'on' : ''}"><b>外觀與語言</b><span>跟隨系統 · 繁體中文</span></div><div class="item ${on === 3 ? 'on' : ''}"><b>說明與隱私</b><span>離線、鍵盤、瀏覽器支援</span></div></div>`;
const setWide = (w, bar) => `<div class="frame ${w}">${bar}<div class="pg"><h2 class="ttl">設定</h2><div class="cols" style="margin-top:12px">${setNav(0)}<div class="main" style="max-width:720px">${folder}${defaults}</div></div></div><div class="actbar"><span class="btn">上一步</span></div></div>`;

writeFileSync('docs/design/mockups/稽核改版-設定頁.html', page('設定頁改版', `
<h1>設定頁改版（手機／平板／桌機）</h1>
<p>2026-11-14 設計員逐頁稽核後的重新設計，待使用者確認。稽核見 <code>docs/design/逐頁版面稽核-2026-11-14.md</code> P10；規範見 DESIGN.md 5.33。全部是虛構資料。</p>
<div class="note"><h2>改了什麼、為什麼</h2><ul>
<li><b>從一條 2500～3000 高的長單欄，分成「常用」與「進階與資訊」</b>：常用＝資料夾、預設輸出；進階＝備份與還原、外觀與語言、說明（離線、鍵盤、瀏覽器支援，預設收合）。手機用頂端分段控制切換，平板／桌機用左側清單導覽。</li>
<li><b>「目前的值：內建預設」標籤全部拿掉</b>（十幾個一模一樣的雜訊）；只有被改過的欄位才顯示「已自訂」，其餘一律是預設。</li>
<li><b>桌機內容最寬 720、置中靠左導覽</b>，輸入框與分段控制不再拉到 930；欄位標籤與輸入框的比例回到正常。</li>
<li>備份與還原放在進階頁最上面（重要、動作可能覆寫資料），外觀與語言併成一張卡。</li>
</ul></div>
<div class="note"><h2>待使用者裁示</h2><ul>
<li><b>A（建議）：分「常用／進階與資訊」，桌機左側導覽</b>。優點：每次進來只看到常用的；缺點：備份要多一次點擊。</li>
<li><b>B：維持單欄，只去掉「目前的值」標籤、限制桌機寬度 720、收合說明</b>。優點：改動最小；缺點：手機仍然很長。</li>
</ul></div>
<div class="devs">
<div class="dev"><h3>手機 390：常用</h3>${setM(0)}</div>
<div class="dev"><h3>手機 390：進階與資訊</h3>${setM(1)}</div>
<div class="dev"><h3>平板 768</h3><div class="scroll">${setWide('t', appbarD(0))}</div></div>
<div class="dev"><h3>桌機 1280</h3><div class="scroll">${setWide('d', appbarD(0))}</div></div>
</div>`));
console.log('done');
