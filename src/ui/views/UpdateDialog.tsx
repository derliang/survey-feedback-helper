import { useEffect, useRef } from 'preact/hooks';
import { applyUpdateNow } from '../../app/update';
import { go, set, useApp } from '../../app/store';
import { extra } from '../strings-extra';
import { Sheet, TopBanner } from '../parts/parts';

/** 「有新版本」：已載入資料時主動作是「先輸出，再更新」，「現在更新」排最後並註明資料會清掉（D53／12c）。 */
export function UpdateDialog() {
  const st = useApp();
  const X = extra().update;
  const first = useRef<HTMLButtonElement>(null);
  const open = st.updateReady && !st.updateDismissed;
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);
  if (!st.updateReady) return null;
  if (!open) {
    return (
      <TopBanner
        id="update"
        action={
          <button class="btn secondary small" type="button" onClick={() => set({ updateDismissed: false })}>
            {X.bannerAction}
          </button>
        }
      >
        {X.banner}
      </TopBanner>
    );
  }
  const exportFirst = () => {
    set({ updateDismissed: true });
    if (st.session) go('output');
  };
  return (
    <Sheet
      confirm
      title={X.title}
      onClose={() => set({ updateDismissed: true })}
      footer={
        <>
          <button class="btn secondary" type="button" onClick={() => set({ updateDismissed: true })}>
            {X.later}
          </button>
          <button class="btn primary" type="button" ref={first} data-testid="update-export" onClick={exportFirst}>
            {X.exportFirst}
          </button>
          <button class="btn danger" type="button" data-testid="update-now" onClick={applyUpdateNow}>
            {X.now}
          </button>
        </>
      }
    >
      <p>{X.body}</p>
    </Sheet>
  );
}
