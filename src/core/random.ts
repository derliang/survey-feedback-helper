/** 可重現的亂數：同一個種子永遠得到同一個結果（抽籤記錄種子用）。 */

/** FNV-1a 32 位元雜湊，把字串種子轉成整數。 */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32：回傳 [0,1) 的亂數產生器。 */
export function mulberry32(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates 洗牌（不改動輸入）。 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** 產生新種子（8 位十六進位）。亂數來源可注入，方便測試。 */
export function makeSeed(rand: () => number = Math.random): string {
  return Math.floor(rand() * 0xffffffff).toString(16).padStart(8, '0');
}
