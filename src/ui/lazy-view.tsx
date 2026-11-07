// 路由畫面延遲載入：首頁 bundle 只含首頁，其餘畫面進入時才載入（硬規則 9）。
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { extra } from './strings-extra';

export function lazyView(load: () => Promise<ComponentType>): ComponentType {
  let loaded: ComponentType | null = null;
  const start = () => load().then((c) => (loaded = c));
  return function LazyView() {
    const [View, setView] = useState<ComponentType | null>(loaded);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (!loaded) start().then((c) => setView(() => c), () => setFailed(true));
    }, []);
    if (failed)
      return (
        <main class="page" id="main">
          <p role="alert">{extra().loadFail.view}</p>
        </main>
      );
    if (!View) return <main class="page" id="main" aria-busy="true" />;
    return <View />;
  };
}
