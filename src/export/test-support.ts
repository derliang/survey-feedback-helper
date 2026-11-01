// 輸出器測試共用：從 public/ 與 node_modules 讀字型與 wasm、虛構測試資料。只給測試用，不會被應用程式引用。
import { readFile } from 'node:fs/promises';
import type { FontSource } from '../fonts/loader';
import type { ClassSummaryInput, PersonalFeedbackInput } from './templates';

export const nodeFontSource: FontSource = {
  fetchFont: async () => new Uint8Array(await readFile('public/fonts/NotoSansTC-VF.woff2')),
  fetchWasm: async () => new Uint8Array(await readFile('node_modules/harfbuzzjs/dist/harfbuzz-subset.wasm')),
};

const SURNAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊'];
const GIVEN = ['語晴', '承翰', '子豪', '宜珊', '品妍', '家豪', '柏翰', '怡君', '冠廷', '雅婷'];
export const ITEMS = ['內容完整度', '表達清晰度', '創意與亮點', '時間掌控', '團隊合作'];

const PRAISE = [
  '報告架構清楚，從動機到結論一氣呵成，聽起來很舒服。',
  '投影片的圖片選得很用心，重點一眼就看得懂。',
  '聲音洪亮、語速適中，而且會看著同學說話，很有自信。',
];
const ADVICE = [
  '有幾頁的文字稍微多了一點，如果改成條列或圖表，會更容易吸收。',
  '部分專有名詞（像是 CO2 排放量與 GDP 成長率的關係）可以先簡單解釋一下。',
];

/** 可重現的虛構學生（全部虛構）。 */
export function fakeStudents(n: number): { seat: number; name: string; values: number[]; mean: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const values = ITEMS.map((_, d) => Math.round((6 + ((i * 7 + d * 3) % 40) / 10) * 10) / 10);
    return {
      seat: i + 1,
      name: SURNAMES[i % SURNAMES.length]! + GIVEN[(i * 3) % GIVEN.length]!,
      values,
      mean: values.reduce((a, b) => a + b, 0) / values.length,
    };
  });
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function fakeClassSummary(n = 35): ClassSummaryInput {
  const students = fakeStudents(n);
  return {
    school: '示範國中',
    className: '八年三班',
    topic: '分組專題報告',
    items: ITEMS,
    students,
    classMeans: ITEMS.map((_, d) => avg(students.map((s) => s.values[d]!))),
    classOverall: avg(students.map((s) => s.mean)),
  };
}

export function fakeFeedback(seat = 1, extraAdvice = 0): PersonalFeedbackInput {
  const sum = fakeClassSummary(35);
  const s = sum.students[seat - 1]!;
  return {
    school: sum.school,
    className: sum.className,
    topic: sum.topic,
    student: { seat: s.seat, name: s.name },
    scaleMax: 10,
    items: ITEMS.map((label, d) => ({ label, mine: s.values[d]!, classMean: sum.classMeans[d]! })),
    average: { mine: s.mean, classMean: sum.classOverall },
    praise: PRAISE,
    advice: [...ADVICE, ...Array.from({ length: extraAdvice }, (_, i) => ADVICE[i % ADVICE.length]!)],
    teacherComment: '整體表現穩定，期待你在下一次報告中展現更多個人風格。繼續保持認真的態度！',
  };
}

/** 罕用字與超長留言（全部虛構）：BMP 罕用字、超出 BMP 的字、簡體、假名、符號，以及超長無空白留言與超長英數串。 */
export const RARE_BMP = '堃喆峯鑫①㈱ありがとうカタカナ';
export const RARE_OUTSIDE_FONT = '𠮷𩸽这报한😀';
export function stressFeedback(): PersonalFeedbackInput {
  const base = fakeFeedback(2);
  const longPara = '這是一段沒有任何空白與換行的超長留言，'.repeat(40);
  return {
    ...base,
    student: { seat: 2, name: `陳${RARE_BMP.slice(0, 4)}` },
    praise: [`${RARE_BMP} ${RARE_OUTSIDE_FONT} 同學的報告很用心。`, longPara],
    advice: ['https://example.com/' + 'a1b2c3d4e5'.repeat(30), longPara + longPara],
    teacherComment: longPara,
  };
}
