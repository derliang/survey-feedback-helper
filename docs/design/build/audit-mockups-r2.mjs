// 產生 2026-11-15 設計員第二輪稽核的四張模擬頁（票選統計與輸出、選課結果與面板、共用元件、英文頂列）。
// 用法：node docs/design/build/audit-mockups-r2.mjs   （在 repo 根目錄執行）
// 元件 CSS 沿用 audit-mockups.mjs 的 CSS（原樣讀入），tokens 從 docs/design/tokens.css 原樣讀入。純靜態、只有虛構資料。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const tokens = readFileSync('docs/design/tokens.css', 'utf8');
const base = readFileSync('docs/design/build/audit-mockups.mjs', 'utf8');
const BASE_CSS = /const CSS = `([\s\S]*?)`;\s*const FOOT/.exec(base)[1];

const EXTRA = `
.opt{border:2px solid var(--line-soft);border-radius:var(--r-md);padding:12px;background:var(--card)}
.opt.rec{border-color:var(--accent)}
.opt h4{margin:0 0 4px}
.pro,.con{font-size:var(--fs-sm);margin:2px 0}
.pro::before{content:"＋ ";color:var(--ok);font-weight:700}.con::before{content:"－ ";color:var(--bad);font-weight:700}
.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin:12px 0}
.badge{display:inline-block;background:var(--accent);color:var(--on-accent);border-radius:6px;padding:0 8px;font-size:var(--fs-xs);font-weight:700;line-height:22px;margin-left:6px}
.sec{margin-top:40px;padding-top:16px;border-top:3px solid var(--line)}
.sec>h2{font-size:var(--fs-xl);margin:0 0 4px}
.lbl{font-size:var(--fs-xs);font-weight:700;color:var(--ink3);margin:0 0 6px;letter-spacing:.04em}
.tag.b{background:var(--bad-soft);color:var(--bad)}
.tilew{min-width:0}
.tile b.nw{white-space:nowrap}
.crow2{border:1px solid var(--line-soft);border-radius:var(--r-md);background:var(--card);padding:12px;margin-top:8px}
.crow2 .h{display:flex;align-items:center;gap:8px;justify-content:space-between}
.crow2 .h b{font-size:var(--fs-md)}
.crow2 .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.tag.wrap{height:auto;line-height:1.35;padding:4px 8px;white-space:normal}
.warnbar i{background:var(--warn-bar)}
.sheetm{position:relative;height:640px;background:var(--paper);overflow:hidden}
.sheetm .scrim{position:absolute;inset:0;background:var(--scrim)}
.sheetm .sh{position:absolute;left:0;right:0;bottom:0;background:var(--card);border-radius:var(--r-lg) var(--r-lg) 0 0;padding:8px 16px 16px;box-shadow:0 -4px 16px var(--shadow)}
.sh .grab{width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 8px}
.sh .hd{display:flex;align-items:center;gap:8px;min-height:48px}
.sh .hd b{flex:1;font-size:var(--fs-lg)}
.xbtn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--ink2);border-radius:var(--r-sm);border:1px solid transparent}
.orow{display:flex;align-items:center;gap:12px;min-height:52px;border-top:1px solid var(--line-soft)}
.orow .rd{width:22px;height:22px;border:2px solid var(--ink3);border-radius:50%;flex:0 0 auto}
.orow .rd.on{border-color:var(--accent);box-shadow:inset 0 0 0 4px var(--card);background:var(--accent)}
.orow .t{flex:1;min-width:0}.orow .n{font-variant-numeric:tabular-nums;color:var(--ink2);font-size:var(--fs-sm)}
.dlg{background:var(--card);border-radius:var(--r-lg);box-shadow:0 8px 32px var(--shadow);padding:24px;margin:0 auto}
.dlg h3{font-size:var(--fs-xl);line-height:var(--lh-tight);margin:0 0 8px}
.dlg .ft{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.btn.d{border-color:var(--bad);color:var(--bad);background:transparent}
.dlgbg{background:var(--scrim);padding:24px 16px;border-radius:var(--r-md)}
.sk{background:var(--sunk);border-radius:var(--r-md);height:16px}
.nt{display:flex;gap:12px;border-radius:var(--r-md);padding:12px 16px;background:var(--bad-soft);border:1px solid var(--bad);color:var(--ink)}
.nt b{display:block}
.thumbrow{display:flex;gap:16px;align-items:flex-start}
.lst{margin:6px 0 0;padding-left:20px;color:var(--ink)}
.lst li{margin:2px 0}
.cmp{font-size:var(--fs-sm);width:100%;border-collapse:collapse}
.cmp td,.cmp th{border:1px solid var(--line-soft);padding:6px 8px;text-align:left;vertical-align:top}
.cmp th{background:var(--sunk)}
.fix .bar{height:auto;min-height:56px;flex-wrap:wrap;row-gap:0;padding-top:8px;padding-bottom:0}
.tb1{display:flex;align-items:center;gap:12px;background:var(--card);border-bottom:1px solid var(--line-soft);padding:0 16px;height:56px}
.tb2{background:var(--card);border-bottom:1px solid var(--line-soft)}
.tb2 .r1{display:flex;align-items:center;gap:12px;height:48px;padding:0 16px}
.rcard{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--ctl);border-radius:var(--r-md);padding:10px 12px;background:var(--card);margin-top:8px;min-height:56px}
.rcard.on{border-color:var(--accent);background:var(--accent-soft)}
.rcard .rd{width:22px;height:22px;border:2px solid var(--ink3);border-radius:50%;flex:0 0 auto;margin-top:2px}
.rcard.on .rd{border-color:var(--accent);background:var(--accent);box-shadow:inset 0 0 0 4px var(--card)}
.rcard span{display:block;color:var(--ink2);font-size:var(--fs-sm)}
.lock{display:flex;gap:10px;align-items:center;min-height:48px;padding:0 12px;border:1px solid var(--line-soft);border-radius:var(--r-md);background:var(--sunk);color:var(--ink3);margin-top:8px}
.lock b{font-size:var(--fs-sm);flex:1}
.lock small{font-size:var(--fs-xs)}
.fldh{font-weight:700;font-size:var(--fs-sm);margin:0 0 6px}
.stp{display:inline-flex;align-items:center;border:1px solid var(--ctl);border-radius:var(--r-sm);background:var(--card);overflow:hidden}
.stp i{font-style:normal;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--accent-ink)}
.stp b{min-width:36px;text-align:center}
.bl{display:grid;grid-template-columns:minmax(72px,auto) 1fr auto;gap:12px;align-items:center;margin:10px 0}
.bl .nm{font-weight:600}
.bl .tr{height:12px;border-radius:6px;background:var(--sunk);overflow:hidden}
.bl .tr i{display:block;height:100%;border-radius:6px;background:var(--bar-muted)}
.bl .tr i.w{background:var(--accent)}.bl .tr i.tie{background:var(--warn-bar)}
.bl .vv{font-size:var(--fs-sm);font-variant-numeric:tabular-nums;color:var(--ink2);white-space:nowrap}
.m .bl{grid-template-columns:1fr auto}.m .bl .tr{grid-column:1/-1;order:3}
.winc{background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--r-md);padding:12px 16px;flex:1.4}
.winc small{display:block;color:var(--accent-ink);font-size:var(--fs-xs)}
.winc b{font-size:var(--fs-2xl);color:var(--accent-ink);line-height:1.2}
`;

const CSS = BASE_CSS + EXTRA;
const FOOT = '<script>/* 靜態模擬頁，無互動 */</script>';
const page = (title, body) => `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}（模擬頁）</title>
<style>
${tokens}
${CSS}
</style></head><body><div class="doc">
${body}
</div>${FOOT}</body></html>`;

const opt = (rec, name, pros, cons) =>
  `<div class="opt ${rec ? 'rec' : ''}"><h4>${name}${rec ? '<span class="badge">建議</span>' : ''}</h4>${pros.map((p) => `<p class="pro">${p}</p>`).join('')}${cons.map((p) => `<p class="con">${p}</p>`).join('')}</div>`;

const appbarM = (on, ow = 3) => `<div class="bar"><span class="brand">問卷回饋小幫手</span><span class="sp"></span><span class="lk">↺</span><span class="lk">✎</span><span class="btn s" style="min-height:40px">⚙</span></div><div class="stepm"><i class="done">開啟問卷</i><i class="done">準備資料</i><i class="${on === 3 ? 'on' : 'done'}">${ow === 'c' ? '名額與分配' : '統計'}</i><i class="${on === 4 ? 'on' : ''}">輸出</i></div>`;
const appbarD = (on, file = '選幹部 (回覆).xlsx', c) => `<div class="bar"><span class="brand">問卷回饋小幫手</span><span class="xs">${file}</span><div class="steps"><i class="done">① 開啟問卷</i><i class="done">② 準備資料</i><i class="${on === 3 ? 'on' : 'done'}">③ ${c ? '名額與分配' : '統計'}</i><i class="${on === 4 ? 'on' : ''}">④ 輸出</i></div><span class="lk">↺ 重新開始</span><span class="lk">✎ 範本</span><span class="btn s" style="min-height:40px">⚙ 設定</span></div>`;

/* ═════════ 1. 票選統計與輸出 ═════════ */
const adv = (txt) => `<div class="card"><div class="acc"><div class="t"><b>進階設定</b><span>${txt}</span></div><span class="chev">▾</span></div></div>`;
const checkLine = `<p class="xs" style="margin:8px 0 0">✓ 沒有偵測到需要確認的投票紀錄（這不代表已排除所有投票異常）。</p>`;
const tieNote = `<div class="banner info" style="margin-top:12px;align-items:flex-start"><span style="flex:1"><b>同票：甲小明、乙小華（各 2 票）</b>　已依抽籤決定，乙小華當選。<br><span class="xs" style="color:inherit">抽籤編號 mwhn0zi8；要重現同樣結果，必須保持相同票數、候選人與抽籤設定。</span></span><span class="btn s g" style="min-height:44px">重新抽籤</span></div>`;
const bars = `<div class="bl"><span class="nm">乙小華 <span class="tag a">當選</span></span><span class="vv">2 票 · 40%</span><div class="tr"><i class="w" style="width:100%"></i></div></div>
<div class="bl"><span class="nm">甲小明 <span class="tag w">同票</span></span><span class="vv">2 票 · 40%</span><div class="tr"><i class="tie" style="width:100%"></i></div></div>
<div class="bl"><span class="nm">丙小美</span><span class="vv">1 票 · 20%</span><div class="tr"><i style="width:50%"></i></div></div>`;
const resultCard = `<div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">你推薦誰當班長？</h3><span class="row xs" style="gap:6px">當選名額 <span class="stp"><i>−</i><b>1</b><i>＋</i></span></span></div>
<div class="tiles" style="margin:12px 0 4px"><div class="tile"><small>計入票數</small><b>5</b></div><div class="winc"><small>當選</small><b>乙小華</b></div></div>
${bars}<div class="row" style="justify-content:flex-end"><span class="btn g s">下載這張圖表（JPG）</span></div>${tieNote}${checkLine}</div>`;
const voteNavD = `<div class="nav" style="flex-basis:220px"><h4 style="margin-top:0">職位</h4><div class="item on"><b>你推薦誰當班長？</b><span>乙小華（抽籤）</span></div><div class="item"><b>你推薦誰當副班長？</b><span>乙小華</span></div></div>`;
const vsM = `<div class="frame m">${appbarM(3)}<div class="pg"><h2 class="ttl">統計</h2><p class="sub">選幹部 (回覆)・共 5 筆回覆・<u>統計方法說明</u></p>
<div class="chips"><span class="chip on">你推薦誰當班長？</span><span class="chip">你推薦誰當副班長？</span></div>${resultCard}<div style="margin-top:12px">${adv('計票規則：只算最後一張 · 照算 · 保留')}</div></div><div class="actbar"><span class="btn">上一步</span><span class="btn p">前往輸出</span></div></div>`;
const vsT = `<div class="frame t">${appbarD(3)}<div class="pg"><h2 class="ttl">統計</h2><p class="sub">選幹部 (回覆)・共 5 筆回覆・<u>統計方法說明</u></p>
<div class="chips"><span class="chip on">你推薦誰當班長？</span><span class="chip">你推薦誰當副班長？</span></div>${resultCard}<div style="margin-top:12px">${adv('計票規則：只算最後一張 · 照算 · 保留')}</div></div><div class="actbar"><span class="btn">上一步</span><span class="btn p">前往輸出</span></div></div>`;
const vsD = `<div class="frame d">${appbarD(3)}<div class="pg"><h2 class="ttl">統計</h2><p class="sub">選幹部 (回覆)・共 5 筆回覆・<u>統計方法說明</u></p>
<div class="cols" style="margin-top:12px">${voteNavD}<div class="main">${resultCard}<div style="margin-top:12px">${adv('計票規則：只算最後一張 · 照算 · 保留')}</div></div></div></div><div class="actbar"><span class="btn">上一步</span><span class="btn p">前往輸出</span></div></div>`;
const vsB = `<div class="frame d">${appbarD(3)}<div class="pg"><h2 class="ttl">統計</h2><p class="sub">選幹部 (回覆)・共 5 筆回覆</p>
<div class="cols" style="margin-top:12px">${voteNavD}<div class="main">${tieNote.replace('margin-top:12px', 'margin-top:0')}<div class="card" style="margin-top:12px"><h3>你推薦誰當班長？</h3><div class="tiles"><div class="tile"><small>計入票數</small><b>5</b></div><div class="winc"><small>當選</small><b>乙小華</b></div></div>${bars}</div><div class="card"><b>需要確認的投票紀錄</b><p class="hint" style="margin:4px 0 0">沒有偵測到需要確認的票。</p></div><div class="card"><div class="row" style="justify-content:space-between"><b>當選名額</b><span class="stp"><i>−</i><b>1</b><i>＋</i></span></div></div></div></div></div><div class="actbar"><span class="btn">上一步</span><span class="btn p">前往輸出</span></div></div>`;

const sumTable = `<table class="tb"><tr><th>職位</th><th>當選</th><th>票數</th><th>備註</th></tr><tr><td>班長</td><td><b>乙小華</b></td><td>2 票（40%）</td><td><span class="tag w">同票</span> 與甲小明同票，抽籤決定</td></tr><tr><td>副班長</td><td><b>乙小華</b></td><td>3 票（60%）</td><td>—</td></tr></table>`;
const voteContent = `<div class="card"><h3>① 輸出內容</h3><p class="hint">檔案會包含每個職位的當選者、完整票數、同票處理與計票規則；不含填答者姓名。</p><div style="border:1px solid var(--line-soft);border-radius:8px;overflow:hidden">${sumTable}</div><p class="xs" style="margin-top:8px">計票規則：同一位填答者多張票只算最後一張、投給自己照算、填答時間異常保留。</p></div>`;
const voteDl = (stk) => `<div class="card ${stk || ''}"><h3>② 下載</h3><h4>票選結果</h4><div class="row nw"><span class="btn p grow">下載 Word</span><span class="btn">PDF</span><span class="btn">Excel</span></div><p class="xs" style="margin-top:8px">Word 可再編修；Excel 含完整票數。第一次產生 PDF 或 Word 可能需要載入約 5 MB 字型資源。</p></div>`;
const voAM = `<div class="frame m">${appbarM(4)}<div class="pg"><h2 class="ttl">輸出</h2><p class="sub">選幹部 (回覆)</p>${voteContent}${voteDl()}</div><div class="actbar"><span class="btn">回到統計</span></div></div>`;
const voAT = `<div class="frame t">${appbarD(4)}<div class="pg"><h2 class="ttl">輸出</h2><p class="sub">選幹部 (回覆)</p>${voteContent}${voteDl()}</div><div class="actbar"><span class="btn">回到統計</span></div></div>`;
const voAD = `<div class="frame d">${appbarD(4)}<div class="pg"><h2 class="ttl">輸出</h2><p class="sub">選幹部 (回覆)</p><div class="cols"><div class="main">${voteContent}</div><div class="side" style="flex-basis:400px">${voteDl('stk')}</div></div></div><div class="actbar"><span class="btn">回到統計</span></div></div>`;
const a4 = `<div class="thumbbox" style="--tw:220px;--s:0.2771"><div class="pg794"><div style="text-align:center;font-weight:700;font-size:30px">票選結果</div><div style="text-align:center;color:#666">選幹部 (回覆)・共 5 筆回覆</div><div style="height:20px"></div><div style="background:#9a4a00;color:#fff;padding:8px 10px">班長　當選：乙小華</div>${'<div style="padding:8px 10px;border-bottom:1px solid #eee">乙小華　2 票　40%</div><div style="padding:8px 10px;border-bottom:1px solid #eee">甲小明　2 票　40%（同票）</div><div style="padding:8px 10px;border-bottom:1px solid #eee">丙小美　1 票　20%</div>'}<div style="height:16px"></div><div style="background:#9a4a00;color:#fff;padding:8px 10px">副班長　當選：乙小華</div><div style="padding:8px 10px">…</div><div style="position:absolute;left:56px;right:56px;bottom:40px;color:#888;font-size:18px">〇〇國中 三年二班 票選結果｜第 1 頁</div></div></div>`;
const voBD = `<div class="frame d">${appbarD(4)}<div class="pg"><h2 class="ttl">輸出</h2><p class="sub">選幹部 (回覆)</p><div class="cols"><div class="main"><div class="card"><h3>① 輸出內容</h3><div class="thumbrow">${a4}<div style="flex:1"><p class="hint">這是 PDF／Word 第 1 頁的縮圖（文件頁面縮小，不是另一套畫面）。</p>${sumTable}</div></div></div></div><div class="side" style="flex-basis:400px">${voteDl('stk')}</div></div></div><div class="actbar"><span class="btn">回到統計</span></div></div>`;

const s1 = `<section class="sec" id="s1"><h2>① 票選幹部：統計頁＋輸出頁（併入 5.33 統計頁／輸出頁改版）</h2>
<p class="sub">使用者已裁示（2026-11-15）：與統計頁改版一致、輸出頁一起重新設計、同票說明句加在結果旁。稽核見 第二輪稽核 V1–V5；Issue <a href="https://github.com/derliang/survey-feedback-helper/issues/101">#101</a>。</p>
<div class="note"><h2>統計頁：改了什麼、為什麼</h2><ul>
<li><b>結果在第一屏</b>：職位用頂端選擇器（手機 chips／平板 chips／桌機左欄），選了就在正下方看到當選者與票數；「需要確認的投票紀錄」沒有可疑票時只剩一行字（✓ 沒有偵測到…），有可疑票才展開成警示卡放在結果上方。</li>
<li><b>當選者固定第一列</b>並標「當選」標籤；同票的列標「同票」（不只靠顏色）。長條圖與卡片同寬，手機字級回到 15。</li>
<li><b>同票說明直接放在結果旁</b>（使用者已裁示）：「同票：甲小明、乙小華（各 2 票）　已依抽籤決定，乙小華當選。」重寫句型（修掉「。：」標點錯誤）；內部編號縮成次要小字「抽籤編號 mwhn0zi8」，不再嵌在句子裡；「重新抽籤」留在同一個提示內。</li>
<li><b>當選名額</b>改成結果卡標題旁的小步進器（− 1 ＋），不再是一個拉滿 620 的輸入框；<b>計票規則</b>收進「進階設定」（#99 已做）。</li>
<li>沒有審稿內容的問卷，<b>不顯示「審稿進度尚未儲存」黃卡／橫幅</b>（併 #90，規範 5.33 D① 已有，這裡明確指票選與意見調查）。</li></ul></div>
<div class="note"><h2>輸出頁：改了什麼、為什麼</h2><ul>
<li>現況只有一張「統計報告」卡加三顆按鈕，看不出會輸出什麼；桌機下半全空。改成與 5.33 輸出頁同構：<b>① 輸出內容（預覽）② 下載</b>；桌機左右兩欄、右欄下載面板 sticky。</li>
<li><b>預覽</b>＝各職位當選者、票數、同票備註的摘要表，加一句「檔案包含什麼、不含什麼」；<b>下載</b>＝一顆主要「下載 Word」＋ PDF、Excel（格式選擇列：主要在最左、最寬，見 DESIGN.md 5.34 的按鈕主次裁定）。</li></ul></div>
<h3>裁示選項 1-1：統計頁同票說明與結果的關係</h3><div class="opts">
${opt(true, 'A：說明併入結果卡，當選與同票用標籤標在列上', ['第一屏就看到當選者與同票原因，不必捲動', '與其他統計頁的「結果卡」同構，好實作', '同票只用一個提示區塊，抽籤編號降為次要小字'], ['卡片稍長（多一個提示區塊）'])}
${opt(false, 'B：維持獨立的藍色資訊卡，但搬到結果最上方', ['同票是重大事件，最醒目', '提示與結果分開，改動最小'], ['結果被往下推，手機第一屏看不到票數', '資訊卡與結果卡兩層視覺'])}
</div>
<h3>裁示選項 1-2：輸出頁預覽的形式</h3><div class="opts">
${opt(true, 'A：摘要表（各職位當選者、票數、同票備註）', ['不需另寫文件縮圖，改動小', '老師要確認的就是「誰當選、同票怎麼處理」，表格最直接', '手機也好讀'], ['看不到實際文件版面'])}
${opt(false, 'B：A4 縮圖＋摘要（模擬頁最下方）', ['和個人回饋單輸出的縮圖一致', '看得到公布版長相'], ['要另寫票選文件的縮圖渲染（工作量大）；縮圖必須遵守 5.33 縮圖規則'])}
</div>
<div class="devs"><div class="dev"><h3>統計 手機 390（A）</h3>${vsM}</div><div class="dev"><h3>統計 平板 768（A）</h3><div class="scroll">${vsT}</div></div><div class="dev"><h3>統計 桌機 1280（A）</h3><div class="scroll">${vsD}</div></div><div class="dev"><h3>統計 桌機 1280（B：資訊卡置頂）</h3><div class="scroll">${vsB}</div></div></div>
<div class="devs"><div class="dev"><h3>輸出 手機 390（A）</h3>${voAM}</div><div class="dev"><h3>輸出 平板 768（A）</h3><div class="scroll">${voAT}</div></div><div class="dev"><h3>輸出 桌機 1280（A）</h3><div class="scroll">${voAD}</div></div><div class="dev"><h3>輸出 桌機 1280（B：A4 縮圖）</h3><div class="scroll">${voBD}</div></div></div></section>`;

/* ═════════ 2. 選課結果與手機面板 ═════════ */
const tile = (l, v) => `<div class="tile tilew"><small>${l}</small><b class="nw">${v}</b></div>`;
const crow = (name, cnt, pct, tags, warn) => `<div class="crow2"><div class="h"><b>${name}</b><span style="font-variant-numeric:tabular-nums"><b>${cnt}</b></span></div><div class="track ${warn ? 'warnbar' : ''}" style="margin-top:6px"><i style="width:${pct}%"></i></div><div class="tags">${tags}</div></div>`;
const cards = `${crow('微積分', '3／3', 100, '<span class="tag">已滿</span><span class="xs">第 1 志願報名 5 人</span>')}${crow('攝影社', '1／2', 50, '<span class="tag w wrap">低於最少開班（2 人），建議人工評估</span><span class="xs">第 1 志願報名 0 人</span>', true)}`;
const crPage = (w, tiles, extra = '') => `<div class="frame" style="width:${w}px">${appbarM(3, 'c')}<div class="pg" style="padding:12px">${tiles}${cards}${extra}</div></div>`;
const tilesA = `<div class="tile tilew" style="margin-bottom:8px"><small>已分配</small><b class="nw">9／12</b></div><div class="tiles">${tile('第 1 志願達成', '67%')}<div class="tile warn tilew"><small>待安排</small><b>3</b></div></div>`;
const tilesB = `<div class="card" style="padding:10px 12px;font-size:var(--fs-sm)"><b>已分配 9／12</b> · 第 1 志願達成 67% · <span class="tag w">待安排 3 人</span></div>`;
const tilesOK = `<div class="tiles">${tile('已分配', '9／12')}${tile('第 1 志願達成', '67%')}<div class="tile warn tilew"><small>待安排</small><b>3</b></div></div>`;
const rows = (list) => list.map(([n, c, tg, on]) => `<div class="orow"><span class="rd ${on ? 'on' : ''}"></span><div class="t"><b>${n}</b></div><span class="n">${c}</span>${tg ? `<span class="tag ${tg === '已滿' ? '' : 'w'}">${tg}</span>` : ''}</div>`).join('');
const optRows = rows([['微積分', '3／3', '已滿'], ['生物實驗', '3／3', '已滿'], ['地球探索', '2／2', '已滿'], ['攝影社', '1／2', '', true], ['待安排', '暫不分配', '']]);
const sheetA = `<div class="frame m"><div class="sheetm"><div class="scrim"></div><div class="sh"><div class="grab"></div><div class="hd"><b>把 01 王一 放入…</b><span class="xbtn" aria-label="關閉">✕</span></div><p class="xs" style="margin:0 0 4px">目前在待安排　·　已滿的課程移入後會超額</p>${optRows}<div class="row nw" style="margin-top:12px"><span class="btn">取消</span><span class="btn p grow">放入「攝影社」</span></div></div></div></div>`;
const sheetB = `<div class="frame m"><div class="sheetm"><div class="scrim"></div><div class="sh"><div class="grab"></div><div class="hd"><b>把 01 王一 放入…</b><span class="xbtn" aria-label="關閉">✕</span></div><p class="xs" style="margin:0 0 4px">目前在待安排</p>${optRows}<div class="row nw" style="margin-top:12px"><span class="btn p grow">放入「攝影社」</span></div></div></div></div>`;
const sheetNow = `<div class="frame m"><div class="sheetm"><div class="scrim"></div><div class="sh"><div class="grab"></div><div class="hd"><b>把 01 王一 放入…</b></div><p class="xs" style="margin:0 0 4px">目前在待安排</p>${['微積分', '生物實驗', '地球探索'].map((n, i) => `<div class="orow" style="min-height:64px"><span class="rd"></span><div class="t"><b>${n}</b><br><span class="n">${i === 2 ? '2／2' : '3／3'} · 此課程已額滿，移入後會超過名額。</span></div></div>`).join('')}<div class="row" style="margin-top:12px"><span class="btn dis" style="width:100%">請先選擇要移入的課程或「待安排」</span></div><p class="xs" style="margin-top:8px">現況：沒有可見的關閉鈕，只能點遮罩或下滑；選項說明每項兩行，五項逼近一屏。</p></div></div></div>`;
const confirmRealloc = `<div class="dlgbg"><div class="dlg" style="max-width:520px"><h3>重新分配會覆蓋手動調整</h3><p style="margin:0">你手動移動過 <b>2 位學生</b>。重新分配會依新的名額從頭計算，這些手動調整會被覆蓋，可用「復原」換回。</p><div class="ft"><span class="btn">取消</span><span class="btn p">重新分配</span></div></div></div>`;
const s2 = `<section class="sec" id="s2"><h2>② 選課分配結果：窄寬度卡片、數字磚與手機面板（Issue <a href="https://github.com/derliang/survey-feedback-helper/issues/100">#100</a>）</h2>
<div class="note"><h2>改了什麼、為什麼</h2><ul>
<li><b>課程卡的標籤</b>：標籤改成可折行（<code>white-space: normal</code>、最寬等於卡片內寬）；卡片內只寫短句「低於最少開班（2 人），建議人工評估」，完整句留在頁底既有的警示卡。標籤與卡片之間不再出現水平溢出。已滿、建議停開都仍用「文字標籤」，不只靠色。</li>
<li><b>數字磚</b>：≥ 360 維持三欄（數字不折行，<code>white-space: nowrap</code>）；&lt; 360 見選項 2-1。</li>
<li><b>手機面板</b>：標題列右側加 44×44 的「✕ 關閉」（所有底部面板統一：移到、優先名單、各確認），底部加「取消」；選項說明縮短成同一行的標籤（「3／3　已滿」），每項 52 高、五項不再逼近一屏；超額的警示改在選中後於面板內以一行 notice 呈現（現行行為），不再重複寫在每個選項裡。</li>
<li><b>重新分配前的提醒</b>（稽核沒走到的缺口：有手動移動時的行為尚未驗證）：只在<b>有手動調整時</b>才跳確認，並寫出人數與可復原；沒有手動調整就直接重分。</li></ul></div>
<h3>裁示選項 2-1：窄於 360 的數字磚</h3><div class="opts">
${opt(true, 'A：「已分配」獨佔一列，其餘兩磚並排', ['三個數字都保持大字、不折行', '最重要的「已分配 N／M」最醒目'], ['320 多佔約 70px 高'])}
${opt(false, 'B：一律改成一行摘要條', ['最省空間，320 也只有一列', '不用判斷寬度'], ['失去「數字磚」的辨識度；待安排的警示要靠標籤'])}
</div>
<h3>裁示選項 2-2：手機底部面板的關閉方式</h3><div class="opts">
${opt(true, 'A：標題列 ✕＋底部「取消」＋主按鈕（兩顆並排）', ['關閉方式明顯，單手拇指可及（底部）', '與確認視窗的按鈕順序一致（取消在左、主要在右）'], ['底部多一顆按鈕，主按鈕變窄'])}
${opt(false, 'B：只加標題列 ✕，底部只有主按鈕', ['底部維持單一主按鈕，與現況最像', '主按鈕最寬'], ['關閉鈕在畫面上方，拇指不好按'])}
</div>
<div class="devs"><div class="dev"><h3>卡片與數字磚：320（A）</h3>${crPage(320, tilesA)}</div><div class="dev"><h3>卡片與數字磚：320（B 摘要條）</h3>${crPage(320, tilesB)}</div><div class="dev"><h3>卡片與數字磚：390</h3>${crPage(390, tilesOK)}</div></div>
<div class="devs"><div class="dev"><h3>面板 現況（390）</h3>${sheetNow}</div><div class="dev"><h3>面板 A（390）</h3>${sheetA}</div><div class="dev"><h3>面板 B（390）</h3>${sheetB}</div><div class="dev" style="width:560px"><h3>重新分配的確認（有手動調整時）</h3>${confirmRealloc}</div></div></section>`;

/* ═════════ 3. 載入／錯誤／確認視窗共用元件 ═════════ */
const loadingM = `<div class="frame m">${appbarM(3)}<div class="pg"><div class="sk" style="width:40%;height:28px"></div><div class="sk" style="width:70%;margin-top:12px"></div><div class="sk" style="height:96px;margin-top:20px"></div><div class="sk" style="height:160px;margin-top:12px"></div><p class="sub" style="text-align:center;margin-top:16px" role="status">載入統計畫面…</p></div></div>`;
const errorM = `<div class="frame m">${appbarM(3)}<div class="pg"><div class="nt"><span style="font-size:22px">⚠</span><div><b>這一頁沒載入成功</b><span style="color:var(--ink2);font-size:var(--fs-sm)">可能是網路不穩，或離線時還沒存過這一頁。你的資料還在，重新載入就好。</span><div class="row" style="margin-top:12px"><span class="btn p s">重新載入</span><span class="btn s">回上一步</span></div></div></div></div></div>`;
const restartA = `<div class="dlgbg"><div class="dlg" style="max-width:480px"><h3>清除目前問卷，重新開始</h3><p style="margin:0 0 4px">重新開始會清除本次畫面中的資料。以下內容<b>還沒保存，清除後無法找回</b>：</p><ul class="lst"><li>選課分配結果（還沒下載）</li><li>審稿進度（還沒存到資料夾）</li></ul><p class="xs" style="margin:8px 0 0">資料夾裡的設定檔不會被刪除。</p><div class="ft"><span class="btn">取消</span><span class="btn d">清除並重新開始</span></div></div></div>`;
const restartA2 = `<div class="dlgbg"><div class="dlg" style="max-width:480px"><h3>清除目前問卷，重新開始</h3><p style="margin:0">要清除目前開啟的問卷嗎？資料夾裡的設定檔不會被刪除。</p><div class="ft"><span class="btn">取消</span><span class="btn d">清除並重新開始</span></div></div></div>`;
const restartB = `<div class="dlgbg"><div class="dlg" style="max-width:480px"><h3>清除目前問卷，重新開始</h3><p style="margin:0">要清除目前開啟的問卷並重新開始嗎？只會清除本次畫面中的資料，不會刪除資料夾裡的設定檔。<br><b>尚未下載的分配結果與審稿進度會一併消失。</b></p><div class="ft"><span class="btn">取消</span><span class="btn d">確定重新開始</span></div></div></div>`;
const previewD = `<div class="dlgbg"><div class="dlg" style="max-width:640px;padding:0;overflow:hidden"><div class="row nw" style="padding:16px 24px;border-bottom:1px solid var(--line-soft)"><h3 style="margin:0;flex:1">即將放入回饋單的留言</h3><span class="xbtn" aria-label="關閉">✕</span></div><div style="padding:16px 24px;max-height:340px"><div class="banner" style="align-items:flex-start"><span>程式能遮蓋名單上的姓名，但認不出綽號、名單外的人或老師與外人的名字。請逐則看過要輸出的留言，必要時先改寫。</span></div><h4 style="margin:12px 0 4px">01 王大明</h4><p class="hint">（沒有留言）</p><h4 style="margin:12px 0 4px">02 林雅婷</h4><p class="hint">（沒有留言）</p></div><div style="padding:12px 24px 16px;border-top:1px solid var(--line-soft)"><div class="ck" style="align-items:flex-start"><i style="margin-top:10px"></i><span style="padding:10px 0">我逐則看過預覽，沒有發現名單以外的人名</span></div><div class="row" style="justify-content:flex-end;margin-top:8px"><span class="btn">關閉</span><span class="btn p dis" style="background:var(--sunk);border-color:transparent;color:var(--ink3)">我看過了，可以匯出學生版</span></div><p class="xs" style="text-align:right;margin:6px 0 0">勾選後才能按「我看過了」</p></div></div></div>`;
const previewM = `<div class="frame m"><div class="sheetm" style="height:560px"><div class="scrim"></div><div class="sh" style="top:48px;display:flex;flex-direction:column"><div class="grab"></div><div class="hd"><b>即將放入回饋單的留言</b><span class="xbtn" aria-label="關閉">✕</span></div><div style="flex:1;overflow:hidden"><div class="banner" style="align-items:flex-start;font-size:var(--fs-xs)"><span>請逐則看過要輸出的留言，必要時先改寫。</span></div><h4 style="margin:12px 0 4px">01 王大明</h4><p class="hint">（沒有留言）</p></div><div class="ck" style="align-items:flex-start;margin-top:8px"><i style="margin-top:10px"></i><span style="padding:10px 0;font-size:var(--fs-sm)">我逐則看過預覽，沒有發現名單以外的人名</span></div><div class="row nw" style="margin-top:8px"><span class="btn">關閉</span><span class="btn dis grow" style="background:var(--sunk);color:var(--ink3);border-color:transparent">我看過了，可以匯出</span></div></div></div></div>`;
const s3 = `<section class="sec" id="s3"><h2>③ 載入／錯誤／確認視窗：跨頁共用元件（Issue <a href="https://github.com/derliang/survey-feedback-helper/issues/105">#105</a>、<a href="https://github.com/derliang/survey-feedback-helper/issues/107">#107</a>、<a href="https://github.com/derliang/survey-feedback-helper/issues/104">#104</a>）</h2>
<div class="note"><h2>統一的規則（寫入 DESIGN.md 5.34）</h2><ul>
<li><b>載入中</b>：延遲載入的頁面在 300ms 後仍沒好，就在原位置顯示骨架（標題條＋兩到三塊灰色卡）與一行「載入○○畫面…」（<code>role="status"</code>）；不超過 300ms 不顯示，避免閃一下。步驟列與頂端列維持不動。</li>
<li><b>載入失敗</b>：用錯誤 <code>.notice</code>（紅底、標題＋一句原因＋下一步），按鈕「重新載入」（主要，在左）＋「回上一步」（次要）；說明「你的資料還在」，因為資料都在記憶體裡。不再是一行無樣式文字。</li>
<li><b>確認視窗</b>（重新開始、重新分配、還原、刪除…共用）：寬 480（內容多時 520）、內距 24、標題 20／粗、內文 16；底部兩顆按鈕靠右，<b>取消在左、動作在右</b>；破壞性動作用 <code>danger</code>（紅外框、紅字，不用實心紅），按鈕文字寫動作本身（「清除並重新開始」），不寫「確定」。標題上方至少 24 內距（現況標題貼近上緣）。</li>
<li><b>確認內容依狀態列出會遺失什麼</b>（#105）：有沒存的東西才列清單；都沒有就只寫一句。</li>
<li><b>預覽視窗</b>（學生版／家長版輸出前）：標題列加 ✕；底部固定區放「勾選列」＋按鈕；勾選方塊與文字同一列、整列可點（≥ 44 高）；主要按鈕寫「我看過了，可以匯出學生版」（停用時旁邊寫原因「勾選後才能按」），不再是停用的「Previewed」；寬 640（桌機）、手機為近滿版的底部面板。</li></ul></div>
<h3>裁示選項 3-1：「重新開始」確認要提醒到什麼程度（#105 的提問）</h3><div class="opts">
${opt(true, 'A：依實際狀態——有沒存的分配結果／審稿進度才列清單，否則一句話', ['只在真的會遺失時才打擾；與是否選了資料夾無關（選了資料夾但還沒存的審稿同樣會遺失）', '提醒具體，老師知道會失去什麼'], ['要判斷「沒存」的條件（分配結果未下載、審稿進度未寫入資料夾）'])}
${opt(false, 'B：每次都用同一句較長的固定說明（含「尚未下載的分配結果與審稿進度會一併消失」）', ['最簡單，不用判斷狀態', '永遠有提醒'], ['沒有東西會遺失時也嚇人；老師會習慣性忽略'])}
</div>
<div class="devs"><div class="dev"><h3>載入中（390）</h3>${loadingM}</div><div class="dev"><h3>載入失敗（390）</h3>${errorM}</div></div>
<div class="devs"><div class="dev" style="width:560px"><h3>重新開始 A：有東西會遺失</h3>${restartA}<h3 style="margin-top:16px">重新開始 A：沒有東西會遺失</h3>${restartA2}</div><div class="dev" style="width:560px"><h3>重新開始 B</h3>${restartB}</div></div>
<div class="devs"><div class="dev"><h3>學生版預覽視窗 桌機（寬 640）</h3><div style="width:720px">${previewD}</div></div><div class="dev"><h3>學生版預覽視窗 手機</h3>${previewM}</div></div></section>`;

/* ═════════ 4. 英文頂列與設定區 ═════════ */
const topEn = (kind) => {
  if (kind === 'A') return `<div class="tb1"><span class="brand" style="font-size:16px">Feedback Helper</span><div class="steps" style="flex:1"><i class="done">1 Open</i><i class="done">2 Prepare</i><i class="on">3 Stats</i><i>4 Output</i></div><span class="lk">↺ Restart</span><span class="lk">✎ Templates</span><span class="btn s" style="min-height:40px">⚙ Settings</span></div>`;
  return `<div class="tb2"><div class="r1"><span class="brand">Survey Feedback Helper</span><span class="xs" style="flex:1">讀書報告回饋 (回覆).xlsx</span><span class="lk">↺ Start over</span><span class="lk">✎ Templates</span><span class="btn s" style="min-height:40px">⚙ Settings</span></div><div class="steps" style="padding:0 16px 8px"><i class="done">① Open survey</i><i class="done">② Prepare data</i><i class="on">③ Statistics</i><i>④ Output</i></div></div>`;
};
const enFrame = (w, kind) => `<div class="frame" style="width:${w}px">${topEn(kind)}<div class="pg"><h2 class="ttl">Statistics</h2><p class="sub">Presentation feedback (replies) · 6 responses</p></div></div>`;
const rail = `<div class="card" style="padding:12px;width:340px"><div class="rcard on" style="margin:0"><span class="rd" style="border-radius:50%"></span><div><b>Survey type</b><span>Please confirm</span></div></div><div class="lock"><b>Column matching</b><small>Locked</small></div><div class="lock"><b>Student roster (optional)</b><small>Locked</small></div><div class="lock"><b>Data check</b><small>Locked</small></div><p class="xs" style="margin:8px 0 0">Locked steps open once the survey type and column matching are confirmed. The roster and data check can wait.</p></div>`;
const segEn = `<div class="card" style="width:340px"><p class="fldh">Highest and lowest scores</p><div class="rcard on"><span class="rd"></span><div><b>Keep all</b><span>Use every score as entered</span></div></div><div class="rcard"><span class="rd"></span><div><b>Drop the highest and lowest</b><span>Per person rated, when 3 or more scores</span></div></div></div>`;
const segEnB = `<div class="card" style="width:340px"><p class="fldh">Highest and lowest scores</p><div class="seg"><b class="on">Keep all</b><b>Trim 1</b></div><p class="xs" style="margin:6px 0 0">Trim 1 = drop the highest and lowest score per person rated.</p></div>`;
const s4 = `<section class="sec" id="s4"><h2>④ 英文介面：頂列與統計設定區（Issue <a href="https://github.com/derliang/survey-feedback-helper/issues/103">#103</a>）</h2>
<p class="sub">現況截圖見第二輪稽核 E1–E3：品牌「Survey Feedback Helper」、檔名、步驟標籤與「Start over」同時擠在一列而折成兩行；準備資料頁左欄的鎖定卡在英文被擠成一字一行（約 5 行）；統計設定的分段控制折四行。中文介面不受影響。</p>
<div class="note"><h2>改了什麼、為什麼</h2><ul>
<li><b>頂列</b>：英文用較短的品牌名「Feedback Helper」、步驟名單詞化（Open／Prepare／Stats／Output）、「Start over」改「Restart」；檔名在英文與 &lt; 1100 寬時隱藏（檔名已在頁面標題下）。所有標籤 <code>white-space: nowrap</code>。</li>
<li><b>鎖定的步驟卡</b>（準備資料頁左欄，英文與中文一律）：鎖定時只留「名稱」一行，原因「先完成前一步」改成區塊底的一句說明（取代每張卡各一行字）；解除鎖定的卡才展開說明。同時解決中文版 S2（目前只定義手機）在桌機一樣長的問題。</li>
<li><b>分段控制適用規則</b>：2–4 項、每項標籤在容器寬度下<b>都能單行</b>才用 <code>.seg</code>；否則（英文長標籤、選項要附說明）改用單選選項卡 <code>.rcard</code> 直排。統計設定「最高最低分處理」英文即為此例。</li></ul></div>
<h3>裁示選項 4-1：英文頂列</h3><div class="opts">
${opt(true, 'A：單列、縮短文字（品牌縮短、單詞步驟、Restart）', ['與中文版同構、不增加高度', '步驟與動作一眼可見'], ['英文品牌名與步驟名要另外縮短、需審核字串'])}
${opt(false, 'B：英文時改成兩列（上：品牌＋動作；下：步驟）', ['字串可維持完整（Survey Feedback Helper、Prepare data）', '不必逐一縮短'], ['頂列高度加倍（約 96），與中文版不一致'])}
</div>
<h3>裁示選項 4-2：英文的長標籤選項</h3><div class="opts">
${opt(true, 'A：改成單選選項卡直排（附說明）', ['不受標籤長度影響，之後的語言也安全', '可附說明，英文更容易懂'], ['比分段控制高（每項約 56）'])}
${opt(false, 'B：維持分段控制，但把英文標籤縮短（Keep all／Trim 1）', ['緊湊、與中文版同構'], ['縮短後語意較難懂，要另附說明句；其他語言可能再溢出'])}
</div>
<div class="devs"><div class="dev"><h3>頂列 A：1280</h3><div class="scroll">${enFrame(1280, 'A')}</div></div><div class="dev"><h3>頂列 A：768</h3>${enFrame(768, 'A')}</div><div class="dev"><h3>頂列 B：768（兩列）</h3>${enFrame(768, 'B')}</div></div>
<div class="devs"><div class="dev"><h3>準備資料左欄：鎖定卡（A）</h3>${rail}</div><div class="dev"><h3>設定長標籤 A：選項卡</h3>${segEn}</div><div class="dev"><h3>設定長標籤 B：縮短的分段控制</h3>${segEnB}</div></div></section>`;

/* ═════════ 輸出 ═════════ */
mkdirSync('docs/design/mockups', { recursive: true });
const head = (t, d) => `<h1>${t}</h1><p>${d} 全部是虛構資料。規範見 DESIGN.md 5.34；稽核見 docs/design/逐頁版面稽核-第二輪-2026-11-15.md。</p>`;
writeFileSync('docs/design/mockups/稽核第二輪-票選統計與輸出.html', page('第二輪：票選統計與輸出', head('票選幹部：統計頁＋輸出頁', '2026-11-15 設計員第二輪，待使用者裁示。') + s1));
writeFileSync('docs/design/mockups/稽核第二輪-選課結果與面板.html', page('第二輪：選課結果與面板', head('選課分配結果：窄寬度卡片與手機面板', '2026-11-15 設計員第二輪，待使用者裁示。') + s2));
writeFileSync('docs/design/mockups/稽核第二輪-共用元件.html', page('第二輪：載入錯誤與確認視窗', head('載入／錯誤／確認視窗共用元件', '2026-11-15 設計員第二輪，待使用者裁示。') + s3));
writeFileSync('docs/design/mockups/稽核第二輪-英文頂列.html', page('第二輪：英文頂列與設定區', head('英文介面：頂列與統計設定區', '2026-11-15 設計員第二輪，待使用者裁示。') + s4));
console.log('done');
