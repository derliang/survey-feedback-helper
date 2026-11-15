// 教學頁與快速範本入口：進入時才動態載入，首頁 bundle 不受影響（硬規則 9）。
import { RouteLoader } from '../lazy-view';

export function GuideRoute() {
  return <RouteLoader id="guide" load={() => import('./GuideView').then((m) => m.default)} />;
}
