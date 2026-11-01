// 介面偏好（只存在這個瀏覽器；不放任何作答資料或名單）
export type Theme = 'auto' | 'light' | 'dark';

export type Lang = 'zh' | 'en';

export interface Prefs {
  theme: Theme;
  /** 介面語言；預設繁體中文。 */
  lang: Lang;
  /** 已按過「知道了」的提示。 */
  dismissed: string[];
  /** 雲端自動備份（預設關，需老師明確同意；DESIGN.md 5.28）。 */
  cloudBackup: boolean;
}

const KEY = 'sfh-prefs';

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
    return {
      theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'auto',
      lang: raw.lang === 'en' ? 'en' : 'zh',
      dismissed: Array.isArray(raw.dismissed) ? raw.dismissed.filter((x): x is string => typeof x === 'string') : [],
      cloudBackup: raw.cloudBackup === true,
    };
  } catch {
    return { theme: 'auto', lang: 'zh', dismissed: [], cloudBackup: false };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 無痕模式或被封鎖時略過 */
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
