// 圖表的文字（跟著介面語言）與輸出用的繪製入口，輸出頁與編輯器預覽共用。
import type { ChartData } from '../app/output';
import type { ChartText } from './chart-types';
import { PRINT, type Palette } from './chart-svg';
import { strings as S } from './strings';

export function chartText(): ChartText {
  return { title: S.stats.itemsTitle, mine: S.stats.mine, classAvg: S.stats.classAvg, ...S.stats.chart };
}

/** 範本圖表區塊的顏色設定（空 = 預設）換成圖用的調色盤：第一色＝這位同學，第二色＝班級。 */
export function chartPalette(colors: readonly string[] | undefined, base: Palette = PRINT): Palette {
  return colors && colors.length >= 2 ? { ...base, a: colors[0]!, b: colors[1]! } : base;
}

export type { ChartData };
