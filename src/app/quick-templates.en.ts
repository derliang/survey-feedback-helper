// 快速範本的英文版（只新增，不改 quick-templates.ts 的繁中原文）。依 id 對應；題目順序與題型與繁中完全一致。
// 英文版的題目本文只用於畫面顯示、複製題目清單，以及開啟英文表單匯出檔時的標題比對；Google 表單題目本身的繁中預設不受影響。
// Google 欄位名稱（Timestamp）與題型名稱尚未走過真實英文介面，畫面上一律標 (to be verified)。
import type { SavedSurvey } from '../storage';
import { TEMPLATE_ID_PREFIX, type QType, type QuickTemplate, type TplQuestion } from './quick-templates';

type QEn = { text: string; options?: string[] };
interface TplEn {
  name: string;
  purpose: string;
  audience: string;
  scaleLabels: string;
  questions: QEn[];
  defaults: string;
  note?: string;
}

const WHO: QEn[] = [{ text: 'Class' }, { text: 'Seat number' }, { text: 'Name' }];
const YNO = ['In favor', 'Against', 'No opinion'];

export const TEMPLATES_EN: Record<string, TplEn> = {
  activity: {
    name: 'Activity satisfaction',
    purpose: 'After a field trip, school anniversary, camp or class event: how satisfied was everyone?',
    audience: 'Students or participants',
    scaleLabels: '1 Very dissatisfied – 5 Very satisfied',
    questions: [
      { text: 'Overall, I am satisfied with this activity' },
      { text: 'The activity was fun and I got something out of it' },
      { text: 'The schedule and flow were well arranged' },
      { text: 'The venue and preparation made me feel comfortable' },
      { text: 'I would join a similar activity again' },
      { text: 'What I liked best, and what could be better' },
    ],
    defaults: 'Charts show the scale distribution of each question; open-ended comments are listed one by one. Anonymous, no name question.',
  },
  parent: {
    name: 'Parent feedback',
    purpose: 'Feedback on parent meetings, the contact book and how teachers and parents communicate.',
    audience: 'Parents',
    scaleLabels: '1 Strongly disagree – 5 Strongly agree',
    questions: [
      { text: 'I clearly understand how my child is doing in class' },
      { text: 'Class communication (notices, contact book) keeps me well informed' },
      { text: 'I feel the teacher cares about my child’s individual needs' },
      { text: 'I would like parent meetings or contact to be', options: ['More frequent', 'The same', 'Less frequent'] },
      { text: 'Where I would most like the teacher to help more', options: ['Learning', 'Daily life', 'Friendships', 'Emotions', 'Other'] },
      { text: 'Anything else you would like to tell the teacher' },
    ],
    defaults: 'Questions 1–3: scale distribution; question 4: count per option; question 5: multiple-choice results (percentages use the number of people who answered).',
    note: 'Comments may mention a child or another parent by name. Preview each comment one by one before output, following the de-identification reminder.',
  },
  teaching: {
    name: 'Teaching feedback',
    purpose: 'Mid-term or end-of-term feedback on teaching.',
    audience: 'Students',
    scaleLabels: '1 Strongly disagree – 5 Strongly agree',
    questions: [
      { text: 'The key points of each lesson are clear' },
      { text: 'I can keep up with the pace of the class' },
      { text: 'The amount and difficulty of homework are about right' },
      { text: 'I dare to ask questions or speak up in class' },
      { text: 'Most helpful class activities', options: ['Explanations', 'Group discussion', 'Practice exercises', 'Presentations', 'Other'] },
      { text: 'One thing I hope the teacher keeps doing' },
      { text: 'One thing I hope the teacher changes' },
    ],
    defaults: 'Compare the scale distribution of each question in charts; if there is a class column, compare classes as well.',
    note: 'This is feedback about the teacher personally. The version shown to students contains only the summary.',
  },
  selfeval: {
    name: 'Learning self-assessment',
    purpose: 'Students assess themselves after a unit.',
    audience: 'Students themselves',
    scaleLabels: '1 Not at all like me – 5 Exactly like me',
    questions: [
      ...WHO,
      { text: 'I can explain the key points of this unit in my own words' },
      { text: 'I completed the practice the teacher assigned' },
      { text: 'When I do not understand something, I try to figure it out' },
      { text: 'I worked well with my classmates' },
      { text: 'Where I improved most in this unit' },
      { text: 'What I want to work on next' },
    ],
    defaults: 'The individual feedback sheet can compare a student with the class average; different units can be compared through the history trend.',
  },
  signup: {
    name: 'Sign-up and roll call',
    purpose: 'Event sign-up, who is joining an outing, group-order counts. Not a scale; no scoring.',
    audience: 'Students or parents',
    scaleLabels: 'No scale',
    questions: [...WHO, { text: 'Will you join?', options: ['Yes', 'No'] }, { text: 'Notes (for example dietary restrictions)' }],
    defaults: 'The roster comparison shows “people who have not replied yet”; statistics only count people and notes, with no averages.',
  },
  classrule: {
    name: 'Class rule vote',
    purpose: 'Proposed class rule changes, activity themes, seating plans and the like; one vote per issue.',
    audience: 'Students',
    scaleLabels: 'No scale',
    questions: [...WHO, { text: 'Your position on issue 1', options: YNO }, { text: 'Your position on issue 2', options: YNO }],
    defaults: 'The type is “Election”; each issue is treated as one “position” and the options are in favor, against and no opinion. Anti-fraud checks run as usual; self-voting does not apply; ties default to “teacher decides”. Add one question per issue.',
  },
};

/** 英文版範本；沒有對應英文時原樣回傳繁中版。題目與選項數量對不上時也退回繁中（避免錯位）。 */
export function localizeTemplate(t: QuickTemplate, lang: 'zh' | 'en'): QuickTemplate {
  if (lang !== 'en') return t;
  const e = TEMPLATES_EN[t.id];
  if (!e || e.questions.length !== t.questions.length) return t;
  const questions: TplQuestion[] = t.questions.map((q, i) => {
    const eq = e.questions[i]!;
    if (q.options && eq.options?.length !== q.options.length) return q;
    return { ...q, text: eq.text, ...(q.options ? { options: eq.options } : {}) };
  });
  return {
    ...t,
    name: e.name,
    purpose: e.purpose,
    audience: e.audience,
    scaleLabels: e.scaleLabels,
    questions,
    defaults: e.defaults,
    ...(e.note ? { note: e.note } : {}),
  };
}

export const QTYPE_LABEL_EN: Record<QType, string> = {
  short: 'Short answer',
  choice: 'Multiple choice',
  checkbox: 'Checkboxes',
  scale: 'Linear scale',
  paragraph: 'Paragraph',
};
/** 英文版的「沒有量表」「時間戳記」（Google 欄位名稱，待核對）。 */
export const NO_SCALE_EN = 'No scale';
export const TIMESTAMP_EN = 'Timestamp';

type Lang = 'zh' | 'en';

/** 語系版的單題說明（zh 與 quick-templates.ts 的 questionHint 同結果）。 */
export function questionHintL(q: TplQuestion, scale: { min: number; max: number }, lang: Lang): string {
  const L = lang === 'en' ? QTYPE_LABEL_EN : ZH_LABEL;
  if (q.type === 'scale') return lang === 'en' ? `${L.scale} ${scale.min}–${scale.max}` : `${L.scale} ${scale.min}～${scale.max}`;
  if (q.options) return `${L[q.type]}${lang === 'en' ? ': ' : '：'}${q.options.join(lang === 'en' ? ' / ' : '／')}`;
  return L[q.type];
}
const ZH_LABEL: Record<QType, string> = { short: '簡答', choice: '選擇題', checkbox: '核取方塊', scale: '線性刻度', paragraph: '詳答' };

/** 語系版的純文字題目清單（t 要先經 localizeTemplate）。 */
export function questionsAsTextL(t: QuickTemplate, lang: Lang): string {
  if (lang !== 'en') return '';
  const noScale = t.scaleLabels === NO_SCALE_EN;
  const lines = [`[${t.name}]${noScale ? '' : ` Scale ${t.scaleLabels}`}`];
  t.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.text}`);
    lines.push(`   ${questionHintL(q, t.scale, 'en')}`);
  });
  return lines.join('\n');
}

/** 英文版匯出欄位標題（第一欄 Timestamp 為 Google 欄位名稱，待核對）。 */
export function templateHeadersEn(t: QuickTemplate): string[] {
  return [TIMESTAMP_EN, ...localizeTemplate(t, 'en').questions.map((q) => q.text)];
}

/** 英文版範本轉成「已存設定」，供開啟英文表單匯出檔時比對（id 與繁中版相同）。 */
export function templateAsSurveyEn(t: QuickTemplate): SavedSurvey {
  const e = localizeTemplate(t, 'en');
  const mapping: Record<string, string[]> = { timestamp: [TIMESTAMP_EN] };
  for (const q of e.questions) (mapping[q.role] ??= []).push(q.text);
  return {
    id: `${TEMPLATE_ID_PREFIX}${t.id}`,
    name: e.name,
    kind: e.kind,
    sourceLabel: 'Excel file',
    headers: templateHeadersEn(t),
    mapping,
    labels: {},
    scale: e.scale,
    lastUsed: '',
    rowCount: 0,
    rosterId: null,
  };
}
