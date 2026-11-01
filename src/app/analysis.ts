// 統計接線：把準備好的 Session（資料表＋欄位對應）轉成 src/core 的輸入，並呼叫三種統計。
// 全是純函式，不碰瀏覽器 API；被排除的列（資料檢查）一律不計入。
import {
  type Ballot,
  type Cell,
  type ChoiceSummary,
  type Election,
  type FeedbackItem,
  type FeedbackRecord,
  type FeedbackSummary,
  type Inclusion,
  type LikertSummary,
  type PositionTally,
  type VoteIssue,
  type VoteRules,
  DEFAULT_VOTE_RULES,
  cellText,
  decideInclusion,
  detectVoteIssues,
  elect,
  isBlankCell,
  splitMulti,
  summarizeChoice,
  summarizeFeedback,
  summarizeLikert,
  summarizeOpen,
  tallyPosition,
} from '../core';
import { type ColumnInfo, personRefs } from './columns';
import { rosterStudents } from './progress';
import type { Session } from './store';

/** 統計畫面上老師可調的選項（都不含作答內容，換問卷時重設）。 */
export interface StatsOpts {
  /** 去極端值：每題各去掉最高、最低幾個（0 ＝ 不去）。 */
  trim: number;
  /** 反向題（欄位 index）。 */
  reversed: number[];
  /** 選擇題強制當複選（欄位 index → true／false）；沒設定時自動判斷。 */
  multi: Record<number, boolean>;
  voteRules: VoteRules;
  /** 各職位名額（欄位 index → 名額，預設 1）。 */
  seats: Record<number, number>;
  /** 抽籤種子：同一種子永遠同一結果，要記錄。 */
  seed: string;
}

export function defaultStatsOpts(): StatsOpts {
  return { trim: 0, reversed: [], multi: {}, voteRules: { ...DEFAULT_VOTE_RULES }, seats: {}, seed: newSeed() };
}

export function newSeed(): string {
  return `抽籤-${Date.now().toString(36)}`;
}

function activeRows(s: Session): number[] {
  const out = new Set(s.excluded);
  return s.table.rows.map((_, i) => i).filter((i) => !out.has(i));
}

const colsOf = (s: Session, role: ColumnInfo['role']): ColumnInfo[] => s.cols.filter((c) => c.role === role);
const cellAt = (s: Session, row: number, col: number): Cell => s.table.rows[row]?.[col] ?? null;

/* ───────── 報告回饋 ───────── */

export function feedbackItems(s: Session, o: StatsOpts): FeedbackItem[] {
  return colsOf(s, 'score').map((c) => ({ id: String(c.index), label: c.label, reversed: o.reversed.includes(c.index) }));
}

export function feedbackRecords(s: Session): FeedbackRecord[] {
  const resp = personRefs(s.table, s.cols, 'respondent');
  const target = personRefs(s.table, s.cols, 'target');
  const scoreCols = colsOf(s, 'score');
  const commentCol = colsOf(s, 'comment')[0];
  return activeRows(s).map((i) => ({
    id: i,
    rater: resp[i]!,
    target: target[i]!,
    scores: Object.fromEntries(scoreCols.map((c) => [String(c.index), cellAt(s, i, c.index)])),
    comment: commentCol ? cellAt(s, i, commentCol.index) : null,
  }));
}

export function runFeedback(s: Session, o: StatsOpts): FeedbackSummary {
  return summarizeFeedback(feedbackRecords(s), feedbackItems(s, o), { scale: s.scale, trim: o.trim });
}

/* ───────── 意見調查 ───────── */

export type Question =
  | { kind: 'score'; col: ColumnInfo; stat: LikertSummary }
  | { kind: 'choice'; col: ColumnInfo; multi: boolean; options: string[]; stat: ChoiceSummary }
  | { kind: 'comment'; col: ColumnInfo; stat: ReturnType<typeof summarizeOpen> & { rows: number[] } };

function colCells(s: Session, col: ColumnInfo, rows: number[]): Cell[] {
  return rows.map((i) => cellAt(s, i, col.index));
}

/** 選擇題自動判斷複選：有兩成以上的作答含逗號或頓號。 */
export function looksMulti(cells: readonly Cell[]): boolean {
  const filled = cells.filter((c) => !isBlankCell(c));
  if (filled.length === 0) return false;
  return filled.filter((c) => /[,，、]/.test(cellText(c))).length / filled.length >= 0.2;
}

/** 複選題的選項清單：所有作答拆開後出現過的選項。 */
function multiOptions(cells: readonly Cell[]): string[] {
  const seen = new Set<string>();
  for (const c of cells) {
    if (isBlankCell(c)) continue;
    for (const p of cellText(c).split(/[,，、]/)) {
      const t = p.trim();
      if (t) seen.add(t);
    }
  }
  return [...seen];
}

export function opinionQuestions(s: Session, o: StatsOpts): Question[] {
  const rows = activeRows(s);
  const out: Question[] = [];
  for (const col of s.cols) {
    const cells = colCells(s, col, rows);
    if (col.role === 'score') out.push({ kind: 'score', col, stat: summarizeLikert(cells, s.scale) });
    else if (col.role === 'choice') {
      const multi = o.multi[col.index] ?? looksMulti(cells);
      const options = multi ? multiOptions(cells) : [];
      const stat = summarizeChoice(cells, multi ? { multi: true, options } : {});
      out.push({ kind: 'choice', col, multi, options, stat });
    } else if (col.role === 'comment') {
      const stat = summarizeOpen(cells);
      out.push({ kind: 'comment', col, stat: { ...stat, answers: stat.answers.map((a) => ({ ...a, row: rows[a.row]! })), rows } });
    }
  }
  return out;
}

export { splitMulti };

/* ───────── 票選幹部 ───────── */

export interface PositionResult {
  col: ColumnInfo;
  tally: PositionTally;
  seats: number;
  election: Election;
}

export interface VoteResult {
  ballots: Ballot[];
  issues: VoteIssue[];
  inclusion: Inclusion;
  positions: PositionResult[];
}

export function voteBallots(s: Session): Ballot[] {
  const resp = personRefs(s.table, s.cols, 'respondent');
  const choiceCols = colsOf(s, 'choice');
  const ts = colsOf(s, 'timestamp')[0];
  return activeRows(s).map((i) => ({
    id: i,
    voter: resp[i]!,
    timestamp: ts ? cellAt(s, i, ts.index) : null,
    picks: Object.fromEntries(
      choiceCols.map((c) => {
        const v = cellAt(s, i, c.index);
        return [String(c.index), isBlankCell(v) ? null : cellText(v)];
      }),
    ),
  }));
}

export function runVote(s: Session, o: StatsOpts, overrides: ReadonlyMap<string | number, boolean> = new Map()): VoteResult {
  const ballots = voteBallots(s);
  const issues = detectVoteIssues(ballots);
  const inclusion = decideInclusion(ballots, issues, o.voteRules, overrides);
  const names = rosterStudents(s).map((st) => st.name);
  const positions = colsOf(s, 'choice').map((col): PositionResult => {
    const tally = tallyPosition(ballots, inclusion, String(col.index), names.length > 0 ? names : undefined);
    const seats = Math.max(1, o.seats[col.index] ?? 1);
    return { col, tally, seats, election: elect(tally, seats, `${o.seed}|${col.index}`) };
  });
  return { ballots, issues, inclusion, positions };
}
