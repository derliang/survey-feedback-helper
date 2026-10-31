// 桌機裁示新增畫面：圖表、權重、審稿輸出、自訂版面（D59–D69）
import * as K from './deskkit.mjs';
import { CHARTS, FOR, DEFAULT, thumb, chartLabel, chartUse } from './charts.mjs';
const { W, L, frameWH, D, side, main, rside, nav, modal, mhead, mfoot, rail, fbox, h, th, td, nvr, tgl, body, pane, flex1, foot, kbd, tag, btn, notice, tile, tiles, seg, chips, rowbtn, ic, icbtn, grp, brow, addPages, write, field, miniPaper, chartHead, weightTable, editorBar, progDone } = K;
const F = [];
const qList = (cur) => `${rail('題目')}${['1 老師說明清楚', '2 活動內容有趣', '3 分組讓我有機會表達', '4 願意推薦給其他班', '5 活動時間太趕', '6 活動場地舒適'].map((t, i) => nvr(t, i === cur)).join('')}`;
const stackRow = (nm, p) => `<div class="sbar"><div class="h"><span>${nm}</span><b>${p[3] + p[4]}%</b></div><div class="tr">${p.map((v, i) => `<i style="width:${v}%;background:var(--${['d2', 'warn-bar', 'bar-muted', 'd4', 'd1'][i]})"></i>`).join('')}</div><div class="tn">${p.map((v) => `<span style="width:${v}%">${v >= 5 ? v + '%' : ''}</span>`).join('')}</div></div>`;
const legend = `<div class="small muted" style="display:flex;gap:12px;flex-wrap:wrap">${[['d2', '1 非常不同意'], ['warn-bar', '2 不同意'], ['bar-muted', '3 普通'], ['d4', '4 同意'], ['d1', '5 非常同意']].map(([c, t]) => `<span style="display:inline-flex;align-items:center;gap:4px"><i style="width:10px;height:10px;border-radius:2px;background:var(--${c})"></i>${t}</span>`).join('')}</div>`;
const stackCard = (tools = '') => `<div class="qcard" style="gap:12px;padding:14px 16px"><div style="display:flex;align-items:center;gap:8px"><b>堆疊橫條</b><span class="small muted">${chartUse('stack')}</span>${tools}</div>${stackRow('老師說明清楚', [0, 2, 10, 34, 54])}${stackRow('活動內容有趣', [0, 2, 12, 32, 54])}${stackRow('活動場地舒適', [5, 15, 29, 32, 19])}${legend}</div>`;
const statBase = () => body(side(260, qList(1)), main(`${chartHead('第 2 題 ／ 9 · 量表', '活動內容有趣')}${tiles([['平均', '4.37'], ['中位數', 4], ['標準差', '0.74'], ['4–5 分', '86%']])}${stackCard(`<span style="margin-left:auto;display:flex;gap:4px">${btn('換圖', 'secondary', { sm: true })}${btn('隱藏', 'secondary', { sm: true })}</span>`)}`));
const chkRow = (k, on, dflt) => `<div class="chkrow"><span class="ck${on ? ' on' : ''}">${on ? ic('check') : ''}</span>${thumb(k)}<div><b>${chartLabel(k)}</b>${dflt ? tag('預設', 'accent') : ''}<div class="small muted">${chartUse(k)}</div></div></div>`;

// D59 圖表清單
F.push(D('D59 桌機：選擇要顯示的圖表｜每個統計畫面右上都有「圖表」按鈕。勾選清單只列這種題目適用的圖，每張附一句用途說明；預設一張，老師自己挑，不一次全塞。選擇存在設定與範本，不含資料。', 3,
  `${statBase()}${nav('下一步：輸出')}${modal(720, `${mhead('這題要顯示哪些圖表？')}<span class="small muted">量表題。選好的圖也會成為輸出文件的預設。</span><div class="chkgrid">${FOR.量表.map((k, i) => chkRow(k, i === 0 || k === 'hist', k === DEFAULT.量表)).join('')}</div><span class="small muted">已選 2 張。之後每張圖右上角也可以換圖或隱藏。</span>${mfoot(btn('取消', 'secondary'), btn('套用', 'primary'))}`)}`));

// D60 換圖
const opt2 = (k, on) => `<button class="pickrow${on ? ' on' : ''}" type="button">${thumb(k)}<span><b>${chartLabel(k)}</b><span class="small muted">${chartUse(k)}</span></span></button>`;
F.push(D('D60 桌機：換圖｜每張圖右上角的「換圖」開下拉選單，縮圖加用途說明；「隱藏」把這張圖收起，可從「圖表」按鈕找回。', 3,
  `${statBase()}<div class="popov" style="right:236px;top:318px;width:380px">${FOR.量表.slice(0, 4).map((k, i) => opt2(k, i === 0)).join('')}</div>${nav('下一步：輸出')}`));

// D61 全部圖表
F.push(D('D61 桌機：全部圖表與預設｜全部 11 種圖的縮圖與用途，也是規範的對照表。每種統計預設一張：票選長條、量表堆疊橫條、報告回饋對照條、趨勢折線、交叉熱圖；其餘由老師勾選。', 3,
  `${body(main(`${h('全部圖表', '不做儀表板：每個畫面只放老師勾選的圖。')}<div class="allch">${Object.keys(CHARTS).map((k) => `<div class="qcard" style="gap:6px;padding:10px 12px">${thumb(k)}<b>${chartLabel(k)}</b><span class="small muted">${chartUse(k)}</span></div>`).join('')}</div>`))}`, ''));

// D62 單一學生的圖表
const bgReview = () => body(side(260, `${progDone(36, 41)}${['周宜靜', '林小宇', '陳怡安'].map((t, i) => nvr(t, i === 1)).join('')}`), main(`${h('林小宇（6 號）', '2 則待審')}${K.cmt('報告條理清楚，圖表很好懂。', '優點', '採用')}`));
F.push(D('D62 桌機：這位學生的圖表｜回饋單放哪些圖，在輸出設定全班一致勾選；審稿頁可以替單一學生覆寫，只影響這一位。', 4,
  `${bgReview()}${foot(btn('上一位', 'secondary'), btn('下一位', 'primary'))}${modal(640, `${mhead('林小宇（6 號）的圖表')}<span class="small muted">目前沿用全班設定。這裡改的只影響這位學生。</span><div class="chkgrid">${FOR.報告回饋.slice(0, 4).map((k, i) => chkRow(k, i < 2, k === DEFAULT.報告回饋)).join('')}</div>${mfoot(btn('恢復全班設定', 'secondary'), btn('套用', 'primary'))}`)}`));

// D65 模擬黑白
F.push(D('D65 桌機：預覽模擬黑白列印｜回饋單只有一套彩色，轉灰階仍有明度階梯，圖旁一定有數字與標籤。老師印出來之前，可以在預覽切到模擬黑白先看一次。', 4,
  `${body(pane(380, `${rail('輸出設定')}${grp('要輸出什麼', chips(['班級總表', '個人回饋單'], 1))}${grp('回饋單的圖表（全班一致）', chips(['對照條', '雷達圖', '盒鬚圖'], 0))}<span class="small muted">審稿頁可替單一學生覆寫。</span>`, 'padding:16px;border-right:1px solid var(--line-soft);background:var(--card)'), `<div style="flex:1;min-width:0;display:flex;flex-direction:column;background:var(--sunk)"><div style="display:flex;justify-content:center;padding:8px"><div style="width:260px">${seg(['彩色', '模擬黑白'], 1, '預覽')}</div></div><div style="flex:1;min-height:0;display:grid;place-items:start center;padding:8px;overflow:hidden;filter:grayscale(1)">${miniPaper(0.6)}</div></div>`)}${foot(btn('上一步', 'secondary'), btn('產生並下載', 'primary'))}`));

// D66 存成常用評語
F.push(D('D66 桌機：存成常用評語｜評語欄右下角的「存成常用評語」。沒選取就存整段，有選取就存選取部分；學生姓名自動換成 {姓名}，存之前看得到也改得到，先放「我的」分類。', 4,
  `${body(main(`${h('林小宇（6 號）')}<div class="input" style="min-height:180px;padding:14px;line-height:1.8">小宇，這次報告看得出你很用心，也很願意照顧組員。</div>`))}${foot(btn('上一步', 'secondary'), btn('儲存', 'primary'))}${modal(560, `${mhead('存成常用評語')}${field('st', '短標題', '用心又照顧組員')}<div class="field"><label>內容</label><div class="input" style="min-height:96px;padding:12px;line-height:1.7">{姓名}，這次報告看得出你很用心，也很願意照顧組員。</div><span class="hint">學生姓名已換成 {姓名}，可以修改。</span></div>${grp('分類', chips(['我的'], 0))}${mfoot(btn('取消', 'secondary'), btn('儲存', 'primary'))}`)}`));

// D64 權重不等於 100%
F.push(D('D64 桌機：權重合計不是 100%｜手動改權重後其他項不動。合計不是 100% 時停用下一步，指出差多少，附「恢復等重」。', 2,
  `${body(main(`${h('欄位對應：報告回饋', '只有量表評分項目分權重，開放題不算。')}${weightTable([35, 25, 25, 20])}`), rside(340, `${h('合計')}${tile('權重合計', '105%', 'warn')}${notice('warn', 'warn', '多了 5%，請調整到 100%。')}${btn('恢復等重', 'secondary', { block: true, icon: 'undo' })}`))}${foot(btn('上一步', 'secondary'), btn('下一步', 'primary', { dis: true }))}`));

// D63 編輯器圖表選擇器
const E = (cap, inner) => frameWH(cap, 1280, 800, inner);
const paper = `<div style="flex:1;min-width:0;display:grid;place-items:start center;padding:20px;background:var(--sunk);overflow:hidden">${miniPaper(0.7)}</div>`;
const edShell = (right, extra = '') => `${editorBar()}<div style="flex:1;min-height:0;display:flex">${pane(260, `${rail('區塊')}${['標題區', '摘要數字列', '稱讚提示', '對照條', '老師的話'].map((t, i) => nvr(t, i === 3)).join('')}`, 'padding:12px;border-right:1px solid var(--line-soft);background:var(--card)')}${paper}${pane(320, right, 'padding:16px;border-left:1px solid var(--line-soft);background:var(--card)')}</div>${extra}`;
F.push(E('D63 桌機：編輯器・圖表種類｜圖表區塊的種類改成帶縮圖的清單，只顯示這份資料適用的圖；Word 轉成圖片的提醒照舊。', edShell(`<h3 style="margin:0;font-size:var(--fs-lg)">對照條（圖表）</h3>${rail('圖表種類')}${FOR.報告回饋.map((k, i) => opt2(k, i === 0)).join('')}<span class="small muted">Word：轉為圖片。</span>`)));

// D67 恢復預設
F.push(E('D67 桌機：恢復預設｜頂端列「恢復預設」還原整份範本，要二次確認；區塊與頁面設定在各自面板局部還原。', edShell(`<h3 style="margin:0;font-size:var(--fs-lg)">對照條（圖表）</h3>${btn('還原這個區塊', 'secondary', { sm: true, icon: 'undo' })}`, modal(520, `${mhead('把整份範本恢復預設？')}<p style="margin:0;line-height:1.7">你對「三年二班 學生版回饋單」的修改都會還原成內建範本的樣子。要留一份，先按「另存範本」。</p>${mfoot(btn('取消', 'secondary'), btn('另存範本', 'secondary'), btn('恢復預設', 'danger'))}`))));

// D68 命名我的範本
F.push(E('D68 桌機：第一次修改內建範本｜內建範本不可改，第一次動手時自動複製成「我的範本」並請老師命名；名稱重複時提示。範本庫與編輯器都能叫出。', edShell(`<h3 style="margin:0;font-size:var(--fs-lg)">對照條（圖表）</h3>`, modal(520, `${mhead('存成我的範本')}<p class="small muted" style="margin:0">內建範本不會被改到。你的修改會存在這份新範本。</p><div class="field"><label for="tn">範本名稱</label><input class="input err" id="tn" value="三年二班 學生版回饋單"><span class="errmsg">已經有同名的範本，請換一個名稱。</span></div>${mfoot(btn('取消', 'secondary'), btn('開始編輯', 'primary', { dis: true }))}`))));

// D69 儲存位置
F.push(E('D69 桌機：已儲存在這個瀏覽器｜頂端列的狀態字可以點，說明範本存在哪裡，並提供備份入口。', edShell(`<h3 style="margin:0;font-size:var(--fs-lg)">對照條（圖表）</h3>`, `<div class="popov" style="left:236px;top:56px;width:380px;padding:14px;gap:8px"><b>存在這個瀏覽器</b><span class="small muted" style="line-height:1.7">範本只存在這台電腦的這個瀏覽器，換電腦或清除瀏覽資料就不見了。要留存或搬到別台電腦，請先備份。</span><div>${btn('備份與還原', 'secondary', { sm: true })}</div></div>`)));

write('frag-b20.html', F);
addPages({ id: 'desk-e', short: '桌機：圖表與自訂版面', name: '桌機-圖表與自訂版面', title: '桌機（1280）：圖表、權重、審稿輸出、自訂版面', intro: '2026-10-31 裁示新增的畫面：圖表清單與換圖、全部圖表、權重提示、單一學生圖表、模擬黑白、存成常用評語、編輯器圖表種類、恢復預設、我的範本。人名與數字皆為虛構。', frag: 'frag-b20.html' });
console.log(F.length);
