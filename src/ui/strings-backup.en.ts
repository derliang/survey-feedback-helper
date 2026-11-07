// 英文版：預設值（三層設定）與備份還原畫面。鍵與 strings-backup.ts 完全一致（測試會比對）。
import type { backupStrings, defaultsStrings } from './strings-backup';

type Widen<T> = T extends string ? string : T extends (...a: infer A) => infer R ? (...a: A) => R : { [K in keyof T]: Widen<T[K]> };

export const defaultsStringsEn: Widen<typeof defaultsStrings> = {
  title: 'Defaults',
  intro: 'Output settings come in three layers, and each later layer overrides the earlier ones: global defaults → survey type → this output.',
  layers: { global: 'Global defaults', kind: 'Survey type', run: 'This output' },
  sources: { default: 'Built-in default', global: 'Global defaults', kind: 'Survey-type template', run: 'This output' },
  kinds: { feedback: 'Presentation feedback', opinion: 'Opinion survey', vote: 'Election' },
  runNote: 'This layer only applies to this one output and is not saved.',
  revert: 'Revert to the previous layer’s value',
  current: 'Current value',
  fields: {
    school: 'School name',
    filenameRule: 'File name rule',
    keywords: 'Keyword alerts (separate with commas)',
  },
  toggles: {
    deidentify: 'Replace names with codes',
    showOthersNames: 'Show other people’s names',
    showRawComments: 'Include original comments',
    showClassCompare: 'Show class comparison',
  },
  versionLabel: 'Default audience',
  versions: { teacher: 'Teacher version', student: 'Student version', parent: 'Parent version' },
  on: 'On',
  off: 'Off',
};

export const backupStringsEn: Widen<typeof backupStrings> = {
  title: 'Backup and restore',
  hasTitle: 'The backup contains: ',
  has: 'survey settings, roster matches, review progress, settings of every layer, my templates, individual student versions, images.',
  notTitle: 'The backup does not contain: ',
  not: 'built-in templates and the original Excel files with the answers.',
  warn: 'The backup file contains student names. Keep it according to your school’s privacy rules.',
  make: 'Download full backup',
  makeTouch: 'Save full backup to a file',
  pick: 'Choose a backup file to restore',
  summaryTitle: 'What is in this backup (nothing has been changed yet)',
  summary: (b) => `${b.surveys} survey setting(s), ${b.rosters} roster(s), ${b.templates} of my templates, ${b.overrides} individual student version(s), ${b.settingLayers} setting field(s), ${b.images} image(s).`,
  migrated: 'This is an old (version 1) backup. It will be converted to the new format when restored, and older versions of the app can no longer open it afterwards.',
  skipped: (n) => `${n} template(s) were damaged and skipped.`,
  modeTitle: 'How to restore',
  merge: 'Merge into current data',
  mergeNote: 'Everything you have now is kept; only what is in the backup but missing now is added.',
  replace: 'Replace current data',
  replaceNote: 'Your current data is replaced by the backup. A backup of your current data is downloaded automatically first.',
  go: 'Restore',
  cancel: 'Cancel',
  done: 'Restored.',
  doneReplace: 'Restored, and a backup of the previous data was downloaded first.',
  bad: 'This is not a backup file, or the file is damaged.',
};
