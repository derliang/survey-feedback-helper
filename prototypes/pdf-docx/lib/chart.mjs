import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { DIMENSIONS_FONT } from './fonts.mjs';
import { paintChart } from './chart-core.mjs';

GlobalFonts.registerFromPath(DIMENSIONS_FONT, 'NotoSansTC');

// Node 版：回傳 PNG（3 倍解析度）
export function drawChart(dimensions, mine, avgs, wPt = 440, hPt = 190) {
  const S = 3;
  const c = createCanvas(wPt * S, hPt * S);
  paintChart(c.getContext('2d'), wPt, hPt, S, 'NotoSansTC', dimensions, mine, avgs);
  return c.toBuffer('image/png');
}
