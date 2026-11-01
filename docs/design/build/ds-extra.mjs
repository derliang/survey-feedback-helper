// 設計系統成品頁：第四輪（2026-11-01）新增與更新的元件（R-004、R-019、R-029、5.20、5.21、擋下非 Gmail 帳號）
// 由 ds.mjs 匯入；格式同 ds.mjs 的 C 陣列：[名稱, 群組, 預覽高度, 一句說明, 使用指引, 預覽 HTML]
import { ic, tag } from './lib.mjs';
import { msteps } from './m2kit.mjs';
import { chooser } from './acctkit.mjs';

const stack = (...x) => `<div style="display:flex;flex-direction:column;gap:12px;padding:16px;max-width:420px">${x.join('')}</div>`;

export const stepper = ['Stepper', '導覽', 96,
  '四段數字步驟列：1 開啟問卷、2 準備資料、3 統計、4 輸出（R-004、R-034、R-037）。',
  '已完成＝藍底勾，目前＝強調色字，未到＝灰框數字；每一步都點得進去。「N／4」完成度依實際狀態計算，不是固定值，選用項目（學生名單）跳過也算完成。桌機用 `.ds` 按鈕版，手機用 `.stepper` 分段版。',
  msteps(3, [1, 2])];

const rv = (kind, tone, text, flag, pressed) => `<div class="rv${flag ? ' flag' : ''}"><div class="tx">${tag(kind, tone)} ${text}${flag ? ' ' + tag('含關鍵字', 'bad') : ''}</div><div class="ac"><button type="button" aria-label="採用" aria-pressed="${pressed}">${ic('check')}</button><button type="button" aria-label="隱藏" aria-pressed="false">${ic('eye-off')}</button><button type="button" aria-label="改寫">${ic('pencil')}</button></div></div>`;
const chartRow = ([icon, name, use, on, def]) => `<div class="qrow" style="min-height:64px"><span class="chk" data-on="${on}">${on ? ic('check') : ''}</span><span style="color:var(--accent-ink)">${ic(icon)}</span><div style="flex:1;min-width:0"><b>${name}</b> ${def ? tag('預設', 'accent') : ''}<div class="small muted" style="font-weight:400">${use}</div></div></div>`;

export const extra = [
  ['AccountChooser', '資訊', 560,
    '選帳號示意圖：Gmail 一列「✓ 選這個」，學校帳號與用其他信箱註冊的 Google 帳號各一列「✕ 不要選」，最後一列「使用其他帳戶」。',
    '用在兩處：①開 Google 視窗之前的「選帳號前先看一下」；②擋下畫面與教學。擋下時用 `chooser(\'school\')` 標出「你剛才選的」。只有 @gmail.com 結尾能用，其餘一律擋下、不設「仍要繼續」。自畫示意，不是 Google 截圖；「使用其他帳戶」字樣尚未核對，圖上標「字樣待核對」。程式在 `docs/design/build/acctkit.mjs`。',
    stack(chooser(), chooser('school'))],
  ['ChartPicker', '選擇', 400,
    '圖表勾選清單：十一種圖，每種附縮圖與一句用途（R-017、R-018、R-029）。',
    '統計畫面的「圖表」按鈕開啟，桌機是側欄，手機與平板是面板。只列這份資料適用的圖；各統計的預設圖標「預設」。勾選存在設定、不含資料。每張圖右上另有「換圖」「隱藏」。',
    stack(...[['bars', '長條圖', '看每個選項各有多少票（票選預設）', true, true], ['bars', '堆疊橫條', '看量表各分數的比例（量表預設）', true, true], ['trend', '折線圖', '看同一班歷次的變化', false, false], ['table', '熱圖', '看兩個問題交叉後哪一格最多', false, false]].map(chartRow))],
  ['ReviewRow', '列表', 220,
    '審稿意見單行列：標籤與文字（最多兩行省略）在左，「採用／隱藏／改寫」三個 44px 圖示鈕在右（R-019）。',
    '圖示鈕一定有 aria-label，選取狀態用強調淡底加 `aria-pressed`。含關鍵字的列加 `flag`（警示外框）與錯誤標籤。桌機與平板可改成文字鈕。class 是 `rv`。',
    stack(rv('優點', 'ok', '投影片的圖表很清楚，舉例也很好懂。', false, true), rv('建議', 'warn', '有時候講太快，後面聽不太懂。', true, false))],
];
