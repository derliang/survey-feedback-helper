// 預設值（三層設定）與備份還原畫面的文字；依設計第六輪 A1～A3。
import { currentLang } from './locale';
import { backupStringsEn, defaultsStringsEn } from './strings-backup.en';
export const defaultsStrings = {
  title: '預設值',
  intro: '輸出時用的設定分三層，後面的層蓋過前面的：全域預設 → 問卷類型 → 這次輸出。',
  layers: { global: '全域預設', kind: '問卷類型', run: '這次輸出' },
  sources: { default: '內建預設', global: '全域預設', kind: '問卷類型範本', run: '這次輸出' },
  kinds: { feedback: '報告回饋', opinion: '意見調查', vote: '票選' },
  runNote: '這一層只對這一次輸出有效，不會存檔。',
  revert: '還原到上一層的值',
  current: '目前的值',
  fields: {
    school: '學校名稱',
    filenameRule: '檔名規則',
    keywords: '關鍵字提醒（用逗號分隔）',
  },
  toggles: {
    deidentify: '姓名換代號',
    showOthersNames: '顯示他人姓名',
    showRawComments: '附上原始留言',
    showClassCompare: '顯示班級比較',
  },
  versionLabel: '預設給誰看',
  versions: { teacher: '老師版', student: '學生版', parent: '家長版' },
  on: '開',
  off: '關',
} as const;

export const backupStrings = {
  title: '備份與還原',
  hasTitle: '備份裡有',
  has: '問卷設定、名單對照、審稿進度、各層設定、我的範本、個別學生版本、圖片。',
  notTitle: '備份裡沒有',
  not: '內建範本、原始作答的 Excel 檔。',
  warn: '備份檔含學生姓名，請依學校個資規範保管。',
  make: '下載整包備份',
  makeTouch: '儲存整包備份到檔案',
  pick: '選擇備份檔來還原',
  summaryTitle: '這份備份的內容（還沒改任何資料）',
  summary: (b: { surveys: number; rosters: number; templates: number; overrides: number; settingLayers: number; images: number }) =>
    `問卷設定 ${b.surveys} 份、名單 ${b.rosters} 份、我的範本 ${b.templates} 份、個別學生版本 ${b.overrides} 筆、設定欄位 ${b.settingLayers} 項、圖片 ${b.images} 張。`,
  migrated: '這是舊版（版本 1）備份，還原時會轉成新版格式，之後不能再用舊版程式開啟。',
  skipped: (n: number) => `有 ${n} 份範本損壞，已略過。`,
  modeTitle: '還原方式',
  merge: '合併進目前的資料',
  mergeNote: '目前已有的都保留，只補上備份裡有、目前沒有的。',
  replace: '取代目前的資料',
  replaceNote: '目前的資料會被備份內容換掉。取代前會先自動下載一份目前資料的備份。',
  go: '還原',
  cancel: '取消',
  done: '已還原。',
  doneReplace: '已還原，並先下載了目前資料的備份。',
  bad: '這不是備份檔，或檔案壞了。',
} as const;

// 依目前介面語言取字串（呼叫時才取值）。
export const defaultsText = (): typeof defaultsStrings => (currentLang() === 'en' ? (defaultsStringsEn as unknown as typeof defaultsStrings) : defaultsStrings);
export const backupText = (): typeof backupStrings => (currentLang() === 'en' ? (backupStringsEn as unknown as typeof backupStrings) : backupStrings);
