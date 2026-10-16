import { defineConfig, devices } from '@playwright/test';

// 127.0.0.1, not localhost: on this WSL, localhost resolves to ::1 and the HTTP proxy only bypasses 127.0.0.1.
const remote = process.env.BASE_URL;
const proxy = remote && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: remote ?? 'http://127.0.0.1:4173/byte-harvest/', trace: 'retain-on-failure', proxy },
  webServer: remote
    ? undefined
    : {
        command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173/byte-harvest/',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 12; SM-A217F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
});
