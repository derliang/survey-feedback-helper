import type { SavedMapping, Student } from '../core';

export type SurveyKind = 'vote' | 'opinion' | 'feedback' | 'course';

/** 存進資料夾的一份問卷設定（只有欄位標題與對應，不含任何作答內容）。 */
export interface SavedSurvey {
  id: string;
  name: string;
  kind: SurveyKind;
  sourceLabel: string;
  headers: string[];
  mapping: SavedMapping;
  /** 老師改過的欄位顯示名稱：原標題 → 顯示名稱。 */
  labels: Record<string, string>;
  scale: { min: number; max: number };
  /** 上次開啟的日期（ISO，只到日）。 */
  lastUsed: string;
  /** 上次讀到的回覆筆數，用來標「比上次多 N 筆」。 */
  rowCount: number;
  rosterId: string | null;
}

export interface SavedRoster {
  id: string;
  name: string;
  students: Student[];
}

/** 設定檔（.sfh）的內容：設定與名單，不含任何問卷作答資料。 */
export interface FolderData {
  version: 1;
  surveys: SavedSurvey[];
  rosters: SavedRoster[];
  /** 常用評語（老師自訂過才有；沒有就用內建六類）。 */
  phrases?: PhraseCategory[];
}

/** 常用評語：短標題（籌碼顯示用）與整句；整句可含 {姓名}。 */
export interface Phrase {
  title: string;
  text: string;
}
export interface PhraseCategory {
  id: string;
  name: string;
  phrases: Phrase[];
}

/** 儲存提供者：實體資料夾（自動存取）。下載與上傳退回見 download.ts。 */
export interface FolderStore {
  kind: 'folder';
  name: string;
  read(file: string): Promise<string | null>;
  write(file: string, text: string): Promise<void>;
}

export type FolderStatus =
  | { state: 'unsupported' }
  | { state: 'none' }
  | { state: 'needsPermission'; name: string }
  | { state: 'ready'; store: FolderStore };
