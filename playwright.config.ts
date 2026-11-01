import { defineConfig, devices } from '@playwright/test';

// 以 chromium 模擬桌機、平板、手機（含觸控）；base 路徑與正式站相同
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173/survey-feedback-helper/', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/survey-feedback-helper/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true },
    },
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
});
