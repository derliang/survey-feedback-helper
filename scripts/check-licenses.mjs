// 授權與費用檢查：
// 1. 安裝的所有套件（含間接相依）的授權必須在 GPL-3.0 相容清單內
// 2. package.json 直接相依的每個套件必須登錄在 docs/third-party.md
// 費用無法由程式判斷，登錄表的「費用」欄由人工核對；本腳本只檢查沒有登錄的套件。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 與 GPL-3.0 相容的寬鬆授權（依 FSF 相容清單）
const COMPATIBLE = new Set([
  'MIT', 'MIT-0', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'Zlib', 'Apache-2.0',
  'Unlicense', 'CC0-1.0', 'BlueOak-1.0.0', 'Python-2.0', 'CC-BY-4.0', 'GPL-3.0', 'GPL-3.0-only',
  'GPL-3.0-or-later', 'LGPL-3.0', 'LGPL-3.0-only', 'LGPL-3.0-or-later', 'MPL-2.0', 'OFL-1.1',
]);

function licenseOf(pkg) {
  const l = pkg.license ?? (Array.isArray(pkg.licenses) ? pkg.licenses.map((x) => x.type).join(' OR ') : undefined);
  return typeof l === 'object' && l !== null ? l.type : l;
}

function isCompatible(expr) {
  // 例如 "(MIT OR Apache-2.0)"：OR 時任一相容即可，AND 時全部都要
  const cleaned = expr.replace(/[()]/g, ' ');
  const orParts = cleaned.split(/\s+OR\s+/);
  return orParts.some((part) => part.split(/\s+AND\s+/).every((id) => COMPATIBLE.has(id.trim())));
}

const nm = 'node_modules';
const pkgDirs = [];
for (const name of readdirSync(nm)) {
  if (name.startsWith('.')) continue;
  if (name.startsWith('@')) for (const sub of readdirSync(join(nm, name))) pkgDirs.push(join(nm, name, sub));
  else pkgDirs.push(join(nm, name));
}

const problems = [];
for (const dir of pkgDirs) {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) continue;
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const lic = licenseOf(pkg);
  if (!lic) problems.push(`${pkg.name}@${pkg.version}: 沒有授權欄位`);
  else if (!isCompatible(lic)) problems.push(`${pkg.name}@${pkg.version}: 授權 ${lic} 不在相容清單`);
}

const root = JSON.parse(readFileSync('package.json', 'utf8'));
const direct = Object.keys({ ...root.dependencies, ...root.devDependencies });
const register = readFileSync('docs/third-party.md', 'utf8');
for (const name of direct) {
  if (!register.includes(name)) problems.push(`${name}: 未登錄於 docs/third-party.md`);
}

if (problems.length > 0) {
  console.error('授權與費用檢查失敗：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`授權與費用檢查通過（${pkgDirs.length} 個已安裝套件；直接相依 ${direct.length} 個皆已登錄）`);
