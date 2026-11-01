// 三層設定：全域預設 → 問卷類型範本 → 單次覆寫。後面的層蓋過前面的，只蓋有設的欄位。
import type { ReportVersion } from './types';

export interface ReportSettings {
  school: string;
  version: ReportVersion;
  templateId: string;
  /** 檔名規則，例如 `{班級}_{座號}_{姓名}_回饋單`。 */
  filenameRule: string;
  /** 姓名換代號。 */
  deidentify: boolean;
  /** 是否顯示他人姓名（預設匿名）。 */
  showOthersNames: boolean;
  showRawComments: boolean;
  showClassCompare: boolean;
  /** 關鍵字提醒清單。 */
  keywords: string[];
}

export const DEFAULT_SETTINGS: ReportSettings = {
  school: '',
  version: 'teacher',
  templateId: '',
  filenameRule: '{班級}_{座號}_{姓名}_回饋單',
  deidentify: false,
  showOthersNames: false,
  showRawComments: false,
  showClassCompare: true,
  keywords: [],
};

export type Layer = 'global' | 'kind' | 'run';
export interface SettingsLayers {
  global: Partial<ReportSettings>;
  /** 問卷類型範本：key 是問卷類型（feedback／opinion／vote）。 */
  byKind: Record<string, Partial<ReportSettings>>;
  /** 單次覆寫：只對這一次輸出有效，不存檔。 */
  run: Partial<ReportSettings>;
}

export const emptyLayers = (): SettingsLayers => ({ global: {}, byKind: {}, run: {} });

/** 合併三層；same 欄位後者蓋前者。undefined 視為沒設。 */
export function resolveSettings(l: SettingsLayers, kind: string): ReportSettings {
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const layer of [l.global, l.byKind[kind] ?? {}, l.run]) {
    for (const [k, v] of Object.entries(layer)) if (v !== undefined) out[k] = v;
  }
  return out as unknown as ReportSettings;
}

/** 每個欄位目前的值來自哪一層（設定畫面標「來自問卷類型範本」用）。沒有人設過回傳 'default'。 */
export function settingSources(l: SettingsLayers, kind: string): Record<keyof ReportSettings, Layer | 'default'> {
  const out = {} as Record<keyof ReportSettings, Layer | 'default'>;
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof ReportSettings)[]) {
    out[k] = l.run[k] !== undefined ? 'run' : l.byKind[kind]?.[k] !== undefined ? 'kind' : l.global[k] !== undefined ? 'global' : 'default';
  }
  return out;
}

/** 只存會留下來的兩層（單次覆寫不存檔）。 */
export const persistable = (l: SettingsLayers): Pick<SettingsLayers, 'global' | 'byKind'> => ({ global: l.global, byKind: l.byKind });
