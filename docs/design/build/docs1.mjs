import { write } from './lib.mjs';
import * as D from './doc.mjs';
const { Q, f1, f2, pct, stats, lkrow, legend, hbar, kpi, kpis, finds, sh, quote, callout, note, kw, heat, paper, docfig, lk } = D;

const S = Q.map(([q, d]) => ({ q, d, ...stats(d) }));
const all = S.reduce((a, s) => a + s.mean, 0) / S.length;
const top2all = S.reduce((a, s) => a + s.d[3] + s.d[4], 0) / (41 * S.length);
const best = S[0], worst = S[S.length - 1];
const below4 = S.filter((s) => s.mean < 4);

const HL = '三年二班 · 期中班級活動滿意度調查';
const RT = '教師版 · 班級報告';
const T = 3;

// ---- 第 1 頁：摘要 ----
const p1 = paper(HL, RT, 1, T, `
<div class="dt"><div class="eyebrow">班級報告 · 意見調查</div><h1>期中班級活動滿意度調查</h1>
<div class="meta"><span>三年二班</span><span>填答期間 2026/10/12–10/14</span><span>產生日期 2026/10/30</span></div></div>
${kpis([
    kpi('回收率', '97.6', '%', '41／42 人填答，1 人未填', true),
    kpi('整體平均', f2(all), '／5', `${S.length} 題量表題的平均`),
    kpi('4–5 分比例', Math.round(top2all * 100), '%', '同意與非常同意的合計'),
    kpi('開放留言', 28, '則', '41 人中有 28 人留言'),
  ])}
${sh('重點發現', '由統計結果自動整理，數字都可在後面頁面找到。')}
${finds([
    `<b>「${best.q}」最高</b>，平均 ${f2(best.mean)}，${Math.round(best.top2 * 100)}% 的同學選 4 分以上。`,
    `<b>「${worst.q}」最低</b>，平均 ${f2(worst.mean)}，只有 ${Math.round(worst.top2 * 100)}% 選 4 分以上，也有 ${Math.round(worst.low2 * 100)}% 選 1–2 分。`,
    `<b>${below4.length} 題平均低於 4 分</b>：${below4.map((s) => `「${s.q}」`).join('、')}。`,
    `<b>最喜歡的活動是闖關遊戲</b>（15 人，37%）；<b>開放留言最常提到戶外活動</b>（11 則）。`,
  ])}
${sh('量表題總覽', '1 分到 5 分的分布，依平均由高到低。數字是人數百分比。')}
${legend()}
<div style="display:flex;flex-direction:column;gap:12px">${S.map((s) => lkrow(s.q, s.d)).join('')}</div>
${note('右欄為平均分數與 4–5 分的比例。回覆人數每題皆為 41 人，沒有跳答。逐題的中位數與標準差見第 2 頁。')}
`);

// ---- 第 2 頁：逐題、單選複選、交叉 ----
const rows = [...S].sort((a, b) => b.mean - a.mean);
const gcols = ['說明', '內容', '表達', '推薦', '時間', '場地'];
const gv = [[4.6, 4.4, 4.3, 4.4, 4.0, 3.5], [4.4, 4.3, 4.0, 4.1, 3.9, 3.2], [4.3, 4.6, 4.4, 4.3, 4.1, 3.9], [4.7, 4.3, 4.1, 3.9, 3.7, 3.0], [4.3, 4.1, 4.0, 4.1, 3.9, 3.4], [4.5, 4.5, 4.3, 4.2, 4.1, 3.7]];
const gn = [7, 7, 7, 7, 7, 6];
const p2 = paper(HL, RT, 2, T, `
${sh('逐題統計', '平均看整體高低，標準差看意見是否分歧：數字越大，同學的看法越不一致。', '量化')}
<table class="dtable"><thead><tr><th>題目</th><th class="r">平均</th><th class="r">中位數</th><th class="r">標準差</th><th class="r">4–5 分</th><th class="r">1–2 分</th></tr></thead><tbody>
${rows.map((s, i) => `<tr class="${i === 0 || i === rows.length - 1 ? 'hl' : ''}"><td>${s.q}${i === 0 ? ' <span class="pill g">最高</span>' : i === rows.length - 1 ? ' <span class="pill">最低</span>' : ''}</td><td class="r"><b>${f2(s.mean)}</b></td><td class="r">${s.med}</td><td class="r">${f2(s.sd)}</td><td class="r">${Math.round(s.top2 * 100)}%</td><td class="r dim">${Math.round(s.low2 * 100)}%</td></tr>`).join('')}
</tbody></table>
<div class="cols2">
<div class="card"><h3 style="font-size:15px">最喜歡的活動 <span class="note">單選，41 人</span></h3>
${hbar('闖關遊戲', 15, 41, 'o')}${hbar('戶外寫生', 12, 41)}${hbar('分組競賽', 9, 41)}${hbar('影片欣賞', 5, 41)}</div>
<div class="card"><h3 style="font-size:15px">希望增加的活動 <span class="note">複選，比例以 41 人為基準</span></h3>
${hbar('戶外參訪', 26, 41, 'o')}${hbar('手作課', 19, 41)}${hbar('桌遊', 17, 41)}${hbar('運動會', 14, 41)}${hbar('其他', 3, 41)}</div>
</div>
${sh('交叉分析：各小組的平均分數', '顏色越深分數越高。看哪一組在哪一題的感受和全班不同。')}
${heat(['第 1 組', '第 2 組', '第 3 組', '第 4 組', '第 5 組', '第 6 組'], gcols, gv, gn)}
${callout('<b>場地是各組的共同弱項</b>：第 2、4 組只有 3.2 與 3.0，低於全班的 3.44。每組只有 6–7 人，差異可能是隨機造成的，請當作討論的起點，不要當成定論。')}
`);

// ---- 第 3 頁：質化 ----
const p3 = paper(HL, RT, 3, T, `
${sh('開放題：其他想說的話', '28 則留言。依老師設定的關鍵詞分組，一則留言可以屬於多個主題。', '質化')}
<div class="card" style="gap:10px"><h3 style="font-size:15px">主題分組 <span class="note">比例以 28 則為基準</span></h3>
${hbar('戶外活動', 11, 28, 'o', '則')}${hbar('時間安排', 7, 28, '', '則')}${hbar('場地與天氣', 6, 28, '', '則')}${hbar('分組與合作', 6, 28, '', '則')}${hbar('老師說明', 4, 28, '', '則')}</div>
<div class="card"><h3 style="font-size:15px">常出現的詞</h3>
${kw([['戶外', 9, true], ['分組', 7, true], ['時間', 7, true], ['太熱', 4], ['午休', 3], ['老師', 3], ['討論', 3], ['闖關', 2], ['教室', 2], ['遊戲', 2]])}
${note('字越大、數字（次數）越高。詞由系統斷詞計算，在你的瀏覽器離線完成。')}</div>
${sh('代表留言', '每個主題挑最具代表的一則，依主題排列。完整原文在 Excel 的「留言」工作表。')}
<div class="cols2" style="gap:10px">
${quote('希望下次可以去校外參觀，不要只在教室。', '', '<span class="pill">戶外活動</span> ')}
${quote('分組時間有點短，討論到一半就被打斷。', '', '<span class="pill b">時間安排</span> ')}
${quote('操場太熱了，建議早上辦。', '', '<span class="pill n">場地與天氣</span> ')}
${quote('同組的人都很願意幫忙，我覺得很開心。', '', '<span class="pill g">分組與合作</span> ')}
${quote('老師講解很清楚，闖關規則一看就懂。', '', '<span class="pill n">老師說明</span> ')}
${quote('希望可以有更多手作的活動。', '', '<span class="pill">戶外活動</span> ')}
</div>
${callout('<b>量化與質化互相印證</b>：場地平均最低（' + f2(worst.mean) + '），留言也有 6 則提到場地與天氣，主要是「太熱」。', true)}
`);

const cap1 = docfig(p1, '第 1 頁：摘要，一眼看完整體', [
  '<b>四個數字先看</b>：回收率告訴你資料可不可信，整體平均與 4–5 分比例是結論。',
  '<b>重點發現由資料產生</b>：最高、最低、低於 4 分的題目，不用老師自己翻表找。',
  '<b>堆疊百分比條</b>：顏色從橘（不同意）到藍（同意），比只看平均更看得出分歧。每段標出百分比。',
  'Word：圖表轉成圖片，卡片的圓角改直角，其餘一致。',
]);
const cap2 = docfig(p2, '第 2 頁：逐題與交叉，找出差異', [
  '<b>平均＋中位數＋標準差</b>：平均相同的兩題，標準差大的那題意見較分歧。',
  '<b>單選與複選並排</b>：單選以人數為 100%，複選以回收人數為基準，不會加總超過 100%，圖上寫明。',
  '<b>交叉分析用顏色深淺</b>：小組人數少時加警語，避免過度解讀。',
  '<b>最高與最低列底色提示</b>，印成黑白也能靠「最高／最低」標籤看出來。',
]);
const cap3 = docfig(p3, '第 3 頁：質化，把留言變成可讀的重點', [
  '<b>先看主題與次數，再讀代表留言</b>：28 則留言不用逐則讀。',
  '<b>不使用 AI</b>：分組來自老師可自訂的關鍵詞，斷詞與計次都在瀏覽器離線完成，結果可重現。',
  '<b>代表留言只放匿名內容</b>，不附姓名。教師版另可附原文清單。',
  '<b>量化與質化互相印證</b>放在頁尾，提醒老師兩邊要一起看。',
]);
write('frag-doc-survey.html', [cap1, cap2, cap3]);
console.log('mean', f2(all), 'top2', Math.round(top2all * 100), 'best', best.q, f2(best.mean), 'worst', worst.q, f2(worst.mean), 'below4', below4.length);
