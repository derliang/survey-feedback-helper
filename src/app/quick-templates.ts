// 快速範本（R-009）：題目清單草稿 + 匯出後的預設值（問卷類型、欄位用途、量表範圍）。
// 題目全文見 docs/design/快速範本草稿.md（使用者 2026-11-01 裁示照草稿定稿；班規議題票選歸「票選幹部」類型）。
// 題型名稱（簡答、選擇題、核取方塊、線性刻度、詳答）是 Google 表單的介面字樣，2026-11-07 已在繁中介面核對（docs/design/Google介面核對紀錄.md；原寫「段落」，實際是「詳答」）；畫面上的「待核對」標籤暫時保留，是否撤掉由設計員決定。
// 範本不含任何學生資料；老師照題目在 Google 表單建好、匯出 Excel 後，開啟時標題相符就自動帶入欄位對應。
import type { SavedSurvey, SurveyKind } from '../storage';

export type QType = 'short' | 'choice' | 'checkbox' | 'scale' | 'paragraph';

export interface TplQuestion {
  /** 題目文字，也就是匯出後試算表的欄位標題。 */
  text: string;
  type: QType;
  /** 選擇題與核取方塊的選項。 */
  options?: string[];
  role: 'respondentClass' | 'respondentSeat' | 'respondentName' | 'score' | 'choice' | 'comment';
}

export interface QuickTemplate {
  id: string;
  name: string;
  purpose: string;
  kind: SurveyKind;
  /** 對象標籤。 */
  audience: string;
  /** 是否具名（有班級、座號、姓名三題）。 */
  named: boolean;
  scale: { min: number; max: number };
  /** 量表兩端文字，例如「非常不滿意～非常滿意」。 */
  scaleLabels: string;
  questions: TplQuestion[];
  /** 預設圖表／做法的一句說明。 */
  defaults: string;
  /** 提醒（可省略）。 */
  note?: string;
}

const WHO: TplQuestion[] = [
  { text: '班級', type: 'short', role: 'respondentClass' },
  { text: '座號', type: 'short', role: 'respondentSeat' },
  { text: '姓名', type: 'short', role: 'respondentName' },
];
const S = (text: string): TplQuestion => ({ text, type: 'scale', role: 'score' });
const C = (text: string, options: string[]): TplQuestion => ({ text, type: 'choice', options, role: 'choice' });
const X = (text: string, options: string[]): TplQuestion => ({ text, type: 'checkbox', options, role: 'choice' });
const P = (text: string): TplQuestion => ({ text, type: 'paragraph', role: 'comment' });

export const QUICK_TEMPLATES: readonly QuickTemplate[] = [
  {
    id: 'activity',
    name: '活動滿意度',
    purpose: '遠足、校慶、營隊、班級活動後，了解大家滿不滿意。',
    kind: 'opinion',
    audience: '學生或參加者',
    named: false,
    scale: { min: 1, max: 5 },
    scaleLabels: '1 非常不滿意～5 非常滿意',
    questions: [
      S('整體來說，我對這次活動感到滿意'),
      S('活動內容有趣、有收穫'),
      S('時間與流程安排得宜'),
      S('場地與準備工作讓我覺得舒服'),
      S('我願意再參加類似的活動'),
      P('最喜歡的部分與可以更好的地方'),
    ],
    defaults: '以圖表看各題量表分布；開放題留言逐則列出。匿名，不放姓名題。',
  },
  {
    id: 'parent',
    name: '家長意見',
    purpose: '班親會、聯絡簿、親師溝通方式的意見。',
    kind: 'opinion',
    audience: '家長',
    named: false,
    scale: { min: 1, max: 5 },
    scaleLabels: '1 非常不同意～5 非常同意',
    questions: [
      S('我清楚了解孩子在班上的學習狀況'),
      S('班級聯絡方式（通知、聯絡簿）讓我方便掌握訊息'),
      S('我覺得老師重視孩子的個別需求'),
      C('我希望班親會或聯繫的頻率', ['更常', '維持', '更少']),
      X('最希望老師多協助的方面', ['學習', '生活', '人際', '情緒', '其他']),
      P('還有什麼想對老師說的'),
    ],
    defaults: '第 1～3 題看量表分布；第 4 題統計各選項人數；第 5 題統計複選結果（比例以有作答人數為分母）。',
    note: '留言可能寫到孩子或其他家長的名字，輸出前請依去識別化提醒逐則預覽。',
  },
  {
    id: 'teaching',
    name: '教學回饋',
    purpose: '期中、期末的課堂教學意見。',
    kind: 'opinion',
    audience: '學生',
    named: false,
    scale: { min: 1, max: 5 },
    scaleLabels: '1 非常不同意～5 非常同意',
    questions: [
      S('老師上課的重點清楚'),
      S('上課的步調我跟得上'),
      S('作業的份量與難度適中'),
      S('我敢在課堂上提問或發言'),
      X('最有幫助的課堂活動', ['講解', '分組討論', '練習題', '報告發表', '其他']),
      P('希望老師繼續的一件事'),
      P('希望老師調整的一件事'),
    ],
    defaults: '以圖表比較各題量表分布；若含班級欄位，可再比較不同班級。',
    note: '這是對老師本人的意見，給學生看的版本只放彙整。',
  },
  {
    id: 'selfeval',
    name: '學習自評',
    purpose: '單元結束後，學生自我評估。',
    kind: 'opinion',
    audience: '學生自己',
    named: true,
    scale: { min: 1, max: 5 },
    scaleLabels: '1 完全不是這樣～5 完全是這樣',
    questions: [
      ...WHO,
      S('我能用自己的話說明這個單元的重點'),
      S('我完成了老師交代的練習'),
      S('我有遇到不懂的地方會想辦法弄懂'),
      S('我和同學合作得很順利'),
      P('這個單元我進步最多的地方'),
      P('我接下來想加強的地方'),
    ],
    defaults: '個人回饋單可比較個人與全班平均；不同單元可透過歷次趨勢比較。',
  },
  {
    id: 'signup',
    name: '報名點名清點',
    purpose: '活動報名、秋遊參加與否、統購清點。不是量表，沒有評分。',
    kind: 'opinion',
    audience: '學生或家長',
    named: true,
    scale: { min: 1, max: 5 },
    scaleLabels: '沒有量表',
    questions: [...WHO, C('是否參加', ['參加', '不參加']), P('備註（例如飲食禁忌）')],
    defaults: '可使用名單對照查看未回覆人員，並統計參與人數；這份範本沒有量表，不會計算平均分數。',
  },
  {
    id: 'classrule',
    name: '班規議題票選',
    purpose: '班規修正案、班級活動主題、座位排法等，每個議題各投一票。',
    kind: 'vote',
    audience: '學生',
    named: true,
    scale: { min: 1, max: 5 },
    scaleLabels: '沒有量表',
    questions: [...WHO, C('議題一的立場', ['贊成', '反對', '沒意見']), C('議題二的立場', ['贊成', '反對', '沒意見'])],
    defaults: '類型是「票選幹部」，每個議題當成一個「職位」，選項是贊成、反對、沒意見。防弊檢查照常；自投不適用；同票處理預設「老師指定」。有幾個議題就加幾題。',
  },
];

export const QTYPE_LABEL: Record<QType, string> = {
  short: '簡答',
  choice: '選擇題',
  checkbox: '核取方塊',
  scale: '線性刻度',
  paragraph: '詳答',
};

export function quickTemplate(id: string): QuickTemplate | undefined {
  return QUICK_TEMPLATES.find((t) => t.id === id);
}

/** 單題的說明，例如「線性刻度 1～5」「選擇題：更常／維持／更少」。 */
export function questionHint(q: TplQuestion, scale: { min: number; max: number }): string {
  if (q.type === 'scale') return `${QTYPE_LABEL.scale} ${scale.min}～${scale.max}`;
  if (q.options) return `${QTYPE_LABEL[q.type]}：${q.options.join('／')}`;
  return QTYPE_LABEL[q.type];
}

/** 純文字題目清單（貼進 Google 表單用）：一題一行加縮排的題型說明。 */
export function questionsAsText(t: QuickTemplate): string {
  const lines = [`【${t.name}】${t.scaleLabels === '沒有量表' ? '' : `量表 ${t.scaleLabels}`}`.trimEnd()];
  t.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.text}`);
    lines.push(`   ${questionHint(q, t.scale)}`);
  });
  return lines.join('\n');
}

/** 匯出後的欄位標題（第一欄是 Google 表單固定的「時間戳記」）。 */
export function templateHeaders(t: QuickTemplate): string[] {
  return ['時間戳記', ...t.questions.map((q) => q.text)];
}

export const TEMPLATE_ID_PREFIX = 'tpl-';

/** 把範本變成「已存設定」的樣子，讓開啟檔案時走同一套「是不是之前的問卷」比對。 */
export function templateAsSurvey(t: QuickTemplate): SavedSurvey {
  const mapping: Record<string, string[]> = { timestamp: ['時間戳記'] };
  for (const q of t.questions) (mapping[q.role] ??= []).push(q.text);
  return {
    id: `${TEMPLATE_ID_PREFIX}${t.id}`,
    name: t.name,
    kind: t.kind,
    sourceLabel: 'Excel 檔',
    headers: templateHeaders(t),
    mapping,
    labels: {},
    scale: t.scale,
    lastUsed: '',
    rowCount: 0,
    rosterId: null,
  };
}
