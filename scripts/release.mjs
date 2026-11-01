// 本機發布到 GitHub Pages（gh-pages 分支）。見 docs/decisions/2026-11-01-Pages改本機發布.md。
//
//   npm run release              dry-run：跑全部檢查與建置，印出將發布的內容，不 commit、不 push
//   npm run release -- --yes     真正發布（使用者說「發布」之後才加）
//   --skip-ci                    只供 dry-run 省時間；與 --yes 併用會被拒絕
//
// 流程：確認工作樹乾淨 → npm run ci（含建置）→ 在暫存 worktree 取出 gh-pages
// → 換成 dist/ 內容並加 .nojekyll 與 version.json → 新 commit（不強制覆寫歷史）→ 一般 push
// → 對來源 main commit 建立並推送 tag（v<版號>）→ gh release create（失敗只警告，不擋發布）。
// 版號取自 package.json；--yes 要求版號不是 0.0.0，且 tag 還沒存在（要先升版號）。
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NO_GOOGLE_MESSAGE, distHasGoogleConfig, trackedEnvFiles } from './release-env.mjs';
import { buildVersionJson, changelogHint, isValidVersion, releaseNotes, tagName } from './release-meta.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const publish = args.has('--yes');
const skipCi = args.has('--skip-ci');
const SITE = 'https://derliang.github.io/survey-feedback-helper/';

const git = (cwd, ...a) =>
  execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const fail = (msg) => {
  console.error(`\n[停止] ${msg}`);
  process.exit(1);
};

if (publish && skipCi) fail('--yes 不能搭配 --skip-ci：真正發布一定要先跑完整檢查。');

const author = hostname() === 'Liang-NB' ? 'Claude-laptop' : 'Claude-desktop';
console.log(`模式：${publish ? '正式發布（--yes）' : 'dry-run（不會 commit、不會 push）'}`);

// 1. 來源狀態
if (git(root, 'status', '--porcelain')) fail('工作樹有未提交的修改，請先 commit 或還原。');
git(root, 'fetch', 'origin', 'main');
const head = git(root, 'rev-parse', 'HEAD');
const mainSha = git(root, 'rev-parse', 'origin/main');
const branch = git(root, 'rev-parse', '--abbrev-ref', 'HEAD');
console.log(`來源：${branch} @ ${head.slice(0, 7)}（origin/main = ${mainSha.slice(0, 7)}）`);
if (head !== mainSha) {
  const msg = '發布來源必須等於 origin/main；請先合併 PR，並在 main 上執行。';
  if (publish) fail(msg);
  console.warn(`[警告] ${msg}（dry-run 僅提醒）`);
}

// 1b. 版號（package.json）與 tag
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const tag = tagName(version);
console.log(`版號：${version}（tag ${tag}）`);
if (!isValidVersion(version)) fail(`package.json 的版號不是 x.y.z：${version}`);
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
console.log(changelogHint(changelog, version));
{
  const problems = [];
  if (version === '0.0.0') problems.push('版號仍是 0.0.0，請先在 package.json 升版號');
  try {
    git(root, 'rev-parse', '--verify', `refs/tags/${tag}`);
    problems.push(`本機已有 tag ${tag}，請先升版號`);
  } catch {
    /* 沒有 tag：正常 */
  }
  if (git(root, 'ls-remote', '--tags', 'origin', `refs/tags/${tag}`)) problems.push(`遠端已有 tag ${tag}，請先升版號`);
  for (const p of problems) {
    if (publish) fail(p);
    console.warn(`[警告] ${p}（dry-run 僅提醒；--yes 會被擋）`);
  }
}

// 2. 全部檢查（含建置）
if (skipCi) {
  console.warn('[警告] 已略過 npm run ci（--skip-ci），此次輸出不可作為發布依據。');
  if (!existsSync(join(root, 'dist'))) fail('找不到 dist/，請先 npm run build。');
} else {
  console.log('\n== npm run ci ==');
  const r = spawnSync('npm run ci', { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) fail('npm run ci 未全綠，不發布。');
}

// 2b. 金鑰檢查：.env 檔不得進 git；dist 必須含 Google 設定（否則會靜默發出「尚未開放」的版本）
{
  const tracked = trackedEnvFiles(git(root, 'ls-files'));
  if (tracked.length > 0) fail(`這些 .env 檔被 git 追蹤了（金鑰不得進 repo）：${tracked.join('、')}`);
  for (const f of ['.env.local', '.env.production.local']) {
    try {
      git(root, 'check-ignore', '-q', f);
    } catch {
      fail(`.gitignore 沒有忽略 ${f}，請先補上再發布。`);
    }
  }
  if (!distHasGoogleConfig(join(root, 'dist'))) {
    if (publish) fail(NO_GOOGLE_MESSAGE);
    console.warn(`[警告] ${NO_GOOGLE_MESSAGE}（dry-run 僅提醒；--yes 會被擋）`);
  }
}

// 3. 在暫存 worktree 取出 gh-pages，換成 dist/
const tmp = mkdtempSync(join(tmpdir(), 'sfh-pages-'));
const wt = join(tmp, 'site');
let added = false;
try {
  git(root, 'fetch', 'origin', 'gh-pages');
} catch {
  console.warn('[注意] 遠端還沒有 gh-pages 分支，將建立第一個 commit。');
}
let hasRemote = true;
try {
  git(root, 'rev-parse', '--verify', 'origin/gh-pages');
} catch {
  hasRemote = false;
}

try {
  git(root, 'worktree', 'add', '--detach', wt, hasRemote ? 'origin/gh-pages' : 'HEAD');
  added = true;
  if (!hasRemote) git(wt, 'checkout', '--orphan', 'gh-pages-new');
  for (const name of readdirSync(wt)) {
    if (name !== '.git') rmSync(join(wt, name), { recursive: true, force: true });
  }
  cpSync(join(root, 'dist'), wt, { recursive: true });
  writeFileSync(join(wt, '.nojekyll'), '');
  const versionJson = buildVersionJson({ version, commit: mainSha });
  writeFileSync(join(wt, 'version.json'), JSON.stringify(versionJson, null, 2) + '\n');
  console.log(`version.json：${JSON.stringify(versionJson)}`);
  git(wt, 'add', '-A');

  const stat = git(wt, 'status', '--porcelain');
  if (!stat) {
    console.log('\ngh-pages 內容與 dist/ 相同，沒有東西要發布。');
  } else {
    console.log('\n== 將發布的變更（相對於目前 gh-pages）==');
    console.log(git(wt, 'diff', '--cached', '--stat') || stat);
    const files = git(wt, 'ls-files').split('\n');
    console.log(`\n發布後共 ${files.length} 個檔案，例如：${files.slice(0, 8).join('、')}`);

    if (!publish) {
      console.log(`\n這是 dry-run，未做任何變更。使用者說「發布」後執行：npm run release -- --yes`);
    } else {
      const msg = `發布 ${mainSha.slice(0, 7)}（來源 main ${mainSha}）`;
      git(
        wt,
        '-c', `user.name=${author}`,
        '-c', 'user.email=noreply@anthropic.com',
        'commit', '-m', msg,
      );
      const sha = git(wt, 'rev-parse', 'HEAD');
      // 一般 push（不加 --force）；遠端有人搶先更新時會被拒絕
      git(wt, 'push', 'origin', 'HEAD:refs/heads/gh-pages');
      git(root, 'fetch', 'origin', 'gh-pages');
      const remote = git(root, 'rev-parse', 'origin/gh-pages');
      if (remote !== sha) fail(`push 後遠端 gh-pages（${remote}）與剛建立的 commit（${sha}）不一致。`);
      console.log(`\n已發布：gh-pages @ ${sha}（來源 main ${mainSha}）\n正式站：${SITE}\n（Pages 部署通常需 1～2 分鐘，請到網址確認。）`);

      // 發布已完成；以下 tag 與 Release 失敗只警告，不影響已上線的站
      try {
        git(
          root,
          '-c', `user.name=${author}`,
          '-c', 'user.email=noreply@anthropic.com',
          'tag', '-a', tag, mainSha, '-m', `${tag}（${versionJson.releaseDate}）`,
        );
        git(root, 'push', 'origin', `refs/tags/${tag}`);
        console.log(`已建立並推送 tag ${tag} → ${mainSha.slice(0, 7)}`);
        const gh = spawnSync(
          'gh',
          ['release', 'create', tag, '--verify-tag', '--title', tag, '--notes', releaseNotes(changelog, version, mainSha)],
          { cwd: root, encoding: 'utf8' },
        );
        if (gh.status === 0) console.log(`GitHub Release：${gh.stdout.trim()}`);
        else console.warn(`[警告] gh release create 失敗（不影響發布）：${(gh.stderr || gh.error || '').toString().trim()}`);
      } catch (e) {
        console.warn(`[警告] tag／Release 失敗（站已發布）：${e.message}`);
      }
    }
  }
} finally {
  if (added) {
    try {
      git(root, 'worktree', 'remove', '--force', wt);
    } catch {
      /* 殘留的暫存目錄由系統清理 */
    }
  }
  rmSync(tmp, { recursive: true, force: true });
  try {
    git(root, 'worktree', 'prune');
  } catch {
    /* ignore */
  }
}
