// Word 字型退讓清單與說明（使用者 2026-10-30 決定：Word 版指定系統字型，不內嵌；PDF 版最準確）。
// 內嵌子集化字型在 Microsoft 365 Windows 實測沒有生效，見 docs/decisions/2026-10-30-原型驗證結果.md。

export interface WordFont {
  /** 寫進 docx 的字型名稱。 */
  name: string;
  platform: 'windows' | 'mac';
}

/** 退讓順序：docx 只能指定一個名稱，所以預設用 Windows 字型，Mac 的 Word 找不到時會自動以 PingFang TC 取代；
 * 要在 Mac 上直接指定可用 `wordFontFor('mac')`。 */
export const WORD_FONT_FALLBACKS: readonly WordFont[] = [
  { name: 'Microsoft JhengHei', platform: 'windows' }, // 微軟正黑體
  { name: 'PingFang TC', platform: 'mac' }, // 蘋方-繁
];

export function wordFontFor(platform: 'windows' | 'mac' | 'auto' = 'auto'): string {
  if (platform === 'auto') {
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    platform = /Mac|iPhone|iPad/.test(ua) ? 'mac' : 'windows';
  }
  return (WORD_FONT_FALLBACKS.find((f) => f.platform === platform) ?? WORD_FONT_FALLBACKS[0]!).name;
}

/** 輸出設定與說明頁用的文字（集中於此，方便日後抽到介面文字檔）。 */
export const WORD_FONT_NOTE =
  'Word 版使用電腦內建的中文字型（Windows：微軟正黑體；Mac：蘋方-繁），因此換行位置可能和 PDF 有一兩個字的差異；需要版面完全一致時請使用 PDF。';
