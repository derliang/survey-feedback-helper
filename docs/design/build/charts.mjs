// 統計圖表縮圖與用途說明（R-017、R-024、R-029）。畫面與編輯器的選擇器共用，顏色走 token，字走 HTML。
const W = 120, H = 72;
const svg = (inner) => `<svg class="cth" viewBox="0 0 ${W} ${H}" aria-hidden="true">${inner}</svg>`;
const rect = (x, y, w, h, c, r = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="var(--${c})"/>`;
const line = (d, c, sw = 2) => `<path d="${d}" fill="none" stroke="var(--${c})" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x, y, c, r = 3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--${c})"/>`;

const bar = () => svg([[10, 96], [26, 66], [42, 42], [58, 24]].map(([y, w], i) => rect(8, y, w, 10, i ? 'bar-muted' : 'd1')).join(''));
const stack = () => svg([[10, [8, 12, 22, 34, 28]], [30, [4, 10, 30, 36, 24]], [50, [14, 18, 26, 26, 20]]].map(([y, p]) => { let x = 8; return p.map((v, i) => { const s = rect(x, y, v - 1, 12, ['d2', 'warn-bar', 'bar-muted', 'd4', 'd1'][i], 0); x += v; return s; }).join(''); }).join(''));
const cmp = () => svg([14, 36, 58].map((y, i) => `${rect(8, y - 5, 104, 10, 'sunk', 5)}${rect(8, y - 5, [78, 64, 88][i], 10, 'd1', 5)}${line(`M${[66, 70, 74][i]} ${y - 9}v18`, 'd2', 2.5)}`).join(''));
const lines = () => svg(`${line('M10 50L60 36L110 16', 'd1')}${line('M10 30L60 26L110 22', 'd2')}${line('M10 26L60 40L110 54', 'd3')}${dot(110, 16, 'd1')}${dot(110, 22, 'd2')}${dot(110, 54, 'd3')}`);
const heat = () => svg([0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${8 + c * 26.5}" y="${6 + r * 21}" width="25" height="19" rx="2" fill="var(--d1)" opacity="${[0.25, 0.5, 0.75, 1, 0.5, 0.25, 1, 0.75, 0.75, 1, 0.25, 0.5][r * 4 + c]}"/>`).join('')).join(''));
const donut = () => { const r = 25, C = 2 * Math.PI * r; let off = 0; return svg([[0.45, 'd1'], [0.3, 'd2'], [0.15, 'd4'], [0.1, 'bar-muted']].map(([p, c]) => { const s = `<circle cx="60" cy="36" r="${r}" fill="none" stroke="var(--${c})" stroke-width="13" stroke-dasharray="${(p * C).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off * C).toFixed(1)}" transform="rotate(-90 60 36)"/>`; off += p; return s; }).join('')); };
const hist = () => svg([6, 14, 26, 42, 54, 34, 18, 8].map((v, i) => rect(10 + i * 12.6, 66 - v, 11, v, i === 4 ? 'd1' : 'bar-muted', 1)).join(''));
const radar = () => { const c = [60, 37], R = 31, pt = (i, k) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return `${(c[0] + R * k * Math.cos(a)).toFixed(1)} ${(c[1] + R * k * Math.sin(a)).toFixed(1)}`; }; const poly = (ks) => `M${ks.map((k, i) => pt(i, k)).join('L')}Z`; return svg(`<path d="${poly([1, 1, 1, 1, 1])}" fill="none" stroke="var(--line)"/><path d="${poly([0.5, 0.5, 0.5, 0.5, 0.5])}" fill="none" stroke="var(--line)"/><path d="${poly([0.9, 0.7, 0.8, 0.55, 0.85])}" fill="var(--accent-soft)" stroke="var(--d1)" stroke-width="2"/>`); };
const scatter = () => svg(`${line('M10 6V64H112', 'ink3', 1)}${[[22, 54], [30, 46], [38, 50], [48, 38], [56, 42], [64, 30], [72, 34], [84, 22], [92, 26], [102, 14]].map(([x, y]) => dot(x, y, 'd1', 2.6)).join('')}`);
const box = () => svg([[14, 16, 40, 66, 90, 106], [36, 30, 48, 62, 84, 100], [58, 8, 32, 50, 76, 112]].map(([y, a, b, m, d, e]) => `${line(`M${a} ${y}H${e}`, 'ink3', 1.5)}${rect(b, y - 7, d - b, 14, 'accent-soft', 2)}<rect x="${b}" y="${y - 7}" width="${d - b}" height="14" rx="2" fill="none" stroke="var(--d1)" stroke-width="1.5"/>${line(`M${m} ${y - 7}v14`, 'd1', 2.5)}`).join(''));
const dots = () => svg([[16, 88], [36, 68], [56, 44]].map(([y, x]) => `${line(`M8 ${y}H${x}`, 'bar-muted', 2)}${dot(x, y, 'd1', 5)}`).join(''));

export const CHARTS = {
  bar: ['長條圖', '比較各選項的多寡，票選最清楚。', bar],
  stack: ['堆疊橫條', '一題一條，看同意到不同意的比例。', stack],
  cmp: ['對照條', '同時看同學給分、班均與自評。', cmp],
  line: ['折線圖', '看同一題在歷次問卷的變化。', lines],
  heat: ['交叉熱圖', '看不同分組的回答差在哪裡。', heat],
  donut: ['圓環圖', '看各部分占全部的比例，選項少時用。', donut],
  hist: ['直方圖', '看分數集中在哪個區間。', hist],
  radar: ['雷達圖', '一次看同一人或一組的各項強弱。', radar],
  scatter: ['散布圖', '看兩題分數有沒有一起高低。', scatter],
  box: ['盒鬚圖', '比較各題的中位數與分散程度。', box],
  dots: ['圓點圖', '名單很長時，用來代替長條圖排名。', dots],
};
// 每種統計的預設圖（R-029）與適用的圖
export const DEFAULT = { 票選: 'bar', 量表: 'stack', 報告回饋: 'cmp', 趨勢: 'line', 交叉: 'heat' };
export const FOR = {
  票選: ['bar', 'donut', 'dots'],
  量表: ['stack', 'bar', 'hist', 'box', 'donut', 'dots'],
  報告回饋: ['cmp', 'radar', 'box', 'scatter', 'dots'],
};
export const thumb = (k) => CHARTS[k][2]();
export const chartLabel = (k) => CHARTS[k][0];
export const chartUse = (k) => CHARTS[k][1];
