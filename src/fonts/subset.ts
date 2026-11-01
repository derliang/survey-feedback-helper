// 瀏覽器可用的 HarfBuzz 字型子集化（取代 subset-font：它讀 wasm 用 Node 的 fs、轉檔需 Buffer）。
// wasm 由呼叫端提供（瀏覽器 fetch、測試讀檔），本模組不碰 fs、Buffer。
// 只做 TrueType（glyf）輸入；可變字型用 pinWeight 固定字重，輸出靜態 TTF。

interface HbExports {
  memory: WebAssembly.Memory;
  _initialize(): void;
  malloc(n: number): number;
  free(p: number): void;
  hb_blob_create(data: number, len: number, mode: number, user: number, destroy: number): number;
  hb_blob_destroy(b: number): void;
  hb_blob_get_data(b: number, lenPtr: number): number;
  hb_blob_get_length(b: number): number;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(f: number): void;
  hb_face_reference_blob(f: number): number;
  hb_subset_input_create_or_fail(): number;
  hb_subset_input_destroy(i: number): void;
  hb_subset_input_unicode_set(i: number): number;
  hb_subset_input_set(i: number, kind: number): number;
  hb_subset_input_get_flags(i: number): number;
  hb_subset_input_set_flags(i: number, f: number): void;
  hb_subset_input_pin_axis_location(i: number, face: number, tag: number, value: number): number;
  hb_subset_or_fail(face: number, input: number): number;
  hb_set_add(s: number, v: number): void;
  hb_set_clear(s: number): void;
  hb_set_invert(s: number): void;
}

const HB_MEMORY_MODE_WRITABLE = 2;
const HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;
const HB_SUBSET_FLAGS_NO_HINTING = 0x1;

const tag = (s: string) => [...s].reduce((a, ch) => (a << 8) + ch.charCodeAt(0), 0);

let hb: Promise<HbExports> | undefined;

/** 載入並初始化 HarfBuzz wasm（只做一次）。`wasm` 是 wasm 位元組或 fetch 的 Response。 */
export function initSubset(wasm: BufferSource | Promise<Response> | Response): Promise<HbExports> {
  hb ??= (async () => {
    const src = await wasm;
    const { instance } =
      src instanceof Response
        ? await WebAssembly.instantiateStreaming(src).catch(async () => WebAssembly.instantiate(await src.arrayBuffer()))
        : await WebAssembly.instantiate(src);
    const ex = instance.exports as unknown as HbExports;
    ex._initialize();
    return ex;
  })();
  return hb;
}

export interface SubsetOptions {
  /** 可變字型要固定的字重（例如 400、700）。 */
  pinWeight?: number;
}

/** 依文字子集化 TTF，只留用到的字元，保留全部排版功能；回傳靜態 TTF。 */
export async function subsetTtf(font: Uint8Array, text: string, opts: SubsetOptions = {}): Promise<Uint8Array> {
  if (!hb) throw new Error('請先呼叫 initSubset 載入 HarfBuzz wasm');
  const ex = await hb;
  const heap = () => new Uint8Array(ex.memory.buffer); // wasm 記憶體會成長，每次重取

  const input = ex.hb_subset_input_create_or_fail();
  if (!input) throw new Error('hb_subset_input_create_or_fail 失敗');
  const buf = ex.malloc(font.byteLength);
  heap().set(font, buf);
  const blob = ex.hb_blob_create(buf, font.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);
  const face = ex.hb_face_create(blob, 0);
  ex.hb_blob_destroy(blob);
  let subset = 0;
  try {
    const features = ex.hb_subset_input_set(input, HB_SUBSET_SETS_LAYOUT_FEATURE_TAG);
    ex.hb_set_clear(features);
    ex.hb_set_invert(features); // 保留全部排版功能
    ex.hb_subset_input_set_flags(input, ex.hb_subset_input_get_flags(input) | HB_SUBSET_FLAGS_NO_HINTING);
    const unicodes = ex.hb_subset_input_unicode_set(input);
    for (const c of text) ex.hb_set_add(unicodes, c.codePointAt(0)!);
    if (opts.pinWeight !== undefined && !ex.hb_subset_input_pin_axis_location(input, face, tag('wght'), opts.pinWeight)) {
      throw new Error(`固定字重 ${opts.pinWeight} 失敗（字型沒有 wght 軸？）`);
    }
    subset = ex.hb_subset_or_fail(face, input);
    if (!subset) throw new Error('hb_subset_or_fail 失敗（字型檔可能損壞）');
    const result = ex.hb_face_reference_blob(subset);
    const len = ex.hb_blob_get_length(result);
    if (len === 0) throw new Error('子集化結果為空');
    const off = ex.hb_blob_get_data(result, 0);
    const out = heap().slice(off, off + len);
    ex.hb_blob_destroy(result);
    return out;
  } finally {
    ex.hb_subset_input_destroy(input);
    if (subset) ex.hb_face_destroy(subset);
    ex.hb_face_destroy(face);
    ex.free(buf);
  }
}
