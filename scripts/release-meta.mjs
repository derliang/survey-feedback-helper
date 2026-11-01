// 發布中繼資料的純函式（版號、台北日期、version.json、CHANGELOG 區段）。不碰 git 與檔案系統，方便單元測試。
// version.json 只放版本資訊，不含任何學生資料。見 docs/decisions/2026-11-01-發布版本資訊.md。

const SEMVER = /^\d+\.\d+\.\d+$/;

export function isValidVersion(v) {
  return typeof v === 'string' && SEMVER.test(v);
}

/** 台北時間的 YYYY-MM-DD（不依賴執行電腦的時區）。 */
export function taipeiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function buildVersionJson({ version, commit, now = new Date() }) {
  if (!isValidVersion(version)) throw new Error(`版號格式不正確：${version}（需為 x.y.z）`);
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('commit 必須是完整的 40 碼 SHA');
  return { version, releaseDate: taipeiDate(now), commit };
}

export const tagName = (version) => `v${version}`;

/** 取出 CHANGELOG 裡 `## [version]` 區段的內文；找不到回傳 null。 */
export function changelogSection(text, version) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

/** 給發布者看的提示：CHANGELOG 有沒有這個版本的區段。 */
export function changelogHint(text, version) {
  if (changelogSection(text, version)) return `CHANGELOG 已有 [${version}] 區段，將作為 GitHub Release 說明。`;
  return `CHANGELOG 還沒有 [${version}] 區段：請在發布前把 [Unreleased] 的內容移到 ## [${version}] - YYYY-MM-DD；沒有區段時 Release 說明只會寫來源 SHA。`;
}

export function releaseNotes(text, version, commit) {
  const section = changelogSection(text, version);
  return `${section ?? '（CHANGELOG 尚無此版本區段）'}\n\n來源：main @ ${commit}`;
}
