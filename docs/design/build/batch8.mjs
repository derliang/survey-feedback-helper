import fs from 'node:fs';
import * as L from './lib.mjs';
import { LK_COL, LK_NAME, stats, f2 } from './doc.mjs';
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rowbtn, brow, bar, write } = L;

const page = fs.readFileSync(L.sp + '/paper-stu1.html', 'utf8');
const miniPaper = (k, extra = '') => `<div style="position:relative;width:${Math.round(794 * k)}px;height:${Math.round(1123 * k)}px;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:#fff;box-shadow:0 4px 14px var(--shadow-sm);flex:none"><div style="width:794px;transform:scale(${k});transform-origin:0 0;pointer-events:none">${page}</div>${extra}</div>`;

const frameWH = (cap, W, H, inner) => {
  const t = cap.split('｜');
  return `<figure class="fig" style="margin:0"><div class="scale" data-w="${W}" data-h="${H}"><div class="dev" style="width:${W}px;height:${H}px;border-radius:${W > 1000 ? 12 : 28}px">${inner}</div></div><figcaption style="max-width:${Math.min(W, 640)}px"><b>${t[0]}</b>${t[1] || ''}</figcaption></figure>`;
};
const topbar = (step, right = '') => `<div class="appbar" style="padding:0 16px;gap:20px"><span class="brand">${ic('bars')}</span><b style="font-size:17px">問卷回饋小幫手</b><span class="small muted">三年二班_幹部票選.xlsx</span><div class="stepper" style="border:0;padding:0;background:transparent;margin-left:auto;width:360px"><div class="segs">${['開啟', '對應', '統計', '輸出'].map((t, i) => `<span class="st${i === step - 1 ? ' on cur' : i < step - 1 ? ' on' : ''}">${t}</span>`).join('')}</div></div>${right || icbtn('sliders', '設定')}</div>`;
const pane = (w, inner, o = '') => `<div class="pane" style="width:${w}px;${o}">${inner}</div>`;
const qrow = (n, nm, t, cur) => `<div class="qrow"${cur ? ' aria-current="true"' : ''}><span style="width:1.4em;color:${cur ? 'inherit' : 'var(--ink3)'};font-variant-numeric:tabular-nums">${n}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</span>${tag(t)}</div>`;
const qlist = (cur) => [['1', '老師說明清楚', '量表'], ['2', '活動內容有趣', '量表'], ['3', '分組討論讓我有機會表達', '量表'], ['4', '我願意推薦給其他班', '量表'], ['5', '活動時間安排適當', '量表'], ['6', '活動場地舒適', '量表'], ['7', '最喜歡的活動', '單選'], ['8', '希望增加的活動', '複選'], ['9', '其他想說的話', '開放']].map(([n, nm, t], i) => qrow(n, nm, t, i === cur)).join('');

const d = [0, 1, 5, 13, 22], s = stats(d);
const lkRows = (compact) => d.map((c, i) => 4 - i).map((i) => { const c = d[i]; const p = Math.round((c / 41) * 100); return `<div class="brow"><div class="h"><span class="nm"><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${LK_COL[i]}"></i>${i + 1} ${LK_NAME[i]}</span><span class="v"><b>${c}</b> 人 · ${p}%</span></div><div class="track"><i style="width:${p}%;background:${LK_COL[i]}"></i></div></div>`; }).join('');
const detail = (wide) => `<div style="display:flex;flex-direction:column;gap:14px"><div><div class="small muted">第 2 題 ／ 9 · 量表</div><h2 style="margin:0;font-size:var(--fs-xl)">活動內容有趣</h2></div>${tiles([['平均', f2(s.mean)], ['中位數', s.med], ['標準差', f2(s.sd)], ['4–5 分', Math.round(s.top2 * 100) + '%']])}<div class="qcard" style="gap:12px">${lkRows()}</div></div>`;
const segView = seg(['題目', '交叉', '留言'], 0);
const foot = (...b) => `<div class="actbar desk" style="justify-content:flex-end">${b.join('')}</div>`;
const kbd = (t) => `<span class="mono" style="border:1px solid var(--line);border-radius:4px;padding:1px 6px;background:var(--card)">${t}</span>`;

const F = [];

// ---- 平板統計
F.push(frameWH('12a 平板：統計｜左右分欄：左邊題目清單（可一直看到全部題目），右邊目前這題。不用再來回翻題。底部操作列靠右。',
  820, 1000, `${topbar(3)}<div style="flex:1;min-height:0;display:flex">${pane(290, `<div class="small muted" style="font-weight:700">題目</div>${qlist(1)}`, 'border-right:1px solid var(--line-soft);padding:12px')}<div style="flex:1;min-width:0;padding:20px;display:flex;flex-direction:column;gap:14px;overflow:hidden">${segView}${detail()}</div></div>${foot(btn('上一步', 'secondary'), btn('下一步：輸出', 'primary'))}`));

// ---- 平板編輯器（橫向）
const blk = (icon, nm, cur) => `<div style="display:flex;align-items:center;min-height:52px;gap:8px;padding:0 8px;border-radius:var(--r-sm);${cur ? 'background:var(--accent-soft);color:var(--accent-ink);font-weight:700' : ''}"><span style="color:var(--ink3);width:20px">${ic('grip')}</span><span>${ic(icon)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</span></div>`;
const blocks = (cur) => [['type', '標題區'], ['table', '摘要數字列'], ['comment', '稱讚提示'], ['bars', '對照條'], ['table', '自評對照表'], ['comment', '同學的話'], ['type', '老師的話']].map(([i, n], k) => blk(i, n, k === cur)).join('');
const props = (title) => `<div style="display:flex;flex-direction:column;gap:12px"><h3 style="margin:0;font-size:var(--fs-lg)">${title}</h3><div class="grp"><span class="gl">圖表類型</span>${seg(['長條', '對照條', '分布'], 1, '圖表類型')}</div><button class="tgl" role="switch" aria-checked="true" type="button"><b>顯示班級平均</b><span class="sw2"></span></button><button class="tgl" role="switch" aria-checked="true" type="button"><b>顯示自評</b><span class="sw2"></span></button>${notice('warn', 'warn', '<b>Word：轉為圖片</b><br>輸出成 Word 時變成圖片，圓角改直角。')}</div>`;
const sel = (k) => `<div style="position:absolute;left:${Math.round(53 * k) - 3}px;top:${Math.round(597 * k) - 3}px;width:${Math.round(688 * k) + 6}px;height:${Math.round(196 * k) + 6}px;border:2px solid var(--accent);border-radius:4px;background:color-mix(in srgb,var(--accent) 6%,transparent)"></div>`;
F.push(frameWH('12b 平板：編輯器（橫向）｜三欄：區塊清單、頁面預覽、屬性。屬性面板不再蓋住頁面，改成靠右側常駐；觸控與手寫筆都可用，點擊區仍不低於 44px。',
  1024, 768, `<div class="appbar" style="padding:0 12px">${icbtn('back', '返回')}<b style="font-size:17px;flex:1">個人回饋單（學生版）</b>${icbtn('undo', '復原')}${icbtn('redo', '重做')}${icbtn('minus', '縮小')}<span style="font-variant-numeric:tabular-nums;font-weight:600;min-width:48px;text-align:center">60%</span>${icbtn('plus', '放大')}${btn('預覽輸出', 'primary', { sm: true })}</div><div style="flex:1;min-height:0;display:flex">${pane(230, `<div class="small muted" style="font-weight:700">區塊</div>${blocks(3)}${btn('加入區塊', 'secondary', { sm: true, icon: 'plus' })}`, 'padding:12px;border-right:1px solid var(--line-soft)')}<div style="flex:1;min-width:0;display:grid;place-items:start center;padding:16px;background:var(--sunk);overflow:hidden">${miniPaper(0.6, sel(0.6))}</div>${pane(290, props('對照條（圖表）'), 'padding:16px;border-left:1px solid var(--line-soft);background:var(--card)')}</div>`));

// ---- 桌機統計
F.push(frameWH('12c 桌機：統計工作台｜三欄：題目與分類、目前題目（較寬的圖表與數字）、設定與備註。可用鍵盤 ← → 切換題目。',
  1280, 800, `${topbar(3)}<div style="flex:1;min-height:0;display:flex">${pane(300, `<div class="small muted" style="font-weight:700">題目（9）</div>${qlist(1)}`, 'padding:12px;border-right:1px solid var(--line-soft);background:var(--card)')}<div style="flex:1;min-width:0;padding:24px 32px;display:flex;flex-direction:column;gap:16px;overflow:hidden">${segView}${detail()}</div>${pane(320, `<div class="small muted" style="font-weight:700">設定</div><button class="tgl" role="switch" aria-checked="true" type="button"><span style="text-align:left"><b style="display:block">排除重複填答</b><span class="small muted">已排除 1 份</span></span><span class="sw2"></span></button><button class="tgl" role="switch" aria-checked="false" type="button"><span style="text-align:left"><b style="display:block">反向計分</b><span class="small muted">這題不是反向題</span></span><span class="sw2"></span></button>${rowbtn('量表標籤', '非常不同意 … 非常同意', tag('預設'))}${notice('', 'info', '41 位填答者都有回答這題，沒有跳答。')}`, 'padding:16px;border-left:1px solid var(--line-soft);background:var(--card)')}</div><div style="display:flex;gap:16px;align-items:center;padding:8px 16px;border-top:1px solid var(--line-soft);background:var(--card);font-size:var(--fs-sm);color:var(--ink2)"><span>${kbd('←')} ${kbd('→')} 切換題目</span><span>${kbd('Ctrl')} + ${kbd('Enter')} 下一步</span><span style="margin-left:auto">${btn('上一步', 'secondary', { sm: true })} ${btn('下一步：輸出', 'primary', { sm: true })}</span></div>`));

// ---- 桌機編輯器
F.push(frameWH('12d 桌機：編輯器｜頁面以 70% 顯示，左側區塊清單可拖曳，右側屬性。支援鍵盤：Ctrl+Z 復原、Delete 刪除、↑↓ 移動區塊；滑鼠可直接在頁面上雙擊改文字。',
  1280, 800, `<div class="appbar" style="padding:0 16px;gap:8px">${icbtn('back', '返回')}<b style="font-size:17px">個人回饋單（學生版）</b><span class="small muted" style="margin-right:auto;margin-left:8px">已儲存在這個瀏覽器</span>${icbtn('undo', '復原')}${icbtn('redo', '重做')}<span style="width:1px;height:24px;background:var(--line);margin:0 8px"></span>${icbtn('minus', '縮小')}<span style="font-variant-numeric:tabular-nums;font-weight:600;min-width:48px;text-align:center">70%</span>${icbtn('plus', '放大')}${btn('頁面設定', 'secondary', { sm: true })}${btn('預覽輸出', 'primary', { sm: true })}</div><div style="flex:1;min-height:0;display:flex">${pane(260, `<div class="small muted" style="font-weight:700">區塊</div>${blocks(3)}${btn('加入區塊', 'secondary', { sm: true, icon: 'plus' })}`, 'padding:12px;border-right:1px solid var(--line-soft);background:var(--card)')}<div style="flex:1;min-width:0;display:grid;place-items:start center;padding:20px;background:var(--sunk);overflow:hidden">${miniPaper(0.7, sel(0.7))}</div>${pane(320, props('對照條（圖表）'), 'padding:16px;border-left:1px solid var(--line-soft);background:var(--card)')}</div><div style="display:flex;gap:16px;align-items:center;padding:8px 16px;border-top:1px solid var(--line-soft);background:var(--card);font-size:var(--fs-sm);color:var(--ink2)"><span>${kbd('Ctrl')}+${kbd('Z')} 復原</span><span>${kbd('Delete')} 刪除區塊</span><span>${kbd('↑')} ${kbd('↓')} 移動區塊</span><span style="margin-left:auto">第 1／2 頁</span></div>`));

// ---- 桌機輸出
F.push(frameWH('12e 桌機：輸出｜左邊設定、右邊即時預覽，可切換學生看每個人的樣子。設定一改，預覽立刻更新；確定後按「產生並下載」。',
  1280, 800, `${topbar(4)}<div style="flex:1;min-height:0;display:flex">${pane(380, `<div class="small muted" style="font-weight:700">輸出設定</div><div class="grp"><span class="gl">要輸出什麼</span>${chips(['班級總表', '個人回饋單'], 1)}</div><div class="grp"><span class="gl">檔案格式</span>${seg(['Excel', 'Word', 'PDF'], 2, '格式')}</div><div class="grp"><span class="gl">給誰看</span>${chips(['教師版', '學生版', '家長版'], 1)}</div><div class="grp"><span class="gl">範圍</span>${chips(['全班 41 人', '選擇學生'], 0)}</div><div class="field"><label for="dn">檔名規則</label><input class="input mono" id="dn" value="{班級}_{座號}_{姓名}_回饋單"></div><div class="sumline" style="background:var(--sunk);border-radius:var(--r-md);padding:12px 14px;font-size:var(--fs-sm)">將產生 <b>41 個 PDF</b>，打包成 1 個 zip，約 3.3 MB。</div>`, 'padding:16px;border-right:1px solid var(--line-soft);background:var(--card)')}<div style="flex:1;min-width:0;display:flex;flex-direction:column;background:var(--sunk)"><div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:8px"><button class="icbtn" type="button" aria-label="上一位">${ic('back')}</button><b>林小宇（6 號）</b><span class="small muted">6／41</span><button class="icbtn" type="button" aria-label="下一位">${ic('next')}</button></div><div style="flex:1;min-height:0;display:grid;place-items:start center;padding:8px;overflow:hidden">${miniPaper(0.6)}</div></div></div>${foot(btn('上一步', 'secondary'), btn('產生並下載', 'primary'))}`));

write('frag-b8.html', F);
const css = fs.readFileSync(L.sp + '/doc.css', 'utf8');
if (!css.includes('.pane{')) fs.appendFileSync(L.sp + '/doc.css', `
.pane{display:flex;flex-direction:column;gap:12px;overflow:hidden;flex:none;min-width:0}
.qrow{display:flex;gap:10px;align-items:center;min-height:48px;padding:0 12px;border-radius:var(--r-sm);color:var(--ink);font-size:var(--fs-md)}
.qrow[aria-current]{background:var(--accent-soft);color:var(--accent-ink);font-weight:700}
`);
console.log(F.length);
