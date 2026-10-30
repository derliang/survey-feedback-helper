import { write } from './lib.mjs';
import * as D from './doc.mjs';
const { Q, f2, hbar, kpi, kpis, finds, quote, callout, note, kw, heat, lk, lkrow, legend } = D;

const blk = (name, word, sample, use) =>
  `<div class="doc-warm blk"><div class="bh"><b>${name}</b><span class="wordtag" style="margin:0">Word：${word}</span></div>${sample}<p class="note">${use}</p></div>`;
const stripe = `<div style="height:64px;border-radius:8px;border:1px dashed var(--doc-ink2);background:repeating-linear-gradient(135deg,transparent 0 8px,#efe8dc 8px 10px);display:grid;place-items:center;font:12px var(--font-mono);color:var(--doc-ink2)">校名 Logo／圖片（寬 20–60mm）</div>`;

const blocks = [
  blk('頁首與頁尾', '原生頁首頁尾', `<div class="ph"><span>三年二班 · 期中班級活動滿意度調查</span><span>教師版 · 班級報告</span></div><div class="ph" style="border:0;border-top:1px solid var(--doc-line);padding:10px 0 0"><span>問卷回饋小幫手 · 含學生資料，請依學校規範保管</span><span>第 1／3 頁</span></div>`, '左班級與問卷名稱、右版本；頁尾固定有頁碼與保管提醒。校名 Logo 可放頁首左側。'),
  blk('標題區', '一致', `<div class="dt"><div class="eyebrow">個人回饋單 · 報告回饋</div><h1 style="font-size:26px">給 林小宇 的回饋</h1><div class="meta"><span>三年二班 6 號</span><span>第 3 組報告</span></div></div>`, '小標籤、標題、後設資料三層。標題可用變數 {姓名} {班級}。'),
  blk('摘要數字列', '表格取代卡片', kpis([kpi('他評總分', '85.2', '分', '班級平均 78.9', true), kpi('自評', '87.6', '分', '比他評高 2.4'), kpi('評分人數', 36, '人', '已去最高最低'), kpi('排名區間', '前 20', '%', '僅教師版顯示')]), '2 到 4 個數字，第一個用強調底。每個數字都有標籤與一行說明。Word 以無框表格呈現，圓角改直角。'),
  blk('重點發現', '一致', finds(['<b>老師說明清楚</b>最高，平均 4.46。', '<b>活動場地舒適</b>最低，只有 51% 選 4 分以上。']), '由統計自動產生句子，可在編輯器改寫或隱藏。'),
  blk('量表分布條', '轉為圖片', `${legend()}${lkrow('活動內容有趣', Q[1][1])}${lkrow('活動場地舒適', Q[5][1])}`, '橘到藍的堆疊百分比條，右側平均與 4–5 分比例。顏色之外每段都標數字，黑白列印可讀。'),
  blk('長條圖（單選、複選）', '轉為圖片', `${hbar('戶外參訪', 26, 41, 'o')}${hbar('手作課', 19, 41)}${hbar('桌遊', 17, 41)}`, '名稱、長條、人數與百分比同列。複選以回收人數為基準並寫明，不會超過 100%。'),
  blk('統計表', '原生表格', `<table class="dtable"><thead><tr><th>題目</th><th class="r">平均</th><th class="r">標準差</th></tr></thead><tbody><tr class="hl"><td>老師說明清楚</td><td class="r"><b>4.46</b></td><td class="r">0.67</td></tr><tr><td>活動內容有趣</td><td class="r"><b>4.37</b></td><td class="r">0.80</td></tr></tbody></table>`, '表頭粗線、列細線、數字靠右等寬。最高最低列底色加文字標籤。可跨頁，表頭重複。'),
  blk('交叉熱圖', '轉為圖片', heat(['第 1 組', '第 2 組'], ['說明', '場地'], [[4.6, 3.5], [4.4, 3.2]], [7, 7]), '顏色越深分數越高，格內一定寫數字。人數少於 8 人的列要加「僅供參考」。'),
  blk('他評對照條', '轉為圖片', `<div class="pair"><div>內容完整</div><div class="tr"><i style="width:86%"></i><u style="left:80%"></u><em style="left:90%"></em></div><div class="v">4.3<small>班均 4.0</small></div></div><p class="note" style="margin-top:-4px">藍條＝同學評分，虛線＝班級平均，黑線＝自評。</p>`, '個人回饋單用。一條線同時看到自己、同學、全班，一眼看出落差。'),
  blk('主題與關鍵詞', '一致', `${kw([['戶外', 9, true], ['分組', 7, true], ['太熱', 4], ['午休', 3]])}`, '開放題用。詞越大次數越多，後面標次數。離線斷詞，結果可重現。'),
  blk('留言卡', '無框段落', quote('報告條理清楚，圖表很好懂。', '同學的話（匿名）', '<span class="pill g">優點</span> '), '經老師審稿採用的留言。有「優點」「建議」兩種標籤，預設匿名。'),
  blk('老師評語', '一致', callout('<b>老師的話</b><br>這次報告看得出你很用心，圖表也整理得很清楚。下次可以多放一個實際例子。', true), '綠色底區塊，位置固定在個人回饋單頁尾之前。可用變數與老師預設範本。'),
  blk('提示框', '底色段落', callout('<b>同票處理</b>：李冠廷與吳承翰同為 10 票，已以種子 20261012-3A7F 抽籤。'), '用於說明、警語、統計方法的備註。強調淡底，不依賴顏色，一定有文字標題。'),
  blk('圖片與 Logo', '原生圖片', stripe, '校名 Logo 或老師放入的圖片，可設寬度與對齊；預設放頁首。不內嵌個資照片。'),
  blk('分隔線與分頁', '一致', `<hr class="divider"><p class="note" style="text-align:center">── 分頁符號（編輯器內顯示，輸出時換頁） ──</p>`, '分隔線 1px 暖灰；手動分頁在編輯器中以虛線標示。'),
];

const intro = `<figure class="docfig" style="flex-direction:column;align-items:stretch"><div class="blkgrid">${blocks.join('')}</div></figure>
<figure class="docfig"><figcaption style="max-width:none;flex-basis:100%"><b>頁面與排版規格</b><ul>
<li><b>紙張</b>：A4 直式（210 × 297 mm）；上下左右邊界約 14 mm、頁尾區 20 mm。編輯器可改頁面大小與邊界。</li>
<li><b>字級（列印）</b>：標題 24 pt、區段標題 15 pt、內文 11–12 pt、表格 10 pt、註解 9 pt。個人回饋單（給學生與家長）內文用 12 pt，教師版報告的表格用 10 pt，註解不低於 9 pt。</li>
<li><b>字型</b>：PDF 用內嵌的 Noto Sans TC 子集；Word 用系統字型（微軟正黑體／PingFang TC），版面可能與 PDF 有細微差異。</li>
<li><b>色彩</b>：紙張暖白、文字深褐、強調琥珀、稱讚綠；圖表用藍（同意、領先）與橘（不同意、需注意）。彩色與黑白列印都要讀得出來，所以每個圖形旁一律標數字。</li>
<li><b>Word 標示</b>：圓角、陰影、堆疊條與熱圖在 Word 會轉成圖片或直角；編輯器內對不支援的效果顯示「Word：轉為圖片／直角」標籤（如上圖右上角）。</li>
<li><b>三種版本</b>：教師版（完整、含原文）、學生版（匿名彙整、不含他人姓名）、家長版（精簡一頁、不含排名與原文）。同一份範本，條件顯示決定哪些區塊出現。</li>
</ul></figcaption></figure>`;
write('frag-doc-blocks.html', [intro]);
