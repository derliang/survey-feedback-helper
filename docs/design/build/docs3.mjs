import { write } from './lib.mjs';
import * as D from './doc.mjs';
const { f1, f2, pct, kpi, kpis, sh, callout, note, quote, paper, docfig } = D;

const W = [0.3, 0.25, 0.25, 0.2];
const R = ['內容完整', '創意', '表達', '團隊合作'];
const peer = [4.3, 4.0, 4.2, 4.6];     // 他評（已去最高最低）
const avg = [4.04, 3.84, 3.94, 4.17];      // 班級平均
const self = [4.5, 4.2, 4.0, 4.8];     // 自評
const score = (a) => a.reduce((s, v, i) => s + v * W[i], 0) * 20;
const S = score(peer), A = score(avg), SF = score(self);
const best = peer.map((v, i) => v - avg[i]).reduce((m, d, i, a) => (d > a[m] ? i : m), 0);
const low = peer.map((v, i) => v - avg[i]).reduce((m, d, i, a) => (d < a[m] ? i : m), 0);
const lowAbs = peer.indexOf(Math.min(...peer));

const pair = (name, p, a, s) => `<div class="pair"><div>${name}</div><div class="tr"><i style="width:${(p / 5) * 100}%"></i><u style="left:${(a / 5) * 100}%"></u>${s == null ? '' : `<em style="left:calc(${(s / 5) * 100}% - 1px)"></em>`}</div><div class="v">${f1(p)}<small>班均 ${f1(a)}</small></div></div>`;
const pairLegend = `<div class="legend"><span><i style="background:var(--blue)"></i>同學給你的分數</span><span><i style="background:transparent;border-left:2px dashed var(--doc-accent);border-radius:0;width:0;height:12px"></i>班級平均</span><span><i style="background:var(--doc-ink);width:3px;height:12px"></i>你給自己的分數</span><span>滿分 5 分</span></div>`;
const gapWord = (d) => (Math.abs(d) < 0.15 ? '看法接近' : d > 0 ? '你給得比同學高' : '同學給得比你高');

const HL = '三年二班 · 小組報告回饋';
const stu1 = paper(HL, '學生版 · 林小宇', 1, 2, `
<div class="dt"><div class="eyebrow">個人回饋單</div><h1 style="font-size:36px">林小宇 同學的回饋單</h1>
<div class="meta"><span>三年二班 6 號</span><span>小組報告：水資源（第 1 組）</span><span>共 36 位同學給你回饋</span></div></div>
<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:14px;align-items:stretch">
<div class="kpi hi" style="padding:14px 18px;justify-content:center"><div class="l" style="font-size:14px">同學給你的總分</div><div class="bignum">${f1(S)}<small style="font-size:20px;color:var(--doc-ink2);font-weight:600"> 分</small></div><div class="s" style="font-size:14px">比全班平均（${f1(A)} 分）高 <b style="color:var(--doc-accent)">${f1(S - A)} 分</b></div></div>
<div style="display:grid;gap:10px">${kpi('你給自己', f1(SF), '分', `比同學給的高 ${f1(SF - S)} 分`)}${kpi('全班平均', f1(A), '分', '滿分 100 分')}</div></div>
${callout(`<b>你的強項：${R[best]}</b>。同學給你 ${f1(peer[best])} 分，比全班平均高 ${f1(peer[best] - avg[best])} 分。繼續保持！`, true)}
${sh('每個項目的表現', '把同學給你的分數、全班平均、你自己的看法放在同一條線上。')}
${pairLegend}
<div style="display:flex;flex-direction:column;gap:12px">${R.map((r, i) => pair(`${r} <span class="note">占 ${Math.round(W[i] * 100)}%</span>`, peer[i], avg[i], self[i])).join('')}</div>
${sh('你怎麼看自己、同學怎麼看你')}
<table class="dtable"><thead><tr><th>項目</th><th class="r">你給自己</th><th class="r">同學給你</th><th>差別</th></tr></thead><tbody>
${R.map((r, i) => { const d = self[i] - peer[i]; return `<tr><td>${r}</td><td class="r">${f1(self[i])}</td><td class="r"><b>${f1(peer[i])}</b></td><td>${Math.abs(d) < 0.15 ? '<span class="pill g">看法接近</span>' : `<span class="pill">${gapWord(d)} ${f1(Math.abs(d))}</span>`}</td></tr>`; }).join('')}
</tbody></table>
`, '給學生本人');

const stu2 = paper(HL, '學生版 · 林小宇', 2, 2, `
${sh('同學的話', '匿名整理，老師看過才放進來。', '給你的回饋')}
<div style="display:flex;flex-direction:column;gap:10px">
${quote('報告條理清楚，圖表很好懂，我一看就知道你們想說什麼。', '一位同學', '<span class="pill g">優點</span> ')}
${quote('講話聲音很穩，看得出來有練習過。', '一位同學', '<span class="pill g">優點</span> ')}
${quote('分工的時候很願意幫忙，不會只做自己的部分。', '一位同學', '<span class="pill g">優點</span> ')}
${quote('可以多放一個生活裡的例子，大家會更有感覺。', '一位同學', '<span class="pill">建議</span> ')}
${quote('有一頁字有點多，可以改成重點加圖片。', '一位同學', '<span class="pill">建議</span> ')}
</div>
${sh('你在小組裡的貢獻', '小組成員互相評分的結果。')}
<div class="card" style="gap:10px"><div class="pair" style="grid-template-columns:90px 1fr 110px"><div>你</div><div class="tr"><i style="width:${24 * 2.5}%;background:var(--doc-accent)"></i><u style="left:${20 * 2.5}%"></u></div><div class="v">24%<small>平均每人 20%</small></div></div>
${note('小組共 5 人，平均每人 20%。同學認為你在這次報告中做了比平均更多的事。（虛線是平均）')}</div>
<div class="callout g" style="padding:14px 16px"><b>老師的話</b><div style="margin-top:4px;font-size:15px;line-height:1.7">小宇，這次報告看得出你很用心，也很願意照顧組員。下次試著把一個生活例子放進去，讓報告更有說服力。老師很期待你的下一次發表！</div></div>
${sh('下一步可以試試')}
<div class="callout" style="font-size:15px;line-height:1.7">
<b>可以再進步的項目：${R[lowAbs]}</b>（同學給你 ${f1(peer[lowAbs])} 分，比全班平均高 ${f1(peer[lowAbs] - avg[lowAbs])} 分，但是你四個項目裡最低的）。<br>
下次準備時，可以先想：「我有沒有一個沒人想過的點子？」再用同學建議的「生活例子」把它說清楚。</div>
`, '給學生本人');

// ---- 家長版 ----
const par = paper('三年二班 · 小組報告回饋', '家長版 · 林小宇', 1, 1, `
<div class="dt"><div class="eyebrow">給家長的回饋</div><h1 style="font-size:34px">林小宇 同學的小組報告回饋</h1>
<div class="meta"><span>三年二班</span><span>小組報告：水資源</span><span>2026/10/30</span></div></div>
${callout(`<b>老師的總評</b><div style="margin-top:4px;font-size:16px;line-height:1.7">小宇在這次報告中表現很好，總分 ${f1(S)} 分，高於全班平均（${f1(A)} 分）。同學特別肯定他的「${R[best]}」，也建議可以再多舉生活中的例子。</div>`, true)}
${kpis([kpi('總分', f1(S), '分', '滿分 100 分', true), kpi('全班平均', f1(A), '分', '全班 8 組平均'), kpi('給回饋的同學', 36, '位', '全班同學互相評分'), kpi('小組貢獻', 24, '%', '小組 5 人，平均 20%')])}
${sh('四個項目的表現', '藍色是同學給的分數，虛線是全班平均。')}
<div style="display:flex;flex-direction:column;gap:12px">${R.map((r, i) => pair(r, peer[i], avg[i], null)).join('')}</div>
<div class="cols2">
<div class="card"><h3 style="font-size:16px">孩子的優點</h3><ul class="finds"><li><div>報告條理清楚，圖表容易懂。</div></li><li><div>說話穩定，願意幫助組員。</div></li></ul></div>
<div class="card"><h3 style="font-size:16px">可以再加強</h3><ul class="finds"><li><div>多放一個生活中的例子。</div></li><li><div>簡報文字可以再精簡。</div></li></ul></div>
</div>
${note('怎麼看這份回饋：同學用 1 到 5 分評分，系統去掉最高與最低各一筆後平均，再按項目比重換算成 100 分。留言為匿名整理，不會顯示是哪位同學說的。')}
`, '給家長');

// ---- 方法說明頁 ----
const sec = (t) => `<tr><td colspan="2" style="background:var(--doc-accent-soft);font-weight:700;color:var(--doc-accent);padding:5px 8px;font-size:12.5px;letter-spacing:.06em">${t}</td></tr>`;
const row = (a, b) => `<tr><td style="width:170px;font-weight:600;vertical-align:top">${a}</td><td>${b}</td></tr>`;
const method = paper('三年二班 · 小組報告回饋', '統計方法說明', 1, 1, `
<div class="dt"><div class="eyebrow">附錄</div><h1 style="font-size:30px">統計方法說明</h1>
<div class="meta"><span>讓這份報告的每個數字都有出處，也能重新算出一樣的結果。</span></div></div>
<table class="dtable tight" style="font-size:13px"><tbody>
${sec('資料來源')}
${row('檔案', '小組報告互評_三年二班.xlsx（Google 表單匯出）')}
${row('回覆筆數', '41 筆；每位同學為 7 個小組評分（不評自己的組）')}
${row('欄位對應', '評分者＝姓名；被評對象＝組別；4 個評分項目＝量表 1–5；留言＝開放題')}
${sec('納入與排除')}
${row('排除的資料', '重複填答 1 筆（保留最後一筆，老師已確認）；空白留言不計入留言則數')}
${row('去極端值', '每個被評對象去除最高、最低各 1 筆評分後再平均')}
${row('名單對照', '41 位填答者皆在名單內；1 位同學未填')}
${sec('計算方式')}
${row('項目平均', '各評分者給分的算術平均（已去極端）')}
${row('加權總分', '(內容完整 × 30% ＋ 創意 × 25% ＋ 表達 × 25% ＋ 團隊合作 × 20%) × 20，換算為 100 分')}
${row('自評落差', '自評總分 − 他評總分；正數表示自評較高，超過 5 分標示提醒')}
${row('標準差', '樣本標準差（分母 n − 1）；數字越大代表評分越分歧')}
${row('4–5 分比例', '選 4 分或 5 分的人數 ÷ 回答人數（意見調查類）')}
${row('複選題比例', '人數 ÷ 回收人數，所以加總可能超過 100%')}
${sec('設定與可重現性')}
${row('評分量表標籤', '1 非常不同意、2 不同意、3 普通、4 同意、5 非常同意；沒有反向計分題')}
${row('抽籤隨機種子', '20261012-3A7F（票選同票時使用）')}
${row('留言主題分組', '關鍵詞清單由老師設定，共 5 個主題；斷詞與計次在瀏覽器離線完成，不使用 AI 或外部服務')}
${row('可重現', '使用相同的檔案、欄位對應與設定，會得到完全相同的結果。設定檔可從「設定」匯出保存')}
${sec('提醒')}
${row('樣本數', '各組人數少時，差異可能來自隨機變動，請當作討論起點')}
${row('個資', '本文件含學生資料。系統沒有上傳任何資料；請依學校個資保護規範保管與銷毀')}
</tbody></table>
`, '產生於 2026/10/30，問卷回饋小幫手 v0.2');

write('paper-stu1.html', [stu1.replace(/^<div class="scale"[^>]*>/, '').replace(/<\/div>$/, '')]);
write('frag-doc-student.html', [
  docfig(stu1 + stu2, '個人回饋單：學生版（2 頁）', [
    '<b>第一眼是答案</b>：總分、對全班平均的差距、一句鼓勵，一屏就懂。',
    '<b>一條線看三件事</b>：同學給的分、全班平均（虛線）、自己給自己的分（黑線），落差一目了然。',
    '<b>用「你」說話</b>：「你的強項」「下一步可以試試」，語氣親切，不用統計術語。',
    '<b>強項與待加強由資料決定</b>：最高於班均的項目稱讚、四項中最低的項目建議，老師可改寫。',
    '<b>留言匿名且經老師審稿</b>：優點與建議分開標示；小組貢獻只顯示自己，不顯示其他組員。',
    '教師版另含：排名、原文與評分者名單、各項目標準差；學生版不顯示排名。',
  ]),
]);
write('frag-doc-parent.html', [
  docfig(par, '個人回饋單：家長版（1 頁）', [
    '<b>一頁看完</b>：老師的總評放最上面，接著 4 個數字、四項表現、優點與可加強。',
    '<b>不含排名、不含原文留言</b>：只放整理過的優點與建議，避免比較與誤會。',
    '<b>字級較大、用詞白話</b>：總評 16px（12pt）起，底部說明分數怎麼來。',
    '總評句由模板加資料產生，老師可改寫；列印黑白也看得出差別，所有數字都標在圖旁。',
  ]),
]);
write('frag-doc-method.html', [
  docfig(method, '統計方法說明頁（附錄，1 頁）', [
    '<b>每份輸出的最後一頁</b>，可選擇是否附上。',
    '<b>讓數字有出處</b>：資料來源、排除了什麼、怎麼算、設定值，一頁寫清楚。',
    '<b>可重現</b>：記錄抽籤種子與設定，下學期用同樣檔案與設定能得到一樣的結果。',
    '<b>誠實提醒</b>：樣本少的警語與個資保管，放在最後。',
    '<b>不使用 AI</b>：留言分組是老師設定的關鍵詞，離線計算。',
  ]),
]);
console.log('S', f1(S), 'A', f1(A), 'SF', f1(SF), 'best', R[best], 'low', R[lowAbs]);
