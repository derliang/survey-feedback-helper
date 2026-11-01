import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// 部署在 https://derliang.github.io/survey-feedback-helper/，所以正式建置要用子路徑
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/survey-feedback-helper/' : '/',
  plugins: [preact()],
  build: { target: 'es2022', sourcemap: false },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}));
