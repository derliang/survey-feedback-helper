// 文件模型：一份 JSON 風格的區塊清單，PDF 與 Word 輸出器都只讀它。
// 全部資料皆為虛構。

export const PAGE = { w: 595.28, h: 841.89, mx: 56.7, mt: 56.7, mb: 70, footerFromBottom: 30 };
export const CONTENT_W = PAGE.w - PAGE.mx * 2;

// 可重現的亂數
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const SURNAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪'];
const GIVEN = ['語晴', '承翰', '子豪', '宜珊', '品妍', '家豪', '柏翰', '怡君', '冠廷', '雅婷', '哲瑋', '欣妤', '宥騰', '思妤', '彥廷'];

const DIMENSIONS = ['內容完整度', '表達清晰度', '創意與亮點', '時間掌控', '團隊合作'];

const PRAISE = [
  '報告架構清楚，從動機到結論一氣呵成，聽起來很舒服。',
  '投影片的圖片選得很用心，重點一眼就看得懂，尤其是第三頁的比較圖。',
  '聲音洪亮、語速適中，而且會看著同學說話，很有自信。',
  '舉的例子很貼近我們的生活，讓抽象的概念變得好理解。',
  '資料來源有標示，態度很嚴謹。',
  '結尾的小問答很有趣，帶動了全班一起思考。',
];
const ADVICE = [
  '有幾頁的文字稍微多了一點，如果改成條列或圖表，會更容易吸收。',
  '時間有點緊，最後的結論講得比較快，建議下次把前面的背景再精簡一些。',
  '可以多一點和台下同學的互動，例如提問或舉手，氣氛會更熱絡。',
  '部分專有名詞（像是 CO2 排放量與 GDP 成長率的關係）可以先簡單解釋一下，聽眾會更容易跟上。',
  '請注意站姿，不要一直背對大家看螢幕，轉過來面對同學會更好。',
];

export function makeStudents(n, seed = 7) {
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const students = [];
  for (let i = 1; i <= n; i++) {
    const scores = DIMENSIONS.map(() => Math.round((3 + r() * 2) * 10) / 10);
    // 少數學生留言特別多，用來測分頁
    const nPraise = 2 + Math.floor(r() * 3);
    const nAdvice = 1 + Math.floor(r() * 3) + (i % 9 === 0 ? 6 : 0);
    students.push({
      seat: i,
      name: pick(SURNAMES) + pick(GIVEN),
      scores,
      praise: Array.from({ length: nPraise }, () => pick(PRAISE)),
      advice: Array.from({ length: nAdvice }, () => pick(ADVICE)),
      teacherComment: '整體表現穩定，期待你在下一次報告中展現更多個人風格。繼續保持認真的態度！',
    });
  }
  return students;
}

export const CLASS_INFO = { school: '示範國中', className: '八年三班', topic: '分組專題報告', dimensions: DIMENSIONS };

export function classAverages(students) {
  return DIMENSIONS.map((_, d) => students.reduce((s, st) => s + st.scores[d], 0) / students.length);
}

const fmt = (n) => n.toFixed(1);
export function vars(text, v) {
  return text.replace(/\{([^{}]+)\}/g, (_, k) => String(v[k] ?? ''));
}

// 建立某位學生的文件模型。chartPng 是已畫好的長條圖（PNG）。
export function buildDoc(student, avgs, chartPng) {
  const v = { 姓名: student.name, 座號: student.seat, 班級: CLASS_INFO.className, 主題: CLASS_INFO.topic };
  const mine = student.scores.reduce((a, b) => a + b, 0) / student.scores.length;
  const cls = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const blocks = [
    { type: 'heading', text: vars('{姓名} 的報告回饋單', v), size: 22, color: '#1f4e79', after: 4 },
    { type: 'text', text: vars('{班級} {座號} 號｜{主題}', v), size: 11, color: '#5b6b7b', after: 12 },
    {
      type: 'text',
      text: `同學們這次一共給了你 ${fmt(mine)} 分（滿分 5 分），班級平均為 ${fmt(cls)} 分。以下是各向度的表現與同學們的留言，請慢慢看。`,
      size: 11,
      color: '#222222',
      after: 10,
    },
    { type: 'heading', text: '各向度評分', size: 14, color: '#1f4e79', before: 6, after: 6 },
    {
      type: 'table',
      widths: [190, 100, 100, 57.58],
      header: ['向度', '你的平均', '班級平均', '差距'],
      rows: CLASS_INFO.dimensions.map((d, i) => [
        d,
        fmt(student.scores[i]),
        fmt(avgs[i]),
        (student.scores[i] - avgs[i] >= 0 ? '+' : '') + fmt(student.scores[i] - avgs[i]),
      ]),
      rowH: 24,
      size: 10.5,
      after: 12,
    },
    { type: 'image', png: chartPng, w: 440, h: 190, after: 12 },
    { type: 'heading', text: '同學的優點回饋', size: 14, color: '#1f4e79', before: 6, after: 6 },
    { type: 'bullets', items: student.praise, size: 11, after: 10 },
    { type: 'heading', text: '同學的建議', size: 14, color: '#1f4e79', before: 6, after: 6 },
    { type: 'bullets', items: student.advice, size: 11, after: 10 },
    { type: 'heading', text: '老師的話', size: 14, color: '#1f4e79', before: 6, after: 6 },
    { type: 'text', text: student.teacherComment, size: 11, color: '#222222', after: 0 },
  ];
  return { blocks, footerText: `${CLASS_INFO.school} ${CLASS_INFO.className}｜${student.name}`, lineH: 18 };
}
