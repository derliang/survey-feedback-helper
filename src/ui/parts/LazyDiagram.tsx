import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { FigId } from '../guide/diagrams';

/**
 * 教學頁以外要用圖解的地方（首頁匯出提示、登入視窗被擋、資料夾手動存取、選課說明）：圖與圖的樣式放在
 * 教學頁那個延遲載入的 chunk，這裡等需要時才動態載入（硬規則 9：不增加首頁 bundle）。載入前先佔位，不跳版面。
 */
type DiagramsModule = typeof import('../guide/diagrams');
let mod: DiagramsModule | null = null;
let pending: Promise<DiagramsModule> | null = null;

function useDiagrams(): DiagramsModule | null {
  const [m, setM] = useState<DiagramsModule | null>(mod);
  useEffect(() => {
    if (mod) return setM(mod);
    pending ??= import('../guide/diagrams').then((x) => (mod = x));
    let live = true;
    pending.then(
      (x) => live && setM(x),
      () => {
        pending = null; // 載入失敗就只留文字，下次再試
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return m;
}

/** 單張圖。 */
export function LazyFig(props: { id: FigId }) {
  const m = useDiagrams();
  if (!m) return <div class="dg-skel" aria-hidden="true" />;
  return <m.Diagram id={props.id} />;
}

/** 圖解步驟。 */
export function LazySteps(props: { steps: { fig?: FigId; text: ComponentChildren }[] }) {
  const m = useDiagrams();
  if (!m) {
    // 圖還沒載入（或載入失敗）：先顯示文字步驟
    return (
      <ol class="steps">
        {props.steps.map((s, i) => (
          <li key={i}>
            <span class="num" aria-hidden="true">
              {i + 1}
            </span>
            <div>{s.text}</div>
          </li>
        ))}
      </ol>
    );
  }
  return <m.DSteps steps={props.steps} />;
}
