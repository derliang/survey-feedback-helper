// 平板第二輪：與手機一一對應。每個手機畫面自動換成平板版（頂端列＋左欄清單＋右側內容＋底部操作列；底部彈出面板改成靠右側彈出），
// 另有 9 張維持手工設計的畫面（第三輪加審稿 6a、輸出 4、範本庫 9a，見 tablet-hand.mjs）（見 KEEP）：投影唱票（橫向，B）、票選統計、資料檢查、歷次趨勢、設定與範本、編輯器橫向。
import fs from 'node:fs';
import * as K from './m2kit.mjs';
import { phoneSecs, checkUnused } from './phones.mjs';
import * as TH from './tablet-hand.mjs';
const { ic, tag, btn, write, mframeWH, tabletize, figsOf, keyOf, patchOld } = K;
checkUnused();

// 平板左欄：[清單類型, 目前項目編號]（0 起算）；沒列的畫面用所屬分組的預設
const RAIL = {
  'new:H1': ['home', 0], 'new:1b': ['home', 0], 'new:1c': ['home', 0], 'new:1d': ['home', 0], 'flow-data:1e': ['home', 0], 'new:E3': ['home', 0], 'new:E4': ['home', 0], 'new:E5': ['sys', 4],
  'new:Gd1': ['google', 0], 'new:Gd2': ['google', 2], 'new:Gd3': ['google', 3],
  'new:G1': ['help', 0], 'new:G2': ['help', 0], 'new:S1': ['help', 1], 'new:S2': ['help', 1], 'flow-out:9': ['help', 2],
  'new:2': ['prep', 0], 'new:2a': ['prep', 0], 'new:2b': ['prep', 1], 'core:2b': ['prep', 1], 'new:3a': ['prep', 2], 'new:3b': ['prep', 2], 'flow-data:3c': ['prep', 2], 'new:W': ['prep', 4], 'flow-data:4a': ['prep', 3], 'flow-data:4b': ['prep', 3],
  'core:3': ['survey', 0], 'flow-stats:5a': ['vote', 0], 'new:V1': ['vote', 2], 'flow-stats:5b': ['vote', 0], 'flow-guard:11a': ['vote', 1], 'flow-guard:11b': ['vote', 1], 'flow-guard:11c': ['vote', 3],
  'new:5d': ['survey', 0], 'new:5d2': ['survey', 0], 'flow-stats:5e': ['survey', 1], 'flow-stats:5f': ['survey', 6], 'flow-stats:5g': ['survey', 5], 'new:E6': ['survey', 0], 'new:Gal': ['chart', 0], 'new:Save': ['chart', 2], 'flow-guard:11d': ['chart', 3], 'flow-guard:11e': ['chart', 4],
  'new:5h': ['fb', 0], 'flow-stats:5i': ['fb', 1], 'flow-stats:5j': ['trend', 0],
  'new:6a': ['review', 4], 'new:6b': ['review', 4], 'new:6c': ['review', 4], 'new:6d': ['review', 4], 'new:6e': ['review', 4], 'new:4': ['out', 0], 'flow-out:7a': ['out', 2], 'flow-out:7b': ['out', 3], 'flow-out:7c': ['out', 1], 'flow-out:10b': ['out', 3],
  'flow-edit:11a': ['edit', 1], 'flow-edit:11b': ['edit', 1], 'flow-edit:11c': ['edit', 0], 'flow-edit:11d': ['edit', 2], 'flow-edit:11e': ['edit', 3], 'flow-edit:11f': ['edit', 4], 'flow-edit:11g': ['edit', 5], 'flow-edit:11h': ['edit', 6],
  'new:9a': ['tpl', 0], 'new:9a2': ['tpl', 0], 'flow-tpl:9b': ['tpl', 0], 'flow-tpl:9c': ['tpl', 2], 'flow-tpl:9d': ['tpl', 1], 'new:9e': ['tpl', 3], 'flow-tpl:9f': ['tpl', 4],
  'flow-out:8a': ['set', 0], 'flow-out:8b': ['set', 0], 'flow-out:8c': ['set', 5], 'new:12d': ['set', 7], 'new:12f': ['set', 4], 'new:Logo': ['set', 6],
  'flow-out:10a': ['sys', 4], 'flow-out:10c': ['sys', 4], 'flow-sys:12a': ['sys', 0], 'flow-sys:12b': ['sys', 1], 'flow-sys:12c': ['sys', 2], 'flow-sys:12e': ['sys', 3],
};
const T = (cap, W, H, inner) => mframeWH(cap, W, H, inner, W > 1000 ? 12 : 28);

// ---- 手工：投影唱票（橫向 1024×768，定案 B：全部候選人同列）
const tcol = (nm, n, short) => `<div style="flex:1;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;padding:14px;background:var(--card);border:1px solid var(--line-soft);border-radius:var(--r-md);min-width:0"><b style="font-size:30px">${nm}</b><span style="font-size:140px;line-height:1;font-weight:700;font-variant-numeric:tabular-nums">${n}</span><button class="btn btn-primary" type="button" style="width:100%;min-height:80px;font-size:30px">+1 <span style="opacity:.9">${short}</span></button></div>`;
const vote = T('唱票 平板橫向：投影唱票（定案 B）｜1024×768。平板接投影或直接給全班看：每個候選人一欄、每唱一票按該欄「+1」，數字極大；「退回一票」「空白票 +1」在底部；進度條與離開鍵在上。候選人以 6 人內為宜。', 1024, 768,
  `<div style="display:flex;align-items:center;gap:14px;padding:10px 20px;background:var(--card);border-bottom:1px solid var(--line-soft)"><b style="font-size:24px">班長唱票</b><span>已唱 27／41 票</span><div class="prog" style="flex:1"><i style="width:66%"></i></div><button class="btn btn-secondary btn-sm" type="button">離開</button></div><div style="flex:1;display:flex;gap:12px;padding:16px 20px;min-height:0">${tcol('林○○', 12, '林')}${tcol('陳○○', 8, '陳')}${tcol('張○○', 5, '張')}${tcol('黃○○', 2, '黃')}</div><div class="actbar" style="padding:12px 20px;justify-content:space-between;align-items:center">${btn('退回一票', 'secondary', { icon: 'undo' })}${btn('空白票 +1', 'secondary')}</div>`);

// ---- 保留的平板舊稿（整理用語、步驟列與頂端列）
const rd = (f) => fs.readFileSync(`${K.sp}/${f}`, 'utf8');
const oldT = {};
for (const f of figsOf(rd('frag-b14.html'))) oldT[keyOf(f)] = patchOld(f);
for (const f of figsOf(rd('frag-b8.html'))) oldT['w' + keyOf(f)] = patchOld(f);
// 手機畫面 → 保留的平板舊稿
const KEEP = { 'flow-data:4a': oldT.T3, 'flow-stats:5a': oldT.T4, 'flow-stats:5j': oldT.T6, 'flow-out:8a': oldT.T9, 'flow-edit:11a': oldT.w12b, 'new:唱票': vote, 'new:6a': TH.review, 'new:4': TH.output, 'new:9a': TH.tpl };
for (const [k, v] of Object.entries(KEEP)) if (!v) throw new Error('找不到保留的平板稿：' + k);

const out = [];
let n = 0;
const secs = phoneSecs();
const result = secs.map((s) => ({
  id: s.id.replace('p-', 't-'), title: s.title, intro: s.intro,
  figs: s.entries.map((e) => {
    n++;
    if (KEEP[e.key]) return KEEP[e.key];
    const r = RAIL[e.key];
    if (!r) throw new Error('平板缺左欄設定：' + e.key);
    return tabletize(e.html, r);
  }),
}));
for (const r of result) out.push(...r.figs);
write('frag-b34.html', out);
fs.writeFileSync(`${K.sp}/tablet-secs.json`, JSON.stringify(result.map((r) => ({ id: r.id, title: r.title, intro: r.intro, n: r.figs.length }))));
console.log('b34 平板畫面', out.length, '手機畫面', n);
