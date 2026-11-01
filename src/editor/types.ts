// 編輯器的範本模型：可編輯、可序列化、含條件與欄位；輸出前由 compile 轉成輸出器讀的 DocModel。
// 長度單位 pt，顏色 #rrggbb。純函式模組，不碰瀏覽器 API（lint 會擋）。

export type ReportVersion = 'teacher' | 'student' | 'parent';

/** 條件顯示：葉節點看變數或版本；not／all／any 組合。 */
export type Condition =
  | { kind: 'version'; is: ReportVersion[] }
  | { kind: 'var'; name: string; op: 'nonEmpty' | 'empty' | 'eq' | 'neq' | 'gt' | 'lt'; value?: string | number }
  | { kind: 'not'; cond: Condition }
  | { kind: 'all' | 'any'; conds: Condition[] };

interface Base {
  id: string;
  /** 編輯器清單上顯示的名稱（沒有就用類型名）。 */
  label?: string;
  /** 沒有條件就一律顯示。 */
  when?: Condition;
  before?: number;
  after?: number;
}
export interface HeadingEB extends Base {
  kind: 'heading';
  text: string;
  size: number;
  color?: string;
}
export interface TextEB extends Base {
  kind: 'text';
  text: string;
  size: number;
  color?: string;
  /** 底色（編輯器與 PDF 用；Word 見 wordNotes）。 */
  bg?: string;
}
export interface BulletsEB extends Base {
  kind: 'bullets';
  /** 資料來源槽（例如 praise），由應用層提供項目；沒有槽就用 items。 */
  slot?: string;
  items: string[];
  size: number;
}
/** 由統計資料填入的區塊：表格、圖表、留言區、老師評語。slot 決定資料，props 傳給應用層的槽解析函式。 */
export interface DataEB extends Base {
  kind: 'data';
  slot: string;
  dataKind: 'table' | 'chart' | 'comments' | 'teacherComment';
  chartType?: string;
  /** 圖表顏色；空 = 用設計系統預設。 */
  colors?: string[];
  /** 比較線（例如班級平均）。 */
  compareLine?: boolean;
}
export interface ImageEB extends Base {
  kind: 'image';
  /** 圖片參照（資料夾內檔名或 asset id）；位元組由應用層提供。 */
  src: string;
  w: number;
  h: number;
  /** Logo 另標，方便頁面設定一次換。 */
  isLogo?: boolean;
}
export interface DividerEB extends Base {
  kind: 'divider';
}
export interface PageBreakEB extends Base {
  kind: 'pageBreak';
}
export interface ColumnsEB extends Base {
  kind: 'columns';
  cols: EBlock[][];
}
export type EBlock = HeadingEB | TextEB | BulletsEB | DataEB | ImageEB | DividerEB | PageBreakEB | ColumnsEB;
export type EBlockKind = EBlock['kind'];

export interface PageSpec {
  size: 'A4' | 'A5' | 'Letter';
  orientation: 'portrait' | 'landscape';
  /** 邊界（pt）：左右、上、下。 */
  mx: number;
  mt: number;
  mb: number;
  /** 頁面背景色；undefined = 白。 */
  background?: string;
  /** 頁框；undefined = 無。 */
  frame?: { color: string; width: number; rounded: boolean };
  headerText?: string;
  footerText: string;
  logoSrc?: string;
}

export interface EditorTemplate {
  id: string;
  name: string;
  /** 內建範本不可改；第一次修改時複製成「我的範本」。 */
  builtin: boolean;
  /** 套用的問卷類型（範本庫分類用）。 */
  forKind: 'feedback' | 'opinion' | 'vote';
  page: PageSpec;
  lineH: number;
  blocks: EBlock[];
}

export const PAGE_SIZES: Record<PageSpec['size'], { w: number; h: number }> = {
  A4: { w: 595.28, h: 841.89 },
  A5: { w: 419.53, h: 595.28 },
  Letter: { w: 612, h: 792 },
};

/** 區塊的顯示名稱。 */
export const KIND_NAMES: Record<EBlockKind, string> = {
  heading: '標題',
  text: '文字',
  bullets: '條列',
  data: '統計資料',
  image: '圖片',
  divider: '分隔線',
  pageBreak: '分頁',
  columns: '多欄',
};
