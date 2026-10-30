// A4 文件片段：共用工具與虛構資料（統計一律由資料即時算出，避免數字對不上）
export const f1 = (x) => x.toFixed(1);
export const f2 = (x) => x.toFixed(2);
export const pct = (a, b) => Math.round((a / b) * 100);

export const LK_COL = ['#cf5f12', '#eaa06a', '#ddd5c8', '#7f9be3', '#2554d8'];
export const LK_TXT = ['#fff', '#14171f', '#14171f', '#14171f', '#fff'];
export const LK_NAME = ['非常不同意', '不同意', '普通', '同意', '非常同意'];

export function stats(d) {
  const n = d.reduce((a, b) => a + b, 0);
  const mean = d.reduce((a, c, i) => a + c * (i + 1), 0) / n;
  const sd = Math.sqrt(d.reduce((a, c, i) => a + c * (i + 1 - mean) ** 2, 0) / (n - 1));
  let acc = 0, med = 0;
  for (let i = 0; i < d.length; i++) { acc += d[i]; if (acc >= n / 2) { med = i + 1; break; } }
  return { n, mean, sd, med, top2: (d[3] + d[4]) / n, low2: (d[0] + d[1]) / n };
}

export const legend = () => `<div class="legend">${LK_NAME.map((t, i) => `<span><i style="background:${LK_COL[i]}"></i>${i + 1} ${t}</span>`).join('')}</div>`;
export const lk = (d) => {
  const n = d.reduce((a, b) => a + b, 0);
  return `<div class="lk">${d.map((c, i) => { const p = (c / n) * 100; return c ? `<i style="width:${p}%;background:${LK_COL[i]};color:${LK_TXT[i]};font-size:11px;font-weight:700;display:grid;place-items:center">${p >= 8 ? Math.round(p) : ''}</i>` : ''; }).join('')}</div>`;
};
export const lkrow = (q, d) => { const s = stats(d); return `<div class="lkrow"><div class="q">${q}</div>${lk(d)}<div class="m">${f2(s.mean)}<small>4–5 分 ${Math.round(s.top2 * 100)}%</small></div></div>`; };
export const hbar = (name, v, base, kind = '', suffix = '人') => `<div class="hbar"><div>${name}</div><div class="t"><i class="${kind}" style="width:${(v / base) * 100}%"></i></div><div class="v"><b>${v}</b> ${suffix} · ${pct(v, base)}%</div></div>`;
export const kpi = (l, n, unit, s, hi = false) => `<div class="kpi${hi ? ' hi' : ''}"><div class="n">${n}<small>${unit}</small></div><div class="l">${l}</div><div class="s">${s}</div></div>`;
export const kpis = (arr) => `<div class="kpis">${arr.join('')}</div>`;
export const finds = (arr) => `<ul class="finds">${arr.map((t) => `<li><div>${t}</div></li>`).join('')}</ul>`;
export const sh = (h, p = '', eb = '') => `<div class="sh">${eb ? `<div class="eyebrow">${eb}</div>` : ''}<h2>${h}</h2>${p ? `<p>${p}</p>` : ''}</div>`;
export const quote = (t, by, pill = '') => `<div class="quote"><div>「${t}」</div><div class="by">${pill}${by}</div></div>`;
export const callout = (html, g = false) => `<div class="callout${g ? ' g' : ''}">${html}</div>`;
export const note = (t) => `<p class="note">${t}</p>`;
export const kw = (arr) => `<div class="kw">${arr.map(([t, n, big]) => `<span${big ? ' class="big"' : ''}>${t}<b>${n}</b></span>`).join('')}</div>`;
export const heat = (rows, cols, vals, ns) => {
  const col = (v) => { const t = Math.max(0, Math.min(1, (v - 2.9) / 1.7)); const a = 0.12 + t * 0.78; return `rgba(37,84,216,${a.toFixed(2)})`; };
  const txt = (v) => ((v - 2.9) / 1.7 > 0.55 ? '#fff' : '#14171f');
  return `<div class="hm" style="grid-template-columns:64px repeat(${cols.length},1fr) 40px"><div class="h"></div>${cols.map((c) => `<div class="h">${c}</div>`).join('')}<div class="h">人數</div>${rows.map((r, i) => `<div class="rl">${r}</div>${vals[i].map((v) => `<div style="background:${col(v)};color:${txt(v)};font-weight:600">${f1(v)}</div>`).join('')}<div class="h" style="font-weight:400">${ns[i]}</div>`).join('')}</div>`;
};

export const paper = (hdrL, hdrR, page, total, inner, foot = '含學生資料，請依學校規範保管') =>
  `<div class="scale" data-w="794" data-h="1123"><div class="paper doc-warm"><div class="ph"><span>${hdrL}</span><span>${hdrR}</span></div>${inner}<div class="pf"><span>問卷回饋小幫手 · ${foot}</span><span>第 ${page}／${total} 頁</span></div></div></div>`;
export const docfig = (papers, capTitle, bullets) =>
  `<figure class="docfig">${papers}<figcaption><b>${capTitle}</b><ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul></figcaption></figure>`;

// 虛構資料：三年二班「期中班級活動滿意度調查」
export const Q = [
  ['老師說明清楚', [0, 0, 4, 14, 23]],
  ['活動內容有趣', [0, 1, 5, 13, 22]],
  ['分組討論讓我有機會表達', [0, 2, 6, 16, 17]],
  ['我願意推薦給其他班', [1, 1, 7, 13, 19]],
  ['活動時間安排適當', [1, 3, 8, 15, 14]],
  ['活動場地舒適', [3, 5, 12, 13, 8]],
];
