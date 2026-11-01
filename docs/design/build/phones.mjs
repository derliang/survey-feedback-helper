// 手機畫面總表（第二輪）：舊畫面（整理過用語、步驟列與頂端列）＋新畫面（batch31–33），依使用順序分組。
// mk.mjs 與 batch34.mjs（平板）都從這裡取畫面，所以手機與平板一定一一對應。
import fs from 'node:fs';
import * as K from './m2kit.mjs';
const sp = K.sp;
const rd = (f) => fs.readFileSync(`${sp}/${f}`, 'utf8');
const pages = JSON.parse(rd('pages.json'));
const OLD = { core: 'frag-core.html', 'flow-data': 'frag-b4.html', 'flow-stats': 'frag-b5.html', 'flow-out': 'frag-b6.html', 'flow-edit': 'frag-b7.html', 'flow-tpl': 'frag-b9.html', 'flow-drive': 'frag-b10.html', 'flow-guard': 'frag-b11.html', 'flow-sys': 'frag-b12.html' };
// 被第二輪新畫面取代的舊畫面（頁面代號:編號）
const DROP = new Set(['core:1', 'core:2a', 'core:4', 'flow-data:1b', 'flow-data:1c', 'flow-data:1d', 'flow-data:2', 'flow-data:2a', 'flow-data:2b', 'flow-data:3a', 'flow-data:3b', 'flow-stats:5c', 'flow-stats:5d', 'flow-stats:5h', 'flow-out:6a', 'flow-out:6b', 'flow-out:6c', 'flow-tpl:9a', 'flow-tpl:9e', 'flow-drive:10a', 'flow-drive:10b', 'flow-drive:10c', 'flow-drive:10d', 'flow-guard:11f', 'flow-sys:12d', 'flow-sys:12f']);
const oldFigs = {};
for (const [id, f] of Object.entries(OLD)) for (const fig of K.figsOf(rd(f))) oldFigs[`${id}:${K.keyOf(fig)}`] = K.patchOld(fig);
const newFigs = {};
for (const f of ['frag-b31.html', 'frag-b32.html', 'frag-b33.html']) for (const fig of K.figsOf(rd(f))) newFigs[`new:${K.keyOf(fig)}`] = fig;

// 分組（每個值是畫面代號清單，順序即使用順序）
export const PHONE_SECS = [
  { id: 'p-open', title: '開啟問卷、資料夾與 Google', intro: '第 1 步。首頁（雙欄在手機改上下排）、選來源、讀取中、讀不到檔案、瀏覽器過舊、手機不能自動存資料夾、認得讀過、重新開始，與 Google 試算表直讀。', keys: ['new:H1', 'new:1b', 'new:1c', 'new:1d', 'flow-data:1e', 'new:E3', 'new:E4', 'new:E5', 'new:Gd1', 'new:Gd2', 'new:Gd3'] },
  { id: 'p-help', title: '教學：匯出與私人 Gmail', intro: '匯出成 Excel 檔（用字照 Google 介面核對紀錄）、偵測到學校帳號時的擋下畫面與「怎麼改用私人 Gmail 登入」（Google 視窗字樣待核對）、Google 表單設計技巧。', keys: ['new:G1', 'new:G2', 'new:S1', 'new:S2', 'flow-out:9'] },
  { id: 'p-prep', title: '準備資料', intro: '第 2 步。四件事固定順序並解鎖、問卷類型、欄位對應（可改名、沒用的欄收起來）、名單（同一班／混班）、名單對照、量表與權重、資料檢查。', keys: ['new:2', 'new:2a', 'new:2b', 'core:2b', 'new:3a', 'new:3b', 'flow-data:3c', 'new:W', 'flow-data:4a', 'flow-data:4b'] },
  { id: 'p-vote', title: '票選統計與防弊', intro: '第 3 步。各職位結果、逐人勾選的票選名單、同票抽籤、投影唱票（定案 B：全部候選人同列）、防弊檢查與計票規則。', keys: ['core:3', 'flow-stats:5a', 'new:V1', 'flow-stats:5b', 'new:唱票', 'flow-guard:11a', 'flow-guard:11b', 'flow-guard:11c'] },
  { id: 'p-survey', title: '意見調查統計與圖表', intro: '第 3 步。量表、複選、開放題、交叉分析、累積讀取、圖表圖庫與勾選換圖、圖表另存、量表標籤與反向計分。', keys: ['new:5d', 'new:5d2', 'flow-stats:5e', 'flow-stats:5f', 'flow-stats:5g', 'new:E6', 'new:Gal', 'new:Save', 'flow-guard:11d', 'flow-guard:11e'] },
  { id: 'p-fb', title: '報告回饋與歷次趨勢', intro: '第 3 步。以被評對象為單位（班均註明已計入組數、含平均列）與同一班多次問卷的變化。', keys: ['new:5h', 'flow-stats:5i', 'flow-stats:5j'] },
  { id: 'p-out', title: '審稿與輸出', intro: '第 4 步。單行意見審稿、改寫、常用評語與存成常用評語、輸出設定（頁首與圖表勾選）、檔名與去識別化、進度與完成、失敗。', keys: ['new:6a', 'new:6b', 'new:6c', 'new:6d', 'new:6e', 'new:4', 'flow-out:7a', 'flow-out:7b', 'flow-out:7c', 'flow-out:10b'] },
  { id: 'p-edit', title: '版面編輯器', intro: '預覽與編輯模式分開、選取區塊、區塊清單與拖曳、文字與圖表屬性、加入區塊、頁面設定、個別學生版本。', keys: ['flow-edit:11a', 'flow-edit:11b', 'flow-edit:11c', 'flow-edit:11d', 'flow-edit:11e', 'flow-edit:11f', 'flow-edit:11g', 'flow-edit:11h'] },
  { id: 'p-tpl', title: '範本庫與設定檔', intro: '範本縮圖由真實版面產生、第一次修改內建範本、選單、匯出與匯入；儲存設定檔與開啟設定檔後的接續。', keys: ['new:9a', 'new:9a2', 'flow-tpl:9b', 'flow-tpl:9c', 'flow-tpl:9d', 'new:9e', 'flow-tpl:9f'] },
  { id: 'p-set', title: '設定、隱私與品牌', intro: '設定首頁、三層預設、備份與還原、關於與隱私（從簡）、忘記資料夾、Logo（定案：乙）。', keys: ['flow-out:8a', 'flow-out:8b', 'flow-out:8c', 'new:12d', 'new:12f', 'new:Logo'] },
  { id: 'p-sys', title: '狀態、提示與系統', intro: '空白、離開確認、安裝到主畫面、離線、新版本、第一次載入。', keys: ['flow-out:10a', 'flow-out:10c', 'flow-sys:12a', 'flow-sys:12b', 'flow-sys:12c', 'flow-sys:12e'] },
];
// 新畫面代號別名（畫面編號 → 登錄用代號）：5d 圖表勾選面板在檔案中標為 5e，登錄時改叫 5d2
const ALIAS = { 'new:5e': 'new:5d2', 'new:12d': 'new:12d', 'new:4': 'new:4' };
const all = { ...oldFigs };
for (const [k, v] of Object.entries(newFigs)) all[ALIAS[k] || k] = v;
const used = new Set();
export const phoneSecs = () => PHONE_SECS.map((s) => ({ ...s, entries: s.keys.map((k) => { if (!all[k]) throw new Error('手機畫面不存在：' + k); used.add(k); return { key: k, html: all[k] }; }) }));
export const checkUnused = () => {
  const miss = Object.keys(all).filter((k) => !PHONE_SECS.some((s) => s.keys.includes(k)) && !DROP.has(k));
  if (miss.length) throw new Error('手機畫面未分組：' + miss.join(','));
};
// 舊畫面既被取代又沒有新畫面對應的清單，供對照用
export const dropped = [...DROP];
