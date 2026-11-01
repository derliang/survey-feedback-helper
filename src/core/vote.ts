import { type Cell, cellText, normalizeName, parseTimestamp } from './text';
import { type PersonRef } from './roster';
import { personKey } from './check';
import { seededShuffle } from './random';

/** 一張票（一份回覆）。picks：職位 → 投給誰（空白或 null 表示該職位沒投）。 */
export interface Ballot {
  id: string | number;
  voter: PersonRef;
  timestamp?: Cell;
  picks: Record<string, string | null>;
}

export type VoteIssueKind = 'multi' | 'self' | 'time' | 'blank';

export interface VoteIssue {
  kind: VoteIssueKind;
  ballotIds: (string | number)[];
  /** multi 與 self 才有：填寫者的比對鍵。 */
  voterKey?: string;
  /** self：自投的職位。time：原因。 */
  detail?: string;
}

export interface DetectOptions {
  /** 投票期間（毫秒，與 parseTimestamp 同一基準）；之外的票視為時間異常。 */
  window?: { start: number; end: number };
  /** 短時間湧入：withinMs 內同一批連續出現 count 張以上視為異常。 */
  burst?: { count: number; withinMs: number };
}

function hasPick(v: string | null | undefined): boolean {
  return v !== null && v !== undefined && normalizeName(v) !== '';
}

/**
 * 防弊偵測（純函式）：輸出「可疑項目 → 涉及的票」。
 * - multi：同一人多張票
 * - self：自己投自己（姓名比對，容忍空白與全半形）
 * - time：時間戳記缺失／無法解析、在投票期間之外、短時間大量湧入
 * - blank：整張票沒有任何有效選擇
 */
export function detectVoteIssues(ballots: readonly Ballot[], opts: DetectOptions = {}): VoteIssue[] {
  const issues: VoteIssue[] = [];

  const byVoter = new Map<string, (string | number)[]>();
  for (const b of ballots) {
    const k = personKey(b.voter);
    if (k !== null) byVoter.set(k, [...(byVoter.get(k) ?? []), b.id]);
  }
  for (const [voterKey, ids] of byVoter) if (ids.length > 1) issues.push({ kind: 'multi', ballotIds: ids, voterKey });

  for (const b of ballots) {
    const me = normalizeName(b.voter.name);
    if (me === '') continue;
    for (const [position, pick] of Object.entries(b.picks)) {
      if (hasPick(pick) && normalizeName(pick) === me) {
        issues.push({ kind: 'self', ballotIds: [b.id], voterKey: personKey(b.voter) ?? me, detail: position });
      }
    }
  }

  const stamped: { id: string | number; t: number }[] = [];
  for (const b of ballots) {
    const t = parseTimestamp(b.timestamp);
    if (t === null) {
      issues.push({ kind: 'time', ballotIds: [b.id], detail: 'unparsable' });
      continue;
    }
    stamped.push({ id: b.id, t });
    if (opts.window && (t < opts.window.start || t > opts.window.end)) {
      issues.push({ kind: 'time', ballotIds: [b.id], detail: 'outsideWindow' });
    }
  }
  if (opts.burst) {
    const sorted = [...stamped].sort((a, b) => a.t - b.t);
    const flagged = new Set<string | number>();
    let lo = 0;
    for (let hi = 0; hi < sorted.length; hi++) {
      while ((sorted[hi] as { t: number }).t - (sorted[lo] as { t: number }).t > opts.burst.withinMs) lo++;
      if (hi - lo + 1 >= opts.burst.count) for (let i = lo; i <= hi; i++) flagged.add((sorted[i] as { id: string | number }).id);
    }
    if (flagged.size > 0) issues.push({ kind: 'time', ballotIds: [...flagged], detail: 'burst' });
  }

  for (const b of ballots) {
    if (!Object.values(b.picks).some(hasPick)) issues.push({ kind: 'blank', ballotIds: [b.id] });
  }
  return issues;
}

/** 整類規則：決定每一類可疑票預設怎麼算（R-015：逐人勾選是例外）。 */
export interface VoteRules {
  /** 同人多票：只算最後一張／只算第一張／都不算／全部計入。 */
  multi: 'last' | 'first' | 'none' | 'all';
  /** 自投：照算／只剔除自投那一格／整張票不算。 */
  self: 'count' | 'excludePick' | 'excludeBallot';
  /** 時間異常：保留／不算。 */
  time: 'keep' | 'exclude';
}

export const DEFAULT_VOTE_RULES: VoteRules = { multi: 'last', self: 'count', time: 'keep' };

export interface BallotDecision {
  ballotId: string | number;
  included: boolean;
  /** 被剔除的職位（self=excludePick）。 */
  droppedPositions: string[];
  reasons: VoteIssueKind[];
  /** 老師逐張覆寫過，且結果與整類規則的預設不同。 */
  manual: boolean;
}

export interface Inclusion {
  decisions: BallotDecision[];
  /** 「X 位為手動調整」的 X。 */
  manualCount: number;
}

/**
 * 依整類規則算出每張票是否計入，再套用老師的逐張覆寫（overrides：票 id → 是否計入）。
 * 覆寫 true 表示整張照算（含自投）。排序依輸入順序（同人多票的「最後」＝輸入中較後者；
 * 時間戳記可解析時以時間為準，同時間以輸入順序）。
 */
export function decideInclusion(
  ballots: readonly Ballot[],
  issues: readonly VoteIssue[],
  rules: VoteRules = DEFAULT_VOTE_RULES,
  overrides: ReadonlyMap<string | number, boolean> = new Map(),
): Inclusion {
  const order = new Map(ballots.map((b, i) => [b.id, i] as const));
  const time = new Map(ballots.map((b) => [b.id, parseTimestamp(b.timestamp) ?? 0] as const));
  const cmp = (a: string | number, b: string | number): number =>
    (time.get(a) ?? 0) - (time.get(b) ?? 0) || (order.get(a) ?? 0) - (order.get(b) ?? 0);

  const excluded = new Map<string | number, Set<VoteIssueKind>>();
  const drop = (id: string | number, k: VoteIssueKind) => excluded.set(id, (excluded.get(id) ?? new Set()).add(k));
  const dropped = new Map<string | number, Set<string>>();
  const reasons = new Map<string | number, Set<VoteIssueKind>>();
  const mark = (id: string | number, k: VoteIssueKind) => reasons.set(id, (reasons.get(id) ?? new Set()).add(k));

  for (const issue of issues) {
    for (const id of issue.ballotIds) mark(id, issue.kind);
    if (issue.kind === 'blank') issue.ballotIds.forEach((id) => drop(id, 'blank'));
    else if (issue.kind === 'time' && rules.time === 'exclude') issue.ballotIds.forEach((id) => drop(id, 'time'));
    else if (issue.kind === 'multi' && rules.multi !== 'all') {
      const sorted = [...issue.ballotIds].sort(cmp);
      const keep = rules.multi === 'last' ? sorted[sorted.length - 1] : rules.multi === 'first' ? sorted[0] : undefined;
      sorted.filter((id) => id !== keep).forEach((id) => drop(id, 'multi'));
    } else if (issue.kind === 'self') {
      const id = issue.ballotIds[0] as string | number;
      if (rules.self === 'excludeBallot') drop(id, 'self');
      else if (rules.self === 'excludePick' && issue.detail !== undefined) {
        dropped.set(id, (dropped.get(id) ?? new Set()).add(issue.detail));
      }
    }
  }

  let manualCount = 0;
  const decisions = ballots.map((b): BallotDecision => {
    const ruleIncluded = !excluded.has(b.id);
    const override = overrides.get(b.id);
    const included = override ?? ruleIncluded;
    const manual = override !== undefined && override !== ruleIncluded;
    if (manual) manualCount++;
    // 覆寫為「計入」時整張照算；覆寫為「不計入」時不看 droppedPositions
    const droppedPositions = override === true ? [] : [...(dropped.get(b.id) ?? [])];
    return { ballotId: b.id, included, droppedPositions, reasons: [...(reasons.get(b.id) ?? [])], manual };
  });
  return { decisions, manualCount };
}

export interface TallyRow {
  name: string;
  votes: number;
  /** 競賽排名：同票同名次，下一名跳號（1,1,3）。 */
  rank: number;
}

export interface PositionTally {
  position: string;
  rows: TallyRow[];
  /** 計入的票中，此職位投了名單以外的人（無效票）。 */
  invalid: number;
  /** 計入的票中，此職位沒投（棄權）。 */
  abstain: number;
  validBallots: number;
}

/** 計某職位得票。candidates 給定時，名單內 0 票者也列出，名單外的名字算無效票。 */
export function tallyPosition(
  ballots: readonly Ballot[],
  inclusion: Inclusion,
  position: string,
  candidates?: readonly string[],
): PositionTally {
  const display = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const c of candidates ?? []) {
    const k = normalizeName(c);
    if (!display.has(k)) {
      display.set(k, cellText(c));
      counts.set(k, 0);
    }
  }
  const byId = new Map(inclusion.decisions.map((d) => [d.ballotId, d] as const));
  let invalid = 0;
  let abstain = 0;
  let validBallots = 0;
  for (const b of ballots) {
    const d = byId.get(b.id);
    if (!d?.included) continue;
    validBallots++;
    const raw = b.picks[position];
    if (!hasPick(raw) || d.droppedPositions.includes(position)) {
      abstain++;
      continue;
    }
    const k = normalizeName(raw);
    if (candidates !== undefined && !display.has(k)) {
      invalid++;
      continue;
    }
    if (!display.has(k)) display.set(k, cellText(raw));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const sorted = [...counts].sort((a, b) => b[1] - a[1] || (display.get(a[0]) as string).localeCompare(display.get(b[0]) as string, 'zh-Hant'));
  const rows: TallyRow[] = [];
  sorted.forEach(([k, votes], i) => {
    const prev = rows[i - 1];
    rows.push({ name: display.get(k) as string, votes, rank: prev && prev.votes === votes ? prev.rank : i + 1 });
  });
  return { position, rows, invalid, abstain, validBallots };
}

export interface DrawRecord {
  seed: string;
  /** 參與抽籤的同票者，依抽出順序排列。 */
  order: string[];
  /** 抽籤依據（同票者與票數）。手動調整票數後依據改變，UI 應提示重新確認。 */
  basis: string;
}

export interface Election {
  seats: number;
  /** 不需抽籤即確定當選者。 */
  certain: string[];
  /** 抽籤後當選者（含 certain）。 */
  elected: string[];
  /** 名額邊界同票的所有人（含中籤與落選）；無同票時為 []。 */
  tied: string[];
  draw: DrawRecord | null;
}

/**
 * 依名額決定當選者；名額邊界同票時以種子抽籤（同一種子、同一組同票者永遠同一結果）。
 * 0 票者不當選（名額多於有票者時空缺不補）。
 */
export function elect(tally: PositionTally, seats: number, seed: string): Election {
  const rows = tally.rows.filter((r) => r.votes > 0);
  if (seats <= 0 || rows.length === 0) return { seats, certain: [], elected: [], tied: [], draw: null };
  if (rows.length <= seats) {
    const all = rows.map((r) => r.name);
    return { seats, certain: all, elected: all, tied: [], draw: null };
  }
  const cutVotes = (rows[seats - 1] as TallyRow).votes;
  const nextVotes = (rows[seats] as TallyRow).votes;
  if (cutVotes !== nextVotes) {
    const win = rows.slice(0, seats).map((r) => r.name);
    return { seats, certain: win, elected: win, tied: [], draw: null };
  }
  const certain = rows.filter((r) => r.votes > cutVotes).map((r) => r.name);
  const tiedRows = rows.filter((r) => r.votes === cutVotes);
  const base = tiedRows.map((r) => r.name).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const order = seededShuffle(base, seed);
  const slots = seats - certain.length;
  return {
    seats,
    certain,
    elected: [...certain, ...order.slice(0, slots)],
    tied: base,
    draw: { seed, order, basis: `${cutVotes}|${base.join(',')}` },
  };
}
