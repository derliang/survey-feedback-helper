import fs from 'node:fs';
import * as L from './lib.mjs';
const { ic, tag, icbtn, btn, notice, tiles, seg, chips, rcard, opt, rowbtn, grp, bar, steps, act, scr, sheet, frame, write } = L;

const page = fs.readFileSync(L.sp + '/paper-stu1.html', 'utf8');
const K = 366 / 794;
const mini = (overlay = '') => `<div style="position:relative;width:366px;height:${Math.round(1123 * K)}px;margin:0 auto;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff;box-shadow:0 2px 8px var(--shadow-sm);flex:none"><div style="width:794px;transform:scale(${K});transform-origin:0 0;pointer-events:none">${page}</div>${overlay}</div>`;
const sel = `<div style="position:absolute;left:21px;top:272px;width:323px;height:96px;border:2px solid var(--accent);border-radius:4px;background:color-mix(in srgb,var(--accent) 6%,transparent)"></div><button type="button" aria-label="拖曳排序" class="icbtn" style="position:absolute;left:-4px;top:296px;width:44px;height:48px;background:var(--accent);color:var(--on-accent);border-radius:12px 0 0 12px;box-shadow:0 2px 6px var(--shadow)">${ic('grip')}</button><div style="position:absolute;left:30px;top:212px;display:flex;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 4px 12px var(--shadow)">${icbtn('up', '上移')}${icbtn('down', '下移')}${icbtn('copy', '複製')}${icbtn('trash', '刪除')}</div>`;

const head = (title = '個人回饋單（學生版）') => `<div class="appbar">${icbtn('back', '返回')}<span class="ttl">${title}</span>${icbtn('undo', '復原')}${icbtn('redo', '重做')}${icbtn('more', '更多')}</div>`;
const mode = (view, edit) => `<div style="display:flex;gap:8px;align-items:center;padding:8px 16px;background:var(--card);border-bottom:1px solid var(--line-soft);flex:none"><div style="flex:1">${seg(['預覽', '區塊清單'], view, '檢視')}</div><button class="chip" type="button" aria-pressed="${edit}" style="min-height:52px;padding:0 18px">${ic('pencil')}<span style="margin-left:6px">編輯</span></button></div>`;
const zoom = `<div style="display:flex;align-items:center;justify-content:center;gap:4px;flex:none">${icbtn('minus', '縮小')}<span style="min-width:72px;text-align:center;font-variant-numeric:tabular-nums;font-weight:600">46%</span>${icbtn('plus', '放大')}<button class="btn btn-ghost btn-sm" type="button">符合寬度</button><span class="small muted" style="margin-left:auto">第 1／2 頁</span></div>`;
const F = [];

F.push(frame('11a 手機編輯器：預覽（編輯關）｜預設是「捲動模式」：單指捲動、雙指縮放，不會誤改。要修改先打開「編輯」。復原與重做固定在頂端列。',
  head(), mode(0, false), `<div class="scr" style="gap:8px;padding:12px 16px">${mini()}${zoom}</div>`,
  act(btn('加入區塊', 'secondary', { icon: 'plus' }), btn('預覽輸出', 'primary'))));

F.push(frame('11b 編輯開：選取區塊｜點區塊選取，出現外框、左側把手（44×48）與上方工具列（上移、下移、複製、刪除，各 44px）。長按把手可拖曳，沒有長按也能用上下鍵移動。',
  head(), mode(0, true), `<div class="scr" style="gap:8px;padding:12px 16px">${mini(sel)}${zoom}</div>`,
  `<div class="actbar" style="align-items:center"><div style="flex:1;min-width:0"><div class="small muted">已選取</div><b>對照條（圖表）</b></div>${btn('編輯屬性', 'primary')}</div>`));

// ---- 區塊清單與拖曳
const blk = (icon, nm, sm, o = {}) => `<div style="display:flex;align-items:center;gap:0;min-height:60px;background:var(--card);border:${o.lift ? '2px solid var(--accent)' : '1px solid var(--line-soft)'};border-radius:var(--r-md);${o.lift ? 'box-shadow:0 10px 24px var(--shadow);transform:scale(1.03) translateY(-6px);position:relative;z-index:2;' : ''}"><span style="width:44px;height:56px;display:grid;place-items:center;color:var(--ink2);flex:none" aria-label="拖曳把手">${ic('grip')}</span><span style="color:var(--accent-ink);margin-right:10px;flex:none">${ic(icon)}</span><span style="flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.35"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</b><span class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sm}</span></span>${icbtn('up', '上移')}${icbtn('down', '下移')}</div>`;
const drop = `<div style="display:flex;align-items:center;gap:8px;color:var(--accent-ink);font-size:var(--fs-xs);font-weight:700"><span style="flex:1;height:3px;border-radius:2px;background:var(--accent)"></span>放在這裡<span style="flex:1;height:3px;border-radius:2px;background:var(--accent)"></span></div>`;
F.push(frame('11c 區塊清單與拖曳｜把頁面拆成一列一個區塊，小螢幕上排序比在縮小的頁面上拖容易。長按把手拖曳（被拖的區塊浮起、有藍色放置線）；每列另有上移／下移鍵，不依賴手勢。',
  head(), mode(1, true),
  scr(blk('type', '標題區', '給 {姓名} 同學的回饋單') + blk('table', '摘要數字列', '總分、自評、班均') + blk('comment', '稱讚提示', '你的強項：{最強項目}') + drop + blk('bars', '對照條', '4 個項目 · 同學、班均、自評', { lift: true }) + blk('table', '自評對照表', '你怎麼看自己') + blk('comment', '同學的話', '優點 3、建議 2') + blk('type', '老師的話', '手動輸入'), 8),
  act(btn('復原', 'secondary', { icon: 'undo' }), btn('完成', 'primary'))));

// ---- 屬性：文字
const vars = `<div class="chips">${['{姓名}', '{總分}', '{班均}', '{最強項目}'].map((v) => `<button class="chip mono" type="button">${v}</button>`).join('')}</div>`;
const dim = `<div class="scr" style="gap:8px;padding:12px 16px">${mini(sel)}</div>`;
F.push(frame('11d 屬性：文字區塊｜底部彈出面板，內容依區塊類型而定。變數用籌碼一點插入；樣式（字級、對齊、底色）用分段控制與籌碼；「條件顯示」可設分數門檻（例如低於 60 才顯示鼓勵語）。',
  head(), mode(0, true), dim,
  sheet('文字區塊', '', `<div style="display:flex;flex-direction:column;gap:12px;padding:6px 0 0"><div class="field"><label for="tx">內容</label><div class="input" id="tx" style="min-height:88px;height:auto;padding:10px 14px;line-height:1.7">你的強項：{最強項目}。同學給你 {總分} 分，比全班平均高。</div><span class="hint">點下面的變數插入，系統會換成每位學生自己的資料。</span></div>${vars}<div class="grp"><span class="gl">字級</span>${seg(['小', '中', '大'], 1, '字級')}</div><div class="grp"><span class="gl">底色</span>${chips(['無', '淡琥珀', '淡綠'], 2)}</div><button class="tgl" role="switch" aria-checked="true" type="button"><span style="text-align:left"><b style="display:block">條件顯示</b><span class="small muted">總分 ≥ 60 時才顯示</span></span><span class="sw2"></span></button></div>`, btn('完成', 'primary', { block: true }))));

// ---- 屬性：圖表
const swatches = `<div style="display:flex;gap:10px">${['d1', 'd2', 'd3', 'd4', 'd5'].map((c, i) => `<button type="button" aria-label="圖表顏色 ${i + 1}" style="width:44px;height:44px;border-radius:50%;border:${i === 0 ? '3px solid var(--ink)' : '1px solid var(--line)'};background:var(--${c})"></button>`).join('')}</div>`;
F.push(frame('11e 屬性：圖表區塊｜圖表類型、要顯示的比較線、顏色。圖表色從固定的五色挑，保證黑白列印仍可讀。不支援 Word 的效果直接在面板標示。',
  head(), mode(0, true), dim,
  sheet('對照條（圖表）', '', `<div style="display:flex;flex-direction:column;gap:12px;padding:6px 0 0"><div class="grp"><span class="gl">圖表類型</span>${seg(['長條', '對照條', '分布'], 1, '圖表類型')}</div><button class="tgl" role="switch" aria-checked="true" type="button"><b>顯示班級平均</b><span class="sw2"></span></button><button class="tgl" role="switch" aria-checked="true" type="button"><b>顯示自評</b><span class="sw2"></span></button><div class="grp"><span class="gl">顏色</span>${swatches}</div>${notice('warn', 'warn', `<b>Word：轉為圖片</b><br>輸出成 Word 時，這個圖表會變成圖片，圓角改為直角。`)}</div>`, btn('完成', 'primary', { block: true }))));

// ---- 加入區塊
const bt = (icon, n) => `<button type="button" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:84px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--card);color:var(--ink);font:600 var(--fs-sm)/1.2 var(--font);cursor:pointer"><span style="color:var(--accent-ink)">${ic(icon)}</span>${n}</button>`;
F.push(frame('11f 加入區塊｜3 欄方塊，每個 84px 高，圖示加名稱。加入後插在目前選取區塊的下方，並自動選取，方便接著編輯。',
  head(), mode(0, true), dim,
  sheet('加入區塊', '插入在「對照條」下方。', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 0">${[['type', '標題'], ['type', '文字'], ['table', '統計表'], ['bars', '圖表'], ['comment', '留言區'], ['pencil', '老師評語'], ['pagebreak', '分隔線'], ['image', '圖片／Logo'], ['file', '分頁']].map(([i, n]) => bt(i, n)).join('')}</div>`, btn('取消', 'secondary', { block: true }))));

// ---- 頁面設定
F.push(frame('11g 頁面設定｜紙張大小、方向、邊界、背景、頁框、頁首頁尾與校名 Logo。全部用分段控制、籌碼與開關，沒有需要輸入數字的欄位。',
  head(), mode(0, false), `<div class="scr" style="gap:8px;padding:12px 16px">${mini()}</div>`,
  sheet('頁面設定', '', `<div style="display:flex;flex-direction:column;gap:10px;padding:6px 0 0"><div class="grp"><span class="gl">紙張</span>${chips(['A4', 'B5', 'Letter'], 0)}</div><div class="grp"><span class="gl">邊界</span>${seg(['窄', '標準', '寬'], 1, '邊界')}</div><div class="grp"><span class="gl">背景</span>${chips(['暖白', '白', '淡琥珀'], 0)}</div><button class="tgl" role="switch" aria-checked="false" type="button"><b>頁框</b><span class="sw2"></span></button><button class="tgl" role="switch" aria-checked="true" type="button"><b>頁首與頁尾</b><span class="sw2"></span></button>${rowbtn('校名 Logo', '尚未選擇', tag('選擇圖片', 'accent'))}</div>`, btn('完成', 'primary', { block: true }))));

// ---- 單一學生覆寫
F.push(frame('11h 單一學生的個別版本｜頁頂橫幅清楚標示正在改誰，以及有幾處覆寫。面板列出這位學生被改過的地方，可逐項還原；回到全班範本不會被影響。',
  head('林小宇（6 號）'), `<div style="display:flex;gap:10px;align-items:center;padding:10px 16px;background:var(--warn-soft);color:var(--warn);font-size:var(--fs-sm);flex:none">${ic('users')}<div style="flex:1"><b>個別版本</b>　只改這位學生</div>${tag('2 處覆寫', 'warn')}</div>`, mode(0, true), dim,
  sheet('這位學生的覆寫', '全班範本不會被改到。', `<div style="display:flex;flex-direction:column;gap:8px;padding:6px 0 0">${rowbtn('老師的話', '已改寫為這位學生專用', tag('覆寫', 'warn'), false, false)}${rowbtn('稱讚提示', '已隱藏', tag('覆寫', 'warn'), false, false)}${btn('還原全部', 'ghost', { sm: true, icon: 'undo', style: 'align-self:flex-start' })}</div>`, `<div style="display:flex;gap:8px;margin-top:8px">${btn('回到全班範本', 'secondary', { style: 'flex:1' })}${btn('完成', 'primary', { style: 'flex:1' })}</div>`)));

write('frag-b7.html', F);
console.log(F.length);
