import { isBlankCell, parseNumber, round1 } from './text';
import { personKey } from './check';
import { type PersonRef } from './roster';
import { DEFAULT_SCALE, effectiveWeights, type FeedbackItem, type FeedbackRecord, type FeedbackScale, type FeedbackSummary } from './feedback';
import { mean, trimExtremes } from './mean';

export interface GapItem {
  itemId: string;
  self: number | null;
  /** 他評平均。 */
  others: number | null;
  /** 自評 − 他評；任一為 null 即 null。正＝自評高於他評。 */
  gap: number | null;
  kind: 'over' | 'under' | 'aligned' | 'unknown';
}

export interface SelfOthersResult {
  key: string;
  person: PersonRef;
  hasSelf: boolean;
  items: GapItem[];
  /** 自評總分（用同一組權重，只含兩邊都有分數的項目）；無法算為 null。 */
  selfTotal: number | null;
  othersTotal: number | null;
  totalGap: number | null;
  totalKind: GapItem['kind'];
}

function gapKind(gap: number | null, threshold: number): GapItem['kind'] {
  if (gap === null) return 'unknown';
  if (gap > threshold) return 'over';
  if (gap < -threshold) return 'under';
  return 'aligned';
}

/**
 * 自評對他評落差：每位被評者每題的 自評 − 他評平均。
 * 落差絕對值超過 threshold（預設 1 分）才標「自評偏高／偏低」，否則視為接近。
 * 總分只在「自評與他評都有分數」的題目間用 summary 的權重重新正規化，兩邊才可比。
 * 沒有自評的被評者 hasSelf 為 false，各項 kind 為 unknown。
 */
export function selfVsOthers(summary: FeedbackSummary, opts: { threshold?: number } = {}): SelfOthersResult[] {
  const threshold = opts.threshold ?? 1;
  return summary.targets.map((t) => {
    let sw = 0;
    let sSelf = 0;
    let sOthers = 0;
    const items = summary.items.map((it, i): GapItem => {
      const self = t.selfScores?.[it.id] ?? null;
      const others = t.items[i]?.mean ?? null;
      const gap = self !== null && others !== null ? self - others : null;
      if (gap !== null) {
        const w = summary.weights[i] ?? 0;
        sw += w;
        sSelf += self! * w;
        sOthers += others! * w;
      }
      return { itemId: it.id, self, others, gap, kind: gapKind(gap, threshold) };
    });
    const selfTotal = sw > 0 ? sSelf / sw : null;
    const othersTotal = sw > 0 ? sOthers / sw : null;
    const totalGap = selfTotal !== null && othersTotal !== null ? selfTotal - othersTotal : null;
    return { key: t.key, person: t.person, hasSelf: t.selfScores !== null, items, selfTotal, othersTotal, totalGap, totalKind: gapKind(totalGap, threshold) };
  });
}

/** 一份回覆的加權分數：只含有效分數的題目，權重在這些題間重新正規化；反向題先換算。沒有任何有效分數為 null。 */
export function recordScore(record: FeedbackRecord, items: readonly FeedbackItem[], scale: FeedbackScale = DEFAULT_SCALE): number | null {
  const weights = effectiveWeights(items);
  let sum = 0;
  let wsum = 0;
  items.forEach((it, i) => {
    const cell = record.scores[it.id];
    if (isBlankCell(cell)) return;
    const n = parseNumber(cell);
    if (n === null || n < scale.min || n > scale.max) return;
    const v = it.reversed ? scale.min + scale.max - n : n;
    sum += v * (weights[i] ?? 0);
    wsum += weights[i] ?? 0;
  });
  return wsum > 0 ? sum / wsum : null;
}

export interface MemberContribution {
  key: string;
  person: PersonRef;
  /** 組員評他的份數（有有效分數的，不含自評）。 */
  raters: number;
  /** 組員給他的分數平均（去極端值後）；沒人評為 null。 */
  received: number | null;
  /** 貢獻占比：他的 received ÷ 全組 received 總和（0～1）；組內沒人有分數為 null。 */
  share: number | null;
  /** 貢獻指數：他的 received ÷ 全組 received 平均（1＝平均水準）。 */
  index: number | null;
  /** 自評總分，沒有為 null。 */
  self: number | null;
}

export interface GroupContribution {
  group: string;
  members: MemberContribution[];
  /** 評分者不在這組（或查不到組別）、因此不計入的回覆數。 */
  ignored: number;
}

/**
 * 小組互評貢獻度。
 * - groupOf 回傳人的比對鍵（personKey）所屬組別，查不到回傳 null（不計入）
 * - 只計「同組組員互評」：評分者與被評者同組、且不是同一人；自評另列 self
 * - 每位組員的 received = 各份互評分數（recordScore）平均，可用 trim 去極端值
 * - 沒有任何組員有分數的組，share、index 皆為 null
 * - 組內成員 = 出現在評分者或被評者的所有同組人；沒被評過的成員 received 為 null、不計入占比
 */
export function peerContribution(
  records: readonly FeedbackRecord[],
  items: readonly FeedbackItem[],
  groupOf: (key: string) => string | null,
  opts: { scale?: FeedbackScale; trim?: number } = {},
): GroupContribution[] {
  const trim = Math.max(0, Math.floor(opts.trim ?? 0));
  type M = { person: PersonRef; scores: number[]; self: number | null };
  const groups = new Map<string, { members: Map<string, M>; ignored: number }>();
  const grp = (g: string) => {
    let v = groups.get(g);
    if (!v) groups.set(g, (v = { members: new Map(), ignored: 0 }));
    return v;
  };
  const member = (g: ReturnType<typeof grp>, key: string, person: PersonRef): M => {
    let m = g.members.get(key);
    if (!m) g.members.set(key, (m = { person, scores: [], self: null }));
    return m;
  };
  for (const r of records) {
    const tk = personKey(r.target);
    const rk = personKey(r.rater);
    if (tk === null) continue;
    const tg = groupOf(tk);
    if (tg === null) continue;
    const g = grp(tg);
    const target = member(g, tk, r.target);
    if (rk !== null) {
      const rg = groupOf(rk);
      if (rg === tg) member(g, rk, r.rater);
      if (rk !== tk && rg !== tg) {
        g.ignored++;
        continue;
      }
    } else {
      g.ignored++;
      continue;
    }
    const score = recordScore(r, items, opts.scale);
    if (rk === tk) {
      if (score !== null) target.self = score;
    } else if (score !== null) target.scores.push(score);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, 'zh-Hant'))
    .map(([group, g]) => {
      const base = [...g.members].map(([key, m]) => ({ key, m, received: mean(trimExtremes(m.scores, trim).values) }));
      const got = base.map((b) => b.received).filter((v): v is number => v !== null);
      const total = got.reduce((s, v) => s + v, 0);
      const avg = got.length === 0 ? null : total / got.length;
      return {
        group,
        ignored: g.ignored,
        members: base.map(({ key, m, received }): MemberContribution => ({
          key,
          person: m.person,
          raters: m.scores.length,
          received,
          share: received !== null && total > 0 ? received / total : null,
          index: received !== null && avg !== null && avg > 0 ? received / avg : null,
          self: m.self,
        })),
      };
    });
}

/** 顯示用：占比百分比到小數一位，例如 0.2537 → '25.4%'；null 為 '—'。 */
export function formatShare(share: number | null): string {
  return share === null ? '—' : `${round1(share * 100)}%`;
}
