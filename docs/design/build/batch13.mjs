import fs from 'node:fs';
import * as L from './lib.mjs';
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, grp, write } = L;

const page = fs.readFileSync(L.sp + '/paper-stu1.html', 'utf8');
const miniPaper = (k) => `<div style="position:relative;width:${Math.round(794 * k)}px;height:${Math.round(1123 * k)}px;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff;box-shadow:0 4px 14px var(--shadow-sm);flex:none"><div style="width:794px;transform:scale(${k});transform-origin:0 0;pointer-events:none">${page}</div></div>`;
const frameWH = (cap, W, H, inner, rad) => {
  const t = cap.split('｜');
  return `<figure class="fig" style="margin:0"><div class="scale" data-w="${W}" data-h="${H}"><div class="dev" style="width:${W}px;height:${H}px;border-radius:${rad ?? (W > 1000 ? 12 : 28)}px">${inner}</div></div><figcaption style="max-width:${Math.min(W, 640)}px"><b>${t[0]}</b>${t[1] || ''}</figcaption></figure>`;
};
import { topbar, BAR_H } from './wide.mjs';
import { home, privacy, colrow, offgroup, progDone } from './deskkit.mjs';
const pane = (w, inner, o = '') => `<div class="pane" style="width:${w}px;${o}">${inner}</div>`;
const flex1 = (inner, o = '') => `<div class="pane" style="flex:1;${o}">${inner}</div>`;
const body = (...p) => `<div style="flex:1;min-height:0;display:flex">${p.join('')}</div>`;
const foot = (...b) => `<div class="actbar desk" style="justify-content:flex-end">${b.join('')}</div>`;
const kbd = (t) => `<span class="mono" style="border:1px solid var(--line);border-radius:4px;padding:1px 6px;background:var(--card)">${t}</span>`;
const fchip = (icon, b, s) => `<div class="filechip">${ic(icon)}<div><b>${b}</b><span>${s}</span></div></div>`;
const h = (t, p) => `<div style="display:flex;flex-direction:column;gap:4px"><h2 style="margin:0;font-size:var(--fs-xl)">${t}</h2>${p ? `<p class="small muted" style="margin:0">${p}</p>` : ''}</div>`;
const th = 'text-align:left;padding:8px 10px;font-weight:700;border-bottom:1px solid var(--line);background:var(--sunk);white-space:nowrap';
const td = 'padding:8px 10px;border-bottom:1px solid var(--line-soft);white-space:nowrap';
const F = [];

// ---- 桌機：開啟
F.push(frameWH('13a 桌機：開啟試算表｜首頁定案方案 1b 雙欄工作檯：左邊是放新檔的大區塊，可拖放也可按「選擇檔案」；右邊一次看到六個最近的專案，點一下重新讀檔並套用上次設定。步驟列獨立一列。',
  1280, 800 + BAR_H, `${topbar(1, '')}${home()}`));

// ---- 桌機：對應欄位
const cols = [['時間戳記', '時間戳記'], ['班級', '班級'], ['座號', '座號'], ['姓名', '姓名'], ['班長', '班長（票選）'], ['副班長', '副班長（票選）'], ['風紀股長', '風紀股長（票選）'], ['衛生股長', '衛生股長（票選）']];
const maprow = (a, b, cur) => `<div style="display:flex;align-items:center;gap:10px;min-height:48px;padding:0 12px;border-radius:var(--r-sm);${cur ? 'background:var(--accent-soft)' : ''}"><span class="mono" style="width:6.5em">${a}</span><span style="color:var(--ink3)">${ic('next')}</span><div class="input" style="flex:1;min-height:40px;display:flex;align-items:center;padding:0 12px">${b}</div></div>`;
const rows = [['2026/10/12 10:12', '2', '6', '林小宇', '陳怡安', '王品妍', '周冠宇', '劉承恩'], ['2026/10/12 10:13', '2', '17', '趙子安', '林小宇', '王品妍', '蔡佳穎', '劉承恩'], ['2026/10/12 10:15', '2', '9', '周宜靜', '林小宇', '李冠廷', '周冠宇', '謝宛庭'], ['2026/10/12 10:15', '2', '21', '張語彤', '陳怡安', '王品妍', '周冠宇', '劉承恩'], ['2026/10/12 10:18', '2', '30', '黃子謙', '林小宇', '吳承翰', '許志豪', '劉承恩']];
F.push(frameWH('13b 桌機：對應欄位｜左邊一列一個欄位、右邊選用途；右邊同步顯示資料前幾列，點到的欄位在預覽中反白。用不到的欄按「不使用」收到下方，仍看得到，可以加回。',
  1280, 850 + BAR_H, `${topbar(2)}${body(pane(520, `${h('欄位對應', '已智慧判斷，不對的才需要改。共 10 欄，使用 8 欄，不使用 2 欄。')}${cols.map((c, i) => colrow(c[0], c[1], i === 4)).join('')}${offgroup([['電子郵件', '範例：student01@example.tw'], ['備註', '41 列空白']])}`, 'padding:20px;border-right:1px solid var(--line-soft);overflow:hidden'), flex1(`${h('資料預覽', '前 5 列，共 41 列')}<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden;background:var(--card)"><table style="border-collapse:collapse;width:100%;font-size:var(--fs-sm)"><thead><tr>${['時間戳記', '班級', '座號', '姓名', '班長', '副班長', '風紀股長', '衛生股長'].map((c, i) => `<th style="${th}${i === 4 ? ';background:var(--accent-soft);color:var(--accent-ink)' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="${td}${i === 4 ? ';background:var(--accent-soft)' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="qcard" style="gap:10px"><b>「班長」欄的內容</b><span class="small muted">4 種答案，1 列空白，共 41 列</span>${L.brow('林小宇', 18, 44)}${L.brow('陳怡安', 12, 29)}${L.brow('張子豪', 6, 15)}${L.brow('黃思穎', 4, 10)}</div>`, 'padding:20px;overflow:hidden;gap:14px'))}${foot(btn('上一步', 'secondary'), btn('下一步：看統計', 'primary'))}`));

// ---- 桌機：資料檢查
const chk = (n, c, cur) => `<div class="qrow"${cur ? ' aria-current="true"' : ''}><span style="flex:1">${n}</span>${tag(String(c), c ? 'warn' : 'ok')}</div>`;
const rec = (t, a, b) => `<tr><td style="${td}">${t}</td><td style="${td}">${a}</td><td style="${td}">${b}</td></tr>`;
F.push(frameWH('13c 桌機：資料檢查｜三欄：左邊檢查類別與數量、中間目前這類的明細、右邊規則說明與預設處理。重複填答把兩份並排，一眼看出差在哪。',
  1280, 800 + BAR_H, `${topbar(2)}${body(pane(280, `<div class="small muted" style="font-weight:700">檢查項目</div>${chk('重複填答', 1, true)}${chk('時間異常', 2, false)}${chk('格式異常', 0, false)}${chk('空白', 1, false)}${chk('名單對照', 3, false)}`, 'padding:12px;border-right:1px solid var(--line-soft)'), flex1(`${h('重複填答：1 位同學', '同一個人交了 2 份，請決定怎麼算。')}<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden;background:var(--card)"><table style="border-collapse:collapse;width:100%;font-size:var(--fs-sm)"><thead><tr><th style="${th}">項目</th><th style="${th}">第一份 10:12</th><th style="${th}">第二份 10:31</th></tr></thead><tbody>${rec('班級', '<span class="muted">三年二班</span>', '<span class="muted">三年二班</span>')}${rec('座號', '17', '17')}${rec('姓名', '趙子安', '趙子安')}${rec('班長', '陳怡安', '<b>林小宇</b>')}${rec('副班長', '王品妍', '王品妍')}${rec('風紀股長', '蔡佳穎', '蔡佳穎')}${rec('衛生股長', '劉承恩', '劉承恩')}</tbody></table></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${rcard('只算最後一份', '預設', true)}${rcard('只算第一份', '', false)}${rcard('兩份都不算', '', false)}</div>${tiles([['收到', 42], ['納入', 41], ['排除', 1, 'warn']])}<span class="small muted">整類決定是預設，每位同學的明細可以逐份勾選，例外會標「手動調整」。</span>`, 'padding:20px;overflow:hidden'), pane(320, `${h('為什麼預設最後一份')}<p class="small" style="margin:0;line-height:1.7">同學重送通常是改變心意，所以以最後一份為準。你選的處理會寫進「統計方法說明」，之後可以重現同樣的結果。</p>${notice('', 'info', '兩份投的班長不同，這是需要你判斷的地方。')}`, 'padding:20px;border-left:1px solid var(--line-soft);background:var(--card)'))}${foot(btn('上一步', 'secondary'), btn('下一步：看統計', 'primary'))}`));

// ---- 桌機：審稿
const stu = (n, nm, st, cur) => `<div class="qrow"${cur ? ' aria-current="true"' : ''}><span style="width:1.6em;color:${cur ? 'inherit' : 'var(--ink3)'};font-variant-numeric:tabular-nums">${n}</span><span style="flex:1">${nm}</span>${st}</div>`;
const cmt = (text, kind, state, warn) => `<div class="qcard" style="gap:8px;padding:12px 14px"><div style="display:flex;gap:6px;flex-wrap:wrap">${tag(kind, kind === '優點' ? 'ok' : 'accent')}${warn ? tag('提醒：含「笨」', 'bad') : ''}${state ? tag(state, 'ok') : ''}</div><div style="line-height:1.6">${text}</div><div style="display:flex;gap:6px">${['採用', '隱藏', '改寫'].map((a) => `<button class="btn btn-${a === state ? 'primary' : 'secondary'} btn-sm" type="button">${a}</button>`).join('')}</div></div>`;
F.push(frameWH('13d 桌機：老師審稿｜三欄：左邊學生清單（看得到誰審完了）、中間留言逐則處理、右邊即時預覽學生版。審完一位按 Ctrl+Enter 到下一位。',
  1280, 800 + BAR_H, `${topbar(4)}${body(pane(260, `${progDone(36, 41)}${stu(5, '周宜靜', tag('完成', 'ok'))}${stu(6, '林小宇', tag('待審', 'warn'), true)}${stu(7, '陳怡安', tag('待審', 'warn'))}${stu(8, '張子豪', tag('完成', 'ok'))}${stu(9, '黃思穎', tag('完成', 'ok'))}${stu(10, '王品妍', tag('待審', 'warn'))}`, 'padding:12px;border-right:1px solid var(--line-soft)'), flex1(`${h('林小宇（6 號）', '2 則待審')}${tiles([['待審', 2, 'warn'], ['採用', 2], ['隱藏', 1]])}<div style="display:flex;align-items:center;gap:8px"><span class="small muted">回饋單的圖表：沿用全班設定</span>${btn('調整這位學生', 'secondary', { sm: true, icon: 'bars' })}</div>${cmt('報告條理清楚，圖表很好懂。', '優點', '採用')}${cmt('他講話有點笨拙，但是很認真。', '建議', '', true)}`, 'padding:20px;overflow:hidden'), pane(430, `<div class="small muted" style="font-weight:700;text-align:center">學生版預覽</div><div style="display:grid;place-items:start center">${miniPaper(0.5)}</div>`, 'padding:12px;background:var(--sunk)'))}${foot(`<span class="small muted" style="margin-right:auto;white-space:nowrap">${kbd('Ctrl')} + ${kbd('Enter')} 下一位</span>`, btn('上一位', 'secondary'), btn('下一位', 'primary'))}`));

// ---- 桌機：設定與範本庫
const tcard = (nm, sm, mine) => `<div class="qcard" style="gap:10px;padding:12px"><div style="display:grid;place-items:center;background:var(--sunk);border-radius:var(--r-sm);padding:10px;height:176px;overflow:hidden">${miniPaper(0.2)}</div><div style="display:flex;gap:6px;align-items:center"><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</b>${tag(mine ? '我的' : '內建', mine ? 'accent' : '')}</div><div class="small muted">${sm}</div><div style="display:flex;gap:6px">${btn('套用', 'primary', { sm: true })}${btn(mine ? '編輯' : '複製後編輯', 'secondary', { sm: true })}</div></div>`;
const nav = (t, cur) => `<div class="qrow"${cur ? ' aria-current="true"' : ''}>${t}</div>`;
F.push(frameWH('13e 桌機：設定與範本庫｜設定左邊分組、右邊內容。範本庫用縮圖卡片，一眼看出版面長什麼樣；套用、編輯、複製都在卡片上。',
  1280, 800 + BAR_H, `${topbar(4)}${body(pane(240, `${nav('全域預設')}${nav('版面範本', true)}${nav('檔名規則')}${nav('關鍵字提醒')}${nav('備份與還原')}${nav('外觀')}${nav('隱私與關於')}`, 'padding:12px;border-right:1px solid var(--line-soft)'), flex1(`<div style="display:flex;align-items:center;gap:12px">${h('版面範本', '範本只有版面與文字，不含學生資料。')}<div style="margin-left:auto;display:flex;gap:8px">${btn('匯入範本檔', 'secondary', { icon: 'down-arrow' })}${btn('新增範本', 'primary', { icon: 'plus' })}</div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${tcard('三年二班 學生版', '改自個人回饋單 · 2 頁', true)}${tcard('小組報告 評分表', '改自班級總表 · 1 頁', true)}${tcard('個人回饋單：學生版', '內建 · 2 頁', false)}${tcard('個人回饋單：家長版', '內建 · 1 頁', false)}</div>`, 'padding:24px;overflow:hidden'))}`));

// ---- 投影唱票
F.push(frameWH('13f 投影唱票｜接投影機給全班看：一次只顯示一位候選人，每按一下「下一票」加一，避免提前看到結果。字體大到後排看得到；按空白鍵也能加一票。',
  1280, 720, `<div style="flex:1;min-height:0;display:flex;flex-direction:column;padding:28px 48px;gap:8px;background:var(--paper)"><div style="display:flex;align-items:center;gap:12px"><span class="small muted" style="font-size:var(--fs-lg)">班長 · 第 1 位候選人／共 4 位</span><span style="margin-left:auto" class="small muted">${icbtn('x', '離開唱票模式')}</span></div><div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0"><div style="font-size:104px;font-weight:800;line-height:1.2;letter-spacing:.04em">林小宇</div><div class="mono" style="font-size:260px;font-weight:800;line-height:1;color:var(--accent);font-variant-numeric:tabular-nums">11</div><div style="font-size:44px;font-weight:700;color:var(--ink2);margin-top:4px">票</div></div><div style="display:flex;align-items:center;gap:16px"><div class="prog" style="flex:1" role="progressbar" aria-valuenow="27" aria-valuemin="0" aria-valuemax="100"><i style="width:27%"></i></div><span class="small muted">已唱 11／40 張有效票</span></div><div style="display:flex;gap:12px;justify-content:center;padding-top:8px">${btn('上一位候選人', 'secondary', { style: 'min-width:200px;height:72px;font-size:var(--fs-lg)' })}${btn('下一票　＋1', 'primary', { style: 'min-width:360px;height:72px;font-size:var(--fs-xl)' })}${btn('這位唱完了', 'secondary', { style: 'min-width:200px;height:72px;font-size:var(--fs-lg)' })}</div><div class="small muted" style="text-align:center">${kbd('空白鍵')} 下一票　${kbd('←')} 回上一位　${kbd('Esc')} 離開</div></div>`, 12));

// ---- 鍵盤快速鍵
const sc = (k, t) => `<div style="display:flex;align-items:center;gap:12px;min-height:40px"><span style="min-width:150px">${k}</span><span class="muted">${t}</span></div>`;
F.push(frameWH('13g 鍵盤快速鍵｜桌機按 ? 開啟說明。只列最常用的，分組寫成動作；所有功能也都能用滑鼠完成，快速鍵只是更快。',
  1280, 640 + BAR_H, `${topbar(3)}${body(pane(290, '', 'border-right:1px solid var(--line-soft)'), flex1('', ''))}<div class="scrim"></div><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:760px;background:var(--card);border-radius:var(--r-lg);padding:28px;display:flex;flex-direction:column;gap:16px;box-shadow:0 12px 40px var(--shadow-sm)"><div style="display:flex;align-items:center"><h2 style="margin:0;font-size:var(--fs-xl)">鍵盤快速鍵</h2><span style="margin-left:auto">${icbtn('x', '關閉')}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 40px"><div><b>全部畫面</b>${sc(`${kbd('Ctrl')} + ${kbd('Enter')}`, '下一步')}${sc(`${kbd('Ctrl')} + ${kbd('Z')}`, '復原')}${sc(`${kbd('Ctrl')} + ${kbd('Shift')} + ${kbd('Z')}`, '重做')}${sc(kbd('?'), '顯示這張說明')}</div><div><b>統計</b>${sc(`${kbd('←')} ${kbd('→')}`, '切換題目')}${sc(kbd('/'), '搜尋留言')}<b style="display:block;margin-top:8px">編輯器</b>${sc(`${kbd('↑')} ${kbd('↓')}`, '移動選取的區塊')}${sc(kbd('Delete'), '刪除區塊')}</div></div></div>`, 12));

write('frag-b13.html', F);

const pj = L.sp + '/pages.json';
const pages = JSON.parse(fs.readFileSync(pj, 'utf8'));
const add = (o) => { const i = pages.findIndex((p) => p.id === o.id); if (i >= 0) pages[i] = o; else pages.push(o); };
add({ id: 'flow-desk', short: '桌機補完', name: '桌機-資料審稿範本與唱票', title: '桌機補完：開啟、對應、檢查、審稿、範本庫、投影唱票', intro: '桌機三欄版面的其餘畫面、投影唱票模式與鍵盤快速鍵。', frag: 'frag-b13.html' });
fs.writeFileSync(pj, JSON.stringify(pages, null, 2));
console.log(F.length);
