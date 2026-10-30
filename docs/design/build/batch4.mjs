import * as L from './lib.mjs';
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, grp, bar, steps, act, scr, sheet, frame, write } = L;

const file = `<div class="filechip">${ic('file')}<div><b>三年二班_幹部票選.xlsx</b><span>41 筆回覆 · 9 欄</span></div></div>`;
const h = (t, p) => `<div class="grp"><h1 style="font-size:var(--fs-xl)">${t}</h1>${p ? `<p class="small muted">${p}</p>` : ''}</div>`;
const picker = (dim) => `<button class="picker" type="button"${dim ? ' style="opacity:.5"' : ''}><span class="big">${ic('file')}</span><b>選擇檔案</b><small>支援 xlsx、csv。也可以從 Google 雲端硬碟選。</small></button>`;
const srcRow = (icon, nm, sm) => `<button class="opt" type="button" style="min-height:64px"><span style="color:var(--accent-ink)">${ic(icon)}</span><span style="display:flex;flex-direction:column;line-height:1.35"><b>${nm}</b><span style="font-size:var(--fs-xs);color:var(--ink2);font-weight:400">${sm}</span></span></button>`;

const F = [];

// ---- 1b 選檔來源
F.push(frame('1b 選檔來源｜點「選擇檔案」後由下往上彈出。三個來源各 64px 高，說明寫清楚：手機直接選、雲端硬碟走系統選檔視窗、專案檔還原上次的設定。',
  bar('問卷回饋小幫手', { brand: true, right: 'sliders' }), steps(1),
  scr(h('開啟問卷結果', '選擇 Google 表單匯出的檔案。') + picker(true)),
  act(btn('下一步：對應欄位', 'primary', { dis: true })),
  sheet('從哪裡選檔案？', '', srcRow('folder', '這支手機的檔案', '下載資料夾、檔案 App') + srcRow('cloud', 'Google 雲端硬碟', '在系統選檔視窗裡選「雲端硬碟」') + srcRow('list', '開啟專案檔', '還原之前存的欄位對應與設定（.json）'), btn('取消', 'secondary', { block: true }))));

// ---- 1c 讀取中
F.push(frame('1c 讀取中｜選好檔案後立刻顯示檔名與進度，並再說一次資料只在本機處理。讀取時「下一步」停用。',
  bar('問卷回饋小幫手', { brand: true, right: 'sliders' }), steps(1),
  scr(h('開啟問卷結果') + file.replace('41 筆回覆 · 9 欄', '正在讀取…') + `<div class="prog" role="progressbar" aria-valuenow="60"><i style="width:60%"></i></div><p class="small muted">讀取 41 筆回覆，通常幾秒內完成。</p>` + notice('', 'lock', '資料只在這支手機的瀏覽器處理，不會上傳。')),
  act(btn('下一步：對應欄位', 'primary', { dis: true }))));

// ---- 1d 讀不到檔案
F.push(frame('1d 讀不到檔案｜錯誤要說明哪裡錯、怎麼改，並直接給「重新選擇」與匯出教學。紅色提示加圖示與文字。',
  bar('問卷回饋小幫手', { brand: true, right: 'sliders' }), steps(1),
  scr(h('開啟問卷結果') + notice('bad', 'warn', '<b>讀不到「回覆.numbers」</b><br>目前只支援 xlsx 與 csv。<br>在 Google 表單的「回覆」頁選「下載回覆 (.csv)」，或在試算表選「檔案 → 下載 → Microsoft Excel (.xlsx)」。') + btn('重新選擇檔案', 'primary', { block: true, icon: 'refresh' }) + btn('怎麼從 Google 表單匯出？', 'ghost', { sm: true, icon: 'help', style: 'align-self:flex-start' })),
  act(btn('下一步：對應欄位', 'primary', { dis: true }))));

// ---- 1e 瀏覽器過舊
F.push(frame('1e 瀏覽器版本過舊｜頁面最上方的警示條，不擋住操作。說明影響與怎麼更新，老師可選擇繼續使用。',
  bar('問卷回饋小幫手', { brand: true, right: 'sliders' }), steps(1),
  scr(notice('warn', 'warn', '<b>你的瀏覽器版本較舊（iOS 15）</b><br>部分功能可能無法使用，例如輸出 PDF。建議更新到 iOS 16.4 以上，或改用最新的 Chrome、Safari。', btn('如何更新', 'secondary', { sm: true }) + btn('繼續使用', 'ghost', { sm: true })) + h('開啟問卷結果', '選擇 Google 表單匯出的檔案。') + picker(false)),
  act(btn('下一步：對應欄位', 'primary', { dis: true }))));

// ---- 2 準備資料總覽
F.push(frame('2 準備資料（總覽）｜第 2 步的入口：四件事各一列、各有狀態。必做的先排，選用的標「選用」，老師一眼知道還缺什麼。',
  bar('準備資料'), steps(2),
  scr(file + rowbtn('問卷類型', '票選幹部', tag('已確認', 'ok')) + rowbtn('欄位對應', '9 欄，2 欄請確認', tag('請確認', 'warn'), true) + rowbtn('學生名單', '找出沒填、冒名與重複', tag('選用'), false) + rowbtn('資料檢查', '重複、空白、無效票、格式異常', tag('3 項待處理', 'warn')) + notice('', 'info', '先完成「欄位對應」才能看統計。名單與資料檢查可以之後再做。'), 10),
  act(btn('上一步', 'secondary'), btn('下一步：看統計', 'primary', { dis: true }))));

// ---- 2a 問卷類型
F.push(frame('2a 問卷類型｜系統先猜，老師確認。每種類型用一句話講它會幫你做什麼，不用術語。',
  bar('問卷類型'), steps(2),
  scr(h('這是哪一種問卷？', '看起來像「票選幹部」，你可以更改。') + rcard('票選幹部 ' + tag('建議', 'accent'), '各職位得票與排名、同票抽籤、防弊檢查', true, 'min-height:76px') + rcard('意見調查', '單選、複選、量表、開放題、交叉分析', false, 'min-height:76px') + rcard('報告回饋', '以被評學生為單位：加權、去最高最低、自評對他評、小組互評', false, 'min-height:76px')),
  act(btn('上一步', 'secondary'), btn('確定', 'primary'))));

// ---- 2b 欄位對應（報告回饋）
F.push(frame('2b 欄位對應：報告回饋｜類型不同，欄位種類也不同：評分者、被評對象、評分項目（含權重）。權重即時加總，必須等於 100%。',
  bar('對應欄位'), steps(2),
  scr(tiles([['評分者', '41'], ['被評對象', '8 組'], ['權重合計', '100%']]) + rowbtn('姓名', '陳家豪、林雅婷…', tag('評分者', 'accent')) + rowbtn('被評組別', '第 1 組、第 3 組…', tag('被評對象', 'accent')) + rowbtn('內容完整', '5、4、4、3…', tag('量表 · 30%', 'accent')) + rowbtn('創意', '4、4、5、3…', tag('量表 · 25%', 'accent')) + rowbtn('表達', '4、5、4、4…', tag('量表 · 25%', 'accent')) + rowbtn('團隊合作', '5、5、4、4…', tag('量表 · 20%', 'accent')) + rowbtn('優點與建議', '報告條理清楚…', tag('開放題', 'accent')), 10),
  act(btn('上一步', 'secondary'), btn('下一步', 'primary'))));

// ---- 3a 名單匯入
const ta = `<div class="input" style="min-height:132px;height:auto;padding:10px 14px;line-height:1.7;font-size:var(--fs-sm);white-space:pre-line;color:var(--ink)">1 王大明\n2 林雅婷\n3 陳家豪\n4 黃思穎\n…</div>`;
F.push(frame('3a 匯入學生名單｜三種方式：貼上、開檔、略過。貼上時即時顯示辨識人數；名單只在記憶體，不會存起來。',
  bar('學生名單'), steps(2),
  scr(h('匯入學生名單', '用來找出沒填的人、冒名與打錯的名字。可以先略過。') + rcard('貼上名單', '每行一位：座號 姓名', true) + rcard('開啟名單檔', 'xlsx 或 csv，要有座號與姓名欄', false) + rcard('先略過', '之後想用再回來', false) + ta + `<p class="small muted">已辨識 <b>42</b> 位學生。</p>` + notice('', 'lock', '名單只在這支手機的記憶體裡，不會存起來，關閉頁面就清除。'), 10),
  act(btn('上一步', 'secondary'), btn('匯入名單', 'primary'))));

// ---- 3b 名單對照：未填
F.push(frame('3b 名單對照：未填｜四個數字先看全貌，分段切換問題類型。未填的人可複製名單去提醒同學。',
  bar('名單對照'), steps(2),
  scr(tiles([['已對應', 39], ['需確認', 2, 'warn'], ['未填', 1], ['重複', 1]]) + seg(['未填 1', '需確認 2', '重複 1', '全部'], 0) + rowbtn('23 號　吳家豪', '名單有、問卷沒有', tag('未填'), false, false) + btn('複製未填名單', 'secondary', { block: true, icon: 'copy' }) + `<p class="small muted">42 位學生中，41 位有填答。收到 42 份表單，其中 1 份是重複填答。</p>`, 12),
  act(btn('上一步', 'secondary'), btn('完成對照', 'primary'))));

// ---- 3c 名單對照：需確認
const cand = (said, near, no) => `<div class="qcard" style="gap:10px;padding:12px 14px"><div><div class="small muted">填答的名字</div><b style="font-size:var(--fs-lg)">${said}</b></div><div class="notice" style="grid-template-columns:auto 1fr">${ic('users')}<div>名單裡最接近：<b>${near}</b></div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn('是同一人', 'primary', { sm: true })}${btn('不是，另選', 'secondary', { sm: true })}${btn('排除這筆', 'ghost', { sm: true })}</div></div>`;
F.push(frame('3c 名單對照：需確認｜打錯名字或冒名的情況。系統猜最接近的人，老師一鍵確認，不用自己查。',
  bar('名單對照'), steps(2),
  scr(tiles([['已對應', 39], ['需確認', 2, 'warn'], ['未填', 1], ['重複', 1]]) + seg(['未填 1', '需確認 2', '重複 1', '全部'], 1) + cand('王小明', '王大明（1 號）') + cand('林雅挺', '林雅婷（2 號）'), 12),
  act(btn('上一步', 'secondary'), btn('完成對照', 'primary', { dis: true }))));

// ---- 4 資料檢查
const iss = (nm, sm, t) => rowbtn(nm, sm, tag(t, 'warn'));
F.push(frame('4a 資料檢查｜把可疑的資料集中列出，由老師決定怎麼處理。每一類各一列，點進去處理；處理完會移到「已處理」。',
  bar('資料檢查'), steps(2),
  scr(tiles([['待處理', 3, 'warn'], ['已處理', 0], ['已忽略', 0]]) + `<div class="grp"><span class="gl">需要你決定</span>${iss('重複填答', '陳家豪（5 號）填了 2 份', '1 人')}${iss('時間戳異常', '3 秒內連續送出', '2 份')}${iss('格式異常', '量表欄出現 6，超出 1–5', '1 筆')}</div><div class="grp"><span class="gl">沒有發現</span>${rowbtn('空白答案', '每題都有答案', tag('正常', 'ok'), false, false)}${rowbtn('無效票', '沒有選到不存在的選項', tag('正常', 'ok'), false, false)}</div>`, 12),
  act(btn('上一步', 'secondary'), btn('下一步：看統計', 'primary'))));

F.push(frame('4b 處理重複填答｜底部彈出面板，說明兩份的時間與差異，三個處理方式單選。預設「保留最後一份」，並寫明理由。',
  bar('資料檢查'), steps(2),
  scr(tiles([['待處理', 3, 'warn'], ['已處理', 0], ['已忽略', 0]]) + iss('重複填答', '陳家豪（5 號）填了 2 份', '1 人'), 12),
  act(btn('上一步', 'secondary'), btn('下一步：看統計', 'primary')),
  sheet('陳家豪（5 號）填了 2 份', '10/12 13:02 與 13:05。兩份的答案有 1 題不同。', opt('保留最後一份', true, '建議') + opt('保留最早一份') + opt('兩份都排除'), btn('套用', 'primary', { block: true }))));

write('frag-b4.html', F);
console.log(F.length);
