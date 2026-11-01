// 雙指縮放的換算：起始縮放比 × 兩指距離變化，限制在 50%～300%，貼齊 5%。純函式。
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;

export function pinchZoom(startZoom: number, startDist: number, nowDist: number): number {
  if (!(startDist > 0) || !(nowDist > 0)) return startZoom;
  const z = Math.round((startZoom * nowDist) / startDist / 0.05) * 0.05;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(z.toFixed(2))));
}
