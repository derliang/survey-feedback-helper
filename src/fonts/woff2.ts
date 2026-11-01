// WOFF2 解壓：woff2-encoder 的解壓端（wasm，體積小）。解壓一次、記憶體內重複使用。
// 呼叫端用 loadFonts() 取得，不要自己重複解壓（解壓 5 MB 在手機上可能要數秒）。
// 不用 wawoff2：它的 Emscripten 模組只在 Node 環境匯出，瀏覽器打包後永遠不會初始化。

/** 解壓 WOFF2 成 TTF 位元組。 */
export async function woff2ToTtf(woff2: Uint8Array): Promise<Uint8Array> {
  const { default: decompress } = await import('woff2-encoder/decompress');
  return new Uint8Array(await decompress(woff2));
}
