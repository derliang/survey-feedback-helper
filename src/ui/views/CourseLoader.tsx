// 選課分組志願的畫面：進入時才動態載入，首頁 bundle 不受影響（硬規則 9）。
import { RouteLoader } from '../lazy-view';

export function CourseRoute({ part }: { part: 'stats' | 'output' }) {
  return <RouteLoader id={part} load={() => (part === 'stats' ? import('./CourseView') : import('./CourseOutput')).then((m) => m.default)} />;
}
