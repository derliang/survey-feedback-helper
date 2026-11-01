import { type Cell } from './text';
import { type Table } from './table';
import { type Student } from './roster';
import { mulberry32 } from './random';

/**
 * 「樣本對照」虛構測試資料集產生函式（只在記憶體產生，不寫檔、不進 repo；硬規則 5）。
 * 結構照樣本：量表 0～10、填寫者與被評對象雙欄、書名多種寫法、自評、姓名／座號對不上。
 * 所有姓名皆為自編，與真人無關。同一個 seed 產生同一份資料。
 */

const FAMILY = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const GIVEN = ['小明', '小華', '大文', '美玲', '志偉', '雅婷', '家豪', '怡君', '建宏', '淑芬', '俊傑', '佩珊'];

/** 虛構人名：姓用天干，不會是真實姓氏，避免和姓氏表偵測混在一起。 */
const FICTIONAL_NAMES: readonly string[] = FAMILY.flatMap((f) => GIVEN.map((g) => f + g));

export const SAMPLE_HEADERS = {
  timestamp: '時間戳記',
  raterClass: '填寫者班級',
  raterSeat: '填寫者座號',
  raterName: '填寫者姓名',
  targetClass: '被評班級',
  targetSeat: '被評座號',
  targetName: '被評姓名',
  book: '書名',
  items: ['內容完整', '表達清楚', '創意', '台風'],
  comment: '留言',
} as const;

/** 書名的多種寫法（同一本書）。 */
export const BOOK_VARIANTS: readonly string[][] = [
  ['小王子', '小王子 ', '《小王子》', '小 王子'],
  ['夢的解析', '夢的解析', '《夢的解析》'],
];

/** 留言內含名單外人名的虛構句子（去識別化偵測用）；「老師說得很有道理」是不該被標示的對照。 */
export const COMMENTS_WITH_OUTSIDE_NAMES: readonly string[] = [
  '我覺得張同學報告得很好',
  '跟隔壁班的李大同一起準備的吧',
  '老師說得很有道理',
  '小林很認真',
];

export type PlantedKind =
  | 'seatMismatch'
  | 'nameTypo'
  | 'bookVariant'
  | 'selfEvaluation'
  | 'scoreOutOfRange'
  | 'duplicate'
  | 'outsideNameComment'
  | 'blankScore';

export interface PlantedIssue {
  kind: PlantedKind;
  /** 對應 responseTable.rows 的索引。 */
  row: number;
  note: string;
}

export interface SampleDataset {
  /** 名單（班級、座號、姓名）。 */
  roster: Student[];
  rosterTable: Table;
  responseTable: Table;
  /** 自編資料中刻意放入的問題，測試可逐項對照。 */
  planted: PlantedIssue[];
}

/**
 * 產生樣本對照資料集。
 * @param students 名單人數（至少 6，預設 12）
 * @param seed 可重現種子
 */
export function buildSampleDataset(opts: { students?: number; seed?: string } = {}): SampleDataset {
  const n = Math.min(Math.max(6, Math.floor(opts.students ?? 12)), FICTIONAL_NAMES.length);
  const rand = mulberry32(opts.seed ?? 'sample');
  const cls = '301';
  const roster: Student[] = FICTIONAL_NAMES.slice(0, n).map((name, i) => ({ class: cls, seat: i + 1, name }));
  const rosterTable: Table = {
    headers: ['班級', '座號', '姓名'],
    rows: roster.map((s) => [s.class, s.seat, s.name]),
  };

  const H = SAMPLE_HEADERS;
  const headers = [H.timestamp, H.raterClass, H.raterSeat, H.raterName, H.targetClass, H.targetSeat, H.targetName, H.book, ...H.items, H.comment];
  const rows: Cell[][] = [];
  const planted: PlantedIssue[] = [];
  const score = () => Math.floor(rand() * 11); // 0～10
  const ts = (k: number) => `2026/10/${String(1 + (k % 28)).padStart(2, '0')} 10:${String(k % 60).padStart(2, '0')}:00`;
  const pushRow = (r: Student, t: Student, book: string, scores: Cell[], comment: string, tweak?: { raterSeat?: Cell; raterName?: Cell }): number => {
    rows.push([ts(rows.length), r.class, tweak?.raterSeat ?? r.seat, tweak?.raterName ?? r.name, t.class, t.seat, t.name, book, ...scores, comment]);
    return rows.length - 1;
  };
  const fourScores = (): Cell[] => H.items.map(() => score());

  // 正常互評：每人評下一位（循環），書名固定寫法
  for (let i = 0; i < n; i++) pushRow(roster[i] as Student, roster[(i + 1) % n] as Student, BOOK_VARIANTS[0]![0] as string, fourScores(), '');

  // 自評：第 0 人評自己
  planted.push({ kind: 'selfEvaluation', row: pushRow(roster[0] as Student, roster[0] as Student, BOOK_VARIANTS[0]![0] as string, fourScores(), ''), note: '填寫者與被評對象同一人' });

  // 座號對不上：姓名正確、座號錯（座號是 99 與名單不符）
  planted.push({
    kind: 'seatMismatch',
    row: pushRow(roster[1] as Student, roster[2] as Student, BOOK_VARIANTS[1]![0] as string, fourScores(), '', { raterSeat: 99 }),
    note: '填寫者座號 99，名單上為 2',
  });

  // 姓名錯字：座號與班級指向名單上的人，姓名最後一字寫錯
  const typoSrc = roster[3] as Student;
  planted.push({
    kind: 'nameTypo',
    row: pushRow(roster[3] as Student, roster[4] as Student, BOOK_VARIANTS[1]![0] as string, fourScores(), '', { raterName: typoSrc.name.slice(0, -1) + '銘' }),
    note: `填寫者座號 4，姓名寫成「${typoSrc.name.slice(0, -1)}銘」`,
  });

  // 書名多種寫法：同一本書各種寫法各一列
  for (const variants of BOOK_VARIANTS) {
    variants.forEach((v, k) => {
      const r = roster[(k + 1) % n] as Student;
      const t = roster[(k + 2) % n] as Student;
      planted.push({ kind: 'bookVariant', row: pushRow(r, t, v, fourScores(), ''), note: `書名寫法「${v}」` });
    });
  }

  // 分數超出 0～10、空白分數
  planted.push({ kind: 'scoreOutOfRange', row: pushRow(roster[4] as Student, roster[5] as Student, BOOK_VARIANTS[0]![0] as string, [11, 5, 5, 5], ''), note: '分數 11 超出 0～10' });
  planted.push({ kind: 'blankScore', row: pushRow(roster[5] as Student, roster[0] as Student, BOOK_VARIANTS[0]![0] as string, [7, null, 7, 7], ''), note: '第二題空白' });

  // 重複填寫：複製一列（同填寫者、同被評對象、同書）
  const dupSource = rows[0] as Cell[];
  rows.push([...dupSource.slice(0, 1).map(() => ts(rows.length)), ...dupSource.slice(1)]);
  planted.push({ kind: 'duplicate', row: rows.length - 1, note: '與第 1 列同一填寫者評同一被評對象' });

  // 留言含名單外人名
  COMMENTS_WITH_OUTSIDE_NAMES.forEach((c, k) => {
    planted.push({
      kind: 'outsideNameComment',
      row: pushRow(roster[(k + 6) % n] as Student, roster[(k + 7) % n] as Student, BOOK_VARIANTS[0]![0] as string, fourScores(), c),
      note: `留言：${c}`,
    });
  });

  return { roster, rosterTable, responseTable: { headers, rows }, planted };
}
