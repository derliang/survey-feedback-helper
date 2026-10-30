// 圖表繪製核心：只用標準 Canvas 2D API，Node（@napi-rs/canvas）與瀏覽器共用。
// 畫「你 vs 班級平均」長條圖。g 是 2D context；wPt、hPt 是版面尺寸（pt），S 是解析度倍率。
export function paintChart(g, wPt, hPt, S, family, dimensions, mine, avgs) {
  const W = wPt * S, H = hPt * S;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.font = `${10 * S}px ${family}`;
  const left = 96 * S, right = 16 * S, top = 22 * S, bottom = 14 * S;
  const plotW = W - left - right;
  const rowH = (H - top - bottom) / dimensions.length;
  g.fillStyle = '#1f4e79'; g.fillRect(left, 6 * S, 10 * S, 8 * S);
  g.fillStyle = '#333'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('你', left + 14 * S, 10 * S);
  g.fillStyle = '#b8c7d6'; g.fillRect(left + 44 * S, 6 * S, 10 * S, 8 * S);
  g.fillStyle = '#333'; g.fillText('班級平均', left + 58 * S, 10 * S);
  g.strokeStyle = '#e3e9ef'; g.lineWidth = 1 * S; g.fillStyle = '#777';
  g.font = `${8 * S}px ${family}`; g.textAlign = 'center';
  for (let v = 0; v <= 5; v++) {
    const x = left + (plotW * v) / 5;
    g.beginPath(); g.moveTo(x, top); g.lineTo(x, H - bottom); g.stroke();
    g.fillText(String(v), x, H - 5 * S);
  }
  g.textAlign = 'right'; g.font = `${10 * S}px ${family}`;
  dimensions.forEach((d, i) => {
    const y = top + i * rowH;
    g.fillStyle = '#333'; g.textBaseline = 'middle';
    g.fillText(d, left - 8 * S, y + rowH / 2);
    const bh = rowH * 0.32;
    g.fillStyle = '#1f4e79'; g.fillRect(left, y + rowH * 0.14, (plotW * mine[i]) / 5, bh);
    g.fillStyle = '#b8c7d6'; g.fillRect(left, y + rowH * 0.14 + bh + 2 * S, (plotW * avgs[i]) / 5, bh);
  });
}
