import type { Session } from './store';

const ROLE_NAMES: Record<string, string> = {
  timestamp: '時間戳記',
  respondentClass: '填寫者班級',
  respondentSeat: '填寫者座號',
  respondentName: '填寫者姓名',
  targetClass: '被評對象班級',
  targetSeat: '被評對象座號',
  targetName: '被評對象姓名',
  bookTitle: '書名',
  score: '評分',
  choice: '選擇題',
  comment: '開放意見',
};

/** 統計方法說明用：每種用途對到哪幾欄（被忽略的欄不列）。 */
export function roleLabelsOf(s: Session): string[] {
  const out: string[] = [];
  for (const [role, name] of Object.entries(ROLE_NAMES)) {
    const cols = s.cols.filter((c) => c.role === role).map((c) => c.label);
    if (cols.length > 0) out.push(`${name}＝${cols.join('、')}`);
  }
  return out;
}
