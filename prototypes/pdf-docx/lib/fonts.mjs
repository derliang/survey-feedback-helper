import { readFileSync } from 'node:fs';

// 原型使用本機已安裝的 Noto Sans TC（SIL OFL 1.1，可自由內嵌與散布）。
// 正式版會把字型檔放進專案並登錄 docs/third-party.md。
const DIR = process.env.PROTO_FONT_DIR ?? 'C:/Windows/Fonts';
export const DIMENSIONS_FONT = `${DIR}/NotoSansTC-Regular.ttf`;
export const BOLD_FONT = `${DIR}/NotoSansTC-Bold.ttf`;
export const loadFonts = () => ({
  regular: readFileSync(DIMENSIONS_FONT),
  bold: readFileSync(BOLD_FONT),
});
