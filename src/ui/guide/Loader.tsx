// 教學頁與快速範本入口：進入時才動態載入，首頁 bundle 不受影響（硬規則 9）。
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export function GuideRoute() {
  const [View, setView] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    import('./GuideView').then((m) => setView(() => m.default), () => setFailed(true));
  }, []);
  if (failed)
    return (
      <main class="page" id="main">
        <p role="alert">教學頁載入失敗，請檢查網路後重新整理。</p>
      </main>
    );
  if (!View) return <main class="page" id="main" aria-busy="true" />;
  return <View />;
}
