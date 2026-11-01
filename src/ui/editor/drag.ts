// 把手拖曳排序：滑鼠按下即拖；觸控要長按 350ms 才開始（避免和捲動打架）。每列另有上下移按鈕，不依賴手勢。
import { useRef, useState } from 'preact/hooks';

export interface DragInfo {
  id: string;
  target: string | null;
  before: boolean;
}

export function useDragSort(onDrop: (id: string, target: string, before: boolean) => void) {
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const ref = useRef<DragInfo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = (d: DragInfo | null) => {
    ref.current = d;
    setDrag(d);
  };
  const locate = (x: number, y: number, id: string) => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-bid]');
    if (!el || el.dataset.bid === id) return { target: null, before: true };
    const r = el.getBoundingClientRect();
    return { target: el.dataset.bid ?? null, before: y < r.top + r.height / 2 };
  };

  const handleProps = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      const pid = e.pointerId;
      const sx = e.clientX,
        sy = e.clientY;
      const start = () => {
        el.setPointerCapture(pid);
        update({ id, target: null, before: true });
      };
      if (e.pointerType === 'mouse') start();
      else {
        timer.current = setTimeout(() => {
          start();
          navigator.vibrate?.(15);
        }, 350);
        const cancel = (m: PointerEvent) => {
          if (!ref.current && Math.hypot(m.clientX - sx, m.clientY - sy) > 8) {
            clearTimeout(timer.current);
            el.removeEventListener('pointermove', cancel);
          }
        };
        el.addEventListener('pointermove', cancel);
        el.addEventListener('pointerup', () => clearTimeout(timer.current), { once: true });
        el.addEventListener('pointercancel', () => clearTimeout(timer.current), { once: true });
      }
    },
    onPointerMove: (e: PointerEvent) => {
      if (!ref.current) return;
      update({ id, ...locate(e.clientX, e.clientY, id) });
    },
    onPointerUp: () => {
      const d = ref.current;
      update(null);
      if (d?.target) onDrop(d.id, d.target, d.before);
    },
    onPointerCancel: () => update(null),
    onContextMenu: (e: Event) => e.preventDefault(),
  });
  return { drag, handleProps };
}
