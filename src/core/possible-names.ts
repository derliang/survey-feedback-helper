import { normalizeName } from './text';

/**
 * 「可能含名單外人名」偵測：只標示、不遮蔽（學生版／家長版輸出前的提醒與預覽用）。
 * 規則與取捨見 docs/decisions/2026-11-01-去識別化名單外人名偵測.md。
 */

/** 常見單姓（自編，約 110 個，涵蓋臺灣常見姓氏；不求完整，漏的由老師預覽把關）。 */
export const SURNAMES: readonly string[] = [
  ...'陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴徐周葉蘇莊呂江何蕭羅高潘簡朱鍾彭游詹胡施沈余盧梁趙顏柯翁魏孫戴范方宋鄧杜傅侯曹薛丁卓馬阮董溫唐藍石蔣古紀姚連馮歐程湯田康姜白汪鄒尤巫鐘黎涂龔嚴韓袁金童陸夏柳凃邵錢孔任秦段龍',
];

/** 常見複姓。 */
export const COMPOUND_SURNAMES: readonly string[] = ['歐陽', '司馬', '諸葛', '上官', '范姜', '張簡', '司徒', '東方', '皇甫', '夏侯', '公孫', '慕容'];

/** 接在姓名後（或單獨接在姓氏後）的稱謂。 */
export const TITLES: readonly string[] = [
  '同學', '老師', '先生', '小姐', '女士', '學長', '學姐', '學弟', '學妹', '班長', '副班長', '組長', '教官', '主任', '校長', '助教', '媽媽', '爸爸', '阿姨', '叔叔', '伯伯', '同志',
];

/** 放在姓名前的稱謂（「班長王小明」「同學陳小華」）。 */
const PREFIX_TITLES: readonly string[] = ['同學', '班長', '副班長', '組長', '老師', '學長', '學姐', '學弟', '學妹', '教官', '主任', '校長'];

/** 暱稱前綴：小王、老李。 */
const NICK_PREFIXES: readonly string[] = ['小', '老'];

/** 暱稱後面可接的常見虛字（小林很認真）；接其他漢字多半是詞（小王子）。 */
const NICK_FOLLOWERS = '很是說的也都有在會真好最還又就才被把跟和與來去到';

/**
 * 以姓氏開頭、但其實是一般詞彙的字首（三字詞若以這些開頭，不當成人名）。
 * 只影響「沒有稱謂、單靠姓氏＋兩字」的低信心判斷。
 */
export const NOT_A_NAME_PREFIXES: readonly string[] = [
  '高興', '高中', '高三', '高度', '高分', '高低', '馬上', '馬路', '方法', '方便', '方向', '方式', '方面', '白天', '白色', '白板', '金額', '金錢', '金色', '石頭',
  '江山', '田野', '田徑', '許多', '許可', '陳述', '陳列', '何況', '何必', '何時', '任何', '任務', '任意', '程式', '程度', '溫度', '溫暖', '溫柔', '謝謝', '董事',
  '段落', '龍舟', '夏天', '古代', '古早', '紀錄', '紀念', '姜餅', '孔子', '周圍', '周末', '周邊', '朱紅', '連續', '連結', '連忙', '唐代', '湯圓', '湯匙', '康復',
  '林間', '李子', '羅馬', '施工', '施行', '沈默', '沈重', '侯選', '傅統', '余下', '丁點', '卓越', '范圍', '潘朵', '游泳', '游戲', '游玩', '黎明', '袁世', '嚴格',
  '嚴重', '嚴肅', '韓文', '韓國', '金融', '金牌', '金屬', '童年', '童話', '陸續', '陸地', '蔣介', '汪洋', '柳樹', '柳丁', '尤其', '尤其是', '任何人', '彭湖',
];

export type PossibleNameKind = 'titled' | 'nickname' | 'bare';

export interface PossibleName {
  /** 在原文中的區間 [start, end)。 */
  start: number;
  end: number;
  text: string;
  /** titled：姓氏（＋名）接稱謂或前有稱謂；nickname：小王、老李；bare：只有「姓氏＋兩字」，較易誤判。 */
  kind: PossibleNameKind;
  /** high＝titled、nickname；low＝bare。 */
  level: 'high' | 'low';
}

const HAN = /\p{Script=Han}/u;
const isHan = (ch: string | undefined): boolean => ch !== undefined && HAN.test(ch);

function surnameAt(text: string, i: number): string | null {
  for (const s of COMPOUND_SURNAMES) if (text.startsWith(s, i)) return s;
  const ch = text[i];
  return ch !== undefined && SURNAMES.includes(ch) ? ch : null;
}

function titleAt(text: string, i: number): string | null {
  let best: string | null = null;
  for (const t of TITLES) if (text.startsWith(t, i) && (best === null || t.length > best.length)) best = t;
  return best;
}

function prefixTitleEndingAt(text: string, i: number): boolean {
  return PREFIX_TITLES.some((t) => i >= t.length && text.slice(i - t.length, i) === t);
}

/**
 * 找出文字中可能是人名的片段。
 * - knownNames：名單內的姓名（含已被換成代號前的原名）；與之重疊的片段不回報。
 * - includeLow：是否連「只有姓氏＋兩字」的低信心片段一起回報（預設要；UI 可只標 high）。
 * 結果依出現位置排序、彼此不重疊。
 */
export function findPossibleNames(text: string, opts: { knownNames?: readonly string[]; includeLow?: boolean } = {}): PossibleName[] {
  const known = (opts.knownNames ?? []).map((n) => normalizeName(n)).filter((n) => n.length >= 2);
  const knownSpans: [number, number][] = [];
  for (const k of known) {
    let at = text.indexOf(k);
    while (at >= 0) {
      knownSpans.push([at, at + k.length]);
      at = text.indexOf(k, at + k.length);
    }
  }
  const overlapsKnown = (s: number, e: number) => knownSpans.some(([a, b]) => s < b && a < e);

  const out: PossibleName[] = [];
  let i = 0;
  while (i < text.length) {
    // 暱稱：小王、老李（後面不再接漢字，或直接接稱謂，避免「小王子」「老李白」類誤判）
    const nick = NICK_PREFIXES.find((p) => text.startsWith(p, i));
    if (nick !== undefined) {
      const s = surnameAt(text, i + nick.length);
      if (s !== null) {
        const end = i + nick.length + s.length;
        const next = text[end];
        if ((!isHan(next) || NICK_FOLLOWERS.includes(next as string) || titleAt(text, end) !== null) && !overlapsKnown(i, end)) {
          out.push({ start: i, end, text: text.slice(i, end), kind: 'nickname', level: 'high' });
          i = end;
          continue;
        }
      }
    }
    const surname = surnameAt(text, i);
    if (surname === null) {
      i++;
      continue;
    }
    const after = i + surname.length;
    const prefixed = prefixTitleEndingAt(text, i);
    let hit: PossibleName | null = null;
    // 姓氏＋名（0～2 字）＋稱謂；名字長度由長到短試，優先吃最長
    for (const given of [2, 1, 0]) {
      const nameEnd = after + given;
      if (given > 0 && ![...text.slice(after, nameEnd)].every(isHan)) continue;
      if (nameEnd > text.length) continue;
      const t = titleAt(text, nameEnd);
      if (t !== null && !(given > 0 && NOT_A_NAME_PREFIXES.some((p) => text.startsWith(p, i)))) {
        hit = { start: i, end: nameEnd + t.length, text: text.slice(i, nameEnd + t.length), kind: 'titled', level: 'high' };
        break;
      }
    }
    if (hit === null && prefixed) {
      // 前面有稱謂：「班長王小明」，名字 2 字優先、其次 1 字（後面要是標點或結尾才算數）
      for (const given of [2, 1]) {
        const nameEnd = after + given;
        if (nameEnd <= text.length && [...text.slice(after, nameEnd)].every(isHan) && !isHan(text[nameEnd])) {
          hit = { start: i, end: nameEnd, text: text.slice(i, nameEnd), kind: 'titled', level: 'high' };
          break;
        }
      }
    }
    if (hit === null && opts.includeLow !== false) {
      const nameEnd = after + 2;
      const word = text.slice(i, nameEnd);
      if (nameEnd <= text.length && [...text.slice(after, nameEnd)].every(isHan) && surname.length === 1 && !NOT_A_NAME_PREFIXES.some((p) => word.startsWith(p) || text.startsWith(p, i))) {
        hit = { start: i, end: nameEnd, text: word, kind: 'bare', level: 'low' };
      }
    }
    if (hit !== null && !overlapsKnown(hit.start, hit.end)) {
      out.push(hit);
      i = hit.end;
    } else {
      i++;
    }
  }
  return out;
}

export interface FlaggedText {
  /** 對應輸入陣列的索引。 */
  index: number;
  hits: PossibleName[];
}

/** 對多則留言逐則偵測，只回傳有命中的（供「逐則預覽」把可疑留言排前面或標記）。 */
export function flagPossibleNames(texts: readonly string[], opts: { knownNames?: readonly string[]; includeLow?: boolean } = {}): FlaggedText[] {
  const flagged: FlaggedText[] = [];
  texts.forEach((t, index) => {
    const hits = findPossibleNames(t, opts);
    if (hits.length > 0) flagged.push({ index, hits });
  });
  return flagged;
}
