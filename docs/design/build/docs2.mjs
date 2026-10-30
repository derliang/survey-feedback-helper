import { write } from './lib.mjs';
import * as D from './doc.mjs';
const { f1, f2, pct, hbar, kpi, kpis, sh, callout, note, paper, docfig } = D;

// ===== 票選結果（2 頁）=====
const roles = [
  ['班長', [['林小宇', 18], ['陳怡安', 12], ['張子豪', 6], ['黃思穎', 4]], '陳怡安'],
  ['副班長', [['王品妍', 16], ['李冠廷', 10], ['吳承翰', 10], ['周宜靜', 4]], '李冠廷'],
  ['風紀股長', [['周冠宇', 16], ['蔡佳穎', 12], ['許志豪', 8], ['鄭雅文', 4]], '蔡佳穎'],
  ['衛生股長', [['劉承恩', 20], ['謝宛庭', 12], ['蕭博文', 8]], '謝宛庭'],
];
const V = 40;
const HL = '三年二班 · 幹部選舉';
const pod = ([role, cands, alt]) => `<div class="pod" style="padding:18px 20px"><div class="role" style="font-size:14px">${role}</div><div class="nm" style="font-size:42px;line-height:1.15">${cands[0][0]}</div><div class="sub">得票 ${cands[0][1]} 票 · ${pct(cands[0][1], V)}% ${'　'}候補：${alt}</div>
<div style="display:flex;flex-direction:column;gap:9px;margin-top:14px">${cands.map(([n, v], i) => `<div class="hbar" style="grid-template-columns:64px 1fr 80px;font-size:14px"><div>${n}</div><div class="t"><i class="${i === 0 ? 'o' : ''}" style="width:${(v / V) * 100}%"></i></div><div class="v"><b>${v}</b> 票 · ${pct(v, V)}%</div></div>`).join('')}</div></div>`;

const v1 = paper(HL, '公告版', 1, 2, `
<div class="dt"><div class="eyebrow">選舉結果公告</div><h1 style="font-size:38px">三年二班 幹部選舉結果</h1>
<div class="meta"><span>投票日期 2026/10/12</span><span>投票人數 41／42 人</span><span>每個職位有效票 40 張、空白 1 張</span></div></div>
${kpis([kpi('投票率', '97.6', '%', '41／42 人投票（已排除重複）', true), kpi('有效票', 40, '張', '每個職位'), kpi('空白票', 1, '張', '每個職位'), kpi('抽籤', 1, '次', '副班長候補同票')])}
<div class="podium" style="gap:16px">${roles.map(pod).join('')}</div>
${callout('<b>恭喜當選的同學！</b>也謝謝每一位認真投票的同學。當選與候補名單已依得票排序；副班長第 2 名同票，已用抽籤決定候補（詳見第 2 頁）。', true)}
${note('同學公告版：不顯示誰投給誰，只顯示得票數。')}
`, '可張貼公告');

const rows = roles.flatMap(([role, cands, alt]) => cands.map(([n, v], i) => ({ role, n, v, i, alt, first: i === 0, count: cands.length })));
const v2 = paper(HL, '教師版 · 計票明細', 2, 2, `
${sh('計票明細', '每個職位的得票與結果。有效票以外的紀錄在下方。', '教師版')}
<table class="dtable tight"><thead><tr><th>職位</th><th>候選人</th><th class="r">得票</th><th class="r">比例</th><th>結果</th></tr></thead><tbody>
${rows.map((r) => `<tr class="${r.first ? 'hl' : ''}">${r.first ? `<td rowspan="${r.count}" style="font-weight:700;border-bottom:1px solid var(--doc-line)">${r.role}</td>` : ''}<td>${r.n}</td><td class="r"><b>${r.v}</b></td><td class="r dim">${pct(r.v, V)}%</td><td>${r.first ? '<span class="pill">當選</span>' : r.n === r.alt ? '<span class="pill n">候補</span>' : ''}${r.role === '副班長' && r.n === '吳承翰' ? ' <span class="pill n">同票·未抽中</span>' : ''}</td></tr>`).join('')}
</tbody></table>
<div class="cols2">
<div class="card"><h3 style="font-size:15px">同票抽籤紀錄</h3>
<div style="font-size:13.5px;line-height:1.6">副班長第 2 名：李冠廷、吳承翰各 10 票。<br>抽籤結果：<b>李冠廷為候補</b>。</div>
<div class="stamp">隨機種子 20261012-3A7F · 2026/10/14 15:32</div>
</div>
<div class="card"><h3 style="font-size:15px">票數概況</h3>
<div style="font-size:13.5px;line-height:1.7">收到 42 份，排除重複 1 份，納入 41 份。<br>各職位有效票 40 張，空白 1 張（同一張表單）。<br>全部職位皆無廢票。</div></div>
</div>
${sh('防弊檢查紀錄')}
<table class="dtable tight"><thead><tr><th>檢查項目</th><th>結果</th><th>處理</th></tr></thead><tbody>
<tr><td>同一人多次填答</td><td><span class="pill">1 人</span></td><td>保留最後一份，排除 1 份（老師已確認）</td></tr>
<tr><td>投給自己</td><td><span class="pill n">3 人</span></td><td>班級選舉可投自己，僅供參考</td></tr>
<tr><td>時間戳異常（3 秒內連續送出）</td><td><span class="pill">2 份</span></td><td>已標示並保留，未影響結果</td></tr>
</tbody></table>
`, '含學生資料，請依學校規範保管');

// ===== 報告回饋班級總表 =====
const W = [0.3, 0.25, 0.25, 0.2];
const grp = [
  ['水資源', [4.3, 4.0, 4.2, 4.6], [4.5, 4.2, 4.0, 4.8], 0.52],
  ['校園植物', [3.9, 3.7, 3.8, 4.0], [4.2, 4.1, 4.0, 4.3], 0.61],
  ['垃圾減量', [4.1, 4.2, 3.9, 4.2], [4.2, 4.3, 4.0, 4.3], 0.55],
  ['交通安全', [3.6, 3.4, 3.7, 3.9], [4.2, 4.0, 4.2, 4.2], 0.74],
  ['節能省電', [4.0, 3.8, 4.1, 4.3], [4.1, 3.9, 4.2, 4.4], 0.58],
  ['在地小吃', [4.4, 4.1, 4.3, 4.4], [4.5, 4.2, 4.4, 4.5], 0.49],
  ['手機使用', [3.8, 3.6, 3.5, 3.9], [4.2, 4.0, 3.9, 4.4], 0.69],
  ['運動與健康', [4.2, 3.9, 4.0, 4.1], [4.3, 4.0, 4.1, 4.1], 0.57],
].map(([t, o, s, sd], i) => ({ id: i + 1, t, o, s, sd, score: o.reduce((a, c, k) => a + c * W[k], 0) * 20, self: s.reduce((a, c, k) => a + c * W[k], 0) * 20 }));
const ranked = [...grp].sort((a, b) => b.score - a.score).map((g, i) => ({ ...g, rank: i + 1, gap: g.self - g.score }));
const avg = ranked.reduce((a, g) => a + g.score, 0) / ranked.length;
const big = ranked.filter((g) => g.gap > 5);
const maxG = [...ranked].sort((a, b) => b.gap - a.gap)[0];
const rub = ['內容完整', '創意', '表達', '團隊合作'];
const rubAvg = rub.map((_, k) => ranked.reduce((a, g) => a + g.o[k], 0) / ranked.length);

const cls = paper('三年二班 · 小組報告回饋', '教師版 · 班級總表', 1, 1, `
<div class="dt"><div class="eyebrow">班級總表 · 報告回饋</div><h1>小組報告互評結果</h1>
<div class="meta"><span>三年二班</span><span>8 組報告，41 人互評</span><span>每組已去除最高、最低各 1 筆評分</span></div></div>
${kpis([
    kpi('班級平均', f1(avg), '分', '8 組加權總分的平均（滿分 100）', true),
    kpi('最高分', f1(ranked[0].score), '分', `第 ${ranked[0].id} 組 ${ranked[0].t}`),
    kpi('最低分', f1(ranked[7].score), '分', `第 ${ranked[7].id} 組，差距 ${f1(ranked[0].score - ranked[7].score)} 分`),
    kpi('自評高於他評', big.length, '組', '落差超過 5 分'),
  ])}
${sh('各組成績與落差', '加權總分 = 各規準平均 × 權重，換算為 100 分。自評落差 = 自評 − 他評，正數表示自己給得比同學高。')}
<table class="dtable tight"><thead><tr><th class="c">名次</th><th>組別</th><th class="r">內容<br><span class="dim" style="font-weight:400">30%</span></th><th class="r">創意<br><span class="dim" style="font-weight:400">25%</span></th><th class="r">表達<br><span class="dim" style="font-weight:400">25%</span></th><th class="r">合作<br><span class="dim" style="font-weight:400">20%</span></th><th style="width:130px">加權總分</th><th class="r">自評落差</th></tr></thead><tbody>
${ranked.map((g) => `<tr class="${g.rank <= 3 ? 'hl' : ''}"><td class="c"><b>${g.rank}</b></td><td style="white-space:nowrap">第 ${g.id} 組 <span class="dim">${g.t}</span></td>${g.o.map((v) => `<td class="r">${f1(v)}</td>`).join('')}<td><div style="display:grid;grid-template-columns:1fr 44px;gap:6px;align-items:center"><div class="hbar"><div style="grid-column:1/4" class="t"><i class="${g.rank <= 3 ? 'o' : ''}" style="width:${g.score}%;display:block"></i></div></div><b class="r">${f1(g.score)}</b></div></td><td class="r">${g.gap > 5 ? `<span class="pill">+${f1(g.gap)}</span>` : `<span class="dim">${g.gap >= 0 ? '+' : ''}${f1(g.gap)}</span>`}</td></tr>`).join('')}
</tbody></table>
<div class="cols2">
<div class="card"><h3 style="font-size:15px">各規準的班級平均 <span class="note">滿分 5</span></h3>
${rub.map((r, k) => `<div class="hbar" style="grid-template-columns:70px 1fr 56px"><div>${r}</div><div class="t"><i class="${k === rubAvg.indexOf(Math.min(...rubAvg)) ? 'o' : ''}" style="width:${(rubAvg[k] / 5) * 100}%"></i></div><div class="v"><b>${f2(rubAvg[k])}</b></div></div>`).join('')}
${note('琥珀色是全班最低的規準：「' + rub[rubAvg.indexOf(Math.min(...rubAvg))] + '」，可以作為下次教學的重點。')}</div>
<div class="card"><h3 style="font-size:15px">評分是否一致 <span class="note">他評標準差</span></h3>
${[...grp].sort((a, b) => b.sd - a.sd).slice(0, 4).map((g) => `<div class="hbar" style="grid-template-columns:70px 1fr 48px"><div>第 ${g.id} 組</div><div class="t"><i style="width:${(g.sd / 1) * 100}%"></i></div><div class="v"><b>${f2(g.sd)}</b></div></div>`).join('')}
${note('標準差越大，同學對這組的看法越不一致；最高的是第 4 組。')}</div>
</div>
${callout(`<b>需要留意</b>：第 ${maxG.id} 組（${maxG.t}）自評比他評高 ${f1(maxG.gap)} 分，而且同學評分最分歧，建議個別談談。前三名為第 ${ranked.slice(0, 3).map((g) => g.id).join('、')} 組。`)}
`);

write('frag-doc-vote.html', [
  docfig(v1 + v2, '票選結果：公告頁＋計票明細', [
    '<b>公告頁給同學看</b>：大字、當選與候補、得票數，不顯示誰投給誰，可直接張貼。',
    '<b>明細頁給老師存查</b>：每個職位的得票與比例、當選／候補狀態、同票未抽中的同學標出來。',
    '<b>同票抽籤有紀錄</b>：寫明種子與時間，同樣條件可以重現結果，老師可以向同學說明公平。',
    '<b>防弊檢查只標示不替老師決定</b>：重複填答、時間戳異常、投自己，各自說明處理方式。',
  ]),
]);
write('frag-doc-feedback.html', [
  docfig(cls, '報告回饋班級總表：成績、落差、一致性', [
    '<b>加權總分＋規準分數並列</b>：看得到分數怎麼來，不只是一個排名。',
    '<b>自評落差</b>：自評高出他評 5 分以上標出，提醒老師哪一組需要談談。',
    '<b>規準班均</b>：最低的規準用琥珀色提示，直接轉成教學重點。',
    '<b>評分一致性</b>：標準差大代表同學意見分歧，分數要小心解讀。',
    '<b>方法清楚</b>：已去除最高最低各一筆、權重寫在表頭，數字有依據。',
  ]),
]);
console.log(ranked.map((g) => `${g.rank}:${g.id}:${f1(g.score)}:${f1(g.gap)}`).join(' '), 'avg', f1(avg), 'big', big.length, 'maxsd', [...grp].sort((a, b) => b.sd - a.sd)[0].id);
