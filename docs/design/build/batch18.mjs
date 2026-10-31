// 桌機補完 C：編輯器、範本庫、專案檔（D33–D43）
import * as K from './deskkit.mjs';
const { W, L, editorBar, frameWH, D, side, main, rside, nav, modal, mhead, mfoot, round, centered, rail, fbox, h, th, td, nvr, tgl, body, pane, flex1, foot, fchip, kbd, tag, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, ic, icbtn, grp, addPages, write, field } = K;
const F = [];
const mp = (k, extra = '') => `<div style="position:relative;width:${Math.round(794 * k)}px;height:${Math.round(1123 * k)}px;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff;box-shadow:0 4px 14px var(--shadow-sm);flex:none"><div style="width:794px;transform:scale(${k});transform-origin:0 0;pointer-events:none">${W.page}</div>${extra}</div>`;
const box = (k, x, y, w, hh) => `<div style="position:absolute;left:${Math.round(x * k) - 3}px;top:${Math.round(y * k) - 3}px;width:${Math.round(w * k) + 6}px;height:${Math.round(hh * k) + 6}px;border:2px solid var(--accent);border-radius:4px;background:color-mix(in srgb,var(--accent) 6%,transparent)"></div>`;
const blk = (icon, nm, cur, extra = '') => `<div style="display:flex;align-items:center;min-height:48px;gap:8px;padding:0 8px;border-radius:var(--r-sm);${cur ? 'background:var(--accent-soft);color:var(--accent-ink);font-weight:700;' : ''}${extra}"><span style="color:var(--ink3);width:20px">${ic('grip')}</span><span>${ic(icon)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</span></div>`;
const BL = [['type', '標題區'], ['table', '摘要數字列'], ['comment', '稱讚提示'], ['bars', '對照條'], ['table', '自評對照表'], ['comment', '同學的話'], ['type', '老師的話']];
const blocks = (cur) => BL.map(([i, n], k) => blk(i, n, k === cur)).join('');
const fl = (v, label) => `<button class="tgl" role="switch" aria-checked="${v}" type="button"><b>${label}</b><span class="sw2"></span></button>`;
const editor = (rp, o = {}) => `${o.banner || ''}${editorBar()}<div style="flex:1;min-height:0;display:flex">${pane(260, o.left || `${rail('區塊')}${blocks(o.cur ?? 3)}${btn('加入區塊', 'secondary', { sm: true, icon: 'plus' })}`, 'padding:12px;border-right:1px solid var(--line-soft);background:var(--card)')}<div style="flex:1;min-width:0;display:grid;place-items:start center;padding:20px;background:var(--sunk);overflow:hidden">${mp(0.7, o.sel ?? box(0.7, 53, 597, 688, 196))}</div>${pane(320, rp, 'padding:16px;border-left:1px solid var(--line-soft);background:var(--card)')}</div><div style="display:flex;gap:16px;align-items:center;padding:8px 16px;border-top:1px solid var(--line-soft);background:var(--card);font-size:var(--fs-sm);color:var(--ink2)"><span>${kbd('Ctrl')}+${kbd('Z')} 復原</span><span>${kbd('Delete')} 刪除區塊</span><span>${kbd('↑')} ${kbd('↓')} 移動區塊</span><span style="margin-left:auto">第 1／2 頁</span></div>`;
const E = (cap, inner) => frameWH(cap, 1280, 800, inner);

// D33 屬性：文字區塊
F.push(E('D33 桌機：編輯器・文字區塊屬性｜右側屬性依區塊類型而定。變數用籌碼一點插入；樣式（字級、對齊、底色）用分段控制與籌碼；「條件顯示」讓區塊只在符合時出現。滑鼠可在頁面上雙擊直接改字。',
  editor(`<h3 style="margin:0;font-size:var(--fs-lg)">稱讚提示（文字）</h3><div class="field"><label for="tx">內容</label><div class="input" id="tx" style="min-height:92px;padding:12px;line-height:1.7">你的強項：{最強項目}。同學給你 {最強分數} 分，比全班平均高 {差距} 分。繼續保持！</div></div>${grp('插入變數', chips(['{姓名}', '{最強項目}', '{差距}', '{總分}'], -1))}${grp('字級', seg(['小', '中', '大'], 1, '字級'))}${grp('對齊', seg(['靠左', '置中'], 0, '對齊'))}${fl(true, '只在最強項目高於班均時顯示')}`, { cur: 2, sel: box(0.7, 53, 500, 688, 70) })));

// D34 加入區塊
const types = [['type', '標題區'], ['table', '摘要數字列'], ['comment', '文字'], ['bars', '圖表'], ['table', '表格'], ['comment', '同學的話'], ['type', '老師的話'], ['image', '圖片'], ['pagebreak', '分頁線']];
F.push(E('D34 桌機：加入區塊｜3 欄方塊，圖示加名稱。加入後插在目前選取區塊的下方，並自動選取，方便接著編輯；也可從左側清單把區塊類型拖進頁面。',
  `${editor(`<h3 style="margin:0;font-size:var(--fs-lg)">對照條（圖表）</h3>${grp('圖表種類', '<span class="small muted">對照條 · 點開看適用的圖</span>')}${fl(true, '顯示班級平均')}${fl(true, '顯示自評')}`)}${modal(560, `${mhead('加入區塊')}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${types.map(([i, n]) => `<button class="rcard" type="button" style="min-height:84px;flex-direction:column;justify-content:center;align-items:center;gap:6px"><span style="color:var(--accent-ink)">${ic(i)}</span><b>${n}</b></button>`).join('')}</div><span class="small muted">會加在「對照條」的下方。</span>`)}`));

// D35 頁面設定
F.push(E('D35 桌機：頁面設定｜紙張大小、方向、邊界、背景、頁框、頁首頁尾與校名 Logo。全部用分段控制、籌碼與開關，沒有需要輸入的數字；改動即時反映在背後的頁面。',
  `${editor(`<h3 style="margin:0;font-size:var(--fs-lg)">對照條（圖表）</h3>${fl(true, '顯示班級平均')}`)}${modal(680, `${mhead('頁面設定')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${grp('紙張大小', seg(['A4', 'Letter'], 0, '紙張'))}${grp('方向', seg(['直式', '橫式'], 0, '方向'))}${grp('邊界', seg(['窄', '標準', '寬'], 1, '邊界'))}${grp('背景', chips(['白', '溫暖紙色'], 0))}${grp('頁框', seg(['無', '細線', '圓角'], 2, '頁框'))}${grp('頁碼', seg(['不顯示', '右下'], 1, '頁碼'))}</div>${fl(true, '顯示頁首（校名與 Logo）')}${field('sch', '校名', '○○國民中學')}${mfoot(btn('取消', 'secondary'), btn('套用', 'primary'))}`)}`));

// D36 單一學生個別版本
const over = (nm, v) => `<div class="qcard" style="gap:6px;padding:12px 14px"><b>${nm}</b><span class="small muted">${v}</span><div>${btn('還原成全班範本', 'secondary', { sm: true, icon: 'undo' })}</div></div>`;
F.push(E('D36 桌機：單一學生的個別版本｜頁頂橫幅清楚標示正在改誰，以及有幾處覆寫。右側列出這位學生被改過的地方，可逐項還原；回到全班範本不會丟掉個別修改。',
  editor(`<h3 style="margin:0;font-size:var(--fs-lg)">這位學生的覆寫（2 處）</h3>${over('老師的話', '改為個別撰寫的評語')}${over('稱讚提示', '字級：大')}${notice('', 'info', '只改這位學生，不影響其他 40 位。')}`, { banner: `<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--accent-soft);color:var(--accent-ink)"><b>林小宇（6 號）個別版本</b><span class="small">只改這位學生 · 2 處覆寫</span><span style="margin-left:auto">${btn('回到全班範本', 'secondary', { sm: true })}</span></div>` })));

// D37 拖曳排序
F.push(E('D37 桌機：區塊拖曳排序｜長按或直接拖曳左側把手；被拖的區塊浮起、有藍色放置線。也可用 ↑↓ 鍵移動，不想用滑鼠的人一樣做得到。',
  editor(`<h3 style="margin:0;font-size:var(--fs-lg)">稱讚提示（文字）</h3>${notice('', 'info', '把手在區塊左側。放開滑鼠即完成排序，Ctrl+Z 可復原。')}`, { cur: 2, sel: '', left: `${rail('區塊')}${blk('type', '標題區')}${blk('table', '摘要數字列')}<div style="height:3px;background:var(--accent);border-radius:2px;margin:2px 0"></div>${blk('bars', '對照條')}${blk('table', '自評對照表')}${blk('comment', '同學的話')}${blk('type', '老師的話')}<div style="position:absolute;left:30px;top:246px;width:220px;background:var(--card);border:1px solid var(--accent);border-radius:var(--r-sm);box-shadow:0 10px 24px var(--shadow-sm);transform:rotate(-1.5deg)">${blk('comment', '稱讚提示', true)}</div>` })));

// D38 範本庫
const tpls = [['三年二班 學生版回饋單', '改自「個人回饋單 學生版」· 10/28 用過', '我的'], ['小組報告 評分表', '改自「班級總表」· 10/12 用過', '我的'], ['班級報告：意見調查', '3 頁 · 量化＋質化', '內建'], ['票選結果：公告＋明細', '2 頁', '內建'], ['報告回饋：班級總表', '1 頁', '內建'], ['個人回饋單：學生版', '2 頁 · 溫暖版', '內建']];
const tcard = (n, m, t) => `<div class="qcard" style="gap:8px;padding:12px;align-items:stretch"><div style="display:grid;place-items:start center;background:var(--sunk);border-radius:var(--r-sm);padding:8px 10px 0;height:104px;overflow:hidden">${mp(0.18)}</div><div style="display:flex;gap:6px;align-items:center"><b style="flex:1;min-width:0">${n}</b>${tag(t, t === '我的' ? 'accent' : '')}</div><span class="small muted">${m}</span><div style="display:flex;gap:6px">${btn('套用', 'primary', { sm: true })}${btn('編輯', 'secondary', { sm: true })}${btn('複製', 'secondary', { sm: true })}</div></div>`;
const lib = (extra = '') => `${body(side(240, `${rail('版面範本')}${nvr('全部', true, tag('8'))}${nvr('我的', false, tag('2'))}${nvr('內建', false, tag('6'))}<div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">${btn('匯入範本檔', 'secondary', { block: true })}${btn('新增範本', 'secondary', { block: true, icon: 'plus' })}</div>`), main(`${h('版面範本', '範本是「版面與文字」，不含學生資料。內建範本不可改，要改就先複製成「我的範本」。')}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${tpls.map((t) => tcard(...t)).join('')}</div>${extra}`, 'position:relative'))}${nav('用這份範本輸出', '返回輸出')}`;
F.push(D('D38 桌機：範本庫｜縮圖卡片一眼看出版面長什麼樣；左邊切換「全部／我的／內建」。套用、編輯、複製都在卡片上。', 4, lib()));

// D39 範本選單
const mi = (t, s, danger) => `<div style="padding:10px 14px;display:flex;flex-direction:column;gap:2px;${danger ? 'color:var(--bad)' : ''}"><b>${t}</b><span class="small muted">${s}</span></div>`;
F.push(D('D39 桌機：範本選單（右鍵或「⋯」）｜套用、編輯、複製、匯出分享、刪除。刪除是危險動作，排在最後並用警示色，且要再確認一次。', 4,
  lib(`<div role="menu" style="position:absolute;left:230px;top:130px;width:320px;background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:0 10px 28px var(--shadow-sm);padding:6px;z-index:2">${mi('用這份範本輸出', '回到「輸出」步驟套用')}${mi('編輯版面', '開啟區塊編輯器')}${mi('複製', '做一份新的再改')}${mi('匯出分享', '存成範本檔，給其他老師')}<div style="border-top:1px solid var(--line-soft);margin:4px 0"></div>${mi('刪除範本', '刪除後無法復原，建議先匯出備份', true)}</div>`)));

// D40 匯出分享範本
F.push(D('D40 桌機：匯出分享範本｜說清楚檔案含什麼、不含什麼。校名與 Logo 會一併帶出，分享前提醒老師確認。', 4,
  `${lib()}${modal(580, `${mhead('匯出範本')}${fchip('file', '三年二班 學生版回饋單.sfhtpl', '約 48 KB · 2 頁版面')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="qcard" style="gap:6px"><b>檔案內含</b><span class="small muted" style="line-height:1.7">版面、文字、變數、顏色、校名與 Logo 圖片。</span></div><div class="qcard" style="gap:6px"><b>檔案不含</b><span class="small muted" style="line-height:1.7">學生姓名、成績、問卷資料。這份範本只有版面。</span></div></div>${notice('warn', 'warn', '範本含校名與 Logo。若要分享給校外的人，請先確認可以公開。')}${field('fn', '檔名', '三年二班 學生版回饋單.sfhtpl')}${mfoot(btn('取消', 'secondary'), btn('存到這台電腦', 'primary', { icon: 'down-arrow' }))}`)}`));

// D41 匯入範本
F.push(D('D41 桌機：匯入範本｜選檔後先預覽再匯入。同名時問「取代」或「兩份都留」，預設兩份都留，不會悄悄蓋掉老師自己的版本。', 4,
  `${lib()}${modal(700, `${mhead('匯入範本')}${fchip('file', '科任老師分享_回饋單.sfhtpl', '來自檔案 · 51 KB · 範本格式 v1')}<div style="display:flex;gap:16px"><div style="background:var(--sunk);padding:10px;border-radius:var(--r-sm)">${mp(0.2)}</div><div style="display:flex;flex-direction:column;gap:8px;flex:1"><b>個人回饋單：學生版（科任版）</b><span class="small muted">2 頁 · 含 1 張圖片（Logo） · 7 個區塊</span>${notice('warn', 'warn', '你已經有同名的範本「三年二班 學生版回饋單」。')}${grp('同名時怎麼處理', `<div style="display:flex;flex-direction:column;gap:6px">${rcard('兩份都留', '新的會加上「（2）」', true)}${rcard('取代舊的', '舊版會先備份一份', false)}</div>`)}</div></div><span class="small muted">格式相容。這份檔案不含任何學生資料。</span>${mfoot(btn('取消', 'secondary'), btn('匯入範本', 'primary'))}`)}`));

// D42 儲存專案檔
F.push(D('D42 桌機：儲存專案檔｜專案檔記住「怎麼對應欄位、用什麼設定與範本」，下學期同一份問卷格式再開就不用重做。學生資料不會存進去。', 3,
  `${body(main(`${h('統計結果')}<div class="qcard"><div class="small muted">背景頁面</div></div>`))}${modal(640, `${mhead('儲存專案檔')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="qcard" style="gap:6px"><b>專案檔會記住</b><span class="small muted" style="line-height:1.7">問卷類型、欄位對應、評分權重、統計設定、選用的範本、檔名規則。</span></div><div class="qcard" style="gap:6px"><b>不會記住</b><span class="small muted" style="line-height:1.7">問卷回覆、學生名單、輸出檔。資料檔每次都要重新選。</span></div></div>${field('pn', '專案名稱', '三年二班 幹部票選', '建議包含班級與用途，下學期才找得到。')}${grp('存到哪裡', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${rcard('這台電腦', '下載成 .sfh 檔案', true)}${rcard('Google 雲端硬碟', '用選檔視窗存到你的雲端硬碟', false)}</div>`)}${mfoot(btn('取消', 'secondary'), btn('儲存專案檔', 'primary'))}`)}`));

// D43 開啟專案檔後
F.push(D('D43 桌機：開啟專案檔後｜設定都還原了，但專案檔沒有資料，所以請老師選這學期的試算表。選完比對欄位，找不到的欄位標出來，一鍵重新對應。', 2,
  `${body(main(`${notice('ok', 'check', '已載入專案「三年二班 幹部票選」。欄位對應、設定與範本已還原。')}${fchip('file', '114下_幹部票選.xlsx', '已讀取 41 列 · 欄位比對完成')}${notice('warn', 'warn', '有 2 個欄位和專案檔的對不上：「班級」「座號」。', btn('重新對應這 2 個', 'secondary', { sm: true }))}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${[['問卷類型', '票選幹部', '已確認', 'ok'], ['欄位對應', '9 個欄位，2 個需要確認', '請確認', 'warn'], ['資料檢查', '尚未檢查', '等待', '']].map(([a, b, c, k]) => `<div class="qcard" style="gap:6px"><div style="display:flex"><b>${a}</b><span style="margin-left:auto">${tag(c, k)}</span></div><span class="small muted">${b}</span></div>`).join('')}</div>`), rside(320, `${h('專案檔記住了什麼')}<div style="line-height:1.9"><span>${ic('check')} 問卷類型</span><br><span>${ic('check')} 欄位對應</span><br><span>${ic('check')} 評分權重與設定</span><br><span>${ic('check')} 範本與檔名規則</span></div>${notice('', 'lock', '資料檔沒有存進專案檔，每次都要重新選。')}`))}${nav('下一步：看統計')}`));

write('frag-b18.html', F);
addPages({ id: 'desk-c', short: '桌機：編輯器、範本與專案檔', name: '桌機-編輯器範本與專案檔', title: '桌機（1280）：編輯器、範本庫與專案檔', intro: '文字區塊屬性、加入區塊、頁面設定、個別學生版本、拖曳排序、範本庫與選單、匯出與匯入範本、儲存與開啟專案檔。人名與數字皆為虛構。', frag: 'frag-b18.html' });
console.log(F.length);
