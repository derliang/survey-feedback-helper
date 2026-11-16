// 常用評語內建六類的英文版（句子與 phrases.ts 的 DEFAULT_PHRASES 一一對應，id 相同、順序相同）。
// 只在英文介面且老師還沒自訂評語庫時使用；老師自己存過的評語不翻。{姓名} 是程式替換用的佔位字，英文句子保留它。
import type { PhraseCategory } from '../storage';

const P = (title: string, text: string) => ({ title, text });

export const DEFAULT_PHRASES_EN: readonly PhraseCategory[] = [
  {
    id: 'effort',
    name: 'Praise effort and attitude',
    phrases: [
      P('Well prepared', '{姓名} prepared with great care; it is clear a lot of time went into this.'),
      P('Keeps improving', '{姓名} improves a little more each time. Keep it up.'),
      P('Responsible', '{姓名} took real responsibility for this report, which deserves recognition.'),
      P('Persistent', '{姓名} did not give up when things got difficult, which is great.'),
      P('On time', '{姓名} finished on time, so everyone could proceed smoothly.'),
    ],
  },
  {
    id: 'result',
    name: 'Praise performance and results',
    phrases: [
      P('Rich content', '{姓名}\'s content is substantial and the key points are clear.'),
      P('Well organized', '{姓名}\'s report is well organized and easy to follow.'),
      P('Own ideas', '{姓名} shared personal views instead of only repeating the material.'),
      P('Good design', '{姓名}\'s slides are clean and the charts are easy to understand.'),
      P('Vivid examples', '{姓名} used vivid examples that left a strong impression.'),
    ],
  },
  {
    id: 'improve',
    name: 'Specific suggestions',
    phrases: [
      P('More examples', '{姓名} could add one more example next time to make the content more concrete.'),
      P('Watch the time', '{姓名} ran a bit short on time; next time, plan the length of each part first.'),
      P('Speak louder', '{姓名} could speak a little louder so the back rows can hear clearly.'),
      P('Less reading', '{姓名} could try reading the script less and looking at classmates more.'),
      P('Share feelings', '{姓名} could say a bit more about how it felt to read this.'),
    ],
  },
  {
    id: 'encourage',
    name: 'Encouragement and expectations',
    phrases: [
      P('Keep going', 'Keep it up, {姓名}; I look forward to your next performance.'),
      P('Believe in yourself', '{姓名} actually did very well and should believe in themselves more.'),
      P('Be brave', 'I hope {姓名} will bravely try different approaches.'),
      P('Stay passionate', 'If {姓名} keeps this passion, things will only get better.'),
      P('Great potential', 'I see {姓名}\'s potential. Let us move forward together.'),
    ],
  },
  {
    id: 'team',
    name: 'Teamwork and relationships',
    phrases: [
      P('Great teamwork', '{姓名} worked well with teammates, with clear division of tasks.'),
      P('Good listener', '{姓名} listens to others\' opinions, which makes discussions go smoothly.'),
      P('Helps others', '{姓名} proactively helps classmates, which is heartwarming.'),
      P('Responsible', '{姓名} shows a strong sense of responsibility in the group.'),
      P('Clear communication', '{姓名} communicates clearly without hurting others.'),
    ],
  },
  {
    id: 'speak',
    name: 'Expression and presentation',
    phrases: [
      P('Willing to speak', '{姓名} spoke up in front of the class, which is not an easy step.'),
      P('Clear voice', '{姓名} speaks clearly with steady pronunciation.'),
      P('Stage presence', '{姓名} has steady stage presence; practice is clearly visible.'),
      P('Interactive', '{姓名} interacted with the audience and kept everyone engaged.'),
      P('Strong ending', '{姓名}\'s conclusion was clear and powerful, hitting the key points at once.'),
    ],
  },
];
