import { strings } from './strings';

// 骨架佔位畫面；正式畫面由設計員依 docs/design/ 設計後實作
export function App() {
  return (
    <main class="shell">
      <h1>{strings.appName}</h1>
      <p>{strings.placeholder}</p>
    </main>
  );
}
