// 產生 2026-11-16 設計員第三輪的模擬頁：手機工作頁的「資料夾狀態」可見度 A／B。
// 用法：node docs/design/build/audit-mockups-r3.mjs   （在 repo 根目錄執行）
// 元件 CSS 沿用 audit-mockups.mjs（原樣讀入），tokens 從 docs/design/tokens.css 原樣讀入。純靜態、只有虛構資料。
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
.g3{display:flex;align-items:center;gap:8px;min-height:36px;padding:0 16px;background:var(--card);border-bottom:1px solid var(--line-soft);font-size:var(--fs-sm);color:var(--ink2)}
.g3 b{color:var(--ink)}
.g3 .go{margin-left:auto;color:var(--accent-ink);font-weight:600;min-height:36px;display:flex;align-items:center}
.g3.warn{background:var(--warn-soft,var(--sunk))}
.gear{position:relative;display:inline-flex}
.gear i{position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:var(--warn-bar,var(--bad));border:2px solid var(--card)}
.body{padding:16px}
.body h2{font-size:var(--fs-xl);margin:0 0 4px}
.body p{margin:0 0 12px;color:var(--ink2);font-size:var(--fs-sm)}
.lock{display:flex;gap:10px;align-items:center;min-height:48px;padding:0 12px;border:1px solid var(--line-soft);border-radius:var(--r-md);background:var(--sunk);color:var(--ink3);margin-top:8px}
`;

const CSS = BASE_CSS + EXTRA;
const page = (title, body) => `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}（模擬頁）</title>
<style>
${tokens}
${CSS}
</style></head><body><div class="doc">
${body}
</div><script>/* 靜態模擬頁，無互動 */</script></body></html>`;

const opt = (rec, name, pros, cons) =>
  `<div class="opt ${rec ? 'rec' : ''}"><h4>${name}${rec ? '<span class="badge">建議</span>' : ''}</h4>${pros.map((p) => `<p class="pro">${p}</p>`).join('')}${cons.map((p) => `<p class="con">${p}</p>`).join('')}</div>`;

const bar = (dot) => `<div class="bar"><span class="brand">問卷回饋小幫手</span><span class="sp"></span><span class="lk">↺</span><span class="lk">✎</span><span class="gear"><span class="btn s" style="min-height:40px">⚙</span>${dot ? '<i></i>' : ''}</span></div><div class="stepm"><i class="done">開啟問卷</i><i class="on">準備資料</i><i>統計</i><i>輸出</i></div>`;
const content = `<div class="body"><h2>讀書報告回饋 (回覆)</h2><p>Excel 檔 ・ 6 筆回覆 ・ 9 欄</p><div class="lock">🔒 欄位對應　<small>請先完成前一步</small></div><div class="lock">🔒 學生名單（選用）</div><div class="lock">🔒 資料檢查</div></div>`;
const frame = (inner) => `<div class="frame m">${inner}</div>`;

const cur = frame(bar(false) + content);
const aNone = frame(bar(false) + `<div class="g3 warn"><span>📁</span><span>尚未選擇資料夾</span><span class="go">選擇</span></div>` + content);
const aOk = frame(bar(false) + `<div class="g3"><span>📁</span><span>資料夾：<b>問卷小幫手</b></span><span class="go">重選</span></div>` + content);
const bNone = frame(bar(true) + content);
const bOk = frame(bar(false) + content);

const html = `<h1>手機工作頁：資料夾狀態可見度</h1>
<p>2026-11-16 設計員第三輪，待使用者裁示。全部是虛構資料。稽核見 docs/design/逐頁版面稽核-第三輪-2026-11-16.md。</p>
<div class="note"><h2>問題</h2><ul>
<li>手機上資料夾狀態只出現在<b>首頁最底</b>；準備資料、統計、輸出等工作頁完全看不到，使用者做到一半不知道設定有沒有存。</li>
<li>桌機與平板有側欄／較寬頂列，不受影響；本案只談手機（≤ 640）。</li></ul></div>
<div class="opts">
${opt(true, 'A：頂列下方一條細狀態列（高 36）', ['已選／未選一眼可見，文字明確', '「選擇／重選」就在旁邊，一步可改', '未選時用警示底色，已選時平淡不搶戲'], ['每頁多佔 36 高（手機首屏本來就擠）', '已選資料夾的使用者每頁都看到一條沒變化的資訊'])}
${opt(false, 'B：設定按鈕右上角小圓點（僅未選資料夾時出現）', ['不佔版面；已選資料夾的使用者完全無干擾', '點開設定頁就看到資料夾卡'], ['只有一個點，不看文字的人不知道意思（要另有說明）', '已選時沒有任何確認訊號，使用者無從得知「存好了」', '顏色以外線索少，須加 aria-label 說明'])}
</div>
<h3>目前（無狀態）</h3><div class="devs"><div class="dev"><h3>現況：準備資料</h3>${cur}</div></div>
<h3>A：細狀態列</h3><div class="devs"><div class="dev"><h3>A・尚未選資料夾</h3>${aNone}</div><div class="dev"><h3>A・已選資料夾</h3>${aOk}</div></div>
<h3>B：設定圓點</h3><div class="devs"><div class="dev"><h3>B・尚未選資料夾</h3>${bNone}</div><div class="dev"><h3>B・已選資料夾（無變化）</h3>${bOk}</div></div>`;

mkdirSync('docs/design/mockups', { recursive: true });
writeFileSync('docs/design/mockups/稽核第三輪-手機資料夾狀態.html', page('第三輪：手機資料夾狀態', html));
console.log('done');
