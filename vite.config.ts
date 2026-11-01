import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// PWA 離線用：建置完成後列出 dist 裡「程式本身」的檔案（不含字型與 wasm，那些在輸出時才快取），
// 寫成 precache.json，並把檔案清單的雜湊填進 sw.js 的 __BUILD_ID__（內容一變，瀏覽器才會更新 Service Worker）。
function precachePlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sfh-precache',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) {
            if (name !== 'fonts') walk(full);
          } else {
            const rel = relative(outDir, full).split('\\').join('/');
            if (!/^(sw\.js|precache\.json)$|\.(map|wasm|txt)$/.test(rel)) files.push(rel);
          }
        }
      };
      walk(outDir);
      files.sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const id = hash.digest('hex').slice(0, 12);
      writeFileSync(join(outDir, 'precache.json'), JSON.stringify(files));
      const swPath = join(outDir, 'sw.js');
      writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__BUILD_ID__', id));
    },
  };
}

// 部署在 https://derliang.github.io/survey-feedback-helper/，所以正式建置要用子路徑
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/survey-feedback-helper/' : '/',
  plugins: [preact(), precachePlugin()],
  build: { target: 'es2022', sourcemap: false },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    environment: 'node',
  },
}));
