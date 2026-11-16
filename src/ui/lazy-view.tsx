// 路由畫面延遲載入：首頁 bundle 只含首頁，其餘畫面進入時才載入（硬規則 9）。
// 載入中與載入失敗的外觀統一（DESIGN 5.34 C）：300ms 後仍未完成才顯示骨架；失敗給錯誤提示加「重新載入」「回上一步」。
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { go, useApp } from '../app/store';
import { Notice } from './parts/parts';
import { extra } from './strings-extra';

/** 延遲 ms 後才變成 true；重新計時用 key。 */
function useDelayed(ms: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return on;
}

/** 載入中：一開始是空白（快的網路不閃），300ms 後仍未完成才出現骨架與一行說明。 */
export function LoadingPage() {
  const show = useDelayed(300);
  return (
    <main class="page" id="main" aria-busy="true">
      {show && (
        <div class="skel" data-testid="loading">
          <p class="skel-text" role="status">
            {extra().loadState.loading}
          </p>
          <div class="skel-bar" />
          <div class="skel-card" />
          <div class="skel-card short" />
        </div>
      )}
    </main>
  );
}

/** 載入失敗：錯誤提示（標題、原因、你的資料還在）＋「重新載入」（主要）與「回上一步」。 */
export function LoadFailedPage({ onRetry }: { onRetry: () => void }) {
  const st = useApp();
  const L = extra().loadState;
  return (
    <main class="page" id="main">
      <Notice
        kind="bad"
        title={L.failTitle}
        actions={
          <>
            <button class="btn primary small" type="button" onClick={onRetry}>
              {L.retry}
            </button>
            <button class="btn secondary small" type="button" onClick={() => go(st.session && st.route !== 'prepare' ? 'prepare' : 'home')}>
              {L.back}
            </button>
          </>
        }
      >
        {L.failBody}
      </Notice>
    </main>
  );
}

/** 載入一個畫面元件；key 變了（例如選課的 stats／output）就重新載入。 */
export function RouteLoader({ load, id }: { load: () => Promise<ComponentType>; id: string }) {
  const [View, setView] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setView(null);
    setFailed(false);
    load().then(
      (c) => alive && setView(() => c),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);
  if (failed) return <LoadFailedPage onRetry={() => setAttempt((n) => n + 1)} />;
  if (!View) return <LoadingPage />;
  return <View />;
}

export function lazyView(load: () => Promise<ComponentType>): ComponentType {
  let loaded: ComponentType | null = null;
  const start = () => load().then((c) => (loaded = c));
  return function LazyView() {
    const [View, setView] = useState<ComponentType | null>(() => loaded); // 要包成函式：loaded 本身是元件函式，直接傳會被 useState 當初始化函式呼叫
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
      if (loaded) return;
      setFailed(false);
      start().then((c) => setView(() => c), () => setFailed(true));
    }, [attempt]);
    if (failed) return <LoadFailedPage onRetry={() => setAttempt((n) => n + 1)} />;
    if (!View) return <LoadingPage />;
    return <View />;
  };
}
