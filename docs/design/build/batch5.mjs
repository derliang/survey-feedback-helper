import fs from 'node:fs';
import * as L from './lib.mjs';
import { LK_COL, LK_NAME, stats, f2 } from './doc.mjs';
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, opt, rowbtn, brow, grp, bar, steps, act, scr, sheet, frame, write } = L;

const back = [bar('統計結果', { right: 'sliders' }), steps(3)];
const nav = btn('上一步', 'secondary');
const pager = (small, title) => `<div class="pager"><button class="icbtn" type="button" aria-label="上一題">${ic('back')}</button><div class="c"><small>${small}</small><b>${title}</b></div><button class="icbtn" type="button" aria-label="下一題">${ic('next')}</button></div>`;
const qcard = (...x) => `<div class="qcard" style="gap:12px">${x.join('')}</div>`;
const F = [];

// ---- 票選：職位總覽
const roleRow = (role, name, sm, t) => rowbtn(`${role}　<span style="font-weight:700">${name}</span>`, sm, t);
F.push(frame('5a 票選幹部：各職位結果｜第一屏就是答案：每個職位的當選人、得票、候補。同票用黃色標出。分段切換「職位／防弊／唱票」。',
  ...back,
  scr(tiles([['回覆', 41], ['職位', 4], ['需檢查', 3, 'warn']]) + seg(['職位', '防弊', '唱票'], 0) + roleRow('班長', '林小宇', '18 票 · 45% ｜ 候補 陳怡安', tag('當選', 'ok')) + roleRow('副班長', '王品妍', '16 票 · 40% ｜ 候補待定', tag('同票', 'warn')) + roleRow('風紀股長', '周冠宇', '16 票 · 40% ｜ 候補 蔡佳穎', tag('當選', 'ok')) + roleRow('衛生股長', '劉承恩', '20 票 · 50% ｜ 候補 謝宛庭', tag('當選', 'ok')) + notice('warn', 'dice', '副班長第 2 名同票（李冠廷、吳承翰各 10 票）。', btn('抽籤決定候補', 'secondary', { sm: true, icon: 'dice' })), 10),
  act(nav, btn('下一步：輸出', 'primary'))));

// ---- 票選：抽籤
F.push(frame('5b 同票抽籤｜抽籤可以重現：顯示並記錄隨機種子。結果寫進輸出文件的計票明細。老師可以向同學說明公平。',
  ...back,
  scr(tiles([['回覆', 41], ['職位', 4], ['需檢查', 3, 'warn']]) + seg(['職位', '防弊', '唱票'], 0) + rowbtn('副班長　王品妍', '16 票 · 40%', tag('同票', 'warn')), 10),
  act(nav, btn('下一步：輸出', 'primary')),
  sheet('抽籤決定副班長候補', '李冠廷、吳承翰同為 10 票。', `<div style="display:flex;flex-direction:column;gap:10px;padding:8px 0"><div class="notice ok" style="grid-template-columns:auto 1fr">${ic('check')}<div><b>結果：李冠廷為候補</b><br>2026/10/14 15:32 抽出</div></div><div class="field"><label for="seed">隨機種子</label><input class="input mono" id="seed" value="20261012-3A7F"><span class="hint">用同一個種子與名單順序，會得到一樣的結果。已記錄在計票明細。</span></div></div>`, `<div style="display:flex;gap:8px;margin-top:8px">${btn('重新抽籤', 'secondary', { icon: 'dice', style: 'flex:1' })}${btn('完成', 'primary', { style: 'flex:1' })}</div>`)));

// ---- 票選：投影唱票
F.push(frame('5c 唱票模式｜給投影用的全螢幕畫面（手機版示意，平板與桌機為橫向）。一次只顯示一位候選人與票數，按「下一票」逐張加一，避免劇透。',
  `<div class="appbar">${icbtn('x', '離開唱票')}<span class="ttl">班長 · 唱票中</span>${icbtn('eye-off', '隱藏票數')}</div>`,
  `<div class="scr" style="align-items:center;justify-content:center;text-align:center;gap:6px"><div class="small muted">第 3 位候選人</div><div style="font-size:48px;font-weight:700;line-height:1.2">張子豪</div><div style="font-size:120px;font-weight:700;line-height:1.05;font-variant-numeric:tabular-nums;color:var(--accent-ink)">6</div><div style="font-size:var(--fs-xl);color:var(--ink2)">票</div><div class="prog" style="width:80%;margin-top:16px"><i style="width:70%"></i></div><p class="small muted">已唱 28／40 張</p></div>`,
  act(btn('上一票', 'secondary'), btn('下一票', 'primary', { style: 'min-height:64px;font-size:var(--fs-xl)' }))));

// ---- 意見調查：量表題
const d = [0, 1, 5, 13, 22];
const s = stats(d);
const lkRows = d.map((c, i) => 4 - i).map((i) => { const c = d[i]; const p = Math.round((c / 41) * 100); return `<div class="brow"><div class="h"><span class="nm"><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${LK_COL[i]}"></i>${i + 1} ${LK_NAME[i]}</span><span class="v"><b>${c}</b> 人 · ${p}%</span></div><div class="track"><i style="width:${p}%;background:${LK_COL[i]}"></i></div></div>`; }).join('');
F.push(frame('5d 意見調查：量表題｜先看三個數字（平均、中位數、標準差）再看 1–5 分的分布。顏色橘到藍，每列都有人數與百分比。',
  ...back,
  scr(seg(['題目', '交叉', '留言'], 0) + qcard(pager('第 2 題 ／ 9 · 量表', '活動內容有趣'), tiles([['平均', f2(s.mean)], ['中位數', s.med], ['標準差', f2(s.sd)]]), `<div class="notice ok" style="grid-template-columns:auto 1fr">${ic('check')}<div>4–5 分占 <b>${Math.round(s.top2 * 100)}%</b>，1–2 分占 ${Math.round(s.low2 * 100)}%。</div></div>`, lkRows), 10),
  act(nav, btn('下一步：輸出', 'primary'))));

// ---- 意見調查：單選與複選
F.push(frame('5e 意見調查：複選題｜複選的比例以「填答人數」為基準，加總會超過 100%，畫面上直接寫明，避免老師誤會。',
  ...back,
  scr(seg(['題目', '交叉', '留言'], 0) + qcard(pager('第 7 題 ／ 9 · 複選', '希望增加的活動'), notice('', 'info', '複選題：比例以 41 位填答者為基準，所以加總會超過 100%。'), brow('戶外參訪', 26, 63, 'lead'), brow('手作課', 19, 46), brow('桌遊', 17, 41), brow('運動會', 14, 34), brow('其他', 3, 7)), 10),
  act(nav, btn('下一步：輸出', 'primary'))));

// ---- 開放題
const mark = (t) => `<mark style="background:var(--accent-soft);color:var(--accent-ink);border-radius:3px;padding:0 2px">${t}</mark>`;
const cm = (t, th) => `<div class="qcard" style="gap:6px;padding:12px 14px"><div style="line-height:1.6">${t}</div><div>${tag(th, 'accent')}</div></div>`;
F.push(frame('5f 開放題：留言與主題｜留言依關鍵詞分組，可搜尋、依主題篩選。關鍵詞在原文中標出。不使用 AI，結果可重現。',
  ...back,
  scr(seg(['題目', '交叉', '留言'], 2) + `<div style="display:flex;gap:8px"><input class="input" aria-label="搜尋留言" value="戶外" style="flex:1"><button class="btn btn-secondary" type="button" style="padding:0 14px">${ic('search')}</button></div>` + chips(['全部 28', '戶外活動 11', '時間安排 7', '場地天氣 6'], 1) + cm(`希望下次可以去校外參觀，不要只在教室。多辦${mark('戶外')}活動。`, '戶外活動') + cm(`${mark('戶外')}寫生很好玩，希望每學期都有。`, '戶外活動') + cm(`操場太熱了，${mark('戶外')}活動建議早上辦。`, '場地與天氣'), 10),
  act(nav, btn('下一步：輸出', 'primary'))));

// ---- 交叉分析
const cell = (v) => { const t = Math.max(0, Math.min(1, (v - 2.9) / 1.7)); return `<td style="padding:8px 6px;text-align:center;font-weight:600;background:color-mix(in srgb,var(--accent) ${Math.round(t * 60)}%,var(--card))">${v.toFixed(1)}</td>`; };
const gv = [[4.6, 4.4, 4.3, 4.4, 4.0, 3.5], [4.4, 4.3, 4.0, 4.1, 3.9, 3.2], [4.3, 4.6, 4.4, 4.3, 4.1, 3.9], [4.7, 4.3, 4.1, 3.9, 3.7, 3.0], [4.3, 4.1, 4.0, 4.1, 3.9, 3.4], [4.5, 4.5, 4.3, 4.2, 4.1, 3.7]];
const tbl = `<div style="overflow-x:auto;border:1px solid var(--line-soft);border-radius:var(--r-md);background:var(--card)"><table style="border-collapse:separate;border-spacing:2px;font-size:var(--fs-sm);font-variant-numeric:tabular-nums;min-width:440px"><thead><tr><th style="text-align:left;padding:6px 8px;position:sticky;left:0;background:var(--card)">小組</th>${['說明', '內容', '表達', '推薦', '時間', '場地'].map((c) => `<th style="padding:6px;color:var(--ink2);font-size:var(--fs-xs)">${c}</th>`).join('')}</tr></thead><tbody>${gv.map((r, i) => `<tr><th style="text-align:left;padding:8px;position:sticky;left:0;background:var(--card);font-weight:600;white-space:nowrap">第 ${i + 1} 組 <span style="color:var(--ink3);font-weight:400;font-size:var(--fs-xs)">${i < 5 ? 7 : 6}人</span></th>${r.map(cell).join('')}</tr>`).join('')}</tbody></table></div>`;
F.push(frame('5g 交叉分析｜選一個分組、選量表題，得到「各組平均」熱圖。第一欄固定，表格可左右滑。顏色越深分數越高，格內一定有數字。',
  ...back,
  scr(seg(['題目', '交叉', '留言'], 1) + rowbtn('分組依據', '小組', tag('更改', 'accent')) + rowbtn('看哪些題', '全部 6 題量表', tag('更改', 'accent')) + tbl + notice('warn', 'warn', '每組只有 6–7 人，差異可能是隨機造成的，請當作討論起點。'), 10),
  act(nav, btn('下一步：輸出', 'primary'))));

// ---- 報告回饋：清單
const rk = [['1', '第 6 組　在地小吃', '加權 86.0 · 自評 +2.0', '86.0'], ['2', '第 1 組　水資源', '加權 85.2 · 自評 +2.0', '85.2'], ['3', '第 3 組　垃圾減量', '加權 81.9 · 自評 +2.0', '81.9'], ['6', '第 2 組　校園植物', '加權 76.9 · 自評 +6.0', '76.9'], ['8', '第 4 組　交通安全', '加權 72.7 · 自評 +10.3', '72.7']];
F.push(frame('5h 報告回饋：被評對象清單｜以被評學生（或組）為單位。排名、加權分數、自評落差；落差大的加警示。可切換排序與一致性。',
  ...back,
  scr(tiles([['班級平均', '79.8'], ['最高', '86.0'], ['最低', '72.7']]) + seg(['排名', '落差', '一致性'], 0) + rk.map(([n, nm, sm, sc]) => rowbtn(`<span style="display:inline-block;width:1.4em;color:var(--ink3)">${n}</span>${nm}`, sm, tag(sc, Number(sc) > 85 ? 'ok' : Number(sc) < 75 ? 'warn' : ''))).join(''), 10),
  act(nav, btn('下一步：輸出', 'primary'))));

// ---- 報告回饋：詳情
const cmp = (nm, p, a, sf) => `<div class="cmp"><div class="h"><span style="font-weight:600">${nm}</span><span class="v"><b>${p}</b> <span class="small muted">班均 ${a}</span></span></div><div class="tr"><i style="width:${(p / 5) * 100}%"></i><u style="left:${(a / 5) * 100}%"></u><em style="left:calc(${(sf / 5) * 100}% - 1px)"></em></div></div>`;
F.push(frame('5i 報告回饋：單一對象詳情｜同學給的分、班均、自評放同一條線。下方是這位學生的留言，之後在「老師審稿」處理。',
  bar('第 1 組　水資源'), steps(3),
  scr(`<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:8px"><div class="tile" style="background:var(--accent-soft);border-color:transparent"><div class="l" style="color:var(--accent-ink)">加權總分</div><div class="n" style="color:var(--accent-ink)">85.2</div></div><div style="display:grid;gap:8px">${tile('自評', '87.2')}${tile('班均', '79.8')}</div></div>` + `<div class="legend" style="display:flex;gap:12px;flex-wrap:wrap;font-size:var(--fs-xs);color:var(--ink2)"><span>藍條：同學給分</span><span>黃虛線：班均</span><span>黑線：自評</span></div>` + qcard(cmp('內容完整 · 30%', 4.3, 4.0, 4.5), cmp('創意 · 25%', 4.0, 3.8, 4.2), cmp('表達 · 25%', 4.2, 3.9, 4.0), cmp('團隊合作 · 20%', 4.6, 4.2, 4.8)) + rowbtn('留言 5 則', '優點 3、建議 2，等老師審稿', tag('待審稿', 'warn')), 10),
  act(nav, btn('下一步：輸出', 'primary'))));

// ---- 歷次趨勢
const X = [36, 160, 284], Y = (v) => 150 - ((v - 3) / 2) * 130;
const lines = [['活動內容有趣', [3.9, 4.1, 4.37], 'var(--d1)'], ['老師說明清楚', [4.3, 4.4, 4.46], 'var(--d2)'], ['活動場地舒適', [3.8, 3.6, 3.44], 'var(--d3)']];
const svg = `<svg viewBox="0 0 358 190" style="width:100%;height:auto" role="img" aria-label="三次問卷的平均分數變化">${[3, 3.5, 4, 4.5, 5].map((g) => `<line x1="28" x2="330" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--line-soft)"/><text x="22" y="${Y(g) + 4}" text-anchor="end" font-size="11" fill="var(--ink3)">${g}</text>`).join('')}${['8/30', '9/20', '10/12'].map((t, i) => `<text x="${X[i]}" y="178" text-anchor="middle" font-size="12" fill="var(--ink2)">${t}</text>`).join('')}${lines.map(([n, v, c]) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${v.map((y, i) => `${X[i]},${Y(y)}`).join(' ')}"/>${v.map((y, i) => `<circle cx="${X[i]}" cy="${Y(y)}" r="${i === 2 ? 5 : 3.5}" fill="${c}"/>`).join('')}<text x="${X[2] + 10}" y="${Y(v[2]) + 4}" font-size="12" font-weight="700" fill="var(--ink)">${v[2].toFixed(2)}</text>`).join('')}</svg>`;
F.push(frame('5j 歷次趨勢｜同一班多次問卷並排。折線在線尾直接標分數與題名，不靠圖例對色。下方表格列出變化與方向，下降用文字說明。',
  bar('歷次趨勢'), steps(3),
  scr(`<div class="filechip">${ic('trend')}<div><b>三年二班　3 次問卷</b><span>8/30 開學、9/20、10/12 期中</span></div></div>` + qcard(svg, lines.map(([n, v, c]) => `<div style="display:flex;align-items:center;gap:8px;font-size:var(--fs-sm)"><i style="width:14px;height:4px;border-radius:2px;background:${c};flex:none"></i><span style="flex:1">${n}</span><b>${v[0].toFixed(1)} → ${v[2].toFixed(2)}</b>${tag(v[2] >= v[0] ? '上升' : '下降', v[2] >= v[0] ? 'ok' : 'warn')}</div>`).join('')) + notice('warn', 'warn', '「活動場地舒適」連續兩次下降，從 3.8 降到 3.44。'), 12),
  act(nav, btn('下一步：輸出', 'primary'))));

write('frag-b5.html', F);

// 補 .cmp 樣式（App 用，使用 token）
const css = fs.readFileSync(L.sp + '/doc.css', 'utf8');
if (!css.includes('.cmp{')) fs.appendFileSync(L.sp + '/doc.css', `
.cmp{display:flex;flex-direction:column;gap:6px}
.cmp .h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:var(--fs-sm)}
.cmp .v{font-variant-numeric:tabular-nums}
.cmp .tr{position:relative;height:20px;border-radius:5px;background:var(--sunk)}
.cmp .tr i{position:absolute;left:0;top:3px;height:14px;border-radius:4px;background:var(--accent)}
.cmp .tr u{position:absolute;top:0;bottom:0;border-left:2px dashed var(--warn-bar);text-decoration:none}
.cmp .tr em{position:absolute;top:-2px;bottom:-2px;width:3px;border-radius:2px;background:var(--ink);font-style:normal}
`);
console.log(F.length);
