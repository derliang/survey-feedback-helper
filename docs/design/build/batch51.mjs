// 第六輪（2026-11-01）：編輯器已實作畫面與設計稿差異補稿＋深色輸出預覽＋動態與轉場。手機、平板、桌機各一個模擬頁。
// 以實際 src/ui/editor、src/editor（分支 main，唯讀參考）為準。進階區塊的屬性是設計稿（程式尚未做，由 export-layout 與後續對話落實）。
// 執行：node batch51.mjs   →  寫入 ../mockups/{手機,平板,桌機}-第六輪.html
import fs from 'node:fs';
import * as K from './m2kit.mjs';
import * as DK from './deskkit.mjs';

const { ic, tag, btn, notice, tile, seg, chips, rowbtn, rcard, opt, scr, act, mbar, mframe, mframeWH, tabletize, sheet } = K;
const { D, side, main, rside, modal, mhead, mfoot, body, flex1, h: dh, frameWH, topbar } = DK;
const sp = K.sp;
const rd = (f) => fs.readFileSync(f, 'utf8');
const repo = sp + '/../../..';
const mh = K.h || ((t, s) => `<h1 style="font-size:var(--fs-xl);margin:0">${t}</h1>${s ? `<p class="small muted" style="margin:0">${s}</p>` : ''}`);

// ---------- 共用片段 ----------
const SRC = { default: ['內建預設', ''], global: ['全域預設', 'accent'], kind: ['問卷類型範本', 'accent'], run: ['這次輸出', 'warn'] };
const srcTag = (k) => tag(SRC[k][0], SRC[k][1]);
// 三層設定的一列：名稱、目前值、來源、可還原
const setRow = (name, val, src, canReset, extra) => `<div class="qcard" style="gap:8px;padding:12px 14px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${name}</b>${srcTag(src)}</div><div style="color:var(--ink)">${val}</div>${extra || ''}${canReset ? `<div>${btn('還原到上一層的值', 'ghost', { sm: true })}</div>` : ''}</div>`;
const layerRows = (layer) => {
  const G = layer === 'global';
  const rows = [
    ['學校名稱', '三民國中', G ? 'global' : 'global', false],
    ['給誰看', '教師版', 'default', false],
    ['輸出用範本', '個人回饋單（內建）', layer === 'kind' ? 'kind' : 'default', layer === 'kind'],
    ['檔名規則', '{班級}_{座號}_{姓名}_回饋單', 'default', false],
    ['姓名換代號（去識別化）', '關', 'default', false],
    ['顯示其他同學的姓名', '關（預設匿名）', 'default', false],
    ['顯示原始留言', '關', layer === 'run' ? 'run' : 'default', layer === 'run'],
    ['顯示班級比較', '開', 'default', false],
    ['關鍵字提醒', '10 個用詞（預設）', 'default', false],
  ];
  return rows.map(([n, v, s, r]) => setRow(n, v, s, r)).join('');
};
const layerHelp = {
  global: '全域預設：換任何問卷都先套這一層。存在你的資料夾。',
  kind: '問卷類型範本：只對這個類型的問卷有效，會蓋過全域預設。存在你的資料夾。',
  run: '這次輸出：只對這一次有效，關掉頁面就沒了，不存檔。會蓋過前兩層。',
};

// 設定頁「備份與還原」
const bkInclude = `<div class="qcard" style="gap:6px;padding:12px 14px"><b>備份檔裡有什麼</b><ul class="small" style="margin:0;padding-left:1.3em;color:var(--ink2)"><li>問卷、名單對照、審稿進度與設定</li><li>所有「我的範本」、三層設定、個別學生版本、圖片與 Logo</li></ul><div class="small muted"><b>沒有</b>內建範本（程式本身就有）；<b>沒有</b>學生的原始作答 Excel 檔（資料檔每次重新選）。備份檔含學生姓名，請像對待名單一樣保管，不要放在公開的地方。</div></div>`;
const restorePreview = `<div class="qcard" style="gap:8px;padding:12px 14px"><b>備份檔內容（還沒套用）</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${tile('我的範本', '4')}${tile('個別學生版本', '9')}</div>${notice('warn', 'warn', '<b>這是舊版備份（版本 1）</b><br>會自動轉成新版格式，轉換後的資料不能再用舊版程式開啟。有 1 份範本損壞，已略過，其餘 4 份照常還原。')}<div class="small muted">備份日期 2026/10/30 21:40 · 檔名 問卷小幫手備份.sfhbak（副檔名暫定）</div></div>`;
const restoreHow = `<div role="radiogroup" aria-label="怎麼還原" style="display:flex;flex-direction:column;gap:8px">${rcard('合併進目前的資料', '預設。同名範本兩份都留；目前資料不會被蓋掉', true)}${rcard('取代目前的資料', '先自動下載一份目前資料的備份，再整包換掉', false)}</div>`;

// 範本縮圖（紙張小圖）：用簡單的色塊代表版面
const thumb = (kind) => {
  const lines = (n, w = 100) => Array.from({ length: n }, (_, i) => `<i style="display:block;height:3px;border-radius:2px;background:#c9d6e3;margin:3px 0;width:${i % 3 === 2 ? 60 : w}%"></i>`).join('');
  const head = kind === 'frame' ? 'border:3px solid #1f4e79;' : '';
  const hd = `<i style="display:block;height:8px;border-radius:2px;background:#1f4e79;width:55%;margin-bottom:6px"></i>`;
  const cols = kind === 'cols' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${lines(5)}<div>${lines(5)}</div></div>` : lines(8);
  const num = kind === 'sum' ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:4px 0">${'<i style="height:14px;border-radius:3px;background:#dce8f4"></i>'.repeat(3)}</div>` : '';
  const bg = kind === 'warm' ? 'background:#fffaf0;' : 'background:#fff;';
  return `<div aria-hidden="true" style="width:84px;height:118px;${bg}${head}border:1px solid var(--line-soft);border-radius:4px;padding:8px;flex:none;box-shadow:0 1px 2px var(--shadow-sm)">${hd}${num}${cols}</div>`;
};
const tplCard = (name, meta, kind, on, tags) => `<button class="rcard" role="radio" aria-checked="${on}" type="button" style="align-items:flex-start;gap:12px"><span class="dot"></span>${thumb(kind)}<span><b>${name}</b><small>${meta}</small><small>${tags}</small></span></button>`;
const tplList = () => `<div role="radiogroup" aria-label="輸出用範本" style="display:flex;flex-direction:column;gap:8px">${tplCard('個人回饋單（內建）', '一頁 A4 · 標題、評分表、對照圖、同學的話', 'plain', true, tag('內建') + ' ' + tag('輸出用', 'ok'))}${tplCard('三年二班 學生版', '兩欄 · 加頁框 · 暖白底', 'cols', false, tag('我的') + ' ' + tag('含進階區塊', 'warn'))}${tplCard('家長版（精簡）', '一頁 · 摘要數字列＋老師的話', 'sum', false, tag('我的') + ' ' + tag('含進階區塊', 'warn'))}${tplCard('班級總表（內建）', '橫式 A4 · 全班排名表', 'frame', false, tag('內建'))}</div>`;
const advNote = notice('', 'info', '<b>這份範本含「摘要數字列」等進階區塊</b><br>目前輸出器還沒有進階區塊的版面，會先用基本區塊（表格與文字）輸出，內容不會少。等輸出器補上後，這則提示就不會再出現。', btn('改用內建範本', 'secondary', { sm: true }) + btn('照這樣輸出', 'ghost', { sm: true }));
const missingNote = notice('warn', 'warn', '<b>有 2 個字目前的 PDF 字型沒有：「𡃁」「㠯」</b><br>PDF 會以空白方塊代替。可以改輸出 Word，或把姓名中的罕用字換成常用字。');
const outCheck = `<div class="qcard" style="gap:8px;padding:12px 14px"><b>這次要輸出的內容</b>${['評分表', '對照圖', '同學的話（已審稿 44／44）', '老師的話', '統計方法說明（附錄）'].map((x, i) => `<label class="check" style="display:flex;gap:8px;align-items:center"><input type="checkbox" ${i < 4 ? 'checked' : ''} aria-label="${x}"><span>${x}</span></label>`).join('')}</div>`;

// 編輯器：進階區塊
const advTiles = `<div class="add-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${['標題區', '摘要數字列', '稱讚提示', '自評對照表'].map((n) => `<button class="btn btn-secondary" type="button" style="min-height:64px">${n}</button>`).join('')}</div>`;
const baseTiles = `<div class="add-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${['標題', '文字', '條列', '統計表', '圖表', '同學的話', '老師的話', '圖片', '分隔線', '分頁線', '多欄'].map((n) => `<button class="btn btn-secondary" type="button" style="min-height:52px">${n}</button>`).join('')}</div>`;
const addPanel = `<div style="display:flex;flex-direction:column;gap:12px"><div class="small muted" style="font-weight:700">基本區塊</div>${baseTiles}<div class="small muted" style="font-weight:700">進階區塊${tag('新', 'accent')}</div>${advTiles}<div class="small muted">會加在「每個項目的表現」的下方。進階區塊的內容由統計結果自動帶入，不用自己打數字。</div></div>`;
const sumProps = `<div style="display:flex;flex-direction:column;gap:12px"><h3 class="props-h" style="margin:0">摘要數字列</h3><div class="small muted" style="font-weight:700">顯示哪些數字</div>${chips(['我的平均', '班級平均', '全班名次', '回收份數', '中位數', '標準差（母體）'], 0).replace('aria-pressed="false"', 'aria-pressed="true"')}<div class="small muted">名次在學生版與家長版會自動隱藏（沿用「進階統計定義」的預設）。</div><div class="small muted" style="font-weight:700">每列幾格</div>${seg(['2 格', '3 格', '4 格'], 1, '每列幾格')}<div class="small muted" style="font-weight:700">底色</div>${chips(['無', '淡藍', '暖白'], 1)}<div class="small" style="color:var(--ink2)">${ic('info')} Word：底色與圓角會轉成表格底色與直角。</div></div>`;
const pagePanel = `<div style="display:flex;flex-direction:column;gap:12px"><h3 class="props-h" style="margin:0">頁面設定</h3><div class="small muted" style="font-weight:700">紙張</div>${seg(['A4', 'A5', 'Letter'], 0, '紙張')}<div class="small muted" style="font-weight:700">頁面背景</div>${chips(['白', '暖白', '淡藍'], 1)}<button class="tgl" role="switch" aria-checked="true" type="button"><span style="text-align:left"><b style="display:block">頁框</b></span><span class="sw2"></span></button><div class="small muted" style="font-weight:700">頁框顏色${tag('建議新增', 'warn')}</div>${chips(['鈷藍', '石墨灰', '暖棕'], 0)}<div class="small muted" style="font-weight:700">頁框粗細${tag('建議新增', 'warn')}</div>${seg(['細', '中', '粗'], 1, '頁框粗細')}<button class="tgl" role="switch" aria-checked="false" type="button"><span style="text-align:left"><b style="display:block">頁框圓角</b></span><span class="sw2"></span></button><div class="small" style="color:var(--ink2)">${ic('info')} Word：圓角頁框改成直角；頁面背景色不會出現在 Word。</div></div>`;

// 紙張（永遠淺色）
const paper = (o = {}) => `<div class="doc-warm" style="width:${o.w || 300}px;background:var(--doc-paper);color:var(--doc-ink);border-radius:4px;padding:16px 18px;box-shadow:0 2px 10px rgba(0,0,0,.45);font-size:12px;display:flex;flex-direction:column;gap:8px;${o.frame ? 'outline:3px solid #1f4e79;outline-offset:-8px;' : ''}"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px">三年二班 讀書報告回饋</b><span>林小宇（6 號）</span></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[['我的平均', '8.9'], ['班級平均', '8.4'], ['回收份數', '38']].map(([a, b]) => `<div style="background:var(--doc-sunk);border-radius:6px;padding:6px 8px"><div style="font-size:10px;color:var(--doc-ink2)">${a}</div><b style="font-size:16px">${b}</b></div>`).join('')}</div><div style="display:grid;grid-template-columns:${o.cols ? '1fr 1fr' : '1fr'};gap:10px"><div>${['簡報內容', '簡報設計', '講述的內容'].map((n, i) => `<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><span style="width:62px">${n}</span><i style="height:8px;border-radius:4px;background:var(--doc-accent);width:${[78, 64, 72][i]}%"></i></div>`).join('')}</div>${o.cols ? `<div style="border-left:1px solid var(--doc-line);padding-left:8px"><b>同學的話</b><div style="color:var(--doc-ink2);margin-top:3px">聲音很清楚，圖表也好懂。</div></div>` : ''}</div>${o.cols ? '' : `<div><b>同學的話</b><div style="color:var(--doc-ink2)">聲音很清楚，圖表也好懂。</div></div>`}</div>`;

// 深色：把 tokens.css 深色區塊改成 .dk 範圍，讓同一頁並排淺色與深色
const tokensText = rd(repo + '/docs/design/tokens.css');
const darkBlock = (tokensText.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/) || [])[1];
if (!darkBlock) throw new Error('找不到 tokens.css 深色區塊');
const darkCss = `.dk{${darkBlock}\n background:var(--paper);color:var(--ink);color-scheme:dark}`;
const dkWrap = (inner) => `<div class="dk" style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">${inner}</div>`;

// 動態與轉場規格（所有裝置共用一張）
const MOTION = [
  ['按鈕、列、籌碼按下／選取', '背景色與外框色漸變', '160ms', 'ease-out', '不用位移或縮放，避免手機上抖動'],
  ['底部彈出面板（手機）／側邊面板（平板）／對話框（桌機）', '遮罩淡入；面板從邊緣滑入（桌機淡入＋上移 8px）', '220ms 進、160ms 出', 'ease-out / ease-in', '遮罩不攔截關閉；Esc 與點遮罩關閉'],
  ['展開／收合（資料檢查列、進階區）', '高度展開，內容淡入', '200ms', 'ease-out', '只有展開動畫；收合立即（避免等待）'],
  ['步驟列換步驟', '目前步驟的底色漸變，不滑動', '160ms', 'ease-out', '畫面內容立即換，不做頁面滑動'],
  ['編輯器拖曳區塊', '被拖的區塊浮起（陰影＋放大 2%）；放置線 80ms 淡入；放開後區塊 160ms 落位', '80～160ms', 'ease-out', '長按 350ms 才開始；另有上下移鈕，不依賴手勢'],
  ['進度條、讀取中', '進度條寬度線性增加；讀取中用旋轉圖示', '連續', 'linear', '不做彈跳、不做慶祝動畫'],
  ['提示（Notice）出現', '直接出現，不做動畫', '0', '—', '警示類內容不該一閃而過'],
];
const motionFig = `<figure class="fig" style="margin:0;max-width:960px"><div style="border:1px solid var(--line-soft);border-radius:var(--r-md);background:var(--card);overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:var(--fs-sm)"><thead><tr style="background:var(--sunk)">${['場合', '怎麼動', '時間', '緩動', '備註'].map((x) => `<th style="text-align:left;padding:8px 10px">${x}</th>`).join('')}</tr></thead><tbody>${MOTION.map((r) => `<tr>${r.map((c, i) => `<td style="padding:8px 10px;border-top:1px solid var(--line-soft);${i === 0 ? 'font-weight:700;' : ''}vertical-align:top">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div style="display:flex;gap:16px;align-items:center;margin-top:12px;flex-wrap:wrap"><span class="small muted">示範（實際播放；系統設定「減少動態」時不動）</span><span class="mo-demo"><i></i></span><button class="btn btn-secondary mo-btn" type="button">按鈕選取漸變</button></div><figcaption style="max-width:760px"><b>M1 動態與轉場總規則</b>規範見 DESIGN.md 5.24。原則：動態只幫助看懂「什麼變了」，不做裝飾。<ul><li>全部時間 ≤ 220ms；進場動畫只用在面板與展開，頁面切換不做動畫。</li><li><b>減少動態</b>（<code>prefers-reduced-motion: reduce</code>）：全部關閉，面板與展開直接出現；拖曳浮起改用粗外框表示。</li><li>只動 <code>opacity</code>、<code>transform</code>、背景與外框色，不動 <code>width/height</code> 以外會造成重排的屬性（展開高度除外，且內容少）。</li><li>深色與淺色動態相同，不加光暈。</li><li>程式現況：只有 <code>--dur</code> 160ms 的顏色漸變與減少動態的全域關閉；面板與展開目前<b>沒有</b>動畫，上表是新增的目標值，施工時一併實作並用 e2e 確認減少動態時為 0。</li></ul></figcaption></figure>`;

// ====================================================================
// 手機
// ====================================================================
const P = [];
const pl = (H, cap, ...r) => P.push(K.mlong(H, cap, ...r));
const pf = (cap, ...r) => P.push(mframe(cap, ...r));

pl(1500, 'A1 設定：三層設定｜設定頁新增「預設值」。設定頁的設定分三層，後面的層蓋過前面的：①全域預設 ②問卷類型範本 ③這次輸出（不存檔）。頂端用分段控制切換要看哪一層；每一列同時寫出「這個值現在從哪一層來」，並可還原到上一層。「問卷類型範本」多一個類型選擇。實作現況：邏輯已在 src/editor/settings.ts（resolveSettings、settingSources），畫面尚未做。', mbar('預設值', { right: null }), scr(`${mh('輸出預設值', '同一個設定可以放在三個地方，越後面越優先。')}${seg(['全域預設', '問卷類型', '這次輸出'], 1, '設定層級')}${seg(['報告回饋', '意見調查', '票選幹部'], 0, '問卷類型')}<div class="small" style="color:var(--ink2)">${ic('info')} ${layerHelp.kind}</div>${layerRows('kind')}`, 12));

pl(1500, 'A2 設定：三層設定，「這次輸出」層｜只在輸出頁按「只改這次」或這裡進入。頂端警示：這一層不存檔。有蓋過上一層的列標「這次輸出」（警示色），按「還原到上一層的值」立即恢復。', mbar('預設值', { right: null }), scr(`${mh('輸出預設值', '同一個設定可以放在三個地方，越後面越優先。')}${seg(['全域預設', '問卷類型', '這次輸出'], 2, '設定層級')}${notice('warn', 'warn', `<b>${layerHelp.run}</b>`)}${layerRows('run')}`, 12));

pl(1500, 'A3 設定：備份與還原｜新增「備份與還原」一張卡。備份：一個檔含問卷、名單、審稿進度、設定、範本、個別學生版本、圖片。還原：先選檔→看到內容摘要（範本數、個別版本數、舊版轉換提示、損壞略過數）→再選「合併」（預設）或「取代」。兩者都不會在你看到摘要前改任何資料。實作現況：bundleBackup／unbundleBackup 與 v1→v2 轉換已在 src/editor/project.ts，畫面尚未做。', mbar('備份與還原', { right: null }), scr(`${mh('備份與還原', '換電腦或怕資料夾出事時用。')}${bkInclude}${btn('下載整包備份', 'primary', { block: true })}<div class="small muted">還沒選資料夾的話，備份檔就是你唯一的保存。手機會跳出「儲存到檔案」。</div><h2 style="font-size:var(--fs-lg);margin:8px 0 0">還原</h2>${btn('選擇備份檔', 'secondary', { block: true })}${restorePreview}${restoreHow}${btn('還原', 'primary', { block: true })}`, 12));

pl(2000, 'A4 輸出：範本縮圖選擇｜輸出頁的「輸出用範本」從單純下拉改成縮圖卡（取代設計稿 4 簡化版）。縮圖由範本實際版面產生，各範本看得出差別（多欄、頁框、底色）。標示「輸出用」「內建」「我的」；含進階區塊但輸出器尚未支援時標「含進階區塊」並在下方說明（export-layout 補完後移除）。下方「這次要輸出的內容」勾選清單。字型缺字提醒維持（已實作）。', mbar('輸出', { right: null }), K.msteps(4), scr(`${mh('輸出設定', '選版面，再選給誰看。')}${tplList()}${btn('編輯這份範本的版面', 'ghost', { block: true })}${advNote}${outCheck}${missingNote}`, 12), act(btn('產生並下載', 'primary', { block: true })));

pl(1500, 'A5 編輯器：加入區塊（含進階區塊）｜加入面板分「基本區塊」與「進階區塊」兩組（現況只有基本 11 種）。進階區塊四種：標題區、摘要數字列、稱讚提示、自評對照表，內容由統計結果自動帶入。', mbar('編輯器', { close: true, right: null }), scr(`<div class="qcard" style="padding:12px 14px">三年二班 學生版（預覽略）</div>`, 12), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="加入區塊"><div class="grab"></div><h3>加入區塊</h3><div style="overflow:auto;padding:0 4px 12px">${addPanel}</div></div>`);

pl(1500, 'A6 編輯器：進階區塊屬性（摘要數字列）｜屬性用籌碼與分段控制，不輸入數字。名次在學生版與家長版自動隱藏；標準差標「母體」。Word 的限制在面板最後一行說明（沿用編輯器既有的「Word 不支援效果」標示）。', mbar('編輯器', { close: true, right: null }), scr(`<div class="qcard" style="padding:12px 14px">三年二班 學生版（預覽略）</div>`, 12), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="摘要數字列"><div class="grab"></div><h3>摘要數字列</h3><div style="overflow:auto;padding:0 4px 12px">${sumProps.replace(/<h3 class="props-h"[^>]*>[^<]*<\/h3>/, '')}</div><div class="foot">${btn('完成', 'primary', { block: true })}</div></div>`);

pl(1500, 'A7 編輯器：頁面設定（頁框、背景）｜實作現況：頁框是開關，固定藍色 1.5pt，另有「頁框圓角」；背景只有白／暖白／淡藍三種。設計員建議（標「建議新增」）：頁框加顏色與粗細，與主題一致。Word 不支援頁面背景，面板最後一行標示。', mbar('編輯器', { close: true, right: null }), scr(`<div style="display:flex;justify-content:center">${paper({ w: 280, frame: true })}</div>`, 12), `<div class="scrim"></div><div class="sheet" role="dialog" aria-label="頁面設定"><div class="grab"></div><h3>頁面設定</h3><div style="overflow:auto;padding:0 4px 12px">${pagePanel.replace(/<h3 class="props-h"[^>]*>[^<]*<\/h3>/, '')}</div><div class="foot">${btn('完成', 'primary', { block: true })}</div></div>`);

P.push(mframeWH('A8 深色模式：輸出頁預覽｜深色模式下，周圍的畫面（頂端列、提示、按鈕）跟著深色，但<b>預覽裡的紙張永遠是淺色</b>（它就是要印出來或轉成 Word 的樣子），不跟系統變暗。紙張外面是一塊比畫面更深的「檯面」（--sunk），讓紙張像放在桌上，並加柔和陰影。頁碼與縮放按鈕在檯面上，文字用深色模式的墨色。', 390, 880, dkWrap(`${mbar('輸出', { right: null })}${K.msteps(4)}${scr(`${mh('預覽', '個人回饋單 · 林小宇（6 號）')}<div style="background:var(--sunk);border-radius:var(--r-md);padding:16px 8px;display:flex;justify-content:center">${paper({ w: 280 })}</div><div style="display:flex;gap:8px;align-items:center;justify-content:center"><span class="small muted">第 1／1 頁</span>${chips(['符合寬度', '100%'], 0)}</div>${notice('', 'info', '預覽是紙張實際的樣子，所以深色模式下紙張仍是白底。')}`, 12)}`), 34));

P.push(mframeWH('A9 深色模式：編輯器｜編輯器畫面用深色；頁面畫布同上（檯面深、紙張淺）。選取外框與放置線用強調色（深色版 token），<b>不用紅色表示放置</b>；個別版本橫幅用警示 token。', 390, 900, dkWrap(`${mbar('編輯器', { close: true, right: null })}${scr(`${notice('warn', 'warn', '<b>個別版本</b><br>林小宇（6 號）：2 項覆寫。回到全班範本不受影響。', btn('看改了哪些', 'secondary', { sm: true }))}<div style="background:var(--sunk);border-radius:var(--r-md);padding:16px 8px;display:flex;justify-content:center;position:relative">${paper({ w: 280, cols: true })}<div style="position:absolute;left:30px;right:30px;top:100px;height:36px;border:2px solid var(--accent);border-radius:4px;pointer-events:none"></div><div style="position:absolute;left:30px;right:30px;top:178px;height:3px;background:var(--accent)"></div></div>`, 12)}<div class="actbar" style="margin-top:auto"><div style="flex:1;align-self:center">已選取：摘要數字列</div>${btn('編輯屬性', 'primary')}</div>`), 34));

// ====================================================================
// 平板（由手機自動轉成）
// ====================================================================
const T = [];
const rails = [['set', 0], ['set', 0], ['set', 5], ['out', 0], ['edit', 4], ['edit', 3], ['edit', 5], ['out', 0], ['edit', 1]];
const heights = [1500, 1500, 1500, 1700, 1100, 1100, 1100, 1000, 1000];
const darkTab = (cap, railType, cur, inner) => mframeWH(cap + '（平板：左欄清單＋右側內容）', 820, 1000, dkWrap(`${mbar('問卷回饋小幫手', { brand: true })}<div style="display:flex;flex:1;min-height:0"><div style="width:240px;flex:none;padding:12px;border-right:1px solid var(--line-soft);display:flex;flex-direction:column;gap:4px">${K.railHtml(railType, cur)}</div><div style="flex:1;padding:16px;display:flex;flex-direction:column;gap:12px;overflow:hidden">${inner}</div></div>`), 24);
P.forEach((f, i) => {
  if (i === 7) return T.push(darkTab('A8 深色模式：輸出頁預覽', 'out', 0, `${mh('預覽', '個人回饋單 · 林小宇（6 號）')}<div style="background:var(--sunk);border-radius:var(--r-md);padding:20px;display:flex;justify-content:center">${paper({ w: 340 })}</div><div style="display:flex;gap:8px;align-items:center;justify-content:center"><span class="small muted">第 1／1 頁</span>${chips(['符合寬度', '100%'], 0)}</div>`));
  if (i === 8) return T.push(darkTab('A9 深色模式：編輯器', 'edit', 1, `${notice('warn', 'warn', '<b>個別版本</b><br>林小宇（6 號）：2 項覆寫。回到全班範本不受影響。', btn('看改了哪些', 'secondary', { sm: true }))}<div style="background:var(--sunk);border-radius:var(--r-md);padding:20px;display:flex;justify-content:center;position:relative">${paper({ w: 340, cols: true })}<div style="position:absolute;left:84px;right:84px;top:92px;height:40px;border:2px solid var(--accent);border-radius:4px;pointer-events:none"></div></div>`));
  const r = rails[i];
  T.push(tabletize(f, r, { h: heights[i], noBlock: true }).replace(/（底部彈出）/g, '（平板：靠右側彈出，寬 400）'));
});

// ====================================================================
// 桌機（1280）
// ====================================================================
const DKS = [];
const df = (cap, step, inner, file, H, o) => DKS.push(D(cap, step, inner, file, H, o));
const setSide = (cur) => side(260, `<div class="small muted" style="font-weight:700;padding:4px 12px">設定</div>${['預設值', '版面範本', '檔名規則', '關鍵字提醒', '資料夾', '備份與還原', '外觀', '關於與隱私'].map((x, i) => DK.nvr(x, i === cur)).join('')}`);

df('A1 設定：預設值（三層）｜桌機：左欄設定分組，右邊三層用分段控制切換；每列寫目前值、來源層、還原。兩欄排列設定列以縮短高度。', 1, body(setSide(0), main(`${dh('輸出預設值', '同一個設定可以放在三個地方，越後面越優先。')}<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">${seg(['全域預設', '問卷類型', '這次輸出'], 1, '設定層級')}${seg(['報告回饋', '意見調查', '票選幹部'], 0, '問卷類型')}</div><div class="small" style="color:var(--ink2)">${ic('info')} ${layerHelp.kind}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${layerRows('kind')}</div>`, 'gap:12px;max-width:900px')), '', 900);

df('A3 設定：備份與還原｜桌機：左邊備份（內容說明、下載），右邊還原三步（選檔→看摘要→合併或取代）。', 1, body(setSide(5), main(`${dh('備份與還原', '換電腦或怕資料夾出事時用。')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start"><div style="display:flex;flex-direction:column;gap:12px">${bkInclude}${btn('下載整包備份', 'primary')}<div class="small muted">已選資料夾時，資料夾本身就是日常備份；整包備份用在換電腦與出事時。</div></div><div style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:var(--fs-lg);margin:0">還原</h2>${btn('選擇備份檔', 'secondary')}${restorePreview}${restoreHow}${btn('還原', 'primary')}</div></div>`, 'gap:12px;max-width:1000px')), '', 900);

const outMain = main(`${dh('輸出設定', '選版面，再選給誰看。')}${tplList()}${advNote}${outCheck}${missingNote}`, 'gap:12px;max-width:640px');
const outPrev = rside(460, `<div style="display:flex;gap:8px;align-items:center"><b>即時預覽</b><span class="small muted">林小宇（6 號）· 第 1／1 頁</span></div><div style="background:var(--sunk);border-radius:var(--r-md);padding:16px;display:flex;justify-content:center">${paper({ w: 340 })}</div>${chips(['符合寬度', '100%'], 0)}`);
df('A4 輸出：範本縮圖選擇｜桌機：中間縮圖卡清單與勾選，右邊即時預覽（紙張永遠淺色）。', 4, `${body(side(300, `<div class="small muted" style="font-weight:700;padding:4px 12px">輸出</div>${['輸出設定', '檔名與去識別化', '進度', '完成'].map((x, i) => DK.nvr(x, i === 0)).join('')}`), outMain, outPrev)}${DK.nav('產生並下載', '回統計')}`, '三年二班_報告回饋.xlsx', 1250, { prog: {} });

const edLeft = pane0(260, `<h2 class="sub-h" style="margin:0;font-size:var(--fs-md)">區塊</h2>${['標題區', '摘要數字列', '每個項目的表現', '稱讚提示', '自評對照表', '老師的話'].map((n, i) => `<div class="qrow"${i === 1 ? ' aria-current="true"' : ''}><span style="flex:none;color:var(--ink3)">⋮⋮</span><span style="flex:1">${n}</span>${tag(i === 1 ? '進階' : i === 2 || i === 5 ? '基本' : '進階')}</div>`).join('')}${btn('加入區塊', 'secondary')}`);
function pane0(w, inner) { return side(w, `<div style="display:flex;flex-direction:column;gap:8px">${inner}</div>`); }
df('A5 編輯器：進階區塊（桌機）｜三欄：左區塊清單（進階區塊標「進階」）、中間頁面（多欄＋頁框＋暖白底，紙張淺色）、右邊屬性（選取「摘要數字列」）。加入區塊面板為置中對話框，分「基本區塊」與「進階區塊」。', 1, `${body(edLeft, main(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${btn('頁面設定', 'secondary', { sm: true })}${btn('個別學生版本', 'secondary', { sm: true })}<span class="small muted">縮放 100% · Ctrl+Z 復原 · Delete 刪除 · ↑↓ 移動 · 雙擊文字直接改</span></div><div style="background:var(--sunk);border-radius:var(--r-md);padding:20px;display:flex;justify-content:center">${paper({ w: 420, cols: true, frame: true })}</div>`, 'gap:12px'), rside(340, sumProps))}`, '三年二班 學生版', 900);
df('A6 編輯器：加入區塊對話框｜桌機置中對話框（寬 520），基本區塊與進階區塊兩組。', 1, `${body(edLeft, main('', ''), rside(340, sumProps))}${modal(520, `${mhead('加入區塊')}${addPanel}`)}`, '三年二班 學生版', 900);

df('A7 編輯器：頁面設定｜桌機右側欄換成頁面設定（沒選區塊時）。頁框加顏色與粗細（建議新增）。', 1, `${body(edLeft, main(`<div style="background:var(--sunk);border-radius:var(--r-md);padding:20px;display:flex;justify-content:center">${paper({ w: 420, frame: true })}</div>`, 'gap:12px'), rside(340, pagePanel))}`, '三年二班 學生版', 900);

DKS.push(frameWH('A8 深色模式：輸出頁預覽（桌機）｜桌機深色：畫面、側欄、提示都用深色 token；預覽檯面（--sunk）比畫面更深，紙張維持淺色白底並加柔和陰影。對比：檯面對紙張邊界清楚；紙張外的文字（頁碼、縮放）用深色模式墨色，對比 ≥ 4.5:1。', 1280, 1000, dkWrap(`${topbar(4, '三年二班_報告回饋.xlsx', { prog: {} })}${body(side(300, `<div class="small muted" style="font-weight:700;padding:4px 12px">輸出</div>${['輸出設定', '檔名與去識別化', '進度', '完成'].map((x, i) => DK.nvr(x, i === 0)).join('')}`), main(`${dh('輸出設定', '選版面，再選給誰看。')}${tplList()}${advNote}`, 'gap:12px;max-width:560px'), rside(520, `<div style="display:flex;gap:8px;align-items:center"><b>即時預覽</b><span class="small muted">林小宇（6 號）· 第 1／1 頁</span></div><div style="background:var(--sunk);border-radius:var(--r-md);padding:20px;display:flex;justify-content:center">${paper({ w: 380, cols: true })}</div>`))}`)));

// ====================================================================
const tokens = tokensText.replace(/\/\*[\s\S]*?\*\/\s*/, '');
const css = [rd(sp + '/chrome.css'), rd(sp + '/app.css'), rd(sp + '/doc.css')].join('\n');
const sprite = rd(sp + '/sprite.html');
const extra = `.pagehead{display:flex;flex-direction:column;gap:6px;max-width:72ch}.round{display:flex;flex-direction:column;gap:32px}.scale{position:static!important;width:auto!important;height:auto!important}.scale>.dev,.scale>.paper{position:relative!important;transform:none!important}.figs{overflow-x:auto}
${darkCss}
.mo-demo{width:120px;height:12px;border-radius:6px;background:var(--sunk);display:inline-block;overflow:hidden}.mo-demo i{display:block;height:100%;width:30%;background:var(--accent);border-radius:6px;animation:mo 1.6s ease-in-out infinite alternate}@keyframes mo{to{margin-left:70%}}.mo-btn{transition:background-color var(--dur) ease-out,border-color var(--dur) ease-out}@media (prefers-reduced-motion:reduce){.mo-demo i{animation:none}.mo-btn{transition:none}}`;
function page(name, title, intro, figs) {
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}（模擬頁）</title>
<style>
${tokens}
${css}
${extra}
</style>
</head>
<body>
${sprite}
<div class="wrap">
<header class="pagehead"><p class="small muted">設計規範的模擬頁，使用虛構資料。規範見 docs/design/DESIGN.md 5.24。</p><h1>${title}</h1><p class="muted">${intro}</p></header>
<div class="figs">
${figs.join('\n')}
</div>
</div>
</body>
</html>
`;
  fs.writeFileSync(`${repo}/docs/design/mockups/${name}.html`, html);
  console.log(name, figs.length);
}
const INTRO = '第六輪（2026-11-01）：①編輯器已實作畫面與設計稿差異補稿（三層設定、備份還原、輸出頁範本縮圖、進階區塊、多欄／頁框呈現）；②深色模式的輸出預覽與編輯器；③動態與轉場總規則。標「建議新增」者是設計員建議，使用者未裁示前程式不必做。';
page('手機-第六輪', '第六輪補稿（手機）', INTRO, [...P, motionFig]);
page('平板-第六輪', '第六輪補稿（平板）', INTRO + ' 平板由手機自動轉成分欄。', [...T, motionFig]);
page('桌機-第六輪', '第六輪補稿（桌機）', INTRO, [...DKS, motionFig]);
