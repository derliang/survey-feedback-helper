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
  type VoteIssueKind,
  type VoteRules,
  DEFAULT_VOTE_RULES,
  type PersonRef,
  cellText,
  countVoteIssues,
  decideInclusion,
  normalizeSeat,
  personKey,
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
import { respondentRefs, rosterStudents } from './progress';
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
  /** 票選防弊：老師已「確認這樣處理」的類別（全部決定後才看得到正式結果）。 */
  guardDone: VoteIssueKind[];
  /** 票選防弊逐張覆寫：票的資料列 → 是否計入（與整類規則不同的才記）。 */
  ballotOverrides: Record<number, boolean>;
  /** 同票改由老師指定時：職位欄位 index → 指定的當選者。 */
  tieManual: Record<number, string[]>;
}

export function defaultStatsOpts(): StatsOpts {
  return { trim: 0, reversed: [], multi: {}, voteRules: { ...DEFAULT_VOTE_RULES }, seats: {}, seed: newSeed(), guardDone: [], ballotOverrides: {}, tieManual: {} };
}

export function newSeed(): string {
  return `draw-${Date.now().toString(36)}`;
}

function activeRows(s: Session): number[] {
  const out = new Set(s.excluded);
  return s.table.rows.map((_, i) => i).filter((i) => !out.has(i));
}

const colsOf = (s: Session, role: ColumnInfo['role']): ColumnInfo[] => s.cols.filter((c) => c.role === role);
const cellAt = (s: Session, row: number, col: number): Cell => s.table.rows[row]?.[col] ?? null;

/** 整欄沒有人填寫、又沒被當成任何題型的欄位（統計頁用它提示「這欄沒有列入」，Issue #94）。 */
export function blankColumns(s: Session): ColumnInfo[] {
  const rows = activeRows(s);
  return s.cols.filter((c) => c.role === 'ignore' && rows.every((i) => isBlankCell(cellAt(s, i, c.index))));
}

/* ───────── 報告回饋 ───────── */

export function feedbackItems(s: Session, o: StatsOpts): FeedbackItem[] {
  return colsOf(s, 'score').map((c) => ({ id: String(c.index), label: c.label, reversed: o.reversed.includes(c.index) }));
}

export function feedbackRecords(s: Session): FeedbackRecord[] {
  const resp = respondentRefs(s);
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

/**
 * 被評者比對鍵：預設「班級＋姓名」（座號常填錯，不單獨拿來分人）。
 * 名單裡同班同名的人（座號不同）才帶座號區分，否則會被併成同一人（Issue #121）；座號沒填或不是整數者仍用預設鍵。
 */
export function rosterKeyOf(s: Session): (p: PersonRef) => string | null {
  const counts = new Map<string, number>();
  for (const st of rosterStudents(s)) {
    const k = personKey({ class: st.class, name: st.name });
    if (k !== null) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return (p) => {
    const k = personKey(p);
    if (k === null || (counts.get(k) ?? 0) < 2) return k;
    const seat = normalizeSeat(p.seat);
    return seat === null ? k : `${k}|${seat}`;
  };
}

export function runFeedback(s: Session, o: StatsOpts): FeedbackSummary {
  return summarizeFeedback(feedbackRecords(s), feedbackItems(s, o), { scale: s.scale, trim: o.trim, keyOf: rosterKeyOf(s) });
}

/* ───────── 意見調查 ───────── */

export type Question =
  | { kind: 'score'; col: ColumnInfo; stat: LikertSummary }
  | { kind: 'choice'; col: ColumnInfo; multi: boolean; options: string[]; stat: ChoiceSummary }
  | { kind: 'comment'; col: ColumnInfo; stat: ReturnType<typeof summarizeOpen> & { rows: number[] } };

function colCells(s: Session, col: ColumnInfo, rows: number[]): Cell[] {
  return rows.map((i) => cellAt(s, i, col.index));
}

/**
 * 選擇題自動判斷複選：有兩成以上的作答含逗號或頓號，而且拆開後的片段真的是「共用的選項」——
 * 片段本身也單獨出現在別人的作答，或同一片段出現在兩種以上不同的組合裡。
 * 只有選項名稱本身含頓號（如單選的「人文、社會」）時，片段不會單獨出現，不算複選，也不會被拆開。
 */
export function looksMulti(cells: readonly Cell[]): boolean {
  const filled = cells.map((c) => cellText(c)).filter((t) => t !== '');
  if (filled.length === 0) return false;
  const delimited = filled.filter((t) => /[,，、]/.test(t));
  if (delimited.length / filled.length < 0.2) return false;
  const whole = new Set(filled.filter((t) => !/[,，、]/.test(t)));
  const partIn = new Map<string, Set<string>>();
  for (const t of new Set(delimited)) {
    for (const p of t.split(/[,，、]/)) {
      const part = p.trim();
      if (part === '') continue;
      if (whole.has(part)) return true;
      const combos = partIn.get(part) ?? new Set<string>();
      combos.add(t);
      partIn.set(part, combos);
    }
  }
  return [...partIn.values()].some((combos) => combos.size >= 2);
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
  /** 限投一票：這個職位因為填了多人而視為無效的票數。 */
  multiPick: number;
}

export interface VoteResult {
  ballots: Ballot[];
  issues: VoteIssue[];
  inclusion: Inclusion;
  positions: PositionResult[];
}

/** 同一人當選多個職位（不阻擋，只提示；Issue #211）。依姓名在各職位當選名單中出現的次數判斷。 */
export function multiElected(positions: readonly PositionResult[]): { name: string; positions: string[] }[] {
  const map = new Map<string, string[]>();
  for (const p of positions) for (const name of new Set(p.election.elected)) map.set(name, [...(map.get(name) ?? []), p.col.label]);
  return [...map].filter(([, ps]) => ps.length >= 2).map(([name, ps]) => ({ name, positions: ps }));
}

export function voteBallots(s: Session): Ballot[] {
  const resp = respondentRefs(s);
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

export function runVote(s: Session, o: StatsOpts, overrides: ReadonlyMap<string | number, boolean> | null = null): VoteResult {
  const raw = voteBallots(s);
  const choiceCols = colsOf(s, 'choice');
  // 每人每職位限投一票：同一職位填了多個人，該職位視為沒投（並計入該職位的「無效」件數）
  const multiPicks = new Map<string, number>();
  const ballots = o.voteRules.oneVote
    ? raw.map((b) => {
        const picks = { ...b.picks };
        for (const [k, v] of Object.entries(picks)) {
          if (v !== null && splitMulti(v).selected.length > 1) {
            picks[k] = null;
            multiPicks.set(k, (multiPicks.get(k) ?? 0) + 1);
          }
        }
        return { ...b, picks };
      })
    : raw;
  const issues = detectVoteIssues(ballots);
  const ov = overrides ?? new Map(Object.entries(o.ballotOverrides).map(([k, v]) => [Number(k), v] as const));
  const inclusion = decideInclusion(ballots, issues, o.voteRules, ov);
  const names = rosterStudents(s).map((st) => st.name);
  const positions = choiceCols.map((col): PositionResult => {
    const tally = tallyPosition(ballots, inclusion, String(col.index), names.length > 0 ? names : undefined);
    const seats = Math.max(1, o.seats[col.index] ?? 1);
    const election = elect(tally, seats, `${o.seed}|${col.index}`, { alternates: o.voteRules.alternates, tie: o.voteRules.tie, manual: o.tieManual[col.index] ?? [] });
    return { col, tally, seats, election, multiPick: multiPicks.get(String(col.index)) ?? 0 };
  });
  return { ballots, issues, inclusion, positions };
}

export const VOTE_GUARD_KINDS: readonly VoteIssueKind[] = ['multi', 'self', 'time', 'blank'];

/** 防弊四項中，有可疑票但老師還沒決定的類別；有的話正式結果不顯示（Issue #175）。 */
export function voteGuardPending(v: VoteResult, o: StatsOpts): VoteIssueKind[] {
  const c = countVoteIssues(v.issues);
  return VOTE_GUARD_KINDS.filter((k) => c[k] > 0 && !o.guardDone.includes(k));
}
