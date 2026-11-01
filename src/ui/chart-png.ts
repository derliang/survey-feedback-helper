/** 把 SVG 字串畫成點陣圖位元組。只在瀏覽器執行；失敗時呼叫端略過圖表。 */
async function svgToImage(svg: string, w: number, h: number, scale: number, mime: 'image/png' | 'image/jpeg'): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((ok, bad) => {
      img.onload = () => ok();
      img.onerror = () => bad(new Error('svg load'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    if (mime === 'image/jpeg') {
      // JPG 沒有透明：先鋪白底
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, mime, 0.92));
    if (!blob) throw new Error('no blob');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 放進 Word／PDF 用。 */
export const svgToPng = (svg: string, w: number, h: number, scale = 2): Promise<Uint8Array> => svgToImage(svg, w, h, scale, 'image/png');

/** 圖表另存圖片（JPG）。 */
export const svgToJpg = (svg: string, w: number, h: number, scale = 2): Promise<Uint8Array> => svgToImage(svg, w, h, scale, 'image/jpeg');
