// 編輯器入口：進入時才動態載入編輯器程式與樣式，首頁 bundle 不受影響（硬規則 9）。
import { RouteLoader } from '../lazy-view';

export function EditorRoute() {
  return <RouteLoader id="editor" load={() => import('./EditorView').then((m) => m.default)} />;
}
