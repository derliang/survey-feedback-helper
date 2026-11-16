import { useEffect, useRef, useState } from 'preact/hooks';
import { vt } from '../strings-vote';

/**
 * 投影唱票（使用者 2026-11-01 定案：B 全部候選人同列，每唱一票對應 +1）。
 * 純前端、不存任何資料；數字從 0 開始，是老師現場唱的，唱完才與統計結果核對。
 * 鍵盤：1～9 對應候選人、B 空白票、Ctrl+Z 退回一票、Esc 離開。
 */
export function TallyProjector({ title, names, expected, total, onClose }: { title: string; names: string[]; expected: number[]; total: number; onClose: () => void }) {
  const T = vt().tally;
  // history：每唱一票記一筆，候選人 index；空白票記 -1
  const [history, setHistory] = useState<number[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const counts = names.map((_, i) => history.filter((h) => h === i).length);
  const blanks = history.filter((h) => h === -1).length;
  const read = history.length;
  const done = total > 0 && read >= total;

  const add = (i: number) => setHistory((h) => [...h, i]);
  const undo = () => setHistory((h) => h.slice(0, -1));

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    root.current?.focus();
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      prev?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        return undo();
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.toLowerCase() === 'b') return add(-1);
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= names.length) add(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [names.length, onClose]);

  const match = done && counts.every((c, i) => c === expected[i]);
  return (
    <div class="tally-full" role="dialog" aria-modal="true" aria-label={T.title(title)} tabIndex={-1} ref={root} data-testid="tally-projector">
      <header class="tally-top">
        <h2>{T.title(title)}</h2>
        <output class="tally-progress" data-testid="tally-progress" aria-live="polite">
          {T.progress(read, total)}
        </output>
        <button type="button" class="btn secondary" onClick={onClose}>
          {T.exit}
        </button>
      </header>
      {names.length === 0 ? (
        <p class="tally-empty">{T.none}</p>
      ) : (
        <div class="tally-cols" style={{ '--cols': names.length }}>
          {names.map((n, i) => (
            <div key={n} class="tally-col">
              <div class="tally-name">
                <span class="tally-key" aria-hidden="true">
                  {i + 1}
                </span>
                {n}
              </div>
              <div class="tally-count" data-testid={`tally-count-${i}`}>
                {counts[i]}
              </div>
              <button type="button" class="tally-plus" aria-label={T.plus(n)} onClick={() => add(i)}>
                {T.plusLabel}
              </button>
            </div>
          ))}
        </div>
      )}
      <footer class="tally-bottom">
        <button type="button" class="btn secondary" onClick={undo} disabled={read === 0}>
          {T.undo}
        </button>
        <button type="button" class="btn secondary" onClick={() => add(-1)}>
          {T.blank}
          {blanks > 0 && `（${blanks}）`}
        </button>
        {done && (
          <p class="tally-done" data-testid="tally-done" role="status">
            {T.done}
            {match ? T.match : T.mismatch}
          </p>
        )}
        <p class="tally-keys">{T.keys}</p>
      </footer>
    </div>
  );
}
