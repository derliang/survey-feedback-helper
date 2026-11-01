// 字型載入：抓 WOFF2（Service Worker 會快取）→ 解壓一次 → 記憶體內重複使用。
// HarfBuzz wasm 同樣只抓一次。全部延遲載入：只有按下輸出時才會執行。
import { initSubset, subsetTtf } from './subset';
import { woff2ToTtf } from './woff2';

export const FONT_FAMILY = 'Noto Sans TC';
export const FONT_FILE = 'fonts/NotoSansTC-VF.woff2';

export interface FontSource {
  /** 取得 WOFF2 位元組（瀏覽器：fetch；測試：讀檔）。 */
  fetchFont(): Promise<Uint8Array>;
  /** 取得 HarfBuzz 子集化 wasm（位元組或 fetch 的 Response）。 */
  fetchWasm(): Promise<BufferSource | Response>;
  /** 選用：解壓後 TTF 的快取（以 WOFF2 位元組數當版本）。手機 6 倍降速下解壓要數秒，快取後只剩讀取。 */
  ttfCache?: {
    get(version: number): Promise<Uint8Array | undefined>;
    put(version: number, ttf: Uint8Array): Promise<void>;
  };
}

const TTF_CACHE = 'sfh-ttf-v1';
/** 瀏覽器的解壓後 TTF 快取（Cache Storage，約 11 MB）；不支援或失敗時視為沒有快取。 */
export const browserTtfCache: NonNullable<FontSource['ttfCache']> = {
  async get(version) {
    try {
      const hit = await (await caches.open(TTF_CACHE)).match(`ttf/${version}`);
      return hit ? new Uint8Array(await hit.arrayBuffer()) : undefined;
    } catch {
      return undefined;
    }
  },
  async put(version, ttf) {
    try {
      await caches.delete(TTF_CACHE); // 只留最新版
      await (await caches.open(TTF_CACHE)).put(`ttf/${version}`, new Response(ttf as BlobPart));
    } catch {
      /* 配額不足等：下次再解壓即可 */
    }
  },
};

/** 瀏覽器預設來源。字型放在 public/fonts，wasm 由 Vite 打成獨立檔案（?url）。 */
export function browserFontSource(): FontSource {
  return {
    ttfCache: typeof caches === 'undefined' ? undefined : browserTtfCache,
    async fetchFont() {
      const res = await fetch(`${import.meta.env.BASE_URL}${FONT_FILE}`);
      if (!res.ok) throw new Error(`字型下載失敗（${res.status}）`);
      return new Uint8Array(await res.arrayBuffer());
    },
    async fetchWasm() {
      const { default: url } = await import('harfbuzzjs/dist/harfbuzz-subset.wasm?url');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`wasm 下載失敗（${res.status}）`);
      return res;
    },
  };
}

export interface Fonts {
  /** 完整可變字型（TTF），輸出時依用到的字元與字重子集化。 */
  ttf: Uint8Array;
}

let cache: { source: FontSource; fonts: Promise<Fonts> } | undefined;

/** 載入字型與子集化引擎；同一來源只做一次（含解壓）。失敗時清除快取，下次可重試。 */
export function loadFonts(source: FontSource = browserFontSource()): Promise<Fonts> {
  if (cache?.source === source) return cache.fonts;
  const fonts = (async () => {
    const [woff2] = await Promise.all([source.fetchFont(), source.fetchWasm().then(initSubset)]);
    const cached = await source.ttfCache?.get(woff2.length);
    if (cached) return { ttf: cached };
    const ttf = await woff2ToTtf(woff2);
    void source.ttfCache?.put(woff2.length, ttf);
    return { ttf };
  })();
  cache = { source, fonts };
  fonts.catch(() => {
    if (cache?.fonts === fonts) cache = undefined;
  });
  return fonts;
}

export type Weight = 'regular' | 'bold';
export const WEIGHT_VALUE: Record<Weight, number> = { regular: 400, bold: 700 };

/** 依字重與用到的字元子集化，回傳靜態 TTF（PDF 內嵌用）。 */
export function subsetFor(fonts: Fonts, weight: Weight, text: string): Promise<Uint8Array> {
  return subsetTtf(fonts.ttf, text, { pinWeight: WEIGHT_VALUE[weight] });
}

/** 測試用：清掉快取。 */
export function resetFontCache(): void {
  cache = undefined;
}
