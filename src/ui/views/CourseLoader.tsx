// 選課分組志願的畫面：進入時才動態載入，首頁 bundle 不受影響（硬規則 9）。
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export function CourseRoute({ part }: { part: 'stats' | 'output' }) {
  const [View, setView] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setView(null);
    (part === 'stats' ? import('./CourseView') : import('./CourseOutput')).then(
      (m) => setView(() => m.default),
      () => setFailed(true),
    );
  }, [part]);
  if (failed)
    return (
      <main class="page" id="main">
        <p role="alert">畫面載入失敗，請檢查網路後重新整理。</p>
      </main>
    );
  if (!View) return <main class="page" id="main" aria-busy="true" />;
  return <View />;
}
