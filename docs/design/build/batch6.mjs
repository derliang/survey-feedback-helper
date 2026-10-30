import fs from 'node:fs';
import * as L from './lib.mjs';
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, grp, bar, steps, act, scr, sheet, frame, write, field } = L;

const nav = btn('上一步', 'secondary');
const h = (t, p) => `<div class="grp"><h1 style="font-size:var(--fs-xl)">${t}</h1>${p ? `<p class="small muted">${p}</p>` : ''}</div>`;
const tgl = (label, sub, on) => `<button class="tgl" role="switch" aria-checked="${on}" type="button"><span style="text-align:left"><b style="display:block">${label}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</span><span class="sw2"></span></button>`;
const ta = (v, min = 96) => `<div class="input" style="min-height:${min}px;height:auto;padding:10px 14px;line-height:1.7;font-size:var(--fs-md);white-space:pre-line">${v}</div>`;
const F = [];

// ---- 老師審稿
const cm = (text, kind, state, warn) => `<div class="qcard" style="gap:8px;padding:12px 14px${state === '隱藏' ? ';opacity:.6' : ''}"><div style="display:flex;gap:6px;flex-wrap:wrap">${tag(kind, kind === '優點' ? 'ok' : 'accent')}${warn ? tag('提醒：含「笨」', 'bad') : ''}${state ? tag(state, state === '採用' ? 'ok' : '') : ''}</div><div style="line-height:1.6">${text}</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${['採用', '隱藏', '改寫'].map((a) => `<button class="btn btn-${a === state ? 'primary' : 'secondary'} btn-sm" type="button" style="padding:0">${a}</button>`).join('')}</div></div>`;
F.push(frame('6a 老師審稿｜留言逐則「採用／隱藏／改寫」，三個按鈕各 44px 高、等寬。含關鍵字的留言加紅色提醒；系統只提醒，不做智慧判斷。',
  bar('老師審稿', { right: 'users' }), steps(4),
  scr(tiles([['待審', 2, 'warn'], ['採用', 2], ['隱藏', 1]]) + `<div class="pager"><button class="icbtn" type="button" aria-label="上一位">${ic('back')}</button><div class="c"><small>第 6 位 ／ 41 位</small><b>林小宇</b></div><button class="icbtn" type="button" aria-label="下一位">${ic('next')}</button></div>` + cm('報告條理清楚，圖表很好懂。', '優點', '採用') + cm('他講話有點笨拙，但是很認真。', '建議', '', true) + cm('可以多放一個生活裡的例子。', '建議', '採用'), 10),
  act(nav, btn('下一位', 'primary'))));

F.push(frame('6b 改寫留言｜點「改寫」開底部面板，顯示原文與可編輯的版本。改寫過的留言在教師版標示「老師改寫」，學生版看不到差別。',
  bar('老師審稿', { right: 'users' }), steps(4),
  scr(tiles([['待審', 2, 'warn'], ['採用', 2], ['隱藏', 1]]) + cm('他講話有點笨拙，但是很認真。', '建議', '', true), 10),
  act(nav, btn('下一位', 'primary')),
  sheet('改寫留言', '原文：他講話有點笨拙，但是很認真。', `<div class="field" style="margin-top:8px"><label for="rw">改寫後的內容</label>${ta('講話可以再慢一點、再有條理，但是看得出來很認真。', 112)}<span class="hint">學生版看到的是改寫後的內容。</span></div>`, `<div style="display:flex;gap:8px;margin-top:12px">${btn('取消', 'secondary', { style: 'flex:1' })}${btn('儲存並採用', 'primary', { style: 'flex:1' })}</div>`)));

F.push(frame('6c 老師評語與關鍵字｜每位學生一個評語欄，可套用常用評語。關鍵字清單由老師自訂，用於留言提醒。',
  bar('老師評語'), steps(4),
  scr(`<div class="filechip">${ic('users')}<div><b>林小宇（6 號）</b><span>評語會出現在學生版與家長版</span></div></div><div class="field"><label for="cm">老師的話</label>${ta('小宇，這次報告看得出你很用心，也很願意照顧組員。下次試著把一個生活例子放進去。', 140)}<span class="hint">86 字 · 可使用 {姓名}、{總分}</span></div>` + grp('常用評語', chips(['很用心', '再多舉例', '勇於發表', '合作愉快'], -1)) + rowbtn('關鍵字提醒', '5 個詞：笨、白痴、討厭…', tag('編輯', 'accent')), 12),
  act(nav, btn('儲存', 'primary'))));

// ---- 輸出進度與完成
const pr = (t, s) => `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:var(--fs-md);${s === 'wait' ? 'color:var(--ink3)' : ''}"><span style="display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;flex:none;${s === 'done' ? 'background:var(--ok);color:var(--card)' : s === 'now' ? 'border:2px solid var(--accent)' : 'border:2px solid var(--line)'}">${s === 'done' ? ic('check') : ''}</span><span style="${s === 'now' ? 'font-weight:700' : ''}">${t}</span></div>`;
F.push(frame('7a 輸出進度｜逐項顯示進度（已完成、進行中、等待）。手機提醒不要切換頁面、保持螢幕開啟；可以取消。',
  bar('輸出中', { noback: true, right: null }), steps(4),
  scr(h('正在產生個人回饋單', '學生版 · PDF · 41 人') + `<div class="prog" role="progressbar" aria-valuenow="68"><i style="width:68%"></i></div><p class="small"><b>28</b>／41 份　約剩 10 秒</p>` + `<div class="qcard" style="gap:0;padding:6px 14px">${pr('準備字型', 'done')}${pr('計算統計與圖表', 'done')}${pr('產生 PDF（28／41）', 'now')}${pr('打包成 zip', 'wait')}</div>` + notice('warn', 'warn', '請先不要切換或關閉這個頁面，並讓螢幕保持開啟。')),
  act(btn('取消', 'secondary', { block: true }))));

F.push(frame('7b 輸出完成｜成功提示加檔案卡（檔名、大小、內容）。主要動作是「下載」，手機另有「分享」走系統分享面板（可存到雲端硬碟）。提醒保管個資。',
  bar('輸出完成', { noback: true, right: null }), steps(4),
  scr(notice('ok', 'check', '<b>已產生 41 份個人回饋單</b>') + `<div class="qcard" style="gap:6px"><div style="display:flex;gap:10px;align-items:center">${ic('file')}<div style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">三年二班_回饋單_學生版.zip</b><span class="small muted">41 個 PDF · 3.3 MB</span></div></div></div>` + btn('下載', 'primary', { block: true, icon: 'down-arrow' }) + btn('分享…', 'secondary', { block: true }) + notice('', 'lock', '檔案含學生資料，請依學校規範保管，不要放在公開的地方。'), 12),
  act(btn('再輸出其他版本', 'secondary'), btn('完成', 'primary'))));

F.push(frame('7c 檔名規則與去識別化｜輸出頁「進階」展開的面板。檔名用變數組成並即時預覽；去識別化把姓名換成代號，另存對照表。',
  bar('輸出'), steps(4),
  scr(h('輸出') + `<div class="qcard"><div class="small muted">進階設定</div></div>`, 12),
  act(nav, btn('產生並下載', 'primary')),
  sheet('檔名與去識別化', '', `<div style="display:flex;flex-direction:column;gap:12px;padding:6px 0 4px"><div class="field"><label for="fn">檔名規則</label><input class="input mono" id="fn" value="{班級}_{座號}_{姓名}_回饋單"><span class="hint">預覽：三年二班_06_林小宇_回饋單.pdf</span></div>${chips(['{班級}', '{座號}', '{姓名}', '{日期}'], -1)}${tgl('去識別化匯出', '姓名換成代號（如 S06），另存對照表', true)}<p class="small muted">對照表是一個獨立檔案，只有你保管。</p></div>`, btn('套用', 'primary', { block: true }))));

// ---- 設定
F.push(frame('8a 設定首頁｜分組列表：外觀、預設值、關鍵字、檔案與儲存、備份與還原、隱私。每列可點，右側顯示目前值。',
  bar('設定'), `<div class="scr" style="gap:10px">${rowbtn('外觀', '深色模式', tag('跟隨系統'))}${rowbtn('全域預設', '量表標籤、版面主題、校名 Logo', '')}${rowbtn('問卷類型範本', '票選幹部、意見調查、報告回饋', '')}${rowbtn('關鍵字提醒', '審稿時提醒的詞', tag('5 個'))}${rowbtn('檔案與儲存位置', '下載、系統分享、雲端硬碟', '')}${rowbtn('備份與還原', '匯出、匯入設定與專案檔', '')}${rowbtn('隱私與資料說明', '資料只在你的瀏覽器處理', '')}${rowbtn('關於', '版本、授權（GPL-3.0）、第三方套件', '')}</div>`));

F.push(frame('8b 預設值與三層覆寫｜設定有三層：全域預設 → 問卷類型範本 → 本次覆寫。每項顯示目前值來自哪一層，被覆寫的標出來，避免老師不知道為什麼值不同。',
  bar('預設值'), `<div class="scr" style="gap:12px">${seg(['全域預設', '問卷範本', '本次'], 2, '層級')}${notice('', 'info', '本次輸出的設定。只影響這一次，不會改到預設值。')}${rowbtn('量表標籤', '非常不同意 … 非常同意', tag('來自全域'))}${rowbtn('版面主題', '溫暖', tag('來自範本'))}${rowbtn('學生版顯示他人姓名', '否（匿名）', tag('本次覆寫', 'warn'), true)}${rowbtn('檔名規則', '{班級}_{座號}_{姓名}_回饋單', tag('來自全域'))}${btn('還原為範本的值', 'ghost', { sm: true, icon: 'undo', style: 'align-self:flex-start' })}</div>`, act(nav, btn('完成', 'primary'))));

F.push(frame('8c 備份與還原｜設定與專案檔分開：設定檔含範本、權重、關鍵字；專案檔另含資料來源與欄位對應。兩者都不含學生資料。舊版設定自動轉換並告知。',
  bar('備份與還原'), `<div class="scr" style="gap:12px">${notice('', 'lock', '備份檔不含任何學生資料或問卷內容。')}${btn('匯出設定', 'secondary', { block: true, icon: 'down-arrow' })}${btn('匯入設定', 'secondary', { block: true, icon: 'folder' })}${notice('ok', 'check', '這份設定來自舊版 v0.2，已自動轉換為目前版本。')}<div class="grp"><span class="gl">專案檔</span><p class="small muted">存下欄位對應與設定，下學期開同一種問卷時可以直接還原。</p>${btn('存成專案檔', 'secondary', { block: true })}</div></div>`));

// ---- 教學
const tip = (n, t, d) => `<div class="qcard" style="gap:4px;padding:12px 14px"><div style="display:flex;gap:10px;align-items:baseline"><b style="color:var(--accent-ink);font-variant-numeric:tabular-nums">${n}</b><b>${t}</b></div><div class="small" style="color:var(--ink2);line-height:1.6">${d}</div></div>`;
F.push(frame('9 設計 Google 表單的小技巧｜教學頁：照著做，問卷才好分析。步驟有先後才用編號。附範本表單（開新分頁到 Google，不會傳送任何資料）。',
  bar('Google 表單設計'), `<div class="scr" style="gap:10px">${h('怎麼設計才好分析', '五個小技巧，照順序做就好。')}${tip(1, '第一題放「姓名」', '用下拉式選單選名字，就不會有人打錯或冒名。')}${tip(2, '評分用「線性刻度」', '設定 1 到 5，並寫上兩端的意思，統計才能算平均。')}${tip(3, '複選用「核取方塊」', '系統會算每個選項的人數與比例。')}${tip(4, '開放題放最後', '留言多半是選填，放後面不影響前面的統計。')}${tip(5, '下載回覆', '在「回覆」頁選「下載回覆 (.csv)」，再回到這裡開啟。')}${btn('開啟範本表單', 'secondary', { block: true, icon: 'file' })}</div>`));

// ---- 空白與錯誤
F.push(frame('10a 空白狀態｜沒有可統計的題目。說明為什麼、下一步做什麼，直接給回到對應欄位的按鈕。不放插圖或笑臉。',
  bar('統計結果', { right: 'sliders' }), steps(3),
  scr(`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:0 12px"><div class="big" style="display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:var(--accent-soft);color:var(--accent-ink)">${ic('list')}</div><h2 style="font-size:var(--fs-lg)">還沒有可以統計的題目</h2><p class="small muted" style="max-width:28ch">所有欄位都被設成「略過」或「開放題」。請回到「對應欄位」，把題目改成單選、複選或量表。</p>${btn('回到對應欄位', 'primary')}</div>`),
  act(nav, btn('下一步：輸出', 'primary', { dis: true }))));

F.push(frame('10b 輸出失敗｜說明原因（手機記憶體不足），並給兩個替代做法：分批輸出、改輸出 Excel。錯誤訊息不道歉、不嚇人。',
  bar('輸出'), steps(4),
  scr(notice('bad', 'warn', '<b>產生到第 27 份時中斷</b><br>這支手機的記憶體不夠一次處理 41 份。已完成的 26 份保留，不會遺失。') + rcard('分批輸出', '每次 20 份，分 3 批', true) + rcard('改輸出 Excel', '一個檔案含全班統計，檔案較小', false) + notice('', 'info', '在電腦上通常不會遇到這個問題。'), 12),
  act(nav, btn('繼續', 'primary'))));

F.push(frame('10c 離開前確認｜資料不落地，所以關閉前要提醒：輸出的檔案要先下載。面板用白話說明後果，主動作是「先輸出」。',
  bar('統計結果', { right: 'sliders' }), steps(3),
  scr(tiles([['回覆', 41], ['題目', 9], ['需檢查', 0]]) + seg(['題目', '交叉', '留言'], 0), 12),
  act(nav, btn('下一步：輸出', 'primary')),
  sheet('現在離開嗎？', '', `<p style="padding:8px 0 4px;line-height:1.7">問卷資料不會被保存，離開後要重新開啟檔案。<br>如果還沒有輸出，建議先輸出。</p>`, `<div style="display:flex;gap:8px;margin-top:8px">${btn('離開', 'danger', { style: 'flex:1' })}${btn('先輸出', 'primary', { style: 'flex:1' })}</div>`)));

write('frag-b6.html', F);
const css = fs.readFileSync(L.sp + '/doc.css', 'utf8');
if (!css.includes('.tgl{')) fs.appendFileSync(L.sp + '/doc.css', `
.tgl{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:56px;padding:8px 14px;background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);width:100%;font:inherit;color:var(--ink);cursor:pointer}
.tgl .sw2{width:52px;height:32px;border-radius:16px;background:var(--ink3);position:relative;flex:none}
.tgl .sw2::after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:var(--card);transition:left var(--dur)}
.tgl[aria-checked="true"] .sw2{background:var(--accent)}
.tgl[aria-checked="true"] .sw2::after{left:23px;background:var(--on-accent)}
`);
console.log(F.length);
