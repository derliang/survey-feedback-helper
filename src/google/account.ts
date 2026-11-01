/** 學校帳號／非 Gmail 偵測（純邏輯）。依 2026-11-01 裁示：一律擋下，不設「仍要繼續」。 */

const ALLOWED_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export type AccountVerdict =
  | { allowed: true; email: string }
  /** domain 只用來顯示（○○○@domain），不顯示完整信箱；取不到信箱時為 null。 */
  | { allowed: false; domain: string | null; reason: 'not-gmail' | 'no-email' };

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  return email
    .slice(at + 1)
    .trim()
    .toLowerCase();
}

export function checkAccount(email: string | null | undefined): AccountVerdict {
  const trimmed = email?.trim() ?? '';
  const domain = trimmed ? emailDomain(trimmed) : null;
  if (!domain) return { allowed: false, domain: null, reason: 'no-email' };
  if (ALLOWED_DOMAINS.has(domain)) return { allowed: true, email: trimmed };
  return { allowed: false, domain, reason: 'not-gmail' };
}

/** 擋下畫面上顯示的帳號字樣：只露網域。 */
export function maskedAccount(domain: string | null): string {
  return domain ? `○○○@${domain}` : '這個帳號';
}
