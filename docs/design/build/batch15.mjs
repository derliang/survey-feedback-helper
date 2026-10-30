import * as W from './wide.mjs';
const { L, miniPaper, frameWH, topbar, pane, flex1, body, foot, kbd, fchip, h, th, td, qrow, nvr, tgl, card, table, cmt, cmpbar, addPages, voteBars, vote } = W;
const { ic, tag, icbtn, btn, notice, tile, tiles, seg, chips, rcard, rowbtn, grp, brow, write } = L;
const D = (cap, step, inner, file) => frameWH(cap, 1280, 800, `${topbar(step, file)}${inner}`);
const side = (w, inner) => pane(w, inner, 'padding:12px;border-right:1px solid var(--line-soft)');
const main = (inner, o = '') => flex1(inner, `padding:20px;overflow:hidden;${o}`);
const rside = (w, inner) => pane(w, inner, 'padding:20px;border-left:1px solid var(--line-soft);background:var(--card)');
const nav = () => foot(btn('上一步', 'secondary'), btn('下一步：輸出', 'primary'));
const modal = (w, inner) => `<div class="scrim"></div><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${w}px;background:var(--card);border-radius:var(--r-lg);padding:28px;display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 40px var(--shadow-sm)">${inner}</div>`;
const F = [];

// D1 票選統計
F.push(D('D1 桌機：票選統計｜三欄：職位清單／該職位結果與長條／規則與防弊摘要。右側可一鍵開啟投影唱票。同票會警示並提示抽籤。', 3,
  `${body(side(260, `<div class="small muted" style="font-weight:700">職位</div>${nvr('班長', true, tag('林小宇', 'ok'))}${nvr('副班長', false, tag('王品妍', 'ok'))}${nvr('風紀股長', false, tag('周冠宇', 'ok'))}${nvr('衛生股長', false, tag('劉承恩', 'ok'))}`), main(`${h('班長', '有效票 40 張，空白 1 張')}${tiles([['當選', '林小宇'], ['得票', '18 票 · 45%'], ['候補', '陳怡安']])}${card(voteBars())}${notice('', 'info', '副班長第 2 名同票（李冠廷、吳承翰各 10 票），已抽籤決定候補。種子 20261012-3A7F。')}`), rside(340, `${h('防弊與規則')}${rowbtn('同一人投多次', '1 位 · 只算最後一份', tag('已決定', 'ok'), false, false)}${rowbtn('自己投自己', '3 人 · 計入', tag('已決定', 'ok'), false, false)}${rowbtn('時間異常', '2 份 · 保留並標示', tag('已決定', 'ok'), false, false)}<div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">${btn('開啟投影唱票', 'primary', { icon: 'cast', block: true })}${btn('計票規則…', 'secondary', { block: true })}</div>`))}${nav()}`));

// D2 報告回饋
const rk = [['1', '第 6 組　在地小吃', '86.0'], ['2', '第 1 組　水資源', '85.2'], ['3', '第 3 組　垃圾減量', '81.9'], ['6', '第 2 組　校園植物', '76.9'], ['8', '第 4 組　交通安全', '72.7']];
F.push(D('D2 桌機：報告回饋統計｜左邊排名、中間單一對象詳情（對照條）、右邊評分一致性與自評落差。三者同時看得到，不用切頁。', 3,
  `${body(side(280, `${seg(['排名', '落差', '一致性'], 0)}${rk.map(([n, nm, s], i) => qrow(`<span style="width:1.4em;color:var(--ink3)">${n}</span><span style="flex:1">${nm}</span><b>${s}</b>`, i === 1)).join('')}`), main(`${h('第 1 組　水資源')}<div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px"><div class="tile" style="background:var(--accent-soft);border-color:transparent"><div class="l" style="color:var(--accent-ink)">加權總分</div><div class="n" style="color:var(--accent-ink)">85.2</div></div>${tile('自評', '87.2')}${tile('班均', '79.8')}</div><div class="small muted">藍條：同學給分　黃虛線：班均　黑線：自評</div>${card(cmpbar('內容完整 · 30%', 4.3, 4.0, 4.5), cmpbar('創意 · 25%', 4.0, 3.8, 4.2), cmpbar('表達 · 25%', 4.2, 3.9, 4.0), cmpbar('團隊合作 · 20%', 4.6, 4.2, 4.8))}`), rside(340, `${h('評分一致性', '標準差越大，評分者的看法越不一致')}${table(['規準', '標準差', '看法'], [['內容完整', '0.52', '一致'], ['創意', '0.71', '一致'], ['表達', '0.88', tag('分歧', 'warn')], ['團隊合作', '0.45', '一致']])}${notice('', 'info', '去掉每項最高與最低分後再算平均（設定可關閉）。')}`))}${nav()}`));

// D3 歷次趨勢
const X = [90, 480, 870], Y = (v) => 260 - ((v - 3) / 2) * 220;
const lines = [['活動內容有趣', [3.9, 4.1, 4.37], 'var(--d1)'], ['老師說明清楚', [4.3, 4.4, 4.46], 'var(--d2)'], ['活動場地舒適', [3.8, 3.6, 3.44], 'var(--d3)']];
const svg = `<svg viewBox="0 0 1000 300" style="width:100%;height:auto" role="img" aria-label="三次問卷的平均分數變化">${[3, 3.5, 4, 4.5, 5].map((g) => `<line x1="60" x2="960" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--line-soft)"/><text x="52" y="${Y(g) + 4}" text-anchor="end" font-size="13" fill="var(--ink3)">${g}</text>`).join('')}${['8/30 開學', '9/20', '10/12 期中'].map((t, i) => `<text x="${X[i]}" y="292" text-anchor="middle" font-size="14" fill="var(--ink2)">${t}</text>`).join('')}${lines.map(([n, v, c]) => `<polyline fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" points="${v.map((y, i) => `${X[i]},${Y(y)}`).join(' ')}"/>${v.map((y, i) => `<circle cx="${X[i]}" cy="${Y(y)}" r="${i === 2 ? 6 : 4.5}" fill="${c}"/>`).join('')}<text x="${X[2] + 14}" y="${Y(v[2]) + 5}" font-size="14" font-weight="700" fill="var(--ink)">${n} ${v[2].toFixed(2)}</text>`).join('')}</svg>`;
F.push(D('D3 桌機：歷次趨勢｜折線直接在線尾標題名與分數，不靠圖例對色；右邊選要比較的問卷與題目；下方表格寫出變化與方向。', 3,
  `${body(main(`${fchip('trend', '三年二班　3 次問卷', '8/30 開學、9/20、10/12 期中')}${card(svg)}${table(['題目', '8/30', '9/20', '10/12', '變化'], lines.map(([n, v]) => [n, v[0].toFixed(1), v[1].toFixed(1), v[2].toFixed(2), tag(v[2] >= v[0] ? '上升' : '下降', v[2] >= v[0] ? 'ok' : 'warn')]))}`), rside(320, `${h('比較設定')}<div class="grp"><span class="gl">問卷</span>${chips(['8/30', '9/20', '10/12'], 0)}</div>${tgl('只看量表題', '', true)}${tgl('標示下降的題目', '', true)}${notice('warn', 'warn', '「活動場地舒適」連續兩次下降，從 3.8 降到 3.44。')}`))}${nav()}`));

// D4 交叉分析
const gcols = ['說明', '內容', '表達', '推薦', '時間', '場地'];
const gv = [[4.6, 4.4, 4.3, 4.4, 4.0, 3.5], [4.4, 4.3, 4.0, 4.1, 3.9, 3.2], [4.3, 4.6, 4.4, 4.3, 4.1, 3.9], [4.7, 4.3, 4.1, 3.9, 3.7, 3.0], [4.3, 4.1, 4.0, 4.1, 3.9, 3.4], [4.5, 4.5, 4.3, 4.2, 4.1, 3.7]];
const gn = [7, 7, 7, 7, 7, 6];
const hc = (v) => { const t = Math.max(0, Math.min(1, (v - 2.9) / 1.7)); return `background:color-mix(in srgb,var(--accent) ${Math.round(12 + t * 78)}%,var(--card));color:${t > 0.55 ? '#fff' : 'var(--ink)'};font-weight:700;text-align:center`; };
F.push(D('D4 桌機：意見調查交叉分析｜左邊選分組與題目、中間熱圖（格內一定寫數字）、右邊讀法與警語。人數少的組加「僅供參考」。', 3,
  `${body(side(280, `${h('交叉分析')}${rowbtn('分組依據', '小組', tag('更改', 'accent'))}${rowbtn('看哪些題', '全部 6 題量表', tag('更改', 'accent'))}${seg(['題目', '交叉', '留言'], 1)}`), main(`<div style="border:1px solid var(--line-soft);border-radius:var(--r-md);overflow:hidden;background:var(--card)"><table style="border-collapse:collapse;width:100%;font-size:var(--fs-md)"><thead><tr><th style="${th}"></th>${gcols.map((c) => `<th style="${th};text-align:center">${c}</th>`).join('')}<th style="${th};text-align:right">人數</th></tr></thead><tbody>${gv.map((r, i) => `<tr><td style="${td};font-weight:700">第 ${i + 1} 組</td>${r.map((v) => `<td style="${td};${hc(v)}">${v.toFixed(1)}</td>`).join('')}<td style="${td};text-align:right">${gn[i]}</td></tr>`).join('')}</tbody></table></div><div class="small muted">顏色越深分數越高。</div>`), rside(320, `${h('怎麼讀')}<p class="small" style="margin:0;line-height:1.7">看哪一組在哪一題和全班不一樣。「場地」欄全班平均 3.44，第 2、4 組只有 3.2 與 3.0。</p>${notice('warn', 'warn', '每組只有 6–7 人，差異可能是隨機造成的，請當作討論起點。')}`))}${nav()}`));

// D5 留言
const hi = (t, k) => t.replace(k, `<mark style="background:var(--accent-soft);color:var(--accent-ink);border-radius:3px;padding:0 2px">${k}</mark>`);
F.push(D('D5 桌機：開放題留言｜左邊依主題分組與關鍵詞、中間留言（關鍵詞標出）、右邊常出現的詞。離線處理，不使用 AI。', 3,
  `${body(side(260, `<div class="small muted" style="font-weight:700">主題</div>${nvr('全部', true, tag('38'))}${nvr('活動內容', false, tag('14'))}${nvr('場地環境', false, tag('9'))}${nvr('時間安排', false, tag('7'))}${nvr('分組', false, tag('6'))}${nvr('其他', false, tag('2'))}`), main(`<div class="field"><label for="sq">搜尋留言</label><input class="input" id="sq" value="場地"></div>${['操場太曬，休息的地方不夠，<b>場地</b>可以再舒服一點。', '希望下次的<b>場地</b>有遮陽棚。', '<b>場地</b>很大，但是廁所有點遠。'].map((t) => `<div class="qcard" style="gap:6px;padding:12px 14px"><div style="display:flex;gap:6px">${tag('場地環境', 'accent')}</div><div style="line-height:1.7">${t}</div></div>`).join('')}`), rside(300, `${h('常出現的詞', '只計次數，不判斷意思')}<div style="display:flex;flex-wrap:wrap;gap:8px">${[['闖關', 12], ['場地', 9], ['太曬', 6], ['休息', 5], ['時間', 5], ['分組', 4]].map(([t, n]) => `<span class="tag">${t} ${n}</span>`).join('')}</div>`))}${nav()}`));

// D6 輸出完成
F.push(D('D6 桌機：輸出完成｜完成後以對話框列出檔案、大小與下載；說明資料保管提醒。分享不是桌機主要路徑，改為「在資料夾中顯示」。', 4,
  `${body(main(`${seg(['Excel', 'Word', 'PDF'], 2, '格式')}${h('輸出設定')}${card('<div class="small muted">41 個 PDF，打包 1 個 zip</div>')}`))}${nav()}${modal(520, `<div style="display:flex;align-items:center;gap:10px"><span style="color:var(--ok)">${ic('check')}</span><h2 style="margin:0;font-size:var(--fs-xl)">輸出完成</h2></div>${fchip('file', '三年二班_回饋單_學生版.zip', '41 個 PDF · 3.3 MB')}${notice('', 'lock', '輸出檔含學生資料，請依學校的個資規範保管，不要放在公開的雲端位置。')}<div style="display:flex;gap:8px">${btn('在資料夾中顯示', 'secondary', { style: 'flex:1' })}${btn('下載', 'primary', { style: 'flex:1', icon: 'down-arrow' })}</div>`)}`));

// D7 Google 雲端硬碟（桌機雙軌）
F.push(D('D7 桌機：Google 雲端硬碟雙軌｜桌機 Chrome／Edge 可直接選「Google 雲端硬碟 for desktop」資料夾讀寫（軌二，不用登入）；也可登入用 Picker（軌一，可轉換 Google 試算表）。', 1,
  `${body(main(`${h('開啟問卷檔')}${card('<div class="small muted">背景頁面</div>')}`))}${modal(700, `<div style="display:flex;align-items:center"><h2 style="margin:0;font-size:var(--fs-xl)">從 Google 雲端硬碟開啟</h2><span style="margin-left:auto">${icbtn('x', '關閉')}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="qcard" style="gap:10px"><b>用資料夾（不用登入）</b><p class="small muted" style="margin:0;line-height:1.7">選「Google 雲端硬碟 for desktop」在這台電腦上的資料夾，可直接讀取與存檔，並自動同步。</p><div class="small">只有 Chrome 與 Edge 支援</div>${btn('選擇資料夾', 'primary', { block: true, icon: 'folder' })}</div><div class="qcard" style="gap:10px"><b>用 Google 帳號登入</b><p class="small muted" style="margin:0;line-height:1.7">用選檔視窗挑檔案。Google 試算表會自動轉成 xlsx 再讀。</p><div class="small">所有瀏覽器可用 · 只申請你選的檔案</div>${btn('連線 Google', 'secondary', { block: true })}</div></div>${notice('warn', 'warn', 'Google 雲端硬碟 for desktop 裡的「Google 試算表」只是捷徑，不能直接讀。請改用右邊的登入方式，或先下載為 Excel。')}`)}`));

// D8 教學頁
F.push(D('D8 桌機：Google 表單設計教學｜左邊五個設計技巧（步驟有先後才用編號），右邊範本表單與「複製到我的 Google 表單」連結。', 1,
  `${body(main(`${h('如何設計 Google 表單才好分析', '五個小技巧，讓統計一次就對。')}${card('<ol style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:10px;line-height:1.7"><li><b>姓名與座號用「簡答」並各自一欄</b>，不要合在一起。</li><li><b>量表題用「線性刻度」1–5</b>，才能算平均與分布。</li><li><b>單選與複選分開問</b>，統計方式不同。</li><li><b>票選用「選擇題」並限一人一票</b>，避免重複。</li><li><b>開放題放在最後</b>，避免同學不想填。</li></ol>')}`), rside(380, `${h('範本表單')}${rowbtn('意見調查範本', '量表＋單選＋開放題', '', false, true)}${rowbtn('幹部票選範本', '每個職位一題', '', false, true)}${rowbtn('報告互評範本', '評分規準＋留言', '', false, true)}${notice('', 'info', '範本是 Google 表單連結，開啟後選「建立副本」即可編輯。')}`))}`));

// D10 量表與反向計分
F.push(D('D10 桌機：量表標籤與反向計分｜左邊標籤與預設、右邊反向題清單與反向前後的平均；改動即時預覽在下方圖上。', 3,
  `${body(main(`${h('量表標籤')}<div class="grp"><span class="gl">套用預設</span>${chips(['同意程度', '滿意度', '頻率', '自訂'], 0)}</div>${card(['非常不同意', '不同意', '普通', '同意', '非常同意'].map((t, i) => `<div style="display:flex;align-items:center;gap:10px"><b class="mono" style="width:1.2em">${i + 1}</b><div class="input" style="flex:1;min-height:44px;display:flex;align-items:center">${t}</div></div>`).join(''))}`), rside(480, `${h('反向計分', '分數換成「6 − 原分數」，原始資料不改。')}${tgl('第 3 題　分組讓我有機會表達', '', false)}${tgl('第 5 題　活動時間太趕', '平均 3.8 → 2.2', true)}${tgl('第 6 題　場地讓我不舒服', '平均 3.5 → 2.5', true)}${notice('warn', 'warn', '第 6 題標為反向後，總平均會跟著改變。若不確定，請回到題目文字確認。')}`))}${nav()}`));

// D11 設定三層
const row = (n, a, b, c) => [n, a, b, c];
F.push(D('D11 桌機：預設值三層｜用一張表同時看「全域預設／問卷範本／本次」三層，每項標出最終值來自哪一層；被覆寫的以警示標籤標出。', 4,
  `${body(pane(240, `${['全域預設', '版面範本', '檔名規則', '關鍵字提醒', '備份與還原', '外觀', '隱私與關於'].map((t, i) => nvr(t, i === 0)).join('')}`, 'padding:12px;border-right:1px solid var(--line-soft)'), main(`${h('預設值', '最終值＝本次 → 範本 → 全域，由左往右最先有值的那一層。')}${table(['設定', '全域預設', '問卷範本（票選）', '本次', '最終值'], [row('排除重複填答', '只算最後一份', '—', '—', '只算最後一份 ' + tag('全域', '')), row('自投是否計入', '計入', '計入', '—', '計入 ' + tag('範本', 'accent')), row('去掉最高最低分', '關', '—', '開', '開 ' + tag('本次覆寫', 'warn')), row('檔名規則', '{班級}_{座號}_{姓名}', '—', '—', '{班級}_{座號}_{姓名} ' + tag('全域', ''))])}${notice('', 'info', '備份檔只含設定與範本，不含學生資料；舊版設定匯入時自動轉換。')}`))}`));

write('frag-b15.html', F);
addPages({ id: 'flow-desk2', short: '桌機：統計與其他', name: '桌機-統計與其他畫面', title: '桌機（1280）：統計各類型、輸出、雲端硬碟、教學、狀態、設定', intro: '桌機三欄版面，補上票選、報告回饋、歷次趨勢、交叉分析、留言、輸出完成、雲端硬碟雙軌、教學、空白與錯誤、量表設定、三層預設。', frag: 'frag-b15.html' });
console.log(F.length);
