// English interface (skeleton, v1.0). Loaded on demand when the user picks English; any key not listed here falls back to Traditional Chinese.
// Google Forms / Sheets / Excel menu names are NOT translated here: they must be checked against the real English interface first (hard rule 10).
import { mergeStrings, type DeepPartial, type Strings } from './locale';
import { enMore } from './strings.en.more';

const enCore: DeepPartial<Strings> = {
  appName: 'Survey Feedback Helper',
  steps: ['Open survey', 'Prepare data', 'Statistics', 'Output'],
  restart: 'Start over',
  settings: 'Settings',
  settingsUnsaved: 'Settings (changed, not saved yet)',
  back: 'Back',
  close: 'Close',
  cancel: 'Cancel',
  apply: 'Apply',
  gotIt: 'Got it',
  privacy: [
    'There is no server. Survey results are processed only in this browser.',
    'Settings and rosters are stored in the folder you choose.',
    'Files you keep in the cloud are handled by that service.',
  ],
  home: {
    title: 'Which survey are we working on today?',
    lead: 'Drop in an Excel file.',
    drop: 'Drop an Excel file here',
    dropOr: 'or use the buttons below',
    pickFile: 'Choose Excel file',
    openConfig: 'Open settings file',
    recent: 'Recent surveys',
    recentEmpty: 'No recent surveys yet. Surveys you have processed will appear here.',
    autoFill: 'Auto-filled after choosing the file',
    kindNames: { vote: 'Election', opinion: 'Opinion survey', feedback: 'Presentation feedback', course: 'Course sign-up' },
  },
  home2: {
    templates: 'Use a quick template',
    guide: 'How to design a Google Form',
  },
  folder: {
    label: 'Folder: ',
    connected: 'Connected',
    none: 'Not chosen yet',
    choose: 'Choose folder',
    chooseFolder: 'Choose folder',
    repick: 'Choose another folder',
    download: 'Download settings file',
    dirtyTitle: 'Settings changed, not saved yet',
  },
  stats: {
    saveImage: 'Save image (JPG)',
    saveImageFailed: 'This browser cannot create the image. Please take a screenshot instead.',
  },
  settingsPage: {
    title: 'Settings',
    privacyTitle: 'Where your data goes',
    theme: 'Appearance',
    themes: { auto: 'Follow system', light: 'Light', dark: 'Dark' },
    folderTitle: 'Folder',
    forget: 'Forget this folder',
    language: 'Language',
    offlineTitle: 'Offline use',
    offlineBody:
      'After you open the app once while online, it is kept in this browser and opens without a network. Output fonts are kept only after you have produced an output once. Survey data is never stored in the browser.',
    shortcutsTitle: 'Keyboard',
    shortcutsBody: 'Tab / Shift+Tab move between buttons, Enter or Space presses, Esc closes a panel. The first Tab on a page is "Skip to main content".',
  },
};

/** 英文介面 = 主要畫面骨架（本檔）＋其餘畫面（strings.en.more.ts）。 */
export const en: DeepPartial<Strings> = mergeStrings(enCore, enMore);
