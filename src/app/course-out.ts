// 選課分組志願的輸出：分組名單、待安排名單、志願命中統計（xlsx 工作表資料，純函式）。
import { cleanPrefs } from '../core';
import type { XSheet } from '../export';
import { courseApplicants, courseList, courseSummary, stampTaipei } from './course-app';
import type { Session } from './store';

const H = (v: string) => ({ v, s: 'header' as const });
const pct = (x: number): string => `${Math.round(x * 100)}%`;

export const courseXlsxName = (s: Session, label: string): string => `${s.name} ${label}.xlsx`;

/** 分配紀錄：種子、規則、名額、時間。 */
export function recordSheet(s: Session): XSheet {
  const c = s.course;
  const cap = courseList(s, c).reduce((a, x) => a + x.capacity, 0);
  return {
    name: '分配紀錄',
    colWidths: [16, 60],
    rows: [
      [H('項目'), H('內容')],
      ['抽籤編號', c.seed],
      ['規則', '逐志願輪；同課超額時優先分配名單先取、其餘以抽籤編號可重現抽籤；沒分到的進下一志願'],
      ['名額合計', cap],
      ['填答人數', courseApplicants(s, c).list.length],
      ['分配時間（台北時間）', stampTaipei(c.ranAt)],
    ],
  };
}

function rows(s: Session) {
  const c = s.course;
  const { list, people } = courseApplicants(s, c);
  const courses = courseList(s, c);
  const byId = new Map((c.result ?? []).map((a) => [a.id, a]));
  const pri = new Set(c.priority);
  return list.map((a) => {
    const asg = byId.get(a.id);
    const p = people.get(a.id);
    return { a, asg, seat: p?.seat ?? '', name: p?.name ?? '', prefs: cleanPrefs(a.prefs, courses), priority: pri.has(a.id) };
  });
}

const rankText = (r: number | null): string => (r === null ? '（非志願）' : `第 ${r} 志願`);

/** 分組名單：總表加每課一張工作表，最後附分配紀錄。 */
export function listSheets(s: Session): XSheet[] {
  const all = rows(s);
  const total: XSheet = {
    name: '總表',
    colWidths: [8, 14, 22, 12, 10],
    freezeRows: 1,
    rows: [
      [H('座號'), H('姓名'), H('課程'), H('第幾志願'), H('備註')],
      ...all.map((r) => [r.seat, r.name, r.asg?.course ?? '（待安排）', r.asg?.course ? rankText(r.asg.rank) : '', r.asg?.manual ? '手動調整' : r.priority ? '優先' : '']),
    ],
  };
  const per = courseList(s, s.course).map((co): XSheet => oneSheet(s, co.name));
  return [total, ...per, recordSheet(s)];
}

function oneSheet(s: Session, course: string): XSheet {
  const mine = rows(s).filter((r) => r.asg?.course === course);
  return {
    name: course,
    colWidths: [8, 14, 12, 10, 10],
    freezeRows: 1,
    rows: [
      [H('座號'), H('姓名'), H('第幾志願'), H('優先'), H('手動調整')],
      ...mine.map((r) => [r.seat, r.name, rankText(r.asg?.rank ?? null), r.priority ? '是' : '', r.asg?.manual ? '是' : '']),
    ],
  };
}

/** 單一課程的名單（桌機「匯出此課」）。 */
export function oneCourseSheets(s: Session, course: string): XSheet[] {
  return [oneSheet(s, course)];
}

/** 待安排名單：沒分到的人與原因。 */
export function pendingSheets(s: Session): XSheet[] {
  const pend = rows(s).filter((r) => r.asg && r.asg.course === null);
  const n = Math.max(1, ...pend.map((r) => r.prefs.length));
  return [
    {
      name: '待安排',
      colWidths: [8, 14, 14, ...Array<number>(n).fill(16)],
      freezeRows: 1,
      rows: [
        [H('座號'), H('姓名'), H('原因'), ...Array.from({ length: n }, (_, i) => H(`第 ${i + 1} 志願`))],
        ...pend.map((r) => [r.seat, r.name, r.asg?.reason === 'noPrefs' ? '沒填志願' : '志願都滿了', ...Array.from({ length: n }, (_, i) => r.prefs[i] ?? '')]),
      ],
    },
  ];
}

/** 志願命中統計：第幾志願分到，以及各課報名人數與名額。 */
export function hitSheets(s: Session): XSheet[] {
  const sum = courseSummary(s, s.course);
  if (!sum) return [];
  const hit: XSheet = {
    name: '第幾志願分到',
    colWidths: [16, 10, 10],
    rows: [
      [H('結果'), H('人數'), H('比例')],
      ...sum.rankCounts.map((n, i) => [`第 ${i + 1} 志願`, n, sum.total === 0 ? '0%' : pct(n / sum.total)]),
      ['待安排', sum.unassigned, sum.total === 0 ? '0%' : pct(sum.unassigned / sum.total)],
      ['合計', sum.total, '100%'],
    ],
  };
  const courses = courseList(s, s.course);
  const per: XSheet = {
    name: '各課人數與名額',
    colWidths: [22, 14, 14, 8, 10, 10, 18],
    freezeRows: 1,
    rows: [
      [H('課程'), H('第 1 志願報名'), H('任一志願報名'), H('名額'), H('分到人數'), H('最少開班'), H('狀態')],
      ...sum.courses.map((x) => [
        x.name,
        x.firstChoice,
        x.anyChoice,
        x.capacity,
        x.filled,
        courses.find((k) => k.name === x.name)?.minSize ?? '',
        x.over > 0 ? `超額 ${x.over} 人` : x.suggestClose ? '建議停開' : x.full ? '已滿' : '',
      ]),
    ],
  };
  return [hit, per, recordSheet(s)];
}
