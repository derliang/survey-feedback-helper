import { strings } from '../strings';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

type IconName = 'restart' | 'gear' | 'check' | 'pencil' | 'back' | 'upload' | 'folder' | 'info' | 'warn' | 'alert' | 'lock' | 'list' | 'chevron' | 'layout';

const PATHS: Record<IconName, string> = {
  restart: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.3.3-2-3-1-1 1.8h-2L9 2.2 6 3.2l.3 2L4.8 6.5 2.8 6l-1 3 2 1v2l-2 1 1 3 2-.5 1.5 1.3-.3 2 3 1 1-1.8h2l1 1.8 3-1-.3-2 1.5-1.3 2 .5 1-3z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  back: 'M15 5l-7 7 7 7',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  folder: 'M3 6h6l2 2h10v11H3z',
  info: 'M12 8v.01M12 11v6M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  warn: 'M12 9v5M12 17v.01M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z',
  alert: 'M12 8v5M12 16v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  chevron: 'M6 9l6 6 6-6',
  layout: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7',
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

type NoticeKind = 'info' | 'warn' | 'bad' | 'ok';
const NOTICE_ICON: Record<NoticeKind, IconName> = { info: 'info', warn: 'warn', bad: 'alert', ok: 'check' };

/** 提示：圖示加文字，不只靠顏色。 */
export function Notice(props: { kind?: NoticeKind; title?: string; children?: ComponentChildren; actions?: ComponentChildren; role?: string }) {
  const kind = props.kind ?? 'info';
  return (
    <div class={`notice notice-${kind}`} role={(props.role ?? (kind === 'bad' ? 'alert' : 'status')) as 'alert'}>
      <Icon name={NOTICE_ICON[kind]} />
      <div class="notice-body">
        {props.title && <strong>{props.title}</strong>}
        {props.children && <p>{props.children}</p>}
        {props.actions && <div class="notice-actions">{props.actions}</div>}
      </div>
    </div>
  );
}


/** 「這次先關掉」的頁頂橫幅：只記在這次開啟網站期間（不寫入任何儲存），重新整理後若問題還在會再出現。 */
const bannerClosed = new Set<string>();

/**
 * 頁頂細橫幅（DESIGN 5.33 D①，使用者 2026-11-14 裁示 G1）：儲存警示用，一行字加一個動作，可關閉本次。
 * 手機窄到放不下時文字折行，高度至少 44。`id` 用來記住「這次已關閉」。
 */
export function TopBanner(props: { id: string; children: ComponentChildren; action?: ComponentChildren }) {
  const [, bump] = useState(0);
  if (bannerClosed.has(props.id)) return null;
  return (
    <div class="top-banner" role="status" data-testid={`banner-${props.id}`}>
      <div class="top-banner-in">
        <Icon name="warn" />
        <span class="top-banner-text">{props.children}</span>
        {props.action}
        <button
          class="btn ghost small"
          type="button"
          aria-label={strings.close}
          onClick={() => {
            bannerClosed.add(props.id);
            bump((n) => n + 1);
          }}
        >
          {strings.close}
        </button>
      </div>
    </div>
  );
}

/** 彈出面板：手機由下往上、平板靠右、桌機置中；點遮罩關閉。 */
export function Sheet(props: { title: string; onClose: () => void; children: ComponentChildren; footer?: ComponentChildren; label?: string; wide?: boolean; confirm?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    // 鍵盤：Esc 關閉；Tab 只在面板內循環（不跑到後面的頁面）
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return props.onClose();
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')];
      if (items.length === 0) return e.preventDefault();
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <div class="scrim" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class={props.wide ? 'sheet sheet-wide' : props.confirm ? 'sheet sheet-confirm' : 'sheet'} role="dialog" aria-modal="true" aria-label={props.label ?? props.title} tabIndex={-1} ref={ref}>
        <div class="sheet-handle" aria-hidden="true" />
        <div class="sheet-head">
          <h2 class="sheet-title">{props.title}</h2>
          <button class="icbtn sheet-x" type="button" aria-label={strings.close} onClick={props.onClose}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div class="sheet-body">{props.children}</div>
        {props.footer && <div class="sheet-foot">{props.footer}</div>}
      </div>
    </div>
  );
}

/** 視窗寬度 ≥ 600 時為 true（平板與桌機）。 */
export function useWide(): boolean {
  const q = '(min-width: 600px)';
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

/** fixed：桌機也固定在視窗底（5.33 D3）；預設桌機是頁內靠右的一排。 */
export function ActBar(props: { children: ComponentChildren; fixed?: boolean }) {
  return <div class={props.fixed ? 'actbar actbar-fixed' : 'actbar'}>{props.children}</div>;
}

/** Google 選帳號畫面的示意圖（自畫、虛構帳號；「選這個」用文字加底色，不只靠顏色）。登入前提示卡與教學共用。 */
export function AccountChooser() {
  const G = strings.google;
  const row = (a: readonly string[], pick: boolean) => (
    <div class={`g-row${pick ? ' g-pick' : ''}`}>
      <strong>{a[0]}</strong>
      <span class="g-mail">{a[1]}</span>
      <span class="g-note">{a[2]}</span>
      {pick && <em>{G.pickThis}</em>}
    </div>
  );
  return (
    <figure class="g-chooser" role="group" aria-label={G.chooserLabel}>
      {row(G.accountA, false)}
      {row(G.accountB, true)}
      <div class="g-row g-other">
        <strong>{G.other}</strong>
        <span class="g-note">{G.otherNote}</span>
        <span class="g-tag">{G.toVerify}</span>
      </div>
      <figcaption>{G.chooserNote}</figcaption>
    </figure>
  );
}

/** 粗估標籤寬度（以 16px 為單位）：中日韓字 1、其餘約 0.55。 */
const labelUnits = (t: string): number => [...t].reduce((n, ch) => n + (/[⺀-鿿＀-￯]/.test(ch) ? 1 : 0.55), 0);

/**
 * 單選選項（DESIGN 5.34 D）：2–4 項且每項標籤在窄欄（約 300px）下都能單行才用分段控制 `.seg`；
 * 否則改成單選選項卡 `.rcard` 直排。英文與長標籤因此不會折成四行。
 */
export function OptionGroup<T extends string | number>(props: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  const n = props.options.length;
  const fits = n >= 2 && n <= 4 && props.options.every((o) => labelUnits(o.label) * 15 + 24 <= 300 / n);
  if (fits) {
    return (
      <div class="seg" role="radiogroup" aria-label={props.label}>
        {props.options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={props.value === o.value} class={props.value === o.value ? 'on' : ''} onClick={() => props.onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div class="rcards" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => {
        const on = props.value === o.value;
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} class={`rcard${on ? ' on' : ''}`} onClick={() => props.onChange(o.value)}>
            <span class="radio" aria-hidden="true" />
            <span class="rc-main">
              <strong>{o.label}</strong>
            </span>
          </button>
        );
      })}
    </div>
  );
}
