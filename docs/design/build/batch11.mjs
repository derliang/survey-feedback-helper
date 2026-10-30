import fs from 'node:fs';
import * as L from './lib.mjs';
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, grp, bar, steps, act, scr, sheet, frame, write, field, brow } = L;

const nav = btn('上一步', 'secondary');
const tgl = (label, sub, on) => `<button class="tgl" role="switch" aria-checked="${on}" type="button"><span style="text-align:left"><b style="display:block">${label}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</span><span class="sw2"></span></button>`;
const fchip = (icon, b, s) => `<div class="filechip">${ic(icon)}<div><b>${b}</b><span>${s}</span></div></div>`;
const sbtns = (...b) => `<div style="display:flex;gap:8px;margin-top:12px">${b.join('')}</div>`;
const half = (t, kind = 'secondary') => btn(t, kind, { style: 'flex:1' });
const LK = ['非常不同意', '不同意', '普通', '同意', '非常同意'];

// ======== 票選防弊與統計設定 ========
const A = [];

A.push(frame('11a 防弊檢查｜票選專用。系統只「列出可疑」，由老師決定怎麼算；每一項寫明有幾筆、預設怎麼處理。處理完才能看正式結果。',
  bar('防弊檢查', { right: 'help' }), steps(3),
  scr(tiles([['收到', 42], ['已決定', 3], ['待處理', 1, 'warn']]) +
    rowbtn('同一人投了多次', '1 位同學有 2 份回覆', tag('請處理', 'warn'), true) +
    rowbtn('自己投自己', '3 人 · 班級選舉可投自己，計入', tag('已決定', 'ok')) +
    rowbtn('時間異常', '2 份 3 秒內連續送出 · 保留並標示', tag('已決定', 'ok')) +
    rowbtn('空白票', '1 張 · 標示，不算任何人', tag('已決定', 'ok')) +
    notice('', 'info', '處理的決定會寫進「計票明細」，之後可重現同樣的結果。'), 10),
  act(nav, btn('下一步：看結果', 'primary', { dis: true }))));

A.push(frame('11b 同人多票｜把同一位同學的兩份並排，直接看出投的人不同。預設「只算最後一份」並寫明理由；也能兩份都不算。',
  bar('防弊檢查', { right: 'help' }), steps(3),
  scr(tiles([['收到', 42], ['已決定', 3], ['待處理', 1, 'warn']]) + rowbtn('同一人投了多次', '1 位同學有 2 份回覆', tag('處理中', 'warn'), true), 10),
  act(nav, btn('下一步：看結果', 'primary', { dis: true })),
  sheet('趙子安（17 號）投了 2 份', '兩份投的班長不同，請決定怎麼算。',
    `<div class="qcard" style="gap:4px;margin-top:6px"><div class="small muted">10:12 · 第一份</div><div>班長 → <b>陳怡安</b>　副班長 → <b>王品妍</b></div></div><div class="qcard" style="gap:4px;margin-top:6px"><div class="small muted">10:31 · 第二份</div><div>班長 → <b>林小宇</b>　副班長 → <b>王品妍</b></div></div><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${rcard('只算最後一份', '同學通常是改變心意，以最後為準', true)}${rcard('只算第一份', '', false)}${rcard('兩份都不算', '', false)}</div>`,
    sbtns(half('取消'), half('套用', 'primary')))));

A.push(frame('11c 計票規則｜幾條規則用開關與分段控制呈現，說清楚影響什麼。限投一票、自投是否計入、候補人數、同票處理，改了結果會即時重算。',
  bar('計票規則'),
  scr(tgl('每人每職位限投一票', '同職位投 2 人的整份該職位視為無效', true) + tgl('自己投自己計入', '班級選舉預設計入；關閉後自投不計', true) + tgl('排除時間異常的回覆', '預設只標示、保留，不影響票數', false) +
    grp('候補名額', chips(['0 人', '1 人', '2 人'], 1)) +
    grp('同票時', rcard('抽籤決定', '記錄隨機種子，可重現', true) + rcard('由老師手動指定', '不抽籤，自己選', false)) +
    notice('', 'info', '改規則後，統計與計票明細會立刻重新計算。'), 12),
  act(nav, btn('完成', 'primary'))));

A.push(frame('11d 量表標籤｜量表題的 1–5 分要顯示成什麼字。先給常見預設，也能自訂；標籤即時預覽在圖表上，且每個分數都標明數字，不只靠文字。',
  bar('量表標籤'),
  scr(grp('套用預設', chips(['同意程度', '滿意度', '頻率', '自訂'], 0)) +
    `<div class="qcard" style="gap:10px">${LK.map((t, i) => `<div style="display:flex;align-items:center;gap:10px"><b class="mono" style="width:1.2em">${i + 1}</b><div class="input" style="flex:1;min-height:44px;display:flex;align-items:center">${t}</div></div>`).join('')}</div>` +
    grp('預覽', brow('1 ' + LK[0], 0, 0) + brow('4 ' + LK[3], 13, 32) + brow('5 ' + LK[4], 22, 54, 'lead')), 12),
  act(nav, btn('套用到所有量表題', 'primary'))));

A.push(frame('11e 反向計分｜問法相反的題目（例如「時間太趕」）要把分數倒過來。勾選哪些題是反向，並預覽倒過來後的平均，避免老師忘記而算錯。',
  bar('反向計分'),
  scr(`<p class="small muted">反向題的分數會換成「6 − 原分數」，再計算平均與分布。原始資料不會被修改。</p>` +
    tgl('第 3 題　分組讓我有機會表達', '', false) + tgl('第 5 題　活動時間太趕', '平均 3.8 → 2.2', true) + tgl('第 6 題　場地讓我不舒服', '平均 3.5 → 2.5', true) +
    notice('warn', 'warn', '第 6 題標為反向後，總平均會跟著改變。若不確定，請回到題目文字確認。') +
    `<div class="qcard" style="gap:4px"><b>輸出文件上會標示</b><div class="small">「第 5、6 題為反向計分」，讓看報告的人知道數字的意思。</div></div>`, 12),
  act(nav, btn('套用', 'primary'))));

const likert = [0, 1, 5, 13, 22].map((c, i) => 4 - i).map((i) => { const c = [0, 1, 5, 13, 22][i]; const p = Math.round((c / 41) * 100); return `<div class="brow"><div class="h"><span class="nm">${i + 1} ${LK[i]}</span><span class="v"><b>${c}</b> 人 · ${p}%</span></div><div class="track"><i style="width:${p}%"></i></div></div>`; }).join('');
A.push(frame('11f 圖表另存圖片｜每張圖表可另存成圖片，放進簡報或通知。預設白底（印刷與投影都清楚）、含標題與題目；透明背景給進階使用。',
  bar('統計結果', { right: 'help' }), steps(3),
  scr(`<div><div class="small muted">第 2 題 ／ 9 · 量表</div><h2 style="margin:0;font-size:var(--fs-xl)">活動內容有趣</h2></div><div class="qcard" style="gap:12px">${likert}</div>`, 12),
  act(nav, btn('下一步：輸出', 'primary')),
  sheet('另存圖表', '「活動內容有趣」的分布圖',
    `<div style="display:flex;flex-direction:column;gap:10px;margin-top:6px"><div class="grp"><span class="gl">格式</span>${chips(['PNG 圖片', 'SVG 向量'], 0)}</div><div class="grp"><span class="gl">大小</span>${chips(['一般 1200px', '清晰 2400px'], 0)}</div><div class="grp"><span class="gl">背景</span>${chips(['白底', '透明'], 0)}</div>${tgl('含標題與題目', '', true)}</div>`,
    sbtns(half('存到手機'), half('分享…', 'primary')))));
write('frag-b11.html', A);

// ======== 系統與狀態 ========
const B = [];

B.push(frame('12a 安裝到主畫面｜加入主畫面不是必要，只是更方便、可離線。給 iPhone 與 Android 各一組步驟（步驟有先後才用編號），不彈出擋路的橫幅。',
  bar('安裝到主畫面'),
  scr(seg(['iPhone／iPad', 'Android'], 0, '裝置') +
    `<div class="qcard" style="gap:10px"><b>好處</b><div class="small">桌面有圖示、全螢幕開啟、沒有網路也能用</div></div><div class="qcard" style="gap:10px"><b>步驟（Safari）</b><ol style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:10px"><li>點下方工具列的「分享」圖示</li><li>往下捲，選「加入主畫面」</li><li>點右上角「新增」</li></ol></div>` +
    notice('', 'info', '請用 Safari 開啟；在其他 App 內建的瀏覽器看不到「加入主畫面」。'), 12),
  act(btn('我知道了', 'primary', { block: true }))));

B.push(frame('12b 離線與已就緒｜裝完或快取完成時顯示一次「已可離線使用」。離線時頁首出現淡色提示：統計與輸出照常，只有雲端硬碟不能用。',
  bar('準備資料', { right: 'help' }),
  `<div class="notice" style="border-radius:0;border-left:0;border-right:0"><svg class="ic"><use href="#i-info"/></svg><div>目前沒有網路。統計與輸出照常可用，Google 雲端硬碟暫時不能用。</div></div>` + steps(2),
  scr(notice('ok', 'check', '已可離線使用。下次沒有網路也能打開。') + rowbtn('問卷類型', '票選幹部', tag('已確認', 'ok')) + rowbtn('欄位對應', '已完成', tag('已確認', 'ok')) + rowbtn('Google 雲端硬碟', '離線時無法使用', tag('離線'), false, false) + rowbtn('資料檢查', '3 項待處理', tag('請處理', 'warn'), true), 10),
  act(nav, btn('下一步：看統計', 'primary'))));

B.push(frame('12c 有新版本｜更新會重新載入頁面、資料會清掉，所以資料已載入時主動作是「先輸出」，更新排在後面；沒載入資料時才直接更新。',
  bar('統計結果', { right: 'help' }), steps(3),
  scr(`<div><div class="small muted">第 2 題 ／ 9 · 量表</div><h2 style="margin:0;font-size:var(--fs-xl)">活動內容有趣</h2></div><div class="qcard" style="gap:12px">${likert}</div>`, 12),
  act(nav, btn('下一步：輸出', 'primary')),
  sheet('有新版本可以更新', 'v0.2.0 · 11/12', `<div style="display:flex;flex-direction:column;gap:10px;margin-top:6px"><ul class="small" style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px"><li>新增票選防弊檢查</li><li>手機編輯器可長按拖曳區塊</li><li>修正量表平均的小數進位</li></ul>${notice('warn', 'warn', '更新會重新載入頁面，目前載入的資料不會保留。')}</div>`,
    `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">${btn('先輸出，再更新', 'primary', { block: true })}${btn('稍後再說', 'secondary', { block: true })}${btn('現在更新（資料會清掉）', 'ghost', { block: true })}</div>`)));

B.push(frame('12d 隱私與關於｜白話說明資料怎麼處理，並把授權、第三方元件與原始碼連結放在這裡。沒有「分析使用數據」的選項，因為本來就不蒐集。',
  bar('隱私與關於'),
  scr(`<div class="qcard" style="gap:8px"><b>你的資料</b><div class="small">問卷檔只在這支手機的瀏覽器處理，不會上傳，關閉頁面就清除。這個網站只在本機存設定與範本，不蒐集任何使用數據。</div></div>` +
    notice('', 'lock', '輸出檔含學生資料，請依學校的個資規範保管，不要放在公開的雲端位置。') +
    rowbtn('版本與更新紀錄', 'v0.1.0', '', false, true) + rowbtn('授權', 'GPL-3.0（開放原始碼）', '', false, true) + rowbtn('第三方元件授權', '所有套件與字型的授權清單', '', false, true) + rowbtn('原始碼與回報問題', 'GitHub', '', false, true), 12),
  act(btn('回到設定', 'secondary', { block: true }))));

B.push(frame('12e 第一次載入｜第一次需要下載約 1.2 MB，之後可離線。用骨架與進度說明在等什麼，不用旋轉圖示；有進度數字，也告知之後不用再等。',
  `<div class="appbar"><span class="brand">${ic('bars')}</span><span class="ttl">問卷回饋小幫手</span></div>`,
  scr(`<div class="grp"><h1 style="font-size:var(--fs-xl)">正在準備…</h1><p class="small muted">第一次開啟需要下載約 1.2 MB，之後沒有網路也能用。</p></div><div class="prog" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100"><i style="width:45%"></i></div><div class="small muted">已下載 45%</div>` +
    ['52', '96', '72'].map((h) => `<div class="qcard" style="gap:8px"><div style="height:14px;width:40%;border-radius:6px;background:var(--sunk)"></div><div style="height:${h - 40 > 0 ? 14 : 14}px;width:90%;border-radius:6px;background:var(--sunk)"></div><div style="height:14px;width:65%;border-radius:6px;background:var(--sunk)"></div></div>`).join('') +
    notice('', 'lock', '載入的是網頁程式本身，不含任何學生資料。'), 14)));

B.push(frame('12f 清除本機設定｜「清除」影響範圍要講清楚：會刪設定、範本與檔案存取代號；不影響已輸出的檔案。建議先備份，主動作是「先備份」。',
  bar('設定'),
  scr(rowbtn('備份與還原', '匯出設定與範本', '', false, true) + rowbtn('清除本機資料', '把這個瀏覽器記住的設定全部清掉', tag('進階'), false, true), 12),
  act(btn('回到首頁', 'secondary', { block: true })),
  sheet('清除這個瀏覽器的設定？', '無法復原。',
    `<div style="display:flex;flex-direction:column;gap:10px;margin-top:6px"><div class="qcard" style="gap:6px"><b>會刪除</b><div class="small">全域預設、你的範本、檔名規則、關鍵字清單、記住的檔案位置</div><b>不會影響</b><div class="small">已輸出的檔案、雲端硬碟裡的檔案</div></div>${notice('warn', 'warn', '建議先「備份與還原」匯出設定，之後才能還原。')}</div>`,
    `<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">${btn('先備份', 'primary', { block: true })}${btn('確定清除', 'danger', { block: true })}${btn('取消', 'secondary', { block: true })}</div>`)));
write('frag-b12.html', B);

// ---- 登記到 pages.json
const pj = L.sp + '/pages.json';
const pages = JSON.parse(fs.readFileSync(pj, 'utf8'));
const add = (o) => { const i = pages.findIndex((p) => p.id === o.id); if (i >= 0) pages[i] = o; else pages.push(o); };
add({ id: 'flow-guard', short: '票選防弊與設定', name: '手機-票選防弊與統計設定', title: '票選防弊與統計設定（手機）', intro: '防弊檢查、同人多票處理、計票規則、量表標籤、反向計分、圖表另存圖片。', frag: 'frag-b11.html' });
add({ id: 'flow-sys', short: '系統與狀態', name: '手機-系統與狀態', title: '安裝、離線、更新、隱私與清除（手機）', intro: '安裝到主畫面、離線提示、新版本、隱私與關於、第一次載入、清除本機設定。', frag: 'frag-b12.html' });
fs.writeFileSync(pj, JSON.stringify(pages, null, 2));
console.log(A.length, B.length);
